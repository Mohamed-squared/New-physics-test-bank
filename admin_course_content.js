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
    loadCoursesForAdmin // Keep if ui_admin_dashboard.js still imports and uses it
};

// Removed all window assignments as functions are now modular and imported where needed,
// or their internal event handlers are set up within their respective modules.
// The Mega File Explorer helper functions (handleMegaFileDownload, etc.) were moved to admin_mega_service.js
// and are exported from there if needed, or used via event listeners set up in displayMegaFileExplorer.```
/* File `admin_course_content.js` overwritten successfully.
```

**Step 3: Verify Imports in `ui_admin_dashboard.js`**

I need to ensure that `ui_admin_dashboard.js` correctly imports `displayCourseManagementSection` and `loadCoursesForAdmin` (if still used) from the refactored `admin_course_content.js`.

Let's read `ui_admin_dashboard.js`.*/
