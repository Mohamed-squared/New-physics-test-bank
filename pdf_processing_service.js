const { PDFDocument } = require('pdf-lib');
const fs = require('fs-extra'); // Use fs-extra for convenience
const path = require('path');
const { spawn } = require('child_process'); // Added spawn
// const PdfImage = require('pdf-image').PDFImage; // For converting PDF pages to images
const gm = require('gm').subClass({ imageMagick: true }); // gm is still used elsewhere or can be removed if no longer needed

// const { initialize: megaInitialize, findFolder: megaFindFolder, createFolder: megaCreateFolder, uploadFile: megaUploadFile } = require('./mega_service.js');
const serverMega = require('./mega_service_server.js'); // MODIFIED: Using new server-side Mega service
// const { getCourseDetails, updateCourseDefinition } = require('./firebase_firestore.js'); // MODIFIED: Firestore temporarily disabled
// const { generateImageContentResponse, generateTextContentResponse } = require('./ai_integration.js'); // Assuming Gemini function can handle image paths or buffers
const aiServer = require('./ai_integration_server.js'); // MODIFIED: Using new server-side AI integration

const TEMP_PROCESSING_DIR_BASE = path.join(__dirname, 'temp_pdf_processing');

// Helper function to sanitize filenames
function sanitizeFilename(name) {
    return name.replace(/[^\w\s.-]/g, '_').replace(/\s+/g, '_');
}

// Standardized logging helper for this service
const logPdfProcess = (context, messageOrError, level = 'info') => {
    let logMessage;
    let fullErrorStack = null;
    const prefix = `[PDFProcess][${context || 'General'}]`;

    if (messageOrError instanceof Error) {
        logMessage = messageOrError.message;
        if (level === 'error' || level === 'warn') { // Capture stack for errors and warnings
            fullErrorStack = messageOrError.stack;
        }
    } else {
        logMessage = messageOrError;
    }

    const timestamp = new Date().toISOString();
    const consoleMessage = fullErrorStack 
        ? `${timestamp} ${prefix} ${logMessage}\nStack: ${fullErrorStack}` 
        : `${timestamp} ${prefix} ${logMessage}`;

    if (level === 'warn') {
        console.warn(consoleMessage);
    } else if (level === 'error') {
        console.error(consoleMessage);
    } else {
        console.log(consoleMessage);
    }
};

