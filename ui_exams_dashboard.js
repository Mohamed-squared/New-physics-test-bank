// --- START OF FILE ui_exams_dashboard.js ---

// ui_exams_dashboard.js

import { currentSubject, currentUser, data, setData, db } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, renderMathIn, escapeHtml } from './utils.js';
import { saveUserData, submitFeedback } from './firebase_firestore.js';
import { showManageSubjects } from './ui_subjects.js';
import { ADMIN_UID } from './config.js';
// Import NEW exam storage functions
import { getExamHistory, getExamDetails, showExamReviewUI } from './exam_storage.js';
import { generateExplanation } from './ai_exam_marking.js';

// --- Exams Dashboard & Results Management ---

// This dashboard will now PRIMARILY show history from the userExams collection.
// The PDF pending list from appData remains for entering results for older PDF exams.

export async function showExamsDashboard() {
     if (!currentUser) {
         displayContent('<p class="text-yellow-500 p-4">Please log in to view exams.</p>');
         setActiveSidebarLink('showExamsDashboard', 'testgen-dropdown-content');
         return;
     }
    // Filter ID depends on whether we're showing TestGen or Course Exams
    // For now, this dashboard is linked from TestGen, so filter by currentSubject
    const subjectId = currentSubject?.id || null;
    const subjectName = currentSubject?.name || 'All Standard Tests'; // Show subject name or generic

    showLoading("Loading exam history...");

    // Fetch history from the new centralized store, filtered by SUBJECT for TestGen
    // (Course exams are shown via the course dashboard)
    const completedExams = await getExamHistory(currentUser.uid, subjectId, 'subject');
    hideLoading();

    const pendingHtml = showEnterResults(); // Still shows pending PDF exams from appData
    const completedListHtml = renderCompletedExamsList(completedExams);

    // NEW: Reset Button Section
    const resetButtonHtml = currentSubject ? `
         <div class="mt-2 mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-300 dark:border-yellow-700 text-center">
             <p class="text-sm text-yellow-800 dark:text-yellow-200 mb-2">If MCQs seem missing after deleting old exams, you can reset the available pool for this subject.</p>
             <button onclick="window.resetAvailableQuestionsForSubject()" class="btn-warning-small text-xs">
                 Reset All Available Questions for ${escapeHtml(currentSubject.name)}
             </button>
         </div>
         ` : '';

    const html = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4">
            <h2 class="text-xl font-semibold mb-4 text-primary-600 dark:text-primary-400">Exams Dashboard (${escapeHtml(subjectName)})</h2>
            ${resetButtonHtml}
            ${pendingHtml}
            ${completedListHtml}
            </div>`;
    displayContent(html);
    setActiveSidebarLink('showExamsDashboard', 'testgen-dropdown-content');
}

// --- PDF Exam Result Entry ---
// This function generates HTML, it doesn't display it directly
function showEnterResults() {
    if (!currentSubject || !currentSubject.pending_exams) {
         return '<p class="text-sm text-gray-500 dark:text-gray-400 mt-4">No subject selected or no pending exam data.</p>';
    }
    const pending_exams = (currentSubject.pending_exams || []).filter(exam => !exam.results_entered);

    if (pending_exams.length === 0) {
         return '<p class="text-sm text-gray-500 dark:text-gray-400 mt-4">No pending PDF exams found.</p>';
    }

    let output = '<h3 class="text-lg font-semibold mb-3 mt-6 text-yellow-600 dark:text-yellow-400">Pending PDF Exams</h3><div class="space-y-2">';
    pending_exams.forEach((exam, index) => { // Use index directly here
        const originalIndex = index; // Index within the filtered pending_exams array used for display/actions
        if (!exam || !exam.id) {
             console.error(`Invalid pending exam data at index ${index}:`, exam);
             return;
        }
        const date = exam.timestamp ? new Date(exam.timestamp).toLocaleDateString() : 'N/A';
        const qCount = exam.totalQuestions || 'Unknown';
        output += `
        <div class="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 flex flex-wrap justify-between items-center gap-2">
             <div class="flex-grow min-w-0">
                 <span class="text-sm font-medium truncate block" title="${escapeHtml(exam.id)}">${escapeHtml(exam.id)}</span>
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

export function enterResultsForm(pendingIndex) {
    // This function remains largely the same as it deals with the OLD pending exam structure in appData
    const pending_exams_filtered = (currentSubject?.pending_exams || []).filter(exam => !exam.results_entered);
    const exam = pending_exams_filtered[pendingIndex];

    if (!currentSubject || !exam) {
         displayContent('<p class="text-red-500 p-4">Error: Could not find the selected pending exam.</p>');
         setActiveSidebarLink('showExamsDashboard', 'testgen-dropdown-content');
         return;
     }
    // Find the original index in the full pending_exams array for submission later
    const originalFullIndex = currentSubject.pending_exams.findIndex(p => p.id === exam.id && p.timestamp === exam.timestamp);
     if (originalFullIndex === -1) {
          displayContent('<p class="text-red-500 p-4">Error: Could not match pending exam to original list.</p>');
          setActiveSidebarLink('showExamsDashboard', 'testgen-dropdown-content');
          return;
     }

    const detailedAllocation = exam.allocation || {}; // MCQ allocation
    const problemAllocation = exam.problemAllocation || []; // Problem allocation

    if (Object.keys(detailedAllocation).length === 0 && problemAllocation.length === 0) {
         displayContent('<p class="text-red-500 p-4">Error: Invalid allocation data for this exam.</p><button onclick="window.showExamsDashboard()" class="btn-secondary mt-2">Back</button>');
         setActiveSidebarLink('showExamsDashboard', 'testgen-dropdown-content');
         return;
     }
    let formHtml = `<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><h2 class="text-xl font-semibold mb-4">Enter PDF Exam Results</h2><p class="font-medium mb-4">Exam ID: ${escapeHtml(exam.id)}</p><div class="space-y-4">`;
    let chaptersWithInputs = new Set(); // Use a Set to store unique chapter numbers
    let totalQuestionsInForm = 0;

    // Inputs for MCQs based on exam.allocation
    const sortedMcqChaps = Object.keys(detailedAllocation).sort((a, b) => parseInt(a) - parseInt(b));
    for (let chap_num of sortedMcqChaps) {
        const questionsInChapter = detailedAllocation[chap_num];
        const n = Array.isArray(questionsInChapter) ? questionsInChapter.length : 0;
        if (n > 0) {
             chaptersWithInputs.add(chap_num); // Add chapter to the set
             totalQuestionsInForm += n;
             formHtml += `<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600"><label for="mcq-wrong-${chap_num}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chapter ${chap_num} (MCQs): Number <strong class="text-red-600 dark:text-red-400">WRONG</strong> (out of ${n} MCQs)</label><input id="mcq-wrong-${chap_num}" type="number" min="0" max="${n}" value="0" required inputmode="numeric" pattern="[0-9]*" class="pdf-result-input border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"></div>`;
        } else { console.warn(`Chapter ${chap_num} in PDF exam ${exam.id} has invalid or empty MCQ allocation:`, questionsInChapter); }
    }

    // Inputs for Problems based on exam.problemAllocation (count per chapter)
    const problemsByChapter = problemAllocation.reduce((acc, prob) => {
        acc[prob.chapter] = (acc[prob.chapter] || 0) + 1;
        return acc;
    }, {});
    const sortedProblemChaps = Object.keys(problemsByChapter).sort((a, b) => parseInt(a) - parseInt(b));
     for (let chap_num of sortedProblemChaps) {
         const n_prob = problemsByChapter[chap_num];
         if (n_prob > 0) {
             chaptersWithInputs.add(chap_num); // Add chapter to the set
             totalQuestionsInForm += n_prob;
             formHtml += `<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600"><label for="prob-wrong-${chap_num}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chapter ${chap_num} (Problems): Number <strong class="text-red-600 dark:text-red-400">WRONG</strong> (out of ${n_prob} Problems)</label><input id="prob-wrong-${chap_num}" type="number" min="0" max="${n_prob}" value="0" required inputmode="numeric" pattern="[0-9]*" class="pdf-result-input border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"></div>`;
         }
     }

     const chaptersWithInputsArray = Array.from(chaptersWithInputs).sort((a, b) => parseInt(a) - parseInt(b));
     if (chaptersWithInputsArray.length === 0) { formHtml += '<p class="text-yellow-500">Error: No valid question allocations found for this exam.</p>'; }
     else { formHtml += `<p class="text-sm text-gray-600 dark:text-gray-400 mt-4">Total questions in this exam: ${totalQuestionsInForm}</p><input type="hidden" id="total-questions-in-form" value="${totalQuestionsInForm}">`; }

    // Pass the ORIGINAL index from the full list and the array of chapters with inputs
    formHtml += `</div><div class="mt-6 flex space-x-3"><button onclick="window.submitPendingResults(${originalFullIndex}, ${JSON.stringify(chaptersWithInputsArray)})" ${chaptersWithInputsArray.length === 0 ? 'disabled' : ''} class="flex-1 btn-primary ${chaptersWithInputsArray.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>Submit Results</button><button onclick="window.showExamsDashboard()" class="flex-1 btn-secondary"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>Cancel</button></div></div>`;
    displayContent(formHtml);
    setActiveSidebarLink('showExamsDashboard', 'testgen-dropdown-content');
}
window.enterResultsForm = enterResultsForm; // Assign to window

export async function submitPendingResults(originalFullIndex, chap_nums_with_inputs) {
    // This function remains largely the same, saving results back to appData for legacy PDF exams
     if (!currentUser || !currentSubject || !data || !currentSubject.pending_exams || !currentSubject.pending_exams[originalFullIndex] || !currentSubject.chapters) { alert("Error submitting results: Critical data missing."); hideLoading(); return; }
     showLoading("Saving PDF Results...");
     await new Promise(resolve => setTimeout(resolve, 100));
     try {
         const exam = currentSubject.pending_exams[originalFullIndex];
         const chapters = currentSubject.chapters;
         const detailedAllocation = exam.allocation || {}; // MCQ allocation
         const problemAllocation = exam.problemAllocation || []; // Problem allocation

         let allInputsValid = true;
         let chapterResults = {}; // Store results per chapter { attempted: n, wrong: w, correct: c }
         let totalAttemptedInExam = 0;
         let totalWrongInExam = 0;
         let chaptersDataModified = false;

         // Process inputs for each chapter that had questions
         for (let chap_num of chap_nums_with_inputs) {
             let attempted_mcq = detailedAllocation[chap_num]?.length || 0;
             let attempted_prob = problemAllocation.filter(p => String(p.chapter) === chap_num).length; // Ensure chapter comparison is string vs string
             let total_attempted_chap = attempted_mcq + attempted_prob;
             let wrong_mcq = 0;
             let wrong_prob = 0;

             // Get MCQ wrong count
             const mcqInputElement = document.getElementById(`mcq-wrong-${chap_num}`);
             if (mcqInputElement) {
                 wrong_mcq = parseInt(mcqInputElement.value);
                 if (isNaN(wrong_mcq) || wrong_mcq < 0 || wrong_mcq > attempted_mcq) {
                     alert(`Invalid input for Chapter ${chap_num} MCQs. Must be between 0 and ${attempted_mcq}.`); mcqInputElement.classList.add('border-red-500'); mcqInputElement.focus(); allInputsValid = false; break;
                 } else { mcqInputElement.classList.remove('border-red-500'); }
             } else if (attempted_mcq > 0) {
                 console.warn(`Input field mcq-wrong-${chap_num} not found but MCQs were allocated.`);
             }

             // Get Problem wrong count
             const probInputElement = document.getElementById(`prob-wrong-${chap_num}`);
             if (probInputElement) {
                 wrong_prob = parseInt(probInputElement.value);
                 if (isNaN(wrong_prob) || wrong_prob < 0 || wrong_prob > attempted_prob) {
                     alert(`Invalid input for Chapter ${chap_num} Problems. Must be between 0 and ${attempted_prob}.`); probInputElement.classList.add('border-red-500'); probInputElement.focus(); allInputsValid = false; break;
                 } else { probInputElement.classList.remove('border-red-500'); }
             } else if (attempted_prob > 0) {
                  console.warn(`Input field prob-wrong-${chap_num} not found but problems were allocated.`);
             }

             const total_wrong_chap = wrong_mcq + wrong_prob;
             totalAttemptedInExam += total_attempted_chap;
             totalWrongInExam += total_wrong_chap;

             chapterResults[chap_num] = {
                 attempted: total_attempted_chap,
                 wrong: total_wrong_chap,
                 correct: total_attempted_chap - total_wrong_chap
             };

             // --- Update Global Chapter Stats (only for MCQs from PDF flow) ---
             const globalChap = chapters[chap_num];
             if (globalChap) {
                  // Update total attempted/wrong only for MCQs in this legacy flow
                  if (attempted_mcq > 0) {
                      globalChap.total_attempted = (globalChap.total_attempted || 0) + attempted_mcq;
                      globalChap.total_wrong = (globalChap.total_wrong || 0) + wrong_mcq;
                      globalChap.mistake_history = globalChap.mistake_history || [];
                      globalChap.mistake_history.push(wrong_mcq); // Track MCQ wrong count
                      if (globalChap.mistake_history.length > 20) globalChap.mistake_history.shift();
                      globalChap.consecutive_mastery = (wrong_mcq === 0 && attempted_mcq > 0) ? (globalChap.consecutive_mastery || 0) + 1 : 0;
                      chaptersDataModified = true;

                      // Remove selected MCQs from available list
                      const mcqsToRemove = detailedAllocation[chap_num] || [];
                       if (globalChap.available_questions && Array.isArray(globalChap.available_questions) && Array.isArray(mcqsToRemove)) {
                          mcqsToRemove.forEach(qNum => {
                              // Ensure qNum is compared as number if available_questions are numbers
                              const qNumInt = parseInt(qNum);
                              const qIndexInAvailable = globalChap.available_questions.indexOf(qNumInt);
                              if (qIndexInAvailable > -1) {
                                   globalChap.available_questions.splice(qIndexInAvailable, 1);
                              } else {
                                  console.warn(`MCQ Q ${qNumInt} (Ch ${chap_num}) from PDF allocation not found in available list.`);
                              }
                          });
                          globalChap.available_questions.sort((a, b) => a - b);
                       } else { console.error(`Chapter ${chap_num} data or available_questions missing for MCQ removal.`); }
                  }
             } else { console.error(`Global chapter data for Chapter ${chap_num} not found.`); }
             // Note: We don't update global stats for problems here, as they weren't AI marked.
         }

         if (!allInputsValid) { hideLoading(); return; }

         const finalScore = totalAttemptedInExam - totalWrongInExam;
         // Create history entry in the OLD location (appData)
         const pdfExamResult = {
             examId: exam.id,
             subjectId: currentSubject.id,
             timestamp: exam.timestamp || new Date().toISOString(),
             durationMinutes: null,
             type: 'pdf',
             questions: null, // No question details stored for old PDF flow
             allocation: detailedAllocation, // Store MCQ allocation
             problemAllocation: problemAllocation, // Store problem allocation
             score: finalScore,
             originalScore: finalScore, // Store initial score
             totalQuestions: totalAttemptedInExam,
             resultsByChapter: chapterResults // Store chapter breakdown
         };

         currentSubject.exam_history = currentSubject.exam_history || [];
         currentSubject.exam_history.push(pdfExamResult);
         // Remove from pending list using the original index
         currentSubject.pending_exams.splice(originalFullIndex, 1);

         await saveUserData(currentUser.uid, data); // Save the entire updated appData
         console.log("PDF results submitted to appData, stats updated, data saved.");
         hideLoading();
         showExamsDashboard(); // Refresh dashboard
         const successMsgHtml = `<div class="bg-green-100 dark:bg-green-900 border-l-4 border-green-500 text-green-700 dark:text-green-200 p-4 rounded-md mb-4 animate-fade-in fixed top-16 right-4 z-50 shadow-lg"><p class="font-medium">Results for PDF exam ${escapeHtml(exam.id)} entered successfully!</p></div>`;
         const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 5000);
     } catch(error) {
         console.error("Error submitting PDF results:", error);
         alert("Failed to submit results: " + error.message);
         hideLoading();
         showExamsDashboard();
     }
}
window.submitPendingResults = submitPendingResults; // Assign to window


