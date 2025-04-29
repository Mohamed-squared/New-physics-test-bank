

import { currentUser, globalCourseDataMap, db } from './state.js'; // Added db
import { showLoading, hideLoading, escapeHtml } from './utils.js';
// MODIFIED: Import Firestore save/load functions for notes
import { saveUserNotes, loadUserNotes, loadSharedNotes, saveSharedNote } from './firebase_firestore.js';
import { renderMathIn } from './utils.js';
import { generateAndDownloadPdfWithMathJax, generateTexSource } from './ui_pdf_generation.js';
// MODIFIED: Import AI functions, including the renamed aiReviewNoteWithAI
import { callGeminiTextAPI, reviewNoteWithAI as aiReviewNoteWithAI, convertNoteToLatex as aiConvertNoteToLatex, improveNoteWithAI as aiImproveNoteWithAI, getAllPdfTextForAI } from './ai_integration.js'; // Renamed import

// Global state for currently loaded notes for the active chapter
let currentLoadedUserNotes = [];
let currentLoadedSharedNotes = [];
let currentCourseIdForNotes = null;
let currentChapterNumForNotes = null;

// Note types (consistent with ai_integration or a shared constants file if preferred)
const NOTE_TYPES = {
    TEXT: 'text',
    LATEX: 'latex',
    FILE: 'file', // Could represent uploaded PDF, TXT, MD etc.
    AI_REVIEW: 'ai_review' // Special type for AI review results
};

/**
 * Displays the Notes & Documents panel for a specific chapter, loading data from Firestore.
 * This is now the main view for managing notes for a chapter.
 */
