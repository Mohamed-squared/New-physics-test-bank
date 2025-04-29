// --- START OF FILE ui_course_dashboard.js ---

// ui_course_dashboard.js

import { currentUser, userCourseProgressMap, globalCourseDataMap, activeCourseId, setActiveCourseId, generatedContentCache, updateGeneratedContentCache } from './state.js'; // Added generatedContentCache & update func
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml, renderMathIn } from './utils.js'; // Added renderMathIn
// Import the function that will display the content menu
import { displayCourseContentMenu } from './ui_course_content_menu.js';
// Import other necessary functions
import { showCourseAssignmentsExams, startAssignmentOrExam } from './ui_course_assignments_exams.js';
import { showCourseProgressDetails } from './ui_course_progress.js';
import { determineTodaysObjective, getLetterGradeColor, calculateAttendanceScore, determineNextTask, determineTargetChapter } from './course_logic.js';
import { unenrollFromCourse, getStoredChapterContent, saveStoredChapterContent } from './firebase_firestore.js'; // Added functions for generated content
// Import study material functions needed for Notes panel & AI functions
import { generateFormulaSheet, generateChapterSummary, formatResponseAsHtml, getAllPdfTextForAI, callGeminiTextAPI, fetchSrtText, getSrtFilenameFromTitle, convertMyNoteToLatex as aiConvertToLatex } from './ai_integration.js'; // Import AI functions + formatter
import { generateAndDownloadPdfWithMathJax } from './ui_pdf_generation.js'; // For downloading generated content
// Import necessary functions from ui_course_study_material for My Notes section
import { COURSE_TRANSCRIPTION_BASE_PATH } from './config.js'; // Need transcription path


// --- Navigation ---
export function navigateToCourseDashboard(courseId) {
    setActiveCourseId(courseId);
    showCourseDashboard(courseId); // Show the specific dashboard for this course
}

// --- Main UI Functions ---

/**
 * Displays the "My Courses" dashboard, listing all enrolled courses.
 * If no courses are enrolled, shows a prompt to browse courses.
 */
export function showMyCoursesDashboard() {
    if (!currentUser) {
        console.error("showMyCoursesDashboard: User not logged in.");
        return;
    }
    setActiveSidebarLink('showMyCoursesDashboard', 'sidebar-standard-nav');
    setActiveCourseId(null); // Not viewing a specific course when showing the list

    if (userCourseProgressMap.size === 0) {
        displayContent(`
            <div class="text-center p-8 content-card animate-fade-in">
                 <h2 class="text-2xl font-semibold mb-3 text-gray-800 dark:text-gray-200">My Courses</h2>
                 <p class="text-muted mb-6">You are not currently enrolled in any courses.</p>
                 <button onclick="window.showBrowseCourses()" class="btn-primary">
                     Browse Available Courses
                 </button>
             </div>
        `);
        return;
    }

    // Display list of enrolled courses
    let courseListHtml = '<div class="space-y-4">';
    userCourseProgressMap.forEach((progress, courseId) => {
        const courseDef = globalCourseDataMap.get(courseId);
        const courseName = courseDef?.name || `Course ${courseId}`;
        const status = progress.status || 'Enrolled';
        const grade = progress.grade || (status === 'completed' ? 'N/A' : ''); // Grade might be null even if completed
        const gradeColor = getLetterGradeColor(grade);
        const attendance = calculateAttendanceScore(progress); // Calculate current attendance

        const totalChapters = courseDef?.totalChapters || 1;
        const studiedChapters = progress.courseStudiedChapters?.length || 0;
        const progressPercent = totalChapters > 0 ? Math.round((studiedChapters / totalChapters) * 100) : 0;

        courseListHtml += `
            <div class="course-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 ${gradeColor.border} ${status === 'completed' ? gradeColor.bg : 'bg-white dark:bg-gray-800'}">
                 <div class="flex flex-col sm:flex-row justify-between items-start gap-3">
                     <div class="flex-grow">
                          <h3 class="text-lg font-semibold ${status === 'completed' ? gradeColor.text : 'text-primary-600 dark:text-primary-400'} hover:underline cursor-pointer" onclick="window.navigateToCourseDashboard('${courseId}')">
                             ${escapeHtml(courseName)}
                          </h3>
                          <p class="text-xs ${status === 'completed' ? gradeColor.textMuted : 'text-muted'}">Status: ${escapeHtml(status)} ${grade ? `- Grade: ${grade}` : ''}</p>
                          <!-- Progress Bar -->
                          <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mt-2" title="${studiedChapters} / ${totalChapters} Chapters Studied">
                              <div class="bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out" style="width: ${progressPercent}%"></div>
                          </div>
                          <p class="text-xs ${status === 'completed' ? gradeColor.textMuted : 'text-muted'} mt-1">Attendance: ${attendance}%</p>
                     </div>
                     <div class="flex-shrink-0 text-right space-y-2 mt-2 sm:mt-0">
                          <button onclick="window.navigateToCourseDashboard('${courseId}')" class="btn-primary-small w-full sm:w-auto">Enter Course</button>
                           <button onclick="window.showCurrentCourseProgress('${courseId}')" class="btn-secondary-small w-full sm:w-auto">View Progress</button>
                     </div>
                 </div>
             </div>
        `;
    });
    courseListHtml += '</div>';

     const html = `
        <div class="animate-fade-in space-y-6">
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">My Courses</h2>
             ${courseListHtml}
        </div>`;
    displayContent(html); // Display in the main #content area
}


