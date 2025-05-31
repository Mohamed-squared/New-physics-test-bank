// Google Drive API Client Library
const GDRIVE_API_KEY = 'AIzaSyBkBeXMuIsUJb-gGDAf7nLeOJk3var_uww'; // Replace with your actual API key
const GDRIVE_CLIENT_ID = 'YOUR_CLIENT_ID'; // Replace with your actual Client ID for OAuth
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive'; // Adjust scopes as needed

let gapiLoaded = false;
let gisLoaded = false;
let tokenClient;

/**
 * Loads the Google API client library and Google Identity Services.
 * Initializes the API client and token client for OAuth2.
 * Note: API Key usage with Drive API is very limited. Most operations
 * that involve user data or creating/modifying content require OAuth2.
 */
export async function initialize() {
    return new Promise((resolve, reject) => {
        const scriptGapi = document.createElement('script');
        scriptGapi.src = 'https://apis.google.com/js/api.js';
        scriptGapi.async = true;
        scriptGapi.defer = true;
        scriptGapi.onload = () => {
            gapiLoaded = true;
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: GDRIVE_API_KEY,
                        discoveryDocs: DISCOVERY_DOCS,
                    });
                    console.log('Google API client initialized.');
                    if (gisLoaded) resolveService();
                } catch (error) {
                    console.error('Error initializing Google API client:', error);
                    reject(error);
                }
            });
        };
        scriptGapi.onerror = () => reject(new Error('Failed to load GAPI script.'));
        document.body.appendChild(scriptGapi);

        const scriptGis = document.createElement('script');
        scriptGis.src = 'https://accounts.google.com/gsi/client';
        scriptGis.async = true;
        scriptGis.defer = true;
        scriptGis.onload = () => {
            gisLoaded = true;
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GDRIVE_CLIENT_ID,
                scope: SCOPES,
                callback: '', // Callback will be handled by individual function calls
            });
            console.log('Google Identity Services initialized.');
            if (gapiLoaded) resolveService();
        };
        scriptGis.onerror = () => reject(new Error('Failed to load GIS script.'));
        document.body.appendChild(scriptGis);

        const resolveService = () => {
            console.log('Google Drive service ready.');
            resolve();
        };
    });
}

/**
 * Helper function to ensure GAPI client is loaded and authenticated.
 * This version uses API Key. For operations requiring OAuth, this needs modification.
 * For OAuth, it would typically check for an existing token or request one.
 */
async function ensureClientReady() {
    if (!gapiLoaded || !gapi.client) {
        throw new Error('Google API client not loaded. Call initialize() first.');
    }
    // For API Key, no explicit per-operation auth needed beyond initial gapi.client.init
    // If OAuth were used, this is where token check/refresh would happen.
    // Example:
    // if (!gapi.client.getToken()) {
    //     await requestUserToken(); // This would trigger OAuth flow
    // }
}

/**
 * Prompts the user for OAuth2 token if not already granted.
 * This is a placeholder for a full OAuth flow.
 */
async function requestUserToken() {
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            return reject(new Error("Token client not initialized."));
        }
        tokenClient.callback = (resp) => {
            if (resp.error) {
                console.error('Google OAuth Error:', resp.error);
                return reject(resp);
            }
            console.log('OAuth token acquired.');
            gapi.client.setToken(resp);
            resolve(resp);
        };
        // Check if we have a token, if not, request one.
        // This is a simplified check. Robust applications manage token expiry.
        if (gapi.client.getToken() === null) {
            // Prompt the user to select an account and grant access
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            // Token already exists
            resolve(gapi.client.getToken());
        }
    });
}

/**
 * Finds a folder by name within a specific parent folder.
 * @param {string} folderName The name of the folder to find.
 * @param {string} parentFolderId The ID of the parent folder. Defaults to 'root'.
 * @returns {Promise<object|null>} The folder object if found, otherwise null.
 * Requires OAuth2. API Key cannot be used for searching user's Drive.
 */
export async function findFolder(folderName, parentFolderId = 'root') {
    console.warn("findFolder typically requires OAuth2. API Key access to user's Drive is restricted.");
    await ensureClientReady();
    // This is a placeholder: actual user authentication (OAuth2) is needed here.
    // await requestUserToken(); // Uncomment and implement for OAuth

    try {
        const response = await gapi.client.drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentFolderId}' in parents and trashed=false`,
            fields: 'files(id, name, webViewLink, parents)',
            // Use corpora = 'user' for user's files; requires OAuth.
            // corpora: 'user',
            // For API key, you might only be able to search publicly shared files or files owned by the service account.
            // This example assumes a context where API key might work (e.g., public data) or serves as a structure for OAuth.
        });
        if (response.result.files && response.result.files.length > 0) {
            console.log(`Folder "${folderName}" found:`, response.result.files[0]);
            return response.result.files[0];
        } else {
            console.log(`Folder "${folderName}" not found in parent "${parentFolderId}".`);
            return null;
        }
    } catch (error) {
        console.error(`Error finding folder "${folderName}":`, error);
        if (error.result && error.result.error && error.result.error.message.includes("insufficientPermissions")) {
            console.error("This operation likely requires OAuth2 authentication for user-specific data.");
        }
        throw error;
    }
}