export async function showNotesDocumentsPanel(courseId, chapterNum) {
    const courseDef = globalCourseDataMap.get(courseId);
    if (!courseDef || !currentUser) return;

    currentCourseIdForNotes = courseId;
    currentChapterNumForNotes = chapterNum;

    // Target the main content area
    const targetElementId = 'content';
    const contentArea = document.getElementById(targetElementId);
    if (!contentArea) {
        console.error("Main content area not found.");
        return;
    }
    contentArea.innerHTML = `<div class="text-center p-4"><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-2 text-sm text-muted">Loading Notes & Documents for Chapter ${chapterNum}...</p></div>`;

    try {
        // Load notes from Firestore
        currentLoadedUserNotes = await loadUserNotes(currentUser.uid, courseId, chapterNum);
        currentLoadedSharedNotes = await loadSharedNotes(courseId, chapterNum);

        const panelHtml = `
         <div class="animate-fade-in space-y-6">
             <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
                 <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Chapter ${chapterNum}: Notes & Documents</h2>
                 <!-- Back button now goes to the Study Material page -->
                 <button onclick="window.showCourseStudyMaterial('${courseId}', ${chapterNum})" class="btn-secondary-small flex-shrink-0">
                     Back to Chapter Material
                 </button>
             </div>

             <div class="content-card border dark:border-gray-700">
                 <!-- Quick Access Section -->
                 <div class="mb-6 pb-4 border-b dark:border-gray-600">
                     <h4 class="text-base font-medium mb-2">Quick Access (AI Generated)</h4>
                     <div class="flex flex-wrap gap-2">
                         <button onclick="window.displayFormulaSheet('${courseId}', ${chapterNum})" class="btn-secondary-small text-xs">
                             Formula Sheet
                         </button>
                         <button onclick="window.displayChapterSummary('${courseId}', ${chapterNum})" class="btn-secondary-small text-xs">
                             Chapter Summary
                         </button>
                     </div>
                     <div id="formula-sheet-area" class="mt-4 hidden border-t dark:border-gray-700 pt-4">
                         <h4 class="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">Generated Formula Sheet</h4>
                         <div id="formula-sheet-content" class="prose prose-sm dark:prose-invert max-w-none p-3 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600 max-h-60 overflow-y-auto"></div>
                     </div>
                     <div id="chapter-summary-area" class="mt-4 hidden border-t dark:border-gray-700 pt-4">
                         <h4 class="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">Generated Chapter Summary</h4>
                         <div id="chapter-summary-content" class="prose prose-sm dark:prose-invert max-w-none p-3 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600 max-h-60 overflow-y-auto"></div>
                     </div>
                 </div>

                <!-- Your Notes Section -->
                <div class="mb-6 pb-4 border-b dark:border-gray-600">
                    <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                        <h4 class="text-base font-medium">Your Notes</h4>
                        <div class="flex gap-2 flex-shrink-0">
                            <button onclick="window.addNewNoteWrapper()" class="btn-success-small text-xs">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 mr-1"><path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" /></svg>
                                Add Note
                            </button>
                            <button onclick="window.uploadNoteWrapper()" class="btn-secondary-small text-xs">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 mr-1"><path d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.326.419C2.675 4.793 2 5.51 2 6.318V12.75A2.25 2.25 0 0 0 4.25 15h7.5A2.25 2.25 0 0 0 14 12.75V6.318c0-.808-.675-1.525-1.674-1.699A18.17 18.17 0 0 0 10 .757v.443A2.75 2.75 0 0 0 7.25 1h-1.5Z" /><path d="M8 5.75a.75.75 0 0 1 .75.75v3.19l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72V6.5A.75.75 0 0 1 8 5.75Z" /></svg>
                                Upload File
                            </button>
                        </div>
                    </div>
                    <div id="user-notes-list" class="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                        ${renderNotesList(currentLoadedUserNotes, true)}
                    </div>
                </div>

                <!-- Shared Notes Section (Optional - Uncomment to enable) -->
                 <!--
                 <div class="mb-6">
                     <div class="flex justify-between items-center mb-2">
                         <h4 class="text-base font-medium">Shared Notes</h4>
                         <button onclick="window.shareCurrentNoteWrapper()" class="btn-secondary-small text-xs" disabled title="Select one of your notes to share">
                             Share Selected Note
                         </button>
                     </div>
                     <div id="shared-notes-list" class="space-y-2 max-h-60 overflow-y-auto pr-2">
                         ${renderNotesList(currentLoadedSharedNotes, false)}
                     </div>
                 </div>
                 -->
             </div>
        </div>
        `;

        contentArea.innerHTML = panelHtml;
        // Render math in the newly added notes list
        await renderMathIn(document.getElementById('user-notes-list'));
        // await renderMathIn(document.getElementById('shared-notes-list')); // If shared notes enabled

    } catch (error) {
        console.error("Error loading or rendering notes panel:", error);
        contentArea.innerHTML = `<div class="content-card border border-red-300 dark:border-red-600"><p class="text-red-500 p-4 text-center">Error loading notes: ${error.message}</p></div>`;
    }
}

