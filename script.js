// --- START OF FILE script.js ---

// script.js
// --- Core State & Config Imports ---
import { setAuth, setDb, auth, db, currentUser, currentSubject, activeCourseId } from './state.js';
import { ADMIN_UID, FOP_COURSE_ID } from './config.js';

// --- Utility Imports ---
import { showLoading, hideLoading, escapeHtml } from './utils.js';

// --- Firebase Imports ---
import { setupAuthListener, signInUser, signUpUser, signInWithGoogle, signOutUser } from './firebase_auth.js';
// Added unenrollFromCourse, updateCourseStatusForUser
import { saveUserData, loadUserData, initializeUserData, submitFeedback, sendAdminReply, markMessageAsRead, updateCourseDefinition, saveUserCourseProgress, loadAllUserCourseProgress, loadGlobalCourseDefinitions, markChapterStudiedInCourse, unenrollFromCourse, updateCourseStatusForUser } from './firebase_firestore.js';

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
// Added handleAdminMarkCourseComplete, loadUserBadgesForAdmin, promptAddBadge, handleAddBadgeForUser, confirmRemoveBadge, handleRemoveBadgeForUser
import { showAdminDashboard, promptAdminReply, handleAdminMarkCourseComplete, loadUserCoursesForAdmin, loadUserBadgesForAdmin, promptAddBadge, handleAddBadgeForUser, confirmRemoveBadge, handleRemoveBadgeForUser } from './ui_admin_dashboard.js';
import { showBrowseCourses, showAddCourseForm, submitNewCourse, handleCourseSearch, showCourseDetails, handleReportCourse, handleCourseApproval, showEditCourseForm, handleUpdateCourse } from './ui_courses.js';
import { showInbox, handleMarkRead } from './ui_inbox.js';

// --- Course UI Imports ---
// Renamed showCurrentStudyMaterial to showNextLesson in dashboard import
import { showMyCoursesDashboard, showCurrentCourseDashboard, showNextLesson, showFullStudyMaterial, showCurrentAssignmentsExams, showCurrentCourseProgress, navigateToCourseDashboard, handleCourseAction, confirmUnenroll } from './ui_course_dashboard.js';
import { showCourseEnrollment, handlePaceSelection } from './ui_course_enrollment.js';
// Actual function name remains showCourseStudyMaterial here as it displays specific chapter content
import {
     showCourseStudyMaterial, displayFormulaSheet, handleExplainSelection,
     navigateChapterMaterial, loadYouTubeAPI, handleVideoWatched,
     initPdfViewer, cleanupPdfViewer, handlePdfSnapshotForAI, // Corrected export name
     triggerSkipExamGeneration, askQuestionAboutTranscription // Added askQuestionAboutTranscription
} from './ui_course_study_material.js';
import { showCourseAssignmentsExams, startAssignmentOrExam } from './ui_course_assignments_exams.js';
import { showCourseProgressDetails, renderCourseCharts } from './ui_course_progress.js'; // Added renderCourseCharts
// NEW: Import for the content menu UI
import { displayCourseContentMenu } from './ui_course_content_menu.js';


// --- Initialization ---

async function initializeApp() {
    console.log("Initializing Lyceum (Module)..."); // MODIFIED Name
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
             const courseProgressCanvas = document.getElementById('assignmentScoresChart');

             if (progressDash && !progressDash.classList.contains('hidden')) {
                renderCharts();
             }
             if (courseDashArea && !courseDashArea.classList.contains('hidden') && courseProgressCanvas && typeof window.renderCourseCharts === 'function') {
                 console.log("Theme changed, attempting to re-render course charts if visible.");
                 if(window.userCourseProgressMap && window.activeCourseId && window.userCourseProgressMap.has(window.activeCourseId)) {
                     renderCourseCharts(window.userCourseProgressMap.get(window.activeCourseId));
                 } else {
                     console.warn("Could not re-render course charts: active course ID or progress data missing.");
                 }
             }

            // Re-initialize Mermaid theme
             if (typeof mermaid !== 'undefined') {
                  mermaid.initialize({
                    startOnLoad: false, // Don't auto-render on load
                    theme: isDark ? 'dark' : 'default', // Or 'neutral', 'forest'
                    securityLevel: 'loose', // Allow scripts if needed, use 'strict' or 'antiscript' for safety
                    themeVariables: {
                        darkMode: isDark,
                        primaryColor: isDark ? '#0ea5e9' : '#0284c7', // Example primary color mapping
                        primaryTextColor: isDark ? '#e5e7eb' : '#ffffff', // Example text on primary
                        lineColor: isDark ? '#64748b' : '#9ca3af', // Example line color
                        mainBkg: isDark ? '#1e293b' : '#ffffff', // Example background
                        textColor: isDark ? '#cbd5e1' : '#374151', // Example default text
                    }
                 });
                 console.log(`Mermaid theme re-initialized to: ${isDark ? 'dark' : 'default'}`);
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
             sidebar.classList.toggle('is-open');
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
                // Always close sidebar on link click, regardless of screen size,
                // because the button is now always visible.
                sidebar.classList.remove('is-open');
                sidebar.classList.add('hidden');
                overlay.classList.remove('is-visible');
            });
         });
          menuButton.dataset.listenerAttached = 'true';
     } else if (!menuButton || !sidebar || !overlay) {
          console.warn("Mobile menu elements not found during initialization.");
     }

    // Firebase Init (Unchanged)
    if (typeof firebase === 'undefined' || !firebase.app) {
         hideLoading();
         console.error("Firebase SDK not loaded! Ensure Firebase scripts are included correctly in index.html.");
         alert("Fatal Error: Firebase cannot be initialized. Please check the console.");
         return;
     }
    try {
        if (firebase.apps.length === 0) {
              hideLoading();
              console.error("Firebase app not initialized! Check your firebaseConfig in index.html.");
              alert("Fatal Error: Firebase configuration is missing or incorrect.");
              return;
         }
        setAuth(firebase.auth());
        setDb(firebase.firestore());
        window.auth = firebase.auth();
        window.db = firebase.firestore();
        setupAuthListener();
    } catch (e) {
        hideLoading();
        console.error("Firebase initialization error:", e);
        alert("Error initializing Firebase services: " + e.message);
    }

    // Initialize Mermaid.js (Unchanged)
     if (typeof mermaid !== 'undefined') {
         const isDark = document.documentElement.classList.contains('dark');
         mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' });
         console.log("Mermaid initialized.");
     } else {
         console.warn("Mermaid not loaded yet. Will initialize later if needed.");
         // Potentially retry initialization later or rely on on-demand rendering
     }

    // Load YouTube API Async (Unchanged)
    loadYouTubeAPI();

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
window.confirmUnenroll = confirmUnenroll; // NEW: Assign unenroll confirm

