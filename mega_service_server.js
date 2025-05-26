// mega_service_server.js

const { Storage } = require('megajs');
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

    if (targetParentNode !== storage.root) {
      console.log(`Explicitly loading attributes for parent node "${targetParentNode.name}" before creating subfolder "${folderName}"...`);
      await targetParentNode.loadAttributes();
    }

    console.log(`Creating new folder "${folderName}" in "${targetParentNode.name || 'root'}"...`);
    
    const newFolderNode = await new Promise((resolve, reject) => {
      const uploadProcess = targetParentNode.upload({
        name: folderName,
        directory: true,
        size: 0, // Add this line
        // attributes: {}, // Optional: set attributes if needed
      });

      uploadProcess.on('complete', (fileNode) => { // 'fileNode' here is the newly created folder node
        console.log(`Folder "${folderName}" created successfully. Node ID: ${fileNode.nodeId}`);
        resolve(fileNode);
      });

      uploadProcess.on('error', (err) => {
        console.error(`Error during folder creation process for "${folderName}":`, err);
        reject(err);
      });
    });

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

  try {
    const fileSize = fs.statSync(localFilePath).size;
    const stream = fs.createReadStream(localFilePath);
    
    // The upload method in megajs: targetFolderNode.upload(options, stream, callback)
    // Promisifying it:
    const file = await new Promise((resolve, reject) => {
      const upload = targetFolderNode.upload({ name: remoteFileName, size: fileSize }, stream);
      
      upload.on('progress', (progress) => {
        // progress object contains bytesLoaded and bytesTotal
        const percent = Math.round((progress.bytesLoaded / progress.bytesTotal) * 100);
        // Log progress less frequently to avoid spamming logs, e.g., every 10%
        if (percent % 10 === 0 || percent === 100) {
            console.log(`Upload progress for "${remoteFileName}": ${percent}% (${progress.bytesLoaded}/${progress.bytesTotal} bytes)`);
        }
      });
      
      upload.on('complete', (fileNode) => {
        console.log(`File "${remoteFileName}" uploaded successfully. Node ID: ${fileNode.nodeId}`);
        resolve(fileNode);
      });
      
      upload.on('error', (err) => {
        console.error(`Error uploading file "${remoteFileName}":`, err);
        reject(err);
      });

      stream.on('error', (err) => { // Also handle stream errors
        console.error(`Error with read stream for "${localFilePath}":`, err);
        reject(err);
      });
    });

    const link = await file.link({ noKey: false }); // Get public link with key

    return {
      name: file.name,
      link: link,
      size: file.size,
      nodeId: file.nodeId,
      type: 'file'
    };
  } catch (error) {
    console.error(`Failed to upload file "${remoteFileName}":`, error);
    throw error;
  }
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
      fileNode = Storage.File.fromURL(fileOrLink, storage); // Pass storage to fromURL
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
      folderNode = Storage.File.fromURL(folderNodeOrLink, storage); // Pass storage
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
