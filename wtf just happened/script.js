// --- START OF FILE script.js ---

// Ensure global Firebase auth/db are set from window (initialized in index.html)
import { setAuth, setDb } from './state.js';
if (window.auth && window.db) {
    setAuth(window.auth);
    setDb(window.db);
} else {
    console.error('Firebase auth/db not found on window. Initialization may have failed.');
}

// script.js
// --- Core State & Config Imports ---
import { auth, db, currentUser, currentSubject, activeCourseId, userCourseProgressMap } from './state.js';
import { ADMIN_UID, FOP_COURSE_ID } from './config.js';

// --- Utility Imports ---
import { showLoading, hideLoading, escapeHtml, renderMathIn } from './utils.js'; // Added renderMathIn

// --- Firebase Imports ---
import { setupAuthListener, signInUser, signUpUser, signInWithGoogle, signOutUser } from './firebase_auth.js';
// CORRECTED Imports: Added saveCourseExamResult, get/save StoredChapterContent
import { saveUserData, loadUserData, initializeUserData, submitFeedback, sendAdminReply, markMessageAsRead, updateCourseDefinition, saveUserCourseProgress, loadAllUserCourseProgress, loadGlobalCourseDefinitions, markChapterStudiedInCourse, unenrollFromCourse, updateCourseStatusForUser, handleAddBadgeForUser, handleRemoveBadgeForUser, saveCourseExamResult, getStoredChapterContent, saveStoredChapterContent } from './firebase_firestore.js'; // Added new functions

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
    promptFeedback, triggerAIExplanationWrapper, promptAdminEditAnswerPlaceholder,
    triggerProblemAIGrade // Import AI grading trigger
} from './ui_exams_dashboard.js';
import { showManageStudiedChapters, toggleStudiedChapter } from './ui_studied_chapters.js';
import { showManageSubjects, selectSubject, editSubject, updateSubject, addSubject, confirmDeleteSubject, deleteSubject } from './ui_subjects.js';
import { showProgressDashboard, closeDashboard, renderCharts } from './ui_progress_dashboard.js';
import { showUserProfileDashboard, updateUserProfile } from './ui_user_profile.js';
import { showOnboardingUI, showAddSubjectComingSoon, completeOnboarding } from './ui_onboarding.js';
// Added handleAdminMarkCourseComplete, loadUserBadgesForAdmin, promptAddBadge, handleAddBadgeForUser, confirmRemoveBadge, handleRemoveBadgeForUser
import { showAdminDashboard, promptAdminReply, handleAdminMarkCourseComplete, loadUserCoursesForAdmin, loadUserBadgesForAdmin, promptAddBadge, confirmRemoveBadge, loadPlaylistForAdmin, toggleSelectAllVideos, toggleVideoSelection, handleAssignVideoToChapter, handleUnassignVideoFromChapter } from './ui_admin_dashboard.js'; // Added Playlist functions
import { showBrowseCourses, showAddCourseForm, submitNewCourse, handleCourseSearch, showCourseDetails, handleReportCourse, handleCourseApproval, showEditCourseForm, handleUpdateCourse } from './ui_courses.js';
import { showInbox, handleMarkRead } from './ui_inbox.js';
// NEW: Import Profile Picture Cropping UI
import { handleProfilePictureSelect } from './ui_profile_picture.js';

