// ui_admin_dashboard.js

// Import db and currentUser from state.js
import { db, currentUser } from './state.js';
import { displayContent, clearContent } from './ui_core.js';
import { showLoading, hideLoading } from './utils.js';
// Import sendAdminReply from firestore module
import { sendAdminReply } from './firebase_firestore.js';
import { ADMIN_UID } from './config.js';

// --- Admin Dashboard UI ---

export function showAdminDashboard() {
    if (currentUser?.uid !== ADMIN_UID) {
        displayContent('<p class="text-red-500 p-4">Access Denied. Admin privileges required.</p>');
        return;
    }
    clearContent();
    displayContent(`
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 class="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400">Admin Dashboard</h2>
            <div id="admin-content-area">
                <p>Loading admin data...</p>
            </div>
        </div>
    `);
    loadFeedbackForAdmin();
    setActiveSidebarLink('showAdminDashboard');
}

async function loadFeedbackForAdmin() {
    const adminContentArea = document.getElementById('admin-content-area');
    if (!adminContentArea) return;

    showLoading("Loading feedback...");
    try {
        const feedbackSnapshot = await db.collection('feedback')
                                         .orderBy('timestamp', 'desc')
                                         .limit(50)
                                         .get();
        hideLoading();

        if (feedbackSnapshot.empty) {
            adminContentArea.innerHTML = '<p>No feedback messages found.</p>';
            return;
        }

        let feedbackHtml = '<h3 class="text-lg font-medium mb-3">Recent Feedback Messages</h3><div class="space-y-3">';
        feedbackSnapshot.forEach(doc => {
            const feedback = doc.data();
            const feedbackId = doc.id;
            const date = feedback.timestamp ? new Date(feedback.timestamp.toDate()).toLocaleString() : 'N/A';
            const statusClass = feedback.status === 'new' ? 'bg-yellow-100 dark:bg-yellow-900' : feedback.status === 'replied' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-700';
            const statusText = feedback.status === 'new' ? 'New' : feedback.status === 'replied' ? 'Replied' : (feedback.status || 'Unknown');

            feedbackHtml += `
                <div class="${statusClass} p-4 rounded-lg border dark:border-gray-600 shadow-sm">
                    <div class="flex justify-between items-center mb-2">
                         <span class="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">${feedbackId}</span>
                         <span class="text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0 ${
                            statusText === 'New' ? 'bg-yellow-500 text-white' : statusText === 'Replied' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                        }">${statusText}</span>
                    </div>
                    <p class="text-sm mb-1"><strong>From:</strong> ${feedback.username || 'Unknown User'} (ID: ${feedback.userId})</p>
                    <p class="text-sm mb-1"><strong>Subject:</strong> ${feedback.subjectId || 'N/A'}</p>
                    <p class="text-sm mb-1"><strong>Question:</strong> ${feedback.questionId || 'N/A'}</p>
                    <p class="text-sm mb-1"><strong>Date:</strong> ${date}</p>
                    <p class="text-sm bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-500 mt-1 whitespace-pre-wrap">${feedback.feedbackText || 'No text'}</p>
                    ${feedback.replyText ? `<p class="text-sm mt-2 pt-2 border-t dark:border-gray-600"><strong>Admin Reply:</strong> ${feedback.replyText}</p>` : ''}
                    <div class="mt-3 text-right">
                        ${feedback.status !== 'replied' ? `<button onclick="window.promptAdminReply('${feedbackId}', '${feedback.userId}')" class="btn-secondary-small">Reply</button>` : ''}
                        <!-- Add buttons for other actions like 'Mark as Addressed', 'Delete' if needed -->
                    </div>
                </div>
            `;
        });
        feedbackHtml += '</div>';
        adminContentArea.innerHTML = feedbackHtml;

    } catch (error) {
        console.error("Error loading feedback for admin:", error);
        hideLoading();
        adminContentArea.innerHTML = `<p class="text-red-500">Error loading feedback: ${error.message}</p>`;
    }
}

// Needs to be exported to be assigned to window in script.js
export function promptAdminReply(feedbackId, recipientUserId) {
    const replyText = prompt(`Enter reply for feedback ID ${feedbackId}:`);
    if (replyText && replyText.trim()) {
        handleAdminReply(feedbackId, recipientUserId, replyText.trim());
    } else if (replyText !== null) {
        alert("Reply cannot be empty.");
    }
}

// MODIFIED: Added check for currentUser before calling sendAdminReply
async function handleAdminReply(feedbackId, recipientUserId, replyText) {
    // Check if the current user is the admin before proceeding
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Action requires admin privileges.");
        return;
    }

    showLoading("Sending reply...");
    // Pass the currentUser object (known to be the admin) to sendAdminReply
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
    // Failure alert is handled within sendAdminReply
    hideLoading();
}