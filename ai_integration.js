// ai_integration.js

import { GEMINI_API_KEY, PDF_WORKER_SRC } from './config.js'; // Import the API key & PDF Worker Source
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Import UI helpers & escapeHtml
import { globalCourseDataMap } from './state.js'; // Need course data map

// Dynamically get the SDK object if it loaded successfully
let GoogleGenerativeAI;
try {
    // This relies on the dynamic import in index.html completing.
    const genAIModule = await import('https://unpkg.com/@google/generative-ai?module');
    GoogleGenerativeAI = genAIModule.GoogleGenerativeAI;
} catch (e) {
    console.error("Google AI SDK class not found. AI Features disabled.", e);
}

// PDF.js library (dynamically check if loaded - needed for PDF text extraction)
let pdfjsLib = window.pdfjsLib; // Check if already loaded globally

const TEXT_MODEL_NAME = "gemini-2.5-pro-exp-03-25";
const VISION_MODEL_NAME = "gemini-2.5-pro-exp-03-25"; // Use the appropriate vision model

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
        const textLines = srtContent.split('\n').map(line => line.trim()).filter(line => line && !/^\d+$/.test(line) && !/-->/.test(line));
        const extractedText = textLines.join(' '); // Join lines with space for readability/context
        console.log(`fetchSrtText: Extracted text from SRT: ${url}`);
        return extractedText;
    } catch (error) {
        console.error(`Error fetching/parsing SRT file (${url}):`, error);
        return null;
    }
}

// --- Helper: Extract Text from ALL pages of a PDF ---
async function getAllPdfText(pdfPath) {
    // Ensure PDF.js library is available
    if (typeof pdfjsLib === 'undefined') {
        console.error("PDF.js library is not loaded. Cannot extract text from PDF.");
        // Attempt to access it from window scope if dynamically loaded
        if (window.pdfjsLib) {
            pdfjsLib = window.pdfjsLib;
            console.log("Accessed PDF.js from window scope.");
        } else {
             alert("PDF processing library (PDF.js) is not available. Please ensure it's loaded correctly.");
             return null;
        }
    }
     if (!pdfPath) return null; // No path provided

    // Set worker source (important for PDF.js functionality)
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;

    let pdfText = "";
    console.log(`Attempting to extract text from all pages of PDF: ${pdfPath}`);
    // No loading indicator here, as it's called internally by generateFormulaSheet which shows one.
    try {
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;
        console.log(`Extracting text from ${numPages} pages...`);

        // Limit page processing for performance if needed, especially for large PDFs
        const maxPagesToProcess = 50; // Adjust this limit as needed
        const pagesToProcess = Math.min(numPages, maxPagesToProcess);
        if (numPages > maxPagesToProcess) {
            console.warn(`PDF text extraction limited to first ${maxPagesToProcess} pages out of ${numPages}.`);
        }


        for (let i = 1; i <= pagesToProcess; i++) {
            try {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                textContent.items.forEach(item => {
                    pdfText += item.str + " "; // Add space between items
                });
                pdfText += "\n"; // Add newline between pages
            } catch (pageError) {
                console.warn(`Error extracting text from page ${i} of ${pdfPath}:`, pageError);
                // Continue to next page even if one page fails
            }
        }
        console.log(`Finished text extraction. Total length: ${pdfText.length}`);
        return pdfText;
    } catch (error) {
        console.error(`Error extracting text from PDF ${pdfPath}:`, error);
        // Don't alert here, let the calling function handle UI feedback if needed
        return null; // Return null if extraction fails
    }
}


// --- API Call Helpers ---
async function callGeminiTextAPI(prompt) {
    if (!GoogleGenerativeAI) throw new Error("AI SDK failed to load.");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY") throw new Error("API Key not configured.");
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: TEXT_MODEL_NAME });
        console.log(`Sending TEXT prompt to Gemini (${TEXT_MODEL_NAME}). Length: ${prompt.length}`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = '';
        // Updated way to get text based on potential Gemini API changes
        if (response && typeof response.text === 'function') {
            text = await response.text();
        } else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
            text = response.candidates[0].content.parts[0].text;
        } else {
            console.warn("Could not extract text from Gemini response:", response);
            throw new Error("AI response format unclear or content blocked.");
        }
        console.log("Received AI text response.");
        return text;
    } catch (error) {
        console.error("Error calling Gemini Text API:", error);
        let errorMessage = `Gemini API Error: ${error.message || 'Unknown error'}.`;
        if (error.message?.toLowerCase().includes('api key not valid')) {
            errorMessage = "Gemini API Error: Invalid API Key. Please check config.js.";
        } else if (error.message?.includes('quota')) {
            errorMessage = "Gemini API Error: Quota exceeded.";
        } else if (error.message?.includes('candidate') && error.message?.includes('finishReason: SAFETY')) {
            errorMessage = "Gemini API Error: Response blocked due to safety settings.";
        } else if (error.toString().includes('API key not valid')) {
             errorMessage = "Gemini API Error: Invalid API Key. Please check config.js.";
         }
        throw new Error(errorMessage); // Re-throw handled error
    }
}

