// firebase_firestore.js

import {
    db, auth as firebaseAuth, data, setData, currentSubject, setCurrentSubject,
    userCourseProgressMap, setUserCourseProgressMap, updateGlobalCourseData, globalCourseDataMap,
    activeCourseId, setActiveCourseId
} from './state.js';
import { showLoading, hideLoading } from './utils.js';
import { updateChaptersFromMarkdown } from './markdown_parser.js';
import { initialSubjectData, ADMIN_UID, DEFAULT_PROFILE_PIC_URL, FOP_COURSE_ID, FOP_COURSE_DEFINITION } from './config.js';
import { updateSubjectInfo } from './ui_core.js';
import { showOnboardingUI } from './ui_onboarding.js';
import { determineTodaysObjective } from './course_logic.js';

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
        const cleanData = JSON.parse(JSON.stringify(data)); // Deep copy to avoid modifying state object
        await userRef.update({
            appData: cleanData
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
        // Use set with merge option to create or update the document
        // Add/update a last updated timestamp automatically
        const dataToSave = {
            ...progressData,
            lastActivityDate: firebase.firestore.FieldValue.serverTimestamp()
        };
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
                progressData.skipExamScores = progressData.skipExamScores || {};
                progressData.assignmentScores = progressData.assignmentScores || {};
                progressData.weeklyExamScores = progressData.weeklyExamScores || {};
                progressData.midcourseExamScores = progressData.midcourseExamScores || {};
                progressData.finalExamScores = progressData.finalExamScores || null;
                progressData.status = progressData.status || 'enrolled';
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
        // Re-throw the error so the caller (loadUserData/auth listener) knows about it
        // This is important for handling permission errors correctly.
        throw error;
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
        const snapshot = await coursesRef.where('status', '==', 'approved').get(); // Only load approved courses globally
        snapshot.forEach(doc => {
            const courseData = doc.data();
            // Merge with local defaults if necessary (like FoP)
            let finalCourseData = { ...courseData };
            if (doc.id === FOP_COURSE_ID && !courseData.chapters) {
                 console.warn(`Firestore doc for ${FOP_COURSE_ID} missing chapters, merging with local config.`);
                 // Ensure Firestore data takes precedence if fields exist
                 finalCourseData = { ...FOP_COURSE_DEFINITION, ...courseData, id: FOP_COURSE_ID };
            }
            updateGlobalCourseData(doc.id, finalCourseData); // Update state map
            console.log(`Loaded global course definition: ${finalCourseData.name} (${doc.id})`);
        });
         // Ensure FoP definition is loaded from config if not found in Firestore 'approved' list
         if (!globalCourseDataMap.has(FOP_COURSE_ID)) {
              console.log(`FOP course ${FOP_COURSE_ID} not found in Firestore 'approved' courses, loading from local config.`);
              updateGlobalCourseData(FOP_COURSE_ID, FOP_COURSE_DEFINITION);
         }
    } catch (error) {
        console.error("Error loading global course definitions:", error);
        // Don't block app load for this, but log it. UI might show fewer courses.
    }
}


/**
 * Loads the main user document (including appData) and triggers loading of course progress.
 * Handles initialization if the user document doesn't exist.
 * Syncs subject data with Markdown files.
 * @param {string} uid - The user's unique ID.
 */
