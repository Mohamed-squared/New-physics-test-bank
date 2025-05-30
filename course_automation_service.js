// course_automation_service.js
const fs = require('fs-extra');
const path = require('path');
const serverDrive = require('./google_drive_service_server.js'); // Renamed serverMega to serverDrive
const aiServer = require('./ai_integration_server.js');
const { processTextbookPdf } = require('./pdf_processing_service.js');
const { transcribeLecture } = require('./lecture_transcription_service.js');
const { generateQuestionsFromPdf } = require('./pdf_question_generation_service.js');
const { generateQuestionsFromLectures } = require('./lecture_question_generation_service.js');
const { GEMINI_API_KEY, GOOGLE_DRIVE_API_KEY } = require('./server_config.js'); // Added GOOGLE_DRIVE_API_KEY

let courseServiceApiKeyIndex = 0; // Module-level index for cycling through API keys for direct calls

/**
 * Executes tasks in parallel batches, assigning a unique API key to each task.
 * @param {Array<any>} items - Array of items to process (e.g., chapters).
 * @param {Function} taskFunction - Async function to execute for each item. 
 *                                  It will receive (item, apiKeyForTask, courseIdPlaceholder, initializedServerDriveInstance).
 * @param {Array<string>} apiKeys - Array of available API keys.
 * @param {string} courseIdPlaceholder - The course ID.
 * @param {Function} logProgress - Logging function.
 * @param {object} resultsRef - Reference to the main results object for logging.
 * @param {object} initializedServerDrive - The initialized serverDrive instance.
 * @returns {Promise<Array<object>>} - Array of results from all settled promises.
 */
