// google_drive_service_server.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

let drive;
let driveApiKey;
// const SERVICE_ACCOUNT_KEY_PATH = './path-to-your-service-account-key.json'; // Placeholder

/**
 * Initializes the Google Drive service.
 * @param {string} apiKey - Google API Key.
 * @param {string} [serviceAccountPath] - Optional path to Google Service Account JSON key file.
 *                                      Recommended for server-side operations.
 * @returns {Promise<void>}
 */
async function initialize(apiKey, serviceAccountPath = null) {
  console.log('Initializing Google Drive service (server-side)...');
  driveApiKey = apiKey; // Store for potential direct use if no service account

  try {
    if (serviceAccountPath) {
      // TODO: Uncomment and configure if using a service account
      // const auth = new google.auth.GoogleAuth({
      //   keyFile: serviceAccountPath || SERVICE_ACCOUNT_KEY_PATH,
      //   scopes: ['https://www.googleapis.com/auth/drive'],
      // });
      // const authClient = await auth.getClient();
      // drive = google.drive({ version: 'v3', auth: authClient });
      // console.log('Google Drive service initialized with Service Account.');

      // For now, as service account path is optional and might not be provided/configured:
      // Fallback or warning if service account is expected but not provided.
      // Using API Key for server-to-server is very limited and generally not for user data.
      // This setup primarily supports API key for public data access or specific scenarios.
      // For full capabilities (accessing/modifying user data, acting on behalf of users),
      // a service account or OAuth2 flow (for user consent) is necessary.
      console.warn('Service Account path not provided. Attempting to initialize with API Key. Operations will be limited.');
       drive = google.drive({ version: 'v3', auth: driveApiKey });
       console.log('Google Drive service initialized with API Key (limited functionality).');

    } else if (apiKey) {
      // Initialize with API key directly (limited for many Drive operations)
      drive = google.drive({ version: 'v3', auth: apiKey });
      console.log('Google Drive service initialized with API Key (limited functionality).');
    } else {
      throw new Error('Google Drive API Key or Service Account Path is required for initialization.');
    }
    if (!drive) {
        throw new Error('Google Drive client could not be initialized.');
    }
  } catch (error) {
    console.error(`Google Drive service initialization failed: ${error.message}`, error);
    drive = null;
    throw new Error(`Google Drive service initialization failed: ${error.message}`);
  }
}


/**
 * Finds a folder by name within a specific parent folder.
 * @param {string} folderName - The name of the folder to find.
 * @param {string} [parentFolderId='root'] - The ID of the parent folder.
 * @returns {Promise<object|null>} The folder object if found, otherwise null.
 * Note: Requires appropriate authentication (API Key for public, Service Account/OAuth for private).
 */
async function findFolder(folderName, parentFolderId = 'root') {
  if (!drive) throw new Error('Google Drive service not initialized.');
  console.log(`Searching for folder "${folderName}" in parent ID "${parentFolderId}"...`);
  try {
    const res = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, webViewLink, parents)',
      spaces: 'drive',
      // For API Key, might need: corpora: 'allDrives', includeItemsFromAllDrives: true, supportsAllDrives: true
      // depending on where the folder is. User-specific searches usually need OAuth/Service Account.
    });
    if (res.data.files && res.data.files.length > 0) {
      console.log(`Folder "${folderName}" found with ID: ${res.data.files[0].id}.`);
      return res.data.files[0];
    } else {
      console.log(`Folder "${folderName}" not found in parent "${parentFolderId}".`);
      return null;
    }
  } catch (error) {
    console.error(`Error finding folder "${folderName}": ${error.message}`, error.response?.data?.error);
    // Consider specific error handling, e.g., for 401/403 (auth issues) vs. 404 (not found logically handled by empty list)
    throw error;
  }
}

/**
 * Creates a folder if it doesn't exist.
 * @param {string} folderName - The name of the folder to create.
 * @param {string} [parentFolderId='root'] - The ID of the parent folder.
 * @returns {Promise<object>} The new or existing folder object.
 * Note: Typically requires Service Account or OAuth for write operations.
 */
async function createFolder(folderName, parentFolderId = 'root') {
  if (!drive) throw new Error('Google Drive service not initialized.');
  console.log(`Attempting to create or find folder "${folderName}" in parent ID "${parentFolderId}"...`);

  const existingFolder = await findFolder(folderName, parentFolderId);
  if (existingFolder) {
    console.log(`Folder "${folderName}" already exists.`);
    return existingFolder;
  }

  console.log(`Folder "${folderName}" not found. Proceeding to create in parent ID "${parentFolderId}".`);
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId],
  };
  try {
    const res = await drive.files.create({
      resource: fileMetadata,
      fields: 'id, name, webViewLink, parents',
      supportsAllDrives: true, // Important if working with Shared Drives
    });
    console.log(`Folder "${folderName}" created successfully. ID: ${res.data.id}`);
    return res.data;
  } catch (error) {
    console.error(`Error creating folder "${folderName}": ${error.message}`, error.response?.data?.error);
    throw error;
  }
}

/**
 * Uploads a local file to a Google Drive folder.
 * @param {string} localFilePath - Path to the file on the server's filesystem.
 * @param {string} remoteFileName - Name for the file on Google Drive.
 * @param {string} [targetFolderId='root'] - Google Drive folder ID to upload to.
 * @returns {Promise<object>} Details of the uploaded file from Google Drive API.
 * Note: Typically requires Service Account or OAuth for write operations.
 */
