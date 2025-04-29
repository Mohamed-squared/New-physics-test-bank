// --- START OF FILE ui_course_study_material.js ---

// ui_course_study_material.js

import { currentUser, globalCourseDataMap, activeCourseId, setActiveCourseId, userCourseProgressMap, updateUserCourseProgress } from './state.js';
import { saveUserCourseProgress, markChapterStudiedInCourse } from './firebase_firestore.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml, renderMathIn } from './utils.js';
// *** Corrected base path import + added new config value ***
import { COURSE_TRANSCRIPTION_BASE_PATH, PDF_WORKER_SRC, SKIP_EXAM_PASSING_PERCENT, PDF_PAGE_EQUIVALENT_SECONDS, COURSE_PDF_BASE_PATH, YOUTUBE_API_KEY } from './config.js'; // Added YT Key
import { generateFormulaSheet, explainStudyMaterialSnippet, generateSkipExam, getExplanationForPdfSnapshot, getAllPdfTextForAI } from './ai_integration.js';
import { parseSkipExamText } from './markdown_parser.js';
import { launchOnlineTestUI, setCurrentOnlineTestState } from './ui_online_test.js';
import { generateAndDownloadPdfWithMathJax } from './ui_pdf_generation.js';
import { showCurrentCourseDashboard } from './ui_course_dashboard.js';

// --- Module State ---
let currentTranscriptionData = [];
let currentPdfTextContent = null; // Holds text extracted for AI (not full content)
let currentChapterNumber = null;
let currentCourseIdInternal = null;
let transcriptionHighlightInterval = null;
let isTranscriptionExpanded = false;
export let videoDurationMap = {}; // Cache for video durations - EXPORTED

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
// --- End Module State ---

// --- Helper Functions ---

// Function to get the expected SRT filename from a video title (preserves spaces)
function getSrtFilenameFromTitle(title) {
     if (!title) return null;
     const cleanedTitle = title.replace(/[<>:"\/\\|?*]+/g, '').trim();
     return `${cleanedTitle}.srt`;
}

// Function to fetch and parse SRT file with timestamps
async function fetchAndParseSrt(filePath) {
    try {
        const encodedFilePath = encodeURI(filePath);
        console.log(`Fetching SRT from potentially encoded path: ${encodedFilePath}`);

        const response = await fetch(`${encodedFilePath}?t=${new Date().getTime()}`); // Cache bust
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`fetchAndParseSrt: SRT File not found at ${filePath}. (Encoded: ${encodedFilePath}). Returning empty array.`);
                return [];
            }
            throw new Error(`HTTP error fetching SRT file! status: ${response.status} for ${filePath}`);
        }
        const srtContent = await response.text();
        const lines = srtContent.split(/\r?\n/);
        const entries = [];
        let currentEntry = null;

        const timeToSeconds = (timeStr) => {
            const parts = timeStr.split(/[:,]/);
            if (parts.length === 4) {
                const h = parseInt(parts[0], 10); const m = parseInt(parts[1], 10);
                const s = parseInt(parts[2], 10); const ms = parseInt(parts[3], 10);
                if (!isNaN(h) && !isNaN(m) && !isNaN(s) && !isNaN(ms)) {
                    return h * 3600 + m * 60 + s + ms / 1000;
                }
            }
            console.warn("Could not parse time string:", timeStr);
            return 0;
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (/^\d+$/.test(line) && !line.includes('-->')) {
                if (currentEntry) { entries.push(currentEntry); }
                currentEntry = { id: line, start: 0, end: 0, text: [] };
            } else if (line.includes('-->')) {
                const times = line.split('-->');
                if (times.length === 2 && currentEntry) {
                    currentEntry.start = timeToSeconds(times[0].trim());
                    currentEntry.end = timeToSeconds(times[1].trim());
                }
            } else if (line && currentEntry) {
                currentEntry.text.push(line);
            } else if (!line && currentEntry) {
                 if (currentEntry.text.length > 0) {
                     currentEntry.text = currentEntry.text.join(' ');
                     entries.push(currentEntry);
                 }
                 currentEntry = null;
            }
        }
         if (currentEntry && currentEntry.text.length > 0) {
              currentEntry.text = currentEntry.text.join(' ');
              entries.push(currentEntry);
         }

        console.log(`fetchAndParseSrt: Parsed ${entries.length} entries from ${filePath}`);
        return entries;
    } catch (error) {
        console.error(`Error fetching/parsing SRT file (${filePath}):`, error);
        return [];
    }
}


// Function to parse YouTube URL
export function getYouTubeVideoId(url) { // Export if needed by other modules
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
            return urlObj.searchParams.get('v');
        }
        else if (urlObj.hostname.includes('youtu.be')) {
            const pathParts = urlObj.pathname.split('/');
            if (pathParts.length >= 2 && pathParts[1]) {
                 return pathParts[1].split('?')[0];
            }
        }
         else if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/embed/')) {
             const pathParts = urlObj.pathname.split('/');
             if (pathParts.length >= 3 && pathParts[2]) {
                  return pathParts[2].split('?')[0];
             }
         }
    } catch (e) { console.error("Invalid URL format:", url, e); }
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
         container.innerHTML = ''; // Clear placeholder
         ytPlayers[elementId] = { player: null, videoId: videoId, intervalId: null, totalDuration: null };

        const player = new YT.Player(elementId, {
            height: '360',
            width: '100%',
            videoId: videoId,
            playerVars: { 'playsinline': 1 },
            events: {
                'onReady': (event) => onPlayerReady(event, elementId),
                'onStateChange': (event) => onPlayerStateChange(event, videoId, elementId),
                'onError': (event) => onPlayerError(event, videoId, elementId)
            }
        });
        ytPlayers[elementId].player = player;
    } catch (error) {
        console.error(`Failed to create YouTube player for ${elementId}:`, error);
        container.innerHTML = `<p class="text-red-500 text-sm p-4">Error loading video player. Check console and try disabling extensions.</p>`;
        if (ytPlayers[elementId]) {
             delete ytPlayers[elementId];
        }
    }
}

function onPlayerReady(event, elementId) {
    const playerState = ytPlayers[elementId];
    if (!playerState) return;
    console.log(`Player ready: ${playerState.videoId} (Element: ${elementId})`);
    try {
        const duration = event.target.getDuration();
        playerState.totalDuration = duration;
        videoDurationMap[playerState.videoId] = duration; // Cache duration globally

        // Initialize progress tracking
        const progress = userCourseProgressMap.get(currentCourseIdInternal);
        if (progress) {
             progress.watchedVideoDurations = progress.watchedVideoDurations || {};
             progress.watchedVideoDurations[currentChapterNumber] = progress.watchedVideoDurations[currentChapterNumber] || {};
             if (progress.watchedVideoDurations[currentChapterNumber][playerState.videoId] === undefined) {
                  progress.watchedVideoDurations[currentChapterNumber][playerState.videoId] = 0;
             }
             videoWatchStatus[playerState.videoId] = {
                 watchedDuration: progress.watchedVideoDurations[currentChapterNumber][playerState.videoId],
                 isComplete: false,
                 lastTrackedTime: null // Initialize last tracked time
             };
        }
        console.log(`Video ${playerState.videoId} Duration: ${playerState.totalDuration}s`);
    } catch (e) {
         console.error("Error getting duration in onPlayerReady:", e);
         playerState.totalDuration = null; // Mark duration as unknown
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
          if (ytPlayers[elementId].intervalId) clearInterval(ytPlayers[elementId].intervalId);
          delete ytPlayers[elementId];
     }
}