function renderNotesList(notes, isUserNotes) {
    if (!notes || notes.length === 0) {
        return '<p class="text-sm text-muted italic text-center py-4">No notes yet.</p>';
    }

    // Sort notes by timestamp descending (most recent first)
    const sortedNotes = [...notes].sort((a, b) => b.timestamp - a.timestamp);

    return sortedNotes.map(note => {
        const isLatex = note.type === NOTE_TYPES.LATEX;
        const isFile = note.type === NOTE_TYPES.FILE;
        const isReview = note.type === NOTE_TYPES.AI_REVIEW;
        const canEdit = isUserNotes && !isReview && !isFile; // Can only edit user's text/latex notes
        const canDelete = isUserNotes;
        const canView = true; // Everyone can view
        const canReviewWithAI = isUserNotes && (note.type === NOTE_TYPES.TEXT || note.type === NOTE_TYPES.LATEX);

        let previewContent = '';
        if (isFile) {
            previewContent = `<p class="text-xs mt-2 text-blue-600 dark:text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 inline mr-1"><path fill-rule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6.621a1.5 1.5 0 0 0-.44-1.06L9.94 2.439A1.5 1.5 0 0 0 8.878 2H4Zm4.5 4.75a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Z" clip-rule="evenodd" /></svg>File: ${escapeHtml(note.filename)}</p>`;
        } else if (isReview) {
            previewContent = `<p class="text-xs mt-2 text-purple-600 dark:text-purple-400"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 inline mr-1"><path d="M8.5 3.78a.75.75 0 0 0-1 0L6.146 5.146l-1.854.37a.75.75 0 0 0-.49.833l.806 1.72-.17 1.854a.75.75 0 0 0 .833.49l1.72-.806 1.366 1.366-.806 1.72a.75.75 0 0 0 .49.833l1.854-.17 1.366 1.366 1.72.806a.75.75 0 0 0 .833-.49l.37-1.854L14.22 9.5a.75.75 0 0 0 0-1l-1.366-1.366.17-1.854a.75.75 0 0 0-.833-.49l-1.72.806L9.854 2.146l-.806 1.72-.548-.087Z" /><path d="M8 1.5A6.5 6.5 0 1 0 8 14.5 6.5 6.5 0 0 0 8 1.5ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Z" /></svg>AI Review Result</p>`;
        } else { // TEXT or LATEX
            // Display first ~100 chars, stripping potential LaTeX for preview cleanliness
            const previewText = note.content
                .replace(/\$.*?\$/g, '[math]') // Replace inline math
                .replace(/\$\$[\s\S]*?\$\$/g, '[display math]') // Replace display math
                .replace(/\\\[[\s\S]*?\\\]/g, '[display math]')
                .replace(/\\\(.*?\\\)/g, '[math]')
                .replace(/\\begin{.*?}[\s\S]*?\\end{.*?}/g, '[LaTeX env]')
                .substring(0, 100);
            previewContent = `<p class="text-sm mt-2 line-clamp-2 prose prose-sm dark:prose-invert max-w-none">${escapeHtml(previewText)}${note.content.length > 100 ? '...' : ''}${isLatex ? '<span class="text-xs text-blue-500 ml-1">(LaTeX)</span>': ''}</p>`;
        }

        return `
            <div class="note-item bg-gray-50 dark:bg-gray-700/50 rounded p-3 border dark:border-gray-600 hover:shadow-sm transition-shadow duration-150">
                <div class="flex justify-between items-start gap-2">
                    <div class="flex-grow min-w-0">
                        <h5 class="font-medium text-sm truncate" title="${escapeHtml(note.title)}">${escapeHtml(note.title)}</h5>
                        <p class="text-xs text-muted">${new Date(note.timestamp).toLocaleString()}</p>
                        ${!isUserNotes && note.userName ? `<p class="text-xs text-muted">Shared By: ${escapeHtml(note.userName)}</p>` : ''}
                    </div>
                    <div class="flex gap-1 flex-shrink-0">
                        ${canEdit ? `<button onclick="window.editNoteWrapper('${note.id}')" class="btn-icon btn-secondary-small" title="Edit Note"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>` : ''}
                        ${canReviewWithAI ? `<button onclick="window.reviewNoteWithAIWrapper('${note.id}')" class="btn-icon btn-secondary-small" title="Review Note (AI)"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path d="M8.5 3.78a.75.75 0 0 0-1 0L6.146 5.146l-1.854.37a.75.75 0 0 0-.49.833l.806 1.72-.17 1.854a.75.75 0 0 0 .833.49l1.72-.806 1.366 1.366-.806 1.72a.75.75 0 0 0 .49.833l1.854-.17 1.366 1.366 1.72.806a.75.75 0 0 0 .833-.49l.37-1.854L14.22 9.5a.75.75 0 0 0 0-1l-1.366-1.366.17-1.854a.75.75 0 0 0-.833-.49l-1.72.806L9.854 2.146l-.806 1.72-.548-.087Z" /><path d="M8 1.5A6.5 6.5 0 1 0 8 14.5 6.5 6.5 0 0 0 8 1.5ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Z" /></svg></button>` : ''}
                        ${canDelete ? `<button onclick="window.deleteNoteWrapper('${note.id}')" class="btn-icon btn-danger-small" title="Delete Note"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>` : ''}
                        ${canView ? `<button onclick="window.viewNoteWrapper('${note.id}', ${isUserNotes})" class="btn-icon btn-secondary-small" title="View Note Content"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>` : ''}
                    </div>
                </div>
                ${previewContent}
            </div>
        `;
    }).join('');
}

// --- Note Management Functions ---