// Course-Specific Dashboard Navigation (called from sidebar)
window.showCurrentCourseDashboard = showCurrentCourseDashboard;
window.showNextLesson = showNextLesson; // RENAMED function call
window.showFullStudyMaterial = showFullStudyMaterial; // NEW function call
window.showCurrentAssignmentsExams = showCurrentAssignmentsExams;
window.showCurrentCourseProgress = showCurrentCourseProgress;

// Course Study Material Functions
window.showCourseStudyMaterial = showCourseStudyMaterial; // The function that displays a specific chapter
window.displayFormulaSheet = displayFormulaSheet;
window.handleExplainSelection = handleExplainSelection;
window.navigateChapterMaterial = navigateChapterMaterial;
window.handleVideoWatched = handleVideoWatched;
window.initPdfViewer = initPdfViewer;
window.cleanupPdfViewer = cleanupPdfViewer;
window.handlePdfSnapshotForAI = handlePdfSnapshotForAI;
window.triggerSkipExamGeneration = triggerSkipExamGeneration;
window.askQuestionAboutTranscription = askQuestionAboutTranscription; // Added

// Course Assignments/Exams Functions
window.startAssignmentOrExam = startAssignmentOrExam;

// Course Progress Functions
window.showCourseProgressDetails = showCourseProgressDetails;
window.renderCourseCharts = renderCourseCharts;

// Course Content Menu Function
window.displayCourseContentMenu = displayCourseContentMenu; // NEW


// Test Generation (Standard)
window.promptTestType = promptTestType;
window.promptChapterSelectionForTest = promptChapterSelectionForTest;
window.getSelectedChaptersAndPromptTestType = getSelectedChaptersAndPromptTestType;
window.startTestGeneration = startTestGeneration;

// PDF / TeX Generation (Standard)
window.downloadTexFileWrapper = downloadTexFile;
// PDF generation attached dynamically via event listeners in ui_test_generation.js

// Online Test (Shared)
window.navigateQuestion = navigateQuestion;
window.recordAnswer = recordAnswer;
window.confirmSubmitOnlineTest = confirmSubmitOnlineTest;
window.confirmForceSubmit = confirmForceSubmit;
window.submitOnlineTest = submitOnlineTest;

// Exams Dashboard (Standard Test Gen)
window.enterResultsForm = enterResultsForm;
window.submitPendingResults = submitPendingResults;
window.showExamDetailsWrapper = async (index) => { if (index !== null && index >= 0) { await showExamDetails(index); } };
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
window.handleAdminMarkCourseComplete = handleAdminMarkCourseComplete; // NEW
// Badge Management (Admin)
window.loadUserCoursesForAdmin = loadUserCoursesForAdmin;
window.loadUserBadgesForAdmin = loadUserBadgesForAdmin;
window.promptAddBadge = promptAddBadge;
window.handleAddBadgeForUser = handleAddBadgeForUser;
window.confirmRemoveBadge = confirmRemoveBadge;
window.handleRemoveBadgeForUser = handleRemoveBadgeForUser;


// --- Dynamic UI Updates ---
export function updateAdminPanelVisibility() {
    const adminPanelLink = document.getElementById('admin-panel-link');
    const adminIcon = document.getElementById('admin-indicator-icon'); // Assuming an icon exists near the username
    const currentUserFromState = currentUser;

    const isAdmin = currentUserFromState && currentUserFromState.uid === ADMIN_UID;

    if (adminPanelLink) {
        adminPanelLink.style.display = isAdmin ? 'flex' : 'none';
    }
    // Toggle visibility of a dedicated admin icon if it exists
    if (adminIcon) {
         adminIcon.style.display = isAdmin ? 'inline-block' : 'none';
    }

    if (currentUserFromState) {
        fetchAndUpdateUserInfo(currentUserFromState); // Refresh user display (might add admin icon here too)
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
            const identifier = e.target.elements['login-identifier'].value;
            const password = e.target.elements['login-password'].value;
            signInUser(identifier, password);
        });
        loginForm.dataset.listenerAttached = 'true';
        console.log("Login form listener attached.");
    }
    if (signupForm && !signupForm.dataset.listenerAttached) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = e.target.elements['signup-username'].value;
            const email = e.target.elements['signup-email'].value;
            const password = e.target.elements['signup-password'].value;
            signUpUser(username, email, password);
        });
        signupForm.dataset.listenerAttached = 'true';
         console.log("Signup form listener attached.");
    }
    if (googleButton && !googleButton.dataset.listenerAttached) {
        googleButton.addEventListener('click', signInWithGoogle);
        googleButton.dataset.listenerAttached = 'true';
         console.log("Google signin listener attached.");
    }

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