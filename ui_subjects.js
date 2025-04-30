// --- START OF FILE ui_subjects.js ---

import { data, setData, currentSubject, setCurrentSubject, currentUser, db } from './state.js';
import { displayContent, updateSubjectInfo, clearContent, setActiveSidebarLink } from './ui_core.js';
import { saveUserData, loadUserData } from './firebase_firestore.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Added escapeHtml
import { showTestGenerationDashboard } from './ui_test_generation.js';
import { showHomeDashboard } from './ui_home_dashboard.js';
// Import defaults from config
import { DEFAULT_MAX_QUESTIONS, DEFAULT_MCQ_PROBLEM_RATIO, DEFAULT_ONLINE_TEST_DURATION_MINUTES } from './config.js';

// --- Subject Management ---

export function showManageSubjects() {
     // Check if data or data.subjects is missing/null
     if (!data || typeof data.subjects !== 'object') {
         console.error("Subject data is missing or invalid:", data);
         // Attempt to display a useful error message
         const errorMsg = data ? "Subject data structure is invalid." : "Subject data not loaded.";
         displayContent(`<div class="content-card text-center">
                             <p class="text-danger p-4">${errorMsg} Please try reloading the application or check the data source.</p>
                             <button onclick="window.location.reload()" class="btn-secondary mt-2">Reload App</button>
                         </div>`);
         setActiveSidebarLink('showManageSubjects', 'sidebar-standard-nav'); // Still set link active
         return;
     }


     const subjects = data.subjects;
     const subjectEntries = Object.entries(subjects);

     let subjectsListHtml = subjectEntries.length > 0
        ? subjectEntries.map(([id, subject]) => {
            // Basic check for subject validity
             if (!subject || typeof subject !== 'object') {
                 console.warn(`Invalid subject data found for ID: ${id}. Skipping.`);
                 return ''; // Skip rendering invalid subject entry
             }
             return `
            <div class="flex flex-wrap justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md shadow-sm gap-2 mb-2 border dark:border-gray-600 transition-colors hover:bg-gray-100 dark:hover:bg-gray-600">
                 <div class="flex-grow min-w-0">
                    <span class="font-semibold ${currentSubject && currentSubject.id === id ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'}" title="${escapeHtml(subject.name || 'Unnamed')}">
                        ${escapeHtml(subject.name || 'Unnamed Subject')}
                    </span>
                    <span class="block text-xs text-muted truncate" title="${escapeHtml(subject.fileName || 'chapters.md')}">(${escapeHtml(subject.fileName || 'chapters.md')})</span>
                 </div>
                <div class="flex space-x-2 flex-shrink-0">
                     <button onclick="window.selectSubject('${id}')" title="Select Subject" class="p-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" ${currentSubject && currentSubject.id === id ? 'disabled' : ''}>
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg>
                     </button>
                    <button onclick="window.editSubject('${id}')" title="Edit Subject" class="p-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" /></svg>
                    </button>
                    <button onclick="window.confirmDeleteSubject('${id}')" title="Delete Subject" class="p-1 text-danger hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors ${subjectEntries.length <= 1 ? 'hidden' : ''}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.326.419C2.675 4.793 2 5.51 2 6.318V15.75A2.25 2.25 0 0 0 4.25 18h11.5A2.25 2.25 0 0 0 18 15.75V6.318c0-.808-.675-1.525-1.674-1.699a18.17 18.17 0 0 0-2.326-.419v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" /></svg>
                    </button>
                </div>
            </div>`;
          }).join('')
        : '<p class="text-sm text-center text-muted py-4">No subjects defined yet.</p>';

     let output = `
        <div class="animate-fade-in space-y-6">
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Manage Subjects (Test Generation)</h2>

            <!-- Current Subjects List -->
            <div class="content-card">
                <h3 class="text-lg font-semibold mb-4 border-b pb-2 dark:border-gray-700">Current Subjects</h3>
                <div class="space-y-2">${subjectsListHtml}</div>
                <p class="text-xs text-muted mt-3">Note: The Markdown filename is shown in parentheses. Ensure this file exists in the project root folder.</p>
            </div>

            <!-- Add New Subject Form -->
            <div class="content-card">
                <h3 class="text-lg font-semibold mb-4 border-b pb-2 dark:border-gray-700">Add New Subject</h3>
                <form id="add-subject-form" onsubmit="window.addSubject(event)" class="space-y-4">
                     <div>
                         <label for="subject-name">Subject Name</label>
                         <input id="subject-name" type="text" placeholder="e.g., Quantum Mechanics" required>
                     </div>
                      <div>
                          <label for="subject-filename">Markdown Filename</label>
                          <input id="subject-filename" type="text"
                                 placeholder="e.g., Quantum_Mechanics.md"
                                 required
                                 pattern="^[^\\\\/:\\*?\\"&lt&gt\\|]+$"
                                 title="Filename cannot contain invalid characters like / \\ : * ? < > | etc."
                          >
                          <p class="form-help-text">Must end in '.md'. Use 'chapters.md' only for the default/first subject. Ensure file exists.</p>
                      </div>
                     <div>
                         <label for="max-questions">Max Questions per Test</label>
                         <input id="max-questions" type="number" min="1" value="42" placeholder="e.g., 42" required>
                     </div>
                     <button type="submit" class="btn-primary w-full !mt-6">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
                         Add Subject
                     </button>
                </form>
            </div>
        </div>`;

    displayContent(output);
    setActiveSidebarLink('showManageSubjects', 'sidebar-standard-nav');
}

