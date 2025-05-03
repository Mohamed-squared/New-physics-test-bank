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
        // Trim leading/trailing newlines common in markdown code blocks before wrapping
        return `<pre class="bg-gray-200 dark:bg-gray-900 p-2 rounded text-sm my-1 overflow-x-auto whitespace-pre-wrap"><code class="font-mono">${escapeHtml(codeContent.trim())}</code></pre>`;
    });
    // Inline Code (`...`)
    text = text.replace(/`([^`]+?)`/g, '<code class="bg-gray-200 dark:bg-gray-900 px-1 rounded text-sm font-mono">$1</code>');
    // Bold (**...**)
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic (*...*) - Avoid matching **
    text = text.replace(/(?<!\*)\*(?!\*)(\S(?:.*?\S)?)\*(?!\*)/g, '<em>$1</em>');
    // Underline (_..._) - Basic version, might conflict if underscores are common. Requires space/start/end boundary.
    text = text.replace(/(?:^|\s)_(.*?)_(?=\s|$)/g, (match, content) => {
        // Re-insert the leading space if it was captured
        const prefix = match.startsWith(' ') ? ' ' : '';
        return `${prefix}<u>${content}</u>`;
    });
    // Strikethrough (~...~)
    text = text.replace(/~(\S(?:.*?\S)?)~/g, '<s>$1</s>');

    // Newlines (\n -> <br>) - Applied last
    // Avoid adding <br> inside <pre> - simple check using split/map/join
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

    // Extract potential comparison values safely, convert to lowercase once
    const currentUsername = currentUserForHighlight?.username?.toLowerCase();
    const currentDisplayName = currentUserForHighlight?.displayName?.toLowerCase(); // Check both

    // Enhanced Regex to find mentions not inside attributes or tags.
    // Looks for @ followed by 'everyone' or word characters (\w+)
    // Negative lookahead assertion (?![^<]*?>|[^<>]*?<\/(?!span)>):
    //   [^<]*?>        : Ensures the mention is not followed by characters ending in '>' (i.e., inside a start tag)
    //   [^<>]*?<\/span>: Specifically prevents re-matching within already created mention spans.
    //                  (Adjust 'span' if you use other tags for highlights)
    //   [^<>]*?<\/     : (Alternative) More general, prevents matching before any closing tag
    const mentionHighlightRegex = /(@(?:everyone|\w+))(?![^<]*?>|[^<>]*?<\/(?!span)>)/gi;

    return htmlString.replace(mentionHighlightRegex, (match) => {
        const mentionLower = match.toLowerCase();
        if (mentionLower === '@everyone') {
            // Style @everyone mentions
            return `<span class="mention mention-everyone">@everyone</span>`;
        } else {
            // Extract the username part (without '@')
            const username = match.substring(1);
            const usernameLower = username.toLowerCase();

            // Check if the mentioned username matches the current user's username or display name
            if (currentUserForHighlight && // Only check if currentUser is available
                ((currentUsername && usernameLower === currentUsername) ||
                 (currentDisplayName && usernameLower === currentDisplayName))) {
                // Style mentions of the current user ('@me')
                return `<span class="mention mention-me">@${username}</span>`;
            } else {
                // Style standard mentions of other users
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

    // *** MODIFIED: Add visual distinction for pinned messages container ***
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
    // Escaping happens within the onclick attribute now
    const previewTextForJs = rawMessageTextForPreview.substring(0, 50).replace(/\n/g, ' ').replace(/'/g, "\\'").replace(/"/g, '"');


    // --- Action Buttons ---
    // *** MODIFICATION START: Timestamp moved out of this section ***
    let actionButtonsHtml = '<div class="flex items-center space-x-1.5 ml-2 flex-shrink-0">';
    // Reply Button
    actionButtonsHtml += `
        <button
            onclick="window.startReply('${escapeHtml(messageId)}', '${senderName}', '${previewTextForJs}')"
            class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500 text-xs opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity duration-150 focus:outline-none rounded-full p-0.5"
            title="Reply to Message">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
        </button>
    `;

    // *** MODIFIED: Added Pin Button (Admin only) ***
    if (isAdmin) {
        // Conditionally set class and title based on pinned status
        const pinButtonClass = isPinned ? 'text-yellow-500 dark:text-yellow-400 pinned' : 'text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400';
        const pinButtonTitle = isPinned ? "Unpin Message" : "Pin Message";
        actionButtonsHtml += `
            <button
                onclick="window.togglePinMessage('${escapeHtml(messageId)}')"
                class="${pinButtonClass} text-xs opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity duration-150 focus:outline-none rounded-full p-0.5"
                title="${pinButtonTitle}">
                 <!-- Pin Icon SVG -->
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
        // Data comes from Firestore, needs escaping before rendering
        replyContextHtml = `
            <div class="reply-context border-l-2 border-blue-300 dark:border-blue-700 pl-2 mb-1 text-xs text-gray-500 dark:text-gray-400 italic">
              Replying to <strong>${escapeHtml(messageData.replyingToSenderName || 'Original Message')}</strong>:
              <span class="line-clamp-1">${escapeHtml(messageData.replyPreview || '...')}</span>
            </div>
        `;
    }
    // --- End Reply Context ---

    // *** MODIFIED: Added pinnedContainerClass to the main div ***
    return `
        <div class="chat-message-container group flex items-start gap-2.5 mb-2 justify-start ${pinnedContainerClass} py-1" data-message-id="${messageId}">
            <img src="${photoURL}"
                 alt="${senderName}'s avatar"
                 class="w-10 h-10 rounded-full flex-shrink-0 order-1 mt-1"
                 onerror="this.onerror=null; this.src='${DEFAULT_PROFILE_PIC_URL}';">

            <div class="flex-grow min-w-0 order-2">

                <div class="flex justify-between items-center mb-0.5">

                    <div class="flex items-baseline space-x-2 min-w-0">
                        <span class="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate" title="${senderName}">${senderName}</span>
                        <span class="timestamp text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">${formattedTime}</span>
                    </div>

                    ${actionButtonsHtml}
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
 * @param {string} senderName - The name of the original message sender (already HTML escaped from render).
 * @param {string} previewText - A short preview of the original message text (already JS escaped from render).
 */
export function startReply(messageId, senderName, previewText) {
    // senderName and previewText are already appropriately escaped by renderChatMessage for JS/HTML
    console.log(`[startReply] Replying to message ${messageId} from ${senderName}`);
    replyingToMessageId = messageId;
    replyingToSenderName = senderName; // Store the potentially HTML-escaped name
    replyingToPreview = previewText;   // Store the potentially JS/HTML-escaped preview

    const chatInputElement = document.getElementById('global-chat-input');
    const replyIndicator = document.getElementById('chat-reply-indicator');
    const replyIndicatorText = document.getElementById('reply-indicator-text');

    if (chatInputElement) {
        // Sender name might contain HTML entities (like "), use innerHTML for placeholder
        // Or, better, decode entities for the placeholder for cleaner text
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = senderName;
        const decodedSenderName = tempDiv.textContent || tempDiv.innerText || senderName;
        chatInputElement.placeholder = `Replying to ${decodedSenderName}...`;
        chatInputElement.focus();
    }
    if (replyIndicator && replyIndicatorText) {
        // senderName is already escaped, safe for innerHTML
        replyIndicatorText.innerHTML = `Replying to <strong>${senderName}</strong>`;
        replyIndicator.classList.remove('hidden');
    }
    attachCancelReplyListener(); // Ensure listener is attached if not already
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

    // --- Extract Mentions ---
    const mentionRegex = /@(\w+|everyone)/gi; // Match @username or @everyone
    const matches = messageText.match(mentionRegex) || [];
    let mentionedUsernames = [];
    let mentionsEveryone = false;

    matches.forEach(match => {
        const mention = match.substring(1); // Remove '@'
        if (mention.toLowerCase() === 'everyone') {
            mentionsEveryone = true;
        } else if (mention.length > 0) { // Ensure it's not just "@"
            mentionedUsernames.push(mention);
        }
    });

    // Create unique list of mentioned usernames (case-sensitive as typed)
    const uniqueUsernames = [...new Set(mentionedUsernames)];

    // Final mentions array for Firestore
    const mentionsList = [...uniqueUsernames];
    if (mentionsEveryone) {
        mentionsList.push('everyone'); // Add 'everyone' literal string
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
        mentions: mentionsList,
        isPinned: false // *** MODIFIED: Ensure isPinned is set to false for new messages ***
    };

    // --- Add reply data if applicable ---
    if (replyingToMessageId) {
        // Decode HTML entities from the stored senderName before saving
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = replyingToSenderName || ''; // Use stored name (potentially HTML escaped)
        const decodedSenderNameForDb = tempDiv.textContent || tempDiv.innerText || 'Original Message';

        // Decode JS/HTML escapes from the stored preview before saving
        tempDiv.innerHTML = replyingToPreview || ''; // Use stored preview (potentially JS/HTML escaped)
        const decodedPreviewForDb = tempDiv.textContent || tempDiv.innerText || '...';


        messageData.replyTo = replyingToMessageId;
        messageData.replyingToSenderName = decodedSenderNameForDb; // Save decoded name
        messageData.replyPreview = decodedPreviewForDb; // Save decoded preview
        console.log(`[sendChatMessage] Sending as reply to ${replyingToMessageId}`);
    }
    // --- End Reply Data Modification ---

    try {
        console.log(`[sendChatMessage] Saving message with data:`, {
            senderId: messageData.senderId,
            senderName: messageData.senderName,
            textLength: messageData.text.length,
            mentions: messageData.mentions,
            replyTo: messageData.replyTo || null,
            replyingToSenderName: messageData.replyingToSenderName || null,
            replyPreview: messageData.replyPreview || null,
            isPinned: messageData.isPinned // Log isPinned status
        });
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
 * *** NEW: Toggles the pinned status of a chat message (Admin only). ***
 * @param {string} messageId - The Firestore document ID of the message.
 */
export async function togglePinMessage(messageId) {
    // Check if the current user is the admin
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        console.warn("[togglePinMessage] Permission denied: Only admins can pin/unpin messages.");
        // Optionally alert the user, though the button shouldn't be visible anyway
        // alert("You do not have permission to perform this action.");
        return;
    }

    // Check if Firestore is available
    if (!db) {
        console.error("[togglePinMessage] Chat Error: Firestore DB not available.");
        alert("Error: Cannot connect to database.");
        return;
    }

    // Check if messageId is provided
    if (!messageId) {
        console.error("[togglePinMessage] Chat Error: Message ID missing for toggle pin operation.");
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
            // No UI element to update here, just exit
            return;
        }

        const messageData = docSnap.data();
        // Determine the current status (default to false if field doesn't exist)
        const currentPinnedStatus = messageData.isPinned === true;
        const newPinnedStatus = !currentPinnedStatus; // Toggle the status

        console.log(`[togglePinMessage] Toggling pin status from ${currentPinnedStatus} to ${newPinnedStatus} for message ${messageId}`);

        // Update only the 'isPinned' field in Firestore
        // Ensure the rule allows this update for admins.
        await messageRef.update({ isPinned: newPinnedStatus }); // Use compat syntax

        console.log(`[togglePinMessage] Successfully ${newPinnedStatus ? 'pinned' : 'unpinned'} message ${messageId}.`);

        // Note: The UI update (changing button style, adding/removing highlight)
        // will be handled automatically by the onSnapshot listener re-rendering the message.
        // If snapshot listener wasn't used, we'd manually update the DOM here.

    } catch (error) {
        console.error(`[togglePinMessage] Error updating pin status for message ${messageId}:`, error);
        alert(`Failed to update pin status: ${error.message}`);
    } finally {
        hideLoading();
    }
}


/**
 * *** NEW: Placeholder function to show pinned messages. ***
 * (Actual implementation would involve querying Firestore).
 */
export function showPinnedMessages() {
    console.log("Show Pinned Messages clicked");
    alert("Feature to view pinned messages is not implemented yet.");
    // Future implementation ideas:
    // 1. Query Firestore:
    //    const pinnedQuery = db.collection(CHAT_COLLECTION)
    //                      .where('isPinned', '==', true)
    //                      .orderBy('timestamp', 'desc')
    //                      .limit(20); // Limit results for performance
    //    const snapshot = await pinnedQuery.get();
    // 2. Render the results in a separate modal, a side panel, or filter the main chat view.
    // 3. Handle pagination or loading more if needed.
    // 4. Provide a way to jump to the original message context.
}

// --- REMOVED Notification Functions ---
// notifyNewMention function removed.
// clearMentionNotification function removed.
// --- End Notification Functions ---


/**
 * Subscribes to real-time updates for chat messages using onSnapshot.
 * Checks for mentions in new messages and triggers notifications.
 * Handles UI updates for added, modified (e.g., pin status change), and removed messages.
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
        let shouldScroll = false; // Flag to decide if scrolling is needed

        // Process changes and check for mentions
        snapshot.docChanges().forEach(change => {
            const messageData = change.doc.data();
            const messageId = change.doc.id;

            if (change.type === "added") {
                 shouldScroll = true; // Scroll on new messages
                // Mention check logic (remains the same, but notification call removed)
                if (currentUser && messageData.senderId !== currentUser.uid) {
                    const mentions = messageData.mentions || [];
                    const currentUsernameLower = currentUser.username?.toLowerCase();
                    const currentDisplayNameLower = currentUser.displayName?.toLowerCase();
                    const mentionsEveryone = mentions.some(m => m?.toLowerCase() === 'everyone');
                    let mentionsMe = false;
                    if (currentUsernameLower || currentDisplayNameLower) {
                         mentionsMe = mentions.some(mentionUsername => {
                            if (!mentionUsername || mentionUsername.toLowerCase() === 'everyone') return false;
                            const mentionLower = mentionUsername.toLowerCase();
                            return (currentUsernameLower && mentionLower === currentUsernameLower) ||
                                   (currentDisplayNameLower && mentionLower === currentDisplayNameLower);
                        });
                    }
                    if (mentionsEveryone || mentionsMe) {
                         console.log(`[subscribeToChatMessages] Mention detected for user ${currentUser.uid} in message ${messageId}. (Notification function removed)`);
                         // REMOVED: notifyNewMention();
                    }
                } else if (!currentUser) {
                     console.warn(`[subscribeToChatMessages] Received new message ${messageId} but currentUser is null, cannot check mentions.`);
                }
            } else if (change.type === 'modified') {
                 console.log(`[subscribeToChatMessages] Message modified: ${messageId}`);
                 // Modification could be pin status, text edit (if allowed), etc.
                 // The full re-render below will handle updating the appearance.
            } else if (change.type === 'removed') {
                 console.log(`[subscribeToChatMessages] Message removed: ${change.doc.id}`);
                 // Removal handled by the full render below.
                 // Optional: Direct DOM removal for slightly faster visual feedback
                 // const elementToRemove = document.querySelector(`.chat-message-container[data-message-id="${change.doc.id}"]`);
                 // if (elementToRemove) elementToRemove.remove();
            }
        });
        // --- End mention check and change processing ---

        // --- Render full message list ---
        // Get all docs from the *current* snapshot (which includes adds/mods/removes)
        const messages = snapshot.docs
            .map(doc => ({ id: doc.id, data: doc.data() }))
            // Sort by timestamp ascending for correct display order
            .sort((a, b) => (a.data.timestamp?.toMillis() || 0) - (b.data.timestamp?.toMillis() || 0));

        if (messages.length > 0) {
             hasMessages = true;
             let messagesHtml = '';
             messages.forEach(msg => {
                 messagesHtml += renderChatMessage(msg.data, msg.id); // Uses the updated render function
             });
             chatContentElement.innerHTML = messagesHtml;

             // Scroll to bottom if user was near the bottom OR if a new message was added
             requestAnimationFrame(() => {
                  if (wasScrolledToBottom || shouldScroll) {
                      chatContentElement.scrollTop = chatContentElement.scrollHeight;
                  }
             });
        } else {
             // If the snapshot is now empty after removals
             chatContentElement.innerHTML = '<p class="text-center text-muted p-4">No messages yet. Start the conversation!</p>';
             hasMessages = false; // Explicitly set
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
 * Clears reply state upon opening.
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

    // --- Clear any existing mention notification (REMOVED) ---
    // REMOVED: clearMentionNotification();

    // --- Cancel any existing reply state ---
    cancelReply();

    // --- Remove existing modal if present ---
    const existingModal = document.getElementById('global-chat-modal');
    if (existingModal) {
        console.log("[showGlobalChat] Closing existing chat modal before opening new one.");
        const closeBtn = existingModal.querySelector('#close-chat-btn');
        if (closeBtn) {
             closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        } else {
            existingModal.remove();
            if (unsubscribeChat) {
                 console.warn("[showGlobalChat] Force unsubscribing chat listener during modal cleanup (no close button found).");
                 unsubscribeChat();
                 unsubscribeChat = null;
            }
        }
        // Wait a short moment for the close animation/cleanup before recreating
        setTimeout(() => createAndShowChatModal(), 100);
        return;
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

     // *** MODIFIED: Added "View Pinned" button in the header ***
     const modalHtml = `
        <div id="global-chat-modal" class="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center z-50 p-0 animate-fade-in">
            <div class="bg-white dark:bg-gray-800 shadow-xl w-full h-full flex flex-col">
                <!-- Header -->
                <div class="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div class="flex items-center gap-2">
                         <h3 class="text-lg font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-2">
                            <!-- Logos will be handled by CSS -->
                            <svg class="logo-light-mode w-5 h-5 mr-1 inline-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                            <svg class="logo-dark-mode w-5 h-5 mr-1 inline-block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                            Global Chat
                         </h3>
                         <!-- *** ADDED Pinned Button *** -->
                         <button id="view-pinned-btn" class="ml-4 text-sm btn-secondary px-2 py-1 flex items-center" title="View Pinned Messages">
                             <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" transform="rotate(-45 10 10)"/><path d="M7 2a1 1 0 00-1 1v1a1 1 0 001 1h1a1 1 0 001-1V3a1 1 0 00-1-1H7zM7 15a1 1 0 011-1h1a1 1 0 110 2H8a1 1 0 01-1-1z" /></svg>
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
                    <form id="chat-send-form" class="flex items-start space-x-2">
                        <textarea id="global-chat-input" placeholder="Type message (@mention, Enter to send, Shift+Enter for newline)" class="flex-grow form-control py-2 px-3 text-sm" rows="1" style="resize: none; overflow-y: hidden; min-height: 40px;" maxlength="1000"></textarea>
                        <button type="submit" id="send-chat-btn" class="btn-primary flex-shrink-0 px-3 py-2 self-center" title="Send Message">
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
    // *** MODIFIED: Get reference to the new button ***
    const viewPinnedButton = document.getElementById('view-pinned-btn');

    // Auto-resize textarea
    const adjustTextareaHeight = () => {
        if (!chatInputElement) return;
        chatInputElement.style.height = 'auto';
        const maxHeight = 120;
        const scrollHeight = chatInputElement.scrollHeight;
        const newHeight = Math.min(scrollHeight, maxHeight);
        chatInputElement.style.height = `${newHeight}px`;
        chatInputElement.style.overflowY = newHeight >= maxHeight ? 'auto' : 'hidden';
        const sendButton = document.getElementById('send-chat-btn');
         if (sendButton) {
            sendButton.classList.toggle('self-end', newHeight > 45);
            sendButton.classList.toggle('self-center', newHeight <= 45);
         }
    };
    chatInputElement.addEventListener('input', adjustTextareaHeight);
    requestAnimationFrame(adjustTextareaHeight);

    let handleEscKeyListener = null;

    const closeChat = () => {
        console.log("[closeChat] Function called.");
        cancelReply();
        if (unsubscribeChat) {
            console.log("[closeChat] Unsubscribing from chat messages.");
            unsubscribeChat();
            unsubscribeChat = null;
        } else {
            console.log("[closeChat] No active chat subscription found to unsubscribe.");
        }
        if (chatModalElement) {
            console.log("[closeChat] Removing chat modal element.");
            chatModalElement.classList.remove('animate-fade-in');
            chatModalElement.style.transition = 'opacity 0.2s ease-out';
            chatModalElement.style.opacity = '0';
            setTimeout(() => {
                 chatModalElement.remove();
                 console.log("[closeChat] Modal element removed.");
                 if (handleEscKeyListener) {
                     console.log("[closeChat] Removing Esc key listener post-removal.");
                     document.removeEventListener('keydown', handleEscKeyListener);
                     handleEscKeyListener = null;
                 }
            }, 200);
        } else {
             console.log("[closeChat] Chat modal element already removed or not found.");
             if (handleEscKeyListener) {
                 console.log("[closeChat] Removing Esc key listener (fallback).");
                 document.removeEventListener('keydown', handleEscKeyListener);
                 handleEscKeyListener = null;
             }
        }
    };

    // Subscribe to messages
    console.log("[createAndShowChatModal] Calling subscribeToChatMessages...");
    unsubscribeChat = subscribeToChatMessages(chatContentElement);

    // Setup event listeners
    sendForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendChatMessage('global-chat-input');
        setTimeout(adjustTextareaHeight, 0);
    });

    chatInputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendForm.requestSubmit();
            setTimeout(adjustTextareaHeight, 0);
        } else if (e.key === 'Enter' && e.shiftKey) {
             setTimeout(adjustTextareaHeight, 0);
        }
        setTimeout(adjustTextareaHeight, 0);
    });

    if (closeButton) {
        closeButton.addEventListener('click', closeChat);
    } else {
        console.error("[createAndShowChatModal] Critical Error: Close button not found!");
    }

    // *** MODIFIED: Add event listener for the "View Pinned" button ***
    if (viewPinnedButton) {
        // Remove inline handler if accidentally added
        viewPinnedButton.onclick = null;
        viewPinnedButton.addEventListener('click', () => {
            showPinnedMessages(); // Call the placeholder function
        });
         console.log("[createAndShowChatModal] Added listener to 'View Pinned' button.");
    } else {
         console.warn("[createAndShowChatModal] Could not find 'View Pinned' button to attach listener.");
    }

    handleEscKeyListener = (event) => {
        // Check if modal exists and if the event target is inside the modal
        if (event.key === 'Escape' && chatModalElement && chatModalElement.contains(event.target)) {
            console.log("[handleEscKey] Escape key pressed inside modal, closing chat.");
            closeChat();
        }
    };
    document.removeEventListener('keydown', handleEscKeyListener); // Ensure no duplicates
    document.addEventListener('keydown', handleEscKeyListener);
    console.log("[createAndShowChatModal] Added Esc key listener.");

    attachCancelReplyListener();

    setTimeout(() => {
        chatInputElement?.focus();
        console.log("[createAndShowChatModal] Focused chat input.");
    }, 150);

    const styleId = 'chat-logo-styles';
    if (!document.getElementById(styleId)) {
        const logoStyle = document.createElement('style');
        logoStyle.id = styleId;
        document.head.appendChild(logoStyle);
        console.log("[createAndShowChatModal] Added chat logo style container (styles in styles.css).");
    }

    // *** MODIFIED: Expose new functions globally ***
    window.deleteChatMessage = deleteChatMessage;
    window.startReply = startReply;
    window.cancelReply = cancelReply;
    window.togglePinMessage = togglePinMessage; // Added
    window.showPinnedMessages = showPinnedMessages; // Added

    console.log("[createAndShowChatModal] Chat modal setup complete.");
}


// Make top-level functions globally accessible if needed by other parts of the app
window.showGlobalChat = showGlobalChat;
window.deleteChatMessage = deleteChatMessage;
window.startReply = startReply;
window.cancelReply = cancelReply;
window.togglePinMessage = togglePinMessage; // Ensure it's exposed
window.showPinnedMessages = showPinnedMessages; // Ensure it's exposed

// --- END OF FILE ui_chat.js ---