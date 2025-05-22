

// MODIFIED: Import activeCourseId and userCourseProgressMap
import { currentUser, globalCourseDataMap, db, activeCourseId, userCourseProgressMap } from './state.js'; // Added userCourseProgressMap
import { showLoading, hideLoading, escapeHtml } from './utils.js';
// MODIFIED: Import Firestore save/load functions for notes
import { saveUserNotes, loadUserNotes, loadSharedNotes, saveSharedNote } from './firebase_firestore.js';
import { renderMathIn } from './utils.js';
import { generateAndDownloadPdfWithMathJax, downloadTexFile } from './ui_pdf_generation.js'; // Added downloadTexFile
// MODIFIED: Import AI functions - Restored extractTextFromImageAndConvertToLatex
import { callGeminiTextAPI, reviewNoteWithAI, convertNoteToLatex, improveNoteWithAI, getAllPdfTextForAI, extractTextFromImageAndConvertToLatex } from './ai_integration.js'; // Restored extractTextFromImageAndConvertToLatex
// MODIFIED: Added imports for state and logic needed for target chapter
import { determineTargetChapter } from './course_logic.js';
// MODIFIED: Added import for setActiveSidebarLink and displayContent
import { setActiveSidebarLink, displayContent } from './ui_core.js';


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

/*
// --- RECOMMENDATION FOR Formula Sheet & Chapter Summary Math Rendering ---
// The functions `displayFormulaSheet(courseId, chapterNum)` and 
// `displayChapterSummary(courseId, chapterNum)` are called from 
// `showNotesDocumentsPanel` and are expected to load HTML content 
// into the '#formula-sheet-area' and '#chapter-summary-area' divs respectively.
//
// If the content loaded by these functions contains LaTeX:
// 1. Ensure MathJax is loaded on the page (it typically is via script.js).
// 2. After injecting the HTML content into the respective div, you MUST call 
//    `await window.renderMathIn(containerElement);` to process any LaTeX.
//    Replace `containerElement` with the actual DOM element.
//
// Example for displayFormulaSheet:
// async function displayFormulaSheet(courseId, chapterNum) {
//     const formulaSheetArea = document.getElementById('formula-sheet-area');
//     if (!formulaSheetArea) return;
//     // ... logic to fetch and prepare formula_html_content ...
//     formulaSheetArea.innerHTML = formula_html_content;
//     formulaSheetArea.classList.remove('hidden');
//     try {
//         showLoading("Rendering math..."); // Optional
//         await window.renderMathIn(formulaSheetArea);
//     } catch (e) {
//         console.error("Error rendering math in formula sheet:", e);
//     } finally {
//         hideLoading(); // Optional
//     }
// }
//
// Note: Styling for these IN-APP HTML views is controlled by the general site CSS
// (e.g., base.css, components.css), NOT by `pdf_formula_sheet_styles.css`
// which is intended for PDF generation via the server.
*/

/**
 * Triggered by the sidebar link. Displays the chapter list menu for notes.
 */