function onPlayerStateChange(event, videoId, elementId) {
    const playerState = ytPlayers[elementId];
    if (!playerState) return;

    if (event.data === YT.PlayerState.PLAYING) {
        console.log(`Video playing: ${videoId}`);
        if (playerState.intervalId === null) {
            if(playerState.intervalId) clearInterval(playerState.intervalId);
            playerState.intervalId = setInterval(() => {
                trackWatchTime(videoId, elementId);
                highlightTranscriptionLine();
            }, 1000);
        }
    } else {
        if (playerState.intervalId !== null) {
            clearInterval(playerState.intervalId);
            playerState.intervalId = null;
            console.log(`Watch time tracking stopped for ${videoId}`);
            saveVideoWatchProgress(videoId); // Save progress when paused/stopped
        }
        if (event.data == YT.PlayerState.ENDED) {
            console.log(`Video ended: ${videoId}`);
            // Check if watched enough, update status
            if (videoWatchStatus[videoId] && playerState.totalDuration) {
                 const progressPercent = (videoWatchStatus[videoId].watchedDuration / playerState.totalDuration);
                 if (progressPercent >= VIDEO_WATCH_THRESHOLD_PERCENT) {
                      videoWatchStatus[videoId].isComplete = true;
                      console.log(`Video ${videoId} marked as complete internally (>= ${VIDEO_WATCH_THRESHOLD_PERCENT*100}% watched).`);
                 } else {
                      console.log(`Video ${videoId} ended but watch threshold (${VIDEO_WATCH_THRESHOLD_PERCENT*100}%) not met (${(progressPercent*100).toFixed(1)}%).`);
                 }
            }
            // Save final progress and check chapter completion
            saveVideoWatchProgress(videoId).then(() => {
                checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber);
            });
        }
    }
}

async function trackWatchTime(videoId, elementId) { // Make async
    const playerState = ytPlayers[elementId];
    if (!playerState || !playerState.player || typeof playerState.player.getCurrentTime !== 'function') return;

    try {
         const currentTime = playerState.player.getCurrentTime();
         if (videoWatchStatus[videoId]) {
              // Increment only if time actually moved forward significantly
              if (!videoWatchStatus[videoId].lastTrackedTime || currentTime > videoWatchStatus[videoId].lastTrackedTime + 0.5) {
                   videoWatchStatus[videoId].watchedDuration = (videoWatchStatus[videoId].watchedDuration || 0) + 1;
                   videoWatchStatus[videoId].lastTrackedTime = currentTime;

                   // Save progress periodically (e.g., every 30 seconds) AND check completion
                   if (Math.round(videoWatchStatus[videoId].watchedDuration) % 30 === 0) {
                        await saveVideoWatchProgress(videoId); // Await save
                        await checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber); // Await check
                   }
              }
         }
    } catch (e) {
         console.warn("Error getting current time in trackWatchTime:", e);
         if (playerState.intervalId) clearInterval(playerState.intervalId); // Stop timer on error
         playerState.intervalId = null;
    }
}

// Returns Promise
async function saveVideoWatchProgress(videoId) {
     if (!currentUser || !currentCourseIdInternal || !currentChapterNumber || !videoWatchStatus[videoId]) {
          console.warn(`Cannot save video progress for ${videoId}: Missing context or status.`);
          return Promise.resolve(); // Return resolved promise
     }
     const progress = userCourseProgressMap.get(currentCourseIdInternal);
     if (!progress) return Promise.resolve();

     progress.watchedVideoDurations = progress.watchedVideoDurations || {};
     progress.watchedVideoDurations[currentChapterNumber] = progress.watchedVideoDurations[currentChapterNumber] || {};

     const newDuration = Math.round(videoWatchStatus[videoId].watchedDuration);
     // Clamp duration to video length if known
     const totalDuration = videoDurationMap[videoId]; // Use cached duration
     const clampedDuration = (typeof totalDuration === 'number') ? Math.min(newDuration, totalDuration) : newDuration;

     if (progress.watchedVideoDurations[currentChapterNumber][videoId] !== clampedDuration) {
          progress.watchedVideoDurations[currentChapterNumber][videoId] = clampedDuration;
          console.log(`Saving watched duration for ${videoId}: ${clampedDuration}s`);
          updateUserCourseProgress(currentCourseIdInternal, progress); // Update local state
          // Return the promise from Firestore save
          return saveUserCourseProgress(currentUser.uid, currentCourseIdInternal, progress).catch(err => {
               console.error(`Failed to save video progress to Firestore for ${videoId}:`, err);
               // Optionally re-throw or handle error differently
          });
     }
     return Promise.resolve(); // Return resolved promise if no change
}

// --- *** ADDED export TO FIX ERROR *** ---
// Function triggered after video ends and progress is saved
export async function handleVideoWatched(videoId) {
    console.log(`handleVideoWatched called for video ${videoId}.`);
    // The main logic is now handled by checkAndMarkChapterStudied,
    // which is called after saving progress in onPlayerStateChange(ENDED) and periodically in trackWatchTime.
    // This function can be simplified or removed if not needed elsewhere,
    // but keeping it ensures the export exists as script.js expects it.
    // It might be useful for triggering specific actions right when a video ends,
    // beyond just checking the overall chapter progress.
    await checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber);
}

// --- Combined Progress Calculation ---
/**
 * Calculates the combined progress percentage for a chapter based on video and PDF activity.
 * @param {object} progress - The user's full progress data for the course.
 * @param {number} chapterNum - The chapter number.
 * @param {object} chapterVideoDurationMap - Map of { videoId: durationInSeconds } for this chapter.
 * @param {object | null} pdfInfo - Object like { currentPage: number, totalPages: number } or null if no PDF.
 * @returns {{ percent: number, watchedStr: string, totalStr: string }}
 */
