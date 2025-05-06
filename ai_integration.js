// --- START OF FILE ai_integration.js ---

// ai_integration.js

// *** MODIFIED: Import new path constants ***
import { GEMINI_API_KEY, PDF_WORKER_SRC, COURSE_BASE_PATH, DEFAULT_COURSE_PDF_FOLDER, DEFAULT_COURSE_TRANSCRIPTION_FOLDER } from './config.js'; // Import the API key & Path Config
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Import UI helpers & escapeHtml
import { globalCourseDataMap, currentUser } from './state.js'; // Need course data map and current user for feedback
// *** NEW: Import submitFeedback for error reporting ***
import { submitFeedback } from './firebase_firestore.js';
// *** NEW: Import getSrtFilenameFromTitle from filename_utils.js ***
import { getSrtFilenameFromTitle } from './filename_utils.js'; // Import SRT filename helper

// Dynamically get the SDK object if it loaded successfully
let GoogleGenerativeAI;
try {
    const genAIModule = await import('https://unpkg.com/@google/generative-ai?module');
    GoogleGenerativeAI = genAIModule.GoogleGenerativeAI;
} catch (e) {
    console.error("Google AI SDK class not found. AI Features disabled.", e);
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
const TEXT_MODEL_NAME = "gemini-2.5-pro-exp-03-25";
const VISION_MODEL_NAME = "gemini-2.5-pro-exp-03-25";


// --- Helper: Fetch Text File (SRT Parser) ---
async function fetchSrtText(url) {
    // Fetches SRT and returns only the text lines concatenated
    if (!url) return null; // Handle null URL
    try {
        const fetchUrl = `${url}?t=${new Date().getTime()}`; // Add cache bust
        const response = await fetch(fetchUrl); // Use potentially encoded URL directly
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
        const extractedText = textLines.join(' '); // Join lines with space
        // console.log(`fetchSrtText: Extracted text from SRT: ${url}`);
        return extractedText;
    } catch (error) {
        console.error(`Error fetching/parsing SRT file (${url}):`, error);
        return null;
    }
}

// --- Helper: Extract Text from ALL pages of a PDF ---
// Make this globally available for study material UI too
export async function getAllPdfTextForAI(pdfDataOrPath) {
   // ... (getAllPdfTextForAI implementation remains the same) ...
    if (typeof pdfjsLib === 'undefined') {
        console.error("PDF.js library is not loaded. Cannot extract text from PDF.");
        if (window.pdfjsLib) { pdfjsLib = window.pdfjsLib; console.log("Accessed PDF.js from window scope."); }
        else { alert("PDF processing library (PDF.js) is not available."); return null; }
    }
     if (!pdfDataOrPath) return null;

    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
    let pdfText = "";
    const sourceDescription = typeof pdfDataOrPath === 'string' ? pdfDataOrPath : `Uint8Array (length: ${pdfDataOrPath.length})`;
    console.log(`Attempting to extract text from all pages of PDF source: ${sourceDescription}`);
    try {
        // Use encodeURI for paths with spaces/etc. Handles string paths.
        const loadingTaskInput = typeof pdfDataOrPath === 'string'
            ? (pdfDataOrPath.includes('%') ? pdfDataOrPath : encodeURI(pdfDataOrPath))
            : pdfDataOrPath;
        console.log("Calling pdfjsLib.getDocument with input:", typeof loadingTaskInput === 'string' ? loadingTaskInput : '[Uint8Array]');
        const loadingTask = pdfjsLib.getDocument(loadingTaskInput); // Accepts URL string or Uint8Array

        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;
        console.log(`Extracting text from ${numPages} pages...`);
        const pagesToProcess = numPages;

        for (let i = 1; i <= pagesToProcess; i++) {
            try {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ').replace(/-\s+/g, '').replace(/\s+/g, ' ').trim();
                if (pageText) {
                     pdfText += pageText + "\n\n";
                }
            } catch (pageError) { console.warn(`Error extracting text from page ${i} of ${sourceDescription}:`, pageError); }
        }
        console.log(`Finished text extraction. Total length: ${pdfText.length}`);
        if (pdfText.length < numPages * 50 && numPages > 0) {
            console.warn("PDF text content seems very short. It might be image-based or scanned without OCR.");
        }
        return pdfText.trim();
    } catch (error) {
        console.error(`Error extracting text from PDF ${sourceDescription}:`, error);
         if (error.name === 'InvalidPDFException') {
            alert(`Error: The PDF file at "${sourceDescription}" seems to be invalid or corrupted.`);
        } else if (error.name === 'MissingPDFException') {
            alert(`Error: The PDF file could not be found at "${sourceDescription}". Please check the path.`);
        } else {
            alert(`Error extracting text from PDF: ${error.message}`);
        }
        return null;
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
export async function tokenLimitCheck(contextText, charLimit = 1800000) {
   // ... (tokenLimitCheck implementation remains the same) ...
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
    // ... (callGeminiTextAPI implementation remains the same) ...
    if (!GoogleGenerativeAI) throw new Error("AI SDK failed to load.");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY") throw new Error("API Key not configured.");

    // Use prompt for token check if history is not provided or empty
    const checkContent = (history && history.length > 0) ? JSON.stringify(history) : prompt;
    if (!await tokenLimitCheck(checkContent)) { // Check combined size roughly
        throw new Error("Prompt/History exceeds token limit. Please reduce the context size.");
    }

    const requestContents = history ? [
        ...history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content || msg.parts?.[0]?.text || '' }] // Handle both history formats
        })),
        // Add the new prompt only if it exists
        ...(prompt ? [{ role: "user", parts: [{ text: prompt }] }] : [])
    ] : [{
        role: "user",
        parts: [{ text: prompt || '' }]
    }];


    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: TEXT_MODEL_NAME });

        const safetySettings = [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ];
        const generationConfig = {
            temperature: 0.6, topK: 40, topP: 0.95, maxOutputTokens: 8192, stopSequences: ["\n\n\n"]
        };

        console.log('Sending request to Gemini API with contents:', JSON.stringify(requestContents, null, 2));

        const result = await model.generateContent({
            contents: requestContents, safetySettings, generationConfig
        });
        const response = result.response;

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
        if (response.candidates[0].finishReason === 'MAX_TOKENS') {
             console.warn("Gemini response truncated due to max tokens.");
        }
         if (!response.candidates[0].content?.parts?.[0]?.text) {
             console.warn("Gemini response content part is missing text:", response.candidates[0].content);
              // Check if the finish reason might explain this (e.g., SAFETY)
             if (response.candidates[0].finishReason && response.candidates[0].finishReason !== 'STOP') {
                 throw new Error(`AI response content missing, finish reason: ${response.candidates[0].finishReason}`);
             } else {
                 // If finish reason is STOP but content is missing, return empty string or throw?
                 // Let's return empty string for now, caller can decide if that's an error.
                 console.warn("AI response finished normally but content text is missing. Returning empty string.");
                 return "";
             }
         }

        return response.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Error in callGeminiTextAPI:", error);
        if (currentUser) {
            submitFeedback({
                subjectId: "AI API Error", questionId: null,
                feedbackText: `Error in callGeminiTextAPI: ${error.message}`,
                context: "System Error - AI API Call"
            }, currentUser).catch(e => console.error("Failed to submit feedback for API error:", e));
        }
        throw error;
    }
}

