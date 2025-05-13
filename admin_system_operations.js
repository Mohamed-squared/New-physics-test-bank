// --- START OF FILE admin_system_operations.js ---

import { db, currentUser, globalAiSystemPrompts, setGlobalAiSystemPrompts, courseExamDefaults, setCourseExamDefaults } from './state.js'; // Added courseExamDefaults, setCourseExamDefaults
import { ADMIN_UID, FALLBACK_EXAM_CONFIG } from './config.js'; // Added FALLBACK_EXAM_CONFIG
import { escapeHtml, showLoading, hideLoading } from './utils.js';
import { saveGlobalAiPrompts, fetchAdminTasks, addAdminTask, updateAdminTaskStatus, deleteAdminTask, saveCourseExamDefaults, loadCourseExamDefaults } from './firebase_firestore.js'; // Added saveCourseExamDefaults, loadCourseExamDefaults
import { AI_FUNCTION_KEYS, DEFAULT_AI_SYSTEM_PROMPTS } from './ai_prompts.js';

// --- Admin Tasks Management ---
export async function loadAdminTasksUI() {
    const tasksArea = document.getElementById('admin-tasks-area-content');
    if (!tasksArea) return;
    tasksArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
    const isPrimaryAdmin = currentUser && currentUser.uid === ADMIN_UID;

    try {
        const tasks = await fetchAdminTasks(); // Fetches from Firestore

        if (tasks.length === 0) {
            tasksArea.innerHTML = '<p class="text-sm text-muted">No admin tasks found.</p>';
            return;
        }

        let tasksHtml = '<ul class="space-y-2 list-none p-0">';
        tasks.forEach(task => {
            const taskId = task.id;
            const taskText = escapeHtml(task.text);
            const isDone = task.status === 'done';
            const dateStr = task.createdAt ? task.createdAt.toLocaleDateString() : 'N/A';
            const statusClass = isDone ? 'bg-green-100 dark:bg-green-900/50 line-through text-muted' : 'bg-yellow-50 dark:bg-yellow-900/50';

            const toggleButtonTitle = isDone ? 'Mark as Pending' : 'Mark as Done';
            const toggleButtonDisabled = !isPrimaryAdmin ? 'disabled title="Only Primary Admin can change status"' : `title="${toggleButtonTitle}"`;
            const deleteButtonDisabled = !isPrimaryAdmin || !isDone ? 'disabled' : '';
            const deleteButtonTitle = !isPrimaryAdmin ? "Only Primary Admin can delete tasks" : (!isDone ? "Task must be 'done' to delete" : "Delete Task");

            const buttonIcon = isDone ?
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-green-600 dark:text-green-400"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>' :
                '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-gray-500 dark:text-gray-400"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';

            tasksHtml += `
                <li class="flex items-center gap-3 p-2 rounded border dark:border-gray-600 ${statusClass}">
                    <button
                        onclick="window.handleToggleAdminTaskStatus('${taskId}', ${isDone})"
                        class="btn-icon flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${!isPrimaryAdmin ? 'cursor-not-allowed opacity-50' : ''}"
                        ${toggleButtonDisabled}>
                        ${buttonIcon}
                    </button>
                    <span class="text-sm flex-grow ${isDone ? 'opacity-70' : ''}">${taskText}</span>
                    <span class="text-xs text-muted flex-shrink-0 pr-2">${dateStr}</span>
                    <button
                        onclick="window.handleDeleteAdminTask('${taskId}')"
                        class="btn-danger-small text-xs flex-shrink-0 ${(!isPrimaryAdmin || !isDone) ? 'opacity-50 cursor-not-allowed' : ''}"
                        title="${deleteButtonTitle}"
                        ${deleteButtonDisabled}>
                        Delete
                    </button>
                </li>
            `;
        });
        tasksHtml += '</ul>';
        tasksArea.innerHTML = tasksHtml;
    } catch (error) {
        console.error("Error loading admin tasks for UI:", error);
        tasksArea.innerHTML = `<p class="text-red-500 text-sm">Error loading tasks: ${error.message}</p>`;
    }
}

