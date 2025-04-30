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
     // Clear course dashboard area as well
     document.getElementById('course-dashboard-area')?.replaceChildren();
     document.getElementById('course-dashboard-area')?.classList.add('hidden');
}

// --- Structure Update Notes for userCourseProgress items ---
/* userCourseProgress/{userId}/courses/{courseId} document structure:
{
    courseId: string,
    enrollmentDate: timestamp,
    enrollmentMode: string ('full' or 'viewer'), // NEW
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
            skipExamsPassed: number[] // Chapters whose skip exam was passed on this day
        }
    },
    // Tracking media consumption
    watchedVideoDurations: { [chapterNum]: { [videoId]: number } }, // Watched duration in seconds
    pdfProgress: { [chapterNum]: { currentPage: number, totalPages: number } }, // Track PDF reading
    // Skip Exam Tracking
    skipExamAttempts: { [chapterNum]: number }, // Count attempts per chapter
    lastSkipExamScore: { [chapterNum]: number | null }, // Last percentage score
    // Graded Components
    assignmentScores: { [assignmentId]: number }, // assignmentId could be "dayX"
    weeklyExamScores: { [weekNum]: number },
    midcourseExamScores: { [midcourseNum]: number }, // e.g., 1, 2, 3
    finalExamScores: number[] | null, // Array of 3 scores (or null if none taken)
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
}
*/

// --- Subject Data Structure (in user -> appData -> subjects) ---
/*
{
    id: string,
    name: string,
    fileName: string, // e.g., "chapters.md" or "QM.md"
    max_questions_per_test: number,
    mcqProblemRatio: number (0.0 to 1.0), // NEW: Ratio of MCQs (e.g., 0.6 = 60% MCQs)
    defaultTestDurationMinutes: number, // NEW: Default duration for TestGen tests
    chapters: {
        [chapNum]: {
            total_questions: number, // Total MCQs defined in MD for this chapter
            total_attempted: number, // Attempted MCQs (from TestGen)
            total_wrong: number,     // Wrong MCQs (from TestGen)
            available_questions: number[], // List of available MCQ numbers
            mistake_history: number[], // History of #wrong in recent tests
            consecutive_mastery: number // # of consecutive tests with 0 wrong
        }
    },
    studied_chapters: number[], // List of chapter numbers marked as studied for TestGen
    pending_exams: [ {id, allocation, results_entered, timestamp, totalQuestions} ], // For old PDF flow
    // exam_history is DEPRECATED here - Use userExams collection
}
*/


// --- END OF FILE state.js ---