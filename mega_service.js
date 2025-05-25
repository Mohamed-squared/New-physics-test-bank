import { Storage } from 'https://unpkg.com/megajs@1.3.7/dist/main.browser-es.mjs';

// Configurable delay for upload throttling
const UPLOAD_DELAY_MS = 5000; // 5 seconds
let isProcessingQueue = false;
const uploadQueue = []; // Stores objects like { fileObject, remoteFileName, targetFolderNode, resolve, reject }

const MEGA_EMAIL = 'mohphy21@gmail.com';
const MEGA_PASSWORD = 'I_LOVE_PHY';

let megaStorage;

export async function initialize() {
  try {
    console.log('Initializing MEGA service...');
    megaStorage = new Storage({
      email: MEGA_EMAIL,
      password: MEGA_PASSWORD,
      userAgent: 'MegaService/1.0.0', 
    });

    await megaStorage.ready; // Wait for the storage to be ready (authenticated)
    console.log('MEGA service initialized successfully.');
    return megaStorage;
  } catch (error) {
    console.error('Error initializing MEGA service:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

export async function findFolder(folderName, parentNode = megaStorage.root) {
  if (!megaStorage) {
    throw new Error('MEGA service not initialized. Please call initialize() first.');
  }
  if (!parentNode) {
    console.warn(`Parent node is undefined, defaulting to root.`);
    parentNode = megaStorage.root;
  }
  console.log(`Searching for folder "${folderName}" in parent: ${parentNode.name || 'root'}`);

  // Ensure parentNode.children is iterable, handling cases where it might be undefined
  const children = parentNode.children || [];
  for (const node of children) {
    if (node.name === folderName && node.directory) {
      console.log(`Folder "${folderName}" found.`);
      return node;
    }
  }

  console.log(`Folder "${folderName}" not found.`);
  return null;
}

export async function createFolder(folderName, parentNode = megaStorage.root) {
  if (!megaStorage) {
    throw new Error('MEGA service not initialized. Please call initialize() first.');
  }
  if (!parentNode) {
    console.warn(`Parent node is undefined, defaulting to root.`);
    parentNode = megaStorage.root;
  }

  console.log(`Attempting to create folder "${folderName}" in parent: ${parentNode.name || 'root'}`);

  // Check if folder already exists
  const existingFolder = await findFolder(folderName, parentNode);
  if (existingFolder) {
    console.log(`Folder "${folderName}" already exists.`);
    return existingFolder;
  }

  try {
    // megaStorage.root.upload is a versatile method, it creates a folder if a name is provided without data
    const newFolder = await parentNode.upload({
      name: folderName,
      attributes: {}, // Folders don't have data, but attributes can be set if needed
      directory: true, // Explicitly state this is a directory, though `megajs` usually infers
    }).complete; // Ensure the operation is complete
    console.log(`Folder "${folderName}" created successfully.`);
    return newFolder;
  } catch (error) {
    console.error(`Error creating folder "${folderName}":`, error);
    throw error;
  }
}

async function processUploadQueue() {
    if (uploadQueue.length === 0) {
        isProcessingQueue = false;
        return;
    }
    // Do not return if isProcessingQueue is true,
    // as this function is called recursively and needs to continue
    // if it was the one that set isProcessingQueue to true.
    // The guard against multiple concurrent executions is at the call site of processUploadQueue.

    isProcessingQueue = true; // Set flag that processing is happening

    const { fileObject, remoteFileName, targetFolderNode, resolve, reject } = uploadQueue.shift();
    const actualRemoteFileName = remoteFileName || fileObject.name;
    const fileSize = fileObject.size;

    console.log(`[Queue] Processing upload for: "${actualRemoteFileName}"`); // Kept one log for queue processing start

    try {
        const upload = targetFolderNode.upload({
            name: actualRemoteFileName,
            size: fileSize,
        }, fileObject);

        let lastLoggedProgress = 0;
        upload.on('progress', (progress) => {
            const currentProgress = Math.round(progress.bytesLoaded / progress.bytesTotal * 100);
            if (currentProgress >= lastLoggedProgress + 10 || currentProgress === 100) { // Log every 10% or at 100%
                console.log(`Uploading "${actualRemoteFileName}": ${currentProgress}%`);
                lastLoggedProgress = currentProgress;
            }
        });

        const file = await upload.complete;
        const link = await file.link(false); // Get a public link to the file (false means no decryption key in URL)
        
        console.log(`File "${actualRemoteFileName}" uploaded successfully. Link: ${link}`);
        resolve({
            name: file.name,
            link: link,
            size: file.size,
            nodeId: file.nodeId, // Useful for other operations
        });
    } catch (error) {
        console.error(`Error uploading file "${actualRemoteFileName}":`, error);
        if (error.message && error.message.includes('EENT')) {
            console.error('This might be due to the file already existing or a name conflict.');
        }
        reject(error);
    } finally {
        // Wait for UPLOAD_DELAY_MS before processing the next item
        await new Promise(res => setTimeout(res, UPLOAD_DELAY_MS));
        processUploadQueue(); // Process next item in the queue
    }
}

export async function uploadFile(fileObject, remoteFileName, targetFolderNode) {
  if (!megaStorage) {
    throw new Error('MEGA service not initialized. Please call initialize() first.');
  }
  if (!targetFolderNode) {
    console.error('Target folder node is undefined. Cannot upload file.');
    throw new Error('Target folder node is required for uploading a file.');
  }
  if (!fileObject) {
    console.error('File object is undefined. Cannot upload file.');
    throw new Error('File object is required for uploading a file.');
  }

  return new Promise((resolve, reject) => {
    uploadQueue.push({ fileObject, remoteFileName, targetFolderNode, resolve, reject });
    console.log(`File "${remoteFileName || fileObject.name}" added to upload queue. Queue size: ${uploadQueue.length}`);
    
    if (!isProcessingQueue) {
      processUploadQueue();
    } else {
      console.log(`Upload queue is currently being processed. File will be handled in turn.`);
    }
  });
}

export async function downloadFile(fileOrLink, desiredFileName) {
  if (!megaStorage) {
    throw new Error('MEGA service not initialized. Please call initialize() first.');
  }

  let fileToDownload;
  if (typeof fileOrLink === 'string') {
    // If it's a string, assume it's a file link
    console.log(`Attempting to download from link: ${fileOrLink}`);
    try {
      fileToDownload = megaStorage.File.fromURL(fileOrLink);
    } catch (error) {
      console.error('Error parsing MEGA link:', error);
      throw new Error('Invalid MEGA file link provided.');
    }
  } else if (fileOrLink && typeof fileOrLink.download === 'function') {
    // If it's a megajs file object
    fileToDownload = fileOrLink;
  } else {
    console.error('Invalid argument: fileOrLink must be a MEGA file object or a valid MEGA file link.');
    throw new Error('Invalid file object or link for download.');
  }
  
  // Ensure fileToDownload is valid and has necessary properties
  if (!fileToDownload || !fileToDownload.name || typeof fileToDownload.download !== 'function') {
      console.error('Could not derive a valid file to download from the input:', fileOrLink);
      throw new Error('Unable to process the provided file or link for download.');
  }

  const downloadName = desiredFileName || fileToDownload.name;
  console.log(`Starting download of "${downloadName}"`);

  try {
    const dataChunks = [];
    let downloadedBytes = 0;
    const stream = fileToDownload.download(); 

    let lastLoggedProgress = 0;
    stream.on('progress', (progress) => {
      downloadedBytes = progress.bytesLoaded;
      const currentProgress = Math.round(progress.bytesLoaded / progress.bytesTotal * 100);
      if (currentProgress >= lastLoggedProgress + 10 || currentProgress === 100) { 
        console.log(`Downloading "${downloadName}": ${currentProgress}%`);
        lastLoggedProgress = currentProgress;
      }
    });

    stream.on('data', (chunk) => {
      dataChunks.push(chunk);
    });

    return new Promise((resolve, reject) => {
      stream.on('end', () => {
        const blobData = new Blob(dataChunks);
        const url = URL.createObjectURL(blobData);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = downloadName;
        
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`File "${downloadName}" download initiated in browser.`);
        resolve({
          name: downloadName,
          size: downloadedBytes, 
        });
      });

      stream.on('error', (error) => {
        console.error(`Error downloading file "${downloadName}":`, error);
        reject(error);
      });
    });

  } catch (error) {
    console.error(`Error initiating download for "${downloadName || 'unknown file'}":`, error);
    throw error;
  }
}

export function getMegaStorage() { 
  return megaStorage;
}

export async function getFolderContents(folderNodeOrLink) {
  if (!megaStorage) {
    throw new Error('MEGA service not initialized. Please call initialize() first.');
  }

  let folderNode;
  try {
    if (typeof folderNodeOrLink === 'string') {
      console.log(`[getFolderContents] Input is a string link: ${folderNodeOrLink}. Attempting to derive node.`);
      folderNode = megaStorage.File.fromURL(folderNodeOrLink);
      if (folderNode && typeof folderNode.loadAttributes === 'function') {
         await folderNode.loadAttributes(); 
      }
    } else if (folderNodeOrLink && folderNodeOrLink.directory !== undefined) { 
      folderNode = folderNodeOrLink;
      if (folderNode.children === undefined && typeof folderNode.loadAttributes === 'function') {
          console.log(`[getFolderContents] Input node's children are undefined. Loading attributes for node: ${folderNode.name}`);
          await folderNode.loadAttributes();
      }
    } else {
      throw new Error('Invalid input: Must be a MEGA folder node object or a valid MEGA folder link.');
    }

    if (!folderNode) {
        throw new Error('Could not derive a valid folder node from the input.');
    }
    if (!folderNode.directory) {
      throw new Error(`The provided item "${folderNode.name || 'Unnamed'}" is not a folder.`);
    }
    
    console.log(`[getFolderContents] Listing contents for folder: "${folderNode.name || 'Unnamed Folder'}" (ID: ${folderNode.nodeId})`);

    const children = folderNode.children || [];
    if (children.length === 0) {
      console.log(`[getFolderContents] Folder "${folderNode.name}" is empty.`);
      return [];
    }

    const contents = [];
    for (const child of children) {
      if (child.key === undefined && typeof child.loadAttributes === 'function') { 
          await child.loadAttributes();
      }
      const childLink = await child.link({ key: child.key }).catch(err => { 
          console.warn(`[getFolderContents] Could not generate link for child ${child.name}: ${err.message}`);
          return null; 
      });

      contents.push({
        name: child.name,
        type: child.directory ? 'folder' : 'file',
        size: child.size,
        nodeId: child.nodeId,
        link: childLink,
      });
    }
    console.log(`[getFolderContents] Found ${contents.length} items in folder "${folderNode.name}".`);
    return contents;

  } catch (error) {
    console.error(`[getFolderContents] Error getting folder contents: `, error);
    throw error; 
  }
}

export { MEGA_EMAIL, MEGA_PASSWORD };
