// --- START OF FILE ui_ai_chat_studio.js ---

import { currentUser, db, userAiChatSettings, globalAiSystemPrompts } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml, renderMathIn } from './utils.js';
import { callGeminiTextAPI } from './ai_integration.js';
import { DEFAULT_AI_SYSTEM_PROMPTS } from './ai_prompts.js';

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

export function showAiChatStudio() {
    setActiveSidebarLink('showAiChatStudio', 'sidebar-standard-nav');
    displayContent(generateChatStudioHtml(), 'content'); // Display basic structure

    document.getElementById('ai-new-chat-btn')?.addEventListener('click', handleNewChat);
    document.getElementById('ai-chat-input-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSendMessage();
    });
    
    // Textarea auto-resize
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
    
    // TODO: Load chatSessions from Firestore in the future
    // For now, if chatSessions is empty, perhaps create a default one or show welcome.
    loadChatSessionsList();
    renderActiveChatInterface(); // Render based on current activeChatSessionId
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

    // Adjust send button alignment
    const sendButton = document.getElementById('ai-send-chat-message-btn');
    if (sendButton) {
        sendButton.classList.toggle('self-end', newHeight > parseInt(getComputedStyle(textarea).lineHeight, 10) * 1.5);
        sendButton.classList.toggle('self-center', newHeight <= parseInt(getComputedStyle(textarea).lineHeight, 10) * 1.5);
    }
}


function loadChatSessionsList() {
    const listElement = document.getElementById('ai-chat-sessions-list');
    if (!listElement) return;

    listElement.innerHTML = ''; // Clear existing items

    if (chatSessions.size === 0) {
        listElement.innerHTML = `<li class="text-sm text-gray-500 dark:text-gray-400 p-2 text-center">No chat sessions yet.</li>`;
        return;
    }

    // Sort sessions by lastModified (descending) or createdAt if lastModified is not available
    const sortedSessions = Array.from(chatSessions.entries()).sort(([, a], [, b]) => {
        const timeA = a.lastModified || a.createdAt;
        const timeB = b.lastModified || b.createdAt;
        return timeB - timeA;
    });

    sortedSessions.forEach(([sessionId, sessionData]) => {
        const li = document.createElement('li');
        li.className = `p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm truncate ${sessionId === activeChatSessionId ? 'bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-primary-200 font-semibold' : 'text-gray-700 dark:text-gray-300'}`;
        li.textContent = sessionData.name || `Chat ${sessionId.slice(-4)}`;
        li.title = sessionData.name || `Chat ${sessionId.slice(-4)}`;
        li.setAttribute('role', 'button');
        li.addEventListener('click', () => handleSwitchChat(sessionId));
        listElement.appendChild(li);
    });
}

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

