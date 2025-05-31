// admin_course_content.js
import { currentUser, globalCourseDataMap, updateGlobalCourseData } from './state.js'; // Added updateGlobalCourseData
import { approveCourse } from './firebase_firestore.js'; // Import approveCourse

// Import display functions from the new specialized modules
import { displayGoogleDriveMigrationDashboard } from './admin_google_drive_service.js'; // RENAMED_IMPORT
import { displayLectureTranscriptionAutomator } from './admin_transcription_service.js';
import { displayTextbookPdfProcessor } from './admin_pdf_processing_service.js';
import { displayPdfMcqProblemGenerator, displayLectureMcqProblemGenerator } from './admin_question_generation_service.js';

// This function might still be needed if called from elsewhere (e.g., ui_admin_dashboard.js)
// If it was only for the internal use of the now-moved sections, it might be removable or simplified.
// For now, keeping it as it might be part of the public API of this older module.
// A more thorough check would be needed to see if it's still used externally.
function loadCoursesForAdmin() {
    console.log("loadCoursesForAdmin called. If this was for a specific moved section, its new module should handle data loading.");
    // Original implementation might have fetched and prepared globalCourseDataMap or similar.
    // If globalCourseDataMap is already populated by other means (e.g., on app load),
    // this function might just be a placeholder or could be removed if no longer called.
    if (!globalCourseDataMap || globalCourseDataMap.size === 0) {
        console.warn("loadCoursesForAdmin: globalCourseDataMap is empty. Course-dependent sections might not display correctly.");
    }
}

