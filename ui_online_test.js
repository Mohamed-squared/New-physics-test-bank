// --- START OF FILE ui_online_test.js ---

import { currentOnlineTestState, setCurrentOnlineTestState, currentSubject, currentUser, data, setData, activeCourseId, userCourseProgressMap, globalCourseDataMap, updateUserCourseProgress } from './state.js'; // Added globalCourseDataMap and updateUserCourseProgress
import { displayContent, clearContent, setActiveSidebarLink } from './ui_core.js'; // Added setActiveSidebarLink
import { showLoading, hideLoading, renderMathIn, escapeHtml, getFormattedDate } from './utils.js'; // Added escapeHtml and getFormattedDate
// MODIFIED: Added markChapterStudiedInCourse and saveUserCourseProgress
import { saveUserData, markChapterStudiedInCourse, saveUserCourseProgress } from './firebase_firestore.js';
import { showTestGenerationDashboard } from './ui_test_generation.js';
import { showExamsDashboard } from './ui_exams_dashboard.js';
// *** MODIFIED: Added PASSING_GRADE_PERCENT to import ***
import { ONLINE_TEST_DURATION_MINUTES, SKIP_EXAM_PASSING_PERCENT, PASSING_GRADE_PERCENT } from './config.js';
// MODIFIED: Import necessary functions from exam_storage.js
import { storeExamResult, getExamDetails, showExamReviewUI, showIssueReportingModal, submitIssueReport } from './exam_storage.js';
// AI Marking is handled within exam_storage.js now

// --- Online Test UI & Logic ---

export function launchOnlineTestUI() {
    clearContent(); // Clear main content area first
    const testArea = document.getElementById('online-test-area');
    if (!currentOnlineTestState || !testArea) {
         console.error("launchOnlineTestUI Error: Online test state or element missing.");
         displayContent("<p class='text-red-500 p-4'>Error: Could not start the test. Test state missing.</p>");
         return;
    }

    testArea.classList.remove('hidden'); // Show the test area

    const totalQuestions = currentOnlineTestState.questions.length;
    const durationMinutes = currentOnlineTestState.durationMinutes ?? ONLINE_TEST_DURATION_MINUTES; // Use specific duration if set, else default
    const durationMillis = durationMinutes * 60 * 1000;
    currentOnlineTestState.endTime = currentOnlineTestState.startTime + durationMillis;
     currentOnlineTestState.status = 'active'; // Ensure status is active

    // Set the HTML structure for the test UI
    testArea.innerHTML =  `
    <div class="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 p-3 shadow z-40 border-b dark:border-gray-700">
        <div class="container mx-auto flex justify-between items-center">

            <span class="text-lg font-semibold text-primary-600 dark:text-primary-400 truncate max-w-[calc(100% - 250px)]" title="${escapeHtml(currentOnlineTestState.examId)}">
                ${escapeHtml(currentOnlineTestState.courseContext?.isSkipExam ? `Chapter ${currentOnlineTestState.courseContext.chapterNum} Skip Exam` : currentOnlineTestState.examId)}
            </span>
            <div class="flex items-center space-x-4">
                <button id="force-submit-btn" onclick="window.confirmForceSubmit()" class="btn-danger-small hidden flex-shrink-0">Submit Now</button>
                <div id="timer" class="text-lg font-mono px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0">--:--:--</div>
            </div>
        </div>
    </div>
    <div id="question-container" class="pt-20 pb-24 container mx-auto px-4">

        <div class="text-center p-8"><div class="loader animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-4">Loading first question...</p></div>
    </div>
    <div class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-3 shadow-up z-40 border-t dark:border-gray-700">
         <div class="container mx-auto flex justify-between items-center">
             <button id="prev-btn" onclick="window.navigateQuestion(-1)" class="btn-secondary" disabled>
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                 Previous
             </button>
            <span id="question-counter" class="text-sm text-gray-600 dark:text-gray-400">Question 1 / ${totalQuestions}</span>
             <button id="next-btn" onclick="window.navigateQuestion(1)" class="btn-primary">
                 Next
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 ml-1"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
             </button>
             <button id="submit-btn" onclick="window.confirmSubmitOnlineTest()" class="btn-success hidden">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                 Submit Test
             </button>
        </div>
    </div>
    `;

    startTimer(); // Start the countdown
    displayCurrentQuestion(); // Load the first question's content
}

