// course_automation_service.js
const fs = require('fs-extra');
const path = require('path');
const serverMega = require('./mega_service_server.js');
const aiServer = require('./ai_integration_server.js');
const { processTextbookPdf } = require('./pdf_processing_service.js');
const { transcribeLecture } = require('./lecture_transcription_service.js');
const { generateQuestionsFromPdf } = require('./pdf_question_generation_service.js');
const { generateQuestionsFromLectures } = require('./lecture_question_generation_service.js');
const { GEMINI_API_KEY } = require('./server_config.js'); // Example if a central key is used, though often passed in params

// Standardized Mega Folder Names
const TEXTBOOK_FULL_DIR_NAME = "Textbook_Full";
const TEXTBOOK_CHAPTERS_DIR_NAME = "Textbook_Chapters"; // Used by pdf_processing_service
const TRANSCRIPTIONS_ARCHIVE_DIR_NAME = "Transcriptions_Archive";
const GENERATED_ASSESSMENTS_DIR_NAME = "Generated_Assessments";

const LYCEUM_ROOT_FOLDER_NAME = "LyceumCourses_Test";

/**
 * Sanitizes a course title to be used as a directory name.
 * @param {string} title - The course title.
 * @returns {string} A sanitized string suitable for directory names.
 */
function sanitizeCourseTitleForDirName(title) {
    if (!title) return 'untitled_course';
    return title
        .toLowerCase()
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[^\w-]/g, '') // Remove non-alphanumeric characters except underscores and hyphens
        .substring(0, 75); // Truncate to a reasonable length
}

/**
 * Orchestrates the automated creation of a new course.
 * @param {object} params - Parameters for course creation.
 * @returns {Promise<object>} Result of the automation process.
 */
