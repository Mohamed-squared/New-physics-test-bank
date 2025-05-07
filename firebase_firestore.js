// firebase_firestore.js

import {
    db, auth as firebaseAuth, data, setData, currentSubject, setCurrentSubject,
    userCourseProgressMap, setUserCourseProgressMap, updateGlobalCourseData, globalCourseDataMap,
    activeCourseId, setActiveCourseId, updateUserCourseProgress, currentUser, setCurrentUser,
    setUserAiChatSettings, globalAiSystemPrompts, setGlobalAiSystemPrompts // MODIFICATION: Import globalAiSystemPrompts, setGlobalAiSystemPrompts
} from './state.js';
import { showLoading, hideLoading, getFormattedDate } from './utils.js';
import { updateChaptersFromMarkdown } from './markdown_parser.js';
// Import ALL needed config values
import { 
    initialSubjectData, ADMIN_UID, DEFAULT_PROFILE_PIC_URL, FOP_COURSE_ID, 
    FOP_COURSE_DEFINITION, GRADING_WEIGHTS, PASSING_GRADE_PERCENT, 
    SKIP_EXAM_PASSING_PERCENT, COURSE_BASE_PATH, SUBJECT_RESOURCE_FOLDER,
    DEFAULT_PRIMARY_AI_MODEL, DEFAULT_FALLBACK_AI_MODEL
} from './config.js';
import { AI_FUNCTION_KEYS, DEFAULT_AI_SYSTEM_PROMPTS } from './ai_prompts.js'; // MODIFICATION: Import AI_FUNCTION_KEYS, DEFAULT_AI_SYSTEM_PROMPTS
import { updateSubjectInfo, fetchAndUpdateUserInfo } from './ui_core.js';
import { showOnboardingUI } from './ui_onboarding.js';
import { determineTodaysObjective, calculateTotalMark, getLetterGrade } from './course_logic.js';
import { cleanTextForFilename } from './filename_utils.js';

