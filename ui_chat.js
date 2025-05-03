/* === ui_chat.js === */
// --- START OF FILE ui_chat.js ---

import { db, currentUser } from './state.js'; // Import currentUser from central state
import { escapeHtml, showLoading, hideLoading } from './utils.js';
import { ADMIN_UID, DEFAULT_PROFILE_PIC_URL } from './config.js';
// Removed incorrect import from ./state.js for notification functions
// Import specific Firestore functions (assuming firebase v9 compat is used)
// If using compat, firebase.firestore()... works. If using v9 modular:
// import { doc, getDoc, updateDoc, collection, addDoc, deleteDoc, query, orderBy, limit, onSnapshot, serverTimestamp, FieldValue } from 'firebase/firestore';

const CHAT_COLLECTION = 'globalChatMessages';
const MESSAGES_LIMIT = 50; // Load/Listen to the Latest 50 messages
let unsubscribeChat = null; // To hold the Firestore listener unsubscribe function

// --- Module-level variables for reply state ---
let replyingToMessageId = null;
let replyingToSenderName = null;
let replyingToPreview = null;

/**
 * Converts specific Markdown patterns within escaped HTML text to HTML tags.
 * MUST be applied *after* initial HTML escaping.
 * @param {string} escapedText - HTML-escaped text.
 * @returns {string} - Text with Markdown converted to HTML tags.
 */
