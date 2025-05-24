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
        assemblyAiApiKey
    } = params;

    const courseIdPlaceholder = sanitizeCourseTitleForDirName(courseTitle); // Using sanitized title as a unique course identifier for now
    console.log(`[AutomationService] Starting automated course creation for: "${courseTitle}" (ID Placeholder: ${courseIdPlaceholder})`);

    const finalApiKey = geminiApiKey || GEMINI_API_KEY; // Use passed-in key first

    const results = {
        success: false,
        message: "",
        courseTitle: courseTitle,
        courseDirName: courseIdPlaceholder,
        aiGeneratedDescription: null,
        megaLinks: {
            originalTextbook: null,
            processedChapters: [], // { title, pdfLink, key (chapterKey from pdf_processing) }
            transcriptions: [], // { title, srtLink, chapterKey }
            pdfQuestions: [], // { chapterKey, mcqLink, problemsLink }
            lectureQuestions: [] // { chapterKey, mcqLink, problemsLink }
        },
        firestoreDataPreview: {}
    };

    try {
        // --- 1. Initialization & Setup ---
        console.log('[AutomationService] Initializing Mega service...');
        await serverMega.initialize(megaEmail, megaPassword);
        const megaStorage = serverMega.getMegaStorage();
        if (!megaStorage || !megaStorage.root) throw new Error("Mega service initialization failed.");

        console.log(`[AutomationService] Creating base Mega folder structure for ${courseIdPlaceholder}...`);
        let lyceumRootNode = await serverMega.findFolder(LYCEUM_ROOT_FOLDER_NAME, megaStorage.root);
        if (!lyceumRootNode) lyceumRootNode = await serverMega.createFolder(LYCEUM_ROOT_FOLDER_NAME, megaStorage.root);
        if (!lyceumRootNode) throw new Error(`Failed to find or create Lyceum root folder: ${LYCEUM_ROOT_FOLDER_NAME}`);

        let courseMegaNode = await serverMega.findFolder(courseIdPlaceholder, lyceumRootNode);
        if (!courseMegaNode) courseMegaNode = await serverMega.createFolder(courseIdPlaceholder, lyceumRootNode);
        if (!courseMegaNode) throw new Error(`Failed to create main course folder: ${courseIdPlaceholder}`);
        console.log(`[AutomationService] Main course folder on Mega: ${courseMegaNode.name}`);

        const textbookFullMegaFolder = await serverMega.createFolder("Textbook_Full", courseMegaNode);
        // pdf_processing_service is assumed to create Textbook_Chapters under its own course-derived path
        // For now, let's assume it will create it under courseMegaNode. If not, this needs adjustment.
        // const textbookChaptersMegaFolder = await serverMega.createFolder("Textbook_Chapters", courseMegaNode);
        const transcriptionsArchiveMegaFolder = await serverMega.createFolder("Transcriptions_Archive", courseMegaNode);
        // Question generation services create subfolders under Generated_Assessments/{courseDirName}/{chapterKey}
        const generatedAssessmentsMegaFolder = await serverMega.createFolder("Generated_Assessments", courseMegaNode);


        // --- 2. Textbook Processing ---
        console.log(`[AutomationService] Uploading original textbook: ${textbookPdfOriginalName}`);
        if (!fs.existsSync(textbookPdfPath)) throw new Error(`Textbook PDF not found at local path: ${textbookPdfPath}`);
        const uploadedTextbook = await serverMega.uploadFile(textbookPdfPath, textbookPdfOriginalName, textbookFullMegaFolder);
        results.megaLinks.originalTextbook = uploadedTextbook.link;
        console.log(`[AutomationService] Original textbook uploaded to Mega: ${uploadedTextbook.link}`);

        console.log('[AutomationService] Processing textbook PDF for chapters...');
        // processTextbookPdf uses courseIdPlaceholder to create its own structures on Mega.
        // It's assumed it uses megaEmail, megaPassword for its internal Mega operations correctly.
        const textbookProcessingResult = await processTextbookPdf(
            textbookPdfPath,
            courseIdPlaceholder, // This will be used by processTextbookPdf to structure its output on Mega
            trueFirstPageNumber,
            megaEmail, // Pass credentials for processTextbookPdf internal Mega ops
            megaPassword,
            finalApiKey
        );
        if (!textbookProcessingResult.success) throw new Error(`Textbook PDF processing failed: ${textbookProcessingResult.message}`);
        results.megaLinks.processedChapters = textbookProcessingResult.chaptersProcessed.map(ch => ({
            title: ch.title, // Assuming 'title' is part of chapterFirestoreData structure
            pdfLink: ch.megaPdfLink, // Assuming 'megaPdfLink' is part of chapterFirestoreData
            key: `textbook_chapter_${ch.chapterNumber}` // Assuming 'chapterNumber' is part of chapterFirestoreData
        }));
        console.log(`[AutomationService] Textbook processing completed. ${results.megaLinks.processedChapters.length} chapters processed.`);
        const tocForAIDescription = results.megaLinks.processedChapters.map(ch => `Chapter ${ch.key.split('_')[2]}: ${ch.title}`).join('\n');


        // --- 3. Lecture Processing ---
        console.log('[AutomationService] Processing lectures...');
        const lectureSrtLinksByChapterKey = {};
        const lectureTitlesForAIDescription = [];

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
                // transcribeLecture uses courseIdPlaceholder and chapterId to structure its output on Mega.
                // It is assumed to use megaEmail, megaPassword for its internal Mega ops correctly.
                // The chapterId for transcribeLecture should be chapterKeyForLecture
                const transcriptionResult = await transcribeLecture(
                    lecture.youtubeUrl || null, // Pass null if not available
                    courseIdPlaceholder,        // Course context for Mega structure
                    chapterKeyForLecture,       // Chapter context for Mega structure
                    assemblyAiApiKey,
                    megaEmail,
                    megaPassword
                    // filePath is not directly handled by transcribeLecture in current definition;
                    // if it were, it would be passed here. For now, assuming ytdl handles URLs.
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


        // --- 4. AI Course Description ---
        console.log('[AutomationService] Generating AI course description...');
        const descriptionPrompt = `
Generate a concise and engaging course description for a new course titled "${courseTitle}".
The course covers the following major topics (from textbook table of contents):
${tocForAIDescription}

It also includes lectures on:
${lectureTitlesForAIDescription.join('\n')}

The course falls under the major category of "${majorTag}" and the specific subject of "${subjectTag}".
Highlight the key learning outcomes and what students will gain from this course. Keep it under 150 words.
        `;
        results.aiGeneratedDescription = await aiServer.callGeminiTextAPI(finalApiKey, descriptionPrompt, null, "You are a course catalog editor creating compelling course descriptions.");
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
                finalApiKey
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

        console.log('[AutomationService] Generating questions from lectures...');
        for (const chapterKey of Object.keys(lectureSrtLinksByChapterKey)) {
            const srtObjectsArray = lectureSrtLinksByChapterKey[chapterKey]; // Array of { title, megaSrtLink }
            const chapterNameForLectures = lectures.find(l => l.associatedChapterKey === chapterKey)?.title || chapterKey.replace(/_/g, ' '); // Attempt to find a representative name
            
            console.log(`[AutomationService] Generating lecture questions for chapter/topic: "${chapterNameForLectures}" (Key: ${chapterKey})`);
            // generateQuestionsFromLectures uses courseIdPlaceholder and chapterKey to structure its output on Mega.
            const lectureQuestionsResult = await generateQuestionsFromLectures(
                courseIdPlaceholder,
                srtObjectsArray,
                chapterNameForLectures,
                megaEmail,
                megaPassword,
                finalApiKey
            );
            if (lectureQuestionsResult.success) {
                results.megaLinks.lectureQuestions.push({
                    chapterKey: lectureQuestionsResult.newChapterKey, // This service might generate its own key
                    mcqLink: lectureQuestionsResult.mcqMegaLink,
                    problemsLink: lectureQuestionsResult.problemsMegaLink
                });
            } else {
                console.warn(`[AutomationService] Failed to generate lecture questions for chapter key "${chapterKey}": ${lectureQuestionsResult.message}`);
            }
        }
        console.log(`[AutomationService] Lecture question generation completed. ${results.megaLinks.lectureQuestions.length} sets generated.`);

        // --- 6. Result Aggregation & Firestore Data Preparation ---
        results.firestoreDataPreview = {
            courseTitle: params.courseTitle,
            courseDirName: courseIdPlaceholder,
            aiGeneratedDescription: results.aiGeneratedDescription,
            majorTag: params.majorTag,
            subjectTag: params.subjectTag,
            megaMainFolderLink: courseMegaNode.link ? await courseMegaNode.link({key: courseMegaNode.key}) : 'N/A', // Assuming link method exists
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
            status: "pending_review", // Initial status
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        console.log('[AutomationService] Firestore Data Preview:', JSON.stringify(results.firestoreDataPreview, null, 2));
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
