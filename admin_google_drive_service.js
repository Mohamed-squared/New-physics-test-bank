// admin_google_drive_service.js
import { globalCourseDataMap, currentUser } from './state.js';
import { showLoading, hideLoading } from './utils.js';
import { updateCourseDefinition } from './firebase_firestore.js';
import {
    initialize as gDriveInitialize,
    createFolder as gDriveCreateFolder,
    findFolder as gDriveFindFolder,
    uploadFile as gDriveUploadFile,
    downloadFile as gDriveDownloadFile,
    getFolderContents as gDriveGetFolderContents,
    requestUserToken as gDriveRequestUserToken // Import the new token function
} from './google_drive_service.js';

let isGoogleDriveAuthenticated = false; // Module-level flag

// Helper to create a placeholder file object (File) for client-side uploads
async function createPlaceholderFile(fileName, content) {
    console.log(`[Placeholder] Creating placeholder file object for: ${fileName}`);
    const blob = new Blob([content], { type: 'text/plain' });
    return new File([blob], fileName, { type: 'text/plain' });
}


// --- Google Drive Sign-In Handler ---
export async function handleGoogleDriveSignIn(postSignInAction) {
    const signInButton = document.getElementById('gdrive-signin-btn');
    const authStatusDiv = document.getElementById('gdrive-auth-status');

    if (signInButton) signInButton.disabled = true;
    if (authStatusDiv) authStatusDiv.innerHTML = `<p class="text-sm text-blue-500">Attempting to sign in...</p>`;

    try {
        await gDriveInitialize(); // Ensure GAPI/GIS scripts are loaded and client initialized
        await gDriveRequestUserToken(); // Request and set the token
        isGoogleDriveAuthenticated = true;
        console.log("Google Drive Sign-In successful.");
        if (authStatusDiv) authStatusDiv.innerHTML = `<p class="text-sm text-green-500">Successfully signed in to Google Drive.</p>`;
        if (signInButton) {
            signInButton.textContent = 'Signed In';
            signInButton.classList.remove('btn-primary');
            signInButton.classList.add('btn-success-outline', 'cursor-not-allowed');
        }
        // Enable UI elements that depend on auth
        const gDriveExplorerContainer = document.getElementById('gdrive-explorer-main-container');
        if (gDriveExplorerContainer) gDriveExplorerContainer.classList.remove('opacity-50', 'pointer-events-none');

        const migrationDashboardContainer = document.getElementById('gdrive-migration-main-container');
        if (migrationDashboardContainer) migrationDashboardContainer.classList.remove('opacity-50', 'pointer-events-none');


        if (typeof postSignInAction === 'function') {
            postSignInAction();
        }
    } catch (error) {
        console.error("Google Drive Sign-In failed:", error);
        isGoogleDriveAuthenticated = false;
        if (authStatusDiv) authStatusDiv.innerHTML = `<p class="text-sm text-red-500">Sign-in failed: ${error.message}. Please try again.</p>`;
        if (signInButton) signInButton.disabled = false;
    }
}


