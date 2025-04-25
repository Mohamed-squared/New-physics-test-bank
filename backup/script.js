// --- START OF FILE script.js ---

// script.js
// --- Core State & Config Imports ---
import { setAuth, setDb, auth, db, currentUser, currentSubject } from './state.js';
import { ADMIN_UID } from './config.js';

// --- Utility Imports ---
import { showLoading, hideLoading } from './utils.js';

// --- Firebase Imports ---
import { setupAuthListener, signInUser, signUpUser, signInWithGoogle, signOutUser } from './firebase_auth.js';
import { saveUserData, loadUserData, initializeUserData, submitFeedback, sendAdminReply, markMessageAsRead } from './firebase_firestore.js';

// --- UI Imports ---
import { importData, exportData, showImportExportDashboard } from './ui_import_export.js';
// MODIFIED: Added setActiveSidebarLink, removed hideUserInfo/showUserInfo (handled by auth listener now)
import { displayContent, clearContent, showLoginUI, hideLoginUI, updateSubjectInfo, setActiveSidebarLink } from './ui_core.js';
import { showHomeDashboard } from './ui_home_dashboard.js'; // **** NEW ****
import { showTestGenerationDashboard, promptChapterSelectionForTest, getSelectedChaptersAndPromptTestType, promptTestType, startTestGeneration } from './ui_test_generation.js';
import { generateAndDownloadPdfWithMathJax, downloadTexFile } from './ui_pdf_generation.js';
import { launchOnlineTestUI, navigateQuestion, recordAnswer, confirmSubmitOnlineTest, confirmForceSubmit } from './ui_online_test.js';
import {
    showExamsDashboard,
    enterResultsForm,
    submitPendingResults,
    showExamDetails, // showExamDetailsWrapper is defined below
    confirmDeletePendingExam,
    confirmDeleteCompletedExam,
    overrideQuestionCorrectness,
    promptFeedback,
    triggerAIExplanationWrapper,
    promptAdminEditAnswerPlaceholder
} from './ui_exams_dashboard.js';
import { showManageStudiedChapters, toggleStudiedChapter } from './ui_studied_chapters.js';
import { showManageSubjects, selectSubject, editSubject, updateSubject, addSubject, confirmDeleteSubject, deleteSubject } from './ui_subjects.js';
import { showProgressDashboard, closeDashboard, renderCharts } from './ui_progress_dashboard.js';
import { showUserProfileDashboard, updateUserProfile } from './ui_user_profile.js';
import { showOnboardingUI, showAddSubjectComingSoon, completeOnboarding } from './ui_onboarding.js';
import { showAdminDashboard, promptAdminReply } from './ui_admin_dashboard.js';
import { showInbox, handleMarkRead } from './ui_inbox.js';
// ai_integration is used internally by ui_exams_dashboard

// --- Initialization ---

