// --- START OF FILE ui_course_study_material.js ---

// ui_course_study_material.js

// *** MODIFIED: Import 'data' state for subject access, and courseExamDefaults ***
import { currentUser, globalCourseDataMap, activeCourseId,
         setActiveCourseId, videoDurationMap, userCourseProgressMap,
         updateUserCourseProgress, data, courseExamDefaults, globalSubjectDefinitionsMap } from './state.js'; // Added courseExamDefaults
// MODIFIED: Import Firestore save/load functions for notes
import { saveUserCourseProgress, markChapterStudiedInCourse, saveUserFormulaSheet, loadUserFormulaSheet, saveUserChapterSummary, loadUserChapterSummary } from './firebase_firestore.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml, renderMathIn } from './utils.js';
// *** MODIFIED: Import new path config values, remove old ones ***
// *** MODIFIED: REMOVED EXAM_DURATIONS_MINUTES import, use FALLBACK_EXAM_CONFIG or courseExamDefaults ***
import { COURSE_BASE_PATH, DEFAULT_COURSE_PDF_FOLDER, DEFAULT_COURSE_TRANSCRIPTION_FOLDER, PDF_WORKER_SRC, SKIP_EXAM_PASSING_PERCENT, PDF_PAGE_EQUIVALENT_SECONDS, YOUTUBE_API_KEY, FALLBACK_EXAM_CONFIG, SUBJECT_RESOURCE_FOLDER } from './config.js';
// MODIFIED: Removed import of generateSkipExam from ai_integration
// *** UPDATED Imports: Use USER-SPECIFIC save/load functions and WHOLE PDF AI ***
import { generateFormulaSheet, explainStudyMaterialSnippet, getExplanationForPdfSnapshot, getAllPdfTextForAI, generateChapterSummary, askAboutPdfDocument, extractTextFromImageAndConvertToLatex } from './ai_integration.js'; // MODIFIED: Added extractTextFromImageAndConvertToLatex
// *** MODIFIED: Import extractQuestionsFromMarkdown (not parseSkipExamText) ***
import { extractQuestionsFromMarkdown } from './markdown_parser.js';
import { launchOnlineTestUI, setCurrentOnlineTestState } from './ui_online_test.js';
import { generateAndDownloadPdfWithMathJax, generateFormulaSheetPdfBaseHtml, downloadTexFile } from './ui_pdf_generation.js';
import { showCurrentCourseDashboard } from './ui_course_dashboard.js';
// MODIFIED: Import test_logic functions (Keep if needed elsewhere, but not used in skip exam now)
import { parseChapterProblems, selectProblemsForExam, combineProblemsWithQuestions } from './test_logic.js';
// MODIFIED: Import notes functions - Added setLastViewedChapterForNotes
import { showNotesDocumentsPanel, setLastViewedChapterForNotes } from './ui_notes_documents.js';
// *** MODIFIED: Import filename utils ***
import { generateStructuredFilename, getSrtFilenameFromTitle } from './filename_utils.js';
// *** ADDED: Import calculateChapterCombinedProgress from course_logic.js ***
import { calculateChapterCombinedProgress } from './course_logic.js';
import { cleanTextForFilename } from './filename_utils.js'


// --- Module State ---
let currentTranscriptionData = [];
let currentPdfTextContent = null; // Holds text extracted for AI (not full content)
let currentChapterNumber = null;
let currentCourseIdInternal = null;
let transcriptionHighlightInterval = null;
let isTranscriptionExpanded = false;
export {videoDurationMap}

// PDF.js State
let pdfDoc = null;
let pdfPageNum = 1;
let pdfPageRendering = false;
let pdfPageNumPending = null;
let pdfScale = 1.5;
let pdfCanvas = null;
let pdfCtx = null;
let pdfViewerContainer = null;
let pdfTotalPages = 0; // Store total pages for the current PDF

// YouTube API State
let ytPlayers = {};
let ytApiLoaded = false;
let ytInitializationQueue = [];
let videoWatchStatus = {};
const VIDEO_WATCH_THRESHOLD_PERCENT = 0.9; // Watch 90% to count as 'watched' for progress

// Chapter Video State
let chapterLectureVideos = [];
let currentVideoIndex = 0;

// AI Explanation/Chat History (for this UI context)
let currentExplanationHistory = [];
let currentPdfExplanationHistory = [];
let currentTranscriptionExplanationHistory = [];


// --- End Module State ---


// --- Helper Functions ---

// Function to fetch and parse SRT file with timestamps
async function fetchAndParseSrt(filePath) {
    console.log('[fetchAndParseSrt] Fetching SRT from raw path:', filePath);
    if (!filePath) {
        console.warn('[fetchAndParseSrt] Received null or empty file path. Aborting fetch.');
        return [];
    }
    try {
        const encodedFilePath = filePath.includes('%') ? filePath : encodeURI(filePath);
        const fetchUrl = `${encodedFilePath}?t=${new Date().getTime()}`; 
        console.log(`[fetchAndParseSrt] Attempting fetch from URL: ${fetchUrl}`);

        const response = await fetch(fetchUrl);
        const contentType = response.headers.get("content-type");
        console.log(`[fetchAndParseSrt] Received Content-Type: "${contentType}" for ${filePath}.`); 
        const validContentTypes = ["text/plain", "application/srt", "text/srt", "application/x-subrip"];
        const isValidContentType = contentType && validContentTypes.some(validType => contentType.includes(validType));

        if (!isValidContentType) {
            console.warn(`[fetchAndParseSrt] Received potentially incorrect Content-Type: "${contentType}" for ${filePath}. Expected one of: ${validContentTypes.join(', ')}. Processing anyway, but might indicate server config issue or fallback HTML.`);
        }
        
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`[fetchAndParseSrt] 404 - SRT File not found at path: ${filePath} (Encoded: ${encodedFilePath}). Check base path and generated filename.`);
                return [];
            }
             if (!isValidContentType && response.status !== 200) { 
                  console.error(`[fetchAndParseSrt] Received bad status (${response.status}) AND potentially incorrect Content-Type ("${contentType}") for ${filePath}. Returning empty array.`);
                  return [];
             }
            throw new Error(`HTTP error fetching SRT file! status: ${response.status} for ${filePath}`);
        }
        if (!isValidContentType) {
             console.log(`[fetchAndParseSrt] Response status is OK (${response.status}), proceeding with parsing despite unusual Content-Type: "${contentType}"`);
        }

        const srtContent = await response.text();
        const lines = srtContent.split(/\r?\n/);
        const entries = [];
        let entryIdCounter = 1; 

        const timeToSeconds = (timeStr) => {
             if (!timeStr || typeof timeStr !== 'string') return 0; 
            const parts = timeStr.split(',');
            if (parts.length !== 2) {
                if (!timeStr.includes(':')) {
                    console.warn("Could not parse time string: invalid format.", timeStr);
                    return 0;
                }
                parts[0] = timeStr;
                parts[1] = '000';
            }
            const hmsPart = parts[0];
            const msStr = parts[1];
            const ms = parseInt(msStr, 10);
            const timeParts = hmsPart.split(':');
            let h = 0, m = 0, s = 0;
            if (timeParts.length === 3) { h = parseInt(timeParts[0], 10); m = parseInt(timeParts[1], 10); s = parseInt(timeParts[2], 10);
            } else if (timeParts.length === 2) { h = 0; m = parseInt(timeParts[0], 10); s = parseInt(timeParts[1], 10);
            } else if (timeParts.length === 1 && !isNaN(parseInt(timeParts[0], 10))) { h = 0; m = 0; s = parseInt(timeParts[0], 10);
            } else { console.warn("Could not parse time string: invalid H:M:S structure.", hmsPart, "in", timeStr); return 0; }
            if (isNaN(h) || isNaN(m) || isNaN(s)) { console.warn("Could not parse time string: NaN value encountered.", timeParts, "in", timeStr); return 0; }
            return h * 3600 + m * 60 + s + (isNaN(ms) ? 0 : ms / 1000); 
        };
        
        let entry = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) { if (entry && entry.text.length > 0) { entry.text = entry.text.join(' ').trim(); entries.push(entry); entry = null; } continue; }
            if (line.includes('-->')) {
                if (entry && entry.text.length > 0) { entry.text = entry.text.join(' ').trim(); entries.push(entry); }
                const times = line.split('-->');
                if (times.length === 2) {
                    const startSeconds = timeToSeconds(times[0].trim());
                    const endSeconds = timeToSeconds(times[1].trim());
                    if (endSeconds >= startSeconds) { entry = { id: entryIdCounter++, start: startSeconds, end: endSeconds, text: [] };
                    } else { console.warn(`Malformed timestamp line in SRT: end time (${times[1].trim()}) before start time (${times[0].trim()}). Skipping entry.`); entry = null; }
                } else { console.warn(`Malformed timestamp line in SRT: "${line}". Skipping.`); entry = null; }
            }
            else if (/^\d+$/.test(line) && lines[i+1]?.includes('-->')) { continue; }
            else if (entry) { entry.text.push(line); }
        }
        if (entry && entry.text.length > 0) { entry.text = entry.text.join(' ').trim(); entries.push(entry); }
        console.log(`fetchAndParseSrt: Parsed ${entries.length} entries from ${filePath}`);
        return entries;
    } catch (error) {
        console.error(`Error fetching/parsing SRT file (${filePath}):`, error);
        console.error('[fetchAndParseSrt] Full error object:', error);
        return [];
    }
}


// Function to parse YouTube URL
export function getYouTubeVideoId(url) { 
     if (!url) return null;
    try {
        if (url.includes('youtube.com/watch')) {
            const urlParams = new URLSearchParams(new URL(url).search);
            const videoId = urlParams.get('v');
            if (videoId) return videoId;
        }
        else if (url.includes('youtu.be/')) {
             const pathParts = new URL(url).pathname.split('/');
             if (pathParts.length >= 2 && pathParts[1]) {
                  return pathParts[1].split('?')[0];
             }
        }
         else if (url.includes('youtube.com/embed/')) {
             const pathParts = new URL(url).pathname.split('/');
             if (pathParts.length >= 3 && pathParts[2]) {
                  return pathParts[2].split('?')[0];
             }
         }
         else if (url.includes('youtube.com/shorts/')) {
             const pathParts = new URL(url).pathname.split('/');
             if (pathParts.length >= 3 && pathParts[2]) {
                 return pathParts[2].split('?')[0];
             }
         }

    } catch (e) { console.error("Invalid URL format provided to getYouTubeVideoId:", url, e); }
    console.warn("Could not extract YouTube Video ID from URL:", url);
    return null;
}

// --- YouTube IFrame API Functions ---
export function loadYouTubeAPI() {
    if (ytApiLoaded || window.ytApiLoadingInitiated) {
        console.log(`YouTube API ${ytApiLoaded ? 'already loaded' : 'loading already initiated'}.`);
        if(ytApiLoaded && typeof window.onYouTubeIframeAPIReady === 'function') {
            try { window.onYouTubeIframeAPIReady(); } catch (e) { console.error("Error re-triggering onYouTubeIframeAPIReady:", e); }
        }
        return;
    }
    console.log("Loading YouTube IFrame Player API...");
    window.ytApiLoadingInitiated = true; 

    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
        document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
        console.log("YouTube IFrame Player API Ready.");
        ytApiLoaded = true;
        window.ytApiLoadingInitiated = false; 
        const queueToProcess = [...ytInitializationQueue];
        ytInitializationQueue = [];
        queueToProcess.forEach(item => {
            if (window.YT && window.YT.Player) {
                createYTPlayer(item.elementId, item.videoId);
            } else {
                console.error(`YT.Player still not available when processing queue for ${item.elementId}. Re-queueing.`);
                ytInitializationQueue.push(item);
            }
        });
         if (ytInitializationQueue.length > 0) {
              console.error(`Failed to initialize ${ytInitializationQueue.length} YT players from queue. API might not be fully functional.`);
         }
    };
 }

function createYTPlayer(elementId, videoId) {
     const container = document.getElementById(elementId);
    if (!container) {
        console.error(`Cannot create YT Player: Container element #${elementId} not found in DOM.`);
        return;
    }
    if (!videoId || typeof videoId !== 'string' || videoId.trim().length === 0) {
         console.error(`Cannot create YT Player for #${elementId}: Invalid videoId provided ('${videoId}').`);
         container.innerHTML = `<p class="text-red-500 text-sm p-4">Error: Invalid video ID provided.</p>`;
         return;
    }

    if (!ytApiLoaded || !window.YT || !window.YT.Player) {
        console.log(`YouTube API not ready, queueing player creation for ${elementId} (Video ID: ${videoId})`);
        if (!ytInitializationQueue.some(item => item.elementId === elementId)) {
             ytInitializationQueue.push({ elementId, videoId });
        }
        container.innerHTML = `<div class="flex items-center justify-center h-full bg-black rounded text-center p-4"><p class="text-gray-400 text-sm italic">Waiting for YouTube API...</p></div>`;
        if (!window.ytApiLoadingInitiated) {
            loadYouTubeAPI();
        }
        return;
    }

    console.log(`Creating YouTube player for element ${elementId} with video ID ${videoId}`);
    try {
         container.innerHTML = '';
         ytPlayers[elementId] = { player: null, videoId: videoId, intervalId: null, totalDuration: null };
        const player = new YT.Player(elementId, {
            videoId: videoId,
            playerVars: { 'playsinline': 1, 'modestbranding': 1, 'rel': 0 },
            events: {
                'onReady': (event) => onPlayerReady(event, elementId),
                'onStateChange': (event) => onPlayerStateChange(event, videoId, elementId),
                'onError': (event) => onPlayerError(event, videoId, elementId)
            }
        });
    } catch (error) {
        console.error(`Failed to create YouTube player for ${elementId}:`, error);
        container.innerHTML = `<p class="text-red-500 text-sm p-4">Error loading video player. Check console and try disabling extensions.</p>`;
        if (ytPlayers[elementId]) { delete ytPlayers[elementId]; }
    }
}

