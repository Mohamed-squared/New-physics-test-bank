// script.js
// --- Core State & Config Imports ---
import {
    setAuth, setDb, auth, db, currentUser,
    currentSubject, activeCourseId, userCourseProgressMap,
    setGlobalAiSystemPrompts, courseExamDefaults, 
    musicPlayerState, setMusicPlayerState 
} from './state.js';
import { ADMIN_UID, FOP_COURSE_ID,
    DEFAULT_UI_SOUNDS_ENABLED, DEFAULT_AMBIENT_SOUND_VOLUME, DEFAULT_MUSIC_VOLUME,
    DEFAULT_EXPERIMENTAL_FEATURES // NEW IMPORT
} from './config.js';


// --- Utility Imports ---
import { showLoading, hideLoading, escapeHtml, renderMathIn } from './utils.js';

// --- Firebase Imports ---
import { setupAuthListener, signInUser, signUpUser, signInWithGoogle, signOutUser } from './firebase_auth.js';
import {
    saveUserData, loadUserData, initializeUserData, submitFeedback, sendAdminReply, markMessageAsRead,
    updateCourseDefinition, saveUserCourseProgress, loadAllUserCourseProgress, loadGlobalCourseDefinitions,
    markChapterStudiedInCourse, unenrollFromCourse, updateCourseStatusForUser, handleAddBadgeForUser,
    handleRemoveBadgeForUser, loadUserNotes, saveUserNotes, loadSharedNotes, saveSharedNote,
    sendWelcomeGuideMessage, adminUpdateUserSubjectStatus, updateUserCredits, loadGlobalAiPrompts,
    loadCourseExamDefaults, loadGlobalSubjectDefinitionsFromFirestore
} from './firebase_firestore.js';


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
import { showManageSubjects, selectSubject, editSubject, updateSubject, addSubject, confirmDeleteSubject, deleteSubject, handleSubjectApproval } from './ui_subjects.js';
import { showProgressDashboard, closeDashboard, renderCharts } from './ui_progress_dashboard.js';
import { showUserProfileDashboard, updateUserProfile, confirmSelfDeleteAccount } from './ui_user_profile.js'; // Added confirmSelfDeleteAccount
import { showOnboardingUI, showAddSubjectComingSoon, completeOnboarding } from './ui_onboarding.js';
import { showAdminDashboard, promptAdminReply as promptAdminModerationReply, handleAdminMarkCourseComplete, loadUserCoursesForAdmin, loadUserBadgesForAdmin, promptAddBadge, confirmRemoveBadge, loadUserSubjectsForAdmin, handleAdminUserSubjectApproval as handleAdminSubjectApprovalForUser } from './ui_admin_dashboard.js'; 
import { showBrowseCourses, showAddCourseForm, submitNewCourse, handleCourseSearch, showCourseDetails, handleReportCourse, handleCourseApproval, showEditCourseForm, handleUpdateCourse } from './ui_courses.js';
import { showInbox, handleMarkRead, showContactAdminModal, showReplyToAdminModal } from './ui_inbox.js'; 
import { handleProfilePictureSelect } from './ui_profile_picture.js';
import { showGlobalChat, sendChatMessage, deleteChatMessage as deleteGlobalChatMessage, togglePinMessage as toggleGlobalChatPin, showPinnedMessages as showGlobalPinnedMessages, startReply as startGlobalChatReply, cancelReply as cancelGlobalChatReply } from './ui_chat.js'; 

// --- Leaderboard/Marketplace Imports ---
import { showLeaderboard, showMarketplacePlaceholder } from './ui_leaderboard.js';

// --- Gamification Alerts Import ---
import { checkAndShowMegaMigrationAlert } from './ui_gamification_alerts.js';

// --- AI Chat Studio Import ---
import { showAiChatStudio } from './ui_ai_chat_studio.js';
// --- AI Settings UI Import ---
import { showAiChatSettings } from './ui_ai_settings.js';


