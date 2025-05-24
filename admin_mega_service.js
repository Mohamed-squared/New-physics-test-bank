// admin_mega_service.js
import { globalCourseDataMap, currentUser } from './state.js';
import { showLoading, hideLoading } from './utils.js';
import { updateCourseDefinition } from './firebase_firestore.js';
import { 
    initialize as megaInitialize, 
    createFolder as megaCreateFolder, 
    findFolder as megaFindFolder, 
    uploadFile as megaUploadFile,
    getFolderContents, 
    getMegaStorage
} from './mega_service.js';

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

// --- MEGA Migration Dashboard ---
export function displayMegaMigrationDashboard(containerElement) {
    if (!currentUser || !currentUser.isAdmin) {
        containerElement.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`;
        return;
    }

    containerElement.innerHTML = `
        <div class="content-card">
            <h2 class="text-2xl font-bold text-primary-700 dark:text-primary-300 mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0v6m0-6h6m-6 0H6"></path></svg> <!-- Placeholder Icon -->
                MEGA Cloud Management
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Oversee course migration to MEGA and explore cloud-stored resources.</p>
            
            <div id="mega-migration-gamified-alert" class="mb-6"></div>

            <div class="mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">Course Migration Status</h3>
                <div class="flex justify-between items-center mb-4">
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        Review courses and start their migration to MEGA Cloud.
                    </p>
                    <button 
                        id="load-courses-mega-migration-btn"
                        class="btn-secondary-small flex items-center"
                        title="Refresh course list and statuses">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                        Refresh List
                    </button>
                </div>
                <div id="mega-migration-course-list" class="space-y-4">
                    <p class="text-gray-500 dark:text-gray-400">Loading course statuses...</p>
                </div>
            </div>
            
            <hr class="my-8 border-gray-300 dark:border-gray-600">
            
            <div id="mega-file-explorer-dynamic-container">
                <!-- MEGA File Explorer will be rendered here by displayMegaFileExplorer -->
            </div>
        </div>
    `;
    document.getElementById('load-courses-mega-migration-btn')?.addEventListener('click', loadCoursesForMegaMigration);
    
    loadCoursesForMegaMigration();
    displayMegaFileExplorer(document.getElementById('mega-file-explorer-dynamic-container')); 
}

export function loadCoursesForMegaMigration() {
    if (!currentUser || !currentUser.isAdmin) {
        console.warn("User is not admin, cannot load courses for MEGA migration.");
        const listContainer = document.getElementById('mega-migration-course-list');
        if (listContainer) listContainer.innerHTML = `<div class="p-3 text-red-700 bg-red-100 rounded dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`;
        return;
    }
    
    const listContainer = document.getElementById('mega-migration-course-list');
    const gamifiedAlertContainer = document.getElementById('mega-migration-gamified-alert');
    if (!listContainer || !gamifiedAlertContainer) {
        console.error("MEGA migration UI containers not found."); return;
    }

    showLoading("Surveying courses for MEGA readiness...");
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
        
        const isFullyMigrated = course.megaTranscriptionsFolderLink && course.megaPdfFolderLink && course.megaMcqFolderLink && course.megaCourseRootFolderLink; 

        let statusText = "";
        let statusColorClass = "";
        if (isFullyMigrated) {
            statusText = `Fully Migrated to MEGA Cloud`;
            statusColorClass = "text-green-600 dark:text-green-400";
        } else if (course.megaTranscriptionsFolderLink || course.megaPdfFolderLink || course.megaMcqFolderLink || course.megaTextbookFullPdfLink || course.megaCourseRootFolderLink) {
            statusText = `Partially Migrated`;
            statusColorClass = "text-yellow-600 dark:text-yellow-400";
            unmigratedCoursesCount++;
        } else {
            statusText = `Not Migrated (Local Only)`;
            statusColorClass = "text-red-600 dark:text-red-400";
            unmigratedCoursesCount++;
        }

        let buttonText = isFullyMigrated ? 'Explore Course Vault' : 'Start Migration';
        let buttonDisabled = isFullyMigrated && !course.megaCourseRootFolderLink;

        courseElement.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div class="mb-2 sm:mb-0">
                    <h4 class="font-semibold text-lg text-gray-800 dark:text-gray-200">${course.name} <span class="text-xs text-gray-500">(ID: ${course.id})</span></h4>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Local Directory: ${course.courseDirName || 'N/A'}</p>
                    <p class="text-sm mt-1 font-medium ${statusColorClass}">${statusText}</p>
                </div>
                <button 
                    id="migrate-btn-${course.id}" 
                    data-course-id="${course.id}"
                    data-is-migrated="${isFullyMigrated}"
                    data-root-link="${course.megaCourseRootFolderLink || ''}"
                    class="${isFullyMigrated && course.megaCourseRootFolderLink ? 'btn-secondary' : 'btn-primary'} whitespace-nowrap migrate-explore-btn">
                    ${isFullyMigrated && course.megaCourseRootFolderLink ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0v6m0-6h6m-6 0H6"></path></svg>`}
                    ${buttonText}
                </button>
            </div>
            <div id="migration-status-${course.id}" class="text-xs mt-2 text-gray-600 dark:text-gray-400"></div>
            <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-xs space-y-1">
                <p><strong>Root:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline mega-link-span" data-link="${course.megaCourseRootFolderLink || ''}" title="Explore Root Folder">${course.megaCourseRootFolderLink || 'Not Set'}</span></p>
                <p><strong>Transcripts:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline mega-link-span" data-link="${course.megaTranscriptionsFolderLink || ''}" title="Explore Transcripts">${course.megaTranscriptionsFolderLink || 'Not Set'}</span></p>
                <p><strong>Textbook PDFs:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline mega-link-span" data-link="${course.megaPdfFolderLink || ''}" title="Explore Textbook PDFs">${course.megaPdfFolderLink || 'Not Set'}</span></p>
                <p><strong>Generated Qs:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline mega-link-span" data-link="${course.megaMcqFolderLink || ''}" title="Explore Generated Questions">${course.megaMcqFolderLink || 'Not Set'}</span></p>
            </div>
        `;
        listContainer.appendChild(courseElement);
    });
    
    document.querySelectorAll('.migrate-explore-btn').forEach(button => {
        button.disabled = (button.dataset.isMigrated === 'true' && !button.dataset.rootLink);
        button.addEventListener('click', (e) => {
            const courseId = e.currentTarget.dataset.courseId;
            const isMigrated = e.currentTarget.dataset.isMigrated === 'true';
            const rootLink = e.currentTarget.dataset.rootLink;
            if (isMigrated) {
                if (rootLink) {
                    displayMegaFileExplorer(document.getElementById('mega-file-explorer-dynamic-container'), rootLink);
                } else {
                    alert('Course vault link uncharted. Re-migration might be needed.');
                }
            } else {
                startMegaMigration(courseId);
            }
        });
    });
    document.querySelectorAll('.mega-link-span').forEach(span => {
        span.addEventListener('click', (e) => {
            const link = e.currentTarget.dataset.link;
            if (link && link !== 'Not Set') { // Ensure link is valid before calling
                displayMegaFileExplorer(document.getElementById('mega-file-explorer-dynamic-container'), link);
            }
        });
    });
    
    if (unmigratedCoursesCount > 0) {
        gamifiedAlertContainer.innerHTML = `
            <div class="p-4 mb-4 text-sm text-blue-700 bg-blue-100 rounded-lg dark:bg-blue-200 dark:text-blue-800 flex items-center" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v1.586M12 12.253v1.586M12 18.253v1.586M7.5 12.253h1.586M13.5 12.253h1.586M16.732 7.96a4.5 4.5 0 010 6.364M5.268 7.96a4.5 4.5 0 000 6.364m11.464-6.364a4.5 4.5 0 00-6.364 0m6.364 0a4.5 4.5 0 010 6.364m-6.364-6.364L12 12.253" /></svg> <!-- Rocket Icon -->
                <span class="font-medium">Action Required:</span> ${unmigratedCoursesCount} course(s) are pending migration to the MEGA Cloud. Start migration for unparalleled access and durability!
            </div>
        `;
    }
    hideLoading();
}

export async function startMegaMigration(courseId) {
    if (!currentUser || !currentUser.isAdmin) {
        alert("Access Denied. Admin privileges required."); return;
    }
    const statusContainer = document.getElementById(`migration-status-${courseId}`);
    const migrateButton = document.getElementById(`migrate-btn-${courseId}`);

    try {
        // Removed megaEmail and megaPassword prompts

        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Connecting to MEGA...</p>`;
        if (migrateButton) migrateButton.disabled = true;

        const megaInstance = await megaInitialize(); // Call without arguments
        if (!megaInstance || !megaInstance.root) {
            throw new Error("MEGA connection failed or root directory not found.");
        }
        console.log("[Migration] Connection to MEGA established. Root:", megaInstance.root.name);

        const course = globalCourseDataMap.get(courseId);
        if (!course) throw new Error(`Course data for ID ${courseId} not found.`);
        
        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Preparing ${course.name} for migration...</p>`;

        const lyceumRootFolderName = "LyceumCourses_Test";
        const courseMegaFolderName = course.courseDirName || `course_${course.id.replace(/\s+/g, '_')}`;
        const transcriptionsFolderName = "Transcriptions_Archive";
        const textbookPdfsFolderName = "Textbook_Chapter_Vault";
        const generatedQuestionsFolderName = "Generated_Assessments";

        let lyceumRootNode = await megaFindFolder(lyceumRootFolderName, megaInstance.root);
        if (!lyceumRootNode) lyceumRootNode = await megaCreateFolder(lyceumRootFolderName, megaInstance.root);
        if (!lyceumRootNode) throw new Error(`Failed to create Lyceum root folder: ${lyceumRootFolderName}`);

        let courseMainNode = await megaFindFolder(courseMegaFolderName, lyceumRootNode);
        if (!courseMainNode) courseMainNode = await megaCreateFolder(courseMegaFolderName, lyceumRootNode);
        if (!courseMainNode) throw new Error(`Failed to create course folder: ${courseMegaFolderName}`);
        const courseRootLink = await courseMainNode.link({ key: courseMainNode.key });

        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Course folder created. Creating standard folders...</p>`;
        const placeholderContent = `This data module was established during automated course deployment on ${new Date().toISOString()}.\nAll relevant data for this category will be archived here.`;
        const placeholderFileName = "README_Archive_Log.txt";

        const createAndUploadPlaceholderLocal = async (folderName, parent) => { // Renamed to avoid conflict
            let node = await megaFindFolder(folderName, parent);
            if (!node) node = await megaCreateFolder(folderName, parent);
            if (!node) throw new Error(`Failed to deploy module: ${folderName}`);
            const placeholderFile = await createPlaceholderFile(placeholderFileName, placeholderContent); // local helper
            await megaUploadFile(placeholderFile, placeholderFileName, node); 
            return node.link({key: node.key});
        };

        const transcriptionsFolderLink = await createAndUploadPlaceholderLocal(transcriptionsFolderName, courseMainNode);
        const pdfsFolderLink = await createAndUploadPlaceholderLocal(textbookPdfsFolderName, courseMainNode);
        const mcqsFolderLink = await createAndUploadPlaceholderLocal(generatedQuestionsFolderName, courseMainNode);

        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Standard folders created. Updating database...</p>`;
        const updates = {
            megaCourseRootFolderLink: courseRootLink,
            megaTranscriptionsFolderLink: transcriptionsFolderLink,
            megaPdfFolderLink: pdfsFolderLink,
            megaMcqFolderLink: mcqsFolderLink,
        };
        const success = await updateCourseDefinition(courseId, updates);

        if (success) {
            const updatedCourseData = { ...globalCourseDataMap.get(courseId), ...updates };
            globalCourseDataMap.set(courseId, updatedCourseData);
            if (statusContainer) statusContainer.innerHTML = `<p class="text-green-600 dark:text-green-400">Migration Complete: Course '${course.name}' successfully migrated.</p>`;
            loadCoursesForMegaMigration(); 
        } else {
            throw new Error("Failed to update database (Firestore course definition).");
        }
    } catch (error) {
        console.error(`[Migration] Error for course ${courseId}:`, error);
        if (statusContainer) statusContainer.innerHTML = `<p class="text-red-600 dark:text-red-400">Migration Failed: ${error.message}</p>`;
        if (migrateButton) migrateButton.disabled = false; 
        alert(`Migration for course ${courseId} failed: ${error.message}`);
    }
}

// --- MEGA File Explorer ---
let currentMegaExplorerPath = []; 
let currentMegaExplorerNode = null; 

export async function handleMegaFileDownload(fileName, fileLink) {
    if (!fileLink) { alert("File link unavailable. Cannot start download."); return; }
    console.log(`[Explorer] Initiating download for: ${fileName} from ${fileLink}`);
    showLoading(`Preparing ${fileName} for download...`);
    try {
        window.open(fileLink + (fileLink.includes('?') ? '&d=1' : '?d=1'), '_blank'); 
        alert(`Download for "${fileName}" initiated. Your system will receive the data stream.`);
    } catch (error) {
        console.error(`[Explorer] Download failed for ${fileName}:`, error);
        alert(`Download error: ${error.message}`);
    } finally {
        hideLoading();
    }
}

export async function handleMegaFileUpload(event) { 
    const fileInput = event.target;
    const file = fileInput.files[0];
    if (!file) { alert("No file selected for upload."); return; }
    if (!currentMegaExplorerNode) { 
        alert("Target MEGA folder not specified. Transmission aborted."); return;
    }

    console.log(`[Explorer] Uploading file "${file.name}" to folder "${currentMegaExplorerNode.name}"`);
    showLoading(`Uploading ${file.name}...`);
    const feedbackEl = document.getElementById('mega-explorer-feedback');
    if (feedbackEl) feedbackEl.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Uploading ${file.name} to folder ${currentMegaExplorerNode.name}...</p>`;

    try {
        const uploadedFile = await megaUploadFile(file, file.name, currentMegaExplorerNode); 
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-green-600 dark:text-green-400">File "${uploadedFile.name}" successfully uploaded to ${currentMegaExplorerNode.name}.</p>`;
        console.log(`[Explorer] Upload complete:`, uploadedFile);
        let currentFolderLink = null;
        if (currentMegaExplorerPath.length > 0) {
            currentFolderLink = currentMegaExplorerPath[currentMegaExplorerPath.length - 1].link;
        } else if (currentMegaExplorerNode && getMegaStorage() && currentMegaExplorerNode.nodeId === getMegaStorage().root.nodeId) {
             currentFolderLink = null; 
        }
        renderMegaFolderContents(currentMegaExplorerNode, currentFolderLink);
    } catch (error) {
        console.error(`[Explorer] Upload error:`, error);
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600 dark:text-red-400">Upload error: ${error.message}</p>`;
        alert(`File upload failed: ${error.message}`);
    } finally {
        hideLoading();
        fileInput.value = null; 
    }
}

async function renderMegaFolderContents(folderNode, folderLinkForPath) {
    const fileListDiv = document.getElementById('mega-file-list');
    const currentPathDiv = document.getElementById('mega-current-path');
    const parentFolderButton = document.getElementById('mega-parent-folder-btn');
    const feedbackEl = document.getElementById('mega-explorer-feedback');
    const uploadSection = document.getElementById('mega-upload-section');

    if (!fileListDiv || !currentPathDiv || !parentFolderButton || !uploadSection) {
        console.error("[Explorer] Core navigation or display modules are offline."); return;
    }
    
    fileListDiv.innerHTML = `<p class="text-gray-500 dark:text-gray-400 p-3"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Loading folder contents...</p>`;
    showLoading("Loading folder contents...");

    try {
        currentMegaExplorerNode = folderNode; 
        const contents = await getFolderContents(folderNode); 

        const activeMegaStorage = getMegaStorage();
        const currentFolderIsRoot = folderNode.nodeId === (activeMegaStorage && activeMegaStorage.root ? activeMegaStorage.root.nodeId : '---nevermatch---');

        if (!currentMegaExplorerPath.find(p => p.nodeId === folderNode.nodeId)) {
             const linkToUse = folderLinkForPath !== undefined ? folderLinkForPath : (typeof folderNode.link === 'function' ? await folderNode.link({key:folderNode.key}) : folderNode.link);
             currentMegaExplorerPath.push({ name: folderNode.name || (currentFolderIsRoot ? 'Cloud Root' : 'Sector'), nodeId: folderNode.nodeId, link: linkToUse });
        }
        
        currentPathDiv.innerHTML = currentMegaExplorerPath.map((p, index) => 
            `<span class="text-primary-600 dark:text-primary-400 cursor-pointer hover:underline mega-path-segment-btn" data-path-index="${index}">${p.name}</span>`
        ).join('<span class="mx-1 text-gray-400">/</span>');
        
        document.querySelectorAll('.mega-path-segment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => navigateToMegaPathIndex(parseInt(e.currentTarget.dataset.pathIndex)));
        });

        parentFolderButton.classList.toggle('hidden', currentMegaExplorerPath.length <= 1 || currentFolderIsRoot);
        parentFolderButton.onclick = null; 
        parentFolderButton.addEventListener('click', navigateToMegaParentFolder);
        
        if (contents.length === 0) {
            fileListDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-3 italic">Folder is empty.</p>';
        } else {
            fileListDiv.innerHTML = `<ul class="divide-y divide-gray-200 dark:divide-gray-700">
                ${contents.map(item => `
                    <li class="py-3 px-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md group">
                        <div class="flex items-center min-w-0">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 ${item.type === 'folder' ? 'text-yellow-500' : 'text-gray-400'} mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                ${item.type === 'folder' 
                                    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />' 
                                    : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />'}
                            </svg>
                            <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-primary-600" title="${item.name}">${item.name}</span>
                        </div>
                        <div class="flex items-center space-x-2 ml-2">
                            <span class="text-xs text-gray-500 dark:text-gray-400">${item.size !== undefined ? (item.size / 1024).toFixed(2) + ' KB' : ''}</span>
                            ${item.type === 'folder' 
                                ? `<button class="btn-secondary-xs mega-open-folder-btn" data-link="${item.link}" data-name="${item.name}" data-node-id="${item.nodeId}">Open Sector</button>`
                                : `<button class="btn-secondary-xs mega-download-file-btn" data-name="${escape(item.name)}" data-link="${item.link}">Download</button>`}
                            <a href="${item.link || '#'}" target="_blank" class="btn-link-xs ${!item.link ? 'disabled-link' : ''}" title="Access via Public Gateway (New Tab)">Gateway</a>
                        </div>
                    </li>
                `).join('')}</ul>`;

            document.querySelectorAll('.mega-open-folder-btn').forEach(btn => btn.addEventListener('click', (e) => loadMegaFolderByLink(e.currentTarget.dataset.link, e.currentTarget.dataset.name, e.currentTarget.dataset.nodeId)));
            document.querySelectorAll('.mega-download-file-btn').forEach(btn => btn.addEventListener('click', (e) => handleMegaFileDownload(e.currentTarget.dataset.name, e.currentTarget.dataset.link)));
        }
        
        const fileUploadInput = document.getElementById('mega-file-upload-input');
        const uploadButton = document.getElementById('mega-upload-button');
        uploadButton.onclick = null; 
        uploadButton.addEventListener('click', () => handleMegaFileUpload({ target: fileUploadInput }));

        uploadSection.classList.remove('hidden');
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-green-600 dark:text-green-400">Loaded contents of "${folderNode.name || (currentFolderIsRoot ? 'Cloud Root' : 'Sector')}".</p>`;
    } catch (error) {
        console.error("[Explorer] Error rendering folder contents:", error);
        fileListDiv.innerHTML = `<p class="text-red-600 dark:text-red-400 p-3">Error loading folder contents: ${error.message}</p>`;
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600 dark:text-red-400">Error: ${error.message}</p>`;
    } finally {
        hideLoading();
    }
}

export async function loadMegaFolderByLink(folderLink, folderName = null, folderNodeId = null) {
    const feedbackEl = document.getElementById('mega-explorer-feedback');
    let activeMegaStorage = getMegaStorage(); // Use let as it might be reassigned
    if (!activeMegaStorage || !activeMegaStorage.root) {
        // Removed megaEmail and megaPassword prompts
        try {
            showLoading("Establishing connection to MEGA...");
            activeMegaStorage = await megaInitialize(); // Call without arguments and reassign
            hideLoading();
        } catch (initError) {
            hideLoading();
            if(feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600 dark:text-red-400">MEGA Connection Failed: ${initError.message}</p>`;
            alert(`MEGA Connection Failed: ${initError.message}`); return;
        }
    }
    // Ensure activeMegaStorage is referenced correctly after potential re-initialization
    if (!activeMegaStorage || !activeMegaStorage.root) { // Add this check
        alert("MEGA service could not be initialized. Cannot proceed."); return;
    }


    if (!folderLink && !(activeMegaStorage && activeMegaStorage.root)) {
        alert("Folder link missing and MEGA root not initialized."); return;
    }
    
    let targetNode;
    let linkToUseForPath = folderLink;

    if (!folderLink || folderLink === 'null') { 
        console.log("[Explorer] No folder link, defaulting to MEGA Root.");
        if (!activeMegaStorage || !activeMegaStorage.root) {
             alert("MEGA service not initialized. Cannot default to root."); return;
        }
        targetNode = activeMegaStorage.root;
        currentMegaExplorerPath = []; 
        linkToUseForPath = null; 
    } else {
        console.log(`[Explorer] Loading folder: ${folderLink}`);
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Loading folder...</p>`;
        try {
            if (!activeMegaStorage) throw new Error("MEGA Storage not available for URL parsing.");
            targetNode = activeMegaStorage.File.fromURL(folderLink);
            if (targetNode && typeof targetNode.loadAttributes === 'function') {
                await targetNode.loadAttributes(); 
            }
            if (!targetNode || !targetNode.directory) {
                 throw new Error("The provided link is not a valid folder.");
            }
            
            const existingPathIndex = currentMegaExplorerPath.findIndex(p => p.nodeId === targetNode.nodeId);
            if (existingPathIndex !== -1) { 
                currentMegaExplorerPath = currentMegaExplorerPath.slice(0, existingPathIndex); 
            } else if (folderNodeId && currentMegaExplorerPath.some(p=> p.nodeId === currentMegaExplorerNode?.nodeId) && currentMegaExplorerNode?.nodeId !== targetNode.nodeId) {
                // Subfolder navigation, path is fine
            } else { 
                 currentMegaExplorerPath = [];
            }
        } catch (error) {
            console.error(`[Explorer] Error loading folder ${folderLink}:`, error);
            if(feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600 dark:text-red-400">Navigation failed: ${error.message}</p>`;
            alert(`Error loading folder: ${error.message}`);
            document.getElementById('mega-file-list').innerHTML = `<p class="text-red-600 dark:text-red-400 p-3">Error loading folder: ${error.message}</p>`;
            return;
        }
    }
    renderMegaFolderContents(targetNode, linkToUseForPath);
}

export function navigateToMegaPathIndex(index) {
    if (index < 0 || index >= currentMegaExplorerPath.length) {
        console.warn("[Explorer] Invalid path index:", index); return;
    }
    const { link, name, nodeId } = currentMegaExplorerPath[index];
    currentMegaExplorerPath = currentMegaExplorerPath.slice(0, index); 
    
    if (link && link !== 'null') {
        loadMegaFolderByLink(link, name, nodeId);
    } else if (nodeId === (getMegaStorage() && getMegaStorage().root ? getMegaStorage().root.nodeId : '---nevermatch---')) {
        loadMegaFolderByLink(null); 
    } else {
        alert("Cannot navigate to this folder (link missing and not MEGA Root).");
    }
}

export function navigateToMegaParentFolder() {
    if (currentMegaExplorerPath.length > 1) {
        currentMegaExplorerPath.pop(); 
        const parent = currentMegaExplorerPath.pop(); 
        if (parent.link && parent.link !== 'null') {
            loadMegaFolderByLink(parent.link, parent.name, parent.nodeId);
        } else if (parent.nodeId === (getMegaStorage() && getMegaStorage().root ? getMegaStorage().root.nodeId : '---nevermatch---')) {
             loadMegaFolderByLink(null); 
        } else {
            console.warn("[Explorer] Parent folder has no link and is not MEGA Root. Defaulting to Root.");
            loadMegaFolderByLink(null);
        }
    } else { 
        console.log("[Explorer] At MEGA Root or cannot go further up. Loading Root.");
        loadMegaFolderByLink(null);
    }
}

export function displayMegaFileExplorer(containerElement, initialFolderLink = null) {
    containerElement.innerHTML = `
        <div class="content-card p-6 mt-6">
            <h3 class="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H5a2 2 0 00-2 2v5a2 2 0 002 2z"></path></svg> <!-- Folder Icon -->
                MEGA File Explorer
            </h3>
            <div class="space-y-4">
                <div>
                    <label for="mega-folder-link-input" class="label">MEGA Folder Link (or leave blank for root):</label>
                    <div class="flex space-x-2 mt-1">
                        <input type="text" id="mega-folder-link-input" class="input-field flex-grow" placeholder="Enter MEGA folder link or leave blank for root" value="${initialFolderLink || ''}">
                        <button id="load-mega-folder-btn" class="btn-primary flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> <!-- Search Icon -->
                            Load Folder
                        </button>
                    </div>
                </div>
                <div class="flex items-center justify-between py-2">
                    <button id="mega-parent-folder-btn" class="btn-secondary-small hidden flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10v10a2 2 0 002 2h14a2 2 0 002-2V10M3 10l9-9 9 9m-9 9v-4"></path></svg> <!-- Home/Up Icon -->
                        Parent Folder
                    </button>
                    <div id="mega-current-path" class="text-sm text-gray-500 dark:text-gray-400 truncate flex-grow ml-2">Current Path: /</div>
                </div>
                <div id="mega-file-list" class="min-h-[200px] max-h-[450px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-gray-50 dark:bg-gray-700/50 shadow-inner">
                    <p class="text-gray-500 dark:text-gray-400 p-3">Enter a folder link or initialize MEGA to browse files.</p>
                </div>
                <div id="mega-upload-section" class="pt-4 border-t border-gray-200 dark:border-gray-600 hidden">
                    <label for="mega-file-upload-input" class="label mb-1">Upload File to Current Folder:</label>
                    <div class="flex space-x-2">
                        <input type="file" id="mega-file-upload-input" class="input-field file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 dark:file:bg-primary-700 file:text-primary-700 dark:file:text-primary-100 hover:file:bg-primary-100 dark:hover:file:bg-primary-600 flex-grow">
                        <button id="mega-upload-button" class="btn-primary-small flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg> <!-- Upload Icon -->
                            Upload
                        </button>
                    </div>
                </div>
                <div id="mega-explorer-feedback" class="text-xs text-gray-500 dark:text-gray-400 mt-2 min-h-[20px]"></div>
            </div>
        </div>`;

    document.getElementById('load-mega-folder-btn').addEventListener('click', () => {
        const link = document.getElementById('mega-folder-link-input').value.trim();
        currentMegaExplorerPath = []; 
        loadMegaFolderByLink(link || null); 
    });
    
    const uploadInput = document.getElementById('mega-file-upload-input');
    document.getElementById('mega-upload-button').addEventListener('click', () => {
         handleMegaFileUpload({ target: uploadInput }); 
    });

    if (initialFolderLink) {
        currentMegaExplorerPath = []; 
        loadMegaFolderByLink(initialFolderLink);
    } else {
         const activeMegaStorage = getMegaStorage();
         if (activeMegaStorage && activeMegaStorage.root) { 
            currentMegaExplorerPath = [];
            renderMegaFolderContents(activeMegaStorage.root, null);
         } else { 
            document.getElementById('mega-file-list').innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-3">Initialize MEGA by providing credentials (e.g., via Migration tool) or enter a folder link to start browsing.</p>';
         }
    }
}

// Note: The functions loadMegaFolderByLink, handleMegaFileDownload, navigateToMegaPathIndex, 
// and navigateToMegaParentFolder are called by event listeners attached dynamically in renderMegaFolderContents
// or by the event listener for 'load-mega-folder-btn'. They don't need to be on window if this module structure is maintained.
// However, they are exported for now in case other parts of the system might need to call them directly.
// If their usage is confirmed to be ONLY within this module's event listeners, their export can be removed.
// For this refactoring, keeping them exported is safer if their external usage isn't fully mapped.
// The key is that `admin_course_content.js` will now import `displayMegaMigrationDashboard` and `displayMegaFileExplorer`.
