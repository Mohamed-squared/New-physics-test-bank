// __tests__/course_automation_service.test.js

const {
    sanitizeCourseTitleForDirName,
    automateNewCourseCreation,
} = require('../course_automation_service');

// Mock dependencies
jest.mock('fs-extra', () => ({
    existsSync: jest.fn(),
    remove: jest.fn(() => Promise.resolve()), 
}));

// Mock Google Drive Server Service
jest.mock('../google_drive_service_server.js', () => ({
    initialize: jest.fn(() => Promise.resolve()),
    findOrCreateFolder: jest.fn(),
    uploadFile: jest.fn(),
    // getFolderContents: jest.fn(), // Add if needed by course_automation_service directly
    // getFileLink: jest.fn(), // Add if needed
}));

jest.mock('../ai_integration_server.js', () => ({
    callGeminiTextAPI: jest.fn(),
}));

jest.mock('../pdf_processing_service.js', () => ({
    processTextbookPdf: jest.fn(),
}));

jest.mock('../lecture_transcription_service.js', () => ({
    transcribeLecture: jest.fn(),
}));

jest.mock('../pdf_question_generation_service.js', () => ({
    generateQuestionsFromPdf: jest.fn(),
}));

jest.mock('../lecture_question_generation_service.js', () => ({
    generateQuestionsFromLectures: jest.fn(),
}));

jest.mock('../server_config.js', () => ({
    GEMINI_API_KEY: 'mock-global-gemini-key',
    GOOGLE_DRIVE_API_KEY: 'mock-drive-api-key', // Added Drive API key
}));


describe('sanitizeCourseTitleForDirName', () => {
    it('should return a sanitized title for a regular input', () => {
        expect(sanitizeCourseTitleForDirName('My Course Title')).toBe('my_course_title');
    });

    it('should handle spaces and mixed case', () => {
        expect(sanitizeCourseTitleForDirName('Another Course With Spaces')).toBe('another_course_with_spaces');
    });

    it('should remove special characters', () => {
        expect(sanitizeCourseTitleForDirName('Course!@#$%^&*()_+=-[]{};:\'",.<>/?`~Title')).toBe('coursetitle');
    });
    
    it('should handle leading/trailing spaces before sanitization', () => {
        expect(sanitizeCourseTitleForDirName('  Spaced Out Title  ')).toBe('spaced_out_title');
    });

    it('should handle an empty title', () => {
        expect(sanitizeCourseTitleForDirName('')).toBe('untitled_course');
    });
    
    it('should handle null or undefined title', () => {
        expect(sanitizeCourseTitleForDirName(null)).toBe('untitled_course');
        expect(sanitizeCourseTitleForDirName(undefined)).toBe('untitled_course');
    });


    it('should truncate long titles to 75 characters', () => {
        const longTitle = 'This is a very very very long course title that definitely exceeds the seventy-five character limit for directory names, so it should be truncated properly.';
        const expected = 'this_is_a_very_very_very_long_course_title_that_definitely_exceeds_the_seve'; // 75 chars
        expect(sanitizeCourseTitleForDirName(longTitle).length).toBe(75);
        expect(sanitizeCourseTitleForDirName(longTitle)).toBe(expected);
    });
});

