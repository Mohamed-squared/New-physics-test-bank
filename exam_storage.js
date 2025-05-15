import { db, currentUser, globalCourseDataMap, currentSubject, data, setData, setCurrentSubject } from './state.js';
import { showLoading, hideLoading, escapeHtml, getFormattedDate } from './utils.js';
import { markFullExam, generateExplanation } from './ai_exam_marking.js';
import { renderMathIn } from './utils.js';
import { displayContent, setActiveSidebarLink} from './ui_core.js';
import { showProgressDashboard } from './ui_progress_dashboard.js';
import { submitFeedback, saveUserData, updateUserCredits } from './firebase_firestore.js';
import { MAX_MARKS_PER_PROBLEM, MAX_MARKS_PER_MCQ, SKIP_EXAM_PASSING_PERCENT, PASSING_GRADE_PERCENT } from './config.js';

// --- Exam Storage and Retrieval Functions ---

export async function storeExamResult(courseId, examState, examType) {
    if (!db || !currentUser) {
        console.error("Cannot store exam: DB or user not available.");
        return null;
    }
    if (!examState || !examState.examId) {
        console.error("Cannot store exam: Invalid examState or missing examId.");
        return null;
    }

    showLoading("Finalizing and Storing Exam...");
    let savedExamRecordForUI;

    try {
        console.log(`[StoreExam] Calling markFullExam for Exam ID: ${examState.examId}, Type: ${examType}`);
        const markingResults = await markFullExam(examState);
        console.log(`[StoreExam] Marking complete for Exam ID: ${examState.examId}`);

        const isTestGenExam = !courseId; // True if courseId is null/undefined
        const actualExamId = examState.examId;

        // Base structure common to both exam types for Firestore
        let examRecordForFirestore = {
            userId: currentUser.uid,
            examId: actualExamId,
            questions: examState.questions,
            answers: examState.userAnswers, // Rule expects 'answers'
            markingResults: markingResults,
            score: markingResults.totalScore,
            maxScore: markingResults.maxPossibleScore,
            status: 'completed', // Rule allows 'started' or 'completed', we send 'completed'
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            completedAt: firebase.firestore.FieldValue.serverTimestamp(), // Assuming completion at submission
            durationMinutes: Math.max(0, Math.round((Date.now() - examState.startTime) / 60000)), // Ensure >=0
            isTestGen: isTestGenExam,
        };

        if (isTestGenExam) {
            // Fields specific to TestGen exams
            examRecordForFirestore.subjectId = examState.subjectId || null; // Can be null if not tied to a specific subject concept
            examRecordForFirestore.courseId = null; // TestGen exams typically don't have a courseId unless it's context
            examRecordForFirestore.testGenConfig = examState.testGenConfig || {
                textMcqCount: 0,
                textProblemCount: 0,
                lectureMcqCounts: {},
                lectureProblemCounts: {},
                timingOption: 'default',
                // customDurationMinutes will be absent if not 'custom'
            };
            if (examRecordForFirestore.testGenConfig.timingOption === 'custom' && examState.testGenConfig?.customDurationMinutes) {
                examRecordForFirestore.testGenConfig.customDurationMinutes = examState.testGenConfig.customDurationMinutes;
            } else {
                delete examRecordForFirestore.testGenConfig.customDurationMinutes; // Remove if not custom timing
            }

            // Ensure no 'examType' field for TestGen
            delete examRecordForFirestore.examType;
        } else {
            // Fields specific to non-TestGen (course activity) exams
            if (!courseId || typeof courseId !== 'string') {
                throw new Error("Invalid courseId for a non-TestGen exam. Must be a string.");
            }
            examRecordForFirestore.courseId = courseId;
            examRecordForFirestore.examType = examType; // e.g., "assignment", "weekly_exam"

            // Ensure no 'subjectId' or 'testGenConfig' for non-TestGen
            delete examRecordForFirestore.subjectId;
            delete examRecordForFirestore.testGenConfig;
        }

        // Log the object being sent to Firestore
        console.log("[StoreExam Debug] examRecordForFirestore (final for Firestore):", JSON.stringify(examRecordForFirestore, null, 2));
        console.log("[StoreExam Debug] Keys for Firestore object:", Object.keys(examRecordForFirestore).sort().join(', '));
        console.log("[StoreExam Debug] isTestGenExam value:", isTestGenExam);


        // Prepare the record for UI functions (this can have extra fields not sent to Firestore)
        savedExamRecordForUI = {
            id: actualExamId,
            examId: actualExamId,
            userId: currentUser.uid,
            courseId: courseId || null,
            subjectId: examState.subjectId || null,
            type: examType,
            timestamp: examState.startTime, // JS timestamp for UI
            durationMinutes: examRecordForFirestore.durationMinutes,
            questions: examState.questions,
            userAnswers: examState.userAnswers,
            markingResults: markingResults,
            status: 'completed',
            courseContext: examState.courseContext || null,
            testGenConfig: examState.testGenConfig // Include if it was a TestGen exam for UI logic
        };

        const examDocRef = db.collection('userExams').doc(currentUser.uid)
                           .collection('exams').doc(actualExamId);

        try {
            console.log("[StoreExam] Attempting to write exam record to Firestore path:", examDocRef.path);
            console.log("FINAL CHECK - Firestore Data Object:", JSON.stringify(examRecordForFirestore, (key, value) => {
                if (value && typeof value === 'object' && typeof value._methodName === 'FieldValue.serverTimestamp') {
                    return "{SERVER_TIMESTAMP}"; // Make timestamps readable in log
                }
                return value;
            }, 2));
            console.log("FINAL CHECK - Keys:", Object.keys(examRecordForFirestore).sort().join(', '));
            console.log("FINAL CHECK - isTestGen:", examRecordForFirestore.isTestGen);
            await examDocRef.set(examRecordForFirestore); // This is the critical write
            console.log(`[StoreExam] Exam record ${actualExamId} saved successfully to userExams subcollection.`);
        } catch (writeError) {
            console.error(`[StoreExam] Firestore write error for exam ${actualExamId}:`, writeError);
            // Already logged the object above. No need to log again here.
            throw new Error(`Failed to save exam data to Firestore: ${writeError.message}`);
        }

        let creditsAwarded = 0;
        let creditReason = "";
        switch (examType) {
            case 'assignment':
                creditsAwarded = 5;
                creditReason = `Completed Course Assignment: ${examState.courseContext?.activityId || actualExamId}`;
                break;
            case 'weekly_exam':
                creditsAwarded = 10;
                creditReason = `Completed Weekly Exam: ${examState.courseContext?.activityId || actualExamId}`;
                break;
            case 'midcourse':
                creditsAwarded = 25;
                creditReason = `Completed Midcourse Exam: ${examState.courseContext?.activityId || actualExamId}`;
                break;
            case 'final':
                creditsAwarded = 50;
                creditReason = `Completed Final Exam: ${examState.courseContext?.activityId || actualExamId}`;
                break;
            case 'skip_exam':
                creditsAwarded = 2;
                creditReason = `Completed Skip Exam: Ch ${examState.courseContext?.chapterNum || 'Unknown'}`;
                break;
            case 'testgen':
            case 'practice':
                creditsAwarded = 3;
                creditReason = `Completed Practice Test: ${examState.subjectId || actualExamId}`;
                break;
            default:
                creditsAwarded = 1;
                creditReason = `Completed Exam: ${examType} - ${actualExamId}`;
        }

        if (creditsAwarded > 0) {
            await updateUserCredits(currentUser.uid, creditsAwarded, creditReason);
        }

        hideLoading();
        return savedExamRecordForUI;

    } catch (error) {
        hideLoading();
        console.error(`[StoreExam] Error storing exam result ${examState.examId}:`, error);
        if (savedExamRecordForUI) {
             try { console.error("[StoreExam] UI Exam record state just before error:", JSON.stringify(savedExamRecordForUI, null, 2)); }
             catch { console.error("[StoreExam] UI Exam record state just before error (could not stringify):", savedExamRecordForUI);}
        }
        // Specific error messages based on common causes
        if (error.message.includes("Failed to save exam data to Firestore")) {
             alert(`Error storing exam results: ${error.message}. Please check console logs for details (possible data structure mismatch with security rules or permissions issue).`);
        } else if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
             alert(`Error storing exam results: Permission Denied. Please check Firestore rules for 'userExams/{userId}/exams/{examId}'. The data being sent might not match the allowed structure.`);
        } else {
             alert(`Error storing exam results: ${error.message || String(error)}`);
        }
        return null;
    }
}