function onPlayerReady(event, elementId) {
    const playerState = ytPlayers[elementId];
    if (!playerState) {
        console.warn(`onPlayerReady called for element ${elementId}, but no player state found.`);
        return;
    }
    console.log(`Player ready: ${playerState.videoId} (Element: ${elementId})`);
    playerState.player = event.target;

    try {
        const duration = playerState.player.getDuration();
        if (duration > 0) {
            playerState.totalDuration = duration;
            videoDurationMap[playerState.videoId] = duration; 
            console.log(`Video ${playerState.videoId} Duration: ${playerState.totalDuration}s`);
        } else {
             console.warn(`Video ${playerState.videoId} reported duration 0 or invalid.`);
             playerState.totalDuration = null;
        }
        const progress = userCourseProgressMap.get(currentCourseIdInternal);
        if (progress && progress.enrollmentMode !== 'viewer') {
             progress.watchedVideoDurations = progress.watchedVideoDurations || {};
             progress.watchedVideoDurations[currentChapterNumber] = progress.watchedVideoDurations[currentChapterNumber] || {};
             if (progress.watchedVideoDurations[currentChapterNumber][playerState.videoId] === undefined) {
                  progress.watchedVideoDurations[currentChapterNumber][playerState.videoId] = 0;
             }
             videoWatchStatus[playerState.videoId] = {
                 watchedDuration: progress.watchedVideoDurations[currentChapterNumber][playerState.videoId],
                 isComplete: false, 
                 lastTrackedTime: null 
             };
             console.log(`Initialized watch status for ${playerState.videoId}: ${videoWatchStatus[playerState.videoId].watchedDuration}s watched (from progress)`);
        } else {
            videoWatchStatus[playerState.videoId] = { watchedDuration: 0, isComplete: false, lastTrackedTime: null };
            console.log(`Initialized watch status for ${playerState.videoId} (Viewer mode).`);
        }
    } catch (e) {
         console.error("Error during onPlayerReady operations:", e);
         playerState.totalDuration = null; 
    }
}

function onPlayerError(event, videoId, elementId) {
    console.error(`YouTube Player Error for video ${videoId} (Element: ${elementId}): Code ${event.data}`);
    const container = document.getElementById(elementId);
    let errorMsg = `Error loading video (Code: ${event.data}).`;
    switch(event.data) {
        case 2: errorMsg = "Invalid video ID. The video may not exist or the link is incorrect."; break;
        case 5: errorMsg = "HTML5 Player Error. Try reloading the page or disabling browser extensions (like ad blockers)."; break;
        case 100: errorMsg = "Video not found, removed by user, or marked as private."; break;
        case 101: case 150: errorMsg = "Video owner has disabled embedding. You might need to watch it directly on YouTube."; break;
        default: errorMsg = `Playback error (Code: ${event.data}). Please check your connection or try again later. Reloading may help.`;
    }
    if (container) container.innerHTML = `<div class="flex items-center justify-center h-full bg-black rounded text-center p-4"><p class="text-red-500 text-sm">${errorMsg}</p></div>`;
    if (ytPlayers[elementId]) {
        if (ytPlayers[elementId].intervalId) clearInterval(ytPlayers[elementId].intervalId);
        delete ytPlayers[elementId]; 
        delete videoWatchStatus[videoId]; 
    }
}

function onPlayerStateChange(event, videoId, elementId) {
     const playerState = ytPlayers[elementId];
    if (!playerState || !playerState.player) { 
        console.warn(`onPlayerStateChange for ${elementId} but player state or instance is missing.`);
        return;
    }
    const progress = userCourseProgressMap.get(currentCourseIdInternal);
    const isViewer = progress?.enrollmentMode === 'viewer';
    const playerInstance = playerState.player; 

    try { 
        if (event.data === YT.PlayerState.PLAYING) {
            console.log(`Video playing: ${videoId}`);
            if (playerState.intervalId === null) {
                if(playerState.intervalId) clearInterval(playerState.intervalId);
                playerState.intervalId = setInterval(() => {
                    if (!isViewer) trackWatchTime(videoId, elementId); 
                    highlightTranscriptionLine(); 
                }, 1000);
                console.log(`Watch time tracking started for ${videoId}`);
            }
        } else { 
            if (playerState.intervalId !== null) {
                clearInterval(playerState.intervalId);
                playerState.intervalId = null;
                console.log(`Watch time tracking stopped for ${videoId} (State: ${event.data})`);
                if (!isViewer) {
                    saveVideoWatchProgress(videoId); 
                }
            }
            if (event.data === YT.PlayerState.ENDED) {
                console.log(`Video ended: ${videoId}`);
                if (videoWatchStatus[videoId] && playerState.totalDuration > 0) {
                     videoWatchStatus[videoId].watchedDuration = playerState.totalDuration;
                     videoWatchStatus[videoId].isComplete = true; 
                     console.log(`Video ${videoId} marked as complete internally (status: ENDED).`);
                } else if (videoWatchStatus[videoId]) {
                    videoWatchStatus[videoId].isComplete = true;
                    console.log(`Video ${videoId} marked as complete internally (status: ENDED, duration unknown).`);
                }
                if (!isViewer) {
                    saveVideoWatchProgress(videoId).then(() => {
                        checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber);
                    }).catch(err => console.error("Error saving progress after video ended:", err));
                }
            }
        }
    } catch (e) {
         console.error("Error handling player state change:", e);
         if (playerState && playerState.intervalId) {
             clearInterval(playerState.intervalId);
             playerState.intervalId = null;
         }
    }
}

async function trackWatchTime(videoId, elementId) { 
    const playerState = ytPlayers[elementId];
    if (!playerState || !playerState.player || typeof playerState.player.getCurrentTime !== 'function') {
         console.warn("trackWatchTime: Player state or getCurrentTime function missing for", elementId);
         if (playerState && playerState.intervalId) {
              clearInterval(playerState.intervalId);
              playerState.intervalId = null;
         }
         return;
    }
    const progress = userCourseProgressMap.get(currentCourseIdInternal);
    if (progress?.enrollmentMode === 'viewer') return; 

    try {
         const currentTime = playerState.player.getCurrentTime();
         const totalDuration = playerState.totalDuration; 
         if (videoWatchStatus[videoId] && totalDuration > 0) { 
              const watchedStatus = videoWatchStatus[videoId];
              if (watchedStatus.lastTrackedTime === null || currentTime > watchedStatus.lastTrackedTime + 0.5) {
                   const timeIncrement = (watchedStatus.lastTrackedTime === null) ? 1 : currentTime - watchedStatus.lastTrackedTime;
                   watchedStatus.watchedDuration = Math.min(totalDuration, (watchedStatus.watchedDuration || 0) + timeIncrement);
                   watchedStatus.lastTrackedTime = currentTime;
                   const progressPercent = watchedStatus.watchedDuration / totalDuration;
                   if (progressPercent >= VIDEO_WATCH_THRESHOLD_PERCENT && !watchedStatus.isComplete) {
                       watchedStatus.isComplete = true;
                       console.log(`Video ${videoId} reached watch threshold (>= ${VIDEO_WATCH_THRESHOLD_PERCENT*100}%). Marked complete internally.`);
                       await saveVideoWatchProgress(videoId);
                       await checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber);
                   }
                   if (Math.round(watchedStatus.watchedDuration) > 0 && Math.round(watchedStatus.watchedDuration) % 30 === 0) {
                        await saveVideoWatchProgress(videoId);
                   }
              }
         }
    } catch (e) {
         console.warn("Error getting current time in trackWatchTime:", e);
         if (playerState.intervalId) { clearInterval(playerState.intervalId); playerState.intervalId = null; }
    }
}


async function saveVideoWatchProgress(videoId) {
      if (!currentUser || !currentCourseIdInternal || !currentChapterNumber || !videoWatchStatus[videoId]) {
          console.warn(`Cannot save video progress for ${videoId}: Missing context or status.`);
          return Promise.resolve(); 
     }
     const progress = userCourseProgressMap.get(currentCourseIdInternal);
     if (!progress || progress.enrollmentMode === 'viewer') {
          console.log(`Viewer mode for ${videoId}, skipping save.`);
          return Promise.resolve();
     }
     progress.watchedVideoDurations = progress.watchedVideoDurations || {};
     progress.watchedVideoDurations[currentChapterNumber] = progress.watchedVideoDurations[currentChapterNumber] || {};
     const newDuration = Math.round(videoWatchStatus[videoId].watchedDuration);
     const totalDuration = videoDurationMap[videoId]; 
     const clampedDuration = (typeof totalDuration === 'number' && totalDuration > 0) ? Math.min(newDuration, totalDuration) : newDuration;

     if (progress.watchedVideoDurations[currentChapterNumber][videoId] !== clampedDuration) {
          progress.watchedVideoDurations[currentChapterNumber][videoId] = clampedDuration;
          console.log(`Saving watched duration for ${videoId} (Ch ${currentChapterNumber}): ${clampedDuration}s`);
          updateUserCourseProgress(currentCourseIdInternal, progress); 
          return saveUserCourseProgress(currentUser.uid, currentCourseIdInternal, progress)
              .then(() => console.log(`Firestore save successful for video ${videoId} progress.`))
              .catch(err => {
                   console.error(`Failed to save video progress to Firestore for ${videoId}:`, err);
              });
     } else {
         return Promise.resolve(); 
     }
}

export async function handleVideoWatched(videoId) {
     console.log(`handleVideoWatched called for video ${videoId}. Checking chapter study status.`);
    const progress = userCourseProgressMap.get(currentCourseIdInternal);
    if (progress?.enrollmentMode !== 'viewer') {
        await saveVideoWatchProgress(videoId);
        await checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber);
    } else {
        console.log(`Viewer mode, skipping study status check for Ch ${currentChapterNumber}.`);
    }
}


