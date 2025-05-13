// --- START OF FILE ui_subjects.js ---

import {
    data, setData, currentSubject, setCurrentSubject, currentUser, db,
    globalSubjectDefinitionsMap // NEW: Import global definitions map
} from './state.js';
import {
    displayContent, updateSubjectInfo, clearContent, setActiveSidebarLink
} from './ui_core.js';
import {
    saveUserData, // Still used to save user's subject *progress* part
    loadUserData, // Used to reload the merged view if needed
    adminAddGlobalSubject, // NEW: For adding to /subjects
    adminUpdateGlobalSubjectDefinition, // NEW: For updating /subjects
    adminDeleteGlobalSubject, // NEW: For deleting from /subjects
    loadUserSubjectProgress // NEW: To get user's progress for a global subject
} from './firebase_firestore.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js';
import { showHomeDashboard } from './ui_home_dashboard.js';
import {
    DEFAULT_MAX_QUESTIONS, DEFAULT_MCQ_PROBLEM_RATIO, DEFAULT_ONLINE_TEST_DURATION_MINUTES,
    ADMIN_UID, SUBJECT_RESOURCE_FOLDER
} from './config.js';
// NEW: Import for fetching MD to update chapter info on selection/edit
import { fetchMarkdownForGlobalSubject } from './firebase_firestore.js'; // Assuming this helper exists/is moved
import { updateChaptersFromMarkdown, parseChaptersFromMarkdown } from './markdown_parser.js';
import { cleanTextForFilename } from './filename_utils.js';

// Helper to get default progress stats for a subject when a user first interacts with it
function getDefaultSubjectProgressStatsForUser() {
    return {
        chapters: {}, // Will be populated by MD parse relative to global total_questions
        studied_chapters: [],
        pending_exams: [],
        // Note: total_attempted, total_wrong etc. will be per-chapter within `chapters` object
    };
}