export function editSubject(id) {
     if (!data || !data.subjects || !data.subjects[id]) {
         displayContent('<p class="text-danger p-4 text-center">Cannot edit: Subject not found.</p><button onclick="window.showManageSubjects()" class="btn-secondary mt-2">Back to Subjects</button>');
         setActiveSidebarLink('showManageSubjects', 'sidebar-standard-nav');
         return;
     }
    let subject = data.subjects[id];
    displayContent(`
        <div class="animate-fade-in">
            <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Edit Subject: <span class="text-primary-600 dark:text-primary-400">${escapeHtml(subject.name || 'Unnamed')}</span></h2>
            <form id="edit-subject-form" onsubmit="window.updateSubject(event, '${id}')" class="space-y-4 content-card">
                 <div>
                     <label for="edit-subject-name">Subject Name</label>
                     <input id="edit-subject-name" type="text" value="${escapeHtml(subject.name || '')}" required placeholder="Enter subject name">
                 </div>
                  <div>
                      <label for="edit-subject-filename">Markdown Filename</label>
                      <input id="edit-subject-filename" type="text"
                             value="${escapeHtml(subject.fileName || '')}"
                             placeholder="e.g., Subject_Name.md"
                             required
                             pattern="^[^\\\\/:\\*?\\"&gt&lt\\|]+$"
                             title="Filename cannot contain invalid characters like / \\ : * ? < > | etc."
                      >
                      <p class="form-help-text">Must end in '.md'. Changing this requires the new file to exist and will reload chapter data.</p>
                  </div>
                 <div>
                     <label for="edit-max-questions">Max Questions per Test</label>
                     <input id="edit-max-questions" type="number" min="1" value="${subject.max_questions_per_test || 42}" required>
                 </div>
                 <div class="flex flex-col sm:flex-row gap-3 pt-4 mt-2 border-t dark:border-gray-700">
                     <button type="submit" class="btn-primary flex-1">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg>
                         Save Changes
                     </button>
                     <button type="button" onclick="window.showManageSubjects()" class="btn-secondary flex-1">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                         Cancel
                     </button>
                 </div>
            </form>
        </div>`);
    setActiveSidebarLink('showManageSubjects', 'sidebar-standard-nav'); // Keep subject link active
}


