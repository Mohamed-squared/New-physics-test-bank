// --- START OF FILE course_logic.js ---

import { GRADING_WEIGHTS, PASSING_GRADE_PERCENT, PACE_MULTIPLIER, SKIP_EXAM_PASSING_PERCENT, PDF_PAGE_EQUIVALENT_SECONDS } from './config.js';
import { daysBetween, getFormattedDate, getYouTubeVideoId } from './utils.js';
import { globalCourseDataMap, videoDurationMap } from './state.js'; // Import videoDurationMap
// *** MODIFIED: Removed import of calculateChapterCombinedProgress from ui_course_study_material.js to break circular dependency risk and because the function is now defined here. ***

// --- Combined Progress Calculation ---
/**
 * Calculates the combined progress percentage for a chapter based on video and PDF activity.
 * @param {object} progress - The user's full progress data for the course.
 * @param {number} chapterNum - The chapter number.
 * @param {object} chapterVideoDurationMap - Map of { videoId: durationInSeconds } for this chapter.
 * @param {object | null} pdfInfo - Object like { currentPage: number, totalPages: number } or null if no PDF.
 * @returns {{ percent: number, watchedStr: string, totalStr: string }}
 */
export function calculateChapterCombinedProgress(progress, chapterNum, chapterVideoDurationMap, pdfInfo) {
    // Return 0 if viewer mode
    if (progress?.enrollmentMode === 'viewer') {
         return { percent: 0, watchedStr: "N/A", totalStr: "N/A" };
     }

    const watchedVideoDurations = progress.watchedVideoDurations?.[chapterNum] || {};
    // Use pdfProgress data directly from the user's state
    const chapterPdfProgress = progress.pdfProgress?.[chapterNum];

    let totalVideoSeconds = 0;
    let watchedVideoSeconds = 0;
    let hasVideo = false;
    if (chapterVideoDurationMap && Object.keys(chapterVideoDurationMap).length > 0) {
        hasVideo = true;
        Object.entries(chapterVideoDurationMap).forEach(([videoId, duration]) => {
            if (typeof duration === 'number' && duration > 0) {
                totalVideoSeconds += duration;
                // Clamp watched time PER VIDEO before summing
                watchedVideoSeconds += Math.min(watchedVideoDurations[videoId] || 0, duration);
            }
        });
        // No need to clamp the sum again if clamped individually
    }

    let totalPdfEquivalentSeconds = 0;
    let completedPdfEquivalentSeconds = 0;
    let hasPdf = false;
    if (chapterPdfProgress && chapterPdfProgress.totalPages > 0) {
        hasPdf = true;
        totalPdfEquivalentSeconds = chapterPdfProgress.totalPages * PDF_PAGE_EQUIVALENT_SECONDS;
        const currentPage = chapterPdfProgress.currentPage || 0;
        completedPdfEquivalentSeconds = Math.min(currentPage, chapterPdfProgress.totalPages) * PDF_PAGE_EQUIVALENT_SECONDS; // Clamp current page
    } else if (pdfInfo && pdfInfo.totalPages > 0) {
         // Fallback to passed pdfInfo if available (e.g., right after PDF load)
         hasPdf = true;
         totalPdfEquivalentSeconds = pdfInfo.totalPages * PDF_PAGE_EQUIVALENT_SECONDS;
         const currentPage = pdfInfo.currentPage || 0;
         completedPdfEquivalentSeconds = Math.min(currentPage, pdfInfo.totalPages) * PDF_PAGE_EQUIVALENT_SECONDS;
    }

    // Format time helper
    const formatTime = (seconds) => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    let combinedTotalSeconds = 0;
    let combinedCompletedSeconds = 0;
    let progressPercent = 0;

    if (hasVideo && hasPdf) {
        combinedTotalSeconds = totalVideoSeconds + totalPdfEquivalentSeconds;
        combinedCompletedSeconds = watchedVideoSeconds + completedPdfEquivalentSeconds;
        progressPercent = combinedTotalSeconds > 0 ? Math.min(100, Math.round((combinedCompletedSeconds / combinedTotalSeconds) * 100)) : 0;
    } else if (hasVideo) {
        combinedTotalSeconds = totalVideoSeconds;
        combinedCompletedSeconds = watchedVideoSeconds;
        progressPercent = combinedTotalSeconds > 0 ? Math.min(100, Math.round((combinedCompletedSeconds / combinedTotalSeconds) * 100)) : 0;
    } else if (hasPdf) {
        combinedTotalSeconds = totalPdfEquivalentSeconds;
        combinedCompletedSeconds = completedPdfEquivalentSeconds;
        progressPercent = combinedTotalSeconds > 0 ? Math.min(100, Math.round((combinedCompletedSeconds / combinedTotalSeconds) * 100)) : 0;
    } else {
        // No video or PDF content associated
        return { percent: 0, watchedStr: "0s", totalStr: "0s" };
    }

    return {
        percent: progressPercent,
        watchedStr: formatTime(combinedCompletedSeconds),
        totalStr: formatTime(combinedTotalSeconds)
    };
}

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
                       .filter(s => s !== null && s !== undefined);
        if (values.length === 0) return { average: 0, count: 0 };
        const sum = values.reduce((acc, score) => acc + (Number(score) || 0), 0); // Ensure scores are numbers
        return { average: (sum / values.length), count: values.length };
    };

    // *** MODIFIED: Calculate Overall Chapter Completion (using combined progress) ***
    let totalChapterProgressSum = 0;
    const totalChapters = courseDef.totalChapters || 1; // Avoid division by zero

    for (let i = 1; i <= totalChapters; i++) {
         // Calculate combined progress for each chapter
         const chapterResources = courseDef.chapterResources?.[i] || {};
         const lecturesForChapter = (Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : []).filter(lec => typeof lec === 'object' && lec.url && lec.title);
         const videoIdsForChapter = lecturesForChapter.map(lec => getYouTubeVideoId(lec.url)).filter(id => id !== null);
         const chapterVideoDurationMap = {}; videoIdsForChapter.forEach(id => { if (videoDurationMap[id] !== undefined) { chapterVideoDurationMap[id] = videoDurationMap[id]; } });
         const pdfInfo = progressData.pdfProgress?.[i] || null;

         // Use the locally defined combined progress function
         const { percent: chapterPercent } = calculateChapterCombinedProgress(progressData, i, chapterVideoDurationMap, pdfInfo);
         totalChapterProgressSum += chapterPercent;
    }
    // Average progress across *all* chapters in the course
    const overallChapterCompletionAvg = totalChapters > 0 ? (totalChapterProgressSum / totalChapters) : 0;

    // Add weighted score for chapter completion
    totalMark += (overallChapterCompletionAvg * weights.chapterCompletion);
    totalWeightAchieved += weights.chapterCompletion; // This component always contributes weight
    console.log(`Chapter Completion Avg: ${overallChapterCompletionAvg.toFixed(1)}%, Contribution: ${(overallChapterCompletionAvg * weights.chapterCompletion).toFixed(1)}`);

    // --- REMOVED: Skip Exam Score Contribution ---

    // --- Other components remain the same ---
    const assignmentResult = calculateAverage(progressData.assignmentScores);
    if (assignmentResult.count > 0) {
        totalMark += (assignmentResult.average * weights.assignments);
        totalWeightAchieved += weights.assignments;
         console.log(`Assignments Avg: ${assignmentResult.average.toFixed(1)}%, Contribution: ${(assignmentResult.average * weights.assignments).toFixed(1)}`);
    }

    const weeklyExamResult = calculateAverage(progressData.weeklyExamScores);
     if (weeklyExamResult.count > 0) {
        totalMark += (weeklyExamResult.average * weights.weeklyExams);
        totalWeightAchieved += weights.weeklyExams;
         console.log(`Weekly Exams Avg: ${weeklyExamResult.average.toFixed(1)}%, Contribution: ${(weeklyExamResult.average * weights.weeklyExams).toFixed(1)}`);
    }

    const midcourseResult = calculateAverage(progressData.midcourseExamScores);
     if (midcourseResult.count > 0) {
        totalMark += (midcourseResult.average * weights.midcourseExams);
        totalWeightAchieved += weights.midcourseExams;
         console.log(`Midcourse Exams Avg: ${midcourseResult.average.toFixed(1)}%, Contribution: ${(midcourseResult.average * weights.midcourseExams).toFixed(1)}`);
    }

    const finalResult = calculateAverage(progressData.finalExamScores);
     if (finalResult.count > 0) {
        totalMark += (finalResult.average * weights.finalExams);
        totalWeightAchieved += weights.finalExams;
         console.log(`Final Exams Avg: ${finalResult.average.toFixed(1)}%, Contribution: ${(finalResult.average * weights.finalExams).toFixed(1)}`);
    }

    const attendance = progressData.attendanceScore === undefined ? calculateAttendanceScore(progressData) : progressData.attendanceScore;
    totalMark += (attendance * weights.attendance);
    totalWeightAchieved += weights.attendance; // Attendance always contributes weight
    console.log(`Attendance: ${attendance}%, Contribution: ${(attendance * weights.attendance).toFixed(1)}`);


    const bonus = progressData.extraPracticeBonus || 0;
    totalMark += bonus;
    console.log(`Bonus: ${bonus}pts`);

    // Optional Normalization (Removed for simplicity, can be added back if needed)

    console.log(`Total Weighted Mark (Before Clamp): ${totalMark.toFixed(1)}%, Achieved Weight: ${totalWeightAchieved.toFixed(2)}`);
    // Clamp mark between 0 and potentially > 100 due to bonus
    return Math.max(0, totalMark);
}

