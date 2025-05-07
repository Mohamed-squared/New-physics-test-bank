// --- START OF FILE ui_course_assignments_exams.js ---

import { currentUser, userCourseProgressMap, globalCourseDataMap, activeCourseId, data } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml, getFormattedDate, daysBetween } from './utils.js';
// *** MODIFIED: Import specific parsers/selectors ***
import { parseChapterProblems, selectProblemsForExam, combineProblemsWithQuestions, subjectProblemCache } from './test_logic.js'; // Added subjectProblemCache for direct access if needed, though test_logic manages it
import { extractQuestionsFromMarkdown } from './markdown_parser.js';
import { launchOnlineTestUI, setCurrentOnlineTestState } from './ui_online_test.js';
import { getExamHistory, getExamDetails, showExamReviewUI, deleteCompletedExamV2 } from './exam_storage.js';
// *** MODIFIED: Import more config constants ***
import {
    EXAM_QUESTION_COUNTS, EXAM_DURATIONS_MINUTES, FOP_COURSE_ID, SKIP_EXAM_PASSING_PERCENT,
    DEFAULT_MCQ_PROBLEM_RATIO, MAX_MARKS_PER_PROBLEM, MAX_MARKS_PER_MCQ,
    COURSE_BASE_PATH, SUBJECT_RESOURCE_FOLDER as DEFAULT_COURSE_QUESTIONS_FOLDER,
    DEFAULT_COURSE_TEXT_MCQ_FILENAME, DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME,
    DEFAULT_COURSE_LECTURE_MCQ_FILENAME, DEFAULT_COURSE_LECTURE_PROBLEMS_FILENAME,
    COURSE_EXAM_TEXT_LECTURE_RATIO // New ratio
} from './config.js';
import { deleteCourseActivityProgress } from './firebase_firestore.js';

// --- Helper Functions ---

// Helper to fetch markdown content, returns null on 404 or other errors
async function fetchCourseMarkdownContent(filePath) {
    // Add cache buster
    const url = `${filePath}?t=${new Date().getTime()}`;
    // console.log(`Fetching Course MD Content from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Markdown file not found at ${url}.`);
                return null; // Gracefully handle missing files
            }
            // For other non-ok statuses, log and return null
            console.error(`HTTP error fetching markdown! status: ${response.status} for ${url}`);
            return null;
        }
        const mdContent = await response.text();
        // console.log(`Markdown fetched successfully from ${url}. Length: ${mdContent.length}`);
        return mdContent;
    } catch (error) {
        console.error(`Error fetching Markdown from ${url}:`, error);
        // Don't alert here, handle null return value in the caller
        return null;
    }
}

// Helper function to render course exam history list
function renderCourseExamHistoryList(exams) {
    if (!exams || exams.length === 0) {
        return '<p class="text-sm text-muted text-center">No completed exams found.</p>';
    }
    let html = '<ul class="space-y-2">';
    exams.forEach(exam => {
        const score = exam.score || 0;
        const maxScore = exam.maxScore || 0;
        const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : 0;
        const date = new Date(exam.timestamp).toLocaleString();
        const typeDisplay = exam.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        html += `
            <li class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                <div>
                    <p class="font-medium">${escapeHtml(typeDisplay)}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">${date}</p>
                    <p class="text-sm ${parseFloat(percentage) >= 70 ? 'text-green-600' : 'text-red-600'}">${percentage}% (${score.toFixed(1)}/${maxScore.toFixed(1)} pts)</p>
                </div>
                <div class="flex space-x-1">
                    <button onclick="window.showExamReviewUI('${currentUser.uid}', '${exam.id}')" class="btn-secondary-small">View Review</button>
                    <button onclick="window.confirmDeleteCompletedExamV2Wrapper('${exam.id}')" class="btn-danger-small text-xs" title="Delete this exam history entry">Delete</button>
                </div>
            </li>`;
    });
    html += '</ul>';
    return html;
}
// Wrapper because deleteCompletedExamV2 might need UI refresh logic specific to this page
async function confirmDeleteCompletedExamV2Wrapper(examId) {
     if (confirm('Are you sure you want to delete this exam history entry? This action cannot be undone.')) {
         showLoading('Deleting exam history...');
         const success = await deleteCompletedExamV2(examId); // Assumes V2 handles necessary updates itself now
         hideLoading();
         if (success) {
             showCourseAssignmentsExams(); // Refresh this specific view
         } else {
             alert('Failed to delete exam history.');
         }
     }
}
window.confirmDeleteCompletedExamV2Wrapper = confirmDeleteCompletedExamV2Wrapper; // Assign wrapper to window

