// --- START OF FILE ui_inbox.js ---

// ui_inbox.js

// Import db and currentUser from state.js
import { db, currentUser } from './state.js';
import { displayContent, clearContent, setActiveSidebarLink } from './ui_core.js'; // Added setActiveSidebarLink
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Added escapeHtml
// Import markMessageAsRead and submitFeedback from firestore module
import { markMessageAsRead, submitFeedback } from './firebase_firestore.js';
import { ADMIN_UID } from './config.js'; // Import Admin UID

// --- User Inbox UI ---

export function showInbox() {
    if (!currentUser) {
        displayContent('<p class="text-red-500 p-4">Please log in to view your inbox.</p>');
        setActiveSidebarLink('showInbox', 'sidebar-standard-nav');
        return;
    }
    clearContent();
    displayContent(`
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div class="flex justify-between items-center mb-4 pb-4 border-b dark:border-gray-700">
                <h2 class="text-xl font-semibold text-blue-600 dark:text-blue-400">Your Inbox</h2>
                <button onclick="window.promptContactAdmin()" class="btn-secondary-small flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 mr-1">
                      <path fill-rule="evenodd" d="M2.5 3A1.5 1.5 0 0 0 1 4.5v11A1.5 1.5 0 0 0 2.5 17h15a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 17.5 3h-15Zm11.25 8.75c.414 0 .75.336.75.75s-.336.75-.75.75h-5.5a.75.75 0 0 1 0-1.5h5.5Zm0-3c.414 0 .75.336.75.75s-.336.75-.75.75h-5.5a.75.75 0 0 1 0-1.5h5.5Zm-5.5-3A.75.75 0 0 0 7.5 7h5a.75.75 0 0 0 0-1.5h-5A.75.75 0 0 0 7.5 6Z" clip-rule="evenodd" />
                    </svg>
                    Contact Admin
                </button>
            </div>
            <div id="inbox-content-area">
                <p class="text-center text-muted p-4">Loading messages...</p>
                <div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
            </div>
        </div>
    `);
    loadInboxMessages();
    setActiveSidebarLink('showInbox', 'sidebar-standard-nav');
}

async function loadInboxMessages() {
    const inboxContentArea = document.getElementById('inbox-content-area');
    if (!inboxContentArea || !currentUser) return; // Check currentUser here too

    // No separate loading indicator needed as showLoading is not called here
    // Rely on the placeholder text in the HTML structure

    try {
        const messagesSnapshot = await db.collection('users').doc(currentUser.uid).collection('inbox')
                                        .orderBy('timestamp', 'desc')
                                        .limit(50)
                                        .get();

        if (messagesSnapshot.empty) {
            inboxContentArea.innerHTML = '<p class="text-center text-muted italic py-6">Your inbox is empty.</p>';
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
            const senderName = message.senderId === ADMIN_UID ? 'Admin' : (message.senderName || 'System');

            messagesHtml += `
                <details class="bg-gray-50 dark:bg-gray-700/60 p-4 rounded-lg border dark:border-gray-600 group shadow-sm hover:shadow transition-shadow duration-150"
                         data-message-id="${messageId}"
                         ${isUnread ? 'data-needs-mark-read="true"' : ''}
                         ontoggle="if (this.open && this.dataset.needsMarkRead === 'true') { window.handleMarkRead('${messageId}', this); }">
                    <summary class="flex justify-between items-center cursor-pointer list-none -m-1 p-1">
                        <div class="flex-grow mr-2">
                             <span class="font-medium ${isUnread ? 'text-black dark:text-white' : 'text-gray-700 dark:text-gray-300'}">${escapeHtml(message.subject || 'No Subject')}</span>
                             <span class="block text-xs text-gray-500 dark:text-gray-400">From: ${escapeHtml(senderName)} - ${date}</span>
                        </div>
                        ${isUnread ? '<span class="text-xs font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full mr-2 inbox-new-badge flex-shrink-0">NEW</span>' : ''}
                        <svg class="w-5 h-5 text-gray-500 dark:text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </summary>
                    <div class="mt-3 pt-3 border-t dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                        <p>${message.body ? message.body.replace(/\n/g, '<br>') : 'No content.'}</p>
                    </div>
                </details>
            `;
        });
        messagesHtml += '</div>';
        inboxContentArea.innerHTML = messagesHtml;

        const unreadBadge = document.getElementById('inbox-unread-count');
        if (unreadBadge) {
            unreadBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            unreadBadge.classList.toggle('hidden', unreadCount === 0);
        }

    } catch (error) {
        console.error("Error loading inbox messages:", error);
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
             // Use > 9 logic for display consistency
             if (unreadBadge.textContent === '9+') {
                  // If it was 9+, we can't know the exact count, just decrement visually maybe?
                  // Or just leave it as 9+ until a full reload happens. Let's leave it.
                  console.log("Unread count was 9+, leaving as is after marking one read.");
             } else if (currentCount > 0) {
                 currentCount = Math.max(0, currentCount - 1);
                 unreadBadge.textContent = currentCount;
                 unreadBadge.classList.toggle('hidden', currentCount === 0);
             }
         }
    } else {
        console.warn("Failed to mark message as read in Firestore, UI not updated immediately.");
    }
}

// --- NEW: Contact Admin Feature ---
export function promptContactAdmin() {
    if (!currentUser) {
         alert("Please log in to contact the admin.");
         return;
     }

     const subject = prompt("Enter a brief subject for your message to the admin:");
     if (subject === null) return; // User cancelled
     if (!subject.trim()) {
         alert("Subject cannot be empty.");
         return;
     }

     const message = prompt(`Enter your message for the admin (Subject: ${subject}):`);
     if (message === null) return; // User cancelled
     if (!message.trim()) {
         alert("Message cannot be empty.");
         return;
     }

     handleContactAdmin(subject.trim(), message.trim());
}
window.promptContactAdmin = promptContactAdmin; // Assign to window

async function handleContactAdmin(subject, message) {
    if (!currentUser) return; // Should be checked already, but safeguard

    showLoading("Sending message...");
    // Use the submitFeedback function, but mark it clearly as a direct contact
    const feedbackData = {
         subjectId: "Direct Contact", // Special identifier
         questionId: null,
         feedbackText: `Subject: ${subject}\n\nMessage:\n${message}`,
         context: "Direct contact message from inbox"
     };

    const success = await submitFeedback(feedbackData, currentUser);
    hideLoading();
    if (success) {
        alert("Your message has been sent to the admin.");
    } else {
        alert("Failed to send message. Please try again.");
    }
}


// --- END OF FILE ui_inbox.js ---