// --- START OF FILE ai_integration.js ---

// ai_integration.js

import { GEMINI_API_KEY, PDF_WORKER_SRC, COURSE_TRANSCRIPTION_BASE_PATH } from './config.js'; // Import the API key & PDF Worker Source & Transcription Path
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Import UI helpers & escapeHtml
import { globalCourseDataMap, currentUser } from './state.js'; // Need course data map and current user for feedback
// *** NEW: Import submitFeedback for error reporting ***
// NOTE: This introduces a potential circular dependency risk. Manage carefully.
import { submitFeedback } from './firebase_firestore.js';
// *** NEW: Import getSrtFilenameFromTitle from ui_course_study_material ***
import { getSrtFilenameFromTitle } from './ui_course_study_material.js'; // Import SRT filename helper

// Dynamically get the SDK object if it loaded successfully
let GoogleGenerativeAI;
try {
    const genAIModule = await import('https://unpkg.com/@google/generative-ai?module');
    GoogleGenerativeAI = genAIModule.GoogleGenerativeAI;
} catch (e) {
    console.error("Google AI SDK class not found. AI Features disabled.", e);
    // Submit feedback about SDK loading failure
    if (currentUser) {
        submitFeedback({
            subjectId: "AI SDK Load Error",
            questionId: null,
            feedbackText: `Failed to load Google AI SDK: ${e.message}`,
            context: "System Error - AI SDK Load"
        }, currentUser).catch(e => console.error("Failed to submit feedback for SDK load error:", e));
    }
}

// PDF.js library (dynamically check if loaded - needed for PDF text extraction)
let pdfjsLib = window.pdfjsLib;

// Define models (Using latest stable versions)
const TEXT_MODEL_NAME = "gemini-2.5-pro-exp-03-25"; // Using latest stable 1.5 pro
const VISION_MODEL_NAME = "gemini-2.5-pro-exp-03-25"; // Using latest stable vision model


// --- Helper: Fetch Text File (SRT Parser) ---
async function fetchSrtText(url) {
    // Fetches SRT and returns only the text lines concatenated
    try {
        const response = await fetch(`${url}?t=${new Date().getTime()}`);
        if (!response.ok) {
             if (response.status === 404) {
                 console.warn(`fetchSrtText: File not found at ${url}. Returning null.`);
                 return null;
             }
             throw new Error(`HTTP error status: ${response.status}`);
         }
        const srtContent = await response.text();
        // Keep only text lines from SRT
        const textLines = srtContent.split(/\r?\n/).filter(line => line && !/^\d+$/.test(line) && !/-->/.test(line));
        const extractedText = textLines.join(' '); // Join lines with space for readability/context
        // console.log(`fetchSrtText: Extracted text from SRT: ${url}`); // Less verbose logging
        return extractedText;
    } catch (error) {
        console.error(`Error fetching/parsing SRT file (${url}):`, error);
        return null;
    }
}

// --- Helper: Extract Text from ALL pages of a PDF ---
// Make this globally available for study material UI too
export async function getAllPdfTextForAI(pdfDataOrPath) {
    // Ensure PDF.js library is available
    if (typeof pdfjsLib === 'undefined') {
        console.error("PDF.js library is not loaded. Cannot extract text from PDF.");
        if (window.pdfjsLib) { pdfjsLib = window.pdfjsLib; console.log("Accessed PDF.js from window scope."); }
        else { alert("PDF processing library (PDF.js) is not available."); return null; }
    }
     if (!pdfDataOrPath) return null; // No path or data provided

    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
    let pdfText = "";
    const sourceDescription = typeof pdfDataOrPath === 'string' ? pdfDataOrPath : `Uint8Array (length: ${pdfDataOrPath.length})`;
    console.log(`Attempting to extract text from all pages of PDF source: ${sourceDescription}`);
    try {
        const loadingTask = pdfjsLib.getDocument(pdfDataOrPath); // Accepts URL string or Uint8Array
        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;
        console.log(`Extracting text from ${numPages} pages...`);
        const pagesToProcess = numPages; // Process all pages

        for (let i = 1; i <= pagesToProcess; i++) {
            try {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                // Improved extraction: Handle potential empty strings and join items intelligently
                // MODIFIED: Join with space, handle hyphenation better (simple approach)
                const pageText = textContent.items.map(item => item.str).join(' ').replace(/-\s+/g, '').replace(/\s+/g, ' ').trim();
                if (pageText) {
                     pdfText += pageText + "\n\n"; // Add double newline for paragraph separation
                }
            } catch (pageError) { console.warn(`Error extracting text from page ${i} of ${sourceDescription}:`, pageError); }
        }
        console.log(`Finished text extraction. Total length: ${pdfText.length}`);
        // Inform user if PDF seems image-based
        if (pdfText.length < numPages * 50) { // Heuristic: less than 50 chars per page avg
            console.warn("PDF text content seems very short. It might be image-based or scanned without OCR.");
            // alert("Warning: This PDF appears to be image-based or lacks selectable text. AI analysis might be limited.");
        }
        return pdfText.trim(); // Trim final result
    } catch (error) {
        console.error(`Error extracting text from PDF ${sourceDescription}:`, error);
         // Provide more context in the error message
         if (error.name === 'InvalidPDFException') {
            alert(`Error: The PDF file at "${sourceDescription}" seems to be invalid or corrupted.`);
        } else if (error.name === 'MissingPDFException') {
            alert(`Error: The PDF file could not be found at "${sourceDescription}". Please check the path.`);
        } else {
            alert(`Error extracting text from PDF: ${error.message}`);
        }
        return null; // Return null if extraction fails
    }
}
window.getAllPdfTextForAI = getAllPdfTextForAI; // Assign to window scope


// --- API Call Helpers ---
/**
 * Checks if the prompt length likely exceeds a safe token limit.
 * Sends feedback if the limit is exceeded.
 * @param {string} contextText - The main context text being sent.
 * @param {number} [charLimit=1800000] - Approximate character limit (adjust based on model - 1.5 Pro has ~2M token limit).
 * @returns {Promise<boolean>} - True if the prompt is likely within the limit, false otherwise.
 */