export async function showCurrentNotesDocuments() {
    // MODIFIED: Uses the imported activeCourseId from state
    if (!currentUser || !activeCourseId) {
         alert("Please select a course first.");
         window.showMyCoursesDashboard(); // Redirect if no active course
         return;
    }
    // MODIFIED: Calls the new menu display function
    await displayNotesContentMenu(activeCourseId);
}
// Helper to determine the default chapter for notes
function determineTargetChapterForNotes(courseId) {
     const progress = userCourseProgressMap.get(courseId);
     const courseDef = globalCourseDataMap.get(courseId);
     // MODIFIED: Check window scope for determineTargetChapter
     if (progress && courseDef && typeof window.determineTargetChapter === 'function') {
          return window.determineTargetChapter(progress, courseDef); // Use global function
     }
     console.warn("Could not determine target chapter, defaulting to 1.");
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
 * NEW: Displays a menu listing all chapters to access their notes.
 */
export async function displayNotesContentMenu(courseId = activeCourseId) {
    if (!currentUser || !courseId) return;
    setActiveSidebarLink('showCurrentNotesDocuments', 'sidebar-course-nav'); // Keep notes link active

    const courseDef = globalCourseDataMap.get(courseId);
    if (!courseDef) {
        displayContent(`<p class="text-red-500 p-4">Error: Course data not found for ${courseId}.</p>`, 'course-dashboard-area');
        return;
    }

    showLoading("Loading Chapter List for Notes...");

    const totalChapters = courseDef.totalChapters || 0;
    let chapterListHtml = '';

    if (totalChapters > 0) {
        chapterListHtml = '<ul class="space-y-2 list-none p-0">';
        for (let i = 1; i <= totalChapters; i++) {
            const chapterNum = i;
            let chapterTitle = `Chapter ${chapterNum}`;
            if (courseDef.chapters && Array.isArray(courseDef.chapters) && courseDef.chapters.length >= chapterNum) {
                chapterTitle = courseDef.chapters[chapterNum - 1] || chapterTitle;
            }
            // Each list item links to the specific chapter's notes panel
            chapterListHtml += `
                <li class="border dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <a href="#" onclick="window.showNotesDocumentsPanel('${courseId}', ${chapterNum}); return false;" class="block p-3 text-sm">
                        <span class="font-medium text-gray-800 dark:text-gray-200">${chapterNum}. ${escapeHtml(chapterTitle)}</span>
                    </a>
                </li>
            `;
            // We could potentially load note counts here, but it might be slow. Keep it simple for now.
        }
        chapterListHtml += '</ul>';
    } else {
        chapterListHtml = '<p class="text-center text-muted italic p-4">No chapters defined for this course.</p>';
    }

    hideLoading();

    const menuHtml = `
        <div class="animate-fade-in space-y-6">
            <div class="flex justify-between items-center">
                 <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(courseDef.name)} - Notes & Documents</h2>
                 <button onclick="window.showCurrentCourseDashboard('${courseId}')" class="btn-secondary-small">Back to Dashboard</button>
            </div>
            <p class="text-sm text-muted">Select a chapter to view or manage your notes and uploaded documents.</p>
            <div class="content-card">
                ${chapterListHtml}
            </div>
        </div>
    `;

    displayContent(menuHtml, 'course-dashboard-area');
}


/**
 * Displays the Notes & Documents panel FOR A SPECIFIC CHAPTER, loading data from Firestore.
 */
export async function showNotesDocumentsPanel(courseId, chapterNum) {
    const courseDef = globalCourseDataMap.get(courseId);
    if (!courseDef || !currentUser) return;

    // Update global state for context
    currentCourseIdForNotes = courseId;
    currentChapterNumForNotes = chapterNum;
    setLastViewedChapterForNotes(chapterNum); // Update last viewed

    setActiveSidebarLink('showCurrentNotesDocuments', 'sidebar-course-nav'); // Keep notes link active

    // Use displayContent to render into the main course area
    displayContent(`<div id="notes-panel-dynamic-content"><div class="text-center p-4"><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-2 text-sm text-muted">Loading Notes for Chapter ${chapterNum}...</p></div></div>`, 'course-dashboard-area');

    const notesArea = document.getElementById('notes-panel-dynamic-content'); // Target the inner div

    try {
        // Load notes from Firestore
        currentLoadedUserNotes = await loadUserNotes(currentUser.uid, courseId, chapterNum);
        currentLoadedSharedNotes = await loadSharedNotes(courseId, chapterNum); // Keep loading shared notes logic if needed later

        const panelHtml = `
            <div class="content-card border dark:border-gray-700">
                 <div class="flex justify-between items-center mb-4 pb-4 border-b dark:border-gray-600">
                    <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">Notes & Documents (Chapter ${chapterNum})</h3>
                    <!-- MODIFIED: Button now goes back to the Notes Menu -->
                    <button onclick="window.displayNotesContentMenu('${courseId}')" class="btn-secondary-small text-xs">Back to Chapter List</button>
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

    return sortedNotes.map(note => {
        // Determine if AI actions should be enabled in the view modal based on the note type
        const canReviewNote = isUserNotes && note.type === NOTE_TYPES.TEXT;
        const canPreviewLatex = note.type === NOTE_TYPES.LATEX;
        const canDownloadTex = note.type === NOTE_TYPES.LATEX;
        const canDownloadPdf = note.type === NOTE_TYPES.TEXT || note.type === NOTE_TYPES.LATEX || note.type === NOTE_TYPES.AI_REVIEW;
        const canOcrImage = isUserNotes && note.type === NOTE_TYPES.FILE && note.filetype?.startsWith('image/');

        return `
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
                `<div class="mt-2 flex justify-between items-center">
                     <p class="text-xs text-blue-600 dark:text-blue-400">File: ${escapeHtml(note.filename)} (${escapeHtml(note.filetype || 'unknown')})</p>
                     ${canOcrImage ? `<button onclick="window.extractTextFromImageAndConvertToLatexWrapper('${note.id}')" class="btn-secondary-small text-xs" title="Use AI Vision to extract text and convert to LaTeX">OCR & LaTeX (AI)</button>` : ''}
                 </div>` :
                note.type === NOTE_TYPES.AI_REVIEW ?
                `<p class="text-xs mt-2 text-purple-600 dark:text-purple-400">AI Review Result</p>` :
                note.type === NOTE_TYPES.LATEX ?
                `<p class="text-xs mt-2 text-green-600 dark:text-green-400">[LaTeX Note]</p>` : // Indicate LaTeX
                `<p class="text-sm mt-2 line-clamp-2 prose prose-sm dark:prose-invert max-w-none">${escapeHtml(note.content.substring(0, 100))}${note.content.length > 100 ? '...' : ''}</p>` // Added escapeHtml here
            }
        </div>
    `}).join('');
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
// NEW: Wrapper for LaTeX preview/print
export function previewLatexNote(noteId) {
     previewOrPrintLatexNote(noteId);
}
// NEW: Wrapper for Image OCR/LaTeX conversion
export function extractAndConvertImageNoteToLatexWrapper(noteId) {
     extractAndConvertImageNoteToLatexUIAction(noteId);
}
// NEW: Wrapper for Note PDF download
export function downloadNoteAsPdfWrapper(noteId) {
    downloadNoteAsPdf(noteId);
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
    // Allow AI review/improve if it's TEXT (could be original text or extracted PDF text)
    const canUseTextAI = note.type === NOTE_TYPES.TEXT;
    const canUseLatexConvert = note.type === NOTE_TYPES.TEXT; // Only convert text notes

    const modalHtml = `
        <div id="note-edit-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4 animate-fade-in" aria-labelledby="note-edit-title" role="dialog" aria-modal="true">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 w-full max-w-3xl transform transition-all flex flex-col max-h-[90vh]">
                <div class="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 id="note-edit-title" class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Edit Note ${note.filename ? `(Editing Text from: ${escapeHtml(note.filename)})` : ''}</h3>
                    <div class="flex gap-2">
                        <button onclick="window.convertNoteToLatexWrapper()" class="btn-secondary-small text-xs" title="Convert current text to LaTeX format using AI" ${!canUseLatexConvert ? 'disabled' : ''}>Convert to LaTeX (AI)</button>
                        <button onclick="window.improveNoteWithAIWrapper()" class="btn-secondary-small text-xs" title="Ask AI to improve clarity and structure" ${!canUseTextAI ? 'disabled' : ''}>Improve with AI</button>
                         <button onclick="window.reviewNoteWithAIWrapper('${note.id}')" class="btn-secondary-small text-xs" title="Get AI feedback compared to chapter material" ${!canUseTextAI ? 'disabled' : ''}>Review Note (AI)</button>
                        <button onclick="document.getElementById('note-edit-modal').remove()" class="btn-icon">×</button>
                    </div>
                </div>
                <input type="text" id="note-title-edit" value="${escapeHtml(note.title)}" class="w-full mb-3 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-shrink-0">
                <div class="flex-grow overflow-y-auto mb-4 border rounded dark:border-gray-600">
                    <textarea id="note-content-edit" class="w-full h-full p-2 font-mono text-sm border-none resize-none dark:bg-gray-700 dark:text-gray-100 focus:outline-none min-h-[40vh]">${escapeHtml(note.content)}</textarea>
                </div>
                 <p class="text-xs text-muted mb-3">${note.filename ? 'You are editing the text extracted from the original file. Saving will update this text content.' : 'Editing note content.'}</p>
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
    } else if (newType === NOTE_TYPES.FILE) {
        // If original was a file (e.g. PDF, image), editing changes its type to TEXT
        newType = NOTE_TYPES.TEXT;
        console.log(`Saving edited content from file (${originalNote.filename}) as TEXT note type.`);
    }
    // AI Review type remains unchanged

    // Update local state
    currentLoadedUserNotes[noteIndex] = {
        ...originalNote,
        title: title.trim(),
        content: content, // Keep original spacing
        timestamp: Date.now(),
        type: newType, // Update type based on content check or edit source
        // Preserve filename and filetype if the original was a file
        filename: originalNote.filename || null,
        filetype: originalNote.filetype || null,
        imageDataUri: newType === NOTE_TYPES.FILE && originalNote.filetype?.startsWith('image/') ? originalNote.imageDataUri : null // Keep image URI only if still FILE type image
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
        // Call the modified improveNoteWithAI function from ai_integration.js
        const aiSuggestions = await improveNoteWithAI(currentContent);
        // MODIFIED: Append the AI suggestions below the original content for review
        contentArea.value += `\n\n---\n**AI Suggestions/Additions:**\n---\n${aiSuggestions}\n---`;
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
            let fileDataUri = null; // To store image data URI if needed

            // Basic text extraction for common types
            if (file.type.startsWith('text/')) {
                 noteContent = await file.text();
                 noteType = NOTE_TYPES.TEXT; // Treat basic text files as text notes
                 if (file.name.toLowerCase().endsWith('.tex')) noteType = NOTE_TYPES.LATEX;
                 console.log(`Extracted text from ${file.type}: ${file.name}`);
            } else if (file.type === 'application/pdf') {
                 // Extract text from PDF using helper
                 const arrayBuffer = await file.arrayBuffer();
                 const pdfData = new Uint8Array(arrayBuffer);
                 noteContent = await getAllPdfTextForAI(pdfData) || `[PDF Content - ${file.name}]`; // Fallback text if extraction fails
                 noteType = NOTE_TYPES.TEXT; // Store extracted text as TEXT type
                 console.log(`Extracted ${noteContent.length} chars from PDF ${file.name}`);
            } else if (file.type.startsWith('image/')) {
                 // For images, store a placeholder and attempt to get Data URI for potential Vision API use
                 noteContent = `[Image File - ${file.name}]`;
                 noteType = NOTE_TYPES.FILE;
                 try {
                      fileDataUri = await new Promise((resolve, reject) => {
                         const reader = new FileReader();
                         reader.onload = () => resolve(reader.result);
                         reader.onerror = reject;
                         reader.readAsDataURL(file);
                      });
                 } catch(readError) {
                      console.error("Error reading image file as Data URI:", readError);
                      fileDataUri = null; // Proceed without data URI if reading fails
                 }
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
                chapterNum: chapterNum,
                imageDataUri: fileDataUri // Store Data URI for images (or null)
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
    let downloadTexButtonHtml = '';
    let downloadPdfButtonHtml = ''; // Separate button for PDF
    let aiReviewButtonHtml = '';
    let ocrButtonHtml = ''; // Button for Image OCR

    // Determine button visibility based on note type
    const canReviewNote = isUserNote && note.type === NOTE_TYPES.TEXT;
    const canPreviewLatex = note.type === NOTE_TYPES.LATEX;
    const canDownloadTex = note.type === NOTE_TYPES.LATEX;
    // Allow PDF download for TEXT, LATEX, and AI_REVIEW
    const canDownloadPdf = note.type === NOTE_TYPES.TEXT || note.type === NOTE_TYPES.LATEX || note.type === NOTE_TYPES.AI_REVIEW;
    const canOcrImage = isUserNote && note.type === NOTE_TYPES.FILE && note.filetype?.startsWith('image/');

    // Generate content HTML
    if (note.type === NOTE_TYPES.FILE) {
        contentHtml = `<p class="text-center text-muted italic p-4">File: ${escapeHtml(note.filename)} (${escapeHtml(note.filetype || 'Unknown type')})</p>`;
        if (note.filetype?.startsWith('image/') && note.imageDataUri) {
             contentHtml += `<div class="text-center my-2"><img src="${note.imageDataUri}" alt="Image Preview" class="max-w-full max-h-60 inline-block border dark:border-gray-600 rounded"></div>`;
        } else if (note.filetype?.startsWith('image/')) {
             contentHtml += `<p class="text-center text-muted italic text-sm">(Image preview not available)</p>`;
        }
    } else if (note.type === NOTE_TYPES.AI_REVIEW) {
        contentHtml = `<div class="prose prose-sm dark:prose-invert max-w-none">${note.content}</div>`; // Assume content is already HTML formatted
    } else if (note.type === NOTE_TYPES.LATEX) {
         // Display raw LaTeX content directly for MathJax processing.
         // The content itself (e.g., "$$x^2$$") is not HTML escaped here,
         // allowing MathJax to correctly find and process its delimiters.
         // The surrounding div can be styled as needed.
         contentHtml = `<div class="latex-content-for-mathjax prose prose-sm dark:prose-invert max-w-none">${note.content}</div>`;
         // NO AI Review for LaTeX content directly
    } else { // TEXT (could be original text or extracted from PDF/TXT/MD)
         const titleSuffix = note.filename ? ` (Text from: ${escapeHtml(note.filename)})` : '';
         contentHtml = `<div class="prose prose-sm dark:prose-invert max-w-none">${escapeHtml(note.content).replace(/\n/g, '<br>')}</div>`;
         // Enable AI review for TEXT notes
         if (isUserNote) aiReviewButtonHtml = `<button onclick="window.reviewNoteWithAIWrapper('${note.id}')" class="btn-secondary-small text-xs">Review Note (AI)</button>`;
    }

    // Generate Button HTML
    if (canOcrImage) {
         ocrButtonHtml = `<button onclick="window.extractAndConvertImageNoteToLatexWrapper('${note.id}')" class="btn-secondary-small text-xs" title="Use AI Vision to extract text and convert to LaTeX">OCR & LaTeX (AI)</button>`;
    }
    if (canDownloadTex) {
         downloadTexButtonHtml = `<button onclick="window.downloadNoteAsTexWrapper('${note.id}')" class="btn-secondary-small text-xs">Download .tex</button>`;
    }
    if (canDownloadPdf) {
         downloadPdfButtonHtml = `<button onclick="window.downloadNoteAsPdfWrapper('${note.id}')" class="btn-secondary-small text-xs">Download PDF</button>`;
    }
    if (canPreviewLatex) { // Reuse the same button for preview/print
         // Replace PDF download with Preview/Print for LaTeX
         downloadPdfButtonHtml = `<button onclick="window.previewLatexNote('${note.id}')" class="btn-secondary-small text-xs">Preview/Print LaTeX</button>`;
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
                    ${aiReviewButtonHtml}
                    ${ocrButtonHtml}
                    ${downloadTexButtonHtml}
                    ${downloadPdfButtonHtml}
                    <button onclick="document.getElementById('note-view-modal').remove()" class="btn-secondary">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Render MathJax if needed
    if (note.type === NOTE_TYPES.TEXT || note.type === NOTE_TYPES.LATEX || note.type === NOTE_TYPES.AI_REVIEW) {
        await renderMathIn(document.getElementById('note-view-content-area'));
    }
}


// Helper to find a note by ID in either user or shared lists
function findNoteById(noteId, searchUserNotes) {
    const listToSearch = searchUserNotes ? currentLoadedUserNotes : currentLoadedSharedNotes;
    return listToSearch.find(note => note.id === noteId) || null;
}


// Wrapper for AI Review
async function reviewNoteWithAIUIAction(noteId) { // Renamed internal function
     const note = findNoteById(noteId, true); // Find in user notes
     // MODIFIED: Only allow review if type is TEXT
     if (!note || note.type !== NOTE_TYPES.TEXT) {
         alert("Cannot review this note type (only TEXT notes can be reviewed) or note not found.");
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

// NEW: Function to preview LaTeX note (opens in new tab for printing)
async function previewOrPrintLatexNote(noteId) {
    const note = findNoteById(noteId, true);
    if (!note || note.type !== NOTE_TYPES.LATEX) {
        alert("Cannot preview: Note not found or is not a LaTeX note.");
        return;
    }

    showLoading("Preparing LaTeX Preview...");
    const previewHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Preview: ${escapeHtml(note.title)}</title>
            <meta charset="UTF-8">
            <script>
              window.MathJax = {
                loader: { load: ['input/tex', 'output/svg'] },
                tex: { inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$'], ['\\[', '\\]']] },
                svg: { fontCache: 'global' }
              };
            </script>
            <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/startup.js" id="mathjax-script"></script>
            <style> body { font-family: 'Times New Roman', serif; padding: 2em; font-size: 12pt; line-height: 1.5; } </style>
        </head>
        <body>
            <h1>${escapeHtml(note.title)}</h1>
            <hr>
            <div>${note.content}</div>
             <script>
                // Ensure MathJax typesets after content is loaded
                window.addEventListener('load', () => {
                    if (typeof MathJax !== 'undefined' && MathJax.startup?.promise) {
                        MathJax.startup.promise.then(() => {
                            console.log("MathJax ready for preview.");
                            MathJax.typesetPromise().then(() => console.log("Preview typesetting complete."));
                        }).catch(err => console.error("Preview MathJax startup error:", err));
                    } else {
                         console.error("MathJax not ready on load for preview.");
                    }
                });
            </script>
        </body>
        </html>
    `;

    try {
        const blob = new Blob([previewHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const previewWindow = window.open(url, '_blank');
        if(!previewWindow) {
            alert("Popup blocked. Please allow popups for this site to preview the note.");
        }
        // No need to revoke URL immediately for new tabs
    } catch (e) {
        console.error("Error creating preview blob/URL:", e);
        alert("Failed to open preview window.");
    } finally {
        hideLoading();
    }
}

// NEW: Function to handle Image OCR and LaTeX conversion
async function extractAndConvertImageNoteToLatexUIAction(noteId) {
     const note = findNoteById(noteId, true);
     if (!note || note.type !== NOTE_TYPES.FILE || !note.filetype?.startsWith('image/') || !note.imageDataUri) {
         alert("Cannot process: Note is not a valid image or image data is missing.");
         return;
     }
     if (!confirm("Use AI Vision to extract text from this image and replace the note content with LaTeX? This may take a moment and cannot be easily undone.")) {
         return;
     }

      // Close view modal if open
     document.getElementById('note-view-modal')?.remove();

     showLoading("Processing Image with AI Vision...");
     try {
         const base64Data = note.imageDataUri.split(',')[1]; // Get Base64 part
         // Call the dedicated AI function
         const latexContent = await extractTextFromImageAndConvertToLatex(base64Data);

         if (latexContent === "") {
             alert("AI could not recognize significant text or math in the image.");
         } else {
             // Update the note content and type LOCALLY first
             const noteIndex = currentLoadedUserNotes.findIndex(n => n.id === noteId);
             if (noteIndex !== -1) {
                 currentLoadedUserNotes[noteIndex].content = latexContent;
                 currentLoadedUserNotes[noteIndex].type = NOTE_TYPES.LATEX; // Change type
                 currentLoadedUserNotes[noteIndex].timestamp = Date.now(); // Update timestamp
                 // Remove image data URI after successful conversion to save space
                 delete currentLoadedUserNotes[noteIndex].imageDataUri;

                 // Save the updated note list
                 const success = await saveUserNotes(currentUser.uid, currentCourseIdForNotes, currentChapterNumForNotes, currentLoadedUserNotes);
                 if (success) {
                     alert("Image successfully processed and converted to LaTeX note.");
                     await showNotesDocumentsPanel(currentCourseIdForNotes, currentChapterNumForNotes); // Refresh list
                 } else {
                     alert("Processed image but failed to save the updated LaTeX note.");
                     // Consider reverting local changes if save failed
                 }
             } else {
                 throw new Error("Original note index not found after AI processing.");
             }
         }
     } catch (error) {
         console.error("Error in image OCR/LaTeX process:", error);
         alert(`Failed to process image: ${error.message}`);
     } finally {
         hideLoading();
     }
}


// NEW: Download TEXT/LATEX/AI_REVIEW note as PDF
async function downloadNoteAsPdf(noteId) {
    const note = findNoteById(noteId, true); // Find user note
    if (!note || (note.type !== NOTE_TYPES.TEXT && note.type !== NOTE_TYPES.LATEX && note.type !== NOTE_TYPES.AI_REVIEW)) {
        alert("Cannot download: Only Text, LaTeX, or AI Review notes can be downloaded as PDF.");
        return;
    }
    const filename = note.title.replace(/[^a-zA-Z0-9_.-]/g, '_');
    showLoading(`Generating PDF for note: ${note.title}...`);
    try {
        const noteHtml = generateNotePdfHtml(note); // Use the dedicated HTML generator
        await generateAndDownloadPdfWithMathJax(noteHtml, filename);
    } catch (error) {
        console.error("Error generating note PDF:", error);
        alert(`Failed to generate PDF for note: ${error.message}`);
    } finally {
        hideLoading();
    }
}



// Attach wrapper functions to window scope (Done in script.js)

// --- END OF FILE ui_notes_documents.js ---