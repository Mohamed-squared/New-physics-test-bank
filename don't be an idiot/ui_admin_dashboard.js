// --- START OF FILE ui_admin_dashboard.js ---

// ui_admin_dashboard.js

// Added updateGlobalCourseData and db for deletion
import { db, currentUser, globalCourseDataMap, userCourseProgressMap, updateGlobalCourseData } from './state.js';
import { ADMIN_UID, YOUTUBE_API_KEY } from './config.js'; // Import YouTube API Key
// Added clearElementContent
import { displayContent, clearContent, setActiveSidebarLink} from './ui_core.js';
import { showLoading, hideLoading } from './utils.js';
// Added updateCourseStatusForUser and updateCourseDefinition
import { sendAdminReply, updateCourseStatusForUser, handleAddBadgeForUser, handleRemoveBadgeForUser, updateCourseDefinition } from './firebase_firestore.js'; // Import badge handlers & course definition update
// Import course functions needed by admin buttons
import { handleCourseApproval, showCourseDetails, showEditCourseForm } from './ui_courses.js';
// Use the imported escapeHtml from utils.js
import { escapeHtml } from './utils.js';

// State for Playlist Management section
let selectedVideosForAssignment = []; // Array to hold { videoId, title }
let currentLoadedPlaylistCourseId = null;

// --- Admin Dashboard UI ---

