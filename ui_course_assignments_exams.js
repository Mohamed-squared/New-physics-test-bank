// --- START OF FILE ui_course_assignments_exams.js ---

import { currentUser, userCourseProgressMap, globalCourseDataMap, activeCourseId, data, courseExamDefaults } from './state.js'; // Added courseExamDefaults
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml, getFormattedDate, daysBetween } from './utils.js';
import { parseChapterProblems, selectProblemsForExam, combineProblemsWithQuestions, subjectProblemCache } from './test_logic.js';
import { extractQuestionsFromMarkdown } from './markdown_parser.js';
import { launchOnlineTestUI, setCurrentOnlineTestState } from './ui_online_test.js';
import { getExamHistory, getExamDetails, showExamReviewUI, deleteCompletedExamV2 } from './exam_storage.js';
import {
    FALLBACK_EXAM_CONFIG, // NEW: Import fallback for defaults
    FOP_COURSE_ID, SKIP_EXAM_PASSING_PERCENT,
    // --- START MODIFICATION: Remove deprecated constants, use from examConfig ---
    // DEFAULT_MCQ_PROBLEM_RATIO, MAX_MARKS_PER_PROBLEM, MAX_MARKS_PER_MCQ,
    // --- END MODIFICATION ---
    COURSE_BASE_PATH, SUBJECT_RESOURCE_FOLDER as DEFAULT_COURSE_QUESTIONS_FOLDER,
    DEFAULT_COURSE_TEXT_MCQ_FILENAME, DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME,
    DEFAULT_COURSE_LECTURE_MCQ_FILENAME, DEFAULT_COURSE_LECTURE_PROBLEMS_FILENAME
} from './config.js';
import { deleteCourseActivityProgress } from './firebase_firestore.js';