export async function tokenLimitCheck(contextText, charLimit = 1800000) { // Approx 1.8M chars for ~2M tokens (safer side)
    if (contextText && contextText.length > charLimit) {
        console.error(`AI Context Exceeds Limit: Length ${contextText.length} > Limit ${charLimit}`);
        const feedbackData = {
            subjectId: "AI Context Limit",
            questionId: null,
            feedbackText: `AI prompt context length (${contextText.length}) exceeded the safety limit (${charLimit}) for a function call. Context might be too large. Context type: ${contextText.substring(0, 100)}...`,
            context: "System Error - AI Context Length Limit"
        };
        if (currentUser) {
            await submitFeedback(feedbackData, currentUser).catch(e => console.error("Failed to submit feedback for context limit error:", e));
        }
        return false; // Exceeds limit
    }
    return true; // Within limit
}


/**
 * Calls the Gemini Text API. Can handle single prompts or conversational history.
 * @param {string | null} prompt - The single user prompt text (if not using history).
 * @param {Array | null} history - The conversation history array (if continuing a conversation).
 * @returns {Promise<string>} - The AI's text response.
 */
export async function callGeminiTextAPI(prompt, history = null) {
    if (!GoogleGenerativeAI) throw new Error("AI SDK failed to load.");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY") throw new Error("API Key not configured.");

    // Check token limit
    if (!await tokenLimitCheck(prompt)) {
        throw new Error("Prompt exceeds token limit. Please reduce the context size.");
    }

    // Prepare request contents
    const requestContents = history ? [
        ...history.map(msg => ({ role: msg.role, parts: [{ text: msg.content }] })),
        { role: "user", parts: [{ text: prompt }] }
    ] : [{ role: "user", parts: [{ text: prompt }] }];

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: TEXT_MODEL_NAME });

        // Enhanced safety settings
        const safetySettings = [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ];

        // Optimized generation config
        const generationConfig = {
            temperature: 0.6, // Slightly lower temp for more focused generation
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192, // Increased max output tokens
            stopSequences: ["\n\n\n"] // Prevent excessive newlines
        };

        const result = await model.generateContent({ 
            contents: requestContents, 
            safetySettings, 
            generationConfig 
        });
        const response = result.response;

        // Enhanced error handling
        if (response.promptFeedback?.blockReason) {
            console.error("Prompt blocked by safety settings:", response.promptFeedback.blockReason);
            throw new Error(`AI request blocked due to safety settings: ${response.promptFeedback.blockReason}`);
        }
        if (!response.candidates || response.candidates.length === 0) {
            console.warn("Gemini response has no candidates:", response);
            throw new Error("AI response was empty or missing content.");
        }
        if (response.candidates[0].finishReason === 'SAFETY') {
            console.error("Response candidate blocked by safety settings.");
            throw new Error("AI response blocked due to safety settings.");
        }

        return response.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Error in callGeminiTextAPI:", error);
        // Submit feedback about API error
        if (currentUser) {
            submitFeedback({
                subjectId: "AI API Error",
                questionId: null,
                feedbackText: `Error in callGeminiTextAPI: ${error.message}`,
                context: "System Error - AI API Call"
            }, currentUser).catch(e => console.error("Failed to submit feedback for API error:", e));
        }
        throw error;
    }
}

export async function callGeminiVisionAPI(promptParts) {
    if (!GoogleGenerativeAI) throw new Error("AI SDK failed to load.");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY") throw new Error("API Key not configured.");
    if (!promptParts?.length) throw new Error("Prompt parts cannot be empty.");

    // Note: Token limit check for vision is more complex due to image tokens.
    // We'll rely on the API to return an error if the limit is exceeded.

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: VISION_MODEL_NAME });
        const logParts = promptParts.map(p => p.inlineData ? `{inlineData: mimeType=${p.inlineData.mimeType}, length=${p.inlineData.data?.length}}` : p);
        console.log(`Sending VISION prompt (${VISION_MODEL_NAME}):`, logParts);
        // Basic safety settings
        const safetySettings = [
             { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
             { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
             { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
             { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
         ];
          // Add generation config
         const generationConfig = {
             temperature: 0.4, // Lower temp for vision tasks often better
             topK: 32,
             topP: 1.0,
             maxOutputTokens: 4096,
         };

        // MODIFIED: Use generateContent for consistency, pass promptParts directly
        const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }], safetySettings, generationConfig });
        const response = result.response;

        if (response.promptFeedback?.blockReason) { throw new Error(`AI request blocked: ${response.promptFeedback.blockReason}`); }
        if (!response.candidates?.length) { throw new Error("AI response was empty."); }
        if (response.candidates[0].finishReason === 'SAFETY') { throw new Error("AI response blocked due to safety settings."); }
        if (response.candidates[0].finishReason === 'MAX_TOKENS') { console.warn("Vision response truncated due to MAX_TOKENS."); }
        if (!response.candidates[0].content?.parts?.[0]?.text) { throw new Error("AI response format unclear or content missing."); }

        const text = response.candidates[0].content.parts[0].text;
        console.log("Received AI vision response.");
        return text;
    } catch (error) {
        console.error("Error calling Gemini Vision API:", error);
        let errorMessage = `Gemini API Error: ${error.message || 'Unknown error'}.`;
        if (error.message?.toLowerCase().includes('api key not valid')) { errorMessage = "Invalid API Key."; }
        else if (error.message?.includes('quota')) { errorMessage = "Quota exceeded."; }
        throw new Error(errorMessage);
    }
}

