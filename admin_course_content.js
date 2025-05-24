// admin_course_content.js
import { currentUser, globalCourseDataMap } from './state.js'; // Assuming loadCoursesForAdmin might still use these.

// Import display functions from the new specialized modules
import { displayMegaMigrationDashboard } from './admin_mega_service.js';
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
        { id: 'fullCourseAutomation', name: 'Full Course Creator', renderFunc: displayFullCourseAutomationForm }, // New Tab
        { id: 'megaTools', name: 'MEGA Tools', renderFunc: displayMegaMigrationDashboard },
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
    displayMegaMigrationDashboard,
    displayCourseManagementSection,
    loadCoursesForAdmin, // Keep if ui_admin_dashboard.js still imports and uses it
    displayFullCourseAutomationForm // Export the new function
};

// --- Full Course Automation Form ---
export function displayFullCourseAutomationForm(containerElement) {
    containerElement.innerHTML = `
        <div class="content-card p-6">
            <h2 class="text-2xl font-bold text-primary-700 dark:text-primary-300 mb-6">Full Course Creator</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Automate the creation of a new course by providing a textbook, lecture materials, and other details.
                The system will process these assets, generate supplementary materials, and set up the course structure on MEGA.
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
                        <label for="textbookMegaLink" class="label">Textbook PDF Mega Link (Optional):</label>
                        <input type="text" id="textbookMegaLink" name="textbookMegaLink" class="input-field" placeholder="Or provide a Mega link to the textbook PDF">
                         <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Note: If a Mega link is provided, the file upload will be ignored. This feature is for future use; currently, local PDF upload is primary.</p>
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
                <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">Lectures Information</h3>
                <div id="lectures-input-area" class="space-y-4">
                    <!-- Lecture rows will be added here -->
                </div>
                <button type="button" id="add-lecture-btn" class="btn-secondary-small">+ Add Lecture</button>

                <hr class="my-6 border-gray-300 dark:border-gray-600">
                <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">Credentials & API Keys</h3>
                 <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">These are required for interacting with external services like MEGA and AI for processing.</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="megaEmail" class="label">Mega Email:</label>
                        <input type="email" id="megaEmail" name="megaEmail" class="input-field" required>
                    </div>
                    <div>
                        <label for="megaPassword" class="label">Mega Password:</label>
                        <input type="password" id="megaPassword" name="megaPassword" class="input-field" required>
                    </div>
                    <div>
                        <label for="assemblyAiApiKey" class="label">AssemblyAI API Key (for Transcription):</label>
                        <input type="text" id="assemblyAiApiKey" name="assemblyAiApiKey" class="input-field">
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
        ['textbookMegaLink', 'assemblyAiApiKey', 'geminiApiKey'].forEach(fieldName => {
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

        const textbookPdfInput = form.querySelector('#textbookPdfFile');
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
                feedbackDiv.innerHTML = `
                    <p class="text-green-600 dark:text-green-400 font-semibold">Course Automation Successful!</p>
                    <p><strong>Course Title:</strong> ${result.courseTitle}</p>
                    <p><strong>Course Directory Name (Mega):</strong> ${result.courseDirName}</p>
                    <p><strong>AI Description:</strong> ${result.aiGeneratedDescription ? result.aiGeneratedDescription.substring(0, 150) + '...' : 'N/A'}</p>
                    <p class="mt-2"><strong>Firestore Data Preview:</strong></p>
                    <pre class="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">${JSON.stringify(result.firestoreDataPreview, null, 2)}</pre>
                `;
                form.reset(); // Optionally clear form
                lecturesArea.innerHTML = ''; // Clear dynamic rows
                addLectureRow(); // Add one fresh row
            } else {
                throw new Error(result.message || `Server error: ${response.status}`);
            }
        } catch (error) {
            console.error('Error submitting course automation form:', error);
            feedbackDiv.innerHTML = `<p class="text-red-500">Submission failed: ${error.message}</p>`;
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

Let's read `ui_admin_dashboard.js`.*/