async function automateNewCourseCreation(params) {
    const {
        courseTitle,
        textbookPdfPath, // Local path to the PDF
        textbookPdfOriginalName, // Original name of the PDF
        trueFirstPageNumber,
        lectures, // Array of { title, filePath?, youtubeUrl?, megaLink?, srtMegaLink?, associatedChapterKey }
        majorTag,
        subjectTag,
        megaEmail,
        megaPassword,
        geminiApiKey, // Prefer passed-in key
        assemblyAiApiKey,
        prerequisites, // New
        bannerPicUrl,  // New
        coursePicUrl   // New
    } = params;

    const courseIdPlaceholder = sanitizeCourseTitleForDirName(courseTitle);
    
    // Helper function for logging
    const logProgress = (message, currentResults, level = 'info') => {
        const timestampedMessage = { timestamp: new Date().toISOString(), message };
        if (currentResults && currentResults.progressLogs) {
            currentResults.progressLogs.push(timestampedMessage);
        }
        
        const logPrefix = `[AutomationService][${courseIdPlaceholder}]`;
        if (level === 'warn') {
            console.warn(`${logPrefix} ${message}`);
        } else if (level === 'error') {
            console.error(`${logPrefix} ${message}`);
        } else {
            console.log(`${logPrefix} ${message}`);
        }
    };
    
    const results = {
        success: false,
        message: "",
        courseTitle: courseTitle,
        courseDirName: courseIdPlaceholder,
        aiGeneratedDescription: null,
        megaLinks: {
            originalTextbook: null,
            processedChapters: [], 
            transcriptions: [], 
            pdfQuestions: [], 
            lectureQuestions: [] 
        },
        firestoreDataPreview: {
            currentAutomationStep: "Initializing..." // Initial step
        },
        progressLogs: [] // Initialize progressLogs
    };

    logProgress(`Starting automated course creation for: "${courseTitle}"`, results);
    results.firestoreDataPreview.currentAutomationStep = "Validating API Keys...";

    // --- Gemini API Key Validation and Processing ---
    results.firestoreDataPreview.currentAutomationStep = "Validating API Keys"; // Set step
    let finalApiKeyForAIServer; // This will be passed to aiServer functions

    const originalGeminiApiKeyType = typeof geminiApiKey;
    const originalGeminiApiKeySnippet = typeof geminiApiKey === 'string' ? geminiApiKey.substring(0, 50) + '...' : JSON.stringify(geminiApiKey, null, 2);
    logProgress(`Received Gemini API Key for Course Automation. Original Type: ${originalGeminiApiKeyType}, Original Snippet: ${originalGeminiApiKeySnippet}`, results);

    if (Array.isArray(geminiApiKey)) {
        logProgress('Gemini API Key is an array. Using it directly.', results);
        finalApiKeyForAIServer = geminiApiKey.filter(k => typeof k === 'string' && k.trim() !== ''); // Filter out invalid entries
        if (finalApiKeyForAIServer.length === 0) {
            logProgress('WARN: Provided API key array is empty or contains no valid strings.', results, 'warn');
            finalApiKeyForAIServer = null; // Signal to use fallback
        }
    } else if (typeof geminiApiKey === 'string' && geminiApiKey.trim() !== '') {
        if (geminiApiKey.startsWith('[') && geminiApiKey.endsWith(']')) {
            try {
                const parsedArray = JSON.parse(geminiApiKey);
                if (Array.isArray(parsedArray)) {
                    logProgress('Gemini API key was a stringified array. Parsed.', results);
                    finalApiKeyForAIServer = parsedArray.filter(k => typeof k === 'string' && k.trim() !== '');
                    if (finalApiKeyForAIServer.length === 0) {
                        logProgress('WARN: Parsed API key array is empty or contains no valid strings.', results, 'warn');
                        finalApiKeyForAIServer = null;
                    }
                } else { // Parsed but not an array
                    logProgress('WARN: Stringified API key did not parse into an array. Treating as single key if non-empty.', results, 'warn');
                    finalApiKeyForAIServer = [geminiApiKey.trim()]; // Treat as single key in an array
                }
            } catch (e) {
                logProgress(`WARN: Failed to parse stringified array-like API key, treating as single key: ${e.message}`, results, 'warn');
                finalApiKeyForAIServer = [geminiApiKey.trim()]; // Treat as single key in an array
            }
        } else { // Simple string key
            logProgress('Gemini API Key is a single string.', results);
            finalApiKeyForAIServer = [geminiApiKey.trim()]; // Pass as an array with one key
        }
    } else if (typeof geminiApiKey === 'object' && geminiApiKey !== null) {
        logProgress('Gemini API key is an object. Attempting to extract key.', results);
        const commonKeys = ['key', 'apiKey', 'value'];
        let foundKey = null;
        for (const k of commonKeys) {
            if (typeof geminiApiKey[k] === 'string' && geminiApiKey[k].trim() !== '') {
                foundKey = geminiApiKey[k].trim();
                break;
            }
        }
        if (foundKey) {
            finalApiKeyForAIServer = [foundKey]; // Pass as an array with one key
        } else {
            logProgress('WARN: Could not extract a valid string key from API key object.', results, 'warn');
            finalApiKeyForAIServer = null;
        }
    } else {
        logProgress('Gemini API Key parameter is not a valid array, string, or object.', results, 'warn');
        finalApiKeyForAIServer = null;
    }

    if (!finalApiKeyForAIServer || finalApiKeyForAIServer.length === 0) {
        logProgress(`WARN: No valid Gemini API Key from input. Attempting to use global default GEMINI_API_KEY from server_config.js.`, results, 'warn');
        finalApiKeyForAIServer = GEMINI_API_KEY; 
        if (!finalApiKeyForAIServer || (Array.isArray(finalApiKeyForAIServer) && finalApiKeyForAIServer.length === 0)) {
             const errorMsg = `CRITICAL: No valid Gemini API Key could be resolved from input, and global default from server_config.js is also missing or empty. Aborting.`;
             logProgress(errorMsg, results, 'error');
             results.success = false;
             results.message = errorMsg;
             results.firestoreDataPreview.currentAutomationStep = `Failed: Gemini API Key missing`;
             return results; 
        }
        logProgress(`Using global default GEMINI_API_KEY from server_config.js. Type: ${typeof finalApiKeyForAIServer}`, results);
    }
    
    if (typeof finalApiKeyForAIServer === 'string') {
        finalApiKeyForAIServer = [finalApiKeyForAIServer];
        logProgress(`Wrapped string API key from server_config.js into an array.`, results);
    }
    
    logProgress(`Final API Key for AI Server (type: ${typeof finalApiKeyForAIServer}, isArray: ${Array.isArray(finalApiKeyForAIServer)}): ${JSON.stringify(finalApiKeyForAIServer).substring(0,100)}...`, results);

    try {
        results.firestoreDataPreview.currentAutomationStep = "Initializing Mega Service"; // Set step
        // --- 1. Initialization & Setup ---
        logProgress('Initializing Mega service...', results);
        await serverMega.initialize(megaEmail, megaPassword);
        const megaStorage = serverMega.getMegaStorage();
        if (!megaStorage || !megaStorage.root) throw new Error("Mega service initialization failed.");
        logProgress('Mega service initialized.', results);

        results.firestoreDataPreview.currentAutomationStep = "Creating Mega Folder Structure"; // Set step
        logProgress(`Creating base Mega folder structure for ${courseIdPlaceholder}...`, results);
        let lyceumRootNode = await serverMega.findFolder(LYCEUM_ROOT_FOLDER_NAME, megaStorage.root);
        if (!lyceumRootNode) {
            logProgress(`Lyceum root folder "${LYCEUM_ROOT_FOLDER_NAME}" not found, creating...`, results);
            lyceumRootNode = await serverMega.createFolder(LYCEUM_ROOT_FOLDER_NAME, megaStorage.root);
        }
        if (!lyceumRootNode) throw new Error(`Failed to find or create Lyceum root folder: ${LYCEUM_ROOT_FOLDER_NAME}`);
        logProgress(`Found/Created Lyceum root folder: ${LYCEUM_ROOT_FOLDER_NAME}`, results);

        let courseMegaNode = await serverMega.findFolder(courseIdPlaceholder, lyceumRootNode);
        if (!courseMegaNode) {
            logProgress(`Course folder "${courseIdPlaceholder}" not found, creating...`, results);
            courseMegaNode = await serverMega.createFolder(courseIdPlaceholder, lyceumRootNode);
        }
        if (!courseMegaNode) throw new Error(`Failed to create main course folder: ${courseIdPlaceholder}`);
        logProgress(`Main course folder on Mega: ${courseMegaNode.name}`, results);

        const textbookFullMegaFolder = await serverMega.createFolder(TEXTBOOK_FULL_DIR_NAME, courseMegaNode);
        logProgress(`Created Mega folder: ${TEXTBOOK_FULL_DIR_NAME}`, results);
        const transcriptionsArchiveMegaFolder = await serverMega.createFolder(TRANSCRIPTIONS_ARCHIVE_DIR_NAME, courseMegaNode);
        logProgress(`Created Mega folder: ${TRANSCRIPTIONS_ARCHIVE_DIR_NAME}`, results);
        const generatedAssessmentsMegaFolder = await serverMega.createFolder(GENERATED_ASSESSMENTS_DIR_NAME, courseMegaNode);
        logProgress(`Created Mega folder: ${GENERATED_ASSESSMENTS_DIR_NAME}`, results);
        logProgress('Base Mega folder structure created.', results);

        results.firestoreDataPreview.currentAutomationStep = "Processing Textbook"; // Set step
        // --- 2. Textbook Processing ---
        console.log(`[AutomationService] Uploading original textbook: ${textbookPdfOriginalName}`);
        if (!fs.existsSync(textbookPdfPath)) throw new Error(`Textbook PDF not found at local path: ${textbookPdfPath}`);
        const uploadedTextbook = await serverMega.uploadFile(textbookPdfPath, textbookPdfOriginalName, textbookFullMegaFolder);
        results.megaLinks.originalTextbook = uploadedTextbook.link;
        console.log(`[AutomationService] Original textbook uploaded to Mega: ${uploadedTextbook.link}`);

        console.log('[AutomationService] Processing textbook PDF for chapters...');
        // processTextbookPdf uses courseIdPlaceholder to create its own structures on Mega
        // and is expected to use the TEXTBOOK_CHAPTERS_DIR_NAME constant for the chapters folder.
        const textbookProcessingResult = await processTextbookPdf(
            textbookPdfPath,
            courseIdPlaceholder, // This will be used by processTextbookPdf to structure its output on Mega
            trueFirstPageNumber,
            megaEmail, // Pass credentials for processTextbookPdf internal Mega ops
            megaPassword,
            finalApiKeyForAIServer
        );
        if (!textbookProcessingResult.success) throw new Error(`Textbook PDF processing failed: ${textbookProcessingResult.message}`);
        results.megaLinks.processedChapters = textbookProcessingResult.processedChapterDetails.map(ch => ({
            title: ch.title, // Assuming 'title' is part of chapterFirestoreData structure
            pdfLink: ch.megaPdfLink, // Assuming 'megaPdfLink' is part of chapterFirestoreData
            key: `textbook_chapter_${ch.chapterNumber}` // Assuming 'chapterNumber' is part of chapterFirestoreData
        }));
        console.log(`[AutomationService] Textbook processing completed. ${results.megaLinks.processedChapters.length} chapters processed.`);
        const tocForAIDescription = results.megaLinks.processedChapters.map(ch => `Chapter ${ch.key.split('_')[2]}: ${ch.title}`).join('\n');
        
        // Initialize lecture related variables
        const lectureSrtLinksByChapterKey = {};
        const lectureTitlesForAIDescription = [];

        // --- 3. Lecture Processing ---
        if (lectures && lectures.length > 0) {
            console.log('[AutomationService] Processing lectures...');
            for (const lecture of lectures) {
                lectureTitlesForAIDescription.push(lecture.title);
                let srtMegaLink = lecture.srtMegaLink;
                const chapterKeyForLecture = lecture.associatedChapterKey || 'general_lectures';

                if (!srtMegaLink) {
                    if (!lecture.filePath && !lecture.youtubeUrl) {
                        console.warn(`[AutomationService] Lecture "${lecture.title}" has no SRT, filePath, or YouTube URL. Skipping transcription.`);
                        continue;
                    }
                    console.log(`[AutomationService] Transcribing lecture: "${lecture.title}" for chapter ${chapterKeyForLecture}`);
                    const transcriptionResult = await transcribeLecture(
                        lecture.youtubeUrl || null,
                        courseIdPlaceholder,
                        chapterKeyForLecture,
                        assemblyAiApiKey,
                        megaEmail,
                        megaPassword
                    );
                    if (!transcriptionResult.success) {
                        console.warn(`[AutomationService] Transcription failed for lecture "${lecture.title}": ${transcriptionResult.message}. Skipping this lecture.`);
                        continue;
                    }
                    srtMegaLink = transcriptionResult.srtMegaLink;
                }
                
                if (srtMegaLink) {
                    results.megaLinks.transcriptions.push({ title: lecture.title, srtLink: srtMegaLink, chapterKey: chapterKeyForLecture });
                    if (!lectureSrtLinksByChapterKey[chapterKeyForLecture]) {
                        lectureSrtLinksByChapterKey[chapterKeyForLecture] = [];
                    }
                    lectureSrtLinksByChapterKey[chapterKeyForLecture].push({ title: lecture.title, megaSrtLink: srtMegaLink });
                }
            }
            console.log(`[AutomationService] Lecture processing completed. ${results.megaLinks.transcriptions.length} transcriptions processed/linked.`);
        } else {
            console.log('[AutomationService] No lectures provided. Skipping lecture processing.');
        }


        // --- 4. AI Course Description ---
        console.log('[AutomationService] Generating AI course description...');
        let lectureSectionForPrompt = "";
        if (lectureTitlesForAIDescription.length > 0) {
            lectureSectionForPrompt = `
It also includes lectures on:
${lectureTitlesForAIDescription.join('\n')}`;
        }

        const descriptionPrompt = `
Generate a concise and engaging course description for a new course titled "${courseTitle}".
The course covers the following major topics (from textbook table of contents):
${tocForAIDescription}
${lectureSectionForPrompt}
The course falls under the major category of "${majorTag}" and the specific subject of "${subjectTag}".
Highlight the key learning outcomes and what students will gain from this course. Keep it under 150 words.
        `;
        results.aiGeneratedDescription = await aiServer.callGeminiTextAPI(finalApiKeyForAIServer, descriptionPrompt, null, "You are a course catalog editor creating compelling course descriptions.");
        console.log(`[AutomationService] AI course description generated: ${results.aiGeneratedDescription.substring(0, 100)}...`);


        // --- 5. Question Generation ---
        console.log('[AutomationService] Generating questions from PDF chapters...');
        for (const chapter of results.megaLinks.processedChapters) {
            console.log(`[AutomationService] Generating PDF questions for chapter: "${chapter.title}" (Key: ${chapter.key})`);
            // generateQuestionsFromPdf uses courseIdPlaceholder and chapterKey to structure its output on Mega.
            const pdfQuestionsResult = await generateQuestionsFromPdf(
                courseIdPlaceholder,
                chapter.key,
                chapter.pdfLink,
                chapter.title,
                megaEmail,
                megaPassword,
                finalApiKeyForAIServer
            );
            if (pdfQuestionsResult.success) {
                results.megaLinks.pdfQuestions.push({
                    chapterKey: chapter.key,
                    mcqLink: pdfQuestionsResult.mcqMegaLink,
                    problemsLink: pdfQuestionsResult.problemsMegaLink
                });
            } else {
                console.warn(`[AutomationService] Failed to generate PDF questions for chapter "${chapter.title}": ${pdfQuestionsResult.message}`);
            }
        }
        console.log(`[AutomationService] PDF question generation completed. ${results.megaLinks.pdfQuestions.length} sets generated.`);

        if (lectures && lectures.length > 0 && Object.keys(lectureSrtLinksByChapterKey).length > 0) {
            console.log('[AutomationService] Generating questions from lectures...');
            for (const chapterKey of Object.keys(lectureSrtLinksByChapterKey)) {
                const srtObjectsArray = lectureSrtLinksByChapterKey[chapterKey]; // Array of { title, megaSrtLink }
                // Ensure lectures array is available for finding the chapter name
                const chapterNameForLectures = lectures.find(l => l.associatedChapterKey === chapterKey)?.title || chapterKey.replace(/_/g, ' ');
                
                console.log(`[AutomationService] Generating lecture questions for chapter/topic: "${chapterNameForLectures}" (Key: ${chapterKey})`);
                const lectureQuestionsResult = await generateQuestionsFromLectures(
                    courseIdPlaceholder,
                    srtObjectsArray,
                    chapterNameForLectures,
                    megaEmail,
                    megaPassword,
                    finalApiKeyForAIServer
                );
                if (lectureQuestionsResult.success) {
                    results.megaLinks.lectureQuestions.push({
                        chapterKey: lectureQuestionsResult.newChapterKey,
                        mcqLink: lectureQuestionsResult.mcqMegaLink,
                        problemsLink: lectureQuestionsResult.problemsMegaLink
                    });
                } else {
                    console.warn(`[AutomationService] Failed to generate lecture questions for chapter key "${chapterKey}": ${lectureQuestionsResult.message}`);
                }
            }
            console.log(`[AutomationService] Lecture question generation completed. ${results.megaLinks.lectureQuestions.length} sets generated.`);
        } else {
            console.log('[AutomationService] No lectures processed or no SRT links found. Skipping lecture question generation.');
        }

        // --- 6. Result Aggregation & Firestore Data Preparation ---
        console.log('[AutomationService] Preparing Firestore data preview. This may involve final Mega link generations.');
        
        let mainFolderLink = 'N/A';
        if (courseMegaNode && typeof courseMegaNode.link === 'function') {
            let linkSuccess = false;
            let linkAttempts = 0;
            const MAX_LINK_ATTEMPTS = 3; // Specific retries for this operation
            const LINK_RETRY_DELAY_MS = 2500;

            while (!linkSuccess && linkAttempts < MAX_LINK_ATTEMPTS) {
                linkAttempts++;
                let currentAttemptError = null;
                try {
                    console.log(`[AutomationService] Attempt ${linkAttempts} (Primary - with key) to get link for main course folder (ID: ${courseMegaNode.id || 'N/A'})...`);
                    if (!courseMegaNode.key) {
                        console.warn(`[AutomationService] courseMegaNode.key is not available for folder ${courseMegaNode.name}. Cannot generate a link with an embedded key. Attempting link without key.`);
                        // Directly try the no-key version if node.key isn't there, as node.link({key: undefined}) might error.
                        mainFolderLink = await courseMegaNode.link(); // Get link without explicit key
                    } else {
                         mainFolderLink = await courseMegaNode.link({ key: courseMegaNode.key }); // Standard way for public link with key
                    }
                    linkSuccess = true;
                    console.log(`[AutomationService] Successfully obtained main course folder link (with key if available) on attempt ${linkAttempts}: ${mainFolderLink}`);
                } catch (e) {
                    currentAttemptError = e;
                    console.warn(`[AutomationService] Primary link attempt (with key) for main folder failed on attempt ${linkAttempts}: ${e.message}`);
                    
                    const eaccessError = (e.message && (e.message.includes('EACCESS') || e.message.includes('-11')));

                    if (eaccessError) {
                        console.log(`[AutomationService] EACCESS error detected. Attempting secondary link retrieval (without key) for main folder on attempt ${linkAttempts}...`);
                        try {
                            mainFolderLink = await courseMegaNode.link(); // Get link without explicit key (noKey: true is default for folders if key not specified)
                            linkSuccess = true;
                            console.log(`[AutomationService] Successfully obtained main course folder link (alternative - no key) on attempt ${linkAttempts} after EACCESS: ${mainFolderLink}`);
                        } catch (e2) {
                            console.warn(`[AutomationService] Secondary link attempt (without key) also failed for main folder on attempt ${linkAttempts}: ${e2.message}`);
                            currentAttemptError = e2; // Update error to the latest one
                        }
                    }
                    
                    if (!linkSuccess) {
                        if (linkAttempts >= MAX_LINK_ATTEMPTS) {
                            const finalErrorMessageBase = `Failed to get main course folder link after ${MAX_LINK_ATTEMPTS} attempts.`;
                            if (eaccessError) {
                                console.error(`[AutomationService] CRITICAL: ${finalErrorMessageBase} Last error involved EACCESS. This usually means the Mega account lacks permission to export folder links with keys, or the folder is in a restricted share. Please check your Mega account settings. The folder was created, but its direct link is unavailable.`);
                                mainFolderLink = `Error retrieving link (EACCESS: Check Mega account permissions. Last error: ${currentAttemptError.message.substring(0, 100)})`;
                            } else {
                                console.error(`[AutomationService] ${finalErrorMessageBase} Last error: ${currentAttemptError.message}.`);
                                mainFolderLink = `Error retrieving link (Last error: ${currentAttemptError.message.substring(0, 100)})`;
                            }
                        } else if (currentAttemptError.message && (currentAttemptError.message.includes('EAGAIN') || currentAttemptError.message.includes('ERATE') || currentAttemptError.message.includes('Socket timeout'))) { // Check for retryable errors
                            console.log(`[AutomationService] Retrying folder link retrieval (main folder) in ${LINK_RETRY_DELAY_MS * linkAttempts}ms due to retryable error: ${currentAttemptError.message}`);
                            await new Promise(resolve => setTimeout(resolve, LINK_RETRY_DELAY_MS * linkAttempts));
                        } else { // Non-retryable error (or not explicitly EACCESS for special message)
                            console.error(`[AutomationService] Non-retryable error getting main course folder link: ${currentAttemptError.message}. Setting link to error string.`);
                            mainFolderLink = `Error retrieving link (Non-retryable: ${currentAttemptError.message.substring(0, 100)})`;
                            break; // Break from retry loop for non-retryable errors
                        }
                    }
                }
            }
        } else if (courseMegaNode && courseMegaNode.link && typeof courseMegaNode.link !== 'function') { // If .link is a direct property
             mainFolderLink = courseMegaNode.link;
             console.log('[AutomationService] Main course folder link obtained from direct .link property (not a function).');
        } else {
            console.warn('[AutomationService] Main course folder node is missing, does not have a link method/property, or key is missing for keyed link. Link will be N/A.');
            mainFolderLink = 'N/A (Folder node invalid or key missing for link generation)';
        }

        results.firestoreDataPreview = {
            courseTitle: params.courseTitle,
            courseDirName: courseIdPlaceholder,
            aiGeneratedDescription: results.aiGeneratedDescription,
            majorTag: params.majorTag,
            subjectTag: params.subjectTag,
            megaMainFolderLink: mainFolderLink,
            megaTextbookFullPdfLink: results.megaLinks.originalTextbook,
            // These would be more complex objects in a real Firestore schema
            chapters: results.megaLinks.processedChapters.map(pc => ({
                key: pc.key,
                title: pc.title,
                pdfLink: pc.pdfLink,
                relatedTranscriptions: results.megaLinks.transcriptions.filter(t => t.chapterKey === pc.key),
                pdfMcqLink: results.megaLinks.pdfQuestions.find(pq => pq.chapterKey === pc.key)?.mcqLink,
                pdfProblemsLink: results.megaLinks.pdfQuestions.find(pq => pq.chapterKey === pc.key)?.problemsLink,
            })),
            // Lecture-specific question sets (might not map 1:1 to PDF chapters)
            lectureQuestionSets: results.megaLinks.lectureQuestions.map(lq => ({
                key: lq.chapterKey,
                mcqLink: lq.mcqLink,
                problemsLink: lq.problemsLink,
                // Add associated lecture titles if needed by finding them in results.megaLinks.transcriptions
            })),
            // Raw transcription links (could also be nested under chapterResources as in other services)
            transcriptionLinks: results.megaLinks.transcriptions,
            // Other fields like totalChapters, imageUrl, prerequisites, etc. would be added here
            // or by a subsequent admin step.
        prerequisites: typeof prerequisites === 'string' && prerequisites.trim() !== '' 
            ? prerequisites.split(',').map(p => p.trim()).filter(p => p) 
            : [], // Store as array, handle empty/null string
        bannerPicUrl: bannerPicUrl || null,
        coursePicUrl: coursePicUrl || null,
            status: "pending_review", // Initial status
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        console.log('[AutomationService] Firestore Data Preview:', JSON.stringify(results.firestoreDataPreview, null, 2));
        
        if (results.firestoreDataPreview && results.firestoreDataPreview.status) {
            console.log(`[AutomationService] Course data prepared with status: '${results.firestoreDataPreview.status}'. If the course is not immediately visible in the main user interface, please check if any manual approval, publishing step, or specific Firestore indexing/queries based on this status are required for it to appear for end-users.`);
        }

        results.success = true;
        results.message = "Course automation tasks completed successfully. Firestore data preview logged.";

    } catch (error) {
        console.error(`[AutomationService] CRITICAL ERROR during course automation for "${courseTitle}":`, error);
        results.success = false;
        results.message = `Course automation failed: ${error.message || error}`;
        // results.errorStack = error.stack; // Optionally include stack for debugging
    }

    return results;
}

module.exports = {
    automateNewCourseCreation,
    sanitizeCourseTitleForDirName
};
