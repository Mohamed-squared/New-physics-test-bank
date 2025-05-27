// mega_service_server.js

const { Storage, File } = require('megajs');
const fs = require('fs');
const path = require('path');

let megaStorage;

/**
 * Initializes the Mega storage service.
 * @param {string} email - Mega email address.
 * @param {string} password - Mega password.
 * @returns {Promise<void>}
 */
async function initialize(email, password) {
  console.log('Initializing Mega storage...');
  try {
    megaStorage = new Storage({
      email,
      password,
      userAgent: 'MegaServiceServer/1.0' // Optional: helps identify your app
    });
    await megaStorage.ready; // Wait for the storage to be ready
    console.log('Mega storage initialized successfully.');
  } catch (error) {
    console.error('Error initializing Mega storage:', error);
    megaStorage = null; // Reset on failure
    throw error; // Re-throw the error to be handled by the caller
  }
}

/**
 * Returns the initialized Mega storage instance.
 * @returns {Storage} The Mega storage instance.
 * @throws {Error} If storage is not initialized.
 */
function getMegaStorage() {
  if (!megaStorage) { // If initialize() was successful, megaStorage will be set.
                    // The megaStorage.ready promise was already awaited in initialize().
    throw new Error('Mega storage is not initialized or initialization failed. Please call initialize() first.');
  }
  return megaStorage;
}

/**
 * Finds a folder by name within a parent node.
 * @param {string} folderName - The name of the folder to find.
 * @param {object} [parentNode=null] - The parent node to search within. Defaults to root.
 * @returns {Promise<object|null>} The folder node if found, otherwise null.
 */
async function findFolder(folderName, parentNode = null) {
  const storage = getMegaStorage();
  const searchNode = parentNode || storage.root;
  console.log(`Searching for folder "${folderName}" in node "${searchNode.name || 'root'}"...`);

  try {
    // mega.js children are available after `loadAttributes` or `ready`
    // If searchNode is storage.root, its children are loaded by megaStorage.ready
    // If it's a different node, we might need to load its children explicitly
    // Conditional block for searchNode.loadAttributes() removed.
    // We rely on mega.js to lazy-load children when searchNode.children is accessed,
    // or for children to be present on nodes returned from createFolder.

    const children = searchNode.children || [];
    const foundFolder = children.find(node => node.name === folderName && node.type === 'd'); // 'd' for directory/folder

    if (foundFolder) {
      console.log(`Folder "${folderName}" found with ID: ${foundFolder.nodeId}`);
      return foundFolder;
    } else {
      console.log(`Folder "${folderName}" not found in "${searchNode.name || 'root'}".`);
      return null;
    }
  } catch (error) {
    console.error(`Error finding folder "${folderName}":`, error);
    throw error;
  }
}

/**
 * Creates a folder if it doesn't exist.
 * @param {string} folderName - The name of the folder to create.
 * @param {object} [parentNode=null] - The parent node to create the folder in. Defaults to root.
 * @returns {Promise<object>} The new or existing folder node.
 */
async function createFolder(folderName, parentNode = null) {
  const storage = getMegaStorage(); // Ensures storage is initialized and available
  const targetParentNode = parentNode || storage.root;
  console.log(`Attempting to create or find folder "${folderName}" in "${targetParentNode.name || 'root'}"...`);

  try {
    const existingFolder = await findFolder(folderName, targetParentNode); // findFolder is assumed to be correct
    if (existingFolder) {
      console.log(`Folder "${folderName}" already exists.`);
      return existingFolder;
    }

    // The if block that called targetParentNode.loadAttributes() was here and is now removed.

    console.log(`Creating new folder "${folderName}" in "${targetParentNode.name || 'root'}" using mkdir...`);
    // Ensure targetParentNode is a File object representing a directory, or storage.root
    const newFolderNode = await targetParentNode.mkdir({ name: folderName });
    console.log(`Folder "${folderName}" created successfully with mkdir. Node ID: ${newFolderNode.nodeId}`);
    return newFolderNode;
  } catch (error) {
    // Catch errors from findFolder or the Promise wrapper itself
    console.error(`Error in createFolder function for "${folderName}":`, error);
    throw error;
  }
}

/**
 * Uploads a local file to a Mega folder.
 * @param {string} localFilePath - Path to the file on the server's filesystem.
 * @param {string} remoteFileName - Name for the file on Mega.
 * @param {object} targetFolderNode - Mega folder node to upload to.
 * @returns {Promise<object>} Details of the uploaded file.
 */
