// --- START OF FILE firebase_firestore.js ---

// firebase_firestore.js

import {
    db, auth as firebaseAuth, data, setData, currentSubject, setCurrentSubject,
    userCourseProgressMap, setUserCourseProgressMap, updateGlobalCourseData, globalCourseDataMap,
    activeCourseId, setActiveCourseId, updateUserCourseProgress
} from './state.js';
import { showLoading, hideLoading } from './utils.js';
import { updateChaptersFromMarkdown } from './markdown_parser.js';
// *** MODIFIED: Import new GRADING_WEIGHTS from config ***
import { initialSubjectData, ADMIN_UID, DEFAULT_PROFILE_PIC_URL, FOP_COURSE_ID, FOP_COURSE_DEFINITION, GRADING_WEIGHTS, PASSING_GRADE_PERCENT } from './config.js';
import { updateSubjectInfo } from './ui_core.js';
import { showOnboardingUI } from './ui_onboarding.js';
// *** MODIFIED: Import calculateTotalMark, getLetterGrade ***
import { determineTodaysObjective, calculateTotalMark, getLetterGrade } from './course_logic.js';

// --- Utilities ---
/**
 * Fetches the markdown content for a given subject.
 * Handles the default 'chapters.md' case.
 * Returns the markdown text content or null if fetch fails.
 */
async function fetchMarkdownForSubject(subject) {
     if (!subject) return null;
    // Use subject.fileName, default logic might need adjustment based on expected import data format
    const fileName = subject.fileName || (subject.name === "Fundamentals of Physics" ? "chapters.md" : `${subject.name}.md`);
    const safeFileName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    const url = `${safeFileName}?t=${new Date().getTime()}`; // Add cache buster

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
        // Don't alert during load, just log the error
        return null; // Indicate fetch failure
    }
}


// --- User Data Management ---

/**
 * Saves the user's core application data (subjects, test history, etc.) to Firestore.
 * @param {string} uid - The user's unique ID.
 */
