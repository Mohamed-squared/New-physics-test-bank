// firebase_auth.js
import { auth, db, setCurrentUser, clearUserSession, userCourseProgressMap } from './state.js';
import { showLoading, hideLoading } from './utils.js';
import { initializeUserData, loadUserData, loadGlobalCourseDefinitions, sendWelcomeGuideMessage } from './firebase_firestore.js';
import { showLoginUI, hideLoginUI, fetchAndUpdateUserInfo, clearUserInfoUI, setActiveSidebarLink, displayContent } from './ui_core.js';
import { updateAdminPanelVisibility } from './script.js';
import { showHomeDashboard } from './ui_home_dashboard.js';

// --- Authentication Functions ---

export async function signUpUser(username, email, password) {
    if (!auth || !db) { console.error("Firebase not initialized"); return; }
    if (!email || !password || !username) {
        alert("Please provide username, email, and password.");
        return;
    }
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
        alert("Invalid username format. Use 3-20 letters, numbers, or underscores.");
        return;
    }

    const usernameLower = username.toLowerCase();
    showLoading("Checking username & Creating account...");

    try {
        const usernameRef = db.collection('usernames').doc(usernameLower);
        const usernameDoc = await usernameRef.get();

        if (usernameDoc.exists) {
            hideLoading();
            alert(`Username "${username}" is already taken. Please choose another.`);
            return;
        }

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log('[signUpUser] Firebase user created:', user.uid);
        await initializeUserData(user.uid, user.email, username, user.displayName, user.photoURL, false, user);
        console.log("[signUpUser] initializeUserData completed for " + user.uid);

        if (user && user.uid) {
            console.log("New user signed up. Sending welcome guide message.");
            sendWelcomeGuideMessage(user.uid).catch(err => {
                console.error("Error sending welcome guide message on signup:", err);
            });
        }
    } catch (error) {
        console.error("Sign up error:", error);
        if (error.code === 'auth/email-already-in-use') {
            alert("Sign up failed: The email address is already in use by another account.");
        } else if (error.code === 'auth/weak-password') {
            alert("Sign up failed: Password is too weak.");
        } else if (error.message && error.message.includes("A valid Firebase Auth user object is required")) {
            alert("Sign up process failed: There was an issue setting up your user profile. Please try again or contact support if the problem persists.");
        }
         else {
            alert("Sign up failed: " + error.message + (error.code ? ` (Code: ${error.code})` : ''));
        }
        hideLoading();
    }
}
export async function signInUser(identifier, password) {
    if (!auth || !db) { console.error("Firebase not initialized"); return; }
    if (!identifier || !password) {
        alert("Please provide both your email/username and password.");
        return;
    }
    showLoading("Signing in...");
    const identifierLower = identifier.toLowerCase();

    try {
        if (identifier.includes('@')) {
            console.log("Attempting sign in with Email:", identifier);
            await auth.signInWithEmailAndPassword(identifier, password);
        } else {
            console.log("Attempting sign in with Username:", identifier);
            const usernameRef = db.collection('usernames').doc(identifierLower);
            const usernameDoc = await usernameRef.get();

            if (!usernameDoc.exists) {
                hideLoading();
                alert("Login failed: Username not found.");
                return;
            }
            const userId = usernameDoc.data().userId;
            if (!userId) {
                hideLoading();
                alert("Login failed: User record incomplete (missing ID).");
                return;
            }
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (!userDoc.exists || !userDoc.data().email) {
                hideLoading();
                alert("Login failed: User record incomplete (missing email).");
                return;
            }
            const email = userDoc.data().email;
            console.log(`Found email (${email}) for username ${identifier}. Signing in...`);
            await auth.signInWithEmailAndPassword(email, password);
        }
    } catch (error) {
        console.error("Sign in error:", error);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
             alert("Login failed: Incorrect email/username or password.");
        } else if (error.code === 'auth/user-disabled') {
             alert("Login failed: This user account has been disabled.");
        } else {
             alert("Login failed: " + error.message);
        }
        hideLoading();
    }
}

