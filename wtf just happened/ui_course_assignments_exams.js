// --- START OF FILE ui_course_assignments_exams.js ---

// ui_course_assignments_exams.js

import { currentUser, userCourseProgressMap, globalCourseDataMap, activeCourseId, data } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
// MODIFIED: Added daysBetween import
import { showLoading, hideLoading, escapeHtml, getFormattedDate, daysBetween } from './utils.js';
// MODIFIED: Added selectNewProblemsAndUpdate, selectItems (renamed from selectQuestions)
import { allocateQuestions, selectNewQuestionsAndUpdate, selectNewProblemsAndUpdate, selectItems } from './test_logic.js';
// MODIFIED: Import extractItemsFromMarkdown
import { extractItemsFromMarkdown } from './markdown_parser.js';
import { launchOnlineTestUI, setCurrentOnlineTestState } from './ui_online_test.js';
import { ONLINE_TEST_DURATION_MINUTES } from './config.js';

// Helper to fetch markdown content (MCQ or Problems)
async function getSubjectMarkdown(subject, type = 'mcq') {
    if (!subject) return null;
    let fileName;
    if (type === 'problem') {
         fileName = "ChaptersProblems.md"; // Specific name for problems
    } else {
         // Default MCQ filename logic
         fileName = subject.fileName || (subject.name === "Fundamentals of Physics" ? "chapters.md" : `${subject.name}.md`);
    }
    const safeFileName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    const url = `${safeFileName}?t=${new Date().getTime()}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) { console.warn(`${type.toUpperCase()} MD file not found: ${url}`); return null; }
            throw new Error(`HTTP error fetching ${type} markdown! status: ${response.status} for ${url}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching ${type} Markdown for subject ${subject.name} (${url}):`, error);
        return null;
    }
}


export function showCourseAssignmentsExams(courseId = activeCourseId) {
    // ... (UI rendering remains the same) ...
    if (!currentUser || !courseId) return;
    setActiveSidebarLink('showCurrentAssignmentsExams', 'sidebar-course-nav'); // Corrected ID

    const progress = userCourseProgressMap.get(courseId);
    const courseDef = globalCourseDataMap.get(courseId);
    if (!progress || !courseDef) {
        displayContent(`<p class="text-red-500 p-4">Error: Could not load data for course ID: ${courseId}.</p>`, 'course-dashboard-area');
        return;
    }

    const enrollmentDate = progress.enrollmentDate; // Already a Date object from loadAllUserCourseProgress
    const today = new Date(); today.setHours(0,0,0,0);
    // Handle case where enrollmentDate might be missing or invalid
    const validEnrollmentDate = enrollmentDate instanceof Date && !isNaN(enrollmentDate);
    const daysElapsed = validEnrollmentDate ? daysBetween(enrollmentDate, today) : -1; // Use helper, handle invalid date

    const totalChaptersStudied = (progress.courseStudiedChapters || []).length;

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
            // Assignments require chapter N to be studied before starting assignment N+1, but assignment N can be started if Ch N is studied (or day 1).
            const canStart = (totalChaptersStudied >= i) || (i === 1 && totalChaptersStudied >= 0);

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
             const isDue = daysElapsed >= (i * 7) - 1 ; // Due at end of week i
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
         const isDue = totalChaptersStudied >= chapThreshold; // Due once chapter threshold reached
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
    // Access subject data via `data.subjects` using the relatedSubjectId
    const subject = data?.subjects?.[subjectId];

    // Ensure subject chapters exist and are loaded
    if (!progress || !courseDef || !subject || !subject.chapters) {
        hideLoading();
        alert("Error: Missing course/progress/subject or chapter data.");
        console.error("Data Check Failed:", { progress, courseDef, subjectId, subjectExists: !!subject, chaptersExist: !!subject?.chapters });
        return;
    }

    // --- Determine Chapter Scope ---
    let chaptersToInclude = [];
    const studiedChaptersSet = new Set(progress.courseStudiedChapters || []);
    const enrollmentDate = progress.enrollmentDate; // Already a Date object
    const today = new Date(); today.setHours(0,0,0,0);
    const validEnrollmentDate = enrollmentDate instanceof Date && !isNaN(enrollmentDate);

    try {
        if (!validEnrollmentDate) throw new Error("Invalid enrollment date.");

        switch (type) {
            case 'assignment':
                const dayNumMatch = id.match(/day(\d+)/); if (!dayNumMatch) throw new Error("Invalid assignment ID format.");
                const dayNum = parseInt(dayNumMatch[1], 10);
                // Assignment includes chapters studied on dayNum and dayNum-1 (if applicable)
                const targetDate = new Date(enrollmentDate); targetDate.setDate(enrollmentDate.getDate() + dayNum - 1); const targetDateStr = getFormattedDate(targetDate);
                const prevDate = new Date(targetDate); prevDate.setDate(targetDate.getDate() - 1); const prevDateStr = getFormattedDate(prevDate);
                const chapsToday = progress.dailyProgress?.[targetDateStr]?.chaptersStudied || [];
                const chapsYesterday = (dayNum > 1) ? progress.dailyProgress?.[prevDateStr]?.chaptersStudied || [] : [];
                chaptersToInclude = [...new Set([...chapsToday, ...chapsYesterday])].filter(ch => ch !== undefined && ch !== null);
                // Fallback: If no specific daily progress, include chapter N if studied, else last studied chapter.
                if (chaptersToInclude.length === 0) {
                     const lastStudied = Math.max(0, ...(progress.courseStudiedChapters || []));
                     if (studiedChaptersSet.has(dayNum)) chaptersToInclude.push(dayNum);
                     else if (lastStudied > 0) chaptersToInclude.push(lastStudied);
                     else if (dayNum === 1) chaptersToInclude.push(1); // Day 1 always targets Ch 1
                     console.log(`Assignment ${id} scope fallback:`, chaptersToInclude);
                }
                break;
            case 'weekly_exam':
                const weekNumMatch = id.match(/week(\d+)/); if (!weekNumMatch) throw new Error("Invalid weekly exam ID.");
                const weekNum = parseInt(weekNumMatch[1], 10); const startDay = (weekNum - 1) * 7; const endDay = weekNum * 7;
                // Include chapters studied *up to* the end of that week
                 chaptersToInclude = Array.from(studiedChaptersSet).filter(ch => {
                     // Check if the chapter was studied *within* the week or earlier
                     // Simple approach: If chapter number <= target chapters for that week end (approx)
                     // A more precise way needs dailyProgress logs for each chapter study date.
                     // Approximation: Target chapter for end of week = 1 + (endDay-1) * average_pace
                     // Let's just include all chapters studied *before or during* this week.
                     // Find the earliest day this chapter was studied? Too complex without better logs.
                     // Simplest: Include all chapters from 1 up to the max chapter studied *by the end of that week*.
                     // Need base pace or custom pace to estimate this.
                     // Fallback: Include all chapters studied *so far* up to this point.
                     return true; // Include all studied chapters for now. Refine later if needed.
                 });
                 // OR, include chapters specifically studied during that week based on dailyProgress
                 /*
                 for (let day = startDay; day < endDay; day++) {
                      if (day >= 0) {
                           const dateToCheck = new Date(enrollmentDate); dateToCheck.setDate(enrollmentDate.getDate() + day);
                           const dateStr = getFormattedDate(dateToCheck);
                           chaptersToInclude.push(...(progress.dailyProgress?.[dateStr]?.chaptersStudied || []));
                      }
                 }
                 chaptersToInclude = [...new Set(chaptersToInclude)].filter(ch => ch !== undefined && ch !== null);
                 */
                 if (chaptersToInclude.length === 0) chaptersToInclude = [1]; // Default to chapter 1 if nothing studied
                break;
            case 'midcourse':
                const midNumMatch = id.match(/mid(\d+)/); if (!midNumMatch || !courseDef.midcourseChapters?.[midNumMatch[1] - 1]) throw new Error("Invalid midcourse ID or definition.");
                const midNum = parseInt(midNumMatch[1], 10); const chapterThreshold = courseDef.midcourseChapters[midNum - 1]; const prevThreshold = midNum > 1 ? courseDef.midcourseChapters[midNum - 2] : 0;
                // Include chapters from (prevThreshold + 1) up to chapterThreshold
                chaptersToInclude = Array.from({ length: chapterThreshold - prevThreshold }, (_, i) => prevThreshold + 1 + i);
                break;
            case 'final':
                // Include all chapters
                chaptersToInclude = Array.from({ length: courseDef.totalChapters }, (_, i) => i + 1);
                break;
            default: throw new Error(`Unknown activity type: ${type}`);
        }

        // Filter scope to chapters that actually exist in the subject data
        chaptersToInclude = chaptersToInclude.filter(ch => subject.chapters[ch]);
        if (chaptersToInclude.length === 0) throw new Error("No relevant chapters found in subject data for this activity scope.");
        console.log(`Chapter scope for ${type} ${id}:`, chaptersToInclude);

        // --- Fetch Markdown (MCQ and Problems) ---
        const subjectMcqMd = await getSubjectMarkdown(subject, 'mcq');
        const subjectProblemsMd = await getSubjectMarkdown(subject, 'problem');
        if (!subjectMcqMd && !subjectProblemsMd) throw new Error("Could not load question/problem definitions.");

        // --- Determine Question/Problem Count & Allocate ---
        const defaultCounts = { assignment: 10, weekly_exam: 20, midcourse: 30, final: 42 };
        const numTotalItems = defaultCounts[type] || 15;
        const problemRatio = 0.5; // Target 50% problems

        const relevantChaptersForAllocation = {};
        let totalAvailableMCQ = 0;
        let totalAvailableProblems = 0;
        chaptersToInclude.forEach(chapNum => {
             const c = subject.chapters[chapNum];
             if (c) {
                 const availableMCQ = c.available_questions?.length || 0;
                 const availableProblems = c.available_problems?.length || 0;
                 if (availableMCQ > 0 || availableProblems > 0) {
                     relevantChaptersForAllocation[chapNum] = c; // Pass the full chapter object
                     totalAvailableMCQ += availableMCQ;
                     totalAvailableProblems += availableProblems;
                 }
             }
        });
        const totalAvailableItems = totalAvailableMCQ + totalAvailableProblems;
        if (totalAvailableItems === 0) throw new Error("No available questions or problems found in the selected chapter scope.");

        const finalTotalItemCount = Math.min(numTotalItems, totalAvailableItems);
        // Use the allocation function with the problem ratio
        const allocationResult = allocateQuestions(relevantChaptersForAllocation, finalTotalItemCount, problemRatio);
        let totalAllocatedMCQ = 0;
        let totalAllocatedProblems = 0;
        Object.values(allocationResult).forEach(alloc => {
            totalAllocatedMCQ += alloc.questions;
            totalAllocatedProblems += alloc.problems;
        });
        if (totalAllocatedMCQ === 0 && totalAllocatedProblems === 0) throw new Error("Failed to allocate any questions or problems.");
        console.log(`Allocation: ${totalAllocatedMCQ} MCQs, ${totalAllocatedProblems} Problems`, allocationResult);

        // --- Select Items ---
        const selectedItemsMapForExtraction = {}; // { chapNum: { questions: [...], problems: [...] } }
        let actualTotalSelectedMCQ = 0;
        let actualTotalSelectedProblems = 0;

        for (const chapNum in allocationResult) {
            const alloc = allocationResult[chapNum];
            selectedItemsMapForExtraction[chapNum] = { questions: [], problems: [] };

            if (alloc.questions > 0) {
                const chap = subject.chapters[chapNum];
                const selectedQ = selectNewQuestionsAndUpdate(chap, alloc.questions); // Use MCQ selection
                if (selectedQ.length > 0) {
                     selectedItemsMapForExtraction[chapNum].questions = selectedQ;
                     actualTotalSelectedMCQ += selectedQ.length;
                }
            }
            if (alloc.problems > 0) {
                const chap = subject.chapters[chapNum];
                const selectedP = selectNewProblemsAndUpdate(chap, alloc.problems); // Use Problem selection
                 if (selectedP.length > 0) {
                     selectedItemsMapForExtraction[chapNum].problems = selectedP;
                     actualTotalSelectedProblems += selectedP.length;
                 }
            }
        }
         if (actualTotalSelectedMCQ === 0 && actualTotalSelectedProblems === 0) throw new Error("Failed to select any questions or problems after allocation.");
         console.log(`Selected: ${actualTotalSelectedMCQ} MCQs, ${actualTotalSelectedProblems} Problems`);

        // --- Extract Items ---
        const { questions: extractedMCQs, problems: extractedProblems, answers: mcqAnswers } = extractItemsFromMarkdown(subjectMcqMd, subjectProblemsMd, selectedItemsMapForExtraction);

        // Validation after extraction (compare counts)
        if (extractedMCQs.length !== actualTotalSelectedMCQ) console.warn(`Selected ${actualTotalSelectedMCQ} MCQs, extracted ${extractedMCQs.length}.`);
        if (extractedProblems.length !== actualTotalSelectedProblems) console.warn(`Selected ${actualTotalSelectedProblems} Problems, extracted ${extractedProblems.length}.`);
        if (extractedMCQs.length === 0 && extractedProblems.length === 0) throw new Error("Extracted zero items.");

        // --- Launch Online Test ---
        const examId = `${courseId}-${type}-${id}-${Date.now()}`;
        // Combine and shuffle MCQs and Problems
        let combinedItems = [...extractedMCQs, ...extractedProblems];
        for (let i=combinedItems.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [combinedItems[i],combinedItems[j]]=[combinedItems[j],combinedItems[i]]; }

        const onlineTestState = {
            examId: examId,
            // Store combined list under 'items', keep original types separate if needed later?
            // Or just rely on item.type? Let's use 'items'.
            items: combinedItems, // Combined shuffled list
            questions: extractedMCQs, // Keep separate for reference? Maybe not needed.
            problems: extractedProblems, // Keep separate for reference? Maybe not needed.
            correctAnswers: mcqAnswers, // Only MCQ answers are stored here
            userAnswers: {},
            allocation: allocationResult, // Store the chapter allocation breakdown
            startTime: Date.now(),
            timerInterval: null,
            currentQuestionIndex: 0, // Start at index 0 of combined list
            status: 'active',
            // Set duration based on type and item count?
            durationMinutes: (type === 'assignment' ? Math.max(20, combinedItems.length * 2) : // 2 min/item for assignments
                              type === 'weekly_exam' ? Math.max(40, combinedItems.length * 2.5) : // 2.5 min/item
                              type === 'midcourse' ? Math.max(60, combinedItems.length * 3) : // 3 min/item
                              type === 'final' ? Math.max(90, combinedItems.length * 3) : // 3 min/item for finals
                              60), // Default
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

// --- END OF FILE ui_course_assignments_exams.js ---