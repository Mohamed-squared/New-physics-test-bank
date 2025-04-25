// ui_admin_dashboard.js

import { db, currentUser} from './state.js'; // Added ADMIN_UID
import { ADMIN_UID } from './config.js';
import { displayContent, clearContent, setActiveSidebarLink } from './ui_core.js'; // Added setActiveSidebarLink
import { showLoading, hideLoading } from './utils.js';
import { sendAdminReply } from './firebase_firestore.js';

// --- Admin Dashboard UI ---

export function showAdminDashboard() {
    if (currentUser?.uid !== ADMIN_UID) {
        displayContent('<p class="text-red-500 p-4">Access Denied. Admin privileges required.</p>');
        return;
    }
    clearContent();
    displayContent(`
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-8">
            <h2 class="text-xl font-semibold text-indigo-600 dark:text-indigo-400">Admin Dashboard</h2>

            <!-- Feedback Section -->
            <div>
                <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">Recent Feedback Messages</h3>
                <div id="admin-feedback-area">
                    <p class="text-muted">Loading feedback...</p>
                </div>
            </div>

            <!-- Course Management Section -->
            <div>
                <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">Course Management (Pending/Reported)</h3>
                 <div id="admin-courses-area">
                    <p class="text-muted">Loading courses requiring attention...</p>
                </div>
            </div>
        </div>
    `);
    loadFeedbackForAdmin();
    loadCoursesForAdmin(); // New function call
    setActiveSidebarLink('showAdminDashboard');
}

// --- Feedback ---
async function loadFeedbackForAdmin() {
    const feedbackArea = document.getElementById('admin-feedback-area');
    if (!feedbackArea) return;
    feedbackArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;

    try {
        const feedbackSnapshot = await db.collection('feedback')
                                         .orderBy('timestamp', 'desc')
                                         .limit(50)
                                         .get();

        if (feedbackSnapshot.empty) {
            feedbackArea.innerHTML = '<p class="text-sm text-muted">No feedback messages found.</p>';
            return;
        }

        let feedbackHtml = '<div class="space-y-3">';
        feedbackSnapshot.forEach(doc => {
            const feedback = doc.data();
            const feedbackId = doc.id;
            const date = feedback.timestamp ? new Date(feedback.timestamp.toDate()).toLocaleString() : 'N/A';
            const statusClass = feedback.status === 'new' ? 'bg-yellow-100 dark:bg-yellow-900/80' : feedback.status === 'replied' ? 'bg-green-100 dark:bg-green-900/80' : 'bg-gray-100 dark:bg-gray-700/80';
             const statusText = feedback.status === 'new' ? 'New' : feedback.status === 'replied' ? 'Replied' : (feedback.status || 'Unknown');
             // *** ADDED Admin Icon if sender is admin (less likely for feedback, but for consistency) ***
             const senderName = feedback.username || 'Unknown User';
             const isAdminSender = feedback.userId === ADMIN_UID;
             const adminIconHtml = isAdminSender ? `<svg class="admin-icon w-3 h-3 inline-block ml-1 text-yellow-500 dark:text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" clip-rule="evenodd" /></svg>` : '';

            feedbackHtml += `
                <div class="${statusClass} p-3 rounded-lg border dark:border-gray-600 shadow-sm text-sm">
                    <div class="flex justify-between items-center mb-1">
                         <span class="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">${feedbackId}</span>
                         <span class="text-xs font-semibold px-2 py-0.5 rounded ${
                            statusText === 'New' ? 'bg-yellow-500 text-white' : statusText === 'Replied' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                        }">${statusText}</span>
                    </div>
                    <p><strong>From:</strong> ${senderName}${adminIconHtml} (ID: ${feedback.userId})</p>
                    <p><strong>Subject:</strong> ${feedback.subjectId || 'N/A'}</p>
                    <p><strong>Question:</strong> ${feedback.questionId || 'N/A'}</p>
                    <p><strong>Date:</strong> ${date}</p>
                    <p class="bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-500 mt-1 whitespace-pre-wrap text-xs">${feedback.feedbackText || 'No text'}</p>
                    ${feedback.replyText ? `<p class="mt-2 pt-2 border-t dark:border-gray-600 text-xs"><strong>Admin Reply:</strong> ${feedback.replyText}</p>` : ''}
                    <div class="mt-2 text-right">
                        ${feedback.status !== 'replied' ? `<button onclick="window.promptAdminReply('${feedbackId}', '${feedback.userId}')" class="btn-secondary-small text-xs">Reply</button>` : ''}
                    </div>
                </div>
            `;
        });
        feedbackHtml += '</div>';
        feedbackArea.innerHTML = feedbackHtml;

    } catch (error) {
        console.error("Error loading feedback for admin:", error);
        feedbackArea.innerHTML = `<p class="text-red-500 text-sm">Error loading feedback: ${error.message}</p>`;
    }
}

