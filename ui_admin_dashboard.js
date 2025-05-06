// --- START OF FILE ui_admin_dashboard.js ---

// ui_admin_dashboard.js

import { db, currentUser, globalCourseDataMap, userCourseProgressMap, updateGlobalCourseData } from './state.js'; // Added currentUser
import { ADMIN_UID, YOUTUBE_API_KEY, DEFAULT_PROFILE_PIC_URL } from './config.js'; // Import YouTube API Key and DEFAULT_PROFILE_PIC_URL
import { displayContent, clearContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js';
// MODIFIED: Added imports for Admin Tasks
import {
    sendAdminReply,
    updateCourseStatusForUser,
    handleAddBadgeForUser,
    handleRemoveBadgeForUser,
    updateCourseDefinition,
    deleteUserFormulaSheet,
    deleteUserChapterSummary,
    deleteAllFeedbackMessages,
    deleteAllExamIssues,
    adminUpdateUsername,
    fetchAdminTasks,      // <-- Import new function
    addAdminTask,         // <-- Import new function
    updateAdminTaskStatus,// <-- Import new function
    deleteAdminTask,       // <-- Import new function
    toggleUserAdminStatus, // <-- MODIFIED: Import toggleUserAdminStatus
    adminUpdateUserSubjectStatus // MODIFIED: Import for subject status
} from './firebase_firestore.js'; // Import badge handlers & course definition update
// Import course functions needed by admin buttons
import { handleCourseApproval, showCourseDetails, showEditCourseForm, showBrowseCourses, showAddCourseForm } from './ui_courses.js'; // Added showBrowseCourses, showAddCourseForm
// Use the imported escapeHtml from utils.js
// Removed redundant escapeHtml import

// State for Playlist Management section
let selectedVideosForAssignment = []; // Array to hold { videoId, title }
let currentLoadedPlaylistCourseId = null;
let currentManagingUserIdForSubjects = null; // MODIFIED: For subject management

// --- Admin Dashboard UI ---

export function showAdminDashboard() {
    if (currentUser?.uid !== ADMIN_UID) {
        displayContent('<p class="text-red-500 p-4">Access Denied. Admin privileges required.</p>');
        return;
    }
    clearContent();
    setActiveSidebarLink('showAdminDashboard', 'sidebar-standard-nav');

    displayContent(`
        <div class="animate-fade-in space-y-8">
            <h2 class="text-2xl font-semibold text-indigo-600 dark:text-indigo-400">Admin Dashboard</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

                <!-- Feedback Management Card -->
                <div class="content-card">
                    <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">Recent Feedback Messages</h3>
                    <div id="admin-feedback-area" class="max-h-96 overflow-y-auto pr-2">
                        <p class="text-muted text-sm">Loading feedback...</p>
                    </div>
                    <div class="flex gap-2 mt-3">
                        <button onclick="window.loadFeedbackForAdmin()" class="btn-secondary-small text-xs">Refresh Feedback</button>
                        <button onclick="window.confirmDeleteAllFeedback()" class="btn-danger-small text-xs">Delete ALL Feedback</button>
                    </div>
                </div>

                <!-- Course Management Card -->
                <div class="content-card">
                    <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">Course Management</h3>
                    <p class="text-sm text-muted mb-3">Review pending/reported courses or add new ones.</p>
                    <div id="admin-courses-area" class="max-h-80 overflow-y-auto pr-2 mb-3">
                        <p class="text-muted text-sm">Loading courses requiring attention...</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.loadCoursesForAdmin()" class="btn-secondary-small text-xs">Refresh List</button>
                        <button onclick="window.showAddCourseForm()" class="btn-primary-small text-xs">Add New Course</button>
                        <button onclick="window.showBrowseCourses()" class="btn-secondary-small text-xs">Browse All Courses</button>
                    </div>
                </div>

                <!-- User Course Management Card -->
                <div class="content-card">
                    <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">User Course Management</h3>
                    <div class="flex gap-4 mb-4">
                        <input type="text" id="admin-user-search-courses" placeholder="Enter User ID or Email..." class="flex-grow text-sm">
                        <button onclick="window.loadUserCoursesForAdmin()" class="btn-secondary-small text-xs flex-shrink-0">Load User Courses</button>
                    </div>
                     <div id="admin-user-courses-area" class="max-h-80 overflow-y-auto pr-2">
                        <p class="text-muted text-sm">Enter a User ID or Email and click 'Load'.</p>
                    </div>
                </div>

                <!-- User Badge Management Card -->
                <div class="content-card">
                    <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">User Badge Management</h3>
                    <div class="flex gap-4 mb-4">
                        <input type="text" id="admin-user-search-badges" placeholder="Enter User ID or Email..." class="flex-grow text-sm">
                        <button onclick="window.loadUserBadgesForAdmin()" class="btn-secondary-small text-xs flex-shrink-0">Load User Badges</button>
                    </div>
                     <div id="admin-user-badges-area" class="max-h-80 overflow-y-auto pr-2">
                        <p class="text-muted text-sm">Enter a User ID or Email and click 'Load'.</p>
                    </div>
                </div>

                 <!-- MODIFIED: User Subject Management Card (Full Width) -->
                <div class="content-card md:col-span-2">
                    <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">User Subject Management (Approval)</h3>
                    <div class="flex gap-4 mb-4">
                        <input type="text" id="admin-user-search-subjects" placeholder="Enter User ID or Email..." class="flex-grow text-sm">
                        <button onclick="window.loadUserSubjectsForAdmin()" class="btn-secondary-small text-xs flex-shrink-0">Load User's Subjects</button>
                    </div>
                    <div id="admin-user-subjects-area" class="max-h-96 overflow-y-auto pr-2">
                        <p class="text-muted text-sm">Enter a User ID or Email to load their subjects for approval.</p>
                    </div>
                </div>


                <!-- User Listing Card (Full Width) -->
                <div class="content-card md:col-span-2">
                    <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">User Management</h3>
                    <div class="flex gap-4 mb-4">
                        <input type="text" id="admin-user-list-search" placeholder="Search Users by Email or Name..." class="flex-grow text-sm">
                        <button onclick="window.listAllUsersAdmin()" class="btn-secondary-small text-xs flex-shrink-0">Search / List Users</button>
                    </div>
                    <div id="admin-user-list-area" class="max-h-96 overflow-y-auto pr-2">
                        <p class="text-muted text-sm">Click 'Search / List Users' to load.</p>
                    </div>
                </div>

                 <!-- NEW: Admin Tasks Card -->
                <div class="content-card md:col-span-2">
                    <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">Errors / Features To Fix (Admin Tasks)</h3>
                    <div class="flex gap-4 mb-4">
                        <input type="text" id="admin-new-task-input" placeholder="Enter new task description..." class="flex-grow text-sm">
                        <button onclick="window.handleAddAdminTask()" class="btn-primary-small text-xs flex-shrink-0">Add Task</button>
                    </div>
                    <div id="admin-tasks-area" class="max-h-96 overflow-y-auto pr-2">
                        <p class="text-muted text-sm">Loading tasks...</p>
                    </div>
                </div>

                <!-- Playlist Assignment Card -->
                <div class="content-card md:col-span-2">
                    <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">Playlist & Chapter Assignment</h3>
                     <div class="flex gap-4 mb-4">
                        <select id="admin-playlist-course-select" class="flex-grow"><option value="">Select Course...</option></select>
                        <button onclick="window.loadPlaylistForAdmin()" class="btn-secondary-small text-xs flex-shrink-0" disabled>Load Playlist Videos</button>
                     </div>
                     <div id="admin-playlist-videos-area" class="max-h-96 overflow-y-auto border dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-700/50 mb-3">
                          <p class="text-muted text-sm">Select a course to load its associated YouTube playlist(s).</p>
                     </div>
                     <div id="admin-video-action-area" class="mt-3 pt-3 border-t dark:border-gray-600 hidden">
                         <p id="admin-selected-video-count" class="text-sm font-medium mb-3">Selected Videos: 0</p>
                         <div class="flex flex-wrap gap-3 items-center">
                              <label for="admin-assign-chapter-num" class="self-center text-sm">Target Chapter:</label>
                              <input type="number" id="admin-assign-chapter-num" min="1" class="w-20 text-sm">
                              <button id="admin-assign-video-btn" onclick="window.handleAssignVideoToChapter()" class="btn-primary-small text-xs" disabled>Assign Selected</button>
                              <button id="admin-unassign-video-btn" onclick="window.handleUnassignVideoFromChapter()" class="btn-danger-small text-xs" disabled>Unassign Selected</button>
                         </div>
                     </div>
                </div>

                <!-- Delete Generated Content Card -->
                <div class="content-card md:col-span-2">
                    <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">Delete Generated Content</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label for="admin-delete-content-user" class="block text-sm font-medium mb-1">User ID or Email</label>
                            <input type="text" id="admin-delete-content-user" class="w-full text-sm" placeholder="Enter User ID or Email...">
                        </div>
                        <div>
                            <label for="admin-delete-content-course" class="block text-sm font-medium mb-1">Course ID</label>
                            <input type="text" id="admin-delete-content-course" class="w-full text-sm" placeholder="e.g., fop_physics_v1">
                        </div>
                        <div>
                            <label for="admin-delete-content-chapter" class="block text-sm font-medium mb-1">Chapter Number</label>
                            <input type="number" id="admin-delete-content-chapter" class="w-full text-sm" min="1" placeholder="e.g., 1">
                        </div>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="window.handleDeleteUserFormulaSheetAdmin()" class="btn-danger-small text-xs">Delete Formula Sheet</button>
                        <button onclick="window.handleDeleteUserChapterSummaryAdmin()" class="btn-danger-small text-xs">Delete Chapter Summary</button>
                    </div>
                    <div id="admin-delete-content-status" class="mt-3 text-sm"></div>
                </div>

                <!-- NEW: Chat Auto-Deletion Card -->
                <div class="content-card md:col-span-2">
                    <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">Chat Auto-Deletion</h3>
                    <p class="text-sm text-muted mb-3">
                        Configure automatic deletion of old messages in the global chat.
                        <strong>Note:</strong> This setting only stores the configuration. Actual deletion requires a backend Cloud Function (e.g., triggered daily) to read this setting and perform the deletions.
                    </p>
                    <div class="flex flex-wrap items-center gap-4">
                        <label for="chat-auto-delete-select" class="text-sm font-medium">Delete messages older than:</label>
                        <select id="chat-auto-delete-select" class="flex-grow max-w-xs text-sm">
                            <option value="0">Disabled</option>
                            <option value="7">7 days</option>
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                        </select>
                        <button onclick="window.saveChatAutoDeleteSetting()" class="btn-primary-small text-xs flex-shrink-0">Save Setting</button>
                    </div>
                    <div id="chat-auto-delete-status" class="mt-3 text-sm"></div>
                </div>


            </div>
        </div>
    `);
    loadFeedbackForAdmin();
    loadCoursesForAdmin();
    populateAdminCourseSelect();
    loadAdminTasks();
    loadChatAutoDeleteSetting();
}

// --- Feedback ---
async function loadFeedbackForAdmin() {
    const feedbackArea = document.getElementById('admin-feedback-area');
    if (!feedbackArea) return;
    feedbackArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;

    try {
        const feedbackSnapshot = await db.collection('feedback')
                                         .orderBy('timestamp', 'desc')
                                         .limit(30)
                                         .get();
        const issuesSnapshot = await db.collection('examIssues')
                                       .orderBy('timestamp', 'desc')
                                       .limit(20)
                                       .get();

        if (feedbackSnapshot.empty && issuesSnapshot.empty) {
            feedbackArea.innerHTML = '<p class="text-sm text-muted">No feedback messages or exam issues found.</p>';
            return;
        }

        let combinedHtml = '<div class="space-y-3">';
        const renderItem = (doc, type) => {
            const data = doc.data();
            const id = doc.id;
            const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : 'N/A';
            const collectionName = type === 'feedback' ? 'feedback' : 'examIssues';
             const status = data.status || 'new';
            const statusClass = status === 'new' ? 'bg-yellow-100 dark:bg-yellow-900/80 border-yellow-300 dark:border-yellow-700' : status === 'replied' ? 'bg-green-100 dark:bg-green-900/80 border-green-300 dark:border-green-700' : 'bg-gray-100 dark:bg-gray-700/80 border-gray-300 dark:border-gray-600';
            const statusText = status === 'new' ? 'New' : status === 'replied' ? 'Replied' : (status || 'Unknown');
            const senderName = escapeHtml(data.username || 'Unknown User');
            const isAdminSender = data.userId === ADMIN_UID;
            const adminIconHtml = isAdminSender ? `<svg class="admin-icon w-3 h-3 inline-block ml-1 text-yellow-500 dark:text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" clip-rule="evenodd" /></svg>` : '';
            const textEscaped = escapeHtml(data.feedbackText || 'No text');
            const replyTextEscaped = escapeHtml(data.replyText || '');
             const itemTypeLabel = type === 'feedback' ? 'Feedback' : 'Exam Issue';
             const itemTypeColor = type === 'feedback' ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-red-100 dark:bg-red-900/50';

            return `
                <div class="${statusClass} p-3 rounded-lg border shadow-sm text-sm">
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-bold text-xs px-2 py-0.5 rounded ${itemTypeColor}">${itemTypeLabel}</span>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded ${statusText === 'New' ? 'bg-yellow-500 text-white' : statusText === 'Replied' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}">${statusText}</span>
                    </div>
                     <p class="text-xs font-mono text-gray-500 dark:text-gray-400 break-all mb-1">ID: ${id}</p>
                    <p><strong>From:</strong> ${senderName}${adminIconHtml} (ID: ${data.userId || 'N/A'})</p>
                    <p><strong>Subject ID:</strong> ${escapeHtml(data.subjectId || 'N/A')}</p>
                    <p><strong>Question ID:</strong> ${escapeHtml(data.questionId || 'N/A')}</p>
                    ${data.context ? `<p><strong>Context:</strong> ${escapeHtml(data.context)}</p>` : ''}
                    <p><strong>Date:</strong> ${date}</p>
                    <p class="bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-500 mt-1 whitespace-pre-wrap text-xs">${textEscaped}</p>
                    ${data.replyText ? `<p class="mt-2 pt-2 border-t dark:border-gray-600 text-xs"><strong>Admin Reply:</strong> ${replyTextEscaped}</p>` : ''}
                    <div class="mt-2 text-right space-x-1">
                        ${status !== 'replied' ? `<button onclick="window.promptAdminReply('${collectionName}', '${id}', '${data.userId}')" class="btn-secondary-small text-xs">Reply</button>` : ''}
                        <button onclick="window.confirmDeleteItem('${collectionName}', '${id}')" class="btn-danger-small text-xs" title="Delete this message">Delete</button>
                    </div>
                </div>
            `;
        };

        feedbackSnapshot.forEach(doc => combinedHtml += renderItem(doc, 'feedback'));
        issuesSnapshot.forEach(doc => combinedHtml += renderItem(doc, 'examIssue'));

        combinedHtml += '</div>';
        feedbackArea.innerHTML = combinedHtml;

    } catch (error) {
        console.error("Error loading feedback/issues for admin:", error);
        feedbackArea.innerHTML = `<p class="text-red-500 text-sm">Error loading feedback/issues: ${error.message}</p>`;
    }
 }
window.loadFeedbackForAdmin = loadFeedbackForAdmin;

export function promptAdminReply(collectionName, itemId, recipientUserId) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Action requires admin privileges.");
        return;
    }
    const replyText = prompt(`Enter reply for item ID ${itemId} (in ${collectionName}):`);
    if (replyText && replyText.trim()) {
        handleAdminReply(collectionName, itemId, recipientUserId, replyText.trim());
    } else if (replyText !== null) {
        alert("Reply cannot be empty.");
    }
}
window.promptAdminReply = promptAdminReply;