export function showManageSubjects() {
    if (!data || typeof data.subjects !== 'object' || data.subjects === null) {
        console.error("Subject data is missing or invalid for showManageSubjects:", data);
        displayContent(`<div class="content-card text-center animate-fade-in"><p class="text-danger p-4">Subject data not loaded or invalid. Please try reloading.</p><button onclick="window.location.reload()" class="btn-secondary mt-2">Reload App</button></div>`);
        setActiveSidebarLink('showManageSubjects', 'testgen-dropdown-content');
        return;
    }

    const subjectsToDisplay = data.subjects; // This is the merged view (global def + user progress)
    let subjectEntries = Object.entries(subjectsToDisplay);

    if (currentUser && !currentUser.isAdmin) {
        subjectEntries = subjectEntries.filter(([id, subject]) => subject.status === 'approved');
    }

    let subjectsListHtml = subjectEntries.length > 0
        ? subjectEntries.map(([id, subject]) => {
            if (!subject || typeof subject !== 'object') {
                console.warn(`Invalid merged subject data for ID: ${id}. Skipping.`);
                return '';
            }
            const isCurrent = currentSubject && currentSubject.id === id;
            const subjectName = escapeHtml(subject.name || 'Unnamed Subject');
            // Definition fields from global part of merge
            const mcqFileName = escapeHtml(subject.mcqFileName || 'N/A');
            const textProblemsFileName = escapeHtml(subject.textProblemsFileName || 'Not Set');
            const lectureProblemsFileName = escapeHtml(subject.lectureProblemsFileName || 'Not Set');
            const lectureMcqFileName = escapeHtml(subject.lectureMcqFileName || 'Not Set');
            const courseDirName = escapeHtml(subject.courseDirName || 'N/A');
            const status = subject.status || 'approved';
            const creatorName = escapeHtml(subject.creatorName || 'Unknown');
            const createdAtDate = subject.createdAt?.toDate ? subject.createdAt.toDate() : (subject.createdAt ? new Date(subject.createdAt) : null);
            const createdAt = createdAtDate ? createdAtDate.toLocaleDateString() : 'N/A';


            let statusBadgeClass = 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-200';
            if (status === 'pending') statusBadgeClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-200';
            else if (status === 'rejected') statusBadgeClass = 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-200';

            const canSelect = status === 'approved';
            const canEditGlobal = currentUser.isAdmin || (subject.creatorUid === currentUser.uid && status === 'pending');
            const canDeleteGlobal = currentUser.isAdmin && Object.keys(globalSubjectDefinitionsMap).length > 1;

            let adminActionsHtml = '';
            if (currentUser.isAdmin && subject.id !== '1') { // Assuming '1' (FoP) isn't managed this way
                if (status === 'pending') {
                    adminActionsHtml = `<button onclick="window.handleSubjectApproval('${id}', 'approved')" class="btn-success-small text-xs">Approve</button>
                                        <button onclick="window.handleSubjectApproval('${id}', 'rejected')" class="btn-danger-small text-xs">Reject</button>`;
                } else if (status === 'rejected') {
                    adminActionsHtml = `<button onclick="window.handleSubjectApproval('${id}', 'approved')" class="btn-success-small text-xs">Re-approve</button>`;
                } else if (status === 'approved') {
                    adminActionsHtml = `<button onclick="window.handleSubjectApproval('${id}', 'rejected')" class="btn-warning-small text-xs">Revoke Approval</button>`;
                }
            }

            return `
            <div class="flex flex-wrap justify-between items-center p-3 ${isCurrent ? 'bg-primary-50 dark:bg-primary-800/30 border-primary-300 dark:border-primary-600' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'} rounded-md shadow-sm gap-2 mb-2 border transition-colors hover:bg-gray-100 dark:hover:bg-gray-600">
                <div class="flex-grow min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="font-semibold ${isCurrent ? 'text-primary-700 dark:text-primary-300' : 'text-gray-800 dark:text-gray-200'}" title="${subjectName}">${subjectName}</span>
                        <span class="text-xs px-2 py-0.5 rounded-full ${statusBadgeClass}">${status}</span>
                    </div>
                    <span class="block text-xs text-muted truncate" title="MCQs: ${mcqFileName} | TextProbs: ${textProblemsFileName} | LectProbs: ${lectureProblemsFileName} | LectMCQs: ${lectureMcqFileName} | Dir: ${courseDirName}">
                        (Files: ${mcqFileName}, ${textProblemsFileName}, ${lectureProblemsFileName || 'N/A'}, ${lectureMcqFileName || 'N/A'} in dir: ${courseDirName})
                    </span>
                    ${currentUser.isAdmin ? `<span class="block text-xs text-muted truncate">Created by: ${creatorName} on ${createdAt} (UID: ${subject.creatorUid || 'N/A'})</span>` : ''}
                </div>
                <div class="flex space-x-2 flex-shrink-0">
                    ${canSelect ? `<button onclick="window.selectSubject('${id}')" title="Select Subject" class="p-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 disabled:opacity-50 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed transition-colors" ${isCurrent ? 'disabled' : ''}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg></button>` : `<button title="Subject not approved for selection" class="p-1 text-gray-400 dark:text-gray-500 cursor-not-allowed" disabled><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" /></svg></button>`}
                    ${canEditGlobal ? `<button onclick="window.editSubject('${id}')" title="Edit Global Subject Definition" class="p-1 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" /></svg></button>` : ''}
                    ${adminActionsHtml}
                    ${canDeleteGlobal ? `<button onclick="window.confirmDeleteSubject('${id}')" title="Delete Global Subject Definition" class="p-1 text-danger hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.326.419C2.675 4.793 2 5.51 2 6.318V15.75A2.25 2.25 0 0 0 4.25 18h11.5A2.25 2.25 0 0 0 18 15.75V6.318c0-.808-.675-1.525-1.674-1.699a18.17 18.17 0 0 0-2.326-.419v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" /></svg></button>` : ''}
                </div>
            </div>`;
        }).join('')
        : `<p class="text-sm text-center text-muted py-4">No ${currentUser.isAdmin ? '' : 'approved '}global subjects found.</p>`;

    const formTitle = currentUser.isAdmin ? 'Add New Global Subject Definition' : 'Suggest New Global Subject Definition';
    const formHelpTextResources = `Files should be placed in <code>./courses/<b>{Course Directory Name}</b>/${SUBJECT_RESOURCE_FOLDER}/</code>. Chapter content (titles, question counts) will be parsed from the MCQ file.`;

    let output = `
        <div class="animate-fade-in space-y-6">
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Manage Subjects (Test Generation)</h2>
            <div class="content-card">
                <h3 class="text-lg font-semibold mb-4 border-b pb-2 dark:border-gray-700">Available Subjects ${currentUser.isAdmin ? '' : '(Approved Only)'}</h3>
                <div class="space-y-2">${subjectsListHtml}</div>
            </div>
            <div class="content-card">
                <h3 class="text-lg font-semibold mb-4 border-b pb-2 dark:border-gray-700">${formTitle}</h3>
                <form id="add-subject-form" onsubmit="window.addSubject(event)" class="space-y-4">
                    <div><label for="subject-name">Subject Name</label><input id="subject-name" type="text" placeholder="e.g., Quantum Mechanics" required></div>
                    <div><label for="subject-coursedirname">Resource Directory Name</label><input id="subject-coursedirname" type="text" placeholder="e.g., quantum_mechanics_adv" required><p class="form-help-text">A unique folder name for this subject's resources (under <code>./courses/</code>).</p></div>
                    <div><label for="subject-mcqfilename">MCQ Markdown Filename</label><input id="subject-mcqfilename" type="text" placeholder="e.g., QM_MCQs.md" required pattern="^[^\\\\/:\\*?\\"<>\\|]+$" title="Filename cannot contain invalid characters."><p class="form-help-text">Main MCQ definition file. Must end in '.md'. ${formHelpTextResources}</p></div>
                    <div><label for="subject-textproblemsfilename">Text Problems Filename (Optional)</label><input id="subject-textproblemsfilename" type="text" placeholder="e.g., QM_TextProblems.md" pattern="^[^\\\\/:\\*?\\"<>\\|]+$"><p class="form-help-text">For textbook-style problems. Must end in '.md' if provided.</p></div>
                    <div><label for="subject-lectureproblemsfilename">Lecture Problems Filename (Optional)</label><input id="subject-lectureproblemsfilename" type="text" placeholder="e.g., QM_LectureProblems.md" pattern="^[^\\\\/:\\*?\\"<>\\|]+$"><p class="form-help-text">For problems derived from lecture content. Must end in '.md' if provided.</p></div>
                    <div><label for="subject-lecturemcqfilename">Lecture MCQ Filename (Optional)</label><input id="subject-lecturemcqfilename" type="text" placeholder="e.g., QM_LectureMCQs.md" pattern="^[^\\\\/:\\*?\\"<>\\|]+$"><p class="form-help-text">If MCQs from lectures are separate. Must end in '.md' if provided.</p></div>
                    <div><label for="subject-textSourceRatio">Text Source Problem Ratio (0-1)</label><input type="number" id="subject-textSourceRatio" min="0" max="1" step="0.05" value="0.7" required><p class="form-help-text">Default proportion of problems from text-based sources vs. lecture-based. (e.g. 0.7 = 70% Text)</p></div>
                    <div><label for="max-questions">Max Questions per Test</label><input id="max-questions" type="number" min="10" value="${DEFAULT_MAX_QUESTIONS}" placeholder="e.g., ${DEFAULT_MAX_QUESTIONS}" required><p class="form-help-text">Minimum 10.</p></div>
                    <div><label for="mcq-problem-ratio">MCQ/Problem Ratio (%)</label><input id="mcq-problem-ratio" type="number" min="0" max="100" step="5" value="${DEFAULT_MCQ_PROBLEM_RATIO * 100}" required><p class="form-help-text">Target MCQs (0-100%).</p></div>
                    <div><label for="default-duration">Default Test Duration (Minutes)</label><input id="default-duration" type="number" min="10" value="${DEFAULT_ONLINE_TEST_DURATION_MINUTES}" required><p class="form-help-text">Minimum 10 minutes.</p></div>
                    <button type="submit" class="btn-primary w-full !mt-6">${currentUser.isAdmin ? 'Add Global Subject' : 'Suggest Global Subject'}</button>
                </form>
            </div>
        </div>`;

    displayContent(output);
    setActiveSidebarLink('showManageSubjects', 'testgen-dropdown-content');
}

export async function addSubject(event) {
    event.preventDefault();
    if (!currentUser) { alert("Cannot add subject: User not logged in."); return; }
    showLoading("Submitting Subject...");

    const name = document.getElementById('subject-name')?.value.trim();
    const courseDirNameRaw = document.getElementById('subject-coursedirname')?.value.trim();
    const mcqFileNameRaw = document.getElementById('subject-mcqfilename')?.value.trim();
    const textProblemsFileNameRaw = document.getElementById('subject-textproblemsfilename')?.value.trim() || null;
    const lectureProblemsFileNameRaw = document.getElementById('subject-lectureproblemsfilename')?.value.trim() || null;
    const lectureMcqFileNameRaw = document.getElementById('subject-lecturemcqfilename')?.value.trim() || null;

    const textSourceRatio = parseFloat(document.getElementById('subject-textSourceRatio')?.value);
    const max_questions = parseInt(document.getElementById('max-questions')?.value);
    const ratioPercent = parseFloat(document.getElementById('mcq-problem-ratio')?.value);
    const defaultDuration = parseInt(document.getElementById('default-duration')?.value);

    // Clean filenames
    const courseDirName = cleanTextForFilename(courseDirNameRaw);
    const mcqFileName = cleanTextForFilename(mcqFileNameRaw);
    const textProblemsFileName = textProblemsFileNameRaw ? cleanTextForFilename(textProblemsFileNameRaw) : null;
    const lectureProblemsFileName = lectureProblemsFileNameRaw ? cleanTextForFilename(lectureProblemsFileNameRaw) : null;
    const lectureMcqFileName = lectureMcqFileNameRaw ? cleanTextForFilename(lectureMcqFileNameRaw) : null;


    if (!name || !mcqFileName || !courseDirName) { hideLoading(); alert("Name, MCQ Filename, and Resource Directory Name are required."); return; }
    if (!mcqFileName.endsWith('.md') || (textProblemsFileName && !textProblemsFileName.endsWith('.md')) || (lectureProblemsFileName && !lectureProblemsFileName.endsWith('.md')) || (lectureMcqFileName && !lectureMcqFileName.endsWith('.md'))) {
        hideLoading(); alert("All specified filenames must end with .md"); return;
    }
    if (isNaN(textSourceRatio) || textSourceRatio < 0 || textSourceRatio > 1) { hideLoading(); alert("Invalid Text Source Ratio."); return; }
    if (isNaN(max_questions) || max_questions < 10) { hideLoading(); alert("Max Questions must be at least 10."); return; }
    if (isNaN(ratioPercent) || ratioPercent < 0 || ratioPercent > 100) { hideLoading(); alert("Invalid MCQ Ratio."); return; }
    if (isNaN(defaultDuration) || defaultDuration < 10) { hideLoading(); alert("Default Duration must be at least 10 minutes."); return; }


    const newSubjectDefData = {
        name: name,
        mcqFileName: mcqFileName,
        textProblemsFileName: textProblemsFileName,
        lectureProblemsFileName: lectureProblemsFileName,
        lectureMcqFileName: lectureMcqFileName,
        courseDirName: courseDirName, // Store cleaned version
        textSourceRatio: textSourceRatio,
        max_questions_per_test: max_questions,
        mcqProblemRatio: ratioPercent / 100.0,
        defaultTestDurationMinutes: defaultDuration,
        status: currentUser.isAdmin ? 'approved' : 'pending',
        // creatorUid, creatorName, createdAt will be set by adminAddGlobalSubject
    };

    try {
        const addedSubjectDef = await adminAddGlobalSubject(newSubjectDefData); // From firebase_firestore.js
        hideLoading();
        if (addedSubjectDef) {
            alert(`Global subject "${addedSubjectDef.name}" ${addedSubjectDef.status === 'approved' ? 'added successfully!' : 'suggested and is pending review.'}`);
            showManageSubjects();
        } else {
            alert("Failed to add global subject definition."); // adminAddGlobalSubject should throw on error
        }
    } catch (error) {
        console.error("Error adding global subject via wrapper:", error);
        hideLoading();
        alert("Failed to add subject: " + error.message);
    }
}

export function editSubject(id) {
    const subjectDef = globalSubjectDefinitionsMap.get(id);
    if (!subjectDef) {
        alert("Global subject definition not found in local cache. Please refresh."); return;
    }
    if (!currentUser.isAdmin && !(subjectDef.creatorUid === currentUser.uid && subjectDef.status === 'pending')) {
        alert("You do not have permission to edit this global subject definition."); return;
    }

    const maxQuestions = subjectDef.max_questions_per_test ?? DEFAULT_MAX_QUESTIONS;
    const mcqRatioPercent = (subjectDef.mcqProblemRatio ?? DEFAULT_MCQ_PROBLEM_RATIO) * 100;
    const defaultDuration = subjectDef.defaultTestDurationMinutes ?? DEFAULT_ONLINE_TEST_DURATION_MINUTES;
    const textSourceRatioVal = (subjectDef.textSourceRatio ?? 0.7).toFixed(2);


    displayContent(`
        <div class="animate-fade-in">
            <h2 class="text-2xl font-semibold mb-6 ...">Edit Global Subject: <span class="...">${escapeHtml(subjectDef.name)}</span></h2>
            <form id="edit-subject-form" onsubmit="window.updateSubject(event, '${id}')" class="space-y-4 content-card">
                <div><label for="edit-subject-name">Subject Name</label><input id="edit-subject-name" type="text" value="${escapeHtml(subjectDef.name || '')}" required></div>
                <div><label for="edit-subject-coursedirname">Resource Directory Name</label><input id="edit-subject-coursedirname" type="text" value="${escapeHtml(subjectDef.courseDirName || '')}" required></div>
                <div><label for="edit-subject-mcqfilename">MCQ Filename</label><input id="edit-subject-mcqfilename" type="text" value="${escapeHtml(subjectDef.mcqFileName || '')}" required></div>
                <div><label for="edit-subject-textproblemsfilename">Text Problems Filename</label><input id="edit-subject-textproblemsfilename" type="text" value="${escapeHtml(subjectDef.textProblemsFileName || '')}"></div>
                <div><label for="edit-subject-lectureproblemsfilename">Lecture Problems Filename</label><input id="edit-subject-lectureproblemsfilename" type="text" value="${escapeHtml(subjectDef.lectureProblemsFileName || '')}"></div>
                <div><label for="edit-subject-lecturemcqfilename">Lecture MCQ Filename</label><input id="edit-subject-lecturemcqfilename" type="text" value="${escapeHtml(subjectDef.lectureMcqFileName || '')}"></div>
                <div><label for="edit-subject-textSourceRatio">Text Source Problem Ratio (0-1)</label><input type="number" id="edit-subject-textSourceRatio" value="${textSourceRatioVal}" min="0" max="1" step="0.05" required></div>
                <div><label for="edit-max-questions">Max Questions per Test</label><input id="edit-max-questions" type="number" min="10" value="${maxQuestions}" required></div>
                <div><label for="edit-mcq-problem-ratio">MCQ/Problem Ratio (%)</label><input id="edit-mcq-problem-ratio" type="number" min="0" max="100" step="5" value="${mcqRatioPercent.toFixed(0)}" required></div>
                <div><label for="edit-default-duration">Default Test Duration (Minutes)</label><input id="edit-default-duration" type="number" min="10" value="${defaultDuration}" required></div>
                <div><label>Status</label><p class="form-control-plaintext ...">${escapeHtml(subjectDef.status)}</p></div>
                <div class="flex ..."><button type="submit" class="btn-primary ...">Save Changes</button><button type="button" onclick="window.showManageSubjects()" class="btn-secondary ...">Cancel</button></div>
            </form>
        </div>`);
    setActiveSidebarLink('showManageSubjects', 'testgen-dropdown-content');
}

export async function updateSubject(event, id) {
    event.preventDefault();
    const subjectDef = globalSubjectDefinitionsMap.get(id);
    if (!subjectDef) { alert("Global subject definition not found."); return; }
    if (!currentUser.isAdmin && !(subjectDef.creatorUid === currentUser.uid && subjectDef.status === 'pending')) {
        alert("Permission denied to update this global subject."); return;
    }

    const courseDirNameRaw = document.getElementById('edit-subject-coursedirname')?.value.trim();
    const mcqFileNameRaw = document.getElementById('edit-subject-mcqfilename')?.value.trim();
    const textProblemsFileNameRaw = document.getElementById('edit-subject-textproblemsfilename')?.value.trim() || null;
    const lectureProblemsFileNameRaw = document.getElementById('edit-subject-lectureproblemsfilename')?.value.trim() || null;
    const lectureMcqFileNameRaw = document.getElementById('edit-subject-lecturemcqfilename')?.value.trim() || null;

    const updates = {
        name: document.getElementById('edit-subject-name')?.value.trim(),
        courseDirName: cleanTextForFilename(courseDirNameRaw),
        mcqFileName: cleanTextForFilename(mcqFileNameRaw),
        textProblemsFileName: textProblemsFileNameRaw ? cleanTextForFilename(textProblemsFileNameRaw) : null,
        lectureProblemsFileName: lectureProblemsFileNameRaw ? cleanTextForFilename(lectureProblemsFileNameRaw) : null,
        lectureMcqFileName: lectureMcqFileNameRaw ? cleanTextForFilename(lectureMcqFileNameRaw) : null,
        textSourceRatio: parseFloat(document.getElementById('edit-subject-textSourceRatio')?.value),
        max_questions_per_test: parseInt(document.getElementById('edit-max-questions')?.value),
        mcqProblemRatio: parseFloat(document.getElementById('edit-mcq-problem-ratio')?.value) / 100.0,
        defaultTestDurationMinutes: parseInt(document.getElementById('edit-default-duration')?.value),
    };

    // Validation for updates (similar to addSubject)
    if (!updates.name || !updates.mcqFileName || !updates.courseDirName) { alert("Name, MCQ Filename, and Directory Name are required."); return; }
    // ... other validations ...

    showLoading("Saving Global Subject Definition...");
    try {
        const updatedDefFromFS = await adminUpdateGlobalSubjectDefinition(id, updates); // From firebase_firestore.js
        hideLoading();
        if (updatedDefFromFS) {
            alert(`Global subject "${updatedDefFromFS.name}" definition updated!`);

            // If the currentSubject being used for TestGen was this one, update it
            if (currentSubject && currentSubject.id === id) {
                // Fetch the user's specific progress for this subject again
                const userProgressData = await loadUserSubjectProgress(currentUser.uid);
                const progressForThisSubject = userProgressData[id] || getDefaultSubjectProgressStatsForUser();

                let newCurrentSubjectState = { ...updatedDefFromFS, ...progressForThisSubject };

                // Re-parse MD if filenames changed or for good measure
                const newMdContent = await fetchMarkdownForGlobalSubject(updatedDefFromFS);
                if (newMdContent) {
                    // Logic to update newCurrentSubjectState.chapters with new MD titles/totals
                    // while trying to preserve user's available_questions based on new totals.
                    const parsedMdChapters = parseChaptersFromMarkdown(newMdContent);
                    newCurrentSubjectState.chapters = {};
                    for (const chapNumStr in parsedMdChapters) {
                        const mdChapData = parsedMdChapters[chapNumStr];
                        const userChapProgress = progressForThisSubject.chapters?.[chapNumStr] || {};
                        newCurrentSubjectState.chapters[chapNumStr] = {
                            title: mdChapData.title || `Chapter ${chapNumStr}`,
                            total_questions: mdChapData.total_questions || 0,
                            total_attempted: userChapProgress.total_attempted || 0,
                            total_wrong: userChapProgress.total_wrong || 0,
                            mistake_history: userChapProgress.mistake_history || [],
                            consecutive_mastery: userChapProgress.consecutive_mastery || 0,
                            available_questions: Array.isArray(userChapProgress.available_questions) && userChapProgress.available_questions.length > 0
                                ? userChapProgress.available_questions.filter(qN => qN > 0 && qN <= (mdChapData.total_questions || 0))
                                : Array.from({ length: mdChapData.total_questions || 0 }, (_, j) => j + 1)
                        };
                    }
                } else {
                    newCurrentSubjectState.chapters = progressForThisSubject.chapters || {}; // Fallback
                }
                setCurrentSubject(newCurrentSubjectState);
                updateSubjectInfo(); // Update header display
            }
            showManageSubjects(); // Refresh the list of global subjects
        } else {
            alert("Failed to update global subject definition."); // adminUpdate should throw on error
        }
    } catch (error) {
        console.error("Error updating global subject def via wrapper:", error);
        hideLoading();
        alert("Failed to update subject definition: " + error.message);
    }
}

export async function selectSubject(id) {
    if (!currentUser || !globalSubjectDefinitionsMap.has(id)) {
        alert("Could not select subject. Global definition missing or invalid ID.");
        return;
    }
    const subjectDef = globalSubjectDefinitionsMap.get(id);
    if (subjectDef.status !== 'approved') {
        alert("This global subject is not yet approved and cannot be selected for use.");
        return;
    }
    showLoading("Switching Subject...");

    // 1. Fetch user's specific progress for this global subject
    const userProgressData = await loadUserSubjectProgress(currentUser.uid);
    const progressForThisSubject = userProgressData[id] || getDefaultSubjectProgressStatsForUser();

    // 2. Create the base merged subject (global def + user progress shell)
    let mergedSubject = {
        ...subjectDef, // Global definition fields (name, filenames, ratios, status, etc.)
        // User-specific progress fields (overwriting any same-named fields from globalDef if they existed)
        chapters: {}, // Initialize; will be populated by MD parse + user progress
        studied_chapters: progressForThisSubject.studied_chapters || [],
        pending_exams: progressForThisSubject.pending_exams || [],
        // Note: total_attempted, total_wrong, etc., are per-chapter in this model
    };

    // 3. Fetch and parse MD content for chapter titles, total_questions, and initial available_questions
    const subjectMarkdown = await fetchMarkdownForGlobalSubject(subjectDef); // Uses subjectDef.mcqFileName & courseDirName
    if (subjectMarkdown) {
        const parsedMdChapters = parseChaptersFromMarkdown(subjectMarkdown);

        for (const chapNumStr in parsedMdChapters) {
            const mdChapData = parsedMdChapters[chapNumStr];
            const userChapProgressForThisChapter = progressForThisSubject.chapters?.[chapNumStr] || {
                total_attempted: 0, total_wrong: 0, mistake_history: [], consecutive_mastery: 0, available_questions: []
            };

            let finalAvailableQuestions;
            const totalMcqsFromMd = mdChapData.total_questions || 0;

            if (Array.isArray(userChapProgressForThisChapter.available_questions) && userChapProgressForThisChapter.available_questions.length > 0) {
                // Filter user's list against the new total from MD
                finalAvailableQuestions = userChapProgressForThisChapter.available_questions.filter(qN =>
                    typeof qN === 'number' && qN > 0 && qN <= totalMcqsFromMd
                ).sort((a, b) => a - b);
            } else {
                // Initialize available questions if user has no progress for this chapter or list is empty
                finalAvailableQuestions = Array.from({ length: totalMcqsFromMd }, (_, j) => j + 1);
            }

            mergedSubject.chapters[chapNumStr] = {
                title: mdChapData.title || `Chapter ${chapNumStr}`,
                total_questions: totalMcqsFromMd,
                // Progress stats
                total_attempted: userChapProgressForThisChapter.total_attempted || 0,
                total_wrong: userChapProgressForThisChapter.total_wrong || 0,
                mistake_history: userChapProgressForThisChapter.mistake_history || [],
                consecutive_mastery: userChapProgressForThisChapter.consecutive_mastery || 0,
                available_questions: finalAvailableQuestions
            };
        }
    } else {
        console.warn(`MD file for subject ${subjectDef.name} (mcqFile: ${subjectDef.mcqFileName}) missing or errored. Chapter titles/counts may be incomplete. Using any existing user chapter progress structure.`);
        // If MD fails, try to retain existing chapter structure from user progress, but titles/totals might be missing
        mergedSubject.chapters = progressForThisSubject.chapters || {};
        // Ensure progress parts within chapters are defaulted if missing
        for(const chapNumStr in mergedSubject.chapters) {
            const chap = mergedSubject.chapters[chapNumStr];
            chap.title = chap.title || `Chapter ${chapNumStr}`;
            chap.total_questions = chap.total_questions || 0;
            chap.total_attempted = chap.total_attempted || 0;
            chap.total_wrong = chap.total_wrong || 0;
            chap.mistake_history = chap.mistake_history || [];
            chap.consecutive_mastery = chap.consecutive_mastery || 0;
            chap.available_questions = chap.available_questions || [];
        }
    }

    setCurrentSubject(mergedSubject); // Set the fully merged and MD-parsed subject as current
    updateSubjectInfo(); // Update UI header

    // Save the ID of this selected global subject to the user's top-level document
    await db.collection('users').doc(currentUser.uid).set({ lastSelectedSubjectId: id }, { merge: true });
    console.log(`Selected subject (merged global+user): ${mergedSubject.name} (ID: ${id})`);
    showHomeDashboard(); // Navigate to home
    hideLoading();
}


export function confirmDeleteSubject(id) {
    const subjectDef = globalSubjectDefinitionsMap.get(id);
    if (!subjectDef) { alert("Global subject definition not found."); return; }

    // Permission check for deleting global subjects
    if (!currentUser.isAdmin) { // Only admins can delete approved global subjects
        if (!(subjectDef.creatorUid === currentUser.uid && subjectDef.status === 'pending')) {
            alert("You do not have permission to delete this global subject definition."); return;
        }
    }
    // Admin constraint: cannot delete the last one or special one like '1' (FoP)
    if (currentUser.isAdmin && subjectDef.id === '1' && Object.keys(globalSubjectDefinitionsMap).length > 1) {
         alert("The 'Fundamentals of Physics' base subject definition cannot be deleted if other subjects exist. To remove it, ensure it's the only subject left or manage its resources directly.");
         return;
    }
    if (currentUser.isAdmin && Object.keys(globalSubjectDefinitionsMap).length <= 1 && subjectDef.id !== '1') { // If trying to delete the non-FoP one when it's the last
        alert("Cannot delete the last global subject definition via this UI. Manage directly in Firestore if necessary."); return;
    }


    if (confirm(`Permanently delete global subject definition "${escapeHtml(subjectDef.name)}"? This action CANNOT be undone. User progress for this subject will become orphaned (but not deleted).`)) {
        deleteSubject(id);
    }
}

export async function deleteSubject(id) {
    const subjectDef = globalSubjectDefinitionsMap.get(id); // For permission check
    if (!subjectDef) { alert("Global subject definition not found."); return; }
    if (!currentUser.isAdmin && !(subjectDef.creatorUid === currentUser.uid && subjectDef.status === 'pending')) {
        alert("Permission denied."); return;
    }
    if (currentUser.isAdmin && subjectDef.id === '1' && Object.keys(globalSubjectDefinitionsMap).length > 1) {
         alert("The 'Fundamentals of Physics' base subject definition cannot be deleted if other subjects exist.");
         return;
    }
     if (currentUser.isAdmin && Object.keys(globalSubjectDefinitionsMap).length <= 1 && subjectDef.id !== '1') {
        alert("Cannot delete the last subject definition."); return;
    }


    showLoading("Deleting Global Subject Definition...");
    try {
        await adminDeleteGlobalSubject(id); // From firebase_firestore.js, handles Firestore & local cache
        hideLoading();
        alert(`Global subject definition "${escapeHtml(subjectDef.name)}" deleted.`);

        if (currentSubject && currentSubject.id === id) {
            // Try to select the FoP subject if available and approved, or any other approved, or null
            let fallbackId = null;
            const fopCandidate = globalSubjectDefinitionsMap.get("1");
            if (fopCandidate && fopCandidate.status === 'approved') {
                fallbackId = "1";
            } else {
                fallbackId = Array.from(globalSubjectDefinitionsMap.keys()).find(key =>
                    globalSubjectDefinitionsMap.get(key).status === 'approved'
                ) || null;
            }

            if (fallbackId) {
                await selectSubject(fallbackId); // This will load its progress and set currentSubject
            } else {
                setCurrentSubject(null);
                updateSubjectInfo();
                showManageSubjects(); // Or home if no subjects left to select
            }
        } else {
            showManageSubjects(); // Refresh list
        }
    } catch (error) {
        console.error("Error deleting global subject definition via wrapper:", error);
        hideLoading();
        alert("Failed to delete subject definition: " + error.message);
    }
}


export async function handleSubjectApproval(subjectId, newStatus) {
    if (!currentUser.isAdmin) {
        alert("Admin privileges required to approve/reject global subjects."); return;
    }
    const subjectDef = globalSubjectDefinitionsMap.get(subjectId);
    if (!subjectDef) { alert("Global subject definition not found."); return; }
    if (subjectDef.id === '1') { // FoP special handling
         alert("'Fundamentals of Physics' status is managed internally and cannot be changed via this UI button. It's always considered 'approved'. To hide/show, manage its definition or resources.");
         return;
    }

    const actionText = newStatus === 'approved' ? 'approve' : (newStatus === 'rejected' ? 'reject' : `set to ${newStatus}`);
    if (confirm(`Are you sure you want to ${actionText} the global subject "${escapeHtml(subjectDef.name)}"?`)) {
        showLoading("Updating global subject status...");
        try {
            // Calls adminUpdateGlobalSubjectDefinition which updates Firestore and local globalSubjectDefinitionsMap
            const updatedDef = await adminUpdateGlobalSubjectDefinition(subjectId, { status: newStatus });
            hideLoading();
            if (updatedDef) {
                alert(`Global subject "${escapeHtml(updatedDef.name)}" status updated to ${newStatus}.`);
                // If current user's currentSubject was this one, and it's no longer approved, clear it.
                if (currentSubject && currentSubject.id === subjectId && newStatus !== 'approved') {
                    setCurrentSubject(null);
                    updateSubjectInfo(); // Clear header
                     // No need to auto-select another here, let user pick from updated list.
                }
                // If the change resulted in the currentSubject's data being out of sync (e.g. status change)
                // we need to re-merge it for the UI.
                if (data.subjects[subjectId]) {
                    data.subjects[subjectId].status = newStatus; // Update merged view immediately
                }

                showManageSubjects(); // Refresh the list which reads from `data.subjects`
            } else {
                alert("Failed to update subject status (no updated definition returned).");
            }
        } catch (error) {
            console.error("Error updating global subject status via wrapper:", error);
            hideLoading();
            alert("Failed to update subject status: " + error.message);
        }
    }
}


// Ensure window assignments match function names
window.showManageSubjects = showManageSubjects;
window.selectSubject = selectSubject;
window.editSubject = editSubject;
window.updateSubject = updateSubject;
window.addSubject = addSubject;
window.confirmDeleteSubject = confirmDeleteSubject;
window.deleteSubject = deleteSubject;
window.handleSubjectApproval = handleSubjectApproval; // For global subjects

// --- END OF FILE ui_subjects.js ---