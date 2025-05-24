// admin_transcription_service.js
import { globalCourseDataMap, currentUser } from './state.js';
import { showLoading, hideLoading } from './utils.js';
import { MEGA_EMAIL, MEGA_PASSWORD } from './mega_service.js'; // Added import

// Note: No direct Firestore writes in these functions, they call a backend service.

const ASSEMBLYAI_API_KEY = '2a9868144d104a559466a77be8fc213b';

export async function startLectureTranscription(youtubeUrl, courseId, chapterId) {
    console.log("Attempting to start lecture transcription with details:", { youtubeUrl, courseId, chapterId });
    const feedbackArea = document.getElementById('lecture-transcription-feedback');
    const startButton = document.getElementById('start-transcription-btn');

    if (!feedbackArea || !startButton) {
        console.error("Required UI elements (feedback area or start button) not found.");
        alert("Error: UI elements missing. Cannot proceed.");
        return;
    }

    feedbackArea.innerHTML = ''; 

    if (!youtubeUrl || !courseId || !chapterId) {
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.332-.216 3.004-1.742 3.004H4.42c-1.526 0-2.492-1.672-1.742-3.004l5.58-9.92zM10 11a1 1 0 100-2 1 1 0 000 2zm0 2a1 1 0 100 2 1 1 0 000 2z" clip-rule="evenodd" /></svg>Error: YouTube URL, Course, and Chapter must be selected.</p>`;
        return;
    }

    // Removed AssemblyAI API Key prompt (it's a global constant)
    // Removed megaEmail prompt
    // Removed megaPassword prompt

    showLoading(`Starting transcription for: ${youtubeUrl}...`);
    startButton.disabled = true;
    feedbackArea.innerHTML = `<p class="text-blue-600 dark:text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Starting transcription... This may take a few moments.</p>`;

    try {
        const response = await fetch('http://localhost:3001/transcribe-lecture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ 
                youtubeUrl, 
                courseId, 
                chapterId, 
                assemblyAiApiKey: ASSEMBLYAI_API_KEY, // Using the constant
                megaEmail: MEGA_EMAIL, // Using imported constant
                megaPassword: MEGA_PASSWORD // Using imported constant
            }),
        });
        hideLoading();
        const result = await response.json();
        if (response.ok && result.success) {
            feedbackArea.innerHTML = `
                <p class="text-green-600 dark:text-green-400 font-semibold flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Transcription Complete.</p>
                <p class="ml-8"><strong>Video Title:</strong> ${result.videoTitle || 'N/A'}</p>
                <p class="ml-8"><strong>SRT Filename:</strong> ${result.srtFileName || 'N/A'}</p>
                <p class="ml-8"><strong>MEGA Link:</strong> <a href="${result.srtMegaLink}" target="_blank" class="link">${result.srtMegaLink}</a></p>
                <p class="ml-8"><strong>AssemblyAI Transcript ID:</strong> ${result.transcriptId || 'N/A'}</p>
                <p class="ml-8"><strong>Firestore Record Updated:</strong> ${result.firestoreUpdateStatus || 'N/A'}</p>
            `;
        } else {
            throw new Error(result.message || `HTTP error ${response.status}`);
        }
    } catch (error) {
        hideLoading();
        console.error("Error calling /transcribe-lecture endpoint:", error);
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400 font-semibold"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>Transcription Failed: ${error.message}</p>`;
    } finally {
        startButton.disabled = false;
    }
}

export function displayLectureTranscriptionAutomator(containerElement) {
    if (!currentUser || !currentUser.isAdmin) {
        containerElement.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`; return;
    }
    let courseOptions = '<option value="">Select Course an Ancient Scroll</option>';
    globalCourseDataMap.forEach((course, courseId) => {
        courseOptions += `<option value="${courseId}">${course.name}</option>`;
    });
    containerElement.innerHTML = `
        <div class="content-card p-6">
            <h2 class="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v1.586M12 12.253v1.586M12 18.253v1.586M7.5 12.253h1.586M13.5 12.253h1.586M16.732 7.96a4.5 4.5 0 010 6.364M5.268 7.96a4.5 4.5 0 000 6.364m11.464-6.364a4.5 4.5 0 00-6.364 0m6.364 0a4.5 4.5 0 010 6.364m-6.364-6.364L12 12.253" /></svg>Lecture Transcription</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Transcribe YouTube lectures to SRT files and archive them to MEGA.</p>
            <div class="space-y-5">
                <div>
                    <label for="youtube-url" class="label">YouTube Lecture URL:</label>
                    <input type="url" id="youtube-url" name="youtube-url" class="input-field mt-1" placeholder="e.g., https://www.youtube.com/watch?v=your_video_id">
                </div>
                <div>
                    <label for="transcription-course-select" class="label">Assign to Course:</label>
                    <select id="transcription-course-select" name="transcription-course-select" class="select-dropdown mt-1">${courseOptions}</select>
                </div>
                <div>
                    <label for="transcription-chapter-select" class="label">Chapter:</label>
                    <select id="transcription-chapter-select" name="transcription-chapter-select" class="select-dropdown mt-1" disabled><option value="">Select Course First</option></select>
                </div>
                <button id="start-transcription-btn" class="btn-primary w-full flex items-center justify-center py-2.5">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                    Start Transcription
                </button>
                <div id="lecture-transcription-feedback" class="feedback-area min-h-[60px]"><p class="text-gray-500 dark:text-gray-400">Ready to transcribe.</p></div>
            </div>
        </div>`;
    const courseSelectElem = document.getElementById('transcription-course-select');
    const chapterSelectElem = document.getElementById('transcription-chapter-select');
    
    document.getElementById('start-transcription-btn')?.addEventListener('click', () => {
        startLectureTranscription(document.getElementById('youtube-url').value, courseSelectElem.value, chapterSelectElem.value);
    });

    courseSelectElem.addEventListener('change', function() {
        const selectedCourseId = this.value;
        chapterSelectElem.innerHTML = '<option value="">Loading Chapters...</option>';
        chapterSelectElem.disabled = true;
        if (selectedCourseId && globalCourseDataMap.has(selectedCourseId)) {
            const course = globalCourseDataMap.get(selectedCourseId);
            if (course.chapters && course.chapters.length > 0) {
                let chapterOptions = '<option value="">Select Chapter</option>';
                course.chapters.forEach(chapter => { chapterOptions += `<option value="${chapter.id}">${chapter.title}</option>`; });
                chapterSelectElem.innerHTML = chapterOptions;
                chapterSelectElem.disabled = false;
            } else {
                chapterSelectElem.innerHTML = '<option value="">No Chapters Available</option>';
            }
        } else {
            chapterSelectElem.innerHTML = '<option value="">Select Course First</option>';
        }
    });
}