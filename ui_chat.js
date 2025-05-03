// --- START OF FILE ui_chat.js ---

import { db, currentUser } from './state.js';
import { escapeHtml, showLoading, hideLoading } from './utils.js';
import { ADMIN_UID } from './config.js'; // Ensure ADMIN_UID is exported from config.js

const CHAT_COLLECTION = 'globalChatMessages';
const MESSAGES_LIMIT = 50; // Load/Listen to the latest 50 messages
let unsubscribeChat = null; // To hold the Firestore listener unsubscribe function

/**
 * Renders a single chat message into an HTML string.
 * Styles messages from the current user differently.
 * Adds a delete button visible only to the message owner or an admin.
 * @param {object} messageData - Object containing { senderId, senderName, text, timestamp }
 * @param {string} messageId - The Firestore document ID of the message.
 * @returns {string} - HTML string for the message.
 */
function renderChatMessage(messageData, messageId) {
    if (!messageData) {
        console.warn("renderChatMessage called with invalid messageData for ID:", messageId);
        return ''; // Avoid rendering errors
    }

    const currentUid = currentUser?.uid;
    const isAdmin = currentUid === ADMIN_UID;
    const isOwner = currentUid === messageData.senderId;

    // Determine message alignment and background
    const messageAlignment = isOwner ? 'ml-auto' : 'mr-auto';
    const messageBg = isOwner ? 'bg-blue-100 dark:bg-blue-900/60' : 'bg-gray-100 dark:bg-gray-700';
    const messageClass = `chat-message p-2 rounded-lg mb-2 max-w-[85%] md:max-w-[75%] ${messageAlignment} ${messageBg}`;

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

    return `
        <div class="${messageClass} group" data-message-id="${messageId}">
            <div class="flex justify-between items-center mb-1 text-xs">
                <span class="font-semibold text-gray-700 dark:text-gray-300 truncate pr-2">${senderName}</span>
                <div class="flex items-center flex-shrink-0">
                   <span class="text-gray-500 dark:text-gray-400">${formattedTime}</span>
                   ${deleteButtonHtml}
                </div>
            </div>
            <p class="text-sm text-gray-800 dark:text-gray-200 break-words">${messageText}</p>
        </div>
    `;
}


/**
 * Fetches and renders the initial batch of chat messages. (Less critical with onSnapshot).
 * @param {HTMLElement} chatContentElement - The DOM element to render messages into.
 */
async function loadChatMessages(chatContentElement) {
    if (!db) {
        console.error("Chat Error: Firestore DB not initialized");
        chatContentElement.innerHTML = '<p class="text-center text-muted p-4">Error loading chat.</p>';
        return;
    }
    console.log("Loading initial chat messages...");
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
        console.log(`Loaded ${snapshot.size} initial messages.`);
    } catch (error) {
        console.error("Error loading chat messages:", error);
        chatContentElement.innerHTML = `<p class="text-center text-danger p-4">Error loading messages: ${escapeHtml(error.message)}</p>`;
    }
}

/**
 * Sends a new chat message to Firestore.
 * @param {string} textInputId - The ID of the input field containing the message text.
 */