// --- Main UI Function ---

export async function showCourseAssignmentsExams(courseId = activeCourseId) {
    if (!currentUser || !courseId) return;
    setActiveSidebarLink('showCurrentAssignmentsExams', 'sidebar-course-nav');
    showLoading("Loading course assignments and exams...");

    try {
        const progress = userCourseProgressMap.get(courseId);
        const courseDef = globalCourseDataMap.get(courseId);
        if (!progress || !courseDef) {
            throw new Error(`Could not load progress or definition for course ID: ${courseId}.`);
        }

        const completedCourseExams = await getExamHistory(currentUser.uid, courseId, 'course');
        const isViewer = progress.enrollmentMode === 'viewer';

        if (isViewer) {
            displayContent(`<div class="content-card text-center p-6"><p class="text-purple-700 dark:text-purple-300 font-medium">Assignments and Exams are not available in Viewer Mode.</p><button onclick="window.showCurrentCourseDashboard('${courseId}')" class="btn-secondary mt-4">Back to Dashboard</button></div>`, 'course-dashboard-area');
            hideLoading();
            return;
        }

        const enrollmentDate = progress.enrollmentDate instanceof Date && !isNaN(progress.enrollmentDate) ? progress.enrollmentDate : null;
        const today = new Date(); today.setHours(0,0,0,0);
        const validEnrollmentDate = enrollmentDate instanceof Date;
        const daysElapsed = validEnrollmentDate ? daysBetween(enrollmentDate, today) : -1;

        const studiedChaptersSet = new Set(progress.courseStudiedChapters || []);
        const totalChapters = courseDef?.totalChapters || 1;
        const skipPassingPercent = courseDef.skipExamPassingPercent || SKIP_EXAM_PASSING_PERCENT || 70;
        if (progress.lastSkipExamScore) {
            for (let i = 1; i <= totalChapters; i++) {
                const skipScore = progress.lastSkipExamScore[i] || progress.lastSkipExamScore[String(i)];
                if (skipScore !== undefined && skipScore !== null && skipScore >= skipPassingPercent) {
                    studiedChaptersSet.add(i);
                }
            }
        }
        const totalChaptersStudied = studiedChaptersSet.size;

        // --- Generate Lists ---
        let assignmentsHtml = `<h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Daily Assignments</h3><ul class="space-y-2">`;
        if (!validEnrollmentDate) { assignmentsHtml += `<li class="text-sm text-red-500">Cannot determine assignments due to invalid enrollment date.</li>`; }
        else {
            const maxAssignmentsToShow = Math.min(courseDef.totalChapters, daysElapsed + 1);
            for (let i = 1; i <= maxAssignmentsToShow; i++) {
                const dateForAssignment = new Date(enrollmentDate); dateForAssignment.setDate(enrollmentDate.getDate() + i - 1);
                const dateStr = getFormattedDate(dateForAssignment);
                const assignmentId = `day${i}`;
                const score = progress.assignmentScores?.[assignmentId];
                const canStart = studiedChaptersSet.has(i) || i === 1; // Can start day 1 or if chapter studied
                if (score !== undefined) {
                    assignmentsHtml += `<li class="text-sm text-muted flex items-center justify-between"><span>Assignment ${i} (${dateStr}) - Completed (Score: ${score.toFixed(1)}%)</span><button onclick="window.confirmDeleteCourseActivity('${courseId}', 'assignment', '${assignmentId}')" class="btn-danger-small text-xs">Delete</button></li>`;
                } else if (canStart) { assignmentsHtml += `<li><button class="link" onclick="window.startAssignmentOrExam('${courseId}', 'assignment', '${assignmentId}')">Start Assignment ${i}</button> (${dateStr})</li>`; }
                else { assignmentsHtml += `<li class="text-sm text-muted">Assignment ${i} (${dateStr}) - (Study Chapter ${i} first)</li>`; }
            }
            if (maxAssignmentsToShow <= 0) assignmentsHtml += `<li class="text-sm text-muted">No assignments generated yet.</li>`;
        }
        assignmentsHtml += `</ul>`;

        let weeklyExamsHtml = `<h3 class="text-lg font-semibold mb-3 mt-6 text-gray-700 dark:text-gray-300">Weekly Exams</h3><ul class="space-y-2">`;
        if (!validEnrollmentDate) { weeklyExamsHtml += `<li class="text-sm text-red-500">Cannot determine exams due to invalid enrollment date.</li>`; }
        else {
            const currentWeek = Math.floor(daysElapsed / 7) + 1;
            const totalPossibleWeeks = Math.ceil(courseDef.totalChapters / 7);
            for (let i = 1; i <= totalPossibleWeeks; i++) {
                 const weeklyExamId = `week${i}`; const score = progress.weeklyExamScores?.[weeklyExamId];
                 // Weekly exam is due *after* the week ends (i.e., on day 7, 14, 21...)
                 // User must also have studied the last chapter of that week to start
                 const lastChapterOfWeek = Math.min(i * 7, courseDef.totalChapters);
                 const isDue = daysElapsed >= (i * 7);
                 const canStart = isDue && studiedChaptersSet.has(lastChapterOfWeek);

                 if (score !== undefined) {
                     weeklyExamsHtml += `<li class="text-sm text-muted flex items-center justify-between"><span>Weekly Exam ${i} - Completed (Score: ${score.toFixed(1)}%)</span><button onclick="window.confirmDeleteCourseActivity('${courseId}', 'weekly_exam', '${weeklyExamId}')" class="btn-danger-small text-xs">Delete</button></li>`;
                 } else if (canStart) { weeklyExamsHtml += `<li><button class="link" onclick="window.startAssignmentOrExam('${courseId}', 'weekly_exam', '${weeklyExamId}')">Start Weekly Exam ${i}</button></li>`; }
                 else if (isDue) { weeklyExamsHtml += `<li class="text-sm text-muted">Weekly Exam ${i} (Available, study Ch ${lastChapterOfWeek} first)</li>`; }
                 else { weeklyExamsHtml += `<li class="text-sm text-muted">Weekly Exam ${i} (Available end of week ${i})</li>`; }
            }
            if (totalPossibleWeeks === 0) weeklyExamsHtml += `<li class="text-sm text-muted">No weekly exams applicable.</li>`;
        }
        weeklyExamsHtml += `</ul>`;

        let midcourseHtml = `<h3 class="text-lg font-semibold mb-3 mt-6 text-gray-700 dark:text-gray-300">Midcourse Exams</h3><ul class="space-y-2">`;
        (courseDef.midcourseChapters || []).forEach((chapThreshold, index) => {
            const midNum = index + 1; const midId = `mid${midNum}`; const score = progress.midcourseExamScores?.[midId];
            const canStart = totalChaptersStudied >= chapThreshold;
            if (score !== undefined) {
                midcourseHtml += `<li class="text-sm text-muted flex items-center justify-between"><span>Midcourse Exam ${midNum} - Completed (Score: ${score.toFixed(1)}%)</span><button onclick="window.confirmDeleteCourseActivity('${courseId}', 'midcourse', '${midId}')" class="btn-danger-small text-xs">Delete</button></li>`;
            } else if (canStart) { midcourseHtml += `<li><button class="link" onclick="window.startAssignmentOrExam('${courseId}', 'midcourse', '${midId}')">Start Midcourse Exam ${midNum}</button> (After Ch ${chapThreshold})</li>`; }
            else { midcourseHtml += `<li class="text-sm text-muted">Midcourse Exam ${midNum} (Available after Ch ${chapThreshold})</li>`; }
        });
        if ((courseDef.midcourseChapters || []).length === 0) midcourseHtml += `<li class="text-sm text-muted">No midcourse exams defined.</li>`;
        midcourseHtml += `</ul>`;

        let finalHtml = `<h3 class="text-lg font-semibold mb-3 mt-6 text-gray-700 dark:text-gray-300">Final Exams</h3><ul class="space-y-2">`;
        const allChaptersDone = totalChaptersStudied >= courseDef.totalChapters;
        if (allChaptersDone) {
            for (let i = 1; i <= 3; i++) { // Assuming max 3 final attempts
                const finalId = `final${i}`; const score = progress.finalExamScores?.[i-1]; // Scores stored in array
                if (score === undefined || score === null) { finalHtml += `<li><button class="link" onclick="window.startAssignmentOrExam('${courseId}', 'final', '${finalId}')">Start Final Exam ${i}</button></li>`; }
                else {
                    finalHtml += `<li class="text-sm text-muted flex items-center justify-between"><span>Final Exam ${i} - Completed (Score: ${score.toFixed(1)}%)</span><button onclick="window.confirmDeleteCourseActivity('${courseId}', 'final', '${finalId}')" class="btn-danger-small text-xs">Delete</button></li>`;
                }
            }
        } else { finalHtml += `<li class="text-sm text-muted">Available after completing all chapters.</li>`; }
        finalHtml += `</ul>`;

        const html = `
            <div class="animate-fade-in space-y-6">
                <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Assignments & Exams for ${escapeHtml(courseDef.name)}</h2>
                <div class="content-card">${assignmentsHtml}</div>
                <div class="content-card">${weeklyExamsHtml}</div>
                <div class="content-card">${midcourseHtml}</div>
                <div class="content-card">${finalHtml}</div>
                <div class="content-card">
                    <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Completed Exams History</h3>
                    ${renderCourseExamHistoryList(completedCourseExams)}
                </div>
            </div>`;
        displayContent(html, 'course-dashboard-area');
        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Error loading course assignments and exams:', error);
        displayContent(`<div class="text-red-500 p-4"><p>Error loading assignments and exams: ${error.message}</p><button onclick="window.showCurrentCourseDashboard('${courseId}')" class="btn-secondary mt-4">Back to Dashboard</button></div>`, 'course-dashboard-area');
    }
}