// --- Course Content Management Hub ---
function displayCourseManagementSection(containerElement) {
    if (!currentUser || !currentUser.isAdmin) {
        containerElement.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required for Course Content Management.</div>`;
        return;
    }

    containerElement.innerHTML = `
        <div class="course-content-management p-0 m-0 h-full flex flex-col">
            <h1 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 px-1 py-2">Course Management</h1>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 px-1">Manage course content, assets, and automated processing tools.</p>
            <div id="course-content-tabs" class="flex border-b border-gray-300 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-800 z-10">
                <!-- Tab buttons will be dynamically added here -->
            </div>
            <div id="course-content-tab-area" class="flex-grow p-4 overflow-y-auto">
                <!-- Content will be loaded here -->
            </div>
        </div>
    `;

    const tabsConfig = [
        { id: 'fullCourseAutomation', name: 'Full Course Creator', renderFunc: displayFullCourseAutomationForm },
        { id: 'pendingCourses', name: 'Pending Review', renderFunc: displayPendingCoursesList }, // New Tab
        { id: 'googleDriveTools', name: 'Google Drive Tools', renderFunc: displayGoogleDriveMigrationDashboard }, // RENAMED_TAB
        { id: 'transcription', name: 'Transcription', renderFunc: displayLectureTranscriptionAutomator },
        { id: 'pdfProcessing', name: 'PDF Processing', renderFunc: displayTextbookPdfProcessor },
        { id: 'pdfQGenerator', name: 'PDF Q-Generator', renderFunc: displayPdfMcqProblemGenerator },
        { id: 'transcriptQGenerator', name: 'Transcript Q-Generator', renderFunc: displayLectureMcqProblemGenerator }
    ];

    const tabsContainer = containerElement.querySelector('#course-content-tabs');
    const tabAreaContainer = containerElement.querySelector('#course-content-tab-area');

    tabsConfig.forEach(tab => {
        const button = document.createElement('button');
        button.textContent = tab.name;
        button.classList.add('course-content-tab-button', 'py-3', 'px-6', '-mb-px', 'border-b-2', 'border-transparent', 'text-gray-600', 'dark:text-gray-400', 'hover:text-primary-600', 'dark:hover:text-primary-400', 'focus:outline-none', 'text-sm', 'font-medium');
        button.dataset.tabId = tab.id;
        button.addEventListener('click', () => switchCourseContentTab(tab.id));
        tabsContainer.appendChild(button);
    });

    function switchCourseContentTab(tabId) {
        if (!tabAreaContainer) return;
        tabAreaContainer.innerHTML = ''; // Clear previous content

        const selectedTab = tabsConfig.find(t => t.id === tabId);
        if (selectedTab) {
            selectedTab.renderFunc(tabAreaContainer);
        }

        // Update active tab styling
        tabsContainer.querySelectorAll('.course-content-tab-button').forEach(btn => {
            const isActive = btn.dataset.tabId === tabId;
            btn.classList.toggle('border-primary-500', isActive);
            btn.classList.toggle('text-primary-600', isActive);
            btn.classList.toggle('dark:text-primary-400', isActive);
            btn.classList.toggle('border-transparent', !isActive); // Ensure non-active tabs are transparent
            btn.classList.toggle('text-gray-600', !isActive);
            btn.classList.toggle('dark:text-gray-400', !isActive);
        });
    }

    // Initial tab load
    if (tabsConfig.length > 0) {
        switchCourseContentTab(tabsConfig[0].id);
    }
}

// Exports that are still needed by ui_admin_dashboard.js
export { 
    // displayMegaMigrationDashboard, // This is now imported and used directly from admin_google_drive_service.js in the tab config
    displayCourseManagementSection,
    loadCoursesForAdmin, // Keep if ui_admin_dashboard.js still imports and uses it
    displayPendingCoursesList, // Export the new function
};

// --- Pending Courses List Display ---
async function displayPendingCoursesList(containerElement) {
    containerElement.innerHTML = `<div class="p-4"><h2 class="text-xl font-semibold mb-4">Courses Pending Review</h2></div>`;
    
    if (!globalCourseDataMap || globalCourseDataMap.size === 0) {
        containerElement.innerHTML += `<p class="text-gray-600 dark:text-gray-400">No course data loaded. Cannot display pending courses.</p>`;
        return;
    }

    const pendingCourses = [];
    for (const [courseId, courseData] of globalCourseDataMap.entries()) {
        if (courseData.status === "pending_review") {
            pendingCourses.push({ id: courseId, ...courseData });
        }
    }

    if (pendingCourses.length === 0) {
        containerElement.innerHTML += `<p class="text-gray-600 dark:text-gray-400">No courses are currently awaiting review.</p>`;
        return;
    }

    const listElement = document.createElement('ul');
    listElement.className = 'space-y-4';

    pendingCourses.forEach(course => {
        const listItem = document.createElement('li');
        listItem.className = 'p-4 bg-white dark:bg-gray-700 shadow rounded-lg';
        
        // Use course.courseTitle if available (from automation service), otherwise course.name (older structure)
        const title = course.courseTitle || course.name || 'Untitled Course';
        const majorTag = course.majorTag || 'N/A';
        const subjectTag = course.subjectTag || 'N/A';

        listItem.innerHTML = `
            <h3 class="text-lg font-semibold text-primary-700 dark:text-primary-300">${title}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400"><strong>Major:</strong> ${majorTag}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400"><strong>Subject:</strong> ${subjectTag}</p>
            <button 
                class="btn-primary mt-3 py-2 px-4 text-sm" 
                onclick="window.previewAndApproveCourse('${course.id}')">
                Preview & Approve
            </button>
        `;
        listElement.appendChild(listItem);
    });

    containerElement.appendChild(listElement);
}

// --- Course Preview and Approval Modal ---
window.previewAndApproveCourse = async (courseId) => {
    const course = globalCourseDataMap.get(courseId);
    if (!course) {
        alert("Error: Course data not found for ID: " + courseId);
        return;
    }

    // Modal container
    const modalId = `preview-modal-${courseId}`;
    let modal = document.getElementById(modalId);
    if (modal) modal.remove(); // Remove existing modal if any

    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center p-4';
    modal.style.backdropFilter = 'blur(3px)';


    let modalContentHtml = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-semibold text-primary-700 dark:text-primary-300">Preview Course: ${course.courseTitle || course.name || 'N/A'}</h2>
                <button class="text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 text-2xl" onclick="document.getElementById('${modalId}').remove();">&times;</button>
            </div>
    `;

    const details = course.firestoreDataPreview || course; // Prefer firestoreDataPreview if available

    modalContentHtml += `<div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">`;
    modalContentHtml += `<p><strong>Course ID (DirName):</strong> ${details.courseDirName || courseId}</p>`;
    modalContentHtml += `<p><strong>Major Tag:</strong> ${details.majorTag || 'N/A'}</p>`;
    modalContentHtml += `<p><strong>Subject Tag:</strong> ${details.subjectTag || 'N/A'}</p>`;
    modalContentHtml += `<p><strong>AI Description:</strong> ${details.aiGeneratedDescription || 'N/A'}</p>`;
    
    // Google Drive Links/IDs
    modalContentHtml += `<h4 class="text-md font-semibold mt-3 mb-1">Google Drive Assets:</h4>`;
    modalContentHtml += `<p>Main Folder: ${details.gdriveCourseRootWebLink ? `<a href="${details.gdriveCourseRootWebLink}" target="_blank" class="link">View Folder</a>` : (details.gdriveCourseRootFolderId || 'N/A')}</p>`;
    modalContentHtml += `<p>Original Textbook PDF: ${details.gdriveTextbookFullPdfWebLink ? `<a href="${details.gdriveTextbookFullPdfWebLink}" target="_blank" class="link">View PDF</a>` : (details.gdriveTextbookFullPdfId || 'N/A')}</p>`;

    // Chapters
    if (details.chapters && details.chapters.length > 0) {
        modalContentHtml += `<h4 class="text-md font-semibold mt-3 mb-1">Chapters:</h4><ul class="list-disc list-inside pl-2 space-y-1">`;
        details.chapters.forEach(chap => {
            // Assuming chapter links will now be gdriveLink or gdriveId
            const pdfLink = chap.gdrivePdfLink || chap.pdfLink; // Fallback for temporary compatibility
            const mcqLink = chap.gdrivePdfMcqLink || chap.pdfMcqLink;
            const problemsLink = chap.gdrivePdfProblemsLink || chap.pdfProblemsLink;
            modalContentHtml += `<li><strong>${chap.title || `Chapter ${chap.key}`}</strong>: 
                ${pdfLink ? `<a href="${pdfLink}" target="_blank" class="link">PDF</a>` : 'No PDF'}
                ${mcqLink ? ` | <a href="${mcqLink}" target="_blank" class="link">MCQs</a>` : ''}
                ${problemsLink ? ` | <a href="${problemsLink}" target="_blank" class="link">Problems</a>` : ''}
            </li>`;
        });
        modalContentHtml += `</ul>`;
    }

    // Lectures - Transcriptions
    if (details.transcriptionLinks && details.transcriptionLinks.length > 0) {
        modalContentHtml += `<h4 class="text-md font-semibold mt-3 mb-1">Lecture Transcriptions:</h4><ul class="list-disc list-inside pl-2 space-y-1">`;
        details.transcriptionLinks.forEach(trans => {
            const srtLink = trans.gdriveSrtLink || trans.srtLink; // Fallback
            modalContentHtml += `<li><strong>${trans.title}</strong> (Chapter Key: ${trans.chapterKey}): 
                ${srtLink ? `<a href="${srtLink}" target="_blank" class="link">SRT</a>` : 'No SRT'}
            </li>`;
        });
        modalContentHtml += `</ul>`;
    }
    
    // Lectures - Generated Questions
    if (details.lectureQuestionSets && details.lectureQuestionSets.length > 0) {
        modalContentHtml += `<h4 class="text-md font-semibold mt-3 mb-1">Lecture Question Sets:</h4><ul class="list-disc list-inside pl-2 space-y-1">`;
        details.lectureQuestionSets.forEach(lqs => {
            const mcqLink = lqs.gdriveMcqLink || lqs.mcqLink;
            const problemsLink = lqs.gdriveProblemsLink || lqs.problemsLink;
            modalContentHtml += `<li>Topic Key: <strong>${lqs.key}</strong>: 
                ${mcqLink ? `<a href="${mcqLink}" target="_blank" class="link">MCQs</a>` : 'No MCQs'}
                ${problemsLink ? ` | <a href="${problemsLink}" target="_blank" class="link">Problems</a>` : ''}
            </li>`;
        });
        modalContentHtml += `</ul>`;
    }
    
    modalContentHtml += `</div>`; // End of space-y-3

    modalContentHtml += `
            <div class="mt-6 flex justify-end space-x-3">
                <button class="btn-secondary py-2 px-4" onclick="document.getElementById('${modalId}').remove();">Close</button>
                <button class="btn-primary py-2 px-4" onclick="window.approveCourseInFirestore('${courseId}')">Approve Course</button>
            </div>
        </div> 
    `; // End of modal content div

    modal.innerHTML = modalContentHtml;
    document.body.appendChild(modal);
};

window.approveCourseInFirestore = async (courseId) => {
    if (!currentUser || !currentUser.isAdmin) {
        alert("Error: Admin privileges required.");
        return;
    }
    
    // Optional: Add a confirmation dialog
    // if (!confirm(`Are you sure you want to approve course: ${courseId}?`)) {
    //     return;
    // }

    const result = await approveCourse(courseId); // Call the imported function

    if (result.success) {
        alert(result.message);
        const courseData = globalCourseDataMap.get(courseId);
        if (courseData) {
            courseData.status = "approved";
            courseData.updatedAt = new Date().toISOString(); // Use ISO string for consistency if needed, or just Date object
            updateGlobalCourseData(courseId, courseData); // Update the global map via state.js function
        }
        
        // Close modal
        const modalId = `preview-modal-${courseId}`;
        const modal = document.getElementById(modalId);
        if (modal) modal.remove();

        // Refresh the pending courses list
        // This assumes the tab area is identifiable and currently displaying the pending list.
        // A more robust way might be to check current active tab.
        const tabAreaContainer = document.getElementById('course-content-tab-area');
        if (tabAreaContainer) {
            // Check if the "Pending Review" tab is active or if we should force refresh it.
            // For simplicity, just re-render if the container exists.
            // A better check would be to see if `displayPendingCoursesList` was the last rendered function.
            const activeTabButton = document.querySelector('#course-content-tabs .course-content-tab-button.border-primary-500');
            if (activeTabButton && activeTabButton.dataset.tabId === 'pendingCourses') {
                 displayPendingCoursesList(tabAreaContainer);
            } else {
                console.log("Pending courses tab not active, list not refreshed on UI immediately.");
            }
        } else {
            console.warn("Could not find course-content-tab-area to refresh pending list.");
        }

    } else {
        alert(`Error approving course: ${result.message}`);
    }
};

// --- Full Course Automation Form ---
export function displayFullCourseAutomationForm(containerElement) {
    containerElement.innerHTML = `
        <div class="content-card p-6">
            <h2 class="text-2xl font-bold text-primary-700 dark:text-primary-300 mb-6">Full Course Creator</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Automate the creation of a new course by providing a textbook, lecture materials, and other details.
                The system will process these assets, generate supplementary materials, and set up the course structure on Google Drive.
            </p>
            <form id="full-course-automation-form" class="space-y-6">
                
                <div>
                    <label for="courseTitle" class="label">Course Title:</label>
                    <input type="text" id="courseTitle" name="courseTitle" class="input-field" required>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="textbookPdfFile" class="label">Textbook PDF File:</label>
                        <input type="file" id="textbookPdfFile" name="textbookPdf" class="input-field file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 dark:file:bg-primary-700 file:text-primary-700 dark:file:text-primary-100 hover:file:bg-primary-100 dark:hover:file:bg-primary-600" accept=".pdf">
                    </div>
                    <div>
                        <label for="textbookGoogleDriveLink" class="label">Textbook PDF Google Drive Link/ID (Optional):</label> <!-- RENAMED_TEXT -->
                        <input type="text" id="textbookGoogleDriveLink" name="textbookGoogleDriveLink" class="input-field" placeholder="Or provide a Google Drive link/ID to the textbook PDF"> <!-- RENAMED_ID & TEXT -->
                         <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Note: If a Google Drive link/ID is provided, the file upload will be ignored.</p> <!-- RENAMED_TEXT -->
                    </div>
                </div>

                <div>
                    <label for="trueFirstPageNumber" class="label">Textbook's True First Page Number (Actual page 1 of content):</label>
                    <input type="number" id="trueFirstPageNumber" name="trueFirstPageNumber" class="input-field" required min="1">
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="majorTag" class="label">Major Tag:</label>
                        <input type="text" id="majorTag" name="majorTag" class="input-field" placeholder="e.g., Computer Science, Physics" required>
                    </div>
                    <div>
                        <label for="subjectTag" class="label">Subject Tag:</label>
                        <input type="text" id="subjectTag" name="subjectTag" class="input-field" placeholder="e.g., Quantum Mechanics, Web Development" required>
                    </div>
                </div>

                <hr class="my-6 border-gray-300 dark:border-gray-600">
                <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">Optional Course Metadata</h3>
                <div>
                    <label for="prerequisites" class="label">Prerequisites (comma-separated):</label>
                    <input type="text" id="prerequisites" name="prerequisites" class="input-field" placeholder="e.g., Basic Algebra, Introduction to Programming">
                </div>
                <div>
                    <label for="bannerPicUrl" class="label">Banner Picture URL:</label>
                    <input type="url" id="bannerPicUrl" name="bannerPicUrl" class="input-field" placeholder="https://example.com/banner.jpg">
                </div>
                <div>
                    <label for="coursePicUrl" class="label">Course Picture URL (for cards/thumbnails):</label>
                    <input type="url" id="coursePicUrl" name="coursePicUrl" class="input-field" placeholder="https://example.com/course-thumb.jpg">
                </div>

                <hr class="my-6 border-gray-300 dark:border-gray-600">
                <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">Lectures Information</h3>
                <div id="lectures-input-area" class="space-y-4">
                    <!-- Lecture rows will be added here -->
                </div>
                <button type="button" id="add-lecture-btn" class="btn-secondary-small">+ Add Lecture</button>

                <hr class="my-6 border-gray-300 dark:border-gray-600">
                <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">API Keys for External Services</h3>
                 <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Cloud storage (Google Drive) is typically handled by server-side configuration (API Key / Service Account). Provide other keys as needed.</p> <!-- RENAMED_TEXT -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="assemblyAiApiKey" class="label">AssemblyAI API Key (for Transcription):</label>
                        <input type="text" id="assemblyAiApiKey" name="assemblyAiApiKey" class="input-field">
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Required if lectures need transcription.</p>
                    </div>
                    <div>
                        <label for="geminiApiKey" class="label">Google Gemini API Key (Optional):</label>
                        <input type="text" id="geminiApiKey" name="geminiApiKey" class="input-field">
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">If blank, the server's default key will be attempted for AI tasks.</p>
                    </div>
                </div>

                <button type="submit" id="submit-course-automation-btn" class="btn-primary w-full py-3 mt-8">Start Full Course Automation</button>
            </form>
            <div id="course-automation-feedback" class="mt-6 p-4 rounded-md bg-gray-50 dark:bg-gray-700/50 min-h-[50px]">
                <p class="text-sm text-gray-500 dark:text-gray-400">Automation status will appear here.</p>
            </div>
        </div>
    `;

    const lecturesArea = containerElement.querySelector('#lectures-input-area');
    const addLectureButton = containerElement.querySelector('#add-lecture-btn');
    const form = containerElement.querySelector('#full-course-automation-form');
    const feedbackDiv = containerElement.querySelector('#course-automation-feedback');

    let lectureRowCount = 0;

    function addLectureRow() {
        lectureRowCount++;
        const lectureRow = document.createElement('div');
        lectureRow.classList.add('lecture-row', 'p-4', 'border', 'border-gray-200', 'dark:border-gray-600', 'rounded-lg', 'space-y-3');
        lectureRow.innerHTML = `
            <h4 class="text-md font-medium text-gray-700 dark:text-gray-300">Lecture ${lectureRowCount}</h4>
            <div>
                <label for="lectureTitle-${lectureRowCount}" class="label text-sm">Lecture Title:</label>
                <input type="text" id="lectureTitle-${lectureRowCount}" name="lectureTitle" class="input-field input-field-sm" required>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="lectureFile-${lectureRowCount}" class="label text-sm">Lecture Audio/Video File (Optional):</label>
                    <input type="file" id="lectureFile-${lectureRowCount}" name="lectureFiles" class="input-field input-field-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-100 dark:file:bg-gray-600 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-gray-500">
                </div>
                <div>
                    <label for="lectureLink-${lectureRowCount}" class="label text-sm">YouTube or Google Drive Link/ID (Optional):</label> <!-- RENAMED_TEXT -->
                    <input type="text" id="lectureLink-${lectureRowCount}" name="lectureLink" class="input-field input-field-sm" placeholder="YouTube URL or Google Drive File Link/ID"> <!-- RENAMED_TEXT -->
                </div>
            </div>
            <div>
                <label for="srtGoogleDriveLink-${lectureRowCount}" class="label text-sm">SRT Google Drive Link/ID (Optional, if pre-transcribed):</label> <!-- RENAMED_TEXT -->
                <input type="text" id="srtGoogleDriveLink-${lectureRowCount}" name="srtGoogleDriveLink" class="input-field input-field-sm" placeholder="Google Drive link/ID to .srt file"> <!-- RENAMED_ID & TEXT -->
            </div>
            <div>
                <label for="associatedChapterKey-${lectureRowCount}" class="label text-sm">Associated Chapter Key/Topic (e.g., textbook_chapter_1):</label>
                <input type="text" id="associatedChapterKey-${lectureRowCount}" name="associatedChapterKey" class="input-field input-field-sm" placeholder="Leave blank if general">
            </div>
        `;
        lecturesArea.appendChild(lectureRow);
    }

    addLectureButton.addEventListener('click', addLectureRow);
    // Add one lecture row by default
    addLectureRow();

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        feedbackDiv.innerHTML = '<p class="text-blue-600 dark:text-blue-400">Processing... Please wait.</p>';
        // showLoading('Starting full course automation...'); // Assuming showLoading is available globally or imported

        const formData = new FormData();
        // Removed megaEmail, megaPassword from required. Backend will use configured GDrive auth.
        const requiredTextFields = ['courseTitle', 'trueFirstPageNumber', 'majorTag', 'subjectTag'];
        let allRequiredFilled = true;

        requiredTextFields.forEach(fieldName => {
            const input = form.querySelector(`#${fieldName}`);
            if (input && input.value.trim()) {
                formData.append(fieldName, input.value.trim());
            } else {
                // Check if it's an optional field that was removed (like megaEmail)
                if (document.getElementById(fieldName)) { // Only if element still exists
                    allRequiredFilled = false;
                }
            }
        });

        // Optional text fields
        ['textbookGoogleDriveLink', 'assemblyAiApiKey', 'geminiApiKey', 'prerequisites', 'bannerPicUrl', 'coursePicUrl'].forEach(fieldName => {
             const input = form.querySelector(`#${fieldName}`);
             if (input && input.value.trim()) formData.append(fieldName, input.value.trim());
        });


        const textbookPdfInput = form.querySelector('#textbookPdfFile');
        if (textbookPdfInput.files.length > 0) {
            formData.append('textbookPdf', textbookPdfInput.files[0]);
        } else if (!form.querySelector('#textbookGoogleDriveLink').value.trim()) { // RENAMED_ID
            // If no Google Drive link is provided either, then textbook PDF is required.
            // Server will validate if at least one textbook source is present
        }


        const textbookGoogleDriveLinkInput = form.querySelector('#textbookGoogleDriveLink'); // RENAMED_ID
        if (textbookPdfInput.files.length === 0 && !textbookGoogleDriveLinkInput.value.trim()) {
            // This condition means neither a file nor a GDrive link was provided.
            // Depending on backend logic, this might be an error.
            // For now, we let the backend decide if one is strictly required.
            // To make it a client-side error: allRequiredFilled = false;
        }

        if (!allRequiredFilled) {
            feedbackDiv.innerHTML = '<p class="text-red-500">Please fill in all required fields: Course Title, True First Page Number, Major Tag, Subject Tag. Also ensure either a Textbook PDF is uploaded or a Google Drive link is provided.</p>'; // RENAMED_TEXT
            // hideLoading();
            return;
        }


        const lecturesData = [];
        lecturesArea.querySelectorAll('.lecture-row').forEach((row, index) => {
            const titleInput = row.querySelector('input[name="lectureTitle"]');
            if (!titleInput || !titleInput.value.trim()) return; // Skip if no title

            const lectureLinkInput = row.querySelector('input[name="lectureLink"]').value.trim();
            const srtLinkInput = row.querySelector('input[name="srtGoogleDriveLink"]').value.trim(); // RENAMED_ID

            const lecture = {
                title: titleInput.value.trim(),
                youtubeUrl: lectureLinkInput.startsWith('https://www.youtube.com') ? lectureLinkInput : undefined,
                googleDriveLink: lectureLinkInput.includes('drive.google.com') ? lectureLinkInput : undefined, // Simple check for GDrive link
                srtGoogleDriveLink: srtLinkInput || undefined, // RENAMED_FIELD
                associatedChapterKey: row.querySelector('input[name="associatedChapterKey"]').value.trim() || `lecture_topic_${index + 1}`,
                originalFileName: undefined
            };

            const fileInput = row.querySelector('input[name="lectureFiles"]');
            if (fileInput.files.length > 0) {
                formData.append('lectureFiles', fileInput.files[0]);
                lecture.originalFileName = fileInput.files[0].name;
            }
            lecturesData.push(lecture);
        });
        formData.append('lecturesMetadata', JSON.stringify(lecturesData));

        try {
            const response = await fetch('http://localhost:3001/automate-full-course', {
                method: 'POST',
                body: formData // No 'Content-Type' header for FormData with files; browser sets it
            });

            const result = await response.json();

            if (response.ok && result.success) {
                let progressLogsHtml = '';
                if (result.progressLogs && Array.isArray(result.progressLogs)) {
                    progressLogsHtml = result.progressLogs.map(log =>
                        `<p class="text-xs text-gray-500 dark:text-gray-400">${new Date(log.timestamp).toLocaleTimeString()} - ${log.message}</p>`
                    ).join('');
                }

                feedbackDiv.innerHTML = `
                    <p class="text-green-600 dark:text-green-400 font-semibold">Course Automation Successful!</p>
                    <p><strong>Final Automation Step:</strong> ${result.firestoreDataPreview?.currentAutomationStep || 'N/A'}</p>
                    <div class="mt-2">
                        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Progress Logs:</h4>
                        <div class="max-h-40 overflow-y-auto p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs">
                            ${progressLogsHtml || '<p class="text-xs text-gray-500 dark:text-gray-400">No progress logs available.</p>'}
                        </div>
                    </div>
                    <hr class="my-3 border-gray-300 dark:border-gray-600">
                    <p><strong>Course Title:</strong> ${result.courseTitle || 'N/A'}</p>
                    <p><strong>Course Directory Name (Google Drive):</strong> ${result.courseDirName || 'N/A'}</p> <!-- RENAMED_TEXT -->
                    <p><strong>AI Description:</strong> ${result.aiGeneratedDescription ? result.aiGeneratedDescription.substring(0, 150) + '...' : 'N/A'}</p>
                    <p class="mt-2"><strong>Firestore Data Preview:</strong></p>
                    <pre class="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">${JSON.stringify(result.firestoreDataPreview, null, 2)}</pre>
                `;
                form.reset();
                lecturesArea.innerHTML = '';
                addLectureRow();
            } else {
                // Handle server-side failure where result might still contain logs
                let errorProgressLogsHtml = '';
                if (result && result.progressLogs && Array.isArray(result.progressLogs)) {
                    errorProgressLogsHtml = result.progressLogs.map(log =>
                        `<p class="text-xs text-gray-500 dark:text-gray-400">${new Date(log.timestamp).toLocaleTimeString()} - ${log.message}</p>`
                    ).join('');
                }
                const finalStepMessage = result?.firestoreDataPreview?.currentAutomationStep || "Unknown step";
                feedbackDiv.innerHTML = `
                    <p class="text-red-500 font-semibold">Course Automation Failed at step: ${finalStepMessage}</p>
                    <p class="text-red-400">${result.message || `Server error: ${response.status}`}</p>
                    ${errorProgressLogsHtml ? `
                    <div class="mt-2">
                        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Progress Logs (up to failure):</h4>
                        <div class="max-h-40 overflow-y-auto p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs">
                            ${errorProgressLogsHtml}
                        </div>
                    </div>` : ''}
                `;
                // Not throwing error here as we want to display the partial logs from result
            }
        } catch (error) { // Network error or error during fetch/parsing
            console.error('Error submitting course automation form:', error);
            feedbackDiv.innerHTML = `<p class="text-red-500">Submission failed: ${error.message}. Check the console for more details.</p>`;
        } finally {
            // hideLoading(); // Assuming hideLoading is available globally or imported
        }
    });
}