// NEW: API Helper for Vision Model
async function callGeminiVisionAPI(promptParts) {
    if (!GoogleGenerativeAI) throw new Error("AI SDK failed to load.");
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_API_KEY") throw new Error("API Key not configured.");
    if (!promptParts || promptParts.length === 0) throw new Error("Prompt parts cannot be empty for Vision API.");

    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: VISION_MODEL_NAME });

        // Log the prompt parts being sent (excluding large data for brevity)
        const logParts = promptParts.map(part => {
            if (part.inlineData) return '{inlineData: ...image data...}';
            return part; // Log text parts as is
        });
        console.log(`Sending VISION prompt to Gemini (${VISION_MODEL_NAME}):`, logParts);

        const result = await model.generateContent(promptParts);
        const response = await result.response;
        let text = '';
        // Updated way to get text based on potential Gemini API changes
        if (response && typeof response.text === 'function') {
            text = await response.text();
        } else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
            text = response.candidates[0].content.parts[0].text;
        } else {
             console.warn("Could not extract text from Gemini Vision response:", response);
             // Check for safety blocking
             if (response?.promptFeedback?.blockReason) {
                 throw new Error(`AI response blocked due to safety settings: ${response.promptFeedback.blockReason}`);
             } else if (response?.candidates?.[0]?.finishReason === 'SAFETY') {
                  throw new Error("AI response blocked due to safety settings.");
             }
             throw new Error("AI Vision response format unclear or content blocked.");
        }
        console.log("Received AI vision response.");
        return text;
    } catch (error) {
        console.error("Error calling Gemini Vision API:", error);
        let errorMessage = `Gemini API Error: ${error.message || 'Unknown error'}.`;
        // Add specific error handling as needed (similar to text API)
         if (error.message?.toLowerCase().includes('api key not valid')) {
             errorMessage = "Gemini API Error: Invalid API Key. Please check config.js.";
         } else if (error.message?.includes('quota')) {
             errorMessage = "Gemini API Error: Quota exceeded.";
         } else if (error.message?.includes('candidate') && error.message?.includes('finishReason: SAFETY')) {
             errorMessage = "Gemini API Error: Response blocked due to safety settings.";
         } else if (error.message?.includes('SAFETY')) { // Broader check for safety blocks
             errorMessage = "Gemini API Error: Response may be blocked due to safety settings.";
         }
        throw new Error(errorMessage); // Re-throw handled error
    }
}

