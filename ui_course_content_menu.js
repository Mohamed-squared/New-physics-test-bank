// ui_course_content_menu.js
import { currentUser, globalCourseDataMap, activeCourseId, userCourseProgressMap } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js';
import { showCourseStudyMaterial, triggerSkipExamGeneration } from './ui_course_study_material.js'; // To view specific chapter
import { startAssignmentOrExam } from './ui_course_assignments_exams.js'; // To start exams/assignments linked here
import { SKIP_EXAM_PASSING_PERCENT } from './config.js';

/**
 * Displays the full content menu for a course, listing chapters and related items.
 * @param {string} courseId
 */
export function displayCourseContentMenu(courseId = activeCourseId) {
    if (!currentUser || !courseId) return;
    setActiveSidebarLink('sidebar-study-material-link', 'sidebar-course-nav'); // Use the correct link ID

    const courseDef = globalCourseDataMap.get(courseId);
    const progress = userCourseProgressMap.get(courseId);

    if (!courseDef || !progress) {
        displayContent(`<p class="text-red-500 p-4">Error: Course or progress data not found for ${courseId}.</p>`, 'course-dashboard-area');
        return;
    }

    let contentHtml = `<div class="animate-fade-in space-y-6">
        <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(courseDef.name)} - Study Material & Exams</h2>
        <p class="text-sm text-muted">Browse all chapters, access study materials, and take related quizzes or exams.</p>
        <div class="space-y-3">`;

    const studiedChaptersSet = new Set(progress.courseStudiedChapters || []);
    const totalChapters = courseDef.totalChapters || courseDef.chapters?.length || 0;

    if (totalChapters === 0) {
         contentHtml += `<p class="text-center text-muted italic p-4">No chapters defined for this course yet.</p>`;
    } else {
        for (let i = 1; i <= totalChapters; i++) {
            const chapterNum = i;
            const chapterTitle = courseDef.chapters?.[chapterNum - 1] || `Chapter ${chapterNum}`;
            const isStudied = studiedChaptersSet.has(chapterNum);
            const lastSkipScore = progress.lastSkipExamScore?.[chapterNum];
            const skipAttempts = progress.skipExamAttempts?.[chapterNum] || 0;

            // Check if content exists to enable the Skip Exam button
            const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
            const pdfPath = chapterResources.pdfPath || courseDef.pdfPathPattern?.replace('{num}', chapterNum);
            const transcriptionPath = chapterResources.transcriptionPath || courseDef.transcriptionPathPattern?.replace('{num}', chapterNum);
            // A simple check if *any* path exists. The generation function will handle actual fetching.
            const canAttemptSkip = pdfPath || transcriptionPath;

            // Determine Skip Exam status/button
            let skipExamStatusHtml = '';
            if (isStudied) {
                skipExamStatusHtml = `<span class="text-xs text-green-600 dark:text-green-400 font-medium ml-2">(Studied${lastSkipScore !== undefined ? ` - Score: ${lastSkipScore.toFixed(0)}%` : ''})</span>`;
            } else if (lastSkipScore !== undefined && lastSkipScore < SKIP_EXAM_PASSING_PERCENT) {
                skipExamStatusHtml = `<button onclick="window.triggerSkipExamGeneration('${courseId}', ${chapterNum})" class="btn-warning-small text-xs ml-2" title="Last Score: ${lastSkipScore.toFixed(0)}%. Attempts: ${skipAttempts}. Needs ${SKIP_EXAM_PASSING_PERCENT}%">Retake Skip Exam</button>`;
            } else {
                skipExamStatusHtml = `<button onclick="window.triggerSkipExamGeneration('${courseId}', ${chapterNum})" class="btn-secondary-small text-xs ml-2" ${!canAttemptSkip ? 'disabled title="No content for exam generation"' : `title="Mark chapter as studied by passing (${SKIP_EXAM_PASSING_PERCENT}%)"`}>Take Skip Exam</button>`;
            }

            // Check for related assignments/exams (simple example: assignment for day = chapter)
            const assignmentId = `day${chapterNum}`;
            const assignmentScore = progress.assignmentScores?.[assignmentId];
            let assignmentHtml = '';
            if (assignmentScore !== undefined) {
                 assignmentHtml = `<span class="text-xs text-blue-600 dark:text-blue-400 font-medium ml-2">(Assignment Score: ${assignmentScore.toFixed(0)}%)</span>`;
            } else if (isStudied) { // Only enable assignment if chapter is studied (or maybe day number passed?)
                 assignmentHtml = `<button onclick="window.startAssignmentOrExam('${courseId}', 'assignment', '${assignmentId}')" class="btn-secondary-small text-xs ml-2">Start Assignment ${chapterNum}</button>`;
            }

            contentHtml += `
                <details class="content-card bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
                    <summary class="flex justify-between items-center cursor-pointer p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <span class="font-semibold text-gray-700 dark:text-gray-200">Chapter ${chapterNum}: ${escapeHtml(chapterTitle)}</span>
                        <div class="flex items-center flex-shrink-0">
                             ${isStudied ? '<span class="text-xs px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100 rounded-full font-medium mr-2">Studied</span>' : ''}
                            <svg class="w-5 h-5 text-gray-500 dark:text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </summary>
                    <div class="p-3 border-t dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 space-y-2 text-sm">
                        <!-- Actions for this chapter -->
                        <div class="flex flex-wrap gap-2 items-center">
                            <button onclick="window.showCourseStudyMaterial('${courseId}', ${chapterNum})" class="btn-primary-small text-xs">View Chapter Material</button>
                            ${skipExamStatusHtml}
                            ${assignmentHtml}
                            <!-- Add more logic here for weekly/midcourse exams if applicable to this chapter -->
                        </div>
                    </div>
                </details>
            `;
        }
    }


    contentHtml += `</div></div>`; // Close space-y-3 and main container
    displayContent(contentHtml, 'course-dashboard-area');
}

// Assign to window scope in script.js
// window.displayCourseContentMenu = displayCourseContentMenu;