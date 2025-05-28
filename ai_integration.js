// --- START OF FILE ai_integration.js ---

// ai_integration.js

// *** MODIFIED: Import new path constants ***
import { GEMINI_API_KEY, PDF_WORKER_SRC, COURSE_BASE_PATH, DEFAULT_COURSE_PDF_FOLDER, DEFAULT_COURSE_TRANSCRIPTION_FOLDER, AVAILABLE_AI_MODELS, DEFAULT_PRIMARY_AI_MODEL, DEFAULT_FALLBACK_AI_MODEL } from './config.js'; // Import the API key & Path Config
import { showLoading, hideLoading, escapeHtml, decodeHtmlEntities } from './utils.js'; // Import UI helpers & escapeHtml
import { globalCourseDataMap, currentUser, userAiChatSettings, globalAiSystemPrompts } from './state.js'; // Need course data map, current user, and AI settings
// *** NEW: Import DEFAULT_AI_SYSTEM_PROMPTS from ai_prompts.js ***
import { DEFAULT_AI_SYSTEM_PROMPTS } from './ai_prompts.js';
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

// Define models (Vision model remains constant for now, Text model is dynamic)
const VISION_MODEL_NAME = "gemini-2.5-pro-exp-03-25"; // Or make this configurable if needed later


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
        const loadingTaskInput = typeof pdfDataOrPath === 'string'
            ? (pdfDataOrPath.includes('%') ? pdfDataOrPath : encodeURI(pdfDataOrPath))
            : pdfDataOrPath;
        console.log("Calling pdfjsLib.getDocument with input:", typeof loadingTaskInput === 'string' ? loadingTaskInput : '[Uint8Array]');
        const loadingTask = pdfjsLib.getDocument(loadingTaskInput);

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
// window.getAllPdfTextForAI = getAllPdfTextForAI; // ES Exported


// --- API Call Helpers ---
export async function tokenLimitCheck(contextText, charLimit = 1800000) {
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
 * @param {string | null} systemPromptKey - Key to look up the system prompt in settings.
 * @returns {Promise<string>} - The AI's text response.
 */
export async function callGeminiTextAPI(prompt, history = null, systemPromptKey = null) {
    if (!GoogleGenerativeAI) throw new Error("AI SDK failed to load.");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY") throw new Error("API Key not configured.");

    const checkContent = (history && history.length > 0) ? JSON.stringify(history) : prompt;
    if (!await tokenLimitCheck(checkContent)) {
        throw new Error("Prompt/History exceeds token limit. Please reduce the context size.");
    }

    // Determine effective model name
    let effectiveModelName;
    if (userAiChatSettings?.primaryModel && AVAILABLE_AI_MODELS.includes(userAiChatSettings.primaryModel)) {
        effectiveModelName = userAiChatSettings.primaryModel;
    } else if (userAiChatSettings?.fallbackModel && AVAILABLE_AI_MODELS.includes(userAiChatSettings.fallbackModel)) {
        effectiveModelName = userAiChatSettings.fallbackModel;
        console.warn(`[AI Call] Primary AI model '${userAiChatSettings.primaryModel}' not valid or not set. Using user's fallback: '${effectiveModelName}'`);
    } else if (DEFAULT_PRIMARY_AI_MODEL && AVAILABLE_AI_MODELS.includes(DEFAULT_PRIMARY_AI_MODEL)) {
        effectiveModelName = DEFAULT_PRIMARY_AI_MODEL;
        console.warn(`[AI Call] User AI models not valid or not set. Using default primary: '${effectiveModelName}'`);
    } else if (DEFAULT_FALLBACK_AI_MODEL && AVAILABLE_AI_MODELS.includes(DEFAULT_FALLBACK_AI_MODEL)) {
        effectiveModelName = DEFAULT_FALLBACK_AI_MODEL;
        console.warn(`[AI Call] User and default primary AI models not valid or not set. Using default fallback: '${effectiveModelName}'`);
    } else {
        console.error("[AI Call] No valid AI model could be determined. Please check AI configuration. Falling back to a generic model name if possible or erroring.");
        // Fallback to the first model in AVAILABLE_AI_MODELS or a hardcoded one as a last resort
        effectiveModelName = AVAILABLE_AI_MODELS.length > 0 ? AVAILABLE_AI_MODELS[0] : "gemini-1.0-pro"; // A generic fallback
        if (!AVAILABLE_AI_MODELS.includes(effectiveModelName)){
             console.error(`Critial Error: No valid AI model found, including fallbacks. Attempted ${effectiveModelName}`);
             throw new Error("AI model configuration error: No valid model available.");
        }
        console.warn(`[AI Call] Resorting to model: ${effectiveModelName} due to configuration issues.`);
    }
    console.log(`[AI Call] Using model: ${effectiveModelName}`);

    // Determine effective system prompt
    let effectiveSystemPromptText = null;
    if (systemPromptKey) {
        if (userAiChatSettings?.customSystemPrompts?.[systemPromptKey]) {
            effectiveSystemPromptText = userAiChatSettings.customSystemPrompts[systemPromptKey];
            console.log(`[AI Call] Using custom system prompt for key: ${systemPromptKey}`);
        } else if (globalAiSystemPrompts?.[systemPromptKey]) {
            effectiveSystemPromptText = globalAiSystemPrompts[systemPromptKey];
            console.log(`[AI Call] Using global system prompt for key: ${systemPromptKey}`);
        } else if (DEFAULT_AI_SYSTEM_PROMPTS?.[systemPromptKey]) {
            effectiveSystemPromptText = DEFAULT_AI_SYSTEM_PROMPTS[systemPromptKey];
            console.log(`[AI Call] Using default system prompt for key: ${systemPromptKey}`);
        } else {
            console.warn(`[AI Call] System prompt key '${systemPromptKey}' not found in any configuration. Using generic default.`);
            effectiveSystemPromptText = "You are a helpful AI.";
        }
    } else {
         console.log(`[AI Call] No system prompt key provided.`);
    }


    const requestContents = history ? [
        ...history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content || msg.parts?.[0]?.text || '' }]
        })),
        ...(prompt ? [{ role: "user", parts: [{ text: prompt }] }] : [])
    ] : [{
        role: "user",
        parts: [{ text: prompt || '' }]
    }];

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: effectiveModelName });

        const safetySettings = [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ];
        const generationConfig = {
            temperature: 0.6, topK: 40, topP: 0.95, maxOutputTokens: 65536, stopSequences: ["\n\n\n"]
        };

        const generationArgs = {
            contents: requestContents,
            safetySettings,
            generationConfig
        };

        if (effectiveSystemPromptText) {
            generationArgs.systemInstruction = { parts: [{ text: effectiveSystemPromptText }] };
            console.log(`[AI Call] System instruction set: "${effectiveSystemPromptText.substring(0,100)}..."`);
        }

        console.log('[AI Call] Sending request to Gemini API with effective model:', effectiveModelName, 'Args:', JSON.stringify(generationArgs, (key, value) => (key === 'parts' && typeof value?.[0]?.text === 'string' && value[0].text.length > 200) ? `[{text: "${value[0].text.substring(0,100)}... (truncated)"}]` : value, 2));


        const result = await model.generateContent(generationArgs);
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
             if (response.candidates[0].finishReason && response.candidates[0].finishReason !== 'STOP') {
                 throw new Error(`AI response content missing, finish reason: ${response.candidates[0].finishReason}`);
             } else {
                 console.warn("AI response finished normally but content text is missing. Returning empty string.");
                 return "";
             }
         }

        return response.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error(`Error in callGeminiTextAPI (Model: ${effectiveModelName}):`, error);
        if (currentUser) {
            submitFeedback({
                subjectId: "AI API Error", questionId: null,
                feedbackText: `Error in callGeminiTextAPI (Model: ${effectiveModelName}): ${error.message}`,
                context: "System Error - AI API Call"
            }, currentUser).catch(e => console.error("Failed to submit feedback for API error:", e));
        }
        throw error; // Re-throw the original error
    }
}

