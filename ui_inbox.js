// --- START OF FILE ui_inbox.js ---

// ui_inbox.js

// Import db and currentUser from state.js
import { db, currentUser } from './state.js';
import { displayContent, clearContent, setActiveSidebarLink } from './ui_core.js'; // Added setActiveSidebarLink
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Added escapeHtml
// Import markMessageAsRead and submitFeedback from firestore module
import { markMessageAsRead, submitFeedback, deleteInboxMessage } from './firebase_firestore.js';
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
                <!-- MODIFIED: Button opens modal -->
                <button onclick="window.showContactAdminModal()" class="btn-secondary-small flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 mr-1">
                        <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
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
            const isAdminSender = message.senderId === ADMIN_UID;
            const senderName = isAdminSender ? 'Admin' : (message.senderName || 'System'); // Assuming senderName is stored for non-admin replies now

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
                        <div class="mt-3 text-right space-x-2">
                            ${isAdminSender ? `
                                <button onclick="window.showReplyToAdminModal('${messageId}', '${escapeHtml(message.subject)}')" class="btn-secondary-small text-xs flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5 mr-1"><path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.56l2.72 2.72a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 1.06L5.56 9.25H16.25A.75.75 0 0 1 17 10Z" clip-rule="evenodd" /></svg>
                                    Reply to Admin
                                </button>
                            ` : ''}
                            <button onclick="window.confirmDeleteInboxMessage('${messageId}')" class="btn-danger-small text-xs flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.326.419C2.675 4.793 2 5.51 2 6.318V15.75A2.25 2.25 0 0 0 4.25 18h11.5A2.25 2.25 0 0 0 18 15.75V6.318c0-.808-.675-1.525-1.674-1.699a18.17 18.17 0 0 0-2.326-.419v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" /></svg>
                                Delete
                            </button>
                        </div>
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

                 // Update the inbox link notification dot
                 const inboxLink = document.getElementById('sidebar-inbox-link');
                 if (inboxLink && currentCount === 0) {
                     inboxLink.classList.remove('has-unread');
                 }
             }
         }
    } else {
        console.warn("Failed to mark message as read in Firestore, UI not updated immediately.");
    }
}

// --- MODIFIED: Contact Admin Feature ---

// Shows a modal for contacting the admin
export function showContactAdminModal() {
    if (!currentUser) {
        alert("Please log in to contact the admin.");
        return;
    }
    // Remove existing modal first
    document.getElementById('contact-admin-modal')?.remove();

    const modalHtml = `
        <div id="contact-admin-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 animate-fade-in" aria-labelledby="contact-admin-title" role="dialog" aria-modal="true">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg transform transition-all">
                <div class="flex justify-between items-center mb-4">
                    <h3 id="contact-admin-title" class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Contact Admin</h3>
                    <button onclick="document.getElementById('contact-admin-modal').remove()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">×</button>
                </div>
                <form id="contact-admin-form" onsubmit="window.handleSendAdminMessage(event)" class="space-y-4">
                    <div>
                        <label for="contact-subject" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                        <input type="text" id="contact-subject" required class="mt-1 w-full">
                    </div>
                    <div>
                        <label for="contact-message" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
                        <textarea id="contact-message" required rows="5" class="mt-1 w-full"></textarea>
                    </div>
                    <div class="flex justify-end gap-3 pt-2">
                        <button type="button" onclick="document.getElementById('contact-admin-modal').remove()" class="btn-secondary">Cancel</button>
                        <button type="submit" class="btn-primary">Send Message</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('contact-subject')?.focus();
}

// Handles sending the message from the modal
async function handleSendAdminMessage(event) {
    event.preventDefault();
    if (!currentUser) return;

    const subjectInput = document.getElementById('contact-subject');
    const messageInput = document.getElementById('contact-message');
    if (!subjectInput || !messageInput) return;

    const subject = subjectInput.value.trim();
    const message = messageInput.value.trim();

    if (!subject || !message) {
        alert("Subject and message cannot be empty.");
        return;
    }

    document.getElementById('contact-admin-modal')?.remove(); // Close modal immediately
    showLoading("Sending message...");
    // Use submitFeedback function
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

// --- NEW: Reply to Admin ---

// Shows modal for replying to a specific admin message
export function showReplyToAdminModal(originalMessageId, originalSubject) {
    if (!currentUser) {
        alert("Please log in to reply.");
        return;
    }
    // Remove existing modal first
    document.getElementById('reply-admin-modal')?.remove();

    const replySubject = `Re: ${originalSubject || 'Previous Message'}`;

    const modalHtml = `
        <div id="reply-admin-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 animate-fade-in" aria-labelledby="reply-admin-title" role="dialog" aria-modal="true">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg transform transition-all">
                <div class="flex justify-between items-center mb-4">
                    <h3 id="reply-admin-title" class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Reply to Admin</h3>
                    <button onclick="document.getElementById('reply-admin-modal').remove()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">×</button>
                </div>
                <form id="reply-admin-form" onsubmit="window.handleSendReplyToAdmin(event, '${originalMessageId}', '${escapeHtml(replySubject)}')" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                        <p class="mt-1 text-sm text-gray-800 dark:text-gray-200 p-2 bg-gray-100 dark:bg-gray-700 rounded border dark:border-gray-600">${escapeHtml(replySubject)}</p>
                    </div>
                    <div>
                        <label for="reply-message" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Reply</label>
                        <textarea id="reply-message" required rows="5" class="mt-1 w-full"></textarea>
                    </div>
                    <div class="flex justify-end gap-3 pt-2">
                        <button type="button" onclick="document.getElementById('reply-admin-modal').remove()" class="btn-secondary">Cancel</button>
                        <button type="submit" class="btn-primary">Send Reply</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('reply-message')?.focus();
}

