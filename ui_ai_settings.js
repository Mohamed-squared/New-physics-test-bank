// --- START OF FILE ui_ai_settings.js ---
import { currentUser, userAiChatSettings, setUserAiChatSettings, globalAiSystemPrompts, db } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading } from './utils.js';
import { AVAILABLE_AI_MODELS, DEFAULT_PRIMARY_AI_MODEL, DEFAULT_FALLBACK_AI_MODEL } from './config.js';
import { DEFAULT_AI_SYSTEM_PROMPTS, AI_FUNCTION_KEYS} from './ai_prompts.js'
// --- Simulated Firestore Functions (within ui_ai_settings.js for now) ---
// In a real scenario, these would be in firebase_firestore.js and imported
async function simulatedSaveUserAiSettingsToFirestore(userId, settings) {
    if (!userId) {
        console.error('[Simulated] Save User AI Settings: userId is undefined.');
        throw new Error('User ID is required to save settings.');
    }
    console.log('[Simulated] Saving AI Settings to Firestore for user:', userId, settings);
    await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay
    try {
        // Simulate saving to a user-specific document. In real Firestore:
        // await db.collection('users').doc(userId).collection('settings').doc('aiChatSettings').set(settings);
        localStorage.setItem(`userAiSettings_${userId}`, JSON.stringify(settings));
        console.log('[Simulated] AI Settings saved successfully for user:', userId);
        return true;
    } catch (error) {
        console.error('[Simulated] Error saving AI settings for user:', userId, error);
        throw error;
    }
}

async function simulatedLoadUserAiSettingsFromFirestore(userId) {
    if (!userId) {
        console.error('[Simulated] Load User AI Settings: userId is undefined.');
        return null;
    }
    console.log('[Simulated] Loading AI Settings from Firestore for user:', userId);
    await new Promise(resolve => setTimeout(resolve, 400)); // Simulate network delay
    try {
        // Simulate loading from Firestore. In real Firestore:
        // const doc = await db.collection('users').doc(userId).collection('settings').doc('aiChatSettings').get();
        // if (doc.exists) return doc.data();
        const storedSettings = localStorage.getItem(`userAiSettings_${userId}`);
        if (storedSettings) {
            console.log('[Simulated] AI Settings loaded for user:', userId);
            return JSON.parse(storedSettings);
        }
        console.log('[Simulated] No AI Settings found for user:', userId, '. Returning null.');
        return null;
    } catch (error) {
        console.error('[Simulated] Error loading AI settings for user:', userId, error);
        return null; // Or throw error depending on desired handling
    }
}
// --- End Simulated Firestore Functions ---