export async function getExamDetails(userId, examId) {
    if (!db || !userId || !examId) {
        console.error("[GetExamDetails] Cannot get exam details: Missing DB, userId, or examId.");
        return null;
    }
    try {
        const examDocRef = db.collection('userExams').doc(userId).collection('exams').doc(examId);
        const docSnap = await examDocRef.get();
        if (docSnap.exists) {
            console.log(`[GetExamDetails] Exam details retrieved for ${examId}`);
            const data = docSnap.data();
            return { id: docSnap.id, ...data };
        } else {
            console.warn(`[GetExamDetails] Exam document not found at path: userExams/${userId}/exams/${examId}`);
            return null;
        }
    } catch (error) {
        console.error(`[GetExamDetails] Error retrieving exam details for ${examId}:`, error);
        return null;
    }
}


export async function getExamHistory(userId, filterId = null, filterType = 'all') {
    if (!db || !userId) {
        console.error("[GetExamHistory] Cannot get exam history: Missing DB or userId.");
        return [];
    }
    try {
        let query = db.collection('userExams').doc(userId).collection('exams');

        if (filterType === 'course' && filterId) {
            query = query.where('courseId', '==', filterId);
            console.log(`[GetExamHistory] Filtering exam history by courseId: ${filterId}`);
        } else if (filterType === 'subject' && filterId) {
            query = query.where('courseId', '==', null).where('subjectId', '==', filterId);
            console.log(`[GetExamHistory] Filtering exam history by subjectId: ${filterId} (and courseId == null)`);
        } else if (filterType === 'all') {
            console.log(`[GetExamHistory] Fetching all exam history for user ${userId}`);
        }

        query = query.orderBy('timestamp', 'desc').limit(50);

        const snapshot = await query.get();
        const history = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const isCourseExam = !!data.courseId;
            const subjectName = !isCourseExam && data.subjectId ? (window.data?.subjects?.[data.subjectId]?.name ?? data.subjectId) : null;
            const courseName = isCourseExam ? (globalCourseDataMap?.get(data.courseId)?.name ?? data.courseId) : null;

            let maxScore = data.markingResults?.maxPossibleScore;
            if (!maxScore || maxScore <= 0) {
                 maxScore = (data.questions || []).reduce((sum, q) => {
                      const isProblem = q.isProblem || !q.options || q.options.length === 0;
                      return sum + (isProblem ? MAX_MARKS_PER_PROBLEM : MAX_MARKS_PER_MCQ);
                 }, 0);
            }

            history.push({
                id: data.id || doc.id,
                type: data.type || 'unknown',
                timestamp: data.timestamp,
                score: data.markingResults?.totalScore ?? 0,
                maxScore: maxScore || 0,
                name: courseName || subjectName || 'Unknown Context',
                courseId: data.courseId,
                subjectId: data.subjectId,
                status: data.status || 'completed'
            });
        });
        console.log(`[GetExamHistory] Retrieved ${history.length} exam history entries for user ${userId} (Filter: ${filterType}, ID: ${filterId || 'None'})`);
        return history;
    } catch (error) {
        console.error(`[GetExamHistory] Error retrieving exam history for user ${userId}:`, error);
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
            console.error("Firestore Index Required: The query requires an index. Check the Firestore console for index creation suggestions. For the 'subject' filter, you likely need an index on userExams/{userId}/exams where 'courseId' == null and 'subjectId' == [SubjectID], ordered by 'timestamp' descending.");
            alert("Error fetching history: Database index required. Please check the developer console for details on the required index.");
        } else if (error.code === 'permission-denied') {
             alert("Error fetching history: Permission denied. Check Firestore rules for userExams collection.");
        } else {
             alert(`Error fetching history: ${error.message}`);
        }
        return [];
    }
}

