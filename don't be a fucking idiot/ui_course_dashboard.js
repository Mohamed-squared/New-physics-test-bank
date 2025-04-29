// --- START OF FILE ui_course_dashboard.js ---

// ui_course_dashboard.js

import { currentUser, userCourseProgressMap, globalCourseDataMap, activeCourseId, setActiveCourseId } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js';
// Import the function that will display the content menu
import { displayCourseContentMenu } from './ui_course_content_menu.js';
// Import other necessary functions
import { showCourseAssignmentsExams, startAssignmentOrExam } from './ui_course_assignments_exams.js';
import { showCourseProgressDetails } from './ui_course_progress.js';
import { determineTodaysObjective, getLetterGradeColor, calculateAttendanceScore, determineNextTask, determineTargetChapter } from './course_logic.js';
import { unenrollFromCourse } from './firebase_firestore.js';
// NOTE: We can still call showMyCoursesDashboard directly within this file if needed

// Add import for notes panel
import { showNotesDocumentsPanel } from './ui_notes_documents.js';

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
export async function showCourseDashboard(courseId) { // Made async
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

    const html = `
        <div id="course-dashboard-area" class="animate-fade-in space-y-6 relative"> <!-- Added relative positioning -->
            ${unenrollButtonHtml} <!-- Add unenroll button -->
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(courseDef.name)} - Dashboard</h2>

            <!-- Today's Focus -->
            <div class="content-card bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">
                 <h3 class="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">Today's Objective</h3>
                 <p class="text-xl font-medium text-gray-700 dark:text-gray-100 mb-4">${escapeHtml(todaysObjective)}</p>
                 ${nextTask ? `<button onclick="window.handleCourseAction('${courseId}', '${nextTask.type}', '${nextTask.id}')" class="btn-primary inline-flex items-center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" /></svg>${nextTask.buttonText}</button>` : '<p class="text-sm text-muted">No specific action identified for today.</p>'}
            </div>

             <!-- NEW Notes & Documents Panel Container -->
             <div id="notes-documents-area" class="mt-6">
                  <p class="text-center text-muted italic p-4">Loading notes & documents...</p>
                  <div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
             </div>

            <!-- Quick Links -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

                 <button onclick="window.showNextLesson('${courseId}')" class="content-card text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors p-4 duration-150 ease-in-out">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 mx-auto text-primary-500 mb-2"><path stroke-linecap="round" stroke-linejoin="round" d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                     <p class="font-semibold">Next Lesson</p><p class="text-xs text-muted">(Your current target)</p>
                 </button>

                 <button onclick="window.displayCourseContentMenu('${courseId}')" class="content-card text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors p-4 duration-150 ease-in-out">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 mx-auto text-primary-500 mb-2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
                    <p class="font-semibold">Study Material</p><p class="text-xs text-muted">(Full Chapters & Exams)</p>
                 </button>

                 <button onclick="window.showCurrentAssignmentsExams('${courseId}')" class="content-card text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors p-4 duration-150 ease-in-out">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 mx-auto text-primary-500 mb-2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08H4.123a.878.878 0 0 0-.878.878V18a2.25 2.25 0 0 0 2.25 2.25h3.879a.75.75 0 0 1 0 1.5H6.75a3.75 3.75 0 0 1-3.75-3.75V5.625a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 5.625V16.5a2.25 2.25 0 0 1-2.25 2.25h-3.879a.75.75 0 0 1 0-1.5Z" /></svg>
                     <p class="font-semibold">Assignments & Exams</p><p class="text-xs text-muted">(Daily, Weekly, etc.)</p>
                 </button>

                 <button onclick="window.showCurrentCourseProgress('${courseId}')" class="content-card text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors p-4 duration-150 ease-in-out md:col-start-3">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 mx-auto text-primary-500 mb-2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
                     <p class="font-semibold">Detailed Progress</p><p class="text-xs text-muted">(Stats, Charts, Grades)</p>
                 </button>
            </div>
        </div>
    `;
    displayContent(html, 'course-dashboard-area');

    // Trigger loading notes/docs panel AFTER main dashboard is displayed
    // Determine target chapter for notes (usually the current target chapter)
    const targetChapterForNotes = determineTargetChapter(progress, courseDef);
    await showNotesDocumentsPanel(courseId, targetChapterForNotes);

}

// --- NEW: Unenrollment Logic ---
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

/**
 * Handles the click action for the main button on the course dashboard.
 * @param {string} courseId
 * @param {string} actionType - Type of action ('study', 'assignment', 'midcourse', etc.)
 * @param {string} actionId - Specific ID for the action (chapter number, assignment ID, etc.)
 */
export function handleCourseAction(courseId, actionType, actionId) {
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

// --- Functions called by sidebar links ---
/**
 * Shows the dashboard for the currently active course.
 * If no course is active, shows the "My Courses" list.
 */
export async function showCurrentCourseDashboard() {
    if (activeCourseId) {
        await showCourseDashboard(activeCourseId);
    } else {
        console.warn("No active course to show dashboard for.");
        // Call directly as it's in the same module
        showMyCoursesDashboard();
    }
}

/**
 * RENAMED: Shows the study material for the *next target lesson* of the active course.
 * This is triggered by the "Next Lesson" button/link.
 * @param {string} [courseId=activeCourseId] - Optional override for course ID.
 */
export function showNextLesson(courseId = activeCourseId) {
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

/**
 * NEW: Shows the full study material content menu (e.g., chapter list).
 * This is triggered by the "Study Material" button/link.
 * @param {string} [courseId=activeCourseId] - Optional override for course ID.
 */
export function showFullStudyMaterial(courseId = activeCourseId) {
     if (!courseId) {
         console.warn("No active course for study material content menu.");
         showMyCoursesDashboard();
         return;
     }
     // Call the imported function to display the menu
     window.displayCourseContentMenu(courseId); // Call the specific function for this view
     setActiveSidebarLink('sidebar-study-material-link', 'sidebar-course-nav'); // Set the correct link active
}


/**
 * Shows the list of assignments and exams for the active course.
 * @param {string} [courseId=activeCourseId] - Optional override for course ID.
 */
export function showCurrentAssignmentsExams(courseId = activeCourseId) {
     if (!courseId) {
         console.warn("No active course for assignments/exams.");
         showMyCoursesDashboard();
         return;
     }
     // CORRECTED: Call via window scope
     window.showCourseAssignmentsExams(courseId);
     setActiveSidebarLink('sidebar-assignments-exams-link', 'sidebar-course-nav');
}

/**
 * Shows the detailed progress page for the active course.
 * @param {string} [courseId=activeCourseId] - Optional override for course ID.
 */
export function showCurrentCourseProgress(courseId = activeCourseId) {
     if (!courseId) {
         console.warn("No active course for progress details.");
         showMyCoursesDashboard();
         return;
     }
     // Call via window scope
     window.showCourseProgressDetails(courseId);
     setActiveSidebarLink('sidebar-course-progress-link', 'sidebar-course-nav');
}


// --- Assign functions needed by HTML onclick attributes to window scope ---
// Note: showMyCoursesDashboard is already exported, no need to assign again
window.navigateToCourseDashboard = navigateToCourseDashboard;
window.handleCourseAction = handleCourseAction;
window.showNextLesson = showNextLesson;
window.showFullStudyMaterial = showFullStudyMaterial;
window.showCurrentAssignmentsExams = showCurrentAssignmentsExams;
window.showCurrentCourseProgress = showCurrentCourseProgress;

// --- END OF FILE ui_course_dashboard.js ---