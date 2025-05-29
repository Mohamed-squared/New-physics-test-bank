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
    console.error(`Mega storage initialization failed: ${error.message}`, error);
    megaStorage = null; // Reset on failure
    // Initialization is critical, retrying might hide persistent config issues.
    // Let the caller decide how to handle a failed initialization.
    throw new Error(`Mega storage initialization failed: ${error.message}`);
  }
}

/**
 * Checks if a Mega API error is likely retryable.
 * @param {Error} error - The error object.
 * @returns {boolean} True if the error is likely retryable, false otherwise.
 */
function isRetryableMegaError(error) {
    if (!error) return false;
    const msg = error.message ? error.message.toLowerCase() : "";
    const code = error.code || (error.cause ? error.cause.code : "");

    const retryableMessages = [
        'fetch failed', 'eagain', 'timeout', 'econnreset', 
        'network error', 'server error', 'esockettimedout', 
        'etimedout', 'und_err_socket', 'und_err_connect_timeout'
    ];
    const retryableCodes = [
        'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNRESET', 'EAGAIN', 
        'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT'
        // Consider adding specific HTTP status codes if Mega API errors include them directly
        // e.g., 500, 502, 503, 504, but megajs might wrap these.
    ];

    if (retryableCodes.includes(code)) {
        return true;
    }
    for (const retryMsg of retryableMessages) {
        if (msg.includes(retryMsg)) {
            return true;
        }
    }
    // Specific megajs error numbers if known (e.g., -2 for transient error, -3 for EAGAIN)
    // This requires deeper knowledge of megajs internal error codes.
    // Example: if (error.errno === -3 || error.errno === -2) return true;
    
    return false;
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

  let attempts = 0;
  const MAX_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 1500; // Increased delay slightly

  while (attempts < MAX_ATTEMPTS) {
    try {
      attempts++;
      // Accessing .children might trigger an API call if not already loaded.
      // megajs typically loads children when a folder node is instantiated or loadAttributes is called.
      // If searchNode is storage.root, children are loaded by megaStorage.ready.
      // For other nodes, ensure they are "complete" (attributes loaded).
      // If `searchNode` might be incomplete, `await searchNode.loadAttributes()` could be called here.
      // This is the section targeted by the subtask.
      
      // Ensure children are loaded if the node is not the root and might be incomplete
      if (searchNode !== storage.root && (!searchNode.children || searchNode.children.length === 0) && searchNode.numfiles > 0) {
          console.log(`[MegaService] Node "${searchNode.name}" (parent for find) seems to have items but children array is empty/missing. Attempting loadAttributes for it.`);
          let loadAttrAttempts = 0;
          const MAX_LOAD_ATTR_ATTEMPTS = 3;
          const LOAD_ATTR_RETRY_DELAY_MS = 1500;
          let attributesLoaded = false;
          while (loadAttrAttempts < MAX_LOAD_ATTR_ATTEMPTS) {
              loadAttrAttempts++;
              try {
                  console.log(`[MegaService] Attempt ${loadAttrAttempts}/${MAX_LOAD_ATTR_ATTEMPTS} to load attributes for "${searchNode.name}"...`);
                  // According to megajs docs, loadAttributes can take a callback.
                  // To use with async/await, it should be promisified or check if it returns a promise directly.
                  // Assuming it can be awaited directly or is promisified internally by the library if it's a common pattern.
                  // If it strictly uses callbacks, this await might not work as expected without a wrapper.
                  // However, other parts of the codebase (e.g., downloadFile, getFolderContents) use `await new Promise` with `node.loadAttributes((err, node) => {})`.
                  // For consistency and explicit promisification:
                  await new Promise((resolve, reject) => {
                      searchNode.loadAttributes((err, node) => {
                          if (err) return reject(err);
                          resolve(node);
                      });
                  });
                  console.log(`[MegaService] Attributes loaded for "${searchNode.name}" on attempt ${loadAttrAttempts}.`);
                  attributesLoaded = true;
                  break; // Success
              } catch (attrError) {
                  console.warn(`[MegaService] Attempt ${loadAttrAttempts} to load attributes for "${searchNode.name}" failed: ${attrError.message}`);
                  if (loadAttrAttempts >= MAX_LOAD_ATTR_ATTEMPTS || !isRetryableMegaError(attrError)) {
                      console.error(`[MegaService] Failed to load attributes for parent node "${searchNode.name}" after ${loadAttrAttempts} attempts or non-retryable error. This may prevent finding child folder "${folderName}".`);
                      // Re-throwing this error will be caught by the outer retry loop of findFolder.
                      // The outer loop will then retry the entire findFolder operation, which includes this attribute loading.
                      // This is acceptable as a failed attribute load for the parent means we can't search its children.
                      throw attrError; 
                  }
                  await new Promise(resolve => setTimeout(resolve, LOAD_ATTR_RETRY_DELAY_MS * loadAttrAttempts));
              }
          }
          if (!attributesLoaded && loadAttrAttempts >= MAX_LOAD_ATTR_ATTEMPTS) {
             // This case might be redundant if the throw inside the loop is hit, but good for clarity.
             console.error(`[MegaService] Exhausted retries for loading attributes of "${searchNode.name}". Cannot reliably search for "${folderName}".`);
             // Throwing an error here will also be caught by the outer findFolder retry logic.
             throw new Error(`Failed to load attributes for parent node "${searchNode.name}" after ${MAX_LOAD_ATTR_ATTEMPTS} retries.`);
          }
      }

      const children = searchNode.children || [];
      const foundFolder = children.find(node => node.name === folderName && node.type === 'd'); // 'd' for directory/folder

      if (foundFolder) {
        console.log(`[MegaService] Folder "${folderName}" found with ID: ${foundFolder.nodeId} on attempt ${attempts}.`);
        return foundFolder;
      } else {
        console.log(`[MegaService] Folder "${folderName}" not found in "${searchNode.name || 'root'}" on attempt ${attempts}.`);
        return null; // Not an error, folder just doesn't exist.
      }
    } catch (error) {
      console.warn(`[MegaService] Attempt ${attempts} failed for findFolder "${folderName}": ${error.message}`);
      if (attempts >= MAX_ATTEMPTS || !isRetryableMegaError(error)) {
        console.error(`[MegaService] findFolder "${folderName}" failed after ${attempts} attempts or due to non-retryable error. Last error: ${error.message}`);
        throw error;
      }
      console.log(`[MegaService] Retrying findFolder "${folderName}" in ${RETRY_DELAY_MS * attempts}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempts));
    }
  }
  // Should not be reached if MAX_ATTEMPTS > 0, as loop will throw or return.
  return null;
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

  // First, try to find the folder. findFolder already has retries.
  const existingFolder = await findFolder(folderName, targetParentNode);
  if (existingFolder) {
    console.log(`[MegaService] Folder "${folderName}" already exists.`);
    return existingFolder;
  }

  // If not found, proceed to create it with retries for mkdir.
  let attempts = 0;
  const MAX_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 2000; // Slightly longer delay for creation operations

  console.log(`[MegaService] Folder "${folderName}" not found. Proceeding to create in "${targetParentNode.name || 'root'}".`);

  while (attempts < MAX_ATTEMPTS) {
    try {
      attempts++;
      console.log(`[MegaService] Attempt ${attempts} to create new folder "${folderName}" using mkdir...`);
      // Ensure targetParentNode is a File object representing a directory, or storage.root
      const newFolderNode = await targetParentNode.mkdir({ name: folderName });
      console.log(`[MegaService] Folder "${folderName}" created successfully with mkdir on attempt ${attempts}. Node ID: ${newFolderNode.nodeId}`);
      return newFolderNode;
    } catch (error) {
      console.warn(`[MegaService] Attempt ${attempts} failed for createFolder "${folderName}" (mkdir): ${error.message}`);
      if (attempts >= MAX_ATTEMPTS || !isRetryableMegaError(error)) {
         console.error(`[MegaService] createFolder "${folderName}" (mkdir) failed after ${attempts} attempts or due to non-retryable error. Last error: ${error.message}`);
        throw error;
      }
      console.log(`[MegaService] Retrying createFolder "${folderName}" (mkdir) in ${RETRY_DELAY_MS * attempts}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempts));
    }
  }
  // Should not be reached.
  throw new Error(`[MegaService] createFolder "${folderName}" failed after all retry attempts.`);
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
    let attempts = 0;
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 1500;

    if (typeof fileOrLink === 'string') {
      console.log(`[MegaService] Preparing to download from URL: ${fileOrLink}`);
      while(attempts < MAX_ATTEMPTS) {
        try {
          attempts++;
          fileNode = File.fromURL(fileOrLink); // This can make an API call to resolve the link
          console.log(`[MegaService] File.fromURL resolved on attempt ${attempts}. Node name (pre-attributes): ${fileNode.name || 'N/A'}`);
          break; // Success
        } catch (error) {
          console.warn(`[MegaService] Attempt ${attempts} failed for File.fromURL("${fileOrLink}"): ${error.message}`);
          if (attempts >= MAX_ATTEMPTS || !isRetryableMegaError(error)) {
            console.error(`[MegaService] File.fromURL("${fileOrLink}") failed after ${attempts} attempts or non-retryable error.`);
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempts));
        }
      }
      if (!fileNode) throw new Error(`[MegaService] Failed to resolve file from URL ${fileOrLink} after retries.`);
    } else {
      fileNode = fileOrLink;
      console.log(`[MegaService] Downloading from provided file node: ${fileNode.name || fileNode.nodeId}`);
    }

    // Ensure attributes are loaded to get name and size
    attempts = 0; // Reset attempts for loadAttributes
    if (!fileNode.name || typeof fileNode.size === 'undefined') { // Check size specifically as 0 is a valid size
        console.log(`[MegaService] File node attributes (name/size) missing. Attempting to load for node: ${fileNode.nodeId || fileNode.name}`);
        while(attempts < MAX_ATTEMPTS) {
            try {
                attempts++;
                await new Promise((resolve, reject) => { // Promisify loadAttributes
                    fileNode.loadAttributes((err, node) => {
                        if (err) return reject(err);
                        console.log(`[MegaService] fileNode.loadAttributes successful on attempt ${attempts} for node ${node.nodeId}. Name: ${node.name}, Size: ${node.size}`);
                        resolve(node);
                    });
                });
                break; // Success
            } catch (error) {
                console.warn(`[MegaService] Attempt ${attempts} failed for fileNode.loadAttributes() for node ${fileNode.nodeId || fileNode.name}: ${error.message}`);
                if (attempts >= MAX_ATTEMPTS || !isRetryableMegaError(error)) {
                    console.error(`[MegaService] fileNode.loadAttributes() failed after ${attempts} attempts or non-retryable error for node ${fileNode.nodeId || fileNode.name}.`);
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempts));
            }
        }
         if (!fileNode.name || typeof fileNode.size === 'undefined') {
            throw new Error(`[MegaService] Critical: Failed to load file attributes (name/size) for node ${fileNode.nodeId || fileNode.name} after retries.`);
        }
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
    let attempts = 0;
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 1500;

    if (typeof folderNodeOrLink === 'string') {
      console.log(`[MegaService] Fetching contents for folder link: ${folderNodeOrLink}`);
      while(attempts < MAX_ATTEMPTS) {
        try {
          attempts++;
          folderNode = File.fromURL(folderNodeOrLink); // API call
          console.log(`[MegaService] File.fromURL for folder link resolved on attempt ${attempts}. Node name (pre-attributes): ${folderNode.name || 'N/A'}`);
          break; 
        } catch (error) {
          console.warn(`[MegaService] Attempt ${attempts} failed for File.fromURL (folder link "${folderNodeOrLink}"): ${error.message}`);
          if (attempts >= MAX_ATTEMPTS || !isRetryableMegaError(error)) {
            console.error(`[MegaService] File.fromURL (folder link "${folderNodeOrLink}") failed after ${attempts} attempts or non-retryable error.`);
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempts));
        }
      }
      if(!folderNode) throw new Error(`[MegaService] Failed to resolve folder from URL ${folderNodeOrLink} after retries.`);
    } else {
      folderNode = folderNodeOrLink;
      console.log(`[MegaService] Fetching contents for provided folder node: ${folderNode.name || folderNode.nodeId}`);
    }

    // Load attributes and children
    attempts = 0; // Reset attempts
    console.log(`[MegaService] Attempting to load attributes for folder: ${folderNode.name || folderNode.nodeId}`);
    while(attempts < MAX_ATTEMPTS) {
        try {
            attempts++;
            await new Promise((resolve, reject) => { // Promisify loadAttributes
                folderNode.loadAttributes((err, node) => {
                    if (err) return reject(err);
                    console.log(`[MegaService] folderNode.loadAttributes successful for "${node.name || node.nodeId}" on attempt ${attempts}.`);
                    resolve(node);
                });
            });
            break; // Success
        } catch (error) {
            console.warn(`[MegaService] Attempt ${attempts} failed for folderNode.loadAttributes() for "${folderNode.name || folderNode.nodeId}": ${error.message}`);
            if (attempts >= MAX_ATTEMPTS || !isRetryableMegaError(error)) {
                console.error(`[MegaService] folderNode.loadAttributes() failed for "${folderNode.name || folderNode.nodeId}" after ${attempts} attempts or non-retryable error.`);
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempts));
        }
    }
    // After retries, check if attributes actually loaded (e.g. children property might now exist)
     if (typeof folderNode.type === 'undefined' && attempts >= MAX_ATTEMPTS) { // Check a common attribute
        throw new Error(`[MegaService] Critical: Failed to load folder attributes for ${folderNode.name || folderNode.nodeId} after retries, cannot determine type or children.`);
    }

    if (folderNode.type !== 'd' && folderNode.type !== 1) { // 'd' or 1 for directory
      throw new Error(`[MegaService] The provided node/link is not a folder. Type: ${folderNode.type}, Name: ${folderNode.name || folderNode.nodeId}`);
    }

    const contents = [];
    if (folderNode.children) {
      for (const child of folderNode.children) {
        let childLink = `Error retrieving link for ${child.name}`;
        let linkAttempts = 0;
        const MAX_LINK_ATTEMPTS_CHILD = 2; // Fewer retries for individual child links to avoid long hangs
        const RETRY_DELAY_CHILD_LINK_MS = 1000;

        while(linkAttempts < MAX_LINK_ATTEMPTS_CHILD) {
            try {
                linkAttempts++;
                childLink = await new Promise((resolve, reject) => { // Promisify child.link
                    child.link({noKey: false}, (err, l) => {
                        if(err) return reject(err);
                        resolve(l);
                    });
                });
                break; // Success
            } catch (error) {
                console.warn(`[MegaService] Attempt ${linkAttempts} to get link for child "${child.name}" failed: ${error.message}`);
                if (linkAttempts >= MAX_LINK_ATTEMPTS_CHILD || !isRetryableMegaError(error)) {
                    childLink = `Error retrieving link: ${error.message.substring(0,50)}`;
                    console.error(`[MegaService] Failed to get link for child "${child.name}" after ${linkAttempts} attempts or non-retryable error. Link set to error string.`);
                    break; 
                }
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_CHILD_LINK_MS * linkAttempts));
            }
        }
        
        contents.push({
          name: child.name,
          type: (child.type === 'd' || child.type === 1) ? 'folder' : 'file',
          size: child.size,
          nodeId: child.nodeId,
          link: childLink
        });
      }
    }

    console.log(`[MegaService] Found ${contents.length} items in folder "${folderNode.name || folderNode.nodeId}".`);
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