// --- HTML Formatting ---
// MODIFIED: Add simple wrapper for chat turns
function formatResponseAsHtml(rawText, role = "model") {
    if (!rawText) return '<p class="text-muted italic">AI did not provide a response.</p>';

    // Escape initial HTML, then apply formatting
    let escapedText = escapeHtml(rawText);

    // Handle code blocks (```) first
    escapedText = escapedText.replace(/```(?:[a-zA-Z]+)?\n([\s\S]*?)\n```/g, (m, code) => `<pre><code class="block whitespace-pre-wrap">${escapeHtml(code.trim())}</code></pre>`);

    // Handle inline code (`)
    escapedText = escapedText.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Handle bold (**) and italics (*) - Ensure they don't interfere with lists
    escapedText = escapedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escapedText = escapedText.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Handle ordered lists (number. ) - Simple conversion
    escapedText = escapedText.replace(/^\s*(\d+)\.\s+(.*)/gm, (match, number, item) => `<li>${item.trim()}</li>`);
    escapedText = escapedText.replace(/(<li>.*<\/li>\s*)+/g, (match) => `<ol style="list-style:decimal;margin-left:1.5em;">${match.trim()}</ol>`);

    // Handle unordered lists (* or -) - Simple conversion
    escapedText = escapedText.replace(/^\s*[\*\-]\s+(.*)/gm, (match, item) => `<li>${item.trim()}</li>`);
    escapedText = escapedText.replace(/(<li>.*<\/li>\s*)+/g, (match) => `<ul style="list-style:disc;margin-left:1.5em;">${match.trim()}</ul`);

    // Handle paragraphs/line breaks - Replace remaining single newlines with <br>, but not inside lists or pre
    let lines = escapedText.split('\n');
    let inList = false;
    let inPre = false;
    let processedLines = lines.map(line => {
        let trimmedLine = line.trim();
        if (trimmedLine.startsWith('<pre>')) inPre = true;
        if (trimmedLine.startsWith('<ol') || trimmedLine.startsWith('<ul')) inList = true;

        let outputLine = line;
        // Add <br> only if it's a non-empty line, not inside pre/list tags, and not already a list item start/end or heading
        if (!inPre && !inList && trimmedLine.length > 0 && !trimmedLine.startsWith('<li') && !trimmedLine.endsWith('</li>') && !trimmedLine.startsWith('<h') && !trimmedLine.endsWith('>') && !trimmedLine.startsWith('<ol') && !trimmedLine.startsWith('<ul') && !trimmedLine.endsWith('</ol>') && !trimmedLine.endsWith('</ul>')) {
            outputLine += '<br>';
        }
        // Remove <br> right before list/pre blocks or after list/pre blocks
         outputLine = outputLine.replace(/<br>\s*(<(?:pre|ol|ul))/g, '$1');
         outputLine = outputLine.replace(/(<\/(?:pre|ol|ul)>)\s*<br>/g, '$1');


        if (trimmedLine.endsWith('</pre>')) inPre = false;
        if (trimmedLine.endsWith('</ol>') || trimmedLine.endsWith('</ul>')) inList = false;
        return outputLine;
    });

    // Join lines and remove trailing <br>
    let htmlWithBreaks = processedLines.join('\n').replace(/<br>\s*$/g, '');

    // Wrap in a div with prose styles
    return `<div class="prose prose-sm dark:prose-invert max-w-none leading-relaxed">${htmlWithBreaks}</div>`;
}


// --- AI Functions ---
export async function getAIExplanation(questionData) {
     // This function is primarily for EXAM REVIEW explanations (single turn)
     // The multi-turn logic is now handled in generateExplanation
     console.log("Attempting to get AI explanation for:", questionData);
     try {
         let prompt = `You are a helpful physics and mathematics tutor. Explain the following multiple-choice question clearly and concisely:\n\n`;
         prompt += `**Question:**\n${questionData.text}\n\n`; // Use text property
         prompt += `**Options:**\n`;
         questionData.options.forEach(opt => { prompt += `${opt.letter}. ${opt.text}\n`; });
         prompt += `\n**Correct Answer:** ${questionData.correctAnswer}\n`;
         if (!questionData.isUserCorrect && questionData.userAnswer) {
             prompt += `**User's Incorrect Answer:** ${questionData.userAnswer}\n\n`;
             prompt += `Please explain step-by-step:\n1. Why the correct answer (${questionData.correctAnswer}) is right.\n2. Why the user's answer (${questionData.userAnswer}) is wrong.\n`;
         } else {
             prompt += `\nPlease explain step-by-step why ${questionData.correctAnswer} is the correct answer.\n`;
         }
         prompt += `\nKeep the explanation focused on the physics and mathematics concepts involved. Format the explanation using basic Markdown (like **bold** for emphasis). You can include simple inline LaTeX like $E=mc^2$ or display math like $$ \\sum F = ma $$ if relevant. Do NOT use Markdown headings (#, ##, ###).`;
         showLoading("Generating AI Explanation...");
         const explanationText = await callGeminiTextAPI(prompt); // Single call, no history
         hideLoading();
         return formatResponseAsHtml(explanationText);
     } catch (error) {
         console.error("Error in getAIExplanation:", error); hideLoading();
         return `<p class="text-danger">Error generating explanation: ${error.message}</p>`;
     }
}
/**
 * Explains a snippet of text, potentially using conversation history.
 * @param {string} snippetOrQuestion - The text snippet or follow-up question.
 * @param {string | null} context - Optional broader context (e.g., full transcription).
 * @param {Array} history - The conversation history array.
 * @returns {Promise<{explanationHtml: string, history: Array}>} - HTML formatted explanation and updated history.
 */
export async function explainStudyMaterialSnippet(snippetOrQuestion, context, history) {
    console.log(`Requesting explanation for snippet/question: "${snippetOrQuestion.substring(0, 50)}..." with context length: ${context?.length || 0}, history length: ${history.length}`);
    if (!snippetOrQuestion) return { explanationHtml: `<p class="text-warning">No text provided.</p>`, history: history };

    let currentPromptText = '';

    if (history.length > 0) {
        // Follow-up question
        currentPromptText = snippetOrQuestion;
    } else {
        // Initial request
        const isLikelyQuestion = snippetOrQuestion.length < 200;
        // Check if context itself might be too long for initial prompt (not just history)
        if (!await tokenLimitCheck(context)) {
            return { explanationHtml: `<p class="text-danger">Error: The provided context material is too large for the AI model to process.</p>`, history: history };
        }

        if (isLikelyQuestion && context?.length > 500) {
             currentPromptText = `You are a helpful physics and mathematics tutor. Based *only* on the following text extracted from study material, please answer the user's question clearly and concisely:\n\nUser Question: "${snippetOrQuestion}"\n\nStudy Material Text (Use ONLY this):\n---\n${context}\n---\nEnd Context.\n\nAnswer based *only* on the provided text. Use basic Markdown/LaTeX ($$, $). If the context doesn't contain the answer, state that explicitly. No headings (#).`;
        } else {
             currentPromptText = `You are a helpful physics and mathematics tutor. Explain the following text snippet clearly:\n\nSnippet: "${snippetOrQuestion}"\n\nContext: "${context || 'None provided.'}"\n\nProvide an explanation suitable for someone studying this topic. Use basic Markdown/LaTeX ($$, $). No headings (#).`;
        }
    }

    // Construct history for API call
    const currentHistory = [...history, { role: "user", parts: [{ text: currentPromptText }] }];

    try {
        // showLoading handled by caller
        const explanationText = await callGeminiTextAPI(null, currentHistory); // Use history
        const updatedHistory = [...currentHistory, { role: "model", parts: [{ text: explanationText }] }];
        return {
            explanationHtml: formatResponseAsHtml(explanationText),
            history: updatedHistory
        };
    } catch (error) {
        console.error("Error explaining snippet:", error);
         return {
             explanationHtml: `<p class="text-danger">Error: ${error.message}</p>`,
             history: currentHistory // Return history up to the error
         };
    }
}


