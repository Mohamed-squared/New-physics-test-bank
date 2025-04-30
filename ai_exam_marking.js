// --- START OF FILE ai_exam_marking.js ---

// ai_exam_marking.js

// MODIFIED: Import escapeHtml from utils
import { callGeminiTextAPI } from './ai_integration.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Added escapeHtml import
import { MAX_MARKS_PER_PROBLEM, MAX_MARKS_PER_MCQ } from './config.js'; // Import constants

/**
 * Marks a single exam PROBLEM answer using AI.
 * @param {object} question - The question object (must be a problem).
 * @param {string|null} studentAnswer - The student's answer text. Null if unanswered.
 * @param {number} [maxMarks=MAX_MARKS_PER_PROBLEM] - Maximum marks for this question.
 * @returns {Promise<object>} - A promise resolving to the marking result object.
 */
async function markProblemAnswer(question, studentAnswer, maxMarks = MAX_MARKS_PER_PROBLEM) {
    const defaultResult = {
        score: 0,
        feedback: "Marking could not be performed.",
        key_points: [],
        improvement_suggestions: []
    };

    if (studentAnswer === null || studentAnswer === undefined || studentAnswer.trim() === "") {
        return {
            score: 0,
            feedback: "No answer provided for this problem.",
            key_points: [],
            improvement_suggestions: ["Attempt all problems for practice."]
        };
    }

    try {
        let prompt = `You are an expert physics and mathematics examiner. Mark the following student answer to an exam PROBLEM and provide detailed feedback.\n\n`;
        prompt += `**Question:**\n${question.text}\n\n`;
        prompt += `**Student's Answer:**\n${studentAnswer}\n\n`;
        prompt += `**Marking Instructions:**\n`;
        prompt += `1. Evaluate the student's answer based on correctness, validity of steps/reasoning, conceptual understanding, and clarity.\n`;
        prompt += `2. Award a score between 0 and ${maxMarks}.\n`;
        prompt += `3. Be **generous** with partial marks. Award credit for correct formulas, partial steps, correct reasoning, or demonstrating understanding, even if the final answer is incorrect or incomplete.\n`;
        prompt += `4. Provide specific, constructive feedback explaining the score, highlighting both correct aspects and errors/misconceptions.\n`;
        prompt += `5. List key points (correct steps/concepts identified) and specific areas for improvement.\n\n`;
        prompt += `**Output Format:** Provide your response ONLY in this strict JSON format:\n`;
        prompt += `{\n`;
        prompt += `    "score": [number between 0 and ${maxMarks}],\n`;
        prompt += `    "feedback": "[Detailed justification for the score, explaining correct parts and errors.]",\n`;
        prompt += `    "key_points": ["[List of crucial correct steps/concepts identified]", "[List of specific errors or misconceptions found]"],\n`;
        prompt += `    "improvement_suggestions": ["[Actionable advice for improving on similar problems]"]\n`;
        prompt += `}\n`;

        // Request JSON output explicitly
        const response = await callGeminiTextAPI(prompt);

        try {
            const result = JSON.parse(response);

            // Validate and clamp score for problems
            result.score = Math.min(Math.max(0, Number(result.score) || 0), maxMarks);

            return {
                score: result.score,
                feedback: result.feedback || "No specific feedback provided.",
                key_points: Array.isArray(result.key_points) ? result.key_points : [],
                improvement_suggestions: Array.isArray(result.improvement_suggestions) ? result.improvement_suggestions : []
            };

        } catch (parseError) {
            console.error("Error parsing AI marking response:", parseError, "\nRaw Response:", response);
            return {
                score: 0, // Cannot determine score from failed parse
                feedback: `Error processing AI marking response. Raw output: ${escapeHtml(response)}`,
                key_points: [],
                improvement_suggestions: []
            };
        }
    } catch (error) {
        console.error("Error in AI problem marking call:", error);
        return {
             ...defaultResult,
             feedback: `Error during AI marking: ${error.message}`
         };
    }
}

