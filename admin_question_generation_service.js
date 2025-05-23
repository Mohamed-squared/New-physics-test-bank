// admin_question_generation_service.js
import { globalCourseDataMap, currentUser } from './state.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Added unescape
// Note: No direct Firestore writes in these functions, they call a backend service.

function unescape(htmlStr) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = htmlStr;
    return textarea.value;
}

// --- PDF MCQ & Problem Generator ---
export async function startPdfMcqProblemGeneration(courseId, chapterKey, chapterPdfMegaLink, chapterTitle) {
    const feedbackArea = document.getElementById('mcq-problem-generator-feedback');
    const startButton = document.getElementById('start-mcq-problem-generation-btn');
    if (!feedbackArea || !startButton) { alert("Error: UI components missing."); return; }
    feedbackArea.innerHTML = ''; 
    if (!courseId || !chapterKey || !chapterPdfMegaLink || !chapterTitle) {
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400">Error: Course, Chapter, Chapter Title, and PDF Link must be available.</p>`; return;
    }
    const megaEmail = prompt("Enter your MEGA Email (The Archivist's Seal):");
    if (!megaEmail) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">MEGA Email is required.</p>`; return; }
    const megaPassword = prompt("Enter your MEGA Password (The Vault Key):");
    if (!megaPassword) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">MEGA Password is required.</p>`; return; }
    const geminiApiKey = prompt("Enter your Gemini API Key (The Oracle's Token):");
    if (!geminiApiKey) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">Gemini API Key is required.</p>`; return; }

    showLoading(`Summoning insights from ${chapterTitle}...`);
    startButton.disabled = true;
    feedbackArea.innerHTML = `<p class="text-blue-600 dark:text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Consulting the Oracle for chapter "${chapterTitle}". This may take a few moments...</p>`;
    try {
        const response = await fetch('http://localhost:3001/generate-questions-from-pdf', {
            method: 'POST', headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ courseId, chapterKey, chapterPdfMegaLink, chapterTitle, megaEmail, megaPassword, geminiApiKey }),
        });
        hideLoading();
        const result = await response.json();
        if (response.ok && result.success) {
            feedbackArea.innerHTML = `
                <p class="text-green-600 dark:text-green-400 font-semibold flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>✨ Wisdom Extracted!</p>
                <p class="ml-8"><strong>Chapter:</strong> ${chapterTitle}</p>
                ${result.mcqMegaLink ? `<p class="ml-8"><strong>MCQ Scroll:</strong> <a href="${result.mcqMegaLink}" target="_blank" class="link">${result.mcqMegaLink}</a></p>` : '<p class="ml-8">MCQ Scroll: Not forged or link missing.</p>'}
                ${result.problemsMegaLink ? `<p class="ml-8"><strong>Problem Parchment:</strong> <a href="${result.problemsMegaLink}" target="_blank" class="link">${result.problemsMegaLink}</a></p>` : '<p class="ml-8">Problem Parchment: Not forged or link missing.</p>'}
                <p class="ml-8 mt-2"><strong>Oracle's Message:</strong> ${result.message || 'Completed.'}</p>`;
        } else {
            throw new Error(result.message || `HTTP error ${response.status}`);
        }
    } catch (error) {
        hideLoading();
        console.error("Error calling /generate-questions-from-pdf endpoint:", error);
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400 font-semibold"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>Oracle Consultation Failed: ${error.message}</p>`;
    } finally {
        startButton.disabled = false;
    }
}

