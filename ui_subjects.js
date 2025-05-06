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
     if (!data || typeof data.subjects !== 'object' || data.subjects === null) { // Added null check
         console.error("Subject data is missing or invalid:", data);
         // Attempt to display a useful error message
         const errorMsg = data ? "Subject data structure is invalid (subjects object missing or not an object)." : "Subject data not loaded.";
         displayContent(`<div class="content-card text-center animate-fade-in">
                             <p class="text-danger p-4">${errorMsg} Please try reloading the application or check the data source.</p>
                             <button onclick="window.location.reload()" class="btn-secondary mt-2">Reload App</button>
                         </div>`);
         setActiveSidebarLink('showManageSubjects', 'testgen-dropdown-content');
         return;
     }


     const subjects = data.subjects;
     let subjectEntries = Object.entries(subjects);

     // MODIFIED: Filter subjects for non-admins
     if (currentUser && !currentUser.isAdmin) {
         subjectEntries = subjectEntries.filter(([id, subject]) => subject.status === 'approved');
     }


     let subjectsListHtml = subjectEntries.length > 0
        ? subjectEntries.map(([id, subject]) => {
            // Basic check for subject validity
             if (!subject || typeof subject !== 'object') {
                 console.warn(`Invalid subject data found for ID: ${id}. Skipping.`);
                 return ''; // Skip rendering invalid subject entry
             }
             const isCurrent = currentSubject && currentSubject.id === id;
             const subjectName = escapeHtml(subject.name || 'Unnamed Subject');
             const fileName = escapeHtml(subject.fileName || 'chapters.md'); // Default for display if missing
             const problemsFileNameEscaped = escapeHtml(subject.problemsFileName || '');
             const status = subject.status || 'approved'; // Default to approved
             const creatorName = escapeHtml(subject.creatorName || 'Unknown');
             const createdAt = subject.createdAt ? new Date(subject.createdAt).toLocaleDateString() : 'N/A';

             let statusBadgeClass = 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-200';
             let statusText = 'Approved';
             if (status === 'pending') {
                 statusBadgeClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-200';
                 statusText = 'Pending';
             } else if (status === 'rejected') {
                 statusBadgeClass = 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-200';
                 statusText = 'Rejected';
             }

             // MODIFIED: Button visibility
             const canSelect = status === 'approved';
             const canEdit = currentUser.isAdmin || (status === 'approved' && subject.creatorUid === currentUser.uid);
             const canDelete = (currentUser.isAdmin || (subject.creatorUid === currentUser.uid)) && Object.keys(data.subjects).length > 1;

             let adminActionsHtml = '';
             if (currentUser.isAdmin) {
                 if (status === 'pending') {
                     adminActionsHtml = `
                        <button onclick="window.handleSubjectApprovalWrapper('${id}', 'approved')" title="Approve Subject" class="p-1 text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
                        </button>
                        <button onclick="window.handleSubjectApprovalWrapper('${id}', 'rejected')" title="Reject Subject" class="p-1 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" /></svg>
                        </button>
                     `;
                 } else if (status === 'rejected') {
                     adminActionsHtml = `
                        <button onclick="window.handleSubjectApprovalWrapper('${id}', 'approved')" title="Re-approve Subject" class="p-1 text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V2.75A.75.75 0 0110 2zM5.204 4.572a.75.75 0 011.034.22L7.5 6.528a.75.75 0 01-1.254.83L4.92 5.552a.75.75 0 01.284-1.205zM2.5 9.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H3.25a.75.75 0 01-.75-.75zM4.777 13.496a.75.75 0 01-.22 1.034l-1.265 1.755a.75.75 0 11-1.205-.83l1.266-1.754a.75.75 0 011.204-.205zM9.25 15.5a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zM12.296 15.223a.75.75 0 01.83-1.254l1.755 1.265a.75.75 0 01-.83 1.205l-1.754-1.266a.75.75 0 01.001-.047zM15.5 10.75a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5a.75.75 0 01.75.75zM14.92 4.777a.75.75 0 011.205.83l-1.266 1.754a.75.75 0 01-1.204-.205l1.265-1.755a.75.75 0 01.001-.002z" /><path d="M10 5.5A4.5 4.5 0 1014.5 10 4.505 4.505 0 0010 5.5zm0 7A2.5 2.5 0 1112.5 10 2.5 2.5 0 0110 12.5z" /></svg> Re-approve
                        </button>
                     `;
                 }
             }

             return `
            <div class="flex flex-wrap justify-between items-center p-3 ${isCurrent ? 'bg-primary-50 dark:bg-primary-800/30 border-primary-300 dark:border-primary-600' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'} rounded-md shadow-sm gap-2 mb-2 border transition-colors hover:bg-gray-100 dark:hover:bg-gray-600">
                 <div class="flex-grow min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="font-semibold ${isCurrent ? 'text-primary-700 dark:text-primary-300' : 'text-gray-800 dark:text-gray-200'}" title="${subjectName}">
                            ${subjectName}
                        </span>
                        <span class="text-xs px-2 py-0.5 rounded-full ${statusBadgeClass}">${statusText}</span>
                    </div>
                    <span class="block text-xs text-muted truncate" title="MCQ File: ${fileName}${subject.problemsFileName ? ` | Problems File: ${problemsFileNameEscaped}` : ''}">
                        (${fileName}${subject.problemsFileName ? `, ${problemsFileNameEscaped}` : ''})
                    </span>
                    ${currentUser.isAdmin ? `<span class="block text-xs text-muted truncate" title="Created by ${creatorName} on ${createdAt}">Created by: ${creatorName} on ${createdAt} (UID: ${subject.creatorUid || 'N/A'})</span>` : ''}
                 </div>
                <div class="flex space-x-2 flex-shrink-0">
                     ${canSelect ? `
                     <button onclick="window.selectSubjectWrapper('${id}')" title="Select Subject" class="p-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 disabled:opacity-50 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition-colors" ${isCurrent ? 'disabled' : ''}>
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg>
                     </button>` : `
                     <button title="Subject not approved for selection" class="p-1 text-gray-400 dark:text-gray-500 cursor-not-allowed" disabled>
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" /></svg>
                     </button>
                     `}
                    ${canEdit ? `
                    <button onclick="window.editSubjectWrapper('${id}')" title="Edit Subject" class="p-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" /></svg>
                    </button>` : ''}
                    ${adminActionsHtml}
                    ${canDelete ? `
                    <button onclick="window.confirmDeleteSubjectWrapper('${id}')" title="Delete Subject" class="p-1 text-danger hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.326.419C2.675 4.793 2 5.51 2 6.318V15.75A2.25 2.25 0 0 0 4.25 18h11.5A2.25 2.25 0 0 0 18 15.75V6.318c0-.808-.675-1.525-1.674-1.699a18.17 18.17 0 0 0-2.326-.419v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" /></svg>
                    </button>` : ''}
                </div>
            </div>`;
          }).join('')
        : `<p class="text-sm text-center text-muted py-4">No ${currentUser.isAdmin ? '' : 'approved '}subjects defined yet.</p>`;

     let output = `
        <div class="animate-fade-in space-y-6">
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Manage Subjects (Test Generation)</h2>

            <!-- Current Subjects List -->
            <div class="content-card">
                <h3 class="text-lg font-semibold mb-4 border-b pb-2 dark:border-gray-700">
                    Current Subjects ${currentUser.isAdmin ? '' : '(Approved Only)'}
                </h3>
                <div class="space-y-2">${subjectsListHtml}</div>
                <p class="text-xs text-muted mt-3">Note: Ensure the referenced Markdown file(s) exist in the project root folder. Chapter titles and question counts are loaded from these files for approved subjects.</p>
                ${!currentUser.isAdmin ? '<p class="text-xs text-info mt-1">Only approved subjects are shown. Your suggested subjects pending review will not appear here until approved by an administrator.</p>' : ''}
            </div>

            <!-- Add New Subject Form -->
            <div class="content-card">
                <h3 class="text-lg font-semibold mb-4 border-b pb-2 dark:border-gray-700">${currentUser.isAdmin ? 'Add New Subject' : 'Suggest New Subject'}</h3>
                <form id="add-subject-form" onsubmit="window.addSubjectWrapper(event)" class="space-y-4">
                     <div>
                         <label for="subject-name">Subject Name</label>
                         <input id="subject-name" type="text" placeholder="e.g., Quantum Mechanics" required>
                     </div>
                      <div>
                          <label for="subject-filename">MCQ Markdown Filename</label>
                          <input id="subject-filename" type="text"
                                 placeholder="e.g., Quantum_Mechanics_MCQ.md"
                                 required
                                 pattern="^[^\\\\/:\\*?\\"<>\\|]+$"
                                 title="Filename cannot contain invalid characters like / \\ : * ? < > | etc."
                          >
                          <p class="form-help-text">Must end in '.md'. Use 'chapters.md' only for the default/first subject. Ensure file exists.</p>
                      </div>
                       <div>
                          <label for="subject-problems-filename">Problems Markdown Filename (Optional)</label>
                          <input id="subject-problems-filename" type="text"
                                 placeholder="e.g., Quantum_Mechanics_Problems.md"
                                 pattern="^[^\\\\/:\\*?\\"<>\\|]+$"
                                 title="Filename cannot contain invalid characters like / \\ : * ? < > | etc. Leave blank if no separate problems file."
                          >
                          <p class="form-help-text">Must end in '.md' if provided. Use for separate problem definitions.</p>
                      </div>
                     <div>
                         <label for="max-questions">Max Questions per Test</label>
                         <input id="max-questions" type="number" min="1" value="${DEFAULT_MAX_QUESTIONS}" placeholder="e.g., ${DEFAULT_MAX_QUESTIONS}" required>
                     </div>
                     <div>
                         <label for="mcq-problem-ratio">MCQ/Problem Ratio (%)</label>
                         <input id="mcq-problem-ratio" type="number" min="0" max="100" step="5" value="${DEFAULT_MCQ_PROBLEM_RATIO * 100}" required>
                         <p class="form-help-text">Target percentage of MCQs in generated tests (0-100%). Actual ratio depends on availability.</p>
                     </div>
                      <div>
                         <label for="default-duration">Default Test Duration (Minutes)</label>
                         <input id="default-duration" type="number" min="5" value="${DEFAULT_ONLINE_TEST_DURATION_MINUTES}" required>
                      </div>
                     <button type="submit" class="btn-primary w-full !mt-6">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
                         ${currentUser.isAdmin ? 'Add Subject' : 'Suggest Subject'}
                     </button>
                </form>
            </div>
        </div>`;

    displayContent(output);
    setActiveSidebarLink('showManageSubjects', 'testgen-dropdown-content'); // Updated sidebar section ID
}