function applyMarkdown(escapedText) {
    let text = escapedText;
    // Code Blocks (```...```) - Must run first
    text = text.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
        // Escape the *content* of the code block again to be safe inside <code>
        return `<pre class="bg-gray-200 dark:bg-gray-900 p-2 rounded text-sm my-1 overflow-x-auto whitespace-pre-wrap"><code class="font-mono">${escapeHtml(codeContent.trim())}</code></pre>`;
    });
    // Inline Code (`...`)
    text = text.replace(/`([^`]+?)`/g, '<code class="bg-gray-200 dark:bg-gray-900 px-1 rounded text-sm font-mono">$1</code>');
    // Bold (**...**)
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic (*...*) - More robust version
    text = text.replace(/(?<!\*)\*(?!\*)(\S(?:.*?\S)?)\*(?!\*)/g, '<em>$1</em>');
    // Underline (_..._) - Basic version, might conflict if underscores are common
    text = text.replace(/(?:^|\s)_(.*?)_(?:\s|$)/g, ' <u>$1</u> '); // Needs refinement maybe
    // Strikethrough (~...~)
    text = text.replace(/~(\S(?:.*?\S)?)~/g, '<s>$1</s>');
    // Newlines (\n -> <br>) - Applied last
    // Avoid adding <br> inside <pre> - simple check
    const parts = text.split(/(<pre[\s\S]*?<\/pre>)/);
    text = parts.map((part, index) => {
        if (index % 2 === 1) return part; // It's a <pre> block, return as is
        return part.replace(/\n/g, '<br>'); // Apply <br> to non-<pre> parts
    }).join('');

    return text;
}

/**
 * Highlights mentions (@username, @everyone) within an HTML string.
 * Applies different styles for @everyone and @me.
 * Attempts to avoid highlighting inside HTML tags.
 * @param {string} htmlString - The HTML string (potentially with markdown already applied).
 * @param {object | null} currentUserForHighlight - The current user object from state.
 * @returns {string} - HTML string with mentions highlighted.
 */
function highlightMentions(htmlString, currentUserForHighlight) {
    if (!htmlString) return '';

    const currentUsername = currentUserForHighlight?.username?.toLowerCase();
    const currentDisplayName = currentUserForHighlight?.displayName?.toLowerCase(); // Check both

    // Enhanced Regex to find mentions not inside attributes or tags
    const mentionHighlightRegex = /(@(?:everyone|\w+))(?![^<]*?>|[^<>]*?<\/(?!span)>)/gi;

    return htmlString.replace(mentionHighlightRegex, (match) => {
        const mentionLower = match.toLowerCase();
        if (mentionLower === '@everyone') {
            return `<span class="mention mention-everyone">@everyone</span>`;
        } else {
            const username = match.substring(1); // Get username part
            const usernameLower = username.toLowerCase();
            if (currentUsername && usernameLower === currentUsername ||
                currentDisplayName && usernameLower === currentDisplayName) {
                return `<span class="mention mention-me">@${username}</span>`;
            } else {
                return `<span class="mention">@${username}</span>`;
            }
        }
    });
}


/**
 * Renders a single chat message into an HTML string.
 * Styles messages from the current user differently.
 * Adds delete button (owner/admin), pin button (admin), reply button.
 * Includes profile picture, timestamp, sender name.
 * Applies Markdown and Mention Highlighting.
 * Shows reply context if available.
 * Visually indicates pinned messages.
 * @param {object} messageData - Object containing message details.
 * @param {string} messageId - The Firestore document ID of the message.
 * @returns {string} - HTML string for the message.
 */
function renderChatMessage(messageData, messageId) {
    if (!messageData) {
        console.warn("renderChatMessage called with invalid messageData for ID:", messageId);
        return '';
    }

    const currentUid = currentUser?.uid; // Use currentUser from state
    const isAdmin = currentUid === ADMIN_UID;
    const isOwner = currentUid === messageData.senderId;

    const isPinned = messageData.isPinned === true; // Check if message is pinned

    // Add visual distinction for pinned messages container
    const pinnedContainerClass = isPinned ? 'pinned-message-highlight border-l-4 border-yellow-400 dark:border-yellow-500 pl-1' : '';

    const messageBg = isOwner ? 'bg-blue-100 dark:bg-blue-900/60' : 'bg-gray-100 dark:bg-gray-700';

    const timestamp = messageData.timestamp?.toDate ? messageData.timestamp.toDate() : new Date();
    const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const senderName = escapeHtml(messageData.senderName || 'Anonymous');
    const photoURL = escapeHtml(messageData.senderPhotoURL || DEFAULT_PROFILE_PIC_URL);

    // --- Text Processing Pipeline ---
    const escapedMessageText = escapeHtml(messageData.text || '');
    const markdownFormattedText = applyMarkdown(escapedMessageText);
    const messageText = highlightMentions(markdownFormattedText, currentUser);
    // --- End Text Processing ---

    // Create preview text for reply button (use raw text before formatting)
    const rawMessageTextForPreview = messageData.text || '';
    const previewText = escapeHtml(rawMessageTextForPreview.substring(0, 50).replace(/\n/g, ' '));

    // --- Action Buttons ---
    let actionButtonsHtml = '<div class="flex items-center space-x-1.5 ml-2 flex-shrink-0">';
    // Reply Button
    actionButtonsHtml += `
        <button
            onclick="window.startReply('${escapeHtml(messageId)}', '${senderName}', '${previewText}')"
            class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500 text-xs opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity duration-150 focus:outline-none rounded-full p-0.5"
            title="Reply to Message">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
        </button>
    `;
    // Pin Button (Admin only)
    if (isAdmin) {
        const pinButtonClass = isPinned ? 'text-yellow-500 dark:text-yellow-400 pinned' : 'text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400';
        const pinButtonTitle = isPinned ? "Unpin Message" : "Pin Message";
        actionButtonsHtml += `
            <button
                onclick="window.togglePinMessage('${escapeHtml(messageId)}')"
                class="${pinButtonClass} text-xs opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity duration-150 focus:outline-none rounded-full p-0.5"
                title="${pinButtonTitle}">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" transform="rotate(-45 10 10)"/><path d="M7 2a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V3a1 1 0 00-1-1H7zM7 15a1 1 0 011-1h1a1 1 0 110 2H8a1 1 0 01-1-1z" /></svg>
            </button>
        `;
    }
    // Delete Button (Owner or Admin)
    if (isOwner || isAdmin) {
        actionButtonsHtml += `
            <button
                onclick="window.deleteChatMessage('${escapeHtml(messageId)}')"
                class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 text-xs opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity duration-150 focus:outline-none rounded-full p-0.5"
                title="Delete Message">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        `;
    }
    actionButtonsHtml += '</div>'; // Close action buttons container
    // --- End Action Buttons ---

    // --- Reply Context Snippet ---
    let replyContextHtml = '';
    if (messageData.replyTo && messageData.replyPreview) {
        replyContextHtml = `
            <div class="reply-context border-l-2 border-blue-300 dark:border-blue-700 pl-2 mb-1 text-xs text-gray-500 dark:text-gray-400 italic">
              Replying to <strong>${escapeHtml(messageData.replyingToSenderName || 'Original Message')}</strong>:
              <span class="line-clamp-1">${escapeHtml(messageData.replyPreview || '...')}</span>
            </div>
        `;
    }
    // --- End Reply Context ---

    return `
        <div class="chat-message-container group flex items-start gap-2.5 mb-2 justify-start ${pinnedContainerClass} py-1" data-message-id="${messageId}">
            <img src="${photoURL}"
                 alt="${senderName}'s avatar"
                 class="w-10 h-10 rounded-full flex-shrink-0 order-1 mt-1" 
                 onerror="this.onerror=null; this.src='${DEFAULT_PROFILE_PIC_URL}';">

            <div class="flex-grow min-w-0 order-2">
                <div class="flex justify-between items-baseline mb-0.5"> <!-- Reduced margin -->
                    <span class="font-semibold text-sm text-gray-800 dark:text-gray-200 mr-2">${senderName}</span>
                    <div class="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <span class="timestamp">${formattedTime}</span>
                        ${actionButtonsHtml}
                    </div>
                </div>

                <div class="message-bubble ${messageBg} p-2 rounded-lg max-w-[90%] md:max-w-[80%]">
                    ${replyContextHtml}
                    <div class="text-sm text-gray-800 dark:text-gray-200 break-words message-content-holder">
                        ${messageText}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Fetches and renders the initial batch of chat messages. (Less critical with onSnapshot).
 * @param {HTMLElement} chatContentElement - The DOM element to render messages into.
 */