// NEW: Ask AI about the whole PDF document
/**
 * Asks the AI a question about the entire text content of a PDF document.
 * @param {string} userQuestion - The user's question about the PDF.
 * @param {string} pdfPath - The path to the PDF file.
 * @param {string} courseId - Course ID for context.
 * @param {number} chapterNum - Chapter number for context.
 * @returns {Promise<{explanationHtml: string, history: Array}>} - Object containing the formatted HTML response and the initial conversation history.
 */
export async function askAboutPdfDocument(userQuestion, pdfPath, courseId, chapterNum) {
     console.log(`Asking about whole PDF: ${pdfPath} (Ch ${chapterNum})`);
     if (!userQuestion) return { explanationHtml: `<p class="text-warning">Please enter a question about the PDF.</p>`, history: [] };
     if (!pdfPath) return { explanationHtml: `<p class="text-danger">No PDF path available for this chapter.</p>`, history: [] };

     showLoading("Extracting PDF text for AI...");
     const fullPdfText = await getAllPdfTextForAI(pdfPath); // Use helper
     if (!fullPdfText) {
         hideLoading();
         return { explanationHtml: `<p class="text-danger">Failed to extract text from the PDF document. It might be image-based or corrupted.</p>`, history: [] };
     }
     console.log(`Extracted ${fullPdfText.length} characters from PDF.`);
     hideLoading(); // Hide loading after text extraction

     // Check token limit for the extracted PDF text
     if (!await tokenLimitCheck(fullPdfText)) {
         return { explanationHtml: `<p class="text-danger">Error: The PDF content is too large for the AI model to process.</p>`, history: [] };
     }

     const prompt = `You are a helpful physics and mathematics tutor. Based *only* on the following text extracted from the Chapter ${chapterNum} PDF document, please answer the user's question clearly and concisely:\n\nUser Question: "${userQuestion}"\n\nChapter ${chapterNum} PDF Text (Use ONLY this):\n---\n${fullPdfText}\n---\nEnd PDF Text.\n\nAnswer based *only* on the provided PDF text. Use basic Markdown/LaTeX ($$, $). If the context doesn't contain the answer, state that explicitly. No headings (#).`;

     // Construct initial history
     const initialHistory = [{ role: "user", parts: [{ text: prompt }] }];

     try {
         showLoading("Asking AI about PDF...");
         // Use the history-enabled API call
         const explanationText = await callGeminiTextAPI(null, initialHistory);
         const finalHistory = [...initialHistory, { role: "model", parts: [{ text: explanationText }] }];
         hideLoading();
         return {
             explanationHtml: formatResponseAsHtml(explanationText),
             history: finalHistory
         };
     } catch (error) {
         console.error("Error asking about PDF:", error); hideLoading();
         return {
             explanationHtml: `<p class="text-danger">Error processing request: ${error.message}</p>`,
             history: initialHistory // Return history up to the error
         };
     }
}


/**
 * Gets an explanation for a snapshot image of a PDF page.
 * MODIFIED: Added history handling.
 * @param {string} userQuestion - The user's question.
 * @param {string} base64ImageData - The Base64 encoded image data.
 * @param {string} context - Context string (e.g., chapter/page number).
 * @param {Array} history - Conversation history array.
 * @returns {Promise<{explanationHtml: string, history: Array}>} - HTML formatted explanation and updated history.
 */
export async function getExplanationForPdfSnapshot(userQuestion, base64ImageData, context, history = []) {
    console.log(`Requesting AI explanation for PDF snapshot (Context: ${context}), History Length: ${history.length}`);
    if (!userQuestion) return { explanationHtml: `<p class="text-warning">No question provided.</p>`, history: history };
    if (!base64ImageData && history.length === 0) return { explanationHtml: `<p class="text-warning">No image data provided for initial query.</p>`, history: history }; // Only require image on first turn

    let currentPromptParts = [];
    let updatedHistory = [...history]; // Copy history

    if (history.length === 0) {
        // Initial request with image
        currentPromptParts = [
            { text: `You are a helpful physics and mathematics tutor. Explain the content shown in this image of a PDF page, specifically addressing the following question. Context: ${context}. Question: "${userQuestion}". Focus explanation on visible content. Use basic Markdown/LaTeX ($$, $). No headings (#).` },
            { inlineData: { mimeType: "image/jpeg", data: base64ImageData } }
        ];
        updatedHistory.push({ role: "user", parts: currentPromptParts });
    } else {
        // Follow-up request (text only)
        // Vision models currently don't support text-only follow-ups well without resending image or using text model.
        // Let's try sending just the text follow-up as a new turn.
        currentPromptParts = [{ text: userQuestion }];
        updatedHistory.push({ role: "user", parts: currentPromptParts });
        console.warn("Vision follow-up: Sending text only. Context from previous image might be limited for the AI.");
    }

    try {
        // Call Vision API using the full constructed history
        // NOTE: Ensure callGeminiVisionAPI can actually handle a history object if needed,
        // or adapt the API call to send the appropriate parts based on the model's requirements.
        // For now, assume generateContent handles the history format.
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: VISION_MODEL_NAME });
        const safetySettings = [ /* ... safety settings ... */ ];
        const generationConfig = { /* ... generation config ... */ };

        const result = await model.generateContent({ contents: updatedHistory, safetySettings, generationConfig });
        const response = result.response;

        if (response.promptFeedback?.blockReason) { throw new Error(`AI request blocked: ${response.promptFeedback.blockReason}`); }
        if (!response.candidates?.length) { throw new Error("AI response was empty."); }
        // ... other response checks ...
        const explanationText = response.candidates[0].content.parts[0].text;

        // Add AI response to history
        updatedHistory.push({ role: "model", parts: [{ text: explanationText }] });

        return {
            explanationHtml: formatResponseAsHtml(explanationText),
            history: updatedHistory
        };
    } catch (error) {
        console.error("Error explaining PDF snapshot:", error);
        return {
             explanationHtml: `<p class="text-danger">Error: ${error.message}</p>`,
             history: updatedHistory // Return history up to the failed API call
         };
    }
}


