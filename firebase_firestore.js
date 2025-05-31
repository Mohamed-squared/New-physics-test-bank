// --- START OF FILE firebase_firestore.js ---

// firebase_firestore.js

import {
    db, auth as firebaseAuth, data, setData, currentSubject, setCurrentSubject,
    userCourseProgressMap, setUserCourseProgressMap, updateGlobalCourseData, globalCourseDataMap,
    activeCourseId, setActiveCourseId, updateUserCourseProgress, currentUser, setCurrentUser,
    setUserAiChatSettings, globalAiSystemPrompts, setGlobalAiSystemPrompts, videoDurationMap,
    courseExamDefaults, setCourseExamDefaults,
    // --- NEW: Import for global subject defs map ---
    globalSubjectDefinitionsMap, setGlobalSubjectDefinitionsMap, updateGlobalSubjectDefinition,
    
    
} from './state.js';
import { showLoading, hideLoading, getFormattedDate } from './utils.js';
import { updateChaptersFromMarkdown, parseChaptersFromMarkdown  } from './markdown_parser.js';
// Import ALL needed config values
import {
    // MODIFIED: Import globalSubjectBootstrapData instead of initialSubjectData
    globalSubjectBootstrapData, ADMIN_UID, DEFAULT_PROFILE_PIC_URL, FOP_COURSE_ID,
    FOP_COURSE_DEFINITION, GRADING_WEIGHTS, PASSING_GRADE_PERCENT,
    SKIP_EXAM_PASSING_PERCENT, COURSE_BASE_PATH, SUBJECT_RESOURCE_FOLDER,
    DEFAULT_PRIMARY_AI_MODEL, DEFAULT_FALLBACK_AI_MODEL, FALLBACK_EXAM_CONFIG,
    DEFAULT_EXPERIMENTAL_FEATURES
} from './config.js';
import { AI_FUNCTION_KEYS, DEFAULT_AI_SYSTEM_PROMPTS } from './ai_prompts.js';
import { updateSubjectInfo, fetchAndUpdateUserInfo } from './ui_core.js';
import { showOnboardingUI } from './ui_onboarding.js';
import { determineTodaysObjective, calculateTotalMark, getLetterGrade } from './course_logic.js';
import { cleanTextForFilename } from './filename_utils.js';
import { fetchVideoDurationsIfNeeded, getYouTubeVideoId } from './ui_course_study_material.js';

// --- Constants ---
const userFormulaSheetSubCollection = "userFormulaSheets";
const userSummarySubCollection = "userChapterSummaries";
const sharedNotesCollection = "sharedCourseNotes";
const adminTasksCollection = "adminTasks";
const userCreditLogSubCollection = "creditLog";
const aiChatSessionsSubCollection = "aiChatSessions";
const globalSettingsCollection = "settings";
const aiPromptsDocId = "aiPrompts";
const settingsCollection = "settings";
const courseExamDefaultsDocId = "courseExamDefaults";

export async function loadCourseExamDefaults() {
    if (!db) {
        console.error("[loadCourseExamDefaults] Firestore DB not initialized.");
        setCourseExamDefaults({ ...FALLBACK_EXAM_CONFIG }); // Use a deep copy of fallback
        return;
    }
    const docRef = db.collection(settingsCollection).doc(courseExamDefaultsDocId);
    try {
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const defaultsFromDb = docSnap.data();
            const mergedDefaults = {};
            for (const examType in FALLBACK_EXAM_CONFIG) {
                mergedDefaults[examType] = {
                    ...FALLBACK_EXAM_CONFIG[examType],
                    ...(defaultsFromDb[examType] || {})
                };
                mergedDefaults[examType].questions = parseInt(mergedDefaults[examType].questions) || FALLBACK_EXAM_CONFIG[examType].questions;
                mergedDefaults[examType].durationMinutes = parseInt(mergedDefaults[examType].durationMinutes) || FALLBACK_EXAM_CONFIG[examType].durationMinutes;
                mergedDefaults[examType].mcqRatio = parseFloat(mergedDefaults[examType].mcqRatio) || FALLBACK_EXAM_CONFIG[examType].mcqRatio;
                mergedDefaults[examType].textSourceRatio = parseFloat(mergedDefaults[examType].textSourceRatio) || FALLBACK_EXAM_CONFIG[examType].textSourceRatio;
            }
            setCourseExamDefaults(mergedDefaults);
            console.log("Course exam defaults loaded from Firestore and merged with fallbacks.");
        } else {
            console.warn(`Course exam defaults document (${settingsCollection}/${courseExamDefaultsDocId}) not found. Using fallback values and attempting to create the document.`);
            setCourseExamDefaults({ ...FALLBACK_EXAM_CONFIG });
            try {
                await docRef.set(FALLBACK_EXAM_CONFIG);
                console.log(`Created ${courseExamDefaultsDocId} document in Firestore with fallback values.`);
            } catch (e) {
                console.error(`Failed to create ${courseExamDefaultsDocId} document with fallbacks:`, e);
            }
        }
    } catch (error) {
        console.error("Error loading course exam defaults from Firestore:", error);
        setCourseExamDefaults({ ...FALLBACK_EXAM_CONFIG });
    }
}

export async function saveCourseExamDefaults(newDefaults) {
    if (!db || !currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Primary Admin privileges required to save exam defaults.");
        return false;
    }
    if (!newDefaults || typeof newDefaults !== 'object') {
        alert("Invalid data format for exam defaults.");
        return false;
    }
    const docRef = db.collection(settingsCollection).doc(courseExamDefaultsDocId);
    try {
        const defaultsToSave = {};
        for (const examType in FALLBACK_EXAM_CONFIG) {
            if (newDefaults[examType]) {
                defaultsToSave[examType] = {
                    questions: parseInt(newDefaults[examType].questions) || FALLBACK_EXAM_CONFIG[examType].questions,
                    durationMinutes: parseInt(newDefaults[examType].durationMinutes) || FALLBACK_EXAM_CONFIG[examType].durationMinutes,
                    mcqRatio: Math.max(0, Math.min(1, parseFloat(newDefaults[examType].mcqRatio))) || FALLBACK_EXAM_CONFIG[examType].mcqRatio,
                    textSourceRatio: Math.max(0, Math.min(1, parseFloat(newDefaults[examType].textSourceRatio))) || FALLBACK_EXAM_CONFIG[examType].textSourceRatio,
                };
            } else {
                defaultsToSave[examType] = { ...FALLBACK_EXAM_CONFIG[examType] };
            }
        }
        console.log("[saveCourseExamDefaults DEBUG] Data being sent to Firestore:", JSON.stringify(defaultsToSave, null, 2));
        await docRef.set(defaultsToSave);
        setCourseExamDefaults(defaultsToSave);
        console.log("Course exam defaults saved to Firestore.");
        return true;
    } catch (error) {
        console.error("Error saving course exam defaults:", error);
        alert(`Failed to save exam defaults: ${error.message}`);
        return false;
    }
}
// --- END MODIFICATION ---


// --- Utilities ---
/**
 * Fetches the markdown content for a given subject.
 * Handles the default 'chapters.md' case.
 * Returns the markdown text content or null if fetch fails.
 */
async function fetchMarkdownForSubject(subject) {
    if (!subject) return null;

    const courseDir = subject.courseDirName 
        ? cleanTextForFilename(subject.courseDirName) 
        : cleanTextForFilename(subject.name || `subject_${subject.id}`);
    
    if (!courseDir) {
        console.warn(`fetchMarkdownForSubject: Could not determine courseDir for subject ${subject.id} ('${subject.name}'). Cannot fetch markdown.`);
        return null;
    }

    const safeBaseFileName = subject.fileName 
        ? cleanTextForFilename(subject.fileName) 
        : 'default_mcqs.md'; 

    const url = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${safeBaseFileName}?t=${new Date().getTime()}`;

    console.log(`Fetching Markdown from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Markdown file not found: ${url}. Subject: ${subject.name} (ID: ${subject.id})`);
                return null; 
            }
            throw new Error(`HTTP error fetching markdown! status: ${response.status} for ${url}`);
        }
        const mdContent = await response.text();
        console.log(`Markdown fetched successfully for subject ${subject.name} (ID: ${subject.id}).`);
        return mdContent;
    } catch (error) {
        console.error(`Error fetching Markdown for subject ${subject.name} (ID: ${subject.id}) (${url}):`, error);
        return null; 
    }
}

function getDefaultSubjectProgressStats() {
    return {
        chapters: {}, // Will be populated by MD parse relative to global total_questions
        studied_chapters: [],
        pending_exams: [],
        // Note: total_attempted, total_wrong etc. are per-chapter within `chapters` object
    };
}

export async function fetchMarkdownForGlobalSubject(subjectDef) {
    if (!subjectDef) return null;

    const courseDir = subjectDef.courseDirName
        ? cleanTextForFilename(subjectDef.courseDirName)
        : cleanTextForFilename(subjectDef.name || `subject_${subjectDef.id}`);

    if (!courseDir) {
        console.warn(`fetchMarkdownForGlobalSubject: Could not determine courseDir for subject ${subjectDef.id} ('${subjectDef.name}').`);
        return null;
    }
    // mcqFileName in global subject def points to the file for MCQs
    const safeMcqFileName = subjectDef.mcqFileName
        ? cleanTextForFilename(subjectDef.mcqFileName)
        : 'default_mcqs.md'; // Fallback, though a defined subject should have this

    // *** USE THE CORRECT CONSTANT HERE ***
    const url = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${safeMcqFileName}?t=${new Date().getTime()}`;

    console.log(`Fetching Markdown for Global Subject (for MD Parse): ${url}`); // Clarified log
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`MD file not found: ${url}. Subject: ${subjectDef.name} (ID: ${subjectDef.id})`);
                return null;
            }
            throw new Error(`HTTP error fetching MD! status: ${response.status} for ${url}`);
        }
        const mdContent = await response.text();
        // console.log(`MD fetched for subject ${subjectDef.name} (ID: ${subjectDef.id}).`);
        return mdContent;
    } catch (error) {
        console.error(`Error fetching MD for subject ${subjectDef.name} (ID: ${subjectDef.id}) (${url}):`, error);
        return null;
    }
}

export async function loadGlobalSubjectDefinitionsFromFirestore() {
    if (!db) { console.error("Firestore DB not initialized"); return; }
    console.log("Loading global subject definitions...");
    const subjectsRef = db.collection('subjects');
    const newDefMap = new Map();
    let bootstrapNeeded = false;

    try {
        const snapshot = await subjectsRef.get();
        if (snapshot.empty && currentUser?.uid === ADMIN_UID) { // Only admin can bootstrap
            console.warn("Global '/subjects' collection is empty. Attempting bootstrap by admin.");
            bootstrapNeeded = true;
        } else {
            snapshot.forEach(doc => {
                const subjectDef = { id: doc.id, ...doc.data() };
                // Basic validation
                subjectDef.chapters = {}; // This will be populated by MD parse, not stored in global def
                newDefMap.set(doc.id, subjectDef);
            });
        }

        if (bootstrapNeeded) {
            showLoading("Bootstrapping global subjects...");
            const batch = db.batch();
            for (const subjectId in globalSubjectBootstrapData) {
                const subjectDef = globalSubjectBootstrapData[subjectId];
                // Remove any user-progress-like fields before saving definition
                const definitionToSave = { ...subjectDef };
                delete definitionToSave.chapters; // Chapters structure (titles, Q counts) derived from MD
                delete definitionToSave.studied_chapters;
                delete definitionToSave.pending_exams;

                const docRef = db.collection('subjects').doc(subjectId);
                batch.set(docRef, definitionToSave);
                newDefMap.set(subjectId, { id: subjectId, ...definitionToSave, chapters: {} }); // Add to map with empty chapters
                console.log(`Bootstrapped global subject: ${subjectDef.name}`);
            }
            await batch.commit();
            hideLoading();
            alert("Global subjects bootstrapped by admin.");
        }
        setGlobalSubjectDefinitionsMap(newDefMap);
        console.log(`Global subject definitions loaded. Count: ${newDefMap.size}`);
    } catch (error) {
        console.error("Error loading global subject definitions:", error);
        // Fallback or error handling
    }
}

export async function loadUserSubjectProgress(uid) {
    if (!db || !uid) {
        console.warn("loadUserSubjectProgress: DB or UID missing.");
        return {};
    }
    const userRef = db.collection('users').doc(uid);
    try {
        const doc = await userRef.get();
        if (doc.exists) {
            const userData = doc.data();
            // This now expects subjectProgress to be directly under appData
            return userData.appData?.subjectProgress || {};
        }
        return {};
    } catch (error) {
        console.error(`Error loading subject progress for user ${uid}:`, error);
        return {};
    }
}

// --- User Data Management ---

/**
 * Saves the user's core application data (subjects, test history, etc.) to Firestore.
 * This now only saves the `appData` field within the user document.
 * @param {string} uid - The user's unique ID.
 * @param {object} [appDataToSave=data] - Optional: The app data object to save (defaults to global `data`).
 */
