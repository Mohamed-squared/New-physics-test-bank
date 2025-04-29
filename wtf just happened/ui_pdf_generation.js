// --- START OF FILE ui_pdf_generation.js ---

import { PDF_GENERATION_OPTIONS, LATEX_DOCUMENT_CLASS, LATEX_PACKAGES, LATEX_BEGIN_DOCUMENT, LATEX_END_DOCUMENT } from './config.js';
import { showLoading, hideLoading, renderMathIn } from './utils.js';

// --- PDF / TeX Generation ---

/**
 * Generates HTML content for Question and Solution PDFs from a list of items (MCQs and Problems).
 * @param {string} examId - The ID of the exam.
 * @param {Array<object>} items - Array of item objects ({ type: 'mcq'/'problem', ... }).
 * @returns {object} - { questionHtml: string, solutionHtml: string }
 */
export function generatePdfHtml(examId, items) {
    let questionHtml = '';
    let solutionHtml = '';

    // Styles remain the same
    const styles = `
        <style>
            body { font-family: 'Times New Roman', Times, serif; line-height: 1.4; font-size: 11pt; margin: 0; padding: 0; background-color: white; /* Ensure white background for PDF */ }
            .container { padding: 1.5cm; } /* Matches jsPDF margin */
            .exam-header { text-align: center; margin-bottom: 1.5em; font-size: 14pt; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 0.5em; }
            .question-list { list-style-type: decimal; padding-left: 1.5em; margin-left: 0; } /* Main question numbering */
            .question-item { margin-bottom: 1.2em; page-break-inside: avoid; }
            .question-content { margin-left: 0; }
            .question-text { margin-bottom: 0.8em; }
            .question-image-container { text-align: center; margin: 0.8em 0; } /* Center image container */
            .question-image { max-width: 60%; max-height: 150px; height: auto; display: inline-block; border: 1px solid #eee; padding: 2px; } /* Adjust width as needed */
            .options-list { list-style-type: upper-alpha; padding-left: 1.5em; margin-top: 0.5em; margin-bottom: 0.5em; } /* Option lettering */
            .option-item { margin-bottom: 0.3em; }
            .option-text { display: inline; }
            .solution { color: #006400; font-weight: bold; margin-top: 0.5em; padding-top: 0.3em; border-top: 1px dashed #ddd; }
            /* MathJax Container Styling */
            mjx-container { display: inline-block !important; margin: 0.1em 0 !important; } /* Default inline */
            mjx-container[display="true"] { display: block !important; /* Override inline */ overflow-x: auto; text-align: left !important; margin: 0.5em 0 !important; }
            .MathJax_Display { text-align: left !important; margin: 0.5em 0 !important; } /* Older MathJax versions */
            /* Prose styles for basic text formatting */
            .prose p { margin-top: 0.5em; margin-bottom: 0.5em; }
            .prose ol, .prose ul { margin-top: 0.5em; margin-bottom: 0.5em; padding-left: 1.5em;}
            .prose li { margin-bottom: 0.2em; }
            /* Ensure image backgrounds are white for printing */
             img { background-color: white; }
        </style>
    `;


    // Iterate through the combined list of items
    items.forEach((item, index) => { // Use index + 1 for overall numbering
        let itemTextForHtml = item.text || `[${item.type === 'mcq' ? 'Question' : 'Problem'} text unavailable]`;
        let imageHtml = item.image ? `<div class="question-image-container"><img src="${item.image}" alt="${item.type} Image" class="question-image" crossorigin="anonymous"></div>` : '';
        let optionsForHtml = '';
        let solutionText = '';

        if (item.type === 'mcq') {
            optionsForHtml = (item.options || []).map(opt => {
                let optTextForHtml = opt.text || '[Option text unavailable]';
                return `<li class="option-item"><span class="option-text">${optTextForHtml}</span></li>`;
            }).join('');
            if (optionsForHtml) {
                optionsForHtml = `<ol class="options-list" type="A">${optionsForHtml}</ol>`;
            }
            solutionText = `<div class="solution">Answer: ${item.answer || 'N/A'}</div>`;
        } else { // Problem type - no options, no answer in solutions PDF
             solutionText = ''; // No pre-defined answer for problems
        }

        // Assemble HTML for the question item (same structure for both)
        const questionItemHtml = `
            <li class="question-item">
                <div class="question-content">
                    <div class="question-text prose">${itemTextForHtml}</div>
                    ${imageHtml}
                    ${optionsForHtml}
                 </div>
            </li>
        `;
        questionHtml += questionItemHtml;

        // Assemble HTML for the solution item (only includes answer for MCQs)
        solutionHtml += `
            <li class="question-item">
                 <div class="question-content">
                    <div class="question-text prose">${itemTextForHtml}</div>
                    ${imageHtml}
                    ${optionsForHtml}
                    ${solutionText}
                </div>
            </li>
         `;
    });

    // Wrap generated content in full HTML structure
    const fullQuestionHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Exam ${examId}</title>${styles}</head><body><div class="container"><div class="exam-header">Exam: ${examId}</div><ol class="question-list">${questionHtml}</ol></div></body></html>`;
    const fullSolutionHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Solutions ${examId}</title>${styles}</head><body><div class="container"><div class="exam-header">Solutions: ${examId}</div><ol class="question-list">${solutionHtml}</ol></div></body></html>`;

    return { questionHtml: fullQuestionHtml, solutionHtml: fullSolutionHtml };
}


