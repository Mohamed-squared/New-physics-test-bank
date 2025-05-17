// ui_user_profile.js

import { currentUser, db, auth, userCourseProgressMap, globalCourseDataMap } from './state.js'; // Added globalCourseDataMap
import { displayContent, fetchAndUpdateUserInfo, showLoginUI, clearContent, setActiveSidebarLink } from './ui_core.js'; // Added fetchAndUpdateUserInfo
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Added escapeHtml
// import { signOutUser } from './firebase_auth.js'; // signOutUser will be called from settings panel
import { DEFAULT_PROFILE_PIC_URL } from './config.js';
import { getLetterGradeColor } from './course_logic.js'; // For badge colors
// Import profile picture UI handler
import { handleProfilePictureSelect } from './ui_profile_picture.js';
import { saveUserData } from './firebase_firestore.js'; // Import saveUserData


// --- User Profile Dashboard ---

export function showUserProfileDashboard() {
    if (!currentUser || !db || !auth) {
        console.error("Cannot show profile: User not logged in or Firebase not ready.");
        showLoginUI();
        return;
    }
    clearContent();
    setActiveSidebarLink('showUserProfileDashboard', 'sidebar-standard-nav');
    window.playUiSound?.('navigation');

    showLoading("Loading profile...");
    db.collection('users').doc(currentUser.uid).get().then(doc => {
        hideLoading();
        let currentDisplayName = 'User';
        let currentPhotoURL = DEFAULT_PROFILE_PIC_URL;
        let currentUsername = ''; // Load username
        let completedBadges = [];
        let currentCredits = 0;

        if (doc.exists) {
            const userData = doc.data();
            currentDisplayName = userData.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
            currentPhotoURL = userData.photoURL || currentUser.photoURL || DEFAULT_PROFILE_PIC_URL;
            currentUsername = userData.username || '';
            completedBadges = userData.completedCourseBadges || [];
            currentCredits = userData.credits || 0;
        } else {
            console.warn("Firestore profile doc not found, using Auth profile data.");
            currentDisplayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
            currentPhotoURL = currentUser.photoURL || DEFAULT_PROFILE_PIC_URL;
            currentUsername = currentUser.email?.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20) || `user_${currentUser.uid.substring(0,6)}`;
            currentCredits = currentUser.credits || 0;
        }
        const photoUrlValue = currentPhotoURL || '';

        let badgesHtml = '';
        if (completedBadges.length > 0) {
             badgesHtml = `<h3 class="text-lg font-semibold mb-3 mt-6 text-gray-700 dark:text-gray-300">Completed Courses</h3><div class="flex flex-wrap gap-3">`;
             completedBadges.forEach(badge => {
                 const grade = badge.grade || 'C';
                 const badgeFileName = `badge-${grade.toLowerCase().replace('+', '_plus')}.png`;
                 const badgeUrl = `./assets/images/branding/${badgeFileName}`;
                 const courseName = badge.courseName || 'Course';
                 const dateStr = badge.completionDate?.toDate ? badge.completionDate.toDate().toLocaleDateString() : (badge.completionDate ? new Date(badge.completionDate).toLocaleDateString() : '');
                 badgesHtml += `
                     <div class="course-badge border rounded-lg p-2 shadow-sm bg-gray-50 dark:bg-gray-700 flex flex-col items-center text-center w-28" title="${escapeHtml(courseName)} - Grade: ${grade} (${dateStr})">
                         <img src="${badgeUrl}" alt="${grade} Grade Badge" class="w-16 h-16 mb-1" onerror="this.style.display='none'; console.error('Error loading badge: ${badgeUrl}')">
                         <p class="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">${escapeHtml(courseName)}</p>
                         <p class="text-xs text-gray-500 dark:text-gray-400">${dateStr}</p>
                     </div>`;
             });
             badgesHtml += `</div>`;
         } else {
            badgesHtml = '<p class="text-sm text-muted mt-4 text-center">No completed course badges yet.</p>';
         }

        // --- MODIFIED: Removed Logout and Delete Account buttons from this main form ---
        // --- MODIFIED: Kept Display Name update, username is read-only here for now ---
        const html = `
        <div class="max-w-lg mx-auto animate-fade-in">
            <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Your Profile</h2>

            <div class="content-card mb-6">
                 <form id="update-profile-form" onsubmit="window.updateUserProfile(event)">
                    <div class="flex flex-col sm:flex-row items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4 pb-4 border-b dark:border-gray-700">
                         <div class="relative group flex-shrink-0">
                            <img id="profile-pic-preview" src="${photoUrlValue}" alt="Profile Picture" class="w-20 h-20 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 shadow-sm" onerror="this.onerror=null;this.src='${DEFAULT_PROFILE_PIC_URL}';">
                            <label for="profilePicInput" class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <input type="file" id="profilePicInput" accept="image/*" class="hidden">
                            </label>
                         </div>
                         <div class="text-center sm:text-left">
                             <p class="text-lg font-medium text-gray-800 dark:text-gray-100" id="profile-display-name-header">${escapeHtml(currentDisplayName)}</p>
                             <p class="text-sm text-muted">@${escapeHtml(currentUsername)}</p>
                             <p class="text-sm text-muted">${currentUser.email || 'No email provided'}</p>
                             <p class="text-sm text-yellow-600 dark:text-yellow-400 font-semibold">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1 align-text-bottom"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-4.75a.75.75 0 0 0 1.5 0V8.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0L6.2 9.74a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z" clip-rule="evenodd" /></svg>
                                <span id="user-profile-credits">${currentCredits.toLocaleString()}</span> Credits
                             </p>
                             <p class="text-xs text-muted mt-1">User ID: ${currentUser.uid}</p>
                         </div>
                    </div>
                     <div class="space-y-4">
                         <div>
                             <label for="displayNameInput">Display Name</label>
                             <input type="text" id="displayNameInput" value="${escapeHtml(currentDisplayName)}" required placeholder="Your Name">
                         </div>
                          <div>
                              <label for="usernameDisplay">Username</label>
                              <input type="text" id="usernameDisplay" value="@${escapeHtml(currentUsername)}" disabled class="bg-gray-100 dark:bg-gray-700 cursor-not-allowed">
                              <p class="form-help-text text-xs">Username can be changed in Settings.</p>
                          </div>
                          <div>
                              <button type="submit" class="btn-primary w-full mt-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path d="M17.414 2.586a2 2 0 0 0-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 0 0 0-2.828Z" /><path fill-rule="evenodd" d="M2 6a2 2 0 0 1 2-2h4a1 1 0 0 1 0 2H4v10h10v-4a1 1 0 1 1 2 0v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" clip-rule="evenodd" /></svg>
                                  Save Display Name
                              </button>
                          </div>
                     </div>
                 </form>
            </div>

             <div class="content-card mb-6">
                 ${badgesHtml}
             </div>

             <div class="content-card">
                 <p class="text-sm text-center text-muted">Account actions (Logout, Delete, Change Email/Password) are available in <button class="link" onclick="window.showSettingsPanel()">Settings</button>.</p>
             </div>
        </div>`;
        // --- END MODIFICATION ---

        displayContent(html);

        const fileInput = document.getElementById('profilePicInput');
        if (fileInput) {
            fileInput.addEventListener('change', (event) => handleProfilePictureSelect(event, async (imageDataUrl) => {
                const previewImg = document.getElementById('profile-pic-preview');
                const originalSrc = previewImg?.src;
                if (previewImg) previewImg.src = imageDataUrl;
                showLoading("Uploading profile picture...");
                try {
                    if (imageDataUrl.length > 10000000) { throw new Error("Image is too large (max ~1MB)."); }
                    await db.collection('users').doc(currentUser.uid).update({ photoURL: imageDataUrl });
                    await fetchAndUpdateUserInfo(auth.currentUser);
                    const successMsgHtml = `<div class="toast-notification toast-success animate-fade-in"><p class="font-medium">Profile picture updated!</p></div>`;
                    const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 4000);
                } catch (error) {
                    console.error("Error updating profile picture:", error);
                    if (previewImg && originalSrc) previewImg.src = originalSrc;
                    let errorMessage = "Failed to update profile picture.";
                    if (error.message.includes("too large")) errorMessage = error.message;
                    else if (error.code === 'auth/invalid-profile-attribute') errorMessage = "Image format invalid.";
                    else if (error.message) errorMessage = error.message;
                    const errorMsgHtml = `<div class="toast-notification toast-error animate-fade-in"><p class="font-medium">${errorMessage}</p></div>`;
                    const msgContainer = document.createElement('div'); msgContainer.innerHTML = errorMsgHtml; document.body.appendChild(msgContainer); setTimeout(() => { msgContainer.remove(); }, 6000);
                } finally { hideLoading(); }
            }));
        }
         const previewImg = document.getElementById('profile-pic-preview');
         if (previewImg && previewImg.src && previewImg.src !== DEFAULT_PROFILE_PIC_URL) {
              previewImg.onerror = () => { previewImg.src = DEFAULT_PROFILE_PIC_URL; };
              if (previewImg.complete && previewImg.naturalWidth === 0) previewImg.src = DEFAULT_PROFILE_PIC_URL;
         }
    }).catch(error => {
        hideLoading();
        console.error("Error fetching user profile details from Firestore:", error);
        let currentDisplayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
        let currentPhotoURL = currentUser?.photoURL || DEFAULT_PROFILE_PIC_URL;
        let currentUsername = currentUser?.email?.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20) || `user_${currentUser?.uid?.substring(0,6) || '??'}`;
        let currentCreditsFallback = currentUser?.credits || 0;
        const photoUrlValue = currentPhotoURL || '';
         const fallbackHtml = `
         <div class="max-w-lg mx-auto animate-fade-in">
             <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Your Profile</h2>
             <div class="content-card mb-6 bg-warning-100 dark:bg-yellow-900/30 border-warning-300 dark:border-warning-700"><p class="text-sm text-warning-700 dark:text-warning-200 font-medium text-center">Could not load full profile data. Displaying basic info.</p></div>
             <div class="content-card mb-6">
                 <form id="update-profile-form" onsubmit="window.updateUserProfile(event)">
                      <div class="flex items-center mb-6 space-x-4 pb-4 border-b dark:border-gray-700">
                        <img id="profile-pic-preview" src="${photoUrlValue}" alt="Profile Picture" class="w-16 h-16 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 shadow-sm" onerror="this.onerror=null;this.src='${DEFAULT_PROFILE_PIC_URL}';">
                        <div>
                            <p class="text-lg font-medium text-gray-800 dark:text-gray-100">${escapeHtml(currentDisplayName)}</p>
                            <p class="text-sm text-muted">@${escapeHtml(currentUsername)}</p>
                            <p class="text-sm text-muted">${currentUser?.email || 'N/A'}</p>
                            <p class="text-sm text-yellow-600 dark:text-yellow-400 font-semibold">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1 align-text-bottom"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-4.75a.75.75 0 0 0 1.5 0V8.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0L6.2 9.74a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z" clip-rule="evenodd" /></svg>
                                <span id="user-profile-credits-fallback">${currentCreditsFallback.toLocaleString()}</span> Credits
                             </p>
                            <p class="text-xs text-muted mt-1">UID: ${currentUser?.uid || 'N/A'}</p>
                        </div>
                      </div>
                      <div class="space-y-4"><div><label for="displayNameInput">Display Name</label><input type="text" id="displayNameInput" value="${escapeHtml(currentDisplayName)}" required></div><div><label for="usernameDisplay">Username</label><input type="text" id="usernameDisplay" value="@${escapeHtml(currentUsername)}" disabled class="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"></div><div><button type="submit" class="btn-primary w-full mt-2">Save Display Name</button></div></div>
                 </form>
             </div>
              <div class="content-card"><p class="text-sm text-center text-muted">Account actions (Logout, Delete, Change Email/Password) are available in <button class="link" onclick="window.showSettingsPanel()">Settings</button>.</p></div>
        </div>`;
        displayContent(fallbackHtml);
         const previewImgFallback = document.getElementById('profile-pic-preview');
         if (previewImgFallback && previewImgFallback.src && previewImgFallback.src !== DEFAULT_PROFILE_PIC_URL) {
              previewImgFallback.onerror = () => { previewImgFallback.src = DEFAULT_PROFILE_PIC_URL; };
              if (previewImgFallback.complete && previewImgFallback.naturalWidth === 0) previewImgFallback.src = DEFAULT_PROFILE_PIC_URL;
         }
    });
}