export async function saveUserData(uid, appDataToSave = data) {
    if (!db) { console.error("Firestore DB not initialized"); return; }
    if (!uid || !appDataToSave) {
        console.warn("Attempted to save user appData without UID or data object.");
        return;
    }
    const userRef = db.collection('users').doc(uid);

    const subjectProgressToSave = {};
    if (appDataToSave.subjects) {
        for (const subjectId in appDataToSave.subjects) {
            const mergedSubject = appDataToSave.subjects[subjectId];
            subjectProgressToSave[subjectId] = {
                // Only save user-specific progress fields
                total_attempted: mergedSubject.total_attempted || 0,
                total_wrong: mergedSubject.total_wrong || 0,
                available_questions: Array.isArray(mergedSubject.available_questions) ? mergedSubject.available_questions : [],
                mistake_history: Array.isArray(mergedSubject.mistake_history) ? mergedSubject.mistake_history : [],
                consecutive_mastery: mergedSubject.consecutive_mastery || 0,
                studied_chapters: Array.isArray(mergedSubject.studied_chapters) ? mergedSubject.studied_chapters : [],
                pending_exams: Array.isArray(mergedSubject.pending_exams) ? mergedSubject.pending_exams : [],
                // Store chapter-specific progress (like available_questions) within user's progress
                chapters: mergedSubject.chapters ? JSON.parse(JSON.stringify(mergedSubject.chapters)) : {} // Deep copy chapter progress
            };
            // Clean chapter progress to only store what's needed
            if (subjectProgressToSave[subjectId].chapters) {
                for (const chapNum in subjectProgressToSave[subjectId].chapters) {
                    const chapProgress = subjectProgressToSave[subjectId].chapters[chapNum];
                    subjectProgressToSave[subjectId].chapters[chapNum] = {
                        total_attempted: chapProgress.total_attempted || 0,
                        total_wrong: chapProgress.total_wrong || 0,
                        available_questions: Array.isArray(chapProgress.available_questions) ? chapProgress.available_questions : [],
                        mistake_history: Array.isArray(chapProgress.mistake_history) ? chapProgress.mistake_history : [],
                        consecutive_mastery: chapProgress.consecutive_mastery || 0,
                        // DO NOT save title or total_questions here, they come from global def/MD parse
                    };
                }
            }
        }
    }

    const finalAppDataForFirestore = {
        subjectProgress: subjectProgressToSave
    };

    try {
        console.log(`[saveUserData] Saving appData (subjectProgress only) for UID: ${uid}.`);
        await userRef.update({
            appData: finalAppDataForFirestore,
            lastAppDataUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("User appData (subjectProgress) saved successfully.");
    } catch (error) {
        console.error("Error saving user appData (subjectProgress) to Firestore. UID:", uid, "Error:", error);
        alert("Error saving progress: " + error.message);
    }
}



// --- User Course Progress ---
/**
 * Saves or updates the progress data for a specific course for a user.
 * @param {string} uid - The user's unique ID.
 * @param {string} courseId - The ID of the course.
 * @param {object} progressData - The progress data object to save/merge.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */


export async function saveUserCourseProgress(uid, courseId, progressData) {
    if (!db) { console.error("Firestore DB not initialized"); return false; }
    if (!uid || !courseId || !progressData) {
        console.warn("Attempted to save course progress without UID, courseId, or data.");
        return false;
    }
    const progressRef = db.collection('userCourseProgress').doc(uid).collection('courses').doc(courseId);
    try {
        // Create a working copy. JSON.stringify will convert FieldValue.serverTimestamp()
        // into a plain object like { ".sv": "timestamp" } or similar, or an empty object
        // depending on the SDK version and how it serializes.
        // The original progressData from ui_course_enrollment passes the actual FieldValue object.
        let dataToSave = { ...progressData }; // Start with a shallow copy

        // --- Explicitly Handle Server Timestamps ---
        // If enrollmentDate or lastActivityDate was intended to be a server timestamp
        // by the calling code (ui_course_enrollment), re-assert it here.
        // This is safer than trying to detect the placeholder after stringify/parse.

        // If enrollmentDate from the input progressData was a FieldValue.serverTimestamp()
        // or if we want to ensure it is for a new record:
        if (progressData.enrollmentDate && typeof progressData.enrollmentDate === 'object' &&
            typeof progressData.enrollmentDate.isEqual === 'function' && // Check if it's a FieldValue type
            progressData.enrollmentDate._methodName === 'FieldValue.serverTimestamp') { // More specific check for v8 compat
            dataToSave.enrollmentDate = firebase.firestore.FieldValue.serverTimestamp();
            console.log("[saveUserCourseProgress] enrollmentDate re-asserted as serverTimestamp.");
        } else if (progressData.enrollmentDate instanceof Date) {
            dataToSave.enrollmentDate = firebase.firestore.Timestamp.fromDate(progressData.enrollmentDate);
            console.log("[saveUserCourseProgress] Converted enrollmentDate (JS Date) to Firestore Timestamp.");
        } else if (progressData.enrollmentDate) { // It's some other value, try to parse or nullify
            try {
                const dateObj = new Date(progressData.enrollmentDate);
                if (!isNaN(dateObj)) {
                    dataToSave.enrollmentDate = firebase.firestore.Timestamp.fromDate(dateObj);
                } else {
                    console.warn("[saveUserCourseProgress] Invalid enrollmentDate value, setting to null:", progressData.enrollmentDate);
                    dataToSave.enrollmentDate = null;
                }
            } catch (e) {
                console.warn("[saveUserCourseProgress] Error processing enrollmentDate, setting to null:", e, progressData.enrollmentDate);
                dataToSave.enrollmentDate = null;
            }
        }
        // If enrollmentDate is not provided in progressData (e.g., for an update not touching it),
        // it won't be in dataToSave, and thus won't be written, which is correct for updates.
        // For CREATE, the calling function (handlePaceSelection) *must* provide it.

        // Always set lastActivityDate to server timestamp for any save.
        dataToSave.lastActivityDate = firebase.firestore.FieldValue.serverTimestamp();
        console.log("[saveUserCourseProgress] lastActivityDate set to serverTimestamp.");

        // Handle completionDate (can be null, a JS Date, or a Firestore Timestamp from previous load)
        if (dataToSave.completionDate) {
            if (dataToSave.completionDate instanceof Date) {
                dataToSave.completionDate = firebase.firestore.Timestamp.fromDate(dataToSave.completionDate);
            } else if (typeof dataToSave.completionDate === 'object' && dataToSave.completionDate !== null && typeof dataToSave.completionDate.toDate === 'function') {
                // Already a Firestore Timestamp, no change needed
            } else if (typeof dataToSave.completionDate === 'string' || typeof dataToSave.completionDate === 'number') {
                try {
                    const dateObj = new Date(dataToSave.completionDate);
                    dataToSave.completionDate = !isNaN(dateObj) ? firebase.firestore.Timestamp.fromDate(dateObj) : null;
                } catch { dataToSave.completionDate = null; }
            } else { // Unrecognized, set to null
                dataToSave.completionDate = null;
            }
        } else {
            dataToSave.completionDate = null; // Ensure it's explicitly null if not provided
        }


        // Default value initializations (ensure all expected fields for create are present)
        // These should match what the security rule for 'create' expects.
        dataToSave.courseId = dataToSave.courseId || courseId; // Ensure courseId is part of the object
        dataToSave.status = dataToSave.status || 'enrolled';
        dataToSave.enrollmentMode = dataToSave.enrollmentMode || 'full';
        dataToSave.selectedPace = dataToSave.selectedPace || 'mediocre';
        dataToSave.customPaceDays = dataToSave.customPaceDays === undefined ? null : dataToSave.customPaceDays;
        dataToSave.baseMediocrePace = dataToSave.baseMediocrePace === undefined ? null : dataToSave.baseMediocrePace;
        dataToSave.currentPace = dataToSave.currentPace === undefined ? null : dataToSave.currentPace;
        dataToSave.currentChapterTarget = dataToSave.currentChapterTarget || 1;
        dataToSave.currentDayObjective = dataToSave.currentDayObjective || "Review Chapter 1 Study Material";
        dataToSave.courseStudiedChapters = Array.isArray(dataToSave.courseStudiedChapters) ? dataToSave.courseStudiedChapters : [];
        dataToSave.dailyProgress = typeof dataToSave.dailyProgress === 'object' && dataToSave.dailyProgress !== null ? dataToSave.dailyProgress : {};
        dataToSave.watchedVideoUrls = typeof dataToSave.watchedVideoUrls === 'object' && dataToSave.watchedVideoUrls !== null ? dataToSave.watchedVideoUrls : {};
        dataToSave.watchedVideoDurations = typeof dataToSave.watchedVideoDurations === 'object' && dataToSave.watchedVideoDurations !== null ? dataToSave.watchedVideoDurations : {};
        dataToSave.pdfProgress = typeof dataToSave.pdfProgress === 'object' && dataToSave.pdfProgress !== null ? dataToSave.pdfProgress : {};
        dataToSave.skipExamAttempts = typeof dataToSave.skipExamAttempts === 'object' && dataToSave.skipExamAttempts !== null ? dataToSave.skipExamAttempts : {};
        dataToSave.lastSkipExamScore = typeof dataToSave.lastSkipExamScore === 'object' && dataToSave.lastSkipExamScore !== null ? dataToSave.lastSkipExamScore : {};
        dataToSave.assignmentScores = typeof dataToSave.assignmentScores === 'object' && dataToSave.assignmentScores !== null ? dataToSave.assignmentScores : {};
        dataToSave.weeklyExamScores = typeof dataToSave.weeklyExamScores === 'object' && dataToSave.weeklyExamScores !== null ? dataToSave.weeklyExamScores : {};
        dataToSave.midcourseExamScores = typeof dataToSave.midcourseExamScores === 'object' && dataToSave.midcourseExamScores !== null ? dataToSave.midcourseExamScores : {};
        if (dataToSave.finalExamScores === undefined) { dataToSave.finalExamScores = null; }
        dataToSave.attendanceScore = dataToSave.attendanceScore !== undefined ? dataToSave.attendanceScore : 100;
        dataToSave.extraPracticeBonus = dataToSave.extraPracticeBonus !== undefined ? dataToSave.extraPracticeBonus : 0;
        dataToSave.totalMark = dataToSave.totalMark === undefined ? null : dataToSave.totalMark;
        dataToSave.grade = dataToSave.grade === undefined ? null : dataToSave.grade;


        console.log(`[saveUserCourseProgress] Data ready for Firestore set for course ${courseId}. Keys: ${Object.keys(dataToSave).join(', ')}`);
        console.log(`[saveUserCourseProgress DEBUG] Data being sent to Firestore for operation on ${progressRef.path}:`, JSON.stringify(dataToSave, (key, value) => {
            // Custom replacer to better show FieldValue objects in log
            if (value && typeof value === 'object' && typeof value.isEqual === 'function') { // Heuristic for FieldValue
                if (value._methodName === 'FieldValue.serverTimestamp') return "{SERVER_TIMESTAMP}";
                return "{FIELD_VALUE_OBJECT}";
            }
            return value;
        }, 2));

        const docSnapshot = await progressRef.get();
        if (!docSnapshot.exists) {
            // This is a CREATE operation. Ensure enrollmentDate is a server timestamp if not already set from input.
            if (!dataToSave.enrollmentDate || !(typeof dataToSave.enrollmentDate === 'object' && typeof dataToSave.enrollmentDate.isEqual === 'function')) {
                dataToSave.enrollmentDate = firebase.firestore.FieldValue.serverTimestamp();
                console.warn("[saveUserCourseProgress] enrollmentDate was not a server timestamp for create, setting it now.");
            }
            await progressRef.set(dataToSave);
            console.log(`User course progress CREATED successfully for course ${courseId}.`);
        } else {
            // This is an UPDATE. enrollmentDate should not typically be updated here unless by an admin.
            // If dataToSave contains enrollmentDate and it's different from existing, merge will update it.
            // Our admin functions should handle enrollmentDate changes specifically.
            // For user-triggered saves, enrollmentDate usually shouldn't change.
            await progressRef.set(dataToSave, { merge: true });
            console.log(`User course progress UPDATED successfully for course ${courseId}.`);
        }

        return true;
    } catch (error) {
        console.error(`Error saving course progress for course ${courseId}:`, error);
        let alertMessage = `Error saving course progress: ${error.message}`;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = `Error saving course progress: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
        }
        alert(alertMessage);
        return false;
    }
}

/**
 * Loads progress data for all courses a user is enrolled in.
 * Updates the `userCourseProgressMap` state.
 * @param {string} uid - The user's unique ID.
 */
export async function loadAllUserCourseProgress(uid) {
    if (!db) { console.error("Firestore DB not initialized"); return; }
    if (!uid) { console.error("loadAllUserCourseProgress called without UID."); return; }
    console.log(`Loading ALL course progress for user: ${uid}`);
    const progressCollectionRef = db.collection('userCourseProgress').doc(uid).collection('courses');
    const newProgressMap = new Map();
    try {
        const snapshot = await progressCollectionRef.get();
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                const progressData = doc.data();
                progressData.enrollmentMode = progressData.enrollmentMode || 'full'; 
                progressData.courseStudiedChapters = progressData.courseStudiedChapters || [];
                progressData.dailyProgress = progressData.dailyProgress || {};
                progressData.assignmentScores = progressData.assignmentScores || {};
                progressData.weeklyExamScores = progressData.weeklyExamScores || {};
                progressData.midcourseExamScores = progressData.midcourseExamScores || {};
                progressData.finalExamScores = progressData.finalExamScores === undefined ? null : progressData.finalExamScores; 
                progressData.watchedVideoUrls = progressData.watchedVideoUrls || {};
                progressData.watchedVideoDurations = progressData.watchedVideoDurations || {};
                progressData.pdfProgress = progressData.pdfProgress || {};
                progressData.skipExamAttempts = progressData.skipExamAttempts || {};
                progressData.lastSkipExamScore = progressData.lastSkipExamScore || {};
                progressData.status = progressData.status || 'enrolled';
                Object.keys(progressData.dailyProgress).forEach(dateStr => {
                    progressData.dailyProgress[dateStr] = progressData.dailyProgress[dateStr] || {}; 
                    progressData.dailyProgress[dateStr].chaptersStudied = progressData.dailyProgress[dateStr].chaptersStudied || [];
                    progressData.dailyProgress[dateStr].skipExamsPassed = progressData.dailyProgress[dateStr].skipExamsPassed || [];
                    progressData.dailyProgress[dateStr].assignmentCompleted = progressData.dailyProgress[dateStr].assignmentCompleted ?? false;
                    progressData.dailyProgress[dateStr].assignmentScore = progressData.dailyProgress[dateStr].assignmentScore ?? null;
                });

                if (progressData.enrollmentDate?.toDate) {
                    progressData.enrollmentDate = progressData.enrollmentDate.toDate();
                } else if (progressData.enrollmentDate) { 
                     try { progressData.enrollmentDate = new Date(progressData.enrollmentDate); } catch(e){ console.warn(`Could not parse enrollmentDate for course ${doc.id}`); progressData.enrollmentDate = new Date(); }
                } else {
                     progressData.enrollmentDate = new Date(); 
                }

                 if (progressData.completionDate?.toDate) {
                    progressData.completionDate = progressData.completionDate.toDate();
                }
                 if (progressData.lastActivityDate?.toDate) {
                    progressData.lastActivityDate = progressData.lastActivityDate.toDate();
                } else {
                     progressData.lastActivityDate = new Date(); 
                }


                const courseDef = globalCourseDataMap.get(doc.id);
                if (courseDef) {
                     progressData.currentDayObjective = determineTodaysObjective(progressData, courseDef);
                } else {
                     console.warn(`Course definition missing for course ${doc.id} when calculating objective.`);
                     progressData.currentDayObjective = "Course definition unavailable.";
                }

                newProgressMap.set(doc.id, progressData);
                console.log(`Loaded progress for course: ${doc.id} (Mode: ${progressData.enrollmentMode})`);
            });
        } else {
            console.log("No enrolled courses found for user.");
        }
        setUserCourseProgressMap(newProgressMap); 
    } catch (error) {
        console.error("Error loading user course progress:", error);
        throw error; 
    }
}

// --- Unenroll From Course ---
/**
 * Removes a user's progress document for a specific course.
 * @param {string} uid - User ID.
 * @param {string} courseId - Course ID to unenroll from.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function unenrollFromCourse(uid, courseId) {
    if (!db) { console.error("Firestore DB not initialized"); return false; }
    if (!uid || !courseId) { console.warn("Unenroll failed: Missing UID or Course ID."); return false; }

    const progressRef = db.collection('userCourseProgress').doc(uid).collection('courses').doc(courseId);
    console.log(`Attempting to delete progress for user ${uid}, course ${courseId}...`);
    try {
        await progressRef.delete();
        console.log(`Successfully deleted progress document for course ${courseId}.`);
        return true;
    } catch (error) {
        console.error(`Error unenrolling from course ${courseId}:`, error);
        let alertMessage = `Failed to unenroll: ${error.message}`;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = `Failed to unenroll: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
        }
        alert(alertMessage);
        return false;
    }
}


async function fetchChapterDefinitionMarkdown(courseDef) {
    // ... (implementation from previous response) ...
    if (!courseDef || !courseDef.courseDirName) {
        console.warn(`[fetchChapterDefinitionMarkdown] Course definition or courseDirName missing for ${courseDef?.id}. Cannot fetch chapter titles.`);
        return null;
    }
    const chapterDefFilename = "TextMCQ.md"; // Or make this configurable per course
    const safeDirName = cleanTextForFilename(courseDef.courseDirName);
    const url = `${COURSE_BASE_PATH}/${safeDirName}/${SUBJECT_RESOURCE_FOLDER}/${chapterDefFilename}?t=${new Date().getTime()}`;
    // console.log(`[fetchChapterDefinitionMarkdown] Fetching chapter definitions for "${courseDef.name}" from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`[fetchChapterDefinitionMarkdown] Chapter definition file NOT FOUND: ${url} for course "${courseDef.name}".`);
                return null;
            }
            throw new Error(`HTTP error fetching chapter definitions! status: ${response.status} for ${url}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Error fetching chapter definition Markdown for course "${courseDef.name}" (${url}):`, error);
        return null;
    }
}


export async function loadGlobalCourseDefinitions() {
    if (!db) { console.error("Firestore DB not initialized"); return; }
    console.log("Loading global course definitions...");
    const coursesRef = db.collection('courses');
    let fopFoundInFirestore = false;
    const coursesToProcess = []; // Array to hold data before adding to map

    try {
        const snapshot = await coursesRef.get();
        snapshot.forEach(doc => {
            coursesToProcess.push({ id: doc.id, firestoreData: doc.data() });
            if (doc.id === FOP_COURSE_ID) {
                fopFoundInFirestore = true;
            }
        });

        if (!fopFoundInFirestore) {
            console.log(`FOP course ${FOP_COURSE_ID} not found in Firestore. Will attempt to create/ensure it.`);
            // Add a placeholder to ensure FoP gets processed, even if just from config
            coursesToProcess.push({ id: FOP_COURSE_ID, firestoreData: null, isPlaceholderFoP: true });
        }

        for (const courseEntry of coursesToProcess) {
            const courseId = courseEntry.id;
            let baseData = courseEntry.firestoreData;
            let isNewFoPInstance = false;

            if (courseId === FOP_COURSE_ID) {
                if (!baseData) { // If FoP wasn't in Firestore (isPlaceholderFoP was true)
                    baseData = { ...FOP_COURSE_DEFINITION }; // Start with config
                    baseData.status = 'approved'; // Ensure default status
                    baseData.creatorUid = ADMIN_UID;
                    baseData.creatorName = 'System (Config)';
                    // Handle createdAt for new FoP
                    if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
                        baseData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    } else {
                        baseData.createdAt = new Date(); // Fallback
                    }
                    // Initialize MEGA links to null for new FOP instance
                    baseData.megaTranscriptionsFolderLink = null;
                    baseData.megaPdfFolderLink = null;
                    baseData.megaMcqFolderLink = null;
                    baseData.megaTextbookFullPdfLink = null;
                    isNewFoPInstance = true;
                    console.log(`[FoP Processing] Preparing new FoP instance for course ID: ${courseId}`);
                } else {
                    console.log(`[FoP Processing] FoP course ID ${courseId} found in Firestore. Merging with config if necessary.`);
                    // If FoP exists, ensure certain fields from config are prioritized or defaults applied
                    // For example, to always use the config's chapter list for FoP:
                    baseData.chapters = Array.isArray(FOP_COURSE_DEFINITION.chapters) ? [...FOP_COURSE_DEFINITION.chapters] : (baseData.chapters || []);
                    baseData.totalChapters = baseData.chapters.length;
                    // Ensure other FOP_COURSE_DEFINITION fields take precedence if desired
                    baseData.name = FOP_COURSE_DEFINITION.name || baseData.name;
                    baseData.description = FOP_COURSE_DEFINITION.description || baseData.description;
                    baseData.youtubePlaylistUrls = FOP_COURSE_DEFINITION.youtubePlaylistUrls || baseData.youtubePlaylistUrls || [];
                }
            }

            if (!baseData) { // Should only happen if firestoreData was null and not FoP
                console.error(`CRITICAL: No baseData for courseId ${courseId}. Skipping this course.`);
                continue;
            }

            let finalCourseData = { ...baseData, id: courseId };

            // --- Initialize Core Fields (ensure these are always set) ---
            finalCourseData.name = finalCourseData.name || `Course ${courseId}`;
            finalCourseData.status = finalCourseData.status || 'approved';
            finalCourseData.courseDirName = finalCourseData.courseDirName || cleanTextForFilename(finalCourseData.name) || courseId;
            finalCourseData.totalChapters = Number(finalCourseData.totalChapters) || 0;
            finalCourseData.chapters = Array.isArray(finalCourseData.chapters) ? finalCourseData.chapters : [];
            finalCourseData.chapterResources = typeof finalCourseData.chapterResources === 'object' ? finalCourseData.chapterResources : {};
            finalCourseData.youtubePlaylistUrls = Array.isArray(finalCourseData.youtubePlaylistUrls) ? finalCourseData.youtubePlaylistUrls : (finalCourseData.youtubePlaylistUrl ? [finalCourseData.youtubePlaylistUrl] : []);
            finalCourseData.midcourseChapters = Array.isArray(finalCourseData.midcourseChapters) ? finalCourseData.midcourseChapters : [];
            finalCourseData.imageUrl = finalCourseData.imageUrl || null;
            finalCourseData.coverUrl = finalCourseData.coverUrl || null;
            finalCourseData.prerequisites = Array.isArray(finalCourseData.prerequisites) ? finalCourseData.prerequisites.filter(item => typeof item === 'string') : [];
            finalCourseData.corequisites = Array.isArray(finalCourseData.corequisites) ? finalCourseData.corequisites.filter(item => typeof item === 'string') : [];
            finalCourseData.creatorUid = finalCourseData.creatorUid || ADMIN_UID;
            finalCourseData.creatorName = finalCourseData.creatorName || 'System';
            if (!finalCourseData.createdAt) { // If still not set (e.g. old Firestore doc without it)
                finalCourseData.createdAt = (typeof firebase !== 'undefined' && firebase.firestore && baseData.createdAt !== firebase.firestore.FieldValue.serverTimestamp()) ? firebase.firestore.FieldValue.serverTimestamp() : new Date();
            }

            // --- MEGA Link Fields ---
            finalCourseData.megaTranscriptionsFolderLink = baseData.megaTranscriptionsFolderLink || null;
            finalCourseData.megaPdfFolderLink = baseData.megaPdfFolderLink || null;
            finalCourseData.megaMcqFolderLink = baseData.megaMcqFolderLink || null;
            finalCourseData.megaTextbookFullPdfLink = baseData.megaTextbookFullPdfLink || null;
            // --- End MEGA Link Fields ---
            // --- End Core Fields Init ---


            // --- CHAPTER TITLE & COUNT LOGIC (Refined from previous response) ---
            if (courseId !== FOP_COURSE_ID) { // Only for non-FoP courses
                let titlesFromMd = [];
                let mdDerivedChapterCount = 0;

                if (finalCourseData.courseDirName) {
                    const chapterDefMdContent = await fetchChapterDefinitionMarkdown(finalCourseData);
                    if (chapterDefMdContent) {
                        const parsedMdDetails = parseChaptersFromMarkdown(chapterDefMdContent);
                        const mdChapterNumbers = Object.keys(parsedMdDetails).map(Number).filter(n => n > 0);
                        if (mdChapterNumbers.length > 0) {
                            mdDerivedChapterCount = Math.max(...mdChapterNumbers);
                            for (let i = 1; i <= mdDerivedChapterCount; i++) {
                                titlesFromMd.push(parsedMdDetails[String(i)]?.title || `Chapter ${i}`);
                            }
                        }
                    }
                }

                let effectiveTotalChapters = finalCourseData.totalChapters;
                if (effectiveTotalChapters <= 0 && mdDerivedChapterCount > 0) {
                    effectiveTotalChapters = mdDerivedChapterCount;
                }
                finalCourseData.totalChapters = effectiveTotalChapters;

                if (finalCourseData.totalChapters > 0) {
                    if (titlesFromMd.length >= finalCourseData.totalChapters) {
                        finalCourseData.chapters = titlesFromMd.slice(0, finalCourseData.totalChapters);
                    } else {
                        finalCourseData.chapters = Array.from({ length: finalCourseData.totalChapters }, (_, i) => titlesFromMd[i] || `Chapter ${i + 1}`);
                    }
                } else {
                    finalCourseData.chapters = [];
                }
                 console.log(`[Course Load] Non-FoP "${finalCourseData.name}": TotalCh: ${finalCourseData.totalChapters}, Titles found/gen: ${finalCourseData.chapters.length}, MD titles: ${titlesFromMd.length}`);
            } else { // This is FoP (either from Firestore or new instance)
                 // Ensure FoP chapters are from FOP_COURSE_DEFINITION if it's a new instance or if Firestore data is minimal
                 if (isNewFoPInstance || finalCourseData.chapters.length === 0) {
                      finalCourseData.chapters = Array.isArray(FOP_COURSE_DEFINITION.chapters) ? [...FOP_COURSE_DEFINITION.chapters] : [];
                      finalCourseData.totalChapters = finalCourseData.chapters.length;
                      console.log(`[FoP Processing] Ensured FoP titles from config. Total Chapters: ${finalCourseData.totalChapters}`);
                 }
            }
            // --- END CHAPTER TITLE & COUNT LOGIC ---

            // If it was a new FoP instance, attempt to save it to Firestore
            if (isNewFoPInstance) {
                try {
                    await db.collection('courses').doc(FOP_COURSE_ID).set(finalCourseData, { merge: true });
                    console.log(`Successfully created FoP course ${FOP_COURSE_ID} in Firestore.`);
                    // Fetch it again to get server-resolved timestamps for the cache
                    const savedFoPDoc = await db.collection('courses').doc(FOP_COURSE_ID).get();
                    if (savedFoPDoc.exists) {
                        updateGlobalCourseData(FOP_COURSE_ID, { id: FOP_COURSE_ID, ...savedFoPDoc.data() });
                    } else { // Should not happen
                        console.error("FoP doc not found immediately after creation!");
                        updateGlobalCourseData(FOP_COURSE_ID, finalCourseData); // Use local with client time
                    }
                } catch (creationError) {
                    console.error(`Error creating FoP course ${FOP_COURSE_ID} in Firestore:`, creationError);
                    // If creation fails, still add the config version to the local map
                    if (!(finalCourseData.createdAt instanceof Date) && typeof finalCourseData.createdAt.toDate !== 'function') {
                       finalCourseData.createdAt = new Date(); // Ensure createdAt is a Date if it was a FieldValue
                    }
                    updateGlobalCourseData(FOP_COURSE_ID, finalCourseData);
                }
            } else {
                // For existing courses (or FoP that was already in Firestore), update the map
                updateGlobalCourseData(courseId, finalCourseData);
            }
            console.log(`Processed and cached course: "${finalCourseData.name}" (ID: ${courseId}), Chapters: ${finalCourseData.chapters.length}/${finalCourseData.totalChapters}`);
        } // End of for...of loop

    } catch (error) {
        console.error("CRITICAL Error during initial Firestore course fetch or main processing loop:", error);
        // Fallback for FoP if entire Firestore operation fails
        if (!globalCourseDataMap.has(FOP_COURSE_ID)) {
            // ... (your existing FoP fallback logic remains the same here) ...
            console.warn(`[CRITICAL FALLBACK] Global course load failed. Attempting to load FOP ${FOP_COURSE_ID} from local config.`);
            const fopDef = { ...FOP_COURSE_DEFINITION, id: FOP_COURSE_ID, status: 'approved' };
            fopDef.courseDirName = fopDef.courseDirName || cleanTextForFilename(fopDef.name) || FOP_COURSE_ID;
            fopDef.totalChapters = Number(fopDef.totalChapters) || (Array.isArray(fopDef.chapters) ? fopDef.chapters.length : 0);
            fopDef.chapters = Array.isArray(FOP_COURSE_DEFINITION.chapters) ? [...FOP_COURSE_DEFINITION.chapters] : Array.from({ length: fopDef.totalChapters }, (_, i) => `Chapter ${i + 1}`);
            // Ensure other fields
            fopDef.chapterResources = typeof fopDef.chapterResources === 'object' ? fopDef.chapterResources : {};
            fopDef.youtubePlaylistUrls = Array.isArray(fopDef.youtubePlaylistUrls) ? fopDef.youtubePlaylistUrls : (fopDef.youtubePlaylistUrl ? [fopDef.youtubePlaylistUrl] : []);
            fopDef.midcourseChapters = Array.isArray(fopDef.midcourseChapters) ? fopDef.midcourseChapters : [];
            fopDef.imageUrl = fopDef.imageUrl || null;
            fopDef.coverUrl = fopDef.coverUrl || null;
            fopDef.prerequisites = Array.isArray(fopDef.prerequisites) ? fopDef.prerequisites.filter(item => typeof item === 'string') : [];
            fopDef.corequisites = Array.isArray(fopDef.corequisites) ? fopDef.corequisites.filter(item => typeof item === 'string') : [];
            updateGlobalCourseData(FOP_COURSE_ID, fopDef);
        }
    }
    console.log(`Global course definitions loading complete. ${globalCourseDataMap.size} courses in map.`);
}
// --- MODIFICATION: Helper function to get default AI settings ---
function getDefaultAiSettings() {
    return {
        primaryModel: DEFAULT_PRIMARY_AI_MODEL,
        fallbackModel: DEFAULT_FALLBACK_AI_MODEL,
        customSystemPrompts: {}
    };
}

