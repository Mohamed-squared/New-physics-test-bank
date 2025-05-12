// --- START OF FILE admin_testing_aids.js ---

import { db, currentUser, globalCourseDataMap, data as globalAppData } from './state.js';
import { ADMIN_UID } from './config.js';
import { escapeHtml, showLoading, hideLoading } from './utils.js';
// Import Firestore functions for these aids
import {
    adminMarkTestGenChaptersStudied,
    adminResetTestGenSubjectProgress,
    adminMarkCourseChapterStudied,
    adminCompleteCourseActivity,
    adminSetCourseStatusAndGrade,
    adminAdjustUserCredits,
    adminSimulateDaysPassed // New import for simulating days
} from './firebase_firestore.js';

// --- Module-Level State for Admin Testing Aids ---
let selectedUserForAids = null; // Stores { uid, displayName, subjects: {}, courses: {} }
let selectedTestGenSubjectIdForAids = null;
let selectedCourseIdForAids = null;

// --- Helper Function to Find User (Admin Context) ---
// This function is crucial for selecting the user the admin wants to act upon.
// It searches by UID, email, or username.
async function findUserForAids(searchTerm) {
    if (!searchTerm || typeof searchTerm !== 'string') return null;
    const lowerSearchTerm = searchTerm.trim().toLowerCase();
    if (!lowerSearchTerm) return null;

    showLoading("Finding user...");
    try {
        let userDocSnap;
        if (lowerSearchTerm.includes('@')) { // Search by email
            const emailQuery = await db.collection('users').where('email', '==', lowerSearchTerm).limit(1).get();
            if (!emailQuery.empty) userDocSnap = emailQuery.docs[0];
        } else {
            // Try UID first
            userDocSnap = await db.collection('users').doc(lowerSearchTerm).get();
            if (!userDocSnap || !userDocSnap.exists) {
                // Try username if UID fails
                const usernameDocSnap = await db.collection('usernames').doc(lowerSearchTerm).get();
                if (usernameDocSnap.exists) {
                    const targetUid = usernameDocSnap.data().userId;
                    if (targetUid) {
                        userDocSnap = await db.collection('users').doc(targetUid).get();
                    }
                }
            }
        }

        if (userDocSnap && userDocSnap.exists) {
            const userData = userDocSnap.data();
            // Fetch user's TestGen subjects (from their appData)
            const userTestGenSubjects = userData.appData?.subjects || {};
            // Fetch user's enrolled courses (from userCourseProgress)
            const userEnrolledCourses = {};
            const progressSnapshot = await db.collection('userCourseProgress').doc(userDocSnap.id).collection('courses').get();
            progressSnapshot.forEach(doc => {
                const courseDef = globalCourseDataMap.get(doc.id);
                if (courseDef) {
                    userEnrolledCourses[doc.id] = {
                        id: doc.id,
                        name: courseDef.name || `Course ${doc.id}`,
                        progress: doc.data() // Store the progress data itself
                    };
                } else {
                    console.warn(`[Admin Aids] Course definition missing for enrolled course ${doc.id} of user ${userDocSnap.id}`);
                    userEnrolledCourses[doc.id] = { // Add a fallback entry
                        id: doc.id,
                        name: `Course ${doc.id} (Def. Missing)`,
                        progress: doc.data()
                    };
                }
            });

            return {
                uid: userDocSnap.id,
                displayName: userData.displayName || userData.username || userData.email || 'Unknown User',
                subjects: userTestGenSubjects,
                courses: userEnrolledCourses
            };
        }
        return null;
    } catch (error) {
        console.error("Error in findUserForAids:", error);
        return null;
    } finally {
        hideLoading();
    }
}

