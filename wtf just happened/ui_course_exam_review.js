// --- START OF FILE ui_course_exam_review.js ---

import { currentUser, db, globalCourseDataMap } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, renderMathIn, escapeHtml } from './utils.js';
import { getAIExplanation, gradeProblemWithAI, getAllPdfTextForAI } from './ai_integration.js'; // Need AI functions
// Potentially needs save function if overrides/feedback are added here later
// import { saveCourseExamResult } from './firebase_firestore.js';

let currentExamResultData = null; // Store loaded exam data for potential updates

/**
 * Fetches and displays the detailed results of a specific course exam.
 * @param {string} userId - The ID of the user who took the exam.
 * @param {string} examId - The unique ID of the exam result document.
 */
export async function showCourseExamDetails(userId, examId) {
    if (!currentUser || !userId || !examId) {
        displayContent('<p class="text-red-500 p-4">Error: Missing user or exam ID for review.</p>');
        setActiveSidebarLink('showMyCoursesDashboard', 'sidebar-standard-nav'); // Fallback link
        return;
    }
    setActiveSidebarLink('showCurrentAssignmentsExams', 'sidebar-course-nav'); // Assume navigated from course assignments

    showLoading("Loading Exam Details...");
    currentExamResultData = null; // Reset stored data

    try {
        const resultRef = db.collection('userExamResults').doc(userId).collection('results').doc(examId);
        const doc = await resultRef.get();

        if (!doc.exists) {
            throw new Error("Exam result document not found.");
        }
        const exam = doc.data();
        currentExamResultData = exam; // Store loaded data

        hideLoading();

        // --- Start Building HTML ---
        const courseId = exam.courseContext?.courseId;
        const courseName = globalCourseDataMap.get(courseId)?.name || 'Unknown Course';
        const activityType = exam.courseContext?.activityType || 'Exam';
        const activityId = exam.courseContext?.activityId || '';
        const isSkipExam = !!exam.courseContext?.isSkipExam;
        const chapterNumForSkipExam = exam.courseContext?.chapterNum;

        const displayScore = exam.score || 0; // Use MCQ score
        const totalItems = exam.totalItems || 0;
        const totalMCQs = exam.totalMcqItems ?? exam.items?.filter(i => i.type === 'mcq').length ?? totalItems; // Estimate if needed
        const denominator = totalMCQs; // Score % based on MCQs for course activities
        const percentage = denominator > 0 ? ((displayScore / denominator) * 100).toFixed(1) : 0;
        const date = exam.timestamp?.toDate ? exam.timestamp.toDate().toLocaleString() : 'N/A';

        let itemsHtml = '';
        if (exam.items && exam.items.length > 0) {
            exam.items.forEach((item, qIndex) => {
                if (item.type === 'mcq') {
                    const isCorrect = item.isCorrect; // Should be stored directly now
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
                        if (opt.letter === item.correctAnswer) { indicator = '<span class="text-green-600 dark:text-green-400 font-bold ml-1">(Correct)</span>'; }
                        if (opt.letter === item.userAnswer) {
                            optionClass = isCorrect ? 'border-green-500 dark:border-green-400 ring-1 ring-green-500' : 'border-red-500 dark:border-red-400 ring-1 ring-red-500';
                            indicator += '<span class="text-blue-600 dark:text-blue-400 font-bold ml-1">(Your Answer)</span>';
                        }
                        itemsHtml += `<div class="border ${optionClass} p-2 rounded bg-white dark:bg-gray-800 flex"><strong class="mr-2">${opt.letter}.</strong> <span class="option-text-container flex-1">${opt.text}</span> ${indicator}</div>`;
                    });
                    itemsHtml += `</div>`;
                    // Buttons (No override needed here, just explain/feedback)
                    itemsHtml += `<div class="mt-2 pt-2 border-t dark:border-gray-600 flex justify-end items-center gap-2">`;
                    // Feedback button could be added here later if needed
                    itemsHtml += `<button onclick="window.triggerCourseAIExplanation('${examId}', ${qIndex})" class="btn-info-small text-xs" title="Get AI Explanation">Explain (AI)</button></div>`;
                    itemsHtml += `<div id="ai-explanation-${qIndex}" class="mt-2 text-xs hidden bg-purple-50 dark:bg-purple-900/30 p-2 rounded border border-purple-200 dark:border-purple-700"></div>`;
                    itemsHtml += `</div>`;
                } else if (item.type === 'problem') {
                    const itemBg = 'bg-blue-50 dark:bg-blue-900/30';
                    const itemBorder = 'border-blue-200 dark:border-blue-700';
                    itemsHtml += `<div class="${itemBg} ${itemBorder} border p-3 rounded-md shadow-sm mb-3">`;
                    itemsHtml += `<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Ch ${item.chapter} - Problem ${item.number} (ID: ${item.id})</p>`;
                    if(item.image) itemsHtml += `<img src="${item.image}" alt="Problem Image" class="max-w-xs h-auto mx-auto my-2 border dark:border-gray-600 rounded" onerror="this.style.display='none';">`;
                    itemsHtml += `<div class="prose prose-sm dark:prose-invert max-w-none mb-2 question-text-container">${item.text}</div>`;
                    itemsHtml += `<div class="mt-2 pt-2 border-t dark:border-gray-600">`;
                    itemsHtml += `<p class="text-xs font-semibold mb-1">Your Answer:</p>`;
                    itemsHtml += `<div class="text-xs whitespace-pre-wrap p-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-600">${escapeHtml(item.userAnswer || '(No answer submitted)')}</div>`;
                    // AI Grade display and trigger button
                    const aiGrade = item.aiGrade !== null && item.aiGrade !== undefined ? `${item.aiGrade}/10` : 'Not Graded';
                    itemsHtml += `<p class="text-xs font-semibold mt-2 mb-1">AI Grade: <span id="ai-grade-${item.id}">${aiGrade}</span></p>`;
                    itemsHtml += `<div id="ai-grade-explanation-${item.id}" class="text-xs text-muted italic">${item.aiExplanation ? escapeHtml(item.aiExplanation) : ''}</div>`;
                    itemsHtml += `<div class="mt-2 flex justify-end gap-2"> <button onclick="window.triggerCourseProblemAIGrade('${examId}', ${qIndex})" class="btn-secondary-small text-xs">Grade with AI</button> </div>`;
                    itemsHtml += `</div></div>`;
                }
            });
        } else {
            itemsHtml = '<p class="text-sm italic p-4 text-center">No item details available for this exam.</p>';
        }

        // Chapter Summary (Based on MCQs)
        let chapterSummaryHtml = '';
        if (exam.resultsByChapter && Object.keys(exam.resultsByChapter).length > 0) {
            chapterSummaryHtml = '<div class="mb-4 border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800"><h4 class="text-sm font-semibold mb-2">Performance by Chapter (MCQs)</h4><ul class="space-y-1">';
            Object.entries(exam.resultsByChapter).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).forEach(([chapNum, chapRes]) => {
                const mcqPerc = chapRes.attemptedMCQ > 0 ? ((chapRes.correctMCQ / chapRes.attemptedMCQ) * 100).toFixed(1) : 0;
                const color = chapRes.wrongMCQ > 0 ? 'text-red-500' : 'text-green-500';
                const problemText = chapRes.attemptedProblems > 0 ? ` (+${chapRes.attemptedProblems} Problems)` : '';
                chapterSummaryHtml += `<li class="flex justify-between items-center text-xs"><span class="font-medium">Chapter ${chapNum}</span><span class="font-semibold ${color}">${chapRes.correctMCQ}/${chapRes.attemptedMCQ} (${mcqPerc}%)${problemText}</span></li>`;
            });
            chapterSummaryHtml += '</ul></div>';
        }

        const mainHtml = `
            <div class="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg shadow-inner mb-4">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-semibold text-primary-600 dark:text-primary-400 flex items-center flex-wrap gap-x-2">
                        <span class="truncate" title="${escapeHtml(exam.examId)}">Review: ${activityType} ${activityId}</span>
                        <span class="text-xs bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-200 px-1.5 py-0.5 rounded flex-shrink-0">Course: ${escapeHtml(courseName)}</span>
                    </h2>
                    <button onclick="window.showCurrentAssignmentsExams('${courseId}')" class="btn-secondary-small flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
                        Back to Exams
                    </button>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${date}${exam.durationMinutes ? ` - Duration: ${exam.durationMinutes} min` : ''}</p>
                <p class="text-lg font-bold mb-1">MCQ Score: ${displayScore} / ${denominator} (${percentage}%)</p>
                ${totalItems > totalMCQs ? `<p class="text-sm text-muted mb-4">(${totalItems - totalMCQs} Problems require AI grading)</p>` : '<p class="mb-4"></p>'}
                ${chapterSummaryHtml}
                <h3 class="text-md font-semibold mb-3 mt-5">Item Breakdown</h3>
                <div id="exam-details-items-container" class="max-h-[60vh] overflow-y-auto pr-2 border-t border-b dark:border-gray-700 py-4 space-y-3">${itemsHtml}</div>
                 <button onclick="window.showCurrentAssignmentsExams('${courseId}')" class="mt-6 w-full btn-secondary">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
                     Back to Course Exams
                 </button>
            </div>`;

        displayContent(mainHtml, 'course-dashboard-area'); // Display in course area
        const itemsContainer = document.getElementById('exam-details-items-container');
        if (itemsContainer) { await renderMathIn(itemsContainer); }

    } catch (error) {
        hideLoading();
        console.error(`Error loading course exam details for ${examId}:`, error);
        displayContent(`<p class="text-red-500 p-4">Error loading exam details: ${error.message}</p>`, 'course-dashboard-area');
    }
}
window.showCourseExamDetails = showCourseExamDetails; // Assign to window