// --- MODIFICATION: Load User AI Settings ---
/**
 * Fetches the user's AI chat settings from Firestore.
 * If not found or invalid, returns default settings.
 * @param {string} userId - The user's unique ID.
 * @returns {Promise<object>} - The user's AI chat settings.
 */
export async function loadUserAiSettings(userId) {
    if (!db) {
        console.error("[loadUserAiSettings] Firestore DB not initialized.");
        return getDefaultAiSettings();
    }
    if (!userId) {
        console.error("[loadUserAiSettings] User ID is missing.");
        return getDefaultAiSettings();
    }

    const userRef = db.collection('users').doc(userId);
    try {
        const doc = await userRef.get();
        if (doc.exists) {
            const userData = doc.data();
            const storedSettings = userData.userAiChatSettings;

            if (storedSettings && typeof storedSettings === 'object') {
                // Merge with defaults to ensure all keys are present and have valid types
                const finalSettings = {
                    primaryModel: (typeof storedSettings.primaryModel === 'string' && storedSettings.primaryModel)
                        ? storedSettings.primaryModel
                        : DEFAULT_PRIMARY_AI_MODEL,
                    fallbackModel: (typeof storedSettings.fallbackModel === 'string' && storedSettings.fallbackModel)
                        ? storedSettings.fallbackModel
                        : DEFAULT_FALLBACK_AI_MODEL,
                    customSystemPrompts: (typeof storedSettings.customSystemPrompts === 'object' && storedSettings.customSystemPrompts !== null)
                        ? { ...storedSettings.customSystemPrompts } // Shallow copy to avoid modifying original from Firestore cache
                        : {}
                };
                console.log("[loadUserAiSettings] Loaded and merged user AI settings from Firestore:", finalSettings);
                return finalSettings;
            }
        }
        console.log("[loadUserAiSettings] No valid user AI settings found in Firestore for user", userId, "Returning defaults.");
        return getDefaultAiSettings();
    } catch (error) {
        console.error(`[loadUserAiSettings] Error loading AI settings for user ${userId}:`, error);
        return getDefaultAiSettings(); // Fallback to defaults on error
    }
}

// --- MODIFICATION: Save User AI Settings ---
/**
 * Saves the user's AI chat settings to Firestore.
 * @param {string} userId - The user's unique ID.
 * @param {object} settings - The AI chat settings object to save.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function saveUserAiSettings(userId, settings) {
    if (!db) {
        console.error("[saveUserAiSettings] Firestore DB not initialized.");
        return false;
    }
    if (!userId) {
        console.error("[saveUserAiSettings] User ID is missing.");
        return false;
    }
    if (!settings || typeof settings.primaryModel !== 'string' ||
        typeof settings.fallbackModel !== 'string' ||
        typeof settings.customSystemPrompts !== 'object' || settings.customSystemPrompts === null) {
        console.warn("[saveUserAiSettings] Attempted to save invalid AI settings structure. Aborting.", settings);
        return false;
    }

    const userRef = db.collection('users').doc(userId);
    try {
        await userRef.update({ userAiChatSettings: settings });
        console.log(`[saveUserAiSettings] User AI Chat Settings saved successfully for user ${userId}.`, settings);
        return true;
    } catch (error) {
        console.error(`[saveUserAiSettings] Error saving User AI Chat Settings for user ${userId}:`, error);
        let alertMessage = "Error saving AI settings: " + error.message;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = "Error saving AI settings: Permission Denied. Please check Firestore security rules or contact support. Details: " + error.message;
        }
        alert(alertMessage);
        return false;
    }
}

// --- START: Global AI Prompts Management ---
/**
 * Loads global AI system prompts from Firestore (settings/aiPrompts).
 * @returns {Promise<object>} - The global prompts object or an empty object if not found/error.
 */
export async function loadGlobalAiPrompts() {
    if (!db) {
        console.error("[loadGlobalAiPrompts] Firestore DB not initialized.");
        return {};
    }
    const promptsRef = db.collection(globalSettingsCollection).doc(aiPromptsDocId);
    try {
        const docSnap = await promptsRef.get();
        if (docSnap.exists) {
            const loadedPrompts = docSnap.data();
            // Validate structure: ensure it's an object
            if (typeof loadedPrompts === 'object' && loadedPrompts !== null) {
                 // Ensure all keys from AI_FUNCTION_KEYS exist, falling back to default if a key is missing
                const validatedPrompts = {};
                AI_FUNCTION_KEYS.forEach(key => {
                    if (loadedPrompts.hasOwnProperty(key) && typeof loadedPrompts[key] === 'string') {
                        validatedPrompts[key] = loadedPrompts[key];
                    } else {
                        // If a prompt is missing in DB or is not a string, it will effectively use the hardcoded default
                        // We don't store the default in validatedPrompts, rather let the getter logic handle it
                        // Or, we can store the default here if we want the DB to always be complete.
                        // For now, just ensure valid ones are passed.
                        // If loadedPrompts[key] is empty string, it's a valid custom "empty" prompt.
                        if (loadedPrompts.hasOwnProperty(key)) { // it exists but is not a string
                             console.warn(`[loadGlobalAiPrompts] Invalid type for prompt key '${key}'. Will effectively use default.`);
                        }
                    }
                });
                 // Add any prompts from DB that are not in AI_FUNCTION_KEYS (e.g. old/orphaned keys)
                 // Or better, only keep prompts that are in AI_FUNCTION_KEYS
                 const finalPrompts = {};
                 AI_FUNCTION_KEYS.forEach(key => {
                     if (loadedPrompts.hasOwnProperty(key) && typeof loadedPrompts[key] === 'string') {
                         finalPrompts[key] = loadedPrompts[key];
                     }
                 });

                console.log("[loadGlobalAiPrompts] Loaded global AI prompts from Firestore:", finalPrompts);
                return finalPrompts;
            } else {
                console.warn("[loadGlobalAiPrompts] 'settings/aiPrompts' document data is not a valid object. Returning empty.", loadedPrompts);
                return {};
            }
        }
        console.log("[loadGlobalAiPrompts] No 'settings/aiPrompts' document found. Returning empty object.");
        return {};
    } catch (error) {
        console.error("[loadGlobalAiPrompts] Error loading global AI prompts:", error);
        return {}; // Fallback to empty object on error
    }
}

/**
 * Saves the global AI system prompts to Firestore (settings/aiPrompts).
 * Requires the current user to be the Primary Admin.
 * @param {object} promptsObject - The complete object of global prompts to save.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function saveGlobalAiPrompts(promptsObject) {
    if (!db) {
        console.error("[saveGlobalAiPrompts] Firestore DB not initialized.");
        alert("Database error. Cannot save settings.");
        return false;
    }
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        console.error("[saveGlobalAiPrompts] Permission Denied: Only the Primary Admin can save global AI prompts.");
        alert("Permission Denied: Only the Primary Admin can save these settings.");
        return false;
    }
    if (!promptsObject || typeof promptsObject !== 'object') {
        console.error("[saveGlobalAiPrompts] Invalid promptsObject. Must be an object.", promptsObject);
        alert("Internal error: Invalid data format for prompts.");
        return false;
    }

    // Validate prompts: ensure all keys are from AI_FUNCTION_KEYS and values are strings
    const validPromptsToSave = {};
    let hasInvalidData = false;
    for (const key of AI_FUNCTION_KEYS) {
        if (promptsObject.hasOwnProperty(key)) {
            if (typeof promptsObject[key] === 'string') {
                validPromptsToSave[key] = promptsObject[key];
            } else {
                console.warn(`[saveGlobalAiPrompts] Invalid value for prompt key '${key}'. Expected string, got ${typeof promptsObject[key]}. Skipping this key.`);
                hasInvalidData = true;
                 // Optionally, fall back to default for this key if saving partial object
                 // validPromptsToSave[key] = DEFAULT_AI_SYSTEM_PROMPTS[key];
            }
        } else {
             // If a key from AI_FUNCTION_KEYS is missing in promptsObject, it means "use default".
             // We can either save it as empty string, or not save it and let the getter handle the default.
             // Saving it as empty string if user explicitly cleared it.
             // If it was never there, it should not be added with default, better to save only what admin provides.
             // For this implementation, if admin clears a textarea, it becomes empty string.
             // If a new AI_FUNCTION_KEY is added to config, it won't be in promptsObject until admin saves.
             // Let's save only keys explicitly present in promptsObject, if they are strings.
        }
    }

     // Alternative: strictly save only what is provided, and what is a valid key
     const strictlyValidPrompts = {};
     for (const key in promptsObject) {
         if (AI_FUNCTION_KEYS.includes(key) && typeof promptsObject[key] === 'string') {
             strictlyValidPrompts[key] = promptsObject[key];
         } else if (AI_FUNCTION_KEYS.includes(key) && typeof promptsObject[key] !== 'string') {
              console.warn(`[saveGlobalAiPrompts] Prompt for key '${key}' is not a string, using default value for saving an empty string to signify custom clear.`);
              strictlyValidPrompts[key] = ""; // Save as empty string if admin cleared it but it's not string (e.g. null)
         } else if (!AI_FUNCTION_KEYS.includes(key)){
              console.warn(`[saveGlobalAiPrompts] Prompt key '${key}' is not a recognized AI_FUNCTION_KEY. It will not be saved.`);
         }
     }


    if (hasInvalidData) {
        // Potentially alert user or handle more gracefully
        console.warn("[saveGlobalAiPrompts] Some provided prompt values were invalid and were skipped or defaulted.");
    }
    if (Object.keys(strictlyValidPrompts).length === 0 && AI_FUNCTION_KEYS.length > 0) {
        console.warn("[saveGlobalAiPrompts] Attempting to save an empty set of valid prompts. This will clear all global custom prompts.");
        // This is allowed, effectively resetting all to default.
    }


    const promptsRef = db.collection(globalSettingsCollection).doc(aiPromptsDocId);
    try {
        // Using set() will overwrite the document completely with strictlyValidPrompts.
        // This is desired behavior: if a prompt is removed from UI or cleared, it should be removed from DB.
        await promptsRef.set(strictlyValidPrompts);
        console.log("[saveGlobalAiPrompts] Global AI prompts saved successfully to Firestore:", strictlyValidPrompts);
        return true;
    } catch (error) {
        console.error("[saveGlobalAiPrompts] Error saving global AI prompts:", error);
        let alertMessage = "Error saving global AI prompts: " + error.message;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = "Error saving global AI prompts: Permission Denied. Please check Firestore security rules or contact support. Details: " + error.message;
        }
        alert(alertMessage);
        return false;
    }
}
// --- END: Global AI Prompts Management ---


/**
 * Loads the main user document (including appData) and triggers loading of course progress.
 * Handles initialization if the user document doesn't exist.
 * Syncs subject data with Markdown files.
 * @param {string} uid - The user's unique ID.
 */