export function startTimer() {
    const timerElement = document.getElementById('timer'); if (!timerElement || !currentOnlineTestState) return;
    if (currentOnlineTestState.timerInterval) { clearInterval(currentOnlineTestState.timerInterval); }
    function updateTimerDisplay() {
        if (!currentOnlineTestState || !currentOnlineTestState.endTime || currentOnlineTestState.status === 'submitting') { if(currentOnlineTestState?.timerInterval) clearInterval(currentOnlineTestState.timerInterval); return; }
        const now = Date.now(); const remaining = currentOnlineTestState.endTime - now;
        if (remaining <= 0) {
            clearInterval(currentOnlineTestState.timerInterval); timerElement.textContent = "00:00:00"; timerElement.classList.add('text-red-500');
            if (currentOnlineTestState.status !== 'submitting') { currentOnlineTestState.status = 'submitting'; alert("Time's up! Submitting test."); submitOnlineTest(); }
        } else {
            const h = Math.floor(remaining / 3600000); const m = Math.floor((remaining % 3600000) / 60000); const s = Math.floor((remaining % 60000) / 1000);
             timerElement.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
             const forceSubmitBtn = document.getElementById('force-submit-btn'); if (forceSubmitBtn) { forceSubmitBtn.classList.toggle('hidden', remaining / 60000 >= 5); }
              timerElement.classList.remove('text-red-500');
        }
    }
    updateTimerDisplay(); currentOnlineTestState.timerInterval = setInterval(updateTimerDisplay, 1000);
}