// --- Completed Exams ---
function showCompletedExams() {
    // This displays exams from appData.subjects[id].exam_history (for standard tests)
    if (!currentSubject || !currentSubject.exam_history) { return '<p class="text-sm text-gray-500 dark:text-gray-400 mt-4">No exam history data available.</p>'; }
    const completed_exams = [...(currentSubject.exam_history || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (completed_exams.length === 0) { return '<p class="text-sm text-gray-500 dark:text-gray-400 mt-4">No completed test history found.</p>'; }
    let output = '<h3 class="text-lg font-semibold mb-3 mt-6 text-green-600 dark:text-green-400">Completed Exam History (Standard Tests)</h3><div class="space-y-2">';
    completed_exams.forEach((exam) => {
        const originalIndex = currentSubject.exam_history.findIndex(h => h.examId === exam.examId && h.timestamp === exam.timestamp);
        if (originalIndex < 0) { console.error(`Cannot find original index for completed exam ${exam.examId}`); return; }
        const displayScore = exam.overriddenScore ?? exam.originalScore ?? exam.score ?? 0; const originalScore = exam.originalScore ?? exam.score ?? 0; const totalQuestions = exam.totalQuestions || 0; const percentage = totalQuestions > 0 ? ((displayScore / totalQuestions) * 100).toFixed(1) : 0; const originalPercentage = totalQuestions > 0 ? ((originalScore / totalQuestions) * 100).toFixed(1) : 0; const date = new Date(exam.timestamp).toLocaleString(); const isPdfExam = exam.type === 'pdf'; const isOverridden = exam.overriddenScore !== undefined && exam.overriddenScore !== originalScore;
        output += `
        <div class="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200">
             <div class="flex flex-wrap justify-between items-center mb-1 gap-x-4 gap-y-1"><span class="text-sm font-medium flex items-center flex-grow min-w-0"><span class="truncate" title="${escapeHtml(exam.examId)}">${escapeHtml(exam.examId)}</span>${isPdfExam ? '<span class="ml-2 text-xs bg-purple-200 text-purple-800 dark:bg-purple-700 dark:text-purple-200 px-1.5 py-0.5 rounded flex-shrink-0">PDF</span>' : '<span class="ml-2 text-xs bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-200 px-1.5 py-0.5 rounded flex-shrink-0">Online</span>'}${isOverridden ? '<span class="ml-2 text-xs bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200 px-1.5 py-0.5 rounded flex-shrink-0">Overridden</span>' : ''}</span><span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">${date}</span></div>
             <div class="flex justify-between items-center"><span class="font-semibold ${percentage >= 70 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}">${displayScore} / ${totalQuestions} (${percentage}%)${isOverridden ? `<span class="text-xs text-gray-500 dark:text-gray-400 ml-1">(Original: ${originalScore} / ${totalQuestions} - ${originalPercentage}%)</span>` : ''}</span><div class="flex-shrink-0 flex space-x-2"><button onclick="window.showExamDetailsWrapper(${originalIndex})" title="View Details" class="btn-secondary-small"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639l4.458-4.458a1.012 1.012 0 0 1 1.414 0l4.458 4.458a1.012 1.012 0 0 1 0 .639l-4.458 4.458a1.012 1.012 0 0 1-1.414 0l-4.458-4.458Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>Details</button><button onclick="window.confirmDeleteCompletedExam(${originalIndex})" title="Delete History Entry" class="btn-danger-small"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>Delete</button></div></div>
        </div>`;
    });
    output += '</div>';
    return output;
}

export async function showExamDetails(index) {
    // This shows details for exams from appData.subjects[id].exam_history
    if (!currentSubject || !currentSubject.exam_history || !currentSubject.exam_history[index]) {
        displayContent('<p class="text-red-500 p-4">Error: Could not find exam history entry.</p><button onclick="window.showExamsDashboard()" class="btn-secondary mt-2">Back</button>');
        setActiveSidebarLink('showExamsDashboard');
        return;
    }
    const exam = currentSubject.exam_history[index];
    const displayScore = exam.overriddenScore ?? exam.originalScore ?? exam.score ?? 0;
    const originalScore = exam.originalScore ?? exam.score ?? 0;
    const totalQuestions = exam.totalQuestions || (exam.questions ? exam.questions.length : 0); // Calculate total if needed
    const percentage = totalQuestions > 0 ? ((displayScore / totalQuestions) * 100).toFixed(1) : 0;
    const originalPercentage = totalQuestions > 0 ? ((originalScore / totalQuestions) * 100).toFixed(1) : 0;
    const date = new Date(exam.timestamp).toLocaleString();
    const isPdfExam = exam.type === 'pdf';
    const isOverriddenOverall = exam.overriddenScore !== undefined && exam.overriddenScore !== originalScore;

    let questionsHtml = '';
    let chapterSummaryHtml = '';

    if (isPdfExam) {
        questionsHtml = '<p class="text-sm italic p-4 text-center">Question details not available for PDF exams.</p>';
        if (exam.resultsByChapter && Object.keys(exam.resultsByChapter).length > 0) {
            chapterSummaryHtml = `<h3 class="text-md font-semibold mb-2 mt-4">Results by Chapter (PDF Exam)</h3><ul class="space-y-1 list-none p-0">`;
            Object.entries(exam.resultsByChapter).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).forEach(([chapNum, chapRes]) => {
                const perc = chapRes.attempted > 0 ? ((chapRes.correct / chapRes.attempted) * 100).toFixed(1) : 0;
                const color = chapRes.wrong > 0 ? 'text-red-500' : 'text-green-500';
                chapterSummaryHtml += `<li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"><span class="font-medium">Chapter ${chapNum}</span><span class="font-semibold ${color}">${chapRes.correct}/${chapRes.attempted} (${perc}%)</span></li>`;
            });
            chapterSummaryHtml += `</ul>`;
        }
    } else if (exam.questions && exam.questions.length > 0) {
        exam.questions.forEach((q, qIndex) => {
            const isCorrect = q.userAnswer === q.correctAnswer;
            const isOverridden = q.isOverridden === true; // Explicitly check for true
            const displayCorrect = isOverridden ? true : isCorrect; // Show as correct if overridden true OR originally correct
            const statusClass = displayCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-red-500 bg-red-50 dark:bg-red-900/30';
            const statusIcon = displayCorrect ? `<svg class="w-5 h-5 text-green-500 flex-shrink-0 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>` : `<svg class="w-5 h-5 text-red-500 flex-shrink-0 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" /></svg>`;
            const imageHtml = q.image ? `<img src="${q.image}" alt="Question Image" class="max-w-sm h-auto mx-auto my-3 border dark:border-gray-600 rounded" onerror="this.style.display='none';">` : '';
            const optionsHtml = (q.options || []).map(opt => `<li class="flex items-baseline text-sm ${opt.letter === q.correctAnswer ? 'font-semibold text-green-700 dark:text-green-300' : ''} ${opt.letter === q.userAnswer && !displayCorrect ? 'text-red-700 dark:text-red-400 line-through' : ''} ${opt.letter === q.userAnswer ? 'ring-1 ring-offset-1 dark:ring-offset-gray-800 ring-blue-400 rounded px-1' : ''}"><span class="font-mono w-5 text-right mr-1.5 shrink-0">${opt.letter}.</span><span class="option-text-container">${opt.text}</span></li>`).join('');

            questionsHtml += `
                <div class="border rounded-md p-3 text-sm ${statusClass}">
                    <div class="flex justify-between items-start mb-2">
                        <p class="font-medium text-gray-700 dark:text-gray-300 flex items-center">${statusIcon}Question ${qIndex + 1} (Ch ${q.chapter} - Q${q.number})</p>
                        ${isOverridden ? '<span class="text-xs bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200 px-1.5 py-0.5 rounded flex-shrink-0">Overridden Correct</span>' : !displayCorrect && q.isOverridden === false ? '<span class="text-xs bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200 px-1.5 py-0.5 rounded flex-shrink-0">Overridden Incorrect</span>' : ''}
                    </div>
                    ${imageHtml}
                    <div class="prose prose-sm dark:prose-invert max-w-none question-text-container mb-3">${q.text}</div>
                    <ul class="list-none pl-0 space-y-1 mb-3">${optionsHtml}</ul>
                    <div class="text-xs text-gray-600 dark:text-gray-400 mt-1 border-t dark:border-gray-600 pt-2">Your Answer: ${q.userAnswer || '<i>None</i>'} | Correct: ${q.correctAnswer || 'N/A'}</div>
                    <div class="mt-2 text-right space-x-2">
                        <button onclick="window.triggerAIExplanationWrapper(${index}, ${qIndex})" class="btn-secondary-small text-xs"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.375 3.375 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>Explain (AI)</button>
                        <button onclick="window.promptFeedback(${index}, ${qIndex})" class="btn-warning-small text-xs"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>Report Issue</button>
                        ${currentUser?.uid === ADMIN_UID ? `<button onclick="window.promptAdminEditAnswerPlaceholder('${q.id}')" class="btn-secondary-small text-xs">Edit Answer</button>` : ''}
                         ${q.userAnswer !== q.correctAnswer ? `<button onclick="window.overrideQuestionCorrectness(${index}, ${qIndex}, true)" title="Mark this question as correct" class="btn-success-small text-xs ${q.isOverridden ? 'hidden':''}">Override Correct</button>` : ''}
                         ${q.userAnswer === q.correctAnswer ? `<button onclick="window.overrideQuestionCorrectness(${index}, ${qIndex}, false)" title="Mark this question as incorrect" class="btn-danger-small text-xs ${q.isOverridden===false ? 'hidden':''}">Override Incorrect</button>` : ''}
                    </div>
                    <div id="ai-explanation-${qIndex}" class="mt-2 text-sm border-t dark:border-gray-600 pt-2 hidden"></div>
                </div>
            `;
        });
         // No separate chapter summary needed for online exams as questions list chapters
    } else {
        questionsHtml = '<p class="text-sm italic p-4 text-center">No question details available for this exam type.</p>';
    }

    const mainHtml = `
        <div class="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg shadow-inner mb-4">
            <div class="flex justify-between items-center mb-4"><h2 class="text-xl font-semibold text-primary-600 dark:text-primary-400 flex items-center flex-wrap gap-x-2"><span class="truncate" title="${escapeHtml(exam.examId)}">${escapeHtml(exam.examId || 'Exam Details')}</span>${isPdfExam ? '<span class="text-xs bg-purple-200 text-purple-800 dark:bg-purple-700 dark:text-purple-200 px-1.5 py-0.5 rounded flex-shrink-0">PDF</span>' : '<span class="text-xs bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-200 px-1.5 py-0.5 rounded flex-shrink-0">Online</span>'}${isOverriddenOverall ? '<span class="text-xs bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-200 px-1.5 py-0.5 rounded flex-shrink-0">Overridden</span>' : ''}</h2><button onclick="window.showExamsDashboard()" class="btn-secondary-small flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>Back</button></div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${date}${exam.durationMinutes ? ` - Duration: ${exam.durationMinutes} min` : ''}</p>
            <p class="text-lg font-bold mb-1">Overall Score: ${displayScore} / ${totalQuestions} (${percentage}%)</p>${isOverriddenOverall ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-4">(Original: ${originalScore} / ${totalQuestions} - ${originalPercentage}%)</p>` : '<p class="mb-4"></p>'}
            ${chapterSummaryHtml}
            <h3 class="text-md font-semibold mb-3 mt-5">Question Breakdown</h3><div id="exam-details-questions-container" class="max-h-[60vh] overflow-y-auto pr-2 border-t border-b dark:border-gray-700 py-4 space-y-3">${questionsHtml}</div>
            <button onclick="window.showExamsDashboard()" class="mt-6 w-full btn-secondary"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>Back to Exams Dashboard</button>
        </div>`;
    displayContent(mainHtml);
    const questionsContainer = document.getElementById('exam-details-questions-container');
    if (questionsContainer) { await renderMathIn(questionsContainer); } else { console.error("Could not find questions container for MathJax."); }
    setActiveSidebarLink('showExamsDashboard'); // Keep sidebar active
}


// --- Override Function ---
export async function overrideQuestionCorrectness(examIndex, questionIndex, markAsCorrect) {
     if (!currentUser || !currentSubject || !data || !currentSubject.exam_history || !currentSubject.exam_history[examIndex] || !currentSubject.exam_history[examIndex].questions) { alert("Error: Cannot override answer."); return; }
     const exam = currentSubject.exam_history[examIndex]; const question = exam.questions[questionIndex]; if (!question) { alert("Error: Question not found."); return; }
     // Prevent marking correct as correct, or incorrect as incorrect
     const originallyCorrect = question.userAnswer === question.correctAnswer;
     if ((originallyCorrect && markAsCorrect) || (!originallyCorrect && !markAsCorrect && question.isOverridden !== true)) {
          console.log(`No change needed for Q${questionIndex + 1}. Current state matches request.`);
          return;
     }

     question.isOverridden = markAsCorrect;

     // Recalculate score
     let newScore = 0;
     exam.questions.forEach(q => {
         const wasCorrect = q.userAnswer === q.correctAnswer;
         const nowCorrect = q.isOverridden === true || (wasCorrect && q.isOverridden !== false);
         if (nowCorrect) {
             newScore++;
         }
     });

     // Ensure originalScore is stored if not already present
     exam.originalScore = exam.originalScore ?? exam.score ?? 0;
     exam.overriddenScore = newScore;

     console.log(`Override applied: Q${questionIndex+1} marked as ${markAsCorrect ? 'Correct' : 'Incorrect'}. New score: ${newScore} (Original: ${exam.originalScore})`);
     showLoading("Saving override...");
     try { await saveUserData(currentUser.uid); hideLoading(); await showExamDetails(examIndex); }
     catch (error) { console.error("Failed to save override:", error); alert("Error saving the change: " + error.message); hideLoading(); }
}

// --- Feedback Functions ---
export function promptFeedback(examIndex, questionIndex) {
     if (!currentSubject || !currentSubject.exam_history || !currentSubject.exam_history[examIndex] || !currentSubject.exam_history[examIndex].questions) return;
     const exam = currentSubject.exam_history[examIndex]; const question = exam.questions[questionIndex]; if (!question) return;
     const feedbackText = prompt(`Enter feedback/report issue for Question ${questionIndex+1} (Ch ${question.chapter} - ${question.number}):\n\n"${escapeHtml(question.text.substring(0, 100))}..."`);
     if (feedbackText && feedbackText.trim()) { handleFeedbackSubmission(exam.subjectId, question.id, feedbackText.trim()); } else if (feedbackText !== null) { alert("Feedback cannot be empty."); }
}

async function handleFeedbackSubmission(subjectId, questionId, feedbackText) {
    if (!currentUser) { alert("You must be logged in to submit feedback."); return; }
    showLoading("Submitting feedback...");
    const success = await submitFeedback({ subjectId: subjectId, questionId: questionId, feedbackText: feedbackText }, currentUser );
    hideLoading(); if (success) { alert("Feedback submitted successfully. Thank you!"); }
}

// --- AI Trigger (Legacy appData exams) ---
export async function triggerAIExplanationWrapper(examIndex, questionIndex) {
    // This function triggers AI explanation based on the OLD appData structure
    const explanationAreaId = `ai-explanation-${questionIndex}`; const explanationArea = document.getElementById(explanationAreaId); if (!explanationArea) { console.error(`Explanation area ${explanationAreaId} not found.`); return; }
    const displayMessage = (html) => { explanationArea.innerHTML = html; explanationArea.classList.remove('hidden'); };
    if (!currentSubject || !currentSubject.exam_history || !currentSubject.exam_history[examIndex] || !currentSubject.exam_history[examIndex].questions) { displayMessage(`<p class="text-red-500">Error: Could not load legacy question data.</p>`); return; }
    const exam = currentSubject.exam_history[examIndex]; const question = exam.questions[questionIndex]; if (!question) { displayMessage(`<p class="text-red-500">Error: Question not found in legacy data.</p>`); return; }

     if (!explanationArea.classList.contains('hidden')) { explanationArea.classList.add('hidden'); explanationArea.innerHTML = ''; return; }

    displayMessage(`<div class="flex items-center justify-center space-x-2"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-xs text-muted">Generating AI explanation...</p></div>`);
    try {
        const originallyCorrect = question.userAnswer === question.correctAnswer;
        const isMarkedCorrect = question.isOverridden === true || (originallyCorrect && question.isOverridden !== false);
        // Prepare data structure compatible with generateExplanation
        const questionForAI = {
             id: question.id,
             text: question.text,
             options: question.options,
             correctAnswer: question.correctAnswer,
             isProblem: false // Assume legacy questions are MCQs
        };
        // Use the imported generateExplanation from exam_storage which handles conversation history
        const result = await generateExplanation(questionForAI, question.correctAnswer, question.userAnswer, []);
        // For legacy UI, just display the first explanation, don't handle follow-ups here.
        explanationArea.innerHTML = `<p class="font-semibold text-purple-700 dark:text-purple-300 text-xs mb-1">AI Explanation:</p><div class="prose prose-sm dark:prose-invert max-w-none mt-1">${result.explanationHtml}</div>`;
        await renderMathIn(explanationArea);
    } catch (error) { console.error("Error getting/displaying AI explanation:", error); displayMessage(`<p class="text-red-500 text-xs">Error generating explanation: ${error.message}</p>`); }
}
window.triggerAIExplanation = triggerAIExplanationWrapper; // Assign to window


