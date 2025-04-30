// --- START OF FILE ai_exam_marking.js ---

// ai_exam_marking.js

// MODIFIED: Import escapeHtml from utils
import { callGeminiTextAPI, tokenLimitCheck } from './ai_integration.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Added escapeHtml import
import { MAX_MARKS_PER_PROBLEM, MAX_MARKS_PER_MCQ } from './config.js'; // Import constants

/**
 * Formats AI response text into HTML with proper styling and formatting.
 * @param {string} rawText - The raw text from the AI response
 * @returns {string} - Formatted HTML string
 */
function formatResponseAsHtml(rawText) {
    if (!rawText) return '<p class="text-muted italic">AI did not provide a response.</p>';

    // Escape initial HTML, then apply formatting
    let escapedText = escapeHtml(rawText);

    // Handle code blocks (```) first
    escapedText = escapedText.replace(/```(?:[a-zA-Z]+)?\n([\s\S]*?)\n```/g, (m, code) => 
        `<pre><code class="block whitespace-pre-wrap">${escapeHtml(code.trim())}</code></pre>`);

    // Handle inline code (`)
    escapedText = escapedText.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Handle LaTeX math expressions
    escapedText = escapedText.replace(/\$\$(.*?)\$\$/g, (m, math) => `\\[${math}\\]`);
    escapedText = escapedText.replace(/\$(.*?)\$/g, (m, math) => `\\(${math}\\)`);

    // Handle bold (**) and italics (*)
    escapedText = escapedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escapedText = escapedText.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Handle ordered lists (number. )
    escapedText = escapedText.replace(/^\s*(\d+)\.\s+(.*)/gm, (match, number, item) => 
        `<li>${item.trim()}</li>`);
    escapedText = escapedText.replace(/(<li>.*<\/li>\s*)+/g, match => 
        `<ol class="list-decimal list-inside">${match.trim()}</ol>`);

    // Handle unordered lists (* or -)
    escapedText = escapedText.replace(/^\s*[\*\-]\s+(.*)/gm, (match, item) => 
        `<li>${item.trim()}</li>`);
    escapedText = escapedText.replace(/(<li>.*<\/li>\s*)+/g, match => 
        `<ul class="list-disc list-inside">${match.trim()}</ul>`);

    // Handle paragraphs and line breaks
    const paragraphs = escapedText.split('\n\n');
    escapedText = paragraphs.map(p => {
        if (p.trim() === '') return '';
        if (p.startsWith('<pre>') || p.startsWith('<ul>') || p.startsWith('<ol>')) return p;
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    return `<div class="prose prose-sm dark:prose-invert max-w-none">${escapedText}</div>`;
}

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
        prompt += `**For Improvement Suggestions:**\n`;
        prompt += `1. Carefully analyze the student's answer to understand their specific approach and thought process.\n`;
        prompt += `2. Identify any misconceptions or error patterns in their reasoning, calculations, or problem-solving strategy.\n`;
        prompt += `3. Provide personalized, actionable suggestions that directly address:\n`;
        prompt += `   - The specific mistakes or gaps in their answer\n`;
        prompt += `   - Their apparent understanding level and problem-solving approach\n`;
        prompt += `   - Common pitfalls related to their particular error pattern\n`;
        prompt += `4. Focus on concrete steps they can take to improve, based on their actual work, not generic topic review.\n`;
        prompt += `5. If possible, suggest a specific practice strategy or problem-solving technique that would help prevent similar errors.\n\n`;
        prompt += `**Output Format:** Provide your response ONLY in this strict JSON format:\n`;
        prompt += `{\n`;
        prompt += `    "score": [number between 0 and ${maxMarks}],\n`;
        prompt += `    "feedback": "[Detailed justification for the score, explaining correct parts and errors.]",\n`;
        prompt += `    "key_points": ["[List of crucial correct steps/concepts identified]", "[List of specific errors or misconceptions found]"],\n`;
        prompt += `    "improvement_suggestions": ["[Personalized, actionable advice based on their specific work and errors]"]\n`;
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
    let cleanedResponse = ''; // Define here for access in catch block

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
                     results.questionResults[i] = {
                         questionId: question.id,
                         questionIndex: i,
                         ...mcqResult,
                         score: score
                     };
                     results.totalScore += score;
                     console.log(`Result for MCQ Q${i+1}: Score=${score}/${maxMarks}`);
                 }
             }

             if (markingPromises.length > 0) {
                  console.log(`Waiting for ${markingPromises.length} AI problem marking tasks...`);
                  const settledResults = await Promise.allSettled(markingPromises);
                  console.log("AI marking tasks settled.");

                  settledResults.forEach((settled, promiseIndex) => {
                     if (settled.status === 'fulfilled') {
                          const { index, result } = settled.value;
                          const scoreToAdd = Number(result.score) || 0;
                          results.totalScore += scoreToAdd;
                          results.questionResults[index] = {
                              questionId: examData.questions[index].id,
                              questionIndex: index,
                              ...result,
                              score: scoreToAdd
                          };
                           console.log(`Result for Problem Q${index+1}: Score=${scoreToAdd}/${MAX_MARKS_PER_PROBLEM}`);
                      } else {
                          const failedIndex = markingPromises[promiseIndex]?.index ?? -1;
                          const reason = settled.reason;
                          if (failedIndex !== -1 && examData.questions[failedIndex]) {
                                console.error(`AI Marking Error for Q${failedIndex + 1}:`, reason);
                                results.questionResults[failedIndex] = {
                                    questionId: examData.questions[failedIndex].id,
                                    questionIndex: failedIndex,
                                    score: 0,
                                    feedback: `Error during AI marking: ${reason?.message || 'Unknown error'}.`,
                                    key_points: [],
                                    improvement_suggestions: []
                                };
                            } else {
                                 console.error(`AI Marking Error for unknown question (index mapping failed or missing question data):`, reason);
                            }
                      }
                  });
             }
        } else {
             console.warn("No questions found in examData to mark.");
        }

        if (results.questionResults.length > 0 && results.maxPossibleScore > 0) {
            // *** MODIFIED: Construct detailed summary ***
            let detailedSummary = "";
            examData.questions.forEach((q, index) => {
                const result = results.questionResults.find(r => r.questionId === q.id);
                const score = result?.score ?? 'N/A';
                const max = (q.isProblem ? MAX_MARKS_PER_PROBLEM : MAX_MARKS_PER_MCQ);
                const userAnswer = examData.userAnswers?.[q.id] || "Not Answered";
                detailedSummary += `\n\nQuestion ${index + 1} (Type: ${q.isProblem ? 'Problem' : 'MCQ'}, Chapter: ${q.chapter || 'N/A'}):\n`;
                detailedSummary += `Text: ${q.text}\n`;
                if (!q.isProblem && q.options) {
                    detailedSummary += `Options: ${q.options.map(o => `${o.letter}. ${o.text}`).join('; ')}\n`;
                    detailedSummary += `Correct Answer: ${q.correctAnswer || 'N/A'}\n`;
                }
                detailedSummary += `Student Answer: ${userAnswer}\n`;
                detailedSummary += `Score: ${score}/${max}\n`;
                detailedSummary += `Feedback Snippet: ${result?.feedback?.substring(0,100) || 'N/A'}...\n`;
            });

            const overallPrompt = `You are an expert examiner providing summative feedback on a physics/mathematics exam. The student achieved ${results.totalScore}/${results.maxPossibleScore} (${results.maxPossibleScore > 0 ? ((results.totalScore / results.maxPossibleScore) * 100).toFixed(1) : 0}%).

Analyze the student's performance based *specifically* on the following questions, their answers, and the marking:
${detailedSummary}
---
Provide constructive, material-based overall feedback. Focus on patterns of errors related to specific concepts or topics covered in the questions.

Respond ONLY in this strict JSON format:
{
    "overall_feedback": "[Provide a concise (2-4 sentences) overall assessment, mentioning score range and core performance observations based *on the material*.]",
    "strengths": ["[List 2-3 specific concepts or topics the student demonstrated understanding of, referencing specific question numbers if possible.]"],
    "weaknesses": ["[List 2-3 specific concepts or topics where the student struggled, referencing specific question numbers or error patterns.]"],
    "study_recommendations": ["[Provide 2-3 actionable study recommendations *directly related* to the identified weaknesses and the material covered in the exam questions.]"]
}`;

            // *** MODIFIED: Check token limit before API call ***
            if (!await tokenLimitCheck(overallPrompt)) {
                 console.warn("Overall feedback prompt exceeds token limit. Generating generic feedback.");
                 results.overallFeedback = { ...defaultOverallFeedback, overall_feedback: "Overall feedback could not be generated due to content length limits." };
                 overallResponse = null; // Ensure no API call happens
            } else {
                console.log("Generating overall feedback with detailed context...");
                overallResponse = await callGeminiTextAPI(overallPrompt);
            }

            if (overallResponse) {
                 try {
                      cleanedResponse = overallResponse.trim();
                      if (cleanedResponse.startsWith('```json')) { cleanedResponse = cleanedResponse.substring(7); }
                      else if (cleanedResponse.startsWith('```')) { cleanedResponse = cleanedResponse.substring(3); }
                      if (cleanedResponse.endsWith('```')) { cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3); }
                      cleanedResponse = cleanedResponse.trim();
                      if (cleanedResponse.startsWith('"') && cleanedResponse.endsWith('"')) {
                          try { const innerJson = JSON.parse(cleanedResponse); if (typeof innerJson === 'string') { cleanedResponse = innerJson; } } catch (e) { /* Ignore */ }
                      }

                      results.overallFeedback = JSON.parse(cleanedResponse);
                      results.overallFeedback.strengths = Array.isArray(results.overallFeedback.strengths) ? results.overallFeedback.strengths : [];
                      results.overallFeedback.weaknesses = Array.isArray(results.overallFeedback.weaknesses) ? results.overallFeedback.weaknesses : [];
                      results.overallFeedback.study_recommendations = Array.isArray(results.overallFeedback.study_recommendations) ? results.overallFeedback.study_recommendations : [];

                 } catch (parseOrApiError) {
                      console.error("Error generating or parsing overall feedback:", parseOrApiError, "\nCleaned Response Attempted:", cleanedResponse, "\nRaw Response:", overallResponse);
                      results.overallFeedback = { ...defaultOverallFeedback };
                      results.overallFeedback.overall_feedback = `Error processing overall feedback. ${parseOrApiError.message || 'Unknown error'}. Raw AI Response: ${escapeHtml(overallResponse || 'No response received from API')}`;
                 }
             } else if (!results.overallFeedback) {
                  results.overallFeedback = { ...defaultOverallFeedback, overall_feedback: "Overall feedback could not be generated due to content length limits." };
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

    results.questionResults = results.questionResults.map((r, i) => {
         if (!r) {
              console.error(`Missing result for question index ${i} in final processing.`);
              return { questionId: examData.questions[i]?.id || `q-${i+1}`, questionIndex: i, score: 0, feedback: "Marking Error", key_points: [], improvement_suggestions: [] };
         }
         return { ...r, score: Number(r?.score) || 0 };
    });
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
        currentPromptText = studentAnswer;
        console.log("Generating follow-up explanation based on history and new query:", currentPromptText);
    } else {
        if (!question) throw new Error("Initial explanation requires a question object.");
        const isProblem = question.isProblem || !question.options || question.options.length === 0;
        const actualCorrectAnswer = isProblem ? null : question.correctAnswer;

        currentPromptText = `As a physics and mathematics tutor, provide a detailed explanation for the following question.\n\n`;
        currentPromptText += `**Question:** ${question.text}\n\n`;

        if (isProblem) {
            currentPromptText += `**Student's Answer:** ${studentAnswer || "Not answered"}\n\n`;
            currentPromptText += `Explain the correct concepts and steps required to solve this problem. If the student provided an answer, analyze their likely approach and point out potential errors or correct steps they took. Provide the final correct reasoning or expected form of the answer if applicable. Use LaTeX ($$, $) for math.`;
        } else {
            currentPromptText += `**Options:**\n`;
            question.options.forEach(opt => { currentPromptText += `${opt.letter}. ${opt.text}\n`; });
            currentPromptText += `\n**Correct Answer:** ${actualCorrectAnswer || 'N/A'}\n`;
            currentPromptText += `**Student's Answer:** ${studentAnswer || "Not answered"}\n\n`;
            currentPromptText += `Explain step-by-step:\n`;
            currentPromptText += `1. Why the correct answer (${actualCorrectAnswer || 'N/A'}) is right, focusing on the underlying principle.\n`;
            if (studentAnswer && studentAnswer !== actualCorrectAnswer) {
                currentPromptText += `2. Why the student's choice (${studentAnswer}) is incorrect.\n`;
            } else if (studentAnswer === actualCorrectAnswer) {
                currentPromptText += `2. Briefly confirm the student chose correctly.\n`;
            } else {
                currentPromptText += `2. The student did not select an answer.\n`;
            }
            currentPromptText += `Use LaTeX ($$, $) for math if needed. Keep the explanation clear and educational.`;
        }
    }

    const currentHistory = [...history, { role: "user", parts: [{ text: currentPromptText }] }];

    try {
        const explanationText = await callGeminiTextAPI(null, currentHistory);
        const updatedHistory = [...currentHistory, { role: "model", parts: [{ text: explanationText }] }];

        return {
            explanationHtml: formatResponseAsHtml(explanationText),
            history: updatedHistory
        };
    } catch (error) {
        console.error("Error generating explanation:", error);
        return {
            explanationHtml: `<p class="text-danger">Error generating explanation: ${error.message}</p>`,
            history: currentHistory
        };
    }
}


// --- END OF FILE ai_exam_marking.js ---