export async function displayCurrentQuestion() {
    console.log("displayCurrentQuestion START");
    if (!currentOnlineTestState) { console.error("HALTED: currentOnlineTestState is null."); return; }
    const index = currentOnlineTestState.currentQuestionIndex; const questions = currentOnlineTestState.questions;
    // MODIFIED: Check questions is array
    if (index < 0 || !Array.isArray(questions) || questions.length === 0 || index >= questions.length) {
         console.error(`HALTED: Invalid index ${index}/${questions?.length}`);
         const c = document.getElementById('question-container');
         if(c) c.innerHTML = '<p class="text-red-500">Error: Invalid question index.</p>';
         return;
     }
    const question = questions[index]; const container = document.getElementById('question-container'); const totalQuestions = questions.length;
    if (!question || !container) { console.error("HALTED: Missing question object or container."); return; }
    console.log(`Displaying question ${question.id} (Index ${index}) - Type: ${question.isProblem ? 'Problem' : 'MCQ'}`);

    let imageHtml = question.image ? `<img src="${question.image}" alt="Question Image" class="max-w-full h-auto mx-auto my-4 border dark:border-gray-600 rounded" onerror="this.style.display='none';">` : '';
    let answerAreaHtml = '';

    if (question.isProblem) {
         // Display area for problem-solving work
         const currentAnswer = currentOnlineTestState.userAnswers[question.id] || '';
         answerAreaHtml = `
         <div class="mt-4">
             <label for="problem-answer-${question.id}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Answer / Solution Steps:</label>
             <textarea id="problem-answer-${question.id}" name="problemAnswer" rows="8"
                       class="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                       placeholder="Show your work and final answer here..."
                       oninput="window.recordAnswer('${question.id}', this.value)">${escapeHtml(currentAnswer)}</textarea>
              <p class="text-xs text-muted mt-1">Explain your reasoning and show key steps. Use basic text formatting and simple math notation (e.g., ^ for power, * for multiply). Full LaTeX is not supported here.</p>
         </div>`;
    } else {
         // Display MCQ options
         answerAreaHtml = (question.options?.length > 0) ? `<div class="space-y-3 mt-4">` + question.options.map(opt => `
             <label class="flex items-start space-x-3 p-3 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150">
                 <input type="radio" name="mcqOption-${question.id}" value="${opt.letter}" class="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 dark:bg-gray-700 dark:border-gray-600 shrink-0 mt-1" ${currentOnlineTestState.userAnswers[question.id] === opt.letter ? 'checked' : ''} onchange="window.recordAnswer('${question.id}', this.value)">
                 <div class="flex items-baseline w-full"><span class="font-medium w-6 text-right mr-2 shrink-0">${opt.letter}.</span><div class="flex-1 option-text-container">${opt.text}</div></div>
             </label>`).join('') + `</div>` : '<p class="text-sm text-yellow-600 mt-4">(No MC options found)</p>';
    }

    const htmlContent = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-4 animate-fade-in">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Question ${index + 1} / ${totalQuestions} ${question.chapter ? `(Chapter ${question.chapter})` : ''}</p>
        ${imageHtml}
        <div class="prose dark:prose-invert max-w-none mb-4 question-text-container">${question.text}</div>
        ${answerAreaHtml}
    </div>`;

    container.innerHTML = htmlContent; console.log("innerHTML set.");
    try { await renderMathIn(container); console.log("MathJax rendered."); } catch (mathError) { console.error("MathJax render error:", mathError); }
    try {
        document.getElementById('question-counter').textContent = `Question ${index + 1} / ${totalQuestions}`;
        document.getElementById('prev-btn').disabled = (index === 0);
        document.getElementById('next-btn').classList.toggle('hidden', index === totalQuestions - 1);
        document.getElementById('submit-btn').classList.toggle('hidden', index !== totalQuestions - 1);
        console.log("Navigation updated.");
    } catch (e) { console.error("Error updating navigation:", e); }
    console.log("displayCurrentQuestion END");
}

export function navigateQuestion(direction) {
    if (!currentOnlineTestState) return;
    const newIndex = currentOnlineTestState.currentQuestionIndex + direction;
    if (newIndex >= 0 && newIndex < currentOnlineTestState.questions.length) { currentOnlineTestState.currentQuestionIndex = newIndex; displayCurrentQuestion(); }
}

export function recordAnswer(questionId, answer) {
    if (!currentOnlineTestState) return;
    // For text areas, we might want to debounce this later if performance becomes an issue
    console.log(`Answer recorded for ${questionId}: ${answer.substring(0, 50)}...`);
    currentOnlineTestState.userAnswers[questionId] = answer;
}

export function confirmSubmitOnlineTest() {
     if (!currentOnlineTestState) return;
     // Count unanswered questions (null, undefined, or empty string for problems)
    const unanswered = currentOnlineTestState.questions.filter(q => {
        const answer = currentOnlineTestState.userAnswers[q.id];
        return answer === null || answer === undefined || (typeof answer === 'string' && answer.trim() === '');
    }).length;
    let msg = "Submit test?"; if (unanswered > 0) msg += `\n\n${unanswered} unanswered question(s).`;
    if (confirm(msg)) submitOnlineTest();
}
export function confirmForceSubmit() { if (confirm("Submit test now?")) submitOnlineTest(); }

/**
 * Handles the final submission of the online test, including AI marking and result storage.
 */
export async function submitOnlineTest() {
    if (!currentOnlineTestState || currentOnlineTestState.status === 'submitting' || !currentUser) {
        if (currentOnlineTestState?.status !== 'submitting') { alert("Error: Missing test data or user session."); }
        console.error("Submit Error: State missing or already submitting.");
        hideLoading();
        return;
    }
    const isCourseActivity = !!currentOnlineTestState.courseContext?.isCourseActivity;
    const isSkipExam = currentOnlineTestState.courseContext?.activityType === 'skip_exam';
    const courseId = currentOnlineTestState.courseContext?.courseId;
    const activityType = currentOnlineTestState.courseContext?.activityType || 'practice'; // Default to 'practice'
    const activityId = currentOnlineTestState.courseContext?.activityId;
    const chapterNumForSkipExam = currentOnlineTestState.courseContext?.chapterNum;

    showLoading("Submitting and marking exam...");
    currentOnlineTestState.status = 'submitting';
    if (currentOnlineTestState.timerInterval) clearInterval(currentOnlineTestState.timerInterval);
    currentOnlineTestState.timerInterval = null;
    document.getElementById('online-test-area')?.classList.add('hidden');
    await new Promise(resolve => setTimeout(resolve, 100)); // Short delay for UI

    try {
        console.log(`Submitting exam ${currentOnlineTestState.examId} of type ${activityType}`);
        // Store and mark the exam using the centralized function
        // MODIFIED: Pass courseId to storeExamResult
        const examRecord = await storeExamResult(
            courseId,
            currentOnlineTestState,
            activityType
        );

        if (!examRecord || !examRecord.markingResults) {
            // Error already logged and alerted inside storeExamResult if it failed there
             hideLoading(); // Make sure loading is hidden
             // Attempt to navigate back gracefully
              if (isCourseActivity && courseId) {
                  window.showCurrentAssignmentsExams?.(courseId);
              } else {
                  showTestGenerationDashboard();
              }
             return; // Stop processing if storing/marking failed
        }
        hideLoading(); // Hide loading *after* marking and storage attempt SUCCEEDS

        // Display results UI using the stored/marked record
        displayOnlineTestResults(examRecord); // Pass the full record

        // Post-submission logic (like marking chapter studied)
        if (isSkipExam && chapterNumForSkipExam && courseId && examRecord.markingResults.maxPossibleScore > 0) {
            const percentage = (examRecord.markingResults.totalScore / examRecord.markingResults.maxPossibleScore) * 100;

            // Update skip exam score in progress data
            const progress = userCourseProgressMap.get(courseId);
            if (progress) {
                 progress.lastSkipExamScore = progress.lastSkipExamScore || {};
                 progress.lastSkipExamScore[chapterNumForSkipExam] = percentage;
                 progress.skipExamAttempts = progress.skipExamAttempts || {};
                 progress.skipExamAttempts[chapterNumForSkipExam] = (progress.skipExamAttempts[chapterNumForSkipExam] || 0) + 1;

                 // Log attempt pass/fail in daily progress
                 const todayStr = getFormattedDate();
                 progress.dailyProgress = progress.dailyProgress || {};
                 progress.dailyProgress[todayStr] = progress.dailyProgress[todayStr] || { chaptersStudied: [], skipExamsPassed: [], assignmentCompleted: false, assignmentScore: null };

                 if (percentage >= SKIP_EXAM_PASSING_PERCENT) {
                     console.log(`Skip exam passed (${percentage.toFixed(1)}%). Marking chapter ${chapterNumForSkipExam} as studied.`);
                     await markChapterStudiedInCourse(currentUser.uid, courseId, chapterNumForSkipExam, "skip_exam_passed"); // This also saves progress
                 } else {
                     console.log(`Skip exam not passed (${percentage.toFixed(1)}% < ${SKIP_EXAM_PASSING_PERCENT}%).`);
                      // Save progress even on fail to record score/attempt count
                      await saveUserCourseProgress(currentUser.uid, courseId, progress);
                 }
            }
        } else if (!isCourseActivity && currentSubject) {
             // Update standard test gen subject data (remove used questions)
             let chaptersDataModified = false;
             if (examRecord.questions) {
                 examRecord.questions.forEach(q => {
                      // MODIFIED: Only remove MCQs from standard pool
                      if (!q.isProblem) {
                           const globalChap = currentSubject.chapters[q.chapter];
                           if (globalChap?.available_questions?.includes(q.number)) {
                                const qIndex = globalChap.available_questions.indexOf(q.number);
                                if (qIndex > -1) {
                                     globalChap.available_questions.splice(qIndex, 1);
                                     chaptersDataModified = true;
                                }
                           }
                      }
                 });
             }
             if (chaptersDataModified) {
                  Object.values(currentSubject.chapters).forEach(chap => chap.available_questions?.sort((a,b) => a-b));
                  await saveUserData(currentUser.uid); // Save updated appData
                  console.log("Removed used MCQs from standard test gen pool.");
             }
        }

        setCurrentOnlineTestState(null); // Clear the state after successful submission and processing

    } catch (error) {
        hideLoading();
        setCurrentOnlineTestState(null); // Clear state even on error
        console.error("Error finishing test:", error);
        alert("Error submitting test results. Please try again later. " + error.message);
        // Navigate back appropriately
        if (isCourseActivity && courseId) {
            window.showCurrentAssignmentsExams?.(courseId); // Use optional chaining
        } else {
             showTestGenerationDashboard();
        }
    }
}

/**
 * Displays the results page after an online test is submitted and marked.
 * @param {object} examRecord - The complete exam record, including markingResults.
 */
export async function displayOnlineTestResults(examRecord) { // Made async for MathJax
    clearContent(); // Clear previous content
    if (!examRecord || !examRecord.markingResults) {
         console.error("Cannot display results: Invalid examRecord or missing markingResults.");
         displayContent('<p class="text-red-500 p-4">Error displaying test results.</p>');
         return;
    }

    const { examId, markingResults, courseContext, timestamp } = examRecord;
    // Use stored questions if available, otherwise use from markingResults (should be same)
    const questions = examRecord.questions || markingResults.questionResults?.map(qr => examData.questions.find(q => q.id === qr.questionId)) || [];
    const score = markingResults.totalScore;
    const maxScore = markingResults.maxPossibleScore;
    const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : 0;
    const date = new Date(timestamp).toLocaleString();
    const isCourse = courseContext?.isCourseActivity ?? false;
    const isSkip = courseContext?.activityType === 'skip_exam';
    const courseId = courseContext?.courseId;
    // *** MODIFIED: Use imported config values ***
    const passThreshold = isSkip ? SKIP_EXAM_PASSING_PERCENT : PASSING_GRADE_PERCENT;
    const isPassing = parseFloat(percentage) >= passThreshold; // Use parseFloat for comparison
    const courseName = isCourse && courseId ? (globalCourseDataMap.get(courseId)?.name || courseId) : 'Standard Test';
    const durationMinutes = examRecord.durationMinutes;

    // *** MODIFIED: Changed 'html' to 'resultsHtml' ***
    const resultsHtml = `
        <div class="space-y-6 animate-fade-in max-w-3xl mx-auto">
            <div class="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700">
                <h2 class="text-2xl font-bold mb-2">Exam Results</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Exam ID: ${escapeHtml(examId)}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Completed: ${date} ${durationMinutes ? `(${durationMinutes} min)` : ''}</p>
                <div class="text-5xl font-bold ${isPassing ? 'text-green-600' : 'text-red-600'} mb-2">
                    ${percentage}%
                </div>
                <p class="text-lg text-gray-600 dark:text-gray-400 mb-2">
                    ${score.toFixed(1)} out of ${maxScore.toFixed(1)} points
                </p>
                <p class="text-xl font-semibold ${isPassing ? 'text-green-600' : 'text-red-600'}">
                    ${isPassing ? 'PASS' : 'FAIL'} ${isSkip ? `(Threshold: ${passThreshold}%)` : `(Threshold: ${PASSING_GRADE_PERCENT}%)`}
                </p>
                 ${isSkip && isPassing ? `<p class="text-sm text-green-600 mt-1">Chapter ${courseContext.chapterNum} marked as studied!</p>` : ''}
                 ${isSkip && !isPassing ? `<p class="text-sm text-red-600 mt-1">Needed ${passThreshold}% to pass the skip exam.</p>` : ''}
            </div>

            <!-- Overall Feedback -->
            ${markingResults.overallFeedback ? `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700">
                <h3 class="text-lg font-semibold mb-4">Overall AI Feedback</h3>
                <div class="space-y-4 text-sm">
                    <p class="text-gray-700 dark:text-gray-300">${escapeHtml(markingResults.overallFeedback.overall_feedback || 'N/A')}</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 class="font-medium text-green-600 mb-2">Strengths</h4>
                            <ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                                ${markingResults.overallFeedback.strengths?.map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li>N/A</li>'}
                            </ul>
                        </div>
                        <div>
                            <h4 class="font-medium text-red-600 mb-2">Areas for Improvement</h4>
                            <ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                                ${markingResults.overallFeedback.weaknesses?.map(w => `<li>${escapeHtml(w)}</li>`).join('') || '<li>N/A</li>'}
                            </ul>
                        </div>
                    </div>
                    ${markingResults.overallFeedback.study_recommendations ? `
                    <div class="mt-4">
                        <h4 class="font-medium text-blue-600 mb-2">Study Recommendations</h4>
                        <ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                            ${markingResults.overallFeedback.study_recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('') || '<li>N/A</li>'}
                        </ul>
                    </div>` : '' }
                </div>
            </div>
            ` : '<p class="text-muted italic text-center my-4">No overall feedback available.</p>'}


            <div class="flex justify-center gap-4 flex-wrap">
                <button onclick="window.showExamReviewUI('${currentUser.uid}', '${examId}')" class="btn-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-1"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.18l.879-.879a1.651 1.651 0 0 1 2.336 0l.879.879a1.651 1.651 0 0 0 2.336 0l.879-.879a1.651 1.651 0 0 1 2.336 0l.879.879a1.651 1.651 0 0 0 2.336 0l.879-.879a1.651 1.651 0 0 1 2.336 0l.879.879a1.651 1.651 0 0 1 0 1.18l-.879.879a1.651 1.651 0 0 1-2.336 0l-.879-.879a1.651 1.651 0 0 0-2.336 0l-.879.879a1.651 1.651 0 0 1-2.336 0l-.879-.879a1.651 1.651 0 0 0-2.336 0l-.879.879a1.651 1.651 0 0 1-2.336 0l-.879-.879Zm16.471-1.591a.151.151 0 0 0-.212 0l-.879.879a.151.151 0 0 1-.212 0l-.879-.879a.151.151 0 0 0-.212 0l-.879.879a.151.151 0 0 1-.212 0l-.879-.879a.151.151 0 0 0-.212 0l-.879.879a.151.151 0 0 1-.212 0l-.879-.879a.151.151 0 0 0-.212 0l-.879.879a.151.151 0 0 1-.212 0l-.879-.879a.151.151 0 0 0-.212 0l-.879.879a.151.151 0 0 1-.212 0l-.879-.879a.151.151 0 0 0-.212 0A.15.15 0 0 0 .452 9l.879.879a.151.151 0 0 0 .212 0l.879-.879a.151.151 0 0 1 .212 0l.879.879a.151.151 0 0 0 .212 0l.879-.879a.151.151 0 0 1 .212 0l.879.879a.151.151 0 0 0 .212 0l.879-.879a.151.151 0 0 1 .212 0l.879.879a.151.151 0 0 0 .212 0l.879-.879a.151.151 0 0 1 .212 0l.879.879a.15.15 0 0 0 .212 0Z" clip-rule="evenodd" /></svg>
                    View Detailed Review
                </button>
                <button onclick="${isCourse ? `window.showCurrentAssignmentsExams('${courseId}')` : 'window.showExamsDashboard()'}" class="btn-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
                    ${isCourse ? 'Back to Course Exams' : 'View All Standard Exams'}
                </button>
                 ${!isCourse ? `<button onclick="window.showTestGenerationDashboard()" class="btn-secondary"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>Generate New Test</button>` : ''}
            </div>
        </div>`;
    // MODIFIED: Target main content area & use correct variable name
    displayContent(resultsHtml, 'content'); // Display in the main content area
    setActiveSidebarLink(isCourse ? 'showCurrentAssignmentsExams' : 'showExamsDashboard', isCourse ? 'sidebar-course-nav' : 'sidebar-standard-nav');

    // Render math in the overall feedback if needed (unlikely but possible)
    const overallFeedbackArea = document.querySelector('.overall-feedback-area'); // Add a class if needed
    if (overallFeedbackArea) await renderMathIn(overallFeedbackArea);
}

// Add window functions for the UI review/report buttons
window.showExamReviewUI = showExamReviewUI; // Use the imported function directly
window.showIssueReportingModal = showIssueReportingModal;
window.submitIssueReport = submitIssueReport;


// Export the state setter
export { setCurrentOnlineTestState };

// --- END OF FILE ui_online_test.js ---