// --- Constants ---
const userFormulaSheetSubCollection = "userFormulaSheets";
const userSummarySubCollection = "userChapterSummaries";
const sharedNotesCollection = "sharedCourseNotes";
const adminTasksCollection = "adminTasks";
const userCreditLogSubCollection = "creditLog";
const aiChatSessionsSubCollection = "aiChatSessions"; // New constant for AI Chat
const globalSettingsCollection = "settings"; // MODIFICATION: New constant
const aiPromptsDocId = "aiPrompts"; // MODIFICATION: New constant


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
    try {
        const cleanData = JSON.parse(JSON.stringify(appDataToSave));

        if (cleanData && cleanData.subjects) {
             Object.values(cleanData.subjects).forEach(subject => {
                 if (subject && subject.chapters) {
                      Object.values(subject.chapters).forEach(chap => {
                          chap.total_questions = Number(chap.total_questions) || 0;
                          chap.total_attempted = Number(chap.total_attempted) || 0;
                          chap.total_wrong = Number(chap.total_wrong) || 0;
                          chap.consecutive_mastery = Number(chap.consecutive_mastery) || 0;
                          chap.available_questions = Array.isArray(chap.available_questions) ? chap.available_questions : [];
                          chap.mistake_history = Array.isArray(chap.mistake_history) ? chap.mistake_history : [];
                      });
                 }
                 subject.studied_chapters = Array.isArray(subject.studied_chapters) ? subject.studied_chapters : [];
                 subject.pending_exams = Array.isArray(subject.pending_exams) ? subject.pending_exams : [];
                 subject.status = subject.status || 'approved'; 
                 subject.creatorUid = subject.creatorUid || ADMIN_UID; 
                 subject.creatorName = subject.creatorName || 'System'; 
                 subject.createdAt = subject.createdAt || new Date(0).toISOString(); 
             });
        }
        
        console.log(`[saveUserData] Attempting to update appData for UID: ${uid}. Current auth UID: ${firebaseAuth?.currentUser?.uid}`);
        console.log(`[saveUserData] Data keys in appDataToSave: ${Object.keys(appDataToSave || {}).join(', ')}`);
        try {
            const cleanDataString = JSON.stringify(cleanData);
            console.log(`[saveUserData] Cleaned appData (first 500 chars): ${cleanDataString.substring(0, 500)}${cleanDataString.length > 500 ? '...' : ''}`);
            if (cleanDataString.includes('undefined')) {
                console.warn("[saveUserData] WARNING: 'undefined' string found in cleanData. This might indicate an issue if it's not an intentional string value.");
            }
        } catch (e) {
            console.warn("[saveUserData] Could not stringify cleanData for logging:", e);
        }
        
        await userRef.update({
            appData: cleanData
        });
        console.log("User appData saved successfully.");
    } catch (error) {
        console.error("Error saving user appData to Firestore. UID:", uid, "Error Name:", error.name, "Error Code:", error.code, "Error Message:", error.message, "Full Error:", error);
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
        const dataToSave = JSON.parse(JSON.stringify(progressData));

        if (dataToSave.enrollmentDate) {
             if (dataToSave.enrollmentDate instanceof Date) { 
                try {
                    dataToSave.enrollmentDate = firebase.firestore.Timestamp.fromDate(dataToSave.enrollmentDate);
                    console.log("[saveUserCourseProgress] Converted enrollmentDate (JS Date) to Firestore Timestamp for saving.");
                } catch (e) {
                    console.error("[saveUserCourseProgress] Error converting enrollmentDate JS Date to Timestamp:", e, dataToSave.enrollmentDate);
                    delete dataToSave.enrollmentDate; 
                }
             } else if (typeof dataToSave.enrollmentDate === 'object' && dataToSave.enrollmentDate?._methodName === 'serverTimestamp') {
                 console.log("[saveUserCourseProgress] enrollmentDate is already a serverTimestamp, keeping as is.");
             } else { // String or Number
                 try {
                     const dateObj = new Date(dataToSave.enrollmentDate);
                     if (!isNaN(dateObj)) {
                          dataToSave.enrollmentDate = firebase.firestore.Timestamp.fromDate(dateObj);
                          console.log("[saveUserCourseProgress] Converted enrollmentDate (String/Number) to Firestore Timestamp for saving.");
                     } else {
                          console.warn("[saveUserCourseProgress] Invalid enrollmentDate value (String/Number), deleting:", dataToSave.enrollmentDate);
                          delete dataToSave.enrollmentDate;
                     }
                 } catch(e) {
                      console.warn("[saveUserCourseProgress] Error processing non-Date/non-ServerTimestamp enrollmentDate, deleting:", e, dataToSave.enrollmentDate);
                      delete dataToSave.enrollmentDate;
                 }
             }
        }

         if (dataToSave.completionDate) {
             if (dataToSave.completionDate instanceof Date) { 
                try {
                    dataToSave.completionDate = firebase.firestore.Timestamp.fromDate(dataToSave.completionDate);
                    console.log("[saveUserCourseProgress] Converted completionDate (JS Date) to Firestore Timestamp for saving.");
                } catch (e) {
                    console.error("[saveUserCourseProgress] Error converting completionDate JS Date to Timestamp:", e, dataToSave.completionDate);
                    delete dataToSave.completionDate;
                }
             } else { // String or Number
                 try {
                     const dateObj = new Date(dataToSave.completionDate);
                     if (!isNaN(dateObj)) {
                         dataToSave.completionDate = firebase.firestore.Timestamp.fromDate(dateObj);
                         console.log("[saveUserCourseProgress] Converted completionDate (String/Number) to Firestore Timestamp for saving.");
                     } else {
                         console.warn("[saveUserCourseProgress] Invalid completionDate value (String/Number), setting to null:", dataToSave.completionDate);
                         dataToSave.completionDate = null; 
                     }
                 } catch (e) {
                     console.warn("[saveUserCourseProgress] Error processing non-Date completionDate, setting to null:", e, dataToSave.completionDate);
                     dataToSave.completionDate = null;
                 }
             }
        } else if (dataToSave.completionDate === undefined) {
             dataToSave.completionDate = null;
        }

        dataToSave.lastActivityDate = firebase.firestore.FieldValue.serverTimestamp();
        console.log("[saveUserCourseProgress] Setting lastActivityDate to serverTimestamp for save.");

        dataToSave.enrollmentMode = dataToSave.enrollmentMode || 'full'; 
        dataToSave.courseStudiedChapters = dataToSave.courseStudiedChapters || [];
        dataToSave.watchedVideoUrls = dataToSave.watchedVideoUrls || {};
        dataToSave.watchedVideoDurations = dataToSave.watchedVideoDurations || {};
        dataToSave.pdfProgress = dataToSave.pdfProgress || {};
        dataToSave.skipExamAttempts = dataToSave.skipExamAttempts || {};
        dataToSave.lastSkipExamScore = dataToSave.lastSkipExamScore || {};
        dataToSave.dailyProgress = dataToSave.dailyProgress || {};
        dataToSave.assignmentScores = dataToSave.assignmentScores || {};
        dataToSave.weeklyExamScores = dataToSave.weeklyExamScores || {};
        dataToSave.midcourseExamScores = dataToSave.midcourseExamScores || {};
        if (dataToSave.finalExamScores === undefined) { dataToSave.finalExamScores = null; }
        Object.keys(dataToSave.dailyProgress).forEach(dateStr => {
            dataToSave.dailyProgress[dateStr] = dataToSave.dailyProgress[dateStr] || {}; 
            dataToSave.dailyProgress[dateStr].chaptersStudied = dataToSave.dailyProgress[dateStr].chaptersStudied || [];
            dataToSave.dailyProgress[dateStr].skipExamsPassed = dataToSave.dailyProgress[dateStr].skipExamsPassed || [];
            dataToSave.dailyProgress[dateStr].assignmentCompleted = dataToSave.dailyProgress[dateStr].assignmentCompleted ?? false;
            dataToSave.dailyProgress[dateStr].assignmentScore = dataToSave.dailyProgress[dateStr].assignmentScore ?? null;
        });

        console.log(`[saveUserCourseProgress] Data ready for Firestore set for course ${courseId}. Keys: ${Object.keys(dataToSave).join(', ')}`);
        await progressRef.set(dataToSave, { merge: true });
        console.log(`User course progress saved successfully for course ${courseId}.`);
        return true;
    } catch (error) {
        console.error(`Error saving course progress for course ${courseId}:`, error);
        alert(`Error saving course progress: ${error.message}`);
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
        alert(`Failed to unenroll: ${error.message}`);
        return false;
    }
}


