const fs = require('fs-extra');
const path = require('path');
const { initialize: megaInitialize, findFolder: megaFindFolder, createFolder: megaCreateFolder, uploadFile: megaUploadFile, megaStorage } = require('./mega_service.js');
const { getCourseDetails, updateCourseDefinition } = require('./firebase_firestore.js');
const { getAllPdfTextForAI, generateTextContentResponse } = require('./ai_integration.js');

const TEMP_PROCESSING_DIR_BASE = path.join(__dirname, 'temp_question_gen');

// Helper function to sanitize filenames (though for TextMCQ.md and TextProblems.md, names are fixed)
// function sanitizeFilename(name) {
//     return name.replace(/[^\w\s.-]/g, '_').replace(/\s+/g, '_');
// }

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
        const mega = await megaInitialize(megaEmail, megaPassword); // Ensure megaStorage is ready
        if (!mega || !mega.root) throw new Error('MEGA initialization failed or root directory not accessible.');
        
        console.log(`[QGenService] Downloading PDF from MEGA link: ${chapterPdfMegaLink}`);
        const file = megaStorage.File.fromURL(chapterPdfMegaLink);
        const pdfFileName = sanitizeFilename(file.name || `${chapterKey}_temp.pdf`); // Sanitize original name or create one
        downloadedPdfPath = path.join(TEMP_PROCESSING_DIR, pdfFileName);
        
        const data = await file.downloadBuffer(); // Download to buffer first
        await fs.writeFile(downloadedPdfPath, data); // Then write to file
        console.log(`[QGenService] Chapter PDF downloaded to: ${downloadedPdfPath}`);

        // --- 2. Extract Text from PDF ---
        console.log(`[QGenService] Extracting text from PDF: ${downloadedPdfPath}`);
        const extractedPdfText = await getAllPdfTextForAI(downloadedPdfPath);
        if (!extractedPdfText || extractedPdfText.trim().length < 100) { // Basic check for meaningful content
            throw new Error(`Extracted text from PDF is too short or empty. Min 100 chars required. Length: ${extractedPdfText.trim().length}`);
        }
        console.log(`[QGenService] Text extracted successfully. Length: ${extractedPdfText.length} characters.`);

        // --- 3. Generate TextMCQ.md ---
        console.log(`[QGenService] Generating TextMCQ.md...`);
        const exampleMcqSyntax = await fs.readFile('example_TextMCQ.md', 'utf-8');
        const mcqPrompt = `
You are an expert in creating educational materials. Based on the following textbook chapter content, please generate a comprehensive set of Multiple Choice Questions (MCQs).
The chapter title is "${chapterTitle}".
The MCQs should cover various aspects of the text, including definitions, concepts, applications, and analyses.
Ensure the questions have clear correct answers and plausible distractors.
Follow this Markdown syntax strictly for each question:
--- Start of Example Syntax ---
${exampleMcqSyntax}
--- End of Example Syntax ---

Ensure you replace placeholder content like "[Chapter Title]", "[Concept A]", etc., with actual relevant content derived from the provided text.
Provide a variety of difficulty levels (Easy, Medium, Hard).
Include explanations for why the correct answer is correct.
List relevant keywords for each question.
If applicable, include a "Textbook Page Reference (Optional):" field, but since you don't have the actual page numbers of this PDF, you can either try to infer relative locations or omit this field.

Here is the extracted text from the chapter PDF:
--- Start of Chapter Text ---
${extractedPdfText}
--- End of Chapter Text ---

Generate the MCQs now.
`;
        const mcqContent = await generateTextContentResponse([{ text: mcqPrompt }], geminiApiKey); // Assuming generateTextContentResponse takes an array of parts
        const tempMcqPath = path.join(TEMP_PROCESSING_DIR, 'TextMCQ.md');
        await fs.writeFile(tempMcqPath, mcqContent);
        generatedFilesToUpload.push({ path: tempMcqPath, name: 'TextMCQ.md', type: 'generated_mcq_markdown' });
        console.log(`[QGenService] TextMCQ.md generated and saved to: ${tempMcqPath}`);

        // --- 4. Generate TextProblems.md ---
        console.log(`[QGenService] Generating TextProblems.md...`);
        const exampleProblemsSyntax = await fs.readFile('example_TextProblems.md', 'utf-8');
        const problemsPrompt = `
You are an expert in creating educational problem sets. Based on the following textbook chapter content, please generate a diverse set of problems.
The chapter title is "${chapterTitle}".
The problems should range from foundational calculations and explanations to more advanced application and design tasks.
Follow this Markdown syntax strictly for each problem:
--- Start of Example Syntax ---
${exampleProblemsSyntax}
--- End of Example Syntax ---

Ensure you replace placeholder content like "[Chapter Title]", "[Initial Condition A]", etc., with actual relevant content derived from the provided text.
Provide a variety of difficulty levels (Easy, Medium, Hard).
Include a "Solution Approach" for each problem, outlining the steps or concepts required.
Provide an "Expected Answer" where applicable (e.g., for calculation problems or specific conceptual explanations).
List relevant keywords for each problem.
If applicable, include a "Textbook Page Reference (Optional):" field, but as before, you can infer relative locations or omit this.

Here is the extracted text from the chapter PDF:
--- Start of Chapter Text ---
${extractedPdfText}
--- End of Chapter Text ---

Generate the problems now.
`;
        const problemsContent = await generateTextContentResponse([{ text: problemsPrompt }], geminiApiKey);
        const tempProblemsPath = path.join(TEMP_PROCESSING_DIR, 'TextProblems.md');
        await fs.writeFile(tempProblemsPath, problemsContent);
        generatedFilesToUpload.push({ path: tempProblemsPath, name: 'TextProblems.md', type: 'generated_problems_markdown' });
        console.log(`[QGenService] TextProblems.md generated and saved to: ${tempProblemsPath}`);
        
        // --- 5. Upload Markdown Files to MEGA ---
        console.log(`[QGenService] Fetching course details for MEGA upload path...`);
        const courseDetails = await getCourseDetails(courseId);
        if (!courseDetails) throw new Error(`Course details not found for ID: ${courseId} during MEGA upload phase.`);
        const courseDirName = courseDetails.courseDirName;
        if (!courseDirName) throw new Error(`courseDirName not found for Course ID: ${courseId}. Cannot determine MEGA path.`);

        const lyceumRootFolderName = "LyceumCourses_Test";
        const generatedQuestionsFolderName = "Generated_Questions"; // Top-level folder for all generated questions for a course
        // chapterKey is already descriptive, e.g., "textbook_chapter_1"

        let lyceumRootNode = await megaFindFolder(lyceumRootFolderName, mega.root);
        if (!lyceumRootNode) lyceumRootNode = await megaCreateFolder(lyceumRootFolderName, mega.root);
        if (!lyceumRootNode) throw new Error(`Failed to find/create Lyceum root folder: ${lyceumRootFolderName}`);

        let courseMegaFolderNode = await megaFindFolder(courseDirName, lyceumRootNode);
        if (!courseMegaFolderNode) courseMegaFolderNode = await megaCreateFolder(courseDirName, lyceumRootNode);
        if (!courseMegaFolderNode) throw new Error(`Failed to find/create course folder: ${courseDirName}`);
        
        let genQuestionsCourseNode = await megaFindFolder(generatedQuestionsFolderName, courseMegaFolderNode);
        if(!genQuestionsCourseNode) genQuestionsCourseNode = await megaCreateFolder(generatedQuestionsFolderName, courseMegaFolderNode);
        if(!genQuestionsCourseNode) throw new Error(`Failed to find/create Generated_Questions folder for course: ${generatedQuestionsFolderName}`);

        let chapterQuestionsNode = await megaFindFolder(chapterKey, genQuestionsCourseNode); // Use chapterKey as the folder name
        if (!chapterQuestionsNode) chapterQuestionsNode = await megaCreateFolder(chapterKey, genQuestionsCourseNode);
        if (!chapterQuestionsNode) throw new Error(`Failed to find/create chapter-specific questions folder: ${chapterKey}`);
        
        const uploadedFileLinks = {};

        for (const fileToUpload of generatedFilesToUpload) {
            console.log(`[QGenService] Uploading ${fileToUpload.name} to MEGA folder: ${chapterQuestionsNode.name}`);
            const uploadedFile = await megaUploadFile(fileToUpload.path, fileToUpload.name, chapterQuestionsNode);
            if (!uploadedFile || !uploadedFile.link) {
                throw new Error(`Failed to upload ${fileToUpload.name} to MEGA or link not returned.`);
            }
            uploadedFileLinks[fileToUpload.type] = uploadedFile.link; // Store link by type
            console.log(`[QGenService] ${fileToUpload.name} uploaded successfully: ${uploadedFile.link}`);
        }

        // --- 6. Update Firestore ---
        console.log(`[QGenService] Updating Firestore for course ${courseId}, chapter key ${chapterKey}...`);
        const existingCourseDataForUpdate = await getCourseDetails(courseId);
        if (!existingCourseDataForUpdate) throw new Error(`Failed to re-fetch course data for ${courseId} before Firestore update.`);

        const chapterResources = existingCourseDataForUpdate.chapterResources || {};
        if (!chapterResources[chapterKey]) {
            console.warn(`[QGenService] Chapter key "${chapterKey}" not found in chapterResources for course ${courseId}. Initializing.`);
            chapterResources[chapterKey] = { lectureUrls: [], otherResources: [] };
        }
        if (!chapterResources[chapterKey].otherResources) {
            chapterResources[chapterKey].otherResources = [];
        }

        // Remove old entries of the same types for this chapterKey before adding new ones
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

        await updateCourseDefinition(courseId, { chapterResources });
        console.log(`[QGenService] Firestore updated successfully for course ${courseId}, chapter ${chapterKey}.`);

        return {
            success: true,
            message: `MCQs and Problems generated and saved for chapter: ${chapterTitle}`,
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