// --- Google Drive Migration Dashboard ---
export function displayGoogleDriveMigrationDashboard(containerElement) {
    if (!currentUser || !currentUser.isAdmin) {
        containerElement.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`;
        return;
    }

    // Initial HTML structure with Sign-In button
    containerElement.innerHTML = `
        <div class="content-card">
            <h2 class="text-2xl font-bold text-primary-700 dark:text-primary-300 mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 2h-15A2.5 2.5 0 002 4.5v15A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0019.5 2zM8.16 17.34L4.82 14l1.06-1.06 2.28 2.28 5.66-5.66 1.06 1.06-6.72 6.72z"></path></svg>
                Google Drive Cloud Management
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Oversee course migration to Google Drive and explore cloud-stored resources.</p>

            <div id="gdrive-auth-status-migration" class="mb-4"></div>
            <button id="gdrive-signin-btn-migration" class="btn-primary mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 inline" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM5.05 13.34a5.5 5.5 0 018.9 0H5.05zm9.9 0A5.5 5.5 0 006.05 7.66h7.9a5.5 5.5 0 011 5.68zM10 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" clip-rule="evenodd" /></svg>
                Sign in with Google Drive
            </button>

            <div id="gdrive-migration-main-container" class="${isGoogleDriveAuthenticated ? '' : 'opacity-50 pointer-events-none'}">
                <div id="gdrive-migration-gamified-alert" class="mb-6"></div>
                <div class="mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                    <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">Course Migration Status</h3>
                    <div class="flex justify-between items-center mb-4">
                        <p class="text-sm text-gray-500 dark:text-gray-400">Review courses and start their migration to Google Drive Cloud.</p>
                        <button id="load-courses-gdrive-migration-btn" class="btn-secondary-small flex items-center" title="Refresh course list and statuses">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                            Refresh List
                        </button>
                    </div>
                    <div id="gdrive-migration-course-list" class="space-y-4"><p class="text-gray-500 dark:text-gray-400">Sign in to load course statuses...</p></div>
                </div>
            </div>

            <hr class="my-8 border-gray-300 dark:border-gray-600">
            <div id="gdrive-file-explorer-dynamic-container"></div>
        </div>
    `;

    document.getElementById('gdrive-signin-btn-migration')?.addEventListener('click', async () => {
        await handleGoogleDriveSignIn(() => {
            loadCoursesForGoogleDriveMigration();
            // Also initialize the file explorer if it's part of this dashboard view
            const explorerContainer = document.getElementById('gdrive-file-explorer-dynamic-container');
            if (explorerContainer) {
                displayGoogleDriveFileExplorer(explorerContainer); // Load with default (root)
            }
        });
    });

    document.getElementById('load-courses-gdrive-migration-btn')?.addEventListener('click', loadCoursesForGoogleDriveMigration);

    if (isGoogleDriveAuthenticated) {
        loadCoursesForGoogleDriveMigration();
        const explorerContainer = document.getElementById('gdrive-file-explorer-dynamic-container');
        if (explorerContainer) {
            displayGoogleDriveFileExplorer(explorerContainer);
        }
    }
    // setupCourseAssetSelectionGoogleDrive(); // This might need its own auth trigger or be part of explorer
}


// ... (setupCourseAssetSelectionGoogleDrive - keep as is for now, might need auth integration later)
function setupCourseAssetSelectionGoogleDrive() {
    const loadButton = document.getElementById('load-gdrive-folder-for-assets-btn');
    const useAssetsButton = document.getElementById('use-selected-gdrive-assets-btn');
    const folderIdInput = document.getElementById('gdrive-course-assets-folder-id');
    const displayArea = document.getElementById('gdrive-course-assets-display-area');
    const feedbackArea = document.getElementById('gdrive-course-assets-feedback');

    if (!loadButton || !useAssetsButton || !folderIdInput || !displayArea || !feedbackArea) {
        console.warn("[CourseAssets] UI elements for Google Drive course asset selection are missing.");
        return;
    }

    loadButton.addEventListener('click', async () => {
        if (!isGoogleDriveAuthenticated) {
            feedbackArea.innerHTML = `<p class="text-red-500">Please sign in with Google Drive first.</p>`;
            return;
        }
        const folderId = folderIdInput.value.trim();
        if (!folderId) {
            feedbackArea.innerHTML = `<p class="text-red-500">Please provide a Google Drive Folder ID.</p>`;
            return;
        }
        feedbackArea.innerHTML = '';
        displayArea.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Loading folder contents...</p>';
        showLoading('Fetching Google Drive folder contents...');
        try {
            const contents = await gDriveGetFolderContents(folderId);
            // ... (rest of the rendering logic from existing code)
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
                displayArea.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Folder is empty or no contents found.</p>';
            }
            feedbackArea.innerHTML = `<p class="text-green-500">Folder loaded successfully. ${contents?.length || 0} items found.</p>`;
        } catch (error) {
            console.error('[CourseAssets] Error loading Google Drive folder for assets:', error);
            displayArea.innerHTML = `<p class="text-red-500">Error: ${error.message}.</p>`;
            feedbackArea.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
        } finally {
            hideLoading();
        }
    });
    // ... (rest of useAssetsButton listener from existing code)
     useAssetsButton.addEventListener('click', () => {
        const selectedAssets = [];
        const checkboxes = displayArea.querySelectorAll('input[name="gdrive-asset-select"]:checked');
        checkboxes.forEach(checkbox => {
            selectedAssets.push({
                id: checkbox.dataset.id, link: checkbox.dataset.link, name: checkbox.dataset.name,
                type: checkbox.dataset.type, size: checkbox.dataset.size
            });
        });
        if (selectedAssets.length === 0) {
            feedbackArea.innerHTML = `<p class="text-yellow-500">No assets selected.</p>`; return;
        }
        console.log("[CourseAssets] Selected Google Drive Assets:", selectedAssets);
        feedbackArea.innerHTML = `<p class="text-green-500">${selectedAssets.length} asset(s) selected. Integration pending.</p>`;
    });
}


export async function loadCoursesForGoogleDriveMigration() {
    if (!isGoogleDriveAuthenticated) {
        document.getElementById('gdrive-migration-course-list').innerHTML = `<p class="text-yellow-500">Please sign in with Google Drive to load course migration statuses.</p>`;
        return;
    }
    // ... (rest of the existing loadCoursesForGoogleDriveMigration logic)
    if (!currentUser || !currentUser.isAdmin) {
        console.warn("User is not admin, cannot load courses for Google Drive migration.");
        const listContainer = document.getElementById('gdrive-migration-course-list');
        if (listContainer) listContainer.innerHTML = `<div class="p-3 text-red-700 bg-red-100 rounded dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`;
        return;
    }
    const listContainer = document.getElementById('gdrive-migration-course-list');
    const gamifiedAlertContainer = document.getElementById('gdrive-migration-gamified-alert');
    if (!listContainer || !gamifiedAlertContainer) {
        console.error("Google Drive migration UI containers not found."); return;
    }
    showLoading("Surveying courses for Google Drive readiness...");
    listContainer.innerHTML = ''; gamifiedAlertContainer.innerHTML = '';
    if (globalCourseDataMap.size === 0) {
        listContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-3">No courses charted for exploration.</p>';
        hideLoading(); return;
    }
    let unmigratedCoursesCount = 0;
    globalCourseDataMap.forEach(course => {
        const courseElement = document.createElement('div');
        courseElement.className = 'p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 shadow hover:shadow-md transition-shadow duration-200';
        const isFullyMigrated = course.gdriveTranscriptionsFolderId && course.gdrivePdfFolderId && course.gdriveMcqFolderId && course.gdriveCourseRootFolderId;
        let statusText = ""; let statusColorClass = "";
        if (isFullyMigrated) { statusText = `Fully Migrated to Google Drive`; statusColorClass = "text-green-600 dark:text-green-400"; }
        else if (course.gdriveTranscriptionsFolderId || course.gdrivePdfFolderId || course.gdriveMcqFolderId || course.gdriveTextbookFullPdfId || course.gdriveCourseRootFolderId) {
            statusText = `Partially Migrated to Google Drive`; statusColorClass = "text-yellow-600 dark:text-yellow-400"; unmigratedCoursesCount++;
        } else { statusText = `Not Migrated (Local Only)`; statusColorClass = "text-red-600 dark:text-red-400"; unmigratedCoursesCount++; }
        let buttonText = isFullyMigrated ? 'Explore Course Vault' : 'Start Migration';
        let buttonDisabled = isFullyMigrated && !course.gdriveCourseRootWebLink;
        courseElement.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div class="mb-2 sm:mb-0">
                    <h4 class="font-semibold text-lg text-gray-800 dark:text-gray-200">${course.name} <span class="text-xs text-gray-500">(ID: ${course.id})</span></h4>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Local Directory: ${course.courseDirName || 'N/A'}</p>
                    <p class="text-sm mt-1 font-medium ${statusColorClass}">${statusText}</p>
                </div>
                <button id="migrate-gdrive-btn-${course.id}" data-course-id="${course.id}" data-is-migrated="${isFullyMigrated}" data-root-id="${course.gdriveCourseRootFolderId || ''}" data-root-weblink="${course.gdriveCourseRootWebLink || ''}" class="${isFullyMigrated && course.gdriveCourseRootWebLink ? 'btn-secondary' : 'btn-primary'} whitespace-nowrap migrate-explore-gdrive-btn">
                    ${isFullyMigrated && course.gdriveCourseRootWebLink ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1 inline" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 2h-15A2.5 2.5 0 002 4.5v15A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0019.5 2zM8.16 17.34L4.82 14l1.06-1.06 2.28 2.28 5.66-5.66 1.06 1.06-6.72 6.72z"></path></svg>`}
                    ${buttonText}
                </button>
            </div>
            <div id="migration-status-gdrive-${course.id}" class="text-xs mt-2 text-gray-600 dark:text-gray-400"></div>
            <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-xs space-y-1">
                <p><strong>Root:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline gdrive-link-span" data-id="${course.gdriveCourseRootFolderId || ''}" data-weblink="${course.gdriveCourseRootWebLink || ''}" title="Explore Root Folder (Google Drive)">${course.gdriveCourseRootWebLink || course.gdriveCourseRootFolderId || 'Not Set'}</span></p>
                <p><strong>Transcripts:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline gdrive-link-span" data-id="${course.gdriveTranscriptionsFolderId || ''}" data-weblink="${course.gdriveTranscriptionsFolderWebLink || ''}" title="Explore Transcripts (Google Drive)">${course.gdriveTranscriptionsFolderWebLink || course.gdriveTranscriptionsFolderId || 'Not Set'}</span></p>
                <p><strong>Textbook PDFs:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline gdrive-link-span" data-id="${course.gdrivePdfFolderId || ''}" data-weblink="${course.gdrivePdfFolderWebLink || ''}" title="Explore Textbook PDFs (Google Drive)">${course.gdrivePdfFolderWebLink || course.gdrivePdfFolderId || 'Not Set'}</span></p>
                <p><strong>Generated Qs:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline gdrive-link-span" data-id="${course.gdriveMcqFolderId || ''}" data-weblink="${course.gdriveMcqFolderWebLink || ''}" title="Explore Generated Questions (Google Drive)">${course.gdriveMcqFolderWebLink || course.gdriveMcqFolderId || 'Not Set'}</span></p>
            </div>`;
        listContainer.appendChild(courseElement);
    });
    document.querySelectorAll('.migrate-explore-gdrive-btn').forEach(button => { /* existing listeners */
        button.disabled = (button.dataset.isMigrated === 'true' && !button.dataset.rootWeblink);
        button.addEventListener('click', (e) => {
            const courseId = e.currentTarget.dataset.courseId;
            const isMigrated = e.currentTarget.dataset.isMigrated === 'true';
            const rootId = e.currentTarget.dataset.rootId;
            const rootWeblink = e.currentTarget.dataset.rootWeblink;
            if (isMigrated) {
                if (rootId) displayGoogleDriveFileExplorer(document.getElementById('gdrive-file-explorer-dynamic-container'), rootId);
                else if (rootWeblink) { window.open(rootWeblink, '_blank'); alert('Opening Google Drive folder. Explorer needs Folder ID.'); }
                else alert('Course vault ID/link uncharted.');
            } else startGoogleDriveMigration(courseId);
        });
    });
    document.querySelectorAll('.gdrive-link-span').forEach(span => { /* existing listeners */
        span.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const webLink = e.currentTarget.dataset.weblink;
            if (id && id !== 'Not Set') displayGoogleDriveFileExplorer(document.getElementById('gdrive-file-explorer-dynamic-container'), id);
            else if (webLink && webLink !== 'Not Set') { window.open(webLink, '_blank'); alert("Opening item. Explorer needs Folder IDs.");}
        });
    });
    if (unmigratedCoursesCount > 0) { /* existing gamified alert */
        gamifiedAlertContainer.innerHTML = `
            <div class="p-4 mb-4 text-sm text-blue-700 bg-blue-100 rounded-lg dark:bg-blue-200 dark:text-blue-800 flex items-center" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 2h-15A2.5 2.5 0 002 4.5v15A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0019.5 2zM8.16 17.34L4.82 14l1.06-1.06 2.28 2.28 5.66-5.66 1.06 1.06-6.72 6.72z"></path></svg>
                <span class="font-medium">Action Required:</span> ${unmigratedCoursesCount} course(s) are pending migration to Google Drive. Start migration for unparalleled access and durability!
            </div>`;
    }
    hideLoading();
}

