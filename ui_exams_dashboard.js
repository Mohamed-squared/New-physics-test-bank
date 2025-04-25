// ui_exams_dashboard.js

// CORRECTED: Import db and currentUser from state.js
import { currentSubject, currentUser, data, setData, db } from './state.js';
import { displayContent } from './ui_core.js';
import { showLoading, hideLoading, renderMathIn } from './utils.js';
// CORRECTED: Removed db import from here, submitFeedback is still needed
import { saveUserData, submitFeedback } from './firebase_firestore.js';
import { showManageSubjects } from './ui_subjects.js';
import { getAIExplanation } from './ai_integration.js';
import { ADMIN_UID } from './config.js';

// --- Exams Dashboard & Results Management ---

export function showExamsDashboard() {
     if (!currentSubject) {
         displayContent('<p class="text-yellow-500 p-4">Please select a subject to view its exam history.</p><button onclick="window.showManageSubjects()" class="btn-secondary mt-2">Manage Subjects</button>');
         return;
     }
    // Combine pending and completed sections
    const pendingHtml = showEnterResults();
    const completedHtml = showCompletedExams();
    const html = `<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4">
            <h2 class="text-xl font-semibold mb-4 text-primary-600 dark:text-primary-400">Exams Dashboard (${currentSubject.name || 'Unnamed'})</h2>
            ${pendingHtml}
            ${completedHtml}
            </div>`;
    displayContent(html);
    setActiveSidebarLink('showExamsDashboard'); // <-- ADD THIS LINE
}

