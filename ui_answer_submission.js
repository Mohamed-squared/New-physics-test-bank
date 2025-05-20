// --- START OF FILE ui_answer_submission.js ---
import { currentUser, currentSubject, db } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml, renderMathIn } from './utils.js';
import { callGeminiVisionAPI, getAllPdfTextForAI } from './ai_integration.js'; // Using Vision API for OCR
import { storeExamResult } from './exam_storage.js'; // To store the final marked exam
import { markFullExam } from './ai_exam_marking.js'; // To mark the transcribed answers
import { generateLatexToolbar, insertLatexSnippetForProblem } from './ui_latex_toolbar.js'; // Import LaTeX Toolbar

// --- Module State ---
let currentOcrExamId = null;
let currentOcrQuestions = []; // Holds original questions for reference
let currentOcrPagesData = []; // Array of { pageNum, imageDataUrl, ocrText: null | string, userCorrectedText: null | string, questionMappings: [] }
let currentOcrPageIndex = 0;

// --- Main UI ---
export function showAnswerSubmissionOptions(examId, examQuestionsArray) {
    currentOcrExamId = examId;
    currentOcrQuestions = examQuestionsArray; // Store the structured questions from the generated PDF
    currentOcrPagesData = []; // Reset
    currentOcrPageIndex = 0;

    const html = `
        <div class="content-card animate-fade-in max-w-xl mx-auto">
            <h2 class="text-xl font-semibold mb-4">Submit Answers for Exam: <span class="font-mono text-sm">${escapeHtml(examId)}</span></h2>
            <p class="text-muted mb-6">Choose your submission method. OCR for PDF uploads is experimental.</p>
            <div class="space-y-3">
                <button onclick="window.showManualAnswerEntryFormWrapper()" class="btn-primary w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path d="M17.414 2.586a2 2 0 0 0-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 0 0 0-2.828Z" /><path fill-rule="evenodd" d="M2 6a2 2 0 0 1 2-2h4a1 1 0 0 1 0 2H4v10h10v-4a1 1 0 1 1 2 0v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" clip-rule="evenodd" /></svg>
                    Enter Answers Manually (Online Form)
                </button>
                <button onclick="window.showPdfUploadFormWrapper()" class="btn-secondary w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M9.965 2.093a1.172 1.172 0 0 0-1.656 0L2.93 7.478A1.172 1.172 0 0 0 2 8.308V13.5A2.5 2.5 0 0 0 4.5 16h11a2.5 2.5 0 0 0 2.5-2.5V8.308c0-.331-.131-.65-.369-.885L11.256 2.24a1.172 1.172 0 0 0-.885-.146H10c-.199 0-.389.048-.557.137L5.93 4.5H4.5A2.5 2.5 0 0 0 2 7v1.5a.75.75 0 0 0 1.5 0V7c0-.259.127-.506.354-.662l2.716-1.887a.375.375 0 0 1 .542.01L8.25 6H10a.75.75 0 0 1 0 1.5H7.671l-3.6 2.502A.375.375 0 0 1 3.75 10H2.25a.75.75 0 0 0 0 1.5h1.635l.353.245A2.501 2.501 0 0 0 6.5 14.5H8V13a1 1 0 1 1 2 0v1.5h1.5a2.5 2.5 0 0 0 2.24-1.255l.353-.245H16.5a.75.75 0 0 0 0-1.5h-1.5a.375.375 0 0 1-.32-.553l-3.6-2.502H10a.75.75 0 0 1 0-1.5h1.75l1.141-2.282a.375.375 0 0 1 .542-.01l2.716 1.887c.227.156.354.403.354.662v1.5a.75.75 0 0 0 1.5 0V7a2.5 2.5 0 0 0-2.5-2.5h-1.43L12.25 2.5a.375.375 0 0 1-.292-.142Z" clip-rule="evenodd" /></svg>
                    Upload Answer PDF (Experimental OCR)
                </button>
            </div>
        </div>
    `;
    displayContent(html);
}
window.showAnswerSubmissionOptions = showAnswerSubmissionOptions;

