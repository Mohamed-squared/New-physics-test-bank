const { PDFDocument } = require('pdf-lib');
const fs = require('fs-extra'); // Use fs-extra for convenience
const path = require('path');
// const PdfImage = require('pdf-image').PDFImage; // For converting PDF pages to images
const gm = require('gm').subClass({ imageMagick: true });

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

async function processTextbookPdf(
    pdfFilePath,
    courseId,
    actualFirstPageNumberInput, // This is the PDF page number that corresponds to textbook page "1"
    megaEmail,
    megaPassword,
    geminiApiKey
) {
    const processingTimestamp = Date.now();
    const TEMP_PROCESSING_DIR = path.join(TEMP_PROCESSING_DIR_BASE, `${courseId}_${processingTimestamp}`);
    console.log(`[PDFProcess] Starting textbook PDF processing for course ${courseId}. Temp dir: ${TEMP_PROCESSING_DIR}`);
    let fullPdfMegaPath = null;
    let chapterPdfMegaPaths = [];

    try {
        await fs.ensureDir(TEMP_PROCESSING_DIR);
        const actualFirstPageNumber = parseInt(actualFirstPageNumberInput, 10);
        if (isNaN(actualFirstPageNumber) || actualFirstPageNumber < 1) {
            throw new Error("Invalid 'actualFirstPageNumber'. Must be a number greater than or equal to 1.");
        }

        // --- 1. Initialize MEGA and Get Course Details ---
        console.log('[PDFProcess] Initializing MEGA service...');
        // const mega = await megaInitialize(megaEmail, megaPassword); // OLD
        await serverMega.initialize(megaEmail, megaPassword); // NEW
        const megaStorage = serverMega.getMegaStorage(); // NEW
        if (!megaStorage || !megaStorage.root) throw new Error('MEGA initialization failed or root directory not accessible.');
        console.log('[PDFProcess] MEGA service initialized.');

        // console.log(`[PDFProcess] Fetching course details for Course ID: ${courseId}`); // Firestore disabled
        // const courseDetails = await getCourseDetails(courseId); // Firestore disabled
        // if (!courseDetails) throw new Error(`Course details not found for ID: ${courseId}`); // Firestore disabled
        // const courseDirName = courseDetails.courseDirName; // Firestore disabled
        const courseDirName = `CourseDir_${courseId}`; // Placeholder after commenting out Firestore
        // if (!courseDirName) throw new Error(`courseDirName not found for Course ID: ${courseId}. Cannot determine MEGA path.`); // Firestore disabled
        console.log(`[PDFProcess] Course directory name (placeholder): ${courseDirName}`);

        const lyceumRootFolderName = "LyceumCourses_Test";
        const textbookFullFolderName = "Textbook_Full";
        const textbookChaptersFolderName = "Textbook_Chapters";

        let lyceumRootNode = await serverMega.findFolder(lyceumRootFolderName, megaStorage.root); // MODIFIED
        if (!lyceumRootNode) lyceumRootNode = await serverMega.createFolder(lyceumRootFolderName, megaStorage.root); // MODIFIED
        if (!lyceumRootNode) throw new Error(`Failed to find or create Lyceum root folder: ${lyceumRootFolderName}`);

        let courseMegaFolderNode = await serverMega.findFolder(courseDirName, lyceumRootNode); // MODIFIED
        if (!courseMegaFolderNode) courseMegaFolderNode = await serverMega.createFolder(courseDirName, lyceumRootNode); // MODIFIED
        if (!courseMegaFolderNode) throw new Error(`Failed to find or create course folder: ${courseDirName}`);

        // --- 2. Upload Full PDF to MEGA ---
        console.log('[PDFProcess] Uploading full textbook PDF to MEGA...');
        let fullTextbookMegaFolderNode = await serverMega.findFolder(textbookFullFolderName, courseMegaFolderNode); // MODIFIED
        if (!fullTextbookMegaFolderNode) fullTextbookMegaFolderNode = await serverMega.createFolder(textbookFullFolderName, courseMegaFolderNode); // MODIFIED
        if (!fullTextbookMegaFolderNode) throw new Error(`Failed to create MEGA folder for full textbook: ${textbookFullFolderName}`);

        const fullPdfFileNameOnMega = `textbook_full_${sanitizeFilename(path.basename(pdfFilePath, path.extname(pdfFilePath)))}.pdf`;
        const uploadedFullPdf = await serverMega.uploadFile(pdfFilePath, fullPdfFileNameOnMega, fullTextbookMegaFolderNode); // MODIFIED
        if (!uploadedFullPdf || !uploadedFullPdf.link) throw new Error('Failed to upload full PDF to MEGA or link not returned.');
        fullPdfMegaPath = uploadedFullPdf.link;
        console.log(`[PDFProcess] Full textbook PDF uploaded to MEGA: ${fullPdfMegaPath}`);

        // await updateCourseDefinition(courseId, { megaTextbookFullPdfLink: fullPdfMegaPath }); // Firestore disabled
        console.log(`[PDFProcess] Firestore update for full textbook link SKIPPED for course ${courseId}.`);

        // --- 3. AI Table of Contents Analysis ---
        console.log('[PDFProcess] Starting Table of Contents (ToC) analysis...');

        const originalPdfDocForPageCount = await PDFDocument.load(fs.readFileSync(pdfFilePath));
        const totalPdfPages = originalPdfDocForPageCount.getPageCount();
        
        const tocPageExtractionEnd = Math.min(Math.max(15, actualFirstPageNumber + 5), totalPdfPages);
        const tocPageExtractionStart = 1; // PDF pages are 1-indexed for user understanding
        
        let tocImagePaths = [];
        console.log(`[PDFProcess] Extracting ToC images from PDF page ${tocPageExtractionStart} to ${tocPageExtractionEnd}. Total PDF pages: ${totalPdfPages}`);

        for (let i = tocPageExtractionStart; i <= tocPageExtractionEnd; i++) {
            const pageIndexForGm = i - 1; // gm uses 0-indexed pages from PDF path specification
            const outputImageName = `toc_page_${i}.png`;
            const outputImagePath = path.join(TEMP_PROCESSING_DIR, outputImageName);

            try {
                await new Promise((resolve, reject) => {
                    gm(pdfFilePath + '[' + pageIndexForGm + ']') // Specify page number for multipage PDF
                        .density(300, 300) // Set DPI for good quality
                        .quality(90)       // Set image quality
                        .write(outputImagePath, (err) => {
                            if (err) {
                                // Try to get more detailed error from gm
                                let errMsg = err.message;
                                if (err.code === 'ENOENT') {
                                    errMsg = 'ImageMagick or Ghostscript not found. Ensure they are installed and in PATH.';
                                } else if (err.message && err.message.toLowerCase().includes('failed to load module')) {
                                     errMsg = 'ImageMagick delegate (e.g., for PDF) might be missing or misconfigured: ' + err.message;
                                } else if (err.message && err.message.toLowerCase().includes('permission denied')) {
                                     errMsg = 'Permission denied. Check file permissions or ImageMagick security policies (policy.xml). ' + err.message;
                                }
                                console.error(`[PDFProcess] gm Error for page ${i}:`, err);
                                return reject(new Error(`Failed to convert page ${i} to image: ${errMsg}`));
                            }
                            tocImagePaths.push(outputImagePath);
                            console.log(`[PDFProcess] Converted PDF page ${i} to image: ${outputImagePath}`);
                            resolve();
                        });
                });
            } catch (imgErr) {
                console.warn(`[PDFProcess] Warning: Could not convert PDF page ${i} to image: ${imgErr.message}. Skipping this page for ToC.`);
            }
        }
        
        if (tocImagePaths.length === 0) {
            throw new Error("Failed to convert any ToC pages to images. Cannot proceed with AI analysis.");
        }
        console.log(`[PDFProcess] Extracted ${tocImagePaths.length} images for ToC analysis.`);

        const tocPrompt = `
            Analyze these images of a textbook's table of contents. Identify chapter titles and their starting page numbers as listed IN THE TABLE OF CONTENTS.
            The textbook's actual content (textbook page '1') corresponds to PDF page number ${actualFirstPageNumber}.
            Return a JSON array of objects, where each object represents a chapter and has "chapter_title" and "toc_page_number" (the page number written in the ToC).
            Example: [{ "chapter_title": "Chapter 1: Introduction to Subject", "toc_page_number": 1 }, { "chapter_title": "Chapter 2: Core Concepts", "toc_page_number": 25 }, ...]
            Ensure "toc_page_number" is an integer. Focus only on main chapters.
        `;
        
        // Assuming generateImageContentResponse can take an array of image paths
        // const aiResponseTocRaw = await generateImageContentResponse(tocImagePaths, tocPrompt, geminiApiKey); // MODIFIED: AI Vision call disabled
        // let aiResponseToc = JSON.parse(aiResponseTocRaw.replace(/```json\n?|```/g, '').trim()); // MODIFIED: AI Vision call disabled
        console.warn("[PDFProcess] AI ToC generation via vision (generateImageContentResponse) is temporarily disabled as it's not available in ai_integration_server.js. Using placeholder ToC.");
        let aiResponseToc = [
            { "chapter_title": "Chapter 1: Placeholder Title from Server Refactor", "toc_page_number": 1 },
            { "chapter_title": "Chapter 2: Another Placeholder from Server Refactor", "toc_page_number": 10 },
            { "chapter_title": "Chapter 3: Final Placeholder from Server Refactor", "toc_page_number": 20 }
        ];
        console.log('[PDFProcess] AI ToC analysis (placeholder) response:', JSON.stringify(aiResponseToc, null, 2));

        if (!Array.isArray(aiResponseToc) || aiResponseToc.some(ch => typeof ch.chapter_title !== 'string' || typeof ch.toc_page_number !== 'number')) {
            console.error("[PDFProcess] Invalid ToC format from AI (placeholder check):", aiResponseToc); // Should still validate placeholder
            throw new Error("AI returned an invalid format for the Table of Contents. Expected an array of {chapter_title: string, toc_page_number: number}.");
        }
        
        // --- 4. Adjust Page Numbers and Prepare for Splitting ---
        const chapters = aiResponseToc.map(chapter => ({
            title: chapter.chapter_title,
            tocPage: parseInt(chapter.toc_page_number, 10),
            // Actual PDF page number where this chapter's content begins
            pdfPageStart: parseInt(chapter.toc_page_number, 10) + actualFirstPageNumber - 1 
        })).sort((a, b) => a.pdfPageStart - b.pdfPageStart);

        console.log('[PDFProcess] Processed chapters after page adjustment:', JSON.stringify(chapters, null, 2));

        // --- 5. Split PDF into Chapters ---
        console.log('[PDFProcess] Splitting PDF into chapters...');
        let chapterMegaFolderNode = await serverMega.findFolder(textbookChaptersFolderName, courseMegaFolderNode); // MODIFIED
        if (!chapterMegaFolderNode) chapterMegaFolderNode = await serverMega.createFolder(textbookChaptersFolderName, courseMegaFolderNode); // MODIFIED
        if (!chapterMegaFolderNode) throw new Error(`Failed to create MEGA folder for chapter PDFs: ${textbookChaptersFolderName}`);

        const originalPdfBytes = fs.readFileSync(pdfFilePath); // Load once for splitting
        const chapterFirestoreData = [];

        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];
            const pdfPageEnd = (i === chapters.length - 1) ? totalPdfPages : chapters[i+1].pdfPageStart - 1;

            if (chapter.pdfPageStart > pdfPageEnd || chapter.pdfPageStart > totalPdfPages) {
                console.warn(`[PDFProcess] Skipping chapter "${chapter.title}" due to invalid page range: PDF Start ${chapter.pdfPageStart}, PDF End ${pdfPageEnd}. Total pages ${totalPdfPages}.`);
                continue;
            }
            
            console.log(`[PDFProcess] Processing chapter "${chapter.title}": PDF pages ${chapter.pdfPageStart} to ${pdfPageEnd}`);

            const chapterPdfDoc = await PDFDocument.create();
            const sourcePdfDoc = await PDFDocument.load(originalPdfBytes); // Load from bytes for each chapter split
            
            // pdf-lib pages are 0-indexed
            const pagesToCopyIndices = [];
            for (let p = chapter.pdfPageStart; p <= pdfPageEnd; p++) {
                if (p > 0 && p <= sourcePdfDoc.getPageCount()) { // Ensure page number is valid
                     pagesToCopyIndices.push(p - 1);
                } else {
                    console.warn(`[PDFProcess] Invalid page number ${p} requested for chapter "${chapter.title}". Max pages: ${sourcePdfDoc.getPageCount()}. Skipping page.`);
                }
            }
            
            if (pagesToCopyIndices.length === 0) {
                console.warn(`[PDFProcess] No valid pages to copy for chapter "${chapter.title}". Skipping chapter.`);
                continue;
            }

            const copiedPages = await chapterPdfDoc.copyPages(sourcePdfDoc, pagesToCopyIndices);
            copiedPages.forEach(page => chapterPdfDoc.addPage(page));

            const chapterPdfBytes = await chapterPdfDoc.save();
            const chapterFileName = sanitizeFilename(`Ch_${i+1}_${chapter.title}.pdf`);
            const chapterTempPath = path.join(TEMP_PROCESSING_DIR, chapterFileName);
            fs.writeFileSync(chapterTempPath, chapterPdfBytes);
            console.log(`[PDFProcess] Chapter PDF saved locally: ${chapterTempPath}`);

            // --- 6. Upload Chapter PDF to MEGA ---
            const uploadedChapterPdf = await serverMega.uploadFile(chapterTempPath, chapterFileName, chapterMegaFolderNode); // MODIFIED
            if (!uploadedChapterPdf || !uploadedChapterPdf.link) {
                console.warn(`[PDFProcess] Failed to upload chapter PDF "${chapterFileName}" to MEGA. Skipping this chapter's Firestore update.`);
                continue;
            }
            chapterPdfMegaPaths.push(uploadedChapterPdf.link);
            console.log(`[PDFProcess] Chapter PDF "${chapterFileName}" uploaded to MEGA: ${uploadedChapterPdf.link}`);

            chapterFirestoreData.push({
                title: chapter.title,
                megaPdfLink: uploadedChapterPdf.link,
                chapterNumber: i + 1,
                startPagePdf: chapter.pdfPageStart,
                startPageTextbook: chapter.tocPage, // Page number as in ToC
                sourcePdfPageEnd: pdfPageEnd, // For reference
            });
        }
        
        // --- 7. Update Firestore with Chapter Details ---
        if (chapterFirestoreData.length > 0) {
            // Fetch existing course data to merge, or create new structure
            // const existingCourseData = await getCourseDetails(courseId); // Firestore disabled
            const existingCourseData = null; // Placeholder since getCourseDetails is disabled
            const existingChapterResources = existingCourseData?.chapterResources || {}; // MODIFIED: Safe access
            
            chapterFirestoreData.forEach(chData => {
                // This assumes chapter IDs are like "chapter_1", "chapter_2"
                // Or, if chapters are defined elsewhere, this needs to match that structure
                // For simplicity, let's assume we overwrite or add based on chapterNumber
                // A better approach might be to clear old textbook chapter PDFs if this is a re-processing
                const chapterKey = `textbook_chapter_${chData.chapterNumber}`;
                
                // Initialize otherResources if it doesn't exist
                if (!existingChapterResources[chapterKey]) {
                    existingChapterResources[chapterKey] = { lectureUrls: [], otherResources: [] };
                } else if (!existingChapterResources[chapterKey].otherResources) {
                    existingChapterResources[chapterKey].otherResources = [];
                }

                // Remove any old PDF of type 'textbook_chapter_segment' for this chapterKey
                existingChapterResources[chapterKey].otherResources = existingChapterResources[chapterKey].otherResources.filter(
                    res => !(res.type === 'textbook_chapter_segment' && res.title === chData.title)
                );

                // Add the new chapter PDF segment
                existingChapterResources[chapterKey].otherResources.push({
                    title: chData.title,
                    url: chData.megaPdfLink,
                    type: 'textbook_chapter_segment', // New type for these resources
                    textbookPageStart: chData.startPageTextbook,
                    pdfPageStart: chData.startPagePdf,
                    pdfPageEnd: chData.sourcePdfPageEnd
                });
            });

            // await updateCourseDefinition(courseId, { chapterResources: existingChapterResources }); // Firestore disabled
            console.log(`[PDFProcess] Firestore update for chapter PDF details SKIPPED for course ${courseId}.`);
        } else {
            console.warn("[PDFProcess] No chapters were successfully processed and uploaded. Firestore not updated with chapter details.");
        }

        return {
            success: true,
            message: "Textbook PDF processed, split into chapters, and uploaded successfully.",
            fullPdfLink: fullPdfMegaPath,
            chaptersProcessed: chapterFirestoreData.length,
            chapterLinks: chapterPdfMegaPaths,
        };

    } catch (error) {
        console.error(`[PDFProcess] CRITICAL ERROR during PDF processing for course ${courseId}:`, error);
        // Log specific errors if available (e.g. from AI or MEGA)
        return {
            success: false,
            message: `PDF processing failed: ${error.message}`,
            error: error.stack,
        };
    } finally {
        // --- 8. Cleanup ---
        if (fs.existsSync(TEMP_PROCESSING_DIR)) {
            try {
                await fs.remove(TEMP_PROCESSING_DIR); // fs-extra's remove is like rm -rf
                console.log(`[PDFProcess] Temporary processing directory deleted: ${TEMP_PROCESSING_DIR}`);
            } catch (err) {
                console.error(`[PDFProcess] Error deleting temporary processing directory ${TEMP_PROCESSING_DIR}:`, err);
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
