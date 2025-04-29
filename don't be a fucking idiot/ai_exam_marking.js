// --- START OF FILE ai_exam_marking.js ---

// ai_exam_marking.js

import { callGeminiTextAPI } from './ai_integration.js';
import { showLoading, hideLoading } from './utils.js';

// Constants for marking
const MAX_MARKS_PER_PROBLEM = 10; // Define max marks for problems

/**
 * Marks a single exam answer (problem or MCQ) using AI.
 * @param {object} question - The question object (including text, options if MCQ, type).
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

    if (studentAnswer === null || studentAnswer === undefined || studentAnswer.trim() === "") {
        return {
            score: 0,
            feedback: "No answer provided.",
            key_points: [],
            improvement_suggestions: ["Attempt all questions for practice."]
        };
    }

    try {
        // Determine if it's a problem or MCQ based on the 'isProblem' flag or options
        const isProblem = question.isProblem || !question.options || question.options.length === 0;
        const questionType = isProblem ? "Problem" : "Multiple Choice Question";

        let prompt = `You are an expert physics and mathematics examiner. Mark the following exam answer and provide detailed feedback.\n\n`;
        prompt += `**Question Type:** ${questionType}\n`;
        prompt += `**Question:** ${question.text}\n\n`;

        if (!isProblem) {
            prompt += `**Options:**\n`;
            question.options.forEach(opt => { prompt += `${opt.letter}. ${opt.text}\n`; });
            prompt += `\n**Correct Answer:** ${question.correctAnswer}\n`;
        }

        prompt += `**Student's Answer:** ${studentAnswer}\n\n`;
        prompt += `Evaluate the answer considering:\n`;

        if (isProblem) {
            prompt += `1. Correctness of the final result (if applicable).\n`;
            prompt += `2. Accuracy and validity of the physics/mathematical steps and reasoning.\n`;
            prompt += `3. Understanding of the underlying concepts.\n`;
            prompt += `4. Clarity and organization of the solution.\n`;
            prompt += `Award partial marks generously for correct reasoning, formulas, or partial steps, even if the final answer is incorrect or incomplete. Be specific about where marks were awarded or deducted.\n`;
        } else { // MCQ
            prompt += `1. Compare the student's answer ('${studentAnswer}') with the correct answer ('${question.correctAnswer}').\n`;
            prompt += `2. Explain *why* the student's answer is correct or incorrect.\n`;
            prompt += `3. Briefly explain *why* the correct answer is correct, focusing on the core concept.\n`;
            // For MCQs, score is typically all or nothing based on correct choice, but AI can still provide feedback.
            // We'll calculate score outside the AI call for MCQs based on the 'correctAnswer' field.
        }

        prompt += `\nProvide your response in this exact JSON format:\n`;
        if (isProblem) {
            prompt += `{\n`;
            prompt += `    "score": [number between 0 and ${maxMarks}],\n`;
            prompt += `    "feedback": "[Detailed explanation of the marking, justifying the score. Explain errors and correct steps.]",\n`;
            prompt += `    "key_points": ["[List of crucial correct steps/concepts identified in the answer]", "[List of specific errors or misconceptions found]"],\n`;
            prompt += `    "improvement_suggestions": ["[Actionable advice for improving similar problems]"]\n`;
            prompt += `}\n`;
        } else { // Simplified JSON for MCQ feedback (score calculated separately)
             prompt += `{\n`;
             prompt += `    "feedback": "[Explanation of why the student's choice was right or wrong, and why the correct answer is right.]",\n`;
             prompt += `    "key_points": ["[Core concept tested by the question]"],\n`;
             prompt += `    "improvement_suggestions": ["[Suggestion if the student was wrong, e.g., 'Review topic X']"]\n`;
             prompt += `}\n`;
        }


        const response = await callGeminiTextAPI(prompt);
        try {
            const result = JSON.parse(response);

            if (isProblem) {
                // Validate and clamp score for problems
                result.score = Math.min(Math.max(0, Number(result.score) || 0), maxMarks);
                return {
                    score: result.score,
                    feedback: result.feedback || "No specific feedback provided.",
                    key_points: result.key_points || [],
                    improvement_suggestions: result.improvement_suggestions || []
                };
            } else {
                 // Calculate MCQ score based on comparison, use AI feedback
                 const isCorrect = studentAnswer === question.correctAnswer;
                 return {
                     score: isCorrect ? maxMarks : 0, // All or nothing for MCQ score
                     feedback: result.feedback || (isCorrect ? "Correct." : "Incorrect."),
                     key_points: result.key_points || [],
                     improvement_suggestions: result.improvement_suggestions || []
                 };
            }
        } catch (parseError) {
            console.error("Error parsing AI marking response:", parseError, "\nRaw Response:", response);
            // Attempt to return raw response as feedback if JSON fails
            return {
                score: isProblem ? 0 : (studentAnswer === question.correctAnswer ? maxMarks : 0),
                feedback: `Error processing AI response. Raw output: ${escapeHtml(response)}`,
                key_points: [],
                improvement_suggestions: []
            };
        }
    } catch (error) {
        console.error("Error in AI marking call:", error);
        return { // Return default error structure
             ...defaultResult,
             score: isProblem ? 0 : (studentAnswer === question.correctAnswer ? maxMarks : 0), // Still calculate basic MCQ score
             feedback: `Error during AI marking: ${error.message}`
         };
    }
}

/**
 * Marks a full exam, aggregating scores and generating overall feedback.
 * @param {object} examData - The exam data object including questions and userAnswers.
 * @returns {Promise<object>} - A promise resolving to the full marking results.
 */
