// --- START OF FILE state.js ---

// --- Core Data & State ---
export let auth = null;
export let db = null;
export let data = null; // Holds the user's specific app data { subjects: { ... } }
export let currentUser = null; // Holds the Firebase Auth user object
export let currentSubject = null; // Holds the currently selected subject object from 'data'
export let charts = {}; // For the progress dashboard
export let currentOnlineTestState = null; // Holds state during an online test

// --- NEW Course State ---
// Stores progress for all courses the user is enrolled in
// Key: courseId (e.g., "fop_physics_v1"), Value: UserCourseProgress object
export let userCourseProgressMap = new Map();
// Stores the definition data for courses (fetched from global collection)
// Key: courseId, Value: CourseDefinition object
export let globalCourseDataMap = new Map();
// Currently active course ID being viewed/worked on
export let activeCourseId = null;

// --- State Modifiers ---
export function setAuth(newAuth) {
    auth = newAuth;
}
export function setDb(newDb) {
    db = newDb;
}
export function setData(newData) {
    data = newData;
}
export function setCurrentUser(newUser) {
    currentUser = newUser;
}
export function setCurrentSubject(newSubject) {
    currentSubject = newSubject;
}
export function setCharts(newCharts) {
    charts = newCharts;
}
export function setCurrentOnlineTestState(newState) {
    currentOnlineTestState = newState;
}
// --- NEW Course State Modifiers ---
export function setUserCourseProgressMap(newMap) {
    userCourseProgressMap = newMap;
}
export function setGlobalCourseDataMap(newMap) {
    globalCourseDataMap = newMap;
}
export function setActiveCourseId(newId) {
    activeCourseId = newId;
}
export function updateUserCourseProgress(courseId, progressData) {
    if (userCourseProgressMap.has(courseId)) {
        // Merge updates smartly if needed, or replace entirely
        userCourseProgressMap.set(courseId, { ...userCourseProgressMap.get(courseId), ...progressData });
    } else {
        userCourseProgressMap.set(courseId, progressData);
    }
}
export function updateGlobalCourseData(courseId, courseData) {
     globalCourseDataMap.set(courseId, courseData);
}

// --- State Reset ---
export function clearUserSession() {
    setCurrentSubject(null);
    setData(null);
    setCurrentOnlineTestState(null);
    setCharts({});
    // --- NEW: Clear Course State ---
    setUserCourseProgressMap(new Map());
    setActiveCourseId(null);
    // Do NOT clear globalCourseDataMap here, it's global definition data

    document.getElementById('content')?.replaceChildren();
    document.getElementById('dashboard')?.classList.add('hidden');
    document.getElementById('online-test-area')?.classList.add('hidden');
    document.getElementById('subject-info')?.replaceChildren();
     // Stop any potential PDF viewer or YouTube players
     window.cleanupPdfViewer?.();
     window.cleanupYouTubePlayers?.();
}

// --- Structure Update Notes for userCourseProgress items ---
/* userCourseProgress/{userId}/courses/{courseId} document structure:
{
    courseId: string,
    enrollmentDate: timestamp,
    selectedPace: string ("compact", "mediocre", "lenient", "custom"),
    customPaceDays: number | null,
    baseMediocrePace: number | null, // chapters/day, set after week 1
    currentPace: number | null, // chapters/day, recalculated daily
    courseStudiedChapters: number[], // Chapters marked as studied *within this course* (includes skip exam passes)
    dailyProgress: {
        [dateString]: {
            chaptersStudied: number[], // Chapters marked studied that day
            assignmentCompleted: boolean,
            assignmentScore: number | null,
            skipExamsPassed: number[] // NEW: Track skip exams passed on this day
        }
    },
    // Tracking media consumption
    watchedVideoDurations: { [chapterNum]: { [videoId]: number } }, // Watched duration in seconds
    pdfProgress: { [chapterNum]: { currentPage: number, totalPages: number } }, // Track PDF reading
    // Skip Exam Tracking
    skipExamAttempts: { [chapterNum]: number }, // Count attempts per chapter
    lastSkipExamScore: { [chapterNum]: number | null }, // Last percentage score
    // Graded Components
    assignmentScores: { [assignmentId]: number }, // assignmentId could be "dayX" or "dateString"
    weeklyExamScores: { [weekNum]: number },
    midcourseExamScores: { [midcourseNum]: number }, // e.g., 1, 2, 3
    finalExamScores: number[] | null, // Array of 3 scores
    // Calculated fields / Status
    attendanceScore: number, // Calculated, 0-100
    extraPracticeBonus: number, // 0-5
    totalMark: number | null, // Final calculated mark
    grade: string | null, // "A+", "B", etc. or null
    status: string ("enrolled", "completed", "failed"),
    completionDate: timestamp | null,
    lastActivityDate: timestamp,
    currentChapterTarget: number, // Which chapter the user *should* be working on today
    currentDayObjective: string | null // e.g., "Study Chapter 5, Complete Assignment 5"
}*/


// --- END OF FILE state.js ---