export async function loadUserData(uid, authUserFromEvent = null) {
    if (!db) { console.error("Firestore DB not initialized"); return; }
    if (!uid) { console.error("loadUserData called without UID."); return; }

    console.log(`Loading user data (vGlobalSubjects_MIGRATION_AWARE) for user: ${uid}`);
    const userRef = db.collection('users').doc(uid);
    try {
        if (globalSubjectDefinitionsMap.size === 0) {
            await loadGlobalSubjectDefinitionsFromFirestore();
        }

        const userDoc = await userRef.get();
        let appDataWasModifiedBySyncOrRepairOrMigration = false;

        if (userDoc.exists) {
            const userDataFromFirestore = userDoc.data();

            // --- START: Modification to load and merge experimentalFeatures ---
            const defaultExpFeatures = { ...DEFAULT_EXPERIMENTAL_FEATURES };
            const userExpFeatures = (userDataFromFirestore.userSettings && typeof userDataFromFirestore.userSettings.experimentalFeatures === 'object')
                ? { ...defaultExpFeatures, ...userDataFromFirestore.userSettings.experimentalFeatures }
                : defaultExpFeatures;

            const userProfileForState = {
                uid: uid,
                email: userDataFromFirestore.email || authUserFromEvent?.email,
                displayName: userDataFromFirestore.displayName || authUserFromEvent?.displayName,
                photoURL: userDataFromFirestore.photoURL || authUserFromEvent?.photoURL,
                username: userDataFromFirestore.username || null,
                isAdmin: userDataFromFirestore.isAdmin !== undefined ? (uid === ADMIN_UID || userDataFromFirestore.isAdmin) : (uid === ADMIN_UID),
                credits: userDataFromFirestore.credits !== undefined ? Number(userDataFromFirestore.credits) : 0,
                onboardingComplete: userDataFromFirestore.onboardingComplete !== undefined ? userDataFromFirestore.onboardingComplete : false,
                userSettings: { // Ensure userSettings structure exists in state
                    ...(userDataFromFirestore.userSettings || {}),
                    experimentalFeatures: userExpFeatures
                }
            };
            // --- END: Modification ---
            setCurrentUser(userProfileForState);
            try {
                const aiSettings = await loadUserAiSettings(uid);
                setUserAiChatSettings(aiSettings);
            } catch (error) { setUserAiChatSettings(getDefaultAiSettings()); }

            let userSubjectProgressData = userDataFromFirestore.appData?.subjectProgress || {};
            const oldUserSubjectsData = userDataFromFirestore.appData?.subjects;

            if (typeof oldUserSubjectsData === 'object' && Object.keys(oldUserSubjectsData).length > 0 &&
                (!userDataFromFirestore.appData.subjectProgress || Object.keys(userDataFromFirestore.appData.subjectProgress).length === 0)) {
                console.warn(`[Migration] User ${uid} has old appData.subjects. Attempting to migrate to appData.subjectProgress.`);
                userSubjectProgressData = {};
                for (const oldSubjectId in oldUserSubjectsData) {
                    const oldSubject = oldUserSubjectsData[oldSubjectId];
                    let correspondingGlobalId = oldSubjectId;
                    if (!globalSubjectDefinitionsMap.has(oldSubjectId)) {
                        const foundByName = Array.from(globalSubjectDefinitionsMap.values()).find(gDef => gDef.name === oldSubject.name);
                        if (foundByName) correspondingGlobalId = foundByName.id;
                        else {
                             console.log(`[Migration] Old subject "${oldSubject.name}" (ID ${oldSubjectId}) not found in global definitions. Its progress cannot be directly migrated.`);
                             continue;
                        }
                    }

                    userSubjectProgressData[correspondingGlobalId] = {
                        studied_chapters: oldSubject.studied_chapters || [],
                        pending_exams: oldSubject.pending_exams || [],
                        chapters: {}
                    };
                    if (oldSubject.chapters) {
                        for (const chapNum in oldSubject.chapters) {
                            const oldChap = oldSubject.chapters[chapNum];
                            userSubjectProgressData[correspondingGlobalId].chapters[chapNum] = {
                                total_attempted: oldChap.total_attempted || 0,
                                total_wrong: oldChap.total_wrong || 0,
                                available_questions: oldChap.available_questions || [],
                                mistake_history: oldChap.mistake_history || [],
                                consecutive_mastery: oldChap.consecutive_mastery || 0
                            };
                        }
                    }
                }
                appDataWasModifiedBySyncOrRepairOrMigration = true;
                console.log(`[Migration] Migrated ${Object.keys(userSubjectProgressData).length} subjects to new progress structure for user ${uid}.`);
            }


            const mergedSubjects = {};
            for (const [subjectId, globalDef] of globalSubjectDefinitionsMap.entries()) {
                 const userProgressForThisSubject = userSubjectProgressData[subjectId] || getDefaultSubjectProgressStats();
                 let currentMergedSubject = { ...globalDef, ...userProgressForThisSubject, chapters: {} };
                 currentMergedSubject.studied_chapters = Array.isArray(currentMergedSubject.studied_chapters) ? currentMergedSubject.studied_chapters : [];
                 currentMergedSubject.pending_exams = Array.isArray(currentMergedSubject.pending_exams) ? currentMergedSubject.pending_exams.map(exam => ({ ...exam, id: exam.id || `pending_${Date.now()}` })) : [];

                if (currentUser && (currentUser.isAdmin || globalDef.status === 'approved')) {
                    const subjectMarkdown = await fetchMarkdownForGlobalSubject(globalDef);
                    if (subjectMarkdown !== null) {
                        const parsedMdChapters = parseChaptersFromMarkdown(subjectMarkdown);
                        for (const chapNumStr in parsedMdChapters) {
                            const mdChapData = parsedMdChapters[chapNumStr];
                            const userChapProgress = userProgressForThisSubject.chapters?.[chapNumStr] || {};
                            const totalMcqsFromMd = mdChapData.total_questions || 0;
                            let finalAvailableQuestions;

                            if (Array.isArray(userChapProgress.available_questions)) {
                                finalAvailableQuestions = userChapProgress.available_questions.filter(qN =>
                                    typeof qN === 'number' && qN > 0 && qN <= totalMcqsFromMd
                                ).sort((a, b) => a - b);
                                if (JSON.stringify(userChapProgress.available_questions.slice().sort((a,b)=>a-b)) !== JSON.stringify(finalAvailableQuestions)) {
                                    appDataWasModifiedBySyncOrRepairOrMigration = true;
                                }
                            } else {
                                finalAvailableQuestions = Array.from({ length: totalMcqsFromMd }, (_, j) => j + 1);
                                if (totalMcqsFromMd > 0) appDataWasModifiedBySyncOrRepairOrMigration = true;
                            }

                            currentMergedSubject.chapters[chapNumStr] = {
                                title: mdChapData.title || `Chapter ${chapNumStr}`,
                                total_questions: totalMcqsFromMd,
                                total_attempted: userChapProgress.total_attempted || 0,
                                total_wrong: userChapProgress.total_wrong || 0,
                                mistake_history: Array.isArray(userChapProgress.mistake_history) ? userChapProgress.mistake_history : [],
                                consecutive_mastery: userChapProgress.consecutive_mastery || 0,
                                available_questions: finalAvailableQuestions
                            };
                        }
                    } else {
                        console.warn(`MD file missing for Subject ${globalDef.name} (ID: ${subjectId}). Using existing user chapter progress if any.`);
                        currentMergedSubject.chapters = userProgressForThisSubject.chapters || {};
                    }
                } else {
                    console.log(`Skipping MD sync for Subject ${globalDef.name} (ID: ${subjectId}) due to status '${globalDef.status}'.`);
                    currentMergedSubject.chapters = userProgressForThisSubject.chapters || {};
                }
                for(const chapNumStr in currentMergedSubject.chapters) {
                    const chap = currentMergedSubject.chapters[chapNumStr];
                    chap.title = chap.title || `Chapter ${chapNumStr}`;
                    chap.total_questions = chap.total_questions || 0;
                    chap.total_attempted = chap.total_attempted || 0;
                    chap.total_wrong = chap.total_wrong || 0;
                    chap.mistake_history = Array.isArray(chap.mistake_history) ? chap.mistake_history : [];
                    chap.consecutive_mastery = chap.consecutive_mastery || 0;
                    chap.available_questions = Array.isArray(chap.available_questions) ? chap.available_questions : Array.from({ length: chap.total_questions }, (_, j) => j + 1);
                }
                mergedSubjects[subjectId] = currentMergedSubject;
            }
            setData({ subjects: mergedSubjects });

            if (appDataWasModifiedBySyncOrRepairOrMigration) {
                console.log("Saving appData (subjectProgress) after MD sync/repair/migration during loadUserData...");
                const appDataToSaveToFirestore = { subjectProgress: {} };
                for (const subjId in mergedSubjects) {
                    const mergedSubj = mergedSubjects[subjId];
                    appDataToSaveToFirestore.subjectProgress[subjId] = {
                        studied_chapters: mergedSubj.studied_chapters,
                        pending_exams: mergedSubj.pending_exams,
                        chapters: {}
                    };
                    for (const chapNum in mergedSubj.chapters) {
                        const mergedChap = mergedSubj.chapters[chapNum];
                        appDataToSaveToFirestore.subjectProgress[subjId].chapters[chapNum] = {
                            total_attempted: mergedChap.total_attempted,
                            total_wrong: mergedChap.total_wrong,
                            available_questions: mergedChap.available_questions,
                            mistake_history: mergedChap.mistake_history,
                            consecutive_mastery: mergedChap.consecutive_mastery
                        };
                    }
                }
                await userRef.update({
                    appData: appDataToSaveToFirestore,
                    lastAppDataUpdate: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log("Updated appData in Firestore with new subjectProgress structure.");
            }

            if (data && data.subjects) {
                const subjectKeys = Object.keys(data.subjects);
                let subjectToSelectId = null;
                if (currentSubject && data.subjects[currentSubject.id] && data.subjects[currentSubject.id].status === 'approved') {
                     subjectToSelectId = currentSubject.id;
                 } else if (userDataFromFirestore.lastSelectedSubjectId && data.subjects[userDataFromFirestore.lastSelectedSubjectId] && data.subjects[userDataFromFirestore.lastSelectedSubjectId].status === 'approved') {
                     subjectToSelectId = userDataFromFirestore.lastSelectedSubjectId;
                 } else {
                     subjectToSelectId = subjectKeys.find(key => data.subjects[key].status === 'approved') || null;
                 }
                setCurrentSubject(subjectToSelectId ? data.subjects[subjectToSelectId] : null);
                updateSubjectInfo();
                if (subjectToSelectId && subjectToSelectId !== userDataFromFirestore.lastSelectedSubjectId) {
                     await userRef.update({ lastSelectedSubjectId: subjectToSelectId }).catch(e => console.error("Error saving lastSelectedSubjectId:", e));
                }
            } else {
                setCurrentSubject(null);
                updateSubjectInfo();
            }

            await loadAllUserCourseProgress(uid);
            await checkOnboarding(uid);

        } else {
            console.log("User document not found for UID:", uid, "- Initializing data.");
            const authUserToUseForInit = authUserFromEvent || firebaseAuth?.currentUser;

            if (!authUserToUseForInit) {
                console.error(`[loadUserData] CRITICAL: authUserFromEvent/firebaseAuth.currentUser is null when trying to initialize new user ${uid}. This indicates an auth state issue or incorrect call stack.`);
                throw new Error("Authentication session invalid. Cannot initialize new user data for non-existent document.");
            }
            await initializeUserData(
                uid,
                authUserToUseForInit.email, 
                (authUserToUseForInit.displayName || authUserToUseForInit.email?.split('@')[0] || `user_${uid.substring(0,6)}`), 
                authUserToUseForInit.displayName,
                authUserToUseForInit.photoURL,
                false,
                authUserToUseForInit 
            );
            await loadUserData(uid, authUserToUseForInit); 
            return;
        }
    } catch (error) {
        console.error("Error in loadUserData (vGlobalSubjects_MIGRATION_AWARE):", error);
        throw error;
    }
}



/**
 * Reloads user data after a change (e.g., username update, admin status toggle).
 * Updates state and UI accordingly.
 * @param {string} uid - The user's unique ID.
 * @returns {Promise<void>}
 */
export async function reloadUserDataAfterChange(uid) {
    if (!db) {
        console.error("Firestore DB not initialized");
        return;
    }
    if (!uid) {
        console.error("reloadUserDataAfterChange called without UID.");
        return;
    }

    try {
        console.log(`Reloading user data for UID: ${uid}`);
        
        await loadUserData(uid); // This will re-fetch appData and core user profile fields including userSettings
        
        const aiSettings = await loadUserAiSettings(uid); // Reload AI Chat specific settings
        setUserAiChatSettings(aiSettings);
        console.log(`[reloadUserDataAfterChange] Reloaded AI settings for UID: ${uid}`, aiSettings);
        
        // currentUser state should have been updated by loadUserData via setCurrentUser
        // which now handles merging experimental features correctly.

        await loadAllUserCourseProgress(uid); // Reload course progress
        
        await fetchAndUpdateUserInfo(); // Update top-bar UI
        console.log(`[reloadUserDataAfterChange] UI updated for UID: ${uid}`);

        // Update experimental feature visibility in sidebar
        if (typeof window.updateExperimentalFeaturesSidebarVisibility === 'function') {
            window.updateExperimentalFeaturesSidebarVisibility();
        }

    } catch (error) {
        console.error(`[reloadUserDataAfterChange] Error reloading user data for UID: ${uid}:`, error);
        alert(`Failed to reload user data: ${error.message}`);
    }
}

// --- MODIFIED FUNCTION ---
export async function initializeUserData(uid, emailParam, usernameParam, displayNameParam = null, photoURLParam = null, forceReset = false, authUserObjectForFallback = null) {
    if (!db || !firebaseAuth) {
        console.error("Firestore DB or Auth not initialized");
        throw new Error("Firestore DB or Auth not initialized.");
    }

    if (!uid || typeof uid !== 'string' || uid.trim() === '') {
        console.error("[initializeUserData] CRITICAL: UID parameter is missing or invalid. Cannot proceed.");
        throw new Error("User ID is invalid. Cannot initialize user data.");
    }
    if (!emailParam || typeof emailParam !== 'string' || !emailParam.includes('@')) {
        console.error(`[initializeUserData] CRITICAL: Email parameter is missing or invalid for UID ${uid}. Email received: ${emailParam}. Cannot proceed.`);
        throw new Error("A valid email is required to initialize user data.");
    }
    if (!usernameParam || typeof usernameParam !== 'string' || usernameParam.trim().length < 3) {
        console.error(`[initializeUserData] CRITICAL: Username parameter is missing or invalid for UID ${uid}. Username received: ${usernameParam}. Cannot proceed.`);
        throw new Error("A valid username (min 3 chars) is required to initialize user data.");
    }

    const userRef = db.collection('users').doc(uid);
    let docExists = false;
    let existingUserData = null;

    if (!forceReset) {
        try {
            const doc = await userRef.get();
            docExists = doc.exists;
            if (docExists) existingUserData = doc.data();
        } catch (e) { console.error("Error checking user existence:", e); }
    }

    const usernameLower = usernameParam.toLowerCase();
    const initialIsAdmin = (uid === ADMIN_UID);

    const finalDisplayName = (forceReset && existingUserData?.displayName) ? existingUserData.displayName
                           : (displayNameParam || authUserObjectForFallback?.displayName || (emailParam ? emailParam.split('@')[0] : `User ${uid.substring(0,4)}`));
    const finalPhotoURL = (forceReset && existingUserData?.photoURL) ? existingUserData.photoURL
                        : (photoURLParam || authUserObjectForFallback?.photoURL || DEFAULT_PROFILE_PIC_URL);
    const finalEmail = emailParam;

    if (docExists && !forceReset) {
        let updatesNeeded = {};
        if (existingUserData.username === undefined && usernameLower) { updatesNeeded.username = usernameLower; }
        if (existingUserData.displayName === undefined) { updatesNeeded.displayName = finalDisplayName; }
        if (existingUserData.onboardingComplete === undefined) { updatesNeeded.onboardingComplete = false; }
        if (existingUserData.photoURL === undefined) { updatesNeeded.photoURL = finalPhotoURL; }
        if (existingUserData.completedCourseBadges === undefined) { updatesNeeded.completedCourseBadges = []; }
        if (existingUserData.userNotes === undefined) { updatesNeeded.userNotes = {}; }
        if (existingUserData.isAdmin === undefined) { updatesNeeded.isAdmin = initialIsAdmin; }
        if (existingUserData.credits === undefined) { updatesNeeded.credits = 0; }

        // --- START: Modification for userSettings and experimentalFeatures ---
        if (existingUserData.userSettings === undefined) {
            updatesNeeded.userSettings = { experimentalFeatures: { ...DEFAULT_EXPERIMENTAL_FEATURES } };
            console.log(`[initializeUserData] User ${uid} exists but userSettings missing. Initializing it.`);
        } else if (existingUserData.userSettings.experimentalFeatures === undefined) {
            updatesNeeded['userSettings.experimentalFeatures'] = { ...DEFAULT_EXPERIMENTAL_FEATURES };
            console.log(`[initializeUserData] User ${uid} exists, userSettings exists, but experimentalFeatures missing. Initializing experimentalFeatures.`);
        } else { // Merge if experimentalFeatures object exists but might be missing some keys
            const currentExp = existingUserData.userSettings.experimentalFeatures;
            const mergedExp = { ...DEFAULT_EXPERIMENTAL_FEATURES, ...currentExp };
            if (JSON.stringify(currentExp) !== JSON.stringify(mergedExp)) {
                updatesNeeded['userSettings.experimentalFeatures'] = mergedExp;
                console.log(`[initializeUserData] User ${uid} experimentalFeatures merged with defaults.`);
            }
        }
        // --- END: Modification ---

        if (existingUserData.userAiChatSettings === undefined) { updatesNeeded.userAiChatSettings = getDefaultAiSettings(); }
        if (existingUserData.email === undefined && finalEmail) { updatesNeeded.email = finalEmail; }

        if (!existingUserData.appData) {
            updatesNeeded.appData = { subjectProgress: {} };
            console.log(`[initializeUserData] User ${uid} exists but appData missing. Initializing it.`);
        } else if (existingUserData.appData.subjectProgress === undefined) {
            updatesNeeded['appData.subjectProgress'] = {};
            console.log(`[initializeUserData] User ${uid} exists, appData exists, but appData.subjectProgress missing. Initializing subjectProgress.`);
        }

        if (Object.keys(updatesNeeded).length > 0) {
            console.log(`[initializeUserData] Updating missing top-level fields for existing user ${uid}:`, Object.keys(updatesNeeded));
            try {
                await userRef.update(updatesNeeded);
                if (updatesNeeded.username) {
                    const usernameToReserve = updatesNeeded.username;
                    const usernameResRef = db.collection('usernames').doc(usernameToReserve);
                    const usernameResDoc = await usernameResRef.get();
                    if (!usernameResDoc.exists) await usernameResRef.set({ userId: uid, username: usernameToReserve });
                    else if (usernameResDoc.data().userId !== uid) console.warn(`Username ${usernameToReserve} taken during update for ${uid}.`);
                }
            } catch (updateError) {
                console.error("[initializeUserData] Error updating existing user's missing fields:", updateError);
            }
        } else {
            console.log(`[initializeUserData] User data already exists and essential top-level fields are present for ${uid}.`);
        }
        return;
    }

    console.log(`[initializeUserData] Full Init/Force Reset for user: ${uid}. Username: ${usernameLower}. Email for doc: ${finalEmail}`);
    const defaultAppDataForNewUser = { subjectProgress: {} };

    // --- START: Modification for userSettings on new user ---
    const dataToSet = {
        email: finalEmail,
        username: usernameLower,
        displayName: finalDisplayName,
        photoURL: finalPhotoURL,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        onboardingComplete: (forceReset && existingUserData?.onboardingComplete !== undefined) ? existingUserData.onboardingComplete : false,
        appData: defaultAppDataForNewUser,
        completedCourseBadges: (forceReset && existingUserData?.completedCourseBadges) ? existingUserData.completedCourseBadges : [],
        userNotes: (forceReset && existingUserData?.userNotes) ? existingUserData.userNotes : {},
        isAdmin: (forceReset && typeof existingUserData?.isAdmin === 'boolean') ? existingUserData.isAdmin : initialIsAdmin,
        credits: (forceReset && typeof existingUserData?.credits === 'number') ? existingUserData.credits : 0,
        userAiChatSettings: (forceReset && existingUserData?.userAiChatSettings) ? existingUserData.userAiChatSettings : getDefaultAiSettings(),
        userSettings: (forceReset && existingUserData?.userSettings)
            ? { ...existingUserData.userSettings, experimentalFeatures: { ...DEFAULT_EXPERIMENTAL_FEATURES, ...(existingUserData.userSettings.experimentalFeatures || {}) } }
            : { experimentalFeatures: { ...DEFAULT_EXPERIMENTAL_FEATURES } }
    };
    // --- END: Modification ---

    try {
        await userRef.set(dataToSet);
        console.log(`[initializeUserData] User document successfully CREATED/FORCED_RESET for ${uid}`);
        setData({ subjects: {} });
        setUserAiChatSettings(dataToSet.userAiChatSettings);

        if (forceReset) {
             setUserCourseProgressMap(new Map());
            console.warn("Force reset executed. User course progress subcollection needs manual clearing if desired.");
            setCurrentSubject(null);
            updateSubjectInfo();
        }
        if (usernameLower) {
            const usernameRef = db.collection('usernames').doc(usernameLower);
            await usernameRef.set({ userId: uid, username: usernameLower });
            console.log(`[initializeUserData] Username '${usernameLower}' reserved/updated for ${uid}.`);
        }
    } catch (error) {
        console.error(`[initializeUserData] Error setting user data for ${uid} (Create/Force Reset):`, error);
        try {
            const dataAttemptedLog = JSON.stringify(dataToSet, (key, value) =>
                (value && value._methodName === 'FieldValue.serverTimestamp') ? "{SERVER_TIMESTAMP}" : value, 2);
            console.error(`Data attempted for set: ${dataAttemptedLog}`);
        } catch (e) { console.error("Could not stringify dataToSet for logging."); }
        throw error;
    }
}





// --- Onboarding Check ---
export async function checkOnboarding(uid) {
     if (!db) { console.error("Firestore DB not initialized"); return; }
    if (!uid) { return; }
    console.log("Checking onboarding status...");
    const userRef = db.collection('users').doc(uid);
    try {
        const doc = await userRef.get();
        if (doc.exists && doc.data().onboardingComplete === false) {
            console.log("User needs onboarding.");
            showOnboardingUI();
        } else if (doc.exists) {
            console.log("Onboarding complete or not applicable.");
        } else { console.warn("User doc not found during onboarding check."); }
    } catch (error) { 
        console.error("Error checking onboarding status:", error); 
        let alertMessage = "Error checking user setup: " + error.message;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = "Error checking user setup: Permission Denied. Please check Firestore security rules or contact support. Details: " + error.message;
        }
        alert(alertMessage);
    }
}

// --- Feedback Management ---
export async function submitFeedback(feedbackData, user) {
    if (!db || !user) { console.error("Cannot submit feedback: DB/User missing."); alert("Error: User not identified."); return false; }
    if (!feedbackData.feedbackText) { console.error("Feedback text missing."); alert("Error: Feedback text cannot be empty."); return false; }
    const collectionName = feedbackData.context?.toLowerCase().includes('exam issue report') ? 'examIssues' : 'feedback';
    const feedbackRef = db.collection(collectionName).doc();
    try {
        await feedbackRef.set({ subjectId: feedbackData.subjectId || 'N/A', questionId: feedbackData.questionId || 'N/A', feedbackText: feedbackData.feedbackText, context: feedbackData.context || null, userId: user.uid, username: user.displayName || user.email, timestamp: firebase.firestore.FieldValue.serverTimestamp(), status: 'new' });
        console.log(`Feedback/Issue submitted successfully to ${collectionName}:`, feedbackRef.id); return true;
    } catch (error) { 
        console.error(`Error submitting to ${collectionName}:`, error); 
        let alertMessage = `Failed to submit: ${error.message}`;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = `Failed to submit: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
        }
        alert(alertMessage);
        return false; 
    }
}

// --- Inbox/Messaging ---
export async function sendAdminReply(recipientUid, subject, body, adminUser) {
     if (!db || !adminUser || !adminUser.isAdmin) { 
         console.error("Unauthorized admin reply. Admin privileges required.");
         alert("Error: Admin privileges required.");
         return false;
     }
     if (!recipientUid || !subject || !body) { console.error("Missing data for reply."); alert("Error: Missing info for reply."); return false; }
     const messageRef = db.collection('users').doc(recipientUid).collection('inbox').doc();
     try {
         await messageRef.set({ senderId: adminUser.uid, senderName: "Admin", timestamp: firebase.firestore.FieldValue.serverTimestamp(), subject: subject, body: body, isRead: false });
         console.log(`Admin reply sent to user ${recipientUid}.`); return true;
     } catch (error) { 
         console.error("Error sending admin reply:", error); 
         let alertMessage = "Failed to send reply: " + error.message;
         if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = "Failed to send reply: Permission Denied. Please check Firestore security rules or contact support. Details: " + error.message;
         }
         alert(alertMessage);
         return false; 
     }
}
export async function markMessageAsRead(messageId, user) {
      if (!db || !user || !messageId) { console.error("Cannot mark message read: Data missing."); return false; }
      const messageRef = db.collection('users').doc(user.uid).collection('inbox').doc(messageId);
      try { await messageRef.update({ isRead: true }); console.log(`Message ${messageId} marked read.`); return true; }
      catch (error) { console.error(`Error marking message ${messageId} read:`, error); return false; }
}

export async function sendWelcomeGuideMessage(userId) {
    if (!db) {
        console.error("Firestore DB not initialized. Cannot send welcome message.");
        return false;
    }
    if (!userId) {
        console.error("User ID is missing. Cannot send welcome message.");
        return false;
    }
    const guideUrl = `${window.location.origin}${window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'))}/assets/documents/guide.pdf`;
    const subject = "Welcome to Lyceum! Quick Start Guide";
    const body = `
        <p>Hello and welcome to Lyceum!</p>
        <p>We're excited to have you on board. To help you get started and make the most out of our platform, please check out our Quick Start Guide:</p>
        <p><a href="${guideUrl}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: underline;">View Lyceum Quick Start Guide (PDF)</a></p>
        <p>This guide covers:</p>
        <ul>
            <li>Navigating the dashboard</li>
            <li>Setting up your subjects</li>
            <li>Generating your first test</li>
            <li>Exploring courses and AI tools</li>
            <li>And much more!</li>
        </ul>
        <p>If you have any questions, don't hesitate to reach out to support or ask in the Global Chat.</p>
        <p>Happy learning!</p>
        <p>The Lyceum Team</p>
    `;
    const messageData = {
        senderId: 'system',
        senderName: 'Lyceum Guide',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        subject: subject,
        body: body,
        isRead: false
    };
    try {
        await db.collection('users').doc(userId).collection('inbox').add(messageData);
        console.log(`Welcome guide message sent to user ${userId}.`);
        return true;
    } catch (error) {
        console.error(`Error sending welcome guide message to user ${userId}:`, error);
        return false;
    }
}


// --- Admin Function to Update Course Definition ---
export async function updateCourseDefinition(courseId, updates) {
     if (!db || !currentUser || !currentUser.isAdmin) { 
         console.error("Permission denied: Admin privileges required.");
         alert("Permission denied. Admin required.");
         return false;
     }
      if (!courseId || !updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
         console.error("Invalid arguments for updateCourseDefinition.");
         alert("Internal Error: Invalid data provided for course update.");
         return false;
     }
     const courseRef = db.collection('courses').doc(courseId);
     console.log(`Admin attempting to update/set course ${courseId} with:`, updates);
     try {
         if (updates.prerequisites !== undefined) {
             if (!Array.isArray(updates.prerequisites)) {
                 console.warn("Correcting prerequisites to empty array in update because it wasn't an array.");
                 updates.prerequisites = [];
             } else {
                 updates.prerequisites = updates.prerequisites
                                            .filter(tag => typeof tag === 'string')
                                            .map(tag => tag.trim())
                                            .filter(tag => tag);
                 console.log(`Cleaned prerequisites:`, updates.prerequisites);
             }
         }
         if (updates.corequisites !== undefined) {
              if (!Array.isArray(updates.corequisites)) {
                   console.warn("Correcting corequisites to empty array in update because it wasn't an array.");
                   updates.corequisites = [];
              } else {
                  updates.corequisites = updates.corequisites
                                            .filter(tag => typeof tag === 'string')
                                            .map(tag => tag.trim())
                                            .filter(tag => tag);
                   console.log(`Cleaned corequisites:`, updates.corequisites);
              }
         }

         await courseRef.set(updates, { merge: true });
         console.log(`Course definition for ${courseId} updated/created successfully.`);

         const updatedDoc = await courseRef.get();
         if (updatedDoc.exists) {
             const currentData = globalCourseDataMap.get(courseId) || {};
             const updatedDataFromFS = { id: courseId, ...updatedDoc.data() };
             const mergedData = { ...currentData, ...updatedDataFromFS }; 
             if (updatedDataFromFS.chapterResources && updates.chapterResources) {
                 mergedData.chapterResources = { ...(currentData.chapterResources || {}) }; 
                 for (const chapNum in updates.chapterResources) {
                     mergedData.chapterResources[chapNum] = {
                         ...(currentData.chapterResources?.[chapNum] || {}), 
                         ...(updates.chapterResources[chapNum]) 
                     };
                 }
             } else if (updatedDataFromFS.chapterResources) {
                 mergedData.chapterResources = updatedDataFromFS.chapterResources;
             } else if (updates.chapterResources) {
                 mergedData.chapterResources = updates.chapterResources;
             }

             mergedData.youtubePlaylistUrls = Array.isArray(updatedDataFromFS.youtubePlaylistUrls) ? updatedDataFromFS.youtubePlaylistUrls : [];
             mergedData.chapters = Array.isArray(updatedDataFromFS.chapters) ? updatedDataFromFS.chapters : [];
             mergedData.midcourseChapters = Array.isArray(updatedDataFromFS.midcourseChapters) ? updatedDataFromFS.midcourseChapters : [];
             mergedData.totalChapters = Number(updatedDataFromFS.totalChapters) || (Array.isArray(mergedData.chapters) ? mergedData.chapters.length : 0);
             mergedData.imageUrl = updatedDataFromFS.imageUrl || null;
             mergedData.coverUrl = updatedDataFromFS.coverUrl || null;
             mergedData.prerequisites = Array.isArray(updatedDataFromFS.prerequisites)
                                        ? updatedDataFromFS.prerequisites.filter(item => typeof item === 'string')
                                        : [];
             mergedData.corequisites = Array.isArray(updatedDataFromFS.corequisites)
                                       ? updatedDataFromFS.corequisites.filter(item => typeof item === 'string')
                                       : [];

             // --- MEGA Link Fields for local cache update ---
             mergedData.megaTranscriptionsFolderLink = updatedDataFromFS.megaTranscriptionsFolderLink || null;
             mergedData.megaPdfFolderLink = updatedDataFromFS.megaPdfFolderLink || null;
             mergedData.megaMcqFolderLink = updatedDataFromFS.megaMcqFolderLink || null;
             mergedData.megaTextbookFullPdfLink = updatedDataFromFS.megaTextbookFullPdfLink || null;
             // --- End MEGA Link Fields ---

             updateGlobalCourseData(courseId, mergedData); 
             console.log("Local course definition map updated after Firestore save.");
         } else {
              console.warn(`Course ${courseId} not found after update/set operation. Local cache might be stale.`);
              globalCourseDataMap.delete(courseId); 
         }
         return true;
     } catch (error) {
         console.error(`Error updating/setting course definition for ${courseId}:`, error);
         let alertMessage = `Failed to update course: ${error.message}`;
         if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = `Failed to update course: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
         }
         alert(alertMessage);
         return false;
     }
}

export async function addCourseToFirestore(courseData) {
    if (!currentUser) return { success: false, message: "User not logged in." };

    const isAdminUser = currentUser.isAdmin; 

    const finalStatus = isAdminUser ? 'approved' : 'pending';

    let courseDirName = courseData.courseDirName ? cleanTextForFilename(courseData.courseDirName)
                       : cleanTextForFilename(courseData.name);
    if (!courseDirName) {
        courseDirName = `course_${Date.now()}`;
        console.warn("Could not generate valid courseDirName from name, using timestamp fallback:", courseDirName);
    }

    let dataToSet = {
        name: courseData.name || 'Untitled Course',
        description: courseData.description || null,
        majorTag: courseData.majorTag || null,
        subjectTag: courseData.subjectTag || null,
        youtubePlaylistUrls: courseData.youtubePlaylistUrls || [],
        creatorUid: currentUser.uid,
        creatorName: currentUser.displayName || currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: finalStatus,
        reportedBy: [],
        reportReason: null,
        chapterResources: {},
        imageUrl: courseData.imageUrl || null,
        coverUrl: courseData.coverUrl || null,
        courseDirName: courseDirName,
        prerequisites: Array.isArray(courseData.prerequisites)
                       ? courseData.prerequisites.filter(item => typeof item === 'string' && item.trim()) 
                       : [],
        corequisites: Array.isArray(courseData.corequisites)
                      ? courseData.corequisites.filter(item => typeof item === 'string' && item.trim()) 
                      : [],
        // --- MEGA Link Fields ---
        megaTranscriptionsFolderLink: null,
        megaPdfFolderLink: null,
        megaMcqFolderLink: null,
        megaTextbookFullPdfLink: null,
        // --- End MEGA Link Fields ---
    };

    let finalTotalChapters = 0;
    let finalChapters = [];
    let finalRelatedSubjectId = null;

    if (isAdminUser) { 
        finalTotalChapters = parseInt(courseData.totalChapters) || 0;
        if (isNaN(finalTotalChapters) || finalTotalChapters < 0) finalTotalChapters = 0;
        finalChapters = finalTotalChapters > 0
            ? Array.from({ length: finalTotalChapters }, (_, i) => `Chapter ${i + 1}`)
            : [];
        finalRelatedSubjectId = courseData.relatedSubjectId || null;
    } else {
        finalTotalChapters = 0;
        finalChapters = [];
        finalRelatedSubjectId = null;
    }

    dataToSet.totalChapters = finalTotalChapters;
    dataToSet.chapters = finalChapters;
    dataToSet.relatedSubjectId = finalRelatedSubjectId;

    try {
        const docRef = await db.collection('courses').add(dataToSet);
        const savedData = { ...dataToSet, id: docRef.id };
        delete savedData.createdAt; 
        savedData.createdAt = new Date(); 

        savedData.prerequisites = Array.isArray(savedData.prerequisites) ? savedData.prerequisites : [];
        savedData.corequisites = Array.isArray(savedData.corequisites) ? savedData.corequisites : [];

        updateGlobalCourseData(docRef.id, savedData);

        if (finalStatus === 'pending' && !isAdminUser) {
            await updateUserCredits(currentUser.uid, 50, `Suggested Course: ${savedData.name.substring(0, 50)}`);
        }

        return { success: true, id: docRef.id, status: finalStatus };
    } catch (error) {
        console.error("Error adding course:", error);
        // Note: This function returns a message, it does not directly alert. 
        // If an alert is desired here, it would need to be added based on the success flag in the calling code.
        // For now, adhering to "alerts are generated on error" in *this* file.
        let message = error.message;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            message = `Failed to add course: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
        }
        return { success: false, message: message };
    }
}


// --- Mark Chapter Studied in Course ---
export async function markChapterStudiedInCourse(uid, courseId, chapterNum, method = "unknown") {
    if (!uid || !courseId || !chapterNum) {
        console.error("markChapterStudiedInCourse: Missing UID, CourseID, or ChapterNum.");
        return false;
    }
    const progress = userCourseProgressMap.get(courseId);
    if (!progress) {
        console.error(`markChapterStudiedInCourse: No progress found for course ${courseId}.`);
        return false;
    }
    const chapterNumInt = parseInt(chapterNum);
    progress.courseStudiedChapters = progress.courseStudiedChapters || [];

    let changed = false;
    if (!progress.courseStudiedChapters.includes(chapterNumInt)) {
        progress.courseStudiedChapters.push(chapterNumInt);
        progress.courseStudiedChapters.sort((a, b) => a - b);
        changed = true;
        console.log(`Chapter ${chapterNumInt} marked as studied locally for course ${courseId} via ${method}.`);
    }

    const todayStr = getFormattedDate(); 
    progress.dailyProgress = progress.dailyProgress || {};
    progress.dailyProgress[todayStr] = progress.dailyProgress[todayStr] || { chaptersStudied: [], skipExamsPassed: [], assignmentCompleted: false, assignmentScore: null };

    if (method === "skip_exam_pass" || method === "skip_exam_passed") { 
        if (!progress.dailyProgress[todayStr].skipExamsPassed.includes(chapterNumInt)) {
            progress.dailyProgress[todayStr].skipExamsPassed.push(chapterNumInt);
            progress.dailyProgress[todayStr].skipExamsPassed.sort((a, b) => a - b);
            changed = true; 
            console.log(`Logged skip exam pass for Ch ${chapterNumInt} on ${todayStr}`);
        }
    } else { 
        if (!progress.dailyProgress[todayStr].chaptersStudied.includes(chapterNumInt)) {
            progress.dailyProgress[todayStr].chaptersStudied.push(chapterNumInt);
            progress.dailyProgress[todayStr].chaptersStudied.sort((a, b) => a - b);
            changed = true; 
            console.log(`Logged chapter study for Ch ${chapterNumInt} on ${todayStr}`);
        }
    }


    if (changed) {
        updateUserCourseProgress(courseId, progress); 
        return await saveUserCourseProgress(uid, courseId, progress); 
    } else {
        console.log(`No changes needed for Chapter ${chapterNumInt} study status for course ${courseId}.`);
        return true; 
    }
}

// --- Admin Function to Update User Course Status ---
export async function updateCourseStatusForUser(targetUserId, courseId, finalMark, newStatus) {
    if (!currentUser || !currentUser.isAdmin) {
        console.error("Permission Denied: Admin required for updateCourseStatusForUser.");
        alert("Admin privileges required.");
        return false;
    }
    if (!db) { console.error("Firestore DB not initialized"); return false; }
    if (!targetUserId || !courseId || !newStatus) {
        console.error("Missing targetUserId, courseId, or newStatus for updateCourseStatusForUser.");
        alert("Internal Error: Missing data for course status update.");
        return false;
    }

    const progressRef = db.collection('userCourseProgress').doc(targetUserId).collection('courses').doc(courseId);
    const userRef = db.collection('users').doc(targetUserId);

    console.log(`Admin: Updating course ${courseId} for user ${targetUserId}. Status: ${newStatus}, Mark: ${finalMark}`);

    try {
        await db.runTransaction(async (transaction) => {
            const progressDoc = await transaction.get(progressRef);
            const userDoc = await transaction.get(userRef);

            if (!progressDoc.exists) { throw new Error(`Progress document for user ${targetUserId}, course ${courseId} not found.`); }
            if (!userDoc.exists) { throw new Error(`User document for user ${targetUserId} not found.`); }

            const progressData = progressDoc.data();
            const userData = userDoc.data();
            const courseDef = globalCourseDataMap.get(courseId);

            const progressUpdates = {
                status: newStatus,
                lastActivityDate: firebase.firestore.FieldValue.serverTimestamp()
            };

            let finalGrade = null;
            if (finalMark !== null && finalMark !== undefined) {
                progressUpdates.totalMark = Number(finalMark); 
                finalGrade = getLetterGrade(progressUpdates.totalMark);
                progressUpdates.grade = finalGrade;
            } else if (newStatus !== 'enrolled') {
                 const calculatedMark = calculateTotalMark(progressData); 
                 const calculatedGrade = getLetterGrade(calculatedMark);
                 progressUpdates.totalMark = calculatedMark;
                 progressUpdates.grade = calculatedGrade;
                 finalGrade = calculatedGrade; 
                 console.log(`Calculated final mark: ${calculatedMark}, Grade: ${calculatedGrade}`);
            }

            if ((newStatus === 'completed' || newStatus === 'failed') && progressData.status !== newStatus) {
                progressUpdates.completionDate = firebase.firestore.FieldValue.serverTimestamp();
            } else if (newStatus === 'enrolled') {
                 progressUpdates.completionDate = null; 
            } else {
                 progressUpdates.completionDate = progressData.completionDate || null;
            }

            let badges = userData.completedCourseBadges || [];
            badges = badges.filter(b => b.courseId !== courseId);

            if (newStatus === 'completed' && finalGrade && finalGrade !== 'F' && courseDef) {
                badges.push({
                    courseId: courseId,
                    courseName: courseDef.name || 'Unknown Course',
                    grade: finalGrade,
                    completionDate: firebase.firestore.Timestamp.now()
                });
                console.log(`Adding badge for course ${courseId}, grade ${finalGrade}`);
            } else {
                 console.log(`Not adding badge for course ${courseId}. Status: ${newStatus}, Grade: ${finalGrade}`);
            }

            transaction.update(progressRef, progressUpdates);
            transaction.update(userRef, { completedCourseBadges: badges });
        });

        console.log(`Successfully updated status/grade for course ${courseId}, user ${targetUserId}.`);

        if (currentUser && userCourseProgressMap.has(courseId) && targetUserId === currentUser.uid) {
             const updatedProgressDoc = await progressRef.get(); 
             if (updatedProgressDoc.exists) {
                 const updatedProgressData = updatedProgressDoc.data();
                 if (updatedProgressData.enrollmentDate?.toDate) updatedProgressData.enrollmentDate = updatedProgressData.enrollmentDate.toDate();
                 if (updatedProgressData.completionDate?.toDate) updatedProgressData.completionDate = updatedProgressData.completionDate.toDate();
                 if (updatedProgressData.lastActivityDate?.toDate) updatedProgressData.lastActivityDate = updatedProgressData.lastActivityDate.toDate();

                 const courseDef = globalCourseDataMap.get(courseId);
                 if (courseDef) {
                      updatedProgressData.currentDayObjective = determineTodaysObjective(updatedProgressData, courseDef);
                 }
                 updateUserCourseProgress(courseId, updatedProgressData);
                 console.log(`Local progress map updated for the current user (${targetUserId}).`);
             }
        } else {
             console.log(`Skipping local progress map update for target user ${targetUserId} (not current user or not in map).`);
        }

        return true;
    } catch (error) {
        console.error(`Error updating course status/grade for user ${targetUserId}, course ${courseId}:`, error);
        let alertMessage = `Failed to update course status: ${error.message}`;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = `Failed to update course status: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
        }
        alert(alertMessage);
        return false;
    }
}

export async function handleAddBadgeForUser(userId, courseId, courseName, grade, completionDate) {
     if (!currentUser || !currentUser.isAdmin) { alert("Admin privileges required."); return; } 
     showLoading("Adding badge...");
     const userRef = db.collection('users').doc(userId);
     try {
         const newBadge = {
             courseId: courseId.trim(),
             courseName: courseName.trim(),
             grade: grade.trim().toUpperCase(),
             completionDate: completionDate ? firebase.firestore.Timestamp.fromDate(completionDate) : firebase.firestore.Timestamp.now()
         };
         const userDoc = await userRef.get();
         if (userDoc.exists) {
              const badges = userDoc.data().completedCourseBadges || [];
              if (badges.some(b => b.courseId === newBadge.courseId)) {
                   alert(`User already has a badge for course ID ${newBadge.courseId}. Please remove the existing one first if you want to replace it.`);
                   hideLoading(); return;
              }
         }
         await userRef.update({ completedCourseBadges: firebase.firestore.FieldValue.arrayUnion(newBadge) });
         hideLoading(); alert("Badge added successfully!");
         const searchInput = document.getElementById('admin-user-search-badges');
         if (searchInput && (searchInput.value === userId || searchInput.value.toLowerCase() === userDoc.data()?.email?.toLowerCase())) { window.loadUserBadgesForAdmin(); }
     } catch (error) { 
         hideLoading(); 
         console.error("Error adding badge:", error); 
         let alertMessage = `Failed to add badge: ${error.message}`;
         if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = `Failed to add badge: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
         }
         alert(alertMessage);
     }
}

export async function handleRemoveBadgeForUser(userId, courseId) {
     if (!currentUser || !currentUser.isAdmin) { alert("Admin privileges required."); return; } 
     showLoading("Removing badge...");
     const userRef = db.collection('users').doc(userId);
     try {
         const userDoc = await userRef.get(); if (!userDoc.exists) throw new Error("User not found.");
         const badges = userDoc.data().completedCourseBadges || [];
         const badgeToRemove = badges.find(badge => badge.courseId === courseId);
         if (!badgeToRemove) { console.warn(`Badge with courseId "${courseId}" not found for user ${userId}.`); hideLoading(); alert("Badge not found for removal."); return; }
         await userRef.update({ completedCourseBadges: firebase.firestore.FieldValue.arrayRemove(badgeToRemove) });
         hideLoading(); alert("Badge removed successfully!");
         const searchInput = document.getElementById('admin-user-search-badges');
         if (searchInput && (searchInput.value === userId || searchInput.value.toLowerCase() === userDoc.data()?.email?.toLowerCase())) { window.loadUserBadgesForAdmin(); }
     } catch (error) { 
         hideLoading(); 
         console.error("Error removing badge:", error); 
         let alertMessage = `Failed to remove badge: ${error.message}`;
         if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = `Failed to remove badge: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
         }
         alert(alertMessage);
     }
}

// --- NEW: Admin Update Username ---
export async function adminUpdateUsername(userId, oldUsername, newUsername) {
    console.log(`Admin attempting to change username for user ${userId} from "${oldUsername}" to "${newUsername}"`);
    if (!db || !currentUser || !currentUser.isAdmin) { 
        console.error("Permission denied: Admin privileges required for username update.");
        throw new Error("Permission denied: Admin privileges required.");
    }
    if (!userId || !newUsername) {
        console.error("Missing userId or newUsername for adminUpdateUsername.");
        throw new Error("Internal Error: Missing required user or username data.");
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(newUsername)) {
        console.error("Invalid new username format:", newUsername);
        throw new Error("Invalid username format. Use 3-20 alphanumeric characters or underscores.");
    }

    const newUsernameLower = newUsername.toLowerCase();
    const oldUsernameLower = oldUsername ? oldUsername.toLowerCase() : null;

    if (oldUsernameLower === newUsernameLower) {
        console.log("New username is the same as the old one (case-insensitive). No change needed.");
        return true; 
    }

    const usersRef = db.collection('users');
    const usernamesRef = db.collection('usernames');
    const userDocRef = usersRef.doc(userId);
    const newUsernameDocRef = usernamesRef.doc(newUsernameLower);
    const oldUsernameDocRef = oldUsernameLower ? usernamesRef.doc(oldUsernameLower) : null;

    try {
        console.log(`Checking if username "${newUsernameLower}" is taken...`);
        const newUsernameDoc = await newUsernameDocRef.get();
        if (newUsernameDoc.exists) {
            console.error(`Username "${newUsernameLower}" is already taken by user ${newUsernameDoc.data()?.userId}`);
            throw new Error(`Username "${newUsername}" is already taken.`);
        }

        console.log("Preparing batch write for username update...");
        const batch = db.batch();

        console.log(`Batch: Updating username field in users/${userId} to "${newUsernameLower}"`);
        batch.update(userDocRef, { username: newUsernameLower });

        if (oldUsernameDocRef) {
            console.log(`Batch: Deleting old username document usernames/${oldUsernameLower}`);
            batch.delete(oldUsernameDocRef);
        } else {
            console.log("No old username document to delete.");
        }

        console.log(`Batch: Creating new username document usernames/${newUsernameLower} linked to ${userId}`);
        batch.set(newUsernameDocRef, { userId: userId });

        console.log("Committing batch write...");
        await batch.commit();
        console.log(`Successfully updated username for user ${userId} to "${newUsernameLower}"`);
        return true;

    } catch (error) {
        console.error(`Error updating username for user ${userId} to "${newUsernameLower}":`, error);
        if (error.message.includes("already taken")) {
            throw error; 
        }
        // Note: This function throws an error. The calling UI code should handle alerting the user.
        // If a direct alert is needed from here, it would be added here, checking for permission errors.
        // For now, adhering to "alerts are generated on error" in *this* file.
        // If this throw is caught and results in an alert in UI, that UI code would need the logic.
        let errorMessage = `Failed to update username: ${error.message}`;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            errorMessage = `Failed to update username: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
        }
        throw new Error(errorMessage);
    }
}


