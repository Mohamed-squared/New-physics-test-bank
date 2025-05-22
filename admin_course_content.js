// admin_course_content.js
import { globalCourseDataMap, currentUser } from './state.js';
import { showLoading, hideLoading } from './utils.js';
import { updateCourseDefinition } from './firebase_firestore.js';
import { 
    initialize as megaInitialize, 
    createFolder as megaCreateFolder, 
    findFolder as megaFindFolder, 
    uploadFile as megaUploadFile,
    megaStorage // Access the simulated storage, especially megaStorage.root
} from './mega_service.js';

function displayMegaMigrationDashboard(containerElement) {
    if (!currentUser || !currentUser.isAdmin) {
        containerElement.innerHTML = `<p class="text-red-500">Access Denied. Admin privileges required.</p>`;
        return;
    }

    containerElement.innerHTML = `
        <div class="content-card">
            <h2 class="text-xl font-semibold text-primary-600 dark:text-primary-400 mb-4">MEGA Tools & Migration</h2>
            
            <div class="mb-6">
                <h3 class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Course Migration to MEGA</h3>
                <div class="flex justify-between items-center mb-3">
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        Review courses and migrate their content (transcriptions, PDFs, MCQs, etc.) to MEGA cloud storage.
                    </p>
                    <button 
                        onclick="window.loadCoursesForMegaMigration()" 
                        class="btn-secondary-small flex items-center"
                        title="Refresh course list and statuses">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Refresh List
                    </button>
                </div>
                <div id="mega-migration-course-list" class="space-y-3">
                    <p class="text-gray-500 dark:text-gray-400">Loading courses...</p>
                </div>
            </div>

            <hr class="my-6 border-gray-300 dark:border-gray-600">
            <div>
                <h3 class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Other MEGA Management Tools</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                    Additional tools for managing MEGA storage, such as checking overall usage, cleaning orphaned files, etc., will be available here in the future.
                </p>
            </div>
        </div>
    `;
    loadCoursesForMegaMigration();
}

