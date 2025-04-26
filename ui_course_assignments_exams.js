// ui_course_assignments_exams.js

import { currentUser, userCourseProgressMap, globalCourseDataMap, activeCourseId, data } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml, getFormattedDate } from './utils.js';
import { allocateQuestions, selectNewQuestionsAndUpdate } from './test_logic.js';
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
    setActiveSidebarLink('showCurrentAssignmentsExams', 'sidebar-course-nav');

    const progress = userCourseProgressMap.get(courseId);
    const courseDef = globalCourseDataMap.get(courseId);
    if (!progress || !courseDef) {
        displayContent(`<p class="text-red-500 p-4">Error: Could not load data for course ID: ${courseId}.</p>`, 'course-dashboard-area');
        return;
    }

    const enrollmentDate = progress.enrollmentDate?.toDate ? progress.enrollmentDate.toDate() : new Date(progress.enrollmentDate || Date.now());
    const today = new Date(); today.setHours(0,0,0,0);
    const totalChaptersStudied = (progress.courseStudiedChapters || []).length;

    // --- Generate Lists ---
    // Assignments
    let assignmentsHtml = `<h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Daily Assignments</h3><ul class="space-y-2">`;
    const maxAssignmentsToShow = Math.min(courseDef.totalChapters, daysBetween(enrollmentDate, today) + 1);
    for (let i = 1; i <= maxAssignmentsToShow; i++) {
        const dateForAssignment = new Date(enrollmentDate);
        dateForAssignment.setDate(enrollmentDate.getDate() + i - 1);
        const dateStr = getFormattedDate(dateForAssignment);
        const assignmentId = `day${i}`;
        const assignmentProgress = progress.dailyProgress?.[dateStr];
        const score = progress.assignmentScores?.[assignmentId];

        if (score !== undefined) {
            assignmentsHtml += `<li class="text-sm text-muted">Assignment ${i} (${dateStr}) - Completed (Score: ${score}%)</li>`;
        } else if (!assignmentProgress?.assignmentCompleted && i <= totalChaptersStudied + 1) { // Show button if due/overdue and not completed
             assignmentsHtml += `<li><button class="link" onclick="window.startAssignmentOrExam('${courseId}', 'assignment', '${assignmentId}')">Start Assignment ${i}</button> (${dateStr})</li>`;
        } else {
             assignmentsHtml += `<li class="text-sm text-muted">Assignment ${i} (${dateStr}) - Pending/Not Due</li>`;
        }
    }
     if (maxAssignmentsToShow === 0) assignmentsHtml += `<li class="text-sm text-muted">No assignments generated yet.</li>`;
    assignmentsHtml += `</ul>`;

    // Weekly Exams
    let weeklyExamsHtml = `<h3 class="text-lg font-semibold mb-3 mt-6 text-gray-700 dark:text-gray-300">Weekly Exams</h3><ul class="space-y-2">`;
    const currentWeek = Math.floor(daysBetween(enrollmentDate, today) / 7) + 1;
     for (let i = 1; i <= currentWeek; i++) {
         const weeklyExamId = `week${i}`;
         const score = progress.weeklyExamScores?.[weeklyExamId];
         const isDue = daysBetween(enrollmentDate, today) >= (i * 7) -1 ; // Due at end of week i

         if (score !== undefined) {
             weeklyExamsHtml += `<li class="text-sm text-muted">Weekly Exam ${i} - Completed (Score: ${score}%)</li>`;
         } else if (isDue) {
              weeklyExamsHtml += `<li><button class="link" onclick="window.startAssignmentOrExam('${courseId}', 'weekly_exam', '${weeklyExamId}')">Start Weekly Exam ${i}</button></li>`;
         } else {
              weeklyExamsHtml += `<li class="text-sm text-muted">Weekly Exam ${i} (Available end of week ${i})</li>`;
         }
     }
      if (currentWeek === 0) weeklyExamsHtml += `<li class="text-sm text-muted">No weekly exams generated yet.</li>`;
    weeklyExamsHtml += `</ul>`;

    // Midcourse Exams
    let midcourseHtml = `<h3 class="text-lg font-semibold mb-3 mt-6 text-gray-700 dark:text-gray-300">Midcourse Exams</h3><ul class="space-y-2">`;
     (courseDef.midcourseChapters || []).forEach((chapThreshold, index) => {
         const midNum = index + 1;
         const midId = `mid${midNum}`;
         const isDue = totalChaptersStudied >= chapThreshold;
         const score = progress.midcourseExamScores?.[midId];

         if (score !== undefined) {
              midcourseHtml += `<li class="text-sm text-muted">Midcourse Exam ${midNum} - Completed (Score: ${score}%)</li>`;
         } else if (isDue) {
             midcourseHtml += `<li><button class="link" onclick="window.startAssignmentOrExam('${courseId}', 'midcourse', '${midId}')">Start Midcourse Exam ${midNum}</button> (After Chapter ${chapThreshold})</li>`;
         } else {
              midcourseHtml += `<li class="text-sm text-muted">Midcourse Exam ${midNum} (Available after Chapter ${chapThreshold})</li>`;
         }
     });
      if ((courseDef.midcourseChapters || []).length === 0) midcourseHtml += `<li class="text-sm text-muted">No midcourse exams defined for this course.</li>`;
    midcourseHtml += `</ul>`;

    // Final Exams
    let finalHtml = `<h3 class="text-lg font-semibold mb-3 mt-6 text-gray-700 dark:text-gray-300">Final Exams</h3><ul class="space-y-2">`;
     const allChaptersDone = totalChaptersStudied >= courseDef.totalChapters;
     if (allChaptersDone) {
          for (let i = 1; i <= 3; i++) {
              const finalId = `final${i}`;
              const score = progress.finalExamScores?.[i-1]; // Scores stored in array
              if (score === undefined || score === null) {
                  finalHtml += `<li><button class="link" onclick="window.startAssignmentOrExam('${courseId}', 'final', '${finalId}')">Start Final Exam ${i}</button></li>`;
              } else {
                   finalHtml += `<li class="text-sm text-muted">Final Exam ${i} - Completed (Score: ${score}%)</li>`;
              }
          }
     } else {
         finalHtml += `<li class="text-sm text-muted">Available after completing all chapters.</li>`;
     }
    finalHtml += `</ul>`;

    const html = `
        <div class="animate-fade-in space-y-6">
             <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Assignments & Exams for ${escapeHtml(courseDef.name)}</h2>
             <div class="content-card">
                ${assignmentsHtml}
             </div>
             <div class="content-card">
                ${weeklyExamsHtml}
             </div>
             <div class="content-card">
                 ${midcourseHtml}
             </div>
             <div class="content-card">
                 ${finalHtml}
             </div>
        </div>
    `;
    displayContent(html, 'course-dashboard-area');
}

