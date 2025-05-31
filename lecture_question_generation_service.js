const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
// const { initialize: gDriveInit, findFolder: gDriveFindFolder, createFolder: gDriveCreateFolder, uploadFile: gDriveUploadFile } = require('./google_drive_service_server.js'); // Example for GDrive server service
const serverGoogleDrive = require('./google_drive_service_server.js'); // Using server-side Google Drive handler
const aiServer = require('./ai_integration_server.js');

const TEMP_PROCESSING_DIR_BASE = path.join(__dirname, 'temp_lecture_qgen');

function sanitizeForPath(name) {
    if (!name) return 'untitled';
    return name.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_').substring(0, 50);
}

function parseSrtContent(srtText) {
    if (!srtText) return '';
    const lines = srtText.split(/\r?\n/);
    let dialogue = '';
    for (const line of lines) {
        if (line.trim() === '' || /^\d+$/.test(line.trim()) || line.includes('-->')) {
            continue;
        }
        dialogue += line.trim() + ' ';
    }
    return dialogue.replace(/\s+/g, ' ').trim();
}

async function generateQuestionsFromLectures(
    courseId,
    selectedLectures, // Array of { title: "Lecture Title", gdriveSrtId?: "...", gdriveSrtLink?: "..." }
    chapterNameForLectures,
    // megaEmail, megaPassword removed
    // initializedServerGoogleDrive, // Expecting this service to use its own configured serverGoogleDrive instance
    geminiApiKey
) {
    const processingTimestamp = Date.now();
    let lectureQGenApiKeyIndex = 0;

    const sanitizedBaseChapterName = sanitizeForPath(chapterNameForLectures);
    const newChapterKey = `${sanitizedBaseChapterName}_${uuidv4().substring(0, 8)}`;
    
    const TEMP_PROCESSING_DIR = path.join(TEMP_PROCESSING_DIR_BASE, `${courseId}_${newChapterKey}_${processingTimestamp}`);
    console.log(`[LecQGenService] Starting Lecture Question Generation for course ${courseId}, new chapter key ${newChapterKey} ("${chapterNameForLectures}") using Google Drive. Temp dir: ${TEMP_PROCESSING_DIR}`);

    const downloadedSrtPaths = [];
    const generatedMarkdownFiles = [];

    try {
        await fs.ensureDir(TEMP_PROCESSING_DIR);

        // --- 1. Download SRT Files and Concatenate Text ---
        // Assuming serverGoogleDrive is pre-initialized (e.g., on server startup with env vars)
        // If not, serverGoogleDrive.initialize(API_KEY, SERVICE_ACCOUNT_PATH) would be called here.
        console.log(`[LecQGenService] Using pre-configured Google Drive service for SRT download.`);
        
        let allLecturesText = "";
        for (const lecture of selectedLectures) {
            const srtIdentifier = lecture.gdriveSrtId || lecture.gdriveSrtLink; // Prefer ID
            if (!srtIdentifier) {
                console.warn(`[LecQGenService] Skipping lecture "${lecture.title}" as it has no Google Drive ID or link.`);
                continue;
            }
            console.log(`[LecQGenService] Downloading SRT from Google Drive: ${srtIdentifier} for lecture "${lecture.title}"`);
            const srtFileName = sanitizeForPath(`${lecture.title}_${uuidv4().substring(0,4)}.srt`);
            // downloadFile from google_drive_service_server.js takes fileId, destinationPath, desiredFileName
            // If srtIdentifier is a link, serverGoogleDrive.downloadFile needs to handle parsing it or this needs adjustment.
            // For now, assuming it's primarily an ID.
            const tempSrtPath = await serverGoogleDrive.downloadFile(srtIdentifier, TEMP_PROCESSING_DIR, srtFileName);
            downloadedSrtPaths.push(tempSrtPath);
            console.log(`[LecQGenService] SRT for "${lecture.title}" downloaded to: ${tempSrtPath}`);

            const srtTextContent = await fs.readFile(tempSrtPath, 'utf-8');
            const dialogueOnly = parseSrtContent(srtTextContent);
            allLecturesText += `--- Lecture: ${lecture.title} ---\n${dialogueOnly}\n\n`;
        }

        if (!allLecturesText.trim()) {
            throw new Error("No dialogue text could be extracted from the selected SRT files.");
        }
        console.log(`[LecQGenService] All lecture SRTs processed. Total dialogue length: ${allLecturesText.length} characters.`);

        // --- 2. Generate LecturesMCQ.md ---
        console.log(`[LecQGenService] Generating LecturesMCQ.md for topic "${chapterNameForLectures}"...`);
        const exampleMcqSyntax = await fs.readFile('example_TextMCQ.md', 'utf-8');
        const mcqPrompt = `
You are an expert in creating educational materials. Based on the following combined lecture transcripts, please generate a comprehensive set of Multiple Choice Questions (MCQs).
The overall topic for these lectures is "${chapterNameForLectures}".
The MCQs should cover key concepts, definitions, examples, and any significant points mentioned in the lectures.
Follow this Markdown syntax strictly for each question:
--- Start of Example Syntax ---
${exampleMcqSyntax}
--- End of Example Syntax ---
Ensure relevant content derivation. Provide difficulty, explanations, keywords. Omit "Textbook Page Reference".
Combined lecture text:
--- Start of Combined Lecture Text ---
${allLecturesText}
--- End of Combined Lecture Text ---
Generate MCQs now.`;
        
        let apiKeyForMcq;
        let validGeminiApiKeys = [];
        if (Array.isArray(geminiApiKey) && geminiApiKey.length > 0) {
            validGeminiApiKeys = geminiApiKey.filter(k => typeof k === 'string' && k.trim() !== '');
            if (validGeminiApiKeys.length > 0) {
                apiKeyForMcq = validGeminiApiKeys[lectureQGenApiKeyIndex % validGeminiApiKeys.length];
                lectureQGenApiKeyIndex++;
            } else apiKeyForMcq = null;
        } else if (typeof geminiApiKey === 'string' && geminiApiKey.trim() !== '') apiKeyForMcq = geminiApiKey;
        else apiKeyForMcq = null;
        if (!apiKeyForMcq) console.warn('[LecQGenService] No valid Gemini API Key for MCQs. Using AI server default.');

        const mcqContent = await aiServer.callGeminiTextAPI(apiKeyForMcq, mcqPrompt);
        const tempMcqPath = path.join(TEMP_PROCESSING_DIR, 'LecturesMCQ.md');
        await fs.writeFile(tempMcqPath, mcqContent);
        generatedMarkdownFiles.push({ path: tempMcqPath, name: 'LecturesMCQ.md', type: 'generated_lecture_mcq_markdown' });
        console.log(`[LecQGenService] LecturesMCQ.md generated: ${tempMcqPath}`);

        // --- 3. Generate LecturesProblems.md ---
        console.log(`[LecQGenService] Generating LecturesProblems.md for topic "${chapterNameForLectures}"...`);
        const exampleProblemsSyntax = await fs.readFile('example_TextProblems.md', 'utf-8');
        const problemsPrompt = `
You are an expert problem set creator. Based on combined lecture transcripts on "${chapterNameForLectures}", generate diverse problems.
Follow this Markdown syntax strictly:
--- Start of Example Syntax ---
${exampleProblemsSyntax}
--- End of Example Syntax ---
Ensure relevance. Provide difficulty, solution approach, expected answer, keywords. Omit "Textbook Page Reference".
Combined lecture text:
--- Start of Combined Lecture Text ---
${allLecturesText}
--- End of Combined Lecture Text ---
Generate problems now.`;

        let apiKeyForProblems;
        if (validGeminiApiKeys.length > 0) {
            apiKeyForProblems = validGeminiApiKeys[lectureQGenApiKeyIndex % validGeminiApiKeys.length];
            lectureQGenApiKeyIndex++;
        } else if (typeof geminiApiKey === 'string' && geminiApiKey.trim() !== '') apiKeyForProblems = geminiApiKey;
        else apiKeyForProblems = null;
        if (!apiKeyForProblems) console.warn('[LecQGenService] No valid Gemini API Key for Problems. Using AI server default.');

        const problemsContent = await aiServer.callGeminiTextAPI(apiKeyForProblems, problemsPrompt);
        const tempProblemsPath = path.join(TEMP_PROCESSING_DIR, 'LecturesProblems.md');
        await fs.writeFile(tempProblemsPath, problemsContent);
        generatedMarkdownFiles.push({ path: tempProblemsPath, name: 'LecturesProblems.md', type: 'generated_lecture_problems_markdown' });
        console.log(`[LecQGenService] LecturesProblems.md generated: ${tempProblemsPath}`);
        
        // --- 4. Upload Markdown Files to Google Drive ---
        const courseDirName = `CourseDir_${courseId}`;
        console.log(`[LecQGenService] Using course identifier for Google Drive upload: ${courseDirName}`);

        const lyceumRootFolderName = "LyceumCourses_GoogleDrive_Test"; // Consistent with other services
        const generatedQuestionsFolderName = "Generated_Questions";
        
        let lyceumRootNode = await serverGoogleDrive.findFolder(lyceumRootFolderName, 'root');
        if (!lyceumRootNode) lyceumRootNode = await serverGoogleDrive.createFolder(lyceumRootFolderName, 'root');
        if (!lyceumRootNode || !lyceumRootNode.id) throw new Error(`Failed to find/create Lyceum root folder in Google Drive: ${lyceumRootFolderName}`);

        let courseDriveFolderNode = await serverGoogleDrive.findFolder(courseDirName, lyceumRootNode.id);
        if (!courseDriveFolderNode) courseDriveFolderNode = await serverGoogleDrive.createFolder(courseDirName, lyceumRootNode.id);
        if (!courseDriveFolderNode || !courseDriveFolderNode.id) throw new Error(`Failed to find/create course folder in Google Drive: ${courseDirName}`);
        
        let genQuestionsCourseNode = await serverGoogleDrive.findFolder(generatedQuestionsFolderName, courseDriveFolderNode.id);
        if(!genQuestionsCourseNode) genQuestionsCourseNode = await serverGoogleDrive.createFolder(generatedQuestionsFolderName, courseDriveFolderNode.id);
        if(!genQuestionsCourseNode || !genQuestionsCourseNode.id) throw new Error(`Failed to find/create Generated_Questions folder for course in Google Drive.`);

        let lectureTopicNode = await serverGoogleDrive.findFolder(newChapterKey, genQuestionsCourseNode.id);
        if (!lectureTopicNode) lectureTopicNode = await serverGoogleDrive.createFolder(newChapterKey, genQuestionsCourseNode.id);
        if (!lectureTopicNode || !lectureTopicNode.id) throw new Error(`Failed to find/create lecture topic folder in Google Drive: ${newChapterKey}`);
        
        const uploadedFileDetails = {};
        for (const fileToUpload of generatedMarkdownFiles) {
            console.log(`[LecQGenService] Uploading ${fileToUpload.name} to Google Drive folder: ${lectureTopicNode.name} (ID: ${lectureTopicNode.id})`);
            const uploadedFile = await serverGoogleDrive.uploadFile(fileToUpload.path, fileToUpload.name, lectureTopicNode.id);
            if (!uploadedFile || !uploadedFile.id) {
                throw new Error(`Failed to upload ${fileToUpload.name} to Google Drive or ID not returned.`);
            }
            uploadedFileDetails[fileToUpload.type] = { id: uploadedFile.id, link: uploadedFile.webViewLink };
            console.log(`[LecQGenService] ${fileToUpload.name} uploaded successfully to Google Drive: ID ${uploadedFile.id}, Link: ${uploadedFile.webViewLink}`);
        }

        // --- 5. Update Firestore (Placeholder) ---
        console.log(`[LecQGenService] Firestore update SKIPPED for course ${courseId}, new chapter key ${newChapterKey}.`);
        // Actual Firestore update logic would go here, using uploadedFileDetails

        return {
            success: true,
            message: `MCQs and Problems generated from lectures for topic "${chapterNameForLectures}" and saved to Google Drive (Firestore update skipped).`,
            newChapterKey: newChapterKey,
            mcqGoogleDriveId: uploadedFileDetails['generated_lecture_mcq_markdown']?.id || null,
            mcqGoogleDriveLink: uploadedFileDetails['generated_lecture_mcq_markdown']?.link || null,
            problemsGoogleDriveId: uploadedFileDetails['generated_lecture_problems_markdown']?.id || null,
            problemsGoogleDriveLink: uploadedFileDetails['generated_lecture_problems_markdown']?.link || null,
        };

    } catch (error) {
        console.error(`[LecQGenService] CRITICAL ERROR during Lecture Question Generation for course ${courseId}, topic "${chapterNameForLectures}":`, error);
        return {
            success: false,
            message: `Lecture Question Generation (Google Drive) failed: ${error.message}`,
            error: error.stack,
        };
    } finally {
        // --- 6. Cleanup ---
        if (fs.existsSync(TEMP_PROCESSING_DIR)) {
            try {
                await fs.remove(TEMP_PROCESSING_DIR);
                console.log(`[LecQGenService] Temporary processing directory deleted: ${TEMP_PROCESSING_DIR}`);
            } catch (err) {
                console.error(`[LecQGenService] Error deleting temporary processing directory ${TEMP_PROCESSING_DIR}:`, err);
            }
        }
    }
}

