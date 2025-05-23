import { Storage } from 'https://unpkg.com/megajs@1.3.7/dist/main.browser-es.mjs';

let megaStorage;

export async function initialize(email, password) {
  try {
    console.log('Initializing MEGA service...');
    megaStorage = new Storage({
      email,
      password,
      userAgent: 'MegaService/1.0.0', // Optional: Set a user agent
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

  const actualRemoteFileName = remoteFileName || fileObject.name;
  const fileSize = fileObject.size;

  console.log(`Starting upload of "${actualRemoteFileName}" (size: ${fileSize} bytes) to folder "${targetFolderNode.name || 'root'}"`);

  try {
    // For browser compatibility, pass the File object directly.
    // megajs should handle stream creation internally.
    // The upload method might vary; common patterns are:
    // 1. targetFolderNode.upload(name, data, [options])
    // 2. targetFolderNode.upload({ name, size }, data)
    // Based on documentation: storage.upload('file.txt', 'data').complete
    // So, targetFolderNode.upload(actualRemoteFileName, fileObject) seems plausible.
    // We also need to provide the size for progress tracking if the API supports it in this form.
    // Let's try the more structured approach first if available, or fall back.
    // The existing code used: targetFolderNode.upload({ name: remoteFileName, size: fileSize }, stream);
    // So, we'll adapt that to: targetFolderNode.upload({ name: actualRemoteFileName, size: fileSize }, fileObject);
    // This seems like a robust way if the library supports passing a File object as data.
    const upload = targetFolderNode.upload({
      name: actualRemoteFileName,
      size: fileSize, // Providing size is good for progress tracking
    }, fileObject); // Pass the File object directly

    // Optional: Log progress
    let lastLoggedProgress = 0;
    upload.on('progress', (progress) => {
      const currentProgress = Math.round(progress.bytesLoaded / progress.bytesTotal * 100);
      if (currentProgress >= lastLoggedProgress + 10 || currentProgress === 100) { // Log every 10% or at 100%
        console.log(`Uploading "${remoteFileName}": ${currentProgress}%`);
        lastLoggedProgress = currentProgress;
      }
    });

    const file = await upload.complete; // Wait for the upload to complete
    const link = await file.link(false); // Get a public link to the file (false means no decryption key in URL)
    
    console.log(`File "${remoteFileName}" uploaded successfully.`);
    console.log(`File link: ${link}`);
    
    return {
      name: file.name,
      link: link,
      size: file.size,
      nodeId: file.nodeId, // Useful for other operations
    };
  } catch (error) {
    console.error(`Error uploading file "${remoteFileName}":`, error);
    if (error.message && error.message.includes('EENT')) {
        console.error('This might be due to the file already existing or a name conflict.');
    }
    throw error;
  }
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
