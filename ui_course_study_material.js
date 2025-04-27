// ui_course_study_material.js
// RENAMED file conceptually to represent showing a SPECIFIC lesson/chapter material

import { currentUser, globalCourseDataMap, activeCourseId, setActiveCourseId, userCourseProgressMap, updateUserCourseProgress } from './state.js';
import { saveUserCourseProgress, markChapterStudiedInCourse } from './firebase_firestore.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml, renderMathIn } from './utils.js';
import { COURSE_PDF_BASE_PATH, COURSE_TRANSCRIPTION_BASE_PATH, PDF_WORKER_SRC, SKIP_EXAM_PASSING_PERCENT } from './config.js';
import { generateFormulaSheet, explainStudyMaterialSnippet, generateSkipExam, getExplanationForPdfSnapshot } from './ai_integration.js';
import { parseSkipExamText } from './markdown_parser.js';
import { launchOnlineTestUI, setCurrentOnlineTestState } from './ui_online_test.js';


let currentTranscriptionContent = ''; // Store fetched transcription text
let currentPdfTextContent = null; // Store extracted PDF text (might be null if scanned) - For Skip Exam ONLY
let currentChapterNumber = null;
let currentCourseIdInternal = null; // Keep track of the course ID locally

// --- PDF.js State ---
let pdfDoc = null;
let pdfPageNum = 1;
let pdfPageRendering = false;
let pdfPageNumPending = null;
let pdfScale = 1.5;
let pdfCanvas = null;
let pdfCtx = null;
let pdfViewerContainer = null;

// --- YouTube API State ---
let ytPlayers = {};
let ytApiLoaded = false;
let ytInitializationQueue = [];
let videoWatchStatus = {};


// Function to fetch text content (SRT Parser)
async function fetchTextFile(url) {
    try {
        const response = await fetch(`${url}?t=${new Date().getTime()}`); // Cache bust
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`fetchTextFile: File not found at ${url}. Returning null.`);
                return null;
            }
            throw new Error(`HTTP error fetching text file! status: ${response.status} for ${url}`);
        }
        const srtContent = await response.text();
        const textLines = srtContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !/^\d+$/.test(line) && !/-->/.test(line));
        const extractedText = textLines.join(' ');
        console.log(`fetchTextFile: Extracted text from SRT: ${url}`);
        return extractedText;
    } catch (error) {
        console.error(`Error fetching/parsing SRT file (${url}):`, error);
        return null;
    }
}

// Function to parse YouTube URL
function getYouTubeVideoId(url) {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
            return urlObj.searchParams.get('v');
        }
        else if (urlObj.hostname.includes('youtu.be')) {
            const pathParts = urlObj.pathname.split('/');
            if (pathParts.length >= 2 && pathParts[1]) {
                 return pathParts[1];
            }
        }
         else if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/embed/')) {
             const pathParts = urlObj.pathname.split('/');
             if (pathParts.length >= 3 && pathParts[2]) {
                  return pathParts[2];
             }
         }
    } catch (e) {
        console.error("Invalid URL format:", url, e);
    }
    console.warn("Could not extract YouTube Video ID from URL:", url);
    return null;
}


// --- YouTube IFrame API Functions ---
export function loadYouTubeAPI() {
    if (ytApiLoaded || window.ytApiLoadingInitiated) {
        console.log(`YouTube API ${ytApiLoaded ? 'already loaded' : 'loading already initiated'}.`);
        if(ytApiLoaded) window.onYouTubeIframeAPIReady?.();
        return;
    }
    console.log("Loading YouTube IFrame Player API...");
    window.ytApiLoadingInitiated = true;

    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
        console.log("YouTube IFrame Player API Ready.");
        ytApiLoaded = true;
        window.ytApiLoadingInitiated = false;

        console.log(`Processing YouTube player initialization queue (${ytInitializationQueue.length} items)`);
        ytInitializationQueue.forEach(item => {
            if (window.YT && window.YT.Player) {
                createYTPlayer(item.elementId, item.videoId);
            } else {
                console.error(`YT.Player still not available when processing queue for ${item.elementId}`);
            }
        });
        ytInitializationQueue = [];
    };
}

