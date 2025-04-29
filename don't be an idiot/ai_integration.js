// --- START OF FILE ai_integration.js ---

// ai_integration.js

import { GEMINI_API_KEY, PDF_WORKER_SRC, COURSE_TRANSCRIPTION_BASE_PATH } from './config.js'; // Import the API key & PDF Worker Source & Transcription Path
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Import UI helpers & escapeHtml
import { globalCourseDataMap } from './state.js'; // Need course data map
// *** NEW: Import getSrtFilenameFromTitle from ui_course_study_material ***
import { getSrtFilenameFromTitle } from './ui_course_study_material.js'; // Import SRT filename helper
// NEW: Import function to send feedback to admin
import { submitFeedback } from './firebase_firestore.js';
import { currentUser } from './state.js'; // Need currentUser for feedback

// Dynamically get the SDK object if it loaded successfully
let GoogleGenerativeAI;
try {
    const genAIModule = await import('https://unpkg.com/@google/generative-ai?module');
    GoogleGenerativeAI = genAIModule.GoogleGenerativeAI;
} catch (e) {
    console.error("Google AI SDK class not found. AI Features disabled.", e);
}

// PDF.js library (dynamically check if loaded - needed for PDF text extraction)
let pdfjsLib = window.pdfjsLib;

// Define models (Consider using latest stable or appropriate versions)
const TEXT_MODEL_NAME = "gemini-2.5-pro-exp-03-25"; // Use flash for speed/cost effectiveness
const VISION_MODEL_NAME = "gemini-2.5-pro-exp-03-25"; // Use a model supporting multimodal input // No flash equivalent yet

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
        console.log(`fetchSrtText: Extracted text from SRT: ${url}`);
        return extractedText;
    } catch (error) {
        console.error(`Error fetching/parsing SRT file (${url}):`, error);
        return null;
    }
}

// --- Helper: Extract Text from ALL pages of a PDF ---
// Make this globally available for study material UI too
export async function getAllPdfTextForAI(pdfPath) {
    // Ensure PDF.js library is available
    if (typeof pdfjsLib === 'undefined') {
        console.error("PDF.js library is not loaded. Cannot extract text from PDF.");
        if (window.pdfjsLib) { pdfjsLib = window.pdfjsLib; console.log("Accessed PDF.js from window scope."); }
        else { alert("PDF processing library (PDF.js) is not available."); return null; }
    }
     if (!pdfPath) return null; // No path provided

    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
    let pdfText = "";
    console.log(`Attempting to extract text from all pages of PDF: ${pdfPath}`);
    try {
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;
        console.log(`Extracting text from ${numPages} pages...`);
        // Removed arbitrary page limit - let Gemini handle token limits
        // const maxPagesToProcess = 50; // Adjust this limit as needed
        // const pagesToProcess = Math.min(numPages, maxPagesToProcess);
        // if (numPages > maxPagesToProcess) { console.warn(`PDF text extraction limited to first ${maxPagesToProcess} pages.`); }

        for (let i = 1; i <= numPages; i++) {
            try {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                // Improved extraction: Handle potential empty strings and join items intelligently
                const pageText = textContent.items.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
                if (pageText) {
                     pdfText += pageText + "\n\n"; // Add double newline for paragraph separation
                }
            } catch (pageError) { console.warn(`Error extracting text from page ${i} of ${pdfPath}:`, pageError); }
        }
        console.log(`Finished text extraction. Total length: ${pdfText.length}`);
        return pdfText.trim(); // Trim final result
    } catch (error) {
        console.error(`Error extracting text from PDF ${pdfPath}:`, error);
        return null; // Return null if extraction fails
    }
}
window.getAllPdfTextForAI = getAllPdfTextForAI; // Assign to window scope

// Define character limit based on approximate token limit (e.g., ~3M chars for 1M tokens)
const MAX_INPUT_CHARACTERS = 2500000; // Adjust based on observed model limits

