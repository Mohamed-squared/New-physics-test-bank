# Google Drive Integration Overview

This document outlines the integration of Google Drive as the primary cloud storage solution for the Lyceum platform, replacing the previous Mega.nz integration.

## New Services

Two new services facilitate interaction with Google Drive:

1.  **`google_drive_service_server.js` (Server-Side)**:
    *   A Node.js module designed for backend operations.
    *   Uses the `googleapis` Node.js library.
    *   Handles tasks like creating folders, uploading files (e.g., from server local paths), listing folder contents, and managing file permissions server-to-server.
    *   Used by `course_automation_service.js` for automated course content population.

2.  **`google_drive_service.js` (Client-Side)**:
    *   A JavaScript module for client-side (browser) interactions with Google Drive.
    *   Uses the Google API Client Library for JavaScript (`gapi`).
    *   Handles tasks like user authentication (OAuth2), file/folder listing, file uploads from the user's browser, and triggering downloads.
    *   Used by `admin_drive_service.js` for admin panel functionalities like course migration management and file exploration.

## Configuration

Proper configuration is crucial for the Google Drive integration to function correctly.

### Server-Side (`google_drive_service_server.js`)

*   **`GOOGLE_DRIVE_API_KEY`**:
    *   A Google Cloud API Key with the Google Drive API enabled.
    *   This key is used for server-to-server interactions that do not require user-specific permissions (e.g., accessing public data, or operations if using a service account with domain-wide delegation, though the current implementation primarily uses API key for server-side).
    *   **Setup**: This key should be stored securely in `server_config.js` and accessed by server-side modules.
    *   `google_drive_service_server.js` is initialized using `initialize(GOOGLE_DRIVE_API_KEY)`.

### Client-Side (`google_drive_service.js`)

*   **`GOOGLE_DRIVE_API_KEY`**:
    *   The same Google Cloud API Key as used on the server-side.
    *   Used by `gapi.client.init` for basic API access.
    *   **Setup**: This key must be made available to the client-side JavaScript environment. This is typically done by embedding it in the main HTML file (e.g., `index.html`) within a `<script>` tag:
        ```html
        <script>
          window.GOOGLE_DRIVE_API_KEY = 'YOUR_ACTUAL_API_KEY';
        </script>
        ```