// --- Global Course Definitions ---
/**
 * Loads global course definition data from Firestore.
 * Updates the `globalCourseDataMap` state.
 * Ensures FoP exists in Firestore, creating it from config if missing.
 * Initializes imageUrl, coverUrl, prerequisites (as string array), and corequisites (as string array).
 */
export async function loadGlobalCourseDefinitions() {
    if (!db) { console.error("Firestore DB not initialized"); return; }
    console.log("Loading global course definitions...");
    const coursesRef = db.collection('courses');
    let fopFoundInFirestore = false;

    try {
        const snapshot = await coursesRef.get();
        snapshot.forEach(doc => {
            const courseData = doc.data();
            let finalCourseData = { ...courseData, id: doc.id }; 

            finalCourseData.chapterResources = typeof finalCourseData.chapterResources === 'object' ? finalCourseData.chapterResources : {};
            finalCourseData.youtubePlaylistUrls = Array.isArray(finalCourseData.youtubePlaylistUrls) ? finalCourseData.youtubePlaylistUrls : (finalCourseData.youtubePlaylistUrl ? [finalCourseData.youtubePlaylistUrl] : []);
            finalCourseData.chapters = Array.isArray(finalCourseData.chapters) ? finalCourseData.chapters : [];
            finalCourseData.midcourseChapters = Array.isArray(finalCourseData.midcourseChapters) ? finalCourseData.midcourseChapters : [];
            finalCourseData.totalChapters = Number(finalCourseData.totalChapters) || (Array.isArray(finalCourseData.chapters) ? finalCourseData.chapters.length : 0); 
            finalCourseData.imageUrl = finalCourseData.imageUrl || null;
            finalCourseData.coverUrl = finalCourseData.coverUrl || null;
            finalCourseData.prerequisites = Array.isArray(finalCourseData.prerequisites)
                                            ? finalCourseData.prerequisites.filter(item => typeof item === 'string')
                                            : [];
            finalCourseData.corequisites = Array.isArray(finalCourseData.corequisites)
                                           ? finalCourseData.corequisites.filter(item => typeof item === 'string')
                                           : [];

            updateGlobalCourseData(doc.id, finalCourseData);
            console.log(`Loaded global course definition: ${finalCourseData.name} (${doc.id}), Status: ${finalCourseData.status || 'N/A'}`);

            if (doc.id === FOP_COURSE_ID) {
                fopFoundInFirestore = true;
                console.log(`FoP course ${FOP_COURSE_ID} found in Firestore.`);
            }
        });

        if (!fopFoundInFirestore) {
            console.log(`FOP course ${FOP_COURSE_ID} not found in Firestore. Creating it from local config...`);
            const fopDef = {...FOP_COURSE_DEFINITION}; 
            fopDef.id = FOP_COURSE_ID; 
            fopDef.status = 'approved'; 
            fopDef.chapterResources = typeof fopDef.chapterResources === 'object' ? fopDef.chapterResources : {};
            fopDef.youtubePlaylistUrls = fopDef.youtubePlaylistUrls || (fopDef.youtubePlaylistUrl ? [fopDef.youtubePlaylistUrl] : []);
            fopDef.chapters = Array.isArray(fopDef.chapters) ? fopDef.chapters : [];
            fopDef.midcourseChapters = Array.isArray(fopDef.midcourseChapters) ? fopDef.midcourseChapters : [];
            fopDef.totalChapters = Number(fopDef.totalChapters) || (Array.isArray(fopDef.chapters) ? fopDef.chapters.length : 0);
            fopDef.imageUrl = fopDef.imageUrl || null;
            fopDef.coverUrl = fopDef.coverUrl || null;
            fopDef.prerequisites = Array.isArray(fopDef.prerequisites)
                                   ? fopDef.prerequisites.filter(item => typeof item === 'string')
                                   : [];
            fopDef.corequisites = Array.isArray(fopDef.corequisites)
                                  ? fopDef.corequisites.filter(item => typeof item === 'string')
                                  : [];

            fopDef.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            fopDef.creatorUid = ADMIN_UID; 
            fopDef.creatorName = 'System (Config)';

            try {
                await db.collection('courses').doc(FOP_COURSE_ID).set(fopDef, { merge: true });
                console.log(`Successfully created FOP course ${FOP_COURSE_ID} document in Firestore.`);
                const createdDoc = await db.collection('courses').doc(FOP_COURSE_ID).get();
                if (createdDoc.exists) {
                    const createdData = { id: FOP_COURSE_ID, ...createdDoc.data() };
                    createdData.chapterResources = typeof createdData.chapterResources === 'object' ? createdData.chapterResources : {};
                    createdData.youtubePlaylistUrls = Array.isArray(createdData.youtubePlaylistUrls) ? createdData.youtubePlaylistUrls : (createdData.youtubePlaylistUrl ? [createdData.youtubePlaylistUrl] : []);
                    createdData.chapters = Array.isArray(createdData.chapters) ? createdData.chapters : [];
                    createdData.midcourseChapters = Array.isArray(createdData.midcourseChapters) ? createdData.midcourseChapters : [];
                    createdData.totalChapters = Number(createdData.totalChapters) || (Array.isArray(createdData.chapters) ? createdData.chapters.length : 0);
                    createdData.imageUrl = createdData.imageUrl || null;
                    createdData.coverUrl = createdData.coverUrl || null;
                    createdData.prerequisites = Array.isArray(createdData.prerequisites)
                                                ? createdData.prerequisites.filter(item => typeof item === 'string')
                                                : [];
                    createdData.corequisites = Array.isArray(createdData.corequisites)
                                                ? createdData.corequisites.filter(item => typeof item === 'string')
                                                : [];
                    updateGlobalCourseData(FOP_COURSE_ID, createdData); 
                } else {
                    console.error(`Failed to fetch FOP course ${FOP_COURSE_ID} immediately after creation.`);
                     updateGlobalCourseData(FOP_COURSE_ID, { ...fopDef, createdAt: new Date() }); 
                }
            } catch (creationError) {
                console.error(`Error creating FOP course ${FOP_COURSE_ID} document in Firestore:`, creationError);
                 updateGlobalCourseData(FOP_COURSE_ID, { ...fopDef, createdAt: new Date() });
            }
        }

    } catch (error) {
        console.error("Error loading global course definitions:", error);
        if (!globalCourseDataMap.has(FOP_COURSE_ID)) {
             console.log(`Firestore fetch failed, attempting to load FOP ${FOP_COURSE_ID} from local config as fallback.`);
             const fopDef = {...FOP_COURSE_DEFINITION}; 
             fopDef.id = FOP_COURSE_ID;
             fopDef.status = 'approved';
             fopDef.youtubePlaylistUrls = fopDef.youtubePlaylistUrls || (fopDef.youtubePlaylistUrl ? [fopDef.youtubePlaylistUrl] : []);
             fopDef.chapterResources = typeof fopDef.chapterResources === 'object' ? fopDef.chapterResources : {};
             fopDef.chapters = Array.isArray(fopDef.chapters) ? fopDef.chapters : [];
             fopDef.midcourseChapters = Array.isArray(fopDef.midcourseChapters) ? fopDef.midcourseChapters : [];
             fopDef.totalChapters = Number(fopDef.totalChapters) || (Array.isArray(fopDef.chapters) ? fopDef.chapters.length : 0);
             fopDef.imageUrl = fopDef.imageUrl || null;
             fopDef.coverUrl = fopDef.coverUrl || null;
             fopDef.prerequisites = Array.isArray(fopDef.prerequisites)
                                    ? fopDef.prerequisites.filter(item => typeof item === 'string')
                                    : [];
             fopDef.corequisites = Array.isArray(fopDef.corequisites)
                                   ? fopDef.corequisites.filter(item => typeof item === 'string')
                                   : [];
             updateGlobalCourseData(FOP_COURSE_ID, fopDef);
        }
    }
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
        alert("Error saving AI settings: " + error.message);
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
        alert("Error saving global AI prompts: " + error.message);
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
export async function loadUserData(uid) {
    if (!db) { console.error("Firestore DB not initialized"); return; }
    if (!uid) { console.error("loadUserData called without UID."); return; }

    console.log(`Loading user data for user: ${uid}`);
    const userRef = db.collection('users').doc(uid);
    try {
        const doc = await userRef.get();
        let needsAppDataSaveAfterLoad = false;

        if (doc.exists) {
            const userData = doc.data();
            let loadedAppData = userData.appData;
            console.log("User appData loaded from Firestore.");

            const userProfileForState = {
                uid: uid,
                email: userData.email || firebaseAuth?.currentUser?.email,
                displayName: userData.displayName || firebaseAuth?.currentUser?.displayName,
                photoURL: userData.photoURL || firebaseAuth?.currentUser?.photoURL,
                username: userData.username || null,
                isAdmin: userData.isAdmin !== undefined ? (uid === ADMIN_UID || userData.isAdmin) : (uid === ADMIN_UID),
                credits: userData.credits !== undefined ? Number(userData.credits) : 0, 
                onboardingComplete: userData.onboardingComplete !== undefined ? userData.onboardingComplete : false,
            };
            console.log("[loadUserData] setCurrentUser will be called with userProfileForState:", JSON.parse(JSON.stringify(userProfileForState)));
            setCurrentUser(userProfileForState); 

            try {
                const aiSettings = await loadUserAiSettings(uid);
                setUserAiChatSettings(aiSettings); 
                console.log(`[loadUserData] User AI Chat Settings loaded and set for UID: ${uid}`, aiSettings);
            } catch (error) {
                console.error(`[loadUserData] Error loading AI Chat Settings for UID: ${uid}. Setting to defaults.`, error);
                 setUserAiChatSettings(getDefaultAiSettings());
            }


            if (!loadedAppData || typeof loadedAppData.subjects !== 'object') {
                console.warn("Loaded appData missing or invalid 'subjects'. Resetting to default.");
                loadedAppData = JSON.parse(JSON.stringify(initialSubjectData));
                needsAppDataSaveAfterLoad = true;
            }
             if (userData.photoURL === undefined) {
                console.log("Initializing top-level photoURL.");
                 const authUser = firebaseAuth?.currentUser;
                await userRef.update({ photoURL: authUser?.photoURL || DEFAULT_PROFILE_PIC_URL }).catch(e => console.error("Error setting initial photoURL:", e));
             }
             if (userData.completedCourseBadges === undefined) {
                  console.log("Initializing completedCourseBadges array.");
                  await userRef.update({ completedCourseBadges: [] }).catch(e => console.error("Error setting initial completedCourseBadges:", e));
             }
              if (userData.userNotes === undefined) {
                  console.log("Initializing userNotes map.");
                  await userRef.update({ userNotes: {} }).catch(e => console.error("Error setting initial userNotes:", e));
             }
             if (userData.isAdmin === undefined) {
                 console.log(`Initializing isAdmin field for user ${uid}.`);
                 await userRef.update({ isAdmin: (uid === ADMIN_UID) }).catch(e => console.error("Error setting initial isAdmin field:", e));
             }
             if (userData.credits === undefined) {
                console.log(`Initializing credits field for user ${uid}.`);
                await userRef.update({ credits: 0 }).catch(e => console.error("Error setting initial credits field:", e));
             }
             if (userData.userAiChatSettings === undefined) {
                console.log(`Initializing userAiChatSettings field for user ${uid}.`);
                await saveUserAiSettings(uid, getDefaultAiSettings()); 
             }


            setData(loadedAppData); 

            console.log("Syncing loaded subject appData with Markdown files...");
             let appDataWasModifiedBySync = false;
             if (data && data.subjects) {
                 for (const subjectId in data.subjects) {
                     const subject = data.subjects[subjectId];
                     if (!subject) continue;

                     if (currentUser && (currentUser.isAdmin || subject.status === 'approved')) {
                         const subjectMarkdown = await fetchMarkdownForSubject(subject);
                         if (subjectMarkdown !== null) {
                              const subjectModified = updateChaptersFromMarkdown(subject, subjectMarkdown);
                              if (subjectModified) { appDataWasModifiedBySync = true; }
                         } else { console.warn(`Skipping MD sync for Subject ${subject.name} (ID: ${subjectId}) - MD file missing or could not be fetched from expected path.`); }
                     } else {
                         console.log(`Skipping MD sync for Subject ${subject.name} (ID: ${subjectId}) due to status '${subject.status}' and user role.`);
                         subject.chapters = subject.chapters || {};
                     }
                 }
                 if (appDataWasModifiedBySync) { needsAppDataSaveAfterLoad = true; }
             } else { console.warn("Cannot sync appData with Markdown - state.data.subjects is missing."); }

              if (data && data.subjects) {
                 for (const subjectId in data.subjects) {
                     const subject = data.subjects[subjectId];
                     if (!subject) continue;
                     if (!subject.name) { subject.name = `Subject ${subjectId}`; needsAppDataSaveAfterLoad = true; }
                     if (!subject.fileName) { subject.fileName = `${cleanTextForFilename(subject.name || `subject_${subjectId}`)}.md`; needsAppDataSaveAfterLoad = true; } 
                     subject.studied_chapters = Array.isArray(subject.studied_chapters) ? subject.studied_chapters : [];
                     subject.pending_exams = Array.isArray(subject.pending_exams) ? subject.pending_exams.map(exam => ({ ...exam, id: exam.id || `pending_${Date.now()}` })) : [];
                     subject.mcqProblemRatio = typeof subject.mcqProblemRatio === 'number' ? subject.mcqProblemRatio : 0.5;
                     subject.defaultTestDurationMinutes = Number(subject.defaultTestDurationMinutes) || 120;
                     subject.max_questions_per_test = Number(subject.max_questions_per_test) || 42;

                     subject.status = subject.status || 'approved';
                     subject.creatorUid = subject.creatorUid || ADMIN_UID; 
                     subject.creatorName = subject.creatorName || 'System';
                     subject.createdAt = subject.createdAt || new Date(0).toISOString();


                     subject.chapters = typeof subject.chapters === 'object' ? subject.chapters : {};
                     if (currentUser && (currentUser.isAdmin || subject.status === 'approved')) {
                         for (const chapNum in subject.chapters) {
                            const chap = subject.chapters[chapNum];
                            if (!chap) continue;
                            chap.total_questions = Number(chap.total_questions) ?? 0;
                            chap.total_attempted = Number(chap.total_attempted) ?? 0;
                            chap.total_wrong = Number(chap.total_wrong) ?? 0;
                            chap.mistake_history = Array.isArray(chap.mistake_history) ? chap.mistake_history : [];
                            chap.consecutive_mastery = Number(chap.consecutive_mastery) ?? 0;
                            const expectedAvailable = Array.from({ length: chap.total_questions }, (_, j) => j + 1);
                            const currentAvailableSet = new Set(Array.isArray(chap.available_questions) ? chap.available_questions : []);
                            const validAvailable = expectedAvailable.filter(qNum => currentAvailableSet.has(qNum));
                            if (JSON.stringify(validAvailable.sort((a,b) => a-b)) !== JSON.stringify((chap.available_questions || []).sort((a,b)=>a-b))) {
                                 chap.available_questions = validAvailable; needsAppDataSaveAfterLoad = true;
                            } else if (chap.available_questions === undefined) {
                                 chap.available_questions = validAvailable; needsAppDataSaveAfterLoad = true;
                            }
                         }
                     }
                 }
              } else { console.warn("Cannot validate/repair appData - state.data.subjects is missing."); }


            if (needsAppDataSaveAfterLoad) {
                 console.log("Saving appData after load/sync/validation/repair...");
                 await saveUserData(uid); 
            }

            if (data && data.subjects) {
                const subjectKeys = Object.keys(data.subjects);
                let subjectToSelectId = null;
                if (currentSubject && data.subjects[currentSubject.id] && data.subjects[currentSubject.id].status === 'approved') { 
                     subjectToSelectId = currentSubject.id;
                 } else if (userData.lastSelectedSubjectId && data.subjects[userData.lastSelectedSubjectId] && data.subjects[userData.lastSelectedSubjectId].status === 'approved') { 
                     subjectToSelectId = userData.lastSelectedSubjectId;
                 } else { 
                     subjectToSelectId = subjectKeys.find(key => data.subjects[key].status === 'approved') || null;
                 }
                setCurrentSubject(subjectToSelectId ? data.subjects[subjectToSelectId] : null);
                updateSubjectInfo();
                if (subjectToSelectId && subjectToSelectId !== userData.lastSelectedSubjectId) {
                     await userRef.update({ lastSelectedSubjectId: subjectToSelectId }).catch(e => console.error("Error saving lastSelectedSubjectId:", e));
                }
            } else { setCurrentSubject(null); updateSubjectInfo(); }

            await loadAllUserCourseProgress(uid);

            await checkOnboarding(uid); 

        } else {
             console.log("User document not found for UID:", uid, "- Initializing data.");
             const currentUserDetails = firebaseAuth?.currentUser;
             if (!currentUserDetails) { throw new Error("Cannot initialize data: Current user details unavailable."); }
             await initializeUserData(uid, currentUserDetails.email, (currentUserDetails.displayName || currentUserDetails.email.split('@')[0]), currentUserDetails.displayName, currentUserDetails.photoURL);
             await loadUserData(uid); 
             return;
        }
    } catch (error) {
        console.error("Error in loadUserData:", error);
        throw error; 
    }
}

/**
 * Initializes the user document in Firestore with default appData and profile info.
 */
export async function initializeUserData(uid, email, username, displayName = null, photoURL = null, forceReset = false) {
    if (!db || !firebaseAuth) { console.error("Firestore DB or Auth not initialized"); return; }
    const userRef = db.collection('users').doc(uid);
    let docExists = false; let existingUserData = null;
    if (!forceReset) { try { const doc = await userRef.get(); docExists = doc.exists; if (docExists) existingUserData = doc.data(); } catch (e) { console.error("Error checking user existence:", e); } }
    const usernameLower = username ? username.toLowerCase() : (existingUserData?.username || null);

    let initialIsAdmin = (uid === ADMIN_UID); 
    if (docExists && forceReset && typeof existingUserData.isAdmin === 'boolean') {
        initialIsAdmin = existingUserData.isAdmin;
    }
    let initialCredits = 0;
    if (docExists && forceReset && typeof existingUserData.credits === 'number') {
        initialCredits = existingUserData.credits;
    }

    if (!docExists || forceReset) {
        console.log(`Initializing data for user: ${uid}. Force reset: ${forceReset}. Username: ${usernameLower}`);
        let defaultAppData = JSON.parse(JSON.stringify(initialSubjectData));

        const isCurrentUserInitializingAdmin = (uid === ADMIN_UID); 
        Object.values(defaultAppData.subjects).forEach(subject => {
            if (!isCurrentUserInitializingAdmin) {
                subject.status = 'pending'; 
                subject.creatorUid = uid;
                subject.creatorName = displayName || username || email?.split('@')[0];
                subject.createdAt = new Date().toISOString();
            } else {
                subject.status = 'approved';
                subject.creatorUid = ADMIN_UID; 
                subject.creatorName = 'System'; 
                subject.createdAt = new Date(0).toISOString(); 
            }
        });


        for (const subjectId in defaultAppData.subjects) {
            const defaultSubject = defaultAppData.subjects[subjectId];
            if (defaultSubject && (isCurrentUserInitializingAdmin || defaultSubject.status === 'approved')) { 
                 const defaultMarkdown = await fetchMarkdownForSubject(defaultSubject);
                 if (defaultMarkdown) { updateChaptersFromMarkdown(defaultSubject, defaultMarkdown); }
            }
        }
        const dataToSet = {
             email: email, username: usernameLower,
             displayName: (forceReset && existingUserData?.displayName) ? existingUserData.displayName : (displayName || username || email?.split('@')[0]),
             photoURL: (forceReset && existingUserData?.photoURL) ? existingUserData.photoURL : (photoURL || DEFAULT_PROFILE_PIC_URL),
             createdAt: firebase.firestore.FieldValue.serverTimestamp(),
             onboardingComplete: (forceReset && existingUserData?.onboardingComplete !== undefined) ? existingUserData.onboardingComplete : false,
             appData: defaultAppData,
             completedCourseBadges: (forceReset && existingUserData?.completedCourseBadges) ? existingUserData.completedCourseBadges : [],
             userNotes: (forceReset && existingUserData?.userNotes) ? existingUserData.userNotes : {},
             isAdmin: initialIsAdmin, 
             credits: initialCredits, 
             userAiChatSettings: getDefaultAiSettings() 
        };
        try {
            await userRef.set(dataToSet); console.log(`User data initialized/reset (${forceReset ? 'force' : 'initial'}) in Firestore.`);
            setData(defaultAppData);
            setUserAiChatSettings(dataToSet.userAiChatSettings); 
            console.log("[initializeUserData] Default AI Chat Settings set in state.");
            if (forceReset) { setUserCourseProgressMap(new Map()); console.warn("Force reset executed. User course progress subcollection NOT cleared automatically."); }
            if (forceReset) { const firstSubjectId = Object.keys(defaultAppData.subjects)[0]; setCurrentSubject(firstSubjectId ? defaultAppData.subjects[firstSubjectId] : null); updateSubjectInfo(); }
            if (usernameLower) { try { const usernameRef = db.collection('usernames').doc(usernameLower); const usernameDoc = await usernameRef.get(); if (!usernameDoc.exists) { await usernameRef.set({ userId: uid }); } } catch(userErr) { console.error("Error reserving username:", userErr); } }
        } catch (error) { console.error("Error initializing user data:", error); alert("Error setting up initial user data: " + error.message); }
    } else {
        let updatesNeeded = {};
        if (usernameLower && existingUserData && !existingUserData.username) { updatesNeeded.username = usernameLower; }
        if (existingUserData && !existingUserData.displayName) { updatesNeeded.displayName = displayName || username || email?.split('@')[0]; }
        if (existingUserData && existingUserData.onboardingComplete === undefined) { updatesNeeded.onboardingComplete = false; }
        if (existingUserData && existingUserData.photoURL === undefined) { updatesNeeded.photoURL = photoURL || DEFAULT_PROFILE_PIC_URL; }
        if (existingUserData && !existingUserData.completedCourseBadges) { updatesNeeded.completedCourseBadges = []; }
        if (existingUserData && !existingUserData.userNotes) { updatesNeeded.userNotes = {}; }
        if (existingUserData && existingUserData.isAdmin === undefined) {
            updatesNeeded.isAdmin = (uid === ADMIN_UID); 
        }
        if (existingUserData && existingUserData.credits === undefined) {
            updatesNeeded.credits = 0;
        }
        if (existingUserData && existingUserData.userAiChatSettings === undefined) {
            updatesNeeded.userAiChatSettings = getDefaultAiSettings();
        }

         if (Object.keys(updatesNeeded).length > 0) {
             console.log(`Updating missing fields for ${uid}:`, Object.keys(updatesNeeded));
             try {
                 await userRef.update(updatesNeeded);
                 if (updatesNeeded.username) { try { const usernameRef = db.collection('usernames').doc(updatesNeeded.username); const usernameDoc = await usernameRef.get(); if (!usernameDoc.exists) { await usernameRef.set({ userId: uid }); } } catch (userErr) { console.error("Error reserving username on update:", userErr);} }
             } catch(updateError) { console.error("Error updating user fields:", updateError); }
         } else { console.log(`User data already exists for ${uid}.`); }
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
    } catch (error) { console.error("Error checking onboarding status:", error); alert("Error checking user setup: " + error.message); }
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
    } catch (error) { console.error(`Error submitting to ${collectionName}:`, error); alert(`Failed to submit: ${error.message}`); return false; }
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
     } catch (error) { console.error("Error sending admin reply:", error); alert("Failed to send reply: " + error.message); return false; }
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
             updateGlobalCourseData(courseId, mergedData); 
             console.log("Local course definition map updated after Firestore save.");
         } else {
              console.warn(`Course ${courseId} not found after update/set operation. Local cache might be stale.`);
              globalCourseDataMap.delete(courseId); 
         }
         return true;
     } catch (error) {
         console.error(`Error updating/setting course definition for ${courseId}:`, error);
         alert(`Failed to update course: ${error.message}`);
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
        return { success: false, message: error.message };
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
        alert(`Failed to update course status: ${error.message}`);
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
     } catch (error) { hideLoading(); console.error("Error adding badge:", error); alert(`Failed to add badge: ${error.message}`); }
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
     } catch (error) { hideLoading(); console.error("Error removing badge:", error); alert(`Failed to remove badge: ${error.message}`); }
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
        throw new Error(`Failed to update username: ${error.message}`);
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
              alert("Failed to save notes.");
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
         alert(`Failed to share note: ${error.message}`);
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
        alert(`Error deleting progress: ${error.message}`); 
        return false;
    }
}

