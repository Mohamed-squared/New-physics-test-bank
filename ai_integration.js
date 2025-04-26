// ai_integration.js

import { GEMINI_API_KEY } from './config.js'; // Import the API key
import { showLoading, hideLoading } from './utils.js'; // Import UI helpers

// Dynamically get the SDK object if it loaded successfully
let GoogleGenerativeAI;
try {
    // This relies on the dynamic import in index.html completing.
    const genAIModule = await import('https://unpkg.com/@google/generative-ai?module');
    GoogleGenerativeAI = genAIModule.GoogleGenerativeAI;
} catch (e) {
    console.error("Google AI SDK class not found. AI Features disabled.", e);
}

const MODEL_NAME = "gemini-1.5-flash"; // Client-compatible model

// --- Helper Function for API Call ---
async function callGeminiAPI(prompt) {
    if (!GoogleGenerativeAI) {
        throw new Error("AI SDK failed to load.");
    }
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY" || GEMINI_API_KEY.startsWith("AIzaSyAfAn")) {
        throw new Error("API Key not configured.");
    }

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        console.log(`Sending prompt to Gemini (${MODEL_NAME}):`, prompt.substring(0, 150) + "...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = await response.text(); // Await the text promise
        console.log("Received AI response:", text.substring(0, 150) + "...");
        return text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        let errorMessage = `Gemini API Error: ${error.message || 'Unknown error'}.`;
        if (error.message && error.message.includes('API key not valid')) {
            errorMessage = "Gemini API Error: Invalid API Key.";
        } else if (error.message && error.message.includes('quota')) {
            errorMessage = "Gemini API Error: Quota exceeded.";
        } else if (error.message && error.message.includes('SAFETY')) {
            errorMessage = "Gemini API Error: Response blocked due to safety settings.";
        }
        throw new Error(errorMessage); // Re-throw formatted error
    }
}

// --- Helper Function for Markdown Formatting ---
function formatResponseAsHtml(text) {
    // Basic Markdown to HTML conversion
    let htmlResponse = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italics
        .replace(/`([^`]+)`/g, '<code>$1</code>') // Inline code
        .replace(/^### (.*$)/gim, '<h5>$1</h5>') // H3 -> h5
        .replace(/^## (.*$)/gim, '<h4>$1</h4>')   // H2 -> h4
        .replace(/^# (.*$)/gim, '<h3>$1</h3>')    // H1 -> h3
        .replace(/^\s*-\s+(.*)/gm, '<li>$1</li>') // List items
        .replace(/^\s*\*\s+(.*)/gm, '<li>$1</li>') // List items (*)
        .replace(/^\s*\d+\.\s+(.*)/gm, '<li>$1</li>') // Ordered list items
        // Basic list wrapping (needs improvement for nested lists)
        .replace(/(<li>.*<\/li>\s*)+/g, (match) => `<ul>${match.replace(/<br>/g, '')}</ul>`) // Wrap adjacent basic list items
        .replace(/\n/g, '<br>'); // Newlines

    // Clean up potentially messy list formatting from newline conversion
    htmlResponse = htmlResponse.replace(/<br><ul>/g, '<ul>').replace(/<\/ul><br>/g, '</ul>');
    // Convert any remaining double breaks outside lists into paragraph breaks
    htmlResponse = htmlResponse.replace(/<br>\s*<br>/g, '</p><p>');
    // Wrap content not already in a block element with paragraphs
    // This is tricky; a simpler approach might be needed if formatting is complex
    // htmlResponse = `<p>${htmlResponse}</p>`; // Simplistic wrap

    return `<div class="prose prose-sm dark:prose-invert max-w-none">${htmlResponse}</div>`;
}


// --- Existing AI Explanation Function (Modified for Helper) ---
export async function getAIExplanation(questionData) {
    console.log("Attempting to get AI explanation for:", questionData);
    try {
        let prompt = `You are a helpful physics tutor. Explain the following multiple-choice question clearly and concisely:\n\n`;
        prompt += `**Question:**\n${questionData.questionText}\n\n`;
        prompt += `**Options:**\n`;
        questionData.options.forEach(opt => {
            prompt += `${opt.letter}. ${opt.text}\n`;
        });
        prompt += `\n**Correct Answer:** ${questionData.correctAnswer}\n`;
        if (!questionData.isUserCorrect && questionData.userAnswer) {
            prompt += `**User's Incorrect Answer:** ${questionData.userAnswer}\n\n`;
            prompt += `Please explain step-by-step:\n1. Why the correct answer (${questionData.correctAnswer}) is right.\n2. Why the user's answer (${questionData.userAnswer}) is wrong.\n`;
        } else {
            prompt += `\nPlease explain step-by-step why ${questionData.correctAnswer} is the correct answer.\n`;
        }
        prompt += `\nKeep the explanation focused on the physics concepts involved. Format the explanation using basic Markdown (like **bold** for emphasis). You can include simple inline LaTeX like $E=mc^2$ or display math like $$ \\sum F = ma $$ if relevant. Do NOT use Markdown headings (#, ##, ###).`;

        showLoading("Generating AI Explanation...");
        const explanationText = await callGeminiAPI(prompt);
        hideLoading();
        return formatResponseAsHtml(explanationText); // Format the raw text

    } catch (error) {
        console.error("Error in getAIExplanation:", error);
        hideLoading();
        return `<p class="text-danger">Error generating explanation: ${error.message}</p>`;
    }
}

// --- NEW AI Functions for Courses ---

/**
 * Generates a formula sheet for a given chapter's content.
 * @param {string} chapterContent - Text content of the chapter (e.g., from transcription or PDF text).
 * @param {number} chapterNum - The chapter number for context.
 * @returns {Promise<string>} - Resolves with the formula sheet HTML string or an error message.
 */