// Wrapper functions to ensure context is passed correctly
export function addNewNoteWrapper() {
    if (!currentCourseIdForNotes || !currentChapterNumForNotes) return;
    addNewNote(currentCourseIdForNotes, currentChapterNumForNotes);
}
export function uploadNoteWrapper() {
    if (!currentCourseIdForNotes || !currentChapterNumForNotes) return;
    uploadNote(currentCourseIdForNotes, currentChapterNumForNotes);
}
export function editNoteWrapper(noteId) {
    editNote(noteId);
}
export function deleteNoteWrapper(noteId) {
    deleteNote(noteId);
}
export function viewNoteWrapper(noteId, isUserNote) {
     viewNote(noteId, isUserNote);
}
export function shareCurrentNoteWrapper() {
     // Placeholder - Requires state to track selected note or more context
     alert("Sharing notes is not fully implemented yet. Select a note first.");
}
export function saveNoteChangesWrapper(noteId) {
    saveNoteChanges(noteId);
}
export function downloadLatexPdfWrapper(noteId) {
    downloadLatexPdf(noteId);
}
export function convertNoteToLatexWrapper() {
    convertNoteToLatex(); // Calls internal function
}
export function improveNoteWithAIWrapper() {
    improveNoteWithAI(); // Calls internal function
}
// MODIFIED: Export the wrapper function
export async function reviewNoteWithAIWrapper(noteId) {
     // Calls the *renamed* internal function
     _reviewNoteWithAIInternal(noteId);
}


export async function addNewNote(courseId, chapterNum) {
    const title = prompt('Enter note title:');
    if (!title) return;

    const note = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`, // More unique ID
        title: title.trim(),
        content: '',
        type: NOTE_TYPES.TEXT,
        timestamp: Date.now(),
        // Store course/chapter context within the note itself for easier finding
        courseId: courseId,
        chapterNum: chapterNum
    };

    currentLoadedUserNotes.push(note);
    await saveUserNotes(currentUser.uid, courseId, chapterNum, currentLoadedUserNotes); // Save immediately
    await showNotesDocumentsPanel(courseId, chapterNum); // Refresh panel
    editNote(note.id); // Open editor for the new note
}

export async function editNote(noteId) {
    const note = findNoteById(noteId, true); // Search user notes
    if (!note) { alert("Note not found for editing."); return; }
    if (note.type === NOTE_TYPES.FILE) { alert("Cannot directly edit uploaded files. View or delete instead."); return; }
    if (note.type === NOTE_TYPES.AI_REVIEW) { alert("Cannot edit AI Review results. View or delete instead."); return; }


    // Remove existing modal first
    document.getElementById('note-edit-modal')?.remove();

    const isLatex = note.type === NOTE_TYPES.LATEX;

    const modalHtml = `
        <div id="note-edit-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 animate-fade-in" aria-labelledby="note-edit-title" role="dialog" aria-modal="true">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 w-full max-w-3xl transform transition-all flex flex-col max-h-[90vh]">
                <div class="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 id="note-edit-title" class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Edit Note ${isLatex ? '(LaTeX Mode)' : ''}</h3>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="window.convertNoteToLatexWrapper()" class="btn-secondary-small text-xs" title="Convert current text to LaTeX format using AI">Convert to LaTeX (AI)</button>
                        ${isLatex ? `<button onclick="window.downloadLatexPdfWrapper('${note.id}')" class="btn-primary-small text-xs" title="Download this LaTeX note as PDF">Download LaTeX PDF</button>` : ''}
                        <button onclick="window.improveNoteWithAIWrapper()" class="btn-secondary-small text-xs" title="Ask AI to add details/clarifications">Improve with AI</button>
                        <button onclick="window.reviewNoteWithAIWrapper('${note.id}')" class="btn-secondary-small text-xs" title="Get AI feedback compared to chapter material">Review Note (AI)</button>
                        <button onclick="document.getElementById('note-edit-modal').remove()" class="btn-icon">×</button>
                    </div>
                </div>
                <input type="text" id="note-title-edit" value="${escapeHtml(note.title)}" class="w-full mb-3 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-shrink-0">
                <div class="flex-grow overflow-y-auto mb-4 border rounded dark:border-gray-600">
                    <textarea id="note-content-edit" class="w-full h-full p-2 font-mono text-sm border-none resize-none dark:bg-gray-700 dark:text-gray-100 focus:outline-none min-h-[40vh]">${escapeHtml(note.content)}</textarea>
                </div>
                <div class="flex justify-end gap-3 flex-shrink-0">
                    <button onclick="document.getElementById('note-edit-modal').remove()" class="btn-secondary">Cancel</button>
                    <button onclick="window.saveNoteChangesWrapper('${note.id}')" class="btn-primary">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('note-content-edit').focus(); // Focus editor
}

