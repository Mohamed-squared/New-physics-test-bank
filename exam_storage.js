// --- START OF FILE exam_storage.js ---

import { db, currentUser, globalCourseDataMap, currentSubject } from './state.js'; // Added currentSubject
import { showLoading, hideLoading, escapeHtml, getFormattedDate } from './utils.js';
// MODIFIED: Import AI marking and explanation generation
import { markFullExam, generateExplanation } from './ai_exam_marking.js';
import { renderMathIn } from './utils.js'; // Import MathJax renderer
// MODIFIED: Import displayContent and setActiveSidebarLink
import { displayContent, setActiveSidebarLink } from './ui_core.js';
// MODIFIED: Import submitFeedback from firestore
import { submitFeedback } from './firebase_firestore.js';
// MODIFIED: Import config for MAX_MARKS
import { MAX_MARKS_PER_PROBLEM, MAX_MARKS_PER_MCQ, SKIP_EXAM_PASSING_PERCENT, PASSING_GRADE_PERCENT } from './config.js';



// --- Exam Storage and Retrieval Functions ---

/**
 * Stores the completed exam data (including AI marking results) in Firestore.
 * Uses a dedicated subcollection: userExams/{userId}/exams/{examId}
 * @param {string|null} courseId - The ID of the course (or null for standard tests).
 * @param {object} examState - The final state of the online test.
 * @param {string} examType - Type of exam (e.g., 'practice', 'skip_exam', 'assignment', 'testgen').
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
    let examRecord; // Define examRecord in outer scope to log in catch if needed

    try {
        // Call the central marking function (which handles MCQ vs Problem internally)
        console.log(`Calling markFullExam for Exam ID: ${examState.examId}, Type: ${examType}`);
        const markingResults = await markFullExam(examState);
        console.log(`Marking complete for Exam ID: ${examState.examId}`);

        // Prepare the complete record for Firestore
        examRecord = { // Assign to outer scope variable
            id: examState.examId, // Ensure ID is set
            examId: examState.examId, // Add redundant ID field for compatibility
            userId: currentUser.uid,
            courseId: courseId || null, // Store course ID if applicable
            subjectId: examState.subjectId || null,
            type: examType, // e.g., 'practice', 'skip_exam', 'assignment', 'testgen'
            timestamp: examState.startTime, // Use start time as the main timestamp
            durationMinutes: Math.round((Date.now() - examState.startTime) / 60000),
            questions: examState.questions, // Full question details (should include correctAnswer)
            userAnswers: examState.userAnswers, // User's selections/inputs
            markingResults: markingResults, // Store the generated or AI marking object
            status: 'completed', // Mark as completed
            courseContext: examState.courseContext || null // Include course context if it exists
        };

        // Save to the dedicated subcollection
        const examDocRef = db.collection('userExams').doc(currentUser.uid)
                           .collection('exams').doc(examState.examId);

        // *** ADDED Specific Try/Catch for the Firestore write operation ***
        try {
            console.log("Attempting to write exam record to Firestore path:", examDocRef.path);
            // Ensure data is serializable right before saving
            const cleanExamRecord = JSON.parse(JSON.stringify(examRecord));
            await examDocRef.set(cleanExamRecord);
            console.log(`Exam record ${examState.examId} saved successfully to userExams subcollection.`);
        } catch (writeError) {
            console.error(`Firestore write error for exam ${examState.examId}:`, writeError);
            // Log the data that failed to save for easier debugging of serialization issues
            try { console.error("Data that failed to save:", JSON.stringify(examRecord, null, 2)); } catch { console.error("Data that failed to save (could not stringify):", examRecord); }
            // Re-throw a more specific error to be caught by the outer catch block
            throw new Error(`Failed to save exam data to Firestore: ${writeError.message}`);
        }
        // *** END Specific Try/Catch ***

        hideLoading();
        return examRecord; // Return the full record including marking

    } catch (error) { // Outer catch block handles marking errors or re-thrown write errors
        hideLoading();
        console.error(`Error storing exam result ${examState.examId}:`, error);
        // Log data if it was prepared before the error
        if (examRecord) {
             try { console.error("Exam record state just before error:", JSON.stringify(examRecord, null, 2)); } catch { console.error("Exam record state just before error (could not stringify):", examRecord);}
        }
        // Provide specific user feedback
        if (error.message.includes("Failed to save exam data")) { // Check for our re-thrown error
             alert(`Error storing exam results: ${error.message}. Please check console logs for details (possible data issue or permissions).`);
        } else if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
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
        // Use .exists property for compat SDK
        if (docSnap.exists) {
            console.log(`Exam details retrieved for ${examId}`);
            return docSnap.data();
        } else {
            // This is where the error currently happens
            console.warn(`Exam document not found at path: userExams/${userId}/exams/${examId}`);
            return null;
        }
    } catch (error) {
        console.error(`Error retrieving exam details for ${examId}:`, error);
        return null;
    }
}

/**
 * Retrieves the exam history for a user (optionally filtered by course or subject).
 * @param {string} userId - The ID of the user.
 * @param {string|null} [filterId=null] - Course ID or Subject ID to filter by.
 * @param {'course' | 'subject' | 'all'} [filterType='all'] - Type of filter.
 * @returns {Promise<Array<object>>} A promise resolving to an array of exam history summaries.
 */
