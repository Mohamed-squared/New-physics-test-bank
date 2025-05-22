// --- START OF FILE ui_pdf_generation.js ---

import { PDF_GENERATION_OPTIONS, LATEX_DOCUMENT_CLASS,
         LATEX_PACKAGES, LATEX_BEGIN_DOCUMENT, LATEX_END_DOCUMENT,
         COURSE_BASE_PATH, SUBJECT_RESOURCE_FOLDER, DEFAULT_COURSE_PDF_FOLDER,
         DEFAULT_COURSE_TRANSCRIPTION_FOLDER, MAX_MARKS_PER_PROBLEM, MAX_MARKS_PER_MCQ,
         PASSING_GRADE_PERCENT } from './config.js';
import { showLoading, hideLoading, renderMathIn, escapeHtml } from './utils.js';
import { cleanTextForFilename } from './filename_utils.js';
import { generateExplanation } from './ai_exam_marking.js'; // Added import

// --- Base HTML for General Exams (Questions/Solutions) ---
export function generatePdfBaseHtml(title, innerContentHtml) {
    const escapedTitle = escapeHtml(title);
    // Styles are now more reliant on the external CSS (pdf_exam_styles.css)
    // Minimal inline styles for very basic structure or overrides.
    const styles = `
        body { font-family: 'EB Garamond', Georgia, serif; font-size: 11pt; color: #333333 !important; background-color: #F8F6F0 !important; margin: 0; padding: 0; box-sizing: border-box; position: relative; }
        /* Add any critical inline styles needed before external CSS loads or if it fails */
        mjx-container svg { overflow: visible !important; }
    `;

    const mathJaxConfigAndScript = `
        <script>
          window.MathJax = {
            loader: { load: ['input/tex', 'output/svg'] },
            tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']] },
            svg: { fontCache: 'global', scale: 1, mtextInheritFont: true, merrorInheritFont: true, displayAlign: 'left', displayIndent: '0em'},
            startup: {
                ready: () => {
                    console.log('[PDF HTML Inner - Exam] MathJax Startup: Ready function called.');
                    MathJax.startup.defaultReady();
                    MathJax.startup.promise.then(() => {
                         console.log('[PDF HTML Inner - Exam] MathJax initial typesetting complete.');
                         setTimeout(() => {
                             console.log('[PDF HTML Inner - Exam] Setting window.mathJaxIsCompletelyReadyForPdf TO TRUE after timeout.');
                             window.mathJaxIsCompletelyReadyForPdf = true;
                         }, 500); // Increased timeout slightly as safeguard
                    }).catch(err => {
                        console.error('[PDF HTML Inner - Exam] MathJax startup.promise REJECTED:', err);
                        window.mathJaxIsCompletelyReadyForPdf = 'error';
                    });
                }
            }
          };
        </script>
        <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/startup.js" id="mathjax-pdf-script"></script>
        <script>
            console.log("[PAGE SCRIPT EXAM PDF] Debug script loaded.");
            window.addEventListener('DOMContentLoaded', () => { /* Check for CSS link/application */
                console.log("[PAGE SCRIPT EXAM PDF] DOMContentLoaded for Exam PDF.");
            });
        </script>
    `;
    // The externalCssLink is intended to be pdf_exam_styles.css; server injects it based on filename.

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${escapedTitle}</title>
            <meta charset="UTF-8">
            <!-- Server will inject CSS here -->
            <style>${styles}</style>
            ${mathJaxConfigAndScript}
        </head>
        <body>
            <div id="pdf-background-watermark"></div>
            <div class="pdf-main-content">
                <h1>${escapedTitle}</h1>
                <div class="content-body">${innerContentHtml}</div>
            </div>
        </body>
        </html>
    `;
}

// --- Base HTML for Formula Sheets & Summaries (links to different CSS) ---
// IMPORTANT STYLING NOTE:
// The visual appearance of PDFs generated using this function heavily depends on an
// external CSS file, expected to be 'pdf_formula_sheet_styles.css'.
// This file is injected by the server during PDF generation.
// If this CSS file is missing, not correctly linked by the server, or if the
// class names used here (e.g., pdf-fs-main-content, pdf-fs-title, pdf-fs-body-text)
// do not match those in the CSS, the resulting PDF may have significant styling issues
// (e.g., incorrect layout, fonts, colors, margins).
// Ensure 'pdf_formula_sheet_styles.css' exists, is correctly configured on the server-side
// PDF generation endpoint, and targets the class names used in this HTML structure.
export function generateFormulaSheetPdfBaseHtml(title, innerContentHtml) {
    const escapedTitle = escapeHtml(title);
    const styles = `
        body { font-family: 'EB Garamond', Georgia, serif; font-size: 11pt; color: #3D2B1F !important; background-color: #F8F6F0 !important; margin: 0; padding: 0; box-sizing: border-box; }
        /* Add any critical inline styles needed before external CSS loads or if it fails */
        mjx-container svg { overflow: visible !important; }
    `;

    const mathJaxConfigAndScript = `
        <script>
          window.MathJax = {
            loader: { load: ['input/tex', 'output/svg'] },
            tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']] },
            svg: { fontCache: 'global', scale: 0.95, mtextInheritFont: true, merrorInheritFont: true, displayAlign: 'left', displayIndent: '0em'},
            startup: {
                ready: () => {
                    console.log('[PDF HTML Inner - FS/Summary] MathJax Startup: Ready function called.');
                    MathJax.startup.defaultReady();
                    MathJax.startup.promise.then(() => {
                         console.log('[PDF HTML Inner - FS/Summary] MathJax initial typesetting complete.');
                         setTimeout(() => {
                             console.log('[PDF HTML Inner - FS/Summary] Setting window.mathJaxIsCompletelyReadyForPdf TO TRUE.');
                             window.mathJaxIsCompletelyReadyForPdf = true;
                         }, 500); // Increased timeout
                    }).catch(err => {
                        console.error('[PDF HTML Inner - FS/Summary] MathJax startup.promise REJECTED:', err);
                        window.mathJaxIsCompletelyReadyForPdf = 'error';
                    });
                }
            }
          };
        </script>
        <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/startup.js" id="mathjax-pdf-script"></script>
        <script>
            console.log("[PAGE SCRIPT FS/Summary PDF] Debug script loaded.");
            window.addEventListener('DOMContentLoaded', () => { /* Check for CSS link/application */
                console.log("[PAGE SCRIPT FS/Summary PDF] DOMContentLoaded for FS/Summary PDF.");
            });
        </script>
    `;
    // The externalCssLink is intended to be pdf_formula_sheet_styles.css; server injects it.

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${escapedTitle}</title>
            <meta charset="UTF-8">
            <!-- Server will inject CSS here -->
            <style>${styles}</style> <!-- Minimal inline styles -->
            ${mathJaxConfigAndScript}
        </head>
        <body>
            <div class="pdf-fs-main-content"> <!-- Use specific class for formula sheet styling -->
                <h1 class="pdf-fs-title">${escapedTitle}</h1>
                <div class="content-body pdf-fs-body-text">${innerContentHtml}</div>
            </div>
        </body>
        </html>
    `;
}

export async function generatePdfHtml(examDetails) {
    const { examId, questions, userAnswers, markingResults } = examDetails; // Destructure from examDetails
    const placeholderText = '[Content Missing]';
    let questionItemsHtml = '';
    let solutionItemsHtml = '';

    showLoading("Generating AI explanations for PDF...");
    const aiExplanations = [];
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const studentAnswer = userAnswers?.[question.id];
        const questionMarkingResult = markingResults?.questionResults?.find(r => r.questionId === question.id);

        try {
            // Pass null for correctAnswer for problems, and markingResult for context
            const explanationResult = await generateExplanation(question, questionMarkingResult, studentAnswer, []);
            aiExplanations[i] = explanationResult.explanationHtml;
        } catch (error) {
            console.error(`Error generating explanation for question ${question.id} for PDF:`, error);
            aiExplanations[i] = "<p><i>Error generating AI explanation for this question.</i></p>";
        }
    }
    hideLoading();

    // Determine imageBasePath
    let imageBasePath = './'; // Default fallback
    const currentSubjectState = window.currentSubject; // Access from global state if needed
    if (currentSubjectState && currentSubjectState.courseDirName) {
        const courseBasePath = (typeof window.COURSE_BASE_PATH === 'string' && window.COURSE_BASE_PATH !== "./courses") 
            ? window.COURSE_BASE_PATH 
            : "courses"; // Default if global constant not set or is './courses'
        const subjectResourceFolder = typeof window.SUBJECT_RESOURCE_FOLDER === 'string' 
            ? window.SUBJECT_RESOURCE_FOLDER 
            : 'Resources'; // Default if global constant not set

        const courseDir = cleanTextForFilename(currentSubjectState.courseDirName);
        
        imageBasePath = `${courseBasePath}/${courseDir}/${subjectResourceFolder}/images/`;
        if (!imageBasePath.startsWith('./') && !imageBasePath.startsWith('../') && !imageBasePath.startsWith('/')) {
            imageBasePath = './' + imageBasePath; // Ensure it's a relative path if not starting with typical indicators
        }
    } else {
        console.warn("[PDF Gen] currentSubject or courseDirName not available, using default image path './assets/images/'. Images might not load if paths are relative to course structure.");
        imageBasePath = './assets/images/'; 
    }
    if (imageBasePath && !imageBasePath.endsWith('/')) imageBasePath += '/';
    console.log("[PDF Gen] Determined imageBasePath:", imageBasePath);


    questions.forEach((q, index) => {
        const questionNumber = index + 1;
        let qTextForHtml = q.text || placeholderText;
        let optionsForHtml = '';
        let solutionAnswerText = q.isProblem ? 'Solution details vary based on steps.' : (q.correctAnswer ? escapeHtml(q.correctAnswer) : 'N/A');
        const isProblemType = q.isProblem || !q.options || q.options.length === 0;

        // Options for Questions PDF (no correct answer indication)
        if (!isProblemType && q.options && q.options.length > 0) {
            optionsForHtml = `<ol class="options-list">` +
                (q.options || []).map(opt => {
                    let optTextForHtml = opt.text || placeholderText;
                    const optionItemClass = 'option-item page-break-inside-avoid';
                    return `<li class="${optionItemClass}"><span class="option-letter">${escapeHtml(opt.letter)}.</span><span class="option-text-container">${optTextForHtml}</span></li>`;
                }).join('') + `</ol>`;
        }

        // Options for Solutions PDF (with correct answer indication)
        let solutionOptionsHtml = '';
        if (!isProblemType && q.options && q.options.length > 0) {
             solutionOptionsHtml = `<ol class="options-list">` +
                 (q.options || []).map(opt => {
                     let optTextForHtml = opt.text || placeholderText;
                     const isCorrectOption = !q.isProblem && q.correctAnswer && (String(opt.letter).toUpperCase() === String(q.correctAnswer).toUpperCase());
                     const optionItemClass = isCorrectOption ? 'option-item is-correct page-break-inside-avoid' : 'option-item page-break-inside-avoid';
                     return `<li class="${optionItemClass}"><span class="option-letter">${escapeHtml(opt.letter)}.</span><span class="option-text-container">${optTextForHtml}</span></li>`;
                 }).join('') + `</ol>`;
        }

        let imageSrc = null;
        const imageMarkdownRegex = /!\[(.*?)\]\((.*?)\)/;
        const imgMatchInText = qTextForHtml.match(imageMarkdownRegex);

        if (imgMatchInText) {
            imageSrc = imgMatchInText[2];
            qTextForHtml = qTextForHtml.replace(imageMarkdownRegex, '').trim();
             if (imageSrc.startsWith('./') || imageSrc.startsWith('../')) {
                 // Assume it's a relative path within the course structure
                 // e.g., "./images/my_image.png" becomes "courses/COURSE_DIR/Problems/images/my_image.png"
                 // This requires imageBasePath to be set correctly based on window.currentSubject
                 let pathSegments = imageSrc.split('/');
                 let filename = pathSegments.pop();
                 imageSrc = imageBasePath + filename; // Concatenate with pre-calculated imageBasePath
             } // Absolute URLs or full paths are used as-is
        } else if (q.image && typeof q.image === 'string') {
            let imageName = q.image;
            // Attempt to construct full path relative to the application root
            if (imageName.startsWith('./images/')) imageName = imageName.substring(9); // Path relative to current subject's images folder
            else if (imageName.startsWith('images/')) imageName = imageName.substring(7);
            else if (imageName.startsWith('./')) imageName = imageName.substring(2); // Generic relative path
            imageName = imageName.split('/').pop(); // Get filename
            imageSrc = `${imageBasePath}${cleanTextForFilename(imageName).split('?')[0]}`;
        }
        if (imageSrc) imageSrc = imageSrc.replace(/\/{2,}/g, '/'); // Clean up double slashes

        let imageHtml = imageSrc ? `<div class="question-image-container page-break-inside-avoid"><img src="${escapeHtml(imageSrc)}" alt="Image" class="question-image" crossorigin="anonymous" onerror="this.style.display='none';console.warn('PDF Image Load Fail: ${escapeHtml(imageSrc)}');"></div>` : '';
        const questionItemClasses = `question-item-wrapper ${isProblemType ? 'is-problem' : 'is-mcq'}`;

        const questionItemContent = `
            <div class="question-header">${isProblemType ? 'Problem' : 'Question'} ${questionNumber}${q.chapter ? ` (Ch ${q.chapter})` : ''}</div>
            <div class="question-text">${qTextForHtml}</div>
            ${imageHtml}
            ${optionsForHtml || ''}
        `;
        questionItemsHtml += `<li class="${questionItemClasses}">${questionItemContent}</li>`;

        const studentAnswerDisplay = escapeHtml(userAnswers?.[q.id] || "Not Answered"); // Get student's answer

         const solutionItemContent = `
             <div class="question-header">${isProblemType ? 'Problem' : 'Question'} ${questionNumber}${q.chapter ? ` (Ch ${q.chapter})` : ''}</div>
             <div class="question-text">${qTextForHtml}</div>
             ${imageHtml}
             ${solutionOptionsHtml || ''}
             <div class="solution-section page-break-inside-avoid">
                 <span class="solution-label">Correct Answer:</span>
                 <div class="solution-text">${solutionAnswerText}</div>
             </div>
             <div class="student-answer-section page-break-inside-avoid">
                 <span class="solution-label">Your Answer:</span>
                 <div class="solution-text">${studentAnswerDisplay}</div>
             </div>
             <div class="ai-explanation-section page-break-inside-avoid">
                 <span class="solution-label">AI Detailed Explanation:</span>
                 <div class="ai-explanation-text">${aiExplanations[index] || "<p><i>AI explanation not available.</i></p>"}</div>
             </div>
         `;
        solutionItemsHtml += `<li class="${questionItemClasses}">${solutionItemContent}</li>`;
    });

    const endOfExamSectionHtml = `
        <div class="end-of-exam-section page-break-before">
            <p>End of Exam</p>
            <p>Please review your answers before submission.</p>
            <p style="margin-top: 1cm; font-size: 10pt;">"The pursuit of knowledge is a journey without end."</p>
            <p style="font-size: 10pt;">"May your understanding deepen with every challenge."</p>
        </div>
    `;

    const examHeaderHtml = `<div class="exam-details page-break-inside-avoid">Total Questions: ${questions.length}</div>`;
    const questionListContent = `<h2 class="page-break-before">Questions</h2><ol class="question-list">${questionItemsHtml}</ol>${endOfExamSectionHtml}`;
    const solutionListContent = `<h2 class="page-break-before">Solutions</h2><div class="solutions-pdf"><ol class="question-list">${solutionItemsHtml}</ol></div>`;

    const finalQuestionHtml = generatePdfBaseHtml(`Exam: ${examId}`, examHeaderHtml + questionListContent);
    const finalSolutionHtml = generatePdfBaseHtml(`Solutions: ${examId}`, examHeaderHtml + solutionListContent);

    return { questionHtml: finalQuestionHtml, solutionHtml: finalSolutionHtml };
}