export async function saveNoteChanges(noteId) {
    const modal = document.getElementById('note-edit-modal');
    if (!modal) return;

    const title = document.getElementById('note-title-edit').value;
    const content = document.getElementById('note-content-edit').value;

    const noteIndex = currentLoadedUserNotes.findIndex(n => n.id === noteId);
    if (noteIndex === -1) { alert("Error: Could not find note to save."); modal.remove(); return; }

    // Update local state
    currentLoadedUserNotes[noteIndex] = {
        ...currentLoadedUserNotes[noteIndex],
        title: title.trim(),
        content: content, // Keep original spacing
        timestamp: Date.now(),
        // Check if content looks like LaTeX to update type, otherwise keep TEXT
        type: /(\$|\\begin{|\\documentclass|\\usepackage)/.test(content) ? NOTE_TYPES.LATEX : NOTE_TYPES.TEXT
    };

    modal.remove(); // Close modal first
    showLoading("Saving note...");
    const success = await saveUserNotes(currentUser.uid, currentCourseIdForNotes, currentChapterNumForNotes, currentLoadedUserNotes);
    hideLoading();

    if (success) {
        await showNotesDocumentsPanel(currentCourseIdForNotes, currentChapterNumForNotes); // Refresh panel
    } else {
        alert("Failed to save note changes.");
        // Potentially revert local state if save failed? (More complex)
    }
}

export async function convertNoteToLatex() { // Internal function called by wrapper
    const contentArea = document.getElementById('note-content-edit');
    if (!contentArea) return;
    const currentContent = contentArea.value;
    if (!currentContent) { alert("Nothing to convert."); return; }

    showLoading('Converting to LaTeX...');
    try {
        const latexContent = await aiConvertNoteToLatex(currentContent); // Use imported AI function
        contentArea.value = latexContent; // Update text area with LaTeX
        // Find the note being edited and mark its type as LATEX locally (will be saved with Save Changes)
        const noteId = document.querySelector('#note-edit-modal button[onclick*="saveNoteChangesWrapper"]')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (noteId) {
             const noteIndex = currentLoadedUserNotes.findIndex(n => n.id === noteId);
             if (noteIndex !== -1) {
                  currentLoadedUserNotes[noteIndex].type = NOTE_TYPES.LATEX;
                  // Update modal title visually
                  const titleElement = document.getElementById('note-edit-title');
                  if (titleElement && !titleElement.textContent.includes('(LaTeX Mode)')) {
                     titleElement.textContent += ' (LaTeX Mode)';
                 }
             }
        }
        alert("Content converted to LaTeX format. Review and click 'Save Changes'.");
    } catch (error) {
        console.error('Error converting to LaTeX:', error);
        alert('Failed to convert to LaTeX: ' + error.message);
    } finally {
        hideLoading();
    }
}

export async function improveNoteWithAI() { // Internal function called by wrapper
    const contentArea = document.getElementById('note-content-edit');
    if (!contentArea) return;
    const currentContent = contentArea.value;
    if (!currentContent) { alert("Nothing to improve."); return; }

    showLoading('Improving note with AI...');
    try {
        const improvedContent = await aiImproveNoteWithAI(currentContent); // Use imported AI function
        contentArea.value = improvedContent; // Update text area with combined content
    } catch (error) {
        console.error('Error improving note:', error);
        alert('Failed to improve note: ' + error.message);
    } finally {
        hideLoading();
    }
}

export async function uploadNote(courseId, chapterNum) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.pdf,.tex,.jpg,.jpeg,.png'; // Allow images too

    input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
         if (file.size > 10 * 1024 * 1024) { // Limit upload size (e.g., 10MB)
             alert("File size exceeds the 10MB limit.");
             return;
         }

        showLoading('Processing uploaded file...');
        try {
            let noteContent = '';
            let noteType = NOTE_TYPES.FILE;

            // Handle different file types
            if (file.type === 'application/pdf') {
                 noteContent = `[PDF File - ${file.name}]`; // Placeholder for PDF, actual content not stored
                 noteType = NOTE_TYPES.FILE;
                 // Optionally trigger background text extraction for AI features later? Requires storage.
                 // alert("PDF uploaded. Text extraction for AI features on PDF files is not yet fully supported.");
            } else if (file.type.startsWith('text/')) {
                 noteContent = await file.text();
                 noteType = file.name.toLowerCase().endsWith('.tex') ? NOTE_TYPES.LATEX : NOTE_TYPES.TEXT;
            } else if (file.type.startsWith('image/')) {
                 noteContent = `[Image File - ${file.name}]`;
                 noteType = NOTE_TYPES.FILE;
            } else {
                 noteContent = `[Unsupported File - ${file.name}]`;
                 noteType = NOTE_TYPES.FILE;
            }

            const note = {
                id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                title: file.name,
                content: noteContent, // Store placeholder or extracted text
                type: noteType,
                filename: file.name, // Always store original filename
                filetype: file.type, // Store MIME type
                timestamp: Date.now(),
                courseId: courseId,
                chapterNum: chapterNum,
                // Add a flag to indicate this was an upload if needed
                // isUpload: true
            };

            currentLoadedUserNotes.push(note);
            const success = await saveUserNotes(currentUser.uid, courseId, chapterNum, currentLoadedUserNotes); // Save updated list

            if (success) {
                 await showNotesDocumentsPanel(courseId, chapterNum); // Refresh panel
            } else {
                 // Remove the note locally if save failed
                 currentLoadedUserNotes.pop();
                 alert("Failed to save the uploaded note.");
            }

        } catch (error) {
            console.error('Error processing uploaded file:', error);
            alert('Failed to process uploaded file: ' + error.message);
        } finally {
            hideLoading();
        }
    };

    input.click();
}

