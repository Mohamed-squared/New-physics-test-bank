// --- START OF FILE ui_chat.js ---

import { db, currentUser } from './state.js'; // Import currentUser
import { escapeHtml, showLoading, hideLoading } from './utils.js';
import { ADMIN_UID, DEFAULT_PROFILE_PIC_URL } from './config.js'; // Ensure ADMIN_UID and DEFAULT_PROFILE_PIC_URL are exported

const CHAT_COLLECTION = 'globalChatMessages';
const MESSAGES_LIMIT = 50; // Load/Listen to the latest 50 messages
let unsubscribeChat = null; // To hold the Firestore listener unsubscribe function

/**
 * Renders a single chat message into an HTML string.
 * Styles messages from the current user differently.
 * Adds a delete button visible only to the message owner or an admin.
 * Includes sender's profile picture.
 * @param {object} messageData - Object containing { senderId, senderName, senderPhotoURL, text, timestamp }
 * @param {string} messageId - The Firestore document ID of the message.
 * @returns {string} - HTML string for the message.
 */
function renderChatMessage(messageData, messageId) {
    if (!messageData) {
        console.warn("renderChatMessage called with invalid messageData for ID:", messageId);
        return ''; // Avoid rendering errors
    }

    const currentUid = currentUser?.uid; // Use currentUser from state
    const isAdmin = currentUid === ADMIN_UID;
    const isOwner = currentUid === messageData.senderId;

    // Determine message alignment and background for the inner bubble
    const messageBg = isOwner ? 'bg-blue-100 dark:bg-blue-900/60' : 'bg-gray-100 dark:bg-gray-700';

    // Format timestamp
    const timestamp = messageData.timestamp?.toDate ? messageData.timestamp.toDate() : new Date(); // Handle Firestore Timestamp
    const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Escape sender name and message text
    const senderName = escapeHtml(messageData.senderName || 'Anonymous');
    // Replace newlines in text with <br> for display, after escaping
    const messageText = escapeHtml(messageData.text).replace(/\n/g, '<br>');

    // Delete button HTML (only if owner or admin)
    let deleteButtonHtml = '';
    if (isOwner || isAdmin) {
        // Use window.deleteChatMessage since this HTML is injected
        deleteButtonHtml = `
            <button
                onclick="window.deleteChatMessage('${escapeHtml(messageId)}')"
                class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 text-xs opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity duration-150 ml-2 focus:outline-none focus:ring-1 focus:ring-red-500 rounded-full p-0.5"
                title="Delete Message">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        `;
    }

    // Get sender photo URL, fallback to default
    const photoURL = escapeHtml(messageData.senderPhotoURL || DEFAULT_PROFILE_PIC_URL);

    // Outer container using flex for image + bubble alignment
    return `
        <div class="chat-message-container flex items-start gap-2 mb-2 ${isOwner ? 'justify-end' : 'justify-start'}" data-message-id="${messageId}">
            <!-- Profile Picture (Order changes based on owner) -->
            <img src="${photoURL}"
                 alt="${senderName}'s avatar"
                 class="w-10 h-10 rounded-full flex-shrink-0 ${isOwner ? 'order-2' : 'order-1'}" // MODIFIED: Increased size to w-10 h-10, removed mt-1
                 onerror="this.onerror=null; this.src='${DEFAULT_PROFILE_PIC_URL}';">

            <!-- Inner Content Bubble (Shrinks/Grows) -->
            <div class="group flex-shrink min-w-0 ${isOwner ? 'order-1' : 'order-2'} ${messageBg} p-2 rounded-lg w-fit max-w-[80%] md:max-w-[70%]">
                <div class="flex justify-between items-center mb-1 text-xs">
                    <span class="font-semibold text-gray-700 dark:text-gray-300 truncate pr-2 ${isOwner ? 'text-right w-full' : ''}">${senderName}</span>
                    ${!isOwner ? `
                    <div class="flex items-center flex-shrink-0">
                        <span class="text-gray-500 dark:text-gray-400">${formattedTime}</span>
                        ${deleteButtonHtml}
                    </div>
                    ` : ''}
                </div>
                <p class="text-sm text-gray-800 dark:text-gray-200 break-words">${messageText}</p>
                ${isOwner ? `
                <div class="flex items-center justify-end mt-1 text-xs">
                    <span class="text-gray-500 dark:text-gray-400">${formattedTime}</span>
                    ${deleteButtonHtml}
                </div>
                `: ''}
            </div>
        </div>
    `;
}