export async function startGoogleDriveMigration(courseId) {
    if (!isGoogleDriveAuthenticated) {
        alert("Please sign in with Google Drive first to start migration.");
        // Optionally, trigger sign-in flow here: await handleGoogleDriveSignIn(() => startGoogleDriveMigration(courseId));
        return;
    }
    // ... (rest of the existing startGoogleDriveMigration logic)
    // It already calls gDriveInitialize, findFolder, createFolder, uploadFile which now handle token requests
    const statusContainer = document.getElementById(`migration-status-gdrive-${courseId}`);
    const migrateButton = document.getElementById(`migrate-gdrive-btn-${courseId}`);
    try {
        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Connecting to Google Drive...</p>`;
        if (migrateButton) migrateButton.disabled = true;
        // await gDriveInitialize(); // This is now handled by requestUserToken if needed, or initial sign-in
        const course = globalCourseDataMap.get(courseId);
        if (!course) throw new Error(`Course data for ID ${courseId} not found.`);
        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Preparing ${course.name} for Google Drive migration...</p>`;
        const lyceumRootFolderName = "Lyceum_Courses_GoogleDrive";
        const courseFolderName = course.courseDirName || `course_${course.id.replace(/\s+/g, '_')}`;
        const transcriptionsFolderName = "Transcriptions_Archive";
        const textbookPdfsFolderName = "Textbook_Chapter_Vault";
        const generatedQuestionsFolderName = "Generated_Assessments";
        let lyceumRootNode = await gDriveFindFolder(lyceumRootFolderName, 'root');
        if (!lyceumRootNode) lyceumRootNode = await gDriveCreateFolder(lyceumRootFolderName, 'root');
        if (!lyceumRootNode || !lyceumRootNode.id) throw new Error(`Failed to create Lyceum root folder: ${lyceumRootFolderName}`);
        let courseMainNode = await gDriveFindFolder(courseFolderName, lyceumRootNode.id);
        if (!courseMainNode) courseMainNode = await gDriveCreateFolder(courseFolderName, lyceumRootNode.id);
        if (!courseMainNode || !courseMainNode.id) throw new Error(`Failed to create course folder: ${courseFolderName}`);
        const courseRootFolderId = courseMainNode.id; const courseRootWebLink = courseMainNode.webViewLink;
        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Standard folders being created...</p>`;
        const placeholderContent = `Established on ${new Date().toISOString()}.`; const placeholderFileName = "README_GDrive.txt";
        const createAndUploadPlaceholderGDrive = async (fName, pId) => { /* existing logic */
            let node = await gDriveFindFolder(fName, pId);
            if (!node) node = await gDriveCreateFolder(fName, pId);
            if (!node || !node.id) throw new Error(`Failed to deploy module: ${fName}`);
            const placeholderFile = await createPlaceholderFile(placeholderFileName, placeholderContent);
            await gDriveUploadFile(placeholderFile, placeholderFileName, node.id);
            return { id: node.id, webLink: node.webViewLink };
        };
        const transcriptionsFolderInfo = await createAndUploadPlaceholderGDrive(transcriptionsFolderName, courseMainNode.id);
        const pdfsFolderInfo = await createAndUploadPlaceholderGDrive(textbookPdfsFolderName, courseMainNode.id);
        const mcqsFolderInfo = await createAndUploadPlaceholderGDrive(generatedQuestionsFolderName, courseMainNode.id);
        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Updating database...</p>`;
        const updates = {
            gdriveCourseRootFolderId: courseRootFolderId, gdriveCourseRootWebLink: courseRootWebLink,
            gdriveTranscriptionsFolderId: transcriptionsFolderInfo.id, gdriveTranscriptionsFolderWebLink: transcriptionsFolderInfo.webLink,
            gdrivePdfFolderId: pdfsFolderInfo.id, gdrivePdfFolderWebLink: pdfsFolderInfo.webLink,
            gdriveMcqFolderId: mcqsFolderInfo.id, gdriveMcqFolderWebLink: mcqsFolderInfo.webLink,
        };
        const success = await updateCourseDefinition(courseId, updates);
        if (success) {
            const updatedCourseData = { ...globalCourseDataMap.get(courseId), ...updates };
            globalCourseDataMap.set(courseId, updatedCourseData);
            if (statusContainer) statusContainer.innerHTML = `<p class="text-green-600 dark:text-green-400">Migration Complete for '${course.name}'.</p>`;
            loadCoursesForGoogleDriveMigration();
        } else throw new Error("Failed to update Firestore.");
    } catch (error) {
        console.error(`[Migration - GDrive] Error for ${courseId}:`, error);
        if (statusContainer) statusContainer.innerHTML = `<p class="text-red-600 dark:text-red-400">Migration Failed: ${error.message}</p>`;
        if (migrateButton) migrateButton.disabled = false;
        alert(`Migration for ${courseId} failed: ${error.message}`);
    }
}