function handleNewChat() {
    const sessionNameInput = prompt("Enter a name for the new chat session (optional):", `Chat ${chatSessions.size + 1}`);
    // If user cancels prompt, sessionNameInput will be null. If they enter nothing, it's "".
    const sessionName = (sessionNameInput === null) ? null : (sessionNameInput.trim() || `Chat ${chatSessions.size + 1}`);
    
    if (sessionName === null) return; // User cancelled

    const sessionId = `aics_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Get the default system prompt text
    const systemPromptText = (userAiChatSettings.customSystemPrompts[defaultSystemPromptKey] ||
                             globalAiSystemPrompts[defaultSystemPromptKey] ||
                             DEFAULT_AI_SYSTEM_PROMPTS[defaultSystemPromptKey] ||
                             "You are a helpful AI assistant.");

    // Initialize history with system prompt and a standard AI acknowledgement
    const initialHistory = [
        { role: 'user', parts: [{ text: systemPromptText }], timestamp: Date.now() -1 }, // System prompt as first user message
        { role: 'model', parts: [{ text: "Okay, I'm ready to help! How can I assist you today?" }], timestamp: Date.now() } // AI's acknowledgement
    ];

    const newSessionData = {
        name: sessionName,
        history: initialHistory,
        createdAt: Date.now(),
        systemPromptKey: defaultSystemPromptKey,
        lastModified: Date.now()
    };

    chatSessions.set(sessionId, newSessionData);
    activeChatSessionId = sessionId;

    loadChatSessionsList();
    renderActiveChatInterface();
    
    const chatInput = document.getElementById('ai-chat-studio-input');
    if (chatInput) chatInput.focus();

    // TODO: Save new session metadata to Firestore
}

function handleSwitchChat(sessionId) {
    if (sessionId === activeChatSessionId) return; // Already active

    activeChatSessionId = sessionId;
    loadChatSessionsList(); // To update active highlight
    renderActiveChatInterface();
    
    const chatInput = document.getElementById('ai-chat-studio-input');
    if (chatInput) chatInput.focus();
}

function renderChatMessage(message, isLastUserMessage = false) {
    const { role, parts, timestamp } = message;
    const textContent = parts[0]?.text || "";
    const isUser = role === 'user';

    const time = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    // For system prompt (first user message) and AI's first ack, style them less prominently if desired
    const isSystemSetupMessage = (message === chatSessions.get(activeChatSessionId)?.history[0] && isUser) ||
                                 (message === chatSessions.get(activeChatSessionId)?.history[1] && !isUser);

    const bubbleClasses = isUser
        ? 'bg-primary-500 text-white self-end rounded-br-none'
        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 self-start rounded-bl-none';
    
    const systemMessageClasses = isSystemSetupMessage ? 'opacity-70 italic text-xs' : '';

    const copyButtonHtml = !isUser && !isSystemSetupMessage ? `
        <button class="copy-ai-message-btn absolute top-1 right-1 p-1 bg-gray-300 dark:bg-gray-600 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity" title="Copy text">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        </button>
    ` : '';

    // Apply Markdown for model messages
    // For user messages, just escape HTML. For model, escape then apply markdown.
    let formattedText = escapeHtml(textContent);
    if (!isUser) {
        // Basic Markdown (subset for now, can expand)
        // Code Blocks (```...```) - Must run first
        formattedText = formattedText.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
            return `<pre class="bg-gray-100 dark:bg-gray-900 p-2 rounded text-sm my-1 overflow-x-auto whitespace-pre-wrap"><code class="font-mono">${escapeHtml(codeContent.trim())}</code></pre>`;
        });
        // Inline Code (`...`)
        formattedText = formattedText.replace(/`([^`]+?)`/g, '<code class="bg-gray-200 dark:bg-gray-900 px-1 rounded text-sm font-mono">$1</code>');
        // Bold (**...**)
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic (*...*)
        formattedText = formattedText.replace(/(?<!\*)\*(?!\*)(\S(?:.*?\S)?)\*(?!\*)/g, '<em>$1</em>');
        // Newlines to <br> (outside pre)
        const parts = formattedText.split(/(<pre[\s\S]*?<\/pre>)/);
        formattedText = parts.map((part, index) => {
            if (index % 2 === 1) return part; // It's a <pre> block
            return part.replace(/\n/g, '<br>');
        }).join('');
    }


    return `
        <div class="flex flex-col ${isUser ? 'items-end' : 'items-start'} group">
            <div class="message-bubble max-w-xl lg:max-w-2xl px-3 py-2 rounded-lg shadow relative ${bubbleClasses} ${systemMessageClasses}">
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
            // We need the raw text, not the HTML. The raw text is in sessionData.history.
            // Find the corresponding message in history. This is a bit tricky.
            // A simpler way: store raw text on the button or message element.
            // For now, let's try to get it from the HTML, then remove HTML for a simpler copy.
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = messageContentElement.innerHTML.replace(/<br\s*\/?>/gi, '\n'); // Convert <br> back to newlines
            // Remove pre/code for cleaner copy if needed, or copy as is.
            // For now, copy with potential HTML structure for code blocks.
            navigator.clipboard.writeText(tempDiv.textContent || tempDiv.innerText || "")
                .then(() => {
                    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`; // Checkmark
                    setTimeout(() => {
                         button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>`; // Original icon
                    }, 1500);
                })
                .catch(err => console.error('Failed to copy text: ', err));
        });
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    await renderMathIn(messagesContainer);
}

async function handleSendMessage() {
    const inputElement = document.getElementById('ai-chat-studio-input');
    const sendButton = document.getElementById('ai-send-chat-message-btn');
    if (!inputElement || !activeChatSessionId || !chatSessions.has(activeChatSessionId)) return;

    const messageText = inputElement.value.trim();
    if (!messageText) return;

    const sessionData = chatSessions.get(activeChatSessionId);

    // Disable input and button
    inputElement.disabled = true;
    if(sendButton) sendButton.disabled = true;
    
    // Add user message to UI immediately (optimistic update)
    const userMessage = { role: 'user', parts: [{ text: messageText }], timestamp: Date.now() };
    sessionData.history.push(userMessage);
    sessionData.lastModified = Date.now();
    await renderActiveChatMessages(); // Update UI with user message
    inputElement.value = ''; // Clear input
    autoResizeTextarea({target: inputElement}); // Reset textarea height

    showLoading("Lyra is thinking...");

    try {
        // The history already includes the system prompt (as first user + model turn)
        // We send the entire history leading up to the *new* user message (which is `messageText`)
        // So, `callGeminiTextAPI`'s `history` param should be `sessionData.history.slice(0, -1)`
        // and `prompt` param should be `messageText`.
        const historyForApi = sessionData.history.slice(0, -1); // All messages *before* the current user's input
        const aiResponseText = await callGeminiTextAPI(messageText, historyForApi);

        const aiMessage = { role: 'model', parts: [{ text: aiResponseText }], timestamp: Date.now() };
        sessionData.history.push(aiMessage);
        sessionData.lastModified = Date.now();

    } catch (error) {
        console.error("Error calling AI:", error);
        const errorMessage = { role: 'model', parts: [{ text: `Sorry, I encountered an error: ${error.message}` }], timestamp: Date.now() };
        sessionData.history.push(errorMessage);
        sessionData.lastModified = Date.now(); // Also update lastModified on error
    } finally {
        hideLoading();
        inputElement.disabled = false;
        if(sendButton) sendButton.disabled = false;
        inputElement.focus();
        await renderActiveChatMessages(); // Update UI with AI message or error
        loadChatSessionsList(); // Update session list order by lastModified
        // TODO: Save messages to Firestore
    }
}

// --- END OF FILE ui_ai_chat_studio.js ---