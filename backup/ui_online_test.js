// --- START OF FILE ui_online_test.js ---

import { currentOnlineTestState, setCurrentOnlineTestState, currentSubject, currentUser, data, setData, activeCourseId, userCourseProgressMap, globalCourseDataMap } from './state.js'; // Added globalCourseDataMap
import { displayContent, clearContent } from './ui_core.js';
import { showLoading, hideLoading, renderMathIn } from './utils.js';
// MODIFIED: Added markChapterStudiedInCourse and saveUserCourseProgress
import { saveUserData, markChapterStudiedInCourse, saveUserCourseProgress } from './firebase_firestore.js';
import { showTestGenerationDashboard } from './ui_test_generation.js';
import { showExamDetails, showExamsDashboard } from './ui_exams_dashboard.js';
// MODIFIED: Added SKIP_EXAM_PASSING_PERCENT
import { ONLINE_TEST_DURATION_MINUTES, SKIP_EXAM_PASSING_PERCENT } from './config.js';

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
            
            <span class="text-lg font-semibold text-primary-600 dark:text-primary-400 truncate max-w-[calc(100% - 250px)]" title="${currentOnlineTestState.examId}">
                ${currentOnlineTestState.courseContext?.isSkipExam ? `Chapter ${currentOnlineTestState.courseContext.chapterNum} Skip Exam` : currentOnlineTestState.examId}
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
    if (index < 0 || !questions?.length || index >= questions.length) { console.error(`HALTED: Invalid index ${index}/${questions?.length}`); const c = document.getElementById('question-container'); if(c) c.innerHTML = '<p class="text-red-500">Error: Invalid question index.</p>'; return; }
    const question = questions[index]; const container = document.getElementById('question-container'); const totalQuestions = questions.length;
    if (!question || !container) { console.error("HALTED: Missing question object or container."); return; }
    console.log(`Displaying question ${question.id} (Index ${index})`);
    let imageHtml = question.image ? `<img src="${question.image}" alt="Question Image" class="max-w-full h-auto mx-auto my-4 border dark:border-gray-600 rounded" onerror="this.style.display='none';">` : '';
    let optionsHtml = (question.options?.length > 0) ? question.options.map(opt => `
        <label class="flex items-start space-x-3 p-3 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150">
            <input type="radio" name="mcqOption" value="${opt.letter}" class="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 dark:bg-gray-700 dark:border-gray-600 shrink-0 mt-1" ${currentOnlineTestState.userAnswers[question.id] === opt.letter ? 'checked' : ''} onchange="window.recordAnswer('${question.id}', this.value)">
            <div class="flex items-baseline w-full"><span class="font-medium w-6 text-right mr-2 shrink-0">${opt.letter}.</span><div class="flex-1 option-text-container">${opt.text}</div></div>
        </label>`).join('') : '<p class="text-sm text-yellow-600">(No MC options found)</p>';
    const htmlContent = `<div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-4 animate-fade-in"><p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Chapter ${question.chapter} - Question ${question.number}</p>${imageHtml}<div class="prose dark:prose-invert max-w-none mb-4 question-text-container">${question.text}</div><div class="space-y-3">${optionsHtml}</div></div>`;
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
    console.log(`Answer recorded for ${questionId}: ${answer}`);
    currentOnlineTestState.userAnswers[questionId] = answer;
}

export function confirmSubmitOnlineTest() {
     if (!currentOnlineTestState) return;
    const unanswered = currentOnlineTestState.questions.filter(q => !currentOnlineTestState.userAnswers[q.id]).length;
    let msg = "Submit test?"; if (unanswered > 0) msg += `\n\n${unanswered} unanswered question(s).`;
    if (confirm(msg)) submitOnlineTest();
}
export function confirmForceSubmit() { if (confirm("Submit test now?")) submitOnlineTest(); }

