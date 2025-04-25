import { currentUser, currentSubject, db} from './state.js'; // Added ADMIN_UID
import { ADMIN_UID } from './config.js';
import { renderMathIn } from './utils.js';
import { updateAdminPanelVisibility } from './script.js';
import { DEFAULT_PROFILE_PIC_URL } from '../config.js'; // Added Default Pic URL

// --- Basic UI Toggles & Updates ---

export function showLoginUI() {
    // ... (function remains the same) ...
     console.log("Running showLoginUI...");
    document.getElementById('login-section')?.classList.remove('hidden');
    document.getElementById('content')?.classList.add('hidden');
    document.getElementById('dashboard')?.classList.add('hidden');
    document.getElementById('online-test-area')?.classList.add('hidden');
    document.getElementById('user-section')?.classList.add('hidden');
    document.getElementById('subject-info')?.replaceChildren();
    document.querySelectorAll('.auth-required').forEach(el => el.style.display = 'none');
    document.querySelector('#sidebar nav.auth-required')?.style.setProperty('display', 'none', 'important');
    updateAdminPanelVisibility();
}

export function hideLoginUI() {
    // ... (function remains the same) ...
    console.log("Running hideLoginUI...");
    document.getElementById('login-section')?.classList.add('hidden');
    document.getElementById('content')?.classList.remove('hidden');
    document.getElementById('user-section')?.classList.remove('hidden');
    document.querySelectorAll('.auth-required').forEach(el => {
        el.style.display = ''; // Use default display
    });
    document.querySelector('#sidebar nav.auth-required')?.style.removeProperty('display');
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

         // *** NEW: Add Admin Icon ***
         let adminIconHtml = '';
         if (isCurrentUserAdmin) {
              adminIconHtml = `<svg class="admin-icon w-4 h-4 inline-block ml-1 text-yellow-500 dark:text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" clip-rule="evenodd" /></svg>`;
         }
         // Append the icon HTML directly to the name span's innerHTML
         nameSpan.innerHTML = nameSpan.textContent + adminIconHtml;


         userDisplay.replaceChildren(img, nameSpan);
         userSection?.classList.remove('hidden');
    }

    // ... (existing inbox check logic remains the same) ...
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

export function clearUserInfoUI() {
    // ... (function remains the same) ...
    document.getElementById('user-display')?.replaceChildren();
    document.getElementById('user-section')?.classList.add('hidden');
    document.getElementById('subject-info')?.replaceChildren();
     const unreadBadge = document.getElementById('inbox-unread-count');
     if (unreadBadge) unreadBadge.classList.add('hidden');
}

export function updateSubjectInfo() {
    // ... (function remains the same) ...
     const infoEl = document.getElementById('subject-info');
    if (!infoEl) return;

    const stateCurrentUser = currentUser; // Use the state's currentUser

    if (currentSubject) {
        const chapterCount = (currentSubject.chapters && typeof currentSubject.chapters === 'object')
                             ? Object.keys(currentSubject.chapters).filter(num => currentSubject.chapters[num]?.total_questions > 0).length
                             : 0;
        infoEl.innerHTML = `
         <div class="text-sm text-right md:text-left">
             <p class="font-semibold text-base text-gray-700 dark:text-gray-200">${currentSubject.name || 'Unnamed Subject'}</p>
             <p class="text-xs text-gray-500 dark:text-gray-400">${chapterCount} Chapters with Questions</p>
         </div>`;
    } else if (stateCurrentUser) { // Check state's currentUser
         infoEl.innerHTML = `<p class="text-sm text-warning font-medium">No Subject Selected</p>`;
    } else {
        infoEl.replaceChildren();
    }
}

export async function displayContent(html) {
    // ... (function remains the same) ...
    const contentEl = document.getElementById('content');
    if (contentEl) {
        document.getElementById('dashboard')?.classList.add('hidden');
        document.getElementById('online-test-area')?.classList.add('hidden');
        contentEl.classList.remove('hidden');
        contentEl.innerHTML = `<div class="content-card">${html}</div>`;
        const cardElement = contentEl.firstElementChild;
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

export function clearContent() {
    // ... (function remains the same) ...
     const contentEl = document.getElementById('content');
    const testAreaEl = document.getElementById('online-test-area');
    const dashboardEl = document.getElementById('dashboard');
    const dashboardContentEl = document.getElementById('dashboard-content');

    if (contentEl) { contentEl.replaceChildren(); }
    if (testAreaEl) { testAreaEl.replaceChildren(); testAreaEl.classList.add('hidden'); }
    if (dashboardEl) {
         dashboardEl.classList.add('hidden');
         if (dashboardContentEl) { dashboardContentEl.replaceChildren(); }
    }
}

export function setActiveSidebarLink(functionName) {
    // ... (function remains the same) ...
     const sidebarLinks = document.querySelectorAll('#sidebar nav .sidebar-link');
    sidebarLinks.forEach(link => {
        link.classList.remove('active-link');
        const onclickAttr = link.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes(functionName)) {
            link.classList.add('active-link');
        }
    });
}