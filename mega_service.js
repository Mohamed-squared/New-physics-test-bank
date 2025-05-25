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

    console.log(`[Queue] Starting upload of "${actualRemoteFileName}" (size: ${fileSize} bytes) to folder "${targetFolderNode.name || 'root'}"`);

    try {
        const upload = targetFolderNode.upload({
            name: actualRemoteFileName,
            size: fileSize,
        }, fileObject);

        let lastLoggedProgress = 0;
        upload.on('progress', (progress) => {
            const currentProgress = Math.round(progress.bytesLoaded / progress.bytesTotal * 100);
            if (currentProgress >= lastLoggedProgress + 10 || currentProgress === 100) {
                console.log(`[Queue] Uploading "${actualRemoteFileName}": ${currentProgress}%`);
                lastLoggedProgress = currentProgress;
            }
        });

        const file = await upload.complete;
        const link = await file.link(false);

        console.log(`[Queue] File "${actualRemoteFileName}" uploaded successfully.`);
        console.log(`[Queue] File link: ${link}`);
        
        resolve({
            name: file.name,
            link: link,
            size: file.size,
            nodeId: file.nodeId,
        });
    } catch (error) {
        console.error(`[Queue] Error uploading file "${actualRemoteFileName}":`, error);
        if (error.message && error.message.includes('EENT')) {
            console.error('[Queue] This might be due to the file already existing or a name conflict.');
        }
        reject(error);
    } finally {
        console.log(`[Queue] Waiting for ${UPLOAD_DELAY_MS}ms before next upload.`);
        await new Promise(res => setTimeout(res, UPLOAD_DELAY_MS));
        
        // isProcessingQueue will be set to false before the next call if queue is empty,
        // or the next processUploadQueue call will manage it.
        // No need to set isProcessingQueue = false here if we call processUploadQueue immediately.
        processUploadQueue(); // Process next item
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
    console.log(`Queueing upload for "${remoteFileName || fileObject.name}"`);
    uploadQueue.push({ fileObject, remoteFileName, targetFolderNode, resolve, reject });
    
    if (!isProcessingQueue) { 
      // Start processing only if not already processing.
      // This ensures that processUploadQueue is started only once
      // when the first item is added, or after it has stopped.
      processUploadQueue();
    } else {
      console.log(`Upload queue is currently being processed. "${remoteFileName || fileObject.name}" will be handled in turn.`);
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
    // For browser environment, download the file data as a buffer/blob
    // The mega.js documentation suggests file.downloadBuffer()
    // This method might also support progress events directly, or we might need to adapt.

    // It's not entirely clear from the docs if downloadBuffer() itself emits progress,
    // or if we need to use file.download() and collect chunks.
    // Let's assume file.download() returns a stream that can be used for progress,
    // and then we collect the data. If downloadBuffer() is more direct and supports progress,
    // that would be simpler. The quick start guide for browser download shows:
    // const data = await file.downloadBuffer();
    // This implies it's a direct operation. Progress events are usually on stream objects.
    // Let's try to get the stream first for progress, then collect data.

    // If file.download() returns a Node.js-style stream, it won't work directly in browser
    // for piping to a file. But it *is* used for progress in the current code.
    // The `megajs` library might provide a browser-compatible stream or a way to get data directly.
    // Let's check if file.download() in browser context returns something different
    // or if downloadBuffer() is the way. The current code uses `fileToDownload.download()`.
    // This returns a stream. We need to consume this stream and build a Blob.

    const dataChunks = [];
    let downloadedBytes = 0;
    const stream = fileToDownload.download(); // This should still return a stream-like object

    // Optional: Log progress
    let lastLoggedProgress = 0;
    stream.on('progress', (progress) => {
      downloadedBytes = progress.bytesLoaded;
      const currentProgress = Math.round(progress.bytesLoaded / progress.bytesTotal * 100);
      if (currentProgress >= lastLoggedProgress + 10 || currentProgress === 100) { // Log every 10% or at 100%
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
        
        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`File "${downloadName}" download initiated in browser.`);
        resolve({
          name: downloadName,
          size: downloadedBytes, // or fileToDownload.size, but downloadedBytes is from actual transfer
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

export function getMegaStorage() { // Expose megaStorage through a getter
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
      // Wait for the node attributes to load if it's just a URL-derived object.
      // This might involve checking if children are loaded or calling a specific load method.
      // For megajs, often accessing .children triggers a load if needed, or .loadAttributes()
      if (folderNode && typeof folderNode.loadAttributes === 'function') {
         await folderNode.loadAttributes(); // Ensure attributes and children are loaded
      }
    } else if (folderNodeOrLink && folderNodeOrLink.directory !== undefined) { // Check if it's a node-like object
      folderNode = folderNodeOrLink;
      // If it's a node passed directly, assume it's sufficiently loaded if it has .children
      // However, ensure its children are loaded if they are not.
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
      // Ensure child attributes are loaded before trying to get a link
      if (child.key === undefined && typeof child.loadAttributes === 'function') { // .key is often needed for links
          await child.loadAttributes();
      }
      const childLink = await child.link({ key: child.key }).catch(err => { // Explicitly pass key for robustness
          console.warn(`[getFolderContents] Could not generate link for child ${child.name}: ${err.message}`);
          return null; // Or some placeholder
      });

      contents.push({
        name: child.name,
        type: child.directory ? 'folder' : 'file',
        size: child.size,
        nodeId: child.nodeId,
        // M: child.M, // Master key, might be useful for client-side operations if needed directly
        // key: child.key, // Decryption key for the node
        link: childLink,
        // parent: folderNode.nodeId // Adding parent ID for easier navigation if needed
      });
    }
    console.log(`[getFolderContents] Found ${contents.length} items in folder "${folderNode.name}".`);
    return contents;

  } catch (error) {
    console.error(`[getFolderContents] Error getting folder contents: `, error);
    throw error; // Re-throw to be handled by the caller
  }
}

export { MEGA_EMAIL, MEGA_PASSWORD };
