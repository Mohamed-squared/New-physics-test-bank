// admin_google_drive_service.js
import { globalCourseDataMap, currentUser } from './state.js';
import { showLoading, hideLoading } from './utils.js';
import { updateCourseDefinition } from './firebase_firestore.js';
import {
    initialize as gDriveInitialize,
    createFolder as gDriveCreateFolder,
    findFolder as gDriveFindFolder,
    uploadFile as gDriveUploadFile,
    downloadFile as gDriveDownloadFile, // Added for clarity, though not used in original download logic
    getFolderContents as gDriveGetFolderContents
} from './google_drive_service.js'; // UPDATED_IMPORT

// Helper to create a placeholder file object (Blob) for client-side uploads
async function createPlaceholderFile(fileName, content) {
    console.log(`[Placeholder] Creating placeholder file object for: ${fileName}`);
    const blob = new Blob([content], { type: 'text/plain' });
    // For Google Drive, the file object itself is needed for upload, not a custom structure.
    // The `google_drive_service.js` uploadFile function expects a File object.
    // This helper might need to be adjusted or used differently if directly creating files for upload.
    // For now, let's assume it creates a File object if possible, or its usage pattern will change.
    return new File([blob], fileName, { type: 'text/plain' });
}

// --- Google Drive Migration Dashboard ---
export function displayGoogleDriveMigrationDashboard(containerElement) { // RENAMED_FUNCTION
    if (!currentUser || !currentUser.isAdmin) {
        containerElement.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`;
        return;
    }

    containerElement.innerHTML = `
        <div class="content-card">
            <h2 class="text-2xl font-bold text-primary-700 dark:text-primary-300 mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 2h-15A2.5 2.5 0 002 4.5v15A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0019.5 2zM8.16 17.34L4.82 14l1.06-1.06 2.28 2.28 5.66-5.66 1.06 1.06-6.72 6.72z"></path></svg> <!-- Google Drive like Icon -->
                Google Drive Cloud Management <!-- RENAMED_TEXT -->
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Oversee course migration to Google Drive and explore cloud-stored resources.</p> <!-- RENAMED_TEXT -->

            <div id="gdrive-migration-gamified-alert" class="mb-6"></div> <!-- RENAMED_ID -->

            <div class="mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">Course Migration Status</h3>
                <div class="flex justify-between items-center mb-4">
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        Review courses and start their migration to Google Drive Cloud. <!-- RENAMED_TEXT -->
                    </p>
                    <button
                        id="load-courses-gdrive-migration-btn" <!-- RENAMED_ID -->
                        class="btn-secondary-small flex items-center"
                        title="Refresh course list and statuses">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                        Refresh List
                    </button>
                </div>
                <div id="gdrive-migration-course-list" class="space-y-4"> <!-- RENAMED_ID -->
                    <p class="text-gray-500 dark:text-gray-400">Loading course statuses...</p>
                </div>
            </div>

            <hr class="my-8 border-gray-300 dark:border-gray-600">

            <div id="gdrive-file-explorer-dynamic-container"> <!-- RENAMED_ID -->
                <!-- Google Drive File Explorer will be rendered here by displayGoogleDriveFileExplorer -->
            </div>
        </div>
    `;
    document.getElementById('load-courses-gdrive-migration-btn')?.addEventListener('click', loadCoursesForGoogleDriveMigration); // RENAMED_FUNCTION_CALL

    loadCoursesForGoogleDriveMigration(); // RENAMED_FUNCTION_CALL
    displayGoogleDriveFileExplorer(document.getElementById('gdrive-file-explorer-dynamic-container')); // RENAMED_FUNCTION_CALL & RENAMED_ID
    setupCourseAssetSelectionGoogleDrive(); // RENAMED_FUNCTION_CALL & Content needs update
}

// This function's direct server call to list-mega-folder needs to be re-evaluated for Google Drive.
// For now, it will be commented out or significantly adapted.
// The Google Drive service already has getFolderContents.
function setupCourseAssetSelectionGoogleDrive() { // RENAMED_FUNCTION
    const loadButton = document.getElementById('load-gdrive-folder-for-assets-btn'); // Example ID change
    const useAssetsButton = document.getElementById('use-selected-gdrive-assets-btn'); // Example ID change
    const folderIdInput = document.getElementById('gdrive-course-assets-folder-id'); // Changed from link to ID
    // Removed email/password inputs as they are not relevant for Google Drive API key/OAuth model
    const displayArea = document.getElementById('gdrive-course-assets-display-area'); // Example ID change
    const feedbackArea = document.getElementById('gdrive-course-assets-feedback'); // Example ID change

    if (!loadButton || !useAssetsButton || !folderIdInput || !displayArea || !feedbackArea) {
        console.warn("[CourseAssets] One or more UI elements for Google Drive course asset selection are missing. This feature may be disabled or incomplete.");
        if (feedbackArea) feedbackArea.innerHTML = `<p class="text-yellow-500">Asset selection UI is not fully initialized.</p>`;
        return;
    }

    console.log("Google Drive asset selection setup is placeholder. Needs full implementation with google_drive_service.js's getFolderContents.");
    feedbackArea.innerHTML = `<p class="text-blue-500">Google Drive asset selection: Provide a folder ID to list contents. (OAuth may be required for non-public folders)</p>`;


    loadButton.addEventListener('click', async () => {
        const folderId = folderIdInput.value.trim();

        if (!folderId) {
            feedbackArea.innerHTML = `<p class="text-red-500">Please provide a Google Drive Folder ID.</p>`;
            return;
        }

        feedbackArea.innerHTML = '';
        displayArea.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Loading folder contents...</p>';
        showLoading('Fetching Google Drive folder contents...');

        try {
            // This requires gDriveInitialize to have been called.
            // Assuming it's called during main dashboard load or similar.
            await gDriveInitialize(); // Ensure service is ready
            const contents = await gDriveGetFolderContents(folderId);

            if (contents && contents.length > 0) {
                displayArea.innerHTML = `
                    <h4 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Select files/folders to use as course assets:</h4>
                    <ul class="space-y-2 max-h-96 overflow-y-auto border border-gray-300 dark:border-gray-600 p-3 rounded-md">
                        ${contents.map(item => `
                            <li class="flex items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                                <input type="checkbox"
                                       id="gdrive-asset-${item.id}"
                                       name="gdrive-asset-select"
                                       class="form-checkbox h-5 w-5 text-primary-600 dark:text-primary-500 rounded mr-3 focus:ring-primary-500"
                                       data-id="${item.id}"
                                       data-name="${item.name}"
                                       data-type="${item.type}"
                                       data-link="${item.link || '#'}"
                                       data-size="${item.size || 0}">
                                <label for="gdrive-asset-${item.id}" class="flex-grow text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                                    ${item.type === 'folder' ? '📁' : '📄'} ${item.name}
                                    <span class="text-xs text-gray-500 dark:text-gray-400">(${(item.size || 0) / 1024 < 1 ? (item.size || 0) + ' B' : ((item.size || 0) / 1024).toFixed(2) + ' KB'})</span>
                                </label>
                            </li>
                        `).join('')}
                    </ul>`;
            } else {
                displayArea.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Folder is empty or no contents found. Ensure Folder ID is correct and you have permissions (OAuth might be needed for private folders).</p>';
            }
            feedbackArea.innerHTML = `<p class="text-green-500">Folder loaded successfully. ${contents?.length || 0} items found.</p>`;

        } catch (error) {
            console.error('[CourseAssets] Error loading Google Drive folder for assets:', error);
            displayArea.innerHTML = `<p class="text-red-500">Error loading folder: ${error.message}. Check console for details. OAuth might be required.</p>`;
            feedbackArea.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
        } finally {
            hideLoading();
        }
    });

    useAssetsButton.addEventListener('click', () => {
        const selectedAssets = [];
        const checkboxes = displayArea.querySelectorAll('input[name="gdrive-asset-select"]:checked');

        checkboxes.forEach(checkbox => {
            selectedAssets.push({
                id: checkbox.dataset.id,
                link: checkbox.dataset.link, // webViewLink from Google Drive
                name: checkbox.dataset.name,
                type: checkbox.dataset.type,
                size: checkbox.dataset.size
            });
        });

        if (selectedAssets.length === 0) {
            feedbackArea.innerHTML = `<p class="text-yellow-500">No assets selected.</p>`;
            alert("No assets selected.");
            return;
        }

        console.log("[CourseAssets] Selected Google Drive Assets:", selectedAssets);
        feedbackArea.innerHTML = `<p class="text-green-500">${selectedAssets.length} asset(s) selected and logged to console. Further course creation steps are pending.</p>`;
        alert(`Selected ${selectedAssets.length} asset(s) for Google Drive. Details logged to console. Course creation from these assets is the next step (not yet implemented).`);
        // Future: Pass selectedAssets to a course creation setup function
    });
}


export function loadCoursesForGoogleDriveMigration() { // RENAMED_FUNCTION
    if (!currentUser || !currentUser.isAdmin) {
        console.warn("User is not admin, cannot load courses for Google Drive migration."); // RENAMED_TEXT
        const listContainer = document.getElementById('gdrive-migration-course-list'); // RENAMED_ID
        if (listContainer) listContainer.innerHTML = `<div class="p-3 text-red-700 bg-red-100 rounded dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`;
        return;
    }

    const listContainer = document.getElementById('gdrive-migration-course-list'); // RENAMED_ID
    const gamifiedAlertContainer = document.getElementById('gdrive-migration-gamified-alert'); // RENAMED_ID
    if (!listContainer || !gamifiedAlertContainer) {
        console.error("Google Drive migration UI containers not found."); return; // RENAMED_TEXT
    }

    showLoading("Surveying courses for Google Drive readiness..."); // RENAMED_TEXT
    listContainer.innerHTML = '';
    gamifiedAlertContainer.innerHTML = '';

    if (globalCourseDataMap.size === 0) {
        listContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-3">No courses charted for exploration.</p>';
        hideLoading(); return;
    }

    let unmigratedCoursesCount = 0;
    globalCourseDataMap.forEach(course => {
        const courseElement = document.createElement('div');
        courseElement.className = 'p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 shadow hover:shadow-md transition-shadow duration-200';

        // Adjusted field names for Google Drive (e.g., gdriveCourseRootFolderId or gdriveCourseRootLink)
        const isFullyMigrated = course.gdriveTranscriptionsFolderId && course.gdrivePdfFolderId && course.gdriveMcqFolderId && course.gdriveCourseRootFolderId;

        let statusText = "";
        let statusColorClass = "";
        if (isFullyMigrated) {
            statusText = `Fully Migrated to Google Drive`; // RENAMED_TEXT
            statusColorClass = "text-green-600 dark:text-green-400";
        } else if (course.gdriveTranscriptionsFolderId || course.gdrivePdfFolderId || course.gdriveMcqFolderId || course.gdriveTextbookFullPdfId || course.gdriveCourseRootFolderId) { // Adjusted field names
            statusText = `Partially Migrated to Google Drive`; // RENAMED_TEXT
            statusColorClass = "text-yellow-600 dark:text-yellow-400";
            unmigratedCoursesCount++;
        } else {
            statusText = `Not Migrated (Local Only)`;
            statusColorClass = "text-red-600 dark:text-red-400";
            unmigratedCoursesCount++;
        }

        let buttonText = isFullyMigrated ? 'Explore Course Vault' : 'Start Migration';
        // Google Drive links are usually webViewLink (for users) or IDs (for API)
        let buttonDisabled = isFullyMigrated && !course.gdriveCourseRootWebLink; // Check for a usable link for exploration

        courseElement.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div class="mb-2 sm:mb-0">
                    <h4 class="font-semibold text-lg text-gray-800 dark:text-gray-200">${course.name} <span class="text-xs text-gray-500">(ID: ${course.id})</span></h4>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Local Directory: ${course.courseDirName || 'N/A'}</p>
                    <p class="text-sm mt-1 font-medium ${statusColorClass}">${statusText}</p>
                </div>
                <button
                    id="migrate-gdrive-btn-${course.id}"  // RENAMED_ID_PATTERN
                    data-course-id="${course.id}"
                    data-is-migrated="${isFullyMigrated}"
                    data-root-id="${course.gdriveCourseRootFolderId || ''}" // Changed to ID
                    data-root-weblink="${course.gdriveCourseRootWebLink || ''}" // Added webLink for UI
                    class="${isFullyMigrated && course.gdriveCourseRootWebLink ? 'btn-secondary' : 'btn-primary'} whitespace-nowrap migrate-explore-gdrive-btn"> <!-- RENAMED_CLASS -->
                    ${isFullyMigrated && course.gdriveCourseRootWebLink ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1 inline" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 2h-15A2.5 2.5 0 002 4.5v15A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0019.5 2zM8.16 17.34L4.82 14l1.06-1.06 2.28 2.28 5.66-5.66 1.06 1.06-6.72 6.72z"></path></svg>`}
                    ${buttonText}
                </button>
            </div>
            <div id="migration-status-gdrive-${course.id}" class="text-xs mt-2 text-gray-600 dark:text-gray-400"></div> <!-- RENAMED_ID_PATTERN -->
            <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-xs space-y-1">
                <p><strong>Root:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline gdrive-link-span" data-id="${course.gdriveCourseRootFolderId || ''}" data-weblink="${course.gdriveCourseRootWebLink || ''}" title="Explore Root Folder (Google Drive)">${course.gdriveCourseRootWebLink || course.gdriveCourseRootFolderId || 'Not Set'}</span></p> <!-- RENAMED_CLASS, data-id, data-weblink -->
                <p><strong>Transcripts:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline gdrive-link-span" data-id="${course.gdriveTranscriptionsFolderId || ''}" data-weblink="${course.gdriveTranscriptionsFolderWebLink || ''}" title="Explore Transcripts (Google Drive)">${course.gdriveTranscriptionsFolderWebLink || course.gdriveTranscriptionsFolderId || 'Not Set'}</span></p>
                <p><strong>Textbook PDFs:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline gdrive-link-span" data-id="${course.gdrivePdfFolderId || ''}" data-weblink="${course.gdrivePdfFolderWebLink || ''}" title="Explore Textbook PDFs (Google Drive)">${course.gdrivePdfFolderWebLink || course.gdrivePdfFolderId || 'Not Set'}</span></p>
                <p><strong>Generated Qs:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline gdrive-link-span" data-id="${course.gdriveMcqFolderId || ''}" data-weblink="${course.gdriveMcqFolderWebLink || ''}" title="Explore Generated Questions (Google Drive)">${course.gdriveMcqFolderWebLink || course.gdriveMcqFolderId || 'Not Set'}</span></p>
            </div>
        `;
        listContainer.appendChild(courseElement);
    });

    document.querySelectorAll('.migrate-explore-gdrive-btn').forEach(button => { // RENAMED_CLASS
        button.disabled = (button.dataset.isMigrated === 'true' && !button.dataset.rootWeblink);
        button.addEventListener('click', (e) => {
            const courseId = e.currentTarget.dataset.courseId;
            const isMigrated = e.currentTarget.dataset.isMigrated === 'true';
            const rootId = e.currentTarget.dataset.rootId; // Use ID for internal ops
            const rootWeblink = e.currentTarget.dataset.rootWeblink; // Use weblink for UI explore
            if (isMigrated) {
                if (rootId) { // Prefer ID for consistency if explorer can use it
                    displayGoogleDriveFileExplorer(document.getElementById('gdrive-file-explorer-dynamic-container'), rootId); // RENAMED_FUNCTION_CALL & ID
                } else if (rootWeblink) { // Fallback for just opening link if explorer needs ID primarily
                     window.open(rootWeblink, '_blank');
                     alert('Opening Google Drive folder in new tab. Explorer interaction requires Folder ID.');
                } else {
                    alert('Course vault ID/link uncharted. Re-migration might be needed.'); // RENAMED_TEXT
                }
            } else {
                startGoogleDriveMigration(courseId); // RENAMED_FUNCTION_CALL
            }
        });
    });
    document.querySelectorAll('.gdrive-link-span').forEach(span => { // RENAMED_CLASS
        span.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const webLink = e.currentTarget.dataset.weblink;
            if (id && id !== 'Not Set') {
                displayGoogleDriveFileExplorer(document.getElementById('gdrive-file-explorer-dynamic-container'), id); // RENAMED_FUNCTION_CALL & ID
            } else if (webLink && webLink !== 'Not Set') {
                window.open(webLink, '_blank');
                alert("Opening Google Drive item in new tab. Full explorer interaction works best with Folder IDs.");
            }
        });
    });

    if (unmigratedCoursesCount > 0) {
        gamifiedAlertContainer.innerHTML = `
            <div class="p-4 mb-4 text-sm text-blue-700 bg-blue-100 rounded-lg dark:bg-blue-200 dark:text-blue-800 flex items-center" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 2h-15A2.5 2.5 0 002 4.5v15A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0019.5 2zM8.16 17.34L4.82 14l1.06-1.06 2.28 2.28 5.66-5.66 1.06 1.06-6.72 6.72z"></path></svg> <!-- Google Drive Icon -->
                <span class="font-medium">Action Required:</span> ${unmigratedCoursesCount} course(s) are pending migration to Google Drive. Start migration for unparalleled access and durability! <!-- RENAMED_TEXT -->
            </div>
        `;
    }
    hideLoading();
}

