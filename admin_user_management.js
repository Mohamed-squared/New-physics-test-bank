// --- START OF FILE admin_user_management.js ---

import { db, currentUser, globalCourseDataMap, userCourseProgressMap } from './state.js';
import { ADMIN_UID, DEFAULT_PROFILE_PIC_URL } from './config.js';
import { escapeHtml, showLoading, hideLoading } from './utils.js'; // Assuming DEFAULT_PFP is from utils or config
// Functions from firebase_firestore that might be used here:
import { updateCourseStatusForUser, handleAddBadgeForUser, handleRemoveBadgeForUser, adminUpdateUsername, toggleUserAdminStatus, adminUpdateUserSubjectStatus } from './firebase_firestore.js';

let currentManagingUserIdForSubjects = null; // Keep this specific to subject management within user context if needed

// Helper to find user ID (can be shared or duplicated if not already in a common util)
async function findUserIdAdmin(searchTerm) {
    let targetUserId = null;
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!searchTerm) return null;

    if (lowerSearchTerm.includes('@')) {
        const userQuery = await db.collection('users').where('email', '==', lowerSearchTerm).limit(1).get();
        if (!userQuery.empty) targetUserId = userQuery.docs[0].id;
    } else {
        const userDoc = await db.collection('users').doc(searchTerm).get();
        if (userDoc.exists) {
            targetUserId = userDoc.id;
        } else {
            const usernameQuery = await db.collection('usernames').doc(lowerSearchTerm).get();
            if (usernameQuery.exists) targetUserId = usernameQuery.data().userId;
        }
    }
    return targetUserId;
}


export function displayUserManagementSection(containerElement) {
    containerElement.innerHTML = `
        <h3 class="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-6">User Management</h3>
        <div class="space-y-6">
            <!-- User Listing & Search -->
            <section class="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <h4 class="text-lg font-medium mb-3">List / Search Users</h4>
                <div class="flex gap-4 mb-4">
                    <input type="text" id="admin-user-list-search-input" placeholder="Search by Email, Name, or UID..." class="flex-grow text-sm form-control">
                    <button onclick="window.listAllUsersAdmin()" class="btn-secondary-small text-xs flex-shrink-0">Search / List</button>
                </div>
                <div id="admin-user-list-area" class="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    <p class="text-muted text-sm">Click 'Search / List Users' to load.</p>
                </div>
            </section>

            <!-- User Course Progress -->
            <section class="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <h4 class="text-lg font-medium mb-3">User Course Progress</h4>
                <div class="flex gap-4 mb-4">
                    <input type="text" id="admin-user-search-courses-input" placeholder="Enter User ID, Email or Username..." class="flex-grow text-sm form-control">
                    <button onclick="window.loadUserCoursesForAdmin()" class="btn-secondary-small text-xs flex-shrink-0">Load Courses</button>
                </div>
                <div id="admin-user-courses-area" class="max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    <p class="text-muted text-sm">Enter a User ID, Email, or Username and click 'Load Courses'.</p>
                </div>
            </section>

            <!-- User Badges -->
            <section class="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <h4 class="text-lg font-medium mb-3">User Badges</h4>
                <div class="flex gap-4 mb-4">
                    <input type="text" id="admin-user-search-badges-input" placeholder="Enter User ID, Email or Username..." class="flex-grow text-sm form-control">
                    <button onclick="window.loadUserBadgesForAdmin()" class="btn-secondary-small text-xs flex-shrink-0">Load Badges</button>
                </div>
                <div id="admin-user-badges-area" class="max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    <p class="text-muted text-sm">Enter a User ID, Email, or Username and click 'Load Badges'.</p>
                </div>
            </section>

            <!-- User Subject Approvals -->
            <section class="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                <h4 class="text-lg font-medium mb-3">User Subject Approvals (TestGen)</h4>
                <div class="flex gap-4 mb-4">
                    <input type="text" id="admin-user-search-subjects-input" placeholder="Enter User ID, Email or Username..." class="flex-grow text-sm form-control">
                    <button onclick="window.loadUserSubjectsForAdmin()" class="btn-secondary-small text-xs flex-shrink-0">Load Subjects</button>
                </div>
                <div id="admin-user-subjects-area" class="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    <p class="text-muted text-sm">Enter a User ID, Email, or Username to load their TestGen subjects for approval.</p>
                </div>
            </section>
        </div>
    `;
}


