// ui_user_profile.js

import { currentUser, db, auth, userCourseProgressMap, globalCourseDataMap } from './state.js'; // Added globalCourseDataMap
import { displayContent, fetchAndUpdateUserInfo, showLoginUI, clearContent, setActiveSidebarLink } from './ui_core.js'; // Added fetchAndUpdateUserInfo
import { showLoading, hideLoading, escapeHtml } from './utils.js'; // Added escapeHtml
import { signOutUser } from './firebase_auth.js';
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

    showLoading("Loading profile...");
    db.collection('users').doc(currentUser.uid).get().then(doc => {
        hideLoading();
        let currentDisplayName = 'User';
        let currentPhotoURL = DEFAULT_PROFILE_PIC_URL;
        let currentUsername = ''; // Load username
        let completedBadges = [];
        let currentCredits = 0; // MODIFIED: Load credits

        if (doc.exists) {
            const userData = doc.data();
            currentDisplayName = userData.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
            currentPhotoURL = userData.photoURL || currentUser.photoURL || DEFAULT_PROFILE_PIC_URL;
            currentUsername = userData.username || ''; // Get username from Firestore
            completedBadges = userData.completedCourseBadges || []; // Load badges from user doc
            currentCredits = userData.credits || 0; // MODIFIED: Get credits from Firestore
        } else {
            console.warn("Firestore profile doc not found, using Auth profile data.");
            currentDisplayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
            currentPhotoURL = currentUser.photoURL || DEFAULT_PROFILE_PIC_URL;
            // Username might not be in auth, derive if possible
            currentUsername = currentUser.email?.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20) || `user_${currentUser.uid.substring(0,6)}`;
            currentCredits = currentUser.credits || 0; // MODIFIED: Get credits from state if Firestore doc missing
        }
        const photoUrlValue = currentPhotoURL || '';

        // --- Generate Badges HTML ---
        let badgesHtml = '';
        if (completedBadges.length > 0) {
             badgesHtml = `<h3 class="text-lg font-semibold mb-3 mt-6 text-gray-700 dark:text-gray-300">Completed Courses</h3><div class="flex flex-wrap gap-3">`;
             completedBadges.forEach(badge => {
                 // Use the stored badge data (grade, course name, date)
                 // Map grade to badge image filename
                 const grade = badge.grade || 'C'; // Default to C if grade missing
                 const badgeFileName = `badge-${grade.toLowerCase().replace('+', '_plus')}.png`;
                 const badgeUrl = `./assets/images/branding/${badgeFileName}`;
                 const courseName = badge.courseName || 'Course'; // Fallback name
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
        // --- End Badges HTML ---

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
                             <!-- MODIFIED: Added Credits Display -->
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
                         <!-- Username is read-only for now after creation -->
                          <div>
                              <label for="usernameDisplay">Username</label>
                              <input type="text" id="usernameDisplay" value="@${escapeHtml(currentUsername)}" disabled class="bg-gray-100 dark:bg-gray-700 cursor-not-allowed">
                          </div>
                         <!-- Photo URL input removed - handled by file upload/cropper -->
                          <div>
                              <button type="submit" class="btn-primary w-full mt-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path d="M17.414 2.586a2 2 0 0 0-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 0 0 0-2.828Z" /><path fill-rule="evenodd" d="M2 6a2 2 0 0 1 2-2h4a1 1 0 0 1 0 2H4v10h10v-4a1 1 0 1 1 2 0v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" clip-rule="evenodd" /></svg>
                                  Save Profile Changes
                              </button>
                          </div>
                     </div>
                 </form>
            </div>

             <!-- Course Badges Section -->
             <div class="content-card mb-6">
                 ${badgesHtml}
             </div>

             <div class="content-card">
                 <button onclick="window.signOutUserWrapper()" class="w-full btn-danger flex items-center justify-center">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M6 10a.75.75 0 0 1 .75-.75h9.546l-1.048-.943a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 1 1-1.004-1.114l1.048-.943H6.75A.75.75 0 0 1 6 10Z" clip-rule="evenodd" /></svg>
                     Log Out
                 </button>
             </div>

            <!-- Danger Zone - Delete Account -->
            <div class="content-card mt-6 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30">
                 <h3 class="text-lg font-semibold mb-2 text-red-700 dark:text-red-300">Danger Zone</h3>
                 <p class="text-sm text-red-600 dark:text-red-400 mb-3">Deleting your account is permanent and will remove all your data, including TestGen progress, course enrollments, notes, and chat history.</p>
                 <button onclick="window.confirmSelfDeleteAccount()" class="btn-danger w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.177-2.34.294A2.25 2.25 0 0 0 1.66 6.22l-.13.44a.75.75 0 0 0 1.452.433l.13-.44a.75.75 0 0 1 .994-.512c.81-.126 1.645-.235 2.504-.313V15.25a.75.75 0 0 1-.75.75H3.75a.75.75 0 0 0 0 1.5h3.5a2.25 2.25 0 0 0 2.25-2.25V3.75a2.75 2.75 0 0 0-2.75-2.75Zm6.53 3.939a.75.75 0 0 0-1.06-1.06L12 6.19l-2.22-2.22a.75.75 0 0 0-1.06 1.06L10.94 7.25l-2.22 2.22a.75.75 0 1 0 1.06 1.06L12 8.31l2.22 2.22a.75.75 0 1 0 1.06-1.06L13.06 7.25l2.22-2.22Z" clip-rule="evenodd" /></svg>
                    Delete My Account Permanently
                 </button>
             </div>
        </div>`;

        displayContent(html); // Use displayContent to handle insertion

        // Add input listener for file upload
        const fileInput = document.getElementById('profilePicInput');
        if (fileInput) {
            fileInput.addEventListener('change', (event) => handleProfilePictureSelect(event, async (imageDataUrl) => {
                // This callback receives the cropped image data URL
                // Update the preview immediately
                const previewImg = document.getElementById('profile-pic-preview');
                const originalSrc = previewImg?.src; // Store original src for potential reversion
                if (previewImg) previewImg.src = imageDataUrl;

                showLoading("Uploading profile picture...");
                try {
                    // Check image size before attempting upload
                    if (imageDataUrl.length > 1000000) { // ~1MB limit
                        throw new Error("Image is too large (max ~1MB). Please try a smaller image.");
                    }

                    // Update Firestore only
                    await db.collection('users').doc(currentUser.uid).update({ photoURL: imageDataUrl });

                    // Refresh header with latest data <<< MODIFICATION >>>
                    await fetchAndUpdateUserInfo(auth.currentUser);

                    // Show success message with clarification
                    const successMsgHtml = `<div class="toast-notification toast-success animate-fade-in"><p class="font-medium">Profile picture preview and storage updated successfully!</p></div>`;
                    const msgContainer = document.createElement('div');
                    msgContainer.innerHTML = successMsgHtml;
                    document.body.appendChild(msgContainer);
                    setTimeout(() => { msgContainer.remove(); }, 4000);

                } catch (error) {
                    console.error("Error updating profile picture:", error);

                    // Revert preview image if update failed
                    if (previewImg && originalSrc) {
                        previewImg.src = originalSrc;
                    }

                    // Show error message with specific handling for size-related errors
                    let errorMessage = "Failed to update profile picture.";
                    if (error.message.includes("too large")) {
                        errorMessage = error.message;
                    } else if (error.code === 'auth/invalid-profile-attribute') {
                        errorMessage = "Image format is invalid. Please try a different image.";
                    } else if (error.message) {
                        errorMessage = error.message;
                    }

                    const errorMsgHtml = `<div class="toast-notification toast-error animate-fade-in"><p class="font-medium">${errorMessage}</p></div>`;
                    const msgContainer = document.createElement('div');
                    msgContainer.innerHTML = errorMsgHtml;
                    document.body.appendChild(msgContainer);
                    setTimeout(() => { msgContainer.remove(); }, 6000);

                } finally {
                    hideLoading();
                }
            }));
        }

         // Error handling for initial image load
         const previewImg = document.getElementById('profile-pic-preview');
         if (previewImg && previewImg.src && previewImg.src !== DEFAULT_PROFILE_PIC_URL) {
              previewImg.onerror = () => { previewImg.src = DEFAULT_PROFILE_PIC_URL; };
              // Check if already broken (sometimes useful for cached images)
              if (previewImg.complete && previewImg.naturalWidth === 0) {
                   previewImg.src = DEFAULT_PROFILE_PIC_URL;
              }
         }


    }).catch(error => {
        hideLoading();
        console.error("Error fetching user profile details from Firestore:", error);
        // Fallback display logic (mostly unchanged, removed photoURL input)
        let currentDisplayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
        let currentPhotoURL = currentUser?.photoURL || DEFAULT_PROFILE_PIC_URL;
        let currentUsername = currentUser?.email?.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20) || `user_${currentUser?.uid?.substring(0,6) || '??'}`;
        let currentCreditsFallback = currentUser?.credits || 0; // MODIFIED: Fallback for credits
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
                            <!-- MODIFIED: Added Credits Display Fallback -->
                            <p class="text-sm text-yellow-600 dark:text-yellow-400 font-semibold">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 inline-block mr-1 align-text-bottom"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-4.75a.75.75 0 0 0 1.5 0V8.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0L6.2 9.74a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z" clip-rule="evenodd" /></svg>
                                <span id="user-profile-credits-fallback">${currentCreditsFallback.toLocaleString()}</span> Credits
                             </p>
                            <p class="text-xs text-muted mt-1">UID: ${currentUser?.uid || 'N/A'}</p>
                        </div>
                      </div>
                      <div class="space-y-4"><div><label for="displayNameInput">Display Name</label><input type="text" id="displayNameInput" value="${escapeHtml(currentDisplayName)}" required></div><div><label for="usernameDisplay">Username</label><input type="text" id="usernameDisplay" value="@${escapeHtml(currentUsername)}" disabled class="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"></div><div><button type="submit" class="btn-primary w-full mt-2">Save Profile Changes</button></div></div>
                 </form>
             </div>
             <div class="content-card"><button onclick="window.signOutUserWrapper()" class="w-full btn-danger flex items-center justify-center">Log Out</button></div>
        </div>`;
        displayContent(fallbackHtml);
         // Error handling for initial image load
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
    // --- MODIFICATION: Check if displayNameInput exists ---
    if (!displayNameInput) {
        console.error("Could not find displayNameInput element.");
        alert("An internal error occurred. Could not find profile fields.");
        return;
    }
    const newDisplayName = displayNameInput.value.trim();
    // --- END MODIFICATION ---
    // Photo URL is now handled separately by the cropper callback

    if (!newDisplayName) {
        alert("Display Name cannot be empty.");
        displayNameInput.focus(); // Focus the existing input
        return;
    }

    showLoading("Updating profile...");
    try {
        const currentAuthUser = auth.currentUser;
        if (!currentAuthUser) throw new Error("Auth state error: currentUser is null.");

        // --- Prepare Auth Update ---
        const authUpdates = {};
        if (newDisplayName !== currentAuthUser.displayName) {
            authUpdates.displayName = newDisplayName;
        }
        // PhotoURL update is handled by the cropper callback now

        // --- Prepare Firestore Update ---
        const firestoreUpdates = {
             displayName: newDisplayName,
             // photoURL update handled by cropper callback
        };

        // --- Execute Updates ---
        let authUpdatePromise = Promise.resolve();
        if (Object.keys(authUpdates).length > 0) {
            authUpdatePromise = currentAuthUser.updateProfile(authUpdates);
            console.log("Updating Firebase Auth display name...");
        } else {
             console.log("No changes detected for Firebase Auth profile display name.");
        }

        const userRef = db.collection('users').doc(currentUser.uid);
        const firestoreUpdatePromise = userRef.update(firestoreUpdates);
        console.log("Updating Firestore profile document display name...");

        await Promise.all([authUpdatePromise, firestoreUpdatePromise]);
        console.log("Auth and Firestore display names updated.");

        // Refresh header with latest data <<< MODIFICATION >>>
        await fetchAndUpdateUserInfo(auth.currentUser);

        hideLoading();
        // Update display name in the form header locally
        const nameHeader = document.getElementById('profile-display-name-header');
        if (nameHeader) nameHeader.textContent = newDisplayName;


        const successMsgHtml = `<div class="toast-notification toast-success animate-fade-in"><p class="font-medium">Display Name updated successfully!</p></div>`;
         const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml;
         document.body.appendChild(msgContainer);
         setTimeout(() => { msgContainer.remove(); }, 4000);

    } catch (error) {
        console.error("Error updating profile:", error);
        hideLoading();
        alert(`Failed to update profile: ${error.message}.`);
        const errorMsgHtml = `<div class="toast-notification toast-error animate-fade-in"><p class="font-medium">Failed to update profile: ${error.message}.</p></div>`;
         const msgContainer = document.createElement('div'); msgContainer.innerHTML = errorMsgHtml;
         document.body.appendChild(msgContainer);
         setTimeout(() => { msgContainer.remove(); }, 6000);
    }
}

// Helper function to delete all documents in a subcollection
async function deleteSubcollection(db, parentDocRef, subcollectionName) {
    const subcollectionRef = parentDocRef.collection(subcollectionName);
    let snapshot = await subcollectionRef.limit(500).get(); 
    
    while (snapshot.size > 0) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Deleted ${snapshot.size} documents from ${parentDocRef.path}/${subcollectionName}`);
        
        // Fetch next batch if necessary
        if (snapshot.size < 500) break; // If less than limit, all docs in current query were deleted
        snapshot = await subcollectionRef.limit(500).get();
    }
    if (snapshot.size === 0) {
         console.log(`No more documents found in ${parentDocRef.path}/${subcollectionName} or subcollection was empty.`);
    }
}


async function confirmSelfDeleteAccount() {
    if (!currentUser) {
        console.warn("confirmSelfDeleteAccount: No current user.");
        return;
    }

    const firstConfirm = confirm("WARNING: Are you absolutely sure you want to delete your account? This will permanently remove all your TestGen data, course progress, notes, AI chat history, and exam results. This action CANNOT be undone.");
    if (!firstConfirm) {
        return;
    }

    const secondConfirmInput = prompt("To confirm deletion, please type 'DELETE MY ACCOUNT' in the box below:");
    if (secondConfirmInput === null || secondConfirmInput.trim().toUpperCase() !== "DELETE MY ACCOUNT") {
        alert("Deletion cancelled or incorrect confirmation.");
        return;
    }

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
    
    const userEmail = authUserForReauth.email; // Use email from authUserForReauth
    if (!userEmail) {
        alert("Error: User email not found in current auth session. Cannot proceed with re-authentication for deletion.");
        console.error("handleSelfDeleteAccount: authUserForReauth.email is null.");
        return;
    }

    const password = prompt("For security, please re-enter your password to confirm account deletion:");
    if (!password) {
        alert("Password required for deletion. Deletion cancelled.");
        return;
    }

    showLoading("Verifying credentials & preparing for deletion...");

    try {
        const credential = firebase.auth.EmailAuthProvider.credential(userEmail, password);
        // --- RE-AUTHENTICATION ---
        try {
            await authUserForReauth.reauthenticateWithCredential(credential);
            console.log("[handleSelfDeleteAccount] Re-authentication successful. Proceeding with account deletion.");
        } catch (reauthError) {
            console.error("[handleSelfDeleteAccount] Re-authentication failed:", reauthError);
            hideLoading();
            alert("Re-authentication failed. Incorrect password or an account issue occurred. Deletion cancelled.");
            return; // Stop further execution
        }
        
        showLoading("Deleting your account and data...");

        const uidToDelete = authUserForReauth.uid;
        let usernameToDelete = null;

        // Fetch username from Firestore before deleting the user document
        try {
            const userDocSnap = await db.collection('users').doc(uidToDelete).get();
            if (userDocSnap.exists) {
                usernameToDelete = userDocSnap.data().username;
                console.log(`[handleSelfDeleteAccount] Fetched username '${usernameToDelete}' for UID ${uidToDelete}.`);
            } else {
                console.warn(`[handleSelfDeleteAccount] User document users/${uidToDelete} not found, cannot fetch username.`);
            }
        } catch (fetchError) {
            console.warn("[handleSelfDeleteAccount] Could not fetch username before deletion, continuing...", fetchError);
        }


        console.log(`[handleSelfDeleteAccount] Starting data deletion for UID: ${uidToDelete}, Username: ${usernameToDelete || 'N/A'}`);

        // --- Firestore Data Deletion ---
        const userDocRef = db.collection('users').doc(uidToDelete);

        // Delete userCourseProgress subcollection and parent doc
        const userCourseProgressDocRef = db.collection('userCourseProgress').doc(uidToDelete);
        try {
            console.log(`  Deleting subcollection: /userCourseProgress/${uidToDelete}/courses`);
            await deleteSubcollection(db, userCourseProgressDocRef, 'courses');
            await userCourseProgressDocRef.delete(); 
            console.log(`  Deleted userCourseProgress document: /userCourseProgress/${uidToDelete}`);
        } catch (error) {
             console.error(`  Error deleting userCourseProgress for ${uidToDelete}:`, error);
        }
        
        // Delete userExams subcollection and parent doc
        const userExamsDocRef = db.collection('userExams').doc(uidToDelete);
         try {
            console.log(`  Deleting subcollection: /userExams/${uidToDelete}/exams`);
            await deleteSubcollection(db, userExamsDocRef, 'exams');
            await userExamsDocRef.delete();
            console.log(`  Deleted userExams document: /userExams/${uidToDelete}`);
        } catch (error) {
             console.error(`  Error deleting userExams for ${uidToDelete}:`, error);
        }

        // Subcollections under users/{uid}
        const subcollectionsInUserDoc = [
            'aiChatSessions',
            'userFormulaSheets',
            'userChapterSummaries',
            'creditLog',
            'inbox' // Added inbox as per thought process
        ];

        for (const subcollectionName of subcollectionsInUserDoc) {
            try {
                console.log(`  Deleting subcollection: ${userDocRef.path}/${subcollectionName}`);
                await deleteSubcollection(db, userDocRef, subcollectionName);
            } catch (error) {
                console.error(`  Error deleting subcollection ${subcollectionName} for UID ${uidToDelete}:`, error);
                // Continue to other deletions
            }
        }
        
        // Delete main user document
        try {
            await userDocRef.delete();
            console.log(`  Deleted main user document: users/${uidToDelete}`);
        } catch (error) {
            console.error(`  Error deleting main user document users/${uidToDelete}:`, error);
        }

        // Delete username reservation
        if (usernameToDelete) {
            try {
                await db.collection('usernames').doc(usernameToDelete.toLowerCase()).delete();
                console.log(`  Deleted username reservation: usernames/${usernameToDelete.toLowerCase()}`);
            } catch (error) {
                console.error(`  Error deleting username reservation usernames/${usernameToDelete.toLowerCase()}:`, error);
                // Log and continue as Firestore rules might prevent this for non-admins
            }
        }

        // Delete Firebase Auth Account
        console.log("[handleSelfDeleteAccount] Attempting to delete Firebase Auth account...");
        await authUserForReauth.delete(); // This will trigger onAuthStateChanged
        console.log("[handleSelfDeleteAccount] Firebase Auth account deleted successfully.");
        alert("Your account and all associated data have been permanently deleted.");
        // UI updates will be handled by onAuthStateChanged

    } catch (error) {
        // This catch block now primarily handles errors *after* successful re-authentication,
        // or general setup errors before re-auth attempt.
        console.error("[handleSelfDeleteAccount] Account deletion process failed:", error);
        let message = "Account deletion failed. ";
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            // This case should ideally be caught by the specific re-auth try-catch,
            // but including it here as a fallback.
            message += "Incorrect password or re-authentication failed.";
        } else if (error.code === 'auth/requires-recent-login') {
            // This can happen if re-auth was successful but the auth token is still considered stale
            // for the delete operation, or if re-auth failed and we fell through.
            message += "This operation is sensitive and requires recent authentication. Please sign out, sign back in, and try again.";
        } else if (error.code === 'auth/user-disabled') {
            message += "Your account is disabled.";
        } else {
            message += error.message || "An unknown error occurred.";
        }
        alert(message);
    } finally {
        hideLoading();
    }
}


window.updateUserProfile = updateUserProfile; // Assign to window for form submit
window.signOutUserWrapper = signOutUser; // Assign sign out to window
window.confirmSelfDeleteAccount = confirmSelfDeleteAccount; // Assign delete account function

// --- END OF FILE ui_user_profile.js ---