export async function submitOnlineTest() {
    if (!currentOnlineTestState || currentOnlineTestState.status === 'submitting' || !currentUser) { if (currentOnlineTestState?.status !== 'submitting') alert("Error: Missing data."); console.error("Submit Error: State missing or already submitting."); hideLoading(); return; }
    const isCourseActivity = !!currentOnlineTestState.courseContext?.isCourseActivity; const isSkipExam = !!currentOnlineTestState.courseContext?.isSkipExam; const courseId = currentOnlineTestState.courseContext?.courseId; const activityType = currentOnlineTestState.courseContext?.activityType; const activityId = currentOnlineTestState.courseContext?.activityId; const chapterNumForSkipExam = currentOnlineTestState.courseContext?.chapterNum;
    // MODIFIED: Get subjectId safely for both course and standard tests
    let subjectIdForResults = null;
    if (isCourseActivity && courseId) { subjectIdForResults = globalCourseDataMap.get(courseId)?.relatedSubjectId; }
    else if (currentSubject) { subjectIdForResults = currentSubject.id; }
    if (!subjectIdForResults) { alert("Error: Cannot determine subject ID for saving results."); hideLoading(); return; }
    // MODIFIED: Check for data only if it's a standard test
    if (!isCourseActivity && (!currentSubject || !data)) { alert("Error submitting standard test: Subject data missing."); hideLoading(); return; }

    showLoading("Submitting and Grading..."); currentOnlineTestState.status = 'submitting';
    if (currentOnlineTestState.timerInterval) clearInterval(currentOnlineTestState.timerInterval); currentOnlineTestState.timerInterval = null;
    document.getElementById('online-test-area')?.classList.add('hidden');
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const results = { examId: currentOnlineTestState.examId, subjectId: subjectIdForResults, timestamp: new Date().toISOString(), durationMinutes: Math.round((Date.now() - currentOnlineTestState.startTime) / 60000), type: 'online', questions: [], score: 0, totalQuestions: currentOnlineTestState.questions.length, courseContext: currentOnlineTestState.courseContext || null, resultsByChapter: {} };
        let totalCorrect = 0; let chaptersDataModified = false;
        currentOnlineTestState.questions.forEach(q => { if (!results.resultsByChapter[q.chapter]) results.resultsByChapter[q.chapter] = { attempted: 0, correct: 0, wrong: 0 }; });

        currentOnlineTestState.questions.forEach(q => {
            const userAnswer = currentOnlineTestState.userAnswers[q.id] || null; const correctAnswer = currentOnlineTestState.correctAnswers[q.id]; const isCorrect = userAnswer === correctAnswer;
            results.questions.push({ id: q.id, chapter: q.chapter, number: q.number, text: q.text, options: q.options, image: q.image, userAnswer: userAnswer, correctAnswer: correctAnswer, isCorrect: isCorrect });
            const chapResult = results.resultsByChapter[q.chapter];
            if (chapResult) { chapResult.attempted++; if (isCorrect) { chapResult.correct++; totalCorrect++; } else { chapResult.wrong++; } }
            // Remove from available pool ONLY for standard tests
             if (!isCourseActivity && currentSubject) {
                 const globalChap = currentSubject.chapters[q.chapter];
                 if (globalChap?.available_questions) {
                      const qIndex = globalChap.available_questions.indexOf(q.number);
                      if (qIndex > -1) { globalChap.available_questions.splice(qIndex, 1); chaptersDataModified = true; }
                      // else { console.warn(`Std Test Q ${q.id} not in available pool.`); }
                 } // else { console.error(`Std Test Ch ${q.chapter} missing.`); }
             }
        });

        // Update standard test stats
         if (!isCourseActivity && currentSubject) {
            for (const chapNum in results.resultsByChapter) {
                 const globalChap = currentSubject.chapters[chapNum]; const chapResult = results.resultsByChapter[chapNum];
                 if (globalChap && chapResult) {
                     const numWrong = chapResult.wrong; globalChap.mistake_history = globalChap.mistake_history || []; globalChap.mistake_history.push(numWrong); if (globalChap.mistake_history.length > 20) globalChap.mistake_history.shift();
                     globalChap.consecutive_mastery = (numWrong === 0 && chapResult.attempted > 0) ? (globalChap.consecutive_mastery || 0) + 1 : 0;
                     chaptersDataModified = true;
                 }
            }
             if (chaptersDataModified) { Object.values(currentSubject.chapters).forEach(chap => chap.available_questions?.sort((a, b) => a - b)); }
        }

        results.score = totalCorrect; const scorePercentage = results.totalQuestions > 0 ? (results.score / results.totalQuestions) * 100 : 0;

        // --- Save Results ---
        if (isCourseActivity && courseId) {
            const progress = userCourseProgressMap.get(courseId);
            if (progress) {
                 switch (activityType) {
                      case 'skip_exam': progress.skipExamAttempts = progress.skipExamAttempts || {}; progress.lastSkipExamScore = progress.lastSkipExamScore || {}; progress.skipExamAttempts[chapterNumForSkipExam] = (progress.skipExamAttempts[chapterNumForSkipExam] || 0) + 1; progress.lastSkipExamScore[chapterNumForSkipExam] = scorePercentage; progress.skipExamScores = progress.skipExamScores || {}; progress.skipExamScores[chapterNumForSkipExam] = scorePercentage; break;
                      case 'assignment': progress.assignmentScores = progress.assignmentScores || {}; progress.assignmentScores[activityId] = scorePercentage; break;
                      case 'weekly_exam': progress.weeklyExamScores = progress.weeklyExamScores || {}; progress.weeklyExamScores[activityId] = scorePercentage; break;
                      case 'midcourse': progress.midcourseExamScores = progress.midcourseExamScores || {}; progress.midcourseExamScores[activityId] = scorePercentage; break;
                      case 'final': progress.finalExamScores = progress.finalExamScores || []; const finalIndex = parseInt(activityId.replace('final', '')) - 1; if (finalIndex >= 0 && finalIndex < 3) { while (progress.finalExamScores.length <= finalIndex) progress.finalExamScores.push(null); progress.finalExamScores[finalIndex] = scorePercentage; } break;
                      default: console.warn("Unknown course activity type:", activityType);
                 }
                 updateUserCourseProgress(courseId, progress); await saveUserCourseProgress(currentUser.uid, courseId, progress);
                 console.log(`Course progress updated for ${activityType} ${activityId}.`);
                 if (isSkipExam && scorePercentage >= SKIP_EXAM_PASSING_PERCENT) { await markChapterStudiedInCourse(currentUser.uid, courseId, chapterNumForSkipExam, "skip_exam_pass"); }
                 else if (isSkipExam) { console.log(`Skip exam Ch ${chapterNumForSkipExam} not passed (${scorePercentage}% < ${SKIP_EXAM_PASSING_PERCENT}%).`); alert(`Score: ${scorePercentage.toFixed(1)}%. Needed ${SKIP_EXAM_PASSING_PERCENT}% to pass.`); }
            } else { console.error(`Progress data missing for course ${courseId}.`); }
        } else if (currentSubject) { // Save standard test history
             currentSubject.exam_history = currentSubject.exam_history || []; currentSubject.exam_history.push(results);
             await saveUserData(currentUser.uid); console.log("Standard test results saved.");
        }

        hideLoading(); displayOnlineTestResults(results); setCurrentOnlineTestState(null);
    } catch (error) {
         console.error("Error during submission:", error); hideLoading(); setCurrentOnlineTestState(null);
         alert("Error submitting results: " + error.message);
         if (isCourseActivity) { window.showCurrentAssignmentsExams?.(courseId); } else { showTestGenerationDashboard(); }
    }
}

