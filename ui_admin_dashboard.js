// --- START OF FILE ui_admin_dashboard.js ---

// ui_admin_dashboard.js

import { db, currentUser, globalCourseDataMap, userCourseProgressMap } from './state.js'; // Added userCourseProgressMap
import { ADMIN_UID } from './config.js';
import { displayContent, clearContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading } from './utils.js';
// Added updateCourseStatusForUser
import { sendAdminReply, updateCourseStatusForUser } from './firebase_firestore.js';
// Import course functions needed by admin buttons
import { handleCourseApproval, showCourseDetails, showEditCourseForm } from './ui_courses.js';
// Use the imported escapeHtml from utils.js
import { escapeHtml } from './utils.js';

// --- Admin Dashboard UI ---

export function showAdminDashboard() {
    // Use imported currentUser from state.js
    if (currentUser?.uid !== ADMIN_UID) {
        displayContent('<p class="text-red-500 p-4">Access Denied. Admin privileges required.</p>');
        return;
    }
    clearContent();
    setActiveSidebarLink('showAdminDashboard', 'sidebar-standard-nav'); // Target standard nav
    displayContent(`
        <div class="animate-fade-in space-y-8">
            <h2 class="text-2xl font-semibold text-indigo-600 dark:text-indigo-400">Admin Dashboard</h2>

            <!-- Feedback Section -->
            <div class="content-card">
                <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">Recent Feedback Messages</h3>
                <div id="admin-feedback-area">
                    <p class="text-muted">Loading feedback...</p>
                </div>
            </div>

            <!-- Course Management Section -->
            <div class="content-card">
                <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">Course Management (Pending/Reported)</h3>
                 <div id="admin-courses-area">
                    <p class="text-muted">Loading courses requiring attention...</p>
                </div>
            </div>

            <!-- User Course Management Section -->
            <div class="content-card">
                <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">User Course Management</h3>
                <div class="flex gap-4 mb-4">
                    <input type="text" id="admin-user-search-courses" placeholder="Enter User ID or Email..." class="flex-grow">
                    <button onclick="window.loadUserCoursesForAdmin()" class="btn-secondary-small">Load User Courses</button>
                </div>
                 <div id="admin-user-courses-area">
                    <p class="text-muted text-sm">Enter a User ID or Email and click 'Load' to manage their course enrollments and completion status.</p>
                </div>
            </div>

             <!-- NEW: User Badge Management Section -->
            <div class="content-card">
                <h3 class="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">User Badge Management</h3>
                <div class="flex gap-4 mb-4">
                    <input type="text" id="admin-user-search-badges" placeholder="Enter User ID or Email..." class="flex-grow">
                    <button onclick="window.loadUserBadgesForAdmin()" class="btn-secondary-small">Load User Badges</button>
                </div>
                 <div id="admin-user-badges-area">
                    <p class="text-muted text-sm">Enter a User ID or Email and click 'Load' to manually manage their completed course badges.</p>
                </div>
            </div>
        </div>
    `);
    loadFeedbackForAdmin();
    loadCoursesForAdmin();
}

