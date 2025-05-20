// --- START OF FILE course_logic.js ---

import { GRADING_WEIGHTS, PASSING_GRADE_PERCENT, PACE_MULTIPLIER, SKIP_EXAM_PASSING_PERCENT, PDF_PAGE_EQUIVALENT_SECONDS, MAX_TOTAL_TESTGEN_BONUS_CAP_FOR_COURSE } from './config.js'; // Added MAX_TOTAL_TESTGEN_BONUS_CAP_FOR_COURSE
import { daysBetween, getFormattedDate, getYouTubeVideoId } from './utils.js';
import { globalCourseDataMap, videoDurationMap } from './state.js'; 

// --- Combined Progress Calculation ---
export function calculateChapterCombinedProgress(progress, chapterNum, chapterVideoDurationMap, pdfInfo) {
    if (progress?.enrollmentMode === 'viewer') {
         return { percent: 0, watchedStr: "N/A", totalStr: "N/A", isComplete: false };
     }

    const watchedVideoDurations = progress.watchedVideoDurations?.[chapterNum] || {};
    const chapterPdfProgress = progress.pdfProgress?.[chapterNum];

    let totalVideoSeconds = 0;
    let watchedVideoSeconds = 0;
    let hasVideo = false;
    let allVideosWatched = true;

    if (chapterVideoDurationMap && Object.keys(chapterVideoDurationMap).length > 0) {
        hasVideo = true;
        Object.entries(chapterVideoDurationMap).forEach(([videoId, duration]) => {
            if (typeof duration === 'number' && duration > 0) {
                totalVideoSeconds += duration;
                const watchedForThisVideo = Math.min(watchedVideoDurations[videoId] || 0, duration);
                watchedVideoSeconds += watchedForThisVideo;
                if (watchedForThisVideo < duration * 0.9) { 
                    allVideosWatched = false;
                }
            } else {
                allVideosWatched = false; 
            }
        });
    } else {
        allVideosWatched = true; 
    }

    let totalPdfEquivalentSeconds = 0;
    let completedPdfEquivalentSeconds = 0;
    let hasPdf = false;
    let pdfCompleted = true;

    if (chapterPdfProgress && chapterPdfProgress.totalPages > 0) {
        hasPdf = true;
        totalPdfEquivalentSeconds = chapterPdfProgress.totalPages * PDF_PAGE_EQUIVALENT_SECONDS;
        const currentPage = chapterPdfProgress.currentPage || 0;
        completedPdfEquivalentSeconds = Math.min(currentPage, chapterPdfProgress.totalPages) * PDF_PAGE_EQUIVALENT_SECONDS;
        if (currentPage < chapterPdfProgress.totalPages) {
            pdfCompleted = false;
        }
    } else if (pdfInfo && pdfInfo.totalPages > 0) { 
         hasPdf = true;
         totalPdfEquivalentSeconds = pdfInfo.totalPages * PDF_PAGE_EQUIVALENT_SECONDS;
         const currentPage = pdfInfo.currentPage || 0;
         completedPdfEquivalentSeconds = Math.min(currentPage, pdfInfo.totalPages) * PDF_PAGE_EQUIVALENT_SECONDS;
         if (currentPage < pdfInfo.totalPages) {
            pdfCompleted = false;
        }
    } else {
        pdfCompleted = true; 
    }

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
        return { percent: 100, watchedStr: "N/A", totalStr: "N/A", isComplete: true };
    }
    
    const isChapterComplete = (hasVideo ? allVideosWatched : true) && (hasPdf ? pdfCompleted : true);

    return {
        percent: progressPercent,
        watchedStr: formatTime(combinedCompletedSeconds),
        totalStr: formatTime(combinedTotalSeconds),
        isComplete: isChapterComplete 
    };
}

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
    let totalWeightAchieved = 0;

    const calculateAverage = (scores) => {
        if (!scores) return { average: 0, count: 0 };
        const values = (Array.isArray(scores) ? scores : Object.values(scores))
                       .filter(s => s !== null && s !== undefined);
        if (values.length === 0) return { average: 0, count: 0 };
        const sum = values.reduce((acc, score) => acc + (Number(score) || 0), 0);
        return { average: (sum / values.length), count: values.length };
    };

    let totalChapterProgressSum = 0;
    const totalChapters = courseDef.totalChapters || 1;

    for (let i = 1; i <= totalChapters; i++) {
         const chapterResources = courseDef.chapterResources?.[i] || {};
         const lecturesForChapter = (Array.isArray(chapterResources.lectureUrls) ? chapterResources.lectureUrls : [])
                                    .filter(lec => typeof lec === 'object' && lec.url && lec.title);
         const videoIdsForChapter = lecturesForChapter.map(lec => getYouTubeVideoId(lec.url)).filter(id => id !== null);
         const chapterVideoDurationMap = {};
         videoIdsForChapter.forEach(id => {
             if (videoDurationMap[id] !== undefined) {
                 chapterVideoDurationMap[id] = videoDurationMap[id];
             }
         });
         const pdfInfo = progressData.pdfProgress?.[i] || null;
         const { percent: chapterPercent } = calculateChapterCombinedProgress(progressData, i, chapterVideoDurationMap, pdfInfo);
         totalChapterProgressSum += chapterPercent;
    }
    const overallChapterCompletionAvg = totalChapters > 0 ? (totalChapterProgressSum / totalChapters) : 0;
    totalMark += (overallChapterCompletionAvg * weights.chapterCompletion);
    totalWeightAchieved += weights.chapterCompletion;
    console.log(`Chapter Completion Avg: ${overallChapterCompletionAvg.toFixed(1)}%, Contribution: ${(overallChapterCompletionAvg * weights.chapterCompletion).toFixed(1)}`);

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
    totalWeightAchieved += weights.attendance;
    console.log(`Attendance: ${attendance}%, Contribution: ${(attendance * weights.attendance).toFixed(1)}`);

    const bonus = progressData.extraPracticeBonus || 0;
    totalMark += bonus;
    console.log(`Extra Practice Bonus: ${bonus}pts`);

    // --- START MODIFIED: TestGen Bonus ---
    // The testGenBonus in progressData should already be capped by MAX_TOTAL_TESTGEN_BONUS_CAP_FOR_COURSE
    const testGenBonusPoints = Math.min(progressData.testGenBonus || 0, MAX_TOTAL_TESTGEN_BONUS_CAP_FOR_COURSE);
    totalMark += testGenBonusPoints;
    console.log(`TestGen Bonus Points (applied to total mark): ${testGenBonusPoints}pts (Raw in progress: ${progressData.testGenBonus || 0}, Cap: ${MAX_TOTAL_TESTGEN_BONUS_CAP_FOR_COURSE})`);
    // --- END MODIFIED ---

    console.log(`Total Weighted Mark (Before Clamp): ${totalMark.toFixed(1)}%, Achieved Weight (for weighted components): ${totalWeightAchieved.toFixed(2)}`);
    // Return a value between 0 and potentially over 100 if bonuses are high.
    // The letter grade function will cap interpretation if needed, or you can cap here.
    return Math.max(0, totalMark); 
}

