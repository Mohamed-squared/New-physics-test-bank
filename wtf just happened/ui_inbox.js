// ui_inbox.js

// Import db and currentUser from state.js
import { db, currentUser } from './state.js';
import { displayContent, clearContent } from './ui_core.js';
import { showLoading, hideLoading } from './utils.js';
// Import markMessageAsRead from firestore module
import { markMessageAsRead } from './firebase_firestore.js';

// --- User Inbox UI ---

export function showInbox() {
    if (!currentUser) {
        displayContent('<p class="text-red-500 p-4">Please log in to view your inbox.</p>');
        return;
    }
    clearContent();
    displayContent(`
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 class="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">Your Inbox</h2>
            <div id="inbox-content-area">
                <p>Loading messages...</p>
            </div>
        </div>
    `);
    loadInboxMessages();
    setActiveSidebarLink('showInbox');
}

async function loadInboxMessages() {
    const inboxContentArea = document.getElementById('inbox-content-area');
    if (!inboxContentArea || !currentUser) return; // Check currentUser here too

    showLoading("Loading messages...");
    try {
        const messagesSnapshot = await db.collection('users').doc(currentUser.uid).collection('inbox')
                                        .orderBy('timestamp', 'desc')
                                        .limit(50)
                                        .get();
        hideLoading();

        if (messagesSnapshot.empty) {
            inboxContentArea.innerHTML = '<p>Your inbox is empty.</p>';
            const unreadBadge = document.getElementById('inbox-unread-count');
            if (unreadBadge) unreadBadge.classList.add('hidden');
            return;
        }

        let messagesHtml = '<div class="space-y-3">';
        let unreadCount = 0;
        messagesSnapshot.forEach(doc => {
            const message = doc.data();
            const messageId = doc.id;
            const date = message.timestamp ? new Date(message.timestamp.toDate()).toLocaleString() : 'N/A';
            const isUnread = !message.isRead;
            if (isUnread) unreadCount++;

            messagesHtml += `
                <details class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600 group"
                         data-message-id="${messageId}"
                         ${isUnread ? 'data-needs-mark-read="true"' : ''}
                         ontoggle="if (this.open && this.dataset.needsMarkRead === 'true') { window.handleMarkRead('${messageId}', this); }">
                    <summary class="flex justify-between items-center cursor-pointer list-none">
                        <div class="flex-grow">
                             <span class="font-medium ${isUnread ? 'text-black dark:text-white' : 'text-gray-700 dark:text-gray-300'}">${message.subject || 'No Subject'}</span>
                             <span class="block text-xs text-gray-500 dark:text-gray-400">From: ${message.senderName || 'System'} - ${date}</span>
                        </div>
                        ${isUnread ? '<span class="text-xs font-bold text-red-500 mr-2 inbox-new-badge">NEW</span>' : ''}
                        <svg class="w-5 h-5 text-gray-500 dark:text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </summary>
                    <div class="mt-3 pt-3 border-t dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200">
                        <p>${message.body ? message.body.replace(/\n/g, '<br>') : 'No content.'}</p>
                    </div>
                </details>
            `;
        });
        messagesHtml += '</div>';
        inboxContentArea.innerHTML = messagesHtml;

        const unreadBadge = document.getElementById('inbox-unread-count');
        if (unreadBadge) {
            unreadBadge.textContent = unreadCount;
            unreadBadge.classList.toggle('hidden', unreadCount === 0);
        }

    } catch (error) {
        console.error("Error loading inbox messages:", error);
        hideLoading();
        inboxContentArea.innerHTML = `<p class="text-red-500">Error loading messages: ${error.message}</p>`;
        const unreadBadge = document.getElementById('inbox-unread-count');
        if (unreadBadge) unreadBadge.classList.add('hidden');
    }
}

// MODIFIED: Check currentUser before calling markMessageAsRead
// Needs to be exported so it can be assigned to window in script.js
export async function handleMarkRead(messageId, detailsElement) {
    // Check if user is logged in before proceeding
    if (!currentUser) {
        console.error("Cannot mark message as read: User not logged in.");
        // Optionally close the details element again if needed
        // detailsElement.open = false;
        return;
    }

    console.log("Marking message as read:", messageId);
    // Pass the currentUser object
    const success = await markMessageAsRead(messageId, currentUser);
    if (success) {
        const summary = detailsElement.querySelector('summary');
        summary?.querySelector('.inbox-new-badge')?.remove();
        summary?.querySelector('.font-medium')?.classList.remove('text-black', 'dark:text-white');
        summary?.querySelector('.font-medium')?.classList.add('text-gray-700', 'dark:text-gray-300');
        detailsElement.dataset.needsMarkRead = 'false';

         const unreadBadge = document.getElementById('inbox-unread-count');
         if (unreadBadge) {
             let currentCount = parseInt(unreadBadge.textContent) || 0;
             currentCount = Math.max(0, currentCount - 1);
             unreadBadge.textContent = currentCount;
             unreadBadge.classList.toggle('hidden', currentCount === 0);
         }
    } else {
        console.warn("Failed to mark message as read in Firestore, UI not updated immediately.");
    }
}