describe('automateNewCourseCreation', () => {
    const fs = require('fs-extra');
    const serverDrive = require('../google_drive_service_server'); // Renamed
    const aiServer = require('../ai_integration_server');
    const pdfProcessingService = require('../pdf_processing_service');
    const lectureTranscriptionService = require('../lecture_transcription_service');
    const pdfQuestionGenerationService = require('../pdf_question_generation_service');
    const lectureQuestionGenerationService = require('../lecture_question_generation_service');
    const serverConfig = require('../server_config');

    // Helper to mock Drive folder creation/finding
    const mockDriveFolder = (id = 'mock-folder-id', name = 'mock-folder') => id; // findOrCreateFolder returns ID

    // Helper to mock Drive file upload
    const mockDriveFile = (name = 'mock-file.pdf', id = 'mock-file-id') => ({
        name: name, 
        id: id,
        webViewLink: `https://drive.google.com/file/d/${id}/view`
    });
    
    const defaultParams = {
        courseTitle: 'Test Course Full Meta',
        textbookPdfPath: '/fake/path/to/textbook.pdf',
        textbookPdfOriginalName: 'textbook.pdf',
        trueFirstPageNumber: 1,
        lectures: [ // Assuming links might be Drive links post-transcription/processing
            { title: 'Lecture 1 Alpha', youtubeUrl: 'https://youtube.com/lec1alpha', associatedChapterKey: 'textbook_chapter_1' },
            { title: 'Lecture 2 Beta', filePath: '/fake/path/to/lec2beta.mp4', originalFileName: 'lec2beta.mp4', associatedChapterKey: 'textbook_chapter_2' },
        ],
        majorTag: 'Testing Major',
        subjectTag: 'Advanced Mocks',
        // megaEmail and megaPassword removed
        geminiApiKey: 'test-gemini-key-param',
        assemblyAiApiKey: 'test-assemblyai-key-param',
        prerequisites: 'Intro to Testing, Basic Jest',
        bannerPicUrl: 'https://example.com/banner.jpg',
        coursePicUrl: 'https://example.com/course.jpg',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        fs.existsSync.mockReturnValue(true);
        
        serverDrive.initialize.mockResolvedValue(undefined); // Initialize Drive service
        
        // Mock findOrCreateFolder to return IDs
        serverDrive.findOrCreateFolder
            .mockResolvedValueOnce('lyceumRootDriveFolderId')    // For LYCEUM_ROOT_FOLDER_NAME
            .mockResolvedValueOnce('courseDriveFolderId')        // For courseIdPlaceholder
            .mockResolvedValueOnce('textbookFullDriveFolderId')  // For TEXTBOOK_FULL_DIR_NAME
            .mockResolvedValueOnce('transcriptionsArchiveDriveFolderId') // For TRANSCRIPTIONS_ARCHIVE_DIR_NAME
            .mockResolvedValueOnce('generatedAssessmentsDriveFolderId'); // For GENERATED_ASSESSMENTS_DIR_NAME
            // Add more if other direct calls are made in the main function

        serverDrive.uploadFile.mockImplementation((path, name, folderId) =>
            Promise.resolve(mockDriveFile(name, `${name}-drive-id`))
        );

        aiServer.callGeminiTextAPI.mockResolvedValue('Mock AI Course Description from Gemini');
        
        // Sub-services now need to return Drive-like links/IDs
        pdfProcessingService.processTextbookPdf.mockResolvedValue({
            success: true,
            message: 'PDF processed successfully by mock (Drive)',
            processedChapterDetails: [ // Assuming this structure is adapted
                { title: 'Chapter 1 PDF Title', driveLink: 'https://drive.google.com/ch1-drive-id', driveId: 'ch1-drive-id', chapterNumber: 1 },
                { title: 'Chapter 2 PDF Title', driveLink: 'https://drive.google.com/ch2-drive-id', driveId: 'ch2-drive-id', chapterNumber: 2 },
            ],
        });

        lectureTranscriptionService.transcribeLecture.mockImplementation(async (youtubeUrl, courseId, chapterKey, assemblyAiApiKey, driveApiKey, parentFolderId) => ({
            success: true,
            message: 'Lecture transcribed successfully by mock (Drive)',
            srtDriveLink: `https://drive.google.com/lecture_${chapterKey}.srt-id`, // Example Drive link
            srtDriveId: `lecture_${chapterKey}.srt-id`,
        }));

        pdfQuestionGenerationService.generateQuestionsFromPdf.mockImplementation(async (courseId, chapterKey, pdfDriveLink, chapterTitle, driveApiKey, parentAssessmentsFolderId, geminiApiKey) => ({
            success: true,
            driveMcqLink: `https://drive.google.com/pdf-mcq-${chapterKey}-id`,
            driveMcqId: `pdf-mcq-${chapterKey}-id`,
            driveProblemsLink: `https://drive.google.com/pdf-problems-${chapterKey}-id`,
            driveProblemsId: `pdf-problems-${chapterKey}-id`,
        }));

        lectureQuestionGenerationService.generateQuestionsFromLectures.mockImplementation(async (courseId, srtObjectsArray, chapterName, driveApiKey, parentAssessmentsFolderId, geminiApiKey) => ({
            success: true,
            newChapterKey: `lecture_questions_${chapterName.replace(/\s+/g, '_').toLowerCase()}`,
            driveMcqLink: `https://drive.google.com/lecture-mcq-${chapterName}-id`,
            driveMcqId: `lecture-mcq-${chapterName}-id`,
            driveProblemsLink: `https://drive.google.com/lecture-problems-${chapterName}-id`,
            driveProblemsId: `lecture-problems-${chapterName}-id`,
        }));
        
        serverConfig.GEMINI_API_KEY = 'mock-global-gemini-key-default'; 
    });

    describe('Scenario 1: Successful run with lectures and all metadata', () => {
        it('should complete successfully and return expected results structure', async () => {
            const params = { ...defaultParams };
            const results = await automateNewCourseCreation(params);

            expect(results.success).toBe(true);
            expect(results.message).toBe('Course automation tasks completed successfully. Firestore data preview logged.');
            
            expect(results.firestoreDataPreview.prerequisites).toEqual(['Intro to Testing', 'Basic Jest']);
            expect(results.firestoreDataPreview.bannerPicUrl).toBe(params.bannerPicUrl);
            expect(results.firestoreDataPreview.coursePicUrl).toBe(params.coursePicUrl);

            expect(results.progressLogs.length).toBeGreaterThan(10); 
            expect(results.firestoreDataPreview.currentAutomationStep).toBe('Completed'); // Or final step name

            expect(serverDrive.findOrCreateFolder).toHaveBeenCalledWith('LyceumCourses_Test', undefined); // Root call
            expect(serverDrive.findOrCreateFolder).toHaveBeenCalledWith(sanitizeCourseTitleForDirName(params.courseTitle), 'lyceumRootDriveFolderId');
            expect(serverDrive.findOrCreateFolder).toHaveBeenCalledWith('Textbook_Full', 'courseDriveFolderId');
            expect(serverDrive.findOrCreateFolder).toHaveBeenCalledWith('Transcriptions_Archive', 'courseDriveFolderId');
            expect(serverDrive.findOrCreateFolder).toHaveBeenCalledWith('Generated_Assessments', 'courseDriveFolderId');

            expect(serverDrive.uploadFile).toHaveBeenCalledTimes(1); // For the original textbook

            expect(pdfProcessingService.processTextbookPdf).toHaveBeenCalledWith(
                params.textbookPdfPath,
                sanitizeCourseTitleForDirName(params.courseTitle),
                params.trueFirstPageNumber,
                serverConfig.GOOGLE_DRIVE_API_KEY, // Expect Drive API key
                'courseDriveFolderId', // Expect parent Drive folder ID
                params.geminiApiKey // Gemini key
            );
            expect(lectureTranscriptionService.transcribeLecture).toHaveBeenCalledTimes(params.lectures.length);
            // Check one call to ensure Drive parameters are passed
             expect(lectureTranscriptionService.transcribeLecture).toHaveBeenNthCalledWith(1,
                params.lectures[0].youtubeUrl,
                sanitizeCourseTitleForDirName(params.courseTitle),
                params.lectures[0].associatedChapterKey,
                params.assemblyAiApiKey,
                serverConfig.GOOGLE_DRIVE_API_KEY,
                'transcriptionsArchiveDriveFolderId' // Passed parent folder ID
            );

            expect(pdfQuestionGenerationService.generateQuestionsFromPdf).toHaveBeenCalledTimes(2); // For 2 processed PDF chapters
            // Check one call
            expect(pdfQuestionGenerationService.generateQuestionsFromPdf).toHaveBeenNthCalledWith(1,
                sanitizeCourseTitleForDirName(params.courseTitle), // courseId
                'textbook_chapter_1', // chapterKey from processed PDF
                'https://drive.google.com/ch1-drive-id', // driveLink from processed PDF
                'Chapter 1 PDF Title', // chapterTitle from processed PDF
                serverDrive, // Initialized serverDrive instance
                serverConfig.GOOGLE_DRIVE_API_KEY, // Drive API Key for internal operations
                'generatedAssessmentsDriveFolderId', // Parent folder for outputs
                params.geminiApiKey // Gemini API key
            );
            
            const uniqueLectureChapterKeys = new Set(params.lectures.map(l => l.associatedChapterKey));
            expect(lectureQuestionGenerationService.generateQuestionsFromLectures).toHaveBeenCalledTimes(uniqueLectureChapterKeys.size);
             // Check one call
            expect(lectureQuestionGenerationService.generateQuestionsFromLectures).toHaveBeenNthCalledWith(1,
                sanitizeCourseTitleForDirName(params.courseTitle),
                expect.arrayContaining([expect.objectContaining({ title: 'Lecture 1 Alpha', srtDriveLink: expect.any(String) })]),
                'Chapter 1 PDF Title', // chapterName (derived if not directly passed)
                serverConfig.GOOGLE_DRIVE_API_KEY,
                'generatedAssessmentsDriveFolderId',
                params.geminiApiKey
            );

            expect(aiServer.callGeminiTextAPI).toHaveBeenCalledTimes(1); 
            expect(results.firestoreDataPreview.driveFolderId).toBe('courseDriveFolderId');
            expect(results.firestoreDataPreview.driveCourseRootLink).toContain('courseMainDriveFolderId'); // Constructed link
            expect(results.driveLinks.originalTextbook).toContain('textbook.pdf-drive-id');
        });
    });

    describe('Scenario 2: Successful run *without* lectures', () => {
        it('should complete successfully, skipping lecture-related steps', async () => {
            const params = { ...defaultParams, lectures: [] }; // No lectures
            const results = await automateNewCourseCreation(params);

            expect(results.success).toBe(true);
            expect(lectureTranscriptionService.transcribeLecture).not.toHaveBeenCalled();
            expect(lectureQuestionGenerationService.generateQuestionsFromLectures).not.toHaveBeenCalled();
            expect(results.driveLinks.transcriptions).toEqual([]); // Check driveLinks
            expect(results.driveLinks.lectureQuestions).toEqual([]); // Check driveLinks
            
            const skippedLectureProcessingLog = results.progressLogs.find(log => log.message.includes('No lectures provided. Skipping lecture processing.'));
            expect(skippedLectureProcessingLog).toBeDefined();
            const skippedLectureQuestionsLog = results.progressLogs.find(log => log.message.includes('No lectures processed or no SRT links found. Skipping lecture question generation.'));
            expect(skippedLectureQuestionsLog).toBeDefined();

            expect(aiServer.callGeminiTextAPI).toHaveBeenCalledTimes(1);
            // Check that the prompt for AI description does not include lecture part
            const descriptionCallArgs = aiServer.callGeminiTextAPI.mock.calls[0]; // Get arguments of the first call
            const descriptionPrompt = descriptionCallArgs[1]; // Second argument is the prompt
            expect(descriptionPrompt).not.toContain('It also includes lectures on:');

            expect(results.firestoreDataPreview.currentAutomationStep).toBe('Completed'); // Or final step name
        });
    });

    describe('Scenario 3: API Key Missing (Gemini)', () => {
        it('should fail if Gemini API key is missing and no global default', async () => {
            serverConfig.GEMINI_API_KEY = null; // Simulate no global key
            const params = { ...defaultParams, geminiApiKey: '' }; 

            const results = await automateNewCourseCreation(params);

            expect(results.success).toBe(false);
            expect(results.message).toMatch(/CRITICAL: No valid Gemini API Key could be resolved/i);
            expect(results.firestoreDataPreview.currentAutomationStep).toMatch(/Failed: Gemini API Key missing/i);
            
            const criticalErrorLog = results.progressLogs.find(log => log.message.includes('CRITICAL: No valid Gemini API Key'));
            expect(criticalErrorLog).toBeDefined();
        });

        it('should use global default if param key is missing', async () => {
            serverConfig.GEMINI_API_KEY = 'global-fallback-key'; // Ensure global key is set
            const params = { ...defaultParams, geminiApiKey: '' };

            // Ensure Drive mocks are set up for a successful run otherwise
            serverDrive.findOrCreateFolder.mockResolvedValue('someFolderId');
            serverDrive.uploadFile.mockResolvedValue({ id: 'fileId', webViewLink: 'link' });
            pdfProcessingService.processTextbookPdf.mockResolvedValue({ success: true, processedChapterDetails: [] });
            // No lectures, so transcribe and lecture Q gen won't be called.
            aiServer.callGeminiTextAPI.mockResolvedValue("AI Description");


            const results = await automateNewCourseCreation(params);
            expect(results.success).toBe(true);
            const usedGlobalKeyLog = results.progressLogs.find(log => log.message.includes('Using global default GEMINI_API_KEY.'));
            expect(usedGlobalKeyLog).toBeDefined();
        });
    });

    describe('Scenario 4: Failure in a sub-service (processTextbookPdf fails)', () => {
        it('should fail and reflect the sub-service error message and step', async () => {
            const failureMessage = 'Simulated PDF processing failure from test';
            pdfProcessingService.processTextbookPdf.mockResolvedValue({
                success: false,
                message: failureMessage,
            });
            const params = { ...defaultParams };
            const results = await automateNewCourseCreation(params);

            expect(results.success).toBe(false);
            expect(results.message).toContain(failureMessage);
            
            const failureStepLog = results.progressLogs.find(log => log.message.includes(failureMessage));
            expect(failureStepLog).toBeDefined(); 
            
            expect(results.firestoreDataPreview.currentAutomationStep).toMatch(`Failed: Textbook PDF processing failed: ${failureMessage.substring(0,50)}`);
        });
    });
});