async function loadChatMessages(chatContentElement) {
    // ... (Implementation remains the same, ensures renderChatMessage is called) ...
    if (!db) {
        console.error("[loadChatMessages] Chat Error: Firestore DB not initialized");
        chatContentElement.innerHTML = '<p class="text-center text-muted p-4">Error loading chat.</p>';
        return;
    }
    console.log("[loadChatMessages] Loading initial chat messages...");
    chatContentElement.innerHTML = `<div class="text-center p-4">
                                        <div class="loader inline-block"></div>
                                        <p class="text-muted text-sm mt-2">Loading messages...</p>
                                     </div>`;

    try {
        const snapshot = await db.collection(CHAT_COLLECTION)
                           .orderBy('timestamp', 'desc')
                           .limit(MESSAGES_LIMIT)
                           .get();

        chatContentElement.innerHTML = ''; // Clear loading indicator

        if (snapshot.empty) {
            chatContentElement.innerHTML = '<p class="text-center text-muted p-4">No messages yet. Start the conversation!</p>';
        } else {
            const messages = snapshot.docs.reverse();
            messages.forEach(doc => {
                chatContentElement.innerHTML += renderChatMessage(doc.data(), doc.id); // Calls the updated render function
            });
            chatContentElement.scrollTop = chatContentElement.scrollHeight;
        }
        console.log(`[loadChatMessages] Loaded ${snapshot.size} initial messages.`);
    } catch (error) {
        console.error("[loadChatMessages] Error loading chat messages:", error);
        if (error.code === 'permission-denied' && !currentUser) {
             chatContentElement.innerHTML = `<p class="text-center text-danger p-4">Please log in to view chat messages.</p>`;
        } else {
             chatContentElement.innerHTML = `<p class="text-center text-danger p-4">Error loading messages: ${escapeHtml(error.message)}</p>`;
        }
    }
}

/**
 * Sets the UI state to indicate replying to a specific message.
 * @param {string} messageId - The ID of the message being replied to.
 * @param {string} senderName - The name of the original message sender.
 * @param {string} previewText - A short preview of the original message text.
 */
export function startReply(messageId, senderName, previewText) {
    console.log(`[startReply] Replying to message ${messageId} from ${senderName}`);
    replyingToMessageId = messageId;
    replyingToSenderName = senderName; // Already escaped in renderChatMessage
    replyingToPreview = previewText; // Already escaped in renderChatMessage

    const chatInputElement = document.getElementById('global-chat-input');
    const replyIndicator = document.getElementById('chat-reply-indicator');
    const replyIndicatorText = document.getElementById('reply-indicator-text');

    if (chatInputElement) {
        chatInputElement.placeholder = `Replying to ${senderName}...`;
        chatInputElement.focus();
    }
    if (replyIndicator && replyIndicatorText) {
        replyIndicatorText.innerHTML = `Replying to <strong>${senderName}</strong>`; // senderName is already escaped
        replyIndicator.classList.remove('hidden');
    }
    attachCancelReplyListener();
}

/**
 * Resets the reply state and UI.
 */
export function cancelReply() {
    console.log("[cancelReply] Cancelling reply.");
    replyingToMessageId = null;
    replyingToSenderName = null;
    replyingToPreview = null;

    const chatInputElement = document.getElementById('global-chat-input');
    const replyIndicator = document.getElementById('chat-reply-indicator');

    if (chatInputElement) {
        chatInputElement.placeholder = 'Type message (@mention, Enter to send, Shift+Enter for newline)'; // Updated placeholder
    }
    if (replyIndicator) {
        replyIndicator.classList.add('hidden');
    }
}

// Helper function to attach the listener to the cancel button
function attachCancelReplyListener() {
    const cancelBtn = document.getElementById('cancel-reply-btn');
    if (cancelBtn && !cancelBtn.dataset.listenerAttached) {
        cancelBtn.addEventListener('click', cancelReply);
        cancelBtn.dataset.listenerAttached = 'true';
        console.log("[attachCancelReplyListener] Attached listener to cancel reply button.");
    }
}


/**
 * Sends a new chat message to Firestore, including mentions and reply context if applicable.
 * @param {string} textInputId - The ID of the input field containing the message text.
 */