// Removed all window assignments as functions are now modular and imported where needed,
// or their internal event handlers are set up within their respective modules.
// The Mega File Explorer helper functions (handleMegaFileDownload, etc.) were moved to admin_mega_service.js
// and are exported from there if needed, or used via event listeners set up in displayMegaFileExplorer.```
/* File `admin_course_content.js` overwritten successfully.
```

**Step 3: Verify Imports in `ui_admin_dashboard.js`**

I need to ensure that `ui_admin_dashboard.js` correctly imports `displayCourseManagementSection` and `loadCoursesForAdmin` (if still used) from the refactored `admin_course_content.js`.

Let's read `ui_admin_dashboard.js`.
                    </div>
                    <div>
                        <label for="geminiApiKey" class="label">Google Gemini API Key (Optional):</label>
                        <input type="text" id="geminiApiKey" name="geminiApiKey" class="input-field">
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">If blank, the server's default key will be attempted.</p>
                    </div>
                </div>
                
                <button type="submit" id="submit-course-automation-btn" class="btn-primary w-full py-3 mt-8">Start Full Course Automation</button>
            </form>
            <div id="course-automation-feedback" class="mt-6 p-4 rounded-md bg-gray-50 dark:bg-gray-700/50 min-h-[50px]">
                <p class="text-sm text-gray-500 dark:text-gray-400">Automation status will appear here.</p>
            </div>
        </div>
    `;

    const lecturesArea = containerElement.querySelector('#lectures-input-area');
    const addLectureButton = containerElement.querySelector('#add-lecture-btn');
    const form = containerElement.querySelector('#full-course-automation-form');
    const feedbackDiv = containerElement.querySelector('#course-automation-feedback');

    let lectureRowCount = 0;

    function addLectureRow() {
        lectureRowCount++;
        const lectureRow = document.createElement('div');
        lectureRow.classList.add('lecture-row', 'p-4', 'border', 'border-gray-200', 'dark:border-gray-600', 'rounded-lg', 'space-y-3');
        lectureRow.innerHTML = `
            <h4 class="text-md font-medium text-gray-700 dark:text-gray-300">Lecture ${lectureRowCount}</h4>
            <div>
                <label for="lectureTitle-${lectureRowCount}" class="label text-sm">Lecture Title:</label>
                <input type="text" id="lectureTitle-${lectureRowCount}" name="lectureTitle" class="input-field input-field-sm" required>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="lectureFile-${lectureRowCount}" class="label text-sm">Lecture Audio/Video File (Optional):</label>
                    <input type="file" id="lectureFile-${lectureRowCount}" name="lectureFiles" class="input-field input-field-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-100 dark:file:bg-gray-600 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-gray-500">
                </div>
                <div>
                    <label for="lectureLink-${lectureRowCount}" class="label text-sm">YouTube or Mega Link (Optional):</label>
                    <input type="text" id="lectureLink-${lectureRowCount}" name="lectureLink" class="input-field input-field-sm" placeholder="YouTube URL or Mega File Link">
                </div>
            </div>
            <div>
                <label for="srtMegaLink-${lectureRowCount}" class="label text-sm">SRT Mega Link (Optional, if pre-transcribed):</label>
                <input type="text" id="srtMegaLink-${lectureRowCount}" name="srtMegaLink" class="input-field input-field-sm" placeholder="Mega link to .srt file">
            </div>
            <div>
                <label for="associatedChapterKey-${lectureRowCount}" class="label text-sm">Associated Chapter Key/Topic (e.g., textbook_chapter_1):</label>
                <input type="text" id="associatedChapterKey-${lectureRowCount}" name="associatedChapterKey" class="input-field input-field-sm" placeholder="Leave blank if general">
            </div>
        `;
        lecturesArea.appendChild(lectureRow);
    }

    addLectureButton.addEventListener('click', addLectureRow);
    // Add one lecture row by default
    addLectureRow(); 

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        feedbackDiv.innerHTML = '<p class="text-blue-600 dark:text-blue-400">Processing... Please wait.</p>';
        // showLoading('Starting full course automation...'); // Assuming showLoading is available globally or imported

        const formData = new FormData();
        const requiredTextFields = ['courseTitle', 'trueFirstPageNumber', 'majorTag', 'subjectTag', 'megaEmail', 'megaPassword', 'assemblyAiApiKey', 'geminiApiKey'];
        let allRequiredFilled = true;

        requiredTextFields.forEach(fieldName => {
            const input = form.querySelector(`#${fieldName}`);
            if (input && input.value.trim()) {
                formData.append(fieldName, input.value.trim());
            } else {
                allRequiredFilled = false;
            }
        });
        
        // Optional text fields
        ['textbookMegaLink', 'assemblyAiApiKey', 'geminiApiKey', 'prerequisites', 'bannerPicUrl', 'coursePicUrl'].forEach(fieldName => {
             const input = form.querySelector(`#${fieldName}`);
             if (input && input.value.trim()) formData.append(fieldName, input.value.trim());
        });


        const textbookPdfInput = form.querySelector('#textbookPdfFile');
        if (textbookPdfInput.files.length > 0) {
            formData.append('textbookPdf', textbookPdfInput.files[0]);
        } else if (!form.querySelector('#textbookMegaLink').value.trim()) {
            // If no Mega link is provided either, then textbook PDF is required.
            // This check is basic; server-side will do more thorough validation.
            // allRequiredFilled = false; 
            // Decided to make textbook PDF optional if Mega link is provided (though link feature is future)
            // Server will validate if at least one textbook source is present
        }

        
        const textbookMegaLinkInput = form.querySelector('#textbookMegaLink');
        if (textbookPdfInput.files.length === 0 && !textbookMegaLinkInput.value.trim()) {
            allRequiredFilled = false;
            // It's good practice to also provide specific feedback for this, 
            // but the main error message update is in the next plan step.
            // For now, just ensuring allRequiredFilled is correctly set is sufficient for this step.
        }
        
        if (!allRequiredFilled) {
            feedbackDiv.innerHTML = '<p class="text-red-500">Please fill in all required fields: Course Title, Textbook PDF (or Mega Link), True First Page Number, Major Tag, Subject Tag, Mega Email, Mega Password, AssemblyAI API Key, and Gemini API Key.</p>';
            // hideLoading();
            return;
        }


        const lecturesData = [];
        lecturesArea.querySelectorAll('.lecture-row').forEach((row, index) => {
            const titleInput = row.querySelector('input[name="lectureTitle"]');
            if (!titleInput || !titleInput.value.trim()) return; // Skip if no title

            const lecture = {
                title: titleInput.value.trim(),
                // Prioritize Mega link if both YouTube and Mega links are provided for the same field
                youtubeUrl: row.querySelector('input[name="lectureLink"]').value.trim().startsWith('https://www.youtube.com') ? row.querySelector('input[name="lectureLink"]').value.trim() : undefined,
                megaLink: row.querySelector('input[name="lectureLink"]').value.trim().startsWith('https://mega.nz/') ? row.querySelector('input[name="lectureLink"]').value.trim() : undefined,
                srtMegaLink: row.querySelector('input[name="srtMegaLink"]').value.trim() || undefined,
                associatedChapterKey: row.querySelector('input[name="associatedChapterKey"]').value.trim() || `lecture_topic_${index + 1}`,
                originalFileName: undefined
            };

            const fileInput = row.querySelector('input[name="lectureFiles"]');
            if (fileInput.files.length > 0) {
                formData.append('lectureFiles', fileInput.files[0]);
                lecture.originalFileName = fileInput.files[0].name;
            }
            lecturesData.push(lecture);
        });
        formData.append('lecturesMetadata', JSON.stringify(lecturesData));

        try {
            const response = await fetch('http://localhost:3001/automate-full-course', {
                method: 'POST',
                body: formData // No 'Content-Type' header for FormData with files; browser sets it
            });

            const result = await response.json();

            if (response.ok && result.success) {
                let progressLogsHtml = '';
                if (result.progressLogs && Array.isArray(result.progressLogs)) {
                    progressLogsHtml = result.progressLogs.map(log => 
                        `<p class="text-xs text-gray-500 dark:text-gray-400">${new Date(log.timestamp).toLocaleTimeString()} - ${log.message}</p>`
                    ).join('');
                }

                feedbackDiv.innerHTML = `
                    <p class="text-green-600 dark:text-green-400 font-semibold">Course Automation Successful!</p>
                    <p><strong>Final Automation Step:</strong> ${result.firestoreDataPreview?.currentAutomationStep || 'N/A'}</p>
                    <div class="mt-2">
                        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Progress Logs:</h4>
                        <div class="max-h-40 overflow-y-auto p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs">
                            ${progressLogsHtml || '<p class="text-xs text-gray-500 dark:text-gray-400">No progress logs available.</p>'}
                        </div>
                    </div>
                    <hr class="my-3 border-gray-300 dark:border-gray-600">
                    <p><strong>Course Title:</strong> ${result.courseTitle || 'N/A'}</p>
                    <p><strong>Course Directory Name (Mega):</strong> ${result.courseDirName || 'N/A'}</p>
                    <p><strong>AI Description:</strong> ${result.aiGeneratedDescription ? result.aiGeneratedDescription.substring(0, 150) + '...' : 'N/A'}</p>
                    <p class="mt-2"><strong>Firestore Data Preview:</strong></p>
                    <pre class="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">${JSON.stringify(result.firestoreDataPreview, null, 2)}</pre>
                `;
                form.reset(); 
                lecturesArea.innerHTML = ''; 
                addLectureRow(); 
            } else {
                // Handle server-side failure where result might still contain logs
                let errorProgressLogsHtml = '';
                if (result && result.progressLogs && Array.isArray(result.progressLogs)) {
                    errorProgressLogsHtml = result.progressLogs.map(log => 
                        `<p class="text-xs text-gray-500 dark:text-gray-400">${new Date(log.timestamp).toLocaleTimeString()} - ${log.message}</p>`
                    ).join('');
                }
                const finalStepMessage = result?.firestoreDataPreview?.currentAutomationStep || "Unknown step";
                feedbackDiv.innerHTML = `
                    <p class="text-red-500 font-semibold">Course Automation Failed at step: ${finalStepMessage}</p>
                    <p class="text-red-400">${result.message || `Server error: ${response.status}`}</p>
                    ${errorProgressLogsHtml ? `
                    <div class="mt-2">
                        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Progress Logs (up to failure):</h4>
                        <div class="max-h-40 overflow-y-auto p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs">
                            ${errorProgressLogsHtml}
                        </div>
                    </div>` : ''}
                `;
                // Not throwing error here as we want to display the partial logs from result
            }
        } catch (error) { // Network error or error during fetch/parsing
            console.error('Error submitting course automation form:', error);
            feedbackDiv.innerHTML = `<p class="text-red-500">Submission failed: ${error.message}. Check the console for more details.</p>`;
        } finally {
            // hideLoading(); // Assuming hideLoading is available globally or imported
        }
    });
}

// Removed all window assignments as functions are now modular and imported where needed,
// or their internal event handlers are set up within their respective modules.
// The Google Drive File Explorer helper functions (handleGoogleDriveFileDownload, etc.) were moved to admin_google_drive_service.js
// and are exported from there if needed, or used via event listeners set up in displayGoogleDriveFileExplorer.
/* File `admin_course_content.js` overwritten successfully.
```

**Step 3: Verify Imports in `ui_admin_dashboard.js`**

I need to ensure that `ui_admin_dashboard.js` correctly imports `displayCourseManagementSection` and `loadCoursesForAdmin` (if still used) from the refactored `admin_course_content.js`.

Let's read `ui_admin_dashboard.js`.*/
