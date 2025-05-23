// --- START OF FILE ui_settings_panel.js ---
import { currentUser, userAiChatSettings, setUserAiChatSettings, db } from './state.js';
import { displayContent, setActiveSidebarLink, fetchAndUpdateUserInfo } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js';
import { saveUserExperimentalFeatureSettings, saveUserAiSettings as saveUserAiSettingsToFirestore,
         saveUserData as saveMainUserData } from './firebase_firestore.js';
import { DEFAULT_EXPERIMENTAL_FEATURES, AVAILABLE_AI_MODELS,
         DEFAULT_APP_BACKGROUND_IMAGE_URL, LOCALSTORAGE_KEY_BACKGROUND,
         LOCALSTORAGE_KEY_OPACITY, DEFAULT_CARD_OPACITY, PREDEFINED_BACKGROUNDS_PATH,
         PREDEFINED_BACKGROUND_IMAGES, APP_BACKGROUND_LAYER_ID, DEFAULT_PROFILE_PIC_URL,
         ADMIN_UID  } from './config.js'; // Import all needed configs
import { signOutUser, sendPasswordReset, changeUserPassword, changeUserEmail } from './firebase_auth.js';
import { handleProfilePictureSelect } from './ui_profile_picture.js';

let currentSettingsTab = 'profile';

// --- START: Migrated Background/Opacity Logic ---
// These functions now live inside ui_settings_panel.js
// They are exported so ui_background_management.js can use them for initial load.

export function applyBackground(elementIdOrElement, type, value) {
    const targetElement = typeof elementIdOrElement === 'string' ? document.getElementById(elementIdOrElement) : elementIdOrElement;
    const bodyElement = document.body;
    const mainContentElement = document.getElementById('main-content');

    if (!targetElement) {
        console.error('applyBackground: Target element not found!', elementIdOrElement);
        return;
    }

    targetElement.style.backgroundImage = '';
    targetElement.style.backgroundColor = '';
    targetElement.classList.remove('bg-gray-50', 'dark:bg-gray-900');

    bodyElement.classList.remove('bg-gray-50', 'dark:bg-gray-900');
    if (mainContentElement) mainContentElement.classList.remove('bg-gray-100', 'dark:bg-gray-950');
    
    bodyElement.style.backgroundColor = 'transparent';
    if (mainContentElement) mainContentElement.style.backgroundColor = 'transparent';


    if (type === 'color' && value) {
        targetElement.style.backgroundColor = value;
    } else if (type === 'image_url' && value) {
        targetElement.style.backgroundImage = `url('${value}')`;
        targetElement.style.backgroundSize = 'cover';
        targetElement.style.backgroundPosition = 'center';
        targetElement.style.backgroundRepeat = 'no-repeat';
    } else if (type === 'image_data' && value) {
        targetElement.style.backgroundImage = `url('${value}')`;
        targetElement.style.backgroundSize = 'cover';
        targetElement.style.backgroundPosition = 'center';
        targetElement.style.backgroundRepeat = 'no-repeat';
    } else if (type === 'default') {
        targetElement.style.backgroundImage = `url('${DEFAULT_APP_BACKGROUND_IMAGE_URL}')`;
        targetElement.style.backgroundSize = 'cover';
        targetElement.style.backgroundPosition = 'center';
        targetElement.style.backgroundRepeat = 'no-repeat';
        targetElement.classList.add('bg-gray-50', 'dark:bg-gray-900'); 
    } else {
        bodyElement.classList.add('bg-gray-50', 'dark:bg-gray-900');
        if (mainContentElement) mainContentElement.classList.add('bg-gray-100', 'dark:bg-gray-950');
    }
}

export function saveBackgroundPreference(type, value) {
    try {
        const preference = { type, value, timestamp: Date.now() };
        localStorage.setItem(LOCALSTORAGE_KEY_BACKGROUND, JSON.stringify(preference));
        console.log('Background preference saved:', preference);
    } catch (error) {
        console.error('Error saving background preference to localStorage:', error);
    }
}

export function applyCardOpacity(opacityValue) {
    const opacity = Math.max(0.1, Math.min(1, parseFloat(opacityValue))); 
    document.documentElement.style.setProperty('--card-bg-alpha', opacity);
    console.log('Card opacity CSS variable --card-bg-alpha set to:', opacity);
}