async function handleAdminReply(collectionName, itemId, recipientUserId, replyText) {
     if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Action requires admin privileges.");
        return;
    }

    showLoading("Sending reply...");
    const subject = `Reply regarding ${collectionName === 'feedback' ? 'Feedback' : 'Exam Issue'} ${itemId}`;
    const success = await sendAdminReply(recipientUserId, subject, replyText, currentUser);
    if (success) {
        try {
            await db.collection(collectionName).doc(itemId).update({
                status: 'replied',
                replyText: replyText
            });
            console.log(`${collectionName} item ${itemId} status updated to replied.`);
            alert("Reply sent successfully!");
            loadFeedbackForAdmin();
        } catch (updateError) {
            console.error(`Error updating ${collectionName} status:`, updateError);
            alert(`Reply sent, but failed to update ${collectionName} status.`);
        }
    }
    hideLoading();
}

export function confirmDeleteItem(collectionName, itemId) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Admin privileges required."); return;
    }
    if (confirm(`Are you sure you want to permanently delete this ${collectionName === 'feedback' ? 'feedback message' : 'exam issue'} (ID: ${itemId})? This cannot be undone.`)) {
        handleDeleteItem(collectionName, itemId);
    }
}
window.confirmDeleteItem = confirmDeleteItem;

async function deleteDbItem(collectionName, itemId) {
    if (!db || !itemId || !collectionName) {
        console.error("Cannot delete item: DB not available or ID/collection missing.");
        return false;
    }
    if (!['feedback', 'examIssues'].includes(collectionName)) {
         console.error("Invalid collection name for deletion:", collectionName);
         return false;
    }
    const itemRef = db.collection(collectionName).doc(itemId);
    try {
        await itemRef.delete();
        console.log(`Item ${itemId} in ${collectionName} deleted successfully.`);
        return true;
    } catch (error) {
        console.error(`Error deleting item ${itemId} from ${collectionName}:`, error);
        return false;
    }
}

async function handleDeleteItem(collectionName, itemId) {
     if (!currentUser || currentUser.uid !== ADMIN_UID || !itemId || !collectionName) return;
     showLoading(`Deleting item from ${collectionName}...`);
     const success = await deleteDbItem(collectionName, itemId);
     hideLoading();
     if (success) {
         alert("Item deleted.");
         loadFeedbackForAdmin();
     } else {
         alert("Failed to delete item.");
     }
}


// --- Course Management ---
async function loadCoursesForAdmin() {
     const coursesArea = document.getElementById('admin-courses-area');
     if (!coursesArea) return;
     coursesArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
     try {
         const coursesSnapshot = await db.collection('courses')
             .where('status', 'in', ['pending', 'reported'])
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
             const date = course.createdAt ? new Date(course.createdAt.toDate()).toLocaleString() : 'N/A';
             const statusClass = course.status === 'pending' ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/80' : 'border-red-400 bg-red-50 dark:bg-red-900/80';
             const statusText = course.status === 'pending' ? 'Pending Approval' : 'Reported';
             const creatorName = escapeHtml(course.creatorName || 'Unknown');
             const isAdminCreator = course.creatorUid === ADMIN_UID;
             const adminIconHtml = isAdminCreator ? `<svg class="admin-icon w-3 h-3 inline-block ml-1 text-yellow-500 dark:text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" clip-rule="evenodd" /></svg>` : '';
             const courseName = escapeHtml(course.name || 'Unnamed Course');

             coursesHtml += `
                 <div class="course-card border rounded-lg p-3 shadow-sm text-sm ${statusClass}">
                      <div class="flex justify-between items-center mb-2">
                          <h4 class="font-semibold text-base text-primary-700 dark:text-primary-300">${courseName}</h4>
                          <span class="text-xs font-bold px-2 py-0.5 rounded ${course.status === 'pending' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}">${statusText}</span>
                      </div>
                      <p><strong>Creator:</strong> ${creatorName}${adminIconHtml} (ID: ${course.creatorUid || 'N/A'})</p>
                      <p><strong>Date:</strong> ${date}</p>
                      <p><strong>Major:</strong> ${escapeHtml(course.majorTag || 'N/A')} | <strong>Subject:</strong> ${escapeHtml(course.subjectTag || 'N/A')}</p>
                      ${course.status === 'reported' ? `<p class="text-xs mt-1"><strong>Report Reason:</strong> ${escapeHtml(course.reportReason || 'None provided.')}</p><p class="text-xs"><strong>Reported By:</strong> ${course.reportedBy?.length || 0} user(s)</p>` : ''}
                      <div class="mt-3 pt-2 border-t dark:border-gray-600 text-right space-x-2">
                           <button onclick="window.showCourseDetails('${courseId}')" class="btn-secondary-small text-xs">View Details</button>
                           <button onclick="window.showEditCourseForm('${courseId}')" class="btn-secondary-small text-xs">Edit</button>
                          ${course.status === 'pending' ? `
                              <button onclick="window.handleCourseApproval('${courseId}', true)" class="btn-success-small text-xs">Approve</button>
                              <button onclick="window.handleCourseApproval('${courseId}', false)" class="btn-danger-small text-xs">Reject</button>
                          ` : ''}
                           ${course.status === 'reported' ? `
                              <button onclick="window.handleCourseApproval('${courseId}', true)" class="btn-success-small text-xs">Clear Report</button>
                              <button onclick="window.handleCourseApproval('${courseId}', false, true)" class="btn-danger-small text-xs">Delete Course</button>
                          ` : ''}
                      </div>
                 </div>
             `;
         });
         coursesHtml += '</div>';
         coursesArea.innerHTML = coursesHtml;
     } catch (error) {
         console.error("Error loading courses for admin:", error);
         if (error.code === 'failed-precondition') {
              coursesArea.innerHTML = `<p class="text-red-500 text-sm">Error loading courses: Missing Firestore index. Please create a composite index on 'courses' collection: <strong>status ASC, createdAt DESC</strong> (or DESC/DESC). Check browser console for a direct link to create it.</p>`;
              console.error("Firestore index required for admin course query. Look for a URL in the Firestore error message to create it.");
         } else {
             coursesArea.innerHTML = `<p class="text-red-500 text-sm">Error loading courses: ${error.message}.</p>`;
         }
     }
 }