async function runTasksInParallel(items, taskFunction, apiKeys, courseIdPlaceholder, logProgress, resultsRef, initializedServerDrive) {
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
                    // Pass initializedServerDrive to the task function
                    const result = await taskFunction(item, apiKeyForTask, courseIdPlaceholder, initializedServerDrive);
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
        lectures, // Array of { title, filePath?, youtubeUrl?, driveLink?, srtDriveLink?, associatedChapterKey }
        majorTag,
        subjectTag,
        // megaEmail, // Removed
        // megaPassword, // Removed
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

    // --- API Key Validation and Processing ---
    // GOOGLE_DRIVE_API_KEY is now imported and will be used directly for serverDrive.initialize()
    // The logic below is for GEMINI_API_KEY used by aiServer
    results.firestoreDataPreview.currentAutomationStep = "Validating Gemini API Keys"; // Set step
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
        results.firestoreDataPreview.currentAutomationStep = "Initializing Google Drive Service"; // Set step
        // --- 1. Initialization & Setup ---
        logProgress('Initializing Google Drive service...', results);
        // GOOGLE_DRIVE_API_KEY is imported from server_config.js
        if (!GOOGLE_DRIVE_API_KEY) {
            logProgress('CRITICAL: GOOGLE_DRIVE_API_KEY is not available from server_config.js. Aborting.', results, 'error');
            throw new Error("Google Drive API Key is missing.");
        }
        await serverDrive.initialize(GOOGLE_DRIVE_API_KEY);
        logProgress('Google Drive service initialized.', results);

        results.firestoreDataPreview.currentAutomationStep = "Creating Google Drive Folder Structure"; // Set step
        logProgress(`Creating base Google Drive folder structure for ${courseIdPlaceholder}...`, results);
        // Root folder for all Lyceum courses on Drive
        const lyceumRootDriveFolderId = await serverDrive.findOrCreateFolder(LYCEUM_ROOT_FOLDER_NAME); // Parent is 'root' by default
        if (!lyceumRootDriveFolderId) throw new Error(`Failed to find or create Lyceum root folder in Google Drive: ${LYCEUM_ROOT_FOLDER_NAME}`);
        logProgress(`Found/Created Lyceum root folder in Google Drive: ${LYCEUM_ROOT_FOLDER_NAME} (ID: ${lyceumRootDriveFolderId})`, results);

        // Course-specific folder under the Lyceum root
        const courseDriveFolderId = await serverDrive.findOrCreateFolder(courseIdPlaceholder, lyceumRootDriveFolderId);
        if (!courseDriveFolderId) throw new Error(`Failed to create main course folder in Google Drive: ${courseIdPlaceholder}`);
        logProgress(`Main course folder in Google Drive: ${courseIdPlaceholder} (ID: ${courseDriveFolderId})`, results);

        // Subfolders within the course folder
        const textbookFullDriveFolderId = await serverDrive.findOrCreateFolder(TEXTBOOK_FULL_DIR_NAME, courseDriveFolderId);
        logProgress(`Created Google Drive folder: ${TEXTBOOK_FULL_DIR_NAME} (ID: ${textbookFullDriveFolderId})`, results);
        const transcriptionsArchiveDriveFolderId = await serverDrive.findOrCreateFolder(TRANSCRIPTIONS_ARCHIVE_DIR_NAME, courseDriveFolderId);
        logProgress(`Created Google Drive folder: ${TRANSCRIPTIONS_ARCHIVE_DIR_NAME} (ID: ${transcriptionsArchiveDriveFolderId})`, results);
        const generatedAssessmentsDriveFolderId = await serverDrive.findOrCreateFolder(GENERATED_ASSESSMENTS_DIR_NAME, courseDriveFolderId);
        logProgress(`Created Google Drive folder: ${GENERATED_ASSESSMENTS_DIR_NAME} (ID: ${generatedAssessmentsDriveFolderId})`, results);
        logProgress('Base Google Drive folder structure created.', results);

        results.firestoreDataPreview.currentAutomationStep = "Processing Textbook"; // Set step
        // --- 2. Textbook Processing ---
        logProgress(`Uploading original textbook: ${textbookPdfOriginalName}`, results);
        if (!fs.existsSync(textbookPdfPath)) throw new Error(`Textbook PDF not found at local path: ${textbookPdfPath}`);
        // Upload to the 'Textbook_Full' directory in Drive
        const uploadedTextbook = await serverDrive.uploadFile(textbookPdfPath, textbookPdfOriginalName, textbookFullDriveFolderId);
        // results.megaLinks.originalTextbook = uploadedTextbook.link; // Will be renamed to results.driveLinks
        logProgress(`Original textbook uploaded to Google Drive: ${uploadedTextbook.webViewLink} (ID: ${uploadedTextbook.id})`, results);

        logProgress('Processing textbook PDF for chapters...', results);
        // processTextbookPdf will need to be updated to use Google Drive
        // It will receive the parent courseDriveFolderId and create TEXTBOOK_CHAPTERS_DIR_NAME within it.
        const textbookProcessingResult = await processTextbookPdf(
            textbookPdfPath,
            courseIdPlaceholder, // Course identifier
            trueFirstPageNumber,
            // megaEmail, // Removed
            // megaPassword, // Removed
            GOOGLE_DRIVE_API_KEY, // Pass API key for its internal Drive operations (or it should use its own initialized client)
            courseDriveFolderId, // Pass parent Drive folder ID for chapters
            finalApiKeyForAIServer // Gemini API key for AI tasks within pdf_processing_service
        );
        // if (!textbookProcessingResult.success) throw new Error(`Textbook PDF processing failed: ${textbookProcessingResult.message}`);
        // results.megaLinks.processedChapters = textbookProcessingResult.processedChapterDetails.map(ch => ({ // Will be renamed
        //     title: ch.title,
        //     pdfLink: ch.megaPdfLink,
        //     key: `textbook_chapter_${ch.chapterNumber}`
        // }));
        // logProgress(`Textbook processing completed. ${results.megaLinks.processedChapters.length} chapters processed.`, results);
        // const tocForAIDescription = results.megaLinks.processedChapters.map(ch => `Chapter ${ch.key.split('_')[2]}: ${ch.title}`).join('\n');
        
        // Placeholder for updated logic after processTextbookPdf is refactored
        if (!textbookProcessingResult.success) throw new Error(`Textbook PDF processing failed: ${textbookProcessingResult.message}`);
        // Assuming textbookProcessingResult.processedChapterDetails now contains driveLink or driveId
        // results.driveLinks.processedChapters = textbookProcessingResult.processedChapterDetails.map(ch => ({
        // title: ch.title,
        // pdfLink: ch.driveLink, // Or however the link/ID is returned
        // key: `textbook_chapter_${ch.chapterNumber}`
        // }));
        logProgress(`Textbook processing completed. ${(results.driveLinks.processedChapters || []).length} chapters processed.`, results);
        const tocForAIDescription = results.driveLinks.processedChapters && results.driveLinks.processedChapters.length > 0
            ? results.driveLinks.processedChapters.map(ch => `Chapter ${ch.key.split('_')[2]}: ${ch.title}`).join('\n')
            : "Table of Contents not available.";
        // const tocForAIDescription = "Placeholder TOC - processTextbookPdf output needs integration"; // Placeholder
        logProgress("Textbook processing step finished (placeholder for drive integration details).", results);


        // Initialize lecture related variables
        const lectureSrtDriveLinksByChapterKey = {};
        const lectureTitlesForAIDescription = [];

        // --- 3. Lecture Processing ---
        if (lectures && lectures.length > 0) {
            logProgress('Processing lectures...', results);
            for (const lecture of lectures) {
                lectureTitlesForAIDescription.push(lecture.title);
                let srtMegaLink = lecture.srtMegaLink;
                const chapterKeyForLecture = lecture.associatedChapterKey || 'general_lectures';

                let srtDriveLink = lecture.srtDriveLink; // Assuming field name changes from srtMegaLink
                const chapterKeyForLecture = lecture.associatedChapterKey || 'general_lectures';

                if (!srtDriveLink) {
                    if (!lecture.filePath && !lecture.youtubeUrl) {
                        logProgress(`Lecture "${lecture.title}" has no SRT, filePath, or YouTube URL. Skipping transcription.`, results, 'warn');
                        continue;
                    }
                    logProgress(`Transcribing lecture: "${lecture.title}" for chapter ${chapterKeyForLecture}`, results);
                    // transcribeLecture will also need to be updated to use Google Drive
                    const transcriptionResult = await transcribeLecture(
                        lecture.youtubeUrl || null,
                        courseIdPlaceholder, // Course Identifier
                        chapterKeyForLecture,
                        assemblyAiApiKey,
                        // megaEmail, // Removed
                        // megaPassword, // Removed
                        GOOGLE_DRIVE_API_KEY, // For its internal Drive operations
                        transcriptionsArchiveDriveFolderId // Pass parent Drive folder ID for SRT uploads
                    );
                    if (!transcriptionResult.success) {
                        logProgress(`Transcription failed for lecture "${lecture.title}": ${transcriptionResult.message}. Skipping this lecture.`, results, 'warn');
                        continue;
                    }
                    srtDriveLink = transcriptionResult.srtDriveLink; // Assuming this is returned
                }
                
                if (srtDriveLink) {
                    // results.megaLinks.transcriptions.push({ title: lecture.title, srtLink: srtDriveLink, chapterKey: chapterKeyForLecture }); // To be renamed
                    if (!lectureSrtDriveLinksByChapterKey[chapterKeyForLecture]) {
                        lectureSrtDriveLinksByChapterKey[chapterKeyForLecture] = [];
                    }
                    lectureSrtDriveLinksByChapterKey[chapterKeyForLecture].push({ title: lecture.title, srtDriveLink: srtDriveLink });
                }
            }
            // logProgress(`Lecture processing completed. ${results.megaLinks.transcriptions.length} transcriptions processed/linked.`, results); // To be updated
            logProgress("Lecture processing step finished (placeholder for drive integration details).", results);

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
        const generatePdfQuestionsForChapterTask = async (chapter, apiKey, courseId, initializedServerDriveInstance) => {
            logProgress(`[TaskRunner] Generating PDF questions for chapter: "${chapter.title}" (Key: ${chapter.key}) using assigned API key index...`, results); // Log with results ref
            // generateQuestionsFromPdf will need to be updated for Google Drive
            return generateQuestionsFromPdf(
                courseId, // Course Identifier
                chapter.key, // Chapter key
                chapter.pdfLink, // This should be a Drive link/ID
                chapter.title,
                // email, // Removed
                // password, // Removed
                initializedServerDriveInstance, // Pass the initialized serverDrive instance
                GOOGLE_DRIVE_API_KEY, // For its internal Drive operations (if not using passed instance for all)
                generatedAssessmentsDriveFolderId, // Parent Drive folder for question uploads
                apiKey // Gemini API Key
            );
        };

        results.firestoreDataPreview.currentAutomationStep = "Generating PDF Questions (Parallel)";
        logProgress('Starting PDF Question Generation step with retry logic...', results);

        // Corrected: Should use results.driveLinks
        let itemsToProcessForPdfQuestions = results.driveLinks.processedChapters ? [...results.driveLinks.processedChapters] : [];
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
            let attemptNumber = pdfRetryAttemptsDone + 1; // Corrected: attemptNumber should be based on pdfRetryAttemptsDone
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
                generatePdfQuestionsForChapterTask, // Defined above
                validApiKeysForParallel, // These are Gemini API Keys
                courseIdPlaceholder,
                // megaEmail, // Removed
                // megaPassword, // Removed
                logProgress,
                results,
                serverDrive // Pass the initialized serverDrive module
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
        
        // results.megaLinks.pdfQuestions = []; // To be renamed
        allPdfQuestionTaskResults.forEach(outcome => { // Ensure this populates results.driveLinks.pdfQuestions
            if (outcome.status === 'fulfilled' && outcome.value.success) {
                results.driveLinks.pdfQuestions.push({
                    chapterKey: outcome.item.key, // outcome.item should be a chapter from itemsToProcessForPdfQuestions
                    mcqLink: outcome.value.driveMcqLink,
                    mcqId: outcome.value.driveMcqId, // Assuming IDs are also returned
                    problemsLink: outcome.value.driveProblemsLink,
                    problemsId: outcome.value.driveProblemsId // Assuming IDs are also returned
                });
            }
        });
        const chaptersCountForPdfQuestions = results.driveLinks.processedChapters ? results.driveLinks.processedChapters.length : 0;
        logProgress(`PDF question generation (with retries) completed. ${results.driveLinks.pdfQuestions.length} sets successfully generated out of ${chaptersCountForPdfQuestions}.`, results);
        // logProgress("PDF Question generation finished (placeholder for drive integration details).", results);


        if (lectures && lectures.length > 0 && Object.keys(lectureSrtDriveLinksByChapterKey).length > 0) {
            logProgress('Generating questions from lectures...', results);
            for (const chapterKey of Object.keys(lectureSrtDriveLinksByChapterKey)) {
                const srtObjectsArray = lectureSrtDriveLinksByChapterKey[chapterKey]; // Array of { title, srtDriveLink }
                const chapterNameForLectures = lectures.find(l => l.associatedChapterKey === chapterKey)?.title || chapterKey.replace(/_/g, ' ');
                
                logProgress(`Generating lecture questions for chapter/topic: "${chapterNameForLectures}" (Key: ${chapterKey})`, results);
                // generateQuestionsFromLectures will need to be updated for Google Drive
                const lectureQuestionsResult = await generateQuestionsFromLectures(
                    courseIdPlaceholder, // Course Identifier
                    srtObjectsArray, // Should contain srtDriveLink
                    chapterNameForLectures,
                    // megaEmail, // Removed
                    // megaPassword, // Removed
                    GOOGLE_DRIVE_API_KEY, // For its internal Drive operations
                    generatedAssessmentsDriveFolderId, // Parent Drive folder for question uploads
                    finalApiKeyForAIServer // Gemini API Keys
                );
                // if (lectureQuestionsResult.success) {
                //     results.driveLinks.lectureQuestions.push({ // Renamed
                //         chapterKey: lectureQuestionsResult.newChapterKey,
                //         mcqLink: lectureQuestionsResult.driveMcqLink, // Assuming new field name
                //         problemsLink: lectureQuestionsResult.driveProblemsLink // Assuming new field name
                //     });
                // } else {
                //     logProgress(`Failed to generate lecture questions for chapter key "${chapterKey}": ${lectureQuestionsResult.message}`, results, 'warn');
                // }
            }
            // logProgress(`Lecture question generation completed. ${results.driveLinks.lectureQuestions.length} sets generated.`, results);
            logProgress("Lecture question generation finished (placeholder for drive integration details).", results);

        } else {
            logProgress('No lectures processed or no SRT links found. Skipping lecture question generation.', results);
        }

        // --- 6. Result Aggregation & Firestore Data Preparation ---
        logProgress('Preparing Firestore data preview. This may involve final Google Drive link generations.', results);

        // For Google Drive, the main course folder ID is courseDriveFolderId.
        // We might want its webViewLink for the Firestore data.
        // This requires an additional call if findOrCreateFolder doesn't return it (it currently returns only ID).
        // For now, we'll store the ID. If a link is needed, serverDrive.getFileLink(courseDriveFolderId) could be used,
        // but getFileLink is more for files. For folders, the link is usually predictable or obtained via 'get' with 'webViewLink' field.
        // Let's assume for now we store the ID, or get the link if easily available.
        // The serverDrive.findOrCreateFolder could be enhanced to return the webViewLink too.
        // For simplicity, we'll use the ID or a placeholder link.
        
        let mainFolderLink = `https://drive.google.com/drive/folders/${courseDriveFolderId}`; // Construct a typical folder link
        logProgress(`Main course folder in Google Drive: ${mainFolderLink} (ID: ${courseDriveFolderId})`, results);


        // results.firestoreDataPreview = { // Placeholder for the full structure update
        //     courseTitle: params.courseTitle,
        //     courseDirName: courseIdPlaceholder,
        //     aiGeneratedDescription: results.aiGeneratedDescription,
        //     majorTag: params.majorTag,
        //     subjectTag: params.subjectTag,
        //     driveMainFolderLink: mainFolderLink, // Changed from megaMainFolderLink
        //     driveTextbookFullPdfLink: results.driveLinks.originalTextbook, // Changed & assuming driveLinks structure
        //     chapters: results.driveLinks.processedChapters.map(pc => ({
        //         key: pc.key,
        //         title: pc.title,
        //         pdfLink: pc.pdfLink, // This should be a Drive link
        //         relatedTranscriptions: results.driveLinks.transcriptions.filter(t => t.chapterKey === pc.key),
        //         pdfMcqLink: results.driveLinks.pdfQuestions.find(pq => pq.chapterKey === pc.key)?.mcqLink,
        //         pdfProblemsLink: results.driveLinks.pdfQuestions.find(pq => pq.chapterKey === pc.key)?.problemsLink,
        //     })),
        //     lectureQuestionSets: results.driveLinks.lectureQuestions.map(lq => ({
        //         key: lq.chapterKey,
        //         mcqLink: lq.mcqLink,
        //         problemsLink: lq.problemsLink,
        //     })),
        //     transcriptionLinks: results.driveLinks.transcriptions,
        //     prerequisites: typeof prerequisites === 'string' && prerequisites.trim() !== ''
        //         ? prerequisites.split(',').map(p => p.trim()).filter(p => p)
        //         : [],
        //     bannerPicUrl: bannerPicUrl || null,
        //     coursePicUrl: coursePicUrl || null,
        //     status: "pending_review",
        //     createdAt: new Date().toISOString(),
        //     updatedAt: new Date().toISOString(),
        // };
        logProgress("Firestore data preview structure needs full update based on Drive links (placeholder).", results);


        // Initialize results.driveLinks (rename from megaLinks)
        results.driveLinks = {
            originalTextbook: uploadedTextbook.webViewLink, // Store the webViewLink
            originalTextbookId: uploadedTextbook.id, // Store the ID
            processedChapters: [],
            transcriptions: [],
            pdfQuestions: [],
            lectureQuestions: []
        };
        // Populate Processed Chapters (example, actual data comes from refactored processTextbookPdf)
        if (textbookProcessingResult.success && textbookProcessingResult.processedChapterDetails) {
            results.driveLinks.processedChapters = textbookProcessingResult.processedChapterDetails.map(ch => ({
                title: ch.title,
                pdfLink: ch.driveLink, // Assuming this structure from refactored service
                pdfId: ch.driveId,     // Assuming this structure
                key: `textbook_chapter_${ch.chapterNumber}`
            }));
        }
         // Populate Transcriptions (example)
        if (results.driveLinks.transcriptions) { // Check if it was initialized
            // Logic from before, adapted for driveLinks
            Object.keys(lectureSrtDriveLinksByChapterKey).forEach(chapterKey => {
                lectureSrtDriveLinksByChapterKey[chapterKey].forEach(lectureSrtInfo => {
                    results.driveLinks.transcriptions.push({
                        title: lectureSrtInfo.title,
                        srtLink: lectureSrtInfo.srtDriveLink, // This is the webViewLink from Drive
                        // srtId: lectureSrtInfo.srtDriveId, // If ID is also returned and needed
                        chapterKey: chapterKey
                    });
                });
            });
        }


        // Update firestoreDataPreview with new Drive links
        results.firestoreDataPreview = {
            courseTitle: params.courseTitle,
            courseDirName: courseIdPlaceholder,
            aiGeneratedDescription: results.aiGeneratedDescription,
            majorTag: params.majorTag,
            subjectTag: params.subjectTag,
            driveFolderId: courseDriveFolderId, // Store the main course folder ID
            driveFolderLink: mainFolderLink,    // Store the constructed link
            driveTextbookFullPdfLink: results.driveLinks.originalTextbook,
            driveTextbookFullPdfId: results.driveLinks.originalTextbookId,
            chapters: results.driveLinks.processedChapters.map(pc => ({
                key: pc.key,
                title: pc.title,
                pdfLink: pc.pdfLink,
                pdfId: pc.pdfId,
                relatedTranscriptions: results.driveLinks.transcriptions
                                            .filter(t => t.chapterKey === pc.key)
                                            .map(t => ({ title: t.title, srtLink: t.srtLink /*, srtId: t.srtId */ })),
                pdfMcqLink: results.driveLinks.pdfQuestions.find(pq => pq.chapterKey === pc.key)?.mcqLink,
                // pdfMcqId: results.driveLinks.pdfQuestions.find(pq => pq.chapterKey === pc.key)?.mcqId,
                pdfProblemsLink: results.driveLinks.pdfQuestions.find(pq => pq.chapterKey === pc.key)?.problemsLink,
                // pdfProblemsId: results.driveLinks.pdfQuestions.find(pq => pq.chapterKey === pc.key)?.problemsId,
            })),
            lectureQuestionSets: results.driveLinks.lectureQuestions.map(lq => ({
                key: lq.chapterKey,
                mcqLink: lq.mcqLink,
                // mcqId: lq.mcqId,
                problemsLink: lq.problemsLink,
                // problemsId: lq.problemsId,
            })),
            transcriptionDetails: results.driveLinks.transcriptions.map(t => ({ // More detailed than just links
                title: t.title,
                srtLink: t.srtLink,
                // srtId: t.srtId,
                chapterKey: t.chapterKey
            })),
            prerequisites: typeof prerequisites === 'string' && prerequisites.trim() !== ''
                ? prerequisites.split(',').map(p => p.trim()).filter(p => p)
                : [],
            bannerPicUrl: bannerPicUrl || null,
            coursePicUrl: coursePicUrl || null,
            status: "pending_review", // Initial status
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        logProgress(`Firestore Data Preview (Drive): ${JSON.stringify(results.firestoreDataPreview, null, 2)}`, results, 'info');
        
        if (results.firestoreDataPreview && results.firestoreDataPreview.status) {
            logProgress(`Course data prepared with status: '${results.firestoreDataPreview.status}'. If the course is not immediately visible in the main user interface, please check if any manual approval, publishing step, or specific Firestore indexing/queries based on this status are required for it to appear for end-users.`, results);
        }

        results.success = true;
        results.message = "Course automation tasks completed successfully using Google Drive. Firestore data preview logged.";

    } catch (error) {
        logProgress(error, results, 'error'); 
        results.success = false;
        results.message = `Course automation failed (Google Drive): ${error.message || String(error)}`;
    }

    return results;
}

module.exports = {
    automateNewCourseCreation,
    sanitizeCourseTitleForDirName
};
