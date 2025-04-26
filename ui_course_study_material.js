// ui_course_study_material.js

import { currentUser, globalCourseDataMap, activeCourseId } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml, renderMathIn } from './utils.js';
import { COURSE_PDF_BASE_PATH, COURSE_TRANSCRIPTION_BASE_PATH } from './config.js';
import { generateFormulaSheet, explainStudyMaterialSnippet } from './ai_integration.js';

let currentTranscriptionContent = ''; // Store fetched transcription
let currentChapterNumber = null;

// Function to fetch text content (used for transcriptions)
async function fetchTextFile(url) {
    try {
        const response = await fetch(`${url}?t=${new Date().getTime()}`); // Cache bust
        if (!response.ok) {
            if (response.status === 404) return null; // Not found is acceptable
            throw new Error(`HTTP error fetching text file! status: ${response.status} for ${url}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching text file (${url}):`, error);
        return null;
    }
}

export async function showCourseStudyMaterial(courseId, chapterNum) {
    if (!currentUser || !courseId || !chapterNum) {
        console.error("Missing data for showCourseStudyMaterial");
        return;
    }
    setActiveCourseId(courseId); // Ensure course context is set
    setActiveSidebarLink('showCourseDashboard', 'sidebar-course-nav'); // Keep course nav active

    const courseDef = globalCourseDataMap.get(courseId);
    if (!courseDef) {
        displayContent(`<p class="text-red-500 p-4">Error: Course definition not found for ID: ${courseId}.</p>`);
        return;
    }

    currentChapterNumber = chapterNum;
    const chapterTitle = courseDef.chapters[chapterNum - 1] || `Chapter ${chapterNum}`;
    const totalChapters = courseDef.totalChapters;

    // Determine resource paths using patterns or overrides
    const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
    const lectureUrl = chapterResources.lectureUrl || null; // Specific lecture URL override
    const pdfPath = chapterResources.pdfPath || courseDef.pdfPathPattern?.replace('{num}', chapterNum);
    const transcriptionPath = chapterResources.transcriptionPath || courseDef.transcriptionPathPattern?.replace('{num}', chapterNum);
    const mainPlaylistUrl = courseDef.youtubePlaylistUrl; // For general playlist link

    showLoading(`Loading Chapter ${chapterNum} Material...`);

    // Fetch transcription content
    currentTranscriptionContent = transcriptionPath ? await fetchTextFile(transcriptionPath) : null;

    hideLoading();

    // Build HTML
    let studyMaterialHtml = `<div class="space-y-6">`;

    // Navigation and Title
    studyMaterialHtml += `
        <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(chapterTitle)}</h2>
            <div class="flex space-x-2">
                <button onclick="window.navigateChapterMaterial('${courseId}', ${chapterNum - 1})" ${chapterNum <= 1 ? 'disabled' : ''} class="btn-secondary-small" title="Previous Chapter">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                </button>
                <button onclick="window.navigateChapterMaterial('${courseId}', ${chapterNum + 1})" ${chapterNum >= totalChapters ? 'disabled' : ''} class="btn-secondary-small" title="Next Chapter">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                </button>
            </div>
        </div>`;

    // Lecture Video Section
    studyMaterialHtml += `
        <div class="content-card">
            <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Lecture Video</h3>`;
    if (lectureUrl) {
        // Basic YouTube URL parsing to get video ID for embedding
        let videoId = null;
        try {
            const url = new URL(lectureUrl);
            if (url.hostname.includes('youtube.com')) {
                videoId = url.searchParams.get('v');
            } else if (url.hostname.includes('youtu.be')) {
                videoId = url.pathname.substring(1);
            }
        } catch (e) { console.error("Invalid lecture URL format:", lectureUrl); }

        if (videoId) {
            studyMaterialHtml += `<div class="aspect-w-16 aspect-h-9 mb-3"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
        } else {
             studyMaterialHtml += `<p class="text-sm text-muted">Could not embed video. <a href="${escapeHtml(lectureUrl)}" target="_blank" class="link">Watch on YouTube</a></p>`;
        }
    } else if (mainPlaylistUrl) {
        studyMaterialHtml += `<p class="text-sm text-muted">No specific video assigned. <a href="${escapeHtml(mainPlaylistUrl)}" target="_blank" class="link">View Course Playlist</a></p>`;
    } else {
        studyMaterialHtml += `<p class="text-sm text-muted">No lecture video available for this chapter.</p>`;
    }
    studyMaterialHtml += `</div>`;


    // Transcription Section
    if (currentTranscriptionContent) {
        studyMaterialHtml += `
        <div class="content-card">
            <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Lecture Transcription</h3>
             <div id="transcription-content" class="text-sm leading-relaxed max-h-96 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600 whitespace-pre-wrap font-mono text-xs">
                ${escapeHtml(currentTranscriptionContent)}
             </div>
             <button onclick="window.handleExplainSelection('transcription')" class="btn-secondary-small mt-3 text-xs">Explain Selected Text (AI)</button>
        </div>`;
    }

    // PDF & Formula Sheet Section
    studyMaterialHtml += `
        <div class="content-card">
            <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Resources</h3>
            <div class="flex flex-wrap gap-3">`;
    if (pdfPath) {
        studyMaterialHtml += `<a href="${escapeHtml(pdfPath)}" target="_blank" class="btn-secondary flex-1">View Chapter PDF</a>`;
    } else {
        studyMaterialHtml += `<button class="btn-secondary flex-1" disabled>PDF Not Available</button>`;
    }
    studyMaterialHtml += `
                <button onclick="window.displayFormulaSheet('${courseId}', ${chapterNum})" class="btn-secondary flex-1">View Formula Sheet (AI)</button>
            </div>
            <div id="formula-sheet-area" class="mt-4 hidden border-t dark:border-gray-700 pt-4">
                <p class="text-center text-muted">Loading formula sheet...</p>
                 <div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>
            </div>
        </div>`;


    // Explanation Area
    studyMaterialHtml += `
        <div id="ai-explanation-area" class="content-card fixed bottom-4 right-4 w-full max-w-md bg-white dark:bg-gray-800 border dark:border-gray-600 shadow-xl rounded-lg p-4 z-50 hidden max-h-[40vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-2">
                 <h4 class="text-base font-semibold text-purple-700 dark:text-purple-300">AI Explanation</h4>
                 <button onclick="document.getElementById('ai-explanation-area').classList.add('hidden');" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">&times;</button>
            </div>
            <div id="ai-explanation-content"></div>
        </div>
    </div>`; // Close main container

    displayContent(studyMaterialHtml, 'course-dashboard-area'); // Display in course area
}

export async function displayFormulaSheet(courseId, chapterNum) {
    const formulaArea = document.getElementById('formula-sheet-area');
    if (!formulaArea) return;

    formulaArea.classList.remove('hidden');
    formulaArea.innerHTML = `<p class="text-center text-muted">Generating...</p><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;

    // Use previously fetched transcription content if available
    const contentToUse = currentTranscriptionContent;
    if (!contentToUse) {
        formulaArea.innerHTML = '<p class="text-warning">Cannot generate sheet: Transcription content missing.</p>';
        return;
    }

    try {
        const sheetHtml = await generateFormulaSheet(contentToUse, chapterNum);
        formulaArea.innerHTML = sheetHtml;
        await renderMathIn(formulaArea); // Render MathJax in the generated sheet
    } catch (error) {
        console.error("Error displaying formula sheet:", error);
        formulaArea.innerHTML = `<p class="text-danger">Error generating formula sheet: ${error.message || 'Unknown error'}</p>`;
    }
}

export function handleExplainSelection(sourceType) {
    let selectedText = window.getSelection()?.toString().trim();
    if (!selectedText) {
        alert("Please select some text from the transcription to explain.");
        return;
    }

    // Basic context (can be improved)
    const context = `From Chapter ${currentChapterNumber} ${sourceType}.`;

    const explanationArea = document.getElementById('ai-explanation-area');
    const explanationContent = document.getElementById('ai-explanation-content');
    if (!explanationArea || !explanationContent) return;

    explanationContent.innerHTML = `<div class="flex items-center justify-center space-x-2"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p>Generating explanation...</p></div>`;
    explanationArea.classList.remove('hidden');

    explainStudyMaterialSnippet(selectedText, context)
        .then(async explanationHtml => {
            explanationContent.innerHTML = explanationHtml;
            await renderMathIn(explanationContent); // Render math in the explanation
        })
        .catch(error => {
             console.error("Error getting explanation:", error);
             explanationContent.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
        });
}

export function navigateChapterMaterial(courseId, chapterNum) {
     const courseDef = globalCourseDataMap.get(courseId);
     if (!courseDef || chapterNum < 1 || chapterNum > courseDef.totalChapters) {
         console.log("Navigation out of bounds.");
         return;
     }
     showCourseStudyMaterial(courseId, chapterNum);
}


// Assign to window scope
window.displayFormulaSheet = displayFormulaSheet;
window.handleExplainSelection = handleExplainSelection;
window.navigateChapterMaterial = navigateChapterMaterial;