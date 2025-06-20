const fs = require('fs-extra');
const path = require('path');
// const { initialize: megaInitialize, findFolder: megaFindFolder, createFolder: megaCreateFolder, uploadFile: megaUploadFile, megaStorage } = require('./mega_service.js');
const serverMega = require('./mega_service_server.js'); // MODIFIED for server-side
// const { getCourseDetails, updateCourseDefinition } = require('./firebase_firestore.js'); // MODIFIED: Firestore temporarily disabled
// import { getAllPdfTextForAI, callGeminiTextAPI as generateTextContentResponse } from './ai_integration.js'; // MODIFIED for ES Import and aliasing
const aiServer = require('./ai_integration_server.js'); // MODIFIED for server-side

const TEMP_PROCESSING_DIR_BASE = path.join(__dirname, 'temp_question_gen');

const MAX_CHAR_PER_CHUNK = 8000; // Max characters per chunk for AI processing (Reduced from 12000)
const OVERLAP_CHAR_COUNT = 500;   // Overlap characters between chunks

// Helper function to sanitize filenames (though for TextMCQ.md and TextProblems.md, names are fixed)
// function sanitizeFilename(name) {
//     return name.replace(/[^\w\s.-]/g, '_').replace(/\s+/g, '_');
// }

/**
 * Splits a large text into smaller chunks with overlap.
 * @param {string} text The text to split.
 * @param {number} maxChars The maximum number of characters per chunk.
 * @param {number} overlap The number of characters to overlap between chunks.
 * @returns {string[]} An array of text chunks.
 */
function splitTextIntoChunks(text, maxChars, overlap) {
    const chunks = [];
    let startIndex = 0;

    if (!text || text.length === 0) {
        return [];
    }
    if (text.length <= maxChars) {
        return [text];
    }

    while (startIndex < text.length) {
        let endIndex = startIndex + maxChars;
        if (endIndex >= text.length) {
            chunks.push(text.substring(startIndex));
            break;
        }

        // Find a natural break point (e.g., end of sentence or paragraph) near endIndex to avoid cutting mid-sentence
        // For simplicity, we'll just cut at maxChars for now, but this could be improved.
        // Let's try to find a space to break at, to not cut words.
        let actualEndIndex = text.lastIndexOf(' ', endIndex);
        if (actualEndIndex <= startIndex + overlap) { // If no space found or too close to start, just cut at maxChars
            actualEndIndex = endIndex;
        }
        
        chunks.push(text.substring(startIndex, actualEndIndex));
        startIndex = actualEndIndex - overlap;
        if (startIndex < 0) startIndex = 0; // Should not happen with typical overlap
    }
    return chunks;
}


