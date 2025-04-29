// --- START OF FILE ui_admin_dashboard.js ---

// ui_admin_dashboard.js

import { db, currentUser, globalCourseDataMap, userCourseProgressMap, updateGlobalCourseData } from './state.js'; // Added updateGlobalCourseData
import { ADMIN_UID, YOUTUBE_API_KEY } from './config.js'; // Import YouTube API Key
import { displayContent, clearContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js';
// Added updateCourseStatusForUser and updateCourseDefinition
// Import handleRemoveBadgeForUser which is called by the exported confirmRemoveBadge
import { sendAdminReply, updateCourseStatusForUser, handleAddBadgeForUser, handleRemoveBadgeForUser, updateCourseDefinition, submitFeedback } from './firebase_firestore.js'; // Import badge handlers & course definition update
// Import course functions needed by admin buttons
import { handleCourseApproval, showCourseDetails, showEditCourseForm } from './ui_courses.js';
// Use the imported escapeHtml from utils.js

// State for Playlist Management section
let selectedVideosForAssignment = []; // Array to hold { videoId, title }
let currentLoadedPlaylistCourseId = null;

// --- Admin Dashboard UI ---

export function showAdminDashboard() {
    // Use imported currentUser from state.js
    if (currentUser?.uid !== ADMIN_UID) {
        displayContent('<p class="text-red-500 p-4">Access Denied. Admin privileges required.</p>');
        return;
    }
    clearContent();
    setActiveSidebarLink('showAdminDashboard', 'sidebar-standard-nav'); // Target standard nav

    // Main dashboard card layout
    const dashboardHtml = `
        <div class="animate-fade-in space-y-8">
            <h2 class="text-2xl font-semibold text-indigo-600 dark:text-indigo-400">Admin Dashboard</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Feedback Management Card -->
                <div id="admin-card-feedback" class="admin-dashboard-card" onclick="window.loadAdminSection('feedback')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.404 14.596A6.5 6.5 0 1 1 14.596 5.404a6.5 6.5 0 0 1-9.192 9.192ZM10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" clip-rule="evenodd" /><path d="M9.667 11.667a.75.75 0 0 1-.75-.75V7.75a.75.75 0 1 1 1.5 0V11a.75.75 0 0 1-.75.75Zm.01 2.1a.76.76 0 0 1-.76-.76c0-.42.34-.76.76-.76s.76.34.76.76a.76.76 0 0 1-.76.76Z" /></svg>
                    <p>Review Feedback</p>
                </div>

                 <!-- Course Management Card -->
                <div id="admin-card-courses" class="admin-dashboard-card" onclick="window.loadAdminSection('courses')">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 2.75a.75.75 0 0 0-1.5 0V4h-2.25a.75.75 0 0 0 0 1.5h2.25v2.25a.75.75 0 0 0 1.5 0V5.5h2.25a.75.75 0 0 0 0-1.5H10.75V2.75Z" /><path fill-rule="evenodd" d="M7.586 4.414l6.293 6.293a1 1 0 0 1-1.414 1.414L6.172 5.828A1 1 0 0 1 7.586 4.414ZM4.414 7.586l6.293 6.293a1 1 0 0 1-1.414 1.414L4.414 8.9A1 1 0 0 1 4.414 7.586Z" clip-rule="evenodd" /><path d="M8 12.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM12.5 8a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z" /></svg>
                    <p>Manage Courses</p>
                </div>

                <!-- User Course Mgt Card -->
                <div id="admin-card-user-courses" class="admin-dashboard-card" onclick="window.loadAdminSection('user-courses')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.095a1.23 1.23 0 0 0 .41-1.412A9.988 9.988 0 0 0 10 12c-2.31 0-4.438.784-6.131 2.095Z" /></svg>
                    <p>User Course Status</p>
                </div>

                <!-- User Badge Mgt Card -->
                <div id="admin-card-user-badges" class="admin-dashboard-card" onclick="window.loadAdminSection('user-badges')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M13.462 6.057a.75.75 0 0 1 1.06 0l1.855 1.854a.75.75 0 0 1 0 1.06l-3.535 3.536a.75.75 0 0 1-1.06 0l-1.146-1.147 1.646-1.647a.75.75 0 0 1 1.18-.093ZM8.138 7.943l-1.147 1.147a.75.75 0 0 1-1.06 0L2.396 5.555a.75.75 0 0 1 0-1.06l1.854-1.855a.75.75 0 0 1 1.06 0l1.147 1.147 1.677-1.677a.75.75 0 0 1 1.18.093l1.415 1.414-4.633 4.633Z" /><path fill-rule="evenodd" d="M8.197 17.166a.75.75 0 0 1-.74.035l-4-1.5a.75.75 0 0 1 0-1.39L7.4 12.75l1.147 1.146L3.93 15.513l3.53 1.324a.75.75 0 0 1 .737.329Z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M11.803 17.166a.75.75 0 0 0 .74.035l4-1.5a.75.75 0 0 0 0-1.39l-3.944-1.562-1.147 1.146 4.618 1.616-3.53 1.324a.75.75 0 0 0-.737.329Z" clip-rule="evenodd" /></svg>
                    <p>User Badge Management</p>
                </div>

                 <!-- Playlist Assignment Card -->
                 <div id="admin-card-playlist" class="admin-dashboard-card" onclick="window.loadAdminSection('playlist')">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" /><path d="M5.5 4a.5.5 0 0 0-1 0v6a5 5 0 0 0 10 0V4a.5.5 0 0 0-1 0v6a4 4 0 0 1-8 0V4Z" /><path d="M2 11.5a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 0-1H2.5a.5.5 0 0 0-.5.5Z" /></svg>
                    <p>Playlist Assignment</p>
                 </div>
            </div>

            <!-- Content Area for Selected Section -->
            <div id="admin-content-area" class="mt-8">
                <!-- Content will be loaded here -->
                 <p class="text-center text-muted italic">Select an option above to manage.</p>
            </div>

        </div>
    `;
    displayContent(dashboardHtml);
}

// --- Load Specific Admin Sections ---
window.loadAdminSection = async (section) => {
    const contentArea = document.getElementById('admin-content-area');
    if (!contentArea) return;
    contentArea.innerHTML = `<div class="text-center p-4"><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-2 text-sm text-muted">Loading ${section}...</p></div>`;
    setActiveAdminSection(section); // Highlight the selected card

    switch (section) {
        case 'feedback':
            await loadFeedbackForAdmin(); // Reuse existing function but target contentArea
            break;
        case 'courses':
            await loadCoursesForAdmin(); // Reuse existing function but target contentArea
            break;
        case 'user-courses':
            loadUserCoursesAdminUI(); // Load the search UI
            break;
        case 'user-badges':
            loadUserBadgesAdminUI(); // Load the search UI
            break;
        case 'playlist':
            loadPlaylistAdminUI(); // Load the playlist UI
            break;
        default:
            contentArea.innerHTML = '<p class="text-warning">Unknown admin section.</p>';
    }
}

// Helper to visually indicate the active admin section card
function setActiveAdminSection(activeSection) {
     document.querySelectorAll('.admin-dashboard-card').forEach(card => {
         card.classList.remove('ring-2', 'ring-primary-500', 'bg-gray-100', 'dark:bg-gray-700');
         // Match the ID we assigned to the card
         if (card.id === `admin-card-${activeSection}`) {
             card.classList.add('ring-2', 'ring-primary-500', 'bg-gray-100', 'dark:bg-gray-700');
         }
     });
}

// --- Feedback Section ---
// MODIFIED: Loads content into #admin-content-area and includes delete button
async function loadFeedbackForAdmin() {
    const feedbackArea = document.getElementById('admin-content-area');
    if (!feedbackArea) return;
    feedbackArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;

    try {
        const feedbackSnapshot = await db.collection('feedback')
                                         .orderBy('timestamp', 'desc')
                                         .limit(50)
                                         .get();


        let feedbackHtml = '<h3 class="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400">Recent Feedback Messages</h3>'; // Add title
        if (feedbackSnapshot.empty) {
            feedbackHtml += '<p class="text-sm text-muted">No feedback messages found.</p>';
            feedbackArea.innerHTML = feedbackHtml;
            return;
        }

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
                         <span class="text-xs font-mono text-gray-500 dark:text-gray-400 break-all" title="${feedbackId}">${feedbackId.substring(0,8)}...</span>
                         <span class="text-xs font-semibold px-2 py-0.5 rounded ${statusText === 'New' ? 'bg-yellow-500 text-white' : statusText === 'Replied' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}">${statusText}</span>
                    </div>
                    <p><strong>From:</strong> ${senderName}${adminIconHtml} (ID: ${feedback.userId || 'N/A'})</p>
                    <p><strong>Context ID:</strong> ${escapeHtml(feedback.subjectId || 'N/A')} / ${escapeHtml(feedback.questionId || 'N/A')}</p>
                    <p><strong>Date:</strong> ${date}</p>
                    <p class="bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-500 mt-1 whitespace-pre-wrap text-xs">${feedbackTextEscaped}</p>
                    ${feedback.replyText ? `<p class="mt-2 pt-2 border-t dark:border-gray-600 text-xs"><strong>Admin Reply:</strong> ${replyTextEscaped}</p>` : ''}
                    <div class="mt-2 text-right space-x-2">
                        <!-- MODIFIED: Added Delete Button -->
                        <button onclick="window.confirmDeleteFeedback('${feedbackId}')" class="btn-danger-small text-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 mr-1"><path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.5-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .75.75l.275 5.5a.75.75 0 1 1-1.498-.075l-.275-5.5a.75.75 0 0 1 .748-.675Z" clip-rule="evenodd" /></svg>
                            Delete
                        </button>
                        ${feedback.status !== 'replied' ? `<button onclick="window.promptAdminReply('${feedbackId}', '${feedback.userId}')" class="btn-secondary-small text-xs"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 mr-1"><path fill-rule="evenodd" d="M4.5 9.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5Zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5Z" clip-rule="evenodd" /><path d="M1.99 4.5A2.5 2.5 0 0 1 4.5 2h7a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 1.99 11.5v-7ZM4.5 3a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 4.5 13h7a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 11.5 3h-7Z" /></svg>Reply</button>` : ''}
                    </div>
                </div>
            `;
        });
        feedbackHtml += '</div>';
        feedbackArea.innerHTML = feedbackHtml;

    } catch (error) {
        console.error("Error loading feedback for admin:", error);
        feedbackArea.innerHTML = `<h3 class="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400">Recent Feedback Messages</h3><p class="text-red-500 text-sm">Error loading feedback: ${error.message}</p>`;
    }
 }

// MODIFIED: Export promptAdminReply function
export function promptAdminReply(feedbackId, recipientUserId) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) { 
        alert("Action requires admin privileges."); 
        return; 
    }
    const replyText = prompt(`Enter reply for feedback ID ${feedbackId}:`);
    if (replyText && replyText.trim()) { 
        handleAdminReply(feedbackId, recipientUserId, replyText.trim()); 
    }
    else if (replyText !== null) { 
        alert("Reply cannot be empty."); 
    }
}
// Keep the window assignment for backward compatibility
window.promptAdminReply = promptAdminReply;

// NEW: Feedback Deletion Functions
window.confirmDeleteFeedback = (feedbackId) => { // Make global
    if (!currentUser || currentUser.uid !== ADMIN_UID) { alert("Admin privileges required."); return; }
    if (!feedbackId) { console.error("Cannot delete feedback: ID missing."); return; }
    if (confirm(`Are you sure you want to permanently delete feedback message ${feedbackId}? This cannot be undone.`)) {
        deleteFeedbackMessage(feedbackId);
    }
}
async function deleteFeedbackMessage(feedbackId) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) { alert("Admin privileges required."); return; }
    if (!feedbackId) { console.error("Cannot delete feedback: ID missing."); return; }
    showLoading("Deleting feedback...");
    try {
        await db.collection('feedback').doc(feedbackId).delete();
        hideLoading(); alert("Feedback message deleted.");
        loadAdminSection('feedback'); // Refresh the list
    } catch (error) {
        hideLoading(); console.error("Error deleting feedback:", error); alert(`Failed to delete feedback: ${error.message}`);
    }
}


// --- Course Management Section ---
// MODIFIED: Loads content into #admin-content-area
async function loadCoursesForAdmin() {
     const coursesArea = document.getElementById('admin-content-area');
     if (!coursesArea) {
        console.warn("Admin content area not found when trying to load courses.");
        return; // Exit if the target area isn't available yet
     }
     coursesArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
     try {
         const coursesSnapshot = await db.collection('courses').where('status', 'in', ['pending', 'reported']).orderBy('createdAt', 'desc').limit(50).get();

         // Add title within the content area now
         let coursesHtml = '<h3 class="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400">Manage Pending/Reported Courses</h3>';
         if (coursesSnapshot.empty) {
              coursesHtml += '<p class="text-sm text-muted">No courses currently require admin attention.</p>';
              coursesArea.innerHTML = coursesHtml;
              return;
         }

         coursesHtml += '<div class="space-y-3">';
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
         coursesArea.innerHTML = `<h3 class="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400">Manage Pending/Reported Courses</h3><p class="text-red-500 text-sm">Error loading courses: ${error.message}. This might require creating a Firestore index (check console). </p>`;
     }
 }

// --- User Course Management Section ---
// MODIFIED: Renders initial search UI into #admin-content-area
function loadUserCoursesAdminUI() {
     const contentArea = document.getElementById('admin-content-area');
     if (!contentArea) return;
     contentArea.innerHTML = `
        <h3 class="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400">User Course Management</h3>
        <div class="flex gap-4 mb-4">
             <input type="text" id="admin-user-search-courses-input" placeholder="Enter User ID or Email..." class="flex-grow">
             <button onclick="window.findAndLoadUserCourses()" class="btn-secondary">Load User Courses</button>
        </div>
         <div id="admin-user-courses-results">
            <p class="text-muted text-sm">Enter a User ID or Email and click 'Load'.</p>
        </div>
     `;
}
// MODIFIED: Targets results div within the section UI
window.findAndLoadUserCourses = async () => { // Assign to window
    const searchInput = document.getElementById('admin-user-search-courses-input');
    const userCoursesArea = document.getElementById('admin-user-courses-results'); // Target results div
    if (!searchInput || !userCoursesArea) return;
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) { userCoursesArea.innerHTML = '<p class="text-yellow-500 text-sm">Please enter a User ID or Email.</p>'; return; }

    userCoursesArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
    showLoading("Finding user and loading courses..."); // Keep global loading

    let targetUserId = null; let targetUserInfo = null;

    try {
        targetUserId = await findUserId(searchTerm); // Use helper
        if (!targetUserId) throw new Error("User not found with the provided ID or Email.");
        // Fetch user info again for display name
        const userDoc = await db.collection('users').doc(targetUserId).get();
        targetUserInfo = userDoc.exists ? userDoc.data() : {};
        const displayName = escapeHtml(targetUserInfo?.displayName || targetUserInfo?.username || targetUserInfo?.email);

        const progressCollectionRef = db.collection('userCourseProgress').doc(targetUserId).collection('courses');
        const snapshot = await progressCollectionRef.get();
        hideLoading();

        let coursesHtml = `<h4 class="text-md font-medium mb-2">Courses for ${displayName} (ID: ${targetUserId})</h4>`;
        if (snapshot.empty) {
            coursesHtml += `<p class="text-sm text-muted">User is not enrolled in any courses.</p>`;
        } else {
             coursesHtml += '<div class="space-y-2">';
             snapshot.forEach(doc => {
                 const progress = doc.data(); const courseId = doc.id;
                 const courseDef = globalCourseDataMap.get(courseId);
                 const courseName = courseDef?.name || `Course ${courseId}`;
                 const status = progress.status || 'enrolled';
                 const grade = progress.grade || 'N/A';
                 coursesHtml += `
                    <div class="border dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-700 flex justify-between items-center gap-2 text-sm">
                        <span class="font-medium flex-grow">${escapeHtml(courseName)}</span>
                        <span class="text-xs text-muted">Status: ${escapeHtml(status)} | Grade: ${escapeHtml(grade)}</span>
                        <button onclick="window.handleAdminMarkCourseComplete('${targetUserId}', '${courseId}')" class="btn-secondary-small text-xs" title="Mark Complete/Failed & Set Grade">Set Status/Grade</button>
                    </div>`;
             });
             coursesHtml += '</div>';
        }
        userCoursesArea.innerHTML = coursesHtml;
    } catch (error) {
        hideLoading(); console.error("Error loading user courses for admin:", error);
        userCoursesArea.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
    }
}

// MODIFIED: Define handleAdminMarkCourseComplete here instead of importing from firebase_firestore
export async function handleAdminMarkCourseComplete(userId, courseId) {
     if (!currentUser || currentUser.uid !== ADMIN_UID) {
         alert("Admin privileges required.");
         return;
     }

     const newStatusInput = prompt(`Enter new status for course ${courseId} (user ${userId}).\nOptions: 'completed', 'failed', 'enrolled'.`);
     if (!newStatusInput) return; // User cancelled
     const newStatus = newStatusInput.trim().toLowerCase();
     if (!['completed', 'failed', 'enrolled'].includes(newStatus)) {
         alert("Invalid status. Please enter 'completed', 'failed', or 'enrolled'.");
         return;
     }

     let finalMark = null;
     if (newStatus === 'completed' || newStatus === 'failed') {
         const markInput = prompt(`Enter final mark (0-100) for course ${courseId} (leave blank to auto-calculate if possible):`);
         if (markInput !== null && markInput.trim() !== '') {
             const parsedMark = parseFloat(markInput);
             if (isNaN(parsedMark) || parsedMark < 0 || parsedMark > 110) { // Allow slightly > 100 for bonus
                 alert("Invalid mark. Please enter a number between 0 and 110, or leave blank.");
                 return;
             }
             finalMark = parsedMark;
         } else if (markInput === null) {
             return; // User cancelled mark input
         }
     }

     showLoading("Updating course status...");
     // Call the actual Firestore update function (which IS in firebase_firestore.js)
     const success = await updateCourseStatusForUser(userId, courseId, finalMark, newStatus);
     hideLoading();

     if (success) {
         alert(`Course ${courseId} status updated successfully for user ${userId}.`);
         // Refresh the current admin view if we are looking at this user's courses
         const searchInput = document.getElementById('admin-user-search-courses-input');
         const userDoc = await db.collection('users').doc(userId).get();
         const searchTerm = searchInput?.value.trim();
         if (searchTerm && (searchTerm === userId || searchTerm.toLowerCase() === userDoc.data()?.email?.toLowerCase())) {
             window.findAndLoadUserCourses(); // Reload the list for the currently viewed user
         }
     }
     // updateCourseStatusForUser handles its own error alert
}

export async function loadUserCoursesForAdmin(userId) {
    if (!userId) {
        console.error("No user ID provided for course loading");
        return null;
    }
    try {
        const progressCollectionRef = db.collection('userCourseProgress').doc(userId).collection('courses');
        const snapshot = await progressCollectionRef.get();
        
        if (snapshot.empty) {
            return [];
        }

        const courses = [];
        snapshot.forEach(doc => {
            const progress = doc.data();
            const courseId = doc.id;
            const courseDef = globalCourseDataMap.get(courseId);
            courses.push({
                courseId,
                courseName: courseDef?.name || `Course ${courseId}`,
                status: progress.status || 'enrolled',
                grade: progress.grade || 'N/A',
                progress: progress
            });
        });
        return courses;
    } catch (error) {
        console.error("Error loading user courses:", error);
        return null;
    }
}

// --- User Badge Management Section ---
// MODIFIED: Renders initial search UI into #admin-content-area
function loadUserBadgesAdminUI() {
     const contentArea = document.getElementById('admin-content-area');
     if (!contentArea) return;
     contentArea.innerHTML = `
        <h3 class="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400">User Badge Management</h3>
        <div class="flex gap-4 mb-4">
             <input type="text" id="admin-user-search-badges-input" placeholder="Enter User ID or Email..." class="flex-grow">
             <button onclick="window.findAndLoadUserBadges()" class="btn-secondary">Load User Badges</button>
        </div>
         <div id="admin-user-badges-results">
            <p class="text-muted text-sm">Enter a User ID or Email and click 'Load'.</p>
        </div>
     `;
}
// MODIFIED: Targets results div within the section UI
window.findAndLoadUserBadges = async () => { // Assign to window
    const searchInput = document.getElementById('admin-user-search-badges-input');
    const badgesArea = document.getElementById('admin-user-badges-results'); // Target results div
    if (!searchInput || !badgesArea) return;
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) { badgesArea.innerHTML = '<p class="text-yellow-500 text-sm">Please enter a User ID or Email.</p>'; return; }

    badgesArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
    showLoading("Finding user and loading badges...");

    try {
        const targetUserId = await findUserId(searchTerm); // Reuse helper
        if (!targetUserId) throw new Error("User not found with the provided ID or Email.");
        const userDoc = await db.collection('users').doc(targetUserId).get(); if (!userDoc.exists) throw new Error("User document does not exist.");
        const userData = userDoc.data();
        const badges = userData.completedCourseBadges || [];
        const displayName = escapeHtml(userData.displayName || userData.username || userData.email);
        hideLoading();

        let badgesHtml = `<h4 class="text-md font-medium mb-2">Badges for ${displayName} (ID: ${targetUserId})</h4>`;
        if (badges.length === 0) { badgesHtml += '<p class="text-sm text-muted">User has no completed course badges.</p>'; }
        else {
            badgesHtml += '<ul class="space-y-2 list-none p-0">';
            badges.forEach((badge) => { // Removed index as it's not needed for removal
                const courseName = escapeHtml(badge.courseName || 'Unknown Course'); const grade = escapeHtml(badge.grade || 'N/A'); const dateStr = badge.completionDate?.toDate ? badge.completionDate.toDate().toLocaleDateString() : 'N/A'; const courseId = escapeHtml(badge.courseId || 'N/A');
                // Ensure confirmRemoveBadge is called correctly
                badgesHtml += `
                    <li class="border dark:border-gray-600 rounded p-2 bg-gray-50 dark:bg-gray-700 flex justify-between items-center gap-2 text-sm">
                        <span><strong>${courseName}</strong> (ID: ${courseId}) - Grade: ${grade} (${dateStr})</span>
                        <button onclick="window.confirmRemoveBadge('${targetUserId}', '${courseId}')" class="btn-danger-small text-xs" title="Remove this badge">Remove</button>
                    </li>`;
            });
            badgesHtml += '</ul>';
        }
        badgesHtml += `<div class="mt-4 pt-3 border-t dark:border-gray-600"><button onclick="window.promptAddBadge('${targetUserId}')" class="btn-success-small text-xs">Add New Badge</button></div>`;
        badgesArea.innerHTML = badgesHtml;
    } catch (error) {
        hideLoading(); console.error("Error loading user badges for admin:", error);
        badgesArea.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
    }
}

// MODIFIED: Define promptAddBadge here
export function promptAddBadge(userId) {
     if (!currentUser || currentUser.uid !== ADMIN_UID) { alert("Admin privileges required."); return; }
     const courseId = prompt(`Enter Course ID for new badge (user ${userId}):`); if (!courseId) return;
     const courseName = prompt(`Enter Course Name for badge (course ID ${courseId}):`); if (!courseName) return;
     const grade = prompt(`Enter Grade achieved (e.g., A+, B, C):`); if (!grade) return;
     const dateStr = prompt(`Enter Completion Date (YYYY-MM-DD, leave blank for today):`);
     let completionDate = null; if (dateStr) { try { completionDate = new Date(dateStr + 'T00:00:00'); if (isNaN(completionDate)) throw new Error("Invalid date"); } catch { alert("Invalid date format. Use YYYY-MM-DD."); return; } }
     // Call the actual Firestore function
     handleAddBadgeForUser(userId, courseId, courseName, grade, completionDate);
}

// MODIFIED: Ensure confirmRemoveBadge is defined and exported
export function confirmRemoveBadge(userId, courseId) {
     if (!currentUser || currentUser.uid !== ADMIN_UID) { alert("Admin privileges required."); return; }
     if (confirm(`Are you sure you want to remove the badge for course ID "${courseId}" for user ${userId}?`)) {
         handleRemoveBadgeForUser(userId, courseId); // Calls the function imported from firebase_firestore
     }
}

export async function loadUserBadgesForAdmin(userId) {
    if (!userId) {
        console.error("No user ID provided for badge loading");
        return null;
    }
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.error("User document not found");
            return null;
        }
        const userData = userDoc.data();
        return userData.badges || [];
    } catch (error) {
        console.error("Error loading user badges:", error);
        return null;
    }
}

// --- Playlist Assignment Section ---
// MODIFIED: Renders initial select/load UI into #admin-content-area
function loadPlaylistAdminUI() {
     const contentArea = document.getElementById('admin-content-area');
     if (!contentArea) return;
     contentArea.innerHTML = `
         <h3 class="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400">Playlist & Chapter Assignment</h3>
         <div class="flex gap-4 mb-4">
            <select id="admin-playlist-course-select" class="flex-grow"><option value="">Select Course...</option></select>
            <button id="load-playlist-btn" onclick="window.loadPlaylistForAdminInternal()" class="btn-secondary" disabled>Load Playlist Videos</button>
         </div>
         <div id="admin-playlist-videos-area" class="max-h-96 overflow-y-auto border dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-700/50">
              <p class="text-muted text-sm">Select a course to load its associated YouTube playlist(s).</p>
         </div>
         <div id="admin-video-action-area" class="mt-3 pt-3 border-t dark:border-gray-600 hidden">
             <p id="admin-selected-video-count" class="text-sm font-medium mb-3">Selected Videos: 0</p>
             <div class="flex flex-wrap gap-3 items-center">
                  <label for="admin-assign-chapter-num" class="self-center text-sm">Target Chapter:</label>
                  <input type="number" id="admin-assign-chapter-num" min="1" class="w-20">
                  <button id="admin-assign-video-btn" onclick="window.handleAssignVideoToChapterInternal()" class="btn-primary-small" disabled>Assign Selected</button>
                  <button id="admin-unassign-video-btn" onclick="window.handleUnassignVideoFromChapterInternal()" class="btn-danger-small" disabled>Unassign Selected</button>
             </div>
         </div>
     `;
     populateAdminCourseSelect(); // Populate the dropdown
}
// MODIFIED: Targets video area within the section UI
async function loadPlaylistForAdminInternal() { // Internal function called by button
    const select = document.getElementById('admin-playlist-course-select');
    const videosArea = document.getElementById('admin-playlist-videos-area'); // Target results div
    const actionArea = document.getElementById('admin-video-action-area');
    if (!select || !videosArea || !actionArea) return;

    const courseId = select.value;
    if (!courseId) { videosArea.innerHTML = '<p class="text-muted text-sm">Please select a course.</p>'; actionArea.classList.add('hidden'); return; }

    const courseDef = globalCourseDataMap.get(courseId);
    const playlistUrls = courseDef?.youtubePlaylistUrls?.length > 0 ? courseDef.youtubePlaylistUrls : (courseDef?.youtubePlaylistUrl ? [courseDef.youtubePlaylistUrl] : []);

    if (playlistUrls.length === 0) { videosArea.innerHTML = `<p class="text-warning text-sm">No YouTube playlist URL defined for course "${courseDef?.name || courseId}".</p>`; actionArea.classList.add('hidden'); return; }
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === "YOUR_API_KEY_HERE") { alert("YouTube API Key is not configured in config.js. Cannot load playlist."); videosArea.innerHTML = `<p class="text-danger text-sm">YouTube API Key missing in configuration.</p>`; return; }

    videosArea.innerHTML = `<div class="flex justify-center items-center p-4"><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div><p class="ml-3 text-sm text-muted">Loading videos...</p></div>`;
    actionArea.classList.add('hidden'); selectedVideosForAssignment = []; updateSelectedVideoCount(); currentLoadedPlaylistCourseId = courseId;

    let allVideos = []; let fetchError = null;
    try {
        showLoading("Loading Playlist Videos...");
        for (const url of playlistUrls) {
             const playlistId = extractPlaylistId(url); if (!playlistId) { console.warn(`Invalid playlist URL: ${url}`); continue; }
             let nextPageToken = null; let positionOffset = allVideos.length; // Keep track across multiple playlists
             do {
                  const data = await fetchPlaylistItems(playlistId, YOUTUBE_API_KEY, nextPageToken);
                  if (data.items) { allVideos.push(...data.items.map(item => ({ videoId: item.snippet?.resourceId?.videoId, title: item.snippet?.title, thumbnail: item.snippet?.thumbnails?.default?.url, position: (item.snippet?.position ?? 0) + positionOffset }))); }
                  nextPageToken = data.nextPageToken;
             } while (nextPageToken);
        } hideLoading();
    } catch (error) { hideLoading(); console.error("Error loading playlist videos:", error); fetchError = error; }
    if (fetchError) { videosArea.innerHTML = `<p class="text-danger text-sm">Error loading playlist: ${fetchError.message}. Check API Key, playlist ID, and quotas.</p>`; }
    else if (allVideos.length === 0) { videosArea.innerHTML = '<p class="text-muted text-sm">No videos found in the specified playlist(s).</p>'; }
    else { allVideos.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)); renderPlaylistVideos(allVideos, videosArea); actionArea.classList.remove('hidden'); }
}
window.loadPlaylistForAdminInternal = loadPlaylistForAdminInternal; // Assign internal for button

// --- Rest of Playlist functions remain the same ---
function populateAdminCourseSelect() {
    const select = document.getElementById('admin-playlist-course-select');
    const loadButton = document.getElementById('load-playlist-btn');
    if (!select || !loadButton) return;
    select.innerHTML = '<option value="">Select Course...</option>'; // Reset
    // Sort courses alphabetically by name for dropdown
    const sortedCourses = [...globalCourseDataMap.entries()].sort(([,a], [,b]) => (a.name || '').localeCompare(b.name || ''));

    sortedCourses.forEach(([courseId, course]) => {
        if (course.youtubePlaylistUrls?.length > 0 || course.youtubePlaylistUrl) {
             const option = document.createElement('option');
             option.value = courseId;
             option.textContent = course.name || courseId;
             select.appendChild(option);
        }
    });
    // Enable load button only if courses with playlists exist
    loadButton.disabled = select.options.length <= 1;
}
function extractPlaylistId(url) { if (!url) return null; try { const urlObj = new URL(url); if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('list')) return urlObj.searchParams.get('list'); } catch (e) { console.error("Error parsing playlist URL:", url, e); } return null; }
async function fetchPlaylistItems(playlistId, apiKey, pageToken = null) { const MAX_RESULTS = 50; let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${MAX_RESULTS}&playlistId=${playlistId}&key=${apiKey}`; if (pageToken) url += `&pageToken=${pageToken}`; console.log("Fetching playlist items from:", url); try { const response = await fetch(url); if (!response.ok) { const errorData = await response.json(); console.error("YouTube API Error Response:", errorData); throw new Error(`YouTube API Error: ${response.status} ${response.statusText} - ${errorData?.error?.message || 'Unknown error'}`); } const data = await response.json(); return data; } catch (error) { console.error("Error fetching playlist items:", error); throw error; } }
function renderPlaylistVideos(videos, container) { let videosHtml = `<div class="flex justify-end mb-2"><button onclick="window.toggleSelectAllVideos(true)" class="btn-secondary-small text-xs mr-1">Select All</button><button onclick="window.toggleSelectAllVideos(false)" class="btn-secondary-small text-xs">Select None</button></div><ul class="space-y-1 list-none p-0">`; videos.forEach(video => { if (!video.videoId || !video.title) return; videosHtml += `<li id="admin-video-${video.videoId}" class="flex items-center gap-3 p-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer" onclick="window.toggleVideoSelection(this, '${video.videoId}', '${escapeHtml(video.title.replace(/'/g, "\\'"))}')"><input type="checkbox" class="admin-video-select flex-shrink-0 pointer-events-none" value="${video.videoId}" data-title="${escapeHtml(video.title)}"><img src="${video.thumbnail || ''}" alt="Thumb" class="w-16 h-9 object-cover rounded flex-shrink-0" onerror="this.style.display='none'"><span class="text-xs flex-grow">${escapeHtml(video.title)}</span></li>`; }); videosHtml += '</ul>'; container.innerHTML = videosHtml; }
window.toggleSelectAllVideos = (select) => { // Assign to window
    document.querySelectorAll('#admin-playlist-videos-area input[type="checkbox"]').forEach(cb => { if (cb.checked !== select) { cb.checked = select; updateSelectionState(cb.value, cb.dataset.title, select); cb.closest('li')?.classList.toggle('ring-2', select); cb.closest('li')?.classList.toggle('ring-primary-500', select); } }); updateSelectedVideoCount();
}
window.toggleVideoSelection = (listItem, videoId, videoTitle) => { // Assign to window
    const checkbox = listItem.querySelector('input[type="checkbox"]'); if (!checkbox) return; checkbox.checked = !checkbox.checked; updateSelectionState(videoId, videoTitle, checkbox.checked); listItem.classList.toggle('ring-2', checkbox.checked); listItem.classList.toggle('ring-primary-500', checkbox.checked); updateSelectedVideoCount();
}
function updateSelectionState(videoId, videoTitle, isSelected) { const index = selectedVideosForAssignment.findIndex(v => v.videoId === videoId); if (isSelected && index === -1) { selectedVideosForAssignment.push({ videoId, title: videoTitle }); } else if (!isSelected && index > -1) { selectedVideosForAssignment.splice(index, 1); } console.log("Current selection:", selectedVideosForAssignment); }
function updateSelectedVideoCount() { const countArea = document.getElementById('admin-selected-video-count'); const assignBtn = document.getElementById('admin-assign-video-btn'); const unassignBtn = document.getElementById('admin-unassign-video-btn'); const count = selectedVideosForAssignment.length; if (countArea) countArea.textContent = `Selected Videos: ${count}`; if (assignBtn) assignBtn.disabled = count === 0; if (unassignBtn) unassignBtn.disabled = count === 0; }
async function handleAssignVideoToChapterInternal() { // Internal function called by button
     if (selectedVideosForAssignment.length === 0 || !currentLoadedPlaylistCourseId) { alert("Please select video(s) and ensure a course is loaded."); return; }
     const chapterNumInput = document.getElementById('admin-assign-chapter-num'); const chapterNum = parseInt(chapterNumInput?.value); const courseDef = globalCourseDataMap.get(currentLoadedPlaylistCourseId);
     if (!chapterNumInput || isNaN(chapterNum) || chapterNum < 1 || (courseDef && chapterNum > courseDef.totalChapters)) { alert(`Enter a valid chapter number (1-${courseDef?.totalChapters || '?'}).`); chapterNumInput?.focus(); return; }
     showLoading(`Assigning ${selectedVideosForAssignment.length} video(s) to Chapter ${chapterNum}...`);
     try {
          const currentCourseData = globalCourseDataMap.get(currentLoadedPlaylistCourseId) || (await db.collection('courses').doc(currentLoadedPlaylistCourseId).get()).data() || {};
          const chapterResources = { ...(currentCourseData.chapterResources || {}) }; chapterResources[chapterNum] = chapterResources[chapterNum] || {};
          let currentLectures = (chapterResources[chapterNum].lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title);
          let addedCount = 0;
          selectedVideosForAssignment.forEach(video => { const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`; if (!currentLectures.some(lec => lec.url === videoUrl)) { currentLectures.push({ url: videoUrl, title: video.title }); addedCount++; } });
          if (addedCount === 0) { hideLoading(); alert("Selected video(s) are already assigned."); return; }
          chapterResources[chapterNum].lectureUrls = currentLectures;
          const success = await updateCourseDefinition(currentLoadedPlaylistCourseId, { chapterResources });
          if (success) {
               hideLoading(); alert(`${addedCount} video(s) assigned to Ch ${chapterNum}.`);
               selectedVideosForAssignment = []; updateSelectedVideoCount(); document.querySelectorAll('#admin-playlist-videos-area input[type="checkbox"]:checked').forEach(cb => { cb.checked = false; cb.closest('li')?.classList.remove('ring-2', 'ring-primary-500'); });
          } else hideLoading();
     } catch (error) { hideLoading(); console.error(`Error assigning videos:`, error); alert(`Failed to assign videos: ${error.message}`); }
}
window.handleAssignVideoToChapterInternal = handleAssignVideoToChapterInternal; // Assign internal for button
async function handleUnassignVideoFromChapterInternal() { // Internal function called by button
     if (selectedVideosForAssignment.length === 0 || !currentLoadedPlaylistCourseId) { alert("Please select video(s) to unassign."); return; }
     const chapterNumInput = document.getElementById('admin-assign-chapter-num'); const chapterNum = parseInt(chapterNumInput?.value); const courseDef = globalCourseDataMap.get(currentLoadedPlaylistCourseId);
     if (!chapterNumInput || isNaN(chapterNum) || chapterNum < 1 || (courseDef && chapterNum > courseDef.totalChapters)) { alert(`Enter a valid chapter number (1-${courseDef?.totalChapters || '?'}) to unassign from.`); chapterNumInput?.focus(); return; }
     if (!confirm(`Unassign ${selectedVideosForAssignment.length} video(s) from Chapter ${chapterNum}?`)) return;
     showLoading(`Unassigning videos from Chapter ${chapterNum}...`);
     try {
          const currentCourseData = globalCourseDataMap.get(currentLoadedPlaylistCourseId) || (await db.collection('courses').doc(currentLoadedPlaylistCourseId).get()).data() || {};
          const chapterResources = { ...(currentCourseData.chapterResources || {}) };
          if (!chapterResources[chapterNum]?.lectureUrls) { hideLoading(); alert("No videos assigned to this chapter."); return; }
          let currentLectures = chapterResources[chapterNum].lectureUrls.filter(lec => typeof lec === 'object' && lec.url && lec.title);
          const selectedUrlsToRemove = selectedVideosForAssignment.map(v => `https://www.youtube.com/watch?v=${v.videoId}`); let removedCount = 0;
          const updatedLectures = currentLectures.filter(lec => { if (selectedUrlsToRemove.includes(lec.url)) { removedCount++; return false; } return true; });
          if (removedCount === 0) { hideLoading(); alert("Selected video(s) not found in this chapter."); return; }
          chapterResources[chapterNum].lectureUrls = updatedLectures;
          const success = await updateCourseDefinition(currentLoadedPlaylistCourseId, { chapterResources });
          if (success) {
               hideLoading(); alert(`${removedCount} video(s) unassigned from Ch ${chapterNum}.`);
               selectedVideosForAssignment = []; updateSelectedVideoCount(); document.querySelectorAll('#admin-playlist-videos-area input[type="checkbox"]:checked').forEach(cb => { cb.checked = false; cb.closest('li')?.classList.remove('ring-2', 'ring-primary-500'); });
          } else hideLoading();
     } catch (error) { hideLoading(); console.error(`Error unassigning videos:`, error); alert(`Failed to unassign videos: ${error.message}`); }
}
window.handleUnassignVideoFromChapterInternal = handleUnassignVideoFromChapterInternal; // Assign internal for button


// Helper Functions (Keep existing ones like findUserId)
async function findUserId(searchTerm) { let targetUserId = null; const lowerSearchTerm = searchTerm.toLowerCase(); if (searchTerm.includes('@')) { const userQuery = await db.collection('users').where('email', '==', lowerSearchTerm).limit(1).get(); if (!userQuery.empty) targetUserId = userQuery.docs[0].id; } else { const userDoc = await db.collection('users').doc(searchTerm).get(); if (userDoc.exists) targetUserId = userDoc.id; } return targetUserId; }

async function handleAdminReply(feedbackId, recipientUserId, replyText) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) { 
        alert("Action requires admin privileges."); 
        return; 
    }
    showLoading("Sending reply...");
    // Ensure recipientUid is defined before sending
    if (!recipientUserId) {
        hideLoading();
        alert("Error: Recipient User ID is missing for this feedback.");
        return;
    }
    const success = await sendAdminReply(recipientUserId, `Reply regarding feedback ${feedbackId}`, replyText, currentUser);
    if (success) {
        try {
            await db.collection('feedback').doc(feedbackId).update({ status: 'replied', replyText: replyText });
            console.log(`Feedback ${feedbackId} status updated to replied.`); 
            alert("Reply sent successfully!");
            loadAdminSection('feedback'); // Refresh the feedback section
        } catch (updateError) { 
            console.error("Error updating feedback status:", updateError); 
            alert("Reply sent, but failed to update feedback status."); 
        }
    }
    hideLoading();
}

// --- END OF MODIFIED FILE ui_admin_dashboard.js ---