// --- START OF FILE ui_pdf_generation.js ---

import { PDF_GENERATION_OPTIONS, LATEX_DOCUMENT_CLASS, LATEX_PACKAGES, LATEX_BEGIN_DOCUMENT, LATEX_END_DOCUMENT } from './config.js';
import { showLoading, hideLoading, renderMathIn } from './utils.js';

// --- PDF / TeX Generation ---

// Updated to better match the desired structure, still HTML based
export function generatePdfHtml(examId, questions) {
    let questionHtml = '';
    let solutionHtml = '';

    // Basic Styles for PDF rendering (Mimicking TeX structure)
    const styles = `
        <style>
            body { font-family: 'Times New Roman', Times, serif; line-height: 1.4; font-size: 11pt; margin: 0; padding: 0; }
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
            /* MathJax Specific Styling for PDF */
            mjx-container { text-align: left !important; margin: 0.5em 0 !important; display: block !important; } /* Ensure block display */
            mjx-container[display="true"] { display: block; overflow-x: auto; }
            mjx-container > svg { max-width: 100%; vertical-align: middle; } /* Prevent SVG overflow */
            .MathJax_Display { text-align: left !important; }
            /* Prose adjustments for tighter spacing */
            .prose p { margin-top: 0.3em; margin-bottom: 0.3em; line-height: 1.3; }
            .prose ol, .prose ul { margin-top: 0.3em; margin-bottom: 0.3em; padding-left: 1.5em;}
            .prose li { margin-bottom: 0.1em; line-height: 1.3;}
            /* Problem type styling */
            .problem-text-container { border: 1px solid #eee; padding: 10px; margin-top: 10px; background-color: #f9f9f9; }
        </style>
    `;

    // Questions are assumed to be pre-shuffled before calling this function
    questions.forEach((q, index) => { // Use index for numbering if needed, though list handles it
        let qTextForHtml = q.text || '[Question text unavailable]';
        let optionsForHtml = '';
        let solutionAnswer = q.answer || 'N/A'; // Default for MCQ

        if (q.isProblem) {
             // For problems, we might just show the text, no options or predefined answer
             optionsForHtml = ''; // No options for problems
             solutionAnswer = 'See marking scheme/AI feedback.'; // Placeholder for solution
        } else if (q.options && q.options.length > 0) {
             // MCQ options
             optionsForHtml = (q.options || []).map(opt => {
                 let optTextForHtml = opt.text || '[Option text unavailable]';
                 return `<li class="option-item"><span class="option-text">${optTextForHtml}</span></li>`;
             }).join('');
             optionsForHtml = `<ol class="options-list" type="A">${optionsForHtml}</ol>`;
             // Use the correct answer field from the question object if it exists
             solutionAnswer = q.answer || 'N/A'; // q.answer should hold the correct letter (A, B, C, D)
        } else {
             // Case where it's not a problem but has no options (unlikely)
             optionsForHtml = '<p class="text-muted italic text-sm">No options provided.</p>';
             solutionAnswer = q.answer || 'N/A'; // Use answer field if it exists
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
    const fullQuestionHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Exam ${examId}</title>${styles}</head><body><div class="container"><div class="exam-header">Exam: ${examId}</div><ol class="question-list">${questionHtml}</ol></div></body></html>`;
    const fullSolutionHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Solutions ${examId}</title>${styles}</head><body><div class="container"><div class="exam-header">Solutions: ${examId}</div><ol class="question-list">${solutionHtml}</ol></div></body></html>`;

    return { questionHtml: fullQuestionHtml, solutionHtml: fullSolutionHtml };
}


export async function generateAndDownloadPdfWithMathJax(htmlContent, baseFilename) {
    showLoading(`Generating ${baseFilename}...`);

    const tempElementId = 'pdf-render-temp';
    let tempElement = document.getElementById(tempElementId);
    if (tempElement) tempElement.remove(); // Remove existing temp element

    tempElement = document.createElement('div');
    tempElement.id = tempElementId;
    tempElement.style.position = 'fixed';
    tempElement.style.left = '-9999px';
    tempElement.style.top = '0px';
    tempElement.style.width = '21cm'; // A4 width approx
    tempElement.style.height = 'auto'; // Let content determine height initially
    tempElement.style.visibility = 'hidden';
    tempElement.style.background = 'white';
    tempElement.innerHTML = htmlContent;
    document.body.appendChild(tempElement);

    try {
        console.log("generateAndDownloadPdf: Rendering MathJax in temporary element...");
        await renderMathIn(tempElement);
        console.log("generateAndDownloadPdf: MathJax rendering complete.");

        // Wait for potential reflows after MathJax finishes
        await new Promise(resolve => setTimeout(resolve, 500)); // Short delay

        // MODIFIED: Add another check/delay for images within the temp element
        const images = tempElement.querySelectorAll('img');
        const imageLoadPromises = [];
        images.forEach(img => {
             if (!img.complete) {
                 imageLoadPromises.push(new Promise((resolve, reject) => {
                     img.onload = resolve;
                     img.onerror = () => {
                          console.warn(`Image failed to load during PDF generation: ${img.src}`);
                          resolve(); // Resolve anyway to not block PDF generation
                     };
                     // Add timeout for image loading
                     setTimeout(() => {
                          console.warn(`Image loading timed out for: ${img.src}`);
                          resolve();
                     }, 5000); // 5-second timeout per image
                 }));
             }
        });

        if (imageLoadPromises.length > 0) {
            console.log(`Waiting for ${imageLoadPromises.length} images to load...`);
            await Promise.all(imageLoadPromises);
            console.log("Images loaded or timed out.");
             // Add another small delay after images load
             await new Promise(resolve => setTimeout(resolve, 200));
        }

        const options = { ...PDF_GENERATION_OPTIONS }; // Use global config
        options.filename = `${baseFilename}.pdf`;
        options.html2canvas = {
            ...options.html2canvas,
            scale: 2,
            logging: false,
            useCORS: true,
            // Ensure width/height are captured correctly after rendering
            windowWidth: tempElement.scrollWidth,
            windowHeight: tempElement.scrollHeight // Capture full scroll height
        };
        options.jsPDF = {
            ...options.jsPDF,
            unit: 'cm',
            format: 'a4',
            orientation: 'portrait'
        };
        options.pagebreak = { mode: ['avoid-all', 'css', 'legacy'], before: '.question-item' };

        console.log(`Starting html2pdf generation for ${options.filename}`);
        const pdfWorker = html2pdf().set(options).from(tempElement);

        await pdfWorker.save().catch(pdfError => {
             console.error(`html2pdf generation/save error for ${options.filename}:`, pdfError);
             throw new Error(`html2pdf failed: ${pdfError.message || 'Unknown generation error'}`);
        });

        console.log(`PDF generation likely successful for ${options.filename}`);

    } catch (error) {
        console.error(`Error generating PDF ${baseFilename}:`, error);
        alert(`Failed to generate PDF: ${baseFilename}. Error: ${error.message}. Check console.`);
    } finally {
        if (document.body.contains(tempElement)) {
             document.body.removeChild(tempElement);
        }
        hideLoading();
    }
}


// --- TeX Source Generation (Rewritten) ---
export function generateTexSource(examId, questions) {
    // Helper to escape LaTeX special characters, ignoring common math delimiters
    const escapeLatex = (str) => {
        if (!str) return '';
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

    // Questions are assumed to be pre-shuffled
    questions.forEach((q, index) => {
        let questionNumber = index + 1; // Use loop index for numbering
        let qTextForTex = escapeLatex(q.text || '[Question text unavailable]');
        let imageTex = '';
        if (q.image) {
             // Basic filename cleaning - assumes image is in the same directory or relative path is correct
             const safeImageFilename = q.image.replace(/[{}\\^%&#_ ]/g, '-');
             imageTex = `\\begin{center}\n\\includegraphics[width=0.6\\textwidth]{${safeImageFilename}}\n\\end{center}\n`;
        }

        let optionsText = '';
        let solutionAnswer = 'N/A'; // Default

        if (q.isProblem) {
             optionsText = ''; // No options for problems
             solutionAnswer = 'See marking scheme/AI feedback.';
        } else if (q.options && q.options.length > 0) {
             optionsText = (q.options || []).map(opt => {
                 let escapedOptText = escapeLatex(opt.text || '[Option text unavailable]');
                 return `\\item ${escapedOptText}`;
             }).join('\n      ');
              // Use the correct answer field from the question object if it exists
             solutionAnswer = escapeLatex(q.answer) || 'N/A'; // Escape the answer too
        } else {
             optionsText = ''; // No options
             solutionAnswer = escapeLatex(q.answer) || 'N/A';
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
    const questionsTex = `${LATEX_DOCUMENT_CLASS}\n${LATEX_PACKAGES}\n${LATEX_BEGIN_DOCUMENT}\n\n\\section*{Exam: ${escapeLatex(examId)}}\n\\begin{enumerate}\n\n${questionsBody}\\end{enumerate}\n\n${LATEX_END_DOCUMENT}`;
    const solutionsTex = `${LATEX_DOCUMENT_CLASS}\n${LATEX_PACKAGES}\n${LATEX_BEGIN_DOCUMENT}\n\n\\section*{Solutions: ${escapeLatex(examId)}}\n\\begin{enumerate}\n\n${solutionsBody}\\end{enumerate}\n\n${LATEX_END_DOCUMENT}`;

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
// --- END OF FILE ui_pdf_generation.js ---