/**
 * Fetches and renders the initial batch of chat messages. (Less critical with onSnapshot).
 * @param {HTMLElement} chatContentElement - The DOM element to render messages into.
 */
async function loadChatMessages(chatContentElement) {
    // This function is usually called *after* the user is confirmed logged in
    // and the chat modal is shown, so an explicit currentUser check here
    // is less critical than in the user-initiated actions (show, send, delete).
    // The subscribeToChatMessages handles the real-time updates and has its own checks.
    if (!db) {
        console.error("[loadChatMessages] Chat Error: Firestore DB not initialized");
        chatContentElement.innerHTML = '<p class="text-center text-muted p-4">Error loading chat.</p>';
        return;
    }
    console.log("[loadChatMessages] Loading initial chat messages...");
    // Clear previous content immediately before loading
    chatContentElement.innerHTML = `<div class="text-center p-4">
                                        <div class="loader inline-block"></div>
                                        <p class="text-muted text-sm mt-2">Loading messages...</p>
                                     </div>`;


    try {
        // Get the last N messages ordered by time
        const snapshot = await db.collection(CHAT_COLLECTION)
                           .orderBy('timestamp', 'desc')
                           .limit(MESSAGES_LIMIT)
                           .get();

        chatContentElement.innerHTML = ''; // Clear loading indicator

        if (snapshot.empty) {
            chatContentElement.innerHTML = '<p class="text-center text-muted p-4">No messages yet. Start the conversation!</p>';
        } else {
            // Reverse the array to display oldest first within the initial load
            const messages = snapshot.docs.reverse();
            messages.forEach(doc => {
                chatContentElement.innerHTML += renderChatMessage(doc.data(), doc.id);
            });
            // Scroll to the bottom after loading
            chatContentElement.scrollTop = chatContentElement.scrollHeight;
        }
        console.log(`[loadChatMessages] Loaded ${snapshot.size} initial messages.`);
    } catch (error) {
        console.error("[loadChatMessages] Error loading chat messages:", error);
        // Check if the error is likely a permission issue
        if (error.code === 'permission-denied' && !currentUser) {
             chatContentElement.innerHTML = `<p class="text-center text-danger p-4">Please log in to view chat messages.</p>`;
        } else {
             chatContentElement.innerHTML = `<p class="text-center text-danger p-4">Error loading messages: ${escapeHtml(error.message)}</p>`;
        }
    }
}

/**
 * Sends a new chat message to Firestore.
 * @param {string} textInputId - The ID of the input field containing the message text.
 */
export async function sendChatMessage(textInputId) {
    const inputElement = document.getElementById(textInputId);
    if (!inputElement) {
        console.error("[sendChatMessage] Chat Error: Input element not found:", textInputId);
        return;
    }
    const messageText = inputElement.value.trim();

    // --- Ensure currentUser check is present ---
    if (!db || !currentUser) {
        console.error("[sendChatMessage] Chat Error: Firestore DB or current user not available.");
        alert("Cannot send message: Not logged in or DB error.");
        return; // Stop execution if not logged in or DB error
    }
    if (!messageText) {
        console.log("[sendChatMessage] Chat Info: Empty message, not sending.");
        return; // Don't send empty messages
    }
    if (messageText.length > 1000) { // Basic length check
        alert("Message is too long (max 1000 characters).");
        return;
    }

    const sendButton = document.getElementById('send-chat-btn'); // Get the send button
    inputElement.disabled = true; // Prevent double sending
    if (sendButton) sendButton.disabled = true;

    console.log(`[sendChatMessage] Attempting to send message as user: ${currentUser.uid}`);
    try {
        // MODIFIED: Define variable for photo URL and log it
        const photoUrlToSave = currentUser.photoURL || DEFAULT_PROFILE_PIC_URL;
        console.log(`[sendChatMessage] Saving message with senderPhotoURL: ${photoUrlToSave}`);

        await db.collection(CHAT_COLLECTION).add({
            senderId: currentUser.uid, // Use currentUser from state
            senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User', // Use display name or fallback
            senderPhotoURL: photoUrlToSave, // MODIFIED: Use the defined variable
            text: messageText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // Use server timestamp
        });
        console.log("[sendChatMessage] Chat message sent successfully.");
        inputElement.value = ''; // Clear input on success
    } catch (error) {
        console.error("[sendChatMessage] Error sending chat message:", error);
        alert(`Failed to send message: ${error.message}`);
    } finally {
        inputElement.disabled = false; // Re-enable input
         if (sendButton) sendButton.disabled = false;
        inputElement.focus();
    }
}