function formatAiFunctionKey(key) {
    return key
        .replace(/([A-Z0-9])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
}

async function renderAiSettingsForm() {
    if (!currentUser) {
        displayContent("<p>Please log in to manage AI settings.</p>");
        return;
    }

    // Ensure userAiChatSettings is populated, possibly from a load if not already done
    // This would typically happen on login or when this page is first accessed.
    // For this simulation, we assume userAiChatSettings in state.js is the source of truth
    // until "Save All Settings to Cloud" successfully loads new settings.

    let formHtml = `<div class="content-card">
        <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">AI Model & System Prompt Settings</h2>`;

    // --- Model Selection ---
    formHtml += `
        <div class="mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
            <h3 class="text-xl font-medium mb-4 text-gray-700 dark:text-gray-300">Model Configuration</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="primary-ai-model" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary AI Model</label>
                    <select id="primary-ai-model" class="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100">
                        ${AVAILABLE_AI_MODELS.map(model => `<option value="${model}" ${userAiChatSettings.primaryModel === model ? 'selected' : ''}>${model}</option>`).join('')}
                    </select>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Main model for generation tasks.</p>
                </div>
                <div>
                    <label for="fallback-ai-model" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fallback AI Model</label>
                    <select id="fallback-ai-model" class="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100">
                        ${AVAILABLE_AI_MODELS.map(model => `<option value="${model}" ${userAiChatSettings.fallbackModel === model ? 'selected' : ''}>${model}</option>`).join('')}
                    </select>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Used if the primary model fails or is unavailable.</p>
                </div>
            </div>
        </div>
    `;

    // --- System Prompts Configuration ---
    formHtml += `
        <div class="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-gray-800">
            <h3 class="text-xl font-medium mb-4 text-gray-700 dark:text-gray-300">System Prompts</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Customize the instructions given to the AI for specific tasks. Prompts are applied in order of preference: User Custom > Global Default (if any) > Application Default.</p>
            <div class="space-y-6">
    `;

    for (const key of AI_FUNCTION_KEYS) {
        const userCustomPrompt = userAiChatSettings.customSystemPrompts[key];
        const globalDefaultPrompt = globalAiSystemPrompts[key]; // Assumed to be loaded into state
        const hardcodedDefaultPrompt = DEFAULT_AI_SYSTEM_PROMPTS[key];

        let effectivePrompt = hardcodedDefaultPrompt;
        let source = "Application Default";

        if (globalDefaultPrompt !== undefined) {
            effectivePrompt = globalDefaultPrompt;
            source = "Global Default";
        }
        if (userCustomPrompt !== undefined) {
            effectivePrompt = userCustomPrompt;
            source = "User Custom";
        }
        
        const friendlyKeyName = formatAiFunctionKey(key);

        formHtml += `
            <div class="p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="text-md font-semibold text-gray-700 dark:text-gray-300">${friendlyKeyName}</h4>
                    <span class="text-xs px-2 py-0.5 rounded-full ${
                        source === 'User Custom' ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' :
                        source === 'Global Default' ? 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                    }">${source}</span>
                </div>
                <textarea id="prompt-textarea-${key}" rows="4" class="w-full p-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500" readonly>${effectivePrompt || ''}</textarea>
                <div id="prompt-actions-${key}" class="mt-2 flex flex-wrap gap-2 items-center">
                    <button onclick="window.handleEditPrompt('${key}')" class="btn-secondary btn-sm prompt-edit-btn">Edit</button>
                    <button onclick="window.handleSavePromptChange('${key}')" class="btn-primary btn-sm prompt-save-btn" style="display:none;">Save This Prompt</button>
                    <button onclick="window.handleCancelPromptEdit('${key}')" class="btn-neutral btn-sm prompt-cancel-btn" style="display:none;">Cancel Edit</button>
                    <button onclick="window.handleResetPromptToDefault('${key}')" class="btn-danger-outline btn-sm prompt-reset-btn" style="display:none;">Reset This Prompt</button>
                </div>
            </div>
        `;
    }

    formHtml += `</div></div>`; // Close space-y-6 and System Prompts card

    // --- Global Save Button ---
    formHtml += `
        <div class="mt-8 flex justify-end">
            <button onclick="window.saveAllAiSettingsToCloud()" class="btn-primary btn-lg">Save All Settings to Cloud</button>
        </div>
    `;

    formHtml += `</div>`; // Close content-card

    await displayContent(formHtml, 'content');

    // Store original values for cancel functionality
    AI_FUNCTION_KEYS.forEach(key => {
        const textarea = document.getElementById(`prompt-textarea-${key}`);
        if (textarea) {
            textarea.dataset.originalValue = textarea.value;
        }
    });
}

window.handleEditPrompt = (key) => {
    const textarea = document.getElementById(`prompt-textarea-${key}`);
    if (!textarea) return;

    textarea.dataset.preEditValue = textarea.value; // Store value at the moment of editing
    textarea.readOnly = false;
    textarea.classList.remove('bg-white', 'dark:bg-gray-700');
    textarea.classList.add('bg-yellow-50', 'dark:bg-yellow-700/20'); // Highlight editable

    document.querySelector(`#prompt-actions-${key} .prompt-edit-btn`).style.display = 'none';
    document.querySelector(`#prompt-actions-${key} .prompt-save-btn`).style.display = 'inline-flex';
    document.querySelector(`#prompt-actions-${key} .prompt-cancel-btn`).style.display = 'inline-flex';
    document.querySelector(`#prompt-actions-${key} .prompt-reset-btn`).style.display = 'inline-flex';
};

window.handleSavePromptChange = async (key) => {
    const textarea = document.getElementById(`prompt-textarea-${key}`);
    if (!textarea || !currentUser) return;

    showLoading("Saving prompt...");
    const newPromptValue = textarea.value.trim();

    const globalDefaultPrompt = globalAiSystemPrompts[key];
    const hardcodedDefaultPrompt = DEFAULT_AI_SYSTEM_PROMPTS[key];
    const effectiveDefault = globalDefaultPrompt !== undefined ? globalDefaultPrompt : hardcodedDefaultPrompt;

    const newCustomPrompts = { ...userAiChatSettings.customSystemPrompts };
    if (newPromptValue && newPromptValue !== effectiveDefault) {
        newCustomPrompts[key] = newPromptValue;
    } else {
        delete newCustomPrompts[key]; // Clears custom prompt if it's empty or same as default
    }
    
    setUserAiChatSettings({
        ...userAiChatSettings,
        customSystemPrompts: newCustomPrompts
    });

    // No actual cloud save here, just local state update. Cloud save is via global button.
    // Re-render the form to reflect changes and reset button states
    await renderAiSettingsForm();
    hideLoading();
    // Scroll to the edited prompt for better UX
    const editedElement = document.getElementById(`prompt-textarea-${key}`);
    if (editedElement) {
        editedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Briefly highlight the saved prompt
        const parentDiv = editedElement.closest('div.p-3');
        if(parentDiv) {
            parentDiv.classList.add('flash-success');
            setTimeout(() => parentDiv.classList.remove('flash-success'), 1500);
        }
    }
};

window.handleCancelPromptEdit = async (key) => {
    const textarea = document.getElementById(`prompt-textarea-${key}`);
    if (!textarea) return;

    textarea.value = textarea.dataset.preEditValue || textarea.dataset.originalValue; // Restore pre-edit or original value
    textarea.readOnly = true;
    textarea.classList.add('bg-white', 'dark:bg-gray-700');
    textarea.classList.remove('bg-yellow-50', 'dark:bg-yellow-700/20');


    document.querySelector(`#prompt-actions-${key} .prompt-edit-btn`).style.display = 'inline-flex';
    document.querySelector(`#prompt-actions-${key} .prompt-save-btn`).style.display = 'none';
    document.querySelector(`#prompt-actions-${key} .prompt-cancel-btn`).style.display = 'none';
    document.querySelector(`#prompt-actions-${key} .prompt-reset-btn`).style.display = 'none';
};

window.handleResetPromptToDefault = async (key) => {
    if (!currentUser) return;
    showLoading("Resetting prompt...");

    const newCustomPrompts = { ...userAiChatSettings.customSystemPrompts };
    delete newCustomPrompts[key]; // Remove the custom prompt for this key

    setUserAiChatSettings({
        ...userAiChatSettings,
        customSystemPrompts: newCustomPrompts
    });
    
    // Re-render to show the change and update button states
    await renderAiSettingsForm();
    hideLoading();
    // Scroll to the edited prompt for better UX
    const resetElement = document.getElementById(`prompt-textarea-${key}`);
     if (resetElement) {
        resetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
         const parentDiv = resetElement.closest('div.p-3');
        if(parentDiv) {
            parentDiv.classList.add('flash-info');
            setTimeout(() => parentDiv.classList.remove('flash-info'), 1500);
        }
    }
};

window.saveAllAiSettingsToCloud = async () => {
    if (!currentUser || !currentUser.uid) {
        alert("Error: Not logged in. Cannot save settings.");
        return;
    }
    showLoading("Saving all AI settings to cloud...");

    const primaryModel = document.getElementById('primary-ai-model').value;
    const fallbackModel = document.getElementById('fallback-ai-model').value;

    // customSystemPrompts are already up-to-date in userAiChatSettings due to per-prompt saves/resets
    const settingsToSave = {
        primaryModel: primaryModel,
        fallbackModel: fallbackModel,
        customSystemPrompts: userAiChatSettings.customSystemPrompts
    };

    try {
        await simulatedSaveUserAiSettingsToFirestore(currentUser.uid, settingsToSave);
        // After successful save, reload settings from "source of truth" and update state
        const loadedSettings = await simulatedLoadUserAiSettingsFromFirestore(currentUser.uid);
        if (loadedSettings) {
            setUserAiChatSettings(loadedSettings);
        } else {
            // Fallback to defaults if loading somehow fails or returns null after a save
             setUserAiChatSettings({
                primaryModel: DEFAULT_PRIMARY_AI_MODEL,
                fallbackModel: DEFAULT_FALLBACK_AI_MODEL,
                customSystemPrompts: {}
            });
        }
        await renderAiSettingsForm(); // Re-render with freshly loaded/updated settings
        hideLoading();
        alert("AI settings saved successfully!");
         const globalSaveButton = document.querySelector('button[onclick="window.saveAllAiSettingsToCloud()"]');
        if (globalSaveButton && globalSaveButton.parentElement) {
            globalSaveButton.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            globalSaveButton.classList.add('flash-success-intense');
            setTimeout(() => globalSaveButton.classList.remove('flash-success-intense'), 2000);
        }

    } catch (error) {
        hideLoading();
        console.error("Failed to save AI settings to cloud:", error);
        alert(`Error saving AI settings: ${error.message}. Please try again.`);
    }
};

export async function showAiChatSettings() {
    if (!currentUser) {
        showLoginUI(); // Or some other appropriate action
        return;
    }
    setActiveSidebarLink('showAiChatSettings');
    showLoading("Loading AI Settings...");
    
    // Attempt to load user settings if they haven't been loaded yet this session
    // This is a common pattern: load on view if not already present in state
    if (currentUser && currentUser.uid) { // Ensure currentUser and uid are available
        const loadedSettings = await simulatedLoadUserAiSettingsFromFirestore(currentUser.uid);
        if (loadedSettings) {
            // Check if loaded settings are different from current state to avoid unnecessary updates/re-renders
            if (JSON.stringify(loadedSettings) !== JSON.stringify(userAiChatSettings)) {
                 setUserAiChatSettings(loadedSettings);
            }
        } else {
            // If no settings in DB, ensure local state is default (it should be already from state.js init)
            // This ensures consistency if user logs out and logs back in, or clears local storage for simulation
             const defaultSettings = {
                primaryModel: DEFAULT_PRIMARY_AI_MODEL,
                fallbackModel: DEFAULT_FALLBACK_AI_MODEL,
                customSystemPrompts: {}
            };
            if (JSON.stringify(userAiChatSettings) !== JSON.stringify(defaultSettings)) {
                setUserAiChatSettings(defaultSettings);
            }
        }
    }

    await renderAiSettingsForm();
    hideLoading();
}
// --- END OF FILE ui_ai_settings.js ---