async function checkAndMarkChapterStudied(courseId, chapterNum) {
     if (!currentUser || !courseId || !chapterNum) {
         console.warn("checkAndMarkChapterStudied: Missing user, courseId, or chapterNum.");
         return;
     }
    const progress = userCourseProgressMap.get(courseId);
    const courseDef = globalCourseDataMap.get(courseId);
    if (!progress || !courseDef) {
        console.warn(`checkAndMarkChapterStudied: Missing progress or course definition for ${courseId}.`);
        return;
    }
    if (progress.enrollmentMode === 'viewer') {
         console.log(`Viewer mode, skipping study status check for Ch ${chapterNum}.`);
         return;
    }
    const studiedChaptersSet = new Set(progress.courseStudiedChapters || []);
    if (studiedChaptersSet.has(chapterNum)) {
         return;
    }
    const skipScore = progress.lastSkipExamScore?.[chapterNum];
    const skipExamThreshold = courseDef.skipExamPassingPercent || SKIP_EXAM_PASSING_PERCENT;
    if (skipScore !== undefined && skipScore !== null && skipScore >= skipExamThreshold) {
         console.log(`Chapter ${chapterNum} passed skip exam (Score: ${skipScore} >= ${skipExamThreshold}). Marking studied.`);
         try {
            await markChapterStudiedInCourse(currentUser.uid, courseId, chapterNum, "skip_exam_pass");
            console.log(`Chapter ${chapterNum} marked as studied in Firestore due to passing skip exam.`);
            progress.courseStudiedChapters = progress.courseStudiedChapters || [];
            if (!progress.courseStudiedChapters.includes(chapterNum)) {
                 progress.courseStudiedChapters.push(chapterNum);
                 updateUserCourseProgress(courseId, { courseStudiedChapters: progress.courseStudiedChapters });
            }
            const studyButton = document.querySelector(`#chapter-progress-${chapterNum} button[onclick*="showCourseStudyMaterial"]`);
            const skipButtonContainer = document.querySelector(`#chapter-progress-${chapterNum} .flex.items-center.gap-2.ml-auto`); 
            const progressBarContainer = document.getElementById(`chapter-progress-${chapterNum}`);
            if(progressBarContainer) { progressBarContainer.closest('.content-card')?.classList.add('bg-green-50', 'dark:bg-green-900/30'); }
            if(studyButton) studyButton.textContent = 'Review Chapter';
            if(skipButtonContainer) {
                 skipButtonContainer.innerHTML = `<span class="text-xs text-green-600 dark:text-green-400 font-medium">(Skip Passed: ${skipScore.toFixed(0)}%)</span>`;
            }
         } catch(error) {
             console.error(`Failed to mark Ch ${chapterNum} studied after skip exam pass:`, error);
         }
         return; 
    }
    const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
    const lecturesForChapter = (Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : []).filter(lec => typeof lec === 'object' && lec.url && lec.title);
    const videoIdsForChapter = lecturesForChapter.map(lec => getYouTubeVideoId(lec.url)).filter(id => id !== null);
    const chapterVideoDurationMap = {};
    let missingDuration = false;
    videoIdsForChapter.forEach(id => {
        if (videoDurationMap[id] !== undefined && videoDurationMap[id] !== null) {
             chapterVideoDurationMap[id] = videoDurationMap[id];
        } else {
             console.warn(`Duration missing or null for video ${id} in chapter ${chapterNum} during study check.`);
             missingDuration = true;
        }
    });
    if (missingDuration && videoIdsForChapter.length > 0) {
        console.log(`Ch ${chapterNum}: Skipping study check due to missing video duration(s). Will re-check later.`);
        return;
    }
    const pdfInfo = progress.pdfProgress?.[chapterNum] || null; 
    const { isComplete } = calculateChapterCombinedProgress(progress, chapterNum, chapterVideoDurationMap, pdfInfo);
    console.log(`Checking study status for Ch ${chapterNum}. Is Complete Flag: ${isComplete}`);
    if (isComplete) { 
        console.log(`Chapter ${chapterNum} reached 100% combined progress. Marking studied.`);
        try {
             await markChapterStudiedInCourse(currentUser.uid, courseId, chapterNum, "progress_complete");
             console.log(`Chapter ${chapterNum} marked as studied in Firestore due to reaching 100% progress.`);
            progress.courseStudiedChapters = progress.courseStudiedChapters || [];
            if (!progress.courseStudiedChapters.includes(chapterNum)) {
                 progress.courseStudiedChapters.push(chapterNum);
                 updateUserCourseProgress(courseId, { courseStudiedChapters: progress.courseStudiedChapters });
            }
            const progressBarContainer = document.getElementById(`chapter-progress-${chapterNum}`);
            if (progressBarContainer) {
                const progressBar = progressBarContainer.querySelector('.bg-blue-500'); 
                const progressTooltip = progressBarContainer.querySelector('.progress-tooltip-text');
                if (progressBar) { progressBar.style.width = '100%'; progressBar.classList.remove('bg-blue-500'); progressBar.classList.add('!bg-green-500'); }
                if (progressTooltip) progressTooltip.textContent = 'Completed: 100%';
                progressBarContainer.closest('.content-card')?.classList.add('bg-green-50', 'dark:bg-green-900/30');
                const skipButtonContainer = progressBarContainer.closest('.content-card').querySelector('.flex.items-center.gap-2.ml-auto'); 
                 if(skipButtonContainer) {
                     if (!skipButtonContainer.querySelector('span')?.textContent.includes('Skip Passed')) {
                         skipButtonContainer.innerHTML = `<span class="text-xs text-green-600 dark:text-green-400 font-medium">(Progress Complete)</span>`;
                     }
                 }
                 const studyButton = progressBarContainer.querySelector('button[onclick*="showCourseStudyMaterial"]');
                 if(studyButton) studyButton.textContent = 'Review Chapter';
            }
        } catch(error) {
             console.error(`Failed to mark Ch ${chapterNum} studied after progress completion:`, error);
        }
    } else {
         console.log(`Chapter ${chapterNum} not yet 100% complete (${calculateChapterCombinedProgress(progress, chapterNum, chapterVideoDurationMap, pdfInfo).percent}%).`);
    }
}


