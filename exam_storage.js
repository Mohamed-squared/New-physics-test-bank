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
 * *** MODIFIED: Refined MCQ scoring logic for unanswered/incorrect states. ***
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
            id: examState.examId,
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

/**
 * Displays the detailed review UI for a specific exam from the `userExams` collection.
 * @param {string} userId - The ID of the user who took the exam.
 * @param {string} examId - The ID of the exam to review.
 */
export async function showExamReviewUI(userId, examId) {
    if (!userId || !examId) {
        console.error("Cannot show exam review: Missing userId or examId");
        return;
    }

    console.log(`Attempting to show exam review for exam ${examId}`);
    
    try {
        const examDetails = await getExamDetails(userId, examId);
        if (!examDetails) {
            console.error(`No exam details found for exam ${examId}`);
            return;
        }

        console.log(`Successfully fetched exam details for ${examId}`);
        
        // Create and show the review UI
        const reviewContainer = document.createElement('div');
        reviewContainer.className = 'exam-review-container';
        
        // Add exam summary
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'exam-summary';
        summaryDiv.innerHTML = `
            <h2>Exam Review</h2>
            <p>Score: ${examDetails.score}%</p>
            <p>Time Taken: ${examDetails.timeTaken} minutes</p>
        `;
        reviewContainer.appendChild(summaryDiv);

        // Add questions review
        const questionsDiv = document.createElement('div');
        questionsDiv.className = 'questions-review';
        
        examDetails.questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-review';
            questionDiv.innerHTML = `
                <h3>Question ${index + 1}</h3>
                <p>${question.text}</p>
                <p>Your answer: ${question.userAnswer}</p>
                <p>Correct answer: ${question.correctAnswer}</p>
                <div class="ai-explanation"></div>
            `;
            
            // Add AI explanation
            const explanationDiv = questionDiv.querySelector('.ai-explanation');
            generateAIExplanation(question, explanationDiv);
            
            questionsDiv.appendChild(questionDiv);
        });
        
        reviewContainer.appendChild(questionsDiv);
        
        // Add to DOM
        document.body.appendChild(reviewContainer);
        
    } catch (error) {
        console.error(`Error showing exam review for ${examId}:`, error);
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = 'An error occurred while loading the exam review. Please try again later.';
        document.body.appendChild(errorDiv);
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
window.showAIExplanationSection = async (examId, questionIndex) => {
    const explanationContainer = document.getElementById(`ai-explanation-${questionIndex}`);
    const explanationContentArea = explanationContainer?.querySelector('.ai-explanation-content-area');
    if (!explanationContainer || !explanationContentArea) return;

    const isHidden = explanationContainer.classList.contains('hidden');
    explanationContainer.classList.toggle('hidden');

    // If revealing and content is empty, fetch initial explanation
    if (isHidden && !explanationContentArea.innerHTML.trim()) {
        explanationContentArea.innerHTML = `<div class="flex items-center justify-center p-2"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="ml-2 text-sm text-muted">Generating explanation...</p></div>`;

        const examData = await getExamDetails(currentUser.uid, examId);
        if (!examData || !examData.questions || !examData.questions[questionIndex]) {
            explanationContentArea.innerHTML = '<p class="text-danger text-sm">Error: Could not load question data.</p>';
            return;
        }

        const question = examData.questions[questionIndex];
        const studentAnswer = examData.userAnswers[question.id];
        // Use question.correctAnswer
        const isProblem = question.isProblem || !question.options || question.options.length === 0;
        const correctAnswer = isProblem ? null : question.correctAnswer;

        try {
            // Initial call, empty history - Pass question object which now contains correctAnswer
            const result = await generateExplanation(question, null, studentAnswer, []); // Pass null for deprecated correctAnswer param
            window.currentExplanationHistories[questionIndex] = result.history; // Store initial history
            explanationContentArea.innerHTML = `<div class="ai-chat-turn">${result.explanationHtml}</div>`; // Initial explanation
            await renderMathIn(explanationContentArea);
        } catch (error) {
            console.error("Error fetching initial explanation:", error);
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
    const askButton = inputElement.nextElementSibling;
    if (askButton) askButton.disabled = true;

    // Append user's follow-up
    explanationContentArea.insertAdjacentHTML('beforeend', `<div class="ai-chat-turn mt-3 pt-3 border-t border-purple-200 dark:border-purple-600"><p class="text-sm font-medium text-gray-700 dark:text-gray-300">You:</p><div class="prose prose-sm dark:prose-invert max-w-none">${escapeHtml(followUpText)}</div></div>`);

    // Append loading indicator
    const loadingHtml = `<div class="ai-chat-turn ai-loading mt-3 pt-3 border-t border-purple-200 dark:border-purple-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p><div class="flex items-center space-x-2 mt-1"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-xs text-muted">Thinking...</p></div></div>`;
    explanationContentArea.insertAdjacentHTML('beforeend', loadingHtml);
    explanationContentArea.scrollTop = explanationContentArea.scrollHeight;

    const history = window.currentExplanationHistories[questionIndex] || [];

    try {
        // Pass followUpText as the 'studentAnswer' argument for the API call
        const result = await generateExplanation(null, null, followUpText, history);

        window.currentExplanationHistories[questionIndex] = result.history; // Update history state

        explanationContentArea.querySelector('.ai-loading')?.remove(); // Remove loader

        // Append AI's response
        explanationContentArea.insertAdjacentHTML('beforeend', `<div class="ai-chat-turn mt-3 pt-3 border-t border-purple-200 dark:border-purple-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p>${result.explanationHtml}</div>`);
        inputElement.value = '';
        await renderMathIn(explanationContentArea); // Re-render math
        explanationContentArea.scrollTop = explanationContentArea.scrollHeight; // Scroll down

    } catch (error) {
        console.error("Error asking AI follow-up:", error);
        explanationContentArea.querySelector('.ai-loading')?.remove();
        explanationContentArea.insertAdjacentHTML('beforeend', `<p class="text-danger text-sm mt-2">Error getting follow-up: ${error.message}</p>`);
    } finally {
        inputElement.disabled = false;
        if (askButton) askButton.disabled = false;
    }
};

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