export function editSubject(id) {
     if (!data || !data.subjects || !data.subjects[id]) {
         displayContent('<p class="text-danger p-4 text-center">Cannot edit: Subject not found.</p><button onclick="window.showManageSubjectsWrapper()" class="btn-secondary mt-2">Back to Subjects</button>');
         setActiveSidebarLink('showManageSubjects', 'testgen-dropdown-content');
         return;
     }
    let subject = data.subjects[id];

    // MODIFIED: Permission check for editing
    if (!currentUser.isAdmin && !(subject.status === 'approved' && subject.creatorUid === currentUser.uid)) {
        displayContent('<p class="text-danger p-4 text-center">You do not have permission to edit this subject, or it is not in an editable state.</p><button onclick="window.showManageSubjectsWrapper()" class="btn-secondary mt-2">Back to Subjects</button>');
        setActiveSidebarLink('showManageSubjects', 'testgen-dropdown-content');
        return;
    }

    // Use defaults from config if subject properties are missing
    const maxQuestions = subject.max_questions_per_test ?? DEFAULT_MAX_QUESTIONS;
    const mcqRatioPercent = (subject.mcqProblemRatio ?? DEFAULT_MCQ_PROBLEM_RATIO) * 100;
    const defaultDuration = subject.defaultTestDurationMinutes ?? DEFAULT_ONLINE_TEST_DURATION_MINUTES;
    const status = subject.status || 'approved';

    displayContent(`
        <div class="animate-fade-in">
            <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Edit Subject: <span class="text-primary-600 dark:text-primary-400">${escapeHtml(subject.name || 'Unnamed')}</span></h2>
            <form id="edit-subject-form" onsubmit="window.updateSubjectWrapper(event, '${id}')" class="space-y-4 content-card">
                 <div>
                     <label for="edit-subject-name">Subject Name</label>
                     <input id="edit-subject-name" type="text" value="${escapeHtml(subject.name || '')}" required placeholder="Enter subject name">
                 </div>
                  <div>
                      <label for="edit-subject-filename">MCQ Markdown Filename</label>
                      <input id="edit-subject-filename" type="text"
                             value="${escapeHtml(subject.fileName || '')}"
                             placeholder="e.g., Subject_Name_MCQ.md"
                             required
                             pattern="^[^\\\\/:\\*?\\"><\\|]+$"
                             title="Filename cannot contain invalid characters like / \\ : * ? < > | etc."
                      >
                      <p class="form-help-text">Must end in '.md'. Changing this requires the new file to exist and will reload chapter data (including titles/counts).</p>
                  </div>
                   <div>
                      <label for="edit-subject-problems-filename">Problems Markdown Filename (Optional)</label>
                      <input id="edit-subject-problems-filename" type="text"
                             value="${escapeHtml(subject.problemsFileName || '')}"
                             placeholder="e.g., Subject_Name_Problems.md"
                             pattern="^[^\\\\/:\\*?\\"><\\|]+$"
                             title="Filename cannot contain invalid characters like / \\ : * ? < > | etc. Leave blank if no separate problems file."
                      >
                      <p class="form-help-text">Must end in '.md' if provided. Changing this requires the new file to exist and will reload problem data.</p>
                  </div>
                 <div>
                     <label for="edit-max-questions">Max Questions per Test</label>
                     <input id="edit-max-questions" type="number" min="1" value="${maxQuestions}" required>
                 </div>
                 <div>
                     <label for="edit-mcq-problem-ratio">MCQ/Problem Ratio (%)</label>
                     <input id="edit-mcq-problem-ratio" type="number" min="0" max="100" step="5" value="${mcqRatioPercent.toFixed(0)}" required>
                     <p class="form-help-text">Target percentage of MCQs in generated tests (0-100%). Actual ratio depends on availability.</p>
                 </div>
                 <div>
                     <label for="edit-default-duration">Default Test Duration (Minutes)</label>
                     <input id="edit-default-duration" type="number" min="5" value="${defaultDuration}" required>
                 </div>
                 <div>
                     <label>Status</label>
                     <p class="form-control-plaintext p-2 bg-gray-100 dark:bg-gray-700 rounded">${escapeHtml(status)}</p>
                     ${currentUser.isAdmin && status !== 'approved' ? '<p class="form-help-text text-xs text-warning">Admins: Use Approve/Reject buttons on the main list to change status.</p>' : ''}
                 </div>
                 <div class="flex flex-col sm:flex-row gap-3 pt-4 mt-2 border-t dark:border-gray-700">
                     <button type="submit" class="btn-primary flex-1">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg>
                         Save Changes
                     </button>
                     <button type="button" onclick="window.showManageSubjectsWrapper()" class="btn-secondary flex-1">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                         Cancel
                     </button>
                 </div>
            </form>
        </div>`);
    setActiveSidebarLink('showManageSubjects', 'testgen-dropdown-content'); // Keep subject link active
}