// --- Manual Answer Entry ---
export function showManualAnswerEntryFormWrapper() {
    if (!currentOcrExamId || !currentOcrQuestions) {
        alert("Exam context missing for manual entry."); return;
    }
    showManualAnswerEntryForm(currentOcrExamId, currentOcrQuestions);
}
window.showManualAnswerEntryFormWrapper = showManualAnswerEntryFormWrapper;

function showManualAnswerEntryForm(examId, questions) {
    let formHtml = `
        <div class="content-card animate-fade-in max-w-2xl mx-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-semibold">Enter Answers Manually: <span class="font-mono text-sm">${escapeHtml(examId)}</span></h3>
                <button onclick="window.showAnswerSubmissionOptions('${examId}', JSON.stringify(questions))" class="btn-secondary-small text-xs">Back</button>
            </div>
            <form id="manual-answers-form" class="space-y-6">`;

    questions.forEach((q, index) => {
        const questionId = q.id || `q_manual_${index}`;
        formHtml += `
            <div class="p-4 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50">
                <p class="font-medium mb-2">Q${q.displayNumber || (index + 1)}: ${escapeHtml(q.text.substring(0, 150))}${q.text.length > 150 ? '...' : ''}</p>`;
        if (q.isProblem) {
            formHtml += `
                <div>
                    <label for="manual-ans-${questionId}" class="block text-sm mb-1">Your Solution (use LaTeX for math):</label>
                    <div id="latex-toolbar-manual-${questionId}" class="latex-toolbar mb-1"><span class="text-xs text-muted p-1">Loading tools...</span></div>
                    <div id="manual-ans-preview-${questionId}" class="min-h-[80px] p-2 border border-t-0 rounded-b-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 prose prose-sm dark:prose-invert max-w-none custom-scrollbar overflow-auto" style="max-height: 150px;" onclick="document.getElementById('manual-ans-${questionId}').focus()"></div>
                    <textarea id="manual-ans-${questionId}" name="q_${questionId}_answer" rows="4" class="form-control mt-1 text-xs font-mono" placeholder="Enter your solution steps here..." oninput="window.updateLatexPreviewManual('${questionId}')"></textarea>
                </div>`;
        } else { // MCQ
            if (q.options && q.options.length > 0) {
                formHtml += `<fieldset class="mt-2"><legend class="sr-only">Options for question ${index + 1}</legend><div class="space-y-2">`;
                q.options.forEach(opt => {
                    formHtml += `
                        <div class="flex items-center">
                            <input id="radio-manual-${questionId}-${opt.letter}" type="radio" name="q_${questionId}_answer" value="${opt.letter}" class="form-radio h-4 w-4">
                            <label for="radio-manual-${questionId}-${opt.letter}" class="ml-2 text-sm">${escapeHtml(opt.letter)}. ${escapeHtml(opt.text)}</label>
                        </div>`;
                });
                formHtml += `</div></fieldset>`;
            } else {
                formHtml += `<p class="text-xs text-muted italic">No options provided for this MCQ.</p>`;
            }
        }
        formHtml += `</div>`;
    });
    formHtml += `<button type="button" onclick="window.submitManualAnswers()" class="btn-primary w-full mt-6">Submit All Answers</button></form></div>`;
    displayContent(formHtml);
    // Initialize LaTeX toolbars for problem inputs
    questions.forEach((q, index) => {
        if (q.isProblem) {
            const questionId = q.id || `q_manual_${index}`;
            generateLatexToolbar(`manual-${questionId}`);
            window.updateLatexPreviewManual(questionId); // Initial preview
        }
    });
}
window.updateLatexPreviewManual = async (questionIdSuffix) => {
    const textarea = document.getElementById(`manual-ans-${questionIdSuffix}`);
    const previewArea = document.getElementById(`manual-ans-preview-${questionIdSuffix}`);
    if (textarea && previewArea) {
        previewArea.innerHTML = textarea.value;
        try { await renderMathIn(previewArea); } catch (e) { console.error("Error rendering LaTeX preview:", e); }
    }
};