// --- Feedback ---
async function loadFeedbackForAdmin() {
    const feedbackArea = document.getElementById('admin-feedback-area');
    if (!feedbackArea) return;
    feedbackArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;

    try {
        const feedbackSnapshot = await db.collection('feedback')
                                         .orderBy('timestamp', 'desc')
                                         .limit(50)
                                         .get();

        if (feedbackSnapshot.empty) {
            feedbackArea.innerHTML = '<p class="text-sm text-muted">No feedback messages found.</p>';
            return;
        }

        let feedbackHtml = '<div class="space-y-3">';
        feedbackSnapshot.forEach(doc => {
            const feedback = doc.data();
            const feedbackId = doc.id;
            const date = feedback.timestamp ? new Date(feedback.timestamp.toDate()).toLocaleString() : 'N/A';
            const statusClass = feedback.status === 'new' ? 'bg-yellow-100 dark:bg-yellow-900/80 border-yellow-300 dark:border-yellow-700' : feedback.status === 'replied' ? 'bg-green-100 dark:bg-green-900/80 border-green-300 dark:border-green-700' : 'bg-gray-100 dark:bg-gray-700/80 border-gray-300 dark:border-gray-600';
            const statusText = feedback.status === 'new' ? 'New' : feedback.status === 'replied' ? 'Replied' : (feedback.status || 'Unknown');
            // Use imported escapeHtml
            const senderName = escapeHtml(feedback.username || 'Unknown User');
            const isAdminSender = feedback.userId === ADMIN_UID;
            const adminIconHtml = isAdminSender ? `<svg class="admin-icon w-3 h-3 inline-block ml-1 text-yellow-500 dark:text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" clip-rule="evenodd" /></svg>` : '';
            const feedbackTextEscaped = escapeHtml(feedback.feedbackText || 'No text');
            const replyTextEscaped = escapeHtml(feedback.replyText || '');

            feedbackHtml += `
                <div class="${statusClass} p-3 rounded-lg border shadow-sm text-sm">
                    <div class="flex justify-between items-center mb-1">
                         <span class="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">${feedbackId}</span>
                         <span class="text-xs font-semibold px-2 py-0.5 rounded ${statusText === 'New' ? 'bg-yellow-500 text-white' : statusText === 'Replied' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}">${statusText}</span>
                    </div>
                    <p><strong>From:</strong> ${senderName}${adminIconHtml} (ID: ${feedback.userId || 'N/A'})</p>
                    <p><strong>Subject ID:</strong> ${escapeHtml(feedback.subjectId || 'N/A')}</p>
                    <p><strong>Question ID:</strong> ${escapeHtml(feedback.questionId || 'N/A')}</p>
                    <p><strong>Date:</strong> ${date}</p>
                    <p class="bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-500 mt-1 whitespace-pre-wrap text-xs">${feedbackTextEscaped}</p>
                    ${feedback.replyText ? `<p class="mt-2 pt-2 border-t dark:border-gray-600 text-xs"><strong>Admin Reply:</strong> ${replyTextEscaped}</p>` : ''}
                    <div class="mt-2 text-right">
                        ${feedback.status !== 'replied' ? `<button onclick="window.promptAdminReply('${feedbackId}', '${feedback.userId}')" class="btn-secondary-small text-xs">Reply</button>` : ''}
                    </div>
                </div>
            `;
        });
        feedbackHtml += '</div>';
        feedbackArea.innerHTML = feedbackHtml;

    } catch (error) {
        console.error("Error loading feedback for admin:", error);
        feedbackArea.innerHTML = `<p class="text-red-500 text-sm">Error loading feedback: ${error.message}</p>`;
    }
}

export function promptAdminReply(feedbackId, recipientUserId) {
    // Use imported currentUser from state.js
    if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Action requires admin privileges.");
        return;
    }
    const replyText = prompt(`Enter reply for feedback ID ${feedbackId}:`);
    if (replyText && replyText.trim()) {
        handleAdminReply(feedbackId, recipientUserId, replyText.trim());
    } else if (replyText !== null) {
        alert("Reply cannot be empty.");
    }
}

async function handleAdminReply(feedbackId, recipientUserId, replyText) {
    // Use imported currentUser from state.js
     if (!currentUser || currentUser.uid !== ADMIN_UID) {
        alert("Action requires admin privileges.");
        return;
    }

    showLoading("Sending reply...");
    const success = await sendAdminReply(recipientUserId, `Reply regarding feedback ${feedbackId}`, replyText, currentUser);
    if (success) {
        try {
            await db.collection('feedback').doc(feedbackId).update({
                status: 'replied',
                replyText: replyText
            });
            console.log(`Feedback ${feedbackId} status updated to replied.`);
            alert("Reply sent successfully!");
            loadFeedbackForAdmin(); // Refresh the list
        } catch (updateError) {
            console.error("Error updating feedback status:", updateError);
            alert("Reply sent, but failed to update feedback status.");
        }
    }
    hideLoading();
}