/**
 * Marks a full exam, aggregating scores and generating overall feedback.
 * AI marks WRITTEN PROBLEMS. MCQs are scored deterministically.
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
    let overallResponse = null;

    try {
        console.log(`Marking full exam: ${examData.examId}, Questions: ${examData.questions?.length}`);

        if (examData.questions && examData.questions.length > 0) {
            const markingPromises = []; // Store promises for AI marking

            for (let i = 0; i < examData.questions.length; i++) {
                 const question = examData.questions[i];
                 if (!question.id) { question.id = `q-${i+1}`; } // Ensure ID exists

                 const studentAnswer = examData.userAnswers?.[question.id];
                 const isProblem = question.isProblem || !question.options || question.options.length === 0;
                 const maxMarks = isProblem ? MAX_MARKS_PER_PROBLEM : MAX_MARKS_PER_MCQ; // Use constants
                 results.maxPossibleScore += maxMarks; // Add to max possible score

                 if (isProblem) {
                     // Add promise for AI marking
                     console.log(`Marking Problem Q${i+1} (ID: ${question.id}) with AI. Answer: "${studentAnswer?.substring(0, 50)}..."`);
                     markingPromises.push(
                         markProblemAnswer(question, studentAnswer, maxMarks)
                             .then(result => ({ index: i, result: result, isProblem: true }))
                             .catch(error => ({ index: i, error: error, isProblem: true })) // Catch errors per promise
                     );
                 } else {
                     // Score MCQs deterministically immediately
                     console.log(`Scoring MCQ Q${i+1} (ID: ${question.id}). Answer: "${studentAnswer}", Correct: "${question.correctAnswer}"`);
                     // Refined correctness check (case-insensitive, handle null/undefined)
                     const correctAnswerStr = String(question.correctAnswer ?? '').trim().toUpperCase();
                     const studentAnswerStr = String(studentAnswer ?? '').trim().toUpperCase();
                     const isCorrect = correctAnswerStr !== '' && studentAnswerStr === correctAnswerStr;

                     const score = isCorrect ? maxMarks : 0;
                     const feedback = isCorrect ? "Correct." : `Incorrect. The correct answer was ${question.correctAnswer || 'N/A'}.`;
                     const mcqResult = {
                         score: score,
                         feedback: feedback,
                         key_points: [],
                         improvement_suggestions: isCorrect ? [] : ["Review the concepts related to this question."]
                     };
                     // Push MCQ result directly (no promise)
                     results.questionResults[i] = { // Use index to maintain order
                         questionId: question.id,
                         questionIndex: i,
                         ...mcqResult,
                         score: score // Ensure score is stored
                     };
                     results.totalScore += score; // Add score immediately
                     console.log(`Result for MCQ Q${i+1}: Score=${score}/${maxMarks}`);
                 }
             }

             // Wait for all AI marking promises to resolve
             if (markingPromises.length > 0) {
                  console.log(`Waiting for ${markingPromises.length} AI problem marking tasks...`);
                  const settledResults = await Promise.allSettled(markingPromises);
                  console.log("AI marking tasks settled.");

                  settledResults.forEach(settled => {
                     if (settled.status === 'fulfilled') {
                          const { index, result } = settled.value;
                          const scoreToAdd = Number(result.score) || 0;
                          results.totalScore += scoreToAdd;
                          results.questionResults[index] = { // Place result at correct index
                              questionId: examData.questions[index].id,
                              questionIndex: index,
                              ...result,
                              score: scoreToAdd
                          };
                           console.log(`Result for Problem Q${index+1}: Score=${scoreToAdd}/${MAX_MARKS_PER_PROBLEM}`);
                      } else {
                          // Handle rejected promises (AI call failed)
                          const originalPromiseInfo = markingPromises[settledResults.indexOf(settled)]; // Need a way to map back, index might work if order preserved
                          const failedIndex = originalPromiseInfo?.index ?? -1; // Requires index to be part of the error/value payload
                          if (failedIndex !== -1) {
                                console.error(`AI Marking Error for Q${failedIndex + 1}:`, settled.reason);
                                results.questionResults[failedIndex] = { // Place error result at correct index
                                    questionId: examData.questions[failedIndex].id,
                                    questionIndex: failedIndex,
                                    score: 0,
                                    feedback: `Error during AI marking: ${settled.reason?.message || 'Unknown error'}.`,
                                    key_points: [],
                                    improvement_suggestions: []
                                };
                            } else {
                                 console.error(`AI Marking Error for unknown question:`, settled.reason); // Log general error if index mapping fails
                            }
                      }
                  });
             }
        } else {
             console.warn("No questions found in examData to mark.");
        }

        // Generate overall feedback only if there were questions and marking occurred
        if (results.questionResults.length > 0 && results.maxPossibleScore > 0) {
            const performanceSummary = results.questionResults.map(r => {
                if (!r) return `  Q?: Error during marking.`; // Handle cases where result might be missing due to error
                const q = examData.questions.find(q => q.id === r.questionId);
                const qType = (q?.isProblem || !q?.options || q.options.length === 0) ? 'Problem' : 'MCQ';
                const qMax = qType === 'Problem' ? MAX_MARKS_PER_PROBLEM : MAX_MARKS_PER_MCQ;
                return `\n  Q${r.questionIndex + 1} (${qType}): ${r.score}/${qMax} - Feedback snippet: ${r.feedback?.substring(0, 70) || 'N/A'}...`;
            }).join('');

            const overallPrompt = `You are an expert examiner providing summative feedback on a physics/mathematics exam. Based on the following detailed results for each question, provide overall feedback and recommendations.

Exam Summary:
- Total Score: ${results.totalScore}/${results.maxPossibleScore} (${results.maxPossibleScore > 0 ? ((results.totalScore / results.maxPossibleScore) * 100).toFixed(1) : 0}%)
- Number of Questions Marked: ${results.questionResults.length}
- Performance by Question: ${performanceSummary}

Provide your response ONLY in this strict JSON format:
{
    "overall_feedback": "[Provide a concise (2-4 sentences) general assessment of the student's performance, mentioning the overall score range.]",
    "strengths": ["[List 2-3 specific concepts or types of problems the student seems to understand well based on higher scores or positive feedback.]"],
    "weaknesses": ["[List 2-3 specific concepts, topics, or types of errors observed frequently where the student struggled, based on lower scores or negative feedback.]"],
    "study_recommendations": ["[Provide 2-3 actionable study recommendations focusing on the identified weaknesses. Suggest specific topics or skills to review.]"]
}`;

            try {
                 console.log("Generating overall feedback...");
                 overallResponse = await callGeminiTextAPI(overallPrompt); // Request JSON
                 results.overallFeedback = JSON.parse(overallResponse);
                 // Validate structure
                 results.overallFeedback.strengths = Array.isArray(results.overallFeedback.strengths) ? results.overallFeedback.strengths : [];
                 results.overallFeedback.weaknesses = Array.isArray(results.overallFeedback.weaknesses) ? results.overallFeedback.weaknesses : [];
                 results.overallFeedback.study_recommendations = Array.isArray(results.overallFeedback.study_recommendations) ? results.overallFeedback.study_recommendations : [];

            } catch (parseOrApiError) {
                 console.error("Error generating or parsing overall feedback:", parseOrApiError, "\nRaw Response:", overallResponse);
                 results.overallFeedback = { ...defaultOverallFeedback };
                 results.overallFeedback.overall_feedback = `Error processing overall feedback. ${parseOrApiError.message}. Raw: ${escapeHtml(overallResponse || 'No response')}`;
            }
        } else {
             results.overallFeedback = { ...defaultOverallFeedback };
             results.overallFeedback.overall_feedback = "No questions were marked or max score is zero, cannot provide overall feedback.";
        }

    } catch (error) {
        console.error("Error in full exam marking process:", error);
        results.overallFeedback = { ...defaultOverallFeedback };
        results.overallFeedback.overall_feedback = `An error occurred during marking: ${error?.message || String(error)}`;
    } finally {
        hideLoading();
    }

    // Ensure all question results have a score property, even if 0
    results.questionResults = results.questionResults.map((r, i) => {
         if (!r) { // Handle potential undefined entry if an AI call failed critically before insertion
              console.error(`Missing result for question index ${i} in final processing.`);
              return { questionId: examData.questions[i]?.id || `q-${i+1}`, questionIndex: i, score: 0, feedback: "Marking Error", key_points: [], improvement_suggestions: [] };
         }
         return { ...r, score: Number(r?.score) || 0 };
    });
    // Clamp total score just in case
    results.totalScore = Math.max(0, Math.min(results.totalScore, results.maxPossibleScore));

    console.log("Full exam marking complete:", results);
    return results;
}

/**
 * Generates an AI explanation for a specific question, considering the student's answer. Handles follow-ups.
 * @param {object | null} question - The question object (null for follow-ups based on history).
 * @param {string|null} correctAnswer - The correct answer (null for problems or follow-ups).
 * @param {string|null} studentAnswer - The student's answer OR the follow-up question text.
 * @param {Array} [history=[]] - Optional: Conversation history for follow-ups.
 * @returns {Promise<{explanationHtml: string, history: Array}>} - HTML formatted explanation and updated history.
 */