// --- Admin Answer Edit Placeholder ---
export function promptAdminEditAnswerPlaceholder(questionId) {
     if (currentUser?.uid !== ADMIN_UID) { alert("Permission denied."); return; }
     alert(`Admin Function: Edit Answer for ${questionId}\n\nNOTE: Currently, answers are derived from the Markdown file. Edit the .md file and reload data to change answers.`);
}


// --- Deletion Functions ---
export function confirmDeletePendingExam(originalIndex) { // Index is from the filtered list used in showEnterResults
    const pending_exams_filtered = (currentSubject?.pending_exams || []).filter(exam => !exam.results_entered);
    const exam = pending_exams_filtered[originalIndex];
    if (!currentSubject || !exam) { alert("Could not find pending exam to delete."); return; }
    const confirmation = confirm(`Delete PENDING exam "${escapeHtml(exam.id)}"?\n\nResults have NOT been entered. Questions WILL NOT be returned to pool.`);
    if (confirmation) deletePendingExam(exam.id, exam.timestamp); // Pass ID and timestamp for reliable deletion
}

export async function deletePendingExam(examId, timestamp) {
     if (!currentUser || !currentSubject || !data) { alert("Cannot delete: State missing."); return; }
     showLoading("Deleting Pending Exam..."); await new Promise(resolve => setTimeout(resolve, 100));
    try {
         // Find the exam in the full original list using id and timestamp
         const originalFullIndex = currentSubject.pending_exams.findIndex(p => p.id === examId && p.timestamp === timestamp);
         if (originalFullIndex === -1) throw new Error("Pending exam not found in the original list.");

         const deletedExamId = currentSubject.pending_exams[originalFullIndex].id;
         currentSubject.pending_exams.splice(originalFullIndex, 1);
         await saveUserData(currentUser.uid); // Save the updated appData
         hideLoading(); showExamsDashboard(); // Refresh view
         const successMsg = `<div class="bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-200 p-4 rounded-md mb-4 animate-fade-in fixed top-16 right-4 z-50 shadow-lg"><p class="font-medium">Pending exam ${escapeHtml(deletedExamId)} deleted.</p></div>`;
         const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsg; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 4000);
    } catch (error) { console.error("Error deleting pending exam:", error); alert("Failed to delete pending exam: " + error.message); hideLoading(); showExamsDashboard(); }
}

