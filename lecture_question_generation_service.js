const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
// const { initialize: megaInitialize, findFolder: megaFindFolder, createFolder: megaCreateFolder, uploadFile: megaUploadFile, megaStorage } = require('./mega_service.js');
const serverMega = require('./mega_service_server.js'); // MODIFIED for server-side
// const { getCourseDetails, updateCourseDefinition } = require('./firebase_firestore.js'); // MODIFIED: Firestore temporarily disabled
// const { generateTextContentResponse } = require('./ai_integration.js'); // Assuming this is the correct function for text-based prompts
const aiServer = require('./ai_integration_server.js'); // MODIFIED for server-side

const TEMP_PROCESSING_DIR_BASE = path.join(__dirname, 'temp_lecture_qgen');

// Helper function to sanitize filenames/chapter keys
function sanitizeForPath(name) {
    if (!name) return 'untitled';
    return name.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_').substring(0, 50); // Limit length
}

// Helper function to parse SRT content and extract only dialogue
function parseSrtContent(srtText) {
    if (!srtText) return '';
    const lines = srtText.split(/\r?\n/);
    let dialogue = '';
    let isTextLine = false;
    for (const line of lines) {
        if (line.trim() === '' || /^\d+$/.test(line.trim()) || line.includes('-->')) {
            isTextLine = false; // Reset when we hit sequence, timestamp, or empty line
            continue;
        }
        // If it's not a sequence number or timestamp line, it's dialogue
        dialogue += line.trim() + ' ';
    }
    return dialogue.replace(/\s+/g, ' ').trim(); // Normalize spaces
}


