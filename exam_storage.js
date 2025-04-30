// --- START OF FILE exam_storage.js ---

import { db, currentUser, globalCourseDataMap } from './state.js'; // Added globalCourseDataMap
import { showLoading, hideLoading, escapeHtml } from './utils.js';
// MODIFIED: Import AI marking and explanation generation
import { markFullExam, generateExplanation } from './ai_exam_marking.js';
import { renderMathIn } from './utils.js'; // Import MathJax renderer
// MODIFIED: Import displayContent and setActiveSidebarLink
import { displayContent, setActiveSidebarLink } from './ui_core.js';
// MODIFIED: Import submitFeedback from firestore
import { submitFeedback } from './firebase_firestore.js';
// MODIFIED: Define MAX_MARKS_PER_PROBLEM if needed for display
const MAX_MARKS_PER_PROBLEM = 10;
const MAX_MARKS_PER_MCQ = 10;


// --- Exam Storage and Retrieval Functions ---

/**
 * Stores the completed exam data (including AI marking results) in Firestore.
 * Uses a dedicated subcollection: userExams/{userId}/exams/{examId}
 * *** MODIFIED: Refined MCQ scoring logic for unanswered/incorrect states. ***
 * @param {string|null} courseId - The ID of the course (or null for standard tests).
 * @param {object} examState - The final state of the online test.
 * @param {string} examType - Type of exam (e.g., 'practice', 'skip_exam', 'assignment').
 * @returns {Promise<object|null>} The stored exam record including marking results, or null on failure.
 */
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
    try {
        let markingResults;
        const containsProblems = examState.questions?.some(q => q.isProblem);

        if (containsProblems) {
            // --- Exam contains problems - Use AI Marking ---
            console.log(`Exam ${examState.examId} contains problems. Calling markFullExam.`);
            markingResults = await markFullExam(examState);
            console.log(`AI Marking complete for Exam ID: ${examState.examId}`);
        } else {
            // --- Exam is MCQ-only - Score deterministically, skip AI call ---
            console.log(`Exam ${examState.examId} is MCQ-only. Scoring deterministically.`);
            markingResults = {
                totalScore: 0,
                maxPossibleScore: 0,
                questionResults: [],
                overallFeedback: null, // No AI overall feedback for MCQ-only
                timestamp: Date.now()
            };

            if (examState.questions && examState.questions.length > 0) {
                examState.questions.forEach((question, i) => {
                    // Assign a unique ID if missing
                    if (!question.id) {
                         question.id = `q-${i+1}`;
                    }
                    const studentAnswer = examState.userAnswers?.[question.id]; // Use optional chaining
                    const isProblem = question.isProblem || !question.options || question.options.length === 0; // Should be false here
                    const maxMarks = isProblem ? MAX_MARKS_PER_PROBLEM : MAX_MARKS_PER_MCQ;

                    // Ensure maxPossibleScore is incremented correctly
                    if (typeof maxMarks === 'number' && !isNaN(maxMarks)) {
                         markingResults.maxPossibleScore += maxMarks;
                    } else {
                         console.error(`Invalid maxMarks (${maxMarks}) for question ${question.id}. Skipping score calculation for this question.`);
                         // Optionally push a result indicating an error, or skip entirely
                           markingResults.questionResults.push({
                             questionId: question.id, questionIndex: i, score: 0, feedback: "Error: Invalid max marks.", key_points: [], improvement_suggestions: []
                         });
                         return; // Skip to next question if maxMarks is invalid
                    }


                    if (!isProblem) { // Double-check it's an MCQ
                        const correctAnswer = question.correctAnswer; // Usually a string like "A", "B" etc.

                        // *** REFINED CHECKS ***
                        let isCorrect = false;
                        let feedback = '';

                        // 1. Check if an answer was provided
                        if (studentAnswer !== undefined && studentAnswer !== null && studentAnswer !== '') {
                             // 2. Compare provided answer (case-insensitive, trim whitespace just in case)
                             if (String(studentAnswer).trim().toUpperCase() === String(correctAnswer).trim().toUpperCase()) {
                                 isCorrect = true;
                                 feedback = "Correct.";
                             } else {
                                 isCorrect = false;
                                 feedback = `Incorrect. The correct answer was ${correctAnswer || 'N/A'}.`;
                             }
                        } else {
                             // No answer provided
                             isCorrect = false;
                             feedback = `Not answered. The correct answer was ${correctAnswer || 'N/A'}.`;
                        }

                        const score = isCorrect ? maxMarks : 0;
                        markingResults.totalScore += score;

                        // Logging for debugging
                        console.log(`MCQ Scoring Q${i+1} (ID: ${question.id}): ` +
                                    `Student Answer='${studentAnswer}' (Type: ${typeof studentAnswer}), ` +
                                    `Correct Answer='${correctAnswer}' (Type: ${typeof correctAnswer}), ` +
                                    `isCorrect=${isCorrect}, Score=${score}/${maxMarks}`);

                        markingResults.questionResults.push({
                            questionId: question.id,
                            questionIndex: i,
                            score: score,
                            feedback: feedback, // Use generated feedback
                            key_points: [],
                            improvement_suggestions: isCorrect ? [] : ["Review the concepts related to this question."]
                        });
                    } else {
                        // This case shouldn't be hit due to the containsProblems check, but include for safety
                        console.warn(`Unexpected problem found (ID: ${question.id}) in MCQ-only processing loop.`);
                         markingResults.questionResults.push({
                             questionId: question.id, questionIndex: i, score: 0, feedback: "Error: Problem found in MCQ-only exam.", key_points: [], improvement_suggestions: []
                         });
                    }
                });
            } else {
                 console.warn("No questions found in MCQ-only examData to mark.");
                 markingResults.maxPossibleScore = 0; // Ensure max is 0 if no questions
            }
            // Clamp total score just in case of weirdness
            markingResults.totalScore = Math.max(0, Math.min(markingResults.totalScore, markingResults.maxPossibleScore));
            console.log(`Deterministic scoring complete for Exam ID: ${examState.examId}. Final Score: ${markingResults.totalScore}/${markingResults.maxPossibleScore}`);
        }


        // 2. Prepare the complete record for Firestore
        const examRecord = {
            id: examState.examId,
            userId: currentUser.uid, // Store user ID
            courseId: courseId || null, // Store course ID if applicable
            type: examType, // e.g., 'practice', 'skip_exam', 'assignment'
            timestamp: examState.startTime, // Use start time as the main timestamp
            durationMinutes: Math.round((Date.now() - examState.startTime) / 60000),
            questions: examState.questions, // Full question details (including text, options, correct answer for MCQ, isProblem flag)
            userAnswers: examState.userAnswers, // User's selections/inputs
            markingResults: markingResults, // Store the generated or AI marking object
            status: 'completed', // Mark as completed
            // Include course context if it exists
            courseContext: examState.courseContext || null
        };

        // 3. Save to the dedicated subcollection
        const examDocRef = db.collection('userExams').doc(currentUser.uid)
                           .collection('exams').doc(examState.examId);

        // MODIFIED: Log the data being saved for verification
        console.log("Saving exam record to Firestore:", JSON.stringify(examRecord, null, 2));
        await examDocRef.set(examRecord);
        console.log(`Exam record ${examState.examId} saved successfully to userExams subcollection.`);

        hideLoading();
        return examRecord; // Return the full record including marking

    } catch (error) {
        hideLoading();
        // MODIFIED: Log the specific Firestore error if available
        console.error(`Error storing exam result ${examState.examId}:`, error);
        // Check if it's a permissions error specifically
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
             alert(`Error storing exam results: Permission Denied. Please check Firestore rules for 'userExams/{userId}/exams/{examId}'.`);
        } else {
             alert(`Error storing exam results: ${error.message || String(error)}`);
        }
        return null;
    }
}