window.loadCoursesForAdmin = loadCoursesForAdmin;

// --- User Course Management ---
export async function loadUserCoursesForAdmin() {
    const searchInput = document.getElementById('admin-user-search-courses');
    const userCoursesArea = document.getElementById('admin-user-courses-area');
    if (!searchInput || !userCoursesArea) return;

    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        userCoursesArea.innerHTML = '<p class="text-yellow-500 text-sm">Please enter a User ID or Email.</p>';
        return;
    }

    userCoursesArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
    showLoading("Finding user and loading courses...");

    let targetUserId = null;

    try {
        targetUserId = await findUserId(searchTerm);
        if (!targetUserId) throw new Error("User not found with the provided ID or Email.");

        const progressCollectionRef = db.collection('userCourseProgress').doc(targetUserId).collection('courses');
        const snapshot = await progressCollectionRef.get();
        hideLoading();

        if (snapshot.empty) {
            userCoursesArea.innerHTML = `<p class="text-sm text-muted">User ${escapeHtml(searchTerm)} (ID: ${targetUserId}) is not enrolled in any courses.</p>`;
            return;
        }

        let coursesHtml = `<h4 class="text-md font-medium mb-2">Courses for User: ${escapeHtml(searchTerm)} (ID: ${targetUserId})</h4><div class="space-y-2">`;
        snapshot.forEach(doc => {
            const progress = doc.data();
            const courseId = doc.id;
            const courseDef = globalCourseDataMap.get(courseId);
            const courseName = courseDef?.name || `Course ${courseId}`;
            const status = progress.status || 'enrolled';
            const grade = progress.grade || 'N/A';

            coursesHtml += `
                <div class="border dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-700 flex justify-between items-center gap-2 text-sm">
                    <span class="font-medium flex-grow">${escapeHtml(courseName)}</span>
                    <span class="text-xs text-muted">Status: ${escapeHtml(status)} | Grade: ${escapeHtml(grade)}</span>
                    <button onclick="window.handleAdminMarkCourseComplete('${targetUserId}', '${courseId}')" class="btn-secondary-small text-xs" title="Mark Complete/Failed & Set Grade">
                        Set Status/Grade
                    </button>
                </div>
            `;
        });
        coursesHtml += '</div>';
        userCoursesArea.innerHTML = coursesHtml;

    } catch (error) {
        hideLoading();
        console.error("Error loading user courses for admin:", error);
        userCoursesArea.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
    }
}
window.loadUserCoursesForAdmin = loadUserCoursesForAdmin;

export async function handleAdminMarkCourseComplete(userId, courseId) {
     const courseName = globalCourseDataMap.get(courseId)?.name || courseId;
     const newStatus = prompt(`Set status for course "${courseName}" for user ${userId}:\nEnter 'completed', 'failed', or 'enrolled' (case-insensitive):`)?.toLowerCase();

     if (!newStatus || !['completed', 'failed', 'enrolled'].includes(newStatus)) {
         alert("Invalid status entered."); return;
     }

     let finalMark = null;
     if (newStatus === 'completed' || newStatus === 'failed') {
         const markStr = prompt(`Enter final numerical mark (0-100+, e.g., 85.5) for course "${courseName}". Leave blank to auto-calculate based on current progress (if possible):`);
         if (markStr !== null && markStr.trim() !== '') {
             finalMark = parseFloat(markStr);
             if (isNaN(finalMark)) { alert("Invalid mark entered."); return; }
         }
     }

     showLoading(`Updating course status for user ${userId}...`);
     const success = await updateCourseStatusForUser(userId, courseId, finalMark, newStatus);
     hideLoading();

     if (success) {
         alert(`Successfully updated course "${courseName}" status to '${newStatus}' for user ${userId}.`);
         const searchInput = document.getElementById('admin-user-search-courses');
         const searchTerm = searchInput?.value.trim();
         if (searchTerm) {
             try {
                const userDoc = await db.collection('users').doc(userId).get();
                const userEmail = userDoc.data()?.email?.toLowerCase();
                if (searchTerm === userId || (userEmail && searchTerm.toLowerCase() === userEmail)) {
                    loadUserCoursesForAdmin();
                }
            } catch (e) { console.error("Error fetching user doc for course reload:", e); }
         }
     }
}
window.handleAdminMarkCourseComplete = handleAdminMarkCourseComplete;

// --- User Badge Management ---
async function findUserId(searchTerm) {
     let targetUserId = null;
     const lowerSearchTerm = searchTerm.toLowerCase();
     if (!searchTerm) return null;

     if (lowerSearchTerm.includes('@')) {
         console.log(`Finding user by email: ${lowerSearchTerm}`);
         const userQuery = await db.collection('users').where('email', '==', lowerSearchTerm).limit(1).get();
         if (!userQuery.empty) {
             targetUserId = userQuery.docs[0].id;
             console.log(`Found user ID by email: ${targetUserId}`);
         }
     } else {
         console.log(`Checking if ${searchTerm} is a valid user ID...`);
         const userDoc = await db.collection('users').doc(searchTerm).get();
         if (userDoc.exists) {
             targetUserId = userDoc.id;
             console.log(`Confirmed user ID: ${targetUserId}`);
         } else {
             console.log(`User ID ${searchTerm} not found directly. Trying username lookup...`);
             const usernameQuery = await db.collection('usernames').doc(lowerSearchTerm).get();
             if (usernameQuery.exists) {
                 targetUserId = usernameQuery.data().userId;
                 console.log(`Found user ID by username ${lowerSearchTerm}: ${targetUserId}`);
             }
         }
     }
     if (!targetUserId) console.log(`User not found for search term: ${searchTerm}`);
     return targetUserId;
}
export async function loadUserBadgesForAdmin() {
    const searchInput = document.getElementById('admin-user-search-badges');
    const badgesArea = document.getElementById('admin-user-badges-area');
    if (!searchInput || !badgesArea) return;

    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        badgesArea.innerHTML = '<p class="text-yellow-500 text-sm">Please enter a User ID or Email.</p>'; return;
    }

    badgesArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
    showLoading("Finding user and loading badges...");

    try {
        const targetUserId = await findUserId(searchTerm);
        if (!targetUserId) throw new Error("User not found with the provided ID, Email, or Username.");

        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (!userDoc.exists) throw new Error("User document does not exist.");

        const userData = userDoc.data();
        const badges = userData.completedCourseBadges || [];
        const displayName = escapeHtml(userData.displayName || userData.username || userData.email);
        hideLoading();

        let badgesHtml = `<h4 class="text-md font-medium mb-2">Badges for User: ${displayName} (ID: ${targetUserId})</h4>`;
        if (badges.length === 0) {
            badgesHtml += '<p class="text-sm text-muted">User has no completed course badges.</p>';
        } else {
            badgesHtml += '<ul class="space-y-2 list-none p-0">';
            badges.forEach((badge, index) => {
                const courseName = escapeHtml(badge.courseName || 'Unknown Course');
                const grade = escapeHtml(badge.grade || 'N/A');
                const dateStr = badge.completionDate?.toDate ? badge.completionDate.toDate().toLocaleDateString() : 'N/A';
                const courseId = escapeHtml(badge.courseId || 'N/A');
                badgesHtml += `
                    <li class="border dark:border-gray-600 rounded p-2 bg-gray-50 dark:bg-gray-700 flex justify-between items-center gap-2 text-sm">
                        <span><strong>${courseName}</strong> (ID: ${courseId}) - Grade: ${grade} (${dateStr})</span>
                        <button onclick="window.confirmRemoveBadge('${targetUserId}', '${courseId}')" class="btn-danger-small text-xs" title="Remove this badge">Remove</button>
                    </li>`;
            });
            badgesHtml += '</ul>';
        }
        badgesHtml += `
            <div class="mt-4 pt-3 border-t dark:border-gray-600">
                 <button onclick="window.promptAddBadge('${targetUserId}')" class="btn-success-small text-xs">Add New Badge</button>
             </div>`;
        badgesArea.innerHTML = badgesHtml;
    } catch (error) {
        hideLoading();
        console.error("Error loading user badges for admin:", error);
        badgesArea.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
    }
}
window.loadUserBadgesForAdmin = loadUserBadgesForAdmin;

export function promptAddBadge(userId) {
     if (!currentUser || currentUser.uid !== ADMIN_UID) { alert("Admin privileges required."); return; }
     const courseId = prompt(`Enter Course ID for the new badge (e.g., fop_physics_v1):`);
     if (!courseId) return;
     const courseName = prompt(`Enter Course Name for the badge (e.g., Fundamentals of Physics):`, globalCourseDataMap.get(courseId)?.name || '');
     if (!courseName) return;
     const grade = prompt(`Enter Grade (e.g., A+, B, C):`);
     if (!grade) return;
     const completionDateStr = prompt(`Enter Completion Date (YYYY-MM-DD, optional):`);
     let completionDate = null;
     if (completionDateStr) {
         try {
             if (!/^\d{4}-\d{2}-\d{2}$/.test(completionDateStr)) throw new Error("Invalid date format.");
             completionDate = new Date(completionDateStr + 'T00:00:00Z');
             if (isNaN(completionDate.getTime())) throw new Error("Invalid date value.");
         } catch(e) { alert("Invalid date format. Please use YYYY-MM-DD."); return; }
     }
     handleAddBadgeForUser(userId, courseId, courseName, grade, completionDate);
}
window.promptAddBadge = promptAddBadge;