export function saveCardOpacityPreference(opacityValue) {
    try {
        localStorage.setItem(LOCALSTORAGE_KEY_OPACITY, opacityValue.toString());
        console.log('Card opacity preference saved:', opacityValue);
    } catch (error) {
        console.error('Error saving card opacity preference:', error);
    }
}
// --- END: Migrated Background/Opacity Logic ---


export function showSettingsPanel() {
    if (!currentUser) {
        window.showLoginUI?.();
        return;
    }
    setActiveSidebarLink('showSettingsPanel', 'sidebar-standard-nav');
    renderSettingsPanelShell();
    renderSettingsTabContent(currentSettingsTab);
    window.playUiSound?.('navigation');
}
// window.showSettingsPanel = showSettingsPanel; // ES Exported

function renderSettingsPanelShell() {
    const html = `
        <div class="max-w-4xl mx-auto animate-fade-in">
            <h2 class="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Settings</h2>
            <div class="flex border-b border-gray-200 dark:border-gray-700 mb-6" role="tablist">
                <button role="tab" aria-selected="${currentSettingsTab === 'profile'}" id="tab-profile-settings"
                        class="settings-tab-btn">Profile & Account</button>
                <button role="tab" aria-selected="${currentSettingsTab === 'backgrounds'}" id="tab-background-settings"
                        class="settings-tab-btn">Appearance</button>
                <button role="tab" aria-selected="${currentSettingsTab === 'experimental'}" id="tab-experimental-settings"
                        class="settings-tab-btn">Experimental Features</button>
            </div>
            <div id="settings-tab-content" class="content-card">
                <!-- Tab content will be rendered here -->
            </div>
        </div>
    `;
    displayContent(html);
    document.getElementById('tab-profile-settings')?.addEventListener('click', () => renderSettingsTabContent('profile'));
    document.getElementById('tab-background-settings')?.addEventListener('click', () => renderSettingsTabContent('backgrounds'));
    document.getElementById('tab-experimental-settings')?.addEventListener('click', () => renderSettingsTabContent('experimental'));
}

function renderSettingsTabContent(tabName) {
    currentSettingsTab = tabName;
    const contentArea = document.getElementById('settings-tab-content');
    if (!contentArea) {
        console.error("renderSettingsTabContent: Content area 'settings-tab-content' not found.");
        return;
    }

    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.setAttribute('aria-selected', btn.id === `tab-${tabName}-settings`);
        btn.classList.toggle('active-tab-btn', btn.id === `tab-${tabName}-settings`);
    });

    // Ensure the content area is cleared before rendering new tab content
    contentArea.innerHTML = ''; // Explicitly clear

    switch (tabName) {
        case 'profile':
            renderProfileSettingsTab(contentArea);
            break;
        case 'backgrounds':
            renderBackgroundSettingsTab(contentArea);
            break;
        case 'experimental':
            renderExperimentalFeaturesTab(contentArea);
            break;
        default:
            contentArea.innerHTML = `<p>Unknown settings tab: ${tabName}</p>`;
    }
    window.playUiSound?.('button_click');
}

