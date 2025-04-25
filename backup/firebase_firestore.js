// firebase_firestore.js

// Import db from state.js, but currentUser will be passed as argument where needed
import { db, data, setData, currentSubject, setCurrentSubject } from './state.js';
import { showLoading, hideLoading } from './utils.js';
import { updateChaptersFromMarkdown } from './markdown_parser.js';
import { initialSubjectData, ADMIN_UID } from './config.js';
import { updateSubjectInfo } from './ui_core.js';
import { showOnboardingUI } from './ui_onboarding.js';

// --- Utilities ---
/**
 * Fetches the markdown content for a given subject.
 * Handles the default 'chapters.md' case.
 * Returns the markdown text content or null if fetch fails.
 */
async function fetchMarkdownForSubject(subject) {
    if (!subject) return null;
    // Use subject.fileName, default to chapters.md if missing or for specific subject name/ID
    const fileName = subject.fileName || (subject.name === "Fundamentals of Physics" ? "chapters.md" : `${subject.name}.md`);
    // Basic sanitization - replace spaces, etc. Consider more robust slugification if names are complex.
    const safeFileName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    const url = `${safeFileName}?t=${new Date().getTime()}`; // Add cache buster

    console.log(`Fetching Markdown from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            // Handle 404 gracefully - it might be a new subject without a file yet
            if (response.status === 404) {
                console.warn(`Markdown file not found at ${url}. Subject: ${subject.name}`);
                return null; // Indicate file not found
            }
            throw new Error(`HTTP error fetching markdown! status: ${response.status} for ${url}`);
        }
        const mdContent = await response.text();
        console.log(`Markdown fetched successfully for subject ${subject.name} from ${url}.`);
        return mdContent;
    } catch (error) {
        console.error(`Error fetching Markdown for subject ${subject.name} (${url}):`, error);
        // Optionally alert the user only for non-404 errors
        if (!error.message.includes('status: 404')) {
            alert(`Warning: Could not load chapter definitions for subject "${subject.name}". File might be missing or inaccessible.`);
        }
        return null; // Indicate fetch failure
    }
}


// --- User Data Management ---

export async function saveUserData(uid) {
    if (!db) { console.error("Firestore DB not initialized"); return; }
    if (!uid || !data) {
        console.warn("Attempted to save data without UID or data object.");
        return;
    }
    const userRef = db.collection('users').doc(uid);
    try {
        // Before saving, ensure the data structure is consistent (e.g., no undefined fields Firestore dislikes)
        // This is a basic cleanup, more specific validation might be needed
        const cleanData = JSON.parse(JSON.stringify(data)); // Deep clone and remove undefined

        await userRef.update({
            appData: cleanData // Save the cleaned data
        });
        // console.log("User data saved successfully."); // Verbose
    } catch (error) {
        console.error("Error saving user data to Firestore:", error);
        alert("Error saving progress: " + error.message); // Notify user
    }
}

export async function loadUserData(uid) {
    if (!db) { console.error("Firestore DB not initialized"); hideLoading(); return; }
    if (!uid) {
        console.error("loadUserData called without UID.");
        hideLoading();
        return;
    }
    showLoading("Loading your data...");
    console.log(`Loading data for user: ${uid}`);
    const userRef = db.collection('users').doc(uid);
    try {
        const doc = await userRef.get();
        let needsSaveAfterLoad = false; // Flag to save data if modified during load

        if (doc.exists) {
            const userData = doc.data();
            let loadedData = userData.appData;
            console.log("User appData loaded from Firestore.");

            if (!loadedData || typeof loadedData.subjects !== 'object') {
                 console.warn("Loaded appData is missing or invalid 'subjects' structure. Resetting to default.");
                 // Create a deep copy of the initial structure
                 loadedData = JSON.parse(JSON.stringify(initialSubjectData));
                 needsSaveAfterLoad = true; // Mark for saving the reset structure
            }

            setData(loadedData); // Update state with potentially reset data

            // Sync with Markdown for each subject
            console.log("Syncing loaded subject data with Markdown files...");
            let dataWasModifiedBySync = false;
            if (data && data.subjects) {
                for (const subjectId in data.subjects) {
                    const subject = data.subjects[subjectId];
                    if (!subject) continue; // Skip if subject data is corrupt

                    const subjectMarkdown = await fetchMarkdownForSubject(subject);
                    // Update chapters based on fetched markdown OR clear if MD is null (not found/error)
                    const subjectChaptersBefore = JSON.stringify(subject.chapters || {});
                    const subjectModified = updateChaptersFromMarkdown(subject, subjectMarkdown); // Pass null if fetch failed
                    const subjectChaptersAfter = JSON.stringify(subject.chapters || {});

                    if (subjectModified || subjectChaptersBefore !== subjectChaptersAfter) {
                        console.log(`Subject ${subject.name} (ID: ${subjectId}) data modified by Markdown sync.`);
                        dataWasModifiedBySync = true;
                    }
                }
                if (dataWasModifiedBySync) {
                    console.log("Data was modified by Markdown sync overall.");
                    needsSaveAfterLoad = true; // Mark for saving
                } else {
                    console.log("No changes detected during Markdown sync.");
                }
            } else {
                 console.warn("Cannot sync with Markdown - state.data.subjects is missing.");
            }

            // Validate/Repair Data Structure (Crucial after potential reset or sync)
             if (data && data.subjects) {
                for (const subjectId in data.subjects) {
                    const subject = data.subjects[subjectId];
                    if (!subject) continue;

                    // Ensure basic subject fields
                    if (subject.id !== subjectId) { subject.id = subjectId; needsSaveAfterLoad = true; }
                    if (!subject.name) { subject.name = `Subject ${subjectId}`; needsSaveAfterLoad = true; }
                    if (!subject.fileName && subject.name === "Fundamentals of Physics") { subject.fileName = "chapters.md"; needsSaveAfterLoad = true; }
                    else if (!subject.fileName) { subject.fileName = `${subject.name}.md`.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, ''); needsSaveAfterLoad = true; }
                    subject.studied_chapters = subject.studied_chapters || [];
                    subject.pending_exams = (subject.pending_exams || []).map(exam => ({
                         ...exam,
                         id: exam.id || `pending_${Date.now()}`, // Ensure ID exists
                         allocation: (typeof exam.allocation === 'object' && exam.allocation !== null) ? exam.allocation : {},
                         results_entered: exam.results_entered || false,
                         timestamp: exam.timestamp || new Date(0).toISOString(), // Ensure timestamp exists
                         totalQuestions: exam.totalQuestions || 0
                    }));
                    subject.exam_history = (subject.exam_history || []).map(exam => ({
                         ...exam,
                         examId: exam.examId || `history_${Date.now()}`, // Ensure ID exists
                         type: exam.type || (exam.questions ? 'online' : 'pdf'),
                         timestamp: exam.timestamp || new Date(0).toISOString(),
                         score: exam.score ?? 0,
                         totalQuestions: exam.totalQuestions ?? 0,
                         originalScore: exam.originalScore ?? exam.score ?? 0, // Add originalScore field if missing
                         // overriddenScore remains optional
                         questions: (exam.questions || []).map(q => ({
                            ...q,
                            id: q.id || `q_${q.chapter}_${q.number}`, // Ensure ID exists
                            isOverridden: q.isOverridden || false // Add isOverridden field if missing
                         }))
                    }));
                    subject.max_questions_per_test = subject.max_questions_per_test || 42;
                    subject.chapters = subject.chapters || {};

                    // Ensure basic chapter fields
                    for (const chapNum in subject.chapters) {
                       const chap = subject.chapters[chapNum];
                       if (!chap) continue;
                       chap.total_questions = chap.total_questions ?? 0; // Ensure total_questions exists
                       chap.total_attempted = chap.total_attempted ?? 0;
                       chap.total_wrong = chap.total_wrong ?? 0;
                       chap.mistake_history = chap.mistake_history ?? [];
                       chap.consecutive_mastery = chap.consecutive_mastery ?? 0;
                       // Ensure available_questions is a valid array related to total_questions
                       const expectedAvailable = Array.from({ length: chap.total_questions }, (_, j) => j + 1);
                       const currentAvailableSet = new Set(chap.available_questions || []);
                       const validAvailable = expectedAvailable.filter(qNum => currentAvailableSet.has(qNum));
                       if (JSON.stringify(validAvailable.sort((a,b) => a-b)) !== JSON.stringify((chap.available_questions || []).sort((a,b)=>a-b))) {
                            console.warn(`Repairing available_questions for Subject ${subjectId}, Chapter ${chapNum}.`);
                            chap.available_questions = validAvailable;
                            needsSaveAfterLoad = true;
                       } else if (chap.available_questions === undefined) {
                            chap.available_questions = validAvailable; // Initialize if missing
                            needsSaveAfterLoad = true;
                       }
                    }
                }
             } else {
                 console.warn("Cannot validate/repair data - state.data.subjects is missing.");
             }

            // Save if any modifications happened during load/sync/repair
            if (needsSaveAfterLoad) {
                 console.log("Saving data after load/sync/validation/repair...");
                 await saveUserData(uid);
            }

            // Select Default Subject (use the possibly updated data)
            if (data && data.subjects) {
                const subjectKeys = Object.keys(data.subjects);
                // Try to keep the current subject if it still exists, otherwise pick the first
                let subjectToSelectId = null;
                if (currentSubject && data.subjects[currentSubject.id]) {
                    subjectToSelectId = currentSubject.id;
                } else if (subjectKeys.length > 0) {
                     subjectToSelectId = subjectKeys[0];
                }

                if (!subjectToSelectId) {
                    console.warn("Loaded data has no subjects after sync/validation. User might need setup.");
                    setCurrentSubject(null);
                } else {
                    setCurrentSubject(data.subjects[subjectToSelectId]);
                }
                updateSubjectInfo(); // Update UI
            } else {
                 setCurrentSubject(null);
                 updateSubjectInfo();
            }

            await checkOnboarding(uid); // Check onboarding AFTER data load/validation

        } else {
            console.log("User document not found for UID:", uid, "- Initializing data.");
            const currentUserDetails = auth.currentUser; // Get auth user details
            if (!currentUserDetails) {
                throw new Error("Cannot initialize data: Current user details unavailable.");
            }
            await initializeUserData(uid, currentUserDetails.email, (currentUserDetails.displayName || currentUserDetails.email.split('@')[0]), currentUserDetails.displayName, currentUserDetails.photoURL);
            await loadUserData(uid); // Reload after initialization to ensure sync/validation happens
            return;
        }
    } catch (error) {
        console.error("Error loading user data:", error);
        alert("Failed to load your data: " + error.message);
        hideLoading(); // Hide loading on error
    }
    // hideLoading() is now called within checkOnboarding or on error
}

export async function initializeUserData(uid, email, username, displayName = null, photoURL = null, forceReset = false) {
    if (!db || !auth) { console.error("Firestore DB or Auth not initialized"); return; }
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

    const usernameLower = username ? username.toLowerCase() : (existingUserData?.username || null);

    if (!docExists || forceReset) {
        console.log(`Initializing data for user: ${uid}. Force reset: ${forceReset}. Username: ${usernameLower}`);
        let defaultData = JSON.parse(JSON.stringify(initialSubjectData)); // Deep copy

        // Fetch Markdown for the default subject
        const defaultSubject = defaultData.subjects["1"];
        if (defaultSubject) {
             const defaultMarkdown = await fetchMarkdownForSubject(defaultSubject);
             if (defaultMarkdown) {
                 updateChaptersFromMarkdown(defaultSubject, defaultMarkdown);
                 console.log("Initialized default subject chapters from Markdown.");
             } else {
                 console.warn("Could not fetch Markdown for default subject during initialization.");
             }
        } else {
             console.error("Default subject (ID '1') not found in initialSubjectData config.");
        }

        const dataToSet = {
             email: email,
             username: usernameLower,
             displayName: (forceReset && existingUserData?.displayName) ? existingUserData.displayName : (displayName || username || email?.split('@')[0]),
             photoURL: (forceReset && existingUserData?.photoURL) ? existingUserData.photoURL : (photoURL || null),
             createdAt: firebase.firestore.FieldValue.serverTimestamp(),
             onboardingComplete: (forceReset && existingUserData?.onboardingComplete !== undefined) ? existingUserData.onboardingComplete : false,
             appData: defaultData
        };

        try {
             await userRef.set(dataToSet, { merge: !forceReset });
             console.log(`User data initialized/reset (${forceReset ? 'force' : 'initial'}) in Firestore.`);
             setData(defaultData); // Update local state
             if (forceReset) {
                 const firstSubjectId = Object.keys(defaultData.subjects)[0];
                 setCurrentSubject(firstSubjectId ? defaultData.subjects[firstSubjectId] : null);
                 updateSubjectInfo();
             }
        } catch (error) {
             console.error("Error initializing user data:", error);
             alert("Error setting up initial user data: " + error.message);
        }
    } else {
        // If user exists, ensure essential top-level fields are present
         let updatesNeeded = {};
         if (usernameLower && existingUserData && !existingUserData.username) {
             updatesNeeded.username = usernameLower;
         }
         if (existingUserData && !existingUserData.displayName) {
             updatesNeeded.displayName = displayName || username || email?.split('@')[0];
         }
         if (existingUserData && existingUserData.onboardingComplete === undefined) {
             updatesNeeded.onboardingComplete = false; // Default if missing
         }

         if (Object.keys(updatesNeeded).length > 0) {
             console.log(`User data exists for ${uid}, updating missing fields:`, Object.keys(updatesNeeded));
             try {
                 await userRef.update(updatesNeeded);
                 console.log(`Fields updated for existing user ${uid}`);
                 // Reserve username if it was added
                 if (updatesNeeded.username) {
                     const usernameRef = db.collection('usernames').doc(updatesNeeded.username);
                     const usernameDoc = await usernameRef.get();
                     if (!usernameDoc.exists) {
                         await usernameRef.set({ userId: uid });
                         console.log(`Username ${updatesNeeded.username} reserved.`);
                     }
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
    if (!db) { console.error("Firestore DB not initialized"); hideLoading(); return; }
    if (!uid) { hideLoading(); return; }
    console.log("Checking onboarding status...");
    const userRef = db.collection('users').doc(uid);
    try {
        const doc = await userRef.get();
        if (doc.exists && doc.data().onboardingComplete === false) {
            console.log("User needs onboarding.");
            hideLoading(); // Hide loading before showing onboarding UI
            showOnboardingUI();
        } else if (doc.exists) {
            console.log("Onboarding complete or not applicable.");
            // Ensure main app UI is visible if onboarding isn't needed
            document.getElementById('main-content')?.classList.remove('hidden');
            document.getElementById('sidebar')?.classList.remove('hidden');
            document.querySelectorAll('.auth-required').forEach(el => el.style.display = 'flex'); // Or appropriate display type
            const contentEl = document.getElementById('content');
             if (contentEl?.textContent.includes("Loading...")) {
                contentEl.innerHTML = '<p class="text-center p-4">Select an option from the sidebar.</p>';
             }
            hideLoading(); // Hide loading as app is ready
        } else {
            console.warn("User doc not found during onboarding check. Might be initializing.");
            // Initialization/loadUserData should handle loading indicator
        }
    } catch (error) {
        console.error("Error checking onboarding status:", error);
        hideLoading(); // Hide loading on error
        alert("Error checking user setup: " + error.message);
    }
}


// --- Feedback Management ---

// MODIFIED: Accepts user object
export async function submitFeedback(feedbackData, user) {
    if (!db || !user) {
        console.error("Cannot submit feedback: Firestore DB not initialized or user object not provided.");
        alert("Error submitting feedback: User not identified.");
        return false;
    }
    if (!feedbackData.questionId || !feedbackData.subjectId || !feedbackData.feedbackText) {
         console.error("Invalid feedback data provided.");
         alert("Error submitting feedback: Invalid data.");
         return false;
    }

    const feedbackRef = db.collection('feedback').doc();
    try {
        await feedbackRef.set({
            ...feedbackData,
            userId: user.uid,
            username: user.displayName || user.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'new'
        });
        console.log("Feedback submitted successfully:", feedbackRef.id);
        return true;
    } catch (error) {
        console.error("Error submitting feedback:", error);
        alert("Failed to submit feedback: " + error.message);
        return false;
    }
}

// --- Inbox/Messaging ---

// MODIFIED: Accepts adminUser object
export async function sendAdminReply(recipientUid, subject, body, adminUser) {
    if (!db || !adminUser || adminUser.uid !== ADMIN_UID) {
        console.error("Unauthorized: Only admin can send replies or adminUser object missing.");
        alert("Error: Action requires admin privileges.");
        return false;
    }
    if (!recipientUid || !subject || !body) {
        console.error("Missing recipient, subject, or body for reply.");
         alert("Error: Missing required information for sending reply.");
        return false;
    }

    const messageRef = db.collection('users').doc(recipientUid).collection('inbox').doc();
    try {
        await messageRef.set({
            senderId: adminUser.uid,
            senderName: "Admin", // Or use adminUser.displayName
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            subject: subject,
            body: body,
            isRead: false
        });
        console.log(`Admin reply sent to user ${recipientUid}, message ID: ${messageRef.id}`);
        return true;
    } catch (error) {
        console.error("Error sending admin reply:", error);
        alert("Failed to send reply: " + error.message);
        return false;
    }
}

// MODIFIED: Accepts user object
export async function markMessageAsRead(messageId, user) {
     if (!db || !user || !messageId) {
         console.error("Cannot mark message as read: DB/User/MessageID missing.");
         return false;
     }
     const messageRef = db.collection('users').doc(user.uid).collection('inbox').doc(messageId);
     try {
         await messageRef.update({ isRead: true });
         console.log(`Message ${messageId} marked as read.`);
         return true;
     } catch (error) {
         console.error(`Error marking message ${messageId} as read:`, error);
         return false;
     }
}