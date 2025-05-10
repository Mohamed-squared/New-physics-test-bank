// --- START OF FILE ui_online_test.js ---

import { currentOnlineTestState, setCurrentOnlineTestState, currentSubject, currentUser, data, setData, activeCourseId, userCourseProgressMap, globalCourseDataMap, updateUserCourseProgress } from './state.js';
import { displayContent, clearContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, renderMathIn, escapeHtml, getFormattedDate } from './utils.js';
import { saveUserData, markChapterStudiedInCourse, saveUserCourseProgress } from './firebase_firestore.js';
import { showTestGenerationDashboard } from './ui_test_generation.js';
import { showExamsDashboard } from './ui_exams_dashboard.js';
import { SKIP_EXAM_PASSING_PERCENT, PASSING_GRADE_PERCENT } from './config.js';
import { storeExamResult, getExamDetails, showExamReviewUI, showIssueReportingModal, submitIssueReport } from './exam_storage.js';

// --- Online Test UI & Logic ---

export function launchOnlineTestUI() {
    clearContent();
    const testArea = document.getElementById('online-test-area');
    
    if (!currentOnlineTestState) {
        console.error("launchOnlineTestUI Error: Online test state missing.");
        displayContent("<p class='text-red-500 p-4'>Error: Could not start the test. Test state missing.</p>", 'content');
        return;
    }
    if (!testArea) {
        console.error("launchOnlineTestUI Error: Test area element (#online-test-area) not found.");
        alert("Critical Error: Test UI container is missing from the page. Cannot launch test.");
        return;
    }

    testArea.classList.remove('hidden');

    const totalQuestions = currentOnlineTestState.questions.length;
    const durationMinutes = currentOnlineTestState.durationMinutes;
    if (!durationMinutes || durationMinutes <= 0) {
         console.error("Invalid duration in test state:", durationMinutes);
         currentOnlineTestState.durationMinutes = 60;
    }
    const durationMillis = currentOnlineTestState.durationMinutes * 60 * 1000;
    currentOnlineTestState.endTime = currentOnlineTestState.startTime + durationMillis;
    currentOnlineTestState.status = 'active';

    let displayTitle = currentOnlineTestState.examId;
    if (currentOnlineTestState.courseContext?.isSkipExam) {
        displayTitle = `Chapter ${currentOnlineTestState.courseContext.chapterNum} Skip Exam`;
    } else if (currentOnlineTestState.courseContext?.activityType) {
        const type = currentOnlineTestState.courseContext.activityType.replace(/_/g, ' ');
        const idPart = currentOnlineTestState.courseContext.activityId || '';
        displayTitle = `${type.charAt(0).toUpperCase() + type.slice(1)} ${idPart}`;
        if(currentOnlineTestState.courseContext.courseId) {
            const courseName = globalCourseDataMap.get(currentOnlineTestState.courseContext.courseId)?.name || '';
            if(courseName) displayTitle += ` (${courseName})`;
        }
    } else if (currentOnlineTestState.subjectId) {
         const subjectName = window.data?.subjects?.[currentOnlineTestState.subjectId]?.name || 'TestGen';
         displayTitle = `${subjectName} Test`;
    }

    testArea.innerHTML =  `
    <div class="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 p-3 shadow z-40 border-b dark:border-gray-700">
        <div class="container mx-auto flex justify-between items-center">
            <span class="text-lg font-semibold text-primary-600 dark:text-primary-400 truncate max-w-[calc(100% - 250px)]" title="${escapeHtml(currentOnlineTestState.examId)}">
                ${escapeHtml(displayTitle)}
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

    startTimer();
    displayCurrentQuestion();
}

export function startTimer() {
    const timerElement = document.getElementById('timer');
    if (!timerElement) {
        console.warn("startTimer: Timer element (#timer) not found. Cannot start timer display.");
        return;
    }
    if (!currentOnlineTestState) {
        console.warn("startTimer: currentOnlineTestState is null. Cannot start timer logic.");
        timerElement.textContent = "Error";
        return;
    }

    if (currentOnlineTestState.timerInterval) { clearInterval(currentOnlineTestState.timerInterval); }

    function updateTimerDisplay() {
        if (!currentOnlineTestState || !currentOnlineTestState.endTime || currentOnlineTestState.status === 'submitting' || currentOnlineTestState.status === 'completed') {
             if(currentOnlineTestState?.timerInterval) clearInterval(currentOnlineTestState.timerInterval);
             currentOnlineTestState.timerInterval = null;
             if(timerElement) timerElement.textContent = "00:00:00";
             return;
        }
        const now = Date.now(); const remaining = currentOnlineTestState.endTime - now;
        if (remaining <= 0) {
            clearInterval(currentOnlineTestState.timerInterval);
            currentOnlineTestState.timerInterval = null;
            if (timerElement) { timerElement.textContent = "00:00:00"; timerElement.classList.add('text-red-500'); }
            if (currentOnlineTestState.status !== 'submitting' && currentOnlineTestState.status !== 'completed') {
                 currentOnlineTestState.status = 'submitting';
                 alert("Time's up! Submitting test.");
                 submitOnlineTest();
            }
        } else {
            const h = Math.floor(remaining / 3600000); const m = Math.floor((remaining % 3600000) / 60000); const s = Math.floor((remaining % 60000) / 1000);
             if(timerElement) timerElement.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
             const forceSubmitBtn = document.getElementById('force-submit-btn'); if (forceSubmitBtn) { forceSubmitBtn.classList.toggle('hidden', remaining / 60000 >= 5); }
              if(timerElement) timerElement.classList.remove('text-red-500');
        }
    }
    updateTimerDisplay();
    currentOnlineTestState.timerInterval = setInterval(updateTimerDisplay, 1000);
}

export async function displayCurrentQuestion() {
    console.log("[DisplayQuestion] State:", JSON.parse(JSON.stringify(currentOnlineTestState || {})));
    console.log("displayCurrentQuestion START");
    
    const container = document.getElementById('question-container');
    if (!currentOnlineTestState) {
        console.error("displayCurrentQuestion HALTED: currentOnlineTestState is null.");
        if (container) container.innerHTML = '<p class="text-red-500 p-4">Error: Test state lost. Cannot display question.</p>';
        else console.error("displayCurrentQuestion HALTED: Also #question-container not found.");
        return;
    }
    if (!container) {
         console.error("displayCurrentQuestion HALTED: Question container (#question-container) not found.");
         return;
     }

    const index = currentOnlineTestState.currentQuestionIndex; const questions = currentOnlineTestState.questions;
    
    if (index < 0 || !Array.isArray(questions) || questions.length === 0 || index >= questions.length) {
         console.error(`displayCurrentQuestion HALTED: Invalid index ${index}/${questions?.length}`);
         container.innerHTML = '<p class="text-red-500 p-4">Error: Invalid question index.</p>';
         return;
     }
    const question = questions[index]; const totalQuestions = questions.length;
    if (!question) {
        console.error("displayCurrentQuestion HALTED: Missing question object at index", index);
        container.innerHTML = `<p class="text-red-500 p-4">Error: Could not load question data for question ${index + 1}.</p>`;
        return;
    }

    const questionId = String(question.id || `q-${index+1}`);
    console.log(`Displaying question ${questionId} (Index ${index}) - Type: ${question.isProblem ? 'Problem' : 'MCQ'}`);
    
    console.log('[DisplayQuestion] Rendering QID:', questionId, 'UserAnswers state:', JSON.stringify(currentOnlineTestState.userAnswers));

    let imageHtml = question.image ? `<img src="${question.image}" alt="Question Image" class="max-w-full h-auto mx-auto my-4 border dark:border-gray-600 rounded" onerror="this.style.display='none';">` : '';
    let answerAreaHtml = '';

    if (question.isProblem) {
         const currentAnswer = currentOnlineTestState.userAnswers[questionId] || '';
         answerAreaHtml = `
         <div class="mt-4">
             <label for="problem-answer-${questionId}" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Answer / Solution Steps:</label>
             <textarea id="problem-answer-${questionId}" name="problemAnswer" rows="8"
                       class="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                       placeholder="Show your work and final answer here..."
                       oninput="window.recordAnswer('${questionId}', this.value)">${escapeHtml(currentAnswer)}</textarea>
              <p class="text-xs text-muted mt-1">Explain your reasoning and show key steps. Use basic text formatting and simple math notation (e.g., ^ for power, * for multiply). Full LaTeX is not supported here.</p>
         </div>`;
    } else {
         answerAreaHtml = (question.options?.length > 0) ? `<div class="space-y-3 mt-4">` + question.options.map(opt => {
             const qIdStr = String(questionId);
             const optLetterStr = String(opt.letter);
             const storedAnswer = String(currentOnlineTestState.userAnswers[qIdStr] ?? '');
             const isChecked = storedAnswer === optLetterStr;
             
             console.log(`[DisplayQuestion MCQ] QID: ${qIdStr} | Option: ${optLetterStr} | Stored Answer: ${storedAnswer} | isChecked: ${isChecked}`);
             
             return `
             <input type="radio" id="radio-${qIdStr}-${optLetterStr}" name="mcqOption-${qIdStr}" value="${opt.letter}" class="hidden" ${isChecked ? 'checked' : ''} onchange="window.recordAnswer('${qIdStr}', this.value)">
             <label for="radio-${qIdStr}-${optLetterStr}" class="option-label flex items-start space-x-3 p-3 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150">
                 <div class="flex items-baseline w-full"><span class="font-mono w-6 text-right mr-2 shrink-0">${opt.letter}.</span><div class="flex-1 option-text-container">${opt.text}</div></div>
             </label>`;
         }).join('') + `</div>` : '<p class="text-sm text-yellow-600 mt-4">(No MC options found)</p>';
    }

    const htmlContent = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-4 animate-fade-in question-card">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Question ${index + 1} / ${totalQuestions} ${question.chapter ? `(Chapter ${question.chapter})` : ''}</p>
        ${imageHtml}
        <div class="prose dark:prose-invert max-w-none mb-4 question-text-container">${question.text}</div>
        ${answerAreaHtml}
    </div>`;

    container.innerHTML = htmlContent;
    console.log("innerHTML set.");

    try { await renderMathIn(container); console.log("MathJax rendered."); } catch (mathError) { console.error("MathJax render error:", mathError); }

    try {
        const counterEl = document.getElementById('question-counter');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');

        if (counterEl) counterEl.textContent = `Question ${index + 1} / ${totalQuestions}`; else console.warn("[DisplayQuestion] Element #question-counter not found");
        if (prevBtn) prevBtn.disabled = (index === 0); else console.warn("[DisplayQuestion] Element #prev-btn not found");
        if (nextBtn) nextBtn.classList.toggle('hidden', index === totalQuestions - 1); else console.warn("[DisplayQuestion] Element #next-btn not found");
        if (submitBtn) submitBtn.classList.toggle('hidden', index !== totalQuestions - 1); else console.warn("[DisplayOption] Element #submit-btn not found");

        console.log("[DisplayQuestion] Navigation updated.");
    } catch (e) {
        console.error("[DisplayQuestion] Error updating navigation elements:", e);
    }

    console.log("displayCurrentQuestion END");
}