async function generateQuestionsFromPdf(
    courseId,
    chapterKey, // e.g., "textbook_chapter_1"
    chapterPdfMegaLink,
    chapterTitle,
    megaEmail,
    megaPassword,
    geminiApiKey
) {
    const processingTimestamp = Date.now();
    const TEMP_PROCESSING_DIR = path.join(TEMP_PROCESSING_DIR_BASE, `${courseId}_${chapterKey}_${processingTimestamp}`);
    console.log(`[QGenService] Starting PDF Question Generation for course ${courseId}, chapter ${chapterTitle} (Key: ${chapterKey}). Temp dir: ${TEMP_PROCESSING_DIR}`);

    let downloadedPdfPath = null;
    const generatedFilesToUpload = []; // To store paths of TextMCQ.md, TextProblems.md for upload

    try {
        await fs.ensureDir(TEMP_PROCESSING_DIR);

        // --- 1. Download Chapter PDF from MEGA ---
        console.log(`[QGenService] Initializing MEGA service for PDF download...`);
        // const mega = await megaInitialize(megaEmail, megaPassword); // OLD
        // if (!mega || !mega.root) throw new Error('MEGA initialization failed or root directory not accessible.'); // OLD
        await serverMega.initialize(megaEmail, megaPassword); // NEW
        const megaStorage = serverMega.getMegaStorage(); // Ensure this is called after initialize // NEW
        if (!megaStorage || !megaStorage.root) throw new Error('MEGA service initialization failed or root directory not accessible.'); // NEW
        
        console.log(`[QGenService] Downloading PDF from MEGA link: ${chapterPdfMegaLink}`);
        // const file = megaStorage.File.fromURL(chapterPdfMegaLink); // OLD - megaStorage here is from old import
        // const pdfFileName = sanitizeFilename(file.name || `${chapterKey}_temp.pdf`); // OLD
        // downloadedPdfPath = path.join(TEMP_PROCESSING_DIR, pdfFileName); // OLD
        // const data = await file.downloadBuffer(); // OLD
        // await fs.writeFile(downloadedPdfPath, data); // OLD
        const tempPdfName = sanitizeFilename(`${chapterKey}_temp.pdf`); // Construct a temporary name // NEW
        downloadedPdfPath = await serverMega.downloadFile(chapterPdfMegaLink, TEMP_PROCESSING_DIR, tempPdfName); // NEW
        console.log(`[QGenService] Chapter PDF downloaded to: ${downloadedPdfPath}`);

        // --- 2. Extract Text from PDF ---
        console.log(`[QGenService] Extracting text from PDF: ${downloadedPdfPath}`);
        const extractedPdfText = await aiServer.getAllPdfTextForAI(downloadedPdfPath); // MODIFIED for server-side AI
        if (!extractedPdfText || extractedPdfText.trim().length < 100) { // Basic check for meaningful content
            throw new Error(`Extracted text from PDF is too short or empty. Min 100 chars required. Length: ${extractedPdfText.trim().length}`);
        }
        console.log(`[QGenService] Text extracted successfully. Length: ${extractedPdfText.length} characters.`);

        // --- 3. Chunk Text and Generate TextMCQ.md ---
        console.log(`[QGenService] Splitting extracted text into chunks. Max chars: ${MAX_CHAR_PER_CHUNK}, Overlap: ${OVERLAP_CHAR_COUNT}`);
        const textChunks = splitTextIntoChunks(extractedPdfText, MAX_CHAR_PER_CHUNK, OVERLAP_CHAR_COUNT);
        console.log(`[QGenService] Text split into ${textChunks.length} chunks.`);

        let allMcqContent = "";
        const exampleMcqSyntax = await fs.readFile('example_TextMCQ.md', 'utf-8');

        for (let i = 0; i < textChunks.length; i++) {
            const chunk = textChunks[i];
            console.log(`[QGenService] Generating MCQs for chunk ${i + 1} of ${textChunks.length}...`);
            
            const mcqPrompt = `
Generate Multiple Choice Questions (MCQs) based *only* on the following text segment from chunk ${i + 1}/${textChunks.length} of chapter "${chapterTitle}".
Adhere strictly to this Markdown format for each MCQ:
--- Example MCQ Format ---
${exampleMcqSyntax}
--- End Example MCQ Format ---
Focus on definitions, concepts, and applications from the text. Include difficulty (Easy, Medium, Hard), explanations, and keywords.

Text segment:
--- Text ---
${chunk}
--- End Text ---
Generate MCQs now.
`;
            const chunkMcqContent = await aiServer.callGeminiTextAPI(geminiApiKey, mcqPrompt);
            allMcqContent += (allMcqContent ? "\n\n---\n\n" : "") + chunkMcqContent; // Add separator for clarity between chunk outputs
            console.log(`[QGenService] MCQs generated for chunk ${i + 1}. Length: ${chunkMcqContent.length}`);
        }
        
        const tempMcqPath = path.join(TEMP_PROCESSING_DIR, 'TextMCQ.md');
        await fs.writeFile(tempMcqPath, allMcqContent);
        generatedFilesToUpload.push({ path: tempMcqPath, name: 'TextMCQ.md', type: 'generated_mcq_markdown' });
        console.log(`[QGenService] Aggregated TextMCQ.md generated and saved to: ${tempMcqPath}. Total length: ${allMcqContent.length}`);

        // --- 4. Generate TextProblems.md (using the same chunks) ---
        console.log(`[QGenService] Generating TextProblems.md using text chunks...`);
        let allProblemsContent = "";
        const exampleProblemsSyntax = await fs.readFile('example_TextProblems.md', 'utf-8');

        for (let i = 0; i < textChunks.length; i++) {
            const chunk = textChunks[i];
            console.log(`[QGenService] Generating Problems for chunk ${i + 1} of ${textChunks.length}...`);

            const problemsPrompt = `
Generate diverse problems based *only* on the following text segment from chunk ${i + 1}/${textChunks.length} of chapter "${chapterTitle}".
Adhere strictly to this Markdown format for each problem:
--- Example Problem Format ---
${exampleProblemsSyntax}
--- End Example Problem Format ---
Include difficulty (Easy, Medium, Hard), solution approach, expected answer, and keywords.

Text segment:
--- Text ---
${chunk}
--- End Text ---
Generate problems now.
`;
            const chunkProblemsContent = await aiServer.callGeminiTextAPI(geminiApiKey, problemsPrompt);
            allProblemsContent += (allProblemsContent ? "\n\n---\n\n" : "") + chunkProblemsContent; // Add separator
            console.log(`[QGenService] Problems generated for chunk ${i + 1}. Length: ${chunkProblemsContent.length}`);
        }

        const tempProblemsPath = path.join(TEMP_PROCESSING_DIR, 'TextProblems.md');
        await fs.writeFile(tempProblemsPath, allProblemsContent);
        generatedFilesToUpload.push({ path: tempProblemsPath, name: 'TextProblems.md', type: 'generated_problems_markdown' });
        console.log(`[QGenService] Aggregated TextProblems.md generated and saved to: ${tempProblemsPath}. Total length: ${allProblemsContent.length}`);
        
        // --- 5. Upload Markdown Files to MEGA ---
        // console.log(`[QGenService] Fetching course details for MEGA upload path...`); // Firestore disabled
        // const courseDetails = await getCourseDetails(courseId); // Firestore disabled
        // if (!courseDetails) throw new Error(`Course details not found for ID: ${courseId} during MEGA upload phase.`); // Firestore disabled
        // const courseDirName = courseDetails.courseDirName; // Firestore disabled
        const courseDirName = `CourseDir_${courseId}`; // Placeholder after commenting out Firestore
        // if (!courseDirName) throw new Error(`courseDirName not found for Course ID: ${courseId}. Cannot determine MEGA path.`); // Firestore disabled
        console.log(`[QGenService] Using placeholder courseDirName for MEGA upload: ${courseDirName}`);

        const lyceumRootFolderName = "LyceumCourses_Test";
        const generatedQuestionsFolderName = "Generated_Questions"; // Top-level folder for all generated questions for a course
        // chapterKey is already descriptive, e.g., "textbook_chapter_1"

        let lyceumRootNode = await serverMega.findFolder(lyceumRootFolderName, megaStorage.root); // MODIFIED
        if (!lyceumRootNode) lyceumRootNode = await serverMega.createFolder(lyceumRootFolderName, megaStorage.root); // MODIFIED
        if (!lyceumRootNode) throw new Error(`Failed to find/create Lyceum root folder: ${lyceumRootFolderName}`);

        let courseMegaFolderNode = await serverMega.findFolder(courseDirName, lyceumRootNode); // MODIFIED
        if (!courseMegaFolderNode) courseMegaFolderNode = await serverMega.createFolder(courseDirName, lyceumRootNode); // MODIFIED
        if (!courseMegaFolderNode) throw new Error(`Failed to find/create course folder: ${courseDirName}`);
        
        let genQuestionsCourseNode = await serverMega.findFolder(generatedQuestionsFolderName, courseMegaFolderNode); // MODIFIED
        if(!genQuestionsCourseNode) genQuestionsCourseNode = await serverMega.createFolder(generatedQuestionsFolderName, courseMegaFolderNode); // MODIFIED
        if(!genQuestionsCourseNode) throw new Error(`Failed to find/create Generated_Questions folder for course: ${generatedQuestionsFolderName}`);

        let chapterQuestionsNode = await serverMega.findFolder(chapterKey, genQuestionsCourseNode); // Use chapterKey as the folder name // MODIFIED
        if (!chapterQuestionsNode) chapterQuestionsNode = await serverMega.createFolder(chapterKey, genQuestionsCourseNode); // MODIFIED
        if (!chapterQuestionsNode) throw new Error(`Failed to find/create chapter-specific questions folder: ${chapterKey}`);
        
        const uploadedFileLinks = {};

        for (const fileToUpload of generatedFilesToUpload) {
            console.log(`[QGenService] Uploading ${fileToUpload.name} to MEGA folder: ${chapterQuestionsNode.name}`);
            const uploadedFile = await serverMega.uploadFile(fileToUpload.path, fileToUpload.name, chapterQuestionsNode); // MODIFIED
            if (!uploadedFile || !uploadedFile.link) {
                throw new Error(`Failed to upload ${fileToUpload.name} to MEGA or link not returned.`);
            }
            uploadedFileLinks[fileToUpload.type] = uploadedFile.link; // Store link by type
            console.log(`[QGenService] ${fileToUpload.name} uploaded successfully: ${uploadedFile.link}`);
        }

        // --- 6. Update Firestore ---
        console.log(`[QGenService] Firestore update SKIPPED for course ${courseId}, chapter key ${chapterKey}.`);
        // const existingCourseDataForUpdate = await getCourseDetails(courseId); // Firestore disabled
        // if (!existingCourseDataForUpdate) throw new Error(`Failed to re-fetch course data for ${courseId} before Firestore update.`); // Firestore disabled

        // const chapterResources = existingCourseDataForUpdate.chapterResources || {}; // Firestore disabled
        const chapterResources = {}; // Placeholder since Firestore is disabled
        if (!chapterResources[chapterKey]) {
            console.warn(`[QGenService] Chapter key "${chapterKey}" not found in placeholder chapterResources. Initializing.`);
            chapterResources[chapterKey] = { lectureUrls: [], otherResources: [] }; // This will be on the placeholder
        }
        if (!chapterResources[chapterKey].otherResources) { // Should be set by above if it was missing
            chapterResources[chapterKey].otherResources = []; // Should be set by above if it was missing
        }

        // Remove old entries of the same types for this chapterKey before adding new ones
        // This logic would apply to the placeholder `chapterResources` if it were populated
        chapterResources[chapterKey].otherResources = chapterResources[chapterKey].otherResources.filter(
            res => !(res.type === 'generated_mcq_markdown' || res.type === 'generated_problems_markdown')
        );
        
        if (uploadedFileLinks['generated_mcq_markdown']) {
            chapterResources[chapterKey].otherResources.push({
                title: `MCQs for ${chapterTitle}`,
                url: uploadedFileLinks['generated_mcq_markdown'],
                type: 'generated_mcq_markdown',
                generatedAt: new Date().toISOString()
            });
        }
        if (uploadedFileLinks['generated_problems_markdown']) {
            chapterResources[chapterKey].otherResources.push({
                title: `Problems for ${chapterTitle}`,
                url: uploadedFileLinks['generated_problems_markdown'],
                type: 'generated_problems_markdown',
                generatedAt: new Date().toISOString()
            });
        }

        // await updateCourseDefinition(courseId, { chapterResources }); // Firestore disabled
        // console.log(`[QGenService] Firestore updated successfully for course ${courseId}, chapter ${chapterKey}.`); // Firestore disabled

        return {
            success: true,
            message: `MCQs and Problems generated and saved for chapter: ${chapterTitle} (Firestore update skipped).`,
            mcqMegaLink: uploadedFileLinks['generated_mcq_markdown'] || null,
            problemsMegaLink: uploadedFileLinks['generated_problems_markdown'] || null,
        };

    } catch (error) {
        console.error(`[QGenService] CRITICAL ERROR during PDF Question Generation for course ${courseId}, chapter ${chapterKey}:`, error);
        return {
            success: false,
            message: `PDF Question Generation failed: ${error.message}`,
            error: error.stack,
        };
    } finally {
        // --- 7. Cleanup ---
        if (fs.existsSync(TEMP_PROCESSING_DIR)) {
            try {
                await fs.remove(TEMP_PROCESSING_DIR);
                console.log(`[QGenService] Temporary processing directory deleted: ${TEMP_PROCESSING_DIR}`);
            } catch (err) {
                console.error(`[QGenService] Error deleting temporary processing directory ${TEMP_PROCESSING_DIR}:`, err);
            }
        }
    }
}