/**
 * Deletes a specific chat message from Firestore.
 * Requires confirmation and checks for owner/admin permissions.
 * @param {string} messageId - The Firestore document ID of the message to delete.
 */
export async function deleteChatMessage(messageId) {
    // --- Ensure currentUser check is present ---
    if (!db || !currentUser) {
        console.error("[deleteChatMessage] Chat Error: Firestore DB or current user not available for delete.");
        alert("Cannot delete message: Not logged in or DB error.");
        return; // Stop execution if not logged in or DB error
    }
    if (!messageId) {
        console.error("[deleteChatMessage] Chat Error: Message ID missing for deletion.");
        return;
    }

    console.log(`[deleteChatMessage] User ${currentUser.uid} attempting to delete message: ${messageId}`);
    const messageRef = db.collection(CHAT_COLLECTION).doc(messageId);

    try {
        const doc = await messageRef.get();
        if (!doc.exists) {
            console.warn("[deleteChatMessage] Chat Warning: Message to delete not found:", messageId);
            alert("Message already deleted or does not exist.");
            // Attempt to remove from UI just in case (use the container)
            const elementToRemove = document.querySelector(`.chat-message-container[data-message-id="${messageId}"]`);
            if (elementToRemove) elementToRemove.remove();
            return;
        }

        const messageData = doc.data();
        const isOwner = currentUser.uid === messageData.senderId; // Use currentUser from state
        const isAdmin = currentUser.uid === ADMIN_UID; // Use currentUser from state

        if (!isOwner && !isAdmin) {
            console.error(`[deleteChatMessage] Permission denied for user ${currentUser.uid} to delete message ${messageId} owned by ${messageData.senderId}`);
            alert("You do not have permission to delete this message.");
            return;
        }

        // Confirmation
        if (!confirm("Are you sure you want to delete this message? This cannot be undone.")) {
             console.log("[deleteChatMessage] Delete cancelled by user.");
            return;
        }

        console.log(`[deleteChatMessage] Proceeding with delete for message ${messageId} by user ${currentUser.uid} (isOwner: ${isOwner}, isAdmin: ${isAdmin})`);
        showLoading("Deleting message...");
        await messageRef.delete();
        hideLoading();
        console.log("[deleteChatMessage] Chat message deleted successfully:", messageId);
        // The onSnapshot listener should handle removing it from the UI automatically.
        // If needed, manually remove element (fallback):
        const elementToRemove = document.querySelector(`.chat-message-container[data-message-id="${messageId}"]`);
        if (elementToRemove) {
            console.log("[deleteChatMessage] Manually removing deleted message element from UI (fallback).");
            elementToRemove.remove();
        }

    } catch (error) {
        hideLoading();
        console.error("[deleteChatMessage] Error deleting chat message:", error);
        alert(`Failed to delete message: ${error.message}`);
    }
}


/**
 * Subscribes to real-time updates for chat messages using onSnapshot.
 * @param {HTMLElement} chatContentElement - The DOM element to render messages into.
 * @returns {function} - The unsubscribe function for the listener.
 */