function createYTPlayer(elementId, videoId) {
    const container = document.getElementById(elementId);
    if (!container) {
        console.error(`Cannot create YT Player: Container element #${elementId} not found in DOM.`);
        return;
    }
    if (!videoId) {
         console.error(`Cannot create YT Player for #${elementId}: Invalid videoId provided.`);
         container.innerHTML = `<p class="text-red-500 text-sm p-4">Error: Invalid video ID provided.</p>`;
         return;
    }

    if (!ytApiLoaded || !window.YT || !window.YT.Player) {
        console.log(`YouTube API not ready, queueing player creation for ${elementId} (Video ID: ${videoId})`);
        if (!ytInitializationQueue.some(item => item.elementId === elementId)) {
             ytInitializationQueue.push({ elementId, videoId });
        }
        container.innerHTML = `<div class="flex items-center justify-center h-full bg-black rounded text-center p-4"><p class="text-gray-400 text-sm italic">Waiting for YouTube API...</p></div>`;
        return;
    }

    console.log(`Creating YouTube player for element ${elementId} with video ID ${videoId}`);
    try {
         container.innerHTML = '';
         if (!ytPlayers[elementId]) {
             ytPlayers[elementId] = { videoId: videoId, player: null };
         }
         if (ytPlayers[elementId].player) {
              console.warn(`Player already exists for element ${elementId}. Skipping creation.`);
              return;
         }

        const player = new YT.Player(elementId, {
            height: '360',
            width: '100%',
            videoId: videoId,
            playerVars: { 'playsinline': 1 },
            events: {
                'onStateChange': (event) => onPlayerStateChange(event, videoId),
                'onError': (event) => onPlayerError(event, videoId, elementId)
            }
        });
        ytPlayers[elementId].player = player;
    } catch (error) {
        console.error(`Failed to create YouTube player for ${elementId}:`, error);
        container.innerHTML = `<p class="text-red-500 text-sm p-4">Error loading video player. Check console and try disabling extensions.</p>`;
        if (ytPlayers[elementId]) {
             ytPlayers[elementId].player = null;
        }
    }
}

function onPlayerError(event, videoId, elementId) {
     console.error(`YouTube Player Error for video ${videoId} (Element: ${elementId}): Code ${event.data}`);
     const container = document.getElementById(elementId);
     let errorMsg = `Error loading video (Code: ${event.data}).`;
     if (event.data === 2) errorMsg = "Invalid video ID.";
     else if (event.data === 5) errorMsg = "HTML5 Player Error. Try reloading or disabling extensions.";
     else if (event.data === 100) errorMsg = "Video not found or removed.";
     else if (event.data === 101 || event.data === 150) errorMsg = "Video owner disabled embedding. Watch on YouTube directly.";
     else errorMsg = "Playback error. Check console or try disabling browser extensions (like ad blockers)."

     if (container) container.innerHTML = `<div class="flex items-center justify-center h-full bg-black rounded text-center p-4"><p class="text-red-500 text-sm">${errorMsg}</p></div>`;
     if (ytPlayers[elementId]) {
         ytPlayers[elementId].player = null;
     }
}

function onPlayerStateChange(event, videoId) {
    if (event.data == YT.PlayerState.ENDED) {
        console.log(`Video ended: ${videoId}`);
        handleVideoWatched(videoId);
    }
}