// --- Start Exam/Assignment Logic ---
export async function startAssignmentOrExam(courseId, type, id) {
    showLoading(`Preparing ${type} ${id}...`);

    const progress = userCourseProgressMap.get(courseId);
    const courseDef = globalCourseDataMap.get(courseId);
    const subjectId = courseDef?.relatedSubjectId;
    const subject = data?.subjects?.[subjectId]; // Get the linked subject from appData

    if (!progress || !courseDef || !subject || !subject.chapters) {
        hideLoading();
        alert("Error: Missing course, progress, or subject data to start activity.");
        return;
    }

    // --- Determine Chapter Scope ---
    let chaptersToInclude = [];
    const studiedChaptersSet = new Set(progress.courseStudiedChapters || []);
    const enrollmentDate = progress.enrollmentDate?.toDate ? progress.enrollmentDate.toDate() : new Date(progress.enrollmentDate || Date.now());

    try { // Wrap chapter selection in try-catch
        switch (type) {
            case 'assignment':
                const dayNumMatch = id.match(/day(\d+)/);
                if (dayNumMatch) {
                    const dayNum = parseInt(dayNumMatch[1], 10);
                    // Include chapters studied on dayNum and dayNum-1
                    const targetDate = new Date(enrollmentDate);
                    targetDate.setDate(enrollmentDate.getDate() + dayNum - 1);
                    const targetDateStr = getFormattedDate(targetDate);

                    const prevDate = new Date(targetDate);
                    prevDate.setDate(targetDate.getDate() - 1);
                    const prevDateStr = getFormattedDate(prevDate);

                    const chapsToday = progress.dailyProgress?.[targetDateStr]?.chaptersStudied || [];
                    const chapsYesterday = (dayNum > 1) ? progress.dailyProgress?.[prevDateStr]?.chaptersStudied || [] : [];
                    chaptersToInclude = [...new Set([...chapsToday, ...chapsYesterday])];
                    // Fallback: if no chapters logged for those days, include last 1-2 studied chapters? Or target chapter?
                    if (chaptersToInclude.length === 0) {
                         const lastStudied = Math.max(0, ...(progress.courseStudiedChapters || []));
                         if (lastStudied > 0) chaptersToInclude.push(lastStudied);
                         if (lastStudied > 1) chaptersToInclude.push(lastStudied - 1);
                    }
                }
                break;
            case 'weekly_exam':
                const weekNumMatch = id.match(/week(\d+)/);
                if (weekNumMatch) {
                    const weekNum = parseInt(weekNumMatch[1], 10);
                    const startDay = (weekNum - 1) * 7;
                    const endDay = weekNum * 7;
                    // Include chapters studied from startDay to endDay-1 (and potentially week before)
                    for (let day = startDay - 7; day < endDay; day++) { // Include previous week
                         if (day >= 0) {
                              const dateToCheck = new Date(enrollmentDate);
                              dateToCheck.setDate(enrollmentDate.getDate() + day);
                              const dateStr = getFormattedDate(dateToCheck);
                              chaptersToInclude.push(...(progress.dailyProgress?.[dateStr]?.chaptersStudied || []));
                         }
                    }
                    chaptersToInclude = [...new Set(chaptersToInclude)];
                }
                break;
            case 'midcourse':
                const midNumMatch = id.match(/mid(\d+)/);
                if (midNumMatch) {
                    const midNum = parseInt(midNumMatch[1], 10);
                    const chapterThreshold = courseDef.midcourseChapters[midNum - 1];
                    chaptersToInclude = Array.from({ length: chapterThreshold }, (_, i) => i + 1); // All chapters up to threshold
                }
                break;
            case 'final':
                chaptersToInclude = Array.from({ length: courseDef.totalChapters }, (_, i) => i + 1); // All chapters
                break;
            default:
                throw new Error(`Unknown activity type: ${type}`);
        }

        chaptersToInclude = chaptersToInclude.filter(ch => subject.chapters[ch] && subject.chapters[ch].total_questions > 0); // Filter valid chapters

        if (chaptersToInclude.length === 0) {
            throw new Error("No relevant chapters found for this activity based on your progress.");
        }
        console.log(`Chapter scope for ${type} ${id}:`, chaptersToInclude);

        // --- Fetch Markdown ---
        const subjectMd = await getSubjectMarkdown(subject);
        if (!subjectMd) {
            throw new Error("Could not load question definitions for the subject.");
        }

        // --- Determine Question Count ---
        let numQuestions = 0;
        // Define default counts per type (can be adjusted)
        const defaultCounts = { assignment: 10, weekly_exam: 20, midcourse: 30, final: 42 };
        numQuestions = defaultCounts[type] || 15; // Default to 15 if type unknown

        // --- Allocate & Select Questions ---
        const relevantChaptersForAllocation = {};
        let totalAvailableInScope = 0;
        chaptersToInclude.forEach(chapNum => {
            const chapData = subject.chapters[chapNum];
            if (chapData && (chapData.available_questions?.length || 0) > 0) {
                relevantChaptersForAllocation[chapNum] = chapData;
                totalAvailableInScope += chapData.available_questions.length;
            }
        });

        if (totalAvailableInScope === 0) {
             throw new Error("No available questions in the selected chapters for this activity.");
        }

        const finalQuestionCount = Math.min(numQuestions, totalAvailableInScope);
        const allocationCounts = allocateQuestions(relevantChaptersForAllocation, finalQuestionCount);
        const totalAllocatedCount = Object.values(allocationCounts).reduce((a, b) => a + b, 0);

        if (totalAllocatedCount === 0) {
            throw new Error("Failed to allocate any questions for this activity.");
        }

        const selectedQuestionsMap = {};
        let actualTotalSelected = 0;
        for (const chapNum in allocationCounts) {
            const n = allocationCounts[chapNum];
            if (n > 0) {
                const chap = subject.chapters[chapNum];
                // Select questions *without* modifying the global state here
                // Modifications happen upon test submission
                const questionsSelected = selectQuestions(chap.available_questions, n, chap.total_questions);
                if (questionsSelected.length > 0) {
                    selectedQuestionsMap[chapNum] = questionsSelected;
                    actualTotalSelected += questionsSelected.length;
                }
            }
        }

         if (actualTotalSelected === 0) {
             throw new Error("Failed to select any questions after allocation.");
         }

        // --- Extract Questions ---
        const { questions: extractedQuestionsData, answers } = extractQuestionsFromMarkdown(subjectMd, selectedQuestionsMap);
        if (extractedQuestionsData.length !== actualTotalSelected) {
             console.warn(`Selected ${actualTotalSelected} but extracted ${extractedQuestionsData.length}. Using extracted count.`);
             actualTotalSelected = extractedQuestionsData.length;
             // Rebuild map based on extraction
             const tempMap = {}; extractedQuestionsData.forEach(q => { if (!tempMap[q.chapter]) tempMap[q.chapter] = []; tempMap[q.chapter].push(q.number); });
             Object.keys(tempMap).forEach(chapNum => tempMap[chapNum].sort((a, b) => a - b));
             Object.assign(selectedQuestionsMap, tempMap); // Correct the map
        }
         if (actualTotalSelected === 0) {
             throw new Error("Extracted zero questions.");
         }

        // --- Launch Online Test ---
        const examId = `${courseId}-${type}-${id}-${Date.now()}`;
        // Shuffle extracted questions for the test
        let finalQuestionList = [...extractedQuestionsData];
        for (let i = finalQuestionList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [finalQuestionList[i], finalQuestionList[j]] = [finalQuestionList[j], finalQuestionList[i]];
        }

        const onlineTestState = {
            examId: examId,
            questions: finalQuestionList,
            correctAnswers: answers,
            userAnswers: {},
            allocation: selectedQuestionsMap, // Store which questions were *intended*
            startTime: Date.now(),
            timerInterval: null,
            currentQuestionIndex: 0,
            status: 'active',
            courseContext: { // Add context for result saving
                isCourseActivity: true,
                courseId: courseId,
                activityType: type,
                activityId: id
            }
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

// Assign to window scope
window.startAssignmentOrExam = startAssignmentOrExam;