function subscribeToChatMessages(chatContentElement) {
    // The primary check for currentUser happens in showGlobalChat before this is called.
    // However, adding a check here provides fallback safety.
    if (!db || !currentUser) {
        console.error("[subscribeToChatMessages] Chat Error: Firestore DB or current user not available for subscription.");
        chatContentElement.innerHTML = '<p class="text-center text-muted p-4">Error connecting to chat (Auth issue).</p>';
        return () => { console.log("[subscribeToChatMessages] Chat subscription NOP (DB or Auth missing).") }; // Return a no-op function
    }
    // --- Added diagnostic log before query ---
    console.log(`[subscribeToChatMessages] Attempting query. User verified: ${currentUser.uid}`);

    // Query for the last N messages ordered by time
    const query = db.collection(CHAT_COLLECTION)
        .orderBy('timestamp', 'desc')
        .limit(MESSAGES_LIMIT);

    unsubscribeChat = query.onSnapshot(snapshot => {
        console.log(`[subscribeToChatMessages] Chat snapshot received: ${snapshot.docChanges().length} changes. Total docs in snapshot: ${snapshot.size}.`);
        let hasMessages = false; // Flag to check if any messages exist

        // Get docs, sort them back into ascending order for display
        const messages = snapshot.docs
            .map(doc => ({ id: doc.id, data: doc.data() }))
            .sort((a, b) => (a.data.timestamp?.toMillis() || 0) - (b.data.timestamp?.toMillis() || 0)); // ASC for display

        if (messages.length > 0) {
             hasMessages = true;
             // Build the HTML string first
             let messagesHtml = '';
             messages.forEach(msg => {
                 messagesHtml += renderChatMessage(msg.data, msg.id);
             });
             chatContentElement.innerHTML = messagesHtml; // Set innerHTML once

             // Scroll to bottom after rendering changes
             // Use requestAnimationFrame for smoother scroll after render
             requestAnimationFrame(() => {
                  const isScrolledToBottom = chatContentElement.scrollHeight - chatContentElement.clientHeight <= chatContentElement.scrollTop + 50; // Allow some tolerance
                  // Only scroll if user was already near the bottom
                  if (isScrolledToBottom) {
                      chatContentElement.scrollTop = chatContentElement.scrollHeight;
                  }
             });
        }

        // Display 'no messages' text only if the snapshot is truly empty
        if (!hasMessages) {
            console.log("[subscribeToChatMessages] Snapshot empty, displaying 'no messages'.");
            chatContentElement.innerHTML = '<p class="text-center text-muted p-4">No messages yet. Start the conversation!</p>';
        }

    }, error => {
        console.error("[subscribeToChatMessages] Error in chat subscription:", error);
         // Check if the error is likely a permission issue
        if (error.code === 'permission-denied') {
            const userStateMsg = currentUser ? `User still appears logged in (UID: ${currentUser.uid})` : "User appears logged out.";
            console.error(`[subscribeToChatMessages] Permission Denied Error. ${userStateMsg}`);
            chatContentElement.innerHTML = `<p class="text-center text-danger p-4">Chat connection error (permissions). Please ensure you are logged in. ${!currentUser ? 'You seem to be logged out.' : ''}</p>`;
        } else {
            chatContentElement.innerHTML = `<p class="text-center text-danger p-4">Error listening for messages: ${escapeHtml(error.message)}</p>`;
        }
        // Optionally attempt to unsubscribe on error
        if (unsubscribeChat) {
             console.log("[subscribeToChatMessages] Unsubscribing chat due to error.");
             unsubscribeChat();
             unsubscribeChat = null;
        }
    });

    console.log("[subscribeToChatMessages] Subscription initiated.");
    return unsubscribeChat; // Return the function to allow unsubscribing later
}

/**
 * Creates and displays the global chat modal.
 */