export async function startGoogleDriveMigration(courseId) { // RENAMED_FUNCTION
    if (!currentUser || !currentUser.isAdmin) {
        alert("Access Denied. Admin privileges required."); return;
    }
    const statusContainer = document.getElementById(`migration-status-gdrive-${courseId}`); // RENAMED_ID_PATTERN
    const migrateButton = document.getElementById(`migrate-gdrive-btn-${courseId}`); // RENAMED_ID_PATTERN

    try {
        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Connecting to Google Drive...</p>`; // RENAMED_TEXT
        if (migrateButton) migrateButton.disabled = true;

        await gDriveInitialize(); // Ensure Google Drive service is ready
        console.log("[Migration] Google Drive service initialized."); // RENAMED_TEXT

        const course = globalCourseDataMap.get(courseId);
        if (!course) throw new Error(`Course data for ID ${courseId} not found.`);

        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Preparing ${course.name} for Google Drive migration...</p>`; // RENAMED_TEXT

        const lyceumRootFolderName = "Lyceum_Courses_GoogleDrive"; // Specific name for GDrive
        const courseFolderName = course.courseDirName || `course_${course.id.replace(/\s+/g, '_')}`;
        const transcriptionsFolderName = "Transcriptions_Archive";
        const textbookPdfsFolderName = "Textbook_Chapter_Vault";
        const generatedQuestionsFolderName = "Generated_Assessments";

        // Google Drive uses 'root' as the default parentId if none is specified to findFolder/createFolder
        let lyceumRootNode = await gDriveFindFolder(lyceumRootFolderName, 'root');
        if (!lyceumRootNode) lyceumRootNode = await gDriveCreateFolder(lyceumRootFolderName, 'root');
        if (!lyceumRootNode || !lyceumRootNode.id) throw new Error(`Failed to create Lyceum root folder in Google Drive: ${lyceumRootFolderName}`);

        let courseMainNode = await gDriveFindFolder(courseFolderName, lyceumRootNode.id);
        if (!courseMainNode) courseMainNode = await gDriveCreateFolder(courseFolderName, lyceumRootNode.id);
        if (!courseMainNode || !courseMainNode.id) throw new Error(`Failed to create course folder in Google Drive: ${courseFolderName}`);
        const courseRootFolderId = courseMainNode.id;
        const courseRootWebLink = courseMainNode.webViewLink; // Store webViewLink for UI

        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Course folder created. Creating standard folders in Google Drive...</p>`; // RENAMED_TEXT
        const placeholderContent = `This data module was established during automated course deployment to Google Drive on ${new Date().toISOString()}.\nAll relevant data for this category will be archived here.`;
        const placeholderFileName = "README_GDrive_Archive_Log.txt";

        const createAndUploadPlaceholderGDrive = async (folderName, parentId) => {
            let node = await gDriveFindFolder(folderName, parentId);
            if (!node) node = await gDriveCreateFolder(folderName, parentId);
            if (!node || !node.id) throw new Error(`Failed to deploy module to Google Drive: ${folderName}`);
            const placeholderFile = await createPlaceholderFile(placeholderFileName, placeholderContent); // File object
            await gDriveUploadFile(placeholderFile, placeholderFileName, node.id);
            return { id: node.id, webLink: node.webViewLink }; // Return ID and webViewLink
        };

        const transcriptionsFolderInfo = await createAndUploadPlaceholderGDrive(transcriptionsFolderName, courseMainNode.id);
        const pdfsFolderInfo = await createAndUploadPlaceholderGDrive(textbookPdfsFolderName, courseMainNode.id);
        const mcqsFolderInfo = await createAndUploadPlaceholderGDrive(generatedQuestionsFolderName, courseMainNode.id);

        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Standard folders created. Updating database...</p>`;
        const updates = {
            gdriveCourseRootFolderId: courseRootFolderId,
            gdriveCourseRootWebLink: courseRootWebLink,
            gdriveTranscriptionsFolderId: transcriptionsFolderInfo.id,
            gdriveTranscriptionsFolderWebLink: transcriptionsFolderInfo.webLink,
            gdrivePdfFolderId: pdfsFolderInfo.id,
            gdrivePdfFolderWebLink: pdfsFolderInfo.webLink,
            gdriveMcqFolderId: mcqsFolderInfo.id,
            gdriveMcqFolderWebLink: mcqsFolderInfo.webLink,
        };
        const success = await updateCourseDefinition(courseId, updates);

        if (success) {
            const updatedCourseData = { ...globalCourseDataMap.get(courseId), ...updates };
            globalCourseDataMap.set(courseId, updatedCourseData);
            if (statusContainer) statusContainer.innerHTML = `<p class="text-green-600 dark:text-green-400">Migration Complete: Course '${course.name}' successfully migrated to Google Drive.</p>`; // RENAMED_TEXT
            loadCoursesForGoogleDriveMigration(); // RENAMED_FUNCTION_CALL
        } else {
            throw new Error("Failed to update database (Firestore course definition for Google Drive)."); // RENAMED_TEXT
        }
    } catch (error) {
        console.error(`[Migration - Google Drive] Error for course ${courseId}:`, error); // RENAMED_TEXT
        if (statusContainer) statusContainer.innerHTML = `<p class="text-red-600 dark:text-red-400">Google Drive Migration Failed: ${error.message}</p>`; // RENAMED_TEXT
        if (migrateButton) migrateButton.disabled = false;
        alert(`Google Drive Migration for course ${courseId} failed: ${error.message}`); // RENAMED_TEXT
    }
}