export async function sendChatMessage(textInputId) {
    const inputElement = document.getElementById(textInputId);
    if (!inputElement) {
        console.error("[sendChatMessage] Chat Error: Input element not found:", textInputId);
        return;
    }
    const messageText = inputElement.value.trim();

    if (!db || !currentUser) {
        console.error("[sendChatMessage] Chat Error: Firestore DB or current user not available.");
        alert("Cannot send message: Not logged in or DB error.");
        return;
    }
    if (!messageText) {
        console.log("[sendChatMessage] Chat Info: Empty message, not sending.");
        return;
    }
    if (messageText.length > 1000) {
        alert("Message is too long (max 1000 characters).");
        return;
    }

    const sendButton = document.getElementById('send-chat-btn');
    inputElement.disabled = true;
    if (sendButton) sendButton.disabled = true;

    console.log(`[sendChatMessage] Attempting to send message as user: ${currentUser.uid}`);

    // --- NEW: Extract Mentions ---
    const mentionRegex = /@(\w+)/g;
    const mentionedUsernames = (messageText.match(mentionRegex) || [])
        .map(m => m.substring(1)) // Get the username part
        .filter(u => u.toLowerCase() !== 'everyone'); // Exclude 'everyone' username if matched by \w+
    const mentionsEveryone = /@everyone/i.test(messageText); // Case-insensitive check for @everyone
    const mentionsList = [...new Set(mentionedUsernames)]; // Unique usernames
    if (mentionsEveryone) {
        mentionsList.push('everyone'); // Add 'everyone' explicitly if found
    }
    console.log("[sendChatMessage] Mentions found:", mentionsList);
    // --- End Mention Extraction ---

    // Prepare message data
    const messageData = {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        senderPhotoURL: currentUser.photoURL || DEFAULT_PROFILE_PIC_URL,
        text: messageText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(), // Use compat serverTimestamp
        mentions: mentionsList, // Store the extracted mentions
        isPinned: false // Initialize isPinned to false
    };

    // Add reply data if applicable
    if (replyingToMessageId) {
        messageData.replyTo = replyingToMessageId;
        messageData.replyingToSenderName = replyingToSenderName;
        messageData.replyPreview = replyingToPreview;
        console.log(`[sendChatMessage] Sending as reply to ${replyingToMessageId}`);
    }

    try {
        console.log(`[sendChatMessage] Saving message with data:`, { // Log data being saved
            senderId: messageData.senderId,
            senderName: messageData.senderName,
            textLength: messageData.text.length,
            mentions: messageData.mentions,
            replyTo: messageData.replyTo || null,
            isPinned: messageData.isPinned // Log initial pin state
        });
        // Use compat add method
        await db.collection(CHAT_COLLECTION).add(messageData);
        console.log("[sendChatMessage] Chat message sent successfully.");
        inputElement.value = ''; // Clear input on success
    } catch (error) {
        console.error("[sendChatMessage] Error sending chat message:", error);
        alert(`Failed to send message: ${error.message}`);
    } finally {
        inputElement.disabled = false;
        if (sendButton) sendButton.disabled = false;
        inputElement.focus();
        cancelReply(); // Reset reply state after sending attempt
    }
}


/**
 * Deletes a specific chat message from Firestore.
 * @param {string} messageId - The Firestore document ID of the message to delete.
 */
export async function deleteChatMessage(messageId) {
     if (!db || !currentUser) {
        console.error("[deleteChatMessage] Chat Error: Firestore DB or current user not available for delete.");
        alert("Cannot delete message: Not logged in or DB error.");
        return;
    }
    if (!messageId) {
        console.error("[deleteChatMessage] Chat Error: Message ID missing for deletion.");
        return;
    }

    console.log(`[deleteChatMessage] User ${currentUser.uid} attempting to delete message: ${messageId}`);
    const messageRef = db.collection(CHAT_COLLECTION).doc(messageId); // Use compat syntax

    try {
        const docSnap = await messageRef.get(); // Use compat syntax
        if (!docSnap.exists) {
            console.warn("[deleteChatMessage] Chat Warning: Message to delete not found:", messageId);
            alert("Message already deleted or does not exist.");
            const elementToRemove = document.querySelector(`.chat-message-container[data-message-id="${messageId}"]`);
            if (elementToRemove) elementToRemove.remove();
            return;
        }

        const messageData = docSnap.data();
        const isOwner = currentUser.uid === messageData.senderId;
        const isAdmin = currentUser.uid === ADMIN_UID;

        if (!isOwner && !isAdmin) {
            console.error(`[deleteChatMessage] Permission denied for user ${currentUser.uid} to delete message ${messageId} owned by ${messageData.senderId}`);
            alert("You do not have permission to delete this message.");
            return;
        }

        if (!confirm("Are you sure you want to delete this message? This cannot be undone.")) {
             console.log("[deleteChatMessage] Delete cancelled by user.");
            return;
        }

        console.log(`[deleteChatMessage] Proceeding with delete for message ${messageId} by user ${currentUser.uid} (isOwner: ${isOwner}, isAdmin: ${isAdmin})`);
        showLoading("Deleting message...");
        await messageRef.delete(); // Use compat syntax
        hideLoading();
        console.log("[deleteChatMessage] Chat message deleted successfully:", messageId);
        // Snapshot listener handles UI removal. Fallback removal:
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
 * Toggles the pinned status of a chat message (Admin only).
 * @param {string} messageId - The Firestore document ID of the message.
 */
export async function togglePinMessage(messageId) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        console.warn("[togglePinMessage] Permission denied: Only admins can pin messages.");
        return;
    }
    if (!db) {
        console.error("[togglePinMessage] Chat Error: Firestore DB not available.");
        alert("Error: Cannot connect to database.");
        return;
    }
    if (!messageId) {
        console.error("[togglePinMessage] Chat Error: Message ID missing.");
        return;
    }

    console.log(`[togglePinMessage] Admin ${currentUser.uid} attempting to toggle pin status for message: ${messageId}`);
    const messageRef = db.collection(CHAT_COLLECTION).doc(messageId); // Use compat syntax

    showLoading("Updating pin status...");
    try {
        const docSnap = await messageRef.get(); // Use compat syntax
        if (!docSnap.exists) {
            console.warn("[togglePinMessage] Chat Warning: Message to pin/unpin not found:", messageId);
            alert("Message not found.");
            hideLoading();
            return;
        }

        const messageData = docSnap.data();
        const currentPinnedStatus = messageData.isPinned === true;
        const newPinnedStatus = !currentPinnedStatus;

        console.log(`[togglePinMessage] Toggling pin status from ${currentPinnedStatus} to ${newPinnedStatus} for message ${messageId}`);
        await messageRef.update({ isPinned: newPinnedStatus }); // Use compat syntax

        hideLoading();
        console.log(`[togglePinMessage] Successfully ${newPinnedStatus ? 'pinned' : 'unpinned'} message ${messageId}.`);

    } catch (error) {
        hideLoading();
        console.error(`[togglePinMessage] Error updating pin status for message ${messageId}:`, error);
        alert(`Failed to update pin status: ${error.message}`);
    }
}