export function showAdminDashboard() {
    if (currentUser?.uid !== ADMIN_UID) {
        displayContent('<p class="text-red-500 p-4">Access Denied. Admin privileges required.</p>');
        return;
    }
    clearContent();
    setActiveSidebarLink('showAdminDashboard', 'sidebar-standard-nav'); // Target standard nav

    displayContent(`
        <div class="animate-fade-in space-y-6">
            <h2 class="text-2xl font-semibold text-indigo-600 dark:text-indigo-400 mb-4">Admin Dashboard</h2>

            <!-- NEW: Button Navigation -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                 <button id="admin-btn-feedback" onclick="window.showAdminSection('feedback')" class="admin-nav-button btn-secondary justify-center p-3">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM8.663 4.027a.75.75 0 0 1 .26.77 5.5 5.5 0 0 0 8.153 5.55.75.75 0 1 1 1.06 1.06 7 7 0 0 1-9.958-7.967.75.75 0 0 1 1.06-.26Zm1.105-1.106a.75.75 0 0 1 .77.26 5.5 5.5 0 0 0 5.55 8.153.75.75 0 1 1 1.06 1.06 7 7 0 0 1-7.967-9.958.75.75 0 0 1 .26-1.06Z" clip-rule="evenodd" /><path d="M10 4.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM8.5 10a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" /></svg>
                     Feedback
                 </button>
                 <button id="admin-btn-courses" onclick="window.showAdminSection('courses')" class="admin-nav-button btn-secondary justify-center p-3">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M10 2c-1.717 0-3.283.48-4.646 1.29A9.952 9.952 0 0 0 2.854 6.413c-.565.911-1.003 2.02-1.003 3.217 0 3.9 3.403 7.19 7.583 7.829a.75.75 0 0 0 .83 0c4.18-1.63 7.583-3.93 7.583-7.829 0-1.197-.438-2.306-1.003-3.217a9.95 9.95 0 0 0-2.5-2.884C13.283 2.48 11.717 2 10 2Zm0 1a8.949 8.949 0 0 1 3.23.654c1.08.46 1.91.975 2.555 1.569a8.451 8.451 0 0 1 1.994 2.574.5.5 0 0 1 .02.029 8.3 8.3 0 0 1 .801 2.874c0 2.8-.984 4.705-2.835 5.997a10.016 10.016 0 0 0-1.965 1.125.75.75 0 0 1-.83 0 10.016 10.016 0 0 0-1.965-1.125C7.184 15.095 6.2 13.19 6.2 10.39c0-1.01.26-1.912.801-2.874a.5.5 0 0 1 .02-.029 8.451 8.451 0 0 1 1.994-2.574c.645-.594 1.475-1.109 2.555-1.569A8.949 8.949 0 0 1 10 3Z" clip-rule="evenodd" /></svg>
                     Course Mgmt
                 </button>
                  <button id="admin-btn-user-courses" onclick="window.showAdminSection('user-courses')" class="admin-nav-button btn-secondary justify-center p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.25 1.25 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.095a1.25 1.25 0 0 0 .41-1.412A9.99 9.99 0 0 0 10 12.5a9.99 9.99 0 0 0-6.535 1.993Z" /></svg>
                      User Courses
                  </button>
                  <button id="admin-btn-user-badges" onclick="window.showAdminSection('user-badges')" class="admin-nav-button btn-secondary justify-center p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M15.962 2.038a.75.75 0 0 1 .707.056l2.25 1.5a.75.75 0 0 1 0 1.212l-2.25 1.5a.75.75 0 0 1-.707.056l-2.25-1.5a.75.75 0 0 1 0-1.212l2.25-1.5ZM13 5.39l-2.25-1.5a.75.75 0 0 0-.707-.056l-2.25 1.5a.75.75 0 0 0 0 1.212l2.25 1.5a.75.75 0 0 0 .707-.056l2.25-1.5a.75.75 0 0 0 0-1.212ZM7.038 6.057a.75.75 0 0 1-.707-.056l-2.25-1.5a.75.75 0 0 1 0-1.212l2.25-1.5a.75.75 0 0 1 .707.056l2.25 1.5a.75.75 0 0 1 0 1.212l-2.25 1.5ZM15.962 9.038a.75.75 0 0 1 .707.056l2.25 1.5a.75.75 0 0 1 0 1.212l-2.25 1.5a.75.75 0 0 1-.707.056l-2.25-1.5a.75.75 0 0 1 0-1.212l2.25-1.5ZM13 12.39l-2.25-1.5a.75.75 0 0 0-.707-.056l-2.25 1.5a.75.75 0 0 0 0 1.212l2.25 1.5a.75.75 0 0 0 .707-.056l2.25-1.5a.75.75 0 0 0 0-1.212ZM7.038 13.057a.75.75 0 0 1-.707-.056l-2.25-1.5a.75.75 0 0 1 0-1.212l2.25-1.5a.75.75 0 0 1 .707.056l2.25 1.5a.75.75 0 0 1 0 1.212l-2.25 1.5Z" clip-rule="evenodd" /></svg>
                      User Badges
                  </button>
                  <button id="admin-btn-playlist" onclick="window.showAdminSection('playlist')" class="admin-nav-button btn-secondary justify-center p-3">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path d="M3 4.75A.75.75 0 0 1 3.75 4h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 4.75ZM3 10a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10ZM3 15.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" /></svg>
                      Playlist Assignment
                  </button>
            </div>

            <!-- Content Area for Selected Section -->
            <div id="admin-content-area" class="content-card mt-6 min-h-[300px]">
                <p class="text-center text-muted italic">Select a section above.</p>
            </div>
        </div>
    `);

    // Initially show the Feedback section
    showAdminSection('feedback');
}

// --- NEW: Function to show specific admin section ---
function showAdminSection(section) {
    const contentArea = document.getElementById('admin-content-area');
    if (!contentArea) return;
    clearContent(contentArea); // Clear only the admin content area
    contentArea.innerHTML = `<div class="text-center p-4"><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-2 text-sm text-muted">Loading...</p></div>`;

    // Deactivate all admin buttons
    document.querySelectorAll('.admin-nav-button').forEach(btn => {
        btn.classList.replace('btn-primary', 'btn-secondary');
        btn.classList.remove('active-admin-btn');
    });
    // Activate the selected button
    const activeBtn = document.getElementById(`admin-btn-${section}`);
    if (activeBtn) {
        activeBtn.classList.replace('btn-secondary', 'btn-primary');
        activeBtn.classList.add('active-admin-btn');
    }

    // Load the content for the selected section
    switch(section) {
        case 'feedback':
            loadFeedbackForAdmin();
            break;
        case 'courses':
            loadCoursesForAdmin();
            break;
        case 'user-courses':
            loadUserCourseSection();
            break;
        case 'user-badges':
            loadUserBadgeSection();
            break;
        case 'playlist':
            loadPlaylistSection();
            break;
        default:
            contentArea.innerHTML = '<p class="text-red-500">Unknown admin section selected.</p>';
    }
}
window.showAdminSection = showAdminSection; // Assign to window scope