export async function handleAddAdminTask() {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Permission Denied: Only the Primary Admin can add tasks."); return;
    }
    const input = document.getElementById('admin-new-task-input');
    if (!input) return;
    const taskText = input.value.trim();
    if (!taskText) { alert("Please enter task text."); input.focus(); return; }

    showLoading("Adding task...");
    try {
        const newTaskId = await addAdminTask(taskText);
        if (newTaskId) { input.value = ''; loadAdminTasksUI(); }
    } catch (error) { console.error("Error in handleAddAdminTask UI:", error); }
    finally { hideLoading(); }
}

export async function handleToggleAdminTaskStatus(taskId, isCurrentlyDone) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Permission Denied: Only Primary Admin can change task status."); return;
    }
    const newStatus = isCurrentlyDone ? 'pending' : 'done';
    showLoading(`Updating task status to ${newStatus}...`);
    try {
        const success = await updateAdminTaskStatus(taskId, newStatus);
        if (success) loadAdminTasksUI();
    } catch (error) { console.error("Error in handleToggleAdminTaskStatus UI:", error); }
    finally { hideLoading(); }
}

export async function handleDeleteAdminTask(taskId) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Permission Denied: Only Primary Admin can delete tasks."); return;
    }
    if (!confirm(`Are you sure you want to delete this completed task (ID: ${taskId})? This action requires the task to be 'done'.`)) return;

    showLoading("Deleting task...");
    try {
        const success = await deleteAdminTask(taskId);
        if (success) loadAdminTasksUI();
    } catch (error) { console.error("Error in handleDeleteAdminTask UI:", error); }
    finally { hideLoading(); }
}

// --- Global AI System Prompts Management ---
function formatAiFunctionKeyForDisplay(key) {
    return key.replace(/([A-Z0-9])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
}

export function renderGlobalAiPromptsAdminUI() {
    const promptsArea = document.getElementById('admin-global-ai-prompts-content');
    if (!promptsArea) {
        console.error("Admin Global AI Prompts content area not found."); return;
    }
    const isPrimaryAdmin = currentUser && currentUser.uid === ADMIN_UID;
    let html = '';

    AI_FUNCTION_KEYS.forEach(key => {
        const currentGlobalValue = globalAiSystemPrompts[key] || "";
        const defaultValue = DEFAULT_AI_SYSTEM_PROMPTS[key] || "No default defined.";
        const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '-'); // For HTML ID
        html += `
            <div class="prompt-item border-t dark:border-gray-600 pt-4 mt-4 first:mt-0 first:border-t-0">
                <label for="global-prompt-${sanitizedKey}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ${escapeHtml(formatAiFunctionKeyForDisplay(key))}
                </label>
                <textarea id="global-prompt-${sanitizedKey}" name="${escapeHtml(key)}" rows="4"
                          class="w-full text-sm p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-200 form-control"
                          placeholder="Enter custom global prompt for ${escapeHtml(key)}..."
                          ${!isPrimaryAdmin ? 'readonly' : ''}>${escapeHtml(currentGlobalValue)}</textarea>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <strong>Default:</strong> <span class="font-mono whitespace-pre-wrap">${escapeHtml(defaultValue)}</span>
                </p>
            </div>
        `;
    });
    promptsArea.innerHTML = html || '<p class="text-muted text-sm">No AI function keys defined.</p>';
}

export async function handleSaveGlobalPromptsToFirestore() {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Permission Denied: Only Primary Admin can save global AI prompts."); return;
    }
    const newGlobalPrompts = {};
    AI_FUNCTION_KEYS.forEach(key => {
        const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, '-');
        const textarea = document.getElementById(`global-prompt-${sanitizedKey}`);
        if (textarea) newGlobalPrompts[key] = textarea.value.trim();
        else console.warn(`Textarea for prompt key ${key} not found.`);
    });

    showLoading("Saving Global AI Prompts...");
    try {
        const success = await saveGlobalAiPrompts(newGlobalPrompts);
        if (success) {
            setGlobalAiSystemPrompts(newGlobalPrompts);
            alert("Global AI System Prompts saved successfully!");
            renderGlobalAiPromptsAdminUI(); // Re-render to reflect potentially merged state
        }
    } catch (error) { console.error("Error in handleSaveGlobalPromptsToFirestore UI:", error); }
    finally { hideLoading(); }
}