/**
 * Placeholder function to show pinned messages.
 * (Actual implementation would involve querying Firestore).
 */
export function showPinnedMessages() {
    console.log("Show Pinned Messages clicked");
    alert("Feature to view pinned messages is not implemented yet.");
    // Future implementation:
    // 1. Query Firestore: db.collection(CHAT_COLLECTION).where('isPinned', '==', true).orderBy('timestamp', 'desc').get()
    // 2. Render the results in a separate modal or view within the chat.
}

// --- NEW: Notification Functions (Defined within ui_chat.js) ---
function notifyNewMention() {
    console.log("[notifyNewMention] Mention detected, attempting to update sidebar link.");
    // Use a more specific selector targeting the link within the standard nav
    const sidebarChatLink = document.querySelector('#sidebar-standard-nav a[onclick*="showGlobalChat"]');

    if (sidebarChatLink && !sidebarChatLink.classList.contains('has-unread-mention')) {
        sidebarChatLink.classList.add('has-unread-mention');
        console.log("[notifyNewMention] Added mention notification class to sidebar link.");
        // Optional: Play a subtle sound
        // const audio = new Audio('./path/to/notification.mp3'); audio.play().catch(e => console.warn("Audio notification failed:", e));
    } else if (sidebarChatLink) {
        console.log("[notifyNewMention] Mention notification class already present or link not found.");
    } else {
        console.warn("[notifyNewMention] Could not find sidebar chat link element (#sidebar-standard-nav a[onclick*=\"showGlobalChat\"]) to add notification class.");
    }
}

function clearMentionNotification() {
    console.log("[clearMentionNotification] Attempting to clear sidebar link notification.");
    const sidebarChatLink = document.querySelector('#sidebar-standard-nav a[onclick*="showGlobalChat"]');
    if (sidebarChatLink) {
        sidebarChatLink.classList.remove('has-unread-mention');
        console.log("[clearMentionNotification] Removed mention notification class from sidebar link.");
    } else {
        console.warn("[clearMentionNotification] Could not find sidebar chat link element to clear notification class.");
    }
}
// --- End Notification Functions ---


/**
 * Subscribes to real-time updates for chat messages using onSnapshot.
 * Checks for mentions in new messages and triggers notifications.
 * @param {HTMLElement} chatContentElement - The DOM element to render messages into.
 * @returns {function} - The unsubscribe function for the listener.
 */