// --- Transcription Interaction ---
export function highlightTranscriptionLine() {
     if (!currentTranscriptionData || currentTranscriptionData.length === 0) return;
    const currentPlayerElementId = `ytplayer-${currentChapterNumber}-${currentVideoIndex}`;
    const activePlayerState = ytPlayers[currentPlayerElementId];
    let currentTime = 0;
    if (activePlayerState && activePlayerState.player && typeof activePlayerState.player.getCurrentTime === 'function') {
         try { currentTime = activePlayerState.player.getCurrentTime(); }
         catch (e) { console.warn("Could not get current time from player", e); return; }
    } else {
         return;
    } 
    const transcriptionContainer = document.getElementById('transcription-content');
    if (!transcriptionContainer) return; 
    let currentLineId = null;
    for (const entry of currentTranscriptionData) {
        if (currentTime >= entry.start && currentTime <= entry.end) {
            currentLineId = `t-line-${entry.id}`;
            break; 
        }
    }
    transcriptionContainer.querySelectorAll('.transcription-line.active').forEach(el => {
        el.classList.remove('active', 'bg-yellow-100', 'dark:bg-yellow-700/50', 'p-2', 'font-semibold'); 
        el.classList.add('p-1'); 
    });
    const currentLineElement = currentLineId ? document.getElementById(currentLineId) : null;
    if (isTranscriptionExpanded) {
        if (currentLineElement) {
            currentLineElement.classList.add('active', 'bg-yellow-100', 'dark:bg-yellow-700/50', 'p-2', 'font-semibold');
            currentLineElement.classList.remove('p-1'); 
            const containerRect = transcriptionContainer.getBoundingClientRect();
            const lineRect = currentLineElement.getBoundingClientRect();
            const isVisible = lineRect.top >= containerRect.top && lineRect.bottom <= containerRect.bottom;
            if (!isVisible) {
                 currentLineElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    } else {
        transcriptionContainer.querySelectorAll('.transcription-line').forEach(el => { el.classList.add('hidden'); });
        const placeholder = transcriptionContainer.querySelector('.transcription-placeholder');
        if (currentLineElement) {
            currentLineElement.classList.remove('hidden');
            currentLineElement.classList.add('active'); 
            placeholder?.classList.add('hidden'); 
        } else {
            if (placeholder) {
                placeholder.classList.remove('hidden');
            } else {
                 const p = document.createElement('p');
                 p.className = 'transcription-placeholder text-xs italic text-muted p-1';
                 p.textContent = '(Syncing transcription...)';
                 transcriptionContainer.prepend(p);
            }
        }
    }
}


export function handleTranscriptionClick(event) {
     const lineElement = event.target.closest('.transcription-line');
    if (!lineElement || !lineElement.dataset.startTime) return;
    const startTime = parseFloat(lineElement.dataset.startTime);
    if (isNaN(startTime)) return;
    const currentPlayerElementId = `ytplayer-${currentChapterNumber}-${currentVideoIndex}`;
    const playerToSeek = ytPlayers[currentPlayerElementId]?.player;
    if (playerToSeek && typeof playerToSeek.seekTo === 'function' && typeof playerToSeek.playVideo === 'function') {
         console.log(`Seeking video to ${startTime}s`);
         playerToSeek.seekTo(startTime, true); 
         playerToSeek.playVideo(); 
    } else {
         console.warn("Could not find current player or 'seekTo'/'playVideo' method for transcription click.");
    }
}
window.handleTranscriptionClick = handleTranscriptionClick; 

function toggleTranscriptionView() {
      isTranscriptionExpanded = !isTranscriptionExpanded;
     const container = document.getElementById('transcription-content');
     const toggleBtn = document.getElementById('transcription-toggle-btn');
     if (!container || !toggleBtn) return;
     container.classList.toggle('max-h-32', !isTranscriptionExpanded); 
     container.classList.toggle('max-h-96', isTranscriptionExpanded); 
     toggleBtn.textContent = isTranscriptionExpanded ? 'Collapse Transcription' : 'Expand Transcription';
     toggleBtn.title = isTranscriptionExpanded ? 'Show only the current line being spoken' : 'Show the full transcription text';
     renderTranscriptionLines();
     highlightTranscriptionLine();
}
window.toggleTranscriptionView = toggleTranscriptionView;

function renderTranscriptionLines() {
      const container = document.getElementById('transcription-content');
     if (!container) return;
     container.innerHTML = ''; 
     if (currentTranscriptionData && currentTranscriptionData.length > 0) {
          const linesHtml = currentTranscriptionData.map(entry =>
              `<span id="t-line-${entry.id}"
                     class="transcription-line block p-1 rounded cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors duration-150 ease-in-out ${isTranscriptionExpanded ? '' : 'hidden'}"
                     data-start-time="${entry.start}"
                     onclick="window.handleTranscriptionClick(event)">${escapeHtml(entry.text)}</span>`
          ).join('');
          container.innerHTML = linesHtml;
          if (!isTranscriptionExpanded) {
               const placeholder = document.createElement('p');
               placeholder.className = 'transcription-placeholder text-xs italic text-muted p-1 hidden';
               placeholder.textContent = '(Syncing transcription...)';
               container.prepend(placeholder); 
          }
     } else {
           container.innerHTML = '<p class="text-sm text-muted italic p-1">No transcription available for the current video.</p>';
     }
}


// --- Cleanup Functions ---
window.cleanupYouTubePlayers = () => {
      console.log(`Attempting to cleanup ${Object.keys(ytPlayers).length} YT player instances.`);
    Object.entries(ytPlayers).forEach(([elementId, playerData]) => {
        try {
             if (playerData && playerData.player && typeof playerData.player.destroy === 'function') {
                  console.log(`Destroying player for video ${playerData.videoId} (Element: ${elementId})`);
                  if (playerData.intervalId) {
                      clearInterval(playerData.intervalId);
                      console.log(`Cleared interval for ${elementId}`);
                  }
                  try {
                      playerData.player.destroy();
                  } catch (destroyError) {
                      console.warn(`Error during player.destroy() for ${elementId}:`, destroyError);
                  }
             } else if (playerData) {
                  console.log(`Player instance for ${elementId} was invalid or already destroyed during cleanup.`);
                   if (playerData.intervalId) clearInterval(playerData.intervalId); 
             }
        } catch (e) {
            console.error(`Error destroying YT player instance ${elementId}:`, e);
        }
    });
    ytPlayers = {};
    ytInitializationQueue = [];
    videoWatchStatus = {}; 
    if(transcriptionHighlightInterval) clearInterval(transcriptionHighlightInterval);
    transcriptionHighlightInterval = null;
    console.log("Cleaned up YouTube players state.");
};

export const cleanupPdfViewer = () => {
     if (pdfDoc) {
     }
    pdfDoc = null;
    pdfPageNum = 1;
    pdfPageRendering = false;
    pdfPageNumPending = null;
    pdfScale = 1.5; 
    pdfCanvas = null; 
    pdfCtx = null; 
    pdfViewerContainer = null; 
    currentPdfTextContent = null; 
    pdfTotalPages = 0; 
    const prevButton = document.getElementById('pdf-prev');
    const nextButton = document.getElementById('pdf-next');
    const explainButton = document.getElementById('pdf-explain-button');
    const askFullDocButton = document.querySelector('#pdf-controls button[onclick*="askAboutFullPdf"]'); 
    if (prevButton) prevButton.onclick = null;
    if (nextButton) nextButton.onclick = null;
    if (explainButton) explainButton.onclick = null;
    if (askFullDocButton) askFullDocButton.onclick = null;
    const viewerElement = document.getElementById('pdf-viewer-container');
    if (viewerElement) {
        viewerElement.innerHTML = ''; 
    }
    console.log("Cleaned up PDF viewer state.");
};
window.cleanupPdfViewer = cleanupPdfViewer;

// --- PDF.js Functions ---
export async function initPdfViewer(pdfPath) {
    cleanupPdfViewer();
    pdfViewerContainer = document.getElementById('pdf-viewer-container');
    const pdfControls = document.getElementById('pdf-controls');
    const pdfExplainButton = document.getElementById('pdf-explain-button'); 
    const askFullDocButton = document.querySelector('#pdf-controls button[onclick*="askAboutFullPdf"]'); 
    if (!pdfViewerContainer || !pdfControls || !pdfExplainButton || !askFullDocButton) {
         console.error("PDF viewer UI elements not found! Required: #pdf-viewer-container, #pdf-controls, #pdf-explain-button, askAboutFullPdf button.");
         displayContent('<p class="text-red-500 p-4">Error: PDF viewer UI elements are missing.</p>', 'course-dashboard-area');
         return; 
     }
    pdfViewerContainer.innerHTML = `<div class="p-4 text-center"><div class="loader animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-2 text-sm text-muted">Loading PDF from: ${escapeHtml(pdfPath) || 'N/A'}...</p></div>`;
    pdfControls.classList.add('hidden'); 
    pdfExplainButton.disabled = true; 
    askFullDocButton.disabled = true;
    if (!pdfPath) {
        console.error("initPdfViewer: No PDF path provided.");
        pdfViewerContainer.innerHTML = `<p class="text-red-500 p-4">Error: No PDF file path specified for this chapter.</p>`;
        return;
    }
     if (!pdfPath.toLowerCase().endsWith('.pdf')) {
         console.error(`initPdfViewer: Invalid PDF path "${pdfPath}". Does not end with '.pdf'.`);
         pdfViewerContainer.innerHTML = `<p class="text-red-500 p-4">Error: Invalid PDF file path provided. Path must end with '.pdf'.<br>Path: <code>${escapeHtml(pdfPath)}</code></p>`;
         return;
     }
    console.log('[PDF Init] Attempting to load PDF. Path variable:', pdfPath);
    try {
        if (typeof pdfjsLib === 'undefined') {
             console.error("PDF.js library (pdfjsLib) not loaded.");
             throw new Error("PDF library not available.");
         }
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
        console.log(`[PDF Init] PDF worker source set to: ${PDF_WORKER_SRC}`);
        const encodedPdfPath = pdfPath.includes('%') ? pdfPath : encodeURI(pdfPath);
        console.log(`[PDF Init] Attempting to load PDF. Final Encoded Path: ${encodedPdfPath}`);
        const loadingTask = pdfjsLib.getDocument(encodedPdfPath);
        loadingTask.promise.then(async (loadedPdfDoc) => {
            pdfDoc = loadedPdfDoc; 
            pdfTotalPages = pdfDoc.numPages; 
            console.log(`PDF loaded successfully: ${pdfTotalPages} pages.`);
            const progress = userCourseProgressMap.get(currentCourseIdInternal);
            const isViewer = progress?.enrollmentMode === 'viewer';
            let initialPageNum = 1;
            if (progress && !isViewer) {
                progress.pdfProgress = progress.pdfProgress || {};
                progress.pdfProgress[currentChapterNumber] = progress.pdfProgress[currentChapterNumber] || { currentPage: 0, totalPages: 0 };
                if (progress.pdfProgress[currentChapterNumber].totalPages !== pdfTotalPages) {
                    progress.pdfProgress[currentChapterNumber].totalPages = pdfTotalPages;
                }
                initialPageNum = Math.max(1, progress.pdfProgress[currentChapterNumber].currentPage || 1);
                initialPageNum = Math.min(initialPageNum, pdfTotalPages);
                pdfPageNum = initialPageNum; 
                console.log(`Restored PDF to page ${pdfPageNum} from progress.`);
            } else {
                 pdfPageNum = 1; 
            }
            pdfControls.classList.remove('hidden');
            pdfExplainButton.disabled = false; 
             askFullDocButton.disabled = false; 
            document.getElementById('pdf-page-num').textContent = pdfPageNum;
            document.getElementById('pdf-page-count').textContent = pdfTotalPages;
            pdfCanvas = document.createElement('canvas');
            pdfCanvas.id = 'pdf-canvas';
            pdfCtx = pdfCanvas.getContext('2d');
            pdfViewerContainer.innerHTML = ''; 
            pdfViewerContainer.appendChild(pdfCanvas); 
            await renderPdfPage(pdfPageNum);
            document.getElementById('pdf-prev').onclick = onPrevPage;
            document.getElementById('pdf-next').onclick = onNextPage;
            if (progress && !isViewer && (progress.pdfProgress[currentChapterNumber].currentPage !== pdfPageNum || progress.pdfProgress[currentChapterNumber].totalPages !== pdfTotalPages) ) {
                updatePdfProgressAndCheckCompletion(pdfPageNum); 
            }
        }).catch(error => {
            console.error(`[PDF Init] Error during pdfjsLib.getDocument('${encodedPdfPath}'): Name: ${error.name}, Message: ${error.message}`, error);
             let userMessage = `Error loading PDF: ${error.message || 'Unknown error'}.`;
             switch (error.name) {
                case 'InvalidPDFException': case 'FormatError': userMessage = "Error: Invalid PDF file structure. The file might be corrupted or not a valid PDF."; break;
                case 'MissingPDFException': userMessage = `Error: PDF file not found. Checked path: <code>${escapeHtml(pdfPath)}</code>`; break;
                case 'NetworkError': userMessage = `Error: Network problem loading PDF. Check your connection and the file path: <code>${escapeHtml(pdfPath)}</code>`; break;
                case 'UnknownErrorException': userMessage = `Error: An unknown error occurred loading the PDF. Check console. Path: <code>${escapeHtml(pdfPath)}</code>`; break;
                case 'UnexpectedResponseException': const statusText = error.status ? ` (Status: ${error.status})` : ''; userMessage = `Error: Server responded unexpectedly${statusText}. Path: <code>${escapeHtml(pdfPath)}</code>`; break;
                case 'PasswordException': userMessage = `Error: The PDF file is password protected and cannot be displayed.`; break;
                default: userMessage = `Error loading PDF (${error.name || 'Unknown Type'}): ${error.message || 'No details'}. Path: <code>${escapeHtml(pdfPath)}</code>`;
             }
             pdfViewerContainer.innerHTML = `<div class="p-4 text-center text-red-600 dark:text-red-400">${userMessage}</div>`;
             pdfControls.classList.add('hidden');
             pdfExplainButton.disabled = true;
             askFullDocButton.disabled = true;
             cleanupPdfViewer(); 
        });
    } catch (error) {
        console.error("Synchronous error during PDF viewer initialization:", error);
        pdfViewerContainer.innerHTML = `<p class="text-red-500 p-4">Error initializing PDF viewer: ${error.message}. Check console for details.</p>`;
        pdfControls.classList.add('hidden');
        pdfExplainButton.disabled = true;
         askFullDocButton.disabled = true;
        cleanupPdfViewer(); 
    }
}


async function renderPdfPage(num) {
    if (!pdfDoc || pdfPageRendering) {
        if (!pdfDoc) console.warn("renderPdfPage called but pdfDoc is null.");
        if (pdfPageRendering) pdfPageNumPending = num; 
        return;
    }
    pdfPageRendering = true; 
    document.getElementById('pdf-page-num').textContent = num;
    document.getElementById('pdf-prev').disabled = (num <= 1);
    document.getElementById('pdf-next').disabled = (num >= pdfTotalPages); 
    try {
        const page = await pdfDoc.getPage(num);
        const viewport = page.getViewport({ scale: pdfScale }); 
        if (!pdfCanvas || !pdfCtx) { throw new Error("PDF canvas or context missing during render."); }
        pdfCanvas.height = viewport.height;
        pdfCanvas.width = viewport.width;
        const renderContext = { canvasContext: pdfCtx, viewport: viewport };
        const renderTask = page.render(renderContext);
        await renderTask.promise; 
    } catch (error) {
         console.error(`Error rendering page ${num}:`, error);
          if (pdfCtx && pdfCanvas) {
               pdfCtx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height); 
               pdfCtx.fillStyle = 'red';
               pdfCtx.font = '16px sans-serif';
               pdfCtx.textAlign = 'center';
               pdfCtx.fillText(`Error rendering page ${num}. See console.`, pdfCanvas.width / 2, pdfCanvas.height / 2);
          }
    } finally {
        pdfPageRendering = false; 
        if (pdfPageNumPending !== null) {
            const pendingPage = pdfPageNumPending;
            pdfPageNumPending = null; 
            renderPdfPage(pendingPage); 
        }
    }
}

function queueRenderPage(num) {
    if (pdfPageRendering) {
        pdfPageNumPending = num;
    } else {
        renderPdfPage(num);
    }
}

function onPrevPage() {
    if (pdfPageNum <= 1) return; 
    pdfPageNum--;
    const progress = userCourseProgressMap.get(currentCourseIdInternal);
    if (progress && progress.enrollmentMode !== 'viewer') {
        updatePdfProgressAndCheckCompletion(pdfPageNum); 
    }
    queueRenderPage(pdfPageNum); 
}

function onNextPage() {
     if (!pdfDoc || pdfPageNum >= pdfTotalPages) return; 
    pdfPageNum++;
     const progress = userCourseProgressMap.get(currentCourseIdInternal);
     if (progress && progress.enrollmentMode !== 'viewer') {
        updatePdfProgressAndCheckCompletion(pdfPageNum); 
    }
    queueRenderPage(pdfPageNum); 
}

async function updatePdfProgressAndCheckCompletion(newPageNum) {
      if (!currentUser || !currentCourseIdInternal || !currentChapterNumber) {
          console.warn("updatePdfProgress: Missing user/course/chapter context.");
          return;
      }
     const progress = userCourseProgressMap.get(currentCourseIdInternal);
     if (!progress || progress.enrollmentMode === 'viewer') {
          console.log("Viewer mode or no progress data, skipping PDF progress update.");
          return;
     }
     progress.pdfProgress = progress.pdfProgress || {};
     progress.pdfProgress[currentChapterNumber] = progress.pdfProgress[currentChapterNumber] || { currentPage: 0, totalPages: pdfTotalPages || 0 };
     const currentProgressData = progress.pdfProgress[currentChapterNumber];
     const currentStoredPage = currentProgressData.currentPage || 0;
     let progressChanged = false;
     if (newPageNum > currentStoredPage) {
         currentProgressData.currentPage = newPageNum;
         progressChanged = true;
     }
     if (pdfTotalPages > 0 && currentProgressData.totalPages !== pdfTotalPages) {
          currentProgressData.totalPages = pdfTotalPages;
          progressChanged = true;
     }
     if (progressChanged) {
         console.log(`Updating PDF progress for Ch ${currentChapterNumber}: Page ${currentProgressData.currentPage} / ${currentProgressData.totalPages}`);
         updateUserCourseProgress(currentCourseIdInternal, { pdfProgress: progress.pdfProgress }); 
         try {
             await saveUserCourseProgress(currentUser.uid, currentCourseIdInternal, progress); 
             console.log("PDF progress saved successfully.");
             await checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber);
         } catch (error) {
              console.error("Failed to save PDF progress:", error);
         }
     }
}



export async function handlePdfSnapshotForAI() {
      if (!pdfCanvas || !currentChapterNumber || !pdfPageNum) {
         alert("Cannot ask AI: PDF context (canvas, chapter, page number) missing.");
         return;
      }
     const userQuestion = prompt(`Ask a question about the current PDF page (Chapter ${currentChapterNumber}, Page ${pdfPageNum}):`);
     if (!userQuestion || userQuestion.trim() === "") return;

     showLoading("Generating AI explanation for PDF page...");
     const explanationArea = document.getElementById('ai-explanation-area');
     const explanationContent = document.getElementById('ai-explanation-content'); 
     if (!explanationArea || !explanationContent) {
         console.error("AI Explanation UI elements not found (#ai-explanation-area, #ai-explanation-content).");
         hideLoading();
         return;
     }
     currentPdfExplanationHistory = [];
     explanationContent.innerHTML = `<div class="flex items-center justify-center space-x-2 p-4"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-sm text-muted">Capturing page and generating explanation...</p></div>`;
     explanationArea.classList.remove('hidden'); 
     try {
          const imageDataUrl = pdfCanvas.toDataURL('image/jpeg', 0.85); 
          const base64ImageData = imageDataUrl.split(',')[1]; 
          if (!base64ImageData) throw new Error("Failed to capture image data from canvas.");
          const context = `User is asking about PDF page ${pdfPageNum} for Chapter ${currentChapterNumber}.`;
          console.log(`Sending snapshot of Ch ${currentChapterNumber} Pg ${pdfPageNum} to AI.`);
          const result = await getExplanationForPdfSnapshot(userQuestion, base64ImageData, context, []); 
          currentPdfExplanationHistory = result.history; 
          explanationContent.innerHTML = `<div class="ai-chat-turn">${result.explanationHtml}</div>`; 
          await renderMathIn(explanationContent); 
          explanationArea.querySelector('.pdf-follow-up-container')?.remove();
           const followUpInputHtml = `
               <div class="pdf-follow-up-container flex gap-2 mt-2 pt-2 border-t dark:border-gray-600 p-2 flex-shrink-0">
                   <input type="text" id="pdf-follow-up-input" class="flex-grow text-sm p-1 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Ask a follow-up...">
                   <button onclick="window.askPdfFollowUp()" class="btn-secondary-small text-xs flex-shrink-0">Ask</button>
               </div>`;
           explanationArea.insertAdjacentHTML('beforeend', followUpInputHtml); 
          hideLoading(); 
     } catch(error) {
          hideLoading();
          console.error("Error getting PDF snapshot explanation:", error);
          explanationContent.innerHTML = `<p class="text-danger text-sm p-3">Error generating explanation: ${error.message}</p>`;
     }
}