// --- Feedback Section ---
async function loadFeedbackForAdmin() {
    const contentArea = document.getElementById('admin-content-area'); // Target the content area
    if (!contentArea) return;

    try {
        const feedbackSnapshot = await db.collection('feedback')
                                         .orderBy('timestamp', 'desc')
                                         .limit(50)
                                         .get();

        let feedbackHtml = `<h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">Recent Feedback Messages</h3>`;

        if (feedbackSnapshot.empty) {
            feedbackHtml += '<p class="text-sm text-muted">No feedback messages found.</p>';
        } else {
            feedbackHtml += '<div class="space-y-3">';
            feedbackSnapshot.forEach(doc => {
                const feedback = doc.data();
                const feedbackId = doc.id;
                const date = feedback.timestamp ? new Date(feedback.timestamp.toDate()).toLocaleString() : 'N/A';
                const statusClass = feedback.status === 'new' ? 'bg-yellow-100 dark:bg-yellow-900/80 border-yellow-300 dark:border-yellow-700' : feedback.status === 'replied' ? 'bg-green-100 dark:bg-green-900/80 border-green-300 dark:border-green-700' : 'bg-gray-100 dark:bg-gray-700/80 border-gray-300 dark:border-gray-600';
                const statusText = feedback.status === 'new' ? 'New' : feedback.status === 'replied' ? 'Replied' : (feedback.status || 'Unknown');
                const senderName = escapeHtml(feedback.username || 'Unknown User');
                const isAdminSender = feedback.userId === ADMIN_UID;
                const adminIconHtml = isAdminSender ? `<svg class="admin-icon w-3 h-3 inline-block ml-1 text-yellow-500 dark:text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" clip-rule="evenodd" /></svg>` : '';
                const feedbackTextEscaped = escapeHtml(feedback.feedbackText || 'No text');
                const replyTextEscaped = escapeHtml(feedback.replyText || '');

                feedbackHtml += `
                    <div class="${statusClass} p-3 rounded-lg border shadow-sm text-sm">
                        <div class="flex justify-between items-center mb-1">
                             <span class="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">${feedbackId}</span>
                             <span class="text-xs font-semibold px-2 py-0.5 rounded ${statusText === 'New' ? 'bg-yellow-500 text-white' : statusText === 'Replied' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}">${statusText}</span>
                        </div>
                        <p><strong>From:</strong> ${senderName}${adminIconHtml} (ID: ${feedback.userId || 'N/A'})</p>
                        <p><strong>Subject ID:</strong> ${escapeHtml(feedback.subjectId || 'N/A')}</p>
                        <p><strong>Question ID:</strong> ${escapeHtml(feedback.questionId || 'N/A')}</p>
                        <p><strong>Date:</strong> ${date}</p>
                        <p class="bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-500 mt-1 whitespace-pre-wrap text-xs">${feedbackTextEscaped}</p>
                        ${feedback.replyText ? `<p class="mt-2 pt-2 border-t dark:border-gray-600 text-xs"><strong>Admin Reply:</strong> ${replyTextEscaped}</p>` : ''}
                        <div class="mt-2 text-right space-x-2">
                             <!-- NEW: Delete Button -->
                             <button onclick="window.confirmDeleteFeedback('${feedbackId}')" class="btn-danger-small text-xs">Delete</button>
                             ${feedback.status !== 'replied' ? `<button onclick="window.promptAdminReply('${feedbackId}', '${feedback.userId}')" class="btn-secondary-small text-xs">Reply</button>` : ''}
                        </div>
                    </div>
                `;
            });
            feedbackHtml += '</div>';
        }
        contentArea.innerHTML = feedbackHtml;

    } catch (error) {
        console.error("Error loading feedback for admin:", error);
        contentArea.innerHTML = `<p class="text-red-500 text-sm">Error loading feedback: ${error.message}</p>`;
    }
}

export function promptAdminReply(feedbackId, recipientUserId) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Action requires admin privileges.");
        return;
    }
    const replyText = prompt(`Enter reply for feedback ID ${feedbackId}:`);
    if (replyText && replyText.trim()) {
        handleAdminReply(feedbackId, recipientUserId, replyText.trim());
    } else if (replyText !== null) {
        alert("Reply cannot be empty.");
    }
}

