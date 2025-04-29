// --- START OF FILE ai_integration.js ---

// ai_integration.js

import { GEMINI_API_KEY, PDF_WORKER_SRC } from './config.js'; // Import the API key & PDF Worker Source
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Import UI helpers & escapeHtml
import { globalCourseDataMap } from './state.js'; // Need course data map

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
const TEXT_MODEL_NAME = "gemini-2.5-pro-exp-03-25"; // Use a standard text model
const VISION_MODEL_NAME = "gemini-2.5-pro-exp-03-25"; // Use a model supporting multimodal input

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
        const maxPagesToProcess = 50; // Adjust this limit as needed
        const pagesToProcess = Math.min(numPages, maxPagesToProcess);
        if (numPages > maxPagesToProcess) { console.warn(`PDF text extraction limited to first ${maxPagesToProcess} pages.`); }

        for (let i = 1; i <= pagesToProcess; i++) {
            try {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                textContent.items.forEach(item => { pdfText += item.str + " "; });
                pdfText += "\n";
            } catch (pageError) { console.warn(`Error extracting text from page ${i} of ${pdfPath}:`, pageError); }
        }
        console.log(`Finished text extraction. Total length: ${pdfText.length}`);
        return pdfText;
    } catch (error) {
        console.error(`Error extracting text from PDF ${pdfPath}:`, error);
        return null; // Return null if extraction fails
    }
}
window.getAllPdfTextForAI = getAllPdfTextForAI; // Assign to window scope