/**
 * Shows the main dashboard for a specific enrolled course.
 * @param {string} courseId - The ID of the course to display.
 */
export function showCourseDashboard(courseId) {
    if (!currentUser) {
        console.error("showCourseDashboard: User not logged in.");
        return;
    }
    setActiveCourseId(courseId);
    setActiveSidebarLink('showCurrentCourseDashboard', 'sidebar-course-nav');

    const progress = userCourseProgressMap.get(courseId);
    const courseDef = globalCourseDataMap.get(courseId);

    if (!progress || !courseDef) {
        displayContent(`<p class="text-red-500 p-4">Error: Could not load data for course ID: ${courseId}.</p><button onclick="window.showMyCoursesDashboard()" class="btn-secondary mt-2">Back to My Courses</button>`, 'course-dashboard-area');
        setActiveCourseId(null);
        setActiveSidebarLink('showMyCoursesDashboard', 'sidebar-standard-nav');
        return;
    }

    const todaysObjective = determineTodaysObjective(progress, courseDef);
    const nextTask = determineNextTask(progress, courseDef);

    // Unenroll button logic
    const unenrollButtonHtml = `
         <button onclick="window.confirmUnenroll('${courseId}', '${escapeHtml(courseDef.name)}')" class="btn-danger-small text-xs absolute top-4 right-4">
              Unenroll
         </button>
    `;

    // --- Notes & Documents Panel ---
    let notesPanelHtml = `
        <div class="content-card">
             <h3 class="text-lg font-semibold mb-4 border-b pb-2 dark:border-gray-700 text-gray-700 dark:text-gray-300">Notes & Documents</h3>
             <div class="max-h-96 overflow-y-auto space-y-2 pr-2">`;

    if (courseDef.totalChapters > 0) {
         const chapterTitles = Array.isArray(courseDef.chapters) && courseDef.chapters.length === courseDef.totalChapters ? courseDef.chapters : Array.from({ length: courseDef.totalChapters }, (_, i) => `Chapter ${i + 1}`);
         for(let i = 1; i <= courseDef.totalChapters; i++) {
              const chapterNum = i;
              const chapterTitle = escapeHtml(chapterTitles[i-1] || `Chapter ${i}`);
              // Unique IDs for display areas
              const formulaDisplayId = `formula-sheet-display-${chapterNum}`;
              const summaryDisplayId = `chapter-summary-display-${chapterNum}`;

              notesPanelHtml += `
                  <details class="bg-gray-50 dark:bg-gray-700/50 p-2 rounded border dark:border-gray-600">
                       <summary class="text-sm font-medium">${chapterTitle}</summary>
                       <div class="mt-2 pt-2 border-t dark:border-gray-600 space-y-2">
                            <!-- Formula Sheet -->
                            <div class="p-1">
                                 <button onclick="window.triggerFormulaSheetGeneration('${courseId}', ${chapterNum}, '${formulaDisplayId}')" class="btn-secondary-small text-xs w-full justify-start">
                                     View/Generate Formula Sheet (AI)
                                 </button>
                                 <div id="${formulaDisplayId}" class="mt-2 border-t pt-2 text-xs text-muted hidden">Loading...</div>
                            </div>
                             <!-- Chapter Summary -->
                            <div class="p-1">
                                 <button onclick="window.triggerChapterSummaryGeneration('${courseId}', ${chapterNum}, '${summaryDisplayId}')" class="btn-secondary-small text-xs w-full justify-start">
                                      View/Generate Chapter Summary (AI)
                                 </button>
                                 <div id="${summaryDisplayId}" class="mt-2 border-t pt-2 text-xs text-muted hidden">Loading...</div>
                            </div>
                            <!-- Community Notes Placeholder -->
                            <div class="p-1">
                                 <button onclick="alert('Community Notes feature coming soon!')" class="btn-secondary-small text-xs w-full justify-start opacity-50 cursor-not-allowed">
                                     View Community Notes
                                 </button>
                            </div>
                             <!-- My Notes Section -->
                            <div class="mt-3 pt-2 border-t border-dashed dark:border-gray-500 p-1">
                                 <p class="text-xs font-semibold mb-1">My Notes:</p>
                                 <input type="file" id="my-notes-upload-${chapterNum}" accept=".pdf" class="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-700 dark:file:text-blue-100 dark:hover:file:bg-blue-600 mb-1" onchange="window.handleMyNoteUpload('${courseId}', ${chapterNum}, this)">
                                 <div id="my-notes-status-${chapterNum}" class="text-xs text-muted">No note uploaded.</div>
                                 <div class="flex gap-1 mt-1">
                                      <button onclick="window.reviewMyNote('${courseId}', ${chapterNum})" class="btn-secondary-small text-xs flex-1" disabled>Review with AI</button>
                                      <button onclick="window.convertMyNoteToLatex('${courseId}', ${chapterNum})" class="btn-secondary-small text-xs flex-1" disabled>Convert to LaTeX</button>
                                 </div>
                                 <div id="my-notes-latex-output-${chapterNum}" class="mt-2 hidden"></div>
                                 <div id="my-notes-ai-feedback-${chapterNum}" class="mt-2 hidden"></div>
                            </div>
                       </div>
                  </details>
              `;
         }
    } else {
        notesPanelHtml += `<p class="text-sm text-muted italic">No chapters defined for this course.</p>`;
    }

    notesPanelHtml += `</div></div>`;
    // --- End Notes Panel ---


    const html = `
        <div id="course-dashboard-area" class="animate-fade-in space-y-6 relative">
            ${unenrollButtonHtml}
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(courseDef.name)} - Dashboard</h2>
            <!-- Today's Focus -->
            <div class="content-card bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">
                 <h3 class="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">Today's Objective</h3>
                 <p class="text-xl font-medium text-gray-700 dark:text-gray-100 mb-4">${escapeHtml(todaysObjective)}</p>
                 ${nextTask ? `<button onclick="window.handleCourseAction('${courseId}', '${nextTask.type}', '${nextTask.id}')" class="btn-primary inline-flex items-center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>${nextTask.buttonText}</button>` : '<p class="text-sm text-muted">No specific action identified for today.</p>'}
            </div>

            <!-- Quick Links -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <button onclick="window.showNextLesson('${courseId}')" class="content-card text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors p-4 duration-150 ease-in-out">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 mx-auto text-primary-500 mb-2"><path stroke-linecap="round" stroke-linejoin="round" d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                     <p class="font-semibold">Next Lesson</p><p class="text-xs text-muted">(Your current target)</p>
                 </button>
                 <button onclick="window.displayCourseContentMenu('${courseId}')" class="content-card text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors p-4 duration-150 ease-in-out">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 mx-auto text-primary-500 mb-2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
                    <p class="font-semibold">Study Material</p><p class="text-xs text-muted">(Full Chapters List)</p>
                 </button>
                 <button onclick="window.showCurrentAssignmentsExams('${courseId}')" class="content-card text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors p-4 duration-150 ease-in-out">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 mx-auto text-primary-500 mb-2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08H4.123a.878.878 0 0 0-.878.878V18a2.25 2.25 0 0 0 2.25 2.25h3.879a.75.75 0 0 1 0 1.5H6.75a3.75 3.75 0 0 1-3.75-3.75V5.625a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 5.625V16.5a2.25 2.25 0 0 1-2.25 2.25h-3.879a.75.75 0 0 1 0-1.5Z" /></svg>
                     <p class="font-semibold">Assignments & Exams</p><p class="text-xs text-muted">(Daily, Weekly, etc.)</p>
                 </button>
                  <!-- Add Notes & Documents Panel to Quick Links -->
                  <button onclick="window.toggleNotesPanel()" class="content-card text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors p-4 duration-150 ease-in-out md:col-span-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 mx-auto text-primary-500 mb-2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                     <p class="font-semibold">Notes & Docs</p><p class="text-xs text-muted">(Formulas, Summaries)</p>
                 </button>
                 <button onclick="window.showCurrentCourseProgress('${courseId}')" class="content-card text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors p-4 duration-150 ease-in-out md:col-span-2">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 mx-auto text-primary-500 mb-2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
                     <p class="font-semibold">Detailed Progress</p><p class="text-xs text-muted">(Stats, Charts, Grades)</p>
                 </button>
            </div>

            <!-- Notes Panel (Initially hidden) -->
            <div id="notes-docs-panel" class="hidden">
                ${notesPanelHtml}
            </div>

        </div>
    `;
    displayContent(html, 'course-dashboard-area');
    updateMyNotesUIStatus(courseId); // Update status of "My Notes" after initial display
}

// --- Function to toggle the Notes Panel ---
export function toggleNotesPanel() {
     const panel = document.getElementById('notes-docs-panel');
     panel?.classList.toggle('hidden');
     // Scroll to the panel if opening it
     if (panel && !panel.classList.contains('hidden')) {
          panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
     }
}
window.toggleNotesPanel = toggleNotesPanel; // Assign to window


// --- Trigger and Display AI Generated Content ---

// Helper function to display generated content and handle download button
async function displayGeneratedContent(displayId, contentHtml, contentText, contentType, courseId, chapterNum) {
    const displayArea = document.getElementById(displayId);
    if (!displayArea) return;

    displayArea.innerHTML = contentHtml; // Display formatted HTML
    await renderMathIn(displayArea); // Render math

    // Find the parent container where the button should live (e.g., the div containing the display area)
    const buttonContainer = displayArea.closest('div.p-1'); // Adjust selector if structure differs
    if (!buttonContainer) {
         console.error("Could not find button container for", displayId);
         return;
    }

    // Add or update Download Button dynamically
    const downloadBtnId = `download-${contentType.toLowerCase()}-pdf-btn-${chapterNum}`;
    let downloadBtn = document.getElementById(downloadBtnId);
    if (!downloadBtn) {
        downloadBtn = document.createElement('button');
        downloadBtn.id = downloadBtnId;
        downloadBtn.textContent = 'Download PDF';
        downloadBtn.className = 'btn-secondary-small text-xs mt-2'; // Add margin
        // Insert after the display area within the same container
        displayArea.insertAdjacentElement('afterend', downloadBtn);
    }

    // Ensure the button is visible and has the correct onclick handler
    downloadBtn.onclick = () => downloadGeneratedContentPdfWrapper(contentType, courseId, chapterNum, displayId); // Use wrapper
    downloadBtn.classList.remove('hidden');

    displayArea.classList.remove('hidden');
}

// Formula Sheet Trigger
export async function triggerFormulaSheetGeneration(courseId, chapterNum, displayId) {
    const displayArea = document.getElementById(displayId);
    if (!displayArea) return;
    // displayArea.classList.toggle('hidden'); // Don't toggle here, just show loading/content
    // if (displayArea.classList.contains('hidden')) return;

    displayArea.innerHTML = `<div class="text-xs flex items-center"><div class="loader animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-500 mr-1"></div> Checking cache / Generating...</div>`;
    displayArea.classList.remove('hidden'); // Make sure it's visible
    const cacheKey = `${courseId}_formula_sheet_ch${chapterNum}`;
    const downloadBtnId = `download-formulasheet-pdf-btn-${chapterNum}`; // Consistent naming
    document.getElementById(downloadBtnId)?.remove(); // Remove old button if exists


    try {
        // 1. Check local cache
        let sheetText = generatedContentCache.get(cacheKey);
        if (sheetText) {
            console.log("Using cached formula sheet.");
            await displayGeneratedContent(displayId, formatResponseAsHtml(sheetText), sheetText, 'FormulaSheet', courseId, chapterNum);
            return;
        }

        // 2. Check Firestore
        sheetText = await getStoredChapterContent(courseId, chapterNum, 'formula_sheet');
        if (sheetText) {
            console.log("Using stored formula sheet from Firestore.");
            updateGeneratedContentCache(cacheKey, sheetText); // Add to local cache
            await displayGeneratedContent(displayId, formatResponseAsHtml(sheetText), sheetText, 'FormulaSheet', courseId, chapterNum);
            return;
        }

        // 3. Generate if not found
        console.log("Generating formula sheet via AI...");
        sheetText = await generateFormulaSheet(courseId, chapterNum); // AI function returns raw text
        const sheetHtml = formatResponseAsHtml(sheetText); // Format for display

        // 4. Display and Save/Cache
        await displayGeneratedContent(displayId, sheetHtml, sheetText, 'FormulaSheet', courseId, chapterNum);
        if (sheetText) {
            updateGeneratedContentCache(cacheKey, sheetText); // Cache locally
            await saveStoredChapterContent(courseId, chapterNum, 'formula_sheet', sheetText); // Save to Firestore
        }

    } catch (error) {
        console.error("Error triggering formula sheet generation:", error);
        if (displayArea) displayArea.innerHTML = `<p class="text-danger text-xs">Error: ${error.message}</p>`;
        document.getElementById(downloadBtnId)?.remove(); // Ensure download button is removed on error
    }
}
// Removed: window.triggerFormulaSheetGeneration = triggerFormulaSheetGeneration; // Use window scope from script.js

// Chapter Summary Trigger
export async function triggerChapterSummaryGeneration(courseId, chapterNum, displayId) {
    const displayArea = document.getElementById(displayId);
    if (!displayArea) return;
    displayArea.classList.remove('hidden');
    displayArea.innerHTML = `<div class="text-xs flex items-center"><div class="loader animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-500 mr-1"></div> Checking cache / Generating...</div>`;
    const cacheKey = `${courseId}_summary_ch${chapterNum}`;
    const downloadBtnId = `download-summary-pdf-btn-${chapterNum}`;
    document.getElementById(downloadBtnId)?.remove(); // Remove old button if exists

    try {
        // 1. Check local cache
        let summaryText = generatedContentCache.get(cacheKey);
        if (summaryText) {
            console.log("Using cached summary.");
            await displayGeneratedContent(displayId, formatResponseAsHtml(summaryText), summaryText, 'Summary', courseId, chapterNum);
            return;
        }

        // 2. Check Firestore
        summaryText = await getStoredChapterContent(courseId, chapterNum, 'summary');
        if (summaryText) {
            console.log("Using stored summary from Firestore.");
            updateGeneratedContentCache(cacheKey, summaryText); // Add to local cache
            await displayGeneratedContent(displayId, formatResponseAsHtml(summaryText), summaryText, 'Summary', courseId, chapterNum);
            return;
        }

        // 3. Generate if not found
        console.log("Generating chapter summary via AI...");
        summaryText = await generateChapterSummary(courseId, chapterNum); // AI function returns raw text
        const summaryHtml = formatResponseAsHtml(summaryText);

        // 4. Display and Save/Cache
        await displayGeneratedContent(displayId, summaryHtml, summaryText, 'Summary', courseId, chapterNum);
        if (summaryText) {
            updateGeneratedContentCache(cacheKey, summaryText); // Cache locally
            await saveStoredChapterContent(courseId, chapterNum, 'summary', summaryText); // Save to Firestore
        }

    } catch (error) {
        console.error("Error triggering chapter summary generation:", error);
        if (displayArea) displayArea.innerHTML = `<p class="text-danger text-xs">Error: ${error.message}</p>`;
        document.getElementById(downloadBtnId)?.remove(); // Ensure download button is removed on error
    }
}
// Removed: window.triggerChapterSummaryGeneration = triggerChapterSummaryGeneration; // Use window scope from script.js

// Download Handler for Generated Content Wrapper - EXPORTED
export async function downloadGeneratedContentPdfWrapper(contentType, courseId, chapterNum, displayId) {
    const cacheKey = `${courseId}_${contentType.toLowerCase()}_ch${chapterNum}`;
    let contentText = generatedContentCache.get(cacheKey); // Get from local cache first

    if (!contentText) {
        // If not in cache, try fetching from Firestore
        console.log(`Content not in cache for ${contentType} Ch ${chapterNum}, fetching from Firestore...`);
        contentText = await getStoredChapterContent(courseId, chapterNum, contentType.toLowerCase());
        if (contentText) {
            updateGeneratedContentCache(cacheKey, contentText); // Update cache if fetched
        } else {
            // If still not found, try extracting from the currently displayed HTML (less reliable)
            const displayArea = document.getElementById(displayId);
            contentText = displayArea?.innerText || null; // Use innerText as a fallback
            if(contentText) {
                console.warn(`Using innerText from display area for download - formatting might be lost.`);
            } else {
                 alert(`Cannot download: ${contentType} content not found or generated yet. Please view it first.`);
                 return;
            }
        }
    }

    await downloadGeneratedContentPdf(contentType, contentText, courseId, chapterNum);
}
// Removed: window.downloadGeneratedContentPdfWrapper = downloadGeneratedContentPdfWrapper; // Use window scope from script.js

// Internal function to handle PDF generation
async function downloadGeneratedContentPdf(contentType, contentText, courseId, chapterNum) {
    const courseName = globalCourseDataMap.get(courseId)?.name || 'Course';
    const filename = `${contentType}_${courseName.replace(/\s+/g, '_')}_Ch${chapterNum}`;
    showLoading(`Generating ${filename}.pdf...`);
    try {
        // Format the raw text content into basic HTML for PDF generation
        const contentHtml = formatResponseAsHtml(contentText); // Use the formatter from ai_integration
        const printHtml = `
            <!DOCTYPE html><html><head><title>${filename}</title>
            <style> body { font-family: sans-serif; line-height: 1.4; } .prose { max-width: none; } </style>
            </head><body>
            <h1>${contentType.replace(/_/g, ' ')} - Chapter ${chapterNum}</h1>
            ${contentHtml}
            </body></html>`;
        await generateAndDownloadPdfWithMathJax(printHtml, filename);
    } catch (error) {
        console.error(`Error generating PDF for ${contentType}:`, error);
        alert(`Failed to generate PDF for ${contentType}.`);
    } finally {
        hideLoading();
    }
}


// --- My Notes Placeholder Functions ---
export async function handleMyNoteUpload(courseId, chapterNum, inputElement) {
    const file = inputElement.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { alert("Please upload a PDF file for your notes."); inputElement.value = ''; return; }
    if (file.size > 10 * 1024 * 1024) { alert("PDF file size exceeds the limit (10MB)."); inputElement.value = ''; return; }

    const statusEl = document.getElementById(`my-notes-status-${chapterNum}`);
    const reviewBtn = document.querySelector(`button[onclick="window.reviewMyNote('${courseId}', ${chapterNum})"]`);
    const latexBtn = document.querySelector(`button[onclick="window.convertMyNoteToLatex('${courseId}', ${chapterNum})"]`);

    showLoading(`Processing note for Chapter ${chapterNum}...`);
    const noteRef = `userNotes/${currentUser.uid}/${courseId}/ch${chapterNum}_${file.name}`;
    const progress = userCourseProgressMap.get(courseId);
    if (!progress) { hideLoading(); alert("Error: Course progress not found."); return; }

    progress.myNotes = progress.myNotes || {};
    progress.myNotes[chapterNum] = {
        submittedAt: firebase.firestore.FieldValue.serverTimestamp(), noteRef: noteRef, originalFilename: file.name,
        aiRating: null, aiFeedback: null, latexSource: null
    };

    const success = await saveUserCourseProgress(currentUser.uid, courseId, progress);
    hideLoading();

    if (success) {
        if(statusEl) statusEl.textContent = `Note "${escapeHtml(file.name)}" saved.`;
        if(reviewBtn) reviewBtn.disabled = false;
        if(latexBtn) latexBtn.disabled = false;
        alert("Note metadata saved successfully! AI features are now available (based on chapter content).");
    } else {
        if(statusEl) statusEl.textContent = `Failed to save note metadata.`;
        alert("Failed to save note information.");
    }
}

export async function reviewMyNote(courseId, chapterNum) {
    alert("AI Review Feature (Placeholder):\n\nAI will provide feedback on what key concepts *should* be covered in good notes for this chapter, based on the official materials.");
    const feedbackArea = document.getElementById(`my-notes-ai-feedback-${chapterNum}`);
    if (!feedbackArea) return;
    feedbackArea.innerHTML = `<div class="text-xs flex items-center"><div class="loader animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-500 mr-1"></div> Generating AI feedback...</div>`;
    feedbackArea.classList.remove('hidden');
    showLoading("Gathering chapter content for AI review...");
    const courseDef = globalCourseDataMap.get(courseId); const chapterResources = courseDef?.chapterResources?.[chapterNum] || {}; const pdfPath = courseDef?.pdfPathPattern?.replace('{num}', chapterNum); const lectureUrls = (chapterResources.lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title); let transcriptionText = null; let fullPdfText = null;
    if (lectureUrls.length > 0) { let combinedTranscription = ""; for (const lec of lectureUrls) { const srtFilename = getSrtFilenameFromTitle(lec.title); if (srtFilename) { const transPath = `${COURSE_TRANSCRIPTION_BASE_PATH}${srtFilename}`; const text = await fetchSrtText(transPath); if (text) combinedTranscription += text + "\n\n"; } } if (combinedTranscription) transcriptionText = combinedTranscription.trim(); }
    if (pdfPath) { fullPdfText = await getAllPdfTextForAI(pdfPath); }
    hideLoading();
    if (!transcriptionText && !fullPdfText) { feedbackArea.innerHTML = `<p class="text-warning text-xs">Cannot provide feedback: No chapter content found.</p>`; return; }
    let combinedContent = `Source Material for Chapter ${chapterNum}:\n\n`; if (transcriptionText) combinedContent += `== Lecture Transcriptions ==\n${transcriptionText}\n\n`; if (fullPdfText) combinedContent += `== Chapter PDF Text ==\n${fullPdfText}\n\n`; combinedContent += `== End of Content ==`; const maxContentLength = 100000; let truncatedContent = combinedContent.substring(0, maxContentLength);
    const prompt = `Act as an expert tutor... (prompt remains the same)`;
    showLoading("Generating AI Review...");
    try {
        const aiFeedback = await callGeminiTextAPI(prompt);
        feedbackArea.innerHTML = `<p class="text-xs font-semibold mb-1">AI Feedback (Based on Chapter Content):</p><div class="prose prose-xs dark:prose-invert max-w-none">${formatResponseAsHtml(aiFeedback)}</div>`;
        await renderMathIn(feedbackArea);
    } catch (error) { console.error("Error getting AI review:", error); feedbackArea.innerHTML = `<p class="text-danger text-xs">Error: ${error.message}</p>`; } finally { hideLoading(); }
}

export async function convertMyNoteToLatex(courseId, chapterNum) {
    alert("Convert to LaTeX Feature (Placeholder):\n\nAI will extract key info from the *chapter's official materials* and format as LaTeX.");
    const latexOutputArea = document.getElementById(`my-notes-latex-output-${chapterNum}`);
    if (!latexOutputArea) return;
    latexOutputArea.innerHTML = `<div class="text-xs flex items-center"><div class="loader animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-500 mr-1"></div> Generating LaTeX...</div>`;
    latexOutputArea.classList.remove('hidden');
    showLoading("Gathering chapter content for LaTeX generation...");
    const courseDef = globalCourseDataMap.get(courseId); 
    const chapterResources = courseDef?.chapterResources?.[chapterNum] || {}; 
    const pdfPath = courseDef?.pdfPathPattern?.replace('{num}', chapterNum); 
    const lectureUrls = (chapterResources.lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title); 
    let transcriptionText = null; 
    let fullPdfText = null;
    
    if (lectureUrls.length > 0) {
        let combinedTranscription = "";
        for (const lec of lectureUrls) {
            const srtFilename = getSrtFilenameFromTitle(lec.title);
            if (srtFilename) {
                const transPath = `${COURSE_TRANSCRIPTION_BASE_PATH}${srtFilename}`;
                const text = await fetchSrtText(transPath);
                if (text) combinedTranscription += text + "\n\n";
            }
        }
        if (combinedTranscription) transcriptionText = combinedTranscription.trim();
    }
    if (pdfPath) {
        fullPdfText = await getAllPdfTextForAI(pdfPath);
    }
    hideLoading();
    
    if (!transcriptionText && !fullPdfText) {
        latexOutputArea.innerHTML = `<p class="text-warning text-xs">Cannot generate LaTeX: No chapter content found.</p>`;
        return;
    }

    let combinedContent = `Source Material for Chapter ${chapterNum}:\n\n`;
    if (transcriptionText) combinedContent += `== Lecture Transcriptions ==\n${transcriptionText}\n\n`;
    if (fullPdfText) combinedContent += `== Chapter PDF Text ==\n${fullPdfText}\n\n`;
    combinedContent += `== End of Content ==`;

    showLoading("Generating LaTeX Code...");
    try {
        const latexSource = await aiConvertToLatex(combinedContent);
        latexOutputArea.innerHTML = `<p class="text-xs font-semibold mb-1">Generated LaTeX (from Chapter Content):</p><pre><code class="block whitespace-pre-wrap text-xs">${escapeHtml(latexSource)}</code></pre><div class="flex gap-1 mt-2"><button onclick="window.downloadLatexSource(this)" class="btn-secondary-small text-xs flex-1">Download .tex</button></div>`;
    } catch (error) {
        console.error("Error generating LaTeX:", error);
        latexOutputArea.innerHTML = `<p class="text-danger text-xs">Error: ${error.message}</p>`;
    } finally {
        hideLoading();
    }
}

// Helper to update UI based on stored note status
function updateMyNotesUIStatus(courseId) {
     const progress = userCourseProgressMap.get(courseId);
     if (!progress || !progress.myNotes) return;
     for (const chapterNum in progress.myNotes) {
         const noteData = progress.myNotes[chapterNum];
         const statusEl = document.getElementById(`my-notes-status-${chapterNum}`);
         const reviewBtn = document.querySelector(`button[onclick="window.reviewMyNote('${courseId}', ${chapterNum})"]`);
         const latexBtn = document.querySelector(`button[onclick="window.convertMyNoteToLatex('${courseId}', ${chapterNum})"]`);
         if (noteData && noteData.noteRef) { if (statusEl) statusEl.textContent = `Note "${escapeHtml(noteData.originalFilename || 'Saved Note')}" saved.`; if (reviewBtn) reviewBtn.disabled = false; if (latexBtn) latexBtn.disabled = false; }
         else { if (statusEl) statusEl.textContent = `No note uploaded yet.`; if (reviewBtn) reviewBtn.disabled = true; if (latexBtn) latexBtn.disabled = true; }
     }
}

// Helper functions for LaTeX download
export function downloadLatexSource(buttonElement) {
     const codeElement = buttonElement.closest('div.flex')?.previousElementSibling?.querySelector('code');
     const latexSource = codeElement?.textContent;
     if (!latexSource) { alert("Could not find LaTeX source to download."); return; }
     const blob = new Blob([latexSource], { type: 'text/plain;charset=utf-8' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a'); a.href = url;
     const outputAreaId = buttonElement.closest('[id^="my-notes-latex-output-"]')?.id;
     const chapterNum = outputAreaId?.split('-').pop() || 'chapter';
     a.download = `chapter_${chapterNum}_notes.tex`;
     document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

// --- handleCourseAction, showCurrentCourseDashboard, showNextLesson, showFullStudyMaterial, showCurrentAssignmentsExams, showCurrentCourseProgress remain the same ---
// ... (These functions are unchanged from the previous response) ...
export function handleCourseAction(courseId, actionType, actionId) {
    // ... (function remains the same) ...
    console.log(`Handling action: ${actionType}, ID: ${actionId} for course ${courseId}`);
    switch(actionType) {
        case 'study':
            // Use window scope as showCourseStudyMaterial is in another module
            window.showCourseStudyMaterial(courseId, parseInt(actionId));
            break;
        case 'assignment':
        case 'midcourse':
        case 'weekly_exam':
        case 'final':
             // Use window scope as startAssignmentOrExam is in another module
             window.startAssignmentOrExam(courseId, actionType, actionId);
            break;
        case 'review':
             // Use window scope as showCourseProgressDetails is in another module
             window.showCourseProgressDetails(courseId);
             break;
        case 'completed':
             // Use window scope as showCourseProgressDetails is in another module
             window.showCourseProgressDetails(courseId);
             break;
        default:
            console.warn("Unhandled course action type:", actionType);
            alert(`Action '${actionType}' is not yet implemented.`);
    }
}
export function showCurrentCourseDashboard() {
    // ... (function remains the same) ...
    if (activeCourseId) {
        showCourseDashboard(activeCourseId);
    } else {
        console.warn("No active course to show dashboard for.");
        // Call directly as it's in the same module
        showMyCoursesDashboard();
    }
}
export function showNextLesson(courseId = activeCourseId) {
    // ... (function remains the same) ...
     if (!courseId) {
         console.warn("No active course for next lesson.");
         showMyCoursesDashboard(); // Go to course list if no active course
         return;
     }
     const progress = userCourseProgressMap.get(courseId);
     const courseDef = globalCourseDataMap.get(courseId);
     if (!progress || !courseDef) {
         console.error("Cannot determine next lesson: Progress or course definition missing.");
         showMyCoursesDashboard(); // Go back if data missing
         return;
     }
     // Determine target chapter based on progress, default to 1
     const targetChapter = determineTargetChapter(progress, courseDef);
     // Use the globally assigned name as it's in a different module
     window.showCourseStudyMaterial(courseId, targetChapter);
     // Optionally set a specific sidebar link active if one exists for "Next Lesson"
     setActiveSidebarLink('sidebar-next-lesson-link', 'sidebar-course-nav');
}
export function showFullStudyMaterial(courseId = activeCourseId) {
    // ... (function remains the same) ...
     if (!courseId) {
         console.warn("No active course for study material content menu.");
         showMyCoursesDashboard();
         return;
     }
     // Call the imported function to display the menu
     window.displayCourseContentMenu(courseId); // Call the specific function for this view
     setActiveSidebarLink('sidebar-study-material-link', 'sidebar-course-nav'); // Set the correct link active
}
export function showCurrentAssignmentsExams(courseId = activeCourseId) {
    // ... (function remains the same) ...
     if (!courseId) {
         console.warn("No active course for assignments/exams.");
         showMyCoursesDashboard();
         return;
     }
     // CORRECTED: Call via window scope
     window.showCourseAssignmentsExams(courseId);
     setActiveSidebarLink('sidebar-assignments-exams-link', 'sidebar-course-nav');
}
export function showCurrentCourseProgress(courseId = activeCourseId) {
    // ... (function remains the same) ...
     if (!courseId) {
         console.warn("No active course for progress details.");
         showMyCoursesDashboard();
         return;
     }
     // Call via window scope
     window.showCourseProgressDetails(courseId);
     setActiveSidebarLink('sidebar-course-progress-link', 'sidebar-course-nav');
}

// --- Unenrollment Logic ---
// ... (confirmUnenroll, handleUnenroll remain the same) ...
export function confirmUnenroll(courseId, courseName) {
    if (confirm(`Are you sure you want to unenroll from "${courseName}"?\n\nAll your progress for this course will be permanently deleted.`)) {
        handleUnenroll(courseId);
    }
}
window.confirmUnenroll = confirmUnenroll; // Assign to window scope

async function handleUnenroll(courseId) {
    if (!currentUser) {
        alert("Error: You must be logged in to unenroll.");
        return;
    }
    showLoading("Unenrolling...");
    const success = await unenrollFromCourse(currentUser.uid, courseId);
    hideLoading();
    if (success) {
        alert("Successfully unenrolled from the course.");
        // Remove from local state
        userCourseProgressMap.delete(courseId);
        setActiveCourseId(null); // Clear active course
        showMyCoursesDashboard(); // Go back to the list (Call directly)
    } else {
        alert("Failed to unenroll. Please try again.");
    }
}
// --- END OF FILE ui_course_dashboard.js ---