export async function handleVideoWatched(videoId) {
    if (!currentUser || !currentCourseIdInternal || !currentChapterNumber) {
        console.warn("Cannot mark video watched: Missing context.");
        return;
    }
    const progress = userCourseProgressMap.get(currentCourseIdInternal);
    if (!progress) {
         console.warn(`handleVideoWatched: Progress not found for course ${currentCourseIdInternal}.`);
         return;
     }

    progress.watchedVideoUrls = progress.watchedVideoUrls || {};
    progress.watchedVideoUrls[currentChapterNumber] = progress.watchedVideoUrls[currentChapterNumber] || [];

    const courseDef = globalCourseDataMap.get(currentCourseIdInternal);
    const chapterResources = courseDef?.chapterResources?.[currentChapterNumber] || {};
    const allUrls = [
        ...(Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : []),
        chapterResources.lectureUrl
    ].filter(Boolean);

    const watchedUrl = allUrls.find(url => getYouTubeVideoId(url) === videoId);

    if (watchedUrl && !progress.watchedVideoUrls[currentChapterNumber].includes(watchedUrl)) {
        progress.watchedVideoUrls[currentChapterNumber].push(watchedUrl);
        console.log(`Marked video URL as watched: ${watchedUrl} for Ch ${currentChapterNumber}`);
        updateUserCourseProgress(currentCourseIdInternal, progress);
        await saveUserCourseProgress(currentUser.uid, currentCourseIdInternal, progress);
        checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber, "video");
    } else if (!watchedUrl) {
         console.warn(`Could not find original URL for watched video ID: ${videoId}`);
    } else {
        console.log(`Video URL ${watchedUrl} already marked as watched.`);
    }
}

async function checkAndMarkChapterStudied(courseId, chapterNum, method) {
    // ... (logic remains the same - only Skip Exam pass marks chapter studied currently) ...
    const progress = userCourseProgressMap.get(courseId);
    const courseDef = globalCourseDataMap.get(courseId);
    if (!progress || !courseDef) return;

    let allVideosWatched = true;
    const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
    const requiredUrls = [
        ...(Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : []),
        chapterResources.lectureUrl
    ].filter(Boolean);

    if (requiredUrls.length > 0) {
        const watchedUrlsForChapter = progress.watchedVideoUrls?.[chapterNum] || [];
        allVideosWatched = requiredUrls.every(url => watchedUrlsForChapter.includes(url));
    }
     console.log(`Chapter ${chapterNum} video watch status updated. All watched: ${allVideosWatched}. Skip Exam pass required to mark chapter studied.`);
}

window.cleanupYouTubePlayers = () => {
     console.log(`Attempting to cleanup ${Object.keys(ytPlayers).length} YT player instances.`);
    Object.values(ytPlayers).forEach(playerData => {
        try {
             if (playerData && playerData.player && typeof playerData.player.destroy === 'function') {
                  console.log(`Destroying player for video ${playerData.videoId}`);
                  playerData.player.destroy();
             } else if (playerData) {
                  console.log(`Player instance not found or invalid for video ${playerData.videoId} during cleanup.`);
             }
        } catch (e) { console.error("Error destroying YT player:", e); }
    });
    ytPlayers = {};
    ytInitializationQueue = [];
    console.log("Cleaned up YouTube players state.");
};


// --- PDF.js Functions ---
export async function initPdfViewer(pdfPath) {
    cleanupPdfViewer();
    pdfViewerContainer = document.getElementById('pdf-viewer-container');
    const pdfControls = document.getElementById('pdf-controls');
    const pdfExplainButton = document.getElementById('pdf-explain-button');

    if (!pdfViewerContainer || !pdfControls || !pdfExplainButton) { /* ... error handling ... */ return; }
    pdfViewerContainer.innerHTML = `<div class="p-4 text-center"><div class="loader animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-2 text-sm text-muted">Loading PDF...</p></div>`;
    pdfControls.classList.add('hidden');
    pdfExplainButton.disabled = true;

    try {
        if (typeof pdfjsLib === 'undefined') { /* ... wait and check again ... */ }
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
        console.log(`Loading PDF from: ${pdfPath}`);
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        pdfDoc = await loadingTask.promise;
        console.log('PDF loaded:', pdfDoc.numPages, 'pages');
        pdfPageNum = 1;
        pdfControls.classList.remove('hidden');
        pdfExplainButton.disabled = false;
        document.getElementById('pdf-page-num').textContent = pdfPageNum;
        document.getElementById('pdf-page-count').textContent = pdfDoc.numPages;
        pdfCanvas = document.createElement('canvas');
        pdfCanvas.id = 'pdf-canvas';
        pdfCtx = pdfCanvas.getContext('2d');
        pdfViewerContainer.innerHTML = '';
        pdfViewerContainer.appendChild(pdfCanvas);

        await renderPdfPage(pdfPageNum);
        document.getElementById('pdf-prev').onclick = onPrevPage;
        document.getElementById('pdf-next').onclick = onNextPage;
    } catch (error) { /* ... error handling ... */ }
}