export function navigateQuestion(direction) {
    if (!currentOnlineTestState) return;
    const newIndex = currentOnlineTestState.currentQuestionIndex + direction;
    if (newIndex >= 0 && newIndex < currentOnlineTestState.questions.length) { currentOnlineTestState.currentQuestionIndex = newIndex; displayCurrentQuestion(); }
}

export function recordAnswer(questionId, answer) {
    console.log('[RecordAnswer] QID (raw):', questionId, 'Answer (raw):', answer, 'Type (raw):', typeof answer);
    if (!currentOnlineTestState) return;

    const qIdStr = String(questionId);
    const ansStr = String(answer);

    currentOnlineTestState.userAnswers[qIdStr] = ansStr;
    console.log(`[RecordAnswer] Stored answer for ${qIdStr}: '${ansStr}' (Type: ${typeof ansStr})`);
    console.log('[RecordAnswer] Updated userAnswers:', JSON.stringify(currentOnlineTestState.userAnswers));
    
    updateSelectedOption(qIdStr, ansStr);
}

function updateSelectedOption(questionId, selectedValue) {
    const container = document.getElementById('question-container');
    if (!container) {
        console.warn("updateSelectedOption: Question container not found.");
        return;
    }

    const radios = container.querySelectorAll(`input[type="radio"][name="mcqOption-${questionId}"]`);
    if (!radios.length) {
        console.warn(`updateSelectedOption: No radios found for question ${questionId}`);
        return;
    }

    radios.forEach(radio => {
        const isChecked = radio.value === selectedValue;
        if (radio.checked !== isChecked) {
            radio.checked = isChecked;
            // Force style recalculation to apply CSS :checked rules
            radio.style.display = 'none';
            radio.offsetHeight; // Trigger reflow
            radio.style.display = '';
            console.log(`[UpdateSelectedOption] Set radio [${radio.value}] to checked=${isChecked}`);
        }
    });

    // Debug: Verify the updated state
    radios.forEach(radio => {
        const label = document.querySelector(`label[for="${radio.id}"]`);
        console.log(`[Post-Update Debug] Radio [${radio.value}] checked=${radio.checked}, label computed style=${getComputedStyle(label)?.backgroundColor || 'none'}`);
    });
}