export function displayPdfMcqProblemGenerator(containerElement) {
    if (!currentUser || !currentUser.isAdmin) { containerElement.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`; return; }
    let courseOptionsHtml = '<option value="">Select Course Chronicle</option>';
    globalCourseDataMap.forEach((course, courseId) => { courseOptionsHtml += `<option value="${courseId}">${course.name}</option>`; });
    containerElement.innerHTML = `
        <div class="content-card p-6">
            <h2 class="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4c-1.742 0-3.223-.835-3.772-2M10 13l4-4m0 0l-4 4m4-4v12"></path></svg>Oracle's Forge (Chapter PDF Q-Gen)</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Forge MCQs and Problems from the sacred texts of chapter PDFs.</p>
            <div class="space-y-5">
                <div>
                    <label for="mcq-course-select" class="label">Target Course Chronicle:</label>
                    <select id="mcq-course-select" name="mcq-course-select" class="select-dropdown mt-1">${courseOptionsHtml}</select>
                </div>
                <div>
                    <label for="mcq-chapter-select" class="label">Target Chapter Scroll (with PDF):</label>
                    <select id="mcq-chapter-select" name="mcq-chapter-select" class="select-dropdown mt-1" disabled><option value="">Select Course Chronicle First</option></select>
                </div>
                <div class="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <p class="text-sm text-gray-600 dark:text-gray-300">Selected Scroll's Location (MEGA PDF Link):</p>
                    <p id="selected-chapter-pdf-link" class="text-xs font-mono text-gray-700 dark:text-gray-200 break-all">N/A</p>
                </div>
                <button id="start-mcq-problem-generation-btn" class="btn-primary w-full flex items-center justify-center py-2.5" disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Forge MCQs & Problems
                </button>
                <div id="mcq-problem-generator-feedback" class="feedback-area min-h-[60px]"><p class="text-gray-500 dark:text-gray-400">The Oracle's Forge is ready.</p></div>
            </div>
        </div>`;
    const courseSelectElem = document.getElementById('mcq-course-select');
    const chapterSelectElem = document.getElementById('mcq-chapter-select');
    const pdfLinkDisplayElem = document.getElementById('selected-chapter-pdf-link');
    const startButtonElem = document.getElementById('start-mcq-problem-generation-btn');
    courseSelectElem.addEventListener('change', function() {
        const selectedCourseId = this.value;
        chapterSelectElem.innerHTML = '<option value="">Loading Chapter Scrolls...</option>';
        chapterSelectElem.disabled = true; pdfLinkDisplayElem.textContent = 'N/A'; startButtonElem.disabled = true;
        if (selectedCourseId && globalCourseDataMap.has(selectedCourseId)) {
            const course = globalCourseDataMap.get(selectedCourseId);
            let chapterOptionsHtml = '<option value="">Select Chapter Scroll with PDF</option>';
            let chaptersWithPdfsFound = 0;
            if (course.chapterResources) {
                for (const chapterKey in course.chapterResources) {
                    const chapterData = course.chapterResources[chapterKey];
                    if (chapterData.otherResources && Array.isArray(chapterData.otherResources)) {
                        const pdfResource = chapterData.otherResources.find(res => res.type === 'textbook_chapter_segment' && res.url);
                        if (pdfResource) {
                            const displayTitle = pdfResource.title || chapterKey.replace(/_/g, ' ');
                            chapterOptionsHtml += `<option value="${chapterKey}" data-pdf-link="${pdfResource.url}" data-chapter-title="${escape(displayTitle)}">${displayTitle}</option>`;
                            chaptersWithPdfsFound++;
                        }
                    }
                }
            }
            if (chaptersWithPdfsFound > 0) {
                chapterSelectElem.innerHTML = chapterOptionsHtml; chapterSelectElem.disabled = false;
            } else {
                chapterSelectElem.innerHTML = '<option value="">No Chapter Scrolls with PDF found</option>';
            }
        } else {
            chapterSelectElem.innerHTML = '<option value="">Select Course Chronicle First</option>';
        }
    });
    chapterSelectElem.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption && selectedOption.value) {
            const pdfLink = selectedOption.getAttribute('data-pdf-link');
            pdfLinkDisplayElem.textContent = pdfLink || 'N/A'; startButtonElem.disabled = !pdfLink;
        } else {
            pdfLinkDisplayElem.textContent = 'N/A'; startButtonElem.disabled = true;
        }
    });
    startButtonElem.addEventListener('click', () => {
        const selectedChapterOption = chapterSelectElem.options[chapterSelectElem.selectedIndex];
        if (courseSelectElem.value && selectedChapterOption && selectedChapterOption.value) {
            startPdfMcqProblemGeneration(courseSelectElem.value, selectedChapterOption.value, selectedChapterOption.getAttribute('data-pdf-link'), unescape(selectedChapterOption.getAttribute('data-chapter-title')));
        } else {
            document.getElementById('mcq-problem-generator-feedback').innerHTML = `<p class="text-red-600 dark:text-red-400">Please select a Course and a Chapter with a valid PDF link.</p>`;
        }
    });
}

// --- Lecture Transcription MCQ & Problem Generator ---
export async function startLectureMcqProblemGeneration(courseId, selectedLectures, chapterNameForLectures) {
    const feedbackArea = document.getElementById('lecture-mcq-problem-generator-feedback');
    const startButton = document.getElementById('start-lecture-mcq-problem-generation-btn');
    if (!feedbackArea || !startButton) { alert("Error: UI components missing."); return; }
    feedbackArea.innerHTML = ''; 
    if (!courseId || !selectedLectures || selectedLectures.length === 0 || !chapterNameForLectures) {
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400">Error: Course, "Chapter Name/Topic", and at least one lecture must be selected.</p>`; return;
    }
    const megaEmail = prompt("Enter your MEGA Email (The Archivist's Seal):");
    if (!megaEmail) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">MEGA Email is required.</p>`; return; }
    const megaPassword = prompt("Enter your MEGA Password (The Vault Key):");
    if (!megaPassword) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">MEGA Password is required.</p>`; return; }
    const geminiApiKey = prompt("Enter your Gemini API Key (The Oracle's Token):");
    if (!geminiApiKey) { feedbackArea.innerHTML = `<p class="text-yellow-600 dark:text-yellow-400">Gemini API Key is required.</p>`; return; }

    showLoading(`Summoning insights from lectures for "${chapterNameForLectures}"...`);
    startButton.disabled = true;
    feedbackArea.innerHTML = `<p class="text-blue-600 dark:text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>Consulting the Oracle with ${selectedLectures.length} lecture scroll(s) for topic "${chapterNameForLectures}". This may take time...</p>`;
    try {
        const response = await fetch('http://localhost:3001/generate-questions-from-lectures', {
            method: 'POST', headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ courseId, selectedLectures, chapterNameForLectures, megaEmail, megaPassword, geminiApiKey }),
        });
        hideLoading();
        const result = await response.json();
        if (response.ok && result.success) {
            feedbackArea.innerHTML = `
                <p class="text-green-600 dark:text-green-400 font-semibold flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>🎙️ Echoes of Knowledge Transformed!</p>
                <p class="ml-8"><strong>Topic / New Chapter Key:</strong> ${result.newChapterKey || chapterNameForLectures}</p>
                ${result.mcqMegaLink ? `<p class="ml-8"><strong>MCQ Scroll:</strong> <a href="${result.mcqMegaLink}" target="_blank" class="link">${result.mcqMegaLink}</a></p>` : '<p class="ml-8">MCQ Scroll: Not forged or link missing.</p>'}
                ${result.problemsMegaLink ? `<p class="ml-8"><strong>Problem Parchment:</strong> <a href="${result.problemsMegaLink}" target="_blank" class="link">${result.problemsMegaLink}</a></p>` : '<p class="ml-8">Problem Parchment: Not forged or link missing.</p>'}
                <p class="ml-8 mt-2"><strong>Oracle's Message:</strong> ${result.message || 'Completed.'}</p>`;
        } else {
            throw new Error(result.message || `HTTP error ${response.status}`);
        }
    } catch (error) {
        hideLoading();
        console.error("Error calling /generate-questions-from-lectures endpoint:", error);
        feedbackArea.innerHTML = `<p class="text-red-600 dark:text-red-400 font-semibold"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>Oracle Consultation from Lectures Failed: ${error.message}</p>`;
    } finally {
        startButton.disabled = false;
    }
}

