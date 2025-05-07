// --- START OF FILE ui_home_dashboard.js ---

import { currentUser, currentSubject, data, userCourseProgressMap, globalCourseDataMap, activeCourseId } from './state.js'; // Import course state
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showTestGenerationDashboard } from './ui_test_generation.js';
import { showExamsDashboard } from './ui_exams_dashboard.js';
import { showProgressDashboard } from './ui_progress_dashboard.js';
import { showManageSubjects } from './ui_subjects.js'; // For link if no subject
import { escapeHtml } from './utils.js'; // Import escapeHtml
// Import course functions
import { showMyCoursesDashboard } from './ui_course_dashboard.js';
import { determineTodaysObjective, determineTargetChapter } from './course_logic.js';

export function showHomeDashboard() {
    if (!currentUser) {
        // Should not happen if called correctly, but safeguard
        displayContent('<p class="text-center text-muted p-6">Please log in to view the dashboard.</p>');
        return;
    }

    // --- Prepare TestGen Snippet ---
    let testGenHtml = '';
    if (currentSubject) {
        const subjectName = currentSubject.name || 'Unnamed Subject';
        const chapters = currentSubject.chapters || {};
        const history = currentSubject.exam_history || [];
        const pending = currentSubject.pending_exams || [];
        const totalChapters = Object.keys(chapters).filter(num => chapters[num] && chapters[num].total_questions > 0).length;
        const studiedChaptersCount = currentSubject.studied_chapters?.length || 0;
        const recentExam = history.length > 0 ? history[history.length - 1] : null;
        const pendingCount = pending.filter(exam => !exam.results_entered).length;

        let recentExamHtml = 'No recent exams.';
        if (recentExam) {
            const score = recentExam.overriddenScore ?? recentExam.originalScore ?? recentExam.score ?? 0;
            const totalQ = recentExam.totalQuestions || 0;
            const percentage = totalQ > 0 ? ((score / totalQ) * 100).toFixed(0) : 'N/A';
            const date = new Date(recentExam.timestamp).toLocaleDateString();
            recentExamHtml = `Last Exam: ${date} (${score}/${totalQ} - ${percentage}%)`;
        }

        testGenHtml = `
            <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Test Generation</h3>
            <p class="text-base font-medium text-primary-600 dark:text-primary-400 mb-2">${escapeHtml(subjectName)}</p>
            <div class="space-y-1 text-sm text-muted">
                <p>${totalChapters} Chapters Loaded</p>
                <p>${studiedChaptersCount} Marked as Studied</p>
                <p>${pendingCount} Exams Pending</p>
                <p>${recentExamHtml}</p>
            </div>
             <button onclick="window.showTestGenerationDashboard()" class="mt-4 btn-secondary-small w-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                Go to TestGen Dashboard
            </button>
        `;
    } else {
        testGenHtml = `
            <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Test Generation</h3>
            <p class="text-muted text-sm mb-3">No subject selected for Test Generation.</p>
            <button onclick="window.showManageSubjects()" class="btn-secondary-small w-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                Select or Manage Subjects
            </button>
        `;
    }

    // --- Prepare Course Snippet ---
    let coursesHtml = '';
    const enrolledCoursesCount = userCourseProgressMap.size;
    if (enrolledCoursesCount > 0) {
        let nextObjective = "Review progress in your courses.";
        let nextTask = null;
        // Try to find the next objective from the *active* course if one exists
        if (activeCourseId && userCourseProgressMap.has(activeCourseId) && globalCourseDataMap.has(activeCourseId)) {
            const activeProgress = userCourseProgressMap.get(activeCourseId);
            const activeCourseDef = globalCourseDataMap.get(activeCourseId);
            nextObjective = determineTodaysObjective(activeProgress, activeCourseDef);
            nextTask = determineNextTask(activeProgress, activeCourseDef);
        }

        coursesHtml = `
            <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Courses</h3>
            <p class="text-base font-medium text-primary-600 dark:text-primary-400 mb-2">${enrolledCoursesCount} Course${enrolledCoursesCount === 1 ? '' : 's'} Enrolled</p>
            <p class="text-sm text-muted mb-3">Today's Focus: ${escapeHtml(nextObjective)}</p>
            ${nextTask ? `<button onclick="window.handleCourseAction('${activeCourseId}', '${nextTask.type}', '${nextTask.id}')" class="btn-primary-small mb-3">${nextTask.buttonText}</button>` : ''}
            <button onclick="window.showMyCoursesDashboard()" class="btn-secondary-small w-full flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
                 Go to My Courses
            </button>
        `;
    } else {
        coursesHtml = `
            <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Courses</h3>
            <p class="text-muted text-sm mb-3">You are not enrolled in any courses yet.</p>
            <button onclick="window.showBrowseCourses()" class="btn-secondary-small w-full flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
                 Browse Courses
            </button>
        `;
    }

    // --- Combine into Final Layout ---
    const html = `
    <div class="animate-fade-in space-y-6">
        <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Home Dashboard</h2>
        <p class="text-muted">Welcome back, ${escapeHtml(currentUser.displayName || 'User')}! Here's a quick overview.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Test Generation Section -->
            <div class="content-card">
                ${testGenHtml}
            </div>

            <!-- Courses Section -->
            <div class="content-card">
                ${coursesHtml}
            </div>
        </div>

         <!-- Potential space for other widgets or announcements -->
         <!--
         <div class="content-card">
             <h3 class="text-lg font-semibold mb-3">Announcements</h3>
             <p class="text-muted">No new announcements.</p>
         </div>
         -->

    </div>
    `;
    displayContent(html);
    // Ensure the separate progress dashboard container is hidden
    document.getElementById('dashboard')?.classList.add('hidden');
    setActiveSidebarLink('showHomeDashboard'); // Highlight Home link
}
// --- END OF FILE ui_home_dashboard.js ---