// --- API Call Helpers ---
export async function callGeminiTextAPI(prompt) {
    if (!GoogleGenerativeAI) throw new Error("AI SDK failed to load.");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY") throw new Error("API Key not configured.");

    // Check prompt length before sending
    if (prompt.length > MAX_INPUT_CHARACTERS) {
         console.error(`Prompt length (${prompt.length}) exceeds character limit (${MAX_INPUT_CHARACTERS}). Aborting API call.`);
         // Send feedback to admin about exceeding the limit
         const feedbackData = {
             subjectId: "AI Context Limit Exceeded",
             questionId: null, // Or include relevant course/chapter if possible
             feedbackText: `AI call aborted because input context length (${prompt.length} chars) exceeded the approximate limit (${MAX_INPUT_CHARACTERS} chars). Source function: [Identify function, e.g., generateFormulaSheet]`,
             context: `User ID: ${currentUser?.uid}. Prompt Start: ${prompt.substring(0, 100)}...`
         };
         await submitFeedback(feedbackData, currentUser || { uid: 'SYSTEM', email: 'N/A' });
         throw new Error(`The chapter material (length: ${prompt.length} characters) is too large for the AI to process fully. Feedback has been sent to the admin.`);
    }


    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: TEXT_MODEL_NAME });
        console.log(`Sending TEXT prompt to Gemini (${TEXT_MODEL_NAME}). Length: ${prompt.length}`);
        // Basic safety settings (adjust as needed)
        const safetySettings = [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ];
        // Add generation config
        const generationConfig = {
            temperature: 0.6, // Slightly lower temp for more focused generation
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192, // Increase max output tokens if needed
        };

        const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], safetySettings, generationConfig });
        const response = result.response; // Access response directly

        // Check for blocking first
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
          // Check finishReason for other issues like MAX_TOKENS
          if (response.candidates[0].finishReason === 'MAX_TOKENS') {
               console.warn("Gemini response stopped due to MAX_TOKENS limit.");
               // Return truncated text but warn the user
               // alert("Warning: The AI response may have been cut short due to length limits.");
          } else if (response.candidates[0].finishReason && response.candidates[0].finishReason !== 'STOP') {
               console.warn(`Gemini response finished with reason: ${response.candidates[0].finishReason}`);
          }

         if (!response.candidates[0].content?.parts?.[0]?.text) {
              console.warn("Could not extract text from Gemini response structure:", response);
              throw new Error("AI response format unclear or content missing.");
         }

        const text = response.candidates[0].content.parts[0].text;
        console.log("Received AI text response.");
        return text;
    } catch (error) {
        console.error("Error calling Gemini Text API:", error);
        let errorMessage = `Gemini API Error: ${error.message || 'Unknown error'}.`;
        if (error.message?.toLowerCase().includes('api key not valid')) { errorMessage = "Invalid API Key."; }
        else if (error.message?.includes('quota')) { errorMessage = "Quota exceeded."; }
        else if (error.message?.includes('safety settings')) { /* Already specific */ }
        else if (error.toString().includes('API key not valid')) { errorMessage = "Invalid API Key."; }
        throw new Error(errorMessage); // Re-throw handled error
    }
}

