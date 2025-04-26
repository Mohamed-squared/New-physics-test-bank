// ui_user_profile.js

import { currentUser, db, auth } from './state.js';
import { displayContent, fetchAndUpdateUserInfo, showLoginUI, clearContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading } from './utils.js';
import { signOutUser } from './firebase_auth.js';
// REMOVED: import { handleProfilePictureSelect } from './ui_profile_picture.js';
import { DEFAULT_PROFILE_PIC_URL } from '../config.js';

// --- User Profile Dashboard ---

export function showUserProfileDashboard() {
    if (!currentUser || !db || !auth) {
        console.error("Cannot show profile: User not logged in or Firebase not ready.");
        showLoginUI();
        return;
    }
    clearContent();

    showLoading("Loading profile...");
    db.collection('users').doc(currentUser.uid).get().then(doc => {
        hideLoading();
        let currentDisplayName = 'User';
        let currentPhotoURL = DEFAULT_PROFILE_PIC_URL; // Use default from config

        if (doc.exists) {
            const userData = doc.data();
            currentDisplayName = userData.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
            currentPhotoURL = userData.photoURL || currentUser.photoURL || DEFAULT_PROFILE_PIC_URL;
        } else {
            console.warn("Firestore profile doc not found, using Auth profile data.");
            currentDisplayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
            currentPhotoURL = currentUser.photoURL || DEFAULT_PROFILE_PIC_URL;
        }
        const photoUrlValue = currentPhotoURL || ''; // Ensure it's not null/undefined for input

        const html = `
        <div class="max-w-lg mx-auto animate-fade-in">
            <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Your Profile</h2>

            <div class="content-card mb-6">
                 <form id="update-profile-form" onsubmit="window.updateUserProfile(event)">
                    <div class="flex items-center mb-6 space-x-4 pb-4 border-b dark:border-gray-700">
                         <!-- Static Preview Image -->
                         <img id="profile-pic-preview" src="${photoUrlValue}" alt="Profile Picture" class="w-16 h-16 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 shadow-sm" onerror="this.onerror=null;this.src='${DEFAULT_PROFILE_PIC_URL}';">
                         <div>
                             <p class="text-lg font-medium text-gray-800 dark:text-gray-100" id="profile-display-name-header">${currentDisplayName}</p>
                             <p class="text-sm text-muted">${currentUser.email || 'No email provided'}</p>
                             <p class="text-xs text-muted mt-1">User ID: ${currentUser.uid}</p>
                         </div>
                    </div>

                     <div class="space-y-4">
                         <div>
                             <label for="displayNameInput">Display Name</label>
                             <input type="text" id="displayNameInput" value="${currentDisplayName}" required placeholder="Your Name">
                         </div>
                         <!-- Reverted to visible text input for URL -->
                         <div>
                             <label for="photoURLInput">Photo URL</label>
                             <input type="url" id="photoURLInput" value="${photoUrlValue}" placeholder="https://example.com/image.png">
                             <p class="form-help-text">Paste a URL to an image hosted online (e.g., Imgur, Postimages). Leave blank for default.</p>
                         </div>

                          <div>
                              <button type="submit" class="btn-primary w-full mt-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path d="M17.414 2.586a2 2 0 0 0-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 0 0 0-2.828Z" /><path fill-rule="evenodd" d="M2 6a2 2 0 0 1 2-2h4a1 1 0 0 1 0 2H4v10h10v-4a1 1 0 1 1 2 0v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" clip-rule="evenodd" /></svg>
                                  Save Profile Changes
                              </button>
                          </div>
                     </div>
                 </form>
            </div>

             <div class="content-card">
                 <button onclick="window.signOutUserWrapper()" class="w-full btn-danger flex items-center justify-center">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M6 10a.75.75 0 0 1 .75-.75h9.546l-1.048-.943a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 1 1-1.004-1.114l1.048-.943H6.75A.75.75 0 0 1 6 10Z" clip-rule="evenodd" /></svg>
                     Log Out
                 </button>
             </div>
        </div>`;

        const contentEl = document.getElementById('content');
        if(contentEl) {
             contentEl.innerHTML = html;
             contentEl.classList.remove('hidden');

             // Add input listener for photo URL preview (if desired)
             const photoURLInput = document.getElementById('photoURLInput');
             const previewImg = document.getElementById('profile-pic-preview');
             if (photoURLInput && previewImg) {
                 photoURLInput.addEventListener('input', () => {
                     const urlValue = photoURLInput.value.trim();
                     const isValidUrl = urlValue === '' || urlValue.startsWith('http://') || urlValue.startsWith('https://');
                     previewImg.src = (isValidUrl && urlValue) ? urlValue : DEFAULT_PROFILE_PIC_URL;
                     // Optional: Add visual feedback for invalid format
                     photoURLInput.classList.toggle('border-danger-500', urlValue !== '' && !isValidUrl);
                 });
             }
             // Initial error check for existing photoURL
             if (previewImg.complete && previewImg.naturalWidth === 0 && previewImg.src !== DEFAULT_PROFILE_PIC_URL) {
                  previewImg.onerror(); // Trigger error handler if already loaded badly
             }
        }
        setActiveSidebarLink('showUserProfileDashboard');

    }).catch(error => {
        hideLoading();
        console.error("Error fetching user profile details from Firestore:", error);
        // Show basic profile using only Auth data as fallback
        let currentDisplayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
        let currentPhotoURL = currentUser?.photoURL || DEFAULT_PROFILE_PIC_URL;
        const photoUrlValue = currentPhotoURL || '';
        // Fallback HTML (similar structure)
         const fallbackHtml = `
         <div class="max-w-lg mx-auto animate-fade-in">
             <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Your Profile</h2>
             <div class="content-card mb-6 bg-warning-100 dark:bg-yellow-900/30 border-warning-300 dark:border-warning-700">
                  <p class="text-sm text-warning-700 dark:text-warning-200 font-medium text-center">Could not load full profile data. Displaying basic info.</p>
             </div>
             <div class="content-card mb-6">
                  <form id="update-profile-form" onsubmit="window.updateUserProfile(event)">
                      <div class="flex items-center mb-6 space-x-4 pb-4 border-b dark:border-gray-700">
                            <img id="profile-pic-preview" src="${photoUrlValue}" alt="Profile Picture" class="w-16 h-16 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 shadow-sm" onerror="this.onerror=null;this.src='${DEFAULT_PROFILE_PIC_URL}';">
                           <div><p class="text-lg font-medium text-gray-800 dark:text-gray-100" id="profile-display-name-header">${currentDisplayName}</p><p class="text-sm text-muted">${currentUser?.email || 'N/A'}</p><p class="text-xs text-muted mt-1">UID: ${currentUser?.uid || 'N/A'}</p></div>
                      </div>
                      <div class="space-y-4">
                           <div><label for="displayNameInput">Display Name</label><input type="text" id="displayNameInput" value="${currentDisplayName}" required placeholder="Your Name"></div>
                           <div>
                               <label for="photoURLInput">Photo URL</label>
                               <input type="url" id="photoURLInput" value="${photoUrlValue}" placeholder="https://example.com/image.png">
                               <p class="form-help-text">Paste a URL to an image hosted online.</p>
                           </div>
                           <div><button type="submit" class="btn-primary w-full mt-2">Save Profile Changes</button></div>
                      </div>
                  </form>
             </div>
             <div class="content-card">
                 <button onclick="window.signOutUserWrapper()" class="w-full btn-danger flex items-center justify-center">Log Out</button>
             </div>
        </div>`;
         const contentEl = document.getElementById('content');
         if(contentEl) {
             contentEl.innerHTML = fallbackHtml;
             contentEl.classList.remove('hidden');
             // Add listener for fallback too
             const photoURLInputFallback = document.getElementById('photoURLInput');
             const previewImgFallback = document.getElementById('profile-pic-preview');
             if (photoURLInputFallback && previewImgFallback) {
                 photoURLInputFallback.addEventListener('input', () => {
                     const urlValue = photoURLInputFallback.value.trim();
                     const isValidUrl = urlValue === '' || urlValue.startsWith('http://') || urlValue.startsWith('https://');
                     previewImgFallback.src = (isValidUrl && urlValue) ? urlValue : DEFAULT_PROFILE_PIC_URL;
                 });
                  if (previewImgFallback.complete && previewImgFallback.naturalWidth === 0 && previewImgFallback.src !== DEFAULT_PROFILE_PIC_URL) previewImgFallback.onerror();
             }
         }
         setActiveSidebarLink('showUserProfileDashboard');
    });
}