// --- UI Rendering Functions for Selectors ---
function renderTestGenSubjectSelector() {
    const selectorContainer = document.getElementById('admin-aid-testgen-subject-selector-container');
    if (!selectorContainer) return;

    if (!selectedUserForAids || !selectedUserForAids.subjects || Object.keys(selectedUserForAids.subjects).length === 0) {
        selectorContainer.innerHTML = '<p class="text-xs text-muted">User has no TestGen subjects defined.</p>';
        selectedTestGenSubjectIdForAids = null; // Ensure reset
        return;
    }

    const subjects = selectedUserForAids.subjects;
    let selectHtml = '<select id="admin-aid-testgen-subject" class="form-control text-sm"><option value="">Select TestGen Subject...</option>';
    for (const subjectId in subjects) {
        if (subjects.hasOwnProperty(subjectId) && subjects[subjectId]) { // Basic check for valid subject entry
            selectHtml += `<option value="${subjectId}">${escapeHtml(subjects[subjectId].name || `Subject ${subjectId}`)}</option>`;
        }
    }
    selectHtml += '</select>';
    selectorContainer.innerHTML = selectHtml;

    const subjectSelectElement = document.getElementById('admin-aid-testgen-subject');
    if (subjectSelectElement) {
        subjectSelectElement.addEventListener('change', (e) => {
            selectedTestGenSubjectIdForAids = e.target.value;
            console.log("Admin TestGen Subject selected for aids:", selectedTestGenSubjectIdForAids);
        });
    }
}

function renderCourseSelectorForAids() {
    const selectorContainer = document.getElementById('admin-aid-course-selector-container');
    const simulateDaysCourseNameEl = document.getElementById('admin-aid-simulate-days-course-name');

    if (!selectorContainer) return;

    if (!selectedUserForAids || !selectedUserForAids.courses || Object.keys(selectedUserForAids.courses).length === 0) {
        selectorContainer.innerHTML = '<p class="text-xs text-muted">User not enrolled in any courses.</p>';
        if (simulateDaysCourseNameEl) simulateDaysCourseNameEl.textContent = 'N/A - User has no courses';
        selectedCourseIdForAids = null; // Ensure reset
        renderChapterSelectorForAids(null); // Clear chapter selector
        return;
    }

    const courses = selectedUserForAids.courses;
    let selectHtml = '<select id="admin-aid-course" class="form-control text-sm"><option value="">Select Course...</option>';
    for (const courseId in courses) {
        if (courses.hasOwnProperty(courseId) && courses[courseId]) { // Basic check
             selectHtml += `<option value="${courseId}">${escapeHtml(courses[courseId].name || `Course ${courseId}`)}</option>`;
        }
    }
    selectHtml += '</select>';
    selectorContainer.innerHTML = selectHtml;

    const courseSelectDropdown = document.getElementById('admin-aid-course');
    if (courseSelectDropdown) {
        courseSelectDropdown.addEventListener('change', (e) => {
            selectedCourseIdForAids = e.target.value;
            renderChapterSelectorForAids(selectedCourseIdForAids);
            if (simulateDaysCourseNameEl) {
                if (selectedCourseIdForAids && courses[selectedCourseIdForAids]) {
                    simulateDaysCourseNameEl.textContent = escapeHtml(courses[selectedCourseIdForAids].name);
                } else {
                    simulateDaysCourseNameEl.textContent = 'Select a course using the "Course Aids" selector above';
                }
            }
            console.log("Admin Course selected for aids:", selectedCourseIdForAids);
        });
    }
     // Initial state for simulate days course name
     if (simulateDaysCourseNameEl) {
        simulateDaysCourseNameEl.textContent = 'Select a course using the "Course Aids" selector above';
     }
     renderChapterSelectorForAids(null); // Clear chapter selector initially
}

