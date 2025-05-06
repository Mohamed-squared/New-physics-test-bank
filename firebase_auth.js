// firebase_auth.js
import { auth, db, setCurrentUser, clearUserSession, userCourseProgressMap } from './state.js'; // Added auth import
import { showLoading, hideLoading } from './utils.js';
// --- START MODIFICATION: Added sendWelcomeGuideMessage import ---
import { initializeUserData, loadUserData, loadGlobalCourseDefinitions, sendWelcomeGuideMessage } from './firebase_firestore.js';
// --- END MODIFICATION ---
import { showLoginUI, hideLoginUI, fetchAndUpdateUserInfo, clearUserInfoUI, setActiveSidebarLink, displayContent } from './ui_core.js';
import { updateAdminPanelVisibility } from './script.js';
// REMOVED: showMyCoursesDashboard import - rely on global assignment in script.js
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
        console.log('Signed up:', user);

        // Pass username to initializeUserData
        // initializeUserData will set isAdmin to false by default, or true if user.uid === ADMIN_UID
        await initializeUserData(user.uid, email, username, null, null, false);

        // Reserve username in the separate collection
        await db.collection('usernames').doc(usernameLower).set({ userId: user.uid });
        console.log(`Username ${usernameLower} reserved for user ${user.uid}`);
        
        // --- START MODIFICATION: Send welcome guide message ---
        if (user && user.uid) {
            console.log("New user signed up. Sending welcome guide message.");
            sendWelcomeGuideMessage(user.uid).catch(err => {
                console.error("Error sending welcome guide message on signup:", err);
            });
        }
        // --- END MODIFICATION ---
        // onAuthStateChanged will handle UI updates and loading data

    } catch (error) {
        console.error("Sign up error:", error);
        if (error.code === 'auth/email-already-in-use') {
            alert("Sign up failed: The email address is already in use by another account.");
        } else if (error.code === 'auth/weak-password') {
            alert("Sign up failed: Password is too weak.");
        } else {
            alert("Sign up failed: " + error.message);
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
        // Success handled by onAuthStateChanged
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
            showLoading("Processing Google Sign-in..."); // Update loading message
            const user = result.user;
            // --- START MODIFICATION: Check if it's a new user for welcome message ---
            const isNewUser = result.additionalUserInfo?.isNewUser || false;
            // --- END MODIFICATION ---
            console.log('Google sign in success:', user, 'Is new user:', isNewUser);

            // Generate a potential username and check for uniqueness
            const potentialUsername = (user.email?.split('@')[0] || `user_${user.uid.substring(0,6)}`).replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20);
            let finalUsername = potentialUsername;
            let checkCounter = 0;
            const MAX_CHECKS = 5;

            if (!db) throw new Error("Firestore DB not available for username check.");

            // Simple username check loop
            while (checkCounter < MAX_CHECKS) {
                 try {
                     const usernameRef = db.collection('usernames').doc(finalUsername.toLowerCase());
                     const usernameDoc = await usernameRef.get();
                     if (!usernameDoc.exists) break; // Found unique username
                 } catch (dbError) {
                     console.error("Error checking username:", dbError);
                     break; // Stop check on DB error
                 }
                 checkCounter++;
                 finalUsername = `${potentialUsername}${checkCounter}`;
                 console.log(`Potential Google username taken, trying: ${finalUsername}`);
            }

            if (checkCounter >= MAX_CHECKS) {
                 console.warn(`Could not find a unique username placeholder for Google Sign-In user within ${MAX_CHECKS} attempts. Using default: ${potentialUsername}`);
                 finalUsername = potentialUsername; // Use the base potential username as fallback
            }

            // Initialize user data (or update if exists), passing the chosen username
            // initializeUserData will set isAdmin to false by default, or true if user.uid === ADMIN_UID
            await initializeUserData(user.uid, user.email, finalUsername, user.displayName, user.photoURL);
            
            // --- START MODIFICATION: Send welcome guide message if new Google user ---
            if (isNewUser && user && user.uid) {
                console.log("New Google user signed up. Sending welcome guide message.");
                sendWelcomeGuideMessage(user.uid).catch(err => {
                    console.error("Error sending welcome guide message on Google signup:", err);
                });
            }
            // --- END MODIFICATION ---
             // onAuthStateChanged will handle subsequent UI updates and data loading
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
        // onAuthStateChanged will handle UI updates and state clearing
    }).catch((error) => {
        console.error("Sign out error:", error);
        alert("Sign out failed: " + error.message);
        hideLoading(); // Ensure loading is hidden on error
    });
}

// --- Password Reset ---
/**
 * Sends a password reset email to the specified address.
 * @param {string} email The user's email address.
 */
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
    }
}


// --- Auth Listener Setup ---
export function setupAuthListener() {
    if (!auth) {
        console.error("Cannot set up auth listener: Firebase auth not initialized.");
        return;
    }
    console.log("Setting up Firebase Auth listener...");
    auth.onAuthStateChanged(async user => {
        console.log("Auth state changed. User:", user ? user.uid : 'None');
        
        // --- MODIFICATION: setCurrentUser is now called AFTER fetchAndUpdateUserInfo ---
        // This ensures that custom user data (like isAdmin) from Firestore is included
        // when setting the global currentUser state.
        // updateAdminPanelVisibility() is called after currentUser is fully set.

        if (user) {
            console.log("User signed in: ", user.uid);
            showLoading("Loading user data..."); 

            document.getElementById('public-homepage-container')?.classList.add('hidden');
            document.querySelector('.app-layout')?.classList.remove('hidden');

            // fetchAndUpdateUserInfo fetches Firestore data and then calls setCurrentUser internally.
            await fetchAndUpdateUserInfo(user); 
            // Now currentUser in state.js should have the isAdmin field if fetched.

            updateAdminPanelVisibility(); // Call after currentUser is fully set with Firestore data

            console.log("Loading global course definitions...");
            await loadGlobalCourseDefinitions(); 

            console.log("Calling loadUserData (includes course progress)...");
            try {
                // loadUserData might update parts of the user document (like appData or missing fields)
                // but fetchAndUpdateUserInfo is responsible for the initial load for currentUser state.
                await loadUserData(user.uid); 
                console.log("loadUserData (including onboarding check) finished.");

                if (!document.getElementById('onboarding-container')) {
                    hideLoginUI(); // This will hide #login-section
                    showHomeDashboard();
                }
                // Ensure hideLoading is called after all async operations related to login are complete
                if (!document.getElementById('onboarding-container')) {
                    hideLoading();
                }

            } catch (loadError) {
                console.error("Error during loadUserData call:", loadError);
                let alertMessage = `Critical error loading user data: ${loadError.message}. Please try signing out and back in.`;
                if (loadError.message && (loadError.message.toLowerCase().includes('permission') || loadError.message.toLowerCase().includes('missing or insufficient permissions'))) {
                    alertMessage = "Critical error loading user data: Permission denied. This often indicates a Firestore Security Rules issue. Please check the rules or contact support, then try signing out and back in.";
                }
                alert(alertMessage);
                hideLoading();
                signOutUser(); 
            }
        } else { // User is signed out
            console.log("User signed out. Showing public homepage.");
            setCurrentUser(null); // Clear global user state immediately
            updateAdminPanelVisibility(); // Update admin link visibility
            clearUserSession();       
            clearUserInfoUI();      
            
            document.getElementById('public-homepage-container')?.classList.remove('hidden');
            document.querySelector('.app-layout')?.classList.add('hidden');
            
            setActiveSidebarLink(''); 
            hideLoading();            
        }
    });
}
// --- END OF FILE firebase_auth.js ---