export function confirmRemoveBadge(userId, courseId) {
     if (!currentUser || currentUser.uid !== ADMIN_UID) { alert("Admin privileges required."); return; }
     if (confirm(`Are you sure you want to remove the badge for course ID "${courseId}" for user ${userId}?`)) {
         handleRemoveBadgeForUser(userId, courseId);
     }
}
window.confirmRemoveBadge = confirmRemoveBadge;


// MODIFIED: User Subject Management
export async function loadUserSubjectsForAdmin() {
    const searchInput = document.getElementById('admin-user-search-subjects');
    const subjectsArea = document.getElementById('admin-user-subjects-area');
    if (!searchInput || !subjectsArea) return;

    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        subjectsArea.innerHTML = '<p class="text-yellow-500 text-sm">Please enter a User ID or Email.</p>';
        currentManagingUserIdForSubjects = null;
        return;
    }

    subjectsArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
    showLoading("Finding user and loading subjects...");

    try {
        const targetUserId = await findUserId(searchTerm);
        if (!targetUserId) {
            currentManagingUserIdForSubjects = null;
            throw new Error("User not found with the provided ID, Email, or Username.");
        }
        currentManagingUserIdForSubjects = targetUserId; // Store for actions

        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (!userDoc.exists) {
            currentManagingUserIdForSubjects = null;
            throw new Error("User document does not exist.");
        }

        const userData = userDoc.data();
        const userSubjects = userData.appData?.subjects || {};
        const displayName = escapeHtml(userData.displayName || userData.username || userData.email);
        hideLoading();

        let subjectsHtml = `<h4 class="text-md font-medium mb-2">Subjects for User: ${displayName} (ID: ${targetUserId})</h4>`;
        const subjectEntries = Object.entries(userSubjects);

        if (subjectEntries.length === 0) {
            subjectsHtml += '<p class="text-sm text-muted">User has no subjects defined.</p>';
        } else {
            subjectsHtml += '<ul class="space-y-2 list-none p-0">';
            subjectEntries.forEach(([id, subject]) => {
                const subjectName = escapeHtml(subject.name || 'Unnamed Subject');
                const status = subject.status || 'approved';
                const creatorName = escapeHtml(subject.creatorName || 'Unknown');
                const createdAt = subject.createdAt ? new Date(subject.createdAt).toLocaleDateString() : 'N/A';

                let statusBadgeClass = 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-200';
                let statusText = 'Approved';
                if (status === 'pending') {
                    statusBadgeClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-200';
                    statusText = 'Pending';
                } else if (status === 'rejected') {
                    statusBadgeClass = 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-200';
                    statusText = 'Rejected';
                }

                let adminActionsHtml = '';
                if (status === 'pending') {
                    adminActionsHtml = `
                        <button onclick="window.handleAdminSubjectApproval('${targetUserId}', '${id}', 'approved')" title="Approve Subject" class="btn-success-small text-xs">Approve</button>
                        <button onclick="window.handleAdminSubjectApproval('${targetUserId}', '${id}', 'rejected')" title="Reject Subject" class="btn-danger-small text-xs">Reject</button>
                    `;
                } else if (status === 'rejected') {
                    adminActionsHtml = `
                        <button onclick="window.handleAdminSubjectApproval('${targetUserId}', '${id}', 'approved')" title="Re-approve Subject" class="btn-success-small text-xs">Re-approve</button>
                    `;
                } else { // Approved
                     adminActionsHtml = `
                        <button onclick="window.handleAdminSubjectApproval('${targetUserId}', '${id}', 'rejected')" title="Revoke (Reject) Subject" class="btn-warning-small text-xs">Revoke</button>
                    `;
                }


                subjectsHtml += `
                    <li class="border dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-700 flex justify-between items-center gap-2 text-sm flex-wrap">
                        <div class="flex-grow">
                            <span class="font-medium">${subjectName}</span>
                            <span class="text-xs px-1.5 py-0.5 rounded-full ${statusBadgeClass} ml-2">${statusText}</span>
                            <span class="block text-xs text-muted">Created by: ${creatorName} on ${createdAt} (UID: ${subject.creatorUid || 'N/A'})</span>
                        </div>
                        <div class="flex space-x-1 flex-shrink-0">
                            ${adminActionsHtml}
                        </div>
                    </li>`;
            });
            subjectsHtml += '</ul>';
        }
        subjectsArea.innerHTML = subjectsHtml;
    } catch (error) {
        hideLoading();
        console.error("Error loading user subjects for admin:", error);
        subjectsArea.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
        currentManagingUserIdForSubjects = null;
    }
}
window.loadUserSubjectsForAdmin = loadUserSubjectsForAdmin;

export async function handleAdminSubjectApproval(targetUserId, subjectId, newStatus) {
    if (!currentUser || currentUser.uid !== ADMIN_UID || !targetUserId || !subjectId || !newStatus) {
        alert("Invalid operation or missing parameters.");
        return;
    }
    if (targetUserId !== currentManagingUserIdForSubjects) { // Ensure context is correct
        alert("User context mismatch. Please reload subjects for the correct user.");
        return;
    }

    const subjectNameElement = document.querySelector(`#admin-user-subjects-area li div.flex-grow span.font-medium`);
    const subjectName = subjectNameElement ? subjectNameElement.textContent : `Subject ID ${subjectId}`;

    const action = newStatus === 'approved' ? 'approve' : (newStatus === 'rejected' ? 'reject' : 'update');

    if (confirm(`Are you sure you want to ${action} the subject "${escapeHtml(subjectName)}" for this user?`)) {
        showLoading("Updating subject status...");
        try {
            const success = await adminUpdateUserSubjectStatus(currentUser.uid, targetUserId, subjectId, newStatus);
            hideLoading();
            if (success) {
                alert(`Subject "${escapeHtml(subjectName)}" has been ${newStatus}.`);
                loadUserSubjectsForAdmin(); // Refresh the list for the current user
            } else {
                alert(`Failed to update subject status.`);
            }
        } catch (error) {
            hideLoading();
            console.error("Error handling admin subject approval:", error);
            alert(`Failed to update subject status: ${error.message}`);
        }
    }
}
window.handleAdminSubjectApproval = handleAdminSubjectApproval;


// --- Admin Tasks Management ---
async function loadAdminTasks() {
    const tasksArea = document.getElementById('admin-tasks-area');
    if (!tasksArea) return;
    tasksArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;

    try {
        const tasks = await fetchAdminTasks();

        if (tasks.length === 0) {
            tasksArea.innerHTML = '<p class="text-sm text-muted">No admin tasks found.</p>';
            return;
        }

        let tasksHtml = '<ul class="space-y-2 list-none p-0">';
        tasks.forEach(task => {
            const taskId = task.id;
            const taskText = escapeHtml(task.text);
            const isDone = task.status === 'done';
            const dateStr = task.createdAt ? task.createdAt.toLocaleDateString() : 'N/A';
            const statusClass = isDone ? 'bg-green-100 dark:bg-green-900/50 line-through text-muted' : 'bg-yellow-50 dark:bg-yellow-900/50';
            const buttonIcon = isDone ?
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-green-600 dark:text-green-400"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>' :
                '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-gray-500 dark:text-gray-400"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';

            tasksHtml += `
                <li class="flex items-center gap-3 p-2 rounded border dark:border-gray-600 ${statusClass}">
                    <button
                        onclick="window.handleToggleAdminTask('${taskId}', ${isDone})"
                        class="btn-icon flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        title="${isDone ? 'Mark as Pending' : 'Mark as Done'}">
                        ${buttonIcon}
                    </button>
                    <span class="text-sm flex-grow ${isDone ? 'opacity-70' : ''}">${taskText}</span>
                    <span class="text-xs text-muted flex-shrink-0 pr-2">${dateStr}</span>
                    <button
                        onclick="window.handleDeleteAdminTask('${taskId}')"
                        class="btn-danger-small text-xs flex-shrink-0 ${!isDone ? 'opacity-50 cursor-not-allowed' : ''}"
                        title="Delete Task (only if done)"
                        ${!isDone ? 'disabled' : ''}>
                        Delete
                    </button>
                </li>
            `;
        });
        tasksHtml += '</ul>';
        tasksArea.innerHTML = tasksHtml;

    } catch (error) {
        console.error("Error loading admin tasks:", error);
        tasksArea.innerHTML = `<p class="text-red-500 text-sm">Error loading tasks: ${error.message}</p>`;
    }
}

async function handleAddAdminTask() {
    const input = document.getElementById('admin-new-task-input');
    if (!input) return;
    const taskText = input.value.trim();
    if (!taskText) {
        alert("Please enter task text.");
        input.focus();
        return;
    }

    showLoading("Adding task...");
    const newTaskId = await addAdminTask(taskText);
    hideLoading();

    if (newTaskId) {
        input.value = '';
        loadAdminTasks();
    }
}

async function handleToggleAdminTask(taskId, isCurrentlyDone) {
    const newStatus = isCurrentlyDone ? 'pending' : 'done';
    showLoading(`Updating task status to ${newStatus}...`);
    const success = await updateAdminTaskStatus(taskId, newStatus);
    hideLoading();
    if (success) {
        loadAdminTasks();
    }
}

async function handleDeleteAdminTask(taskId) {
    if (!confirm(`Are you sure you want to delete this completed task (ID: ${taskId})?`)) {
        return;
    }

    showLoading("Deleting task...");
    const success = await deleteAdminTask(taskId);
    hideLoading();
    if (success) {
        loadAdminTasks();
    }
}


// --- Playlist Management ---
function populateAdminCourseSelect() {
    const select = document.getElementById('admin-playlist-course-select');
    if (!select) return;
    select.innerHTML = '<option value="">Select Course...</option>';
    globalCourseDataMap.forEach((course, courseId) => {
        if (course.youtubePlaylistUrls?.length > 0 || course.youtubePlaylistUrl) {
             const option = document.createElement('option');
             option.value = courseId;
             option.textContent = escapeHtml(course.name || courseId);
             select.appendChild(option);
        }
    });
     const loadButton = document.querySelector('button[onclick="window.loadPlaylistForAdmin()"]');
     if(loadButton) loadButton.disabled = select.options.length <= 1;
}

function extractPlaylistId(url) {
     if (!url) return null;
     try {
         const urlObj = new URL(url);
         if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('list')) {
             return urlObj.searchParams.get('list');
         }
     } catch (e) { console.error("Error parsing playlist URL:", url, e); }
     return null;
}