// --- Functions: selectSubject, updateSubject, addSubject, confirmDeleteSubject, deleteSubject ---
export async function selectSubject(id) {
    if (!currentUser || !data || !data.subjects || !data.subjects[id]) {
        alert("Could not select subject. Data missing or invalid ID.");
        return;
    }
    showLoading("Switching Subject...");
    await new Promise(resolve => setTimeout(resolve, 100));

    const selectedSub = data.subjects[id];
    setCurrentSubject(selectedSub);
    updateSubjectInfo(); // Update header info
    clearContent(); // Clear previous dynamic content

    // Save the last selected subject ID to Firestore
    try {
         await db.collection('users').doc(currentUser.uid).update({ lastSelectedSubjectId: id });
         console.log("Last selected subject ID saved.");
    } catch (error) {
         console.error("Error saving last selected subject ID:", error);
    }

    showHomeDashboard(); // Go to home for the new subject

    hideLoading();
    console.log(`Selected subject: ${currentSubject.name} (ID: ${id})`);
    // setActiveSidebarLink is called by showHomeDashboard
}

export async function addSubject(event) {
    event.preventDefault();
    if (!currentUser || !data) { alert("Cannot add subject: State missing."); return; }
    showLoading("Adding Subject...");

    const nameInput = document.getElementById('subject-name');
    const filenameInput = document.getElementById('subject-filename');
    const maxQuestionsInput = document.getElementById('max-questions');
    const name = nameInput?.value.trim();
    const fileName = filenameInput?.value.trim();
    const max_questions = parseInt(maxQuestionsInput?.value);

    // Validation for filename, name, max_questions
    if (!fileName || !fileName.endsWith('.md') || /[\/\\]/.test(fileName)) { hideLoading(); alert("Invalid filename. Must end in .md and contain no slashes."); filenameInput?.focus(); return; }
    if (fileName.toLowerCase() === 'chapters.md' && Object.keys(data.subjects || {}).length > 0 && !(Object.keys(data.subjects).length === 1 && data.subjects["1"]?.name === "Fundamentals of Physics")) { hideLoading(); alert("'chapters.md' is reserved for the default subject setup."); filenameInput?.focus(); return; }
    if (!name || isNaN(max_questions) || max_questions < 1) { hideLoading(); alert("Invalid name or max questions per test."); return; }

    try {
        let newId = 1;
        if (!data.subjects) data.subjects = {};
        while (data.subjects[String(newId)]) { newId++; }
        const newIdStr = String(newId);

        // Initialize with empty chapters - will be populated on next load
        const newSubjectData = { id: newIdStr, name: name, fileName: fileName, max_questions_per_test: max_questions, chapters: {}, studied_chapters: [], pending_exams: [], exam_history: [] };

        console.warn(`Added subject '${name}'. Chapters will be populated from '${fileName}' on next data load/sync.`);

        data.subjects[newIdStr] = newSubjectData;
        await saveUserData(currentUser.uid); // Save the updated data object
        hideLoading();

        // Show success feedback Toast
        const successMsgHtml = `<div class="toast-notification toast-success animate-fade-in"><p class="font-medium">Subject "${escapeHtml(name)}" added successfully!</p><p class="text-xs">Chapters will load on next refresh.</p></div>`;
        const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 5000);

        showManageSubjects(); // Refresh list (this will call setActiveSidebarLink)

    } catch (error) {
        console.error("Error adding subject:", error);
        // Show error toast
        const errorMsgHtml = `<div class="toast-notification toast-error animate-fade-in"><p class="font-medium">Failed to add subject: ${error.message}</p></div>`;
        const msgContainer = document.createElement('div'); msgContainer.innerHTML = errorMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 6000);
        hideLoading();
        showManageSubjects();
    }
}