// --- Course UI Imports ---
// Renamed showCurrentStudyMaterial to showNextLesson in dashboard import
// CORRECTED Imports: Added trigger/download functions from dashboard
import { showMyCoursesDashboard, showCurrentCourseDashboard, showNextLesson, showFullStudyMaterial, showCurrentAssignmentsExams, showCurrentCourseProgress, navigateToCourseDashboard, handleCourseAction, confirmUnenroll, toggleNotesPanel, handleMyNoteUpload, reviewMyNote, downloadLatexSource, triggerFormulaSheetGeneration, triggerChapterSummaryGeneration, downloadGeneratedContentPdfWrapper } from './ui_course_dashboard.js'; // Added new imports
import { showCourseEnrollment, handlePaceSelection } from './ui_course_enrollment.js';
// CORRECTED Imports: Added displayChapterSummary, removed duplicated displayFormulaSheet
import {
     showCourseStudyMaterial, handleExplainSelection,
     navigateChapterMaterial, loadYouTubeAPI, handleVideoWatched, // handleVideoWatched ADDED
     initPdfViewer, cleanupPdfViewer, handlePdfSnapshotForAI,
     triggerSkipExamGeneration, askQuestionAboutTranscription, // Added export for triggerSkipExamGeneration
     handleTranscriptionClick, highlightTranscriptionLine, // Removed downloadFormulaSheetPdf call here
     calculateChapterCombinedProgress, getYouTubeVideoId, displayChapterSummary // ADDED displayChapterSummary
} from './ui_course_study_material.js';
import { showCourseAssignmentsExams, startAssignmentOrExam } from './ui_course_assignments_exams.js';
import { showCourseProgressDetails, renderCourseCharts } from './ui_course_progress.js'; // Added renderCourseCharts
// NEW: Import for the content menu UI
import { displayCourseContentMenu } from './ui_course_content_menu.js';
// NEW: Import for Course Exam Review UI
import { showCourseExamDetails, triggerCourseAIExplanation, triggerCourseProblemAIGrade as triggerCourseProblemAIGradeReview } from './ui_course_exam_review.js'; // Renamed import


// --- Initialization ---

async function initializeApp() {
    console.log("Initializing Lyceum (Module)...");
    showLoading("Initializing...");

    // --- Theme Initialization ---
    const themeToggle = document.getElementById('theme-toggle');
    if (
        localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
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
                renderCharts();
            }
        });
        themeToggle.dataset.listenerAttached = 'true';
    }

    // --- Mobile Menu Initialization ---
    const menuButton = document.getElementById('mobile-menu-button');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (menuButton && sidebar && overlay && !menuButton.dataset.listenerAttached) {
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('is-open');
            sidebar.classList.toggle('hidden');
            overlay.classList.toggle('is-visible');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('is-open');
            sidebar.classList.add('hidden');
            overlay.classList.remove('is-visible');
        });
        sidebar.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 768) {
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

    // --- Firebase Initialization ---
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
        window.auth = firebase.auth();
        window.db = firebase.firestore();
        setupAuthListener();
    } catch (e) {
        console.error("Firebase Services Access Failed in script.js:", e);
        alert("Error accessing Firebase services: " + e.message);
        hideLoading();
        return;
    }

    // --- Mermaid.js Initialization ---
    if (typeof mermaid !== 'undefined') {
        try {
            mermaid.initialize({
                startOnLoad: false,
                theme: 'base',
                themeVariables: { darkMode: document.documentElement.classList.contains('dark') }
            });
            console.log("Mermaid initialized.");
            themeToggle?.addEventListener('click', () => {
                mermaid.initialize({
                    theme: 'base',
                    themeVariables: { darkMode: document.documentElement.classList.contains('dark') }
                });
            });
        } catch (mermaidError) {
            console.error("Error initializing Mermaid:", mermaidError);
        }
    } else {
        window.addEventListener('load', () => {
            if (typeof mermaid !== 'undefined') {
                try {
                    mermaid.initialize({
                        startOnLoad: false,
                        theme: 'base',
                        themeVariables: { darkMode: document.documentElement.classList.contains('dark') }
                    });
                    console.log("Mermaid initialized (on window load).");
                } catch (mermaidError) {
                    console.error("Error initializing Mermaid (on window load):", mermaidError);
                }
            } else {
                console.error("Mermaid library failed to load.");
            }
        });
    }

    // --- Load YouTube API (async) ---
    loadYouTubeAPI();

    console.log("initializeApp finished basic setup. Waiting for Auth state...");
}

// --- Global Function Assignments ---
// Ensure all functions called by onclick attributes in HTML are assigned to the window scope

