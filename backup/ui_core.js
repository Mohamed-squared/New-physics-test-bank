import { currentUser, currentSubject, db } from './state.js';
import { renderMathIn } from './utils.js';
// Import the visibility function from script.js where it's defined
import { updateAdminPanelVisibility } from './script.js';

// --- Basic UI Toggles & Updates ---

export function showLoginUI() {
    console.log("Running showLoginUI...");
    document.getElementById('login-section')?.classList.remove('hidden');
    // Hide main content sections specifically
    document.getElementById('content')?.classList.add('hidden');
    document.getElementById('dashboard')?.classList.add('hidden');
    document.getElementById('online-test-area')?.classList.add('hidden');
    // Hide user info and subject info in header
    document.getElementById('user-section')?.classList.add('hidden');
    document.getElementById('subject-info')?.replaceChildren(); // Clear subject info
    // Hide elements requiring authentication
    document.querySelectorAll('.auth-required').forEach(el => el.style.display = 'none');
    // Ensure sidebar itself might be visible but nav hidden
    document.querySelector('#sidebar nav.auth-required')?.style.setProperty('display', 'none', 'important');

    updateAdminPanelVisibility(); // Update admin link visibility
}

export function hideLoginUI() {
    console.log("Running hideLoginUI...");
    document.getElementById('login-section')?.classList.add('hidden');
    // Show the main content wrapper area
    document.getElementById('content')?.classList.remove('hidden'); // Show dynamic content area
    // Show user section in header
    document.getElementById('user-section')?.classList.remove('hidden');
    // Show elements requiring authentication
    document.querySelectorAll('.auth-required').forEach(el => {
        // Use 'flex' or 'block' based on element type? 'flex' is common for sidebar links
        el.style.display = ''; // Use default display (likely flex or block)
    });
    // Ensure sidebar nav is visible
    document.querySelector('#sidebar nav.auth-required')?.style.removeProperty('display');

    updateAdminPanelVisibility(); // Update admin link visibility
}

// Renamed from showUserInfo to avoid conflict with auth listener call
export async function fetchAndUpdateUserInfo(user) {
     if (!user || !db) return;
    const userDisplay = document.getElementById('user-display');
    const userSection = document.getElementById('user-section');

    let displayName = 'User';
    let photoURL = 'default-avatar.png'; // Ensure you have this default image

    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            // Prioritize Firestore data, fallback to Auth data
            displayName = userData.displayName || user.displayName || user.email?.split('@')[0] || 'User';
            photoURL = userData.photoURL || user.photoURL || 'default-avatar.png';
        } else {
             console.warn("No Firestore profile document found for user, using Auth data.");
             displayName = user.displayName || user.email?.split('@')[0] || 'User';
             photoURL = user.photoURL || 'default-avatar.png';
        }
    } catch (error) {
        console.error("Error fetching user profile for UI:", error);
        // Fallback to Auth data on error
        displayName = user.displayName || user.email?.split('@')[0] || 'User';
        photoURL = user.photoURL || 'default-avatar.png';
    }

    if (userDisplay) {
         const img = document.createElement('img');
         img.src = photoURL;
         img.alt = "Profile";
         // Use styles defined in styles.css for consistency if needed, or use TW classes
         img.className = "w-8 h-8 rounded-full mr-2 object-cover border-2 border-white dark:border-gray-700 shadow-sm";
         img.onerror = () => { img.src = 'default-avatar.png'; console.error('Error loading profile image:', photoURL); };

         const span = document.createElement('span');
         span.className = "text-sm font-medium text-gray-700 dark:text-gray-200 truncate hidden sm:inline"; // Hide on very small screens
         span.title = displayName;
         span.textContent = displayName;

         userDisplay.replaceChildren(img, span);
         userSection?.classList.remove('hidden'); // Make sure the section is visible
    }

    // Check and show inbox unread count (example)
    try {
        const inboxSnapshot = await db.collection('users').doc(user.uid).collection('inbox').where('isRead', '==', false).limit(10).get();
        const unreadCount = inboxSnapshot.size;
        const unreadBadge = document.getElementById('inbox-unread-count');
        if (unreadBadge) {
            unreadBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            unreadBadge.classList.toggle('hidden', unreadCount === 0);
        }
    } catch(err) {
        console.error("Error fetching unread count:", err);
         const unreadBadge = document.getElementById('inbox-unread-count');
         if (unreadBadge) unreadBadge.classList.add('hidden');
    }
}