export async function generateFormulaSheet(chapterContent, chapterNum) {
    console.log(`Generating formula sheet for Chapter ${chapterNum}`);
    if (!chapterContent) {
        return `<p class="text-warning">Cannot generate formula sheet: Chapter content is missing.</p>`;
    }
    try {
        const prompt = `You are an expert physics assistant. Based ONLY on the following text content from Chapter ${chapterNum}, extract the key formulas, equations, and important definitions. Present them clearly and concisely as a formula sheet. Use basic Markdown for formatting (bold for titles, lists, inline code for variables) and LaTeX for equations (inline $...$ or display $$...$$). Do NOT include explanations, only the formulas/definitions.

Text Content:
---
${chapterContent.substring(0, 15000)}
---
End of Text Content.

Generate the formula sheet now:`; // Limit content length for API

        showLoading(`Generating Formula Sheet (Ch ${chapterNum})...`);
        const formulaSheetText = await callGeminiAPI(prompt);
        hideLoading();
        return formatResponseAsHtml(formulaSheetText);

    } catch (error) {
        console.error(`Error generating formula sheet for Chapter ${chapterNum}:`, error);
        hideLoading();
        return `<p class="text-danger">Error generating formula sheet: ${error.message}</p>`;
    }
}

/**
 * Explains a specific snippet of text within a given context.
 * @param {string} snippet - The highlighted/selected text snippet.
 * @param {string} context - Surrounding text or description of where the snippet came from.
 * @returns {Promise<string>} - Resolves with the explanation HTML string or an error message.
 */
export async function explainStudyMaterialSnippet(snippet, context) {
    console.log(`Requesting explanation for snippet: "${snippet.substring(0, 50)}..."`);
    if (!snippet) {
        return `<p class="text-warning">No text snippet provided for explanation.</p>`;
    }
    try {
        const prompt = `You are a helpful physics tutor. Please explain the following text snippet clearly and concisely.

Snippet:
"${snippet}"

Context (where the snippet came from):
"${context || 'No specific context provided.'}"

Provide an explanation suitable for someone studying this topic. Use basic Markdown and LaTeX ($...$ or $$...$$) if needed. Focus on the meaning and significance of the snippet within the given context. Do NOT use Markdown headings (#, ##, ###).`;

        showLoading("Generating Explanation...");
        const explanationText = await callGeminiAPI(prompt);
        hideLoading();
        return formatResponseAsHtml(explanationText);

    } catch (error) {
        console.error("Error generating snippet explanation:", error);
        hideLoading();
        return `<p class="text-danger">Error generating explanation: ${error.message}</p>`;
    }
}

/**
 * Generates questions for a "skip chapter" exam based on study material.
 * NOTE: This is a complex task. The quality depends heavily on the AI model and input quality.
 * It returns the raw generated text, assuming it follows a specific format.
 * @param {string} transcriptionContent - Text content from lecture transcription.
 * @param {string} chapterPdfContent - Text content extracted from the chapter PDF (if available).
 * @param {number} chapterNum - The chapter number.
 * @returns {Promise<string|null>} - Resolves with the raw text of generated questions+answers, or null on error.
 */
export async function generateSkipExam(transcriptionContent, chapterPdfContent, chapterNum) {
    console.log(`Generating Skip Exam for Chapter ${chapterNum}`);
    let combinedContent = `Lecture Transcription:\n---\n${transcriptionContent || 'Not available.'}\n---\n\n`;
    combinedContent += `Chapter PDF Content:\n---\n${chapterPdfContent || 'Not available.'}\n---\n`;

    if (!transcriptionContent && !chapterPdfContent) {
        console.error(`Cannot generate Skip Exam for Ch ${chapterNum}: No study material content provided.`);
        return null;
    }

    try {
        // Estimate complexity/length? For now, request a fixed-ish number. More sophisticated logic needed for "sufficient".
        const requestedQuestions = 15; // Example: Aim for 15 questions

        const prompt = `You are a physics assessment expert. Based ONLY on the provided lecture transcription and chapter text for Chapter ${chapterNum}, generate a multiple-choice quiz of approximately ${requestedQuestions} questions that comprehensively tests understanding of the key concepts, definitions, formulas, and problem-solving techniques presented.

Ensure the questions cover the breadth of the material. For each question:
1. Provide the question text.
2. Provide 4-5 plausible multiple-choice options (labeled A, B, C, D, E).
3. Indicate the correct answer clearly on a new line using the format "ans: [Correct Letter]".
4. Use basic Markdown and LaTeX ($...$ or $$...$$) for formatting within questions and options.
5. Number the questions sequentially (1., 2., etc.).

Combined Study Material Content:
---
${combinedContent.substring(0, 25000)}
---
End of Content.

Generate the quiz questions now:`; // Limit input significantly

        showLoading(`Generating Skip Exam (Ch ${chapterNum})...`);
        // This might take a while and could hit API limits or timeouts
        const examText = await callGeminiAPI(prompt);
        hideLoading();
        console.log(`Raw Skip Exam Text for Ch ${chapterNum}:`, examText.substring(0, 200));
        // Basic validation: check if it seems to contain question numbers and "ans:"
        if (!examText || !/\d+\..*ans:/i.test(examText)) {
             throw new Error("Generated content does not appear to be a valid exam format.");
        }
        return examText; // Return raw text, parsing happens elsewhere

    } catch (error) {
        console.error(`Error generating skip exam for Chapter ${chapterNum}:`, error);
        hideLoading();
        alert(`Failed to generate skip exam for Chapter ${chapterNum}: ${error.message}`);
        return null;
    }
}