async function renderPdfPage(num) {
    if (!pdfDoc || pdfPageRendering) { pdfPageNumPending = num; return; }
    pdfPageRendering = true;
    document.getElementById('pdf-page-num').textContent = num;
    document.getElementById('pdf-prev').disabled = (num <= 1);
    document.getElementById('pdf-next').disabled = (num >= pdfDoc.numPages);

    try {
        const page = await pdfDoc.getPage(num);
        const viewport = page.getViewport({ scale: pdfScale });
        pdfCanvas.height = viewport.height;
        pdfCanvas.width = viewport.width;
        const renderContext = { canvasContext: pdfCtx, viewport: viewport };
        const renderTask = page.render(renderContext);
        await renderTask.promise;
        console.log(`Page ${num} rendered.`);
    } catch (error) { console.error(`Error rendering page ${num}:`, error); }
    finally {
        pdfPageRendering = false;
        if (pdfPageNumPending !== null) {
            renderPdfPage(pdfPageNumPending);
            pdfPageNumPending = null;
        }
    }
}

function queueRenderPage(num) { if (pdfPageRendering) pdfPageNumPending = num; else renderPdfPage(num); }
function onPrevPage() { if (pdfPageNum <= 1) return; pdfPageNum--; queueRenderPage(pdfPageNum); }
function onNextPage() { if (!pdfDoc || pdfPageNum >= pdfDoc.numPages) return; pdfPageNum++; queueRenderPage(pdfPageNum); }

export const cleanupPdfViewer = () => { /* ... unchanged ... */
    pdfDoc = null; pdfPageNum = 1; pdfPageRendering = false; pdfPageNumPending = null;
    pdfCanvas = null; pdfCtx = null; pdfViewerContainer = null;
    currentPdfTextContent = null;
    console.log("Cleaned up PDF viewer state.");
};
window.cleanupPdfViewer = cleanupPdfViewer;

export async function handlePdfSnapshotForAI() { /* ... unchanged ... */
     if (!pdfCanvas || !currentChapterNumber) { alert("Context missing for AI request."); return; }
     const userQuestion = prompt(`Ask a question about the current PDF page (Chapter ${currentChapterNumber}, Page ${pdfPageNum}):`);
     if (!userQuestion || userQuestion.trim() === "") return;
     showLoading("Generating AI explanation...");
     const explanationArea = document.getElementById('ai-explanation-area');
     const explanationContent = document.getElementById('ai-explanation-content');
     if (!explanationArea || !explanationContent) { hideLoading(); return; }
     explanationContent.innerHTML = `<div class="flex items-center justify-center space-x-2"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-sm">Generating explanation...</p></div>`;
     explanationArea.classList.remove('hidden');
     try {
          const imageDataUrl = pdfCanvas.toDataURL('image/jpeg', 0.85);
          const base64ImageData = imageDataUrl.split(',')[1];
          if (!base64ImageData) throw new Error("Failed to capture image data.");
          const context = `PDF page ${pdfPageNum} for Chapter ${currentChapterNumber}.`;
          const explanationHtml = await getExplanationForPdfSnapshot(userQuestion, base64ImageData, context);
          explanationContent.innerHTML = explanationHtml;
          await renderMathIn(explanationContent);
          hideLoading();
     } catch(error) {
          hideLoading();
          console.error("Error getting PDF snapshot explanation:", error);
          explanationContent.innerHTML = `<p class="text-danger text-sm">Error generating explanation: ${error.message}</p>`;
     }
}