// --- User Listing ---
export async function listAllUsersAdmin() {
    if (!currentUser || !currentUser.isAdmin) return;
    const userListArea = document.getElementById('admin-user-list-area');
    const searchInput = document.getElementById('admin-user-list-search-input');
    if (!userListArea || !searchInput) return;

    const searchTerm = searchInput.value.trim().toLowerCase();
    userListArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;
    showLoading("Loading users...");

    try {
        let query = db.collection('users');
         if (searchTerm.includes('@')) { // Search by email
            query = query.where('email', '==', searchTerm);
         } else if (searchTerm) { // Search by display name (prefix) or username (prefix) or UID
            // Firestore doesn't support OR queries directly or case-insensitive substring search easily.
            // This will be a multi-query approach or a simplified search.
            // For simplicity, let's prioritize exact UID match, then username prefix, then displayName prefix.
            const uidDoc = await db.collection('users').doc(searchTerm).get();
            if (uidDoc.exists) {
                query = query.where(firebase.firestore.FieldPath.documentId(), '==', searchTerm);
            } else {
                // This is imperfect. Ideally, you'd use a search service like Algolia or ElasticSearch.
                // For now, a displayName prefix search:
                query = query.orderBy('displayName').startAt(searchTerm).endAt(searchTerm + '\uf8ff');
                // Or query for username too, then merge results client-side (can be complex)
            }
         } else { // List all (limited)
             query = query.orderBy('displayName').limit(100);
         }

        const snapshot = await query.limit(100).get(); // Limit results
        hideLoading();

        if (snapshot.empty) {
            userListArea.innerHTML = `<p class="text-sm text-muted">No users found${searchTerm ? ' matching "' + escapeHtml(searchTerm) + '"' : ''}.</p>`;
            return;
        }

        let usersHtml = '<ul class="space-y-2 list-none p-0">';
        snapshot.forEach(doc => {
            const userData = doc.data();
            const userId = doc.id;
            const displayName = escapeHtml(userData.displayName || userData.username || 'N/A');
            const email = escapeHtml(userData.email || 'N/A');
            const username = escapeHtml(userData.username || '-');
            const createdAt = userData.createdAt?.toDate ? userData.createdAt.toDate().toLocaleDateString() : 'N/A';
            const userIsAdmin = userData.isAdmin || false;
            const isPrimaryAdminUser = userId === ADMIN_UID;

            let adminBadgeHtml = '';
            if (isPrimaryAdminUser) {
                adminBadgeHtml = '<span class="text-xs bg-yellow-400 text-yellow-900 dark:bg-yellow-600 dark:text-yellow-100 px-1.5 py-0.5 rounded-full font-semibold">Primary Admin</span>';
            } else if (userIsAdmin) {
                adminBadgeHtml = '<span class="text-xs bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-200 px-1.5 py-0.5 rounded-full">Admin</span>';
            }

            let toggleAdminButtonHtml = '';
            if (currentUser.uid === ADMIN_UID && !isPrimaryAdminUser) {
                const buttonText = userIsAdmin ? 'Remove Admin' : 'Make Admin';
                const buttonClass = userIsAdmin ? 'btn-warning-small' : 'btn-success-small';
                const titleAttr = userIsAdmin ? 'title="Remove Admin Privileges"' : 'title="Grant Admin Privileges"';
                toggleAdminButtonHtml = `<button onclick="window.handleToggleAdminStatus('${userId}', ${userIsAdmin})" class="${buttonClass} text-xs ml-2" ${titleAttr}>${buttonText}</button>`;
            }

            usersHtml += `
                <li class="border dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-700 flex items-center gap-3 text-sm flex-wrap">
                    <img src="${escapeHtml(userData.photoURL || DEFAULT_PROFILE_PIC_URL)}" alt="${displayName}'s avatar" class="w-10 h-10 rounded-full object-cover border dark:border-gray-600 flex-shrink-0" onerror="this.onerror=null;this.src='${DEFAULT_PROFILE_PIC_URL}';">
                    <div class="flex-grow min-w-[200px]">
                        <span class="font-medium">${displayName}</span> ${adminBadgeHtml}<br>
                         <span class="text-xs text-muted">Username: ${username}</span><br>
                        <span class="text-xs text-muted">Email: ${email}</span><br>
                        <span class="text-xs text-muted">UID: ${userId}</span><br>
                        <span class="text-xs text-muted">Created: ${createdAt}</span>
                    </div>
                    <div class="flex-shrink-0 flex flex-col items-end gap-1">
                        <button onclick="window.viewUserDetailsAdmin('${userId}')" class="btn-secondary-small text-xs">View Details</button>
                        ${toggleAdminButtonHtml}
                    </div>
                </li>
            `;
        });
        usersHtml += '</ul>';
        userListArea.innerHTML = usersHtml;

    } catch (error) {
        hideLoading();
        console.error("Error listing users for admin:", error);
        if (error.code === 'failed-precondition' && searchTerm && !searchTerm.includes('@')) {
             userListArea.innerHTML = `<p class="text-red-500 text-sm">Error listing users: Searching by display name requires a Firestore index on 'displayName'.</p>`;
        } else {
             userListArea.innerHTML = `<p class="text-red-500 text-sm">Error listing users: ${error.message}</p>`;
        }
    }
}