export async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note? This cannot be undone.')) return;

    const noteIndex = currentLoadedUserNotes.findIndex(n => n.id === noteId);
    if (noteIndex === -1) { alert("Error: Note not found for deletion."); return; }

    // Remove locally first
    const deletedNote = currentLoadedUserNotes.splice(noteIndex, 1)[0];

    showLoading("Deleting note...");
    const success = await saveUserNotes(currentUser.uid, currentCourseIdForNotes, currentChapterNumForNotes, currentLoadedUserNotes); // Save the modified list
    hideLoading();

    if (success) {
        await showNotesDocumentsPanel(currentCourseIdForNotes, currentChapterNumForNotes); // Refresh panel
    } else {
        // Add note back locally if save failed
        currentLoadedUserNotes.splice(noteIndex, 0, deletedNote);
        alert("Failed to delete the note from storage.");
    }
}

export async function shareNote(noteId) {
     // Placeholder - Full implementation requires more complex Firestore rules and structure
     alert("Sharing notes requires further setup and is not fully implemented yet.");
    // const note = findNoteById(noteId, true);
    // if (!note) { alert("Could not find your note to share."); return; }
    // showLoading("Sharing note...");
    // const success = await saveSharedNote(currentCourseIdForNotes, currentChapterNumForNotes, note, currentUser);
    // hideLoading();
    // if (success) {
    //     alert("Note shared successfully!");
    //     // Refresh shared notes list?
    // } else {
    //     alert("Failed to share note.");
    // }
}