// Core UI / Navigation (Standard Test Gen)
window.showHomeDashboard = showHomeDashboard;
window.showTestGenerationDashboard = showTestGenerationDashboard;
window.showManageStudiedChapters = showManageStudiedChapters;
window.showExamsDashboard = showExamsDashboard;
window.showProgressDashboard = showProgressDashboard;
window.showManageSubjects = showManageSubjects;
window.showUserProfileDashboard = showUserProfileDashboard;
window.closeDashboard = closeDashboard;
window.initializeApp = initializeApp;
window.renderCharts = renderCharts;

// Course UI Functions
window.showMyCoursesDashboard = showMyCoursesDashboard;
window.showBrowseCourses = showBrowseCourses;
window.showAddCourseForm = showAddCourseForm;
window.showEditCourseForm = showEditCourseForm;
window.submitNewCourse = submitNewCourse;
window.handleUpdateCourse = handleUpdateCourse;
window.handleCourseSearch = handleCourseSearch;
window.showCourseDetails = showCourseDetails;
window.handleReportCourse = handleReportCourse;
window.handleCourseApproval = handleCourseApproval;
window.showCourseEnrollment = showCourseEnrollment;
window.handlePaceSelection = handlePaceSelection;
window.navigateToCourseDashboard = navigateToCourseDashboard;
window.handleCourseAction = handleCourseAction;
window.confirmUnenroll = confirmUnenroll;
window.toggleNotesPanel = toggleNotesPanel;
window.handleMyNoteUpload = handleMyNoteUpload;
window.reviewMyNote = reviewMyNote;
window.downloadLatexSource = downloadLatexSource;
window.triggerFormulaSheetGeneration = triggerFormulaSheetGeneration;
window.triggerChapterSummaryGeneration = triggerChapterSummaryGeneration;
window.downloadGeneratedContentPdfWrapper = downloadGeneratedContentPdfWrapper; // Ensure this is assigned

// Course-Specific Dashboard Navigation
window.showCurrentCourseDashboard = showCurrentCourseDashboard;
window.showNextLesson = showNextLesson;
window.showFullStudyMaterial = showFullStudyMaterial;
window.showCurrentAssignmentsExams = showCurrentAssignmentsExams;
window.showCurrentCourseProgress = showCurrentCourseProgress;

// Course Study Material Functions
window.showCourseStudyMaterial = showCourseStudyMaterial;
// window.displayFormulaSheet = displayFormulaSheet; // Handled by trigger func
window.displayChapterSummary = displayChapterSummary; // Handled by trigger func
window.handleExplainSelection = handleExplainSelection;
window.navigateChapterMaterial = navigateChapterMaterial;
window.handleVideoWatched = handleVideoWatched;
window.initPdfViewer = initPdfViewer;
window.cleanupPdfViewer = cleanupPdfViewer;
window.handlePdfSnapshotForAI = handlePdfSnapshotForAI;
window.triggerSkipExamGeneration = triggerSkipExamGeneration; // Now exported
window.askQuestionAboutTranscription = askQuestionAboutTranscription;
window.handleTranscriptionClick = handleTranscriptionClick;
window.highlightTranscriptionLine = highlightTranscriptionLine;
window.calculateChapterCombinedProgress = calculateChapterCombinedProgress;
window.getYouTubeVideoId = getYouTubeVideoId;
window.toggleTranscriptionView = toggleTranscriptionView;

// Course Assignments/Exams Functions
window.showCourseAssignmentsExams = showCourseAssignmentsExams;
window.startAssignmentOrExam = startAssignmentOrExam;

// Course Progress Functions
window.showCourseProgressDetails = showCourseProgressDetails;
window.renderCourseCharts = renderCourseCharts;

// Course Content Menu Function
window.displayCourseContentMenu = displayCourseContentMenu;

// Course Exam Review Functions
window.showCourseExamDetails = showCourseExamDetails;
window.triggerCourseAIExplanation = triggerCourseAIExplanation;
window.triggerCourseProblemAIGrade = triggerCourseProblemAIGradeReview;

