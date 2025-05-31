// google_drive_service_server.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

let drive;
const SERVICE_ACCOUNT_EMAIL = 'lyceum@lyceum-461414.iam.gserviceaccount.com'; // For reference
const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive'];

/**
 * Initializes the Google Drive service using a Service Account.
 * @param {string} serviceAccountKeyPath - Path to Google Service Account JSON key file.
 * @returns {Promise<void>}
 * @throws {Error} If initialization fails.
 */
async function initialize(serviceAccountKeyPath) {
  console.log('Initializing Google Drive service (server-side) with Service Account...');

  if (!serviceAccountKeyPath) {
    throw new Error('Service Account Key Path is required for server-side Google Drive initialization.');
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFilename: serviceAccountKeyPath,
      scopes: DRIVE_SCOPES,
    });

    const authClient = await auth.getClient();
    drive = google.drive({ version: 'v3', auth: authClient });
    console.log('Google Drive service initialized successfully with Service Account:', SERVICE_ACCOUNT_EMAIL);

    if (!drive) { // Should not happen if getClient() succeeds
        throw new Error('Google Drive client could not be initialized even after auth.');
    }

  } catch (error) {
    console.error(`Google Drive service initialization with Service Account failed: ${error.message}`, error);
    drive = null; // Reset on failure
    throw new Error(`Google Drive service (Service Account) initialization failed: ${error.message}`);
  }
}

/**
 * Finds a folder by name within a specific parent folder.
 * @param {string} folderName - The name of the folder to find.
 * @param {string} [parentFolderId='root'] - The ID of the parent folder.
 * @returns {Promise<object|null>} The folder object if found, otherwise null.
 */
async function findFolder(folderName, parentFolderId = 'root') {
  if (!drive) throw new Error('Google Drive service not initialized. Call initialize(serviceAccountKeyPath) first.');
  console.log(`Searching for folder "${folderName}" in parent ID "${parentFolderId}"...`);
  try {
    const res = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, webViewLink, parents)',
      spaces: 'drive',
      supportsAllDrives: true, // Recommended for service accounts that might access Shared Drives
      includeItemsFromAllDrives: true,
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
    throw error;
  }
}

/**
 * Creates a folder if it doesn't exist.
 * @param {string} folderName - The name of the folder to create.
 * @param {string} [parentFolderId='root'] - The ID of the parent folder.
 * @returns {Promise<object>} The new or existing folder object.
 */
async function createFolder(folderName, parentFolderId = 'root') {
  if (!drive) throw new Error('Google Drive service not initialized. Call initialize(serviceAccountKeyPath) first.');
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
      supportsAllDrives: true,
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
 */
async function uploadFile(localFilePath, remoteFileName, targetFolderId = 'root') {
  if (!drive) throw new Error('Google Drive service not initialized. Call initialize(serviceAccountKeyPath) first.');
  console.log(`Uploading local file "${localFilePath}" as "${remoteFileName}" to Drive folder ID "${targetFolderId}"...`);

  if (!fs.existsSync(localFilePath)) {
    throw new Error(`Local file not found: ${localFilePath}`);
  }

  const fileMetadata = {
    name: remoteFileName,
    parents: [targetFolderId],
  };
  const media = {
    mimeType: 'application/octet-stream', // Consider using 'mime-types' package for dynamic detection
    body: fs.createReadStream(localFilePath),
  };

  try {
    const res = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, size, parents',
      supportsAllDrives: true,
    });
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
  if (!drive) throw new Error('Google Drive service not initialized. Call initialize(serviceAccountKeyPath) first.');
  console.log(`Attempting to download Drive file ID "${fileId}" to directory "${localDirectoryPath}"...`);

  try {
    let fileName = desiredFileName;
    if (!fileName) {
      const fileMetadata = await drive.files.get({ fileId: fileId, fields: 'name, mimeType', supportsAllDrives: true });
      fileName = fileMetadata.data.name;
      if (fileMetadata.data.mimeType.includes('google-apps')) {
         console.warn(`File ${fileName} (ID: ${fileId}) is a Google Workspace document. Standard download (alt=media) may produce a conversion (e.g., PDF for Docs). For specific export formats, use drive.files.export().`);
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
          fs.unlink(localFilePath, () => {});
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
  if (!drive) throw new Error('Google Drive service not initialized. Call initialize(serviceAccountKeyPath) first.');
  console.log(`Fetching contents for Drive folder ID "${folderId}"...`);
  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, webViewLink, size, modifiedTime, iconLink, parents)',
      orderBy: 'folder, name',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const contents = res.data.files.map(file => ({
      id: file.id,
      name: file.name,
      type: file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
      size: file.size ? parseInt(file.size, 10) : undefined,
      modifiedTime: file.modifiedTime,
      link: file.webViewLink,
      iconLink: file.iconLink,
      parents: file.parents,
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
};
console.log('google_drive_service_server.js loaded (now uses Service Account Auth).');
