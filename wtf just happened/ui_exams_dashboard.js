// --- START OF FILE ui_exams_dashboard.js ---

import { currentSubject, currentUser, data, setData, db } from './state.js';
// CORRECTED: Added setActiveSidebarLink import
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, renderMathIn, escapeHtml } from './utils.js'; // Added escapeHtml
import { saveUserData, submitFeedback } from './firebase_firestore.js';
import { showManageSubjects } from './ui_subjects.js';
import { getAIExplanation } from './ai_integration.js';
import { ADMIN_UID } from './config.js';

// --- Exams Dashboard & Results Management ---

export function showExamsDashboard() {
     // ... (remains the same) ...
     if (!currentSubject) {
         displayContent('<p class="text-yellow-500 p-4">Please select a subject to view its exam history.</p><button onclick="window.showManageSubjects()" class="btn-secondary mt-2">Manage Subjects</button>');
         setActiveSidebarLink('showExamsDashboard'); // Still set active link even if showing message
         return;
     }
    // Combine pending and completed sections
    const pendingHtml = showEnterResults();
    const completedHtml = showCompletedExams();
    const html = `<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4">
            <h2 class="text-xl font-semibold mb-4 text-primary-600 dark:text-primary-400">Exams Dashboard (${escapeHtml(currentSubject.name || 'Unnamed')})</h2>
            ${pendingHtml}
            ${completedHtml}
            </div>`;
    displayContent(html);
    setActiveSidebarLink('showExamsDashboard'); // Set the active link
}

