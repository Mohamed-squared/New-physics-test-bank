// admin_drive_service.js
import { globalCourseDataMap, currentUser } from './state.js';
import { showLoading, hideLoading } from './utils.js';
import { updateCourseDefinition } from './firebase_firestore.js';
// Assuming google_drive_service.js is an ES6 module and exports functions
import * as driveService from './google_drive_service.js';
// GOOGLE_DRIVE_API_KEY and GOOGLE_DRIVE_CLIENT_ID are assumed to be globally available
// e.g., from a <script> tag in index.html:
// <script>
//   window.GOOGLE_DRIVE_API_KEY = 'YOUR_API_KEY';
//   window.GOOGLE_DRIVE_CLIENT_ID = 'YOUR_CLIENT_ID';
// </script>


// Helper to create a placeholder file object (Blob) for client-side uploads
async function createPlaceholderFile(fileName, content) {
    console.log(`[Placeholder] Creating placeholder file object for: ${fileName}`);
    const blob = new Blob([content], { type: 'text/plain' });
    return {
        name: fileName,
        data: blob,
        size: blob.size,
        isPlaceholder: true
    };
}

// --- Google Drive Migration Dashboard ---
export function displayDriveMigrationDashboard(containerElement) {
    if (!currentUser || !currentUser.isAdmin) {
        containerElement.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`;
        return;
    }

    // Placeholder for Google Sign-In Button and Status
    const authUi = `
        <div id="google-auth-container" class="mb-4 p-3 border rounded-lg bg-gray-50 dark:bg-gray-700">
            <button id="google-signin-btn" class="btn-primary">Sign In with Google</button>
            <button id="google-signout-btn" class="btn-secondary hidden">Sign Out</button>
            <p id="google-auth-status" class="text-sm text-gray-600 dark:text-gray-400 mt-2">Status: Not Signed In</p>
        </div>
    `;

    containerElement.innerHTML = `
        <div class="content-card">
            ${authUi}
            <h2 class="text-2xl font-bold text-primary-700 dark:text-primary-300 mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 24 24"> <!-- Google Drive Icon -->
                    <path d="M19.52 6.022A7.99 7.99 0 0012.015 0a7.99 7.99 0 00-7.504 6.022H19.52zM4.511 6.522L0 14.015l3.008 5.21h4.496V6.522H4.51zM8.254 19.725l-3.008-5.21L8.254 9.35v10.375zm.75 0h6v-7.5h-6v7.5zm6.75 0L24 14.015l-3.008-5.21H15.754v10.375zM15 11.725V6.522h-4.496L15 11.725z"/>
                </svg>
                Google Drive Cloud Management
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Oversee course migration to Google Drive and explore cloud-stored resources.</p>

            <div id="drive-migration-gamified-alert" class="mb-6"></div>

            <div class="mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">Course Migration Status</h3>
                <div class="flex justify-between items-center mb-4">
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        Review courses and start their migration to Google Drive Cloud.
                    </p>
                    <button
                        id="load-courses-drive-migration-btn"
                        class="btn-secondary-small flex items-center"
                        title="Refresh course list and statuses">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                        Refresh List
                    </button>
                </div>
                <div id="drive-migration-course-list" class="space-y-4">
                    <p class="text-gray-500 dark:text-gray-400">Loading course statuses...</p>
                </div>
            </div>

            <hr class="my-8 border-gray-300 dark:border-gray-600">

            <div id="drive-file-explorer-dynamic-container">
                <!-- Google Drive File Explorer will be rendered here by displayDriveFileExplorer -->
            </div>
        </div>
    `;

    // Initialize Drive Service and Auth listeners
    if (window.GOOGLE_DRIVE_API_KEY && window.GOOGLE_DRIVE_CLIENT_ID) {
        driveService.initialize(window.GOOGLE_DRIVE_API_KEY, window.GOOGLE_DRIVE_CLIENT_ID)
            .then(() => {
                console.log("Google Drive Service initialized for Admin Dashboard.");
                updateAuthStatus();
                document.getElementById('google-signin-btn')?.addEventListener('click', handleSignIn);
                document.getElementById('google-signout-btn')?.addEventListener('click', handleSignOut);

                // Load components that depend on initialized driveService
                document.getElementById('load-courses-drive-migration-btn')?.addEventListener('click', loadCoursesForDriveMigration);
                loadCoursesForDriveMigration();
                displayDriveFileExplorer(document.getElementById('drive-file-explorer-dynamic-container'));
                setupDriveCourseAssetSelection(); // Renamed
            })
            .catch(error => {
                console.error("Error initializing Google Drive service for Admin:", error);
                const authStatusEl = document.getElementById('google-auth-status');
                if (authStatusEl) authStatusEl.textContent = `Error initializing Google Drive: ${error.message || 'Unknown error'}. Check console.`;
                // Disable Drive dependent UI elements
                 const loadCoursesBtn = document.getElementById('load-courses-drive-migration-btn');
                 if(loadCoursesBtn) loadCoursesBtn.disabled = true;

            });
    } else {
        console.error("Google Drive API Key or Client ID not found. Ensure they are globally available (e.g., window.GOOGLE_DRIVE_API_KEY).");
        const authStatusEl = document.getElementById('google-auth-status');
        if (authStatusEl) authStatusEl.textContent = "Configuration Error: Google Drive API Key or Client ID missing.";
        // Disable Drive dependent UI elements
        const loadCoursesBtn = document.getElementById('load-courses-drive-migration-btn');
        if(loadCoursesBtn) loadCoursesBtn.disabled = true;
    }
}

async function handleSignIn() {
    try {
        await driveService.signIn();
        updateAuthStatus();
    } catch (error) {
        console.error("Sign in error:", error);
        const authStatusEl = document.getElementById('google-auth-status');
        if (authStatusEl) authStatusEl.textContent = `Sign-In Failed: ${error.message || 'Unknown error'}`;
    }
}

async function handleSignOut() {
    try {
        await driveService.signOut();
        updateAuthStatus();
    } catch (error) {
        console.error("Sign out error:", error);
    }
}

function updateAuthStatus() {
    const signedIn = driveService.isSignedIn();
    const statusEl = document.getElementById('google-auth-status');
    const signInBtn = document.getElementById('google-signin-btn');
    const signOutBtn = document.getElementById('google-signout-btn');

    if (statusEl) {
        statusEl.textContent = signedIn ? `Status: Signed In (User: ${gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getEmail()})` : "Status: Not Signed In";
    }
    if (signInBtn) signInBtn.classList.toggle('hidden', signedIn);
    if (signOutBtn) signOutBtn.classList.toggle('hidden', !signedIn);

    // Refresh or enable UI components that depend on auth status
    if (signedIn) {
        loadCoursesForDriveMigration(); // Refresh course list which might depend on user's Drive access
        displayDriveFileExplorer(document.getElementById('drive-file-explorer-dynamic-container')); // Re-render/enable explorer
    }
}


function setupDriveCourseAssetSelection() { // Renamed from setupCourseAssetSelection
    const loadButton = document.getElementById('load-drive-folder-for-assets-btn'); // Renamed ID
    const useAssetsButton = document.getElementById('use-selected-drive-assets-btn'); // Renamed ID
    const folderIdInput = document.getElementById('drive-course-assets-folder-id'); // Renamed ID, changed from folderLink
    // Removed email/password inputs
    const displayArea = document.getElementById('drive-course-assets-display-area'); // Renamed ID
    const feedbackArea = document.getElementById('drive-course-assets-feedback'); // Renamed ID

    if (!loadButton || !useAssetsButton || !folderIdInput || !displayArea || !feedbackArea) {
        console.error("[CourseAssets] One or more UI elements for Google Drive course asset selection are missing.");
        return;
    }

    loadButton.addEventListener('click', async () => {
        const driveFolderId = folderIdInput.value.trim();

        if (!driveFolderId) {
            feedbackArea.innerHTML = `<p class="text-red-500">Please provide Google Drive Folder ID.</p>`;
            return;
        }
        if (!driveService.isSignedIn()) {
            feedbackArea.innerHTML = `<p class="text-red-500">Please sign in with Google first.</p>`;
            alert("Please sign in with Google to access Drive folders.");
            return;
        }

        feedbackArea.innerHTML = '';
        displayArea.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Loading folder contents from Google Drive...</p>';
        showLoading('Fetching Google Drive folder contents...');

        try {
            const contents = await driveService.getFolderContents(driveFolderId); // Using client-side service

            if (contents && contents.length > 0) {
                displayArea.innerHTML = `
                    <h4 class="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Select files to use as course assets:</h4>
                    <ul class="space-y-2 max-h-96 overflow-y-auto border border-gray-300 dark:border-gray-600 p-3 rounded-md">
                        ${contents.map(item => `
                            <li class="flex items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                                <input type="checkbox"
                                       id="drive-asset-${item.id}"
                                       name="drive-asset-select"
                                       class="form-checkbox h-5 w-5 text-primary-600 dark:text-primary-500 rounded mr-3 focus:ring-primary-500"
                                       data-id="${item.id}"
                                       data-webviewlink="${item.webViewLink}"
                                       data-name="${item.name}"
                                       data-mimetype="${item.mimeType}"
                                       data-size="${item.size || 0}">
                                <label for="drive-asset-${item.id}" class="flex-grow text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                                    ${item.mimeType === 'application/vnd.google-apps.folder' ? '📁' : '📄'} ${item.name}
                                    ${item.size ? `<span class="text-xs text-gray-500 dark:text-gray-400">(${(item.size / 1024).toFixed(2) + ' KB'})</span>` : ''}
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
            displayArea.innerHTML = `<p class="text-red-500">Error loading folder: ${error.message || 'Unknown error'}</p>`;
            feedbackArea.innerHTML = `<p class="text-red-500">Error: ${error.message || 'Unknown error'}</p>`;
        } finally {
            hideLoading();
        }
    });

    useAssetsButton.addEventListener('click', () => {
        const selectedAssets = [];
        const checkboxes = displayArea.querySelectorAll('input[name="drive-asset-select"]:checked');

        checkboxes.forEach(checkbox => {
            selectedAssets.push({
                id: checkbox.dataset.id,
                webViewLink: checkbox.dataset.webviewlink,
                name: checkbox.dataset.name,
                mimeType: checkbox.dataset.mimetype,
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
        alert(`Selected ${selectedAssets.length} asset(s). Details logged to console. Course creation from these assets is the next step (not yet implemented).`);
        // Future: Pass selectedAssets to a course creation setup function
    });
}


export function loadCoursesForDriveMigration() { // Renamed from loadCoursesForMegaMigration
    if (!currentUser || !currentUser.isAdmin) {
        console.warn("User is not admin, cannot load courses for Google Drive migration.");
        const listContainer = document.getElementById('drive-migration-course-list'); // Renamed ID
        if (listContainer) listContainer.innerHTML = `<div class="p-3 text-red-700 bg-red-100 rounded dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`;
        return;
    }
     if (!driveService.isSignedIn()) { // Check if user is signed in for Drive
        console.warn("User not signed into Google Drive. Cannot load courses for migration.");
        const listContainer = document.getElementById('drive-migration-course-list');
        if (listContainer) listContainer.innerHTML = `<div class="p-3 text-yellow-700 bg-yellow-100 rounded dark:bg-yellow-200 dark:text-yellow-800">Please sign in with Google to load course migration statuses.</div>`;
        return;
    }

    const listContainer = document.getElementById('drive-migration-course-list'); // Renamed ID
    const gamifiedAlertContainer = document.getElementById('drive-migration-gamified-alert'); // Renamed ID
    if (!listContainer || !gamifiedAlertContainer) {
        console.error("Google Drive migration UI containers not found."); return;
    }

    showLoading("Surveying courses for Google Drive readiness...");
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

        // Correctly check Drive-specific fields for migration status
        const isFullyMigrated = course.driveCourseRootFolderId &&
                                course.driveTranscriptionsFolderId &&
                                course.drivePdfFolderId && // Assuming this refers to a general PDF folder for chapters if used
                                course.driveMcqFolderId;
                                // course.driveTextbookFullPdfId is for the original textbook, might not be part of "standard structure" completion.
                                // For this check, focusing on the operational folders.

        let statusText = "";
        let statusColorClass = "";
        if (isFullyMigrated) {
            statusText = `Fully Migrated to Google Drive`;
            statusColorClass = "text-green-600 dark:text-green-400";
        } else if (course.driveCourseRootFolderId || course.driveTranscriptionsFolderId || course.drivePdfFolderId || course.driveMcqFolderId || course.driveTextbookFullPdfId) {
            statusText = `Partially Migrated to Google Drive`;
            statusColorClass = "text-yellow-600 dark:text-yellow-400";
            unmigratedCoursesCount++;
        } else {
            statusText = `Not Migrated to Google Drive (Local Only)`;
            statusColorClass = "text-red-600 dark:text-red-400";
            unmigratedCoursesCount++;
        }

        let buttonText = isFullyMigrated ? 'Explore Course Space' : 'Start Migration'; // Changed "Vault" to "Space"
        let buttonDisabled = isFullyMigrated && !course.driveCourseRootFolderId; // Check Drive ID

        courseElement.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div class="mb-2 sm:mb-0">
                    <h4 class="font-semibold text-lg text-gray-800 dark:text-gray-200">${course.name} <span class="text-xs text-gray-500">(ID: ${course.id})</span></h4>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Local Directory: ${course.courseDirName || 'N/A'}</p>
                    <p class="text-sm mt-1 font-medium ${statusColorClass}">${statusText}</p>
                </div>
                <button
                    id="migrate-drive-btn-${course.id}"  // Renamed ID
                    data-course-id="${course.id}"
                    data-is-migrated="${isFullyMigrated}"
                    data-root-id="${course.driveCourseRootFolderId || ''}" // Changed to data-root-id
                    class="${isFullyMigrated && course.driveCourseRootFolderId ? 'btn-secondary' : 'btn-primary'} whitespace-nowrap migrate-explore-drive-btn"> {/* Renamed class */}
                    ${isFullyMigrated && course.driveCourseRootFolderId ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0v6m0-6h6m-6 0H6"></path></svg>`}
                    ${buttonText}
                </button>
            </div>
            <div id="migration-status-drive-${course.id}" class="text-xs mt-2 text-gray-600 dark:text-gray-400"></div> {/* Renamed ID */}
            <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-xs space-y-1">
                {/* Updated to show Drive IDs or links if available */}
                <p><strong>Root Folder ID:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline drive-id-span" data-id="${course.driveCourseRootFolderId || ''}" title="Explore Root Folder">${course.driveCourseRootFolderId || 'Not Set'}</span></p>
                <p><strong>Transcripts Folder ID:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline drive-id-span" data-id="${course.driveTranscriptionsFolderId || ''}" title="Explore Transcripts">${course.driveTranscriptionsFolderId || 'Not Set'}</span></p>
                <p><strong>Textbook PDFs Folder ID:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline drive-id-span" data-id="${course.drivePdfFolderId || ''}" title="Explore Textbook PDFs">${course.drivePdfFolderId || 'Not Set'}</span></p>
                <p><strong>Generated Qs Folder ID:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline drive-id-span" data-id="${course.driveMcqFolderId || ''}" title="Explore Generated Questions">${course.driveMcqFolderId || 'Not Set'}</span></p>
            </div>
        `;
        listContainer.appendChild(courseElement);
    });

    document.querySelectorAll('.migrate-explore-drive-btn').forEach(button => { // Renamed class
        button.disabled = (button.dataset.isMigrated === 'true' && !button.dataset.rootId); // Check rootId
        button.addEventListener('click', (e) => {
            const courseId = e.currentTarget.dataset.courseId;
            const isMigrated = e.currentTarget.dataset.isMigrated === 'true';
            const rootId = e.currentTarget.dataset.rootId; // Changed to rootId
            if (isMigrated) {
                if (rootId) {
                    displayDriveFileExplorer(document.getElementById('drive-file-explorer-dynamic-container'), rootId); // Pass ID
                } else {
                    alert('Course Google Drive space ID uncharted. Re-migration might be needed.');
                }
            } else {
                startDriveMigration(courseId); // Renamed
            }
        });
    });
    document.querySelectorAll('.drive-id-span').forEach(span => { // Renamed class
        span.addEventListener('click', (e) => {
            const folderId = e.currentTarget.dataset.id; // Changed to data-id
            if (folderId && folderId !== 'Not Set') {
                displayDriveFileExplorer(document.getElementById('drive-file-explorer-dynamic-container'), folderId); // Pass ID
            }
        });
    });

    if (unmigratedCoursesCount > 0) {
        gamifiedAlertContainer.innerHTML = `
            <div class="p-4 mb-4 text-sm text-blue-700 bg-blue-100 rounded-lg dark:bg-blue-200 dark:text-blue-800 flex items-center" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-3 text-blue-500" fill="currentColor" viewBox="0 0 24 24"> <!-- Google Drive Icon -->
                    <path d="M19.52 6.022A7.99 7.99 0 0012.015 0a7.99 7.99 0 00-7.504 6.022H19.52zM4.511 6.522L0 14.015l3.008 5.21h4.496V6.522H4.51zM8.254 19.725l-3.008-5.21L8.254 9.35v10.375zm.75 0h6v-7.5h-6v7.5zm6.75 0L24 14.015l-3.008-5.21H15.754v10.375zM15 11.725V6.522h-4.496L15 11.725z"/>
                </svg>
                <span class="font-medium">Action Required:</span> ${unmigratedCoursesCount} course(s) are pending migration to Google Drive. Start migration for unparalleled access and durability!
            </div>
        `;
    }
    hideLoading();
}

export async function startDriveMigration(courseId) { // Renamed from startMegaMigration
    if (!currentUser || !currentUser.isAdmin) {
        alert("Access Denied. Admin privileges required."); return;
    }
    if (!driveService.isSignedIn()) {
        alert("Please sign in with Google first to start migration.");
        return;
    }
    const statusContainer = document.getElementById(`migration-status-drive-${courseId}`); // Renamed ID
    const migrateButton = document.getElementById(`migrate-drive-btn-${courseId}`); // Renamed ID

    try {
        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Connecting to Google Drive...</p>`;
        if (migrateButton) migrateButton.disabled = true;

        // driveService should be initialized already, but a check might be good
        // For now, assume it's initialized from displayDriveMigrationDashboard

        const course = globalCourseDataMap.get(courseId);
        if (!course) throw new Error(`Course data for ID ${courseId} not found.`);

        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Preparing ${course.name} for migration to Google Drive...</p>`;

        const lyceumRootFolderName = "LyceumCourses_Test";
        const courseDriveFolderName = course.courseDirName || `course_${course.id.replace(/\s+/g, '_')}`;

        // Standard folder names - these match constants in course_automation_service.js if that's intended
        const TEXTBOOK_FULL_DIR_NAME = "Textbook_Full"; // For original textbook
        const TEXTBOOK_CHAPTERS_DIR_NAME = "Textbook_Chapters"; // For processed chapters
        const TRANSCRIPTIONS_ARCHIVE_DIR_NAME = "Transcriptions_Archive";
        const GENERATED_ASSESSMENTS_DIR_NAME = "Generated_Assessments";


        // Using driveService methods now
        const lyceumRootDriveFolderId = await driveService.findOrCreateFolder(lyceumRootFolderName, 'root');
        if (!lyceumRootDriveFolderId) throw new Error(`Failed to find or create Lyceum root folder in Google Drive: ${lyceumRootFolderName}`);
        console.log(`[Drive Migration] Lyceum Root Folder ID: ${lyceumRootDriveFolderId}`);

        const courseMainDriveFolderId = await driveService.findOrCreateFolder(courseDriveFolderName, lyceumRootDriveFolderId);
        if (!courseMainDriveFolderId) throw new Error(`Failed to create course folder in Google Drive: ${courseDriveFolderName}`);
        console.log(`[Drive Migration] Main Course Folder ID: ${courseMainDriveFolderId} for course ${course.name}`);

        const courseRootWebViewLink = `https://drive.google.com/drive/folders/${courseMainDriveFolderId}`;


        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Course folder created. Creating standard sub-folders...</p>`;
        const placeholderContent = `This folder was established during the admin migration process on ${new Date().toISOString()}.\nContent for this category will be stored here.`;
        const placeholderFileName = "README_Migration_Log.txt";

        // Function to create a standard subfolder and add a placeholder README
        const createStandardSubfolder = async (subfolderName, parentCourseFolderId) => {
            const subfolderId = await driveService.findOrCreateFolder(subfolderName, parentCourseFolderId);
            if (!subfolderId) throw new Error(`Failed to create subfolder: ${subfolderName}`);

            // Create a placeholder file object (Blob) for client-side uploads
            const placeholderBlob = new Blob([placeholderContent.replace("this category", subfolderName)], { type: 'text/plain' });
            const placeholderFileObject = new File([placeholderBlob], placeholderFileName, { type: 'text/plain' });

            await driveService.uploadFile(placeholderFileObject, placeholderFileName, subfolderId);
            console.log(`[Drive Migration] Created subfolder ${subfolderName} (ID: ${subfolderId}) and added README.`);
            return subfolderId;
        };

        // Create all standard subfolders
        const textbookFullFolderId = await createStandardSubfolder(TEXTBOOK_FULL_DIR_NAME, courseMainDriveFolderId);
        const textbookChaptersFolderId = await createStandardSubfolder(TEXTBOOK_CHAPTERS_DIR_NAME, courseMainDriveFolderId);
        const transcriptionsFolderId = await createStandardSubfolder(TRANSCRIPTIONS_ARCHIVE_DIR_NAME, courseMainDriveFolderId);
        const generatedAssessmentsFolderId = await createStandardSubfolder(GENERATED_ASSESSMENTS_DIR_NAME, courseMainDriveFolderId);


        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Standard folders created. Updating database...</p>`;
        const updates = {
            driveCourseRootFolderId: courseMainDriveFolderId,
            driveCourseRootLink: courseRootWebViewLink,
            driveTextbookFullFolderId: textbookFullFolderId, // Storing ID of the "Textbook_Full" folder
            driveTextbookChaptersFolderId: textbookChaptersFolderId, // Storing ID of the "Textbook_Chapters" folder
            driveTranscriptionsFolderId: transcriptionsFolderId,
            driveGeneratedAssessmentsFolderId: generatedAssessmentsFolderId, // Renamed from driveMcqFolderId for clarity
            // Note: drivePdfFolderId and driveMcqFolderId might be too generic if structure is more detailed.
            // Using driveGeneratedAssessmentsFolderId for assessments.
            // drivePdfFolderId could be textbookChaptersFolderId if that's its main role.
            // For now, let's assume drivePdfFolderId was intended for chapter PDFs and driveMcqFolderId for assessments.
            drivePdfFolderId: textbookChaptersFolderId, // Aligning with the created folder for chapter PDFs
            driveMcqFolderId: generatedAssessmentsFolderId, // Aligning with the created folder for assessments
        };
        const success = await updateCourseDefinition(courseId, updates);

        if (success) {
            const updatedCourseData = { ...globalCourseDataMap.get(courseId), ...updates };
            globalCourseDataMap.set(courseId, updatedCourseData);
            if (statusContainer) statusContainer.innerHTML = `<p class="text-green-600 dark:text-green-400">Migration Complete: Course '${course.name}' successfully migrated to Google Drive.</p>`;
            loadCoursesForDriveMigration();
        } else {
            throw new Error("Failed to update database (Firestore course definition) with Google Drive info.");
        }
    } catch (error) {
        console.error(`[Drive Migration] Error for course ${courseId}:`, error);
        if (statusContainer) statusContainer.innerHTML = `<p class="text-red-600 dark:text-red-400">Google Drive Migration Failed: ${error.message}</p>`;
        if (migrateButton) migrateButton.disabled = false;
        alert(`Google Drive Migration for course ${courseId} failed: ${error.message}`);
    }
}

// --- Google Drive File Explorer ---
let currentDriveExplorerPath = []; // Array of {id, name} objects for breadcrumbs
let currentDriveExplorerFolderId = 'root'; // Current folder ID being viewed, default to root

export async function handleDriveFileDownload(fileName, fileId) {
    if (!fileId) { alert("File ID unavailable. Cannot start download."); return; }
    if (!driveService.isSignedIn()) { alert("Please sign in to download files."); return; }
    console.log(`[Drive Explorer] Initiating download for: ${fileName} (ID: ${fileId})`);
    showLoading(`Preparing ${fileName} for download...`);
    try {
        // driveService.downloadFile will handle fetching and triggering download
        await driveService.downloadFile(fileId, fileName);
        // alert might be part of driveService.downloadFile or handled here
        // For now, assume driveService.downloadFile shows necessary user feedback or errors.
    } catch (error) {
        console.error(`[Drive Explorer] Download failed for ${fileName}:`, error);
        alert(`Download error: ${error.message}`);
    } finally {
        hideLoading();
    }
}

export async function handleDriveFileUpload(event) { // Renamed
    const fileInput = event.target;
    const file = fileInput.files[0];
    if (!file) { alert("No file selected for upload."); return; }
    if (!currentDriveExplorerFolderId) {
        alert("Target Google Drive folder not specified. Transmission aborted."); return;
    }
    if (!driveService.isSignedIn()) { alert("Please sign in to upload files."); return; }

    console.log(`[Drive Explorer] Uploading file "${file.name}" to folder ID "${currentDriveExplorerFolderId}"`);
    showLoading(`Uploading ${file.name} to Google Drive...`);
    const feedbackEl = document.getElementById('drive-explorer-feedback'); // Renamed ID
    if (feedbackEl) feedbackEl.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Uploading ${file.name} to current Google Drive folder...</p>`;

    try {
        const uploadedFile = await driveService.uploadFile(file, file.name, currentDriveExplorerFolderId);
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-green-600 dark:text-green-400">File "${uploadedFile.name}" (ID: ${uploadedFile.id}) successfully uploaded.</p>`;
        console.log(`[Drive Explorer] Upload complete:`, uploadedFile);

        // Re-render current folder contents
        const currentFolderName = currentDriveExplorerPath.length > 0 ? currentDriveExplorerPath[currentDriveExplorerPath.length - 1].name : "Google Drive Root";
        renderDriveFolderContents(currentDriveExplorerFolderId, currentFolderName);
    } catch (error) {
        console.error(`[Drive Explorer] Upload error:`, error);
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600 dark:text-red-400">Upload error: ${error.message}</p>`;
        alert(`File upload failed: ${error.message}`);
    } finally {
        hideLoading();
        fileInput.value = null;
    }
}

async function renderDriveFolderContents(folderId, currentFolderName = 'Unnamed Folder') { // Takes folderId
    const fileListDiv = document.getElementById('drive-file-list'); // Renamed ID
    const currentPathDiv = document.getElementById('drive-current-path'); // Renamed ID
    const parentFolderButton = document.getElementById('drive-parent-folder-btn'); // Renamed ID
    const feedbackEl = document.getElementById('drive-explorer-feedback'); // Renamed ID
    const uploadSection = document.getElementById('drive-upload-section'); // Renamed ID

    if (!fileListDiv || !currentPathDiv || !parentFolderButton || !uploadSection) {
        console.error("[Drive Explorer] Core navigation or display modules are offline."); return;
    }

    fileListDiv.innerHTML = `<p class="text-gray-500 dark:text-gray-400 p-3"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Loading folder contents from Google Drive...</p>`;
    showLoading("Loading Google Drive folder contents...");

    try {
        // currentDriveExplorerFolderId is already set by the calling function (loadDriveFolderById)
        const contents = await driveService.getFolderContents(folderId);

        const isRootFolder = folderId === 'root';

        // Ensure currentFolderName is sensible
        let effectiveCurrentFolderName = currentFolderName;
        if (isRootFolder && (!effectiveCurrentFolderName || effectiveCurrentFolderName === 'Unnamed Folder')) {
            effectiveCurrentFolderName = 'Google Drive Root';
        }

        // Path Management:
        const currentPathIndex = currentDriveExplorerPath.findIndex(p => p.id === folderId);
        if (currentPathIndex !== -1) { // Navigated to an existing path segment (e.g. via breadcrumb)
            currentDriveExplorerPath = currentDriveExplorerPath.slice(0, currentPathIndex + 1);
        } else { // Navigated to a new folder (deeper, or a jump)
            // If it's not a direct child navigation, the path might be incorrect.
            // A simple append might be okay if loadDriveFolderById always clears/sets path before calling render.
            // For now, if folderId isn't 'root' and path is empty, assume we start path from root.
            if (folderId !== 'root' && currentDriveExplorerPath.length === 0) {
                 currentDriveExplorerPath.push({ name: 'Google Drive Root', id: 'root' });
            }
            // Check if already added to avoid duplicates if logic outside adds it first
            if (!currentDriveExplorerPath.find(p => p.id === folderId)) {
                 currentDriveExplorerPath.push({ name: effectiveCurrentFolderName, id: folderId });
            }
        }

        currentPathDiv.innerHTML = currentDriveExplorerPath.map((p, index) =>
            `<span class="text-primary-600 dark:text-primary-400 cursor-pointer hover:underline drive-path-segment-btn" data-path-index="${index}">${p.name}</span>`
        ).join('<span class="mx-1 text-gray-400">/</span>');

        document.querySelectorAll('.drive-path-segment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => navigateToDrivePathIndex(parseInt(e.currentTarget.dataset.pathIndex)));
        });

        parentFolderButton.classList.toggle('hidden', currentDriveExplorerPath.length <= 1 || isRootFolder);
        parentFolderButton.onclick = () => navigateToDriveParentFolder();

        if (contents.length === 0) {
            fileListDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-3 italic">Folder is empty.</p>';
        } else {
            fileListDiv.innerHTML = `<ul class="divide-y divide-gray-200 dark:divide-gray-700">
                ${contents.map(item => `
                    <li class="py-3 px-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md group">
                        <div class="flex items-center min-w-0">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 ${item.mimeType === 'application/vnd.google-apps.folder' ? 'text-yellow-500' : 'text-gray-400'} mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                ${item.mimeType === 'application/vnd.google-apps.folder'
                                    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />'
                                    : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />'}
                            </svg>
                            <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-primary-600" title="${item.name}">${item.name}</span>
                        </div>
                        <div class="flex items-center space-x-2 ml-2">
                            <span class="text-xs text-gray-500 dark:text-gray-400">${item.sizeBytes ? (item.sizeBytes / 1024).toFixed(2) + ' KB' : (item.mimeType === 'application/vnd.google-apps.folder' ? '--' : 'N/A')}</span>
                            ${item.mimeType === 'application/vnd.google-apps.folder'
                                ? `<button class="btn-secondary-xs drive-open-folder-btn" data-folder-id="${item.id}" data-name="${item.name}">Open</button>`
                                : `<button class="btn-secondary-xs drive-download-file-btn" data-name="${escape(item.name)}" data-file-id="${item.id}">Download</button>`}
                            <a href="${item.webViewLink || '#'}" target="_blank" class="btn-link-xs ${!item.webViewLink ? 'disabled-link' : ''}" title="Open in Google Drive (New Tab)">View</a>
                        </div>
                    </li>
                `).join('')}</ul>`;

            document.querySelectorAll('.drive-open-folder-btn').forEach(btn => btn.addEventListener('click', (e) => loadDriveFolderById(e.currentTarget.dataset.folderId, e.currentTarget.dataset.name)));
            document.querySelectorAll('.drive-download-file-btn').forEach(btn => btn.addEventListener('click', (e) => handleDriveFileDownload(e.currentTarget.dataset.name, e.currentTarget.dataset.fileId)));
        }

        const fileUploadInput = document.getElementById('drive-file-upload-input'); // Renamed ID
        const uploadButton = document.getElementById('drive-upload-button'); // Renamed ID
        uploadButton.onclick = () => handleDriveFileUpload({ target: fileUploadInput });

        uploadSection.classList.remove('hidden');
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-green-600 dark:text-green-400">Loaded contents of "${effectiveCurrentFolderName}".</p>`;
    } catch (error) {
        console.error("[Drive Explorer] Error rendering folder contents:", error);
        fileListDiv.innerHTML = `<p class="text-red-600 dark:text-red-400 p-3">Error loading Google Drive folder contents: ${error.message}</p>`;
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600 dark:text-red-400">Error: ${error.message}</p>`;
    } finally {
        hideLoading();
    }
}

export async function loadDriveFolderById(folderId, folderName = null) { // Renamed from loadMegaFolderByLink, uses ID
    const feedbackEl = document.getElementById('drive-explorer-feedback'); // Renamed ID

    if (!driveService.isSignedIn()) {
        alert("Please sign in with Google to browse Drive folders.");
        if(feedbackEl) feedbackEl.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">Please sign in with Google.</p>`;
        return;
    }

    if (!folderId) { // Default to root if no ID
        folderId = 'root';
        folderName = 'Google Drive Root';
        currentDriveExplorerPath = []; // Reset path for root
    }

    console.log(`[Drive Explorer] Loading folder: ${folderName || folderId}`);
    if (feedbackEl) feedbackEl.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Loading folder ${folderName || folderId}...</p>`;

    // Manage path. If navigating to a folder already in path, trim path.
    // If it's a new subfolder, it will be added by renderDriveFolderContents.
    // This function is the main entry point for displaying a folder's content.
    // It sets the global currentDriveExplorerFolderId and then calls render.
    currentDriveExplorerFolderId = folderId;
    renderDriveFolderContents(folderId, folderName || (folderId === 'root' ? 'Google Drive Root' : 'Unnamed Folder'));
}

export function navigateToDrivePathIndex(index) {
    if (index < 0 || index >= currentDriveExplorerPath.length) {
        console.warn("[Drive Explorer] Invalid path index:", index); return;
    }
    const targetPathElement = currentDriveExplorerPath[index];
    // Path up to and including the selected index becomes the new path.
    currentDriveExplorerPath = currentDriveExplorerPath.slice(0, index + 1);
    loadDriveFolderById(targetPathElement.id, targetPathElement.name);
}

export function navigateToDriveParentFolder() {
    if (currentDriveExplorerPath.length > 1) {
        currentDriveExplorerPath.pop(); // Remove current folder from path
        const parent = currentDriveExplorerPath[currentDriveExplorerPath.length - 1]; // Get the new last element (the parent)
        loadDriveFolderById(parent.id, parent.name);
    } else {
        // Already at root or path is just one level, effectively go to root.
        currentDriveExplorerPath = []; // Reset path for root explicitly
        loadDriveFolderById('root', 'Google Drive Root');
    }
}

export function displayDriveFileExplorer(containerElement, initialFolderId = 'root') {
    containerElement.innerHTML = `
        <div class="content-card p-6 mt-6">
            <h3 class="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-4 flex items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 24 24"> <!-- Google Drive Icon -->
                    <path d="M19.52 6.022A7.99 7.99 0 0012.015 0a7.99 7.99 0 00-7.504 6.022H19.52zM4.511 6.522L0 14.015l3.008 5.21h4.496V6.522H4.51zM8.254 19.725l-3.008-5.21L8.254 9.35v10.375zm.75 0h6v-7.5h-6v7.5zm6.75 0L24 14.015l-3.008-5.21H15.754v10.375zM15 11.725V6.522h-4.496L15 11.725z"/>
                </svg>
                Google Drive File Explorer
            </h3>
            <div class="space-y-4">
                <div>
                    <label for="drive-folder-id-input" class="label">Google Drive Folder ID (or 'root'):</label> {/* Renamed ID */}
                    <div class="flex space-x-2 mt-1">
                        <input type="text" id="drive-folder-id-input" class="input-field flex-grow" placeholder="Enter Google Drive Folder ID or 'root'" value="${initialFolderId || 'root'}">
                        <button id="load-drive-folder-btn" class="btn-primary flex items-center"> {/* Renamed ID */}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> <!-- Search Icon -->
                            Load Folder
                        </button>
                    </div>
                </div>
                <div class="flex items-center justify-between py-2">
                    <button id="drive-parent-folder-btn" class="btn-secondary-small hidden flex items-center"> {/* Renamed ID */}
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10v10a2 2 0 002 2h14a2 2 0 002-2V10M3 10l9-9 9 9m-9 9v-4"></path></svg> <!-- Home/Up Icon -->
                        Parent Folder
                    </button>
                    <div id="drive-current-path" class="text-sm text-gray-500 dark:text-gray-400 truncate flex-grow ml-2">Current Path: /</div> {/* Renamed ID */}
                </div>
                <div id="drive-file-list" class="min-h-[200px] max-h-[450px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-gray-50 dark:bg-gray-700/50 shadow-inner"> {/* Renamed ID */}
                    <p class="text-gray-500 dark:text-gray-400 p-3">Enter a folder ID or initialize Google Drive to browse files.</p>
                </div>
                <div id="drive-upload-section" class="pt-4 border-t border-gray-200 dark:border-gray-600 hidden"> {/* Renamed ID */}
                    <label for="drive-file-upload-input" class="label mb-1">Upload File to Current Folder:</label> {/* Renamed ID */}
                    <div class="flex space-x-2">
                        <input type="file" id="drive-file-upload-input" class="input-field file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 dark:file:bg-primary-700 file:text-primary-700 dark:file:text-primary-100 hover:file:bg-primary-100 dark:hover:file:bg-primary-600 flex-grow"> {/* Renamed ID */}
                        <button id="drive-upload-button" class="btn-primary-small flex items-center"> {/* Renamed ID */}
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg> <!-- Upload Icon -->
                            Upload
                        </button>
                    </div>
                </div>
                <div id="drive-explorer-feedback" class="text-xs text-gray-500 dark:text-gray-400 mt-2 min-h-[20px]"></div> {/* Renamed ID */}
            </div>
        </div>`;

    document.getElementById('load-drive-folder-btn').addEventListener('click', () => { // Renamed ID
        const folderId = document.getElementById('drive-folder-id-input').value.trim(); // Renamed ID
        currentDriveExplorerPath = [];
        loadDriveFolderById(folderId || 'root', folderId === 'root' ? 'Google Drive Root' : null); // Renamed, pass ID & name if root
    });

    const uploadInput = document.getElementById('drive-file-upload-input'); // Renamed ID
    document.getElementById('drive-upload-button').addEventListener('click', () => { // Renamed ID
         handleDriveFileUpload({ target: uploadInput }); // Renamed handler
    });

    // Initial load logic for Drive
    if (driveService.isSignedIn()) {
        currentDriveExplorerPath = []; // Reset path on initial display
        loadDriveFolderById(initialFolderId, initialFolderId === 'root' ? 'Google Drive Root' : null);
    } else {
         document.getElementById('drive-file-list').innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-3">Please sign in with Google to browse Drive files.</p>';
         // Disable load button if not signed in
         const loadBtn = document.getElementById('load-drive-folder-btn');
         if(loadBtn) loadBtn.disabled = true;
    }
}

// Note: The functions loadDriveFolderById, handleDriveFileDownload, navigateToDrivePathIndex,
// and navigateToDriveParentFolder are called by event listeners attached dynamically in renderDriveFolderContents
// or by the event listener for 'load-drive-folder-btn'. They don't need to be on window if this module structure is maintained.
// However, they are exported for now in case other parts of the system might need to call them directly.
// If their usage is confirmed to be ONLY within this module's event listeners, their export can be removed.
// For this refactoring, keeping them exported is safer if their external usage isn't fully mapped.
// The key is that `admin_course_content.js` will now import `displayDriveMigrationDashboard` and `displayDriveFileExplorer`.
// The key is that `admin_course_content.js` will now import `displayDriveMigrationDashboard` and `displayDriveFileExplorer`.
