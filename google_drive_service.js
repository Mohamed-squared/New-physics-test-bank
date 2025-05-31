// Google Drive API Client Library
const GDRIVE_API_KEY = 'AIzaSyBkBeXMuIsUJb-gGDAf7nLeOJk3var_uww'; // For discovery and non-OAuth calls
const GDRIVE_CLIENT_ID = '989482145642-8kglr8m87djth2o3iu81kh8ui70uv6kk.apps.googleusercontent.com'; // Provided Client ID
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive'; // Adjust scopes as needed (e.g., drive.file, drive.readonly)

let gapiLoaded = false;
let gisLoaded = false;
let tokenClient;
let currentAccessToken = null; // To store the current access token object { access_token, expires_in, scope, ... }
let accessTokenExpiry = 0; // Timestamp when the current access token expires

/**
 * Loads the Google API client library and Google Identity Services.
 * Initializes the API client and token client for OAuth2.
 */
export async function initialize() {
    console.log('Initializing Google Drive Service...');
    return new Promise((resolve, reject) => {
        const scriptGapi = document.createElement('script');
        scriptGapi.src = 'https://apis.google.com/js/api.js';
        scriptGapi.async = true;
        scriptGapi.defer = true;
        scriptGapi.onload = () => {
            gapiLoaded = true;
            gapi.load('client', async () => {
                try {
                    // Initialize GAPI client for API discovery and non-token calls
                    await gapi.client.init({
                        apiKey: GDRIVE_API_KEY,
                        discoveryDocs: DISCOVERY_DOCS,
                    });
                    console.log('GAPI client initialized (for discovery).');
                    if (gisLoaded && tokenClient) resolveService();
                    else if (gisLoaded && !tokenClient) { // GIS loaded but token client init failed or pending
                        console.warn("GAPI client loaded, GIS loaded, but tokenClient might not be ready. Attempting to initialize token client again if needed.");
                        initializeTokenClient(resolve, reject, resolveService); // Try to init token client
                    }
                } catch (error) {
                    console.error('Error initializing GAPI client:', error);
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
            console.log('Google Identity Services (GIS) script loaded.');
            initializeTokenClient(resolve, reject, resolveService);
        };
        scriptGis.onerror = () => reject(new Error('Failed to load GIS script.'));
        document.body.appendChild(scriptGis);

        const resolveService = () => {
            console.log('Google Drive service ready (GAPI & GIS initialized).');
            resolve();
        };
    });
}

function initializeTokenClient(resolve, reject, resolveServiceCallback) {
    if (!gisLoaded) {
        console.warn("GIS not loaded, cannot initialize token client yet.");
        return;
    }
    if (tokenClient) { // Already initialized
         if (gapiLoaded) resolveServiceCallback();
        return;
    }
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GDRIVE_CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => { // This callback handles the response from requestAccessToken
                if (tokenResponse && tokenResponse.access_token) {
                    console.log('Access token received via initTokenClient callback.');
                    currentAccessToken = tokenResponse;
                    accessTokenExpiry = Date.now() + (tokenResponse.expires_in * 1000);
                    gapi.client.setToken(tokenResponse); // Set token for GAPI client
                    // If there was a pending promise from requestUserToken, it should be resolved here.
                    // This callback is primarily for the implicit flow of initTokenClient.
                } else if (tokenResponse && tokenResponse.error) {
                    console.error('Error in token response (initTokenClient callback):', tokenResponse.error);
                    // This error will be caught by the requestAccessToken promise if it was explicit.
                }
            },
        });
        console.log('Google Identity Services (GIS) token client initialized.');
        if (gapiLoaded) resolveServiceCallback();
    } catch (error) {
        console.error('Error initializing GIS token client:', error);
        reject(new Error('Failed to initialize GIS token client.'));
    }
}


/**
 * Requests an OAuth2 token from the user if a valid one is not already available.
 * Stores the token and its expiry time.
 * @returns {Promise<string>} The access token string.
 * @throws {Error} If token acquisition fails or client is not initialized.
 */
export async function requestUserToken() {
    if (!gapiLoaded || !gisLoaded || !tokenClient) {
        console.error('Google Drive service or token client not initialized. Call initialize() first.');
        await initialize(); // Try to initialize if not already
        if (!gapiLoaded || !gisLoaded || !tokenClient) { // Check again after attempt
             throw new Error('Google Drive service or token client failed to initialize.');
        }
    }

    if (currentAccessToken && accessTokenExpiry > Date.now() + 60000) { // Check if token exists and not expiring in next minute
        console.log('Using existing valid access token.');
        // Ensure GAPI client has the token (it should if currentAccessToken is set via the callback)
        if (gapi.client.getToken() === null && currentAccessToken) {
            gapi.client.setToken(currentAccessToken);
        }
        return currentAccessToken.access_token;
    }

    console.log('Requesting new access token...');
    return new Promise((resolve, reject) => {
        tokenClient.callback = (tokenResponse) => { // Override callback for this specific request
            if (tokenResponse && tokenResponse.access_token) {
                console.log('New access token acquired successfully.');
                currentAccessToken = tokenResponse;
                accessTokenExpiry = Date.now() + (tokenResponse.expires_in * 1000);
                gapi.client.setToken(tokenResponse); // Set token for GAPI client usage
                resolve(tokenResponse.access_token);
            } else {
                const errorMsg = tokenResponse.error || 'Unknown error during token acquisition.';
                console.error('Failed to acquire access token:', errorMsg, tokenResponse);
                currentAccessToken = null;
                accessTokenExpiry = 0;
                reject(new Error(`Failed to acquire access token: ${errorMsg}`));
            }
        };
        tokenClient.requestAccessToken({ prompt: 'consent' }); // Force consent screen for explicit request
    });
}