export function confirmDeleteCompletedExam(index) {
    if (!currentSubject || !currentSubject.exam_history || !currentSubject.exam_history[index]) return;
    const exam = currentSubject.exam_history[index];
    const confirmation = confirm(`Permanently delete history for COMPLETED exam "${escapeHtml(exam.examId)}"?\n\nWARNING: Cannot be undone. Questions WILL become available again.`);
    if (confirmation) deleteCompletedExam(index);
}

export async function deleteCompletedExam(index) {
    if (!currentUser || !currentSubject || !data || !currentSubject.exam_history || !currentSubject.chapters) { alert("Error deleting history: Critical data missing."); hideLoading(); return; }
    showLoading("Deleting Exam History...");
    await new Promise(resolve => setTimeout(resolve, 100));
     try {
         const examToDelete = currentSubject.exam_history[index]; if (!examToDelete) throw new Error("Completed exam not found."); const examId = examToDelete.examId;
         let questionsToReadd = []; let chaptersDataModified = false;
         if (examToDelete.type === 'online' && examToDelete.questions) { questionsToReadd = examToDelete.questions.map(q => ({ chapter: q.chapter, number: q.number })); }
         else if (examToDelete.type === 'pdf' && examToDelete.allocation) { Object.entries(examToDelete.allocation).forEach(([chapNum, qNumbers]) => { if (qNumbers && Array.isArray(qNumbers)) { qNumbers.forEach(qNum => questionsToReadd.push({ chapter: chapNum, number: qNum })); } }); }
         else { console.warn(`Exam ${examToDelete.examId} type unknown or data missing for re-adding questions.`); }
         questionsToReadd.forEach(({ chapter: chapNum, number: qNum }) => {
             if (!chapNum || isNaN(parseInt(chapNum)) || !qNum || isNaN(parseInt(qNum))) { console.warn(`Invalid chap/qNum during re-add: ${chapNum}/${qNum}.`); return; }
             const globalChap = currentSubject.chapters[chapNum];
             if (globalChap && globalChap.available_questions && Array.isArray(globalChap.available_questions)) { if (!globalChap.available_questions.includes(qNum)) { globalChap.available_questions.push(qNum); chaptersDataModified = true; } }
             else { console.error(`Chapter ${chapNum} or available_questions missing for re-add Q ${qNum}.`); }
         });
         if (chaptersDataModified) { Object.values(currentSubject.chapters).forEach(chap => { if (chap.available_questions) { chap.available_questions.sort((a, b) => a - b); } }); }
         currentSubject.exam_history.splice(index, 1);
         await saveUserData(currentUser.uid); console.log(`Exam history ${examId} deleted. Questions (${questionsToReadd.length}) re-added. Data saved.`);
         hideLoading(); showExamsDashboard(); // Refresh view
         const successMsgHtml = `<div class="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 rounded-md mb-4 animate-fade-in fixed top-16 right-4 z-50 shadow-lg"><p class="font-medium">Exam ${escapeHtml(examId)} history deleted.</p><p class="text-xs">Associated questions are available again.</p></div>`;
         const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 5000);
     } catch (error) {
         console.error("Error deleting completed exam history:", error);
         alert("Failed to delete exam history: " + error.message);
         hideLoading();
         showExamsDashboard(); // Still refresh view on error
         // Ensure sidebar link is active even on error return
         setActiveSidebarLink('showExamsDashboard');
     }
}