export async function callGeminiVisionAPI(promptParts) {
    // ... (callGeminiVisionAPI implementation remains the same) ...
     if (!GoogleGenerativeAI) throw new Error("AI SDK failed to load.");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY") throw new Error("API Key not configured.");
    if (!promptParts?.length) throw new Error("Prompt parts cannot be empty.");

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: VISION_MODEL_NAME });
        const logParts = promptParts.map(p => p.inlineData ? `{inlineData: mimeType=${p.inlineData.mimeType}, length=${p.inlineData.data?.length}}` : p);
        console.log(`Sending VISION prompt (${VISION_MODEL_NAME}):`, logParts);
        const safetySettings = [
             { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
             { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
             { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
             { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
         ];
         const generationConfig = {
             temperature: 0.4, topK: 32, topP: 1.0, maxOutputTokens: 4096,
         };

        // Vision API expects history in 'contents' array, like text API now
        const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }], safetySettings, generationConfig });
        const response = result.response;

        if (response.promptFeedback?.blockReason) { throw new Error(`AI request blocked: ${response.promptFeedback.blockReason}`); }
        if (!response.candidates?.length) { throw new Error("AI response was empty."); }
        if (response.candidates[0].finishReason === 'SAFETY') { throw new Error("AI response blocked due to safety settings."); }
        if (response.candidates[0].finishReason === 'MAX_TOKENS') { console.warn("Vision response truncated due to MAX_TOKENS."); }
        if (!response.candidates[0].content?.parts?.[0]?.text) {
             console.warn("Vision response content part is missing text:", response.candidates[0].content);
             if (response.candidates[0].finishReason && response.candidates[0].finishReason !== 'STOP') {
                 throw new Error(`Vision response content missing, finish reason: ${response.candidates[0].finishReason}`);
             } else {
                  console.warn("Vision response finished normally but content text is missing. Returning empty string.");
                  return "";
             }
        }

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
function formatResponseAsHtml(rawText, role = "model") {
   // ... (formatResponseAsHtml implementation remains the same) ...
     if (!rawText) return '<p class="text-muted italic">AI did not provide a response.</p>';
    let escapedText = escapeHtml(rawText);
    escapedText = escapedText.replace(/```(?:[a-zA-Z]+)?\n([\s\S]*?)\n```/g, (m, code) => `<pre><code class="block whitespace-pre-wrap">${escapeHtml(code.trim())}</code></pre>`);
    escapedText = escapedText.replace(/`([^`]+)`/g, '<code>$1</code>');
    escapedText = escapedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escapedText = escapedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    escapedText = escapedText.replace(/^\s*(\d+)\.\s+(.*)/gm, (match, number, item) => `<li>${item.trim()}</li>`);
    escapedText = escapedText.replace(/(<li>.*<\/li>\s*)+/g, (match) => `<ol style="list-style:decimal;margin-left:1.5em;">${match.trim()}</ol>`);
    escapedText = escapedText.replace(/^\s*[\*\-]\s+(.*)/gm, (match, item) => `<li>${item.trim()}</li>`);
    escapedText = escapedText.replace(/(<li>.*<\/li>\s*)+/g, (match) => `<ul style="list-style:disc;margin-left:1.5em;">${match.trim()}</ul`);

    let lines = escapedText.split('\n');
    let inList = false;
    let inPre = false;
    let processedLines = lines.map(line => {
        let trimmedLine = line.trim();
        if (trimmedLine.startsWith('<pre>')) inPre = true;
        if (trimmedLine.startsWith('<ol') || trimmedLine.startsWith('<ul')) inList = true;
        let outputLine = line;
        if (!inPre && !inList && trimmedLine.length > 0 && !trimmedLine.startsWith('<li') && !trimmedLine.endsWith('</li>') && !trimmedLine.startsWith('<h') && !trimmedLine.endsWith('>') && !trimmedLine.startsWith('<ol') && !trimmedLine.startsWith('<ul') && !trimmedLine.endsWith('</ol>') && !trimmedLine.endsWith('</ul>')) {
            outputLine += '<br>';
        }
         outputLine = outputLine.replace(/<br>\s*(<(?:pre|ol|ul))/g, '$1');
         outputLine = outputLine.replace(/(<\/(?:pre|ol|ul)>)\s*<br>/g, '$1');
        if (trimmedLine.endsWith('</pre>')) inPre = false;
        if (trimmedLine.endsWith('</ol>') || trimmedLine.endsWith('</ul>')) inList = false;
        return outputLine;
    });
    let htmlWithBreaks = processedLines.join('\n').replace(/<br>\s*$/g, '');
    return `<div class="prose prose-sm dark:prose-invert max-w-none leading-relaxed">${htmlWithBreaks}</div>`;
}


// --- AI Functions ---
export async function getAIExplanation(questionData) {
    // ... (getAIExplanation implementation remains the same) ...
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
    // ... (explainStudyMaterialSnippet implementation remains the same) ...
     console.log(`Requesting explanation for snippet/question: "${snippetOrQuestion.substring(0, 50)}..." with context length: ${context?.length || 0}, history length: ${history.length}`);
    if (!snippetOrQuestion) return { explanationHtml: `<p class="text-warning">No text provided.</p>`, history: history };

    let currentPromptText = '';
    let updatedHistory = [...history]; // Copy history to modify

    if (history.length > 0) {
        // Follow-up question - add user prompt to history
        currentPromptText = snippetOrQuestion;
        updatedHistory.push({ role: "user", parts: [{ text: currentPromptText }] });
    } else {
        // Initial request
        const isLikelyQuestion = snippetOrQuestion.length < 200;
        if (!await tokenLimitCheck(context)) {
            return { explanationHtml: `<p class="text-danger">Error: The provided context material is too large for the AI model to process.</p>`, history: history };
        }

        if (isLikelyQuestion && context?.length > 500) {
             currentPromptText = `You are a helpful physics and mathematics tutor. Based *only* on the following text extracted from study material, please answer the user's question clearly and concisely:\n\nUser Question: "${snippetOrQuestion}"\n\nStudy Material Text (Use ONLY this):\n---\n${context}\n---\nEnd Context.\n\nAnswer based *only* on the provided text. Use basic Markdown/LaTeX ($$, $). If the context doesn't contain the answer, state that explicitly. No headings (#).`;
        } else {
             currentPromptText = `You are a helpful physics and mathematics tutor. Explain the following text snippet clearly:\n\nSnippet: "${snippetOrQuestion}"\n\nContext: "${context || 'None provided.'}"\n\nProvide an explanation suitable for someone studying this topic. Use basic Markdown/LaTeX ($$, $). No headings (#).`;
        }
        // Add the constructed initial prompt to the history
        updatedHistory.push({ role: "user", parts: [{ text: currentPromptText }] });
    }


    try {
        // Pass the *updated* history to the API. The API call function doesn't need the standalone prompt anymore.
        const explanationText = await callGeminiTextAPI(null, updatedHistory);
        // Add the AI's response to the history
        updatedHistory.push({ role: "model", parts: [{ text: explanationText }] });
        return {
            explanationHtml: formatResponseAsHtml(explanationText),
            history: updatedHistory // Return the full conversation history
        };
    } catch (error) {
        console.error("Error explaining snippet:", error);
         return {
             explanationHtml: `<p class="text-danger">Error: ${error.message}</p>`,
             // Return history *up to* the point of error (includes the user's failed prompt)
             history: updatedHistory.slice(0, -1) // Remove the AI response placeholder if it failed
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
     // ... (askAboutPdfDocument implementation mostly same, ensures path is passed to getAllPdfTextForAI) ...
      console.log(`Asking about whole PDF: ${pdfPath} (Ch ${chapterNum})`);
     if (!userQuestion) return { explanationHtml: `<p class="text-warning">Please enter a question about the PDF.</p>`, history: [] };
     if (!pdfPath) return { explanationHtml: `<p class="text-danger">No PDF path available for this chapter.</p>`, history: [] };

     showLoading("Extracting PDF text for AI...");
     const fullPdfText = await getAllPdfTextForAI(pdfPath); // Use helper with the provided path
     if (!fullPdfText) {
         hideLoading();
         return { explanationHtml: `<p class="text-danger">Failed to extract text from the PDF document. It might be image-based or corrupted.</p>`, history: [] };
     }
     console.log(`Extracted ${fullPdfText.length} characters from PDF.`);
     hideLoading();

     if (!await tokenLimitCheck(fullPdfText)) {
         return { explanationHtml: `<p class="text-danger">Error: The PDF content is too large for the AI model to process.</p>`, history: [] };
     }

     const prompt = `You are a helpful physics and mathematics tutor. Based *only* on the following text extracted from the Chapter ${chapterNum} PDF document, please answer the user's question clearly and concisely:\n\nUser Question: "${userQuestion}"\n\nChapter ${chapterNum} PDF Text (Use ONLY this):\n---\n${fullPdfText}\n---\nEnd PDF Text.\n\nAnswer based *only* on the provided PDF text. Use basic Markdown/LaTeX ($$, $). If the context doesn't contain the answer, state that explicitly. No headings (#).`;

     const initialHistory = [{ role: "user", parts: [{ text: prompt }] }];

     try {
         showLoading("Asking AI about PDF...");
         const explanationText = await callGeminiTextAPI(null, initialHistory); // Use history format
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
             history: initialHistory
         };
     }
}


