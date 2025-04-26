// --- START OF FILE script.js ---

// script.js
// --- Core State & Config Imports ---
import { setAuth, setDb, auth, db, currentUser, currentSubject, activeCourseId } from './state.js';
import { ADMIN_UID, FOP_COURSE_ID } from './config.js';

// --- Utility Imports ---
import { showLoading, hideLoading, escapeHtml } from './utils.js';

// --- Firebase Imports ---
import { setupAuthListener, signInUser, signUpUser, signInWithGoogle, signOutUser } from './firebase_auth.js';
import { saveUserData, loadUserData, initializeUserData, submitFeedback, sendAdminReply, markMessageAsRead, updateCourseDefinition, saveUserCourseProgress, loadAllUserCourseProgress, loadGlobalCourseDefinitions } from './firebase_firestore.js';

// --- UI Imports ---
import { importData, exportData, showImportExportDashboard } from './ui_import_export.js';
import { displayContent, clearContent, showLoginUI, hideLoginUI, updateSubjectInfo, setActiveSidebarLink, fetchAndUpdateUserInfo } from './ui_core.js';
import { showHomeDashboard } from './ui_home_dashboard.js';
import { showTestGenerationDashboard, promptChapterSelectionForTest, getSelectedChaptersAndPromptTestType, promptTestType, startTestGeneration } from './ui_test_generation.js';
import { generateAndDownloadPdfWithMathJax, downloadTexFile } from './ui_pdf_generation.js';
import { launchOnlineTestUI, navigateQuestion, recordAnswer, confirmSubmitOnlineTest, confirmForceSubmit, submitOnlineTest } from './ui_online_test.js';
import {
    showExamsDashboard, enterResultsForm, submitPendingResults, showExamDetails,
    confirmDeletePendingExam, confirmDeleteCompletedExam, overrideQuestionCorrectness,
    promptFeedback, triggerAIExplanationWrapper, promptAdminEditAnswerPlaceholder
} from './ui_exams_dashboard.js';
import { showManageStudiedChapters, toggleStudiedChapter } from './ui_studied_chapters.js';
import { showManageSubjects, selectSubject, editSubject, updateSubject, addSubject, confirmDeleteSubject, deleteSubject } from './ui_subjects.js';
import { showProgressDashboard, closeDashboard, renderCharts } from './ui_progress_dashboard.js';
import { showUserProfileDashboard, updateUserProfile } from './ui_user_profile.js';
import { showOnboardingUI, showAddSubjectComingSoon, completeOnboarding } from './ui_onboarding.js';
import { showAdminDashboard, promptAdminReply } from './ui_admin_dashboard.js';
import { showBrowseCourses, showAddCourseForm, submitNewCourse, handleCourseSearch, showCourseDetails, handleReportCourse, handleCourseApproval, showEditCourseForm, handleUpdateCourse } from './ui_courses.js';
import { showInbox, handleMarkRead } from './ui_inbox.js';

// --- NEW Course UI Imports ---
import { showMyCoursesDashboard, showCurrentCourseDashboard, showCurrentStudyMaterial, showCurrentAssignmentsExams, showCurrentCourseProgress, navigateToCourseDashboard, handleCourseAction } from './ui_course_dashboard.js';
import { showCourseEnrollment, handlePaceSelection } from './ui_course_enrollment.js';
import { showCourseStudyMaterial, displayFormulaSheet, handleExplainSelection, navigateChapterMaterial } from './ui_course_study_material.js';
import { showCourseAssignmentsExams, startAssignmentOrExam } from './ui_course_assignments_exams.js';
import { showCourseProgressDetails, renderCourseCharts } from './ui_course_progress.js'; // Added renderCourseCharts


// --- Initialization ---