function renderProfileSettingsTab(container) {
    if (!currentUser) { container.innerHTML = "<p class='text-red-500 p-4 text-center'>Error: User data not available. Please log in again.</p>"; console.error("renderProfileSettingsTab: currentUser is null or undefined."); return; }
    const photoURL = currentUser.photoURL || DEFAULT_PROFILE_PIC_URL;
    const displayName = currentUser.displayName || 'User';
    const username = currentUser.username || 'Not set';
    const email = currentUser.email || 'N/A';

    const html = `
        <h3 class="text-xl font-medium mb-4 text-gray-700 dark:text-gray-300">Profile & Account</h3>
        <div class="space-y-6">
            <div class="p-4 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50">
                <h4 class="text-md font-semibold mb-2">Display Name & Avatar</h4>
                <div class="flex items-center space-x-4 mb-3">
                    <div class="relative group">
                        <img id="settings-profile-pic-preview" src="${escapeHtml(photoURL)}" alt="Profile Picture" class="w-16 h-16 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 shadow-sm" onerror="this.onerror=null;this.src='${DEFAULT_PROFILE_PIC_URL}';">
                        <label for="settingsProfilePicInput" class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <input type="file" id="settingsProfilePicInput" accept="image/*" class="hidden">
                        </label>
                    </div>
                    <div>
                        <label for="settingsDisplayNameInput" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
                        <input type="text" id="settingsDisplayNameInput" value="${escapeHtml(displayName)}" class="form-control mt-1" required placeholder="Your Name">
                    </div>
                </div>
                 <button id="save-display-name-pic-btn" class="btn-primary-small">Save Name/Avatar</button>
            </div>
            <div class="p-4 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50">
                <h4 class="text-md font-semibold mb-3">Account Management</h4>
                 <div class="space-y-3">
                     <div>
                        <p class="text-sm font-medium">Username: <span class="font-normal text-gray-600 dark:text-gray-400">@${escapeHtml(username)}</span></p>
                        <button id="prompt-change-username-btn" class="btn-secondary-small text-xs mt-1">Change Username</button>
                     </div>
                     <div>
                        <p class="text-sm font-medium">Email: <span class="font-normal text-gray-600 dark:text-gray-400">${escapeHtml(email)}</span></p>
                        <button id="prompt-change-email-btn" class="btn-secondary-small text-xs mt-1">Change Email</button>
                     </div>
                     <button id="prompt-change-password-btn" class="btn-secondary-small text-sm">Change Password</button>
                 </div>
            </div>

            <div class="p-4 border border-red-300 dark:border-red-700 rounded-md bg-red-50 dark:bg-red-900/30">
                <h4 class="text-md font-semibold mb-3 text-red-700 dark:text-red-300">Danger Zone</h4>
                <div class="flex flex-col sm:flex-row gap-3">
                    <button id="sign-out-btn-settings" class="btn-warning flex-1">Log Out</button>
                    <button id="confirm-self-delete-btn-settings" class="btn-danger flex-1">Delete My Account</button>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;

    document.getElementById('save-display-name-pic-btn')?.addEventListener('click', handleSaveDisplayNameAndPic);
    document.getElementById('prompt-change-username-btn')?.addEventListener('click', promptChangeUsername);
    document.getElementById('prompt-change-email-btn')?.addEventListener('click', promptChangeEmail);
    document.getElementById('prompt-change-password-btn')?.addEventListener('click', promptChangePassword);
    document.getElementById('sign-out-btn-settings')?.addEventListener('click', signOutUserWrapper); // Assuming signOutUserWrapper is available
    document.getElementById('confirm-self-delete-btn-settings')?.addEventListener('click', confirmSelfDeleteAccountSettings);


    const fileInput = document.getElementById('settingsProfilePicInput');
    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            handleProfilePictureSelect(event, (imageDataUrlFromCropper) => {
                const previewImg = document.getElementById('settings-profile-pic-preview');
                if (previewImg) {
                    previewImg.src = imageDataUrlFromCropper; 
                    console.log("[ProfilePicSelect Callback in Settings] Preview updated with Data URL from cropper (length: " + imageDataUrlFromCropper.length + ")");
                }
            });
        });
    }
}

async function handleSaveDisplayNameAndPic() {
    if (!currentUser || !auth) {
        console.error("handleSaveDisplayNameAndPic: currentUser or auth is null.");
        alert("Error: Not logged in or authentication service unavailable. Cannot save profile.");
        return;
    }
    const newDisplayNameInput = document.getElementById('settingsDisplayNameInput');
    const newDisplayName = newDisplayNameInput?.value.trim();

    const newPhotoDataUrlFromPreview = document.getElementById('settings-profile-pic-preview')?.src;
    const originalPhotoUrl = currentUser.photoURL || DEFAULT_PROFILE_PIC_URL;

    // Photo changed if the preview src is different from original AND it's a data URL
    const photoChanged = newPhotoDataUrlFromPreview &&
                         newPhotoDataUrlFromPreview !== originalPhotoUrl &&
                         newPhotoDataUrlFromPreview.startsWith('data:image/');

    console.log("[SaveProfile] Attempting to save. Display Name:", newDisplayName);
    console.log("[SaveProfile] newPhotoDataUrlFromPreview (first 60 chars):", newPhotoDataUrlFromPreview ? newPhotoDataUrlFromPreview.substring(0, 60) + "..." : "null");
    console.log("[SaveProfile] originalPhotoUrl (first 60 chars):", originalPhotoUrl ? originalPhotoUrl.substring(0, 60) + "..." : "null");
    console.log("[SaveProfile] photoChanged flag:", photoChanged);

    if ((!newDisplayName || newDisplayName === currentUser.displayName) && !photoChanged) {
        alert("No changes to save.");
        return;
    }
    if (newDisplayName && newDisplayName.length === 0) {
        alert("Display name cannot be empty.");
        if(newDisplayNameInput) newDisplayNameInput.focus();
        return;
    }

    showLoading("Saving profile...");
    try {
        const updatesForFirestore = {};
        const updatesForAuth = {}; // This object will be passed to user.updateProfile()

        if (newDisplayName && newDisplayName !== currentUser.displayName) {
            updatesForFirestore.displayName = newDisplayName;
            updatesForAuth.displayName = newDisplayName;
        }

        if (photoChanged) {
            console.log("[SaveProfile] Photo changed. Data URL length being processed:", newPhotoDataUrlFromPreview.length);
            
            // Your client-side check (you might have adjusted this limit during testing)
            if (newPhotoDataUrlFromPreview.length > 10000000) { // Example: 10MB string limit for client
                throw new Error("Image Data URL string is too long (client-side check > 10MB).");
            }
            // Check if it's a JPEG or PNG Data URL, as these are most common
            if (!newPhotoDataUrlFromPreview.startsWith('data:image/jpeg;base64,') && !newPhotoDataUrlFromPreview.startsWith('data:image/png;base64,')) {
                console.warn("[SaveProfile] Photo data URL is not a standard JPEG or PNG. This might cause issues with Firebase Auth. URL start:", newPhotoDataUrlFromPreview.substring(0,30));
            }

            updatesForFirestore.photoURL = newPhotoDataUrlFromPreview;
            updatesForAuth.photoURL = newPhotoDataUrlFromPreview;
        }

        // --- Critical Debugging Log ---
        console.log("[SaveProfile] Object being constructed for firebase.auth().currentUser.updateProfile():", JSON.stringify(updatesForAuth, (key, value) => {
            if (key === 'photoURL' && typeof value === 'string' && value.startsWith('data:')) {
                return `DATA_URL_length_${value.length}_start_${value.substring(0,60)}...`;
            }
            return value;
        }));
        // --- End Critical Debugging Log ---

        if (Object.keys(updatesForAuth).length > 0) {
            const user = auth.currentUser; 
            if (user) {
                let finalAuthUpdates = { ...updatesForAuth }; // Copy to potentially modify for testing

                // --- Hardcoded Minimal Data URL Test (UNCOMMENT TO USE FOR DIAGNOSIS) ---
                
                if (finalAuthUpdates.photoURL) { // Only if we were trying to update photo
                    const MINIMAL_VALID_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; // 1x1 red PNG
                    console.warn("[SaveProfile] !!! TESTING WITH HARDCODED MINIMAL DATA URL !!! Length:", MINIMAL_VALID_DATA_URL.length);
                    finalAuthUpdates.photoURL = MINIMAL_VALID_DATA_URL;
                }
                
                // --- End Hardcoded Test ---

                console.log("[SaveProfile] FINAL Object being sent to Auth:", finalAuthUpdates.photoURL ? {...finalAuthUpdates, photoURL: `DATA_URL_length_${finalAuthUpdates.photoURL.length}_start_${finalAuthUpdates.photoURL.substring(0,60)}...`} : finalAuthUpdates);
                 await user.updateProfile(finalAuthUpdates); // THE CALL THAT FAILS
                 console.log("Firebase Auth profile updated successfully.");
            } else {
                throw new Error("Not authenticated. Cannot update Auth profile.");
            }
        }
        
        if (Object.keys(updatesForFirestore).length > 0) {
            console.log("[SaveProfile] Updating Firestore user document with (photoURL truncated for log):", updatesForFirestore.photoURL ? {...updatesForFirestore, photoURL: updatesForFirestore.photoURL.substring(0,60) + "..."} : updatesForFirestore);
            await db.collection('users').doc(currentUser.uid).update(updatesForFirestore);
            console.log("Firestore user document updated successfully.");
        }

        await fetchAndUpdateUserInfo(auth.currentUser); 

        alert("Profile updated successfully!");
        window.playUiSound?.('save_success');

    } catch (error) {
        console.error("Error updating display name/avatar:", error); // This will log the FirebaseError
        alert(`Failed to update profile: ${error.message}`);
        if (photoChanged && document.getElementById('settings-profile-pic-preview')) {
            document.getElementById('settings-profile-pic-preview').src = originalPhotoUrl;
        }
    } finally {
        hideLoading();
    }
};

function promptChangeUsername() {
    if (!currentUser) return;
    const currentUsername = currentUser.username || '';
    const newUsername = prompt(`Enter new username (current: @${currentUsername}).\n3-20 letters, numbers, or underscores:`, currentUsername);
    if (newUsername === null) return;
    const trimmedUsername = newUsername.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) { alert("Invalid username format."); return; }
    if (trimmedUsername.toLowerCase() === currentUsername.toLowerCase()) { alert("New username is the same."); return; }
    handleChangeUsername(trimmedUsername, currentUsername);
};

// This is an internal helper, does not need to be on window or exported if only called by promptChangeUsername
async function handleChangeUsername(newUsername, oldUsername) {
    showLoading("Changing username...");
    try {
        if (currentUser.uid === ADMIN_UID || confirm("Changing username is an advanced operation. Are you sure?")) {
            await db.runTransaction(async (transaction) => {
                const userRef = db.collection('users').doc(currentUser.uid);
                const newUsernameLower = newUsername.toLowerCase();
                const oldUsernameLower = oldUsername ? oldUsername.toLowerCase() : null;
                const newUsernameRef = db.collection('usernames').doc(newUsernameLower);
                const newUsernameDoc = await transaction.get(newUsernameRef);
                if (newUsernameDoc.exists && newUsernameDoc.data().userId !== currentUser.uid) throw new Error(`Username "${newUsername}" is taken.`);
                transaction.update(userRef, { username: newUsernameLower }); // Store lowercase for consistency
                if (oldUsernameLower) { const oldUsernameRef = db.collection('usernames').doc(oldUsernameLower); transaction.delete(oldUsernameRef); }
                transaction.set(newUsernameRef, { userId: currentUser.uid, username: newUsername }); // Store with original case
            });
            await fetchAndUpdateUserInfo(firebase.auth().currentUser);
            alert("Username changed successfully!");
            renderSettingsTabContent('profile');
            window.playUiSound?.('save_success');
        }
    } catch (error) { console.error("Error changing username:", error); alert(`Failed: ${error.message}`); }
    finally { hideLoading(); }
}

async function promptChangeEmail() {
    if (!currentUser) return;
    const currentPassword = prompt("For security, please re-enter your current password to change your email:");
    if (currentPassword === null) return; // User cancelled
    if (!currentPassword) { alert("Password is required."); return; }

    const newEmail = prompt("Enter your new email address:");
    if (newEmail === null) return; // User cancelled
    if (!newEmail || !newEmail.includes('@')) { alert("Invalid new email address."); return; }

    showLoading("Updating email...");
    try {
        await changeUserEmail(newEmail, currentPassword); // From firebase_auth.js
        // MODIFIED Alert Message:
        alert("Email update process initiated!\n\nA verification link has been sent to your NEW email address (" + newEmail + "). Please click the link in that email to confirm the change.\n\nYour email in this app will update after successful verification. You may need to log out and log back in with your new email address once verified.");
        
        // Don't immediately fetchAndUpdateUserInfo, as user.email won't change until verification.
        // Just re-render the profile tab which will show the old email until then.
        renderSettingsTabContent('profile'); 
        window.playUiSound?.('save_success');
    } catch (error) {
        console.error("Error changing email:", error);
        alert(`Failed to initiate email change: ${error.message}`);
        window.playUiSound?.('error');
    } finally {
        hideLoading();
    }
};

async function promptChangePassword() {
    if (!currentUser) return;
    const currentPassword = prompt("Enter CURRENT password:");
    if (currentPassword === null) return; if (!currentPassword) { alert("Current password required."); return; }
    const newPassword = prompt("Enter NEW password (min. 6 characters):");
    if (newPassword === null) return; if (!newPassword || newPassword.length < 6) { alert("New password too short."); return; }
    const confirmNewPassword = prompt("Confirm NEW password:");
    if (confirmNewPassword === null) return; if (newPassword !== confirmNewPassword) { alert("Passwords do not match."); return; }
    showLoading("Changing password...");
    try {
        await changeUserPassword(currentPassword, newPassword);
        alert("Password changed successfully!");
        window.playUiSound?.('save_success');
    } catch (error) { console.error("Error changing password:", error); alert(`Failed: ${error.message}`); }
    finally { hideLoading(); }
};

function confirmSelfDeleteAccountSettings() {
    window.confirmSelfDeleteAccount(); // This needs to be available on window or imported if script.js defines it
};

function renderBackgroundSettingsTab(container) {
    let predefinedImagesHtml = PREDEFINED_BACKGROUND_IMAGES.map(img => `
        <button data-filename="${escapeHtml(img.filename)}" class="settings-predefined-bg-btn aspect-video rounded-md border-2 border-transparent hover:border-primary-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-300 transition-all outline-none" title="Apply ${escapeHtml(img.name)}">
            <img src="${PREDEFINED_BACKGROUNDS_PATH}${escapeHtml(img.filename)}" alt="${escapeHtml(img.name)}" class="w-full h-full object-cover rounded">
        </button>
    `).join('');

    const currentBgPref = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY_BACKGROUND) || '{}');
    let currentPreviewStyle = `background-image: url('${DEFAULT_APP_BACKGROUND_IMAGE_URL}'); background-size: cover; background-position: center;`;
    let currentPreviewText = '';
    let previewBaseClasses = 'w-full h-32 sm:h-40 md:h-48 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700';

    if (currentBgPref.type === 'color' && currentBgPref.value) {
        currentPreviewStyle = `background-color: ${escapeHtml(currentBgPref.value)};`;
        currentPreviewText = `Color: ${escapeHtml(currentBgPref.value)}`;
        previewBaseClasses = previewBaseClasses.replace(' bg-gray-100 dark:bg-gray-700', '');
    } else if ((currentBgPref.type === 'image_url' || currentBgPref.type === 'image_data') && currentBgPref.value) {
        currentPreviewStyle = `background-image: url('${escapeHtml(currentBgPref.value)}'); background-size: cover; background-position: center;`;
        previewBaseClasses = previewBaseClasses.replace(' bg-gray-100 dark:bg-gray-700', '');
    }

    const currentOpacity = parseFloat(localStorage.getItem(LOCALSTORAGE_KEY_OPACITY) || DEFAULT_CARD_OPACITY.toString());

    const html = `
        <h3 class="text-xl font-medium mb-4 text-gray-700 dark:text-gray-300">Appearance Settings</h3>
        <div class="mb-6"><h4 class="text-md font-medium mb-2 text-gray-700 dark:text-gray-300">Current Background Preview</h4>
            <div id="background-image-preview" class="${previewBaseClasses}" style="${currentPreviewStyle}">${currentPreviewText}</div></div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div><h4 class="text-md font-medium mb-2">Upload Custom Image</h4><label for="background-image-upload" class="block text-sm font-medium mb-1">Choose (Max 3MB):</label><input type="file" id="background-image-upload" accept="image/*" class="form-control text-sm"><p class="form-help-text">Image will cover background.</p></div>
            <div><h4 class="text-md font-medium mb-2">Select Solid Color</h4><label for="background-color-picker" class="block text-sm font-medium mb-1">Choose color:</label><input type="color" id="background-color-picker" value="${(currentBgPref.type === 'color' && currentBgPref.value) ? escapeHtml(currentBgPref.value) : '#f0f9ff'}" class="w-full h-10 p-0 border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"></div>
        </div>
        <div class="mb-6 pt-4 border-t dark:border-gray-600"><h4 class="text-md font-medium mb-2">Card Opacity</h4><label for="card-opacity-slider" class="block text-sm font-medium mb-1">Transparency:</label><div class="flex items-center space-x-3"><input type="range" id="card-opacity-slider" min="0.1" max="1" step="0.01" value="${currentOpacity}" class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"><span id="card-opacity-value" class="text-sm w-12 text-right">${Math.round(currentOpacity * 100)}%</span></div></div>
        ${PREDEFINED_BACKGROUND_IMAGES.length > 0 ? `<div class="mt-6"><h4 class="text-md font-medium mb-2">Predefined Backgrounds</h4><div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">${predefinedImagesHtml}</div></div>` : ''}
        <div class="mt-8 pt-6 border-t dark:border-gray-600"><button id="reset-background-btn" class="btn-danger w-full sm:w-auto">Reset Appearance</button></div>`;
    container.innerHTML = html;

    document.getElementById('background-image-upload')?.addEventListener('change', window.settingsPanelHandleBackgroundImageUpload);
    document.getElementById('background-color-picker')?.addEventListener('input', window.settingsPanelHandleBackgroundColorChange);
    document.getElementById('background-color-picker')?.addEventListener('change', window.settingsPanelHandleBackgroundColorChange);
    document.getElementById('card-opacity-slider')?.addEventListener('input', window.settingsPanelHandleCardOpacityChange);
    document.getElementById('card-opacity-slider')?.addEventListener('change', window.settingsPanelHandleCardOpacityChange);
    document.getElementById('reset-background-btn')?.addEventListener('click', window.settingsPanelResetToDefaultAppearance);

    const previewDiv = document.getElementById('background-image-preview');
    if (previewDiv && previewDiv.style.backgroundImage && previewDiv.style.backgroundImage !== 'none') {
        const imgUrlMatch = previewDiv.style.backgroundImage.match(/url\("?(.+?)"?\)/);
        if (imgUrlMatch && imgUrlMatch[1]) { const img = new Image(); img.src = imgUrlMatch[1]; img.onerror = () => { if (previewDiv.style.backgroundImage.includes(imgUrlMatch[1])) { previewDiv.style.backgroundImage = 'none'; previewDiv.textContent = 'Image failed to load.'; if (!previewDiv.classList.contains('bg-gray-100')) previewDiv.classList.add('bg-gray-100', 'dark:bg-gray-700'); } };}
    } else if (previewDiv && !currentBgPref.type && !currentBgPref.value ) { const img = new Image(); img.src = DEFAULT_APP_BACKGROUND_IMAGE_URL; img.onerror = () => { previewDiv.style.backgroundImage = 'none'; previewDiv.textContent = 'Default (Theme Fallback)'; }}
}

function renderExperimentalFeaturesTab(container) {
    if (!currentUser || !currentUser.userSettings) { container.innerHTML = "<p>Error loading user settings.</p>"; return; }
    const features = currentUser.userSettings.experimentalFeatures || { ...DEFAULT_EXPERIMENTAL_FEATURES };
    const featureToggles = [
        { key: 'globalChat', label: 'Global Chat Feature', description: 'Enable global chat to interact with others.' },
        { key: 'marketplace', label: 'Marketplace (Coming Soon)', description: 'Access marketplace (under development).' },
        { key: 'musicAndSounds', label: 'Music & Sounds Player', description: 'Enable background music, ambient sounds, and UI effects.' },
    ];
    const html = `
        <h3 class="text-xl font-medium mb-4 text-gray-700 dark:text-gray-300">Experimental Features</h3>
        <p class="text-sm text-muted mb-6">Toggle features. Changes apply after saving & may need refresh for sidebar.</p>
        <div class="space-y-4">
            ${featureToggles.map(f => `
                <div class="flex items-center justify-between p-3 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700/50">
                    <div><label for="toggle-${f.key}" class="font-medium text-gray-800 dark:text-gray-200">${f.label}</label><p class="text-xs text-gray-500 dark:text-gray-400">${f.description}</p></div>
                    <label class="switch"><input type="checkbox" id="toggle-${f.key}" ${features[f.key] ? 'checked' : ''}><span class="slider round"></span></label>
                </div>`).join('')}
        </div>
        <button id="save-experimental-features-btn" class="btn-primary mt-6">Save Feature Settings</button>`;
    container.innerHTML = html;
    document.getElementById('save-experimental-features-btn')?.addEventListener('click', saveExperimentalFeatures);
}

function settingsPanelApplyPredefinedBackground(filename) {
    const imageUrl = `${PREDEFINED_BACKGROUNDS_PATH}${filename}`;
    applyBackground(document.getElementById(APP_BACKGROUND_LAYER_ID), 'image_url', imageUrl);
    saveBackgroundPreference('image_url', imageUrl);
    const preview = document.getElementById('background-image-preview');
    if (preview) { preview.style.backgroundImage = `url('${imageUrl}')`; preview.style.backgroundColor = ''; preview.textContent = ''; }
    window.playUiSound?.('toggle_on');
};
function settingsPanelHandleBackgroundImageUpload(event) {
    const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) { alert('Select image file.'); return; } if (file.size > 3*1024*1024) { alert(`Max 3MB.`); return; }
    const reader = new FileReader();
    reader.onload = (e) => { const imageDataUrl = e.target?.result; if (imageDataUrl) { applyBackground(document.getElementById(APP_BACKGROUND_LAYER_ID),'image_data', imageDataUrl); saveBackgroundPreference('image_data', imageDataUrl); const preview = document.getElementById('background-image-preview'); if (preview) { preview.style.backgroundImage = `url('${imageDataUrl}')`; preview.style.backgroundColor = ''; preview.textContent = ''; } window.playUiSound?.('toggle_on'); } else alert('Failed to read image.'); };
    reader.onerror = () => { alert('Error reading image.'); }; reader.readAsDataURL(file);
};
function settingsPanelHandleBackgroundColorChange(event) {
    const color = event.target.value; applyBackground(document.getElementById(APP_BACKGROUND_LAYER_ID),'color', color); saveBackgroundPreference('color', color);
    const preview = document.getElementById('background-image-preview'); if (preview) { preview.style.backgroundImage = 'none'; preview.style.backgroundColor = color; preview.textContent = `Color: ${color}`; }
    window.playUiSound?.('toggle_on');
};
function settingsPanelResetToDefaultAppearance() {
    applyBackground(document.getElementById(APP_BACKGROUND_LAYER_ID),'default'); saveBackgroundPreference('default');
    const preview = document.getElementById('background-image-preview');
    if (preview) { preview.style.backgroundImage = `url('${DEFAULT_APP_BACKGROUND_IMAGE_URL}')`; preview.style.backgroundSize = 'cover'; preview.style.backgroundPosition = 'center'; preview.style.backgroundColor = ''; preview.textContent = ''; preview.className = 'w-full h-32 sm:h-40 md:h-48 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700'; const img = new Image(); img.src = DEFAULT_APP_BACKGROUND_IMAGE_URL; img.onerror = () => { if(preview === document.getElementById('background-image-preview')) {preview.style.backgroundImage = 'none'; preview.textContent = 'Default (Theme Fallback)';}}; }
    applyCardOpacity(DEFAULT_CARD_OPACITY); saveCardOpacityPreference(DEFAULT_CARD_OPACITY);
    const slider = document.getElementById('card-opacity-slider'); const displaySpan = document.getElementById('card-opacity-value');
    if (slider) slider.value = DEFAULT_CARD_OPACITY; if (displaySpan) displaySpan.textContent = `${Math.round(DEFAULT_CARD_OPACITY * 100)}%`;
    window.playUiSound?.('button_click');
};
function settingsPanelHandleCardOpacityChange(event) {
    const opacityValue = parseFloat(event.target.value); applyCardOpacity(opacityValue); saveCardOpacityPreference(opacityValue);
    const displaySpan = document.getElementById('card-opacity-value'); if (displaySpan) displaySpan.textContent = `${Math.round(opacityValue * 100)}%`;
};

async function saveExperimentalFeatures() {
    if (!currentUser) return;
    const newSettings = {
        globalChat: document.getElementById('toggle-globalChat')?.checked || false,
        marketplace: document.getElementById('toggle-marketplace')?.checked || false,
        musicAndSounds: document.getElementById('toggle-musicAndSounds')?.checked || false,
    };
    showLoading("Saving feature settings...");
    const success = await saveUserExperimentalFeatureSettings(currentUser.uid, newSettings);
    hideLoading();
    if (success) {
        currentUser.userSettings.experimentalFeatures = { ...currentUser.userSettings.experimentalFeatures, ...newSettings };
        alert("Feature settings saved! Refresh page for sidebar changes.");
        window.updateExperimentalFeaturesSidebarVisibility();
        window.playUiSound?.('save_success');
    } else { alert("Failed to save settings."); window.playUiSound?.('error'); }
};

// --- END OF FILE ui_settings_panel.js ---