export function getLetterGrade(totalMark) {
    if (totalMark === null || totalMark === undefined) return null;
    // Cap interpretation at 100 for grade boundaries if bonuses push it over
    const cappedMark = Math.min(100, totalMark); 

    if (cappedMark >= 90) return "A+";
    if (cappedMark >= 85) return "A";
    if (cappedMark >= 80) return "B+";
    if (cappedMark >= 75) return "B";
    if (cappedMark >= 70) return "C+";
    if (cappedMark >= PASSING_GRADE_PERCENT) return "C";
    return "F";
}

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

export function calculateInitialMediocrePace(progressData, totalCourseChapters) {
    if (!progressData.enrollmentDate) return null; 
    const enrollmentDate = progressData.enrollmentDate instanceof Date ? progressData.enrollmentDate : new Date(progressData.enrollmentDate);
    if (isNaN(enrollmentDate)) return null;

    const today = new Date();
    const daysEnrolled = daysBetween(enrollmentDate, today); 

    if (daysEnrolled < 6) { 
        console.log("Pace calculation: Waiting for first full week of data.");
        return null;
    }

    let chaptersCompletedInFirstWeek = 0;
    const studiedSetWeek1 = new Set();

    for (let i = 0; i < 7; i++) { 
        const dateToCheck = new Date(enrollmentDate);
        dateToCheck.setDate(enrollmentDate.getDate() + i);
        const dateStr = getFormattedDate(dateToCheck);

        const dailyChapters = progressData.dailyProgress?.[dateStr]?.chaptersStudied || [];
        const dailySkips = progressData.dailyProgress?.[dateStr]?.skipExamsPassed || [];
        [...dailyChapters, ...dailySkips].forEach(chapNum => studiedSetWeek1.add(chapNum));
    }
    chaptersCompletedInFirstWeek = studiedSetWeek1.size;

    if (chaptersCompletedInFirstWeek <= 0) {
        console.log("Pace calculation: No chapters completed in the first week. Using default pace (0.5 chapters/day).");
        return 0.5; 
    }

    const calculatedPace = chaptersCompletedInFirstWeek / 7;
    console.log(`Pace calculation: Initial mediocre pace set to ${calculatedPace.toFixed(2)} chapters/day.`);
    return calculatedPace;
}