// --- Start Exam/Assignment Logic (MODIFIED) ---
export async function startAssignmentOrExam(courseId, type, id) {
    showLoading(`Preparing ${type} ${id}...`);

    const progress = userCourseProgressMap.get(courseId);
    const courseDef = globalCourseDataMap.get(courseId);
    if (!progress || !courseDef) {
        hideLoading(); alert("Error: Missing course progress or definition data."); return;
    }
    if (!courseDef.courseDirName) {
         hideLoading(); alert(`Error: Course definition for ${courseDef.name} is missing 'courseDirName'. Cannot locate question files.`); return;
    }
    if (!courseDef.relatedSubjectId || !data?.subjects?.[courseDef.relatedSubjectId]) {
         hideLoading(); alert(`Error: Course definition for ${courseDef.name} is missing 'relatedSubjectId' or subject data not loaded.`); return;
    }
    const subjectId = courseDef.relatedSubjectId;
    const subject = data.subjects[subjectId];

    // --- Determine Chapter Scope ---
    let chaptersToInclude = [];
    const enrollmentDate = progress.enrollmentDate instanceof Date && !isNaN(progress.enrollmentDate) ? progress.enrollmentDate : null;
    const today = new Date(); today.setHours(0,0,0,0);
    const validEnrollmentDate = enrollmentDate instanceof Date;

    try {
        if (type !== 'final' && type !== 'skip_exam' && !validEnrollmentDate) {
             throw new Error("Invalid enrollment date. Cannot determine chapter scope for this activity.");
        }

        switch (type) {
            case 'assignment':
                const dayNumMatch = id.match(/day(\d+)/); if (!dayNumMatch) throw new Error("Invalid assignment ID format.");
                const dayNum = parseInt(dayNumMatch[1], 10);
                chaptersToInclude = [dayNum];
                break;
            case 'weekly_exam':
                const weekNumMatch = id.match(/week(\d+)/); if (!weekNumMatch) throw new Error("Invalid weekly exam ID.");
                const weekNum = parseInt(weekNumMatch[1], 10);
                const startChap = (weekNum - 1) * 7 + 1;
                const endChap = Math.min(weekNum * 7, courseDef.totalChapters);
                chaptersToInclude = Array.from({ length: endChap - startChap + 1 }, (_, i) => startChap + i);
                break;
            case 'midcourse':
                const midNumMatch = id.match(/mid(\d+)/); if (!midNumMatch || !courseDef.midcourseChapters?.[midNumMatch[1] - 1]) throw new Error("Invalid midcourse ID or definition.");
                const midNum = parseInt(midNumMatch[1], 10);
                const chapterThreshold = courseDef.midcourseChapters[midNum - 1];
                const prevThreshold = midNum > 1 ? courseDef.midcourseChapters[midNum - 2] : 0;
                chaptersToInclude = Array.from({ length: chapterThreshold - prevThreshold }, (_, i) => prevThreshold + 1 + i);
                break;
            case 'final':
                chaptersToInclude = Array.from({ length: courseDef.totalChapters }, (_, i) => i + 1);
                break;
            default: throw new Error(`Unknown activity type: ${type}`);
        }

        console.log(`Chapter scope for ${type} ${id}:`, chaptersToInclude);
        if (chaptersToInclude.length === 0) throw new Error("Could not determine any chapters for this activity.");

        // --- Fetch Course Specific Content ---
        const questionsBasePath = `${COURSE_BASE_PATH}/${courseDef.courseDirName}/${DEFAULT_COURSE_QUESTIONS_FOLDER}`;
        const textMcqPath = `${questionsBasePath}/${DEFAULT_COURSE_TEXT_MCQ_FILENAME}`;
        const textProbPath = `${questionsBasePath}/${DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME}`;
        const lectMcqPath = `${questionsBasePath}/${DEFAULT_COURSE_LECTURE_MCQ_FILENAME}`;
        const lectProbPath = `${questionsBasePath}/${DEFAULT_COURSE_LECTURE_PROBLEMS_FILENAME}`;

        // Fetch all markdown content. fetchCourseMarkdownContent returns null on error/404.
        const [
            textMcqContent,         // Content for text-based MCQs
            textProbContent_fetched,  // Content for text-based Problems (fetched, but parseChapterProblems fetches again by path)
            lectMcqContent,         // Content for lecture-based MCQs
            lectProbContent_fetched   // Content for lecture-based Problems (fetched, but parseChapterProblems fetches again by path)
        ] = await Promise.all([
            fetchCourseMarkdownContent(textMcqPath),
            fetchCourseMarkdownContent(textProbPath),
            fetchCourseMarkdownContent(lectMcqPath),
            fetchCourseMarkdownContent(lectProbPath)
        ]);

        // MODIFIED: Check if ALL initial file fetches returned null.
        if (textMcqContent === null && textProbContent_fetched === null && lectMcqContent === null && lectProbContent_fetched === null) {
            throw new Error("Could not load ANY question/problem files for the course. All specified Markdown files were not found or were inaccessible. Please check course configuration and file paths.");
        }

        // --- Parse Content (Filtered by Chapter Scope) ---
        console.log("Parsing fetched MCQ content (if available)...");
        // extractQuestionsFromMarkdown handles null content gracefully, returning { questions: [], answers: {} }
        const parsedTextMcqs = extractQuestionsFromMarkdown(textMcqContent, chaptersToInclude, 'text_mcq');
        const parsedLectMcqs = extractQuestionsFromMarkdown(lectMcqContent, chaptersToInclude, 'lect_mcq');

        // Parse problems (asynchronously, populates cache).
        // These functions fetch files by path internally and handle their own file-not-found errors.
        console.log("Parsing problems (populating cache, involves internal fetching)...");
        await parseChapterProblems(textProbPath, subjectId, 'text_problems'); // Corrected: subjectId first, then filePath
        await parseChapterProblems(lectProbPath, subjectId, 'lecture_problems'); // Corrected: subjectId first, then filePath
        console.log("Problem parsing attempts complete.");


        // Combine all available parsed items within the chapter scope
        const availableTextMcqs = parsedTextMcqs.questions || [];
        const availableLectMcqs = parsedLectMcqs.questions || [];
        let availableTextProbs = [];
        let availableLectProbs = [];

        // Retrieve parsed problems from cache for the required chapters
        chaptersToInclude.forEach(chapNum => {
             const textCacheKey = `${subjectId}|text_problems`;
             const lectCacheKey = `${subjectId}|lecture_problems`;
             const textProbsInChap = subjectProblemCache.get(textCacheKey)?.[chapNum] || [];
             const lectProbsInChap = subjectProblemCache.get(lectCacheKey)?.[chapNum] || [];
             availableTextProbs.push(...textProbsInChap);
             availableLectProbs.push(...lectProbsInChap);
        });

        const totalAvailableMcqs = availableTextMcqs.length + availableLectMcqs.length;
        const totalAvailableProblems = availableTextProbs.length + availableLectProbs.length;
        const totalAvailableItems = totalAvailableMcqs + totalAvailableProblems;

        console.log(`Available Items After Parsing & Cache Retrieval: TextMCQ=${availableTextMcqs.length}, LectMCQ=${availableLectMcqs.length}, TextProb=${availableTextProbs.length}, LectProb=${availableLectProbs.length}`);

        // MODIFIED: This check now correctly reflects if no items were available from any source after all attempts.
        if (totalAvailableItems === 0) {
            throw new Error("No questions or problems found in the course files for the relevant chapters after attempting to parse all available sources. Exam cannot be generated.");
        }

        // --- Determine Target Counts based on Ratios and Availability ---
        const finalTestSize = Math.min(EXAM_QUESTION_COUNTS[type] || 20, totalAvailableItems);
        const baseMcqRatio = subject.mcqProblemRatio ?? DEFAULT_MCQ_PROBLEM_RATIO;
        const textLectureRatio = COURSE_EXAM_TEXT_LECTURE_RATIO;

        let targetTotalMcq = Math.round(finalTestSize * baseMcqRatio);
        let targetTotalProb = finalTestSize - targetTotalMcq;

        targetTotalMcq = Math.min(targetTotalMcq, totalAvailableMcqs);
        targetTotalProb = Math.min(targetTotalProb, totalAvailableProblems);

        const adjustedFinalSize = targetTotalMcq + targetTotalProb;

        let targetTextMcq = Math.min(availableTextMcqs.length, Math.round(targetTotalMcq * textLectureRatio));
        let targetLectMcq = Math.min(availableLectMcqs.length, targetTotalMcq - targetTextMcq);
        if (targetTextMcq + targetLectMcq < targetTotalMcq) {
            const deficit = targetTotalMcq - (targetTextMcq + targetLectMcq);
            if (availableTextMcqs.length > targetTextMcq) targetTextMcq = Math.min(availableTextMcqs.length, targetTextMcq + deficit);
            else if (availableLectMcqs.length > targetLectMcq) targetLectMcq = Math.min(availableLectMcqs.length, targetLectMcq + deficit);
        }
         targetTotalMcq = targetTextMcq + targetLectMcq;

        let targetTextProb = Math.min(availableTextProbs.length, Math.round(targetTotalProb * textLectureRatio));
        let targetLectProb = Math.min(availableLectProbs.length, targetTotalProb - targetTextProb);
        if (targetTextProb + targetLectProb < targetTotalProb) {
            const deficit = targetTotalProb - (targetTextProb + targetLectProb);
             if (availableTextProbs.length > targetTextProb) targetTextProb = Math.min(availableTextProbs.length, targetTextProb + deficit);
             else if (availableLectProbs.length > targetLectProb) targetLectProb = Math.min(availableLectProbs.length, targetLectProb + deficit);
        }
        targetTotalProb = targetTextProb + targetLectProb;

        console.log('Target Selection Counts:', {
            finalSize: adjustedFinalSize, baseMcqRatio, textLectureRatio,
            targetTotalMcq, targetTotalProb,
            targetTextMcq, targetLectMcq, targetTextProb, targetLectProb
        });

        // --- Select Items Randomly ---
        const selectedTextMcqs = [...availableTextMcqs].sort(() => 0.5 - Math.random()).slice(0, targetTextMcq);
        const selectedLectMcqs = [...availableLectMcqs].sort(() => 0.5 - Math.random()).slice(0, targetLectMcq);
        const selectedMcqs = [...selectedTextMcqs, ...selectedLectMcqs];

        // Problems are already in a suitable format from parseChapterProblems via cache, just need to ensure they are flagged as problems for combine function
        // The selectProblemsForExam function is more for when you need to format from raw. Here, problems from cache are mostly formatted.
        // We just need to ensure they have `isProblem: true` if `combineProblemsWithQuestions` relies on it.
        // The `availableTextProbs` and `availableLectProbs` are arrays of problem objects from the cache.
        // Let's re-check `selectProblemsForExam` structure if it's needed, or simplify selection if problems from cache are ready.
        // `parseChapterProblems` creates problem objects with `id, chapter, text, type, difficulty, topics, answer=null, parts={}`.
        // `combineProblemsWithQuestions` just combines. The `selectProblemsForExam` formats for exam.
        // For now, let's assume problems from cache are good enough and just need random selection.
        // We need to convert these "raw" problem objects from the cache into the exam item format.
        // `selectProblemsForExam` does exactly this, PLUS random selection.
        // However, `selectProblemsForExam` operates on a single chapter and source. We have multiple chapters.
        // It's better to select from the already aggregated `availableTextProbs` and `availableLectProbs`.

        const selectedTextProbsRaw = [...availableTextProbs].sort(() => 0.5 - Math.random()).slice(0, targetTextProb);
        const selectedLectProbsRaw = [...availableLectProbs].sort(() => 0.5 - Math.random()).slice(0, targetLectProb);

        // Convert these selected raw problems to the standard exam item format
        const problemToExamItem = (problem, indexOffset = 0, sourceSuffix = 'unknown') => ({
            id: problem.id || `problem-${problem.chapter}-${indexOffset}-${sourceSuffix}`, // Use parsed ID
            chapter: String(problem.chapter),
            number: indexOffset, // This will be overwritten by displayNumber in combine
            text: problem.text || "Problem text not found.",
            options: [],
            image: null, // Placeholder
            correctAnswer: null,
            type: problem.type || 'Problem',
            difficulty: problem.difficulty,
            topics: problem.topics || [],
            isProblem: true
        });

        const selectedTextProbs = selectedTextProbsRaw.map((p, i) => problemToExamItem(p, i, 'text_problems'));
        const selectedLectProbs = selectedLectProbsRaw.map((p, i) => problemToExamItem(p, i, 'lecture_problems'));
        const selectedProblems = [...selectedTextProbs, ...selectedLectProbs];


        // --- Combine & Finalize ---
        const finalExamItems = combineProblemsWithQuestions(selectedProblems, selectedMcqs);

        if (finalExamItems.length === 0) { // Should be caught by totalAvailableItems check, but safety.
            throw new Error("Failed to select any questions or problems after processing, even though some items were initially available.");
        }
        if (finalExamItems.length < (EXAM_QUESTION_COUNTS[type] || 10) * 0.5) {
             console.warn(`Generated exam has only ${finalExamItems.length} items, which is much lower than the target count of ${EXAM_QUESTION_COUNTS[type]}. Check course content files and chapter scope.`);
        }

        console.log('Final Exam Composition:', {
            totalItems: finalExamItems.length,
            mcqs: selectedMcqs.length,
            problems: selectedProblems.length
        });

        const mcqAnswers = { ...parsedTextMcqs.answers, ...parsedLectMcqs.answers };

        // --- Launch Online Test ---
        const examId = `${courseId}-${type}-${id}-${Date.now()}`;
        const durationMinutes = EXAM_DURATIONS_MINUTES[type] || Math.max(15, Math.min(180, finalExamItems.length * 2.5));

        const onlineTestState = {
            examId: examId,
            questions: finalExamItems,
            correctAnswers: mcqAnswers,
            userAnswers: {},
            startTime: Date.now(),
            timerInterval: null,
            currentQuestionIndex: 0,
            status: 'active',
            durationMinutes: durationMinutes,
            subjectId: subject.id,
            courseContext: { isCourseActivity: true, courseId: courseId, activityType: type, activityId: id }
        };

        setCurrentOnlineTestState(onlineTestState);
        hideLoading();
        launchOnlineTestUI();

    } catch (error) {
        hideLoading();
        console.error(`Error starting ${type} ${id}:`, error);
        alert(`Could not start activity: ${error.message}`);
    }
}
window.startAssignmentOrExam = startAssignmentOrExam; // Make accessible