// --- Chat Auto-Deletion Settings ---
export async function loadChatAutoDeleteSettingAdmin() {
    const selectElement = document.getElementById('chat-auto-delete-select-input');
    const statusArea = document.getElementById('chat-auto-delete-status-text');
    if (!selectElement || !statusArea) return;
    statusArea.innerHTML = `<span class="text-muted text-xs">Loading setting...</span>`;

    try {
        if (!db) { statusArea.innerHTML = `<p class="text-red-500 text-xs">DB connection error.</p>`; return; }
        const settingsRef = db.collection('settings').doc('chat');
        const docSnap = await settingsRef.get();
        const currentDays = docSnap.exists ? (docSnap.data()?.autoDeleteDays ?? 0) : 0;
        selectElement.value = [0, 7, 30, 90].includes(currentDays) ? currentDays.toString() : "0";
        statusArea.innerHTML = '';
    } catch (error) {
        console.error("Error loading chat auto-delete setting:", error);
        statusArea.innerHTML = `<p class="text-red-500 text-xs">Error: ${error.message}</p>`;
        selectElement.value = "0";
    }
}

export async function saveChatAutoDeleteSettingAdmin() {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Primary Admin privileges required."); return;
    }
    const selectElement = document.getElementById('chat-auto-delete-select-input');
    const statusArea = document.getElementById('chat-auto-delete-status-text');
    if (!selectElement || !statusArea) return;

    const selectedValue = parseInt(selectElement.value);
    if (isNaN(selectedValue) || ![0, 7, 30, 90].includes(selectedValue)) {
        alert("Invalid selection."); return;
    }
    statusArea.innerHTML = ''; showLoading("Saving setting...");

    try {
        if (!db) { throw new Error("DB connection error."); }
        const settingsRef = db.collection('settings').doc('chat');
        await settingsRef.set({ autoDeleteDays: selectedValue }, { merge: true });
        statusArea.innerHTML = `<p class="text-green-500 text-xs">Setting saved!</p>`;
        setTimeout(() => { if(statusArea) statusArea.innerHTML = ''; }, 3000);
    } catch (error) {
        statusArea.innerHTML = `<p class="text-red-500 text-xs">Error: ${error.message}</p>`;
        alert(`Failed to save setting: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// --- START MODIFICATION: Course Exam Defaults Configuration UI and Logic ---
function displayCourseExamDefaultsSection(containerElement) {
    const isPrimaryAdmin = currentUser && currentUser.uid === ADMIN_UID;
    const currentDefaults = courseExamDefaults || FALLBACK_EXAM_CONFIG; // Use state or fallback

    let sectionHtml = `
        <section class="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30 mt-8">
            <h4 class="text-lg font-medium mb-3">Course Exam Defaults Configuration</h4>
            <p class="text-sm text-muted mb-4">
                Set default parameters for various course exam types (Assignments, Weekly Exams, Midcourses, Finals).
                MCQ Ratio (0-1) determines the proportion of MCQs. Text Source Ratio (0-1) determines proportion from Text-based sources (vs. Lecture-based).
                <strong>Only Primary Admin can save these global defaults.</strong>
            </p>
            <form id="course-exam-defaults-form" class="space-y-6">
    `;

    for (const examType in FALLBACK_EXAM_CONFIG) {
        const config = currentDefaults[examType] || FALLBACK_EXAM_CONFIG[examType];
        const typeLabel = examType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        sectionHtml += `
            <fieldset class="border dark:border-gray-600 p-3 rounded-md bg-white dark:bg-gray-800 shadow-sm">
                <legend class="text-md font-semibold px-2 text-gray-700 dark:text-gray-300">${typeLabel}</legend>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3 mt-2">
                    <div>
                        <label for="${examType}-questions" class="block text-xs font-medium text-gray-600 dark:text-gray-400">Questions</label>
                        <input type="number" id="${examType}-questions" value="${config.questions}" min="1" class="form-control text-sm mt-1" ${!isPrimaryAdmin ? 'readonly' : ''}>
                    </div>
                    <div>
                        <label for="${examType}-duration" class="block text-xs font-medium text-gray-600 dark:text-gray-400">Duration (min)</label>
                        <input type="number" id="${examType}-duration" value="${config.durationMinutes}" min="5" class="form-control text-sm mt-1" ${!isPrimaryAdmin ? 'readonly' : ''}>
                    </div>
                    <div>
                        <label for="${examType}-mcqRatio" class="block text-xs font-medium text-gray-600 dark:text-gray-400">MCQ Ratio (0-1)</label>
                        <input type="number" id="${examType}-mcqRatio" value="${config.mcqRatio.toFixed(2)}" min="0" max="1" step="0.05" class="form-control text-sm mt-1" ${!isPrimaryAdmin ? 'readonly' : ''}>
                    </div>
                    <div>
                        <label for="${examType}-textSourceRatio" class="block text-xs font-medium text-gray-600 dark:text-gray-400">Text Source Ratio (0-1)</label>
                        <input type="number" id="${examType}-textSourceRatio" value="${config.textSourceRatio.toFixed(2)}" min="0" max="1" step="0.05" class="form-control text-sm mt-1" ${!isPrimaryAdmin ? 'readonly' : ''}>
                    </div>
                </div>
            </fieldset>
        `;
    }

    sectionHtml += `
                <div class="mt-6 text-right">
                    <button type="button" onclick="window.handleSaveCourseExamDefaults()" class="btn-primary" ${!isPrimaryAdmin ? 'disabled' : ''}>Save Exam Defaults</button>
                </div>
            </form>
        </section>
    `;
    
    const systemOpsMainContainer = containerElement.querySelector('.space-y-8');
    if (systemOpsMainContainer) {
        systemOpsMainContainer.insertAdjacentHTML('beforeend', sectionHtml);
    } else {
        containerElement.innerHTML += sectionHtml; // Fallback if specific inner container isn't found
    }
}

window.handleSaveCourseExamDefaults = async () => {
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Permission Denied: Only Primary Admin can save course exam defaults."); return;
    }

    const newDefaults = {};
    let allValid = true;
    for (const examType in FALLBACK_EXAM_CONFIG) {
        const qEl = document.getElementById(`${examType}-questions`);
        const dEl = document.getElementById(`${examType}-duration`);
        const mEl = document.getElementById(`${examType}-mcqRatio`);
        const tEl = document.getElementById(`${examType}-textSourceRatio`);

        if (!qEl || !dEl || !mEl || !tEl) {
            alert(`Error: UI element missing for ${examType}. Cannot save.`);
            return;
        }

        const questions = parseInt(qEl.value);
        const durationMinutes = parseInt(dEl.value);
        const mcqRatio = parseFloat(mEl.value);
        const textSourceRatio = parseFloat(tEl.value);

        if (isNaN(questions) || questions < 1 ||
            isNaN(durationMinutes) || durationMinutes < 5 ||
            isNaN(mcqRatio) || mcqRatio < 0 || mcqRatio > 1 ||
            isNaN(textSourceRatio) || textSourceRatio < 0 || textSourceRatio > 1) {
            alert(`Invalid input for ${examType.replace(/_/g, ' ')}. Please check values:\n- Questions >= 1\n- Duration >= 5 min\n- Ratios between 0.0 and 1.0`);
            allValid = false;
            // Highlight the offending fieldset or inputs
            qEl.closest('fieldset')?.classList.add('border-red-500', 'dark:border-red-400');
            break;
        }
        newDefaults[examType] = { questions, durationMinutes, mcqRatio, textSourceRatio };
        qEl.closest('fieldset')?.classList.remove('border-red-500', 'dark:border-red-400');
    }

    if (allValid) {
        showLoading("Saving course exam defaults...");
        const success = await saveCourseExamDefaults(newDefaults); // This is from firebase_firestore.js
        hideLoading();
        if (success) {
            alert("Course exam defaults saved successfully!");
            // Form values are already up-to-date. The `courseExamDefaults` state in state.js was updated by saveCourseExamDefaults.
        }
        // saveCourseExamDefaults shows its own error alert if Firestore save fails.
    }
};
// --- END MODIFICATION ---


// --- Main Display Function for System Operations Section ---
export function displaySystemOperationsSection(containerElement) {
    const isPrimaryAdmin = currentUser && currentUser.uid === ADMIN_UID;
    containerElement.innerHTML = `
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-6">System Operations</h3>
        <div class="space-y-8">
            <!-- Admin Tasks -->
            <section class="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <h4 class="text-lg font-medium mb-3">Admin Tasks / To-Do List</h4>
                <div class="flex gap-4 mb-4">
                    <input type="text" id="admin-new-task-input" placeholder="Enter new task description..." class="flex-grow text-sm form-control" ${!isPrimaryAdmin ? 'disabled title="Only Primary Admin can add tasks"' : ''}>
                    <button onclick="window.handleAddAdminTask()" class="btn-primary-small text-xs flex-shrink-0" ${!isPrimaryAdmin ? 'disabled title="Only Primary Admin can add tasks"' : ''}>Add Task</button>
                </div>
                <div id="admin-tasks-area-content" class="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    <p class="text-muted text-sm">Loading tasks...</p>
                </div>
            </section>

            <!-- Global AI System Prompts -->
            <section class="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <h4 class="text-lg font-medium mb-3">Global AI System Prompts</h4>
                <p class="text-sm text-muted mb-3">
                    Define system prompts used globally unless overridden by user settings.
                    <strong>Only Primary Admin can save.</strong>
                </p>
                <div id="admin-global-ai-prompts-content" class="space-y-6">
                    <p class="text-muted text-sm">Loading prompts...</p>
                </div>
                <div class="mt-6 text-right">
                    <button onclick="window.handleSaveGlobalPrompts()" class="btn-primary" ${!isPrimaryAdmin ? 'disabled' : ''}>
                        Save Global Prompts
                    </button>
                </div>
            </section>

            <!-- Chat Auto-Deletion -->
            <section class="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <h4 class="text-lg font-medium mb-3">Chat Auto-Deletion Settings</h4>
                 <p class="text-sm text-muted mb-3">
                    Configure automatic deletion of old Global Chat messages. This requires a backend function to execute deletions based on this setting.
                    <strong>Only Primary Admin can save.</strong>
                </p>
                <div class="flex flex-wrap items-center gap-4">
                    <label for="chat-auto-delete-select-input" class="text-sm font-medium">Delete messages older than:</label>
                    <select id="chat-auto-delete-select-input" class="flex-grow max-w-xs text-sm form-control" ${!isPrimaryAdmin ? 'disabled' : ''}>
                        <option value="0">Disabled</option>
                        <option value="7">7 days</option>
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                    </select>
                    <button onclick="window.saveChatAutoDeleteSettingAdmin()" class="btn-primary-small text-xs flex-shrink-0" ${!isPrimaryAdmin ? 'disabled' : ''}>Save Setting</button>
                </div>
                <div id="chat-auto-delete-status-text" class="mt-3 text-sm"></div>
            </section>
            
            <!-- Generated Content Deletion -->
            <section class="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                 <h4 class="text-lg font-medium mb-3">Delete User-Generated Content (Sheets/Summaries)</h4>
                 <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                     <div>
                         <label for="admin-delete-content-user-input" class="block text-sm font-medium mb-1">User ID or Email</label>
                         <input type="text" id="admin-delete-content-user-input" class="w-full text-sm form-control" placeholder="Enter User ID or Email...">
                     </div>
                     <div>
                         <label for="admin-delete-content-course-input" class="block text-sm font-medium mb-1">Course ID</label>
                         <input type="text" id="admin-delete-content-course-input" class="w-full text-sm form-control" placeholder="e.g., fop_physics_v1">
                     </div>
                     <div>
                         <label for="admin-delete-content-chapter-input" class="block text-sm font-medium mb-1">Chapter Number</label>
                         <input type="number" id="admin-delete-content-chapter-input" class="w-full text-sm form-control" min="1" placeholder="e.g., 1">
                     </div>
                 </div>
                 <div class="flex gap-3">
                     <button onclick="window.handleDeleteUserFormulaSheetAdmin()" class="btn-danger-small text-xs">Delete Formula Sheet</button>
                     <button onclick="window.handleDeleteUserChapterSummaryAdmin()" class="btn-danger-small text-xs">Delete Chapter Summary</button>
                 </div>
                 <div id="admin-delete-content-status-text" class="mt-3 text-sm"></div>
            </section>
             <!-- Container for Course Exam Defaults will be appended here by displayCourseExamDefaultsSection -->
        </div>
    `;
    loadAdminTasksUI();
    renderGlobalAiPromptsAdminUI();
    loadChatAutoDeleteSettingAdmin();
    // NEW: Call to display the course exam defaults section
    const innerContainerForExamDefaults = containerElement.querySelector('.space-y-8');
    if (innerContainerForExamDefaults) {
         displayCourseExamDefaultsSection(innerContainerForExamDefaults);
    } else {
         console.error("Could not find inner container to append Course Exam Defaults section.");
    }
}
// --- END OF FILE admin_system_operations.js ---