// --- START OF FILE ui_course_study_material.js ---

// ui_course_study_material.js

// *** MODIFIED: Import 'data' state for subject access ***
import { currentUser, globalCourseDataMap, activeCourseId, setActiveCourseId, videoDurationMap, userCourseProgressMap, updateUserCourseProgress, data } from './state.js';
// MODIFIED: Import USER-SPECIFIC save/load functions for sheets/summaries
import { saveUserCourseProgress, markChapterStudiedInCourse, saveUserFormulaSheet, loadUserFormulaSheet, saveUserChapterSummary, loadUserChapterSummary } from './firebase_firestore.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml, renderMathIn } from './utils.js';
// *** MODIFIED: Import new path config values, remove old ones ***
// *** MODIFIED: Import EXAM_QUESTION_COUNTS and EXAM_DURATIONS_MINUTES ***
import { COURSE_BASE_PATH, DEFAULT_COURSE_PDF_FOLDER, DEFAULT_COURSE_TRANSCRIPTION_FOLDER, PDF_WORKER_SRC, SKIP_EXAM_PASSING_PERCENT, PDF_PAGE_EQUIVALENT_SECONDS, YOUTUBE_API_KEY, EXAM_QUESTION_COUNTS, EXAM_DURATIONS_MINUTES } from './config.js'; // Added YT Key, New Path Config, Exam Counts/Durations
// MODIFIED: Removed import of generateSkipExam from ai_integration
// *** UPDATED Imports: Use USER-SPECIFIC save/load functions and WHOLE PDF AI ***
import { generateFormulaSheet, explainStudyMaterialSnippet, getExplanationForPdfSnapshot, getAllPdfTextForAI, generateChapterSummary, askAboutPdfDocument } from './ai_integration.js';
// *** MODIFIED: Import extractQuestionsFromMarkdown (not parseSkipExamText) ***
import { extractQuestionsFromMarkdown } from './markdown_parser.js';
import { launchOnlineTestUI, setCurrentOnlineTestState } from './ui_online_test.js';
import { generateAndDownloadPdfWithMathJax } from './ui_pdf_generation.js';
import { showCurrentCourseDashboard } from './ui_course_dashboard.js';
// MODIFIED: Import test_logic functions for problem selection/combination (Keep if needed elsewhere, but not used in skip exam now)
import { parseChapterProblems, selectProblemsForExam, combineProblemsWithQuestions } from './test_logic.js';
// MODIFIED: Import notes functions - Added setLastViewedChapterForNotes
import { showNotesDocumentsPanel, setLastViewedChapterForNotes } from './ui_notes_documents.js';
// *** MODIFIED: Import filename utils ***
import { generateStructuredFilename, getSrtFilenameFromTitle } from './filename_utils.js';
// *** ADDED: Import calculateChapterCombinedProgress from course_logic.js ***
import { calculateChapterCombinedProgress } from './course_logic.js';


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

// *** REMOVED: Local getSrtFilenameFromTitle - now imported from filename_utils.js ***

// Function to fetch and parse SRT file with timestamps
async function fetchAndParseSrt(filePath) {
    // *** ADDED LOGGING ***
    console.log('[fetchAndParseSrt] Fetching SRT from raw path:', filePath);
    if (!filePath) {
        console.warn('[fetchAndParseSrt] Received null or empty file path. Aborting fetch.');
        return [];
    }
    try {
        // Avoid double encoding if path already looks encoded
        const encodedFilePath = filePath.includes('%') ? filePath : encodeURI(filePath);
        const fetchUrl = `${encodedFilePath}?t=${new Date().getTime()}`; // Cache bust
        // *** MODIFIED LOGGING ***
        console.log(`[fetchAndParseSrt] Attempting fetch from URL: ${fetchUrl}`);

        const response = await fetch(fetchUrl);

        // *** MODIFICATION START: Check Content-Type - ADDED application/x-subrip ***
        const contentType = response.headers.get("content-type");
        console.log(`[fetchAndParseSrt] Received Content-Type: "${contentType}" for ${filePath}.`); // Log received type
        // Check if the content type is valid (plain text, srt, or x-subrip)
        const validContentTypes = ["text/plain", "application/srt", "text/srt", "application/x-subrip"];
        const isValidContentType = contentType && validContentTypes.some(validType => contentType.includes(validType));

        if (!isValidContentType) {
            console.warn(`[fetchAndParseSrt] Received potentially incorrect Content-Type: "${contentType}" for ${filePath}. Expected one of: ${validContentTypes.join(', ')}. Processing anyway, but might indicate server config issue or fallback HTML.`);
            // Decide whether to proceed or fail based on status code below
        }
        // *** MODIFICATION END ***

        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`[fetchAndParseSrt] 404 - SRT File not found at path: ${filePath} (Encoded: ${encodedFilePath}). Check base path and generated filename.`);
                return [];
            }
             // If status is not OK, but content type looked wrong, still treat as error
             if (!isValidContentType && response.status !== 200) { // Check status if type was weird
                  console.error(`[fetchAndParseSrt] Received bad status (${response.status}) AND potentially incorrect Content-Type ("${contentType}") for ${filePath}. Returning empty array.`);
                  return [];
             }
            // Throw error for other non-OK statuses
            throw new Error(`HTTP error fetching SRT file! status: ${response.status} for ${filePath}`);
        }
        // If response IS ok, but content type was weird, log it but proceed
        if (!isValidContentType) {
             console.log(`[fetchAndParseSrt] Response status is OK (${response.status}), proceeding with parsing despite unusual Content-Type: "${contentType}"`);
        }

        const srtContent = await response.text();
        const lines = srtContent.split(/\r?\n/);
        const entries = [];
        let entryIdCounter = 1; // Use a counter for reliable ID

        // --- MODIFIED timeToSeconds Function (Handles HH:MM:SS,ms and MM:SS,ms) ---
        const timeToSeconds = (timeStr) => {
             if (!timeStr || typeof timeStr !== 'string') return 0; // Basic validation

            const parts = timeStr.split(',');
            if (parts.length !== 2) {
                // Try parsing without milliseconds if comma is missing
                if (!timeStr.includes(':')) {
                    console.warn("Could not parse time string: invalid format.", timeStr);
                    return 0;
                }
                // If ':' is present but ',' isn't, assume 0 milliseconds
                parts[0] = timeStr;
                parts[1] = '000';
            }

            const hmsPart = parts[0];
            const msStr = parts[1];

            const ms = parseInt(msStr, 10);
            if (isNaN(ms) || msStr.length > 3) { // Allow 1-3 digits for ms, though standard is 3
                 console.warn("Could not parse time string: invalid milliseconds part.", msStr, "in", timeStr);
                 // Don't return 0, just use 0 for ms part
                 // return 0;
            }

            const timeParts = hmsPart.split(':');
            let h = 0, m = 0, s = 0;

            if (timeParts.length === 3) { // HH:MM:SS format
                h = parseInt(timeParts[0], 10);
                m = parseInt(timeParts[1], 10);
                s = parseInt(timeParts[2], 10);
            } else if (timeParts.length === 2) { // MM:SS format
                h = 0; // Assume hours is zero
                m = parseInt(timeParts[0], 10);
                s = parseInt(timeParts[1], 10);
            } else if (timeParts.length === 1 && !isNaN(parseInt(timeParts[0], 10))) { // Seconds only?
                 h = 0; m = 0; s = parseInt(timeParts[0], 10);
            }
            else {
                console.warn("Could not parse time string: invalid H:M:S structure.", hmsPart, "in", timeStr);
                return 0;
            }

            // Check if any part failed to parse
            if (isNaN(h) || isNaN(m) || isNaN(s)) {
                console.warn("Could not parse time string: NaN value encountered.", timeParts, "in", timeStr);
                return 0;
            }

            return h * 3600 + m * 60 + s + (isNaN(ms) ? 0 : ms / 1000); // Handle NaN ms
        };
        // --- END MODIFIED timeToSeconds Function ---


        // --- MODIFIED PARSING LOOP START ---
        let entry = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines between entries
            if (!line) {
                if (entry && entry.text.length > 0) {
                    // Finalize the current entry when an empty line is encountered
                    entry.text = entry.text.join(' ').trim();
                    entries.push(entry);
                    entry = null; // Reset for the next entry
                }
                continue; // Move to the next line
            }

            // Check for timestamp line (contains '-->')
            if (line.includes('-->')) {
                // If we were already building an entry, finalize it first
                // (This handles cases where the index number line might be missing)
                if (entry && entry.text.length > 0) {
                    entry.text = entry.text.join(' ').trim();
                    entries.push(entry);
                }

                const times = line.split('-->');
                if (times.length === 2) {
                    const startSeconds = timeToSeconds(times[0].trim());
                    const endSeconds = timeToSeconds(times[1].trim());
                    if (endSeconds >= startSeconds) {
                         // Start a new entry with parsed times
                         entry = {
                             id: entryIdCounter++, // Use counter for reliable ID
                             start: startSeconds,
                             end: endSeconds,
                             text: [] // Initialize text array
                         };
                    } else {
                         console.warn(`Malformed timestamp line in SRT: end time (${times[1].trim()}) before start time (${times[0].trim()}). Skipping entry.`);
                         entry = null; // Discard malformed entry
                    }
                } else {
                    console.warn(`Malformed timestamp line in SRT: "${line}". Skipping.`);
                    entry = null; // Discard malformed entry
                }
            }
            // Check if the line is just a number (likely the SRT index) AND the *next* line looks like a timestamp
            // This helps ignore the index line itself
            else if (/^\d+$/.test(line) && lines[i+1]?.includes('-->')) {
                continue; // Skip the index line
            }
            // If we have a valid current entry being built, append this line as text
            else if (entry) {
                entry.text.push(line);
            }
            // Ignore lines that appear before the first valid timestamp entry
        }

        // Finalize the last entry if the file didn't end with an empty line
        if (entry && entry.text.length > 0) {
             entry.text = entry.text.join(' ').trim();
             entries.push(entry);
        }
        // --- MODIFIED PARSING LOOP END ---

        console.log(`fetchAndParseSrt: Parsed ${entries.length} entries from ${filePath}`);
        return entries;
    } catch (error) {
        console.error(`Error fetching/parsing SRT file (${filePath}):`, error);
        // *** ADDED LOGGING ***
        console.error('[fetchAndParseSrt] Full error object:', error);
        return [];
    }
}


