// course_logic.js

import { GRADING_WEIGHTS, PASSING_GRADE_PERCENT, PACE_MULTIPLIER } from './config.js';
import { daysBetween, getFormattedDate } from './utils.js';

// --- Grading & Grade Representation ---

export function calculateTotalMark(progressData) {
    // ... (Implementation unchanged from previous correct version) ...
    if (!progressData || progressData.status !== 'completed') {
        return null;
    }
    const weights = GRADING_WEIGHTS;
    let totalMark = 0;
    const calculateAverage = (scores) => {
        if (!scores) return 0;
        const values = Array.isArray(scores) ? scores.filter(s => s !== null && s !== undefined) : Object.values(scores).filter(s => s !== null && s !== undefined);
        if (values.length === 0) return 0;
        const sum = values.reduce((acc, score) => acc + (score || 0), 0);
        return (sum / values.length);
    };
    const skipExamAvg = calculateAverage(progressData.skipExamScores);
    const assignmentAvg = calculateAverage(progressData.assignmentScores);
    const weeklyExamAvg = calculateAverage(progressData.weeklyExamScores);
    const midcourseAvg = calculateAverage(progressData.midcourseExamScores);
    const finalAvg = calculateAverage(progressData.finalExamScores);
    const attendance = progressData.attendanceScore || 0;
    const bonus = progressData.extraPracticeBonus || 0;

    totalMark += (skipExamAvg * weights.skipExams);
    totalMark += (assignmentAvg * weights.assignments);
    totalMark += (weeklyExamAvg * weights.weeklyExams);
    totalMark += (midcourseAvg * weights.midcourseExams);
    totalMark += (finalAvg * weights.finalExams);
    totalMark += (attendance * weights.attendance);
    totalMark += bonus;
    return Math.max(0, totalMark);
}

export function getLetterGrade(totalMark) {
    // ... (Implementation unchanged from previous correct version) ...
    if (totalMark === null || totalMark === undefined) return null;
    if (totalMark >= 90) return "A+";
    if (totalMark >= 85) return "A";
    if (totalMark >= 80) return "B+";
    if (totalMark >= 75) return "B";
    if (totalMark >= 70) return "C+";
    if (totalMark >= PASSING_GRADE_PERCENT) return "C";
    return "F";
}