// Used when logging out
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

    if (currentSubject) {
        const chapterCount = (currentSubject.chapters && typeof currentSubject.chapters === 'object')
                             ? Object.keys(currentSubject.chapters).filter(num => currentSubject.chapters[num]?.total_questions > 0).length // Count only chapters with questions
                             : 0;
        infoEl.innerHTML = `
         <div class="text-sm text-right md:text-left"> <!-- Align text based on screen size -->
             <p class="font-semibold text-base text-gray-700 dark:text-gray-200">${currentSubject.name || 'Unnamed Subject'}</p>
             <p class="text-xs text-gray-500 dark:text-gray-400">${chapterCount} Chapters with Questions</p>
         </div>`;
    } else if (currentUser) { // Only show "No Subject" if logged in
         infoEl.innerHTML = `<p class="text-sm text-warning font-medium">No Subject Selected</p>`;
    } else {
        infoEl.replaceChildren(); // Clear if not logged in
    }
}

// Displays HTML content in the main #content area and renders MathJax
export async function displayContent(html) {
    const contentEl = document.getElementById('content');
    if (contentEl) {
        // Hide other main sections potentially managed outside this function
        document.getElementById('dashboard')?.classList.add('hidden');
        document.getElementById('online-test-area')?.classList.add('hidden');
        contentEl.classList.remove('hidden'); // Ensure content area is visible

        // Set HTML and apply base styling if needed (content-card is good)
        contentEl.innerHTML = `<div class="content-card">${html}</div>`; // Wrap content in standard card
        const cardElement = contentEl.firstElementChild;

        // Render MathJax within the newly added content
        if (cardElement) {
            try {
                 await renderMathIn(cardElement);
                 console.log("MathJax rendered in displayContent.")
            } catch (error) {
                 console.error("Error during MathJax rendering in displayContent:", error);
            }
        }

    } else {
         console.error("displayContent: Could not find #content element");
    }
}

// Clears the main content sections more selectively
export function clearContent() {
    const contentEl = document.getElementById('content');
    const testAreaEl = document.getElementById('online-test-area');
    const dashboardEl = document.getElementById('dashboard'); // Progress dashboard container
    const dashboardContentEl = document.getElementById('dashboard-content');

    // Clear dynamic content area
    if (contentEl) {
        contentEl.replaceChildren();
        // Keep #content wrapper visible, hide only if explicitly needed elsewhere
        // contentEl.classList.add('hidden');
    }
    // Clear and hide online test area
    if (testAreaEl) {
        testAreaEl.replaceChildren();
        testAreaEl.classList.add('hidden');
    }
    // Clear and hide progress dashboard area
    if (dashboardEl) {
         dashboardEl.classList.add('hidden');
         if (dashboardContentEl) {
             dashboardContentEl.replaceChildren();
         }
         // Chart destruction should be handled when the dashboard is closed
         // See closeDashboard in ui_progress_dashboard.js
    }
}

// NEW: Function to highlight the active sidebar link
export function setActiveSidebarLink(functionName) {
    const sidebarLinks = document.querySelectorAll('#sidebar nav .sidebar-link');
    sidebarLinks.forEach(link => {
        link.classList.remove('active-link'); // Use the new class name
        const onclickAttr = link.getAttribute('onclick');
        // Check if onclick attribute exists and includes the function name
        if (onclickAttr && onclickAttr.includes(functionName)) {
            link.classList.add('active-link');
        }
    });
}