// --- HTML Formatting ---
function formatResponseAsHtml(rawText) {
    if (!rawText) return '<p class="text-muted italic">AI did not provide a response.</p>';
    // 1. Escape basic HTML characters (&, <, >)
    let escapedText = escapeHtml(rawText);
    // 2. Convert Markdown bold and italics
    escapedText = escapedText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    // 3. Convert Markdown code blocks (``` code ``` or ```lang\ncode\n```)
    escapedText = escapedText.replace(/```(?:[a-zA-Z]+)?\n([\s\S]*?)\n```/g, (match, code) => {
        return `<pre><code class="block whitespace-pre-wrap">${escapeHtml(code.trim())}</code></pre>`; // Use escapeHtml again for code content
    });
    // 4. Convert Markdown inline code (`code`)
    escapedText = escapedText.replace(/`([^`]+)`/g, '<code>$1</code>');
    // 5. Convert Markdown numbered lists (e.g., 1. Item)
    escapedText = escapedText.replace(/^\s*(\d+)\.\s+(.*)/gm, (match, num, item) => {
         // Basic approach - might need refinement for nested lists or complex scenarios
         // Check if it's already inside a list tag to avoid nested lists
         // This regex is simple and might incorrectly format lines within code blocks.
         // A more robust parser would be needed for complex markdown.
         return `<ol start="${num}" style="list-style-position: inside; padding-left: 1.5em;"><li style="margin-left: -1.5em;">${item.trim()}</li></ol>`;
     });
     // Combine adjacent OLs generated above (simple cleanup)
     escapedText = escapedText.replace(/<\/ol>\s*<ol start="\d+">/g, '');

    // 6. Convert Markdown bullet points (* Item, - Item)
    escapedText = escapedText.replace(/^\s*[\*\-]\s+(.*)/gm, (match, item) => {
        // Basic approach - similar limitations as numbered lists
        return `<ul style="list-style-position: inside; padding-left: 1.5em;"><li style="margin-left: -1.5em;">${item.trim()}</li></ul>`;
    });
    // Combine adjacent ULs generated above (simple cleanup)
     escapedText = escapedText.replace(/<\/ul>\s*<ul[^>]*>/g, '');


    // 7. Convert Markdown newlines to HTML line breaks <br> ONLY for those NOT part of lists or code blocks
    // Split by lines, process, then join. Check if line is inside pre or list tag.
    let lines = escapedText.split('\n');
    let insidePre = false;
    let htmlWithBreaks = lines.map(line => {
         if (line.includes('<pre>')) insidePre = true;
         if (line.includes('</pre>')) insidePre = false;
         // Simple check: avoid adding <br> inside <pre> or after list items (might need better logic)
         if (insidePre || /<\/(li|ol|ul)>$/.test(line.trim())) {
              return line;
         }
         return line + '<br>';
    }).join('\n');
    // Remove extra <br> after list/pre blocks and at the end
    htmlWithBreaks = htmlWithBreaks.replace(/(<\/(?:pre|ol|ul|li)>)<br>/g, '$1');
    htmlWithBreaks = htmlWithBreaks.replace(/<br>\s*$/g, ''); // Remove trailing <br>

    // 8. Wrap the entire result in a div suitable for MathJax processing and styling.
    return `<div class="prose prose-sm dark:prose-invert max-w-none leading-relaxed">${htmlWithBreaks}</div>`;
}


// --- AI Functions ---
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
         const explanationText = await callGeminiTextAPI(prompt);
         hideLoading();
         return formatResponseAsHtml(explanationText);
     } catch (error) {
         console.error("Error in getAIExplanation:", error);
         hideLoading();
         return `<p class="text-danger">Error generating explanation: ${error.message}</p>`;
     }
}

export async function explainStudyMaterialSnippet(snippet, context) {
    console.log(`Requesting explanation for snippet/question: "${snippet.substring(0, 50)}..." with context length: ${context?.length || 0}`);
    if (!snippet) return `<p class="text-warning">No text snippet provided for explanation.</p>`;

    const isLikelyQuestion = snippet.length < 200; // Heuristic: Short snippets are likely questions
    let prompt;

    if (isLikelyQuestion && context.length > 500) { // If it's likely a question AND we have substantial context
        // Assume 'snippet' is the user's question, and 'context' is the chapter text
         prompt = `You are a helpful physics tutor. Based *only* on the following text extracted from study material, please answer the user's question clearly and concisely:

User Question: "${snippet}"

Study Material Text (Context - Use ONLY this):
---
${context.substring(0, 15000)} ${context.length > 15000 ? "... [Context Truncated]" : ""}
---
End of Context.

Answer the question based *only* on the provided study material text. Use basic Markdown and LaTeX ($...$ or $$...$$) for formatting if needed. Do NOT use Markdown headings (#, ##, ###). If the context doesn't contain the answer, state that explicitly.`;
    } else {
        // Assume 'snippet' is selected text to be explained, and 'context' describes the source
         prompt = `You are a helpful physics tutor. Please explain the following text snippet clearly and concisely.

Snippet:
"${snippet}"

Context (where the snippet came from):
"${context || 'No specific context provided.'}"

Provide an explanation suitable for someone studying this topic. Use basic Markdown and LaTeX ($...$ or $$...$$) if needed. Focus on the meaning and significance of the snippet within the given context. Do NOT use Markdown headings (#, ##, ###).`;
    }

    try {
        showLoading("Generating Explanation...");
        const explanationText = await callGeminiTextAPI(prompt); // Uses Text API
        hideLoading();
        return formatResponseAsHtml(explanationText);
    } catch (error) {
        console.error("Error generating snippet/question explanation:", error);
        hideLoading();
        return `<p class="text-danger">Error generating explanation: ${error.message}</p>`;
    }
}