// Helper Functions (fetchCourseMarkdownContent, renderCourseExamHistoryList, confirmDeleteCompletedExamV2Wrapper are assumed to be defined as before)
async function fetchCourseMarkdownContent(filePath) {
    const url = `${filePath}?t=${new Date().getTime()}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Markdown file not found at ${url}.`);
                return null;
            }
            console.error(`HTTP error fetching markdown! status: ${response.status} for ${url}`);
            return null;
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching Markdown from ${url}:`, error);
        return null;
    }
}

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

async function confirmDeleteCompletedExamV2Wrapper(examId) {
     if (confirm('Are you sure you want to delete this exam history entry? This action cannot be undone.')) {
         showLoading('Deleting exam history...');
         const success = await deleteCompletedExamV2(examId);
         hideLoading();
         if (success) {
             showCourseAssignmentsExams();
         } else {
             alert('Failed to delete exam history.');
         }
     }
}
window.confirmDeleteCompletedExamV2Wrapper = confirmDeleteCompletedExamV2Wrapper;

// --- Main UI Function for displaying assignments and exams ---
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

        let assignmentsHtml = `<h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Daily Assignments</h3><ul class="space-y-2">`;
        if (!validEnrollmentDate) { assignmentsHtml += `<li class="text-sm text-red-500">Cannot determine assignments due to invalid enrollment date.</li>`; }
        else {
            const maxAssignmentsToShow = Math.min(courseDef.totalChapters, daysElapsed + 1);
            for (let i = 1; i <= maxAssignmentsToShow; i++) {
                const dateForAssignment = new Date(enrollmentDate); dateForAssignment.setDate(enrollmentDate.getDate() + i - 1);
                const dateStr = getFormattedDate(dateForAssignment);
                const assignmentId = `day${i}`;
                const score = progress.assignmentScores?.[assignmentId];
                const canStart = studiedChaptersSet.has(i) || i === 1;
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
            const totalPossibleWeeks = Math.ceil(courseDef.totalChapters / 7);
            for (let i = 1; i <= totalPossibleWeeks; i++) {
                 const weeklyExamId = `week${i}`; const score = progress.weeklyExamScores?.[weeklyExamId];
                 const lastChapterOfWeek = Math.min(i * 7, courseDef.totalChapters);
                 const isDue = daysElapsed >= (i * 7 -1); // Due ON the 7th day of the week (day 7, 14, 21...)
                 const canStart = isDue && studiedChaptersSet.has(lastChapterOfWeek);

                 if (score !== undefined) {
                     weeklyExamsHtml += `<li class="text-sm text-muted flex items-center justify-between"><span>Weekly Exam ${i} - Completed (Score: ${score.toFixed(1)}%)</span><button onclick="window.confirmDeleteCourseActivity('${courseId}', 'weekly_exam', '${weeklyExamId}')" class="btn-danger-small text-xs">Delete</button></li>`;
                 } else if (canStart) { weeklyExamsHtml += `<li><button class="link" onclick="window.startAssignmentOrExam('${courseId}', 'weekly_exam', '${weeklyExamId}')">Start Weekly Exam ${i}</button></li>`; }
                 else if (isDue) { weeklyExamsHtml += `<li class="text-sm text-muted">Weekly Exam ${i} (Available, study Ch ${lastChapterOfWeek} first)</li>`; }
                 else { weeklyExamsHtml += `<li class="text-sm text-muted">Weekly Exam ${i} (Available end of week ${i})</li>`; }
            }
            if (totalPossibleWeeks === 0) weeklyExamsHtml += `<li class="text-sm text-muted">No weekly exams applicable for this course.</li>`;
        }
        weeklyExamsHtml += `</ul>`;

        // --- START MODIFICATION: Midcourse Exam Logic based on Quarters ---
        let midcourseHtml = `<h3 class="text-lg font-semibold mb-3 mt-6 text-gray-700 dark:text-gray-300">Midcourse Exams</h3><ul class="space-y-2">`;
        let midcourseExamDefined = false;
        if (courseDef.totalChapters >= 4) { // Only if course has enough chapters for at least one quarter
            const quarterMarkers = [
                Math.floor(courseDef.totalChapters / 4),
                Math.floor(courseDef.totalChapters / 2),
                Math.floor(courseDef.totalChapters * 3 / 4)
            ];

            quarterMarkers.forEach((chapThreshold, index) => {
                if (chapThreshold === 0) return; // Skip if a quarter calculation is 0 (e.g. for 1-3 chapter courses)
                
                // Ensure we don't define midcourse 3 if it's too close to the end or equals total chapters
                if (index === 2 && chapThreshold >= courseDef.totalChapters - Math.floor(courseDef.totalChapters / 8)) {
                     console.log(`Skipping Midcourse 3 as threshold ${chapThreshold} is too close to total chapters ${courseDef.totalChapters}`);
                     return;
                }

                midcourseExamDefined = true;
                const midNum = index + 1;
                const midId = `mid${midNum}`;
                const score = progress.midcourseExamScores?.[midId];
                const canStart = totalChaptersStudied >= chapThreshold;

                if (score !== undefined) {
                    midcourseHtml += `<li class="text-sm text-muted flex items-center justify-between"><span>Midcourse Exam ${midNum} - Completed (Score: ${score.toFixed(1)}%)</span><button onclick="window.confirmDeleteCourseActivity('${courseId}', 'midcourse', '${midId}')" class="btn-danger-small text-xs">Delete</button></li>`;
                } else if (canStart) {
                    midcourseHtml += `<li><button class="link" onclick="window.startAssignmentOrExam('${courseId}', 'midcourse', '${midId}')">Start Midcourse Exam ${midNum}</button> (After Ch ${chapThreshold})</li>`;
                } else {
                    midcourseHtml += `<li class="text-sm text-muted">Midcourse Exam ${midNum} (Available after completing Chapter ${chapThreshold})</li>`;
                }
            });
        }
        if (!midcourseExamDefined) {
            midcourseHtml += `<li class="text-sm text-muted">No midcourse exams applicable for this course length.</li>`;
        }
        midcourseHtml += `</ul>`;
        // --- END MODIFICATION ---


        let finalHtml = `<h3 class="text-lg font-semibold mb-3 mt-6 text-gray-700 dark:text-gray-300">Final Exams</h3><ul class="space-y-2">`;
        const allChaptersDone = totalChaptersStudied >= courseDef.totalChapters;
        if (allChaptersDone) {
            for (let i = 1; i <= 3; i++) {
                const finalId = `final${i}`; const score = progress.finalExamScores?.[i-1];
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
         hideLoading(); alert(`Error: Course definition for ${courseDef.name} is missing 'relatedSubjectId' or TestGen subject data for it is not loaded.`); return;
    }
    const subjectId = courseDef.relatedSubjectId; 
    const relatedTestGenSubject = data.subjects[subjectId]; 

    // --- START MODIFICATION: Get exam configuration ---
    const currentGlobalExamDefaults = courseExamDefaults || FALLBACK_EXAM_CONFIG; // Use loaded global defaults or fallback
    let examConfig = currentGlobalExamDefaults[type];
    if (!examConfig) {
        console.warn(`No specific exam configuration found for type: ${type} in global defaults. Using generic fallback.`);
        examConfig = FALLBACK_EXAM_CONFIG[type] || { questions: 10, durationMinutes: 60, mcqRatio: 0.5, textSourceRatio: 0.5 };
    }
    // Ensure all properties exist in examConfig, falling back to global defaults if a specific one is incomplete
    examConfig = {
        ...FALLBACK_EXAM_CONFIG[type], // Start with the structure of a known type from fallback
        ...examConfig // Override with values from loaded config
    };
    console.log(`[startAssignmentOrExam] Using exam config for ${type} ${id}:`, examConfig);
    // --- END MODIFICATION ---


    // --- Determine Chapter Scope ---
    let chaptersToInclude = [];
    const enrollmentDate = progress.enrollmentDate instanceof Date && !isNaN(progress.enrollmentDate) ? progress.enrollmentDate : null;
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
            // --- START MODIFICATION: Midcourse Logic for Chapter Scope ---
            case 'midcourse':
                const midNumMatch = id.match(/mid(\d+)/); if (!midNumMatch) throw new Error("Invalid midcourse ID format.");
                const midNum = parseInt(midNumMatch[1], 10); // 1, 2, or 3
                const totalChapters = courseDef.totalChapters;
                let startChapterForMid, endChapterForMid;

                if (midNum === 1) {
                    startChapterForMid = 1;
                    endChapterForMid = Math.floor(totalChapters / 4);
                } else if (midNum === 2) {
                    startChapterForMid = Math.floor(totalChapters / 4) + 1;
                    endChapterForMid = Math.floor(totalChapters / 2);
                } else if (midNum === 3) {
                    startChapterForMid = Math.floor(totalChapters / 2) + 1;
                    endChapterForMid = Math.floor(totalChapters * 3 / 4);
                } else {
                    throw new Error(`Invalid midcourse number: ${midNum}`);
                }
                if (startChapterForMid > endChapterForMid || endChapterForMid === 0) { // Handle short courses where a quarter might be 0
                    console.warn(`Midcourse ${midNum} has an invalid chapter range (${startChapterForMid}-${endChapterForMid}) for a course with ${totalChapters} chapters. Skipping this midcourse generation or setting empty scope.`);
                    chaptersToInclude = []; // Or handle by not generating this exam
                } else {
                    chaptersToInclude = Array.from({ length: endChapterForMid - startChapterForMid + 1 }, (_, i) => startChapterForMid + i);
                }
                break;
            // --- END MODIFICATION ---
            case 'final':
                chaptersToInclude = Array.from({ length: courseDef.totalChapters }, (_, i) => i + 1);
                break;
            case 'skip_exam':
                const chapterMatchSkip = id.match(/chapter(\d+)/); if(!chapterMatchSkip) throw new Error("Invalid skip exam ID format.");
                chaptersToInclude = [parseInt(chapterMatchSkip[1])];
                break;
            default: throw new Error(`Unknown activity type for exam generation: ${type}`);
        }
        chaptersToInclude = chaptersToInclude.filter(cn => cn > 0 && cn <= courseDef.totalChapters); 

        console.log(`Chapter scope for ${type} ${id}: Chapters [${chaptersToInclude.join(', ')}]`);
        if (chaptersToInclude.length === 0 && type !== 'midcourse') { // Allow midcourse to proceed if its specific range is empty for short courses
            throw new Error("Could not determine any valid chapters for this activity. Check course length and activity ID.");
        } else if (chaptersToInclude.length === 0 && type === 'midcourse') {
             console.log(`Midcourse ${id} generation skipped as chapter range is empty.`);
             hideLoading();
             alert(`Midcourse Exam ${id} is not applicable for this course length or configuration.`);
             showCourseAssignmentsExams(courseId); // Refresh the assignments view
             return;
        }


        const courseResourcePath = `${COURSE_BASE_PATH}/${courseDef.courseDirName}/${DEFAULT_COURSE_QUESTIONS_FOLDER}`;
        const textMcqFileName = relatedTestGenSubject?.fileName || DEFAULT_COURSE_TEXT_MCQ_FILENAME;
        const textProbFileName = relatedTestGenSubject?.problemsFileName || DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME;
        const textMcqPath = `${courseResourcePath}/${textMcqFileName}`;
        const textProbPath = `${courseResourcePath}/${textProbFileName}`;
        const lectMcqPath = `${courseResourcePath}/${DEFAULT_COURSE_LECTURE_MCQ_FILENAME}`;
        const lectProbPath = `${courseResourcePath}/${DEFAULT_COURSE_LECTURE_PROBLEMS_FILENAME}`;

        console.log("Fetching content from paths:", {textMcqPath, textProbPath, lectMcqPath, lectProbPath});

        const [
            textMcqContent,
            textProbContent_fetched, 
            lectMcqContent,
            lectProbContent_fetched  
        ] = await Promise.all([
            fetchCourseMarkdownContent(textMcqPath),
            fetchCourseMarkdownContent(textProbPath), 
            fetchCourseMarkdownContent(lectMcqPath),
            fetchCourseMarkdownContent(lectProbPath)  
        ]);

        if (!textMcqContent && !textProbContent_fetched && !lectMcqContent && !lectProbContent_fetched) {
            throw new Error("Could not load ANY question/problem definition files for the course. Please check course configuration, related TestGen subject setup (for filenames), and file paths.");
        }

        console.log("Parsing fetched MCQ content...");
        const parsedTextMcqs = extractQuestionsFromMarkdown(textMcqContent, chaptersToInclude, 'text_mcq');
        const parsedLectMcqs = extractQuestionsFromMarkdown(lectMcqContent, chaptersToInclude, 'lect_mcq');
        
        console.log("Parsing problems (populating cache)...");
        await parseChapterProblems(textProbPath, subjectId, 'text_problems');
        await parseChapterProblems(lectProbPath, subjectId, 'lecture_problems');

        const availableTextMcqs = parsedTextMcqs.questions || [];
        const availableLectMcqs = parsedLectMcqs.questions || [];
        let availableTextProbs = [];
        let availableLectProbs = [];

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

        console.log(`Available Items For Exam: TextMCQ=${availableTextMcqs.length}, LectMCQ=${availableLectMcqs.length}, TextProb=${availableTextProbs.length}, LectProb=${availableLectProbs.length}. Total: ${totalAvailableItems}`);

        if (totalAvailableItems === 0) {
            throw new Error("No questions or problems found in the course files for the relevant chapters. Exam cannot be generated.");
        }

        // --- Determine Target Counts using new examConfig ---
        let finalTestSize = Math.min(examConfig.questions, totalAvailableItems);
        const overallMcqRatio = examConfig.mcqRatio; 
        const textSourceRatio = examConfig.textSourceRatio; 

        let targetTotalMcqsFromConfig = Math.round(finalTestSize * overallMcqRatio);
        let targetTotalProblemsFromConfig = finalTestSize - targetTotalMcqsFromConfig;
        
        let actualTargetTotalMcqs = Math.min(targetTotalMcqsFromConfig, totalAvailableMcqs);
        let actualTargetTotalProblems = Math.min(targetTotalProblemsFromConfig, totalAvailableProblems);

        let currentTotalSelected = actualTargetTotalMcqs + actualTargetTotalProblems;
        if (currentTotalSelected < finalTestSize) {
            let deficit = finalTestSize - currentTotalSelected;
            if (actualTargetTotalMcqs < totalAvailableMcqs) { 
                let canAddMcqs = totalAvailableMcqs - actualTargetTotalMcqs;
                let addMcqs = Math.min(deficit, canAddMcqs);
                actualTargetTotalMcqs += addMcqs;
                deficit -= addMcqs;
            }
            if (deficit > 0 && actualTargetTotalProblems < totalAvailableProblems) { 
                let canAddProbs = totalAvailableProblems - actualTargetTotalProblems;
                let addProbs = Math.min(deficit, canAddProbs);
                actualTargetTotalProblems += addProbs;
            }
        }
        finalTestSize = actualTargetTotalMcqs + actualTargetTotalProblems; 

        let targetTextMcqs = Math.min(availableTextMcqs.length, Math.round(actualTargetTotalMcqs * textSourceRatio));
        let targetLectMcqs = Math.min(availableLectMcqs.length, actualTargetTotalMcqs - targetTextMcqs);
        if (targetTextMcqs + targetLectMcqs < actualTargetTotalMcqs) {
            let mcqDeficit = actualTargetTotalMcqs - (targetTextMcqs + targetLectMcqs);
            if (availableTextMcqs.length > targetTextMcqs) {
                targetTextMcqs = Math.min(availableTextMcqs.length, targetTextMcqs + mcqDeficit);
            } else if (availableLectMcqs.length > targetLectMcqs) { 
                targetLectMcqs = Math.min(availableLectMcqs.length, targetLectMcqs + mcqDeficit);
            }
        }
        targetTextMcqs = Math.min(targetTextMcqs, availableTextMcqs.length);
        targetLectMcqs = Math.min(targetLectMcqs, availableLectMcqs.length);
        actualTargetTotalMcqs = targetTextMcqs + targetLectMcqs; 

        let targetTextProbs = Math.min(availableTextProbs.length, Math.round(actualTargetTotalProblems * textSourceRatio));
        let targetLectProbs = Math.min(availableLectProbs.length, actualTargetTotalProblems - targetTextProbs);
        if (targetTextProbs + targetLectProbs < actualTargetTotalProblems) {
            let probDeficit = actualTargetTotalProblems - (targetTextProbs + targetLectProbs);
            if (availableTextProbs.length > targetTextProbs) {
                targetTextProbs = Math.min(availableTextProbs.length, targetTextProbs + probDeficit);
            } else if (availableLectProbs.length > targetLectProbs) {
                targetLectProbs = Math.min(availableLectProbs.length, targetLectProbs + probDeficit);
            }
        }
        targetTextProbs = Math.min(targetTextProbs, availableTextProbs.length);
        targetLectProbs = Math.min(targetLectProbs, availableLectProbs.length);
        actualTargetTotalProblems = targetTextProbs + targetLectProbs;
        finalTestSize = actualTargetTotalMcqs + actualTargetTotalProblems;


        console.log('Final Target Selection Counts:', {
            configRequestedQuestions: examConfig.questions,
            finalExamSize: finalTestSize,
            overallMcqRatio, textSourceRatio,
            selectedTextMcqsCount: targetTextMcqs, selectedLectMcqsCount: targetLectMcqs,
            selectedTextProbsCount: targetTextProbs, selectedLectProbsCount: targetLectProbs
        });

        const selectedTextMcqs = [...availableTextMcqs].sort(() => 0.5 - Math.random()).slice(0, targetTextMcqs);
        const selectedLectMcqs = [...availableLectMcqs].sort(() => 0.5 - Math.random()).slice(0, targetLectMcqs);
        const finalSelectedMcqs = [...selectedTextMcqs, ...selectedLectMcqs];

        const selectedTextProbsRaw = [...availableTextProbs].sort(() => 0.5 - Math.random()).slice(0, targetTextProbs);
        const selectedLectProbsRaw = [...availableLectProbs].sort(() => 0.5 - Math.random()).slice(0, targetLectProbs);

        const problemToExamItem = (problem, indexOffset = 0, sourceSuffix = 'unknown') => ({
            id: problem.id || `problem-${problem.chapter}-${Date.now().toString().slice(-5)}-${indexOffset}-${sourceSuffix}`,
            chapter: String(problem.chapter),
            number: indexOffset, 
            text: problem.text || "Problem text not found.",
            options: [], image: null, correctAnswer: null,
            type: problem.type || 'Problem', difficulty: problem.difficulty,
            topics: problem.topics || [], isProblem: true
        });
        const finalSelectedTextProbs = selectedTextProbsRaw.map((p, i) => problemToExamItem(p, i, 'text_problems'));
        const finalSelectedLectProbs = selectedLectProbsRaw.map((p, i) => problemToExamItem(p, i, 'lecture_problems'));
        const finalSelectedProblems = [...finalSelectedTextProbs, ...finalSelectedLectProbs];

        const finalExamItems = combineProblemsWithQuestions(finalSelectedProblems, finalSelectedMcqs);

        if (finalExamItems.length === 0) {
            throw new Error("Failed to select any questions or problems after processing. Check source files and ratios.");
        }
        if (finalExamItems.length < examConfig.questions * 0.75) { 
             console.warn(`Generated exam has only ${finalExamItems.length} items, much lower than the target ${examConfig.questions}. Check course content availability.`);
        }

        console.log('Final Exam Composition:', {
            totalItems: finalExamItems.length,
            mcqs: finalSelectedMcqs.length,
            problems: finalSelectedProblems.length
        });

        const mcqAnswers = { ...parsedTextMcqs.answers, ...parsedLectMcqs.answers };
        const examIdSuffix = id.replace(/[^a-zA-Z0-9]/g, ''); 
        const examId = `${courseId}-${type}-${examIdSuffix}-${Date.now().toString().slice(-6)}`;
        const durationMinutes = examConfig.durationMinutes;

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
            subjectId: subjectId, 
            courseContext: { isCourseActivity: true, courseId: courseId, activityType: type, activityId: id, chapterScope: chaptersToInclude }
        };

        setCurrentOnlineTestState(onlineTestState);
        hideLoading();
        launchOnlineTestUI();

    } catch (error) {
        hideLoading();
        console.error(`Error starting ${type} ${id} for course ${courseId}:`, error);
        alert(`Could not start activity: ${error.message}`);
    }
}
window.startAssignmentOrExam = startAssignmentOrExam;

// --- Delete Course Activity Functions ---
export function confirmDeleteCourseActivity(courseId, activityType, activityId) {
    if (!currentUser) { alert("You must be logged in."); return; }
    const activityName = activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const activityNumber = activityId.replace(/[^0-9]/g, ''); 
    if (confirm(`Are you sure you want to delete the results for ${activityName} ${activityNumber || activityId}? This also deletes related exam history. This action cannot be undone.`)) {
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
            exam.type === activityType && exam.id && exam.id.includes(`-${activityType}-${activityId.replace(/[^a-zA-Z0-9]/g, '')}-`) 
        );

        let deletedExamCount = 0;
        if (examsToDelete.length > 0) {
            console.log(`Found ${examsToDelete.length} exam record(s) to delete for activity ${activityId}.`);
            for (const exam of examsToDelete) {
                 console.log(`Deleting exam record: ${exam.id}`);
                 const deleted = await deleteCompletedExamV2(exam.id); 
                 if (deleted) deletedExamCount++;
            }
            console.log(`Successfully deleted ${deletedExamCount} of ${examsToDelete.length} related exam records.`);
        } else {
            console.log(`No matching exam records found in userExams to delete for activity ${activityId}.`);
        }

        hideLoading();
        if (success || deletedExamCount > 0) {
            alert(`Successfully deleted progress score${deletedExamCount > 0 ? ` and ${deletedExamCount} related exam record(s)` : ''} for ${activityType} ${activityId}.`);
            showCourseAssignmentsExams(courseId); 
        } else if (!success && deletedExamCount === 0){
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