async function fetchPlaylistItems(playlistId, apiKey, pageToken = null) {
    const MAX_RESULTS = 50;
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${MAX_RESULTS}&playlistId=${playlistId}&key=${apiKey}`;
    if (pageToken) {
        url += `&pageToken=${pageToken}`;
    }
    console.log("Fetching playlist items from:", url);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            console.error("YouTube API Error Response:", errorData);
            throw new Error(`YouTube API Error: ${response.status} ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching playlist items:", error);
        throw error;
    }
}

async function loadPlaylistForAdmin() {
    const select = document.getElementById('admin-playlist-course-select');
    const videosArea = document.getElementById('admin-playlist-videos-area');
    const actionArea = document.getElementById('admin-video-action-area');
    if (!select || !videosArea || !actionArea) return;

    const courseId = select.value;
    if (!courseId) {
        videosArea.innerHTML = '<p class="text-muted text-sm">Please select a course.</p>';
        actionArea.classList.add('hidden');
        return;
    }

    const courseDef = globalCourseDataMap.get(courseId);
    const playlistUrls = courseDef?.youtubePlaylistUrls?.length > 0 ? courseDef.youtubePlaylistUrls : (courseDef?.youtubePlaylistUrl ? [courseDef.youtubePlaylistUrl] : []);

    if (playlistUrls.length === 0) {
         videosArea.innerHTML = `<p class="text-warning text-sm">No YouTube playlist URL defined for course "${escapeHtml(courseDef?.name || courseId)}".</p>`;
         actionArea.classList.add('hidden');
         return;
    }

     if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === "YOUR_API_KEY_HERE") {
          alert("YouTube API Key is not configured in config.js. Cannot load playlist.");
          videosArea.innerHTML = `<p class="text-danger text-sm">YouTube API Key missing in configuration.</p>`;
          return;
     }

    videosArea.innerHTML = `<div class="flex justify-center items-center p-4"><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div><p class="ml-3 text-sm text-muted">Loading videos...</p></div>`;
    actionArea.classList.add('hidden');
    selectedVideosForAssignment = [];
    updateSelectedVideoCount();
    currentLoadedPlaylistCourseId = courseId;

    let allVideos = [];
    let fetchError = null;

    try {
        showLoading("Loading Playlist Videos...");
        for (const url of playlistUrls) {
             const playlistId = extractPlaylistId(url);
             if (!playlistId) {
                  console.warn(`Invalid playlist URL or could not extract ID: ${url}`);
                  continue;
             }

             let nextPageToken = null;
             let positionOffset = allVideos.length;
             do {
                  const data = await fetchPlaylistItems(playlistId, YOUTUBE_API_KEY, nextPageToken);
                  if (data.items) {
                      allVideos.push(...data.items
                          .filter(item => item.snippet?.resourceId?.videoId)
                          .map(item => ({
                           videoId: item.snippet.resourceId.videoId,
                           title: item.snippet.title,
                           thumbnail: item.snippet.thumbnails?.default?.url,
                           position: (item.snippet.position ?? 0) + positionOffset
                      })));
                  }
                  nextPageToken = data.nextPageToken;
             } while (nextPageToken);
        }
        hideLoading();

    } catch (error) {
        hideLoading();
        console.error("Error loading playlist videos:", error);
        fetchError = error;
    }

    if (fetchError) {
         videosArea.innerHTML = `<p class="text-danger text-sm">Error loading playlist: ${fetchError.message}. Check API Key, playlist ID, and quotas.</p>`;
    } else if (allVideos.length === 0) {
         videosArea.innerHTML = '<p class="text-muted text-sm">No valid videos found in the specified playlist(s).</p>';
    } else {
         allVideos.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
         renderPlaylistVideos(allVideos, videosArea);
         actionArea.classList.remove('hidden');
    }
}
window.loadPlaylistForAdmin = loadPlaylistForAdmin;