// --- Course Management ---
async function loadCoursesForAdmin() {
     const coursesArea = document.getElementById('admin-courses-area');
     if (!coursesArea) return;
     coursesArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
     try {
         // ADD COMMENT: Requires Firestore index on 'courses' collection: status ASC, createdAt DESC
         const coursesSnapshot = await db.collection('courses').where('status', 'in', ['pending', 'reported']).orderBy('createdAt', 'desc').limit(50).get();
         if (coursesSnapshot.empty) { coursesArea.innerHTML = '<p class="text-sm text-muted">No courses currently require admin attention.</p>'; return; }
         let coursesHtml = '<div class="space-y-3">';
         coursesSnapshot.forEach(doc => {
             const course = doc.data();
             const courseId = doc.id;
             const date = course.createdAt ? new Date(course.createdAt.toDate()).toLocaleString() : 'N/A';
             const statusClass = course.status === 'pending' ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/80' : 'border-red-400 bg-red-50 dark:bg-red-900/80';
             const statusText = course.status === 'pending' ? 'Pending Approval' : 'Reported';
             // Use imported escapeHtml
             const creatorName = escapeHtml(course.creatorName || 'Unknown');
             const isAdminCreator = course.creatorUid === ADMIN_UID;
             const adminIconHtml = isAdminCreator ? `<svg class="admin-icon w-3 h-3 inline-block ml-1 text-yellow-500 dark:text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" clip-rule="evenodd" /></svg>` : '';
             const courseName = escapeHtml(course.name || 'Unnamed Course');

             coursesHtml += `
                 <div class="course-card border rounded-lg p-3 shadow-sm text-sm ${statusClass}">
                      <div class="flex justify-between items-center mb-2">
                          <h4 class="font-semibold text-base text-primary-700 dark:text-primary-300">${courseName}</h4>
                          <span class="text-xs font-bold px-2 py-0.5 rounded ${course.status === 'pending' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}">${statusText}</span>
                      </div>
                      <p><strong>Creator:</strong> ${creatorName}${adminIconHtml} (ID: ${course.creatorUid || 'N/A'})</p>
                      <p><strong>Date:</strong> ${date}</p>
                      <p><strong>Major:</strong> ${escapeHtml(course.majorTag || 'N/A')} | <strong>Subject:</strong> ${escapeHtml(course.subjectTag || 'N/A')}</p>
                      ${course.status === 'reported' ? `<p class="text-xs mt-1"><strong>Report Reason:</strong> ${escapeHtml(course.reportReason || 'None provided.')}</p><p class="text-xs"><strong>Reported By:</strong> ${course.reportedBy?.length || 0} user(s)</p>` : ''}
                      <div class="mt-3 pt-2 border-t dark:border-gray-600 text-right space-x-2">
                           <button onclick="window.showCourseDetails('${courseId}')" class="btn-secondary-small text-xs">View Details</button>
                           <button onclick="window.showEditCourseForm('${courseId}')" class="btn-secondary-small text-xs">Edit</button>
                          ${course.status === 'pending' ? `
                              <button onclick="window.handleCourseApproval('${courseId}', true)" class="btn-success-small text-xs">Approve</button>
                              <button onclick="window.handleCourseApproval('${courseId}', false)" class="btn-danger-small text-xs">Reject</button>
                          ` : ''}
                           ${course.status === 'reported' ? `
                              <button onclick="window.handleCourseApproval('${courseId}', true)" class="btn-success-small text-xs">Clear Report</button>
                              <button onclick="window.handleCourseApproval('${courseId}', false, true)" class="btn-danger-small text-xs">Delete Course</button>
                          ` : ''}
                      </div>
                 </div>
             `;
         });
         coursesHtml += '</div>';
         coursesArea.innerHTML = coursesHtml;
     } catch (error) {
         console.error("Error loading courses for admin:", error);
         // Added user-friendly message about potential missing index
         coursesArea.innerHTML = `<p class="text-red-500 text-sm">Error loading courses: ${error.message}. This might require creating a Firestore index (check console). </p>`;
     }
}