export async function loadUserData(uid) {
    if (!db) { console.error("Firestore DB not initialized"); return; } // Removed hideLoading() call
    if (!uid) { console.error("loadUserData called without UID."); return; } // Removed hideLoading() call

    console.log(`Loading user data for user: ${uid}`);
    const userRef = db.collection('users').doc(uid);
    try {
        const doc = await userRef.get();
        let needsAppDataSaveAfterLoad = false; // Renamed variable

        if (doc.exists) {
            const userData = doc.data();
            let loadedAppData = userData.appData; // This is the original subject/test data
            console.log("User appData loaded from Firestore.");

            // --- appData Initialization/Validation ---
            if (!loadedAppData || typeof loadedAppData.subjects !== 'object') {
                console.warn("Loaded appData missing or invalid 'subjects'. Resetting to default.");
                loadedAppData = JSON.parse(JSON.stringify(initialSubjectData));
                needsAppDataSaveAfterLoad = true;
            }
            // Ensure top-level photoURL exists (needed for profile)
             if (userData.photoURL === undefined) {
                console.log("Initializing top-level photoURL.");
                 // Use firebaseAuth from import
                 // Need to be careful about race conditions if auth state changes during this load
                 const authUser = firebaseAuth?.currentUser;
                await userRef.update({ photoURL: authUser?.photoURL || DEFAULT_PROFILE_PIC_URL });
                 // No need to set needsAppDataSaveAfterLoad = false; this is a separate update.
             }
            // --- End appData Initialization ---

            setData(loadedAppData); // Update state with potentially reset appData

            // Sync appData with Markdown for each subject
            console.log("Syncing loaded subject appData with Markdown files...");
             let appDataWasModifiedBySync = false;
             if (data && data.subjects) {
                 for (const subjectId in data.subjects) {
                     const subject = data.subjects[subjectId];
                     if (!subject) continue;

                     const subjectMarkdown = await fetchMarkdownForSubject(subject);
                     // Only update if MD content was successfully fetched
                     if (subjectMarkdown !== null) {
                          const subjectModified = updateChaptersFromMarkdown(subject, subjectMarkdown);
                          if (subjectModified) {
                              console.log(`Subject ${subject.name} (ID: ${subjectId}) appData modified by Markdown sync.`);
                              appDataWasModifiedBySync = true;
                          }
                     } else {
                          console.warn(`Skipping Markdown sync for Subject ${subject.name} (ID: ${subjectId}) - MD file not found or fetch failed.`);
                          // Optional: Consider clearing chapters if MD is missing persistently?
                          // if (subject.chapters && Object.keys(subject.chapters).length > 0) {
                          //      subject.chapters = {};
                          //      appDataWasModifiedBySync = true;
                          // }
                     }
                 }
                 if (appDataWasModifiedBySync) {
                     console.log("AppData was modified by Markdown sync overall.");
                     needsAppDataSaveAfterLoad = true;
                 } else {
                     console.log("No appData changes detected during Markdown sync.");
                 }
             } else {
                  console.warn("Cannot sync appData with Markdown - state.data.subjects is missing.");
             }


             // Validate/Repair appData Structure (e.g., ensure arrays/objects exist)
              if (data && data.subjects) {
                 for (const subjectId in data.subjects) {
                     const subject = data.subjects[subjectId];
                      if (!subject) continue;

                     // Ensure basic subject fields
                     if (subject.id !== subjectId) { subject.id = subjectId; needsAppDataSaveAfterLoad = true; }
                     if (!subject.name) { subject.name = `Subject ${subjectId}`; needsAppDataSaveAfterLoad = true; }
                     if (!subject.fileName && subject.name === "Fundamentals of Physics") { subject.fileName = "chapters.md"; needsAppDataSaveAfterLoad = true; }
                     else if (!subject.fileName) { subject.fileName = `${subject.name}.md`.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, ''); needsAppDataSaveAfterLoad = true; }
                     subject.studied_chapters = subject.studied_chapters || [];
                     subject.pending_exams = (subject.pending_exams || []).map(exam => ({
                          ...exam,
                          id: exam.id || `pending_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`, // Ensure unique ID
                          allocation: (typeof exam.allocation === 'object' && exam.allocation !== null) ? exam.allocation : {},
                          results_entered: exam.results_entered || false,
                          timestamp: exam.timestamp || new Date(0).toISOString(),
                          totalQuestions: exam.totalQuestions || 0
                     }));
                     subject.exam_history = (subject.exam_history || []).map(exam => ({
                          ...exam,
                          examId: exam.examId || `history_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`, // Ensure unique ID
                          type: exam.type || (exam.questions ? 'online' : 'pdf'),
                          timestamp: exam.timestamp || new Date(0).toISOString(),
                          score: exam.score ?? 0,
                          totalQuestions: exam.totalQuestions ?? 0,
                          originalScore: exam.originalScore ?? exam.score ?? 0,
                          questions: (exam.questions || []).map(q => ({
                             ...q,
                             id: q.id || `q_${q.chapter}_${q.number}`,
                             isOverridden: q.isOverridden || false
                          }))
                     }));
                     subject.max_questions_per_test = subject.max_questions_per_test || 42;
                     subject.chapters = subject.chapters || {};

                     // Ensure basic chapter fields
                     for (const chapNum in subject.chapters) {
                        const chap = subject.chapters[chapNum];
                        if (!chap) continue;
                        chap.total_questions = chap.total_questions ?? 0;
                        chap.total_attempted = chap.total_attempted ?? 0;
                        chap.total_wrong = chap.total_wrong ?? 0;
                        chap.mistake_history = chap.mistake_history ?? [];
                        chap.consecutive_mastery = chap.consecutive_mastery ?? 0;
                        // Ensure available_questions is valid
                        const expectedAvailable = Array.from({ length: chap.total_questions }, (_, j) => j + 1);
                        const currentAvailableSet = new Set(chap.available_questions || []);
                        const validAvailable = expectedAvailable.filter(qNum => currentAvailableSet.has(qNum));
                        if (JSON.stringify(validAvailable.sort((a,b) => a-b)) !== JSON.stringify((chap.available_questions || []).sort((a,b)=>a-b))) {
                             chap.available_questions = validAvailable;
                             needsAppDataSaveAfterLoad = true;
                        } else if (chap.available_questions === undefined) {
                             chap.available_questions = validAvailable;
                             needsAppDataSaveAfterLoad = true;
                        }
                     }
                 }
              } else {
                  console.warn("Cannot validate/repair appData - state.data.subjects is missing.");
              }


            // Save appData if any modifications happened during load/sync/repair
            if (needsAppDataSaveAfterLoad) {
                 console.log("Saving appData after load/sync/validation/repair...");
                 await saveUserData(uid); // Saves the 'data' object (appData)
            }

            // Select Default Subject (for standard test-gen)
            if (data && data.subjects) {
                const subjectKeys = Object.keys(data.subjects);
                let subjectToSelectId = null;
                // Try to keep the currently selected subject if it still exists
                if (currentSubject && data.subjects[currentSubject.id]) {
                    subjectToSelectId = currentSubject.id;
                } else if (subjectKeys.length > 0) { // Otherwise, select the first one
                     subjectToSelectId = subjectKeys[0];
                }

                if (!subjectToSelectId) {
                    console.warn("Loaded appData has no subjects after sync/validation.");
                    setCurrentSubject(null);
                } else {
                    setCurrentSubject(data.subjects[subjectToSelectId]);
                }
                updateSubjectInfo(); // Update UI header
            } else {
                 setCurrentSubject(null);
                 updateSubjectInfo();
            }

            // *** Load User Course Progress AFTER appData is potentially saved ***
            await loadAllUserCourseProgress(uid);

            await checkOnboarding(uid); // Check onboarding status last

        } else {
             console.log("User document not found for UID:", uid, "- Initializing data.");
             const currentUserDetails = firebaseAuth?.currentUser; // Use firebaseAuth from import
             if (!currentUserDetails) {
                 throw new Error("Cannot initialize data: Current user details unavailable.");
             }
             // Pass necessary details to initialize the user document
             await initializeUserData(
                 uid,
                 currentUserDetails.email,
                 (currentUserDetails.displayName || currentUserDetails.email.split('@')[0]), // Base username
                 currentUserDetails.displayName, // Pass actual displayName
                 currentUserDetails.photoURL // Pass photoURL
             );
             // Reload user data after initialization to ensure everything (including course progress) is loaded correctly
             // This recursive call ensures the full loading logic runs again
             await loadUserData(uid);
             return; // Exit this instance of loadUserData
        }
    } catch (error) {
        console.error("Error in loadUserData:", error);
        // Re-throw the error so the calling function (auth listener) can handle it
        // This prevents the app from proceeding in a potentially broken state
        throw error;
    }
}