async function handleAdminReply(feedbackId, recipientUserId, replyText) {
     if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Action requires admin privileges.");
        return;
    }
    showLoading("Sending reply...");
    const success = await sendAdminReply(recipientUserId, `Reply regarding feedback ${feedbackId}`, replyText, currentUser);
    if (success) {
        try {
            await db.collection('feedback').doc(feedbackId).update({
                status: 'replied',
                replyText: replyText
            });
            console.log(`Feedback ${feedbackId} status updated to replied.`);
            alert("Reply sent successfully!");
            loadFeedbackForAdmin(); // Refresh the list
        } catch (updateError) {
            console.error("Error updating feedback status:", updateError);
            alert("Reply sent, but failed to update feedback status.");
        }
    } else {
         alert("Failed to send reply."); // sendAdminReply likely shows an alert too
    }
    hideLoading();
}

// --- NEW: Feedback Deletion ---
export function confirmDeleteFeedback(feedbackId) {
     if (!currentUser || currentUser.uid !== ADMIN_UID) { alert("Action requires admin privileges."); return; }
     if (confirm(`Are you sure you want to permanently delete feedback message ID ${feedbackId}? This cannot be undone.`)) {
          handleDeleteFeedback(feedbackId);
     }
}
window.confirmDeleteFeedback = confirmDeleteFeedback;

async function handleDeleteFeedback(feedbackId) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) { alert("Action requires admin privileges."); return; }
    showLoading("Deleting feedback...");
    try {
        await db.collection('feedback').doc(feedbackId).delete();
        hideLoading();
        alert(`Feedback message ${feedbackId} deleted successfully.`);
        loadFeedbackForAdmin(); // Refresh the feedback list
    } catch (error) {
         hideLoading();
         console.error(`Error deleting feedback ${feedbackId}:`, error);
         alert(`Failed to delete feedback: ${error.message}`);
    }
}
// --- End Feedback Deletion ---

// --- Course Management Section ---
async function loadCoursesForAdmin() {
     const contentArea = document.getElementById('admin-content-area'); // Target the content area
     if (!contentArea) return;
     contentArea.innerHTML = `<h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">Course Management (Pending/Reported)</h3><div id="admin-courses-list"><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div></div>`;
     const coursesListDiv = document.getElementById('admin-courses-list');
     try {
         const coursesSnapshot = await db.collection('courses').where('status', 'in', ['pending', 'reported']).orderBy('createdAt', 'desc').limit(50).get();
         if (coursesSnapshot.empty) { coursesListDiv.innerHTML = '<p class="text-sm text-muted">No courses currently require admin attention.</p>'; return; }
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
         coursesListDiv.innerHTML = coursesHtml;
     } catch (error) {
         console.error("Error loading courses for admin:", error);
         coursesListDiv.innerHTML = `<p class="text-red-500 text-sm">Error loading courses: ${error.message}. This might require creating a Firestore index (check console). </p>`;
     }
 }

// --- User Course Management Section ---
function loadUserCourseSection() {
    const contentArea = document.getElementById('admin-content-area');
    if (!contentArea) return;
    contentArea.innerHTML = `
         <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">User Course Management</h3>
         <div class="flex flex-wrap gap-4 mb-4">
             <input type="text" id="admin-user-search-courses-input" placeholder="Enter User ID or Email..." class="flex-grow">
             <button onclick="window.findAndLoadUserCourses()" class="btn-secondary-small flex-shrink-0">Load User Courses</button>
         </div>
         <div id="admin-user-courses-list">
             <p class="text-muted text-sm">Enter a User ID or Email and click 'Load' to manage their course enrollments and completion status.</p>
         </div>
    `;
}