export async function updateSubject(event, id) {
     event.preventDefault();
     if (!currentUser || !data || !data.subjects || !data.subjects[id]) { alert("Cannot update: State missing or invalid ID."); return; }

    const nameInput = document.getElementById('edit-subject-name');
    const filenameInput = document.getElementById('edit-subject-filename');
    const problemsFilenameInput = document.getElementById('edit-subject-problems-filename');
    const maxQuestionsInput = document.getElementById('edit-max-questions');
    const ratioInput = document.getElementById('edit-mcq-problem-ratio');
    const durationInput = document.getElementById('edit-default-duration');

    const newName = nameInput?.value.trim();
    const newFilename = filenameInput?.value.trim();
    const newProblemsFilename = problemsFilenameInput?.value.trim() || null; // Optional
    const newMaxQuestions = parseInt(maxQuestionsInput?.value);
    const newRatioPercent = parseFloat(ratioInput?.value);
    const newDuration = parseInt(durationInput?.value);

    // Validation...
    if (!newFilename || !newFilename.endsWith('.md') || /[\/\\]/.test(newFilename)) { alert("Invalid MCQ filename..."); filenameInput?.focus(); return; }
    if (newProblemsFilename && (!newProblemsFilename.endsWith('.md') || /[\/\\]/.test(newProblemsFilename))) { alert("Invalid Problems filename..."); problemsFilenameInput?.focus(); return; }
    if (!newName) { alert("Subject Name is required."); nameInput?.focus(); return; }
    if (isNaN(newMaxQuestions) || newMaxQuestions < 1) { alert("Invalid Max Questions..."); maxQuestionsInput?.focus(); return; }
    if (isNaN(newRatioPercent) || newRatioPercent < 0 || newRatioPercent > 100) { alert("Invalid MCQ Ratio..."); ratioInput?.focus(); return; }
    if (isNaN(newDuration) || newDuration < 5) { alert("Invalid Default Duration..."); durationInput?.focus(); return; }

    showLoading("Saving Subject Changes...");
    try {
        const subjectToUpdate = data.subjects[id];
        let needsDataReload = false;
        if (subjectToUpdate.fileName !== newFilename || subjectToUpdate.problemsFileName !== newProblemsFilename) {
             console.log(`Filename changed. MCQ: ${subjectToUpdate.fileName} -> ${newFilename}, Problems: ${subjectToUpdate.problemsFileName || 'Default'} -> ${newProblemsFilename || 'Default'}. Data reload will be triggered.`);
             needsDataReload = true;
             // Clear existing chapter data and problem cache as it's now invalid
             subjectToUpdate.chapters = {};
             subjectToUpdate.studied_chapters = []; // Reset studied status too
             window.subjectProblemCache?.delete(id); // Clear problem cache if exists
        }

        subjectToUpdate.name = newName;
        subjectToUpdate.fileName = newFilename;
        subjectToUpdate.problemsFileName = newProblemsFilename; // Update problems filename
        subjectToUpdate.max_questions_per_test = newMaxQuestions;
        subjectToUpdate.mcqProblemRatio = newRatioPercent / 100.0;
        subjectToUpdate.defaultTestDurationMinutes = newDuration;

        await saveUserData(currentUser.uid); // Save the entire updated data object
        hideLoading();

        // Update current subject state if it was the one being edited
        if (currentSubject && currentSubject.id === id) {
             setCurrentSubject(subjectToUpdate);
             updateSubjectInfo();
        }

        if (needsDataReload) {
             // Show toast about reload
             const reloadMsgHtml = `<div class="toast-notification toast-info animate-fade-in"><p>Subject updated. Reloading data for new file(s)...</p></div>`;
             const msgContainer1 = document.createElement('div'); msgContainer1.innerHTML = reloadMsgHtml; document.body.appendChild(msgContainer1); setTimeout(() => { msgContainer1.remove(); }, 5000);

             await loadUserData(currentUser.uid); // reload user data to sync chapters
             showManageSubjects(); // Show the list again after reload
        } else {
             // Show success toast
             const successMsgHtml = `<div class="toast-notification toast-success animate-fade-in"><p>Subject '${escapeHtml(newName)}' updated!</p></div>`;
             const msgContainer2 = document.createElement('div'); msgContainer2.innerHTML = successMsgHtml; document.body.appendChild(msgContainer2); setTimeout(() => { msgContainer2.remove(); }, 4000);
            showManageSubjects(); // Go back to the list view
        }

    } catch (error) {
        console.error("Error updating subject:", error);
        // Show error toast
        const errorMsgHtml = `<div class="toast-notification toast-error animate-fade-in"><p>Failed to update subject: ${error.message}</p></div>`;
        const msgContainer = document.createElement('div'); msgContainer.innerHTML = errorMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 6000);
        hideLoading();
    }
}