module.exports = {
    generateQuestionsFromLectures,
};

// Example Usage (commented out)
/*
async function testLectureQuestionGeneration() {
    const TEST_COURSE_ID = "TEST_COURSE_LECQGEN_001"; 
    const TEST_SELECTED_LECTURES = [
        { title: "Lecture 1 - Intro to Topic", gdriveSrtId: "GOOGLE_DRIVE_SRT_ID_1" },
        { title: "Lecture 2 - Deep Dive", gdriveSrtLink: "GOOGLE_DRIVE_SRT_LINK_2" } // Example with link
    ];
    const TEST_CHAPTER_NAME = "Combined Lecture Insights - Week 1";
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY_LECTURE_QGEN; // Use a specific env var or pass directly

    if (!GEMINI_API_KEY ||
        TEST_SELECTED_LECTURES.some(lec => (!lec.gdriveSrtId && !lec.gdriveSrtLink) ||
                                          (lec.gdriveSrtId && lec.gdriveSrtId.startsWith("GOOGLE_DRIVE_")) ||
                                          (lec.gdriveSrtLink && lec.gdriveSrtLink.startsWith("GOOGLE_DRIVE_"))
                                          )
        ) {
        console.error("Missing required environment variables or placeholder Google Drive SRT links/IDs for testing.");
        return;
    }
    
    // Mock serverGoogleDrive if not testing with live GDrive
    // serverGoogleDrive.initialize = async () => console.log("Mock GDrive Initialized");
    // serverGoogleDrive.downloadFile = async (id, dest, name) => { fs.writeFileSync(path.join(dest,name), "SRT MOCK CONTENT"); return path.join(dest,name); };
    // serverGoogleDrive.findFolder = async (name, parent) => ({id: `mock-folder-${name}-id`, name});
    // serverGoogleDrive.createFolder = async (name, parent) => ({id: `mock-folder-${name}-id`, name});
    // serverGoogleDrive.uploadFile = async (fpath, name, parent) => ({id: `mock-file-${name}-id`, name, webViewLink: `http://mock.link/${name}`});


    console.log("Starting test lecture question generation (Google Drive)...");
    const result = await generateQuestionsFromLectures(
        TEST_COURSE_ID,
        TEST_SELECTED_LECTURES,
        TEST_CHAPTER_NAME,
        // No email/password needed for GDrive server service
        GEMINI_API_KEY
    );
    console.log("Test lecture question generation result:", JSON.stringify(result, null, 2));
}

// testLectureQuestionGeneration().catch(console.error);
*/
