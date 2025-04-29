import { currentUser, globalCourseDataMap, db } from './state.js'; // Added db
import { showLoading, hideLoading, escapeHtml } from './utils.js';
// MODIFIED: Import Firestore save/load functions for notes
import { saveUserNotes, loadUserNotes, loadSharedNotes, saveSharedNote } from './firebase_firestore.js';
import { renderMathIn } from './utils.js';
import { generateAndDownloadPdfWithMathJax } from './ui_pdf_generation.js';
// MODIFIED: Import AI functions
import { callGeminiTextAPI, reviewNoteWithAI, convertNoteToLatex as aiConvertNoteToLatex } from './ai_integration.js';

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
 * Displays the Notes & Documents panel, loading data from Firestore.
 */
export async function showNotesDocumentsPanel(courseId, chapterNum) {
    const courseDef = globalCourseDataMap.get(courseId);
    if (!courseDef || !currentUser) return;

    currentCourseIdForNotes = courseId;
    currentChapterNumForNotes = chapterNum;

    const notesArea = document.getElementById('notes-documents-area');
    if (!notesArea) {
        console.error("Notes panel container not found.");
        return;
    }
    notesArea.innerHTML = `<div class="text-center p-4"><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-2 text-sm text-muted">Loading Notes...</p></div>`;

    try {
        // Load notes from Firestore
        currentLoadedUserNotes = await loadUserNotes(currentUser.uid, courseId, chapterNum);
        currentLoadedSharedNotes = await loadSharedNotes(courseId, chapterNum);

        const panelHtml = `
            <div class="content-card border dark:border-gray-700">
                <h3 class="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Notes & Documents (Chapter ${chapterNum})</h3>

                <!-- Quick Access Section -->
                <div class="mb-6 pb-4 border-b dark:border-gray-600">
                    <h4 class="text-base font-medium mb-2">Quick Access</h4>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="window.displayFormulaSheet('${courseId}', ${chapterNum})" class="btn-secondary-small text-xs">
                            Formula Sheet
                        </button>
                        <button onclick="window.displayChapterSummary('${courseId}', ${chapterNum})" class="btn-secondary-small text-xs">
                            Chapter Summary
                        </button>
                    </div>
                </div>

                <!-- Your Notes Section -->
                <div class="mb-6 pb-4 border-b dark:border-gray-600">
                    <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                        <h4 class="text-base font-medium">Your Notes</h4>
                        <div class="flex gap-2 flex-shrink-0">
                            <button onclick="window.addNewNoteWrapper()" class="btn-success-small text-xs">
                                Add Note
                            </button>
                            <button onclick="window.uploadNoteWrapper()" class="btn-secondary-small text-xs">
                                Upload File
                            </button>
                        </div>
                    </div>
                    <div id="user-notes-list" class="space-y-2 max-h-60 overflow-y-auto pr-2">
                        ${renderNotesList(currentLoadedUserNotes, true)}
                    </div>
                </div>

                <!-- Shared Notes Section (Placeholder for now) -->
                <!--
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="text-base font-medium">Shared Notes</h4>
                        <button onclick="window.shareCurrentNote()" class="btn-secondary-small text-xs" disabled title="Select a note to share">
                            Share Note
                        </button>
                    </div>
                    <div id="shared-notes-list" class="space-y-2 max-h-60 overflow-y-auto pr-2">
                        ${renderNotesList(currentLoadedSharedNotes, false)}
                    </div>
                </div>
                -->
            </div>
        `;

        notesArea.innerHTML = panelHtml;
        // Render math in the newly added notes list
        await renderMathIn(document.getElementById('user-notes-list'));
        // await renderMathIn(document.getElementById('shared-notes-list')); // If shared notes enabled

    } catch (error) {
        console.error("Error loading or rendering notes panel:", error);
        notesArea.innerHTML = `<div class="content-card border border-red-300 dark:border-red-600"><p class="text-red-500 p-4 text-center">Error loading notes: ${error.message}</p></div>`;
    }
}