// --- PDF Exam Result Entry ---
// This function generates HTML, it doesn't display it directly
function showEnterResults() {
    if (!currentSubject || !currentSubject.pending_exams) {
         return '<p class="text-sm text-gray-500 dark:text-gray-400 mt-4">No subject selected or no pending exam data.</p>';
    }
    // Filter out exams where results are already entered (though they should be moved to history)
    const pending_exams = (currentSubject.pending_exams || []).filter(exam => !exam.results_entered);

    if (pending_exams.length === 0) {
         return '<p class="text-sm text-gray-500 dark:text-gray-400 mt-4">No pending PDF exams found.</p>';
    }

    let output = '<h3 class="text-lg font-semibold mb-3 mt-6 text-yellow-600 dark:text-yellow-400">Pending PDF Exams</h3><div class="space-y-2">';
    pending_exams.forEach((exam) => { // Use index from filtered array
        // Find the original index in the *full* pending_exams array for correct referencing
        const originalIndex = currentSubject.pending_exams.findIndex(p => p.id === exam.id && p.timestamp === exam.timestamp);
        if (originalIndex === -1) {
             console.error(`Could not find original index for pending exam ${exam.id}`);
             return; // Skip if index not found
        }
        const date = exam.timestamp ? new Date(exam.timestamp).toLocaleDateString() : 'N/A';
        const qCount = exam.totalQuestions || 'Unknown';
        output += `
        <div class="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 flex flex-wrap justify-between items-center gap-2">
             <div class="flex-grow min-w-0">
                 <span class="text-sm font-medium truncate block" title="${exam.id}">${exam.id}</span>
                 <span class="text-xs text-gray-500 dark:text-gray-400 block">(${qCount} Qs, ${date})</span>
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
    if (!currentSubject || !currentSubject.pending_exams || !currentSubject.pending_exams[index]) {
         displayContent('<p class="text-red-500 p-4">Error: Could not find the selected pending exam.</p>');
         return;
     }
    const exam = currentSubject.pending_exams[index];
    const detailedAllocation = exam.allocation;

    // Validate allocation data
    if (!detailedAllocation || typeof detailedAllocation !== 'object' || Object.keys(detailedAllocation).length === 0) {
         displayContent('<p class="text-red-500 p-4">Error: Invalid allocation data for this exam. Cannot enter results.</p><button onclick="window.showExamsDashboard()" class="btn-secondary mt-2">Back</button>');
         return;
    }

    let formHtml = `<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><h2 class="text-xl font-semibold mb-4">Enter PDF Exam Results</h2><p class="font-medium mb-4">Exam ID: ${exam.id}</p><div class="space-y-4">`;
    let chaptersWithInputs = [];
    let totalQuestionsInForm = 0;
    // Sort chapters numerically for consistent form display
    const sortedChaps = Object.keys(detailedAllocation).sort((a, b) => parseInt(a) - parseInt(b));

    for (let chap_num of sortedChaps) {
        const questionsInChapter = detailedAllocation[chap_num];
        // Check if the allocation for this chapter is valid (an array of numbers)
        const n = Array.isArray(questionsInChapter) ? questionsInChapter.length : 0;

        if (n > 0) {
             chaptersWithInputs.push(chap_num); // Track chapters that have inputs
             totalQuestionsInForm += n;
            formHtml += `
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600">
                <label for="wrong-${chap_num}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Chapter ${chap_num}: Number <strong class="text-red-600 dark:text-red-400">WRONG</strong> (out of ${n} questions)
                </label>
                <input id="wrong-${chap_num}" type="number" min="0" max="${n}" value="0" required inputmode="numeric" pattern="[0-9]*"
                    class="border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white">
            </div>`;
        } else {
            // Optionally log or display chapters with invalid/empty allocations
            console.warn(`Chapter ${chap_num} in exam ${exam.id} has invalid or empty allocation:`, questionsInChapter);
        }
    }

     // Display total questions and add hidden input
     if (chaptersWithInputs.length === 0) {
         formHtml += '<p class="text-yellow-500">Error: No valid question allocations found for this exam.</p>';
     } else {
          formHtml += `<p class="text-sm text-gray-600 dark:text-gray-400 mt-4">Total questions in this exam: ${totalQuestionsInForm}</p>`;
          formHtml += `<input type="hidden" id="total-questions-in-form" value="${totalQuestionsInForm}">`;
     }

    // Close form divs and add buttons
    formHtml += `</div>
    <div class="mt-6 flex space-x-3">
        <button onclick="window.submitPendingResults(${index}, ${JSON.stringify(chaptersWithInputs)})" ${chaptersWithInputs.length === 0 ? 'disabled' : ''}
            class="flex-1 btn-primary ${chaptersWithInputs.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
            Submit Results
        </button>
         <button onclick="window.showExamsDashboard()" class="flex-1 btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
             Cancel
         </button>
    </div></div>`; // Close main card div
    displayContent(formHtml);
}

export async function submitPendingResults(index, chap_nums_with_inputs) {
    // Ensure necessary data is present
    if (!currentUser || !currentSubject || !data || !currentSubject.pending_exams || !currentSubject.pending_exams[index] || !currentSubject.chapters) {
        alert("Error submitting results: Critical data missing or state inconsistent.");
        hideLoading();
        return;
    }
    showLoading("Saving PDF Results...");
    await new Promise(resolve => setTimeout(resolve, 100)); // Allow UI to show loading

    try {
        const exam = currentSubject.pending_exams[index];
        const chapters = currentSubject.chapters;
        const detailedAllocation = exam.allocation; // e.g., { "1": [1, 3, 5], "2": [2, 4] }

        // Double-check allocation exists
        if (!detailedAllocation || typeof detailedAllocation !== 'object' || Object.keys(detailedAllocation).length === 0) {
            throw new Error("Invalid allocation data found during submission.");
        }

        let allInputsValid = true;
        let chapterResults = {}; // Store { attempted, wrong, correct } per chapter
        let totalAttemptedInExam = parseInt(document.getElementById('total-questions-in-form')?.value || '0');
        let totalWrongInExam = 0;
        let chaptersDataModified = false; // Flag to check if main chapter data changed

        // Validate inputs for each chapter that had an input field generated
        for (let chap_num of chap_nums_with_inputs) {
            const questionsInChapter = detailedAllocation[chap_num];
            // Should be an array based on form generation logic, but double check
            const n = Array.isArray(questionsInChapter) ? questionsInChapter.length : 0;
            if (n === 0) continue; // Skip chapters with no allocated questions

            const inputElement = document.getElementById(`wrong-${chap_num}`);
            if (!inputElement) {
                console.error(`Input field for chapter ${chap_num} not found! Aborting.`);
                allInputsValid = false;
                break; // Stop validation
            }

            let wrong = parseInt(inputElement.value);
            // Input validation
            if (isNaN(wrong) || wrong < 0 || wrong > n) {
                alert(`Invalid input for Chapter ${chap_num}. Number wrong must be between 0 and ${n}.`);
                inputElement.classList.add('border-red-500', 'dark:border-red-500', 'ring-1', 'ring-red-500');
                inputElement.focus();
                allInputsValid = false;
                break; // Stop validation
            } else {
                // Input is valid, remove error styling and store result
                inputElement.classList.remove('border-red-500', 'dark:border-red-500', 'ring-1', 'ring-red-500');
                totalWrongInExam += wrong;
                chapterResults[chap_num] = { attempted: n, wrong: wrong, correct: n - wrong };

                // --- Remove questions from available pool ---
                const globalChap = chapters[chap_num];
                if (globalChap && globalChap.available_questions && Array.isArray(globalChap.available_questions) && Array.isArray(questionsInChapter)) {
                    questionsInChapter.forEach(qNum => {
                        const qIndexInAvailable = globalChap.available_questions.indexOf(qNum);
                        if (qIndexInAvailable > -1) {
                            globalChap.available_questions.splice(qIndexInAvailable, 1);
                            chaptersDataModified = true;
                        } else {
                            console.warn(`Question ${qNum} (Ch ${chap_num}) from PDF exam allocation not found in available list.`);
                        }
                    });
                     // Ensure available list remains sorted after removal
                     globalChap.available_questions.sort((a, b) => a - b);
                } else {
                    console.error(`Chapter ${chap_num} data or available_questions list missing when trying to remove questions.`);
                }
            }
        } // End of chapter loop

        // If any input was invalid, stop processing
        if (!allInputsValid) {
            hideLoading();
            return;
        }

        // --- Update global chapter statistics ---
        for (let chap_num in chapterResults) {
            const result = chapterResults[chap_num];
            const chap = chapters[chap_num];
            if (chap) {
                // Update cumulative attempts and wrongs
                chap.total_attempted = (chap.total_attempted || 0) + result.attempted;
                chap.total_wrong = (chap.total_wrong || 0) + result.wrong;
                // Update mistake history
                chap.mistake_history = chap.mistake_history || [];
                chap.mistake_history.push(result.wrong);
                if (chap.mistake_history.length > 20) chap.mistake_history.shift(); // Keep history length manageable
                 // Update consecutive mastery
                 chap.consecutive_mastery = (result.wrong === 0 && result.attempted > 0)
                     ? (chap.consecutive_mastery || 0) + 1
                     : 0; // Reset mastery if mistakes were made
                 chaptersDataModified = true; // Mark data as modified
            } else {
                console.error(`Global chapter data for Chapter ${chap_num} not found.`);
            }
        }

        // --- Create the exam history record ---
        const finalScore = totalAttemptedInExam - totalWrongInExam;
        const pdfExamResult = {
            examId: exam.id,
            subjectId: currentSubject.id,
            timestamp: exam.timestamp || new Date().toISOString(), // Use original timestamp if available
            durationMinutes: null, // Duration not applicable for PDF tests
            type: 'pdf',
            questions: null, // No individual question details for PDF results
            allocation: detailedAllocation, // Store the original allocation
            score: finalScore, // Current score (same as original initially)
            originalScore: finalScore, // Set original score explicitly
            // overriddenScore is not set initially
            totalQuestions: totalAttemptedInExam,
            resultsByChapter: chapterResults // Store chapter aggregates
        };

        // Add to history and remove from pending
        currentSubject.exam_history = currentSubject.exam_history || [];
        currentSubject.exam_history.push(pdfExamResult);
        currentSubject.pending_exams.splice(index, 1); // Remove from pending list

        // --- Save all changes to Firestore ---
        await saveUserData(currentUser.uid);
        console.log("PDF results submitted, chapter stats updated, and user data saved.");

        hideLoading();
        showExamsDashboard(); // Refresh the dashboard view

        // Show success feedback message
        const successMsgHtml = `<div class="bg-green-100 dark:bg-green-900 border-l-4 border-green-500 text-green-700 dark:text-green-200 p-4 rounded-md mb-4 animate-fade-in fixed top-16 right-4 z-50 shadow-lg"><p class="font-medium">Results for PDF exam ${exam.id} entered successfully!</p></div>`;
        const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml;
        document.body.appendChild(msgContainer);
        setTimeout(() => { msgContainer.remove(); }, 5000); // Auto-remove after 5 seconds

    } catch(error) {
         console.error("Error submitting PDF results:", error);
         alert("Failed to submit results: " + error.message);
         hideLoading();
         showExamsDashboard();
    }
}


// --- Completed Exams ---
function showCompletedExams() {
    if (!currentSubject || !currentSubject.exam_history) {
        return '<p class="text-sm text-gray-500 dark:text-gray-400 mt-4">No exam history data available.</p>';
    }
    // Sort exams by timestamp, newest first
    const completed_exams = [...(currentSubject.exam_history || [])]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (completed_exams.length === 0) {
        return '<p class="text-sm text-gray-500 dark:text-gray-400 mt-4">No completed test history found.</p>';
    }

    let output = '<h3 class="text-lg font-semibold mb-3 mt-6 text-green-600 dark:text-green-400">Completed Exam History</h3><div class="space-y-2">';
    completed_exams.forEach((exam) => { // Use index from sorted array later if needed, but prefer original index for actions
        // Find the original index in the unsorted history array for linking/deleting
        const originalIndex = currentSubject.exam_history.findIndex(h => h.examId === exam.examId && h.timestamp === exam.timestamp);
        if (originalIndex < 0) {
            console.error(`Cannot find original index for completed exam ${exam.examId} (${exam.timestamp})`);
            return; // Skip if index cannot be found
        }

        // Use overridden score if available, otherwise use original score
        const displayScore = exam.overriddenScore ?? exam.originalScore ?? exam.score ?? 0;
        const originalScore = exam.originalScore ?? exam.score ?? 0; // Get original for comparison
        const totalQuestions = exam.totalQuestions || 0;
        const percentage = totalQuestions > 0 ? ((displayScore / totalQuestions) * 100).toFixed(1) : 0;
        const originalPercentage = totalQuestions > 0 ? ((originalScore / totalQuestions) * 100).toFixed(1) : 0;
        const date = new Date(exam.timestamp).toLocaleString();
        const isPdfExam = exam.type === 'pdf';
        const isOverridden = exam.overriddenScore !== undefined && exam.overriddenScore !== originalScore;

        output += `
        <div class="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200">
             <div class="flex flex-wrap justify-between items-center mb-1 gap-x-4 gap-y-1">
                 <span class="text-sm font-medium flex items-center flex-grow min-w-0">
                    <span class="truncate" title="${exam.examId}">${exam.examId}</span>
                     ${isPdfExam ? '<span class="ml-2 text-xs bg-purple-200 text-purple-800 dark:bg-purple-700 dark:text-purple-200 px-1.5 py-0.5 rounded flex-shrink-0">PDF</span>'
                                 : '<span class="ml-2 text-xs bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-200 px-1.5 py-0.5 rounded flex-shrink-0">Online</span>'}
                    ${isOverridden ? '<span class="ml-2 text-xs bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200 px-1.5 py-0.5 rounded flex-shrink-0">Overridden</span>' : ''}
                 </span>
                 <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">${date}</span>
             </div>
             <div class="flex justify-between items-center">
                  <span class="font-semibold ${percentage >= 70 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}">
                    ${displayScore} / ${totalQuestions} (${percentage}%)
                    ${isOverridden ? `<span class="text-xs text-gray-500 dark:text-gray-400 ml-1">(Original: ${originalScore} / ${totalQuestions} - ${originalPercentage}%)</span>` : ''}
                 </span>
                 <div class="flex-shrink-0 flex space-x-2">
                      <button onclick="window.showExamDetailsWrapper(${originalIndex})" title="View Details" class="btn-secondary-small">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639l4.458-4.458a1.012 1.012 0 0 1 1.414 0l4.458 4.458a1.012 1.012 0 0 1 0 .639l-4.458 4.458a1.012 1.012 0 0 1-1.414 0l-4.458-4.458Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                          Details
                      </button>
                      <button onclick="window.confirmDeleteCompletedExam(${originalIndex})" title="Delete History Entry" class="btn-danger-small">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                          Delete
                      </button>
                 </div>
             </div>
        </div>`;
    });
    output += '</div>';
    return output;
}


export async function showExamDetails(index) { // Make async for MathJax and potential AI calls
    if (!currentSubject || !currentSubject.exam_history || !currentSubject.exam_history[index]) {
        displayContent('<p class="text-red-500 p-4">Error: Could not find exam history entry.</p>');
        return;
    }
    const exam = currentSubject.exam_history[index];
    // Use !! to ensure boolean checks, fallback gracefully for scores
    const displayScore = exam.overriddenScore ?? exam.originalScore ?? exam.score ?? 0;
    const originalScore = exam.originalScore ?? exam.score ?? 0;
    const totalQuestions = exam.totalQuestions || 0;
    const percentage = totalQuestions > 0 ? ((displayScore / totalQuestions) * 100).toFixed(1) : 0;
    const originalPercentage = totalQuestions > 0 ? ((originalScore / totalQuestions) * 100).toFixed(1) : 0;
    const date = new Date(exam.timestamp).toLocaleString();
    const isPdfExam = exam.type === 'pdf';
    const isOverriddenOverall = exam.overriddenScore !== undefined && exam.overriddenScore !== originalScore;

    let questionsHtml = '';
    if (isPdfExam) {
        // Display for PDF exams (no individual questions)
        let pdfAllocationSummary = 'Allocation data not found.';
        if (exam.allocation && typeof exam.allocation === 'object' && Object.keys(exam.allocation).length > 0) {
             pdfAllocationSummary = Object.entries(exam.allocation)
                 .sort((a,b)=>parseInt(a[0])-parseInt(b[0]))
                 .map(([chapNum, qList]) => `Chapter ${chapNum}: ${Array.isArray(qList) ? qList.length : 'N/A'} questions (${Array.isArray(qList) ? qList.join(', ') : 'Invalid'})`)
                 .join('<br>');
        } else if (exam.resultsByChapter && typeof exam.resultsByChapter === 'object') { // Fallback if allocation missing but results exist
            pdfAllocationSummary = Object.entries(exam.resultsByChapter)
                 .sort((a,b)=>parseInt(a[0])-parseInt(b[0]))
                 .map(([chapNum, chapRes]) => `Chapter ${chapNum}: ${chapRes.attempted} questions (Score: ${chapRes.correct}/${chapRes.attempted})`)
                 .join('<br>');
        }
        questionsHtml = `<div class="text-sm text-gray-600 dark:text-gray-400 italic p-4 text-center bg-gray-100 dark:bg-gray-700 rounded"><p class="mb-2">Detailed question breakdown not available for PDF results.</p><p class="text-xs text-left"><strong>Chapters & Questions Included:</strong><br>${pdfAllocationSummary}</p></div>`;
    } else if (exam.questions && exam.questions.length > 0) {
        // Handling for Online exam details
        questionsHtml = exam.questions.map((q, qIndex) => {
            let qTextDisplay = q.text || 'Text not available.';
            let imageHtml = q.image ? `<img src="${q.image}" alt="Question Image" class="max-w-xs h-auto my-2 border dark:border-gray-600 rounded" onerror="this.style.display='none'; console.error('Failed to load image: ${q.image}')">` : '';

            // Determine correctness based on original answer, not override
            const wasOriginallyCorrect = q.userAnswer === q.correctAnswer;
            const isOverriddenCorrect = !!q.isOverridden; // Ensure boolean
            const isNowCorrect = isOverriddenCorrect ? true : wasOriginallyCorrect;
            const displayCorrectnessText = isNowCorrect ? (isOverriddenCorrect ? 'Correct (Overridden)' : 'Correct ✔') : 'Incorrect ✘';
            const displayCorrectnessClass = isNowCorrect ? 'text-green-500' : 'text-red-500';

            // Override Button Logic: Show if originally wrong AND not yet overridden. Show Undo if overridden.
            const overrideButtonHtml = (!wasOriginallyCorrect && !isOverriddenCorrect)
                 ? `<button onclick="window.overrideQuestionCorrectness(${index}, ${qIndex}, true)" class="ml-3 text-xs text-blue-500 hover:underline">(Mark as Correct)</button>`
                 : (isOverriddenCorrect
                     ? `<button onclick="window.overrideQuestionCorrectness(${index}, ${qIndex}, false)" class="ml-3 text-xs text-orange-500 hover:underline">(Undo Override)</button>`
                     : ''); // Don't show button if originally correct

             let optionsDetailHtml = (q.options || []).map(opt => {
                 let optTextDisplay = opt.text || 'Text not available';
                 let correctnessClass = ''; let indicator = '';
                 let wrapperClass = 'option-wrapper';

                 // Style based on the *correct* answer
                 if (opt.letter === q.correctAnswer) {
                      correctnessClass = 'text-green-700 dark:text-green-400 font-semibold';
                      indicator = ' <span class="text-xs font-normal">(Correct Answer)</span>';
                      wrapperClass += ' correct-answer';
                  }
                 // Style based on the *user's* answer and whether it was originally correct
                 if (opt.letter === q.userAnswer && !wasOriginallyCorrect) {
                      correctnessClass = 'text-red-700 dark:text-red-400 line-through';
                      indicator += ' <span class="text-xs font-normal">(Your Incorrect Answer)</span>';
                      wrapperClass += ' incorrect-user-answer';
                  } else if (opt.letter === q.userAnswer && wasOriginallyCorrect) {
                       indicator += ' <span class="text-xs font-normal">(Your Answer)</span>';
                       wrapperClass += ' correct-user-answer';
                  }
                 return `<li class="${wrapperClass} ${correctnessClass}"><span class="font-medium">${opt.letter}.</span><span class="option-text-container ml-1">${optTextDisplay}</span>${indicator}</li>`;
             }).join('');

            // Buttons: AI, Feedback, Admin Edit
            const aiButtonHtml = `<button onclick="window.triggerAIExplanation(${index}, ${qIndex})" class="text-xs px-2 py-1 border border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-50 dark:hover:bg-purple-900 transition-colors mr-2">Explain (AI)</button>`;
            const feedbackButtonHtml = `<button onclick="window.promptFeedback(${index}, ${qIndex})" class="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Report Issue</button>`;
            // Show admin button only if user is admin
            const adminEditAnswerButtonHtml = (currentUser?.uid === ADMIN_UID)
                ? `<button onclick="window.promptAdminEditAnswer('${q.id}')" class="ml-3 text-xs text-blue-500 hover:underline">(Admin: Edit Ans)</button>`
                : '';

            // Container for MathJax processing
            return `
            <div class="p-4 border dark:border-gray-600 rounded-lg mb-3 bg-white dark:bg-gray-800 shadow-sm">
                <div class="flex justify-between items-start mb-2 flex-wrap gap-y-2">
                     <p class="font-semibold flex-grow">Question ${qIndex + 1} (Ch.${q.chapter} - ${q.number}) <span class="font-bold ${displayCorrectnessClass}">${displayCorrectnessText}</span> ${overrideButtonHtml}</p>
                     <div class="flex-shrink-0 flex items-center">${aiButtonHtml} ${feedbackButtonHtml}</div>
                </div>
                ${imageHtml}
                 <div class="prose dark:prose-invert max-w-none text-sm mb-3 question-text-container">${qTextDisplay}</div>
                <p class="text-sm font-medium mt-2">Options:</p>
                 <ul class="list-none text-sm mt-1 space-y-1">${optionsDetailHtml || '<li>No options recorded.</li>'}</ul>
                <p class="text-sm mt-2">Your Answer: <strong class="font-medium">${q.userAnswer || 'N/A'}</strong></p>
                <p class="text-sm">Correct Answer: <strong class="font-medium">${q.correctAnswer || 'N/A'}</strong> ${adminEditAnswerButtonHtml}</p>
                <div id="ai-explanation-${qIndex}" class="mt-2 text-sm text-gray-600 dark:text-gray-400 border-t pt-2 dark:border-gray-700 hidden"></div> <!-- AI Explanation Area -->
                <div id="feedback-form-${qIndex}" class="mt-2 hidden"></div> <!-- Feedback Form Area -->
            </div>`;
        }).join('');
    } else {
        questionsHtml = '<p class="text-sm text-gray-600 dark:text-gray-400 italic p-4 text-center bg-gray-100 dark:bg-gray-700 rounded">No question details found for this online exam.</p>';
    }

    // Construct chapter summary HTML
    let chapterSummaryHtml = '';
    if (exam.resultsByChapter && Object.keys(exam.resultsByChapter).length > 0) {
        chapterSummaryHtml = Object.entries(exam.resultsByChapter)
             .sort((a,b)=>parseInt(a[0])-parseInt(b[0]))
             .map(([chapNum, chapRes]) => {
                const chapPercentage = chapRes.attempted > 0 ? ((chapRes.correct / chapRes.attempted) * 100).toFixed(1) : 0;
                // Find if any question in this chapter was overridden for this exam (only for online exams)
                const chapterOverridden = !isPdfExam && exam.questions?.some(q => q.chapter == chapNum && q.isOverridden);
                return `<li class="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                           <span>Chapter ${chapNum} ${chapterOverridden ? '<span class="text-xs text-yellow-600">(Overridden)</span>' : ''}</span>
                           <span class="font-medium ${chapRes.wrong > 0 ? 'text-red-500' : 'text-green-500'}">${chapRes.correct} / ${chapRes.attempted} (${chapPercentage}%)</span>
                        </li>`;
            }).join('');
        chapterSummaryHtml = `<h3 class="text-md font-semibold mb-2 mt-5">Chapter Performance</h3><ul class="space-y-1 mb-5">${chapterSummaryHtml}</ul>`;
    }

    // Construct the final HTML to display
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

    // Crucially, render MathJax *after* the HTML is in the DOM
    const questionsContainer = document.getElementById('exam-details-questions-container');
    if (questionsContainer) {
         await renderMathIn(questionsContainer);
     } else {
         console.error("Could not find questions container for MathJax rendering.");
     }
}