// --- Course UI Imports ---
import { showMyCoursesDashboard, showCurrentCourseDashboard, showNextLesson, showFullStudyMaterial, showCurrentAssignmentsExams, showCurrentCourseProgress, navigateToCourseDashboard, handleCourseAction, confirmUnenroll } from './ui_course_dashboard.js';
import { showCourseEnrollment, handlePaceSelection } from './ui_course_enrollment.js';
import {
     showCourseStudyMaterial, displayFormulaSheet, handleExplainSelection,
     navigateChapterMaterial, loadYouTubeAPI, handleVideoWatched,
     initPdfViewer, cleanupPdfViewer, handlePdfSnapshotForAI,
     triggerSkipExamGeneration, askQuestionAboutTranscription,
     handleTranscriptionClick, highlightTranscriptionLine, downloadFormulaSheetPdf, getYouTubeVideoId,
     displayChapterSummary, downloadChapterSummaryPdf, askAboutFullPdf 
} from './ui_course_study_material.js';
import { showCourseAssignmentsExams, startAssignmentOrExam, confirmDeleteCourseActivity, handleDeleteCourseActivity } from './ui_course_assignments_exams.js'; 
import { showCourseProgressDetails, renderCourseCharts as renderCourseProgressCharts, regenerateCertificatePreview, downloadCertImage, downloadCertPdf } from './ui_course_progress.js'; 
import { displayCourseContentMenu } from './ui_course_content_menu.js';
import { showNotesDocumentsPanel, addNewNoteWrapper, editNoteWrapper, saveNoteChangesWrapper, uploadNoteWrapper, deleteNoteWrapper, shareCurrentNoteWrapper, viewNoteWrapper, convertNoteToLatexWrapper, improveNoteWithAIWrapper, reviewNoteWithAIWrapper, downloadNoteAsTexWrapper, previewLatexNote, extractAndConvertImageNoteToLatexWrapper, downloadNoteAsPdfWrapper } from './ui_notes_documents.js'; 
import { showExamReviewUI, showIssueReportingModal, submitIssueReport, showAIExplanationSection, askAIFollowUp, deleteCompletedExamV2 as deleteCompletedTestgenExam } from './exam_storage.js'; 
import { calculateChapterCombinedProgress } from './course_logic.js';
// import { showBackgroundManagement } from './ui_background_management.js'; // REMOVED - functionality moved to ui_settings_panel
import { loadAndApplyBackgroundPreference, loadAndApplyCardOpacityPreference } from './ui_background_management.js'; // KEEP these
// --- NEW: Import Settings Panel ---
import { showSettingsPanel } from './ui_settings_panel.js';


// --- START MODIFIED: Music Player UI and Audio Service Imports ---
import { showMusicPlayerDashboard } from './ui_music_player.js';
import { playUiSound, initAudioPlayers as initGlobalAudioPlayers, destroyYouTubePlayers as destroyGlobalYouTubePlayers } from './audio_service.js'; 
// --- END MODIFIED ---

// --- Initialization ---