function renderChapterSelectorForAids(courseId) {
    const selectorContainer = document.getElementById('admin-aid-course-chapter-selector-container');
    if (!selectorContainer) return;

    if (!courseId || !selectedUserForAids || !selectedUserForAids.courses || !selectedUserForAids.courses[courseId]) {
        selectorContainer.innerHTML = '<p class="text-xs text-muted">N/A (Select a course first)</p>';
        return;
    }

    const courseDef = globalCourseDataMap.get(courseId); // Use global def for chapter list
    if (!courseDef || !courseDef.totalChapters || courseDef.totalChapters === 0) {
        selectorContainer.innerHTML = '<p class="text-xs text-muted">Course has no chapters defined.</p>';
        return;
    }

    let selectHtml = '<select id="admin-aid-course-chapter" class="form-control text-sm"><option value="all">All Chapters (for "Mark Studied")</option>';
    for (let i = 1; i <= courseDef.totalChapters; i++) {
        const chapterTitle = courseDef.chapters?.[i - 1] || `Chapter ${i}`;
        selectHtml += `<option value="${i}">${i}. ${escapeHtml(chapterTitle)}</option>`;
    }
    selectHtml += '</select>';
    selectorContainer.innerHTML = selectHtml;
}

// --- Main UI Display Function ---
export function displayTestingAidsSection(containerElement) {
    containerElement.innerHTML = `
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-6">Admin Testing Aids</h3>
        <p class="text-sm text-muted mb-4">These tools allow admins to quickly modify user progress for testing purposes. Use with extreme caution. Select a user first, then choose the relevant subject or course to apply aids.</p>

        <!-- User Selector -->
        <section class="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30 mb-6">
            <h4 class="text-lg font-medium mb-3">1. Select User</h4>
            <div class="flex gap-4">
                <input type="text" id="admin-aid-user-search" placeholder="User ID, Email, or Username..." class="flex-grow text-sm form-control">
                <button onclick="window.loadUserForAids()" class="btn-secondary-small text-xs flex-shrink-0">Load User Data</button>
            </div>
            <div id="admin-aid-user-info" class="mt-2 text-sm font-medium text-primary-600 dark:text-primary-400"></div>
        </section>

        <!-- TestGen Aids -->
        <section id="admin-aid-testgen-section" class="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30 mb-6 hidden">
            <h4 class="text-lg font-medium mb-3">2. TestGen Subject Aids for <span id="testgen-aid-username" class="font-bold">User</span></h4>
            <div class="mb-3">
                <label for="admin-aid-testgen-subject" class="block text-sm font-medium mb-1">Select TestGen Subject:</label>
                <div id="admin-aid-testgen-subject-selector-container"><p class="text-xs text-muted">Load a user to see their subjects.</p></div>
            </div>
            <div class="space-y-2">
                <button onclick="window.handleMarkAllTestGenStudied()" class="btn-warning-small text-xs w-full">Mark ALL Chapters Studied for Selected Subject</button>
                <button onclick="window.handleResetTestGenProgressForUser()" class="btn-danger-small text-xs w-full">Reset ALL TestGen Progress for Selected Subject</button>
            </div>
        </section>

        <!-- Course Aids -->
        <section id="admin-aid-course-section" class="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30 mb-6 hidden">
            <h4 class="text-lg font-medium mb-3">2. Course Aids for <span id="course-aid-username" class="font-bold">User</span></h4>
            <div class="mb-3">
                <label for="admin-aid-course" class="block text-sm font-medium mb-1">Select Enrolled Course:</label>
                <div id="admin-aid-course-selector-container"><p class="text-xs text-muted">Load a user to see their courses.</p></div>
            </div>
            <div class="mb-3">
                <label for="admin-aid-course-chapter" class="block text-sm font-medium mb-1">Select Chapter (for chapter-specific actions):</label>
                <div id="admin-aid-course-chapter-selector-container"><p class="text-xs text-muted">Select a course first.</p></div>
            </div>
            <div class="space-y-2 mb-4">
                <button onclick="window.handleMarkCourseChapterStudied()" class="btn-warning-small text-xs w-full">Mark Selected/All Chapter(s) Studied (100% Media Progress)</button>
                <button onclick="window.handleAdminCompleteActivity()" class="btn-warning-small text-xs w-full">Manually Complete Specific Course Activity</button>
                <button onclick="window.handleAdminSetCourseStatus()" class="btn-warning-small text-xs w-full">Set Overall Course Status & Grade</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-2 items-center">
                <input type="number" id="admin-aid-credits-amount" placeholder="Amount" class="form-control text-sm sm:w-28">
                <input type="text" id="admin-aid-credits-reason" placeholder="Reason (e.g., Test Aid, Bonus)" class="form-control text-sm">
                <button onclick="window.handleAdminAdjustCredits()" class="btn-primary-small text-xs">Grant/Revoke Credits</button>
            </div>
        </section>

        <!-- Simulate Days Passed Section -->
        <section id="admin-aid-simulate-days-section" class="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30 hidden">
            <h4 class="text-lg font-medium mb-3">3. Simulate Days Passed in Course for <span id="simulate-days-username" class="font-bold">User</span></h4>
            <p class="text-xs text-muted mb-2">This changes the user's effective enrollment date for the course selected in "Course Aids" section. Their base pace will be reset for recalculation.</p>
            <div class="mb-3">
                <label class="block text-sm font-medium">Course for Simulation:</label>
                <p id="admin-aid-simulate-days-course-name" class="text-sm font-semibold text-primary-600 dark:text-primary-400">Select a course using the "Course Aids" selector above</p>
            </div>
            <div class="mb-3">
                <label for="admin-aid-days-passed" class="block text-sm font-medium">Set "Days Passed Since Enrollment":</label>
                <input type="number" id="admin-aid-days-passed" placeholder="e.g., 7 (for 1 week ago)" min="0" class="form-control text-sm w-full mt-1">
                <p class="form-help-text">Enter how many days ago the user should effectively have enrolled.</p>
            </div>
            <button onclick="window.handleAdminSimulateDaysPassed()" class="btn-warning-small text-xs w-full">Apply Simulated Days</button>
        </section>
    `;
}