/**
 * Determines the letter grade based on the total mark percentage.
 * @param {number | null} totalMark - The final calculated total mark.
 * @returns {string | null} - The letter grade ("A+", "A", ..., "F") or null.
 */
export function getLetterGrade(totalMark) {
    if (totalMark === null || totalMark === undefined) return null;

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

/**
 * Calculates the initial mediocre pace based on the first week's progress.
 * @param {object} progressData - User's course progress.
 * @param {number} totalCourseChapters - Total chapters in the course.
 * @returns {number | null} - Chapters per day, or null if not enough data.
 */
export function calculateInitialMediocrePace(progressData, totalCourseChapters) {
    if (!progressData.enrollmentDate) return null; // Need enrollment date
    const enrollmentDate = progressData.enrollmentDate instanceof Date ? progressData.enrollmentDate : new Date(progressData.enrollmentDate);
    if (isNaN(enrollmentDate)) return null; // Invalid enrollment date

    const today = new Date();
    const daysEnrolled = daysBetween(enrollmentDate, today); // Days since enrollment day

    if (daysEnrolled < 6) { // Need 7 days of potential progress (days 0 through 6)
        console.log("Pace calculation: Waiting for first full week of data.");
        return null;
    }

    let chaptersCompletedInFirstWeek = 0;
    const studiedSetWeek1 = new Set();

    for (let i = 0; i < 7; i++) { // Check days 0 through 6
        const dateToCheck = new Date(enrollmentDate);
        dateToCheck.setDate(enrollmentDate.getDate() + i);
        const dateStr = getFormattedDate(dateToCheck);

        // Count chapters marked studied in daily progress OR skip exam passed on that day
        const dailyChapters = progressData.dailyProgress?.[dateStr]?.chaptersStudied || [];
        const dailySkips = progressData.dailyProgress?.[dateStr]?.skipExamsPassed || [];
        [...dailyChapters, ...dailySkips].forEach(chapNum => studiedSetWeek1.add(chapNum));
    }
    chaptersCompletedInFirstWeek = studiedSetWeek1.size;

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
    if (!progressData.enrollmentDate) return null;
    const enrollmentDate = progressData.enrollmentDate instanceof Date ? progressData.enrollmentDate : new Date(progressData.enrollmentDate);
    if (isNaN(enrollmentDate)) return null;

    const today = new Date();
    const daysEnrolled = daysBetween(enrollmentDate, today) + 1; // Include today

    if (daysEnrolled <= 0) return 0; // Enrolled today or future? Pace is 0

    // *** MODIFIED: Use combined studied logic ***
    const studiedChaptersSet = new Set(progressData.courseStudiedChapters || []);
    const courseDef = globalCourseDataMap.get(progressData.courseId);
    const courseTotalChapters = courseDef?.totalChapters || 1;
    if (progressData.lastSkipExamScore) {
        for (let i = 1; i <= courseTotalChapters; i++) {
            const skipScore = progressData.lastSkipExamScore[i] || progressData.lastSkipExamScore[String(i)];
            if (skipScore !== undefined && skipScore !== null && skipScore >= SKIP_EXAM_PASSING_PERCENT) {
                studiedChaptersSet.add(i);
            }
        }
    }
    const totalChaptersStudied = studiedChaptersSet.size;

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

    const enrollmentDate = progressData.enrollmentDate instanceof Date ? progressData.enrollmentDate : new Date(progressData.enrollmentDate);
    if (isNaN(enrollmentDate)) return 1; // Invalid date

    const today = new Date(); today.setHours(0,0,0,0);
    const daysEnrolled = daysBetween(enrollmentDate, today); // Days *since* enrollment day (0 on enrollment day)

    let targetPace = progressData.baseMediocrePace; // Start with the calculated base pace

    // Update baseMediocrePace if it's null and enough time has passed
    if (targetPace === null || targetPace === undefined) {
        targetPace = calculateInitialMediocrePace(progressData, courseDef.totalChapters);
        if (targetPace !== null) {
            // Don't save back here, rely on periodic background updates if needed
            // progressData.baseMediocrePace = targetPace;
        }
    }

    // Adjust pace based on selection or estimate if base pace not set
    if (progressData.selectedPace === 'custom' && progressData.customPaceDays > 0) {
        targetPace = courseDef.totalChapters / progressData.customPaceDays;
    } else if (targetPace !== null && targetPace !== undefined && targetPace > 0) { // Only apply multiplier if base pace exists and is > 0
        if (progressData.selectedPace === 'compact') targetPace *= PACE_MULTIPLIER.compact;
        else if (progressData.selectedPace === 'lenient') targetPace *= PACE_MULTIPLIER.lenient;
    } else { // Estimate if base pace still not set or is 0 (e.g., < 7 days and no chapters done)
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
        console.log(`Target Pace estimated as ${targetPace?.toFixed(2)} due to missing/zero base pace.`);
    }

    // Ensure targetPace is a valid number >= 0
    targetPace = Math.max(0, Number(targetPace) || 0);

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
    const enrollmentDate = progressData.enrollmentDate instanceof Date ? progressData.enrollmentDate : new Date(progressData.enrollmentDate);
    if (isNaN(enrollmentDate)) return "Review course materials."; // Handle invalid date

    const today = new Date(); today.setHours(0,0,0,0);
    const dayNumber = daysBetween(enrollmentDate, today) + 1; // Day 1, Day 2...

    // *** MODIFIED: Use combined studied logic ***
    const studiedChaptersSet = new Set(progressData.courseStudiedChapters || []);
    const courseTotalChapters = courseDef?.totalChapters || 1;
    if (progressData.lastSkipExamScore) {
        for (let i = 1; i <= courseTotalChapters; i++) {
            const skipScore = progressData.lastSkipExamScore[i] || progressData.lastSkipExamScore[String(i)];
            if (skipScore !== undefined && skipScore !== null && skipScore >= SKIP_EXAM_PASSING_PERCENT) {
                studiedChaptersSet.add(i);
            }
        }
    }
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
         const lastStudiedChapter = Math.max(0, ...studiedChaptersSet);
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
        const numFinalsDone = (progressData.finalExamScores || []).filter(s => s !== null).length;
        if (numFinalsDone < 3) {
             const lastFinalIndex = (progressData.finalExamScores || []).length -1; // Index of last score entry (-1 if empty)
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
 * Calculates the attendance score based on daily assignment completion rate OR if at least one chapter was studied (by any method) on that day.
 * @param {object} progressData - User's course progress.
 * @returns {number} - Attendance score (0-100).
 */
export function calculateAttendanceScore(progressData) {
    if (!progressData || !progressData.enrollmentDate) return 0;

    const enrollmentDate = progressData.enrollmentDate instanceof Date ? progressData.enrollmentDate : new Date(progressData.enrollmentDate);
     if (isNaN(enrollmentDate)) return 0; // Handle invalid date

    const today = new Date(); today.setHours(0,0,0,0);
    const totalDaysElapsed = daysBetween(enrollmentDate, today); // Days *since* enrollment

    if (totalDaysElapsed < 0) return 100; // Enrolled today or future? Perfect score.
    const numberOfDaysToCheck = totalDaysElapsed + 1; // Check including today

    let attendedDays = 0;
    const courseDef = globalCourseDataMap.get(progressData.courseId);
    const totalChapters = courseDef?.totalChapters || 1; // Use for skip exam check loop

    for (let i = 0; i < numberOfDaysToCheck; i++) {
        const dateToCheck = new Date(enrollmentDate);
        dateToCheck.setDate(enrollmentDate.getDate() + i);
        const dateStr = getFormattedDate(dateToCheck);
        let attendedThisDay = false;

        // 1. Check if an assignment score exists for that day's assignment ID
        const assignmentNum = i + 1;
        const assignmentId = `day${assignmentNum}`;
        if (progressData.assignmentScores?.[assignmentId] !== undefined) {
            attendedThisDay = true;
        }

        // 2. Check if at least one chapter was marked studied (in daily log)
        if (!attendedThisDay && progressData.dailyProgress?.[dateStr]?.chaptersStudied?.length > 0) {
            attendedThisDay = true;
        }

        // 3. Check if a skip exam was passed for *any* chapter on that day
        // (This requires storing when skip exams were passed, let's add to dailyProgress)
        // Assuming dailyProgress[dateStr].skipExamsPassed = [chapterNum1, chapterNum2]
        if (!attendedThisDay && progressData.dailyProgress?.[dateStr]?.skipExamsPassed?.length > 0) {
             attendedThisDay = true;
        }


        if (attendedThisDay) {
            attendedDays++;
        }
    }

    // Calculate score based on attendance rate over the elapsed days
    const attendanceRate = numberOfDaysToCheck > 0 ? (attendedDays / numberOfDaysToCheck) : 1; // Avoid division by zero
    return Math.round(attendanceRate * 100);
}

// --- END OF FILE course_logic.js ---