window.submitManualAnswers = async () => {
    if (!currentOcrExamId || !currentOcrQuestions || !currentUser) {
        alert("Error: Exam context or user session lost."); return;
    }
    const form = document.getElementById('manual-answers-form');
    if (!form) { alert("Error: Answer form not found."); return; }

    const userAnswers = {};
    let allAnswered = true;
    currentOcrQuestions.forEach((q, index) => {
        const questionId = q.id || `q_manual_${index}`;
        const inputName = `q_${questionId}_answer`;
        if (q.isProblem) {
            const textarea = form.elements[inputName];
            userAnswers[questionId] = textarea ? textarea.value.trim() : "";
            if (!userAnswers[questionId]) allAnswered = false;
        } else { // MCQ
            const radioGroup = form.elements[inputName];
            if (radioGroup && radioGroup.value) {
                userAnswers[questionId] = radioGroup.value;
            } else {
                userAnswers[questionId] = null; // Unanswered MCQ
                allAnswered = false;
            }
        }
    });

    if (!allAnswered) {
        if (!confirm("Some questions are unanswered. Submit anyway?")) return;
    }

    showLoading("Submitting and Marking Manually Entered Answers...");
    try {
        // Construct a temporary examState object compatible with markFullExam and storeExamResult
        const tempExamState = {
            examId: currentOcrExamId, // Use the original exam ID
            questions: currentOcrQuestions,
            userAnswers: userAnswers,
            startTime: Date.now(), // Placeholder, actual timing not tracked for manual entry this way
            durationMinutes: 0, // Placeholder
            subjectId: currentSubject ? currentSubject.id : null, // If related to a TestGen subject
            courseContext: null, // This submission flow is not tied to a course activity yet
            testGenConfig: null // This is not from a dynamic TestGen configuration
        };

        const examRecord = await storeExamResult(null, tempExamState, 'pdf_manual_entry');
        
        if (examRecord && examRecord.markingResults) {
            hideLoading();
            // Redirect to a results/review page. For now, just show success and link to main exam dashboard.
            // This could call a simplified version of displayOnlineTestResults or directly showExamReviewUI
            alert("Answers submitted and marked! You can view the detailed review from the Exams Dashboard.");
            window.showExamReviewUI(currentUser.uid, examRecord.id);
        } else {
            throw new Error("Failed to process or store exam results after manual entry.");
        }
    } catch (error) {
        hideLoading();
        console.error("Error submitting manual answers:", error);
        alert("Error submitting answers: " + error.message);
    }
};


// --- PDF Upload and OCR ---
export function showPdfUploadFormWrapper() {
    if (!currentOcrExamId || !currentOcrQuestions) {
        alert("Exam context missing for PDF upload."); return;
    }
    showPdfUploadForm(currentOcrExamId, currentOcrQuestions);
}
window.showPdfUploadFormWrapper = showPdfUploadFormWrapper;

function showPdfUploadForm(examId, questions) {
    const html = `
        <div class="content-card animate-fade-in max-w-2xl mx-auto">
             <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-semibold">Upload Answer PDF: <span class="font-mono text-sm">${escapeHtml(examId)}</span></h3>
                <button onclick="window.showAnswerSubmissionOptions('${examId}', JSON.stringify(questions))" class="btn-secondary-small text-xs">Back</button>
            </div>
            <p class="text-warning-700 dark:text-warning-300 bg-warning-50 dark:bg-warning-900/30 border border-warning-300 dark:border-warning-600 p-3 rounded-md text-sm mb-4">
                <strong>Experimental OCR:</strong> AI-powered Optical Character Recognition for handwritten math and text is highly experimental and may not be accurate. You will have a chance to review and correct the OCR text before final submission for marking.
            </p>
            <div class="mb-4">
                <label for="answer-pdf-upload" class="block text-sm font-medium mb-1">Select your Answer PDF (max 10MB):</label>
                <input type="file" id="answer-pdf-upload" accept=".pdf" class="form-control">
            </div>
            <button onclick="window.handleAnswerPdfUploadWrapper()" class="btn-primary w-full">Upload and Begin OCR</button>
            <div id="ocr-review-area" class="mt-6 space-y-4"></div>
        </div>
    `;
    displayContent(html);
}

