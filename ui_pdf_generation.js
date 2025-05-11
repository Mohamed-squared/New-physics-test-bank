import { PDF_GENERATION_OPTIONS, LATEX_DOCUMENT_CLASS, LATEX_PACKAGES, LATEX_BEGIN_DOCUMENT, LATEX_END_DOCUMENT } from './config.js';
import { showLoading, hideLoading, renderMathIn, escapeHtml } from './utils.js'; // Added escapeHtml import

// --- PDF / TeX Generation ---

// Updated to better match the desired structure, still HTML based
export function generatePdfHtml(examId, questions) {
    let questionHtml = '';
    let solutionHtml = '';

    const placeholderText = '[Content Missing]';

    // Basic Styles for PDF rendering (Mimicking TeX structure)
    // Added class for AI Review and Note content
    const styles = `
        <style>
            body { font-family: 'Times New Roman', Times, serif; line-height: 1.4; font-size: 11pt; margin: 0; padding: 0; }
            .container { padding: 1.5cm; } /* Matches jsPDF margin */
            .exam-header, .note-header { text-align: center; margin-bottom: 1.5em; font-size: 14pt; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 0.5em; }
            .question-list { list-style-type: decimal; padding-left: 1.5em; margin-left: 0; } /* Main question numbering */
            .question-item, .note-content, .ai-review-content { margin-bottom: 1.2em; page-break-inside: avoid; }
            .question-content { margin-left: 0; }
            .question-text { margin-bottom: 0.8em; }
            .question-image-container { text-align: center; margin: 0.8em 0; } /* Center image container */
            .question-image { max-width: 60%; max-height: 150px; height: auto; display: inline-block; border: 1px solid #eee; padding: 2px; } /* Adjust width as needed */
            .options-list { list-style-type: upper-alpha; padding-left: 1.5em; margin-top: 0.5em; margin-bottom: 0.5em; } /* Option lettering */
            .option-item { margin-bottom: 0.3em; }
            .option-text { display: inline; }
            .solution { color: #006400; font-weight: bold; margin-top: 0.5em; padding-top: 0.3em; border-top: 1px dashed #ddd; }
            /* MathJax Specific Styling for PDF */
            mjx-container { text-align: left !important; margin: 0.5em 0 !important; display: block !important; } /* Ensure block display */
            mjx-container[display="true"] { display: block; overflow-x: auto; }
            mjx-container > svg { max-width: 100%; vertical-align: middle; } /* Prevent SVG overflow */
            .MathJax_Display { text-align: left !important; }
            /* Prose adjustments for tighter spacing */
            .prose { max-width: none; }
            .prose p { margin-top: 0.3em; margin-bottom: 0.3em; line-height: 1.3; }
            .prose ol, .prose ul { margin-top: 0.3em; margin-bottom: 0.3em; padding-left: 1.5em;}
            .prose li { margin-bottom: 0.1em; line-height: 1.3;}
            .prose code { font-size: 0.85em; padding: 0.1em 0.3em; background-color: #f0f0f0; border-radius: 3px; }
            .prose pre { font-size: 0.85em; background-color: #f0f0f0; padding: 0.5em; border-radius: 4px; overflow-x: auto; }
            .prose pre code { background-color: transparent; padding: 0; }
            /* Problem type styling */
            .problem-text-container { border: 1px solid #eee; padding: 10px; margin-top: 10px; background-color: #f9f9f9; }
            /* AI Review styling */
             .ai-review-content .prose { border-left: 3px solid #8b5cf6; padding-left: 1em; background-color: #faf5ff; }
        </style>
    `;

    // Questions are assumed to be pre-shuffled before calling this function
    questions.forEach((q, index) => { // Use index for numbering if needed, though list handles it
        let qTextForHtml = q.text || placeholderText;
        let optionsForHtml = '';
        let solutionAnswer = q.answer || 'N/A'; // Default for MCQ

        if (q.isProblem) {
             optionsForHtml = ''; // No options for problems
             solutionAnswer = 'See marking scheme/AI feedback.'; // Placeholder for solution
        } else if (q.options && q.options.length > 0) {
             optionsForHtml = (q.options || []).map(opt => {
                 let optTextForHtml = opt.text || placeholderText;
                 return `<li class="option-item"><span class="option-text">${optTextForHtml}</span></li>`;
             }).join('');
             optionsForHtml = `<ol class="options-list" type="A">${optionsForHtml}</ol>`;
        }

        let imageHtml = q.image ? `<div class="question-image-container"><img src="${q.image}" alt="Question Image" class="question-image" crossorigin="anonymous"></div>` : '';

        // Assemble HTML for the question item
        const questionItemHtml = `
            <li class="question-item">
                <div class="question-content">
                    <div class="question-text prose ${q.isProblem ? 'problem-text-container' : ''}">${qTextForHtml}</div>
                    ${imageHtml}
                    ${optionsForHtml || ''}
                 </div>
            </li>
        `;
        questionHtml += questionItemHtml;

        // Assemble HTML for the solution item (includes answer)
        solutionHtml += `
            <li class="question-item">
                 <div class="question-content">
                    <div class="question-text prose ${q.isProblem ? 'problem-text-container' : ''}">${qTextForHtml}</div>
                    ${imageHtml}
                    ${optionsForHtml || ''}
                    <div class="solution">Answer: ${solutionAnswer}</div>
                </div>
            </li>
         `;
    });

    // Wrap generated content in full HTML structure
    const fullQuestionHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Exam ${escapeHtml(examId || placeholderText)}</title>${styles}</head><body><div class="container"><div class="exam-header">Exam: ${escapeHtml(examId || placeholderText)}</div><ol class="question-list">${questionHtml}</ol></div></body></html>`;
    const fullSolutionHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Solutions ${escapeHtml(examId || placeholderText)}</title>${styles}</head><body><div class="container"><div class="exam-header">Solutions: ${escapeHtml(examId || placeholderText)}</div><ol class="question-list">${solutionHtml}</ol></div></body></html>`;

    console.log("generatePdfHtml: Generated Question HTML (first 1000 chars):", fullQuestionHtml.substring(0, 1000));
    console.log("generatePdfHtml: Generated Solution HTML (first 1000 chars):", fullSolutionHtml.substring(0, 1000));

    return { questionHtml: fullQuestionHtml, solutionHtml: fullSolutionHtml };
}