function loadCoursesForMegaMigration() {
    if (!currentUser || !currentUser.isAdmin) {
        console.warn("User is not admin, cannot load courses for MEGA migration.");
        const listContainer = document.getElementById('mega-migration-course-list');
        if (listContainer) {
            listContainer.innerHTML = `<p class="text-red-500">Access Denied. Admin privileges required.</p>`;
        }
        return;
    }
    
    const listContainer = document.getElementById('mega-migration-course-list');
    if (!listContainer) {
        console.error("MEGA migration course list container not found.");
        return;
    }

    showLoading("Loading courses for MEGA migration...");
    listContainer.innerHTML = ''; 

    if (globalCourseDataMap.size === 0) {
        listContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No courses found.</p>';
        hideLoading();
        return;
    }

    globalCourseDataMap.forEach(course => {
        const courseElement = document.createElement('div');
        courseElement.className = 'p-3 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 shadow-sm';
        
        let statusText = "";
        // Check if all three main content folder links are present
        const isFullyMigrated = course.megaTranscriptionsFolderLink && course.megaPdfFolderLink && course.megaMcqFolderLink;
        // megaTextbookFullPdfLink is handled separately as per instructions.

        if (isFullyMigrated) {
            statusText = `<span class="text-green-600 dark:text-green-400 font-semibold">Fully Migrated to MEGA</span>`;
        } else if (course.megaTranscriptionsFolderLink || course.megaPdfFolderLink || course.megaMcqFolderLink || course.megaTextbookFullPdfLink) {
            statusText = `<span class="text-yellow-600 dark:text-yellow-400">Partially on MEGA</span> (Some links set)`;
        } else {
            statusText = `<span class="text-red-600 dark:text-red-400">Local / Not on MEGA</span>`;
        }

        let buttonText = 'Migrate to MEGA';
        let buttonDisabled = '';
        if (isFullyMigrated) {
            buttonText = 'View on MEGA'; // Or "Fully Migrated" and keep disabled
            // For "View on MEGA", we might want to link to the course's root MEGA folder if available,
            // or simply keep it disabled if direct viewing isn't implemented. For now, keep disabled.
            buttonDisabled = 'disabled'; 
            // If we had a course root mega link:
            // onclick="window.open('${course.megaCourseRootFolderLink}', '_blank')"
        } else {
             onclick=`window.startMegaMigration('${course.id}')`
        }


        courseElement.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-semibold text-md text-gray-800 dark:text-gray-200">${course.name} (ID: ${course.id})</h4>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Directory: ${course.courseDirName || 'N/A'}</p>
                    <p class="text-sm mt-1">${statusText}</p>
                </div>
                <button 
                    id="migrate-btn-${course.id}" 
                    onclick="${isFullyMigrated ? '' : `window.startMegaMigration('${course.id}')`}" 
                    class="btn-primary-small"
                    ${buttonDisabled}>
                    ${buttonText}
                </button>
            </div>
            <div id="migration-status-${course.id}" class="text-xs mt-2 text-gray-600 dark:text-gray-400"></div>
            <div class="mt-2 text-xs space-y-0.5">
                <p>Transcriptions Link: <span class="font-mono text-gray-700 dark:text-gray-300">${course.megaTranscriptionsFolderLink || 'Not set'}</span></p>
                <p>PDFs Folder Link: <span class="font-mono text-gray-700 dark:text-gray-300">${course.megaPdfFolderLink || 'Not set'}</span></p>
                <p>MCQs Folder Link: <span class="font-mono text-gray-700 dark:text-gray-300">${course.megaMcqFolderLink || 'Not set'}</span></p>
                <p>Full Textbook Link: <span class="font-mono text-gray-700 dark:text-gray-300">${course.megaTextbookFullPdfLink || 'Not set'}</span></p>
            </div>
        `;
        listContainer.appendChild(courseElement);
    });

    hideLoading();
}

async function startMegaMigration(courseId) {
    if (!currentUser || !currentUser.isAdmin) {
        alert("Access Denied. Admin privileges required.");
        return;
    }

    const statusContainer = document.getElementById(`migration-status-${courseId}`);
    const migrateButton = document.getElementById(`migrate-btn-${courseId}`);

    try {
        const megaEmail = prompt("Enter your MEGA email:");
        if (!megaEmail) { alert("MEGA email is required."); return; }
        const megaPassword = prompt("Enter your MEGA password:");
        if (!megaPassword) { alert("MEGA password is required."); return; }

        if (statusContainer) statusContainer.innerHTML = `<span class="text-blue-500">Initializing MEGA service...</span>`;
        if (migrateButton) migrateButton.disabled = true;

        const megaInstance = await megaInitialize(megaEmail, megaPassword);
        if (!megaInstance || !megaInstance.loggedIn) {
            alert("MEGA initialization failed. Please check credentials and console.");
            if (statusContainer) statusContainer.innerHTML = `<span class="text-red-500">MEGA Init Failed.</span>`;
            if (migrateButton) migrateButton.disabled = false;
            return;
        }
        console.log("[Migration] MEGA Initialized with root:", megaInstance.root);

        const course = globalCourseDataMap.get(courseId);
        if (!course) {
            alert(`Course with ID ${courseId} not found.`);
            if (statusContainer) statusContainer.innerHTML = `<span class="text-red-500">Course data not found.</span>`;
            if (migrateButton) migrateButton.disabled = false;
            return;
        }
        
        if (statusContainer) statusContainer.innerHTML = `<span class="text-blue-500">Starting migration for ${course.name}... Creating folders...</span>`;

        // Define folder names
        const lyceumRootFolderName = "LyceumCourses_Test"; // Added _Test for safety during dev
        const courseMegaFolderName = course.courseDirName || `course_${course.id}`; // Use courseDirName or a fallback
        const transcriptionsFolderName = "Transcriptions";
        const pdfsFolderName = "TextbookPDFs";
        const mcqsFolderName = "GeneratedMCQs";

        // 1. Ensure LyceumCourses root folder
        let lyceumRootNode = await megaFindFolder(lyceumRootFolderName, megaInstance.root);
        if (!lyceumRootNode) {
            console.log(`[Migration] Creating root folder: ${lyceumRootFolderName}`);
            lyceumRootNode = await megaCreateFolder(lyceumRootFolderName, megaInstance.root);
        }
        if (!lyceumRootNode) throw new Error(`Failed to create or find Lyceum root folder: ${lyceumRootFolderName}`);
        console.log(`[Migration] Lyceum Root Node: ${lyceumRootNode.name} (ID: ${lyceumRootNode.id})`);

        // 2. Ensure Course main folder
        let courseMainNode = await megaFindFolder(courseMegaFolderName, lyceumRootNode);
        if (!courseMainNode) {
            console.log(`[Migration] Creating course main folder: ${courseMegaFolderName}`);
            courseMainNode = await megaCreateFolder(courseMegaFolderName, lyceumRootNode);
        }
        if (!courseMainNode) throw new Error(`Failed to create or find course main folder: ${courseMegaFolderName}`);
        console.log(`[Migration] Course Main Node: ${courseMainNode.name} (ID: ${courseMainNode.id})`);
        
        // 3. Ensure content subfolders
        let transcriptionsMegaFolderNode = await megaFindFolder(transcriptionsFolderName, courseMainNode);
        if (!transcriptionsMegaFolderNode) {
            transcriptionsMegaFolderNode = await megaCreateFolder(transcriptionsFolderName, courseMainNode);
        }
        if (!transcriptionsMegaFolderNode) throw new Error(`Failed to create Transcriptions folder on MEGA.`);

        let pdfsMegaFolderNode = await megaFindFolder(pdfsFolderName, courseMainNode);
        if (!pdfsMegaFolderNode) {
            pdfsMegaFolderNode = await megaCreateFolder(pdfsFolderName, courseMainNode);
        }
        if (!pdfsMegaFolderNode) throw new Error(`Failed to create TextbookPDFs folder on MEGA.`);
        
        let mcqsMegaFolderNode = await megaFindFolder(mcqsFolderName, courseMainNode);
        if (!mcqsMegaFolderNode) {
            mcqsMegaFolderNode = await megaCreateFolder(mcqsFolderName, courseMainNode);
        }
        if (!mcqsMegaFolderNode) throw new Error(`Failed to create GeneratedMCQs folder on MEGA.`);

        if (statusContainer) statusContainer.innerHTML = `<span class="text-blue-500">Folders created. Migrating files (simulated)...</span>`;

        // Simulate file iteration and migration
        const mockTranscriptionFiles = ['lecture1.srt', 'lecture2.srt', 'overview_transcription.vtt'];
        for (const fileName of mockTranscriptionFiles) {
            console.log(`[Migration] Simulating migration of transcription: ${fileName} to MEGA folder: ${transcriptionsMegaFolderNode.name}`);
            await megaUploadFile(`simulated_local_path/transcriptions/${fileName}`, fileName, transcriptionsMegaFolderNode);
        }

        const mockPdfFiles = [`${course.courseDirName}_chapter1.pdf`, `${course.courseDirName}_chapter2_notes.pdf`];
        for (const fileName of mockPdfFiles) {
            console.log(`[Migration] Simulating migration of PDF: ${fileName} to MEGA folder: ${pdfsMegaFolderNode.name}`);
            await megaUploadFile(`simulated_local_path/pdfs/${fileName}`, fileName, pdfsMegaFolderNode);
        }
        
        const mockMcqFiles = ['TextMCQ.md', 'LecturesMCQ.md', 'CombinedMCQs_Final.md'];
        for (const fileName of mockMcqFiles) {
            console.log(`[Migration] Simulating migration of MCQ file: ${fileName} to MEGA folder: ${mcqsMegaFolderNode.name}`);
            await megaUploadFile(`simulated_local_path/mcqs/${fileName}`, fileName, mcqsMegaFolderNode);
        }

        if (statusContainer) statusContainer.innerHTML = `<span class="text-blue-500">File migration complete. Updating course definition...</span>`;

        const updates = {
            megaTranscriptionsFolderLink: transcriptionsMegaFolderNode.link,
            megaPdfFolderLink: pdfsMegaFolderNode.link,
            megaMcqFolderLink: mcqsMegaFolderNode.link,
            // megaTextbookFullPdfLink is handled by a different feature
        };

        const success = await updateCourseDefinition(courseId, updates);
        if (success) {
            if (statusContainer) statusContainer.innerHTML = `<span class="text-green-500">Migration successful! Links updated.</span>`;
            if (migrateButton) {
                 migrateButton.textContent = 'View on MEGA'; // Or "Fully Migrated"
                 migrateButton.disabled = true; // Keep disabled or change to open link
            }
            // Refresh the list to show updated status
            loadCoursesForMegaMigration(); 
        } else {
            throw new Error("Failed to update course definition in Firestore.");
        }

    } catch (error) {
        console.error(`[Migration] Error during MEGA migration for course ${courseId}:`, error);
        if (statusContainer) statusContainer.innerHTML = `<span class="text-red-500">Migration failed: ${error.message}. Check console.</span>`;
        if (migrateButton) migrateButton.disabled = false; // Re-enable on failure
        alert(`Migration failed for course ${courseId}: ${error.message}`);
    }
}

// Expose functions to global window object
window.displayMegaMigrationDashboard = displayMegaMigrationDashboard;
window.loadCoursesForMegaMigration = loadCoursesForMegaMigration;
window.startMegaMigration = startMegaMigration;

export { displayMegaMigrationDashboard, loadCoursesForMegaMigration, startMegaMigration };