export async function generateFormulaSheet(courseId, chapterNum) {
     console.log(`Generating formula sheet for Course ${courseId}, Chapter ${chapterNum}`);
     showLoading(`Gathering content for Ch ${chapterNum} Formula Sheet...`);
     const courseDef = globalCourseDataMap.get(courseId); if (!courseDef) { hideLoading(); return `<p class="text-danger">Course definition not found.</p>`; }
     const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
     const pdfPath = chapterResources.pdfPath || courseDef.pdfPathPattern?.replace('{num}', chapterNum);
     const lectureUrls = (chapterResources.lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title);

     let transcriptionText = null; let fullPdfText = null; let contentSourceInfo = "";

     // Fetch Transcription(s) - Combine all for the chapter
     if (lectureUrls.length > 0) {
         let combinedTranscription = "";
         for (const lec of lectureUrls) {
             const srtFilename = getSrtFilenameFromTitle(lec.title); // Use imported function
             if (srtFilename) {
                 const transPath = `${COURSE_TRANSCRIPTION_BASE_PATH}${srtFilename}`;
                 const text = await fetchSrtText(transPath); // Fetches only text content
                 if (text) combinedTranscription += text + "\n\n";
             }
         }
         if (combinedTranscription) {
             transcriptionText = combinedTranscription.trim();
             console.log(`Combined transcription fetched (Length: ${transcriptionText.length})`); contentSourceInfo += "Lecture Transcriptions; ";
         } else { console.warn(`No valid transcriptions found/parsed for Ch ${chapterNum}`); }
     } else { console.log("No assigned lecture videos for transcription."); }

     // Extract PDF Text
     if (pdfPath) {
         console.log("Extracting PDF text..."); fullPdfText = await getAllPdfTextForAI(pdfPath);
         if (fullPdfText) { console.log(`PDF text extracted (Length: ${fullPdfText.length})`); contentSourceInfo += "Chapter PDF Text; "; }
         else { console.warn(`PDF text extraction failed for Ch ${chapterNum}`); }
     } else { console.log("No PDF path configured."); }

     if (contentSourceInfo) contentSourceInfo = contentSourceInfo.slice(0, -2); else contentSourceInfo = "No text sources found";
     if (!transcriptionText && !fullPdfText) { hideLoading(); return `<p class="text-warning">No text content available for Ch ${chapterNum}.</p>`; }

     let combinedContent = `Content for Chapter ${chapterNum} (Sources: ${contentSourceInfo}):\n\n`;
     if (transcriptionText) combinedContent += `== Lecture Transcriptions ==\n${transcriptionText}\n\n`;
     if (fullPdfText) combinedContent += `== Chapter PDF Text ==\n${fullPdfText}\n\n`;
     combinedContent += `== End of Content ==`;

     // MODIFIED: Check limit against combined content
     if (!await tokenLimitCheck(combinedContent)) {
         hideLoading();
         return `<p class="text-danger">Error: The combined chapter material (PDF + Transcriptions) is too large for the AI model to process.</p>`;
     }

     const prompt = `You are an expert physics and mathematics assistant. Based ONLY on the following combined text content (from ${contentSourceInfo}) for Chapter ${chapterNum}, extract ALL key formulas, equations, physical laws, and important definitions. Present them clearly and concisely as a comprehensive formula sheet. Use basic Markdown (bold, lists) and LaTeX ($...$ or $$...$$). Do NOT include explanations, derivations, or examples. Focus strictly on presenting the formulas and definitions. Organize logically if possible.

Combined Text Content for Chapter ${chapterNum}:
---
${combinedContent}
---
End of Combined Text Content.

Generate the comprehensive formula sheet now for Chapter ${chapterNum}:`;

     try {
         showLoading(`Generating Formula Sheet (Ch ${chapterNum})...`);
         const formulaSheetText = await callGeminiTextAPI(prompt); // Single call
         hideLoading();
         return formatResponseAsHtml(formulaSheetText);
     } catch (error) {
         console.error(`Error generating formula sheet for Ch ${chapterNum}:`, error); hideLoading();
         return `<p class="text-danger">Error: ${error.message}</p>`; // Display the error message (e.g., context limit)
     }
}

