// ui_import_export.js

// REMOVED markdownContentCache, added db (needed for fetch logic potentially, though not strictly used in this version)
import { currentUser, data, currentSubject, db } from './state.js';
import { showLoading, hideLoading } from './utils.js';
import { updateChaptersFromMarkdown } from './markdown_parser.js';
import { loadUserData } from './firebase_firestore.js';
import { showTestGenerationDashboard } from './ui_test_generation.js';
import { displayContent } from './ui_core.js';
// REMOVED: import { MARKDOWN_FILE_URL } from './config.js'; // No longer needed

// --- Helper: Fetch Markdown (similar to firestore helper, adapted for import context) ---
async function fetchMarkdownForImportSync(subjectData) {
    if (!subjectData) return null;
    // Use subject.fileName, default logic might need adjustment based on expected import data format
    const fileName = subjectData.fileName || (subjectData.name === "Fundamentals of Physics" ? "chapters.md" : `${subjectData.name}.md`);
    const safeFileName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    const url = `${safeFileName}?t=${new Date().getTime()}`;

    console.log(`Import Sync: Fetching Markdown from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Import Sync: Markdown file not found at ${url} for subject: ${subjectData.name || 'Unknown'}`);
                return null; // File not found is okay here, sync won't happen for this subject
            }
            throw new Error(`HTTP error fetching markdown! status: ${response.status} for ${url}`);
        }
        const mdContent = await response.text();
        console.log(`Import Sync: Markdown fetched for subject ${subjectData.name || 'Unknown'}.`);
        return mdContent;
    } catch (error) {
        console.error(`Import Sync: Error fetching Markdown for ${subjectData.name || 'Unknown'} (${url}):`, error);
        // Don't alert during import, just log the error
        return null; // Indicate fetch failure
    }
}


// --- Import / Export ---

export async function exportData() {
    if (!currentUser || !data) {
         alert("No user data loaded to export.");
         return;
     }
    showLoading("Exporting Data...");
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
         if (!db) throw new Error("Firestore DB not initialized.");
        const userRef = db.collection('users').doc(currentUser.uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new Error("User data not found in Firestore for export.");
        }
        const dataToExport = userDoc.data();

        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const userIdentifier = currentUser.email || currentUser.uid.substring(0, 8);
        a.download = `test_generator_backup_${userIdentifier}_${new Date().toISOString().slice(0, 10)}.json`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        hideLoading();

        const successMsg = `<div class="bg-green-100 dark:bg-green-900 border-l-4 border-green-500 text-green-700 dark:text-green-200 p-4 rounded-md animate-fade-in fixed top-16 right-4 z-50 shadow-lg"><p class="font-medium">Data exported successfully!</p></div>`;
        const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsg; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 4000);

    } catch (error) {
         console.error("Error exporting data:", error);
         alert("Failed to export data: " + error.message);
         hideLoading();
    }
}