export function displayLectureMcqProblemGenerator(containerElement) {
    if (!currentUser || !currentUser.isAdmin) { containerElement.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Access Denied. Admin privileges required.</div>`; return; }
    let courseOptionsHtml = '<option value="">Select Course Chronicle</option>';
    globalCourseDataMap.forEach((course, courseId) => { courseOptionsHtml += `<option value="${courseId}">${course.name}</option>`; });
    containerElement.innerHTML = `
        <div class="content-card p-6">
            <h2 class="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>Oracle's Forge (Lecture Q-Gen)</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Distill MCQs and Problems from the spoken words of lecture transcripts (SRT scrolls).</p>
            <div class="space-y-5">
                <div>
                    <label for="lecture-mcq-course-select" class="label">Target Course Chronicle:</label>
                    <select id="lecture-mcq-course-select" name="lecture-mcq-course-select" class="select-dropdown mt-1">${courseOptionsHtml}</select>
                </div>
                <div>
                    <label for="lecture-mcq-topic-name" class="label">Name this Collection (Chapter/Topic):</label>
                    <input type="text" id="lecture-mcq-topic-name" name="lecture-mcq-topic-name" class="input-field mt-1" placeholder="e.g., Week 1 Insights, Quantum Entanglement Musings">
                </div>
                <div>
                    <label class="label">Select Lecture Scrolls (SRT Transcripts):</label>
                    <div id="lecture-selection-area" class="mt-1 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50 min-h-[100px] max-h-[250px] overflow-y-auto space-y-2">
                        <p class="text-gray-500 dark:text-gray-400">Select a Course Chronicle to list available lecture scrolls.</p>
                    </div>
                </div>
                <button id="start-lecture-mcq-problem-generation-btn" class="btn-primary w-full flex items-center justify-center py-2.5" disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Forge from Selected Lectures
                </button>
                <div id="lecture-mcq-problem-generator-feedback" class="feedback-area min-h-[60px]"><p class="text-gray-500 dark:text-gray-400">The Oracle's Forge awaits command.</p></div>
            </div>
        </div>`;
    const courseSelectElem = document.getElementById('lecture-mcq-course-select');
    const lectureSelectionAreaElem = document.getElementById('lecture-selection-area');
    const topicNameInputElem = document.getElementById('lecture-mcq-topic-name');
    const startButtonElem = document.getElementById('start-lecture-mcq-problem-generation-btn');
    courseSelectElem.addEventListener('change', function() {
        const selectedCourseId = this.value;
        lectureSelectionAreaElem.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-2">Loading lecture scrolls...</p>';
        startButtonElem.disabled = true;
        if (selectedCourseId && globalCourseDataMap.has(selectedCourseId)) {
            const course = globalCourseDataMap.get(selectedCourseId);
            let lecturesHtml = ''; let lecturesFound = 0;
            if (course.chapterResources) {
                for (const chapterKey in course.chapterResources) {
                    const chapterData = course.chapterResources[chapterKey];
                    if (chapterData.lectureUrls && Array.isArray(chapterData.lectureUrls)) {
                        chapterData.lectureUrls.forEach((lecture, index) => {
                            const srtLink = lecture.url; const lectureType = lecture.type;
                            if (srtLink && lectureType === 'transcription') {
                                const lectureId = `lec-sel-${chapterKey}-${index}`;
                                lecturesHtml += `<div class="flex items-center p-1.5 hover:bg-primary-50 dark:hover:bg-primary-800/30 rounded-md"><input type="checkbox" id="${lectureId}" name="selectedLecture" value="${srtLink}" data-lecture-title="${escape(lecture.title || `Scroll from ${chapterKey}`)}" class="form-checkbox h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"><label for="${lectureId}" class="ml-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">${lecture.title || `Scroll from ${chapterKey}`}</label></div>`;
                                lecturesFound++;
                            }
                        });
                    }
                }
            }
            lectureSelectionAreaElem.innerHTML = lecturesFound > 0 ? lecturesHtml : '<p class="text-gray-500 dark:text-gray-400 p-2">No lecture scrolls with SRT transcripts found for this Chronicle.</p>';
            startButtonElem.disabled = lecturesFound === 0;
        } else {
            lectureSelectionAreaElem.innerHTML = '<p class="text-gray-500 dark:text-gray-400 p-2">Select a Course Chronicle to list available lecture scrolls.</p>';
        }
    });
    startButtonElem.addEventListener('click', () => {
        const courseId = courseSelectElem.value;
        const chapterNameForLectures = topicNameInputElem.value.trim();
        const selectedLectureCheckboxes = lectureSelectionAreaElem.querySelectorAll('input[name="selectedLecture"]:checked');
        let selectedLectures = [];
        selectedLectureCheckboxes.forEach(checkbox => { selectedLectures.push({ title: unescape(checkbox.getAttribute('data-lecture-title')), megaSrtLink: checkbox.value }); });
        if (!courseId || selectedLectures.length === 0 || !chapterNameForLectures) {
            document.getElementById('lecture-mcq-problem-generator-feedback').innerHTML = `<p class="text-red-600 dark:text-red-400">Please select a Course, provide a Topic Name, and choose at least one Lecture Scroll.</p>`; return;
        }
        startLectureMcqProblemGeneration(courseId, selectedLectures, chapterNameForLectures);
    });
}
