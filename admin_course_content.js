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
        <div class="p-4 sm:p-6 lg:p-8">
            <h1 class="text-3xl font-bold text-primary-800 dark:text-primary-200 mb-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 inline-block mr-3 align-middle">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 0M.754 10.798a48.97 48.97 0 0 1 .75-6.98M21.666 10.798A48.969 48.969 0 0 0 20.916 3.82m-.326 7.173a60.032 60.032 0 0 1-.491 0m1.54 0a48.499 48.499 0 0 1-.928-4.152M19.084 10.798a48.538 48.538 0 0 0-.928-4.152M4.26 10.147a60.032 60.032 0 0 0 .491 0m-.991 0c.242-.145.493-.287.75-.428m7.408 4.008c.242-.145.493-.287.75-.428m-.991 0a60.493 60.493 0 0 0 .491 0m1.54 0c-.242.145-.493-.287-.75.428m7.408-4.008c-.242.145-.493-.287-.75.428M4.26 10.147a60.493 60.493 0 0 1-.491 0M2.268 10.798a48.538 48.538 0 0 1-.928-4.152M15.732 10.147a60.032 60.032 0 0 1-.491 0m1.54 0c.242.145.493-.287.75.428M15.732 10.147a60.493 60.493 0 0 0 .491 0m-.991 0a48.499 48.499 0 0 0-.928-4.152M12 12.75a.75.75 0 0 1-.75-.75V6a.75.75 0 0 1 1.5 0v6a.75.75 0 0 1-.75.75Z" />
                </svg>
                Course Content Management Citadel
            </h1>
            <p class="text-center text-gray-600 dark:text-gray-400 mb-10 text-lg">
                Forge, archive, and manage all course-related digital assets from this central command.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                
                <section id="mega-migration-section" class="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden transition-all duration-300 hover:shadow-2xl">
                    <div class="p-6">
                        <h2 class="text-2xl font-semibold text-primary-700 dark:text-primary-300 mb-3 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-7 h-7 mr-2 text-blue-500"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.34 0 4.5 4.5 0 0 1-1.41 8.775H6.75Z" /></svg>
                            MEGA Cloud Migration & Explorer
                        </h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Migrate course assets to MEGA cloud storage and navigate existing cloud directories.</p>
                        <div id="mega-migration-dashboard-container"></div>
                    </div>
                </section>

                <section id="lecture-transcription-section" class="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden transition-all duration-300 hover:shadow-2xl">
                    <div class="p-6">
                        <h2 class="text-2xl font-semibold text-primary-700 dark:text-primary-300 mb-3 flex items-center">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-7 h-7 mr-2 text-green-500"><path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.5 4.5m0 0l4.5 4.5M11.25 12.75l4.5-4.5m-4.5 4.5L6.75 8.25" /></svg>
                            Lecture Transcription Automator
                        </h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Transcribe YouTube lectures into SRT files and archive them to MEGA.</p>
                        <div id="lecture-transcription-automator-container"></div>
                    </div>
                </section>

                <section id="pdf-processor-section" class="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden transition-all duration-300 hover:shadow-2xl">
                    <div class="p-6">
                        <h2 class="text-2xl font-semibold text-primary-700 dark:text-primary-300 mb-3 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-7 h-7 mr-2 text-red-500"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                            Textbook PDF Processor
                        </h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Process full textbook PDFs to extract chapters and organize content.</p>
                        <div id="textbook-pdf-processor-container"></div>
                    </div>
                </section>

                <section id="pdf-qgen-section" class="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden transition-all duration-300 hover:shadow-2xl">
                    <div class="p-6">
                        <h2 class="text-2xl font-semibold text-primary-700 dark:text-primary-300 mb-3 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-7 h-7 mr-2 text-purple-500"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L1.875 9l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 1.875l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L16.125 9l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18.75 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L22.5 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM18 18.75a.75.75 0 0 0 .75.75h.008a.75.75 0 0 0 .75-.75v-.008a.75.75 0 0 0-.75-.75h-.008a.75.75 0 0 0-.75.75v.008Z" /></svg>
                            PDF Chapter Q-Generator
                        </h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Generate MCQs and problems from individual chapter PDF files.</p>
                        <div id="pdf-qgen-container"></div>
                    </div>
                </section>

                <section id="lecture-qgen-section" class="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden transition-all duration-300 hover:shadow-2xl md:col-span-2"> {/* Spans two columns on medium screens and up */}
                    <div class="p-6">
                        <h2 class="text-2xl font-semibold text-primary-700 dark:text-primary-300 mb-3 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-7 h-7 mr-2 text-teal-500"><path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" /></svg>
                            Lecture Transcript Q-Generator
                        </h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Generate MCQs and problems from lecture transcripts (SRT files).</p>
                        <div id="lecture-qgen-container"></div>
                    </div>
                </section>
            </div>
        </div>
    `;

    // Call the respective display functions for each section
    // These functions are now imported from their dedicated modules
    displayMegaMigrationDashboard(document.getElementById('mega-migration-dashboard-container'));
    displayLectureTranscriptionAutomator(document.getElementById('lecture-transcription-automator-container'));
    displayTextbookPdfProcessor(document.getElementById('textbook-pdf-processor-container'));
    displayPdfMcqProblemGenerator(document.getElementById('pdf-qgen-container'));
    displayLectureMcqProblemGenerator(document.getElementById('lecture-qgen-container'));
}

// Exports that are still needed by ui_admin_dashboard.js
export { 
    displayCourseManagementSection,
    loadCoursesForAdmin // Keep if ui_admin_dashboard.js still imports and uses it
};

// Removed all window assignments as functions are now modular and imported where needed,
// or their internal event handlers are set up within their respective modules.
// The Mega File Explorer helper functions (handleMegaFileDownload, etc.) were moved to admin_mega_service.js
// and are exported from there if needed, or used via event listeners set up in displayMegaFileExplorer.```
File `admin_course_content.js` overwritten successfully.
```

**Step 3: Verify Imports in `ui_admin_dashboard.js`**

I need to ensure that `ui_admin_dashboard.js` correctly imports `displayCourseManagementSection` and `loadCoursesForAdmin` (if still used) from the refactored `admin_course_content.js`.

Let's read `ui_admin_dashboard.js`.