function subscribeToChatMessages(chatContentElement) {
    if (!db || !currentUser) {
        console.error("[subscribeToChatMessages] Chat Error: Firestore DB or current user not available for subscription.");
        chatContentElement.innerHTML = '<p class="text-center text-muted p-4">Error connecting to chat (Auth issue).</p>';
        return () => { console.log("[subscribeToChatMessages] Chat subscription NOP (DB or Auth missing).") };
    }
    console.log(`[subscribeToChatMessages] Attempting query. User verified: ${currentUser.uid}, Username: ${currentUser.username}, DisplayName: ${currentUser.displayName}`);

    const query = db.collection(CHAT_COLLECTION) // Use compat syntax
        .orderBy('timestamp', 'desc')
        .limit(MESSAGES_LIMIT);

    unsubscribeChat = query.onSnapshot(snapshot => { // Use compat syntax
        console.log(`[subscribeToChatMessages] Chat snapshot received: ${snapshot.docChanges().length} changes. Total docs in snapshot: ${snapshot.size}.`);
        let hasMessages = false;
        let wasScrolledToBottom = chatContentElement.scrollHeight - chatContentElement.clientHeight <= chatContentElement.scrollTop + 50; // Check scroll position before update

        // --- Process changes and check for mentions ---
        snapshot.docChanges().forEach(change => {
            if (change.type === "added") {
                const messageData = change.doc.data();
                const mentions = messageData.mentions || []; // Ensure mentions array exists
                // Ensure currentUser and its properties are available before accessing
                const currentUsernameLower = currentUser?.username?.toLowerCase();
                const currentDisplayNameLower = currentUser?.displayName?.toLowerCase();

                // Check for @everyone mention
                const mentionsEveryone = mentions.some(m => m?.toLowerCase() === 'everyone');

                // Check for specific mention of the current user (username or display name)
                const mentionsMe = mentions.some(mentionUsername => {
                    if (!mentionUsername || mentionUsername.toLowerCase() === 'everyone') return false; // Skip 'everyone' here
                    const mentionLower = mentionUsername.toLowerCase();
                    // Only check if currentUser properties are defined
                    return (currentUsernameLower && mentionLower === currentUsernameLower) ||
                           (currentDisplayNameLower && mentionLower === currentDisplayNameLower);
                });

                if (mentionsEveryone || mentionsMe) {
                     // Check if the message sender is NOT the current user to avoid self-notifications
                    if (currentUser && messageData.senderId !== currentUser.uid) {
                         console.log(`[subscribeToChatMessages] Mention detected for user ${currentUser.uid} in message ${change.doc.id}. Mentions:`, mentions);
                         notifyNewMention(); // Call the local notification function
                    } else {
                         console.log(`[subscribeToChatMessages] Self-mention detected in message ${change.doc.id}, notification skipped.`);
                    }
                }
            } else if (change.type === 'modified') {
                 console.log(`[subscribeToChatMessages] Message modified: ${change.doc.id}`);
            } else if (change.type === 'removed') {
                 console.log(`[subscribeToChatMessages] Message removed: ${change.doc.id}`);
                 const elementToRemove = document.querySelector(`.chat-message-container[data-message-id="${change.doc.id}"]`);
                 if (elementToRemove) {
                     console.log("[subscribeToChatMessages] Removing deleted message element from UI via snapshot.");
                     elementToRemove.remove();
                 }
            }
        });
        // --- End mention check ---

        // --- Render full message list ---
        const messages = snapshot.docs
            .map(doc => ({ id: doc.id, data: doc.data() }))
            .sort((a, b) => (a.data.timestamp?.toMillis() || 0) - (b.data.timestamp?.toMillis() || 0)); // ASC for rendering order

        if (messages.length > 0) {
             hasMessages = true;
             let messagesHtml = '';
             messages.forEach(msg => {
                 messagesHtml += renderChatMessage(msg.data, msg.id); // Uses the updated render function
             });
             chatContentElement.innerHTML = messagesHtml;

             requestAnimationFrame(() => { // Use rAF for smoother scroll updates
                  if (wasScrolledToBottom) {
                      chatContentElement.scrollTop = chatContentElement.scrollHeight;
                  }
             });
        }

        if (!hasMessages && !chatContentElement.innerHTML.includes('text-center text-muted')) { // Avoid replacing if "No messages" is already shown
            console.log("[subscribeToChatMessages] Snapshot empty, displaying 'no messages'.");
            chatContentElement.innerHTML = '<p class="text-center text-muted p-4">No messages yet. Start the conversation!</p>';
        } else if (!hasMessages && snapshot.docChanges().some(c => c.type === 'removed')) {
             if (chatContentElement.children.length === 0) {
                   chatContentElement.innerHTML = '<p class="text-center text-muted p-4">No messages yet. Start the conversation!</p>';
             }
        }
        // --- End rendering ---

    }, error => {
        console.error("[subscribeToChatMessages] Error in chat subscription:", error);
        if (error.code === 'permission-denied') {
            const userStateMsg = currentUser ? `User still appears logged in (UID: ${currentUser.uid})` : "User appears logged out.";
            console.error(`[subscribeToChatMessages] Permission Denied Error. ${userStateMsg}`);
            chatContentElement.innerHTML = `<p class="text-center text-danger p-4">Chat connection error (permissions). Please ensure you are logged in. ${!currentUser ? 'You seem to be logged out.' : ''}</p>`;
        } else {
            chatContentElement.innerHTML = `<p class="text-center text-danger p-4">Error listening for messages: ${escapeHtml(error.message)}</p>`;
        }
        if (unsubscribeChat) {
             console.log("[subscribeToChatMessages] Unsubscribing chat due to error.");
             unsubscribeChat();
             unsubscribeChat = null;
        }
    });

    console.log("[subscribeToChatMessages] Subscription initiated.");
    return unsubscribeChat;
}


/**
 * Creates and displays the global chat modal.
 * Clears mention notifications upon opening.
 */