export function calculateChapterCombinedProgress(progress, chapterNum, chapterVideoDurationMap, pdfInfo) {
    const watchedVideoDurations = progress.watchedVideoDurations?.[chapterNum] || {};
    const pdfProgress = pdfInfo; // Use passed info

    let totalVideoSeconds = 0;
    let watchedVideoSeconds = 0;
    let hasVideo = false;
    if (chapterVideoDurationMap && Object.keys(chapterVideoDurationMap).length > 0) {
        hasVideo = true;
        Object.entries(chapterVideoDurationMap).forEach(([videoId, duration]) => {
            if (typeof duration === 'number' && duration > 0) {
                totalVideoSeconds += duration;
                watchedVideoSeconds += watchedVideoDurations[videoId] || 0;
            }
        });
        watchedVideoSeconds = Math.min(watchedVideoSeconds, totalVideoSeconds); // Clamp watched time
    }

    let totalPdfEquivalentSeconds = 0;
    let completedPdfEquivalentSeconds = 0;
    let hasPdf = false;
    // Use pdfProgress data directly from the user's state
    const chapterPdfProgress = progress.pdfProgress?.[chapterNum];
    if (chapterPdfProgress && chapterPdfProgress.totalPages > 0) {
        hasPdf = true;
        totalPdfEquivalentSeconds = chapterPdfProgress.totalPages * PDF_PAGE_EQUIVALENT_SECONDS;
        const currentPage = chapterPdfProgress.currentPage || 0;
        completedPdfEquivalentSeconds = Math.min(currentPage, chapterPdfProgress.totalPages) * PDF_PAGE_EQUIVALENT_SECONDS; // Clamp current page
    } else if (pdfInfo && pdfInfo.totalPages > 0) {
         // Fallback to passed pdfInfo if available (e.g., right after PDF load)
         hasPdf = true;
         totalPdfEquivalentSeconds = pdfInfo.totalPages * PDF_PAGE_EQUIVALENT_SECONDS;
         const currentPage = pdfInfo.currentPage || 0;
         completedPdfEquivalentSeconds = Math.min(currentPage, pdfInfo.totalPages) * PDF_PAGE_EQUIVALENT_SECONDS;
    }


    // Format time helper
    const formatTime = (seconds) => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    let combinedTotalSeconds = 0;
    let combinedCompletedSeconds = 0;
    let progressPercent = 0;

    if (hasVideo && hasPdf) {
        combinedTotalSeconds = totalVideoSeconds + totalPdfEquivalentSeconds;
        combinedCompletedSeconds = watchedVideoSeconds + completedPdfEquivalentSeconds;
        progressPercent = combinedTotalSeconds > 0 ? Math.min(100, Math.round((combinedCompletedSeconds / combinedTotalSeconds) * 100)) : 0;
    } else if (hasVideo) {
        combinedTotalSeconds = totalVideoSeconds;
        combinedCompletedSeconds = watchedVideoSeconds;
        progressPercent = combinedTotalSeconds > 0 ? Math.min(100, Math.round((combinedCompletedSeconds / combinedTotalSeconds) * 100)) : 0;
    } else if (hasPdf) {
        combinedTotalSeconds = totalPdfEquivalentSeconds;
        combinedCompletedSeconds = completedPdfEquivalentSeconds;
        progressPercent = combinedTotalSeconds > 0 ? Math.min(100, Math.round((combinedCompletedSeconds / combinedTotalSeconds) * 100)) : 0;
    } else {
        // No video or PDF content associated
        return { percent: 0, watchedStr: "0s", totalStr: "0s" };
    }

    return {
        percent: progressPercent,
        watchedStr: formatTime(combinedCompletedSeconds),
        totalStr: formatTime(combinedTotalSeconds)
    };
}