// Function to parse YouTube URL
export function getYouTubeVideoId(url) { // Export if needed by other modules
     if (!url) return null;
    try {
        // Handle standard watch URLs (youtube.com/watch?v=...)
        if (url.includes('youtube.com/watch')) {
            const urlParams = new URLSearchParams(new URL(url).search);
            const videoId = urlParams.get('v');
            if (videoId) return videoId;
        }
        // Handle short URLs (youtu.be/...)
        else if (url.includes('youtu.be/')) {
             const pathParts = new URL(url).pathname.split('/');
             // The ID is usually the first part after the slash
             if (pathParts.length >= 2 && pathParts[1]) {
                  // Remove potential query params like ?t=...
                  return pathParts[1].split('?')[0];
             }
        }
        // Handle embed URLs (youtube.com/embed/...)
         else if (url.includes('youtube.com/embed/')) {
             const pathParts = new URL(url).pathname.split('/');
             // The ID is usually the part after /embed/
             if (pathParts.length >= 3 && pathParts[2]) {
                  return pathParts[2].split('?')[0];
             }
         }
         // Handle shorts URLs (youtube.com/shorts/...) - Added
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
        // If already loaded, ensure the ready callback is triggered for any latecomers
        if(ytApiLoaded && typeof window.onYouTubeIframeAPIReady === 'function') {
            try { window.onYouTubeIframeAPIReady(); } catch (e) { console.error("Error re-triggering onYouTubeIframeAPIReady:", e); }
        }
        return;
    }
    console.log("Loading YouTube IFrame Player API...");
    window.ytApiLoadingInitiated = true; // Set flag

    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    // Insert before the first script tag to avoid potential conflicts
    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
        // Fallback if no script tags exist yet (unlikely but safe)
        document.head.appendChild(tag);
    }


    // Define the global callback function that the API will call
    window.onYouTubeIframeAPIReady = () => {
        console.log("YouTube IFrame Player API Ready.");
        ytApiLoaded = true;
        window.ytApiLoadingInitiated = false; // Reset flag

        // Process any players that were queued before the API loaded
        console.log(`Processing YouTube player initialization queue (${ytInitializationQueue.length} items)`);
        // Use a temporary copy and clear the original queue *before* processing
        // to prevent race conditions if initialization triggers another queue attempt.
        const queueToProcess = [...ytInitializationQueue];
        ytInitializationQueue = [];

        queueToProcess.forEach(item => {
            // Double-check YT.Player exists before creating
            if (window.YT && window.YT.Player) {
                createYTPlayer(item.elementId, item.videoId);
            } else {
                // This case should theoretically not happen if onYouTubeIframeAPIReady is called correctly
                console.error(`YT.Player still not available when processing queue for ${item.elementId}. Re-queueing.`);
                // Re-queue if creation fails - indicates a potential loading issue
                ytInitializationQueue.push(item);
            }
        });
         // If re-queueing happened, maybe try processing again after a delay? Or log a more severe error.
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
    // Check for invalid videoId formats (e.g., null, undefined, empty string, non-string)
    if (!videoId || typeof videoId !== 'string' || videoId.trim().length === 0) {
         console.error(`Cannot create YT Player for #${elementId}: Invalid videoId provided ('${videoId}').`);
         container.innerHTML = `<p class="text-red-500 text-sm p-4">Error: Invalid video ID provided.</p>`;
         return;
    }

    // Check if API is ready, queue if not
    if (!ytApiLoaded || !window.YT || !window.YT.Player) {
        console.log(`YouTube API not ready, queueing player creation for ${elementId} (Video ID: ${videoId})`);
        // Avoid duplicate queue entries for the same element
        if (!ytInitializationQueue.some(item => item.elementId === elementId)) {
             ytInitializationQueue.push({ elementId, videoId });
        }
        // Provide user feedback in the container
        container.innerHTML = `<div class="flex items-center justify-center h-full bg-black rounded text-center p-4"><p class="text-gray-400 text-sm italic">Waiting for YouTube API...</p></div>`;
        // Ensure the API loading process is initiated if it hasn't been already
        if (!window.ytApiLoadingInitiated) {
            loadYouTubeAPI();
        }
        return;
    }

    console.log(`Creating YouTube player for element ${elementId} with video ID ${videoId}`);
    try {
         // Clear placeholder content before creating player
         container.innerHTML = '';
         // Store player state placeholder - player instance added in onReady
         ytPlayers[elementId] = { player: null, videoId: videoId, intervalId: null, totalDuration: null };

        // Create the YT Player instance
        const player = new YT.Player(elementId, {
            // Dimensions can be handled by CSS aspect-ratio usually
            // height: '360', // Example fixed height
            // width: '100%', // Example width
            videoId: videoId,
            playerVars: {
                'playsinline': 1, // Important for mobile playback without fullscreen
                'modestbranding': 1, // Reduce YouTube logo
                'rel': 0 // Don't show related videos at the end
            },
            events: {
                'onReady': (event) => onPlayerReady(event, elementId),
                'onStateChange': (event) => onPlayerStateChange(event, videoId, elementId),
                'onError': (event) => onPlayerError(event, videoId, elementId)
            }
        });
        // Note: Player instance is assigned to ytPlayers[elementId].player inside onPlayerReady
        // ytPlayers[elementId].player = player; // Assign player instance immediately (optional, but can be useful)

    } catch (error) {
        console.error(`Failed to create YouTube player for ${elementId}:`, error);
        container.innerHTML = `<p class="text-red-500 text-sm p-4">Error loading video player. Check console and try disabling extensions.</p>`;
        // Clean up state if creation failed
        if (ytPlayers[elementId]) {
             delete ytPlayers[elementId];
        }
    }
}

function onPlayerReady(event, elementId) {
    const playerState = ytPlayers[elementId];
    if (!playerState) {
        console.warn(`onPlayerReady called for element ${elementId}, but no player state found.`);
        return;
    }
    console.log(`Player ready: ${playerState.videoId} (Element: ${elementId})`);

    // Assign the actual player object to our state tracking
    playerState.player = event.target;

    try {
        const duration = playerState.player.getDuration();
        if (duration > 0) {
            playerState.totalDuration = duration;
            videoDurationMap[playerState.videoId] = duration; // Cache duration globally
            console.log(`Video ${playerState.videoId} Duration: ${playerState.totalDuration}s`);
        } else {
             console.warn(`Video ${playerState.videoId} reported duration 0 or invalid.`);
             playerState.totalDuration = null;
        }


        // Initialize progress tracking only if not in viewer mode
        const progress = userCourseProgressMap.get(currentCourseIdInternal);
        if (progress && progress.enrollmentMode !== 'viewer') {
             progress.watchedVideoDurations = progress.watchedVideoDurations || {};
             progress.watchedVideoDurations[currentChapterNumber] = progress.watchedVideoDurations[currentChapterNumber] || {};
             // Initialize watch duration to 0 if not already present
             if (progress.watchedVideoDurations[currentChapterNumber][playerState.videoId] === undefined) {
                  progress.watchedVideoDurations[currentChapterNumber][playerState.videoId] = 0;
             }
             // Initialize local watch status using potentially stored progress
             videoWatchStatus[playerState.videoId] = {
                 watchedDuration: progress.watchedVideoDurations[currentChapterNumber][playerState.videoId],
                 isComplete: false, // This will be determined later based on watch time
                 lastTrackedTime: null // Initialize last tracked time
             };
             console.log(`Initialized watch status for ${playerState.videoId}: ${videoWatchStatus[playerState.videoId].watchedDuration}s watched (from progress)`);
        } else {
            // For viewers, just initialize locally without using stored progress
            videoWatchStatus[playerState.videoId] = { watchedDuration: 0, isComplete: false, lastTrackedTime: null };
            console.log(`Initialized watch status for ${playerState.videoId} (Viewer mode).`);
        }

    } catch (e) {
         console.error("Error during onPlayerReady operations:", e);
         playerState.totalDuration = null; // Mark duration as unknown on error
    }
}

function onPlayerError(event, videoId, elementId) {
      console.error(`YouTube Player Error for video ${videoId} (Element: ${elementId}): Code ${event.data}`);
     const container = document.getElementById(elementId);
     let errorMsg = `Error loading video (Code: ${event.data}).`;

     // Provide more specific error messages based on YT API error codes
     // https://developers.google.com/youtube/iframe_api_reference#onError
     switch(event.data) {
        case 2: // Invalid parameter (often videoId)
            errorMsg = "Invalid video ID. The video may not exist or the link is incorrect."; break;
        case 5: // HTML5 Player Error
            errorMsg = "HTML5 Player Error. Try reloading the page or disabling browser extensions (like ad blockers)."; break;
        case 100: // Video not found or private
            errorMsg = "Video not found, removed by user, or marked as private."; break;
        case 101: // Embedding disabled by owner
        case 150: // Same as 101, but different phrasing sometimes
            errorMsg = "Video owner has disabled embedding. You might need to watch it directly on YouTube."; break;
        default:
            errorMsg = `Playback error (Code: ${event.data}). Please check your connection or try again later. Reloading may help.`;
     }

     // Display error in the video container
     if (container) container.innerHTML = `<div class="flex items-center justify-center h-full bg-black rounded text-center p-4"><p class="text-red-500 text-sm">${errorMsg}</p></div>`;

     // Clean up state for the errored player
     if (ytPlayers[elementId]) {
          if (ytPlayers[elementId].intervalId) clearInterval(ytPlayers[elementId].intervalId);
          delete ytPlayers[elementId]; // Remove from active players
          delete videoWatchStatus[videoId]; // Remove watch status
     }
}

function onPlayerStateChange(event, videoId, elementId) {
     const playerState = ytPlayers[elementId];
    if (!playerState || !playerState.player) { // Check if player instance exists
        console.warn(`onPlayerStateChange for ${elementId} but player state or instance is missing.`);
        return;
    }

    const progress = userCourseProgressMap.get(currentCourseIdInternal);
    const isViewer = progress?.enrollmentMode === 'viewer';
    const playerInstance = playerState.player; // Get the YT Player instance

    try { // Wrap in try-catch as playerInstance methods can sometimes fail
        if (event.data === YT.PlayerState.PLAYING) {
            console.log(`Video playing: ${videoId}`);
            // Start interval only if not already running
            if (playerState.intervalId === null) {
                // Clear any potential zombie interval first
                if(playerState.intervalId) clearInterval(playerState.intervalId);
                // Start new interval: Track watch time (if not viewer) & highlight transcription
                playerState.intervalId = setInterval(() => {
                    if (!isViewer) trackWatchTime(videoId, elementId); // Only track time if not viewer
                    highlightTranscriptionLine(); // Always highlight transcription
                }, 1000);
                console.log(`Watch time tracking started for ${videoId}`);
            }
        } else { // Includes PAUSED, BUFFERING, ENDED, CUED
            // If interval is running, clear it
            if (playerState.intervalId !== null) {
                clearInterval(playerState.intervalId);
                playerState.intervalId = null;
                console.log(`Watch time tracking stopped for ${videoId} (State: ${event.data})`);
                // Save progress when paused or stopped (only if not viewer)
                if (!isViewer) {
                    saveVideoWatchProgress(videoId); // Save accumulated time
                }
            }
            // Specifically handle the ENDED state
            if (event.data === YT.PlayerState.ENDED) {
                console.log(`Video ended: ${videoId}`);
                 // Ensure watch status exists and duration is known
                if (videoWatchStatus[videoId] && playerState.totalDuration > 0) {
                     // Update watched duration to the total duration on end, ensures 100% if watched fully
                     videoWatchStatus[videoId].watchedDuration = playerState.totalDuration;
                     videoWatchStatus[videoId].isComplete = true; // Mark as complete
                     console.log(`Video ${videoId} marked as complete internally (status: ENDED).`);
                } else if (videoWatchStatus[videoId]) {
                    // If duration wasn't fetched, still mark complete on 'ENDED' state
                    videoWatchStatus[videoId].isComplete = true;
                    console.log(`Video ${videoId} marked as complete internally (status: ENDED, duration unknown).`);
                }

                // Save final progress and check chapter completion (only if not viewer)
                if (!isViewer) {
                    saveVideoWatchProgress(videoId).then(() => {
                        checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber);
                    }).catch(err => console.error("Error saving progress after video ended:", err));
                }
            }
        }
    } catch (e) {
         console.error("Error handling player state change:", e);
         // Attempt to clear interval on error to prevent issues
         if (playerState && playerState.intervalId) {
             clearInterval(playerState.intervalId);
             playerState.intervalId = null;
         }
    }
}