export function showGlobalChat() {
    // --- Added detailed logging and enhanced auth check ---
    console.log(`[showGlobalChat] Function called. Timestamp: ${new Date().toISOString()}`);
    // Log the state of currentUser *immediately* upon function entry
    console.log(`[showGlobalChat] Current user state (from state.js) upon entry:`, currentUser ? currentUser.uid : 'null');

    // Authentication Check (Ensure this is right after the logs)
    if (!currentUser) {
        console.warn("[showGlobalChat] User not logged in. Preventing chat display and subscription.");
        alert("Please log in to use the chat.");
        // Clean up any existing modal just in case one was somehow left open
        document.getElementById('global-chat-modal')?.remove();
        // Unsubscribe if somehow a listener was attached previously without a user
        if (unsubscribeChat) {
             console.log("[showGlobalChat] Unsubscribing stale chat listener because user is null.");
             unsubscribeChat();
             unsubscribeChat = null;
        }
        return; // Stop execution if not logged in
    }
    // --- End of auth check modification ---


    // Close any existing modal first
    const existingModal = document.getElementById('global-chat-modal');
    if (existingModal) {
        console.log("[showGlobalChat] Closing existing chat modal before opening new one.");
        // Simulate clicking its close button to trigger unsubscribe etc.
        const closeBtn = existingModal.querySelector('#close-chat-btn');
        if (closeBtn) {
            closeBtn.click(); // This should trigger the closeChat function attached below
        } else {
            // Force remove if no button found (shouldn't happen normally)
            existingModal.remove();
            if (unsubscribeChat) {
                 console.warn("[showGlobalChat] Force unsubscribing chat listener during modal cleanup (no close button found).");
                 unsubscribeChat();
                 unsubscribeChat = null;
            }
        }
    }

    console.log(`[showGlobalChat] Proceeding to show global chat modal for user: ${currentUser.uid}`);

    // Use Tailwind classes for styling
    const modalHtml = `
        <div id="global-chat-modal" class="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-50 p-0 animate-fade-in">
            <div class="bg-white dark:bg-gray-800 shadow-xl w-full h-full flex flex-col">
                <!-- Header -->
                <div class="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h3 class="text-lg font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-2">
                       <!-- Light Mode Logo Placeholder (Replace with actual SVG) -->
                       <svg class="logo-light-mode w-5 h-5 mr-2 inline-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                         <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clip-rule="evenodd" />
                       </svg>
                       <!-- Dark Mode Logo Placeholder (Replace with actual SVG) -->
                       <svg class="logo-dark-mode w-5 h-5 mr-2 inline-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clip-rule="evenodd" />
                       </svg>
                       Global Chat
                    </h3>
                    <button id="close-chat-btn" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800" title="Close Chat">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Chat Content Area -->
                <div id="global-chat-content" class="flex-grow overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    <!-- Messages dynamically loaded here -->
                    <div class="text-center p-4">
                        <div class="loader inline-block"></div>
                        <p class="text-muted text-sm mt-2">Connecting to chat...</p>
                    </div>
                </div>

                <!-- Input Area -->
                <div class="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <form id="chat-send-form" class="flex items-center space-x-2">
                        <input type="text" id="global-chat-input" placeholder="Type your message (Enter to send)" class="flex-grow" autocomplete="off" maxlength="1000">
                        <button type="submit" id="send-chat-btn" class="btn-primary flex-shrink-0 px-3 py-2" title="Send Message">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                            <span class="sr-only">Send</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const chatContentElement = document.getElementById('global-chat-content');
    const chatInputElement = document.getElementById('global-chat-input');
    const sendForm = document.getElementById('chat-send-form');
    const closeButton = document.getElementById('close-chat-btn');
    const chatModalElement = document.getElementById('global-chat-modal'); // Get the modal element itself

    // Function to close the chat and clean up
    const closeChat = () => {
        console.log("[closeChat] Function called.");
        if (unsubscribeChat) {
            console.log("[closeChat] Unsubscribing from chat messages.");
            unsubscribeChat(); // Call the unsubscribe function returned by onSnapshot
            unsubscribeChat = null; // Clear the variable
        } else {
            console.log("[closeChat] No active chat subscription found to unsubscribe.");
        }
        if (chatModalElement) {
            console.log("[closeChat] Removing chat modal element.");
            chatModalElement.remove(); // Remove the modal from the DOM
        } else {
             console.log("[closeChat] Chat modal element already removed or not found.");
        }
        // Remove escape key listener when chat is closed
        console.log("[closeChat] Removing Esc key listener.");
        document.removeEventListener('keydown', handleEscKey);
    };

    // Subscribe to updates (this also handles initial load implicitly via snapshot)
    // Check for currentUser is done before calling this, and inside subscribeToChatMessages itself
    // unsubscribeChat is assigned *inside* subscribeToChatMessages
    console.log("[showGlobalChat] Calling subscribeToChatMessages...");
    unsubscribeChat = subscribeToChatMessages(chatContentElement); // Assign the returned unsub function

    // Attach event listeners
    sendForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Check for currentUser is inside sendChatMessage
        sendChatMessage('global-chat-input');
    });

    closeButton.addEventListener('click', closeChat);

    // Optional: Close modal on Escape key press
    const handleEscKey = (event) => {
        if (event.key === 'Escape') {
            console.log("[handleEscKey] Escape key pressed, closing chat.");
            closeChat();
            // Listener is removed in closeChat()
        }
    };
    console.log("[showGlobalChat] Adding Esc key listener.");
    document.addEventListener('keydown', handleEscKey);

    // Focus input field after a short delay for modal animation
    setTimeout(() => {
        if (document.getElementById('global-chat-input')) { // Check if element still exists
             chatInputElement?.focus();
             console.log("[showGlobalChat] Focused chat input.");
        } else {
             console.log("[showGlobalChat] Chat input not found for focusing (modal might have closed quickly).");
        }
    }, 150);

    // Add CSS for logo visibility (if not already present globally)
    // This ensures the logos switch with the theme.
    const styleId = 'chat-logo-styles';
    if (!document.getElementById(styleId)) {
        const logoStyle = document.createElement('style');
        logoStyle.id = styleId;
        logoStyle.textContent = `
            html:not(.dark) .logo-dark-mode { display: none; }
            html:not(.dark) .logo-light-mode { display: inline-block; }
            html.dark .logo-light-mode { display: none; }
            html.dark .logo-dark-mode { display: inline-block; }
        `;
        document.head.appendChild(logoStyle);
        console.log("[showGlobalChat] Added chat logo visibility styles.");
    }

    // Make the deleteChatMessage function globally accessible for the inline onclick handler
    // Check for currentUser is inside deleteChatMessage
    window.deleteChatMessage = deleteChatMessage;
    console.log("[showGlobalChat] Chat modal setup complete.");
}

// --- END OF FILE ui_chat.js ---