// --- NEW: Admin Tasks Management ---

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
                status: data.status,
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

export async function addAdminTask(taskText) {
    if (!db || !currentUser || !currentUser.isAdmin) { 
        console.error("Permission denied: Admin privileges required to add task.");
        alert("Permission denied: Admin privileges required.");
        return null;
    }
    if (!taskText || typeof taskText !== 'string' || taskText.trim().length === 0) {
        console.error("Cannot add task: Task text is empty or invalid.");
        alert("Task text cannot be empty.");
        return null;
    }

    console.log("Admin adding new task:", taskText);
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
        alert(`Failed to add task: ${error.message}`);
        return null;
    }
}

export async function updateAdminTaskStatus(taskId, newStatus) {
    if (!db || !currentUser || !currentUser.isAdmin) { 
        console.error("Permission denied: Admin privileges required to update task status.");
        alert("Permission denied: Admin privileges required.");
        return false;
    }
    if (!taskId || !newStatus || (newStatus !== 'pending' && newStatus !== 'done')) {
        console.error("Invalid arguments for updateAdminTaskStatus. TaskId:", taskId, "NewStatus:", newStatus);
        alert("Internal Error: Invalid data for task status update.");
        return false;
    }

    console.log(`Admin updating task ${taskId} status to: ${newStatus}`);
    const taskRef = db.collection(adminTasksCollection).doc(taskId);
    try {
        await taskRef.update({ status: newStatus });
        console.log(`Successfully updated status for admin task ${taskId}.`);
        return true;
    } catch (error) {
        console.error(`Error updating status for admin task ${taskId}:`, error);
        alert(`Failed to update task status: ${error.message}`);
        return false;
    }
}