// --- Delete Course Activity Functions ---
export function confirmDeleteCourseActivity(courseId, activityType, activityId) {
    if (!currentUser) { alert("You must be logged in."); return; }
    const activityName = activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const activityNumber = activityId.replace(/[^0-9]/g, '');
    if (confirm(`Are you sure you want to delete the results for ${activityName} ${activityNumber}? This also deletes related exam history. This action cannot be undone.`)) {
        handleDeleteCourseActivity(courseId, activityType, activityId);
    }
}
window.confirmDeleteCourseActivity = confirmDeleteCourseActivity;

export async function handleDeleteCourseActivity(courseId, activityType, activityId) {
    showLoading(`Deleting ${activityType} ${activityId}...`);
    try {
        const success = await deleteCourseActivityProgress(currentUser.uid, courseId, activityType, activityId);

        console.log(`Finding exam history records for activity: ${activityType} ${activityId}`);
        const examHistory = await getExamHistory(currentUser.uid, courseId, 'course');
        const examsToDelete = examHistory.filter(exam =>
            exam.type === activityType && exam.id && exam.id.includes(`-${activityType}-${activityId}-`) // More specific match
        );

        if (examsToDelete.length > 0) {
            console.log(`Found ${examsToDelete.length} exam record(s) to delete for activity ${activityId}.`);
            let deletedCount = 0;
            for (const exam of examsToDelete) {
                 console.log(`Deleting exam record: ${exam.id}`);
                 const deleted = await deleteCompletedExamV2(exam.id);
                 if (deleted) deletedCount++;
            }
            console.log(`Successfully deleted ${deletedCount} of ${examsToDelete.length} related exam records.`);
             if(success || deletedCount > 0) alert(`Successfully deleted progress score${deletedCount > 0 ? ` and ${deletedCount} related exam record(s)` : ''} for ${activityType} ${activityId}.`);
        } else {
            console.log(`No matching exam records found in userExams to delete for activity ${activityId}.`);
            if(success) alert(`Successfully deleted progress score for ${activityType} ${activityId}. No related exam history found.`);
        }

        hideLoading();
        if (success || examsToDelete.length > 0) {
            showCourseAssignmentsExams(courseId);
        } else if (!success && examsToDelete.length === 0){ // Only show failure if both failed
            alert(`Failed to delete ${activityType} ${activityId} results. Please check logs or try again.`);
        }
    } catch (error) {
        hideLoading();
        console.error(`Error deleting ${activityType} ${activityId}:`, error);
        alert(`Error deleting results: ${error.message}`);
    }
}
window.handleDeleteCourseActivity = handleDeleteCourseActivity;


// --- END OF FILE ui_course_assignments_exams.js ---