// Helper to sanitize MEGA node names (basic version)
function sanitizeFilename(name) {
    if (!name) return 'untitled';
    return name.replace(/[\\/*?"<>|:]/g, '_').replace(/\s+/g, '_');
}


module.exports = {
    generateQuestionsFromPdf,
};

// Example Usage (for testing - comment out or remove in production/import scenarios)
/*
async function testQuestionGeneration() {
    // This test requires a valid MEGA link to a PDF for a chapter that exists in Firestore
    // and has a 'chapterKey' (e.g., 'textbook_chapter_1')
    const TEST_COURSE_ID = "TEST_COURSE_QGEN_001"; // Replace with a valid course ID
    const TEST_CHAPTER_KEY = "textbook_chapter_1"; // Replace with a valid chapter key
    const TEST_CHAPTER_PDF_MEGA_LINK = "MEGA_LINK_TO_CHAPTER_PDF"; // IMPORTANT: Replace with a real MEGA link
    const TEST_CHAPTER_TITLE = "Introduction to Quantum Physics"; // Example title
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
    const MEGA_EMAIL = process.env.MEGA_EMAIL;
    const MEGA_PASSWORD = process.env.MEGA_PASSWORD;

    if (!GEMINI_API_KEY || !MEGA_EMAIL || !MEGA_PASSWORD || TEST_CHAPTER_PDF_MEGA_LINK === "MEGA_LINK_TO_CHAPTER_PDF") {
        console.error("Missing required environment variables or placeholder MEGA link for testing.");
        return;
    }
    
    // Mock firebase_firestore and ai_integration for local testing if needed
    // global.getCourseDetails = async (courseId) => ({ 
    //     courseDirName: `CourseDir_${courseId}`, 
    //     chapterResources: { 
    //         [TEST_CHAPTER_KEY]: { lectureUrls: [], otherResources: [] } 
    //     } 
    // });
    // global.updateCourseDefinition = async (courseId, updates) => { console.log("Mock updateCourseDefinition called:", courseId, updates); return true; };
    // global.getAllPdfTextForAI = async (pdfPath) => { console.log("Mock getAllPdfTextForAI called for:", pdfPath); return "This is extensive sample text from the PDF document covering many concepts for generating questions."; };
    // global.generateTextContentResponse = async (parts, apiKey) => { 
    //     console.log("Mock generateTextContentResponse called.");
    //     if (parts[0].text.includes("Multiple Choice Questions")) return "## Mock MCQs\n1. Question?\n * (A) OptA\n * (B) OptB\n * **Answer:** (A)";
    //     if (parts[0].text.includes("problem sets")) return "## Mock Problems\n1. Solve this problem.";
    //     return "Mock AI response.";
    // };

    console.log("Starting test question generation...");
    const result = await generateQuestionsFromPdf(
        TEST_COURSE_ID,
        TEST_CHAPTER_KEY,
        TEST_CHAPTER_PDF_MEGA_LINK,
        TEST_CHAPTER_TITLE,
        MEGA_EMAIL,
        MEGA_PASSWORD,
        GEMINI_API_KEY
    );
    console.log("Test question generation result:", JSON.stringify(result, null, 2));
}

// testQuestionGeneration().catch(console.error);
*/