/**
 * Retrieves a specific exam record from Firestore.
 * @param {string} userId - The ID of the user.
 * @param {string} examId - The ID of the exam to retrieve.
 * @returns {Promise<object|null>} The exam data object or null if not found/error.
 */
export async function getExamDetails(userId, examId) {
    if (!db || !userId || !examId) {
        console.error("Cannot get exam details: Missing DB, userId, or examId.");
        return null;
    }
    try {
        const examDocRef = db.collection('userExams').doc(userId).collection('exams').doc(examId);
        const docSnap = await examDocRef.get();
        if (docSnap.exists()) {
            console.log(`Exam details retrieved for ${examId}`);
            return docSnap.data();
        } else {
            console.warn(`Exam document not found: ${examId} for user ${userId}`);
            return null;
        }
    } catch (error) {
        console.error(`Error retrieving exam details for ${examId}:`, error);
        return null;
    }
}

/**
 * Retrieves the exam history for a user (optionally filtered by course).
 * @param {string} userId - The ID of the user.
 * @param {string|null} [courseId=null] - Optional course ID to filter by.
 * @returns {Promise<Array<object>>} A promise resolving to an array of exam history summaries.
 */
export async function getExamHistory(userId, courseId = null) {
    if (!db || !userId) {
        console.error("Cannot get exam history: Missing DB or userId.");
        return [];
    }
    try {
        let query = db.collection('userExams').doc(userId).collection('exams');
        if (courseId) {
            query = query.where('courseId', '==', courseId);
        }
        query = query.orderBy('timestamp', 'desc').limit(50); // Order by most recent, limit results

        const snapshot = await query.get();
        const history = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Create a summary object for the list view
            history.push({
                id: data.id,
                type: data.type,
                timestamp: data.timestamp,
                score: data.markingResults?.totalScore ?? 0,
                maxScore: data.markingResults?.maxPossibleScore ?? (data.questions?.length * 10 || 0), // Estimate max if needed
                // MODIFIED: Look up course name safely
                courseName: globalCourseDataMap?.get(data.courseId)?.name || data.courseId || 'General Test',
                courseId: data.courseId, // Include courseId for filtering/linking
                status: data.status || 'completed'
            });
        });
        console.log(`Retrieved ${history.length} exam history entries for user ${userId} ${courseId ? `(course: ${courseId})` : ''}`);
        return history;
    } catch (error) {
        console.error(`Error retrieving exam history for user ${userId}:`, error);
        return [];
    }
}