/**
 * Gets an explanation for a snapshot image of a PDF page. Handles history.
 * Now uses the Vision API which expects slightly different history format.
 * @param {string} userQuestion - The user's question.
 * @param {string | null} base64ImageData - Base64 encoded image data (needed for initial q).
 * @param {string} context - Context string.
 * @param {Array} history - Conversation history array (Gemini format: [{role, parts}]).
 * @returns {Promise<{explanationHtml: string, history: Array}>} - HTML formatted explanation and updated history.
 */
export async function getExplanationForPdfSnapshot(userQuestion, base64ImageData, context, history = []) {
    // ... (getExplanationForPdfSnapshot implementation remains the same, using history) ...
     console.log(`Requesting AI explanation for PDF snapshot (Context: ${context}), History Length: ${history.length}`);
    if (!userQuestion) return { explanationHtml: `<p class="text-warning">No question provided.</p>`, history: history };
    if (!base64ImageData && history.length === 0) return { explanationHtml: `<p class="text-warning">No image data provided for initial query.</p>`, history: history };

    let currentPromptParts = [];
    let updatedHistory = [...history];

    if (history.length === 0) {
        // Initial request with image
        currentPromptParts = [
            { text: `You are a helpful physics and mathematics tutor. Explain the content shown in this image of a PDF page, specifically addressing the following question. Context: ${context}. Question: "${userQuestion}". Focus explanation on visible content. Use basic Markdown/LaTeX ($$, $). No headings (#).` },
            { inlineData: { mimeType: "image/jpeg", data: base64ImageData } }
        ];
        updatedHistory.push({ role: "user", parts: currentPromptParts });
    } else {
        // Follow-up request (text only)
        currentPromptParts = [{ text: userQuestion }];
        updatedHistory.push({ role: "user", parts: currentPromptParts });
        console.warn("Vision follow-up: Sending text only. Context from previous image might be limited for the AI.");
    }

    try {
        // Vision API call - NOTE: Vision API might not support multi-turn context well.
        // We'll send the whole history, but the model might only consider the last turn effectively.
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        // Use the vision model name here
        const model = genAI.getGenerativeModel({ model: VISION_MODEL_NAME });
        const safetySettings = [ /* ... */ ];
        const generationConfig = { /* ... */ };

        // The `generateContent` method accepts the history array directly
        const result = await model.generateContent({ contents: updatedHistory, safetySettings, generationConfig });
        const response = result.response;

        if (response.promptFeedback?.blockReason) { throw new Error(`AI request blocked: ${response.promptFeedback.blockReason}`); }
        if (!response.candidates?.length) { throw new Error("AI response was empty."); }
        if (response.candidates[0].finishReason === 'SAFETY') { throw new Error("AI response blocked due to safety settings."); }
        if (response.candidates[0].finishReason === 'MAX_TOKENS') { console.warn("Vision response truncated due to MAX_TOKENS."); }
        if (!response.candidates[0].content?.parts?.[0]?.text) {
             console.warn("Vision response content part is missing text:", response.candidates[0].content);
             if (response.candidates[0].finishReason && response.candidates[0].finishReason !== 'STOP') {
                 throw new Error(`Vision response content missing, finish reason: ${response.candidates[0].finishReason}`);
             } else {
                  console.warn("Vision response finished normally but content text is missing. Returning empty string.");
                  // Return empty string instead of throwing error if finishReason is STOP
                  updatedHistory.push({ role: "model", parts: [{ text: "" }] }); // Add empty response to history
                  return { explanationHtml: formatResponseAsHtml(""), history: updatedHistory };
             }
         }

        const explanationText = response.candidates[0].content.parts[0].text;
        updatedHistory.push({ role: "model", parts: [{ text: explanationText }] });

        return {
            explanationHtml: formatResponseAsHtml(explanationText),
            history: updatedHistory
        };
    } catch (error) {
        console.error("Error explaining PDF snapshot:", error);
        return {
             explanationHtml: `<p class="text-danger">Error: ${error.message}</p>`,
             // Return history *up to* the point of error
             history: updatedHistory.slice(0, -1) // Remove potential failed AI response placeholder
         };
    }
}