// --- Completed Exams List (New: Fetches from userExams) ---
function renderCompletedExamsList(completedExams) {
    if (!completedExams || completedExams.length === 0) {
        return '<p class="text-sm text-gray-500 dark:text-gray-400 mt-4">No completed exam history found for this subject.</p>';
    }

    let output = '<h3 class="text-lg font-semibold mb-3 mt-6 text-green-600 dark:text-green-400">Completed Exam History</h3><div class="space-y-2">';
    completedExams.forEach((exam) => {
        if (!exam || !exam.id) { console.error("Skipping rendering completed exam due to missing ID:", exam); return; }
        // Added Logging
        console.log(`renderCompletedExamsList: Creating button for examId='${exam.id}'`);
        const displayScore = exam.score ?? 0;
        const maxScore = exam.maxScore || 0;
        const percentage = maxScore > 0 ? ((displayScore / maxScore) * 100).toFixed(1) : 0;
        const date = exam.timestamp ? new Date(exam.timestamp).toLocaleString() : 'N/A';
        const typeDisplay = exam.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const passOrFailClass = parseFloat(percentage) >= 50 ? 'text-green-500' : 'text-red-500';

        output += `
        <div class="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200">
             <div class="flex flex-wrap justify-between items-center mb-1 gap-x-4 gap-y-1">
                 <span class="text-sm font-medium flex items-center flex-grow min-w-0">
                     <span class="truncate" title="${escapeHtml(exam.id)}">${escapeHtml(exam.id)}</span>
                     <span class="ml-2 text-xs bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-200 px-1.5 py-0.5 rounded flex-shrink-0">${escapeHtml(typeDisplay)}</span>
                 </span>
                 <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">${date}</span>
             </div>
             <div class="flex justify-between items-center">
                 <span class="font-semibold ${passOrFailClass}">${displayScore.toFixed(0)} / ${maxScore.toFixed(0)} (${percentage}%)</span>
                 <div class="flex-shrink-0 flex space-x-2">
                      <button onclick="window.showExamReviewUI('${currentUser.uid}', \`${exam.id}\`)" title="View Exam Review" class="btn-secondary-small">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639l4.458-4.458a1.012 1.012 0 0 1 1.414 0l4.458 4.458a1.012 1.012 0 0 1 0 .639l-4.458 4.458a1.012 1.012 0 0 1-1.414 0l-4.458-4.458Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>Review
                      </button>
                      <button onclick="window.confirmDeleteCompletedExamV2('${exam.id}')" title="Delete History Entry" class="btn-danger-small">
                           <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>Delete
                      </button>
                 </div>
             </div>
        </div>`;
    });
    output += '</div>';
    return output;
}

