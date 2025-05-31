// course_automation_service.js
const fs = require('fs-extra');
const path = require('path');
const serverGoogleDrive = require('./google_drive_service_server.js'); // RENAMED_IMPORT
const aiServer = require('./ai_integration_server.js');
const { processTextbookPdf } = require('./pdf_processing_service.js');
const { transcribeLecture } = require('./lecture_transcription_service.js');
const { generateQuestionsFromPdf } = require('./pdf_question_generation_service.js');
const { generateQuestionsFromLectures } = require('./lecture_question_generation_service.js');
const { GEMINI_API_KEY } = require('./server_config.js');
const { saveAutomatedCourseToFirestore } = require('./firebase_firestore.js');

let courseServiceApiKeyIndex = 0;

/**
 * Executes tasks in parallel batches, assigning a unique API key to each task.
 * @param {Array<any>} items - Array of items to process.
 * @param {Function} taskFunction - Async function to execute for each item.
 *                                  It will receive (item, apiKeyForTask, courseIdPlaceholder, initializedServerGoogleDriveInstance).
 * @param {Array<string>} apiKeys - Array of available API keys.
 * @param {string} courseIdPlaceholder - The course ID.
 * @param {Function} logProgress - Logging function.
 * @param {object} resultsRef - Reference to the main results object for logging.
 * @param {object} initializedServerGoogleDriveInstance - The initialized serverGoogleDrive instance.
 * @returns {Promise<Array<object>>} - Array of results from all settled promises.
 */
async function runTasksInParallel(items, taskFunction, apiKeys, courseIdPlaceholder, logProgress, resultsRef, initializedServerGoogleDriveInstance) {
    if (!apiKeys || apiKeys.length === 0) {
        logProgress('CRITICAL: No API keys available for parallel processing.', resultsRef, 'error');
        throw new Error('No API keys available for parallel tasks.');
    }
    const numWorkers = Math.min(items.length, apiKeys.length);
    const results = [];
    let itemIndex = 0;

    logProgress(`Starting parallel processing for ${items.length} items with up to ${numWorkers} concurrent workers.`, resultsRef);

    const workers = [];
    for (let i = 0; i < numWorkers; i++) {
        workers.push((async () => {
            let assignedItemIndex;
            while ((assignedItemIndex = itemIndex++) < items.length) {
                const item = items[assignedItemIndex];
                const apiKeyForTask = apiKeys[i % apiKeys.length];
                
                logProgress(`Worker ${i}: Processing item ${assignedItemIndex + 1}/${items.length} ('${item.title || item.key || 'N/A'}') with API key index ${i % apiKeys.length}.`, resultsRef);
                try {
                    const result = await taskFunction(item, apiKeyForTask, courseIdPlaceholder, initializedServerGoogleDriveInstance);
                    results.push({ status: 'fulfilled', value: result, item });
                    logProgress(`Worker ${i}: Successfully processed item ${assignedItemIndex + 1}/${items.length} ('${item.title || item.key || 'N/A'}').`, resultsRef);
                } catch (error) {
                    results.push({ status: 'rejected', reason: error, item });
                    logProgress(`Worker ${i}: ERROR processing item ${assignedItemIndex + 1}/${items.length} ('${item.title || item.key || 'N/A'}'): ${error.message}`, resultsRef, 'error');
                }
            }
        })());
    }

    await Promise.allSettled(workers);
    logProgress(`Finished all parallel tasks. Total results: ${results.length}`, resultsRef);
    return results;
}

// Standardized Google Drive Folder Names
const TEXTBOOK_FULL_DIR_NAME = "Textbook_Full";
const TEXTBOOK_CHAPTERS_DIR_NAME = "Textbook_Chapters";
const TRANSCRIPTIONS_ARCHIVE_DIR_NAME = "Transcriptions_Archive";
const GENERATED_ASSESSMENTS_DIR_NAME = "Generated_Assessments";

const LYCEUM_ROOT_FOLDER_NAME = "LyceumCourses_GoogleDrive_Test"; // RENAMED for GDrive

function sanitizeCourseTitleForDirName(title) {
    if (!title) return 'untitled_course';
    return title
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^\w-]/g, '')
        .substring(0, 75);
}