// --- Action Handlers (Assigned to Window Scope) ---
window.loadUserForAids = async () => {
    const searchTermInput = document.getElementById('admin-aid-user-search');
    const searchTerm = searchTermInput ? searchTermInput.value : '';
    selectedUserForAids = await findUserForAids(searchTerm); // findUserForAids is defined above

    const userInfoDiv = document.getElementById('admin-aid-user-info');
    const testGenSection = document.getElementById('admin-aid-testgen-section');
    const courseSection = document.getElementById('admin-aid-course-section');
    const simulateDaysSection = document.getElementById('admin-aid-simulate-days-section');

    if (!userInfoDiv || !testGenSection || !courseSection || !simulateDaysSection) {
        console.error("Admin aids UI elements missing after loadUserForAids");
        return;
    }

    if (selectedUserForAids) {
        userInfoDiv.innerHTML = `User Loaded: <strong>${escapeHtml(selectedUserForAids.displayName)}</strong> (UID: ${selectedUserForAids.uid})`;
        document.getElementById('testgen-aid-username').textContent = escapeHtml(selectedUserForAids.displayName);
        document.getElementById('course-aid-username').textContent = escapeHtml(selectedUserForAids.displayName);
        document.getElementById('simulate-days-username').textContent = escapeHtml(selectedUserForAids.displayName);
        renderTestGenSubjectSelector();
        renderCourseSelectorForAids(); // This will also populate simulate-days-course-name on change
        testGenSection.classList.remove('hidden');
        courseSection.classList.remove('hidden');
        simulateDaysSection.classList.remove('hidden');
    } else {
        userInfoDiv.innerHTML = `<p class="text-red-500">User not found.</p>`;
        testGenSection.classList.add('hidden');
        courseSection.classList.add('hidden');
        simulateDaysSection.classList.add('hidden');
    }
    selectedTestGenSubjectIdForAids = null; // Reset selections
    selectedCourseIdForAids = null;
    document.getElementById('admin-aid-simulate-days-course-name').textContent = 'Select a course using the "Course Aids" selector above';
    const chapterContainer = document.getElementById('admin-aid-course-chapter-selector-container');
    if (chapterContainer) chapterContainer.innerHTML = '<p class="text-xs text-muted">Select a course first.</p>';
};