// --- Check and Mark Chapter Studied (Modified) ---
async function checkAndMarkChapterStudied(courseId, chapterNum) {
    if (!currentUser || !courseId || !chapterNum) return;

    const progress = userCourseProgressMap.get(courseId);
    const courseDef = globalCourseDataMap.get(courseId);
    if (!progress || !courseDef) return;

    // Get necessary data for combined progress calculation
    const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
    const lecturesForChapter = (Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : []).filter(lec => typeof lec === 'object' && lec.url && lec.title);
    const videoIdsForChapter = lecturesForChapter.map(lec => getYouTubeVideoId(lec.url)).filter(id => id !== null);
    const chapterVideoDurationMap = {};
    videoIdsForChapter.forEach(id => {
        if (videoDurationMap[id] !== undefined) { chapterVideoDurationMap[id] = videoDurationMap[id]; }
        else { console.warn(`Duration missing for video ${id} in chapter ${chapterNum} during check.`); }
    });

    const pdfInfo = progress.pdfProgress?.[chapterNum] || null; // Use stored PDF progress

    // Calculate combined progress
    const { percent: combinedProgressPercent } = calculateChapterCombinedProgress(progress, chapterNum, chapterVideoDurationMap, pdfInfo);

    console.log(`Checking study status for Ch ${chapterNum}. Combined Progress: ${combinedProgressPercent}%`);

    // Condition: Mark studied if combined progress is 100%
    if (combinedProgressPercent >= 100) {
        if (!progress.courseStudiedChapters?.includes(chapterNum)) {
            await markChapterStudiedInCourse(currentUser.uid, courseId, chapterNum, "progress_complete");
            console.log(`Chapter ${chapterNum} marked as studied due to reaching 100% combined progress.`);
            // Optionally update the progress bar visually immediately
            const progressBarContainer = document.getElementById(`chapter-progress-${chapterNum}`); // Assuming an ID exists
            if (progressBarContainer) {
                const progressBar = progressBarContainer.querySelector('.bg-blue-500');
                const progressText = progressBarContainer.querySelector('.progress-tooltip-text'); // Assuming a class exists
                if (progressBar) progressBar.style.width = '100%';
                if (progressText) progressText.textContent = 'Completed: 100%';
            }
        } else {
            console.log(`Chapter ${chapterNum} already marked studied.`);
        }
    } else {
         console.log(`Chapter ${chapterNum} not yet 100% complete (${combinedProgressPercent}%).`);
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
    } else { return; }

    const transcriptionContainer = document.getElementById('transcription-content');
    if (!transcriptionContainer) return;

    let currentLineId = null;
    for (const entry of currentTranscriptionData) {
        if (currentTime >= entry.start && currentTime <= entry.end) {
            currentLineId = `t-line-${entry.id}`;
            break;
        }
    }

    // Remove highlight from previously highlighted lines
    transcriptionContainer.querySelectorAll('.transcription-line.active').forEach(el => {
        el.classList.remove('active', 'bg-yellow-100', 'dark:bg-yellow-700/50', 'p-2');
        el.classList.add('p-1');
    });

    const currentLineElement = currentLineId ? document.getElementById(currentLineId) : null;

    if (isTranscriptionExpanded) {
        if (currentLineElement) {
            currentLineElement.classList.add('active', 'bg-yellow-100', 'dark:bg-yellow-700/50', 'p-2');
            currentLineElement.classList.remove('p-1');
            // Only scroll if the element is not already fully visible
            const containerRect = transcriptionContainer.getBoundingClientRect();
            const lineRect = currentLineElement.getBoundingClientRect();
            if (lineRect.top < containerRect.top || lineRect.bottom > containerRect.bottom) {
                 currentLineElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    } else {
        // Collapsed view
        transcriptionContainer.querySelectorAll('.transcription-line').forEach(el => { el.classList.add('hidden'); });
        const placeholder = transcriptionContainer.querySelector('.transcription-placeholder');
        if (currentLineElement) {
            currentLineElement.classList.remove('hidden');
            currentLineElement.classList.add('active');
            placeholder?.classList.add('hidden'); // Hide placeholder if line found
        } else {
            if (placeholder) { placeholder.classList.remove('hidden'); }
            else { // Add placeholder if it doesn't exist
                 const p = document.createElement('p');
                 p.className = 'transcription-placeholder text-xs italic text-muted p-1';
                 p.textContent = '(Transcription sync... )'; // Modified placeholder text
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
    if (playerToSeek && typeof playerToSeek.seekTo === 'function') {
         console.log(`Seeking video to ${startTime}s`);
         playerToSeek.seekTo(startTime, true);
         playerToSeek.playVideo();
    } else {
         console.warn("Could not find current player to seek for transcription click.");
    }
}

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
              `<span id="t-line-${entry.id}" class="transcription-line block p-1 rounded cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-800/50 ${isTranscriptionExpanded ? '' : 'hidden'}" data-start-time="${entry.start}" onclick="window.handleTranscriptionClick(event)">${escapeHtml(entry.text)}</span>`
          ).join('');
          container.innerHTML = linesHtml;
          if (!isTranscriptionExpanded) {
               const placeholder = document.createElement('p');
               placeholder.className = 'transcription-placeholder text-xs italic text-muted p-1 hidden';
               placeholder.textContent = '(Transcription sync... )';
               container.prepend(placeholder);
          }
     } else {
           container.innerHTML = '<p class="text-sm text-muted italic p-1">No transcription available for the current video.</p>';
     }
}

// --- Cleanup Functions ---
window.cleanupYouTubePlayers = () => {
     console.log(`Attempting to cleanup ${Object.keys(ytPlayers).length} YT player instances.`);
    Object.values(ytPlayers).forEach(playerData => {
        try {
             if (playerData && playerData.player && typeof playerData.player.destroy === 'function') {
                  console.log(`Destroying player for video ${playerData.videoId}`);
                  if (playerData.intervalId) clearInterval(playerData.intervalId);
                  try { playerData.player.destroy(); } catch (destroyError) { console.warn("Error during player.destroy():", destroyError); }
             } else if (playerData) { console.log(`Player instance invalid during cleanup.`); }
        } catch (e) { console.error("Error destroying YT player:", e); }
    });
    ytPlayers = {};
    ytInitializationQueue = [];
    videoWatchStatus = {};
    if(transcriptionHighlightInterval) clearInterval(transcriptionHighlightInterval);
    transcriptionHighlightInterval = null;
    videoDurationMap = {}; // Clear duration cache on cleanup
    console.log("Cleaned up YouTube players state.");
};

export const cleanupPdfViewer = () => {
    pdfDoc = null; pdfPageNum = 1; pdfPageRendering = false; pdfPageNumPending = null;
    pdfCanvas = null; pdfCtx = null; pdfViewerContainer = null;
    currentPdfTextContent = null;
    pdfTotalPages = 0; // Reset total pages
    const prevButton = document.getElementById('pdf-prev');
    const nextButton = document.getElementById('pdf-next');
    if (prevButton) prevButton.onclick = null;
    if (nextButton) nextButton.onclick = null;
    console.log("Cleaned up PDF viewer state.");
};
window.cleanupPdfViewer = cleanupPdfViewer;

// --- PDF.js Functions ---
export async function initPdfViewer(pdfPath) {
    cleanupPdfViewer();
    pdfViewerContainer = document.getElementById('pdf-viewer-container');
    const pdfControls = document.getElementById('pdf-controls');
    const pdfExplainButton = document.getElementById('pdf-explain-button');

    if (!pdfViewerContainer || !pdfControls || !pdfExplainButton) {
         console.error("PDF viewer elements not found!");
         displayContent('<p class="text-red-500 p-4">Error: PDF viewer UI elements are missing.</p>', 'course-dashboard-area');
         return;
     }
    pdfViewerContainer.innerHTML = `<div class="p-4 text-center"><div class="loader animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-2 text-sm text-muted">Loading PDF from: ${pdfPath || 'N/A'}...</p></div>`;
    pdfControls.classList.add('hidden');
    pdfExplainButton.disabled = true;

    if (!pdfPath) {
        console.error("initPdfViewer: No PDF path provided.");
        pdfViewerContainer.innerHTML = `<p class="text-red-500 p-4">Error: No PDF file path specified for this chapter.</p>`;
        return;
    }

    try {
        if (typeof pdfjsLib === 'undefined') {
             console.error("PDF.js library not loaded.");
             throw new Error("PDF library not available.");
         }
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
        console.log(`Attempting to load PDF document from: ${pdfPath}`);

        const encodedPdfPath = encodeURI(pdfPath); // Use encodeURI for path with spaces/etc.
        const loadingTask = pdfjsLib.getDocument(encodedPdfPath);

        loadingTask.promise.then(async (loadedPdfDoc) => {
            pdfDoc = loadedPdfDoc;
            pdfTotalPages = pdfDoc.numPages; // Store total pages
            console.log('PDF loaded successfully:', pdfTotalPages, 'pages');

            // Initialize PDF progress in state
            const progress = userCourseProgressMap.get(currentCourseIdInternal);
            let initialPageNum = 1;
            if (progress) {
                progress.pdfProgress = progress.pdfProgress || {};
                progress.pdfProgress[currentChapterNumber] = progress.pdfProgress[currentChapterNumber] || { currentPage: 0, totalPages: 0 };
                // Set total pages if not set or different
                if (progress.pdfProgress[currentChapterNumber].totalPages !== pdfTotalPages) {
                    progress.pdfProgress[currentChapterNumber].totalPages = pdfTotalPages;
                    // Trigger a save? Only needed if totalPages changes significantly
                    saveUserCourseProgress(currentUser.uid, currentCourseIdInternal, progress);
                }
                // Set initial page number based on saved progress
                initialPageNum = Math.max(1, progress.pdfProgress[currentChapterNumber].currentPage || 1);
                initialPageNum = Math.min(initialPageNum, pdfTotalPages); // Ensure within bounds
                pdfPageNum = initialPageNum; // Update module state variable
                console.log(`Restored PDF to page ${pdfPageNum} from progress.`);
            }

            pdfControls.classList.remove('hidden');
            pdfExplainButton.disabled = false;
            document.getElementById('pdf-page-num').textContent = pdfPageNum; // Show current page
            document.getElementById('pdf-page-count').textContent = pdfTotalPages;
            pdfCanvas = document.createElement('canvas');
            pdfCanvas.id = 'pdf-canvas';
            pdfCtx = pdfCanvas.getContext('2d');
            pdfViewerContainer.innerHTML = '';
            pdfViewerContainer.appendChild(pdfCanvas);

            await renderPdfPage(pdfPageNum); // Render the potentially restored page
            document.getElementById('pdf-prev').onclick = onPrevPage;
            document.getElementById('pdf-next').onclick = onNextPage;

            // Update progress even on initial load if it wasn't already current
            if (progress && progress.pdfProgress[currentChapterNumber].currentPage !== pdfPageNum) {
                updatePdfProgressAndCheckCompletion(pdfPageNum);
            }


        }).catch(error => {
            console.error(`Error during pdfjsLib.getDocument('${encodedPdfPath}'):`, error.name, error.message);
             let userMessage = `Error loading PDF: ${error.message || 'Unknown error'}.`;
             if (error.name === 'InvalidPDFException' || error.message?.includes('Invalid PDF structure')) {
                  userMessage = "Error loading PDF: Invalid PDF file structure. The file might be corrupted or not a valid PDF.";
             } else if (error.name === 'MissingPDFException' || error.status === 404) {
                 userMessage = `Error loading PDF: File not found. Checked path: ${pdfPath}`;
             } else if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
                 userMessage = `Error loading PDF: Network error. Check path and connection: ${pdfPath}`;
             } else if (error.name === 'UnknownErrorException') {
                  userMessage = `Error loading PDF: An unknown error occurred. Check console. Path: ${pdfPath}`;
             } else if (error.name === 'UnexpectedResponseException') {
                  userMessage = `Error loading PDF: Server responded unexpectedly (Status: ${error.status}). Path: ${pdfPath}`;
             }
             pdfViewerContainer.innerHTML = `<p class="text-red-500 p-4">${userMessage}</p>`;
             pdfControls.classList.add('hidden');
             pdfExplainButton.disabled = true;
             cleanupPdfViewer();
        });

    } catch (error) {
        console.error("Synchronous error in initPdfViewer:", error);
        pdfViewerContainer.innerHTML = `<p class="text-red-500 p-4">Error initializing PDF viewer: ${error.message}.</p>`;
        pdfControls.classList.add('hidden');
        pdfExplainButton.disabled = true;
        cleanupPdfViewer();
    }
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
        if (!pdfCanvas || !pdfCtx) { throw new Error("PDF canvas or context missing during render."); }
        pdfCanvas.height = viewport.height;
        pdfCanvas.width = viewport.width;
        const renderContext = { canvasContext: pdfCtx, viewport: viewport };
        const renderTask = page.render(renderContext);
        await renderTask.promise;
        console.log(`Page ${num} rendered.`);
    } catch (error) {
         console.error(`Error rendering page ${num}:`, error);
          if (pdfCtx) {
               pdfCtx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
               pdfCtx.fillStyle = 'red';
               pdfCtx.font = '16px sans-serif';
               pdfCtx.textAlign = 'center';
               pdfCtx.fillText(`Error rendering page ${num}.`, pdfCanvas.width / 2, pdfCanvas.height / 2);
          }
    } finally {
        pdfPageRendering = false;
        if (pdfPageNumPending !== null) {
            renderPdfPage(pdfPageNumPending);
            pdfPageNumPending = null;
        }
    }
 }