// --- Google Drive File Explorer ---
let currentGoogleDriveExplorerPath = []; // RENAMED_VARIABLE
let currentGoogleDriveExplorerFolderId = 'root'; // RENAMED_VARIABLE, uses folder ID, 'root' for GDrive root

export async function handleGoogleDriveFileDownload(fileId, fileName) { // RENAMED_FUNCTION, takes ID and name
    if (!fileId) { alert("File ID unavailable. Cannot start download."); return; }
    console.log(`[Explorer] Initiating Google Drive download for: ${fileName} (ID: ${fileId})`); // RENAMED_TEXT
    showLoading(`Preparing ${fileName} for download from Google Drive...`); // RENAMED_TEXT
    try {
        await gDriveInitialize(); // Ensure service is ready
        await gDriveDownloadFile(fileId, fileName); // gDriveDownloadFile from service handles Blob creation and download trigger
        // Alert is now inside gDriveDownloadFile or can be added here upon successful promise resolution
        // For now, assume gDriveDownloadFile gives user feedback.
    } catch (error) {
        console.error(`[Explorer] Google Drive download failed for ${fileName}:`, error); // RENAMED_TEXT
        alert(`Google Drive download error for "${fileName}": ${error.message}`); // RENAMED_TEXT
    } finally {
        hideLoading();
    }
}