export function generateNotePdfHtml(note) {
     const noteTitle = note.title || '[Content Missing]';
     let noteContent = note.content || '[Content Missing]';
     const dateStr = note.timestamp ? new Date(note.timestamp).toLocaleString() : 'N/A';
     const titleSuffix = note.filename ? ` (from file: ${escapeHtml(note.filename)})` : '';
     const noteSpecificInlineStyles = `<style>
        .note-meta p { text-align: left !important; margin-bottom: 0.1em !important; font-size: 9pt !important; color: #555 !important; }
        .note-meta { margin-bottom: 0.4cm !important; padding-bottom: 0.15cm !important; border-bottom: 0.5pt dotted #aaa !important; }
        .note-image-container { margin: 0.4em 0 !important; }
        .note-image { max-width: 70% !important; border: 1px solid #ddd !important; padding: 1px !important;}
     </style>`;

     let contentForPdf = '';
     let imageHtml = '';

     const imageMarkdownRegex = /!\[(.*?)\]\((.*?)\)/;
     const imgMatchInContent = noteContent.match(imageMarkdownRegex);

     if (imgMatchInContent) {
          const imageUrl = imgMatchInContent[2];
          noteContent = noteContent.replace(imageMarkdownRegex, '').trim();
          imageHtml = `<div class="note-image-container page-break-inside-avoid"><img src="${escapeHtml(imageUrl)}" alt="Note Image" class="note-image" crossorigin="anonymous" onerror="this.style.display='none';console.warn('PDF Image Load Fail (Note): ${escapeHtml(imageUrl)}')"></div>`;
     } else if (note.imageDataUri) { // Used for uploaded images stored as data URIs
          imageHtml = `<div class="note-image-container page-break-inside-avoid"><img src="${escapeHtml(note.imageDataUri)}" alt="Note Image" class="note-image" crossorigin="anonymous"></div>`;
     }

     if (note.type === 'latex') {
         contentForPdf = `<div class="note-latex-content">${noteContent}</div>`; // Keep raw LaTeX
     } else if (note.type === 'ai_review') {
          contentForPdf = `<div class="note-ai-review-content">${noteContent}</div>`; // Assumes content is pre-formatted HTML
     } else { // Text notes
          contentForPdf = `<div class="note-text-content">${escapeHtml(noteContent).replace(/\n/g, '<br>\n')}</div>`;
     }

     const innerHtml = `
         <div class="note-meta page-break-inside-avoid">
             <p>Chapter ${note.chapterNum || 'N/A'}</p>
             <p>Updated: ${dateStr}${titleSuffix}</p>
         </div>
         ${imageHtml}
         ${contentForPdf}
     `;
     return generateFormulaSheetPdfBaseHtml(`Note: ${noteTitle}`, innerHtml).replace('</head>', `${noteSpecificInlineStyles}</head>`);
}