export async function generateExplanation(question, correctAnswer, studentAnswer, history = []) {
    const isFollowUp = history.length > 0;
    let currentPromptText = '';

    if (isFollowUp) {
        currentPromptText = studentAnswer; // User's follow-up question
        console.log("Generating follow-up explanation based on history and new query:", currentPromptText);
    } else {
        // Initial explanation request
        if (!question) throw new Error("Initial explanation requires a question object.");
        const isProblem = question.isProblem || !question.options || question.options.length === 0;

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
         console.log("Generating initial explanation for:", question.id);
    }

    // Construct the history object for the API call
    const currentHistory = [...history, { role: "user", parts: [{ text: currentPromptText }] }];

    try {
        const explanationText = await callGeminiTextAPI(null, currentHistory); // Pass null for prompt, use history
        const updatedHistory = [...currentHistory, { role: "model", parts: [{ text: explanationText }] }];

        return {
            explanationHtml: formatResponseAsHtml(explanationText),
            history: updatedHistory
        };
    } catch (error) {
        console.error("Error generating explanation:", error);
        return {
             explanationHtml: `<p class="text-danger">Error generating explanation: ${error.message}</p>`,
             history: currentHistory // Return history up to the point of error
         };
    }
}


// --- END OF FILE ai_exam_marking.js ---