// --- START OF FILE ui_online_test.js ---

// CORRECTED: Added updateUserCourseProgress import
import { currentOnlineTestState, setCurrentOnlineTestState, currentSubject, currentUser, data, setData, activeCourseId, userCourseProgressMap, globalCourseDataMap, updateUserCourseProgress } from './state.js'; // Added globalCourseDataMap and updateUserCourseProgress
import { displayContent, clearContent } from './ui_core.js';
import { showLoading, hideLoading, renderMathIn } from './utils.js';
// MODIFIED: Added markChapterStudiedInCourse and saveUserCourseProgress
import { saveUserData, markChapterStudiedInCourse, saveUserCourseProgress, saveCourseExamResult } from './firebase_firestore.js'; // Added saveCourseExamResult
import { showTestGenerationDashboard } from './ui_test_generation.js';
import { showExamDetails, showExamsDashboard } from './ui_exams_dashboard.js';
// MODIFIED: Added SKIP_EXAM_PASSING_PERCENT
import { ONLINE_TEST_DURATION_MINUTES, SKIP_EXAM_PASSING_PERCENT } from './config.js';
// NEW: Import function to show course exam details
import { showCourseExamDetails } from './ui_course_exam_review.js'; // Assuming this new file exists

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

    // Handle combined list of questions and problems
    const allItems = [...(currentOnlineTestState.questions || []), ...(currentOnlineTestState.problems || [])];
    const totalItems = allItems.length;
    // Assign the combined list back for consistent indexing if problems exist
    currentOnlineTestState.items = allItems; // Use 'items' for combined list

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
        <div class="text-center p-8"><div class="loader animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-4">Loading first item...</p></div>
    </div>
    <div class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-3 shadow-up z-40 border-t dark:border-gray-700">
         <div class="container mx-auto flex justify-between items-center">
             <button id="prev-btn" onclick="window.navigateQuestion(-1)" class="btn-secondary" disabled>
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                 Previous
             </button>
            <span id="question-counter" class="text-sm text-gray-600 dark:text-gray-400">Item 1 / ${totalItems}</span>
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
    displayCurrentQuestion(); // Load the first item's content
}