async function initializeApp() {
    console.log("Initializing App (Module)...");
    showLoading("Initializing...");

    // Theme Init
    const themeToggle = document.getElementById('theme-toggle');
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    if (themeToggle && !themeToggle.dataset.listenerAttached) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
             // Re-render charts only if the specific dashboard is visible
             const dashboardElement = document.getElementById('dashboard');
             if (dashboardElement && !dashboardElement.classList.contains('hidden')) {
                renderCharts();
             }
        });
        themeToggle.dataset.listenerAttached = 'true';
    }

     // Mobile Menu Init
     const menuButton = document.getElementById('mobile-menu-button');
     const sidebar = document.getElementById('sidebar');
     const overlay = document.getElementById('mobile-overlay');
     if (menuButton && sidebar && overlay && !menuButton.dataset.listenerAttached) {
         menuButton.addEventListener('click', (e) => {
             e.stopPropagation();
             sidebar.classList.toggle('is-open'); // Defined in CSS
             sidebar.classList.toggle('hidden'); // Also toggle base hidden class
             overlay.classList.toggle('is-visible');
         });
         overlay.addEventListener('click', () => {
             sidebar.classList.remove('is-open');
             sidebar.classList.add('hidden');
             overlay.classList.remove('is-visible');
         });
         // Close sidebar on link click (ensure links have 'sidebar-link' class)
         sidebar.querySelectorAll('.sidebar-link').forEach(link => {
             link.addEventListener('click', () => {
                if (window.innerWidth < 768) { // md breakpoint
                    sidebar.classList.remove('is-open');
                    sidebar.classList.add('hidden');
                    overlay.classList.remove('is-visible');
                }
            });
         });
          menuButton.dataset.listenerAttached = 'true';
     } else if (!menuButton || !sidebar || !overlay) {
          console.warn("Mobile menu elements not found during initialization.");
     }

    // Firebase Init
    if (typeof firebase === 'undefined' || !firebase.app) {
        console.error("Firebase core is not available. Check HTML setup.");
        alert("Fatal Error: Application cannot start. Firebase is missing.");
        hideLoading();
        return;
    }
    try {
        // Use the already initialized Firebase app from index.html script
        if (firebase.apps.length === 0) {
             console.error("Firebase was not initialized in index.html. App cannot run.");
             alert("Fatal Error: Firebase initialization failed.");
             hideLoading();
             return;
        }
        // Use compat services if needed by other parts of the codebase
        setAuth(firebase.auth());
        setDb(firebase.firestore());
        setupAuthListener(); // Setup listener AFTER setting state
    } catch (e) {
        console.error("Firebase Services Access Failed in script.js:", e);
        alert("Error accessing Firebase services: " + e.message);
        hideLoading();
        return;
    }

    console.log("initializeApp finishing setup.");
    // Loading indicator hidden by auth listener or loadUserData
}

// --- Global Function Assignments ---
// Assign functions from modules to the window object for inline handlers

// Core UI / Navigation
window.showHomeDashboard = showHomeDashboard; // **** NEW ****
window.showTestGenerationDashboard = showTestGenerationDashboard;
window.showManageStudiedChapters = showManageStudiedChapters;
window.showExamsDashboard = showExamsDashboard;
window.showProgressDashboard = showProgressDashboard;
window.showManageSubjects = showManageSubjects;
window.showUserProfileDashboard = showUserProfileDashboard;
window.closeDashboard = closeDashboard;
window.initializeApp = initializeApp; // Allow manual reload

// Test Generation
window.promptTestType = promptTestType;
window.promptChapterSelectionForTest = promptChapterSelectionForTest;
window.getSelectedChaptersAndPromptTestType = getSelectedChaptersAndPromptTestType;
window.startTestGeneration = startTestGeneration;

// PDF / TeX Generation
window.downloadTexFileWrapper = downloadTexFile; // Wrapper for base64 content
// PDF generation attached dynamically in ui_test_generation

// Online Test
window.navigateQuestion = navigateQuestion;
window.recordAnswer = recordAnswer;
window.confirmSubmitOnlineTest = confirmSubmitOnlineTest;
window.confirmForceSubmit = confirmForceSubmit;

// Exams Dashboard
window.enterResultsForm = enterResultsForm;
window.submitPendingResults = submitPendingResults;
// Wrapper needed because showExamDetails is async
window.showExamDetailsWrapper = async (index) => {
    try {
        await showExamDetails(index);
    } catch(e) {
        console.error("Error showing exam details:", e);
        displayContent('<p class="text-danger p-4 text-center">Error loading exam details. Please try again.</p>');
    }
};
window.confirmDeletePendingExam = confirmDeletePendingExam;
window.confirmDeleteCompletedExam = confirmDeleteCompletedExam;
window.overrideQuestionCorrectness = overrideQuestionCorrectness;
window.promptFeedback = promptFeedback;
window.triggerAIExplanation = triggerAIExplanationWrapper;
window.promptAdminEditAnswer = promptAdminEditAnswerPlaceholder;

// Studied Chapters
window.toggleStudiedChapter = toggleStudiedChapter;