function queueRenderPage(num) { if (pdfPageRendering) pdfPageNumPending = num; else renderPdfPage(num); }

// MODIFIED: Update progress on page change
function onPrevPage() {
    if (pdfPageNum <= 1) return;
    pdfPageNum--;
    updatePdfProgressAndCheckCompletion(pdfPageNum); // Update progress
    queueRenderPage(pdfPageNum);
}
function onNextPage() {
    if (!pdfDoc || pdfPageNum >= pdfDoc.numPages) return;
    pdfPageNum++;
    updatePdfProgressAndCheckCompletion(pdfPageNum); // Update progress
    queueRenderPage(pdfPageNum);
}

// NEW: Helper to update PDF progress state and check completion
async function updatePdfProgressAndCheckCompletion(newPageNum) {
     if (!currentUser || !currentCourseIdInternal || !currentChapterNumber) return;
     const progress = userCourseProgressMap.get(currentCourseIdInternal);
     if (!progress) return;

     progress.pdfProgress = progress.pdfProgress || {};
     progress.pdfProgress[currentChapterNumber] = progress.pdfProgress[currentChapterNumber] || { currentPage: 0, totalPages: pdfTotalPages || 0 };

     // Only update if the page number is higher than the current stored page
     const currentStoredPage = progress.pdfProgress[currentChapterNumber].currentPage || 0;
     if (newPageNum > currentStoredPage) {
         progress.pdfProgress[currentChapterNumber].currentPage = newPageNum;
         // Ensure total pages is set correctly
         if (!progress.pdfProgress[currentChapterNumber].totalPages && pdfTotalPages > 0) {
              progress.pdfProgress[currentChapterNumber].totalPages = pdfTotalPages;
         }

         console.log(`Updating PDF progress for Ch ${currentChapterNumber}: Page ${newPageNum} / ${pdfTotalPages}`);
         updateUserCourseProgress(currentCourseIdInternal, progress); // Update local state

         // Save to Firestore and then check for completion
         try {
             await saveUserCourseProgress(currentUser.uid, currentCourseIdInternal, progress);
             console.log("PDF progress saved.");
             await checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber); // Check combined progress
         } catch (error) {
              console.error("Failed to save PDF progress:", error);
         }
     } else {
          console.log(`PDF Page ${newPageNum} not higher than stored page ${currentStoredPage}. No progress update needed.`);
     }
}


