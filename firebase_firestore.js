// --- START OF FILE firebase_firestore.js ---

// firebase_firestore.js

import {
    db, auth as firebaseAuth, data, setData, currentSubject, setCurrentSubject,
    userCourseProgressMap, setUserCourseProgressMap, updateGlobalCourseData, globalCourseDataMap,
    activeCourseId, setActiveCourseId, updateUserCourseProgress, currentUser, setCurrentUser // Added setCurrentUser
} from './state.js';
import { showLoading, hideLoading, getFormattedDate } from './utils.js'; // Added getFormattedDate
import { updateChaptersFromMarkdown } from './markdown_parser.js';
// Import ALL needed config values
import { initialSubjectData, ADMIN_UID, DEFAULT_PROFILE_PIC_URL, FOP_COURSE_ID, FOP_COURSE_DEFINITION, GRADING_WEIGHTS, PASSING_GRADE_PERCENT, SKIP_EXAM_PASSING_PERCENT } from './config.js'; // Added SKIP_EXAM_PASSING_PERCENT
import { updateSubjectInfo, fetchAndUpdateUserInfo } from './ui_core.js'; // Added fetchAndUpdateUserInfo
import { showOnboardingUI } from './ui_onboarding.js';
// *** MODIFIED: Import calculateTotalMark, getLetterGrade ***
import { determineTodaysObjective, calculateTotalMark, getLetterGrade } from './course_logic.js';
// *** NEW: Import filename utility ***
import { cleanTextForFilename } from './filename_utils.js'; // Assuming this exists elsewhere

// --- Constants ---
const userFormulaSheetSubCollection = "userFormulaSheets";
const userSummarySubCollection = "userChapterSummaries";
const sharedNotesCollection = "sharedCourseNotes";
const adminTasksCollection = "adminTasks"; // NEW: Collection name for admin tasks
const userCreditLogSubCollection = "creditLog"; // NEW: For credit transactions

// --- Utilities ---
/**
 * Fetches the markdown content for a given subject.
 * Handles the default 'chapters.md' case.
 * Returns the markdown text content or null if fetch fails.
 */