async function processTextbookPdf(
    pdfFilePath,
    courseId,
    actualFirstPageNumberInput, // This is the PDF page number that corresponds to textbook page "1"
    megaEmail,
    megaPassword,
    geminiApiKey // Expected to be an array of keys, or a single key that ai_integration_server can handle
) {
    const processingTimestamp = Date.now();
    let tocApiKeyIndex = 0; // Index for cycling through API keys for ToC analysis
    const TEMP_PROCESSING_DIR = path.join(TEMP_PROCESSING_DIR_BASE, `${courseId}_${processingTimestamp}`);
    
    logPdfProcess(courseId, `CONFIRMING CODE UPDATE - Version ABC - Starting textbook PDF processing. Temp dir: ${TEMP_PROCESSING_DIR}`);
    let fullPdfMegaPath = null;
    let chapterPdfMegaPaths = [];

    try {
        await fs.ensureDir(TEMP_PROCESSING_DIR);
        const actualFirstPageNumber = parseInt(actualFirstPageNumberInput, 10);
        if (isNaN(actualFirstPageNumber) || actualFirstPageNumber < 1) {
            throw new Error("Invalid 'actualFirstPageNumber'. Must be a number greater than or equal to 1.");
        }

        // --- 1. Initialize MEGA and Get Course Details ---
        logPdfProcess(courseId, 'Initializing MEGA service...');
        await serverMega.initialize(megaEmail, megaPassword); 
        const megaStorage = serverMega.getMegaStorage(); 
        if (!megaStorage || !megaStorage.root) throw new Error('MEGA initialization failed or root directory not accessible.');
        logPdfProcess(courseId, 'MEGA service initialized.');

        const courseDirName = `CourseDir_${courseId}`; 
        logPdfProcess(courseId, `Course directory name (placeholder): ${courseDirName}`);

        const lyceumRootFolderName = "LyceumCourses_Test";
        const textbookFullFolderName = "Textbook_Full";
        const textbookChaptersFolderName = "Textbook_Chapters";

        let lyceumRootNode = await serverMega.findFolder(lyceumRootFolderName, megaStorage.root); 
        if (!lyceumRootNode) lyceumRootNode = await serverMega.createFolder(lyceumRootFolderName, megaStorage.root); 
        if (!lyceumRootNode) throw new Error(`Failed to find or create Lyceum root folder: ${lyceumRootFolderName}`);

        let courseMegaFolderNode = await serverMega.findFolder(courseDirName, lyceumRootNode); 
        if (!courseMegaFolderNode) courseMegaFolderNode = await serverMega.createFolder(courseDirName, lyceumRootNode); 
        if (!courseMegaFolderNode) throw new Error(`Failed to find or create course folder: ${courseDirName}`);

        // --- 2. Upload Full PDF to MEGA ---
        logPdfProcess(courseId, 'Uploading full textbook PDF to MEGA...');
        let fullTextbookMegaFolderNode = await serverMega.findFolder(textbookFullFolderName, courseMegaFolderNode); 
        if (!fullTextbookMegaFolderNode) fullTextbookMegaFolderNode = await serverMega.createFolder(textbookFullFolderName, courseMegaFolderNode); 
        if (!fullTextbookMegaFolderNode) throw new Error(`Failed to create MEGA folder for full textbook: ${textbookFullFolderName}`);

        const fullPdfFileNameOnMega = `textbook_full_${sanitizeFilename(path.basename(pdfFilePath, path.extname(pdfFilePath)))}.pdf`;
        const uploadedFullPdf = await serverMega.uploadFile(pdfFilePath, fullPdfFileNameOnMega, fullTextbookMegaFolderNode); 
        if (!uploadedFullPdf || !uploadedFullPdf.link) throw new Error('Failed to upload full PDF to MEGA or link not returned.');
        fullPdfMegaPath = uploadedFullPdf.link;
        logPdfProcess(courseId, `Full textbook PDF uploaded to MEGA: ${fullPdfMegaPath}`);

        logPdfProcess(courseId, `Firestore update for full textbook link SKIPPED.`);

        // --- 3. AI Table of Contents Analysis ---
        logPdfProcess(courseId, 'Starting Table of Contents (ToC) analysis...');

        const originalPdfDocForPageCount = await PDFDocument.load(fs.readFileSync(pdfFilePath));
        const totalPdfPages = originalPdfDocForPageCount.getPageCount();
        
        const tocPageExtractionEnd = Math.min(Math.max(15, actualFirstPageNumber + 5), totalPdfPages);
        const tocPageExtractionStart = 1; 
        
        let tocImagePaths = [];
        logPdfProcess(courseId, `Extracting ToC images from PDF page ${tocPageExtractionStart} to ${tocPageExtractionEnd}. Total PDF pages: ${totalPdfPages}`);

        for (let i = tocPageExtractionStart; i <= tocPageExtractionEnd; i++) {
            const pageIndexForGm = i - 1; 
            const outputImageName = `toc_page_${i}.png`;
            const outputImagePath = path.join(TEMP_PROCESSING_DIR, outputImageName);

            try {
                await new Promise((resolve, reject) => {
                    const magickArgs = [
                        '-density', '300',
                        `${pdfFilePath}[${pageIndexForGm}]`, 
                        outputImagePath      
                    ];
                    logPdfProcess(courseId, `Attempting to execute: magick convert ${magickArgs.join(' ')}`);
                    const magickProcess = spawn('magick', ['convert', ...magickArgs]);
                    let stdoutData = '';
                    let stderrData = '';
                    magickProcess.stdout.on('data', (data) => { stdoutData += data.toString(); });
                    magickProcess.stderr.on('data', (data) => { stderrData += data.toString(); });
                    magickProcess.on('error', (err) => {
                        logPdfProcess(courseId, new Error(`Failed to start magick process for page ${i}: ${err.message}`), 'error');
                        return reject(new Error(`Failed to start magick process for page ${i}: ${err.message}`));
                    });
                    magickProcess.on('exit', (code) => {
                        if (code === 0) {
                            tocImagePaths.push(outputImagePath);
                            logPdfProcess(courseId, `Converted PDF page ${i} to image: ${outputImagePath} (stdout: ${stdoutData})`);
                            resolve();
                        } else {
                            logPdfProcess(courseId, `magick process for page ${i} exited with code ${code}. stderr: ${stderrData.trim()}, stdout: ${stdoutData.trim()}`, 'error');
                            reject(new Error(`magick process for page ${i} exited with code ${code}. Stderr: ${stderrData.trim()}`));
                        }
                    });
                });
            } catch (imgErr) {
                logPdfProcess(courseId, new Error(`Could not convert PDF page ${i} to image: ${imgErr.message}. Skipping this page for ToC.`), 'warn');
            }
        }
        
        if (tocImagePaths.length === 0) {
            throw new Error("Failed to convert any ToC pages to images. Cannot proceed with AI analysis.");
        }
        logPdfProcess(courseId, `Extracted ${tocImagePaths.length} images for ToC analysis.`);

        const tocPrompt = `
            Analyze these images of a textbook's table of contents. Identify chapter titles and their starting page numbers as listed IN THE TABLE OF CONTENTS.
            The textbook's actual content (textbook page '1') corresponds to PDF page number ${actualFirstPageNumber}.
            Return a JSON array of objects, where each object represents a chapter and has "chapter_title" and "toc_page_number" (the page number written in the ToC).
            Example: [{ "chapter_title": "Chapter 1: Introduction to Subject", "toc_page_number": 1 }, { "chapter_title": "Chapter 2: Core Concepts", "toc_page_number": 25 }, ...]
            Ensure "toc_page_number" is an integer. Focus only on main chapters.
        `;
        
        logPdfProcess(courseId, 'Attempting actual AI ToC generation...');
        if (geminiApiKey) {
            logPdfProcess(courseId, 'Attempting AI ToC generation using UI-provided API key.');
        } else {
            logPdfProcess(courseId, 'Attempting AI ToC generation. No UI-provided API key; AI service will use its default API key (if any passed as geminiApiKey is invalid or empty).');
        }

        let apiKeyForTocAnalysis;
        if (Array.isArray(geminiApiKey) && geminiApiKey.length > 0) {
            const validKeys = geminiApiKey.filter(k => typeof k === 'string' && k.trim() !== '');
            if (validKeys.length > 0) {
                apiKeyForTocAnalysis = validKeys[tocApiKeyIndex % validKeys.length];
                tocApiKeyIndex++;
                logPdfProcess(courseId, `Selected API key at index ${(tocApiKeyIndex - 1 + validKeys.length) % validKeys.length} from valid pool for ToC analysis.`);
            } else {
                logPdfProcess(courseId, 'geminiApiKey array was provided but contained no valid string keys for ToC. AI server might use its default.', 'warn');
                apiKeyForTocAnalysis = null; 
            }
        } else if (typeof geminiApiKey === 'string' && geminiApiKey.trim() !== '') {
            apiKeyForTocAnalysis = geminiApiKey;
            logPdfProcess(courseId, 'Using single string API key provided for ToC analysis.');
        } else {
            logPdfProcess(courseId, 'No valid geminiApiKey (array or string) provided for ToC. AI server will likely use its internal default.', 'warn');
            apiKeyForTocAnalysis = null; 
        }
        
        const aiResponseTocRaw = await aiServer.generateImageContentResponse(tocImagePaths, tocPrompt, apiKeyForTocAnalysis);
        if (!aiResponseTocRaw) { 
            throw new Error("AI ToC generation returned no response.");
        }
        let aiResponseToc;
        try {
            const cleanedResponse = aiResponseTocRaw.replace(/```json\s*|\s*```/g, '').trim();
            if (!cleanedResponse) {
                throw new Error("AI ToC response was empty after cleaning.");
            }
            aiResponseToc = JSON.parse(cleanedResponse);
        } catch (parseError) {
            logPdfProcess(courseId, `Failed to parse AI ToC JSON response. Raw response was: ${aiResponseTocRaw}`, 'error');
            throw new Error(`Failed to parse AI ToC JSON response: ${parseError.message}`);
        }
        
        logPdfProcess(courseId, `AI ToC analysis response: ${JSON.stringify(aiResponseToc, null, 2)}`);

        if (!Array.isArray(aiResponseToc) || aiResponseToc.some(ch => typeof ch.chapter_title !== 'string' || typeof ch.toc_page_number !== 'number')) {
            logPdfProcess(courseId, `Invalid ToC format from AI: ${JSON.stringify(aiResponseToc)}`, 'error');
            throw new Error("AI returned an invalid format for the Table of Contents. Expected an array of {chapter_title: string, toc_page_number: number}.");
        }
        
        const chapters = aiResponseToc.map(chapter => ({
            title: chapter.chapter_title,
            tocPage: parseInt(chapter.toc_page_number, 10),
            pdfPageStart: parseInt(chapter.toc_page_number, 10) + actualFirstPageNumber - 1 
        })).sort((a, b) => a.pdfPageStart - b.pdfPageStart);

        logPdfProcess(courseId, `Processed chapters after page adjustment: ${JSON.stringify(chapters, null, 2)}`);

        // --- 5. Split PDF into Chapters ---
        logPdfProcess(courseId, 'Splitting PDF into chapters...');
        let chapterMegaFolderNode = await serverMega.findFolder(textbookChaptersFolderName, courseMegaFolderNode); 
        if (!chapterMegaFolderNode) chapterMegaFolderNode = await serverMega.createFolder(textbookChaptersFolderName, courseMegaFolderNode); 
        if (!chapterMegaFolderNode) throw new Error(`Failed to create MEGA folder for chapter PDFs: ${textbookChaptersFolderName}`);

        const originalPdfBytes = fs.readFileSync(pdfFilePath); 
        const chapterFirestoreData = [];

        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];
            const pdfPageEnd = (i === chapters.length - 1) ? totalPdfPages : chapters[i+1].pdfPageStart - 1;

            if (chapter.pdfPageStart > pdfPageEnd || chapter.pdfPageStart > totalPdfPages) {
                logPdfProcess(courseId, `Skipping chapter "${chapter.title}" due to invalid page range: PDF Start ${chapter.pdfPageStart}, PDF End ${pdfPageEnd}. Total pages ${totalPdfPages}.`, 'warn');
                continue;
            }
            
            logPdfProcess(courseId, `Processing chapter "${chapter.title}": PDF pages ${chapter.pdfPageStart} to ${pdfPageEnd}`);

            const chapterPdfDoc = await PDFDocument.create();
            const sourcePdfDoc = await PDFDocument.load(originalPdfBytes); 
            
            const pagesToCopyIndices = [];
            for (let p = chapter.pdfPageStart; p <= pdfPageEnd; p++) {
                if (p > 0 && p <= sourcePdfDoc.getPageCount()) { 
                     pagesToCopyIndices.push(p - 1);
                } else {
                    logPdfProcess(courseId, `Invalid page number ${p} requested for chapter "${chapter.title}". Max pages: ${sourcePdfDoc.getPageCount()}. Skipping page.`, 'warn');
                }
            }
            
            if (pagesToCopyIndices.length === 0) {
                logPdfProcess(courseId, `No valid pages to copy for chapter "${chapter.title}". Skipping chapter.`, 'warn');
                continue;
            }

            const copiedPages = await chapterPdfDoc.copyPages(sourcePdfDoc, pagesToCopyIndices);
            copiedPages.forEach(page => chapterPdfDoc.addPage(page));

            const chapterPdfBytes = await chapterPdfDoc.save();
            const chapterFileName = sanitizeFilename(`Ch_${i+1}_${chapter.title}.pdf`);
            const chapterTempPath = path.join(TEMP_PROCESSING_DIR, chapterFileName);
            fs.writeFileSync(chapterTempPath, chapterPdfBytes);
            logPdfProcess(courseId, `Chapter PDF saved locally: ${chapterTempPath}`);

            const uploadedChapterPdf = await serverMega.uploadFile(chapterTempPath, chapterFileName, chapterMegaFolderNode); 
            if (!uploadedChapterPdf || !uploadedChapterPdf.link) {
                logPdfProcess(courseId, `Failed to upload chapter PDF "${chapterFileName}" to MEGA. Skipping this chapter's Firestore update.`, 'warn');
                continue;
            }
            chapterPdfMegaPaths.push(uploadedChapterPdf.link);
            logPdfProcess(courseId, `Chapter PDF "${chapterFileName}" uploaded to MEGA: ${uploadedChapterPdf.link}`);

            chapterFirestoreData.push({
                title: chapter.title,
                megaPdfLink: uploadedChapterPdf.link,
                chapterNumber: i + 1,
                startPagePdf: chapter.pdfPageStart,
                startPageTextbook: chapter.tocPage, 
                sourcePdfPageEnd: pdfPageEnd, 
            });
        }
        
        if (chapterFirestoreData.length > 0) {
            const existingCourseData = null; 
            const existingChapterResources = existingCourseData?.chapterResources || {}; 
            
            chapterFirestoreData.forEach(chData => {
                const chapterKey = `textbook_chapter_${chData.chapterNumber}`;
                if (!existingChapterResources[chapterKey]) {
                    existingChapterResources[chapterKey] = { lectureUrls: [], otherResources: [] };
                } else if (!existingChapterResources[chapterKey].otherResources) {
                    existingChapterResources[chapterKey].otherResources = [];
                }
                existingChapterResources[chapterKey].otherResources = existingChapterResources[chapterKey].otherResources.filter(
                    res => !(res.type === 'textbook_chapter_segment' && res.title === chData.title)
                );
                existingChapterResources[chapterKey].otherResources.push({
                    title: chData.title,
                    url: chData.megaPdfLink,
                    type: 'textbook_chapter_segment', 
                    textbookPageStart: chData.startPageTextbook,
                    pdfPageStart: chData.startPagePdf,
                    pdfPageEnd: chData.sourcePdfPageEnd
                });
            });
            logPdfProcess(courseId, `Firestore update for chapter PDF details SKIPPED.`);
        } else {
            logPdfProcess(courseId, "No chapters were successfully processed and uploaded. Firestore not updated with chapter details.", 'warn');
        }

        return {
            success: true,
            message: "Textbook PDF processed, split into chapters, and uploaded successfully.",
            fullPdfLink: fullPdfMegaPath,
            chaptersProcessed: chapterFirestoreData.length, 
            processedChapterDetails: chapterFirestoreData, 
            chapterLinks: chapterPdfMegaPaths,
        };

    } catch (error) {
        logPdfProcess(courseId, error, 'error'); // Log the full error with stack
        return {
            success: false,
            message: `PDF processing failed: ${error.message}`,
            error: error.stack, // Keep stack for structured error response
        };
    } finally {
        if (fs.existsSync(TEMP_PROCESSING_DIR)) {
            try {
                await fs.remove(TEMP_PROCESSING_DIR); 
                logPdfProcess(courseId, `Temporary processing directory deleted: ${TEMP_PROCESSING_DIR}`);
            } catch (err) {
                logPdfProcess(courseId, new Error(`Error deleting temporary processing directory ${TEMP_PROCESSING_DIR}: ${err.message}`), 'error');
            }
        }
    }
}