async function trackWatchTime(videoId, elementId) { // Make async for potential awaits later
    const playerState = ytPlayers[elementId];
    // Ensure player and necessary methods exist
    if (!playerState || !playerState.player || typeof playerState.player.getCurrentTime !== 'function') {
         console.warn("trackWatchTime: Player state or getCurrentTime function missing for", elementId);
         // Stop interval if player is invalid
         if (playerState && playerState.intervalId) {
              clearInterval(playerState.intervalId);
              playerState.intervalId = null;
         }
         return;
    }

    // Double check viewer mode before tracking
    const progress = userCourseProgressMap.get(currentCourseIdInternal);
    if (progress?.enrollmentMode === 'viewer') return; // Don't track for viewers

    try {
         const currentTime = playerState.player.getCurrentTime();
         const totalDuration = playerState.totalDuration; // Get cached duration

         if (videoWatchStatus[videoId] && totalDuration > 0) { // Ensure status exists and duration is valid
              const watchedStatus = videoWatchStatus[videoId];
              // Increment only if time actually moved forward significantly (avoid small fluctuations)
              if (watchedStatus.lastTrackedTime === null || currentTime > watchedStatus.lastTrackedTime + 0.5) {
                   const timeIncrement = (watchedStatus.lastTrackedTime === null) ? 1 : currentTime - watchedStatus.lastTrackedTime;
                   // Ensure watched duration doesn't exceed total duration
                   watchedStatus.watchedDuration = Math.min(totalDuration, (watchedStatus.watchedDuration || 0) + timeIncrement);
                   watchedStatus.lastTrackedTime = currentTime;

                   // Check if watch threshold is met
                   const progressPercent = watchedStatus.watchedDuration / totalDuration;
                   if (progressPercent >= VIDEO_WATCH_THRESHOLD_PERCENT && !watchedStatus.isComplete) {
                       watchedStatus.isComplete = true;
                       console.log(`Video ${videoId} reached watch threshold (>= ${VIDEO_WATCH_THRESHOLD_PERCENT*100}%). Marked complete internally.`);
                       // Trigger save and chapter check immediately when threshold is met
                       await saveVideoWatchProgress(videoId);
                       await checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber);
                   }

                   // Save progress periodically (e.g., every 30 seconds of *accumulated* watch time)
                   if (Math.round(watchedStatus.watchedDuration) > 0 && Math.round(watchedStatus.watchedDuration) % 30 === 0) {
                        await saveVideoWatchProgress(videoId);
                        // No need to check chapter studied here again if already done at threshold
                        // await checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber);
                   }
              }
         } else if (totalDuration === null) {
             // Can't calculate percentage if duration unknown, maybe track time anyway?
             // console.log("Tracking time for video with unknown duration:", videoId);
         }
    } catch (e) {
         console.warn("Error getting current time in trackWatchTime:", e);
         // Stop timer on error
         if (playerState.intervalId) { clearInterval(playerState.intervalId); playerState.intervalId = null; }
    }
}


// Returns Promise from saveUserCourseProgress
async function saveVideoWatchProgress(videoId) {
      if (!currentUser || !currentCourseIdInternal || !currentChapterNumber || !videoWatchStatus[videoId]) {
          console.warn(`Cannot save video progress for ${videoId}: Missing context or status.`);
          return Promise.resolve(); // Return resolved promise for consistency
     }
     const progress = userCourseProgressMap.get(currentCourseIdInternal);
     // DO NOT SAVE if viewer mode
     if (!progress || progress.enrollmentMode === 'viewer') {
          console.log(`Viewer mode for ${videoId}, skipping save.`);
          return Promise.resolve();
     }

     // Ensure the nested structure exists
     progress.watchedVideoDurations = progress.watchedVideoDurations || {};
     progress.watchedVideoDurations[currentChapterNumber] = progress.watchedVideoDurations[currentChapterNumber] || {};

     const newDuration = Math.round(videoWatchStatus[videoId].watchedDuration);
     // Clamp duration to video length if known
     const totalDuration = videoDurationMap[videoId]; // Use cached duration
     const clampedDuration = (typeof totalDuration === 'number' && totalDuration > 0) ? Math.min(newDuration, totalDuration) : newDuration;

     // Only save if the clamped duration has changed
     if (progress.watchedVideoDurations[currentChapterNumber][videoId] !== clampedDuration) {
          progress.watchedVideoDurations[currentChapterNumber][videoId] = clampedDuration;
          console.log(`Saving watched duration for ${videoId} (Ch ${currentChapterNumber}): ${clampedDuration}s`);
          updateUserCourseProgress(currentCourseIdInternal, progress); // Update local state immediately

          // Return the promise from Firestore save operation
          return saveUserCourseProgress(currentUser.uid, currentCourseIdInternal, progress)
              .then(() => console.log(`Firestore save successful for video ${videoId} progress.`))
              .catch(err => {
                   console.error(`Failed to save video progress to Firestore for ${videoId}:`, err);
                   // Optionally re-throw or handle error differently, e.g., notify user
                   // throw err; // Re-throw if the caller needs to know about the failure
              });
     } else {
         // console.log(`Video progress for ${videoId} hasn't changed (${clampedDuration}s). No save needed.`);
         return Promise.resolve(); // Return resolved promise if no change
     }
}

// Function triggered potentially after video ends or threshold reached
export async function handleVideoWatched(videoId) {
     console.log(`handleVideoWatched called for video ${videoId}. Checking chapter study status.`);
    // Only check if not in viewer mode
    const progress = userCourseProgressMap.get(currentCourseIdInternal);
    if (progress?.enrollmentMode !== 'viewer') {
        // Ensure progress is saved *before* checking study status
        await saveVideoWatchProgress(videoId);
        await checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber);
    } else {
        console.log(`Viewer mode, skipping study status check for Ch ${currentChapterNumber}.`);
    }
}