export async function generateAndDownloadPdfWithMathJax(htmlContent, baseFilename) {
    // ... (remains the same as previous corrected version) ...
    // Show loading immediately
    showLoading(`Generating ${baseFilename}...`);

    // Create a temporary, off-screen element for rendering
    const tempElement = document.createElement('div');
    tempElement.id = `pdf-render-temp-${Date.now()}`; // Unique ID
    tempElement.style.position = 'fixed'; // Use fixed to ensure it's not affected by scroll
    tempElement.style.left = '-9999px'; // Position off-screen
    tempElement.style.top = '0px';
    tempElement.style.width = '21cm'; // A4 width approx
    tempElement.style.height = 'auto'; // Allow height to grow
    tempElement.style.visibility = 'hidden'; // Keep hidden
    tempElement.style.background = 'white'; // Ensure white background
    tempElement.innerHTML = htmlContent;
    document.body.appendChild(tempElement);

    try {
        console.log("generateAndDownloadPdf: Rendering MathJax in temporary element...");
        // Render MathJax within the specific temporary element
        await renderMathIn(tempElement);
        console.log("generateAndDownloadPdf: MathJax rendering complete.");

        // Increased delay significantly to ensure all rendering (including complex SVG) completes
        console.log("generateAndDownloadPdf: Waiting for rendering stabilization (3000ms)...");
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log("generateAndDownloadPdf: Wait finished.");

        const options = { ...PDF_GENERATION_OPTIONS }; // Use global config
        options.filename = `${baseFilename}.pdf`;
        options.html2canvas = {
            ...options.html2canvas,
            scale: 2.5, // Slightly increase scale for better quality
            logging: false,
            useCORS: true, // Important if images are external
            // Ensure capturing the full scroll height/width after rendering
            windowWidth: tempElement.scrollWidth,
            windowHeight: tempElement.scrollHeight,
            // Explicitly set background to white
            backgroundColor: '#ffffff',
        };
        options.jsPDF = {
            ...options.jsPDF,
            unit: 'cm',
            format: 'a4',
            orientation: 'portrait'
        };
        // Update pagebreak targeting
        options.pagebreak = { mode: ['avoid-all', 'css', 'legacy'], before: '.question-item' };

        console.log(`Starting html2pdf generation for ${options.filename} with options:`, JSON.stringify(options));

        // Use html2pdf promise directly
        await html2pdf().from(tempElement).set(options).save();

        console.log(`PDF generation likely successful for ${options.filename}`);

    } catch (error) {
        console.error(`Error generating PDF ${baseFilename}:`, error);
        alert(`Failed to generate PDF: ${baseFilename}. Error: ${error.message}. Check console for details.`);
    } finally {
        // Cleanup the temporary element
        if (document.body.contains(tempElement)) {
             document.body.removeChild(tempElement);
        }
        hideLoading();
    }
}


/**
 * Generates LaTeX source for Question and Solution documents from a list of items (MCQs and Problems).
 * @param {string} examId - The ID of the exam.
 * @param {Array<object>} items - Array of item objects ({ type: 'mcq'/'problem', ... }).
 * @returns {object} - { questionsTex: string, solutionsTex: string }
 */