// --- Override Function ---
export async function overrideQuestionCorrectness(examIndex, questionIndex, markAsCorrect) {
    if (!currentUser || !currentSubject || !data || !currentSubject.exam_history || !currentSubject.exam_history[examIndex] || !currentSubject.exam_history[examIndex].questions) {
         alert("Error: Cannot override answer. Exam data missing or invalid.");
         return;
     }
     const exam = currentSubject.exam_history[examIndex];
     const question = exam.questions[questionIndex];

     if (!question) {
         alert("Error: Question not found at the specified index.");
         return;
     }

     // Prevent overriding if already correct originally and trying to mark correct
     if (question.userAnswer === question.correctAnswer && markAsCorrect) {
         console.log("Cannot mark an originally correct answer as correct again.");
         return;
     }

     // Update the question state
     question.isOverridden = markAsCorrect;

     // Recalculate the score for the exam based on override status
     let newScore = 0;
     exam.questions.forEach(q => {
         const originallyCorrect = q.userAnswer === q.correctAnswer;
         if (q.isOverridden || originallyCorrect) { // It counts if overridden OR originally correct
             newScore++;
         }
     });

     // Update exam scores - ensure originalScore is set first if needed
     exam.originalScore = exam.originalScore ?? exam.score ?? 0; // Ensure original score exists
     exam.overriddenScore = newScore; // Set the new score based on overrides

     console.log(`Override applied: Q${questionIndex+1} marked as ${markAsCorrect}. New score: ${newScore} (Original: ${exam.originalScore})`);

     // Save the updated data
     showLoading("Saving override...");
     try {
         await saveUserData(currentUser.uid);
         hideLoading();
         // Refresh the details view to show the change
         await showExamDetails(examIndex); // Reload the details view
     } catch (error) {
         console.error("Failed to save override:", error);
         alert("Error saving the change: " + error.message);
         hideLoading();
         // Attempt to revert local state? (Might be complex, better to rely on refresh)
         // For simplicity, just log the failure. A full refresh might be needed.
     }
}

