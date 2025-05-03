

import { currentUser, currentSubject, db, activeCourseId, userCourseProgressMap } from './state.js'; // Added course state imports
import { ADMIN_UID } from './config.js';
import { renderMathIn } from './utils.js';
import { updateAdminPanelVisibility } from './script.js';
import { DEFAULT_PROFILE_PIC_URL } from '../config.js';
import { sendPasswordReset } from './firebase_auth.js'; // Import password reset function

// --- Basic UI Toggles & Updates ---

export function showLoginUI() {
    console.log("Running showLoginUI...");
    document.getElementById('login-section')?.classList.remove('hidden');
    document.getElementById('content')?.classList.add('hidden');
    document.getElementById('dashboard')?.classList.add('hidden'); // Hide progress dashboard
    document.getElementById('course-dashboard-area')?.classList.add('hidden'); // Hide course dashboard
    document.getElementById('online-test-area')?.classList.add('hidden');
    document.getElementById('user-section')?.classList.add('hidden');
    document.getElementById('subject-info')?.replaceChildren();
    document.querySelectorAll('.auth-required').forEach(el => el.style.display = 'none');
    // Hide specific sidebar groups
    document.getElementById('sidebar-standard-nav')?.style.setProperty('display', 'none', 'important');
    document.getElementById('sidebar-course-nav')?.style.setProperty('display', 'none', 'important');
    updateAdminPanelVisibility();
    showLoginFormOnly(); // Ensure login form is shown by default
}

export function hideLoginUI() {
    console.log("Running hideLoginUI...");
    document.getElementById('login-section')?.classList.add('hidden');
    // Don't automatically show content, let specific functions decide
    // document.getElementById('content')?.classList.remove('hidden');
    document.getElementById('user-section')?.classList.remove('hidden');
    document.querySelectorAll('.auth-required').forEach(el => {
        el.style.display = ''; // Use default display (flex for nav)
    });
    // Show the standard nav by default when logged in
    document.getElementById('sidebar-standard-nav')?.style.removeProperty('display');
    // Keep course nav hidden until a course is active
    document.getElementById('sidebar-course-nav')?.style.setProperty('display', 'none', 'important');
    updateAdminPanelVisibility();
}

// Fetch and update user info, including admin icon
export async function fetchAndUpdateUserInfo(user) {
     if (!user || !db) return;
    const userDisplay = document.getElementById('user-display');
    const userSection = document.getElementById('user-section');

    let displayName = 'User';
    let photoURL = DEFAULT_PROFILE_PIC_URL; // Use default from config
    let isCurrentUserAdmin = user.uid === ADMIN_UID; // Check if the logged-in user is admin

    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            displayName = userData.displayName || user.displayName || user.email?.split('@')[0] || 'User';
            // Use Firestore photoURL, fallback to Auth photoURL, then config default
            photoURL = userData.photoURL || user.photoURL || DEFAULT_PROFILE_PIC_URL;
        } else {
             console.warn("No Firestore profile document found for user, using Auth data.");
             displayName = user.displayName || user.email?.split('@')[0] || 'User';
             photoURL = user.photoURL || DEFAULT_PROFILE_PIC_URL;
        }
    } catch (error) {
        console.error("Error fetching user profile for UI:", error);
        displayName = user.displayName || user.email?.split('@')[0] || 'User';
        photoURL = user.photoURL || DEFAULT_PROFILE_PIC_URL;
    }

    if (userDisplay) {
         const img = document.createElement('img');
         img.src = photoURL;
         img.alt = "Profile";
         img.className = "w-8 h-8 rounded-full mr-2 object-cover border-2 border-white dark:border-gray-700 shadow-sm";
         img.onerror = () => { img.src = DEFAULT_PROFILE_PIC_URL; console.error('Error loading profile image:', photoURL); };

         const nameSpan = document.createElement('span');
         nameSpan.className = "text-sm font-medium text-gray-700 dark:text-gray-200 truncate hidden sm:inline";
         nameSpan.title = displayName;
         nameSpan.textContent = displayName;

         // Add Admin Icon
         let adminIconHtml = '';
         if (isCurrentUserAdmin) {
              adminIconHtml = `<svg class="admin-icon w-4 h-4 inline-block ml-1 text-yellow-500 dark:text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" clip-rule="evenodd" /></svg>`;
         }
         nameSpan.innerHTML = nameSpan.textContent + adminIconHtml;


         userDisplay.replaceChildren(img, nameSpan);
         userSection?.classList.remove('hidden');
    }

    // Inbox check (Unchanged)
    try {
        const inboxSnapshot = await db.collection('users').doc(user.uid).collection('inbox').where('isRead', '==', false).limit(10).get();
        const unreadCount = inboxSnapshot.size;
        const unreadBadge = document.getElementById('inbox-unread-count');
        if (unreadBadge) {
            unreadBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            unreadBadge.classList.toggle('hidden', unreadCount === 0);
        }
        // Add the new code for the inbox link notification dot
        const inboxLink = document.getElementById('sidebar-inbox-link');
        if (inboxLink) {
            inboxLink.classList.toggle('has-unread', unreadCount > 0);
        }
    } catch(err) {
        console.error("Error fetching unread count:", err);
         const unreadBadge = document.getElementById('inbox-unread-count');
         if (unreadBadge) unreadBadge.classList.add('hidden');
         // Also clear the notification dot on error
         const inboxLink = document.getElementById('sidebar-inbox-link');
         if (inboxLink) inboxLink.classList.remove('has-unread');
    }
}

