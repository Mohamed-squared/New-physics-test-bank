// --- START OF FILE ui_pdf_generation.js ---

import { PDF_GENERATION_OPTIONS, LATEX_DOCUMENT_CLASS, LATEX_PACKAGES, LATEX_BEGIN_DOCUMENT, LATEX_END_DOCUMENT, COURSE_BASE_PATH, SUBJECT_RESOURCE_FOLDER, DEFAULT_COURSE_PDF_FOLDER, DEFAULT_COURSE_TRANSCRIPTION_FOLDER } from './config.js';
import { showLoading, hideLoading, renderMathIn, escapeHtml } from './utils.js';
import { cleanTextForFilename } from './filename_utils.js';

// --- Base HTML for General Exams (Questions/Solutions) ---
function generatePdfBaseHtml(title, innerContentHtml) {
    const escapedTitle = escapeHtml(title);
    const styles = `
        body { font-family: Arial, sans-serif; font-size: 11pt; color: #000 !important; background-color: #fff !important; margin: 0; padding: 0; box-sizing: border-box; position: relative; }
        h1, h2, h3, h4, h5, h6 { color: #000 !important; }
        mjx-container { vertical-align: -0.2ex !important; line-height: 1; }
        mjx-container[display="true"] { display: block !important; margin: 0.8em auto !important; }
        mjx-container svg { overflow: visible !important; }
        .page-break-inside-avoid, .no-page-break { page-break-inside: avoid !important; }
        .page-break-before { page-break-before: always !important; }
        .page-break-after { page-break-after: always !important; }
        #pdf-background-watermark { z-index: 0; position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
        .pdf-main-content { position: relative; z-index: 1; width: 100%; height: 100%; }
        .note-image-container { text-align: center; margin: 0.5em 0; page-break-inside: avoid; }
        .note-image { max-width: 90%; height: auto; border: 1px solid #ccc; padding: 2px; background-color: #fff; display: inline-block; }
    `;

    const mathJaxConfigAndScript = `
        <script>
          window.MathJax = {
            loader: { load: ['input/tex', 'output/svg'] },
            tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']] },
            svg: { fontCache: 'global', scale: 1, mtextInheritFont: true, merrorInheritFont: true, displayAlign: 'left', displayIndent: '0em'},
            startup: {
                ready: () => {
                    console.log('[PDF HTML Inner] MathJax Startup: Ready function called.');
                    MathJax.startup.defaultReady();
                    MathJax.startup.promise.then(() => {
                         console.log('[PDF HTML Inner] MathJax initial typesetting complete.');
                         setTimeout(() => {
                             console.log('[PDF HTML Inner] Setting window.mathJaxIsCompletelyReadyForPdf TO TRUE after timeout.');
                             window.mathJaxIsCompletelyReadyForPdf = true;
                         }, 500);
                    }).catch(err => {
                        console.error('[PDF HTML Inner] MathJax startup.promise REJECTED:', err);
                        window.mathJaxIsCompletelyReadyForPdf = 'error';
                    });
                }
            }
          };
        </script>
        <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/startup.js" id="mathjax-pdf-script"></script>
        <script>
            console.log("[PAGE SCRIPT EXAM] Debug script loaded for Exam PDF."); // Changed log prefix
            window.addEventListener('load', () => {
                console.log("[PAGE SCRIPT EXAM] Page Load event fired for Exam PDF.");
                const link = document.querySelector('link[href="css/pdf_exam_styles.css"]');
                if (link) {
                    console.log("[PAGE SCRIPT EXAM] Found the EXAM CSS link tag. Waiting for styles to apply...");
                    setTimeout(() => {
                        const mainContent = document.querySelector('.pdf-main-content');
                        if (mainContent) {
                            const style = getComputedStyle(mainContent);
                            const color = style.getPropertyValue('color');
                            console.log(\`[PAGE SCRIPT EXAM] .pdf-main-content computed color: "\${color}". Expected non-default.\`);
                            if (color === 'rgb(51, 51, 51)') {
                                console.log("[PAGE SCRIPT EXAM] Successfully detected expected color on .pdf-main-content (from exam styles)!");
                            } else {
                                console.warn("[PAGE SCRIPT EXAM] Exam CSS: Computed color (\${color}) is not the expected value. CSS styles might not be applied correctly.");
                            }
                        } else {
                            console.error("[PAGE SCRIPT EXAM] .pdf-main-content element NOT found after load!");
                        }
                    }, 300);
                } else {
                    console.error("[PAGE SCRIPT EXAM] EXAM CSS link tag with href='css/pdf_exam_styles.css' NOT found in the DOM! CSS injection in server.js is expected.");
                }
            });
        </script>
    `;
    const externalCssLink = '<link rel="stylesheet" href="css/pdf_exam_styles.css">'; // This will be removed by server if injecting

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${escapedTitle}</title>
            <meta charset="UTF-8">
            ${externalCssLink} 
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

// --- NEW: Base HTML for Formula Sheets (links to different CSS) ---
export function generateFormulaSheetPdfBaseHtml(title, innerContentHtml) {
    const escapedTitle = escapeHtml(title);
    // MINIMIZE inline styles, let external CSS do the heavy lifting
    const styles = `
        body { margin: 0; padding: 0; box-sizing: border-box; background-color: #F8F6F0 !important; /* Ensure page bg from var(--pdf-fs-color-off-white) */ }
        /* Remove other body styles if they are in pdf_formula_sheet_styles.css */
        mjx-container svg { overflow: visible !important; } /* Keep this for MathJax */
    `;

    const mathJaxConfigAndScript = `
        <script>
          window.MathJax = {
            loader: { load: ['input/tex', 'output/svg'] },
            tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']] },
            svg: { fontCache: 'global', scale: 0.95, mtextInheritFont: true, merrorInheritFont: true, displayAlign: 'left', displayIndent: '0em'},
            startup: {
                ready: () => {
                    console.log('[PDF FORMULA SHEET Inner] MathJax Startup: Ready function called.');
                    MathJax.startup.defaultReady();
                    MathJax.startup.promise.then(() => {
                         console.log('[PDF FORMULA SHEET Inner] MathJax initial typesetting complete.');
                         setTimeout(() => {
                             console.log('[PDF FORMULA SHEET Inner] Setting window.mathJaxIsCompletelyReadyForPdf TO TRUE.');
                             window.mathJaxIsCompletelyReadyForPdf = true;
                         }, 500);
                    }).catch(err => {
                        console.error('[PDF FORMULA SHEET Inner] MathJax startup.promise REJECTED:', err);
                        window.mathJaxIsCompletelyReadyForPdf = 'error';
                    });
                }
            }
          };
        </script>
        <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/startup.js" id="mathjax-pdf-script"></script>
        <script>
            console.log("[PAGE SCRIPT FS] Debug script loaded for Formula Sheet.");
            window.addEventListener('DOMContentLoaded', () => {
                console.log("[PAGE SCRIPT FS] DOMContentLoaded event fired for Formula Sheet.");
                setTimeout(() => {
                    const mainContent = document.querySelector('.pdf-fs-main-content');
                    if (mainContent) {
                        const style = getComputedStyle(mainContent);
                        const borderColor = style.getPropertyValue('border-top-color');
                        const fontFamily = style.getPropertyValue('font-family');
                        console.log(\`[PAGE SCRIPT FS] .pdf-fs-main-content computed border-top-color: "\${borderColor}", font-family: "\${fontFamily}".\`);
                        if (borderColor === 'rgb(27, 38, 59)') {
                            console.log("[PAGE SCRIPT FS] Successfully detected expected BORDER color!");
                        } else {
                            console.warn("[PAGE SCRIPT FS] Formula Sheet CSS: Computed BORDER color (\${borderColor}) is not as expected.");
                        }
                        if (fontFamily.toLowerCase().includes('eb garamond')) {
                            console.log("[PAGE SCRIPT FS] Successfully detected expected FONT FAMILY!");
                        } else {
                            console.warn("[PAGE SCRIPT FS] Formula Sheet CSS: Computed FONT FAMILY (\${fontFamily}) is not as expected.");
                        }
                    } else {
                        console.error("[PAGE SCRIPT FS] .pdf-fs-main-content element NOT found!");
                    }
                }, 500);
            });
        </script>
    `;
    // const externalCssLink = '<link rel="stylesheet" href="css/pdf_formula_sheet_styles.css">'; // This is removed by server

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${escapedTitle}</title>
            <meta charset="UTF-8">
            <!-- The server will inject pdf_formula_sheet_styles.css here -->
            <style>${styles}</style> <!-- Minimal inline styles -->
            ${mathJaxConfigAndScript}
        </head>
        <body>
            <div class="pdf-fs-main-content">
                <h1 class="pdf-fs-title">${escapedTitle}</h1>
                <div class="content-body pdf-fs-body-text">${innerContentHtml}</div>
            </div>
        </body>
        </html>
    `;
}


export function generatePdfHtml(examId, questions) {
    const placeholderText = '[Content Missing]';
    let questionItemsHtml = '';
    let solutionItemsHtml = '';

    let imageBasePath = './';
    if (window.currentSubject && window.currentSubject.courseDirName) {
        const courseBasePath = (typeof window.COURSE_BASE_PATH === 'string' && window.COURSE_BASE_PATH !== "./courses") ? window.COURSE_BASE_PATH : "courses";
        const subjectResourceFolder = typeof window.SUBJECT_RESOURCE_FOLDER === 'string' ? window.SUBJECT_RESOURCE_FOLDER : 'Problems';
        imageBasePath = `${courseBasePath}/${cleanTextForFilename(window.currentSubject.courseDirName)}/${subjectResourceFolder}/images/`;
    } else { imageBasePath = './assets/images/'; }
    if (imageBasePath && !imageBasePath.endsWith('/')) imageBasePath += '/';

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
                    const optionItemClass = 'option-item page-break-inside-avoid'; // No 'is-correct' class
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
        } else if (q.image && typeof q.image === 'string') {
            let imageName = q.image;
            if (imageName.startsWith('./images/')) imageName = imageName.substring(9);
            else if (imageName.startsWith('images/')) imageName = imageName.substring(7);
            else if (imageName.startsWith('./')) imageName = imageName.substring(2);
            imageName = imageName.split('/').pop();
            imageSrc = `${imageBasePath}${cleanTextForFilename(imageName).split('?')[0]}`;
            imageSrc = imageSrc.replace(/\/{2,}/g, '/');
        }

        let imageHtml = imageSrc ? `<div class="question-image-container page-break-inside-avoid"><img src="${escapeHtml(imageSrc)}" alt="Image" class="question-image" crossorigin="anonymous" onerror="this.style.display='none';console.warn('Failed to load PDF image: ${escapeHtml(imageSrc)}')"></div>` : '';
        const questionItemClasses = `question-item-wrapper ${isProblemType ? 'is-problem' : 'is-mcq'}`;

        const questionItemContent = `
            <div class="question-header">${isProblemType ? 'Problem' : 'Question'} ${questionNumber}${q.chapter ? ` (Ch ${q.chapter})` : ''}</div>
            <div class="question-text">${qTextForHtml}</div>
            ${imageHtml}
            ${optionsForHtml || ''}
        `;
        questionItemsHtml += `<li class="${questionItemClasses}">${questionItemContent}</li>`;

         const solutionItemContent = `
             <div class="question-header">${isProblemType ? 'Problem' : 'Question'} ${questionNumber}${q.chapter ? ` (Ch ${q.chapter})` : ''}</div>
             <div class="question-text">${qTextForHtml}</div>
             ${imageHtml}
             ${solutionOptionsHtml || ''}
             <div class="solution-section page-break-inside-avoid">
                 <span class="solution-label">Answer:</span>
                 <div class="solution-text">${solutionAnswerText}</div>
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
     // Use generateFormulaSheetPdfBaseHtml for notes as well, as it's more generic now
     const noteSpecificInlineStyles = `<style>
        .note-meta p { text-align: left !important; margin-bottom: 0.1em !important; font-size: 10pt; }
     </style>`;


     let contentForPdf = '';
     let imageHtml = '';

     const imageMarkdownRegex = /!\[(.*?)\]\((.*?)\)/;
     const imgMatchInContent = noteContent.match(imageMarkdownRegex);

     if (imgMatchInContent) {
          const imageUrl = imgMatchInContent[2];
          noteContent = noteContent.replace(imageMarkdownRegex, '').trim();
          imageHtml = `<div class="note-image-container page-break-inside-avoid"><img src="${escapeHtml(imageUrl)}" alt="Note Image" class="note-image" crossorigin="anonymous" onerror="this.style.display='none';console.warn('Failed to load PDF image: ${escapeHtml(imageUrl)}')"></div>`;
     } else if (note.imageDataUri) {
          imageHtml = `<div class="note-image-container page-break-inside-avoid"><img src="${escapeHtml(note.imageDataUri)}" alt="Note Image" class="note-image" crossorigin="anonymous"></div>`;
     }

     if (note.type === 'latex') {
         contentForPdf = `<div class="note-latex-content">${noteContent}</div>`;
     } else if (note.type === 'ai_review') {
          contentForPdf = `<div class="note-ai-review-content prose prose-sm dark:prose-invert max-w-none">${noteContent}</div>`;
     } else {
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
     // Use generateFormulaSheetPdfBaseHtml as it links the formula sheet styles, which are now more generic.
     // If notes need very different base styling, a new generateNotePdfBaseHtml might be needed.
     return generateFormulaSheetPdfBaseHtml(`Note: ${noteTitle}`, innerHtml).replace('</head>', `${noteSpecificInlineStyles}</head>`);
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
            .replace(/\$/g, '\\$')
            .replace(/#/g, '\\#')
            .replace(/_/g, '\\_')
            .replace(/{/g, '\\{')
            .replace(/}/g, '\\}')
            .replace(/>/g, '\\textgreater{}')
            .replace(/</g, '\\textless{}');
        processedStr = processedStr
            .replace(/\n\n+/g, '\\par\\medskip\n')
            .replace(/\n/g, '\\\\ \n');
        mathSegments.forEach(item => {
            const regexSafePlaceholder = item.placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(regexSafePlaceholder, 'g');
            processedStr = processedStr.replace(regex, item.math);
        });
        return processedStr;
    };

    let questionsBody = '';
    let solutionsBody = '';
    const examIdTex = escapeLatex(examId || placeholderText);

    questions.forEach((q, index) => {
        const questionNumber = index + 1;
        let qTextForTex = escapeLatex(q.text);
        let imageTex = '';
        if (q.image && typeof q.image === 'string') {
             let imageName = q.image;
             if (imageName.startsWith('./images/')) imageName = imageName.substring(9);
             else if (imageName.startsWith('images/')) imageName = imageName.substring(7);
             else if (imageName.startsWith('./')) imageName = imageName.substring(2);
             imageName = imageName.split('/').pop();
             const safeImageFilename = escapeLatex(cleanTextForFilename(imageName));
             imageTex = `\\begin{center}\n\\includegraphics[width=0.6\\textwidth,keepaspectratio]{images/${safeImageFilename}}\n\\end{center}\n`;
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

    const fullDocumentPreamble = `${LATEX_DOCUMENT_CLASS}\n${LATEX_PACKAGES}\n\\usepackage{enumitem}\n\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\usepackage{graphicx}\n\\usepackage{hyperref}\n\\graphicspath{{images/}}\n\\usepackage{geometry}\n\\geometry{margin=1.5cm}\n\\title{Exam: ${examIdTex}}\n\\author{Lyceum}\n\\date{\\today}\n\n\\begin{document}\n\\maketitle\n\\thispagestyle{empty}\n\\pagestyle{plain}\n\\parindent0pt\n\\sloppy\n\n`;
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