export async function handleGoogleDriveFileUpload(event) { // RENAMED_FUNCTION
    const fileInput = event.target;
    const file = fileInput.files[0];
    if (!file) { alert("No file selected for upload."); return; }
    if (!currentGoogleDriveExplorerFolderId) {
        alert("Target Google Drive folder not specified. Transmission aborted."); return; // RENAMED_TEXT
    }

    console.log(`[Explorer] Uploading file "${file.name}" to Google Drive folder ID "${currentGoogleDriveExplorerFolderId}"`); // RENAMED_TEXT
    showLoading(`Uploading ${file.name} to Google Drive...`); // RENAMED_TEXT
    const feedbackEl = document.getElementById('gdrive-explorer-feedback'); // RENAMED_ID
    if (feedbackEl) feedbackEl.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Uploading ${file.name} to current Google Drive folder...</p>`; // RENAMED_TEXT

    try {
        await gDriveInitialize(); // Ensure service is ready
        const uploadedFile = await gDriveUploadFile(file, file.name, currentGoogleDriveExplorerFolderId);
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-green-600 dark:text-green-400">File "${uploadedFile.name}" successfully uploaded to Google Drive.</p>`; // RENAMED_TEXT
        console.log(`[Explorer] Google Drive Upload complete:`, uploadedFile); // RENAMED_TEXT

        // Refresh current folder view
        renderGoogleDriveFolderContents(currentGoogleDriveExplorerFolderId); // RENAMED_FUNCTION_CALL with ID
    } catch (error) {
        console.error(`[Explorer] Google Drive Upload error:`, error); // RENAMED_TEXT
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600 dark:text-red-400">Google Drive Upload error: ${error.message}</p>`; // RENAMED_TEXT
        alert(`File upload to Google Drive failed: ${error.message}`); // RENAMED_TEXT
    } finally {
        hideLoading();
        fileInput.value = null;
    }
}