// Handles sending the reply
async function handleSendReplyToAdmin(event, originalMessageId, subject) {
    event.preventDefault();
    if (!currentUser) return;

    const messageInput = document.getElementById('reply-message');
    if (!messageInput) return;

    const message = messageInput.value.trim();
    if (!message) {
        alert("Reply message cannot be empty.");
        return;
    }

    document.getElementById('reply-admin-modal')?.remove(); // Close modal immediately
    showLoading("Sending reply...");

    // Use submitFeedback function, adding context about the reply
    const feedbackData = {
         subjectId: "User Reply", // Special identifier
         questionId: null,
         feedbackText: `Subject: ${subject}\n\nReply:\n${message}\n\n(In reply to admin message ID: ${originalMessageId})`,
         context: `User reply to admin message ${originalMessageId}`
     };

    const success = await submitFeedback(feedbackData, currentUser);
    hideLoading();
    if (success) {
        alert("Your reply has been sent to the admin.");
    } else {
        alert("Failed to send reply. Please try again.");
    }
}

// --- NEW: Delete Message ---
export function confirmDeleteInboxMessage(messageId) {
    if (!currentUser) {
        alert("Please log in to manage messages.");
        return;
    }
    if (confirm("Are you sure you want to delete this message? This action cannot be undone.")) {
        handleDeleteInboxMessage(messageId);
    }
}
window.confirmDeleteInboxMessage = confirmDeleteInboxMessage;

async function handleDeleteInboxMessage(messageId) {
    if (!currentUser) return;

    showLoading("Deleting message...");
    try {
        const success = await deleteInboxMessage(currentUser.uid, messageId);
        hideLoading();

        if (success) {
            // Remove the message element from the DOM
            const messageElement = document.querySelector(`details[data-message-id="${messageId}"]`);
            if (messageElement) {
                // Check if it was unread before removing
                const wasUnread = messageElement.dataset.needsMarkRead === 'true';
                messageElement.remove();

                // Update unread count if needed
                if (wasUnread) {
                    const unreadBadge = document.getElementById('inbox-unread-count');
                    if (unreadBadge) {
                        let currentCount = parseInt(unreadBadge.textContent) || 0;
                        if (unreadBadge.textContent === '9+') {
                            // Can't know exact count, leave as is
                            console.log("Unread count was 9+, leaving as is after deletion");
                        } else if (currentCount > 0) {
                            currentCount = Math.max(0, currentCount - 1);
                            unreadBadge.textContent = currentCount;
                            unreadBadge.classList.toggle('hidden', currentCount === 0);
                        }
                    }
                }
            }
            
            // Show success message
            const successMsgHtml = `<div class="toast-notification toast-success animate-fade-in"><p>Message deleted successfully.</p></div>`;
            const msgContainer = document.createElement('div');
            msgContainer.innerHTML = successMsgHtml;
            document.body.appendChild(msgContainer);
            setTimeout(() => { msgContainer.remove(); }, 4000);
        } else {
            throw new Error("Failed to delete message");
        }
    } catch (error) {
        hideLoading();
        console.error("Error deleting message:", error);
        alert(`Failed to delete message: ${error.message}`);
    }
}

// Add new functions to window scope
window.confirmDeleteInboxMessage = confirmDeleteInboxMessage;

// Assign new functions to window scope (done in script.js)
window.showContactAdminModal = showContactAdminModal;
window.handleSendAdminMessage = handleSendAdminMessage;
window.showReplyToAdminModal = showReplyToAdminModal;
window.handleSendReplyToAdmin = handleSendReplyToAdmin;

// --- END OF FILE ui_inbox.js ---