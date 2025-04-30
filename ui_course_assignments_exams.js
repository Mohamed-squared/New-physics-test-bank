// --- START OF FILE ui_course_assignments_exams.js ---

// ui_course_assignments_exams.js

import { currentUser, userCourseProgressMap, globalCourseDataMap, activeCourseId, data } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml, getFormattedDate, daysBetween } from './utils.js';
// Import test_logic functions
import { allocateQuestions, selectQuestions, parseChapterProblems, selectProblemsForExam, combineProblemsWithQuestions, selectNewQuestionsAndUpdate } from './test_logic.js';
import { extractQuestionsFromMarkdown } from './markdown_parser.js';
import { launchOnlineTestUI, setCurrentOnlineTestState } from './ui_online_test.js';
// *** MODIFIED: Import exam history functions ***
import { getExamHistory } from './exam_storage.js';
// *** MODIFIED: Import MAX_MARKS constants ***
import { EXAM_QUESTION_COUNTS, EXAM_DURATIONS_MINUTES, FOP_COURSE_ID, SKIP_EXAM_PASSING_PERCENT, DEFAULT_MCQ_PROBLEM_RATIO, MAX_MARKS_PER_PROBLEM, MAX_MARKS_PER_MCQ } from './config.js';

// Helper to fetch markdown content (needed for extracting MCQs)
async function getSubjectMarkdown(subject) {
    if (!subject) return null;
    // Use subject.fileName, default logic might need adjustment based on expected import data format
    const fileName = subject.fileName || (subject.name === "Fundamentals of Physics" ? "chapters.md" : `${subject.name}.md`);
    const safeFileName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    // MODIFIED: Use relative path
    const url = `./${safeFileName}?t=${new Date().getTime()}`; // Add cache buster

    console.log(`Fetching Markdown for subject ${subject.name} from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Markdown file not found for subject ${subject.name} at ${url}.`);
                return null;
            }
            throw new Error(`HTTP error fetching markdown! status: ${response.status} for ${url}`);
        }
        const mdContent = await response.text();
        console.log(`Markdown fetched successfully for ${subject.name}.`);
        return mdContent;
    } catch (error) {
        console.error(`Error fetching Markdown for subject ${subject.name} (${url}):`, error);
        alert(`Warning: Could not load chapter definitions for subject "${subject.name}". Tests cannot be generated.`);
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
                <button onclick="window.showExamReviewUI('${currentUser.uid}', '${exam.id}')" class="btn-secondary-small">
                    View Review
                </button>
            </li>`;
    });
    html += '</ul>';
    return html;
}

export async function showCourseAssignmentsExams(courseId = activeCourseId) {
    if (!currentUser || !courseId) return;
    setActiveSidebarLink('showCurrentAssignmentsExams', 'sidebar-course-nav');

    showLoading("Loading course assignments and exams...");

    try {
        const progress = userCourseProgressMap.get(courseId);
        const courseDef = globalCourseDataMap.get(courseId);
        if (!progress || !courseDef) {
            hideLoading();
            displayContent(`<p class="text-red-500 p-4">Error: Could not load data for course ID: ${courseId}.</p>`, 'course-dashboard-area');
            return;
        }

        // Fetch completed exams for this course
        const completedCourseExams = await getExamHistory(currentUser.uid, courseId, 'course');

        // MODIFIED: Check viewer mode
        const isViewer = progress.enrollmentMode === 'viewer';
        if (isViewer) {
            displayContent(`<div class="content-card text-center p-6"><p class="text-purple-700 dark:text-purple-300 font-medium">Assignments and Exams are not available in Viewer Mode.</p><button onclick="window.showCurrentCourseDashboard('${courseId}')" class="btn-secondary mt-4">Back to Dashboard</button></div>`, 'course-dashboard-area');
            return; // Don't show assignments/exams for viewers
        }

        const enrollmentDate = progress.enrollmentDate instanceof Date && !isNaN(progress.enrollmentDate)
                             ? progress.enrollmentDate
                             : null; // Ensure it's a valid Date object

        const today = new Date(); today.setHours(0,0,0,0);
        const validEnrollmentDate = enrollmentDate instanceof Date;
        const daysElapsed = validEnrollmentDate ? daysBetween(enrollmentDate, today) : -1; // Use helper, handle invalid date

        // --- NEW: Use combined studied logic ---
        const studiedChaptersSet = new Set(progress.courseStudiedChapters || []);
        const totalChapters = courseDef?.totalChapters || 1;
        if (progress.lastSkipExamScore) {
            for (let i = 1; i <= totalChapters; i++) {
                const skipScore = progress.lastSkipExamScore[i] || progress.lastSkipExamScore[String(i)];
                // Use config value for passing threshold
                if (skipScore !== undefined && skipScore !== null && skipScore >= (courseDef.skipExamPassingPercent || 70)) {
                    studiedChaptersSet.add(i);
                }
            }
        }
        const totalChaptersStudied = studiedChaptersSet.size;

        // --- Generate Lists ---
        // Assignments
        let assignmentsHtml = `<h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Daily Assignments</h3><ul class="space-y-2">`;
        if (!validEnrollmentDate) {
             assignmentsHtml += `<li class="text-sm text-red-500">Cannot determine assignments due to invalid enrollment date.</li>`;
        } else {
            const maxAssignmentsToShow = Math.min(courseDef.totalChapters, daysElapsed + 1); // Show assignments up to today
            for (let i = 1; i <= maxAssignmentsToShow; i++) {
                const dateForAssignment = new Date(enrollmentDate); dateForAssignment.setDate(enrollmentDate.getDate() + i - 1);
                const dateStr = getFormattedDate(dateForAssignment);
                const assignmentId = `day${i}`;
                const score = progress.assignmentScores?.[assignmentId];
                // Can start assignment 'i' if chapter 'i' is in the studied set (or if it's day 1)
                const canStart = studiedChaptersSet.has(i) || i === 1;

                if (score !== undefined) { assignmentsHtml += `<li class="text-sm text-muted">Assignment ${i} (${dateStr}) - Completed (Score: ${score.toFixed(1)}%)</li>`; }
                else if (canStart) { assignmentsHtml += `<li><button class="link" onclick="window.startAssignmentOrExam('${courseId}', 'assignment', '${assignmentId}')">Start Assignment ${i}</button> (${dateStr})</li>`; }
                else { assignmentsHtml += `<li class="text-sm text-muted">Assignment ${i} (${dateStr}) - (Study Chapter ${i} first)</li>`; }
            }
            if (maxAssignmentsToShow <= 0) assignmentsHtml += `<li class="text-sm text-muted">No assignments generated yet.</li>`;
        }
        assignmentsHtml += `</ul>`;

        // Weekly Exams
        let weeklyExamsHtml = `<h3 class="text-lg font-semibold mb-3 mt-6 text-gray-700 dark:text-gray-300">Weekly Exams</h3><ul class="space-y-2">`;
        if (!validEnrollmentDate) {
             weeklyExamsHtml += `<li class="text-sm text-red-500">Cannot determine exams due to invalid enrollment date.</li>`;
        } else {
            const currentWeek = Math.floor(daysElapsed / 7) + 1;
            const totalPossibleWeeks = Math.ceil(courseDef.totalChapters / 7); // Estimate total weeks needed
            for (let i = 1; i <= totalPossibleWeeks; i++) {
                 const weeklyExamId = `week${i}`; const score = progress.weeklyExamScores?.[weeklyExamId];
                 const isDue = daysElapsed >= (i * 7) - 1 ; // Due at end of week i (day 7, 14, 21...)
                 if (score !== undefined) { weeklyExamsHtml += `<li class="text-sm text-muted">Weekly Exam ${i} - Completed (Score: ${score.toFixed(1)}%)</li>`; }
                 else if (isDue) { weeklyExamsHtml += `<li><button class="link" onclick="window.startAssignmentOrExam('${courseId}', 'weekly_exam', '${weeklyExamId}')">Start Weekly Exam ${i}</button></li>`; }
                 else { weeklyExamsHtml += `<li class="text-sm text-muted">Weekly Exam ${i} (Available end of week ${i})</li>`; }
            }
            if (totalPossibleWeeks === 0) weeklyExamsHtml += `<li class="text-sm text-muted">No weekly exams applicable.</li>`;
        }
        weeklyExamsHtml += `</ul>`;

        // Midcourse Exams
        let midcourseHtml = `<h3 class="text-lg font-semibold mb-3 mt-6 text-gray-700 dark:text-gray-300">Midcourse Exams</h3><ul class="space-y-2">`;
         (courseDef.midcourseChapters || []).forEach((chapThreshold, index) => {
             const midNum = index + 1; const midId = `mid${midNum}`; const score = progress.midcourseExamScores?.[midId];
             const isDue = totalChaptersStudied >= chapThreshold; // Due once chapter threshold reached (using combined studied set)
             if (score !== undefined) { midcourseHtml += `<li class="text-sm text-muted">Midcourse Exam ${midNum} - Completed (Score: ${score.toFixed(1)}%)</li>`; }
             else if (isDue) { midcourseHtml += `<li><button class="link" onclick="window.startAssignmentOrExam('${courseId}', 'midcourse', '${midId}')">Start Midcourse Exam ${midNum}</button> (After Ch ${chapThreshold})</li>`; }
             else { midcourseHtml += `<li class="text-sm text-muted">Midcourse Exam ${midNum} (Available after Ch ${chapThreshold})</li>`; }
         });
          if ((courseDef.midcourseChapters || []).length === 0) midcourseHtml += `<li class="text-sm text-muted">No midcourse exams defined.</li>`;
        midcourseHtml += `</ul>`;

        // Final Exams
        let finalHtml = `<h3 class="text-lg font-semibold mb-3 mt-6 text-gray-700 dark:text-gray-300">Final Exams</h3><ul class="space-y-2">`;
         const allChaptersDone = totalChaptersStudied >= courseDef.totalChapters;
         if (allChaptersDone) {
              for (let i = 1; i <= 3; i++) {
                  const finalId = `final${i}`; const score = progress.finalExamScores?.[i-1];
                  if (score === undefined || score === null) { finalHtml += `<li><button class="link" onclick="window.startAssignmentOrExam('${courseId}', 'final', '${finalId}')">Start Final Exam ${i}</button></li>`; }
                  else { finalHtml += `<li class="text-sm text-muted">Final Exam ${i} - Completed (Score: ${score.toFixed(1)}%)</li>`; }
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
                
                <!-- Completed Exams History -->
                <div class="content-card">
                    <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Completed Exams History</h3>
                    ${renderCourseExamHistoryList(completedCourseExams)}
                </div>
            </div>`;

        displayContent(html, 'course-dashboard-area');
        hideLoading();

    } catch (error) {
        console.error('Error loading course assignments and exams:', error);
        hideLoading();
        displayContent(`
            <div class="text-red-500 p-4">
                <p>Error loading assignments and exams: ${error.message}</p>
                <button onclick="window.showCurrentCourseDashboard('${courseId}')" class="btn-secondary mt-4">
                    Back to Dashboard
                </button>
            </div>
        `, 'course-dashboard-area');
    }
}