export async function callGeminiVisionAPI(promptParts) {
     if (!GoogleGenerativeAI) throw new Error("AI SDK failed to load.");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY") throw new Error("API Key not configured.");
    if (!promptParts?.length) throw new Error("Prompt parts cannot be empty.");

    // Note: Vision model selection is not dynamic via user settings in this iteration. Uses VISION_MODEL_NAME.
    // If vision models also need to be configurable, similar logic as in callGeminiTextAPI would be needed.
    console.log(`[AI Vision Call] Using model: ${VISION_MODEL_NAME}`);

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: VISION_MODEL_NAME });
        const logParts = promptParts.map(p => p.inlineData ? `{inlineData: mimeType=${p.inlineData.mimeType}, length=${p.inlineData.data?.length}}` : p);
        console.log(`Sending VISION prompt (${VISION_MODEL_NAME}):`, logParts);
        const safetySettings = [
             { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
             { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
             { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
             { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
         ];
         const generationConfig = {
             temperature: 0.4, topK: 32, topP: 1.0, maxOutputTokens: 65536,
         };

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
     if (!rawText) return '<p class="text-muted italic">AI did not provide a response.</p>';
    let escapedText = escapeHtml(rawText);
    escapedText = escapedText.replace(/```(?:[a-zA-Z]+)?\n([\s\S]*?)\n```/g, (m, code) => `<pre><code class="block whitespace-pre-wrap">${escapeHtml(code.trim())}</code></pre>`);
    escapedText = escapedText.replace(/`([^`]+)`/g, '<code>$1</code>');
    escapedText = escapedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escapedText = escapedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    escapedText = escapedText.replace(/^\s*(\d+)\.\s+(.*)/gm, (match, number, item) => `<li>${item.trim()}</li>`);
    // Ensure ol tags are not nested incorrectly by the simple replace
    let inOl = false;
    escapedText = escapedText.split('\n').map(line => {
        if (line.match(/^\s*<li>/) && !inOl) { inOl = true; return '<ol style="list-style:decimal;margin-left:1.5em;">\n' + line; }
        if (!line.match(/^\s*<li>/) && inOl) { inOl = false; return '</ol>\n' + line; }
        return line;
    }).join('\n');
    if (inOl) escapedText += '\n</ol>'; // Close any trailing ol

    // Similar logic for ul
    let inUl = false;
    escapedText = escapedText.split('\n').map(line => {
        if (line.match(/^\s*[\*\-]\s+(.*)/gm)) { // This regex was for identifying items, not replacing them yet
            line = line.replace(/^\s*[\*\-]\s+(.*)/gm, (match, item) => `<li>${item.trim()}</li>`);
        }
        if (line.match(/^\s*<li>/) && !inUl && !line.includes('<ol')) { // Avoid double wrapping if already in <ol>
            inUl = true; return '<ul style="list-style:disc;margin-left:1.5em;">\n' + line;
        }
        if (!line.match(/^\s*<li>/) && inUl) { inUl = false; return '</ul>\n' + line; }
        return line;
    }).join('\n');
    if (inUl) escapedText += '\n</ul>'; // Close any trailing ul

    let lines = escapedText.split('\n');
    let inListOrPre = false; // Combined check
    let processedLines = lines.map(line => {
        let trimmedLine = line.trim();
        if (trimmedLine.startsWith('<pre>') || trimmedLine.startsWith('<ol') || trimmedLine.startsWith('<ul')) inListOrPre = true;
        
        let outputLine = line;
        if (!inListOrPre && trimmedLine.length > 0 && 
            !trimmedLine.startsWith('<li') && !trimmedLine.endsWith('</li>') && 
            !trimmedLine.startsWith('<h') && !trimmedLine.endsWith('>') && 
            !trimmedLine.startsWith('<p>') && !trimmedLine.endsWith('</p>')) {
            outputLine = '<p>' + outputLine + '</p>'; // Wrap non-list/pre lines in <p>
        } else if (!inListOrPre && trimmedLine.length > 0 && !trimmedLine.startsWith('<p>') && !trimmedLine.endsWith('</p>') && !trimmedLine.match(/<\/?(ul|ol|li|pre|code|strong|em|h[1-6])/)) {
             // Heuristic: if it's not a known block or inline tag, and not empty, wrap in p
             // This might be too aggressive. Let's try a simpler line break approach for non-structural lines.
             // outputLine += '<br>'; // Reverted this to simpler logic from original if p-wrapping is too much.
        }

        // Correctly handle <br> tags for lines not part of structural HTML
        if (!trimmedLine.match(/<\/?(p|ul|ol|li|pre|code|strong|em|h[1-6]|br)/i) && trimmedLine.length > 0) {
            outputLine = line + '<br>';
        }


        outputLine = outputLine.replace(/<br>\s*(<(?:pre|ol|ul|p))/g, '$1');
        outputLine = outputLine.replace(/(<\/(?:pre|ol|ul|p)>)\s*<br>/g, '$1');
        if (trimmedLine.endsWith('</pre>') || trimmedLine.endsWith('</ol>') || trimmedLine.endsWith('</ul>') || trimmedLine.endsWith('</p>')) inListOrPre = false;
        return outputLine;
    });

    // Remove trailing <br> from the very end of the text
    let htmlWithBreaks = processedLines.join('\n').replace(/<br>\s*$/g, '');
    // Ensure paragraphs are not inside other paragraphs due to previous logic
    htmlWithBreaks = htmlWithBreaks.replace(/<p><p>/g, '<p>').replace(/<\/p><\/p>/g, '</p>');


    return `<div class="prose prose-sm dark:prose-invert max-w-none leading-relaxed">${htmlWithBreaks}</div>`;
}


// --- AI Functions ---
export async function getAIExplanation(questionData) {
     console.log("Attempting to get AI explanation for:", questionData);
     try {
         let userMessage = `Explain the following multiple-choice question clearly and concisely:\n\n`;
         userMessage += `**Question:**\n${questionData.text}\n\n`;
         userMessage += `**Options:**\n`;
         questionData.options.forEach(opt => { userMessage += `${opt.letter}. ${opt.text}\n`; });
         userMessage += `\n**Correct Answer:** ${questionData.correctAnswer}\n`;
         if (!questionData.isUserCorrect && questionData.userAnswer) {
             userMessage += `**User's Incorrect Answer:** ${questionData.userAnswer}\n\n`;
             userMessage += `Please explain step-by-step:\n1. Why the correct answer (${questionData.correctAnswer}) is right.\n2. Why the user's answer (${questionData.userAnswer}) is wrong.\n`;
         } else {
             userMessage += `\nPlease explain step-by-step why ${questionData.correctAnswer} is the correct answer.\n`;
         }
         userMessage += `\nFocus on the physics and mathematics concepts. Format with basic Markdown/LaTeX. No Markdown headings.`;
         
         showLoading("Generating AI Explanation...");
         // Use 'questionExplainerMCQ' system prompt key
         const explanationText = await callGeminiTextAPI(userMessage, null, 'questionExplainerMCQ');
         hideLoading();
         return formatResponseAsHtml(explanationText);
     } catch (error) {
         console.error("Error in getAIExplanation:", error); hideLoading();
         return `<p class="text-danger">Error generating explanation: ${error.message}</p>`;
     }
}

