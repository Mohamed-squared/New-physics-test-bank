// --- START OF FILE state.js ---

// --- Core Data & State ---
export let auth = null;
export let db = null;
export let data = null; // Holds the user's specific app data { subjects: { ... } }
export let currentUser = null; // Holds the Firebase Auth user object AND potentially custom profile data

// --- MODIFICATION: Import ADMIN_UID at the top level ---
import { ADMIN_UID, DEFAULT_PRIMARY_AI_MODEL, DEFAULT_FALLBACK_AI_MODEL, FALLBACK_EXAM_CONFIG } from './config.js'; // MODIFIED: Added FALLBACK_EXAM_CONFIG
import {DEFAULT_AI_SYSTEM_PROMPTS} from './ai_prompts.js'

// --- END MODIFICATION ---

/* Example structure for currentUser after successful login and profile fetch:
{
    uid: string,
    email: string | null,
    emailVerified: boolean,
    displayName: string | null, // From Firebase Auth profile
    photoURL: string | null,    // From Firebase Auth profile
    // --- Custom data typically fetched from Firestore 'users/{uid}' ---
    username: string | null,   // Unique username for mentions etc. (e.g., 'john_doe')
    isAdmin: boolean,          // True if user has admin privileges
    credits: number,           // User's current credit balance
    // ... other profile fields ...
}
*/
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

// --- Video Duration Cache ---
// Cache for video durations - Map of { videoId: durationInSeconds }
export let videoDurationMap = {};

// --- NEW AI Chat Studio State ---
export let userAiChatSettings = {
    primaryModel: DEFAULT_PRIMARY_AI_MODEL,
    fallbackModel: DEFAULT_FALLBACK_AI_MODEL,
    customSystemPrompts: {} // Key: functionKey, Value: custom prompt string
};
// Global system prompts, potentially loaded from a central DB collection.
// For now, initialized empty. Logic will fall back to DEFAULT_AI_SYSTEM_PROMPTS from config.js.
export let globalAiSystemPrompts = {}; // Key: functionKey, Value: global default prompt string

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
/**
 * Sets the current user state.
 * Expects an object containing combined Firebase Auth data and custom profile data (like username, isAdmin).
 * @param {object | null} newUser - The user object or null if logged out.
 * Should include fields like uid, email, displayName, photoURL, username, isAdmin, etc.
 */
export function setCurrentUser(newUser) {
    // --- MODIFICATION: Removed dynamic import, ADMIN_UID is now available from top-level import ---
    // --- END MODIFICATION ---

    if (newUser) {
        // Basic structure validation: Ensure UID is present.
        if (!newUser.uid) {
            console.error("setCurrentUser validation failed: Attempted to set user with missing UID. Aborting state update.", newUser);
            return; // Prevent setting invalid user state
        }

        // --- MODIFICATION: Determine isAdmin status ---
        let determinedIsAdmin = false;
        // Check if isAdmin is explicitly provided and is a boolean
        if (typeof newUser.isAdmin === 'boolean') {
            // If isAdmin is set, the primary admin is always admin, otherwise respect the flag.
            determinedIsAdmin = (newUser.uid === ADMIN_UID) || newUser.isAdmin;
        } else {
            // If isAdmin is not explicitly set (e.g., old user doc or only Auth data provided),
            // default to true ONLY for the primary admin, false otherwise.
            determinedIsAdmin = (newUser.uid === ADMIN_UID);
        }
        // --- END MODIFICATION ---

         // Merge the new user data. Ensure username, displayName, photoURL, isAdmin, and credits are handled.
        currentUser = {
            ...newUser, // Spread all properties from the provided object
            isAdmin: determinedIsAdmin, // Set determined admin status
            username: newUser.username || null,
            displayName: newUser.displayName || newUser.email?.split('@')[0] || 'User',
            photoURL: newUser.photoURL || null,
            credits: newUser.credits !== undefined ? Number(newUser.credits) : 0, // MODIFIED: Initialize/update credits
        };
        console.log("[State] Current user set:", { uid: currentUser.uid, email: currentUser.email, displayName: currentUser.displayName, username: currentUser.username, photoURL: currentUser.photoURL, isAdmin: currentUser.isAdmin, credits: currentUser.credits });
    } else {
        currentUser = null;
        console.log("[State] Current user cleared (logged out).");
    }
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

// --- NEW AI Chat Studio State Modifiers ---
export function setUserAiChatSettings(settings) {
    // Ensure the structure is valid before setting
    if (settings && typeof settings.primaryModel === 'string' &&
        typeof settings.fallbackModel === 'string' &&
        typeof settings.customSystemPrompts === 'object') {
        userAiChatSettings = settings;
        console.log("[State] User AI Chat Settings updated:", userAiChatSettings);
    } else {
        console.warn("[State] Attempted to set invalid User AI Chat Settings. Using defaults.", settings);
        // Revert to default if invalid structure is passed
        userAiChatSettings = {
            primaryModel: DEFAULT_PRIMARY_AI_MODEL,
            fallbackModel: DEFAULT_FALLBACK_AI_MODEL,
            customSystemPrompts: {}
        };
    }
}
export function setGlobalAiSystemPrompts(prompts) {
    if (prompts && typeof prompts === 'object') {
        globalAiSystemPrompts = prompts;
        console.log("[State] Global AI System Prompts updated:", globalAiSystemPrompts);
    } else {
        console.warn("[State] Attempted to set invalid Global AI System Prompts. Using empty object.", prompts);
        globalAiSystemPrompts = {};
    }
}


// --- State Reset ---
export function clearUserSession() {
    // Note: We call setCurrentUser(null) externally during logout process usually.
    // This function resets app-specific data tied to a user session.
    setCurrentSubject(null);
    setData(null);
    setCurrentOnlineTestState(null);
    setCharts({});
    // --- NEW: Clear Course State ---
    setUserCourseProgressMap(new Map());
    setActiveCourseId(null);
    // Do NOT clear globalCourseDataMap here, it's global definition data
    // Clear video duration cache
    videoDurationMap = {};

    // --- NEW: Reset User AI Chat Settings to default on logout ---
    // This ensures that settings from a previous user don't leak if simulation (localStorage) is used
    // and not properly cleared, or if state isn't fully reset.
    setUserAiChatSettings({
        primaryModel: DEFAULT_PRIMARY_AI_MODEL,
        fallbackModel: DEFAULT_FALLBACK_AI_MODEL,
        customSystemPrompts: {}
    });
    // Global AI System Prompts are not user-specific, so don't clear them here unless
    // they are also fetched per session, which is unlikely for "global" prompts.

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

// --- START MODIFICATION: Course Exam Defaults ---
export let courseExamDefaults = null; // Will hold defaults loaded from Firestore


export function setCourseExamDefaults(newDefaults) {
    courseExamDefaults = newDefaults;
    console.log("[State] Course Exam Defaults set:", courseExamDefaults);
}
// --- END MODIFICATION ---

/** Structure Update Notes for currentUser (added username, isAdmin) */
/*
currentUser object:
{
    uid: string,
    email: string | null,
    emailVerified: boolean,
    displayName: string | null, // From Firebase Auth profile
    photoURL: string | null,    // From Firebase Auth profile
    username: string | null,    // Custom unique username from Firestore, used for mentions (e.g., 'john_doe')
    isAdmin: boolean,          // True if user has admin privileges
    credits: number,           // User's current credit balance
    // Potentially other custom fields like registrationDate, etc.
}
*/

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