// --- Functions: selectSubject, updateSubject, addSubject, confirmDeleteSubject, deleteSubject ---
export async function selectSubject(id) {
    if (!currentUser || !data || !data.subjects || !data.subjects[id]) {
        alert("Could not select subject. Data missing or invalid ID.");
        return;
    }
    // MODIFIED: Only select 'approved' subjects
    if (data.subjects[id].status !== 'approved') {
        alert("This subject is not yet approved and cannot be selected for use.");
        return;
    }

    showLoading("Switching Subject...");
    await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause for UI feedback

    const selectedSub = data.subjects[id];
    setCurrentSubject(selectedSub); // Update global state
    updateSubjectInfo(); // Update header info (Subject name, etc.)
    clearContent(); // Clear previous dynamic content from main area

    // Save the last selected subject ID to Firestore for persistence
    try {
         // Use set with merge: true to create/update the field without overwriting other user data
         await db.collection('users').doc(currentUser.uid).set({ lastSelectedSubjectId: id }, { merge: true });
         console.log("Last selected subject ID saved.");
    } catch (error) {
         console.error("Error saving last selected subject ID:", error);
         // Non-critical error, proceed with UI update
    }

    showHomeDashboard(); // Navigate to the home dashboard for the newly selected subject

    hideLoading();
    console.log(`Selected subject: ${currentSubject.name} (ID: ${id})`);
    // setActiveSidebarLink is called by showHomeDashboard
}