export async function deleteAdminTask(taskId) {
    if (!db || !currentUser || !currentUser.isAdmin) { 
        console.error("Permission denied: Admin privileges required to delete task.");
        alert("Permission denied: Admin privileges required.");
        return false;
    }
    if (!taskId) {
        console.error("Cannot delete task: Task ID is missing.");
        alert("Internal Error: Task ID missing for deletion.");
        return false;
    }

    console.log(`Admin attempting to delete task ${taskId}`);
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
        alert(`Failed to delete task: ${error.message}`);
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
        throw new Error(`Failed to toggle admin status: ${error.message}`);
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
        alert(`Failed to update subject status: ${error.message}`);
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
        alert(`Failed to update credits: ${error.message}`);
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

    if (typeof dataToSave.createdAt === 'number') {
        dataToSave.createdAt = firebase.firestore.Timestamp.fromMillis(dataToSave.createdAt);
    } else if (!dataToSave.createdAt) { 
        dataToSave.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }
    
    dataToSave.lastModified = firebase.firestore.FieldValue.serverTimestamp();
    dataToSave.history = Array.isArray(dataToSave.history) ? dataToSave.history : [];

    try {
        await sessionRef.set(dataToSave, { merge: true });
        console.log(`AI Chat session ${sessionId} saved successfully for user ${userId}.`);
    } catch (error) {
        console.error(`Error saving AI Chat session ${sessionId} for user ${userId}:`, error);
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
        throw error; 
    }
}

// --- END OF FILE firebase_firestore.js ---