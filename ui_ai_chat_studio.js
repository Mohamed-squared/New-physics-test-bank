// --- START OF FILE ui_ai_chat_studio.js ---

import { currentUser, db, userAiChatSettings, globalAiSystemPrompts } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml, renderMathIn } from './utils.js';
import { callGeminiTextAPI } from './ai_integration.js';
import { DEFAULT_AI_SYSTEM_PROMPTS } from './ai_prompts.js';
import { saveChatSession, loadUserChatSessionsFromFirestore, deleteChatSessionFromFirestore } from './firebase_firestore.js';

// Module-level variables
let chatSessions = new Map(); // Stores { sessionId: { name: string, history: Array<MessageObject>, createdAt: number, systemPromptKey: string, lastModified: number } }
let activeChatSessionId = null;
const defaultSystemPromptKey = 'aiChatStudioDefault';

/**
 * MessageObject structure:
 * {
 *   role: 'user' | 'model',
 *   parts: [{ text: string }],
 *   timestamp: number // Milliseconds
 * }
 */

export async function showAiChatStudio() {
    setActiveSidebarLink('showAiChatStudio', 'sidebar-standard-nav');
    displayContent(generateChatStudioHtml(), 'content'); // Display basic structure

    document.getElementById('ai-new-chat-btn')?.addEventListener('click', handleNewChat);
    document.getElementById('ai-chat-input-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSendMessage();
    });
    
    const chatInput = document.getElementById('ai-chat-studio-input');
    if (chatInput) {
        chatInput.addEventListener('input', autoResizeTextarea);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }
    
    await loadUserChatSessions();
    // renderActiveChatInterface(); // Called by loadUserChatSessions
}

async function loadUserChatSessions() {
    if (!currentUser || !db) {
        console.warn("Cannot load chat sessions: User or DB not available.");
        chatSessions.clear(); // Clear local cache if we can't load
        loadChatSessionsList();
        renderActiveChatInterface();
        return;
    }
    showLoading("Loading chat sessions...");
    try {
        const sessionsArray = await loadUserChatSessionsFromFirestore(currentUser.uid);
        chatSessions.clear();
        sessionsArray.forEach(sessionDoc => {
            const sessionData = { ...sessionDoc };
            // Ensure history is an array
            sessionData.history = Array.isArray(sessionData.history) ? sessionData.history : [];
            
            // Convert Firestore Timestamps if they exist (toMillis handles both cases)
            if (sessionData.createdAt && typeof sessionData.createdAt.toMillis === 'function') {
                sessionData.createdAt = sessionData.createdAt.toMillis();
            } else if (typeof sessionData.createdAt === 'number') {
                // Already a number, use as is
            } else {
                sessionData.createdAt = Date.now(); // Fallback
            }

            if (sessionData.lastModified && typeof sessionData.lastModified.toMillis === 'function') {
                sessionData.lastModified = sessionData.lastModified.toMillis();
            } else if (typeof sessionData.lastModified === 'number') {
                // Already a number, use as is
            } else {
                sessionData.lastModified = sessionData.createdAt; // Fallback, use the (potentially just set) createdAt
            }
            chatSessions.set(sessionDoc.id, sessionData);
        });
        console.log(`Loaded ${chatSessions.size} chat sessions from Firestore.`);
    } catch (error) {
        console.error("Error loading chat sessions from Firestore:", error);
        // Keep potentially stale local chatSessions or clear them? For now, clear.
        chatSessions.clear(); 
    } finally {
        hideLoading();
        loadChatSessionsList();
        renderActiveChatInterface(); // Ensure UI updates even if load fails or is empty
    }
}