export async function updateUserProfile(event) {
    event.preventDefault();
    if (!currentUser || !auth || !db) {
        alert("Error: Cannot update profile. Not logged in or Firebase not ready.");
        return;
    }
    const displayNameInput = document.getElementById('displayNameInput');
    if (!displayNameInput) {
        console.error("Could not find displayNameInput element.");
        alert("An internal error occurred. Could not find profile fields.");
        return;
    }
    const newDisplayName = displayNameInput.value.trim();
    if (!newDisplayName) {
        alert("Display Name cannot be empty.");
        displayNameInput.focus();
        return;
    }
    showLoading("Updating profile...");
    try {
        const currentAuthUser = auth.currentUser;
        if (!currentAuthUser) throw new Error("Auth state error: currentUser is null.");
        const authUpdates = {};
        if (newDisplayName !== currentAuthUser.displayName) {
            authUpdates.displayName = newDisplayName;
        }
        const firestoreUpdates = { displayName: newDisplayName };
        let authUpdatePromise = Promise.resolve();
        if (Object.keys(authUpdates).length > 0) {
            authUpdatePromise = currentAuthUser.updateProfile(authUpdates);
        }
        const userRef = db.collection('users').doc(currentUser.uid);
        const firestoreUpdatePromise = userRef.update(firestoreUpdates);
        await Promise.all([authUpdatePromise, firestoreUpdatePromise]);
        await fetchAndUpdateUserInfo(auth.currentUser);
        hideLoading();
        const nameHeader = document.getElementById('profile-display-name-header');
        if (nameHeader) nameHeader.textContent = newDisplayName;
        const successMsgHtml = `<div class="toast-notification toast-success animate-fade-in"><p class="font-medium">Display Name updated successfully!</p></div>`;
         const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml;
         document.body.appendChild(msgContainer);
         setTimeout(() => { msgContainer.remove(); }, 4000);
         window.playUiSound?.('save_success');
    } catch (error) {
        console.error("Error updating profile:", error);
        hideLoading();
        alert(`Failed to update profile: ${error.message}.`);
        const errorMsgHtml = `<div class="toast-notification toast-error animate-fade-in"><p class="font-medium">Failed to update profile: ${error.message}.</p></div>`;
         const msgContainer = document.createElement('div'); msgContainer.innerHTML = errorMsgHtml;
         document.body.appendChild(msgContainer);
         setTimeout(() => { msgContainer.remove(); }, 6000);
         window.playUiSound?.('error');
    }
}