window.handleMarkAllTestGenStudied = async () => {
    if (!selectedUserForAids || !selectedTestGenSubjectIdForAids) {
        alert("Please load a user and select a TestGen subject from the dropdown.");
        return;
    }
    const subjectName = selectedUserForAids.subjects?.[selectedTestGenSubjectIdForAids]?.name || `Subject ${selectedTestGenSubjectIdForAids}`;
    if (!confirm(`Mark ALL chapters in TestGen subject "${escapeHtml(subjectName)}" as studied for ${escapeHtml(selectedUserForAids.displayName)}?`)) return;

    showLoading("Marking TestGen chapters studied...");
    try {
        await adminMarkTestGenChaptersStudied(selectedUserForAids.uid, selectedTestGenSubjectIdForAids);
        alert(`All chapters marked as studied for TestGen subject "${escapeHtml(subjectName)}" and user ${escapeHtml(selectedUserForAids.displayName)}.`);
    } catch (e) {
        console.error("Error in handleMarkAllTestGenStudied:", e);
        alert(`Error: ${e.message}`);
    } finally {
        hideLoading();
    }
};

window.handleResetTestGenProgressForUser = async () => {
    if (!selectedUserForAids || !selectedTestGenSubjectIdForAids) {
        alert("Please load a user and select a TestGen subject from the dropdown.");
        return;
    }
    const subjectName = selectedUserForAids.subjects?.[selectedTestGenSubjectIdForAids]?.name || `Subject ${selectedTestGenSubjectIdForAids}`;
    if (!confirm(`RESET ALL TestGen progress for subject "${escapeHtml(subjectName)}" for user ${escapeHtml(selectedUserForAids.displayName)}? This includes attempts, scores, mastery, and available questions. This action cannot be undone.`)) return;

    showLoading("Resetting TestGen progress...");
    try {
        await adminResetTestGenSubjectProgress(selectedUserForAids.uid, selectedTestGenSubjectIdForAids);
        alert(`TestGen progress reset for subject "${escapeHtml(subjectName)}" and user ${escapeHtml(selectedUserForAids.displayName)}.`);
    } catch (e) {
        console.error("Error in handleResetTestGenProgressForUser:", e);
        alert(`Error: ${e.message}`);
    } finally {
        hideLoading();
    }
};

window.handleMarkCourseChapterStudied = async () => {
    if (!selectedUserForAids || !selectedCourseIdForAids) {
        alert("Please load a user and select a course from the dropdown.");
        return;
    }
    const chapterSelect = document.getElementById('admin-aid-course-chapter');
    const chapterToMark = chapterSelect ? chapterSelect.value : null;
    if (!chapterToMark) {
        alert("Please select a chapter or 'All Chapters' from the dropdown.");
        return;
    }

    const courseName = selectedUserForAids.courses?.[selectedCourseIdForAids]?.name || `Course ${selectedCourseIdForAids}`;
    const chapterDisplay = chapterToMark === 'all' ? 'ALL chapters' : `Chapter ${chapterToMark}`;
    if (!confirm(`Mark ${chapterDisplay} in course "${escapeHtml(courseName)}" as studied (including 100% media progress) for ${escapeHtml(selectedUserForAids.displayName)}?`)) return;

    showLoading(`Marking ${chapterDisplay} studied...`);
    try {
        await adminMarkCourseChapterStudied(selectedUserForAids.uid, selectedCourseIdForAids, chapterToMark);
        alert(`${chapterDisplay} marked as studied for user ${escapeHtml(selectedUserForAids.displayName)} in course "${escapeHtml(courseName)}".`);
    } catch (e) {
        console.error("Error in handleMarkCourseChapterStudied:", e);
        alert(`Error: ${e.message}`);
    } finally {
        hideLoading();
    }
};