window.handleAnswerPdfUploadWrapper = async () => {
    if (!currentOcrExamId || !currentOcrQuestions) {
        alert("Exam context missing for PDF upload processing."); return;
    }
    await handleAnswerPdfUpload(currentOcrExamId, currentOcrQuestions);
}

async function handleAnswerPdfUpload(examId, questions) {
    const fileInput = document.getElementById('answer-pdf-upload');
    const file = fileInput?.files?.[0];
    if (!file) { alert("Please select a PDF file."); return; }
    if (file.size > 10 * 1024 * 1024) { alert("PDF file too large (max 10MB)."); return; }

    showLoading("Uploading PDF and preparing for OCR...");
    currentOcrPagesData = [];
    currentOcrPageIndex = 0;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer);

        if (typeof pdfjsLib === 'undefined' || !pdfjsLib.getDocument) {
            throw new Error("PDF.js library not loaded. Cannot process PDF.");
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;

        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;

        if (numPages === 0) throw new Error("The PDF appears to be empty.");
        if (numPages > 20) throw new Error("PDF too long (max 20 pages for OCR).");


        for (let i = 1; i <= numPages; i++) {
            showLoading(`Processing PDF page ${i}/${numPages}...`);
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better image quality for OCR
            const canvas = document.createElement('canvas');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            const context = canvas.getContext('2d');
            const renderContext = { canvasContext: context, viewport: viewport };
            await page.render(renderContext).promise;
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85); // JPEG for smaller size

            currentOcrPagesData.push({
                pageNum: i,
                imageDataUrl: imageDataUrl,
                ocrText: null,
                userCorrectedText: null,
                questionMappings: [] // [{ questionIndex: number, answerText: string }]
            });
        }
        hideLoading();
        console.log(`PDF processed into ${currentOcrPagesData.length} pages for OCR review.`);
        renderOcrReviewPage();

    } catch (error) {
        hideLoading();
        console.error("Error handling PDF upload:", error);
        document.getElementById('ocr-review-area').innerHTML = `<p class="text-danger">Error processing PDF: ${error.message}</p>`;
    }
}

async function performOcrForCurrentPage() {
    if (currentOcrPagesData.length === 0 || currentOcrPageIndex >= currentOcrPagesData.length) return;
    const pageData = currentOcrPagesData[currentOcrPageIndex];
    if (pageData.ocrText !== null) { // Already OCR'd
        renderOcrReviewPage(); // Just re-render
        return;
    }

    showLoading(`Performing OCR on page ${pageData.pageNum}... (This may take a moment)`);
    try {
        const base64ImageData = pageData.imageDataUrl.split(',')[1];
        const promptParts = [
            { text: "Extract all text and mathematical expressions from this image accurately. Preserve formatting and line breaks where meaningful. If math is present, try to output it in a way that can be easily converted to LaTeX if needed (e.g., be explicit about symbols like sum, integral, fractions, superscripts, subscripts)." },
            { inlineData: { mimeType: "image/jpeg", data: base64ImageData } }
        ];
        const ocrResultText = await callGeminiVisionAPI(promptParts);
        pageData.ocrText = ocrResultText || "[OCR did not detect text on this page]";
        pageData.userCorrectedText = pageData.ocrText; // Initialize corrected text
    } catch (error) {
        console.error(`Error during OCR for page ${pageData.pageNum}:`, error);
        pageData.ocrText = `[OCR Failed: ${error.message}]`;
        pageData.userCorrectedText = pageData.ocrText;
    } finally {
        hideLoading();
        renderOcrReviewPage();
    }
}

