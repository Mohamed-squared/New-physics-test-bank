// --- START OF FILE admin_moderation.js ---

import { db, currentUser } from './state.js';
import { escapeHtml, showLoading, hideLoading } from './utils.js';
import { sendAdminReply, deleteAllFeedbackMessages, deleteAllExamIssues } from './firebase_firestore.js'; // Assuming these exist or will be created

// This function is responsible for rendering the "Moderation" section
// within the admin panel.
export function displayFeedbackSection(containerElement) {
    containerElement.innerHTML = `
        <h3 class="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-6">Content Moderation</h3>
        <section class="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
            <h4 class="text-lg font-medium mb-3">Recent Feedback & Exam Issues</h4>
            <div id="admin-feedback-issues-area" class="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                <p class="text-muted text-sm">Loading feedback and issues...</p>
            </div>
            <div class="flex gap-2 mt-3">
                <button onclick="window.loadFeedbackForAdmin()" class="btn-secondary-small text-xs">Refresh Lists</button>
                <button onclick="window.confirmDeleteAllFeedbackAndIssues()" class="btn-danger-small text-xs">Delete ALL Feedback & Issues</button>
            </div>
        </section>
    `;
    loadFeedbackForAdmin();
}

// This function now loads both feedback and examIssues
export async function loadFeedbackForAdmin() {
    const feedbackArea = document.getElementById('admin-feedback-issues-area');
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

        let combinedItems = [];
        feedbackSnapshot.forEach(doc => combinedItems.push({ id: doc.id, type: 'feedback', data: doc.data() }));
        issuesSnapshot.forEach(doc => combinedItems.push({ id: doc.id, type: 'examIssue', data: doc.data() }));

        // Sort combined items by timestamp (descending)
        combinedItems.sort((a, b) => (b.data.timestamp?.toDate() || 0) - (a.data.timestamp?.toDate() || 0));

        let combinedHtml = '<div class="space-y-3">';
        combinedItems.forEach(item => {
            const data = item.data;
            const id = item.id;
            const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : 'N/A';
            const collectionName = item.type === 'feedback' ? 'feedback' : 'examIssues';
            const status = data.status || 'new';
            const statusClass = status === 'new' ? 'bg-yellow-100 dark:bg-yellow-900/80 border-yellow-300 dark:border-yellow-700' : status === 'replied' ? 'bg-green-100 dark:bg-green-900/80 border-green-300 dark:border-green-700' : 'bg-gray-100 dark:bg-gray-700/80 border-gray-300 dark:border-gray-600';
            const statusText = status === 'new' ? 'New' : status === 'replied' ? 'Replied' : (status || 'Unknown');
            const senderName = escapeHtml(data.username || 'Unknown User');

            const itemTypeLabel = item.type === 'feedback' ? 'Feedback' : 'Exam Issue';
            const itemTypeColor = item.type === 'feedback' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';

            combinedHtml += `
                <div class="${statusClass} p-3 rounded-lg border shadow-sm text-sm">
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-bold text-xs px-2 py-0.5 rounded ${itemTypeColor}">${itemTypeLabel}</span>
                        <span class="text-xs font-semibold px-2 py-0.5 rounded ${statusText === 'New' ? 'bg-yellow-500 text-white' : statusText === 'Replied' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}">${statusText}</span>
                    </div>
                    <p class="text-xs font-mono text-gray-500 dark:text-gray-400 break-all mb-1">ID: ${id}</p>
                    <p><strong>From:</strong> ${senderName} (ID: ${data.userId || 'N/A'})</p>
                    <p><strong>Subject Context:</strong> ${escapeHtml(data.subjectId || 'N/A')}</p>
                    <p><strong>Question Context:</strong> ${escapeHtml(data.questionId || 'N/A')}</p>
                    ${data.context ? `<p><strong>Report Context:</strong> ${escapeHtml(data.context)}</p>` : ''}
                    <p><strong>Date:</strong> ${date}</p>
                    <p class="bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-500 mt-1 whitespace-pre-wrap text-xs">${escapeHtml(data.feedbackText || 'No text')}</p>
                    ${data.replyText ? `<p class="mt-2 pt-2 border-t dark:border-gray-600 text-xs"><strong>Admin Reply:</strong> ${escapeHtml(data.replyText)}</p>` : ''}
                    <div class="mt-2 text-right space-x-1">
                        ${status !== 'replied' ? `<button onclick="window.promptAdminFeedbackReply('${collectionName}', '${id}', '${data.userId}')" class="btn-secondary-small text-xs">Reply</button>` : ''}
                        <button onclick="window.confirmDeleteFeedbackItem('${collectionName}', '${id}')" class="btn-danger-small text-xs" title="Delete this message">Delete</button>
                    </div>
                </div>
            `;
        });

        combinedHtml += '</div>';
        feedbackArea.innerHTML = combinedHtml;

    } catch (error) {
        console.error("Error loading feedback/issues for admin:", error);
        feedbackArea.innerHTML = `<p class="text-red-500 text-sm">Error loading items: ${error.message}</p>`;
    }
}