export function confirmSubmitOnlineTest() {
     if (!currentOnlineTestState) return;
     const unanswered = currentOnlineTestState.questions.filter(q => {
        const answer = currentOnlineTestState.userAnswers[String(q.id)];
        return answer === null || answer === undefined || (typeof answer === 'string' && answer.trim() === '');
    }).length;
    let msg = "Submit test?"; if (unanswered > 0) msg += `\n\n${unanswered} unanswered question(s).`;
    if (confirm(msg)) submitOnlineTest();
}
export function confirmForceSubmit() { if (confirm("Submit test now?")) submitOnlineTest(); }

export async function submitOnlineTest() {
    showLoading("Submitting and marking exam...");

    try {
        if (!currentOnlineTestState || currentOnlineTestState.status === 'submitting' || currentOnlineTestState.status === 'completed' || !currentUser) {
            if (currentOnlineTestState?.status !== 'submitting' && currentOnlineTestState?.status !== 'completed') {
                 alert("Error: Missing test data, user session, or test already submitted.");
            }
            console.error("Submit Error: State missing, already submitting, or completed.");
            return;
        }

        currentOnlineTestState.status = 'submitting';
        if (currentOnlineTestState.timerInterval) clearInterval(currentOnlineTestState.timerInterval);
        currentOnlineTestState.timerInterval = null;

        const testArea = document.getElementById('online-test-area');
        if (testArea) {
            testArea.classList.add('hidden');
        } else {
            console.warn("submitOnlineTest: Test area element (#online-test-area) not found during submission.");
        }
        await new Promise(resolve => setTimeout(resolve, 100));

        const isCourseActivity = !!currentOnlineTestState.courseContext?.isCourseActivity;
        const isSkipExam = currentOnlineTestState.courseContext?.activityType === 'skip_exam';
        const courseId = currentOnlineTestState.courseContext?.courseId;
        const activityType = currentOnlineTestState.courseContext?.activityType || 'testgen';
        const activityId = currentOnlineTestState.courseContext?.activityId;
        const chapterNumForSkipExam = currentOnlineTestState.courseContext?.chapterNum;

        console.log(`Submitting exam ${currentOnlineTestState.examId} of type ${activityType}`);
        const examRecord = await storeExamResult(
            courseId,
            currentOnlineTestState,
            activityType
        );

        if (!examRecord || !examRecord.markingResults) {
            if (isCourseActivity && courseId) {
                window.showCurrentAssignmentsExams?.(courseId);
            } else {
                showTestGenerationDashboard();
            }
            setCurrentOnlineTestState(null);
            return;
        }

        if (isCourseActivity && courseId) {
            const progress = userCourseProgressMap.get(courseId);
            if (progress) {
                const percentageScore = examRecord.markingResults.maxPossibleScore > 0
                    ? (examRecord.markingResults.totalScore / examRecord.markingResults.maxPossibleScore) * 100
                    : 0;

                switch (activityType) {
                    case 'assignment':
                        progress.assignmentScores = progress.assignmentScores || {};
                        progress.assignmentScores[activityId] = percentageScore;
                        console.log(`Updated assignment score for ${activityId}: ${percentageScore.toFixed(1)}%`);

                        const todayStr = getFormattedDate();
                        progress.dailyProgress = progress.dailyProgress || {};
                        progress.dailyProgress[todayStr] = progress.dailyProgress[todayStr] || {
                            chaptersStudied: [],
                            skipExamsPassed: [],
                            assignmentCompleted: false,
                            assignmentScore: null
                        };
                        progress.dailyProgress[todayStr].assignmentCompleted = true;
                        progress.dailyProgress[todayStr].assignmentScore = percentageScore;
                        console.log(`Updated daily progress for ${todayStr} with assignment score`);
                        break;

                    case 'weekly_exam':
                        progress.weeklyExamScores = progress.weeklyExamScores || {};
                        progress.weeklyExamScores[activityId] = percentageScore;
                        console.log(`Updated weekly exam score for ${activityId}: ${percentageScore.toFixed(1)}%`);
                        break;

                    case 'final_exam':
                        progress.finalExamScore = percentageScore;
                        console.log(`Updated final exam score: ${percentageScore.toFixed(1)}%`);
                        break;
                    
                    case 'midcourse':
                        progress.midcourseExamScores = progress.midcourseExamScores || {};
                        progress.midcourseExamScores[activityId] = percentageScore;
                        console.log(`Updated midcourse exam score for ${activityId}: ${percentageScore.toFixed(1)}%`);
                        break;

                    case 'skip_exam':
                        break;

                    default:
                        console.log(`Unhandled course activity type: ${activityType}`);
                }

                updateUserCourseProgress(courseId, progress);
                await saveUserCourseProgress(currentUser.uid, courseId, progress);
                console.log(`Course progress updated and saved for ${courseId}`);
            }
        }

        currentOnlineTestState.status = 'completed';

        await displayOnlineTestResults(examRecord);

        if (isSkipExam && chapterNumForSkipExam && courseId && examRecord.markingResults.maxPossibleScore > 0) {
            const percentage = (examRecord.markingResults.totalScore / examRecord.markingResults.maxPossibleScore) * 100;
            const progress = userCourseProgressMap.get(courseId);
            if (progress) {
                 progress.lastSkipExamScore = progress.lastSkipExamScore || {};
                 progress.lastSkipExamScore[chapterNumForSkipExam] = percentage;
                 progress.skipExamAttempts = progress.skipExamAttempts || {};
                 progress.skipExamAttempts[chapterNumForSkipExam] = (progress.skipExamAttempts[chapterNumForSkipExam] || 0) + 1;

                 const todayStr = getFormattedDate();
                 progress.dailyProgress = progress.dailyProgress || {};
                 progress.dailyProgress[todayStr] = progress.dailyProgress[todayStr] || { chaptersStudied: [], skipExamsPassed: [], assignmentCompleted: false, assignmentScore: null };

                 if (percentage >= SKIP_EXAM_PASSING_PERCENT) {
                     console.log(`Skip exam passed (${percentage.toFixed(1)}%). Marking chapter ${chapterNumForSkipExam} as studied.`);
                     await markChapterStudiedInCourse(currentUser.uid, courseId, chapterNumForSkipExam, "skip_exam_passed");
                 } else {
                     console.log(`Skip exam not passed (${percentage.toFixed(1)}% < ${SKIP_EXAM_PASSING_PERCENT}%).`);
                     await saveUserCourseProgress(currentUser.uid, courseId, progress);
                 }
            }
        }
        else if (!isCourseActivity && currentSubject && data?.subjects?.[currentSubject.id]) {
             let chaptersDataModified = false;
             const subjectToUpdate = data.subjects[currentSubject.id];
             if (examRecord.questions && examRecord.markingResults?.questionResults) {
                  examRecord.markingResults.questionResults.forEach(result => {
                      const question = examRecord.questions.find(q => q.id === result.questionId);
                      if (question && question.chapter) {
                           const chap = subjectToUpdate.chapters[question.chapter];
                           if (chap) {
                                if (!question.isProblem) {
                                     chap.total_attempted = (chap.total_attempted || 0) + 1;
                                     const isCorrect = result.score > 0;
                                     if (!isCorrect) {
                                          chap.total_wrong = (chap.total_wrong || 0) + 1;
                                     }
                                     chap.mistake_history = chap.mistake_history || [];
                                     chap.mistake_history.push(isCorrect ? 0 : 1);
                                     if (chap.mistake_history.length > 20) chap.mistake_history.shift();
                                     chap.consecutive_mastery = isCorrect ? (chap.consecutive_mastery || 0) + 1 : 0;
                                     chaptersDataModified = true;

                                     if (chap.available_questions && Array.isArray(chap.available_questions) && question.number) {
                                          const qIndex = chap.available_questions.indexOf(question.number);
                                          if (qIndex > -1) {
                                               chap.available_questions.splice(qIndex, 1);
                                               console.log(`Removed MCQ Q${question.number} from Ch ${question.chapter} available list.`);
                                          } else {
                                              console.warn(`MCQ Q${question.number} (Ch ${question.chapter}) not found in available list during post-exam update.`);
                                          }
                                      }
                                }
                           } else {
                                console.warn(`Chapter ${question.chapter} not found in currentSubject data for stats update.`);
                           }
                      }
                  });
             }
             if (chaptersDataModified) {
                  Object.values(subjectToUpdate.chapters).forEach(chap => chap.available_questions?.sort((a,b) => a-b));
                  await saveUserData(currentUser.uid, data);
                  console.log("TestGen Exam: Updated chapter stats and removed used MCQs.");
             }
        }

        setCurrentOnlineTestState(null);

    } catch (error) {
        console.error("Error finishing test:", error);
        setCurrentOnlineTestState(null);
        alert("Error submitting test results. Please try again later. " + error.message);
        const isCourseActivity = !!currentOnlineTestState?.courseContext?.isCourseActivity;
        const courseId = currentOnlineTestState?.courseContext?.courseId;
        if (isCourseActivity && courseId) {
            window.showCurrentAssignmentsExams?.(courseId);
        } else {
            showTestGenerationDashboard();
        }
    } finally {
        hideLoading();
    }
}