export async function updateUserProfile(event) {
    event.preventDefault();
    if (!currentUser || !auth || !db) {
        alert("Error: Cannot update profile. Not logged in or Firebase not ready.");
        return;
    }

    const displayNameInput = document.getElementById('displayNameInput');
    const photoURLInput = document.getElementById('photoURLInput'); // Now the visible URL input
    const newDisplayName = displayNameInput?.value.trim();
    let newPhotoURL = photoURLInput?.value.trim(); // Read the manually entered URL

    if (!newDisplayName) {
        alert("Display Name cannot be empty.");
        displayNameInput?.focus();
        return;
    }

    // Validate the manually entered Photo URL format if provided
    let isValidPhotoUrl = true;
    if (newPhotoURL && !newPhotoURL.startsWith('http://') && !newPhotoURL.startsWith('https://')) {
        isValidPhotoUrl = false;
        alert("Photo URL is invalid. It must start with http:// or https://, or be left blank.");
        photoURLInput?.focus();
        photoURLInput?.classList.add('border-danger-500'); // Add error style
        return;
    } else {
        photoURLInput?.classList.remove('border-danger-500'); // Remove error style if valid
    }

    // Set to null if the input is empty, for consistency
    if (newPhotoURL === '') {
        newPhotoURL = null;
    }

    showLoading("Updating profile...");
    try {
        const currentAuthUser = auth.currentUser;
        if (!currentAuthUser) throw new Error("Auth state error: currentUser is null.");

        const profileUpdates = {
            displayName: newDisplayName,
            // Only include photoURL in update if it's different from current Auth photoURL
            ...(newPhotoURL !== currentAuthUser.photoURL) && { photoURL: newPhotoURL }
        };

        // 1. Update Firebase Auth profile (only if there are changes)
        const authUpdates = {};
        if (profileUpdates.displayName !== currentAuthUser.displayName) {
            authUpdates.displayName = profileUpdates.displayName;
        }
        if (profileUpdates.photoURL !== undefined) { // Check if photoURL key exists in our updates object
             authUpdates.photoURL = profileUpdates.photoURL; // This could be null or a new URL
        }

        if (Object.keys(authUpdates).length > 0) {
            await currentAuthUser.updateProfile(authUpdates);
            console.log("Firebase Auth profile updated.");
        } else {
             console.log("No changes detected for Firebase Auth profile.");
        }

        // 2. Update Firestore user document
        const userRef = db.collection('users').doc(currentUser.uid);
        const firestoreUpdates = {
             displayName: newDisplayName,
             // Use the new URL, or the default if new URL is null
             photoURL: newPhotoURL === null ? DEFAULT_PROFILE_PIC_URL : newPhotoURL
        };
         await userRef.update(firestoreUpdates);
        console.log("Firestore profile document updated.");

        hideLoading();

        // 3. Refresh UI
        await fetchAndUpdateUserInfo(auth.currentUser); // Fetch latest combined info for header

        const successMsgHtml = `<div class="toast-notification toast-success animate-fade-in"><p class="font-medium">Profile updated successfully!</p></div>`;
         const msgContainer = document.createElement('div'); msgContainer.innerHTML = successMsgHtml;
         document.body.appendChild(msgContainer);
         setTimeout(() => { msgContainer.remove(); }, 4000);

    } catch (error) {
        console.error("Error updating profile:", error);
        hideLoading();
        // Check specifically for the auth/invalid-profile-attribute error again, though unlikely now
        if (error.code === 'auth/invalid-profile-attribute') {
             alert("Error saving profile: The Photo URL provided might be invalid or too long for Firebase.");
        } else {
            alert(`Failed to update profile: ${error.message}.`);
        }
        const errorMsgHtml = `<div class="toast-notification toast-error animate-fade-in"><p class="font-medium">Failed to update profile: ${error.message}.</p></div>`;
         const msgContainer = document.createElement('div'); msgContainer.innerHTML = errorMsgHtml;
         document.body.appendChild(msgContainer);
         setTimeout(() => { msgContainer.remove(); }, 6000);
    }
}