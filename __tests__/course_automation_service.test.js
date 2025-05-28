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

jest.mock('../mega_service_server.js', () => ({
    initialize: jest.fn(() => Promise.resolve()),
    getMegaStorage: jest.fn(),
    findFolder: jest.fn(),
    createFolder: jest.fn(),
    uploadFile: jest.fn(),
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
    const serverMega = require('../mega_service_server');
    const aiServer = require('../ai_integration_server');
    const pdfProcessingService = require('../pdf_processing_service');
    const lectureTranscriptionService = require('../lecture_transcription_service');
    const pdfQuestionGenerationService = require('../pdf_question_generation_service');
    const lectureQuestionGenerationService = require('../lecture_question_generation_service');
    const serverConfig = require('../server_config'); // To modify GEMINI_API_KEY

    const mockMegaFolder = (name = 'mock-folder') => ({ 
        name: name, 
        link: jest.fn(() => Promise.resolve(`https://mega.nz/${name}-link`)), 
        id: `${name}-id`, 
        key: `${name}-key`
    });
    const mockMegaFile = (name = 'mock-file.pdf') => ({ 
        name: name, 
        link: `https://mega.nz/${name}-link` 
    });
    
    const defaultParams = {
        courseTitle: 'Test Course Full Meta',
        textbookPdfPath: '/fake/path/to/textbook.pdf',
        textbookPdfOriginalName: 'textbook.pdf',
        trueFirstPageNumber: 1,
        lectures: [
            { title: 'Lecture 1 Alpha', youtubeUrl: 'https://youtube.com/lec1alpha', associatedChapterKey: 'textbook_chapter_1' },
            { title: 'Lecture 2 Beta', filePath: '/fake/path/to/lec2beta.mp4', originalFileName: 'lec2beta.mp4', associatedChapterKey: 'textbook_chapter_2' },
        ],
        majorTag: 'Testing Major',
        subjectTag: 'Advanced Mocks',
        megaEmail: 'test@example.com',
        megaPassword: 'password',
        geminiApiKey: 'test-gemini-key-param',
        assemblyAiApiKey: 'test-assemblyai-key-param',
        prerequisites: 'Intro to Testing, Basic Jest',
        bannerPicUrl: 'https://example.com/banner.jpg',
        coursePicUrl: 'https://example.com/course.jpg',
    };

    beforeEach(() => {
        jest.clearAllMocks();

        fs.existsSync.mockReturnValue(true);
        
        const lyceumRoot = mockMegaFolder('LyceumCourses_Test');
        const courseFolder = mockMegaFolder(sanitizeCourseTitleForDirName(defaultParams.courseTitle));

        serverMega.initialize.mockResolvedValue(undefined);
        serverMega.getMegaStorage.mockReturnValue({ root: lyceumRoot });
        
        serverMega.findFolder
            .mockResolvedValueOnce(lyceumRoot) // First call for LYCEUM_ROOT_FOLDER_NAME
            .mockResolvedValueOnce(null);      // Second call for courseIdPlaceholder (not found)
                                             // Subsequent calls will create new mockMegaFolder

        serverMega.createFolder.mockImplementation((name) => Promise.resolve(mockMegaFolder(name)));
        serverMega.uploadFile.mockImplementation((path, name) => Promise.resolve(mockMegaFile(name)));

        aiServer.callGeminiTextAPI.mockResolvedValue('Mock AI Course Description from Gemini');
        
        pdfProcessingService.processTextbookPdf.mockResolvedValue({
            success: true,
            message: 'PDF processed successfully by mock',
            processedChapterDetails: [
                { title: 'Chapter 1 PDF Title', megaPdfLink: 'https://mega.nz/ch1.pdf', chapterNumber: 1 },
                { title: 'Chapter 2 PDF Title', megaPdfLink: 'https://mega.nz/ch2.pdf', chapterNumber: 2 },
            ],
        });

        lectureTranscriptionService.transcribeLecture.mockImplementation(async (youtubeUrl, courseId, chapterId) => ({
            success: true,
            message: 'Lecture transcribed successfully by mock',
            srtMegaLink: `https://mega.nz/lecture_${chapterId}.srt`,
        }));


        pdfQuestionGenerationService.generateQuestionsFromPdf.mockImplementation(async (courseId, chapterKey) => ({
            success: true,
            mcqMegaLink: `https://mega.nz/pdf-mcq-${chapterKey}.json`,
            problemsMegaLink: `https://mega.nz/pdf-problems-${chapterKey}.json`,
        }));

        lectureQuestionGenerationService.generateQuestionsFromLectures.mockImplementation(async (courseId, srtObjectsArray, chapterName) => ({
            success: true,
            newChapterKey: `lecture_questions_${chapterName.replace(/\s+/g, '_').toLowerCase()}`,
            mcqMegaLink: `https://mega.nz/lecture-mcq-${chapterName}.json`,
            problemsMegaLink: `https://mega.nz/lecture-problems-${chapterName}.json`,
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
            expect(results.firestoreDataPreview.currentAutomationStep).toBe('Completed');

            expect(serverMega.createFolder).toHaveBeenCalledTimes(4); // Lyceum Root (if needed), Course Folder, Textbook_Full, Transcriptions_Archive, Generated_Assessments
            expect(serverMega.createFolder).toHaveBeenCalledWith(sanitizeCourseTitleForDirName(params.courseTitle), expect.any(Object));
            expect(serverMega.createFolder).toHaveBeenCalledWith('Textbook_Full', expect.any(Object));
            expect(serverMega.createFolder).toHaveBeenCalledWith('Transcriptions_Archive', expect.any(Object));
            expect(serverMega.createFolder).toHaveBeenCalledWith('Generated_Assessments', expect.any(Object));

            expect(serverMega.uploadFile).toHaveBeenCalledTimes(1); 
            expect(pdfProcessingService.processTextbookPdf).toHaveBeenCalledTimes(1);
            expect(lectureTranscriptionService.transcribeLecture).toHaveBeenCalledTimes(params.lectures.length);
            expect(pdfQuestionGenerationService.generateQuestionsFromPdf).toHaveBeenCalledTimes(2); // For 2 processed PDF chapters
            
            // Based on unique associatedChapterKey for lectures
            const uniqueLectureChapterKeys = new Set(params.lectures.map(l => l.associatedChapterKey));
            expect(lectureQuestionGenerationService.generateQuestionsFromLectures).toHaveBeenCalledTimes(uniqueLectureChapterKeys.size);

            expect(aiServer.callGeminiTextAPI).toHaveBeenCalledTimes(1); 
            expect(results.firestoreDataPreview.megaMainFolderLink).toBeTruthy();
        });
    });

    describe('Scenario 2: Successful run *without* lectures', () => {
        it('should complete successfully, skipping lecture-related steps', async () => {
            const params = { ...defaultParams, lectures: [] }; // No lectures
            const results = await automateNewCourseCreation(params);

            expect(results.success).toBe(true);
            expect(lectureTranscriptionService.transcribeLecture).not.toHaveBeenCalled();
            expect(lectureQuestionGenerationService.generateQuestionsFromLectures).not.toHaveBeenCalled();
            expect(results.megaLinks.transcriptions).toEqual([]);
            expect(results.megaLinks.lectureQuestions).toEqual([]);
            
            const skippedLectureProcessingLog = results.progressLogs.find(log => log.message.includes('No lectures provided. Skipping lecture processing.'));
            expect(skippedLectureProcessingLog).toBeDefined();
            const skippedLectureQuestionsLog = results.progressLogs.find(log => log.message.includes('No lectures processed or no SRT links found. Skipping lecture question generation.'));
            expect(skippedLectureQuestionsLog).toBeDefined();

            expect(aiServer.callGeminiTextAPI).toHaveBeenCalledTimes(1);
            const descriptionCallArgs = aiServer.callGeminiTextAPI.mock.calls[0];
            const descriptionPrompt = descriptionCallArgs[1]; 
            expect(descriptionPrompt).not.toContain('It also includes lectures on:');

            expect(results.firestoreDataPreview.currentAutomationStep).toBe('Completed');
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
            const params = { ...defaultParams, geminiApiKey: '' }; // No key provided in params
             // Re-mock findFolder to provide the course folder directly on second call for this specific test
            const lyceumRoot = mockMegaFolder('LyceumCourses_Test');
            const courseFolder = mockMegaFolder(sanitizeCourseTitleForDirName(params.courseTitle));
            serverMega.findFolder
                .mockResolvedValueOnce(lyceumRoot) 
                .mockResolvedValueOnce(courseFolder); // Course folder found directly

            const results = await automateNewCourseCreation(params);
            expect(results.success).toBe(true); // Should succeed using global key
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
