// --- START OF FILE state.js ---

// --- Core Data & State ---
export let auth = null;
export let db = null;

// Holds the MERGED view for TestGen: global subject definitions + user's progress on them.
// Structure: { subjects: { [subjectId]: MergedSubjectData } }
// MergedSubjectData contains global def fields + user progress fields like
// total_attempted, available_questions, studied_chapters.
export let data = { subjects: {} };

export let currentUser = null; // Holds the Firebase Auth user object AND potentially custom profile data
export let currentSubject = null; // Holds a subject object from 'data.subjects'
export let charts = {}; // For the progress dashboard
export let currentOnlineTestState = null; // Holds state during an online test

// --- NEW: Cache for raw global subject definitions ---
// Key: subjectId, Value: SubjectDefinitionObject (from /subjects collection)
export let globalSubjectDefinitionsMap = new Map();
// --- END NEW ---

import { ADMIN_UID, DEFAULT_PRIMARY_AI_MODEL, DEFAULT_FALLBACK_AI_MODEL, FALLBACK_EXAM_CONFIG } from './config.js';
import {DEFAULT_AI_SYSTEM_PROMPTS} from './ai_prompts.js'

// --- Course State ---
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

// --- AI Chat Studio State ---
export let userAiChatSettings = {
    primaryModel: DEFAULT_PRIMARY_AI_MODEL,
    fallbackModel: DEFAULT_FALLBACK_AI_MODEL,
    customSystemPrompts: {} // Key: functionKey, Value: custom prompt string
};
// Global system prompts, potentially loaded from a central DB collection.
export let globalAiSystemPrompts = {}; // Key: functionKey, Value: global default prompt string

// --- Course Exam Defaults State ---
export let courseExamDefaults = null; // Will hold defaults loaded from Firestore

// --- State Modifiers ---
export function setAuth(newAuth) {
    auth = newAuth;
}
export function setDb(newDb) {
    db = newDb;
}

// Sets the merged data (global subject defs + user progress for TestGen)
export function setData(newData) {
    data = newData;
}

export function setCurrentUser(newUser) {
    if (newUser) {
        if (!newUser.uid) {
            console.error("setCurrentUser validation failed: Attempted to set user with missing UID. Aborting state update.", newUser);
            return;
        }
        let determinedIsAdmin = false;
        if (typeof newUser.isAdmin === 'boolean') {
            determinedIsAdmin = (newUser.uid === ADMIN_UID) || newUser.isAdmin;
        } else {
            determinedIsAdmin = (newUser.uid === ADMIN_UID);
        }
        currentUser = {
            ...newUser,
            isAdmin: determinedIsAdmin,
            username: newUser.username || null,
            displayName: newUser.displayName || newUser.email?.split('@')[0] || 'User',
            photoURL: newUser.photoURL || null,
            credits: newUser.credits !== undefined ? Number(newUser.credits) : 0,
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

// --- NEW: Modifier for globalSubjectDefinitionsMap ---
export function setGlobalSubjectDefinitionsMap(newMap) {
    globalSubjectDefinitionsMap = newMap;
    console.log("[State] Global Subject Definitions Map updated:", globalSubjectDefinitionsMap);
}
export function updateGlobalSubjectDefinition(subjectId, subjectDef) {
    globalSubjectDefinitionsMap.set(subjectId, subjectDef);
    // This function might also trigger a re-merge into `data.subjects` if a user is logged in.
    // For now, `loadUserData` or a dedicated sync function handles the re-merge.
}
// --- End NEW ---

// --- Course State Modifiers ---
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
        userCourseProgressMap.set(courseId, { ...userCourseProgressMap.get(courseId), ...progressData });
    } else {
        userCourseProgressMap.set(courseId, progressData);
    }
}
export function updateGlobalCourseData(courseId, courseData) {
     globalCourseDataMap.set(courseId, courseData);
}

// --- AI Chat Studio State Modifiers ---
export function setUserAiChatSettings(settings) {
    if (settings && typeof settings.primaryModel === 'string' &&
        typeof settings.fallbackModel === 'string' &&
        typeof settings.customSystemPrompts === 'object') {
        userAiChatSettings = settings;
        console.log("[State] User AI Chat Settings updated:", userAiChatSettings);
    } else {
        console.warn("[State] Attempted to set invalid User AI Chat Settings. Using defaults.", settings);
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

// --- Course Exam Defaults Modifier ---
export function setCourseExamDefaults(newDefaults) {
    if (newDefaults && typeof newDefaults === 'object') {
        courseExamDefaults = newDefaults;
        console.log("[State] Course Exam Defaults set:", courseExamDefaults);
    } else {
        console.warn("[State] Attempted to set invalid Course Exam Defaults. Using fallback.", newDefaults);
        courseExamDefaults = { ...FALLBACK_EXAM_CONFIG }; // Ensure deep copy of fallback
    }
}

// --- State Reset ---
export function clearUserSession() {
    setCurrentSubject(null);
    setData({ subjects: {} }); // Reset to empty subjects object
    setCurrentOnlineTestState(null);
    setCharts({});
    setUserCourseProgressMap(new Map());
    setActiveCourseId(null);
    videoDurationMap = {};
    setUserAiChatSettings({
        primaryModel: DEFAULT_PRIMARY_AI_MODEL,
        fallbackModel: DEFAULT_FALLBACK_AI_MODEL,
        customSystemPrompts: {}
    });

    document.getElementById('content')?.replaceChildren();
    document.getElementById('dashboard')?.classList.add('hidden');
    document.getElementById('online-test-area')?.classList.add('hidden');
    document.getElementById('subject-info')?.replaceChildren();

    window.cleanupPdfViewer?.();
    window.cleanupYouTubePlayers?.();

    document.getElementById('course-dashboard-area')?.replaceChildren();
    document.getElementById('course-dashboard-area')?.classList.add('hidden');
    console.log("[State] User session data cleared.");
}

// --- END OF FILE state.js ---