// --- Feedback Functions ---
export function promptFeedback(examIndex, questionIndex) {
     if (!currentSubject || !currentSubject.exam_history || !currentSubject.exam_history[examIndex] || !currentSubject.exam_history[examIndex].questions) return;
     const exam = currentSubject.exam_history[examIndex];
     const question = exam.questions[questionIndex];
     if (!question) return;

     // Simple prompt for feedback
     const feedbackText = prompt(`Enter feedback/report issue for Question ${questionIndex+1} (Ch ${question.chapter} - ${question.number}):\n\n"${question.text.substring(0, 100)}..."`);

     if (feedbackText && feedbackText.trim()) {
         handleFeedbackSubmission(exam.subjectId, question.id, feedbackText.trim());
     } else if (feedbackText !== null) { // Only show alert if user didn't click cancel
          alert("Feedback cannot be empty.");
     }
}

// Added currentUser check before calling submitFeedback
async function handleFeedbackSubmission(subjectId, questionId, feedbackText) {
    // Check if user is logged in BEFORE attempting to submit
    if (!currentUser) { // Check the currentUser imported from state.js
        alert("You must be logged in to submit feedback.");
        return;
    }
    showLoading("Submitting feedback...");
    // Pass the validated currentUser object as the second argument
    const success = await submitFeedback(
        {
            subjectId: subjectId,
            questionId: questionId,
            feedbackText: feedbackText
        },
        currentUser // Pass the user object here
    );
    hideLoading();
    if (success) {
        alert("Feedback submitted successfully. Thank you!");
    }
    // Failure alert is handled within submitFeedback
}