export async function explainStudyMaterialSnippet(snippetOrQuestion, context, history) {
     console.log(`Requesting explanation for snippet/question: "${snippetOrQuestion.substring(0, 50)}..." with context length: ${context?.length || 0}, history length: ${history.length}`);
    if (!snippetOrQuestion) return { explanationHtml: `<p class="text-warning">No text provided.</p>`, history: history };

    let currentPromptText = '';
    let updatedHistory = [...history]; 

    if (history.length === 0) { // Initial request
        const isLikelyQuestion = snippetOrQuestion.length < 200;
        if (!await tokenLimitCheck(context)) {
            return { explanationHtml: `<p class="text-danger">Error: The provided context material is too large for the AI model to process.</p>`, history: history };
        }

        if (isLikelyQuestion && context?.length > 500) {
             currentPromptText = `Based *only* on the study material text I'll provide in the next turn (or that you might have from prior turns if this is a follow-up), please answer my question.\n\nMy Question: "${snippetOrQuestion}"\n\nStudy Material Text (Use ONLY this, if provided now or previously):\n---\n${context}\n---\nEnd Context.\n\nAnswer based *only* on the provided text. Use basic Markdown/LaTeX. If context doesn't contain the answer, state that. No headings.`;
        } else {
             currentPromptText = `Explain the following text snippet clearly:\n\nSnippet: "${snippetOrQuestion}"\n\nContext (if any): "${context || 'None provided.'}"\n\nProvide an explanation suitable for a student. Use basic Markdown/LaTeX. No headings.`;
        }
        // For the first turn, the constructed prompt is the user message.
        // The system prompt will set the persona.
    } else { // Follow-up question
        currentPromptText = snippetOrQuestion; // This is the user's follow-up question.
    }

    // Add user's current message to history before calling API
    if (currentPromptText) { // Ensure not adding an empty prompt if logic leads to it
        updatedHistory.push({ role: "user", parts: [{ text: currentPromptText }] });
    }
    
    try {
        // Pass the *updated* history. The 'prompt' argument to callGeminiTextAPI is now effectively null
        // because the latest user message is already in `updatedHistory`.
        // Or, more cleanly, pass `currentPromptText` as the prompt and `history` (original) as history.
        // Let's use the latter: pass `currentPromptText` and the `history` *before* this turn.
        const explanationText = await callGeminiTextAPI(currentPromptText, history, 'studyMaterialSnippetExplainer');
        
        // Add the AI's response to the history for the next turn
        const finalHistory = [...updatedHistory, { role: "model", parts: [{ text: explanationText }] }];
        return {
            explanationHtml: formatResponseAsHtml(explanationText),
            history: finalHistory
        };
    } catch (error) {
        console.error("Error explaining snippet:", error);
         return {
             explanationHtml: `<p class="text-danger">Error: ${error.message}</p>`,
             history: updatedHistory // Return history up to the point of user's last message
         };
    }
}