export function getLetterGradeColor(grade) {
    // ... (Implementation unchanged from previous correct version) ...
    switch (grade) {
        case "A+": case "A": return { bg: "bg-green-100 dark:bg-green-900", text: "text-green-800 dark:text-green-200", border: "border-green-300 dark:border-green-600", textMuted: "text-green-600 dark:text-green-400" };
        case "B+": case "B": return { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-800 dark:text-blue-200", border: "border-blue-300 dark:border-blue-600", textMuted: "text-blue-600 dark:text-blue-400" };
        case "C+": case "C": return { bg: "bg-yellow-100 dark:bg-yellow-900", text: "text-yellow-800 dark:text-yellow-200", border: "border-yellow-300 dark:border-yellow-600", textMuted: "text-yellow-600 dark:text-yellow-400" };
        case "F": return { bg: "bg-red-100 dark:bg-red-900", text: "text-red-800 dark:text-red-200", border: "border-red-300 dark:border-red-600", textMuted: "text-red-600 dark:text-red-400" };
        default: return { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-800 dark:text-gray-200", border: "border-gray-300 dark:border-gray-600", textMuted: "text-gray-600 dark:text-gray-400" };
    }
}

// --- Pace Calculation ---

export function calculateInitialMediocrePace(progressData, totalCourseChapters) {
    // ... (Implementation unchanged from previous correct version) ...
    const enrollmentDate = progressData.enrollmentDate?.toDate ? progressData.enrollmentDate.toDate() : new Date(progressData.enrollmentDate);
    const today = new Date();
    const daysEnrolled = daysBetween(enrollmentDate, today) + 1;
    if (daysEnrolled < 7) return null;
    let chaptersCompletedInFirstWeek = 0;
    for (let i = 0; i < 7; i++) {
        const dateToCheck = new Date(enrollmentDate);
        dateToCheck.setDate(enrollmentDate.getDate() + i);
        const dateStr = getFormattedDate(dateToCheck);
        chaptersCompletedInFirstWeek += progressData.dailyProgress[dateStr]?.chaptersStudied?.length || 0;
    }
    if (chaptersCompletedInFirstWeek <= 0) return 0.5; // Default pace
    const calculatedPace = chaptersCompletedInFirstWeek / 7;
    return calculatedPace;
}

export function updateCurrentPace(progressData, totalCourseChapters) {
    // ... (Implementation unchanged from previous correct version) ...
    const enrollmentDate = progressData.enrollmentDate?.toDate ? progressData.enrollmentDate.toDate() : new Date(progressData.enrollmentDate);
    const today = new Date();
    const daysEnrolled = daysBetween(enrollmentDate, today) + 1;
    if (daysEnrolled <= 0) return null;
    const totalChaptersStudied = Object.values(progressData.dailyProgress || {})
                                    .reduce((sum, day) => sum + (day.chaptersStudied?.length || 0), 0);
    if (totalChaptersStudied <= 0) return 0;
    const currentPace = totalChaptersStudied / daysEnrolled;
    return currentPace;
}

export function determineTargetChapter(progressData, courseDef) {
    // ... (Implementation unchanged from previous correct version) ...
     if (!progressData || !courseDef) return 1;
    const enrollmentDate = progressData.enrollmentDate?.toDate ? progressData.enrollmentDate.toDate() : new Date(progressData.enrollmentDate);
    const today = new Date();
    const daysEnrolled = daysBetween(enrollmentDate, today);
    let targetPace = progressData.baseMediocrePace;

    if (progressData.selectedPace === 'custom' && progressData.customPaceDays > 0) {
        targetPace = courseDef.totalChapters / progressData.customPaceDays;
    } else if (targetPace !== null) { // Only apply multiplier if base pace exists
        if (progressData.selectedPace === 'compact') targetPace *= PACE_MULTIPLIER.compact;
        else if (progressData.selectedPace === 'lenient') targetPace *= PACE_MULTIPLIER.lenient;
    } else { // Estimate if base pace not yet set
        let estimatedMediocre = 1.0;
        if (progressData.selectedPace === 'custom' && progressData.customPaceDays > 0) targetPace = courseDef.totalChapters / progressData.customPaceDays;
        else if (progressData.selectedPace === 'compact') targetPace = estimatedMediocre * PACE_MULTIPLIER.compact;
        else if (progressData.selectedPace === 'lenient') targetPace = estimatedMediocre * PACE_MULTIPLIER.lenient;
        else targetPace = estimatedMediocre;
    }

    const expectedChapterFloat = 1 + (daysEnrolled * targetPace);
    let targetChapter = Math.ceil(expectedChapterFloat);
    targetChapter = Math.min(targetChapter, courseDef.totalChapters);
    targetChapter = Math.max(1, targetChapter);
    return targetChapter;
}


// --- Task & Objective Determination ---

/**
 * Determines the objective for the current day (e.g., study chapter, assignment).
 * @param {object} progressData - User's course progress.
 * @param {object} courseDef - The course definition object.
 * @returns {string} - A description of today's objective.
 */
export function determineTodaysObjective(progressData, courseDef) {
    if (!progressData || !courseDef || progressData.status !== 'enrolled') {
        return "Review course materials.";
    }

    const todayStr = getFormattedDate();
    const todaysProgress = progressData.dailyProgress?.[todayStr] || {};
    const enrollmentDate = progressData.enrollmentDate?.toDate ? progressData.enrollmentDate.toDate() : new Date(progressData.enrollmentDate || Date.now());
    const today = new Date(); today.setHours(0,0,0,0);
    const dayNumber = daysBetween(enrollmentDate, today) + 1; // Day 1, Day 2...

    // --- Check for mandatory blocking tasks first ---

    // 1. Yesterday's Assignment (if not day 1)
    if (dayNumber > 1) {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = getFormattedDate(yesterday);
        const yesterdaysProgress = progressData.dailyProgress?.[yesterdayStr];
        if (!yesterdaysProgress?.assignmentCompleted) {
            const assignmentNum = dayNumber - 1;
            return `Complete Assignment ${assignmentNum} (From ${yesterdayStr}).`;
        }
    }

    // 2. Today's Assignment (if not already completed)
    if (!todaysProgress.assignmentCompleted) {
         const assignmentNum = dayNumber;
         // Check if we've studied enough chapters to warrant this assignment
         // Simple model: Assignment X is due after completing study/skip for chapter X
         const lastStudiedChapter = Math.max(0, ...(progressData.courseStudiedChapters || []));
         if (lastStudiedChapter >= assignmentNum) {
              return `Complete Assignment ${assignmentNum}.`;
         }
         // If not studied enough, objective is to study first
    } else {
         // Today's assignment IS completed.
    }

    // --- Determine Study/Exam Objective ---
    const targetChapter = determineTargetChapter(progressData, courseDef);
    const studiedChaptersSet = new Set(progressData.courseStudiedChapters || []);
    const totalChaptersStudied = studiedChaptersSet.size;

    // 3. Midcourse Exams
    for (let i = 0; i < (courseDef.midcourseChapters || []).length; i++) {
        const chapterThreshold = courseDef.midcourseChapters[i];
        const midNum = i + 1;
        const midId = `mid${midNum}`;
        const isMidcourseDone = progressData.midcourseExamScores?.[midId] !== undefined;
        // Due if studied chapter *after* threshold and exam not done
        if (totalChaptersStudied >= chapterThreshold && !isMidcourseDone) {
            return `Complete Midcourse Exam #${midNum}.`;
        }
    }

    // 4. Final Exams
    if (totalChaptersStudied >= courseDef.totalChapters) {
        const numFinalsDone = (progressData.finalExamScores || []).filter(s => s !== null).length;
        if (numFinalsDone < 3) {
             // Check if it's a revision day (simple alternation)
             const lastFinalIndex = (progressData.finalExamScores || []).length -1; // Index of last score entry
             // If index is even (0 or 2), next is exam. If odd (1), next is revision.
             if (lastFinalIndex === 0 || lastFinalIndex === 2 ) { // After Final 1 or Final 3 (or before first)
                 return `Take Final Exam #${numFinalsDone + 1}.`;
             } else { // After Final 2
                 return `Revision Day - Review Weakest Areas.`;
             }
        } else {
            // Should transition to 'completed' status, but if still enrolled:
            return "Course Completed! Review final grade.";
        }
    }

    // 5. Weekly Exams (Check if end of week and not done)
    const weekNumber = Math.floor(dayNumber / 7) + (dayNumber % 7 > 0 ? 1 : 0);
    const isEndOfCurrentWeek = dayNumber % 7 === 0; // Simple check: Sunday is day 7, 14, etc.
    const weeklyExamId = `week${weekNumber}`;
    const isWeeklyDone = progressData.weeklyExamScores?.[weeklyExamId] !== undefined;
    if(isEndOfCurrentWeek && !isWeeklyDone){
         return `Complete Weekly Exam ${weekNumber}.`;
    }


    // 6. Study Next Chapter
    // Find the lowest chapter number >= targetChapter that hasn't been studied
    let chapterToStudy = targetChapter;
    while (chapterToStudy <= courseDef.totalChapters && studiedChaptersSet.has(chapterToStudy)) {
        chapterToStudy++;
    }

    if (chapterToStudy <= courseDef.totalChapters) {
        return `Study Chapter ${chapterToStudy}: ${courseDef.chapters[chapterToStudy - 1] || ''}`;
    }

    // If all else fails (shouldn't happen if final exam logic is correct)
    return "Continue reviewing or use Extra Practice.";
}


/**
 * Helper function to determine the next specific task based on the objective.
 * This maps the objective string to a structured task object.
 * @param {object} progressData - User's course progress.
 * @param {object} courseDef - The course definition object.
 * @returns {object | null} - Task object { type, id, buttonText } or null.
 */
export function determineNextTask(progressData, courseDef) {
    const objective = determineTodaysObjective(progressData, courseDef);

    if (objective.startsWith("Complete Assignment")) {
        const match = objective.match(/Assignment (\d+)/);
        if (match) return { type: 'assignment', id: `day${match[1]}`, buttonText: `Start Assignment ${match[1]}` };
    }
    if (objective.startsWith("Complete Midcourse Exam")) {
        const match = objective.match(/Exam #(\d+)/);
        if (match) return { type: 'midcourse', id: `mid${match[1]}`, buttonText: `Start Midcourse ${match[1]}` };
    }
    if (objective.startsWith("Complete Weekly Exam")) {
        const match = objective.match(/Exam (\d+)/);
        if (match) return { type: 'weekly_exam', id: `week${match[1]}`, buttonText: `Start Weekly Exam ${match[1]}` };
    }
    if (objective.startsWith("Take Final Exam")) {
        const match = objective.match(/Exam #(\d+)/);
        if (match) return { type: 'final', id: `final${match[1]}`, buttonText: `Start Final Exam ${match[1]}` };
    }
    if (objective.startsWith("Study Chapter")) {
         const match = objective.match(/Chapter (\d+)/);
         if (match) return { type: 'study', id: match[1], buttonText: `Go to Chapter ${match[1]} Material` };
     }
    if (objective.startsWith("Revision Day")) {
        // Could link to progress page or specific review section
        return { type: 'review', id: 'finals_review', buttonText: 'Review Weak Areas' };
    }
    if (objective.startsWith("Course Completed")) {
        return { type: 'completed', id: 'view_results', buttonText: 'View Final Results' };
    }

    return null; // No specific button action identified
}


// --- Attendance Calculation ---
export function calculateAttendanceScore(progressData) {
    // ... (Implementation unchanged from previous correct version) ...
    if (!progressData || !progressData.enrollmentDate) return 0;
    const enrollmentDate = progressData.enrollmentDate.toDate ? progressData.enrollmentDate.toDate() : new Date(progressData.enrollmentDate);
    const today = new Date(); today.setHours(0,0,0,0);
    const totalDaysPossible = daysBetween(enrollmentDate, today) + 1;
    if (totalDaysPossible <= 0) return 100;
    let completedAssignments = 0;
    for (let i = 0; i < totalDaysPossible; i++) {
        const dateToCheck = new Date(enrollmentDate);
        dateToCheck.setDate(enrollmentDate.getDate() + i);
        if (dateToCheck > today) break; // Don't count future days
        const dateStr = getFormattedDate(dateToCheck);
        if (progressData.dailyProgress?.[dateStr]?.assignmentCompleted === true) {
            completedAssignments++;
        }
    }
    const completionRate = completedAssignments / totalDaysPossible;
    return Math.round(completionRate * 100);
}