/**
 * Initializes the user document in Firestore with default appData and profile info.
 * @param {string} uid
 * @param {string} email
 * @param {string} username - A derived or provided username.
 * @param {string | null} [displayName=null] - User's display name from auth provider.
 * @param {string | null} [photoURL=null] - User's photo URL from auth provider.
 * @param {boolean} [forceReset=false] - If true, overwrites existing data with defaults.
 */
export async function initializeUserData(uid, email, username, displayName = null, photoURL = null, forceReset = false) {
    if (!db || !firebaseAuth) { console.error("Firestore DB or Auth not initialized"); return; }
    const userRef = db.collection('users').doc(uid);
    let docExists = false;
    let existingUserData = null;
    if (!forceReset) {
        try {
            const doc = await userRef.get();
            docExists = doc.exists;
            if (docExists) existingUserData = doc.data();
        } catch (e) { console.error("Error checking user existence:", e); /* Continue anyway */ }
    }

    const usernameLower = username ? username.toLowerCase() : (existingUserData?.username || null);

    if (!docExists || forceReset) {
        console.log(`Initializing data for user: ${uid}. Force reset: ${forceReset}. Username: ${usernameLower}`);
        let defaultAppData = JSON.parse(JSON.stringify(initialSubjectData));

        // Fetch Markdown for the default subject(s) during initialization
        for (const subjectId in defaultAppData.subjects) {
            const defaultSubject = defaultAppData.subjects[subjectId];
            if (defaultSubject) {
                 const defaultMarkdown = await fetchMarkdownForSubject(defaultSubject);
                 if (defaultMarkdown) {
                     updateChaptersFromMarkdown(defaultSubject, defaultMarkdown);
                     console.log(`Initialized chapters for subject '${defaultSubject.name}' from Markdown.`);
                 } else {
                     console.warn(`Could not fetch Markdown for subject '${defaultSubject.name}' during initialization.`);
                 }
            }
        }
        // --- End Fetch Markdown ---

        // Define the main user document structure
        const dataToSet = {
             email: email,
             username: usernameLower,
             displayName: (forceReset && existingUserData?.displayName) ? existingUserData.displayName : (displayName || username || email?.split('@')[0]),
             photoURL: (forceReset && existingUserData?.photoURL) ? existingUserData.photoURL : (photoURL || DEFAULT_PROFILE_PIC_URL),
             createdAt: firebase.firestore.FieldValue.serverTimestamp(),
             onboardingComplete: (forceReset && existingUserData?.onboardingComplete !== undefined) ? existingUserData.onboardingComplete : false,
             appData: defaultAppData, // Store the original test-gen data here
             completedCourseBadges: (forceReset && existingUserData?.completedCourseBadges) ? existingUserData.completedCourseBadges : [] // Initialize badges
        };

        try {
            // Use set to create/overwrite the main user document
            await userRef.set(dataToSet); // Don't merge if initializing or resetting
            console.log(`User data initialized/reset (${forceReset ? 'force' : 'initial'}) in Firestore.`);
            setData(defaultAppData); // Update local state for appData

            // Reset course progress map if forcing reset
            if (forceReset) {
                 setUserCourseProgressMap(new Map());
                 // TODO: Consider deleting documents in the subcollection if truly resetting?
                 // This requires more complex logic (listing and deleting) and careful consideration.
                 console.warn("Force reset executed. User course progress subcollection was NOT automatically cleared.");
            }

            // Set current subject if resetting
            if (forceReset) {
                const firstSubjectId = Object.keys(defaultAppData.subjects)[0];
                setCurrentSubject(firstSubjectId ? defaultAppData.subjects[firstSubjectId] : null);
                updateSubjectInfo();
            }
            // Reserve username if newly set
            if (usernameLower) {
                try {
                    const usernameRef = db.collection('usernames').doc(usernameLower);
                    const usernameDoc = await usernameRef.get();
                    if (!usernameDoc.exists) {
                        await usernameRef.set({ userId: uid });
                        console.log(`Username ${usernameLower} reserved during init.`);
                    } else if (usernameDoc.data().userId !== uid) {
                         console.warn(`Username ${usernameLower} was already reserved by another user (${usernameDoc.data().userId}). This might cause issues if username login is used.`);
                    }
                } catch(userErr) { console.error("Error reserving username during init:", userErr); }
            }
        } catch (error) {
            console.error("Error initializing user data:", error);
            alert("Error setting up initial user data: " + error.message);
        }
    } else {
        // If user exists, ensure essential top-level fields are present
        let updatesNeeded = {};
        if (usernameLower && existingUserData && !existingUserData.username) { updatesNeeded.username = usernameLower; }
        if (existingUserData && !existingUserData.displayName) { updatesNeeded.displayName = displayName || username || email?.split('@')[0]; }
        if (existingUserData && existingUserData.onboardingComplete === undefined) { updatesNeeded.onboardingComplete = false; }
        if (existingUserData && existingUserData.photoURL === undefined) { updatesNeeded.photoURL = photoURL || DEFAULT_PROFILE_PIC_URL; }
        if (existingUserData && !existingUserData.completedCourseBadges) { updatesNeeded.completedCourseBadges = []; } // Ensure badges array exists

         if (Object.keys(updatesNeeded).length > 0) {
             console.log(`User data exists for ${uid}, updating missing fields:`, Object.keys(updatesNeeded));
             try {
                 await userRef.update(updatesNeeded);
                 console.log(`Fields updated for existing user ${uid}`);
                 // Reserve username if it was added
                 if (updatesNeeded.username) {
                      try {
                         const usernameRef = db.collection('usernames').doc(updatesNeeded.username);
                         const usernameDoc = await usernameRef.get();
                         if (!usernameDoc.exists) { await usernameRef.set({ userId: uid }); console.log(`Username ${updatesNeeded.username} reserved.`); }
                         else if (usernameDoc.data().userId !== uid) { console.warn(`Username ${updatesNeeded.username} already reserved by another user.`); }
                      } catch (userErr) { console.error("Error reserving username on update:", userErr);}
                 }
             } catch(updateError) {
                 console.error("Error updating existing user fields:", updateError);
             }
         } else {
             console.log(`User data already exists for ${uid}, skipping initialization/update.`);
         }
    }
}