export function updateCurrentPace(progressData, totalCourseChapters) {
    if (!progressData.enrollmentDate) return null;
    const enrollmentDate = progressData.enrollmentDate instanceof Date ? progressData.enrollmentDate : new Date(progressData.enrollmentDate);
    if (isNaN(enrollmentDate)) return null;

    const today = new Date();
    const daysEnrolled = daysBetween(enrollmentDate, today) + 1; 

    if (daysEnrolled <= 0) return 0; 

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

    if (totalChaptersStudied <= 0) return 0; 

    const currentPace = totalChaptersStudied / daysEnrolled;
    return currentPace;
}

export function determineTargetChapter(progressData, courseDef) {
     if (!progressData || !courseDef || !progressData.enrollmentDate) return 1; 

    const enrollmentDate = progressData.enrollmentDate instanceof Date ? progressData.enrollmentDate : new Date(progressData.enrollmentDate);
    if (isNaN(enrollmentDate)) return 1;

    const today = new Date(); today.setHours(0,0,0,0);
    const daysEnrolled = daysBetween(enrollmentDate, today); 

    let targetPace = progressData.baseMediocrePace; 

    if (targetPace === null || targetPace === undefined) {
        targetPace = calculateInitialMediocrePace(progressData, courseDef.totalChapters);
    }

    if (progressData.selectedPace === 'custom' && progressData.customPaceDays > 0) {
        targetPace = courseDef.totalChapters / progressData.customPaceDays;
    } else if (targetPace !== null && targetPace !== undefined && targetPace > 0) { 
        if (progressData.selectedPace === 'compact') targetPace *= PACE_MULTIPLIER.compact;
        else if (progressData.selectedPace === 'lenient') targetPace *= PACE_MULTIPLIER.lenient;
    } else { 
        let estimatedMediocre = 0.5; 
        if (progressData.selectedPace === 'custom' && progressData.customPaceDays > 0) {
             targetPace = courseDef.totalChapters / progressData.customPaceDays;
        } else if (progressData.selectedPace === 'compact') {
             targetPace = estimatedMediocre * PACE_MULTIPLIER.compact;
        } else if (progressData.selectedPace === 'lenient') {
             targetPace = estimatedMediocre * PACE_MULTIPLIER.lenient;
        } else { 
             targetPace = estimatedMediocre;
        }
        console.log(`Target Pace estimated as ${targetPace?.toFixed(2)} due to missing/zero base pace.`);
    }

    targetPace = Math.max(0, Number(targetPace) || 0);

    const expectedChapterFloat = 1 + (daysEnrolled * targetPace);
    let targetChapter = Math.ceil(expectedChapterFloat);

    targetChapter = Math.min(targetChapter, courseDef.totalChapters);
    targetChapter = Math.max(1, targetChapter);

    return targetChapter;
}