export async function callGeminiVisionAPI(promptParts) {
    if (!GoogleGenerativeAI) throw new Error("AI SDK failed to load.");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY") throw new Error("API Key not configured.");
    if (!promptParts?.length) throw new Error("Prompt parts cannot be empty.");

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
function formatResponseAsHtml(rawText) {
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

    // Handle ordered lists (number. ) - This needs refinement to handle nested/complex lists
    // Simple approach: Convert each line starting with 'number.' to an <li> item
    // This won't create proper nested <ol> structure but works for basic lists.
    escapedText = escapedText.replace(/^\s*(\d+)\.\s+(.*)/gm, '<li>$2</li>');
    // Wrap consecutive <li> generated above with <ol>
    escapedText = escapedText.replace(/(<li>.*<\/li>\s*)+/g, (match) => `<ol style="list-style:decimal;margin-left:1.5em;">${match}</ol>`);

    // Handle unordered lists (* or -) - Similar simple approach
    escapedText = escapedText.replace(/^\s*[\*\-]\s+(.*)/gm, '<li>$1</li>');
    // Wrap consecutive <li> generated above with <ul>
    escapedText = escapedText.replace(/(<li>.*<\/li>\s*)+/g, (match) => `<ul style="list-style:disc;margin-left:1.5em;">${match}</ul`);


    // Handle paragraphs/line breaks - Replace remaining single newlines with <br>, but not inside lists or pre
    let lines = escapedText.split('\n');
    let inList = false;
    let inPre = false;
    let processedLines = lines.map(line => {
        let trimmedLine = line.trim();
        if (trimmedLine.startsWith('<pre>')) inPre = true;
        if (trimmedLine.startsWith('<ol') || trimmedLine.startsWith('<ul')) inList = true;

        let outputLine = line;
        // Add <br> only if it's a non-empty line, not inside pre/list tags, and not already a list item start/end
        if (!inPre && !inList && trimmedLine.length > 0 && !trimmedLine.startsWith('<li') && !trimmedLine.endsWith('</li>')) {
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
         const explanationText = await callGeminiTextAPI(prompt);
         hideLoading();
         return formatResponseAsHtml(explanationText);
     } catch (error) {
         console.error("Error in getAIExplanation:", error); hideLoading();
         return `<p class="text-danger">Error generating explanation: ${error.message}</p>`;
     }
}

export async function explainStudyMaterialSnippet(snippet, context) {
    console.log(`Requesting explanation for snippet/question: "${snippet.substring(0, 50)}..." with context length: ${context?.length || 0}`);
    if (!snippet) return `<p class="text-warning">No text provided.</p>`;
    const isLikelyQuestion = snippet.length < 200; let prompt;
    // MODIFIED: Removed context truncation limit here
    if (isLikelyQuestion && context?.length > 500) {
         prompt = `You are a helpful physics and mathematics tutor. Based *only* on the following text extracted from study material, please answer the user's question clearly and concisely:\n\nUser Question: "${snippet}"\n\nStudy Material Text (Use ONLY this):\n---\n${context}\n---\nEnd Context.\n\nAnswer based *only* on the provided text. Use basic Markdown/LaTeX ($$, $). If the context doesn't contain the answer, state that explicitly. No headings (#).`;
    } else {
         prompt = `You are a helpful physics and mathematics tutor. Explain the following text snippet clearly:\n\nSnippet: "${snippet}"\n\nContext: "${context || 'None provided.'}"\n\nProvide an explanation suitable for someone studying this topic. Use basic Markdown/LaTeX ($$, $). No headings (#).`;
    }
    try {
        showLoading("Generating Explanation..."); const explanationText = await callGeminiTextAPI(prompt); hideLoading();
        return formatResponseAsHtml(explanationText);
    } catch (error) {
        console.error("Error explaining snippet:", error); hideLoading();
        return `<p class="text-danger">Error: ${error.message}</p>`;
    }
}

export async function getExplanationForPdfSnapshot(userQuestion, base64ImageData, context) {
    console.log(`Requesting AI explanation for PDF snapshot (Context: ${context})`);
    if (!userQuestion) return `<p class="text-warning">No question provided.</p>`;
    if (!base64ImageData) return `<p class="text-warning">No image data.</p>`;
    try {
        const promptParts = [ { text: `You are a helpful physics and mathematics tutor. Explain the content shown in this image of a PDF page, specifically addressing the following question. Context: ${context}. Question: "${userQuestion}". Focus explanation on visible content. Use basic Markdown/LaTeX ($$, $). No headings (#).` }, { inlineData: { mimeType: "image/jpeg", data: base64ImageData } } ];
        showLoading("Analyzing PDF Page Image..."); const explanationText = await callGeminiVisionAPI(promptParts); hideLoading();
        return formatResponseAsHtml(explanationText);
    } catch (error) {
        console.error("Error explaining PDF snapshot:", error); hideLoading();
        return `<p class="text-danger">Error: ${error.message}</p>`;
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

     // MODIFIED: Removed truncation - rely on callGeminiTextAPI check
     // const maxContentLength = 80000; let truncatedContent = combinedContent;
     // if (combinedContent.length > maxContentLength) { truncatedContent = combinedContent.substring(0, maxContentLength) + "\n...[Truncated]"; console.warn(`Combined content truncated.`); }

     const prompt = `You are an expert physics and mathematics assistant. Based ONLY on the following combined text content (from ${contentSourceInfo}) for Chapter ${chapterNum}, extract ALL key formulas, equations, physical laws, and important definitions. Present them clearly and concisely as a comprehensive formula sheet. Use basic Markdown (bold, lists) and LaTeX ($...$ or $$...$$). Do NOT include explanations, derivations, or examples. Focus strictly on presenting the formulas and definitions. Organize logically if possible.

Combined Text Content for Chapter ${chapterNum}:
---
${combinedContent}
---
End of Combined Text Content.

Generate the comprehensive formula sheet now for Chapter ${chapterNum}:`;

     try {
         showLoading(`Generating Formula Sheet (Ch ${chapterNum})...`); const formulaSheetText = await callGeminiTextAPI(prompt); hideLoading();
         return formatResponseAsHtml(formulaSheetText);
     } catch (error) {
         console.error(`Error generating formula sheet for Ch ${chapterNum}:`, error); hideLoading();
         return `<p class="text-danger">Error: ${error.message}</p>`;
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

    // MODIFIED: Removed truncation
    // const maxContentLength = 80000; let truncatedContent = combinedContent;
    // if (combinedContent.length > maxContentLength) { truncatedContent = combinedContent.substring(0, maxContentLength) + "\n...[Truncated]"; console.warn(`Combined content truncated.`); }

    const prompt = `You are an expert physics and mathematics assistant. Based ONLY on the following combined text content (from ${contentSourceInfo}) for Chapter ${chapterNum}, write a clear, concise, and comprehensive summary of the chapter. Focus on the main concepts, key ideas, and important points. Use clear language suitable for a student review. Organize the summary logically, using bullet points or short paragraphs as appropriate. You may include simple LaTeX math ($...$ or $$...$$) for equations, but do NOT include a formula sheet or list all formulas. Do NOT copy large blocks of text verbatim. Do NOT include quiz questions or exam content.\n\nCombined Text Content for Chapter ${chapterNum}:\n---\n${combinedContent}\n---\nEnd of Combined Text Content.\n\nGenerate the summary now for Chapter ${chapterNum}:`;

    try {
        showLoading(`Generating Summary (Ch ${chapterNum})...`); const summaryText = await callGeminiTextAPI(prompt); hideLoading();
        return formatResponseAsHtml(summaryText);
    } catch (error) {
        console.error(`Error generating summary for Ch ${chapterNum}:`, error); hideLoading();
        return `<p class="text-danger">Error: ${error.message}</p>`;
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

    // MODIFIED: Removed truncation
    // const maxContentLength = 80000; let truncatedContent = combinedContent;
    // if (combinedContent.length > maxContentLength) { truncatedContent = combinedContent.substring(0, maxContentLength) + "\n...[Truncated]"; console.warn(`Combined content truncated for skip exam generation.`); }

     try {
         const requestedMCQs = 10; // Generate a reasonable number of MCQs
         const prompt = `You are a physics and mathematics assessment expert creating a multiple-choice quiz for Chapter ${chapterNum}. Base the questions *strictly* on the provided study material text below.

Generate exactly ${requestedMCQs} challenging multiple-choice questions covering key concepts, definitions, and formulas from the text ONLY. Ensure questions require understanding, not just recall.

For EACH of the ${requestedMCQs} questions:
1. Write the question text clearly, starting with the question number (e.g., "1. Question text...").
2. Provide 4 distinct answer options (labeled A, B, C, D).
3. Ensure only ONE option is definitively correct based *only* on the provided text. Avoid ambiguity.
4. Indicate the correct answer on a **separate new line** immediately following the options using the exact format: "ans: [Correct Letter]".

**IMPORTANT:**
- Adhere strictly to the provided text content. Do not introduce external knowledge.
- Ensure every question has exactly 4 options (A, B, C, D).
- Ensure every question is followed immediately by the "ans: [Letter]" line.
- Number questions sequentially from 1 to ${requestedMCQs}.

Study Material Text for Chapter ${chapterNum}:
---
${combinedContent}
---
End of Study Material Text.

Generate the ${requestedMCQs} quiz questions now in the specified format:`;

         showLoading(`Generating Skip Exam MCQs (Ch ${chapterNum})...`);
         const examText = await callGeminiTextAPI(prompt);
         hideLoading();
         console.log(`Raw Skip Exam Text (MCQs Only) for Ch ${chapterNum}:\n`, examText);

         // Basic validation check
         const questionBlocksFound = (examText.match(/^\s*\d+[\.\)]\s+.*\n([\s\S]*?)^ans:\s*[A-D]\s*$/gm) || []).length;
         console.log(`Validation: Found ${questionBlocksFound} potential MCQ blocks.`);
         if (questionBlocksFound < requestedMCQs * 0.7) {
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

    const courseDef = globalCourseDataMap.get(courseId); if (!courseDef) { hideLoading(); return `<p class="text-danger">Course definition not found.</p>`; }
    const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
    const pdfPath = chapterResources.pdfPath || courseDef.pdfPathPattern?.replace('{num}', chapterNum);
    const lectureUrls = (chapterResources.lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title);

    let transcriptionText = null; let fullPdfText = null;

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
    // MODIFIED: Removed context truncation limits
    if (transcriptionText) combinedSourceContent += `== Lecture Transcriptions ==\n${transcriptionText}\n\n`;
    if (fullPdfText) combinedSourceContent += `== Chapter PDF Text ==\n${fullPdfText}\n\n`;
    combinedSourceContent += `== End of Source Material ==`;

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
        console.error(`Error reviewing note for Ch ${chapterNum}:`, error); hideLoading();
        return `<p class="text-danger">Error generating note review: ${error.message}</p>`;
    }
}


/**
 * Asks the AI to convert provided text (potentially including LaTeX) into well-formatted LaTeX.
 */
export async function convertNoteToLatex(noteContent) {
    console.log(`Requesting LaTeX conversion for note content (length: ${noteContent.length})`);
    if (!noteContent) return '';

    // MODIFIED: Simpler prompt, focuses only on the conversion.
    const prompt = `Convert the following text, which may contain inline or display LaTeX math delimiters ($ $, $$ $$), into a clean LaTeX document body. Ensure existing LaTeX math is preserved correctly. Convert simple formatting like bold or italics if appropriate. Do not add a document preamble (\\documentclass, \\usepackage, etc.) or \\begin{document} / \\end{document}. Return ONLY the converted body content.

**Original Text:**
---
${noteContent}
---

LaTeX body code:`;

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
        throw new Error(`Failed to convert to LaTeX: ${error.message}`);
    }
}

// MODIFIED: improveNoteWithAI function (for point 9)
/**
 * Asks the AI to improve a note by adding details, clarifications, or relevant equations.
 */
export async function improveNoteWithAI(noteContent) {
    console.log(`Requesting AI improvement for note content (length: ${noteContent.length})`);
    if (!noteContent) return '';

    // MODIFIED: Prompt focuses on *adding* to the note
    const prompt = `You are a physics and mathematics tutor. Review the following student note and provide **additive** improvements. Identify areas that could be clearer, more detailed, or benefit from adding relevant equations or examples. Present your suggestions or additions clearly, perhaps under headings like "### Clarifications" or "### Additional Details/Formulas". **Do NOT rewrite the original note section.** Append your suggestions after the original note.

**Original Note:**
---
${noteContent.substring(0, 15000)} ${noteContent.length > 15000 ? "...[Truncated]" : ""}
---

**AI Suggestions/Additions:**
[Your suggestions/additions based on the original note go here]`;

    try {
        showLoading("Improving note with AI...");
        const suggestions = await callGeminiTextAPI(prompt);
        hideLoading();
        // Append the suggestions to the original content
        return `${noteContent}\n\n---\n**AI Suggestions:**\n${suggestions}`;
    } catch (error) {
        console.error("Error improving note with AI:", error);
        hideLoading();
        throw new Error(`Failed to improve note: ${error.message}`);
    }
}


// --- END OF FILE ai_integration.js ---