// --- NEW: Generate PDF HTML for a single Note ---
export function generateNotePdfHtml(note) {
    const placeholderText = '[Content Missing]';
    const styles = `
        <style>
            body { font-family: 'Times New Roman', Times, serif; line-height: 1.4; font-size: 11pt; margin: 0; padding: 0; }
            .container { padding: 1.5cm; }
            .note-header { text-align: center; margin-bottom: 1.5em; font-size: 14pt; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 0.5em; }
            .note-meta { text-align: center; font-size: 9pt; color: #555; margin-bottom: 1.5em; }
            .note-content { margin-bottom: 1.2em; page-break-inside: avoid; } /* Added page-break-inside */
            /* MathJax Specific Styling for PDF */
            mjx-container { text-align: left !important; margin: 0.5em 0 !important; display: block !important; }
            mjx-container[display="true"] { display: block; overflow-x: auto; }
            mjx-container > svg { max-width: 100%; vertical-align: middle; }
            .MathJax_Display { text-align: left !important; }
            /* Prose adjustments */
            .prose { max-width: none; } .prose p { margin: 0.5em 0; } .prose ul, .prose ol { margin: 0.5em 0; padding-left: 1.6em; } .prose li { margin: 0.1em 0; }
            .prose code { font-size: 0.9em; padding: 0.1em 0.3em; background-color: #f0f0f0; border-radius: 3px; border: 1px solid #ddd; }
            .prose pre { font-size: 0.9em; background-color: #f0f0f0; padding: 0.7em; border-radius: 4px; overflow-x: auto; border: 1px solid #ddd;}
            .prose pre code { background-color: transparent; padding: 0; border: none; }
            /* AI Review styling */
             .ai-review-content .prose { border-left: 3px solid #ddd; padding-left: 1em; background-color: #f8f8f8; }
        </style>
    `;
    const noteTitle = note.title || placeholderText;
    const noteContent = note.content || placeholderText;
    const dateStr = note.timestamp ? new Date(note.timestamp).toLocaleString() : 'N/A';

    let contentForPdf = '';
    if (note.type === 'latex') {
         contentForPdf = `<div class="note-content"><pre><code>${escapeHtml(noteContent)}</code></pre></div>`;
    } else if (note.type === 'ai_review') {
         contentForPdf = `<div class="ai-review-content note-content">${noteContent}</div>`; // noteContent is already HTML
    } else { // text or file (with extracted text)
        contentForPdf = `<div class="note-content prose">${String(noteContent).replace(/\n/g, '<br>')}</div>`;
    }

    const fullNoteHtml = `
        <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Note - ${escapeHtml(noteTitle)}</title>${styles}</head>
        <body><div class="container">
            <div class="note-header">Note: ${escapeHtml(noteTitle)}</div>
            <div class="note-meta">Chapter ${note.chapterNum || 'N/A'} | Last Updated: ${dateStr} ${note.filename ? `| Original File: ${escapeHtml(note.filename)}` : ''}</div>
            ${contentForPdf}
        </div></body></html>`;
    
    console.log("generateNotePdfHtml: Generated Note HTML (first 1000 chars):", fullNoteHtml.substring(0, 1000));
    return fullNoteHtml;
}