// Test Generation (Standard)
window.promptTestType = promptTestType;
window.promptChapterSelectionForTest = promptChapterSelectionForTest;
window.getSelectedChaptersAndPromptTestType = getSelectedChaptersAndPromptTestType;
window.startTestGeneration = startTestGeneration;

// PDF / TeX Generation (Standard)
window.downloadTexFileWrapper = downloadTexFile;

// Online Test (Shared)
window.navigateQuestion = navigateQuestion;
window.recordAnswer = recordAnswer;
window.confirmSubmitOnlineTest = confirmSubmitOnlineTest;
window.confirmForceSubmit = confirmForceSubmit;
window.submitOnlineTest = submitOnlineTest;

// Exams Dashboard (Standard Test Gen)
window.enterResultsForm = enterResultsForm;
window.submitPendingResults = submitPendingResults;
window.showExamDetailsWrapper = async (index) => { if (index !== null && index >= 0 && typeof showExamDetails === 'function') { await showExamDetails(index); } else { console.error("showExamDetails function not available or index invalid."); } };
window.confirmDeletePendingExam = confirmDeletePendingExam;
window.confirmDeleteCompletedExam = confirmDeleteCompletedExam;
window.overrideQuestionCorrectness = overrideQuestionCorrectness;
window.promptFeedback = promptFeedback;
window.triggerAIExplanation = triggerAIExplanationWrapper;
window.triggerProblemAIGrade = triggerProblemAIGrade;
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
window.handleProfilePictureSelect = handleProfilePictureSelect;

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
window.handleAdminMarkCourseComplete = handleAdminMarkCourseComplete;
window.loadUserCoursesForAdmin = loadUserCoursesForAdmin;
window.loadUserBadgesForAdmin = loadUserBadgesForAdmin;
window.promptAddBadge = promptAddBadge;
window.handleAddBadgeForUser = handleAddBadgeForUser;
window.confirmRemoveBadge = confirmRemoveBadge;
window.handleRemoveBadgeForUser = handleRemoveBadgeForUser;
window.loadPlaylistForAdmin = loadPlaylistForAdmin;
window.toggleSelectAllVideos = toggleSelectAllVideos;
window.toggleVideoSelection = toggleVideoSelection;
window.handleAssignVideoToChapter = handleAssignVideoToChapter;
window.handleUnassignVideoFromChapter = handleUnassignVideoFromChapter;

// Utility Functions
window.renderMathIn = renderMathIn;


// --- Dynamic UI Updates ---
export function updateAdminPanelVisibility() {
    const adminPanelLink = document.getElementById('admin-panel-link');
    const adminIcon = document.getElementById('admin-indicator-icon');
    const stateCurrentUser = currentUser;
    const isAdmin = stateCurrentUser && stateCurrentUser.uid === ADMIN_UID;
    if (adminPanelLink) { adminPanelLink.style.display = isAdmin ? 'flex' : 'none'; }
    if (adminIcon) { adminIcon.style.display = isAdmin ? 'inline-block' : 'none'; }
    if (stateCurrentUser) { fetchAndUpdateUserInfo(stateCurrentUser); }
}


// --- Auth Form Handling ---
function attachAuthListeners() {
    console.log("Attempting to attach auth listeners...");
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const googleButton = document.getElementById('google-signin-button');
    if (loginForm && !loginForm.dataset.listenerAttached) { /* ... listener ... */ loginForm.dataset.listenerAttached = 'true'; console.log("Login form listener attached."); }
    if (signupForm && !signupForm.dataset.listenerAttached) { /* ... listener ... */ signupForm.dataset.listenerAttached = 'true'; console.log("Signup form listener attached."); }
    if (googleButton && !googleButton.dataset.listenerAttached) { googleButton.addEventListener('click', signInWithGoogle); googleButton.dataset.listenerAttached = 'true'; console.log("Google signin listener attached."); }
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