/**
 * Displays the detailed review UI for a specific exam from the `userExams` collection.
 * @param {string} userId - The ID of the user who took the exam.
 * @param {string} examId - The ID of the exam to review.
 */
export async function showExamReviewUI(userId, examId) {
    if (!userId || !examId) {
        // MODIFIED: Use displayContent for consistency
        displayContent('<p class="text-red-500 p-4">Cannot show review: User or Exam ID missing.</p>');
        return;
    }
    showLoading("Loading Exam Review...");
    const examData = await getExamDetails(userId, examId);
    hideLoading();

    if (!examData) {
        // MODIFIED: Use displayContent for consistency
        displayContent('<p class="text-red-500 p-4">Could not load exam data for review.</p>');
        return;
    }

    // Check if examData.questions is defined and is an array
    const questions = Array.isArray(examData.questions) ? examData.questions : [];
    const userAnswers = examData.userAnswers || {};
    const markingResults = examData.markingResults || {};
    const courseId = examData.courseId;
    const type = examData.type || 'Unknown';
    const timestamp = examData.timestamp || Date.now(); // Fallback timestamp

    const score = markingResults.totalScore ?? 0;
    // Calculate maxScore based on actual questions array and types
    let calculatedMaxScore = 0;
    questions.forEach(q => {
        calculatedMaxScore += (q.isProblem ? MAX_MARKS_PER_PROBLEM : MAX_MARKS_PER_MCQ);
    });
    const maxScore = markingResults.maxPossibleScore > 0 ? markingResults.maxPossibleScore : calculatedMaxScore; // Use calculated if stored is 0
    const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : 0;
    // MODIFIED: Look up course name safely
    const courseName = courseId ? (globalCourseDataMap?.get(courseId)?.name || courseId) : 'General Test';
    const isPassing = percentage >= 50; // General passing threshold (adjust if needed based on type)

    // --- AI Follow-up State ---
    // We need to manage history *per question* within this UI scope
    let explanationHistories = {}; // Key: questionIndex, Value: history array

    let questionsHtml = questions.map((question, index) => {
         const result = markingResults.questionResults?.find(r => r.questionId === question.id) || { score: 'N/A', feedback: 'N/A', key_points: [], improvement_suggestions: [] };
         const questionScore = typeof result.score === 'number' ? result.score : 'N/A';
         const isProblem = question.isProblem || !question.options || question.options.length === 0;
         const qMaxScore = isProblem ? MAX_MARKS_PER_PROBLEM : MAX_MARKS_PER_MCQ;

        let studentAnswerHtml = '';
        if (userAnswers[question.id]) {
            // Render potential LaTeX in student answers if needed
            // MODIFIED: escapeHtml added for safety
            studentAnswerHtml = `<div class="prose prose-sm dark:prose-invert max-w-none">${escapeHtml(userAnswers[question.id])}</div>`;
        } else {
            studentAnswerHtml = '<span class="text-muted italic">No answer provided</span>';
        }

        let correctAnswerHtml = 'N/A';
        if (!isProblem && question.correctAnswer) {
             correctAnswerHtml = escapeHtml(question.correctAnswer);
        } else if(isProblem) {
             correctAnswerHtml = '<i class="text-muted text-xs">(Refer to Feedback/Explanation)</i>';
        }

        // Initialize history for this question
        explanationHistories[index] = [];

        return `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border dark:border-gray-700 mb-4">
                <div class="flex justify-between items-start mb-3 pb-3 border-b dark:border-gray-600">
                    <h4 class="font-semibold text-base text-gray-800 dark:text-gray-200">Question ${index + 1} <span class="text-xs font-normal text-gray-500 dark:text-gray-400">(${isProblem ? 'Problem' : 'MCQ'})</span></h4>
                    <span class="font-bold text-lg ${questionScore !== 'N/A' && questionScore >= (qMaxScore / 2) ? 'text-green-600' : 'text-red-600'}">
                        ${questionScore}/${qMaxScore}
                    </span>
                </div>

                <div class="space-y-3 text-sm">
                    <div>
                        <strong class="font-medium text-gray-600 dark:text-gray-300 block mb-1">Question:</strong>
                        <div class="prose prose-sm dark:prose-invert max-w-none">${question.text}</div>
                    </div>

                    ${!isProblem && question.options?.length > 0 ? `
                    <div>
                        <strong class="font-medium text-gray-600 dark:text-gray-300 block mb-1">Options:</strong>
                        <ul class="list-none pl-0 space-y-1">
                           ${question.options.map(opt => `<li><strong class="mr-1">${opt.letter}.</strong> <span class="option-text-container">${opt.text}</span></li>`).join('')}
                        </ul>
                    </div>` : ''}

                    <div>
                        <strong class="font-medium text-gray-600 dark:text-gray-300 block mb-1">Your Answer:</strong>
                        <div class="p-2 rounded bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 min-h-[3em]">${studentAnswerHtml}</div>
                    </div>

                     ${!isProblem ? `
                     <div>
                         <strong class="font-medium text-gray-600 dark:text-gray-300 block mb-1">Correct Answer:</strong>
                         <p class="text-gray-800 dark:text-gray-100">${correctAnswerHtml}</p>
                     </div>
                     ` : ''}


                    <div>
                        <strong class="font-medium text-gray-600 dark:text-gray-300 block mb-1">AI Feedback:</strong>
                        <div class="prose prose-sm dark:prose-invert max-w-none p-2 rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">${result.feedback || 'No feedback available.'}</div>
                    </div>

                    ${result.key_points?.length > 0 ? `
                    <div>
                        <strong class="font-medium text-gray-600 dark:text-gray-300 block mb-1">Key Points:</strong>
                        <ul class="list-disc list-inside space-y-1 pl-4 text-gray-600 dark:text-gray-400">
                            ${result.key_points.map(point => `<li>${escapeHtml(point)}</li>`).join('')}
                        </ul>
                    </div>` : ''}

                     ${result.improvement_suggestions?.length > 0 ? `
                    <div>
                        <strong class="font-medium text-gray-600 dark:text-gray-300 block mb-1">Improvement Suggestions:</strong>
                        <ul class="list-disc list-inside space-y-1 pl-4 text-gray-600 dark:text-gray-400">
                            ${result.improvement_suggestions.map(suggestion => `<li>${escapeHtml(suggestion)}</li>`).join('')}
                        </ul>
                    </div>` : ''}

                    <!-- AI Explanation/Chat Area -->
                    <div id="ai-explanation-${index}" class="mt-3 ai-explanation-container hidden space-y-2">
                         <p class="font-semibold text-purple-700 dark:text-purple-300 text-sm mb-1">AI Tutor Explanation:</p>
                         <div class="ai-explanation-content-area p-3 border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/30 rounded text-sm space-y-3">
                            <!-- Explanations will be loaded here -->
                         </div>
                         <!-- Follow-up Input -->
                         <div class="flex gap-2 mt-2">
                              <input type="text" id="follow-up-input-${index}" class="flex-grow text-sm" placeholder="Ask a follow-up question...">
                              <button onclick="window.askAIFollowUp('${examId}', ${index})" class="btn-secondary-small text-xs flex-shrink-0">Ask</button>
                         </div>
                    </div>

                    <div class="flex justify-end gap-2 pt-3 border-t dark:border-gray-600">
                        <button onclick="window.showAIExplanationSection('${examId}', ${index})" class="btn-secondary-small text-xs">
                             <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.375 3.375 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            AI Explanation
                        </button>
                        <button onclick="window.showIssueReportingModal('${examId}', ${index})" class="btn-warning-small text-xs">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            Report Issue
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const overallFeedbackHtml = markingResults.overallFeedback ? `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6 border dark:border-gray-700">
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

                <div class="mt-4">
                    <h4 class="font-medium text-blue-600 mb-2">Study Recommendations</h4>
                    <ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                        ${markingResults.overallFeedback.study_recommendations?.map(r => `<li>${escapeHtml(r)}</li>`).join('') || '<li>N/A</li>'}
                    </ul>
                </div>
            </div>
        </div>
    ` : '<p class="text-muted italic text-center my-4">No overall feedback available.</p>';

    const html = `
        <div class="space-y-6 animate-fade-in">
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border dark:border-gray-700">
                <div class="flex flex-wrap justify-between items-center gap-2 mb-4 pb-4 border-b dark:border-gray-600">
                    <div>
                        <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Exam Review</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Course: ${escapeHtml(courseName)} | Type: ${escapeHtml(type)} | Date: ${new Date(timestamp).toLocaleString()}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-3xl font-bold ${isPassing ? 'text-green-600' : 'text-red-600'}">${score}/${maxScore} (${percentage}%)</p>
                        <p class="text-lg font-medium ${isPassing ? 'text-green-600' : 'text-red-600'}">${isPassing ? 'PASS' : 'FAIL'}</p>
                    </div>
                </div>
                 ${overallFeedbackHtml}
                 <button onclick="window.history.back()" class="btn-secondary w-full mt-4">Go Back</button>
            </div>

             <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mt-6 mb-4">Question Breakdown</h3>
             <div id="review-questions-container" class="space-y-4">
                 ${questionsHtml || '<p class="text-muted italic text-center my-4">No question details found.</p>'}
             </div>
        </div>
    `;

    displayContent(html);
    // Store the explanationHistories object globally or pass it around if needed for state persistence
    // For simplicity, we'll re-fetch exam data each time an explanation is requested for now.
    window.currentExplanationHistories = explanationHistories;

    // Render MathJax after content is added
    requestAnimationFrame(async () => {
        const container = document.getElementById('review-questions-container');
        if (container) {
            console.log("Rendering MathJax for review questions...");
            await renderMathIn(container);
            console.log("MathJax rendering complete for review.");
        }
    });
}


// --- AI Explanation Display & Follow-up ---
window.showAIExplanationSection = async (examId, questionIndex) => {
    const explanationContainer = document.getElementById(`ai-explanation-${questionIndex}`);
    const explanationContentArea = explanationContainer?.querySelector('.ai-explanation-content-area');
    if (!explanationContainer || !explanationContentArea) return;

    const isHidden = explanationContainer.classList.contains('hidden');
    explanationContainer.classList.toggle('hidden');

    // If revealing and content is empty or just has placeholder, fetch initial explanation
    if (isHidden && (!explanationContentArea.innerHTML || explanationContentArea.innerHTML.includes('Loading explanation...'))) {
        explanationContentArea.innerHTML = `<div class="flex items-center justify-center p-2"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="ml-2 text-sm text-muted">Generating explanation...</p></div>`;

        const examData = await getExamDetails(currentUser.uid, examId);
        if (!examData || !examData.questions || !examData.questions[questionIndex]) {
            explanationContentArea.innerHTML = '<p class="text-danger text-sm">Error: Could not load question data.</p>';
            return;
        }

        const question = examData.questions[questionIndex];
        const studentAnswer = examData.userAnswers[question.id];
        const isProblem = question.isProblem || !question.options || question.options.length === 0;
        const correctAnswer = isProblem ? null : question.correctAnswer;

        try {
            // Initial call, no history needed yet
            const result = await generateExplanation(question, correctAnswer, studentAnswer, []);
            window.currentExplanationHistories[questionIndex] = result.history; // Store initial history
            explanationContentArea.innerHTML = `<div class="ai-chat-turn">${result.explanationHtml}</div>`; // Initial explanation
            await renderMathIn(explanationContentArea);
        } catch (error) {
            explanationContentArea.innerHTML = `<p class="text-danger text-sm">Error generating explanation: ${error.message}</p>`;
        }
    }
};

window.askAIFollowUp = async (examId, questionIndex) => {
    const inputElement = document.getElementById(`follow-up-input-${questionIndex}`);
    const explanationContentArea = document.getElementById(`ai-explanation-${questionIndex}`)?.querySelector('.ai-explanation-content-area');
    if (!inputElement || !explanationContentArea || !window.currentExplanationHistories) return;

    const followUpText = inputElement.value.trim();
    if (!followUpText) return;

    inputElement.disabled = true;
    const askButton = inputElement.nextElementSibling; // Get the button
    if (askButton) askButton.disabled = true;

    // Append user's follow-up to the chat display
    const userFollowUpHtml = `<div class="ai-chat-turn mt-3 pt-3 border-t border-purple-200 dark:border-purple-600"><p class="text-sm font-medium text-gray-700 dark:text-gray-300">You:</p><div class="prose prose-sm dark:prose-invert max-w-none">${escapeHtml(followUpText)}</div></div>`;
    explanationContentArea.insertAdjacentHTML('beforeend', userFollowUpHtml);

    // Append loading indicator for AI response
    const loadingHtml = `<div class="ai-chat-turn ai-loading mt-3 pt-3 border-t border-purple-200 dark:border-purple-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p><div class="flex items-center space-x-2 mt-1"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-xs text-muted">Thinking...</p></div></div>`;
    explanationContentArea.insertAdjacentHTML('beforeend', loadingHtml);
    explanationContentArea.scrollTop = explanationContentArea.scrollHeight; // Scroll down

    const history = window.currentExplanationHistories[questionIndex] || [];

    try {
        // Send follow-up using generateExplanation (which now handles history)
        // We don't need the original question/answer details for follow-ups,
        // just the history and the user's text. Pass null for question/correctAnswer.
        // Pass the followUpText as the 'studentAnswer' argument for this call.
        const result = await generateExplanation(null, null, followUpText, history);

        // Update history state
        window.currentExplanationHistories[questionIndex] = result.history;

        // Remove loading indicator
        const loadingIndicator = explanationContentArea.querySelector('.ai-loading');
        if (loadingIndicator) loadingIndicator.remove();

        // Append AI's response
        const aiResponseHtml = `<div class="ai-chat-turn mt-3 pt-3 border-t border-purple-200 dark:border-purple-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p>${result.explanationHtml}</div>`;
        explanationContentArea.insertAdjacentHTML('beforeend', aiResponseHtml);
        inputElement.value = ''; // Clear input
        await renderMathIn(explanationContentArea); // Re-render math
        explanationContentArea.scrollTop = explanationContentArea.scrollHeight; // Scroll down


    } catch (error) {
        console.error("Error asking AI follow-up:", error);
        const loadingIndicator = explanationContentArea.querySelector('.ai-loading');
        if (loadingIndicator) loadingIndicator.remove();
        explanationContentArea.insertAdjacentHTML('beforeend', `<p class="text-danger text-sm mt-2">Error getting follow-up: ${error.message}</p>`);
    } finally {
        inputElement.disabled = false;
        if (askButton) askButton.disabled = false;
    }
};

// --- Issue Reporting ---

/**
 * Displays a modal for reporting an issue with a specific question or its marking.
 * (This function remains largely the same, but we ensure it's exported and available)
 */
export function showIssueReportingModal(examId, questionIndex) {
    // Remove existing modal first
    document.getElementById('issue-report-modal')?.remove();

    const modalHtml = `
        <div id="issue-report-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[70] p-4" aria-labelledby="issue-report-title" role="dialog" aria-modal="true">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg transform transition-all">
                <div class="flex justify-between items-center mb-4">
                    <h3 id="issue-report-title" class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Report Issue for Question ${questionIndex + 1}</h3>
                    <button onclick="document.getElementById('issue-report-modal').remove()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">×</button>
                </div>
                <div class="space-y-4">
                    <div>
                        <label for="issue-type" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Type</label>
                        <select id="issue-type" class="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500">
                            <option value="incorrect_marking">Incorrect AI Marking/Score</option>
                            <option value="unclear_feedback">Unclear AI Feedback</option>
                            <option value="incorrect_explanation">Incorrect AI Explanation</option>
                            <option value="question_ambiguous">Question is Ambiguous/Unclear</option>
                            <option value="incorrect_mcq_answer">MCQ Correct Answer Seems Wrong</option>
                            <option value="technical_error">Display/Technical Error</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label for="issue-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea id="issue-description" class="w-full h-32 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-primary-500 focus:border-primary-500" placeholder="Please provide details about the issue..."></textarea>
                    </div>
                    <div class="flex justify-end gap-3">
                        <button onclick="document.getElementById('issue-report-modal').remove()" class="btn-secondary">
                            Cancel
                        </button>
                        <button onclick="window.submitIssueReport('${examId}', ${questionIndex})" class="btn-primary">
                            Submit Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('issue-description').focus(); // Focus description field
}

/**
 * Submits the issue report to Firestore.
 * (This function remains largely the same, uses imported submitFeedback)
 */
export async function submitIssueReport(examId, questionIndex) {
    const issueType = document.getElementById('issue-type')?.value;
    const description = document.getElementById('issue-description')?.value.trim();

    if (!description) {
        alert('Please provide a description of the issue.');
        document.getElementById('issue-description')?.focus();
        return;
    }
     if (!issueType) {
         alert('Please select an issue type.');
         return;
     }
    if (!currentUser || !db) {
         alert('Error: Could not submit report. User or DB connection missing.');
         return;
     }

    showLoading('Submitting report...');

    try {
        // Fetch question details to include context in the report
        const examData = await getExamDetails(currentUser.uid, examId);
        const questionData = examData?.questions?.[questionIndex];
        const markingResultData = examData?.markingResults?.questionResults?.find(r => r.questionId === questionData?.id);

        const reportPayload = {
            subjectId: examData?.courseId || 'Standard Test', // Use courseId or default
            questionId: questionData?.id || `Exam-${examId}-Q${questionIndex+1}`, // Best available ID
            feedbackText: `Issue Type: ${issueType}\n\nDescription:\n${description}\n\n------ Context ------\nExam ID: ${examId}\nQuestion Index: ${questionIndex}\nQuestion Text Snippet: ${questionData?.text?.substring(0, 200) || 'N/A'}\nUser Answer Snippet: ${examData?.userAnswers?.[questionData?.id]?.substring(0, 200) || 'N/A'}\nAI Feedback Snippet: ${markingResultData?.feedback?.substring(0, 200) || 'N/A'}`,
            context: `Exam Issue Report (Exam: ${examId}, Q: ${questionIndex+1})`
        };

        const success = await submitFeedback(reportPayload, currentUser);

        hideLoading();
        if(success) {
            alert('Report submitted successfully. Thank you for your feedback!');
            document.getElementById('issue-report-modal')?.remove(); // Close modal
        } else {
             alert('Failed to submit report. Please try again.');
        }

    } catch (error) {
        hideLoading();
        console.error("Error submitting issue report:", error);
        alert(`Failed to submit report: ${error.message}`);
    }
}


// --- END OF FILE exam_storage.js ---