// --- Google Drive File Explorer ---
let currentGoogleDriveExplorerPath = [];
let currentGoogleDriveExplorerFolderId = 'root';

export async function handleGoogleDriveFileDownload(fileId, fileName) {
    if (!isGoogleDriveAuthenticated) { alert("Please sign in with Google Drive first."); return; }
    // ... (rest of the existing handleGoogleDriveFileDownload logic)
    // It already calls gDriveInitialize (implicitly via requestUserToken) and gDriveDownloadFile
    if (!fileId) { alert("File ID unavailable."); return; }
    showLoading(`Preparing ${fileName} for download...`);
    try {
        await gDriveDownloadFile(fileId, fileName);
    } catch (error) {
        alert(`Google Drive download error: ${error.message}`);
    } finally { hideLoading(); }
}

export async function handleGoogleDriveFileUpload(event) {
    if (!isGoogleDriveAuthenticated) { alert("Please sign in with Google Drive first."); return; }
    // ... (rest of the existing handleGoogleDriveFileUpload logic)
    // It already calls gDriveInitialize (implicitly via requestUserToken) and gDriveUploadFile
    const fileInput = event.target; const file = fileInput.files[0];
    if (!file) { alert("No file selected."); return; }
    if (!currentGoogleDriveExplorerFolderId) { alert("Target GDrive folder not specified."); return; }
    showLoading(`Uploading ${file.name} to Google Drive...`);
    const feedbackEl = document.getElementById('gdrive-explorer-feedback');
    if (feedbackEl) feedbackEl.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Uploading ${file.name}...</p>`;
    try {
        const uploadedFile = await gDriveUploadFile(file, file.name, currentGoogleDriveExplorerFolderId);
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-green-600 dark:text-green-400">File "${uploadedFile.name}" uploaded.</p>`;
        renderGoogleDriveFolderContents(currentGoogleDriveExplorerFolderId, currentGoogleDriveExplorerPath[currentGoogleDriveExplorerPath.length -1]);
    } catch (error) {
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600 dark:text-red-400">Upload error: ${error.message}</p>`;
        alert(`File upload failed: ${error.message}`);
    } finally { hideLoading(); fileInput.value = null; }
}