function renderOcrReviewPage() {
    const reviewArea = document.getElementById('ocr-review-area');
    if (!reviewArea || currentOcrPagesData.length === 0) {
        if(reviewArea) reviewArea.innerHTML = "<p>No PDF pages to review.</p>";
        return;
    }

    const pageData = currentOcrPagesData[currentOcrPageIndex];
    let ocrContentHtml = `<p class="text-muted italic">OCR not yet performed for this page.</p>`;
    if (pageData.ocrText !== null) {
        ocrContentHtml = `
            <textarea id="ocr-text-edit-${pageData.pageNum}" class="form-control font-mono text-xs w-full h-60" rows="15" oninput="window.updateCorrectedOcrText(${pageData.pageNum}, this.value)">${escapeHtml(pageData.userCorrectedText || pageData.ocrText)}</textarea>
            <p class="text-xs text-muted mt-1">Review and correct the OCR text above. Ensure math is clear.</p>
        `;
    }

    reviewArea.innerHTML = `
        <h4 class="text-lg font-medium">Review OCR - Page ${pageData.pageNum} / ${currentOcrPagesData.length}</h4>
        <div class="my-2 border dark:border-gray-600 rounded overflow-hidden max-h-[50vh] overflow-y-auto">
            <img src="${pageData.imageDataUrl}" alt="Page ${pageData.pageNum} Scan" class="w-full h-auto">
        </div>
        ${pageData.ocrText === null ? `<button onclick="window.performOcrForCurrentPageWrapper()" class="btn-secondary mb-3">Run OCR for this Page</button>` : ''}
        <div>
            <h5 class="text-md font-semibold mb-1">OCR Result / Corrected Text:</h5>
            ${ocrContentHtml}
        </div>
        <div class="mt-4">
            <h5 class="text-md font-semibold mb-2">Map OCR Text to Exam Questions:</h5>
            <p class="text-xs text-muted mb-2">Select the portion of the corrected OCR text above that corresponds to each question's answer. Then click "Map to Question".</p>
            <div id="ocr-question-mapping-area" class="space-y-3">
                ${renderOcrQuestionMappingInputs(pageData)}
            </div>
        </div>
        <div class="flex justify-between mt-6 pt-4 border-t dark:border-gray-600">
            <button onclick="window.navigateOcrPage(-1)" class="btn-secondary" ${currentOcrPageIndex === 0 ? 'disabled' : ''}>Previous Page</button>
            <span>Page ${pageData.pageNum}</span>
            ${currentOcrPageIndex < currentOcrPagesData.length - 1 
                ? `<button onclick="window.navigateOcrPage(1)" class="btn-secondary">Next Page</button>`
                : `<button onclick="window.finalizeOcrAndSubmitAnswers()" class="btn-primary">Finalize & Submit All Answers</button>`
            }
        </div>
    `;
}
window.performOcrForCurrentPageWrapper = () => performOcrForCurrentPage();

window.updateCorrectedOcrText = (pageNum, newText) => {
    const pageIdx = currentOcrPagesData.findIndex(p => p.pageNum === pageNum);
    if (pageIdx !== -1) {
        currentOcrPagesData[pageIdx].userCorrectedText = newText;
    }
};

function renderOcrQuestionMappingInputs(pageData) {
    let html = '';
    currentOcrQuestions.forEach((q, index) => {
        const questionId = q.id || `q_ocr_${index}`;
        // Find if this question is already mapped on this page
        const existingMapping = pageData.questionMappings.find(m => m.questionIndex === index);
        const mappedText = existingMapping ? existingMapping.answerText : "";

        html += `
            <div class="border dark:border-gray-500 p-2 rounded-sm bg-gray-50 dark:bg-gray-700/30">
                <p class="text-xs font-medium">Q${q.displayNumber || (index + 1)}: ${escapeHtml(q.text.substring(0, 70))}...</p>
                <textarea id="mapped-text-${pageData.pageNum}-${questionId}" class="form-control text-xs font-mono w-full h-16 mt-1" rows="2" placeholder="Text for this question's answer from OCR..." readonly>${escapeHtml(mappedText)}</textarea>
                <button onclick="window.mapSelectedOcrToQuestion(${pageData.pageNum}, ${index}, '${questionId}')" class="btn-secondary-small text-xs mt-1">Map Selected Text from Above to this Question</button>
            </div>
        `;
    });
    return html;
}

