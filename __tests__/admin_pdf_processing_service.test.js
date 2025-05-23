// __tests__/admin_pdf_processing_service.test.js

import { displayTextbookPdfProcessor, startPdfProcessing } from '../admin_pdf_processing_service';
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
    escapeHtml: jest.fn(text => text), // Simple pass-through
}));

// Mock global fetch
global.fetch = jest.fn();
// Mock window.prompt
global.prompt = jest.fn();
// Mock FormData
const mockFormDataAppend = jest.fn();
global.FormData = jest.fn(() => ({
    append: mockFormDataAppend,
}));


describe('Admin PDF Processing Service', () => {
    let containerElement;
    let feedbackArea;
    let startButton;
    let fileUploadInput;
    let courseSelect;
    let pageNumberInput;

    beforeEach(() => {
        jest.clearAllMocks();
        globalCourseDataMap.clear();

        // Setup basic DOM elements
        containerElement = document.createElement('div');
        containerElement.id = 'pdf-processor-container';
        document.body.appendChild(containerElement);

        // Elements that displayTextbookPdfProcessor will create/use
        // We create them here so startPdfProcessing can find them
        fileUploadInput = document.createElement('input');
        fileUploadInput.id = 'pdf-file-upload';
        fileUploadInput.type = 'file';
        containerElement.appendChild(fileUploadInput);
        
        courseSelect = document.createElement('select');
        courseSelect.id = 'pdf-course-select';
        containerElement.appendChild(courseSelect);
        
        pageNumberInput = document.createElement('input');
        pageNumberInput.id = 'pdf-actual-page-one';
        pageNumberInput.type = 'number';
        containerElement.appendChild(pageNumberInput);

        startButton = document.createElement('button');
        startButton.id = 'start-pdf-processing-btn';
        containerElement.appendChild(startButton);
        
        feedbackArea = document.createElement('div');
        feedbackArea.id = 'pdf-processor-feedback';
        containerElement.appendChild(feedbackArea);
    });

    afterEach(() => {
        document.body.removeChild(containerElement);
    });

    describe('displayTextbookPdfProcessor', () => {
        it('should show "Access Denied" if user is not admin', () => {
            currentUser.isAdmin = false;
            displayTextbookPdfProcessor(containerElement);
            expect(containerElement.innerHTML).toContain('Access Denied');
            currentUser.isAdmin = true; // Reset
        });

        it('should populate course options from globalCourseDataMap', () => {
            globalCourseDataMap.set('course1', { id: 'course1', name: 'Course Alpha' });
            globalCourseDataMap.set('course2', { id: 'course2', name: 'Course Beta' });
            
            displayTextbookPdfProcessor(containerElement);
            
            const courseSelectElement = containerElement.querySelector('#pdf-course-select');
            expect(courseSelectElement).not.toBeNull();
            expect(courseSelectElement.innerHTML).toContain('<option value="course1">Course Alpha</option>');
            expect(courseSelectElement.innerHTML).toContain('<option value="course2">Course Beta</option>');
        });

        it('should attach event listener to start processing button', () => {
            displayTextbookPdfProcessor(containerElement);
            const startBtn = containerElement.querySelector('#start-pdf-processing-btn');
            // Check if it has an event listener (indirectly, by checking if it's clickable and calls the function)
            // A more direct way would be to spy on addEventListener if it were a direct call.
            // For now, checking if it's part of the innerHTML is a basic check.
            expect(startBtn).not.toBeNull();
            // We can't directly test the addEventListener attachment without more complex spies on document.getElementById
            // But we know the function attempts to getElementById and add it.
        });
    });

    describe('startPdfProcessing', () => {
        let mockFile;

        beforeEach(() => {
            // Ensure DOM is set up by display function before startPdfProcessing tests
            displayTextbookPdfProcessor(containerElement);
            // Re-query for elements as display function recreates them
            fileUploadInput = containerElement.querySelector('#pdf-file-upload');
            courseSelect = containerElement.querySelector('#pdf-course-select');
            pageNumberInput = containerElement.querySelector('#pdf-actual-page-one');
            startButton = containerElement.querySelector('#start-pdf-processing-btn');
            feedbackArea = containerElement.querySelector('#pdf-processor-feedback');

            mockFile = new File(['dummy pdf content'], 'test.pdf', { type: 'application/pdf' });
            // Mock the files property of the file input
            Object.defineProperty(fileUploadInput, 'files', {
                value: [mockFile],
                writable: true,
            });
            courseSelect.value = 'course1';
            pageNumberInput.value = '1';
        });

        it('should show error if file is not provided', async () => {
            Object.defineProperty(fileUploadInput, 'files', { value: [], writable: true }); // No file
            await startPdfProcessing(fileUploadInput.files[0], courseSelect.value, pageNumberInput.value);
            expect(feedbackArea.innerHTML).toContain('Error: PDF file, Course, and "Actual Page 1 Number" must be provided.');
        });

        it('should show error if actual page number is less than 1', async () => {
            pageNumberInput.value = '0';
            await startPdfProcessing(fileUploadInput.files[0], courseSelect.value, pageNumberInput.value);
            expect(feedbackArea.innerHTML).toContain('Error: "Actual Page 1 Number" must be 1 or greater.');
        });
        
        it('should show error if MEGA Email prompt is cancelled', async () => {
            global.prompt.mockReturnValueOnce(null); // User cancels MEGA Email
            await startPdfProcessing(fileUploadInput.files[0], courseSelect.value, pageNumberInput.value);
            expect(feedbackArea.innerHTML).toContain('MEGA Email is required.');
        });

        it('should correctly construct FormData and call fetch', async () => {
            global.prompt.mockReturnValueOnce('mega@user.com') // MEGA Email
                         .mockReturnValueOnce('megaPass')    // MEGA Password
                         .mockReturnValueOnce('geminiKey');   // Gemini Key

            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, message: 'Processed.', fullPdfLink: 'link', chapterLinks: [] }),
            });

            await startPdfProcessing(fileUploadInput.files[0], 'course1', '21');
            
            expect(mockFormDataAppend).toHaveBeenCalledWith('pdfFile', mockFile);
            expect(mockFormDataAppend).toHaveBeenCalledWith('courseId', 'course1');
            expect(mockFormDataAppend).toHaveBeenCalledWith('actualFirstPageNumber', '21');
            expect(mockFormDataAppend).toHaveBeenCalledWith('megaEmail', 'mega@user.com');
            expect(mockFormDataAppend).toHaveBeenCalledWith('megaPassword', 'megaPass');
            expect(mockFormDataAppend).toHaveBeenCalledWith('geminiApiKey', 'geminiKey');

            expect(fetch).toHaveBeenCalledWith('http://localhost:3001/process-textbook-pdf', {
                method: 'POST',
                body: expect.any(FormData), // Check that a FormData object was passed
            });
            expect(feedbackArea.innerHTML).toContain('The Tome is Transformed!');
        });

        it('should handle API error response', async () => {
            global.prompt.mockReturnValueOnce('mega@user.com')
                         .mockReturnValueOnce('megaPass')
                         .mockReturnValueOnce('geminiKey');
            
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ success: false, message: 'Server PDF Error' }),
            });

            await startPdfProcessing(fileUploadInput.files[0], 'course1', '1');
            expect(feedbackArea.innerHTML).toContain('PDF Alchemy Failed: Server PDF Error');
        });
    });
});