async function renderGoogleDriveFolderContents(folderId = 'root', currentPathSegmentForDisplay = null) {
    if (!isGoogleDriveAuthenticated && folderId !== 'auth_placeholder') { // Allow placeholder without auth
        document.getElementById('gdrive-file-list').innerHTML = `<p class="text-yellow-500 p-3">Please sign in with Google Drive to browse files.</p>`;
        document.getElementById('gdrive-upload-section').classList.add('hidden');
        return;
    }
    // ... (rest of the existing renderGoogleDriveFolderContents logic)
    // It calls gDriveInitialize (implicitly via requestUserToken) and gDriveGetFolderContents
    const fileListDiv = document.getElementById('gdrive-file-list');
    const currentPathDiv = document.getElementById('gdrive-current-path');
    const parentFolderButton = document.getElementById('gdrive-parent-folder-btn');
    const feedbackEl = document.getElementById('gdrive-explorer-feedback');
    const uploadSection = document.getElementById('gdrive-upload-section');
    if (!fileListDiv || !currentPathDiv || !parentFolderButton || !uploadSection) { console.error("Explorer UI elements missing."); return; }

    fileListDiv.innerHTML = `<p class="text-gray-500 p-3">Loading folder contents...</p>`;
    showLoading("Loading Google Drive folder...");
    try {
        currentGoogleDriveExplorerFolderId = folderId;
        const contents = await gDriveGetFolderContents(folderId);

        if (currentPathSegmentForDisplay) { // A new segment means we navigated deeper
             if (!currentGoogleDriveExplorerPath.find(p => p.id === currentPathSegmentForDisplay.id)) {
                currentGoogleDriveExplorerPath.push(currentPathSegmentForDisplay);
             }
        } else if (folderId === 'root') {
            currentGoogleDriveExplorerPath = [{ name: 'Google Drive Root', id: 'root' }];
        }

        currentPathDiv.innerHTML = currentGoogleDriveExplorerPath.map((p, index) =>
            `<span class="text-primary-600 dark:text-primary-400 cursor-pointer hover:underline gdrive-path-segment-btn" data-path-index="${index}">${p.name}</span>`
        ).join('<span class="mx-1 text-gray-400">/</span>');
        document.querySelectorAll('.gdrive-path-segment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => navigateToGoogleDrivePathIndex(parseInt(e.currentTarget.dataset.pathIndex)));
        });
        parentFolderButton.classList.toggle('hidden', currentGoogleDriveExplorerPath.length <= 1 && folderId === 'root');
        parentFolderButton.onclick = navigateToGoogleDriveParentFolder;

        if (contents.length === 0) fileListDiv.innerHTML = '<p class="text-gray-500 p-3 italic">Folder is empty.</p>';
        else { /* existing rendering logic for contents */
            fileListDiv.innerHTML = `<ul class="divide-y divide-gray-200 dark:divide-gray-700">
                ${contents.map(item => `
                    <li class="py-3 px-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md group">
                        <div class="flex items-center min-w-0">
                            <img src="${item.iconLink || './assets/images/branding/google-drive-file-icon.png'}" class="h-6 w-6 mr-3 flex-shrink-0" alt="${item.type} icon">
                            <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-primary-600" title="${item.name}">${item.name}</span>
                        </div>
                        <div class="flex items-center space-x-2 ml-2">
                            <span class="text-xs text-gray-500 dark:text-gray-400">${item.size ? (item.size / 1024).toFixed(2) + ' KB' : (item.type === 'folder' ? '--' : 'N/A')}</span>
                            ${item.type === 'folder'
                                ? `<button class="btn-secondary-xs gdrive-open-folder-btn" data-id="${item.id}" data-name="${item.name}">Open</button>`
                                : `<button class="btn-secondary-xs gdrive-download-file-btn" data-id="${item.id}" data-name="${item.name}">Download</button>`}
                            <a href="${item.link || '#'}" target="_blank" class="btn-link-xs ${!item.link ? 'disabled-link' : ''}" title="View on Drive">View</a>
                        </div>
                    </li>`).join('')}</ul>`;
            document.querySelectorAll('.gdrive-open-folder-btn').forEach(btn => btn.addEventListener('click', (e) => {
                const targetId = e.currentTarget.dataset.id; const targetName = e.currentTarget.dataset.name;
                renderGoogleDriveFolderContents(targetId, { name: targetName, id: targetId });
            }));
            document.querySelectorAll('.gdrive-download-file-btn').forEach(btn => btn.addEventListener('click', (e) => handleGoogleDriveFileDownload(e.currentTarget.dataset.id, e.currentTarget.dataset.name)));
        }
        uploadSection.classList.remove('hidden');
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-green-600 dark:text-green-400">Loaded: "${currentGoogleDriveExplorerPath[currentGoogleDriveExplorerPath.length-1].name}".</p>`;
    } catch (error) {
        console.error("[Explorer] Error rendering GDrive folder:", error);
        fileListDiv.innerHTML = `<p class="text-red-600 p-3">Error: ${error.message}. Sign in may be required.</p>`;
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600 dark:text-red-400">Error: ${error.message}</p>`;
    } finally { hideLoading(); }
}