// --- Main UI Function ---
// RENAMED: showNextLesson (conceptually, actual function name kept for global assignment)
export async function showCourseStudyMaterial(courseId, chapterNum) {
    currentCourseIdInternal = courseId;
    if (!currentUser || !courseId || !chapterNum) { /* ... error handling ... */ return; }
    setActiveCourseId(courseId);
    // Use a specific sidebar link for the lesson view if one exists, otherwise fallback
    setActiveSidebarLink('showNextLesson', 'sidebar-course-nav'); // RENAMED Link ID
    window.cleanupPdfViewer?.();
    window.cleanupYouTubePlayers?.();
    const courseDef = globalCourseDataMap.get(courseId);
    if (!courseDef) { /* ... error handling ... */ return; }
    currentChapterNumber = chapterNum;
    const chapterTitle = courseDef.chapters[chapterNum - 1] || `Chapter ${chapterNum}`;
    const totalChapters = courseDef.totalChapters;

    // Determine resource paths
    const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
    const lectureUrls = Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : (chapterResources.lectureUrl ? [chapterResources.lectureUrl] : []);
    const pdfPath = chapterResources.pdfPath || courseDef.pdfPathPattern?.replace('{num}', chapterNum);
    const transcriptionPath = chapterResources.transcriptionPath || courseDef.transcriptionPathPattern?.replace('{num}', chapterNum);
    const mainPlaylistUrl = courseDef.youtubePlaylistUrl;

    showLoading(`Loading Chapter ${chapterNum} Material...`);
    currentTranscriptionContent = transcriptionPath ? await fetchTextFile(transcriptionPath) : null;
    currentPdfTextContent = null;
    hideLoading();

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
     studyMaterialHtml += `<div class="content-card">`;
     studyMaterialHtml += `<h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Lecture Video(s)</h3>`;
     let videosToLoad = []; let videoHtmlContent = '';
     if (lectureUrls.length > 0) {
         videoHtmlContent += `<div class="space-y-4">`;
         lectureUrls.forEach((url, index) => {
             const videoId = getYouTubeVideoId(url);
             console.log(`Processing URL: ${url}, Extracted ID: ${videoId}`);
             const playerId = `ytplayer-${chapterNum}-${index}`;
             if (videoId) {
                 videoHtmlContent += `<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Lecture Part ${index + 1}:</p>`;
                 // IMPORTANT: The YT.Player constructor replaces the element with the ID, so we need a container around it.
                 videoHtmlContent += `<div class="aspect-w-16 aspect-h-9 bg-black rounded shadow"><div id="${playerId}">Loading Player...</div></div>`;
                 videosToLoad.push({ elementId: playerId, videoId: videoId });
             } else {
                 videoHtmlContent += `<p class="text-sm"><a href="${escapeHtml(url)}" target="_blank" class="link">Watch Lecture Part ${index + 1}</a> (Cannot embed - Invalid ID)</p>`;
             }
         });
         videoHtmlContent += `</div>`;
     } else if (mainPlaylistUrl) {
         videoHtmlContent += `<p class="text-sm text-muted">No specific video assigned. <a href="${escapeHtml(mainPlaylistUrl)}" target="_blank" class="link">View Course Playlist</a></p>`;
     } else {
         videoHtmlContent += `<p class="text-sm text-muted">No lecture video information available.</p>`;
     }
     studyMaterialHtml += videoHtmlContent; studyMaterialHtml += `</div>`;

    // Transcription Section
     studyMaterialHtml += `<div class="content-card">`;
     studyMaterialHtml += `<h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Lecture Transcription</h3>`;
     if (currentTranscriptionContent) {
         studyMaterialHtml += `<div id="transcription-content" class="text-sm leading-relaxed max-h-96 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600 whitespace-pre-wrap font-mono text-xs shadow-inner">${escapeHtml(currentTranscriptionContent)}</div>
                              <button onclick="window.handleExplainSelection('transcription')" class="btn-secondary-small mt-3 text-xs">Explain Selected Text (AI)</button>
                              <button onclick="window.askQuestionAboutTranscription()" class="btn-secondary-small mt-3 ml-2 text-xs">Ask Question (AI)</button>`;
     } else {
         studyMaterialHtml += `<p class="text-sm text-yellow-600 dark:text-yellow-400">Could not load transcription content. File might be missing or path incorrect (${escapeHtml(transcriptionPath || 'N/A')}).</p>`;
     }
     studyMaterialHtml += `</div>`;

    // PDF Viewer Section
     studyMaterialHtml += `<div class="content-card">`;
     studyMaterialHtml += `<h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Chapter PDF</h3>`;
     if (pdfPath) {
         studyMaterialHtml += `
              <div id="pdf-viewer-wrapper" class="mb-4">
                  <div id="pdf-viewer-container" class="h-[70vh] max-h-[800px] mb-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 overflow-auto shadow-inner rounded">
                      <p class="p-4 text-center text-muted">Initializing PDF viewer...</p>
                  </div>
                  <div id="pdf-controls" class="hidden items-center justify-center space-x-4 mt-2">
                      <button id="pdf-prev" class="btn-secondary-small">< Prev</button>
                      <span>Page <span id="pdf-page-num">1</span> / <span id="pdf-page-count">?</span></span>
                      <button id="pdf-next" class="btn-secondary-small">Next ></button>
                  </div>
              </div>
              <button id="pdf-explain-button" onclick="window.handlePdfSnapshotForAI()" class="btn-secondary-small text-xs" disabled>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3 mr-1 inline"><path fill-rule="evenodd" d="M10.863 3.861a1.25 1.25 0 0 1 1.768 0l4.5 4.5a1.25 1.25 0 0 1 0 1.768l-4.5 4.5a1.25 1.25 0 1 1-1.768-1.768L13.728 10 10.863 7.136a1.25 1.25 0 0 1 0-1.768ZM5.393 4.11a1.25 1.25 0 0 0-1.768 0l-4.5 4.5a1.25 1.25 0 0 0 0 1.768l4.5 4.5a1.25 1.25 0 1 0 1.768-1.768L2.728 10l2.865-2.864a1.25 1.25 0 0 0 0-1.768Z" clip-rule="evenodd" /></svg>
                  Ask AI About This Page
              </button>
              <a href="${escapeHtml(pdfPath)}" target="_blank" class="link text-xs ml-4">(Open PDF in new tab)</a>`;
     } else {
         studyMaterialHtml += `<p class="text-sm text-muted">No PDF available.</p>`;
     }
     studyMaterialHtml += `</div>`;

    // Actions & Resources Section
     studyMaterialHtml += `<div class="content-card">
         <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Actions & Resources</h3>
         <div class="flex flex-wrap gap-3">`;
     const canUseAI = currentTranscriptionContent || pdfPath;
     studyMaterialHtml += `<button onclick="window.displayFormulaSheet('${courseId}', ${chapterNum})" class="btn-secondary flex-1" ${!canUseAI ? 'disabled' : ''} title="${canUseAI ? 'Generate a formula sheet using AI based on chapter content' : 'Requires Transcription or PDF content'}">View Formula Sheet (AI)</button>`;
     studyMaterialHtml += `<button onclick="window.triggerSkipExamGeneration('${courseId}', ${chapterNum})" class="btn-warning flex-1" ${!canUseAI ? 'disabled' : ''} title="${canUseAI ? `Generate & Take an exam (${SKIP_EXAM_PASSING_PERCENT}%) to mark this chapter as studied` : 'Requires Transcription or PDF content'}">Take Skip Exam (AI)</button>`;
     studyMaterialHtml += `</div><div id="formula-sheet-area" class="mt-4 hidden border-t dark:border-gray-700 pt-4"></div></div>`;

    // AI Explanation Area (Popup)
    studyMaterialHtml += `<div id="ai-explanation-area" class="content-card fixed bottom-4 right-4 w-full max-w-md bg-white dark:bg-gray-800 border dark:border-gray-600 shadow-xl rounded-lg p-4 z-50 hidden max-h-[45vh] overflow-y-auto transition-all duration-300 ease-out">
                             <div class="flex justify-between items-center mb-2">
                                <h4 class="text-base font-semibold text-purple-700 dark:text-purple-300">AI Explanation</h4>
                                <button onclick="document.getElementById('ai-explanation-area').classList.add('hidden');" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl leading-none p-1">&times;</button>
                            </div>
                            <div id="ai-explanation-content" class="text-sm"></div>
                        </div>`;
    studyMaterialHtml += `</div>`;

    displayContent(studyMaterialHtml, 'course-dashboard-area');

    // Post-Render Initializations
    if (pdfPath) requestAnimationFrame(() => initPdfViewer(pdfPath));
    if (videosToLoad.length > 0) {
        requestAnimationFrame(() => {
             console.log("Requesting YT player creation for:", videosToLoad);
            videosToLoad.forEach(vid => createYTPlayer(vid.elementId, vid.videoId));
        });
    } else {
         console.log("No YouTube videos to load for this chapter.");
    }
}