function renderPlaylistVideos(videos, container) {
     let videosHtml = `
     <div class="flex justify-end mb-2">
         <button onclick="window.toggleSelectAllVideos(true)" class="btn-secondary-small text-xs mr-1">Select All</button>
         <button onclick="window.toggleSelectAllVideos(false)" class="btn-secondary-small text-xs">Select None</button>
     </div>
     <ul class="space-y-1 list-none p-0">`;
     videos.forEach(video => {
         if (!video.videoId || !video.title) return;
         const escapedTitle = escapeHtml(video.title.replace(/'/g, "\\'"));
         videosHtml += `
              <li id="admin-video-${video.videoId}" class="flex items-center gap-3 p-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer" onclick="window.toggleVideoSelection(this, '${video.videoId}', '${escapedTitle}')">
                  <input type="checkbox" class="admin-video-select flex-shrink-0 pointer-events-none" value="${video.videoId}" data-title="${escapeHtml(video.title)}">
                  <img src="${video.thumbnail || ''}" alt="Thumb" class="w-16 h-9 object-cover rounded flex-shrink-0 bg-gray-200 dark:bg-gray-700" onerror="this.style.display='none'">
                  <span class="text-xs flex-grow">${escapeHtml(video.title)}</span>
              </li>
         `;
     });
     videosHtml += '</ul>';
     container.innerHTML = videosHtml;
}

function toggleSelectAllVideos(select) {
    const checkboxes = document.querySelectorAll('#admin-playlist-videos-area input[type="checkbox"]');
    checkboxes.forEach(cb => {
        if (cb.checked !== select) {
            cb.checked = select;
            const videoId = cb.value;
            const videoTitle = cb.dataset.title;
            updateSelectionState(videoId, videoTitle, select);
            cb.closest('li')?.classList.toggle('ring-2', select);
            cb.closest('li')?.classList.toggle('ring-primary-500', select);
        }
    });
    updateSelectedVideoCount();
}
window.toggleSelectAllVideos = toggleSelectAllVideos;


function toggleVideoSelection(listItem, videoId, videoTitle) {
     const checkbox = listItem.querySelector('input[type="checkbox"]');
     if (!checkbox) return;
     checkbox.checked = !checkbox.checked;

     const actualTitle = checkbox.dataset.title;
     updateSelectionState(videoId, actualTitle, checkbox.checked);

     listItem.classList.toggle('ring-2', checkbox.checked);
     listItem.classList.toggle('ring-primary-500', checkbox.checked);

     updateSelectedVideoCount();
}
window.toggleVideoSelection = toggleVideoSelection;

function updateSelectionState(videoId, videoTitle, isSelected) {
     const index = selectedVideosForAssignment.findIndex(v => v.videoId === videoId);
     if (isSelected && index === -1) {
          selectedVideosForAssignment.push({ videoId, title: videoTitle });
     } else if (!isSelected && index > -1) {
          selectedVideosForAssignment.splice(index, 1);
     }
}

function updateSelectedVideoCount() {
    const countArea = document.getElementById('admin-selected-video-count');
    const assignBtn = document.getElementById('admin-assign-video-btn');
    const unassignBtn = document.getElementById('admin-unassign-video-btn');
    const count = selectedVideosForAssignment.length;

    if (countArea) {
        countArea.textContent = `Selected Videos: ${count}`;
    }
    const chapterNumInput = document.getElementById('admin-assign-chapter-num');
    const chapterNumValid = chapterNumInput && parseInt(chapterNumInput.value) > 0;

    if (assignBtn) {
        assignBtn.disabled = count === 0 || !chapterNumValid;
    }
     if (unassignBtn) {
          unassignBtn.disabled = count === 0 || !chapterNumValid;
     }
     if (chapterNumInput && !chapterNumInput.dataset.listenerAttached) {
         chapterNumInput.addEventListener('input', updateSelectedVideoCount);
         chapterNumInput.dataset.listenerAttached = 'true';
     }
}

async function handleAssignVideoToChapter() {
     if (selectedVideosForAssignment.length === 0 || !currentLoadedPlaylistCourseId) {
          alert("Please select at least one video and ensure a course playlist was loaded.");
          return;
     }
     const chapterNumInput = document.getElementById('admin-assign-chapter-num');
     const chapterNum = parseInt(chapterNumInput?.value);
     const courseDef = globalCourseDataMap.get(currentLoadedPlaylistCourseId);
     const totalChapters = courseDef?.totalChapters;

     if (!chapterNumInput || isNaN(chapterNum) || chapterNum < 1 || (totalChapters && chapterNum > totalChapters)) {
          alert(`Please enter a valid chapter number (1-${totalChapters || '?'}).`);
          chapterNumInput?.focus();
          return;
     }

     showLoading(`Assigning ${selectedVideosForAssignment.length} video(s) to Chapter ${chapterNum}...`);

     try {
          const courseDoc = await db.collection('courses').doc(currentLoadedPlaylistCourseId).get();
          const currentCourseData = courseDoc.data() || {};

          const chapterResources = { ...(currentCourseData.chapterResources || {}) };
          chapterResources[chapterNum] = chapterResources[chapterNum] || {};
          let currentLectures = chapterResources[chapterNum].lectureUrls || [];
          currentLectures = currentLectures.filter(lec => typeof lec === 'object' && lec.url && lec.title);

          let addedCount = 0;
          selectedVideosForAssignment.forEach(video => {
               const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
               if (!currentLectures.some(lec => lec.url === videoUrl)) {
                    currentLectures.push({ url: videoUrl, title: video.title });
                    addedCount++;
               }
          });

          if (addedCount === 0) {
               hideLoading();
               alert("Selected video(s) are already assigned to this chapter.");
               return;
          }

          chapterResources[chapterNum].lectureUrls = currentLectures;
          const updates = { chapterResources };
          const success = await updateCourseDefinition(currentLoadedPlaylistCourseId, updates);

          if (success) {
               hideLoading();
               alert(`${addedCount} video(s) successfully assigned to Chapter ${chapterNum} for course "${escapeHtml(courseDef?.name || currentLoadedPlaylistCourseId)}".`);
               selectedVideosForAssignment = [];
               updateSelectedVideoCount();
               document.querySelectorAll('#admin-playlist-videos-area input[type="checkbox"]').forEach(cb => cb.checked = false);
               document.querySelectorAll('#admin-playlist-videos-area li').forEach(li => li.classList.remove('ring-2', 'ring-primary-500'));
          } else {
               hideLoading();
          }
     } catch (error) {
          hideLoading();
          console.error(`Error assigning videos to chapter ${chapterNum}:`, error);
          alert(`Failed to assign videos: ${error.message}`);
     }
}
window.handleAssignVideoToChapter = handleAssignVideoToChapter;

async function handleUnassignVideoFromChapter() {
     if (selectedVideosForAssignment.length === 0 || !currentLoadedPlaylistCourseId) {
          alert("Please select at least one video to unassign.");
          return;
     }
     const chapterNumInput = document.getElementById('admin-assign-chapter-num');
     const chapterNum = parseInt(chapterNumInput?.value);
     const courseDef = globalCourseDataMap.get(currentLoadedPlaylistCourseId);
     const totalChapters = courseDef?.totalChapters;


      if (!chapterNumInput || isNaN(chapterNum) || chapterNum < 1 || (totalChapters && chapterNum > totalChapters)) {
          alert(`Please enter a valid chapter number (1-${totalChapters || '?'}) from which to unassign videos.`);
          chapterNumInput?.focus();
          return;
      }

     if (!confirm(`Are you sure you want to unassign ${selectedVideosForAssignment.length} selected video(s) from Chapter ${chapterNum}?`)) {
          return;
     }

     showLoading(`Unassigning ${selectedVideosForAssignment.length} video(s) from Chapter ${chapterNum}...`);

     try {
          const courseDoc = await db.collection('courses').doc(currentLoadedPlaylistCourseId).get();
          const currentCourseData = courseDoc.data() || {};

          const chapterResources = { ...(currentCourseData.chapterResources || {}) };

          if (!chapterResources[chapterNum] || !chapterResources[chapterNum].lectureUrls || chapterResources[chapterNum].lectureUrls.length === 0) {
               hideLoading();
               alert("No videos are currently assigned to this chapter.");
               return;
          }

          let currentLectures = chapterResources[chapterNum].lectureUrls.filter(lec => typeof lec === 'object' && lec.url && lec.title);
          const selectedUrlsToRemove = selectedVideosForAssignment.map(v => `https://www.youtube.com/watch?v=${v.videoId}`);
          let removedCount = 0;

          const updatedLectures = currentLectures.filter(lec => {
               if (selectedUrlsToRemove.includes(lec.url)) {
                    removedCount++;
                    return false;
               }
               return true;
          });

          if (removedCount === 0) {
               hideLoading();
               alert("None of the selected videos were found assigned to this chapter.");
               return;
          }

          chapterResources[chapterNum].lectureUrls = updatedLectures;

          const updates = { chapterResources };
          const success = await updateCourseDefinition(currentLoadedPlaylistCourseId, updates);

          if (success) {
               hideLoading();
               alert(`${removedCount} video(s) successfully unassigned from Chapter ${chapterNum}.`);
               selectedVideosForAssignment = [];
               updateSelectedVideoCount();
               document.querySelectorAll('#admin-playlist-videos-area input[type="checkbox"]').forEach(cb => cb.checked = false);
               document.querySelectorAll('#admin-playlist-videos-area li').forEach(li => li.classList.remove('ring-2', 'ring-primary-500'));
          } else {
               hideLoading();
          }
     } catch (error) {
          hideLoading();
          console.error(`Error unassigning videos from chapter ${chapterNum}:`, error);
          alert(`Failed to unassign videos: ${error.message}`);
     }
}
window.handleUnassignVideoFromChapter = handleUnassignVideoFromChapter;


async function handleDeleteUserFormulaSheetAdmin() {
    if (!currentUser?.uid || currentUser.uid !== ADMIN_UID) {
        alert("Admin privileges required.");
        return;
    }

    const userInput = document.getElementById('admin-delete-content-user')?.value.trim();
    const courseId = document.getElementById('admin-delete-content-course')?.value.trim();
    const chapterNum = parseInt(document.getElementById('admin-delete-content-chapter')?.value);
    const statusArea = document.getElementById('admin-delete-content-status');
    statusArea.innerHTML = '';

    if (!userInput || !courseId || isNaN(chapterNum) || chapterNum < 1) {
        statusArea.innerHTML = '<p class="text-red-500">Please fill in all fields with valid values.</p>';
        return;
    }

    try {
        showLoading("Finding user...");
        const targetUserId = await findUserId(userInput);
        if (!targetUserId) {
            hideLoading();
            statusArea.innerHTML = '<p class="text-red-500">User not found.</p>';
            return;
        }
        hideLoading();

        if (!confirm(`Are you sure you want to delete the formula sheet for:\nUser: ${userInput} (ID: ${targetUserId})\nCourse: ${courseId}\nChapter: ${chapterNum}?`)) {
            return;
        }

        showLoading("Deleting formula sheet...");
        const success = await deleteUserFormulaSheet(targetUserId, courseId, chapterNum);
        hideLoading();

        if (success) {
            statusArea.innerHTML = '<p class="text-green-500">Formula sheet deleted successfully.</p>';
        } else {
            statusArea.innerHTML = '<p class="text-red-500">Failed to delete formula sheet. Check console for details.</p>';
        }
    } catch (error) {
        hideLoading();
        console.error("Error in handleDeleteUserFormulaSheetAdmin:", error);
        statusArea.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
    }
}

async function handleDeleteUserChapterSummaryAdmin() {
    if (!currentUser?.uid || currentUser.uid !== ADMIN_UID) {
        alert("Admin privileges required.");
        return;
    }

    const userInput = document.getElementById('admin-delete-content-user')?.value.trim();
    const courseId = document.getElementById('admin-delete-content-course')?.value.trim();
    const chapterNum = parseInt(document.getElementById('admin-delete-content-chapter')?.value);
    const statusArea = document.getElementById('admin-delete-content-status');
    statusArea.innerHTML = '';


    if (!userInput || !courseId || isNaN(chapterNum) || chapterNum < 1) {
        statusArea.innerHTML = '<p class="text-red-500">Please fill in all fields with valid values.</p>';
        return;
    }

    try {
        showLoading("Finding user...");
        const targetUserId = await findUserId(userInput);
        if (!targetUserId) {
            hideLoading();
            statusArea.innerHTML = '<p class="text-red-500">User not found.</p>';
            return;
        }
        hideLoading();

        if (!confirm(`Are you sure you want to delete the chapter summary for:\nUser: ${userInput} (ID: ${targetUserId})\nCourse: ${courseId}\nChapter: ${chapterNum}?`)) {
            return;
        }

        showLoading("Deleting chapter summary...");
        const success = await deleteUserChapterSummary(targetUserId, courseId, chapterNum);
        hideLoading();

        if (success) {
            statusArea.innerHTML = '<p class="text-green-500">Chapter summary deleted successfully.</p>';
        } else {
            statusArea.innerHTML = '<p class="text-red-500">Failed to delete chapter summary. Check console for details.</p>';
        }
    } catch (error) {
        hideLoading();
        console.error("Error in handleDeleteUserChapterSummaryAdmin:", error);
        statusArea.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
    }
}

// Add new functions to window scope
window.handleDeleteUserFormulaSheetAdmin = handleDeleteUserFormulaSheetAdmin;
window.handleDeleteUserChapterSummaryAdmin = handleDeleteUserChapterSummaryAdmin;

// --- NEW: Delete All Feedback ---
export function confirmDeleteAllFeedback() {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Admin privileges required.");
        return;
    }

    if (confirm("⚠️ WARNING: This will permanently delete ALL feedback messages AND exam issue reports. This action cannot be undone. Are you absolutely sure?")) {
        handleDeleteAllFeedback();
    }
}
window.confirmDeleteAllFeedback = confirmDeleteAllFeedback;

async function handleDeleteAllFeedback() {
    if (!currentUser || currentUser.uid !== ADMIN_UID) return;

    showLoading("Deleting all feedback & issues...");
    try {
        const [feedbackCount, issuesCount] = await Promise.all([
            deleteAllFeedbackMessages(),
            deleteAllExamIssues()
        ]);

        hideLoading();
        alert(`Successfully deleted:\n- ${feedbackCount} feedback messages\n- ${issuesCount} exam issues`);
        loadFeedbackForAdmin(); // Refresh the list
    } catch (error) {
        hideLoading();
        console.error("Error deleting all feedback/issues:", error);
        alert(`Failed to delete all feedback/issues: ${error.message}`);
    }
}

// Function to list users for admin
async function listAllUsersAdmin() {
    if (!currentUser || currentUser.uid !== ADMIN_UID) return;
    const userListArea = document.getElementById('admin-user-list-area');
    const searchInput = document.getElementById('admin-user-list-search');
    if (!userListArea || !searchInput) return;

    const searchTerm = searchInput.value.trim().toLowerCase();
    userListArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
    showLoading("Loading users...");

    try {
        let query;
         if (searchTerm.includes('@')) {
            query = db.collection('users').where('email', '==', searchTerm);
         } else if (searchTerm) {
            console.warn("Admin user search by name is basic: case-sensitive, prefix match on displayName.");
            query = db.collection('users').orderBy('displayName').startAt(searchTerm).endAt(searchTerm + '\uf8ff');
         } else {
             query = db.collection('users').orderBy('displayName').limit(100);
         }


        const snapshot = await query.limit(100).get();
        hideLoading();

        if (snapshot.empty) {
            userListArea.innerHTML = `<p class="text-sm text-muted">No users found${searchTerm ? ' matching "' + escapeHtml(searchTerm) + '"' : ''}.</p>`;
            return;
        }

        let usersHtml = '<ul class="space-y-2 list-none p-0">';
        snapshot.forEach(doc => {
            const userData = doc.data();
            const userId = doc.id;
            const displayName = escapeHtml(userData.displayName || userData.username || 'N/A');
            const email = escapeHtml(userData.email || 'N/A');
            const username = escapeHtml(userData.username || '-');
            const createdAt = userData.createdAt?.toDate ? userData.createdAt.toDate().toLocaleDateString() : 'N/A';
            const userIsAdmin = userData.isAdmin || false;
            const isAdminUserPrimary = userId === ADMIN_UID;

            let adminBadgeHtml = '';
            if (isAdminUserPrimary) {
                adminBadgeHtml = '<span class="text-xs bg-yellow-400 text-yellow-900 dark:bg-yellow-600 dark:text-yellow-100 px-1.5 py-0.5 rounded-full font-semibold">Primary Admin</span>';
            } else if (userIsAdmin) {
                adminBadgeHtml = '<span class="text-xs bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-200 px-1.5 py-0.5 rounded-full">Admin</span>';
            }

            let toggleAdminButtonHtml = '';
            if (!isAdminUserPrimary) {
                const buttonText = userIsAdmin ? 'Remove Admin' : 'Make Admin';
                const buttonClass = userIsAdmin ? 'btn-warning-small' : 'btn-success-small';
                const isCurrentUserPrimary = currentUser.uid === ADMIN_UID;
                const disabledAttr = !isCurrentUserPrimary ? 'disabled' : '';
                const titleAttr = !isCurrentUserPrimary ? 'title="Only the primary admin can change admin status."' : `title="${userIsAdmin ? 'Remove Admin Privileges' : 'Grant Admin Privileges'}"`;
                toggleAdminButtonHtml = `<button onclick="window.handleToggleAdminStatus('${userId}', ${userIsAdmin})" class="${buttonClass} text-xs ml-2" ${disabledAttr} ${titleAttr}>${buttonText}</button>`;
            }

            usersHtml += `
                <li class="border dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-700 flex items-center gap-3 text-sm flex-wrap">
                    <img src="${escapeHtml(userData.photoURL || DEFAULT_PROFILE_PIC_URL)}" alt="${displayName}'s avatar" class="w-10 h-10 rounded-full object-cover border dark:border-gray-600 flex-shrink-0" onerror="this.onerror=null;this.src='${DEFAULT_PROFILE_PIC_URL}';">
                    <div class="flex-grow min-w-[200px]">
                        <span class="font-medium">${displayName}</span> ${adminBadgeHtml}<br>
                         <span class="text-xs text-muted">Username: ${username}</span><br>
                        <span class="text-xs text-muted">Email: ${email}</span><br>
                        <span class="text-xs text-muted">UID: ${userId}</span><br>
                        <span class="text-xs text-muted">Created: ${createdAt}</span>
                    </div>
                    <div class="flex-shrink-0 flex flex-col items-end gap-1">
                        <button onclick="window.viewUserDetailsAdmin('${userId}')" class="btn-secondary-small text-xs">View Details</button>
                        ${toggleAdminButtonHtml}
                    </div>
                </li>
            `;
        });
        usersHtml += '</ul>';
        userListArea.innerHTML = usersHtml;

    } catch (error) {
        hideLoading();
        console.error("Error listing users for admin:", error);
         if (error.code === 'failed-precondition' && searchTerm && !searchTerm.includes('@')) {
             userListArea.innerHTML = `<p class="text-red-500 text-sm">Error listing users: Searching by display name requires a Firestore index on 'displayName'.</p>`;
         } else {
             userListArea.innerHTML = `<p class="text-red-500 text-sm">Error listing users: ${error.message}</p>`;
         }
    }
}
window.listAllUsersAdmin = listAllUsersAdmin;

async function handleToggleAdminStatus(targetUserId, currentIsAdmin) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Permission Denied: Only the primary admin can perform this action.");
        return;
    }
    if (targetUserId === ADMIN_UID) {
        alert("The primary admin's status cannot be changed.");
        return;
    }

    const actionText = currentIsAdmin ? "remove admin privileges from" : "grant admin privileges to";
    const targetUserDisplayName = document.querySelector(`#admin-user-list-area li button[onclick*="'${targetUserId}'"]`)?.closest('li')?.querySelector('.font-medium')?.textContent || `User ID ${targetUserId}`;


    if (confirm(`Are you sure you want to ${actionText} ${escapeHtml(targetUserDisplayName)}?`)) {
        showLoading("Updating admin status...");
        try {
            const success = await toggleUserAdminStatus(targetUserId, currentIsAdmin);
            hideLoading();
            if (success) {
                alert("Admin status updated successfully.");
                listAllUsersAdmin();
            }
        } catch (error) {
            hideLoading();
            console.error("Error toggling admin status:", error);
            alert(`Failed to toggle admin status: ${error.message}`);
        }
    }
}
window.handleToggleAdminStatus = handleToggleAdminStatus;