export function promptAdminReply(feedbackId, recipientUserId) {
    // ... (function remains the same) ...
    const replyText = prompt(`Enter reply for feedback ID ${feedbackId}:`);
    if (replyText && replyText.trim()) {
        handleAdminReply(feedbackId, recipientUserId, replyText.trim());
    } else if (replyText !== null) {
        alert("Reply cannot be empty.");
    }
}

async function handleAdminReply(feedbackId, recipientUserId, replyText) {
    // ... (check currentUser, call sendAdminReply, update feedback status) ...
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
    }
    hideLoading();
}

// --- Course Management ---
async function loadCoursesForAdmin() {
    const coursesArea = document.getElementById('admin-courses-area');
    if (!coursesArea) return;
    coursesArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;

    try {
        // Query for courses that are either 'pending' or 'reported'
        const coursesSnapshot = await db.collection('courses')
                                          .where('status', 'in', ['pending', 'reported'])
                                          .orderBy('createdAt', 'desc') // Show newest pending/reported first
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
             // *** ADDED Admin Icon for creator ***
             const creatorName = course.creatorName || 'Unknown';
             const isAdminCreator = course.creatorUid === ADMIN_UID;
             const adminIconHtml = isAdminCreator ? `<svg class="admin-icon w-3 h-3 inline-block ml-1 text-yellow-500 dark:text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" clip-rule="evenodd" /></svg>` : '';


            coursesHtml += `
                <div class="course-card border rounded-lg p-3 shadow-sm text-sm ${statusClass}">
                     <div class="flex justify-between items-center mb-2">
                         <h4 class="font-semibold text-base text-primary-700 dark:text-primary-300">${course.name || 'Unnamed Course'}</h4>
                         <span class="text-xs font-bold px-2 py-0.5 rounded ${
                             course.status === 'pending' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                         }">${statusText}</span>
                     </div>
                     <p><strong>Creator:</strong> ${creatorName}${adminIconHtml} (ID: ${course.creatorUid})</p>
                     <p><strong>Date:</strong> ${date}</p>
                     <p><strong>Major:</strong> ${course.majorTag || 'N/A'} | <strong>Subject:</strong> ${course.subjectTag || 'N/A'}</p>
                     ${course.status === 'reported' ? `<p class="text-xs mt-1"><strong>Report Reason:</strong> ${course.reportReason || 'None provided.'}</p><p class="text-xs"><strong>Reported By:</strong> ${course.reportedBy?.length || 0} user(s)</p>` : ''}
                     <div class="mt-3 pt-2 border-t dark:border-gray-600 text-right space-x-2">
                          <!-- Common View Details Button -->
                          <button onclick="window.showCourseDetails('${courseId}')" class="btn-secondary-small text-xs">View Details</button>
                         ${course.status === 'pending' ? `
                             <button onclick="window.handleCourseApproval('${courseId}', true)" class="btn-success-small text-xs">Approve</button>
                             <button onclick="window.handleCourseApproval('${courseId}', false)" class="btn-danger-small text-xs">Reject</button>
                         ` : ''}
                          ${course.status === 'reported' ? `
                             <button onclick="window.handleCourseApproval('${courseId}', true)" class="btn-success-small text-xs">Approve (Clear Report)</button>
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
        coursesArea.innerHTML = `<p class="text-red-500 text-sm">Error loading courses: ${error.message}</p>`;
    }
}