export function importData() {
    if (!currentUser) {
        alert("Please log in before importing data.");
        return;
    }
   const input = document.createElement('input');
   input.type = 'file';
   input.accept = '.json';

   input.onchange = async (event) => {
       const file = event.target.files?.[0];
       if (!file) {
           console.log("No file selected for import.");
           return;
       }

       if (!confirm(`⚠️ WARNING! ⚠️\n\nThis will completely OVERWRITE all current data (subjects, progress, history, settings) for user "${currentUser.displayName || currentUser.email}" with the contents of the selected file.\n\nThis action CANNOT be undone.\n\nAre you absolutely sure you want to proceed?`)) {
            console.log("Import cancelled by user.");
            return;
       }

        showLoading("Importing Data...");
       const reader = new FileReader();

       reader.onload = async (e) => {
           try {
               const importedJson = e.target?.result;
               if (!importedJson) throw new Error("File content could not be read.");

               const importedUserData = JSON.parse(importedJson);

               // Basic validation
               if (!importedUserData || typeof importedUserData.appData?.subjects !== 'object') {
                   throw new Error("Invalid data format. The file does not seem to be a valid Test Generator backup (missing appData.subjects).");
               }

                // --- Re-sync with latest Markdown (Iterate through imported subjects) ---
                let changesMadeBySync = false;
                if (importedUserData.appData?.subjects) {
                     console.log("Re-syncing imported data with subject-specific Markdown definitions...");
                     for (const subjectId in importedUserData.appData.subjects) {
                         const subject = importedUserData.appData.subjects[subjectId];
                         if (!subject) continue; // Skip if subject is null/invalid

                         // Fetch the specific MD file for this imported subject
                         const subjectMarkdown = await fetchMarkdownForImportSync(subject);

                         if (subjectMarkdown) {
                             console.log(`Syncing chapters for imported subject: ${subject.name || subjectId}`);
                             if (updateChaptersFromMarkdown(subject, subjectMarkdown)) {
                                  changesMadeBySync = true;
                             }
                         } else {
                             console.warn(`Could not fetch Markdown for imported subject ${subject.name || subjectId} (File: ${subject.fileName || 'Not specified'}). Chapters may be out of sync.`);
                             // Optionally clear chapters if MD is missing?
                             // subject.chapters = {}; changesMadeBySync = true;
                         }
                     }
                     console.log(`Imported data re-sync complete. Changes made during sync: ${changesMadeBySync}`);
                }
                // --- End Re-sync ---

                // Ensure essential top-level fields match current user or defaults
                importedUserData.email = currentUser.email; // Force email match
                importedUserData.displayName = importedUserData.displayName || currentUser.displayName || currentUser.email.split('@')[0];
                importedUserData.photoURL = importedUserData.photoURL || currentUser.photoURL || null;
                // Ensure username exists, using existing if possible, else derive
                importedUserData.username = importedUserData.username
                    || (currentUser.email?.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20))
                    || `user_${currentUser.uid.substring(0,6)}`; // Fallback username
                importedUserData.onboardingComplete = importedUserData.onboardingComplete ?? true; // Assume imported means onboarded


                 if (!db) throw new Error("Firestore DB not initialized.");
                // Overwrite the entire document in Firestore
                const userRef = db.collection('users').doc(currentUser.uid);
                await userRef.set(importedUserData); // Use set() to overwrite
                console.log("Data imported and overwritten in Firestore.");

                hideLoading();

               // Show success feedback
               const successMsg = `<div class="bg-green-100 dark:bg-green-900 border-l-4 border-green-500 text-green-700 dark:text-green-200 p-4 rounded-md mb-4 animate-fade-in fixed top-16 right-4 z-50 shadow-lg"><p class="font-medium">Data imported successfully!</p>${changesMadeBySync ? '<p class="text-xs">Chapter data re-synchronized with latest definitions.</p>' : ''}</div>`;
                const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsg; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 6000);

                // Force a full reload of the user data and UI refresh
                 console.log("Reloading user data after import...");
                 await loadUserData(currentUser.uid); // Load the freshly imported data into the app state
                 showTestGenerationDashboard(); // Navigate to a default view

           } catch (err) {
               console.error("Error importing data:", err);
               alert("Error importing data: " + err.message + "\nPlease ensure you selected a valid JSON backup file.");
               hideLoading();
           }
       };

       reader.onerror = function() {
           alert("Error reading the selected file.");
           hideLoading();
       }
       reader.readAsText(file);
   };
   input.click();
}

export function showImportExportDashboard() {
    const html = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4">
            <h2 class="text-xl font-semibold mb-4 text-primary-600 dark:text-primary-400">Import / Export Data</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">You can export your current progress and settings, or import a previously exported file to restore your data.</p>

            <div class="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600">
                <h3 class="font-medium mb-3 text-gray-700 dark:text-gray-300">Export Data</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">Download a JSON file containing all your subjects, chapter progress, studied status, and exam history.</p>
                <button onclick="window.exportData()" class="btn-primary w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export My Data
                </button>
            </div>

            <div class="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-300 dark:border-yellow-700">
                <h3 class="font-medium mb-3 text-yellow-800 dark:text-yellow-300">Import Data</h3>
                <p class="text-sm text-yellow-700 dark:text-yellow-200 mb-3"><strong class="font-semibold">⚠️ Warning:</strong> Importing data will completely <strong class="underline">overwrite</strong> all your current subjects, progress, and history. This action cannot be undone.</p>
                <button onclick="window.importData()" class="btn-secondary w-full border-yellow-500 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-300 dark:hover:bg-yellow-800/50">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                     Import Data from File...
                </button>
            </div>
        </div>
    `;
    displayContent(html);
    setActiveSidebarLink('showImportExportDashboard');
}