// *** MODIFIED: Use dynamic paths ***
export async function generateFormulaSheet(courseId, chapterNum) {
     console.log(`Generating formula sheet for Course ${courseId}, Chapter ${chapterNum}`);
     showLoading(`Gathering content for Ch ${chapterNum} Formula Sheet...`);
     const courseDef = globalCourseDataMap.get(courseId);
     if (!courseDef || !courseDef.courseDirName) {
         hideLoading();
         return `<p class="text-danger">Course definition not found or missing directory name.</p>`;
     }
     const courseDirName = courseDef.courseDirName;
     const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
     const lectureUrls = (chapterResources.lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title);

     // Construct dynamic paths
     const pdfOverride = chapterResources.pdfPath;
     const pdfPath = pdfOverride ? pdfOverride : `${COURSE_BASE_PATH}/${courseDirName}/${DEFAULT_COURSE_PDF_FOLDER}/chapter${chapterNum}.pdf`;
     const transcriptionBasePath = `${COURSE_BASE_PATH}/${courseDirName}/${DEFAULT_COURSE_TRANSCRIPTION_FOLDER}/`;
     console.log(`[AI Formula Sheet] Using PDF Path: ${pdfPath}`);
     console.log(`[AI Formula Sheet] Using Transcription Base Path: ${transcriptionBasePath}`);


     let transcriptionText = null; let fullPdfText = null; let contentSourceInfo = "";

     // Fetch Transcription(s)
     if (lectureUrls.length > 0) {
         let combinedTranscription = "";
         for (const lec of lectureUrls) {
             // Use override srtFilename if present, otherwise generate
             const srtOverride = lec.srtFilename;
             const srtFilename = srtOverride || getSrtFilenameFromTitle(lec.title); // Use imported function
             if (srtFilename) {
                 const transPath = `${transcriptionBasePath}${srtFilename}`; // Combine dynamic base + filename
                 console.log(`[AI Formula Sheet] Attempting to fetch transcription: ${transPath}`);
                 const text = await fetchSrtText(transPath);
                 if (text) combinedTranscription += text + "\n\n";
             } else {
                  console.warn(`[AI Formula Sheet] Could not determine SRT filename for video: ${lec.title}`);
             }
         }
         if (combinedTranscription) {
             transcriptionText = combinedTranscription.trim();
             console.log(`Combined transcription fetched (Length: ${transcriptionText.length})`); contentSourceInfo += "Lecture Transcriptions; ";
         } else { console.warn(`No valid transcriptions found/parsed for Ch ${chapterNum}`); }
     } else { console.log("No assigned lecture videos for transcription."); }

     // Extract PDF Text
     if (pdfPath && pdfPath.toLowerCase().endsWith('.pdf')) { // Check if path is valid before trying
         console.log("Extracting PDF text..."); fullPdfText = await getAllPdfTextForAI(pdfPath);
         if (fullPdfText) { console.log(`PDF text extracted (Length: ${fullPdfText.length})`); contentSourceInfo += "Chapter PDF Text; "; }
         else { console.warn(`PDF text extraction failed for Ch ${chapterNum} from path: ${pdfPath}`); }
     } else { console.log("No valid PDF path configured or determined."); }

     if (contentSourceInfo) contentSourceInfo = contentSourceInfo.slice(0, -2); else contentSourceInfo = "No text sources found";
     if (!transcriptionText && !fullPdfText) { hideLoading(); return `<p class="text-warning">No text content available for Ch ${chapterNum}.</p>`; }

     let combinedContent = `Content for Chapter ${chapterNum} (Sources: ${contentSourceInfo}):\n\n`;
     if (transcriptionText) combinedContent += `== Lecture Transcriptions ==\n${transcriptionText}\n\n`;
     if (fullPdfText) combinedContent += `== Chapter PDF Text ==\n${fullPdfText}\n\n`;
     combinedContent += `== End of Content ==`;

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
         return `<p class="text-danger">Error: ${error.message}</p>`;
     }
}

