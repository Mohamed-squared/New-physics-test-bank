import { currentUser, db, auth } from './state.js'; // Import state and auth/db
// *** CORRECTION: Import fetchAndUpdateUserInfo, setActiveSidebarLink instead of showUserInfo ***
import { displayContent, fetchAndUpdateUserInfo, showLoginUI, clearContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading } from './utils.js';
import { signOutUser } from './firebase_auth.js'; // Import sign out function

// --- User Profile Dashboard ---

export function showUserProfileDashboard() {
    if (!currentUser || !db || !auth) { // Ensure auth and db are available
        console.error("Cannot show profile: User not logged in or Firebase not ready.");
        showLoginUI(); // Redirect to login if not logged in
        return;
    }
    clearContent(); // Clear previous content

    // Fetch latest profile info from Firestore first
    showLoading("Loading profile...");
    db.collection('users').doc(currentUser.uid).get().then(doc => {
        hideLoading();
        let currentDisplayName = 'User'; // Default
        let currentPhotoURL = 'default-avatar.png'; // Default

        if (doc.exists) {
            const userData = doc.data();
            // Prioritize Firestore data, fallback to Auth data, then defaults
            currentDisplayName = userData.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
            currentPhotoURL = userData.photoURL || currentUser.photoURL || 'default-avatar.png';
        } else {
            console.warn("Firestore profile doc not found, using Auth profile data.");
            currentDisplayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
            currentPhotoURL = currentUser.photoURL || 'default-avatar.png';
        }
        // Ensure currentPhotoURL is not null/undefined for the input value
        const photoUrlValue = currentPhotoURL || '';

        // Generate the profile page HTML - Use content-card for consistent styling
        const html = `
        <div class="max-w-lg mx-auto animate-fade-in">
            <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Your Profile</h2>

            <!-- Profile Update Form Card -->
            <div class="content-card mb-6">
                 <form id="update-profile-form" onsubmit="window.updateUserProfile(event)">
                     <!-- Profile Picture and Basic Info -->
                    <div class="flex items-center mb-6 space-x-4 pb-4 border-b dark:border-gray-700">
                         <img id="profile-pic-preview" src="${photoUrlValue || 'default-avatar.png'}" alt="Profile Picture" class="w-16 h-16 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 shadow-sm" onerror="this.onerror=null;this.src='default-avatar.png';">
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
                         <div>
                             <label for="photoURLInput">Photo URL</label>
                             <input type="url" id="photoURLInput" value="${photoUrlValue}" placeholder="https://example.com/image.png">
                             <p class="form-help-text">Enter a valid image URL (http/https) or leave blank for default.</p>
                         </div>
                          <div>
                              <button type="submit" class="btn-primary w-full mt-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /><path d="M17.414 2.586a2 2 0 0 0-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 0 0 0-2.828Z" /><path fill-rule="evenodd" d="M2 6a2 2 0 0 1 2-2h4a1 1 0 0 1 0 2H4v10h10v-4a1 1 0 1 1 2 0v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" clip-rule="evenodd" /></svg>
                                  Save Profile Changes
                              </button>
                          </div>
                     </div>
                 </form>
            </div>

             <!-- Log Out Card -->
             <div class="content-card">
                 <button onclick="window.signOutUserWrapper()" class="w-full btn-danger flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M6 10a.75.75 0 0 1 .75-.75h9.546l-1.048-.943a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 1 1-1.004-1.114l1.048-.943H6.75A.75.75 0 0 1 6 10Z" clip-rule="evenodd" /></svg>
                      Log Out
                 </button>
             </div>
        </div>`;
        // Use displayContent which wraps in a content-card, so remove the outer one here
        // displayContent(html); // Display the generated HTML
        // Instead, directly set the content of #content
        const contentEl = document.getElementById('content');
        if(contentEl) {
             contentEl.innerHTML = html; // Directly insert the structure
             contentEl.classList.remove('hidden'); // Ensure it's visible
        }


        // Add input listener for photo URL preview
        const photoURLInput = document.getElementById('photoURLInput');
        const previewImg = document.getElementById('profile-pic-preview');
        if(photoURLInput && previewImg) {
            photoURLInput.addEventListener('input', () => {
                const urlValue = photoURLInput.value.trim();
                // Simple check for http/https or empty
                const isValidUrl = urlValue === '' || urlValue.startsWith('http://') || urlValue.startsWith('https://');
                // Update preview optimistically, reset on error or invalid format
                previewImg.src = (isValidUrl && urlValue) ? urlValue : 'default-avatar.png';
                // Handle invalid input visual feedback if desired
                 photoURLInput.classList.toggle('border-danger', urlValue !== '' && !isValidUrl);
                 photoURLInput.classList.toggle('focus:border-danger', urlValue !== '' && !isValidUrl);
                 photoURLInput.classList.toggle('focus:ring-danger', urlValue !== '' && !isValidUrl);
            });
             // Set onerror handler for the preview image itself
             previewImg.onerror = () => {
                 previewImg.src='default-avatar.png';
                 console.error('Error loading profile image preview or initial image:', photoURLInput.value);
                 // Optionally add visual feedback to the input field if the URL fails to load
                 if (photoURLInput?.value.trim() !== '') {
                     photoURLInput.classList.add('border-danger');
                 }
             };
             // Trigger initial error check in case the saved URL is bad
             if (previewImg.complete && previewImg.naturalWidth === 0 && previewImg.src !== 'default-avatar.png' && photoURLInput?.value) {
                 previewImg.onerror();
             } else {
                 previewImg.onload = () => { // Clear error border on successful load
                     photoURLInput?.classList.remove('border-danger');
                 }
             }
        }
        setActiveSidebarLink('showUserProfileDashboard'); // Set active link

    }).catch(error => {
        hideLoading();
        console.error("Error fetching user profile details from Firestore:", error);
        // Show basic profile using only Auth data as fallback
        let currentDisplayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
        let currentPhotoURL = currentUser?.photoURL || 'default-avatar.png';
        const photoUrlValue = currentPhotoURL || '';
        // Re-generate HTML using fallback data
        const fallbackHtml = `
        <div class="max-w-lg mx-auto animate-fade-in">
             <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Your Profile</h2>
             <div class="content-card mb-6 bg-warning-100 dark:bg-yellow-900/30 border-warning-300 dark:border-warning-700">
                  <p class="text-sm text-warning-700 dark:text-warning-200 font-medium text-center">Could not load full profile data. Displaying basic info. Some features might be limited.</p>
             </div>

             <div class="content-card mb-6">
                 <form id="update-profile-form" onsubmit="window.updateUserProfile(event)">
                    <div class="flex items-center mb-6 space-x-4 pb-4 border-b dark:border-gray-700">
                         <img id="profile-pic-preview" src="${photoUrlValue || 'default-avatar.png'}" alt="Profile Picture" class="w-16 h-16 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 shadow-sm" onerror="this.onerror=null;this.src='default-avatar.png';">
                         <div><p class="text-lg font-medium text-gray-800 dark:text-gray-100" id="profile-display-name-header">${currentDisplayName}</p><p class="text-sm text-muted">${currentUser?.email || 'N/A'}</p><p class="text-xs text-muted mt-1">UID: ${currentUser?.uid || 'N/A'}</p></div>
                    </div>
                     <div class="space-y-4">
                         <div><label for="displayNameInput">Display Name</label><input type="text" id="displayNameInput" value="${currentDisplayName}" required placeholder="Your Name"></div>
                         <div><label for="photoURLInput">Photo URL</label><input type="url" id="photoURLInput" value="${photoUrlValue}" placeholder="https://example.com/image.png"><p class="form-help-text">Enter valid URL or leave blank.</p></div>
                          <div><button type="submit" class="btn-primary w-full mt-2">Save Profile Changes</button></div>
                     </div>
                 </form>
             </div>
             <div class="content-card">
                 <button onclick="window.signOutUserWrapper()" class="w-full btn-danger flex items-center justify-center">Log Out</button>
             </div>
        </div>`;
        // displayContent(fallbackHtml);
         const contentEl = document.getElementById('content');
        if(contentEl) {
             contentEl.innerHTML = fallbackHtml; // Directly insert the structure
             contentEl.classList.remove('hidden'); // Ensure it's visible
        }

        // Add listener logic here as well if needed for the fallback display
        const photoURLInputFallback = document.getElementById('photoURLInput');
        const previewImgFallback = document.getElementById('profile-pic-preview');
        if(photoURLInputFallback && previewImgFallback) {
             photoURLInputFallback.addEventListener('input', () => {
                  const urlValue = photoURLInputFallback.value.trim();
                  const isValidUrl = urlValue === '' || urlValue.startsWith('http://') || urlValue.startsWith('https://');
                  previewImgFallback.src = (isValidUrl && urlValue) ? urlValue : 'default-avatar.png';
                  photoURLInputFallback.classList.toggle('border-danger', urlValue !== '' && !isValidUrl);
             });
             previewImgFallback.onerror = () => { previewImgFallback.src='default-avatar.png'; };
             if (previewImgFallback.complete && previewImgFallback.naturalWidth === 0 && previewImgFallback.src !== 'default-avatar.png') previewImgFallback.onerror();
        }
         setActiveSidebarLink('showUserProfileDashboard'); // Set active link
    });
}

