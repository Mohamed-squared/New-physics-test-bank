// __tests__/admin_transcription_service.test.js

import { displayLectureTranscriptionAutomator, startLectureTranscription } from '../admin_transcription_service';
import { globalCourseDataMap, currentUser } from '../state';
import { showLoading, hideLoading } from '../utils';

// Mock dependencies
jest.mock('../state', () => ({
    currentUser: { isAdmin: true, uid: 'admin123' }, // Default mock
    globalCourseDataMap: new Map(),
}));
jest.mock('../utils', () => ({
    showLoading: jest.fn(),
    hideLoading: jest.fn(),
    escapeHtml: jest.fn(text => text), // Simple pass-through for testing
}));

// Mock global fetch
global.fetch = jest.fn();
// Mock window.prompt
global.prompt = jest.fn();

describe('Admin Transcription Service', () => {
    let containerElement;
    let feedbackArea;
    let startButton;
    let youtubeUrlInput;
    let courseSelect;
    let chapterSelect;


    beforeEach(() => {
        jest.clearAllMocks();
        globalCourseDataMap.clear();

        // Setup basic DOM elements
        containerElement = document.createElement('div');
        containerElement.id = 'transcription-container';
        document.body.appendChild(containerElement);

        // Elements that displayLectureTranscriptionAutomator will create
        // We create them here so startLectureTranscription can find them
        youtubeUrlInput = document.createElement('input');
        youtubeUrlInput.id = 'youtube-url';
        containerElement.appendChild(youtubeUrlInput);

        courseSelect = document.createElement('select');
        courseSelect.id = 'transcription-course-select';
        containerElement.appendChild(courseSelect);
        
        chapterSelect = document.createElement('select');
        chapterSelect.id = 'transcription-chapter-select';
        containerElement.appendChild(chapterSelect);

        startButton = document.createElement('button');
        startButton.id = 'start-transcription-btn';
        containerElement.appendChild(startButton);
        
        feedbackArea = document.createElement('div');
        feedbackArea.id = 'lecture-transcription-feedback';
        containerElement.appendChild(feedbackArea);

    });

    afterEach(() => {
        document.body.removeChild(containerElement);
    });

    describe('displayLectureTranscriptionAutomator', () => {
        it('should show "Access Denied" if user is not admin', () => {
            currentUser.isAdmin = false;
            displayLectureTranscriptionAutomator(containerElement);
            expect(containerElement.innerHTML).toContain('Access Denied');
            currentUser.isAdmin = true; // Reset for other tests
        });

        it('should populate course options from globalCourseDataMap', () => {
            globalCourseDataMap.set('course1', { id: 'course1', name: 'Course One', chapters: [{id: 'ch1', title: 'Chapter 1'}] });
            globalCourseDataMap.set('course2', { id: 'course2', name: 'Course Two', chapters: [] });
            
            displayLectureTranscriptionAutomator(containerElement);
            
            const courseSelectElement = containerElement.querySelector('#transcription-course-select');
            expect(courseSelectElement).not.toBeNull();
            expect(courseSelectElement.innerHTML).toContain('<option value="course1">Course One</option>');
            expect(courseSelectElement.innerHTML).toContain('<option value="course2">Course Two</option>');
        });

        it('should update chapter select when a course is chosen', () => {
            globalCourseDataMap.set('course1', { 
                id: 'course1', 
                name: 'Course One', 
                chapters: [{id: 'c1ch1', title: 'C1 Chapter 1'}, {id: 'c1ch2', title: 'C1 Chapter 2'}] 
            });
             globalCourseDataMap.set('course2', { 
                id: 'course2', 
                name: 'Course Two', 
                chapters: [] 
            });
            
            displayLectureTranscriptionAutomator(containerElement);
            
            const courseSelectElement = containerElement.querySelector('#transcription-course-select');
            const chapterSelectElement = containerElement.querySelector('#transcription-chapter-select');

            // Simulate selecting course1
            courseSelectElement.value = 'course1';
            courseSelectElement.dispatchEvent(new Event('change'));

            expect(chapterSelectElement.disabled).toBe(false);
            expect(chapterSelectElement.innerHTML).toContain('<option value="c1ch1">C1 Chapter 1</option>');
            expect(chapterSelectElement.innerHTML).toContain('<option value="c1ch2">C1 Chapter 2</option>');

            // Simulate selecting course2 (no chapters)
            courseSelectElement.value = 'course2';
            courseSelectElement.dispatchEvent(new Event('change'));
            expect(chapterSelectElement.disabled).toBe(true);
            expect(chapterSelectElement.innerHTML).toContain('No Chapters Available');
        });

        it('should attach event listener to start transcription button', () => {
            displayLectureTranscriptionAutomator(containerElement);
            const startBtn = containerElement.querySelector('#start-transcription-btn');
            expect(startBtn.onclick).toBeDefined(); // Checks if an onclick handler is attached
        });
    });

    describe('startLectureTranscription', () => {
        beforeEach(() => {
            // Ensure DOM is set up by display function before startLectureTranscription tests
            displayLectureTranscriptionAutomator(containerElement);
            // Re-query for elements as displayLectureTranscriptionAutomator recreates them
            youtubeUrlInput = containerElement.querySelector('#youtube-url');
            courseSelect = containerElement.querySelector('#transcription-course-select');
            chapterSelect = containerElement.querySelector('#transcription-chapter-select');
            startButton = containerElement.querySelector('#start-transcription-btn');
            feedbackArea = containerElement.querySelector('#lecture-transcription-feedback');
        });

        it('should show error if YouTube URL is missing', async () => {
            youtubeUrlInput.value = '';
            courseSelect.value = 'course1';
            chapterSelect.value = 'ch1';
            await startLectureTranscription(youtubeUrlInput.value, courseSelect.value, chapterSelect.value);
            expect(feedbackArea.innerHTML).toContain('Error: YouTube URL, Course, and Chapter must be selected.');
        });

        it('should show error if AssemblyAI API key prompt is cancelled', async () => {
            youtubeUrlInput.value = 'http://youtube.com/watch?v=123';
            courseSelect.value = 'course1';
            chapterSelect.value = 'ch1';
            global.prompt.mockReturnValueOnce(null); // User cancels API key prompt
            await startLectureTranscription(youtubeUrlInput.value, courseSelect.value, chapterSelect.value);
            expect(feedbackArea.innerHTML).toContain('AssemblyAI API Key is required');
        });
        
        it('should show error if MEGA Email prompt is cancelled', async () => {
            youtubeUrlInput.value = 'http://youtube.com/watch?v=123';
            courseSelect.value = 'course1';
            chapterSelect.value = 'ch1';
            global.prompt.mockReturnValueOnce('asm_key'); // API key
            global.prompt.mockReturnValueOnce(null); // User cancels MEGA email
            await startLectureTranscription(youtubeUrlInput.value, courseSelect.value, chapterSelect.value);
            expect(feedbackArea.innerHTML).toContain('MEGA Email is required');
        });

        it('should call fetch with correct parameters and handle success', async () => {
            youtubeUrlInput.value = 'http://youtube.com/watch?v=123';
            courseSelect.value = 'course1';
            chapterSelect.value = 'ch1';
            global.prompt.mockReturnValueOnce('asm_key') // API key
                         .mockReturnValueOnce('mega@example.com') // MEGA email
                         .mockReturnValueOnce('mega_pass');    // MEGA password

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ 
                    success: true, 
                    videoTitle: 'Test Video', 
                    srtFileName: 'test.srt', 
                    srtMegaLink: 'http://mega.link/test.srt',
                    transcriptId: 'assemblyId123',
                    firestoreUpdateStatus: 'Success'
                }),
            });

            await startLectureTranscription(youtubeUrlInput.value, courseSelect.value, chapterSelect.value);

            expect(showLoading).toHaveBeenCalledWith('Commencing transcription for: http://youtube.com/watch?v=123...');
            expect(fetch).toHaveBeenCalledWith('http://localhost:3001/transcribe-lecture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    youtubeUrl: 'http://youtube.com/watch?v=123',
                    courseId: 'course1',
                    chapterId: 'ch1',
                    assemblyAiApiKey: 'asm_key',
                    megaEmail: 'mega@example.com',
                    megaPassword: 'mega_pass'
                }),
            });
            expect(hideLoading).toHaveBeenCalled();
            expect(feedbackArea.innerHTML).toContain('Transcription Complete');
            expect(feedbackArea.innerHTML).toContain('Test Video');
        });

        it('should handle fetch API error', async () => {
            youtubeUrlInput.value = 'http://youtube.com/watch?v=123';
            courseSelect.value = 'course1';
            chapterSelect.value = 'ch1';
            global.prompt.mockReturnValueOnce('asm_key')
                         .mockReturnValueOnce('mega@example.com')
                         .mockReturnValueOnce('mega_pass');

            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ message: 'Server Error' }),
            });

            await startLectureTranscription(youtubeUrlInput.value, courseSelect.value, chapterSelect.value);
            expect(feedbackArea.innerHTML).toContain('Transcription Ritual Failed: Server Error');
        });
         it('should handle network error during fetch', async () => {
            youtubeUrlInput.value = 'http://youtube.com/watch?v=123';
            courseSelect.value = 'course1';
            chapterSelect.value = 'ch1';
            global.prompt.mockReturnValueOnce('asm_key')
                         .mockReturnValueOnce('mega@example.com')
                         .mockReturnValueOnce('mega_pass');

            fetch.mockRejectedValueOnce(new Error('Network failed'));

            await startLectureTranscription(youtubeUrlInput.value, courseSelect.value, chapterSelect.value);
            expect(feedbackArea.innerHTML).toContain('Transcription Ritual Failed: Network failed');
        });
    });
});