// --- User-Specific Shared Data (Formula Sheets, Summaries, Notes) ---

export async function saveUserFormulaSheet(userId, courseId, chapterNum, htmlContent) {
    if (!db || !userId) {
        console.error("Cannot save formula sheet: DB or userId missing");
        return false;
    }
    const docId = `${courseId}_ch${chapterNum}`;
    const sheetRef = db.collection('users').doc(userId)
                       .collection(userFormulaSheetSubCollection).doc(docId);
    try {
        console.log(`Saving formula sheet for ${docId} to user ${userId}`);
        await sheetRef.set({
            content: htmlContent,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Successfully saved formula sheet for ${docId}`);
        return true;
    } catch (error) {
        console.error(`Error saving formula sheet for ${docId}:`, error);
        return false;
    }
}

export async function loadUserFormulaSheet(userId, courseId, chapterNum) {
    if (!db || !userId) {
        console.error("Cannot load formula sheet: DB or userId missing");
        return null;
    }
    const docId = `${courseId}_ch${chapterNum}`;
    const sheetRef = db.collection('users').doc(userId)
                       .collection(userFormulaSheetSubCollection).doc(docId);
    try {
        console.log(`Attempting to load formula sheet ${docId} for user ${userId}`);
        const docSnap = await sheetRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            if (!data.content) {
                console.warn(`Formula sheet ${docId} exists but has no content`);
                return null;
            }
            console.log(`Successfully loaded formula sheet for ${docId}`);
            return data.content;
        }
        console.log(`No cached formula sheet found for ${docId}`);
        return null;
    } catch (error) {
        console.error(`Error loading formula sheet for ${docId}:`, error);
        return null;
    }
}

export async function saveUserChapterSummary(userId, courseId, chapterNum, htmlContent) {
    if (!db || !userId) {
        console.error("Cannot save chapter summary: DB or userId missing");
        return false;
    }
    const docId = `${courseId}_ch${chapterNum}`;
    const summaryRef = db.collection('users').doc(userId)
                        .collection(userSummarySubCollection).doc(docId);
    try {
        console.log(`Saving chapter summary for ${docId} to user ${userId}`);
        await summaryRef.set({
            content: htmlContent,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Successfully saved chapter summary for ${docId}`);
        return true;
    } catch (error) {
        console.error(`Error saving chapter summary for ${docId}:`, error);
        return false;
    }
}

export async function loadUserChapterSummary(userId, courseId, chapterNum) {
    if (!db || !userId) {
        console.error("Cannot load chapter summary: DB or userId missing");
        return null;
    }
    const docId = `${courseId}_ch${chapterNum}`;
    const summaryRef = db.collection('users').doc(userId)
                        .collection(userSummarySubCollection).doc(docId);
    try {
        console.log(`Attempting to load chapter summary ${docId} for user ${userId}`);
        const docSnap = await summaryRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            if (!data.content) {
                console.warn(`Chapter summary ${docId} exists but has no content`);
                return null;
            }
            console.log(`Successfully loaded chapter summary for ${docId}`);
            return data.content;
        }
        console.log(`No cached chapter summary found for ${docId}`);
        return null;
    } catch (error) {
        console.error(`Error loading chapter summary for ${docId}:`, error);
        return null;
    }
}