export async function viewNote(noteId, isUserNote) {
    const note = findNoteById(noteId, isUserNote);
    if (!note) { alert("Note not found."); return; }

    // Remove existing modal first
    document.getElementById('note-view-modal')?.remove();

    let contentHtml = '';
    if (note.type === NOTE_TYPES.FILE) {
        // MODIFIED: Display extracted text for PDFs if available, else show file info
         if (note.filetype === 'application/pdf' && note.content && !note.content.startsWith('[PDF File')) {
             contentHtml = `<h6 class="text-xs font-semibold mb-2 text-muted">Extracted PDF Text Preview:</h6><div class="prose prose-sm dark:prose-invert max-w-none border dark:border-gray-600 p-2 rounded bg-gray-100 dark:bg-gray-900/50">${escapeHtml(note.content).replace(/\n/g, '<br>')}</div>`;
         } else {
             contentHtml = `<p class="text-center text-muted italic p-4">File: ${escapeHtml(note.filename)} (${note.filetype || 'Unknown type'})</p><p class="text-center mt-2"><button class="btn-secondary-small" disabled title="File download not implemented">Download File</button></p>`;
         }
    } else if (note.type === NOTE_TYPES.AI_REVIEW) {
        contentHtml = `<div class="prose prose-sm dark:prose-invert max-w-none">${note.content}</div>`; // Assume content is already HTML formatted
    } else { // TEXT or LATEX
         contentHtml = `<div class="prose prose-sm dark:prose-invert max-w-none">${escapeHtml(note.content).replace(/\n/g, '<br>')}</div>`;
    }


    const modalHtml = `
        <div id="note-view-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 animate-fade-in" aria-labelledby="note-view-title" role="dialog" aria-modal="true">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 w-full max-w-3xl transform transition-all flex flex-col max-h-[90vh]">
                <div class="flex justify-between items-center mb-4 flex-shrink-0 pb-3 border-b dark:border-gray-600">
                    <h3 id="note-view-title" class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 truncate" title="${escapeHtml(note.title)}">${escapeHtml(note.title)}</h3>
                    <button onclick="document.getElementById('note-view-modal').remove()" class="btn-icon">×</button>
                </div>
                <div id="note-view-content-area" class="flex-grow overflow-y-auto mb-4 pr-2">
                   ${contentHtml}
                </div>
                <div class="flex justify-end gap-3 flex-shrink-0 pt-3 border-t dark:border-gray-600">
                    ${isUserNote && note.type === NOTE_TYPES.LATEX ? `<button onclick="window.downloadLatexPdfWrapper('${note.id}')" class="btn-primary-small text-xs">Download LaTeX PDF</button>` : ''}
                    ${isUserNote && note.type !== NOTE_TYPES.AI_REVIEW && note.type !== NOTE_TYPES.FILE ? `<button onclick="window.reviewNoteWithAIWrapper('${note.id}')" class="btn-secondary-small text-xs">Review Note (AI)</button>` : ''}
                    <button onclick="document.getElementById('note-view-modal').remove()" class="btn-secondary">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Render MathJax if it's text/latex content (and not AI review which is HTML)
    if (note.type === NOTE_TYPES.TEXT || note.type === NOTE_TYPES.LATEX) {
        await renderMathIn(document.getElementById('note-view-content-area'));
    } else if (note.type === NOTE_TYPES.AI_REVIEW) {
         await renderMathIn(document.getElementById('note-view-content-area')); // AI review might contain MathJax too
    }
}


// Helper to find a note by ID in either user or shared lists
function findNoteById(noteId, searchUserNotes) {
    const listToSearch = searchUserNotes ? currentLoadedUserNotes : currentLoadedSharedNotes;
    return listToSearch.find(note => note.id === noteId) || null;
}


// MODIFIED: Renamed the internal function to avoid conflict
export async function _reviewNoteWithAIInternal(noteId) {
     const note = findNoteById(noteId, true); // Find in user notes
     if (!note || note.type === NOTE_TYPES.FILE || note.type === NOTE_TYPES.AI_REVIEW) {
         alert("Cannot review this note type or note not found.");
         return;
     }
      // Close view modal if open
     document.getElementById('note-view-modal')?.remove();

     showLoading("Generating AI Review...");
     try {
         // Pass the actual note content, courseId, and chapterNum
         const reviewHtml = await aiReviewNoteWithAI(note.content, note.courseId, note.chapterNum); // Using renamed import from ai_integration.js

         // Create a new "note" object for the review result
         const reviewNote = {
             id: `review_${note.id}_${Date.now()}`,
             title: `AI Review for: ${note.title}`,
             content: reviewHtml, // Store the generated HTML directly
             type: NOTE_TYPES.AI_REVIEW,
             timestamp: Date.now(),
             courseId: note.courseId,
             chapterNum: note.chapterNum,
             originalNoteId: note.id // Link back to the original note
         };

         // Add the review to the user's notes and save
         currentLoadedUserNotes.push(reviewNote);
         const success = await saveUserNotes(currentUser.uid, note.courseId, note.chapterNum, currentLoadedUserNotes);

         hideLoading();
         if (success) {
             await showNotesDocumentsPanel(note.courseId, note.chapterNum); // Refresh panel
             viewNote(reviewNote.id, true); // Open the review in the viewer
         } else {
             // Remove local review note if save failed
             currentLoadedUserNotes.pop();
             alert("Failed to save AI review.");
         }

     } catch (error) {
         hideLoading();
         console.error("Error getting AI note review:", error);
         alert(`Failed to get AI review: ${error.message}`);
     }
}


// --- NEW: Download LaTeX Note as PDF ---
export async function downloadLatexPdf(noteId) {
    const note = findNoteById(noteId, true);
    if (!note || note.type !== NOTE_TYPES.LATEX) {
        alert("Cannot download PDF: Note is not in LaTeX format or not found.");
        return;
    }
    showLoading("Generating LaTeX PDF...");
    try {
        // Basic LaTeX document structure
        // Note: This assumes the note.content is ONLY the body, not a full document
        const fullTexSource = `\\documentclass[12pt]{article}\n\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\usepackage{amsfonts}\n\\usepackage[margin=2cm]{geometry}\n\\begin{document}\n\n\\section*{${escapeHtml(note.title)}}\n\n${note.content}\n\n\\end{document}`;

        // Generate HTML preview for PDF rendering
        const styles = `<style> body { font-family: 'Times New Roman', Times, serif; line-height: 1.4; font-size: 11pt; margin: 1.5cm; } h2 { text-align: center; margin-bottom: 1em; font-size: 14pt; font-weight: bold; } mjx-container { text-align: left !important; margin: 0.5em 0 !important; display: block !important; } mjx-container[display="true"] { display: block; overflow-x: auto; } mjx-container > svg { max-width: 100%; vertical-align: middle; } </style>`;
        // Convert LaTeX content to something MathJax can render - replace LaTeX line breaks with <br> for HTML rendering
        const contentHtml = `<div class="prose">${note.content.replace(/\\\\/g, '<br>')}</div>`; // Simple replacement
        const pdfHtml = `<!DOCTYPE html><html><head><title>${escapeHtml(note.title)}</title>${styles}</head><body><h2>${escapeHtml(note.title)}</h2>${contentHtml}</body></html>`;

        const filename = `Note_${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
        await generateAndDownloadPdfWithMathJax(pdfHtml, filename); // Reuse existing function

    } catch (error) {
        hideLoading();
        console.error("Error generating LaTeX PDF:", error);
        alert(`Failed to generate PDF for LaTeX note: ${error.message}`);
    } finally {
         hideLoading(); // Ensure loading is hidden
    }
}



// Attach wrapper functions to window scope
window.addNewNoteWrapper = addNewNoteWrapper;
window.editNoteWrapper = editNoteWrapper;
window.saveNoteChangesWrapper = saveNoteChanges;
window.uploadNoteWrapper = uploadNoteWrapper;
window.deleteNoteWrapper = deleteNoteWrapper;
window.shareCurrentNoteWrapper = shareCurrentNoteWrapper;
window.viewNoteWrapper = viewNoteWrapper;
window.convertNoteToLatexWrapper = convertNoteToLatexWrapper;
window.improveNoteWithAIWrapper = improveNoteWithAIWrapper;
window.reviewNoteWithAIWrapper = reviewNoteWithAIWrapper; // Use wrapper
window.downloadLatexPdfWrapper = downloadLatexPdfWrapper; // Assign new PDF download wrapper

// --- END OF FILE ui_notes_documents.js ---