async function uploadFile(localFilePath, remoteFileName, targetFolderId = 'root') {
  if (!drive) throw new Error('Google Drive service not initialized.');
  console.log(`Uploading local file "${localFilePath}" as "${remoteFileName}" to Drive folder ID "${targetFolderId}"...`);

  if (!fs.existsSync(localFilePath)) {
    throw new Error(`Local file not found: ${localFilePath}`);
  }

  const fileSize = fs.statSync(localFilePath).size;
  const fileMetadata = {
    name: remoteFileName,
    parents: [targetFolderId],
  };
  const media = {
    mimeType: 'application/octet-stream', // Or detect dynamically: const mime = require('mime-types'); mime.lookup(localFilePath) || 'application/octet-stream';
    body: fs.createReadStream(localFilePath),
  };

  try {
    const res = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, size, parents',
      supportsAllDrives: true,
      // Implement resumable uploads for large files if necessary
      // onUploadProgress: evt => {
      //   const progress = (evt.bytesRead / fileSize) * 100;
      //   console.log(`Upload progress for "${remoteFileName}": ${Math.round(progress)}%`);
      // }
    }
    // For resumable, you'd use a different approach with uploadType=resumable
    // and handle the upload session. For simplicity, direct upload is used here.
    );
    console.log(`File "${remoteFileName}" uploaded successfully to Google Drive. ID: ${res.data.id}, Size: ${res.data.size}`);
    return res.data;
  } catch (error) {
    console.error(`Error uploading file "${remoteFileName}" to Google Drive: ${error.message}`, error.response?.data?.error);
    throw error;
  }
}

/**
 * Downloads a file from Google Drive to a local directory.
 * @param {string} fileId - Google Drive File ID.
 * @param {string} localDirectoryPath - Server directory where the file should be saved.
 * @param {string} [desiredFileName=null] - Desired name for the local file. If null, uses name from Drive.
 * @returns {Promise<string>} Full path to the downloaded local file.
 */
async function downloadFile(fileId, localDirectoryPath, desiredFileName = null) {
  if (!drive) throw new Error('Google Drive service not initialized.');
  console.log(`Attempting to download Drive file ID "${fileId}" to directory "${localDirectoryPath}"...`);

  try {
    // Get file metadata first to get the name if not provided
    let fileName = desiredFileName;
    if (!fileName) {
      const fileMetadata = await drive.files.get({ fileId: fileId, fields: 'name, mimeType', supportsAllDrives: true });
      fileName = fileMetadata.data.name;
      // Handle potential Google Docs export if mimeType indicates it
      if (fileMetadata.data.mimeType.includes('google-apps')) {
         console.warn(`File ${fileName} (ID: ${fileId}) is a Google Workspace document. Standard download (alt=media) may not work or may download a conversion. For specific export formats (e.g., PDF for Docs), use drive.files.export() instead.`);
         // Example: If it's a Google Doc and you want PDF:
         // const dest = fs.createWriteStream(path.join(localDirectoryPath, `${fileName}.pdf`));
         // const res = await drive.files.export({ fileId: fileId, mimeType: 'application/pdf' }, { responseType: 'stream' });
         // res.data.pipe(dest); ... return promise for finish/error
         // This example will proceed with generic alt=media download.
      }
    }

    const localFilePath = path.join(localDirectoryPath, fileName);

    if (!fs.existsSync(localDirectoryPath)) {
      console.log(`Local directory "${localDirectoryPath}" does not exist. Creating...`);
      fs.mkdirSync(localDirectoryPath, { recursive: true });
    }

    const dest = fs.createWriteStream(localFilePath);
    console.log(`Downloading Drive file "${fileName}" (ID: ${fileId}) to "${localFilePath}"...`);

    const res = await drive.files.get(
      { fileId: fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );

    return new Promise((resolve, reject) => {
      res.data
        .on('end', () => {
          console.log(`File "${fileName}" downloaded successfully to "${localFilePath}".`);
          resolve(localFilePath);
        })
        .on('error', err => {
          console.error(`Error downloading file "${fileName}" from Drive:`, err);
          fs.unlink(localFilePath, () => {}); // Attempt to delete partial file
          reject(err);
        })
        .pipe(dest);
    });
  } catch (error) {
    console.error(`Download operation for file ID "${fileId}" failed: ${error.message}`, error.response?.data?.error);
    throw error;
  }
}

/**
 * Gets the contents of a Google Drive folder.
 * @param {string} [folderId='root'] - Google Drive Folder ID.
 * @returns {Promise<Array<object>>} Array of objects representing folder contents.
 */
async function getFolderContents(folderId = 'root') {
  if (!drive) throw new Error('Google Drive service not initialized.');
  console.log(`Fetching contents for Drive folder ID "${folderId}"...`);
  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, webViewLink, size, modifiedTime, iconLink, parents)',
      orderBy: 'folder, name',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true, // Important for shared drives or items shared with service account
    });

    const contents = res.data.files.map(file => ({
      id: file.id,
      name: file.name,
      type: file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
      size: file.size ? parseInt(file.size, 10) : undefined, // Size is string, convert to int. Not present for folders.
      modifiedTime: file.modifiedTime,
      link: file.webViewLink, // User-friendly link to view in browser
      iconLink: file.iconLink, // Link to item's icon
      parents: file.parents, // Array of parent folder IDs
    }));

    console.log(`Found ${contents.length} items in Drive folder ID "${folderId}".`);
    return contents;
  } catch (error) {
    console.error(`Error getting contents for Drive folder ID "${folderId}": ${error.message}`, error.response?.data?.error);
    throw error;
  }
}

module.exports = {
  initialize,
  findFolder,
  createFolder,
  uploadFile,
  downloadFile,
  getFolderContents,
  // getDriveInstance: () => drive, // Optionally expose the drive instance if needed for direct advanced use
};
console.log('google_drive_service_server.js loaded.');