export async function generateAndDownloadPdfWithMathJax(htmlContent, baseFilename) {
    showLoading(`Generating ${baseFilename}...`);

    const tempElement = document.createElement('div');
    tempElement.id = `pdf-temp-render-area-${Date.now()}`; // Unique ID for easier debugging
    tempElement.style.position = 'fixed';
    tempElement.style.left = '-9999px'; // Keep it off-screen
    // tempElement.style.left = '0px'; // For debugging layout, make it visible
    tempElement.style.top = '0px';
    tempElement.style.width = '21cm'; // A4 width approx
    tempElement.style.minHeight = '29.7cm'; // A4 height approx, will expand if content is taller
    tempElement.style.height = 'auto'; // Let content define height
    tempElement.style.visibility = 'hidden'; // Hidden, not display:none, so rendering happens
    // tempElement.style.visibility = 'visible'; // For debugging layout
    tempElement.style.background = 'white'; // Ensure a white background
    tempElement.innerHTML = htmlContent;
    document.body.appendChild(tempElement);

    console.log(`generateAndDownloadPdf: Temporary element ${tempElement.id} appended to body.`);
    console.log(`generateAndDownloadPdf: Initial innerHTML of ${tempElement.id} (first 1000 chars):`, (tempElement.innerHTML || "").substring(0, 1000));

    try {
        console.log(`generateAndDownloadPdf: Rendering MathJax in ${tempElement.id}...`);
        try {
            await renderMathIn(tempElement);
            console.log(`generateAndDownloadPdf: MathJax rendering complete for ${tempElement.id}.`);
        } catch (mathJaxError) {
            console.error(`generateAndDownloadPdf: MathJax rendering failed inside temporary element ${tempElement.id}.`, mathJaxError);
            hideLoading();
            if (document.body.contains(tempElement)) {
                document.body.removeChild(tempElement);
                console.log(`generateAndDownloadPdf: Removed temporary element ${tempElement.id} after MathJax error.`);
            }
            // alert('MathJax rendering failed during PDF generation. Cannot proceed. Check console.');
            throw new Error('MathJax rendering failed during PDF generation. Check console.');
        }
        
        // Increased delay to allow complex rendering and potential image loading
        console.log(`generateAndDownloadPdf: Waiting 2.5s for rendering to settle in ${tempElement.id}...`);
        await new Promise(resolve => setTimeout(resolve, 2500)); 

        console.log(`generateAndDownloadPdf: Dimensions of ${tempElement.id} before html2pdf: 
            OffsetWidth: ${tempElement.offsetWidth}, OffsetHeight: ${tempElement.offsetHeight},
            ScrollWidth: ${tempElement.scrollWidth}, ScrollHeight: ${tempElement.scrollHeight}`);


        const options = { ...PDF_GENERATION_OPTIONS }; // Use global config
        options.filename = `${baseFilename}.pdf`;
        options.html2canvas = {
            ...options.html2canvas,
            scale: 2, // DPI scaling
            logging: true, // Enable html2canvas logging for debugging
            useCORS: true, // For images from other domains
            windowWidth: tempElement.scrollWidth, // Capture full width
            windowHeight: tempElement.scrollHeight, // Capture full height
            scrollY: 0, // Start capture from the top of the element
            scrollX: 0,
        };
        options.jsPDF = {
            ...options.jsPDF,
            unit: 'pt', // Points are generally more consistent with html2canvas output
            format: 'a4',
            orientation: 'portrait'
        };
        // Adjust pagebreak classes if needed; .question-item, .note-content, .ai-review-content already exist
        options.pagebreak = { 
            mode: ['avoid-all', 'css', 'legacy'], 
            before: ['.question-item', '.note-content', '.ai-review-content', '.note-header'] // Added .note-header as a potential break point
        };

        console.log(`generateAndDownloadPdf: Starting html2pdf generation for ${options.filename} with options:`, JSON.stringify(options));
        
        const pdfWorker = html2pdf().set(options).from(tempElement);

        await pdfWorker.save().catch(pdfError => {
             console.error(`generateAndDownloadPdf: html2pdf generation/save error for ${options.filename}:`, pdfError);
             // alert(`Failed to generate PDF (${options.filename}): ${pdfError.message || 'Unknown PDF generation error'}. Check console for details.`);
             throw new Error(`html2pdf failed for ${options.filename}: ${pdfError.message || 'Unknown PDF generation error'}`);
        });

        console.log(`generateAndDownloadPdf: PDF generation successful for ${options.filename}.`);

    } catch (error) {
        console.error(`generateAndDownloadPdf: Error generating PDF ${baseFilename}:`, error);
        alert(`Failed to generate PDF: ${baseFilename}. Error: ${error.message}. Check console for more details.`);
        // No need to re-throw here, the alert and console log are sufficient for user/dev feedback.
    } finally {
        console.log(`generateAndDownloadPdf: Entering finally block for ${tempElement.id}.`);
        if (document.body.contains(tempElement)) {
             document.body.removeChild(tempElement);
             console.log(`generateAndDownloadPdf: Successfully removed temporary element ${tempElement.id} from body.`);
        } else {
             console.warn(`generateAndDownloadPdf: Temporary element ${tempElement.id} was not found in body during finally block, might have been removed earlier.`);
        }
        hideLoading();
        console.log(`generateAndDownloadPdf: Loading hidden for ${baseFilename}.`);
    }
}