export function clearUserInfoUI() {
    document.getElementById('user-display')?.replaceChildren();
    document.getElementById('user-section')?.classList.add('hidden');
    document.getElementById('subject-info')?.replaceChildren();
     const unreadBadge = document.getElementById('inbox-unread-count');
     if (unreadBadge) unreadBadge.classList.add('hidden');
}

export function updateSubjectInfo() {
     const infoEl = document.getElementById('subject-info');
    if (!infoEl) return;

    const stateCurrentUser = currentUser;

    if (currentSubject) {
        const chapterCount = (currentSubject.chapters && typeof currentSubject.chapters === 'object')
                             ? Object.keys(currentSubject.chapters).filter(num => currentSubject.chapters[num]?.total_questions > 0).length
                             : 0;
        infoEl.innerHTML = `
         <div class="text-sm text-right md:text-left">
             <p class="font-semibold text-base text-gray-700 dark:text-gray-200">${currentSubject.name || 'Unnamed Subject'}</p>
             <p class="text-xs text-gray-500 dark:text-gray-400">${chapterCount} Chapters with Questions</p>
         </div>`;
    } else if (stateCurrentUser) {
         infoEl.innerHTML = `<p class="text-sm text-warning font-medium text-center md:text-left">No Subject Selected</p>`;
    } else {
        infoEl.replaceChildren();
    }
}

// Modified displayContent to handle different containers
export async function displayContent(html, targetElementId = 'content') {
    const targetEl = document.getElementById(targetElementId);

    if (targetEl) {
        // Hide other primary content areas
        if (targetElementId === 'content') {
            document.getElementById('dashboard')?.classList.add('hidden');
            document.getElementById('course-dashboard-area')?.classList.add('hidden');
            document.getElementById('online-test-area')?.classList.add('hidden');
        } else if (targetElementId === 'course-dashboard-area') {
            document.getElementById('content')?.classList.add('hidden');
            document.getElementById('dashboard')?.classList.add('hidden');
            document.getElementById('online-test-area')?.classList.add('hidden');
        }
        // Add other cases if needed (e.g., progress dashboard 'dashboard')

        targetEl.classList.remove('hidden');
        // Wrap in content-card only if it's the main #content area and HTML isn't already a card
        const needsCardWrapper = targetElementId === 'content' && !html.trim().startsWith('<div class="content-card');
        targetEl.innerHTML = needsCardWrapper ? `<div class="content-card">${html}</div>` : html;

        // Render MathJax within the newly added content
        const elementToRender = needsCardWrapper ? targetEl.firstElementChild : targetEl;
        if (elementToRender) {
            try {
                await renderMathIn(elementToRender);
                console.log(`MathJax rendered in displayContent for #${targetElementId}.`);
            } catch (error) {
                console.error(`Error during MathJax rendering in displayContent for #${targetElementId}:`, error);
            }
        }
    } else {
        console.error(`displayContent: Could not find target element #${targetElementId}`);
    }
}