export async function generateChapterSummary(courseId, chapterNum) {
    console.log(`Generating summary for Course ${courseId}, Chapter ${chapterNum}`);
    showLoading(`Gathering content for Ch ${chapterNum} Summary...`);
    const courseDef = globalCourseDataMap.get(courseId); if (!courseDef) { hideLoading(); return `<p class="text-danger">Course definition not found.</p>`; }
    const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
    const pdfPath = chapterResources.pdfPath || courseDef.pdfPathPattern?.replace('{num}', chapterNum);
    const lectureUrls = (chapterResources.lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title);

    let transcriptionText = null; let fullPdfText = null; let contentSourceInfo = "";

    // Fetch Transcription(s) - Combine all for the chapter
    if (lectureUrls.length > 0) {
        let combinedTranscription = "";
        for (const lec of lectureUrls) {
            const srtFilename = getSrtFilenameFromTitle(lec.title); // Use imported function
            if (srtFilename) {
                const transPath = `${COURSE_TRANSCRIPTION_BASE_PATH}${srtFilename}`;
                const text = await fetchSrtText(transPath); // Fetches only text content
                if (text) combinedTranscription += text + "\n\n";
            }
        }
        if (combinedTranscription) {
            transcriptionText = combinedTranscription.trim();
            console.log(`Combined transcription fetched (Length: ${transcriptionText.length})`); contentSourceInfo += "Lecture Transcriptions; ";
        } else { console.warn(`No valid transcriptions found/parsed for Ch ${chapterNum}`); }
    } else { console.log("No assigned lecture videos for transcription."); }

    // Extract PDF Text
    if (pdfPath) {
        console.log("Extracting PDF text..."); fullPdfText = await getAllPdfTextForAI(pdfPath);
        if (fullPdfText) { console.log(`PDF text extracted (Length: ${fullPdfText.length})`); contentSourceInfo += "Chapter PDF Text; "; }
        else { console.warn(`PDF text extraction failed for Ch ${chapterNum}`); }
    } else { console.log("No PDF path configured."); }

    if (contentSourceInfo) contentSourceInfo = contentSourceInfo.slice(0, -2); else contentSourceInfo = "No text sources found";
    if (!transcriptionText && !fullPdfText) { hideLoading(); return `<p class="text-warning">No text content available for Ch ${chapterNum}.</p>`; }

    let combinedContent = `Content for Chapter ${chapterNum} (Sources: ${contentSourceInfo}):\n\n`;
    if (transcriptionText) combinedContent += `== Lecture Transcriptions ==\n${transcriptionText}\n\n`;
    if (fullPdfText) combinedContent += `== Chapter PDF Text ==\n${fullPdfText}\n\n`;
    combinedContent += `== End of Content ==`;

    // MODIFIED: Check token limit
    if (!await tokenLimitCheck(combinedContent)) {
         hideLoading();
         return `<p class="text-danger">Error: The combined chapter material (PDF + Transcriptions) is too large for the AI model to process.</p>`;
    }

    const prompt = `You are an expert physics and mathematics assistant. Based ONLY on the following combined text content (from ${contentSourceInfo}) for Chapter ${chapterNum}, write a clear, concise, and comprehensive summary of the chapter. Focus on the main concepts, key ideas, and important points. Use clear language suitable for a student review. Organize the summary logically, using bullet points or short paragraphs as appropriate. You may include simple LaTeX math ($...$ or $$...$$) for equations, but do NOT include a formula sheet or list all formulas. Do NOT copy large blocks of text verbatim. Do NOT include quiz questions or exam content.\n\nCombined Text Content for Chapter ${chapterNum}:\n---\n${combinedContent}\n---\nEnd of Combined Text Content.\n\nGenerate the summary now for Chapter ${chapterNum}:`;

    try {
        showLoading(`Generating Summary (Ch ${chapterNum})...`);
        const summaryText = await callGeminiTextAPI(prompt); // Single call
        hideLoading();
        return formatResponseAsHtml(summaryText);
    } catch (error) {
        console.error(`Error generating summary for Ch ${chapterNum}:`, error); hideLoading();
        return `<p class="text-danger">Error: ${error.message}</p>`; // Display the error message (e.g., context limit)
    }
}

// --- Skip Exam Generation ---
export async function generateSkipExam(courseId, chapterNum) {
     // **DEPRECATED / MODIFIED** - This function now primarily focuses on generating MCQs.
     // Problem combination will happen in ui_course_study_material.js before launching the test.
     console.log(`Generating Skip Exam MCQs for Chapter ${chapterNum}`);
     showLoading(`Gathering content for Ch ${chapterNum} Skip Exam...`);

     const courseDef = globalCourseDataMap.get(courseId); if (!courseDef) { hideLoading(); throw new Error("Course definition not found."); }
     const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
     const pdfPath = chapterResources.pdfPath || courseDef.pdfPathPattern?.replace('{num}', chapterNum);
     const lectureUrls = (chapterResources.lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title);

     let transcriptionText = null; let fullPdfText = null; let contentSourceInfo = "";

     // Fetch Transcription(s)
     if (lectureUrls.length > 0) {
         let combinedTranscription = "";
         for (const lec of lectureUrls) {
             const srtFilename = getSrtFilenameFromTitle(lec.title); // Use imported function
             if (srtFilename) {
                 const transPath = `${COURSE_TRANSCRIPTION_BASE_PATH}${srtFilename}`;
                 const text = await fetchSrtText(transPath);
                 if (text) combinedTranscription += text + "\n\n";
             }
         }
         if (combinedTranscription) {
             transcriptionText = combinedTranscription.trim();
             contentSourceInfo += "Lecture Transcriptions; ";
         }
     }

     // Extract PDF Text
     if (pdfPath) {
         fullPdfText = await getAllPdfTextForAI(pdfPath);
         if (fullPdfText) contentSourceInfo += "Chapter PDF Text; ";
     }

     if (contentSourceInfo) contentSourceInfo = contentSourceInfo.slice(0, -2); else contentSourceInfo = "No text sources found";
     if (!transcriptionText && !fullPdfText) { hideLoading(); throw new Error(`No study material text found for Chapter ${chapterNum}.`); }

     let combinedContent = `Content for Chapter ${chapterNum} (Sources: ${contentSourceInfo}):\n\n`;
     if (transcriptionText) combinedContent += `== Lecture Transcriptions ==\n${transcriptionText}\n\n`;
     if (fullPdfText) combinedContent += `== Chapter PDF Text ==\n${fullPdfText}\n\n`;
     combinedContent += `== End of Content ==`;

    // MODIFIED: Check token limit for combined content
    if (!await tokenLimitCheck(combinedContent)) {
        hideLoading();
        throw new Error("Error: The combined chapter material (PDF + Transcriptions) is too large for the AI model to process.");
    }


     try {
         const requestedMCQs = 20; // *** MODIFIED: Generate 20 MCQs for skip exams ***
         // *** MODIFIED: Enhanced Prompt for Skip Exam MCQ Generation ***
         const prompt = `You are a physics and mathematics assessment expert creating a challenging multiple-choice quiz for Chapter ${chapterNum}. Base the questions *strictly* on the provided study material text below.

Generate exactly ${requestedMCQs} multiple-choice questions covering key concepts, definitions, formulas, and problem-solving scenarios from the text ONLY. Ensure questions require understanding and application, not just rote recall.

**Formatting Requirements (Strict):**
For EACH of the ${requestedMCQs} questions, provide the output in this exact format:

1.  [Question Text - Can be multi-line]
    A. [Option A Text]
    B. [Option B Text]
    C. [Option C Text]
    D. [Option D Text]
    E. [Option E Text]
ans: [Correct Letter (A, B, C, D, or E)]

**IMPORTANT Instructions:**
- Question numbers must be sequential (1., 2., 3., ... ${requestedMCQs}.).
- Each question MUST have exactly 5 options, labeled A, B, C, D, E.
- Each option MUST start on a new line.
- The correct answer MUST be on a separate line immediately following the options, using the format "ans: [Letter]". NO other text should be on the answer line.
- Ensure only ONE option is definitively correct based *only* on the provided text. Avoid ambiguity.
- Adhere strictly to the provided text content. Do not introduce external knowledge.
- Do not include explanations or any text other than the questions, options, and answers in the specified format.
- Use LaTeX for math ONLY within the question or option text itself (e.g., $E=mc^2$ or $$...$$), NOT for the option letters or answer line.

**Study Material Text for Chapter ${chapterNum}:**
---
${combinedContent}
---
**End of Study Material Text.**

Generate the ${requestedMCQs} quiz questions now in the specified format:`;


         showLoading(`Generating Skip Exam MCQs (Ch ${chapterNum})...`);
         const examText = await callGeminiTextAPI(prompt);
         hideLoading();
         // *** ADDED: Log the raw AI output for debugging ***
         console.log(`--- Raw AI Output for Skip Exam Ch ${chapterNum} ---`);
         console.log(examText);
         console.log(`-------------------------------------------------`);


         // Basic validation check (using a slightly more flexible regex)
         // Allows for optional space after 'ans:' and case-insensitivity for letter
         const validationRegex = /^\s*\d+[\.\)]\s+.*\n([\s\S]*?)^ans:\s*([A-Ea-e])\s*$/gm;
         const questionBlocksFound = (examText.match(validationRegex) || []).length;
         console.log(`Validation: Found ${questionBlocksFound} potential MCQ blocks based on regex.`);
         if (questionBlocksFound < requestedMCQs * 0.7) { // Check against new count (e.g., need at least 14/20)
             console.error(`Generated content validation failed. Found only ${questionBlocksFound}/${requestedMCQs} expected MCQ blocks.`);
             throw new Error("Generated content does not appear to contain enough valid MCQs. Check AI output or try again.");
         }

         return examText; // Return the raw text containing ONLY MCQs

     } catch (error) {
         console.error(`Error generating skip exam MCQs for Chapter ${chapterNum}:`, error); hideLoading();
         throw error; // Re-throw the error to be caught by the caller
     }
}