export async function getExamHistory(userId, filterId = null, filterType = 'all') {
    if (!db || !userId) {
        console.error("Cannot get exam history: Missing DB or userId.");
        return [];
    }
    try {
        let query = db.collection('userExams').doc(userId).collection('exams');

        if (filterType === 'course' && filterId) {
            query = query.where('courseId', '==', filterId);
            console.log(`Filtering exam history by courseId: ${filterId}`);
        } else if (filterType === 'subject' && filterId) {
            // Filter where courseId is explicitly null (TestGen) AND subjectId matches
            query = query.where('courseId', '==', null).where('subjectId', '==', filterId);
            console.log(`Filtering exam history by subjectId: ${filterId} (and courseId == null)`);
        } else if (filterType === 'all') {
            console.log(`Fetching all exam history for user ${userId}`);
            // No specific filter applied here
        }

        query = query.orderBy('timestamp', 'desc').limit(50); // Order by most recent, limit results

        const snapshot = await query.get();
        const history = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const isCourseExam = !!data.courseId;
            // Use global state 'data' to access subject names
            const subjectName = !isCourseExam && data.subjectId ? (window.data?.subjects?.[data.subjectId]?.name || data.subjectId) : null;
            const courseName = isCourseExam ? (globalCourseDataMap?.get(data.courseId)?.name || data.courseId) : null;

            // Estimate max score if missing or zero
            let maxScore = data.markingResults?.maxPossibleScore;
            if (!maxScore || maxScore <= 0) {
                 maxScore = (data.questions || []).reduce((sum, q) => {
                      const isProblem = q.isProblem || !q.options || q.options.length === 0;
                      return sum + (isProblem ? MAX_MARKS_PER_PROBLEM : MAX_MARKS_PER_MCQ);
                 }, 0);
            }

            history.push({
                id: data.id,
                type: data.type || 'unknown',
                timestamp: data.timestamp,
                score: data.markingResults?.totalScore ?? 0,
                maxScore: maxScore || 0, // Ensure maxScore is at least 0
                name: courseName || subjectName || 'Unknown Context', // Display Course or Subject Name
                courseId: data.courseId,
                subjectId: data.subjectId,
                status: data.status || 'completed'
            });
        });
        console.log(`Retrieved ${history.length} exam history entries for user ${userId} (Filter: ${filterType}, ID: ${filterId || 'None'})`);
        return history;
    } catch (error) {
        console.error(`Error retrieving exam history for user ${userId}:`, error);
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

// Initialize history tracking for the review UI
if (!window.currentExplanationHistories) {
     window.currentExplanationHistories = {};
}

/**
 * Displays the detailed review UI for a specific exam from the `userExams` collection.
 * @param {string} userId - The ID of the user who took the exam.
 * @param {string} examId - The ID of the exam to review.
 */
export async function showExamReviewUI(userId, examId) {
    console.log(`[showExamReviewUI] Starting review for User ID: ${userId}, Exam ID: ${examId}`);
    console.log(`[showExamReviewUI] Current timestamp: ${new Date().toISOString()}`);

    if (!userId || !examId) {
        console.error("Cannot show exam review: Missing userId or examId");
        displayContent('<p class="text-red-500 p-4">Error: Invalid exam identifier.</p>', 'content'); // Display error in main area
        return;
    }
    setActiveSidebarLink('showExamsDashboard', 'testgen-dropdown-content'); // Keep Exams Dash active
    showLoading("Loading Exam Review...");
    // Reset explanation history for this new review session
    window.currentExplanationHistories = {};

    try {
        const examDetails = await getExamDetails(userId, examId);

        if (!examDetails) {
            hideLoading();
            console.error(`No exam details found for exam ${examId}`);
            displayContent(`<p class="text-red-500 p-4">Error: Could not find details for exam ID: ${examId}. It might have been deleted or the ID is incorrect.</p><button onclick="window.showExamsDashboard()" class="btn-secondary mt-2">Back to Exams</button>`, 'content');
            return;
        }

        console.log(`Successfully fetched exam details for ${examId}, rendering review UI.`);

        const { markingResults, courseContext, timestamp, type, subjectId, courseId, questions, userAnswers } = examDetails;
        const score = markingResults?.totalScore ?? 0;
        const maxScore = markingResults?.maxPossibleScore ?? 0;
        const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : 0;
        const date = new Date(timestamp).toLocaleString();
        const durationMinutes = examDetails.durationMinutes;
        const isCourse = !!courseId;
        const passThreshold = type === 'skip_exam' ? SKIP_EXAM_PASSING_PERCENT : PASSING_GRADE_PERCENT;
        const isPassing = parseFloat(percentage) >= passThreshold;

        // Determine context name (Course or Subject)
        const contextName = isCourse ? (globalCourseDataMap.get(courseId)?.name || courseId)
                           : subjectId ? (window.data?.subjects?.[subjectId]?.name || subjectId)
                           : 'Standard Test';
        const typeDisplay = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        let questionsHtml = '<p class="text-center text-muted italic">No question data found in this record.</p>';
        if (questions && questions.length > 0 && markingResults?.questionResults) {
            questionsHtml = '<div class="space-y-4">';
            questions.forEach((q, index) => {
                 // Ensure question has an ID, fallback if needed
                 const questionId = q.id || `q-${index+1}`;
                 // Find the corresponding marking result using questionId
                 const result = markingResults.questionResults.find(r => r.questionId === questionId);
                 const qScore = result?.score ?? 0;
                 const qMaxScore = q.isProblem ? MAX_MARKS_PER_PROBLEM : MAX_MARKS_PER_MCQ;
                 const isCorrect = !q.isProblem && (userAnswers?.[questionId] === q.correctAnswer); // Simple check for MCQ correctness
                 const qFeedback = result?.feedback || "No specific feedback.";
                 const keyPoints = result?.key_points || [];
                 const improvements = result?.improvement_suggestions || [];
                 const userAnswer = userAnswers?.[questionId] || "<i>Not Answered</i>";

                 // Determine visual style based on score vs max score
                 let statusClass = 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'; // Default
                 if (qScore === qMaxScore && qMaxScore > 0) statusClass = 'border-green-500 bg-green-50 dark:bg-green-900/30'; // Full marks
                 else if (qScore > 0) statusClass = 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30'; // Partial marks
                 else statusClass = 'border-red-500 bg-red-50 dark:bg-red-900/30'; // Zero marks

                 const imageHtml = q.image ? `<div class="my-3 flex justify-center"><img src="${q.image}" alt="Question Image" class="max-w-md h-auto border dark:border-gray-600 rounded" crossorigin="anonymous"></div>` : '';

                 let optionsOrAnswerHtml = '';
                 if (q.isProblem) {
                     optionsOrAnswerHtml = `<div class="mt-2"><p class="text-xs font-semibold mb-1">Your Answer:</p><div class="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-700 p-2 rounded border dark:border-gray-600 whitespace-pre-wrap">${escapeHtml(userAnswer)}</div></div>`;
                 } else {
                     // MCQ Options
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
                             <span class="font-semibold text-sm ${qScore === qMaxScore && qMaxScore > 0 ? 'text-green-600' : qScore > 0 ? 'text-yellow-600' : 'text-red-600'}">${qScore.toFixed(1)} / ${qMaxScore.toFixed(1)} pts</span>
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
                                <!-- AI Explanation and follow-up input will load here -->
                                <p class="text-sm italic text-muted">Loading explanation...</p>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="mt-3 text-right space-x-2">
                            <button onclick="window.showAIExplanationSection('${examId}', ${index})" class="btn-secondary-small text-xs" title="Get a step-by-step explanation from AI">
                                 <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.375 3.375 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                Explain (AI)
                             </button>
                            <button onclick="window.showIssueReportingModal('${examId}', ${index})" class="btn-warning-small text-xs" title="Report an issue with this question or its marking">
                                 <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                Report Issue
                            </button>
                        </div>
                    </div>
                 `;
            });
            questionsHtml += '</div>'; // Close space-y-4
        }

        // Overall Feedback Section
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
                <!-- Summary Header -->
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

                <!-- Overall Feedback -->
                ${overallFeedbackHtml}

                <!-- Question Breakdown -->
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

        // Use displayContent to render in the main area
        displayContent(reviewHtml, 'content');
        // Render MathJax in the questions container
        const questionsContainer = document.getElementById('review-questions-container');
        if (questionsContainer) await renderMathIn(questionsContainer);
        const overallFeedbackContainer = document.querySelector('.overall-feedback-area');
        if (overallFeedbackContainer) await renderMathIn(overallFeedbackContainer);

        hideLoading();

    } catch (error) {
        hideLoading();
        console.error(`Error showing exam review for ${examId}:`, error);
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
        console.error('Error generating AI explanation:', error);
        container.innerHTML = `
            <h4>AI Explanation</h4>
            <p>Unable to generate explanation at this time.</p>
        `;
    }
}

// --- AI Explanation Display & Follow-up ---
export const showAIExplanationSection = async (examId, questionIndex) => {
    console.log(`[showAIExplanationSection] Starting for examId: ${examId}, questionIndex: ${questionIndex}`);
    
    const explanationContainer = document.getElementById(`ai-explanation-${questionIndex}`);
    const explanationContentArea = explanationContainer?.querySelector('.ai-explanation-content-area');
    
    if (!explanationContainer || !explanationContentArea) {
        console.error('Required DOM elements not found');
        return;
    }

    const isHidden = explanationContainer.classList.contains('hidden');
    explanationContainer.classList.toggle('hidden');

    // If hiding, just return
    if (!isHidden) {
        console.log('Hiding explanation section');
        return;
    }

    // Initialize or reset the conversation history for this question
    if (!window.currentExplanationHistories) {
        window.currentExplanationHistories = {};
    }

    // If revealing and content is empty, fetch initial explanation
    if (!explanationContentArea.innerHTML.trim() || explanationContentArea.innerHTML.includes('Loading explanation...')) {
        try {
            // Show loading state
            explanationContentArea.innerHTML = `<div class="flex items-center justify-center p-2">
                <div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div>
                <p class="ml-2 text-sm text-muted">Generating explanation...</p>
            </div>`;

            console.log('Fetching exam details...');
            const examData = await getExamDetails(currentUser.uid, examId);
            
            if (!examData) {
                throw new Error('Failed to fetch exam data');
            }
            if (!examData.questions || !examData.questions[questionIndex]) {
                throw new Error('Question data not found');
            }

            const question = examData.questions[questionIndex];
            const studentAnswer = examData.userAnswers?.[question.id];
            const isProblem = question.isProblem || !question.options || question.options.length === 0;

            console.log('Generating explanation...');
            // Initial call, empty history - Pass question object which now contains correctAnswer
            const result = await generateExplanation(question, null, studentAnswer, []); // Pass null for deprecated correctAnswer param
            
            if (!result || !result.explanationHtml) {
                throw new Error('Failed to generate explanation');
            }

            // Initialize the conversation history with the first explanation
            window.currentExplanationHistories[questionIndex] = result.history;
            
            // Create the conversation container
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
            console.log('Explanation generated and rendered successfully');

        } catch (error) {
            console.error("Error in showAIExplanationSection:", error);
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

// Assign to window for HTML onclick access
window.showAIExplanationSection = showAIExplanationSection;

// Handle follow-up questions
export const askAIFollowUp = async (examId, questionIndex) => {
    console.log(`[askAIFollowUp] Starting for examId: ${examId}, questionIndex: ${questionIndex}`);
    
    const explanationContainer = document.getElementById(`ai-explanation-${questionIndex}`);
    const explanationContentArea = explanationContainer?.querySelector('.ai-explanation-content-area');
    const conversationContainer = explanationContentArea?.querySelector('.conversation-container');
    const inputElement = document.getElementById(`follow-up-input-${questionIndex}`);
    
    if (!explanationContainer || !explanationContentArea || !conversationContainer || !inputElement) {
        console.error('Required DOM elements not found for follow-up');
        return;
    }

    const followUpText = inputElement.value.trim();
    if (!followUpText) {
        console.log('No follow-up text provided');
        return;
    }

    // Disable input while processing
    inputElement.disabled = true;
    const askButton = inputElement.nextElementSibling;
    if (askButton) askButton.disabled = true;

    try {
        // Append user's question to the conversation
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

        // Scroll to the latest message
        conversationContainer.scrollTop = conversationContainer.scrollHeight;

        // Get the conversation history
        const history = window.currentExplanationHistories[questionIndex] || [];
        
        // Generate follow-up response
        const result = await generateExplanation(null, null, followUpText, history);
        
        // Remove loading indicator
        const loadingDiv = conversationContainer.querySelector('.ai-message-loading');
        if (loadingDiv) loadingDiv.remove();

        // Add AI's response
        conversationContainer.insertAdjacentHTML('beforeend', `
            <div class="ai-message bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <p class="font-medium text-sm text-purple-700 dark:text-purple-300 mb-2">AI Response:</p>
                <div class="prose prose-sm dark:prose-invert">${result.explanationHtml}</div>
            </div>
        `);

        // Update conversation history
        window.currentExplanationHistories[questionIndex] = result.history;

        // Clear input
        inputElement.value = '';
        
        // Render any math in the new response
        await renderMathIn(conversationContainer.lastElementChild);

        // Scroll to the new response
        conversationContainer.scrollTop = conversationContainer.scrollHeight;

    } catch (error) {
        console.error("Error in askAIFollowUp:", error);
        // Remove loading indicator if it exists
        conversationContainer.querySelector('.ai-message-loading')?.remove();
        
        // Add error message
        conversationContainer.insertAdjacentHTML('beforeend', `
            <div class="error-message bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <p class="font-medium text-sm text-red-700 dark:text-red-300">Error:</p>
                <p class="text-sm mt-1">${error.message || 'An unexpected error occurred'}</p>
            </div>
        `);
        
        // Scroll to error message
        conversationContainer.scrollTop = conversationContainer.scrollHeight;
    } finally {
        // Re-enable input
        inputElement.disabled = false;
        if (askButton) askButton.disabled = false;
        // Focus back on input for convenience
        inputElement.focus();
    }
};

// Assign to window for HTML onclick access
window.askAIFollowUp = askAIFollowUp;

// --- Issue Reporting ---

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
window.showIssueReportingModal = showIssueReportingModal; // Assign to window

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
        const subjectContext = examData?.courseId ? `Course: ${examData.courseId}` : (examData?.subjectId ? `Subject: ${examData.subjectId}` : 'N/A');

        const reportPayload = {
            subjectId: subjectContext, // Use combined context
            questionId: qId,
            feedbackText: `Issue Type: ${issueType}\n\nDescription:\n${description}\n\n------ Context ------\nExam ID: ${examId}\nQuestion Index: ${questionIndex}\nQuestion Text Snippet: ${questionData?.text?.substring(0, 200) || 'N/A'}\nUser Answer Snippet: ${examData?.userAnswers?.[qId]?.substring(0, 200) || 'N/A'}\nAI Feedback Snippet: ${markingResultData?.feedback?.substring(0, 200) || 'N/A'}`,
            context: `Exam Issue Report (Exam: ${examId}, Q: ${questionIndex+1})`
        };

        const success = await submitFeedback(reportPayload, currentUser); // submitFeedback now uses 'examIssues' collection
        hideLoading();
        if(success) {
            alert('Report submitted successfully. Thank you!');
            document.getElementById('issue-report-modal')?.remove();
        } else {
             alert('Failed to submit report. Please try again.');
        }
    } catch (error) {
        hideLoading();
        console.error("Error submitting issue report:", error);
        alert(`Failed to submit report: ${error.message}`);
    }
}
window.submitIssueReport = submitIssueReport; // Assign to window


// --- END OF FILE exam_storage.js ---