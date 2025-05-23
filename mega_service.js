const { Storage } = require('megajs');
const fs = require('fs');

let megaStorage;

async function initialize(email, password) {
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

async function findFolder(folderName, parentNode = megaStorage.root) {
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

async function createFolder(folderName, parentNode = megaStorage.root) {
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

async function uploadFile(localFilePath, remoteFileName, targetFolderNode) {
  if (!megaStorage) {
    throw new Error('MEGA service not initialized. Please call initialize() first.');
  }
  if (!targetFolderNode) {
    console.error('Target folder node is undefined. Cannot upload file.');
    throw new Error('Target folder node is required for uploading a file.');
  }

  console.log(`Starting upload of "${localFilePath}" as "${remoteFileName}" to folder "${targetFolderNode.name || 'root'}"`);

  try {
    const stats = fs.statSync(localFilePath);
    const fileSize = stats.size;
    console.log(`File size: ${fileSize} bytes`);

    const stream = fs.createReadStream(localFilePath);
    const upload = targetFolderNode.upload({
      name: remoteFileName,
      size: fileSize, // Providing size is good for progress tracking
    }, stream);

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

async function downloadFile(fileOrLink, localPath) {
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

  console.log(`Starting download of "${fileToDownload.name}" to "${localPath}"`);

  try {
    const stream = fileToDownload.download(); // This returns a readable stream
    const writable = fs.createWriteStream(localPath);

    // Pipe the download stream to a file
    stream.pipe(writable);

    // Optional: Log progress
    let lastLoggedProgress = 0;
    stream.on('progress', (progress) => {
      const currentProgress = Math.round(progress.bytesLoaded / progress.bytesTotal * 100);
      if (currentProgress >= lastLoggedProgress + 10 || currentProgress === 100) { // Log every 10% or at 100%
        console.log(`Downloading "${fileToDownload.name}": ${currentProgress}%`);
        lastLoggedProgress = currentProgress;
      }
    });

    return new Promise((resolve, reject) => {
      stream.on('end', () => {
        console.log(`File "${fileToDownload.name}" downloaded successfully to "${localPath}".`);
        resolve({
          name: fileToDownload.name,
          path: localPath,
          size: fileToDownload.size,
        });
      });
      stream.on('error', (error) => {
        console.error(`Error downloading file "${fileToDownload.name}":`, error);
        // Clean up partially downloaded file
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
        reject(error);
      });
      writable.on('error', (error) => { // Also handle errors on the writable stream
        console.error(`Error writing file to "${localPath}":`, error);
        // Clean up partially downloaded file
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
        reject(error);
      });
    });

  } catch (error) {
    console.error(`Error initiating download for "${fileToDownload.name || 'unknown file'}":`, error);
    throw error;
  }
}

module.exports = {
  initialize,
  findFolder,
  createFolder,
  uploadFile,
  downloadFile,
  get megaStorage() { // Expose megaStorage through a getter
    return megaStorage;
  },
  getFolderContents, // Add new function to exports
};

export  {
  initialize,
  findFolder,
  createFolder,
  uploadFile,
  downloadFile,
  megaStorage,
  getFolderContents, // Add new function to exports
};

async function getFolderContents(folderNodeOrLink) {
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