// AI Explanation trigger specifically for course exams
export async function triggerCourseAIExplanation(examId, itemIndex) {
    const explanationAreaId = `ai-explanation-${itemIndex}`;
    const explanationArea = document.getElementById(explanationAreaId);
    if (!explanationArea) { console.error(`Explanation area ${explanationAreaId} not found.`); return; }

    const displayMessage = (html) => { explanationArea.innerHTML = html; explanationArea.classList.remove('hidden'); };

    // Use the stored data if available, otherwise re-fetch (though unlikely needed)
    const exam = currentExamResultData;
    if (!exam || !exam.items || !exam.items[itemIndex]) {
        displayMessage(`<p class="text-red-500">Error: Could not load item data for explanation.</p>`);
        return;
    }
    const item = exam.items[itemIndex];
    if (item.type !== 'mcq') {
        displayMessage(`<p class="text-info-500">AI Explanation is only available for Multiple Choice Questions.</p>`);
        return;
    }

    displayMessage(`<div class="flex items-center justify-center space-x-2"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p>Generating AI explanation...</p></div>`);
    try {
        const aiData = { questionText: item.text, options: item.options, correctAnswer: item.correctAnswer, userAnswer: item.userAnswer, isUserCorrect: item.isCorrect };
        const explanationHtml = await getAIExplanation(aiData);
        explanationArea.innerHTML = `<p class="font-semibold text-purple-700 dark:text-purple-300">AI Explanation:</p><div class="prose prose-sm dark:prose-invert max-w-none mt-1">${explanationHtml}</div>`;
        await renderMathIn(explanationArea);
    } catch (error) { console.error("Error getting/displaying AI explanation:", error); displayMessage(`<p class="text-red-500">An unexpected error occurred.</p>`); }
}
window.triggerCourseAIExplanation = triggerCourseAIExplanation;