// --- User Course Management ---

export async function loadUserCoursesForAdmin() {
    const searchInput = document.getElementById('admin-user-search-courses'); // Updated ID
    const userCoursesArea = document.getElementById('admin-user-courses-area');
    if (!searchInput || !userCoursesArea) return;

    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        userCoursesArea.innerHTML = '<p class="text-yellow-500 text-sm">Please enter a User ID or Email.</p>';
        return;
    }

    userCoursesArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
    showLoading("Finding user and loading courses...");

    let targetUserId = null;

    try {
        // Try searching by email first
        if (searchTerm.includes('@')) {
            const userQuery = await db.collection('users').where('email', '==', searchTerm.toLowerCase()).limit(1).get();
            if (!userQuery.empty) {
                targetUserId = userQuery.docs[0].id;
            }
        } else {
            // Assume it's a UID
            const userDoc = await db.collection('users').doc(searchTerm).get();
            if (userDoc.exists) {
                targetUserId = userDoc.id;
            }
        }

        if (!targetUserId) {
            throw new Error("User not found with the provided ID or Email.");
        }

        // Fetch the user's enrolled courses progress
        const progressCollectionRef = db.collection('userCourseProgress').doc(targetUserId).collection('courses');
        const snapshot = await progressCollectionRef.get();

        hideLoading();

        if (snapshot.empty) {
            // Use imported escapeHtml
            userCoursesArea.innerHTML = `<p class="text-sm text-muted">User ${escapeHtml(searchTerm)} (ID: ${targetUserId}) is not enrolled in any courses.</p>`;
            return;
        }

        // Use imported escapeHtml
        let coursesHtml = `<h4 class="text-md font-medium mb-2">Courses for User: ${escapeHtml(searchTerm)} (ID: ${targetUserId})</h4><div class="space-y-2">`;
        snapshot.forEach(doc => {
            const progress = doc.data();
            const courseId = doc.id;
            const courseDef = globalCourseDataMap.get(courseId);
            const courseName = courseDef?.name || `Course ${courseId}`;
            const status = progress.status || 'enrolled';
            const grade = progress.grade || 'N/A';

            // Use imported escapeHtml
            coursesHtml += `
                <div class="border dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-700 flex justify-between items-center gap-2 text-sm">
                    <span class="font-medium flex-grow">${escapeHtml(courseName)}</span>
                    <span class="text-xs text-muted">Status: ${escapeHtml(status)} | Grade: ${escapeHtml(grade)}</span>
                    <button onclick="window.handleAdminMarkCourseComplete('${targetUserId}', '${courseId}')" class="btn-secondary-small text-xs" title="Mark Complete/Failed & Set Grade">
                        Set Status/Grade
                    </button>
                </div>
            `;
        });
        coursesHtml += '</div>';
        userCoursesArea.innerHTML = coursesHtml;

    } catch (error) {
        hideLoading();
        console.error("Error loading user courses for admin:", error);
        userCoursesArea.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
    }
}