function generateChatStudioHtml() {
    return `
        <div class="flex flex-col md:flex-row h-[calc(100vh-200px)] md:h-[calc(100vh-160px)] bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
            <!-- Sessions Sidebar -->
            <div id="ai-chat-sessions-sidebar" class="w-full md:w-1/4 bg-gray-50 dark:bg-gray-750 p-4 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <button id="ai-new-chat-btn" class="btn-primary w-full mb-4">New Chat</button>
                <h3 class="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Chat History</h3>
                <ul id="ai-chat-sessions-list" class="overflow-y-auto flex-grow space-y-1 custom-scrollbar">
                    <!-- Session items will be rendered here -->
                </ul>
            </div>

            <!-- Main Chat Area -->
            <div id="ai-main-chat-area" class="flex-1 flex flex-col">
                <div id="ai-chat-header" class="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h2 id="ai-active-session-name" class="text-lg font-semibold text-gray-800 dark:text-gray-200">AI Chat Studio</h2>
                    <!-- Settings button placeholder -->
                </div>

                <div id="ai-chat-studio-messages-container" class="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    <!-- Messages will be rendered here -->
                    <!-- Welcome message placeholder -->
                </div>
                
                <div id="ai-chat-input-area" class="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <form id="ai-chat-input-form" class="flex items-start space-x-2">
                        <textarea id="ai-chat-studio-input" placeholder="Ask Lyra anything..." class="form-control flex-grow py-2 px-3 text-sm" rows="1" style="resize: none; overflow-y: hidden; min-height: 40px;" maxlength="4000"></textarea>
                        <button type="submit" id="ai-send-chat-message-btn" class="btn-primary self-end px-3 py-2" title="Send Message">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                            <span class="sr-only">Send</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function autoResizeTextarea(event) {
    const textarea = event.target;
    textarea.style.height = 'auto'; // Reset height
    const maxHeight = 150; // Max height for textarea
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = newHeight >= maxHeight ? 'auto' : 'hidden';

    const sendButton = document.getElementById('ai-send-chat-message-btn');
    if (sendButton) {
        sendButton.classList.toggle('self-end', newHeight > parseInt(getComputedStyle(textarea).lineHeight, 10) * 1.5);
        sendButton.classList.toggle('self-center', newHeight <= parseInt(getComputedStyle(textarea).lineHeight, 10) * 1.5);
    }
}


function loadChatSessionsList() {
    const listElement = document.getElementById('ai-chat-sessions-list');
    if (!listElement) return;

    listElement.innerHTML = ''; 

    if (chatSessions.size === 0) {
        listElement.innerHTML = `<li class="text-sm text-gray-500 dark:text-gray-400 p-2 text-center">No chat sessions yet.</li>`;
        return;
    }

    const sortedSessions = Array.from(chatSessions.entries()).sort(([, a], [, b]) => {
        const timeA = a.lastModified || a.createdAt;
        const timeB = b.lastModified || b.createdAt;
        return timeB - timeA;
    });

    sortedSessions.forEach(([sessionId, sessionData]) => {
        const li = document.createElement('li');
        li.className = `group p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center justify-between ${sessionId === activeChatSessionId ? 'bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-200 font-semibold' : 'text-gray-700 dark:text-gray-300'}`;
        li.setAttribute('role', 'button');
        li.addEventListener('click', () => handleSwitchChat(sessionId));

        const nameSpan = document.createElement('span');
        nameSpan.className = 'truncate flex-grow';
        nameSpan.textContent = sessionData.name || `Chat ${sessionId.slice(-4)}`;
        nameSpan.title = sessionData.name || `Chat ${sessionId.slice(-4)}`;
        li.appendChild(nameSpan);

        const deleteButton = document.createElement('button');
        const sessionDisplayName = escapeHtml(sessionData.name || `Chat ${sessionId.slice(-4)}`);
        deleteButton.className = "ml-auto p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-700/50 text-red-500 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0";
        deleteButton.title = "Delete Chat";
        deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
        deleteButton.onclick = (event) => {
            event.stopPropagation(); // Prevent li click event
            // Call the globally exposed function
            window.deleteChatSessionUI(sessionId, sessionDisplayName);
        };
        li.appendChild(deleteButton);
        
        listElement.appendChild(li);
    });
}

async function deleteChatSessionUI(sessionId, sessionName) {
    if (!currentUser || !db) {
        alert("Error: Cannot delete session. User not logged in or database unavailable.");
        return;
    }

    const confirmation = confirm(`Are you sure you want to delete the chat session "${sessionName}"? This action cannot be undone.`);
    if (!confirmation) return;

    showLoading("Deleting chat session...");
    try {
        await deleteChatSessionFromFirestore(currentUser.uid, sessionId);
        chatSessions.delete(sessionId);

        if (activeChatSessionId === sessionId) {
            activeChatSessionId = null;
            // Optionally, select the next newest chat or clear the view
            const remainingSessions = Array.from(chatSessions.entries()).sort(([,a],[,b]) => (b.lastModified || b.createdAt) - (a.lastModified || a.createdAt));
            if (remainingSessions.length > 0) {
                 activeChatSessionId = remainingSessions[0][0]; // Get the ID of the first remaining session
            }
        }
        
        loadChatSessionsList();
        renderActiveChatInterface();
        alert(`Chat session "${sessionName}" deleted successfully.`);
    } catch (error) {
        console.error("Error deleting chat session:", error);
        alert(`Failed to delete chat session: ${error.message}`);
    } finally {
        hideLoading();
    }
}
// Expose to window for inline HTML onclick
window.deleteChatSessionUI = deleteChatSessionUI;


function renderActiveChatInterface() {
    const messagesContainer = document.getElementById('ai-chat-studio-messages-container');
    const chatHeaderName = document.getElementById('ai-active-session-name');
    const chatInputArea = document.getElementById('ai-chat-input-area');

    if (!messagesContainer || !chatHeaderName || !chatInputArea) return;

    if (activeChatSessionId && chatSessions.has(activeChatSessionId)) {
        const sessionData = chatSessions.get(activeChatSessionId);
        chatHeaderName.textContent = sessionData.name || `Chat ${activeChatSessionId.slice(-4)}`;
        chatInputArea.classList.remove('hidden');
        renderActiveChatMessages();
    } else {
        chatHeaderName.textContent = 'AI Chat Studio';
        messagesContainer.innerHTML = `<div class="text-center text-gray-500 dark:text-gray-400 p-8">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-7.5h1.5m9 0h1.5" />
            </svg>
            <p>Select a chat from the list or start a new one.</p>
        </div>`;
        chatInputArea.classList.add('hidden');
    }
}

async function handleNewChat() {
    if (!currentUser) {
        alert("Please log in to create a new chat.");
        return;
    }
    const sessionNameInput = prompt("Enter a name for the new chat session (optional):", `Chat ${chatSessions.size + 1}`);
    const sessionName = (sessionNameInput === null) ? null : (sessionNameInput.trim() || `Chat ${chatSessions.size + 1}`);
    
    if (sessionName === null) return; // User cancelled prompt

    const sessionId = `aics_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const systemPromptText = (userAiChatSettings.customSystemPrompts[defaultSystemPromptKey] ||
                             globalAiSystemPrompts[defaultSystemPromptKey] ||
                             DEFAULT_AI_SYSTEM_PROMPTS[defaultSystemPromptKey] ||
                             "You are a helpful AI assistant.");

    const initialHistory = [
        // System prompt as first "user" message with a slightly earlier timestamp to ensure order
        { role: 'user', parts: [{ text: systemPromptText }], timestamp: Date.now() -1 }, 
        // AI's acknowledgement message
        { role: 'model', parts: [{ text: "Okay, I'm ready to help! How can I assist you today?" }], timestamp: Date.now() } 
    ];

    const newSessionData = {
        name: sessionName,
        history: initialHistory,
        createdAt: Date.now(), // Will be converted to Firestore Timestamp on save
        systemPromptKey: defaultSystemPromptKey,
        lastModified: Date.now() // Will be converted/overridden by serverTimestamp on save
    };

    chatSessions.set(sessionId, newSessionData);
    activeChatSessionId = sessionId;

    try {
        // Firestore save will handle timestamp conversions
        await saveChatSession(currentUser.uid, sessionId, newSessionData);
        console.log("New chat session saved to Firestore.");
    } catch (error) {
        console.error("Error saving new chat session to Firestore:", error);
        alert("Failed to save new chat session. It will be available locally but may be lost if you refresh before sending a message.");
        // Optionally, remove from local chatSessions if save fails critically
        // chatSessions.delete(sessionId);
        // activeChatSessionId = null;
    }

    loadChatSessionsList();
    renderActiveChatInterface();
    
    const chatInput = document.getElementById('ai-chat-studio-input');
    if (chatInput) chatInput.focus();
}