// --- PDF Exam Result Entry ---
// ... (showEnterResults, enterResultsForm, submitPendingResults remain the same) ...
function showEnterResults() {
    if (!currentSubject || !currentSubject.pending_exams) {
         return '<p class="text-sm text-gray-500 dark:text-gray-400 mt-4">No subject selected or no pending exam data.</p>';
    }
    const pending_exams = (currentSubject.pending_exams || []).filter(exam => !exam.results_entered);

    if (pending_exams.length === 0) {
         return '<p class="text-sm text-gray-500 dark:text-gray-400 mt-4">No pending PDF exams found.</p>';
    }

    let output = '<h3 class="text-lg font-semibold mb-3 mt-6 text-yellow-600 dark:text-yellow-400">Pending PDF Exams</h3><div class="space-y-2">';
    pending_exams.forEach((exam) => {
        const originalIndex = currentSubject.pending_exams.findIndex(p => p.id === exam.id && p.timestamp === exam.timestamp);
        if (originalIndex === -1) {
             console.error(`Could not find original index for pending exam ${exam.id}`);
             return;
        }
        const date = exam.timestamp ? new Date(exam.timestamp).toLocaleDateString() : 'N/A';
        // Calculate total questions from allocation
        let qCount = 0;
        if(exam.allocation && typeof exam.allocation === 'object') {
            qCount = Object.values(exam.allocation).reduce((sum, val) => {
                if (typeof val === 'number') return sum + val; // Old format
                if (typeof val === 'object') return sum + (val.questions || 0) + (val.problems || 0); // New format
                return sum;
            }, 0);
        }
        if (qCount === 0) qCount = exam.totalQuestions || 'Unknown'; // Fallback

        output += `
        <div class="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 flex flex-wrap justify-between items-center gap-2">
             <div class="flex-grow min-w-0">
                 <span class="text-sm font-medium truncate block" title="${escapeHtml(exam.id)}">${escapeHtml(exam.id)}</span>
                 <span class="text-xs text-gray-500 dark:text-gray-400 block">(${qCount} Items, ${date})</span>
             </div>
             <div class="flex-shrink-0 flex space-x-2">
                 <button onclick="window.enterResultsForm(${originalIndex})" title="Enter Results" class="btn-primary-small">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                    Enter Results
                 </button>
                  <button onclick="window.confirmDeletePendingExam(${originalIndex})" title="Delete Pending Exam" class="btn-danger-small">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                     Delete
                  </button>
            </div>
        </div>`;
    });
    output += '</div>';
    return output;
}
export function enterResultsForm(index) {
    // ... (Implementation remains the same) ...
    if (!currentSubject || !currentSubject.pending_exams || !currentSubject.pending_exams[index]) {
         displayContent('<p class="text-red-500 p-4">Error: Could not find the selected pending exam.</p>');
         setActiveSidebarLink('showExamsDashboard'); // Ensure sidebar link remains active
         return;
     }
    const exam = currentSubject.pending_exams[index];
    const detailedAllocation = exam.allocation;
    if (!detailedAllocation || typeof detailedAllocation !== 'object' || Object.keys(detailedAllocation).length === 0) {
         displayContent('<p class="text-red-500 p-4">Error: Invalid allocation data for this exam.</p><button onclick="window.showExamsDashboard()" class="btn-secondary mt-2">Back</button>');
         setActiveSidebarLink('showExamsDashboard');
         return;
    }
    let formHtml = `<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><h2 class="text-xl font-semibold mb-4">Enter PDF Exam Results</h2><p class="font-medium mb-4">Exam ID: ${escapeHtml(exam.id)}</p><div class="space-y-4">`;
    let chaptersWithInputs = []; let totalQuestionsInForm = 0;
    const sortedChaps = Object.keys(detailedAllocation).sort((a, b) => parseInt(a) - parseInt(b));
    for (let chap_num of sortedChaps) {
        const chapterAlloc = detailedAllocation[chap_num];
        let n = 0;
        if (typeof chapterAlloc === 'number') n = chapterAlloc; // Old format
        else if (typeof chapterAlloc === 'object') n = (chapterAlloc.questions || 0) + (chapterAlloc.problems || 0); // New format

        if (n > 0) {
             chaptersWithInputs.push(chap_num); totalQuestionsInForm += n;
            formHtml += `<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600"><label for="wrong-${chap_num}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chapter ${chap_num}: Number <strong class="text-red-600 dark:text-red-400">WRONG</strong> (out of ${n} items)</label><input id="wrong-${chap_num}" type="number" min="0" max="${n}" value="0" required inputmode="numeric" pattern="[0-9]*" class="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"></div>`;
        } else { console.warn(`Chapter ${chap_num} in exam ${exam.id} has invalid or zero allocation:`, chapterAlloc); }
    }
     if (chaptersWithInputs.length === 0) { formHtml += '<p class="text-yellow-500">Error: No valid question allocations found for this exam.</p>'; }
     else { formHtml += `<p class="text-sm text-gray-600 dark:text-gray-400 mt-4">Total items in this exam: ${totalQuestionsInForm}</p><input type="hidden" id="total-questions-in-form" value="${totalQuestionsInForm}">`; }
    formHtml += `</div><div class="mt-6 flex space-x-3"><button onclick="window.submitPendingResults(${index}, ${JSON.stringify(chaptersWithInputs)})" ${chaptersWithInputs.length === 0 ? 'disabled' : ''} class="flex-1 btn-primary ${chaptersWithInputs.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>Submit Results</button><button onclick="window.showExamsDashboard()" class="flex-1 btn-secondary"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>Cancel</button></div></div>`;
    displayContent(formHtml);
    setActiveSidebarLink('showExamsDashboard'); // Keep sidebar active during form entry
}
export async function submitPendingResults(index, chap_nums_with_inputs) {
    // ... (Implementation remains the same, handles new allocation format) ...
    if (!currentUser || !currentSubject || !data || !currentSubject.pending_exams || !currentSubject.pending_exams[index] || !currentSubject.chapters) { alert("Error submitting results: Critical data missing."); hideLoading(); return; }
    showLoading("Saving PDF Results...");
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
        const exam = currentSubject.pending_exams[index]; const chapters = currentSubject.chapters; const detailedAllocation = exam.allocation;
        if (!detailedAllocation || typeof detailedAllocation !== 'object' || Object.keys(detailedAllocation).length === 0) { throw new Error("Invalid allocation data found during submission."); }
        let allInputsValid = true; let chapterResults = {}; let totalItemsInExam = parseInt(document.getElementById('total-questions-in-form')?.value || '0'); let totalWrongInExam = 0; let chaptersDataModified = false;

        for (let chap_num of chap_nums_with_inputs) {
            const chapterAlloc = detailedAllocation[chap_num];
            let n_mcq = 0; let n_prob = 0; let n_total = 0;
            let mcqNumbers = []; let probNumbers = [];

            if (typeof chapterAlloc === 'number') { n_mcq = chapterAlloc; n_total = n_mcq; mcqNumbers = Array.from({length: n_mcq}, (_,i) => i+1); /* Cannot know actual Q numbers */ } // Old format
            else if (typeof chapterAlloc === 'object') { // New format
                n_mcq = chapterAlloc.questions?.length || 0;
                n_prob = chapterAlloc.problems?.length || 0;
                n_total = n_mcq + n_prob;
                mcqNumbers = chapterAlloc.questions || [];
                probNumbers = chapterAlloc.problems || [];
            }
            if (n_total === 0) continue;

            const inputElement = document.getElementById(`wrong-${chap_num}`); if (!inputElement) { console.error(`Input field for chapter ${chap_num} not found!`); allInputsValid = false; break; }
            let wrong = parseInt(inputElement.value);
            if (isNaN(wrong) || wrong < 0 || wrong > n_total) { alert(`Invalid input for Chapter ${chap_num}. Must be between 0 and ${n_total}.`); inputElement.classList.add('border-red-500', 'dark:border-red-500', 'ring-1', 'ring-red-500'); inputElement.focus(); allInputsValid = false; break; }
            else {
                 inputElement.classList.remove('border-red-500', 'dark:border-red-500', 'ring-1', 'ring-red-500');
                 totalWrongInExam += wrong;
                 // Distribute wrong count proportionally? Assume most errors on MCQs for simplicity?
                 // Let's just store total attempted and total wrong for PDF exams. Detailed breakdown isn't possible without more input.
                 chapterResults[chap_num] = { attempted: n_total, wrong: wrong, correct: n_total - wrong, attemptedMCQ: n_mcq, attemptedProblems: n_prob };

                 const globalChap = chapters[chap_num];
                 if (globalChap) {
                     // Remove MCQs
                     if (globalChap.available_questions && Array.isArray(globalChap.available_questions) && Array.isArray(mcqNumbers)) {
                         mcqNumbers.forEach(qNum => { const qIndexInAvailable = globalChap.available_questions.indexOf(qNum); if (qIndexInAvailable > -1) { globalChap.available_questions.splice(qIndexInAvailable, 1); chaptersDataModified = true; } else { console.warn(`Q ${qNum} (Ch ${chap_num}) from PDF alloc not in available MCQ list.`); } });
                         if(chaptersDataModified) globalChap.available_questions.sort((a, b) => a - b);
                     }
                     // Remove Problems
                      if (globalChap.available_problems && Array.isArray(globalChap.available_problems) && Array.isArray(probNumbers)) {
                          probNumbers.forEach(pNum => { const pIndexInAvailable = globalChap.available_problems.indexOf(pNum); if (pIndexInAvailable > -1) { globalChap.available_problems.splice(pIndexInAvailable, 1); chaptersDataModified = true; } else { console.warn(`P ${pNum} (Ch ${chap_num}) from PDF alloc not in available Problem list.`); } });
                          if(chaptersDataModified) globalChap.available_problems.sort((a, b) => a - b);
                      }
                 } else { console.error(`Chapter ${chap_num} data missing.`); }
            }
        }
        if (!allInputsValid) { hideLoading(); return; }

        // Update global chapter stats (total attempted/wrong based on overall result)
        for (let chap_num in chapterResults) {
            const result = chapterResults[chap_num]; const chap = chapters[chap_num];
            if (chap) {
                 chap.total_attempted = (chap.total_attempted || 0) + result.attempted;
                 chap.total_wrong = (chap.total_wrong || 0) + result.wrong;
                 chap.mistake_history = chap.mistake_history || [];
                 chap.mistake_history.push(result.wrong); if (chap.mistake_history.length > 20) chap.mistake_history.shift();
                 chap.consecutive_mastery = (result.wrong === 0 && result.attempted > 0) ? (chap.consecutive_mastery || 0) + 1 : 0;
                 chaptersDataModified = true;
             }
            else { console.error(`Global chapter data for Chapter ${chap_num} not found.`); }
        }

        const finalScore = totalItemsInExam - totalWrongInExam;
        const pdfExamResult = { examId: exam.id, subjectId: currentSubject.id, timestamp: exam.timestamp || new Date().toISOString(), durationMinutes: null, type: 'pdf', questions: null, problems: null, allocation: detailedAllocation, score: finalScore, originalScore: finalScore, totalQuestions: totalItemsInExam, /* Deprecate totalQuestions? Use totalItems? */ totalItems: totalItemsInExam, resultsByChapter: chapterResults };
        currentSubject.exam_history = currentSubject.exam_history || []; currentSubject.exam_history.push(pdfExamResult); currentSubject.pending_exams.splice(index, 1);
        await saveUserData(currentUser.uid); console.log("PDF results submitted, stats updated, data saved.");
        hideLoading(); showExamsDashboard(); // Refresh dashboard
        const successMsgHtml = `<div class="bg-green-100 dark:bg-green-900 border-l-4 border-green-500 text-green-700 dark:text-green-200 p-4 rounded-md mb-4 animate-fade-in fixed top-16 right-4 z-50 shadow-lg"><p class="font-medium">Results for PDF exam ${escapeHtml(exam.id)} entered successfully!</p></div>`;
        const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 5000);
    } catch(error) { console.error("Error submitting PDF results:", error); alert("Failed to submit results: " + error.message); hideLoading(); showExamsDashboard(); }
}