window.mapSelectedOcrToQuestion = (pageNum, questionIndex, questionId) => {
    const ocrTextarea = document.getElementById(`ocr-text-edit-${pageNum}`);
    const targetTextarea = document.getElementById(`mapped-text-${pageNum}-${questionId}`);

    if (ocrTextarea && targetTextarea) {
        const selectionStart = ocrTextarea.selectionStart;
        const selectionEnd = ocrTextarea.selectionEnd;
        const selectedText = ocrTextarea.value.substring(selectionStart, selectionEnd);

        if (selectedText.trim()) {
            targetTextarea.value = selectedText;
            // Update in our state
            const pageIdx = currentOcrPagesData.findIndex(p => p.pageNum === pageNum);
            if (pageIdx !== -1) {
                let mapping = currentOcrPagesData[pageIdx].questionMappings.find(m => m.questionIndex === questionIndex);
                if (mapping) {
                    mapping.answerText = selectedText;
                } else {
                    currentOcrPagesData[pageIdx].questionMappings.push({ questionIndex, answerText: selectedText });
                }
            }
        } else {
            alert("Please select text from the OCR result above to map.");
        }
    }
};

window.navigateOcrPage = (direction) => {
    const newPageIndex = currentOcrPageIndex + direction;
    if (newPageIndex >= 0 && newPageIndex < currentOcrPagesData.length) {
        currentOcrPageIndex = newPageIndex;
        renderOcrReviewPage();
    }
};

window.finalizeOcrAndSubmitAnswers = async () => {
    if (!currentOcrExamId || !currentOcrQuestions || !currentUser) {
        alert("Error: Exam context or user session lost for OCR submission."); return;
    }

    const finalUserAnswers = {};
    let allQuestionsMapped = true;

    currentOcrQuestions.forEach((q, index) => {
        const questionId = q.id || `q_ocr_${index}`; // Consistent ID generation
        let combinedAnswerForQuestion = "";
        currentOcrPagesData.forEach(pageData => {
            const mapping = pageData.questionMappings.find(m => m.questionIndex === index);
            if (mapping && mapping.answerText) {
                combinedAnswerForQuestion += (combinedAnswerForQuestion ? "\n\n--- Page Break ---\n\n" : "") + mapping.answerText;
            }
        });
        finalUserAnswers[questionId] = combinedAnswerForQuestion.trim();
        if (!finalUserAnswers[questionId] && q.isProblem) { // Only check for problems, MCQs might be intentionally blank
             // For now, don't strictly enforce all problems answered via OCR
             // allQuestionsMapped = false;
        }
    });

    if (!allQuestionsMapped) {
        if (!confirm("Some questions may not have answers mapped from the OCR pages. Submit anyway?")) return;
    } else {
        if (!confirm("Are you ready to submit all mapped answers for AI marking?")) return;
    }

    showLoading("Submitting OCR'd Answers and Marking Exam...");
    try {
        const tempExamState = {
            examId: currentOcrExamId,
            questions: currentOcrQuestions,
            userAnswers: finalUserAnswers,
            startTime: Date.now(), 
            durationMinutes: 0, 
            subjectId: currentSubject ? currentSubject.id : null,
            courseContext: null, 
            testGenConfig: null 
        };

        const examRecord = await storeExamResult(null, tempExamState, 'pdf_ocr_entry');
        
        if (examRecord && examRecord.markingResults) {
            hideLoading();
            alert("OCR'd answers submitted and marked! View detailed review from Exams Dashboard.");
            window.showExamReviewUI(currentUser.uid, examRecord.id);
        } else {
            throw new Error("Failed to process or store exam results after OCR submission.");
        }
    } catch (error) {
        hideLoading();
        console.error("Error submitting OCR answers:", error);
        alert("Error submitting OCR'd answers: " + error.message);
    }
};

// --- END OF FILE ui_answer_submission.js ---