export async function addSubject(event) {
    event.preventDefault();
    if (!currentUser || !data) { alert("Cannot add subject: State missing (User or Data)."); return; }
    showLoading("Adding Subject...");

    // Get form elements
    const nameInput = document.getElementById('subject-name');
    const filenameInput = document.getElementById('subject-filename');
    const problemsFilenameInput = document.getElementById('subject-problems-filename');
    const maxQuestionsInput = document.getElementById('max-questions');
    const ratioInput = document.getElementById('mcq-problem-ratio');
    const durationInput = document.getElementById('default-duration');

    // Get values
    const name = nameInput?.value.trim();
    const fileName = filenameInput?.value.trim();
    const problemsFileName = problemsFilenameInput?.value.trim() || null; // Store as null if empty
    const max_questions = parseInt(maxQuestionsInput?.value);
    const ratioPercent = parseFloat(ratioInput?.value);
    const defaultDuration = parseInt(durationInput?.value);


    // Validation for filename, name, max_questions, ratio, duration
    if (!fileName || !fileName.endsWith('.md') || /[\/\\]/.test(fileName)) { hideLoading(); alert("Invalid MCQ filename. Must end in .md and contain no slashes."); filenameInput?.focus(); return; }
    if (problemsFileName && (!problemsFileName.endsWith('.md') || /[\/\\]/.test(problemsFileName))) { hideLoading(); alert("Invalid Problems filename. Must end in .md and contain no slashes."); problemsFilenameInput?.focus(); return; }
    // Prevent using 'chapters.md' unless it's the very first subject being added (heuristic check)
    const isFirstSubject = Object.keys(data.subjects || {}).length === 0;
    if (fileName.toLowerCase() === 'chapters.md' && !isFirstSubject) {
         hideLoading(); alert("'chapters.md' is typically reserved for the initial default subject setup."); filenameInput?.focus(); return;
    }
    if (!name) { hideLoading(); alert("Subject Name is required."); nameInput?.focus(); return; }
    if (isNaN(max_questions) || max_questions < 1) { hideLoading(); alert("Invalid Max Questions per Test (must be >= 1)."); maxQuestionsInput?.focus(); return; }
    if (isNaN(ratioPercent) || ratioPercent < 0 || ratioPercent > 100) { hideLoading(); alert("Invalid MCQ Ratio (must be 0-100)."); ratioInput?.focus(); return; }
    if (isNaN(defaultDuration) || defaultDuration < 5) { hideLoading(); alert("Invalid Default Duration (must be >= 5 minutes)."); durationInput?.focus(); return; }

    try {
        // Find the next available ID
        let newId = 1;
        if (!data.subjects) data.subjects = {}; // Initialize subjects if it doesn't exist
        while (data.subjects[String(newId)]) { newId++; }
        const newIdStr = String(newId);

        // MODIFIED: Create the new subject object structure with approval workflow fields
        const finalStatus = currentUser.isAdmin ? 'approved' : 'pending';
        const newSubjectData = {
            id: newIdStr,
            name: name,
            fileName: fileName, // MCQ filename
            problemsFileName: problemsFileName, // Problems filename (optional)
            max_questions_per_test: max_questions,
            mcqProblemRatio: ratioPercent / 100.0, // Store as decimal ratio
            defaultTestDurationMinutes: defaultDuration,
            chapters: {}, // Initialize with empty chapters - will be populated on next load/sync if approved
            studied_chapters: [],
            pending_exams: [],
            // exam_history: [] // exam_history is deprecated here
            status: finalStatus,
            creatorUid: currentUser.uid,
            creatorName: currentUser.displayName || currentUser.email,
            createdAt: new Date().toISOString(),
        };

        console.warn(`Added subject '${name}' with status '${finalStatus}'. Chapters (titles, counts) will be populated from '${fileName}' on next data load/refresh if approved.`);

        // Add to local state and save
        data.subjects[newIdStr] = newSubjectData;
        await saveUserData(currentUser.uid); // Save the updated data object to Firestore
        hideLoading();

        // MODIFIED: Show success feedback Toast based on status
        let successMessage = `Subject "${escapeHtml(name)}" ${finalStatus === 'approved' ? 'added successfully!' : 'suggested and is pending review.'}`;
        const successMsgHtml = `<div class="toast-notification toast-${finalStatus === 'approved' ? 'success' : 'info'} animate-fade-in"><p class="font-medium">${successMessage}</p><p class="text-xs">Refresh or reload data if needed to load chapters (once approved).</p></div>`;
        const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 6000);

        showManageSubjects(); // Refresh list (this will call setActiveSidebarLink)

    } catch (error) {
        console.error("Error adding subject:", error);
        // Show error toast
        const errorMsgHtml = `<div class="toast-notification toast-error animate-fade-in"><p class="font-medium">Failed to add subject: ${error.message}</p></div>`;
        const msgContainer = document.createElement('div'); msgContainer.innerHTML = errorMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 6000);
        hideLoading();
        showManageSubjects(); // Refresh list even on error
    }
}


