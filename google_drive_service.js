// google_drive_service.js - Client-side Google Drive interaction using gapi

// Ensure gapi is loaded before this script runs, typically via <script src="https://apis.google.com/js/api.js"></script>
// This service assumes gapi.client and gapi.auth2 are available.

let driveApiKey; // Store API key
let driveClientId; // Store Client ID for OAuth
let googleAuth; // Stores gapi.auth2.GoogleAuth instance

/**
 * Initializes the Google API client for Drive.
 * Loads the Drive API and sets up authentication.
 * @param {string} apiKey - The Google API Key.
 * @param {string} [clientId] - The Google Client ID for OAuth2. If not provided, some operations might be restricted.
 * @returns {Promise<void>} A promise that resolves when initialization is complete.
 */
async function initialize(apiKey, clientId) {
    driveApiKey = apiKey;
    driveClientId = clientId;

    return new Promise((resolve, reject) => {
        if (typeof gapi === 'undefined') {
            console.error('gapi is not loaded. Please include the Google API script.');
            return reject(new Error('gapi is not loaded.'));
        }

        gapi.load('client:auth2', async () => {
            try {
                await gapi.client.init({
                    apiKey: driveApiKey,
                    clientId: driveClientId, // clientId is needed for OAuth features
                    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
                    scope: 'https://www.googleapis.com/auth/drive', // Full scope, adjust if needed
                });

                if (driveClientId) {
                    googleAuth = gapi.auth2.getAuthInstance();
                    if (!googleAuth) { // Should have been initialized by gapi.client.init
                        console.error("Google Auth instance could not be retrieved after init.");
                        // This case might indicate a problem with client.init or gapi.auth2 setup
                        // Potentially try gapi.auth2.init if getAuthInstance is null
                        // For now, log and rely on subsequent calls to fail if auth is missing
                    }
                    console.log('Google Drive API (with OAuth client) initialized.');
                } else {
                    console.log('Google Drive API (API Key only) initialized. Some operations may be restricted.');
                }

                // Load the Drive API client library specifically
                // Though gapi.client.init with discoveryDocs should make it available.
                // This is more of an explicit step to ensure gapi.client.drive is usable.
                await gapi.client.load('drive', 'v3');
                console.log('gapi.client.drive loaded.');

                resolve();
            } catch (error) {
                console.error('Error initializing Google Drive client:', error);
                reject(error);
            }
        });
    });
}

/**
 * Checks if the user is currently signed in.
 * Requires OAuth to be initialized.
 * @returns {boolean} True if signed in, false otherwise.
 */
function isSignedIn() {
    if (googleAuth) {
        return googleAuth.isSignedIn.get();
    }
    return false; // If no googleAuth (e.g. API key only), assume not signed in for OAuth purposes
}

/**
 * Initiates the Google Sign-In flow.
 * Requires OAuth to be initialized.
 * @returns {Promise<gapi.auth2.GoogleUser>} A promise that resolves with the GoogleUser object on successful sign-in.
 */
async function signIn() {
    if (!googleAuth) {
        throw new Error('Google Auth not initialized. Call initialize with a clientId.');
    }
    if (googleAuth.isSignedIn.get()) {
        console.log('User already signed in.');
        return googleAuth.currentUser.get();
    }
    return googleAuth.signIn();
}

/**
 * Signs out the current user.
 * Requires OAuth to be initialized.
 * @returns {Promise<void>} A promise that resolves when sign-out is complete.
 */
async function signOut() {
    if (!googleAuth) {
        throw new Error('Google Auth not initialized. Call initialize with a clientId.');
    }
    return googleAuth.signOut();
}


// Placeholder for other functions

/**
 * Downloads a file from Google Drive.
 * This attempts to fetch the file content and trigger a browser download.
 * Requires appropriate authentication (usually OAuth) if the file is not public.
 * @param {string} fileId - The ID of the file to download.
 * @param {string} fileName - The desired local name for the downloaded file.
 * @returns {Promise<void>} A promise that resolves when the download is initiated, or rejects on error.
 * @throws {Error} If API is not initialized or download fails.
 */
async function downloadFile(fileId, fileName) {
    if (!gapi.client.drive || !gapi.client.drive.files) {
        throw new Error('Google Drive API client not loaded or initialized. Call initialize() first.');
    }
    console.log(`Client: Attempting to download file ID: ${fileId} as "${fileName}"`);

    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });

        const contentType = response.headers ? response.headers['Content-Type'] : 'application/octet-stream';
        const blob = new Blob([response.body], { type: contentType });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        console.log(`Client: Download initiated for file "${fileName}".`);
    } catch (error) {
        console.error(`Client: Error downloading file "${fileId}":`, error.result ? error.result.error : error);
        let message = `Client: Failed to download file "${fileId}": ${error.result ? error.result.error.message : error.message}`;
        try {
            // Attempt to get webViewLink as a fallback if direct download fails
            const fileMeta = await gapi.client.drive.files.get({ fileId: fileId, fields: 'webViewLink'});
            if (fileMeta.result.webViewLink) {
                 console.warn(`Client: Direct download failed. User can try opening: ${fileMeta.result.webViewLink}`);
                 message += ` User can try opening: ${fileMeta.result.webViewLink}`;
            }
        } catch (metaError) {
            // Log metaError but throw the original error message
            console.error(`Client: Error fetching webViewLink after download failure:`, metaError);
        }
        throw new Error(message);
    }
}

export {
    initialize,
    isSignedIn,
    signIn,
    signOut,
    findOrCreateFolder,
    uploadFile,
    getFolderContents,
    getFileLink,
    downloadFile,
};