async function deleteSubcollection(db, parentDocRef, subcollectionName) {
    const subcollectionRef = parentDocRef.collection(subcollectionName);
    let snapshot = await subcollectionRef.limit(500).get(); 
    while (snapshot.size > 0) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => { batch.delete(doc.ref); });
        await batch.commit();
        console.log(`Deleted ${snapshot.size} documents from ${parentDocRef.path}/${subcollectionName}`);
        if (snapshot.size < 500) break;
        snapshot = await subcollectionRef.limit(500).get();
    }
    if (snapshot.size === 0) console.log(`No more documents found in ${parentDocRef.path}/${subcollectionName} or subcollection was empty.`);
}


// THIS confirmSelfDeleteAccount will now be called from the SETTINGS panel
export async function confirmSelfDeleteAccount() { // Renamed to avoid clash if old one is still globally assigned
    if (!currentUser) { console.warn("confirmSelfDeleteAccount: No current user."); return; }
    const firstConfirm = confirm("WARNING: Are you absolutely sure you want to delete your account? This will permanently remove all your TestGen data, course progress, notes, AI chat history, and exam results. This action CANNOT be undone.");
    if (!firstConfirm) { return; }
    const secondConfirmInput = prompt("To confirm deletion, please type 'DELETE MY ACCOUNT' in the box below:");
    if (secondConfirmInput === null || secondConfirmInput.trim().toUpperCase() !== "DELETE MY ACCOUNT") {
        alert("Deletion cancelled or incorrect confirmation.");
        return;
    }
    window.playUiSound?.('button_click'); // Play sound on final confirmation action
    await handleSelfDeleteAccount();
}

