// --- START OF FILE ai_exam_marking.js ---

// ai_exam_marking.js

// MODIFIED: Import escapeHtml from utils
import { callGeminiTextAPI } from './ai_integration.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Added escapeHtml import

// Constants for marking
// MODIFIED: Define max marks for MCQs separately if needed, or use a standard value like 10
const MAX_MARKS_PER_PROBLEM = 10; // Define max marks for problems
const MAX_MARKS_PER_MCQ = 10;     // Define max marks for MCQs (typically all or nothing)

/**
 * Marks a single exam answer (problem ONLY) using AI.
 * MCQ marking is now handled directly in markFullExam.
 * @param {object} question - The question object (must be a problem).
 * @param {string|null} studentAnswer - The student's answer text. Null if unanswered.
 * @param {number} [maxMarks=MAX_MARKS_PER_PROBLEM] - Maximum marks for this question.
 * @returns {Promise<object>} - A promise resolving to the marking result object.
 */
export async function markExamAnswer(question, studentAnswer, maxMarks = MAX_MARKS_PER_PROBLEM) {
    const defaultResult = {
        score: 0,
        feedback: "Marking could not be performed.",
        key_points: [],
        improvement_suggestions: []
    };

    // Basic check: Ensure this function is only called for problems now
    const isProblem = question.isProblem || !question.options || question.options.length === 0;
    if (!isProblem) {
        console.error("markExamAnswer called for an MCQ. This should be handled in markFullExam.");
        return {
            score: 0, // MCQs scored in markFullExam
            feedback: "MCQ marking handled separately.",
            key_points: [],
            improvement_suggestions: []
        };
    }

    if (studentAnswer === null || studentAnswer === undefined || studentAnswer.trim() === "") {
        return {
            score: 0,
            feedback: "No answer provided for this problem.",
            key_points: [],
            improvement_suggestions: ["Attempt all problems for practice."]
        };
    }

    try {
        let prompt = `You are an expert physics and mathematics examiner. Mark the following exam PROBLEM answer and provide detailed feedback.\n\n`;
        prompt += `**Question Type:** Problem\n`;
        prompt += `**Question:** ${question.text}\n\n`;
        prompt += `**Student's Answer:** ${studentAnswer}\n\n`;
        prompt += `Evaluate the answer considering:\n`;
        prompt += `1. Correctness of the final result (if applicable).\n`;
        prompt += `2. Accuracy and validity of the physics/mathematical steps and reasoning.\n`;
        prompt += `3. Understanding of the underlying concepts.\n`;
        prompt += `4. Clarity and organization of the solution.\n`;
        prompt += `Award partial marks generously for correct reasoning, formulas, or partial steps, even if the final answer is incorrect or incomplete. Be specific about where marks were awarded or deducted.\n`;
        prompt += `\nProvide your response in this exact JSON format:\n`;
        prompt += `{\n`;
        prompt += `    "score": [number between 0 and ${maxMarks}],\n`;
        prompt += `    "feedback": "[Detailed explanation of the marking, justifying the score. Explain errors and correct steps.]",\n`;
        prompt += `    "key_points": ["[List of crucial correct steps/concepts identified in the answer]", "[List of specific errors or misconceptions found]"],\n`;
        prompt += `    "improvement_suggestions": ["[Actionable advice for improving similar problems]"]\n`;
        prompt += `}\n`;

        const response = await callGeminiTextAPI(prompt);
        try {
            const result = JSON.parse(response);

            // Validate and clamp score for problems
            result.score = Math.min(Math.max(0, Number(result.score) || 0), maxMarks);
            return {
                score: result.score,
                feedback: result.feedback || "No specific feedback provided.",
                key_points: result.key_points || [],
                improvement_suggestions: result.improvement_suggestions || []
            };

        } catch (parseError) {
            console.error("Error parsing AI marking response:", parseError, "\nRaw Response:", response);
            // Attempt to return raw response as feedback if JSON fails
            return {
                score: 0, // Cannot determine score from failed parse
                feedback: `Error processing AI response. Raw output: ${escapeHtml(response)}`,
                key_points: [],
                improvement_suggestions: []
            };
        }
    } catch (error) {
        console.error("Error in AI problem marking call:", error);
        return { // Return default error structure
             ...defaultResult,
             feedback: `Error during AI marking: ${error.message}`
         };
    }
}

/**
 * Marks a full exam, aggregating scores and generating overall feedback.
 * AI is ONLY used for marking WRITTEN PROBLEMS. MCQs are scored deterministically.
 * @param {object} examData - The exam data object including questions and userAnswers.
 * @returns {Promise<object>} - A promise resolving to the full marking results.
 */