export async function findAndLoadUserCourses() { // Renamed from loadUserCoursesForAdmin
    const searchInput = document.getElementById('admin-user-search-courses-input');
    const userCoursesListDiv = document.getElementById('admin-user-courses-list');
    if (!searchInput || !userCoursesListDiv) return;

    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        userCoursesListDiv.innerHTML = '<p class="text-yellow-500 text-sm">Please enter a User ID or Email.</p>';
        return;
    }

    userCoursesListDiv.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
    showLoading("Finding user and loading courses...");

    let targetUserId = null;

    try {
        if (searchTerm.includes('@')) {
            const userQuery = await db.collection('users').where('email', '==', searchTerm.toLowerCase()).limit(1).get();
            if (!userQuery.empty) targetUserId = userQuery.docs[0].id;
        } else {
            const userDoc = await db.collection('users').doc(searchTerm).get();
            if (userDoc.exists) targetUserId = userDoc.id;
        }

        if (!targetUserId) throw new Error("User not found with the provided ID or Email.");

        const progressCollectionRef = db.collection('userCourseProgress').doc(targetUserId).collection('courses');
        const snapshot = await progressCollectionRef.get();
        hideLoading();

        if (snapshot.empty) {
            userCoursesListDiv.innerHTML = `<p class="text-sm text-muted">User ${escapeHtml(searchTerm)} (ID: ${targetUserId}) is not enrolled in any courses.</p>`;
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
                <div class="border dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-700 flex flex-wrap justify-between items-center gap-2 text-sm">
                    <span class="font-medium flex-grow">${escapeHtml(courseName)}</span>
                    <span class="text-xs text-muted">Status: ${escapeHtml(status)} | Grade: ${escapeHtml(grade)}</span>
                    <button onclick="window.handleAdminMarkCourseComplete('${targetUserId}', '${courseId}')" class="btn-secondary-small text-xs" title="Mark Complete/Failed & Set Grade">
                        Set Status/Grade
                    </button>
                </div>
            `;
        });
        coursesHtml += '</div>';
        userCoursesListDiv.innerHTML = coursesHtml;

    } catch (error) {
        hideLoading();
        console.error("Error loading user courses for admin:", error);
        userCoursesListDiv.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
    }
}
window.findAndLoadUserCourses = findAndLoadUserCourses; // Assign new name

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
         findAndLoadUserCourses(); // Refresh the list
     } else {
         // Error alert likely shown by updateCourseStatusForUser
     }
}

// --- User Badge Management Section ---
function loadUserBadgeSection() {
     const contentArea = document.getElementById('admin-content-area');
     if (!contentArea) return;
     contentArea.innerHTML = `
          <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">User Badge Management</h3>
          <div class="flex flex-wrap gap-4 mb-4">
              <input type="text" id="admin-user-search-badges-input" placeholder="Enter User ID or Email..." class="flex-grow">
              <button onclick="window.findAndLoadUserBadges()" class="btn-secondary-small flex-shrink-0">Load User Badges</button>
          </div>
          <div id="admin-user-badges-list">
              <p class="text-muted text-sm">Enter a User ID or Email and click 'Load' to manually manage their completed course badges.</p>
          </div>
     `;
 }

async function findUserId(searchTerm) {
     let targetUserId = null;
     const lowerSearchTerm = searchTerm.toLowerCase();
     if (searchTerm.includes('@')) {
         const userQuery = await db.collection('users').where('email', '==', lowerSearchTerm).limit(1).get();
         if (!userQuery.empty) targetUserId = userQuery.docs[0].id;
     } else {
         const userDoc = await db.collection('users').doc(searchTerm).get();
         if (userDoc.exists) targetUserId = userDoc.id;
     }
     return targetUserId;
}

export async function findAndLoadUserBadges() { // Renamed from loadUserBadgesForAdmin
    const searchInput = document.getElementById('admin-user-search-badges-input');
    const badgesListDiv = document.getElementById('admin-user-badges-list');
    if (!searchInput || !badgesListDiv) return;

    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        badgesListDiv.innerHTML = '<p class="text-yellow-500 text-sm">Please enter a User ID or Email.</p>'; return;
    }

    badgesListDiv.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
    showLoading("Finding user and loading badges...");

    try {
        const targetUserId = await findUserId(searchTerm);
        if (!targetUserId) throw new Error("User not found with the provided ID or Email.");

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
        badgesListDiv.innerHTML = badgesHtml;
    } catch (error) {
        hideLoading();
        console.error("Error loading user badges for admin:", error);
        badgesListDiv.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
    }
}
window.findAndLoadUserBadges = findAndLoadUserBadges; // Assign new name

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
             completionDate = new Date(completionDateStr);
             if (isNaN(completionDate.getTime())) throw new Error("Invalid date value.");
         } catch(e) { alert("Invalid date format. Please use YYYY-MM-DD."); return; }
     }
     handleAddBadgeForUser(userId, courseId, courseName, grade, completionDate); // handleAddBadgeForUser already assigned to window
}

export function confirmRemoveBadge(userId, courseId) {
     if (!currentUser || currentUser.uid !== ADMIN_UID) { alert("Admin privileges required."); return; }
     if (confirm(`Are you sure you want to remove the badge for course ID "${courseId}" for user ${userId}?`)) {
         handleRemoveBadgeForUser(userId, courseId); // handleRemoveBadgeForUser already assigned to window
     }
}

// --- Playlist Management Section ---
function loadPlaylistSection() {
    const contentArea = document.getElementById('admin-content-area');
    if (!contentArea) return;
    contentArea.innerHTML = `
         <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">Playlist & Chapter Assignment</h3>
          <div class="flex gap-4 mb-4">
             <select id="admin-playlist-course-select" class="flex-grow"><option value="">Select Course...</option></select>
             <button onclick="window.loadPlaylistForAdmin()" class="btn-secondary-small" disabled>Load Playlist Videos</button>
          </div>
          <div id="admin-playlist-videos-area" class="max-h-96 overflow-y-auto border dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-700/50">
               <p class="text-muted text-sm">Select a course to load its associated YouTube playlist(s).</p>
          </div>
          <div id="admin-video-action-area" class="mt-3 pt-3 border-t dark:border-gray-600 hidden">
              <p id="admin-selected-video-count" class="text-sm font-medium mb-3">Selected Videos: 0</p>
              <div class="flex flex-wrap gap-3 items-center">
                   <label for="admin-assign-chapter-num" class="self-center text-sm">Target Chapter:</label>
                   <input type="number" id="admin-assign-chapter-num" min="1" class="w-20">
                   <button id="admin-assign-video-btn" onclick="window.handleAssignVideoToChapter()" class="btn-primary-small" disabled>Assign Selected</button>
                   <button id="admin-unassign-video-btn" onclick="window.handleUnassignVideoFromChapter()" class="btn-danger-small" disabled>Unassign Selected</button>
              </div>
          </div>
    `;
    populateAdminCourseSelect(); // Populate dropdown after adding section HTML
}

function populateAdminCourseSelect() {
    const select = document.getElementById('admin-playlist-course-select');
    if (!select) return;
    select.innerHTML = '<option value="">Select Course...</option>'; // Reset
    globalCourseDataMap.forEach((course, courseId) => {
        // List courses that have *any* playlist URL defined
        if (course.youtubePlaylistUrls?.length > 0 || course.youtubePlaylistUrl) {
             const option = document.createElement('option');
             option.value = courseId;
             option.textContent = course.name || courseId;
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
         videosArea.innerHTML = `<p class="text-warning text-sm">No YouTube playlist URL defined for course "${courseDef?.name || courseId}".</p>`;
         actionArea.classList.add('hidden');
         return;
    }

     if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === "YOUR_API_KEY_HERE") {
          alert("YouTube API Key is not configured in config.js. Cannot load playlist.");
          videosArea.innerHTML = `<p class="text-danger text-sm">YouTube API Key missing in configuration.</p>`;
          return;
     }

    videosArea.innerHTML = `<div class="flex justify-center items-center p-4"><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div><p class="ml-3 text-sm text-muted">Loading videos...</p></div>`;
    actionArea.classList.add('hidden'); // Hide actions while loading
    selectedVideosForAssignment = []; // Reset selection
    updateSelectedVideoCount(); // Update count display
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
             let positionOffset = 0; // In case of multiple playlists, keep position relative
             do {
                  const data = await fetchPlaylistItems(playlistId, YOUTUBE_API_KEY, nextPageToken);
                  if (data.items) {
                      allVideos.push(...data.items.map(item => ({
                           videoId: item.snippet?.resourceId?.videoId,
                           title: item.snippet?.title,
                           thumbnail: item.snippet?.thumbnails?.default?.url,
                           position: (item.snippet?.position ?? 0) + positionOffset // Adjust position based on playlist order
                      })));
                  }
                  nextPageToken = data.nextPageToken;
             } while (nextPageToken);
             positionOffset += allVideos.length; // Increase offset for next playlist
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
         videosArea.innerHTML = '<p class="text-muted text-sm">No videos found in the specified playlist(s).</p>';
    } else {
         allVideos.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
         renderPlaylistVideos(allVideos, videosArea);
         actionArea.classList.remove('hidden'); // Show actions after loading
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
         if (!video.videoId || !video.title) return; // Skip invalid items
         videosHtml += `
              <li id="admin-video-${video.videoId}" class="flex items-center gap-3 p-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer" onclick="window.toggleVideoSelection(this, '${video.videoId}', '${escapeHtml(video.title.replace(/'/g, "\\'"))}')">
                  <input type="checkbox" class="admin-video-select flex-shrink-0 pointer-events-none" value="${video.videoId}" data-title="${escapeHtml(video.title)}">
                  <img src="${video.thumbnail || ''}" alt="Thumb" class="w-16 h-9 object-cover rounded flex-shrink-0" onerror="this.style.display='none'">
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
     updateSelectionState(videoId, videoTitle, checkbox.checked);
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
     console.log("Current selection:", selectedVideosForAssignment);
}