async function handleSelfDeleteAccount() {
    if (!currentUser || !db || !auth) {
        alert("Error: Cannot delete account. User session or database connection is invalid.");
        console.error("handleSelfDeleteAccount: currentUser, db, or auth is null.");
        return;
    }
    const authUserForReauth = auth.currentUser; 
    if (!authUserForReauth) {
        alert("Error: Authentication session error. Please try logging out and back in before deleting your account.");
        console.error("handleSelfDeleteAccount: auth.currentUser is null.");
        return;
    }
    const userEmail = authUserForReauth.email;
    if (!userEmail) {
        alert("Error: User email not found. Cannot proceed with re-authentication for deletion.");
        console.error("handleSelfDeleteAccount: authUserForReauth.email is null.");
        return;
    }
    const password = prompt("For security, please re-enter your password to confirm account deletion:");
    if (!password) { alert("Password required for deletion. Deletion cancelled."); return; }
    showLoading("Verifying credentials & preparing for deletion...");
    try {
        const credential = firebase.auth.EmailAuthProvider.credential(userEmail, password);
        try {
            await authUserForReauth.reauthenticateWithCredential(credential);
        } catch (reauthError) {
            console.error("[handleSelfDeleteAccount] Re-authentication failed:", reauthError);
            hideLoading();
            alert("Re-authentication failed. Incorrect password or account issue. Deletion cancelled.");
            return;
        }
        showLoading("Deleting your account and data...");
        const uidToDelete = authUserForReauth.uid;
        let usernameToDelete = null;
        try {
            const userDocSnap = await db.collection('users').doc(uidToDelete).get();
            if (userDocSnap.exists) usernameToDelete = userDocSnap.data().username;
        } catch (fetchError) { console.warn("[handleSelfDeleteAccount] Could not fetch username before deletion.", fetchError); }
        console.log(`[handleSelfDeleteAccount] Starting data deletion for UID: ${uidToDelete}, Username: ${usernameToDelete || 'N/A'}`);
        const userDocRef = db.collection('users').doc(uidToDelete);
        const userCourseProgressDocRef = db.collection('userCourseProgress').doc(uidToDelete);
        try {
            await deleteSubcollection(db, userCourseProgressDocRef, 'courses');
            await userCourseProgressDocRef.delete(); 
        } catch (error) { console.error(`Error deleting userCourseProgress for ${uidToDelete}:`, error); }
        const userExamsDocRef = db.collection('userExams').doc(uidToDelete);
         try {
            await deleteSubcollection(db, userExamsDocRef, 'exams');
            await userExamsDocRef.delete();
        } catch (error) { console.error(`Error deleting userExams for ${uidToDelete}:`, error); }
        const subcollectionsInUserDoc = ['aiChatSessions', 'userFormulaSheets', 'userChapterSummaries', 'creditLog', 'inbox'];
        for (const subcollectionName of subcollectionsInUserDoc) {
            try { await deleteSubcollection(db, userDocRef, subcollectionName); }
            catch (error) { console.error(`Error deleting subcollection ${subcollectionName} for UID ${uidToDelete}:`, error); }
        }
        try { await userDocRef.delete(); }
        catch (error) { console.error(`Error deleting main user document users/${uidToDelete}:`, error); }
        if (usernameToDelete) {
            try { await db.collection('usernames').doc(usernameToDelete.toLowerCase()).delete(); }
            catch (error) { console.error(`Error deleting username reservation usernames/${usernameToDelete.toLowerCase()}:`, error); }
        }
        await authUserForReauth.delete();
        alert("Your account and all associated data have been permanently deleted.");
        window.playUiSound?.('exam_finish_fail'); // Using a "fail" or "warning" sound for destructive action
    } catch (error) {
        console.error("[handleSelfDeleteAccount] Account deletion process failed:", error);
        let message = "Account deletion failed. ";
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') message += "Incorrect password or re-authentication failed.";
        else if (error.code === 'auth/requires-recent-login') message += "This operation requires recent authentication. Sign out, sign back in, and try again.";
        else if (error.code === 'auth/user-disabled') message += "Your account is disabled.";
        else message += error.message || "An unknown error occurred.";
        alert(message);
        window.playUiSound?.('error');
    } finally { hideLoading(); }
}
window.updateUserProfile = updateUserProfile;
// Removed window.signOutUserWrapper and window.confirmSelfDeleteAccount as they will be in settings panel
// --- END OF FILE ui_user_profile.js ---