/**
 * Creates a folder with the given name under a specific parent folder.
 * @param {string} folderName The name for the new folder.
 * @param {string} parentFolderId The ID of the parent folder. Defaults to 'root'.
 * @returns {Promise<object>} The created folder object.
 * Requires OAuth2. API Key cannot create folders in user's Drive.
 */
export async function createFolder(folderName, parentFolderId = 'root') {
    console.warn("createFolder requires OAuth2. API Key cannot create folders in user's Drive.");
    await ensureClientReady();
    // This is a placeholder: actual user authentication (OAuth2) is needed here.
    // await requestUserToken(); // Uncomment and implement for OAuth

    try {
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId]
        };
        const response = await gapi.client.drive.files.create({
            resource: fileMetadata,
            fields: 'id, name, webViewLink, parents'
        });
        console.log(`Folder "${folderName}" created successfully:`, response.result);
        return response.result;
    } catch (error) {
        console.error(`Error creating folder "${folderName}":`, error);
        if (error.result && error.result.error && error.result.error.message.includes("insufficientPermissions")) {
            console.error("This operation likely requires OAuth2 authentication.");
        }
        throw error;
    }
}

/**
 * Uploads a file to a specific folder.
 * @param {File} fileObject The file object to upload.
 * @param {string} remoteFileName Optional. The name for the file on Google Drive. Defaults to fileObject.name.
 * @param {string} targetFolderId The ID of the folder where the file should be uploaded. Defaults to 'root'.
 * @returns {Promise<object>} The uploaded file object from Google Drive.
 * Requires OAuth2. API Key cannot upload files to user's Drive.
 */