async function renderGoogleDriveFolderContents(folderId = 'root', newPathSegment = null) { // RENAMED_FUNCTION, takes folder ID
    const fileListDiv = document.getElementById('gdrive-file-list'); // RENAMED_ID
    const currentPathDiv = document.getElementById('gdrive-current-path'); // RENAMED_ID
    const parentFolderButton = document.getElementById('gdrive-parent-folder-btn'); // RENAMED_ID
    const feedbackEl = document.getElementById('gdrive-explorer-feedback'); // RENAMED_ID
    const uploadSection = document.getElementById('gdrive-upload-section'); // RENAMED_ID

    if (!fileListDiv || !currentPathDiv || !parentFolderButton || !uploadSection) {
        console.error("[Explorer] Core Google Drive navigation or display modules are offline."); return; // RENAMED_TEXT
    }

    fileListDiv.innerHTML = `<p class="text-gray-500 dark:text-gray-400 p-3"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Loading Google Drive folder contents...</p>`; // RENAMED_TEXT
    showLoading("Loading Google Drive folder contents..."); // RENAMED_TEXT

    try {
        await gDriveInitialize(); // Ensure service is ready
        currentGoogleDriveExplorerFolderId = folderId;
        const contents = await gDriveGetFolderContents(folderId); // Uses ID

        // Path Management for Google Drive
        if (newPathSegment) { // A new segment means we navigated deeper
            currentGoogleDriveExplorerPath.push(newPathSegment);
        } else if (folderId === 'root') { // Navigated to root
            currentGoogleDriveExplorerPath = [{ name: 'Google Drive Root', id: 'root' }];
        }
        // If navigating up (handled by navigateToGoogleDriveParentFolder), path is adjusted before calling this.

        currentPathDiv.innerHTML = currentGoogleDriveExplorerPath.map((p, index) =>
            `<span class="text-primary-600 dark:text-primary-400 cursor-pointer hover:underline gdrive-path-segment-btn" data-path-index="${index}">${p.name}</span>` // RENAMED_CLASS
        ).join('<span class="mx-1 text-gray-400">/</span>');

        document.querySelectorAll('.gdrive-path-segment-btn').forEach(btn => { // RENAMED_CLASS
            btn.addEventListener('click', (e) => navigateToGoogleDrivePathIndex(parseInt(e.currentTarget.dataset.pathIndex))); // RENAMED_FUNCTION_CALL
        });

        parentFolderButton.classList.toggle('hidden', currentGoogleDriveExplorerPath.length <= 1 && folderId === 'root');
        parentFolderButton.onclick = null;
        parentFolderButton.addEventListener('click', navigateToGoogleDriveParentFolder); // RENAMED_FUNCTION_CALL

        if (contents.length === 0) {
            fileListDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-3 italic">Google Drive folder is empty.</p>'; // RENAMED_TEXT
        } else {
            fileListDiv.innerHTML = `<ul class="divide-y divide-gray-200 dark:divide-gray-700">
                ${contents.map(item => `
                    <li class="py-3 px-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md group">
                        <div class="flex items-center min-w-0">
                            <img src="${item.iconLink || (item.type === 'folder' ? './assets/images/branding/google-drive-folder-icon.png' : './assets/images/branding/google-drive-file-icon.png')}" class="h-6 w-6 mr-3 flex-shrink-0" alt="${item.type} icon"> <!-- Using iconLink from GDrive -->
                            <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-primary-600" title="${item.name}">${item.name}</span>
                        </div>
                        <div class="flex items-center space-x-2 ml-2">
                            <span class="text-xs text-gray-500 dark:text-gray-400">${item.size !== undefined ? (item.size / 1024).toFixed(2) + ' KB' : (item.type === 'folder' ? '--' : 'N/A')}</span> <!-- GDrive folders don't have size -->
                            ${item.type === 'folder'
                                ? `<button class="btn-secondary-xs gdrive-open-folder-btn" data-id="${item.id}" data-name="${item.name}">Open Folder</button>` // RENAMED_CLASS, data-id
                                : `<button class="btn-secondary-xs gdrive-download-file-btn" data-id="${item.id}" data-name="${item.name}">Download</button>`} <!-- RENAMED_CLASS, data-id -->
                            <a href="${item.link || '#'}" target="_blank" class="btn-link-xs ${!item.link ? 'disabled-link' : ''}" title="Open in Google Drive (New Tab)">View</a> <!-- RENAMED_TEXT -->
                        </div>
                    </li>
                `).join('')}</ul>`;

            document.querySelectorAll('.gdrive-open-folder-btn').forEach(btn => btn.addEventListener('click', (e) => { // RENAMED_CLASS
                const targetFolderId = e.currentTarget.dataset.id;
                const targetFolderName = e.currentTarget.dataset.name;
                // For path update: pass the new segment info
                renderGoogleDriveFolderContents(targetFolderId, { name: targetFolderName, id: targetFolderId }); // RENAMED_FUNCTION_CALL
            }));
            document.querySelectorAll('.gdrive-download-file-btn').forEach(btn => btn.addEventListener('click', (e) => handleGoogleDriveFileDownload(e.currentTarget.dataset.id, e.currentTarget.dataset.name))); // RENAMED_FUNCTION_CALL
        }

        const fileUploadInput = document.getElementById('gdrive-file-upload-input'); // RENAMED_ID
        const uploadButton = document.getElementById('gdrive-upload-button'); // RENAMED_ID
        uploadButton.onclick = null;
        uploadButton.addEventListener('click', () => handleGoogleDriveFileUpload({ target: fileUploadInput })); // RENAMED_FUNCTION_CALL

        uploadSection.classList.remove('hidden');
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-green-600 dark:text-green-400">Loaded contents of "${currentGoogleDriveExplorerPath[currentGoogleDriveExplorerPath.length-1].name}".</p>`; // RENAMED_TEXT
    } catch (error) {
        console.error("[Explorer] Error rendering Google Drive folder contents:", error); // RENAMED_TEXT
        fileListDiv.innerHTML = `<p class="text-red-600 dark:text-red-400 p-3">Error loading Google Drive folder contents: ${error.message}. OAuth might be required for private folders.</p>`; // RENAMED_TEXT
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600 dark:text-red-400">Error: ${error.message}</p>`;
    } finally {
        hideLoading();
    }
}