export async function askAboutPdfDocument(userQuestion, pdfPath, courseId, chapterNum) {
      console.log(`Asking about whole PDF: ${pdfPath} (Ch ${chapterNum})`);
     if (!userQuestion) return { explanationHtml: `<p class="text-warning">Please enter a question about the PDF.</p>`, history: [] };
     if (!pdfPath) return { explanationHtml: `<p class="text-danger">No PDF path available for this chapter.</p>`, history: [] };

     showLoading("Extracting PDF text for AI...");
     const fullPdfText = await getAllPdfTextForAI(pdfPath);
     if (!fullPdfText) {
         hideLoading();
         return { explanationHtml: `<p class="text-danger">Failed to extract text from the PDF document. It might be image-based or corrupted.</p>`, history: [] };
     }
     console.log(`Extracted ${fullPdfText.length} characters from PDF.`);
     hideLoading();

     if (!await tokenLimitCheck(fullPdfText + userQuestion)) {
         return { explanationHtml: `<p class="text-danger">Error: The PDF content and your question are too large for the AI model to process.</p>`, history: [] };
     }

     // The user's message to the AI. The system prompt will instruct it to use only this text.
     const userMessage = `My question is: "${userQuestion}"\n\nHere is the text from the Chapter ${chapterNum} PDF document you should use to answer:\n---\n${fullPdfText}\n---\nEnd PDF Text.`;
     
     const initialHistoryForCall = []; // No prior history for this specific function call's perspective

     try {
         showLoading("Asking AI about PDF...");
         // Pass the user message and the system prompt key.
         const explanationText = await callGeminiTextAPI(userMessage, initialHistoryForCall, 'pdfDocumentQuestionAnswering');
         
         const finalHistory = [
             { role: "user", parts: [{ text: userMessage }] }, 
             { role: "model", parts: [{ text: explanationText }] }
         ];
         hideLoading();
         return {
             explanationHtml: formatResponseAsHtml(explanationText),
             history: finalHistory 
         };
     } catch (error) {
         console.error("Error asking about PDF:", error); hideLoading();
         return {
             explanationHtml: `<p class="text-danger">Error processing request: ${error.message}</p>`,
             history: [{ role: "user", parts: [{ text: userMessage }] }] // History up to the failed request
         };
     }
}