// Wrapper for promptAdminReply
export function promptAdminReply(collectionName, itemId, recipientUserId) { // Renamed for clarity
    if (!currentUser || !currentUser.isAdmin) {
        alert("Action requires admin privileges.");
        return;
    }
    const replyText = prompt(`Enter reply for item ID ${itemId} (in ${collectionName}):`);
    if (replyText && replyText.trim()) {
        handleAdminFeedbackReply(collectionName, itemId, recipientUserId, replyText.trim());
    } else if (replyText !== null) {
        alert("Reply cannot be empty.");
    }
}

async function handleAdminFeedbackReply(collectionName, itemId, recipientUserId, replyText) {
    if (!currentUser || !currentUser.isAdmin) {
        alert("Action requires admin privileges."); return;
    }
    showLoading("Sending reply...");
    const subject = `Reply regarding ${collectionName === 'feedback' ? 'Feedback' : 'Exam Issue'} ${itemId}`;
    const success = await sendAdminReply(recipientUserId, subject, replyText, currentUser); // from firebase_firestore
    if (success) {
        try {
            await db.collection(collectionName).doc(itemId).update({
                status: 'replied',
                replyText: replyText,
                repliedBy: currentUser.uid,
                repliedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("Reply sent and item status updated!");
            loadFeedbackForAdmin(); // Refresh
        } catch (updateError) {
            console.error(`Error updating ${collectionName} status:`, updateError);
            alert(`Reply sent, but failed to update item status.`);
        }
    } // sendAdminReply already alerts on its failure
    hideLoading();
}

// Wrapper for confirmDeleteItem
export function confirmDeleteItem(collectionName, itemId) { // Renamed for clarity
    if (!currentUser || !currentUser.isAdmin) { alert("Admin privileges required."); return; }
    const itemTypeName = collectionName === 'feedback' ? 'feedback message' : 'exam issue report';
    if (confirm(`Are you sure you want to permanently delete this ${itemTypeName} (ID: ${itemId})? This cannot be undone.`)) {
        handleDeleteDbItem(collectionName, itemId);
    }
}

async function handleDeleteDbItem(collectionName, itemId) {
    if (!currentUser || !currentUser.isAdmin || !itemId || !collectionName) return;
    showLoading(`Deleting item from ${collectionName}...`);
    let success = false;
    try {
        await db.collection(collectionName).doc(itemId).delete();
        success = true;
    } catch (error) {
        console.error(`Error deleting item ${itemId} from ${collectionName}:`, error);
        alert(`Failed to delete item: ${error.message}`);
    }
    hideLoading();
    if (success) {
        alert("Item deleted.");
        loadFeedbackForAdmin(); // Refresh
    }
}

// New combined delete function
export async function confirmDeleteAllFeedbackAndIssues() {
    if (!currentUser || !currentUser.isAdmin) {
        alert("Admin privileges required.");
        return;
    }
    if (confirm("⚠️ WARNING: This will permanently delete ALL feedback messages AND exam issue reports. This action cannot be undone. Are you absolutely sure?")) {
        showLoading("Deleting all feedback & issues...");
        try {
            const [feedbackCount, issuesCount] = await Promise.all([
                deleteAllFeedbackMessages(), // from firebase_firestore
                deleteAllExamIssues()      // from firebase_firestore
            ]);
            alert(`Successfully deleted:\n- ${feedbackCount} feedback messages\n- ${issuesCount} exam issues`);
            loadFeedbackForAdmin(); // Refresh
        } catch (error) {
            alert(`Failed to delete all items: ${error.message}`);
        } finally {
            hideLoading();
        }
    }
}
// --- END OF FILE admin_moderation.js ---