export async function saveUserNotes(userId, courseId, chapterNum, notesArray) {
     if (!db || !userId) return false;
     const userRef = db.collection('users').doc(userId);
     const fieldPath = `userNotes.${courseId}_ch${chapterNum}`; 
     try {
         const notesToSave = JSON.parse(JSON.stringify(notesArray));
         await userRef.update({ [fieldPath]: notesToSave });
         console.log(`Saved user notes for ${courseId} Ch ${chapterNum} to map key ${fieldPath}`);
         return true;
     } catch (error) {
         console.error(`Error saving user notes for ${courseId} Ch ${chapterNum} using update:`, error);
         try {
             console.log(`Attempting set with merge for user notes: ${fieldPath}`);
             await userRef.set({ userNotes: { [fieldPath]: notesArray } }, { merge: true });
             console.log(`Set user notes for ${courseId} Ch ${chapterNum} after update failed.`);
             return true;
         } catch (setError) {
              console.error(`Error setting user notes after update failed:`, setError);
              let alertMessage = "Failed to save notes: " + setError.message;
              if (setError.code === 'permission-denied' || (setError.message && setError.message.toLowerCase().includes('permission'))) {
                  alertMessage = "Failed to save notes: Permission Denied. Please check Firestore security rules or contact support. Details: " + setError.message;
              }
              alert(alertMessage);
              return false;
         }
     }
}

export async function loadUserNotes(userId, courseId, chapterNum) {
     if (!db || !userId) return [];
     const userRef = db.collection('users').doc(userId);
     const fieldPath = `userNotes.${courseId}_ch${chapterNum}`; 
     try {
         const docSnap = await userRef.get();
         if (docSnap.exists) {
             const notes = docSnap.data()?.userNotes?.[fieldPath] || []; 
             console.log(`Loaded ${notes.length} user notes for ${courseId} Ch ${chapterNum} from map key ${fieldPath}`);
             return notes.map(n => ({ ...n, timestamp: Number(n.timestamp) || Date.now() }));
         }
         return [];
     } catch (error) {
         console.error(`Error loading user notes for ${courseId} Ch ${chapterNum}:`, error);
         return [];
     }
}

export async function saveSharedNote(courseId, chapterNum, noteData, user) {
     if (!db || !user) return false;
     const docId = `shared_${courseId}_ch${chapterNum}_${Date.now()}`;
     try {
         await db.collection(sharedNotesCollection).doc(docId).set({
             courseId: courseId,
             chapterNum: Number(chapterNum),
             originalNoteId: noteData.id, 
             title: noteData.title,
             content: noteData.content,
             type: noteData.type,
             filename: noteData.filename || null,
             filetype: noteData.filetype || null,
             userId: user.uid,
             userName: user.displayName || 'Anonymous',
             timestamp: firebase.firestore.FieldValue.serverTimestamp()
         });
         console.log(`Shared note ${docId} saved.`);
         return true;
     } catch (error) {
         console.error(`Error saving shared note ${docId}:`, error);
         let alertMessage = `Failed to share note: ${error.message}`;
         if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = `Failed to share note: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
         }
         alert(alertMessage);
         return false;
     }
}

export async function loadSharedNotes(courseId, chapterNum) {
    if (!db) return [];
    try {
        const snapshot = await db.collection(sharedNotesCollection)
                           .where('courseId', '==', courseId)
                           .where('chapterNum', '==', Number(chapterNum))
                           .orderBy('timestamp', 'desc')
                           .limit(50) 
                           .get();

        const notes = [];
        snapshot.forEach(doc => {
             const data = doc.data();
             notes.push({
                 id: doc.id,
                 ...data,
                 timestamp: data.timestamp?.toDate ? data.timestamp.toDate().getTime() : Date.now()
             });
         });
        console.log(`Loaded ${notes.length} shared notes for ${courseId} Ch ${chapterNum}`);
        return notes;
    } catch (error) {
        console.error(`Error loading shared notes for ${courseId} Ch ${chapterNum}:`, error);
        return [];
    }
}

// --- Admin Functions for Generated Content Deletion ---
export async function deleteUserFormulaSheet(userId, courseId, chapterNum) {
    if (!db || !currentUser || !currentUser.isAdmin) { 
        console.error("Cannot delete formula sheet: Admin privileges required");
        return false;
    }
    if (!userId || !courseId || !chapterNum) {
        console.error("Cannot delete formula sheet: Missing required parameters");
        return false;
    }

    const docId = `${courseId}_ch${chapterNum}`;
    const sheetRef = db.collection('users').doc(userId)
                      .collection(userFormulaSheetSubCollection).doc(docId);

    try {
        console.log(`Admin attempting to delete formula sheet ${docId} for user ${userId}`);
        await sheetRef.delete();
        console.log(`Successfully deleted formula sheet ${docId} for user ${userId}`);
        return true;
    } catch (error) {
        console.error(`Error deleting formula sheet ${docId} for user ${userId}:`, error);
        return false;
    }
}

export async function deleteUserChapterSummary(userId, courseId, chapterNum) {
    if (!db || !currentUser || !currentUser.isAdmin) { 
        console.error("Cannot delete chapter summary: Admin privileges required");
        return false;
    }
    if (!userId || !courseId || !chapterNum) {
        console.error("Cannot delete chapter summary: Missing required parameters");
        return false;
    }

    const docId = `${courseId}_ch${chapterNum}`;
    const summaryRef = db.collection('users').doc(userId)
                        .collection(userSummarySubCollection).doc(docId);

    try {
        console.log(`Admin attempting to delete chapter summary ${docId} for user ${userId}`);
        await summaryRef.delete();
        console.log(`Successfully deleted chapter summary ${docId} for user ${userId}`);
        return true;
    } catch (error) {
        console.error(`Error deleting chapter summary ${docId} for user ${userId}:`, error);
        return false;
    }
}

export async function deleteAllFeedbackMessages() {
    if (!db || !currentUser || !currentUser.isAdmin) { 
        throw new Error("Permission denied: Admin privileges required.");
    }
    console.log("Admin: Deleting all feedback messages...");
    try {
        const snapshot = await db.collection('feedback')
                               .limit(500) 
                               .get();

        if (snapshot.empty) {
            console.log("No feedback messages to delete.");
            return 0; 
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        console.log(`Successfully deleted ${snapshot.size} feedback messages`);
        return snapshot.size;
    } catch (error) {
        console.error("Error deleting all feedback messages:", error);
        throw error;
    }
}

export async function deleteAllExamIssues() {
    if (!db || !currentUser || !currentUser.isAdmin) { 
        throw new Error("Permission denied: Admin privileges required.");
    }
    console.log("Admin: Deleting all exam issues...");
    try {
        const snapshot = await db.collection('examIssues')
                               .limit(500) 
                               .get();

        if (snapshot.empty) {
             console.log("No exam issues to delete.");
            return 0; 
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        console.log(`Successfully deleted ${snapshot.size} exam issues`);
        return snapshot.size;
    } catch (error) {
        console.error("Error deleting all exam issues:", error);
        throw error;
    }
}

export async function deleteInboxMessage(userId, messageId) {
    if (!db || !userId || !messageId || !currentUser) { 
        console.error("Cannot delete inbox message: Missing DB, userId, messageId, or auth info");
        return false;
    }

    const currentUid = currentUser.uid;
    const isAdminUser = currentUser.isAdmin; 
    const isOwner = currentUid === userId;

    if (!isAdminUser && !isOwner) {
         console.error(`Permission denied: User ${currentUid} cannot delete message ${messageId} for user ${userId}`);
         alert("Permission denied.");
         return false;
    }

    const messageRef = db.collection('users').doc(userId)
                        .collection('inbox').doc(messageId);

    try {
        await messageRef.delete();
        console.log(`Successfully deleted inbox message ${messageId} for user ${userId} by ${currentUid}`);
        return true;
    } catch (error) {
        console.error(`Error deleting inbox message ${messageId} for user ${userId}:`, error);
        return false;
    }
}

export async function deleteCourseActivityProgress(userId, courseId, activityType, activityId) {
    if (!db || !currentUser || !currentUser.isAdmin) { 
        console.error("Cannot delete course activity progress: Admin privileges required");
        alert("Permission denied.");
        return false;
    }
    if (!userId || !courseId || !activityType || !activityId) {
        console.error("Cannot delete course activity progress: Missing required parameters");
        return false;
    }

    const progressRef = db.collection('userCourseProgress').doc(userId).collection('courses').doc(courseId);

    console.log(`Admin attempting to delete ${activityType} score "${activityId}" for course ${courseId}, user ${userId}`);

    try {
        await db.runTransaction(async (transaction) => {
            const progressDoc = await transaction.get(progressRef);
            if (!progressDoc.exists) {
                throw new Error(`Progress document for user ${userId}, course ${courseId} not found.`);
            }

            const progressData = progressDoc.data();
            const updates = {};
            let scoreMap = null;
            let mapKey = null;
            let valueToDelete = null; 

            switch (activityType) {
                case 'assignment':
                    scoreMap = progressData.assignmentScores || {};
                    mapKey = 'assignmentScores';
                    valueToDelete = activityId;
                    break;
                case 'weekly_exam':
                    scoreMap = progressData.weeklyExamScores || {};
                    mapKey = 'weeklyExamScores';
                    valueToDelete = activityId;
                    break;
                case 'midcourse':
                    scoreMap = progressData.midcourseExamScores || {};
                    mapKey = 'midcourseExamScores';
                    valueToDelete = activityId;
                    break;
                case 'final':
                    let finalScores = progressData.finalExamScores || [];
                    const finalIndex = parseInt(activityId.replace('final', '')) - 1;
                    if (Array.isArray(finalScores) && finalIndex >= 0 && finalIndex < finalScores.length) {
                        finalScores[finalIndex] = null; 
                        updates.finalExamScores = finalScores;
                    } else {
                        console.warn(`Invalid final exam index or score array for ${activityId}`);
                    }
                    mapKey = null; 
                    break;
                 case 'skip_exam': 
                    mapKey = 'skipExamAttempts';
                    valueToDelete = activityId; 
                    const attemptsMap = progressData.skipExamAttempts || {};
                    const scoresMap = progressData.lastSkipExamScore || {};
                    if (attemptsMap.hasOwnProperty(valueToDelete)) delete attemptsMap[valueToDelete];
                    if (scoresMap.hasOwnProperty(valueToDelete)) delete scoresMap[valueToDelete];
                    updates.skipExamAttempts = attemptsMap;
                    updates.lastSkipExamScore = scoresMap;
                    mapKey = null; 
                    break;
                case 'video': 
                     mapKey = 'watchedVideoUrls';
                     valueToDelete = activityId; 
                     const urlsMap = progressData.watchedVideoUrls || {};
                     const durationsMap = progressData.watchedVideoDurations || {};
                     if (urlsMap.hasOwnProperty(valueToDelete)) delete urlsMap[valueToDelete];
                     if (durationsMap.hasOwnProperty(valueToDelete)) delete durationsMap[valueToDelete];
                     updates.watchedVideoUrls = urlsMap;
                     updates.watchedVideoDurations = durationsMap;
                     mapKey = null; 
                     break;
                case 'pdf': 
                     mapKey = 'pdfProgress';
                     valueToDelete = activityId; 
                     const pdfMap = progressData.pdfProgress || {};
                     if (pdfMap.hasOwnProperty(valueToDelete)) delete pdfMap[valueToDelete];
                     updates.pdfProgress = pdfMap;
                     mapKey = null; 
                     break;
                 case 'daily': 
                     mapKey = 'dailyProgress';
                     valueToDelete = activityId; 
                     const dailyMap = progressData.dailyProgress || {};
                     if (dailyMap.hasOwnProperty(valueToDelete)) delete dailyMap[valueToDelete];
                     updates.dailyProgress = dailyMap;
                     mapKey = null; 
                     break;

                default:
                    throw new Error(`Invalid activity type for deletion: ${activityType}`);
            }

            if (mapKey && valueToDelete !== null) {
                if (progressData[mapKey] && progressData[mapKey].hasOwnProperty(valueToDelete)) {
                    delete progressData[mapKey][valueToDelete]; 
                    updates[mapKey] = progressData[mapKey]; 
                } else {
                    console.warn(`Activity ID "${valueToDelete}" not found in map "${mapKey}" for deletion.`);
                }
            }

            if (Object.keys(updates).length > 0) {
                 console.log(`Updating Firestore with changes:`, updates);
                 transaction.update(progressRef, updates);
            } else {
                console.log("No updates were necessary for the deletion request.");
            }
        });

        console.log(`Successfully processed deletion request for ${activityType} ${activityId} for user ${userId}, course ${courseId}`);
        return true;
    } catch (error) {
        console.error(`Error deleting course activity progress:`, error);
        let alertMessage = `Error deleting progress: ${error.message}`;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = `Error deleting progress: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
        }
        alert(alertMessage); 
        return false;
    }
}

// --- NEW: Admin Tasks Management ---
/**
 * Fetches all admin tasks from Firestore, ordered by creation date.
 * @returns {Promise<Array<object>>} - An array of task objects `{ id, text, status, createdAt }`.
 */
export async function fetchAdminTasks() {
    if (!db) {
        console.error("Firestore DB not initialized");
        return [];
    }
    console.log("Fetching admin tasks...");
    try {
        const snapshot = await db.collection(adminTasksCollection)
                           .orderBy('createdAt', 'desc')
                           .get();
        const tasks = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            tasks.push({
                id: doc.id,
                text: data.text,
                status: data.status, // Should be 'pending' or 'done'
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null
            });
        });
        console.log(`Successfully fetched ${tasks.length} admin tasks.`);
        return tasks;
    } catch (error) {
        console.error("Error fetching admin tasks:", error);
        return []; 
    }
}

/**
 * Adds a new task to the admin tasks collection. Requires Primary Admin.
 * @param {string} taskText - The text content of the task.
 * @returns {Promise<string|null>} - The ID of the new task, or null on failure.
 */
