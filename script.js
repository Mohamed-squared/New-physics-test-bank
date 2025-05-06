// --- START OF FILE script.js ---

// script.js
// --- Core State & Config Imports ---
import { setAuth, setDb, auth, db, currentUser, currentSubject, activeCourseId, userCourseProgressMap } from './state.js'; // Added userCourseProgressMap
import { ADMIN_UID, FOP_COURSE_ID } from './config.js';

// --- Utility Imports ---
import { showLoading, hideLoading, escapeHtml, renderMathIn } from './utils.js'; // Added renderMathIn

// --- Firebase Imports ---
import { setupAuthListener, signInUser, signUpUser, signInWithGoogle, signOutUser } from './firebase_auth.js';
// MODIFIED: Added adminUpdateUserSubjectStatus, updateUserCredits import
import { saveUserData, loadUserData, initializeUserData, submitFeedback, sendAdminReply, markMessageAsRead, updateCourseDefinition, saveUserCourseProgress, loadAllUserCourseProgress, loadGlobalCourseDefinitions, markChapterStudiedInCourse, unenrollFromCourse, updateCourseStatusForUser, handleAddBadgeForUser, handleRemoveBadgeForUser, loadUserNotes, saveUserNotes, loadSharedNotes, saveSharedNote, loadUserFormulaSheet, saveUserFormulaSheet, loadUserChapterSummary, saveUserChapterSummary, sendWelcomeGuideMessage, adminUpdateUserSubjectStatus, updateUserCredits } from './firebase_firestore.js';


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
// MODIFIED: Added handleSubjectApproval to import
import { showManageSubjects, selectSubject, editSubject, updateSubject, addSubject, confirmDeleteSubject, deleteSubject, handleSubjectApproval } from './ui_subjects.js';
import { showProgressDashboard, closeDashboard, renderCharts } from './ui_progress_dashboard.js';
import { showUserProfileDashboard, updateUserProfile } from './ui_user_profile.js';
import { showOnboardingUI, showAddSubjectComingSoon, completeOnboarding } from './ui_onboarding.js';
// MODIFIED: Added loadUserSubjectsForAdmin, handleAdminSubjectApproval
import { showAdminDashboard, promptAdminReply, handleAdminMarkCourseComplete, loadUserCoursesForAdmin, loadUserBadgesForAdmin, promptAddBadge, confirmRemoveBadge, loadUserSubjectsForAdmin, handleAdminSubjectApproval as handleAdminSubjectApprovalForUser } from './ui_admin_dashboard.js';
import { showBrowseCourses, showAddCourseForm, submitNewCourse, handleCourseSearch, showCourseDetails, handleReportCourse, handleCourseApproval, showEditCourseForm, handleUpdateCourse } from './ui_courses.js';
import { showInbox, handleMarkRead } from './ui_inbox.js';
import { handleProfilePictureSelect } from './ui_profile_picture.js';
import { showGlobalChat, sendChatMessage, deleteChatMessage } from './ui_chat.js';

// --- NEW Leaderboard/Marketplace Imports ---
import { showLeaderboard, showMarketplacePlaceholder } from './ui_leaderboard.js';

// --- NEW AI Chat Studio Import ---
import { showAiChatStudio } from './ui_ai_chat_studio.js';


// --- Course UI Imports ---
import { showMyCoursesDashboard, showCurrentCourseDashboard, showNextLesson, showFullStudyMaterial, showCurrentAssignmentsExams, showCurrentCourseProgress, navigateToCourseDashboard, handleCourseAction, confirmUnenroll } from './ui_course_dashboard.js';
import { showCourseEnrollment, handlePaceSelection } from './ui_course_enrollment.js';
import {
     showCourseStudyMaterial, displayFormulaSheet, handleExplainSelection,
     navigateChapterMaterial, loadYouTubeAPI, handleVideoWatched,
     initPdfViewer, cleanupPdfViewer, handlePdfSnapshotForAI,
     triggerSkipExamGeneration, askQuestionAboutTranscription,
     handleTranscriptionClick, highlightTranscriptionLine, downloadFormulaSheetPdf, getYouTubeVideoId,
     displayChapterSummary, downloadChapterSummaryPdf
} from './ui_course_study_material.js';
import { showCourseAssignmentsExams, startAssignmentOrExam } from './ui_course_assignments_exams.js';
import { showCourseProgressDetails, renderCourseCharts } from './ui_course_progress.js';
import { displayCourseContentMenu } from './ui_course_content_menu.js';
import { showNotesDocumentsPanel, addNewNoteWrapper, editNoteWrapper, saveNoteChangesWrapper, uploadNoteWrapper, deleteNoteWrapper, shareCurrentNoteWrapper, viewNoteWrapper, convertNoteToLatexWrapper, improveNoteWithAIWrapper, reviewNoteWithAIWrapper, downloadNoteAsTexWrapper, showCurrentNotesDocuments } from './ui_notes_documents.js';
import { showExamReviewUI, showIssueReportingModal, submitIssueReport, showAIExplanationSection } from './exam_storage.js';
import { convertNoteToLatex } from './ai_integration.js';
import { calculateChapterCombinedProgress } from './course_logic.js';