// --- User Detail View (Modal) ---
export async function viewUserDetailsAdmin(userId) {
    // ... (This function remains largely the same as in the original ui_admin_dashboard.js)
    // It will display user's profile data, badges, course progress, and raw data excerpt.
    // Ensure it uses `findUserIdAdmin` if needed for consistency.
    // The "Edit Username" button will call `promptAdminChangeUsername`.
    if (!currentUser || !currentUser.isAdmin || !userId) return;

    document.getElementById('user-details-modal')?.remove();
    showLoading(`Loading details for user ${userId}...`);

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const progressSnapshot = await db.collection('userCourseProgress').doc(userId).collection('courses').get();

        if (!userDoc.exists) {
            hideLoading();
            alert("User document not found.");
            return;
        }

        const userData = userDoc.data();
        const courseProgress = {};
        progressSnapshot.forEach(doc => {
            courseProgress[doc.id] = doc.data();
        });

        const displayUserData = { ...userData };
        if (displayUserData.createdAt?.toDate) displayUserData.createdAt = displayUserData.createdAt.toDate().toISOString();
        if (displayUserData.lastAppDataUpdate?.toDate) displayUserData.lastAppDataUpdate = displayUserData.lastAppDataUpdate.toDate().toISOString();
        const cleanCourseProgress = JSON.parse(JSON.stringify(courseProgress, (key, value) => {
             if (value && typeof value === 'object' && value.hasOwnProperty('seconds') && value.hasOwnProperty('nanoseconds')) {
                 try { return new Date(value.seconds * 1000 + value.nanoseconds / 1000000).toISOString(); } catch(e){ return value; }
             }
             return value;
        }));

        hideLoading();

        const userProfileHtml = `
            <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="col-span-2 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <dt class="text-xs font-medium text-blue-700 dark:text-blue-300">User ID</dt>
                    <dd class="text-sm mt-1 font-mono">${escapeHtml(userId)}</dd>
                </div>
                <div class="col-span-2 flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-600">
                    <dt class="text-xs font-medium text-gray-700 dark:text-gray-300 w-16 flex-shrink-0">Avatar</dt>
                    <dd class="text-sm mt-1">
                        <img src="${escapeHtml(displayUserData.photoURL || DEFAULT_PROFILE_PIC_URL)}"
                             alt="${escapeHtml(displayUserData.displayName || 'User')}'s avatar"
                             class="w-10 h-10 rounded-full object-cover border dark:border-gray-500"
                             onerror="this.onerror=null; this.src='${DEFAULT_PROFILE_PIC_URL}';">
                    </dd>
                </div>
                ${Object.entries(displayUserData).map(([key, value]) => {
                    if (['completedCourseBadges', 'appData', 'userNotes', 'photoURL'].includes(key)) return '';
                    let displayValue = '';
                    if (value === null || value === undefined) {
                        displayValue = '<span class="text-gray-400 dark:text-gray-500 italic">null</span>';
                    } else if (typeof value === 'boolean') {
                        if (key === 'isAdmin') {
                            if (userId === ADMIN_UID) {
                                displayValue = '<span class="text-yellow-600 dark:text-yellow-400 font-semibold">TRUE (Primary Admin)</span>';
                            } else {
                                displayValue = value ? '<span class="text-blue-600 dark:text-blue-400 font-semibold">TRUE (Admin)</span>' : '<span class="text-red-600 dark:text-red-400">false (User)</span>';
                            }
                        } else {
                            displayValue = value ? '<span class="text-green-600 dark:text-green-400">true</span>' : '<span class="text-red-600 dark:text-red-400">false</span>';
                        }
                    } else if (Array.isArray(value)) {
                        displayValue = `<span class="text-purple-600 dark:text-purple-400">Array(${value.length})</span>`;
                        if (value.length > 0) {
                            displayValue += `<ul class="mt-1 ml-4 list-disc text-xs space-y-1 max-h-20 overflow-y-auto">
                                ${value.slice(0, 10).map(item => `<li>${escapeHtml(String(item))}</li>`).join('')}
                                ${value.length > 10 ? `<li class="text-muted">... and ${value.length - 10} more items</li>` : ''}
                            </ul>`;
                        }
                    } else if (typeof value === 'object') {
                         displayValue = '<pre class="text-xs bg-gray-100 dark:bg-gray-900 p-1 rounded max-h-24 overflow-auto border dark:border-gray-700"><code>' + escapeHtml(JSON.stringify(value, null, 2)) + '</code></pre>';
                    } else {
                        displayValue = escapeHtml(String(value));
                    }
                     let editButton = '';
                     if (key === 'username' && currentUser.uid === ADMIN_UID) { // Only Primary Admin can edit username
                          editButton = `<button onclick="window.promptAdminChangeUsername('${userId}', '${escapeHtml(String(value || ''))}')" class="btn-secondary-small text-xs ml-2">Edit</button>`;
                     }
                    return `
                        <div class="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border dark:border-gray-600">
                            <dt class="text-xs font-medium text-gray-700 dark:text-gray-300">${escapeHtml(key)}</dt>
                            <dd class="text-sm mt-1 flex items-center">${displayValue} ${editButton}</dd>
                        </div>
                    `;
                }).join('')}
            </dl>
        `;

        const badgesHtml = displayUserData.completedCourseBadges?.length ? `
            <div class="mt-4">
                <h4 class="text-sm font-semibold mb-2 text-primary-600 dark:text-primary-400">Completed Course Badges (${displayUserData.completedCourseBadges.length})</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${displayUserData.completedCourseBadges.map(badge => {
                         let completionDateStr = 'N/A';
                         if (badge.completionDate) {
                              try {
                                   const dateObj = badge.completionDate.toDate ? badge.completionDate.toDate() : new Date(badge.completionDate);
                                   if (!isNaN(dateObj)) completionDateStr = dateObj.toLocaleDateString();
                              } catch(e){ console.warn("Error parsing badge completion date:", badge.completionDate, e); }
                         }
                         return `
                            <div class="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-800 text-sm">
                                <p class="font-medium text-green-700 dark:text-green-300">${escapeHtml(badge.courseName || 'Unnamed Course')}</p>
                                <p class="text-xs mt-1 text-green-600 dark:text-green-400">
                                    <span class="font-medium">Grade:</span> ${escapeHtml(badge.grade || 'N/A')} |
                                    <span class="font-medium">Course ID:</span> ${escapeHtml(badge.courseId || 'N/A')}
                                </p>
                                <p class="text-xs text-green-600 dark:text-green-400">
                                    <span class="font-medium">Completed:</span> ${completionDateStr}
                                </p>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : '';

        const courseProgressHtml = Object.entries(cleanCourseProgress).length ? `
            <div class="grid grid-cols-1 gap-4">
                ${Object.entries(cleanCourseProgress).map(([courseId, progress]) => {
                    const courseDef = globalCourseDataMap.get(courseId);
                    const courseName = courseDef?.name || courseId;
                    const studiedChapters = progress.courseStudiedChapters?.length || 0;
                    const totalChapters = courseDef?.totalChapters || '?';
                     const status = progress.status || 'enrolled';
                    const statusClass = status === 'completed' ? 'text-green-600 dark:text-green-400' :
                                      status === 'failed' ? 'text-red-600 dark:text-red-400' :
                                      'text-blue-600 dark:text-blue-400';
                    let lastActivityStr = 'N/A';
                    if (progress.lastActivityDate) {
                         try { lastActivityStr = new Date(progress.lastActivityDate).toLocaleDateString(); } catch(e){}
                    }
                    return `
                        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-600 shadow-sm">
                            <div class="flex justify-between items-start mb-2">
                                <h5 class="font-medium text-sm">${escapeHtml(courseName)}</h5>
                                <span class="text-xs font-medium ${statusClass}">${escapeHtml(status)}</span>
                            </div>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div>
                                    <span class="text-muted block">Enrollment</span>
                                    <span class="font-medium">${escapeHtml(progress.enrollmentMode || 'standard')}</span>
                                </div>
                                <div>
                                    <span class="text-muted block">Grade</span>
                                    <span class="font-medium">${escapeHtml(progress.grade || 'N/A')}</span>
                                </div>
                                <div>
                                    <span class="text-muted block">Progress</span>
                                    <span class="font-medium">${studiedChapters} / ${totalChapters} chapters</span>
                                </div>
                                <div>
                                    <span class="text-muted block">Last Active</span>
                                    <span class="font-medium">${lastActivityStr}</span>
                                </div>
                            </div>
                            ${progress.dailyProgress && Object.keys(progress.dailyProgress).length ? `
                                <div class="mt-2 pt-2 border-t dark:border-gray-600">
                                    <span class="text-xs text-muted">Daily Progress Entries: ${Object.keys(progress.dailyProgress).length}</span>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        ` : '<p class="text-sm text-muted">No course progress data available.</p>';

        const modalHtml = `
            <div id="user-details-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[80] p-4 animate-fade-in" aria-labelledby="user-details-title" role="dialog" aria-modal="true">
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 w-full max-w-4xl transform transition-all flex flex-col max-h-[90vh]">
                    <div class="flex justify-between items-center mb-4 flex-shrink-0 pb-3 border-b dark:border-gray-600">
                        <h3 id="user-details-title" class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                            User Details: ${escapeHtml(userData.displayName || userData.username || userId)}
                        </h3>
                        <button onclick="document.getElementById('user-details-modal').remove()" class="btn-icon text-xl" aria-label="Close user details modal">×</button>
                    </div>
                    <div class="flex-grow overflow-y-auto mb-4 space-y-6 pr-2">
                        <div>
                            <h4 class="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">User Profile Data</h4>
                            ${userProfileHtml}
                            ${badgesHtml}
                        </div>
                        <div>
                            <h4 class="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Course Progress</h4>
                            ${courseProgressHtml}
                        </div>
                         <div>
                            <h4 class="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Raw User Data (Excerpt)</h4>
                             <pre class="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded max-h-60 overflow-auto border dark:border-gray-700"><code>${escapeHtml(JSON.stringify({ email: userData.email, displayName: userData.displayName, username: userData.username, photoURL: userData.photoURL, createdAt: userData.createdAt, onboardingComplete: userData.onboardingComplete, isAdmin: userData.isAdmin, credits: userData.credits }, null, 2))}</code></pre>
                        </div>
                    </div>
                    <div class="flex justify-end gap-3 flex-shrink-0 pt-3 border-t dark:border-gray-600">
                        <button onclick="document.getElementById('user-details-modal').remove()" class="btn-secondary">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

    } catch (error) {
        hideLoading();
        console.error(`Error viewing details for user ${userId}:`, error);
        alert(`Failed to load user details: ${error.message}`);
    }
}

// --- User Course Progress Management (Admin) ---
export async function loadUserCoursesForAdmin() {
    const searchInput = document.getElementById('admin-user-search-courses-input');
    const userCoursesArea = document.getElementById('admin-user-courses-area');
    if (!searchInput || !userCoursesArea) return;

    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        userCoursesArea.innerHTML = '<p class="text-yellow-500 text-sm">Please enter a User ID, Email, or Username.</p>';
        return;
    }
    userCoursesArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;

    try {
        const targetUserId = await findUserIdAdmin(searchTerm); // Use admin-specific finder
        if (!targetUserId) throw new Error("User not found.");

        const progressCollectionRef = db.collection('userCourseProgress').doc(targetUserId).collection('courses');
        const snapshot = await progressCollectionRef.get();

        if (snapshot.empty) {
            userCoursesArea.innerHTML = `<p class="text-sm text-muted">User ID ${targetUserId} is not enrolled in any courses.</p>`;
            return;
        }
        let coursesHtml = `<h4 class="text-md font-medium mb-2">Courses for User ID: ${targetUserId}</h4><div class="space-y-2">`;
        snapshot.forEach(doc => {
            const progress = doc.data();
            const courseId = doc.id;
            const courseDef = globalCourseDataMap.get(courseId);
            const courseName = courseDef?.name || `Course ${courseId}`;
            const status = progress.status || 'enrolled';
            const grade = progress.grade || 'N/A';
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
        console.error("Error loading user courses for admin:", error);
        userCoursesArea.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
    }
}

export async function handleAdminMarkCourseComplete(userId, courseId) {
    // ... (This function remains largely the same as in the original ui_admin_dashboard.js) ...
    const courseName = globalCourseDataMap.get(courseId)?.name || courseId;
     const newStatus = prompt(`Set status for course "${courseName}" for user ${userId}:\nEnter 'completed', 'failed', or 'enrolled' (case-insensitive):`)?.toLowerCase();

     if (!newStatus || !['completed', 'failed', 'enrolled'].includes(newStatus)) {
         alert("Invalid status entered."); return;
     }

     let finalMark = null;
     if (newStatus === 'completed' || newStatus === 'failed') {
         const markStr = prompt(`Enter final numerical mark (0-100+, e.g., 85.5) for course "${courseName}". Leave blank to auto-calculate based on current progress (if possible):`);
         if (markStr !== null && markStr.trim() !== '') {
             finalMark = parseFloat(markStr);
             if (isNaN(finalMark)) { alert("Invalid mark entered."); return; }
         }
     }

     showLoading(`Updating course status for user ${userId}...`);
     const success = await updateCourseStatusForUser(userId, courseId, finalMark, newStatus); // From firestore.js
     hideLoading();

     if (success) {
         alert(`Successfully updated course "${courseName}" status to '${newStatus}' for user ${userId}.`);
         const searchInput = document.getElementById('admin-user-search-courses-input');
         if (searchInput?.value) loadUserCoursesForAdmin(); // Refresh if a user was searched
     }
}

// --- User Badge Management (Admin) ---
export async function loadUserBadgesForAdmin() {
    // ... (This function remains largely the same as in the original ui_admin_dashboard.js) ...
    // Use findUserIdAdmin.
    const searchInput = document.getElementById('admin-user-search-badges-input');
    const badgesArea = document.getElementById('admin-user-badges-area');
    if (!searchInput || !badgesArea) return;

    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        badgesArea.innerHTML = '<p class="text-yellow-500 text-sm">Please enter a User ID, Email, or Username.</p>'; return;
    }
    badgesArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;

    try {
        const targetUserId = await findUserIdAdmin(searchTerm);
        if (!targetUserId) throw new Error("User not found.");

        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (!userDoc.exists) throw new Error("User document does not exist.");

        const userData = userDoc.data();
        const badges = userData.completedCourseBadges || [];
        const displayName = escapeHtml(userData.displayName || userData.username || userData.email);

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
        console.error("Error loading user badges for admin:", error);
        badgesArea.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
    }
}

export function promptAddBadge(userId) {
    // ... (This function remains largely the same as in the original ui_admin_dashboard.js) ...
    if (!currentUser || !currentUser.isAdmin) { alert("Admin privileges required."); return; }
     const courseId = prompt(`Enter Course ID for the new badge (e.g., fop_physics_v1):`);
     if (!courseId) return;
     const courseName = prompt(`Enter Course Name for the badge (e.g., Fundamentals of Physics):`, globalCourseDataMap.get(courseId)?.name || '');
     if (!courseName) return;
     const grade = prompt(`Enter Grade (e.g., A+, B, C):`);
     if (!grade) return;
     const completionDateStr = prompt(`Enter Completion Date (YYYY-MM-DD, optional):`);
     let completionDate = null;
     if (completionDateStr) {
         try {
             if (!/^\d{4}-\d{2}-\d{2}$/.test(completionDateStr)) throw new Error("Invalid date format.");
             completionDate = new Date(completionDateStr + 'T00:00:00Z'); // Ensure UTC interpretation
             if (isNaN(completionDate.getTime())) throw new Error("Invalid date value.");
         } catch(e) { alert("Invalid date format. Please use YYYY-MM-DD."); return; }
     }
     handleAddBadgeForUser(userId, courseId, courseName, grade, completionDate); // From firestore.js
}

export function confirmRemoveBadge(userId, courseId) {
    // ... (This function remains largely the same as in the original ui_admin_dashboard.js) ...
    if (!currentUser || !currentUser.isAdmin) { alert("Admin privileges required."); return; }
     if (confirm(`Are you sure you want to remove the badge for course ID "${courseId}" for user ${userId}?`)) {
         handleRemoveBadgeForUser(userId, courseId); // From firestore.js
     }
}

// --- User Subject Approval (Admin) ---
export async function loadUserSubjectsForAdmin() {
    // ... (This function remains largely the same as in the original ui_admin_dashboard.js) ...
    // Use findUserIdAdmin.
    const searchInput = document.getElementById('admin-user-search-subjects-input');
    const subjectsArea = document.getElementById('admin-user-subjects-area');
    if (!searchInput || !subjectsArea) return;

    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        subjectsArea.innerHTML = '<p class="text-yellow-500 text-sm">Please enter a User ID, Email, or Username.</p>';
        currentManagingUserIdForSubjects = null;
        return;
    }
    subjectsArea.innerHTML = `<div class="loader animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500 mx-auto my-4"></div>`;

    try {
        const targetUserId = await findUserIdAdmin(searchTerm);
        if (!targetUserId) {
            currentManagingUserIdForSubjects = null;
            throw new Error("User not found.");
        }
        currentManagingUserIdForSubjects = targetUserId;

        const userDoc = await db.collection('users').doc(targetUserId).get();
        if (!userDoc.exists) {
            currentManagingUserIdForSubjects = null;
            throw new Error("User document does not exist.");
        }

        const userData = userDoc.data();
        const userSubjects = userData.appData?.subjects || {};
        const displayName = escapeHtml(userData.displayName || userData.username || userData.email);

        let subjectsHtml = `<h4 class="text-md font-medium mb-2">Subjects for User: ${displayName} (ID: ${targetUserId})</h4>`;
        const subjectEntries = Object.entries(userSubjects);

        if (subjectEntries.length === 0) {
            subjectsHtml += '<p class="text-sm text-muted">User has no subjects defined.</p>';
        } else {
            subjectsHtml += '<ul class="space-y-2 list-none p-0">';
            subjectEntries.forEach(([id, subject]) => {
                const subjectName = escapeHtml(subject.name || 'Unnamed Subject');
                const status = subject.status || 'approved';
                const creatorName = escapeHtml(subject.creatorName || 'Unknown');
                const createdAt = subject.createdAt ? new Date(subject.createdAt).toLocaleDateString() : 'N/A';
                let statusBadgeClass = 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-200';
                if (status === 'pending') statusBadgeClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-200';
                else if (status === 'rejected') statusBadgeClass = 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-200';

                let adminActionsHtml = '';
                if (status === 'pending') {
                    adminActionsHtml = `<button onclick="window.handleAdminUserSubjectApproval('${targetUserId}', '${id}', 'approved')" class="btn-success-small text-xs">Approve</button>
                                        <button onclick="window.handleAdminUserSubjectApproval('${targetUserId}', '${id}', 'rejected')" class="btn-danger-small text-xs">Reject</button>`;
                } else if (status === 'rejected') {
                    adminActionsHtml = `<button onclick="window.handleAdminUserSubjectApproval('${targetUserId}', '${id}', 'approved')" class="btn-success-small text-xs">Re-approve</button>`;
                } else { // Approved
                     adminActionsHtml = `<button onclick="window.handleAdminUserSubjectApproval('${targetUserId}', '${id}', 'rejected')" class="btn-warning-small text-xs">Revoke</button>`;
                }

                subjectsHtml += `
                    <li class="border dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-700 flex justify-between items-center gap-2 text-sm flex-wrap">
                        <div class="flex-grow">
                            <span class="font-medium">${subjectName}</span>
                            <span class="text-xs px-1.5 py-0.5 rounded-full ${statusBadgeClass} ml-2">${status}</span>
                            <span class="block text-xs text-muted">Created by: ${creatorName} on ${createdAt} (UID: ${subject.creatorUid || 'N/A'})</span>
                        </div>
                        <div class="flex space-x-1 flex-shrink-0">${adminActionsHtml}</div>
                    </li>`;
            });
            subjectsHtml += '</ul>';
        }
        subjectsArea.innerHTML = subjectsHtml;
    } catch (error) {
        console.error("Error loading user subjects for admin:", error);
        subjectsArea.innerHTML = `<p class="text-red-500 text-sm">Error: ${error.message}</p>`;
        currentManagingUserIdForSubjects = null;
    }
}

export async function handleAdminUserSubjectApproval(targetUserId, subjectId, newStatus) {
    // ... (This function remains largely the same as in the original ui_admin_dashboard.js) ...
    // Calls adminUpdateUserSubjectStatus from firestore.js
    if (!currentUser || !currentUser.isAdmin || !targetUserId || !subjectId || !newStatus) {
        alert("Invalid operation or missing parameters."); return;
    }
    if (targetUserId !== currentManagingUserIdForSubjects) {
        alert("User context mismatch. Please reload subjects for the correct user."); return;
    }
    // Simplified subject name fetching for alert
    const subjectLi = Array.from(document.querySelectorAll('#admin-user-subjects-area li button[onclick*="handleAdminUserSubjectApproval"]'))
                        .find(btn => btn.getAttribute('onclick').includes(`'${targetUserId}', '${subjectId}'`))
                        ?.closest('li');
    const subjectNameForAlert = subjectLi?.querySelector('span.font-medium')?.textContent || `Subject ID ${subjectId}`;

    if (confirm(`Are you sure you want to ${newStatus} the subject "${escapeHtml(subjectNameForAlert)}" for this user?`)) {
        showLoading("Updating subject status...");
        try {
            const success = await adminUpdateUserSubjectStatus(currentUser.uid, targetUserId, subjectId, newStatus);
            if (success) {
                alert(`Subject "${escapeHtml(subjectNameForAlert)}" status updated to ${newStatus}.`);
                loadUserSubjectsForAdmin(); // Refresh
            } // Else, Firestore function handles specific error alert
        } catch (error) { alert(`Failed to update subject status: ${error.message}`); }
        finally { hideLoading(); }
    }
}

// --- Username & Admin Status Toggling ---
export function promptAdminChangeUsername(userId, currentUsername) {
    // ... (This function remains largely the same as in the original ui_admin_dashboard.js) ...
    if (currentUser.uid !== ADMIN_UID) { alert("Only Primary Admin can change usernames."); return; }
    const newUsername = prompt(`Enter new username for user ${userId} (current: "${currentUsername}").\n3-20 alphanumeric or underscores:`);
    if (newUsername === null) return;
    const trimmedUsername = newUsername.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) { alert("Invalid username format."); return; }
    if (trimmedUsername.toLowerCase() === currentUsername.toLowerCase()) { alert("New username is same as current."); return; }
    handleAdminChangeUsername(userId, currentUsername, trimmedUsername); // Internal helper
}

async function handleAdminChangeUsername(userId, currentUsername, newUsername) {
    // ... (This function remains largely the same as in the original ui_admin_dashboard.js) ...
    // Calls adminUpdateUsername from firestore.js
    showLoading("Updating username...");
    try {
        await adminUpdateUsername(userId, currentUsername, newUsername); // From firestore.js
        alert(`Username changed to "${newUsername}".`);
        // Refresh relevant UI (user list, or user details modal if open)
        if (document.getElementById('user-details-modal')?.innerHTML.includes(userId)) viewUserDetailsAdmin(userId);
        if (document.getElementById('admin-user-list-area')?.innerHTML.includes(userId)) listAllUsersAdmin();
    } catch (error) { alert(`Failed to change username: ${error.message}`); }
    finally { hideLoading(); }
}

export async function handleToggleAdminStatus(targetUserId, currentIsAdmin) {
    // ... (This function remains largely the same as in the original ui_admin_dashboard.js) ...
    // Calls toggleUserAdminStatus from firestore.js
    if (targetUserId === ADMIN_UID) { alert("Primary admin status cannot be changed."); return; }
    const actionText = currentIsAdmin ? "remove admin from" : "make admin";
    if (confirm(`Are you sure you want to ${actionText} user ID ${targetUserId}?`)) {
        showLoading("Updating admin status...");
        try {
            await toggleUserAdminStatus(targetUserId, currentIsAdmin); // From firestore.js
            alert("Admin status updated.");
            if (document.getElementById('admin-user-list-area')?.innerHTML.includes(targetUserId)) listAllUsersAdmin();
        } catch (error) { alert(`Failed to toggle admin status: ${error.message}`); }
        finally { hideLoading(); }
    }
}

// --- END OF FILE admin_user_management.js ---