// --- API Call Helpers ---
async function callGeminiTextAPI(prompt) {
    if (!GoogleGenerativeAI) throw new Error("AI SDK failed to load.");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY") throw new Error("API Key not configured.");
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
        const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }], safetySettings });
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
        if (response.candidates[0].finishReason === 'SAFETY') { throw new Error("AI response blocked due to safety settings."); }
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
    let escapedText = escapeHtml(rawText);
    escapedText = escapedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    escapedText = escapedText.replace(/```(?:[a-zA-Z]+)?\n([\s\S]*?)\n```/g, (m, code) => `<pre><code class="block whitespace-pre-wrap">${escapeHtml(code.trim())}</code></pre>`);
    escapedText = escapedText.replace(/`([^`]+)`/g, '<code>$1</code>');
    escapedText = escapedText.replace(/^\s*(\d+)\.\s+(.*)/gm, (m, n, i) => `<ol start="${n}" style="list-style:decimal;margin-left:1.5em;"><li>${i.trim()}</li></ol>`);
    escapedText = escapedText.replace(/<\/ol>\s*<ol start="\d+"[^>]*>/g, '');
    escapedText = escapedText.replace(/^\s*[\*\-]\s+(.*)/gm, (m, i) => `<ul style="list-style:disc;margin-left:1.5em;"><li>${i.trim()}</li></ul>`);
    escapedText = escapedText.replace(/<\/ul>\s*<ul[^>]*>/g, '');
    let lines = escapedText.split('\n'); let insidePre = false; let htmlWithBreaks = lines.map(line => { if (line.includes('<pre>')) insidePre = true; const preEndMatch = /<\/pre>/.exec(line); const isEndOfPre = preEndMatch && (preEndMatch.index + 6 >= line.length); let processedLine = line; if (!insidePre && line.trim() !== '' && !/^\s*<[ou]l|^\s*<li|<\/[ou]l|<\/li>/.test(line)) { processedLine += '<br>'; } if (insidePre && isEndOfPre) insidePre = false; return processedLine; }).join('');
    htmlWithBreaks = htmlWithBreaks.replace(/(<\/(?:pre|ol|ul|li)>)<br>/g, '$1').replace(/<br>\s*$/g, '');
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
    if (isLikelyQuestion && context?.length > 500) {
         prompt = `You are a helpful physics and mathematics tutor. Based *only* on the following text extracted from study material, please answer the user's question clearly and concisely:\n\nUser Question: "${snippet}"\n\nStudy Material Text (Use ONLY this):\n---\n${context.substring(0, 15000)} ${context.length > 15000 ? "...[Truncated]" : ""}\n---\nEnd Context.\n\nAnswer based *only* on the provided text. Use basic Markdown/LaTeX ($$, $). If the context doesn't contain the answer, state that explicitly. No headings (#).`;
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
             const srtFilename = sanitizeTitleForFilename(lec.title);
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

     const maxContentLength = 80000; let truncatedContent = combinedContent;
     if (combinedContent.length > maxContentLength) { truncatedContent = combinedContent.substring(0, maxContentLength) + "\n...[Truncated]"; console.warn(`Combined content truncated.`); }

     const prompt = `You are an expert physics and mathematics assistant. Based ONLY on the following combined text content (from ${contentSourceInfo}) for Chapter ${chapterNum}, extract ALL key formulas, equations, physical laws, and important definitions. Present them clearly and concisely as a comprehensive formula sheet. Use basic Markdown (bold, lists) and LaTeX ($...$ or $$...$$). Do NOT include explanations, derivations, or examples. Focus strictly on presenting the formulas and definitions. Organize logically if possible.

Combined Text Content for Chapter ${chapterNum}:
---
${truncatedContent}
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

// --- Skip Exam Generation ---
export async function generateSkipExam(transcriptionContent, chapterPdfContent, chapterNum) {
     console.log(`Generating Skip Exam for Chapter ${chapterNum}`);
     let combinedTextContent = `Study material text content for Physics and/or mathematics Chapter ${chapterNum}:\n\n`; let contentSourceInfo = ""; const maxTextLength = 80000;
     if (transcriptionContent) { combinedTextContent += `== Lecture Transcription Excerpts ==\n${transcriptionContent.substring(0, maxTextLength)}\n\n`; contentSourceInfo += "Lecture Transcription"; }
     if (chapterPdfContent) { const remainingLength = maxTextLength - (transcriptionContent?.length || 0); if (remainingLength > 5000 || !transcriptionContent) { combinedTextContent += `== Chapter PDF Text Excerpts ==\n${chapterPdfContent.substring(0, remainingLength)}\n\n`; contentSourceInfo += (contentSourceInfo ? "; PDF" : "PDF"); } }
     combinedTextContent += `== End of Text Content ==`;

     if (!transcriptionContent && !chapterPdfContent) { console.error(`No study material text for Ch ${chapterNum}.`); return null; }
     console.log(`Skip Exam generation using text: ${contentSourceInfo || 'None'}. Length: ${combinedTextContent.length}`);

     try {
         const requestedQuestions = 15; // Keep number reasonable
         // Refined Prompt
         const prompt = `You are a physics and mathematics assessment expert creating a ${requestedQuestions}-question multiple-choice quiz for Chapter ${chapterNum} (you can increase the number of questions of the exam if you see that not all key consepts discussed in the chapter are being tested). Base the questions *strictly* on the provided study material text below.

Generate exactly ${requestedQuestions} challenging multiple-choice questions covering key concepts, definitions, and formulas from the text ONLY. Ensure questions require understanding, not just recall.

For EACH of the ${requestedQuestions} questions:
1. Write the question text clearly, starting with the question number (e.g., "1. Question text...").
2. Provide 4 distinct answer options (labeled A, B, C, D).
3. Ensure only ONE option is definitively correct based *only* on the provided text. Avoid ambiguity.
4. Indicate the correct answer on a **separate new line** immediately following the options using the exact format: "ans: [Correct Letter]".

**IMPORTANT:**
- Adhere strictly to the provided text content. Do not introduce external knowledge.
- Ensure every question has exactly 4 options (A, B, C, D).
- Ensure every question is followed immediately by the "ans: [Letter]" line.
- Number questions sequentially from 1 to ${requestedQuestions}.

Study Material Text for Chapter ${chapterNum}:
---
${combinedTextContent.substring(0, maxTextLength)} ${combinedTextContent.length > maxTextLength ? "... [Truncated]" : ""}
---
End of Study Material Text.

Generate the ${requestedQuestions} quiz questions now in the specified format:`;

         showLoading(`Generating Skip Exam (Ch ${chapterNum})...`);
         const examText = await callGeminiTextAPI(prompt);
         hideLoading();
         console.log(`Raw Skip Exam Text for Ch ${chapterNum}:\n`, examText); // Log full response

         // Basic validation check - look for the pattern of question number, text, options, and answer
         const questionBlocksFound = (examText.match(/^\s*\d+[\.\)]\s+.*\n([\s\S]*?)^ans:\s*[A-D]\s*$/gm) || []).length;
         console.log(`Validation: Found ${questionBlocksFound} potential question blocks.`);
         if (questionBlocksFound < requestedQuestions * 0.7) { // Allow for some minor formatting issues, but not too few
             console.error(`Generated content validation failed. Found only ${questionBlocksFound}/${requestedQuestions} expected question blocks.`);
             throw new Error("Generated content does not appear to contain enough valid questions. Check AI output or try again.");
         }

         return examText; // Return the raw text for parsing

     } catch (error) {
         console.error(`Error generating skip exam for Chapter ${chapterNum}:`, error); hideLoading();
         alert(`Failed to generate skip exam: ${error.message}`); return null;
     }
}

// --- END OF FILE ai_integration.js ---