// AI Grading trigger specifically for course exams
export async function triggerCourseProblemAIGrade(examId, itemIndex) {
    if (!currentExamResultData || !currentExamResultData.items || !currentExamResultData.items[itemIndex]) {
        alert("Error: Cannot grade. Exam data not loaded correctly.");
        return;
    }
    const item = currentExamResultData.items[itemIndex];
    const gradeSpanId = `ai-grade-${item.id}`;
    const explanationDivId = `ai-grade-explanation-${item.id}`;
    const gradeSpan = document.getElementById(gradeSpanId);
    const explanationDiv = document.getElementById(explanationDivId);

    if (!gradeSpan || !explanationDiv) { console.error("Cannot find AI grade display elements."); return; }
    if (item.type !== 'problem' || !item.userAnswer) { alert("AI Grading is only available for submitted problem answers."); return; }

    gradeSpan.textContent = 'Grading...';
    explanationDiv.textContent = '';
    showLoading("Requesting AI Grade...");

    try {
        // Fetch chapter content for context
        const courseId = currentExamResultData.courseContext?.courseId;
        let chapterContent = "No specific chapter context available.";
        if (courseId && item.chapter) {
             const courseDef = globalCourseDataMap.get(courseId);
             const pdfPath = courseDef?.pdfPathPattern?.replace('{num}', item.chapter);
             const pdfText = pdfPath ? await getAllPdfTextForAI(pdfPath) : null;
             if (pdfText) chapterContent = pdfText.substring(0, 100000); // Limit context
             else console.warn("Could not load PDF context for grading problem", item.id);
        }

        const { score, explanation } = await gradeProblemWithAI(item.text, item.userAnswer, chapterContent);

        // Update the UI
        gradeSpan.textContent = `${score}/10`;
        explanationDiv.textContent = explanation;

        // Update the local state and save to Firestore
        item.aiGrade = score;
        item.aiExplanation = explanation;
        // We need to save the entire 'currentExamResultData' back
        const resultRef = db.collection('userExamResults').doc(currentUser.uid).collection('results').doc(examId);
        await resultRef.update({ items: currentExamResultData.items }); // Update only the items array

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
window.triggerCourseProblemAIGrade = triggerCourseProblemAIGrade;

// --- END OF FILE ui_course_exam_review.js ---