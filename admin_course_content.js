// admin_course_content.js
import { globalCourseDataMap, currentUser } from './state.js';
import { showLoading, hideLoading } from './utils.js';
import { updateCourseDefinition, getCourseDetails } from './firebase_firestore.js';
import { 
    initialize as megaInitialize, 
    createFolder as megaCreateFolder, 
    findFolder as megaFindFolder, 
    uploadFile as megaUploadFile,
    getFolderContents, 
    downloadFile as megaDownloadFileService, 
    megaStorage 
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
function displayMegaMigrationDashboard(containerElement) {
    if (!currentUser || !currentUser.isAdmin) {
        containerElement.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`;
        return;
    }

    containerElement.innerHTML = `
        <div class="content-card">
            <h2 class="text-2xl font-bold text-primary-700 dark:text-primary-300 mb-6 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0v6m0-6h6m-6 0H6"></path></svg> <!-- Placeholder Icon -->
                MEGA Cloud Command Center
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Oversee course migration to MEGA and explore cloud-stored resources.</p>
            
            <div id="mega-migration-gamified-alert" class="mb-6"></div>

            <div class="mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3">Course Migration Status</h3>
                <div class="flex justify-between items-center mb-4">
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        Review courses and initiate their voyage to the MEGA Cloud.
                    </p>
                    <button 
                        onclick="window.loadCoursesForMegaMigration()" 
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
    loadCoursesForMegaMigration();
    displayMegaFileExplorer(document.getElementById('mega-file-explorer-dynamic-container')); 
}

function loadCoursesForMegaMigration() {
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
            statusText = `Partially Anchored on MEGA`;
            statusColorClass = "text-yellow-600 dark:text-yellow-400";
            unmigratedCoursesCount++;
        } else {
            statusText = `Awaiting Maiden Voyage (Local Only)`;
            statusColorClass = "text-red-600 dark:text-red-400";
            unmigratedCoursesCount++;
        }

        let buttonText = isFullyMigrated ? 'Explore Course Vault' : 'Initiate MEGA Voyage';
        let buttonAction = isFullyMigrated 
            ? (course.megaCourseRootFolderLink ? `window.displayMegaFileExplorer(document.getElementById('mega-file-explorer-dynamic-container'), '${course.megaCourseRootFolderLink}')` : `alert('Course vault link uncharted. Re-migration might be needed.')`)
            : `window.startMegaMigration('${course.id}')`;
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
                    onclick="${buttonAction}" 
                    class="${isFullyMigrated && course.megaCourseRootFolderLink ? 'btn-secondary' : 'btn-primary'} whitespace-nowrap"
                    ${buttonDisabled ? 'disabled' : ''}>
                    ${isFullyMigrated && course.megaCourseRootFolderLink ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0v6m0-6h6m-6 0H6"></path></svg>`}
                    ${buttonText}
                </button>
            </div>
            <div id="migration-status-${course.id}" class="text-xs mt-2 text-gray-600 dark:text-gray-400"></div>
            <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-xs space-y-1">
                <p><strong>Root:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline" title="Explore Root Folder" onclick="window.displayMegaFileExplorer(document.getElementById('mega-file-explorer-dynamic-container'), '${course.megaCourseRootFolderLink || ''}')">${course.megaCourseRootFolderLink || 'Not Set'}</span></p>
                <p><strong>Transcripts:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline" title="Explore Transcripts" onclick="window.displayMegaFileExplorer(document.getElementById('mega-file-explorer-dynamic-container'), '${course.megaTranscriptionsFolderLink || ''}')">${course.megaTranscriptionsFolderLink || 'Not Set'}</span></p>
                <p><strong>Textbook PDFs:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline" title="Explore Textbook PDFs" onclick="window.displayMegaFileExplorer(document.getElementById('mega-file-explorer-dynamic-container'), '${course.megaPdfFolderLink || ''}')">${course.megaPdfFolderLink || 'Not Set'}</span></p>
                <p><strong>Generated Qs:</strong> <span class="font-mono text-gray-600 dark:text-gray-300 break-all cursor-pointer hover:underline" title="Explore Generated Questions" onclick="window.displayMegaFileExplorer(document.getElementById('mega-file-explorer-dynamic-container'), '${course.megaMcqFolderLink || ''}')">${course.megaMcqFolderLink || 'Not Set'}</span></p>
            </div>
        `;
        listContainer.appendChild(courseElement);
    });
    
    if (unmigratedCoursesCount > 0) {
        gamifiedAlertContainer.innerHTML = `
            <div class="p-4 mb-4 text-sm text-blue-700 bg-blue-100 rounded-lg dark:bg-blue-200 dark:text-blue-800 flex items-center" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v1.586M12 12.253v1.586M12 18.253v1.586M7.5 12.253h1.586M13.5 12.253h1.586M16.732 7.96a4.5 4.5 0 010 6.364M5.268 7.96a4.5 4.5 0 000 6.364m11.464-6.364a4.5 4.5 0 00-6.364 0m6.364 0a4.5 4.5 0 010 6.364m-6.364-6.364L12 12.253" /></svg> <!-- Rocket Icon -->
                <span class="font-medium">Mission Control Update!</span> ${unmigratedCoursesCount} course(s) are awaiting their voyage to the MEGA Cloud. Launch them for unparalleled access and durability!
            </div>
        `;
    }
    hideLoading();
}

async function startMegaMigration(courseId) {
    if (!currentUser || !currentUser.isAdmin) {
        alert("Access Denied. Admin privileges required."); return;
    }
    const statusContainer = document.getElementById(`migration-status-${courseId}`);
    const migrateButton = document.getElementById(`migrate-btn-${courseId}`);

    try {
        const megaEmail = prompt("Enter your MEGA email for this voyage:");
        if (!megaEmail) { alert("MEGA email is required."); return; }
        const megaPassword = prompt("Enter your MEGA password:");
        if (!megaPassword) { alert("MEGA password is required."); return; }

        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Contacting MEGA Starbase...</p>`;
        if (migrateButton) migrateButton.disabled = true;

        const megaInstance = await megaInitialize(megaEmail, megaPassword);
        if (!megaInstance || !megaInstance.root) {
            throw new Error("MEGA Starbase connection failed or root directory uncharted.");
        }
        console.log("[Migration] Connection to MEGA Starbase established. Root:", megaInstance.root.name);

        const course = globalCourseDataMap.get(courseId);
        if (!course) throw new Error(`Course log for ID ${courseId} not found.`);
        
        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Preparing ${course.name} for hyperspace jump...</p>`;

        const lyceumRootFolderName = "LyceumCourses_Test";
        const courseMegaFolderName = course.courseDirName || `course_${course.id.replace(/\s+/g, '_')}`;
        const transcriptionsFolderName = "Transcriptions_Archive"; // Updated name
        const textbookPdfsFolderName = "Textbook_Chapter_Vault"; // Updated name
        const generatedQuestionsFolderName = "Generated_Assessments"; // Updated name

        let lyceumRootNode = await megaFindFolder(lyceumRootFolderName, megaInstance.root);
        if (!lyceumRootNode) lyceumRootNode = await megaCreateFolder(lyceumRootFolderName, megaInstance.root);
        if (!lyceumRootNode) throw new Error(`Failed to chart Lyceum Quadrant: ${lyceumRootFolderName}`);

        let courseMainNode = await megaFindFolder(courseMegaFolderName, lyceumRootNode);
        if (!courseMainNode) courseMainNode = await megaCreateFolder(courseMegaFolderName, lyceumRootNode);
        if (!courseMainNode) throw new Error(`Failed to establish course sector: ${courseMegaFolderName}`);
        const courseRootLink = await courseMainNode.link({ key: courseMainNode.key });

        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Course sector secured. Deploying standard data modules...</p>`;
        const placeholderContent = `This data module was established during automated course deployment on ${new Date().toISOString()}.\nAll relevant data for this category will be archived here.`;
        const placeholderFileName = "README_Archive_Log.txt";

        const createAndUploadPlaceholder = async (folderName, parent) => {
            let node = await megaFindFolder(folderName, parent);
            if (!node) node = await megaCreateFolder(folderName, parent);
            if (!node) throw new Error(`Failed to deploy module: ${folderName}`);
            const placeholderFile = await createPlaceholderFile(placeholderFileName, placeholderContent);
            await megaUploadFile(placeholderFile, placeholderFileName, node); 
            return node.link({key: node.key});
        };

        const transcriptionsFolderLink = await createAndUploadPlaceholder(transcriptionsFolderName, courseMainNode);
        const pdfsFolderLink = await createAndUploadPlaceholder(textbookPdfsFolderName, courseMainNode);
        const mcqsFolderLink = await createAndUploadPlaceholder(generatedQuestionsFolderName, courseMainNode);

        if (statusContainer) statusContainer.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Data modules deployed. Updating star charts (Firestore)...</p>`;
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
            if (statusContainer) statusContainer.innerHTML = `<p class="text-green-600 dark:text-green-400">🚀 Mission Accomplished! Course '${course.name}' has successfully journeyed to the MEGAverse!</p>`;
            loadCoursesForMegaMigration(); 
        } else {
            throw new Error("Failed to update star charts (Firestore course definition).");
        }
    } catch (error) {
        console.error(`[Migration] Error for course ${courseId}:`, error);
        if (statusContainer) statusContainer.innerHTML = `<p class="text-red-600 dark:text-red-400">🛑 Mission Aborted: ${error.message}</p>`;
        if (migrateButton) migrateButton.disabled = false; 
        alert(`Migration voyage for course ${courseId} failed: ${error.message}`);
    }
}

// --- MEGA File Explorer ---
// (Code from previous step, ensure thematic text and UI consistency is reviewed here too)
let currentMegaExplorerPath = []; 
let currentMegaExplorerNode = null; 

async function handleMegaFileDownload(fileName, fileLink) {
    if (!fileLink) { alert("File link unavailable. Cannot initiate download warp sequence."); return; }
    console.log(`[Explorer] Transmitting download coordinates for: ${fileName} from ${fileLink}`);
    showLoading(`Preparing ${fileName} for teleportation...`);
    try {
        window.open(fileLink + (fileLink.includes('?') ? '&d=1' : '?d=1'), '_blank'); 
        alert(`Teleportation of "${fileName}" initiated. Your system will receive the data stream.`);
    } catch (error) {
        console.error(`[Explorer] Download teleportation failed for ${fileName}:`, error);
        alert(`Teleportation error: ${error.message}`);
    } finally {
        hideLoading();
    }
}

async function handleMegaFileUpload(event) { // Removed targetFolderNodeToRefresh, will use currentMegaExplorerNode
    const fileInput = event.target;
    const file = fileInput.files[0];
    if (!file) { alert("No data packet selected for transmission."); return; }
    if (!currentMegaExplorerNode) { 
        alert("Target MEGA sector not identified. Transmission aborted."); return;
    }

    console.log(`[Explorer] Transmitting data packet "${file.name}" to MEGA sector "${currentMegaExplorerNode.name}"`);
    showLoading(`Transmitting ${file.name}...`);
    const feedbackEl = document.getElementById('mega-explorer-feedback');
    if (feedbackEl) feedbackEl.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Transmitting ${file.name} to sector ${currentMegaExplorerNode.name}...</p>`;

    try {
        const uploadedFile = await megaUploadFile(file, file.name, currentMegaExplorerNode); 
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-green-600 dark:text-green-400">Data packet "${uploadedFile.name}" successfully docked at ${currentMegaExplorerNode.name}.</p>`;
        console.log(`[Explorer] File transmission complete:`, uploadedFile);
        // Refresh current folder view by re-rendering with the current node.
        // The link for path reconstruction is tricky if currentMegaExplorerNode is root.
        let currentFolderLink = null;
        if (currentMegaExplorerPath.length > 0) {
            currentFolderLink = currentMegaExplorerPath[currentMegaExplorerPath.length - 1].link;
        } else if (currentMegaExplorerNode && currentMegaExplorerNode.nodeId === megaStorage.root.nodeId) {
             currentFolderLink = null; // Explicitly null for root
        }
        renderMegaFolderContents(currentMegaExplorerNode, currentFolderLink);
    } catch (error) {
        console.error(`[Explorer] Transmission error:`, error);
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600 dark:text-red-400">Transmission error: ${error.message}</p>`;
        alert(`Data packet transmission failed: ${error.message}`);
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
    
    fileListDiv.innerHTML = `<p class="text-gray-500 dark:text-gray-400 p-3"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Scanning sector contents...</p>`;
    showLoading("Scanning MEGA sector...");

    try {
        currentMegaExplorerNode = folderNode; 
        const contents = await getFolderContents(folderNode); 

        const currentFolderIsRoot = folderNode.nodeId === (megaStorage && megaStorage.root ? megaStorage.root.nodeId : '---nevermatch---');

        if (!currentMegaExplorerPath.find(p => p.nodeId === folderNode.nodeId)) {
             const linkToUse = folderLinkForPath !== undefined ? folderLinkForPath : (typeof folderNode.link === 'function' ? await folderNode.link({key:folderNode.key}) : folderNode.link);
             currentMegaExplorerPath.push({ name: folderNode.name || (currentFolderIsRoot ? 'Cloud Root' : 'Sector'), nodeId: folderNode.nodeId, link: linkToUse });
        }
        
        currentPathDiv.innerHTML = currentMegaExplorerPath.map((p, index) => 
            `<span class="text-primary-600 dark:text-primary-400 cursor-pointer hover:underline" onclick="window.navigateToMegaPathIndex(${index})">${p.name}</span>`
        ).join('<span class="mx-1 text-gray-400">/</span>');

        parentFolderButton.classList.toggle('hidden', currentMegaExplorerPath.length <= 1 || currentFolderIsRoot);
        parentFolderButton.onclick = () => window.navigateToMegaParentFolder();
        
        if (contents.length === 0) {
            fileListDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-3 italic">Sector is clear. No objects detected.</p>';
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
                                ? `<button class="btn-secondary-xs" onclick="window.loadMegaFolderByLink('${item.link}', '${item.name}', '${item.nodeId}')">Open Sector</button>`
                                : `<button class="btn-secondary-xs" onclick="window.handleMegaFileDownload('${escape(item.name)}', '${item.link}')">Download</button>`}
                            <a href="${item.link || '#'}" target="_blank" class="btn-link-xs ${!item.link ? 'disabled-link' : ''}" title="Access via Public Gateway (New Tab)">Gateway</a>
                        </div>
                    </li>
                `).join('')}</ul>`;
        }
        
        const fileUploadInput = document.getElementById('mega-file-upload-input');
        document.getElementById('mega-upload-button').onclick = () => handleMegaFileUpload({ target: fileUploadInput });
        uploadSection.classList.remove('hidden');
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-green-600 dark:text-green-400">Sector scan complete. Displaying contents of "${folderNode.name || (currentFolderIsRoot ? 'Cloud Root' : 'Sector')}".</p>`;
    } catch (error) {
        console.error("[Explorer] Error rendering sector contents:", error);
        fileListDiv.innerHTML = `<p class="text-red-600 dark:text-red-400 p-3">Critical error scanning sector: ${error.message}</p>`;
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600 dark:text-red-400">Error: ${error.message}</p>`;
    } finally {
        hideLoading();
    }
}

async function loadMegaFolderByLink(folderLink, folderName = null, folderNodeId = null) {
    const feedbackEl = document.getElementById('mega-explorer-feedback');
    if (!megaStorage || !megaStorage.root) {
        const megaEmail = prompt("Enter MEGA Starbase email credentials:");
        if (!megaEmail) { alert("MEGA email is required for Starbase access."); return; }
        const megaPassword = prompt("Enter MEGA Starbase password:");
        if (!megaPassword) { alert("MEGA password is required."); return; }
        try {
            showLoading("Establishing connection to MEGA Starbase...");
            await megaInitialize(megaEmail, megaPassword);
            hideLoading();
        } catch (initError) {
            hideLoading();
            if(feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600 dark:text-red-400">Starbase Connection Failed: ${initError.message}</p>`;
            alert(`Starbase Connection Failed: ${initError.message}`); return;
        }
    }

    if (!folderLink && !(megaStorage && megaStorage.root)) {
        alert("Target sector link missing and Starbase root uncharted."); return;
    }
    
    let targetNode;
    let linkToUseForPath = folderLink;

    if (!folderLink || folderLink === 'null') { 
        console.log("[Explorer] No sector link, defaulting to Starbase Root.");
        targetNode = megaStorage.root;
        currentMegaExplorerPath = []; 
        linkToUseForPath = null; 
    } else {
        console.log(`[Explorer] Charting course to sector: ${folderLink}`);
        if (feedbackEl) feedbackEl.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Charting course to sector...</p>`;
        try {
            targetNode = megaStorage.File.fromURL(folderLink);
            if (targetNode && typeof targetNode.loadAttributes === 'function') {
                await targetNode.loadAttributes(); 
            }
            if (!targetNode || !targetNode.directory) {
                 throw new Error("The provided coordinates do not lead to a known sector (folder).");
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
            console.error(`[Explorer] Navigation error to sector ${folderLink}:`, error);
            if(feedbackEl) feedbackEl.innerHTML = `<p class="text-red-600 dark:text-red-400">Navigation failed: ${error.message}</p>`;
            alert(`Navigation error: ${error.message}`);
            document.getElementById('mega-file-list').innerHTML = `<p class="text-red-600 dark:text-red-400 p-3">Navigation error: ${error.message}</p>`;
            return;
        }
    }
    renderMegaFolderContents(targetNode, linkToUseForPath);
}

function navigateToMegaPathIndex(index) {
    if (index < 0 || index >= currentMegaExplorerPath.length) {
        console.warn("[Explorer] Invalid jump coordinates in path history:", index); return;
    }
    const { link, name, nodeId } = currentMegaExplorerPath[index];
    currentMegaExplorerPath = currentMegaExplorerPath.slice(0, index); 
    
    if (link && link !== 'null') {
        loadMegaFolderByLink(link, name, nodeId);
    } else if (nodeId === (megaStorage && megaStorage.root ? megaStorage.root.nodeId : '---nevermatch---')) {
        loadMegaFolderByLink(null); 
    } else {
        alert("Cannot navigate to this sector (coordinates missing and not Starbase Root).");
    }
}

function navigateToMegaParentFolder() {
    if (currentMegaExplorerPath.length > 1) {
        currentMegaExplorerPath.pop(); 
        const parent = currentMegaExplorerPath.pop(); 
        if (parent.link && parent.link !== 'null') {
            loadMegaFolderByLink(parent.link, parent.name, parent.nodeId);
        } else if (parent.nodeId === (megaStorage && megaStorage.root ? megaStorage.root.nodeId : '---nevermatch---')) {
             loadMegaFolderByLink(null); 
        } else {
            console.warn("[Explorer] Parent sector has no link and is not Starbase Root. Defaulting to Root.");
            loadMegaFolderByLink(null);
        }
    } else { 
        console.log("[Explorer] At Starbase Root or cannot go further up. Loading Root.");
        loadMegaFolderByLink(null);
    }
}

function displayMegaFileExplorer(containerElement, initialFolderLink = null) {
    containerElement.innerHTML = `
        <div class="content-card p-6 mt-6">
            <h3 class="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H5a2 2 0 00-2 2v5a2 2 0 002 2z"></path></svg> <!-- Folder Icon -->
                MEGA Cloud Navigator
            </h3>
            <div class="space-y-4">
                <div>
                    <label for="mega-folder-link-input" class="label">Navigation Coordinates (MEGA Folder Link or Blank for Root):</label>
                    <div class="flex space-x-2 mt-1">
                        <input type="text" id="mega-folder-link-input" class="input-field flex-grow" placeholder="Enter MEGA folder link or leave blank for root" value="${initialFolderLink || ''}">
                        <button id="load-mega-folder-btn" class="btn-primary flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg> <!-- Search Icon -->
                            Load Sector
                        </button>
                    </div>
                </div>
                <div class="flex items-center justify-between py-2">
                    <button id="mega-parent-folder-btn" class="btn-secondary-small hidden flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10v10a2 2 0 002 2h14a2 2 0 002-2V10M3 10l9-9 9 9m-9 9v-4"></path></svg> <!-- Home/Up Icon -->
                        Warp Upstream
                    </button>
                    <div id="mega-current-path" class="text-sm text-gray-500 dark:text-gray-400 truncate flex-grow ml-2">Current Sector: /</div>
                </div>
                <div id="mega-file-list" class="min-h-[200px] max-h-[450px] overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-gray-50 dark:bg-gray-700/50 shadow-inner">
                    <p class="text-gray-500 dark:text-gray-400 p-3">Enter coordinates or connect to Starbase to view sectors.</p>
                </div>
                <div id="mega-upload-section" class="pt-4 border-t border-gray-200 dark:border-gray-600 hidden">
                    <label for="mega-file-upload-input" class="label mb-1">Transmit Data Packet to Current Sector:</label>
                    <div class="flex space-x-2">
                        <input type="file" id="mega-file-upload-input" class="input-field file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 dark:file:bg-primary-700 file:text-primary-700 dark:file:text-primary-100 hover:file:bg-primary-100 dark:hover:file:bg-primary-600 flex-grow">
                        <button id="mega-upload-button" class="btn-primary-small flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg> <!-- Upload Icon -->
                            Transmit
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
    
    window.loadMegaFolderByLink = loadMegaFolderByLink; 
    window.handleMegaFileDownload = handleMegaFileDownload;
    window.navigateToMegaPathIndex = navigateToMegaPathIndex;
    window.navigateToMegaParentFolder = navigateToMegaParentFolder;
    
    const uploadInput = document.getElementById('mega-file-upload-input');
    document.getElementById('mega-upload-button').addEventListener('click', () => {
         handleMegaFileUpload({ target: uploadInput }); 
    });

    if (initialFolderLink) {
        currentMegaExplorerPath = []; 
        loadMegaFolderByLink(initialFolderLink);
    } else {
         if (megaStorage && megaStorage.root) { 
            currentMegaExplorerPath = [];
            renderMegaFolderContents(megaStorage.root, null);
         } else { 
            document.getElementById('mega-file-list').innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-3">Initialize MEGA by providing credentials (e.g., via Migration tool) or enter a folder link to start browsing.</p>';
         }
    }
}

// (All other existing UI functions for Transcription, PDF Processing, Q-Gen should be here from the previous file state)
// ...
// --- Lecture Transcription Automator ---
async function startLectureTranscription(youtubeUrl, courseId, chapterId) {
    console.log("Attempting to start lecture transcription with details:", { youtubeUrl, courseId, chapterId });
    const feedbackArea = document.getElementById('lecture-transcription-feedback');
    const startButton = document.getElementById('start-transcription-btn');

    if (!feedbackArea || !startButton) {
        console.error("Required UI elements (feedback area or start button) not found.");
        alert("Error: UI elements missing. Cannot proceed.");
        return;
    }

    feedbackArea.innerHTML = ''; 

    if (!youtubeUrl || !courseId || !chapterId) {
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.332-.216 3.004-1.742 3.004H4.42c-1.526 0-2.492-1.672-1.742-3.004l5.58-9.92zM10 11a1 1 0 100-2 1 1 0 000 2zm0 2a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd" /></svg>Error: YouTube URL, Course, and Chapter must be selected.</p>`;
        return;
    }

    const assemblyAiApiKey = prompt("Enter your AssemblyAI API Key (The Alchemist's Scroll):");
    if (!assemblyAiApiKey) {
        feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.332-.216 3.004-1.742 3.004H4.42c-1.526 0-2.492-1.672-1.742-3.004l5.58-9.92zM10 11a1 1 0 100-2 1 1 0 000 2zm0 2a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd" /></svg>AssemblyAI API Key is required for the transcription ritual.</p>`;
        return;
    }
    const megaEmail = prompt("Enter your MEGA Email (The Archivist's Seal):");
    if (!megaEmail) {
        feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">MEGA Email is required to archive the sacred texts.</p>`;
        return;
    }
    const megaPassword = prompt("Enter your MEGA Password (The Vault Key):");
    if (!megaPassword) {
        feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">MEGA Password is required to open the archives.</p>`;
        return;
    }

    showLoading(`Commencing transcription for: ${youtubeUrl}...`);
    startButton.disabled = true;
    feedbackArea.innerHTML = `<p class="text-blue-600 dark:text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>The Scribe is at work... Transcribing wisdom from URL: ${youtubeUrl}. This may take a few moments.</p>`;

    try {
        const response = await fetch('http://localhost:3001/transcribe-lecture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ youtubeUrl, courseId, chapterId, assemblyAiApiKey, megaEmail, megaPassword }),
        });
        hideLoading();
        const result = await response.json();
        if (response.ok && result.success) {
            feedbackArea.innerHTML = `
                <p class="text-green-600 dark:text-green-400 font-semibold flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>📜 The Scribe has Spoken! Transcription Complete.</p>
                <p class="ml-8"><strong>Video Title:</strong> ${result.videoTitle || 'N/A'}</p>
                <p class="ml-8"><strong>SRT File Archived As:</strong> ${result.srtFileName || 'N/A'}</p>
                <p class="ml-8"><strong>Archive Location (MEGA Link):</strong> <a href="${result.srtMegaLink}" target="_blank" class="link">${result.srtMegaLink}</a></p>
                <p class="ml-8"><strong>AssemblyAI Scroll ID:</strong> ${result.transcriptId || 'N/A'}</p>
                <p class="ml-8"><strong>Firestore Record Updated:</strong> ${result.firestoreUpdateStatus || 'N/A'}</p>
            `;
        } else {
            throw new Error(result.message || `HTTP error ${response.status}`);
        }
    } catch (error) {
        hideLoading();
        console.error("Error calling /transcribe-lecture endpoint:", error);
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400 font-semibold"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>Transcription Ritual Failed: ${error.message}</p>`;
    } finally {
        startButton.disabled = false;
    }
}

function displayLectureTranscriptionAutomator(containerElement) {
    if (!currentUser || !currentUser.isAdmin) {
        containerElement.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`; return;
    }
    let courseOptions = '<option value="">Select Course an Ancient Scroll</option>';
    globalCourseDataMap.forEach((course, courseId) => {
        courseOptions += `<option value="${courseId}">${course.name}</option>`;
    });
    containerElement.innerHTML = `
        <div class="content-card p-6">
            <h2 class="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v1.586M12 12.253v1.586M12 18.253v1.586M7.5 12.253h1.586M13.5 12.253h1.586M16.732 7.96a4.5 4.5 0 010 6.364M5.268 7.96a4.5 4.5 0 000 6.364m11.464-6.364a4.5 4.5 0 00-6.364 0m6.364 0a4.5 4.5 0 010 6.364m-6.364-6.364L12 12.253" /></svg>The Digital Scribe: Lecture Transcriber</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Unveil the wisdom from YouTube lectures and archive their transcripts as sacred SRT scrolls.</p>
            <div class="space-y-5">
                <div>
                    <label for="youtube-url" class="label">Scroll of the Speaker (YouTube Lecture URL):</label>
                    <input type="url" id="youtube-url" name="youtube-url" class="input-field mt-1" placeholder="e.g., https://www.youtube.com/watch?v=your_video_id">
                </div>
                <div>
                    <label for="transcription-course-select" class="label">Assign to Course Chronicle:</label>
                    <select id="transcription-course-select" name="transcription-course-select" class="select-dropdown mt-1">${courseOptions}</select>
                </div>
                <div>
                    <label for="transcription-chapter-select" class="label">Chapter / Verse:</label>
                    <select id="transcription-chapter-select" name="transcription-chapter-select" class="select-dropdown mt-1" disabled><option value="">Select Course Chronicle First</option></select>
                </div>
                <button id="start-transcription-btn" class="btn-primary w-full flex items-center justify-center py-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                    Begin Transcription Ritual
                </button>
                <div id="lecture-transcription-feedback" class="feedback-area min-h-[60px]"><p class="text-gray-500 dark:text-gray-400">The Scribe awaits your command.</p></div>
            </div>
        </div>`;
    const courseSelectElem = document.getElementById('transcription-course-select');
    const chapterSelectElem = document.getElementById('transcription-chapter-select');
    document.getElementById('start-transcription-btn').addEventListener('click', () => {
        window.startLectureTranscription(document.getElementById('youtube-url').value, courseSelectElem.value, chapterSelectElem.value);
    });
    courseSelectElem.addEventListener('change', function() {
        const selectedCourseId = this.value;
        chapterSelectElem.innerHTML = '<option value="">Loading Chapters...</option>';
        chapterSelectElem.disabled = true;
        if (selectedCourseId && globalCourseDataMap.has(selectedCourseId)) {
            const course = globalCourseDataMap.get(selectedCourseId);
            if (course.chapters && course.chapters.length > 0) {
                let chapterOptions = '<option value="">Select Chapter / Verse</option>';
                course.chapters.forEach(chapter => { chapterOptions += `<option value="${chapter.id}">${chapter.title}</option>`; });
                chapterSelectElem.innerHTML = chapterOptions;
                chapterSelectElem.disabled = false;
            } else {
                chapterSelectElem.innerHTML = '<option value="">No Chapters Available for this Chronicle</option>';
            }
        } else {
            chapterSelectElem.innerHTML = '<option value="">Select Course Chronicle First</option>';
        }
    });
}

// --- Textbook PDF Processor ---
async function startPdfProcessing(file, courseId, actualFirstPageNumber) {
    const feedbackArea = document.getElementById('pdf-processor-feedback');
    const startButton = document.getElementById('start-pdf-processing-btn');
    if (!feedbackArea || !startButton) { alert("Error: UI components missing."); return; }
    feedbackArea.innerHTML = ''; 
    if (!file || !courseId || !actualFirstPageNumber) {
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400">Error: PDF file, Course, and "Actual Page 1 Number" must be provided.</p>`; return;
    }
    if (parseInt(actualFirstPageNumber, 10) < 1) {
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400">Error: "Actual Page 1 Number" must be 1 or greater.</p>`; return;
    }
    const megaEmail = prompt("Enter your MEGA Email (The Archivist's Seal):");
    if (!megaEmail) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">MEGA Email is required.</p>`; return; }
    const megaPassword = prompt("Enter your MEGA Password (The Vault Key):");
    if (!megaPassword) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">MEGA Password is required.</p>`; return; }
    const geminiApiKey = prompt("Enter your Gemini API Key (The Oracle's Token for ToC):");
    if (!geminiApiKey) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">Gemini API Key is required.</p>`; return; }

    showLoading(`Initiating PDF transformation for ${file.name}...`);
    startButton.disabled = true;
    feedbackArea.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Transmitting ${file.name} to the Alchemist's workshop... This may take a moment.</p>`;
    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('courseId', courseId);
    formData.append('actualFirstPageNumber', actualFirstPageNumber);
    formData.append('megaEmail', megaEmail);
    formData.append('megaPassword', megaPassword);
    formData.append('geminiApiKey', geminiApiKey);
    try {
        const response = await fetch('http://localhost:3001/process-textbook-pdf', { method: 'POST', body: formData });
        feedbackArea.innerHTML = `<p class="text-blue-600 dark:text-blue-400">The PDF is now in the Alchemist's hands. Analyzing Table of Contents, splitting into scrolls, and archiving to MEGA. This is a lengthy ritual...</p>`;
        const result = await response.json();
        hideLoading();
        if (response.ok && result.success) {
            feedbackArea.innerHTML = `
                <p class="text-green-600 dark:text-green-400 font-semibold flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>📚 The Tome is Transformed!</p>
                <p class="ml-8"><strong>Full Tome Archived:</strong> <a href="${result.fullPdfLink}" target="_blank" class="link">${result.fullPdfLink}</a></p>
                <p class="ml-8"><strong>Scrolls (Chapters) Created:</strong> ${result.chaptersProcessed || 0}</p>
                <ul class="list-disc list-inside ml-10 text-sm">${(result.chapterLinks && result.chapterLinks.length > 0) ? result.chapterLinks.map(link => `<li><a href="${link}" target="_blank" class="link">${link}</a></li>`).join('') : '<li>No chapter scrolls were separated.</li>'}</ul>
                <p class="ml-8 mt-2"><strong>Alchemist's Note:</strong> ${result.message || 'Completed.'}</p>`;
        } else {
            throw new Error(result.message || `HTTP error ${response.status}`);
        }
    } catch (error) {
        hideLoading();
        console.error("Error calling /process-textbook-pdf endpoint:", error);
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400 font-semibold"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>PDF Alchemy Failed: ${error.message}</p>`;
    } finally {
        startButton.disabled = false;
    }
}

function displayTextbookPdfProcessor(containerElement) {
    if (!currentUser || !currentUser.isAdmin) { containerElement.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`; return; }
    let courseOptions = '<option value="">Select Course Chronicle</option>';
    globalCourseDataMap.forEach((course, courseId) => { courseOptions += `<option value="${courseId}">${course.name}</option>`; });
    containerElement.innerHTML = `
        <div class="content-card p-6">
            <h2 class="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v1.586M12 12.253v1.586M12 18.253v1.586M7.5 12.253h1.586M13.5 12.253h1.586M16.732 7.96a4.5 4.5 0 010 6.364M5.268 7.96a4.5 4.5 0 000 6.364m11.464-6.364a4.5 4.5 0 00-6.364 0m6.364 0a4.5 4.5 0 010 6.364m-6.364-6.364L12 12.253" /></svg>PDF Alchemist's Bench</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Transmute monolithic PDF Tomes into chapter-scrolls, ready for study and archiving.</p>
            <div class="space-y-5">
                <div>
                    <label for="pdf-file-upload" class="label">Upload Tome (Full Textbook PDF):</label>
                    <input type="file" id="pdf-file-upload" name="pdf-file-upload" class="input-field file-input mt-1" accept=".pdf">
                </div>
                <div>
                    <label for="pdf-course-select" class="label">Assign to Course Chronicle:</label>
                    <select id="pdf-course-select" name="pdf-course-select" class="select-dropdown mt-1">${courseOptions}</select>
                </div>
                <div>
                    <label for="pdf-actual-page-one" class="label">True Page '1' (PDF Page Number for Textbook's Page 1):</label>
                    <input type="number" id="pdf-actual-page-one" name="pdf-actual-page-one" class="input-field mt-1" placeholder="e.g., 21 (if page '1' of content is on PDF page 21)" min="1" value="1">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">The Alchemist needs to know where the true content begins, after prefaces and tables.</p>
                </div>
                <button id="start-pdf-processing-btn" class="btn-primary w-full flex items-center justify-center py-2.5">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Begin Transmutation
                </button>
                <div id="pdf-processor-feedback" class="feedback-area min-h-[60px]"><p class="text-gray-500 dark:text-gray-400">The Alchemist's Bench is ready.</p></div>
            </div>
        </div>`;
    document.getElementById('start-pdf-processing-btn').addEventListener('click', () => {
        window.startPdfProcessing(document.getElementById('pdf-file-upload').files[0], document.getElementById('pdf-course-select').value, document.getElementById('pdf-actual-page-one').value);
    });
}

// --- PDF MCQ & Problem Generator ---
async function startPdfMcqProblemGeneration(courseId, chapterKey, chapterPdfMegaLink, chapterTitle) {
    const feedbackArea = document.getElementById('mcq-problem-generator-feedback');
    const startButton = document.getElementById('start-mcq-problem-generation-btn');
    if (!feedbackArea || !startButton) { alert("Error: UI components missing."); return; }
    feedbackArea.innerHTML = ''; 
    if (!courseId || !chapterKey || !chapterPdfMegaLink || !chapterTitle) {
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400">Error: Course, Chapter, Chapter Title, and PDF Link must be available.</p>`; return;
    }
    const megaEmail = prompt("Enter your MEGA Email (The Archivist's Seal):");
    if (!megaEmail) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">MEGA Email is required.</p>`; return; }
    const megaPassword = prompt("Enter your MEGA Password (The Vault Key):");
    if (!megaPassword) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">MEGA Password is required.</p>`; return; }
    const geminiApiKey = prompt("Enter your Gemini API Key (The Oracle's Token):");
    if (!geminiApiKey) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">Gemini API Key is required.</p>`; return; }

    showLoading(`Summoning insights from ${chapterTitle}...`);
    startButton.disabled = true;
    feedbackArea.innerHTML = `<p class="text-blue-600 dark:text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Consulting the Oracle for chapter "${chapterTitle}". This may take a few moments...</p>`;
    try {
        const response = await fetch('http://localhost:3001/generate-questions-from-pdf', {
            method: 'POST', headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ courseId, chapterKey, chapterPdfMegaLink, chapterTitle, megaEmail, megaPassword, geminiApiKey }),
        });
        hideLoading();
        const result = await response.json();
        if (response.ok && result.success) {
            feedbackArea.innerHTML = `
                <p class="text-green-600 dark:text-green-400 font-semibold flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>✨ Wisdom Extracted!</p>
                <p class="ml-8"><strong>Chapter:</strong> ${chapterTitle}</p>
                ${result.mcqMegaLink ? `<p class="ml-8"><strong>MCQ Scroll:</strong> <a href="${result.mcqMegaLink}" target="_blank" class="link">${result.mcqMegaLink}</a></p>` : '<p class="ml-8">MCQ Scroll: Not forged or link missing.</p>'}
                ${result.problemsMegaLink ? `<p class="ml-8"><strong>Problem Parchment:</strong> <a href="${result.problemsMegaLink}" target="_blank" class="link">${result.problemsMegaLink}</a></p>` : '<p class="ml-8">Problem Parchment: Not forged or link missing.</p>'}
                <p class="ml-8 mt-2"><strong>Oracle's Message:</strong> ${result.message || 'Completed.'}</p>`;
        } else {
            throw new Error(result.message || `HTTP error ${response.status}`);
        }
    } catch (error) {
        hideLoading();
        console.error("Error calling /generate-questions-from-pdf endpoint:", error);
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400 font-semibold"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>Oracle Consultation Failed: ${error.message}</p>`;
    } finally {
        startButton.disabled = false;
    }
}

function displayPdfMcqProblemGenerator(containerElement) {
    if (!currentUser || !currentUser.isAdmin) { containerElement.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`; return; }
    let courseOptionsHtml = '<option value="">Select Course Chronicle</option>';
    globalCourseDataMap.forEach((course, courseId) => { courseOptionsHtml += `<option value="${courseId}">${course.name}</option>`; });
    containerElement.innerHTML = `
        <div class="content-card p-6">
            <h2 class="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4c-1.742 0-3.223-.835-3.772-2M10 13l4-4m0 0l-4 4m4-4v12"></path></svg>Oracle's Forge (Chapter PDF Q-Gen)</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Forge MCQs and Problems from the sacred texts of chapter PDFs.</p>
            <div class="space-y-5">
                <div>
                    <label for="mcq-course-select" class="label">Target Course Chronicle:</label>
                    <select id="mcq-course-select" name="mcq-course-select" class="select-dropdown mt-1">${courseOptionsHtml}</select>
                </div>
                <div>
                    <label for="mcq-chapter-select" class="label">Target Chapter Scroll (with PDF):</label>
                    <select id="mcq-chapter-select" name="mcq-chapter-select" class="select-dropdown mt-1" disabled><option value="">Select Course Chronicle First</option></select>
                </div>
                <div class="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <p class="text-sm text-gray-600 dark:text-gray-300">Selected Scroll's Location (MEGA PDF Link):</p>
                    <p id="selected-chapter-pdf-link" class="text-xs font-mono text-gray-700 dark:text-gray-200 break-all">N/A</p>
                </div>
                <button id="start-mcq-problem-generation-btn" class="btn-primary w-full flex items-center justify-center py-2.5" disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Forge MCQs & Problems
                </button>
                <div id="mcq-problem-generator-feedback" class="feedback-area min-h-[60px]"><p class="text-gray-500 dark:text-gray-400">The Oracle's Forge is ready.</p></div>
            </div>
        </div>`;
    const courseSelectElem = document.getElementById('mcq-course-select');
    const chapterSelectElem = document.getElementById('mcq-chapter-select');
    const pdfLinkDisplayElem = document.getElementById('selected-chapter-pdf-link');
    const startButtonElem = document.getElementById('start-mcq-problem-generation-btn');
    courseSelectElem.addEventListener('change', function() {
        const selectedCourseId = this.value;
        chapterSelectElem.innerHTML = '<option value="">Loading Chapter Scrolls...</option>';
        chapterSelectElem.disabled = true; pdfLinkDisplayElem.textContent = 'N/A'; startButtonElem.disabled = true;
        if (selectedCourseId && globalCourseDataMap.has(selectedCourseId)) {
            const course = globalCourseDataMap.get(selectedCourseId);
            let chapterOptionsHtml = '<option value="">Select Chapter Scroll with PDF</option>';
            let chaptersWithPdfsFound = 0;
            if (course.chapterResources) {
                for (const chapterKey in course.chapterResources) {
                    const chapterData = course.chapterResources[chapterKey];
                    if (chapterData.otherResources && Array.isArray(chapterData.otherResources)) {
                        const pdfResource = chapterData.otherResources.find(res => res.type === 'textbook_chapter_segment' && res.url);
                        if (pdfResource) {
                            const displayTitle = pdfResource.title || chapterKey.replace(/_/g, ' ');
                            chapterOptionsHtml += `<option value="${chapterKey}" data-pdf-link="${pdfResource.url}" data-chapter-title="${escape(displayTitle)}">${displayTitle}</option>`;
                            chaptersWithPdfsFound++;
                        }
                    }
                }
            }
            if (chaptersWithPdfsFound > 0) {
                chapterSelectElem.innerHTML = chapterOptionsHtml; chapterSelectElem.disabled = false;
            } else {
                chapterSelectElem.innerHTML = '<option value="">No Chapter Scrolls with PDF found</option>';
            }
        } else {
            chapterSelectElem.innerHTML = '<option value="">Select Course Chronicle First</option>';
        }
    });
    chapterSelectElem.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption && selectedOption.value) {
            const pdfLink = selectedOption.getAttribute('data-pdf-link');
            pdfLinkDisplayElem.textContent = pdfLink || 'N/A'; startButtonElem.disabled = !pdfLink;
        } else {
            pdfLinkDisplayElem.textContent = 'N/A'; startButtonElem.disabled = true;
        }
    });
    startButtonElem.addEventListener('click', () => {
        const selectedChapterOption = chapterSelectElem.options[chapterSelectElem.selectedIndex];
        if (courseSelectElem.value && selectedChapterOption && selectedChapterOption.value) {
            window.startPdfMcqProblemGeneration(courseSelectElem.value, selectedChapterOption.value, selectedChapterOption.getAttribute('data-pdf-link'), unescape(selectedChapterOption.getAttribute('data-chapter-title')));
        } else {
            document.getElementById('mcq-problem-generator-feedback').innerHTML = `<p class="text-red-600 dark:text-red-400">Please select a Course and a Chapter with a valid PDF link.</p>`;
        }
    });
}

// --- Lecture Transcription MCQ & Problem Generator ---
async function startLectureMcqProblemGeneration(courseId, selectedLectures, chapterNameForLectures) {
    const feedbackArea = document.getElementById('lecture-mcq-problem-generator-feedback');
    const startButton = document.getElementById('start-lecture-mcq-problem-generation-btn');
    if (!feedbackArea || !startButton) { alert("Error: UI components missing."); return; }
    feedbackArea.innerHTML = ''; 
    if (!courseId || !selectedLectures || selectedLectures.length === 0 || !chapterNameForLectures) {
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400">Error: Course, "Chapter Name/Topic", and at least one lecture must be selected.</p>`; return;
    }
    const megaEmail = prompt("Enter your MEGA Email (The Archivist's Seal):");
    if (!megaEmail) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">MEGA Email is required.</p>`; return; }
    const megaPassword = prompt("Enter your MEGA Password (The Vault Key):");
    if (!megaPassword) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">MEGA Password is required.</p>`; return; }
    const geminiApiKey = prompt("Enter your Gemini API Key (The Oracle's Token):");
    if (!geminiApiKey) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">Gemini API Key is required.</p>`; return; }

    showLoading(`Summoning insights from lectures for "${chapterNameForLectures}"...`);
    startButton.disabled = true;
    feedbackArea.innerHTML = `<p class="text-blue-600 dark:text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Consulting the Oracle with ${selectedLectures.length} lecture scroll(s) for topic "${chapterNameForLectures}". This may take time...</p>`;
    try {
        const response = await fetch('http://localhost:3001/generate-questions-from-lectures', {
            method: 'POST', headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ courseId, selectedLectures, chapterNameForLectures, megaEmail, megaPassword, geminiApiKey }),
        });
        hideLoading();
        const result = await response.json();
        if (response.ok && result.success) {
            feedbackArea.innerHTML = `
                <p class="text-green-600 dark:text-green-400 font-semibold flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>🎙️ Echoes of Knowledge Transformed!</p>
                <p class="ml-8"><strong>Topic / New Chapter Key:</strong> ${result.newChapterKey || chapterNameForLectures}</p>
                ${result.mcqMegaLink ? `<p class="ml-8"><strong>MCQ Scroll:</strong> <a href="${result.mcqMegaLink}" target="_blank" class="link">${result.mcqMegaLink}</a></p>` : '<p class="ml-8">MCQ Scroll: Not forged or link missing.</p>'}
                ${result.problemsMegaLink ? `<p class="ml-8"><strong>Problem Parchment:</strong> <a href="${result.problemsMegaLink}" target="_blank" class="link">${result.problemsMegaLink}</a></p>` : '<p class="ml-8">Problem Parchment: Not forged or link missing.</p>'}
                <p class="ml-8 mt-2"><strong>Oracle's Message:</strong> ${result.message || 'Completed.'}</p>`;
        } else {
            throw new Error(result.message || `HTTP error ${response.status}`);
        }
    } catch (error) {
        hideLoading();
        console.error("Error calling /generate-questions-from-lectures endpoint:", error);
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400 font-semibold"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>Oracle Consultation from Lectures Failed: ${error.message}</p>`;
    } finally {
        startButton.disabled = false;
    }
}