async function handleExplainSelectionInternal(selectedText, context, source, historyContainer) { 
    const explanationArea = document.getElementById('ai-explanation-area');
    const explanationContent = document.getElementById('ai-explanation-content'); 
    if (!explanationArea || !explanationContent) {
        console.error("AI Explanation UI elements not found.");
        return;
    }
    historyContainer.length = 0; 
    explanationContent.innerHTML = `<div class="flex items-center justify-center space-x-2 p-4"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-sm text-muted">Generating explanation...</p></div>`;
    explanationArea.classList.remove('hidden');
    try {
        console.log(`Requesting explanation for ${source}: "${selectedText.substring(0, 50)}..."`);
        const result = await explainStudyMaterialSnippet(selectedText, context, historyContainer);
        explanationContent.innerHTML = `<div class="ai-chat-turn">${result.explanationHtml}</div>`; 
        await renderMathIn(explanationContent); 
        explanationArea.querySelector('.text-follow-up-container')?.remove();
        const followUpInputHtml = `
            <div class="text-follow-up-container flex gap-2 mt-2 pt-2 border-t dark:border-gray-600 p-2 flex-shrink-0">
                 <input type="text" id="text-follow-up-input" class="flex-grow text-sm p-1 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Ask a follow-up...">
                 <button onclick="window.askTextFollowUp('${source}')" class="btn-secondary-small text-xs flex-shrink-0">Ask</button>
            </div>`;
        explanationArea.insertAdjacentHTML('beforeend', followUpInputHtml);
    } catch (error) {
        console.error("Error getting text explanation:", error);
        explanationContent.innerHTML = `<p class="text-danger text-sm p-3">Error generating explanation: ${error.message}</p>`;
    }
}

export function handleExplainSelection(sourceType) {
     if (sourceType !== 'transcription') {
        alert("Text selection explanation is currently only available for transcriptions.");
        return;
    }
    let selectedText = window.getSelection()?.toString().trim();
    if (!selectedText) {
        alert("Please select text from the transcription to explain.");
        return;
    }
    if (!currentTranscriptionData || currentTranscriptionData.length === 0 || !currentChapterNumber) {
        alert("Cannot explain: Transcription context missing.");
        return;
    }
    const context = `From Transcription for Chapter ${currentChapterNumber}.`;
    const fullTranscriptionText = currentTranscriptionData.map(e => e.text).join(' ');
    const fullContext = `Context: ${context}\n\nFull Transcription Text (for context):\n${fullTranscriptionText.substring(0, 5000)}${fullTranscriptionText.length > 5000 ? '...' : ''}`;
    handleExplainSelectionInternal(selectedText, fullContext, 'transcription', currentTranscriptionExplanationHistory);
}

export function askQuestionAboutTranscription() {
      if (!currentTranscriptionData || currentTranscriptionData.length === 0 || !currentChapterNumber) { alert("Cannot ask question: Transcription context missing."); return; }
     const userQuestion = prompt(`Ask a question about the transcription for Chapter ${currentChapterNumber}:`);
     if (!userQuestion || userQuestion.trim() === "") return; 
     const context = `About the Transcription for Chapter ${currentChapterNumber}.`;
     const fullTranscriptionText = currentTranscriptionData.map(e => e.text).join(' ');
     const fullContext = `Context: ${context}\n\nFull Transcription Text (for context):\n${fullTranscriptionText.substring(0, 8000)}${fullTranscriptionText.length > 8000 ? '...' : ''}`;
     handleExplainSelectionInternal(userQuestion, fullContext, 'transcription', currentTranscriptionExplanationHistory);
}

window.askTextFollowUp = async (source) => {
    const inputElement = document.getElementById('text-follow-up-input');
    const explanationArea = document.getElementById('ai-explanation-area');
    const explanationContent = explanationArea?.querySelector('#ai-explanation-content'); 
    let history = (source === 'transcription') ? currentTranscriptionExplanationHistory : []; 
    if (!inputElement || !explanationContent || !history) {
        console.error("askTextFollowUp: Missing input, content area, or history array.");
        return;
    }
    const followUpText = inputElement.value.trim();
    if (!followUpText) return; 
    inputElement.disabled = true;
    const askButton = inputElement.nextElementSibling; 
    if (askButton) askButton.disabled = true;
    explanationContent.insertAdjacentHTML('beforeend', `<div class="ai-chat-turn mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"><p class="text-sm font-medium text-gray-700 dark:text-gray-300">You:</p><div class="prose prose-sm dark:prose-invert max-w-none">${escapeHtml(followUpText)}</div></div>`);
    const loadingHtml = `<div class="ai-chat-turn ai-loading mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p><div class="flex items-center space-x-2 mt-1"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-xs text-muted">Thinking...</p></div></div>`;
    explanationContent.insertAdjacentHTML('beforeend', loadingHtml);
    explanationArea.scrollTop = explanationArea.scrollHeight; 
    try {
        console.log(`Sending text follow-up for ${source}: "${followUpText.substring(0, 50)}..."`);
        const result = await explainStudyMaterialSnippet(followUpText, null, history); 
        explanationContent.querySelector('.ai-loading')?.remove(); 
        explanationContent.insertAdjacentHTML('beforeend', `<div class="ai-chat-turn mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p>${result.explanationHtml}</div>`);
        inputElement.value = ''; 
        await renderMathIn(explanationContent); 
        explanationArea.scrollTop = explanationArea.scrollHeight; 
    } catch (error) {
        console.error("Error asking text follow-up:", error);
        explanationContent.querySelector('.ai-loading')?.remove();
        explanationContent.insertAdjacentHTML('beforeend', `<p class="text-danger text-sm mt-2 p-1">Error getting follow-up: ${error.message}</p>`);
    } finally {
        inputElement.disabled = false;
        if (askButton) askButton.disabled = false;
        inputElement.focus(); 
    }
};

window.askPdfFollowUp = async () => {
     const inputElement = document.getElementById('pdf-follow-up-input');
     const explanationArea = document.getElementById('ai-explanation-area');
     const explanationContent = explanationArea?.querySelector('#ai-explanation-content'); 
     let history = currentPdfExplanationHistory; 
     if (!inputElement || !explanationContent || !history) {
         console.error("askPdfFollowUp: Missing input, content area, or history array.");
         return;
     }
     const followUpText = inputElement.value.trim();
     if (!followUpText) return; 
     inputElement.disabled = true;
     const askButton = inputElement.nextElementSibling;
     if (askButton) askButton.disabled = true;
     explanationContent.insertAdjacentHTML('beforeend', `<div class="ai-chat-turn mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"><p class="text-sm font-medium text-gray-700 dark:text-gray-300">You:</p><div class="prose prose-sm dark:prose-invert max-w-none">${escapeHtml(followUpText)}</div></div>`);
     const loadingHtml = `<div class="ai-chat-turn ai-loading mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p><div class="flex items-center space-x-2 mt-1"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-xs text-muted">Thinking...</p></div></div>`;
     explanationContent.insertAdjacentHTML('beforeend', loadingHtml);
     explanationArea.scrollTop = explanationArea.scrollHeight; 
     try {
          console.log(`Sending PDF follow-up: "${followUpText.substring(0, 50)}..."`);
          const result = await getExplanationForPdfSnapshot(followUpText, null, `Follow-up on Chapter ${currentChapterNumber}, Page ${pdfPageNum}`, history);
          explanationContent.querySelector('.ai-loading')?.remove();
          explanationContent.insertAdjacentHTML('beforeend', `<div class="ai-chat-turn mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p>${result.explanationHtml}</div>`);
          inputElement.value = ''; 
          await renderMathIn(explanationContent); 
          explanationArea.scrollTop = explanationArea.scrollHeight; 
     } catch (error) {
          console.error("Error asking PDF follow-up:", error);
          explanationContent.querySelector('.ai-loading')?.remove();
          explanationContent.insertAdjacentHTML('beforeend', `<p class="text-danger text-sm mt-2 p-1">Error getting follow-up: ${error.message}</p>`);
     } finally {
          inputElement.disabled = false;
          if (askButton) askButton.disabled = false;
          inputElement.focus(); 
     }
};


export async function displayFormulaSheet(courseId, chapterNum, forceRegenerate = false) {
    if (!currentUser) {
        console.error("Cannot display formula sheet: User not logged in");
        alert("Please log in to view formula sheets.");
        return;
    }
    if (!courseId || !chapterNum) {
        console.error("Missing courseId or chapterNum for formula sheet");
        alert("Cannot display formula sheet: Course or chapter context missing.");
        return;
    }
    const formulaArea = document.getElementById('formula-sheet-area');
    const formulaContent = document.getElementById('formula-sheet-content');
    const downloadBtn = document.getElementById('download-formula-pdf-btn');
    const regenerateBtn = document.querySelector('#formula-sheet-area button[onclick*="true"]'); 
    if (!formulaArea || !formulaContent || !downloadBtn || !regenerateBtn) {
        console.error("Missing UI elements for formula sheet display. Cannot proceed.");
        const mainContentArea = document.getElementById('study-material-content-area') || document.getElementById('course-dashboard-area');
        if (mainContentArea) {
            mainContentArea.insertAdjacentHTML('beforeend', `<p class="text-red-500 p-4 text-center">Error: UI components for formula sheet are missing.</p>`);
        }
        return;
    }
    formulaArea.classList.remove('hidden');
    downloadBtn.classList.add('hidden'); 
    regenerateBtn.disabled = true; 
    formulaContent.innerHTML = `<div class="flex items-center justify-center p-4"><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div><p class="ml-3 text-sm text-muted">Loading Formula Sheet...</p></div>`;
    let cachedSheet = null;
    if (!forceRegenerate) {
        try {
            console.log(`Attempting to load cached formula sheet for user ${currentUser.uid}, course ${courseId}, chapter ${chapterNum}`);
            cachedSheet = await loadUserFormulaSheet(currentUser.uid, courseId, chapterNum);
        } catch (error) {
            console.error("Error loading cached user formula sheet:", error);
        }
    } else {
        console.log("Force regenerate flag set, skipping cache check for formula sheet.");
    }
    if (cachedSheet) {
        console.log("Using cached user formula sheet from Firestore.");
        formulaContent.innerHTML = cachedSheet;
        try {
            await renderMathIn(formulaContent); 
            downloadBtn.classList.remove('hidden'); 
        } catch (renderError) {
             console.error("Error rendering MathJax in cached formula sheet:", renderError);
             formulaContent.innerHTML += `<p class="text-red-500 text-xs mt-1">Error rendering math content.</p>`;
        }
        regenerateBtn.disabled = false; 
        return; 
    }
    console.log(`Generating new formula sheet for course ${courseId}, chapter ${chapterNum}`);
    try {
        const rawAiGeneratedSheetHtml = await generateFormulaSheet(courseId, chapterNum); // Get raw AI output

        // *** CRITICAL DEBUG LOG ***
        console.log("------------------------------------------------------------");
        console.log("RAW AI-Generated HTML for Formula Sheet (before styling wrapper):\n", rawAiGeneratedSheetHtml);
        console.log("------------------------------------------------------------");
        // *** END CRITICAL DEBUG LOG ***

        formulaContent.innerHTML = rawAiGeneratedSheetHtml; // Display raw AI output for now in the UI preview
        
        const generationFailed = rawAiGeneratedSheetHtml.includes('Error generating') ||
                                 rawAiGeneratedSheetHtml.includes('No text content available') ||
                                 rawAiGeneratedSheetHtml.includes('bigger than the model') ||
                                 rawAiGeneratedSheetHtml.includes('Loading Formula Sheet...');
        if (!generationFailed && rawAiGeneratedSheetHtml.trim() !== "") {
             try {
                await renderMathIn(formulaContent); 
                downloadBtn.classList.remove('hidden'); 
                await saveUserFormulaSheet(currentUser.uid, courseId, chapterNum, rawAiGeneratedSheetHtml); // Save the RAW AI HTML
                console.log("Successfully saved generated formula sheet to user document.");
            } catch (saveOrRenderError) {
                 if (saveOrRenderError.message && saveOrRenderError.message.includes('MathJax')) { // Check if error message exists
                     console.error("Error rendering MathJax in generated formula sheet:", saveOrRenderError);
                     formulaContent.innerHTML += `<p class="text-red-500 text-xs mt-1">Error rendering math content.</p>`;
                 } else {
                    console.error("Failed to save generated formula sheet:", saveOrRenderError);
                 }
                 downloadBtn.classList.add('hidden');
            }
        } else {
            console.warn("AI generation indicated an issue, or content is empty. Not caching or enabling download for formula sheet.");
            formulaContent.innerHTML = rawAiGeneratedSheetHtml || '<p class="text-yellow-500 p-2">Formula sheet generation resulted in empty content or an error.</p>'; 
            downloadBtn.classList.add('hidden'); 
        }
    } catch (error) {
        console.error("Error generating/displaying formula sheet:", error);
        formulaContent.innerHTML = `
            <div class="p-4 text-center">
                <p class="text-danger mb-2">Error generating formula sheet: ${error.message || 'Unknown error'}</p>
                <button onclick="window.displayFormulaSheetWrapper('${courseId}', ${chapterNum}, true)"
                        class="btn-secondary-small">
                    Retry Generation
                </button>
            </div>
        `;
        downloadBtn.classList.add('hidden'); 
    } finally {
        regenerateBtn.disabled = false; 
    }
}
// Ensure this wrapper is on window if displayFormulaSheet is not directly assigned to window later
window.displayFormulaSheetWrapper = (courseId, chapterNum, forceRegenerate = false) => {
    displayFormulaSheet(courseId, chapterNum, forceRegenerate);
};