export async function findFolder(folderName, parentFolderId = 'root') {
    await requestUserToken(); // Ensures token is available and set for gapi.client
    console.log(`Searching for folder "${folderName}" in parent ID "${parentFolderId}" using OAuth token.`);
    try {
        const response = await gapi.client.drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentFolderId}' in parents and trashed=false`,
            fields: 'files(id, name, webViewLink, parents)',
            spaces: 'drive',
        });
        if (response.result.files && response.result.files.length > 0) {
            return response.result.files[0];
        }
        return null;
    } catch (error) {
        console.error(`Error finding folder "${folderName}":`, error);
        throw error;
    }
}

export async function createFolder(folderName, parentFolderId = 'root') {
    await requestUserToken();
    console.log(`Creating folder "${folderName}" in parent ID "${parentFolderId}" using OAuth token.`);
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
        return response.result;
    } catch (error) {
        console.error(`Error creating folder "${folderName}":`, error);
        throw error;
    }
}

export async function uploadFile(fileObject, remoteFileName, targetFolderId = 'root') {
    const token = await requestUserToken(); // Get token for fetch
    console.log(`Uploading file "${remoteFileName || fileObject.name}" to folder ID "${targetFolderId}" using OAuth token.`);

    if (!fileObject) throw new Error('File object is required.');
    const actualRemoteFileName = remoteFileName || fileObject.name;

    try {
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify({
            name: actualRemoteFileName,
            parents: [targetFolderId],
            mimeType: fileObject.type || 'application/octet-stream'
        })], { type: 'application/json' }));
        form.append('file', fileObject);

        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, { // API Key removed from URL
            method: 'POST',
            headers: new Headers({
                'Authorization': `Bearer ${token}`, // Use obtained token
            }),
            body: form
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Upload failed: ${errorData.error.message}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error uploading file "${actualRemoteFileName}":`, error);
        throw error;
    }
}

export async function downloadFile(fileId, desiredFileName) {
    await requestUserToken();
    if (!fileId) throw new Error('File ID is required.');
    console.log(`Downloading file ID "${fileId}" as "${desiredFileName || 'unknown'}" using OAuth token.`);

    try {
        const metadataResponse = await gapi.client.drive.files.get({ fileId, fields: 'name, mimeType' });
        const fileMetadata = metadataResponse.result;
        const fileName = desiredFileName || fileMetadata.name;

        const response = await gapi.client.drive.files.get({ fileId, alt: 'media' });

        if (response.body && typeof response.body === 'string') {
            const blob = new Blob([response.body], { type: response.headers['Content-Type'] || fileMetadata.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none'; a.href = url; a.download = fileName;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return { name: fileName, size: blob.size, mimeType: blob.type };
        } else if (response.result && response.result.error) {
            throw new Error(response.result.error.message);
        } else if (!response.body && response.status !== 200 && response.status !== 204) { // GDocs often return 204 with no body for alt=media if not exportable this way
             throw new Error(`Cannot directly download Google Workspace file type: "${fileMetadata.mimeType}". Use export method or check permissions.`);
        } else {
             throw new Error('Failed to download file due to unexpected response or empty body for non-GDocs file.');
        }
    } catch (error) {
        console.error(`Error downloading file ID "${fileId}":`, error);
        throw error;
    }
}

export async function getFolderContents(folderId = 'root') {
    await requestUserToken();
    console.log(`Listing contents for folder ID "${folderId}" using OAuth token.`);
    try {
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType, webViewLink, size, modifiedTime, iconLink)',
            orderBy: 'folder,name'
        });
        return response.result.files.map(f => ({
            id: f.id, name: f.name,
            type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
            link: f.webViewLink, size: f.size, modifiedTime: f.modifiedTime, iconLink: f.iconLink
        }));
    } catch (error) {
        console.error(`Error listing folder contents for ID "${folderId}":`, error);
        throw error;
    }
}

console.log('google_drive_service.js loaded with OAuth 2.0 enhancements - Call initialize() to start.');
// --- Removed previous handleAuthClick and signOut examples as requestUserToken serves the auth purpose now ---
// --- Upload queue logic comment remains valid ---
// The UPLOAD_DELAY_MS and queue processing logic (previously used when this service managed Mega)
// has been removed as Google Drive API uploads are typically single operations
// and don't have the same type of rate limiting by default that would necessitate
// a client-side queue with delays for simple use cases.
// If batching or more complex upload management is needed, it would be implemented
// differently with Google Drive's batch API (https://developers.google.com/drive/api/guides/batch).