async function initializeApp() {
    console.log("Initializing App (Module)...");
    showLoading("Initializing...");

    // Theme Init
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    if (themeToggle && !themeToggle.dataset.listenerAttached) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');

             // Re-render charts if dashboards are visible
             const progressDash = document.getElementById('dashboard');
             const courseDashArea = document.getElementById('course-dashboard-area');
             const courseProgressCanvas = document.getElementById('assignmentScoresChart'); // Check for a specific chart canvas

             if (progressDash && !progressDash.classList.contains('hidden')) {
                renderCharts(); // Re-render standard progress charts
             }
             if (courseDashArea && !courseDashArea.classList.contains('hidden') && courseProgressCanvas && typeof window.renderCourseCharts === 'function') {
                 // Re-render course charts - needs access to progress data
                 // This requires the showCourseProgressDetails function to be called again or state management
                 console.log("Theme changed, attempting to re-render course charts if visible.");
                 // Find the active course progress data to pass to renderCourseCharts
                 if(window.userCourseProgressMap && window.activeCourseId && window.userCourseProgressMap.has(window.activeCourseId)) {
                     renderCourseCharts(window.userCourseProgressMap.get(window.activeCourseId));
                 } else {
                     console.warn("Could not re-render course charts: active course ID or progress data missing.");
                 }
             }

            // Re-initialize Mermaid theme
             if (typeof mermaid !== 'undefined') {
                  try {
                      mermaid.initialize({ theme: 'base', themeVariables: { darkMode: isDark } });
                      // Attempt to re-render *visible* mermaid diagrams
                      document.querySelectorAll('.mermaid').forEach(el => {
                          // A simple check if the element or its parent is potentially visible
                          if (el.offsetParent !== null) {
                              try {
                                  // Re-fetch the definition from data attribute if stored there
                                  const definition = el.getAttribute('data-mermaid-def') || el.textContent;
                                  el.removeAttribute('data-processed'); // Allow mermaid to process again
                                  el.innerHTML = definition; // Reset content before rendering
                                  mermaid.run({ nodes: [el] }); // Use mermaid.run for specific nodes
                                  console.log(`Re-rendered Mermaid diagram: ${el.id || 'untitled'}`);
                              } catch (e) { console.error("Error re-rendering mermaid:", e); }
                          }
                      });
                  } catch (e) { console.error("Error re-initializing mermaid theme:", e); }
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
        window.auth = firebase.auth(); // Global access (use modules where possible)
        window.db = firebase.firestore(); // Global access
        setupAuthListener(); // This will trigger data loading and UI updates
    } catch (e) {
        console.error("Firebase Services Access Failed in script.js:", e);
        alert("Error accessing Firebase services: " + e.message);
        hideLoading();
        return;
    }

    // Initialize Mermaid.js
     if (typeof mermaid !== 'undefined') {
         try {
             const isDark = document.documentElement.classList.contains('dark');
             mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { darkMode: isDark } });
             console.log("Mermaid initialized.");
         } catch (mermaidError) {
             console.error("Error initializing Mermaid:", mermaidError);
         }
     } else {
         console.warn("Mermaid library not immediately available during initializeApp.");
         window.addEventListener('load', () => {
             if (typeof mermaid !== 'undefined') {
                 try {
                      const isDark = document.documentElement.classList.contains('dark');
                     mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { darkMode: isDark } });
                     console.log("Mermaid initialized (on window load).");
                 } catch (mermaidError) {
                     console.error("Error initializing Mermaid (on window load):", mermaidError);
                 }
             } else {
                  console.error("Mermaid library failed to load.");
             }
         });
     }

    console.log("initializeApp finished basic setup. Waiting for Auth state...");
}

// --- Global Function Assignments ---

// Core UI / Navigation (Standard Test Gen)
window.showHomeDashboard = showHomeDashboard;
window.showTestGenerationDashboard = showTestGenerationDashboard;
window.showManageStudiedChapters = showManageStudiedChapters;
window.showExamsDashboard = showExamsDashboard;
window.showProgressDashboard = showProgressDashboard; // Standard progress
window.showManageSubjects = showManageSubjects;
window.showUserProfileDashboard = showUserProfileDashboard;
window.closeDashboard = closeDashboard; // Closes standard progress dashboard
window.initializeApp = initializeApp;

