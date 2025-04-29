// --- START OF FILE ai_integration.js ---

// ai_integration.js

import { GEMINI_API_KEY, PDF_WORKER_SRC, COURSE_TRANSCRIPTION_BASE_PATH } from './config.js'; // Import the API key & PDF Worker Source
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Import UI helpers & escapeHtml

import { globalCourseDataMap } from './state.js'; // Need course data map and transcription path

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
const TEXT_MODEL_NAME = "gemini-2.5-pro-exp-03-25"; // Use flash for speed/cost balance
const VISION_MODEL_NAME = "gemini-2.5-pro-exp-03-25"; // Flash now supports vision

// --- Helper: Fetch Text File (SRT Parser) ---
// Function to get the expected SRT filename from a video title (preserves spaces)
export function getSrtFilenameFromTitle(title) {
     if (!title) return null;
     // Remove characters invalid for filenames, replace others like spaces with underscores
     const cleanedTitle = title
         .replace(/[<>:"\/\\|?*]+/g, '') // Remove strictly invalid chars
         .replace(/\s+/g, '_')           // Replace spaces with underscores
         .trim();
     return `${cleanedTitle}.srt`;
}

export async function fetchSrtText(url) {
    // Fetches SRT and returns only the text lines concatenated
    try {
        // Basic sanitization/encoding for the URL path part only
        const urlParts = url.split('/');
        const filename = urlParts.pop();
        const basePath = urlParts.join('/');
        // Ensure filename is not empty before encoding
        if (!filename) {
            console.error(`fetchSrtText: Invalid filePath, unable to extract filename: ${url}`);
            return null; // Return null instead of empty array on critical path error
        }
        const encodedFilename = encodeURIComponent(filename); // Encode just the filename
        const safeUrl = `${basePath}/${encodedFilename}?t=${new Date().getTime()}`; // Reconstruct URL

        console.log(`fetchSrtText: Fetching from ${safeUrl} (Original: ${url})`);

        const response = await fetch(safeUrl); // Use potentially encoded URL
        if (!response.ok) {
             if (response.status === 404) {
                 console.warn(`fetchSrtText: File not found at ${safeUrl}. Returning null.`);
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
     if (!pdfPath) { console.warn("getAllPdfTextForAI: No PDF path provided."); return null; }

    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
    let pdfText = "";
    console.log(`Attempting to extract text from all pages of PDF: ${pdfPath}`);
    try {
        // Correctly encode the path before passing to getDocument
        const encodedPdfPath = encodeURI(pdfPath);
        const loadingTask = pdfjsLib.getDocument(encodedPdfPath);

        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;
        console.log(`Extracting text from ${numPages} pages...`);
        const maxPagesToProcess = 150; // Increased limit, adjust based on performance/cost
        const pagesToProcess = Math.min(numPages, maxPagesToProcess);
        if (numPages > maxPagesToProcess) { console.warn(`PDF text extraction limited to first ${maxPagesToProcess} pages.`); }

        for (let i = 1; i <= pagesToProcess; i++) {
            try {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                textContent.items.forEach(item => { pdfText += item.str + " "; });
                pdfText += "\n"; // Add newline between pages for structure
            } catch (pageError) { console.warn(`Error extracting text from page ${i} of ${pdfPath}:`, pageError); }
        }
        console.log(`Finished text extraction. Total length: ${pdfText.length}`);
        return pdfText.trim(); // Trim leading/trailing whitespace
    } catch (error) {
        console.error(`Error extracting text from PDF ${pdfPath} (Encoded: ${encodedPdfPath}):`, error);
        return null; // Return null if extraction fails
    }
}
window.getAllPdfTextForAI = getAllPdfTextForAI; // Assign to window scope


// --- API Call Helpers ---
export async function callGeminiTextAPI(prompt, modelName = TEXT_MODEL_NAME) {
    if (!GoogleGenerativeAI) throw new Error("AI SDK failed to load.");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY") throw new Error("API Key not configured.");
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName }); // Use specified model
        console.log(`Sending TEXT prompt to Gemini (${modelName}). Length: ${prompt.length}`);
        // Basic safety settings (adjust as needed)
        const safetySettings = [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ];
        // Generation Config (Example - adjust temperature etc. as needed)
        const generationConfig = {
             temperature: 0.7, // Controls randomness (0=deterministic, 1=max random)
             topP: 0.95,
             topK: 40,
             // maxOutputTokens: 8192, // Set if needed, flash has a large context window
        };

        const result = await model.generateContent({
             contents: [{ role: "user", parts: [{ text: prompt }] }],
             safetySettings,
             generationConfig
        });
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
         if (response.candidates[0].finishReason && response.candidates[0].finishReason !== 'STOP') {
             console.warn(`AI generation finished due to: ${response.candidates[0].finishReason}`);
             if (response.candidates[0].finishReason === 'SAFETY') {
                  throw new Error("AI response blocked due to safety settings.");
             }
             // Allow MAX_TOKENS or OTHER reasons to potentially return partial text
         }
         if (!response.candidates[0].content?.parts?.[0]?.text) {
              // Check if there might be function calls or other parts
              console.warn("Could not extract text from primary Gemini response part:", JSON.stringify(response.candidates[0].content, null, 2));
              // Attempt to join text from multiple parts if they exist
              const allText = response.candidates[0].content?.parts?.map(p => p.text || '').join('') || '';
              if(allText) {
                  console.log("Extracted text by joining multiple parts.");
                  return allText;
              }
              throw new Error("AI response format unclear or text content missing.");
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

async function callGeminiVisionAPI(promptParts) {
    if (!GoogleGenerativeAI) throw new Error("AI SDK failed to load.");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY") throw new Error("API Key not configured.");
    if (!promptParts?.length) throw new Error("Prompt parts cannot be empty.");

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: VISION_MODEL_NAME });
        const logParts = promptParts.map(p => p.inlineData ? '{inlineData: ...}' : p);
        console.log(`Sending VISION prompt (${VISION_MODEL_NAME}):`, logParts);
        // Basic safety settings
        const safetySettings = [
             { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
             { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
             { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
             { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
         ];
        const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }], safetySettings });
        const response = result.response;

        if (response.promptFeedback?.blockReason) { throw new Error(`AI request blocked: ${response.promptFeedback.blockReason}`); }
        if (!response.candidates?.length) { throw new Error("AI response was empty."); }
         if (response.candidates[0].finishReason && response.candidates[0].finishReason !== 'STOP') {
              console.warn(`AI Vision generation finished due to: ${response.candidates[0].finishReason}`);
              if (response.candidates[0].finishReason === 'SAFETY') { throw new Error("AI response blocked due to safety settings."); }
         }
        if (!response.candidates[0].content?.parts?.[0]?.text) {
            const allText = response.candidates[0].content?.parts?.map(p => p.text || '').join('') || '';
            if(allText) { console.log("Extracted vision response text by joining multiple parts."); return allText; }
            throw new Error("AI vision response format unclear or content missing.");
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
// CORRECTED: Added export keyword
export function formatResponseAsHtml(rawText) {
    if (!rawText) return '<p class="text-muted italic">AI did not provide a response.</p>';
    let escapedText = escapeHtml(rawText);
    // Basic Markdown replacements
    escapedText = escapedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Code blocks (simple version)
    escapedText = escapedText.replace(/```(?:[a-zA-Z]+)?\n([\s\S]*?)\n```/g, (m, code) => `<pre><code class="block whitespace-pre-wrap">${escapeHtml(code.trim())}</code></pre>`);
    // Inline code
    escapedText = escapedText.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Ordered lists (simple version, doesn't handle nested)
    escapedText = escapedText.replace(/^\s*(\d+)\.\s+(.*)/gm, (m, n, i) => `<ol start="${n}" style="list-style:decimal;margin-left:1.5em;"><li>${i.trim()}</li></ol>`);
    escapedText = escapedText.replace(/<\/ol>\s*<ol start="\d+"[^>]*>/g, ''); // Merge adjacent lists
    // Unordered lists (simple version, doesn't handle nested)
    escapedText = escapedText.replace(/^\s*[\*\-]\s+(.*)/gm, (m, i) => `<ul style="list-style:disc;margin-left:1.5em;"><li>${i.trim()}</li></ul>`);
    escapedText = escapedText.replace(/<\/ul>\s*<ul[^>]*>/g, ''); // Merge adjacent lists
    // Handle line breaks - convert newlines to <br> unless inside <pre> or after list/block tags
    let lines = escapedText.split('\n');
    let insidePre = false;
    let htmlWithBreaks = lines.map(line => {
        if (line.includes('<pre>')) insidePre = true;
        const preEndMatch = /<\/pre>/.exec(line);
        const isEndOfPre = preEndMatch && (preEndMatch.index + 6 >= line.length);
        let processedLine = line;
        // Add <br> only if line is not empty, not inside <pre>, and not already a block element start/end
        if (!insidePre && line.trim() !== '' && !/^\s*<[ou]l|^\s*<li|<\/[ou]l|<\/li>|<h[1-6]>|<\/h[1-6]>|<\/?p>|<\/?pre>/.test(line)) {
            processedLine += '<br>';
        }
        if (insidePre && isEndOfPre) insidePre = false;
        return processedLine;
    }).join('');
    // Remove redundant <br> tags before closing block elements
    htmlWithBreaks = htmlWithBreaks.replace(/(<\/(?:pre|ol|ul|li|h[1-6]|p)>)<br>/g, '$1');
    // Remove trailing <br>
    htmlWithBreaks = htmlWithBreaks.replace(/<br>\s*$/g, '');

    return `<div class="prose prose-sm dark:prose-invert max-w-none leading-relaxed">${htmlWithBreaks}</div>`;
}


// --- AI Functions ---
export async function getAIExplanation(questionData) {
     console.log("Attempting to get AI explanation for:", questionData);
     try {
         let prompt = `You are a helpful physics and mathematics tutor. Explain the following multiple-choice question clearly and concisely:\n\n`;
         prompt += `**Question:**\n${questionData.questionText}\n\n`;
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
         return formatResponseAsHtml(explanationText); // Use exported formatter
     } catch (error) {
         console.error("Error in getAIExplanation:", error); hideLoading();
         return `<p class="text-danger">Error generating explanation: ${error.message}</p>`;
     }
}

export async function explainStudyMaterialSnippet(snippet, context) {
    console.log(`Requesting explanation for snippet/question: "${snippet.substring(0, 50)}..." with context length: ${context?.length || 0}`);
    if (!snippet) return `<p class="text-warning">No text provided.</p>`;
    const isLikelyQuestion = snippet.length < 200; let prompt;
    if (isLikelyQuestion && context?.length > 500) {
         prompt = `You are a helpful physics and mathematics tutor. Based *only* on the following text extracted from study material, please answer the user's question clearly and concisely:\n\nUser Question: "${snippet}"\n\nStudy Material Text (Use ONLY this):\n---\n${context.substring(0, 15000)} ${context.length > 15000 ? "...[Truncated]" : ""}\n---\nEnd Context.\n\nAnswer based *only* on the provided text. Use basic Markdown/LaTeX ($$, $). If the context doesn't contain the answer, state that explicitly. No headings (#).`;
    } else {
         prompt = `You are a helpful physics and mathematics tutor. Explain the following text snippet clearly:\n\nSnippet: "${snippet}"\n\nContext: "${context || 'None provided.'}"\n\nProvide an explanation suitable for someone studying this topic. Use basic Markdown/LaTeX ($$, $). No headings (#).`;
    }
    try {
        showLoading("Generating Explanation..."); const explanationText = await callGeminiTextAPI(prompt); hideLoading();
        return formatResponseAsHtml(explanationText); // Use exported formatter
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
        return formatResponseAsHtml(explanationText); // Use exported formatter
    } catch (error) {
        console.error("Error explaining PDF snapshot:", error); hideLoading();
        return `<p class="text-danger">Error: ${error.message}</p>`;
    }
}

/**
 * Generates a formula sheet for a specific chapter using AI.
 * Returns the generated text content (not HTML formatted).
 * @param {string} courseId
 * @param {number} chapterNum
 * @returns {Promise<string|null>} - The raw text of the formula sheet or null on error.
 */
export async function generateFormulaSheet(courseId, chapterNum) {
     console.log(`Generating formula sheet for Course ${courseId}, Chapter ${chapterNum}`);
     showLoading(`Gathering content for Ch ${chapterNum} Formula Sheet...`);
     const courseDef = globalCourseDataMap.get(courseId); if (!courseDef) { hideLoading(); throw new Error("Course definition not found."); }
     const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
     const pdfPath = courseDef.pdfPathPattern?.replace('{num}', chapterNum);
     const lectureUrls = (chapterResources.lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title);

     let transcriptionText = null; let fullPdfText = null; let contentSourceInfo = "";

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
         if (combinedTranscription) { transcriptionText = combinedTranscription.trim(); contentSourceInfo += "Lecture Transcriptions; "; }
     }
     // Extract PDF Text
     if (pdfPath) {
         fullPdfText = await getAllPdfTextForAI(pdfPath);
         if (fullPdfText) { contentSourceInfo += "Chapter PDF Text; "; }
     }

     if (contentSourceInfo) contentSourceInfo = contentSourceInfo.slice(0, -2); else contentSourceInfo = "No text sources found";
     if (!transcriptionText && !fullPdfText) { hideLoading(); throw new Error(`No text content available for Ch ${chapterNum}.`); }

     let combinedContent = `Content for Chapter ${chapterNum} (Sources: ${contentSourceInfo}):\n\n`;
     if (transcriptionText) combinedContent += `== Lecture Transcriptions ==\n${transcriptionText}\n\n`;
     if (fullPdfText) combinedContent += `== Chapter PDF Text ==\n${fullPdfText}\n\n`;
     combinedContent += `== End of Content ==`;

     const maxContentLength = 150000;
     let truncatedContent = combinedContent;
     if (combinedContent.length > maxContentLength) { truncatedContent = combinedContent.substring(0, maxContentLength) + "\n...[Truncated]"; console.warn(`Combined content truncated to ${maxContentLength} chars.`); }

     const prompt = `You are an expert physics and mathematics assistant. Based ONLY on the following combined text content (from ${contentSourceInfo}) for Chapter ${chapterNum}, extract ALL key formulas, equations, physical laws, and important definitions. Present them clearly and concisely as a comprehensive formula sheet. Use basic Markdown (bold, lists) and LaTeX ($...$ or $$...$$). Do NOT include explanations, derivations, or examples. Focus strictly on presenting the formulas and definitions. Organize logically if possible.

Combined Text Content for Chapter ${chapterNum}:
---
${truncatedContent}
---
End of Combined Text Content.

Generate the comprehensive formula sheet now for Chapter ${chapterNum}:`;

     try {
         showLoading(`Generating Formula Sheet (Ch ${chapterNum})...`);
         const formulaSheetText = await callGeminiTextAPI(prompt);
         hideLoading();
         return formulaSheetText; // Return raw text
     } catch (error) {
         console.error(`Error generating formula sheet for Ch ${chapterNum}:`, error);
         hideLoading();
         throw error; // Re-throw error to be handled by caller
     }
}

/**
 * Generates a chapter summary using AI.
 * Returns the generated text content.
 * @param {string} courseId
 * @param {number} chapterNum
 * @returns {Promise<string|null>} - The raw text of the summary or null on error.
 */
export async function generateChapterSummary(courseId, chapterNum) {
     console.log(`Generating summary for Course ${courseId}, Chapter ${chapterNum}`);
     showLoading(`Gathering content for Ch ${chapterNum} Summary...`);
     const courseDef = globalCourseDataMap.get(courseId); if (!courseDef) { hideLoading(); throw new Error("Course definition not found."); }
     const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
     const pdfPath = courseDef.pdfPathPattern?.replace('{num}', chapterNum);
     const lectureUrls = (chapterResources.lectureUrls || []).filter(lec => typeof lec === 'object' && lec.url && lec.title);

     let transcriptionText = null; let fullPdfText = null; let contentSourceInfo = "";

     // Fetch Transcription(s)
     if (lectureUrls.length > 0) {
          let combinedTranscription = "";
          for (const lec of lectureUrls) { const srtFilename = getSrtFilenameFromTitle(lec.title); if (srtFilename) { const transPath = `${COURSE_TRANSCRIPTION_BASE_PATH}${srtFilename}`; const text = await fetchSrtText(transPath); if (text) combinedTranscription += text + "\n\n"; } }
          if (combinedTranscription) { transcriptionText = combinedTranscription.trim(); contentSourceInfo += "Lecture Transcriptions; "; }
     }
     // Extract PDF Text
     if (pdfPath) {
          fullPdfText = await getAllPdfTextForAI(pdfPath);
          if (fullPdfText) { contentSourceInfo += "Chapter PDF Text; "; }
     }

     if (contentSourceInfo) contentSourceInfo = contentSourceInfo.slice(0, -2); else contentSourceInfo = "No text sources found";
     if (!transcriptionText && !fullPdfText) { hideLoading(); throw new Error(`No text content available for Ch ${chapterNum}.`); }

     let combinedContent = `Content for Chapter ${chapterNum} (Sources: ${contentSourceInfo}):\n\n`;
     if (transcriptionText) combinedContent += `== Lecture Transcriptions ==\n${transcriptionText}\n\n`;
     if (fullPdfText) combinedContent += `== Chapter PDF Text ==\n${fullPdfText}\n\n`;
     combinedContent += `== End of Content ==`;

     const maxContentLength = 150000;
     let truncatedContent = combinedContent;
     if (combinedContent.length > maxContentLength) { truncatedContent = combinedContent.substring(0, maxContentLength) + "\n...[Truncated]"; console.warn(`Summary content truncated.`); }

     const prompt = `You are an expert physics and mathematics assistant. Based ONLY on the following combined text content (from ${contentSourceInfo}) for Chapter ${chapterNum}, generate a concise yet comprehensive summary of the key concepts, principles, and important takeaways. Aim for clarity and readability suitable for a student reviewing the chapter. Use basic Markdown (like headings ##, bold **, lists *) for structure. Do NOT include specific formulas unless essential to the concept explanation.

Combined Text Content for Chapter ${chapterNum}:
---
${truncatedContent}
---
End of Combined Text Content.

Generate the chapter summary now for Chapter ${chapterNum}:`;

     try {
         showLoading(`Generating Summary (Ch ${chapterNum})...`);
         const summaryText = await callGeminiTextAPI(prompt);
         hideLoading();
         return summaryText; // Return raw text
     } catch (error) {
         console.error(`Error generating summary for Ch ${chapterNum}:`, error);
         hideLoading();
         throw error;
     }
}


// --- Skip Exam Generation ---
export async function generateSkipExam(transcriptionContent, chapterPdfContent, chapterNum) {
     console.log(`Generating Skip Exam for Chapter ${chapterNum}`);
     let combinedTextContent = `Study material text content for Physics and/or mathematics Chapter ${chapterNum}:\n\n`;
     let contentSourceInfo = "";
     const maxTextLength = 150000; // Limit context size

     if (transcriptionContent) { combinedTextContent += `== Lecture Transcription Excerpts ==\n${transcriptionContent.substring(0, maxTextLength)}\n\n`; contentSourceInfo += "Lecture Transcription"; }
     if (chapterPdfContent) {
          const remainingLength = maxTextLength - (transcriptionContent?.length || 0);
          if (remainingLength > 5000 || !transcriptionContent) { combinedTextContent += `== Chapter PDF Text Excerpts ==\n${chapterPdfContent.substring(0, remainingLength)}\n\n`; contentSourceInfo += (contentSourceInfo ? "; PDF" : "PDF"); }
          else if (transcriptionContent) { console.log("Skipping PDF content for skip exam due to length constraints after transcription."); }
     }
     combinedTextContent += `== End of Text Content ==`;

     if (!transcriptionContent && !chapterPdfContent) { console.error(`No study material text for Ch ${chapterNum}.`); return null; }
     console.log(`Skip Exam generation using text: ${contentSourceInfo || 'None'}. Length: ${combinedTextContent.length}`);

     try {
         const totalQuestions = 15; // Target total items
         const mcqCount = Math.ceil(totalQuestions / 2); // ~50% MCQs
         const problemCount = totalQuestions - mcqCount; // ~50% Problems

         // Refined Prompt requesting a mix
         const prompt = `You are a physics and mathematics assessment expert creating a quiz for Chapter ${chapterNum}. Base the questions and problems *strictly* on the provided study material text below.

Generate a quiz with EXACTLY the following structure:
1.  **${mcqCount} Multiple-Choice Questions:** Challenging questions covering key concepts, definitions, and formulas from the text ONLY.
2.  **${problemCount} Open-Ended Problems:** Problems requiring calculations, explanations, or application of concepts found ONLY in the provided text.

**Formatting Instructions:**

*   **Multiple-Choice Questions:**
    *   Start each with the question number (e.g., "1. Question text...").
    *   Provide 4 distinct answer options (labeled A, B, C, D).
    *   Ensure only ONE option is definitively correct based *only* on the provided text.
    *   Indicate the correct answer on a **separate new line** immediately following the options using the exact format: "ans: [Correct Letter]".
*   **Open-Ended Problems:**
    *   Start each with the problem number *continuing the sequence* (e.g., if ${mcqCount} MCQs, start problems with "${mcqCount + 1}. Problem text..."). Use the word "Problem" or "P" before the number (e.g., "Problem ${mcqCount + 1}." or "P${mcqCount + 1}.")
    *   Clearly state the problem. If it has parts, label them (a), (b), etc.
    *   Do **NOT** provide an answer or solution for problems.

**IMPORTANT:**
- Adhere strictly to the provided text content. Do not introduce external knowledge.
- Ensure correct numbering sequence across MCQs and problems (1 to ${totalQuestions}).
- Follow the specified formatting precisely for both types.

Study Material Text for Chapter ${chapterNum}:
---
${combinedTextContent.substring(0, maxTextLength)} ${combinedTextContent.length > maxTextLength ? "... [Truncated]" : ""}
---
End of Study Material Text.

Generate the ${mcqCount} MCQs followed by the ${problemCount} Problems now:`;


         showLoading(`Generating AI Skip Exam (Ch ${chapterNum})...`);
         const examText = await callGeminiTextAPI(prompt);
         hideLoading();
         console.log(`Raw Skip Exam Text for Ch ${chapterNum}:\n`, examText); // Log full response

         // Basic validation check - count MCQ answer lines and problem lines
         const mcqBlocksFound = (examText.match(/^\s*\d+[\.\)]\s+.*\n([\s\S]*?)^ans:\s*[A-D]\s*$/gm) || []).length;
         const problemBlocksFound = (examText.match(/^\s*(?:Problem|P)\s*\d+[\.\:\-\)]\s+/gmi) || []).length; // Count lines starting with "Problem X."
         console.log(`Validation: Found ${mcqBlocksFound} potential MCQ blocks and ${problemBlocksFound} potential Problem blocks.`);

         if (mcqBlocksFound < mcqCount * 0.7 || problemBlocksFound < problemCount * 0.7) {
             console.error(`Generated content validation failed. Found only ${mcqBlocksFound}/${mcqCount} expected MCQs and ${problemBlocksFound}/${problemCount} expected problems.`);
             throw new Error("Generated content does not appear to contain enough valid questions/problems. Check AI output or try again.");
         }

         return examText; // Return the raw text for parsing

     } catch (error) {
         console.error(`Error generating skip exam for Chapter ${chapterNum}:`, error); hideLoading();
         alert(`Failed to generate skip exam: ${error.message}`); return null;
     }
}


/**
 * Grades an open-ended problem answer using AI.
 * Placeholder implementation - Requires careful prompt engineering and result parsing.
 * @param {string} problemText - The text of the problem.
 * @param {string} userAnswer - The user's submitted text answer.
 * @param {string} chapterContent - The source material (PDF/Transcription) for context.
 * @param {number} maxScore - The maximum score for the problem (e.g., 10).
 * @returns {Promise<{score: number, explanation: string}|null>} - AI grade and feedback, or null on error.
 */
export async function gradeProblemWithAI(problemText, userAnswer, chapterContent, maxScore = 10) {
     console.log(`AI Grading Request: Problem: "${problemText.substring(0,50)}...", User Answer: "${userAnswer.substring(0,50)}..."`);
     if (!problemText || !userAnswer || !chapterContent) {
          console.error("AI Grading Error: Missing problem text, user answer, or chapter context.");
          return { score: 0, explanation: "Error: Missing necessary information for grading." };
     }

     const maxContextLength = 100000; // Adjust based on model limits
     const truncatedChapterContent = chapterContent.length > maxContextLength
         ? chapterContent.substring(0, maxContextLength) + "... [Context Truncated]"
         : chapterContent;

     // Advanced Prompt - Asking for structured JSON output might be more reliable
     const prompt = `You are an expert physics and mathematics teaching assistant grading a student's answer to an open-ended problem.

**Source Material Context (Use ONLY this to judge correctness):**
---
${truncatedChapterContent}
---

**Problem:**
${problemText}

**Student's Answer:**
${userAnswer}

**Instructions:**
1.  **Evaluate:** Carefully evaluate the student's answer based *strictly* on the provided Source Material Context. Assess correctness, completeness, clarity, and application of relevant concepts from the source material.
2.  **Score:** Assign a numerical score out of a maximum of ${maxScore}. Award partial credit where appropriate. Be fair and consistent.
3.  **Explain:** Provide a brief, constructive explanation for the score, highlighting strengths and weaknesses based on the source material.

**Output Format (JSON):** Please provide your response ONLY in the following JSON format:
{
  "score": number (between 0 and ${maxScore}),
  "explanation": "string (Your brief explanation for the score based on the source material)"
}

**Example Output:**
{
  "score": 7,
  "explanation": "The student correctly identified the main principle but missed a key detail mentioned in the source text regarding boundary conditions. Calculation steps are mostly correct."
}

Evaluate the student's answer now and provide the JSON output:`;

     try {
          showLoading("AI Grading in progress...");
          const responseText = await callGeminiTextAPI(prompt);
          hideLoading();
          console.log("Raw AI Grading Response:", responseText);

          // Attempt to parse the JSON response
          try {
              // Clean potential markdown code block fences
              const cleanedResponse = responseText.replace(/^```json\s*|```\s*$/g, '').trim();
              const result = JSON.parse(cleanedResponse);

              if (typeof result.score === 'number' && typeof result.explanation === 'string') {
                   // Basic validation of score range
                   result.score = Math.max(0, Math.min(result.score, maxScore));
                   console.log("AI Grading Successful:", result);
                   return result;
              } else {
                   console.error("AI Grading Error: Parsed JSON has incorrect format.", result);
                   return { score: 0, explanation: "Error: AI response format was invalid. Raw: " + escapeHtml(responseText.substring(0, 200)) };
              }
          } catch (parseError) {
               console.error("AI Grading Error: Failed to parse JSON response.", parseError, "Raw Response:", responseText);
               // Fallback: Try to extract score/explanation from text if JSON fails? Risky.
               // For now, return an error explanation including the raw text.
               return { score: 0, explanation: "Error: Could not parse AI grading response. Raw: " + escapeHtml(responseText.substring(0, 200)) };
          }
     } catch (error) {
          hideLoading();
          console.error("Error calling AI for grading:", error);
          return { score: 0, explanation: `Error during AI grading: ${error.message}` };
     }
}

export async function convertMyNoteToLatex(text) {
    if (!text) {
        throw new Error("No text provided for LaTeX conversion");
    }

    const prompt = `Convert the following text into LaTeX format. Focus on proper mathematical notation and formatting:

Text to Convert:
${text}

Please provide clean LaTeX code that can be compiled. Include necessary preamble commands and document structure.`;

    try {
        const latexText = await callGeminiTextAPI(prompt);
        return latexText;
    } catch (error) {
        console.error("Error converting to LaTeX:", error);
        throw error;
    }
}

// --- END OF FILE ai_integration.js ---