// *** MODIFIED: Use dynamic paths ***
export async function generateChapterSummary(courseId, chapterNum) {
    console.log(`Generating summary for Course ${courseId}, Chapter ${chapterNum}`);
    showLoading(`Gathering content for Ch ${chapterNum} Summary...`);
    const courseDef = globalCourseDataMap.get(courseId);
    if (!courseDef || !courseDef.courseDirName) {
        hideLoading();
        return `<p class="text-danger">Course definition not found or missing directory name.</p>`;
    }
    const courseDirName = courseDef.courseDirName;
    const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
    const lectureUrls = (chapterResources.lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title);

    // Construct dynamic paths
    const pdfOverride = chapterResources.pdfPath;
    const pdfPath = pdfOverride ? pdfOverride : `${COURSE_BASE_PATH}/${courseDirName}/${DEFAULT_COURSE_PDF_FOLDER}/chapter${chapterNum}.pdf`;
    const transcriptionBasePath = `${COURSE_BASE_PATH}/${courseDirName}/${DEFAULT_COURSE_TRANSCRIPTION_FOLDER}/`;
    console.log(`[AI Summary] Using PDF Path: ${pdfPath}`);
    console.log(`[AI Summary] Using Transcription Base Path: ${transcriptionBasePath}`);

    let transcriptionText = null; let fullPdfText = null; let contentSourceInfo = "";

    // Fetch Transcription(s)
    if (lectureUrls.length > 0) {
        let combinedTranscription = "";
        for (const lec of lectureUrls) {
            const srtOverride = lec.srtFilename;
            const srtFilename = srtOverride || getSrtFilenameFromTitle(lec.title);
            if (srtFilename) {
                const transPath = `${transcriptionBasePath}${srtFilename}`;
                console.log(`[AI Summary] Attempting to fetch transcription: ${transPath}`);
                const text = await fetchSrtText(transPath);
                if (text) combinedTranscription += text + "\n\n";
            } else {
                 console.warn(`[AI Summary] Could not determine SRT filename for video: ${lec.title}`);
            }
        }
        if (combinedTranscription) {
            transcriptionText = combinedTranscription.trim();
            console.log(`Combined transcription fetched (Length: ${transcriptionText.length})`); contentSourceInfo += "Lecture Transcriptions; ";
        } else { console.warn(`No valid transcriptions found/parsed for Ch ${chapterNum}`); }
    } else { console.log("No assigned lecture videos for transcription."); }

    // Extract PDF Text
    if (pdfPath && pdfPath.toLowerCase().endsWith('.pdf')) {
        console.log("Extracting PDF text..."); fullPdfText = await getAllPdfTextForAI(pdfPath);
        if (fullPdfText) { console.log(`PDF text extracted (Length: ${fullPdfText.length})`); contentSourceInfo += "Chapter PDF Text; "; }
        else { console.warn(`PDF text extraction failed for Ch ${chapterNum} from path: ${pdfPath}`); }
    } else { console.log("No valid PDF path configured or determined."); }

    if (contentSourceInfo) contentSourceInfo = contentSourceInfo.slice(0, -2); else contentSourceInfo = "No text sources found";
    if (!transcriptionText && !fullPdfText) { hideLoading(); return `<p class="text-warning">No text content available for Ch ${chapterNum}.</p>`; }

    let combinedContent = `Content for Chapter ${chapterNum} (Sources: ${contentSourceInfo}):\n\n`;
    if (transcriptionText) combinedContent += `== Lecture Transcriptions ==\n${transcriptionText}\n\n`;
    if (fullPdfText) combinedContent += `== Chapter PDF Text ==\n${fullPdfText}\n\n`;
    combinedContent += `== End of Content ==`;

    if (!await tokenLimitCheck(combinedContent)) {
         hideLoading();
         return `<p class="text-danger">Error: The combined chapter material (PDF + Transcriptions) is too large for the AI model to process.</p>`;
    }

    const prompt = `You are an expert physics and mathematics assistant. Based ONLY on the following combined text content (from ${contentSourceInfo}) for Chapter ${chapterNum}, write a clear, concise, and comprehensive summary of the chapter. Focus on the main concepts, key ideas, and important points. Use clear language suitable for a student review. Organize the summary logically, using bullet points or short paragraphs as appropriate. You may include simple LaTeX math ($...$ or $$...$$) for equations, but do NOT include a formula sheet or list all formulas. Do NOT copy large blocks of text verbatim. Do NOT include quiz questions or exam content.\n\nCombined Text Content for Chapter ${chapterNum}:\n---\n${combinedContent}\n---\nEnd of Combined Text Content.\n\nGenerate the summary now for Chapter ${chapterNum}:`;

    try {
        showLoading(`Generating Summary (Ch ${chapterNum})...`);
        const summaryText = await callGeminiTextAPI(prompt);
        hideLoading();
        return formatResponseAsHtml(summaryText);
    } catch (error) {
        console.error(`Error generating summary for Ch ${chapterNum}:`, error); hideLoading();
        return `<p class="text-danger">Error: ${error.message}</p>`;
    }
}