export async function loadGoogleDriveFolderById(folderId = 'root', folderName = 'Google Drive Root') {
    if (!isGoogleDriveAuthenticated && folderId !== 'auth_placeholder') {
        document.getElementById('gdrive-explorer-feedback').innerHTML = `<p class="text-yellow-500">Please sign in to load Google Drive folders.</p>`;
        renderGoogleDriveFolderContents('auth_placeholder'); // Show placeholder content
        return;
    }
    // ... (rest of the existing loadGoogleDriveFolderById logic, ensuring newPathSegment is passed to render)
    const feedbackEl = document.getElementById('gdrive-explorer-feedback');
    try {
        // await gDriveInitialize(); // Handled by requestUserToken
        console.log(`[Explorer] Loading GDrive folder ID: ${folderId}`);
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-blue-600">Loading folder...</p>`;

        const existingPathIndex = currentGoogleDriveExplorerPath.findIndex(p => p.id === folderId);
        if (existingPathIndex !== -1) currentGoogleDriveExplorerPath = currentGoogleDriveExplorerPath.slice(0, existingPathIndex + 1);
        // else if (folderId !== 'root') currentGoogleDriveExplorerPath.push({name: folderName, id: folderId}); // Path segment added in render

        const newPathSegment = (folderId !== 'root' || currentGoogleDriveExplorerPath.length === 0) ? { name: folderName, id: folderId } : currentGoogleDriveExplorerPath[currentGoogleDriveExplorerPath.length -1] ;
        renderGoogleDriveFolderContents(folderId, newPathSegment);
    } catch (error) {
        console.error(`[Explorer] Error loading GDrive folder ID ${folderId}:`, error);
        if(feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600">Navigation failed: ${error.message}</p>`;
        document.getElementById('gdrive-file-list').innerHTML = `<p class="text-red-600 p-3">Error: ${error.message}</p>`;
    }
}

export function navigateToGoogleDrivePathIndex(index) {
    if (index < 0 || index >= currentGoogleDriveExplorerPath.length) { console.warn("Invalid path index"); return; }
    const { id, name } = currentGoogleDriveExplorerPath[index];
    currentGoogleDriveExplorerPath = currentGoogleDriveExplorerPath.slice(0, index); // Will be re-added by render
    loadGoogleDriveFolderById(id, name);
}

export function navigateToGoogleDriveParentFolder() {
    if (currentGoogleDriveExplorerPath.length > 1) {
        currentGoogleDriveExplorerPath.pop();
        const parent = currentGoogleDriveExplorerPath[currentGoogleDriveExplorerPath.length -1];
        if (parent && parent.id) loadGoogleDriveFolderById(parent.id, parent.name);
        else loadGoogleDriveFolderById('root', 'Google Drive Root');
    } else loadGoogleDriveFolderById('root', 'Google Drive Root');
}

export function displayGoogleDriveFileExplorer(containerElement, initialFolderId = 'root') {
    containerElement.innerHTML = `
        <div class="content-card p-6 mt-6">
            <h3 class="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 2h-15A2.5 2.5 0 002 4.5v15A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0019.5 2zM8.16 17.34L4.82 14l1.06-1.06 2.28 2.28 5.66-5.66 1.06 1.06-6.72 6.72z"></path></svg>
                Google Drive File Explorer
            </h3>
            <div id="gdrive-auth-status-explorer" class="mb-2"></div>
            <button id="gdrive-signin-btn-explorer" class="btn-primary mb-4 ${isGoogleDriveAuthenticated ? 'hidden' : ''}">Sign in with Google Drive to Use Explorer</button>

            <div id="gdrive-explorer-main-container" class="${isGoogleDriveAuthenticated ? '' : 'opacity-50 pointer-events-none'}">
                <div class="space-y-4">
                    <div>
                        <label for="gdrive-folder-id-input" class="label">Google Drive Folder ID (or leave blank for root):</label>
                        <div class="flex space-x-2 mt-1">
                            <input type="text" id="gdrive-folder-id-input" class="input-field flex-grow" placeholder="Enter Folder ID or leave blank for root" value="${initialFolderId === 'root' ? '' : initialFolderId}">
                            <button id="load-gdrive-folder-btn" class="btn-primary flex items-center">Load Folder</button>
                        </div>
                    </div>
                    <div class="flex items-center justify-between py-2">
                        <button id="gdrive-parent-folder-btn" class="btn-secondary-small hidden flex items-center">Parent Folder</button>
                        <div id="gdrive-current-path" class="text-sm text-gray-500 dark:text-gray-400 truncate flex-grow ml-2">Path: /</div>
                    </div>
                    <div id="gdrive-file-list" class="min-h-[150px] max-h-[300px] overflow-y-auto border dark:border-gray-600 rounded-md p-2 bg-gray-50 dark:bg-gray-700/50">
                        ${isGoogleDriveAuthenticated ? '<p class="text-gray-400 p-2">Load a folder to see contents.</p>' : '<p class="text-yellow-500 p-2">Sign in to browse files.</p>'}
                    </div>
                    <div id="gdrive-upload-section" class="${isGoogleDriveAuthenticated ? '' : 'hidden'} pt-4 border-t dark:border-gray-600">
                        <label for="gdrive-file-upload-input" class="label mb-1">Upload File to Current Folder:</label>
                        <div class="flex space-x-2">
                            <input type="file" id="gdrive-file-upload-input" class="input-field file-input flex-grow">
                            <button id="gdrive-upload-button" class="btn-primary-small">Upload</button>
                        </div>
                    </div>
                    <div id="gdrive-explorer-feedback" class="text-xs text-gray-500 dark:text-gray-400 mt-2 min-h-[20px]"></div>
                </div>
            </div>
        </div>`;

    const explorerSignInButton = document.getElementById('gdrive-signin-btn-explorer');
    if (explorerSignInButton) {
        explorerSignInButton.addEventListener('click', async () => {
            await handleGoogleDriveSignIn(() => {
                // Post-auth action for explorer: load initial/root folder
                const currentFolderIdInput = document.getElementById('gdrive-folder-id-input').value.trim();
                loadGoogleDriveFolderById(currentFolderIdInput || initialFolderId || 'root',
                                     currentFolderIdInput ? 'Custom Folder' : (initialFolderId === 'root' ? 'Google Drive Root' : 'Initial Folder'));
                explorerSignInButton.classList.add('hidden'); // Hide after successful sign-in
            });
        });
    }

    document.getElementById('load-gdrive-folder-btn').addEventListener('click', () => {
        if (!isGoogleDriveAuthenticated) { alert("Please sign in first."); return; }
        const folderId = document.getElementById('gdrive-folder-id-input').value.trim();
        currentGoogleDriveExplorerPath = [];
        loadGoogleDriveFolderById(folderId || 'root', folderId ? 'Custom Folder' : 'Google Drive Root');
    });

    const uploadInput = document.getElementById('gdrive-file-upload-input');
    document.getElementById('gdrive-upload-button').addEventListener('click', () => {
         if (!isGoogleDriveAuthenticated) { alert("Please sign in first."); return; }
         handleGoogleDriveFileUpload({ target: uploadInput });
    });

    if (isGoogleDriveAuthenticated) {
        currentGoogleDriveExplorerPath = [];
        loadGoogleDriveFolderById(initialFolderId, initialFolderId === 'root' ? 'Google Drive Root' : 'Initial Folder');
    } else {
        // Update UI to reflect that sign-in is needed
        document.getElementById('gdrive-explorer-feedback').innerHTML = '<p class="text-yellow-500">Please sign in to use the Google Drive File Explorer.</p>';
    }
}
// Ensure other exported functions like startGoogleDriveMigration also check isGoogleDriveAuthenticated
// or call handleGoogleDriveSignIn if direct user action is expected.
// For now, the primary gate is via the UI buttons in the dashboards.