export function signInWithGoogle() {
    if (!auth || !db) { console.error("Firebase not initialized"); return; }
    showLoading("Redirecting to Google Sign-in...");
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(async (result) => {
            showLoading("Processing Google Sign-in...");
            const user = result.user;
            const isNewUser = result.additionalUserInfo?.isNewUser || false;
            console.log('Google sign in success:', user, 'Is new user:', isNewUser);

            const potentialUsernameBase = (user.email?.split('@')[0] || `user_${user.uid.substring(0,6)}`).replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20);
            let finalUsername = potentialUsernameBase;
            let checkCounter = 0;
            const MAX_CHECKS = 5;

            if (!db) throw new Error("Firestore DB not available for username check.");

            while (checkCounter <= MAX_CHECKS) {
                 try {
                     const usernameToCheck = (checkCounter === 0) ? finalUsername : `${potentialUsernameBase}${checkCounter}`;
                     const usernameRef = db.collection('usernames').doc(usernameToCheck.toLowerCase());
                     const usernameDoc = await usernameRef.get();
                     if (!usernameDoc.exists) {
                         finalUsername = usernameToCheck;
                         break;
                     }
                 } catch (dbError) {
                     console.error("Error checking username during Google Sign-In:", dbError);
                     finalUsername = potentialUsernameBase;
                     break;
                 }
                 checkCounter++;
                 if (checkCounter > MAX_CHECKS) {
                    finalUsername = `${potentialUsernameBase}_${Date.now().toString().slice(-4)}`;
                    console.warn(`Could not find a unique username for Google Sign-In user within ${MAX_CHECKS} attempts. Using time-suffixed fallback: ${finalUsername}`);
                    break;
                 }
                 console.log(`Potential Google username taken, trying variation...`);
            }
            console.log(`[signInWithGoogle] Final username determined: ${finalUsername}`);

            await initializeUserData(user.uid, user.email, finalUsername, user.displayName, user.photoURL, false, user);
            console.log("[signInWithGoogle] initializeUserData completed for " + user.uid);
            
            if (isNewUser && user && user.uid) {
                console.log("New Google user signed up. Sending welcome guide message.");
                sendWelcomeGuideMessage(user.uid).catch(err => {
                    console.error("Error sending welcome guide message on Google signup:", err);
                });
            }
        })
        .catch((error) => {
            console.error("Google sign in error:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                 console.log("Google Sign-in popup closed by user.");
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                 alert("An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.");
            } else {
                 alert("Google sign in / setup failed: " + error.message);
            }
            hideLoading();
        });
}

export function signOutUser() {
     if (!auth) { console.error("Firebase not initialized"); return; }
    showLoading("Signing out...");
    auth.signOut().then(() => {
        console.log('Sign out successful');
        window.playUiSound?.('button_click'); // Play sound on successful sign out
    }).catch((error) => {
        console.error("Sign out error:", error);
        alert("Sign out failed: " + error.message);
        hideLoading();
        window.playUiSound?.('error');
    });
}

export async function sendPasswordReset(email) {
    if (!auth) {
        console.error("Firebase Auth not initialized. Cannot send password reset.");
        alert("Error: Could not initiate password reset. Please try again later.");
        return;
    }
    if (!email || !email.includes('@')) {
        alert("Please enter a valid email address.");
        return;
    }

    showLoading("Sending password reset email...");
    try {
        await auth.sendPasswordResetEmail(email);
        hideLoading();
        alert(`Password reset email sent to ${email}. Please check your inbox (and spam folder). Follow the instructions in the email to reset your password.`);
        console.log("Password reset email sent successfully to:", email);
        window.playUiSound?.('save_success');
    } catch (error) {
        hideLoading();
        console.error("Error sending password reset email:", error);
        let message = "Failed to send password reset email. " + error.message;
        if (error.code === 'auth/user-not-found') {
            message = "Failed to send password reset email: No account found with that email address.";
        } else if (error.code === 'auth/invalid-email') {
            message = "Failed to send password reset email: The email address provided is not valid.";
        }
        alert(message);
        window.playUiSound?.('error');
    }
}

// --- NEW: Change User Email ---
export async function changeUserEmail(newEmail, currentPassword) {
    if (!auth || !auth.currentUser) {
        throw new Error("User not authenticated or Auth service unavailable.");
    }
    const user = auth.currentUser;

    // 1. Re-authenticate the user
    console.log("[ChangeEmail] Re-authenticating user...");
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    try {
        await user.reauthenticateWithCredential(credential);
        console.log("[ChangeEmail] Re-authentication successful.");
    } catch (reauthError) {
        console.error("[ChangeEmail] Re-authentication failed:", reauthError);
        if (reauthError.code === 'auth/wrong-password') {
            throw new Error("Incorrect current password. Email not changed.");
        }
        throw new Error(`Re-authentication failed: ${reauthError.message}`);
    }

    // 2. Attempt to update the email in Firebase Auth
    console.log(`[ChangeEmail] Attempting to update email in Firebase Auth to: ${newEmail}`);
    try {
        await user.updateEmail(newEmail);
        console.log("[ChangeEmail] Firebase Auth updateEmail call successful. Verification likely sent to new email.");
        // Firebase Auth typically handles sending its own verification email when updateEmail is called
        // and the project is configured to require email verification.
        // Explicitly calling sendEmailVerification might be redundant or for specific scenarios.
        // Let's keep it for now to be sure, but test without it if issues persist.
        // await user.sendEmailVerification(); // This sends to the *new* email
        // console.log("[ChangeEmail] Verification email explicitly requested for new email.");

    } catch (updateEmailError) {
        console.error("[ChangeEmail] Firebase Auth updateEmail call FAILED:", updateEmailError);
        // The error "auth/operation-not-allowed" with "Please verify the new email"
        // usually means the process has started but needs the new email to be clicked.
        // However, if updateEmail *itself* throws this, it's an immediate block.
        if (updateEmailError.code === 'auth/email-already-in-use') {
            throw new Error("The new email address is already in use by another account.");
        } else if (updateEmailError.code === 'auth/requires-recent-login') {
             throw new Error("This operation is sensitive and requires a recent login. Please sign out and sign back in.");
        } else if (updateEmailError.code === 'auth/operation-not-allowed' && updateEmailError.message.includes('verify the new email')) {
            // This implies the user *must* click the link sent to the new email.
            // The updateEmail call might have succeeded in *initiating* the change.
            console.warn("[ChangeEmail] Firebase Auth requires verification of the new email. The updateEmail call might have initiated this.");
            // We will still try to update Firestore, but the Auth email won't change until verification.
        } else {
            throw new Error(`Failed to update email in Firebase Auth: ${updateEmailError.message}`);
        }
    }

    // 3. Update email in Firestore (if you store it there and want to reflect the *intended* new email)
    //    Be aware that the user.email in Auth might not update until verification.
    if (db) {
        try {
            console.log(`[ChangeEmail] Attempting to update email in Firestore users/${user.uid} to: ${newEmail}`);
            await db.collection('users').doc(user.uid).update({ email: newEmail });
            console.log("[ChangeEmail] User email updated in Firestore to reflect the new intended email.");
        } catch (firestoreError) {
            console.error("[ChangeEmail] Error updating email in Firestore, but Auth email change process may have been initiated:", firestoreError);
            // This is not necessarily a critical failure if the Auth email change is pending verification.
            // throw new Error(`Failed to update email in database: ${firestoreError.message}`); // Optional: re-throw if this is critical
        }
    }
    // The user will need to check their NEW email inbox and click the verification link.
    // After they do, their Firebase Auth email will be updated.
    // You might want to log them out and ask them to log back in with the new email AFTER they've verified it.
}