// --- Completed Exams ---
function showCompletedExams() {
    // ... (remains the same) ...
    if (!currentSubject || !currentSubject.exam_history) { return '<p class="text-sm text-gray-500 dark:text-gray-400 mt-4">No exam history data available.</p>'; }
    const completed_exams = [...(currentSubject.exam_history || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (completed_exams.length === 0) { return '<p class="text-sm text-gray-500 dark:text-gray-400 mt-4">No completed test history found.</p>'; }
    let output = '<h3 class="text-lg font-semibold mb-3 mt-6 text-green-600 dark:text-green-400">Completed Exam History</h3><div class="space-y-2">';
    completed_exams.forEach((exam) => {
        const originalIndex = currentSubject.exam_history.findIndex(h => h.examId === exam.examId && h.timestamp === exam.timestamp);
        if (originalIndex < 0) { console.error(`Cannot find original index for completed exam ${exam.examId}`); return; }
        const displayScore = exam.overriddenScore ?? exam.originalScore ?? exam.score ?? 0; const originalScore = exam.originalScore ?? exam.score ?? 0;
        const totalItems = exam.totalItems || exam.totalQuestions || 0; // Use totalItems if available
        const totalMCQs = exam.totalMcqItems ?? (exam.type === 'online' ? exam.items?.filter(i => i.type === 'mcq').length : totalItems); // Estimate if needed
        // Percentage based on MCQs for online, total for PDF
        const denominator = exam.type === 'online' ? totalMCQs : totalItems;
        const percentage = denominator > 0 ? ((displayScore / denominator) * 100).toFixed(1) : 0;
        const originalPercentage = denominator > 0 ? ((originalScore / denominator) * 100).toFixed(1) : 0;
        const date = new Date(exam.timestamp).toLocaleString(); const isPdfExam = exam.type === 'pdf'; const isOverridden = exam.overriddenScore !== undefined && exam.overriddenScore !== originalScore;
        output += `
        <div class="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200">
             <div class="flex flex-wrap justify-between items-center mb-1 gap-x-4 gap-y-1"><span class="text-sm font-medium flex items-center flex-grow min-w-0"><span class="truncate" title="${escapeHtml(exam.examId)}">${escapeHtml(exam.examId)}</span>${isPdfExam ? '<span class="ml-2 text-xs bg-purple-200 text-purple-800 dark:bg-purple-700 dark:text-purple-200 px-1.5 py-0.5 rounded flex-shrink-0">PDF</span>' : '<span class="ml-2 text-xs bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-200 px-1.5 py-0.5 rounded flex-shrink-0">Online</span>'}${isOverridden ? '<span class="ml-2 text-xs bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200 px-1.5 py-0.5 rounded flex-shrink-0">Overridden</span>' : ''}</span><span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">${date}</span></div>
             <div class="flex justify-between items-center"><span class="font-semibold ${percentage >= 70 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}">${displayScore} / ${denominator} (${percentage}%)${isOverridden ? `<span class="text-xs text-gray-500 dark:text-gray-400 ml-1">(Original: ${originalScore} / ${denominator} - ${originalPercentage}%)</span>` : ''} ${denominator !== totalItems ? `(${totalItems} total items)` : ''}</span><div class="flex-shrink-0 flex space-x-2"><button onclick="window.showExamDetailsWrapper(${originalIndex})" title="View Details" class="btn-secondary-small"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639l4.458-4.458a1.012 1.012 0 0 1 1.414 0l4.458 4.458a1.012 1.012 0 0 1 0 .639l-4.458 4.458a1.012 1.012 0 0 1-1.414 0l-4.458-4.458Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>Details</button><button onclick="window.confirmDeleteCompletedExam(${originalIndex})" title="Delete History Entry" class="btn-danger-small"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>Delete</button></div></div>
        </div>`;
    });
    output += '</div>';
    return output;
}


export async function showExamDetails(index) {
    if (!currentSubject || !currentSubject.exam_history || !currentSubject.exam_history[index]) { displayContent('<p class="text-red-500 p-4">Error: Could not find exam history entry.</p>'); return; }
    const exam = currentSubject.exam_history[index];
    const displayScore = exam.overriddenScore ?? exam.originalScore ?? exam.score ?? 0;
    const originalScore = exam.originalScore ?? exam.score ?? 0;
    const totalItems = exam.totalItems || exam.totalQuestions || 0;
    const totalMCQs = exam.totalMcqItems ?? (exam.type === 'online' ? exam.items?.filter(i => i.type === 'mcq').length : totalItems);
    const denominator = exam.type === 'online' ? totalMCQs : totalItems;
    const percentage = denominator > 0 ? ((displayScore / denominator) * 100).toFixed(1) : 0;
    const originalPercentage = denominator > 0 ? ((originalScore / denominator) * 100).toFixed(1) : 0;
    const date = new Date(exam.timestamp).toLocaleString();
    const isPdfExam = exam.type === 'pdf';
    const isOverriddenOverall = exam.overriddenScore !== undefined && exam.overriddenScore !== originalScore;

    let itemsHtml = '';
    let chapterSummaryHtml = '';

    if (isPdfExam) {
        itemsHtml = '<p class="text-sm italic p-4 text-center">Detailed question breakdown is not available for PDF exams.</p>';
    } else if (exam.items && exam.items.length > 0) {
        exam.items.forEach((item, qIndex) => {
            if (item.type === 'mcq') {
                const userAnswer = item.userAnswer;
                const correctAnswer = item.correctAnswer;
                const isCorrect = item.isOverridden !== undefined ? item.isOverridden : item.isCorrect; // Use override if exists
                const wasOriginallyCorrect = item.isCorrect;
                const overrideApplied = item.isOverridden !== undefined;
                const itemBg = isCorrect ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30';
                const itemBorder = isCorrect ? 'border-green-200 dark:border-green-700' : 'border-red-200 dark:border-red-700';

                itemsHtml += `<div class="${itemBg} ${itemBorder} border p-3 rounded-md shadow-sm mb-3">`;
                itemsHtml += `<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Ch ${item.chapter} - MCQ ${item.number} (ID: ${item.id})</p>`;
                if(item.image) itemsHtml += `<img src="${item.image}" alt="Question Image" class="max-w-xs h-auto mx-auto my-2 border dark:border-gray-600 rounded" onerror="this.style.display='none';">`;
                itemsHtml += `<div class="prose prose-sm dark:prose-invert max-w-none mb-2 question-text-container">${item.text}</div>`;
                itemsHtml += `<div class="space-y-1 text-xs">`;
                (item.options || []).forEach(opt => {
                    let optionClass = 'border-gray-300 dark:border-gray-600';
                    let indicator = '';
                    if (opt.letter === correctAnswer) { indicator = '<span class="text-green-600 dark:text-green-400 font-bold ml-1">(Correct)</span>'; }
                    if (opt.letter === userAnswer) {
                        optionClass = isCorrect ? 'border-green-500 dark:border-green-400 ring-1 ring-green-500' : 'border-red-500 dark:border-red-400 ring-1 ring-red-500';
                        indicator += '<span class="text-blue-600 dark:text-blue-400 font-bold ml-1">(Your Answer)</span>';
                    }
                    itemsHtml += `<div class="border ${optionClass} p-2 rounded bg-white dark:bg-gray-800 flex"><strong class="mr-2">${opt.letter}.</strong> <span class="option-text-container flex-1">${opt.text}</span> ${indicator}</div>`;
                });
                itemsHtml += `</div>`;
                // Override & Feedback Buttons
                itemsHtml += `<div class="mt-2 pt-2 border-t dark:border-gray-600 flex justify-end items-center gap-2">`;
                if (overrideApplied) itemsHtml += `<span class="text-xs italic text-yellow-600 dark:text-yellow-400 mr-auto">Result overridden</span>`;
                itemsHtml += `<button onclick="window.promptFeedback(${index}, ${qIndex})" class="btn-secondary-small text-xs" title="Report issue with this question">Feedback</button>`;
                if (!isCorrect) itemsHtml += `<button onclick="window.overrideQuestionCorrectness(${index}, ${qIndex}, true)" class="btn-success-small text-xs" title="Mark this answer as correct">Mark Correct</button>`;
                if (isCorrect && !wasOriginallyCorrect) itemsHtml += `<button onclick="window.overrideQuestionCorrectness(${index}, ${qIndex}, false)" class="btn-danger-small text-xs" title="Revert to incorrect">Mark Incorrect</button>`;
                itemsHtml += `<button onclick="window.triggerAIExplanation(${index}, ${qIndex})" class="btn-info-small text-xs" title="Get AI Explanation">Explain (AI)</button></div>`;
                itemsHtml += `<div id="ai-explanation-${qIndex}" class="mt-2 text-xs hidden bg-purple-50 dark:bg-purple-900/30 p-2 rounded border border-purple-200 dark:border-purple-700"></div>`;
                itemsHtml += `</div>`;
            } else if (item.type === 'problem') {
                // Display problem text and user's text answer
                const itemBg = 'bg-blue-50 dark:bg-blue-900/30'; // Neutral color for problems
                const itemBorder = 'border-blue-200 dark:border-blue-700';
                itemsHtml += `<div class="${itemBg} ${itemBorder} border p-3 rounded-md shadow-sm mb-3">`;
                itemsHtml += `<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Ch ${item.chapter} - Problem ${item.number} (ID: ${item.id})</p>`;
                if(item.image) itemsHtml += `<img src="${item.image}" alt="Problem Image" class="max-w-xs h-auto mx-auto my-2 border dark:border-gray-600 rounded" onerror="this.style.display='none';">`;
                itemsHtml += `<div class="prose prose-sm dark:prose-invert max-w-none mb-2 question-text-container">${item.text}</div>`;
                itemsHtml += `<div class="mt-2 pt-2 border-t dark:border-gray-600">`;
                itemsHtml += `<p class="text-xs font-semibold mb-1">Your Answer:</p>`;
                itemsHtml += `<div class="text-xs whitespace-pre-wrap p-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-600">${escapeHtml(item.userAnswer || '(No answer submitted)')}</div>`;
                // Placeholder for AI Grade display
                const aiGrade = item.aiGrade !== null && item.aiGrade !== undefined ? `${item.aiGrade}/10` : 'Not Graded';
                itemsHtml += `<p class="text-xs font-semibold mt-2 mb-1">AI Grade: <span id="ai-grade-${item.id}">${aiGrade}</span></p>`;
                itemsHtml += `<div id="ai-grade-explanation-${item.id}" class="text-xs text-muted italic">${item.aiExplanation ? escapeHtml(item.aiExplanation) : ''}</div>`;
                itemsHtml += `<div class="mt-2 flex justify-end gap-2"> <button onclick="window.triggerProblemAIGrade(${index}, ${qIndex})" class="btn-secondary-small text-xs">Grade with AI</button> <button onclick="window.promptFeedback(${index}, ${qIndex})" class="btn-secondary-small text-xs">Feedback</button> </div>`;
                itemsHtml += `</div></div>`;
            }
        });
    } else {
        itemsHtml = '<p class="text-sm italic p-4 text-center">No item details available for this exam.</p>';
    }

    // Chapter Summary (Based on MCQ results for now)
    if (exam.resultsByChapter && Object.keys(exam.resultsByChapter).length > 0) {
        chapterSummaryHtml = '<div class="mb-4 border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800"><h4 class="text-sm font-semibold mb-2">Performance by Chapter (MCQs)</h4><ul class="space-y-1">';
        Object.entries(exam.resultsByChapter).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).forEach(([chapNum, chapRes]) => {
            const perc = chapRes.attemptedMCQ > 0 ? ((chapRes.correctMCQ / chapRes.attemptedMCQ) * 100).toFixed(1) : 0;
            const color = chapRes.wrongMCQ > 0 ? 'text-red-500' : 'text-green-500';
            const problemText = chapRes.attemptedProblems > 0 ? ` (+${chapRes.attemptedProblems} Problems)` : '';
            chapterSummaryHtml += `<li class="flex justify-between items-center text-xs"><span class="font-medium">Chapter ${chapNum}</span><span class="font-semibold ${color}">${chapRes.correctMCQ}/${chapRes.attemptedMCQ} (${perc}%)${problemText}</span></li>`;
        });
        chapterSummaryHtml += '</ul></div>';
    }

    const mainHtml = `
        <div class="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg shadow-inner mb-4">
            <div class="flex justify-between items-center mb-4">
                 <h2 class="text-xl font-semibold text-primary-600 dark:text-primary-400 flex items-center flex-wrap gap-x-2">
                     <span class="truncate" title="${exam.examId}">${exam.examId || 'Exam Details'}</span>
                     ${isPdfExam ? '<span class="text-xs bg-purple-200 text-purple-800 dark:bg-purple-700 dark:text-purple-200 px-1.5 py-0.5 rounded flex-shrink-0">PDF</span>' : '<span class="text-xs bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-200 px-1.5 py-0.5 rounded flex-shrink-0">Online</span>'}
                     ${isOverriddenOverall ? '<span class="text-xs bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200 px-1.5 py-0.5 rounded flex-shrink-0">Overridden</span>' : ''}
                 </h2>
                 <button onclick="window.showExamsDashboard()" class="btn-secondary-small flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
                      Back
                  </button>
             </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${date}${exam.durationMinutes ? ` - Duration: ${exam.durationMinutes} min` : ''}</p>
             <p class="text-lg font-bold mb-1">Overall Score: ${displayScore} / ${totalQuestions} (${percentage}%)</p>
             ${isOverriddenOverall ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-4">(Original: ${originalScore} / ${totalQuestions} - ${originalPercentage}%)</p>` : '<p class="mb-4"></p>'} <!-- Adjust spacing -->

            ${chapterSummaryHtml}
            <h3 class="text-md font-semibold mb-3 mt-5">Question Breakdown</h3>
             <div id="exam-details-questions-container" class="max-h-[60vh] overflow-y-auto pr-2 border-t border-b dark:border-gray-700 py-4 space-y-3">${questionsHtml}</div>
             <button onclick="window.showExamsDashboard()" class="mt-6 w-full btn-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
                Back to Exams Dashboard
            </button>
        </div>`;


    displayContent(mainHtml);
    const itemsContainer = document.getElementById('exam-details-questions-container');
    if (itemsContainer) { await renderMathIn(itemsContainer); } else { console.error("Could not find items container for MathJax."); }
    setActiveSidebarLink('showExamsDashboard'); // Keep sidebar active
}


// --- Override Function ---
// ... (overrideQuestionCorrectness remains the same) ...
export async function overrideQuestionCorrectness(examIndex, questionIndex, markAsCorrect) {
    // Ensure we only override MCQs for now
     if (!currentUser || !currentSubject || !data || !currentSubject.exam_history || !currentSubject.exam_history[examIndex] || !currentSubject.exam_history[examIndex].items) { alert("Error: Cannot override answer."); return; }
     const exam = currentSubject.exam_history[examIndex];
     const item = exam.items[questionIndex];
     if (!item || item.type !== 'mcq') { alert("Error: Can only override multiple-choice questions."); return; }

     if (item.userAnswer === item.correctAnswer && markAsCorrect) { console.log("Cannot mark an originally correct answer as correct again."); return; }

     item.isOverridden = markAsCorrect;

     // Recalculate score based on MCQs only
     let newScore = 0;
     exam.items.forEach(it => {
          if (it.type === 'mcq') {
               const originallyCorrect = it.userAnswer === it.correctAnswer;
               if (it.isOverridden === true || (it.isOverridden === undefined && originallyCorrect)) {
                    newScore++;
               }
          }
     });

     exam.originalScore = exam.originalScore ?? exam.score ?? 0;
     exam.overriddenScore = newScore; // Store the MCQ-based overridden score

     console.log(`Override applied: MCQ ${questionIndex+1} marked as ${markAsCorrect}. New MCQ score: ${newScore} (Original MCQ Score: ${exam.originalScore})`);
     showLoading("Saving override...");
     try { await saveUserData(currentUser.uid); hideLoading(); await showExamDetails(examIndex); }
     catch (error) { console.error("Failed to save override:", error); alert("Error saving the change: " + error.message); hideLoading(); }
}

// --- Feedback Functions ---
// ... (promptFeedback, handleFeedbackSubmission remain the same) ...
export function promptFeedback(examIndex, questionIndex) {
     if (!currentSubject || !currentSubject.exam_history || !currentSubject.exam_history[examIndex] || !currentSubject.exam_history[examIndex].items) return;
     const exam = currentSubject.exam_history[examIndex]; const item = exam.items[questionIndex]; if (!item) return;
     const feedbackText = prompt(`Enter feedback/report issue for ${item.type === 'mcq' ? 'Question' : 'Problem'} ${questionIndex+1} (Ch ${item.chapter} - ${item.number}):\n\n"${escapeHtml(item.text.substring(0, 100))}..."`);
     if (feedbackText && feedbackText.trim()) { handleFeedbackSubmission(exam.subjectId, item.id, feedbackText.trim()); } else if (feedbackText !== null) { alert("Feedback cannot be empty."); }
}
async function handleFeedbackSubmission(subjectId, itemId, feedbackText) {
    if (!currentUser) { alert("You must be logged in to submit feedback."); return; }
    showLoading("Submitting feedback...");
    // Include item ID instead of just question ID
    const success = await submitFeedback({ subjectId: subjectId || 'N/A', questionId: itemId || 'N/A', feedbackText: feedbackText }, currentUser );
    hideLoading(); if (success) { alert("Feedback submitted successfully. Thank you!"); }
}


// --- AI Trigger ---
// Modified to handle item types
export async function triggerAIExplanationWrapper(examIndex, questionIndex) {
    const explanationAreaId = `ai-explanation-${questionIndex}`; const explanationArea = document.getElementById(explanationAreaId); if (!explanationArea) { console.error(`Explanation area ${explanationAreaId} not found.`); return; }
    const displayMessage = (html) => { explanationArea.innerHTML = html; explanationArea.classList.remove('hidden'); };
    if (!currentSubject || !currentSubject.exam_history || !currentSubject.exam_history[examIndex] || !currentSubject.exam_history[examIndex].items) { displayMessage(`<p class="text-red-500">Error: Could not load item data.</p>`); return; }
    const exam = currentSubject.exam_history[examIndex]; const item = exam.items[questionIndex]; if (!item) { displayMessage(`<p class="text-red-500">Error: Item not found.</p>`); return; }

    if (item.type !== 'mcq') {
         displayMessage(`<p class="text-info-500">AI Explanation is only available for Multiple Choice Questions currently.</p>`);
         return;
    }

    displayMessage(`<div class="flex items-center justify-center space-x-2"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p>Generating AI explanation...</p></div>`);
    try {
        const aiData = { questionText: item.text, options: item.options, correctAnswer: item.correctAnswer, userAnswer: item.userAnswer, isUserCorrect: item.userAnswer === item.correctAnswer };
        const explanationHtml = await getAIExplanation(aiData);
        explanationArea.innerHTML = `<p class="font-semibold text-purple-700 dark:text-purple-300">AI Explanation:</p><div class="prose prose-sm dark:prose-invert max-w-none mt-1">${explanationHtml}</div>`;
        await renderMathIn(explanationArea);
    } catch (error) { console.error("Error getting/displaying AI explanation:", error); displayMessage(`<p class="text-red-500">An unexpected error occurred.</p>`); }
}


// --- NEW: AI Grading Trigger ---
export async function triggerProblemAIGrade(examIndex, itemIndex) {
    const gradeSpanId = `ai-grade-${currentSubject.exam_history[examIndex].items[itemIndex].id}`;
    const explanationDivId = `ai-grade-explanation-${currentSubject.exam_history[examIndex].items[itemIndex].id}`;
    const gradeSpan = document.getElementById(gradeSpanId);
    const explanationDiv = document.getElementById(explanationDivId);

    if (!gradeSpan || !explanationDiv) { console.error("Cannot find AI grade display elements."); return; }
    if (!currentSubject || !currentSubject.exam_history || !currentSubject.exam_history[examIndex] || !currentSubject.exam_history[examIndex].items) { alert("Error: Cannot grade. Exam data missing."); return; }

    const exam = currentSubject.exam_history[examIndex];
    const item = exam.items[itemIndex];

    if (item.type !== 'problem' || !item.userAnswer) { alert("AI Grading is only available for submitted problem answers."); return; }

    gradeSpan.textContent = 'Grading...';
    explanationDiv.textContent = '';
    showLoading("Requesting AI Grade...");

    try {
        // Fetch chapter content for context (assuming problem needs chapter context)
        // This might be slow - consider caching or pre-fetching if used often
        const courseId = exam.courseContext?.courseId; // Check if it's a course exam
        let chapterContent = "No specific chapter context available for standard tests.";
        if (courseId && item.chapter) {
             const courseDef = globalCourseDataMap.get(courseId);
             const pdfPath = courseDef?.pdfPathPattern?.replace('{num}', item.chapter);
             const pdfText = pdfPath ? await getAllPdfTextForAI(pdfPath) : null; // Need getAllPdfTextForAI from ai_integration
             // Could add transcription fetching here too if needed
             if (pdfText) chapterContent = pdfText;
        }

        const { score, explanation } = await gradeProblemWithAI(item.text, item.userAnswer, chapterContent); // Needs gradeProblemWithAI from ai_integration

        // Update the UI
        gradeSpan.textContent = `${score}/10`;
        explanationDiv.textContent = explanation;

        // Update the exam history data locally and save
        item.aiGrade = score;
        item.aiExplanation = explanation;
        await saveUserData(currentUser.uid); // Save updated history
        hideLoading();
        alert(`AI Grading Complete: Score ${score}/10`);

    } catch (error) {
        hideLoading();
        console.error("Error during AI grading:", error);
        gradeSpan.textContent = 'Error';
        explanationDiv.textContent = `Failed to grade: ${error.message}`;
        alert("AI Grading failed. See console for details.");
    }
}
window.triggerProblemAIGrade = triggerProblemAIGrade; // Assign to window scope


// --- Admin Answer Edit Placeholder ---
// ... (promptAdminEditAnswerPlaceholder remains the same) ...ta
export function promptAdminEditAnswerPlaceholder(questionId) {
     if (currentUser?.uid !== ADMIN_UID) { alert("Permission denied."); return; }
     alert(`Admin Function: Edit Answer for ${questionId}\n\nNOTE: Currently, answers are derived from the Markdown file. Edit the .md file and reload data to change answers.`);
}

// --- Deletion Functions ---
// ... (confirmDeletePendingExam, deletePendingExam, confirmDeleteCompletedExam, deleteCompletedExam remain the same) ...
export function confirmDeletePendingExam(index) {
    // ... (Implementation remains the same) ...
    if (!currentSubject || !currentSubject.pending_exams || !currentSubject.pending_exams[index]) return;
    const exam = currentSubject.pending_exams[index];
    const confirmation = confirm(`Delete PENDING exam "${escapeHtml(exam.id)}"?\n\nResults have NOT been entered. Questions WILL NOT be returned to pool.`);
    if (confirmation) deletePendingExam(index);
}
export async function deletePendingExam(index) {
    // ... (Implementation remains the same) ...
     if (!currentUser || !currentSubject || !data) { alert("Cannot delete: State missing."); return; }
     showLoading("Deleting Pending Exam..."); await new Promise(resolve => setTimeout(resolve, 100));
    try {
         const exam = currentSubject.pending_exams?.[index]; if (!exam) throw new Error("Pending exam not found."); const examId = exam.id;
         currentSubject.pending_exams.splice(index, 1); await saveUserData(currentUser.uid);
         hideLoading(); showExamsDashboard(); // Refresh view
         const successMsg = `<div class="bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-200 p-4 rounded-md mb-4 animate-fade-in fixed top-16 right-4 z-50 shadow-lg"><p class="font-medium">Pending exam ${escapeHtml(examId)} deleted.</p></div>`;
         const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsg; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 4000);
    } catch (error) { console.error("Error deleting pending exam:", error); alert("Failed to delete pending exam: " + error.message); hideLoading(); showExamsDashboard(); }
}
export function confirmDeleteCompletedExam(index) {
    // ... (Implementation remains the same) ...
    if (!currentSubject || !currentSubject.exam_history || !currentSubject.exam_history[index]) return;
    const exam = currentSubject.exam_history[index];
    const confirmation = confirm(`Permanently delete history for COMPLETED exam "${escapeHtml(exam.examId)}"?\n\nWARNING: Cannot be undone. Questions/Problems WILL become available again.`);
    if (confirmation) deleteCompletedExam(index);
}
export async function deleteCompletedExam(index) {
    // ... (Implementation modified to handle problems) ...
    if (!currentUser || !currentSubject || !data || !currentSubject.exam_history || !currentSubject.chapters) { alert("Error deleting history: Critical data missing."); hideLoading(); return; }
    showLoading("Deleting Exam History...");
    await new Promise(resolve => setTimeout(resolve, 100));
     try {
         const examToDelete = currentSubject.exam_history[index]; if (!examToDelete) throw new Error("Completed exam not found."); const examId = examToDelete.examId;
         let itemsToReadd = []; let chaptersDataModified = false;

         if (examToDelete.items && Array.isArray(examToDelete.items)) {
             itemsToReadd = examToDelete.items.map(item => ({ chapter: item.chapter, number: item.number, type: item.type }));
         } else if (examToDelete.allocation && typeof examToDelete.allocation === 'object') { // Fallback for older PDF exams
            Object.entries(examToDelete.allocation).forEach(([chapNum, alloc]) => {
                if (typeof alloc === 'number') { // Very old format
                     Array.from({ length: alloc }).forEach((_, i) => itemsToReadd.push({ chapter: chapNum, number: i + 1, type: 'mcq' })); // Assume MCQ
                } else if (typeof alloc === 'object') {
                    (alloc.questions || []).forEach(qNum => itemsToReadd.push({ chapter: chapNum, number: qNum, type: 'mcq' }));
                    (alloc.problems || []).forEach(pNum => itemsToReadd.push({ chapter: chapNum, number: pNum, type: 'problem' }));
                }
            });
         } else { console.warn(`Exam ${examToDelete.examId} format unknown for re-adding items.`); }

         itemsToReadd.forEach(({ chapter: chapNum, number: itemNum, type }) => {
             if (!chapNum || isNaN(parseInt(chapNum)) || !itemNum || isNaN(parseInt(itemNum)) || !type) { console.warn(`Invalid chap/num/type during re-add: ${chapNum}/${itemNum}/${type}.`); return; }
             const globalChap = currentSubject.chapters[chapNum];
             if (globalChap) {
                 if (type === 'mcq' && globalChap.available_questions && Array.isArray(globalChap.available_questions)) {
                     if (!globalChap.available_questions.includes(itemNum)) { globalChap.available_questions.push(itemNum); chaptersDataModified = true; }
                 } else if (type === 'problem' && globalChap.available_problems && Array.isArray(globalChap.available_problems)) {
                     if (!globalChap.available_problems.includes(itemNum)) { globalChap.available_problems.push(itemNum); chaptersDataModified = true; }
                 } else {
                     console.warn(`Cannot re-add item ${type} ${itemNum} (Ch ${chapNum}): Available list or type mismatch.`);
                 }
             } else { console.error(`Chapter ${chapNum} missing for re-add Item ${type} ${itemNum}.`); }
         });

         if (chaptersDataModified) {
             Object.values(currentSubject.chapters).forEach(chap => {
                 if (chap.available_questions) chap.available_questions.sort((a, b) => a - b);
                 if (chap.available_problems) chap.available_problems.sort((a, b) => a - b);
             });
         }

         currentSubject.exam_history.splice(index, 1);
         await saveUserData(currentUser.uid); console.log(`Exam history ${examId} deleted. Items (${itemsToReadd.length}) re-added. Data saved.`);
         hideLoading(); showExamsDashboard(); // Refresh view
         const successMsgHtml = `<div class="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 rounded-md mb-4 animate-fade-in fixed top-16 right-4 z-50 shadow-lg"><p class="font-medium">Exam ${escapeHtml(examId)} history deleted.</p><p class="text-xs">Associated items are available again.</p></div>`;
         const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 5000);
     } catch (error) {
         console.error("Error deleting completed exam history:", error);
         alert("Failed to delete exam history: " + error.message);
         hideLoading();
         showExamsDashboard(); // Still refresh view on error
         setActiveSidebarLink('showExamsDashboard');
     }
}

// --- END OF FILE ui_exams_dashboard.js ---