// This function now primarily uses folder IDs. "Link" might refer to webViewLink for opening, but navigation is ID based.
export async function loadGoogleDriveFolderById(folderId = 'root', folderName = 'Google Drive Root') { // RENAMED_FUNCTION, takes ID
    const feedbackEl = document.getElementById('gdrive-explorer-feedback'); // RENAMED_ID
    try {
        await gDriveInitialize(); // Ensure service is ready
        console.log(`[Explorer] Loading Google Drive folder ID: ${folderId}`); // RENAMED_TEXT
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Loading folder...</p>`;

        // Path adjustment logic
        const existingPathIndex = currentGoogleDriveExplorerPath.findIndex(p => p.id === folderId);
        if (existingPathIndex !== -1) {
            currentGoogleDriveExplorerPath = currentGoogleDriveExplorerPath.slice(0, existingPathIndex + 1);
        } else {
             // If it's not 'root' and not found, it's a new navigation deeper or explicit jump.
             // renderGoogleDriveFolderContents will add it if newPathSegment is passed.
             // If folderId is 'root', renderGoogleDriveFolderContents handles it.
        }
        const newPathSegment = (folderId !== 'root') ? { name: folderName, id: folderId } : null;
        renderGoogleDriveFolderContents(folderId, newPathSegment); // RENAMED_FUNCTION_CALL
    } catch (error) {
        console.error(`[Explorer] Error loading Google Drive folder ID ${folderId}:`, error); // RENAMED_TEXT
        if(feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600 dark:text-red-400">Navigation failed: ${error.message}</p>`;
        alert(`Error loading Google Drive folder: ${error.message}`); // RENAMED_TEXT
        document.getElementById('gdrive-file-list').innerHTML = `<p class="text-red-600 dark:text-red-400 p-3">Error loading folder: ${error.message}</p>`;
    }
}

