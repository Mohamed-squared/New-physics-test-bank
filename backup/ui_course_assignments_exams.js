// --- START OF FILE ui_course_assignments_exams.js ---

// ui_course_assignments_exams.js

import { currentUser, userCourseProgressMap, globalCourseDataMap, activeCourseId, data } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
// MODIFIED: Added daysBetween import
import { showLoading, hideLoading, escapeHtml, getFormattedDate, daysBetween } from './utils.js';
import { allocateQuestions, selectNewQuestionsAndUpdate, selectQuestions } from './test_logic.js'; // MODIFIED: Added selectQuestions
import { extractQuestionsFromMarkdown } from './markdown_parser.js';
import { launchOnlineTestUI, setCurrentOnlineTestState } from './ui_online_test.js';
import { ONLINE_TEST_DURATION_MINUTES } from './config.js';

// Helper to fetch markdown content (replicated for standalone use if needed)
async function getSubjectMarkdown(subject) {
    if (!subject) return null;
    const fileName = subject.fileName || (subject.name === "Fundamentals of Physics" ? "chapters.md" : `${subject.name}.md`);
    const safeFileName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    const url = `${safeFileName}?t=${new Date().getTime()}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) { console.warn(`MD file not found: ${url}`); return null; }
            throw new Error(`HTTP error fetching markdown! status: ${response.status} for ${url}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching Markdown for subject ${subject.name} (${url}):`, error);
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
            const canStart = i <= totalChaptersStudied + 1 || i === 1; // Can start if chapter studied or it's day 1

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
    const subject = data?.subjects?.[subjectId]; // Get the linked subject from appData

    if (!progress || !courseDef || !subject?.chapters) { hideLoading(); alert("Error: Missing course/progress/subject data."); return; }

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
                // Include chapters studied on dayNum and dayNum-1
                const targetDate = new Date(enrollmentDate); targetDate.setDate(enrollmentDate.getDate() + dayNum - 1); const targetDateStr = getFormattedDate(targetDate);
                const prevDate = new Date(targetDate); prevDate.setDate(targetDate.getDate() - 1); const prevDateStr = getFormattedDate(prevDate);
                const chapsToday = progress.dailyProgress?.[targetDateStr]?.chaptersStudied || [];
                const chapsYesterday = (dayNum > 1) ? progress.dailyProgress?.[prevDateStr]?.chaptersStudied || [] : [];
                chaptersToInclude = [...new Set([...chapsToday, ...chapsYesterday])].filter(ch => ch !== undefined && ch !== null);
                // Fallback: if no chapters logged, include target chapter for the day if studied, or last studied
                if (chaptersToInclude.length === 0) {
                     const lastStudied = Math.max(0, ...(progress.courseStudiedChapters || []));
                     if (studiedChaptersSet.has(dayNum)) chaptersToInclude.push(dayNum);
                     else if (lastStudied > 0) chaptersToInclude.push(lastStudied);
                }
                break;
            case 'weekly_exam':
                const weekNumMatch = id.match(/week(\d+)/); if (!weekNumMatch) throw new Error("Invalid weekly exam ID.");
                const weekNum = parseInt(weekNumMatch[1], 10); const startDay = (weekNum - 1) * 7; const endDay = weekNum * 7;
                // Include chapters studied during that week
                for (let day = startDay; day < endDay; day++) {
                     if (day >= 0) { const dateToCheck = new Date(enrollmentDate); dateToCheck.setDate(enrollmentDate.getDate() + day); const dateStr = getFormattedDate(dateToCheck); chaptersToInclude.push(...(progress.dailyProgress?.[dateStr]?.chaptersStudied || [])); }
                } chaptersToInclude = [...new Set(chaptersToInclude)].filter(ch => ch !== undefined && ch !== null);
                // Fallback: Include all studied chapters up to the end of that week? Or just what was logged? Stick to logged for now.
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

        chaptersToInclude = chaptersToInclude.filter(ch => subject.chapters[ch]?.total_questions > 0);
        if (chaptersToInclude.length === 0) throw new Error("No relevant chapters with questions found for this activity.");
        console.log(`Chapter scope for ${type} ${id}:`, chaptersToInclude);

        // --- Fetch Markdown ---
        const subjectMd = await getSubjectMarkdown(subject); if (!subjectMd) throw new Error("Could not load question definitions.");

        // --- Determine Question Count & Allocate ---
        const defaultCounts = { assignment: 10, weekly_exam: 20, midcourse: 30, final: 42 };
        const numQuestions = defaultCounts[type] || 15;
        const relevantChaptersForAllocation = {}; let totalAvailableInScope = 0;
        chaptersToInclude.forEach(chapNum => { const c = subject.chapters[chapNum]; if (c && c.available_questions?.length > 0) { relevantChaptersForAllocation[chapNum] = c; totalAvailableInScope += c.available_questions.length; } });
        if (totalAvailableInScope === 0) throw new Error("No available questions in scope.");

        const finalQuestionCount = Math.min(numQuestions, totalAvailableInScope);
        const allocationCounts = allocateQuestions(relevantChaptersForAllocation, finalQuestionCount);
        const totalAllocatedCount = Object.values(allocationCounts).reduce((a, b) => a + b, 0);
        if (totalAllocatedCount === 0) throw new Error("Failed to allocate questions.");

        // --- Select & Extract Questions ---
        const selectedQuestionsMap = {}; let actualTotalSelected = 0;
        for (const chapNum in allocationCounts) { const n = allocationCounts[chapNum]; if (n > 0) { const chap = subject.chapters[chapNum]; const selected = selectQuestions(chap.available_questions, n, chap.total_questions); if (selected.length > 0) { selectedQuestionsMap[chapNum] = selected; actualTotalSelected += selected.length; } } }
         if (actualTotalSelected === 0) throw new Error("Failed to select questions.");

        const { questions: extractedQuestionsData, answers } = extractQuestionsFromMarkdown(subjectMd, selectedQuestionsMap);
        if (extractedQuestionsData.length !== actualTotalSelected) { console.warn(`Selected ${actualTotalSelected} extracted ${extractedQuestionsData.length}.`); actualTotalSelected = extractedQuestionsData.length; }
         if (actualTotalSelected === 0) throw new Error("Extracted zero questions.");

        // --- Launch Online Test ---
        const examId = `${courseId}-${type}-${id}-${Date.now()}`;
        let finalQuestionList = [...extractedQuestionsData]; // Shuffle questions
        for (let i=finalQuestionList.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [finalQuestionList[i],finalQuestionList[j]]=[finalQuestionList[j],finalQuestionList[i]]; }

        const onlineTestState = {
            examId: examId, questions: finalQuestionList, correctAnswers: answers, userAnswers: {}, allocation: selectedQuestionsMap, startTime: Date.now(), timerInterval: null, currentQuestionIndex: 0, status: 'active',
            // Set duration based on type
            durationMinutes: (type === 'assignment' ? 30 : type === 'weekly_exam' ? 60 : type === 'midcourse' ? 90 : type === 'final' ? ONLINE_TEST_DURATION_MINUTES : 60),
            courseContext: { isCourseActivity: true, courseId: courseId, activityType: type, activityId: id }
        };
        setCurrentOnlineTestState(onlineTestState); hideLoading(); launchOnlineTestUI();

    } catch (error) {
        hideLoading(); console.error(`Error starting ${type} ${id}:`, error);
        alert(`Could not start activity: ${error.message}`);
    }
}

// --- END OF FILE ui_course_assignments_exams.js ---