module.exports = {
    processTextbookPdf,
};

// Example Usage (for testing - comment out or remove in production/import scenarios)
/*
async function testPdfProcessing() {
    const TEST_PDF_PATH = "/path/to/your/sample_textbook.pdf"; // REPLACE with a real PDF path
    if (!fs.existsSync(TEST_PDF_PATH)) {
        console.error(`Test PDF not found at: ${TEST_PDF_PATH}`);
        return;
    }
    const TEST_COURSE_ID = "TEST_COURSE_PDF_002"; 
    const TEST_ACTUAL_FIRST_PAGE = 15; // Example: Textbook page 1 is PDF page 15
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
    const MEGA_EMAIL = process.env.MEGA_EMAIL;
    const MEGA_PASSWORD = process.env.MEGA_PASSWORD;

    if (!GEMINI_API_KEY || !MEGA_EMAIL || !MEGA_PASSWORD) {
        console.error("Missing required environment variables for testing: GEMINI_API_KEY, MEGA_EMAIL, MEGA_PASSWORD");
        return;
    }
    
    // Mock firebase_firestore and ai_integration for local testing if needed
    // global.getCourseDetails = async (courseId) => ({ courseDirName: `CourseDir_${courseId}`, chapterResources: {} });
    // global.updateCourseDefinition = async (courseId, updates) => { console.log("Mock updateCourseDefinition called:", courseId, updates); return true; };
    // global.generateImageContentResponse = async (imagePaths, prompt, apiKey) => {
    //     console.log("Mock generateImageContentResponse called with prompt:", prompt, "and", imagePaths.length, "images.");
    //     // Return a plausible ToC structure
    //     return JSON.stringify([
    //         { "chapter_title": "Chapter 1: The Beginning", "toc_page_number": 1 },
    //         { "chapter_title": "Chapter 2: Middle Part", "toc_page_number": 20 },
    //         { "chapter_title": "Chapter 3: The End", "toc_page_number": 55 }
    //     ]);
    // };

    console.log("Starting test PDF processing...");
    const result = await processTextbookPdf(
        TEST_PDF_PATH,
        TEST_COURSE_ID,
        TEST_ACTUAL_FIRST_PAGE,
        MEGA_EMAIL,
        MEGA_PASSWORD,
        GEMINI_API_KEY
    );
    console.log("Test PDF processing result:", JSON.stringify(result, null, 2));
}

// testPdfProcessing().catch(console.error);
*/