// Course UI Functions
window.showMyCoursesDashboard = showMyCoursesDashboard; // List enrolled courses
window.showBrowseCourses = showBrowseCourses;
window.showAddCourseForm = showAddCourseForm; // Admin
window.showEditCourseForm = showEditCourseForm; // Admin
window.submitNewCourse = submitNewCourse; // Admin
window.handleUpdateCourse = handleUpdateCourse; // Admin
window.handleCourseSearch = handleCourseSearch;
window.showCourseDetails = showCourseDetails;
window.handleReportCourse = handleReportCourse;
window.handleCourseApproval = handleCourseApproval; // Admin
window.showCourseEnrollment = showCourseEnrollment; // User action
window.handlePaceSelection = handlePaceSelection; // User action from enrollment form
window.navigateToCourseDashboard = navigateToCourseDashboard;
window.handleCourseAction = handleCourseAction; // Handles buttons within course dash

// Course-Specific Dashboard Navigation (called from sidebar)
window.showCurrentCourseDashboard = showCurrentCourseDashboard;
window.showCurrentStudyMaterial = showCurrentStudyMaterial;
window.showCurrentAssignmentsExams = showCurrentAssignmentsExams;
window.showCurrentCourseProgress = showCurrentCourseProgress;

// Course Study Material Functions
window.displayFormulaSheet = displayFormulaSheet;
window.handleExplainSelection = handleExplainSelection;
window.navigateChapterMaterial = navigateChapterMaterial;

// Course Assignments/Exams Functions
window.startAssignmentOrExam = startAssignmentOrExam;

// Course Progress Functions
window.showCourseProgressDetails = showCourseProgressDetails;
window.renderCourseCharts = renderCourseCharts; // Make available for theme toggle


// Test Generation (Standard)
window.promptTestType = promptTestType;
window.promptChapterSelectionForTest = promptChapterSelectionForTest;
window.getSelectedChaptersAndPromptTestType = getSelectedChaptersAndPromptTestType;
window.startTestGeneration = startTestGeneration;

// PDF / TeX Generation (Standard)
window.downloadTexFileWrapper = downloadTexFile;
// PDF generation attached dynamically via event listeners

// Online Test (Shared)
window.navigateQuestion = navigateQuestion;
window.recordAnswer = recordAnswer;
window.confirmSubmitOnlineTest = confirmSubmitOnlineTest;
window.confirmForceSubmit = confirmForceSubmit;
window.submitOnlineTest = submitOnlineTest;

// Exams Dashboard (Standard Test Gen)
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

// Studied Chapters (Standard Test Gen)
window.toggleStudiedChapter = toggleStudiedChapter;

// Subject Management (Standard Test Gen)
window.selectSubject = selectSubject;
window.editSubject = editSubject;
window.updateSubject = updateSubject;
window.addSubject = addSubject;
window.confirmDeleteSubject = confirmDeleteSubject;
window.deleteSubject = deleteSubject;

// User Profile / Auth
window.updateUserProfile = updateUserProfile;
window.signOutUserWrapper = signOutUser;

// Import/Export (Standard Test Gen Data)
window.importData = importData;
window.exportData = exportData;
window.showImportExportDashboard = showImportExportDashboard;

// Onboarding (Initial Setup)
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
    const currentUserFromState = currentUser;
    if (adminPanelLink) {
        const isAdmin = currentUserFromState && currentUserFromState.uid === ADMIN_UID;
        adminPanelLink.style.display = isAdmin ? 'flex' : 'none';
    }
    if (currentUserFromState) {
        fetchAndUpdateUserInfo(currentUserFromState);
    }
}


// --- Auth Form Handling ---
function attachAuthListeners() {
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