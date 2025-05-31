const { PDFDocument } = require('pdf-lib');
const { pathToFileURL } = require('url');
let firestoreService;
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

// const { initialize: gDriveInit, findFolder: gDriveFindFolder, createFolder: gDriveCreateFolder, uploadFile: gDriveUploadFile } = require('./google_drive_service_server.js'); // Example
const serverGoogleDrive = require('./google_drive_service_server.js');
const aiServer = require('./ai_integration_server.js');

const TEMP_PROCESSING_DIR_BASE = path.join(__dirname, 'temp_pdf_processing');

function sanitizeFilename(name) {
    if (!name) return 'untitled';
    return name.replace(/[^\w\s.-]/g, '_').replace(/\s+/g, '_');
}

const logPdfProcess = (context, messageOrError, level = 'info') => {
    let logMessage;
    let fullErrorStack = null;
    const prefix = `[PDFProcess][${context || 'General'}]`;
    if (messageOrError instanceof Error) {
        logMessage = messageOrError.message;
        if (level === 'error' || level === 'warn') fullErrorStack = messageOrError.stack;
    } else {
        logMessage = messageOrError;
    }
    const timestamp = new Date().toISOString();
    const consoleMessage = fullErrorStack 
        ? `${timestamp} ${prefix} ${logMessage}\nStack: ${fullErrorStack}` 
        : `${timestamp} ${prefix} ${logMessage}`;
    if (level === 'warn') console.warn(consoleMessage);
    else if (level === 'error') console.error(consoleMessage);
    else console.log(consoleMessage);
};