export async function updateSubject(event, id) {
     event.preventDefault();
     if (!currentUser || !data || !data.subjects || !data.subjects[id]) { alert("Cannot update: State missing or invalid ID."); return; }

    const subjectToUpdate = data.subjects[id];
    // MODIFIED: Permission check for updating
    if (!currentUser.isAdmin && !(subjectToUpdate.status === 'approved' && subjectToUpdate.creatorUid === currentUser.uid)) {
        alert("You do not have permission to update this subject, or it is not in an editable state.");
        return;
    }

    // Get form elements
    const nameInput = document.getElementById('edit-subject-name');
    const filenameInput = document.getElementById('edit-subject-filename');
    const problemsFilenameInput = document.getElementById('edit-subject-problems-filename');
    const maxQuestionsInput = document.getElementById('edit-max-questions');
    const ratioInput = document.getElementById('edit-mcq-problem-ratio');
    const durationInput = document.getElementById('edit-default-duration');

    // Get values
    const newName = nameInput?.value.trim();
    const newFilename = filenameInput?.value.trim();
    const newProblemsFilename = problemsFilenameInput?.value.trim() || null; // Store null if empty
    const newMaxQuestions = parseInt(maxQuestionsInput?.value);
    const newRatioPercent = parseFloat(ratioInput?.value);
    const newDuration = parseInt(durationInput?.value);

    // Validation...
    if (!newFilename || !newFilename.endsWith('.md') || /[\/\\]/.test(newFilename)) { alert("Invalid MCQ filename. Must end in .md and contain no slashes."); filenameInput?.focus(); return; }
    if (newProblemsFilename && (!newProblemsFilename.endsWith('.md') || /[\/\\]/.test(newProblemsFilename))) { alert("Invalid Problems filename. Must end in .md and contain no slashes."); problemsFilenameInput?.focus(); return; }
    if (!newName) { alert("Subject Name is required."); nameInput?.focus(); return; }
    if (isNaN(newMaxQuestions) || newMaxQuestions < 1) { alert("Invalid Max Questions (must be >= 1)."); maxQuestionsInput?.focus(); return; }
    if (isNaN(newRatioPercent) || newRatioPercent < 0 || newRatioPercent > 100) { alert("Invalid MCQ Ratio (must be 0-100)."); ratioInput?.focus(); return; }
    if (isNaN(newDuration) || newDuration < 5) { alert("Invalid Default Duration (must be >= 5 minutes)."); durationInput?.focus(); return; }

    showLoading("Saving Subject Changes...");
    try {
        let needsDataReload = false;

        // Check if filenames changed
        if (subjectToUpdate.fileName !== newFilename || subjectToUpdate.problemsFileName !== newProblemsFilename) {
             console.log(`Filename changed. MCQ: ${subjectToUpdate.fileName} -> ${newFilename}, Problems: ${subjectToUpdate.problemsFileName || 'None'} -> ${newProblemsFilename || 'None'}. Data reload will be triggered.`);
             needsDataReload = true;
             subjectToUpdate.chapters = {};
             window.subjectProblemCache?.delete(id);
             console.log("Cleared existing chapter data and problem cache due to filename change.");
        }

        // Update subject properties (status is not changed here)
        subjectToUpdate.name = newName;
        subjectToUpdate.fileName = newFilename;
        subjectToUpdate.problemsFileName = newProblemsFilename;
        subjectToUpdate.max_questions_per_test = newMaxQuestions;
        subjectToUpdate.mcqProblemRatio = newRatioPercent / 100.0;
        subjectToUpdate.defaultTestDurationMinutes = newDuration;
        // subjectToUpdate.updatedAt = new Date().toISOString(); // Optional: track updates

        await saveUserData(currentUser.uid);
        hideLoading();

        if (currentSubject && currentSubject.id === id) {
             setCurrentSubject(subjectToUpdate);
             updateSubjectInfo();
        }

        if (needsDataReload && subjectToUpdate.status === 'approved') { // Only reload if approved
             const reloadMsgHtml = `<div class="toast-notification toast-info animate-fade-in"><p>Subject updated. Reloading data for new file(s)...</p></div>`;
             const msgContainer1 = document.createElement('div'); msgContainer1.innerHTML = reloadMsgHtml; document.body.appendChild(msgContainer1); setTimeout(() => { msgContainer1.remove(); }, 5000);
             console.log("Chapter titles and question counts will be updated from the new file content after reload.");
             await loadUserData(currentUser.uid);
             if (currentSubject && currentSubject.id === id && data?.subjects?.[id]) {
                 setCurrentSubject(data.subjects[id]);
                 updateSubjectInfo();
             }
             showManageSubjects();
        } else {
             const successMsgHtml = `<div class="toast-notification toast-success animate-fade-in"><p>Subject '${escapeHtml(newName)}' updated!</p></div>`;
             const msgContainer2 = document.createElement('div'); msgContainer2.innerHTML = successMsgHtml; document.body.appendChild(msgContainer2); setTimeout(() => { msgContainer2.remove(); }, 4000);
            showManageSubjects();
        }

    } catch (error) {
        console.error("Error updating subject:", error);
        const errorMsgHtml = `<div class="toast-notification toast-error animate-fade-in"><p>Failed to update subject: ${error.message}</p></div>`;
        const msgContainer = document.createElement('div'); msgContainer.innerHTML = errorMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 6000);
        hideLoading();
        showManageSubjects();
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
    // MODIFIED: Permission check for delete
    if (!currentUser.isAdmin && subject.creatorUid !== currentUser.uid) {
        alert("You do not have permission to delete this subject.");
        return;
    }

    displayContent(`
        <div class="bg-danger-100 dark:bg-red-900/30 p-6 rounded-lg text-center max-w-lg mx-auto border border-danger-300 dark:border-red-700 shadow-lg animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-12 h-12 mx-auto text-danger-500 mb-3"><path fill-rule="evenodd" d="M8.485 2.495c.646-1.114 2.374-1.114 3.02 0l6.28 10.875c.646 1.114-.214 2.505-1.51 2.505H3.715c-1.296 0-2.156-1.391-1.51-2.505l6.28-10.875ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd" /></svg>
            <h3 class="font-semibold text-danger-700 dark:text-red-400 text-xl mb-2">Confirm Subject Deletion</h3>
            <p class="text-gray-700 dark:text-gray-300 mb-5">
                Permanently delete subject "<strong>${escapeHtml(subject.name || 'Unnamed Subject')}</strong>"?<br><br>
                This removes the subject and ALL associated data (progress, history, settings) from the Test Generation module.
                <strong class="block text-danger-600 dark:text-red-500 mt-2">This action cannot be undone.</strong>
            </p>
            <div class="flex justify-center gap-3 mt-6">
                <button onclick="window.deleteSubjectWrapper('${id}')" class="btn-danger">
                     Yes, Delete Permanently
                </button>
                <button onclick="window.showManageSubjectsWrapper()" class="btn-secondary">
                     Cancel
                </button>
            </div>
        </div>
    `);
    setActiveSidebarLink('showManageSubjects', 'testgen-dropdown-content');
}