export function navigateToGoogleDrivePathIndex(index) { // RENAMED_FUNCTION
    if (index < 0 || index >= currentGoogleDriveExplorerPath.length) {
        console.warn("[Explorer] Invalid Google Drive path index:", index); return; // RENAMED_TEXT
    }
    const { id, name } = currentGoogleDriveExplorerPath[index];
    currentGoogleDriveExplorerPath = currentGoogleDriveExplorerPath.slice(0, index); // Slice before, render will add current
    loadGoogleDriveFolderById(id, name); // RENAMED_FUNCTION_CALL
}

export function navigateToGoogleDriveParentFolder() { // RENAMED_FUNCTION
    if (currentGoogleDriveExplorerPath.length > 1) {
        currentGoogleDriveExplorerPath.pop(); // Remove current
        const parent = currentGoogleDriveExplorerPath[currentGoogleDriveExplorerPath.length -1]; // Get new current (parent)
        if (parent && parent.id) {
            // No new segment, as we are moving up. render will use the existing path end.
            renderGoogleDriveFolderContents(parent.id); // RENAMED_FUNCTION_CALL
        } else { // Should ideally not happen if path starts with root
            console.warn("[Explorer] Google Drive parent folder has no ID. Defaulting to Root."); // RENAMED_TEXT
            loadGoogleDriveFolderById('root', 'Google Drive Root'); // RENAMED_FUNCTION_CALL
        }
    } else {
        console.log("[Explorer] At Google Drive Root or cannot go further up. Loading Root."); // RENAMED_TEXT
        loadGoogleDriveFolderById('root', 'Google Drive Root'); // RENAMED_FUNCTION_CALL
    }
}