// --- NEW: AI Functions for Notes ---

/**
 * Asks the AI to review a student's notes against the chapter content.
 */
export async function reviewNoteWithAI(noteContent, courseId, chapterNum) {
    console.log(`Requesting AI review for note (length: ${noteContent.length}) for Course ${courseId}, Chapter ${chapterNum}`);
    showLoading(`Gathering content for Ch ${chapterNum} Note Review...`);

    const courseDef = globalCourseDataMap.get(courseId); 
    if (!courseDef) { 
        hideLoading(); 
        return `<p class="text-danger">Course definition not found.</p>`; 
    }

    const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
    const pdfPath = chapterResources.pdfPath || courseDef.pdfPathPattern?.replace('{num}', chapterNum);
    const lectureUrls = (chapterResources.lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title);

    let transcriptionText = null; 
    let fullPdfText = null;

    // Fetch Transcription(s)
    if (lectureUrls.length > 0) {
        let combinedTranscription = "";
        for (const lec of lectureUrls) {
            const srtFilename = getSrtFilenameFromTitle(lec.title);
            if (srtFilename) {
                const transPath = `${COURSE_TRANSCRIPTION_BASE_PATH}${srtFilename}`;
                const text = await fetchSrtText(transPath);
                if (text) combinedTranscription += text + "\n\n";
            }
        }
        if (combinedTranscription) {
            transcriptionText = combinedTranscription.trim();
        }
    }

    // Extract PDF Text
    if (pdfPath) {
        fullPdfText = await getAllPdfTextForAI(pdfPath);
    }

    if (!transcriptionText && !fullPdfText) {
        hideLoading();
        return `<p class="text-warning">No source study material found for Chapter ${chapterNum} to compare notes against.</p>`;
    }

    let combinedSourceContent = `Source Study Material for Chapter ${chapterNum}:\n\n`;
    if (transcriptionText) combinedSourceContent += `== Lecture Transcriptions ==\n${transcriptionText}\n\n`;
    if (fullPdfText) combinedSourceContent += `== Chapter PDF Text ==\n${fullPdfText}\n\n`;
    combinedSourceContent += `== End of Source Material ==`;

     // Check combined limit (source + note)
    if (!await tokenLimitCheck(combinedSourceContent + noteContent)) {
        hideLoading();
        return `<p class="text-danger">Error: The combined chapter material and your note are too large for the AI model to process.</p>`;
    }

    const prompt = `You are an expert physics and mathematics tutor. Review the following student's note for Chapter ${chapterNum}, comparing it against the provided source study material.

**Student's Note:**
---
${noteContent}
---

**Source Study Material:**
---
${combinedSourceContent}
---

Provide a review including:
1.  **Rating (1-10):** How well does the note capture the key concepts from the source material? (10 = perfect coverage, >10 if valuable external info included, <10 if concepts missed).
2.  **Strengths:** What does the note cover well?
3.  **Weaknesses/Missed Concepts:** What key ideas or formulas from the source material are missing or unclear in the note?
4.  **Suggestions for Improvement:** Specific advice on how to reach a '10' rating by incorporating missing elements or clarifying existing points.
5.  **Accuracy Check:** Point out any factual inaccuracies found in the student's note compared to the source material.

Format the response clearly using Markdown (bold, lists). Use LaTeX ($$, $) for math. Provide the rating FIRST, e.g., "**Rating: 8/10**".`;

    try {
        showLoading(`AI Reviewing Note (Ch ${chapterNum})...`);
        const reviewText = await callGeminiTextAPI(prompt);
        hideLoading();
        return formatResponseAsHtml(reviewText);
    } catch (error) {
        console.error(`Error reviewing note for Ch ${chapterNum}:`, error); 
        hideLoading();
        return `<p class="text-danger">Error generating note review: ${error.message}</p>`;
    }
}


