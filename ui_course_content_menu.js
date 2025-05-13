// --- START OF FILE ui_course_content_menu.js ---

// ui_course_content_menu.js
import { currentUser, globalCourseDataMap, activeCourseId, userCourseProgressMap } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js';
import { calculateChapterCombinedProgress } from './course_logic.js'; 
import { showCourseStudyMaterial, triggerSkipExamGeneration, getYouTubeVideoId, videoDurationMap, displayChapterSummary } from './ui_course_study_material.js'; 
import { startAssignmentOrExam } from './ui_course_assignments_exams.js';
import { SKIP_EXAM_PASSING_PERCENT, YOUTUBE_API_KEY } from './config.js'; 
import { showMyCoursesDashboard } from './ui_course_dashboard.js'; 
import { getSrtFilenameFromTitle } from './filename_utils.js'; 

async function fetchVideoDurations(videoIds) {
    // ... (No changes needed here, already correct) ...
    if (!videoIds || videoIds.length === 0) return {};
    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === "YOUR_API_KEY_HERE") {
        console.warn("YouTube API Key not configured. Cannot fetch video durations.");
        return videoDurationMap;
    }
    const idsToFetch = videoIds.filter(id => videoDurationMap[id] === undefined);
    if (idsToFetch.length === 0) return videoDurationMap;
    console.log(`Fetching durations for ${idsToFetch.length} videos...`);
    const MAX_IDS_PER_REQUEST = 50;
    const fetchedDurations = {};
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
                        videoDurationMap[item.id] = totalSeconds; 
                    } else {
                         console.warn(`Could not parse duration string "${durationStr}" for video ${item.id}`);
                         fetchedDurations[item.id] = null;
                         videoDurationMap[item.id] = null; 
                    }
                } else {
                     if (item.id) videoDurationMap[item.id] = null;
                }
            });
        }
        console.log("Fetched durations:", fetchedDurations);
         idsToFetch.forEach(id => {
              if (videoDurationMap[id] === undefined) videoDurationMap[id] = null;
         });
        return videoDurationMap; 
    } catch (error) {
        console.error("Error fetching video durations:", error);
        idsToFetch.forEach(id => videoDurationMap[id] = null);
        return videoDurationMap; 
    }
}

