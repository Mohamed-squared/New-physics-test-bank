import { currentUser, globalCourseDataMap, db } from './state.js'; // Added db
import { showLoading, hideLoading, escapeHtml } from './utils.js';
// MODIFIED: Import Firestore save/load functions for notes
import { saveUserNotes, loadUserNotes, loadSharedNotes, saveSharedNote } from './firebase_firestore.js';
import { renderMathIn } from './utils.js';
import { generateAndDownloadPdfWithMathJax } from './ui_pdf_generation.js';
// MODIFIED: Import AI functions
import { callGeminiTextAPI, reviewNoteWithAI, convertNoteToLatex, improveNoteWithAI, getAllPdfTextForAI } from './ai_integration.js'; // Added getAllPdfTextForAI and improveNoteWithAI
import { downloadTexFile } from './ui_pdf_generation.js'; // Import tex download helper

// Global state for currently loaded notes for the active chapter
let currentLoadedUserNotes = [];
let currentLoadedSharedNotes = [];
let currentCourseIdForNotes = null;
let currentChapterNumForNotes = null;
// NEW: State to track last viewed chapter for the notes panel
let lastViewedChapterForNotes = null;

// Note types (consistent with ai_integration or a shared constants file if preferred)
const NOTE_TYPES = {
    TEXT: 'text',
    LATEX: 'latex',
    FILE: 'file', // Could represent uploaded PDF, TXT, MD etc.
    AI_REVIEW: 'ai_review' // Special type for AI review results
};

/**
 * Triggered by the sidebar link. Determines the correct chapter and shows the panel.
 */
export async function showCurrentNotesDocuments() {
    if (!currentUser || !activeCourseId) {
         alert("Please select a course first.");
         window.showMyCoursesDashboard(); // Redirect if no active course
         return;
    }
    // Use the last viewed chapter for notes if available, otherwise the current target chapter
    const chapterToShow = lastViewedChapterForNotes || determineTargetChapterForNotes(activeCourseId);
    if (!chapterToShow) {
         alert("Could not determine which chapter's notes to show.");
         window.showCurrentCourseDashboard(activeCourseId); // Go back to course dash
         return;
    }
    await showNotesDocumentsPanel(activeCourseId, chapterToShow);
}
// Helper to determine the default chapter for notes
function determineTargetChapterForNotes(courseId) {
     const progress = userCourseProgressMap.get(courseId);
     const courseDef = globalCourseDataMap.get(courseId);
     if (progress && courseDef) {
          return window.determineTargetChapter(progress, courseDef); // Use global function
     }
     return 1; // Default to chapter 1
}

/**
 * Updates the last viewed chapter number for the notes panel context.
 * @param {number} chapterNum - The chapter number being viewed in study material.
 */
export function setLastViewedChapterForNotes(chapterNum) {
    lastViewedChapterForNotes = chapterNum;
}


/**
 * Displays the Notes & Documents panel, loading data from Firestore.
 */
