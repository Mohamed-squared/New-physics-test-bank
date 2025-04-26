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
import { displayContent, clearContent, showLoginUI, hideLoginUI, updateSubjectInfo, setActiveSidebarLink, fetchAndUpdateUserInfo } from './ui_core.js';
import { showHomeDashboard } from './ui_home_dashboard.js';
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
import { showBrowseCourses, showAddCourseForm, submitNewCourse, handleCourseSearch, showCourseDetails, handleReportCourse, handleCourseApproval } from './ui_courses.js'; // Added course functions
import { showInbox, handleMarkRead } from './ui_inbox.js';
import { handleProfilePictureSelect } from './ui_profile_picture.js'; // Added picture handler


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
             const dashboardElement = document.getElementById('dashboard');
             if (dashboardElement && !dashboardElement.classList.contains('hidden')) {
                renderCharts(); // Re-render charts only if dashboard is visible
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
        if (firebase.apps.length === 0) {
             console.error("Firebase was not initialized in index.html. App cannot run.");
             alert("Fatal Error: Firebase initialization failed.");
             hideLoading();
             return;
        }
        setAuth(firebase.auth());
        setDb(firebase.firestore());
        window.auth = firebase.auth(); // Ensure global access
        window.db = firebase.firestore(); // Ensure global access
        setupAuthListener();
    } catch (e) {
        console.error("Firebase Services Access Failed in script.js:", e);
        alert("Error accessing Firebase services: " + e.message);
        hideLoading();
        return;
    }

     // *** NEW: Initialize Mermaid.js ***
     // Ensure Mermaid object exists before trying to initialize
     if (typeof mermaid !== 'undefined') {
         try {
             mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { darkMode: document.documentElement.classList.contains('dark') } });
             console.log("Mermaid initialized.");
             // Add listener to re-theme Mermaid on theme toggle
             themeToggle?.addEventListener('click', () => {
                 mermaid.initialize({ theme: 'base', themeVariables: { darkMode: document.documentElement.classList.contains('dark') } });
                 // Potentially re-render any visible mermaid diagrams here if needed
             });
         } catch (mermaidError) {
             console.error("Error initializing Mermaid:", mermaidError);
         }
     } else {
         // Mermaid might not be loaded yet due to 'defer', handle this possibility
         console.warn("Mermaid library not immediately available during initializeApp. Initialization might be delayed.");
         // Optionally, retry initialization after a short delay or on window load
         window.addEventListener('load', () => {
             if (typeof mermaid !== 'undefined') {
                 try {
                     mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { darkMode: document.documentElement.classList.contains('dark') } });
                     console.log("Mermaid initialized (on window load).");
                 } catch (mermaidError) {
                     console.error("Error initializing Mermaid (on window load):", mermaidError);
                 }
             } else {
                  console.error("Mermaid library failed to load.");
             }
         });
     }

    console.log("initializeApp finishing setup.");
}

// --- Global Function Assignments ---
// (Keep all existing assignments)
// Core UI / Navigation
window.showHomeDashboard = showHomeDashboard;
window.showTestGenerationDashboard = showTestGenerationDashboard;
window.showManageStudiedChapters = showManageStudiedChapters;
window.showExamsDashboard = showExamsDashboard;
window.showProgressDashboard = showProgressDashboard;
window.showManageSubjects = showManageSubjects;
window.showUserProfileDashboard = showUserProfileDashboard;
window.closeDashboard = closeDashboard;
window.initializeApp = initializeApp;

// Course UI Functions
window.showBrowseCourses = showBrowseCourses;
window.showAddCourseForm = showAddCourseForm;
window.submitNewCourse = submitNewCourse;
window.handleCourseSearch = handleCourseSearch;
window.showCourseDetails = showCourseDetails;
window.handleReportCourse = handleReportCourse;
window.handleCourseApproval = handleCourseApproval; // Admin action

// Test Generation
window.promptTestType = promptTestType;
window.promptChapterSelectionForTest = promptChapterSelectionForTest;
window.getSelectedChaptersAndPromptTestType = getSelectedChaptersAndPromptTestType;
window.startTestGeneration = startTestGeneration;

// PDF / TeX Generation
window.downloadTexFileWrapper = downloadTexFile;
// PDF generation attached dynamically

// Online Test
window.navigateQuestion = navigateQuestion;
window.recordAnswer = recordAnswer;
window.confirmSubmitOnlineTest = confirmSubmitOnlineTest;
window.confirmForceSubmit = confirmForceSubmit;

// Exams Dashboard
window.enterResultsForm = enterResultsForm;
window.submitPendingResults = submitPendingResults;
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
window.signOutUserWrapper = signOutUser;

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
window.handleMarkRead = handleMarkRead;
window.promptAdminReply = promptAdminReply;

// --- Dynamic UI Updates ---
export function updateAdminPanelVisibility() {
    const adminPanelLink = document.getElementById('admin-panel-link');
    const currentUserFromState = currentUser; // Use state variable
    if (adminPanelLink) {
        const isAdmin = currentUserFromState && currentUserFromState.uid === ADMIN_UID;
        adminPanelLink.style.display = isAdmin ? 'flex' : 'none';
    }
    // Update user info in header to potentially show/hide admin icon
    if (currentUserFromState) {
        fetchAndUpdateUserInfo(currentUserFromState);
    }
}


// --- Auth Form Handling ---
function attachAuthListeners() {
    // ... (function remains the same) ...
    console.log("Attempting to attach auth listeners...");
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const googleButton = document.getElementById('google-signin-button');

    if (loginForm && !loginForm.dataset.listenerAttached) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const identifier = document.getElementById('login-identifier')?.value;
            const password = document.getElementById('login-password')?.value;
            if (!identifier || !password) { alert("Please enter both identifier and password."); return; }
            signInUser(identifier, password).catch(err => console.error("Sign in submit error:", err));
        });
        loginForm.dataset.listenerAttached = 'true';
        console.log("Login form listener attached.");
    } else if (!loginForm) { console.warn("Login form (#login-form) NOT found."); }

    if (signupForm && !signupForm.dataset.listenerAttached) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('signup-username')?.value;
            const email = document.getElementById('signup-email')?.value;
            const password = document.getElementById('signup-password')?.value;
            if (!username || !email || !password) { alert("Please fill in all signup fields."); return; }
            if (password.length < 6) { alert("Password must be at least 6 characters."); return; }
            signUpUser(username, email, password).catch(err => console.error("Sign up submit error:", err));
         });
         signupForm.dataset.listenerAttached = 'true';
         console.log("Signup form listener attached.");
    } else if (!signupForm) { console.warn("Signup form (#signup-form) NOT found."); }

    if (googleButton && !googleButton.dataset.listenerAttached) {
        googleButton.addEventListener('click', () => { signInWithGoogle(); });
        googleButton.dataset.listenerAttached = 'true';
        console.log("Google button listener attached.");
    } else if (!googleButton) { console.warn("Google Sign-in button (#google-signin-button) NOT found."); }

    console.log("Finished attempting to attach auth listeners.");
}

// --- Run Initialization & Attach Listeners ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeApp();
        attachAuthListeners();
    });
} else {
    initializeApp();
    attachAuthListeners();
}
// --- END OF FILE script.js ---