export async function markFullExam(examData) {
    showLoading("AI is marking your exam...");
    const results = {
        totalScore: 0,
        maxPossibleScore: 0,
        questionResults: [], // Stores result for each question (score, feedback, etc.)
        overallFeedback: null, // Initialize as null
        timestamp: Date.now()
    };
    const defaultOverallFeedback = {
        overall_feedback: "Could not generate overall feedback.",
        strengths: [],
        weaknesses: [],
        study_recommendations: []
    };
    // MODIFIED: Declare overallResponse outside the try block for the overall feedback section
    let overallResponse = null;

    try {
        console.log(`Marking full exam: ${examData.examId}, Questions: ${examData.questions?.length}`);

        if (examData.questions && examData.questions.length > 0) {
            for (let i = 0; i < examData.questions.length; i++) {
                 const question = examData.questions[i];
                 // Assign a unique ID if missing (important for matching results)
                 if (!question.id) {
                      question.id = `q-${i+1}`; // Simple sequential ID if missing
                 }
                 const studentAnswer = examData.userAnswers?.[question.id]; // Use safe access
                 const isProblem = question.isProblem || !question.options || question.options.length === 0;
                 const maxMarks = isProblem ? MAX_MARKS_PER_PROBLEM : MAX_MARKS_PER_MCQ;
                 results.maxPossibleScore += maxMarks; // Add to max possible score

                 let questionResult;

                 if (isProblem) {
                     // *** MODIFIED: Only call AI for problems ***
                     console.log(`Marking Problem Q${i+1} (ID: ${question.id}) with AI. Answer: "${studentAnswer}"`);
                     questionResult = await markExamAnswer(question, studentAnswer, maxMarks);
                 } else {
                     // *** MODIFIED: Score MCQs directly ***
                     console.log(`Scoring MCQ Q${i+1} (ID: ${question.id}). Answer: "${studentAnswer}", Correct: "${question.correctAnswer}"`);
                     const isCorrect = studentAnswer === question.correctAnswer;
                     const score = isCorrect ? maxMarks : 0;
                     // Generate basic feedback for MCQs without AI call for marking
                     // AI explanation can still be requested later during review.
                     questionResult = {
                         score: score,
                         feedback: isCorrect ? "Correct." : `Incorrect. The correct answer was ${question.correctAnswer}.`,
                         key_points: [],
                         improvement_suggestions: isCorrect ? [] : ["Review the concepts related to this question."]
                     };
                 }

                 // Ensure score is a number before adding
                 const scoreToAdd = Number(questionResult.score) || 0;
                 results.totalScore += scoreToAdd;

                 results.questionResults.push({
                     questionId: question.id, // Use the question's ID
                     questionIndex: i, // Store original index for reference
                     ...questionResult,
                     score: scoreToAdd // Store the validated score
                 });
                 console.log(`Result for Q${i+1}: Score=${scoreToAdd}/${maxMarks}`);
                 if (isProblem) {
                     await new Promise(resolve => setTimeout(resolve, 200)); // Small delay ONLY between AI problem calls
                 }
             }
        } else {
             console.warn("No questions found in examData to mark.");
        }


        // Generate overall feedback only if there were questions
        if (results.questionResults.length > 0 && results.maxPossibleScore > 0) { // Added maxPossibleScore check
            // Construct summary for overall feedback prompt
            const performanceSummary = results.questionResults.map(r => {
                const q = examData.questions.find(q => q.id === r.questionId);
                const qType = (q?.isProblem || !q?.options || q.options.length === 0) ? 'Problem' : 'MCQ';
                const qMax = qType === 'Problem' ? MAX_MARKS_PER_PROBLEM : MAX_MARKS_PER_MCQ;
                return `\n  Q${r.questionIndex + 1} (${qType}): ${r.score}/${qMax} - Feedback snippet: ${r.feedback.substring(0, 70)}...`;
            }).join('');

            const overallPrompt = `You are an expert examiner providing summative feedback on a physics/mathematics exam. Based on the following detailed results for each question, provide overall feedback and recommendations.

Exam Summary:
- Total Score: ${results.totalScore}/${results.maxPossibleScore} (${((results.totalScore / results.maxPossibleScore) * 100).toFixed(1)}%)
- Number of Questions Marked: ${results.questionResults.length}
- Performance by Question: ${performanceSummary}

Provide your response in this exact JSON format:
{
    "overall_feedback": "[Provide a concise (2-4 sentences) general assessment of the student's performance, mentioning the overall score range.]",
    "strengths": ["[List 2-3 specific concepts or types of problems the student seems to understand well based on higher scores or positive feedback.]"],
    "weaknesses": ["[List 2-3 specific concepts, topics, or types of errors observed frequently where the student struggled, based on lower scores or negative feedback.]"],
    "study_recommendations": ["[Provide 2-3 actionable study recommendations focusing on the identified weaknesses. Suggest specific topics or skills to review.]"]
}`;

            try {
                 console.log("Generating overall feedback...");
                 // MODIFIED: Assign to the outer scope variable
                 overallResponse = await callGeminiTextAPI(overallPrompt);
                 results.overallFeedback = JSON.parse(overallResponse);
            } catch (parseError) {
                 console.error("Error parsing overall feedback:", parseError, "\nRaw Response:", overallResponse); // Log the response here
                 results.overallFeedback = { ...defaultOverallFeedback }; // Use spread to create a new object
                 // MODIFIED: Use overallResponse declared outside the try block
                 results.overallFeedback.overall_feedback = `Error parsing AI response for overall feedback. Raw output: ${escapeHtml(overallResponse || 'No response received from API')}`;
            }
        } else {
             results.overallFeedback = { ...defaultOverallFeedback }; // Use spread to create a new object
             results.overallFeedback.overall_feedback = "No questions were marked or max score is zero, cannot provide overall feedback.";
        }

    } catch (error) {
        console.error("Error in full exam marking process:", error);
        results.overallFeedback = { ...defaultOverallFeedback }; // Use spread to create a new object
        // MODIFIED: Check if error has message property
        results.overallFeedback.overall_feedback = `An error occurred during marking: ${error?.message || String(error)}`;
    } finally {
        hideLoading();
    }

    console.log("Full exam marking complete:", results);
    return results;
}