// --- Initialization ---

async function initializeApp() {
    console.log("Initializing Lyceum (Module)...");
    showLoading("Initializing...");

    const publicHomepageContainer = document.getElementById('public-homepage-container');
    if (publicHomepageContainer) {
        try {
            const response = await fetch('./public_homepage.html?t=' + new Date().getTime());
            if (response.ok) {
                const html = await response.text();
                publicHomepageContainer.innerHTML = html;
                const currentYearSpan = publicHomepageContainer.querySelector('#currentYear');
                if (currentYearSpan) {
                    currentYearSpan.textContent = new Date().getFullYear();
                }
            } else {
                console.error("Failed to load public_homepage.html:", response.status, response.statusText);
                publicHomepageContainer.innerHTML = `<p class="text-center text-red-500 p-8">Error: Could not load homepage content. Please try refreshing.</p>`;
            }
        } catch (error) {
            console.error("Error fetching public_homepage.html:", error);
            publicHomepageContainer.innerHTML = `<p class="text-center text-red-500 p-8">Error: Could not load homepage content. Please try refreshing.</p>`;
        }
    }


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

             const progressDash = document.getElementById('dashboard');
             const courseDashArea = document.getElementById('course-dashboard-area');
             const courseProgressCanvas = document.getElementById('assignmentScoresChart');

             if (progressDash && !progressDash.classList.contains('hidden')) {
                window.renderCharts();
             }
             if (courseDashArea && !courseDashArea.classList.contains('hidden') && courseProgressCanvas && typeof window.renderCourseCharts === 'function') {
                 console.log("Theme changed, attempting to re-render course charts if visible.");
                 if (userCourseProgressMap && activeCourseId && userCourseProgressMap.has(activeCourseId)) {
                     window.renderCourseCharts(userCourseProgressMap.get(activeCourseId));
                 } else {
                     console.warn("Could not re-render course charts: active course ID or progress data missing.", {
                         hasProgressMap: !!userCourseProgressMap,
                         activeCourseId,
                         hasActiveCourse: userCourseProgressMap?.has(activeCourseId)
                     });
                 }
             }

             if (typeof mermaid !== 'undefined') {
                  mermaid.initialize({
                    startOnLoad: false,
                    theme: isDark ? 'dark' : 'default',
                    securityLevel: 'loose',
                    themeVariables: {
                        darkMode: isDark,
                        primaryColor: isDark ? '#0ea5e9' : '#0284c7',
                        primaryTextColor: isDark ? '#e5e7eb' : '#ffffff',
                        lineColor: isDark ? '#64748b' : '#9ca3af',
                        mainBkg: isDark ? '#1e293b' : '#ffffff',
                        textColor: isDark ? '#cbd5e1' : '#374151',
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
             sidebar.classList.toggle('hidden');
             overlay.classList.toggle('is-visible');
         });
         overlay.addEventListener('click', () => {
             sidebar.classList.remove('is-open');
             sidebar.classList.add('hidden');
             overlay.classList.remove('is-visible');
         });
         sidebar.querySelectorAll('.sidebar-link, .sidebar-dropdown-toggle').forEach(link => {
             link.addEventListener('click', (e) => {
                 if (!e.currentTarget.classList.contains('sidebar-dropdown-toggle')) {
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

     if (typeof mermaid !== 'undefined') {
         const isDark = document.documentElement.classList.contains('dark');
         mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' });
         console.log("Mermaid initialized.");
     } else {
         console.warn("Mermaid not loaded yet. Will initialize later if needed.");
     }

    loadYouTubeAPI();

    console.log("initializeApp finished basic setup. Waiting for Auth state...");
}

// --- Global Function Assignments ---
window.showHomeDashboard = showHomeDashboard;
window.showTestGenerationDashboard = showTestGenerationDashboard;
window.showManageStudiedChapters = showManageStudiedChapters;
window.showExamsDashboard = showExamsDashboard;
window.showProgressDashboard = showProgressDashboard;
window.showManageSubjects = showManageSubjects;
window.showUserProfileDashboard = showUserProfileDashboard;
window.closeDashboard = closeDashboard;
window.initializeApp = initializeApp;
window.showLoginUI = showLoginUI;

// NEW Leaderboard / Marketplace assignments
window.showLeaderboard = showLeaderboard;
window.showMarketplacePlaceholder = showMarketplacePlaceholder;

// NEW AI Chat Studio assignment
window.showAiChatStudio = showAiChatStudio;


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

window.showCurrentCourseDashboard = showCurrentCourseDashboard;
window.showNextLesson = showNextLesson;
window.showFullStudyMaterial = showFullStudyMaterial;
window.showCurrentAssignmentsExams = showCurrentAssignmentsExams;
window.showCurrentCourseProgress = showCurrentCourseProgress;
window.showCurrentNotesDocuments = showCurrentNotesDocuments;

window.showCourseStudyMaterial = showCourseStudyMaterial;
window.displayFormulaSheet = displayFormulaSheet;
window.displayChapterSummary = displayChapterSummary;
window.handleExplainSelection = handleExplainSelection;
window.navigateChapterMaterial = navigateChapterMaterial;
window.handleVideoWatched = handleVideoWatched;
window.initPdfViewer = initPdfViewer;
window.cleanupPdfViewer = cleanupPdfViewer;
window.handlePdfSnapshotForAI = handlePdfSnapshotForAI;
window.triggerSkipExamGeneration = triggerSkipExamGeneration;
window.askQuestionAboutTranscription = askQuestionAboutTranscription;
window.handleTranscriptionClick = handleTranscriptionClick;
window.highlightTranscriptionLine = highlightTranscriptionLine;
window.downloadFormulaSheetPdf = downloadFormulaSheetPdf;
window.downloadChapterSummaryPdf = downloadChapterSummaryPdf;
window.getYouTubeVideoId = getYouTubeVideoId;

window.showCourseAssignmentsExams = showCourseAssignmentsExams;
window.startAssignmentOrExam = startAssignmentOrExam;

window.showCourseProgressDetails = showCourseProgressDetails;
window.renderCourseCharts = renderCourseCharts;

window.displayCourseContentMenu = displayCourseContentMenu;

window.showNotesDocumentsPanel = showNotesDocumentsPanel;
window.addNewNoteWrapper = addNewNoteWrapper;
window.editNoteWrapper = editNoteWrapper;
window.saveNoteChangesWrapper = saveNoteChangesWrapper;
window.uploadNoteWrapper = uploadNoteWrapper;
window.deleteNoteWrapper = deleteNoteWrapper;
window.shareCurrentNoteWrapper = shareCurrentNoteWrapper;
window.viewNoteWrapper = viewNoteWrapper;
window.convertNoteToLatexWrapper = convertNoteToLatexWrapper;
window.improveNoteWithAIWrapper = improveNoteWithAIWrapper;
window.reviewNoteWithAIWrapper = reviewNoteWithAIWrapper;
window.downloadNoteAsTexWrapper = downloadNoteAsTexWrapper;

window.showExamReviewUI = showExamReviewUI;
window.showAIExplanationSection = showAIExplanationSection;
window.reportQuestionIssue = showIssueReportingModal;
window.showIssueReportingModal = showIssueReportingModal;
window.submitIssueReport = submitIssueReport;


window.promptTestType = promptTestType;
window.promptChapterSelectionForTest = promptChapterSelectionForTest;
window.getSelectedChaptersAndPromptTestType = getSelectedChaptersAndPromptTestType;
window.startTestGeneration = startTestGeneration;

window.downloadTexFileWrapper = downloadTexFile;

window.navigateQuestion = navigateQuestion;
window.recordAnswer = recordAnswer;
window.confirmSubmitOnlineTest = confirmSubmitOnlineTest;
window.confirmForceSubmit = confirmForceSubmit;
window.submitOnlineTest = submitOnlineTest;

window.enterResultsForm = enterResultsForm;
window.submitPendingResults = submitPendingResults;
window.showExamDetailsWrapper = async (index) => { if (index !== null && index >= 0 && typeof showExamDetails === 'function') { await showExamDetails(index); } else { console.error("showExamDetails function not available or index invalid."); } };
window.confirmDeletePendingExam = confirmDeletePendingExam;
window.confirmDeleteCompletedExam = confirmDeleteCompletedExam;
window.overrideQuestionCorrectness = overrideQuestionCorrectness;
window.promptFeedback = promptFeedback;
window.triggerAIExplanation = triggerAIExplanationWrapper;
window.promptAdminEditAnswer = promptAdminEditAnswerPlaceholder;

window.toggleStudiedChapter = toggleStudiedChapter;

// Subject Management (Standard Test Gen)
window.selectSubject = selectSubject;
window.editSubject = editSubject;
window.updateSubject = updateSubject;
window.addSubject = addSubject;
window.confirmDeleteSubject = confirmDeleteSubject;
window.deleteSubject = deleteSubject;
// MODIFIED: Assign subject approval handler from ui_subjects
window.handleSubjectApproval = handleSubjectApproval;

window.updateUserProfile = updateUserProfile;
window.signOutUserWrapper = signOutUser;
window.handleProfilePictureSelect = handleProfilePictureSelect;
window.showInbox = showInbox;
window.handleMarkRead = handleMarkRead;
window.showGlobalChat = showGlobalChat;
window.sendChatMessage = sendChatMessage;
window.deleteChatMessage = deleteChatMessage;

window.importData = importData;
window.exportData = exportData;
window.showImportExportDashboard = showImportExportDashboard;

window.showAddSubjectComingSoon = showAddSubjectComingSoon;
window.completeOnboarding = completeOnboarding;

// Admin Dashboard Functions
window.showAdminDashboard = showAdminDashboard;
window.promptAdminReply = promptAdminReply;
window.handleAdminMarkCourseComplete = handleAdminMarkCourseComplete;
window.loadUserCoursesForAdmin = loadUserCoursesForAdmin;
window.loadUserBadgesForAdmin = loadUserBadgesForAdmin;
window.promptAddBadge = promptAddBadge;
window.handleAddBadgeForUser = handleAddBadgeForUser;
window.confirmRemoveBadge = confirmRemoveBadge;
window.handleRemoveBadgeForUser = handleRemoveBadgeForUser;
// MODIFIED: Assign subject management functions from ui_admin_dashboard
window.loadUserSubjectsForAdmin = loadUserSubjectsForAdmin;
window.handleAdminSubjectApproval = handleAdminSubjectApprovalForUser;

window.renderMathIn = renderMathIn;

window.toggleSidebarDropdown = function(contentId, arrowId) {
    const content = document.getElementById(contentId);
    const arrow = document.getElementById(arrowId);
    const button = arrow?.closest('.sidebar-dropdown-toggle');
    if (content && arrow && button) {
        const isOpen = content.classList.toggle('open');
        button.classList.toggle('open', isOpen);
        content.style.maxHeight = isOpen ? content.scrollHeight + "px" : "0";
        const hasActiveChild = content.querySelector('.sidebar-link.active-link');
        button.classList.toggle('active-parent', !!hasActiveChild);
    }
};

export function updateAdminPanelVisibility() {
    const adminPanelLink = document.getElementById('admin-panel-link');
    const adminIcon = document.getElementById('admin-indicator-icon');
    const stateCurrentUser = currentUser;

    const isAdmin = stateCurrentUser && (stateCurrentUser.uid === ADMIN_UID || stateCurrentUser.isAdmin === true);

    if (adminPanelLink) {
        adminPanelLink.style.display = isAdmin ? 'flex' : 'none';
    }
    if (adminIcon) {
         adminIcon.style.display = isAdmin ? 'inline-block' : 'none';
    }

    if (stateCurrentUser) {
        fetchAndUpdateUserInfo(stateCurrentUser);
    }
}


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