export async function deleteSubject(id) {
     if (!currentUser || !data || !data.subjects) { alert("Cannot delete: State missing."); return; }
     if (Object.keys(data.subjects).length <= 1) { alert("Cannot delete the last subject."); return; }

     const subjectToDelete = data.subjects[id];
     if (!subjectToDelete) { alert("Subject not found."); return; }

     // MODIFIED: Permission check
     if (!currentUser.isAdmin && subjectToDelete.creatorUid !== currentUser.uid) {
         alert("You do not have permission to delete this subject.");
         return;
     }

    showLoading("Deleting Subject...");
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const deletedSubjectName = subjectToDelete.name || `Subject ${id}`;

        let newSubjectIdToSelect = null;
        if (currentSubject && currentSubject.id === id) {
            // Find the first available *approved* subject ID
            newSubjectIdToSelect = Object.keys(data.subjects).find(sid => sid !== id && data.subjects[sid].status === 'approved') || null;
            const newSubject = newSubjectIdToSelect ? data.subjects[newSubjectIdToSelect] : null;
            setCurrentSubject(newSubject);
            updateSubjectInfo();
            await db.collection('users').doc(currentUser.uid).set({ lastSelectedSubjectId: newSubjectIdToSelect }, { merge: true });
            console.log(`Switched active subject to ${newSubject ? newSubject.name : 'None'}.`);
        }

        delete data.subjects[id];
        window.subjectProblemCache?.delete(id);
        console.log(`Deleted subject ${id} from local state and cleared problem cache.`);

        await saveUserData(currentUser.uid);
        hideLoading();

         const successMsgHtml = `<div class="toast-notification toast-warning animate-fade-in"><p>Subject "${escapeHtml(deletedSubjectName)}" deleted.</p></div>`;
         const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 5000);

        if (currentSubject && currentSubject.id === newSubjectIdToSelect) {
             showHomeDashboard();
         } else {
             showManageSubjects();
         }

    } catch (error) {
        console.error("Error deleting subject:", error);
        const errorMsgHtml = `<div class="toast-notification toast-error animate-fade-in"><p>Failed to delete subject: ${error.message}</p></div>`;
        const msgContainer = document.createElement('div'); msgContainer.innerHTML = errorMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 6000);
        hideLoading();
        showManageSubjects();
    }
}