export function showGlobalChat() {
    console.log(`[showGlobalChat] Function called. Timestamp: ${new Date().toISOString()}`);
    console.log(`[showGlobalChat] Current user state upon entry:`, currentUser ? { uid: currentUser.uid, username: currentUser.username, displayName: currentUser.displayName } : 'null');

    if (!currentUser) {
        console.warn("[showGlobalChat] User not logged in. Preventing chat display and subscription.");
        alert("Please log in to use the chat.");
        document.getElementById('global-chat-modal')?.remove();
        if (unsubscribeChat) {
             console.log("[showGlobalChat] Unsubscribing stale chat listener because user is null.");
             unsubscribeChat();
             unsubscribeChat = null;
        }
        return;
    }

    // --- Clear any existing mention notification ---
    clearMentionNotification(); // Call the locally defined function

    // --- Cancel any existing reply state ---
    cancelReply();

    // --- Remove existing modal if present ---
    const existingModal = document.getElementById('global-chat-modal');
    if (existingModal) {
        console.log("[showGlobalChat] Closing existing chat modal before opening new one.");
        const closeBtn = existingModal.querySelector('#close-chat-btn');
        if (closeBtn) {
            closeBtn.click(); // Triggers closeChat
        } else {
            existingModal.remove();
            if (unsubscribeChat) {
                 console.warn("[showGlobalChat] Force unsubscribing chat listener during modal cleanup (no close button found).");
                 unsubscribeChat();
                 unsubscribeChat = null;
            }
        }
         // Add a small delay to ensure the old modal is fully removed before adding the new one
        setTimeout(() => createAndShowChatModal(), 50);
        return; // Exit now, createAndShowChatModal will handle the rest
    }

    // --- If no existing modal, create and show immediately ---
    createAndShowChatModal();
}


/**
 * Helper function to create the modal HTML and set up listeners.
 * Separated from showGlobalChat to handle potential async cleanup of old modal.
 */
