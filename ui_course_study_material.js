// --- START OF FILE ui_course_study_material.js ---

// ui_course_study_material.js

import { currentUser, globalCourseDataMap, activeCourseId, setActiveCourseId, userCourseProgressMap, updateUserCourseProgress } from './state.js';
// MODIFIED: Import USER-SPECIFIC save/load functions for sheets/summaries
import { saveUserCourseProgress, markChapterStudiedInCourse, saveUserFormulaSheet, loadUserFormulaSheet, saveUserChapterSummary, loadUserChapterSummary } from './firebase_firestore.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml, renderMathIn } from './utils.js';
// *** Corrected base path import + added new config value ***
import { COURSE_TRANSCRIPTION_BASE_PATH, PDF_WORKER_SRC, SKIP_EXAM_PASSING_PERCENT, PDF_PAGE_EQUIVALENT_SECONDS, COURSE_PDF_BASE_PATH, YOUTUBE_API_KEY } from './config.js'; // Added YT Key
// MODIFIED: Import generateSkipExam from ai_integration (not ui_test_generation)
// *** UPDATED Imports: Use USER-SPECIFIC save/load functions and WHOLE PDF AI ***
import { generateFormulaSheet, explainStudyMaterialSnippet, generateSkipExam, getExplanationForPdfSnapshot, getAllPdfTextForAI, generateChapterSummary, askAboutPdfDocument } from './ai_integration.js';
import { parseSkipExamText } from './markdown_parser.js';
import { launchOnlineTestUI, setCurrentOnlineTestState } from './ui_online_test.js';
import { generateAndDownloadPdfWithMathJax } from './ui_pdf_generation.js';
import { showCurrentCourseDashboard } from './ui_course_dashboard.js';
// MODIFIED: Import test_logic functions for problem selection/combination
import { parseChapterProblems, selectProblemsForExam, combineProblemsWithQuestions } from './test_logic.js';
// MODIFIED: Import notes functions - Added setLastViewedChapterForNotes
import { showNotesDocumentsPanel, setLastViewedChapterForNotes } from './ui_notes_documents.js';


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

// AI Explanation/Chat History (for this UI context)
let currentExplanationHistory = [];
let currentPdfExplanationHistory = [];
let currentTranscriptionExplanationHistory = [];


// --- End Module State ---


// --- Helper Functions ---

// Function to get the expected SRT filename from a video title (preserves spaces)
// *** EXPORTED TO FIX ERROR ***
export function getSrtFilenameFromTitle(title) {
     if (!title) return null;
     // Keep spaces, replace other problematic characters for filenames
     const cleanedTitle = title.replace(/[<>:"\/\\|?*]+/g, '_').trim();
     // Ensure it ends with .srt, handle cases where title might already have .srt
     return cleanedTitle.endsWith('.srt') ? cleanedTitle : `${cleanedTitle}.srt`;
}

// Function to fetch and parse SRT file with timestamps
async function fetchAndParseSrt(filePath) {
    try {
        // Avoid double encoding if path already looks encoded
        const encodedFilePath = filePath.includes('%') ? filePath : encodeURI(filePath);
        console.log(`Fetching SRT from path: ${encodedFilePath}`);

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
        let entryIdCounter = 1; // Use a counter for reliable ID

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
            // Ignore lines that are just numbers (potential old SRT index)
            if (/^\d+$/.test(line)) continue;

            if (line.includes('-->')) {
                // Found a time line, finalize previous entry if it exists and has text
                if (currentEntry && currentEntry.text.length > 0) {
                     currentEntry.text = currentEntry.text.join(' ');
                     entries.push(currentEntry);
                }
                // Start a new entry
                const times = line.split('-->');
                if (times.length === 2) {
                    currentEntry = {
                         id: entryIdCounter++, // Use counter for unique ID
                         start: timeToSeconds(times[0].trim()),
                         end: timeToSeconds(times[1].trim()),
                         text: []
                     };
                } else {
                     console.warn("Malformed time line:", line);
                     currentEntry = null; // Discard if time is malformed
                }
            } else if (line && currentEntry) {
                // Append text line to current entry
                currentEntry.text.push(line);
            }
        }
         // Add the very last entry if it exists and has text
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

        // Initialize progress tracking only if not in viewer mode
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
                 lastTrackedTime: null // Initialize last tracked time
             };
        } else {
            videoWatchStatus[playerState.videoId] = { watchedDuration: 0, isComplete: false, lastTrackedTime: null }; // Initialize for viewers, but don't save
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
    // Only track/save if not in viewer mode
    const progress = userCourseProgressMap.get(currentCourseIdInternal);
    const isViewer = progress?.enrollmentMode === 'viewer';

    if (event.data === YT.PlayerState.PLAYING) {
        console.log(`Video playing: ${videoId}`);
        if (playerState.intervalId === null) {
            if(playerState.intervalId) clearInterval(playerState.intervalId); // Clear any stale interval just in case
            playerState.intervalId = setInterval(() => {
                if (!isViewer) trackWatchTime(videoId, elementId); // Only track time if not viewer
                highlightTranscriptionLine();
            }, 1000);
        }
    } else {
        if (playerState.intervalId !== null) {
            clearInterval(playerState.intervalId);
            playerState.intervalId = null;
            console.log(`Watch time tracking stopped for ${videoId}`);
            if (!isViewer) saveVideoWatchProgress(videoId); // Save progress when paused/stopped only if not viewer
        }
        if (event.data == YT.PlayerState.ENDED) {
            console.log(`Video ended: ${videoId}`);
            // Check if watched enough, update status (even for viewer, just locally)
            if (videoWatchStatus[videoId] && playerState.totalDuration) {
                 const progressPercent = (videoWatchStatus[videoId].watchedDuration / playerState.totalDuration);
                 if (progressPercent >= VIDEO_WATCH_THRESHOLD_PERCENT) {
                      videoWatchStatus[videoId].isComplete = true;
                      console.log(`Video ${videoId} marked as complete internally (>= ${VIDEO_WATCH_THRESHOLD_PERCENT*100}% watched).`);
                 } else {
                      console.log(`Video ${videoId} ended but watch threshold (${VIDEO_WATCH_THRESHOLD_PERCENT*100}%) not met (${(progressPercent*100).toFixed(1)}%).`);
                 }
            }
            // Save final progress and check chapter completion only if not viewer
            if (!isViewer) {
                saveVideoWatchProgress(videoId).then(() => {
                    checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber);
                });
            }
        }
    }
}