// NEW: Function to generate HTML for exam feedback PDF
export function generateExamFeedbackPdfHtml(examId, examDetails, feedbackDetails) {
    const { score, maxScore, type, timestamp, questions, userAnswers, markingResults } = examDetails;
    const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : 0;
    const date = new Date(timestamp).toLocaleString();

    let questionsFeedbackHtml = "";
    if (questions && questions.length > 0 && markingResults?.questionResults) {
        questions.forEach((q, index) => {
            const questionId = q.id || `q-${index + 1}`;
            const result = markingResults.questionResults.find(r => r.questionId === questionId);
            const qScore = result?.score ?? 0;
            const isProblemType = q.isProblem || !q.options || q.options.length === 0;
            const qMaxScore = isProblemType ? MAX_MARKS_PER_PROBLEM : MAX_MARKS_PER_MCQ;
            const qFeedback = result?.feedback || "No specific feedback.";
            const userAnswer = userAnswers?.[questionId] || "<i>Not Answered</i>";
            const aiExplanation = feedbackDetails[questionId]?.explanationHtml || "No AI explanation generated yet.";

            questionsFeedbackHtml += `
                <div class="question-feedback-item page-break-inside-avoid" style="border: 1px solid #ccc; padding: 10px; margin-bottom: 15px; border-radius: 5px;">
                    <h4 style="font-size: 13pt; margin-bottom: 5px;">Question ${index + 1} (Score: ${qScore.toFixed(1)}/${qMaxScore.toFixed(1)})</h4>
                    <p style="font-size: 10pt; font-style: italic; color: #555;">Question Text: ${q.text.substring(0,150)}...</p>
                    <p style="font-size: 10pt;"><strong>Your Answer:</strong> ${escapeHtml(userAnswer)}</p>
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ddd;">
                        <h5 style="font-size: 11pt; margin-bottom: 3px;">AI Marking Feedback:</h5>
                        <div class="ai-marking-feedback" style="font-size: 10pt;">${escapeHtml(qFeedback)}</div>
                    </div>
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ddd;">
                        <h5 style="font-size: 11pt; margin-bottom: 3px;">AI Explanation:</h5>
                        <div class="ai-explanation-content" style="font-size: 10pt;">${aiExplanation}</div>
                    </div>
                </div>
            `;
        });
    }

    const overallFeedbackHtml = markingResults?.overallFeedback ? `
        <div class="overall-feedback-section" style="margin-top: 20px; padding: 15px; border: 1px solid #0284c7; border-radius: 5px; background-color: #f0f9ff;">
            <h3 style="font-size: 14pt; color: #0284c7; margin-bottom: 10px;">Overall AI Feedback</h3>
            <p><strong>Summary:</strong> ${escapeHtml(markingResults.overallFeedback.overall_feedback || 'N/A')}</p>
            <p><strong>Strengths:</strong> ${escapeHtml(markingResults.overallFeedback.strengths?.join(', ') || 'N/A')}</p>
            <p><strong>Weaknesses:</strong> ${escapeHtml(markingResults.overallFeedback.weaknesses?.join(', ') || 'N/A')}</p>
            <p><strong>Recommendations:</strong> ${escapeHtml(markingResults.overallFeedback.study_recommendations?.join(', ') || 'N/A')}</p>
        </div>
    ` : '<p>No overall AI feedback available.</p>';

    const innerContent = `
        <div class="exam-summary" style="text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #ccc;">
            <p><strong>Exam ID:</strong> ${escapeHtml(examId)}</p>
            <p><strong>Type:</strong> ${escapeHtml(type)}</p>
            <p><strong>Completed:</strong> ${date}</p>
            <h2 style="font-size: 18pt; color: ${parseFloat(percentage) >= PASSING_GRADE_PERCENT ? 'green' : 'red'};">Score: ${percentage}% (${score.toFixed(1)}/${maxScore.toFixed(1)})</h2>
        </div>
        ${overallFeedbackHtml}
        <h3 style="font-size: 14pt; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Detailed Question Feedback</h3>
        ${questionsFeedbackHtml || '<p>No detailed question feedback available.</p>'}
    `;

    // Use generatePdfBaseHtml as it's more generic for textual content with MathJax
    return generatePdfBaseHtml(`Exam Feedback - ${examId}`, innerContent);
}