// MODIFIED: New function for handling subject approval by admin (acting on their own subjects for now)
export async function handleSubjectApproval(subjectId, newStatus) {
    if (!currentUser.isAdmin) {
        alert("You do not have permission to change subject status.");
        return;
    }
    if (!data.subjects || !data.subjects[subjectId]) {
        alert("Subject not found.");
        return;
    }
    const subject = data.subjects[subjectId];
    const action = newStatus === 'approved' ? 'approve' : 'reject';

    if (confirm(`Are you sure you want to ${action} the subject "${escapeHtml(subject.name)}"?`)) {
        showLoading("Updating subject status...");
        subject.status = newStatus;
        // subject.approvedBy = currentUser.uid; // Optional: track approver
        // subject.approvedAt = new Date().toISOString(); // Optional: track approval time
        try {
            await saveUserData(currentUser.uid);
            hideLoading();
            const feedbackMsgHtml = `<div class="toast-notification toast-success animate-fade-in"><p>Subject "${escapeHtml(subject.name)}" has been ${newStatus}.</p></div>`;
            const msgContainer = document.createElement('div'); msgContainer.innerHTML = feedbackMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 5000);
            showManageSubjects(); // Refresh the list
        } catch (error) {
            hideLoading();
            console.error("Error updating subject status:", error);
            const errorMsgHtml = `<div class="toast-notification toast-error animate-fade-in"><p>Failed to update subject status: ${error.message}</p></div>`;
            const msgContainer = document.createElement('div'); msgContainer.innerHTML = errorMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 6000);
             // Revert status change in local state on error
            subject.status = subject.status === 'approved' ? 'pending' : (subject.status === 'rejected' ? 'pending' : 'approved'); // simplified revert
            showManageSubjects();
        }
    }
}


// --- Wrappers for window scope ---
window.showManageSubjectsWrapper = showManageSubjects;
window.selectSubjectWrapper = selectSubject;
window.editSubjectWrapper = editSubject;
window.updateSubjectWrapper = updateSubject;
window.addSubjectWrapper = addSubject;
window.confirmDeleteSubjectWrapper = confirmDeleteSubject;
window.deleteSubjectWrapper = deleteSubject;
window.handleSubjectApprovalWrapper = handleSubjectApproval; // MODIFIED: Add new wrapper


// --- END OF FILE ui_subjects.js ---