// --- START OF FILE ui_course_content_menu.js ---

// ui_course_content_menu.js
import { currentUser, globalCourseDataMap, activeCourseId, userCourseProgressMap } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js';
// *** CORRECTED Import: Ensure all needed functions are imported ***
import { showCourseStudyMaterial, triggerSkipExamGeneration, calculateChapterCombinedProgress, getYouTubeVideoId, videoDurationMap } from './ui_course_study_material.js'; // Ensure triggerSkipExamGeneration is imported
import { startAssignmentOrExam } from './ui_course_assignments_exams.js';
import { SKIP_EXAM_PASSING_PERCENT, YOUTUBE_API_KEY } from './config.js'; // Import config
import { showMyCoursesDashboard } from './ui_course_dashboard.js';

// --- Helper to get SRT filename (remains same) ---
function getSrtFilenameFromTitle(title) {
     if (!title) return null;
     const cleanedTitle = title.replace(/[<>:"\/\\|?*]+/g, '').trim();
     return `${cleanedTitle}.srt`;
}

// --- Function to fetch video durations (remains same) ---
async function fetchVideoDurations(videoIds) {
    if (!videoIds || videoIds.length === 0) return {};
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === "YOUR_API_KEY_HERE") {
        console.warn("YouTube API Key not configured. Cannot fetch video durations.");
        // Return only existing cache if API key missing
        return videoDurationMap;
    }

    // Use the global videoDurationMap from ui_course_study_material
    const idsToFetch = videoIds.filter(id => videoDurationMap[id] === undefined);
    if (idsToFetch.length === 0) {
        // console.log("All video durations already cached.");
        return videoDurationMap;
    }

    console.log(`Fetching durations for ${idsToFetch.length} videos...`);
    const MAX_IDS_PER_REQUEST = 50;
    const fetchedDurations = {}; // Track newly fetched ones for logging

    try {
        for (let i = 0; i < idsToFetch.length; i += MAX_IDS_PER_REQUEST) {
            const chunkIds = idsToFetch.slice(i, i + MAX_IDS_PER_REQUEST);
            const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${chunkIds.join(',')}&key=${YOUTUBE_API_KEY}`;
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json();
                console.error("YouTube API Error fetching durations:", errorData);
                throw new Error(`YouTube API Error: ${response.status} ${errorData?.error?.message || 'Failed to fetch durations'}`);
            }
            const data = await response.json();
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
                        fetchedDurations[item.id] = totalSeconds;
                        videoDurationMap[item.id] = totalSeconds; // Update global cache
                    } else {
                         console.warn(`Could not parse duration string "${durationStr}" for video ${item.id}`);
                         fetchedDurations[item.id] = null;
                         videoDurationMap[item.id] = null; // Cache null
                    }
                } else {
                     // Cache null if ID or duration is missing in response item
                     if (item.id) videoDurationMap[item.id] = null;
                }
            });
        }
        console.log("Fetched durations:", fetchedDurations);
         // Ensure all requested IDs have at least a null entry if API failed for them
         idsToFetch.forEach(id => {
              if (videoDurationMap[id] === undefined) videoDurationMap[id] = null;
         });
        return videoDurationMap; // Return the updated global cache
    } catch (error) {
        console.error("Error fetching video durations:", error);
        // Mark all requested IDs as null on error
        idsToFetch.forEach(id => videoDurationMap[id] = null);
        return videoDurationMap; // Return cache even on error
    }
}


/**
 * Displays the full content menu for a course, listing chapters and related items.
 * @param {string} courseId
 */
export async function displayCourseContentMenu(courseId = activeCourseId) {
    if (!currentUser || !courseId) return;
    setActiveSidebarLink('sidebar-study-material-link', 'sidebar-course-nav');

    const courseDef = globalCourseDataMap.get(courseId);
    const progress = userCourseProgressMap.get(courseId);

    if (!courseDef || !progress) {
        displayContent(`<p class="text-red-500 p-4">Error: Course or progress data not found for ${courseId}.</p>`, 'course-dashboard-area');
        return;
    }

    showLoading("Loading Chapter Details...");

    // --- Pre-fetch all video durations for the course ---
    let allVideoIdsInCourse = new Set();
    for (let i = 1; i <= courseDef.totalChapters; i++) {
        const chapterResources = courseDef.chapterResources?.[i] || {};
        const lectureUrls = (Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : [])
                             .filter(lec => typeof lec === 'object' && lec.url);
        lectureUrls.forEach(lec => { const videoId = getYouTubeVideoId(lec.url); if (videoId) allVideoIdsInCourse.add(videoId); });
    }
    // Fetch durations and update the global cache (videoDurationMap)
    await fetchVideoDurations(Array.from(allVideoIdsInCourse));
    // --- End pre-fetching ---

    hideLoading(); // Hide loading after durations are fetched

    // Overall Course Progress (now based on chapter completion %)
    let totalCourseProgressSum = 0;
    const totalChapters = courseDef.totalChapters || 1;
    for(let i = 1; i <= totalChapters; i++) {
         const chapterResources = courseDef.chapterResources?.[i] || {};
         const lecturesForChapter = (Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : []).filter(lec => typeof lec === 'object' && lec.url && lec.title);
         const videoIdsForChapter = lecturesForChapter.map(lec => getYouTubeVideoId(lec.url)).filter(id => id !== null);
         const chapterVideoDurationMap = {}; videoIdsForChapter.forEach(id => { if (videoDurationMap[id] !== undefined) { chapterVideoDurationMap[id] = videoDurationMap[id]; } });
         const pdfInfo = progress.pdfProgress?.[i] || null;
         // Use the imported combined progress function
         const { percent: chapterPercent } = calculateChapterCombinedProgress(progress, i, chapterVideoDurationMap, pdfInfo);
         totalCourseProgressSum += chapterPercent;
    }
    const overallProgressPercent = totalChapters > 0 ? Math.round(totalCourseProgressSum / totalChapters) : 0;
    const studiedChaptersCount = progress.courseStudiedChapters?.length || 0; // Keep studied count for text display

    let contentHtml = `<div class="animate-fade-in space-y-6">
        <div class="flex justify-between items-center">
             <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(courseDef.name)} - Study Material & Exams</h2>
             <button onclick="window.showCurrentCourseDashboard('${courseId}')" class="btn-secondary-small">Back to Dashboard</button>
        </div>
        <p class="text-sm text-muted">Browse all chapters, access study materials, and take related quizzes or exams.</p>

        <!-- Overall Progress -->
        <div class="mb-4">
            <label class="text-sm font-medium text-gray-600 dark:text-gray-400">Overall Course Completion (${overallProgressPercent}%)</label>
            <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mt-1">
                 <div class="bg-gradient-to-r from-blue-400 to-primary-500 h-2.5 rounded-full transition-all duration-500 ease-out" style="width: ${overallProgressPercent}%" title="${overallProgressPercent}% Complete (${studiedChaptersCount}/${totalChapters} Chapters Marked Studied)"></div>
            </div>
        </div>

        <div class="space-y-3">`;

    // Use courseStudiedChapters array for the "Studied" badge
    const studiedChaptersSet = new Set(progress.courseStudiedChapters || []);

    if (totalChapters === 0) {
         contentHtml += `<p class="text-center text-muted italic p-4">No chapters defined for this course yet.</p>`;
    } else {
        for (let i = 1; i <= totalChapters; i++) {
            const chapterNum = i;
            let chapterTitle = `Chapter ${chapterNum}`;
            if (courseDef.chapters && Array.isArray(courseDef.chapters) && courseDef.chapters.length >= chapterNum) {
                chapterTitle = courseDef.chapters[chapterNum - 1] || chapterTitle;
            }

            const isStudied = studiedChaptersSet.has(chapterNum); // Use this for the badge
            // Use lastSkipExamScore which stores the percentage
            const lastSkipScore = progress.lastSkipExamScore?.[chapterNum];
            const skipAttempts = progress.skipExamAttempts?.[chapterNum] || 0;
            const skipExamPassed = lastSkipScore !== undefined && lastSkipScore >= SKIP_EXAM_PASSING_PERCENT;

            // Check content existence for skip exam
            const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
            const pdfPath = courseDef.pdfPathPattern?.replace('{num}', chapterNum); // Use correct path
            const lecturesForChapter = (Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : []).filter(lec => typeof lec === 'object' && lec.title);
            // Simple check if any lecture video has a derivable SRT filename
            const hasTranscriptionSource = lecturesForChapter.some(lec => getSrtFilenameFromTitle(lec.title));
            // A more robust check would involve trying to fetch the SRT or checking Firestore for pre-processed text
            const canAttemptSkip = pdfPath || hasTranscriptionSource; // Can attempt if PDF OR Transcription exists

            // --- Skip Exam Button Logic ---
             let skipExamStatusHtml = '';
             if (isStudied) {
                  // If studied (either via progress or skip exam pass), show completion status
                  skipExamStatusHtml = `<span class="text-xs text-green-600 dark:text-green-400 font-medium ml-auto">${skipExamPassed ? `(Skip Exam Passed: ${lastSkipScore.toFixed(0)}%)` : '(Progress Complete)'}</span>`;
             } else if (lastSkipScore !== undefined && !skipExamPassed) {
                  // If failed last attempt, allow retry if content exists
                  skipExamStatusHtml = `<button onclick="window.triggerSkipExamGeneration('${courseId}', ${chapterNum})" class="btn-warning-small text-xs ml-auto" ${!canAttemptSkip ? 'disabled title="No content for exam generation"' : `title="Last Score: ${lastSkipScore.toFixed(0)}%. Attempts: ${skipAttempts}. Needs ${SKIP_EXAM_PASSING_PERCENT}%"`}>Retake Skip Exam</button>`;
             } else {
                  // If never attempted or previous result doesn't matter (not yet studied), show Take button if content exists
                  skipExamStatusHtml = `<button onclick="window.triggerSkipExamGeneration('${courseId}', ${chapterNum})" class="btn-secondary-small text-xs ml-auto" ${!canAttemptSkip ? 'disabled title="No content for exam generation"' : `title="Pass (${SKIP_EXAM_PASSING_PERCENT}%) to reach 100% progress"`}>Take Skip Exam</button>`;
             }

            // --- Chapter Progress Bar (Using Combined Progress) ---
            const videoIdsForChapter = lecturesForChapter.map(lec => getYouTubeVideoId(lec.url)).filter(id => id !== null);
            const chapterVideoDurationMap = {}; videoIdsForChapter.forEach(id => { if (videoDurationMap[id] !== undefined) { chapterVideoDurationMap[id] = videoDurationMap[id]; } });
            const pdfInfo = progress.pdfProgress?.[chapterNum] || null; // Get PDF progress info
            // Use the imported combined progress function
            const { percent: chapterCombinedProgress, watchedStr, totalStr } = calculateChapterCombinedProgress(progress, chapterNum, chapterVideoDurationMap, pdfInfo);

            let progressBarHtml = `
                <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1 relative group">
                     <div class="bg-blue-500 h-1.5 rounded-full transition-all duration-500 ease-out" style="width: ${chapterCombinedProgress}%"></div>
                     <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-max p-1.5 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 progress-tooltip-text">
                          Progress: ${watchedStr} / ${totalStr} (${chapterCombinedProgress}%)
                     </div>
                </div>
            `;

            contentHtml += `
                <div class="content-card bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-0 overflow-hidden">
                     <div class="p-3 flex justify-between items-center ${isStudied ? 'bg-green-50 dark:bg-green-900/30' : ''}">
                          <span class="font-semibold text-gray-700 dark:text-gray-200">Chapter ${chapterNum}: ${escapeHtml(chapterTitle)}</span>
                          ${isStudied ? '<span class="text-xs px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100 rounded-full font-medium ml-2">Studied</span>' : ''}
                          ${skipExamStatusHtml} <!-- Added skip exam status/button here -->
                     </div>
                     <div class="p-3 border-t dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 space-y-2 text-sm" id="chapter-progress-${chapterNum}">
                          ${progressBarHtml}
                          <div class="flex flex-wrap gap-2 items-center mt-2">
                               <button onclick="window.showCourseStudyMaterial('${courseId}', ${chapterNum})" class="btn-primary-small text-xs">Study Chapter</button>
                               <!-- Removed skip exam button from here, moved next to chapter title -->
                          </div>
                     </div>
                </div>
            `;
        }
    }

    contentHtml += `</div></div>`;
    displayContent(contentHtml, 'course-dashboard-area');
}

// --- END OF FILE ui_course_content_menu.js ---