export async function getExplanationForPdfSnapshot(userQuestion, base64ImageData, context, history = []) {
     console.log(`Requesting AI explanation for PDF snapshot (Context: ${context}), History Length: ${history.length}`);
    if (!userQuestion) return { explanationHtml: `<p class="text-warning">No question provided.</p>`, history: history };
    if (!base64ImageData && history.length === 0) return { explanationHtml: `<p class="text-warning">No image data provided for initial query.</p>`, history: history };

    // For Vision API, system-like instructions are typically part of the text prompt.
    // The DEFAULT_AI_SYSTEM_PROMPTS.pdfSnapshotExplainer can guide how this text part is constructed.
    // For now, keeping existing logic as `callGeminiVisionAPI` does not use `systemPromptKey`.
    
    let currentPromptParts = [];
    let updatedHistory = [...history]; // This will store the full conversation for return

    const instructionTextPrefix = DEFAULT_AI_SYSTEM_PROMPTS.pdfSnapshotExplainer || "You are a helpful tutor. Explain the image and question.";
    
    if (history.length === 0) { // Initial request with image
        currentPromptParts = [
            { text: `${instructionTextPrefix} Context: ${context}. Question: "${userQuestion}". Focus explanation on visible content. Use basic Markdown/LaTeX. No headings.` },
            { inlineData: { mimeType: "image/jpeg", data: base64ImageData } }
        ];
        updatedHistory.push({ role: "user", parts: currentPromptParts });
    } else { // Follow-up request (text only)
        // For follow-ups, the image is implicitly part of the history for the model (hopefully)
        currentPromptParts = [{ text: userQuestion }]; // User's new question
        updatedHistory.push({ role: "user", parts: currentPromptParts });
        // Vision API might not maintain context over many turns as well as text models.
        // It's good practice to re-iterate key context if needed in follow-ups.
        // For now, this simple approach sends only the new text question.
    }
    
    try {
        // `callGeminiVisionAPI` takes the *parts* for the current turn.
        // It doesn't handle history internally like `callGeminiTextAPI` does.
        // The Vision API itself can take a 'contents' array for history.
        // Let's adjust `callGeminiVisionAPI` or how it's called if multi-turn vision is critical.
        // For now, `callGeminiVisionAPI` only sends the `currentPromptParts`.
        // To enable history for vision:
        // The `callGeminiVisionAPI` would need to accept the full history and pass it.
        // The `generateContent` call in `callGeminiVisionAPI` is:
        // `model.generateContent({ contents: [{ role: "user", parts: promptParts }], ... })`
        // This should be `model.generateContent({ contents: updatedHistoryIncludingNewPromptParts, ... })`
        // Let's assume `callGeminiVisionAPI` is modified or the intent is simpler for now.
        // The current prompt was: The `generateContent` method accepts the history array directly (for vision)
        // So, `callGeminiVisionAPI` should actually take the full `updatedHistory`.
        
        // Re-checking `getExplanationForPdfSnapshot` original logic:
        // `const result = await model.generateContent({ contents: updatedHistory, ... });`
        // This means `updatedHistory` (which includes the latest user prompt) IS being sent. So this is good.
        // The `callGeminiVisionAPI` needs to reflect this structure if it's a wrapper.
        // If `callGeminiVisionAPI` is a thin wrapper just for ONE turn, then this function is doing the history management.
        // Let's assume `callGeminiVisionAPI` is for single-turn and `getExplanationForPdfSnapshot` manages history.

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: VISION_MODEL_NAME }); // Vision model
        const safetySettings = [ /* ... as defined in callGeminiVisionAPI ... */ ];
        const generationConfig = { /* ... as defined in callGeminiVisionAPI ... */ };

        console.log(`[AI Vision Call] Sending to model ${VISION_MODEL_NAME} with history length: ${updatedHistory.length}`);
        const result = await model.generateContent({ contents: updatedHistory, safetySettings, generationConfig });
        const response = result.response;

        if (response.promptFeedback?.blockReason) { throw new Error(`AI request blocked: ${response.promptFeedback.blockReason}`); }
        if (!response.candidates?.length) { throw new Error("AI response was empty."); }
        if (response.candidates[0].finishReason === 'SAFETY') { throw new Error("AI response blocked due to safety settings."); }
        if (response.candidates[0].finishReason === 'MAX_TOKENS') { console.warn("Vision response truncated due to MAX_TOKENS."); }
        
        let explanationText = "";
        if (response.candidates[0].content?.parts?.[0]?.text) {
            explanationText = response.candidates[0].content.parts[0].text;
        } else {
             console.warn("Vision response content part is missing text:", response.candidates[0].content);
             if (response.candidates[0].finishReason && response.candidates[0].finishReason !== 'STOP') {
                 throw new Error(`Vision response content missing, finish reason: ${response.candidates[0].finishReason}`);
             } else {
                  console.warn("Vision response finished normally but content text is missing. Returning empty string.");
                  // explanationText remains ""
             }
        }
        
        updatedHistory.push({ role: "model", parts: [{ text: explanationText }] });

        return {
            explanationHtml: formatResponseAsHtml(explanationText),
            history: updatedHistory
        };
    } catch (error) {
        console.error("Error explaining PDF snapshot:", error);
        // Return history up to the point of the user's last failed prompt
        const historyBeforeError = updatedHistory.filter(turn => turn.role !== "model" || turn.parts[0].text !== undefined); // crude way to slice off a potential failed model turn
        return {
             explanationHtml: `<p class="text-danger">Error: ${error.message}</p>`,
             history: historyBeforeError 
         };
    }
}

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

     const pdfOverride = chapterResources.pdfPath;
     const pdfPath = pdfOverride ? pdfOverride : `${COURSE_BASE_PATH}/${courseDirName}/${DEFAULT_COURSE_PDF_FOLDER}/chapter${chapterNum}.pdf`;
     const transcriptionBasePath = `${COURSE_BASE_PATH}/${courseDirName}/${DEFAULT_COURSE_TRANSCRIPTION_FOLDER}/`;
     
     let transcriptionText = null; let fullPdfText = null; let contentSourceInfo = "";

     if (lectureUrls.length > 0) { /* ... (fetching logic remains same) ... */ 
        let combinedTranscription = "";
        for (const lec of lectureUrls) {
            const srtOverride = lec.srtFilename;
            const srtFilename = srtOverride || getSrtFilenameFromTitle(lec.title); 
            if (srtFilename) {
                const transPath = `${transcriptionBasePath}${srtFilename}`;
                const text = await fetchSrtText(transPath);
                if (text) combinedTranscription += text + "\n\n";
            } else {
                 console.warn(`[AI Formula Sheet] Could not determine SRT filename for video: ${lec.title}`);
            }
        }
        if (combinedTranscription) {
            transcriptionText = combinedTranscription.trim(); contentSourceInfo += "Lecture Transcriptions; ";
        }
     }
     if (pdfPath && pdfPath.toLowerCase().endsWith('.pdf')) { /* ... (fetching logic remains same) ... */ 
        fullPdfText = await getAllPdfTextForAI(pdfPath);
        if (fullPdfText) { contentSourceInfo += "Chapter PDF Text; "; }
        else { console.warn(`PDF text extraction failed for Ch ${chapterNum} from path: ${pdfPath}`);}
     }
     
     if (contentSourceInfo) contentSourceInfo = contentSourceInfo.slice(0, -2); else contentSourceInfo = "No text sources found";
     if (!transcriptionText && !fullPdfText) { hideLoading(); return `<p class="text-warning">No text content available for Ch ${chapterNum}.</p>`; }

     let combinedContentForUserMessage = `Content for Chapter ${chapterNum} (Sources: ${contentSourceInfo}):\n\n`;
     if (transcriptionText) combinedContentForUserMessage += `== Lecture Transcriptions ==\n${transcriptionText}\n\n`;
     if (fullPdfText) combinedContentForUserMessage += `== Chapter PDF Text ==\n${fullPdfText}\n\n`;
     combinedContentForUserMessage += `== End of Content ==\n\nGenerate the comprehensive formula sheet now for Chapter ${chapterNum}.`;

     if (!await tokenLimitCheck(combinedContentForUserMessage)) {
         hideLoading();
         return `<p class="text-danger">Error: The combined chapter material is too large for the AI model.</p>`;
     }
    
     // The user message now contains the content and the specific request.
     // The system prompt "formulaSheetGenerator" defines the AI's role and general task.
     try {
         showLoading(`Generating Formula Sheet (Ch ${chapterNum})...`);
         const formulaSheetText = await callGeminiTextAPI(combinedContentForUserMessage, null, 'formulaSheetGenerator');
         hideLoading();
         return formatResponseAsHtml(formulaSheetText);
     } catch (error) {
         console.error(`Error generating formula sheet for Ch ${chapterNum}:`, error); hideLoading();
         return `<p class="text-danger">Error: ${error.message}</p>`;
     }
}

