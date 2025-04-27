// ai_integration.js

import { GEMINI_API_KEY } from './config.js'; // Import the API key
import { showLoading, hideLoading } from './utils.js'; // Import UI helpers

// Dynamically get the SDK object if it loaded successfully
let GoogleGenerativeAI;
try {
    // Assuming the SDK script in index.html made it globally available
    // This relies on the dynamic import in index.html completing.
    const genAIModule = await import('https://unpkg.com/@google/generative-ai?module');
    GoogleGenerativeAI = genAIModule.GoogleGenerativeAI;
} catch (e) {
    console.error("Google AI SDK class not found. AI Features disabled.", e);
}

// *** REVERTED to client-side model name ***
const MODEL_NAME = "gemini-2.5-pro-exp-03-25"; // Or another suitable client-compatible model

/**
 * Gets an AI explanation for a given question context using the client-side SDK.
 * WARNING: Exposes API Key. Not recommended for production.
 * @param {object} questionData - Contains questionText, options, correctAnswer, userAnswer, isUserCorrect
 * @returns {Promise<string>} - Resolves with the explanation HTML string or an error message.
 */
export async function getAIExplanation(questionData) {
    console.log("Attempting to get AI explanation (Client-Side) for:", questionData);

    if (!GoogleGenerativeAI) {
        return `<p class="text-danger">AI SDK failed to load. Cannot get explanation.</p>`;
    }

    // *** REVERTED to check client-side key ***
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY" || GEMINI_API_KEY.startsWith("AIzaSyAfAn")) { // Added check for common placeholder start
        console.error("Gemini API Key is missing or not set correctly in config.js");
        return `<p class="text-danger">AI Explanation Error: API Key not configured.</p><p class="text-xs text-muted">Please add your Gemini API key to config.js (Note: This is insecure for public sites).</p>`;
    }

    try {
        // *** REVERTED to use client-side key ***
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // 1. Construct Prompt (Same as before)
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
         prompt += `\nKeep the explanation focused on the physics concepts involved. Format the explanation using basic Markdown (like **bold** for emphasis). You can include simple inline LaTeX like $E=mc^2$ or display math like $$ \\sum F = ma $$ if relevant.`

        console.log("Sending prompt to Gemini (Client-Side):", prompt.substring(0, 100) + "...");

        // 2. Call Gemini API (Client-Side)
        showLoading("Generating AI Explanation...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        // Ensure you await the text() promise
        const text = await response.text();
        hideLoading();

        console.log("Received AI response (Client-Side):", text.substring(0,100) + "...");

        // 3. Format and Return Response (Basic Markdown to HTML)
        // Use the safer formatting from the previous Cloud Function version
         let htmlResponse = text
             .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
             .replace(/\*(.*?)\*/g, '<em>$1</em>')     // Italics
             .replace(/`([^`]+)`/g, '<code>$1</code>') // Inline code
             .replace(/^### (.*$)/gim, '<h3>$1</h3>') // Heading 3
             .replace(/^## (.*$)/gim, '<h2>$1</h2>')   // Heading 2
             .replace(/^# (.*$)/gim, '<h1>$1</h1>')    // Heading 1
             .replace(/^\s*-\s+(.*)/gm, '<li>$1</li>') // List items (simple)
             // Basic list wrapping (might need refinement)
             .replace(/(<li>.*<\/li>\s*)+/g, (match) => `<ul>${match.replace(/<br>/g, '')}</ul>`)
             .replace(/\n/g, '<br>');                  // Newlines

         // Clean up list spacing potentially introduced by newline conversion
         htmlResponse = htmlResponse.replace(/<br><ul>/g, '<ul>').replace(/<\/ul><br>/g, '</ul>');

         // MathJax rendering will happen where this is inserted

         return htmlResponse;

    } catch (error) {
        console.error("Error calling Gemini API (Client-Side):", error);
        hideLoading();

        // Provide more specific error feedback if possible
        let errorMessage = `Could not get AI explanation: ${error.message || 'Unknown error'}.`;
        if (error.message && error.message.includes('API key not valid')) { // Check error message content
            errorMessage = "AI Explanation Error: Invalid API Key. Please check config.js.";
        } else if (error.message && error.message.includes('quota')) {
             errorMessage = "AI Explanation Error: Usage limit reached (quota exceeded).";
        } else if (error.message && error.message.includes('SAFETY')) {
             errorMessage = "AI Explanation Error: The response was blocked due to safety settings.";
        }

        return `<p class="text-danger">${errorMessage}</p>`;
    }
}