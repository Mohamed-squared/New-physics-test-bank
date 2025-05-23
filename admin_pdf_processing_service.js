// admin_pdf_processing_service.js
import { globalCourseDataMap, currentUser } from './state.js';
import { showLoading, hideLoading } from './utils.js';
// Note: No direct Firestore writes in these functions, they call a backend service.

export async function startPdfProcessing(file, courseId, actualFirstPageNumber) {
    const feedbackArea = document.getElementById('pdf-processor-feedback');
    const startButton = document.getElementById('start-pdf-processing-btn');
    if (!feedbackArea || !startButton) { alert("Error: UI components missing."); return; }
    feedbackArea.innerHTML = ''; 
    if (!file || !courseId || !actualFirstPageNumber) {
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400">Error: PDF file, Course, and "Actual Page 1 Number" must be provided.</p>`; return;
    }
    if (parseInt(actualFirstPageNumber, 10) < 1) {
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400">Error: "Actual Page 1 Number" must be 1 or greater.</p>`; return;
    }
    const megaEmail = prompt("Enter your MEGA Email (The Archivist's Seal):");
    if (!megaEmail) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">MEGA Email is required.</p>`; return; }
    const megaPassword = prompt("Enter your MEGA Password (The Vault Key):");
    if (!megaPassword) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">MEGA Password is required.</p>`; return; }
    const geminiApiKey = prompt("Enter your Gemini API Key (The Oracle's Token for ToC):");
    if (!geminiApiKey) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">Gemini API Key is required.</p>`; return; }

    showLoading(`Initiating PDF transformation for ${file.name}...`);
    startButton.disabled = true;
    feedbackArea.innerHTML = `<p class="text-blue-600 dark:text-blue-400">Transmitting ${file.name} to the Alchemist's workshop... This may take a moment.</p>`;
    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('courseId', courseId);
    formData.append('actualFirstPageNumber', actualFirstPageNumber);
    formData.append('megaEmail', megaEmail);
    formData.append('megaPassword', megaPassword);
    formData.append('geminiApiKey', geminiApiKey);
    try {
        const response = await fetch('http://localhost:3001/process-textbook-pdf', { method: 'POST', body: formData });
        feedbackArea.innerHTML = `<p class="text-blue-600 dark:text-blue-400">The PDF is now in the Alchemist's hands. Analyzing Table of Contents, splitting into scrolls, and archiving to MEGA. This is a lengthy ritual...</p>`;
        const result = await response.json();
        hideLoading();
        if (response.ok && result.success) {
            feedbackArea.innerHTML = `
                <p class="text-green-600 dark:text-green-400 font-semibold flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>📚 The Tome is Transformed!</p>
                <p class="ml-8"><strong>Full Tome Archived:</strong> <a href="${result.fullPdfLink}" target="_blank" class="link">${result.fullPdfLink}</a></p>
                <p class="ml-8"><strong>Scrolls (Chapters) Created:</strong> ${result.chaptersProcessed || 0}</p>
                <ul class="list-disc list-inside ml-10 text-sm">${(result.chapterLinks && result.chapterLinks.length > 0) ? result.chapterLinks.map(link => `<li><a href="${link}" target="_blank" class="link">${link}</a></li>`).join('') : '<li>No chapter scrolls were separated.</li>'}</ul>
                <p class="ml-8 mt-2"><strong>Alchemist's Note:</strong> ${result.message || 'Completed.'}</p>`;
        } else {
            throw new Error(result.message || `HTTP error ${response.status}`);
        }
    } catch (error) {
        hideLoading();
        console.error("Error calling /process-textbook-pdf endpoint:", error);
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400 font-semibold"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>PDF Alchemy Failed: ${error.message}</p>`;
    } finally {
        startButton.disabled = false;
    }
}

export function displayTextbookPdfProcessor(containerElement) {
    if (!currentUser || !currentUser.isAdmin) { containerElement.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`; return; }
    let courseOptions = '<option value="">Select Course Chronicle</option>';
    globalCourseDataMap.forEach((course, courseId) => { courseOptions += `<option value="${courseId}">${course.name}</option>`; });
    containerElement.innerHTML = `
        <div class="content-card p-6">
            <h2 class="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v1.586M12 12.253v1.586M12 18.253v1.586M7.5 12.253h1.586M13.5 12.253h1.586M16.732 7.96a4.5 4.5 0 010 6.364M5.268 7.96a4.5 4.5 0 000 6.364m11.464-6.364a4.5 4.5 0 00-6.364 0m6.364 0a4.5 4.5 0 010 6.364m-6.364-6.364L12 12.253" /></svg>PDF Alchemist's Bench</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Transmute monolithic PDF Tomes into chapter-scrolls, ready for study and archiving.</p>
            <div class="space-y-5">
                <div>
                    <label for="pdf-file-upload" class="label">Upload Tome (Full Textbook PDF):</label>
                    <input type="file" id="pdf-file-upload" name="pdf-file-upload" class="input-field file-input mt-1" accept=".pdf">
                </div>
                <div>
                    <label for="pdf-course-select" class="label">Assign to Course Chronicle:</label>
                    <select id="pdf-course-select" name="pdf-course-select" class="select-dropdown mt-1">${courseOptions}</select>
                </div>
                <div>
                    <label for="pdf-actual-page-one" class="label">True Page '1' (PDF Page Number for Textbook's Page 1):</label>
                    <input type="number" id="pdf-actual-page-one" name="pdf-actual-page-one" class="input-field mt-1" placeholder="e.g., 21 (if page '1' of content is on PDF page 21)" min="1" value="1">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">The Alchemist needs to know where the true content begins, after prefaces and tables.</p>
                </div>
                <button id="start-pdf-processing-btn" class="btn-primary w-full flex items-center justify-center py-2.5">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Begin Transmutation
                </button>
                <div id="pdf-processor-feedback" class="feedback-area min-h-[60px]"><p class="text-gray-500 dark:text-gray-400">The Alchemist's Bench is ready.</p></div>
            </div>
        </div>`;
    document.getElementById('start-pdf-processing-btn')?.addEventListener('click', () => {
        startPdfProcessing(document.getElementById('pdf-file-upload').files[0], document.getElementById('pdf-course-select').value, document.getElementById('pdf-actual-page-one').value);
    });
}