export async function generateChapterSummary(courseId, chapterNum) {
    console.log(`Generating summary for Course ${courseId}, Chapter ${chapterNum}`);
    showLoading(`Gathering content for Ch ${chapterNum} Summary...`);
    const courseDef = globalCourseDataMap.get(courseId);
    if (!courseDef || !courseDef.courseDirName) { /* ... (error handling same) ... */ 
        hideLoading();
        return `<p class="text-danger">Course definition not found or missing directory name.</p>`;
    }
    const courseDirName = courseDef.courseDirName;
    const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
    const lectureUrls = (chapterResources.lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title);

    const pdfOverride = chapterResources.pdfPath;
    const pdfPath = pdfOverride ? pdfOverride : `${COURSE_BASE_PATH}/${courseDirName}/${DEFAULT_COURSE_PDF_FOLDER}/chapter${chapterNum}.pdf`;
    const transcriptionBasePath = `${COURSE_BASE_PATH}/${courseDirName}/${DEFAULT_COURSE_TRANSCRIPTION_FOLDER}/`;

    let transcriptionText = null; let fullPdfText = null; let contentSourceInfo = "";
    // ... (Content fetching logic as in generateFormulaSheet)
     if (lectureUrls.length > 0) {
        let combinedTranscription = "";
        for (const lec of lectureUrls) {
            const srtOverride = lec.srtFilename;
            const srtFilename = srtOverride || getSrtFilenameFromTitle(lec.title);
            if (srtFilename) {
                const transPath = `${transcriptionBasePath}${srtFilename}`;
                const text = await fetchSrtText(transPath);
                if (text) combinedTranscription += text + "\n\n";
            } else { console.warn(`[AI Summary] Could not determine SRT filename for video: ${lec.title}`);}
        }
        if (combinedTranscription) { transcriptionText = combinedTranscription.trim(); contentSourceInfo += "Lecture Transcriptions; ";}
    }
    if (pdfPath && pdfPath.toLowerCase().endsWith('.pdf')) {
        fullPdfText = await getAllPdfTextForAI(pdfPath);
        if (fullPdfText) {contentSourceInfo += "Chapter PDF Text; ";}
        else { console.warn(`PDF text extraction failed for Ch ${chapterNum} from path: ${pdfPath}`); }
    }

    if (contentSourceInfo) contentSourceInfo = contentSourceInfo.slice(0, -2); else contentSourceInfo = "No text sources found";
    if (!transcriptionText && !fullPdfText) { hideLoading(); return `<p class="text-warning">No text content available for Ch ${chapterNum}.</p>`; }

    let combinedContentForUserMessage = `Content for Chapter ${chapterNum} (Sources: ${contentSourceInfo}):\n\n`;
    if (transcriptionText) combinedContentForUserMessage += `== Lecture Transcriptions ==\n${transcriptionText}\n\n`;
    if (fullPdfText) combinedContentForUserMessage += `== Chapter PDF Text ==\n${fullPdfText}\n\n`;
    combinedContentForUserMessage += `== End of Content ==\n\nGenerate the summary now for Chapter ${chapterNum}.`;
    
    if (!await tokenLimitCheck(combinedContentForUserMessage)) {
         hideLoading();
         return `<p class="text-danger">Error: The combined chapter material is too large for the AI model.</p>`;
    }

    try {
        showLoading(`Generating Summary (Ch ${chapterNum})...`);
        const summaryText = await callGeminiTextAPI(combinedContentForUserMessage, null, 'chapterSummaryGenerator');
        hideLoading();
        return formatResponseAsHtml(summaryText);
    } catch (error) {
        console.error(`Error generating summary for Ch ${chapterNum}:`, error); hideLoading();
        return `<p class="text-danger">Error: ${error.message}</p>`;
    }
}

