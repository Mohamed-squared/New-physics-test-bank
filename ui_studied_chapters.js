// --- START OF FILE ui_studied_chapters.js ---

import { currentSubject, currentUser, data } from './state.js'; // Added 'data' import
import { displayContent, setActiveSidebarLink } from './ui_core.js'; // Added setActiveSidebarLink
import { saveUserData } from './firebase_firestore.js';
import { showManageSubjects } from './ui_subjects.js'; // Import for link
import { escapeHtml } from './utils.js'; // Import escapeHtml

// --- Chapter Management (Studied Status) ---

export function showManageStudiedChapters() {
     if (!currentSubject || !currentSubject.chapters) {
         displayContent('<p class="text-yellow-500 p-4">Please select a subject first to manage its studied chapters.</p><button onclick="window.showManageSubjects()" class="btn-secondary mt-2">Manage Subjects</button>');
         setActiveSidebarLink('showManageStudiedChapters', 'sidebar-standard-nav'); // Ensure link is active
         return;
     }
    const chapters = currentSubject.chapters;
    // Get chapter numbers, filter those without questions, and sort numerically
    const chapterNumbers = Object.keys(chapters)
        .filter(num => chapters[num] && chapters[num].total_questions > 0)
        .sort((a, b) => parseInt(a) - parseInt(b));

    const studied = currentSubject.studied_chapters || [];

    if (chapterNumbers.length === 0) {
        displayContent(`<p class="text-red-500 p-4">No chapters with questions found for subject "${escapeHtml(currentSubject.name)}".</p><button onclick="window.showManageSubjects()" class="btn-secondary mt-2">Back to Subjects</button>`);
        setActiveSidebarLink('showManageStudiedChapters', 'sidebar-standard-nav');
        return;
    }

    // Generate checkbox HTML for each chapter with questions
    let chapterCheckboxesHtml = chapterNumbers.map(num => {
        const chap = chapters[num];
        const totalCount = chap.total_questions || 0;
        // --- MODIFICATION START ---
        const chapterTitle = chap?.title ? escapeHtml(chap.title) : 'No Title Found';
        // --- MODIFICATION END ---

        // Skip rendering if totalCount is somehow still 0 after filter (safety)
        // if (totalCount === 0) return '';
        return `
        <div class="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-150">
            <input id="studied-chap-${num}" type="checkbox" value="${num}"
                   class="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-600 dark:border-gray-500"
                   ${studied.includes(num) ? 'checked' : ''}
                   onchange="window.toggleStudiedChapter('${num}', this.checked)">
            <!-- --- MODIFICATION START --- -->
            <label for="studied-chap-${num}" class="ml-3 block text-sm font-medium text-gray-900 dark:text-gray-300 cursor-pointer flex-grow">
                Chapter ${num}: ${chapterTitle} <span class="text-xs text-gray-500 dark:text-gray-400">(${totalCount} questions)</span>
            </label>
            <!-- --- MODIFICATION END --- -->
        </div>
        `;
    }).join('');

    const html = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4">
            <h2 class="text-xl font-semibold mb-4 text-primary-600 dark:text-primary-400">Manage Studied Chapters (${escapeHtml(currentSubject.name || 'Unnamed Subject')})</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Select chapters you have studied. These will be included when you choose the "Test Studied Chapters" option during test generation.</p>
            <div class="space-y-2 max-h-80 overflow-y-auto p-2 border dark:border-gray-600 rounded">
                ${chapterCheckboxesHtml || '<p class="text-sm text-center text-gray-500 dark:text-gray-400">No chapters with questions found to manage.</p>'}
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-4">Changes are saved automatically when you check/uncheck a box.</p>
        </div>
    `;
    displayContent(html);
    setActiveSidebarLink('showManageStudiedChapters', 'sidebar-standard-nav');
}

export async function toggleStudiedChapter(chapNum, isChecked) {
    console.log(`toggleStudiedChapter called for chapNum: ${chapNum}, isChecked: ${isChecked}`);

     // Ensure user and subject data are loaded
     if (!currentUser || !currentSubject || !data) {
         console.error("Cannot toggle studied chapter: State missing (currentUser, currentSubject, or data).");
         const checkbox = document.getElementById(`studied-chap-${chapNum}`);
         if (checkbox) checkbox.checked = !isChecked;
         alert("Error saving change. Required data not loaded. Please try again.");
         return;
     }

     // Verify currentSubject is actually part of the main data object
     if (!data.subjects || !data.subjects[currentSubject.id]) {
         console.error("Cannot toggle studied chapter: currentSubject is not found within the main data structure.");
         const checkbox = document.getElementById(`studied-chap-${chapNum}`);
         if (checkbox) checkbox.checked = !isChecked;
         alert("Error saving change. Subject data inconsistent. Please try again.");
         return;
     }

     // Use the subject reference directly from the 'data' object to ensure modification
     const subjectToModify = data.subjects[currentSubject.id];

    // *** MODIFIED: Add robust check for subjectToModify ***
    if (!subjectToModify || typeof subjectToModify !== 'object' || !subjectToModify.id) {
        console.error("Cannot toggle studied chapter: subjectToModify is invalid or missing ID. CurrentSubject.id:", currentSubject?.id, "subjectToModify:", subjectToModify);
        // Revert checkbox
        const checkbox = document.getElementById(`studied-chap-${chapNum}`);
        if (checkbox) checkbox.checked = !isChecked;
        alert("Error saving change. Subject data inconsistent. Please refresh and try again.");
        return;
    }

    // Ensure the studied_chapters array exists on the subject being modified
    subjectToModify.studied_chapters = subjectToModify.studied_chapters || [];

    console.log('Before change:', JSON.stringify(subjectToModify.studied_chapters));

    const index = subjectToModify.studied_chapters.indexOf(chapNum);

    let changed = false;
    if (isChecked && index === -1) {
        // Add chapter if checked and not already present
        subjectToModify.studied_chapters.push(chapNum);
        // Keep the list sorted numerically for consistency
         subjectToModify.studied_chapters.sort((a, b) => parseInt(a) - parseInt(b));
         changed = true;
         console.log(`Marked Chapter ${chapNum} as studied (locally).`);
    } else if (!isChecked && index > -1) {
        // Remove chapter if unchecked and present
        subjectToModify.studied_chapters.splice(index, 1);
         changed = true;
         console.log(`Marked Chapter ${chapNum} as not studied (locally).`);
    }

    console.log('After change:', JSON.stringify(subjectToModify.studied_chapters));
    console.log('Change detected:', changed);


    // Save data only if a change actually occurred
    if (changed) {
        console.log('Attempting to save user data...');
        try {
            // *** MODIFIED: Ensure saveUserData(currentUser.uid) is called (correct, uses global 'data' by default) ***
            await saveUserData(currentUser.uid); 
            console.log("Studied chapters updated and saved successfully via saveUserData.");
        } catch (error) {
            console.error("Failed to save studied chapter update:", error);
            // Attempt to revert the change in the local state if save fails
            if (isChecked && index === -1) { // We added it, remove it
                 const revertIndex = subjectToModify.studied_chapters.indexOf(chapNum);
                 if (revertIndex > -1) subjectToModify.studied_chapters.splice(revertIndex, 1);
            } else if (!isChecked && index > -1) { // We removed it, add it back
                 subjectToModify.studied_chapters.push(chapNum);
                 subjectToModify.studied_chapters.sort((a, b) => parseInt(a) - parseInt(b));
            }
            // Revert checkbox visually
            const checkbox = document.getElementById(`studied-chap-${chapNum}`);
            if (checkbox) checkbox.checked = !isChecked;
            alert("Error saving your change. Please try again.");
        }
    } else {
        console.log("No change needed for chapter", chapNum, "- state already matches.");
    }
}
// --- END OF FILE ui_studied_chapters.js ---