// --- Check and Mark Chapter Studied (Modified) ---
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

    // Do not mark studied if viewer mode
    if (progress.enrollmentMode === 'viewer') {
         console.log(`Viewer mode, skipping study status check for Ch ${chapterNum}.`);
         return;
    }

    // Check if already marked studied in the progress map (using Set for efficiency)
    const studiedChaptersSet = new Set(progress.courseStudiedChapters || []);
    if (studiedChaptersSet.has(chapterNum)) {
         // console.log(`Chapter ${chapterNum} already marked studied. Skipping check.`);
         return;
    }

    // Check if Skip Exam passed for this chapter
    const skipScore = progress.lastSkipExamScore?.[chapterNum];
    const skipExamThreshold = courseDef.skipExamPassingPercent || SKIP_EXAM_PASSING_PERCENT;
    if (skipScore !== undefined && skipScore !== null && skipScore >= skipExamThreshold) {
         console.log(`Chapter ${chapterNum} passed skip exam (Score: ${skipScore} >= ${skipExamThreshold}). Marking studied.`);
         try {
            await markChapterStudiedInCourse(currentUser.uid, courseId, chapterNum, "skip_exam_pass");
            console.log(`Chapter ${chapterNum} marked as studied in Firestore due to passing skip exam.`);
            // Update local state immediately
            progress.courseStudiedChapters = progress.courseStudiedChapters || [];
            if (!progress.courseStudiedChapters.includes(chapterNum)) {
                 progress.courseStudiedChapters.push(chapterNum);
                 updateUserCourseProgress(courseId, { courseStudiedChapters: progress.courseStudiedChapters });
            }
            // Update UI element immediately if possible (example for content menu view)
            // This might need adjustment depending on the current view
            const studyButton = document.querySelector(`#chapter-progress-${chapterNum} button[onclick*="showCourseStudyMaterial"]`);
            const skipButtonContainer = document.querySelector(`#chapter-progress-${chapterNum} .flex.items-center.gap-2.ml-auto`); // Target the container
            const progressBarContainer = document.getElementById(`chapter-progress-${chapterNum}`);
            if(progressBarContainer) { progressBarContainer.closest('.content-card')?.classList.add('bg-green-50', 'dark:bg-green-900/30'); }
            if(studyButton) studyButton.textContent = 'Review Chapter';
            if(skipButtonContainer) {
                 skipButtonContainer.innerHTML = `<span class="text-xs text-green-600 dark:text-green-400 font-medium">(Skip Passed: ${skipScore.toFixed(0)}%)</span>`;
            }
         } catch(error) {
             console.error(`Failed to mark Ch ${chapterNum} studied after skip exam pass:`, error);
         }
         return; // Stop checking if skip exam passed
    }

    // --- Calculate Combined Progress ---
    const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
    // Ensure lectureUrls exists and is an array before filtering/mapping
    const lecturesForChapter = (Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : []).filter(lec => typeof lec === 'object' && lec.url && lec.title);
    const videoIdsForChapter = lecturesForChapter.map(lec => getYouTubeVideoId(lec.url)).filter(id => id !== null);
    // Build chapter-specific duration map from global cache
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
    // If any duration is missing, we cannot reliably calculate 100% progress yet.
    if (missingDuration && videoIdsForChapter.length > 0) {
        console.log(`Ch ${chapterNum}: Skipping study check due to missing video duration(s). Will re-check later.`);
        return;
    }

    const pdfInfo = progress.pdfProgress?.[chapterNum] || null; // Use stored PDF progress

    // *** MODIFIED: Use imported function from course_logic.js ***
    const { percent: combinedProgressPercent, isComplete } = calculateChapterCombinedProgress(progress, chapterNum, chapterVideoDurationMap, pdfInfo);

    console.log(`Checking study status for Ch ${chapterNum}. Combined Progress: ${combinedProgressPercent}%, Is Complete Flag: ${isComplete}`);

    // Condition: Mark studied if combined progress calculation indicates completion (isComplete flag)
    if (isComplete) { // Use the isComplete flag from the calculator
        console.log(`Chapter ${chapterNum} reached 100% combined progress. Marking studied.`);
        try {
             await markChapterStudiedInCourse(currentUser.uid, courseId, chapterNum, "progress_complete");
             console.log(`Chapter ${chapterNum} marked as studied in Firestore due to reaching 100% progress.`);
            // Update local state immediately
            progress.courseStudiedChapters = progress.courseStudiedChapters || [];
            if (!progress.courseStudiedChapters.includes(chapterNum)) {
                 progress.courseStudiedChapters.push(chapterNum);
                 updateUserCourseProgress(courseId, { courseStudiedChapters: progress.courseStudiedChapters });
            }
            // Optionally update the progress bar visually immediately (example for content menu view)
            const progressBarContainer = document.getElementById(`chapter-progress-${chapterNum}`);
            if (progressBarContainer) {
                const progressBar = progressBarContainer.querySelector('.bg-blue-500'); // Target blue bar specifically
                const progressTooltip = progressBarContainer.querySelector('.progress-tooltip-text');
                if (progressBar) { progressBar.style.width = '100%'; progressBar.classList.remove('bg-blue-500'); progressBar.classList.add('!bg-green-500'); }
                if (progressTooltip) progressTooltip.textContent = 'Completed: 100%';
                progressBarContainer.closest('.content-card')?.classList.add('bg-green-50', 'dark:bg-green-900/30');
                const skipButtonContainer = progressBarContainer.closest('.content-card').querySelector('.flex.items-center.gap-2.ml-auto'); // Find container again
                 if(skipButtonContainer) {
                     // Check if it already shows skip status, otherwise add progress complete
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
         console.log(`Chapter ${chapterNum} not yet 100% complete (${combinedProgressPercent}%).`);
    }
}


// --- Transcription Interaction ---
export function highlightTranscriptionLine() {
     if (!currentTranscriptionData || currentTranscriptionData.length === 0) return;
    // Determine the currently active player based on internal state
    const currentPlayerElementId = `ytplayer-${currentChapterNumber}-${currentVideoIndex}`;
    const activePlayerState = ytPlayers[currentPlayerElementId];
    let currentTime = 0;

    // Get current time from the active player
    if (activePlayerState && activePlayerState.player && typeof activePlayerState.player.getCurrentTime === 'function') {
         try { currentTime = activePlayerState.player.getCurrentTime(); }
         catch (e) { console.warn("Could not get current time from player", e); return; }
    } else {
         // console.log("No active player found or player not ready for transcription sync.");
         return;
    } // Don't sync if no player or player not ready

    const transcriptionContainer = document.getElementById('transcription-content');
    if (!transcriptionContainer) return; // Container not in DOM

    let currentLineId = null;
    // Find the transcription entry matching the current video time
    for (const entry of currentTranscriptionData) {
        if (currentTime >= entry.start && currentTime <= entry.end) {
            currentLineId = `t-line-${entry.id}`;
            break; // Found the matching line
        }
    }

    // Remove highlight from all lines first for efficiency
    transcriptionContainer.querySelectorAll('.transcription-line.active').forEach(el => {
        el.classList.remove('active', 'bg-yellow-100', 'dark:bg-yellow-700/50', 'p-2', 'font-semibold'); // Remove styles
        el.classList.add('p-1'); // Reset padding
    });

    const currentLineElement = currentLineId ? document.getElementById(currentLineId) : null;

    if (isTranscriptionExpanded) {
        // --- Expanded View ---
        if (currentLineElement) {
            // Apply highlight styles
            currentLineElement.classList.add('active', 'bg-yellow-100', 'dark:bg-yellow-700/50', 'p-2', 'font-semibold');
            currentLineElement.classList.remove('p-1'); // Adjust padding

            // --- Smooth Scroll into View ---
            // Check if the element is fully visible within the scrollable container
            const containerRect = transcriptionContainer.getBoundingClientRect();
            const lineRect = currentLineElement.getBoundingClientRect();
            const isVisible = lineRect.top >= containerRect.top && lineRect.bottom <= containerRect.bottom;

            if (!isVisible) {
                 // Use 'nearest' to minimize scrolling distance
                 currentLineElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    } else {
        // --- Collapsed View ---
        // Hide all lines by default
        transcriptionContainer.querySelectorAll('.transcription-line').forEach(el => { el.classList.add('hidden'); });
        const placeholder = transcriptionContainer.querySelector('.transcription-placeholder');

        if (currentLineElement) {
            // Show only the current line
            currentLineElement.classList.remove('hidden');
            currentLineElement.classList.add('active'); // Mark as active (no visual style needed here)
            placeholder?.classList.add('hidden'); // Hide placeholder if a line is found
        } else {
            // Show placeholder if no line matches current time
            if (placeholder) {
                placeholder.classList.remove('hidden');
            } else {
                 // Add placeholder if it doesn't exist (should be rare after initial render)
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
    // Ensure element exists and has the start time data attribute
    if (!lineElement || !lineElement.dataset.startTime) return;

    const startTime = parseFloat(lineElement.dataset.startTime);
    // Ensure parsing was successful
    if (isNaN(startTime)) return;

    // Find the player associated with the current view
    const currentPlayerElementId = `ytplayer-${currentChapterNumber}-${currentVideoIndex}`;
    const playerToSeek = ytPlayers[currentPlayerElementId]?.player;

    // Check if player exists and has the seekTo method
    if (playerToSeek && typeof playerToSeek.seekTo === 'function' && typeof playerToSeek.playVideo === 'function') {
         console.log(`Seeking video to ${startTime}s`);
         playerToSeek.seekTo(startTime, true); // true allows seek ahead
         playerToSeek.playVideo(); // Start playing from the new position
    } else {
         console.warn("Could not find current player or 'seekTo'/'playVideo' method for transcription click.");
    }
}
window.handleTranscriptionClick = handleTranscriptionClick; // Assign to window

function toggleTranscriptionView() {
      isTranscriptionExpanded = !isTranscriptionExpanded;
     const container = document.getElementById('transcription-content');
     const toggleBtn = document.getElementById('transcription-toggle-btn');
     if (!container || !toggleBtn) return;

     // Adjust container max-height for expand/collapse animation
     container.classList.toggle('max-h-32', !isTranscriptionExpanded); // Collapsed height
     container.classList.toggle('max-h-96', isTranscriptionExpanded); // Expanded height (adjust as needed)

     // Update button text and title
     toggleBtn.textContent = isTranscriptionExpanded ? 'Collapse Transcription' : 'Expand Transcription';
     toggleBtn.title = isTranscriptionExpanded ? 'Show only the current line being spoken' : 'Show the full transcription text';

     // Re-render lines to show/hide them based on the new state
     renderTranscriptionLines();
     // Immediately highlight the current line in the new view state
     highlightTranscriptionLine();
}
window.toggleTranscriptionView = toggleTranscriptionView;

function renderTranscriptionLines() {
      const container = document.getElementById('transcription-content');
     if (!container) return;
     container.innerHTML = ''; // Clear previous content

     if (currentTranscriptionData && currentTranscriptionData.length > 0) {
          // Generate HTML for each transcription line
          const linesHtml = currentTranscriptionData.map(entry =>
              `<span id="t-line-${entry.id}"
                     class="transcription-line block p-1 rounded cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors duration-150 ease-in-out ${isTranscriptionExpanded ? '' : 'hidden'}"
                     data-start-time="${entry.start}"
                     onclick="window.handleTranscriptionClick(event)">${escapeHtml(entry.text)}</span>`
          ).join('');
          container.innerHTML = linesHtml;

          // Add placeholder for collapsed view (initially hidden)
          if (!isTranscriptionExpanded) {
               const placeholder = document.createElement('p');
               placeholder.className = 'transcription-placeholder text-xs italic text-muted p-1 hidden';
               placeholder.textContent = '(Syncing transcription...)';
               container.prepend(placeholder); // Add placeholder at the beginning
          }
     } else {
           // Display message if no transcription data
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
                  // Clear associated interval timer
                  if (playerData.intervalId) {
                      clearInterval(playerData.intervalId);
                      console.log(`Cleared interval for ${elementId}`);
                  }
                  // Destroy the player instance
                  try {
                      playerData.player.destroy();
                  } catch (destroyError) {
                      // Log destroy error but continue cleanup
                      console.warn(`Error during player.destroy() for ${elementId}:`, destroyError);
                  }
             } else if (playerData) {
                  console.log(`Player instance for ${elementId} was invalid or already destroyed during cleanup.`);
                   if (playerData.intervalId) clearInterval(playerData.intervalId); // Still clear interval if it exists
             }
        } catch (e) {
            // Catch errors during the cleanup process for a single player
            console.error(`Error destroying YT player instance ${elementId}:`, e);
        }
    });
    // Reset state variables
    ytPlayers = {};
    ytInitializationQueue = [];
    videoWatchStatus = {}; // Clear individual video watch status
    if(transcriptionHighlightInterval) clearInterval(transcriptionHighlightInterval);
    transcriptionHighlightInterval = null;
    // videoDurationMap = {}; // DO NOT Clear duration cache - keep it globally
    console.log("Cleaned up YouTube players state.");
};

export const cleanupPdfViewer = () => {
     // Release PDF document object if loaded
     if (pdfDoc) {
        // pdfDoc.destroy(); // Call destroy method if available (check PDF.js version)
        // pdfDoc.cleanup(); // Or cleanup method
     }
    pdfDoc = null;
    pdfPageNum = 1;
    pdfPageRendering = false;
    pdfPageNumPending = null;
    pdfScale = 1.5; // Reset scale
    pdfCanvas = null; // Release canvas reference
    pdfCtx = null; // Release context reference
    pdfViewerContainer = null; // Release container reference
    currentPdfTextContent = null; // Clear extracted text
    pdfTotalPages = 0; // Reset total pages

    // Remove event listeners to prevent memory leaks
    const prevButton = document.getElementById('pdf-prev');
    const nextButton = document.getElementById('pdf-next');
    const explainButton = document.getElementById('pdf-explain-button');
    const askFullDocButton = document.querySelector('#pdf-controls button[onclick*="askAboutFullPdf"]'); // More specific selector

    if (prevButton) prevButton.onclick = null;
    if (nextButton) nextButton.onclick = null;
    if (explainButton) explainButton.onclick = null;
    if (askFullDocButton) askFullDocButton.onclick = null;


    // Clear the viewer container content
    const viewerElement = document.getElementById('pdf-viewer-container');
    if (viewerElement) {
        viewerElement.innerHTML = ''; // Remove canvas or error messages
    }

    console.log("Cleaned up PDF viewer state.");
};
window.cleanupPdfViewer = cleanupPdfViewer;

// --- PDF.js Functions ---
export async function initPdfViewer(pdfPath) {
    // 1. Cleanup previous instance
    cleanupPdfViewer();

    // 2. Get references to essential DOM elements
    pdfViewerContainer = document.getElementById('pdf-viewer-container');
    const pdfControls = document.getElementById('pdf-controls');
    const pdfExplainButton = document.getElementById('pdf-explain-button'); // Ask AI (Page) button
    const askFullDocButton = document.querySelector('#pdf-controls button[onclick*="askAboutFullPdf"]'); // Ask AI (Doc) button


    // 3. Check if elements exist
    if (!pdfViewerContainer || !pdfControls || !pdfExplainButton || !askFullDocButton) {
         console.error("PDF viewer UI elements not found! Required: #pdf-viewer-container, #pdf-controls, #pdf-explain-button, askAboutFullPdf button.");
         // Display error within the main content area if possible
         displayContent('<p class="text-red-500 p-4">Error: PDF viewer UI elements are missing.</p>', 'course-dashboard-area');
         return; // Cannot proceed
     }

    // 4. Initial UI state: Show loading, hide controls
    pdfViewerContainer.innerHTML = `<div class="p-4 text-center"><div class="loader animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-2 text-sm text-muted">Loading PDF from: ${escapeHtml(pdfPath) || 'N/A'}...</p></div>`;
    pdfControls.classList.add('hidden'); // Hide Prev/Next/Page#/Ask buttons initially
    pdfExplainButton.disabled = true; // Disable Ask AI button
    askFullDocButton.disabled = true;


    // 5. Validate PDF Path
    if (!pdfPath) {
        console.error("initPdfViewer: No PDF path provided.");
        pdfViewerContainer.innerHTML = `<p class="text-red-500 p-4">Error: No PDF file path specified for this chapter.</p>`;
        return;
    }
     // Basic check if it ends with .pdf (case-insensitive)
     if (!pdfPath.toLowerCase().endsWith('.pdf')) {
         console.error(`initPdfViewer: Invalid PDF path "${pdfPath}". Does not end with '.pdf'.`);
         pdfViewerContainer.innerHTML = `<p class="text-red-500 p-4">Error: Invalid PDF file path provided. Path must end with '.pdf'.<br>Path: <code>${escapeHtml(pdfPath)}</code></p>`;
         return;
     }


    console.log('[PDF Init] Attempting to load PDF. Path variable:', pdfPath);

    // 6. Load PDF using PDF.js
    try {
        // Check if PDF.js library is loaded
        if (typeof pdfjsLib === 'undefined') {
             console.error("PDF.js library (pdfjsLib) not loaded.");
             throw new Error("PDF library not available.");
         }
        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
        console.log(`[PDF Init] PDF worker source set to: ${PDF_WORKER_SRC}`);

        // Encode path for URL safety (handles spaces, etc.)
        // Avoid double encoding if it already contains %
        const encodedPdfPath = pdfPath.includes('%') ? pdfPath : encodeURI(pdfPath);

        // *** MODIFICATION: Added Log before getDocument ***
        console.log(`[PDF Init] Attempting to load PDF. Final Encoded Path: ${encodedPdfPath}`);
        const loadingTask = pdfjsLib.getDocument(encodedPdfPath);
        // *** END MODIFICATION ***

        // 7. Handle successful load
        loadingTask.promise.then(async (loadedPdfDoc) => {
            pdfDoc = loadedPdfDoc; // Store the loaded document object
            pdfTotalPages = pdfDoc.numPages; // Store total page count
            console.log(`PDF loaded successfully: ${pdfTotalPages} pages.`);

            // Restore page number from progress if available and not viewer
            const progress = userCourseProgressMap.get(currentCourseIdInternal);
            const isViewer = progress?.enrollmentMode === 'viewer';
            let initialPageNum = 1;
            if (progress && !isViewer) {
                progress.pdfProgress = progress.pdfProgress || {};
                progress.pdfProgress[currentChapterNumber] = progress.pdfProgress[currentChapterNumber] || { currentPage: 0, totalPages: 0 };
                // Update total pages in progress if necessary
                if (progress.pdfProgress[currentChapterNumber].totalPages !== pdfTotalPages) {
                    progress.pdfProgress[currentChapterNumber].totalPages = pdfTotalPages;
                     // Don't await save here, do it after rendering first page if needed
                     // saveUserCourseProgress(currentUser.uid, currentCourseIdInternal, progress);
                }
                // Get stored page, ensure it's within valid range
                initialPageNum = Math.max(1, progress.pdfProgress[currentChapterNumber].currentPage || 1);
                initialPageNum = Math.min(initialPageNum, pdfTotalPages);
                pdfPageNum = initialPageNum; // Set the current page number state
                console.log(`Restored PDF to page ${pdfPageNum} from progress.`);
            } else {
                 pdfPageNum = 1; // Default to page 1 for viewers or no progress
            }

            // Update UI: Show controls, set page numbers
            pdfControls.classList.remove('hidden');
            pdfExplainButton.disabled = false; // Enable Ask AI (Page)
             askFullDocButton.disabled = false; // Enable Ask AI (Doc)
            document.getElementById('pdf-page-num').textContent = pdfPageNum;
            document.getElementById('pdf-page-count').textContent = pdfTotalPages;

            // Create canvas element for rendering
            pdfCanvas = document.createElement('canvas');
            pdfCanvas.id = 'pdf-canvas';
            // pdfCanvas.className = 'mx-auto block'; // Center canvas if needed
            pdfCtx = pdfCanvas.getContext('2d');
            pdfViewerContainer.innerHTML = ''; // Clear loading indicator
            pdfViewerContainer.appendChild(pdfCanvas); // Add canvas to container

            // Render the initial page
            await renderPdfPage(pdfPageNum);

            // Set up event listeners for buttons AFTER elements are ready
            document.getElementById('pdf-prev').onclick = onPrevPage;
            document.getElementById('pdf-next').onclick = onNextPage;
            // pdfExplainButton onclick is set in HTML
            // askFullDocButton onclick is set in HTML

            // Update progress if the restored page differs from the initial state (1)
             // And save total pages if it changed
            if (progress && !isViewer && (progress.pdfProgress[currentChapterNumber].currentPage !== pdfPageNum || progress.pdfProgress[currentChapterNumber].totalPages !== pdfTotalPages) ) {
                updatePdfProgressAndCheckCompletion(pdfPageNum); // Update progress (includes saving)
            }

        // 8. Handle loading errors
        // *** MODIFICATION: Replaced .catch block with more detailed version ***
        }).catch(error => {
            console.error(`[PDF Init] Error during pdfjsLib.getDocument('${encodedPdfPath}'): Name: ${error.name}, Message: ${error.message}`, error);
             let userMessage = `Error loading PDF: ${error.message || 'Unknown error'}.`;
             // Provide more specific user feedback based on error type
             switch (error.name) {
                case 'InvalidPDFException':
                case 'FormatError':
                    userMessage = "Error: Invalid PDF file structure. The file might be corrupted or not a valid PDF."; break;
                case 'MissingPDFException':
                    userMessage = `Error: PDF file not found. Checked path: <code>${escapeHtml(pdfPath)}</code>`; break;
                case 'NetworkError':
                    userMessage = `Error: Network problem loading PDF. Check your connection and the file path: <code>${escapeHtml(pdfPath)}</code>`; break;
                case 'UnknownErrorException':
                     userMessage = `Error: An unknown error occurred loading the PDF. Check console. Path: <code>${escapeHtml(pdfPath)}</code>`; break;
                case 'UnexpectedResponseException':
                     // Display server status if available
                     const statusText = error.status ? ` (Status: ${error.status})` : '';
                     userMessage = `Error: Server responded unexpectedly${statusText}. Path: <code>${escapeHtml(pdfPath)}</code>`; break;
                case 'PasswordException':
                     userMessage = `Error: The PDF file is password protected and cannot be displayed.`; break;
                default:
                    userMessage = `Error loading PDF (${error.name || 'Unknown Type'}): ${error.message || 'No details'}. Path: <code>${escapeHtml(pdfPath)}</code>`;
             }
             // Display error in the viewer container
             pdfViewerContainer.innerHTML = `<div class="p-4 text-center text-red-600 dark:text-red-400">${userMessage}</div>`;
             // Ensure controls remain hidden and buttons disabled
             pdfControls.classList.add('hidden');
             pdfExplainButton.disabled = true;
             askFullDocButton.disabled = true;
             cleanupPdfViewer(); // Clean up potentially partially initialized state
        });
        // *** END MODIFICATION ***

    } catch (error) {
        // Catch synchronous errors during initialization (e.g., pdfjsLib not defined)
        console.error("Synchronous error during PDF viewer initialization:", error);
        pdfViewerContainer.innerHTML = `<p class="text-red-500 p-4">Error initializing PDF viewer: ${error.message}. Check console for details.</p>`;
        pdfControls.classList.add('hidden');
        pdfExplainButton.disabled = true;
         askFullDocButton.disabled = true;
        cleanupPdfViewer(); // Clean up state
    }
}


async function renderPdfPage(num) {
    // Prevent concurrent rendering or rendering if pdfDoc is not loaded
    if (!pdfDoc || pdfPageRendering) {
        if (!pdfDoc) console.warn("renderPdfPage called but pdfDoc is null.");
        if (pdfPageRendering) pdfPageNumPending = num; // Queue the page if already rendering
        return;
    }

    pdfPageRendering = true; // Set rendering flag
    // Update page number display and button states
    document.getElementById('pdf-page-num').textContent = num;
    document.getElementById('pdf-prev').disabled = (num <= 1);
    document.getElementById('pdf-next').disabled = (num >= pdfTotalPages); // Use stored total pages

    try {
        // console.log(`Rendering page ${num}...`);
        const page = await pdfDoc.getPage(num);
        const viewport = page.getViewport({ scale: pdfScale }); // Get viewport with current scale

        // Ensure canvas and context are still valid
        if (!pdfCanvas || !pdfCtx) { throw new Error("PDF canvas or context missing during render."); }

        // Set canvas dimensions to match viewport
        pdfCanvas.height = viewport.height;
        pdfCanvas.width = viewport.width;

        // Prepare rendering context
        const renderContext = {
            canvasContext: pdfCtx,
            viewport: viewport
        };

        // Start rendering task
        const renderTask = page.render(renderContext);
        await renderTask.promise; // Wait for rendering to complete
        // console.log(`Page ${num} rendered successfully.`);

    } catch (error) {
         console.error(`Error rendering page ${num}:`, error);
          // Display error message on the canvas if possible
          if (pdfCtx && pdfCanvas) {
               pdfCtx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height); // Clear previous content
               pdfCtx.fillStyle = 'red';
               pdfCtx.font = '16px sans-serif';
               pdfCtx.textAlign = 'center';
               pdfCtx.fillText(`Error rendering page ${num}. See console.`, pdfCanvas.width / 2, pdfCanvas.height / 2);
          }
    } finally {
        pdfPageRendering = false; // Reset rendering flag
        // Check if another page was queued while rendering
        if (pdfPageNumPending !== null) {
            const pendingPage = pdfPageNumPending;
            pdfPageNumPending = null; // Clear pending flag
            renderPdfPage(pendingPage); // Render the queued page
        }
    }
}

// Helper function to queue page rendering if needed
function queueRenderPage(num) {
    if (pdfPageRendering) {
        pdfPageNumPending = num;
    } else {
        renderPdfPage(num);
    }
}

// MODIFIED: Update progress on page change only if not viewer
function onPrevPage() {
    if (pdfPageNum <= 1) return; // Already on the first page
    pdfPageNum--;
    // Check if user is enrolled and not a viewer before updating progress
    const progress = userCourseProgressMap.get(currentCourseIdInternal);
    if (progress && progress.enrollmentMode !== 'viewer') {
        updatePdfProgressAndCheckCompletion(pdfPageNum); // Update progress (includes saving and study check)
    }
    queueRenderPage(pdfPageNum); // Render the new page
}

function onNextPage() {
    // Ensure pdfDoc is loaded and not on the last page
     if (!pdfDoc || pdfPageNum >= pdfTotalPages) return; // Use stored total pages
    pdfPageNum++;
     // Check if user is enrolled and not a viewer before updating progress
     const progress = userCourseProgressMap.get(currentCourseIdInternal);
     if (progress && progress.enrollmentMode !== 'viewer') {
        updatePdfProgressAndCheckCompletion(pdfPageNum); // Update progress (includes saving and study check)
    }
    queueRenderPage(pdfPageNum); // Render the new page
}

// NEW: Helper to update PDF progress state and check completion
async function updatePdfProgressAndCheckCompletion(newPageNum) {
      // Basic validation
      if (!currentUser || !currentCourseIdInternal || !currentChapterNumber) {
          console.warn("updatePdfProgress: Missing user/course/chapter context.");
          return;
      }
     const progress = userCourseProgressMap.get(currentCourseIdInternal);

     // Do nothing if viewer mode or progress data missing
     if (!progress || progress.enrollmentMode === 'viewer') {
          console.log("Viewer mode or no progress data, skipping PDF progress update.");
          return;
     }

     // Ensure nested structure exists
     progress.pdfProgress = progress.pdfProgress || {};
     progress.pdfProgress[currentChapterNumber] = progress.pdfProgress[currentChapterNumber] || { currentPage: 0, totalPages: pdfTotalPages || 0 };

     const currentProgressData = progress.pdfProgress[currentChapterNumber];
     const currentStoredPage = currentProgressData.currentPage || 0;
     let progressChanged = false;

     // Update currentPage only if the new page number is higher (representing forward progress)
     if (newPageNum > currentStoredPage) {
         currentProgressData.currentPage = newPageNum;
         progressChanged = true;
     }

     // Update totalPages if it has changed (e.g., PDF loaded for the first time or changed)
     if (pdfTotalPages > 0 && currentProgressData.totalPages !== pdfTotalPages) {
          currentProgressData.totalPages = pdfTotalPages;
          progressChanged = true;
     }

     // Only save and check completion if progress actually changed
     if (progressChanged) {
         console.log(`Updating PDF progress for Ch ${currentChapterNumber}: Page ${currentProgressData.currentPage} / ${currentProgressData.totalPages}`);
         updateUserCourseProgress(currentCourseIdInternal, { pdfProgress: progress.pdfProgress }); // Update local state

         try {
             await saveUserCourseProgress(currentUser.uid, currentCourseIdInternal, progress); // Save to Firestore
             console.log("PDF progress saved successfully.");
             // After saving, check if this update makes the chapter studied
             await checkAndMarkChapterStudied(currentCourseIdInternal, currentChapterNumber);
         } catch (error) {
              console.error("Failed to save PDF progress:", error);
              // Optionally notify the user or implement retry logic
         }
     } else {
          // console.log(`PDF Page ${newPageNum} not higher than stored page ${currentStoredPage} and total pages unchanged. No progress update needed.`);
     }
}



export async function handlePdfSnapshotForAI() {
      if (!pdfCanvas || !currentChapterNumber || !pdfPageNum) {
         alert("Cannot ask AI: PDF context (canvas, chapter, page number) missing.");
         return;
      }
     // Prompt user for their question about the current page
     const userQuestion = prompt(`Ask a question about the current PDF page (Chapter ${currentChapterNumber}, Page ${pdfPageNum}):`);
     // Exit if user cancels or enters empty question
     if (!userQuestion || userQuestion.trim() === "") return;

     showLoading("Generating AI explanation for PDF page...");
     const explanationArea = document.getElementById('ai-explanation-area');
     const explanationContent = document.getElementById('ai-explanation-content'); // Target inner content div

     // Ensure UI elements for displaying the explanation exist
     if (!explanationArea || !explanationContent) {
         console.error("AI Explanation UI elements not found (#ai-explanation-area, #ai-explanation-content).");
         hideLoading();
         return;
     }

     // Clear previous history when asking about a *new* snapshot/page
     currentPdfExplanationHistory = [];

     // Show loading indicator in the AI panel
     explanationContent.innerHTML = `<div class="flex items-center justify-center space-x-2 p-4"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-sm text-muted">Capturing page and generating explanation...</p></div>`;
     explanationArea.classList.remove('hidden'); // Make panel visible

     try {
          // Capture current canvas content as JPEG data URL
          const imageDataUrl = pdfCanvas.toDataURL('image/jpeg', 0.85); // Use JPEG for smaller size, adjust quality (0.85)
          const base64ImageData = imageDataUrl.split(',')[1]; // Extract base64 data
          if (!base64ImageData) throw new Error("Failed to capture image data from canvas.");

          // Provide context to the AI
          const context = `User is asking about PDF page ${pdfPageNum} for Chapter ${currentChapterNumber}.`;

          console.log(`Sending snapshot of Ch ${currentChapterNumber} Pg ${pdfPageNum} to AI.`);
          // Call AI function (assuming it now manages history internally)
          const result = await getExplanationForPdfSnapshot(userQuestion, base64ImageData, context, []); // Start with empty history

          currentPdfExplanationHistory = result.history; // Store the returned history
          explanationContent.innerHTML = `<div class="ai-chat-turn">${result.explanationHtml}</div>`; // Display initial explanation
          await renderMathIn(explanationContent); // Render any MathJax

          // Remove any existing follow-up input before adding a new one
          explanationArea.querySelector('.pdf-follow-up-container')?.remove();

          // Add follow-up input area
           const followUpInputHtml = `
               <div class="pdf-follow-up-container flex gap-2 mt-2 pt-2 border-t dark:border-gray-600 p-2 flex-shrink-0">
                   <input type="text" id="pdf-follow-up-input" class="flex-grow text-sm p-1 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Ask a follow-up...">
                   <button onclick="window.askPdfFollowUp()" class="btn-secondary-small text-xs flex-shrink-0">Ask</button>
               </div>`;
           explanationArea.insertAdjacentHTML('beforeend', followUpInputHtml); // Append to the main AI area div

          hideLoading(); // Hide global loading indicator
     } catch(error) {
          hideLoading();
          console.error("Error getting PDF snapshot explanation:", error);
          explanationContent.innerHTML = `<p class="text-danger text-sm p-3">Error generating explanation: ${error.message}</p>`;
          // Optionally hide the panel again on error or keep it open with the error message
          // explanationArea.classList.add('hidden');
     }
}

// Internal function to handle text explanation requests
async function handleExplainSelectionInternal(selectedText, context, source, historyContainer) { // source: 'transcription' or 'pdf_text'
    const explanationArea = document.getElementById('ai-explanation-area');
    const explanationContent = document.getElementById('ai-explanation-content'); // Target inner content div
    if (!explanationArea || !explanationContent) {
        console.error("AI Explanation UI elements not found.");
        return;
    }

    // Reset the specified history container (passed by reference)
    historyContainer.length = 0; // Clear the array directly

    // Show loading in the AI panel
    explanationContent.innerHTML = `<div class="flex items-center justify-center space-x-2 p-4"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-sm text-muted">Generating explanation...</p></div>`;
    explanationArea.classList.remove('hidden');

    try {
        console.log(`Requesting explanation for ${source}: "${selectedText.substring(0, 50)}..."`);
        // Initial call, pass empty history (which is historyContainer)
        const result = await explainStudyMaterialSnippet(selectedText, context, historyContainer);

        // The historyContainer array should now be populated by explainStudyMaterialSnippet
        // No need to reassign: historyContainer = result.history;

        explanationContent.innerHTML = `<div class="ai-chat-turn">${result.explanationHtml}</div>`; // Wrap initial response
        await renderMathIn(explanationContent); // Render MathJax if any

        // Remove any existing follow-up input before adding a new one
        explanationArea.querySelector('.text-follow-up-container')?.remove();

        // Add follow-up input, passing the source type to the handler
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

// Wrapper function called by UI for explaining selected transcription text
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
    // Ensure context is available
    if (!currentTranscriptionData || currentTranscriptionData.length === 0 || !currentChapterNumber) {
        alert("Cannot explain: Transcription context missing.");
        return;
    }
    // Provide context for the AI
    const context = `From Transcription for Chapter ${currentChapterNumber}.`;
    // Include the full transcription text for better context (limit length)
    const fullTranscriptionText = currentTranscriptionData.map(e => e.text).join(' ');
    const fullContext = `Context: ${context}\n\nFull Transcription Text (for context):\n${fullTranscriptionText.substring(0, 5000)}${fullTranscriptionText.length > 5000 ? '...' : ''}`;

    // Call internal handler, passing the specific history array for transcriptions
    handleExplainSelectionInternal(selectedText, fullContext, 'transcription', currentTranscriptionExplanationHistory);
}

// Wrapper function called by UI for asking a question about the transcription
export function askQuestionAboutTranscription() {
      // Ensure context is available
      if (!currentTranscriptionData || currentTranscriptionData.length === 0 || !currentChapterNumber) { alert("Cannot ask question: Transcription context missing."); return; }

     // Prompt user for their question
     const userQuestion = prompt(`Ask a question about the transcription for Chapter ${currentChapterNumber}:`);
     if (!userQuestion || userQuestion.trim() === "") return; // Exit if cancelled or empty

     // Provide context for the AI
     const context = `About the Transcription for Chapter ${currentChapterNumber}.`;
     // Include the full transcription text for better context (limit length)
     const fullTranscriptionText = currentTranscriptionData.map(e => e.text).join(' ');
     const fullContext = `Context: ${context}\n\nFull Transcription Text (for context):\n${fullTranscriptionText.substring(0, 8000)}${fullTranscriptionText.length > 8000 ? '...' : ''}`;

     // Call internal handler with the user's question as the "snippet"
     // Pass the specific history array for transcriptions
     handleExplainSelectionInternal(userQuestion, fullContext, 'transcription', currentTranscriptionExplanationHistory);
}

// Follow-up function for text explanations (Transcription or potentially PDF Text)
window.askTextFollowUp = async (source) => {
    const inputElement = document.getElementById('text-follow-up-input');
    const explanationArea = document.getElementById('ai-explanation-area');
    const explanationContent = explanationArea?.querySelector('#ai-explanation-content'); // Target specific content area

    // Determine which history array to use based on the source
    let history = (source === 'transcription') ? currentTranscriptionExplanationHistory : []; // Add logic for PDF text later if needed

    if (!inputElement || !explanationContent || !history) {
        console.error("askTextFollowUp: Missing input, content area, or history array.");
        return;
    }

    const followUpText = inputElement.value.trim();
    if (!followUpText) return; // Ignore empty input

    // Disable input while processing
    inputElement.disabled = true;
    const askButton = inputElement.nextElementSibling; // Assuming button is next sibling
    if (askButton) askButton.disabled = true;

    // Display user's follow-up question immediately
    explanationContent.insertAdjacentHTML('beforeend', `<div class="ai-chat-turn mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"><p class="text-sm font-medium text-gray-700 dark:text-gray-300">You:</p><div class="prose prose-sm dark:prose-invert max-w-none">${escapeHtml(followUpText)}</div></div>`);
    // Add loading indicator for AI response
    const loadingHtml = `<div class="ai-chat-turn ai-loading mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p><div class="flex items-center space-x-2 mt-1"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-xs text-muted">Thinking...</p></div></div>`;
    explanationContent.insertAdjacentHTML('beforeend', loadingHtml);
    explanationArea.scrollTop = explanationArea.scrollHeight; // Scroll main container to bottom

    try {
        console.log(`Sending text follow-up for ${source}: "${followUpText.substring(0, 50)}..."`);
        // Call API using the existing history
        // The history array reference is passed and will be updated by the function
        const result = await explainStudyMaterialSnippet(followUpText, null, history); // Pass follow-up as snippet, null context, use history

        // History array (e.g., currentTranscriptionExplanationHistory) is updated automatically

        // Remove loader and display AI response
        explanationContent.querySelector('.ai-loading')?.remove(); // Remove loader
        explanationContent.insertAdjacentHTML('beforeend', `<div class="ai-chat-turn mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p>${result.explanationHtml}</div>`);
        inputElement.value = ''; // Clear input field
        await renderMathIn(explanationContent); // Render MathJax
        explanationArea.scrollTop = explanationArea.scrollHeight; // Scroll main container to bottom

    } catch (error) {
        console.error("Error asking text follow-up:", error);
        explanationContent.querySelector('.ai-loading')?.remove();
        explanationContent.insertAdjacentHTML('beforeend', `<p class="text-danger text-sm mt-2 p-1">Error getting follow-up: ${error.message}</p>`);
    } finally {
        // Re-enable input
        inputElement.disabled = false;
        if (askButton) askButton.disabled = false;
        inputElement.focus(); // Set focus back to input
    }
};

// Follow-up function for PDF Snapshot explanations
window.askPdfFollowUp = async () => {
     const inputElement = document.getElementById('pdf-follow-up-input');
     const explanationArea = document.getElementById('ai-explanation-area');
     const explanationContent = explanationArea?.querySelector('#ai-explanation-content'); // Target specific content area
     let history = currentPdfExplanationHistory; // Use PDF specific history

     if (!inputElement || !explanationContent || !history) {
         console.error("askPdfFollowUp: Missing input, content area, or history array.");
         return;
     }

     const followUpText = inputElement.value.trim();
     if (!followUpText) return; // Ignore empty input

     // Disable input while processing
     inputElement.disabled = true;
     const askButton = inputElement.nextElementSibling;
     if (askButton) askButton.disabled = true;

     // Display user's follow-up question
     explanationContent.insertAdjacentHTML('beforeend', `<div class="ai-chat-turn mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"><p class="text-sm font-medium text-gray-700 dark:text-gray-300">You:</p><div class="prose prose-sm dark:prose-invert max-w-none">${escapeHtml(followUpText)}</div></div>`);
     // Add loading indicator
     const loadingHtml = `<div class="ai-chat-turn ai-loading mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p><div class="flex items-center space-x-2 mt-1"><div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div><p class="text-xs text-muted">Thinking...</p></div></div>`;
     explanationContent.insertAdjacentHTML('beforeend', loadingHtml);
     explanationArea.scrollTop = explanationArea.scrollHeight; // Scroll down

     try {
          console.log(`Sending PDF follow-up: "${followUpText.substring(0, 50)}..."`);
          // Re-call the snapshot explanation function, passing the *existing* history.
          // The function should handle appending the new user message and getting the AI response.
          // We pass null for image data on follow-up, as the context is maintained in the history.
          const result = await getExplanationForPdfSnapshot(followUpText, null, `Follow-up on Chapter ${currentChapterNumber}, Page ${pdfPageNum}`, history);

          // History (currentPdfExplanationHistory) is updated automatically by reference

          // Remove loader and display AI response
          explanationContent.querySelector('.ai-loading')?.remove();
          explanationContent.insertAdjacentHTML('beforeend', `<div class="ai-chat-turn mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"><p class="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tutor:</p>${result.explanationHtml}</div>`);
          inputElement.value = ''; // Clear input
          await renderMathIn(explanationContent); // Render MathJax
          explanationArea.scrollTop = explanationArea.scrollHeight; // Scroll down

     } catch (error) {
          console.error("Error asking PDF follow-up:", error);
          explanationContent.querySelector('.ai-loading')?.remove();
          explanationContent.insertAdjacentHTML('beforeend', `<p class="text-danger text-sm mt-2 p-1">Error getting follow-up: ${error.message}</p>`);
     } finally {
          // Re-enable input
          inputElement.disabled = false;
          if (askButton) askButton.disabled = false;
          inputElement.focus(); // Set focus back
     }
};


// MODIFIED: Use USER specific load/save
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
    const regenerateBtn = document.querySelector('#formula-sheet-area button[onclick*="true"]'); // Find regenerate button


    // Ensure UI elements exist
    if (!formulaArea || !formulaContent || !downloadBtn || !regenerateBtn) {
        console.error("Missing UI elements for formula sheet display. Cannot proceed.");
        // Attempt to add an error message to the main content area if possible
        const mainContentArea = document.getElementById('study-material-content-area') || document.getElementById('course-dashboard-area');
        if (mainContentArea) {
            mainContentArea.insertAdjacentHTML('beforeend', `<p class="text-red-500 p-4 text-center">Error: UI components for formula sheet are missing.</p>`);
        }
        return;
    }

    // Show the area, set loading state
    formulaArea.classList.remove('hidden');
    downloadBtn.classList.add('hidden'); // Hide download initially
    regenerateBtn.disabled = true; // Disable regenerate during load/generation
    formulaContent.innerHTML = `<div class="flex items-center justify-center p-4"><div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div><p class="ml-3 text-sm text-muted">Loading Formula Sheet...</p></div>`;

    let cachedSheet = null;
    // Try loading from cache unless forceRegenerate is true
    if (!forceRegenerate) {
        try {
            console.log(`Attempting to load cached formula sheet for user ${currentUser.uid}, course ${courseId}, chapter ${chapterNum}`);
            cachedSheet = await loadUserFormulaSheet(currentUser.uid, courseId, chapterNum);
        } catch (error) {
            // Log error but proceed to generate if cache load fails
            console.error("Error loading cached user formula sheet:", error);
        }
    } else {
        console.log("Force regenerate flag set, skipping cache check for formula sheet.");
    }

    // If cached sheet found, display it
    if (cachedSheet) {
        console.log("Using cached user formula sheet from Firestore.");
        formulaContent.innerHTML = cachedSheet;
        try {
            await renderMathIn(formulaContent); // Render MathJax
            downloadBtn.classList.remove('hidden'); // Show download button
        } catch (renderError) {
             console.error("Error rendering MathJax in cached formula sheet:", renderError);
             formulaContent.innerHTML += `<p class="text-red-500 text-xs mt-1">Error rendering math content.</p>`;
        }
        regenerateBtn.disabled = false; // Re-enable regenerate button
        return; // Stop here, no need to generate
    }

    // If no cache or forceRegenerate, generate a new one
    console.log(`Generating new formula sheet for course ${courseId}, chapter ${chapterNum}`);
    try {
        const sheetHtml = await generateFormulaSheet(courseId, chapterNum);
        formulaContent.innerHTML = sheetHtml; // Display generated content

        // Check if generation seemed successful before enabling download/saving
        const generationFailed = sheetHtml.includes('Error generating') ||
                                 sheetHtml.includes('No text content available') ||
                                 sheetHtml.includes('bigger than the model') ||
                                 sheetHtml.includes('Loading Formula Sheet...'); // Check for loading message too

        if (!generationFailed && sheetHtml.trim() !== "") {
             try {
                await renderMathIn(formulaContent); // Render MathJax
                downloadBtn.classList.remove('hidden'); // Show download button
                // Attempt to save the newly generated sheet to user's cache
                await saveUserFormulaSheet(currentUser.uid, courseId, chapterNum, sheetHtml);
                console.log("Successfully saved generated formula sheet to user document.");
            } catch (saveOrRenderError) {
                 if (saveOrRenderError.message.includes('MathJax')) {
                     console.error("Error rendering MathJax in generated formula sheet:", saveOrRenderError);
                     formulaContent.innerHTML += `<p class="text-red-500 text-xs mt-1">Error rendering math content.</p>`;
                 } else {
                    console.error("Failed to save generated formula sheet:", saveOrRenderError);
                    // Optionally notify user of save failure
                 }
                // Still allow download even if save/render fails? Maybe hide download button.
                 downloadBtn.classList.add('hidden');
            }
        } else {
            console.warn("AI generation indicated an issue, or content is empty. Not caching or enabling download for formula sheet.");
            formulaContent.innerHTML = sheetHtml || '<p class="text-yellow-500 p-2">Formula sheet generation resulted in empty content or an error.</p>'; // Ensure some message is shown
            downloadBtn.classList.add('hidden'); // Ensure download is hidden if generation failed or empty
        }
    } catch (error) {
        console.error("Error generating/displaying formula sheet:", error);
        // Display error message and retry button
        formulaContent.innerHTML = `
            <div class="p-4 text-center">
                <p class="text-danger mb-2">Error generating formula sheet: ${error.message || 'Unknown error'}</p>
                <button onclick="window.displayFormulaSheetWrapper('${courseId}', ${chapterNum}, true)"
                        class="btn-secondary-small">
                    Retry Generation
                </button>
            </div>
        `;
        downloadBtn.classList.add('hidden'); // Ensure download is hidden on error
    } finally {
        regenerateBtn.disabled = false; // Always re-enable regenerate button at the end
    }
}
// Wrapper function for window scope
window.displayFormulaSheetWrapper = (courseId, chapterNum, forceRegenerate = false) => {
    displayFormulaSheet(courseId, chapterNum, forceRegenerate);
};


export async function downloadFormulaSheetPdf() {
     const formulaContentElement = document.getElementById('formula-sheet-content');
    if (!formulaContentElement || !currentChapterNumber || !currentCourseIdInternal) {
         alert("Cannot download: Formula sheet content or course/chapter context missing.");
         return;
     }
    const courseName = globalCourseDataMap.get(currentCourseIdInternal)?.name || 'Course';
    const filename = `Formula_Sheet_${courseName.replace(/[^a-zA-Z0-9]/g, '_')}_Ch${currentChapterNumber}`;

    showLoading(`Generating ${filename}.pdf...`);
    try {
        let sheetHtml = formulaContentElement.innerHTML;

        // --- ADDED VALIDATION ---
        if (!sheetHtml || sheetHtml.trim() === "" ||
            sheetHtml.includes('Error generating') ||
            sheetHtml.includes('No text content available') ||
            sheetHtml.includes('Loading Formula Sheet...')) {
            alert("Valid formula sheet content not available for PDF generation. Please ensure the sheet is loaded correctly.");
            throw new Error("Valid formula sheet content not available for PDF generation.");
        }
        console.log("Formula Sheet PDF - sheetHtml (first 500 chars):", sheetHtml.substring(0, 500));
        // --- END ADDED VALIDATION ---

        const printHtml = `<!DOCTYPE html>
        <html>
        <head>
            <title>${escapeHtml(filename)}</title>
            <meta charset="UTF-8">
            <script>
                MathJax = {
                    tex: { inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$'], ['\\[', '\\]']] },
                    svg: { fontCache: 'global' }
                };
            </script>
            <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
            <style>
                body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; margin: 2cm; }
                .prose { max-width: none; }
                mjx-container[jax="SVG"] > svg { vertical-align: -0.15ex; }
                h2, h3, h4 { margin-top: 1.5em; margin-bottom: 0.5em; }
            </style>
        </head>
        <body>
            <h2 style="text-align: center;">Formula Sheet - Chapter ${currentChapterNumber}</h2>
            <div class="prose">
                ${sheetHtml}
            </div>
        </body>
        </html>`;

        await generateAndDownloadPdfWithMathJax(printHtml, filename);

    } catch (error) {
        console.error("Error generating formula sheet PDF:", error);
        // Alert is now conditional based on the error source. If it's from our validation, it's already alerted.
        if (!error.message.includes("Valid formula sheet content not available")) {
            alert(`Failed to generate PDF for formula sheet: ${error.message}`);
        }
    } finally {
        hideLoading();
    }
}
window.downloadFormulaSheetPdf = downloadFormulaSheetPdf;

// MODIFIED: Use USER specific load/save
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
     if (!summaryContentElement || !currentChapterNumber || !currentCourseIdInternal) {
         alert("Cannot download: Summary content or course/chapter context missing.");
         return;
     }
    const courseName = globalCourseDataMap.get(currentCourseIdInternal)?.name || 'Course';
    const filename = `Chapter_Summary_${courseName.replace(/[^a-zA-Z0-9]/g, '_')}_Ch${currentChapterNumber}`;

    showLoading(`Generating ${filename}.pdf...`);
    try {
        let summaryHtml = summaryContentElement.innerHTML;

        // --- ADDED VALIDATION ---
        if (!summaryHtml || summaryHtml.trim() === "" ||
            summaryHtml.includes('Error generating') ||
            summaryHtml.includes('No text content available') ||
            summaryHtml.includes('Loading Chapter Summary...')) {
            alert("Valid summary content not available for PDF generation. Please ensure the summary is loaded correctly.");
            throw new Error("Valid summary content not available for PDF generation.");
        }
        console.log("Chapter Summary PDF - summaryHtml (first 500 chars):", summaryHtml.substring(0, 500));
        // --- END ADDED VALIDATION ---

        const printHtml = `<!DOCTYPE html>
        <html>
        <head>
            <title>${escapeHtml(filename)}</title>
             <meta charset="UTF-8">
            <script>
                MathJax = {
                    tex: { inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$'], ['\\[', '\\]']] },
                    svg: { fontCache: 'global' }
                };
            </script>
            <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
            <style>
                 body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; margin: 2cm; }
                 .prose { max-width: none; }
                 mjx-container[jax="SVG"] > svg { vertical-align: -0.15ex; }
                 h2, h3, h4 { margin-top: 1.5em; margin-bottom: 0.5em; }
            </style>
        </head>
        <body>
            <h2 style="text-align: center;">Chapter Summary - Chapter ${currentChapterNumber}</h2>
             <div class="prose">
                 ${summaryHtml}
             </div>
        </body>
        </html>`;
        await generateAndDownloadPdfWithMathJax(printHtml, filename);
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


async function askAboutFullPdf() {
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
                 <button onclick="this.closest('#ai-explanation-area').classList.add('hidden'); this.closest('#ai-explanation-area').querySelector('#ai-explanation-content').innerHTML='';" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600" title="Close AI Tutor">
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
     if (!currentUser || !data) { alert("Log in and load data required."); return; }
     const courseDef = globalCourseDataMap.get(courseId);
     if (!courseDef) { alert("Course definition not found."); return; }

     const skipExamThreshold = courseDef.skipExamPassingPercent || SKIP_EXAM_PASSING_PERCENT;
     if (!confirm(`Generate and start a Skip Exam for Chapter ${chapterNum} using existing chapter questions?\nPassing this exam (${skipExamThreshold}%) will mark the chapter as studied.`)) return;

     showLoading(`Preparing Skip Exam for Chapter ${chapterNum}...`);

     try {
         const relatedSubjectId = courseDef.relatedSubjectId;
         if (!relatedSubjectId) throw new Error("Course definition is missing the related subject ID.");
         const subject = data.subjects?.[relatedSubjectId];
         if (!subject) throw new Error(`Subject data not found for ID: ${relatedSubjectId}`);
         const subjectMdFilename = subject.fileName;
         if (!subjectMdFilename) throw new Error(`Markdown filename not found for subject: ${subject.name}`);

         let mdContent;
         try {
             const response = await fetch(`./${subjectMdFilename}?cacheBust=${Date.now()}`);
             if (!response.ok) {
                 throw new Error(`HTTP error ${response.status} fetching ${subjectMdFilename}`);
             }
             mdContent = await response.text();
             if (!mdContent) throw new Error(`Markdown file "${subjectMdFilename}" is empty or could not be read.`);
             console.log(`Fetched MD content for ${subjectMdFilename}`);
         } catch (fetchError) {
             console.error("Error fetching subject Markdown:", fetchError);
             throw new Error(`Could not load questions file: ${subjectMdFilename}. ${fetchError.message}`);
         }

         const chapterData = subject.chapters?.[chapterNum];
         const availableQNumbers = chapterData?.available_questions;
         if (!availableQNumbers || availableQNumbers.length === 0) {
             throw new Error(`No MCQs available for Chapter ${chapterNum} in subject "${subject.name}". Check the Markdown file and data state.`);
         }
         console.log(`Available MCQs for Ch ${chapterNum}: ${availableQNumbers.join(', ')}`);

         const skipExamMcqCount = EXAM_QUESTION_COUNTS.skip_exam || 20;
         if (availableQNumbers.length < skipExamMcqCount) {
             console.warn(`Chapter ${chapterNum} has only ${availableQNumbers.length} available MCQs, less than the desired ${skipExamMcqCount}. Using all available.`);
         }

         const shuffledNumbers = [...availableQNumbers];
         for (let i = shuffledNumbers.length - 1; i > 0; i--) {
             const j = Math.floor(Math.random() * (i + 1));
             [shuffledNumbers[i], shuffledNumbers[j]] = [shuffledNumbers[j], shuffledNumbers[i]];
         }

         const selectedNumbersList = shuffledNumbers.slice(0, skipExamMcqCount);
         if (selectedNumbersList.length === 0) {
            throw new Error(`Failed to select any MCQs for Chapter ${chapterNum}.`);
         }
         console.log(`Selected ${selectedNumbersList.length} MCQs for Skip Exam: ${selectedNumbersList.join(', ')}`);

         const selectedMcqMap = { [chapterNum]: selectedNumbersList };
         const extracted = extractQuestionsFromMarkdown(mdContent, selectedMcqMap);

         if (!extracted || !extracted.questions || extracted.questions.length === 0) {
             console.error("Extraction Map:", selectedMcqMap);
             throw new Error(`Failed to extract the selected MCQs (${selectedNumbersList.join(', ')}) from "${subjectMdFilename}". Check Markdown formatting.`);
         }
         if (extracted.questions.length < selectedNumbersList.length) {
             console.warn(`Extraction Warning: Requested ${selectedNumbersList.length} MCQs, but only extracted ${extracted.questions.length}. Some might be missing/malformed in the MD file.`);
         }
         console.log(`Successfully extracted ${extracted.questions.length} MCQs for skip exam.`);

         const examId = `${courseId}-skip-ch${chapterNum}-${Date.now()}`;
         const durationMinutes = EXAM_DURATIONS_MINUTES.skip_exam || Math.max(15, Math.min(60, Math.round(extracted.questions.length * 1.5)));

         const onlineTestState = {
             examId: examId,
             questions: extracted.questions,
             correctAnswers: extracted.answers,
             userAnswers: {},
             allocation: null,
             startTime: Date.now(),
             timerInterval: null,
             currentQuestionIndex: 0,
             status: 'active',
             durationMinutes: durationMinutes,
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
          console.error(`Error preparing Skip Exam for Chapter ${chapterNum}:`, error);
          alert(`Could not start Skip Exam: ${error.message}`);
     }
}
window.triggerSkipExamGenerationWrapper = (courseId, chapterNum) => triggerSkipExamGeneration(courseId, chapterNum);
window.showCurrentCourseDashboard = showCurrentCourseDashboard;

// --- END OF FILE ui_course_study_material.js ---