export function confirmDeleteSubject(id) {
    if (!data || !data.subjects || Object.keys(data.subjects).length <= 1) {
         alert("Cannot delete the last remaining subject.");
         return;
     }
    let subject = data.subjects[id];
     if (!subject) {
         alert("Cannot delete: Subject not found.");
         return;
     }
    // Use displayContent which wraps in card
    displayContent(`
        <div class="bg-danger-100 dark:bg-red-900/30 p-6 rounded-lg text-center max-w-lg mx-auto border border-danger-300 dark:border-red-700 shadow-lg animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-12 h-12 mx-auto text-danger-500 mb-3"><path fill-rule="evenodd" d="M8.485 2.495c.646-1.114 2.374-1.114 3.02 0l6.28 10.875c.646 1.114-.214 2.505-1.51 2.505H3.715c-1.296 0-2.156-1.391-1.51-2.505l6.28-10.875ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" /></svg>
            <h3 class="font-semibold text-danger-700 dark:text-red-400 text-xl mb-2">Confirm Subject Deletion</h3>
            <p class="text-gray-700 dark:text-gray-300 mb-5">
                Permanently delete subject "<strong>${escapeHtml(subject.name || 'Unnamed Subject')}</strong>"?<br><br>
                This removes the subject and ALL associated data (progress, history, settings).
                <strong class="block text-danger-600 dark:text-red-500 mt-2">This action cannot be undone.</strong>
            </p>
            <div class="flex justify-center gap-3 mt-6">
                <button onclick="window.deleteSubject('${id}')" class="btn-danger">
                     Yes, Delete Permanently
                </button>
                <button onclick="window.showManageSubjects()" class="btn-secondary">
                     Cancel
                </button>
            </div>
        </div>
    `);
    setActiveSidebarLink('showManageSubjects', 'sidebar-standard-nav'); // Keep subject link active
}

export async function deleteSubject(id) {
     if (!currentUser || !data || !data.subjects) { alert("Cannot delete: State missing."); return; }
     if (Object.keys(data.subjects).length <= 1) { alert("Cannot delete the last subject."); return; }
    showLoading("Deleting Subject...");
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const deletedSubjectName = data.subjects[id]?.name || `Subject ${id}`;

        // Switch to another subject if the deleted one was active
        if (currentSubject && currentSubject.id === id) {
            let otherSubjectId = Object.keys(data.subjects).find(sid => sid !== id);
            const newSubject = otherSubjectId ? data.subjects[otherSubjectId] : null;
            setCurrentSubject(newSubject);
            updateSubjectInfo();
             // Save the new current subject ID
            if (newSubject) {
                 await db.collection('users').doc(currentUser.uid).update({ lastSelectedSubjectId: newSubject.id });
            } else {
                 await db.collection('users').doc(currentUser.uid).update({ lastSelectedSubjectId: null });
            }
        }

        delete data.subjects[id]; // Delete from local state
        window.subjectProblemCache?.delete(id); // Clear problem cache for deleted subject
        await saveUserData(currentUser.uid); // Save the modified data object
        hideLoading();

        // Show feedback Toast
         const successMsgHtml = `<div class="toast-notification toast-warning animate-fade-in"><p>Subject "${escapeHtml(deletedSubjectName)}" deleted.</p></div>`;
         const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 5000);

        showManageSubjects(); // Refresh view

    } catch (error) {
        console.error("Error deleting subject:", error);
        // Show error toast
        const errorMsgHtml = `<div class="toast-notification toast-error animate-fade-in"><p>Failed to delete subject: ${error.message}</p></div>`;
        const msgContainer = document.createElement('div'); msgContainer.innerHTML = errorMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 6000);
        hideLoading();
        showManageSubjects(); // Still refresh view
    }
}
// --- END OF FILE ui_subjects.js ---