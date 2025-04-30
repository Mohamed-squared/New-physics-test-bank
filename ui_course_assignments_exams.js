// --- START OF FILE ui_course_assignments_exams.js ---

// ui_course_assignments_exams.js

import { currentUser, userCourseProgressMap, globalCourseDataMap, activeCourseId, data } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
// MODIFIED: Added daysBetween import
import { showLoading, hideLoading, escapeHtml, getFormattedDate, daysBetween } from './utils.js';
// *** MODIFIED: Import selectNewQuestionsAndUpdate from test_logic ***
import { allocateQuestions, selectQuestions, parseChapterProblems, selectProblemsForExam, combineProblemsWithQuestions, selectNewQuestionsAndUpdate } from './test_logic.js';
import { extractQuestionsFromMarkdown } from './markdown_parser.js';
import { launchOnlineTestUI, setCurrentOnlineTestState } from './ui_online_test.js';
import { ONLINE_TEST_DURATION_MINUTES, FOP_COURSE_ID } from './config.js'; // Added FOP_COURSE_ID for subject check

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


export function showCourseAssignmentsExams(courseId = activeCourseId) {
    if (!currentUser || !courseId) return;
    setActiveSidebarLink('showCurrentAssignmentsExams', 'sidebar-course-nav'); // Corrected ID

    const progress = userCourseProgressMap.get(courseId);
    const courseDef = globalCourseDataMap.get(courseId);
    if (!progress || !courseDef) {
        displayContent(`<p class="text-red-500 p-4">Error: Could not load data for course ID: ${courseId}.</p>`, 'course-dashboard-area');
        return;
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
        </div>`;
    displayContent(html, 'course-dashboard-area');
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

        // --- Determine MCQ Count & Allocate ---
        // *** MODIFIED: Use specific counts from Requirement 5 ***
        const defaultCounts = { assignment: 10, weekly_exam: 30, midcourse: 50, final: 60 };
        const totalTargetQuestions = defaultCounts[type] || 15; // Fallback if type is somehow wrong
        const targetProblemCount = Math.min(selectedProblems.length, Math.floor(totalTargetQuestions * 0.5)); // Still aim for ~50% problems if possible
        const targetMcqCount = totalTargetQuestions - targetProblemCount;


        let selectedMcqs = [];
        let mcqAnswers = {};
        if (targetMcqCount > 0 && subjectMd) {
            const relevantChaptersForAllocation = {};
            let totalAvailableMcqsInScope = 0;
            chaptersToInclude.forEach(chapNum => {
                const c = subject.chapters[chapNum];
                // Use 'available_questions' which is the list of question numbers
                if (c && c.available_questions?.length > 0) {
                     relevantChaptersForAllocation[chapNum] = c;
                     totalAvailableMcqsInScope += c.available_questions.length;
                }
            });

            if (totalAvailableMcqsInScope > 0) {
                const finalMcqCount = Math.min(targetMcqCount, totalAvailableMcqsInScope);
                 if (finalMcqCount > 0) { // Check if we actually need MCQs after min()
                    const allocationCounts = allocateQuestions(relevantChaptersForAllocation, finalMcqCount);
                    const totalAllocatedMcqs = Object.values(allocationCounts).reduce((a, b) => a + b, 0);

                    if (totalAllocatedMcqs > 0) {
                        const selectedQuestionsMap = {};
                        let actualTotalSelectedMcqs = 0;
                        for (const chapNum in allocationCounts) {
                            const n = allocationCounts[chapNum];
                            if (n > 0) {
                                const chap = subject.chapters[chapNum];
                                // *** CORRECTED: Use imported function ***
                                 const selected = selectNewQuestionsAndUpdate(chap, n);
                                 if (selected.length > 0) {
                                     selectedQuestionsMap[chapNum] = selected;
                                     actualTotalSelectedMcqs += selected.length;
                                }
                            }
                        }
                        if (actualTotalSelectedMcqs > 0) {
                            const { questions: extractedMcqs, answers } = extractQuestionsFromMarkdown(subjectMd, selectedQuestionsMap);
                            selectedMcqs = extractedMcqs;
                            mcqAnswers = answers;
                            console.log(`Selected ${selectedMcqs.length} MCQs.`);
                        }
                    }
                 } else { console.log("Skipping MCQ selection as finalMcqCount is 0.");}
            }
        } else if (targetMcqCount > 0 && !subjectMd) {
             console.warn("Targeted MCQs but Markdown content is missing.");
        }

        // --- Combine Problems and MCQs ---
        // Adjust final list to be closer to targetTotalQuestions
        const finalExamItems = combineProblemsWithQuestions(selectedProblems, selectedMcqs, totalTargetQuestions);

        if (finalExamItems.length === 0) throw new Error("Failed to select any questions or problems.");

        // --- Launch Online Test ---
        const examId = `${courseId}-${type}-${id}-${Date.now()}`;

        const onlineTestState = {
            examId: examId,
            questions: finalExamItems, // Combined and shuffled list
            correctAnswers: mcqAnswers, // Only contains MCQ answers
            userAnswers: {},
            allocation: null, // Allocation less relevant for combined tests
            startTime: Date.now(),
            timerInterval: null,
            currentQuestionIndex: 0,
            status: 'active',
            // Set duration based on type and final item count
            durationMinutes: Math.max(15, Math.min(180, finalExamItems.length * 2.5)), // Adjusted max duration, e.g., 3 hours max
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