async function generateQuestionsFromLectures(
    courseId,
    selectedLectures, // Array of { title: "Lecture Title", megaSrtLink: "..." }
    chapterNameForLectures, // User-provided name for this new "chapter" or topic
    megaEmail,
    megaPassword,
    geminiApiKey // Expected to be an array of keys, or a single key string
) {
    const processingTimestamp = Date.now();
    let lectureQGenApiKeyIndex = 0; // Index for cycling through API keys

    // Sanitize chapterNameForLectures for use in paths/keys and add UUID for uniqueness
    const sanitizedBaseChapterName = sanitizeForPath(chapterNameForLectures);
    const newChapterKey = `${sanitizedBaseChapterName}_${uuidv4().substring(0, 8)}`;
    
    const TEMP_PROCESSING_DIR = path.join(TEMP_PROCESSING_DIR_BASE, `${courseId}_${newChapterKey}_${processingTimestamp}`);
    console.log(`[LecQGenService] Starting Lecture Question Generation for course ${courseId}, new chapter key ${newChapterKey} ("${chapterNameForLectures}"). Temp dir: ${TEMP_PROCESSING_DIR}`);

    const downloadedSrtPaths = [];
    const generatedMarkdownFiles = []; // To store paths for upload

    try {
        await fs.ensureDir(TEMP_PROCESSING_DIR);

        // --- 1. Download SRT Files and Concatenate Text ---
        console.log(`[LecQGenService] Initializing MEGA service for SRT download...`);
        // const mega = await megaInitialize(megaEmail, megaPassword); // OLD
        // if (!mega || !mega.root) throw new Error('MEGA initialization failed or root directory not accessible.'); // OLD
        await serverMega.initialize(megaEmail, megaPassword); // NEW
        const megaStorage = serverMega.getMegaStorage(); // NEW
        if (!megaStorage || !megaStorage.root) throw new Error('MEGA service initialization failed or root directory not accessible.'); // NEW
        
        let allLecturesText = "";
        for (const lecture of selectedLectures) {
            console.log(`[LecQGenService] Downloading SRT from MEGA link: ${lecture.megaSrtLink} for lecture "${lecture.title}"`);
            // const file = megaStorage.File.fromURL(lecture.megaSrtLink); // OLD - megaStorage is from old import
            // const srtFileName = sanitizeForPath(file.name || `${lecture.title}_${uuidv4().substring(0,4)}.srt`); // OLD
            // const tempSrtPath = path.join(TEMP_PROCESSING_DIR, srtFileName); // OLD
            // const srtDataBuffer = await file.downloadBuffer(); // OLD
            // await fs.writeFile(tempSrtPath, srtDataBuffer); // OLD
            // downloadedSrtPaths.push(tempSrtPath); // OLD
            const srtFileName = sanitizeForPath(`${lecture.title}_${uuidv4().substring(0,4)}.srt`); // NEW
            const tempSrtPath = await serverMega.downloadFile(lecture.megaSrtLink, TEMP_PROCESSING_DIR, srtFileName); // NEW
            downloadedSrtPaths.push(tempSrtPath); // NEW
            console.log(`[LecQGenService] SRT for "${lecture.title}" downloaded to: ${tempSrtPath}`);

            // const srtTextContent = srtDataBuffer.toString('utf-8'); // OLD - srtDataBuffer not available directly
            const srtTextContent = await fs.readFile(tempSrtPath, 'utf-8'); // NEW - read the downloaded file
            const dialogueOnly = parseSrtContent(srtTextContent);
            allLecturesText += `--- Lecture: ${lecture.title} ---\n${dialogueOnly}\n\n`;
        }

        if (!allLecturesText.trim()) {
            throw new Error("No dialogue text could be extracted from the selected SRT files.");
        }
        console.log(`[LecQGenService] All lecture SRTs processed. Total dialogue length: ${allLecturesText.length} characters.`);

        // --- 2. Generate LecturesMCQ.md ---
        console.log(`[LecQGenService] Generating LecturesMCQ.md for topic "${chapterNameForLectures}"...`);
        const exampleMcqSyntax = await fs.readFile('example_TextMCQ.md', 'utf-8'); // Using existing example
        const mcqPrompt = `
You are an expert in creating educational materials. Based on the following combined lecture transcripts, please generate a comprehensive set of Multiple Choice Questions (MCQs).
The overall topic for these lectures is "${chapterNameForLectures}".
The MCQs should cover key concepts, definitions, examples, and any significant points mentioned in the lectures.
Follow this Markdown syntax strictly for each question:
--- Start of Example Syntax ---
${exampleMcqSyntax}
--- End of Example Syntax ---

Ensure you replace placeholder content like "[Chapter Title]", "[Concept A]", etc., with actual relevant content derived from the provided lecture text.
The original lecture titles are included in the text to provide context.
Provide a variety of difficulty levels (Easy, Medium, Hard).
Include explanations for why the correct answer is correct.
List relevant keywords for each question.
Omit "Textbook Page Reference" unless you can clearly infer a source.

Here is the combined text from the lecture transcripts:
--- Start of Combined Lecture Text ---
${allLecturesText}
--- End of Combined Lecture Text ---

Generate the MCQs now.
`;
        
        let apiKeyForMcq;
        let validGeminiApiKeys = [];
        if (Array.isArray(geminiApiKey) && geminiApiKey.length > 0) {
            validGeminiApiKeys = geminiApiKey.filter(k => typeof k === 'string' && k.trim() !== '');
            if (validGeminiApiKeys.length > 0) {
                apiKeyForMcq = validGeminiApiKeys[lectureQGenApiKeyIndex % validGeminiApiKeys.length];
                lectureQGenApiKeyIndex++;
                console.log(`[LecQGenService] Using API key from input array (index ${(lectureQGenApiKeyIndex - 1 + validGeminiApiKeys.length) % validGeminiApiKeys.length}) for MCQ generation.`);
            } else {
                console.warn('[LecQGenService] geminiApiKey array provided but no valid keys found. Falling back to AI server default for MCQ generation.');
                apiKeyForMcq = null;
            }
        } else if (typeof geminiApiKey === 'string' && geminiApiKey.trim() !== '') {
            apiKeyForMcq = geminiApiKey;
            console.log('[LecQGenService] Using single provided API key for MCQ generation.');
        } else {
            console.warn('[LecQGenService] No valid geminiApiKey (array or string) provided. Falling back to AI server default keys for MCQ generation.');
            apiKeyForMcq = null;
        }

        const mcqContent = await aiServer.callGeminiTextAPI(apiKeyForMcq, mcqPrompt);
        const tempMcqPath = path.join(TEMP_PROCESSING_DIR, 'LecturesMCQ.md');
        await fs.writeFile(tempMcqPath, mcqContent);
        generatedMarkdownFiles.push({ path: tempMcqPath, name: 'LecturesMCQ.md', type: 'generated_lecture_mcq_markdown' });
        console.log(`[LecQGenService] LecturesMCQ.md generated and saved to: ${tempMcqPath}`);

        // --- 3. Generate LecturesProblems.md ---
        console.log(`[LecQGenService] Generating LecturesProblems.md for topic "${chapterNameForLectures}"...`);
        const exampleProblemsSyntax = await fs.readFile('example_TextProblems.md', 'utf-8'); // Using existing example
        const problemsPrompt = `
You are an expert in creating educational problem sets. Based on the following combined lecture transcripts, please generate a diverse set of problems.
The overall topic for these lectures is "${chapterNameForLectures}".
The problems should encourage application of concepts discussed, critical thinking, and explanations based on the lecture content.
Follow this Markdown syntax strictly for each problem:
--- Start of Example Syntax ---
${exampleProblemsSyntax}
--- End of Example Syntax ---

Ensure you replace placeholder content like "[Chapter Title]", "[Initial Condition A]", etc., with actual relevant content derived from the provided lecture text.
The original lecture titles are included in the text to provide context.
Provide a variety of difficulty levels (Easy, Medium, Hard).
Include a "Solution Approach" for each problem, outlining the steps or concepts required.
Provide an "Expected Answer" where applicable.
List relevant keywords for each problem.
Omit "Textbook Page Reference" unless clearly inferable.

Here is the combined text from the lecture transcripts:
--- Start of Combined Lecture Text ---
${allLecturesText}
--- End of Combined Lecture Text ---

Generate the problems now.
`;

        let apiKeyForProblems;
        // Re-evaluate valid keys from geminiApiKey array in case it was modified or for clarity,
        // though lectureQGenApiKeyIndex will continue from its previous state.
        // validGeminiApiKeys was defined above.
        if (validGeminiApiKeys.length > 0) { // Check if we had valid keys from the array
            apiKeyForProblems = validGeminiApiKeys[lectureQGenApiKeyIndex % validGeminiApiKeys.length];
            lectureQGenApiKeyIndex++;
            console.log(`[LecQGenService] Using API key from input array (index ${(lectureQGenApiKeyIndex - 1 + validGeminiApiKeys.length) % validGeminiApiKeys.length}) for Problems generation.`);
        } else if (typeof geminiApiKey === 'string' && geminiApiKey.trim() !== '') {
            // If it was a single string key, it would have been used for MCQs. 
            // For sequential calls, if there's only one key, it gets reused.
            apiKeyForProblems = geminiApiKey;
            console.log('[LecQGenService] Using single provided API key (re-used) for Problems generation.');
        } else {
            console.warn('[LecQGenService] No valid geminiApiKey (array or string) provided. Falling back to AI server default keys for Problems generation.');
            apiKeyForProblems = null;
        }
        
        const problemsContent = await aiServer.callGeminiTextAPI(apiKeyForProblems, problemsPrompt);
        const tempProblemsPath = path.join(TEMP_PROCESSING_DIR, 'LecturesProblems.md');
        await fs.writeFile(tempProblemsPath, problemsContent);
        generatedMarkdownFiles.push({ path: tempProblemsPath, name: 'LecturesProblems.md', type: 'generated_lecture_problems_markdown' });
        console.log(`[LecQGenService] LecturesProblems.md generated and saved to: ${tempProblemsPath}`);
        
        // --- 4. Upload Markdown Files to MEGA ---
        // console.log(`[LecQGenService] Fetching course details for MEGA upload path...`); // Firestore disabled
        // const courseDetails = await getCourseDetails(courseId); // Firestore disabled
        // if (!courseDetails) throw new Error(`Course details not found for ID: ${courseId} during MEGA upload phase.`); // Firestore disabled
        // const courseDirName = courseDetails.courseDirName; // Firestore disabled
        const courseDirName = `CourseDir_${courseId}`; // Placeholder after commenting out Firestore
        // if (!courseDirName) throw new Error(`courseDirName not found for Course ID: ${courseId}. Cannot determine MEGA path.`); // Firestore disabled
        console.log(`[LecQGenService] Using placeholder courseDirName for MEGA upload: ${courseDirName}`);

        const lyceumRootFolderName = "LyceumCourses_Test";
        const generatedQuestionsFolderName = "Generated_Questions";
        
        let lyceumRootNode = await serverMega.findFolder(lyceumRootFolderName, megaStorage.root); // MODIFIED
        if (!lyceumRootNode) lyceumRootNode = await serverMega.createFolder(lyceumRootFolderName, megaStorage.root); // MODIFIED
        if (!lyceumRootNode) throw new Error(`Failed to find/create Lyceum root folder: ${lyceumRootFolderName}`);

        let courseMegaFolderNode = await serverMega.findFolder(courseDirName, lyceumRootNode); // MODIFIED
        if (!courseMegaFolderNode) courseMegaFolderNode = await serverMega.createFolder(courseDirName, lyceumRootNode); // MODIFIED
        if (!courseMegaFolderNode) throw new Error(`Failed to find/create course folder: ${courseDirName}`);
        
        let genQuestionsCourseNode = await serverMega.findFolder(generatedQuestionsFolderName, courseMegaFolderNode); // MODIFIED
        if(!genQuestionsCourseNode) genQuestionsCourseNode = await serverMega.createFolder(generatedQuestionsFolderName, courseMegaFolderNode); // MODIFIED
        if(!genQuestionsCourseNode) throw new Error(`Failed to find/create Generated_Questions folder for course: ${generatedQuestionsFolderName}`);

        let lectureTopicNode = await serverMega.findFolder(newChapterKey, genQuestionsCourseNode); // MODIFIED
        if (!lectureTopicNode) lectureTopicNode = await serverMega.createFolder(newChapterKey, genQuestionsCourseNode); // MODIFIED
        if (!lectureTopicNode) throw new Error(`Failed to find/create lecture topic folder on MEGA: ${newChapterKey}`);
        
        const uploadedFileLinks = {};
        for (const fileToUpload of generatedMarkdownFiles) {
            console.log(`[LecQGenService] Uploading ${fileToUpload.name} to MEGA folder: ${lectureTopicNode.name}`);
            const uploadedFile = await serverMega.uploadFile(fileToUpload.path, fileToUpload.name, lectureTopicNode); // MODIFIED
            if (!uploadedFile || !uploadedFile.link) {
                throw new Error(`Failed to upload ${fileToUpload.name} to MEGA or link not returned.`);
            }
            uploadedFileLinks[fileToUpload.type] = uploadedFile.link;
            console.log(`[LecQGenService] ${fileToUpload.name} uploaded successfully: ${uploadedFile.link}`);
        }

        // --- 5. Update Firestore ---
        console.log(`[LecQGenService] Firestore update SKIPPED for course ${courseId}, new chapter key ${newChapterKey}.`);
        // const existingCourseDataForUpdate = await getCourseDetails(courseId); // Firestore disabled
        // if (!existingCourseDataForUpdate) throw new Error(`Failed to re-fetch course data for ${courseId} before Firestore update.`); // Firestore disabled

        // const chapterResources = existingCourseDataForUpdate.chapterResources || {}; // Firestore disabled
        const chapterResources = {}; // Placeholder since Firestore is disabled
        
        // Ensure the new chapter key doesn't accidentally overwrite an existing one (unlikely with UUID)
        if (chapterResources[newChapterKey]) { // This will check the placeholder
            console.warn(`[LecQGenService] Chapter key "${newChapterKey}" surprisingly already exists in placeholder. Data will be merged/overwritten.`);
        }
        
        chapterResources[newChapterKey] = {
            title: chapterNameForLectures,
            contentType: 'lecture_derived', // Specific type for these generated chapters
            sourceLectures: selectedLectures.map(lec => ({ title: lec.title, megaSrtLink: lec.megaSrtLink })),
            lectureUrls: [], // This new "chapter" doesn't have direct lecture videos, but is derived from them
            otherResources: [],
            createdAt: new Date().toISOString()
        };
        
        if (uploadedFileLinks['generated_lecture_mcq_markdown']) {
            chapterResources[newChapterKey].otherResources.push({
                title: `MCQs for ${chapterNameForLectures}`,
                url: uploadedFileLinks['generated_lecture_mcq_markdown'],
                type: 'generated_lecture_mcq_markdown',
                generatedAt: new Date().toISOString()
            });
        }
        if (uploadedFileLinks['generated_lecture_problems_markdown']) {
            chapterResources[newChapterKey].otherResources.push({
                title: `Problems for ${chapterNameForLectures}`,
                url: uploadedFileLinks['generated_lecture_problems_markdown'],
                type: 'generated_lecture_problems_markdown',
                generatedAt: new Date().toISOString()
            });
        }

        // await updateCourseDefinition(courseId, { chapterResources }); // Firestore disabled
        // console.log(`[LecQGenService] Firestore updated successfully for course ${courseId}, new chapter ${newChapterKey}.`); // Firestore disabled

        return {
            success: true,
            message: `MCQs and Problems generated from lectures for topic "${chapterNameForLectures}" and saved (Firestore update skipped).`,
            newChapterKey: newChapterKey,
            mcqMegaLink: uploadedFileLinks['generated_lecture_mcq_markdown'] || null,
            problemsMegaLink: uploadedFileLinks['generated_lecture_problems_markdown'] || null,
        };

    } catch (error) {
        console.error(`[LecQGenService] CRITICAL ERROR during Lecture Question Generation for course ${courseId}, topic "${chapterNameForLectures}":`, error);
        return {
            success: false,
            message: `Lecture Question Generation failed: ${error.message}`,
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

// Example Usage (for testing - comment out or remove in production/import scenarios)
/*
async function testLectureQuestionGeneration() {
    const TEST_COURSE_ID = "TEST_COURSE_LECQGEN_001"; 
    const TEST_SELECTED_LECTURES = [
        { title: "Lecture 1 - Intro to Topic", megaSrtLink: "MEGA_LINK_TO_LECTURE1_SRT" },
        { title: "Lecture 2 - Deep Dive", megaSrtLink: "MEGA_LINK_TO_LECTURE2_SRT" }
    ];
    const TEST_CHAPTER_NAME = "Combined Lecture Insights - Week 1";
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
    const MEGA_EMAIL = process.env.MEGA_EMAIL;
    const MEGA_PASSWORD = process.env.MEGA_PASSWORD;

    if (!GEMINI_API_KEY || !MEGA_EMAIL || !MEGA_PASSWORD || 
        TEST_SELECTED_LECTURES.some(lec => lec.megaSrtLink.startsWith("MEGA_LINK_TO_"))) {
        console.error("Missing required environment variables or placeholder MEGA SRT links for testing.");
        return;
    }
    
    // Mock firebase_firestore and ai_integration for local testing if needed
    // global.getCourseDetails = async (courseId) => ({ 
    //     courseDirName: `CourseDir_${courseId}`, 
    //     chapterResources: {} 
    // });
    // global.updateCourseDefinition = async (courseId, updates) => { console.log("Mock updateCourseDefinition called:", courseId, updates); return true; };
    // global.generateTextContentResponse = async (parts, apiKey) => { 
    //     console.log("Mock generateTextContentResponse called.");
    //     if (parts[0].text.includes("Multiple Choice Questions")) return "## Mock Lecture MCQs\n1. Question from lecture?\n * (A) OptA\n * (B) OptB\n * **Answer:** (A)";
    //     if (parts[0].text.includes("problem sets")) return "## Mock Lecture Problems\n1. Solve this problem based on lecture.";
    //     return "Mock AI response for lectures.";
    // };

    console.log("Starting test lecture question generation...");
    const result = await generateQuestionsFromLectures(
        TEST_COURSE_ID,
        TEST_SELECTED_LECTURES,
        TEST_CHAPTER_NAME,
        MEGA_EMAIL,
        MEGA_PASSWORD,
        GEMINI_API_KEY
    );
    console.log("Test lecture question generation result:", JSON.stringify(result, null, 2));
}

// testLectureQuestionGeneration().catch(console.error);
*/
