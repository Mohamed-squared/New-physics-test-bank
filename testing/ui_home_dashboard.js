// --- START OF FILE ui_home_dashboard.js ---

import { currentUser, currentSubject, data, userCourseProgressMap, globalCourseDataMap } from './state.js'; // Added course state
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showTestGenerationDashboard } from './ui_test_generation.js';
import { showExamsDashboard } from './ui_exams_dashboard.js';
import { showProgressDashboard } from './ui_progress_dashboard.js';
import { showManageSubjects } from './ui_subjects.js'; // For link if no subject
import { escapeHtml } from './utils.js'; // Import escapeHtml
// NEW: Import course dashboard functions
import { showMyCoursesDashboard, showCurrentCourseDashboard } from './ui_course_dashboard.js';
import { getLetterGradeColor, calculateAttendanceScore, determineTodaysObjective } from './course_logic.js';

export function showHomeDashboard() {
    if (!currentUser) {
        // Should not happen if called correctly, but safeguard
        displayContent('<p class="text-center text-muted p-6">Please log in to view the dashboard.</p>');
        return;
    }
    setActiveSidebarLink('showHomeDashboard'); // Highlight Home link

    // --- Welcome & Get Data ---
    let welcomeHtml = `
        <div class="mb-6 pb-4 border-b dark:border-gray-700">
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Welcome, ${escapeHtml(currentUser.displayName || 'User')}!</h2>
            <p class="text-muted">Your central dashboard for test generation and course progress.</p>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    `;

    // --- Test Generation Section ---
    let testGenHtml = `<div class="content-card space-y-4">`;
    testGenHtml += `<h3 class="text-lg font-semibold mb-3 text-indigo-600 dark:text-indigo-400 border-b pb-2 dark:border-gray-600">Test Generation</h3>`;
    if (!currentSubject) {
        testGenHtml += `
            <p class="text-sm text-muted">No subject selected for Test Generation.</p>
            <button onclick="window.showManageSubjects()" class="btn-secondary-small">Select Subject</button>
        `;
    } else {
        const subjectName = currentSubject.name || 'Unnamed Subject';
        const history = currentSubject.exam_history || [];
        const pending = currentSubject.pending_exams || [];
        const recentExam = history.length > 0 ? history[history.length - 1] : null;
        const pendingCount = pending.filter(exam => !exam.results_entered).length;

        testGenHtml += `<p class="text-sm font-medium text-gray-700 dark:text-gray-300">Current Subject: <strong class="text-primary-600 dark:text-primary-400">${escapeHtml(subjectName)}</strong></p>`;
        if (recentExam) {
            const score = recentExam.overriddenScore ?? recentExam.originalScore ?? recentExam.score ?? 0;
            const totalQ = recentExam.totalQuestions || 0;
            const percentage = totalQ > 0 ? ((score / totalQ) * 100).toFixed(0) : 'N/A';
            testGenHtml += `<p class="text-xs text-muted">Last Exam: ${score}/${totalQ} (${percentage}%) on ${new Date(recentExam.timestamp).toLocaleDateString()}</p>`;
        } else {
            testGenHtml += `<p class="text-xs text-muted">No recent exam history for this subject.</p>`;
        }
        if (pendingCount > 0) {
             testGenHtml += `<p class="text-xs text-yellow-600 dark:text-yellow-400">${pendingCount} PDF Exam(s) Pending Results</p>`;
        }
        testGenHtml += `<div class="flex flex-wrap gap-2 pt-3">
                           <button onclick="window.showTestGenerationDashboard()" class="btn-primary-small text-xs">Generate Test</button>
                           <button onclick="window.showExamsDashboard()" class="btn-secondary-small text-xs">View History</button>
                           <button onclick="window.showProgressDashboard()" class="btn-secondary-small text-xs">View Progress</button>
                       </div>`;
    }
    testGenHtml += `</div>`;

    // --- Courses Section ---
    let coursesHtml = `<div class="content-card space-y-4">`;
    coursesHtml += `<h3 class="text-lg font-semibold mb-3 text-teal-600 dark:text-teal-400 border-b pb-2 dark:border-gray-600">My Courses</h3>`;
    if (userCourseProgressMap.size === 0) {
        coursesHtml += `
            <p class="text-sm text-muted">You are not enrolled in any courses.</p>
            <button onclick="window.showBrowseCourses()" class="btn-primary-small text-xs">Browse Courses</button>
        `;
    } else {
        // Show snippet of the *most recently active* course (or first enrolled if none active)
        let courseToShowId = activeCourseId || userCourseProgressMap.keys().next().value;
        let progressToShow = userCourseProgressMap.get(courseToShowId);
        let courseDefToShow = globalCourseDataMap.get(courseToShowId);

        if (progressToShow && courseDefToShow) {
             const todaysObjective = determineTodaysObjective(progressToShow, courseDefToShow);
             coursesHtml += `<p class="text-sm font-medium text-gray-700 dark:text-gray-300">Active Course: <strong class="text-teal-600 dark:text-teal-400">${escapeHtml(courseDefToShow.name)}</strong></p>`;
             coursesHtml += `<p class="text-xs text-muted">Today's Objective: ${escapeHtml(todaysObjective)}</p>`;
             coursesHtml += `<div class="flex flex-wrap gap-2 pt-3">
                                <button onclick="window.navigateToCourseDashboard('${courseToShowId}')" class="btn-primary-small text-xs">Go to Course</button>
                                <button onclick="window.showMyCoursesDashboard()" class="btn-secondary-small text-xs">View All Courses</button>
                           </div>`;
        } else {
            coursesHtml += `<p class="text-sm text-muted">Could not load details for active/enrolled courses.</p>
                             <button onclick="window.showMyCoursesDashboard()" class="btn-secondary-small text-xs">View All Courses</button>`;
        }
    }
    coursesHtml += `</div>`;

    // --- Combine Sections ---
    const finalHtml = `
        <div class="animate-fade-in space-y-6">
            ${welcomeHtml}
            ${testGenHtml}
            ${coursesHtml}
            </div> <!-- Close grid -->
        </div>
    `;

    displayContent(finalHtml);
    document.getElementById('dashboard')?.classList.add('hidden'); // Ensure standard progress dash is hidden
}
// --- END OF FILE ui_home_dashboard.js ---