// NEW: Function to explain PDF snapshot using Vision API
export async function getExplanationForPdfSnapshot(userQuestion, base64ImageData, context) {
    console.log(`Requesting AI explanation for PDF snapshot (Page context: ${context})`);
    if (!userQuestion) return `<p class="text-warning">No question provided for explanation.</p>`;
    if (!base64ImageData) return `<p class="text-warning">No image data provided for explanation.</p>`;

    try {
        const promptParts = [
            { text: `You are a helpful physics tutor. Explain the content shown in this image of a PDF page, specifically addressing the following question. Context: ${context}. Question: "${userQuestion}". Focus your explanation on the visible content of the image. Use basic Markdown and LaTeX ($...$ or $$...$$) if needed. Do NOT use Markdown headings (#, ##, ###).` },
            {
                inlineData: {
                    mimeType: "image/jpeg", // Assuming JPEG from canvas.toDataURL('image/jpeg')
                    data: base64ImageData
                }
            }
        ];

        showLoading("Analyzing PDF Page Image...");
        const explanationText = await callGeminiVisionAPI(promptParts); // Use the new Vision API helper
        hideLoading();
        return formatResponseAsHtml(explanationText);

    } catch (error) {
        console.error("Error generating PDF snapshot explanation:", error);
        hideLoading();
        return `<p class="text-danger">Error generating explanation: ${error.message}</p>`;
    }
}


