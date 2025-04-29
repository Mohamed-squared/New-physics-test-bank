// --- START OF FILE ui_inbox.js ---

// ui_inbox.js

// Import db and currentUser from state.js
import { db, currentUser } from './state.js';
import { displayContent, clearContent, setActiveSidebarLink } from './ui_core.js'; // Added setActiveSidebarLink
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Added escapeHtml
// Import markMessageAsRead and submitFeedback from firestore module
import { markMessageAsRead, submitFeedback, sendAdminReply } from './firebase_firestore.js'; // Added sendAdminReply
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
                <button onclick="window.showContactAdminForm()" class="btn-secondary-small flex items-center">
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
        <!-- MODAL for composing message -->
        <div id="compose-message-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[60] hidden p-4" aria-labelledby="compose-modal-title" role="dialog" aria-modal="true">
             <form id="compose-message-form" class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 w-full max-w-lg transform transition-all overflow-hidden">
                <h3 id="compose-modal-title" class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4">Send Message to Admin</h3>
                <input type="hidden" id="reply-to-message-id"> <!-- Hidden field for reply context -->
                <div class="space-y-4">
                     <div>
                          <label for="compose-subject">Subject</label>
                          <input type="text" id="compose-subject" required>
                     </div>
                     <div>
                          <label for="compose-body">Message</label>
                          <textarea id="compose-body" rows="6" required class="min-h-[150px]"></textarea>
                     </div>
                </div>
                <div class="mt-5 sm:mt-6 flex flex-col sm:flex-row gap-3">
                     <button type="submit" class="btn-primary w-full sm:flex-1">Send Message</button>
                     <button type="button" onclick="closeComposeModal()" class="btn-secondary w-full sm:flex-1 mt-2 sm:mt-0">Cancel</button>
                 </div>
             </form>
        </div>
    `);
    loadInboxMessages();
    setActiveSidebarLink('showInbox', 'sidebar-standard-nav');

    // Attach listener to the form
    document.getElementById('compose-message-form')?.addEventListener('submit', handleSendMessageSubmit);
}

async function loadInboxMessages() {
    const inboxContentArea = document.getElementById('inbox-content-area');
    if (!inboxContentArea || !currentUser) return; // Check currentUser here too

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
            const senderName = isAdminSender ? 'Admin' : (message.senderName || 'System'); // Assume non-admin sender is System or has senderName
            const canReply = isAdminSender; // Allow reply only to messages FROM Admin

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
                        <!-- Add Reply button if applicable -->
                        ${canReply ? `<div class="mt-3 text-right"><button onclick="window.showContactAdminForm('Re: ${escapeHtml(message.subject || '')}', '${messageId}')" class="btn-secondary-small text-xs">Reply to Admin</button></div>` : ''}
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

// --- NEW: Contact Admin Form UI ---
export function showContactAdminForm(subject = '', replyToId = null) {
     if (!currentUser) {
         alert("Please log in to contact the admin.");
         return;
     }
     const modal = document.getElementById('compose-message-modal');
     const subjectInput = document.getElementById('compose-subject');
     const bodyInput = document.getElementById('compose-body');
     const replyToInput = document.getElementById('reply-to-message-id');

     if (modal && subjectInput && bodyInput && replyToInput) {
         subjectInput.value = subject || '';
         bodyInput.value = ''; // Clear body
         replyToInput.value = replyToId || ''; // Store ID if it's a reply
         modal.classList.remove('hidden');
         subjectInput.focus();
     } else {
         console.error("Compose message modal elements not found.");
     }
}
window.showContactAdminForm = showContactAdminForm;

export function closeComposeModal() {
     const modal = document.getElementById('compose-message-modal');
     if (modal) {
         modal.classList.add('hidden');
         // Optional: Clear form fields on close
         // document.getElementById('compose-subject').value = '';
         // document.getElementById('compose-body').value = '';
         // document.getElementById('reply-to-message-id').value = '';
     }
}

async function handleSendMessageSubmit(event) {
     event.preventDefault();
     if (!currentUser) return;

     const subject = document.getElementById('compose-subject').value.trim();
     const message = document.getElementById('compose-body').value.trim();
     const replyToId = document.getElementById('reply-to-message-id').value; // Check if it's a reply

     if (!subject || !message) {
         alert("Subject and Message cannot be empty.");
         return;
     }

     showLoading("Sending message...");

     // If replying, use sendAdminReply (from user perspective, sending TO admin)
     // If composing new, use submitFeedback (as it goes to the feedback collection)
     let success = false;
     if (replyToId) {
          // This is a USER replying TO an ADMIN message. The logic in `sendAdminReply`
          // assumes the sender is admin. We need a different mechanism for user->admin replies
          // that perhaps also go to the feedback collection for admin review.
          // Let's use submitFeedback for user->admin messages for now.
          console.log(`User replying to message ${replyToId}. Sending as feedback.`);
          const feedbackData = {
               subjectId: "Inbox Reply",
               questionId: replyToId, // Store original message ID for context
               feedbackText: `Subject: ${subject}\n\nMessage:\n${message}`,
               context: "Inbox reply from user"
           };
           success = await submitFeedback(feedbackData, currentUser);

           // Optional: Mark the original message as 'replied to' by the user? (Requires new field)

     } else {
          // This is a NEW message from the user TO the admin. Use submitFeedback.
          const feedbackData = {
               subjectId: "Direct Contact",
               questionId: null,
               feedbackText: `Subject: ${subject}\n\nMessage:\n${message}`,
               context: "Direct contact message from inbox"
           };
          success = await submitFeedback(feedbackData, currentUser);
     }


     hideLoading();
     if (success) {
         alert("Your message has been sent to the admin.");
         closeComposeModal();
         document.getElementById('compose-message-form').reset(); // Clear form
     } else {
         alert("Failed to send message. Please try again.");
     }
}


// --- END OF FILE ui_inbox.js ---