// Subject Management
window.selectSubject = selectSubject;
window.editSubject = editSubject;
window.updateSubject = updateSubject;
window.addSubject = addSubject;
window.confirmDeleteSubject = confirmDeleteSubject;
window.deleteSubject = deleteSubject;

// User Profile / Auth
window.updateUserProfile = updateUserProfile;
window.signOutUserWrapper = signOutUser; // Wrapper to ensure it's available

// Import/Export
window.importData = importData;
window.exportData = exportData;
window.showImportExportDashboard = showImportExportDashboard;

// Onboarding
window.showAddSubjectComingSoon = showAddSubjectComingSoon;
window.completeOnboarding = completeOnboarding;

// Admin / Inbox / Feedback
window.showAdminDashboard = showAdminDashboard;
window.showInbox = showInbox;
window.handleMarkRead = handleMarkRead; // Make sure this is assigned
window.promptAdminReply = promptAdminReply;

// --- Dynamic UI Updates ---
// Function to toggle admin panel visibility based on user ID
// script.js
export function updateAdminPanelVisibility() {
    const adminPanelLink = document.getElementById('admin-panel-link');
    if (adminPanelLink) {
        // Simple, insecure client-side check
        const isAdmin = currentUser && currentUser.uid === ADMIN_UID;
        adminPanelLink.style.display = isAdmin ? 'flex' : 'none';
        // console.log(`Admin Panel Visibility (Client Check): ${isAdmin ? 'Shown' : 'Hidden'}`); // Optional logging
    }
}

// --- Auth Form Handling ---
// Moved listener attachment into a function to be called after DOM is ready
function attachAuthListeners() {
    console.log("Attempting to attach auth listeners...");
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const googleButton = document.getElementById('google-signin-button');

    // Simple check if listener already attached to prevent duplicates
    if (loginForm && !loginForm.dataset.listenerAttached) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const identifier = document.getElementById('login-identifier')?.value;
            const password = document.getElementById('login-password')?.value;
            // Basic validation before calling Firebase
            if (!identifier || !password) {
                alert("Please enter both identifier and password.");
                return;
            }
            signInUser(identifier, password).catch(err => console.error("Sign in submit error:", err)); // Error handled internally
        });
        loginForm.dataset.listenerAttached = 'true';
        console.log("Login form listener attached.");
    } else if (!loginForm) {
        console.warn("Login form (#login-form) NOT found.");
    }

    if (signupForm && !signupForm.dataset.listenerAttached) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('signup-username')?.value;
            const email = document.getElementById('signup-email')?.value;
            const password = document.getElementById('signup-password')?.value;
            // Basic validation before calling Firebase
            if (!username || !email || !password) {
                alert("Please fill in all signup fields.");
                return;
            }
            if (password.length < 6) {
                 alert("Password must be at least 6 characters.");
                 return;
            }
             // Regex validation for username happens inside signUpUser
            signUpUser(username, email, password).catch(err => console.error("Sign up submit error:", err)); // Error handled internally
         });
         signupForm.dataset.listenerAttached = 'true';
         console.log("Signup form listener attached.");
    } else if (!signupForm) {
        console.warn("Signup form (#signup-form) NOT found.");
    }

    if (googleButton && !googleButton.dataset.listenerAttached) {
        googleButton.addEventListener('click', () => {
            signInWithGoogle(); // Errors handled internally
        });
        googleButton.dataset.listenerAttached = 'true';
        console.log("Google button listener attached.");
    } else if (!googleButton) {
        console.warn("Google Sign-in button (#google-signin-button) NOT found.");
    }

    console.log("Finished attempting to attach auth listeners.");
}

// --- Run Initialization & Attach Listeners ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeApp();
        attachAuthListeners(); // Attach listeners after DOM is loaded
    });
} else {
    initializeApp(); // DOM already loaded
    attachAuthListeners(); // Attach listeners immediately
}
// --- END OF FILE script.js ---