// --- NEW: Change User Password ---
export async function changeUserPassword(currentPassword, newPassword) {
    if (!auth || !auth.currentUser) {
        throw new Error("User not authenticated or Auth service unavailable.");
    }
    const user = auth.currentUser;
    // Re-authenticate
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    await user.reauthenticateWithCredential(credential);
    // Update password
    await user.updatePassword(newPassword);
}


export function setupAuthListener() {
    if (!auth) {
        console.error("Cannot set up auth listener: Firebase auth not initialized.");
        return;
    }
    console.log("Setting up Firebase Auth listener...");
    auth.onAuthStateChanged(async userAuthObj => {
        console.log("Auth state changed. User:", userAuthObj ? userAuthObj.uid : 'None');
        
        if (userAuthObj) {
            console.log("User signed in: ", userAuthObj.uid);
            showLoading("Loading user data..."); 

            document.getElementById('public-homepage-container')?.classList.add('hidden');
            document.querySelector('.app-layout')?.classList.remove('hidden');

            await fetchAndUpdateUserInfo(userAuthObj); 
            
            updateAdminPanelVisibility(); 

            console.log("Loading global course definitions...");
            await loadGlobalCourseDefinitions(); 

            console.log("Calling loadUserData (includes course progress)...");
            try {
                await loadUserData(userAuthObj.uid, userAuthObj); 
                console.log("loadUserData (including onboarding check) finished.");
                // --- MODIFIED: Update sidebar visibility based on experimental features ---
                window.updateExperimentalFeaturesSidebarVisibility?.(); // Ensure this is called
                // --- END MODIFIED ---

                if (!document.getElementById('onboarding-container')) {
                    hideLoginUI(); 
                    showHomeDashboard();
                }
                if (!document.getElementById('onboarding-container')) {
                    hideLoading();
                }

            } catch (loadError) {
                console.error("Error during loadUserData call:", loadError);
                let alertMessage = `Critical error loading user data: ${loadError.message}. Please try signing out and back in.`;
                if (loadError.message && (loadError.message.toLowerCase().includes('permission') || loadError.message.toLowerCase().includes('missing or insufficient permissions'))) {
                    alertMessage = "Critical error loading user data: Permission denied. This often indicates a Firestore Security Rules issue. Please check the rules or contact support, then try signing out and back in.";
                } else if (loadError.message.includes("Authentication context is missing")) {
                    alertMessage = "Critical error during user setup: Authentication session became invalid. Please try signing in again.";
                } else if (loadError.message.includes("A valid email is required to initialize user data")) {
                    alertMessage = "Sign up process failed: There was an issue with your email during setup. Please try again or contact support.";
                }
                alert(alertMessage);
                hideLoading();
                signOutUser(); 
            }
        } else { 
            console.log("User signed out. Showing public homepage.");
            const previousUser = window.currentUser; 
            if (previousUser && !userAuthObj) { 
                 console.log("Account deletion processed or user signed out. Showing login UI.");
            }
            setCurrentUser(null); 
            updateAdminPanelVisibility(); 
            clearUserSession();       
            clearUserInfoUI();      
            
            document.getElementById('public-homepage-container')?.classList.remove('hidden');
            document.querySelector('.app-layout')?.classList.add('hidden');
            
            setActiveSidebarLink(''); 
            if (!document.getElementById('onboarding-container')) {
                showLoginUI(); 
            }
            hideLoading();            
        }
    });
}
// --- END OF FILE firebase_auth.js ---