async function trackWatchTime(videoId, elementId) { // Make async
    const playerState = ytPlayers[elementId];
    if (!playerState || !playerState.player || typeof playerState.player.getCurrentTime !== 'function') return;
    // Double check viewer mode before tracking
    const progress = userCourseProgressMap.get(currentCourseIdInternal);
    if (progress?.enrollmentMode === 'viewer') return;


    try {
         const currentTime = playerState.player.getCurrentTime();
         if (videoWatchStatus[videoId]) {
              // Increment only if time actually moved forward significantly
              if (videoWatchStatus[videoId].lastTrackedTime === null || currentTime > videoWatchStatus[videoId].lastTrackedTime + 0.5) {
                   const timeIncrement = (videoWatchStatus[videoId].lastTrackedTime === null) ? 1 : currentTime - videoWatchStatus[videoId].lastTrackedTime;
                   videoWatchStatus[videoId].watchedDuration = (videoWatchStatus[videoId].watchedDuration || 0) + timeIncrement;
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
     // DO NOT SAVE if viewer mode
     if (!progress || progress.enrollmentMode === 'viewer') return Promise.resolve();

     progress.watchedVideoDurations = progress.watchedVideoDurations || {};
     progress.watchedVideoDurations[currentChapterNumber] = progress.watchedVideoDurations[currentChapterNumber] || {};

     const newDuration = Math.round(videoWatchStatus[videoId].watchedDuration);
     // Clamp duration to video length if known
     const totalDuration = videoDurationMap[videoId]; // Use cached duration
     const clampedDuration = (typeof totalDuration === 'number' && totalDuration > 0) ? Math.min(newDuration, totalDuration) : newDuration;

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

// Function triggered after video ends and progress is saved
export async function handleVideoWatched(videoId) {
    console.log(`handleVideoWatched called for video ${videoId}.`);
    // Only check if not in viewer mode
    const progress = userCourseProgressMap.get(currentCourseIdInternal);
    if (progress?.enrollmentMode !== 'viewer') {
        await checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber);
    }
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
    // Return 0 if viewer mode
    if (progress?.enrollmentMode === 'viewer') {
         return { percent: 0, watchedStr: "N/A", totalStr: "N/A" };
     }

    const watchedVideoDurations = progress.watchedVideoDurations?.[chapterNum] || {};
    // Use pdfProgress data directly from the user's state
    const chapterPdfProgress = progress.pdfProgress?.[chapterNum];

    let totalVideoSeconds = 0;
    let watchedVideoSeconds = 0;
    let hasVideo = false;
    if (chapterVideoDurationMap && Object.keys(chapterVideoDurationMap).length > 0) {
        hasVideo = true;
        Object.entries(chapterVideoDurationMap).forEach(([videoId, duration]) => {
            if (typeof duration === 'number' && duration > 0) {
                totalVideoSeconds += duration;
                // Clamp watched time PER VIDEO before summing
                watchedVideoSeconds += Math.min(watchedVideoDurations[videoId] || 0, duration);
            }
        });
        // No need to clamp the sum again if clamped individually
    }

    let totalPdfEquivalentSeconds = 0;
    let completedPdfEquivalentSeconds = 0;
    let hasPdf = false;
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

    // Do not mark studied if viewer mode
    if (progress.enrollmentMode === 'viewer') return;

    // Skip if already studied via this method
    if (progress.courseStudiedChapters?.includes(chapterNum)) {
         console.log(`Chapter ${chapterNum} already marked studied. Skipping check.`);
         return;
    }

    // Check if Skip Exam passed for this chapter
    const skipScore = progress.lastSkipExamScore?.[chapterNum];
    if (skipScore !== undefined && skipScore !== null && skipScore >= SKIP_EXAM_PASSING_PERCENT) {
         await markChapterStudiedInCourse(currentUser.uid, courseId, chapterNum, "skip_exam_pass");
         console.log(`Chapter ${chapterNum} marked as studied due to passing skip exam.`);
         // Update UI element immediately if possible
         const studyButton = document.querySelector(`#chapter-progress-${chapterNum} button[onclick*="showCourseStudyMaterial"]`);
         const skipButton = document.querySelector(`#chapter-progress-${chapterNum} button[onclick*="triggerSkipExamGeneration"]`);
         const progressBarContainer = document.getElementById(`chapter-progress-${chapterNum}`);
         if(progressBarContainer) { progressBarContainer.closest('.content-card')?.classList.add('bg-green-50', 'dark:bg-green-900/30'); }
         if(studyButton) studyButton.textContent = 'Review Chapter';
         if(skipButton) skipButton.outerHTML = `<span class="text-xs text-green-600 dark:text-green-400 font-medium ml-auto">(Skip Exam Passed: ${skipScore.toFixed(0)}%)</span>`;
         return; // Stop checking if skip exam passed
    }


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
        await markChapterStudiedInCourse(currentUser.uid, courseId, chapterNum, "progress_complete");
        console.log(`Chapter ${chapterNum} marked as studied due to reaching 100% combined progress.`);
        // Optionally update the progress bar visually immediately
        const progressBarContainer = document.getElementById(`chapter-progress-${chapterNum}`);
        if (progressBarContainer) {
            const progressBar = progressBarContainer.querySelector('.bg-blue-500');
            const progressText = progressBarContainer.querySelector('.progress-tooltip-text');
            if (progressBar) progressBar.style.width = '100%';
            if (progressText) progressText.textContent = 'Completed: 100%';
             // Also update the card background and skip button if applicable
             progressBarContainer.closest('.content-card')?.classList.add('bg-green-50', 'dark:bg-green-900/30');
             const skipButton = document.querySelector(`#chapter-progress-${chapterNum} button[onclick*="triggerSkipExamGeneration"]`);
             if(skipButton) skipButton.outerHTML = `<span class="text-xs text-green-600 dark:text-green-400 font-medium ml-auto">(Progress Complete)</span>`;
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
window.handleTranscriptionClick = handleTranscriptionClick; // Assign to window

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
    // videoDurationMap = {}; // DO NOT Clear duration cache on cleanup - keep it for next time
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

            // Initialize PDF progress in state only if not viewer mode
            const progress = userCourseProgressMap.get(currentCourseIdInternal);
            const isViewer = progress?.enrollmentMode === 'viewer';
            let initialPageNum = 1;
            if (progress && !isViewer) {
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
            } else {
                 pdfPageNum = 1; // Start at page 1 for viewers or if no progress
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

            // Update progress even on initial load if it wasn't already current (and not viewer)
            if (progress && !isViewer && progress.pdfProgress[currentChapterNumber].currentPage !== pdfPageNum) {
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

// MODIFIED: Update progress on page change only if not viewer
function onPrevPage() {
    if (pdfPageNum <= 1) return;
    pdfPageNum--;
    const progress = userCourseProgressMap.get(currentCourseIdInternal);
    if (progress?.enrollmentMode !== 'viewer') {
        updatePdfProgressAndCheckCompletion(pdfPageNum); // Update progress if not viewer
    }
    queueRenderPage(pdfPageNum);
}
function onNextPage() {
    if (!pdfDoc || pdfPageNum >= pdfDoc.numPages) return;
    pdfPageNum++;
     const progress = userCourseProgressMap.get(currentCourseIdInternal);
     if (progress?.enrollmentMode !== 'viewer') {
        updatePdfProgressAndCheckCompletion(pdfPageNum); // Update progress if not viewer
    }
    queueRenderPage(pdfPageNum);
}

// NEW: Helper to update PDF progress state and check completion
async function updatePdfProgressAndCheckCompletion(newPageNum) {
     if (!currentUser || !currentCourseIdInternal || !currentChapterNumber) return;
     const progress = userCourseProgressMap.get(currentCourseIdInternal);
     // Do nothing if viewer mode
     if (!progress || progress.enrollmentMode === 'viewer') return;

     progress.pdfProgress = progress.pdfProgress || {};
     progress.pdfProgress[currentChapterNumber] = progress.pdfProgress[currentChapterNumber] || { currentPage: 0, totalPages: pdfTotalPages || 0 };

     // Only update if the page number is higher than the current stored page
     const currentStoredPage = progress.pdfProgress[currentChapterNumber].currentPage || 0;
     if (newPageNum > currentStoredPage) {
         progress.pdfProgress[currentChapterNumber].currentPage = newPageNum;
         // Ensure total pages is set correctly
         if (progress.pdfProgress[currentChapterNumber].totalPages !== pdfTotalPages && pdfTotalPages > 0) {
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

     // Clear previous history when asking about a new snapshot
     currentPdfExplanationHistory = [];

     explanationContent.innerHTML = `<div class="flex items-center justify-center space-x-2"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-sm">Generating explanation...</p></div>`;
     explanationArea.classList.remove('hidden');
     try {
          const imageDataUrl = pdfCanvas.toDataURL('image/jpeg', 0.85);
          const base64ImageData = imageDataUrl.split(',')[1];
          if (!base64ImageData) throw new Error("Failed to capture image data.");
          const context = `PDF page ${pdfPageNum} for Chapter ${currentChapterNumber}.`;

          // Call AI explanation function (assume it doesn't use history for snapshot yet)
          // TODO: Modify getExplanationForPdfSnapshot to handle history like generateExplanation if follow-up is needed here too
          const explanationHtml = await getExplanationForPdfSnapshot(userQuestion, base64ImageData, context);

          explanationContent.innerHTML = explanationHtml; // Initial explanation
          await renderMathIn(explanationContent);

          // Add follow-up input if desired for snapshot explanations
           const followUpInputHtml = `
               <div class="flex gap-2 mt-2 pt-2 border-t dark:border-gray-600">
                   <input type="text" id="pdf-follow-up-input" class="flex-grow text-sm" placeholder="Ask a follow-up question...">
                   <button onclick="window.askPdfFollowUp()" class="btn-secondary-small text-xs flex-shrink-0">Ask</button>
               </div>`;
           explanationArea.insertAdjacentHTML('beforeend', followUpInputHtml);

          hideLoading();
     } catch(error) {
          hideLoading();
          console.error("Error getting PDF snapshot explanation:", error);
          explanationContent.innerHTML = `<p class="text-danger text-sm">Error generating explanation: ${error.message}</p>`;
     }
}
// MODIFIED: Renamed original function to Internal
async function handleExplainSelectionInternal(selectedText, context, source) { // source: 'transcription' or 'pdf'
    const explanationArea = document.getElementById('ai-explanation-area');
    const explanationContent = document.getElementById('ai-explanation-content');
    if (!explanationArea || !explanationContent) return;

    // Reset history based on source
    if(source === 'transcription') currentTranscriptionExplanationHistory = [];
    // else if (source === 'pdf') // PDF text selection not implemented yet

    explanationContent.innerHTML = `<div class="flex items-center justify-center space-x-2"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-sm">Generating explanation...</p></div>`;
    explanationArea.classList.remove('hidden');

    try {
        // Initial call, empty history
        const result = await explainStudyMaterialSnippet(selectedText, context, []);
        explanationContent.innerHTML = `<div class="ai-chat-turn">${result.explanationHtml}</div>`; // Wrap initial response
        await renderMathIn(explanationContent);

        // Store history for this source
         if(source === 'transcription') currentTranscriptionExplanationHistory = result.history;

        // Add follow-up input
        const followUpInputHtml = `
            <div class="flex gap-2 mt-2 pt-2 border-t dark:border-gray-600">
                 <input type="text" id="text-follow-up-input" class="flex-grow text-sm" placeholder="Ask a follow-up question...">
                 <button onclick="window.askTextFollowUp('${source}')" class="btn-secondary-small text-xs flex-shrink-0">Ask</button>
            </div>`;
        explanationArea.insertAdjacentHTML('beforeend', followUpInputHtml);


    } catch (error) {
        console.error("Error getting explanation:", error);
        explanationContent.innerHTML = `<p class="text-danger text-sm">Error: ${error.message}</p>`;
    }
}
// MODIFIED: Wrapper function
export function handleExplainSelection(sourceType) {
    if (sourceType !== 'transcription') {
        // Currently only supporting transcription selection
        alert("Text selection explanation is only available for transcriptions currently.");
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
    handleExplainSelectionInternal(selectedText, `Context: ${context}\nFull Transcription Text (for context): ${fullTranscriptionText.substring(0, 5000)}...`, 'transcription');
}
// MODIFIED: Wrapper function
export function askQuestionAboutTranscription() {
     if (!currentTranscriptionData || currentTranscriptionData.length === 0 || !currentChapterNumber) { alert("Cannot ask question: Transcription context missing."); return; }
     const userQuestion = prompt(`Ask a question about the transcription for Chapter ${currentChapterNumber}:`);
     if (!userQuestion || userQuestion.trim() === "") return;
     const fullTranscriptionText = currentTranscriptionData.map(e => e.text).join(' ');
     handleExplainSelectionInternal(userQuestion, `Context: Chapter ${currentChapterNumber} Transcription.\nFull Text (for context): ${fullTranscriptionText.substring(0, 8000)}...`, 'transcription');
}
// NEW: Follow-up function for text explanations
window.askTextFollowUp = async (source) => {
    const inputElement = document.getElementById('text-follow-up-input');
    const explanationArea = document.getElementById('ai-explanation-area');
    const explanationContent = explanationArea?.querySelector('#ai-explanation-content'); // Target specific content area
    let history = (source === 'transcription') ? currentTranscriptionExplanationHistory : []; // Add logic for PDF later if needed

    if (!inputElement || !explanationContent || !history) return;

    const followUpText = inputElement.value.trim();
    if (!followUpText) return;

    inputElement.disabled = true;
    const askButton = inputElement.nextElementSibling;
    if (askButton) askButton.disabled = true;

    // Append user follow-up
    explanationContent.insertAdjacentHTML('beforeend', `<div class="ai-chat-turn mt-3 pt-3 border-t border-purple-200 dark:border-purple-600"><p class="text-sm font-medium text-gray-700 dark:text-gray-300">You:</p><div class="prose prose-sm dark:prose-invert max-w-none">${escapeHtml(followUpText)}</div></div>`);

    // Append loading indicator
    const loadingHtml = `<div class="ai-chat-turn ai-loading mt-3 pt-3 border-t border-purple-200 dark:border-purple-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p><div class="flex items-center space-x-2 mt-1"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-xs text-muted">Thinking...</p></div></div>`;
    explanationContent.insertAdjacentHTML('beforeend', loadingHtml);
    explanationArea.scrollTop = explanationArea.scrollHeight; // Scroll main container

    try {
        // Call API using history
        const result = await explainStudyMaterialSnippet(followUpText, null, history); // Pass follow-up as snippet, null context, use history

        // Update history
        if(source === 'transcription') currentTranscriptionExplanationHistory = result.history;

        explanationContent.querySelector('.ai-loading')?.remove(); // Remove loader
        explanationContent.insertAdjacentHTML('beforeend', `<div class="ai-chat-turn mt-3 pt-3 border-t border-purple-200 dark:border-purple-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p>${result.explanationHtml}</div>`);
        inputElement.value = '';
        await renderMathIn(explanationContent);
        explanationArea.scrollTop = explanationArea.scrollHeight; // Scroll main container

    } catch (error) {
        console.error("Error asking follow-up:", error);
        explanationContent.querySelector('.ai-loading')?.remove();
        explanationContent.insertAdjacentHTML('beforeend', `<p class="text-danger text-sm mt-2">Error getting follow-up: ${error.message}</p>`);
    } finally {
        inputElement.disabled = false;
        if (askButton) askButton.disabled = false;
    }
};
// NEW: Follow-up function for PDF Snapshot explanations
window.askPdfFollowUp = async () => {
     const inputElement = document.getElementById('pdf-follow-up-input');
     const explanationArea = document.getElementById('ai-explanation-area');
     const explanationContent = explanationArea?.querySelector('#ai-explanation-content'); // Target specific content area
     let history = currentPdfExplanationHistory; // Use PDF specific history

     if (!inputElement || !explanationContent || !history) return;

     const followUpText = inputElement.value.trim();
     if (!followUpText) return;

     inputElement.disabled = true;
     const askButton = inputElement.nextElementSibling;
     if (askButton) askButton.disabled = true;

     explanationContent.insertAdjacentHTML('beforeend', `<div class="ai-chat-turn mt-3 pt-3 border-t border-purple-200 dark:border-purple-600"><p class="text-sm font-medium text-gray-700 dark:text-gray-300">You:</p><div class="prose prose-sm dark:prose-invert max-w-none">${escapeHtml(followUpText)}</div></div>`);
     const loadingHtml = `<div class="ai-chat-turn ai-loading mt-3 pt-3 border-t border-purple-200 dark:border-purple-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p><div class="flex items-center space-x-2 mt-1"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-xs text-muted">Thinking...</p></div></div>`;
     explanationContent.insertAdjacentHTML('beforeend', loadingHtml);
     explanationArea.scrollTop = explanationArea.scrollHeight;

     try {
          // Re-call the snapshot explanation function, passing history
          // NOTE: getExplanationForPdfSnapshot needs modification to accept/use history
          // For now, let's simulate by just sending the follow-up text as a new query.
          // This won't have memory of the image, which is a limitation.
          // A true implementation requires modifying getExplanationForPdfSnapshot AND the Vision API call structure.
          console.warn("PDF Follow-up Limitation: AI currently lacks memory of the previous image snapshot in follow-up questions.");
          const result = await explainStudyMaterialSnippet(followUpText, "Follow-up question regarding previous PDF page image.", history); // Simulate

          currentPdfExplanationHistory = result.history; // Update history

          explanationContent.querySelector('.ai-loading')?.remove();
          explanationContent.insertAdjacentHTML('beforeend', `<div class="ai-chat-turn mt-3 pt-3 border-t border-purple-200 dark:border-purple-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p>${result.explanationHtml}</div>`);
          inputElement.value = '';
          await renderMathIn(explanationContent);
          explanationArea.scrollTop = explanationArea.scrollHeight;

     } catch (error) {
          console.error("Error asking PDF follow-up:", error);
          explanationContent.querySelector('.ai-loading')?.remove();
          explanationContent.insertAdjacentHTML('beforeend', `<p class="text-danger text-sm mt-2">Error getting follow-up: ${error.message}</p>`);
     } finally {
          inputElement.disabled = false;
          if (askButton) askButton.disabled = false;
     }
};


// MODIFIED: Use USER specific load/save
export async function displayFormulaSheet(courseId, chapterNum, forceRegenerate = false) {
    if (!currentUser) {
        console.error("Cannot display formula sheet: User not logged in");
        return;
    }
    if (!courseId || !chapterNum) {
        console.error("Missing courseId or chapterNum for formula sheet");
        return;
    }

    // MODIFICATION: Moved DOM element getters inside the function
    const formulaArea = document.getElementById('formula-sheet-area');
    const formulaContent = document.getElementById('formula-sheet-content');
    const downloadBtn = document.getElementById('download-formula-pdf-btn');

    if (!formulaArea || !formulaContent || !downloadBtn) {
        console.error("Missing UI elements for formula sheet display (formula-sheet-area, formula-sheet-content, download-formula-pdf-btn)");
        // Optionally show an error message in a different way if these core elements are missing
        // e.g., find the main content area and display error there.
        // For now, logging is the primary action.
        return;
    }

    formulaArea.classList.remove('hidden');
    downloadBtn.classList.add('hidden');
    formulaContent.innerHTML = `<div class="flex items-center justify-center p-4"><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div><p class="ml-3 text-sm text-muted">Loading Formula Sheet...</p></div>`;

    // --- Check USER cache ---
    let cachedSheet = null;
    if (!forceRegenerate) {
        try {
            console.log(`Attempting to load cached formula sheet for course ${courseId}, chapter ${chapterNum}`);
            cachedSheet = await loadUserFormulaSheet(currentUser.uid, courseId, chapterNum);
        } catch (error) {
            console.error("Error loading cached user formula sheet:", error);
        }
    } else {
        console.log("Force regenerate flag set, skipping cache check");
    }

    if (cachedSheet) {
        console.log("Using cached user formula sheet from Firestore");
        formulaContent.innerHTML = cachedSheet;
        await renderMathIn(formulaContent);
        downloadBtn.classList.remove('hidden');
        return;
    }

    // --- Generate if not cached or forced ---
    console.log(`Generating new formula sheet for course ${courseId}, chapter ${chapterNum}`);
    try {
        const sheetHtml = await generateFormulaSheet(courseId, chapterNum);
        formulaContent.innerHTML = sheetHtml;
        await renderMathIn(formulaContent);

        // Only save and enable download if generation was successful
        if (!sheetHtml.includes('Error generating') &&
            !sheetHtml.includes('No text content available') &&
            !sheetHtml.includes('bigger than the model')) {
            downloadBtn.classList.remove('hidden');
            try {
                await saveUserFormulaSheet(currentUser.uid, courseId, chapterNum, sheetHtml);
                console.log("Successfully saved generated formula sheet to user document");
            } catch (saveError) {
                console.error("Failed to save generated formula sheet:", saveError);
            }
        } else {
            console.warn("AI generation indicated an issue, not caching or enabling download");
            downloadBtn.classList.add('hidden');
        }
    } catch (error) {
        console.error("Error displaying formula sheet:", error);
        formulaContent.innerHTML = `
            <div class="p-4 text-center">
                <p class="text-danger mb-2">Error generating formula sheet: ${error.message || 'Unknown error'}</p>
                <button onclick="window.displayFormulaSheet('${courseId}', ${chapterNum}, true)"
                        class="btn-secondary-small">
                    Retry Generation
                </button>
            </div>
        `;
        downloadBtn.classList.add('hidden');
    }
}
window.displayFormulaSheet = displayFormulaSheet; // Assign to window

export async function downloadFormulaSheetPdf() {
    const formulaContentElement = document.getElementById('formula-sheet-content');
    if (!formulaContentElement || !currentChapterNumber || !currentCourseIdInternal) { alert("Cannot download: Formula sheet content or context missing."); return; }
    const courseName = globalCourseDataMap.get(currentCourseIdInternal)?.name || 'Course';
    const filename = `Formula_Sheet_${courseName.replace(/\s+/g, '_')}_Ch${currentChapterNumber}`;
    showLoading(`Generating ${filename}.pdf...`);
    try {
        // Get HTML from the content area (which should be populated from cache or generation)
        let sheetHtml = formulaContentElement.innerHTML;
        if (!sheetHtml || sheetHtml.includes('Error generating') || sheetHtml.includes('No text content available') || sheetHtml.includes('Loading Formula Sheet...')) {
            throw new Error("Valid formula sheet content not available for download.");
        }
        // Wrap in printable HTML
        const printHtml = ` <!DOCTYPE html><html><head><title>${filename}</title> <style> body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; } .prose { max-width: none; } mjx-container {display: inline-block !important; margin: 0.1em 0 !important; } mjx-container > svg { vertical-align: -0.15ex !important; } </style> </head><body> <h2 style="text-align: center;">Formula Sheet - Chapter ${currentChapterNumber}</h2> ${sheetHtml} </body></html>`;
        await generateAndDownloadPdfWithMathJax(printHtml, filename);
    } catch (error) {
        console.error("Error generating formula sheet PDF:", error);
        alert(`Failed to generate PDF for formula sheet: ${error.message}`);
    } finally {
        hideLoading();
    }
}
window.downloadFormulaSheetPdf = downloadFormulaSheetPdf; // Assign to window

// MODIFIED: Use USER specific load/save
export async function displayChapterSummary(courseId, chapterNum, forceRegenerate = false) {
    if (!currentUser) {
        console.error("Cannot display chapter summary: User not logged in");
        return;
    }
    if (!courseId || !chapterNum) {
        console.error("Missing courseId or chapterNum for chapter summary");
        return;
    }

    // MODIFICATION: Moved DOM element getters inside the function
    const summaryArea = document.getElementById('chapter-summary-area');
    const summaryContent = document.getElementById('chapter-summary-content');
    const downloadBtn = document.getElementById('download-summary-pdf-btn');

    if (!summaryArea || !summaryContent || !downloadBtn) {
        console.error("Missing UI elements for chapter summary display (chapter-summary-area, chapter-summary-content, download-summary-pdf-btn)");
        return;
    }

    summaryArea.classList.remove('hidden');
    downloadBtn.classList.add('hidden');
    summaryContent.innerHTML = `<div class="flex items-center justify-center p-4"><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div><p class="ml-3 text-sm text-muted">Loading Chapter Summary...</p></div>`;

    // --- Check USER cache ---
    let cachedSummary = null;
    if (!forceRegenerate) {
        try {
            console.log(`Attempting to load cached chapter summary for course ${courseId}, chapter ${chapterNum}`);
            cachedSummary = await loadUserChapterSummary(currentUser.uid, courseId, chapterNum);
        } catch (error) {
            console.error("Error loading cached user chapter summary:", error);
        }
    } else {
        console.log("Force regenerate flag set, skipping cache check");
    }

    if (cachedSummary) {
        console.log("Using cached user chapter summary from Firestore");
        summaryContent.innerHTML = cachedSummary;
        await renderMathIn(summaryContent);
        downloadBtn.classList.remove('hidden');
        return;
    }

    // --- Generate if not cached or forced ---
    console.log(`Generating new chapter summary for course ${courseId}, chapter ${chapterNum}`);
    try {
        const summaryHtml = await generateChapterSummary(courseId, chapterNum);
        summaryContent.innerHTML = summaryHtml;
        await renderMathIn(summaryContent);

        // Only save and enable download if generation was successful
        if (!summaryHtml.includes('Error generating') &&
            !summaryHtml.includes('No text content available') &&
            !summaryHtml.includes('bigger than the model')) {
            downloadBtn.classList.remove('hidden');
            try {
                await saveUserChapterSummary(currentUser.uid, courseId, chapterNum, summaryHtml);
                console.log("Successfully saved generated chapter summary to user document");
            } catch (saveError) {
                console.error("Failed to save generated chapter summary:", saveError);
            }
        } else {
            console.warn("AI generation indicated an issue, not caching or enabling download");
            downloadBtn.classList.add('hidden');
        }
    } catch (error) {
        console.error("Error displaying chapter summary:", error);
        summaryContent.innerHTML = `
            <div class="p-4 text-center">
                <p class="text-danger mb-2">Error generating summary: ${error.message || 'Unknown error'}</p>
                <button onclick="window.displayChapterSummary('${courseId}', ${chapterNum}, true)"
                        class="btn-secondary-small">
                    Retry Generation
                </button>
            </div>
        `;
        downloadBtn.classList.add('hidden');
    }
}
window.displayChapterSummary = displayChapterSummary; // Assign to window


export async function downloadChapterSummaryPdf() {
    const summaryContentElement = document.getElementById('chapter-summary-content');
    if (!summaryContentElement || !currentChapterNumber || !currentCourseIdInternal) { alert("Cannot download: Summary content or context missing."); return; }
    const courseName = globalCourseDataMap.get(currentCourseIdInternal)?.name || 'Course';
    const filename = `Chapter_Summary_${courseName.replace(/\s+/g, '_')}_Ch${currentChapterNumber}`;
    showLoading(`Generating ${filename}.pdf...`);
    try {
        // Get HTML from the content area
        let summaryHtml = summaryContentElement.innerHTML;
         if (!summaryHtml || summaryHtml.includes('Error generating') || summaryHtml.includes('No text content available') || summaryHtml.includes('Loading Chapter Summary...')) {
            throw new Error("Valid summary content not available for download.");
        }
        // Wrap in printable HTML
        const printHtml = ` <!DOCTYPE html><html><head><title>${filename}</title> <style> body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; } .prose { max-width: none; } mjx-container {display: inline-block !important; margin: 0.1em 0 !important; } mjx-container > svg { vertical-align: -0.15ex !important; } </style> </head><body> <h2 style="text-align: center;">Chapter Summary - Chapter ${currentChapterNumber}</h2> ${summaryHtml} </body></html>`;
        await generateAndDownloadPdfWithMathJax(printHtml, filename);
    } catch (error) {
        console.error("Error generating summary PDF:", error);
        alert(`Failed to generate PDF for summary: ${error.message}`);
    } finally {
        hideLoading();
    }
}
window.downloadChapterSummaryPdf = downloadChapterSummaryPdf; // Assign to window

export function navigateChapterMaterial(courseId, chapterNum) {
     const courseDef = globalCourseDataMap.get(courseId); if (!courseDef || chapterNum < 1 || chapterNum > courseDef.totalChapters) { console.warn(`Navigation blocked: Invalid chapter ${chapterNum}`); return; } showCourseStudyMaterial(courseId, chapterNum);
}

// --- NEW: Switch Video Function ---
async function switchVideo(newIndex) {
    if (!currentCourseIdInternal || !currentChapterNumber || !chapterLectureVideos) return;
    if (newIndex >= 0 && newIndex < chapterLectureVideos.length) {
        // Save progress for the *current* video before switching (only if not viewer)
        const progress = userCourseProgressMap.get(currentCourseIdInternal);
        if (progress?.enrollmentMode !== 'viewer') {
            const currentPlayerElementId = `ytplayer-${currentChapterNumber}-${currentVideoIndex}`;
            const currentPlayerState = ytPlayers[currentPlayerElementId];
            if (currentPlayerState && currentPlayerState.player) {
                await saveVideoWatchProgress(currentPlayerState.videoId); // Await saving
            }
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

// --- NEW: Ask AI about the entire PDF ---
async function askAboutFullPdf() {
     if (!pdfDoc || !currentCourseIdInternal || !currentChapterNumber) {
         alert("PDF document or course context is not available.");
         return;
     }
     const userQuestion = prompt(`Ask a question about the entire Chapter ${currentChapterNumber} PDF document:`);
     if (!userQuestion || userQuestion.trim() === "") return;

     const explanationArea = document.getElementById('ai-explanation-area');
     const explanationContent = document.getElementById('ai-explanation-content');
     if (!explanationArea || !explanationContent) return;

     // Clear previous history for PDF questions
     currentPdfExplanationHistory = [];

     explanationContent.innerHTML = `<div class="flex items-center justify-center space-x-2"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-sm">Analyzing full PDF and generating explanation...</p></div>`;
     explanationArea.classList.remove('hidden');

     try {
          const courseDef = globalCourseDataMap.get(currentCourseIdInternal);
          const chapterResources = courseDef?.chapterResources?.[currentChapterNumber] || {};
          const pdfPath = chapterResources.pdfPath || courseDef?.pdfPathPattern?.replace('{num}', currentChapterNumber);
          if (!pdfPath) throw new Error("PDF path not found for this chapter.");

          // Use the imported function from ai_integration.js
          const explanationResult = await askAboutPdfDocument(userQuestion, pdfPath, currentCourseIdInternal, currentChapterNumber); // Assuming askAboutPdfDocument now returns { explanationHtml, history }

          currentPdfExplanationHistory = explanationResult.history; // Store history
          explanationContent.innerHTML = `<div class="ai-chat-turn">${explanationResult.explanationHtml}</div>`; // Wrap initial response
          await renderMathIn(explanationContent);

          // Add follow-up input
           const followUpInputHtml = `
               <div class="flex gap-2 mt-2 pt-2 border-t dark:border-gray-600">
                   <input type="text" id="pdf-follow-up-input" class="flex-grow text-sm" placeholder="Ask a follow-up question...">
                   <button onclick="window.askPdfFollowUp()" class="btn-secondary-small text-xs flex-shrink-0">Ask</button>
               </div>`;
           explanationArea.insertAdjacentHTML('beforeend', followUpInputHtml);


     } catch (error) {
          console.error("Error asking about PDF document:", error);
          explanationContent.innerHTML = `<p class="text-danger text-sm">Error processing request: ${error.message}. PDF might be unscannable or too large.</p>`;
     }
}
window.askAboutFullPdf = askAboutFullPdf;

// --- Main UI Function ---
/**
 * Displays the study material (videos, PDF, transcription) for a specific chapter.
 * @param {string} courseId - The ID of the course.
 * @param {number} chapterNum - The chapter number to display.
 * @param {number} [initialVideoIndex=0] - The index of the video to show initially.
 */
// *** ADDED EXPORT KEYWORD ***
export async function showCourseStudyMaterial(courseId, chapterNum, initialVideoIndex = 0) {
     cleanupPdfViewer(); // Clean up previous PDF instance
     window.cleanupYouTubePlayers(); // Clean up previous players
     currentCourseIdInternal = courseId; currentChapterNumber = chapterNum;
     // Update the context for the notes panel
     setLastViewedChapterForNotes(chapterNum);
     setActiveSidebarLink('sidebar-study-material-link', 'sidebar-course-nav');
     displayContent(`<div id="study-material-content-area" class="animate-fade-in"><div class="text-center p-8"><div class="loader animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-4 text-sm text-muted">Loading Chapter ${chapterNum} materials...</p></div></div>`, 'course-dashboard-area');
     const contentArea = document.getElementById('study-material-content-area');
     const courseDef = globalCourseDataMap.get(courseId);
     if (!courseDef) { contentArea.innerHTML = '<p class="text-red-500 p-4">Error: Course definition not found.</p>'; return; }
     const chapterTitle = courseDef.chapters?.[chapterNum - 1] || `Chapter ${chapterNum}`;
     const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
     chapterLectureVideos = (Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : []).filter(lec => typeof lec === 'object' && lec.url && lec.title);
     const pdfPath = chapterResources.pdfPath || courseDef.pdfPathPattern?.replace('{num}', chapterNum);
     const currentVideo = chapterLectureVideos[initialVideoIndex];
     const videoId = currentVideo ? getYouTubeVideoId(currentVideo.url) : null;
     const totalVideos = chapterLectureVideos.length;
     currentVideoIndex = initialVideoIndex;
     currentTranscriptionData = []; // Reset transcription
     const srtFilename = currentVideo ? getSrtFilenameFromTitle(currentVideo.title) : null;
     const srtPath = srtFilename ? `${COURSE_TRANSCRIPTION_BASE_PATH}${srtFilename}` : null;
     const videoIdsForChapter = chapterLectureVideos.map(lec => getYouTubeVideoId(lec.url)).filter(id => id !== null);
     const progress = userCourseProgressMap.get(courseId);
     const isViewer = progress?.enrollmentMode === 'viewer';

     // --- Fetch necessary data ---
     if (srtPath) {
        // *** MODIFIED: Use fetchAndParseSrt instead of fetchSrtText ***
        currentTranscriptionData = await fetchAndParseSrt(srtPath);
     }
     await fetchVideoDurationsIfNeeded(videoIdsForChapter);
     // --- End Fetching ---

     let videoNavHtml = '';
     if (totalVideos > 1) {
          videoNavHtml = `<div class="flex justify-between items-center mt-2 mb-1 text-sm">`;
          if (initialVideoIndex > 0) videoNavHtml += `<button onclick="window.switchVideo(${initialVideoIndex - 1})" class="btn-secondary-small text-xs">← Previous Video</button>`;
          else videoNavHtml += `<span></span>`; // Placeholder for spacing
          videoNavHtml += `<span class="text-muted font-medium">${initialVideoIndex + 1} / ${totalVideos}</span>`;
          if (initialVideoIndex < totalVideos - 1) videoNavHtml += `<button onclick="window.switchVideo(${initialVideoIndex + 1})" class="btn-secondary-small text-xs">Next Video →</button>`;
          else videoNavHtml += `<span></span>`; // Placeholder for spacing
          videoNavHtml += `</div>`;
     }
     const videoContainerId = `ytplayer-${chapterNum}-${initialVideoIndex}`;
     const videoHtml = currentVideo ? `
        <div class="mb-4">
             <h4 class="text-md font-semibold mb-2 text-gray-800 dark:text-gray-300">${initialVideoIndex+1}. ${escapeHtml(currentVideo.title)}</h4>
            ${videoNavHtml}
             <div id="${videoContainerId}" class="aspect-video bg-black rounded-lg overflow-hidden">
                <!-- YouTube player will be embedded here -->
                 <div class="flex items-center justify-center h-full"><p class="text-gray-400">Loading video...</p></div>
             </div>
        </div>` : '<p class="text-muted text-center">No primary video available for this chapter part.</p>';
     const transcriptionHtml = srtPath ? `
        <div class="mt-4 border-t pt-3 dark:border-gray-700">
             <h4 class="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Transcription</h4>
             <div id="transcription-content" class="text-xs leading-relaxed max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 p-2 rounded border dark:border-gray-600 scroll-smooth">
                 <!-- Transcription lines will be rendered here by JS -->
             </div>
              <button id="transcription-toggle-btn" onclick="window.toggleTranscriptionView()" class="btn-secondary-small text-xs mt-1">Expand Transcription</button>
         </div>` : '';
     const pdfHtml = pdfPath ? `
        <div class="mb-4 border-t pt-4 dark:border-gray-700">
            <h4 class="text-md font-semibold mb-2 text-gray-800 dark:text-gray-300">Chapter PDF</h4>
            <div id="pdf-controls" class="mb-2 hidden items-center gap-3 justify-center">
                 <button id="pdf-prev" class="btn-secondary-small text-xs">Prev</button>
                 <span class="text-xs">Page <span id="pdf-page-num">1</span> / <span id="pdf-page-count">?</span></span>
                 <button id="pdf-next" class="btn-secondary-small text-xs">Next</button>
                 <button id="pdf-explain-button" onclick="window.handlePdfSnapshotForAI()" class="btn-secondary-small text-xs ml-auto" disabled title="Ask AI about the current page view">Ask AI (Page)</button>
                 <button onclick="window.askAboutFullPdf()" class="btn-secondary-small text-xs" title="Ask AI about the entire PDF document">Ask AI (Doc)</button>
            </div>
            <div id="pdf-viewer-container" class="h-[70vh] relative overflow-auto border dark:border-gray-600 rounded bg-gray-200 dark:bg-gray-700">
                <!-- PDF will be rendered here -->
                <p class="text-center p-4 text-muted">Loading PDF...</p>
            </div>
        </div>` : '<p class="text-muted text-center">No PDF available for this chapter.</p>';
     const aiExplanationHtml = `
         <div id="ai-explanation-area" class="fixed bottom-4 right-4 w-80 max-h-[60vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-600 hidden flex flex-col z-50 animate-fade-in">
             <div class="flex justify-between items-center p-2 border-b dark:border-gray-600 flex-shrink-0">
                 <h5 class="text-sm font-semibold text-purple-700 dark:text-purple-300">AI Tutor</h5>
                 <button onclick="this.closest('#ai-explanation-area').classList.add('hidden'); this.closest('#ai-explanation-area').innerHTML = '';" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">×</button>
             </div>
             <div id="ai-explanation-content" class="p-3 overflow-y-auto text-sm flex-grow">
                 <!-- AI content loads here -->
             </div>
             <!-- Follow-up input will be added dynamically -->
         </div>`;
     const skipExamThreshold = courseDef.skipExamPassingPercent || SKIP_EXAM_PASSING_PERCENT;
     const skipExamButtonHtml = !isViewer ? `<button id="skip-exam-btn" onclick="window.triggerSkipExamGeneration('${courseId}', ${chapterNum})" class="btn-warning-small text-xs" title="Attempt to skip this chapter (Requires ${skipExamThreshold}%)">Take Skip Exam</button>` : '';
     contentArea.innerHTML = `
        <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
             <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200">Chapter ${chapterNum}: ${escapeHtml(chapterTitle)}</h2>
             <div class="flex gap-2">
                ${skipExamButtonHtml}
                 <button onclick="window.showCurrentCourseDashboard('${courseId}')" class="btn-secondary-small text-xs">Back to Dashboard</button>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <!-- Left Column: Video & Transcription -->
             <div> ${videoHtml} ${transcriptionHtml} </div>
             <!-- Right Column: PDF & Quick Actions -->
             <div> ${pdfHtml}
                  <div class="mt-4 border-t pt-4 dark:border-gray-700">
                      <h4 class="text-md font-medium mb-2">Chapter Tools</h4>
                      <div class="flex flex-wrap gap-2">
                           <!-- MODIFICATION: Added window. prefix -->
                           <button onclick="window.displayFormulaSheet('${courseId}', ${chapterNum})" class="btn-secondary-small text-xs" title="View Formula Sheet (AI)">Formulas</button>
                           <!-- MODIFICATION: Added window. prefix -->
                           <button onclick="window.displayChapterSummary('${courseId}', ${chapterNum})" class="btn-secondary-small text-xs" title="View Chapter Summary (AI)">Summary</button>
                           <button onclick="window.handleExplainSelection('transcription')" class="btn-secondary-small text-xs" title="Explain selected text from transcription">Explain Selection</button>
                           <button onclick="window.askQuestionAboutTranscription()" class="btn-secondary-small text-xs" title="Ask AI about the video transcription">Ask AI (Transcript)</button>
                      </div>
                      <!-- Formula Sheet Display Area -->
                      <div id="formula-sheet-area" class="mt-3 hidden border-t dark:border-gray-700 pt-3">
                           <div class="flex justify-between items-center mb-1">
                               <span class="text-sm font-semibold">Formula Sheet</span>
                               <button id="download-formula-pdf-btn" onclick="window.downloadFormulaSheetPdf()" class="btn-secondary-small text-xs hidden">Download PDF</button>
                           </div>
                           <div id="formula-sheet-content" class="text-sm p-3 bg-gray-100 dark:bg-gray-700/50 rounded border dark:border-gray-600 max-h-60 overflow-y-auto"></div>
                      </div>
                      <!-- Chapter Summary Display Area -->
                      <div id="chapter-summary-area" class="mt-3 hidden border-t dark:border-gray-700 pt-3">
                           <div class="flex justify-between items-center mb-1">
                               <span class="text-sm font-semibold">Chapter Summary</span>
                               <button id="download-summary-pdf-btn" onclick="window.downloadChapterSummaryPdf()" class="btn-secondary-small text-xs hidden">Download PDF</button>
                           </div>
                           <div id="chapter-summary-content" class="text-sm p-3 bg-gray-100 dark:bg-gray-700/50 rounded border dark:border-gray-600 max-h-60 overflow-y-auto"></div>
                      </div>
                  </div>
            </div>
        </div>
        ${aiExplanationHtml}
     `;
     if (videoId) createYTPlayer(videoContainerId, videoId);
     if (srtPath) renderTranscriptionLines(); // Render initial transcription state
     if (pdfPath) await initPdfViewer(pdfPath); // Initialize PDF viewer
     highlightTranscriptionLine(); // Initial highlight attempt
     checkAndMarkChapterStudied(courseId, chapterNum); // Check status on load
}
// Assign to window scope for onclick handlers
window.showCourseStudyMaterial = showCourseStudyMaterial;

// MODIFIED: Define triggerSkipExamGeneration within this module
export async function triggerSkipExamGeneration(courseId, chapterNum) {
     if (!currentUser) { alert("Log in required."); return; }
     if (!confirm(`Generate and start a Skip Exam for Chapter ${chapterNum}? Passing this exam will mark the chapter as studied.`)) return;
     showLoading(`Generating Skip Exam for Chapter ${chapterNum}...`);
     try {
          // 1. Generate the raw exam text (MCQs only from AI)
          const rawMcqText = await generateSkipExam(courseId, chapterNum);
          if (!rawMcqText) throw new Error("AI failed to generate MCQ content.");

          // 2. Parse the raw text to get structured MCQs and answers
          const { questions: parsedMcqs, answers: mcqAnswers } = parseSkipExamText(rawMcqText, chapterNum);
          if (!parsedMcqs || parsedMcqs.length === 0) {
               throw new Error("Failed to parse valid MCQs from the generated text. AI output might be malformed.");
          }
          console.log(`Parsed ${parsedMcqs.length} MCQs for skip exam.`);

          // 3. Prepare the online test state
          const examId = `${courseId}-skip-ch${chapterNum}-${Date.now()}`;
          const onlineTestState = {
               examId: examId,
               questions: parsedMcqs, // Use only parsed MCQs for skip exam
               correctAnswers: mcqAnswers,
               userAnswers: {},
               allocation: null, // No complex allocation for skip exam
               startTime: Date.now(),
               timerInterval: null,
               currentQuestionIndex: 0,
               status: 'active',
               // Shorter duration for skip exam (e.g., 1.5 min per MCQ)
               durationMinutes: Math.max(15, Math.min(60, parsedMcqs.length * 1.5)),
               courseContext: {
                    isCourseActivity: true, // It's part of the course flow
                    courseId: courseId,
                    activityType: 'skip_exam',
                    activityId: `chapter${chapterNum}`, // Unique identifier
                    chapterNum: chapterNum,
                    isSkipExam: true // Explicit flag
               }
          };
          setCurrentOnlineTestState(onlineTestState);

          hideLoading();
          launchOnlineTestUI();

     } catch (error) {
          hideLoading();
          console.error(`Error generating/starting Skip Exam for Chapter ${chapterNum}:`, error);
          alert(`Could not start Skip Exam: ${error.message}`);
     }
}
window.triggerSkipExamGeneration = triggerSkipExamGeneration; // Assign to window scope

// --- END OF FILE ui_course_study_material.js ---