export async function handlePdfSnapshotForAI() {
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
export async function showCourseStudyMaterial(courseId, chapterNum, videoIdx = 0) {
    window.cleanupPdfViewer?.();
    window.cleanupYouTubePlayers?.();

    currentCourseIdInternal = courseId;
    currentChapterNumber = chapterNum;
    currentVideoIndex = videoIdx;
    isTranscriptionExpanded = false; // Reset transcription view state

    if (!currentUser || !courseId || !chapterNum) { return; }
    setActiveCourseId(courseId);
    setActiveSidebarLink('sidebar-next-lesson-link', 'sidebar-course-nav'); // Or appropriate link

    const courseDef = globalCourseDataMap.get(courseId);
    if (!courseDef) { return; }
    if (chapterNum < 1 || chapterNum > courseDef.totalChapters) { return; }

    let chapterTitle = `Chapter ${chapterNum}`;
    if (courseDef.chapters && Array.isArray(courseDef.chapters) && courseDef.chapters.length >= chapterNum) {
        chapterTitle = courseDef.chapters[chapterNum - 1] || chapterTitle;
    }
    const totalChapters = courseDef.totalChapters;

    const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
    chapterLectureVideos = (Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : []).filter(lec => typeof lec === 'object' && lec.url && lec.title);

    if (currentVideoIndex < 0 || currentVideoIndex >= chapterLectureVideos.length) {
         currentVideoIndex = 0;
    }

    const currentVideo = chapterLectureVideos[currentVideoIndex];
    // *** USE CORRECTED PATH ***
    const pdfPath = courseDef.pdfPathPattern?.replace('{num}', chapterNum);

    showLoading(`Loading Chapter ${chapterNum} Material...`);
    currentTranscriptionData = [];
    let transcriptionFullPath = null;
    if (currentVideo && currentVideo.title) {
         const srtFilename = getSrtFilenameFromTitle(currentVideo.title);
         if (srtFilename) {
              transcriptionFullPath = `${COURSE_TRANSCRIPTION_BASE_PATH}${srtFilename}`;
              console.log(`Attempting to fetch transcription from: ${transcriptionFullPath}`);
              currentTranscriptionData = await fetchAndParseSrt(transcriptionFullPath);
         } else { console.warn(`Could not generate SRT filename for title: ${currentVideo.title}`); }
    } else { console.log("No current video or title to fetch transcription for."); }
    currentPdfTextContent = null; // Reset AI text cache

    // Pre-fetch video durations if not already cached
    const videoIdsInChapter = chapterLectureVideos.map(lec => getYouTubeVideoId(lec.url)).filter(id => id);
    await fetchVideoDurationsIfNeeded(videoIdsInChapter);

    hideLoading();

    // --- Generate HTML ---
    let studyMaterialHtml = `<div class="space-y-6">`;
    // Navigation and Title
    studyMaterialHtml += `
       <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
           <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(chapterTitle)}</h2>
           <div class="flex space-x-2">
               <button onclick="window.navigateChapterMaterial('${courseId}', ${chapterNum - 1})" ${chapterNum <= 1 ? 'disabled' : ''} class="btn-secondary-small" title="Previous Chapter">Prev Ch</button>
               <button onclick="window.navigateChapterMaterial('${courseId}', ${chapterNum + 1})" ${chapterNum >= totalChapters ? 'disabled' : ''} class="btn-secondary-small" title="Next Chapter">Next Ch</button>
               <button onclick="window.displayCourseContentMenu('${courseId}')" class="btn-secondary-small" title="Back to Chapter List">Chapters</button>
           </div>
       </div>`;

    // Lecture Video Section
    studyMaterialHtml += `<div class="content-card">`;
    studyMaterialHtml += `<h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Lecture Video</h3>`;
    if (chapterLectureVideos.length > 0) {
         const currentVideoTitle = currentVideo?.title || 'Video';
         const videoId = currentVideo ? getYouTubeVideoId(currentVideo.url) : null;
         const playerId = `ytplayer-${chapterNum}-${currentVideoIndex}`;
         studyMaterialHtml += `<div class="mb-3 flex justify-between items-center">`;
         studyMaterialHtml += `<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Lecture ${currentVideoIndex + 1} of ${chapterLectureVideos.length}: ${escapeHtml(currentVideoTitle)}</p>`;
         studyMaterialHtml += `<div class="flex space-x-1"> <button onclick="window.switchVideo(${currentVideoIndex - 1})" ${currentVideoIndex <= 0 ? 'disabled' : ''} class="btn-secondary-small text-xs" title="Previous Video"><svg class='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'><path fill-rule='evenodd' d='M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z' clip-rule='evenodd' /></svg></button> <button onclick="window.switchVideo(${currentVideoIndex + 1})" ${currentVideoIndex >= chapterLectureVideos.length - 1 ? 'disabled' : ''} class="btn-secondary-small text-xs" title="Next Video"><svg class='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'><path fill-rule='evenodd' d='M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z' clip-rule='evenodd' /></svg></button> </div>`; studyMaterialHtml += `</div>`;
         if (videoId) { studyMaterialHtml += `<div class="aspect-w-16 aspect-h-9 bg-black rounded shadow"><div id="${playerId}">Loading Player...</div></div>`; }
         else { studyMaterialHtml += `<p class="text-sm text-red-500">Error: Could not get video ID for <a href="${escapeHtml(currentVideo?.url || '#')}" target="_blank" class="link">this video</a>.</p>`; }
    } else { studyMaterialHtml += `<p class="text-sm text-muted">No lecture videos assigned to this chapter.</p>`; }
    studyMaterialHtml += `</div>`;

    // Transcription Section
    studyMaterialHtml += `<div class="content-card">`;
    studyMaterialHtml += `<div class="flex justify-between items-center mb-3"> <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">Lecture Transcription</h3> <button id="transcription-toggle-btn" onclick="window.toggleTranscriptionView()" class="btn-secondary-small text-xs" title="Show the full transcription text" ${currentTranscriptionData.length === 0 ? 'disabled' : ''}>${isTranscriptionExpanded ? 'Collapse Transcription' : 'Expand Transcription'}</button> </div>`;
    studyMaterialHtml += `<div id="transcription-content" class="text-sm leading-relaxed ${isTranscriptionExpanded ? 'max-h-96' : 'max-h-32'} overflow-y-auto p-3 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600 whitespace-normal font-mono text-xs shadow-inner"> </div>`;
    if (currentTranscriptionData && currentTranscriptionData.length > 0) { studyMaterialHtml += `<div class="mt-3"> <button onclick="window.handleExplainSelection('transcription')" class="btn-secondary-small text-xs">Explain Selected Text (AI)</button> <button onclick="window.askQuestionAboutTranscription()" class="btn-secondary-small ml-2 text-xs">Ask Question (AI)</button> </div>`; }
    studyMaterialHtml += `</div>`;

    // PDF Viewer Section
    studyMaterialHtml += `<div class="content-card">`;
    studyMaterialHtml += `<h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Chapter PDF</h3>`;
    if (pdfPath) {
         studyMaterialHtml += ` <div id="pdf-viewer-wrapper" class="mb-4"> <div id="pdf-viewer-container" class="h-[70vh] max-h-[800px] mb-2 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 overflow-auto shadow-inner rounded"></div> <div id="pdf-controls" class="hidden items-center justify-center space-x-4 mt-2"> <button id="pdf-prev" class="btn-secondary-small">< Prev</button> <span>Page <span id="pdf-page-num">1</span> / <span id="pdf-page-count">?</span></span> <button id="pdf-next" class="btn-secondary-small">Next ></button> </div> </div> <button id="pdf-explain-button" onclick="window.handlePdfSnapshotForAI()" class="btn-secondary-small text-xs" disabled>Ask AI About This Page</button> <a href="${escapeHtml(encodeURI(pdfPath))}" target="_blank" class="link text-xs ml-4">(Open PDF in new tab)</a>`;
     } else { studyMaterialHtml += `<p class="text-sm text-muted">No PDF available for this chapter.</p>`; }
    studyMaterialHtml += `</div>`;

    // Actions & Resources Section
    studyMaterialHtml += `<div class="content-card"> <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Actions & Resources</h3> <div class="flex flex-wrap gap-3 mb-4">`;
    const canUseAI = (currentTranscriptionData && currentTranscriptionData.length > 0) || pdfPath;
    studyMaterialHtml += `<button id="view-formula-btn" onclick="window.displayFormulaSheet('${courseId}', ${chapterNum})" class="btn-secondary flex-1" ${!canUseAI ? 'disabled' : ''} title="${canUseAI ? 'Generate formula sheet using AI' : 'Requires Transcription or PDF'}">View Formula Sheet (AI)</button>`;
    studyMaterialHtml += `<button onclick="window.triggerSkipExamGeneration('${courseId}', ${chapterNum})" class="btn-warning flex-1" ${!canUseAI ? 'disabled' : ''} title="${canUseAI ? `Take exam (${SKIP_EXAM_PASSING_PERCENT}%) to achieve 100% progress for this chapter` : 'Requires Transcription or PDF'}">Take Skip Exam (AI)</button>`;
    studyMaterialHtml += `</div> <div id="formula-sheet-area" class="mt-4 hidden border-t dark:border-gray-700 pt-4"> <div class="flex justify-between items-center mb-2"> <h4 class="text-base font-semibold text-gray-700 dark:text-gray-300">Generated Formula Sheet</h4> <button id="download-formula-pdf-btn" class="btn-secondary-small text-xs hidden" onclick="window.downloadFormulaSheetPdf()">Download PDF</button> </div> <div id="formula-sheet-content" class="prose prose-sm dark:prose-invert max-w-none p-3 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600"></div> </div> </div>`;

    // AI Explanation Area
    studyMaterialHtml += `<div id="ai-explanation-area" class="content-card fixed bottom-4 right-4 w-full max-w-md bg-white dark:bg-gray-800 border dark:border-gray-600 shadow-xl rounded-lg p-4 z-50 hidden max-h-[45vh] overflow-y-auto transition-all duration-300 ease-out">`;
    studyMaterialHtml += `<div class="flex justify-between items-center mb-2"> <h4 class="text-base font-semibold text-purple-700 dark:text-purple-300">AI Explanation</h4> <button onclick="document.getElementById('ai-explanation-area').classList.add('hidden');" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl leading-none p-1">×</button> </div>`;
    studyMaterialHtml += `<div id="ai-explanation-content" class="text-sm"></div>`;
    studyMaterialHtml += `</div>`;

    studyMaterialHtml += `</div>`; // Close main container
    displayContent(studyMaterialHtml, 'course-dashboard-area');

    // --- Post-Render Initializations ---
    if (pdfPath) { requestAnimationFrame(() => initPdfViewer(pdfPath)); }
    else { const pdfContainer = document.getElementById('pdf-viewer-container'); if (pdfContainer) { pdfContainer.innerHTML = '<p class="text-muted italic p-4 text-center">No PDF configured for this chapter.</p>'; } }
    if (currentVideo) { const videoId = getYouTubeVideoId(currentVideo.url); const playerId = `ytplayer-${chapterNum}-${currentVideoIndex}`; if (videoId) { requestAnimationFrame(() => { createYTPlayer(playerId, videoId); }); } }
    renderTranscriptionLines();
    if (currentTranscriptionData && currentTranscriptionData.length > 0) { if (transcriptionHighlightInterval) clearInterval(transcriptionHighlightInterval); transcriptionHighlightInterval = setInterval(highlightTranscriptionLine, 500); }
}

// --- Other Functions (Skip Exam, AI Explanation, Formula Sheet, Navigation) ---
export async function triggerSkipExamGeneration(courseId, chapterNum) {
    if (!currentUser) { alert("Please log in."); return; }
    let transcriptionForExam = currentTranscriptionData?.map(e => e.text).join(' ') || null;
    let pdfTextForExam = currentPdfTextContent; // Use cached AI text if available
    if (!transcriptionForExam && !pdfTextForExam) {
        const courseDef = globalCourseDataMap.get(courseId);
        // *** USE CORRECTED PATH ***
        const pdfPath = courseDef?.pdfPathPattern?.replace('{num}', chapterNum);
        if (pdfPath) {
            showLoading(`Extracting PDF text for Skip Exam (Ch ${chapterNum})...`);
            pdfTextForExam = await getAllPdfTextForAI(pdfPath); // Ensure this function is available
            hideLoading();
            if (!pdfTextForExam) { console.warn("Failed to extract text from the PDF for Skip Exam."); }
            else { currentPdfTextContent = pdfTextForExam; } // Cache for potential future use
        }
    }
    if (!transcriptionForExam && !pdfTextForExam) { alert("Cannot generate skip exam: No transcription or PDF text content available for this chapter."); return; }
    if (!window.confirm(`Generate and start a skip exam for Chapter ${chapterNum}? Passing this exam (${SKIP_EXAM_PASSING_PERCENT}%) will mark the chapter as fully studied (100% progress).`)) { return; }
    showLoading(`Generating AI Skip Exam for Chapter ${chapterNum}...`);
    try {
        const rawExamText = await generateSkipExam(transcriptionForExam, pdfTextForExam, chapterNum);
        if (!rawExamText) throw new Error("AI failed to generate exam content.");
        const parsedExam = parseSkipExamText(rawExamText, chapterNum);
        if (!parsedExam || !parsedExam.questions || parsedExam.questions.length === 0) { console.error("Failed to parse generated skip exam text:", rawExamText); throw new Error("Failed to parse the generated exam. The format might be incorrect."); }
        const examId = `SkipExam-C${chapterNum}-${Date.now().toString().slice(-6)}`;
        const skipExamState = {
            examId: examId, questions: parsedExam.questions, correctAnswers: parsedExam.answers, userAnswers: {}, allocation: null, startTime: Date.now(), timerInterval: null, currentQuestionIndex: 0, status: 'active',
            durationMinutes: Math.max(10, Math.min(45, parsedExam.questions.length * 1.5)), // Example duration
            courseContext: { isCourseActivity: true, isSkipExam: true, courseId: courseId, activityType: 'skip_exam', activityId: `chapter${chapterNum}`, chapterNum: chapterNum }
         };
        setCurrentOnlineTestState(skipExamState); hideLoading(); launchOnlineTestUI();
    } catch (error) { hideLoading(); console.error(`Error generating or launching skip exam for Chapter ${chapterNum}:`, error); alert(`Failed to start Skip Exam: ${error.message}`); }
 }
async function handleExplainSelectionInternal(selectedText, context) {
     const explanationArea = document.getElementById('ai-explanation-area'); const explanationContent = document.getElementById('ai-explanation-content'); if (!explanationArea || !explanationContent) return; explanationContent.innerHTML = `<div class="flex items-center justify-center space-x-2"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-sm">Generating explanation...</p></div>`; explanationArea.classList.remove('hidden'); try { const explanationHtml = await explainStudyMaterialSnippet(selectedText, context); explanationContent.innerHTML = explanationHtml; await renderMathIn(explanationContent); } catch (error) { console.error("Error getting explanation:", error); explanationContent.innerHTML = `<p class="text-danger text-sm">Error: ${error.message}</p>`; }
 }
export function handleExplainSelection(sourceType) {
    if (sourceType !== 'transcription') return; let selectedText = window.getSelection()?.toString().trim(); if (!selectedText) { alert("Please select text from the transcription to explain."); return; } if (!currentTranscriptionData || currentTranscriptionData.length === 0 || !currentChapterNumber) { alert("Cannot explain: Transcription context missing."); return; } const context = `From Transcription for Chapter ${currentChapterNumber}.`; const fullTranscriptionText = currentTranscriptionData.map(e => e.text).join(' '); handleExplainSelectionInternal(selectedText, `Context: ${context}\nFull Transcription Text (for context): ${fullTranscriptionText.substring(0, 5000)}...`);
}
export function askQuestionAboutTranscription() {
     if (!currentTranscriptionData || currentTranscriptionData.length === 0 || !currentChapterNumber) { alert("Cannot ask question: Transcription context missing."); return; } const userQuestion = prompt(`Ask a question about the transcription for Chapter ${currentChapterNumber}:`); if (!userQuestion || userQuestion.trim() === "") return; const fullTranscriptionText = currentTranscriptionData.map(e => e.text).join(' '); handleExplainSelectionInternal(userQuestion, `Context: Chapter ${currentChapterNumber} Transcription.\nFull Text (for context): ${fullTranscriptionText.substring(0, 8000)}...`);
}
export async function displayFormulaSheet(courseId, chapterNum) {
    const formulaArea = document.getElementById('formula-sheet-area'); const formulaContent = document.getElementById('formula-sheet-content'); const downloadBtn = document.getElementById('download-formula-pdf-btn'); if (!formulaArea || !formulaContent || !downloadBtn) return; formulaArea.classList.remove('hidden'); downloadBtn.classList.add('hidden'); formulaContent.innerHTML = `<p class="text-center text-muted">Generating Formula Sheet...</p><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`; if (!courseId || !chapterNum) { formulaContent.innerHTML = '<p class="text-warning">Error: Context missing.</p>'; return; } try { const sheetHtml = await generateFormulaSheet(courseId, chapterNum); formulaContent.innerHTML = sheetHtml; await renderMathIn(formulaContent); if (!sheetHtml.includes('Error generating') && !sheetHtml.includes('No text content available')) { downloadBtn.classList.remove('hidden'); } } catch (error) { console.error("Error displaying formula sheet:", error); formulaContent.innerHTML = `<p class="text-danger">Error generating formula sheet: ${error.message || 'Unknown error'}</p>`; }
}
export async function downloadFormulaSheetPdf() {
     const formulaContentElement = document.getElementById('formula-sheet-content'); if (!formulaContentElement || !currentChapterNumber || !currentCourseIdInternal) { alert("Cannot download: Formula sheet content or context missing."); return; } const courseName = globalCourseDataMap.get(currentCourseIdInternal)?.name || 'Course'; const filename = `Formula_Sheet_${courseName.replace(/\s+/g, '_')}_Ch${currentChapterNumber}`; showLoading(`Generating ${filename}.pdf...`); try { const elementToPrint = formulaContentElement.cloneNode(true); const printHtml = ` <!DOCTYPE html><html><head><title>${filename}</title> <style> body { font-family: sans-serif; } .prose { max-width: none; } </style> </head><body> <h2 style="text-align: center;">Formula Sheet - Chapter ${currentChapterNumber}</h2> ${elementToPrint.innerHTML} </body></html>`; await generateAndDownloadPdfWithMathJax(printHtml, filename); } catch (error) { console.error("Error generating formula sheet PDF:", error); alert("Failed to generate PDF for formula sheet."); } finally { hideLoading(); }
}
export function navigateChapterMaterial(courseId, chapterNum) {
     const courseDef = globalCourseDataMap.get(courseId); if (!courseDef || chapterNum < 1 || chapterNum > courseDef.totalChapters) { console.warn(`Navigation blocked: Invalid chapter ${chapterNum}`); return; } showCourseStudyMaterial(courseId, chapterNum);
}

// --- NEW: Switch Video Function ---
async function switchVideo(newIndex) {
    if (!currentCourseIdInternal || !currentChapterNumber || !chapterLectureVideos) return;
    if (newIndex >= 0 && newIndex < chapterLectureVideos.length) {
        // Save progress for the *current* video before switching
        const currentPlayerElementId = `ytplayer-${currentChapterNumber}-${currentVideoIndex}`;
        const currentPlayerState = ytPlayers[currentPlayerElementId];
        if (currentPlayerState && currentPlayerState.player) {
            await saveVideoWatchProgress(currentPlayerState.videoId); // Await saving
        }
        // Navigate to the new video within the same chapter view
        showCourseStudyMaterial(currentCourseIdInternal, currentChapterNumber, newIndex);
    }
}
window.switchVideo = switchVideo; // Assign to window scope

// --- NEW: Helper to fetch video durations ---
async function fetchVideoDurationsIfNeeded(videoIds) {
    const idsToFetch = videoIds.filter(id => videoDurationMap[id] === undefined);
    if (idsToFetch.length === 0) return;
    console.log(`Fetching durations for ${idsToFetch.length} videos...`);
    const apiKey = YOUTUBE_API_KEY; // Use imported key
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") { console.warn("YouTube API Key not configured. Cannot fetch video durations."); idsToFetch.forEach(id => videoDurationMap[id] = null); return; }
    const MAX_IDS_PER_REQUEST = 50;
    try {
        for (let i = 0; i < idsToFetch.length; i += MAX_IDS_PER_REQUEST) {
            const chunkIds = idsToFetch.slice(i, i + MAX_IDS_PER_REQUEST);
            const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${chunkIds.join(',')}&key=${apiKey}`;
            const response = await fetch(apiUrl);
            if (!response.ok) { const errorData = await response.json(); console.error("YouTube API Error fetching durations:", errorData); throw new Error(`YouTube API Error: ${response.status}`); }
            const data = await response.json(); const fetchedDurationsInChunk = {};
            data.items?.forEach(item => {
                const durationStr = item.contentDetails?.duration; if (durationStr && item.id) { const durationRegex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/; const matches = durationStr.match(durationRegex); if (matches) { const hours = parseInt(matches[1] || '0'); const minutes = parseInt(matches[2] || '0'); const seconds = parseInt(matches[3] || '0'); videoDurationMap[item.id] = hours * 3600 + minutes * 60 + seconds; fetchedDurationsInChunk[item.id] = videoDurationMap[item.id]; } else { console.warn(`Could not parse duration string "${durationStr}" for video ${item.id}`); videoDurationMap[item.id] = null; } } else { videoDurationMap[item.id] = null; }
            }); console.log("Fetched durations for chunk:", fetchedDurationsInChunk);
        }
        idsToFetch.forEach(id => { if (videoDurationMap[id] === undefined) videoDurationMap[id] = null; });
    } catch (error) { console.error("Error fetching video durations:", error); idsToFetch.forEach(id => videoDurationMap[id] = null); }
}

// --- END OF FILE ui_course_study_material.js ---