export function displayGoogleDriveFileExplorer(containerElement, initialFolderId = 'root') { // RENAMED_FUNCTION, initialFolderId
    containerElement.innerHTML = `
        <div class="content-card p-6 mt-6">
            <h3 class="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 2h-15A2.5 2.5 0 002 4.5v15A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0019.5 2zM8.16 17.34L4.82 14l1.06-1.06 2.28 2.28 5.66-5.66 1.06 1.06-6.72 6.72z"></path></svg> <!-- Google Drive Icon -->
                Google Drive File Explorer <!-- RENAMED_TEXT -->
            </h3>
            <div class="space-y-4">
                <div>
                    <label for="gdrive-folder-id-input" class="label">Google Drive Folder ID (or leave blank for root):</label> <!-- RENAMED_TEXT & ID -->
                    <div class="flex space-x-2 mt-1">
                        <input type="text" id="gdrive-folder-id-input" class="input-field flex-grow" placeholder="Enter Google Drive Folder ID or leave blank for root" value="${initialFolderId === 'root' ? '' : initialFolderId}"> <!-- RENAMED_ID & placeholder -->
                        <button id="load-gdrive-folder-btn" class="btn-primary flex items-center"> <!-- RENAMED_ID -->
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> <!-- Search Icon -->
                            Load Folder
                        </button>
                    </div>
                </div>
                <div class="flex items-center justify-between py-2">
                    <button id="gdrive-parent-folder-btn" class="btn-secondary-small hidden flex items-center"> <!-- RENAMED_ID -->
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10v10a2 2 0 002 2h14a2 2 0 002-2V10M3 10l9-9 9 9m-9 9v-4"></path></svg> <!-- Home/Up Icon -->
                        Parent Folder
                    </button>
                    <div id="gdrive-current-path" class="text-sm text-gray-500 dark:text-gray-400 truncate flex-grow ml-2">Current Path: /</div> <!-- RENAMED_ID -->
                </div>
                <div id="gdrive-file-list" class="min-h-[200px] max-h-[450px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-gray-50 dark:bg-gray-700/50 shadow-inner"> <!-- RENAMED_ID -->
                    <p class="text-gray-500 dark:text-gray-400 p-3">Enter a Google Drive Folder ID or initialize service to browse files.</p> <!-- RENAMED_TEXT -->
                </div>
                <div id="gdrive-upload-section" class="pt-4 border-t border-gray-200 dark:border-gray-600 hidden"> <!-- RENAMED_ID -->
                    <label for="gdrive-file-upload-input" class="label mb-1">Upload File to Current Google Drive Folder:</label> <!-- RENAMED_TEXT & ID -->
                    <div class="flex space-x-2">
                        <input type="file" id="gdrive-file-upload-input" class="input-field file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 dark:file:bg-primary-700 file:text-primary-700 dark:file:text-primary-100 hover:file:bg-primary-100 dark:hover:file:bg-primary-600 flex-grow"> <!-- RENAMED_ID -->
                        <button id="gdrive-upload-button" class="btn-primary-small flex items-center"> <!-- RENAMED_ID -->
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg> <!-- Upload Icon -->
                            Upload
                        </button>
                    </div>
                </div>
                <div id="gdrive-explorer-feedback" class="text-xs text-gray-500 dark:text-gray-400 mt-2 min-h-[20px]"></div> <!-- RENAMED_ID -->
            </div>
        </div>`;

    document.getElementById('load-gdrive-folder-btn').addEventListener('click', () => { // RENAMED_ID
        const folderId = document.getElementById('gdrive-folder-id-input').value.trim(); // RENAMED_ID
        // Reset path for new explicit load, render will build it starting with root or the new folder
        currentGoogleDriveExplorerPath = [];
        loadGoogleDriveFolderById(folderId || 'root', folderId ? 'Custom Folder' : 'Google Drive Root'); // RENAMED_FUNCTION_CALL - provide a name for custom folder if ID is given
    });

    const uploadInput = document.getElementById('gdrive-file-upload-input'); // RENAMED_ID
    document.getElementById('gdrive-upload-button').addEventListener('click', () => { // RENAMED_ID
         handleGoogleDriveFileUpload({ target: uploadInput }); // RENAMED_FUNCTION_CALL
    });

    // Initialize the view
    currentGoogleDriveExplorerPath = []; // Reset path
    loadGoogleDriveFolderById(initialFolderId, initialFolderId === 'root' ? 'Google Drive Root' : 'Initial Folder'); // RENAMED_FUNCTION_CALL
}

// Note: The functions loadGoogleDriveFolderById, handleGoogleDriveFileDownload, navigateToGoogleDrivePathIndex,
// and navigateToGoogleDriveParentFolder are called by event listeners.
// Their export can be reviewed based on whether other modules call them.
// `admin_course_content.js` will import `displayGoogleDriveMigrationDashboard` and `displayGoogleDriveFileExplorer`.