function displayLectureMcqProblemGenerator(containerElement) {
    if (!currentUser || !currentUser.isAdmin) { containerElement.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`; return; }
    let courseOptionsHtml = '<option value="">Select Course Chronicle</option>';
    globalCourseDataMap.forEach((course, courseId) => { courseOptionsHtml += `<option value="${courseId}">${course.name}</option>`; });
    containerElement.innerHTML = `
        <div class="content-card p-6">
            <h2 class="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>Oracle's Forge (Lecture Q-Gen)</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Distill MCQs and Problems from the spoken words of lecture transcripts (SRT scrolls).</p>
            <div class="space-y-5">
                <div>
                    <label for="lecture-mcq-course-select" class="label">Target Course Chronicle:</label>
                    <select id="lecture-mcq-course-select" name="lecture-mcq-course-select" class="select-dropdown mt-1">${courseOptionsHtml}</select>
                </div>
                <div>
                    <label for="lecture-mcq-topic-name" class="label">Name this Collection (Chapter/Topic):</label>
                    <input type="text" id="lecture-mcq-topic-name" name="lecture-mcq-topic-name" class="input-field mt-1" placeholder="e.g., Week 1 Insights, Quantum Entanglement Musings">
                </div>
                <div>
                    <label class="label">Select Lecture Scrolls (SRT Transcripts):</label>
                    <div id="lecture-selection-area" class="mt-1 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50 min-h-[100px] max-h-[250px] overflow-y-auto space-y-2">
                        <p class="text-gray-500 dark:text-gray-400">Select a Course Chronicle to list available lecture scrolls.</p>
                    </div>
                </div>
                <button id="start-lecture-mcq-problem-generation-btn" class="btn-primary w-full flex items-center justify-center py-2.5" disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Forge from Selected Lectures
                </button>
                <div id="lecture-mcq-problem-generator-feedback" class="feedback-area min-h-[60px]"><p class="text-gray-500 dark:text-gray-400">The Oracle's Forge awaits command.</p></div>
            </div>
        </div>`;
    const courseSelectElem = document.getElementById('lecture-mcq-course-select');
    const lectureSelectionAreaElem = document.getElementById('lecture-selection-area');
    const topicNameInputElem = document.getElementById('lecture-mcq-topic-name');
    const startButtonElem = document.getElementById('start-lecture-mcq-problem-generation-btn');
    courseSelectElem.addEventListener('change', function() {
        const selectedCourseId = this.value;
        lectureSelectionAreaElem.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-2">Loading lecture scrolls...</p>';
        startButtonElem.disabled = true;
        if (selectedCourseId && globalCourseDataMap.has(selectedCourseId)) {
            const course = globalCourseDataMap.get(selectedCourseId);
            let lecturesHtml = ''; let lecturesFound = 0;
            if (course.chapterResources) {
                for (const chapterKey in course.chapterResources) {
                    const chapterData = course.chapterResources[chapterKey];
                    if (chapterData.lectureUrls && Array.isArray(chapterData.lectureUrls)) {
                        chapterData.lectureUrls.forEach((lecture, index) => {
                            const srtLink = lecture.url; const lectureType = lecture.type;
                            if (srtLink && lectureType === 'transcription') {
                                const lectureId = `lec-sel-${chapterKey}-${index}`;
                                lecturesHtml += `<div class="flex items-center p-1.5 hover:bg-primary-50 dark:hover:bg-primary-800/30 rounded-md"><input type="checkbox" id="${lectureId}" name="selectedLecture" value="${srtLink}" data-lecture-title="${escape(lecture.title || `Scroll from ${chapterKey}`)}" class="form-checkbox h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"><label for="${lectureId}" class="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">${lecture.title || `Scroll from ${chapterKey}`}</label></div>`;
                                lecturesFound++;
                            }
                        });
                    }
                }
            }
            lectureSelectionAreaElem.innerHTML = lecturesFound > 0 ? lecturesHtml : '<p class="text-gray-500 dark:text-gray-400 p-2">No lecture scrolls with SRT transcripts found for this Chronicle.</p>';
            startButtonElem.disabled = lecturesFound === 0;
        } else {
            lectureSelectionAreaElem.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-2">Select a Course Chronicle to list available lecture scrolls.</p>';
        }
    });
    startButtonElem.addEventListener('click', () => {
        const courseId = courseSelectElem.value;
        const chapterNameForLectures = topicNameInputElem.value.trim();
        const selectedLectureCheckboxes = lectureSelectionAreaElem.querySelectorAll('input[name="selectedLecture"]:checked');
        let selectedLectures = [];
        selectedLectureCheckboxes.forEach(checkbox => { selectedLectures.push({ title: unescape(checkbox.getAttribute('data-lecture-title')), megaSrtLink: checkbox.value }); });
        if (!courseId || selectedLectures.length === 0 || !chapterNameForLectures) {
            document.getElementById('lecture-mcq-problem-generator-feedback').innerHTML = `<p class="text-red-600 dark:text-red-400">Please select a Course, provide a Topic Name, and choose at least one Lecture Scroll.</p>`; return;
        }
        window.startLectureMcqProblemGeneration(courseId, selectedLectures, chapterNameForLectures);
    });
}

// Exports
export { 
    displayMegaMigrationDashboard, loadCoursesForMegaMigration, startMegaMigration,
    displayLectureTranscriptionAutomator, startLectureTranscription,
    displayTextbookPdfProcessor, startPdfProcessing,
    displayPdfMcqProblemGenerator, startPdfMcqProblemGeneration,
    displayLectureMcqProblemGenerator, startLectureMcqProblemGeneration, 
    displayMegaFileExplorer 
};

// Make functions globally accessible
window.displayMegaMigrationDashboard = displayMegaMigrationDashboard;
window.loadCoursesForMegaMigration = loadCoursesForMegaMigration;
window.startMegaMigration = startMegaMigration;
window.displayLectureTranscriptionAutomator = displayLectureTranscriptionAutomator;
window.startLectureTranscription = startLectureTranscription;
window.displayTextbookPdfProcessor = displayTextbookPdfProcessor;
window.startPdfProcessing = startPdfProcessing;
window.displayPdfMcqProblemGenerator = displayPdfMcqProblemGenerator;
window.startPdfMcqProblemGeneration = startPdfMcqProblemGeneration;
window.displayLectureMcqProblemGenerator = displayLectureMcqProblemGenerator;
window.startLectureMcqProblemGeneration = startLectureMcqProblemGeneration;
window.displayMegaFileExplorer = displayMegaFileExplorer;
// Explorer helper functions are set on window inside displayMegaFileExplorer