window.handleAdminCompleteActivity = async () => {
    if (!selectedUserForAids || !selectedCourseIdForAids) {
        alert("Please load a user and select a course from the dropdown.");
        return;
    }
    const activityType = prompt("Enter activity type (e.g., assignment, weekly_exam, midcourse, final, skip_exam):")?.trim().toLowerCase();
    if (!activityType) return;
    const activityId = prompt(`Enter the specific activity ID for "${activityType}" (e.g., day1, week2, mid1, final1, chapter3 for skip_exam):`)?.trim();
    if (!activityId) return;
    const scoreStr = prompt(`Enter score (0-100) for this activity (${activityType} ${activityId}):`);
    const score = parseFloat(scoreStr);
    if (isNaN(score) || score < 0 || score > 100) {
        alert("Invalid score entered. Please enter a number between 0 and 100.");
        return;
    }
    const courseName = selectedUserForAids.courses?.[selectedCourseIdForAids]?.name || `Course ${selectedCourseIdForAids}`;
    if (!confirm(`Complete ${activityType} "${activityId}" with score ${score}% for ${escapeHtml(selectedUserForAids.displayName)} in course "${escapeHtml(courseName)}"?`)) return;

    showLoading("Completing activity...");
    try {
        await adminCompleteCourseActivity(selectedUserForAids.uid, selectedCourseIdForAids, activityType, activityId, score);
        alert(`Activity "${activityType} ${activityId}" marked as complete with score ${score}%.`);
    } catch (e) {
        console.error("Error in handleAdminCompleteActivity:", e);
        alert(`Error: ${e.message}`);
    } finally {
        hideLoading();
    }
};

window.handleAdminSetCourseStatus = async () => {
    if (!selectedUserForAids || !selectedCourseIdForAids) {
        alert("Please load a user and select a course from the dropdown.");
        return;
    }
    const newStatus = prompt("Enter new course status (enrolled, completed, failed):")?.trim().toLowerCase();
    if (!newStatus || !['enrolled', 'completed', 'failed'].includes(newStatus)) {
        alert("Invalid status. Must be 'enrolled', 'completed', or 'failed'.");
        return;
    }

    let finalMark = null;
    if (newStatus === 'completed' || newStatus === 'failed') {
        const markStr = prompt("Enter final numerical mark (0-100+) for this course status, or leave blank to auto-calculate (if possible):");
        if (markStr && markStr.trim() !== "") {
            finalMark = parseFloat(markStr);
            if (isNaN(finalMark)) {
                alert("Invalid mark entered. Please enter a number or leave blank.");
                return;
            }
        }
    }
    const courseName = selectedUserForAids.courses?.[selectedCourseIdForAids]?.name || `Course ${selectedCourseIdForAids}`;
    if (!confirm(`Set status of course "${escapeHtml(courseName)}" to "${newStatus}" ${finalMark !== null ? `with final mark ${finalMark}% ` : '(auto-calculate mark if applicable) '}for ${escapeHtml(selectedUserForAids.displayName)}?`)) return;

    showLoading("Setting course status...");
    try {
        await adminSetCourseStatusAndGrade(selectedUserForAids.uid, selectedCourseIdForAids, finalMark, newStatus);
        alert(`Course status for "${escapeHtml(courseName)}" updated to "${newStatus}" for user ${escapeHtml(selectedUserForAids.displayName)}.`);
    } catch (e) {
        console.error("Error in handleAdminSetCourseStatus:", e);
        alert(`Error: ${e.message}`);
    } finally {
        hideLoading();
    }
};