export async function markFullExam(examData) {
    showLoading("AI is marking your exam...");
    const results = {
        totalScore: 0,
        maxPossibleScore: 0,
        questionResults: [],
        overallFeedback: null, // Initialize as null
        timestamp: Date.now()
    };
    const defaultOverallFeedback = {
        overall_feedback: "Could not generate overall feedback.",
        strengths: [],
        weaknesses: [],
        study_recommendations: []
    };

    try {
        console.log(`Marking full exam: ${examData.examId}, Questions: ${examData.questions?.length}`);
        // Mark each question
        if (examData.questions && examData.questions.length > 0) {
            for (let i = 0; i < examData.questions.length; i++) {
                 const question = examData.questions[i];
                 // Assign a unique ID if missing (important for matching results)
                 if (!question.id) {
                      question.id = `q-${i+1}`; // Simple sequential ID if missing
                 }
                 const studentAnswer = examData.userAnswers[question.id];
                 const isProblem = question.isProblem || !question.options || question.options.length === 0;
                 const maxMarks = isProblem ? MAX_MARKS_PER_PROBLEM : 10; // Use constant for problems
                 results.maxPossibleScore += maxMarks; // Add to max possible score

                 console.log(`Marking Q${i+1} (ID: ${question.id}, Type: ${isProblem ? 'Problem' : 'MCQ'}). Answer: "${studentAnswer}"`);
                 const questionResult = await markExamAnswer(question, studentAnswer, maxMarks);

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
                 await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between API calls
             }
        } else {
             console.warn("No questions found in examData to mark.");
        }


        // Generate overall feedback only if there were questions
        if (results.questionResults.length > 0) {
            const overallPrompt = `You are an expert examiner providing summative feedback on a physics/mathematics exam. Based on the following detailed results for each question, provide overall feedback and recommendations.

Exam Summary:
- Total Score: ${results.totalScore}/${results.maxPossibleScore} (${((results.totalScore / results.maxPossibleScore) * 100).toFixed(1)}%)
- Number of Questions Marked: ${results.questionResults.length}
- Performance by Question: ${results.questionResults.map(r => `\n  Q${r.questionIndex + 1}: ${r.score}/${MAX_MARKS_PER_PROBLEM} - Feedback: ${r.feedback.substring(0, 100)}...`).join('')}

Provide your response in this exact JSON format:
{
    "overall_feedback": "[Provide a concise (2-4 sentences) general assessment of the student's performance, mentioning the overall score range.]",
    "strengths": ["[List 2-3 specific concepts or types of problems the student seems to understand well based on higher scores or positive feedback.]"],
    "weaknesses": ["[List 2-3 specific concepts, topics, or types of errors observed frequently where the student struggled, based on lower scores or negative feedback.]"],
    "study_recommendations": ["[Provide 2-3 actionable study recommendations focusing on the identified weaknesses. Suggest specific topics or skills to review.]"]
}`;

            try {
                 console.log("Generating overall feedback...");
                 const overallResponse = await callGeminiTextAPI(overallPrompt);
                 results.overallFeedback = JSON.parse(overallResponse);
            } catch (parseError) {
                 console.error("Error parsing overall feedback:", parseError, "\nRaw Response:", overallResponse);
                 results.overallFeedback = defaultOverallFeedback;
            }
        } else {
             results.overallFeedback = defaultOverallFeedback;
             results.overallFeedback.overall_feedback = "No questions were marked, cannot provide overall feedback.";
        }

    } catch (error) {
        console.error("Error in full exam marking process:", error);
        results.overallFeedback = defaultOverallFeedback;
        results.overallFeedback.overall_feedback = `An error occurred during marking: ${error.message}`;
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
 * @returns {Promise<string>} - HTML formatted explanation.
 */
export async function generateExplanation(question, correctAnswer, studentAnswer) {
    const isProblem = question.isProblem || !question.options || question.options.length === 0;
    let prompt = `As a physics and mathematics tutor, provide a detailed explanation for the following question.\n\n`;
    prompt += `**Question:** ${question.text}\n\n`;

    if (isProblem) {
        prompt += `**Student's Answer:** ${studentAnswer || "Not answered"}\n\n`;
        prompt += `Explain the correct concepts and steps required to solve this problem. If the student provided an answer, analyze their likely approach and point out potential errors or correct steps they took. Provide the final correct reasoning or expected form of the answer if applicable. Use LaTeX ($$, $) for math.`;
    } else { // MCQ
        prompt += `**Options:**\n`;
        question.options.forEach(opt => { prompt += `${opt.letter}. ${opt.text}\n`; });
        prompt += `\n**Correct Answer:** ${correctAnswer}\n`;
        prompt += `**Student's Answer:** ${studentAnswer || "Not answered"}\n\n`;
        prompt += `Explain step-by-step:\n`;
        prompt += `1. Why the correct answer (${correctAnswer}) is right, focusing on the underlying principle.\n`;
        if (studentAnswer && studentAnswer !== correctAnswer) {
            prompt += `2. Why the student's choice (${studentAnswer}) is incorrect.\n`;
        } else if (studentAnswer === correctAnswer) {
            prompt += `2. Briefly confirm the student chose correctly.\n`;
        } else {
            prompt += `2. The student did not select an answer.\n`;
        }
        prompt += `Use LaTeX ($$, $) for math if needed. Keep the explanation clear and educational.`;
    }

    try {
        showLoading("Generating AI Explanation...");
        const explanationText = await callGeminiTextAPI(prompt);
        hideLoading();
        return formatResponseAsHtml(explanationText);
    } catch (error) {
        hideLoading();
        console.error("Error generating explanation:", error);
        return `<p class="text-danger">Error generating explanation: ${error.message}</p>`;
    }
}