// --- Onboarding Check ---
export async function checkOnboarding(uid) {
     if (!db) { console.error("Firestore DB not initialized"); return; } // Removed hideLoading()
    if (!uid) { return; } // Removed hideLoading()
    console.log("Checking onboarding status...");
    const userRef = db.collection('users').doc(uid);
    try {
        const doc = await userRef.get();
        if (doc.exists && doc.data().onboardingComplete === false) {
            console.log("User needs onboarding.");
            showOnboardingUI(); // This will handle hiding loading if needed
        } else if (doc.exists) {
            console.log("Onboarding complete or not applicable.");
            // Let the calling function (loadUserData -> auth listener) handle hiding loading
        } else {
            console.warn("User doc not found during onboarding check. Might be initializing.");
            // Let the calling function handle loading
        }
    } catch (error) {
        console.error("Error checking onboarding status:", error);
        // Let the calling function handle loading
        alert("Error checking user setup: " + error.message);
    }
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
/**
 * Updates (or creates if missing) a course definition document in Firestore.
 * Requires Admin privileges.
 * @param {string} courseId - The ID of the course document to update/create.
 * @param {object} updates - An object containing the fields to update/set.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export async function updateCourseDefinition(courseId, updates) {
     if (!db || !firebaseAuth || firebaseAuth.currentUser?.uid !== ADMIN_UID) {
        console.error("Permission denied: Admin privileges required.");
        alert("Permission denied. Admin required."); // Provide user feedback
        return false;
    }
     if (!courseId || !updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
        console.error("Invalid arguments for updateCourseDefinition.");
        alert("Internal Error: Invalid data provided for course update."); // Provide user feedback
        return false;
    }
    const courseRef = db.collection('courses').doc(courseId);
    console.log(`Attempting to update/set course ${courseId} with:`, updates); // Log the attempt
    try {
        // CORRECTED: Use set with merge instead of update
        await courseRef.set(updates, { merge: true });
        console.log(`Course definition for ${courseId} updated/created successfully.`);

        // Update local state immediately after successful Firestore operation
        const currentData = globalCourseDataMap.get(courseId) || {};
        // Merge updates, ensuring 'id' is preserved if creating new
        updateGlobalCourseData(courseId, { id: courseId, ...currentData, ...updates });
        return true;
    } catch (error) {
        console.error(`Error updating/setting course definition for ${courseId}:`, error);
        alert(`Failed to update course: ${error.message}`); // Show specific Firestore error
        return false;
    }
}

// --- END OF FILE firebase_firestore.js ---