// --- NEW: Delete Completed Exam from userExams Collection ---
export function confirmDeleteCompletedExamV2(examId) {
    if (!examId) { console.error("No exam ID provided for deletion."); return; }
    const confirmation = confirm(`Permanently delete history for exam "${escapeHtml(examId)}"?\n\nWARNING: This cannot be undone. If this was a TestGen exam, used MCQs WILL be restored to the available pool.`);
    if (confirmation) deleteCompletedExamV2(examId);
}
window.confirmDeleteCompletedExamV2 = confirmDeleteCompletedExamV2;

async function deleteCompletedExamV2(examId) {
     if (!currentUser || !db || !examId || !data) { alert("Error deleting history: Critical data missing."); return; }
     showLoading("Deleting Exam History...");
     const examRef = db.collection('userExams').doc(currentUser.uid).collection('exams').doc(examId);
     try {
         const examDoc = await examRef.get();
         if (!examDoc.exists) {
             throw new Error(`Exam document ${examId} not found.`);
         }
         const examData = examDoc.data();

         let questionsRestoredCount = 0;
         let appDataModified = false;
         if (!examData.courseId && examData.subjectId && data.subjects && data.subjects[examData.subjectId]) {
             const subjectToUpdate = data.subjects[examData.subjectId];
             console.log(`Exam ${examId} is a TestGen exam for subject ${examData.subjectId}. Attempting to restore MCQs...`);

             if (examData.questions && subjectToUpdate.chapters) {
                 examData.questions.forEach(q => {
                     if (!q.isProblem && q.chapter && q.number) {
                         const chap = subjectToUpdate.chapters[q.chapter];
                         if (chap && Array.isArray(chap.available_questions)) {
                              const qNum = parseInt(q.number);
                              if (!isNaN(qNum) && !chap.available_questions.includes(qNum)) {
                                  chap.available_questions.push(qNum);
                                  questionsRestoredCount++;
                                  appDataModified = true;
                              }
                         } else {
                             console.warn(`Could not find chapter ${q.chapter} or available_questions for restoring Q${q.number} from deleted exam ${examId}.`);
                         }
                     }
                 });

                 if (appDataModified) {
                     Object.values(subjectToUpdate.chapters).forEach(chap => {
                         if (chap.available_questions) {
                             chap.available_questions.sort((a, b) => a - b);
                         }
                     });
                      console.log(`Restored ${questionsRestoredCount} MCQs to available pool for subject ${examData.subjectId}.`);
                 }
             } else {
                 console.warn(`Could not restore questions for deleted exam ${examId}: Missing questions array in exam data or chapters in subject data.`);
             }
         } else {
              console.log(`Exam ${examId} is not a TestGen exam (courseId: ${examData.courseId}, subjectId: ${examData.subjectId}). No questions restored to appData.`);
         }

         if (appDataModified) {
              await saveUserData(currentUser.uid, data);
              console.log("Saved updated appData after restoring questions.");
         }

         await examRef.delete();
         console.log(`Exam history ${examId} deleted from userExams collection.`);

         hideLoading();
         showExamsDashboard();
         window.showProgressDashboard(); // Refresh progress dashboard after deletion

         const successMsgHtml = `<div class="toast-notification toast-warning animate-fade-in"><p>Exam ${escapeHtml(examId)} history deleted.</p>${appDataModified ? `<p class="text-xs">${questionsRestoredCount} MCQs restored to available pool.</p>` : ''}</div>`;
         const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 5000);

     } catch (error) {
         hideLoading();
         console.error("Error deleting completed exam history (V2):", error);
         alert("Failed to delete exam history: " + error.message);
         showExamsDashboard();
     }
}
window.deleteCompletedExamV2 = deleteCompletedExamV2;