export async function downloadFormulaSheetPdf() {
    const formulaContentElement = document.getElementById('formula-sheet-content');
    // Ensure currentChapterNumber and currentCourseIdInternal are correctly set module-level variables
    if (!formulaContentElement || currentChapterNumber === null || currentCourseIdInternal === null) {
         alert("Cannot download: Formula sheet content or course/chapter context missing.");
         console.error("downloadFormulaSheetPdf: Missing formulaContentElement, currentChapterNumber, or currentCourseIdInternal.", {
             hasContentElement: !!formulaContentElement,
             chapter: currentChapterNumber,
             course: currentCourseIdInternal
         });
         return;
     }

    const courseDef = globalCourseDataMap.get(currentCourseIdInternal);
    const courseName = courseDef?.name || 'Course';
    const filename = `Formula_Sheet_${courseName.replace(/[^a-zA-Z0-9]/g, '_')}_Ch${currentChapterNumber}`;

    showLoading(`Generating ${filename}.pdf...`);
    try {
        // Get the raw innerHTML which should be the AI-generated content displayed in the UI
        let rawAiGeneratedSheetHtml = formulaContentElement.innerHTML;
        
        // Critical Log: Log the HTML content that will be wrapped
        console.log("------------------------------------------------------------");
        console.log("HTML Content from formulaContentElement for PDF Generation (Formula Sheet):\n", rawAiGeneratedSheetHtml);
        console.log("------------------------------------------------------------");

        if (!rawAiGeneratedSheetHtml || rawAiGeneratedSheetHtml.trim() === "" ||
            rawAiGeneratedSheetHtml.includes('Error generating') ||
            rawAiGeneratedSheetHtml.includes('No text content available') ||
            rawAiGeneratedSheetHtml.includes('Loading Formula Sheet...')) {
            alert("Valid formula sheet content not available for PDF generation. Please ensure the sheet is loaded correctly and does not show an error message.");
            throw new Error("Valid formula sheet content not available for PDF generation.");
        }

        // Use the specific base HTML generator for formula sheets
        const finalHtmlForPdf = generateFormulaSheetPdfBaseHtml(
            `Formula Sheet - Chapter ${currentChapterNumber}`, // Title for the PDF document
            rawAiGeneratedSheetHtml                                 // The inner HTML (AI-generated formula sheet)
        );

        console.log("[downloadFormulaSheetPdf] Final HTML for PDF to be sent to server (first 500 chars):", finalHtmlForPdf.substring(0, 500));

        await generateAndDownloadPdfWithMathJax(finalHtmlForPdf, filename);

    } catch (error) {
        console.error("Error generating formula sheet PDF:", error);
        // Avoid alerting if the error was already an alert about content validity
        if (!error.message.includes("Valid formula sheet content not available")) {
            alert(`Failed to generate PDF for formula sheet: ${error.message}`);
        }
    } finally {
        hideLoading();
    }
}
// Assign to window if called from HTML, e.g. in script.js or if this file is type="module" and functions are not directly window-scoped
window.downloadFormulaSheetPdf = downloadFormulaSheetPdf;

export async function displayChapterSummary(courseId, chapterNum, forceRegenerate = false) {
    if (!currentUser) {
        console.error("Cannot display chapter summary: User not logged in");
         alert("Please log in to view chapter summaries.");
        return;
    }
    if (!courseId || !chapterNum) {
        console.error("Missing courseId or chapterNum for chapter summary");
         alert("Cannot display summary: Course or chapter context missing.");
        return;
    }
    const summaryArea = document.getElementById('chapter-summary-area');
    const summaryContent = document.getElementById('chapter-summary-content');
    const downloadBtn = document.getElementById('download-summary-pdf-btn');
    const regenerateBtn = document.querySelector('#chapter-summary-area button[onclick*="true"]');
    if (!summaryArea || !summaryContent || !downloadBtn || !regenerateBtn) {
        console.error("Missing UI elements for chapter summary display. Cannot proceed.");
        const mainContentArea = document.getElementById('study-material-content-area') || document.getElementById('course-dashboard-area');
        if (mainContentArea) {
            mainContentArea.insertAdjacentHTML('beforeend', `<p class="text-red-500 p-4 text-center">Error: UI components for chapter summary are missing.</p>`);
        }
        return;
    }
    summaryArea.classList.remove('hidden');
    downloadBtn.classList.add('hidden');
    regenerateBtn.disabled = true;
    summaryContent.innerHTML = `<div class="flex items-center justify-center p-4"><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div><p class="ml-3 text-sm text-muted">Loading Chapter Summary...</p></div>`;
    let cachedSummary = null;
    if (!forceRegenerate) {
        try {
            console.log(`Attempting to load cached chapter summary for user ${currentUser.uid}, course ${courseId}, chapter ${chapterNum}`);
            cachedSummary = await loadUserChapterSummary(currentUser.uid, courseId, chapterNum);
        } catch (error) {
            console.error("Error loading cached user chapter summary:", error);
        }
    } else {
        console.log("Force regenerate flag set, skipping cache check for chapter summary.");
    }
    if (cachedSummary) {
        console.log("Using cached user chapter summary from Firestore.");
        summaryContent.innerHTML = cachedSummary;
        try {
            await renderMathIn(summaryContent);
            downloadBtn.classList.remove('hidden');
        } catch (renderError) {
            console.error("Error rendering MathJax in cached summary:", renderError);
            summaryContent.innerHTML += `<p class="text-red-500 text-xs mt-1">Error rendering math content.</p>`;
        }
        regenerateBtn.disabled = false;
        return;
    }
    console.log(`Generating new chapter summary for course ${courseId}, chapter ${chapterNum}`);
    try {
        const summaryHtml = await generateChapterSummary(courseId, chapterNum);
        summaryContent.innerHTML = summaryHtml;
        const generationFailed = summaryHtml.includes('Error generating') ||
                                 summaryHtml.includes('No text content available') ||
                                 summaryHtml.includes('bigger than the model') ||
                                 summaryHtml.includes('Loading Chapter Summary...');
        if (!generationFailed && summaryHtml.trim() !== "") {
             try {
                 await renderMathIn(summaryContent);
                 downloadBtn.classList.remove('hidden');
                 await saveUserChapterSummary(currentUser.uid, courseId, chapterNum, summaryHtml);
                 console.log("Successfully saved generated chapter summary to user document.");
             } catch (saveOrRenderError) {
                  if (saveOrRenderError.message.includes('MathJax')) {
                      console.error("Error rendering MathJax in generated summary:", saveOrRenderError);
                      summaryContent.innerHTML += `<p class="text-red-500 text-xs mt-1">Error rendering math content.</p>`;
                  } else {
                     console.error("Failed to save generated chapter summary:", saveOrRenderError);
                  }
                 downloadBtn.classList.add('hidden');
             }
        } else {
            console.warn("AI generation indicated an issue, or content is empty. Not caching or enabling download for chapter summary.");
            summaryContent.innerHTML = summaryHtml || '<p class="text-yellow-500 p-2">Chapter summary generation resulted in empty content or an error.</p>';
            downloadBtn.classList.add('hidden');
        }
    } catch (error) {
        console.error("Error generating/displaying chapter summary:", error);
        summaryContent.innerHTML = `
            <div class="p-4 text-center">
                <p class="text-danger mb-2">Error generating summary: ${error.message || 'Unknown error'}</p>
                <button onclick="window.displayChapterSummaryWrapper('${courseId}', ${chapterNum}, true)"
                        class="btn-secondary-small">
                    Retry Generation
                </button>
            </div>
        `;
        downloadBtn.classList.add('hidden');
    } finally {
        regenerateBtn.disabled = false;
    }
}
window.displayChapterSummaryWrapper = (courseId, chapterNum, forceRegenerate = false) => {
    displayChapterSummary(courseId, chapterNum, forceRegenerate);
};


export async function downloadChapterSummaryPdf() {
    const summaryContentElement = document.getElementById('chapter-summary-content');
    if (!summaryContentElement || currentChapterNumber === null || currentCourseIdInternal === null) {
         alert("Cannot download: Summary content or course/chapter context missing.");
         return;
     }
    const courseDef = globalCourseDataMap.get(currentCourseIdInternal);
    const courseName = courseDef?.name || 'Course';
    const filename = `Chapter_Summary_${courseName.replace(/[^a-zA-Z0-9]/g, '_')}_Ch${currentChapterNumber}`;

    showLoading(`Generating ${filename}.pdf...`);
    try {
        let rawAiGeneratedSummaryHtml = summaryContentElement.innerHTML;
        
        console.log("------------------------------------------------------------");
        console.log("HTML Content from summaryContentElement for PDF Generation (Summary):\n", rawAiGeneratedSummaryHtml);
        console.log("------------------------------------------------------------");

        if (!rawAiGeneratedSummaryHtml || rawAiGeneratedSummaryHtml.trim() === "" ||
            rawAiGeneratedSummaryHtml.includes('Error generating') ||
            rawAiGeneratedSummaryHtml.includes('No text content available') ||
            rawAiGeneratedSummaryHtml.includes('Loading Chapter Summary...')) {
            alert("Valid summary content not available for PDF generation. Ensure it's loaded correctly.");
            throw new Error("Valid summary content not available for PDF generation.");
        }
        
        const finalHtmlForPdf = generateFormulaSheetPdfBaseHtml( // Using formula sheet base for summaries too
            `Chapter Summary - Chapter ${currentChapterNumber}`,
            rawAiGeneratedSummaryHtml
        );
        await generateAndDownloadPdfWithMathJax(finalHtmlForPdf, filename);
    } catch (error) {
        console.error("Error generating summary PDF:", error);
        if (!error.message.includes("Valid summary content not available")) {
            alert(`Failed to generate PDF for summary: ${error.message}`);
        }
    } finally {
        hideLoading();
    }
}
window.downloadChapterSummaryPdf = downloadChapterSummaryPdf;

export function navigateChapterMaterial(courseId, chapterNum) {
      const courseDef = globalCourseDataMap.get(courseId);
      if (!courseDef || chapterNum < 1 || chapterNum > courseDef.totalChapters) {
          console.warn(`Navigation blocked: Invalid chapter ${chapterNum} for course ${courseId}. Max chapters: ${courseDef?.totalChapters}`);
          return;
      }
      showCourseStudyMaterial(courseId, chapterNum);
}

async function switchVideo(newIndex) {
     if (!currentCourseIdInternal || !currentChapterNumber || !chapterLectureVideos) {
         console.warn("switchVideo called without valid context.");
         return;
     }
    if (newIndex >= 0 && newIndex < chapterLectureVideos.length) {
        const progress = userCourseProgressMap.get(currentCourseIdInternal);
        if (progress?.enrollmentMode !== 'viewer') {
            const currentPlayerElementId = `ytplayer-${currentChapterNumber}-${currentVideoIndex}`;
            const currentPlayerState = ytPlayers[currentPlayerElementId];
            if (currentPlayerState && currentPlayerState.player) {
                try {
                     await saveVideoWatchProgress(currentPlayerState.videoId);
                     console.log(`Saved progress for video ${currentPlayerState.videoId} before switching.`);
                } catch (saveError) {
                     console.error("Error saving video progress before switching:", saveError);
                }
            }
        }
        console.log(`Switching to video index ${newIndex} in Chapter ${currentChapterNumber}`);
        showCourseStudyMaterial(currentCourseIdInternal, currentChapterNumber, newIndex);
    } else {
         console.warn(`Attempted to switch to invalid video index: ${newIndex}`);
    }
}
window.switchVideo = switchVideo;

