// --- START OF FILE course_logic.js ---

import { GRADING_WEIGHTS, PASSING_GRADE_PERCENT, PACE_MULTIPLIER } from './config.js';
import { daysBetween, getFormattedDate } from './utils.js';
// *** NEW: Import combined progress calculation function ***
// Note: This creates a slight circular dependency possibility if course_logic is imported by ui_course_study_material.
// A better long-term solution might be a dedicated 'progress_calculator.js' module. For now, we'll manage it.
import { calculateChapterCombinedProgress } from './ui_course_study_material.js';
import { globalCourseDataMap } from './state.js'; // Needed for total chapters info

// --- Grading & Grade Representation ---

/**
 * Calculates the final total mark based on component scores and weights.
 * @param {object} progressData - The user's course progress data.
 * @returns {number | null} - The calculated total mark (0-100+bonus), or null if insufficient data.
 */
export function calculateTotalMark(progressData) {
    if (!progressData) {
        console.warn("calculateTotalMark called with invalid progressData.");
        return null;
    }

    const courseDef = globalCourseDataMap.get(progressData.courseId);
    if (!courseDef) {
        console.warn(`Cannot calculate total mark: Course definition missing for ${progressData.courseId}`);
        return null;
    }

    const weights = GRADING_WEIGHTS;
    let totalMark = 0;
    let totalWeightAchieved = 0; // Track weight of components with scores

    // Helper to calculate average score from a scores object/array
    const calculateAverage = (scores) => {
        if (!scores) return { average: 0, count: 0 };
        const values = (Array.isArray(scores) ? scores : Object.values(scores))
                       .filter(s => s !== null && s !== undefined && typeof s === 'number' && !isNaN(s)); // Ensure only valid numbers
        if (values.length === 0) return { average: 0, count: 0 };
        const sum = values.reduce((acc, score) => acc + (score || 0), 0);
        return { average: (sum / values.length), count: values.length };
    };

    // --- Calculate Overall Chapter Completion ---
    // This requires access to the *current* combined progress of each chapter.
    // Since this logic might run when study material isn't loaded, we need a way
    // to calculate it here or rely on stored values. Let's assume we need to recalculate.
    // We need video durations, pdf progress. Video durations aren't stored per user.
    // Compromise: Use `courseStudiedChapters` length as a proxy for now.
    // TODO: For accurate grading, store chapter % progress within progressData.
    const totalChapters = courseDef.totalChapters || 1; // Avoid division by zero
    const studiedChaptersCount = progressData.courseStudiedChapters?.length || 0;
    const overallChapterCompletionAvg = totalChapters > 0 ? (studiedChaptersCount / totalChapters) * 100 : 0;
    console.log(`Chapter Completion Avg (Proxy): ${overallChapterCompletionAvg.toFixed(1)}% (${studiedChaptersCount}/${totalChapters})`);

    // Add weighted score for chapter completion
    totalMark += (overallChapterCompletionAvg * weights.chapterCompletion);
    totalWeightAchieved += weights.chapterCompletion; // This component always contributes weight


    // --- Other components ---
    const assignmentResult = calculateAverage(progressData.assignmentScores);
    if (assignmentResult.count > 0) {
        console.log(`Assignments: Avg ${assignmentResult.average.toFixed(1)}% from ${assignmentResult.count} items`);
        totalMark += (assignmentResult.average * weights.assignments);
        totalWeightAchieved += weights.assignments;
    } else {
        console.log("Assignments: No scores.");
    }

    const weeklyExamResult = calculateAverage(progressData.weeklyExamScores);
     if (weeklyExamResult.count > 0) {
        console.log(`Weekly Exams: Avg ${weeklyExamResult.average.toFixed(1)}% from ${weeklyExamResult.count} items`);
        totalMark += (weeklyExamResult.average * weights.weeklyExams);
        totalWeightAchieved += weights.weeklyExams;
    } else {
        console.log("Weekly Exams: No scores.");
    }

    const midcourseResult = calculateAverage(progressData.midcourseExamScores);
     if (midcourseResult.count > 0) {
        console.log(`Midcourse Exams: Avg ${midcourseResult.average.toFixed(1)}% from ${midcourseResult.count} items`);
        totalMark += (midcourseResult.average * weights.midcourseExams);
        totalWeightAchieved += weights.midcourseExams;
    } else {
         console.log("Midcourse Exams: No scores.");
    }

    const finalResult = calculateAverage(progressData.finalExamScores);
     if (finalResult.count > 0) {
        console.log(`Final Exams: Avg ${finalResult.average.toFixed(1)}% from ${finalResult.count} items`);
        totalMark += (finalResult.average * weights.finalExams);
        totalWeightAchieved += weights.finalExams;
    } else {
        console.log("Final Exams: No scores.");
    }

    const attendance = calculateAttendanceScore(progressData); // Recalculate based on new logic
    console.log(`Attendance Score: ${attendance}%`);
    totalMark += (attendance * weights.attendance);
    totalWeightAchieved += weights.attendance; // Attendance always contributes weight

    const bonus = progressData.extraPracticeBonus || 0;
    totalMark += bonus;
    console.log(`Bonus: ${bonus}pts`);

    console.log(`Raw Total Mark: ${totalMark.toFixed(2)}%, Based on Weight: ${totalWeightAchieved.toFixed(2)}`);


    // Clamp mark between 0 and potentially > 100 due to bonus
    const finalMark = Math.max(0, Math.min(totalMark, 100 + (weights.extraPracticeBonusMax || 0)));
    console.log(`Final Calculated Mark (Clamped): ${finalMark.toFixed(2)}%`);
    return finalMark;
}