export async function updateUserProfile(event) {
    event.preventDefault();
    if (!currentUser || !auth || !db) { // Check auth and db again
        alert("Error: Cannot update profile. Not logged in or Firebase not ready.");
        return;
    }

    const displayNameInput = document.getElementById('displayNameInput');
    const photoURLInput = document.getElementById('photoURLInput');
    const newDisplayName = displayNameInput?.value.trim();
    let newPhotoURL = photoURLInput?.value.trim(); // Use let for potential modification

    // Validation
    if (!newDisplayName) {
        alert("Display Name cannot be empty.");
        displayNameInput?.focus();
        return;
    }
    // Validate Photo URL format if provided
    const isValidPhotoUrl = newPhotoURL === '' || newPhotoURL.startsWith('http://') || newPhotoURL.startsWith('https://');
    if (!isValidPhotoUrl) {
        alert("Photo URL is invalid. It must start with http:// or https://, or be left blank.");
        photoURLInput?.focus();
        photoURLInput?.classList.add('border-danger');
        return;
    } else {
         photoURLInput?.classList.remove('border-danger');
    }

     // Set to null if the input is empty, consistent with Firestore/Auth expectations
     if (newPhotoURL === '') {
        newPhotoURL = null; // Use null for empty URL to potentially remove it in Firebase
     }

    showLoading("Updating profile...");
    try {
        // 1. Update Firebase Auth profile
        if (!auth.currentUser) throw new Error("Auth state error: currentUser is null.");
        await auth.currentUser.updateProfile({
            displayName: newDisplayName,
            photoURL: newPhotoURL // Pass null if empty
        });
        console.log("Firebase Auth profile updated.");

        // 2. Update Firestore user document
        const userRef = db.collection('users').doc(currentUser.uid);
        await userRef.update({
            displayName: newDisplayName,
            photoURL: newPhotoURL // Store null if empty
        });
        console.log("Firestore profile document updated.");

        hideLoading();

        // 3. Refresh UI
        // Update the header immediately with potentially new info from Auth object
        // *** CORRECTION: Use fetchAndUpdateUserInfo ***
        await fetchAndUpdateUserInfo(auth.currentUser);
        // Reload the profile page to reflect changes (fetches from Firestore again)
        showUserProfileDashboard(); // Re-render the profile page

         // Show success feedback (Toast notification)
         const successMsgHtml = `<div class="toast-notification toast-success animate-fade-in">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="toast-icon"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.06 0l4.25-5.5Z" clip-rule="evenodd" /></svg>
             <p class="font-medium">Profile updated successfully!</p>
         </div>`;
         const msgContainer = document.createElement('div');
         msgContainer.innerHTML = successMsgHtml;
         document.body.appendChild(msgContainer);
         setTimeout(() => { msgContainer.remove(); }, 4000);

    } catch (error) {
        console.error("Error updating profile:", error);
        hideLoading();
         // Show error feedback (Toast notification)
         const errorMsgHtml = `<div class="toast-notification toast-error animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="toast-icon"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-1.75-4.5a.75.75 0 0 0 1.5 0V11a.75.75 0 0 0-1.5 0v2.5ZM10 6a.75.75 0 0 0 0 1.5h.008a.75.75 0 0 0 0-1.5H10Z" clip-rule="evenodd" /></svg>
              <p class="font-medium">Failed to update profile: ${error.message}. Please check image URL if provided.</p>
          </div>`;
         const msgContainer = document.createElement('div');
         msgContainer.innerHTML = errorMsgHtml;
         document.body.appendChild(msgContainer);
         setTimeout(() => { msgContainer.remove(); }, 6000); // Longer timeout for errors
    }
}