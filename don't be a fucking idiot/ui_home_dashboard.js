// --- START OF FILE ui_home_dashboard.js ---

import { currentUser, currentSubject, data } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showTestGenerationDashboard } from './ui_test_generation.js';
import { showExamsDashboard } from './ui_exams_dashboard.js';
import { showProgressDashboard } from './ui_progress_dashboard.js';
import { showManageSubjects } from './ui_subjects.js'; // For link if no subject
import { escapeHtml } from './utils.js'; // Import escapeHtml

export function showHomeDashboard() {
    if (!currentUser) {
        // Should not happen if called correctly, but safeguard
        displayContent('<p class="text-center text-muted p-6">Please log in to view the dashboard.</p>');
        return;
    }

    if (!currentSubject) {
        displayContent(`
            <div class="text-center p-8 content-card animate-fade-in">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-16 h-16 mx-auto text-primary-500 mb-4">
                  <path d="M11.7 4.879a.75.75 0 0 1 2.121 0l5.172 4.307a.75.75 0 0 1-.18 1.15l-1.258.63a.75.75 0 0 0-.608 1.119l1.086 1.923a.75.75 0 0 1-.628 1.075l-1.258.179a.75.75 0 0 0-.674.949l.3 1.352a.75.75 0 0 1-1.008.738l-1.286-.643a.75.75 0 0 0-.862 0l-1.286.643a.75.75 0 0 1-1.008-.738l.3-1.352a.75.75 0 0 0-.674-.95l-1.258-.178a.75.75 0 0 1-.628-1.075l1.086-1.923a.75.75 0 0 0-.608-1.119l-1.258-.63a.75.75 0 0 1-.18-1.15l5.172-4.307Z" />
                  <path d="m11.15 16.34 1.018 4.578a.75.75 0 0 0 1.38-.308l1.018-4.578a.75.75 0 0 0-.608-1.119l-1.258-.63a.75.75 0 0 0-.862 0l-1.258.63a.75.75 0 0 0-.608 1.119Z" />
                </svg>
                <h2 class="text-2xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Welcome, ${escapeHtml(currentUser.displayName || 'User')}!</h2>
                <p class="text-muted mb-6">Please select a subject to access its dashboard and features.</p>
                <button onclick="window.showManageSubjects()" class="btn-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path d="M5.75 2.75a.75.75 0 0 0-1.5 0v14.5a.75.75 0 0 0 1.5 0V2.75Z" /><path d="M9.75 11.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Z" /><path d="M13.75 5.75a.75.75 0 0 0-1.5 0v11.5a.75.75 0 0 0 1.5 0V5.75Z" /></svg>
                    Select or Manage Subjects
                </button>
            </div>
        `);
        setActiveSidebarLink('showHomeDashboard'); // Still highlight home
        return;
    }

    // --- Build Dashboard Content ---
    const subjectName = currentSubject.name || 'Unnamed Subject';
    const chapters = currentSubject.chapters || {};
    // Use exam_history from the current subject in appData
    const history = currentSubject.exam_history || [];
    const pending = currentSubject.pending_exams || [];

    const totalChapters = Object.keys(chapters).filter(num => chapters[num] && chapters[num].total_questions > 0).length;
    const studiedChaptersCount = currentSubject.studied_chapters?.length || 0;
    const recentExams = history.slice(-3).reverse(); // Get last 3 exams, newest first
    const pendingCount = pending.filter(exam => !exam.results_entered).length;

    let recentExamsHtml = recentExams.length > 0 ? recentExams.map(exam => {
         const score = exam.overriddenScore ?? exam.originalScore ?? exam.score ?? 0;
         const totalQ = exam.totalQuestions || 0;
         const percentage = totalQ > 0 ? ((score / totalQ) * 100).toFixed(0) : 'N/A';
         const date = new Date(exam.timestamp).toLocaleDateString();
         const originalIndex = history.findIndex(h => h.examId === exam.examId && h.timestamp === exam.timestamp);
         const isOverridden = exam.overriddenScore !== undefined && exam.overriddenScore !== (exam.originalScore ?? exam.score ?? 0);
         const typeBadge = exam.type === 'pdf'
             ? `<span class="ml-2 text-xs bg-purple-100 text-purple-700 dark:bg-purple-700 dark:text-purple-200 px-1.5 py-0.5 rounded-full font-medium">PDF</span>`
             : `<span class="ml-2 text-xs bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-200 px-1.5 py-0.5 rounded-full font-medium">Online</span>`;
         const overriddenBadge = isOverridden ? `<span class="ml-1 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-200 px-1.5 py-0.5 rounded-full font-medium">Overridden</span>` : '';

         return `
         <li class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md border dark:border-gray-600 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-600">
             <div class="flex-grow mr-3 overflow-hidden">
                 <span class="font-medium text-gray-800 dark:text-gray-200 truncate block" title="${escapeHtml(exam.examId)}">${escapeHtml(exam.examId.replace('Exam-', ''))}</span>
                 <span class="text-xs text-muted">${date}${typeBadge}${overriddenBadge}</span>
             </div>
             <div class="flex items-center flex-shrink-0">
                <span class="font-semibold text-base mr-3 ${percentage !== 'N/A' && percentage >= 70 ? 'text-success' : percentage !== 'N/A' && percentage >= 50 ? 'text-warning' : 'text-danger'}">
                     ${score}/${totalQ}
                     <span class="text-xs text-muted">(${percentage}%)</span>
                 </span>
                ${originalIndex !== -1 ? `<a href="#" onclick="window.showExamDetailsWrapper(${originalIndex}); return false;" class="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium text-xs">View</a>` : ''}
             </div>
         </li>`;
    }).join('') : '<li class="text-sm text-muted text-center py-4">No completed exams yet.</li>';

    const html = `
    <div class="animate-fade-in space-y-6">
        <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Home Dashboard</h2>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <!-- Current Subject & Stats -->
            <div class="content-card lg:col-span-1">
                <h3 class="text-lg font-semibold mb-4 border-b pb-2 dark:border-gray-700 text-gray-700 dark:text-gray-300">Current Subject</h3>
                <p class="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-2">${escapeHtml(subjectName)}</p>
                <div class="space-y-1 text-sm text-muted">
                    <p><strong class="font-medium text-gray-600 dark:text-gray-300">${totalChapters}</strong> Chapters Loaded</p>
                    <p><strong class="font-medium text-gray-600 dark:text-gray-300">${studiedChaptersCount}</strong> Marked as Studied</p>
                    <p><strong class="font-medium text-gray-600 dark:text-gray-300">${history.length}</strong> Exams Completed</p>
                    <p><strong class="font-medium text-gray-600 dark:text-gray-300">${pendingCount}</strong> Exams Pending</p>
                </div>
                <button onclick="window.showManageSubjects()" class="mt-4 text-sm text-primary-600 hover:underline dark:text-primary-400">Change Subject</button>
            </div>

            <!-- Quick Actions -->
            <div class="content-card lg:col-span-2">
                <h3 class="text-lg font-semibold mb-4 border-b pb-2 dark:border-gray-700 text-gray-700 dark:text-gray-300">Quick Actions (Test Generation)</h3>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <button onclick="window.showTestGenerationDashboard()" class="btn-primary w-full flex flex-col items-center justify-center p-4 h-28 text-center">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6 mb-1"><path d="M11.983 1.906a.75.75 0 0 0-1.966 0l-4.25 2.5a.75.75 0 0 0-.417.658V10.5a.75.75 0 0 0 .417.658l4.25 2.5a.75.75 0 0 0 .984 0l4.25-2.5a.75.75 0 0 0 .417-.658V5.064a.75.75 0 0 0-.417-.658l-4.25-2.5ZM6.5 4.814 10 6.999l3.5-2.185L10 2.63 6.5 4.814Z" /><path d="M14 11.702V15.5a.75.75 0 0 1-.417.658l-4.25 2.5a.75.75 0 0 1-.984 0l-4.25-2.5a.75.75 0 0 1-.417-.658V11.702l4.667 2.747a.75.75 0 0 0 .666 0L14 11.702Z" /></svg>
                         Generate Test
                     </button>
                     <button onclick="window.showProgressDashboard()" class="btn-secondary w-full flex flex-col items-center justify-center p-4 h-28 text-center">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6 mb-1"><path d="M2 10a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0V10.75H2.75A.75.75 0 0 1 2 10Z" /><path d="M7.25 3A.75.75 0 0 0 6.5 3.75v12.5a.75.75 0 0 0 1.5 0V4.5h1V16.25a.75.75 0 0 0 1.5 0V3.75a.75.75 0 0 0-.75-.75h-2.5Z" /><path d="M13.5 6a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v10a.75.75 0 0 1-1.5 0V6.75H14.25A.75.75 0 0 1 13.5 6Z" /></svg>
                         View Progress (Test Gen)
                     </button>
                     <button onclick="window.showExamsDashboard()" class="btn-secondary w-full flex flex-col items-center justify-center p-4 h-28 text-center">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6 mb-1"><path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.75 9.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd" /></svg>
                         View Exams (Test Gen)
                     </button>
                </div>
            </div>
        </div>

        <!-- Recent Activity -->
        <div class="content-card">
             <h3 class="text-lg font-semibold mb-4 border-b pb-2 dark:border-gray-700 text-gray-700 dark:text-gray-300">Recent Exam History (Test Gen)</h3>
             <ul class="space-y-3">
                 ${recentExamsHtml}
             </ul>
        </div>
    </div>
    `;
    displayContent(html);
    // Ensure the separate progress dashboard container is hidden
    document.getElementById('dashboard')?.classList.add('hidden');
    setActiveSidebarLink('showHomeDashboard'); // Highlight Home link
}
// --- END OF FILE ui_home_dashboard.js ---