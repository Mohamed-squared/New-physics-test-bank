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

let courseServiceApiKeyIndex = 0; // Module-level index for cycling through API keys for direct calls

/**
 * Executes tasks in parallel batches, assigning a unique API key to each task.
 * @param {Array<any>} items - Array of items to process (e.g., chapters).
 * @param {Function} taskFunction - Async function to execute for each item. 
 *                                  It will receive (item, apiKeyForTask, courseIdPlaceholder, megaEmail, megaPassword).
 * @param {Array<string>} apiKeys - Array of available API keys.
 * @param {string} courseIdPlaceholder - The course ID.
 * @param {string} megaEmail - Mega email.
 * @param {string} megaPassword - Mega password.
 * @param {Function} logProgress - Logging function.
 * @param {object} resultsRef - Reference to the main results object for logging.
 * @param {object} initializedServerMega - The initialized serverMega instance.
 * @returns {Promise<Array<object>>} - Array of results from all settled promises.
 */
async function runTasksInParallel(items, taskFunction, apiKeys, courseIdPlaceholder, megaEmail, megaPassword, logProgress, resultsRef, initializedServerMega) {
    if (!apiKeys || apiKeys.length === 0) {
        logProgress('CRITICAL: No API keys available for parallel processing.', resultsRef, 'error');
        throw new Error('No API keys available for parallel tasks.');
    }
    const numWorkers = Math.min(items.length, apiKeys.length); // Max workers = num keys or num items
    const results = [];
    let itemIndex = 0;

    logProgress(`Starting parallel processing for ${items.length} items with up to ${numWorkers} concurrent workers.`, resultsRef);

    // Create a pool of workers
    const workers = [];
    for (let i = 0; i < numWorkers; i++) {
        workers.push((async () => {
            let assignedItemIndex;
            while ((assignedItemIndex = itemIndex++) < items.length) {
                const item = items[assignedItemIndex];
                const apiKeyForTask = apiKeys[i % apiKeys.length]; // Assign key (round-robin if more items than keys, but numWorkers is capped by apiKeys.length)
                                                               // With numWorkers = min(items, keys), i will be < apiKeys.length here.
                
                logProgress(`Worker ${i}: Processing item ${assignedItemIndex + 1}/${items.length} ('${item.title || item.key || 'N/A'}') with API key index ${i % apiKeys.length}.`, resultsRef);
                try {
                    // Pass initializedServerMega to the task function
                    const result = await taskFunction(item, apiKeyForTask, courseIdPlaceholder, megaEmail, megaPassword, initializedServerMega);
                    results.push({ status: 'fulfilled', value: result, item });
                    logProgress(`Worker ${i}: Successfully processed item ${assignedItemIndex + 1}/${items.length} ('${item.title || item.key || 'N/A'}').`, resultsRef);
                } catch (error) {
                    results.push({ status: 'rejected', reason: error, item });
                    logProgress(`Worker ${i}: ERROR processing item ${assignedItemIndex + 1}/${items.length} ('${item.title || item.key || 'N/A'}'): ${error.message}`, resultsRef, 'error');
                }
            }
        })());
    }

    await Promise.allSettled(workers); // Wait for all items to be processed by the worker pool
    logProgress(`Finished all parallel tasks. Total results: ${results.length}`, resultsRef);
    return results; // Array of {status, value/reason, item}
}

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
    const logProgress = (messageOrError, currentResults, level = 'info') => {
        let logMessage;
        let fullErrorStack = null;

        if (messageOrError instanceof Error) {
            logMessage = messageOrError.message;
            if (level === 'error') { // Capture stack for errors
                fullErrorStack = messageOrError.stack;
            }
        } else {
            logMessage = messageOrError;
        }

        const timestampedLogEntry = { 
            timestamp: new Date().toISOString(), 
            message: logMessage 
        };
        if (fullErrorStack) {
            timestampedLogEntry.stack = fullErrorStack; // Add stack to the log entry if available
        }

        if (currentResults && currentResults.progressLogs) {
            currentResults.progressLogs.push(timestampedLogEntry);
        }
        
        const logPrefix = `[AutomationService][${courseIdPlaceholder}]`;
        const consoleMessage = fullErrorStack ? `${logPrefix} ${logMessage}\nStack: ${fullErrorStack}` : `${logPrefix} ${logMessage}`;

        if (level === 'warn') {
            console.warn(consoleMessage);
        } else if (level === 'error') {
            console.error(consoleMessage);
        } else {
            console.log(consoleMessage);
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
        // const megaStorage = serverMega.getMegaStorage(); // We'll pass serverMega itself
        // if (!megaStorage || !megaStorage.root) throw new Error("Mega service initialization failed."); // Check is done by initialize()
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
        logProgress(`Uploading original textbook: ${textbookPdfOriginalName}`, results);
        if (!fs.existsSync(textbookPdfPath)) throw new Error(`Textbook PDF not found at local path: ${textbookPdfPath}`);
        const uploadedTextbook = await serverMega.uploadFile(textbookPdfPath, textbookPdfOriginalName, textbookFullMegaFolder);
        results.megaLinks.originalTextbook = uploadedTextbook.link;
        logProgress(`Original textbook uploaded to Mega: ${uploadedTextbook.link}`, results);

        logProgress('Processing textbook PDF for chapters...', results);
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
        logProgress(`Textbook processing completed. ${results.megaLinks.processedChapters.length} chapters processed.`, results);
        const tocForAIDescription = results.megaLinks.processedChapters.map(ch => `Chapter ${ch.key.split('_')[2]}: ${ch.title}`).join('\n');
        
        // Initialize lecture related variables
        const lectureSrtLinksByChapterKey = {};
        const lectureTitlesForAIDescription = [];

        // --- 3. Lecture Processing ---
        if (lectures && lectures.length > 0) {
            logProgress('Processing lectures...', results);
            for (const lecture of lectures) {
                lectureTitlesForAIDescription.push(lecture.title);
                let srtMegaLink = lecture.srtMegaLink;
                const chapterKeyForLecture = lecture.associatedChapterKey || 'general_lectures';

                if (!srtMegaLink) {
                    if (!lecture.filePath && !lecture.youtubeUrl) {
                        logProgress(`Lecture "${lecture.title}" has no SRT, filePath, or YouTube URL. Skipping transcription.`, results, 'warn');
                        continue;
                    }
                    logProgress(`Transcribing lecture: "${lecture.title}" for chapter ${chapterKeyForLecture}`, results);
                    const transcriptionResult = await transcribeLecture(
                        lecture.youtubeUrl || null,
                        courseIdPlaceholder,
                        chapterKeyForLecture,
                        assemblyAiApiKey,
                        megaEmail,
                        megaPassword
                    );
                    if (!transcriptionResult.success) {
                        logProgress(`Transcription failed for lecture "${lecture.title}": ${transcriptionResult.message}. Skipping this lecture.`, results, 'warn');
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
            logProgress(`Lecture processing completed. ${results.megaLinks.transcriptions.length} transcriptions processed/linked.`, results);
        } else {
            logProgress('No lectures provided. Skipping lecture processing.', results);
        }


        // --- 4. AI Course Description ---
        logProgress('Generating AI course description...', results);
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
        
        let apiKeyForDescription;
        if (finalApiKeyForAIServer && finalApiKeyForAIServer.length > 0) {
            apiKeyForDescription = finalApiKeyForAIServer[courseServiceApiKeyIndex % finalApiKeyForAIServer.length];
            courseServiceApiKeyIndex++;
            logProgress(`Selected API key at index ${(courseServiceApiKeyIndex - 1 + finalApiKeyForAIServer.length) % finalApiKeyForAIServer.length} for AI description generation.`, results);
        } else {
            // This case should ideally be caught by earlier checks, but as a safeguard:
            logProgress('CRITICAL: No valid API keys available in finalApiKeyForAIServer for AI description. Attempting call without a specific key (will use aiServer default).', results, 'error');
            // aiServer.callGeminiTextAPI will use its own default if null/undefined is passed.
            apiKeyForDescription = null; 
        }

        results.aiGeneratedDescription = await aiServer.callGeminiTextAPI(apiKeyForDescription, descriptionPrompt, null, "You are a course catalog editor creating compelling course descriptions.");
        logProgress(`AI course description generated: ${results.aiGeneratedDescription.substring(0, 100)}...`, results);


        // --- 5. Question Generation ---
        // Define the task function for PDF question generation
        const generatePdfQuestionsForChapterTask = async (chapter, apiKey, courseId, email, password, initializedServerMegaInstance) => {
            logProgress(`[TaskRunner] Generating PDF questions for chapter: "${chapter.title}" (Key: ${chapter.key}) using assigned API key index...`, results); // Log with results ref
            return generateQuestionsFromPdf(
                courseId,
                chapter.key,
                chapter.pdfLink,
                chapter.title,
                email,
                password,
                initializedServerMegaInstance, // Pass the initialized serverMega instance
                apiKey
            );
        };

        results.firestoreDataPreview.currentAutomationStep = "Generating PDF Questions (Parallel)";
        logProgress('Starting PDF Question Generation step with retry logic...', results);

        let itemsToProcessForPdfQuestions = [...results.megaLinks.processedChapters]; // Start with all chapters
        let allPdfQuestionTaskResults = []; // Accumulate all results (success or final failure)
        let pdfRetryAttemptsDone = 0;
        
        let validApiKeysForParallel = Array.isArray(finalApiKeyForAIServer) 
            ? finalApiKeyForAIServer.filter(k => typeof k === 'string' && k.trim() !== '') 
            : [];

        if (!validApiKeysForParallel || validApiKeysForParallel.length === 0) {
            logProgress('WARN: No valid API keys in finalApiKeyForAIServer. Attempting to use fallback from server_config.js for PDF Question Generation.', results, 'warn');
            const fallbackKeys = Array.isArray(GEMINI_API_KEY) ? GEMINI_API_KEY.filter(k => typeof k === 'string' && k.trim() !== '') : [];
            if (fallbackKeys.length > 0) {
                validApiKeysForParallel = fallbackKeys;
                logProgress('Using fallback API keys from server_config.js for PDF question generation.', results);
            } else {
                logProgress('CRITICAL: No valid API keys for PDF Question Generation. Skipping this step.', results, 'error');
                // Ensure itemsToProcessForPdfQuestions is empty to skip the loop or handle error appropriately
                itemsToProcessForPdfQuestions = [];
            }
        }
        
        const MAX_TOTAL_ATTEMPTS_PER_ITEM = Math.max(1, validApiKeysForParallel.length); // Each item gets N chances if N keys

        while (itemsToProcessForPdfQuestions.length > 0 && pdfRetryAttemptsDone < MAX_TOTAL_ATTEMPTS_PER_ITEM && validApiKeysForParallel.length > 0) {
            let attemptNumber = pdfRetryAttemptsDone + 1;
            logProgress(`PDF Question Generation: Starting attempt ${attemptNumber}/${MAX_TOTAL_ATTEMPTS_PER_ITEM} for ${itemsToProcessForPdfQuestions.length} item(s).`, results);

            // Rotate keys for this attempt: Take the first key and move it to the end
            // This ensures workers get different initial keys over retries for the same item if item count matches worker count.
            if (pdfRetryAttemptsDone > 0 && validApiKeysForParallel.length > 1) {
                const firstKey = validApiKeysForParallel.shift();
                validApiKeysForParallel.push(firstKey);
                logProgress(`Rotated API keys for attempt ${attemptNumber}. New first key for worker 0: ${validApiKeysForParallel[0].substring(0,15)}...`, results);
            }

            const currentBatchTaskResults = await runTasksInParallel(
                itemsToProcessForPdfQuestions,
                generatePdfQuestionsForChapterTask, // Defined in previous step
                validApiKeysForParallel,
                courseIdPlaceholder,
                megaEmail,
                megaPassword,
                logProgress,
                results,
                serverMega // Pass the initialized serverMega module
            );

            const stillNeedsProcessing = []; // Items that failed with a retriable API key error

            for (const result of currentBatchTaskResults) {
                const item = result.item; // Item associated with this result by runTasksInParallel
                if (result.status === 'fulfilled' && result.value.success) {
                    allPdfQuestionTaskResults.push(result); // Successfully processed
                } else {
                    const errorMsg = result.reason ? (result.reason.message || String(result.reason)).toLowerCase() : 
                                     result.value && result.value.message ? result.value.message.toLowerCase() : 'unknown error';
                    
                    const isApiKeyError = errorMsg.includes("api key") || 
                                          errorMsg.includes("quota") || 
                                          errorMsg.includes("resource exhausted") ||
                                          errorMsg.includes("api_key_invalid") || // More specific checks
                                          errorMsg.includes("billing") || // Billing issues are key-related
                                          errorMsg.includes("permission_denied"); // Can be key-related

                    if (isApiKeyError && attemptNumber < MAX_TOTAL_ATTEMPTS_PER_ITEM) {
                        stillNeedsProcessing.push(item);
                        logProgress(`PDF Question Generation: Item '${item.title || item.key}' (Attempt ${attemptNumber}) failed with API key error. Will retry. Error: ${errorMsg.substring(0, 200)}`, results, 'warn');
                    } else {
                        allPdfQuestionTaskResults.push(result); // Failed permanently (non-API key error or max attempts reached)
                        logProgress(`PDF Question Generation: Item '${item.title || item.key}' (Attempt ${attemptNumber}) failed permanently. Error: ${errorMsg.substring(0,200)}`, results, 'error');
                    }
                }
            }

            itemsToProcessForPdfQuestions = stillNeedsProcessing;
            pdfRetryAttemptsDone++;

            if (itemsToProcessForPdfQuestions.length === 0) {
                logProgress('PDF Question Generation: All items processed or failed permanently in this batch.', results);
                break; 
            }
        }
        
        results.megaLinks.pdfQuestions = []; // Initialize
        allPdfQuestionTaskResults.forEach(outcome => {
            if (outcome.status === 'fulfilled' && outcome.value.success) {
                results.megaLinks.pdfQuestions.push({
                    chapterKey: outcome.item.key,
                    mcqLink: outcome.value.mcqMegaLink,
                    problemsLink: outcome.value.problemsMegaLink
                });
            } else {
                // Failures already logged during the loop if they became permanent
            }
        });
        logProgress(`PDF question generation (with retries) completed. ${results.megaLinks.pdfQuestions.length} sets successfully generated out of ${results.megaLinks.processedChapters.length}.`, results);

        if (lectures && lectures.length > 0 && Object.keys(lectureSrtLinksByChapterKey).length > 0) {
            logProgress('Generating questions from lectures...', results);
            for (const chapterKey of Object.keys(lectureSrtLinksByChapterKey)) {
                const srtObjectsArray = lectureSrtLinksByChapterKey[chapterKey]; // Array of { title, megaSrtLink }
                // Ensure lectures array is available for finding the chapter name
                const chapterNameForLectures = lectures.find(l => l.associatedChapterKey === chapterKey)?.title || chapterKey.replace(/_/g, ' ');
                
                logProgress(`Generating lecture questions for chapter/topic: "${chapterNameForLectures}" (Key: ${chapterKey})`, results);
                const lectureQuestionsResult = await generateQuestionsFromLectures(
                    courseIdPlaceholder,
                    srtObjectsArray,
                    chapterNameForLectures,
                    megaEmail,
                    megaPassword,
                    finalApiKeyForAIServer // Passing the full array here; lecture_question_generation_service would need internal rotation if it makes multiple calls.
                                          // If this service itself made multiple *sequential* calls to generateQuestionsFromLectures, 
                                          // then we'd apply rotation here for the key passed to *this* call.
                );
                if (lectureQuestionsResult.success) {
                    results.megaLinks.lectureQuestions.push({
                        chapterKey: lectureQuestionsResult.newChapterKey,
                        mcqLink: lectureQuestionsResult.mcqMegaLink,
                        problemsLink: lectureQuestionsResult.problemsMegaLink
                    });
                } else {
                    logProgress(`Failed to generate lecture questions for chapter key "${chapterKey}": ${lectureQuestionsResult.message}`, results, 'warn');
                }
            }
            logProgress(`Lecture question generation completed. ${results.megaLinks.lectureQuestions.length} sets generated.`, results);
        } else {
            logProgress('No lectures processed or no SRT links found. Skipping lecture question generation.', results);
        }

        // --- 6. Result Aggregation & Firestore Data Preparation ---
        logProgress('Preparing Firestore data preview. This may involve final Mega link generations.', results);

        // Explicitly load attributes for courseMegaNode before attempting link generation
        if (courseMegaNode && typeof courseMegaNode.loadAttributes === 'function') {
            logProgress(`Explicitly loading attributes for main course folder node "${courseMegaNode.name || courseMegaNode.id}" before link generation...`, results);
            let loadAttrAttempts = 0;
            const MAX_LOAD_ATTR_ATTEMPTS = 3;
            const LOAD_ATTR_RETRY_DELAY_MS = 1000; // milliseconds
            let attributesLoaded = false;

            while (loadAttrAttempts < MAX_LOAD_ATTR_ATTEMPTS && !attributesLoaded) {
                loadAttrAttempts++;
                try {
                    await new Promise((resolve, reject) => {
                        courseMegaNode.loadAttributes((err, node) => {
                            if (err) return reject(err);
                            resolve(node);
                        });
                    });
                    attributesLoaded = true;
                    logProgress(`Successfully loaded attributes for "${courseMegaNode.name || courseMegaNode.id}" on attempt ${loadAttrAttempts}.`, results);
                } catch (attrError) {
                    if (attrError.message && attrError.message.includes("This is not needed for files loaded from logged in sessions")) {
                        logProgress(`[Debug] Attempt ${loadAttrAttempts}/${MAX_LOAD_ATTR_ATTEMPTS} to load attributes for "${courseMegaNode.name || courseMegaNode.id}" indicated: ${attrError.message}. Proceeding as this is often non-critical.`, results, 'debug'); // Using 'debug' level
                        // Still counts as an attempt, and if it keeps happening, eventually MAX_LOAD_ATTR_ATTEMPTS will be hit.
                        // The attributesLoaded flag remains false, so the loop continues or exits based on attempts.
                    } else {
                        logProgress(new Error(`Attempt ${loadAttrAttempts}/${MAX_LOAD_ATTR_ATTEMPTS} to load attributes for "${courseMegaNode.name || courseMegaNode.id}" failed: ${attrError.message}`), results, 'warn');
                    }
                    // Common logic for all attrErrors in this catch block:
                    if (loadAttrAttempts >= MAX_LOAD_ATTR_ATTEMPTS) {
                        // Log that max attempts were reached, regardless of the specific error type of the last attempt.
                        // If the last error was the "not needed" message, this log might be slightly less alarming but still notes that attributes might not be "formally" loaded.
                        logProgress(new Error(`Failed to formally load attributes for main course folder node after ${MAX_LOAD_ATTR_ATTEMPTS} attempts. Link generation might fail or use stale data if attributes were truly necessary. Last error: ${attrError.message}`), results, 'warn'); // Changed to 'warn' to be less severe if the last message was the "not needed" one.
                        // Proceeding to attempt link generation anyway, as per original plan.
                    } else {
                        // Simplified delay, not using isRetryableMegaError here as it's not imported.
                        await new Promise(resolve => setTimeout(resolve, LOAD_ATTR_RETRY_DELAY_MS * loadAttrAttempts));
                    }
                }
            }
        } else if (courseMegaNode) {
            logProgress(`courseMegaNode for "${courseMegaNode.name || courseMegaNode.id}" does not have a loadAttributes function. Skipping explicit attribute load.`, results, 'warn');
        }
        
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
                    logProgress(`Attempt ${linkAttempts} (Primary - with key) to get link for main course folder (ID: ${courseMegaNode.id || 'N/A'})...`, results);
                    if (!courseMegaNode.key) {
                        logProgress(`courseMegaNode.key is not available for folder ${courseMegaNode.name}. Cannot generate a link with an embedded key. Attempting link without key.`, results, 'warn');
                        mainFolderLink = await courseMegaNode.link(); // Get link without explicit key
                    } else {
                         mainFolderLink = await courseMegaNode.link({ key: courseMegaNode.key }); // Standard way for public link with key
                    }
                    linkSuccess = true;
                    logProgress(`Successfully obtained main course folder link (with key if available) on attempt ${linkAttempts}: ${mainFolderLink}`, results);
                } catch (e) {
                    currentAttemptError = e;
                    logProgress(`Primary link attempt (with key) for main folder failed on attempt ${linkAttempts}: ${e.message}`, results, 'warn');
                    
                    const eaccessError = (e.message && (e.message.includes('EACCESS') || e.message.includes('-11')));

                    if (eaccessError) {
                        logProgress(`EACCESS error detected. Attempting secondary link retrieval (without key) for main folder on attempt ${linkAttempts}...`, results);
                        try {
                            mainFolderLink = await courseMegaNode.link(); // Get link without explicit key (noKey: true is default for folders if key not specified)
                            linkSuccess = true;
                            logProgress(`Successfully obtained main course folder link (alternative - no key) on attempt ${linkAttempts} after EACCESS: ${mainFolderLink}`, results);
                        } catch (e2) {
                            logProgress(`Secondary link attempt (without key) also failed for main folder on attempt ${linkAttempts}: ${e2.message}`, results, 'warn');
                            currentAttemptError = e2; // Update error to the latest one
                        }
                    }
                    
                    if (!linkSuccess) {
                        if (linkAttempts >= MAX_LINK_ATTEMPTS) {
                            const finalErrorMessageBase = `Failed to get main course folder link after ${MAX_LINK_ATTEMPTS} attempts.`;
                            if (eaccessError) {
                                const detailedEaccessMsg = `CRITICAL: Main course folder link generation failed with EACCESS. This indicates the Mega account (email: ${megaEmail || 'not available'}) likely lacks permissions to create shareable links for folders. Please check your Mega account settings, subscription type, and permissions on any parent folders. The course folder was created, but its direct link cannot be generated. Original error: ${currentAttemptError.message}`;
                                logProgress(detailedEaccessMsg, results, 'error');
                                mainFolderLink = `Error: EACCESS - Mega account (email: ${megaEmail || 'N/A'}) permission issue. Link generation failed. Check account settings.`;
                            } else {
                                logProgress(`${finalErrorMessageBase} Last error: ${currentAttemptError.message}.`, results, 'error');
                                mainFolderLink = `Error retrieving link (Last error: ${currentAttemptError.message.substring(0, 100)})`;
                            }
                        } else if (currentAttemptError.message && (currentAttemptError.message.includes('EAGAIN') || currentAttemptError.message.includes('ERATE') || currentAttemptError.message.includes('Socket timeout'))) { // Check for retryable errors
                            logProgress(`Retrying folder link retrieval (main folder) in ${LINK_RETRY_DELAY_MS * linkAttempts}ms due to retryable error: ${currentAttemptError.message}`, results, 'warn');
                            await new Promise(resolve => setTimeout(resolve, LINK_RETRY_DELAY_MS * linkAttempts));
                        } else { // Non-retryable error (or not explicitly EACCESS for special message)
                            logProgress(`Non-retryable error getting main course folder link: ${currentAttemptError.message}. Setting link to error string.`, results, 'error');
                            mainFolderLink = `Error retrieving link (Non-retryable: ${currentAttemptError.message.substring(0, 100)})`;
                            break; // Break from retry loop for non-retryable errors
                        }
                    }
                }
            }
        } else if (courseMegaNode && courseMegaNode.link && typeof courseMegaNode.link !== 'function') { // If .link is a direct property
             mainFolderLink = courseMegaNode.link;
             logProgress('Main course folder link obtained from direct .link property (not a function).', results);
        } else {
            logProgress('Main course folder node is missing, does not have a link method/property, or key is missing for keyed link. Link will be N/A.', results, 'warn');
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

        logProgress(`Firestore Data Preview: ${JSON.stringify(results.firestoreDataPreview, null, 2)}`, results, 'info');
        
        if (results.firestoreDataPreview && results.firestoreDataPreview.status) {
            logProgress(`Course data prepared with status: '${results.firestoreDataPreview.status}'. If the course is not immediately visible in the main user interface, please check if any manual approval, publishing step, or specific Firestore indexing/queries based on this status are required for it to appear for end-users.`, results);
        }

        results.success = true;
        results.message = "Course automation tasks completed successfully. Firestore data preview logged.";

    } catch (error) {
        // Log the full error object with stack trace using logProgress
        logProgress(error, results, 'error'); 
        results.success = false;
        // Ensure message is a string, error.message might be undefined for some error types
        results.message = `Course automation failed: ${error.message || String(error)}`;
        // results.errorStack = error.stack; // Already captured by logProgress if it's an Error instance
    }

    return results;
}

module.exports = {
    automateNewCourseCreation,
    sanitizeCourseTitleForDirName
};