export async function reviewNoteWithAI(noteContent, courseId, chapterNum) {
    console.log(`Requesting AI review for note (length: ${noteContent.length}) for Course ${courseId}, Chapter ${chapterNum}`);
    showLoading(`Gathering content for Ch ${chapterNum} Note Review...`);

    const courseDef = globalCourseDataMap.get(courseId);
     if (!courseDef || !courseDef.courseDirName) { /* ... (error handling same) ... */ 
        hideLoading();
        return `<p class="text-danger">Course definition not found or missing directory name.</p>`;
    }
    const courseDirName = courseDef.courseDirName;
    const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
    const lectureUrls = (chapterResources.lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title);

    const pdfOverride = chapterResources.pdfPath;
    const pdfPath = pdfOverride ? pdfOverride : `${COURSE_BASE_PATH}/${courseDirName}/${DEFAULT_COURSE_PDF_FOLDER}/chapter${chapterNum}.pdf`;
    const transcriptionBasePath = `${COURSE_BASE_PATH}/${courseDirName}/${DEFAULT_COURSE_TRANSCRIPTION_FOLDER}/`;
    
    let transcriptionText = null; let fullPdfText = null;
    // ... (Content fetching logic)
    if (lectureUrls.length > 0) {
        let combinedTranscription = "";
        for (const lec of lectureUrls) {
            const srtOverride = lec.srtFilename;
            const srtFilename = srtOverride || getSrtFilenameFromTitle(lec.title);
            if (srtFilename) {
                const transPath = `${transcriptionBasePath}${srtFilename}`;
                const text = await fetchSrtText(transPath);
                if (text) combinedTranscription += text + "\n\n";
            } else {console.warn(`[AI Note Review] Could not determine SRT filename for video: ${lec.title}`);}
        }
        if (combinedTranscription) { transcriptionText = combinedTranscription.trim(); }
    }
    if (pdfPath && pdfPath.toLowerCase().endsWith('.pdf')) {
        fullPdfText = await getAllPdfTextForAI(pdfPath);
        if (!fullPdfText) console.warn(`[AI Note Review] PDF text extraction failed for Ch ${chapterNum} from path: ${pdfPath}`);
    }

    if (!transcriptionText && !fullPdfText) {
        hideLoading();
        return `<p class="text-warning">No source study material found for Chapter ${chapterNum} to compare notes against.</p>`;
    }

    let combinedSourceMaterial = `Source Study Material for Chapter ${chapterNum}:\n\n`;
    if (transcriptionText) combinedSourceMaterial += `== Lecture Transcriptions ==\n${transcriptionText}\n\n`;
    if (fullPdfText) combinedSourceMaterial += `== Chapter PDF Text ==\n${fullPdfText}\n\n`;
    combinedSourceMaterial += `== End of Source Material ==`;

    const userMessage = `Please review my note for Chapter ${chapterNum}. Compare it against the source material provided below and give feedback according to the standard review criteria (Rating, Strengths, Weaknesses, Suggestions, Accuracy).\n\n**My Note:**\n---\n${noteContent}\n---\n\n**Source Study Material:**\n---\n${combinedSourceMaterial}\n---`;

    if (!await tokenLimitCheck(userMessage)) {
        hideLoading();
        return `<p class="text-danger">Error: The combined material and note are too large for the AI.</p>`;
    }

    try {
        showLoading(`AI Reviewing Note (Ch ${chapterNum})...`);
        const reviewText = await callGeminiTextAPI(userMessage, null, 'noteReviewer');
        hideLoading();
        return formatResponseAsHtml(reviewText);
    } catch (error) {
        console.error(`Error reviewing note for Ch ${chapterNum}:`, error);
        hideLoading();
        return `<p class="text-danger">Error generating note review: ${error.message}</p>`;
    }
}