*   **`GOOGLE_DRIVE_CLIENT_ID`**:
    *   A Google Cloud OAuth 2.0 Client ID (for Web applications).
    *   Required for client-side operations that need user authorization (e.g., accessing the user's Drive, uploading files to their Drive, listing non-public folders).
    *   **Setup**: Similar to the API key, the Client ID must be available globally on the client-side. Embed it in `index.html`:
        ```html
        <script>
          window.GOOGLE_DRIVE_CLIENT_ID = 'YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com';
        </script>
        ```
    *   `google_drive_service.js` is initialized using `initialize(GOOGLE_DRIVE_API_KEY, GOOGLE_DRIVE_CLIENT_ID)`.

## Authentication

*   **Server-Side**:
    *   `google_drive_service_server.js` primarily uses the `GOOGLE_DRIVE_API_KEY` for authentication. This is suitable for operations not tied to a specific user's Drive account or for accessing publicly shared resources. For broader access or acting on behalf of users, a service account with domain-wide delegation would be necessary, but the current setup focuses on API key usage.
*   **Client-Side**:
    *   `google_drive_service.js` uses a combination:
        *   The `GOOGLE_DRIVE_API_KEY` is used to load the Drive API and for basic, unauthenticated requests.
        *   The `GOOGLE_DRIVE_CLIENT_ID` is used to enable OAuth 2.0. Users will be prompted to sign in with their Google accounts and grant permissions, allowing the application to act on their behalf within the defined scopes (e.g., `https://www.googleapis.com/auth/drive`).
        *   Functions like `signIn()`, `signOut()`, and `isSignedIn()` manage the OAuth flow.

## Updated Services

The following existing services have been refactored to use the new Google Drive services:

*   **`course_automation_service.js`**: Now utilizes `google_drive_service_server.js` for all backend cloud storage operations (creating course folders, uploading initial materials like textbooks, etc.).
*   **`admin_drive_service.js`** (formerly `admin_mega_service.js`): Now utilizes `google_drive_service.js` (client-side) for interacting with Google Drive from the admin panel, including initializing user authentication, managing course data migration status, and providing a file explorer interface for Drive.

---

## Strategy for Migrating Existing Data from Mega to Google Drive

This section outlines a proposed strategy for migrating course files and updating Firestore records for existing courses currently stored on Mega.nz.

**Objective**: Move all relevant course files for existing courses from Mega.nz to Google Drive. Update corresponding Firestore course documents with new Google Drive links and folder/file IDs, and deprecate or remove old Mega links.

**Proposed Steps**:

1.  **Script Development**:
    *   Develop a new standalone Node.js script (e.g., `migrate_mega_to_drive.js`). This script will not be part of the main application runtime but will be an administrative tool.

2.  **Dependencies**:
    *   The script will require:
        *   `firebase-admin` SDK for server-side authentication and interaction with Firestore (using a service account key like `firebase_admin_sdk.json`).
        *   The existing `mega_service_server.js` (or a compatible version of `megajs`) to programmatically access and download files from Mega.
        *   The new `google_drive_service_server.js` to create folders and upload files to Google Drive.

3.  **Configuration**:
    *   The migration script will need secure access to:
        *   Mega.nz account credentials (email and password).
        *   Google Drive API Key (as used by `google_drive_service_server.js`).
        *   Firebase Admin SDK credentials.

4.  **Migration Process**:
    *   **Fetch Courses**: The script will connect to Firestore and fetch all course definitions.
    *   **Iterate Courses**: For each course document:
        *   **Identify Migratable Courses**: Check if the course has existing Mega links (e.g., `megaCourseRootFolderLink`, `megaTextbookFullPdfLink`) and importantly, does *not* yet have corresponding Google Drive identifiers (e.g., `driveCourseRootFolderId`). This prevents re-migrating already migrated courses.
        *   **Initialize Services**: For each course to be migrated:
            *   Log in to Mega using `mega_service_server.js#initialize(megaEmail, megaPassword)`.
            *   Initialize the Google Drive service using `google_drive_service_server.js#initialize(GOOGLE_DRIVE_API_KEY)`.
        *   **Recreate Folder Structure**:
            *   Determine the target course folder name (e.g., from `course.courseDirName` or `course.name`).
            *   Create/find the main "LyceumCourses_Test" folder in Google Drive using `google_drive_service_server.js#findOrCreateFolder('LyceumCourses_Test', 'root')`.
            *   Create the specific course's root folder within "LyceumCourses_Test" (e.g., `DRIVE_COURSE_ROOT_ID = await findOrCreateFolder(courseName, lyceumRootDriveId)`).
            *   Recreate standard subfolders (e.g., "Textbook_Full", "Textbook_Chapters", "Transcriptions_Archive", "Generated_Assessments") within this `DRIVE_COURSE_ROOT_ID` using `findOrCreateFolder`. Keep track of their new Drive IDs.
        *   **File Migration (Iterate Known Links/Folders)**:
            *   The script needs a mapping of which Mega links/folder structures in Firestore correspond to which new Drive folders.
            *   **Example for `megaTextbookFullPdfLink`**: If this is a direct file link:
                *   Download the file from Mega using `mega_service_server.js#downloadFileByLink(link, tempLocalPath)`. (This function might need to be added to `mega_service_server.js` if it only supports downloading from folder nodes currently).
                *   Upload the downloaded file to the `textbookFullDriveFolderId` using `google_drive_service_server.js#uploadFile(tempLocalPath, originalFileName, textbookFullDriveFolderId)`.
                *   Store the new Drive file ID and `webViewLink`.
            *   **Example for a Mega Folder (e.g., `megaTranscriptionsFolderLink`)**:
                *   Parse the Mega folder link to get the folder node.
                *   List contents of this Mega folder using `mega_service_server.js#getFolderContents(megaFolderNode)`.
                *   For each file in the Mega folder:
                    *   Download it to a temporary local directory (e.g., `tempDir = fs.mkdtempSync(...)`).
                        *   A robust `mega_service_server.js#downloadFileNode(fileNode, localDir)` function would be needed.
                    *   Upload it from the temporary directory to the corresponding Google Drive folder (e.g., `transcriptionsArchiveDriveFolderId`) using `google_drive_service_server.js#uploadFile(localFilePath, fileName, driveFolderId)`.
                    *   Delete the temporary local file after successful upload.
                *   Clean up the temporary directory.
        *   **Update Firestore**:
            *   After all files for a course are successfully migrated, update its Firestore document:
                *   Add new fields like `driveCourseRootFolderId`, `driveCourseRootLink`, `driveTextbookFullPdfId`, `driveTextbookFullPdfLink`, `driveTranscriptionsFolderId`, etc.
                *   Optionally, mark old Mega fields as deprecated (e.g., rename `megaCourseRootFolderLink` to `deprecated_megaCourseRootFolderLink`) or remove them if a clean cutover is preferred. Removing them makes the schema cleaner but loses historical data.
            *   Log the success of this course's migration.

5.  **Error Handling & Logging**:
    *   Implement comprehensive error handling for API calls, file operations, and Firestore updates.
    *   Log detailed information about each step (e.g., files being downloaded/uploaded, folders created, Firestore updates).
    *   **Resumability**: Keep track of successfully migrated courses (e.g., by setting a `migrationStatus: 'drive_migrated'` flag in Firestore or in a separate tracking collection). The script should be able to skip already migrated courses if restarted. For partial migrations within a course (if a large course fails mid-way), more granular tracking might be needed (e.g., per-file or per-folder section).

6.  **Dry Run Mode**:
    *   Implement a command-line flag or configuration option for a "dry run" mode.
    *   In this mode, the script would perform all steps *except* actual file downloads/uploads and Firestore writes. It would log what actions it *would* have taken. This is crucial for testing and estimating.

7.  **Testing**:
    *   Thoroughly test the script on a staging or development Firebase project with sample course data and actual (test) Mega and Google Drive accounts.
    *   Test with various scenarios: courses with many files, large files, empty folders, courses already partially migrated (if supporting resume).

**Considerations**:

*   **API Rate Limits**: Both Mega.nz and Google Drive have API rate limits. The script may need to incorporate delays or use libraries that handle exponential backoff for API calls.
*   **Disk Space**: Downloading files temporarily requires local disk space. Ensure the environment running the script has sufficient space. For very large files, consider streaming if possible, though direct download-then-upload is often simpler to implement robustly.
*   **Migration Duration**: Migrating a large number of courses and files can take a significant amount of time. The script should be designed to run for long periods, possibly in segments if resumability is robust.
*   **Data Verification**: After migration, a verification step (manual or scripted) might be needed to ensure all files were transferred correctly and links are valid. This could involve comparing file counts, spot-checking files, or even checksums if feasible.
*   **Permissions on Drive**: Ensure the Google Drive API key or service account used has the necessary permissions to create folders and upload files to the target destination (potentially a shared Drive if not user-specific).
*   **Mega Service Robustness**: The `mega_service_server.js` (or `megajs` library) needs to be robust enough to handle listing and downloading potentially large numbers of files and folders.

---

*Note: This migration strategy is a high-level plan. The actual migration script (`migrate_mega_to_drive.js`) will require separate, detailed implementation and thorough testing.*