export async function handleAdminMarkCourseComplete(userId, courseId) {
     const courseName = globalCourseDataMap.get(courseId)?.name || courseId;
     const newStatus = prompt(`Set status for course "${courseName}" for user ${userId}:\nEnter 'completed', 'failed', or 'enrolled' (case-insensitive):`)?.toLowerCase();

     if (!newStatus || !['completed', 'failed', 'enrolled'].includes(newStatus)) {
         alert("Invalid status entered.");
         return;
     }

     let finalMark = null;
     if (newStatus === 'completed' || newStatus === 'failed') {
         const markStr = prompt(`Enter final numerical mark (0-100+, e.g., 85.5) for course "${courseName}". Leave blank to auto-calculate based on current progress (if possible):`);
         if (markStr !== null && markStr.trim() !== '') {
             finalMark = parseFloat(markStr);
             if (isNaN(finalMark)) {
                 alert("Invalid mark entered. Please enter a number.");
                 return;
             }
         }
     }

     showLoading(`Updating course status for user ${userId}...`);
     const success = await updateCourseStatusForUser(userId, courseId, finalMark, newStatus);
     hideLoading();

     if (success) {
         alert(`Successfully updated course "${courseName}" status to '${newStatus}' for user ${userId}.`);
         // Refresh the user course list in the admin panel
         loadUserCoursesForAdmin();
     } else {
         // Error alert is handled within updateCourseStatusForUser
     }
}


// --- NEW: User Badge Management ---

async function findUserId(searchTerm) {
     let targetUserId = null;
     const lowerSearchTerm = searchTerm.toLowerCase();
     if (searchTerm.includes('@')) {
         const userQuery = await db.collection('users').where('email', '==', lowerSearchTerm).limit(1).get();
         if (!userQuery.empty) targetUserId = userQuery.docs[0].id;
     } else {
         const userDoc = await db.collection('users').doc(searchTerm).get();
         if (userDoc.exists) targetUserId = userDoc.id;
     }
     return targetUserId;
}

export async function loadUserBadgesForAdmin() {
    const searchInput = document.getElementById('admin-user-search-badges');
    const badgesArea = document.getElementById('admin-user-badges-area');
    if (!searchInput || !badgesArea) return;

    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        badgesArea.innerHTML = '<p class="text-yellow-500 text-sm">Please enter a User ID or Email.</p>';
        return;
    }

    badgesArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
    showLoading("Finding user and loading badges...");

    try {
        const targetUserId = await findUserId(searchTerm);
        if (!targetUserId) throw new Error("User not found with the provided ID or Email.");

        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (!userDoc.exists) throw new Error("User document does not exist.");

        const userData = userDoc.data();
        const badges = userData.completedCourseBadges || [];
        const displayName = escapeHtml(userData.displayName || userData.username || userData.email);

        hideLoading();

        let badgesHtml = `<h4 class="text-md font-medium mb-2">Badges for User: ${displayName} (ID: ${targetUserId})</h4>`;
        if (badges.length === 0) {
            badgesHtml += '<p class="text-sm text-muted">User has no completed course badges.</p>';
        } else {
            badgesHtml += '<ul class="space-y-2 list-none p-0">';
            badges.forEach((badge, index) => {
                const courseName = escapeHtml(badge.courseName || 'Unknown Course');
                const grade = escapeHtml(badge.grade || 'N/A');
                const dateStr = badge.completionDate?.toDate ? badge.completionDate.toDate().toLocaleDateString() : 'N/A';
                const courseId = escapeHtml(badge.courseId || 'N/A');
                badgesHtml += `
                    <li class="border dark:border-gray-600 rounded p-2 bg-gray-50 dark:bg-gray-700 flex justify-between items-center gap-2 text-sm">
                        <span><strong>${courseName}</strong> (ID: ${courseId}) - Grade: ${grade} (${dateStr})</span>
                        <button onclick="window.confirmRemoveBadge('${targetUserId}', '${courseId}')" class="btn-danger-small text-xs" title="Remove this badge">Remove</button>
                    </li>`;
            });
            badgesHtml += '</ul>';
        }

        badgesHtml += `
            <div class="mt-4 pt-3 border-t dark:border-gray-600">
                 <button onclick="window.promptAddBadge('${targetUserId}')" class="btn-success-small text-xs">Add New Badge</button>
             </div>`;
        badgesArea.innerHTML = badgesHtml;

    } catch (error) {
        hideLoading();
        console.error("Error loading user badges for admin:", error);
        badgesArea.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
    }
}