async function automateNewCourseCreation(params) {
    const {
        courseTitle,
        textbookPdfPath,
        textbookPdfOriginalName,
        trueFirstPageNumber,
        lectures, // Array of { title, filePath?, youtubeUrl?, googleDriveLink?, srtGoogleDriveLink?, srtGoogleDriveId?, associatedChapterKey }
        majorTag,
        subjectTag,
        geminiApiKey,
        assemblyAiApiKey,
        prerequisites,
        bannerPicUrl,
        coursePicUrl
    } = params;

    const courseIdPlaceholder = sanitizeCourseTitleForDirName(courseTitle);
    
    const logProgress = (messageOrError, currentResults, level = 'info') => {
        let logMessage;
        let fullErrorStack = null;
        if (messageOrError instanceof Error) {
            logMessage = messageOrError.message;
            if (level === 'error') fullErrorStack = messageOrError.stack;
        } else {
            logMessage = messageOrError;
        }
        const timestampedLogEntry = { timestamp: new Date().toISOString(), message: logMessage };
        if (fullErrorStack) timestampedLogEntry.stack = fullErrorStack;
        if (currentResults && currentResults.progressLogs) currentResults.progressLogs.push(timestampedLogEntry);
        
        const logPrefix = `[AutomationService][${courseIdPlaceholder}]`;
        const consoleMessage = fullErrorStack ? `${logPrefix} ${logMessage}\nStack: ${fullErrorStack}` : `${logPrefix} ${logMessage}`;
        if (level === 'warn') console.warn(consoleMessage);
        else if (level === 'error') console.error(consoleMessage);
        else console.log(consoleMessage);
    };
    
    const results = {
        success: false, message: "", courseTitle, courseDirName: courseIdPlaceholder, aiGeneratedDescription: null,
        googleDriveLinks: {
            originalTextbook: null, processedChapters: [], transcriptions: [], pdfQuestions: [], lectureQuestions: []
        },
        firestoreDataPreview: { currentAutomationStep: "Initializing..." },
        progressLogs: []
    };

    logProgress(`Starting automated course creation for: "${courseTitle}" (Google Drive)`, results);
    results.firestoreDataPreview.currentAutomationStep = "Validating API Keys";

    let finalApiKeyForAIServer;
    // Gemini API Key processing (same as before)
    if (Array.isArray(geminiApiKey)) {
        finalApiKeyForAIServer = geminiApiKey.filter(k => typeof k === 'string' && k.trim() !== '');
        if (finalApiKeyForAIServer.length === 0) finalApiKeyForAIServer = null;
    } else if (typeof geminiApiKey === 'string' && geminiApiKey.trim() !== '') {
        if (geminiApiKey.startsWith('[') && geminiApiKey.endsWith(']')) {
            try {
                const parsedArray = JSON.parse(geminiApiKey);
                finalApiKeyForAIServer = Array.isArray(parsedArray) ? parsedArray.filter(k => typeof k === 'string' && k.trim() !== '') : [geminiApiKey.trim()];
                if (finalApiKeyForAIServer.length === 0) finalApiKeyForAIServer = null;
            } catch (e) { finalApiKeyForAIServer = [geminiApiKey.trim()]; }
        } else { finalApiKeyForAIServer = [geminiApiKey.trim()]; }
    } else if (typeof geminiApiKey === 'object' && geminiApiKey !== null) {
        const commonKeys = ['key', 'apiKey', 'value'];
        let foundKey = null;
        for (const k of commonKeys) { if (typeof geminiApiKey[k] === 'string' && geminiApiKey[k].trim() !== '') { foundKey = geminiApiKey[k].trim(); break; } }
        finalApiKeyForAIServer = foundKey ? [foundKey] : null;
    } else { finalApiKeyForAIServer = null; }

    if (!finalApiKeyForAIServer) {
        logProgress(`WARN: No valid Gemini API Key from input. Attempting to use global default GEMINI_API_KEY.`, results, 'warn');
        finalApiKeyForAIServer = GEMINI_API_KEY;
        if (!finalApiKeyForAIServer || (Array.isArray(finalApiKeyForAIServer) && finalApiKeyForAIServer.length === 0)) {
             const errorMsg = `CRITICAL: No valid Gemini API Key. Aborting.`;
             logProgress(errorMsg, results, 'error');
             results.success = false; results.message = errorMsg; results.firestoreDataPreview.currentAutomationStep = `Failed: Gemini API Key missing`;
             return results; 
        }
    }
    if (typeof finalApiKeyForAIServer === 'string') finalApiKeyForAIServer = [finalApiKeyForAIServer];
    logProgress(`Final API Key for AI Server ready.`, results);

    try {
        results.firestoreDataPreview.currentAutomationStep = "Initializing Google Drive Service";
        // IMPORTANT: Replace 'YOUR_SERVICE_ACCOUNT_KEY_PATH_HERE.json' with the actual path to your service account key file.
        // This file should be kept secure and not publicly accessible.
        // It's recommended to use environment variables to store the path.
        const SERVICE_ACCOUNT_KEY_PATH = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_PATH || 'YOUR_SERVICE_ACCOUNT_KEY_PATH_HERE.json';

        // Initialize the server-side Google Drive service with the service account key.
        // This should ideally be done once when the application server starts,
        // but if this service is run as a standalone script or different entry point,
        // initializing here is necessary. Ensure it's not re-initialized unnecessarily if it's a singleton.
        if (SERVICE_ACCOUNT_KEY_PATH === 'YOUR_SERVICE_ACCOUNT_KEY_PATH_HERE.json') {
            logProgress('CRITICAL: Service Account Key Path not configured. Google Drive operations will fail.', results, 'error');
            throw new Error('Google Drive Service Account Key Path not configured.');
        }
        await serverGoogleDrive.initialize(SERVICE_ACCOUNT_KEY_PATH);
        logProgress('Google Drive service initialized with Service Account for automation.', results);

        results.firestoreDataPreview.currentAutomationStep = "Creating Google Drive Folder Structure";
        logProgress(`Creating base Google Drive folder structure for ${courseIdPlaceholder}...`, results);
        let lyceumRootNode = await serverGoogleDrive.findFolder(LYCEUM_ROOT_FOLDER_NAME, 'root');
        if (!lyceumRootNode) lyceumRootNode = await serverGoogleDrive.createFolder(LYCEUM_ROOT_FOLDER_NAME, 'root');
        if (!lyceumRootNode || !lyceumRootNode.id) throw new Error(`Failed to find/create Lyceum root folder in Google Drive: ${LYCEUM_ROOT_FOLDER_NAME}`);
        logProgress(`Found/Created Lyceum root folder: ${LYCEUM_ROOT_FOLDER_NAME} (ID: ${lyceumRootNode.id})`, results);

        let courseGoogleDriveNode = await serverGoogleDrive.findFolder(courseIdPlaceholder, lyceumRootNode.id);
        if (!courseGoogleDriveNode) courseGoogleDriveNode = await serverGoogleDrive.createFolder(courseIdPlaceholder, lyceumRootNode.id);
        if (!courseGoogleDriveNode || !courseGoogleDriveNode.id) throw new Error(`Failed to create main course folder in Google Drive: ${courseIdPlaceholder}`);
        logProgress(`Main course folder on Google Drive: ${courseGoogleDriveNode.name} (ID: ${courseGoogleDriveNode.id})`, results);

        const textbookFullGDriveFolder = await serverGoogleDrive.createFolder(TEXTBOOK_FULL_DIR_NAME, courseGoogleDriveNode.id);
        const transcriptionsArchiveGDriveFolder = await serverGoogleDrive.createFolder(TRANSCRIPTIONS_ARCHIVE_DIR_NAME, courseGoogleDriveNode.id);
        // const generatedAssessmentsGDriveFolder = await serverGoogleDrive.createFolder(GENERATED_ASSESSMENTS_DIR_NAME, courseGoogleDriveNode.id); // This will be created by Q-Gen services.
        logProgress('Base Google Drive folder structure created (Textbook Full, Transcriptions Archive). Assessments folder to be created by Q-Gen services.', results);

        results.firestoreDataPreview.currentAutomationStep = "Processing Textbook";
        logProgress(`Uploading original textbook: ${textbookPdfOriginalName}`, results);
        if (!fs.existsSync(textbookPdfPath)) throw new Error(`Textbook PDF not found at local path: ${textbookPdfPath}`);
        const uploadedTextbook = await serverGoogleDrive.uploadFile(textbookPdfPath, textbookPdfOriginalName, textbookFullGDriveFolder.id);
        results.googleDriveLinks.originalTextbook = { id: uploadedTextbook.id, link: uploadedTextbook.webViewLink };
        logProgress(`Original textbook uploaded to Google Drive: ID ${uploadedTextbook.id}, Link: ${uploadedTextbook.webViewLink}`, results);

        logProgress('Processing textbook PDF for chapters...', results);
        const textbookProcessingResult = await processTextbookPdf(
            textbookPdfPath, courseIdPlaceholder, trueFirstPageNumber,
            serverGoogleDrive, // Pass initialized GDrive service
            finalApiKeyForAIServer
        );
        if (!textbookProcessingResult.success) throw new Error(`Textbook PDF processing failed: ${textbookProcessingResult.message}`);
        results.googleDriveLinks.processedChapters = textbookProcessingResult.processedChapterDetails.map(ch => ({
            title: ch.title, pdfId: ch.gdrivePdfId, pdfLink: ch.gdrivePdfLink, key: `textbook_chapter_${ch.chapterNumber}`
        }));
        logProgress(`Textbook processing completed. ${results.googleDriveLinks.processedChapters.length} chapters processed.`, results);
        const tocForAIDescription = results.googleDriveLinks.processedChapters.map(ch => `Chapter ${ch.key.split('_')[2]}: ${ch.title}`).join('\n');
        
        const lectureSrtDetailsByChapterKey = {};
        const lectureTitlesForAIDescription = [];

        if (lectures && lectures.length > 0) {
            results.firestoreDataPreview.currentAutomationStep = "Processing Lectures";
            logProgress('Processing lectures...', results);
            for (const lecture of lectures) {
                lectureTitlesForAIDescription.push(lecture.title);
                let srtInfo = { id: lecture.srtGoogleDriveId, link: lecture.srtGoogleDriveLink };
                const chapterKeyForLecture = lecture.associatedChapterKey || 'general_lectures';

                if (!srtInfo.id && !srtInfo.link) {
                    if (!lecture.filePath && !lecture.youtubeUrl && !lecture.googleDriveLink) {
                        logProgress(`Lecture "${lecture.title}" has no SRT, local file, YouTube URL, or Google Drive link. Skipping transcription.`, results, 'warn');
                        continue;
                    }
                    logProgress(`Transcribing lecture: "${lecture.title}" for chapter ${chapterKeyForLecture}`, results);
                    const transcriptionResult = await transcribeLecture(
                        lecture.youtubeUrl || lecture.googleDriveLink || null, // Pass GDrive link if available for video
                        courseIdPlaceholder, chapterKeyForLecture, assemblyAiApiKey,
                        serverGoogleDrive // Pass initialized GDrive service
                    );
                    if (!transcriptionResult.success) {
                        logProgress(`Transcription failed for lecture "${lecture.title}": ${transcriptionResult.message}. Skipping.`, results, 'warn');
                        continue;
                    }
                    srtInfo = { id: transcriptionResult.gdriveSrtId, link: transcriptionResult.gdriveSrtLink };
                }
                
                if (srtInfo.id || srtInfo.link) {
                    results.googleDriveLinks.transcriptions.push({ title: lecture.title, srtId: srtInfo.id, srtLink: srtInfo.link, chapterKey: chapterKeyForLecture });
                    if (!lectureSrtDetailsByChapterKey[chapterKeyForLecture]) lectureSrtDetailsByChapterKey[chapterKeyForLecture] = [];
                    lectureSrtDetailsByChapterKey[chapterKeyForLecture].push({ title: lecture.title, gdriveSrtId: srtInfo.id, gdriveSrtLink: srtInfo.link });
                }
            }
            logProgress(`Lecture processing completed. ${results.googleDriveLinks.transcriptions.length} transcriptions processed/linked.`, results);
        } else {
            logProgress('No lectures provided. Skipping lecture processing.', results);
        }

        results.firestoreDataPreview.currentAutomationStep = "Generating AI Course Description";
        logProgress('Generating AI course description...', results);
        // AI Description generation (same as before, using tocForAIDescription and lectureTitlesForAIDescription)
        let lectureSectionForPrompt = lectureTitlesForAIDescription.length > 0 ? `\nIt also includes lectures on:\n${lectureTitlesForAIDescription.join('\n')}` : "";
        const descriptionPrompt = `Generate a concise and engaging course description for a new course titled "${courseTitle}". The course covers topics like: ${tocForAIDescription}${lectureSectionForPrompt}. Major: "${majorTag}", Subject: "${subjectTag}". Highlight key learning outcomes. Max 150 words.`;
        let apiKeyForDescription = finalApiKeyForAIServer[courseServiceApiKeyIndex++ % finalApiKeyForAIServer.length];
        results.aiGeneratedDescription = await aiServer.callGeminiTextAPI(apiKeyForDescription, descriptionPrompt, null, "You are a course catalog editor.");
        logProgress(`AI course description generated: ${results.aiGeneratedDescription.substring(0, 100)}...`, results);

        results.firestoreDataPreview.currentAutomationStep = "Generating PDF Questions (Parallel)";
        const generatePdfQuestionsForChapterTask = async (chapter, apiKey, courseId, initializedInstance) => {
            logProgress(`[TaskRunner] Generating PDF questions for chapter: "${chapter.title}" (Key: ${chapter.key})...`, results);
            return generateQuestionsFromPdf(courseId, chapter.key, chapter.pdfId, chapter.title, initializedInstance, apiKey);
        };
        
        let validApiKeysForParallel = finalApiKeyForAIServer.filter(k => typeof k === 'string' && k.trim() !== '');
        if (validApiKeysForParallel.length === 0) {
             logProgress('WARN: No valid Gemini API keys for parallel PDF Q-Gen. Using server default.', results, 'warn');
             validApiKeysForParallel = Array.isArray(GEMINI_API_KEY) ? GEMINI_API_KEY : [GEMINI_API_KEY]; // Fallback to global
             validApiKeysForParallel = validApiKeysForParallel.filter(k => typeof k === 'string' && k.trim() !== '');
        }

        if (results.googleDriveLinks.processedChapters.length > 0 && validApiKeysForParallel.length > 0) {
            const pdfQuestionTaskResults = await runTasksInParallel(
                results.googleDriveLinks.processedChapters, generatePdfQuestionsForChapterTask,
                validApiKeysForParallel, courseIdPlaceholder, logProgress, results, serverGoogleDrive
            );
            pdfQuestionTaskResults.forEach(outcome => {
                if (outcome.status === 'fulfilled' && outcome.value.success) {
                    results.googleDriveLinks.pdfQuestions.push({
                        chapterKey: outcome.item.key,
                        mcqId: outcome.value.mcqGoogleDriveId, mcqLink: outcome.value.mcqGoogleDriveLink,
                        problemsId: outcome.value.problemsGoogleDriveId, problemsLink: outcome.value.problemsGoogleDriveLink
                    });
                }
            });
        } else {
            logProgress('Skipping PDF question generation due to no processed chapters or no valid API keys.', results, 'warn');
        }
        logProgress(`PDF question generation completed. ${results.googleDriveLinks.pdfQuestions.length} sets generated.`, results);

        results.firestoreDataPreview.currentAutomationStep = "Generating Lecture Questions";
        if (lectures && lectures.length > 0 && Object.keys(lectureSrtDetailsByChapterKey).length > 0) {
            logProgress('Generating questions from lectures (Google Drive)...', results);
            for (const chapterKey of Object.keys(lectureSrtDetailsByChapterKey)) {
                const srtObjectsArray = lectureSrtDetailsByChapterKey[chapterKey];
                const chapterNameForLectures = lectures.find(l => l.associatedChapterKey === chapterKey)?.title || chapterKey.replace(/_/g, ' ');
                const lectureQuestionsResult = await generateQuestionsFromLectures(
                    courseIdPlaceholder, srtObjectsArray, chapterNameForLectures,
                    serverGoogleDrive, // Pass initialized GDrive service
                    finalApiKeyForAIServer // Pass array of keys
                );
                if (lectureQuestionsResult.success) {
                    results.googleDriveLinks.lectureQuestions.push({
                        chapterKey: lectureQuestionsResult.newChapterKey,
                        mcqId: lectureQuestionsResult.mcqGoogleDriveId, mcqLink: lectureQuestionsResult.mcqGoogleDriveLink,
                        problemsId: lectureQuestionsResult.problemsGoogleDriveId, problemsLink: lectureQuestionsResult.problemsGoogleDriveLink
                    });
                } else {
                    logProgress(`Failed to generate lecture questions for chapter key "${chapterKey}" (Google Drive): ${lectureQuestionsResult.message}`, results, 'warn');
                }
            }
            logProgress(`Lecture question generation completed. ${results.googleDriveLinks.lectureQuestions.length} sets generated.`, results);
        } else {
            logProgress('No lectures processed or no SRT links/IDs found. Skipping lecture question generation.', results);
        }

        results.firestoreDataPreview.currentAutomationStep = "Finalizing Firestore Data Preview";
        logProgress('Preparing Firestore data preview (Google Drive links/IDs).', results);
        results.firestoreDataPreview = {
            courseTitle: params.courseTitle, courseDirName: courseIdPlaceholder, aiGeneratedDescription: results.aiGeneratedDescription,
            majorTag: params.majorTag, subjectTag: params.subjectTag,
            gdriveCourseRootFolderId: courseGoogleDriveNode.id, gdriveCourseRootWebLink: courseGoogleDriveNode.webViewLink,
            gdriveTextbookFullPdfId: results.googleDriveLinks.originalTextbook?.id, gdriveTextbookFullPdfWebLink: results.googleDriveLinks.originalTextbook?.link,
            chapters: results.googleDriveLinks.processedChapters.map(pc => ({
                key: pc.key, title: pc.title, gdrivePdfId: pc.pdfId, gdrivePdfLink: pc.pdfLink,
                relatedTranscriptions: results.googleDriveLinks.transcriptions.filter(t => t.chapterKey === pc.key).map(t => ({ title: t.title, gdriveSrtId: t.srtId, gdriveSrtLink: t.srtLink })),
                gdrivePdfMcqId: results.googleDriveLinks.pdfQuestions.find(pq => pq.chapterKey === pc.key)?.mcqId,
                gdrivePdfMcqLink: results.googleDriveLinks.pdfQuestions.find(pq => pq.chapterKey === pc.key)?.mcqLink,
                gdrivePdfProblemsId: results.googleDriveLinks.pdfQuestions.find(pq => pq.chapterKey === pc.key)?.problemsId,
                gdrivePdfProblemsLink: results.googleDriveLinks.pdfQuestions.find(pq => pq.chapterKey === pc.key)?.problemsLink,
            })),
            lectureQuestionSets: results.googleDriveLinks.lectureQuestions.map(lq => ({
                key: lq.chapterKey, gdriveMcqId: lq.mcqId, gdriveMcqLink: lq.mcqLink,
                gdriveProblemsId: lq.problemsId, gdriveProblemsLink: lq.problemsLink,
            })),
            transcriptionLinks: results.googleDriveLinks.transcriptions.map(t => ({ title: t.title, chapterKey: t.chapterKey, gdriveSrtId: t.srtId, gdriveSrtLink: t.srtLink })),
            prerequisites: typeof prerequisites === 'string' && prerequisites.trim() !== '' ? prerequisites.split(',').map(p => p.trim()).filter(p => p) : [],
            bannerPicUrl: bannerPicUrl || null, coursePicUrl: coursePicUrl || null,
            status: "pending_review", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        logProgress(`Firestore Data Preview: ${JSON.stringify(results.firestoreDataPreview, null, 2)}`, results, 'info');
        if (results.firestoreDataPreview && results.firestoreDataPreview.status) {
            logProgress(`Course data prepared with status: '${results.firestoreDataPreview.status}'. Check for manual approval/publishing steps if not visible to users.`, results);
        }
        results.firestoreDataPreview.currentAutomationStep = "Attempting to Save Course to Firestore";
        logProgress('Attempting to save final course data to Firestore...', results);

        const firestoreSaveResult = await saveAutomatedCourseToFirestore(results.firestoreDataPreview);

        if (firestoreSaveResult.success) {
            logProgress(`Firestore write successful for course: ${firestoreSaveResult.courseId}`, results);
            results.success = true;
            results.message = `Course automation tasks completed successfully. Course ID: ${firestoreSaveResult.courseId} saved to Firestore.`;
            results.firestoreDataPreview.currentAutomationStep = "Course Saved to Firestore";
            results.firestoreDataPreview.courseId = firestoreSaveResult.courseId; // Add courseId to preview
        } else {
            logProgress(`Firestore write FAILED: ${firestoreSaveResult.message}`, results, 'error');
            results.success = false;
            results.message = `Course automation completed with errors. Firestore save FAILED: ${firestoreSaveResult.message}`;
            // Include more detailed error if available, truncate if too long
            const detailedError = firestoreSaveResult.error ? String(firestoreSaveResult.error).substring(0, 200) : firestoreSaveResult.message;
            results.firestoreDataPreview.currentAutomationStep = `Failed: Firestore Save Error - ${detailedError}`;
        }

    } catch (error) {
        logProgress(error, results, 'error');
        results.success = false;
        results.message = `Course automation failed: ${error.message || String(error)}`;
        results.firestoreDataPreview.currentAutomationStep = `Failed: ${error.message || String(error)}`;
    }
    return results;
}

module.exports = {
    automateNewCourseCreation,
    sanitizeCourseTitleForDirName
};