function renderNotesList(notes, isUserNotes) {
    if (!notes || notes.length === 0) {
        return '<p class="text-sm text-muted italic text-center py-4">No notes yet.</p>';
    }

    // Sort notes by timestamp descending (most recent first)
    const sortedNotes = [...notes].sort((a, b) => b.timestamp - a.timestamp);

    return sortedNotes.map(note => `
        <div class="note-item bg-gray-50 dark:bg-gray-700/50 rounded p-3 border dark:border-gray-600 hover:shadow-sm transition-shadow duration-150">
            <div class="flex justify-between items-start gap-2">
                <div class="flex-grow min-w-0">
                    <h5 class="font-medium text-sm truncate" title="${escapeHtml(note.title)}">${escapeHtml(note.title)}</h5>
                    <p class="text-xs text-muted">${new Date(note.timestamp).toLocaleString()}</p>
                    ${!isUserNotes && note.userName ? `<p class="text-xs text-muted">By: ${escapeHtml(note.userName)}</p>` : ''}
                </div>
                <div class="flex gap-1 flex-shrink-0">
                    ${isUserNotes ? `
                        <button onclick="window.editNoteWrapper('${note.id}')" class="btn-icon btn-secondary-small" title="Edit Note">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button onclick="window.deleteNoteWrapper('${note.id}')" class="btn-icon btn-danger-small" title="Delete Note">
                           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    ` : ''}
                    <button onclick="window.viewNoteWrapper('${note.id}', ${isUserNotes})" class="btn-icon btn-secondary-small" title="View Note Content">
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                </div>
            </div>
            ${note.type === NOTE_TYPES.FILE ?
                `<p class="text-xs mt-2 text-blue-600 dark:text-blue-400">File: ${escapeHtml(note.filename)}</p>` :
                note.type === NOTE_TYPES.AI_REVIEW ?
                `<p class="text-xs mt-2 text-purple-600 dark:text-purple-400">AI Review Result</p>` :
                `<p class="text-sm mt-2 line-clamp-2 prose prose-sm dark:prose-invert max-w-none">${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}</p>`
            }
        </div>
    `).join('');
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
     // Logic to get the currently selected/viewed note ID would go here
     // For now, let's assume the last edited/viewed note can be shared (needs state tracking)
     alert("Sharing notes is not fully implemented yet. Please select a note first.");
     // shareNote(selectedNoteId);
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

    // Remove existing modal first
    document.getElementById('note-edit-modal')?.remove();

    const modalHtml = `
        <div id="note-edit-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 animate-fade-in" aria-labelledby="note-edit-title" role="dialog" aria-modal="true">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 w-full max-w-3xl transform transition-all flex flex-col max-h-[90vh]">
                <div class="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 id="note-edit-title" class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Edit Note</h3>
                    <div class="flex gap-2">
                        <button onclick="window.convertNoteToLatexWrapper()" class="btn-secondary-small text-xs" title="Convert current text to LaTeX format using AI">Convert to LaTeX (AI)</button>
                        <button onclick="window.improveNoteWithAIWrapper()" class="btn-secondary-small text-xs" title="Ask AI to improve clarity and structure">Improve with AI</button>
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
        // Assume type remains TEXT unless specifically changed (e.g., by LaTeX conversion)
        type: currentLoadedUserNotes[noteIndex].type === NOTE_TYPES.FILE ? NOTE_TYPES.FILE : NOTE_TYPES.TEXT,
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

export async function convertNoteToLatexWrapper() {
    const contentArea = document.getElementById('note-content-edit');
    if (!contentArea) return;
    const currentContent = contentArea.value;
    if (!currentContent) { alert("Nothing to convert."); return; }

    showLoading('Converting to LaTeX...');
    try {
        const latexContent = await aiConvertNoteToLatex(currentContent);
        contentArea.value = latexContent; // Update text area with LaTeX
        // Mark the note type as LaTeX? Or just let save handle it? Let save handle it for now.
    } catch (error) {
        console.error('Error converting to LaTeX:', error);
        alert('Failed to convert to LaTeX: ' + error.message);
    } finally {
        hideLoading();
    }
}

// MODIFIED: Added export keyword
export async function improveNoteWithAIWrapper() {
    const contentArea = document.getElementById('note-content-edit');
    if (!contentArea) return;
    const currentContent = contentArea.value;
    if (!currentContent) { alert("Nothing to improve."); return; }

    showLoading('Improving note with AI...');
    try {
        const prompt = `Improve the following physics/mathematics note. Make it clearer, more concise, and better structured. Add relevant equations if missing. Preserve any existing LaTeX formatting if possible, otherwise use standard math notation.

**Original Note:**
---
${currentContent.substring(0, 10000)}
---

Return the improved version only, no explanations or preamble.`;

        const improvedContent = await callGeminiTextAPI(prompt);
        contentArea.value = improvedContent;
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

            // Basic text extraction for common types
            if (file.type.startsWith('text/')) {
                 noteContent = await file.text();
                 noteType = NOTE_TYPES.TEXT; // Treat basic text files as text notes
                 if (file.name.toLowerCase().endsWith('.tex')) noteType = NOTE_TYPES.LATEX;
            } else if (file.type === 'application/pdf') {
                 // Attempt to extract text from PDF using AI helper
                 const arrayBuffer = await file.arrayBuffer();
                 const pdfData = new Uint8Array(arrayBuffer);
                 // Pass data directly to text extractor
                 noteContent = await getAllPdfTextForAI(pdfData) || `[PDF Content - ${file.name}]`; // Fallback text if extraction fails
                 noteType = NOTE_TYPES.TEXT; // Store extracted text
            } else if (file.type.startsWith('image/')) {
                 // For images, maybe store a placeholder or use Vision API later?
                 noteContent = `[Image File - ${file.name}]`;
                 noteType = NOTE_TYPES.FILE; // Keep as file type for now
            } else {
                 // For other types, just store filename
                 noteContent = `[File - ${file.name}]`;
                 noteType = NOTE_TYPES.FILE;
            }


            const note = {
                id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                title: file.name,
                content: noteContent,
                type: noteType,
                filename: file.name, // Always store original filename
                filetype: file.type, // Store MIME type
                timestamp: Date.now(),
                courseId: courseId,
                chapterNum: chapterNum
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
        contentHtml = `<p class="text-center text-muted italic p-4">File: ${escapeHtml(note.filename)} (${note.filetype || 'Unknown type'})</p><p class="text-center mt-2"><button class="btn-secondary-small" disabled title="File download not implemented">Download File</button></p>`; // Add download later if storing files
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
                    ${isUserNote && note.type !== NOTE_TYPES.AI_REVIEW ? `<button onclick="window.reviewNoteWithAIWrapper('${note.id}')" class="btn-secondary-small text-xs">Review Note (AI)</button>` : ''}
                    <button onclick="document.getElementById('note-view-modal').remove()" class="btn-secondary">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Render MathJax if it's text/latex content
    if (note.type !== NOTE_TYPES.FILE && note.type !== NOTE_TYPES.AI_REVIEW) {
        await renderMathIn(document.getElementById('note-view-content-area'));
    }
}


// Helper to find a note by ID in either user or shared lists
function findNoteById(noteId, searchUserNotes) {
    const listToSearch = searchUserNotes ? currentLoadedUserNotes : currentLoadedSharedNotes;
    return listToSearch.find(note => note.id === noteId) || null;
}


// Wrapper for AI Review
export async function reviewNoteWithAIWrapper(noteId) {
     const note = findNoteById(noteId, true); // Find in user notes
     if (!note || note.type === NOTE_TYPES.FILE || note.type === NOTE_TYPES.AI_REVIEW) {
         alert("Cannot review this note type or note not found.");
         return;
     }
      // Close view modal if open
     document.getElementById('note-view-modal')?.remove();

     showLoading("Generating AI Review...");
     try {
         const reviewHtml = await reviewNoteWithAI(note.content, note.courseId, note.chapterNum);

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

// Attach wrapper functions to window scope
window.addNewNoteWrapper = addNewNoteWrapper;
window.editNoteWrapper = editNoteWrapper;
window.saveNoteChangesWrapper = saveNoteChanges; // Renamed internal function
window.uploadNoteWrapper = uploadNoteWrapper;
window.deleteNoteWrapper = deleteNoteWrapper;
window.shareCurrentNoteWrapper = shareCurrentNoteWrapper; // Added share wrapper
window.viewNoteWrapper = viewNoteWrapper;
window.convertNoteToLatexWrapper = convertNoteToLatexWrapper; // Added LaTeX wrapper
window.improveNoteWithAIWrapper = improveNoteWithAIWrapper; // Added improve wrapper
window.reviewNoteWithAIWrapper = reviewNoteWithAIWrapper; // Added review wrapper

// --- END OF FILE ui_notes_documents.js ---