// --- AI Trigger ---
// This function is assigned to window.triggerAIExplanation in script.js
export async function triggerAIExplanationWrapper(examIndex, questionIndex) {
    const explanationAreaId = `ai-explanation-${questionIndex}`;
    const explanationArea = document.getElementById(explanationAreaId);
    if (!explanationArea) {
        console.error(`Explanation area ${explanationAreaId} not found.`);
        return;
    }

    const displayMessage = (html) => {
        explanationArea.innerHTML = html;
        explanationArea.classList.remove('hidden');
    };

    if (!currentSubject || !currentSubject.exam_history || !currentSubject.exam_history[examIndex] || !currentSubject.exam_history[examIndex].questions) {
        displayMessage(`<p class="text-red-500">Error: Could not load question data for AI.</p>`);
        return;
     }
    const exam = currentSubject.exam_history[examIndex];
    const question = exam.questions[questionIndex];
    if (!question) {
         displayMessage(`<p class="text-red-500">Error: Question not found.</p>`);
         return;
    }

    displayMessage(`<div class="flex items-center justify-center space-x-2"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p>Generating AI explanation...</p></div>`);

    try {
        const aiData = {
            questionText: question.text,
            options: question.options,
            correctAnswer: question.correctAnswer,
            userAnswer: question.userAnswer,
            isUserCorrect: question.userAnswer === question.correctAnswer // Use original correctness
        };

        const explanationHtml = await getAIExplanation(aiData); // Call the function from ai_integration.js

        explanationArea.innerHTML = `<p class="font-semibold text-purple-700 dark:text-purple-300">AI Explanation:</p><div class="prose prose-sm dark:prose-invert max-w-none mt-1">${explanationHtml}</div>`;
        await renderMathIn(explanationArea); // Render MathJax

    } catch (error) {
        console.error("Error getting/displaying AI explanation:", error);
        // Error should ideally be caught and formatted within getAIExplanation, but catch unexpected issues
        displayMessage(`<p class="text-red-500">An unexpected error occurred while getting the explanation.</p>`);
    }
}