async function viewUserDetailsAdmin(userId) {
    if (!currentUser || currentUser.uid !== ADMIN_UID || !userId) return;

    document.getElementById('user-details-modal')?.remove();
    showLoading(`Loading details for user ${userId}...`);

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const progressSnapshot = await db.collection('userCourseProgress').doc(userId).collection('courses').get();

        if (!userDoc.exists) {
            hideLoading();
            alert("User document not found.");
            return;
        }

        const userData = userDoc.data();
        const courseProgress = {};
        progressSnapshot.forEach(doc => {
            courseProgress[doc.id] = doc.data();
        });

        const displayUserData = { ...userData };
        if (displayUserData.createdAt?.toDate) displayUserData.createdAt = displayUserData.createdAt.toDate().toISOString();
        if (displayUserData.lastAppDataUpdate?.toDate) displayUserData.lastAppDataUpdate = displayUserData.lastAppDataUpdate.toDate().toISOString();
        const cleanCourseProgress = JSON.parse(JSON.stringify(courseProgress, (key, value) => {
             if (value && typeof value === 'object' && value.hasOwnProperty('seconds') && value.hasOwnProperty('nanoseconds')) {
                 try { return new Date(value.seconds * 1000 + value.nanoseconds / 1000000).toISOString(); } catch(e){ return value; }
             }
             return value;
        }));

        hideLoading();

        const userProfileHtml = `
            <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="col-span-2 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <dt class="text-xs font-medium text-blue-700 dark:text-blue-300">User ID</dt>
                    <dd class="text-sm mt-1 font-mono">${escapeHtml(userId)}</dd>
                </div>
                <div class="col-span-2 flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-600">
                    <dt class="text-xs font-medium text-gray-700 dark:text-gray-300 w-16 flex-shrink-0">Avatar</dt>
                    <dd class="text-sm mt-1">
                        <img src="${escapeHtml(displayUserData.photoURL || DEFAULT_PROFILE_PIC_URL)}"
                             alt="${escapeHtml(displayUserData.displayName || 'User')}'s avatar"
                             class="w-10 h-10 rounded-full object-cover border dark:border-gray-500"
                             onerror="this.onerror=null; this.src='${DEFAULT_PROFILE_PIC_URL}';">
                    </dd>
                </div>
                ${Object.entries(displayUserData).map(([key, value]) => {
                    if (['completedCourseBadges', 'appData', 'userNotes', 'photoURL'].includes(key)) return '';
                    let displayValue = '';
                    if (value === null || value === undefined) {
                        displayValue = '<span class="text-gray-400 dark:text-gray-500 italic">null</span>';
                    } else if (typeof value === 'boolean') {
                        if (key === 'isAdmin') {
                            displayValue = value ? '<span class="text-green-600 dark:text-green-400 font-semibold">TRUE (Admin)</span>' : '<span class="text-red-600 dark:text-red-400">false (User)</span>';
                        } else {
                            displayValue = value ? '<span class="text-green-600 dark:text-green-400">true</span>' : '<span class="text-red-600 dark:text-red-400">false</span>';
                        }
                    } else if (Array.isArray(value)) {
                        displayValue = `<span class="text-purple-600 dark:text-purple-400">Array(${value.length})</span>`;
                        if (value.length > 0) {
                            displayValue += `<ul class="mt-1 ml-4 list-disc text-xs space-y-1 max-h-20 overflow-y-auto">
                                ${value.slice(0, 10).map(item => `<li>${escapeHtml(String(item))}</li>`).join('')}
                                ${value.length > 10 ? `<li class="text-muted">... and ${value.length - 10} more items</li>` : ''}
                            </ul>`;
                        }
                    } else if (typeof value === 'object') {
                         displayValue = '<pre class="text-xs bg-gray-100 dark:bg-gray-900 p-1 rounded max-h-24 overflow-auto">' + escapeHtml(JSON.stringify(value, null, 2)) + '</pre>';
                    } else {
                        displayValue = escapeHtml(String(value));
                    }
                     let editButton = '';
                     if (key === 'username') {
                          editButton = `<button onclick="window.promptAdminChangeUsername('${userId}', '${escapeHtml(String(value || ''))}')" class="btn-secondary-small text-xs ml-2">Edit</button>`;
                     }
                    return `
                        <div class="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-600">
                            <dt class="text-xs font-medium text-gray-700 dark:text-gray-300">${escapeHtml(key)}</dt>
                            <dd class="text-sm mt-1 flex items-center">${displayValue} ${editButton}</dd>
                        </div>
                    `;
                }).join('')}
            </dl>
        `;

        const badgesHtml = displayUserData.completedCourseBadges?.length ? `
            <div class="mt-4">
                <h4 class="text-sm font-semibold mb-2 text-primary-600 dark:text-primary-400">Completed Course Badges (${displayUserData.completedCourseBadges.length})</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${displayUserData.completedCourseBadges.map(badge => {
                         let completionDateStr = 'N/A';
                         if (badge.completionDate) {
                              try {
                                   const dateObj = badge.completionDate.toDate ? badge.completionDate.toDate() : new Date(badge.completionDate);
                                   if (!isNaN(dateObj)) completionDateStr = dateObj.toLocaleDateString();
                              } catch(e){ console.warn("Error parsing badge completion date:", badge.completionDate, e); }
                         }
                         return `
                            <div class="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800 text-sm">
                                <p class="font-medium text-green-700 dark:text-green-300">${escapeHtml(badge.courseName || 'Unnamed Course')}</p>
                                <p class="text-xs mt-1 text-green-600 dark:text-green-400">
                                    <span class="font-medium">Grade:</span> ${escapeHtml(badge.grade || 'N/A')} |
                                    <span class="font-medium">Course ID:</span> ${escapeHtml(badge.courseId || 'N/A')}
                                </p>
                                <p class="text-xs text-green-600 dark:text-green-400">
                                    <span class="font-medium">Completed:</span> ${completionDateStr}
                                </p>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : '';

        const courseProgressHtml = Object.entries(cleanCourseProgress).length ? `
            <div class="grid grid-cols-1 gap-4">
                ${Object.entries(cleanCourseProgress).map(([courseId, progress]) => {
                    const courseDef = globalCourseDataMap.get(courseId);
                    const courseName = courseDef?.name || courseId;
                    const studiedChapters = progress.courseStudiedChapters?.length || 0;
                    const totalChapters = courseDef?.totalChapters || '?';
                     const status = progress.status || 'enrolled';
                    const statusClass = status === 'completed' ? 'text-green-600 dark:text-green-400' :
                                      status === 'failed' ? 'text-red-600 dark:text-red-400' :
                                      'text-blue-600 dark:text-blue-400';
                    let lastActivityStr = 'N/A';
                    if (progress.lastActivityDate) {
                         try { lastActivityStr = new Date(progress.lastActivityDate).toLocaleDateString(); } catch(e){}
                    }
                    return `
                        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-600 shadow-sm">
                            <div class="flex justify-between items-start mb-2">
                                <h5 class="font-medium text-sm">${escapeHtml(courseName)}</h5>
                                <span class="text-xs font-medium ${statusClass}">${escapeHtml(status)}</span>
                            </div>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div>
                                    <span class="text-muted block">Enrollment</span>
                                    <span class="font-medium">${escapeHtml(progress.enrollmentMode || 'standard')}</span>
                                </div>
                                <div>
                                    <span class="text-muted block">Grade</span>
                                    <span class="font-medium">${escapeHtml(progress.grade || 'N/A')}</span>
                                </div>
                                <div>
                                    <span class="text-muted block">Progress</span>
                                    <span class="font-medium">${studiedChapters} / ${totalChapters} chapters</span>
                                </div>
                                <div>
                                    <span class="text-muted block">Last Active</span>
                                    <span class="font-medium">${lastActivityStr}</span>
                                </div>
                            </div>
                            ${progress.dailyProgress && Object.keys(progress.dailyProgress).length ? `
                                <div class="mt-2 pt-2 border-t dark:border-gray-600">
                                    <span class="text-xs text-muted">Daily Progress Entries: ${Object.keys(progress.dailyProgress).length}</span>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        ` : '<p class="text-sm text-muted">No course progress data available.</p>';

        const modalHtml = `
            <div id="user-details-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[80] p-4 animate-fade-in" aria-labelledby="user-details-title" role="dialog" aria-modal="true">
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 w-full max-w-4xl transform transition-all flex flex-col max-h-[90vh]">
                    <div class="flex justify-between items-center mb-4 flex-shrink-0 pb-3 border-b dark:border-gray-600">
                        <h3 id="user-details-title" class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                            User Details: ${escapeHtml(userData.displayName || userData.username || userId)}
                        </h3>
                        <button onclick="document.getElementById('user-details-modal').remove()" class="btn-icon text-xl" aria-label="Close user details modal">×</button>
                    </div>
                    <div class="flex-grow overflow-y-auto mb-4 space-y-6 pr-2">
                        <div>
                            <h4 class="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">User Profile Data</h4>
                            ${userProfileHtml}
                            ${badgesHtml}
                        </div>
                        <div>
                            <h4 class="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Course Progress</h4>
                            ${courseProgressHtml}
                        </div>
                         <div>
                            <h4 class="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Raw User Data (Excerpt)</h4>
                             <pre class="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded max-h-60 overflow-auto border dark:border-gray-700"><code>${escapeHtml(JSON.stringify({ email: userData.email, displayName: userData.displayName, username: userData.username, photoURL: userData.photoURL, createdAt: userData.createdAt, onboardingComplete: userData.onboardingComplete, isAdmin: userData.isAdmin }, null, 2))}</code></pre>
                        </div>
                    </div>
                    <div class="flex justify-end gap-3 flex-shrink-0 pt-3 border-t dark:border-gray-600">
                        <button onclick="document.getElementById('user-details-modal').remove()" class="btn-secondary">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

    } catch (error) {
        hideLoading();
        console.error(`Error viewing details for user ${userId}:`, error);
        alert(`Failed to load user details: ${error.message}`);
    }
}
window.viewUserDetailsAdmin = viewUserDetailsAdmin;

function promptAdminChangeUsername(userId, currentUsername) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Admin privileges required.");
        return;
    }

    const newUsername = prompt(`Enter new username for user ${userId} (current: "${currentUsername}").\nMust be 3-20 alphanumeric characters or underscores:`);

    if (newUsername === null) return;

    const trimmedUsername = newUsername.trim();
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

    if (!usernameRegex.test(trimmedUsername)) {
        alert("Invalid username format. Please use 3-20 alphanumeric characters or underscores.");
        return;
    }

    if (trimmedUsername.toLowerCase() === currentUsername.toLowerCase()) {
        alert("New username is the same as the current one.");
        return;
    }

    handleAdminChangeUsername(userId, currentUsername, trimmedUsername);
}
window.promptAdminChangeUsername = promptAdminChangeUsername;

async function handleAdminChangeUsername(userId, currentUsername, newUsername) {
    showLoading("Updating username...");
    try {
        const success = await adminUpdateUsername(userId, currentUsername, newUsername);
        if (success) {
            hideLoading();
            alert(`Username successfully changed to "${newUsername}".`);
            if (document.getElementById('user-details-modal')) {
                 const modalTitle = document.getElementById('user-details-title');
                 if (modalTitle && modalTitle.textContent.includes(userId)) {
                     viewUserDetailsAdmin(userId);
                 }
            }
             const userListArea = document.getElementById('admin-user-list-area');
             if (userListArea && userListArea.innerHTML.includes(userId)) {
                  listAllUsersAdmin();
             }
        } else {
            hideLoading();
            alert("An unexpected issue occurred while updating the username.");
        }
    } catch (error) {
        hideLoading();
        console.error("Error handling admin username change:", error);
        alert(`Failed to change username: ${error.message}`);
    }
}


// --- NEW: Chat Auto-Deletion Functions ---
async function loadChatAutoDeleteSetting() {
    const selectElement = document.getElementById('chat-auto-delete-select');
    const statusArea = document.getElementById('chat-auto-delete-status');
    if (!selectElement || !statusArea) return;

    statusArea.innerHTML = `<span class="text-muted text-xs">Loading setting...</span>`;

    try {
        if (!db) {
            console.error("Firestore db instance is not available.");
            statusArea.innerHTML = `<p class="text-red-500 text-xs">Error: Database connection not available.</p>`;
            return;
        }
        const settingsRef = db.collection('settings').doc('chat');
        const docSnap = await settingsRef.get();

        let currentDays = 0;
        if (docSnap.exists) {
            currentDays = docSnap.data()?.autoDeleteDays ?? 0;
        }

        const validOptions = Array.from(selectElement.options).map(opt => parseInt(opt.value));
        if (validOptions.includes(currentDays)) {
            selectElement.value = currentDays.toString();
        } else {
            console.warn(`Stored autoDeleteDays value (${currentDays}) not found in options. Defaulting to Disabled.`);
            selectElement.value = "0";
        }
        statusArea.innerHTML = '';
        console.log("[Admin] Loaded chat auto-delete setting:", selectElement.value);

    } catch (error) {
        console.error("Error loading chat auto-delete setting:", error);
        statusArea.innerHTML = `<p class="text-red-500 text-xs">Error loading setting: ${error.message}</p>`;
        selectElement.value = "0";
    }
}

export async function saveChatAutoDeleteSetting() {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Admin privileges required.");
        return;
    }

    const selectElement = document.getElementById('chat-auto-delete-select');
    const statusArea = document.getElementById('chat-auto-delete-status');
    if (!selectElement || !statusArea) return;

    const selectedValue = parseInt(selectElement.value);
    if (isNaN(selectedValue) || ![0, 7, 30, 90].includes(selectedValue)) {
        alert("Invalid selection. Please choose a valid option.");
        return;
    }

    statusArea.innerHTML = '';
    showLoading("Saving setting...");

    try {
        if (!db) {
            hideLoading();
            console.error("Firestore db instance is not available for saving.");
            statusArea.innerHTML = `<p class="text-red-500 text-xs">Error: Database connection not available.</p>`;
            return;
        }
        const settingsRef = db.collection('settings').doc('chat');
        await settingsRef.set({ autoDeleteDays: selectedValue }, { merge: true });
        hideLoading();
        statusArea.innerHTML = `<p class="text-green-500 text-xs">Setting saved successfully!</p>`;
        console.log("[Admin] Saved chat auto-delete setting:", selectedValue);
        setTimeout(() => { if(statusArea) statusArea.innerHTML = ''; }, 3000);

    } catch (error) {
        hideLoading();
        console.error("Error saving chat auto-delete setting:", error);
        statusArea.innerHTML = `<p class="text-red-500 text-xs">Error saving setting: ${error.message}</p>`;
        alert(`Failed to save setting: ${error.message}`);
    }
}
window.saveChatAutoDeleteSetting = saveChatAutoDeleteSetting;


// --- Assign ALL handlers to window scope ---
window.showAdminDashboard = showAdminDashboard;
window.loadFeedbackForAdmin = loadFeedbackForAdmin;
window.promptAdminReply = promptAdminReply;
window.confirmDeleteItem = confirmDeleteItem;
window.loadCoursesForAdmin = loadCoursesForAdmin;
window.loadUserCoursesForAdmin = loadUserCoursesForAdmin;
window.handleAdminMarkCourseComplete = handleAdminMarkCourseComplete;
window.loadUserBadgesForAdmin = loadUserBadgesForAdmin;
window.promptAddBadge = promptAddBadge;
window.confirmRemoveBadge = confirmRemoveBadge;
window.loadPlaylistForAdmin = loadPlaylistForAdmin;
window.toggleSelectAllVideos = toggleSelectAllVideos;
window.toggleVideoSelection = toggleVideoSelection;
window.handleAssignVideoToChapter = handleAssignVideoToChapter;
window.handleUnassignVideoFromChapter = handleUnassignVideoFromChapter;
window.handleDeleteUserFormulaSheetAdmin = handleDeleteUserFormulaSheetAdmin;
window.handleDeleteUserChapterSummaryAdmin = handleDeleteUserChapterSummaryAdmin;
window.confirmDeleteAllFeedback = confirmDeleteAllFeedback;
window.listAllUsersAdmin = listAllUsersAdmin;
window.viewUserDetailsAdmin = viewUserDetailsAdmin;
window.promptAdminChangeUsername = promptAdminChangeUsername;
window.handleToggleAdminStatus = handleToggleAdminStatus;
window.handleCourseApproval = handleCourseApproval;
window.showCourseDetails = showCourseDetails;
window.showEditCourseForm = showEditCourseForm;
window.showBrowseCourses = showBrowseCourses;
window.showAddCourseForm = showAddCourseForm;
window.handleAddAdminTask = handleAddAdminTask;
window.handleToggleAdminTask = handleToggleAdminTask;
window.handleDeleteAdminTask = handleDeleteAdminTask;
window.saveChatAutoDeleteSetting = saveChatAutoDeleteSetting;
window.loadUserSubjectsForAdmin = loadUserSubjectsForAdmin; // MODIFIED: Add subject loader
window.handleAdminSubjectApproval = handleAdminSubjectApproval; // MODIFIED: Add subject approval handler

// --- END OF FILE ui_admin_dashboard.js ---