// --- Skip Exam Generation and Launch ---
export async function triggerSkipExamGeneration(courseId, chapterNum) {
    if (!currentUser) { alert("Please log in."); return; }

    if (!currentTranscriptionContent && !currentPdfTextContent) {
        const courseDef = globalCourseDataMap.get(courseId);
        const chapterResources = courseDef?.chapterResources?.[chapterNum] || {};
        const pdfPath = chapterResources.pdfPath || courseDef?.pdfPathPattern?.replace('{num}', chapterNum);
        if (pdfPath) {
            showLoading(`Extracting PDF text for Skip Exam (Ch ${chapterNum})...`);
            console.log("Attempting PDF text extraction for Skip Exam generation...");
            currentPdfTextContent = await extractTextFromPdf(pdfPath);
            hideLoading();
             if (!currentPdfTextContent) {
                 alert("Failed to extract text from the PDF. Cannot generate Skip Exam using PDF content.");
                 return;
             }
        }
    }
    if (!currentTranscriptionContent && !currentPdfTextContent) {
        alert("Cannot generate skip exam: No transcription found and PDF content is unavailable or failed to load.");
        return;
    }

     if (!window.confirm(`Generate and start a skip exam for Chapter ${chapterNum}? Passing this exam (${SKIP_EXAM_PASSING_PERCENT}%) will mark the chapter as studied.`)) {
         return;
     }

    showLoading(`Generating AI Skip Exam for Chapter ${chapterNum}...`);
    try {
        const rawExamText = await generateSkipExam(currentTranscriptionContent, currentPdfTextContent, chapterNum);
        if (!rawExamText) { /* ... error handling ... */ }
        const parsedExam = parseSkipExamText(rawExamText, chapterNum);
        if (!parsedExam || !parsedExam.questions || parsedExam.questions.length === 0) { /* ... error handling ... */ }

        const examId = `SkipExam-C${chapterNum}-${Date.now().toString().slice(-6)}`;
        const skipExamState = {
            examId: examId,
            questions: parsedExam.questions,
            correctAnswers: parsedExam.answers,
            userAnswers: {},
            allocation: null,
            startTime: Date.now(),
            timerInterval: null,
            currentQuestionIndex: 0,
            status: 'active',
            durationMinutes: Math.max(15, Math.min(60, parsedExam.questions.length * 2)),
            courseContext: {
                isCourseActivity: true, isSkipExam: true,
                courseId: courseId, activityType: 'skip_exam',
                activityId: `chapter${chapterNum}`, chapterNum: chapterNum
            }
        };
        setCurrentOnlineTestState(skipExamState);
        hideLoading();
        launchOnlineTestUI();

    } catch (error) { /* ... error handling ... */ }
}