function createAndShowChatModal() {
     console.log(`[createAndShowChatModal] Proceeding to show global chat modal for user: ${currentUser?.uid}`);

     const modalHtml = `
        <div id="global-chat-modal" class="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-50 p-0 animate-fade-in">
            <div class="bg-white dark:bg-gray-800 shadow-xl w-full h-full flex flex-col">
                <!-- Header -->
                <div class="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div class="flex items-center gap-2">
                         <h3 class="text-lg font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-2">
                            <!-- Logos will be handled by CSS -->
                            <svg class="logo-light-mode w-5 h-5 mr-2 inline-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clip-rule="evenodd" /></svg>
                            <svg class="logo-dark-mode w-5 h-5 mr-2 inline-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clip-rule="evenodd" /></svg>
                            Global Chat
                         </h3>
                         <button id="view-pinned-btn" onclick="window.showPinnedMessages()" class="ml-4 text-sm btn-secondary px-2 py-1 flex items-center" title="View Pinned Messages">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>
                             Pinned
                         </button>
                    </div>
                    <button id="close-chat-btn" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800" title="Close Chat">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <!-- Chat Content Area -->
                <div id="global-chat-content" class="flex-grow overflow-y-auto p-3 space-y-1 custom-scrollbar">
                    <div class="text-center p-4"><div class="loader inline-block"></div><p class="text-muted text-sm mt-2">Connecting to chat...</p></div>
                </div>

                 <!-- Reply Indicator Area -->
                 <div id="chat-reply-indicator" class="hidden text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-1.5 rounded mx-3 mb-1 flex justify-between items-center flex-shrink-0">
                     <span id="reply-indicator-text" class="truncate pr-2">Replying to...</span>
                     <button id="cancel-reply-btn" class="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 ml-2 p-0.5 rounded-full focus:outline-none focus:ring-1 focus:ring-red-500" title="Cancel Reply">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                     </button>
                 </div>


                <!-- Input Area -->
                <div class="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <form id="chat-send-form" class="flex items-start space-x-2"> <!-- Changed to items-start -->
                        <textarea id="global-chat-input" placeholder="Type message (@mention, Enter to send, Shift+Enter for newline)" class="flex-grow" rows="1" style="resize: none; overflow-y: hidden; min-height: 40px;" maxlength="1000"></textarea> <!-- Added min-height, overflow-y hidden -->
                        <button type="submit" id="send-chat-btn" class="btn-primary flex-shrink-0 px-3 py-2 self-center" title="Send Message"> <!-- Start self-center -->
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
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
    const chatModalElement = document.getElementById('global-chat-modal');
    const viewPinnedButton = document.getElementById('view-pinned-btn'); // Get the new button

    // Auto-resize textarea
    const adjustTextareaHeight = () => {
        if (!chatInputElement) return;
        chatInputElement.style.height = 'auto';
        const maxHeight = 120; // Approx 5 lines
        const newHeight = Math.min(chatInputElement.scrollHeight, maxHeight);
        chatInputElement.style.height = `${newHeight}px`;
        // Control overflow based on whether max height is reached
        chatInputElement.style.overflowY = newHeight >= maxHeight ? 'auto' : 'hidden';

        const sendButton = document.getElementById('send-chat-btn');
         if (sendButton) {
            sendButton.classList.toggle('self-end', newHeight > 40); // Align bottom if multiple lines
            sendButton.classList.toggle('self-center', newHeight <= 40); // Align center if single line
         }
    };
    chatInputElement.addEventListener('input', adjustTextareaHeight);
    adjustTextareaHeight(); // Initial call

    // Function to close the chat and clean up
    const closeChat = () => {
        console.log("[closeChat] Function called.");
        cancelReply(); // Also cancel reply state on close
        if (unsubscribeChat) {
            console.log("[closeChat] Unsubscribing from chat messages.");
            unsubscribeChat();
            unsubscribeChat = null;
        } else {
            console.log("[closeChat] No active chat subscription found.");
        }
        if (chatModalElement) {
            console.log("[closeChat] Removing chat modal element.");
            // Optional: Add fade-out animation before removing
            chatModalElement.style.transition = 'opacity 0.2s ease-out';
            chatModalElement.style.opacity = '0';
            setTimeout(() => {
                 chatModalElement.remove();
                 // Also remove Esc key listener after modal is gone
                 console.log("[closeChat] Removing Esc key listener post-removal.");
                 document.removeEventListener('keydown', handleEscKey);
            }, 200); // Match duration of animation
        } else {
             console.log("[closeChat] Chat modal element already removed or not found.");
             // Still attempt to remove listener if modal wasn't found but listener might exist
             console.log("[closeChat] Removing Esc key listener (fallback).");
             document.removeEventListener('keydown', handleEscKey);
        }
    };

    console.log("[createAndShowChatModal] Calling subscribeToChatMessages...");
    unsubscribeChat = subscribeToChatMessages(chatContentElement); // This now handles mention notifications

    sendForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendChatMessage('global-chat-input'); // This now handles mention extraction
        setTimeout(adjustTextareaHeight, 0); // Reset height after sending
    });

    chatInputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendForm.requestSubmit(); // Use form submission standard method
        }
        // Allow textarea height to adjust immediately after Shift+Enter
        if (e.key === 'Enter' && e.shiftKey) {
             setTimeout(adjustTextareaHeight, 0);
        }
    });

    closeButton.addEventListener('click', closeChat);

    // Add listener for the "View Pinned" button
    if (viewPinnedButton) {
        viewPinnedButton.addEventListener('click', () => {
            window.showPinnedMessages(); // Call the globally exposed function
        });
         console.log("[createAndShowChatModal] Added listener to 'View Pinned' button.");
    } else {
         console.warn("[createAndShowChatModal] Could not find 'View Pinned' button to attach listener.");
    }


    const handleEscKey = (event) => {
        // Check if the event target is inside the chat modal or is the modal itself
        const isEventInsideModal = chatModalElement?.contains(event.target);

        if (event.key === 'Escape' && isEventInsideModal) {
            console.log("[handleEscKey] Escape key pressed inside modal, closing chat.");
            closeChat();
        } else if (event.key === 'Escape') {
            // Optional: Log if escape was pressed but not inside the modal (useful for debugging focus issues)
            // console.log("[handleEscKey] Escape key pressed, but event target is outside the chat modal.");
        }
    };
    console.log("[createAndShowChatModal] Adding Esc key listener.");
    // Ensure listener is attached only once if createAndShowChatModal could be called multiple times rapidly
    document.removeEventListener('keydown', handleEscKey); // Remove previous listener just in case
    document.addEventListener('keydown', handleEscKey);


    // Ensure the cancel reply listener is attached now that the button exists
    attachCancelReplyListener();

    // Focus input after a short delay
    setTimeout(() => {
        chatInputElement?.focus();
         console.log("[createAndShowChatModal] Focused chat input.");
    }, 150);

    // Add logo visibility styles if not already present
    const styleId = 'chat-logo-styles';
    if (!document.getElementById(styleId)) {
        const logoStyle = document.createElement('style');
        logoStyle.id = styleId;
        // Styles moved to styles.css via prompt
        document.head.appendChild(logoStyle);
        console.log("[createAndShowChatModal] Added chat logo and pin visibility styles container (styles in styles.css).");
    }

    // Make necessary functions globally accessible for inline handlers
    window.deleteChatMessage = deleteChatMessage;
    window.startReply = startReply;
    window.cancelReply = cancelReply;
    window.togglePinMessage = togglePinMessage; // Expose the new function
    window.showPinnedMessages = showPinnedMessages; // Expose the new function

    console.log("[createAndShowChatModal] Chat modal setup complete.");
}


// Make necessary functions globally accessible (Done in script.js usually, but ensure these are covered)
window.showGlobalChat = showGlobalChat;
window.deleteChatMessage = deleteChatMessage;
window.startReply = startReply;
window.cancelReply = cancelReply;
window.togglePinMessage = togglePinMessage;
window.showPinnedMessages = showPinnedMessages;

// --- END OF FILE ui_chat.js ---