/**
 * Determines the letter grade based on the total mark percentage.
 * @param {number | null} totalMark - The final calculated total mark.
 * @returns {string | null} - The letter grade ("A+", "A", ..., "F") or null.
 */
export function getLetterGrade(totalMark) {
    // ... (function remains the same) ...
    if (totalMark === null || totalMark === undefined || isNaN(totalMark)) return null;

    if (totalMark >= 90) return "A+";
    if (totalMark >= 85) return "A";
    if (totalMark >= 80) return "B+";
    if (totalMark >= 75) return "B";
    if (totalMark >= 70) return "C+";
    if (totalMark >= PASSING_GRADE_PERCENT) return "C"; // Use config value
    return "F";
}

/**
 * Gets Tailwind CSS color classes for a given letter grade.
 * @param {string | null} grade - The letter grade.
 * @returns {object} - Object with { bg, text, border, textMuted } class strings.
 */
export function getLetterGradeColor(grade) {
    // ... (function remains the same) ...
    switch (grade) {
        case "A+":
        case "A": return { bg: "bg-green-100 dark:bg-green-900", text: "text-green-800 dark:text-green-200", border: "border-green-300 dark:border-green-600", textMuted: "text-green-600 dark:text-green-400" };
        case "B+":
        case "B": return { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-800 dark:text-blue-200", border: "border-blue-300 dark:border-blue-600", textMuted: "text-blue-600 dark:text-blue-400" };
        case "C+":
        case "C": return { bg: "bg-yellow-100 dark:bg-yellow-900", text: "text-yellow-800 dark:text-yellow-200", border: "border-yellow-300 dark:border-yellow-600", textMuted: "text-yellow-600 dark:text-yellow-400" };
        case "F": return { bg: "bg-red-100 dark:bg-red-900", text: "text-red-800 dark:text-red-200", border: "border-red-300 dark:border-red-600", textMuted: "text-red-600 dark:text-red-400" };
        default: return { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-800 dark:text-gray-200", border: "border-gray-300 dark:border-gray-600", textMuted: "text-gray-600 dark:text-gray-400" };
    }
}


// --- Pace Calculation ---
// ... (calculateInitialMediocrePace, updateCurrentPace, determineTargetChapter remain the same) ...
/**
 * Calculates the initial mediocre pace based on the first week's progress.
 * @param {object} progressData - User's course progress.
 * @param {number} totalCourseChapters - Total chapters in the course.
 * @returns {number | null} - Chapters per day, or null if not enough data.
 */
export function calculateInitialMediocrePace(progressData, totalCourseChapters) {
    const enrollmentDate = progressData.enrollmentDate?.toDate ? progressData.enrollmentDate.toDate() : new Date(progressData.enrollmentDate || Date.now());
    const today = new Date();
    const daysEnrolled = daysBetween(enrollmentDate, today) + 1; // +1 to include enrollment day

    if (daysEnrolled < 7) {
        console.log("Pace calculation: Waiting for first week of data.");
        return null; // Need at least a week of data
    }

    let chaptersCompletedInFirstWeek = 0;
    for (let i = 0; i < 7; i++) {
        const dateToCheck = new Date(enrollmentDate);
        dateToCheck.setDate(enrollmentDate.getDate() + i);
        const dateStr = getFormattedDate(dateToCheck);
        // Count chapters studied according to dailyProgress
        chaptersCompletedInFirstWeek += progressData.dailyProgress?.[dateStr]?.chaptersStudied?.length || 0;
    }

    if (chaptersCompletedInFirstWeek <= 0) {
        console.log("Pace calculation: No chapters completed in the first week. Using default pace (0.5 chapters/day).");
        return 0.5; // Default: half a chapter per day if nothing done in first week
    }

    const calculatedPace = chaptersCompletedInFirstWeek / 7;
    console.log(`Pace calculation: Initial mediocre pace set to ${calculatedPace.toFixed(2)} chapters/day.`);
    return calculatedPace;
}

/**
 * Updates the current daily pace based on overall progress.
 * @param {object} progressData - User's course progress.
 * @param {number} totalCourseChapters - Total chapters in the course.
 * @returns {number | null} - Current chapters per day, or null if error.
 */
export function updateCurrentPace(progressData, totalCourseChapters) {
    const enrollmentDate = progressData.enrollmentDate?.toDate ? progressData.enrollmentDate.toDate() : new Date(progressData.enrollmentDate || Date.now());
    const today = new Date();
    const daysEnrolled = daysBetween(enrollmentDate, today) + 1;

    if (daysEnrolled <= 0) return null;

    // Count total chapters studied so far using the primary 'courseStudiedChapters' array
    const totalChaptersStudied = progressData.courseStudiedChapters?.length || 0;

    if (totalChaptersStudied <= 0) return 0; // If nothing studied yet, pace is 0

    const currentPace = totalChaptersStudied / daysEnrolled;
    return currentPace;
}

/**
 * Determines the target chapter for the current day based on selected pace.
 * @param {object} progressData - User's course progress.
 * @param {object} courseDef - The course definition object.
 * @returns {number} - The target chapter number for today.
 */
export function determineTargetChapter(progressData, courseDef) {
     if (!progressData || !courseDef || !progressData.enrollmentDate) return 1; // Default to chapter 1 if critical data is missing

    const enrollmentDate = progressData.enrollmentDate?.toDate ? progressData.enrollmentDate.toDate() : new Date(progressData.enrollmentDate);
    const today = new Date(); today.setHours(0,0,0,0);
    const daysEnrolled = daysBetween(enrollmentDate, today); // Days *since* enrollment day (0 on enrollment day)

    let targetPace = progressData.baseMediocrePace; // Start with the calculated base pace

    // Update baseMediocrePace if it's null and enough time has passed
    if (targetPace === null || targetPace === undefined) {
        targetPace = calculateInitialMediocrePace(progressData, courseDef.totalChapters);
        if (targetPace !== null) {
            progressData.baseMediocrePace = targetPace; // Store it back (though this won't save to DB here)
        }
    }

    // Adjust pace based on selection or estimate if base pace not set
    if (progressData.selectedPace === 'custom' && progressData.customPaceDays > 0) {
        targetPace = courseDef.totalChapters / progressData.customPaceDays;
    } else if (targetPace !== null && targetPace !== undefined) { // Only apply multiplier if base pace exists
        if (progressData.selectedPace === 'compact') targetPace *= PACE_MULTIPLIER.compact;
        else if (progressData.selectedPace === 'lenient') targetPace *= PACE_MULTIPLIER.lenient;
    } else { // Estimate if base pace still not set (e.g., < 7 days and no chapters done)
        let estimatedMediocre = 0.5; // Fallback assumption
        if (progressData.selectedPace === 'custom' && progressData.customPaceDays > 0) {
             targetPace = courseDef.totalChapters / progressData.customPaceDays;
        } else if (progressData.selectedPace === 'compact') {
             targetPace = estimatedMediocre * PACE_MULTIPLIER.compact;
        } else if (progressData.selectedPace === 'lenient') {
             targetPace = estimatedMediocre * PACE_MULTIPLIER.lenient;
        } else { // 'mediocre' or undefined
             targetPace = estimatedMediocre;
        }
        console.log(`Target Pace estimated as ${targetPace.toFixed(2)} due to missing base pace.`);
    }

    // Calculate expected chapter based on pace and days enrolled
    // Add 1 because target is the chapter *to be* studied based on days passed
    const expectedChapterFloat = 1 + (daysEnrolled * targetPace);
    let targetChapter = Math.ceil(expectedChapterFloat);

    // Ensure target chapter doesn't exceed total chapters or go below 1
    targetChapter = Math.min(targetChapter, courseDef.totalChapters);
    targetChapter = Math.max(1, targetChapter);

    return targetChapter;
}

// --- Task & Objective Determination ---
// ... (determineTodaysObjective, determineNextTask remain the same) ...
/**
 * Determines the objective for the current day (e.g., study chapter, assignment).
 * @param {object} progressData - User's course progress.
 * @param {object} courseDef - The course definition object.
 * @returns {string} - A description of today's objective.
 */
export function determineTodaysObjective(progressData, courseDef) {
    if (!progressData || !courseDef || !progressData.enrollmentDate || progressData.status !== 'enrolled') {
        return "Review course materials."; // Default if not enrolled or data missing
    }

    const todayStr = getFormattedDate();
    const todaysProgress = progressData.dailyProgress?.[todayStr] || {};
    const enrollmentDate = progressData.enrollmentDate?.toDate ? progressData.enrollmentDate.toDate() : new Date(progressData.enrollmentDate);
    const today = new Date(); today.setHours(0,0,0,0);
    const dayNumber = daysBetween(enrollmentDate, today) + 1; // Day 1, Day 2...
    const studiedChaptersSet = new Set(progressData.courseStudiedChapters || []);
    const totalChaptersStudied = studiedChaptersSet.size;

    // --- Check for mandatory blocking tasks first ---

    // 1. Yesterday's Assignment (if not day 1 and not completed)
    if (dayNumber > 1) {
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = getFormattedDate(yesterday);
        const assignmentNumYesterday = dayNumber - 1;
        const yesterdayAssignmentId = `day${assignmentNumYesterday}`;
        // Check if assignment exists and score is null/undefined (meaning not completed/submitted)
        if (progressData.assignmentScores?.[yesterdayAssignmentId] === undefined) {
            return `Complete Assignment ${assignmentNumYesterday} (From ${yesterdayStr}).`;
        }
    }

    // 2. Today's Assignment (if not already completed)
    const assignmentNumToday = dayNumber;
    const todayAssignmentId = `day${assignmentNumToday}`;
    // Check if assignment exists and score is null/undefined
    if (progressData.assignmentScores?.[todayAssignmentId] === undefined) {
         // Check if we've studied enough chapters (Assignment N is due after Chapter N is studied)
         const lastStudiedChapter = Math.max(0, ...(progressData.courseStudiedChapters || []));
         if (lastStudiedChapter >= assignmentNumToday || assignmentNumToday === 1) { // Assignment 1 is always due
              return `Complete Assignment ${assignmentNumToday}.`;
         }
         // If not studied enough, fall through to study objective
    }

    // --- Determine Study/Exam Objective ---
    const targetChapter = determineTargetChapter(progressData, courseDef);

    // 3. Midcourse Exams
    for (let i = 0; i < (courseDef.midcourseChapters || []).length; i++) {
        const chapterThreshold = courseDef.midcourseChapters[i];
        const midNum = i + 1; const midId = `mid${midNum}`;
        const isMidcourseDone = progressData.midcourseExamScores?.[midId] !== undefined;
        // Due if studied chapter *at or beyond* threshold and exam not done
        if (totalChaptersStudied >= chapterThreshold && !isMidcourseDone) {
            return `Complete Midcourse Exam #${midNum}.`;
        }
    }

    // 4. Final Exams
    if (totalChaptersStudied >= courseDef.totalChapters) {
        const numFinalsDone = (Array.isArray(progressData.finalExamScores) ? progressData.finalExamScores.filter(s => s !== null) : []).length;
        if (numFinalsDone < 3) {
             const lastFinalIndex = (Array.isArray(progressData.finalExamScores) ? progressData.finalExamScores.length : 0) -1;
             // Simple alternation: After 0 or 2, take exam. After 1, revise.
             if (lastFinalIndex === -1 || lastFinalIndex === 1) { // Before 1st, or after 2nd
                 return `Take Final Exam #${numFinalsDone + 1}.`;
             } else { // After 1st or 3rd (though 3rd means done)
                 return `Revision Day - Review Weakest Areas.`;
             }
        } else {
            // Course should ideally be marked completed here, but handle the state if still 'enrolled'
            return "Course Completed! Review final grade.";
        }
    }

    // 5. Weekly Exams (Check if end of week and not done)
    const weekNumber = Math.floor((dayNumber -1) / 7) + 1; // Week 1 starts day 1
    const isEndOfAWeek = dayNumber % 7 === 0 && dayNumber > 0;
    const weeklyExamId = `week${weekNumber}`;
    const isWeeklyDone = progressData.weeklyExamScores?.[weeklyExamId] !== undefined;
    if(isEndOfAWeek && !isWeeklyDone){
         return `Complete Weekly Exam ${weekNumber}.`;
    }

    // 6. Study Next Chapter
    // Find the lowest chapter number >= targetChapter that hasn't been studied
    let chapterToStudy = targetChapter;
    while (chapterToStudy <= courseDef.totalChapters && studiedChaptersSet.has(chapterToStudy)) {
        chapterToStudy++;
    }

    if (chapterToStudy <= courseDef.totalChapters) {
        // Safely access chapter title
        const chapterTitle = (Array.isArray(courseDef.chapters) && courseDef.chapters.length >= chapterToStudy)
                             ? courseDef.chapters[chapterToStudy - 1]
                             : `Chapter ${chapterToStudy}`; // Fallback title
        return `Study Chapter ${chapterToStudy}: ${chapterTitle || ''}`;
    }

    // Fallback if all chapters studied but finals not started yet (should be caught by final exam logic)
     if (totalChaptersStudied >= courseDef.totalChapters) {
          return "Prepare for Final Exams.";
     }

    // Default fallback if somehow none of the above match
    console.warn("Could not determine specific objective, defaulting to review.");
    return "Continue reviewing or use Extra Practice.";
}


/**
 * Helper function to determine the next specific task based on the objective string.
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
        return { type: 'review', id: 'finals_review', buttonText: 'Review Weak Areas' };
    }
    if (objective.startsWith("Course Completed")) {
        return { type: 'completed', id: 'view_results', buttonText: 'View Final Results' };
    }

    return null; // No specific button action identified
}

// --- Attendance Calculation ---
/**
 * Calculates the attendance score based on daily activity (assignment completion OR chapter study).
 * @param {object} progressData - User's course progress.
 * @returns {number} - Attendance score (0-100).
 */
export function calculateAttendanceScore(progressData) {
    if (!progressData || !progressData.enrollmentDate) return 0;

    const enrollmentDate = progressData.enrollmentDate.toDate ? progressData.enrollmentDate.toDate() : new Date(progressData.enrollmentDate);
    const today = new Date(); today.setHours(0,0,0,0);
    const totalDaysElapsed = daysBetween(enrollmentDate, today); // Days *since* enrollment

    if (totalDaysElapsed < 0) return 100; // Enrolled today or future? Perfect score.
    const numberOfDaysToCheck = totalDaysElapsed + 1; // Check including today

    let daysAttended = 0;
    for (let i = 0; i < numberOfDaysToCheck; i++) {
        const dateToCheck = new Date(enrollmentDate);
        dateToCheck.setDate(enrollmentDate.getDate() + i);
        const dateStr = getFormattedDate(dateToCheck);
        const assignmentNum = i + 1; // Assignment number corresponds to day number
        const assignmentId = `day${assignmentNum}`;

        // Check if an assignment score exists OR if any chapters were studied that day
        const assignmentCompleted = progressData.assignmentScores?.[assignmentId] !== undefined;
        const chaptersStudiedToday = progressData.dailyProgress?.[dateStr]?.chaptersStudied?.length > 0;

        if (assignmentCompleted || chaptersStudiedToday) {
            daysAttended++;
        }
    }

    // Calculate score based on attendance rate over the elapsed days
    const completionRate = numberOfDaysToCheck > 0 ? (daysAttended / numberOfDaysToCheck) : 1; // Avoid division by zero
    return Math.round(completionRate * 100);
}

// --- END OF FILE course_logic.js ---