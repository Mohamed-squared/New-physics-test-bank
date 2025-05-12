// --- START OF FILE admin_course_content.js ---

import { db, currentUser, globalCourseDataMap } from './state.js';
import { ADMIN_UID } from './config.js'
import { escapeHtml, showLoading, hideLoading } from './utils.js';
// Import functions from the MAIN ui_courses.js that admins might trigger
import { showCourseDetails, showEditCourseForm as showAdminEditCourseForm, showAddCourseForm as showGlobalAddCourseForm, handleCourseApproval as globalHandleCourseApproval } from './ui_courses.js';
import { updateCourseDefinition } from './firebase_firestore.js'; // Admin function for course updates

// This function is responsible for rendering the "Course Content Management" section
// within the admin panel.
export function displayCourseManagementSection(containerElement) {
    containerElement.innerHTML = `
        <h3 class="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-6">Global Course Management</h3>
        <section class="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
            <h4 class="text-lg font-medium mb-3">Courses Requiring Attention</h4>
            <p class="text-sm text-muted mb-3">Review pending/reported courses. Approving here makes them globally available.</p>
            <div id="admin-global-courses-area" class="max-h-96 overflow-y-auto pr-2 mb-3 custom-scrollbar">
                <p class="text-muted text-sm">Loading courses...</p>
            </div>
            <div class="flex gap-2 mt-3">
                <button onclick="window.loadAdminCourses()" class="btn-secondary-small text-xs">Refresh List</button>
                <button onclick="window.showGlobalAddCourseForm()" class="btn-primary-small text-xs">Add New Global Course</button>
            </div>
        </section>
        
        <section class="mt-6 p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
            <h4 class="text-lg font-medium mb-3">Playlist & Chapter Resource Assignment</h4>
            <div class="flex gap-4 mb-4">
                <select id="admin-playlist-course-select" class="flex-grow form-control text-sm"><option value="">Select Course...</option></select>
                <button onclick="window.loadPlaylistForAdmin()" class="btn-secondary-small text-xs flex-shrink-0" disabled>Load Playlist Videos</button>
            </div>
            <div id="admin-playlist-videos-area" class="max-h-96 overflow-y-auto border dark:border-gray-600 rounded p-3 bg-white dark:bg-gray-800 mb-3 custom-scrollbar">
                 <p class="text-muted text-sm">Select a course to load its associated YouTube playlist(s).</p>
            </div>
            <div id="admin-video-action-area" class="mt-3 pt-3 border-t dark:border-gray-600 hidden">
                <p id="admin-selected-video-count" class="text-sm font-medium mb-3">Selected Videos: 0</p>
                <div class="flex flex-wrap gap-3 items-center">
                     <label for="admin-assign-chapter-num" class="self-center text-sm">Target Chapter:</label>
                     <input type="number" id="admin-assign-chapter-num" min="1" class="w-20 text-sm form-control">
                     <button id="admin-assign-video-btn" onclick="window.handleAssignVideoToChapter()" class="btn-primary-small text-xs" disabled>Assign Selected</button>
                     <button id="admin-unassign-video-btn" onclick="window.handleUnassignVideoFromChapter()" class="btn-danger-small text-xs" disabled>Unassign Selected</button>
                </div>
            </div>
        </section>
    `;
    loadAdminCourses();
    window.populateAdminCourseSelect();
}


export async function loadCoursesForAdmin() {
    const coursesArea = document.getElementById('admin-global-courses-area');
    if (!coursesArea) return;
    coursesArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;

    try {
        const coursesSnapshot = await db.collection('courses')
            .where('status', 'in', ['pending', 'reported']) // Only fetch these statuses
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        if (coursesSnapshot.empty) {
            coursesArea.innerHTML = '<p class="text-sm text-muted">No courses currently require admin attention.</p>';
            return;
        }

        let coursesHtml = '<div class="space-y-3">';
        coursesSnapshot.forEach(doc => {
            const course = doc.data();
            const courseId = doc.id;
            const date = course.createdAt?.toDate ? new Date(course.createdAt.toDate()).toLocaleString() : 'N/A';
            const statusClass = course.status === 'pending' ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/80' : 'border-red-400 bg-red-50 dark:bg-red-900/80';
            const statusText = course.status === 'pending' ? 'Pending Approval' : 'Reported';
            const creatorName = escapeHtml(course.creatorName || 'Unknown');
            const courseName = escapeHtml(course.name || 'Unnamed Course');

            coursesHtml += `
                <div class="course-card border rounded-lg p-3 shadow-sm text-sm ${statusClass}">
                     <div class="flex justify-between items-center mb-2">
                         <h4 class="font-semibold text-base text-primary-700 dark:text-primary-300">${courseName}</h4>
                         <span class="text-xs font-bold px-2 py-0.5 rounded ${course.status === 'pending' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}">${statusText}</span>
                     </div>
                     <p><strong>Creator:</strong> ${creatorName} (UID: ${course.creatorUid || 'N/A'})</p>
                     <p><strong>Date Submitted:</strong> ${date}</p>
                     ${course.status === 'reported' ? `<p class="text-xs mt-1"><strong>Report Reason:</strong> ${escapeHtml(course.reportReason || 'None provided.')}</p><p class="text-xs"><strong>Reported By:</strong> ${course.reportedBy?.length || 0} user(s)</p>` : ''}
                     <div class="mt-3 pt-2 border-t dark:border-gray-600 text-right space-x-2">
                          <button onclick="window.showAdminCourseDetails('${courseId}')" class="btn-secondary-small text-xs">View Details</button>
                          <button onclick="window.showAdminEditCourseForm('${courseId}')" class="btn-secondary-small text-xs">Edit</button>
                         ${course.status === 'pending' ? `
                             <button onclick="window.handleAdminCourseApproval('${courseId}', true)" class="btn-success-small text-xs">Approve</button>
                             <button onclick="window.handleAdminCourseApproval('${courseId}', false)" class="btn-danger-small text-xs">Reject</button>
                         ` : ''}
                          ${course.status === 'reported' ? `
                             <button onclick="window.handleAdminCourseApproval('${courseId}', true)" class="btn-success-small text-xs">Clear Report (Approve)</button>
                             <button onclick="window.handleAdminCourseApproval('${courseId}', false, true)" class="btn-danger-small text-xs">Delete Course</button>
                         ` : ''}
                     </div>
                </div>
            `;
        });
        coursesHtml += '</div>';
        coursesArea.innerHTML = coursesHtml;
    } catch (error) {
        console.error("Error loading global courses for admin:", error);
        if (error.code === 'failed-precondition') {
             coursesArea.innerHTML = `<p class="text-red-500 text-sm">Error: Missing Firestore index for courses query. Check console.</p>`;
        } else {
            coursesArea.innerHTML = `<p class="text-red-500 text-sm">Error loading courses: ${error.message}.</p>`;
        }
    }
}

// --- END OF FILE admin_course_content.js ---