// --- Admin Answer Edit Placeholder ---
// This function is assigned to window.promptAdminEditAnswer in script.js
export function promptAdminEditAnswerPlaceholder(questionId) {
     if (currentUser?.uid !== ADMIN_UID) {
         alert("Permission denied.");
         return;
     }
     alert(`Admin Function: Edit Answer for ${questionId}\n\nNOTE: Currently, answers are derived from the Markdown file. To permanently change an answer, please edit the corresponding .md file for this subject and reload the application data.\n\n(Future enhancement could allow direct database editing if questions/answers were stored there).`);
}


// --- Deletion Functions ---
export function confirmDeletePendingExam(index) {
    if (!currentSubject || !currentSubject.pending_exams || !currentSubject.pending_exams[index]) return;
    const exam = currentSubject.pending_exams[index];
     const confirmation = confirm(`Delete PENDING exam "${exam.id}"?\n\nThis exam's results have NOT been entered. Deleting it will simply remove it from the pending list. Questions WILL NOT be returned to the available pool.`);
    if (confirmation) deletePendingExam(index);
}

export async function deletePendingExam(index) {
     if (!currentUser || !currentSubject || !data) { alert("Cannot delete: State missing."); return; }
     showLoading("Deleting Pending Exam...");
    await new Promise(resolve => setTimeout(resolve, 100)); // UI update time
    try {
         const exam = currentSubject.pending_exams?.[index];
         if (!exam) throw new Error("Pending exam not found at index.");
         const examId = exam.id; // Get ID before splicing

         currentSubject.pending_exams.splice(index, 1); // Remove from array
         await saveUserData(currentUser.uid); // Save the change

         hideLoading();
         showExamsDashboard(); // Refresh view

         // Success feedback
         const successMsg = `<div class="bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-200 p-4 rounded-md mb-4 animate-fade-in fixed top-16 right-4 z-50 shadow-lg"><p class="font-medium">Pending exam ${examId} deleted.</p></div>`;
        const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsg; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 4000);
    } catch (error) {
         console.error("Error deleting pending exam:", error);
         alert("Failed to delete pending exam: " + error.message);
         hideLoading();
         showExamsDashboard(); // Still refresh view on error
    }
}