export async function fetchVideoDurationsIfNeeded(videoIds) {
     const idsToFetch = videoIds.filter(id => videoDurationMap[id] === undefined);
    if (idsToFetch.length === 0) {
        return;
    }
    console.log(`Fetching durations for ${idsToFetch.length} videos...`);
    const apiKey = YOUTUBE_API_KEY;
    if (!apiKey || apiKey === "REPLACE_WITH_YOUR_YOUTUBE_API_KEY" || apiKey.startsWith("AIzaSyB8v1IX")) {
        console.warn("YouTube API Key not configured or potentially invalid. Cannot fetch video durations.");
        idsToFetch.forEach(id => videoDurationMap[id] = null);
        return;
     }
    const MAX_IDS_PER_REQUEST = 50;
    try {
        for (let i = 0; i < idsToFetch.length; i += MAX_IDS_PER_REQUEST) {
            const chunkIds = idsToFetch.slice(i, i + MAX_IDS_PER_REQUEST);
            const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${chunkIds.join(',')}&key=${apiKey}`;
            const response = await fetch(apiUrl);
            if (!response.ok) {
                 const errorData = await response.json();
                 console.error("YouTube API Error fetching durations:", response.status, errorData);
                 throw new Error(`YouTube API Error: ${response.status} ${errorData?.error?.message || 'Failed'}`);
            }
            const data = await response.json();
            const fetchedDurationsInChunk = {};
            data.items?.forEach(item => {
                const durationStr = item.contentDetails?.duration;
                if (durationStr && item.id) {
                    const durationRegex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
                    const matches = durationStr.match(durationRegex);
                    if (matches) {
                        const hours = parseInt(matches[1] || '0');
                        const minutes = parseInt(matches[2] || '0');
                        const seconds = parseInt(matches[3] || '0');
                        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
                        videoDurationMap[item.id] = totalSeconds;
                        fetchedDurationsInChunk[item.id] = totalSeconds;
                    } else {
                         console.warn(`Could not parse duration string "${durationStr}" for video ${item.id}`);
                         videoDurationMap[item.id] = null;
                    }
                } else {
                     videoDurationMap[item.id] = null;
                }
            });
            console.log("Fetched durations for chunk:", fetchedDurationsInChunk);
        }
         idsToFetch.forEach(id => { if (videoDurationMap[id] === undefined) videoDurationMap[id] = null; });
    } catch (error) {
         console.error("Error fetching video durations:", error);
         idsToFetch.forEach(id => videoDurationMap[id] = null);
    }
}


export async function askAboutFullPdf() {
      if (!pdfDoc || !currentCourseIdInternal || !currentChapterNumber) {
         alert("PDF document or course context is not available to ask about.");
         return;
     }
     const userQuestion = prompt(`Ask a question about the entire Chapter ${currentChapterNumber} PDF document (this may take a moment to analyze):`);
     if (!userQuestion || userQuestion.trim() === "") return;
     const explanationArea = document.getElementById('ai-explanation-area');
     const explanationContent = document.getElementById('ai-explanation-content');
     if (!explanationArea || !explanationContent) {
         console.error("AI Explanation UI elements not found.");
         return;
     }
     currentPdfExplanationHistory = [];
     explanationContent.innerHTML = `<div class="flex items-center justify-center space-x-2 p-4"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-sm text-muted">Analyzing full PDF and generating explanation...</p></div>`;
     explanationArea.classList.remove('hidden');
     try {
          const courseDef = globalCourseDataMap.get(currentCourseIdInternal);
          if (!courseDef) throw new Error("Course definition not found.");
          const courseDirName = courseDef.courseDirName;
          if (!courseDirName) throw new Error("Course directory name missing in definition.");
          const chapterResources = courseDef.chapterResources?.[currentChapterNumber] || {};
          const pdfOverride = chapterResources.pdfPath;
          const pdfPath = pdfOverride
                ? pdfOverride
                : `${COURSE_BASE_PATH}/${courseDirName}/${DEFAULT_COURSE_PDF_FOLDER}/chapter${currentChapterNumber}.pdf`;
           if (!pdfPath || !pdfPath.toLowerCase().endsWith('.pdf')) {
                throw new Error("Could not determine a valid PDF path for AI analysis.");
           }
          console.log(`Asking AI about full PDF: ${pdfPath}`);
          const explanationResult = await askAboutPdfDocument(userQuestion, pdfPath, currentCourseIdInternal, currentChapterNumber);
          currentPdfExplanationHistory = explanationResult.history;
          explanationContent.innerHTML = `<div class="ai-chat-turn">${explanationResult.explanationHtml}</div>`;
          await renderMathIn(explanationContent);
          explanationArea.querySelector('.pdf-follow-up-container')?.remove();
           const followUpInputHtml = `
               <div class="pdf-follow-up-container flex gap-2 mt-2 pt-2 border-t dark:border-gray-600 p-2 flex-shrink-0">
                   <input type="text" id="pdf-follow-up-input" class="flex-grow text-sm p-1 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Ask a follow-up...">
                   <button onclick="window.askPdfFollowUp()" class="btn-secondary-small text-xs flex-shrink-0">Ask</button>
               </div>`;
           explanationArea.insertAdjacentHTML('beforeend', followUpInputHtml);
     } catch (error) {
          console.error("Error asking about PDF document:", error);
          explanationContent.innerHTML = `<p class="text-danger text-sm p-3">Error processing request: ${error.message}. PDF might be unscannable or too large.</p>`;
     }
}
window.askAboutFullPdf = askAboutFullPdf;

export async function showCourseStudyMaterial(courseId, chapterNum, initialVideoIndex = 0) {
     console.log(`Showing study material for Course: ${courseId}, Chapter: ${chapterNum}, Video Index: ${initialVideoIndex}`);
     cleanupPdfViewer();
     window.cleanupYouTubePlayers();

     currentCourseIdInternal = courseId;
     currentChapterNumber = chapterNum;
     currentVideoIndex = initialVideoIndex;
     setLastViewedChapterForNotes(chapterNum);

     setActiveSidebarLink('sidebar-study-material-link', 'sidebar-course-nav');
     displayContent(`<div id="study-material-content-area" class="animate-fade-in"><div class="text-center p-8"><div class="loader animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-4 text-sm text-muted">Loading Chapter ${chapterNum} materials...</p></div></div>`, 'course-dashboard-area');
     const contentArea = document.getElementById('study-material-content-area');

     const courseDef = globalCourseDataMap.get(courseId);
     if (!courseDef) {
         contentArea.innerHTML = '<p class="text-red-500 p-4">Error: Course definition not found.</p>';
         return;
     }
     const courseDirName = courseDef.courseDirName;
     if (!courseDirName) {
         console.error(`Course definition for ${courseId} is missing 'courseDirName'. Cannot determine resource paths.`);
         contentArea.innerHTML = '<p class="text-red-500 p-4">Error: Course configuration incomplete (missing directory name). Cannot load resources.</p>';
         return;
     }
     console.log(`[Study Material] Using courseDirName: ${courseDirName}`);

     const chapterTitle = courseDef.chapters?.[chapterNum - 1] || `Chapter ${chapterNum}`;

     const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
     chapterLectureVideos = (Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : [])
                             .filter(lec => typeof lec === 'object' && lec.url && lec.title);
     const totalVideos = chapterLectureVideos.length;

     const pdfOverride = chapterResources.pdfPath;
     const defaultPdfPath = `${COURSE_BASE_PATH}/${courseDirName}/${DEFAULT_COURSE_PDF_FOLDER}/chapter${chapterNum}.pdf`;
     const pdfPath = pdfOverride ? pdfOverride : defaultPdfPath;
     console.log(`[Study Material Path Debug] Chapter ${chapterNum}: PDF path determined as: "${pdfPath}". Override value: "${pdfOverride}"`);
     const isPdfPathValid = pdfPath && pdfPath.toLowerCase().endsWith('.pdf');
     if (!isPdfPathValid) {
          console.warn(`[Study Material] Invalid PDF path determined: "${pdfPath}". PDF viewer will show an error or 'not available'.`);
     }

     const currentVideo = chapterLectureVideos[initialVideoIndex];
     const videoId = currentVideo ? getYouTubeVideoId(currentVideo.url) : null;
     currentTranscriptionData = [];

     let srtFilename = null;
     if (currentVideo) {
         if (chapterResources.lectureUrls?.[initialVideoIndex]?.srtFilename) {
             srtFilename = chapterResources.lectureUrls[initialVideoIndex].srtFilename.trim();
              console.log(`[SRT Filename] Using chapterResources override srtFilename: "${srtFilename}"`);
         } else {
             srtFilename = getSrtFilenameFromTitle(currentVideo.title);
         }
     }
     const transcriptionBasePath = `${COURSE_BASE_PATH}/${courseDirName}/${DEFAULT_COURSE_TRANSCRIPTION_FOLDER}/`;
     const srtPath = srtFilename ? `${transcriptionBasePath}${srtFilename}` : null;
     console.log('[SRT Load] Determined final SRT Path to fetch:', srtPath);

     const progress = userCourseProgressMap.get(courseId);
     const isViewer = progress?.enrollmentMode === 'viewer';

     if (srtPath) {
        try {
             currentTranscriptionData = await fetchAndParseSrt(srtPath);
             if(currentTranscriptionData.length === 0 && srtFilename) {
                 console.warn(`Transcription data for ${srtPath} was empty or failed to load. Check path, permissions, and file content.`);
             } else if (currentTranscriptionData.length > 0) {
                 console.log(`Successfully loaded ${currentTranscriptionData.length} transcription entries.`);
             }
        } catch (fetchError) {
             console.error(`Error fetching or parsing SRT file ${srtPath}:`, fetchError);
        }
     } else if (currentVideo) {
         console.log(`Could not determine SRT path for video: "${currentVideo.title}". Transcription will not be available.`);
     }
     const videoIdsForChapter = chapterLectureVideos.map(lec => getYouTubeVideoId(lec.url)).filter(id => id !== null);
     await fetchVideoDurationsIfNeeded(videoIdsForChapter);

     let videoNavHtml = '';
     if (totalVideos > 1) {
          videoNavHtml = `<div class="flex justify-between items-center mt-2 mb-1 text-sm">`;
          videoNavHtml += (initialVideoIndex > 0)
              ? `<button onclick="window.switchVideo(${initialVideoIndex - 1})" class="btn-secondary-small text-xs flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" /></svg> Prev</button>`
              : `<span class="w-16"></span>`;
          videoNavHtml += `<span class="text-muted font-medium">${initialVideoIndex + 1} / ${totalVideos}</span>`;
          videoNavHtml += (initialVideoIndex < totalVideos - 1)
              ? `<button onclick="window.switchVideo(${initialVideoIndex + 1})" class="btn-secondary-small text-xs flex items-center gap-1">Next <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 1 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" /></svg></button>`
              : `<span class="w-16"></span>`;
          videoNavHtml += `</div>`;
     }
     const videoContainerId = `ytplayer-${chapterNum}-${initialVideoIndex}`;
     const videoHtml = currentVideo ? `
        <div class="mb-4">
             <h4 class="text-md font-semibold mb-1 text-gray-800 dark:text-gray-300">${initialVideoIndex+1}. ${escapeHtml(currentVideo.title)}</h4>
            ${videoNavHtml}
             <div id="${videoContainerId}" class="aspect-video bg-black rounded-lg overflow-hidden shadow-inner">
                 <div class="flex items-center justify-center h-full"><p class="text-gray-400 italic text-sm">Loading video...</p></div>
             </div>
        </div>` : '<p class="text-muted text-center p-4 bg-gray-100 dark:bg-gray-700 rounded">No primary video available for this chapter part.</p>';

     const transcriptionHtml = currentVideo ? `
        <div class="mt-4 border-t pt-3 dark:border-gray-700">
             <h4 class="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Transcription</h4>
             <div id="transcription-content" class="text-xs leading-relaxed max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 p-2 rounded border dark:border-gray-600 scroll-smooth transition-all duration-300 ease-in-out">
                 ${!srtPath ? '<p class="text-sm text-muted italic p-1">No transcription file determined for this video.</p>' : (currentTranscriptionData.length === 0 ? '<p class="text-sm text-muted italic p-1">Loading transcription or none available...</p>' : '')}
             </div>
             ${srtPath ? `<button id="transcription-toggle-btn" onclick="window.toggleTranscriptionView()" class="btn-secondary-small text-xs mt-1">Expand Transcription</button>` : ''}
         </div>` : '';

     let pdfHtml = '';
     let pdfInitializationNeeded = false;
     if (isPdfPathValid) {
         pdfHtml = `
            <div class="mb-4 border-t pt-4 dark:border-gray-700">
                <h4 class="text-md font-semibold mb-2 text-gray-800 dark:text-gray-300">Chapter PDF</h4>
                <div id="pdf-controls" class="mb-2 hidden items-center gap-3 justify-center">
                     <button id="pdf-prev" class="btn-secondary-small text-xs">Prev</button>
                     <span class="text-xs">Page <span id="pdf-page-num">1</span> / <span id="pdf-page-count">?</span></span>
                     <button id="pdf-next" class="btn-secondary-small text-xs">Next</button>
                     <button id="pdf-explain-button" onclick="window.handlePdfSnapshotForAI()" class="btn-secondary-small text-xs ml-auto" disabled title="Ask AI about the current page view">Ask AI (Page)</button>
                     <button onclick="window.askAboutFullPdf()" class="btn-secondary-small text-xs" disabled title="Ask AI about the entire PDF document">Ask AI (Doc)</button>
                </div>
                <div id="pdf-viewer-container" class="h-[70vh] relative overflow-auto border dark:border-gray-600 rounded bg-gray-200 dark:bg-gray-700">
                    <p class="text-center p-4 text-muted">Loading PDF...</p>
                </div>
            </div>`;
         pdfInitializationNeeded = true;
     } else {
         pdfHtml = `<div class="mb-4 border-t pt-4 dark:border-gray-700"><h4 class="text-md font-semibold mb-2 text-gray-800 dark:text-gray-300">Chapter PDF</h4><p class="text-muted text-center p-4 bg-gray-100 dark:bg-gray-700 rounded">${pdfPath ? `Error: Invalid path configured: <code>${escapeHtml(pdfPath)}</code>` : 'No PDF available for this chapter.'}</p></div>`;
         pdfInitializationNeeded = false;
     }

     const aiExplanationHtml = `
        <div id="ai-explanation-area" class="fixed bottom-4 right-4 w-80 max-w-[90vw] max-h-[60vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-600 hidden flex flex-col z-50 animate-fade-in">
             <div class="flex justify-between items-center p-2 border-b dark:border-gray-600 flex-shrink-0 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
                 <h5 class="text-sm font-semibold text-purple-700 dark:text-purple-300">AI Tutor</h5>
                 <button onclick="this.closest('#ai-explanation-area').classList.add('hidden'); this.closest('#ai-explanation-area').querySelector('#ai-explanation-content').innerHTML='';" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600" title="Close AI Tutor">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4"><path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" /></svg>
                 </button>
             </div>
             <div id="ai-explanation-content" class="p-3 overflow-y-auto text-sm flex-grow">
             </div>
         </div>`;

     const skipExamThreshold = courseDef.skipExamPassingPercent || SKIP_EXAM_PASSING_PERCENT;
     const skipExamButtonHtml = !isViewer ? `<button id="skip-exam-btn" onclick="window.triggerSkipExamGenerationWrapper('${courseId}', ${chapterNum})" class="btn-warning-small text-xs" title="Attempt to skip this chapter (Requires ${skipExamThreshold}%)">Take Skip Exam</button>` : '';

     contentArea.innerHTML = `
        <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
             <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200" title="Chapter ${chapterNum}: ${escapeHtml(chapterTitle)}">Chapter ${chapterNum}: ${escapeHtml(chapterTitle)}</h2>
             <div class="flex gap-2 items-center">
                ${skipExamButtonHtml}
                 <button onclick="window.showCurrentCourseDashboardWrapper('${courseId}')" class="btn-secondary-small text-xs">Back to Menu</button>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div class="space-y-4"> ${videoHtml} ${transcriptionHtml} </div>
             <div class="space-y-4"> ${pdfHtml}
                  <div class="border-t pt-4 dark:border-gray-700">
                      <h4 class="text-md font-medium mb-2 text-gray-800 dark:text-gray-300">Chapter Tools</h4>
                      <div class="flex flex-wrap gap-2">
                           <button onclick="window.handleExplainSelection('transcription')" class="btn-secondary-small text-xs" title="Explain selected text from transcription">Explain Selection</button>
                           <button onclick="window.askQuestionAboutTranscription()" class="btn-secondary-small text-xs" title="Ask AI about the video transcription">Ask AI (Transcript)</button>
                           <button onclick="window.displayFormulaSheetWrapper('${courseId}', ${chapterNum})" class="btn-secondary-small text-xs" title="View Formula Sheet (AI Generated)">Formulas</button>
                           <button onclick="window.displayChapterSummaryWrapper('${courseId}', ${chapterNum})" class="btn-secondary-small text-xs" title="View Chapter Summary (AI Generated)">Summary</button>
                      </div>
                  </div>
                  <div id="formula-sheet-area" class="border-t pt-4 dark:border-gray-700 hidden">
                       <div class="flex justify-between items-center mb-2 flex-wrap gap-1">
                           <h4 class="text-md font-medium text-gray-800 dark:text-gray-300">Formula Sheet</h4>
                           <div class="flex gap-2">
                               <button onclick="window.displayFormulaSheetWrapper('${courseId}', ${chapterNum}, true)" class="btn-secondary-small text-xs" title="Regenerate Formula Sheet">Regen</button>
                               <button id="download-formula-pdf-btn" onclick="window.downloadFormulaSheetPdf()" class="btn-primary-small text-xs hidden" title="Download Formula Sheet as PDF">PDF</button>
                           </div>
                       </div>
                       <div id="formula-sheet-content" class="text-sm prose prose-sm dark:prose-invert max-w-none p-3 bg-gray-50 dark:bg-gray-700/50 rounded border dark:border-gray-600 max-h-96 overflow-y-auto">Loading...</div>
                  </div>
                  <div id="chapter-summary-area" class="border-t pt-4 dark:border-gray-700 hidden">
                       <div class="flex justify-between items-center mb-2 flex-wrap gap-1">
                            <h4 class="text-md font-medium text-gray-800 dark:text-gray-300">Chapter Summary</h4>
                            <div class="flex gap-2">
                                <button onclick="window.displayChapterSummaryWrapper('${courseId}', ${chapterNum}, true)" class="btn-secondary-small text-xs" title="Regenerate Chapter Summary">Regen</button>
                                <button id="download-summary-pdf-btn" onclick="window.downloadChapterSummaryPdf()" class="btn-primary-small text-xs hidden" title="Download Summary as PDF">PDF</button>
                            </div>
                       </div>
                       <div id="chapter-summary-content" class="text-sm prose prose-sm dark:prose-invert max-w-none p-3 bg-gray-50 dark:bg-gray-700/50 rounded border dark:border-gray-600 max-h-96 overflow-y-auto">Loading...</div>
                  </div>
            </div>
        </div>
        ${aiExplanationHtml}
     `;

     if (videoId) {
         createYTPlayer(videoContainerId, videoId);
     }
     if (currentVideo) {
         renderTranscriptionLines();
         highlightTranscriptionLine();
     }

     if (pdfInitializationNeeded) {
         await initPdfViewer(pdfPath);
     } else {
         hideLoading();
     }
     checkAndMarkChapterStudied(courseId, chapterNum);
}
window.showCourseStudyMaterialWrapper = (courseId, chapterNum, initialVideoIndex = 0) => showCourseStudyMaterial(courseId, chapterNum, initialVideoIndex);
window.handlePdfSnapshotForAI = handlePdfSnapshotForAI;
window.handleExplainSelection = handleExplainSelection;
window.askQuestionAboutTranscription = askQuestionAboutTranscription;
window.showCurrentCourseDashboardWrapper = (courseId) => showCurrentCourseDashboard(courseId);


export async function triggerSkipExamGeneration(courseId, chapterNum) {
    if (!currentUser || !data) { // data here refers to the user's TestGen subject progress cache
        alert("Log in and ensure subject data is loaded before attempting a skip exam.");
        return;
    }
    const courseDef = globalCourseDataMap.get(courseId);
    if (!courseDef) {
        alert("Course definition not found. Cannot generate skip exam.");
        return;
    }
    
    // Get the configuration for skip_exam, falling back to global defaults if not found
    const currentGlobalExamDefaults = courseExamDefaults || FALLBACK_EXAM_CONFIG;
    const skipExamConfig = currentGlobalExamDefaults.skip_exam || FALLBACK_EXAM_CONFIG.skip_exam;
    const skipExamMcqCount = skipExamConfig.questions;
    const skipExamDurationMinutes = skipExamConfig.durationMinutes;

    const chapterTitle = courseDef.chapters?.[chapterNum - 1] || `Chapter ${chapterNum}`;

    if (!confirm(`Generate and start a Skip Exam for ${escapeHtml(chapterTitle)}?\n\nThis exam will consist of ${skipExamMcqCount} multiple-choice questions. Passing this exam will mark the chapter as studied.`)) {
        return;
    }

    showLoading(`Preparing Skip Exam for ${escapeHtml(chapterTitle)}...`);

    try {
        const relatedSubjectId = courseDef.relatedSubjectId;
        if (!relatedSubjectId) {
            throw new Error("Course definition is missing the 'relatedSubjectId' needed to find the question bank.");
        }

        // *** IMPORTANT CHANGE: Use the imported globalSubjectDefinitionsMap directly ***
        const subjectDef = globalSubjectDefinitionsMap.get(relatedSubjectId); 
        if (!subjectDef) {
            // Add a more detailed log if the map itself is empty or the ID isn't there
            console.error(`[Skip Exam] TestGen subject definition not found for ID: ${relatedSubjectId} (linked from course ${courseDef.name}).`);
            console.error(`[Skip Exam] Current globalSubjectDefinitionsMap size: ${globalSubjectDefinitionsMap.size}`);
            if (globalSubjectDefinitionsMap.size > 0) {
                console.log("[Skip Exam] Available subject IDs in map:", Array.from(globalSubjectDefinitionsMap.keys()));
            }
            throw new Error(`TestGen subject definition not found for ID: ${relatedSubjectId} (linked from course ${courseDef.name}). Ensure this subject exists in the global definitions and has loaded.`);
        }

        const mcqFileNameFromSubject = subjectDef.mcqFileName;
        if (!mcqFileNameFromSubject) {
            throw new Error(`MCQ filename not found for the related TestGen subject: ${subjectDef.name}. Please configure it.`);
        }
        const courseDirForMd = subjectDef.courseDirName
            ? cleanTextForFilename(subjectDef.courseDirName)
            : cleanTextForFilename(subjectDef.name || `subject_${subjectDef.id}`);

        if (!courseDirForMd) {
            throw new Error(`Could not determine resource directory for subject ${subjectDef.name}.`);
        }

        const safeMcqFileName = cleanTextForFilename(mcqFileNameFromSubject);
        const fullMdPath = `${COURSE_BASE_PATH}/${courseDirForMd}/${SUBJECT_RESOURCE_FOLDER}/${safeMcqFileName}`;

        console.log(`[Skip Exam] Fetching MD content for Chapter ${chapterNum} from: ${fullMdPath} (Subject: ${subjectDef.name})`);

        let mdContent;
        try {
            const response = await fetch(`${fullMdPath}?cacheBust=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status} fetching MCQ file: ${fullMdPath}`);
            }
            mdContent = await response.text();
            if (!mdContent) {
                throw new Error(`MCQ file "${fullMdPath}" is empty or could not be read.`);
            }
            console.log(`[Skip Exam] Fetched MD content from: ${fullMdPath}`);
        } catch (fetchError) {
            console.error("[Skip Exam] Error fetching subject Markdown for Skip Exam:", fetchError);
            throw new Error(`Could not load MCQ definitions file: ${fullMdPath}. ${fetchError.message}`);
        }

        const chapterScopeMap = { [String(chapterNum)]: null };
        const extractedForChapter = extractQuestionsFromMarkdown(mdContent, chapterScopeMap, `skip_exam_ch${chapterNum}_mcq`);

        if (!extractedForChapter || !extractedForChapter.questions || extractedForChapter.questions.length === 0) {
            throw new Error(`No MCQs found for Chapter ${chapterNum} in the file "${safeMcqFileName}". Cannot generate skip exam.`);
        }

        console.log(`[Skip Exam] Found ${extractedForChapter.questions.length} MCQs in Chapter ${chapterNum} of "${safeMcqFileName}".`);

        if (extractedForChapter.questions.length < skipExamMcqCount) {
            console.warn(`[Skip Exam] Chapter ${chapterNum} has only ${extractedForChapter.questions.length} MCQs, less than the configured ${skipExamMcqCount}. Using all available MCQs.`);
        }

        const shuffledChapterMcqs = [...extractedForChapter.questions].sort(() => 0.5 - Math.random());
        const selectedMcqsForExam = shuffledChapterMcqs.slice(0, Math.min(skipExamMcqCount, extractedForChapter.questions.length));

        if (selectedMcqsForExam.length === 0) {
            throw new Error(`Failed to select any MCQs for the Skip Exam for Chapter ${chapterNum}.`);
        }
        console.log(`[Skip Exam] Selected ${selectedMcqsForExam.length} MCQs for the exam.`);

        const selectedMcqAnswers = {};
        selectedMcqsForExam.forEach(q => {
            if (extractedForChapter.answers[q.id]) {
                selectedMcqAnswers[q.id] = extractedForChapter.answers[q.id];
            } else {
                console.warn(`[Skip Exam] Answer not found for selected MCQ ID: ${q.id}`);
            }
        });

        const examId = `${courseId}-skip-ch${chapterNum}-${Date.now().toString().slice(-6)}`;

        const onlineTestState = {
            examId: examId,
            questions: selectedMcqsForExam,
            correctAnswers: selectedMcqAnswers,
            userAnswers: {},
            allocation: null,
            startTime: Date.now(),
            timerInterval: null,
            currentQuestionIndex: 0,
            status: 'active',
            durationMinutes: skipExamDurationMinutes,
            subjectId: relatedSubjectId,
            courseContext: {
                isCourseActivity: true,
                courseId: courseId,
                activityType: 'skip_exam',
                activityId: `chapter${chapterNum}`,
                chapterNum: chapterNum,
                isSkipExam: true
            }
        };

        setCurrentOnlineTestState(onlineTestState);
        hideLoading();
        launchOnlineTestUI();

    } catch (error) {
        hideLoading();
        console.error(`Error preparing Skip Exam for Chapter ${chapterNum} of course ${courseId}:`, error);
        alert(`Could not start Skip Exam: ${error.message}`);
    }
}
window.triggerSkipExamGenerationWrapper = (courseId, chapterNum) => triggerSkipExamGeneration(courseId, chapterNum); // Ensure it's on window if called from HTML

// --- END OF FILE ui_course_study_material.js ---