function handleSwitchChat(sessionId) {
    if (sessionId === activeChatSessionId) return;

    activeChatSessionId = sessionId;
    loadChatSessionsList(); // Highlight the new active session
    renderActiveChatInterface(); // Render messages for the new active session
    
    const chatInput = document.getElementById('ai-chat-studio-input');
    if (chatInput) chatInput.focus();
}

function renderChatMessage(message, isLastUserMessage = false) {
    const { role, parts, timestamp } = message;
    const textContent = parts[0]?.text || "";
    const isUser = role === 'user';

    const time = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    // Check if this message is part of the initial system setup exchange
    const activeSession = activeChatSessionId ? chatSessions.get(activeChatSessionId) : null;
    const activeSessionHistory = activeSession ? activeSession.history : [];
    
    const isSystemSetupMessage = activeSessionHistory.length > 0 &&
                                 ((message === activeSessionHistory[0] && isUser) || 
                                  (message === activeSessionHistory[1] && !isUser)); 

    if (isSystemSetupMessage) {
        return ''; // Hide these initial system prompt and AI acknowledgement messages
    }

    const bubbleClasses = isUser
        ? 'bg-primary-500 text-white self-end rounded-br-none'
        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 self-start rounded-bl-none';
    
    const copyButtonHtml = !isUser ? `
        <button class="copy-ai-message-btn absolute top-1 right-1 p-1 bg-gray-300 dark:bg-gray-600 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity" title="Copy text">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        </button>
    ` : '';

    let formattedText = escapeHtml(textContent);
    // Apply rich formatting only to model messages
    if (!isUser) {
        // Code blocks (```...```)
        formattedText = formattedText.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
            return `<pre class="bg-gray-100 dark:bg-gray-900 p-2 rounded text-sm my-1 overflow-x-auto whitespace-pre-wrap"><code class="font-mono">${escapeHtml(codeContent.trim())}</code></pre>`;
        });
        // Inline code (`)
        formattedText = formattedText.replace(/`([^`]+?)`/g, '<code class="bg-gray-200 dark:bg-gray-900 px-1 rounded text-sm font-mono">$1</code>');
        // Bold (**...**)
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic (*...*) - make sure not to conflict with bold
        formattedText = formattedText.replace(/(?<!\*)\*(?!\*)(\S(?:.*?\S)?)\*(?!\*)/g, '<em>$1</em>');
        
        // Handle newlines, but preserve them within <pre> blocks
        const textParts = formattedText.split(/(<pre[\s\S]*?<\/pre>)/);
        formattedText = textParts.map((part, index) => {
            if (index % 2 === 1) return part; // This is a <pre> block, return as is
            return part.replace(/\n/g, '<br>'); // Not in <pre>, replace \n with <br>
        }).join('');
    }

    return `
        <div class="flex flex-col ${isUser ? 'items-end' : 'items-start'} group">
            <div class="message-bubble max-w-xl lg:max-w-2xl px-3 py-2 rounded-lg shadow relative ${bubbleClasses}">
                <div class="prose prose-sm dark:prose-invert max-w-none message-content">${formattedText}</div>
                ${copyButtonHtml}
            </div>
            <span class="text-xs text-gray-400 dark:text-gray-500 mt-1 px-1 ${isUser ? 'text-right' : 'text-left'}">${isUser ? 'You' : 'Lyra'} · ${time}</span>
        </div>
    `;
}

async function renderActiveChatMessages() {
    const messagesContainer = document.getElementById('ai-chat-studio-messages-container');
    if (!messagesContainer || !activeChatSessionId || !chatSessions.has(activeChatSessionId)) {
        if (messagesContainer) messagesContainer.innerHTML = ''; // Clear if no active session
        return;
    }

    const sessionData = chatSessions.get(activeChatSessionId);
    messagesContainer.innerHTML = sessionData.history.map((msg, index) => renderChatMessage(msg, index === sessionData.history.length -1 && msg.role === 'user')).join('');
    
    // Add event listeners for copy buttons
    messagesContainer.querySelectorAll('.copy-ai-message-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const messageContentElement = e.currentTarget.closest('.message-bubble').querySelector('.message-content');
            // Create a temporary div to convert <br> to \n for copying
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = messageContentElement.innerHTML.replace(/<br\s*\/?>/gi, '\n');
            // TODO: More sophisticated HTML to plain text conversion might be needed for complex content
            navigator.clipboard.writeText(tempDiv.textContent || tempDiv.innerText || "")
                .then(() => {
                    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`;
                    setTimeout(() => {
                         button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>`;
                    }, 1500);
                })
                .catch(err => console.error('Failed to copy text: ', err));
        });
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    await renderMathIn(messagesContainer); // Render LaTeX if any
}

async function handleSendMessage() {
    const inputElement = document.getElementById('ai-chat-studio-input');
    const sendButton = document.getElementById('ai-send-chat-message-btn');
    if (!inputElement || !activeChatSessionId || !chatSessions.has(activeChatSessionId) || !currentUser) {
        if (!currentUser) alert("Please log in to send messages.");
        return;
    }

    const messageText = inputElement.value.trim();
    if (!messageText) return;

    const sessionData = chatSessions.get(activeChatSessionId);

    inputElement.disabled = true;
    if(sendButton) sendButton.disabled = true;
    
    const userMessage = { role: 'user', parts: [{ text: messageText }], timestamp: Date.now() };
    sessionData.history.push(userMessage);
    sessionData.lastModified = Date.now(); // Update last modified time for the user message
    
    // Firestore save for user message + AI response will happen in the finally block or after successful AI response
    // This allows us to save both in one go, or save user message + error.

    await renderActiveChatMessages(); // Render user message immediately
    inputElement.value = '';
    autoResizeTextarea({target: inputElement});

    showLoading("Lyra is thinking...");
    let errorOccurred = false;

    try {
        // Pass history *excluding* the latest user message for context to the AI call.
        // The callGeminiTextAPI function will add the `messageText` as the final user prompt.
        const historyForApi = sessionData.history.slice(0, -1); 
        const aiResponseText = await callGeminiTextAPI(messageText, historyForApi, sessionData.systemPromptKey);

        const aiMessage = { role: 'model', parts: [{ text: aiResponseText }], timestamp: Date.now() };
        sessionData.history.push(aiMessage);
        sessionData.lastModified = Date.now(); // Update last modified for AI response
        
        // Save after AI response
        await saveChatSession(currentUser.uid, activeChatSessionId, sessionData);

    } catch (error) {
        console.error("Error calling AI:", error);
        const errorMessageText = error.message?.includes("safety settings") 
            ? "I'm sorry, but I can't respond to that due to safety guidelines."
            : `Sorry, I encountered an error: ${error.message}`;
        const errorMessage = { role: 'model', parts: [{ text: errorMessageText }], timestamp: Date.now() };
        sessionData.history.push(errorMessage);
        sessionData.lastModified = Date.now(); // Update last modified for error message
        errorOccurred = true; 
    } finally {
        if (errorOccurred) { // If an error occurred, save the session including the error message
            try {
                console.log("Attempting to save chat session with error message in finally block.");
                await saveChatSession(currentUser.uid, activeChatSessionId, sessionData);
            } catch (saveError) {
                console.error("Failed to save chat session with error in finally block:", saveError);
                alert("There was an issue calling the AI, and the chat session with the error might not have been saved.");
            }
        }
        hideLoading();
        inputElement.disabled = false;
        if(sendButton) sendButton.disabled = false;
        inputElement.focus();
        await renderActiveChatMessages(); // Render AI response or error message
        loadChatSessionsList(); // Refresh session list (e.g., for lastModified order)
    }
}

// --- END OF FILE ui_ai_chat_studio.js ---