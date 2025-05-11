// ai_exam_marking.js

// Ensure these imports are at the top of your ai_exam_marking.js file
import { callGeminiTextAPI, tokenLimitCheck } from './ai_integration.js';
import { showLoading, hideLoading, escapeHtml, decodeHtmlEntities } from './utils.js'; // decodeHtmlEntities is crucial
import { MAX_MARKS_PER_PROBLEM, MAX_MARKS_PER_MCQ } from './config.js';

/**
 * Formats AI response text into HTML.
 * Identifies LaTeX segments first, escapes non-LaTeX text, applies Markdown,
 * then reinserts raw LaTeX for MathJax processing.
 * @param {string} rawText - The raw text from the AI response.
 * @returns {string} - Formatted HTML string.
 */
function formatResponseAsHtml(rawText) {
    if (!rawText) return '<p class="text-muted italic">AI did not provide a response.</p>';

    const latexSegments = [];
    let placeholderCounter = 0;
    const placeholderPrefix = "@@LATEX_PLACEHOLDER_";
    const placeholderSuffix = "@@";

    let textWithPlaceholders = rawText.replace(
        /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[\s\S]+?\$|\\\(.*?\\\))/g,
        (match) => {
            const placeholder = `${placeholderPrefix}${placeholderCounter++}${placeholderSuffix}`;
            latexSegments.push({ placeholder, latex: match });
            return placeholder;
        }
    );

    let processedText = escapeHtml(textWithPlaceholders);

    processedText = processedText.replace(/```(?:[a-zA-Z]+)?\n([\s\S]*?)\n```/g, (m, codeContent) => {
        return `<pre><code class="block whitespace-pre-wrap">${codeContent.trim()}</code></pre>`;
    });
    processedText = processedText.replace(/`([^`]+?)`/g, '<code>$1</code>');
    processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processedText = processedText.replace(/\*(.*?)\*/g, '<em>$1</em>');

    latexSegments.forEach(item => {
        const regex = new RegExp(item.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        processedText = processedText.replace(regex, item.latex);
    });

    const lines = processedText.split('\n');
    let htmlOutput = '';
    let inList = false;
    let listType = '';
    let inParagraph = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmedLine = line.trim();
        const olMatch = trimmedLine.match(/^\s*(\d+)\.\s+(.*)/);
        const ulMatch = trimmedLine.match(/^\s*[\*\-]\s+(.*)/);

        if (!olMatch && !ulMatch && inList) {
            htmlOutput += `</${listType}>\n`;
            inList = false; listType = '';
        }

        if (trimmedLine === '') {
            if (inParagraph) {
                htmlOutput += '</p>\n';
                inParagraph = false;
            }
            if (htmlOutput.trim() !== '') htmlOutput += '\n';
        } else if (olMatch) {
            if (!inList || listType !== 'ol') {
                if (inParagraph) { htmlOutput += '</p>\n'; inParagraph = false; }
                htmlOutput += '<ol class="list-decimal list-inside ml-4">\n';
                inList = true; listType = 'ol';
            }
            htmlOutput += `<li>${olMatch[2].trim()}</li>\n`;
        } else if (ulMatch) {
            if (!inList || listType !== 'ul') {
                if (inParagraph) { htmlOutput += '</p>\n'; inParagraph = false; }
                htmlOutput += '<ul class="list-disc list-inside ml-4">\n';
                inList = true; listType = 'ul';
            }
            htmlOutput += `<li>${ulMatch[1].trim()}</li>\n`;
        } else if (line.startsWith('<pre>') || line.includes('$$') || line.includes('\\[')) {
            if (inParagraph) { htmlOutput += '</p>\n'; inParagraph = false; }
            htmlOutput += line + '\n';
        } else {
            if (!inParagraph) {
                htmlOutput += '<p>';
                inParagraph = true;
            }
            const nextLineIsContinuation = (i < lines.length - 1 && lines[i+1].trim() !== '' && !lines[i+1].match(/^\s*(\d+)\.\s+/) && !lines[i+1].match(/^\s*[\*\-]\s+/) && !lines[i+1].startsWith('<pre>') && !lines[i+1].includes('$$') && !lines[i+1].includes('\\['))
            htmlOutput += line + (nextLineIsContinuation ? '<br>\n' : '\n');
        }
    }
    if (inList) htmlOutput += `</${listType}>\n`;
    if (inParagraph) htmlOutput += '</p>\n';
    htmlOutput = htmlOutput.replace(/<p>\s*<\/p>/g, '').replace(/\n{3,}/g, '\n\n');
    return `<div class="prose prose-sm dark:prose-invert max-w-none leading-relaxed">${htmlOutput}</div>`;
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
        feedback: "Marking could not be performed due to an internal error.",
        key_points: [],
        improvement_suggestions: []
    };

    if (studentAnswer === null || studentAnswer === undefined || studentAnswer.trim() === "") {
        return {
            score: 0,
            feedback: "No answer provided for this problem.",
            key_points: [],
            improvement_suggestions: [
                "Ensure you attempt all parts of the question.",
                "If unsure, try to write down relevant formulas or concepts.",
                "Review the topic related to this problem."
            ]
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
        prompt += `5. List key points (correct steps/concepts identified) and specific errors or misconceptions found.\n`;
        prompt += `6. Analyze the student's possible reasoning or logic behind their answer (or lack thereof), even if incorrect, and explain why it led to their result.\n\n`;
        prompt += `**For Improvement Suggestions:**\n`;
        prompt += `1. Carefully analyze the student's specific approach, calculations, and reasoning in their provided answer. Do not just compare the final result.\n`;
        prompt += `2. Identify the *root cause* of any errors (e.g., conceptual misunderstanding, calculation mistake, incorrect formula application, faulty reasoning step, misunderstanding the question).\n`;
        prompt += `3. Provide **personalized, actionable suggestions** that *directly address* the identified errors and the student's apparent thought process.\n`;
        prompt += `4. Avoid generic advice like "review the topic". Instead, suggest *specific* actions related to *their mistake*.\n`;
        prompt += `5. Explain *why* their approach was incorrect in relation to the specific error.\n`;
        prompt += `6. If possible, suggest a specific problem-solving strategy or a way to verify their answer that would help prevent this type of error in the future.\n\n`;
        prompt += `**Output Format:** Provide your response ONLY in this strict JSON format. Ensure all string values within the JSON are properly escaped for JSON validity. LaTeX for math should use $...$ for inline and $$...$$ for display. Do NOT include markdown formatting like \`\`\`json around the JSON block itself:\n`;
        prompt += `{\n`;
        prompt += `    "score": [number between 0 and ${maxMarks}],\n`;
        prompt += `    "feedback": "[Detailed justification for the score, explaining correct parts and errors, including possible student reasoning. LaTeX for math should use $...$ for inline and $$...$$ for display.]",\n`;
        prompt += `    "key_points": ["[List of crucial correct steps/concepts identified]", "[List of specific errors or misconceptions found]"],\n`;
        prompt += `    "improvement_suggestions": ["[Personalized, actionable advice based on their specific work and errors]", "[Another specific suggestion]"]\n`;
        prompt += `}\n`;

        let rawApiResponse = await callGeminiTextAPI(prompt, null, 'examMarkerProblem');
        console.log("[markProblemAnswer] Raw AI Response (first 500 chars):", rawApiResponse.substring(0, 500));

        let jsonStringToParse = decodeHtmlEntities(rawApiResponse);
        console.log("[markProblemAnswer] After decodeHtmlEntities (first 500 chars):", jsonStringToParse.substring(0, 500));

        jsonStringToParse = jsonStringToParse.trim();
        if (jsonStringToParse.startsWith("```json")) {
            jsonStringToParse = jsonStringToParse.substring(7);
            if (jsonStringToParse.endsWith("```")) {
                jsonStringToParse = jsonStringToParse.substring(0, jsonStringToParse.length - 3);
            }
        } else if (jsonStringToParse.startsWith("```")) {
            jsonStringToParse = jsonStringToParse.substring(3);
            if (jsonStringToParse.endsWith("```")) {
                jsonStringToParse = jsonStringToParse.substring(0, jsonStringToParse.length - 3);
            }
        }
        jsonStringToParse = jsonStringToParse.trim();
        console.log("[markProblemAnswer] After backtick removal (first 500 chars):", jsonStringToParse.substring(0, 500));

        const tempPlaceholder = "@@JSON_ESCAPE_TEMP_PLACEHOLDER_";
        const protectedEscapes = [];
        let tempCounter = 0;

        jsonStringToParse = jsonStringToParse.replace(/\\(["\\/bfnrt]|u[0-9a-fA-F]{4})/g, (match) => {
            const placeholder = `${tempPlaceholder}${tempCounter++}`;
            protectedEscapes.push({ placeholder, original: match });
            return placeholder;
        });
        console.log("[markProblemAnswer] After protecting JSON escapes (first 500):", jsonStringToParse.substring(0, 500));

        jsonStringToParse = jsonStringToParse.replace(/\\/g, '\\\\');
        console.log("[markProblemAnswer] After escaping remaining backslashes (first 500):", jsonStringToParse.substring(0, 500));

        protectedEscapes.forEach(item => {
            const regex = new RegExp(item.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
            jsonStringToParse = jsonStringToParse.replace(regex, item.original);
        });
        console.log("[markProblemAnswer] After restoring JSON escapes (first 500):", jsonStringToParse.substring(0, 500));
        
        if (jsonStringToParse.startsWith('"') && jsonStringToParse.endsWith('"')) {
            try {
                const innerJsonString = JSON.parse(jsonStringToParse);
                if (typeof innerJsonString === 'string') {
                    // If the whole thing was a stringified JSON, the inner string needs the same backslash treatment
                    let innerProcessedString = innerJsonString;
                    const innerProtectedEscapes = [];
                    let innerTempCounter = 0;
                    innerProcessedString = innerProcessedString.replace(/\\(["\\/bfnrt]|u[0-9a-fA-F]{4})/g, (match) => {
                        const placeholder = `${tempPlaceholder}_INNER_${innerTempCounter++}`;
                        innerProtectedEscapes.push({ placeholder, original: match });
                        return placeholder;
                    });
                    innerProcessedString = innerProcessedString.replace(/\\/g, '\\\\');
                    innerProtectedEscapes.forEach(item => {
                         const regex = new RegExp(item.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
                         innerProcessedString = innerProcessedString.replace(regex, item.original);
                    });
                    jsonStringToParse = innerProcessedString;
                    console.log("[markProblemAnswer] After inner string parse and re-processing backslashes (first 500 chars):", jsonStringToParse.substring(0, 500));
                }
            } catch (e) {
                console.warn("[markProblemAnswer] Tried to parse inner string but failed or result was not a string, proceeding with current jsonStringToParse. Error:", e);
            }
        }

        try {
            const result = JSON.parse(jsonStringToParse);
            result.score = Math.min(Math.max(0, Number(result.score) || 0), maxMarks);
            return {
                score: result.score,
                feedback: result.feedback || "No specific feedback provided.",
                key_points: Array.isArray(result.key_points) ? result.key_points : [],
                improvement_suggestions: Array.isArray(result.improvement_suggestions) ? result.improvement_suggestions : []
            };
        } catch (parseError) {
            console.error("Error parsing AI marking response (after ALL cleaning steps):", parseError);
            console.error("String that failed JSON.parse for Problem Marking:", jsonStringToParse);
            console.error("Original Raw AI Response for Problem Marking (for context):", rawApiResponse);
            return {
                score: 0,
                feedback: `Error processing AI marking response. The AI's output was not valid JSON. Raw output (may be truncated): ${escapeHtml(rawApiResponse.substring(0, 1000))}${rawApiResponse.length > 1000 ? '...' : ''}`,
                key_points: [],
                improvement_suggestions: []
            };
        }
    } catch (error) {
        console.error("Error in AI problem marking call (callGeminiTextAPI failed):", error);
        return { ...defaultResult, feedback: `Error during AI marking communication: ${error.message}` };
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
        questionResults: [],
        overallFeedback: null,
        timestamp: Date.now()
    };
    const defaultOverallFeedback = {
        overall_feedback: "Could not generate overall feedback at this time.",
        strengths: [],
        weaknesses: [],
        study_recommendations: []
    };

    let rawApiResponseForOverall = null;
    let cleanedResponseForOverall = ''; // For debugging the string fed to JSON.parse

    try {
        console.log(`Marking full exam: ${examData.examId}, Questions: ${examData.questions?.length}`);

        if (examData.questions && examData.questions.length > 0) {
            const markingPromises = [];

            for (let i = 0; i < examData.questions.length; i++) {
                const question = examData.questions[i];
                if (!question.id) {
                    console.warn(`Question at index ${i} is missing an ID. Assigning fallback q-${i+1}.`);
                    question.id = `q-${i+1}`;
                }

                const studentAnswer = examData.userAnswers?.[question.id];
                const isProblem = question.isProblem || !question.options || question.options.length === 0;
                const maxMarks = isProblem ? MAX_MARKS_PER_PROBLEM : MAX_MARKS_PER_MCQ;
                results.maxPossibleScore += maxMarks;

                if (isProblem) {
                    console.log(`Marking Problem Q${i+1} (ID: ${question.id}) with AI. Answer: "${studentAnswer?.substring(0, 50)}..."`);
                    markingPromises.push(
                        markProblemAnswer(question, studentAnswer, maxMarks)
                            .then(result => ({ index: i, questionId: question.id, result: result }))
                            .catch(error => ({ index: i, questionId: question.id, error: error }))
                    );
                } else { // MCQ
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
                        improvement_suggestions: isCorrect ? [] : [
                            `The correct answer was ${question.correctAnswer}. Your choice (${studentAnswerStr || 'Not Answered'}) suggests a possible misunderstanding of the core concept tested.`,
                            "Review this topic and practice similar MCQs focusing on identifying distractors."
                        ]
                    };
                    results.questionResults.push({
                        questionId: question.id,
                        questionIndex: i,
                        ...mcqResult
                    });
                    results.totalScore += score;
                    console.log(`Result for MCQ Q${i+1}: Score=${score}/${maxMarks}`);
                }
            }

            if (markingPromises.length > 0) {
                console.log(`Waiting for ${markingPromises.length} AI problem marking tasks...`);
                const settledProblemResults = await Promise.allSettled(markingPromises);
                console.log("AI problem marking tasks settled.");

                settledProblemResults.forEach((settledResult) => {
                    if (settledResult.status === 'fulfilled') {
                        const { index, questionId, result } = settledResult.value;
                        const scoreToAdd = Number(result.score) || 0;
                        results.totalScore += scoreToAdd;
                        results.questionResults.push({
                            questionId: questionId,
                            questionIndex: index,
                            ...result
                        });
                        console.log(`Result for Problem Q${index+1} (ID ${questionId}): Score=${scoreToAdd}/${MAX_MARKS_PER_PROBLEM}`);
                    } else {
                        const failedData = settledResult.reason?.requestData || markingPromises.find(p => p === settledResult.reason?.promise)?.value || { index: -1, questionId: 'unknown' };
                        const failedIndex = failedData.index;
                        const failedQuestionId = failedData.questionId;
                        const reason = settledResult.reason;
                        console.error(`AI Marking Error for Problem Q${failedIndex !== -1 ? failedIndex + 1 : 'Unknown'} (ID ${failedQuestionId}):`, reason);
                        results.questionResults.push({
                            questionId: failedQuestionId,
                            questionIndex: failedIndex,
                            score: 0,
                            feedback: `Error during AI marking: ${reason?.message || 'Unknown error'}.`,
                            key_points: [],
                            improvement_suggestions: []
                        });
                    }
                });
            }
            results.questionResults.sort((a, b) => a.questionIndex - b.questionIndex);

        } else {
            console.warn("No questions found in examData to mark.");
        }

        if (results.questionResults.length > 0 && results.maxPossibleScore > 0) {
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
                detailedSummary += `Feedback Snippet: ${(result?.feedback || 'N/A').substring(0,100)}...\n`;
            });

            const overallPrompt = `You are an expert examiner providing summative feedback on a physics/mathematics exam. The student achieved ${results.totalScore.toFixed(1)}/${results.maxPossibleScore.toFixed(1)} (${results.maxPossibleScore > 0 ? ((results.totalScore / results.maxPossibleScore) * 100).toFixed(1) : 0}%).

Analyze the student's performance based *specifically* on the following questions, their answers, and the marking:
${detailedSummary}
---
Provide constructive, material-based overall feedback. Focus on patterns of errors related to specific concepts or topics covered in the questions. Identify recurring mistakes if any.

Respond ONLY in this strict JSON format. Do NOT include markdown formatting like \`\`\`json around the JSON block itself:
{
    "overall_feedback": "[Provide a concise (2-4 sentences) overall assessment, mentioning score range and core performance observations based *on the material and observed error patterns*.]",
    "strengths": ["[List 2-3 specific concepts or topics the student demonstrated understanding of, referencing specific question numbers or types if possible.]"],
    "weaknesses": ["[List 2-3 specific concepts or topics where the student struggled *most consistently*, referencing specific question numbers or error patterns.]"],
    "study_recommendations": ["[Provide 2-3 actionable study recommendations *directly related* to the identified weaknesses and the specific material covered in the exam questions.]"]
}`;

            if (!await tokenLimitCheck(overallPrompt)) {
                 console.warn("Overall feedback prompt exceeds token limit. Generating generic feedback.");
                 results.overallFeedback = { ...defaultOverallFeedback, overall_feedback: "Overall feedback could not be generated due to content length limits." };
                 rawApiResponseForOverall = null;
            } else {
                console.log("Generating overall feedback with detailed context...");
                rawApiResponseForOverall = await callGeminiTextAPI(overallPrompt, null, 'examMarkerOverallFeedback');
            }

            if (rawApiResponseForOverall) {
                 try {
                      let jsonStringToParse = decodeHtmlEntities(rawApiResponseForOverall);
                      console.log("[markFullExam] Overall Feedback - After decodeHtmlEntities (first 500 chars):", jsonStringToParse.substring(0, 500));

                      jsonStringToParse = jsonStringToParse.trim();
                      if (jsonStringToParse.startsWith("```json")) {
                          jsonStringToParse = jsonStringToParse.substring(7);
                          if (jsonStringToParse.endsWith("```")) {
                              jsonStringToParse = jsonStringToParse.substring(0, jsonStringToParse.length - 3);
                          }
                      } else if (jsonStringToParse.startsWith("```")) {
                          jsonStringToParse = jsonStringToParse.substring(3);
                          if (jsonStringToParse.endsWith("```")) {
                              jsonStringToParse = jsonStringToParse.substring(0, jsonStringToParse.length - 3);
                          }
                      }
                      jsonStringToParse = jsonStringToParse.trim();
                      console.log("[markFullExam] Overall Feedback - After backtick removal (first 500 chars):", jsonStringToParse.substring(0, 500));

                      const tempPlaceholder = "@@JSON_ESCAPE_TEMP_PLACEHOLDER_OVERALL_";
                      const protectedEscapes = [];
                      let tempCounter = 0;

                      jsonStringToParse = jsonStringToParse.replace(/\\(["\\/bfnrt]|u[0-9a-fA-F]{4})/g, (match) => {
                          const placeholder = `${tempPlaceholder}${tempCounter++}`;
                          protectedEscapes.push({ placeholder, original: match });
                          return placeholder;
                      });
                       console.log("[markFullExam] Overall Feedback - After protecting JSON escapes (first 500):", jsonStringToParse.substring(0, 500));

                      jsonStringToParse = jsonStringToParse.replace(/\\/g, '\\\\');
                       console.log("[markFullExam] Overall Feedback - After escaping remaining backslashes (first 500):", jsonStringToParse.substring(0, 500));

                      protectedEscapes.forEach(item => {
                          const regex = new RegExp(item.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
                          jsonStringToParse = jsonStringToParse.replace(regex, item.original);
                      });
                      console.log("[markFullExam] Overall Feedback - After restoring JSON escapes (first 500):", jsonStringToParse.substring(0, 500));

                      if (jsonStringToParse.startsWith('"') && jsonStringToParse.endsWith('"')) {
                          try {
                              const innerJsonString = JSON.parse(jsonStringToParse);
                              if (typeof innerJsonString === 'string') {
                                  let innerProcessedString = innerJsonString;
                                  const innerProtectedEscapes = [];
                                  let innerTempCounter = 0;
                                  innerProcessedString = innerProcessedString.replace(/\\(["\\/bfnrt]|u[0-9a-fA-F]{4})/g, (match) => {
                                      const placeholder = `${tempPlaceholder}_INNER_OVERALL_${innerTempCounter++}`;
                                      innerProtectedEscapes.push({ placeholder, original: match });
                                      return placeholder;
                                  });
                                  innerProcessedString = innerProcessedString.replace(/\\/g, '\\\\');
                                  innerProtectedEscapes.forEach(item => {
                                       const regex = new RegExp(item.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
                                       innerProcessedString = innerProcessedString.replace(regex, item.original);
                                  });
                                  jsonStringToParse = innerProcessedString;
                                  console.log("[markFullExam] Overall Feedback - After inner string parse and re-processing backslashes (first 500 chars):", jsonStringToParse.substring(0, 500));
                              }
                          } catch (e) {
                               console.warn("[markFullExam] Tried to parse inner string for overall feedback but failed. Error:", e);
                          }
                      }

                      cleanedResponseForOverall = jsonStringToParse; // Store for logging on error
                      results.overallFeedback = JSON.parse(jsonStringToParse);
                      results.overallFeedback.strengths = Array.isArray(results.overallFeedback.strengths) ? results.overallFeedback.strengths : [];
                      results.overallFeedback.weaknesses = Array.isArray(results.overallFeedback.weaknesses) ? results.overallFeedback.weaknesses : [];
                      results.overallFeedback.study_recommendations = Array.isArray(results.overallFeedback.study_recommendations) ? results.overallFeedback.study_recommendations : [];

                 } catch (parseOrApiError) {
                      console.error("Error parsing overall feedback JSON:", parseOrApiError);
                      console.error("Final Processed Overall Response that failed to parse JSON:", cleanedResponseForOverall);
                      console.error("Original Raw AI Response for Overall Feedback:", rawApiResponseForOverall);
                      results.overallFeedback = { ...defaultOverallFeedback };
                      results.overallFeedback.overall_feedback = `Error processing overall feedback. AI output was not valid JSON. Raw AI Response (may be truncated): ${escapeHtml(rawApiResponseForOverall?.substring(0, 1000) || 'No response received')}${rawApiResponseForOverall && rawApiResponseForOverall.length > 1000 ? '...' : ''}`;
                 }
             } else if (!results.overallFeedback) {
                  results.overallFeedback = { ...defaultOverallFeedback, overall_feedback: "Overall feedback could not be generated (e.g., due to token limit or no AI response)." };
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
              console.error(`Missing result for question index ${i} in final processing. This indicates an issue with result aggregation.`);
              return { questionId: examData.questions[i]?.id || `q-${i+1}`, questionIndex: i, score: 0, feedback: "Marking Error - Result Missing", key_points: [], improvement_suggestions: [] };
         }
         return { ...r, score: Number(r.score) || 0 };
    });
    results.totalScore = Number(results.totalScore) || 0;
    results.totalScore = Math.max(0, Math.min(results.totalScore, results.maxPossibleScore));

    console.log("Full exam marking complete. Final results object (structure check):", {
        totalScore: results.totalScore,
        maxPossibleScore: results.maxPossibleScore,
        questionResultsCount: results.questionResults.length,
        overallFeedbackKeys: Object.keys(results.overallFeedback || {}),
        timestamp: results.timestamp
    });
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
    let systemPromptKeyToUse = 'questionExplainerMCQ'; // Default

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
            systemPromptKeyToUse = 'questionExplainerProblem';
            currentPromptText += `**Student's Answer (if any):** ${studentAnswer || "Not answered"}\n\n`;
            currentPromptText += `Explain the correct concepts and steps required to solve this problem. If the student provided an answer, analyze their likely approach and point out potential errors or correct steps they took. Provide the final correct reasoning or expected form of the answer if applicable. Use LaTeX ($$ for display math, $ for inline math) for mathematical expressions.`;
        } else {
            systemPromptKeyToUse = 'questionExplainerMCQ';
            currentPromptText += `**Options:**\n`;
            question.options.forEach(opt => { currentPromptText += `${opt.letter}. ${opt.text}\n`; });
            currentPromptText += `\n**Correct Answer:** ${actualCorrectAnswer || 'N/A'}\n`;
            currentPromptText += `**Student's Answer:** ${studentAnswer || "Not answered"}\n\n`;
            currentPromptText += `Explain step-by-step:\n`;
            currentPromptText += `1. Why the correct answer (${actualCorrectAnswer || 'N/A'}) is right, focusing on the underlying principle.\n`;
            if (studentAnswer && studentAnswer !== actualCorrectAnswer) {
                currentPromptText += `2. Why the student's choice (${studentAnswer}) is incorrect, explaining the misconception or error in reasoning.\n`;
            } else if (studentAnswer === actualCorrectAnswer) {
                currentPromptText += `2. Briefly confirm the student chose correctly and why that choice is sound.\n`;
            } else {
                currentPromptText += `2. The student did not select an answer. Briefly explain the concept needed to arrive at the correct answer.\n`;
            }
            currentPromptText += `Use LaTeX ($$ for display math, $ for inline math) for mathematical expressions if needed. Keep the explanation clear, educational, and structured. Do NOT use Markdown headings (like #, ##).`;
        }
    }
    
    showLoading("Generating AI explanation...");
    try {
        const explanationText = await callGeminiTextAPI(currentPromptText, history, systemPromptKeyToUse);
        
        const updatedHistory = [
            ...history,
            { role: "user", parts: [{ text: currentPromptText }] },
            { role: "model", parts: [{ text: explanationText }] }
        ];

        return {
            explanationHtml: formatResponseAsHtml(explanationText),
            history: updatedHistory
        };
    } catch (error) {
        console.error("Error generating explanation:", error);
        const historyBeforeError = [
            ...history,
            { role: "user", parts: [{ text: currentPromptText }] }
        ];
        return {
            explanationHtml: `<p class="text-danger">Error generating explanation: ${error.message}</p>`,
            history: historyBeforeError
        };
    } finally { 
        hideLoading(); 
    }
}
// --- END OF FILE ai_exam_marking.js ---