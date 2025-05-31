const fs = require('fs-extra');
const path = require('path');
// const { initialize: gDriveInitialize, findFolder: gDriveFindFolder, createFolder: gDriveCreateFolder, uploadFile: gDriveUploadFile } = require('./google_drive_service.js'); // Client-side, not for server
const serverGoogleDrive = require('./google_drive_service_server.js'); // Use the server-side Google Drive service
// const { getCourseDetails, updateCourseDefinition } = require('./firebase_firestore.js'); // MODIFIED: Firestore temporarily disabled
const aiServer = require('./ai_integration_server.js');

const TEMP_PROCESSING_DIR_BASE = path.join(__dirname, 'temp_question_gen');

const MAX_CHAR_PER_CHUNK = 60000; // Max characters per chunk for AI processing (Reduced from 12000)
const OVERLAP_CHAR_COUNT = 3000;   // Overlap characters between chunks

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

// Standardized logging helper for this service
const logQGen = (context, messageOrError, level = 'info') => {
    let logMessage;
    let fullErrorStack = null;
    const { courseId, chapterKey } = context || {};
    const prefix = `[QGenService]${courseId ? `[${courseId}]` : ''}${chapterKey ? `[${chapterKey}]` : '[General]'}`;

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

async function generateQuestionsFromPdf(
    courseId,
    chapterKey, // e.g., "textbook_chapter_1"
    chapterPdfGoogleDriveId, // Changed from Link to ID for Google Drive
    chapterTitle,
    // megaEmail and megaPassword removed
    initializedServerGoogleDrive, // Renamed instance
    geminiApiKey // Expected to be an array of keys or a single key string
) {
    const processingTimestamp = Date.now();
    const TEMP_PROCESSING_DIR = path.join(TEMP_PROCESSING_DIR_BASE, `${courseId}_${chapterKey}_${processingTimestamp}`);
    const logContext = { courseId, chapterKey };
    let qGenApiKeyIndex = 0; // Index for cycling through API keys for AI calls

    logQGen(logContext, `Starting PDF Question Generation for chapter ${chapterTitle} using Google Drive. Temp dir: ${TEMP_PROCESSING_DIR}`);

    let downloadedPdfPath = null;
    const generatedFilesToUpload = []; 

    try {
        await fs.ensureDir(TEMP_PROCESSING_DIR);

        // --- 1. Download Chapter PDF from Google Drive ---
        // Google Drive service is initialized by the caller and passed as 'initializedServerGoogleDrive'
        
        logQGen(logContext, `Downloading PDF from Google Drive ID: ${chapterPdfGoogleDriveId} using provided Google Drive instance.`);
        const tempPdfName = sanitizeFilename(`${chapterKey}_temp.pdf`); 
        // Use the passed-in initializedServerGoogleDrive for operations
        // downloadFile in google_drive_service_server.js takes fileId, destinationPath, desiredFileName
        downloadedPdfPath = await initializedServerGoogleDrive.downloadFile(chapterPdfGoogleDriveId, TEMP_PROCESSING_DIR, tempPdfName);
        logQGen(logContext, `Chapter PDF downloaded to: ${downloadedPdfPath}`);

        // --- 2. Extract Text from PDF ---
        logQGen(logContext, `Extracting text from PDF: ${downloadedPdfPath}`);
        const extractedPdfText = await aiServer.getAllPdfTextForAI(downloadedPdfPath); 
        if (!extractedPdfText || extractedPdfText.trim().length < 100) { 
            throw new Error(`Extracted text from PDF is too short or empty. Min 100 chars required. Length: ${extractedPdfText.trim().length}`);
        }
        logQGen(logContext, `Text extracted successfully. Length: ${extractedPdfText.length} characters.`);

        // --- 3. Chunk Text and Generate TextMCQ.md ---
        logQGen(logContext, `Splitting extracted text into chunks. Max chars: ${MAX_CHAR_PER_CHUNK}, Overlap: ${OVERLAP_CHAR_COUNT}`);
        const textChunks = splitTextIntoChunks(extractedPdfText, MAX_CHAR_PER_CHUNK, OVERLAP_CHAR_COUNT);
        logQGen(logContext, `Text split into ${textChunks.length} chunks.`);

        let allMcqContent = "";
        const exampleMcqSyntax = await fs.readFile('example_TextMCQ.md', 'utf-8');
        
        let validGeminiApiKeys = [];
        if (Array.isArray(geminiApiKey) && geminiApiKey.length > 0) {
            validGeminiApiKeys = geminiApiKey.filter(k => typeof k === 'string' && k.trim() !== '');
        }

        for (let i = 0; i < textChunks.length; i++) {
            const chunk = textChunks[i];
            logQGen(logContext, `Generating MCQs for chunk ${i + 1} of ${textChunks.length}...`);
            
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
            let apiKeyForThisCall;
            if (validGeminiApiKeys.length > 0) {
                apiKeyForThisCall = validGeminiApiKeys[qGenApiKeyIndex % validGeminiApiKeys.length];
                qGenApiKeyIndex++;
                logQGen(logContext, `Using API key from input array (index ${(qGenApiKeyIndex - 1 + validGeminiApiKeys.length) % validGeminiApiKeys.length}) for MCQ chunk ${i+1}.`);
            } else if (typeof geminiApiKey === 'string' && geminiApiKey.trim() !== '') {
                apiKeyForThisCall = geminiApiKey;
                 if (i === 0) logQGen(logContext, 'Using single provided API key for all MCQ chunks.');
            } else {
                if (i === 0) logQGen(logContext, 'No valid geminiApiKey. Falling back to AI server default for all MCQ chunks.', 'warn');
                apiKeyForThisCall = null;
            }

            const chunkMcqContent = await aiServer.callGeminiTextAPI(apiKeyForThisCall, mcqPrompt);
            allMcqContent += (allMcqContent ? "\n\n---\n\n" : "") + chunkMcqContent; 
            logQGen(logContext, `MCQs generated for chunk ${i + 1}. Length: ${chunkMcqContent.length}`);
        }
        
        const tempMcqPath = path.join(TEMP_PROCESSING_DIR, 'TextMCQ.md');
        await fs.writeFile(tempMcqPath, allMcqContent);
        generatedFilesToUpload.push({ path: tempMcqPath, name: 'TextMCQ.md', type: 'generated_mcq_markdown' });
        logQGen(logContext, `Aggregated TextMCQ.md generated and saved to: ${tempMcqPath}. Total length: ${allMcqContent.length}`);

        // --- 4. Generate TextProblems.md (using the same chunks) ---
        logQGen(logContext, `Generating TextProblems.md using text chunks...`);
        let allProblemsContent = "";
        const exampleProblemsSyntax = await fs.readFile('example_TextProblems.md', 'utf-8');

        for (let i = 0; i < textChunks.length; i++) {
            const chunk = textChunks[i];
            logQGen(logContext, `Generating Problems for chunk ${i + 1} of ${textChunks.length}...`);

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
            let apiKeyForThisCall;
            if (validGeminiApiKeys.length > 0) {
                apiKeyForThisCall = validGeminiApiKeys[qGenApiKeyIndex % validGeminiApiKeys.length];
                qGenApiKeyIndex++;
                logQGen(logContext, `Using API key from input array (index ${(qGenApiKeyIndex - 1 + validGeminiApiKeys.length) % validGeminiApiKeys.length}) for Problems chunk ${i+1}.`);
            } else if (typeof geminiApiKey === 'string' && geminiApiKey.trim() !== '') {
                apiKeyForThisCall = geminiApiKey;
                if (i === 0) logQGen(logContext, 'Using single provided API key for all Problems chunks.');
            } else {
                if (i === 0) logQGen(logContext, 'No valid geminiApiKey. Falling back to AI server default for all Problems chunks.', 'warn');
                apiKeyForThisCall = null;
            }

            const chunkProblemsContent = await aiServer.callGeminiTextAPI(apiKeyForThisCall, problemsPrompt);
            allProblemsContent += (allProblemsContent ? "\n\n---\n\n" : "") + chunkProblemsContent; 
            logQGen(logContext, `Problems generated for chunk ${i + 1}. Length: ${chunkProblemsContent.length}`);
        }

        const tempProblemsPath = path.join(TEMP_PROCESSING_DIR, 'TextProblems.md');
        await fs.writeFile(tempProblemsPath, allProblemsContent);
        generatedFilesToUpload.push({ path: tempProblemsPath, name: 'TextProblems.md', type: 'generated_problems_markdown' });
        logQGen(logContext, `Aggregated TextProblems.md generated and saved to: ${tempProblemsPath}. Total length: ${allProblemsContent.length}`);
        
        // --- 5. Upload Markdown Files to Google Drive ---
        const courseDirName = `CourseDir_${courseId}`; // This might need to be course ID directly or a sanitized name
        logQGen(logContext, `Using course identifier for Google Drive upload: ${courseDirName}`);

        const lyceumRootFolderName = "LyceumCourses_GoogleDrive_Test"; // Updated name for GDrive
        const generatedQuestionsFolderName = "Generated_Questions"; 

        // Use initializedServerGoogleDrive for all Google Drive operations
        // Parent ID for root is 'root'
        let lyceumRootNode = await initializedServerGoogleDrive.findFolder(lyceumRootFolderName, 'root');
        if (!lyceumRootNode) lyceumRootNode = await initializedServerGoogleDrive.createFolder(lyceumRootFolderName, 'root');
        if (!lyceumRootNode || !lyceumRootNode.id) throw new Error(`Failed to find/create Lyceum root folder in Google Drive: ${lyceumRootFolderName}`);

        let courseDriveFolderNode = await initializedServerGoogleDrive.findFolder(courseDirName, lyceumRootNode.id);
        if (!courseDriveFolderNode) courseDriveFolderNode = await initializedServerGoogleDrive.createFolder(courseDirName, lyceumRootNode.id);
        if (!courseDriveFolderNode || !courseDriveFolderNode.id) throw new Error(`Failed to find/create course folder in Google Drive: ${courseDirName}`);
        
        let genQuestionsCourseNode = await initializedServerGoogleDrive.findFolder(generatedQuestionsFolderName, courseDriveFolderNode.id);
        if(!genQuestionsCourseNode) genQuestionsCourseNode = await initializedServerGoogleDrive.createFolder(generatedQuestionsFolderName, courseDriveFolderNode.id);
        if(!genQuestionsCourseNode || !genQuestionsCourseNode.id) throw new Error(`Failed to find/create Generated_Questions folder for course in Google Drive: ${generatedQuestionsFolderName}`);

        let chapterQuestionsNode = await initializedServerGoogleDrive.findFolder(chapterKey, genQuestionsCourseNode.id);
        if (!chapterQuestionsNode) chapterQuestionsNode = await initializedServerGoogleDrive.createFolder(chapterKey, genQuestionsCourseNode.id);
        if (!chapterQuestionsNode || !chapterQuestionsNode.id) throw new Error(`Failed to find/create chapter-specific questions folder in Google Drive: ${chapterKey}`);
        
        const uploadedFileDetails = {}; // Store ID and webViewLink

        for (const fileToUpload of generatedFilesToUpload) {
            logQGen(logContext, `Uploading ${fileToUpload.name} to Google Drive folder: ${chapterQuestionsNode.name} (ID: ${chapterQuestionsNode.id})`);
            // uploadFile for google_drive_service_server.js: uploadFile(localFilePath, remoteFileName, targetFolderId)
            const uploadedFile = await initializedServerGoogleDrive.uploadFile(fileToUpload.path, fileToUpload.name, chapterQuestionsNode.id);
            if (!uploadedFile || !uploadedFile.id) { // Check for ID for Google Drive
                throw new Error(`Failed to upload ${fileToUpload.name} to Google Drive or ID not returned.`);
            }
            uploadedFileDetails[fileToUpload.type] = { id: uploadedFile.id, link: uploadedFile.webViewLink };
            logQGen(logContext, `${fileToUpload.name} uploaded successfully to Google Drive: ID ${uploadedFile.id}, Link: ${uploadedFile.webViewLink}`);
        }

        // --- 6. Update Firestore ---
        logQGen(logContext, `Firestore update SKIPPED.`); // Keep this logic as Firestore is out of scope for this change
        const chapterResources = {}; 
        if (!chapterResources[chapterKey]) {
            logQGen(logContext, `Chapter key "${chapterKey}" not found in placeholder chapterResources. Initializing.`, 'warn');
            chapterResources[chapterKey] = { lectureUrls: [], otherResources: [] }; 
        }
        if (!chapterResources[chapterKey].otherResources) { 
            chapterResources[chapterKey].otherResources = []; 
        }
        chapterResources[chapterKey].otherResources = chapterResources[chapterKey].otherResources.filter(
            res => !(res.type === 'generated_mcq_markdown' || res.type === 'generated_problems_markdown')
        );
        if (uploadedFileDetails['generated_mcq_markdown']) {
            chapterResources[chapterKey].otherResources.push({
                title: `MCQs for ${chapterTitle}`,
                gdriveId: uploadedFileDetails['generated_mcq_markdown'].id, // Store GDrive ID
                gdriveLink: uploadedFileDetails['generated_mcq_markdown'].link, // Store GDrive webViewLink
                type: 'generated_mcq_markdown',
                generatedAt: new Date().toISOString()
            });
        }
        if (uploadedFileDetails['generated_problems_markdown']) {
            chapterResources[chapterKey].otherResources.push({
                title: `Problems for ${chapterTitle}`,
                gdriveId: uploadedFileDetails['generated_problems_markdown'].id, // Store GDrive ID
                gdriveLink: uploadedFileDetails['generated_problems_markdown'].link, // Store GDrive webViewLink
                type: 'generated_problems_markdown',
                generatedAt: new Date().toISOString()
            });
        }

        return {
            success: true,
            message: `MCQs and Problems generated and saved to Google Drive for chapter: ${chapterTitle} (Firestore update skipped).`,
            mcqGoogleDriveId: uploadedFileDetails['generated_mcq_markdown']?.id || null,
            mcqGoogleDriveLink: uploadedFileDetails['generated_mcq_markdown']?.link || null,
            problemsGoogleDriveId: uploadedFileDetails['generated_problems_markdown']?.id || null,
            problemsGoogleDriveLink: uploadedFileDetails['generated_problems_markdown']?.link || null,
        };

    } catch (error) {
        logQGen(logContext, error, 'error'); // Original logging
        let errorType = 'GENERAL_ERROR';
        let specificMessage = `PDF Question Generation with Google Drive failed: ${error.message}`;

        // Check for PDF parsing specific errors (adjust conditions as needed)
        if (error.name === 'InvalidPDFException' ||
            (error.message &&
             (error.message.includes('InvalidPDFExceptionClosure') ||
              error.message.toLowerCase().includes('pdfpars') || // Catches "pdfparsererror", "pdf parsing error"
              error.message.toLowerCase().includes('pdf extraction error')
             )
            )
           ) {
            errorType = 'PDF_PARSING_ERROR';
            specificMessage = `PDF parsing/extraction failed for chapter ${chapterTitle}: ${error.message}`;
            // Log the specific error detection
            logQGen(logContext, `Specific PDF Parsing Error detected for chapter ${chapterTitle}: ${error.message}`, 'error');
        }

        return {
            success: false,
            message: specificMessage,
            errorType: errorType, // Add this
            error: error.stack,
        };
    } finally {
        // --- 7. Cleanup ---
        if (fs.existsSync(TEMP_PROCESSING_DIR)) {
            try {
                await fs.remove(TEMP_PROCESSING_DIR);
                logQGen(logContext, `Temporary processing directory deleted: ${TEMP_PROCESSING_DIR}`);
            } catch (err) {
                logQGen(logContext, new Error(`Error deleting temporary processing directory ${TEMP_PROCESSING_DIR}: ${err.message}`), 'error');
            }
        }
    }
}

// Helper to sanitize Google Drive filenames (Google Drive is more permissive but good practice)
function sanitizeFilename(name) {
    if (!name) return 'untitled';
    // Google Drive allows most characters, but replacing / and \ is good for compatibility.
    // Other problematic OS chars like : * ? " < > | might also be worth replacing if files are locally synced.
    return name.replace(/[\\/]/g, '_').replace(/\s+/g, '_');
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