/**
 * Asks the AI to convert provided text (potentially including LaTeX) into well-formatted LaTeX.
 */
export async function convertNoteToLatex(noteContent) {
    console.log(`Requesting LaTeX conversion for note content (length: ${noteContent?.length || 0})`); // Added safety check for length
    // MODIFIED: Added check for empty/null content
    if (!noteContent || noteContent.trim() === '') {
        console.warn("convertNoteToLatex: Input note content is empty.");
        return ''; // Return empty string if no content
    }
     // Check token limit
     if (!await tokenLimitCheck(noteContent)) {
         throw new Error("Note content is too long for the AI model to process.");
     }

    const prompt = `You are a LaTeX expert. Convert the following text content into a well-formatted LaTeX document body. Ensure mathematical expressions are correctly preserved or converted to LaTeX math environments (e.g., $...$, $$...$$, \\begin{equation}...\\end{equation}). Use standard LaTeX commands for formatting (e.g., \\section{}, \\subsection{}, \\textbf{}, \\textit{}, \\begin{itemize}...\\end{itemize}, \\begin{enumerate}...\\end{enumerate}). Assume standard packages like amsmath, amssymb, graphicx are loaded. Return ONLY the LaTeX code for the document body, do not include \\documentclass, \\usepackage, \\begin{document}, or \\end{document}.

**Original Text:**
---
${noteContent}
---

Convert the above text to LaTeX body code:`;

    try {
        showLoading("Converting to LaTeX...");
        const latexCode = await callGeminiTextAPI(prompt);
        hideLoading();
        // Basic cleanup - remove potential preamble/postamble if AI includes it
        let cleanedCode = latexCode.replace(/\\documentclass\[.*?\]{.*?}\s*/gs, '');
        cleanedCode = cleanedCode.replace(/\\usepackage{.*?}\s*/gs, '');
        cleanedCode = cleanedCode.replace(/\\begin{document}\s*/gs, '');
        cleanedCode = cleanedCode.replace(/\\end{document}\s*/gs, '');
        cleanedCode = cleanedCode.replace(/```latex\n?([\s\S]*?)\n?```/gs, '$1'); // Remove markdown code fences
        cleanedCode = cleanedCode.trim();
        return cleanedCode;
    } catch (error) {
        console.error("Error converting note to LaTeX:", error); hideLoading();
        throw new Error(`Failed to convert to LaTeX: ${error.message}`); // Propagate error
    }
}

// --- NEW: Function to improve note ---
/**
 * Asks the AI to improve a note by adding clarity, structure, and relevant equations *without deleting* existing content.
 * @param {string} noteContent - The original note content.
 * @returns {Promise<string>} - The improved note content including original + additions.
 */
export async function improveNoteWithAI(noteContent) {
     console.log(`Requesting AI improvement for note (length: ${noteContent?.length || 0})`);
     if (!noteContent || noteContent.trim() === '') {
         console.warn("improveNoteWithAI: Input note content is empty.");
         return noteContent; // Return original empty content
     }
     // Check token limit
      if (!await tokenLimitCheck(noteContent)) {
          throw new Error("Note content is too long for the AI model to process.");
      }

     // MODIFIED: Updated prompt to emphasize adding, not replacing.
     const prompt = `You are an expert physics and mathematics assistant. Review the following student's note and enhance it by adding clarity, improving structure, and incorporating any relevant key equations or formulas that might be missing based on the context. **Crucially, DO NOT remove or significantly alter the student's original content.** Append your suggestions, clarifications, or additions clearly below the original text, perhaps under a heading like "--- AI SUGGESTIONS ---". Format your response using basic Markdown and LaTeX ($$, $).

**Student's Original Note (DO NOT DELETE THIS PART):**
---
${noteContent}
---

**Enhancements (Additions/Clarifications ONLY):**
[Your suggested improvements, explanations, and relevant equations go here.]`;

     try {
         showLoading("AI Improving Note...");
         const improvedContent = await callGeminiTextAPI(prompt);
         hideLoading();
         // Return the full response which should ideally contain the original + additions
         return improvedContent;
     } catch (error) {
         console.error("Error improving note:", error); hideLoading();
         throw new Error(`Failed to improve note: ${error.message}`); // Propagate error
     }
}

/**
 * Uses AI Vision to extract text/math from an image and convert it to LaTeX.
 * @param {string} base64ImageData - Base64 encoded image data (without the 'data:image/...' prefix).
 * @returns {Promise<string>} - The generated LaTeX content, or an empty string if failed.
 */
export async function extractTextFromImageAndConvertToLatex(base64ImageData) {
     console.log("Requesting image OCR and LaTeX conversion...");
     if (!base64ImageData) {
          console.error("No image data provided for OCR.");
          return "";
     }

     const promptParts = [
          { text: "You are an expert OCR tool specializing in scientific documents. Analyze the following image, extract all text and mathematical equations accurately, and then convert the entire extracted content into well-formatted LaTeX. Preserve the structure and mathematical notation. Return ONLY the raw LaTeX code." },
          { inlineData: { mimeType: "image/jpeg", data: base64ImageData } } // Assuming JPEG, adjust if needed
     ];

     try {
          showLoading("AI Analyzing Image for LaTeX...");
          const latexResult = await callGeminiVisionAPI(promptParts);
          hideLoading();
          // Basic cleanup for LaTeX output
          let cleanedLatex = latexResult.replace(/```latex\n?([\s\S]*?)\n?```/gs, '$1').trim();
          console.log("Image OCR to LaTeX successful.");
          return cleanedLatex;
     } catch (error) {
          hideLoading();
          console.error("Error during image OCR/LaTeX conversion:", error);
          throw new Error(`Failed image processing: ${error.message}`); // Propagate error
     }
}


// --- END OF FILE ai_integration.js ---