// --- Start Exam/Assignment Logic ---
export async function startAssignmentOrExam(courseId, type, id) {
    showLoading(`Preparing ${type} ${id}...`);

    const progress = userCourseProgressMap.get(courseId);
    const courseDef = globalCourseDataMap.get(courseId);
    const subjectId = courseDef?.relatedSubjectId;
    // Ensure 'data' and 'data.subjects' exist before accessing
    const subject = (data && data.subjects) ? data.subjects[subjectId] : null;

    if (!progress || !courseDef || !subject?.chapters) {
         hideLoading();
         alert("Error: Missing course, progress, or related subject data.");
         console.error("Missing data:", { progress, courseDef, subjectId, subject });
         return;
     }

    // --- Determine Chapter Scope ---
    let chaptersToInclude = [];
    // Use combined studied set for determining scope/availability
    const studiedChaptersSet = new Set(progress.courseStudiedChapters || []);
    const courseTotalChapters = courseDef?.totalChapters || 1;
    if (progress.lastSkipExamScore) {
        for (let i = 1; i <= courseTotalChapters; i++) {
            const skipScore = progress.lastSkipExamScore[i] || progress.lastSkipExamScore[String(i)];
            // Use config value for passing threshold
            if (skipScore !== undefined && skipScore !== null && skipScore >= (courseDef.skipExamPassingPercent || 70)) {
                studiedChaptersSet.add(i);
            }
        }
    }

    const enrollmentDate = progress.enrollmentDate instanceof Date && !isNaN(progress.enrollmentDate)
                         ? progress.enrollmentDate
                         : null;
    const today = new Date(); today.setHours(0,0,0,0);
    const validEnrollmentDate = enrollmentDate instanceof Date;

    try {
        if (!validEnrollmentDate && type !== 'final') throw new Error("Invalid enrollment date."); // Allow finals even without valid date? Maybe not.

        switch (type) {
            case 'assignment':
                const dayNumMatch = id.match(/day(\d+)/); if (!dayNumMatch) throw new Error("Invalid assignment ID format.");
                const dayNum = parseInt(dayNumMatch[1], 10);
                // Include target chapter for the day
                chaptersToInclude = [dayNum];
                break;
            case 'weekly_exam':
                const weekNumMatch = id.match(/week(\d+)/); if (!weekNumMatch) throw new Error("Invalid weekly exam ID.");
                const weekNum = parseInt(weekNumMatch[1], 10);
                const startChap = (weekNum - 1) * 7 + 1;
                const endChap = Math.min(weekNum * 7, courseDef.totalChapters);
                // Include chapters *covered* in that week
                chaptersToInclude = Array.from({ length: endChap - startChap + 1 }, (_, i) => startChap + i);
                break;
            case 'midcourse':
                const midNumMatch = id.match(/mid(\d+)/); if (!midNumMatch || !courseDef.midcourseChapters?.[midNumMatch[1] - 1]) throw new Error("Invalid midcourse ID or definition.");
                const midNum = parseInt(midNumMatch[1], 10);
                const chapterThreshold = courseDef.midcourseChapters[midNum - 1];
                const prevThreshold = midNum > 1 ? courseDef.midcourseChapters[midNum - 2] : 0;
                // Include chapters from (prevThreshold + 1) up to chapterThreshold
                chaptersToInclude = Array.from({ length: chapterThreshold - prevThreshold }, (_, i) => prevThreshold + 1 + i);
                break;
            case 'final':
                // Include all chapters
                chaptersToInclude = Array.from({ length: courseDef.totalChapters }, (_, i) => i + 1);
                break;
            default: throw new Error(`Unknown activity type: ${type}`);
        }

        // Filter chapters to only those that exist in the subject data and have questions
        chaptersToInclude = chaptersToInclude.filter(ch => subject.chapters[ch]?.total_questions > 0);
        if (chaptersToInclude.length === 0) throw new Error("No relevant chapters with questions found for this activity.");
        console.log(`Chapter scope for ${type} ${id}:`, chaptersToInclude);

        // --- Fetch Markdown for MCQs ---
        const subjectMd = await getSubjectMarkdown(subject);
        if (!subjectMd && type !== 'final') { // Allow final even without MD if problems exist
             console.warn("Markdown not found, cannot extract MCQs. Proceeding with problems only if applicable.");
        }

        // --- Fetch Problems ---
        // MODIFIED: Pass subject to problem parser
        await parseChapterProblems(subject); // Ensure problem cache is populated for this subject
        let selectedProblems = [];
        chaptersToInclude.forEach(chapNum => {
            // Select a small number of problems per chapter, adjust counts per type
            let problemCount = 0;
            if (type === 'assignment') problemCount = 2; // Example: 2 problems for daily
            else if (type === 'weekly_exam') problemCount = 5; // Example: 5 problems for weekly
            else if (type === 'midcourse') problemCount = 8; // Example: 8 problems for mid
            else if (type === 'final') problemCount = 10; // Example: 10 problems for final

             if (problemCount > 0) {
                 // MODIFIED: Pass subject.id
                 selectedProblems.push(...selectProblemsForExam(chapNum, problemCount, subject.id));
             }
        });
        console.log(`Selected ${selectedProblems.length} problems.`);

        // --- Determine Target Counts based on Exam Type ---
        // First, calculate total available questions within scope
        let totalAvailableMcqsInScope = 0;
        let totalAvailableProblemsInScope = 0;

        // Count available MCQs in scope
        chaptersToInclude.forEach(chapNum => {
            const chap = subject.chapters[chapNum];
            if (chap && Array.isArray(chap.available_questions)) {
                totalAvailableMcqsInScope += chap.available_questions.length;
            }
        });

        // Count available problems in scope
        chaptersToInclude.forEach(chapNum => {
            const problemsForChapter = window.subjectProblemCache?.get(subject.id)?.[chapNum] || [];
            totalAvailableProblemsInScope += problemsForChapter.length;
        });

        // Get target total from config and calculate final size
        const totalTargetQuestions = EXAM_QUESTION_COUNTS[type] || 15;
        const actualTotalAvailable = totalAvailableMcqsInScope + totalAvailableProblemsInScope;
        const finalTestSize = Math.min(totalTargetQuestions, actualTotalAvailable);

        // Get MCQ ratio (either from subject or default)
        const subjectMcqRatio = subject.mcqProblemRatio || DEFAULT_MCQ_PROBLEM_RATIO || 0.5;

        // Calculate initial target counts based on ratio
        let targetMcqCount = Math.min(totalAvailableMcqsInScope, Math.round(finalTestSize * subjectMcqRatio));
        let targetProblemCount = Math.min(totalAvailableProblemsInScope, finalTestSize - targetMcqCount);

        // Adjust if needed to reach finalTestSize
        if (targetMcqCount + targetProblemCount < finalTestSize) {
            const deficit = finalTestSize - (targetMcqCount + targetProblemCount);
            if (totalAvailableMcqsInScope > targetMcqCount) {
                targetMcqCount = Math.min(totalAvailableMcqsInScope, targetMcqCount + deficit);
            } else if (totalAvailableProblemsInScope > targetProblemCount) {
                targetProblemCount = Math.min(totalAvailableProblemsInScope, targetProblemCount + deficit);
            }
        }

        // Final adjustment to ensure we don't exceed available counts
        targetMcqCount = Math.min(totalAvailableMcqsInScope, targetMcqCount);
        targetProblemCount = Math.min(totalAvailableProblemsInScope, targetProblemCount);

        // Log the final calculations
        console.log('Exam Generation Stats:', {
            type,
            id,
            chaptersToInclude,
            totalAvailableMcqsInScope,
            totalAvailableProblemsInScope,
            actualTotalAvailable,
            totalTargetQuestions,
            finalTestSize,
            mcqRatio: subjectMcqRatio,
            targetMcqCount,
            targetProblemCount
        });

        let selectedMcqs = [];
        let mcqAnswers = {};
        let selectedMcqMap = {};

        if (targetMcqCount > 0 && subjectMd) {
            const relevantChaptersForAllocation = {};
            chaptersToInclude.forEach(chapNum => {
                const c = subject.chapters[chapNum];
                if (c && c.available_questions?.length > 0) {
                    relevantChaptersForAllocation[chapNum] = c;
                }
            });

            if (Object.keys(relevantChaptersForAllocation).length > 0) {
                const allocationCounts = allocateQuestions(relevantChaptersForAllocation, targetMcqCount);
                console.log('MCQ Allocation by Chapter:', allocationCounts);

                for (const chapNum in allocationCounts) {
                    const n = allocationCounts[chapNum];
                    if (n > 0) {
                        const chap = subject.chapters[chapNum];
                        const selected = selectNewQuestionsAndUpdate(chap, n);
                        if (selected.length > 0) {
                            selectedMcqMap[chapNum] = selected;
                        }
                    }
                }

                if (Object.keys(selectedMcqMap).length > 0) {
                    const { questions: extractedMcqs, answers } = extractQuestionsFromMarkdown(subjectMd, selectedMcqMap);
                    selectedMcqs = extractedMcqs;
                    mcqAnswers = answers;
                    console.log(`Selected ${selectedMcqs.length} MCQs from ${Object.keys(selectedMcqMap).length} chapters.`);
                }
            }
        } else if (targetMcqCount > 0) {
            console.warn("Targeted MCQs but Markdown content is missing.");
        }

        // Select problems based on target count
        if (targetProblemCount > 0) {
            chaptersToInclude.forEach(chapNum => {
                const problemsPerChapter = Math.ceil(targetProblemCount / chaptersToInclude.length);
                const chapterProblems = selectProblemsForExam(chapNum, problemsPerChapter, subject.id);
                selectedProblems.push(...chapterProblems);
            });
            console.log(`Selected ${selectedProblems.length} problems from ${chaptersToInclude.length} chapters.`);
        }

        // --- Combine Problems and MCQs ---
        const finalExamItems = combineProblemsWithQuestions(selectedProblems, selectedMcqs, finalTestSize);

        if (finalExamItems.length === 0) {
            throw new Error("Failed to select any questions or problems.");
        }

        // Log final exam composition
        console.log('Final Exam Composition:', {
            totalItems: finalExamItems.length,
            mcqs: selectedMcqs.length,
            problems: selectedProblems.length
        });

        // --- Launch Online Test ---
        const examId = `${courseId}-${type}-${id}-${Date.now()}`;
        // *** MODIFIED: Use EXAM_DURATIONS_MINUTES from config ***
        const durationMinutes = EXAM_DURATIONS_MINUTES[type] || Math.max(15, Math.min(180, finalExamItems.length * 2.5)); // Fallback if type not in config

        const onlineTestState = {
            examId: examId,
            questions: finalExamItems, // Combined and shuffled list
            correctAnswers: mcqAnswers, // Only contains MCQ answers
            userAnswers: {},
            allocation: selectedMcqMap, // Store MCQ allocation
            problemAllocation: selectedProblems.map(p => ({ chapter: p.chapter, id: p.id })), // Store problem info
            startTime: Date.now(),
            timerInterval: null,
            currentQuestionIndex: 0,
            status: 'active',
            durationMinutes: durationMinutes, // Use duration from config
            subjectId: subject.id, // Include subject ID for context
            courseContext: { isCourseActivity: true, courseId: courseId, activityType: type, activityId: id }
        };

        // Add chapterNum context specifically for skip exams
        if (type === 'skip_exam') {
            const chapNumMatch = id.match(/chapter(\d+)/i); // Assuming id is like 'chapterX' for skip exams
            if (chapNumMatch) {
                onlineTestState.courseContext.chapterNum = parseInt(chapNumMatch[1]);
            }
        }


        setCurrentOnlineTestState(onlineTestState);
        hideLoading();
        launchOnlineTestUI();

    } catch (error) {
        hideLoading(); console.error(`Error starting ${type} ${id}:`, error);
        alert(`Could not start activity: ${error.message}`);
    }
}

// --- END OF FILE ui_course_assignments_exams.js ---