// --- TeX Source Generation (Rewritten) ---
export function generateTexSource(examId, questions) {
    const placeholderText = '[Content Missing]';
    // Helper to escape LaTeX special characters, ignoring common math delimiters
    const escapeLatex = (str) => {
        if (str === null || typeof str === 'undefined') str = placeholderText;
        str = String(str);

        // More robust placeholder technique
        let mathSegments = [];
        let placeholderCounter = 0;
        const placeholderPrefix = "@@MATHJAX_LATEX_PLACEHOLDER_";
        const placeholderSuffix = "@@";

        // Temporarily replace math segments: $, $$, \[, \], \(, \)
        let processedStr = str.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[\s\S]*?\$|\\\(.*?\\\))/g, (match) => {
            const placeholder = `${placeholderPrefix}${placeholderCounter++}${placeholderSuffix}`;
            mathSegments.push({ placeholder, math: match });
            return placeholder;
        });

        // Escape the remaining text
        processedStr = processedStr
            .replace(/\\/g, '\\textbackslash{}') // Must be first
            .replace(/~/g, '\\textasciitilde{}')
            .replace(/\^/g, '\\textasciicircum{}')
            .replace(/&/g, '\\&')
            .replace(/%/g, '\\%')
            .replace(/\$/g, '\\$') // Escape literal dollar signs if any remain
            .replace(/#/g, '\\#')
            .replace(/_/g, '\\_')
            .replace(/{/g, '\\{')
            .replace(/}/g, '\\}')
            .replace(/>/g, '\\textgreater{}')
            .replace(/</g, '\\textless{}')
            .replace(/\n/g, '\\\\ \n'); // Replace newline with LaTeX line break

        // Restore math segments
        mathSegments.forEach(item => {
            const regex = new RegExp(item.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
             processedStr = processedStr.replace(regex, item.math);
        });

        return processedStr;
    };

    // Build TeX strings
    let questionsBody = '';
    let solutionsBody = '';
    const examIdTex = escapeLatex(examId || placeholderText);

    // Questions are assumed to be pre-shuffled
    questions.forEach((q, index) => { // Use index for numbering if needed, though list handles it
        let qTextForTex = escapeLatex(q.text);
        let imageTex = '';
        if (q.image) {
             // Basic filename cleaning - assumes image is in the same directory or relative path is correct
             const safeImageFilename = q.image.replace(/[{}\\^%&#_ ]/g, '-');
             imageTex = `\\begin{center}\n\\includegraphics[width=0.6\\textwidth]{${safeImageFilename}}\n\\end{center}\n`;
        }

        let optionsText = '';
        let solutionAnswer = escapeLatex(q.answer || 'N/A'); // Default

        if (q.isProblem) {
             optionsText = ''; // No options for problems
             solutionAnswer = 'See marking scheme/AI feedback.'; // This doesn't need LaTeX escaping if it's plain text
        } else if (q.options && q.options.length > 0) {
             optionsText = (q.options || []).map(opt => {
                 let escapedOptText = escapeLatex(opt.text);
                 return `\\item ${escapedOptText}`;
             }).join('\n      ');
             // solutionAnswer is already set and escaped above
        }

        let optionsBlock = '';
        if (optionsText) {
             optionsBlock = `    \\begin{enumerate}[label=\\Alph*.]\n      ${optionsText}\n    \\end{enumerate}\n`;
        }

        // Assemble TeX for one question item
        const questionItemTex = `\\item ${qTextForTex}\n${imageTex}${optionsBlock}`;
        questionsBody += questionItemTex + '\n\n';

        // Assemble TeX for one solution item
        const solutionItemTex = `\\item ${qTextForTex}\n${imageTex}${optionsBlock}\n    \\textbf{Answer: ${solutionAnswer}}\n`;
        solutionsBody += solutionItemTex + '\n\n';
    });

    // Combine into full documents
    const questionsTex = `${LATEX_DOCUMENT_CLASS}\n${LATEX_PACKAGES}\n${LATEX_BEGIN_DOCUMENT}\n\n\\section*{Exam: ${examIdTex}}\n\\begin{enumerate}\n\n${questionsBody}\\end{enumerate}\n\n${LATEX_END_DOCUMENT}`;
    const solutionsTex = `${LATEX_DOCUMENT_CLASS}\n${LATEX_PACKAGES}\n${LATEX_BEGIN_DOCUMENT}\n\n\\section*{Solutions: ${examIdTex}}\n\\begin{enumerate}\n\n${solutionsBody}\\end{enumerate}\n\n${LATEX_END_DOCUMENT}`;

    return { questionsTex, solutionsTex };
}

// --- File Download Helper ---
export function downloadTexFile(filename, base64Content) {
     try {
         const content = decodeURIComponent(escape(atob(base64Content)));
         const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
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
         alert(`Failed to prepare the download file (${filename}). See console for details.`);
     }
}