export async function generateFormulaSheet(courseId, chapterNum) {
    console.log(`Generating formula sheet for Course ${courseId}, Chapter ${chapterNum}`);
    showLoading(`Gathering content for Ch ${chapterNum} Formula Sheet...`);
    const courseDef = globalCourseDataMap.get(courseId);
    if (!courseDef) { hideLoading(); return `<p class="text-danger">Error: Course definition not found.</p>`; }
    const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
    // Determine paths using fallbacks to course-level patterns
    const pdfPath = chapterResources.pdfPath || courseDef.pdfPathPattern?.replace('{num}', chapterNum);
    const transcriptionPath = chapterResources.transcriptionPath || courseDef.transcriptionPathPattern?.replace('{num}', chapterNum);

    let transcriptionText = null;
    let fullPdfText = null;
    let contentSourceInfo = "";

    // Fetch Transcription
    if (transcriptionPath) {
         console.log("Fetching transcription...");
         transcriptionText = await fetchSrtText(transcriptionPath);
         if (transcriptionText) {
              console.log(`Transcription fetched (Length: ${transcriptionText.length})`);
              contentSourceInfo += "Lecture Transcription; ";
         } else {
              console.warn(`Transcription not found/parsed for Ch ${chapterNum}`);
         }
    } else { console.log("No transcription path configured."); }

    // Extract PDF Text
    if (pdfPath) {
         console.log("Extracting PDF text...");
         fullPdfText = await getAllPdfText(pdfPath); // Use helper to get text from all pages
         if (fullPdfText) {
              console.log(`PDF text extracted (Length: ${fullPdfText.length})`);
              contentSourceInfo += "Chapter PDF Text; ";
         } else {
              console.warn(`PDF text extraction failed for Ch ${chapterNum}`);
         }
    } else { console.log("No PDF path configured."); }

    // Ensure contentSourceInfo is not empty if sources exist
     if (contentSourceInfo) contentSourceInfo = contentSourceInfo.slice(0, -2); // Remove trailing "; "
     else contentSourceInfo = "No text sources found";

    if (!transcriptionText && !fullPdfText) {
        hideLoading();
        return `<p class="text-warning">No text content available (from Transcription or PDF) for Ch ${chapterNum}. Cannot generate formula sheet.</p>`;
    }

    let combinedContent = `Content for Chapter ${chapterNum} (Sources: ${contentSourceInfo}):\n\n`;
    if (transcriptionText) combinedContent += `== Lecture Transcription Text ==\n${transcriptionText}\n\n`;
    if (fullPdfText) combinedContent += `== Chapter PDF Text ==\n${fullPdfText}\n\n`;
    combinedContent += `== End of Content ==`;

    // Apply stricter truncation for the combined content to avoid API limits
    const maxContentLength = 80000; // Adjust based on model limits and typical content size
    let truncatedContent = combinedContent;
    if (combinedContent.length > maxContentLength) {
        truncatedContent = combinedContent.substring(0, maxContentLength) + "\n... [Content Truncated due to length limit]";
        console.warn(`Combined content for Chapter ${chapterNum} truncated to ${maxContentLength} characters.`);
    }


    const prompt = `You are an expert physics assistant. Based ONLY on the following combined text content (from ${contentSourceInfo}) provided for Chapter ${chapterNum}, extract ALL key formulas, equations, physical laws, and important definitions. Present them clearly and concisely as a comprehensive formula sheet for the entire chapter.
Use basic Markdown for formatting (like **bold** for titles/section heads, lists for formulas/definitions, inline code \`variable\` for variables if appropriate) and LaTeX for equations (inline $...$ or display $$...$$).
Do NOT include lengthy explanations, derivations, or example problems. Focus strictly on presenting the formulas and definitions themselves. Organize logically if possible (e.g., by topic within the chapter).

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
        return formatResponseAsHtml(formulaSheetText);
    } catch (error) {
        console.error(`Error generating formula sheet for Chapter ${chapterNum}:`, error);
        hideLoading();
        return `<p class="text-danger">Error generating formula sheet: ${error.message}</p>`;
    }
}


export async function generateSkipExam(transcriptionContent, chapterPdfContent, chapterNum) {
     console.log(`Generating Skip Exam for Chapter ${chapterNum}`);

     // Combine content, prioritizing transcription if available, then PDF text
     let combinedContent = `Study material content for Physics Chapter ${chapterNum}:\n\n`;
     let contentSourceInfo = "";

     if (transcriptionContent) {
          combinedContent += `== Lecture Transcription Excerpts ==\n${transcriptionContent.substring(0, 40000)}\n\n`; // Increased limit for transcription
          contentSourceInfo += "Lecture Transcription";
     }
     if (chapterPdfContent) {
          // Add PDF content only if transcription was short or missing, to keep context focused
          const remainingLength = 60000 - (transcriptionContent?.length || 0); // Adjust total combined limit
          if (remainingLength > 5000) { // Only add PDF if there's significant space left
             combinedContent += `== Chapter PDF Text Excerpts ==\n${chapterPdfContent.substring(0, remainingLength)}\n\n`;
             contentSourceInfo += (contentSourceInfo ? "; Chapter PDF" : "Chapter PDF");
          } else if (!transcriptionContent) {
             // If no transcription, use more PDF text
             combinedContent += `== Chapter PDF Text Excerpts ==\n${chapterPdfContent.substring(0, 60000)}\n\n`;
             contentSourceInfo += "Chapter PDF";
          }
     }
     combinedContent += `== End of Content ==`;

     if (!transcriptionContent && !chapterPdfContent) {
         console.error(`Cannot generate Skip Exam for Ch ${chapterNum}: No study material content provided.`);
         return null; // Cannot proceed without content
     }
     console.log(`Skip Exam generation using content from: ${contentSourceInfo || 'None'}. Combined length approx: ${combinedContent.length}`);

     try {
         const requestedQuestions = 15; // Keep this reasonable
         const prompt = `You are a physics assessment expert tasked with creating a multiple-choice quiz for Chapter ${chapterNum}, based *strictly* on the provided study material content below (which may include lecture transcription excerpts and/or chapter PDF text excerpts).

Generate ${requestedQuestions} challenging multiple-choice questions that cover the key concepts, definitions, and formulas presented ONLY in the provided text. Ensure the questions require understanding of the material, not just recall of exact phrasing.

For each question:
1.  Provide the question text clearly.
2.  Provide 4-5 distinct answer options (labeled A, B, C, D, E).
3.  Ensure only ONE option is definitively correct based *only* on the provided text.
4.  Indicate the correct answer on a new line immediately following the options using the format "ans: [Correct Letter]".

**Crucially, base your questions and answers ONLY on the information given in the following text.** Do not introduce external knowledge or concepts not mentioned in the provided excerpts.

Study Material Content for Chapter ${chapterNum}:
---
${combinedContent.substring(0, 80000)} ${combinedContent.length > 80000 ? "... [Content Truncated]" : ""}
---
End of Study Material Content.

Generate the ${requestedQuestions} quiz questions now in the specified format:`;

         showLoading(`Generating Skip Exam (Ch ${chapterNum})...`);
         const examText = await callGeminiTextAPI(prompt);
         hideLoading();
         console.log(`Raw Skip Exam Text for Ch ${chapterNum}:`, examText.substring(0, 300) + "..."); // Log start of response

         // Basic validation of the generated text
         if (!examText || !/\d+\..*[\s\S]*?ans:\s*[A-E]/i.test(examText)) {
             console.error("Generated content validation failed. Format check: Missing question numbers, options, or 'ans:' lines.", examText);
             throw new Error("Generated content does not appear to be a valid exam format. Check AI output or try again.");
         }

         return examText; // Return the raw text for parsing

     } catch (error) {
         console.error(`Error generating skip exam for Chapter ${chapterNum}:`, error);
         hideLoading();
         alert(`Failed to generate skip exam for Chapter ${chapterNum}: ${error.message}`);
         return null;
     }
}