export async function addAdminTask(taskText) {
    if (!db || !currentUser || currentUser.uid !== ADMIN_UID) {
        console.error("Permission denied: Primary Admin privileges required to add task.");
        alert("Permission denied: Primary Admin privileges required.");
        return null;
    }
    if (!taskText || typeof taskText !== 'string' || taskText.trim().length === 0) {
        console.error("Cannot add task: Task text is empty or invalid.");
        alert("Task text cannot be empty.");
        return null;
    }

    console.log("Primary Admin adding new task:", taskText);
    try {
        const docRef = await db.collection(adminTasksCollection).add({
            text: taskText.trim(),
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Successfully added admin task with ID: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error("Error adding admin task:", error);
        let alertMessage = `Failed to add task: ${error.message}`;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = `Failed to add task: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
        }
        alert(alertMessage);
        return null;
    }
}

/**
 * Updates the status of an existing admin task. Requires Primary Admin.
 * @param {string} taskId - The ID of the task to update.
 * @param {string} newStatus - The new status ('pending' or 'done').
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function updateAdminTaskStatus(taskId, newStatus) {
    if (!db || !currentUser || currentUser.uid !== ADMIN_UID) {
        console.error("Permission denied: Primary Admin privileges required to update task status.");
        alert("Permission denied: Primary Admin privileges required.");
        return false;
    }
    if (!taskId || !newStatus || (newStatus !== 'pending' && newStatus !== 'done')) {
        console.error("Invalid arguments for updateAdminTaskStatus. TaskId:", taskId, "NewStatus:", newStatus);
        alert("Internal Error: Invalid data for task status update.");
        return false;
    }

    console.log(`Primary Admin updating task ${taskId} status to: ${newStatus}`);
    const taskRef = db.collection(adminTasksCollection).doc(taskId);
    try {
        await taskRef.update({ status: newStatus });
        console.log(`Successfully updated status for admin task ${taskId}.`);
        return true;
    } catch (error) {
        console.error(`Error updating status for admin task ${taskId}:`, error);
        let alertMessage = `Failed to update task status: ${error.message}`;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = `Failed to update task status: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
        }
        alert(alertMessage);
        return false;
    }
}

/**
 * Deletes an admin task, but only if its status is 'done'. Requires Primary Admin.
 * @param {string} taskId - The ID of the task to delete.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function deleteAdminTask(taskId) {
    if (!db || !currentUser || currentUser.uid !== ADMIN_UID) {
        console.error("Permission denied: Primary Admin privileges required to delete task.");
        alert("Permission denied: Primary Admin privileges required.");
        return false;
    }
    if (!taskId) {
        console.error("Cannot delete task: Task ID is missing.");
        alert("Internal Error: Task ID missing for deletion.");
        return false;
    }

    console.log(`Primary Admin attempting to delete task ${taskId}`);
    const taskRef = db.collection(adminTasksCollection).doc(taskId);
    try {
        const docSnap = await taskRef.get();
        if (!docSnap.exists) {
            console.warn(`Task ${taskId} not found for deletion.`);
            alert("Task not found.");
            return false;
        }
        const taskData = docSnap.data();
        if (taskData.status !== 'done') {
            console.warn(`Cannot delete task ${taskId} because its status is '${taskData.status}'. Only 'done' tasks can be deleted.`);
            alert("Cannot delete task: Task must be marked as 'done' first.");
            return false;
        }

        await taskRef.delete();
        console.log(`Successfully deleted admin task ${taskId} (status was 'done').`);
        return true;
    } catch (error) {
        console.error(`Error deleting admin task ${taskId}:`, error);
        let alertMessage = `Failed to delete task: ${error.message}`;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = `Failed to delete task: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
        }
        alert(alertMessage);
        return false;
    }
}


// --- NEW: Toggle User Admin Status ---
export async function toggleUserAdminStatus(targetUserId, currentIsAdmin) {
    if (!db || !currentUser || currentUser.uid !== ADMIN_UID) { 
        console.error("Permission denied: Only the primary admin can toggle admin status.");
        throw new Error("Permission denied: Only the primary admin can perform this action.");
    }
    if (!targetUserId) {
        console.error("Target User ID is missing for toggling admin status.");
        throw new Error("Internal Error: Target user ID missing.");
    }
    if (targetUserId === ADMIN_UID) {
        console.warn("Primary admin cannot change their own admin status.");
        throw new Error("The primary admin's status cannot be changed through this interface.");
    }

    const newIsAdminStatus = !currentIsAdmin;
    const userRef = db.collection('users').doc(targetUserId);

    console.log(`Primary admin toggling admin status for user ${targetUserId} from ${currentIsAdmin} to ${newIsAdminStatus}.`);
    try {
        await userRef.update({ isAdmin: newIsAdminStatus });
        console.log(`Successfully updated isAdmin status for user ${targetUserId} to ${newIsAdminStatus}.`);
        return true;
    } catch (error) {
        console.error(`Error toggling admin status for user ${targetUserId}:`, error);
        // Note: This function throws an error. The calling UI code should handle alerting the user.
        // If a direct alert is needed from here, it would be added here, checking for permission errors.
        let errorMessage = `Failed to toggle admin status: ${error.message}`;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            errorMessage = `Failed to toggle admin status: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
        }
        throw new Error(errorMessage);
    }
}

export async function adminUpdateUserSubjectStatus(adminUid, targetUserId, subjectId, newStatus) {
    if (!db || !currentUser || !currentUser.isAdmin) { 
        console.error("Permission denied: Admin privileges required for this action.");
        alert("Permission denied. Admin privileges required.");
        return false;
    }
    if (!targetUserId || !subjectId || !newStatus) {
        console.error("Missing targetUserId, subjectId, or newStatus for adminUpdateUserSubjectStatus.");
        alert("Internal Error: Missing data for subject status update.");
        return false;
    }
    if (!['pending', 'approved', 'rejected'].includes(newStatus)) {
        alert("Invalid status provided.");
        return false;
    }

    console.log(`Admin ${currentUser.uid} attempting to update subject ${subjectId} for user ${targetUserId} to status ${newStatus}`);
    const targetUserRef = db.collection('users').doc(targetUserId);

    try {
        const userDoc = await targetUserRef.get();
        if (!userDoc.exists) {
            console.error(`Target user ${targetUserId} not found.`);
            alert("Target user not found.");
            return false;
        }

        const userData = userDoc.data();
        if (!userData.appData || !userData.appData.subjects || !userData.appData.subjects[subjectId]) {
            console.error(`Subject ${subjectId} not found in appData for user ${targetUserId}.`);
            alert("Subject not found for the target user.");
            return false;
        }

        const newAppData = JSON.parse(JSON.stringify(userData.appData));
        newAppData.subjects[subjectId].status = newStatus;

        await targetUserRef.update({ appData: newAppData });
        console.log(`Successfully updated status for subject ${subjectId} of user ${targetUserId} to ${newStatus}.`);
        return true;
    } catch (error) {
        console.error(`Error updating subject status for user ${targetUserId}:`, error);
        let alertMessage = `Failed to update subject status: ${error.message}`;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = `Failed to update subject status: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
        }
        alert(alertMessage);
        return false;
    }
}

// --- START: User Credit System ---
export async function updateUserCredits(userId, creditChange, reason) {
    if (!db || !userId || typeof creditChange !== 'number' || !reason) {
        console.error("updateUserCredits: Invalid parameters.", { userId, creditChange, reason });
        return false;
    }
    if (creditChange === 0) {
        console.log("updateUserCredits: creditChange is 0, no update needed.");
        return true; 
    }

    const userRef = db.collection('users').doc(userId);
    const creditLogRef = userRef.collection(userCreditLogSubCollection).doc(); 

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error(`User document ${userId} not found for credit update.`);
            }
            const currentCredits = userDoc.data().credits || 0;
            const newCredits = currentCredits + creditChange;

            console.log(`[updateUserCredits Transaction] Updating user credits. Current: ${currentCredits}, Change: ${creditChange}, New Calculated: ${newCredits}`);
            transaction.update(userRef, {
                credits: firebase.firestore.FieldValue.increment(creditChange)
            });

            const logEntryData = {
                timestamp: firebase.firestore.FieldValue.serverTimestamp(), 
                change: creditChange,
                newBalance: newCredits, 
                reason: reason,
                performedBy: currentUser ? currentUser.uid : 'system' 
            };
            console.log("[updateUserCredits Transaction] Logging credit transaction:", {...logEntryData, timestamp: 'ServerTimestamp'}); 
            
            transaction.set(creditLogRef, { 
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                change: creditChange,
                newBalance: newCredits,
                reason: reason,
                performedBy: currentUser ? currentUser.uid : 'system'
            });
        });

        console.log(`Successfully updated credits for user ${userId} by ${creditChange}. Reason: ${reason}`);
        
        if (currentUser && currentUser.uid === userId) {
            const oldCredits = currentUser.credits || 0;
            const newLocalCredits = oldCredits + creditChange;
            const updatedCurrentUser = { ...currentUser, credits: newLocalCredits };
            setCurrentUser(updatedCurrentUser);
            console.log("[updateUserCredits] Local currentUser state updated:", JSON.parse(JSON.stringify(updatedCurrentUser)));

            const creditsDisplay = document.getElementById('user-profile-credits');
            if (creditsDisplay) creditsDisplay.textContent = newLocalCredits.toLocaleString();
            const marketplaceCreditsDisplay = document.getElementById('marketplace-credit-balance');
            if (marketplaceCreditsDisplay) marketplaceCreditsDisplay.textContent = newLocalCredits.toLocaleString();
        }
        return true;
    } catch (error) {
        console.error(`Error updating credits for user ${userId}:`, error);
        let alertMessage = `Failed to update credits: ${error.message}`;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = `Failed to update credits: Permission Denied. Please check Firestore security rules or contact support. Details: ${error.message}`;
        }
        alert(alertMessage);
        return false;
    }
}
// --- END: User Credit System ---

// --- NEW AI Chat Studio Firestore Functions ---

/**
 * Saves or updates a specific AI chat session document for a user.
 * @param {string} userId - The user's unique ID.
 * @param {string} sessionId - The ID of the chat session.
 * @param {object} sessionData - The chat session data to save.
 * @returns {Promise<void>}
 */
export async function saveChatSession(userId, sessionId, sessionData) {
    if (!db || !userId || !sessionId || !sessionData) {
        console.error("saveChatSession: Missing required parameters.");
        throw new Error("Missing required parameters for saving chat session.");
    }
    const sessionRef = db.collection('users').doc(userId)
                         .collection(aiChatSessionsSubCollection).doc(sessionId);

    const dataToSave = { ...sessionData }; 

    // Convert createdAt to Firestore Timestamp if it's a number (client-side millis)
    // or set to serverTimestamp if not present (e.g., very first save attempt)
    if (typeof dataToSave.createdAt === 'number') {
        dataToSave.createdAt = firebase.firestore.Timestamp.fromMillis(dataToSave.createdAt);
    } else if (!dataToSave.createdAt || (typeof dataToSave.createdAt === 'object' && !dataToSave.createdAt.toDate)) { 
        // If not a number and not already a Firestore Timestamp, set to server time
        dataToSave.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }
    // Ensure lastModified is always updated to server time
    dataToSave.lastModified = firebase.firestore.FieldValue.serverTimestamp();
    
    // Ensure history is an array and messages have correct structure if needed (basic check)
    dataToSave.history = Array.isArray(dataToSave.history) ? dataToSave.history : [];
    dataToSave.history.forEach(msg => {
        if (typeof msg.timestamp === 'object' && msg.timestamp && typeof msg.timestamp.toDate === 'function') {
            // This should not happen if timestamps are handled as numbers on client
            console.warn("Message timestamp was a Firestore Timestamp, converting to millis for consistency in DB array.");
            msg.timestamp = msg.timestamp.toMillis();
        } else if (typeof msg.timestamp !== 'number') {
            console.warn("Message timestamp was not a number, setting to Date.now(). Message:", msg);
            msg.timestamp = Date.now();
        }
    });


    try {
        await sessionRef.set(dataToSave, { merge: true });
        console.log(`AI Chat session ${sessionId} saved successfully for user ${userId}.`);
    } catch (error) {
        console.error(`Error saving AI Chat session ${sessionId} for user ${userId}:`, error);
        // This function currently throws error, UI should handle alert.
        // If direct alert desired, add logic here like:
        // let errorMessage = `Error saving AI Chat session: ${error.message}`;
        // if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
        //     errorMessage = `Error saving AI Chat session: Permission Denied. Check Firestore rules. Details: ${error.message}`;
        // }
        // alert(errorMessage);
        throw error; 
    }
}

/**
 * Loads all AI chat sessions for a given user from Firestore.
 * @param {string} userId - The user's unique ID.
 * @returns {Promise<Array<object>>} - An array of chat session objects, each with an 'id' field.
 */
export async function loadUserChatSessionsFromFirestore(userId) {
    if (!db || !userId) {
        console.error("loadUserChatSessionsFromFirestore: Missing DB or userId.");
        return [];
    }
    const sessionsRef = db.collection('users').doc(userId)
                          .collection(aiChatSessionsSubCollection);
    try {
        // Order by lastModified descending to get newest first
        const snapshot = await sessionsRef.orderBy('lastModified', 'desc').get(); 
        const sessions = [];
        snapshot.forEach(doc => {
            sessions.push({ id: doc.id, ...doc.data() });
        });
        console.log(`Loaded ${sessions.length} AI chat sessions from Firestore for user ${userId}.`);
        return sessions;
    } catch (error) {
        console.error(`Error loading AI chat sessions from Firestore for user ${userId}:`, error);
        throw error; 
    }
}

/**
 * Deletes a specific AI chat session document for a user.
 * @param {string} userId - The user's unique ID.
 * @param {string} sessionId - The ID of the chat session to delete.
 * @returns {Promise<void>}
 */
export async function deleteChatSessionFromFirestore(userId, sessionId) {
    if (!db || !userId || !sessionId) {
        console.error("deleteChatSessionFromFirestore: Missing required parameters.");
        throw new Error("Missing required parameters for deleting chat session.");
    }
    const sessionRef = db.collection('users').doc(userId)
                         .collection(aiChatSessionsSubCollection).doc(sessionId);
    try {
        await sessionRef.delete();
        console.log(`AI Chat session ${sessionId} deleted successfully for user ${userId}.`);
    } catch (error) {
        console.error(`Error deleting AI Chat session ${sessionId} for user ${userId}:`, error);
        // This function currently throws error, UI should handle alert.
        // If direct alert desired, add logic here.
        throw error; 
    }
}

// --- Admin Testing Aid Functions ---

export async function adminMarkTestGenChaptersStudied(targetUserId, subjectId) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) throw new Error("Admin privileges required.");
    const userRef = db.collection('users').doc(targetUserId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) throw new Error("Target user not found.");

    const userData = userDoc.data();
    const appData = userData.appData || { subjects: {} };
    const subject = appData.subjects?.[subjectId];
    if (!subject || !subject.chapters) throw new Error("Subject or chapters not found for user.");

    Object.keys(subject.chapters).forEach(chapNum => {
        if (!subject.studied_chapters.includes(chapNum)) {
            subject.studied_chapters.push(chapNum);
        }
    });
    subject.studied_chapters.sort((a, b) => parseInt(a) - parseInt(b));
    await userRef.update({ appData: appData });
}

export async function adminResetTestGenSubjectProgress(targetUserId, subjectId) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) throw new Error("Admin privileges required.");
    const userRef = db.collection('users').doc(targetUserId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) throw new Error("Target user not found.");

    const userData = userDoc.data();
    const appData = userData.appData || { subjects: {} };
    const subject = appData.subjects?.[subjectId];
    if (!subject || !subject.chapters) throw new Error("Subject or chapters not found for user.");

    for (const chapNum in subject.chapters) {
        const chap = subject.chapters[chapNum];
        chap.total_attempted = 0;
        chap.total_wrong = 0;
        chap.mistake_history = [];
        chap.consecutive_mastery = 0;
        chap.available_questions = Array.from({ length: chap.total_questions || 0 }, (_, j) => j + 1);
    }
    // Optionally, clear studied_chapters as well if "full reset"
    // subject.studied_chapters = [];
    await userRef.update({ appData: appData });
}