// Modified clearContent to clear all potential main areas
export function clearContent() {
    const contentEl = document.getElementById('content');
    const testAreaEl = document.getElementById('online-test-area');
    const dashboardEl = document.getElementById('dashboard');
    const dashboardContentEl = document.getElementById('dashboard-content');
    const courseDashboardEl = document.getElementById('course-dashboard-area');

    if (contentEl) { contentEl.replaceChildren(); contentEl.classList.add('hidden'); }
    if (testAreaEl) { testAreaEl.replaceChildren(); testAreaEl.classList.add('hidden'); }
    if (dashboardEl) {
        dashboardEl.classList.add('hidden');
        if (dashboardContentEl) { dashboardContentEl.replaceChildren(); }
    }
    if (courseDashboardEl) { courseDashboardEl.replaceChildren(); courseDashboardEl.classList.add('hidden'); }
}

// Modified setActiveSidebarLink to handle different nav sections
export function setActiveSidebarLink(functionName, navSectionId = 'sidebar-standard-nav') {
    // Deactivate links in ALL nav sections first
    document.querySelectorAll('#sidebar nav .sidebar-link').forEach(link => {
        link.classList.remove('active-link');
    });

    // Activate the link in the specified section
    const targetNav = document.getElementById(navSectionId);
    if (targetNav) {
        const sidebarLinks = targetNav.querySelectorAll('.sidebar-link');
        sidebarLinks.forEach(link => {
            const onclickAttr = link.getAttribute('onclick');
            // Make matching more robust (handles potential arguments in onclick)
            if (onclickAttr && onclickAttr.includes(functionName + '(')) {
                link.classList.add('active-link');
            }
        });
    } else {
        console.warn(`setActiveSidebarLink: Nav section #${navSectionId} not found.`);
    }

    // Show/hide nav sections based on whether a course is active
    const standardNav = document.getElementById('sidebar-standard-nav');
    const courseNav = document.getElementById('sidebar-course-nav');
    if (standardNav && courseNav) {
        if (activeCourseId && navSectionId === 'sidebar-course-nav') {
            standardNav.style.display = 'none';
            courseNav.style.display = 'flex'; // Assuming flex column
        } else {
            standardNav.style.display = 'flex'; // Assuming flex column
            courseNav.style.display = 'none';
        }
    }
}

// --- Password Reset ---

/**
 * Prompts the user for their email and initiates the password reset process.
 */
function promptForgotPassword() {
    const email = prompt("Please enter the email address associated with your account to send a password reset link:");
    if (email) {
        sendPasswordReset(email.trim());
    } else if (email === '') {
        alert("Please enter an email address.");
    } else {
        // User cancelled the prompt
        console.log("Password reset prompt cancelled.");
    }
}
window.promptForgotPassword = promptForgotPassword; // Assign to window

// --- Login/Signup Form Toggling ---

function showLoginFormOnly() {
    const loginContainer = document.getElementById('login-form-container');
    const signupContainer = document.getElementById('signup-form-container');
    const loginBtn = document.getElementById('show-login-view-btn');
    const signupBtn = document.getElementById('show-signup-view-btn');

    if (loginContainer && signupContainer && loginBtn && signupBtn) {
        loginContainer.classList.remove('hidden');
        signupContainer.classList.add('hidden');

        loginBtn.disabled = true;
        loginBtn.classList.add('font-semibold'); // Make active button bolder
        loginBtn.classList.remove('text-gray-500', 'dark:text-gray-400'); // Ensure it looks active

        signupBtn.disabled = false;
        signupBtn.classList.remove('font-semibold');
        signupBtn.classList.add('text-gray-500', 'dark:text-gray-400'); // Make inactive button less prominent
    } else {
        console.error("Could not find all login/signup toggle elements.");
    }
}
window.showLoginFormOnly = showLoginFormOnly; // Assign to window

function showSignupFormOnly() {
    const loginContainer = document.getElementById('login-form-container');
    const signupContainer = document.getElementById('signup-form-container');
    const loginBtn = document.getElementById('show-login-view-btn');
    const signupBtn = document.getElementById('show-signup-view-btn');

    if (loginContainer && signupContainer && loginBtn && signupBtn) {
        loginContainer.classList.add('hidden');
        signupContainer.classList.remove('hidden');

        loginBtn.disabled = false;
        loginBtn.classList.remove('font-semibold');
        loginBtn.classList.add('text-gray-500', 'dark:text-gray-400'); // Make inactive button less prominent

        signupBtn.disabled = true;
        signupBtn.classList.add('font-semibold'); // Make active button bolder
        signupBtn.classList.remove('text-gray-500', 'dark:text-gray-400'); // Ensure it looks active
    } else {
        console.error("Could not find all login/signup toggle elements.");
    }
}
window.showSignupFormOnly = showSignupFormOnly; // Assign to window