export async function convertNoteToLatex(noteContent) {
     console.log(`Requesting LaTeX conversion for note content (length: ${noteContent?.length || 0})`);
    if (!noteContent || noteContent.trim() === '') {
        console.warn("convertNoteToLatex: Input note content is empty.");
        return ''; 
    }
     if (!await tokenLimitCheck(noteContent)) {
         throw new Error("Note content is too long for the AI model to process.");
     }

    // The noteContent itself is the user message.
    // The system prompt 'noteToLatexConverter' will instruct the AI on what to do with it.
    const userMessage = `Convert the following text content into a well-formatted LaTeX document body. Ensure mathematical expressions are correctly preserved or converted to LaTeX math environments. Use standard LaTeX commands for formatting. Return ONLY the LaTeX code for the document body, do not include \\documentclass, \\usepackage, \\begin{document}, or \\end{document}.\n\n**Original Text:**\n---\n${noteContent}\n---`;

    try {
        showLoading("Converting to LaTeX...");
        const latexCode = await callGeminiTextAPI(userMessage, null, 'noteToLatexConverter');
        hideLoading();
        let cleanedCode = latexCode.replace(/\\documentclass\[.*?\]{.*?}\s*/gs, '');
        cleanedCode = cleanedCode.replace(/\\usepackage{.*?}\s*/gs, '');
        cleanedCode = cleanedCode.replace(/\\begin{document}\s*/gs, '');
        cleanedCode = cleanedCode.replace(/\\end{document}\s*/gs, '');
        cleanedCode = cleanedCode.replace(/```latex\n?([\s\S]*?)\n?```/gs, '$1');
        cleanedCode = cleanedCode.trim();
        return cleanedCode;
    } catch (error) {
        console.error("Error converting note to LaTeX:", error); hideLoading();
        throw new Error(`Failed to convert to LaTeX: ${error.message}`);
    }
}

export async function improveNoteWithAI(noteContent) {
      console.log(`Requesting AI improvement for note (length: ${noteContent?.length || 0})`);
     if (!noteContent || noteContent.trim() === '') {
         console.warn("improveNoteWithAI: Input note content is empty.");
         return noteContent; 
     }
      if (!await tokenLimitCheck(noteContent)) {
          throw new Error("Note content is too long for the AI model to process.");
      }

    // User message contains the note. System prompt 'noteImprover' guides the AI.
    const userMessage = `Review the following student's note and enhance it by adding clarity, improving structure, and incorporating any relevant key equations or formulas that might be missing based on the context. **Crucially, DO NOT remove or significantly alter the student's original content.** Append your suggestions, clarifications, or additions clearly, perhaps under a heading like "--- AI SUGGESTIONS ---".\n\n**Student's Original Note:**\n---\n${noteContent}\n---`;

     try {
         showLoading("AI Improving Note...");
         const improvedContent = await callGeminiTextAPI(userMessage, null, 'noteImprover');
         hideLoading();
         return improvedContent; // This should ideally contain original + AI suggestions
     } catch (error) {
         console.error("Error improving note:", error); hideLoading();
         throw new Error(`Failed to improve note: ${error.message}`);
     }
}

export async function extractTextFromImageAndConvertToLatex(base64ImageData) {
      console.log("Requesting image OCR and LaTeX conversion...");
     if (!base64ImageData) {
          console.error("No image data provided for OCR.");
          return "";
     }

     // Instruction for Vision API is part of the prompt parts.
     // System prompt key 'imageToLatexConverter' could be used to fetch the text part if this were a text call.
     // For Vision, we embed it directly.
     const instructionText = DEFAULT_AI_SYSTEM_PROMPTS.imageToLatexConverter || "You are an expert OCR tool. Extract text/math from image and convert to LaTeX.";

     const promptParts = [
          { text: `${instructionText}\n\nAnalyze the following image, extract all text and mathematical equations accurately, and then convert the entire extracted content into well-formatted LaTeX. Preserve the structure and mathematical notation. Return ONLY the raw LaTeX code.` },
          { inlineData: { mimeType: "image/jpeg", data: base64ImageData } }
     ];

     try {
          showLoading("AI Analyzing Image for LaTeX...");
          // callGeminiVisionAPI does not use systemPromptKey system currently
          const latexResult = await callGeminiVisionAPI(promptParts);
          hideLoading();
          let cleanedLatex = latexResult.replace(/```latex\n?([\s\S]*?)\n?```/gs, '$1').trim();
          console.log("Image OCR to LaTeX successful.");
          return cleanedLatex;
     } catch (error) {
          hideLoading();
          console.error("Error during image OCR/LaTeX conversion:", error);
          throw new Error(`Failed image processing: ${error.message}`);
     }
}
// --- END OF FILE ai_integration.js ---