export async function adminMarkCourseChapterStudied(targetUserId, courseId, chapterToMark) {
    if (!currentUser || !currentUser.isAdmin) throw new Error("Admin privileges required.");
    const progressRef = db.collection('userCourseProgress').doc(targetUserId).collection('courses').doc(courseId);
    const progressDoc = await progressRef.get();
    if (!progressDoc.exists) throw new Error("User course progress not found.");

    const progressData = progressDoc.data();
    progressData.courseStudiedChapters = progressData.courseStudiedChapters || [];
    
    const courseDef = globalCourseDataMap.get(courseId); // Get course definition
    if (!courseDef) throw new Error("Course definition not found for video duration fetching.");

    const chaptersToUpdate = [];
    if (chapterToMark === 'all') {
        for (let i = 1; i <= (courseDef.totalChapters || 0); i++) chaptersToUpdate.push(i);
    } else {
        const chapNum = parseInt(chapterToMark);
        if (isNaN(chapNum) || chapNum < 1 || chapNum > (courseDef.totalChapters || 0)) throw new Error("Invalid chapter number.");
        chaptersToUpdate.push(chapNum);
    }

    let changed = false;

    // Fetch video durations for all relevant videos first
    const videoIdsToFetch = [];
    chaptersToUpdate.forEach(cn => {
        const lectures = courseDef.chapterResources?.[cn]?.lectureUrls || [];
        lectures.forEach(lec => {
            const videoId = getYouTubeVideoId(lec.url); // Ensure getYouTubeVideoId is robust
            if (videoId && videoDurationMap[videoId] === undefined) { // Only fetch if not already in cache
                videoIdsToFetch.push(videoId);
            }
        });
    });

    if (videoIdsToFetch.length > 0) {
        console.log(`[Admin Action] Fetching durations for ${videoIdsToFetch.length} videos for user ${targetUserId}...`);
        await fetchVideoDurationsIfNeeded(videoIdsToFetch); // This populates the global videoDurationMap
        console.log("[Admin Action] Video durations fetched/updated for admin operation.");
    }

    chaptersToUpdate.forEach(cn => {
        if (!progressData.courseStudiedChapters.includes(cn)) {
            progressData.courseStudiedChapters.push(cn);
            changed = true;
        }
        // Also set PDF and Video progress to 100% for these chapters
        progressData.pdfProgress = progressData.pdfProgress || {};
        // If PDF exists, mark all pages read, otherwise set a default completed state
        const chapterPdfInfo = courseDef.chapterResources?.[cn]?.pdfInfo; // Assuming pdfInfo { totalPages: X } exists
        progressData.pdfProgress[cn] = { 
            currentPage: chapterPdfInfo?.totalPages || 1, // Mark as if last page read or 1 if no info
            totalPages: chapterPdfInfo?.totalPages || 1  // Store total pages or 1
        };
        changed = true;

        progressData.watchedVideoDurations = progressData.watchedVideoDurations || {};
        progressData.watchedVideoDurations[cn] = progressData.watchedVideoDurations[cn] || {};
        const lectures = courseDef.chapterResources?.[cn]?.lectureUrls || [];
        lectures.forEach(lec => {
            const videoId = getYouTubeVideoId(lec.url);
            if (videoId) {
                 const duration = videoDurationMap[videoId]; // Read from the now-populated global map
                 if (typeof duration === 'number' && duration > 0) {
                     progressData.watchedVideoDurations[cn][videoId] = duration;
                 } else {
                     // If duration is still unknown (e.g., API error, private video), use a placeholder.
                     // This indicates completion but acknowledges duration wasn't fetched.
                     console.warn(`[Admin Action] Duration for video ${videoId} (Ch ${cn}) is unknown or invalid (${duration}) after fetch attempt. Setting to placeholder 99999.`);
                     progressData.watchedVideoDurations[cn][videoId] = 99999; 
                 }
            }
        });
        changed = true; 
    });

    if (changed) {
        progressData.courseStudiedChapters.sort((a, b) => a - b);
        await progressRef.update({
            courseStudiedChapters: progressData.courseStudiedChapters,
            pdfProgress: progressData.pdfProgress,
            watchedVideoDurations: progressData.watchedVideoDurations,
            lastActivityDate: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[Admin Action] User ${targetUserId}, Course ${courseId}, Chapter(s) ${chapterToMark} marked as studied with full media progress.`);
    } else {
         console.log(`[Admin Action] No effective change for User ${targetUserId}, Course ${courseId}, Chapter(s) ${chapterToMark}.`);
    }
}
export async function adminCompleteCourseActivity(targetUserId, courseId, activityType, activityId, score) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) throw new Error("Admin privileges required.");
    const progressRef = db.collection('userCourseProgress').doc(targetUserId).collection('courses').doc(courseId);
    const progressDoc = await progressRef.get();
    if (!progressDoc.exists) throw new Error("User course progress not found.");

    const progressData = progressDoc.data();
    const updates = { lastActivityDate: firebase.firestore.FieldValue.serverTimestamp() };

    switch (activityType) {
        case 'assignment':
            progressData.assignmentScores = progressData.assignmentScores || {};
            progressData.assignmentScores[activityId] = score;
            updates.assignmentScores = progressData.assignmentScores;
            // Also log in daily progress for attendance
            const dayNumMatch = activityId.match(/day(\d+)/);
            if (dayNumMatch && progressData.enrollmentDate) {
                const dayNum = parseInt(dayNumMatch[1]);
                const activityDate = new Date(progressData.enrollmentDate.toDate()); // Convert timestamp to Date
                activityDate.setDate(activityDate.getDate() + dayNum - 1);
                const dateStr = getFormattedDate(activityDate); // Assuming getFormattedDate exists
                progressData.dailyProgress = progressData.dailyProgress || {};
                progressData.dailyProgress[dateStr] = progressData.dailyProgress[dateStr] || {};
                progressData.dailyProgress[dateStr].assignmentCompleted = true;
                progressData.dailyProgress[dateStr].assignmentScore = score;
                updates.dailyProgress = progressData.dailyProgress;
            }
            break;
        case 'weekly_exam':
            progressData.weeklyExamScores = progressData.weeklyExamScores || {};
            progressData.weeklyExamScores[activityId] = score;
            updates.weeklyExamScores = progressData.weeklyExamScores;
            break;
        case 'midcourse':
            progressData.midcourseExamScores = progressData.midcourseExamScores || {};
            progressData.midcourseExamScores[activityId] = score;
            updates.midcourseExamScores = progressData.midcourseExamScores;
            break;
        case 'final':
            progressData.finalExamScores = progressData.finalExamScores || [];
            const finalIndexMatch = activityId.match(/final(\d+)/);
            if (finalIndexMatch) {
                const attemptIndex = parseInt(finalIndexMatch[1]) - 1;
                while (progressData.finalExamScores.length <= attemptIndex) progressData.finalExamScores.push(null);
                progressData.finalExamScores[attemptIndex] = score;
                updates.finalExamScores = progressData.finalExamScores;
            } else { throw new Error("Invalid final exam ID format for admin completion."); }
            break;
        case 'skip_exam': // e.g., activityId is "chapter3"
            const chapterNumMatch = activityId.match(/chapter(\d+)/);
            if (!chapterNumMatch) throw new Error("Invalid skip exam activity ID format.");
            const chapterNum = parseInt(chapterNumMatch[1]);
            progressData.lastSkipExamScore = progressData.lastSkipExamScore || {};
            progressData.lastSkipExamScore[chapterNum] = score;
            progressData.skipExamAttempts = progressData.skipExamAttempts || {};
            progressData.skipExamAttempts[chapterNum] = (progressData.skipExamAttempts[chapterNum] || 0) + 1;
            updates.lastSkipExamScore = progressData.lastSkipExamScore;
            updates.skipExamAttempts = progressData.skipExamAttempts;
            // If passed, also mark chapter studied
            const courseDef = globalCourseDataMap.get(courseId);
            const skipThreshold = courseDef?.skipExamPassingPercent || SKIP_EXAM_PASSING_PERCENT;
            if (score >= skipThreshold) {
                progressData.courseStudiedChapters = progressData.courseStudiedChapters || [];
                if (!progressData.courseStudiedChapters.includes(chapterNum)) {
                    progressData.courseStudiedChapters.push(chapterNum);
                    progressData.courseStudiedChapters.sort((a,b) => a-b);
                    updates.courseStudiedChapters = progressData.courseStudiedChapters;
                }
            }
            break;
        default:
            throw new Error("Invalid activity type for admin completion.");
    }
    await progressRef.update(updates);
}

export async function adminSetCourseStatusAndGrade(targetUserId, courseId, finalMark, newStatus) {
    // This function is ALREADY in firebase_firestore.js as updateCourseStatusForUser.
    // We can call it directly. The `currentUser` check within it will ensure admin privs.
    // No new function needed here, just ensure the call from admin_testing_aids.js is correct.
    // The function is: updateCourseStatusForUser(targetUserId, courseId, finalMark, newStatus)
    // Re-confirming: Yes, updateCourseStatusForUser from firebase_firestore.js is suitable.
    await updateCourseStatusForUser(targetUserId, courseId, finalMark, newStatus);
}

export async function adminAdjustUserCredits(targetUserId, amount, reason, adminPerformingActionUid) {
    if (!currentUser || currentUser.uid !== ADMIN_UID) throw new Error("Admin privileges required.");
    if (typeof amount !== 'number' || !reason) throw new Error("Amount and reason required for credit adjustment.");

    // We can use the existing updateUserCredits function, but it uses `currentUser` internally for `performedBy`.
    // For admin actions, it's better to log which admin did it.
    // Let's create a more specific admin version or modify updateUserCredits to accept `performedBy`.
    // For now, let's assume updateUserCredits is flexible or we'd create `adminUpdateUserCredits`.
    // For simplicity, using existing updateUserCredits and it will log current admin as performer.
    // If a different admin needs to be logged, updateUserCredits needs `performedByUid` param.

    // For this implementation, I'll add a new specialized function in firebase_firestore.js
    // called `adminAdjustUserCreditsWithPerformer` to make it explicit.
    // (In a real app, you might refactor updateUserCredits to take an optional performer.)

    // Let's create the new Firestore function:
    const userRef = db.collection('users').doc(targetUserId);
    const creditLogRef = userRef.collection("creditLog").doc(); // Assuming "creditLog" subcollection

    await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error("Target user not found.");
        const currentCredits = userDoc.data().credits || 0;
        const newCredits = currentCredits + amount;

        transaction.update(userRef, { credits: newCredits }); // Update target user's credits
        transaction.set(creditLogRef, {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            change: amount,
            newBalance: newCredits,
            reason: `Admin Action: ${reason}`,
            performedBy: adminPerformingActionUid // Log which admin did it
        });
    });
    // If this is the currently logged-in user being modified by another admin, their local state won't auto-update.
    // The admin UI itself won't reflect the change unless refreshed.
}

// --- End Admin Testing Aid Functions ---

// Add this for CommonJS compatibility if other services use require()
// Ensure all functions that need to be required by CommonJS modules are listed here.
// For now, only adding saveAutomatedCourseToFirestore as per current task.
// Other functions are already individually exported using ES6 'export' keyword.
// If a full switch to CommonJS exports is needed, each function would be added here.
module.exports = {
    // ... (other functions if they were previously module.exports-ed)
    saveAutomatedCourseToFirestore: typeof saveAutomatedCourseToFirestore !== 'undefined' ? saveAutomatedCourseToFirestore : undefined,
    // Add other functions here if they need to be accessible via require()
    // For example, if addCourseToFirestore was also needed by a CommonJS module:
    // addCourseToFirestore: typeof addCourseToFirestore !== 'undefined' ? addCourseToFirestore : undefined,
};

export async function getAdminOverviewStats() {
    if (!db) {
        console.error("Firestore DB not initialized for getAdminOverviewStats.");
        throw new Error("Database not available.");
    }

    try {
        const usersSnapshot = await db.collection('users').get();
        const totalUsers = usersSnapshot.size;

        const pendingCoursesSnapshot = await db.collection('courses').where('status', '==', 'pending').get();
        const pendingCourses = pendingCoursesSnapshot.size;

        const approvedCoursesSnapshot = await db.collection('courses').where('status', '==', 'approved').get();
        const approvedCourses = approvedCoursesSnapshot.size;

        const reportedCoursesSnapshot = await db.collection('courses').where('status', '==', 'reported').get();
        const reportedCourses = reportedCoursesSnapshot.size;

        // --- MODIFIED: Get total global subjects (TestGen definitions) ---
        const globalSubjectsSnapshot = await db.collection('subjects').get();
        const totalGlobalSubjects = globalSubjectsSnapshot.size;
        // --- END MODIFICATION ---

        const totalExamsTaken = 'N/A (Needs Counter)';

        const feedbackSnapshot = await db.collection('feedback').where('status', '==', 'new').get();
        const issuesSnapshot = await db.collection('examIssues').where('status', '==', 'new').get();
        const pendingFeedback = feedbackSnapshot.size + issuesSnapshot.size;

        const adminSnapshot = await db.collection('users').where('isAdmin', '==', true).get();
        const adminCount = adminSnapshot.size;


        return {
            totalUsers,
            pendingCourses,
            approvedCourses,
            reportedCourses,
            totalSubjects: totalGlobalSubjects, // Use the new count
            totalExamsTaken,
            pendingFeedback,
            adminCount
        };

    } catch (error) {
        console.error("Error fetching admin overview stats:", error);
        throw error;
    }
}


export async function adminSimulateDaysPassed(targetUserId, courseId, daysToSimulate) {
    if (!currentUser || !currentUser.isAdmin) { // Ensure current user is admin
        throw new Error("Admin privileges required to simulate days passed.");
    }
    if (!db) {
        console.error("Firestore DB not initialized for adminSimulateDaysPassed.");
        throw new Error("Database not available.");
    }
    if (!targetUserId || !courseId || typeof daysToSimulate !== 'number' || daysToSimulate < 0) {
        console.error("Invalid parameters for adminSimulateDaysPassed.");
        throw new Error("Invalid user, course, or days specified.");
    }

    const progressRef = db.collection('userCourseProgress').doc(targetUserId).collection('courses').doc(courseId);

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of today

        // Calculate the new "enrollment date"
        const newEnrollmentDate = new Date(today);
        newEnrollmentDate.setDate(today.getDate() - daysToSimulate);

        // Convert to Firestore Timestamp
        const newEnrollmentTimestamp = firebase.firestore.Timestamp.fromDate(newEnrollmentDate);

        console.log(`Admin Action: Setting enrollment for user ${targetUserId}, course ${courseId} to ${daysToSimulate} days ago. New enrollment date: ${newEnrollmentDate.toISOString()}`);

        await progressRef.update({
            enrollmentDate: newEnrollmentTimestamp,
            baseMediocrePace: null, // Reset base pace, it will be recalculated
            lastActivityDate: firebase.firestore.FieldValue.serverTimestamp() // Update last activity
        });

        console.log(`Successfully updated enrollmentDate for user ${targetUserId}, course ${courseId}.`);

        // If the admin is operating on their own account (unlikely for this feature but possible)
        // or if more sophisticated state management is needed for other users,
        // you might need to update local state here (userCourseProgressMap).
        // For simplicity, this example relies on a page refresh or re-navigating to see full effects
        // for the target user if they are not the current admin.

        return true;
    } catch (error) {
        console.error(`Error in adminSimulateDaysPassed for user ${targetUserId}, course ${courseId}:`, error);
        let alertMessage = `Failed to simulate days passed: ${error.message}`;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            alertMessage = `Failed to simulate days passed: Permission Denied. Check Firestore rules. Details: ${error.message}`;
        }
        // Throw the error so the calling UI can handle it (e.g., show alert)
        throw new Error(alertMessage);
    }
}

export async function adminAddGlobalSubject(subjectData) {
    if (!currentUser?.isAdmin) throw new Error("Admin privileges required.");
    const subjectsRef = db.collection('subjects');
    // Remove user-progress fields before saving definition
    const { chapters, studied_chapters, pending_exams, ...definitionToSave } = subjectData;
    definitionToSave.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    definitionToSave.creatorUid = currentUser.uid;
    definitionToSave.creatorName = currentUser.displayName || currentUser.email;

    const docRef = await subjectsRef.add(definitionToSave);
    const newSubjectDef = { id: docRef.id, ...definitionToSave, chapters: {} }; // Add with empty chapters locally
    updateGlobalSubjectDefinition(docRef.id, newSubjectDef); // Update local cache
    // Potentially trigger a re-merge for current user's `data.subjects`
    return newSubjectDef;
}

export async function adminUpdateGlobalSubjectDefinition(subjectId, updates) {
    if (!currentUser?.isAdmin) throw new Error("Admin privileges required.");
    const subjectRef = db.collection('subjects').doc(subjectId);
    // Ensure no user-progress fields are in 'updates'
    const { chapters, studied_chapters, pending_exams, ...definitionUpdates } = updates;
    definitionUpdates.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    await subjectRef.update(definitionUpdates);
    const updatedDoc = await subjectRef.get();
    const updatedDef = { id: updatedDoc.id, ...updatedDoc.data(), chapters: {} };
    updateGlobalSubjectDefinition(subjectId, updatedDef); // Update local cache
    return updatedDef;
}

export async function adminDeleteGlobalSubject(subjectId) {
    if (!currentUser?.isAdmin) throw new Error("Admin privileges required.");
    // Consider implications: what happens to user progress for this subject?
    // For now, just deletes the global definition. User progress might become orphaned.
    await db.collection('subjects').doc(subjectId).delete();
    globalSubjectDefinitionsMap.delete(subjectId); // Remove from local cache
    // Potentially trigger a re-merge for current user's `data.subjects`
}

// --- NEW FUNCTION: Get Course Details ---
/**
 * Fetches course details, first from global map, then from Firestore.
 * @param {string} courseId - The ID of the course to fetch.
 * @returns {Promise<object|null>} - Course data object or null if not found.
 */
export async function getCourseDetails(courseId) {
    if (!courseId) {
        console.warn("[getCourseDetails] Course ID is missing.");
        return null;
    }

    // 1. Check globalCourseDataMap first
    if (globalCourseDataMap && globalCourseDataMap.has(courseId)) {
        console.log(`[getCourseDetails] Found course ${courseId} in globalCourseDataMap.`);
        return globalCourseDataMap.get(courseId);
    }

    // 2. If not in map, fetch from Firestore
    if (!db) {
        console.error("[getCourseDetails] Firestore DB not initialized.");
        return null;
    }
    console.log(`[getCourseDetails] Course ${courseId} not in map, fetching from Firestore...`);
    const courseRef = db.collection('courses').doc(courseId);

    try {
        const docSnap = await courseRef.get();
        if (docSnap.exists) {
            console.log(`[getCourseDetails] Successfully fetched course ${courseId} from Firestore.`);
            const courseData = docSnap.data();
            // Optionally, update the global map (though loadGlobalCourseDefinitions should handle this)
            // updateGlobalCourseData(courseId, { id: courseId, ...courseData });
            return { id: courseId, ...courseData }; // Ensure ID is part of the returned object
        } else {
            console.warn(`[getCourseDetails] Course document ${courseId} not found in Firestore.`);
            return null;
        }
    } catch (error) {
        console.error(`[getCourseDetails] Error fetching course ${courseId} from Firestore:`, error);
        return null;
    }
}
// --- END NEW FUNCTION ---

// --- NEW FUNCTION: Save Automated Course to Firestore ---
/**
 * Saves or updates a course document in the 'courses' collection using courseData.courseDirName as the document ID.
 * Handles 'createdAt' and 'updatedAt' fields, converting them to server timestamps if needed.
 * @param {object} courseData - The course data object. Expected to have courseDirName.
 * @returns {Promise<object>} - An object like { success: true, courseId: docId } or { success: false, message: error.message }.
 */
export async function saveAutomatedCourseToFirestore(courseData) {
    if (!db) {
        console.error("[saveAutomatedCourseToFirestore] Firestore DB not initialized.");
        return { success: false, message: "Database not initialized." };
    }
    if (!courseData || !courseData.courseDirName) {
        console.error("[saveAutomatedCourseToFirestore] courseData or courseData.courseDirName is missing.");
        return { success: false, message: "Course data or course directory name is missing." };
    }

    const courseId = courseData.courseDirName;
    const courseRef = db.collection('courses').doc(courseId);

    let dataToSave = { ...courseData };

    // Handle createdAt timestamp
    if (dataToSave.createdAt) {
        if (typeof dataToSave.createdAt === 'string') {
            try {
                const date = new Date(dataToSave.createdAt);
                if (!isNaN(date)) {
                    dataToSave.createdAt = firebase.firestore.Timestamp.fromDate(date);
                } else {
                    console.warn(`[saveAutomatedCourseToFirestore] Invalid date string for createdAt: ${dataToSave.createdAt}. Setting to server timestamp.`);
                    dataToSave.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                }
            } catch (e) {
                console.warn(`[saveAutomatedCourseToFirestore] Error parsing createdAt string: ${e}. Setting to server timestamp.`);
                dataToSave.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            }
        } else if (!(dataToSave.createdAt instanceof firebase.firestore.Timestamp) &&
                   !(typeof dataToSave.createdAt === 'object' && dataToSave.createdAt._methodName === 'FieldValue.serverTimestamp')) {
            // If it's an object but not a Firestore Timestamp or FieldValue.serverTimestamp (e.g. from JSON.parse of a serverTimestamp placeholder)
            // This case might be complex if SDK versions differ in how serverTimestamp placeholders are serialized/deserialized.
            // For robustness, if it's not a recognized valid type, default to server timestamp.
            console.warn(`[saveAutomatedCourseToFirestore] createdAt is not a string or Firestore Timestamp. Type: ${typeof dataToSave.createdAt}. Setting to server timestamp.`);
            dataToSave.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        // If it's already a Firestore Timestamp or FieldValue.serverTimestamp, it's fine.
    } else {
        // If createdAt is not provided at all
        dataToSave.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    // Always set/update updatedAt to server timestamp
    dataToSave.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    try {
        await courseRef.set(dataToSave, { merge: true }); // Use merge:true to allow updates if doc exists
        console.log(`[saveAutomatedCourseToFirestore] Course data successfully saved/updated for document ID: ${courseId}`);
        return { success: true, courseId: courseId };
    } catch (error) {
        console.error(`[saveAutomatedCourseToFirestore] Error saving course data for document ID ${courseId}:`, error);
        let message = `Failed to save course data: ${error.message}`;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            message = `Failed to save course data: Permission Denied. Check Firestore rules. Details: ${error.message}`;
        }
        return { success: false, message: message, error: error };
    }
}
// --- END NEW FUNCTION ---

// --- NEW FUNCTION: Approve Course ---
/**
 * Approves a course by updating its status in Firestore.
 * @param {string} courseId - The ID of the course to approve.
 * @returns {Promise<object>} - Result object { success: boolean, message: string }.
 */
export async function approveCourse(courseId) {
    if (!db) {
        console.error("[approveCourse] Firestore DB not initialized.");
        return { success: false, message: "Database not initialized." };
    }
    if (!currentUser || !currentUser.isAdmin) {
        console.error("[approveCourse] Permission Denied: Admin privileges required.");
        return { success: false, message: "Admin privileges required to approve courses." };
    }
    if (!courseId) {
        console.error("[approveCourse] Course ID is missing.");
        return { success: false, message: "Course ID is missing." };
    }

    const courseRef = db.collection('courses').doc(courseId);
    console.log(`[approveCourse] Admin ${currentUser.uid} attempting to approve course: ${courseId}`);

    try {
        await courseRef.update({
            status: "approved",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[approveCourse] Course ${courseId} successfully approved.`);
        
        // Optionally, update local globalCourseDataMap if the course exists there
        if (globalCourseDataMap.has(courseId)) {
            const courseData = globalCourseDataMap.get(courseId);
            if (courseData) {
                courseData.status = "approved";
                courseData.updatedAt = new Date(); // Reflect immediate change locally
                updateGlobalCourseData(courseId, courseData); // Update state
                 console.log(`[approveCourse] Local cache for course ${courseId} updated to 'approved'.`);
            }
        }
        
        return { success: true, message: `Course "${courseId}" approved successfully.` };
    } catch (error) {
        console.error(`[approveCourse] Error approving course ${courseId}:`, error);
        let message = `Failed to approve course: ${error.message}`;
        if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
            message = `Failed to approve course: Permission Denied. Check Firestore rules. Details: ${error.message}`;
        }
        return { success: false, message: message };
    }
}
// --- END NEW FUNCTION ---

export async function sendGlobalAnnouncementToAllUsers(subject, body, adminSenderId) {
    if (!db || !currentUser || !currentUser.isAdmin) {
        return { success: false, count: 0, message: "Admin privileges required." };
    }
    if (!subject || !body) {
        return { success: false, count: 0, message: "Subject and body are required." };
    }

    console.log(`Admin ${adminSenderId} sending global announcement: "${subject}"`);
    let usersProcessed = 0;
    const BATCH_SIZE = 400; // Firestore batch limit is 500 writes, leave some room.

    try {
        let lastUserSnapshot = null;
        let moreUsers = true;
        let totalUsersSnapshots = 0;

        while (moreUsers) {
            let query = db.collection('users').orderBy(firebase.firestore.FieldPath.documentId()).limit(BATCH_SIZE);
            if (lastUserSnapshot) {
                query = query.startAfter(lastUserSnapshot);
            }

            const usersSnapshot = await query.get();
            totalUsersSnapshots += usersSnapshot.size;

            if (usersSnapshot.empty) {
                moreUsers = false;
                break;
            }

            const batch = db.batch();
            usersSnapshot.forEach(userDoc => {
                const userId = userDoc.id;
                const inboxRef = db.collection('users').doc(userId).collection('inbox').doc(); // Auto-generate ID
                batch.set(inboxRef, {
                    senderId: adminSenderId, // Could also be 'system_announcement'
                    senderName: `Admin (${currentUser.displayName || 'Lyceum'})`,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    subject: `📢 Announcement: ${subject}`,
                    body: body, // Body can contain HTML, will be rendered as such in inbox
                    isRead: false,
                    isGlobalAnnouncement: true // Flag for special styling/handling
                });
                usersProcessed++;
            });

            await batch.commit();
            console.log(`Sent announcement to batch of ${usersSnapshot.size} users. Total processed so far: ${usersProcessed}`);

            if (usersSnapshot.size < BATCH_SIZE) {
                moreUsers = false; // Last batch
            } else {
                lastUserSnapshot = usersSnapshot.docs[usersSnapshot.docs.length - 1];
            }
            // Safety break if something goes wrong with pagination, though less likely with document ID ordering
            if (totalUsersSnapshots > 10000 && BATCH_SIZE > 0) { // Arbitrary large number
                 console.warn("Global announcement processing stopped after 10,000 users to prevent runaway loop.");
                 moreUsers = false;
                 return { success: false, count: usersProcessed, message: "Processing stopped after 10,000 users. Some users may not have received the announcement." };
            }
        }

        console.log(`Global announcement sent to ${usersProcessed} users.`);
        return { success: true, count: usersProcessed, message: `Announcement sent to ${usersProcessed} users.` };

    } catch (error) {
        console.error("Error sending global announcement:", error);
        let message = `Failed to send global announcement: ${error.message}`;
        if (error.code === 'permission-denied') {
             message = `Failed to send global announcement: Permission Denied. Check Firestore rules. Details: ${error.message}`;
        }
        return { success: false, count: usersProcessed, message: message };
    }
}

export async function saveUserExperimentalFeatureSettings(userId, experimentalFeatureSettings) {
    if (!db) {
        console.error("Firestore DB not initialized");
        window.playUiSound?.('error');
        return false;
    }
    if (!userId || !experimentalFeatureSettings) {
        console.warn("saveUserExperimentalFeatureSettings: Missing userId or settings.");
        window.playUiSound?.('error');
        return false;
    }

    const userRef = db.collection('users').doc(userId);
    try {
        // Use dot notation to update only the experimentalFeatures field within userSettings
        await userRef.update({
            'userSettings.experimentalFeatures': experimentalFeatureSettings
        });
        console.log(`User experimental feature settings saved successfully for user ${userId}.`);

        // Update local currentUser state if it's the currently logged-in user
        if (currentUser && currentUser.uid === userId) {
            const updatedSettings = {
                ...(currentUser.userSettings || {}), // Preserve other potential userSettings
                experimentalFeatures: {
                    ...(currentUser.userSettings?.experimentalFeatures || DEFAULT_EXPERIMENTAL_FEATURES), // Merge with defaults
                    ...experimentalFeatureSettings // Apply new changes
                }
            };
            setCurrentUser({ ...currentUser, userSettings: updatedSettings });
            console.log("Local currentUser experimental features updated:", currentUser.userSettings.experimentalFeatures);
        }
        return true;
    } catch (error) {
        console.error(`Error saving user experimental feature settings for user ${userId}:`, error);
        alert("Error saving feature settings: " + error.message);
        window.playUiSound?.('error');
        return false;
    }
}

// --- END OF FILE firebase_firestore.js ---