/**
 * Generates an AI explanation for a specific question, considering the student's answer.
 * @param {object} question - The question object.
 * @param {string|null} correctAnswer - The correct answer (null for problems).
 * @param {string|null} studentAnswer - The student's answer.
 * @param {Array} [history=[]] - Optional: Conversation history for follow-ups.
 * @returns {Promise<{explanationHtml: string, history: Array}>} - HTML formatted explanation and updated history.
 */
export async function generateExplanation(question, correctAnswer, studentAnswer, history = []) {
    const isProblem = question.isProblem || !question.options || question.options.length === 0;
    let currentPromptText = ''; // The text for the *current* turn

    if (history.length > 0) {
        // This is a follow-up question
        currentPromptText = studentAnswer; // In follow-ups, 'studentAnswer' holds the user's follow-up question
        console.log("Generating follow-up explanation based on history and new question:", currentPromptText);
    } else {
        // This is the initial explanation request
        currentPromptText = `As a physics and mathematics tutor, provide a detailed explanation for the following question.\n\n`;
        currentPromptText += `**Question:** ${question.text}\n\n`;

        if (isProblem) {
            currentPromptText += `**Student's Answer:** ${studentAnswer || "Not answered"}\n\n`;
            currentPromptText += `Explain the correct concepts and steps required to solve this problem. If the student provided an answer, analyze their likely approach and point out potential errors or correct steps they took. Provide the final correct reasoning or expected form of the answer if applicable. Use LaTeX ($$, $) for math.`;
        } else { // MCQ
            currentPromptText += `**Options:**\n`;
            question.options.forEach(opt => { currentPromptText += `${opt.letter}. ${opt.text}\n`; });
            currentPromptText += `\n**Correct Answer:** ${correctAnswer}\n`;
            currentPromptText += `**Student's Answer:** ${studentAnswer || "Not answered"}\n\n`;
            currentPromptText += `Explain step-by-step:\n`;
            currentPromptText += `1. Why the correct answer (${correctAnswer}) is right, focusing on the underlying principle.\n`;
            if (studentAnswer && studentAnswer !== correctAnswer) {
                currentPromptText += `2. Why the student's choice (${studentAnswer}) is incorrect.\n`;
            } else if (studentAnswer === correctAnswer) {
                currentPromptText += `2. Briefly confirm the student chose correctly.\n`;
            } else {
                currentPromptText += `2. The student did not select an answer.\n`;
            }
            currentPromptText += `Use LaTeX ($$, $) for math if needed. Keep the explanation clear and educational.`;
        }
    }

    // Construct the history object for the API call
    const currentHistory = [...history, { role: "user", parts: [{ text: currentPromptText }] }];

    try {
        // No separate loading indicator needed here, handled by the caller (e.g., showAIExplanation)
        // MODIFIED: Pass history to the API call function
        const explanationText = await callGeminiTextAPI(null, currentHistory); // Pass null for prompt, use history

        // Prepare the new history including the model's response
        const updatedHistory = [...currentHistory, { role: "model", parts: [{ text: explanationText }] }];

        return {
            explanationHtml: formatResponseAsHtml(explanationText), // Keep formatting function
            history: updatedHistory
        };
    } catch (error) {
        console.error("Error generating explanation:", error);
        // Return error message and the history *up to the point of error*
        return {
             explanationHtml: `<p class="text-danger">Error generating explanation: ${error.message}</p>`,
             history: currentHistory // Return history before the failed API call
         };
    }
}


// --- END OF FILE ai_exam_marking.js ---