// --- Helper to extract text from PDF (Basic Implementation) ---
async function extractTextFromPdf(pdfPath) {
    // ... (implementation remains the same) ...
     if (typeof pdfjsLib === 'undefined') {
         await new Promise(resolve => setTimeout(resolve, 1000));
         if (typeof pdfjsLib === 'undefined') {
              console.error("PDF.js not loaded, cannot extract text.");
              return null;
         }
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
    let pdfText = "";
    console.log(`Attempting PDF text extraction for AI Use from: ${pdfPath}`);
    try {
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        const tempPdfDoc = await loadingTask.promise;
        const numPages = tempPdfDoc.numPages;
        console.log(`Extracting text from ${numPages} pages of ${pdfPath} (for AI use)...`);
        const maxPagesToProcess = 20;
        const pagesToProcess = Math.min(numPages, maxPagesToProcess);
        if (numPages > maxPagesToProcess) {
            console.warn(`PDF text extraction for AI limited to first ${maxPagesToProcess} pages out of ${numPages}.`);
        }
        for (let i = 1; i <= pagesToProcess; i++) {
            const page = await tempPdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            textContent.items.forEach(item => { pdfText += item.str + " "; });
            pdfText += "\n";
        }
        console.log(`Extracted text length (for AI): ${pdfText.length}`);
        return pdfText;
    } catch (error) {
        console.error(`Error extracting text from PDF ${pdfPath}:`, error);
        return null;
    }
}


// --- AI Explanation Trigger (Internal) ---
async function handleExplainSelectionInternal(selectedText, context) { /* ... unchanged ... */
     const explanationArea = document.getElementById('ai-explanation-area');
     const explanationContent = document.getElementById('ai-explanation-content');
     if (!explanationArea || !explanationContent) return;
     explanationContent.innerHTML = `<div class="flex items-center justify-center space-x-2"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-sm">Generating explanation...</p></div>`;
     explanationArea.classList.remove('hidden');
     try {
         const explanationHtml = await explainStudyMaterialSnippet(selectedText, context);
         explanationContent.innerHTML = explanationHtml;
         await renderMathIn(explanationContent);
     } catch (error) {
          console.error("Error getting explanation:", error);
          explanationContent.innerHTML = `<p class="text-danger text-sm">Error: ${error.message}</p>`;
     }
}

// Explain selected text from Transcription
export function handleExplainSelection(sourceType) { /* ... unchanged ... */
    if (sourceType !== 'transcription') return;
    let selectedText = window.getSelection()?.toString().trim();
    if (!selectedText) { alert("Please select text..."); return; }
    if (!currentTranscriptionContent || !currentChapterNumber) { alert("Context missing..."); return; }
    const context = `From Transcription for Chapter ${currentChapterNumber}.`;
    handleExplainSelectionInternal(selectedText, context);
}

// Ask a question about the Transcription content
export function askQuestionAboutTranscription() { /* ... unchanged ... */
     if (!currentTranscriptionContent || !currentChapterNumber) { alert("Context missing..."); return; }
     const userQuestion = prompt(`Ask a question about the transcription for Chapter ${currentChapterNumber}:`);
     if (!userQuestion || userQuestion.trim() === "") return;
     const context = currentTranscriptionContent;
     handleExplainSelectionInternal(userQuestion, context);
}


// --- Navigation & Other Exports ---
export async function displayFormulaSheet(courseId, chapterNum) { /* ... unchanged ... */
    const formulaArea = document.getElementById('formula-sheet-area');
    if (!formulaArea) return;
    formulaArea.classList.remove('hidden');
    formulaArea.innerHTML = `<p class="text-center text-muted">Generating...</p><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
    if (!courseId || !chapterNum) { formulaArea.innerHTML = '<p class="text-warning">Error: Context missing.</p>'; return; }
    try {
        const sheetHtml = await generateFormulaSheet(courseId, chapterNum);
        formulaArea.innerHTML = sheetHtml;
        await renderMathIn(formulaArea);
    } catch (error) {
        console.error("Error displaying formula sheet:", error);
        formulaArea.innerHTML = `<p class="text-danger">Error generating: ${error.message || 'Unknown error'}</p>`;
    }
}

export function navigateChapterMaterial(courseId, chapterNum) { /* ... unchanged ... */
     const courseDef = globalCourseDataMap.get(courseId);
     if (!courseDef || chapterNum < 1 || chapterNum > courseDef.totalChapters) return;
     showCourseStudyMaterial(courseId, chapterNum);
}


// --- Assign functions to window scope ---
window.displayFormulaSheet = displayFormulaSheet;
window.handleExplainSelection = handleExplainSelection;
window.askQuestionAboutTranscription = askQuestionAboutTranscription;
window.navigateChapterMaterial = navigateChapterMaterial;
window.handleVideoWatched = handleVideoWatched;
window.initPdfViewer = initPdfViewer;
window.cleanupPdfViewer = cleanupPdfViewer;
window.handlePdfSnapshotForAI = handlePdfSnapshotForAI;
window.triggerSkipExamGeneration = triggerSkipExamGeneration;