export async function showNotesDocumentsPanel(courseId, chapterNum) {
    const courseDef = globalCourseDataMap.get(courseId);
    if (!courseDef || !currentUser) return;

    // Update global state for context
    currentCourseIdForNotes = courseId;
    currentChapterNumForNotes = chapterNum;
    setLastViewedChapterForNotes(chapterNum); // Update last viewed

    setActiveSidebarLink('showCurrentNotesDocuments', 'sidebar-course-nav'); // Highlight the new link

    // Use displayContent to render into the main course area
    displayContent(`<div id="notes-panel-dynamic-content"><div class="text-center p-4"><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-2 text-sm text-muted">Loading Notes for Chapter ${chapterNum}...</p></div></div>`, 'course-dashboard-area');

    const notesArea = document.getElementById('notes-panel-dynamic-content'); // Target the inner div

    try {
        // Load notes from Firestore
        currentLoadedUserNotes = await loadUserNotes(currentUser.uid, courseId, chapterNum);
        currentLoadedSharedNotes = await loadSharedNotes(courseId, chapterNum);

        const panelHtml = `
            <div class="content-card border dark:border-gray-700">
                 <div class="flex justify-between items-center mb-4 pb-4 border-b dark:border-gray-600">
                    <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">Notes & Documents (Chapter ${chapterNum})</h3>
                    <button onclick="window.showCourseStudyMaterial('${courseId}', ${chapterNum})" class="btn-secondary-small text-xs">Back to Study Material</button>
                 </div>

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
                     <!-- Formula/Summary Display Area -->
                     <div id="formula-sheet-area" class="mt-4 hidden border-t dark:border-gray-700 pt-4"></div>
                     <div id="chapter-summary-area" class="mt-4 hidden border-t dark:border-gray-700 pt-4"></div>
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
                    ${isUserNotes && note.type !== NOTE_TYPES.AI_REVIEW ? `
                        <button onclick="window.editNoteWrapper('${note.id}')" class="btn-icon btn-secondary-small" title="Edit Note">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button onclick="window.deleteNoteWrapper('${note.id}')" class="btn-icon btn-danger-small" title="Delete Note">
                           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    ` : ''}
                     ${isUserNotes && note.type === NOTE_TYPES.AI_REVIEW ? `
                        <button onclick="window.deleteNoteWrapper('${note.id}')" class="btn-icon btn-danger-small" title="Delete Review">
                           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                     `: ''}
                    <button onclick="window.viewNoteWrapper('${note.id}', ${isUserNotes})" class="btn-icon btn-secondary-small" title="View Note Content">
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                </div>
            </div>
            ${note.type === NOTE_TYPES.FILE ?
                `<p class="text-xs mt-2 text-blue-600 dark:text-blue-400">File: ${escapeHtml(note.filename)} (${escapeHtml(note.filetype || 'unknown')})</p>` :
                note.type === NOTE_TYPES.AI_REVIEW ?
                `<p class="text-xs mt-2 text-purple-600 dark:text-purple-400">AI Review Result</p>` :
                note.type === NOTE_TYPES.LATEX ?
                `<p class="text-xs mt-2 text-green-600 dark:text-green-400">[LaTeX Note]</p>` : // Indicate LaTeX
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
// Wrapper needed for window scope
export function saveNoteChangesWrapper(noteId) {
     saveNoteChanges(noteId);
}
// Wrapper needed for window scope
export function convertNoteToLatexWrapper() {
     // No noteId needed, acts on the open editor
     convertNoteToLatexUIAction();
}
// Wrapper needed for window scope
export function improveNoteWithAIWrapper() {
     // No noteId needed, acts on the open editor
     improveNoteWithAIUIAction();
}
// Wrapper needed for window scope
export function reviewNoteWithAIWrapper(noteId) {
     reviewNoteWithAIUIAction(noteId);
}
// Wrapper needed for window scope
export function downloadNoteAsTexWrapper(noteId) {
     downloadNoteAsTex(noteId);
}


async function addNewNote(courseId, chapterNum) {
    const title = prompt('Enter note title:');
    if (!title) return;

    const note = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`, // More unique ID
        title: title.trim(),
        content: '',
        type: NOTE_TYPES.TEXT, // Default to text
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

async function editNote(noteId) {
    const note = findNoteById(noteId, true); // Search user notes
    if (!note) { alert("Note not found for editing."); return; }

    // Cannot edit AI review results directly
    if (note.type === NOTE_TYPES.AI_REVIEW) {
         alert("AI Review results cannot be edited directly. View the original note to make changes.");
         viewNote(noteId, true); // Open in view mode instead
         return;
    }

    // Remove existing modal first
    document.getElementById('note-edit-modal')?.remove();

    // MODIFIED: Conditionally enable AI buttons based on note type
    const canUseTextAI = note.type === NOTE_TYPES.TEXT || (note.type === NOTE_TYPES.FILE && note.filetype === 'application/pdf');
    const canUseLatexConvert = note.type === NOTE_TYPES.TEXT; // Only convert plain text

    const modalHtml = `
        <div id="note-edit-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 animate-fade-in" aria-labelledby="note-edit-title" role="dialog" aria-modal="true">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 w-full max-w-3xl transform transition-all flex flex-col max-h-[90vh]">
                <div class="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 id="note-edit-title" class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Edit Note ${note.type === NOTE_TYPES.FILE ? `(Editing Text from: ${escapeHtml(note.filename)})` : ''}</h3>
                    <div class="flex gap-2">
                        <button onclick="window.convertNoteToLatexWrapper()" class="btn-secondary-small text-xs" title="Convert current text to LaTeX format using AI" ${!canUseLatexConvert ? 'disabled' : ''}>Convert to LaTeX (AI)</button>
                        <button onclick="window.improveNoteWithAIWrapper()" class="btn-secondary-small text-xs" title="Ask AI to improve clarity and structure" ${!canUseTextAI ? 'disabled' : ''}>Improve with AI</button>
                         <button onclick="window.reviewNoteWithAIWrapper('${note.id}')" class="btn-secondary-small text-xs" title="Get AI feedback compared to chapter material" ${!canUseTextAI ? 'disabled' : ''}>Review Note (AI)</button>
                        <button onclick="document.getElementById('note-edit-modal').remove()" class="btn-icon">&times;</button>
                    </div>
                </div>
                <input type="text" id="note-title-edit" value="${escapeHtml(note.title)}" class="w-full mb-3 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-shrink-0">
                <div class="flex-grow overflow-y-auto mb-4 border rounded dark:border-gray-600">
                    <textarea id="note-content-edit" class="w-full h-full p-2 font-mono text-sm border-none resize-none dark:bg-gray-700 dark:text-gray-100 focus:outline-none min-h-[40vh]">${escapeHtml(note.content)}</textarea>
                </div>
                 <p class="text-xs text-muted mb-3">${note.type === NOTE_TYPES.FILE ? 'You are editing the text extracted from the PDF. Saving will update this text content.' : 'Editing note content.'}</p>
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

async function saveNoteChanges(noteId) {
    const modal = document.getElementById('note-edit-modal');
    if (!modal) return;

    const titleInput = document.getElementById('note-title-edit');
    const contentArea = document.getElementById('note-content-edit');
    if (!titleInput || !contentArea) return;

    const title = titleInput.value;
    const content = contentArea.value;

    const noteIndex = currentLoadedUserNotes.findIndex(n => n.id === noteId);
    if (noteIndex === -1) { alert("Error: Could not find note to save."); modal.remove(); return; }

    const originalNote = currentLoadedUserNotes[noteIndex];

    // Determine the new type (check for LaTeX patterns if not originally a file)
    let newType = originalNote.type;
    if (newType !== NOTE_TYPES.FILE && newType !== NOTE_TYPES.AI_REVIEW) {
         // Check if content looks like LaTeX
         if (content.includes('\\begin{') || content.includes('$$') || /\\\w+/.test(content)) {
              newType = NOTE_TYPES.LATEX;
              console.log("Note content appears to be LaTeX, setting type.");
         } else {
              newType = NOTE_TYPES.TEXT;
         }
    } else if (newType === NOTE_TYPES.FILE && originalNote.filetype === 'application/pdf') {
         // If editing extracted text from a PDF, save it as a TEXT note now
         newType = NOTE_TYPES.TEXT;
         console.log("Saving edited PDF text as TEXT note type.");
    }

    // Update local state
    currentLoadedUserNotes[noteIndex] = {
        ...originalNote,
        title: title.trim(),
        content: content, // Keep original spacing
        timestamp: Date.now(),
        type: newType, // Update type based on content check or PDF edit
    };

    modal.remove(); // Close modal first
    showLoading("Saving note...");
    const success = await saveUserNotes(currentUser.uid, currentCourseIdForNotes, currentChapterNumForNotes, currentLoadedUserNotes);
    hideLoading();

    if (success) {
        await showNotesDocumentsPanel(currentCourseIdForNotes, currentChapterNumForNotes); // Refresh panel
    } else {
        alert("Failed to save note changes.");
        // Revert local change if save fails
        currentLoadedUserNotes[noteIndex] = originalNote;
    }
}

// MODIFIED: Renamed from convertNoteToLatexWrapper to avoid confusion
async function convertNoteToLatexUIAction() {
    const contentArea = document.getElementById('note-content-edit');
    if (!contentArea) return;
    const currentContent = contentArea.value;
    if (!currentContent) { alert("Nothing to convert."); return; }

    // Check if already likely LaTeX
     if (currentContent.includes('\\begin{') || currentContent.includes('$$')) {
         if (!confirm("Content might already be LaTeX. Convert anyway?")) return;
     }

    showLoading('Converting to LaTeX...');
    try {
        const latexContent = await convertNoteToLatex(currentContent); // Call AI function
        contentArea.value = latexContent; // Update text area with LaTeX
        alert("Conversion to LaTeX finished. Review the result and click 'Save Changes'.");
        // Note type will be updated on save
    } catch (error) {
        console.error('Error converting to LaTeX:', error);
        alert('Failed to convert to LaTeX: ' + error.message);
    } finally {
        hideLoading();
    }
}

// MODIFIED: Renamed from improveNoteWithAIWrapper
async function improveNoteWithAIUIAction() {
    const contentArea = document.getElementById('note-content-edit');
    if (!contentArea) return;
    const currentContent = contentArea.value;
    if (!currentContent) { alert("Nothing to improve."); return; }

    showLoading('Improving note with AI...');
    try {
        // Call the modified improveNoteWithAI function
        const improvedContent = await improveNoteWithAI(currentContent);
        // Append the AI suggestions below the original content for review
        contentArea.value += `\n\n---\n**AI Suggestions/Additions:**\n---\n${improvedContent}\n---`;
        alert("AI suggestions have been appended to your note. Please review and integrate them as needed before saving.");
    } catch (error) {
        console.error('Error improving note:', error);
        alert('Failed to improve note: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function uploadNote(courseId, chapterNum) {
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
            let noteType = NOTE_TYPES.FILE; // Default for non-text/pdf

            // Basic text extraction for common types
            if (file.type.startsWith('text/')) {
                 noteContent = await file.text();
                 noteType = NOTE_TYPES.TEXT; // Treat basic text files as text notes
                 if (file.name.toLowerCase().endsWith('.tex')) noteType = NOTE_TYPES.LATEX;
            } else if (file.type === 'application/pdf') {
                 // Extract text from PDF using helper
                 const arrayBuffer = await file.arrayBuffer();
                 const pdfData = new Uint8Array(arrayBuffer);
                 noteContent = await getAllPdfTextForAI(pdfData) || `[PDF Content - ${file.name}]`; // Fallback text if extraction fails
                 noteType = NOTE_TYPES.TEXT; // Store extracted text
                 console.log(`Extracted ${noteContent.length} chars from PDF ${file.name}`);
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
                content: noteContent, // Store extracted text or placeholder
                type: noteType, // Set type based on processing
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

async function deleteNote(noteId) {
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

async function shareNote(noteId) {
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

async function viewNote(noteId, isUserNote) {
    const note = findNoteById(noteId, isUserNote);
    if (!note) { alert("Note not found."); return; }

    // Remove existing modal first
    document.getElementById('note-view-modal')?.remove();

    let contentHtml = '';
    let downloadButtonHtml = '';
    let aiReviewButtonHtml = '';

    if (note.type === NOTE_TYPES.FILE) {
        contentHtml = `<p class="text-center text-muted italic p-4">File: ${escapeHtml(note.filename)} (${escapeHtml(note.filetype || 'Unknown type')})</p>`;
        if (note.filetype === 'application/pdf') {
             contentHtml += `<p class="text-sm text-center text-muted italic">(PDF view for uploaded files not yet supported. Edit note to see extracted text.)</p>`;
        }
         // Add download button for FILE type (if we implement file storage)
         // downloadButtonHtml = `<button class="btn-secondary-small" disabled title="File download not implemented">Download File</button>`;
    } else if (note.type === NOTE_TYPES.AI_REVIEW) {
        contentHtml = `<div class="prose prose-sm dark:prose-invert max-w-none">${note.content}</div>`; // Assume content is already HTML formatted
    } else if (note.type === NOTE_TYPES.LATEX) {
         // Display LaTeX source within pre/code and add download .tex button
         contentHtml = `<pre><code class="block whitespace-pre-wrap text-xs">${escapeHtml(note.content)}</code></pre>`;
         downloadButtonHtml = `<button onclick="window.downloadNoteAsTexWrapper('${note.id}')" class="btn-secondary-small text-xs">Download .tex</button>`;
         // Enable AI review for LaTeX notes too
         if (isUserNote) aiReviewButtonHtml = `<button onclick="window.reviewNoteWithAIWrapper('${note.id}')" class="btn-secondary-small text-xs">Review Note (AI)</button>`;
    } else { // TEXT
         contentHtml = `<div class="prose prose-sm dark:prose-invert max-w-none">${escapeHtml(note.content).replace(/\n/g, '<br>')}</div>`;
         // Enable AI review for TEXT notes
         if (isUserNote) aiReviewButtonHtml = `<button onclick="window.reviewNoteWithAIWrapper('${note.id}')" class="btn-secondary-small text-xs">Review Note (AI)</button>`;
    }


    const modalHtml = `
        <div id="note-view-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 animate-fade-in" aria-labelledby="note-view-title" role="dialog" aria-modal="true">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 w-full max-w-3xl transform transition-all flex flex-col max-h-[90vh]">
                <div class="flex justify-between items-center mb-4 flex-shrink-0 pb-3 border-b dark:border-gray-600">
                    <h3 id="note-view-title" class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 truncate" title="${escapeHtml(note.title)}">${escapeHtml(note.title)}</h3>
                    <button onclick="document.getElementById('note-view-modal').remove()" class="btn-icon">&times;</button>
                </div>
                <div id="note-view-content-area" class="flex-grow overflow-y-auto mb-4 pr-2">
                   ${contentHtml}
                </div>
                <div class="flex justify-end gap-3 flex-shrink-0 pt-3 border-t dark:border-gray-600">
                    ${aiReviewButtonHtml}
                    ${downloadButtonHtml}
                    <button onclick="document.getElementById('note-view-modal').remove()" class="btn-secondary">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Render MathJax if it's text/latex content, skip for file/review
    if (note.type === NOTE_TYPES.TEXT || note.type === NOTE_TYPES.LATEX) {
        await renderMathIn(document.getElementById('note-view-content-area'));
    }
}

/**
 * Triggers download of a LaTeX note as a .tex file.
 */
function downloadNoteAsTex(noteId) {
    const note = findNoteById(noteId, true); // Only user notes can be downloaded this way
    if (!note || note.type !== NOTE_TYPES.LATEX) {
        alert("Cannot download: Note not found or is not a LaTeX note.");
        return;
    }
    const filename = (note.title.endsWith('.tex') ? note.title : `${note.title}.tex`).replace(/[^a-zA-Z0-9_.-]/g, '_'); // Clean filename
    // Content is already LaTeX source
    const content = note.content;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}



// Helper to find a note by ID in either user or shared lists
function findNoteById(noteId, searchUserNotes) {
    const listToSearch = searchUserNotes ? currentLoadedUserNotes : currentLoadedSharedNotes;
    return listToSearch.find(note => note.id === noteId) || null;
}


// Wrapper for AI Review
async function reviewNoteWithAIUIAction(noteId) { // Renamed internal function
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

// Attach wrapper functions to window scope (Done in script.js)

// --- END OF FILE ui_notes_documents.js ---