// --- NEW: Reset Available Questions ---
async function resetAvailableQuestionsForSubject() {
     if (!currentUser || !currentSubject || !data || !data.subjects || !data.subjects[currentSubject.id] || !data.subjects[currentSubject.id].chapters) {
         alert("Error: Cannot reset questions. Subject or chapter data is missing.");
         return;
     }
     const subjectName = currentSubject.name || `Subject ${currentSubject.id}`;
     if (!confirm(`Are you sure you want to reset available questions for ALL chapters in '${subjectName}'?\n\nThis will make all MCQs potentially available again for test generation.\nThis action cannot be undone.`)) {
         return;
     }

     showLoading(`Resetting available questions for ${subjectName}...`);
     try {
         const subjectToModify = data.subjects[currentSubject.id];
         let changesMade = false;

         for (const chapNum in subjectToModify.chapters) {
             const chap = subjectToModify.chapters[chapNum];
             if (chap && typeof chap.total_questions === 'number' && chap.total_questions > 0) {
                 const fullList = Array.from({ length: chap.total_questions }, (_, j) => j + 1);
                 if (JSON.stringify(chap.available_questions?.sort((a,b)=>a-b)) !== JSON.stringify(fullList)) {
                     chap.available_questions = fullList;
                     changesMade = true;
                 }
             } else if (chap) {
                 if (chap.available_questions?.length > 0) {
                     chap.available_questions = [];
                     changesMade = true;
                 }
             }
         }

         if (changesMade) {
             await saveUserData(currentUser.uid, data);
             hideLoading();
             const successMsgHtml = `<div class="toast-notification toast-success animate-fade-in"><p class="font-medium">Available questions reset for ${escapeHtml(subjectName)}.</p></div>`;
             const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 4000);
             showExamsDashboard();
             window.showProgressDashboard(); // Refresh progress dashboard after reset
         } else {
             hideLoading();
             alert("No changes needed. Available questions already seem complete.");
         }

     } catch (error) {
         hideLoading();
         console.error("Error resetting available questions:", error);
         alert("Failed to reset available questions: " + error.message);
     }
}
window.resetAvailableQuestionsForSubject = resetAvailableQuestionsForSubject;

// --- END OF FILE ui_exams_dashboard.js ---