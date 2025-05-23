// __tests__/admin_question_generation_service.test.js

import { 
    displayPdfMcqProblemGenerator, 
    startPdfMcqProblemGeneration,
    displayLectureMcqProblemGenerator,
    startLectureMcqProblemGeneration
} from '../admin_question_generation_service';
import { globalCourseDataMap, currentUser } from '../state';
import { showLoading, hideLoading, escapeHtml, unescape } from '../utils';

// Mock dependencies
jest.mock('../state', () => ({
    currentUser: { isAdmin: true, uid: 'admin123' }, // Default mock
    globalCourseDataMap: new Map(),
}));
jest.mock('../utils', () => ({
    showLoading: jest.fn(),
    hideLoading: jest.fn(),
    escapeHtml: jest.fn(text => text), // Simple pass-through
    unescape: jest.fn(text => text), // Simple pass-through
}));

// Mock global fetch
global.fetch = jest.fn();
// Mock window.prompt
global.prompt = jest.fn();

describe('Admin Question Generation Service', () => {
    let containerElement;

    beforeEach(() => {
        jest.clearAllMocks();
        globalCourseDataMap.clear();
        containerElement = document.createElement('div');
        document.body.appendChild(containerElement);
    });

    afterEach(() => {
        document.body.removeChild(containerElement);
        containerElement = null;
    });

    describe('PDF MCQ & Problem Generator', () => {
        // DOM elements for PDF Q-Gen
        let pdfMcqCourseSelect, pdfMcqChapterSelect, pdfLinkDisplay, pdfStartButton, pdfFeedbackArea;

        beforeEach(() => {
            // Display function populates these IDs
            displayPdfMcqProblemGenerator(containerElement);
            pdfMcqCourseSelect = containerElement.querySelector('#mcq-course-select');
            pdfMcqChapterSelect = containerElement.querySelector('#mcq-chapter-select');
            pdfLinkDisplay = containerElement.querySelector('#selected-chapter-pdf-link');
            pdfStartButton = containerElement.querySelector('#start-mcq-problem-generation-btn');
            pdfFeedbackArea = containerElement.querySelector('#mcq-problem-generator-feedback');
        });
        
        describe('displayPdfMcqProblemGenerator', () => {
            it('should show "Access Denied" if user is not admin', () => {
                currentUser.isAdmin = false;
                displayPdfMcqProblemGenerator(containerElement);
                expect(containerElement.innerHTML).toContain('Access Denied');
                currentUser.isAdmin = true; // Reset
            });

            it('should populate course options', () => {
                globalCourseDataMap.set('c1', { name: 'Course One PDF', chapterResources: {} });
                displayPdfMcqProblemGenerator(containerElement);
                expect(pdfMcqCourseSelect.innerHTML).toContain('Course One PDF');
            });

            it('should populate chapter options with PDFs when a course is selected', () => {
                globalCourseDataMap.set('c1', { 
                    name: 'Course PDF Test', 
                    chapterResources: {
                        'chap1_pdf': { otherResources: [{ type: 'textbook_chapter_segment', url: 'link1.pdf', title: 'Chapter 1 PDF' }] },
                        'chap2_no_pdf': { otherResources: [{ type: 'video', url: 'link2.mp4' }] },
                        'chap3_pdf': { otherResources: [{ type: 'textbook_chapter_segment', url: 'link3.pdf', title: 'Chapter 3 PDF' }] }
                    }
                });
                displayPdfMcqProblemGenerator(containerElement); // Re-render to attach listeners
                pdfMcqCourseSelect.value = 'c1';
                pdfMcqCourseSelect.dispatchEvent(new Event('change'));
                
                expect(pdfMcqChapterSelect.disabled).toBe(false);
                expect(pdfMcqChapterSelect.innerHTML).toContain('Chapter 1 PDF');
                expect(pdfMcqChapterSelect.innerHTML).not.toContain('chap2_no_pdf');
                expect(pdfMcqChapterSelect.innerHTML).toContain('Chapter 3 PDF');
            });
        });

        describe('startPdfMcqProblemGeneration', () => {
            beforeEach(() => {
                 // Simulate course and chapter selection for start function
                globalCourseDataMap.set('c1', { name: 'Course PDF Test', chapterResources: {
                    'chap1_pdf': { otherResources: [{ type: 'textbook_chapter_segment', url: 'link1.pdf', title: 'Chapter 1 PDF Title' }] }
                }});
                displayPdfMcqProblemGenerator(containerElement); // Re-render for fresh event listeners
                pdfMcqCourseSelect = containerElement.querySelector('#mcq-course-select');
                pdfMcqChapterSelect = containerElement.querySelector('#mcq-chapter-select');
                pdfStartButton = containerElement.querySelector('#start-mcq-problem-generation-btn');
                pdfFeedbackArea = containerElement.querySelector('#mcq-problem-generator-feedback');

                pdfMcqCourseSelect.value = 'c1';
                pdfMcqCourseSelect.dispatchEvent(new Event('change'));
                pdfMcqChapterSelect.value = 'chap1_pdf'; 
                pdfMcqChapterSelect.dispatchEvent(new Event('change')); // To enable button and set link
            });

            it('should show error if any required field is missing', async () => {
                await startPdfMcqProblemGeneration('', 'chap1_pdf', 'link1.pdf', 'Chapter 1 PDF Title');
                expect(pdfFeedbackArea.innerHTML).toContain('Error: Course, Chapter, Chapter Title, and PDF Link must be available.');
            });

            it('should show error if Gemini API key prompt is cancelled', async () => {
                global.prompt.mockReturnValueOnce('mega@user.com').mockReturnValueOnce('megaPass').mockReturnValueOnce(null); // Cancel Gemini key
                await startPdfMcqProblemGeneration('c1', 'chap1_pdf', 'link1.pdf', 'Chapter 1 PDF Title');
                expect(pdfFeedbackArea.innerHTML).toContain('Gemini API Key is required.');
            });

            it('should call fetch for PDF Q-Gen and handle success', async () => {
                global.prompt.mockReturnValueOnce('mega@user.com')
                             .mockReturnValueOnce('megaPass')
                             .mockReturnValueOnce('geminiKey');
                fetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, message: 'Generated PDF Qs.', mcqMegaLink: 'mcq.link', problemsMegaLink: 'prob.link' }),
                });

                await startPdfMcqProblemGeneration('c1', 'chap1_pdf', 'link1.pdf', 'Chapter 1 PDF Title');
                expect(fetch).toHaveBeenCalledWith('http://localhost:3001/generate-questions-from-pdf', expect.any(Object));
                expect(pdfFeedbackArea.innerHTML).toContain('Wisdom Extracted!');
                expect(pdfFeedbackArea.innerHTML).toContain('mcq.link');
            });
        });
    });

    describe('Lecture Transcription MCQ & Problem Generator', () => {
        let lectMcqCourseSelect, lectMcqTopicName, lectSelectionArea, lectStartButton, lectFeedbackArea;
        
        beforeEach(() => {
            displayLectureMcqProblemGenerator(containerElement);
            lectMcqCourseSelect = containerElement.querySelector('#lecture-mcq-course-select');
            lectMcqTopicName = containerElement.querySelector('#lecture-mcq-topic-name');
            lectSelectionArea = containerElement.querySelector('#lecture-selection-area');
            lectStartButton = containerElement.querySelector('#start-lecture-mcq-problem-generation-btn');
            lectFeedbackArea = containerElement.querySelector('#lecture-mcq-problem-generator-feedback');
        });

        describe('displayLectureMcqProblemGenerator', () => {
             it('should show "Access Denied" if user is not admin', () => {
                currentUser.isAdmin = false;
                displayLectureMcqProblemGenerator(containerElement);
                expect(containerElement.innerHTML).toContain('Access Denied');
                currentUser.isAdmin = true; // Reset
            });
            it('should populate lecture checkboxes when a course with transcribed lectures is selected', () => {
                globalCourseDataMap.set('c2', { 
                    name: 'Course Lecture Test', 
                    chapterResources: {
                        'ch1_lectures': { 
                            lectureUrls: [
                                { type: 'transcription', url: 'srt1.srt', title: 'Lecture 1 SRT' },
                                { type: 'video', url: 'vid.mp4', title: 'Lecture Video Only' },
                                { type: 'transcription', url: 'srt2.srt', title: 'Lecture 2 SRT' }
                            ] 
                        }
                    }
                });
                displayLectureMcqProblemGenerator(containerElement); // Re-render
                lectMcqCourseSelect = containerElement.querySelector('#lecture-mcq-course-select'); // Re-query
                lectSelectionArea = containerElement.querySelector('#lecture-selection-area'); // Re-query

                lectMcqCourseSelect.value = 'c2';
                lectMcqCourseSelect.dispatchEvent(new Event('change'));
                
                expect(lectSelectionArea.innerHTML).toContain('Lecture 1 SRT');
                expect(lectSelectionArea.innerHTML).toContain('Lecture 2 SRT');
                expect(lectSelectionArea.innerHTML).not.toContain('Lecture Video Only');
                expect(lectSelectionArea.querySelectorAll('input[type="checkbox"]').length).toBe(2);
            });
        });
        
        describe('startLectureMcqProblemGeneration', () => {
            beforeEach(() => {
                globalCourseDataMap.set('c2', { name: 'Course Lecture Test', chapterResources: {
                    'ch1_lectures': { lectureUrls: [{ type: 'transcription', url: 'srt1.srt', title: 'Lecture 1 SRT' }] }
                }});
                displayLectureMcqProblemGenerator(containerElement); // Re-render for fresh event listeners
                 lectMcqCourseSelect = containerElement.querySelector('#lecture-mcq-course-select');
                 lectMcqTopicName = containerElement.querySelector('#lecture-mcq-topic-name');
                 lectSelectionArea = containerElement.querySelector('#lecture-selection-area');
                 lectStartButton = containerElement.querySelector('#start-lecture-mcq-problem-generation-btn');
                 lectFeedbackArea = containerElement.querySelector('#lecture-mcq-problem-generator-feedback');

                lectMcqCourseSelect.value = 'c2';
                lectMcqCourseSelect.dispatchEvent(new Event('change'));
                // Simulate selecting a lecture
                const checkbox = lectSelectionArea.querySelector('input[type="checkbox"]');
                if(checkbox) checkbox.checked = true;
            });

            it('should show error if topic name is missing', async () => {
                lectMcqTopicName.value = '';
                const selectedLectures = [{ title: 'Lecture 1 SRT', megaSrtLink: 'srt1.srt' }];
                await startLectureMcqProblemGeneration('c2', selectedLectures, lectMcqTopicName.value);
                expect(lectFeedbackArea.innerHTML).toContain('Error: Course, "Chapter Name/Topic", and at least one lecture must be selected.');
            });
            
            it('should call fetch for Lecture Q-Gen and handle success', async () => {
                lectMcqTopicName.value = 'Test Topic';
                const selectedLectures = [{ title: 'Lecture 1 SRT', megaSrtLink: 'srt1.srt' }];
                global.prompt.mockReturnValueOnce('mega@user.com')
                             .mockReturnValueOnce('megaPass')
                             .mockReturnValueOnce('geminiKey');
                fetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true, message: 'Generated Lecture Qs.', mcqMegaLink: 'lec_mcq.link', problemsMegaLink: 'lec_prob.link', newChapterKey: 'test_topic_key' }),
                });

                await startLectureMcqProblemGeneration('c2', selectedLectures, lectMcqTopicName.value);
                expect(fetch).toHaveBeenCalledWith('http://localhost:3001/generate-questions-from-lectures', expect.any(Object));
                expect(lectFeedbackArea.innerHTML).toContain('Echoes of Knowledge Transformed!');
                expect(lectFeedbackArea.innerHTML).toContain('test_topic_key');
            });
        });
    });
});