window.handleAdminAdjustCredits = async () => {
    if (!selectedUserForAids || !selectedUserForAids.uid) {
        alert("Please load a user first.");
        return;
    }
    const amountInput = document.getElementById('admin-aid-credits-amount');
    const reasonInput = document.getElementById('admin-aid-credits-reason');
    const amountStr = amountInput ? amountInput.value : '';
    const reason = reasonInput ? reasonInput.value.trim() : '';
    const amount = parseInt(amountStr);

    if (isNaN(amount)) {
        alert("Invalid credit amount. Please enter a number.");
        amountInput?.focus();
        return;
    }
    if (!reason && amount !== 0) { // Reason required unless setting to zero (which is unusual for this tool)
        alert("Reason is required for credit adjustment (unless amount is 0).");
        reasonInput?.focus();
        return;
    }
    if (amount === 0 && !confirm("Amount is 0. Do you want to log this action with the reason (this will not change the credit balance)?")) return;

    const actionVerb = amount >= 0 ? 'Grant' : 'Revoke';
    const creditAbs = Math.abs(amount);
    const targetVerb = amount >= 0 ? 'to' : 'from';

    if (!confirm(`${actionVerb} ${creditAbs} credit(s) ${targetVerb} user ${escapeHtml(selectedUserForAids.displayName)} for reason: "${escapeHtml(reason)}"?\n\nPerformed by Admin: ${currentUser.displayName || currentUser.uid}`)) return;

    showLoading("Adjusting credits...");
    try {
        // Pass current admin's UID as `adminPerformingActionUid`
        await adminAdjustUserCredits(selectedUserForAids.uid, amount, reason, currentUser.uid);
        alert(`Credits adjusted successfully for user ${escapeHtml(selectedUserForAids.displayName)}.`);
        if (amountInput) amountInput.value = '';
        if (reasonInput) reasonInput.value = '';
    } catch (e) {
        console.error("Error in handleAdminAdjustCredits:", e);
        alert(`Error: ${e.message}`);
    } finally {
        hideLoading();
    }
};

window.handleAdminSimulateDaysPassed = async () => {
    if (!selectedUserForAids || !selectedUserForAids.uid) {
        alert("Please load a user first.");
        return;
    }
    if (!selectedCourseIdForAids) {
        alert("Please select a course from the 'Course Aids' section first. The 'Simulate Days Passed' feature uses this selected course.");
        return;
    }

    const daysPassedInput = document.getElementById('admin-aid-days-passed');
    const daysToSimulate = parseInt(daysPassedInput.value);

    if (isNaN(daysToSimulate) || daysToSimulate < 0) {
        alert("Please enter a valid non-negative number of days.");
        daysPassedInput.focus();
        return;
    }

    const courseName = selectedUserForAids.courses?.[selectedCourseIdForAids]?.name || `Course ${selectedCourseIdForAids}`;
    if (!confirm(`Set effective enrollment date for ${escapeHtml(selectedUserForAids.displayName)} in course "${escapeHtml(courseName)}" to simulate that ${daysToSimulate} days have passed since enrollment. Their base pace will be reset for future recalculation. Continue?`)) {
        return;
    }

    showLoading("Applying simulated days...");
    try {
        await adminSimulateDaysPassed(selectedUserForAids.uid, selectedCourseIdForAids, daysToSimulate);
        alert(`Enrollment date adjusted for user ${escapeHtml(selectedUserForAids.displayName)} in course "${escapeHtml(courseName)}". Progress will now reflect as if ${daysToSimulate} days have passed. Their base pace will be recalculated after their next 'week' of activity.`);
        daysPassedInput.value = '';
    } catch (e) {
        console.error("Error simulating days passed:", e);
        alert(`Error simulating days passed: ${e.message}`);
    } finally {
        hideLoading();
    }
};
// --- END OF FILE admin_testing_aids.js ---