export async function displayCourseContentMenu(courseId = activeCourseId) {
    if (!currentUser || !courseId) return;
    setActiveSidebarLink('sidebar-study-material-link', 'sidebar-course-nav');

    const courseDef = globalCourseDataMap.get(courseId);
    const progress = userCourseProgressMap.get(courseId);

    if (!courseDef || !progress) {
        displayContent(`<p class="text-red-500 p-4">Error: Course or progress data not found for ${courseId}.</p>`, 'course-dashboard-area');
        return;
    }
    const isViewer = progress.enrollmentMode === 'viewer';

    showLoading("Loading Chapter Details...");

    let allVideoIdsInCourse = new Set();
    if (courseDef.chapterResources) { 
        for (let i = 1; i <= courseDef.totalChapters; i++) {
            const chapterResources = courseDef.chapterResources?.[i] || {};
            const lectureUrls = (Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : [])
                                 .filter(lec => typeof lec === 'object' && lec.url);
            lectureUrls.forEach(lec => { const videoId = getYouTubeVideoId(lec.url); if (videoId) allVideoIdsInCourse.add(videoId); });
        }
    }
    await fetchVideoDurations(Array.from(allVideoIdsInCourse));
    hideLoading(); 

    let totalCourseProgressSum = 0;
    const totalChapters = courseDef.totalChapters || 0; 
    let chaptersConsideredForAvg = 0; 

    const studiedChaptersSet = new Set(progress.courseStudiedChapters || []);
    if (progress.lastSkipExamScore) {
        for (let i = 1; i <= totalChapters; i++) {
            const skipScore = progress.lastSkipExamScore[i] || progress.lastSkipExamScore[String(i)];
            if (skipScore !== undefined && skipScore !== null && skipScore >= SKIP_EXAM_PASSING_PERCENT) {
                studiedChaptersSet.add(i); 
            }
        }
    }
    const studiedChaptersCount = studiedChaptersSet.size; 


    for(let i = 1; i <= totalChapters; i++) {
         const chapterResources = courseDef.chapterResources?.[i] || {};
         const lecturesForChapter = (Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : []).filter(lec => typeof lec === 'object' && lec.url && lec.title);
         const videoIdsForChapter = lecturesForChapter.map(lec => getYouTubeVideoId(lec.url)).filter(id => id !== null);
         const chapterVideoDurationMap = {};
         videoIdsForChapter.forEach(id => { if (videoDurationMap[id] !== undefined) { chapterVideoDurationMap[id] = videoDurationMap[id]; } });

         const pdfInfo = progress.pdfProgress?.[i] || null;
         const pdfPath = chapterResources.pdfPath || courseDef.pdfPathPattern?.replace('{num}', i);

         if (videoIdsForChapter.length > 0 || pdfPath) {
             const chapterPercent = isViewer ? 0 : calculateChapterCombinedProgress(progress, i, chapterVideoDurationMap, pdfInfo).percent;
             totalCourseProgressSum += chapterPercent;
             chaptersConsideredForAvg++;
         }
    }
    const overallProgressPercent = chaptersConsideredForAvg > 0 ? Math.round(totalCourseProgressSum / chaptersConsideredForAvg) : 0;


    let contentHtml = `<div class="animate-fade-in space-y-6">
        <div class="flex justify-between items-center flex-wrap gap-2">
             <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(courseDef.name)} - Study Material</h2>
             <button onclick="window.showCurrentCourseDashboard('${courseId}')" class="btn-secondary-small">Back to Dashboard</button>
        </div>
        <p class="text-sm text-muted">Browse all chapters, access study materials, and track your progress. Use the skip exam option to test out of chapters you already know.</p>

        ${!isViewer ? `
        <div class="mb-4">
            <label class="text-sm font-medium text-gray-600 dark:text-gray-400">Overall Course Completion (${overallProgressPercent}% Avg Progress)</label>
            <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mt-1">
                 <div class="bg-gradient-to-r from-blue-400 to-primary-500 h-2.5 rounded-full transition-all duration-500 ease-out" style="width: ${overallProgressPercent}%" title="${overallProgressPercent}% Average Chapter Progress (${studiedChaptersCount}/${totalChapters} Chapters Marked Studied)"></div>
            </div>
            <p class="text-xs text-muted mt-1">${studiedChaptersCount} / ${totalChapters} Chapters Marked as Studied</p>
        </div>
        ` : ''}

        <div class="space-y-3">`;

    if (totalChapters === 0) {
         contentHtml += `<p class="text-center text-muted italic p-4">No chapters defined for this course yet.</p>`;
    } else {
        for (let i = 1; i <= totalChapters; i++) {
            const chapterNum = i;
            
            // --- START MODIFICATION: Get Chapter Title ---
            // The courseDef.chapters array is expected to hold string titles.
            // If a course's TestGen subject MD has parsed titles into subject.chapters[N].title,
            // then courseDef.chapters should be populated from that source when courseDef is created/updated.
            let chapterTitle = `Chapter ${chapterNum}`; // Default
            if (courseDef.chapters && Array.isArray(courseDef.chapters) && courseDef.chapters.length >= chapterNum && courseDef.chapters[chapterNum - 1]) {
                chapterTitle = courseDef.chapters[chapterNum - 1]; // Assumes courseDef.chapters is an array of titles
            } else {
                console.warn(`No title found in courseDef.chapters array for chapter ${chapterNum} of course ${courseDef.name}. Using default.`);
            }
            // --- END MODIFICATION ---

            const isStudied = studiedChaptersSet.has(chapterNum); 
            const lastSkipScore = progress.lastSkipExamScore?.[chapterNum];
            const skipAttempts = progress.skipExamAttempts?.[chapterNum] || 0;
            const skipExamThreshold = courseDef.skipExamPassingPercent || SKIP_EXAM_PASSING_PERCENT; 

            const chapterResources = courseDef.chapterResources?.[chapterNum] || {};
            const pdfPath = chapterResources.pdfPath || courseDef.pdfPathPattern?.replace('{num}', chapterNum);
            const lecturesForChapter = (Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : []).filter(lec => typeof lec === 'object' && lec.title);
            const hasTranscriptionSource = lecturesForChapter.some(lec => getSrtFilenameFromTitle(lec.title));
            const canAttemptSkip = pdfPath || hasTranscriptionSource; 

             let skipExamStatusHtml = '';
             if (!isViewer) {
                 if (isStudied) {
                      const reason = lastSkipScore !== undefined && lastSkipScore >= skipExamThreshold ? `(Skip Passed: ${lastSkipScore.toFixed(0)}%)` : '(Progress Complete)';
                      skipExamStatusHtml = `<span class="text-xs text-green-600 dark:text-green-400 font-medium ml-auto">${reason}</span>`;
                 } else if (lastSkipScore !== undefined && lastSkipScore < skipExamThreshold) {
                      skipExamStatusHtml = `<button onclick="window.triggerSkipExamGenerationWrapper('${courseId}', ${chapterNum})" class="btn-warning-small text-xs ml-auto" title="Last Score: ${lastSkipScore.toFixed(0)}%. Attempts: ${skipAttempts}. Needs ${skipExamThreshold}%">Retake Skip Exam</button>`;
                 } else {
                      skipExamStatusHtml = `<button onclick="window.triggerSkipExamGenerationWrapper('${courseId}', ${chapterNum})" class="btn-secondary-small text-xs ml-auto" ${!canAttemptSkip ? 'disabled title="No content for exam generation"' : `title="Pass (${skipExamThreshold}%) to mark chapter as studied"`}>Take Skip Exam</button>`;
                 }
             }

            let progressBarHtml = '';
            if (!isViewer) {
                const videoIdsForChapter = (Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : [])
                                             .filter(lec => typeof lec === 'object' && lec.url && lec.title)
                                             .map(lec => getYouTubeVideoId(lec.url))
                                             .filter(id => id !== null);
                const chapterVideoDurationMap = {}; videoIdsForChapter.forEach(id => { if (videoDurationMap[id] !== undefined) { chapterVideoDurationMap[id] = videoDurationMap[id]; } });
                const pdfInfo = progress.pdfProgress?.[chapterNum] || null; 
                const { percent: chapterCombinedProgress, watchedStr, totalStr } = calculateChapterCombinedProgress(progress, chapterNum, chapterVideoDurationMap, pdfInfo);

                const displayProgressPercent = isStudied ? 100 : chapterCombinedProgress;
                const displayProgressText = isStudied ? 'Completed: 100%' : `Progress: ${watchedStr} / ${totalStr} (${chapterCombinedProgress}%)`;

                progressBarHtml = `
                    <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1 relative group">
                         <div class="bg-blue-500 h-1.5 rounded-full transition-all duration-500 ease-out ${isStudied ? '!bg-green-500' : ''}" style="width: ${displayProgressPercent}%"></div>
                         <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-max p-1.5 text-xs text-white bg-black rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 progress-tooltip-text">
                              ${displayProgressText}
                         </div>
                    </div>
                `;
            }

            contentHtml += `
                <div class="content-card bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-0 overflow-hidden">
                     <div class="p-3 flex justify-between items-center gap-2 flex-wrap ${isStudied && !isViewer ? 'bg-green-50 dark:bg-green-900/30' : ''}">
                          <span class="font-semibold text-gray-700 dark:text-gray-200 truncate" title="Chapter ${chapterNum}: ${escapeHtml(chapterTitle)}">Chapter ${chapterNum}: ${escapeHtml(chapterTitle)}</span>
                          <div class="flex items-center gap-2 ml-auto">
                             ${isViewer ? '<span class="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-700 dark:text-purple-100 rounded-full font-medium">Viewer</span>' : (isStudied ? '<span class="text-xs px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100 rounded-full font-medium">Studied</span>' : '')}
                             ${skipExamStatusHtml} 
                          </div>
                     </div>
                     <div class="p-3 border-t dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 space-y-2 text-sm" id="chapter-progress-${chapterNum}">
                          ${progressBarHtml} 
                          <div class="flex flex-wrap gap-2 items-center mt-2">
                               <button onclick="window.showCourseStudyMaterialWrapper('${courseId}', ${chapterNum})" class="btn-primary-small text-xs">${isStudied && !isViewer ? 'Review Chapter' : 'View Chapter'}</button>
                          </div>
                     </div>
                </div>
            `;
        }
    }

    contentHtml += `</div></div>`;
    displayContent(contentHtml, 'course-dashboard-area');
}

// Assign to window scope
window.showCurrentCourseDashboard = showMyCoursesDashboard;
window.triggerSkipExamGenerationWrapper = (courseId, chapterNum) => triggerSkipExamGeneration(courseId, chapterNum);
window.showCourseStudyMaterialWrapper = (courseId, chapterNum) => showCourseStudyMaterial(courseId, chapterNum);

// --- END OF MODIFIED FILE ui_course_content_menu.js ---