export async function saveUserData(uid) {
    if (!db) { console.error("Firestore DB not initialized"); return; }
    if (!uid || !data) {
        console.warn("Attempted to save user appData without UID or data object.");
        return;
    }
    const userRef = db.collection('users').doc(uid);
    try {
        // Only save the 'appData' part (subjects, history, settings etc.)
        // Ensure data is serializable (no undefined values, classes etc.)
        const cleanData = JSON.parse(JSON.stringify(data));
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
        // Ensure lastActivityDate exists and is a Timestamp or Date BEFORE saving
        let lastActivity = progressData.lastActivityDate;
        if (!(lastActivity instanceof firebase.firestore.Timestamp) && !(lastActivity instanceof Date)) {
            lastActivity = new Date(); // Use client time now if invalid/missing for saving
        }
        const dataToSave = JSON.parse(JSON.stringify(progressData)); // Deep clone to avoid modifying original and ensure plain object

        // Convert Dates back to Timestamps before saving
        if (dataToSave.enrollmentDate) { // Check if property exists
             try { dataToSave.enrollmentDate = firebase.firestore.Timestamp.fromDate(new Date(dataToSave.enrollmentDate)); }
             catch (e) { console.error("Error converting enrollmentDate to Timestamp:", e); delete dataToSave.enrollmentDate; }
        }
        if (dataToSave.completionDate) {
             try { dataToSave.completionDate = firebase.firestore.Timestamp.fromDate(new Date(dataToSave.completionDate)); }
             catch (e) { console.error("Error converting completionDate to Timestamp:", e); delete dataToSave.completionDate; }
        }
        // Use server timestamp for lastActivityDate when saving
        dataToSave.lastActivityDate = firebase.firestore.FieldValue.serverTimestamp();


        // Ensure arrays/objects are properly formatted for Firestore
        dataToSave.courseStudiedChapters = dataToSave.courseStudiedChapters || [];
        dataToSave.watchedVideoUrls = dataToSave.watchedVideoUrls || {};
        dataToSave.watchedVideoDurations = dataToSave.watchedVideoDurations || {};
        // *** NEW: Ensure pdfProgress exists ***
        dataToSave.pdfProgress = dataToSave.pdfProgress || {};
        dataToSave.skipExamAttempts = dataToSave.skipExamAttempts || {};
        dataToSave.lastSkipExamScore = dataToSave.lastSkipExamScore || {};
        dataToSave.dailyProgress = dataToSave.dailyProgress || {};
        // dataToSave.skipExamScores = dataToSave.skipExamScores || {}; // Removed from grading logic
        dataToSave.assignmentScores = dataToSave.assignmentScores || {};
        dataToSave.weeklyExamScores = dataToSave.weeklyExamScores || {};
        dataToSave.midcourseExamScores = dataToSave.midcourseExamScores || {};
        if (dataToSave.finalExamScores === undefined) { dataToSave.finalExamScores = null; }

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
                progressData.courseStudiedChapters = progressData.courseStudiedChapters || [];
                progressData.dailyProgress = progressData.dailyProgress || {};
                // progressData.skipExamScores = progressData.skipExamScores || {}; // Removed
                progressData.assignmentScores = progressData.assignmentScores || {};
                progressData.weeklyExamScores = progressData.weeklyExamScores || {};
                progressData.midcourseExamScores = progressData.midcourseExamScores || {};
                progressData.finalExamScores = progressData.finalExamScores === undefined ? null : progressData.finalExamScores; // Handle null/array
                progressData.watchedVideoUrls = progressData.watchedVideoUrls || {};
                progressData.watchedVideoDurations = progressData.watchedVideoDurations || {};
                // *** NEW: Ensure pdfProgress exists ***
                progressData.pdfProgress = progressData.pdfProgress || {};
                progressData.skipExamAttempts = progressData.skipExamAttempts || {};
                progressData.lastSkipExamScore = progressData.lastSkipExamScore || {};
                progressData.status = progressData.status || 'enrolled';
                // Convert Timestamps to Dates for client-side use
                if (progressData.enrollmentDate?.toDate) {
                    progressData.enrollmentDate = progressData.enrollmentDate.toDate();
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
                     progressData.currentDayObjective = determineTodaysObjective(progressData, courseDef);
                } else {
                     console.warn(`Course definition missing for course ${doc.id} when calculating objective.`);
                     progressData.currentDayObjective = "Course definition unavailable.";
                }

                newProgressMap.set(doc.id, progressData);
                console.log(`Loaded progress for course: ${doc.id}`);
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
 */
export async function loadGlobalCourseDefinitions() {
    if (!db) { console.error("Firestore DB not initialized"); return; }
    console.log("Loading global course definitions...");
    const coursesRef = db.collection('courses');
    try {
        // Fetch all courses (approved or not) so admin can see them
        const snapshot = await coursesRef.get();
        snapshot.forEach(doc => {
            const courseData = doc.data();
            let finalCourseData = { ...courseData, id: doc.id }; // Ensure ID is included

            if (doc.id === FOP_COURSE_ID && !courseData.chapters) {
                 console.warn(`Firestore doc for ${FOP_COURSE_ID} missing chapters, merging with local config.`);
                 finalCourseData = { ...FOP_COURSE_DEFINITION, ...courseData, id: FOP_COURSE_ID };
            }
            // Ensure chapterResources exists
            finalCourseData.chapterResources = finalCourseData.chapterResources || {};
            // Ensure youtubePlaylistUrls exists
            if (!finalCourseData.youtubePlaylistUrls && finalCourseData.youtubePlaylistUrl) {
                 finalCourseData.youtubePlaylistUrls = [finalCourseData.youtubePlaylistUrl];
            } else {
                 finalCourseData.youtubePlaylistUrls = finalCourseData.youtubePlaylistUrls || [];
            }

            updateGlobalCourseData(doc.id, finalCourseData);
            console.log(`Loaded global course definition: ${finalCourseData.name} (${doc.id}), Status: ${finalCourseData.status || 'N/A'}`);
        });
         if (!globalCourseDataMap.has(FOP_COURSE_ID)) {
              console.log(`FOP course ${FOP_COURSE_ID} not found in Firestore, loading from local config.`);
              const fopDef = {...FOP_COURSE_DEFINITION}; // Clone
              fopDef.youtubePlaylistUrls = fopDef.youtubePlaylistUrls || (fopDef.youtubePlaylistUrl ? [fopDef.youtubePlaylistUrl] : []);
              updateGlobalCourseData(FOP_COURSE_ID, fopDef);
         }
    } catch (error) {
        console.error("Error loading global course definitions:", error);
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

            // --- appData Initialization/Validation ---
            if (!loadedAppData || typeof loadedAppData.subjects !== 'object') {
                console.warn("Loaded appData missing or invalid 'subjects'. Resetting to default.");
                loadedAppData = JSON.parse(JSON.stringify(initialSubjectData));
                needsAppDataSaveAfterLoad = true;
            }
             if (userData.photoURL === undefined) {
                console.log("Initializing top-level photoURL.");
                 const authUser = firebaseAuth?.currentUser;
                await userRef.update({ photoURL: authUser?.photoURL || DEFAULT_PROFILE_PIC_URL });
             }
             if (userData.completedCourseBadges === undefined) {
                  console.log("Initializing completedCourseBadges array.");
                  await userRef.update({ completedCourseBadges: [] });
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
                     const subjectMarkdown = await fetchMarkdownForSubject(subject);
                     if (subjectMarkdown !== null) {
                          const subjectModified = updateChaptersFromMarkdown(subject, subjectMarkdown);
                          if (subjectModified) { appDataWasModifiedBySync = true; }
                     } else { console.warn(`Skipping MD sync for Subject ${subject.name} (ID: ${subjectId}) - MD file missing.`); }
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
                     subject.studied_chapters = subject.studied_chapters || [];
                     subject.pending_exams = (subject.pending_exams || []).map(exam => ({ ...exam, id: exam.id || `pending_${Date.now()}` }));
                     subject.exam_history = (subject.exam_history || []).map(exam => ({ ...exam, examId: exam.examId || `history_${Date.now()}` }));
                     subject.max_questions_per_test = subject.max_questions_per_test || 42;
                     subject.chapters = subject.chapters || {};
                     // Chapter fields
                     for (const chapNum in subject.chapters) {
                        const chap = subject.chapters[chapNum];
                        if (!chap) continue;
                        chap.total_questions = chap.total_questions ?? 0;
                        chap.total_attempted = chap.total_attempted ?? 0;
                        chap.total_wrong = chap.total_wrong ?? 0;
                        chap.mistake_history = chap.mistake_history ?? [];
                        chap.consecutive_mastery = chap.consecutive_mastery ?? 0;
                        // Validate available_questions
                        const expectedAvailable = Array.from({ length: chap.total_questions }, (_, j) => j + 1);
                        const currentAvailableSet = new Set(chap.available_questions || []);
                        const validAvailable = expectedAvailable.filter(qNum => currentAvailableSet.has(qNum));
                        if (JSON.stringify(validAvailable.sort((a,b) => a-b)) !== JSON.stringify((chap.available_questions || []).sort((a,b)=>a-b))) {
                             chap.available_questions = validAvailable; needsAppDataSaveAfterLoad = true;
                        } else if (chap.available_questions === undefined) {
                             chap.available_questions = validAvailable; needsAppDataSaveAfterLoad = true;
                        }
                     }
                 }
              } else { console.warn("Cannot validate/repair appData - state.data.subjects is missing."); }


            // Save appData if modified
            if (needsAppDataSaveAfterLoad) {
                 console.log("Saving appData after load/sync/validation/repair...");
                 await saveUserData(uid);
            }

            // Select Default Subject
            if (data && data.subjects) {
                const subjectKeys = Object.keys(data.subjects);
                let subjectToSelectId = null;
                if (currentSubject && data.subjects[currentSubject.id]) { subjectToSelectId = currentSubject.id; }
                else if (subjectKeys.length > 0) { subjectToSelectId = subjectKeys[0]; }
                setCurrentSubject(subjectToSelectId ? data.subjects[subjectToSelectId] : null);
                updateSubjectInfo();
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
    if (!docExists || forceReset) {
        console.log(`Initializing data for user: ${uid}. Force reset: ${forceReset}. Username: ${usernameLower}`);
        let defaultAppData = JSON.parse(JSON.stringify(initialSubjectData));
        for (const subjectId in defaultAppData.subjects) {
            const defaultSubject = defaultAppData.subjects[subjectId];
            if (defaultSubject) { const defaultMarkdown = await fetchMarkdownForSubject(defaultSubject); if (defaultMarkdown) { updateChaptersFromMarkdown(defaultSubject, defaultMarkdown); } }
        }
        const dataToSet = {
             email: email, username: usernameLower,
             displayName: (forceReset && existingUserData?.displayName) ? existingUserData.displayName : (displayName || username || email?.split('@')[0]),
             photoURL: (forceReset && existingUserData?.photoURL) ? existingUserData.photoURL : (photoURL || DEFAULT_PROFILE_PIC_URL),
             createdAt: firebase.firestore.FieldValue.serverTimestamp(),
             onboardingComplete: (forceReset && existingUserData?.onboardingComplete !== undefined) ? existingUserData.onboardingComplete : false,
             appData: defaultAppData,
             completedCourseBadges: (forceReset && existingUserData?.completedCourseBadges) ? existingUserData.completedCourseBadges : [] // Initialize badges
        };
        try {
            await userRef.set(dataToSet); console.log(`User data initialized/reset (${forceReset ? 'force' : 'initial'}) in Firestore.`);
            setData(defaultAppData);
            if (forceReset) { setUserCourseProgressMap(new Map()); console.warn("Force reset executed. User course progress subcollection NOT cleared."); }
            if (forceReset) { const firstSubjectId = Object.keys(defaultAppData.subjects)[0]; setCurrentSubject(firstSubjectId ? defaultAppData.subjects[firstSubjectId] : null); updateSubjectInfo(); }
            if (usernameLower) { try { const usernameRef = db.collection('usernames').doc(usernameLower); const usernameDoc = await usernameRef.get(); if (!usernameDoc.exists) { await usernameRef.set({ userId: uid }); } } catch(userErr) { console.error("Error reserving username:", userErr); } }
        } catch (error) { console.error("Error initializing user data:", error); alert("Error setting up initial user data: " + error.message); }
    } else {
        let updatesNeeded = {};
        if (usernameLower && existingUserData && !existingUserData.username) { updatesNeeded.username = usernameLower; }
        if (existingUserData && !existingUserData.displayName) { updatesNeeded.displayName = displayName || username || email?.split('@')[0]; }
        if (existingUserData && existingUserData.onboardingComplete === undefined) { updatesNeeded.onboardingComplete = false; }
        if (existingUserData && existingUserData.photoURL === undefined) { updatesNeeded.photoURL = photoURL || DEFAULT_PROFILE_PIC_URL; }
        if (existingUserData && !existingUserData.completedCourseBadges) { updatesNeeded.completedCourseBadges = []; } // Ensure badges exist
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
    const feedbackRef = db.collection('feedback').doc();
    try {
        await feedbackRef.set({ subjectId: feedbackData.subjectId || 'N/A', questionId: feedbackData.questionId || 'N/A', feedbackText: feedbackData.feedbackText, context: feedbackData.context || null, userId: user.uid, username: user.displayName || user.email, timestamp: firebase.firestore.FieldValue.serverTimestamp(), status: 'new' });
        console.log("Feedback submitted successfully:", feedbackRef.id); return true;
    } catch (error) { console.error("Error submitting feedback:", error); alert("Failed to submit feedback: " + error.message); return false; }
}

// --- Inbox/Messaging ---
export async function sendAdminReply(recipientUid, subject, body, adminUser) {
     if (!db || !adminUser || adminUser.uid !== ADMIN_UID) { console.error("Unauthorized admin reply."); alert("Error: Admin privileges required."); return false; }
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

// --- Admin Function to Update Course Definition ---
export async function updateCourseDefinition(courseId, updates) {
     if (!db || !firebaseAuth || firebaseAuth.currentUser?.uid !== ADMIN_UID) {
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
     console.log(`Attempting to update/set course ${courseId} with:`, updates);
     try {
          // Use set with merge to handle nested updates correctly
         await courseRef.set(updates, { merge: true });
         console.log(`Course definition for ${courseId} updated/created successfully.`);

         // Update local state map after successful save
         const currentData = globalCourseDataMap.get(courseId) || {};
         // Create a new object with merged data
         const mergedData = { ...currentData, ...updates };
         // Deep merge chapterResources if present in both
         if (currentData.chapterResources && updates.chapterResources) {
              mergedData.chapterResources = { ...currentData.chapterResources, ...updates.chapterResources };
              // Deep merge the inner lectureUrls array within chapterResources
              for (const chapNum in updates.chapterResources) {
                   if (currentData.chapterResources[chapNum]?.lectureUrls && updates.chapterResources[chapNum]?.lectureUrls) {
                        // Ensure the nested structure exists before accessing lectureUrls
                        if (!mergedData.chapterResources[chapNum]) {
                             mergedData.chapterResources[chapNum] = {};
                        }
                         // Merge URLs, removing duplicates
                         mergedData.chapterResources[chapNum].lectureUrls = [...new Set([...(currentData.chapterResources[chapNum].lectureUrls || []), ...(updates.chapterResources[chapNum].lectureUrls || [])])];
                   }
              }
         }
         updateGlobalCourseData(courseId, mergedData); // Update local state map
         console.log("Local course definition map updated.");
         return true;
     } catch (error) {
         console.error(`Error updating/setting course definition for ${courseId}:`, error);
         alert(`Failed to update course: ${error.message}`);
         return false;
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
    if (!progress.courseStudiedChapters.includes(chapterNumInt)) {
        progress.courseStudiedChapters.push(chapterNumInt);
        progress.courseStudiedChapters.sort((a, b) => a - b);
        console.log(`Chapter ${chapterNumInt} marked as studied for course ${courseId} via ${method}. Saving progress...`);
        const todayStr = new Date().toISOString().slice(0, 10);
        progress.dailyProgress = progress.dailyProgress || {};
        progress.dailyProgress[todayStr] = progress.dailyProgress[todayStr] || { chaptersStudied: [], assignmentCompleted: false, assignmentScore: null };
        if (!progress.dailyProgress[todayStr].chaptersStudied.includes(chapterNumInt)) {
            progress.dailyProgress[todayStr].chaptersStudied.push(chapterNumInt);
            progress.dailyProgress[todayStr].chaptersStudied.sort((a,b) => a-b);
        }
        updateUserCourseProgress(courseId, progress);
        return await saveUserCourseProgress(uid, courseId, progress); // Save updated progress
    } else {
        console.log(`Chapter ${chapterNumInt} already marked as studied for course ${courseId}.`);
        return true; // Indicate success even if no change was made
    }
}

// --- Admin Function to Update User Course Status ---
/**
 * Allows an admin to mark a course as completed for a user and set the final grade/mark.
 */
export async function updateCourseStatusForUser(targetUserId, courseId, finalMark, newStatus) {
    // Check admin privileges using firebaseAuth directly
    if (!firebaseAuth || firebaseAuth.currentUser?.uid !== ADMIN_UID) {
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
                progressUpdates.totalMark = finalMark;
                finalGrade = getLetterGrade(finalMark);
                progressUpdates.grade = finalGrade;
            } else if (newStatus !== 'enrolled') {
                 // If mark not provided, attempt calculation only if marking complete/failed
                 const calculatedMark = calculateTotalMark(progressData);
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
                // **FIXED:** Use Timestamp.now() instead of serverTimestamp() here
                badges.push({
                    courseId: courseId,
                    courseName: courseDef.name || 'Unknown Course',
                    grade: finalGrade,
                    completionDate: firebase.firestore.Timestamp.now() // Use client time for array element
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
        if (userCourseProgressMap.has(courseId) && targetUserId === firebaseAuth.currentUser?.uid) {
             const updatedProgressDoc = await progressRef.get();
             if (updatedProgressDoc.exists) {
                 const updatedProgressData = updatedProgressDoc.data();
                 // Convert Timestamps back AFTER the transaction is complete
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
        // Give a more specific alert if it's the timestamp issue
        if (error.message.includes("serverTimestamp() is not currently supported inside arrays")) {
             alert("Failed to update course status: Internal error related to timestamp handling within arrays. Please try again or contact support.");
        } else {
             alert(`Failed to update course status: ${error.message}`);
        }
        return false;
    }
}

/**
 * Handles adding a new badge via admin action.
 */
export async function handleAddBadgeForUser(userId, courseId, courseName, grade, completionDate) {
     if (!firebaseAuth || firebaseAuth.currentUser?.uid !== ADMIN_UID) { alert("Admin privileges required."); return; }
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
     if (!firebaseAuth || firebaseAuth.currentUser?.uid !== ADMIN_UID) { alert("Admin privileges required."); return; }
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

// --- END OF FILE firebase_firestore.js ---