async function uploadFile(localFilePath, remoteFileName, targetFolderNode) {
  getMegaStorage(); // Ensures storage is initialized
  console.log(`Uploading file "${localFilePath}" as "${remoteFileName}" to folder "${targetFolderNode.name}"...`);

  if (!fs.existsSync(localFilePath)) {
    throw new Error(`Local file not found: ${localFilePath}`);
  }

  const MAX_UPLOAD_ATTEMPTS = 3;
  const UPLOAD_RETRY_DELAY_MS = 5000;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt++) {
    try {
      console.log(`Upload attempt ${attempt}/${MAX_UPLOAD_ATTEMPTS} for "${remoteFileName}"...`);
      const fileSize = fs.statSync(localFilePath).size;
      // Create a new stream for each attempt
      const stream = fs.createReadStream(localFilePath); 
      
      const fileNode = await new Promise((resolve, reject) => {
        const upload = targetFolderNode.upload({ name: remoteFileName, size: fileSize }, stream);
        
        upload.on('progress', (progress) => {
          const percent = Math.round((progress.bytesLoaded / progress.bytesTotal) * 100);
          if (percent % 10 === 0 || percent === 100) {
              console.log(`Upload progress for "${remoteFileName}" (Attempt ${attempt}): ${percent}% (${progress.bytesLoaded}/${progress.bytesTotal} bytes)`);
          }
        });
        
        upload.on('complete', (completedFileNode) => {
          console.log(`File "${remoteFileName}" (Attempt ${attempt}) uploaded successfully. Node ID: ${completedFileNode.nodeId}`);
          resolve(completedFileNode);
        });
        
        upload.on('error', (err) => {
          // console.error(`Error during upload stream for "${remoteFileName}" (Attempt ${attempt}):`, err); // More specific log
          reject(err); // Reject the promise with the error
        });

        stream.on('error', (err) => { 
          // console.error(`Error with read stream for "${localFilePath}" (Attempt ${attempt}):`, err); // More specific log
          reject(err); // Reject the promise with the error
        });
      });

      const link = await fileNode.link({ noKey: false }); 

      return {
        name: fileNode.name,
        link: link,
        size: fileNode.size,
        nodeId: fileNode.nodeId,
        type: 'file'
      }; // Success, return and exit function

    } catch (error) {
      lastError = error;
      // Log the error message directly from the caught error.
      console.error(`Error during upload attempt ${attempt} for "${remoteFileName}":`, error.message);
      // Additionally log the full error object if it might contain more details like 'cause'
      if (attempt === MAX_UPLOAD_ATTEMPTS) console.error("Full error object on final attempt:", error);


      const errorMessage = error.message || "";
      const errorCauseCode = error.cause && error.cause.code;

      const isRetryable = errorMessage.includes("fetch failed") || 
                          errorMessage.includes("ConnectTimeoutError") ||
                          errorCauseCode === 'UND_ERR_CONNECT_TIMEOUT' || 
                          errorMessage.includes("EAGAIN");

      if (isRetryable && attempt < MAX_UPLOAD_ATTEMPTS) {
        console.warn(`Retryable error on attempt ${attempt} for "${remoteFileName}": ${errorMessage}. Retrying in ${UPLOAD_RETRY_DELAY_MS / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, UPLOAD_RETRY_DELAY_MS));
      } else {
        console.error(`Upload for "${remoteFileName}" failed after ${attempt} attempts or due to non-retryable error.`);
        // Optional: Log the full lastError if it's the final attempt and different from current error
        // if (attempt === MAX_UPLOAD_ATTEMPTS && lastError !== error) console.error("Last error was:", lastError);
        throw lastError; 
      }
    }
  }
  // This part should ideally not be reached if MAX_UPLOAD_ATTEMPTS > 0,
  // as the loop's final else block will throw.
  // However, as a safeguard or if MAX_UPLOAD_ATTEMPTS could be 0 (though not per current constants):
  if (lastError) {
    console.error(`Exiting upload function for "${remoteFileName}" after all attempts, rethrowing last recorded error.`);
    throw lastError;
  }
  // Fallback for an unexpected scenario where loop finishes without success or error thrown
  throw new Error(`Upload failed for "${remoteFileName}" after ${MAX_UPLOAD_ATTEMPTS} attempts. Unknown error state.`);
}

/**
 * Downloads a file from Mega to a local directory.
 * @param {object|string} fileOrLink - Mega file node object or a string URL to a Mega file.
 * @param {string} localDirectoryPath - Server directory where the file should be saved.
 * @param {string} [desiredFileName=null] - Desired name for the local file. If null, uses name from Mega.
 * @returns {Promise<string>} Full path to the downloaded local file.
 */
async function downloadFile(fileOrLink, localDirectoryPath, desiredFileName = null) {
  const storage = getMegaStorage();
  console.log(`Attempting to download file/link to "${localDirectoryPath}"...`);

  try {
    let fileNode;
    if (typeof fileOrLink === 'string') {
      console.log(`Downloading from URL: ${fileOrLink}`);
      fileNode = File.fromURL(fileOrLink); 
    } else {
      fileNode = fileOrLink;
      console.log(`Downloading from file node: ${fileNode.name}`);
    }

    // Ensure attributes are loaded to get name and size
    if (!fileNode.name || !fileNode.size) {
        await new Promise((resolve, reject) => {
            fileNode.loadAttributes((err, node) => {
                if (err) return reject(err);
                resolve(node);
            });
        });
    }
    
    const finalFileName = desiredFileName || fileNode.name;
    const localFilePath = path.join(localDirectoryPath, finalFileName);

    // Ensure local directory exists
    if (!fs.existsSync(localDirectoryPath)) {
      console.log(`Local directory "${localDirectoryPath}" does not exist. Creating...`);
      fs.mkdirSync(localDirectoryPath, { recursive: true });
    }

    console.log(`Downloading "${fileNode.name}" to "${localFilePath}"...`);
    
    // The download method in megajs: fileNode.download(options, callback)
    // Or fileNode.download() which returns a stream.
    // Using the stream approach as per the example.
    const stream = fileNode.download();
    const writer = fs.createWriteStream(localFilePath);

    return new Promise((resolve, reject) => {
      let bytesDownloaded = 0;
      const totalBytes = fileNode.size;

      stream.on('data', (chunk) => {
        bytesDownloaded += chunk.length;
        const percent = Math.round((bytesDownloaded / totalBytes) * 100);
        // Log progress less frequently
        if (percent % 10 === 0 || percent === 100) {
            console.log(`Download progress for "${finalFileName}": ${percent}% (${bytesDownloaded}/${totalBytes} bytes)`);
        }
      });

      stream.pipe(writer);

      writer.on('finish', () => {
        console.log(`File "${finalFileName}" downloaded successfully to "${localFilePath}".`);
        resolve(localFilePath);
      });

      writer.on('error', (err) => {
        console.error(`Error writing file "${localFilePath}":`, err);
        reject(err);
      });

      stream.on('error', (err) => {
        console.error(`Error downloading file "${fileNode.name}":`, err);
        reject(err);
      });
    });

  } catch (error) {
    console.error('Download operation failed:', error);
    throw error;
  }
}

/**
 * Gets the contents of a Mega folder.
 * @param {object|string} folderNodeOrLink - Mega folder node object or a string URL to a Mega folder.
 * @returns {Promise<Array<object>>} Array of objects representing folder contents.
 */
async function getFolderContents(folderNodeOrLink) {
  const storage = getMegaStorage();
  console.log('Fetching folder contents...');

  try {
    let folderNode;
    if (typeof folderNodeOrLink === 'string') {
      console.log(`Fetching contents for folder link: ${folderNodeOrLink}`);
      folderNode = File.fromURL(folderNodeOrLink); 
    } else {
      folderNode = folderNodeOrLink;
      console.log(`Fetching contents for folder node: ${folderNode.name || folderNode.nodeId}`);
    }

    // Load attributes and children
    // The callback style of loadAttributes needs to be promisified.
    await new Promise((resolve, reject) => {
        folderNode.loadAttributes((err, node) => {
            if (err) {
                console.error('Error loading folder attributes:', err);
                return reject(err);
            }
            resolve(node);
        });
    });
    
    if (folderNode.type !== 'd' && folderNode.type !== 1) { // 'd' or 1 for directory
      throw new Error(`The provided node/link is not a folder. Type: ${folderNode.type}`);
    }

    const contents = [];
    if (folderNode.children) {
      for (const child of folderNode.children) {
        // child.link() is async and needs to be awaited
        const link = await new Promise((resolve, reject) => {
            child.link({noKey: false}, (err, l) => {
                if(err) return reject(err);
                resolve(l);
            });
        });

        contents.push({
          name: child.name,
          type: (child.type === 'd' || child.type === 1) ? 'folder' : 'file',
          size: child.size,
          nodeId: child.nodeId,
          link: link
        });
      }
    }

    console.log(`Found ${contents.length} items in folder "${folderNode.name || folderNode.nodeId}".`);
    return contents;
  } catch (error) {
    console.error('Error getting folder contents:', error);
    throw error;
  }
}

module.exports = {
  initialize,
  getMegaStorage,
  findFolder,
  createFolder,
  uploadFile,
  downloadFile,
  getFolderContents,
};