export function generateTexSource(examId, items) {
    // Helper to escape LaTeX special characters, ignoring common math delimiters
    const escapeLatex = (str) => {
        // ... (escapeLatex function remains the same) ...
        if (!str) return '';
        let mathSegments = []; let placeholderCounter = 0; const placeholderPrefix = "@@MATHJAX_LATEX_PLACEHOLDER_"; const placeholderSuffix = "@@";
        let processedStr = str.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[\s\S]*?\$|\\\(.*?\\\))/g, (match) => { const placeholder = `${placeholderPrefix}${placeholderCounter++}${placeholderSuffix}`; mathSegments.push({ placeholder, math: match }); return placeholder; });
        processedStr = processedStr.replace(/\\/g, '\\textbackslash{}').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}').replace(/&/g, '\\&').replace(/%/g, '\\%').replace(/\$/g, '\\$').replace(/#/g, '\\#').replace(/_/g, '\\_').replace(/{/g, '\\{').replace(/}/g, '\\}').replace(/>/g, '\\textgreater{}').replace(/</g, '\\textless{}').replace(/\n/g, '\\\\ \n');
        mathSegments.forEach(item => { const regex = new RegExp(item.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'); processedStr = processedStr.replace(regex, item.math); });
        return processedStr;
    };

    // Build TeX strings
    let questionsBody = '';
    let solutionsBody = '';

    // Iterate through combined items
    items.forEach((item, index) => {
        let itemNumber = index + 1; // Overall numbering
        let itemTextForTex = escapeLatex(item.text || `[${item.type} text unavailable]`);
        let imageTex = '';
        if (item.image) {
             const safeImageFilename = item.image.replace(/[{}\\^%&#_ ]/g, '-');
             imageTex = `\\begin{center}\n\\includegraphics[width=0.6\\textwidth]{${safeImageFilename}}\n\\end{center}\n`;
        }

        let optionsText = '';
        let optionsBlock = '';
        let solutionLine = '';

        if (item.type === 'mcq') {
            optionsText = (item.options || []).map(opt => {
                let escapedOptText = escapeLatex(opt.text || '[Option text unavailable]');
                return `\\item ${escapedOptText}`;
            }).join('\n      '); // Indent items for readability in TeX source

            if (optionsText) {
                 optionsBlock = `    \\begin{enumerate}[label=\\Alph*.]\n      ${optionsText}\n    \\end{enumerate}\n`;
            }
            solutionLine = `\n    \\textbf{Answer: ${item.answer || 'N/A'}}\n`;
        } else { // Problem
             // No options, no predefined answer
             optionsBlock = '';
             solutionLine = ''; // No answer provided in solutions for problems
        }

        // Assemble TeX for one item in the questions document
        const questionItemTex = `\\item [${item.type === 'problem' ? 'Problem' : 'MCQ'}] ${itemTextForTex}\n${imageTex}${optionsBlock}`;
        questionsBody += questionItemTex + '\n\n';

        // Assemble TeX for one item in the solutions document (only shows answer for MCQs)
        const solutionItemTex = `\\item [${item.type === 'problem' ? 'Problem' : 'MCQ'}] ${itemTextForTex}\n${imageTex}${optionsBlock}${solutionLine}`;
        solutionsBody += solutionItemTex + '\n\n';
    });

    // Combine into full documents
    const questionsTex = `${LATEX_DOCUMENT_CLASS}\n${LATEX_PACKAGES}\n${LATEX_BEGIN_DOCUMENT}\n\n\\section*{Exam: ${escapeLatex(examId)}}\n\\begin{enumerate}\n\n${questionsBody}\\end{enumerate}\n\n${LATEX_END_DOCUMENT}`;
    const solutionsTex = `${LATEX_DOCUMENT_CLASS}\n${LATEX_PACKAGES}\n${LATEX_BEGIN_DOCUMENT}\n\n\\section*{Solutions: ${escapeLatex(examId)}}\n\\begin{enumerate}\n\n${solutionsBody}\\end{enumerate}\n\n${LATEX_END_DOCUMENT}`;

    return { questionsTex, solutionsTex };
}


// --- File Download Helper ---
export function downloadTexFile(filename, base64Content) {
     // ... (remains the same) ...
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
// --- END OF FILE ui_pdf_generation.js ---