export function displayOnlineTestResults(results) {
    clearContent();
    const scorePercentage = results.totalQuestions > 0 ? ((results.score / results.totalQuestions) * 100).toFixed(1) : 0;
    const date = new Date(results.timestamp).toLocaleString();
    const isCourse = results.courseContext?.isCourseActivity ?? false;
    const isSkip = results.courseContext?.isSkipExam ?? false;
    const courseId = results.courseContext?.courseId;

    let chapterSummaryHtml = Object.entries(results.resultsByChapter).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([chapNum, chapRes]) => { const perc = chapRes.attempted > 0 ? ((chapRes.correct / chapRes.attempted) * 100).toFixed(1) : 0; const color = chapRes.wrong > 0 ? 'text-red-500' : 'text-green-500'; return `<li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"><span class="font-medium">Chapter ${chapNum}</span><span class="font-semibold ${color}">${chapRes.correct}/${chapRes.attempted} (${perc}%)</span></li>`; }).join('');

    let examIndexInHistory = -1;
    if(!isCourse && currentSubject?.exam_history) { examIndexInHistory = currentSubject.exam_history.findIndex(exam => exam.examId === results.examId && exam.timestamp === results.timestamp); }

     let reviewHtml = '';
     if (!isCourse && examIndexInHistory > -1) { reviewHtml = `<div class="p-3 border dark:border-gray-600 rounded mb-2 bg-white dark:bg-gray-800 shadow-sm text-center"><button onclick="window.showExamDetailsWrapper(${examIndexInHistory})" class="text-sm text-blue-600 hover:underline dark:text-blue-400 mt-2 inline-flex items-center"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639l4.458-4.458a1.012 1.012 0 0 1 1.414 0l4.458 4.458a1.012 1.012 0 0 1 0 .639l-4.458 4.458a1.012 1.012 0 0 1-1.414 0l-4.458-4.458Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>View Full Exam Details</button></div>`; }
     else if (isCourse) { reviewHtml = `<p class="text-sm text-gray-600 italic p-4 text-center bg-gray-100 dark:bg-gray-700 rounded">Detailed review for course activities is currently unavailable.</p>`; }
     else { reviewHtml = `<p class="text-sm text-gray-600 italic p-4 text-center bg-gray-100 dark:bg-gray-700 rounded">Error finding exam in history.</p>`; }

    const html = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4 animate-fade-in max-w-2xl mx-auto">
            <h2 class="text-2xl font-semibold mb-4 text-center text-primary-600 dark:text-primary-400">Test Results: ${isSkip ? `Chapter ${results.courseContext.chapterNum} Skip Exam` : results.examId}</h2>
             <p class="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">${date}</p>
            <div class="text-center mb-6">
                 <p class="text-4xl font-bold ${scorePercentage >= (isSkip ? SKIP_EXAM_PASSING_PERCENT : 70) ? 'text-green-500' : scorePercentage >= 50 ? 'text-yellow-500' : 'text-red-500'}">${results.score} / ${results.totalQuestions} (${scorePercentage}%)</p>
                 ${isSkip ? `<p class="text-sm font-medium ${scorePercentage >= SKIP_EXAM_PASSING_PERCENT ? 'text-green-600' : 'text-red-600'}">${scorePercentage >= SKIP_EXAM_PASSING_PERCENT ? 'Passed - Chapter Marked as Studied!' : `Failed (Needed ${SKIP_EXAM_PASSING_PERCENT}%)`}</p>` : ''}
                 ${results.durationMinutes ? `<p class="text-gray-600 dark:text-gray-400 mt-1">Duration: ${results.durationMinutes} min</p>`: ''}
            </div>
            ${chapterSummaryHtml ? `<div class="mb-6"><h3 class="text-lg font-semibold mb-2">Chapter Performance</h3><ul class="space-y-1">${chapterSummaryHtml}</ul></div>` : ''}
            <div class="mb-6"><h3 class="text-lg font-semibold mb-2">Review</h3>${reviewHtml}</div>
             <button onclick="${isCourse ? `window.showCurrentAssignmentsExams('${courseId}')` : 'window.showExamsDashboard()'}" class="w-full btn-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
                ${isCourse ? 'Back to Course Exams' : 'View All Standard Exams'}
            </button>
            ${!isCourse ? `<button onclick="window.showTestGenerationDashboard()" class="w-full btn-primary mt-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>Generate Another Test</button>` : ''}
        </div>`;
    displayContent(html);
}

// Export the state setter
export { setCurrentOnlineTestState };

// --- END OF FILE ui_online_test.js ---