export async function generateAndDownloadPdfWithMathJax(htmlContent, baseFilename) {
    showLoading(`Requesting PDF generation for: ${baseFilename}...`);
    const PDF_SERVER_URL = 'http://localhost:3001/generate-pdf';

    try {
        const response = await fetch(PDF_SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ htmlContent: htmlContent, filename: `${baseFilename}.pdf` }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`PDF server error: ${response.status} - ${errorText}`);
        }
        const pdfBlob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${baseFilename}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        console.log(`[PDF Client] PDF '${baseFilename}.pdf' downloaded successfully.`);
    } catch (error) {
        console.error(`[PDF Client] Error generating or downloading PDF for '${baseFilename}':`, error);
        alert(`Failed to generate PDF: ${baseFilename}. Error: ${error.message}. Ensure the local PDF server is running and accessible.`);
    } finally {
        hideLoading();
    }
}

export function generateTexSource(examId, questions) {
    const placeholderText = '[Content Missing]';
    const escapeLatex = (str) => {
        if (str === null || typeof str === 'undefined') str = placeholderText;
        str = String(str);
        let mathSegments = [];
        let placeholderCounter = 0;
        const placeholderPrefix = "@@LATEX_PLACEHOLDER_";
        const placeholderSuffix = "@@END_LATEX_PLACEHOLDER";
        let processedStr = str.replace(
            /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|(?<!\\)\$(?:[^\$\\]|\\.)*?\$|\\\(.*?\\\))/g,
            (match) => {
                if (match.includes(placeholderPrefix)) return match;
                const placeholder = `${placeholderPrefix}${placeholderCounter++}${placeholderSuffix}`;
                mathSegments.push({ placeholder, math: match });
                return placeholder;
            }
        );
        processedStr = processedStr
            .replace(/\\/g, '\\textbackslash{}')
            .replace(/~/g, '\\textasciitilde{}')
            .replace(/\^/g, '\\textasciicircum{}')
            .replace(/&/g, '\\&')
            .replace(/%/g, '\\%')
            .replace(/\$/g, '\\$') // Escaped $ outside math
            .replace(/#/g, '\\#')
            .replace(/_/g, '\\_')
            .replace(/{/g, '\\{')
            .replace(/}/g, '\\}')
            .replace(/>/g, '\\textgreater{}')
            .replace(/</g, '\\textless{}');
        // Convert newlines more carefully
        processedStr = processedStr
            .replace(/\n\n+/g, '\\par\\medskip\n') // Double newline to paragraph break
            .replace(/\n/g, '\\newline \n');        // Single newline to LaTeX newline

        mathSegments.forEach(item => {
            const regexSafePlaceholder = item.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(regexSafePlaceholder, 'g');
            processedStr = processedStr.replace(regex, item.math); // Put raw LaTeX back
        });
        return processedStr;
    };

    let questionsBody = '';
    let solutionsBody = '';
    const examIdTex = escapeLatex(examId || placeholderText);

    const imageBasePathForTex = './images/'; // Relative path expected by LaTeX \includegraphics if images are in an 'images' subfolder

    questions.forEach((q, index) => {
        const questionNumber = index + 1;
        let qTextForTex = escapeLatex(q.text);
        let imageTex = '';

        const imageMarkdownRegex = /!\[(.*?)\]\((.*?)\)/;
        const imgMatchInText = qTextForTex.match(imageMarkdownRegex);
        let imageFilenameForTex = null;

        if (imgMatchInText) {
            imageFilenameForTex = imgMatchInText[2];
            qTextForTex = qTextForTex.replace(imageMarkdownRegex, '').trim();
             if (imageFilenameForTex.startsWith('./') || imageFilenameForTex.startsWith('../')) {
                 // If it's already relative, try to use the filename part
                 imageFilenameForTex = imageFilenameForTex.split('/').pop();
             }
        } else if (q.image && typeof q.image === 'string') {
            imageFilenameForTex = q.image.split('/').pop(); // Just the filename
        }
        
        if (imageFilenameForTex) {
            const safeImageFilenameForTex = escapeLatex(cleanTextForFilename(imageFilenameForTex.split('?')[0]));
            imageTex = `\\begin{center}\n\\includegraphics[width=0.6\\textwidth,keepaspectratio]{${imageBasePathForTex}${safeImageFilenameForTex}}\n\\end{center}\n`;
        }


        let optionsText = '';
        let solutionAnswer = (q.isProblem || !q.options || q.options.length === 0) ? 'Solution details vary.' : escapeLatex(q.correctAnswer || 'N/A');
        if (!(q.isProblem || !q.options || q.options.length === 0) && q.options && q.options.length > 0) {
             optionsText = (q.options || []).map(opt => `\\item[${escapeLatex(opt.letter)}.] ${escapeLatex(opt.text)}`).join('\n      ');
        }
        let optionsBlock = optionsText ? `    \\begin{itemize}[labelwidth=!, labelindent=0pt, leftmargin=*, itemsep=0.2em]\n      ${optionsText}\n    \\end{itemize}\n` : '';
        questionsBody += `\\item ${qTextForTex}\n${imageTex}${optionsBlock}\n\\vspace{0.5cm}\n`;
        solutionsBody += `\\item ${qTextForTex}\n${imageTex}${optionsBlock}\n    \\textbf{Answer: ${solutionAnswer}}\n\\vspace{0.5cm}\n`;
    });

    const fullDocumentPreamble = `${LATEX_DOCUMENT_CLASS}\n${LATEX_PACKAGES}\n\\usepackage{enumitem}\n\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\usepackage{graphicx}\n\\usepackage{hyperref}\n\\graphicspath{{${imageBasePathForTex}}}\n\\usepackage{geometry}\n\\geometry{margin=1.5cm}\n\\title{Exam: ${examIdTex}}\n\\author{Lyceum}\n\\date{\\today}\n\n\\begin{document}\n\\maketitle\n\\thispagestyle{empty}\n\\pagestyle{plain}\n\\parindent0pt\n\\sloppy\n\n`;
    const questionsTex = `${fullDocumentPreamble}\\section*{Questions}\n\\begin{enumerate}[label=\\arabic*., itemsep=0.5cm, topsep=0.2cm]\n\n${questionsBody}\\end{enumerate}\n\n\\end{document}`;
    const solutionsTex = `${fullDocumentPreamble}\\section*{Solutions}\n\\begin{enumerate}[label=\\arabic*., itemsep=0.5cm, topsep=0.2cm]\n\n${solutionsBody}\\end{enumerate}\n\n\\end{document}`;
    return { questionsTex, solutionsTex };
}

export function downloadTexFile(filename, base64Content) {
     try {
         const byteCharacters = atob(base64Content);
         const byteNumbers = new Array(byteCharacters.length);
         for (let i = 0; i < byteCharacters.length; i++) {
             byteNumbers[i] = byteCharacters.charCodeAt(i);
         }
         const byteArray = new Uint8Array(byteNumbers);
         const blob = new Blob([byteArray], { type: "text/plain;charset=utf-8" });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = filename;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
     } catch (e) {
         console.error("Error creating/downloading .tex file:", e);
         alert(`Failed to prepare the download file (${filename}). Error: ${e.message}. See console for details.`);
     }
}
// --- END OF FILE ui_pdf_generation.js ---