export function promptAddBadge(userId) {
     // Use simple prompts for now, could be replaced with a modal form
     const courseId = prompt(`Enter Course ID for the new badge (e.g., fop_physics_v1):`);
     if (!courseId) return;
     const courseName = prompt(`Enter Course Name for the badge (e.g., Fundamentals of Physics):`, globalCourseDataMap.get(courseId)?.name || '');
     if (!courseName) return;
     const grade = prompt(`Enter Grade (e.g., A+, B, C):`);
     if (!grade) return;
     const completionDateStr = prompt(`Enter Completion Date (YYYY-MM-DD, optional):`);
     let completionDate = null;
     if (completionDateStr) {
         try { completionDate = new Date(completionDateStr); } catch(e) { alert("Invalid date format."); return; }
     }

     handleAddBadgeForUser(userId, courseId, courseName, grade, completionDate);
}

export async function handleAddBadgeForUser(userId, courseId, courseName, grade, completionDate) {
     if (!currentUser || currentUser.uid !== ADMIN_UID) { alert("Admin privileges required."); return; }
     showLoading("Adding badge...");
     const userRef = db.collection('users').doc(userId);
     try {
         const newBadge = {
             courseId: courseId.trim(),
             courseName: courseName.trim(),
             grade: grade.trim().toUpperCase(),
             completionDate: completionDate ? firebase.firestore.Timestamp.fromDate(completionDate) : firebase.firestore.Timestamp.now()
         };
         await userRef.update({
             completedCourseBadges: firebase.firestore.FieldValue.arrayUnion(newBadge)
         });
         hideLoading();
         alert("Badge added successfully!");
         loadUserBadgesForAdmin(); // Refresh the list for the current user
     } catch (error) {
         hideLoading();
         console.error("Error adding badge:", error);
         alert(`Failed to add badge: ${error.message}`);
     }
}

export function confirmRemoveBadge(userId, courseId) {
     if (confirm(`Are you sure you want to remove the badge for course ID "${courseId}" for user ${userId}?`)) {
         handleRemoveBadgeForUser(userId, courseId);
     }
}

export async function handleRemoveBadgeForUser(userId, courseId) {
     if (!currentUser || currentUser.uid !== ADMIN_UID) { alert("Admin privileges required."); return; }
     showLoading("Removing badge...");
     const userRef = db.collection('users').doc(userId);
     try {
         const userDoc = await userRef.get();
         if (!userDoc.exists) throw new Error("User not found.");
         const badges = userDoc.data().completedCourseBadges || [];
         const updatedBadges = badges.filter(badge => badge.courseId !== courseId);

         if (badges.length === updatedBadges.length) {
             console.warn(`Badge with courseId "${courseId}" not found for user ${userId}.`);
             hideLoading();
             alert("Badge not found for removal.");
             return;
         }

         await userRef.update({ completedCourseBadges: updatedBadges });
         hideLoading();
         alert("Badge removed successfully!");
         loadUserBadgesForAdmin(); // Refresh list
     } catch (error) {
         hideLoading();
         console.error("Error removing badge:", error);
         alert(`Failed to remove badge: ${error.message}`);
     }
}


// Assign functions needed by buttons to window scope
window.promptAdminReply = promptAdminReply;
window.handleCourseApproval = handleCourseApproval; // From ui_courses.js
window.showCourseDetails = showCourseDetails; // From ui_courses.js
window.showEditCourseForm = showEditCourseForm; // From ui_courses.js
window.loadUserCoursesForAdmin = loadUserCoursesForAdmin; // For course status/grade
window.handleAdminMarkCourseComplete = handleAdminMarkCourseComplete; // For course status/grade
// NEW Badge Management assignments
window.loadUserBadgesForAdmin = loadUserBadgesForAdmin;
window.promptAddBadge = promptAddBadge;
window.handleAddBadgeForUser = handleAddBadgeForUser;
window.confirmRemoveBadge = confirmRemoveBadge;
window.handleRemoveBadgeForUser = handleRemoveBadgeForUser;