export function startTimer() {
    // ... (no changes needed in this function) ...
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
    const index = currentOnlineTestState.currentQuestionIndex;
    // Use the combined 'items' list
    const items = currentOnlineTestState.items;
    if (index < 0 || !items?.length || index >= items.length) { console.error(`HALTED: Invalid index ${index}/${items?.length}`); const c = document.getElementById('question-container'); if(c) c.innerHTML = '<p class="text-red-500">Error: Invalid item index.</p>'; return; }
    const item = items[index];
    const container = document.getElementById('question-container');
    const totalItems = items.length;
    if (!item || !container) { console.error("HALTED: Missing item object or container."); return; }
    console.log(`Displaying item ${item.id} (Index ${index}), Type: ${item.type}`);

    let imageHtml = item.image ? `<img src="${item.image}" alt="Question Image" class="max-w-full h-auto mx-auto my-4 border dark:border-gray-600 rounded" onerror="this.style.display='none';">` : '';
    let answerAreaHtml = '';

    // Determine if it's an MCQ or Problem
    if (item.type === 'mcq') {
         answerAreaHtml = (item.options?.length > 0) ? item.options.map(opt => `
            <label class="flex items-start space-x-3 p-3 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150">
                <input type="radio" name="mcqOption" value="${opt.letter}" class="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 dark:bg-gray-700 dark:border-gray-600 shrink-0 mt-1" ${currentOnlineTestState.userAnswers[item.id] === opt.letter ? 'checked' : ''} onchange="window.recordAnswer('${item.id}', this.value)">
                <div class="flex items-baseline w-full"><span class="font-medium w-6 text-right mr-2 shrink-0">${opt.letter}.</span><div class="flex-1 option-text-container">${opt.text}</div></div>
            </label>`).join('') : '<p class="text-sm text-yellow-600">(No MC options found)</p>';
        answerAreaHtml = `<div class="space-y-3">${answerAreaHtml}</div>`;
    } else if (item.type === 'problem') {
         const currentAnswerText = currentOnlineTestState.userAnswers[item.id] || '';
         answerAreaHtml = `
            <div>
                 <label for="problem-answer-${item.id}" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Your Answer:</label>
                 <textarea id="problem-answer-${item.id}" rows="6" class="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Enter your detailed answer or solution steps here..." oninput="window.recordAnswer('${item.id}', this.value)">${escapeHtml(currentAnswerText)}</textarea>
                 <p class="text-xs text-muted mt-1">Provide a clear explanation and show your work if applicable.</p>
            </div>
        `;
    } else {
        console.warn(`Unknown item type for ${item.id}: ${item.type}`);
        answerAreaHtml = '<p class="text-sm text-red-500">(Error: Unknown question type)</p>';
    }

    const htmlContent = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-4 animate-fade-in">
             <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Chapter ${item.chapter} - ${item.type === 'mcq' ? 'Question' : 'Problem'} ${item.number}
             </p>
             ${imageHtml}
             <div class="prose dark:prose-invert max-w-none mb-4 question-text-container">${item.text}</div>
             ${answerAreaHtml}
        </div>`;

    container.innerHTML = htmlContent; console.log("innerHTML set.");
    try { await renderMathIn(container); console.log("MathJax rendered."); } catch (mathError) { console.error("MathJax render error:", mathError); }
    try {
        document.getElementById('question-counter').textContent = `Item ${index + 1} / ${totalItems}`;
        document.getElementById('prev-btn').disabled = (index === 0);
        document.getElementById('next-btn').classList.toggle('hidden', index === totalItems - 1);
        document.getElementById('submit-btn').classList.toggle('hidden', index !== totalItems - 1);
        console.log("Navigation updated.");
    } catch (e) { console.error("Error updating navigation:", e); }
    console.log("displayCurrentQuestion END");
}

export function navigateQuestion(direction) {
    if (!currentOnlineTestState) return;
    const newIndex = currentOnlineTestState.currentQuestionIndex + direction;
    // Use combined 'items' list length
    if (newIndex >= 0 && newIndex < currentOnlineTestState.items.length) {
        currentOnlineTestState.currentQuestionIndex = newIndex;
        displayCurrentQuestion();
    }
}

// Modified to handle both radio and textarea inputs
export function recordAnswer(itemId, answerValue) {
    if (!currentOnlineTestState) return;
    // Don't log potentially long text answers fully
    const logValue = typeof answerValue === 'string' && answerValue.length > 50 ? answerValue.substring(0, 50) + '...' : answerValue;
    console.log(`Answer recorded for ${itemId}: ${logValue}`);
    currentOnlineTestState.userAnswers[itemId] = answerValue;
}

export function confirmSubmitOnlineTest() {
     if (!currentOnlineTestState) return;
     // Check unanswered based on combined 'items' list
    const unanswered = currentOnlineTestState.items.filter(q => !currentOnlineTestState.userAnswers[q.id]).length;
    let msg = "Submit test?"; if (unanswered > 0) msg += `\n\n${unanswered} unanswered item(s).`;
    if (confirm(msg)) submitOnlineTest();
}
export function confirmForceSubmit() { if (confirm("Submit test now?")) submitOnlineTest(); }

export async function submitOnlineTest() {
    if (!currentOnlineTestState || currentOnlineTestState.status === 'submitting' || !currentUser) { if (currentOnlineTestState?.status !== 'submitting') alert("Error: Missing data."); console.error("Submit Error: State missing or already submitting."); hideLoading(); return; }
    const isCourseActivity = !!currentOnlineTestState.courseContext?.isCourseActivity;
    const isSkipExam = !!currentOnlineTestState.courseContext?.isSkipExam;
    const courseId = currentOnlineTestState.courseContext?.courseId;
    const activityType = currentOnlineTestState.courseContext?.activityType;
    const activityId = currentOnlineTestState.courseContext?.activityId;
    const chapterNumForSkipExam = currentOnlineTestState.courseContext?.chapterNum;

    // Determine Subject ID for saving results
    let subjectIdForResults = null;
    if (isCourseActivity && courseId) { subjectIdForResults = globalCourseDataMap.get(courseId)?.relatedSubjectId; }
    else if (currentSubject) { subjectIdForResults = currentSubject.id; }
    if (!subjectIdForResults) { alert("Error: Cannot determine subject ID for saving results."); hideLoading(); return; }

    // Check for standard test data only if it's NOT a course activity
    if (!isCourseActivity && (!currentSubject || !data)) { alert("Error submitting standard test: Subject data missing."); hideLoading(); return; }

    showLoading("Submitting and Grading..."); currentOnlineTestState.status = 'submitting';
    if (currentOnlineTestState.timerInterval) clearInterval(currentOnlineTestState.timerInterval); currentOnlineTestState.timerInterval = null;
    document.getElementById('online-test-area')?.classList.add('hidden');
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const items = currentOnlineTestState.items; // Use combined list
        const results = {
            examId: currentOnlineTestState.examId,
            subjectId: subjectIdForResults,
            timestamp: new Date().toISOString(),
            durationMinutes: Math.round((Date.now() - currentOnlineTestState.startTime) / 60000),
            type: 'online', // Still 'online' type, but contains mixed items
            items: [], // Store all items (MCQs and Problems)
            score: 0, // Score initially based only on MCQs
            totalItems: items.length,
            totalMcqItems: 0, // Track count of MCQs for percentage
            courseContext: currentOnlineTestState.courseContext || null,
            resultsByChapter: {}
        };
        let totalCorrectMCQs = 0;
        let chaptersDataModified = false;

        // Initialize resultsByChapter structure
        items.forEach(item => { if (!results.resultsByChapter[item.chapter]) results.resultsByChapter[item.chapter] = { attemptedMCQ: 0, correctMCQ: 0, wrongMCQ: 0, attemptedProblems: 0 }; });

        items.forEach(item => {
            const userAnswer = currentOnlineTestState.userAnswers[item.id] || null;
            const chapResult = results.resultsByChapter[item.chapter];

            if (item.type === 'mcq') {
                results.totalMcqItems++; // Increment MCQ counter
                const correctAnswer = currentOnlineTestState.correctAnswers[item.id];
                const isCorrect = userAnswer === correctAnswer;
                results.items.push({
                     id: item.id, type: 'mcq', chapter: item.chapter, number: item.number, text: item.text,
                     options: item.options, image: item.image, userAnswer: userAnswer, correctAnswer: correctAnswer,
                     isCorrect: isCorrect
                });
                if (chapResult) {
                    chapResult.attemptedMCQ++;
                    if (isCorrect) {
                        chapResult.correctMCQ++;
                        totalCorrectMCQs++;
                    } else {
                        chapResult.wrongMCQ++;
                    }
                }
                // Remove from available pool ONLY for standard tests
                if (!isCourseActivity && currentSubject) {
                    const globalChap = currentSubject.chapters[item.chapter];
                    if (globalChap?.available_questions) {
                        const qIndex = globalChap.available_questions.indexOf(item.number);
                        if (qIndex > -1) { globalChap.available_questions.splice(qIndex, 1); chaptersDataModified = true; }
                    }
                }
            } else if (item.type === 'problem') {
                results.items.push({
                     id: item.id, type: 'problem', chapter: item.chapter, number: item.number, text: item.text,
                     image: item.image, userAnswer: userAnswer, // Store the text answer
                     aiGrade: null, aiExplanation: null // Placeholders for AI grading
                });
                if (chapResult) {
                     chapResult.attemptedProblems++;
                }
                 // Remove from available problem pool ONLY for standard tests
                 if (!isCourseActivity && currentSubject) {
                      const globalChap = currentSubject.chapters[item.chapter];
                      if (globalChap?.available_problems) {
                           const pIndex = globalChap.available_problems.indexOf(item.number);
                           if (pIndex > -1) { globalChap.available_problems.splice(pIndex, 1); chaptersDataModified = true; }
                      }
                 }
            }
        }); // End items.forEach

        // Update standard test stats (based on MCQs for now)
        if (!isCourseActivity && currentSubject) {
            for (const chapNum in results.resultsByChapter) {
                 const globalChap = currentSubject.chapters[chapNum];
                 const chapResult = results.resultsByChapter[chapNum];
                 if (globalChap && chapResult) {
                     const numWrongMCQ = chapResult.wrongMCQ;
                     globalChap.mistake_history = globalChap.mistake_history || [];
                     globalChap.mistake_history.push(numWrongMCQ); // Track wrong MCQs
                     if (globalChap.mistake_history.length > 20) globalChap.mistake_history.shift();
                     // Mastery based on MCQs for now
                     globalChap.consecutive_mastery = (numWrongMCQ === 0 && chapResult.attemptedMCQ > 0) ? (globalChap.consecutive_mastery || 0) + 1 : 0;
                     chaptersDataModified = true;
                 }
            }
             if (chaptersDataModified) {
                  Object.values(currentSubject.chapters).forEach(chap => {
                       chap.available_questions?.sort((a, b) => a - b);
                       chap.available_problems?.sort((a, b) => a - b); // Also sort problems
                  });
             }
        }

        results.score = totalCorrectMCQs; // Base score on MCQs
        const scorePercentage = results.totalMcqItems > 0 ? (results.score / results.totalMcqItems) * 100 : 0; // Percentage based on MCQs

        // --- Save Results ---
        if (isCourseActivity && courseId) {
            const progress = userCourseProgressMap.get(courseId);
            if (progress) {
                 // Save score percentage (MCQ based) to progress
                 switch (activityType) {
                      // (Cases remain the same, storing scorePercentage)
                      case 'skip_exam': progress.skipExamAttempts = progress.skipExamAttempts || {}; progress.lastSkipExamScore = progress.lastSkipExamScore || {}; progress.skipExamAttempts[chapterNumForSkipExam] = (progress.skipExamAttempts[chapterNumForSkipExam] || 0) + 1; progress.lastSkipExamScore[chapterNumForSkipExam] = scorePercentage; progress.skipExamScores = progress.skipExamScores || {}; progress.skipExamScores[chapterNumForSkipExam] = scorePercentage; break;
                      case 'assignment': progress.assignmentScores = progress.assignmentScores || {}; progress.assignmentScores[activityId] = scorePercentage; break;
                      case 'weekly_exam': progress.weeklyExamScores = progress.weeklyExamScores || {}; progress.weeklyExamScores[activityId] = scorePercentage; break;
                      case 'midcourse': progress.midcourseExamScores = progress.midcourseExamScores || {}; progress.midcourseExamScores[activityId] = scorePercentage; break;
                      case 'final': progress.finalExamScores = progress.finalExamScores || []; const finalIndex = parseInt(activityId.replace('final', '')) - 1; if (finalIndex >= 0 && finalIndex < 3) { while (progress.finalExamScores.length <= finalIndex) progress.finalExamScores.push(null); progress.finalExamScores[finalIndex] = scorePercentage; } break;
                      default: console.warn("Unknown course activity type:", activityType);
                 }
                 // *** CORRECTED: Use imported state function ***
                 updateUserCourseProgress(courseId, progress); // Update local state map
                 await saveUserCourseProgress(currentUser.uid, courseId, progress); // Save progress score
                 console.log(`Course progress score updated for ${activityType} ${activityId}.`);

                  // Save full exam result to separate collection
                  await saveCourseExamResult(currentUser.uid, results); // NEW function call
                  console.log(`Full course activity results saved to userExamResults for ${activityType} ${activityId}.`);


                 if (isSkipExam && scorePercentage >= SKIP_EXAM_PASSING_PERCENT) { await markChapterStudiedInCourse(currentUser.uid, courseId, chapterNumForSkipExam, "skip_exam_pass"); }
                 else if (isSkipExam) { console.log(`Skip exam Ch ${chapterNumForSkipExam} not passed (${scorePercentage}% < ${SKIP_EXAM_PASSING_PERCENT}%).`); alert(`Score: ${scorePercentage.toFixed(1)}%. Needed ${SKIP_EXAM_PASSING_PERCENT}% to pass.`); }
            } else { console.error(`Progress data missing for course ${courseId}.`); }
        } else if (currentSubject) { // Save standard test history
             currentSubject.exam_history = currentSubject.exam_history || [];
             currentSubject.exam_history.push(results);
             await saveUserData(currentUser.uid); console.log("Standard test results saved.");
        }

        hideLoading();
        displayOnlineTestResults(results); // Show results based on MCQs + listing problems
        setCurrentOnlineTestState(null);
    } catch (error) {
         console.error("Error during submission:", error); hideLoading(); setCurrentOnlineTestState(null);
         alert("Error submitting results: " + error.message);
         if (isCourseActivity) { window.showCurrentAssignmentsExams?.(courseId); } else { showTestGenerationDashboard(); }
    }
}

export function displayOnlineTestResults(results) {
    clearContent();
    // Calculate percentage based on MCQs only for now
    const scorePercentage = results.totalMcqItems > 0 ? ((results.score / results.totalMcqItems) * 100).toFixed(1) : 0;
    const date = new Date(results.timestamp).toLocaleString();
    const isCourse = results.courseContext?.isCourseActivity ?? false;
    const isSkip = results.courseContext?.isSkipExam ?? false;
    const courseId = results.courseContext?.courseId;
    const activityType = results.courseContext?.activityType; // Get activity type for linking
    const activityId = results.courseContext?.activityId; // Get activity ID for linking

    // Chapter Summary still based on MCQs primarily
    let chapterSummaryHtml = Object.entries(results.resultsByChapter).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([chapNum, chapRes]) => {
         const mcqPerc = chapRes.attemptedMCQ > 0 ? ((chapRes.correctMCQ / chapRes.attemptedMCQ) * 100).toFixed(1) : 0;
         const color = chapRes.wrongMCQ > 0 ? 'text-red-500' : 'text-green-500';
         const problemText = chapRes.attemptedProblems > 0 ? ` | ${chapRes.attemptedProblems} Problems` : '';
         return `<li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                  <span class="font-medium">Chapter ${chapNum}</span>
                  <span class="font-semibold ${color}">MCQ: ${chapRes.correctMCQ}/${chapRes.attemptedMCQ} (${mcqPerc}%)${problemText}</span>
                 </li>`;
    }).join('');

    let examIndexInHistory = -1;
    // Standard tests use data.subjects[...]exam_history
    if (!isCourse && currentSubject?.exam_history) {
         examIndexInHistory = currentSubject.exam_history.findIndex(exam => exam.examId === results.examId && exam.timestamp === results.timestamp);
    }
    // Course tests are now saved separately, need different logic for review button

     let reviewHtml = '';
     // Button for standard tests (uses original index logic)
     if (!isCourse && examIndexInHistory > -1) {
          reviewHtml = `<div class="p-3 border dark:border-gray-600 rounded mb-2 bg-white dark:bg-gray-800 shadow-sm text-center"><button onclick="window.showExamDetailsWrapper(${examIndexInHistory})" class="text-sm text-blue-600 hover:underline dark:text-blue-400 mt-2 inline-flex items-center"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639l4.458-4.458a1.012 1.012 0 0 1 1.414 0l4.458 4.458a1.012 1.012 0 0 1 0 .639l-4.458 4.458a1.012 1.012 0 0 1-1.414 0l-4.458-4.458Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>View Full Exam Details</button></div>`;
     }
     // Button for course activities (uses new review function)
     else if (isCourse && results.examId) {
          reviewHtml = `<div class="p-3 border dark:border-gray-600 rounded mb-2 bg-white dark:bg-gray-800 shadow-sm text-center"><button onclick="window.showCourseExamDetails('${currentUser.uid}', '${results.examId}')" class="text-sm text-blue-600 hover:underline dark:text-blue-400 mt-2 inline-flex items-center"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639l4.458-4.458a1.012 1.012 0 0 1 1.414 0l4.458 4.458a1.012 1.012 0 0 1 0 .639l-4.458 4.458a1.012 1.012 0 0 1-1.414 0l-4.458-4.458Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>View Full Exam Details</button></div>`;
     } else {
          reviewHtml = `<p class="text-sm text-gray-600 italic p-4 text-center bg-gray-100 dark:bg-gray-700 rounded">Error finding exam for review.</p>`;
     }

    // Calculate total problems attempted
    const totalProblemsAttempted = Object.values(results.resultsByChapter).reduce((sum, chapRes) => sum + (chapRes.attemptedProblems || 0), 0);

    const html = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4 animate-fade-in max-w-2xl mx-auto">
            <h2 class="text-2xl font-semibold mb-4 text-center text-primary-600 dark:text-primary-400">Test Results: ${isSkip ? `Chapter ${results.courseContext.chapterNum} Skip Exam` : results.examId}</h2>
             <p class="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">${date}</p>
            <div class="text-center mb-6">
                 <p class="text-4xl font-bold ${scorePercentage >= (isSkip ? SKIP_EXAM_PASSING_PERCENT : 70) ? 'text-green-500' : scorePercentage >= 50 ? 'text-yellow-500' : 'text-red-500'}">${results.score} / ${results.totalMcqItems} (${scorePercentage}%)</p>
                 <p class="text-sm text-muted mt-1">(Based on ${results.totalMcqItems} Multiple Choice Questions)</p>
                 ${isSkip ? `<p class="text-sm font-medium ${scorePercentage >= SKIP_EXAM_PASSING_PERCENT ? 'text-green-600' : 'text-red-600'}">${scorePercentage >= SKIP_EXAM_PASSING_PERCENT ? 'Passed - Chapter Marked as Studied!' : `Failed (Needed ${SKIP_EXAM_PASSING_PERCENT}%)`}</p>` : ''}
                 ${results.durationMinutes ? `<p class="text-gray-600 dark:text-gray-400 mt-1">Duration: ${results.durationMinutes} min</p>`: ''}
                 ${totalProblemsAttempted > 0 ? `<p class="text-gray-600 dark:text-gray-400 mt-1">${totalProblemsAttempted} Problem(s) included (requires manual/AI grading - view details).</p>` : ''}
            </div>
            ${chapterSummaryHtml ? `<div class="mb-6"><h3 class="text-lg font-semibold mb-2">Chapter Performance</h3><ul class="space-y-1">${chapterSummaryHtml}</ul></div>` : ''}
            <div class="mb-6"><h3 class="text-lg font-semibold mb-2">Review Exam</h3>${reviewHtml}</div>
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