export function determineTodaysObjective(progressData, courseDef) {
    if (!progressData || !courseDef || !progressData.enrollmentDate || progressData.status !== 'enrolled') {
        return "Review course materials."; 
    }

    const todayStr = getFormattedDate();
    const todaysProgress = progressData.dailyProgress?.[todayStr] || {};
    const enrollmentDate = progressData.enrollmentDate instanceof Date ? progressData.enrollmentDate : new Date(progressData.enrollmentDate);
    if (isNaN(enrollmentDate)) return "Review course materials.";

    const today = new Date(); today.setHours(0,0,0,0);
    const dayNumber = daysBetween(enrollmentDate, today) + 1; 

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
    
    if (dayNumber > 1) {
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = getFormattedDate(yesterday);
        const assignmentNumYesterday = dayNumber - 1;
        const yesterdayAssignmentId = `day${assignmentNumYesterday}`;
        if (progressData.assignmentScores?.[yesterdayAssignmentId] === undefined) {
            return `Complete Assignment ${assignmentNumYesterday} (From ${yesterdayStr}).`;
        }
    }

    const assignmentNumToday = dayNumber;
    const todayAssignmentId = `day${assignmentNumToday}`;
    if (progressData.assignmentScores?.[todayAssignmentId] === undefined) {
         const lastStudiedChapter = Math.max(0, ...studiedChaptersSet);
         if (lastStudiedChapter >= assignmentNumToday || assignmentNumToday === 1) { 
              return `Complete Assignment ${assignmentNumToday}.`;
         }
    }

    if (courseDef.totalChapters >= 4) { 
        const quarterMarkers = [
            { num: 1, threshold: Math.floor(courseDef.totalChapters / 4) },
            { num: 2, threshold: Math.floor(courseDef.totalChapters / 2) },
            { num: 3, threshold: Math.floor(courseDef.totalChapters * 3 / 4) }
        ];

        for (const marker of quarterMarkers) {
            if (marker.threshold === 0) continue; 
            if (marker.num === 3 && marker.threshold >= courseDef.totalChapters - Math.floor(courseDef.totalChapters / 8)) {
                continue;
            }
            const midId = `mid${marker.num}`;
            const isMidcourseDone = progressData.midcourseExamScores?.[midId] !== undefined;
            if (totalChaptersStudied >= marker.threshold && !isMidcourseDone) {
                return `Complete Midcourse Exam #${marker.num}.`;
            }
        }
    }
    
    if (totalChaptersStudied >= courseDef.totalChapters) {
        const numFinalsDone = (progressData.finalExamScores || []).filter(s => s !== null).length;
        if (numFinalsDone < 3) {
             const lastFinalIndex = (progressData.finalExamScores || []).length -1; 
             if (lastFinalIndex === -1 || lastFinalIndex === 1) { 
                 return `Take Final Exam #${numFinalsDone + 1}.`;
             } else { 
                 return `Revision Day - Review Weakest Areas.`;
             }
        } else {
            return "Course Completed! Review final grade.";
        }
    }

    const weekNumber = Math.floor((dayNumber -1) / 7) + 1; 
    const isEndOfAWeek = dayNumber % 7 === 0 && dayNumber > 0;
    const weeklyExamId = `week${weekNumber}`;
    const isWeeklyDone = progressData.weeklyExamScores?.[weeklyExamId] !== undefined;
    if(isEndOfAWeek && !isWeeklyDone){
         return `Complete Weekly Exam ${weekNumber}.`;
    }

    const targetChapter = determineTargetChapter(progressData, courseDef);
    let chapterToStudy = targetChapter;
    while (chapterToStudy <= courseDef.totalChapters && studiedChaptersSet.has(chapterToStudy)) {
        chapterToStudy++;
    }

    if (chapterToStudy <= courseDef.totalChapters) {
        const chapterTitle = (Array.isArray(courseDef.chapters) && courseDef.chapters.length >= chapterToStudy)
                             ? courseDef.chapters[chapterToStudy - 1]
                             : `Chapter ${chapterToStudy}`; 
        return `Study Chapter ${chapterToStudy}: ${chapterTitle || ''}`;
    }

     if (totalChaptersStudied >= courseDef.totalChapters) {
          return "Prepare for Final Exams.";
     }

    console.warn("Could not determine specific objective, defaulting to review.");
    return "Continue reviewing or use Extra Practice.";
}

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

    return null; 
}

export function calculateAttendanceScore(progressData) {
    if (!progressData || !progressData.enrollmentDate) return 0;

    const enrollmentDate = progressData.enrollmentDate instanceof Date ? progressData.enrollmentDate : new Date(progressData.enrollmentDate);
     if (isNaN(enrollmentDate)) return 0; 

    const today = new Date(); today.setHours(0,0,0,0);
    const totalDaysElapsed = daysBetween(enrollmentDate, today); 

    if (totalDaysElapsed < 0) return 100; 
    const numberOfDaysToCheck = totalDaysElapsed + 1; 

    let attendedDays = 0;
    const courseDef = globalCourseDataMap.get(progressData.courseId);
    const totalChapters = courseDef?.totalChapters || 1; 

    for (let i = 0; i < numberOfDaysToCheck; i++) {
        const dateToCheck = new Date(enrollmentDate);
        dateToCheck.setDate(enrollmentDate.getDate() + i);
        const dateStr = getFormattedDate(dateToCheck);
        let attendedThisDay = false;

        const assignmentNum = i + 1;
        const assignmentId = `day${assignmentNum}`;
        if (progressData.assignmentScores?.[assignmentId] !== undefined) {
            attendedThisDay = true;
        }

        if (!attendedThisDay && progressData.dailyProgress?.[dateStr]?.chaptersStudied?.length > 0) {
            attendedThisDay = true;
        }
        
        if (!attendedThisDay && progressData.dailyProgress?.[dateStr]?.skipExamsPassed?.length > 0) {
             attendedThisDay = true;
        }

        if (attendedThisDay) {
            attendedDays++;
        }
    }
    const attendanceRate = numberOfDaysToCheck > 0 ? (attendedDays / numberOfDaysToCheck) : 1; 
    return Math.round(attendanceRate * 100);
}

// --- END OF FILE course_logic.js ---