async function processTextbookPdf(
    pdfFilePath,
    courseId,
    actualFirstPageNumberInput,
    // megaEmail, megaPassword removed
    // If this service needs to initialize serverGoogleDrive with specific project keys,
    // those should be passed or ideally configured server-side.
    // For now, assuming serverGoogleDrive is pre-configured or self-initializes.
    passedInServerGoogleDriveInstance, // Expect an initialized instance
    geminiApiKey
) {
    const processingTimestamp = Date.now();
    let tocApiKeyIndex = 0;
    const TEMP_PROCESSING_DIR = path.join(TEMP_PROCESSING_DIR_BASE, `${courseId}_${processingTimestamp}`);
    
    logPdfProcess(courseId, `Starting textbook PDF processing (Google Drive). Temp dir: ${TEMP_PROCESSING_DIR}`);
    let fullPdfGoogleDriveDetails = null; // Will store { id, link }
    let chapterPdfGoogleDriveDetails = [];

    // Use the passed-in instance, or fall back to the global one if not provided (though passing is cleaner)
    const currentServerGoogleDrive = passedInServerGoogleDriveInstance || serverGoogleDrive;

    try {
        await fs.ensureDir(TEMP_PROCESSING_DIR);
        const actualFirstPageNumber = parseInt(actualFirstPageNumberInput, 10);
        if (isNaN(actualFirstPageNumber) || actualFirstPageNumber < 1) {
            throw new Error("Invalid 'actualFirstPageNumber'. Must be a number >= 1.");
        }

        // --- 1. Initialize Google Drive Service (if not passed in already initialized) ---
        // This step assumes serverGoogleDrive is either pre-initialized globally (e.g., on server start)
        // or the passedInServerGoogleDriveInstance is ready.
        // If serverGoogleDrive.initialize() needs to be called here, it would require API keys/service account path
        // from server config, not client params.
        logPdfProcess(courseId, 'Using configured Google Drive service.');

        const courseDirName = `CourseDir_${courseId}`;
        logPdfProcess(courseId, `Course directory name for Google Drive: ${courseDirName}`);

        const lyceumRootFolderName = "LyceumCourses_GoogleDrive_Test"; // Consistent name
        const textbookFullFolderName = "Textbook_Full";
        const textbookChaptersFolderName = "Textbook_Chapters";

        let lyceumRootNode = await currentServerGoogleDrive.findFolder(lyceumRootFolderName, 'root');
        if (!lyceumRootNode) lyceumRootNode = await currentServerGoogleDrive.createFolder(lyceumRootFolderName, 'root');
        if (!lyceumRootNode || !lyceumRootNode.id) throw new Error(`Failed to find/create Lyceum root folder in Google Drive: ${lyceumRootFolderName}`);

        let courseDriveFolderNode = await currentServerGoogleDrive.findFolder(courseDirName, lyceumRootNode.id);
        if (!courseDriveFolderNode) courseDriveFolderNode = await currentServerGoogleDrive.createFolder(courseDirName, lyceumRootNode.id);
        if (!courseDriveFolderNode || !courseDriveFolderNode.id) throw new Error(`Failed to find/create course folder in Google Drive: ${courseDirName}`);

        // --- 2. Upload Full PDF to Google Drive ---
        logPdfProcess(courseId, 'Uploading full textbook PDF to Google Drive...');
        let fullTextbookDriveFolderNode = await currentServerGoogleDrive.findFolder(textbookFullFolderName, courseDriveFolderNode.id);
        if (!fullTextbookDriveFolderNode) fullTextbookDriveFolderNode = await currentServerGoogleDrive.createFolder(textbookFullFolderName, courseDriveFolderNode.id);
        if (!fullTextbookDriveFolderNode || !fullTextbookDriveFolderNode.id) throw new Error(`Failed to create Google Drive folder for full textbook: ${textbookFullFolderName}`);

        const fullPdfFileNameOnDrive = `textbook_full_${sanitizeFilename(path.basename(pdfFilePath, path.extname(pdfFilePath)))}.pdf`;
        const uploadedFullPdf = await currentServerGoogleDrive.uploadFile(pdfFilePath, fullPdfFileNameOnDrive, fullTextbookDriveFolderNode.id);
        if (!uploadedFullPdf || !uploadedFullPdf.id) throw new Error('Failed to upload full PDF to Google Drive or ID not returned.');
        fullPdfGoogleDriveDetails = { id: uploadedFullPdf.id, link: uploadedFullPdf.webViewLink };
        logPdfProcess(courseId, `Full textbook PDF uploaded to Google Drive: ID ${fullPdfGoogleDriveDetails.id}, Link: ${fullPdfGoogleDriveDetails.link}`);

        const firestoreModulePath = './firebase_firestore.js';
        logPdfProcess(courseId, `Attempting to dynamically import Firestore service for full textbook update. Relative path: '${firestoreModulePath}'. Resolved path: '${path.resolve(__dirname, firestoreModulePath)}'`, 'info');

        if (!firestoreService) {
            try {
                firestoreService = await import(pathToFileURL(path.resolve(__dirname, firestoreModulePath)).href);
                logPdfProcess(courseId, 'Firestore service dynamically imported successfully for full textbook update.', 'info');
            } catch (e) {
                logPdfProcess(courseId, `Error during dynamic import for full textbook update: ${e.message}. Stack: ${e.stack}`, 'error');
                throw e; // Re-throw to ensure the error propagates
            }
        }

        if (fullPdfGoogleDriveDetails && firestoreService) {
            try {
                logPdfProcess(courseId, 'Attempting to update Firestore with full textbook GDrive link...');
                const updateData = {
                    gdriveTextbookFullPdfId: fullPdfGoogleDriveDetails.id,
                    gdriveTextbookFullPdfWebLink: fullPdfGoogleDriveDetails.link,
                    lastTextbookProcessDate: new Date().toISOString()
                };
                await firestoreService.updateCourseDefinition(courseId, updateData);
                logPdfProcess(courseId, `Firestore update SUCCESSFUL for full textbook link. ID: ${fullPdfGoogleDriveDetails.id}`);
            } catch (firestoreError) {
                logPdfProcess(courseId, new Error(`Firestore update FAILED for full textbook link: ${firestoreError.message}`), 'error');
                // Decide if this should be a critical failure. For now, just log.
            }
        }

        // --- 3. AI Table of Contents Analysis (Code for image extraction and AI call remains largely the same) ---
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
                    const magickArgs = ['-density', '300', `${pdfFilePath}[${pageIndexForGm}]`, outputImagePath];
                    const magickProcess = spawn('magick', ['convert', ...magickArgs]);
                    magickProcess.on('error', (err) => reject(new Error(`Failed to start magick: ${err.message}`)));
                    magickProcess.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`magick exited with ${code}`)));
                });
                tocImagePaths.push(outputImagePath);
            } catch (imgErr) {
                logPdfProcess(courseId, new Error(`Could not convert PDF page ${i}: ${imgErr.message}. Skipping.`), 'warn');
            }
        }
        if (tocImagePaths.length === 0) throw new Error("Failed to convert ToC pages to images.");
        logPdfProcess(courseId, `Extracted ${tocImagePaths.length} images for ToC analysis.`);
        const tocPrompt = `Analyze these ToC images. Identify chapter titles and their starting page numbers (as listed IN ToC). Actual content page '1' is PDF page ${actualFirstPageNumber}. Return JSON: [{ "chapter_title": "...", "toc_page_number": ... }]. Focus on main chapters.`;
        
        let apiKeyForTocAnalysis;
        // API Key selection logic (same as before)
        if (Array.isArray(geminiApiKey) && geminiApiKey.length > 0) {
            const validKeys = geminiApiKey.filter(k => typeof k === 'string' && k.trim() !== '');
            if (validKeys.length > 0) apiKeyForTocAnalysis = validKeys[tocApiKeyIndex++ % validKeys.length];
            else apiKeyForTocAnalysis = null;
        } else if (typeof geminiApiKey === 'string' && geminiApiKey.trim() !== '') apiKeyForTocAnalysis = geminiApiKey;
        else apiKeyForTocAnalysis = null;
        if (!apiKeyForTocAnalysis) logPdfProcess(courseId, 'No valid Gemini API Key for ToC. AI server might use its default.', 'warn');

        const aiResponseTocRaw = await aiServer.generateImageContentResponse(tocImagePaths, tocPrompt, apiKeyForTocAnalysis);
        if (!aiResponseTocRaw) throw new Error("AI ToC generation returned no response.");
        let aiResponseToc;
        try {
            const cleanedResponse = aiResponseTocRaw.replace(/```json\s*|\s*```/g, '').trim();
            if (!cleanedResponse) throw new Error("AI ToC response was empty after cleaning.");
            aiResponseToc = JSON.parse(cleanedResponse);
        } catch (parseError) {
            logPdfProcess(courseId, `Failed to parse AI ToC JSON. Raw: ${aiResponseTocRaw}`, 'error');
            throw new Error(`Failed to parse AI ToC JSON: ${parseError.message}`);
        }
        logPdfProcess(courseId, `AI ToC analysis response: ${JSON.stringify(aiResponseToc, null, 2)}`);
        if (!Array.isArray(aiResponseToc) || aiResponseToc.some(ch => typeof ch.chapter_title !== 'string' || typeof ch.toc_page_number !== 'number')) {
            throw new Error("AI returned invalid ToC format.");
        }
        const chapters = aiResponseToc.map(chapter => ({
            title: chapter.chapter_title,
            tocPage: parseInt(chapter.toc_page_number, 10),
            pdfPageStart: parseInt(chapter.toc_page_number, 10) + actualFirstPageNumber - 1 
        })).sort((a, b) => a.pdfPageStart - b.pdfPageStart);
        logPdfProcess(courseId, `Processed chapters (page adjusted): ${JSON.stringify(chapters, null, 2)}`);

        // --- 5. Split PDF into Chapters & Upload to Google Drive ---
        logPdfProcess(courseId, 'Splitting PDF and uploading chapters to Google Drive...');
        let chapterDriveFolderNode = await currentServerGoogleDrive.findFolder(textbookChaptersFolderName, courseDriveFolderNode.id);
        if (!chapterDriveFolderNode) chapterDriveFolderNode = await currentServerGoogleDrive.createFolder(textbookChaptersFolderName, courseDriveFolderNode.id);
        if (!chapterDriveFolderNode || !chapterDriveFolderNode.id) throw new Error(`Failed to create Google Drive folder for chapter PDFs: ${textbookChaptersFolderName}`);

        const originalPdfBytes = fs.readFileSync(pdfFilePath); 
        const chapterFirestoreData = [];

        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];
            const pdfPageEnd = (i === chapters.length - 1) ? totalPdfPages : chapters[i+1].pdfPageStart - 1;
            if (chapter.pdfPageStart > pdfPageEnd || chapter.pdfPageStart > totalPdfPages) {
                logPdfProcess(courseId, `Skipping chapter "${chapter.title}" due to invalid page range.`, 'warn');
                continue;
            }
            logPdfProcess(courseId, `Processing chapter "${chapter.title}": PDF pages ${chapter.pdfPageStart} to ${pdfPageEnd}`);
            const chapterPdfDoc = await PDFDocument.create();
            const sourcePdfDoc = await PDFDocument.load(originalPdfBytes);
            const pagesToCopyIndices = [];
            for (let p = chapter.pdfPageStart; p <= pdfPageEnd; p++) {
                if (p > 0 && p <= sourcePdfDoc.getPageCount()) pagesToCopyIndices.push(p - 1);
                else logPdfProcess(courseId, `Invalid page ${p} for chapter "${chapter.title}". Max: ${sourcePdfDoc.getPageCount()}. Skipping.`, 'warn');
            }
            if (pagesToCopyIndices.length === 0) {
                logPdfProcess(courseId, `No valid pages for chapter "${chapter.title}". Skipping.`, 'warn');
                continue;
            }
            const copiedPages = await chapterPdfDoc.copyPages(sourcePdfDoc, pagesToCopyIndices);
            copiedPages.forEach(page => chapterPdfDoc.addPage(page));
            const chapterPdfBytes = await chapterPdfDoc.save();
            const chapterFileName = sanitizeFilename(`Ch_${i+1}_${chapter.title}.pdf`);
            const chapterTempPath = path.join(TEMP_PROCESSING_DIR, chapterFileName);
            fs.writeFileSync(chapterTempPath, chapterPdfBytes);
            logPdfProcess(courseId, `Chapter PDF saved locally: ${chapterTempPath}`);

            const uploadedChapterPdf = await currentServerGoogleDrive.uploadFile(chapterTempPath, chapterFileName, chapterDriveFolderNode.id);
            if (!uploadedChapterPdf || !uploadedChapterPdf.id) {
                logPdfProcess(courseId, `Failed to upload chapter PDF "${chapterFileName}" to Google Drive. Skipping Firestore update for this chapter.`, 'warn');
                continue;
            }
            chapterPdfGoogleDriveDetails.push({ id: uploadedChapterPdf.id, link: uploadedChapterPdf.webViewLink, title: chapter.title, number: i+1 });
            logPdfProcess(courseId, `Chapter PDF "${chapterFileName}" uploaded to Google Drive: ID ${uploadedChapterPdf.id}, Link: ${uploadedChapterPdf.webViewLink}`);

            chapterFirestoreData.push({
                title: chapter.title, gdrivePdfId: uploadedChapterPdf.id, gdrivePdfLink: uploadedChapterPdf.webViewLink,
                chapterNumber: i + 1, startPagePdf: chapter.pdfPageStart, startPageTextbook: chapter.tocPage,
                sourcePdfPageEnd: pdfPageEnd, 
            });
        }
        
        // Ensure firestoreService is initialized (it might have been by the full textbook update)
        // Add diagnostic logging for chapter PDF details update
        const firestoreModulePathForChapters = './firebase_firestore.js';
        logPdfProcess(courseId, `Attempting to dynamically import Firestore service for chapter PDF details. Relative path: '${firestoreModulePathForChapters}'. Resolved path: '${path.resolve(__dirname, firestoreModulePathForChapters)}'`, 'info');

        if (!firestoreService) {
            try {
                firestoreService = await import(pathToFileURL(path.resolve(__dirname, firestoreModulePathForChapters)).href);
                logPdfProcess(courseId, 'Firestore service dynamically imported successfully for chapter PDF details.', 'info');
            } catch (e) {
                logPdfProcess(courseId, `Error during dynamic import for chapter PDF details: ${e.message}. Stack: ${e.stack}`, 'error');
                throw e; // Re-throw to ensure the error propagates
            }
        }

        if (chapterFirestoreData && chapterFirestoreData.length > 0 && firestoreService) {
            try {
                logPdfProcess(courseId, `Attempting to update Firestore with details for ${chapterFirestoreData.length} chapter PDFs...`);

                // Fetch existing course details to safely update chapterResources
                const courseDetails = await firestoreService.getCourseDetails(courseId);
                if (!courseDetails) {
                    throw new Error(`Course details not found in Firestore for courseId: ${courseId} when trying to update chapter PDF links.`);
                }

                const updates = {};
                let chapterResources = courseDetails.chapterResources || {};

                chapterFirestoreData.forEach(chDetail => { // chapterFirestoreData is already populated with gdrive IDs and links as processedChapterDetails
                    const chapterKey = `textbook_chapter_${chDetail.chapterNumber}`;
                    if (!chapterResources[chapterKey]) {
                        chapterResources[chapterKey] = { title: chDetail.title, otherResources: [] };
                    } else {
                        chapterResources[chapterKey].title = chDetail.title; // Update title just in case
                        chapterResources[chapterKey].otherResources = chapterResources[chapterKey].otherResources || [];
                    }
                    // Update or add the PDF resource link
                    // Remove old one if exists to avoid duplicates
                    chapterResources[chapterKey].otherResources = chapterResources[chapterKey].otherResources.filter(r => r.type !== 'textbook_chapter_pdf');
                    chapterResources[chapterKey].otherResources.push({
                        type: 'textbook_chapter_pdf',
                        title: `Chapter ${chDetail.chapterNumber} PDF - ${chDetail.title}`,
                        gdriveId: chDetail.gdrivePdfId,
                        gdriveLink: chDetail.gdrivePdfLink,
                        generatedAt: new Date().toISOString() // or use a specific processing date
                    });
                    chapterResources[chapterKey].gdrivePdfId = chDetail.gdrivePdfId; // Also save directly on chapter key for easier access
                    chapterResources[chapterKey].gdrivePdfLink = chDetail.gdrivePdfLink;
                    chapterResources[chapterKey].lastUpdated = new Date().toISOString();
                });

                updates['chapterResources'] = chapterResources;
                updates['lastTextbookProcessDate'] = new Date().toISOString(); // Update overall processing date

                await firestoreService.updateCourseDefinition(courseId, updates);
                logPdfProcess(courseId, `Firestore update SUCCESSFUL for ${chapterFirestoreData.length} chapter PDF details.`);

            } catch (firestoreError) {
                logPdfProcess(courseId, new Error(`Firestore update FAILED for chapter PDF details: ${firestoreError.message}`), 'error');
            }
        } else if (firestoreService) { // Only log if firestoreService was available but no chapters to update
          logPdfProcess(courseId, "No processed chapter PDF details to update in Firestore (chapterFirestoreData was empty or firestore service issue).", 'warn');
        }


        return {
            success: true, message: "Textbook PDF processed, split, and uploaded to Google Drive.",
            gdriveFullTextbookId: fullPdfGoogleDriveDetails?.id, gdriveFullTextbookWebLink: fullPdfGoogleDriveDetails?.link,
            chaptersProcessed: chapterFirestoreData.length, 
            processedChapterDetails: chapterFirestoreData, // Contains GDrive IDs and links
        };

    } catch (error) {
        logPdfProcess(courseId, error, 'error');
        return { success: false, message: `PDF processing (Google Drive) failed: ${error.message}`, error: error.stack };
    } finally {
        if (fs.existsSync(TEMP_PROCESSING_DIR)) {
            try {
                await fs.remove(TEMP_PROCESSING_DIR); 
                logPdfProcess(courseId, `Temp processing directory deleted: ${TEMP_PROCESSING_DIR}`);
            } catch (err) {
                logPdfProcess(courseId, new Error(`Error deleting temp dir ${TEMP_PROCESSING_DIR}: ${err.message}`), 'error');
            }
        }
    }
}