if (!window.currentExplanationHistories) {
     window.currentExplanationHistories = {};
}

export async function showExamReviewUI(userId, examId) {
    console.log(`[showExamReviewUI] Starting review for User ID: ${userId}, Exam ID: ${examId}`);
    console.log(`[showExamReviewUI] Current timestamp: ${new Date().toISOString()}`);

    if (!userId || !examId) {
        console.error("[showExamReviewUI] Cannot show exam review: Missing userId or examId");
        displayContent('<p class="text-red-500 p-4">Error: Invalid exam identifier.</p>', 'content');
        return;
    }
    setActiveSidebarLink('showExamsDashboard', 'testgen-dropdown-content');
    showLoading("Loading Exam Review...");
    window.currentExplanationHistories = {};

    try {
        const examDetails = await getExamDetails(userId, examId);

        if (!examDetails) {
            hideLoading();
            console.error(`[showExamReviewUI] No exam details found for exam ${examId}`);
            displayContent(`<p class="text-red-500 p-4">Error: Could not find details for exam ID: ${examId}. It might have been deleted or the ID is incorrect.</p><button onclick="window.showExamsDashboard()" class="btn-secondary mt-2">Back to Exams</button>`, 'content');
            return;
        }

        console.log(`[showExamReviewUI] Successfully fetched exam details for ${examId}, rendering review UI.`);

        const { markingResults, courseContext, timestamp, type, subjectId, courseId, questions, userAnswers } = examDetails;
        const score = markingResults?.totalScore ?? 0;
        const maxScore = markingResults?.maxPossibleScore ?? 0;
        const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : 0;
        const date = new Date(timestamp).toLocaleString();
        const durationMinutes = examDetails.durationMinutes;
        const isCourse = !!courseId;
        const passThreshold = type === 'skip_exam' ? SKIP_EXAM_PASSING_PERCENT : PASSING_GRADE_PERCENT;
        const isPassing = parseFloat(percentage) >= passThreshold;

        const contextName = isCourse ? (globalCourseDataMap.get(courseId)?.name ?? courseId)
                           : subjectId ? (window.data?.subjects?.[subjectId]?.name ?? subjectId)
                           : 'Standard Test';
        const typeDisplay = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        let questionsHtml = '<p class="text-center text-muted italic">No question data found in this record.</p>';
        if (questions && questions.length > 0 && markingResults?.questionResults) {
            questionsHtml = '<div class="space-y-4">';
            questions.forEach((q, index) => {
                 const questionId = q.id || `q-${index+1}`;
                 const result = markingResults.questionResults.find(r => r.questionId === questionId);
                 const qScore = result?.score ?? 0;
                 const isProblemType = q.isProblem || !q.options || q.options.length === 0;
                 const qMaxScore = isProblemType ? MAX_MARKS_PER_PROBLEM : MAX_MARKS_PER_MCQ;
                 const qFeedback = result?.feedback || "No specific feedback.";
                 const keyPoints = result?.key_points || [];
                 const improvements = result?.improvement_suggestions || [];
                 const userAnswer = userAnswers?.[questionId] || "<i>Not Answered</i>";

                 let statusClass = 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800';
                 if (qMaxScore > 0) {
                     if (qScore === qMaxScore) statusClass = 'border-green-500 bg-green-50 dark:bg-green-900/30';
                     else if (qScore > 0) statusClass = 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30';
                     else statusClass = 'border-red-500 bg-red-50 dark:bg-red-900/30';
                 }

                 const imageHtml = q.image ? `<div class="my-3 flex justify-center"><img src="${q.image}" alt="Question Image" class="max-w-md h-auto border dark:border-gray-600 rounded" crossorigin="anonymous"></div>` : '';

                 let optionsOrAnswerHtml = '';
                 if (isProblemType) {
                     optionsOrAnswerHtml = `<div class="mt-2"><p class="text-xs font-semibold mb-1">Your Answer:</p><div class="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-700 p-2 rounded border dark:border-gray-600 whitespace-pre-wrap">${escapeHtml(userAnswer)}</div></div>`;
                 } else {
                     optionsOrAnswerHtml = '<ol class="list-none pl-0 space-y-1 my-3">';
                     optionsOrAnswerHtml += (q.options || []).map(opt => {
                         const isSelected = userAnswer === opt.letter;
                         const isCorrectAnswer = q.correctAnswer === opt.letter;
                         let optionClass = 'text-gray-700 dark:text-gray-300';
                         if (isCorrectAnswer) optionClass = 'font-semibold text-green-700 dark:text-green-300';
                         if (isSelected && !isCorrectAnswer) optionClass = 'text-red-700 dark:text-red-400 line-through';

                         return `<li class="flex items-baseline text-sm ${isSelected ? 'ring-1 ring-offset-1 dark:ring-offset-gray-800 ring-blue-400 rounded px-1' : ''}"><span class="font-mono w-5 text-right mr-1.5 shrink-0">${opt.letter}.</span><span class="${optionClass} option-text-container">${opt.text}</span></li>`;
                     }).join('');
                     optionsOrAnswerHtml += '</ol>';
                     optionsOrAnswerHtml += `<p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Your Answer: ${userAnswer || '<i>None</i>'} | Correct: ${q.correctAnswer || 'N/A'}</p>`;
                 }

                 questionsHtml += `
                    <div class="question-review-item border rounded-md p-4 ${statusClass}">
                        <div class="flex justify-between items-start mb-2">
                             <p class="font-medium text-gray-800 dark:text-gray-200">Question ${index + 1} ${q.chapter ? `(Ch ${q.chapter})` : ''}</p>
                             <span class="font-semibold text-sm ${qMaxScore > 0 && qScore === qMaxScore ? 'text-green-600' : qScore > 0 ? 'text-yellow-600' : 'text-red-600'}">${qScore.toFixed(1)} / ${qMaxScore.toFixed(1)} pts</span>
                        </div>
                        <div class="prose prose-sm dark:prose-invert max-w-none question-text-container mb-2">${q.text || '[Question text missing]'}</div>
                        ${imageHtml}
                        ${optionsOrAnswerHtml}

                        <!-- AI Marking Feedback -->
                        <div class="mt-3 pt-3 border-t border-dashed dark:border-gray-600">
                             <p class="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">AI Feedback:</p>
                             <p class="text-xs text-gray-700 dark:text-gray-300 mb-2">${escapeHtml(qFeedback)}</p>
                             ${keyPoints.length > 0 ? `<p class="text-xs font-medium mt-1">Key Points:</p><ul class="list-disc list-inside text-xs pl-4 text-gray-600 dark:text-gray-400">${keyPoints.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>` : ''}
                             ${improvements.length > 0 ? `<p class="text-xs font-medium mt-1">Suggestions:</p><ul class="list-disc list-inside text-xs pl-4 text-gray-600 dark:text-gray-400">${improvements.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>` : ''}
                        </div>

                        <!-- AI Explanation Section (Hidden initially) -->
                        <div id="ai-explanation-${index}" class="mt-3 pt-3 border-t dark:border-gray-600 hidden">
                            <div class="ai-explanation-content-area bg-purple-50 dark:bg-purple-900/20 p-3 rounded border border-purple-200 dark:border-purple-700 space-y-3 max-h-80 overflow-y-auto">
                                <p class="text-sm italic text-muted">Loading explanation...</p>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="mt-3 text-right space-x-2">
                            <button onclick="window.showAIExplanationSection('${examId}', ${index})" class="btn-secondary-small text-xs" title="Get a step-by-step explanation from AI">
                                 <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.375 3.375 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                Explain (AI)
                             </button>
                            <button onclick="window.showIssueReportingModal('${examId}', ${index})" class="btn-warning-small text-xs" title="Report an issue with this question or its marking">
                                 <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                Report Issue
                            </button>
                        </div>
                    </div>
                 `;
            });
            questionsHtml += '</div>';
        }

        let overallFeedbackHtml = '<p class="text-muted italic text-center my-4">No overall feedback available for this exam.</p>';
        if (markingResults.overallFeedback) {
            const fb = markingResults.overallFeedback;
            overallFeedbackHtml = `
                <div class="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg shadow-md border border-blue-200 dark:border-blue-700 overall-feedback-area">
                    <h3 class="text-lg font-semibold mb-4 text-blue-800 dark:text-blue-300">Overall AI Feedback</h3>
                    <div class="space-y-4 text-sm">
                         <p class="text-gray-700 dark:text-gray-300">${escapeHtml(fb.overall_feedback || 'N/A')}</p>
                         <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div><h4 class="font-medium text-green-600 mb-2">Strengths</h4><ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">${fb.strengths?.map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li>N/A</li>'}</ul></div>
                              <div><h4 class="font-medium text-red-600 mb-2">Areas for Improvement</h4><ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">${fb.weaknesses?.map(w => `<li>${escapeHtml(w)}</li>`).join('') || '<li>N/A</li>'}</ul></div>
                         </div>
                         ${fb.study_recommendations ? `
                         <div class="mt-4"><h4 class="font-medium text-blue-600 mb-2">Study Recommendations</h4><ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">${fb.study_recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('') || '<li>N/A</li>'}</ul></div>` : '' }
                    </div>
                </div>`;
        }

        const reviewHtml = `
            <div class="space-y-6 animate-fade-in max-w-4xl mx-auto">
                <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700">
                    <div class="flex justify-between items-start mb-4">
                         <div>
                              <h2 class="text-2xl font-bold mb-1">Exam Review: ${escapeHtml(typeDisplay)}</h2>
                              <p class="text-sm text-gray-500 dark:text-gray-400">Context: ${escapeHtml(contextName)} ${isCourse ? '(Course)' : '(Subject)'}</p>
                              <p class="text-sm text-gray-500 dark:text-gray-400">Exam ID: ${escapeHtml(examId)}</p>
                              <p class="text-sm text-gray-500 dark:text-gray-400">Completed: ${date} ${durationMinutes ? `(${durationMinutes} min)` : ''}</p>
                         </div>
                         <button onclick="window.showExamsDashboard()" class="btn-secondary-small flex-shrink-0">Back to Exams List</button>
                    </div>
                    <div class="text-center border-t dark:border-gray-600 pt-4">
                         <p class="text-lg text-gray-600 dark:text-gray-400 mb-1">Overall Score</p>
                         <p class="text-5xl font-bold ${isPassing ? 'text-green-600' : 'text-red-600'} mb-1">${percentage}%</p>
                         <p class="text-lg text-gray-700 dark:text-gray-300 mb-2">${score.toFixed(1)} / ${maxScore.toFixed(1)} points</p>
                         <p class="text-xl font-semibold ${isPassing ? 'text-green-600' : 'text-red-600'}">${isPassing ? 'PASS' : 'FAIL'} (Threshold: ${passThreshold}%)</p>
                    </div>
                </div>

                ${overallFeedbackHtml}

                <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700">
                    <h3 class="text-lg font-semibold mb-4">Question Breakdown</h3>
                    <div id="review-questions-container" class="max-h-[70vh] overflow-y-auto pr-2">
                        ${questionsHtml}
                    </div>
                </div>

                <div class="text-center mt-6">
                    <button onclick="window.showExamsDashboard()" class="btn-secondary">Back to Exams List</button>
                </div>
            </div>
        `;

        displayContent(reviewHtml, 'content');
        const questionsContainer = document.getElementById('review-questions-container');
        if (questionsContainer) await renderMathIn(questionsContainer);
        const overallFeedbackContainer = document.querySelector('.overall-feedback-area');
        if (overallFeedbackContainer) await renderMathIn(overallFeedbackContainer);

        hideLoading();

    } catch (error) {
        hideLoading();
        console.error(`[showExamReviewUI] Error showing exam review for ${examId}:`, error);
        displayContent(`<p class="text-red-500 p-4">An error occurred while loading the exam review: ${error.message}. Please try again later.</p><button onclick="window.showExamsDashboard()" class="btn-secondary mt-2">Back to Exams</button>`, 'content');
    }
}

async function generateAIExplanation(question, container) {
    try {
        const explanation = await getAIExplanation(question);
        container.innerHTML = `
            <h4>AI Explanation</h4>
            <p>${explanation}</p>
        `;
    } catch (error) {
        console.error('[generateAIExplanation] Error generating AI explanation:', error);
        container.innerHTML = `
            <h4>AI Explanation</h4>
            <p>Unable to generate explanation at this time.</p>
        `;
    }
}

export const showAIExplanationSection = async (examId, questionIndex) => {
    console.log(`[showAIExplanationSection] Starting for examId: ${examId}, questionIndex: ${questionIndex}`);

    const explanationContainer = document.getElementById(`ai-explanation-${questionIndex}`);
    const explanationContentArea = explanationContainer?.querySelector('.ai-explanation-content-area');

    if (!explanationContainer || !explanationContentArea) {
        console.error('[showAIExplanationSection] Required DOM elements not found');
        return;
    }

    const isHidden = explanationContainer.classList.contains('hidden');
    explanationContainer.classList.toggle('hidden');

    if (!isHidden) {
        console.log('[showAIExplanationSection] Hiding explanation section');
        return;
    }

    if (!window.currentExplanationHistories) {
        window.currentExplanationHistories = {};
    }

    if (!explanationContentArea.innerHTML.trim() || explanationContentArea.innerHTML.includes('Loading explanation...')) {
        try {
            explanationContentArea.innerHTML = `<div class="flex items-center justify-center p-2">
                <div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div>
                <p class="ml-2 text-sm text-muted">Generating explanation...</p>
            </div>`;

            console.log('[showAIExplanationSection] Fetching exam details...');
            const examData = await getExamDetails(currentUser.uid, examId);

            if (!examData) {
                throw new Error('Failed to fetch exam data');
            }
            if (!examData.questions || !examData.questions[questionIndex]) {
                throw new Error('Question data not found');
            }

            const question = examData.questions[questionIndex];
            const studentAnswer = examData.userAnswers?.[question.id];

            console.log('[showAIExplanationSection] Generating explanation...');
            const result = await generateExplanation(question, null, studentAnswer, []);

            if (!result || !result.explanationHtml) {
                throw new Error('Failed to generate explanation');
            }

            window.currentExplanationHistories[questionIndex] = result.history;

            explanationContentArea.innerHTML = `
                <div class="conversation-container space-y-4">
                    <div class="ai-message bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                        <p class="font-medium text-sm text-purple-700 dark:text-purple-300 mb-2">AI Explanation:</p>
                        <div class="prose prose-sm dark:prose-invert">${result.explanationHtml}</div>
                    </div>
                </div>
                <div class="mt-4 sticky bottom-0 bg-white dark:bg-gray-800 pt-4 border-t dark:border-gray-600">
                    <div class="flex gap-2">
                        <input type="text"
                            id="follow-up-input-${questionIndex}"
                            class="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Ask a follow-up question..."
                            onkeypress="if(event.key === 'Enter') { window.askAIFollowUp('${examId}', ${questionIndex}); }"
                        >
                        <button onclick="window.askAIFollowUp('${examId}', ${questionIndex})"
                            class="btn-primary-small whitespace-nowrap">
                            Ask AI
                        </button>
                    </div>
                </div>`;

            await renderMathIn(explanationContentArea);
            console.log('[showAIExplanationSection] Explanation generated and rendered successfully');

        } catch (error) {
            console.error("[showAIExplanationSection] Error:", error);
            explanationContentArea.innerHTML = `<div class="p-3 text-red-500 dark:text-red-400">
                <p class="font-medium">Error generating explanation:</p>
                <p class="text-sm mt-1">${error.message || 'An unexpected error occurred'}</p>
                <button onclick="window.showAIExplanationSection('${examId}', ${questionIndex})"
                        class="mt-2 text-sm px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50">
                    Try Again
                </button>
            </div>`;
        }
    }
};

window.showAIExplanationSection = showAIExplanationSection;

export const askAIFollowUp = async (examId, questionIndex) => {
    console.log(`[askAIFollowUp] Starting for examId: ${examId}, questionIndex: ${questionIndex}`);

    const explanationContainer = document.getElementById(`ai-explanation-${questionIndex}`);
    const explanationContentArea = explanationContainer?.querySelector('.ai-explanation-content-area');
    const conversationContainer = explanationContentArea?.querySelector('.conversation-container');
    const inputElement = document.getElementById(`follow-up-input-${questionIndex}`);

    if (!explanationContainer || !explanationContentArea || !conversationContainer || !inputElement) {
        console.error('[askAIFollowUp] Required DOM elements not found for follow-up');
        return;
    }

    const followUpText = inputElement.value.trim();
    if (!followUpText) {
        console.log('[askAIFollowUp] No follow-up text provided');
        return;
    }

    inputElement.disabled = true;
    const askButton = inputElement.nextElementSibling;
    if (askButton) askButton.disabled = true;

    try {
        conversationContainer.insertAdjacentHTML('beforeend', `
            <div class="user-message bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p class="font-medium text-sm text-blue-700 dark:text-blue-300 mb-2">Your question:</p>
                <p class="text-sm">${escapeHtml(followUpText)}</p>
            </div>
            <div class="ai-message-loading flex items-center p-3">
                <div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div>
                <p class="ml-2 text-sm text-muted">AI is thinking...</p>
            </div>
        `);

        explanationContentArea.scrollTop = explanationContentArea.scrollHeight;

        const history = window.currentExplanationHistories[questionIndex] || [];

        const result = await generateExplanation(null, null, followUpText, history);

        const loadingDiv = conversationContainer.querySelector('.ai-message-loading');
        if (loadingDiv) loadingDiv.remove();

        conversationContainer.insertAdjacentHTML('beforeend', `
            <div class="ai-message bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <p class="font-medium text-sm text-purple-700 dark:text-purple-300 mb-2">AI Response:</p>
                <div class="prose prose-sm dark:prose-invert">${result.explanationHtml}</div>
            </div>
        `);

        window.currentExplanationHistories[questionIndex] = result.history;

        inputElement.value = '';

        await renderMathIn(conversationContainer.lastElementChild);

        explanationContentArea.scrollTop = explanationContentArea.scrollHeight;

    } catch (error) {
        console.error("[askAIFollowUp] Error:", error);
        conversationContainer.querySelector('.ai-message-loading')?.remove();

        conversationContainer.insertAdjacentHTML('beforeend', `
            <div class="error-message bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <p class="font-medium text-sm text-red-700 dark:text-red-300">Error:</p>
                <p class="text-sm mt-1">${error.message || 'An unexpected error occurred'}</p>
            </div>
        `);

        explanationContentArea.scrollTop = explanationContentArea.scrollHeight;
    } finally {
        inputElement.disabled = false;
        if (askButton) askButton.disabled = false;
        inputElement.focus();
    }
};

window.askAIFollowUp = askAIFollowUp;

export function showIssueReportingModal(examId, questionIndex) {
    document.getElementById('issue-report-modal')?.remove();
    const modalHtml = `
        <div id="issue-report-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[70] p-4" aria-labelledby="issue-report-title" role="dialog" aria-modal="true">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg transform transition-all">
                <div class="flex justify-between items-center mb-4"><h3 id="issue-report-title" class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Report Issue for Question ${questionIndex + 1}</h3><button onclick="document.getElementById('issue-report-modal').remove()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">×</button></div>
                <div class="space-y-4">
                    <div><label for="issue-type" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Type</label><select id="issue-type" class="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500"><option value="incorrect_marking">Incorrect AI Marking/Score</option><option value="unclear_feedback">Unclear AI Feedback</option><option value="incorrect_explanation">Incorrect AI Explanation</option><option value="question_ambiguous">Question is Ambiguous/Unclear</option><option value="incorrect_mcq_answer">MCQ Correct Answer Seems Wrong</option><option value="technical_error">Display/Technical Error</option><option value="other">Other</option></select></div>
                    <div><label for="issue-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label><textarea id="issue-description" class="w-full h-32 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500" placeholder="Please provide details..."></textarea></div>
                    <div class="flex justify-end gap-3"><button onclick="document.getElementById('issue-report-modal').remove()" class="btn-secondary">Cancel</button><button onclick="window.submitIssueReport('${examId}', ${questionIndex})" class="btn-primary">Submit Report</button></div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('issue-description').focus();
}
window.showIssueReportingModal = showIssueReportingModal;

export async function submitIssueReport(examId, questionIndex) {
    const issueType = document.getElementById('issue-type')?.value;
    const description = document.getElementById('issue-description')?.value.trim();
    if (!description || !issueType) { alert('Please select an issue type and provide a description.'); return; }
    if (!currentUser || !db) { alert('Error: Cannot submit report. User or DB missing.'); return; }

    showLoading('Submitting report...');
    try {
        const examData = await getExamDetails(currentUser.uid, examId);
        const questionData = examData?.questions?.[questionIndex];
        const qId = questionData?.id || `Exam-${examId}-Q${questionIndex+1}`;
        const markingResultData = examData?.markingResults?.questionResults?.find(r => r.questionId === qId);
        const subjectContext = examData?.courseId ? `Course: ${globalCourseDataMap?.get(examData.courseId)?.name ?? examData.courseId}`
                             : (examData?.subjectId ? `Subject: ${window.data?.subjects?.[examData.subjectId]?.name ?? examData.subjectId}` : 'N/A');

        const reportPayload = {
            subjectId: subjectContext,
            questionId: qId,
            feedbackText: `Issue Type: ${issueType}\n\nDescription:\n${description}\n\n------ Context ------\nExam ID: ${examId}\nQuestion Index: ${questionIndex}\nQuestion Text Snippet: ${questionData?.text?.substring(0, 200) || 'N/A'}\nUser Answer Snippet: ${examData?.userAnswers?.[qId]?.substring(0, 200) || 'N/A'}\nAI Feedback Snippet: ${markingResultData?.feedback?.substring(0, 200) || 'N/A'}`,
            context: `Exam Issue Report (Exam: ${examId}, Q: ${questionIndex+1})`
        };

        const success = await submitFeedback(reportPayload, currentUser);
        hideLoading();
        if(success) {
            alert('Report submitted successfully. Thank you!');
            document.getElementById('issue-report-modal')?.remove();
        } else {
             alert('Failed to submit report. Please try again.');
        }
    } catch (error) {
        hideLoading();
        console.error("[submitIssueReport] Error:", error);
        alert(`Failed to submit report: ${error.message}`);
    }
}
window.submitIssueReport = submitIssueReport;

export async function deleteCompletedExamV2(examId) {
    if (!currentUser || !db || !data) {
        console.error("[DeleteExam] Cannot delete exam: User, DB, or local data not available.");
        alert("Error deleting exam: Critical data missing.");
        return false;
    }

    showLoading("Deleting exam...");
    const examRef = db.collection('userExams').doc(currentUser.uid).collection('exams').doc(examId);

    try {
        console.log(`[DeleteExam] Fetching exam data for ${examId}`);
        const examDoc = await examRef.get();
        if (!examDoc.exists) {
            throw new Error(`Exam ${examId} not found in Firestore`);
        }
        const examData = examDoc.data();
        console.log(`[DeleteExam] Fetched data for exam ${examId}, Type: ${examData.type}, CourseID: ${examData.courseId}, SubjectID: ${examData.subjectId}`);

        let appDataModified = false;
        let questionsRestoredCount = 0;
        let statsAttemptedUpdatedCount = 0;
        let statsWrongUpdatedCount = 0;

        console.log(`[DeleteExam] Before stats update - Subject ${examData.subjectId} Chapters state (available):`, JSON.parse(JSON.stringify(data?.subjects?.[examData.subjectId]?.chapters || {})));
        if (!examData.courseId && examData.subjectId && data?.subjects?.[examData.subjectId]?.chapters) {
            const subjectToUpdate = data.subjects[examData.subjectId];
            console.log(`[DeleteExam] Attempting to update stats for Subject '${subjectToUpdate.name}' (ID: ${examData.subjectId})`);

            if (examData.questions && examData.markingResults?.questionResults) {
                console.log(`[DeleteExam] Processing ${examData.questions.length} questions from the deleted exam.`);
                examData.questions.forEach((q, index) => {
                    if (!q.isProblem && q.chapter && q.number && q.id) {
                        const chapNumStr = String(q.chapter);
                        const chap = subjectToUpdate.chapters[chapNumStr];
                        const qNum = parseInt(q.number);

                        if (chap && !isNaN(qNum)) {
                            const originalAttempted = chap.total_attempted;
                            const originalWrong = chap.total_wrong;

                            if (typeof chap.total_attempted === 'number' && chap.total_attempted > 0) {
                                chap.total_attempted--;
                                console.log(`[DeleteExam] Ch ${chapNumStr}: Decremented total_attempted (Before: ${originalAttempted}, After: ${chap.total_attempted})`);
                                appDataModified = true;
                                statsAttemptedUpdatedCount++;
                            } else if (chap.total_attempted === undefined || chap.total_attempted === null || isNaN(chap.total_attempted)) {
                                chap.total_attempted = 0;
                                console.warn(`[DeleteExam] Ch ${chapNumStr}: Reset invalid total_attempted to 0.`);
                                appDataModified = true;
                            }

                            const result = examData.markingResults.questionResults.find(r => r.questionId === q.id);
                            if (result && result.score <= 0 && typeof chap.total_wrong === 'number' && chap.total_wrong > 0) {
                                chap.total_wrong--;
                                console.log(`[DeleteExam] Ch ${chapNumStr}: Decremented total_wrong (Before: ${originalWrong}, After: ${chap.total_wrong}) because question ${q.id} was wrong.`);
                                appDataModified = true;
                                statsWrongUpdatedCount++;
                            } else if (chap.total_wrong === undefined || chap.total_wrong === null || isNaN(chap.total_wrong)) {
                                chap.total_wrong = 0;
                                console.warn(`[DeleteExam] Ch ${chapNumStr}: Reset invalid total_wrong to 0.`);
                                appDataModified = true;
                            }

                            if (Array.isArray(chap.available_questions)) {
                                if (!chap.available_questions.includes(qNum)) {
                                    chap.available_questions.push(qNum);
                                    console.log(`[DeleteExam] Ch ${chapNumStr}: Added question number ${qNum} back to available_questions.`);
                                    questionsRestoredCount++;
                                    appDataModified = true;
                                } else {
                                     console.log(`[DeleteExam] Ch ${chapNumStr}: Question number ${qNum} was already in available_questions.`);
                                }
                            } else {
                                 chap.available_questions = [qNum];
                                 console.warn(`[DeleteExam] Ch ${chapNumStr}: Initialized available_questions for chapter. Added ${qNum}.`);
                                 questionsRestoredCount++;
                                 appDataModified = true;
                            }
                        } else {
                            console.warn(`[DeleteExam] Skipping stats update for Q${index + 1} (ID: ${q.id}): Chapter ${q.chapter} not found in local data or invalid Q number ${q.number}.`);
                        }
                    } else {
                         console.log(`[DeleteExam] Skipping stats update for Q${index+1} (ID: ${q.id}): Not an MCQ with chapter/number/id.`);
                    }
                });

                if (appDataModified) {
                    console.log(`[DeleteExam] Summary of changes: Attempted reversed: ${statsAttemptedUpdatedCount}, Wrong reversed: ${statsWrongUpdatedCount}, MCQs restored: ${questionsRestoredCount}.`);
                    Object.values(subjectToUpdate.chapters).forEach(chap => {
                        if (Array.isArray(chap.available_questions)) {
                            chap.available_questions.sort((a, b) => a - b);
                        }
                    });

                    // Update local state with Promise to ensure completion
                    await new Promise(resolve => {
                        setData({...data});
                        console.log("[DeleteExam] Local state `data` updated via setData().");
                        resolve();
                    });

                    // Explicitly update currentSubject if it matches
                    if (currentSubject && currentSubject.id === examData.subjectId) {
                        await new Promise(resolve => {
                            setCurrentSubject({...subjectToUpdate});
                            console.log("[DeleteExam] Updated currentSubject to reflect the modified subject data.");
                            resolve();
                        });
                    } else {
                        console.log("[DeleteExam] currentSubject not updated; either not set or doesn't match the exam's subject ID.");
                    }

                    // Save updated data to Firestore
                    console.log(`[DeleteExam] Saving updated app data to Firestore...`);
                    await saveUserData(currentUser.uid, data);
                    console.log("[DeleteExam] UserData saved to Firestore.");
                } else {
                     console.log(`[DeleteExam] No TestGen appData needed saving for exam ${examId}.`);
                }
            } else {
                console.warn(`[DeleteExam] Could not update TestGen stats for exam ${examId}: Missing questions or markingResults in exam data.`);
            }
        } else {
             console.log(`[DeleteExam] Exam ${examId} is not a TestGen exam or relevant subject data missing. No local stats updated.`);
        }

        // Delete the exam document from Firestore
        console.log(`[DeleteExam] Deleting exam document ${examId} from Firestore...`);
        await examRef.delete();
        console.log(`[DeleteExam] Successfully deleted exam ${examId} from userExams collection.`);

        // Refresh the progress dashboard if data was modified
        if (appDataModified && typeof window.showProgressDashboard === 'function') {
            console.log("[DeleteExam] Preparing to refresh progress dashboard. Current subject ID:", currentSubject?.id);
            try {
                const subjectStateForDashboard = JSON.stringify(data?.subjects?.[currentSubject?.id], null, 2);
                console.log("[DeleteExam] Current subject data state being passed to dashboard:", subjectStateForDashboard.substring(0, 500) + (subjectStateForDashboard.length > 500 ? '...' : ''));
            } catch (e) {
                console.warn("[DeleteExam] Could not stringify current subject data for logging.");
            }
            // Wait briefly to ensure state and DOM are ready
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log("[DeleteExam] Refreshing progress dashboard NOW...");
            window.showProgressDashboard();
        } else if (appDataModified) {
             console.warn("[DeleteExam] appDataModified is true, but window.showProgressDashboard is not defined, cannot refresh dashboard.");
        } else {
             console.log("[DeleteExam] No app data was modified, skipping dashboard refresh.");
        }

        hideLoading();
        alert(`Exam ${examId} deleted successfully.${appDataModified ? `\n(${questionsRestoredCount} MCQs restored, stats adjusted)` : ''}`);
        return true;

    } catch (error) {
        hideLoading();
        console.error(`[DeleteExam] Error deleting exam ${examId}:`, error);
        alert(`Error deleting exam: ${error.message}`);
        return false;
    }
}
window.deleteCompletedExamV2 = deleteCompletedExamV2;

// --- END OF FILE exam_storage.js ---