async function initializeApp() {
    console.log("Initializing Lyceum (Module)...");
    showLoading("Initializing...");

    loadAndApplyBackgroundPreference();
    loadAndApplyCardOpacityPreference();

    setMusicPlayerState({ 
        volume: parseFloat(localStorage.getItem('lyceumMusicVolume')) || DEFAULT_MUSIC_VOLUME,
        ambientVolume: parseFloat(localStorage.getItem('lyceumAmbientVolume')) || DEFAULT_AMBIENT_SOUND_VOLUME,
        uiSoundsEnabled: localStorage.getItem('lyceumUiSoundsEnabled') === 'false' ? false : DEFAULT_UI_SOUNDS_ENABLED,
        showMiniPlayer: localStorage.getItem('lyceumShowMiniPlayer') === 'true', 
        userSavedPlaylists: JSON.parse(localStorage.getItem('lyceumUserSavedPlaylists') || '[]'), 
        miniPlayerYouTubeInstance: null,
        miniPlayerVideoActive: false,
    });
    initGlobalAudioPlayers(); 
    console.log("Initializing with music player state:", musicPlayerState);

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
            window.playUiSound?.('toggle_on'); // Play sound on theme toggle
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');

             const progressDash = document.getElementById('dashboard');
             const courseDashArea = document.getElementById('course-dashboard-area');
             const courseProgressCanvas = document.getElementById('assignmentScoresChart'); 

             if (progressDash && !progressDash.classList.contains('hidden') && typeof window.renderCharts === 'function') { 
                window.renderCharts();
             }
             if (courseDashArea && !courseDashArea.classList.contains('hidden') && courseProgressCanvas && typeof window.renderCourseProgressCharts === 'function') {
                 console.log("Theme changed, attempting to re-render course charts if visible.");
                 if (userCourseProgressMap && activeCourseId && userCourseProgressMap.has(activeCourseId)) {
                     window.renderCourseProgressCharts(userCourseProgressMap.get(activeCourseId));
                 } else {
                     console.warn("Could not re-render course charts: active course ID or progress data missing.", {
                         hasProgressMap: !!userCourseProgressMap,
                         activeCourseId,
                         hasActiveCourse: userCourseProgressMap?.has(activeCourseId)
                     });
                 }
             }

             if (typeof mermaid !== 'undefined' && mermaid) {
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

    if (themeToggle && !themeToggle.dataset.bgListenerAttached) {
        themeToggle.addEventListener('click', () => {
            const currentPref = JSON.parse(localStorage.getItem('lyceumAppBackground') || '{}');
            if (currentPref.type === 'default' || !currentPref.type) {
                setTimeout(() => loadAndApplyBackgroundPreference(), 50);
            }
        });
        themeToggle.dataset.bgListenerAttached = 'true';
    }

     const menuButton = document.getElementById('mobile-menu-button');
     const sidebar = document.getElementById('sidebar');
     const overlay = document.getElementById('mobile-overlay');
     if (menuButton && sidebar && overlay && !menuButton.dataset.listenerAttached) {
         menuButton.addEventListener('click', (e) => {
             e.stopPropagation();
             sidebar.classList.toggle('is-open');
             sidebar.classList.toggle('hidden');
             overlay.classList.toggle('is-visible');
             window.playUiSound?.('button_click');
         });
         overlay.addEventListener('click', () => {
             sidebar.classList.remove('is-open');
             sidebar.classList.add('hidden');
             overlay.classList.remove('is-visible');
             window.playUiSound?.('button_click');
         });
         sidebar.querySelectorAll('.sidebar-link, .sidebar-dropdown-toggle').forEach(link => {
             link.addEventListener('click', (e) => {
                 if (!e.currentTarget.classList.contains('sidebar-dropdown-toggle')) {
                     sidebar.classList.remove('is-open');
                     sidebar.classList.add('hidden');
                     overlay.classList.remove('is-visible');
                 }
                 // window.playUiSound?.('navigation'); // Removed for individual link functions
            });
         });
          menuButton.dataset.listenerAttached = 'true';
     } else if (!menuButton || !sidebar || !overlay) {
          console.warn("Mobile menu elements not found during initialization.");
     }

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

        await loadGlobalSubjectDefinitionsFromFirestore();
        console.log("[initializeApp] Global Subject Definitions loaded initially.");

        try {
            const globalPrompts = await loadGlobalAiPrompts();
            setGlobalAiSystemPrompts(globalPrompts);
            console.log("[initializeApp] Global AI System Prompts loaded and set.", globalPrompts);
        } catch (error) {
            console.error("[initializeApp] Error loading Global AI System Prompts. Using defaults/empty.", error);
            setGlobalAiSystemPrompts({});
        }
        await loadCourseExamDefaults();
        console.log("Initialized with Course Exam Defaults:", courseExamDefaults);

        setupAuthListener();
    } catch (e) {
        hideLoading();
        console.error("Firebase initialization error:", e);
        alert("Error initializing Firebase services: " + e.message);
    }

     if (typeof mermaid !== 'undefined' && mermaid) {
         const isDark = document.documentElement.classList.contains('dark');
         mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' });
         console.log("Mermaid initialized.");
     } else {
         console.warn("Mermaid not loaded yet. Will initialize later if needed.");
     }

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

window.showLeaderboard = showLeaderboard;
window.showMarketplacePlaceholder = showMarketplacePlaceholder;

window.showAiChatStudio = showAiChatStudio;
window.showAiChatSettings = showAiChatSettings;


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
// window.showCurrentNotesDocuments = showCurrentNotesDocuments; // Defined in ui_notes_documents.js

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
window.askAboutFullPdf = askAboutFullPdf;
window.handleTranscriptionClick = handleTranscriptionClick;
window.highlightTranscriptionLine = highlightTranscriptionLine;
window.downloadFormulaSheetPdf = downloadFormulaSheetPdf;
window.downloadChapterSummaryPdf = downloadChapterSummaryPdf;
window.getYouTubeVideoId = getYouTubeVideoId;

window.showCourseAssignmentsExams = showCourseAssignmentsExams;
window.startAssignmentOrExam = startAssignmentOrExam;
window.confirmDeleteCourseActivity = confirmDeleteCourseActivity;
window.handleDeleteCourseActivity = handleDeleteCourseActivity;

window.showCourseProgressDetails = showCourseProgressDetails;
window.renderCourseProgressCharts = renderCourseProgressCharts;
window.regenerateCertificatePreview = regenerateCertificatePreview;
window.downloadCertImage = downloadCertImage;
window.downloadCertPdf = downloadCertPdf;


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
window.previewLatexNote = previewLatexNote;
window.extractAndConvertImageNoteToLatexWrapper = extractAndConvertImageNoteToLatexWrapper;
window.downloadNoteAsPdfWrapper = downloadNoteAsPdfWrapper;

window.showExamReviewUI = showExamReviewUI;
window.showAIExplanationSection = showAIExplanationSection;
window.askAIFollowUp = askAIFollowUp;
window.reportQuestionIssue = showIssueReportingModal; 
window.showIssueReportingModal = showIssueReportingModal;
window.submitIssueReport = submitIssueReport;
window.deleteCompletedTestgenExam = deleteCompletedTestgenExam; 
window.deleteCompletedExamV2 = deleteCompletedTestgenExam; 

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

window.selectSubject = selectSubject;
window.editSubject = editSubject;
window.updateSubject = updateSubject;
window.addSubject = addSubject;
window.confirmDeleteSubject = confirmDeleteSubject;
window.deleteSubject = deleteSubject;
window.handleSubjectApproval = handleSubjectApproval;

window.updateUserProfile = updateUserProfile;
window.signOutUserWrapper = signOutUser; // Moved from ui_user_profile to be called from settings
window.confirmSelfDeleteAccount = confirmSelfDeleteAccount; // Moved from ui_user_profile
window.handleProfilePictureSelect = handleProfilePictureSelect;
window.showInbox = showInbox;
window.handleMarkRead = handleMarkRead;
window.showContactAdminModal = showContactAdminModal; 
window.showReplyToAdminModal = showReplyToAdminModal; 

window.showGlobalChat = showGlobalChat;
window.sendChatMessage = sendChatMessage; 
window.deleteGlobalChatMessage = deleteGlobalChatMessage; 
window.toggleGlobalChatPin = toggleGlobalChatPin;
window.showGlobalPinnedMessages = showGlobalPinnedMessages;
window.startGlobalChatReply = startGlobalChatReply;
window.cancelGlobalChatReply = cancelGlobalChatReply;


window.importData = importData;
window.exportData = exportData;
window.showImportExportDashboard = showImportExportDashboard;

window.showAddSubjectComingSoon = showAddSubjectComingSoon;
window.completeOnboarding = completeOnboarding;

window.showAdminDashboard = showAdminDashboard; // Existing export, ensured it's the direct import

window.promptAdminReply = promptAdminModerationReply; 
window.handleAdminMarkCourseComplete = handleAdminMarkCourseComplete;
window.loadUserCoursesForAdmin = loadUserCoursesForAdmin;
window.loadUserBadgesForAdmin = loadUserBadgesForAdmin;
window.promptAddBadge = promptAddBadge;
window.confirmRemoveBadge = confirmRemoveBadge;
window.loadUserSubjectsForAdmin = loadUserSubjectsForAdmin;
window.handleAdminSubjectApproval = handleAdminSubjectApprovalForUser;
// window.showBackgroundManagement = showBackgroundManagement; // REMOVED - use showSettingsPanel
window.renderMathIn = renderMathIn; 
window.showSettingsPanel = showSettingsPanel; // NEW

window.showMusicPlayerDashboard = showMusicPlayerDashboard; 
window.playUiSound = playUiSound; 

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
    const stateCurrentUser = currentUser;
    const isAdmin = stateCurrentUser && (stateCurrentUser.uid === ADMIN_UID || stateCurrentUser.isAdmin === true);

    // Define admin navigation items and their corresponding link IDs
    const adminNavItems = [
        { linkId: 'admin-panel-link' }
        // Add other admin-specific link IDs here if any in the future
    ];

    adminNavItems.forEach(item => {
        const linkElement = document.getElementById(item.linkId);
        if (linkElement) {
            linkElement.style.display = isAdmin ? 'flex' : 'none';
        }
    });

    const adminIcon = document.getElementById('admin-indicator-icon');
    if (adminIcon) {
        adminIcon.style.display = isAdmin ? 'inline-block' : 'none';
    }
}

// --- START MODIFIED: updateExperimentalFeaturesSidebarVisibility ---
export function updateExperimentalFeaturesSidebarVisibility() {
    if (!currentUser || !currentUser.userSettings) {
        console.warn("Cannot update experimental feature visibility: currentUser or userSettings missing.");
        // Hide all by default if no user settings
        document.querySelectorAll('.experimental-feature-link').forEach(el => el.style.display = 'none');
        return;
    }

    const features = currentUser.userSettings.experimentalFeatures || { ...DEFAULT_EXPERIMENTAL_FEATURES };

    const chatLink = document.getElementById('sidebar-chat-link');
    if (chatLink) chatLink.style.display = features.globalChat ? 'flex' : 'none';

    const marketplaceLink = document.getElementById('sidebar-marketplace-link');
    if (marketplaceLink) marketplaceLink.style.display = features.marketplace ? 'flex' : 'none';

    const musicLink = document.getElementById('sidebar-music-link');
    if (musicLink) musicLink.style.display = features.musicAndSounds ? 'flex' : 'none';
}
// window.updateExperimentalFeaturesSidebarVisibility = updateExperimentalFeaturesSidebarVisibility; // ES Exported
// --- END MODIFIED ---


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