// --- Skip Exam Generation ---
// *** MODIFIED: REMOVED generateSkipExam function ***
// The function generateSkipExam has been removed as per the request.

// --- NEW: AI Functions for Notes ---

// *** MODIFIED: Use dynamic paths ***
export async function reviewNoteWithAI(noteContent, courseId, chapterNum) {
    console.log(`Requesting AI review for note (length: ${noteContent.length}) for Course ${courseId}, Chapter ${chapterNum}`);
    showLoading(`Gathering content for Ch ${chapterNum} Note Review...`);

    const courseDef = globalCourseDataMap.get(courseId);
    if (!courseDef || !courseDef.courseDirName) {
        hideLoading();
        return `<p class="text-danger">Course definition not found or missing directory name.</p>`;
    }
    const courseDirName = courseDef.courseDirName;
    const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
    const lectureUrls = (chapterResources.lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title);

    // Construct dynamic paths
    const pdfOverride = chapterResources.pdfPath;
    const pdfPath = pdfOverride ? pdfOverride : `${COURSE_BASE_PATH}/${courseDirName}/${DEFAULT_COURSE_PDF_FOLDER}/chapter${chapterNum}.pdf`;
    const transcriptionBasePath = `${COURSE_BASE_PATH}/${courseDirName}/${DEFAULT_COURSE_TRANSCRIPTION_FOLDER}/`;
    console.log(`[AI Note Review] Using PDF Path: ${pdfPath}`);
    console.log(`[AI Note Review] Using Transcription Base Path: ${transcriptionBasePath}`);


    let transcriptionText = null;
    let fullPdfText = null;

    // Fetch Transcription(s)
    if (lectureUrls.length > 0) {
        let combinedTranscription = "";
        for (const lec of lectureUrls) {
            const srtOverride = lec.srtFilename;
            const srtFilename = srtOverride || getSrtFilenameFromTitle(lec.title);
            if (srtFilename) {
                const transPath = `${transcriptionBasePath}${srtFilename}`;
                console.log(`[AI Note Review] Attempting to fetch transcription: ${transPath}`);
                const text = await fetchSrtText(transPath);
                if (text) combinedTranscription += text + "\n\n";
            } else {
                 console.warn(`[AI Note Review] Could not determine SRT filename for video: ${lec.title}`);
            }
        }
        if (combinedTranscription) {
            transcriptionText = combinedTranscription.trim();
        }
    }

    // Extract PDF Text
    if (pdfPath && pdfPath.toLowerCase().endsWith('.pdf')) {
        fullPdfText = await getAllPdfTextForAI(pdfPath);
         if (!fullPdfText) console.warn(`[AI Note Review] PDF text extraction failed for Ch ${chapterNum} from path: ${pdfPath}`);
    } else { console.log("No valid PDF path configured or determined."); }

    if (!transcriptionText && !fullPdfText) {
        hideLoading();
        return `<p class="text-warning">No source study material found for Chapter ${chapterNum} to compare notes against.</p>`;
    }

    let combinedSourceContent = `Source Study Material for Chapter ${chapterNum}:\n\n`;
    if (transcriptionText) combinedSourceContent += `== Lecture Transcriptions ==\n${transcriptionText}\n\n`;
    if (fullPdfText) combinedSourceContent += `== Chapter PDF Text ==\n${fullPdfText}\n\n`;
    combinedSourceContent += `== End of Source Material ==`;

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
    // ... (convertNoteToLatex implementation remains the same) ...
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

/**
 * Asks the AI to improve a note by adding clarity, structure, and relevant equations *without deleting* existing content.
 */
export async function improveNoteWithAI(noteContent) {
    // ... (improveNoteWithAI implementation remains the same) ...
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
 */
export async function extractTextFromImageAndConvertToLatex(base64ImageData) {
    // ... (extractTextFromImageAndConvertToLatex implementation remains the same) ...
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