export async function uploadFile(fileObject, remoteFileName, targetFolderId = 'root') {
    console.warn("uploadFile requires OAuth2. API Key cannot upload files to user's Drive.");
    await ensureClientReady();
    // This is a placeholder: actual user authentication (OAuth2) is needed here.
    // await requestUserToken(); // Uncomment and implement for OAuth

    if (!fileObject) {
        throw new Error('File object is required for uploading a file.');
    }

    const actualRemoteFileName = remoteFileName || fileObject.name;

    try {
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify({
            name: actualRemoteFileName,
            parents: [targetFolderId],
            mimeType: fileObject.type || 'application/octet-stream'
        })], { type: 'application/json' }));
        form.append('file', fileObject);

        // Use fetch for multipart upload as gapi.client.drive.files.create with media body
        // can be tricky for browser environments directly without more complex setup.
        // The 'uploadType=multipart' is standard for Google API direct uploads.
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&key=${GDRIVE_API_KEY}`, {
            method: 'POST',
            headers: new Headers({
                // The Authorization header is set by gapi.client if using OAuth.
                // For API key uploads (if supported for specific scenarios, e.g. to a service account owned resource),
                // the key is in the URL. If using OAuth, gapi.client provides the token.
                'Authorization': `Bearer ${gapi.client.getToken() ? gapi.client.getToken().access_token : ''}`,
            }),
            body: form
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error uploading file:', errorData);
            throw new Error(`Upload failed: ${errorData.error.message}`);
        }

        const result = await response.json();
        console.log(`File "${actualRemoteFileName}" uploaded successfully:`, result);
        return result;

    } catch (error) {
        console.error(`Error uploading file "${actualRemoteFileName}":`, error);
        if (error.message && (error.message.includes("insufficientPermissions") || error.message.includes("authError"))) {
            console.error("This operation likely requires OAuth2 authentication.");
        }
        throw error;
    }
}


/**
 * Downloads a file from Google Drive.
 * @param {string} fileId The ID of the file to download.
 * @returns {Promise<Blob>} A Blob containing the file data.
 * Requires OAuth2 or that the file is publicly accessible or accessible to the API key.
 */
export async function downloadFile(fileId, desiredFileName) {
    await ensureClientReady();
    // If file is not public, OAuth2 is likely needed.
    // await requestUserToken(); // Uncomment and implement for OAuth if needed.

    if (!fileId) {
        throw new Error('File ID is required for download.');
    }

    try {
        // Get file metadata to ascertain name if desiredFileName is not provided
        const metadataResponse = await gapi.client.drive.files.get({
            fileId: fileId,
            fields: 'name, mimeType, size'
        });
        const fileMetadata = metadataResponse.result;
        const fileName = desiredFileName || fileMetadata.name;

        console.log(`Starting download of "${fileName}" (ID: ${fileId})`);

        // The alt=media parameter is crucial for direct file download.
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        // response.body contains the file content directly for non-Google Docs types.
        // For Google Docs, use files.export method. This example assumes direct download.
        if (response.body && typeof response.body === 'string') { // Check if body is string (binary data)
             // Convert base64 string or similar to Blob, depending on gapi.client behavior for binary
            // For simplicity, assuming it's raw data that can be blobbed.
            // Actual conversion might be needed if gapi returns it in a specific format.
            const blob = new Blob([response.body], { type: response.headers['Content-Type'] || fileMetadata.mimeType });

            // Create a link and trigger download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = fileName;

            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log(`File "${fileName}" download initiated in browser.`);
            return { name: fileName, size: blob.size, mimeType: blob.type };

        } else if (response.result && response.result.error) { // Check for explicit error in result
            console.error(`Error in download response for "${fileName}":`, response.result.error);
            throw new Error(response.result.error.message);
        } else if (!response.body && !response.status) { // No body and no status might mean it's a Google Doc type
             console.warn(`File "${fileName}" might be a Google Workspace document. Standard download via alt=media is not applicable. Use files.export instead.`);
             throw new Error(`Cannot directly download Google Workspace file type: "${fileMetadata.mimeType}". Use export method.`);
        } else { // Fallback for unexpected response structure
            console.error(`Unexpected response structure during download of "${fileName}":`, response);
            throw new Error('Failed to download file due to unexpected response.');
        }

    } catch (error) {
        console.error(`Error downloading file ID "${fileId}":`, error);
        if (error.result && error.result.error && error.result.error.message.includes("notFound")) {
            console.error("File not found or you may not have permission to access it.");
        } else if (error.message && error.message.includes("insufficientPermissions")) {
            console.error("This operation might require OAuth2 or the file isn't shared appropriately.");
        }
        throw error;
    }
}


/**
 * Lists the contents of a folder.
 * @param {string} folderId The ID of the folder. Defaults to 'root'.
 * @returns {Promise<Array<object>>} An array of file/folder objects.
 * Requires OAuth2 or that the folder/files are publicly accessible.
 */
export async function getFolderContents(folderId = 'root') {
    console.warn("getFolderContents typically requires OAuth2 for user-specific folders. API Key access is limited.");
    await ensureClientReady();
    // This is a placeholder: actual user authentication (OAuth2) is needed here.
    // await requestUserToken(); // Uncomment and implement for OAuth

    try {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType, webViewLink, size, modifiedTime, iconLink)',
            // corpora: 'user', // if using OAuth for user's files
            orderBy: 'folder,name'
        });
        console.log(`Contents of folder ID "${folderId}":`, response.result.files);
        return response.result.files.map(f => ({
            id: f.id,
            name: f.name,
            type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
            link: f.webViewLink,
            size: f.size, // Size might not be available for folders or Google Docs
            modifiedTime: f.modifiedTime,
            iconLink: f.iconLink
        }));
    } catch (error) {
        console.error(`Error listing folder contents for ID "${folderId}":`, error);
        if (error.result && error.result.error && error.result.error.message.includes("insufficientPermissions")) {
            console.error("This operation likely requires OAuth2 authentication for this folder.");
        }
        throw error;
    }
}

// Placeholder for any other utility functions that might be needed,
// e.g., deleting files, renaming, etc.
// Remember to maintain generic export names if they were used previously.

// --- Removed MEGA specific exports ---
// export { MEGA_EMAIL, MEGA_PASSWORD }; // These are removed
// export function getMegaStorage() { return megaStorage; } // This is removed
// ------------------------------------

console.log('google_drive_service.js loaded - Call initialize() to start.');

// Example of how to handle OAuth2 token expiration or initial request:
// This is conceptual and would be integrated into ensureClientReady or similar logic.
/*
async function handleAuthClick() {
    if (gapi.client.getToken() === null) {
        // Prompt the user to select an Google Account and asked for consent to share their data
        // when establishing a new session.
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        // User is already authenticated, proceed with API call or token revocation.
        // For example, to revoke a token: google.accounts.oauth2.revoke(gapi.client.getToken().access_token, () => {console.log('Token revoked')});
        console.log("Already authenticated.");
        // Potentially refresh token if it's expired, though gapi client library might handle some of this.
    }
}
*/
// It's good practice to provide a way for users to sign out or disconnect the app.
/*
export async function signOut() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken('');
            console.log('User signed out, token revoked.');
            // Update UI accordingly
        });
    }
}
*/

// The UPLOAD_DELAY_MS and queue processing logic (previously used when this service managed Mega)
// has been removed as Google Drive API uploads are typically single operations
// and don't have the same type of rate limiting by default that would necessitate
// a client-side queue with delays for simple use cases.
// If batching or more complex upload management is needed, it would be implemented
// differently with Google Drive's batch API (https://developers.google.com/drive/api/guides/batch).
