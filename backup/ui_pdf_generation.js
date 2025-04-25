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
            mjx-container { text-align: left !important; margin: 0.5em 0 !important; }
            mjx-container[display="true"] { display: block; overflow-x: auto; }
            .MathJax_Display { text-align: left !important; }
            .prose p { margin-top: 0.5em; margin-bottom: 0.5em; }
            .prose ol, .prose ul { margin-top: 0.5em; margin-bottom: 0.5em; padding-left: 1.5em;}
            .prose li { margin-bottom: 0.2em; }
        </style>
    `;

    // Questions are assumed to be pre-shuffled before calling this function
    questions.forEach((q, index) => { // Use index for numbering if needed, though list handles it
        let qTextForHtml = q.text || '[Question text unavailable]';
        let optionsForHtml = (q.options || []).map(opt => {
            let optTextForHtml = opt.text || '[Option text unavailable]';
            return `<li class="option-item"><span class="option-text">${optTextForHtml}</span></li>`;
        }).join('');

        let imageHtml = q.image ? `<div class="question-image-container"><img src="${q.image}" alt="Question Image" class="question-image" crossorigin="anonymous"></div>` : '';

        // Assemble HTML for the question item
        const questionItemHtml = `
            <li class="question-item">
                <div class="question-content">
                    <div class="question-text prose">${qTextForHtml}</div>
                    ${imageHtml}
                    ${optionsForHtml ? `<ol class="options-list" type="A">${optionsForHtml}</ol>` : ''}
                 </div>
            </li>
        `;
        questionHtml += questionItemHtml;

        // Assemble HTML for the solution item (includes answer)
        solutionHtml += `
            <li class="question-item">
                 <div class="question-content">
                    <div class="question-text prose">${qTextForHtml}</div>
                    ${imageHtml}
                    ${optionsForHtml ? `<ol class="options-list" type="A">${optionsForHtml}</ol>` : ''}
                    <div class="solution">Answer: ${q.answer || 'N/A'}</div>
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
    // ... (code remains the same - uses html2pdf.js) ...
    showLoading(`Generating ${baseFilename}...`);

    const tempElement = document.createElement('div');
    tempElement.style.position = 'fixed';
    tempElement.style.left = '-9999px';
    tempElement.style.top = '0px';
    tempElement.style.width = '21cm'; // A4 width approx
    tempElement.style.minHeight = '29.7cm'; // A4 height approx
    tempElement.style.height = 'auto';
    tempElement.style.visibility = 'hidden';
    tempElement.style.background = 'white';
    tempElement.innerHTML = htmlContent;
    document.body.appendChild(tempElement);

    try {
        console.log("generateAndDownloadPdf: Rendering MathJax in temporary element...");
        await renderMathIn(tempElement);
        console.log("generateAndDownloadPdf: MathJax rendering complete.");

        // Allow time for rendering (especially complex SVG or images)
        await new Promise(resolve => setTimeout(resolve, 1500)); // Increased delay slightly

        const options = { ...PDF_GENERATION_OPTIONS }; // Use global config
        options.filename = `${baseFilename}.pdf`;
        options.html2canvas = {
            ...options.html2canvas,
            scale: 2,
            logging: false,
            useCORS: true,
            // Ensure width/height are captured correctly after rendering
            // Adjust windowWidth to simulate the print layout width
            windowWidth: tempElement.scrollWidth,
            // width: tempElement.scrollWidth, // Let html2pdf manage width based on container
        };
        options.jsPDF = {
            ...options.jsPDF,
            unit: 'cm',
            format: 'a4',
            orientation: 'portrait'
        };
        // Update pagebreak targeting
        options.pagebreak = { mode: ['avoid-all', 'css', 'legacy'], before: '.question-item' };

        console.log(`Starting html2pdf generation for ${options.filename} with options:`, options);
        const pdfWorker = html2pdf().set(options).from(tempElement);
        await pdfWorker.save();
        console.log(`PDF generation likely successful for ${options.filename}`);

    } catch (error) {
        console.error(`Error generating PDF ${options.filename}:`, error);
        alert(`Failed to generate PDF: ${options.filename}. Error: ${error.message}. Check console.`);
    } finally {
        document.body.removeChild(tempElement);
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
            // Basic validation (optional, can be complex)
            // e.g., check for balanced delimiters if needed
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
            // Use a regex to replace globally in case the same math appears multiple times
            // Although placeholders should be unique here
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
             // Replace potentially problematic characters for LaTeX paths
             const safeImageFilename = q.image.replace(/[{}\\^%&#_ ]/g, '-');
             imageTex = `\\begin{center}\n\\includegraphics[width=0.6\\textwidth]{${safeImageFilename}}\n\\end{center}\n`;
        }

        let optionsText = (q.options || []).map(opt => {
            let escapedOptText = escapeLatex(opt.text || '[Option text unavailable]');
            return `\\item ${escapedOptText}`;
        }).join('\n      '); // Indent items for readability in TeX source

        let optionsBlock = '';
        if (optionsText) {
             optionsBlock = `    \\begin{enumerate}[label=\\Alph*.]\n      ${optionsText}\n    \\end{enumerate}\n`;
        }

        // Assemble TeX for one question item
        const questionItemTex = `\\item ${qTextForTex}\n${imageTex}${optionsBlock}`;
        questionsBody += questionItemTex + '\n\n';

        // Assemble TeX for one solution item
        const solutionItemTex = `\\item ${qTextForTex}\n${imageTex}${optionsBlock}\n    \\textbf{Answer: ${q.answer || 'N/A'}}\n`;
        solutionsBody += solutionItemTex + '\n\n';
    });

    // Combine into full documents
    const questionsTex = `${LATEX_DOCUMENT_CLASS}\n${LATEX_PACKAGES}\n${LATEX_BEGIN_DOCUMENT}\n\n\\section*{Exam: ${escapeLatex(examId)}}\n\\begin{enumerate}\n\n${questionsBody}\\end{enumerate}\n\n${LATEX_END_DOCUMENT}`;
    const solutionsTex = `${LATEX_DOCUMENT_CLASS}\n${LATEX_PACKAGES}\n${LATEX_BEGIN_DOCUMENT}\n\n\\section*{Solutions: ${escapeLatex(examId)}}\n\\begin{enumerate}\n\n${solutionsBody}\\end{enumerate}\n\n${LATEX_END_DOCUMENT}`;

    return { questionsTex, solutionsTex };
}

// --- File Download Helper ---
export function downloadTexFile(filename, base64Content) {
     // ... (code remains the same) ...
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