export async function sendChatMessage(textInputId) {
    const inputElement = document.getElementById(textInputId);
    if (!inputElement) {
        console.error("Chat Error: Input element not found:", textInputId);
        return;
    }
    const messageText = inputElement.value.trim();

    if (!db || !currentUser) {
        console.error("Chat Error: Firestore DB or current user not available.");
        alert("Cannot send message: Not logged in or DB error.");
        return;
    }
    if (!messageText) {
        console.log("Chat Info: Empty message, not sending.");
        return; // Don't send empty messages
    }
    if (messageText.length > 1000) { // Basic length check
        alert("Message is too long (max 1000 characters).");
        return;
    }

    const sendButton = document.getElementById('send-chat-btn'); // Get the send button
    inputElement.disabled = true; // Prevent double sending
    if (sendButton) sendButton.disabled = true;

    try {
        await db.collection(CHAT_COLLECTION).add({
            senderId: currentUser.uid,
            senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User', // Use display name or fallback
            text: messageText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // Use server timestamp
        });
        console.log("Chat message sent successfully.");
        inputElement.value = ''; // Clear input on success
    } catch (error) {
        console.error("Error sending chat message:", error);
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
    if (!db || !currentUser) {
        console.error("Chat Error: Firestore DB or current user not available for delete.");
        alert("Cannot delete message: Not logged in or DB error.");
        return;
    }
    if (!messageId) {
        console.error("Chat Error: Message ID missing for deletion.");
        return;
    }

    const messageRef = db.collection(CHAT_COLLECTION).doc(messageId);

    try {
        const doc = await messageRef.get();
        if (!doc.exists) {
            console.warn("Chat Warning: Message to delete not found:", messageId);
            alert("Message already deleted or does not exist.");
            // Attempt to remove from UI just in case
            const elementToRemove = document.querySelector(`.chat-message[data-message-id="${messageId}"]`);
            if (elementToRemove) elementToRemove.remove();
            return;
        }

        const messageData = doc.data();
        const isOwner = currentUser.uid === messageData.senderId;
        const isAdmin = currentUser.uid === ADMIN_UID;

        if (!isOwner && !isAdmin) {
            console.error("Chat Error: Permission denied to delete message", messageId);
            alert("You do not have permission to delete this message.");
            return;
        }

        // Confirmation
        if (!confirm("Are you sure you want to delete this message? This cannot be undone.")) {
            return;
        }

        showLoading("Deleting message...");
        await messageRef.delete();
        hideLoading();
        console.log("Chat message deleted successfully:", messageId);
        // The onSnapshot listener should handle removing it from the UI automatically.
        // If needed, manually remove element (fallback):
        const elementToRemove = document.querySelector(`.chat-message[data-message-id="${messageId}"]`);
        if (elementToRemove) elementToRemove.remove();

    } catch (error) {
        hideLoading();
        console.error("Error deleting chat message:", error);
        alert(`Failed to delete message: ${error.message}`);
    }
}


/**
 * Subscribes to real-time updates for chat messages using onSnapshot.
 * @param {HTMLElement} chatContentElement - The DOM element to render messages into.
 * @returns {function} - The unsubscribe function for the listener.
 */
function subscribeToChatMessages(chatContentElement) {
    if (!db) {
        console.error("Chat Error: Firestore DB not initialized for subscription.");
        chatContentElement.innerHTML = '<p class="text-center text-muted p-4">Error connecting to chat.</p>';
        return () => { console.log("Chat subscription NOP (DB missing).") }; // Return a no-op function
    }
    console.log("Subscribing to chat messages...");

    // Query for the last N messages ordered by time
    const query = db.collection(CHAT_COLLECTION)
        .orderBy('timestamp', 'desc')
        .limit(MESSAGES_LIMIT);

    unsubscribeChat = query.onSnapshot(snapshot => {
        console.log(`Chat snapshot received: ${snapshot.docChanges().length} changes.`);
        chatContentElement.innerHTML = ''; // Clear and redraw is simple for now

        // Get docs, sort them back into ascending order for display
        const messages = snapshot.docs
            .map(doc => ({ id: doc.id, data: doc.data() }))
            .sort((a, b) => (a.data.timestamp?.toMillis() || 0) - (b.data.timestamp?.toMillis() || 0)); // ASC for display

        if (messages.length === 0) {
            chatContentElement.innerHTML = '<p class="text-center text-muted p-4">No messages yet. Start the conversation!</p>';
        } else {
            messages.forEach(msg => {
                chatContentElement.innerHTML += renderChatMessage(msg.data, msg.id);
            });
            // Scroll to bottom after rendering changes
            // Use requestAnimationFrame for smoother scroll after render
            requestAnimationFrame(() => {
                 chatContentElement.scrollTop = chatContentElement.scrollHeight;
            });
        }

    }, error => {
        console.error("Error in chat subscription:", error);
        chatContentElement.innerHTML = `<p class="text-center text-danger p-4">Error listening for messages: ${escapeHtml(error.message)}</p>`;
        // Optionally attempt to unsubscribe on error
        if (unsubscribeChat) {
             console.log("Unsubscribing chat due to error.");
             unsubscribeChat();
             unsubscribeChat = null;
        }
    });

    return unsubscribeChat; // Return the function to allow unsubscribing later
}

/**
 * Creates and displays the global chat modal.
 */
export function showGlobalChat() {
    // Close any existing modal first
    const existingModal = document.getElementById('global-chat-modal');
    if (existingModal) {
        console.log("Closing existing chat modal before opening new one.");
        // Simulate clicking its close button to trigger unsubscribe etc.
        const closeBtn = existingModal.querySelector('#close-chat-btn');
        if (closeBtn) {
            closeBtn.click();
        } else {
            // Force remove if no button found (shouldn't happen)
            existingModal.remove();
            if (unsubscribeChat) {
                 console.warn("Force unsubscribing chat listener.");
                 unsubscribeChat();
                 unsubscribeChat = null;
            }
        }
    }

    if (!currentUser) {
        alert("Please log in to use the chat.");
        return;
    }

    console.log("Showing global chat modal...");

    // Use Tailwind classes for styling
    const modalHtml = `
        <div id="global-chat-modal" class="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg h-[75vh] flex flex-col border border-gray-200 dark:border-gray-700">
                <!-- Header -->
                <div class="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h3 class="text-lg font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-2">
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-3.04 8.333-7.125 9.343A.75.75 0 0 1 13.125 21v-3.033a1.14 1.14 0 0 1 .768-1.075 47.838 47.838 0 0 0 5.339-3.771A.75.75 0 0 1 21 12Zm-18 0c0 4.556 3.04 8.333 7.125 9.343a.75.75 0 0 0 .75-.75v-3.033a1.14 1.14 0 0 0-.768-1.075 47.838 47.838 0 0 1-5.339-3.771 .75.75 0 0 0-1.518.924 49.335 49.335 0 0 0 7.125 4.97V21a.75.75 0 0 0 .75.75 11.21 11.21 0 0 0 7.875-9.75A11.25 11.25 0 0 0 12 3c-5.21 0-9.65 3.54-10.875 8.25a.75.75 0 0 1-1.35-.48c-1.533-5.402 1.74-10.77 7.225-10.77 5.486 0 10.75 4.368 10.75 10.75 0 5.485-4.368 10.75-10.75 10.75-5.485 0-10.75-4.368-10.75-10.75Z" /></svg>
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
        if (unsubscribeChat) {
            console.log("Unsubscribing from chat messages.");
            unsubscribeChat(); // Call the unsubscribe function returned by onSnapshot
            unsubscribeChat = null; // Clear the variable
        }
        if (chatModalElement) {
            chatModalElement.remove(); // Remove the modal from the DOM
        }
    };

    // Subscribe to updates (this also handles initial load implicitly via snapshot)
    unsubscribeChat = subscribeToChatMessages(chatContentElement);

    // Attach event listeners
    sendForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendChatMessage('global-chat-input');
    });

    closeButton.addEventListener('click', closeChat);

    // Optional: Close modal if clicking the background overlay
    chatModalElement.addEventListener('click', (event) => {
        // Check if the direct click target is the modal background itself
        if (event.target === chatModalElement) {
            closeChat();
        }
    });

    // Optional: Close modal on Escape key press
    const handleEscKey = (event) => {
        if (event.key === 'Escape') {
            closeChat();
            document.removeEventListener('keydown', handleEscKey); // Clean up listener
        }
    };
    document.addEventListener('keydown', handleEscKey);
    // Ensure listener is removed when closing via button/overlay click too
    closeButton.addEventListener('click', () => document.removeEventListener('keydown', handleEscKey));
    chatModalElement.addEventListener('click', (event) => {
        if (event.target === chatModalElement) {
             document.removeEventListener('keydown', handleEscKey);
        }
    });


    // Focus input field after a short delay for modal animation
    setTimeout(() => chatInputElement?.focus(), 150);
}

// --- END OF FILE ui_chat.js ---