export function confirmDeleteCompletedExam(index) {
    if (!currentSubject || !currentSubject.exam_history || !currentSubject.exam_history[index]) return;
    const exam = currentSubject.exam_history[index];
    const confirmation = confirm(`Permanently delete history for COMPLETED exam "${exam.examId}"?\n\nWARNING: This action cannot be undone. Questions from this exam WILL become available again.`);
    if (confirmation) deleteCompletedExam(index);
}

export async function deleteCompletedExam(index) {
    if (!currentUser || !currentSubject || !data || !currentSubject.exam_history || !currentSubject.chapters) {
        alert("Error deleting history: Critical data missing.");
        hideLoading();
        return;
    }
    showLoading("Deleting Exam History...");
    await new Promise(resolve => setTimeout(resolve, 100)); // UI update time

     try {
         const examToDelete = currentSubject.exam_history[index];
         if (!examToDelete) throw new Error("Completed exam not found at index.");
         const examId = examToDelete.examId; // Get ID before splicing

         let questionsToReadd = [];
         let chaptersDataModified = false;

         // Determine which questions were in the exam to re-add them
         if (examToDelete.type === 'online' && examToDelete.questions) {
             questionsToReadd = examToDelete.questions.map(q => ({ chapter: q.chapter, number: q.number }));
         } else if (examToDelete.type === 'pdf' && examToDelete.allocation) {
              Object.entries(examToDelete.allocation).forEach(([chapNum, qNumbers]) => {
                  if (qNumbers && Array.isArray(qNumbers)) {
                      qNumbers.forEach(qNum => questionsToReadd.push({ chapter: chapNum, number: qNum }));
                  }
              });
         } else {
             console.warn(`Exam ${examToDelete.examId} type (${examToDelete.type}) or data structure unknown for re-adding questions.`);
         }

         // Re-add questions to the available pool for relevant chapters
         questionsToReadd.forEach(({ chapter: chapNum, number: qNum }) => {
              // Ensure chapter and question number are valid before proceeding
              if (!chapNum || isNaN(parseInt(chapNum)) || !qNum || isNaN(parseInt(qNum))) {
                  console.warn(`Invalid chapter (${chapNum}) or question number (${qNum}) found during re-add process for exam ${examId}. Skipping.`);
                  return;
              }
              const globalChap = currentSubject.chapters[chapNum];
              if (globalChap && globalChap.available_questions && Array.isArray(globalChap.available_questions)) {
                   // Add only if not already present (safety check)
                  if (!globalChap.available_questions.includes(qNum)) {
                       globalChap.available_questions.push(qNum);
                       chaptersDataModified = true;
                  }
              } else {
                  console.error(`Chapter ${chapNum} or its available_questions list missing when trying to re-add Q ${qNum}.`);
              }
         });

         // Sort available questions lists if modified
         if (chaptersDataModified) {
              Object.values(currentSubject.chapters).forEach(chap => {
                   if (chap.available_questions && Array.isArray(chap.available_questions)) {
                       chap.available_questions.sort((a, b) => a - b);
                   }
              });
         }

         // Remove the exam from history
         currentSubject.exam_history.splice(index, 1);

         // Save all changes
         await saveUserData(currentUser.uid);
         console.log(`Exam history ${examId} deleted. Questions (${questionsToReadd.length}) re-added to available pool. Data saved.`);

         hideLoading();
         showExamsDashboard(); // Refresh view

         // Success feedback
         const successMsgHtml = `<div class="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 rounded-md mb-4 animate-fade-in fixed top-16 right-4 z-50 shadow-lg"><p class="font-medium">Exam ${examId} history deleted.</p><p class="text-xs">Associated questions are available again.</p></div>`;
         const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 5000);

     } catch (error) {
         console.error("Error deleting completed exam history:", error);
         alert("Failed to delete exam history: " + error.message);
         hideLoading();
         showExamsDashboard(); // Still refresh view on error
     }
}

// Wrapper for async showExamDetails
window.showExamDetailsWrapper = function(index) {
    showExamDetails(index).catch(err => {
        console.error("Error showing exam details:", err);
        displayContent('<p class="text-red-500 p-4">Failed to load exam details. See console.</p>');
    });
};