function updateSelectedVideoCount() {
    const countArea = document.getElementById('admin-selected-video-count');
    const assignBtn = document.getElementById('admin-assign-video-btn');
    const unassignBtn = document.getElementById('admin-unassign-video-btn');
    const count = selectedVideosForAssignment.length;

    if (countArea) {
        countArea.textContent = `Selected Videos: ${count}`;
    }
    if (assignBtn) {
        assignBtn.disabled = count === 0;
    }
     if (unassignBtn) {
          unassignBtn.disabled = count === 0;
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

     if (!chapterNumInput || isNaN(chapterNum) || chapterNum < 1 || (courseDef && chapterNum > courseDef.totalChapters)) {
          alert(`Please enter a valid chapter number (1-${courseDef?.totalChapters || '?'}).`);
          chapterNumInput?.focus();
          return;
     }

     showLoading(`Assigning ${selectedVideosForAssignment.length} video(s) to Chapter ${chapterNum}...`);

     try {
          const currentCourseData = globalCourseDataMap.get(currentLoadedPlaylistCourseId) || (await db.collection('courses').doc(currentLoadedPlaylistCourseId).get()).data() || {};
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
               alert(`${addedCount} video(s) successfully assigned to Chapter ${chapterNum} for course "${courseDef?.name || currentLoadedPlaylistCourseId}".`);
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

      if (!chapterNumInput || isNaN(chapterNum) || chapterNum < 1 || (courseDef && chapterNum > courseDef.totalChapters)) {
          alert(`Please enter a valid chapter number (1-${courseDef?.totalChapters || '?'}) from which to unassign videos.`);
          chapterNumInput?.focus();
          return;
      }

     if (!confirm(`Are you sure you want to unassign ${selectedVideosForAssignment.length} selected video(s) from Chapter ${chapterNum}?`)) {
          return;
     }

     showLoading(`Unassigning ${selectedVideosForAssignment.length} video(s) from Chapter ${chapterNum}...`);

     try {
          const currentCourseData = globalCourseDataMap.get(currentLoadedPlaylistCourseId) || (await db.collection('courses').doc(currentLoadedPlaylistCourseId).get()).data() || {};
          const chapterResources = { ...(currentCourseData.chapterResources || {}) };

          if (!chapterResources[chapterNum] || !chapterResources[chapterNum].lectureUrls) {
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


// Assign other functions needed by buttons to window scope
window.promptAdminReply = promptAdminReply;
window.handleAdminMarkCourseComplete = handleAdminMarkCourseComplete;
window.promptAddBadge = promptAddBadge;
window.confirmRemoveBadge = confirmRemoveBadge;
window.handleCourseApproval = handleCourseApproval; // From ui_courses.js
window.showCourseDetails = showCourseDetails; // From ui_courses.js
window.showEditCourseForm = showEditCourseForm; // From ui_courses.js

// --- END OF FILE ui_admin_dashboard.js ---