async function fetchMarkdownForSubject(subject) {
     if (!subject) return null;
    // Use subject.fileName, default logic might need adjustment based on expected import data format
    let fileName = subject.fileName;
    if (!fileName) {
         // Fallback logic if fileName is missing
         fileName = (subject.name === "Fundamentals of Physics") ? "chapters.md" : `${subject.name}.md`;
         console.warn(`Subject ${subject.id} missing fileName, falling back to ${fileName}`);
    }
    // Sanitize filename: replace spaces with underscores, remove invalid chars
    const safeFileName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    const url = `./${safeFileName}?t=${new Date().getTime()}`; // Add cache buster - Use relative path from index.html

    console.log(`Fetching Markdown from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Markdown file not found: ${url}. Subject: ${subject.name}`);
                return null; // File not found is acceptable here
            }
            throw new Error(`HTTP error fetching markdown! status: ${response.status} for ${url}`);
        }
        const mdContent = await response.text();
        console.log(`Markdown fetched successfully for subject ${subject.name}.`);
        return mdContent;
    } catch (error) {
        console.error(`Error fetching Markdown for subject ${subject.name} (${url}):`, error);
        return null; // Indicate fetch failure
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
        // Only save the 'appData' part (subjects, history, settings etc.)
        // Ensure data is serializable (no undefined values, classes etc.)
        const cleanData = JSON.parse(JSON.stringify(appDataToSave));

        // --- Validation/Cleanup before save ---
        if (cleanData && cleanData.subjects) {
             Object.values(cleanData.subjects).forEach(subject => {
                 if (subject && subject.chapters) {
                      Object.values(subject.chapters).forEach(chap => {
                          // Ensure numeric fields are numbers, default to 0
                          chap.total_questions = Number(chap.total_questions) || 0;
                          chap.total_attempted = Number(chap.total_attempted) || 0;
                          chap.total_wrong = Number(chap.total_wrong) || 0;
                          chap.consecutive_mastery = Number(chap.consecutive_mastery) || 0;
                          // Ensure arrays are arrays, default to empty
                          chap.available_questions = Array.isArray(chap.available_questions) ? chap.available_questions : [];
                          chap.mistake_history = Array.isArray(chap.mistake_history) ? chap.mistake_history : [];
                      });
                 }
                 // Ensure arrays exist at subject level
                 subject.studied_chapters = Array.isArray(subject.studied_chapters) ? subject.studied_chapters : [];
                 subject.pending_exams = Array.isArray(subject.pending_exams) ? subject.pending_exams : [];
                 // exam_history is deprecated here

                 // MODIFIED: Ensure subject status and creator fields exist
                 subject.status = subject.status || 'approved'; // Default to approved if missing
                 subject.creatorUid = subject.creatorUid || ADMIN_UID; // Default to admin if missing
                 subject.creatorName = subject.creatorName || 'System'; // Default to system if missing
                 subject.createdAt = subject.createdAt || new Date(0).toISOString(); // Default to epoch if missing
             });
        }
        // --- End Validation ---

        await userRef.update({
            appData: cleanData
            // Consider adding a lastAppDataUpdate timestamp here if needed
            // lastAppDataUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("User appData saved successfully.");
    } catch (error) {
        console.error("Error saving user appData to Firestore:", error);
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
        // Deep clone to avoid modifying original and ensure plain object for Firestore
        const dataToSave = JSON.parse(JSON.stringify(progressData));

        // *** MODIFIED: Refined Date Handling ***
        // Convert JS Dates to Timestamps IF they exist and are not already special Firestore values
        // Enrollment Date Handling
        if (dataToSave.enrollmentDate) {
             if (dataToSave.enrollmentDate instanceof Date) { // Is it a JS Date?
                try {
                    dataToSave.enrollmentDate = firebase.firestore.Timestamp.fromDate(dataToSave.enrollmentDate);
                    console.log("Converted enrollmentDate (JS Date) to Timestamp for saving.");
                } catch (e) {
                    console.error("Error converting enrollmentDate JS Date to Timestamp:", e, dataToSave.enrollmentDate);
                    delete dataToSave.enrollmentDate; // Remove if conversion fails
                }
             } else if (typeof dataToSave.enrollmentDate === 'object' && dataToSave.enrollmentDate?._methodName === 'serverTimestamp') {
                 // It's already a serverTimestamp placeholder, leave it alone
                 console.log("enrollmentDate is already serverTimestamp, keeping as is.");
             } else {
                 // Handle potential string/number representation if necessary (e.g., from direct JSON modification)
                 try {
                     const dateObj = new Date(dataToSave.enrollmentDate);
                     if (!isNaN(dateObj)) {
                          dataToSave.enrollmentDate = firebase.firestore.Timestamp.fromDate(dateObj);
                          console.log("Converted enrollmentDate (String/Number) to Timestamp for saving.");
                     } else {
                          console.warn("Invalid enrollmentDate value during save, deleting:", dataToSave.enrollmentDate);
                          delete dataToSave.enrollmentDate;
                     }
                 } catch(e) {
                      console.warn("Error processing non-Date/non-ServerTimestamp enrollmentDate during save, deleting:", e, dataToSave.enrollmentDate);
                      delete dataToSave.enrollmentDate;
                 }
             }
        }

        // Completion Date Handling (similar logic, check for null)
         if (dataToSave.completionDate) {
             if (dataToSave.completionDate instanceof Date) { // Is it a JS Date?
                try {
                    dataToSave.completionDate = firebase.firestore.Timestamp.fromDate(dataToSave.completionDate);
                    console.log("Converted completionDate (JS Date) to Timestamp for saving.");
                } catch (e) {
                    console.error("Error converting completionDate JS Date to Timestamp:", e, dataToSave.completionDate);
                    delete dataToSave.completionDate;
                }
             } else { // It's not a JS Date (could be string, number, or null if previously saved)
                 try {
                     const dateObj = new Date(dataToSave.completionDate);
                     if (!isNaN(dateObj)) {
                         dataToSave.completionDate = firebase.firestore.Timestamp.fromDate(dateObj);
                         console.log("Converted completionDate (String/Number) to Timestamp for saving.");
                     } else {
                         console.warn("Invalid completionDate value during save, setting to null:", dataToSave.completionDate);
                         dataToSave.completionDate = null; // Set to null if unparseable
                     }
                 } catch (e) {
                     console.warn("Error processing non-Date completionDate during save, setting to null:", e, dataToSave.completionDate);
                     dataToSave.completionDate = null;
                 }
             }
        } else if (dataToSave.completionDate === undefined) {
             // Ensure it's null if undefined
             dataToSave.completionDate = null;
        }


        // Always overwrite lastActivityDate with a new server timestamp on save
        dataToSave.lastActivityDate = firebase.firestore.FieldValue.serverTimestamp();
        console.log("Setting lastActivityDate to serverTimestamp for save.");

        // Ensure arrays/objects are properly formatted for Firestore
        dataToSave.enrollmentMode = dataToSave.enrollmentMode || 'full'; // MODIFIED: Default to full
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
        // Ensure dailyProgress sub-objects are initialized if needed
        Object.keys(dataToSave.dailyProgress).forEach(dateStr => {
            dataToSave.dailyProgress[dateStr] = dataToSave.dailyProgress[dateStr] || {}; // Ensure day object exists
            dataToSave.dailyProgress[dateStr].chaptersStudied = dataToSave.dailyProgress[dateStr].chaptersStudied || [];
            dataToSave.dailyProgress[dateStr].skipExamsPassed = dataToSave.dailyProgress[dateStr].skipExamsPassed || [];
            dataToSave.dailyProgress[dateStr].assignmentCompleted = dataToSave.dailyProgress[dateStr].assignmentCompleted ?? false;
            dataToSave.dailyProgress[dateStr].assignmentScore = dataToSave.dailyProgress[dateStr].assignmentScore ?? null;
        });

        console.log("Data ready for Firestore set:", dataToSave);
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
                // Basic validation/defaults for structure consistency
                progressData.enrollmentMode = progressData.enrollmentMode || 'full'; // MODIFIED: Load enrollmentMode
                progressData.courseStudiedChapters = progressData.courseStudiedChapters || [];
                progressData.dailyProgress = progressData.dailyProgress || {};
                progressData.assignmentScores = progressData.assignmentScores || {};
                progressData.weeklyExamScores = progressData.weeklyExamScores || {};
                progressData.midcourseExamScores = progressData.midcourseExamScores || {};
                progressData.finalExamScores = progressData.finalExamScores === undefined ? null : progressData.finalExamScores; // Handle null/array
                progressData.watchedVideoUrls = progressData.watchedVideoUrls || {};
                progressData.watchedVideoDurations = progressData.watchedVideoDurations || {};
                progressData.pdfProgress = progressData.pdfProgress || {};
                progressData.skipExamAttempts = progressData.skipExamAttempts || {};
                progressData.lastSkipExamScore = progressData.lastSkipExamScore || {};
                progressData.status = progressData.status || 'enrolled';
                 // Ensure dailyProgress sub-objects are initialized if needed
                Object.keys(progressData.dailyProgress).forEach(dateStr => {
                    progressData.dailyProgress[dateStr] = progressData.dailyProgress[dateStr] || {}; // Ensure day object exists
                    progressData.dailyProgress[dateStr].chaptersStudied = progressData.dailyProgress[dateStr].chaptersStudied || [];
                    progressData.dailyProgress[dateStr].skipExamsPassed = progressData.dailyProgress[dateStr].skipExamsPassed || [];
                    progressData.dailyProgress[dateStr].assignmentCompleted = progressData.dailyProgress[dateStr].assignmentCompleted ?? false;
                    progressData.dailyProgress[dateStr].assignmentScore = progressData.dailyProgress[dateStr].assignmentScore ?? null;
                });

                // Convert Timestamps to Dates for client-side use
                if (progressData.enrollmentDate?.toDate) {
                    progressData.enrollmentDate = progressData.enrollmentDate.toDate();
                } else if (progressData.enrollmentDate) { // Handle potential string/number timestamp
                     try { progressData.enrollmentDate = new Date(progressData.enrollmentDate); } catch(e){ console.warn(`Could not parse enrollmentDate for course ${doc.id}`); progressData.enrollmentDate = new Date(); }
                } else {
                     progressData.enrollmentDate = new Date(); // Fallback
                }

                 if (progressData.completionDate?.toDate) {
                    progressData.completionDate = progressData.completionDate.toDate();
                }
                 if (progressData.lastActivityDate?.toDate) {
                    progressData.lastActivityDate = progressData.lastActivityDate.toDate();
                } else {
                     progressData.lastActivityDate = new Date(); // Fallback if missing
                }


                // Determine today's objective based on loaded progress and course definition
                const courseDef = globalCourseDataMap.get(doc.id);
                if (courseDef) {
                     // MODIFIED: Pass enrollmentMode if needed
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
        setUserCourseProgressMap(newProgressMap); // Update state
    } catch (error) {
        console.error("Error loading user course progress:", error);
        throw error; // Re-throw
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
        // Fetch all courses (approved or not) so admin can see them
        const snapshot = await coursesRef.get();
        snapshot.forEach(doc => {
            const courseData = doc.data();
            let finalCourseData = { ...courseData, id: doc.id }; // Ensure ID is included

            // Ensure essential fields exist and have correct types
            finalCourseData.chapterResources = typeof finalCourseData.chapterResources === 'object' ? finalCourseData.chapterResources : {};
            finalCourseData.youtubePlaylistUrls = Array.isArray(finalCourseData.youtubePlaylistUrls) ? finalCourseData.youtubePlaylistUrls : (finalCourseData.youtubePlaylistUrl ? [finalCourseData.youtubePlaylistUrl] : []);
            finalCourseData.chapters = Array.isArray(finalCourseData.chapters) ? finalCourseData.chapters : [];
            finalCourseData.midcourseChapters = Array.isArray(finalCourseData.midcourseChapters) ? finalCourseData.midcourseChapters : [];
            finalCourseData.totalChapters = Number(finalCourseData.totalChapters) || (Array.isArray(finalCourseData.chapters) ? finalCourseData.chapters.length : 0); // Recalculate if 0
            // --- MODIFIED: Initialize Image URLs, Prereqs (String Array), Coreqs (String Array) ---
            finalCourseData.imageUrl = finalCourseData.imageUrl || null;
            finalCourseData.coverUrl = finalCourseData.coverUrl || null;
            // Ensure prereqs/coreqs are arrays of strings, default to empty array
            finalCourseData.prerequisites = Array.isArray(finalCourseData.prerequisites)
                                            ? finalCourseData.prerequisites.filter(item => typeof item === 'string')
                                            : [];
            finalCourseData.corequisites = Array.isArray(finalCourseData.corequisites)
                                           ? finalCourseData.corequisites.filter(item => typeof item === 'string')
                                           : [];
            // --- End MODIFICATION ---

            updateGlobalCourseData(doc.id, finalCourseData);
            console.log(`Loaded global course definition: ${finalCourseData.name} (${doc.id}), Status: ${finalCourseData.status || 'N/A'}`);

            if (doc.id === FOP_COURSE_ID) {
                fopFoundInFirestore = true;
                console.log(`FoP course ${FOP_COURSE_ID} found in Firestore.`);
            }
        });

        // --- MODIFIED: Create FoP in Firestore if it wasn't found ---
        if (!fopFoundInFirestore) {
            console.log(`FOP course ${FOP_COURSE_ID} not found in Firestore. Creating it from local config...`);
            const fopDef = {...FOP_COURSE_DEFINITION}; // Clone local definition
            fopDef.id = FOP_COURSE_ID; // Ensure ID is correct
            fopDef.status = 'approved'; // Set initial status
            // Ensure structural consistency (already done in the loop above, repeat here for clarity)
            fopDef.chapterResources = typeof fopDef.chapterResources === 'object' ? fopDef.chapterResources : {};
            fopDef.youtubePlaylistUrls = fopDef.youtubePlaylistUrls || (fopDef.youtubePlaylistUrl ? [fopDef.youtubePlaylistUrl] : []);
            fopDef.chapters = Array.isArray(fopDef.chapters) ? fopDef.chapters : [];
            fopDef.midcourseChapters = Array.isArray(fopDef.midcourseChapters) ? fopDef.midcourseChapters : [];
            fopDef.totalChapters = Number(fopDef.totalChapters) || (Array.isArray(fopDef.chapters) ? fopDef.chapters.length : 0);
            // --- MODIFIED: Initialize Image URLs, Prereqs (String Array), Coreqs (String Array) for FoP creation ---
            fopDef.imageUrl = fopDef.imageUrl || null;
            fopDef.coverUrl = fopDef.coverUrl || null;
            fopDef.prerequisites = Array.isArray(fopDef.prerequisites)
                                   ? fopDef.prerequisites.filter(item => typeof item === 'string')
                                   : [];
            fopDef.corequisites = Array.isArray(fopDef.corequisites)
                                  ? fopDef.corequisites.filter(item => typeof item === 'string')
                                  : [];
            // --- End MODIFICATION ---

            // Add createdAt timestamp (or set it during creation)
            fopDef.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            fopDef.creatorUid = ADMIN_UID; // Attribute creation to admin
            fopDef.creatorName = 'System (Config)';

            try {
                // Use set with merge:true to be safe, although it shouldn't exist
                await db.collection('courses').doc(FOP_COURSE_ID).set(fopDef, { merge: true });
                console.log(`Successfully created FOP course ${FOP_COURSE_ID} document in Firestore.`);
                // Fetch it back to ensure we get the server timestamp correctly for the cache
                const createdDoc = await db.collection('courses').doc(FOP_COURSE_ID).get();
                if (createdDoc.exists) {
                    const createdData = { id: FOP_COURSE_ID, ...createdDoc.data() };
                     // Re-apply consistency checks just in case
                    createdData.chapterResources = typeof createdData.chapterResources === 'object' ? createdData.chapterResources : {};
                    createdData.youtubePlaylistUrls = Array.isArray(createdData.youtubePlaylistUrls) ? createdData.youtubePlaylistUrls : (createdData.youtubePlaylistUrl ? [createdData.youtubePlaylistUrl] : []);
                    createdData.chapters = Array.isArray(createdData.chapters) ? createdData.chapters : [];
                    createdData.midcourseChapters = Array.isArray(createdData.midcourseChapters) ? createdData.midcourseChapters : [];
                    createdData.totalChapters = Number(createdData.totalChapters) || (Array.isArray(createdData.chapters) ? createdData.chapters.length : 0);
                    // --- MODIFIED: Initialize Image URLs, Prereqs (String Array), Coreqs (String Array) on refetch ---
                    createdData.imageUrl = createdData.imageUrl || null;
                    createdData.coverUrl = createdData.coverUrl || null;
                    createdData.prerequisites = Array.isArray(createdData.prerequisites)
                                                ? createdData.prerequisites.filter(item => typeof item === 'string')
                                                : [];
                    createdData.corequisites = Array.isArray(createdData.corequisites)
                                                ? createdData.corequisites.filter(item => typeof item === 'string')
                                                : [];
                    // --- End MODIFICATION ---
                    updateGlobalCourseData(FOP_COURSE_ID, createdData); // Update map with created data
                } else {
                    console.error(`Failed to fetch FOP course ${FOP_COURSE_ID} immediately after creation.`);
                    // Fallback to updating map with local data if fetch fails
                    updateGlobalCourseData(FOP_COURSE_ID, { ...fopDef, createdAt: new Date() }); // Use client time as approximation
                }
            } catch (creationError) {
                console.error(`Error creating FOP course ${FOP_COURSE_ID} document in Firestore:`, creationError);
                // Optionally update map with local config as a last resort
                 updateGlobalCourseData(FOP_COURSE_ID, { ...fopDef, createdAt: new Date() });
            }
        }

    } catch (error) {
        console.error("Error loading global course definitions:", error);
         // Attempt fallback loading for FoP from config if the entire fetch fails
        if (!globalCourseDataMap.has(FOP_COURSE_ID)) {
             console.log(`Firestore fetch failed, attempting to load FOP ${FOP_COURSE_ID} from local config as fallback.`);
             const fopDef = {...FOP_COURSE_DEFINITION}; // Clone
             fopDef.id = FOP_COURSE_ID;
             fopDef.status = 'approved';
             fopDef.youtubePlaylistUrls = fopDef.youtubePlaylistUrls || (fopDef.youtubePlaylistUrl ? [fopDef.youtubePlaylistUrl] : []);
             fopDef.chapterResources = typeof fopDef.chapterResources === 'object' ? fopDef.chapterResources : {};
             fopDef.chapters = Array.isArray(fopDef.chapters) ? fopDef.chapters : [];
             fopDef.midcourseChapters = Array.isArray(fopDef.midcourseChapters) ? fopDef.midcourseChapters : [];
             fopDef.totalChapters = Number(fopDef.totalChapters) || (Array.isArray(fopDef.chapters) ? fopDef.chapters.length : 0);
             // --- MODIFIED: Initialize Image URLs, Prereqs (String Array), Coreqs (String Array) for FoP fallback ---
             fopDef.imageUrl = fopDef.imageUrl || null;
             fopDef.coverUrl = fopDef.coverUrl || null;
             fopDef.prerequisites = Array.isArray(fopDef.prerequisites)
                                    ? fopDef.prerequisites.filter(item => typeof item === 'string')
                                    : [];
             fopDef.corequisites = Array.isArray(fopDef.corequisites)
                                   ? fopDef.corequisites.filter(item => typeof item === 'string')
                                   : [];
             // --- End MODIFICATION ---
             updateGlobalCourseData(FOP_COURSE_ID, fopDef);
        }
    }
}


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

            // --- MODIFICATION: Pass isAdmin and credits to setCurrentUser via fetchAndUpdateUserInfo ---
            // This happens because fetchAndUpdateUserInfo is called from setupAuthListener
            // which gets the full userData object (including isAdmin and credits if they exist).
            // fetchAndUpdateUserInfo itself will call setCurrentUser with this comprehensive object.
            // No direct change needed here in loadUserData, but this confirms the flow.
            // Ensure `credits` is loaded and passed.
            const userProfileForState = {
                uid: uid,
                email: userData.email || firebaseAuth?.currentUser?.email,
                displayName: userData.displayName || firebaseAuth?.currentUser?.displayName,
                photoURL: userData.photoURL || firebaseAuth?.currentUser?.photoURL,
                username: userData.username || null,
                // MODIFIED: Correctly determine isAdmin based on Firestore or primary admin
                isAdmin: userData.isAdmin !== undefined ? (uid === ADMIN_UID || userData.isAdmin) : (uid === ADMIN_UID),
                credits: userData.credits !== undefined ? Number(userData.credits) : 0, // MODIFIED: Load credits, default to 0
                onboardingComplete: userData.onboardingComplete !== undefined ? userData.onboardingComplete : false,
            };
            setCurrentUser(userProfileForState); // Update central state immediately
            // Call fetchAndUpdateUserInfo to update UI elements like header, this might be redundant
            // if setupAuthListener also calls it, but ensures UI consistency.
            // We might want to rely on the call from setupAuthListener after login.
            // For direct loads (e.g. refresh), this ensures the UI is populated.
            // await fetchAndUpdateUserInfo(firebaseAuth.currentUser); // This might be redundant if auth listener handles it
            // --- END MODIFICATION ---

            // --- appData Initialization/Validation ---
            if (!loadedAppData || typeof loadedAppData.subjects !== 'object') {
                console.warn("Loaded appData missing or invalid 'subjects'. Resetting to default.");
                loadedAppData = JSON.parse(JSON.stringify(initialSubjectData));
                needsAppDataSaveAfterLoad = true;
            }
             if (userData.photoURL === undefined) {
                console.log("Initializing top-level photoURL.");
                 const authUser = firebaseAuth?.currentUser;
                // Use update to avoid overwriting other fields if initializeUserData runs later
                await userRef.update({ photoURL: authUser?.photoURL || DEFAULT_PROFILE_PIC_URL }).catch(e => console.error("Error setting initial photoURL:", e));
             }
             if (userData.completedCourseBadges === undefined) {
                  console.log("Initializing completedCourseBadges array.");
                  await userRef.update({ completedCourseBadges: [] }).catch(e => console.error("Error setting initial completedCourseBadges:", e));
             }
              // Ensure userNotes structure exists
             if (userData.userNotes === undefined) {
                  console.log("Initializing userNotes map.");
                  await userRef.update({ userNotes: {} }).catch(e => console.error("Error setting initial userNotes:", e));
             }
              // --- MODIFICATION: Ensure isAdmin field exists, defaulting based on ADMIN_UID ---
             if (userData.isAdmin === undefined) {
                 console.log(`Initializing isAdmin field for user ${uid}.`);
                 await userRef.update({ isAdmin: (uid === ADMIN_UID) }).catch(e => console.error("Error setting initial isAdmin field:", e));
             }
             // --- MODIFICATION: Ensure credits field exists, defaulting to 0. ---
             if (userData.credits === undefined) {
                console.log(`Initializing credits field for user ${uid}.`);
                await userRef.update({ credits: 0 }).catch(e => console.error("Error setting initial credits field:", e));
             }


            // --- End appData Initialization ---

            setData(loadedAppData); // Update state

            // Sync appData with Markdown
            console.log("Syncing loaded subject appData with Markdown files...");
             let appDataWasModifiedBySync = false;
             if (data && data.subjects) {
                 for (const subjectId in data.subjects) {
                     const subject = data.subjects[subjectId];
                     if (!subject) continue;

                     // MODIFIED: Only sync for 'approved' subjects or if admin
                     if (currentUser && (currentUser.isAdmin || subject.status === 'approved')) {
                         const subjectMarkdown = await fetchMarkdownForSubject(subject);
                         if (subjectMarkdown !== null) {
                              const subjectModified = updateChaptersFromMarkdown(subject, subjectMarkdown);
                              if (subjectModified) { appDataWasModifiedBySync = true; }
                         } else { console.warn(`Skipping MD sync for Subject ${subject.name} (ID: ${subjectId}) - MD file missing.`); }
                     } else {
                         console.log(`Skipping MD sync for Subject ${subject.name} (ID: ${subjectId}) due to status '${subject.status}' and user role.`);
                         // Ensure chapters object exists even if not synced
                         subject.chapters = subject.chapters || {};
                     }
                 }
                 if (appDataWasModifiedBySync) { needsAppDataSaveAfterLoad = true; }
             } else { console.warn("Cannot sync appData with Markdown - state.data.subjects is missing."); }

             // Validate/Repair appData Structure
              if (data && data.subjects) {
                 for (const subjectId in data.subjects) {
                     const subject = data.subjects[subjectId];
                     if (!subject) continue;
                     // Subject fields
                     if (!subject.name) { subject.name = `Subject ${subjectId}`; needsAppDataSaveAfterLoad = true; }
                     if (!subject.fileName) { subject.fileName = `${subject.name}.md`.replace(/\s+/g, '_'); needsAppDataSaveAfterLoad = true; }
                     subject.studied_chapters = Array.isArray(subject.studied_chapters) ? subject.studied_chapters : [];
                     subject.pending_exams = Array.isArray(subject.pending_exams) ? subject.pending_exams.map(exam => ({ ...exam, id: exam.id || `pending_${Date.now()}` })) : [];
                     // Ensure numeric defaults for ratio/duration/maxQ
                     subject.mcqProblemRatio = typeof subject.mcqProblemRatio === 'number' ? subject.mcqProblemRatio : 0.5;
                     subject.defaultTestDurationMinutes = Number(subject.defaultTestDurationMinutes) || 120;
                     subject.max_questions_per_test = Number(subject.max_questions_per_test) || 42;

                     // MODIFIED: Validate subject status and creator fields
                     subject.status = subject.status || 'approved';
                     subject.creatorUid = subject.creatorUid || ADMIN_UID; // Default if old data
                     subject.creatorName = subject.creatorName || 'System';
                     subject.createdAt = subject.createdAt || new Date(0).toISOString();


                     subject.chapters = typeof subject.chapters === 'object' ? subject.chapters : {};
                     // Chapter fields (only if subject is approved or user is admin, otherwise they might be empty)
                     if (currentUser && (currentUser.isAdmin || subject.status === 'approved')) {
                         for (const chapNum in subject.chapters) {
                            const chap = subject.chapters[chapNum];
                            if (!chap) continue;
                            chap.total_questions = Number(chap.total_questions) ?? 0;
                            chap.total_attempted = Number(chap.total_attempted) ?? 0;
                            chap.total_wrong = Number(chap.total_wrong) ?? 0;
                            chap.mistake_history = Array.isArray(chap.mistake_history) ? chap.mistake_history : [];
                            chap.consecutive_mastery = Number(chap.consecutive_mastery) ?? 0;
                            // Validate available_questions
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


            // Save appData if modified
            if (needsAppDataSaveAfterLoad) {
                 console.log("Saving appData after load/sync/validation/repair...");
                 await saveUserData(uid); // Save the entire updated 'data' object
            }

            // Select Default Subject
            if (data && data.subjects) {
                const subjectKeys = Object.keys(data.subjects);
                let subjectToSelectId = null;
                // Prioritize currently selected if valid, otherwise first in list
                if (currentSubject && data.subjects[currentSubject.id] && data.subjects[currentSubject.id].status === 'approved') { // MODIFIED: Check status
                     subjectToSelectId = currentSubject.id;
                 } else if (userData.lastSelectedSubjectId && data.subjects[userData.lastSelectedSubjectId] && data.subjects[userData.lastSelectedSubjectId].status === 'approved') { // MODIFIED: Check status
                     subjectToSelectId = userData.lastSelectedSubjectId;
                 } else { // Find first approved subject
                     subjectToSelectId = subjectKeys.find(key => data.subjects[key].status === 'approved') || null;
                 }
                setCurrentSubject(subjectToSelectId ? data.subjects[subjectToSelectId] : null);
                updateSubjectInfo();
                // Save the newly selected subject ID back to the user doc for persistence
                if (subjectToSelectId && subjectToSelectId !== userData.lastSelectedSubjectId) {
                     await userRef.update({ lastSelectedSubjectId: subjectToSelectId }).catch(e => console.error("Error saving lastSelectedSubjectId:", e));
                }
            } else { setCurrentSubject(null); updateSubjectInfo(); }

            // Load User Course Progress AFTER potentially saving appData
            await loadAllUserCourseProgress(uid);

            await checkOnboarding(uid); // Check onboarding last

        } else {
             console.log("User document not found for UID:", uid, "- Initializing data.");
             const currentUserDetails = firebaseAuth?.currentUser;
             if (!currentUserDetails) { throw new Error("Cannot initialize data: Current user details unavailable."); }
             await initializeUserData(uid, currentUserDetails.email, (currentUserDetails.displayName || currentUserDetails.email.split('@')[0]), currentUserDetails.displayName, currentUserDetails.photoURL);
             await loadUserData(uid); // Reload after initialization
             return;
        }
    } catch (error) {
        console.error("Error in loadUserData:", error);
        throw error; // Re-throw
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

    // --- MODIFICATION: Determine isAdmin status ---
    let initialIsAdmin = (uid === ADMIN_UID); // Default to true only for the primary admin
    // Preserve existing isAdmin on forceReset if it exists (unlikely scenario, but safe)
    if (docExists && forceReset && typeof existingUserData.isAdmin === 'boolean') {
        initialIsAdmin = existingUserData.isAdmin;
    }
    // --- END MODIFICATION ---

    // --- MODIFICATION: Initialize credits ---
    let initialCredits = 0;
    // Preserve existing credits on forceReset if it exists
    if (docExists && forceReset && typeof existingUserData.credits === 'number') {
        initialCredits = existingUserData.credits;
    }
    // --- END MODIFICATION ---

    if (!docExists || forceReset) {
        console.log(`Initializing data for user: ${uid}. Force reset: ${forceReset}. Username: ${usernameLower}`);
        let defaultAppData = JSON.parse(JSON.stringify(initialSubjectData));

        // MODIFIED: For initial subjects, set creator to current user if not admin, or keep admin if user is admin
        // This is for *newly initialized users*. initialSubjectData already has ADMIN_UID as creator.
        // If the new user is NOT admin, their initial subjects should reflect their pending status.
        const isCurrentUserInitializingAdmin = (uid === ADMIN_UID); // Check if the user being initialized is the admin
        Object.values(defaultAppData.subjects).forEach(subject => {
            if (!isCurrentUserInitializingAdmin) {
                subject.status = 'pending'; // If new user is not admin, their initial subjects are pending
                subject.creatorUid = uid;
                subject.creatorName = displayName || username || email?.split('@')[0];
                subject.createdAt = new Date().toISOString();
            } else {
                // If the new user *is* the admin, initial subjects are pre-approved and by system/admin
                subject.status = 'approved';
                subject.creatorUid = ADMIN_UID; // Or 'uid' if admin should "own" them
                subject.creatorName = 'System'; // Or admin's display name
                subject.createdAt = new Date(0).toISOString(); // Keep as default for admin
            }
        });


        for (const subjectId in defaultAppData.subjects) {
            const defaultSubject = defaultAppData.subjects[subjectId];
            if (defaultSubject && (isCurrentUserInitializingAdmin || defaultSubject.status === 'approved')) { // Only fetch MD for approved or if admin
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
             isAdmin: initialIsAdmin, // --- MODIFICATION: Set isAdmin field ---
             credits: initialCredits, // --- MODIFICATION: Set credits field ---
        };
        try {
            await userRef.set(dataToSet); console.log(`User data initialized/reset (${forceReset ? 'force' : 'initial'}) in Firestore.`);
            setData(defaultAppData);
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
        // --- MODIFICATION: Ensure isAdmin field is initialized if missing ---
        if (existingUserData && existingUserData.isAdmin === undefined) {
            updatesNeeded.isAdmin = (uid === ADMIN_UID); // Default to true only for primary admin, false for others
        }
        // --- END MODIFICATION ---
        // --- MODIFICATION: Ensure credits field is initialized if missing ---
        if (existingUserData && existingUserData.credits === undefined) {
            updatesNeeded.credits = 0;
        }
        // --- END MODIFICATION ---
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
    // Choose collection based on context
    const collectionName = feedbackData.context?.toLowerCase().includes('exam issue report') ? 'examIssues' : 'feedback';
    const feedbackRef = db.collection(collectionName).doc();
    try {
        await feedbackRef.set({ subjectId: feedbackData.subjectId || 'N/A', questionId: feedbackData.questionId || 'N/A', feedbackText: feedbackData.feedbackText, context: feedbackData.context || null, userId: user.uid, username: user.displayName || user.email, timestamp: firebase.firestore.FieldValue.serverTimestamp(), status: 'new' });
        console.log(`Feedback/Issue submitted successfully to ${collectionName}:`, feedbackRef.id); return true;
    } catch (error) { console.error(`Error submitting to ${collectionName}:`, error); alert(`Failed to submit: ${error.message}`); return false; }
}

// --- Inbox/Messaging ---
export async function sendAdminReply(recipientUid, subject, body, adminUser) {
     if (!db || !adminUser || !adminUser.isAdmin) { // MODIFIED: Check adminUser.isAdmin instead of specific UID
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

// --- START MODIFICATION: Send Welcome Guide Message ---
/**
 * Sends a welcome message with a link to the guide.pdf to a new user's inbox.
 * @param {string} userId - The ID of the new user.
 */
export async function sendWelcomeGuideMessage(userId) {
    if (!db) {
        console.error("Firestore DB not initialized. Cannot send welcome message.");
        return false;
    }
    if (!userId) {
        console.error("User ID is missing. Cannot send welcome message.");
        return false;
    }

    // Construct the full URL to the guide.pdf
    // Assumes guide.pdf is in ./assets/documents/ relative to index.html
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
        // Optionally, you might want to retry or log this for manual follow-up
        return false;
    }
}
// --- END MODIFICATION ---


// --- Admin Function to Update Course Definition ---
/**
 * Updates or creates a course definition in Firestore.
 * Handles prerequisites and corequisites as arrays of strings (Subject Tags).
 * Ensures FoP can be updated.
 */
export async function updateCourseDefinition(courseId, updates) {
     if (!db || !currentUser || !currentUser.isAdmin) { // MODIFIED: Check currentUser.isAdmin
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
         // --- MODIFIED: Ensure prereqs/coreqs are arrays of strings ---
         if (updates.prerequisites !== undefined) {
             if (!Array.isArray(updates.prerequisites)) {
                 console.warn("Correcting prerequisites to empty array in update because it wasn't an array.");
                 updates.prerequisites = [];
             } else {
                 // Ensure all elements are strings and non-empty after trimming
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
                  // Ensure all elements are strings and non-empty after trimming
                  updates.corequisites = updates.corequisites
                                            .filter(tag => typeof tag === 'string')
                                            .map(tag => tag.trim())
                                            .filter(tag => tag);
                   console.log(`Cleaned corequisites:`, updates.corequisites);
              }
         }
         // --- End MODIFICATION ---

         // Use set with merge to handle nested updates correctly and create if non-existent.
         await courseRef.set(updates, { merge: true });
         console.log(`Course definition for ${courseId} updated/created successfully.`);

         // Update local state map after successful save
         const updatedDoc = await courseRef.get();
         if (updatedDoc.exists) {
             const currentData = globalCourseDataMap.get(courseId) || {};
             const updatedDataFromFS = { id: courseId, ...updatedDoc.data() };

             // Perform deep merge locally as well
             const mergedData = { ...currentData, ...updatedDataFromFS }; // Prioritize FS data
             // Deep merge chapterResources if present in both FS data and updates
             if (updatedDataFromFS.chapterResources && updates.chapterResources) {
                 mergedData.chapterResources = { ...(currentData.chapterResources || {}) }; // Start with current local
                 for (const chapNum in updates.chapterResources) {
                     mergedData.chapterResources[chapNum] = {
                         ...(currentData.chapterResources?.[chapNum] || {}), // Existing chapter data
                         ...(updates.chapterResources[chapNum]) // Apply updates
                     };
                 }
             } else if (updatedDataFromFS.chapterResources) {
                 mergedData.chapterResources = updatedDataFromFS.chapterResources;
             } else if (updates.chapterResources) {
                 mergedData.chapterResources = updates.chapterResources;
             }

             // Ensure other fields from FS are prioritized and initialized
             mergedData.youtubePlaylistUrls = Array.isArray(updatedDataFromFS.youtubePlaylistUrls) ? updatedDataFromFS.youtubePlaylistUrls : [];
             mergedData.chapters = Array.isArray(updatedDataFromFS.chapters) ? updatedDataFromFS.chapters : [];
             mergedData.midcourseChapters = Array.isArray(updatedDataFromFS.midcourseChapters) ? updatedDataFromFS.midcourseChapters : [];
             mergedData.totalChapters = Number(updatedDataFromFS.totalChapters) || (Array.isArray(mergedData.chapters) ? mergedData.chapters.length : 0);
             // --- MODIFIED: Initialize Image URLs, Prereqs (String Array), Coreqs (String Array) after update ---
             mergedData.imageUrl = updatedDataFromFS.imageUrl || null;
             mergedData.coverUrl = updatedDataFromFS.coverUrl || null;
             mergedData.prerequisites = Array.isArray(updatedDataFromFS.prerequisites)
                                        ? updatedDataFromFS.prerequisites.filter(item => typeof item === 'string')
                                        : [];
             mergedData.corequisites = Array.isArray(updatedDataFromFS.corequisites)
                                       ? updatedDataFromFS.corequisites.filter(item => typeof item === 'string')
                                       : [];
             // --- End MODIFICATION ---

             updateGlobalCourseData(courseId, mergedData); // Update local state map
             console.log("Local course definition map updated after Firestore save.");
         } else {
              console.warn(`Course ${courseId} not found after update/set operation. Local cache might be stale.`);
              globalCourseDataMap.delete(courseId); // Remove potentially incorrect cache entry
         }
         return true;
     } catch (error) {
         console.error(`Error updating/setting course definition for ${courseId}:`, error);
         alert(`Failed to update course: ${error.message}`);
         return false;
     }
}

/**
 * Adds a new course to Firestore.
 * MODIFIED: Includes prerequisites and corequisites as arrays of strings (Subject Tags).
 * MODIFIED: Awards credits if a non-admin user suggests a course (status='pending').
 */
export async function addCourseToFirestore(courseData) {
    if (!currentUser) return { success: false, message: "User not logged in." };

    const isAdminUser = currentUser.isAdmin; // MODIFIED: Use currentUser.isAdmin

    const finalStatus = isAdminUser ? 'approved' : 'pending';

    // Generate courseDirName
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
        // --- MODIFIED: Add prereqs/coreqs (expecting arrays of strings) ---
        prerequisites: Array.isArray(courseData.prerequisites)
                       ? courseData.prerequisites.filter(item => typeof item === 'string' && item.trim()) // Ensure strings
                       : [],
        corequisites: Array.isArray(courseData.corequisites)
                      ? courseData.corequisites.filter(item => typeof item === 'string' && item.trim()) // Ensure strings
                      : [],
        // --- End MODIFICATION ---
    };

    let finalTotalChapters = 0;
    let finalChapters = [];
    let finalRelatedSubjectId = null;

    if (isAdminUser) { // Only admin can set these directly during creation
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
        // Create local data copy, convert server timestamp placeholder
        const savedData = { ...dataToSet, id: docRef.id };
        delete savedData.createdAt; // Remove placeholder
        savedData.createdAt = new Date(); // Add approximate client date

        // --- MODIFIED: Ensure arrays are present in local state data too ---
        savedData.prerequisites = Array.isArray(savedData.prerequisites) ? savedData.prerequisites : [];
        savedData.corequisites = Array.isArray(savedData.corequisites) ? savedData.corequisites : [];
        // --- End MODIFICATION ---

        updateGlobalCourseData(docRef.id, savedData);

        // --- MODIFIED: Award credits if user suggested a course (status is 'pending') ---
        if (finalStatus === 'pending' && !isAdminUser) {
            await updateUserCredits(currentUser.uid, 50, `Suggested Course: ${savedData.name.substring(0, 50)}`);
        }
        // --- END MODIFICATION ---

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

    // Update daily progress log regardless of whether it was already in the main list
    const todayStr = getFormattedDate(); // Use utility function
    progress.dailyProgress = progress.dailyProgress || {};
    progress.dailyProgress[todayStr] = progress.dailyProgress[todayStr] || { chaptersStudied: [], skipExamsPassed: [], assignmentCompleted: false, assignmentScore: null };

    if (method === "skip_exam_pass" || method === "skip_exam_passed") { // Handle both potential strings
        if (!progress.dailyProgress[todayStr].skipExamsPassed.includes(chapterNumInt)) {
            progress.dailyProgress[todayStr].skipExamsPassed.push(chapterNumInt);
            progress.dailyProgress[todayStr].skipExamsPassed.sort((a, b) => a - b);
            changed = true; // Mark as changed if added to daily log
            console.log(`Logged skip exam pass for Ch ${chapterNumInt} on ${todayStr}`);
        }
    } else { // Assume standard study completion
        if (!progress.dailyProgress[todayStr].chaptersStudied.includes(chapterNumInt)) {
            progress.dailyProgress[todayStr].chaptersStudied.push(chapterNumInt);
            progress.dailyProgress[todayStr].chaptersStudied.sort((a, b) => a - b);
            changed = true; // Mark as changed if added to daily log
            console.log(`Logged chapter study for Ch ${chapterNumInt} on ${todayStr}`);
        }
    }


    if (changed) {
        updateUserCourseProgress(courseId, progress); // Update local state map immediately
        return await saveUserCourseProgress(uid, courseId, progress); // Save updated progress to Firestore
    } else {
        console.log(`No changes needed for Chapter ${chapterNumInt} study status for course ${courseId}.`);
        return true; // Indicate success even if no change was made
    }
}

// --- Admin Function to Update User Course Status ---
/**
 * Allows an admin to mark a course as completed for a user and set the final grade/mark.
 */
export async function updateCourseStatusForUser(targetUserId, courseId, finalMark, newStatus) {
    // MODIFIED: Check currentUser.isAdmin for general admin access
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
                // Use server timestamp for lastActivityDate update within the transaction
                lastActivityDate: firebase.firestore.FieldValue.serverTimestamp()
            };

            let finalGrade = null;
            if (finalMark !== null && finalMark !== undefined) {
                progressUpdates.totalMark = Number(finalMark); // Ensure it's a number
                finalGrade = getLetterGrade(progressUpdates.totalMark);
                progressUpdates.grade = finalGrade;
            } else if (newStatus !== 'enrolled') {
                 // If mark not provided, attempt calculation only if marking complete/failed
                 const calculatedMark = calculateTotalMark(progressData); // Ensure progressData has needed fields
                 const calculatedGrade = getLetterGrade(calculatedMark);
                 progressUpdates.totalMark = calculatedMark;
                 progressUpdates.grade = calculatedGrade;
                 finalGrade = calculatedGrade; // Use calculated grade for badge logic
                 console.log(`Calculated final mark: ${calculatedMark}, Grade: ${calculatedGrade}`);
            }

            // Use server timestamp for completionDate only when status changes to completed/failed
            if ((newStatus === 'completed' || newStatus === 'failed') && progressData.status !== newStatus) {
                progressUpdates.completionDate = firebase.firestore.FieldValue.serverTimestamp();
            } else if (newStatus === 'enrolled') {
                 progressUpdates.completionDate = null; // Reset completion date if moving back to enrolled
            } else {
                // If status is already completed/failed and not changing, don't overwrite completionDate
                // If finalMark is being updated but status remains the same, keep existing completionDate
                 progressUpdates.completionDate = progressData.completionDate || null;
            }

            let badges = userData.completedCourseBadges || [];
            // Remove existing badge for this course regardless of status change
            badges = badges.filter(b => b.courseId !== courseId);

            // Add badge ONLY if status is 'completed' and grade is passing
            if (newStatus === 'completed' && finalGrade && finalGrade !== 'F' && courseDef) {
                 // **CORRECTED:** Use Timestamp.now() for the array element
                badges.push({
                    courseId: courseId,
                    courseName: courseDef.name || 'Unknown Course',
                    grade: finalGrade,
                    // Use Timestamp.now() for storing in an array field
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

        // Update local map ONLY if it belongs to the currently logged-in user.
        if (currentUser && userCourseProgressMap.has(courseId) && targetUserId === currentUser.uid) {
             const updatedProgressDoc = await progressRef.get(); // Re-fetch after transaction
             if (updatedProgressDoc.exists) {
                 const updatedProgressData = updatedProgressDoc.data();
                 // Convert Timestamps back AFTER the transaction is complete
                 if (updatedProgressData.enrollmentDate?.toDate) updatedProgressData.enrollmentDate = updatedProgressData.enrollmentDate.toDate();
                 if (updatedProgressData.completionDate?.toDate) updatedProgressData.completionDate = updatedProgressData.completionDate.toDate();
                 if (updatedProgressData.lastActivityDate?.toDate) updatedProgressData.lastActivityDate = updatedProgressData.lastActivityDate.toDate();

                 const courseDef = globalCourseDataMap.get(courseId);
                 if (courseDef) {
                      // MODIFIED: Pass enrollmentMode if needed
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

/**
 * Handles adding a new badge via admin action.
 */
export async function handleAddBadgeForUser(userId, courseId, courseName, grade, completionDate) {
     if (!currentUser || !currentUser.isAdmin) { alert("Admin privileges required."); return; } // MODIFIED
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

/**
 * Handles removing a badge via admin action.
 */
export async function handleRemoveBadgeForUser(userId, courseId) {
     if (!currentUser || !currentUser.isAdmin) { alert("Admin privileges required."); return; } // MODIFIED
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
/**
 * Admin function to update a user's username and manage the username registry.
 * @param {string} userId - The ID of the user to update.
 * @param {string|null} oldUsername - The user's current username (can be null/empty).
 * @param {string} newUsername - The desired new username (will be lowercased).
 * @returns {Promise<boolean>} - True on success, false or throws error on failure.
 */
export async function adminUpdateUsername(userId, oldUsername, newUsername) {
    console.log(`Admin attempting to change username for user ${userId} from "${oldUsername}" to "${newUsername}"`);
    if (!db || !currentUser || !currentUser.isAdmin) { // MODIFIED: Check currentUser.isAdmin
        console.error("Permission denied: Admin privileges required for username update.");
        throw new Error("Permission denied: Admin privileges required.");
    }
    if (!userId || !newUsername) {
        console.error("Missing userId or newUsername for adminUpdateUsername.");
        throw new Error("Internal Error: Missing required user or username data.");
    }

    // Validate new username format (same as client-side)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(newUsername)) {
        console.error("Invalid new username format:", newUsername);
        throw new Error("Invalid username format. Use 3-20 alphanumeric characters or underscores.");
    }

    const newUsernameLower = newUsername.toLowerCase();
    const oldUsernameLower = oldUsername ? oldUsername.toLowerCase() : null;

    if (oldUsernameLower === newUsernameLower) {
        console.log("New username is the same as the old one (case-insensitive). No change needed.");
        return true; // No actual change needed
    }

    const usersRef = db.collection('users');
    const usernamesRef = db.collection('usernames');
    const userDocRef = usersRef.doc(userId);
    const newUsernameDocRef = usernamesRef.doc(newUsernameLower);
    const oldUsernameDocRef = oldUsernameLower ? usernamesRef.doc(oldUsernameLower) : null;

    try {
        // Check if the new username is already taken
        console.log(`Checking if username "${newUsernameLower}" is taken...`);
        const newUsernameDoc = await newUsernameDocRef.get();
        if (newUsernameDoc.exists) {
            console.error(`Username "${newUsernameLower}" is already taken by user ${newUsernameDoc.data()?.userId}`);
            throw new Error(`Username "${newUsername}" is already taken.`);
        }

        // Perform the update in a batch write
        console.log("Preparing batch write for username update...");
        const batch = db.batch();

        // 1. Update the username field in the user's document
        console.log(`Batch: Updating username field in users/${userId} to "${newUsernameLower}"`);
        batch.update(userDocRef, { username: newUsernameLower });

        // 2. Delete the old username document if it exists
        if (oldUsernameDocRef) {
            console.log(`Batch: Deleting old username document usernames/${oldUsernameLower}`);
            batch.delete(oldUsernameDocRef);
        } else {
            console.log("No old username document to delete.");
        }

        // 3. Create the new username document
        console.log(`Batch: Creating new username document usernames/${newUsernameLower} linked to ${userId}`);
        batch.set(newUsernameDocRef, { userId: userId });

        // Commit the batch
        console.log("Committing batch write...");
        await batch.commit();
        console.log(`Successfully updated username for user ${userId} to "${newUsernameLower}"`);
        return true;

    } catch (error) {
        console.error(`Error updating username for user ${userId} to "${newUsernameLower}":`, error);
        // Rethrow specific errors or a generic one
        if (error.message.includes("already taken")) {
            throw error; // Keep the specific error message
        }
        throw new Error(`Failed to update username: ${error.message}`);
    }
}


// --- User-Specific Shared Data (Formula Sheets, Summaries, Notes) ---

// USER FORMULA SHEETS
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

// USER CHAPTER SUMMARIES
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

// USER NOTES (Stored within user document's `userNotes` map for privacy)
export async function saveUserNotes(userId, courseId, chapterNum, notesArray) {
     if (!db || !userId) return false;
     const userRef = db.collection('users').doc(userId);
     const fieldPath = `userNotes.${courseId}_ch${chapterNum}`; // Use combined key for map
     try {
         // Ensure notesArray is serializable (convert Timestamps if any, though we use Date.now())
         const notesToSave = JSON.parse(JSON.stringify(notesArray));
         await userRef.update({ [fieldPath]: notesToSave });
         console.log(`Saved user notes for ${courseId} Ch ${chapterNum} to map key ${fieldPath}`);
         return true;
     } catch (error) {
         console.error(`Error saving user notes for ${courseId} Ch ${chapterNum} using update:`, error);
         // Attempt to set if update fails (e.g., path doesn't exist)
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
     const fieldPath = `userNotes.${courseId}_ch${chapterNum}`; // Use combined key
     try {
         const docSnap = await userRef.get();
         if (docSnap.exists) {
             const notes = docSnap.data()?.userNotes?.[fieldPath] || []; // Access using combined key
             console.log(`Loaded ${notes.length} user notes for ${courseId} Ch ${chapterNum} from map key ${fieldPath}`);
             // Ensure timestamps are numbers (Date.now() is used for new notes)
             return notes.map(n => ({ ...n, timestamp: Number(n.timestamp) || Date.now() }));
         }
         return [];
     } catch (error) {
         console.error(`Error loading user notes for ${courseId} Ch ${chapterNum}:`, error);
         return [];
     }
}

// SHARED NOTES (Stored in a separate global collection)
export async function saveSharedNote(courseId, chapterNum, noteData, user) {
     if (!db || !user) return false;
     // Consider a more robust ID generation if needed
     const docId = `shared_${courseId}_ch${chapterNum}_${Date.now()}`;
     try {
         await db.collection(sharedNotesCollection).doc(docId).set({
             courseId: courseId,
             chapterNum: Number(chapterNum),
             originalNoteId: noteData.id, // Link to original user note if applicable
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
                           .limit(50) // Limit results
                           .get();

        const notes = [];
        snapshot.forEach(doc => {
             const data = doc.data();
             notes.push({
                 id: doc.id,
                 ...data,
                 // Convert timestamp for display
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
    if (!db || !currentUser || !currentUser.isAdmin) { // MODIFIED
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
    if (!db || !currentUser || !currentUser.isAdmin) { // MODIFIED
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

// --- NEW: Delete All Feedback Messages ---
export async function deleteAllFeedbackMessages() {
    if (!db || !currentUser || !currentUser.isAdmin) { // MODIFIED
        throw new Error("Permission denied: Admin privileges required.");
    }
    console.log("Admin: Deleting all feedback messages...");
    try {
        const snapshot = await db.collection('feedback')
                               .limit(500) // Process in batches if needed for large collections
                               .get();

        if (snapshot.empty) {
            console.log("No feedback messages to delete.");
            return 0; // No messages to delete
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

// --- NEW: Delete All Exam Issues ---
export async function deleteAllExamIssues() {
    if (!db || !currentUser || !currentUser.isAdmin) { // MODIFIED
        throw new Error("Permission denied: Admin privileges required.");
    }
    console.log("Admin: Deleting all exam issues...");
    try {
        const snapshot = await db.collection('examIssues')
                               .limit(500) // Process in batches if needed
                               .get();

        if (snapshot.empty) {
             console.log("No exam issues to delete.");
            return 0; // No issues to delete
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

// --- NEW: Delete Inbox Message ---
export async function deleteInboxMessage(userId, messageId) {
    // Allow admin or owner to delete inbox messages
    if (!db || !userId || !messageId || !currentUser) { // MODIFIED
        console.error("Cannot delete inbox message: Missing DB, userId, messageId, or auth info");
        return false;
    }

    const currentUid = currentUser.uid;
    const isAdminUser = currentUser.isAdmin; // MODIFIED
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

// --- NEW: Delete Course Activity Progress ---
export async function deleteCourseActivityProgress(userId, courseId, activityType, activityId) {
    // Only admin can delete specific progress items
    if (!db || !currentUser || !currentUser.isAdmin) { // MODIFIED
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
            let valueToDelete = null; // Used for specific types if needed

            // Determine the correct score map and key based on activity type
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
                    // Final exams are stored in an array (or null)
                    let finalScores = progressData.finalExamScores || [];
                    // activityId might be 'final1', 'final2' etc. -> map to index 0, 1
                    const finalIndex = parseInt(activityId.replace('final', '')) - 1;
                    if (Array.isArray(finalScores) && finalIndex >= 0 && finalIndex < finalScores.length) {
                        finalScores[finalIndex] = null; // Nullify the score at the specific index
                        updates.finalExamScores = finalScores;
                    } else {
                        console.warn(`Invalid final exam index or score array for ${activityId}`);
                        // Don't throw, just log and don't update if invalid
                    }
                    mapKey = null; // Handled separately above
                    break;
                 case 'skip_exam': // Deleting skip exam attempts/scores
                    mapKey = 'skipExamAttempts';
                    valueToDelete = activityId; // activityId is the chapter number string
                    const attemptsMap = progressData.skipExamAttempts || {};
                    const scoresMap = progressData.lastSkipExamScore || {};
                    if (attemptsMap.hasOwnProperty(valueToDelete)) delete attemptsMap[valueToDelete];
                    if (scoresMap.hasOwnProperty(valueToDelete)) delete scoresMap[valueToDelete];
                    updates.skipExamAttempts = attemptsMap;
                    updates.lastSkipExamScore = scoresMap;
                    mapKey = null; // Handled separately
                    break;
                case 'video': // Deleting watched video progress
                     mapKey = 'watchedVideoUrls';
                     valueToDelete = activityId; // activityId is the video URL
                     const urlsMap = progressData.watchedVideoUrls || {};
                     const durationsMap = progressData.watchedVideoDurations || {};
                     if (urlsMap.hasOwnProperty(valueToDelete)) delete urlsMap[valueToDelete];
                     if (durationsMap.hasOwnProperty(valueToDelete)) delete durationsMap[valueToDelete];
                     updates.watchedVideoUrls = urlsMap;
                     updates.watchedVideoDurations = durationsMap;
                     mapKey = null; // Handled separately
                     break;
                case 'pdf': // Deleting PDF progress
                     mapKey = 'pdfProgress';
                     valueToDelete = activityId; // activityId is the PDF URL
                     const pdfMap = progressData.pdfProgress || {};
                     if (pdfMap.hasOwnProperty(valueToDelete)) delete pdfMap[valueToDelete];
                     updates.pdfProgress = pdfMap;
                     mapKey = null; // Handled separately
                     break;
                 case 'daily': // Deleting a specific daily progress entry
                     mapKey = 'dailyProgress';
                     valueToDelete = activityId; // activityId is the date string YYYY-MM-DD
                     const dailyMap = progressData.dailyProgress || {};
                     if (dailyMap.hasOwnProperty(valueToDelete)) delete dailyMap[valueToDelete];
                     updates.dailyProgress = dailyMap;
                     mapKey = null; // Handled separately
                     break;

                default:
                    throw new Error(`Invalid activity type for deletion: ${activityType}`);
            }

            // Handle map-based deletion
            if (mapKey && valueToDelete !== null) {
                 // Ensure the map exists before trying to delete
                if (progressData[mapKey] && progressData[mapKey].hasOwnProperty(valueToDelete)) {
                    delete progressData[mapKey][valueToDelete]; // Delete the specific key from the score map
                    updates[mapKey] = progressData[mapKey]; // Assign the modified map to updates
                } else {
                    console.warn(`Activity ID "${valueToDelete}" not found in map "${mapKey}" for deletion.`);
                }
            }

            // Only update if there are changes
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
        alert(`Error deleting progress: ${error.message}`); // Show error to admin
        return false;
    }
}

// --- NEW: Admin Tasks Management ---

/**
 * Fetches all tasks from the adminTasks collection, ordered by creation date.
 * @returns {Promise<Array<object>>} - An array of task objects { id, text, status, createdAt }.
 */
export async function fetchAdminTasks() {
    if (!db) {
        console.error("Firestore DB not initialized");
        return [];
    }
    console.log("Fetching admin tasks...");
    try {
        const snapshot = await db.collection(adminTasksCollection)
                           .orderBy('createdAt', 'desc') // Show newest first
                           .get();
        const tasks = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            tasks.push({
                id: doc.id,
                text: data.text,
                status: data.status,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null // Convert timestamp
            });
        });
        console.log(`Successfully fetched ${tasks.length} admin tasks.`);
        return tasks;
    } catch (error) {
        console.error("Error fetching admin tasks:", error);
        return []; // Return empty array on error
    }
}

/**
 * Adds a new task to the adminTasks collection. Requires admin privileges.
 * @param {string} taskText - The text content of the task.
 * @returns {Promise<string|null>} - The ID of the newly created task, or null on failure.
 */
export async function addAdminTask(taskText) {
    if (!db || !currentUser || !currentUser.isAdmin) { // MODIFIED
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
            status: 'pending', // Default status
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

/**
 * Updates the status of an existing admin task. Requires admin privileges.
 * @param {string} taskId - The ID of the task document to update.
 * @param {'pending' | 'done'} newStatus - The new status for the task.
 * @returns {Promise<boolean>} - True on success, false on failure.
 */
export async function updateAdminTaskStatus(taskId, newStatus) {
    if (!db || !currentUser || !currentUser.isAdmin) { // MODIFIED
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

/**
 * Deletes an admin task document, *only if* its status is 'done'. Requires admin privileges.
 * @param {string} taskId - The ID of the task document to delete.
 * @returns {Promise<boolean>} - True on success, false on failure or if status is not 'done'.
 */
export async function deleteAdminTask(taskId) {
    if (!db || !currentUser || !currentUser.isAdmin) { // MODIFIED
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
        // Fetch the document first to check its status
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

        // Status is 'done', proceed with deletion
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
/**
 * Toggles the isAdmin status for a target user. Only callable by the primary admin.
 * @param {string} targetUserId - The UID of the user whose admin status is to be toggled.
 * @param {boolean} currentIsAdmin - The current isAdmin status of the target user.
 * @returns {Promise<boolean>} - True on success, false on failure.
 */
export async function toggleUserAdminStatus(targetUserId, currentIsAdmin) {
    if (!db || !currentUser || currentUser.uid !== ADMIN_UID) { // Only primary admin can toggle
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

// MODIFIED: New function for admin to update another user's subject status
/**
 * Admin function to update the status of a subject for a specific user.
 * @param {string} adminUid - The UID of the admin performing the action.
 * @param {string} targetUserId - The UID of the user whose subject status is to be updated.
 * @param {string} subjectId - The ID of the subject within the target user's appData.
 * @param {'pending' | 'approved' | 'rejected'} newStatus - The new status for the subject.
 * @returns {Promise<boolean>} - True on success, false on failure.
 */
export async function adminUpdateUserSubjectStatus(adminUid, targetUserId, subjectId, newStatus) {
    if (!db || !currentUser || !currentUser.isAdmin) { // MODIFIED: Check current logged-in user's admin status
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

        // Create a deep copy to modify, then update the whole appData
        const newAppData = JSON.parse(JSON.stringify(userData.appData));
        newAppData.subjects[subjectId].status = newStatus;
        // Optionally, if approving, admin could be noted as approver
        // newAppData.subjects[subjectId].approvedBy = adminUid;
        // newAppData.subjects[subjectId].approvedAt = new Date().toISOString();

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
/**
 * Updates a user's credit balance atomically and logs the transaction.
 * @param {string} userId - The UID of the user.
 * @param {number} creditChange - The amount to change credits by (positive or negative).
 * @param {string} reason - A brief description for the credit change (e.g., "Completed Assignment").
 * @returns {Promise<boolean>} - True on success, false on failure.
 */
export async function updateUserCredits(userId, creditChange, reason) {
    if (!db || !userId || typeof creditChange !== 'number' || !reason) {
        console.error("updateUserCredits: Invalid parameters.", { userId, creditChange, reason });
        return false;
    }
    if (creditChange === 0) {
        console.log("updateUserCredits: creditChange is 0, no update needed.");
        return true; // No change, but not an error.
    }

    const userRef = db.collection('users').doc(userId);
    const creditLogRef = userRef.collection(userCreditLogSubCollection).doc(); // Auto-generate ID for log

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error(`User document ${userId} not found for credit update.`);
            }
            const currentCredits = userDoc.data().credits || 0;
            const newCredits = currentCredits + creditChange;

            // Update user's credit balance
            transaction.update(userRef, {
                credits: firebase.firestore.FieldValue.increment(creditChange)
            });

            // Log the transaction
            transaction.set(creditLogRef, {
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                change: creditChange,
                newBalance: newCredits, // Store the calculated new balance for the log
                reason: reason,
                performedBy: currentUser ? currentUser.uid : 'system' // MODIFIED: Use currentUser from state
            });
        });

        console.log(`Successfully updated credits for user ${userId} by ${creditChange}. Reason: ${reason}`);
        
        // If the current user is being updated, refresh their local state
        if (currentUser && currentUser.uid === userId) {
            const oldCredits = currentUser.credits || 0;
            const newLocalCredits = oldCredits + creditChange;
            setCurrentUser({ ...currentUser, credits: newLocalCredits }); // Update central state

            // Potentially update UI elements displaying credits if not handled by reactivity
            const creditsDisplay = document.getElementById('user-profile-credits');
            if (creditsDisplay) creditsDisplay.textContent = newLocalCredits.toLocaleString();
            const marketplaceCreditsDisplay = document.getElementById('marketplace-credit-balance');
            if (marketplaceCreditsDisplay) marketplaceCreditsDisplay.textContent = newLocalCredits.toLocaleString();
            
            // The auth listener or other UI update functions might already handle refreshing the header
            // fetchAndUpdateUserInfo might be too heavy here, setCurrentUser should suffice for state.
        }
        return true;
    } catch (error) {
        console.error(`Error updating credits for user ${userId}:`, error);
        alert(`Failed to update credits: ${error.message}`);
        return false;
    }
}

// NOTE for `submitPendingResults` (PDF exams):
// The `submitPendingResults` function is located in `ui_exams_dashboard.js`.
// After `submitPendingResults` successfully saves the exam results to Firestore
// (likely by calling `storeExamResult` from `exam_storage.js`, or its own logic),
// it should then call:
// await updateUserCredits(currentUser.uid, 10, "Completed PDF Test (Legacy)");
// This cannot be directly implemented in `firebase_firestore.js` without modifying `ui_exams_dashboard.js`.
// Ensure this call is added to the success path of `submitPendingResults`.
// --- END: User Credit System ---


// --- END OF FILE firebase_firestore.js ---