module.exports = { processTextbookPdf };

// Example Usage (commented out)
/*
async function testPdfProcessing() {
    const TEST_PDF_PATH = "/path/to/your/sample_textbook.pdf"; // REPLACE
    if (!fs.existsSync(TEST_PDF_PATH)) { console.error(`Test PDF not found: ${TEST_PDF_PATH}`); return; }
    const TEST_COURSE_ID = "TEST_COURSE_GDRIVE_PDF_001";
    const TEST_ACTUAL_FIRST_PAGE = 1;
    const GEMINI_API_KEY_PDF = process.env.GEMINI_API_KEY_PDF_PROC;
    // serverGoogleDrive instance would need to be initialized here if not globally
    // e.g., await serverGoogleDrive.initialize(process.env.GDRIVE_API_KEY, process.env.GDRIVE_SERVICE_ACCOUNT_PATH);


    if (!GEMINI_API_KEY_PDF) { console.error("Missing Gemini API Key for testing."); return; }

    console.log("Starting test PDF processing (Google Drive)...");
    const result = await processTextbookPdf(
        TEST_PDF_PATH,
        TEST_COURSE_ID,
        TEST_ACTUAL_FIRST_PAGE,
        serverGoogleDrive, // Pass initialized instance
        GEMINI_API_KEY_PDF
    );
    console.log("Test PDF processing result:", JSON.stringify(result, null, 2));
}

// testPdfProcessing().catch(console.error);
*/