export async function displayOnlineTestResults(examRecord) {
    clearContent();
    if (!examRecord || !examRecord.markingResults) {
         console.error("Cannot display results: Invalid examRecord or missing markingResults.");
         displayContent('<p class="text-red-500 p-4">Error displaying test results.</p>');
         return;
    }

    const examId = examRecord.id || examRecord.examId;
    if (!examId) {
        console.error("Missing exam ID in record:", examRecord);
        displayContent('<p class="text-red-500 p-4">Error: Could not find exam identifier.</p>');
        return;
    }

    console.log("Displaying results for exam:", examId);

    const { markingResults, courseContext, timestamp, type, subjectId, courseId } = examRecord;
    const score = markingResults.totalScore;
    const maxScore = markingResults.maxPossibleScore;
    const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : 0;
    const date = new Date(timestamp).toLocaleString();
    const durationMinutes = examRecord.durationMinutes;
    const isCourse = !!courseId;
    const isSkip = type === 'skip_exam';

    const contextName = isCourse ? (globalCourseDataMap.get(courseId)?.name || courseId)
                       : subjectId ? (window.data?.subjects?.[subjectId]?.name || subjectId)
                       : 'Standard Test';

    let passThreshold = PASSING_GRADE_PERCENT;
    if (isSkip) { passThreshold = SKIP_EXAM_PASSING_PERCENT; }
    else if (isCourse) { passThreshold = PASSING_GRADE_PERCENT; }

    const isPassing = parseFloat(percentage) >= passThreshold;

    const resultsHtml = `
        <div class="space-y-6 animate-fade-in max-w-3xl mx-auto">
            <div class="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700">
                <h2 class="text-2xl font-bold mb-2">Exam Results</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Exam ID: ${escapeHtml(examId)}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Context: ${escapeHtml(contextName)} (${isCourse ? 'Course' : 'Subject'}) | Type: ${escapeHtml(type)}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Completed: ${date} ${durationMinutes ? `(${durationMinutes} min)` : ''}</p>
                <div class="text-5xl font-bold ${isPassing ? 'text-green-600' : 'text-red-600'} mb-2">
                    ${percentage}%
                </div>
                <p class="text-lg text-gray-600 dark:text-gray-400 mb-2">
                    ${score.toFixed(1)} out of ${maxScore.toFixed(1)} points
                </p>
                <p class="text-xl font-semibold ${isPassing ? 'text-green-600' : 'text-red-600'}">
                    ${isPassing ? 'PASS' : 'FAIL'} (Threshold: ${passThreshold}%)
                </p>
                 ${isSkip && isPassing ? `<p class="text-sm text-green-600 mt-1">Chapter ${courseContext?.chapterNum || '?'} marked as studied!</p>` : ''}
                 ${isSkip && !isPassing ? `<p class="text-sm text-red-600 mt-1">Needed ${passThreshold}% to pass the skip exam.</p>` : ''}
            </div>

            ${markingResults.overallFeedback ? `
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700 overall-feedback-area">
                <h3 class="text-lg font-semibold mb-4">Overall AI Feedback</h3>
                <div class="space-y-4 text-sm">
                    <p class="text-gray-700 dark:text-gray-300">${escapeHtml(markingResults.overallFeedback.overall_feedback || 'N/A')}</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><h4 class="font-medium text-green-600 mb-2">Strengths</h4><ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">${markingResults.overallFeedback.strengths?.map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li>N/A</li>'}</ul></div>
                        <div><h4 class="font-medium text-red-600 mb-2">Areas for Improvement</h4><ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">${markingResults.overallFeedback.weaknesses?.map(w => `<li>${escapeHtml(w)}</li>`).join('') || '<li>N/A</li>'}</ul></div>
                    </div>
                    ${markingResults.overallFeedback.study_recommendations ? `
                    <div class="mt-4"><h4 class="font-medium text-blue-600 mb-2">Study Recommendations</h4><ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">${markingResults.overallFeedback.study_recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('') || '<li>N/A</li>'}</ul></div>` : '' }
                </div>
            </div>
            ` : '<p class="text-muted italic text-center my-4">No overall feedback available.</p>'}

            <div class="flex justify-center gap-4 flex-wrap">
                <button onclick="window.showExamReviewUI('${currentUser.uid}', '${examId}')" class="btn-primary" data-exam-id="${examId}">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-1"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.18l.879-.879a1.651 1.651 0 0 1 2.336 0l.879.879a1.651 1.651 0 0 0 2.336 0l.879-.879a1.651 1.651 0 0 1 2.336 0l.879.879a1.651 1.651 0 0 0 2.336 0l.879-.879a1.651 1.651 0 0 1 2.336 0l.879.879a1.651 1.651 0 0 1 0 1.18l-.879.879a1.651 1.651 0 0 1-2.336 0l-.879-.879a1.651 1.651 0 0 0-2.336 0l-.879.879a1.651 1.651 0 0 1-2.336 0l-.879-.879a1.651 1.651 0 0 0-2.336 0l-.879.879a1.651 1.651 0 0 1-2.336 0l-.879-.879Zm16.471-1.591a.151.151 0 0 0-.212 0l-.879.879a.151.151 0 0 1-.212 0l-.879-.879a.151.151 0 0 0-.212 0l-.879.879a.151.151 0 0 1-.212 0l-.879-.879a.151.151 0 0 0-.212 0l-.879.879a.151.151 0 0 1-.212 0l-.879-.879a.151.151 0 0 0-.212 0A.15.15 0 0 0 .452 9l.879.879a.151.151 0 0 0 .212 0l.879-.879a.151.151 0 0 1 .212 0l.879.879a.151.151 0 0 0 .212 0l.879-.879a.151.151 0 0 1 .212 0l.879.879a.151.151 0 0 0 .212 0Z" clip-rule="evenodd" /></svg>
                    View Detailed Review
                </button>
                <button onclick="${isCourse ? `window.showCurrentAssignmentsExams('${courseId}')` : 'window.showExamsDashboard()'}" class="btn-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
                    ${isCourse ? 'Back to Course Exams' : 'Back to TestGen Exams'}
                </button>
                 ${!isCourse ? `<button onclick="window.showTestGenerationDashboard()" class="btn-secondary"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>Generate New Test</button>` : ''}
            </div>
        </div>`;
    displayContent(resultsHtml, 'content');
    setActiveSidebarLink(isCourse ? 'showCurrentAssignmentsExams' : 'showExamsDashboard', isCourse ? 'sidebar-course-nav' : 'testgen-dropdown-content');

    const overallFeedbackArea = document.querySelector('.overall-feedback-area');
    if (overallFeedbackArea) await renderMathIn(overallFeedbackArea);
}

window.showExamReviewUI = showExamReviewUI;
window.showIssueReportingModal = showIssueReportingModal;
window.submitIssueReport = submitIssueReport;

export { setCurrentOnlineTestState };

// --- END OF FILE ui_online_test.js ---