// --- START OF FILE ui_admin_dashboard.js ---

import { db, currentUser, globalCourseDataMap, userCourseProgressMap, updateGlobalCourseData, globalAiSystemPrompts, setGlobalAiSystemPrompts } from './state.js';
import { YOUTUBE_API_KEY, DEFAULT_PROFILE_PIC_URL, ADMIN_UID } from './config.js';
import { displayContent, clearContent, setActiveSidebarLink as setMainSidebarActive } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js';

// Import display functions from specialized admin modules
import { displayFeedbackSection, loadFeedbackForAdmin, confirmDeleteItem as confirmDeleteFeedbackItem, promptAdminReply as promptAdminFeedbackReply } from './admin_moderation.js';
import { displayCourseManagementSection, loadCoursesForAdmin as loadAdminCourses  } from './admin_course_content.js';
import { handleCourseApproval as handleAdminCourseApproval, showAddCourseForm, showEditCourseForm as showAdminEditCourseForm } from './ui_courses.js' // Global course add/edit
import { displayUserManagementSection, loadUserCoursesForAdmin, handleAdminMarkCourseComplete, loadUserBadgesForAdmin, promptAddBadge, confirmRemoveBadge, loadUserSubjectsForAdmin, handleAdminUserSubjectApproval, listAllUsersAdmin, viewUserDetailsAdmin, promptAdminChangeUsername as promptAdminUsernameChange, handleToggleAdminStatus } from './admin_user_management.js';
import { displaySystemOperationsSection, loadAdminTasksUI, handleAddAdminTask, handleToggleAdminTaskStatus, handleDeleteAdminTask, renderGlobalAiPromptsAdminUI, handleSaveGlobalPromptsToFirestore, loadChatAutoDeleteSettingAdmin, saveChatAutoDeleteSettingAdmin } from './admin_system_operations.js';
import { displayTestingAidsSection } from './admin_testing_aids.js';
import { confirmDeleteAllFeedbackAndIssues } from './admin_moderation.js'
import { populateAdminCourseSelect, loadPlaylistForAdmin, toggleSelectAllVideosAdmin, toggleVideoSelectionAdmin, handleAssignVideoToChapter, handleUnassignVideoFromChapter, handleDeleteUserFormulaSheetAdmin, handleDeleteUserChapterSummaryAdmin } from './admin_playlist_and_content_deletion.js';
import { getAdminOverviewStats, sendGlobalAnnouncementToAllUsers } from './firebase_firestore.js' // Added sendGlobalAnnouncementToAllUsers
import { displayDatabaseManagementSection } from './admin_database_management.js';
// --- NEW: Import Admin Music Management ---
import { displayMusicManagementSection } from './admin_music_management.js';
// --- END NEW ---
import { checkAndShowMegaMigrationAlert } from './ui_gamification_alerts.js';
import { displayMegaMigrationDashboard } from './admin_mega_service.js';


// --- Main Admin Dashboard UI ---

// State for current active admin section
let currentAdminSection = 'overview'; // Default section

function updateAdminPanelBackgroundRGBs() {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
        document.documentElement.style.setProperty('--admin-nav-bg-rgb', '30, 41, 59');
        document.documentElement.style.setProperty('--admin-nav-border-rgb', '55, 65, 81');
        document.documentElement.style.setProperty('--admin-content-bg-rgb', '30, 41, 59');
        document.documentElement.style.setProperty('--admin-content-border-rgb', '55, 65, 81');
        document.documentElement.style.setProperty('--admin-section-bg-rgb', '55, 65, 81');
        document.documentElement.style.setProperty('--admin-section-border-rgb', '75, 85, 99');
        document.documentElement.style.setProperty('--admin-stat-card-placeholder-bg-rgb', '55, 65, 81');
        document.documentElement.style.setProperty('--admin-stat-card-placeholder-border-rgb', '107, 114, 128');
    } else {
        document.documentElement.style.setProperty('--admin-nav-bg-rgb', '255, 255, 255');
        document.documentElement.style.setProperty('--admin-nav-border-rgb', '229, 231, 235');
        document.documentElement.style.setProperty('--admin-content-bg-rgb', '255, 255, 255');
        document.documentElement.style.setProperty('--admin-content-border-rgb', '229, 231, 235');
        document.documentElement.style.setProperty('--admin-section-bg-rgb', '249, 250, 251');
        document.documentElement.style.setProperty('--admin-section-border-rgb', '229, 231, 235');
        document.documentElement.style.setProperty('--admin-stat-card-placeholder-bg-rgb', '243, 244, 246');
        document.documentElement.style.setProperty('--admin-stat-card-placeholder-border-rgb', '209, 213, 219');
    }
}


export function showAdminDashboard() {
    if (!currentUser || !currentUser.isAdmin) {
        displayContent('<p class="text-red-500 p-4">Access Denied. Admin privileges required.</p>');
        return;
    }
    clearContent();
    setMainSidebarActive('showAdminDashboard', 'sidebar-standard-nav');

    const isPrimaryAdmin = currentUser.uid === ADMIN_UID;

    const adminPanelHtml = `
    <div class="flex flex-col md:flex-row gap-6 animate-fade-in h-[calc(100vh-150px)] md:h-[calc(100vh-120px)]">
        <aside id="admin-panel-nav" class="w-full md:w-64 p-4 rounded-lg shadow-md flex-shrink-0 overflow-y-auto custom-scrollbar"
                style="background-color: rgba(var(--admin-nav-bg-rgb, 255, 255, 255), var(--card-bg-alpha)); border: 1px solid rgba(var(--admin-nav-border-rgb, 229, 231, 235), var(--card-bg-alpha, 0.5));">
            <h2 class="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400 border-b pb-2 dark:border-gray-700">Admin Menu</h2>
            <nav class="space-y-1">
                <a href="#" onclick="window.showAdminSection('overview'); return false;" data-section="overview" class="admin-nav-link">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-3"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" /></svg>
                    Overview
                </a>
                <a href="#" onclick="window.showAdminSection('userManagement'); return false;" data-section="userManagement" class="admin-nav-link">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                    Users
                </a>
                <a href="#" onclick="window.showAdminSection('courseContent'); return false;" data-section="courseContent" class="admin-nav-link">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
                    Courses
                </a>
                <a href="#" onclick="window.showAdminSection('moderation'); return false;" data-section="moderation" class="admin-nav-link">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.25-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" /></svg>
                    Moderation
                </a>
                <!-- NEW: Music Management Link
                <a href="#" onclick="window.showAdminSection('musicManagement'); return false;" class="admin-nav-link">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5 mr-3">
                        <path fill="white" d="M9 9v10.5a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V9m0 0l12-3v10.5a2.25 2.25 0 0 1-2.25 2.25H12a2.25 2.25 0 0 1-2.25-2.25V6" />
                    </svg>
                    Music & Sounds
                </a>
                END NEW -->
                <a href="#" onclick="window.showAdminSection('databaseManagement'); return false;" data-section="databaseManagement" class="admin-nav-link">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-3"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>
                    Database
                </a>
                <a href="#" onclick="window.showAdminSection('systemOperations'); return false;" data-section="systemOperations" class="admin-nav-link">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-3"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.646.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a6.759 6.759 0 0 1 0 1.255c-.008.379.138.75.43.992l1.004.827a1.125 1.125 0 0 1 .26 1.43l-1.296 2.247a1.125 1.125 0 0 1-1.37.491l-1.217-.456c-.355-.133-.75-.072-1.075.124a6.512 6.512 0 0 1-.22.127c-.333.183-.583.495-.646.87l-.213 1.28c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.646-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 0 1-1.37-.49l-1.296-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.758 6.758 0 0 1 0-1.255c.008-.379-.138-.75-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.296-2.247a1.125 1.125 0 0 1 1.37-.491l1.217.456c.355.133.75.072 1.075-.124a6.512 6.512 0 0 1 .22-.127c.333-.183.583.495.646-.87l.213-1.281Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                    System
                </a>
                <a href="#" onclick="window.showAdminSection('testingAids'); return false;" data-section="testingAids" class="admin-nav-link">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-3"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 0 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>
                    Testing Aids
                </a>
                <a href="#" onclick="window.showAdminSection('megaTools'); return false;" data-section="megaTools" class="admin-nav-link">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3.75 3.75 0 011.036 7.493M15 19.5v-2.25A2.25 2.25 0 0012.75 15H11.25" />
                    </svg>
                    MEGA Tools
                </a>
            </nav>
        </aside>
        <main id="admin-panel-content-area" class="flex-1 p-6 rounded-lg shadow-md overflow-y-auto custom-scrollbar"
                style="background-color: rgba(var(--admin-content-bg-rgb, 255, 255, 255), var(--card-bg-alpha)); border: 1px solid rgba(var(--admin-content-border-rgb, 229, 231, 235), var(--card-bg-alpha, 0.5));">
        </main>
    </div>
    `;

    displayContent(adminPanelHtml);
    updateAdminPanelBackgroundRGBs();
    showAdminSection(currentAdminSection);
    checkAndShowMegaMigrationAlert();

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle && !themeToggle.dataset.adminBgListener) {
        themeToggle.addEventListener('click', () => {
            setTimeout(updateAdminPanelBackgroundRGBs, 50);
        });
        themeToggle.dataset.adminBgListener = 'true';
    }
}

export async function showAdminSection(sectionName) {
    currentAdminSection = sectionName;
    const contentArea = document.getElementById('admin-panel-content-area');
    const navLinks = document.querySelectorAll('#admin-panel-nav .admin-nav-link');

    if (!contentArea) {
        console.error("Admin panel content area not found!");
        return;
    }

    navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionName);
    });

    contentArea.innerHTML = `<div class="text-center p-8"><div class="loader animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-2 text-muted">Loading ${escapeHtml(sectionName)}...</p></div>`;

    switch (sectionName) {
        case 'overview':
            contentArea.innerHTML = `
                <div class="admin-overview-header mb-8">
                    <h3 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Admin Overview</h3>
                    <p class="text-gray-600 dark:text-gray-400">Welcome back, ${escapeHtml(currentUser.displayName || 'Admin')}. Here's a snapshot of the platform activity.</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="admin-stats-grid">
                    <div class="stat-card-placeholder p-6 rounded-lg text-center col-span-full"
                         style="background-color: rgba(var(--admin-stat-card-placeholder-bg-rgb, 243, 244, 246), var(--card-bg-alpha)); border: 1px dashed rgba(var(--admin-stat-card-placeholder-border-rgb, 209, 213, 219), var(--card-bg-alpha));">
                        <div class="loader animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto mb-2"></div>
                        <p class="text-muted">Loading statistics...</p>
                    </div>
                </div>
                <!-- Global Announcement Section -->
                <section class="mt-8 p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                    <h4 class="text-lg font-medium mb-3">Send Global Announcement</h4>
                    <form id="global-announcement-form" onsubmit="window.handleSendGlobalAnnouncement(event)">
                        <div class="mb-3">
                            <label for="announcement-subject" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                            <input type="text" id="announcement-subject" class="form-control mt-1" required>
                        </div>
                        <div class="mb-3">
                            <label for="announcement-body" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Message Body (HTML allowed)</label>
                            <textarea id="announcement-body" rows="5" class="form-control mt-1" required></textarea>
                        </div>
                        <button type="submit" class="btn-primary">Send to All Users</button>
                    </form>
                </section>
            `;
            updateAdminStatCardPlaceholderRGB();
            loadAdminOverviewStats();
            break;
        case 'userManagement':
            displayUserManagementSection(contentArea);
            break;
        case 'courseContent':
            displayCourseManagementSection(contentArea);
            break;
        case 'moderation':
            displayFeedbackSection(contentArea);
            break;
        // --- NEW: Music Management Case ---
        case 'musicManagement':
            displayMusicManagementSection(contentArea);
            break;
        // --- END NEW ---
        case 'databaseManagement':
            displayDatabaseManagementSection(contentArea);
            break;
        case 'systemOperations':
            displaySystemOperationsSection(contentArea);
            break;
        case 'testingAids':
            displayTestingAidsSection(contentArea);
            break;
        case 'megaTools':
            displayMegaMigrationDashboard(contentArea);
            break;
        default:
            contentArea.innerHTML = `<p class="text-red-500 p-4">Error: Unknown admin section "${sectionName}".</p>`;
    }
}

window.handleSendGlobalAnnouncement = async (event) => {
    event.preventDefault();
    if (!currentUser || !currentUser.isAdmin) {
        alert("Admin privileges required to send announcements.");
        return;
    }

    const subject = document.getElementById('announcement-subject').value.trim();
    const body = document.getElementById('announcement-body').value.trim(); // Body can contain HTML

    if (!subject || !body) {
        alert("Subject and body are required for announcements.");
        return;
    }

    if (!confirm(`Are you sure you want to send this announcement with subject "${subject}" to ALL users?`)) {
        return;
    }

    showLoading("Sending global announcement...");
    try {
        const result = await sendGlobalAnnouncementToAllUsers(subject, body, currentUser.uid);
        hideLoading();
        if (result.success) {
            alert(`Global announcement sent successfully to approximately ${result.count} users.`);
            document.getElementById('announcement-subject').value = '';
            document.getElementById('announcement-body').value = '';
        } else {
            alert(`Failed to send global announcement: ${result.message}`);
        }
    } catch (error) {
        hideLoading();
        console.error("Error sending global announcement:", error);
        alert(`An error occurred while sending the announcement: ${error.message}`);
    }
};


function updateAdminStatCardPlaceholderRGB() {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
        document.documentElement.style.setProperty('--admin-stat-card-placeholder-bg-rgb', '55, 65, 81');
        document.documentElement.style.setProperty('--admin-stat-card-placeholder-border-rgb', '107, 114, 128');
    } else {
        document.documentElement.style.setProperty('--admin-stat-card-placeholder-bg-rgb', '243, 244, 246');
        document.documentElement.style.setProperty('--admin-stat-card-placeholder-border-rgb', '209, 213, 219');
    }
}


async function loadAdminOverviewStats() {
    const statsGrid = document.getElementById('admin-stats-grid');
    if (!statsGrid) return;

    try {
        const stats = await getAdminOverviewStats();
        const isDark = document.documentElement.classList.contains('dark');
        statsGrid.innerHTML = `
            ${createStatCard('Total Users', stats.totalUsers, 'users', isDark ? '49, 46, 129' : '224, 231, 255', 'text-indigo-500 dark:text-indigo-300')}
            ${createStatCard('Pending Courses', stats.pendingCourses, 'courses', isDark ? '59, 18, 18' : '254, 252, 232', 'text-yellow-600 dark:text-yellow-300')}
            ${createStatCard('Approved Courses', stats.approvedCourses, 'check-badge', isDark ? '20, 44, 33' : '220, 252, 231', 'text-green-600 dark:text-green-300')}
            ${createStatCard('Reported Courses', stats.reportedCourses, 'flag', isDark ? '60, 23, 27' : '254, 226, 226', 'text-red-600 dark:text-red-300')}
            ${createStatCard('Total TestGen Subjects', stats.totalSubjects, 'academic-cap', isDark ? '37, 99, 235' : '219, 239, 255', 'text-blue-600 dark:text-blue-300')}
            ${createStatCard('Total Exams Taken', stats.totalExamsTaken, 'clipboard-document-check', isDark ? '56, 26, 82' : '245, 243, 255', 'text-purple-600 dark:text-purple-300')}
            ${createStatCard('Pending Feedback/Issues', stats.pendingFeedback, 'chat-bubble-left-ellipsis', isDark ? '67, 20, 7' : '255, 237, 213', 'text-orange-600 dark:text-orange-300')}
            ${createStatCard('Number of Admins', stats.adminCount, 'shield-check', isDark ? '17, 56, 61' : '204, 251, 241', 'text-teal-600 dark:text-teal-300')}
        `;
    } catch (error) {
        console.error("Error loading admin overview stats:", error);
        statsGrid.innerHTML = `<p class="text-red-500 col-span-full text-center">Could not load platform statistics: ${error.message}</p>`;
    }
}


function createStatCard(title, value, iconType, baseBgRgbString, iconColorClass) {
    const iconSvg = getStatIcon(iconType, iconColorClass);
    return `
        <div class="stat-card p-6 rounded-lg shadow-lg flex flex-col items-center justify-center text-center transition-all hover:scale-105"
             style="background-color: rgba(${baseBgRgbString}, var(--card-bg-alpha)); border: 1px solid rgba(var(--admin-content-border-rgb, 229, 231, 235), calc(var(--card-bg-alpha) * 0.5));">
            <div class="stat-icon-wrapper mb-3">
                ${iconSvg}
            </div>
            <p class="stat-title text-sm font-medium text-gray-600 dark:text-gray-400">${escapeHtml(title)}</p>
            <p class="stat-value text-3xl font-bold text-gray-800 dark:text-gray-100">${value !== null && value !== undefined ? escapeHtml(value.toLocaleString()) : 'N/A'}</p>
        </div>
    `;
}

function getStatIcon(type, iconColorClass = 'text-gray-500 dark:text-gray-400') {
    const baseClasses = `w-10 h-10 ${iconColorClass}`;
    switch (type) {
        case 'users': return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${baseClasses}"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>`;
        case 'courses': return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${baseClasses}"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>`;
        case 'check-badge': return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${baseClasses}"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`;
        case 'flag': return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${baseClasses}"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" /></svg>`;
        case 'academic-cap': return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${baseClasses}"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>`;
        case 'clipboard-document-check': return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${baseClasses}"><path stroke-linecap="round" stroke-linejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25H13.5m0 0 3.375 3.375M13.5 2.25v3.375c0 .621.504 1.125 1.125 1.125h3.375M9 15l2.25 2.25L15 12" /></svg>`;
        case 'chat-bubble-left-ellipsis': return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${baseClasses}"><path stroke-linecap="round" stroke-linejoin="round" d="M20 2H4C2.9 2 2 2.9 2 4V16C2 17.1 2.9 18 4 18H8L12 22L16 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H14.8L12 19.2L9.2 16H4V4H20V16Z" /></svg>`;
        case 'shield-check': return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${baseClasses}"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.4-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.4-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.4 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.4.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg>`;
        default: return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="${baseClasses}"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6A2.25 2.25 0 0 1 15.75 3.75h2.25A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75A2.25 2.25 0 0 1 15.75 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>`;
    }
}

export { confirmRemoveBadge, handleAdminMarkCourseComplete, handleAdminUserSubjectApproval, loadUserBadgesForAdmin, loadUserCoursesForAdmin, loadUserSubjectsForAdmin, promptAddBadge, promptAdminFeedbackReply as promptAdminReply,  }


// Expose necessary functions to window scope
window.showAdminDashboard = showAdminDashboard;
window.showAdminSection = showAdminSection;
window.handleSendGlobalAnnouncement = handleSendGlobalAnnouncement; // For the new form

// User Management Functions
window.listAllUsersAdmin = listAllUsersAdmin;
window.viewUserDetailsAdmin = viewUserDetailsAdmin;
window.promptAdminChangeUsername = promptAdminUsernameChange;
window.handleToggleAdminStatus = handleToggleAdminStatus;
window.loadUserCoursesForAdmin = loadUserCoursesForAdmin;
window.handleAdminMarkCourseComplete = handleAdminMarkCourseComplete;
window.loadUserBadgesForAdmin = loadUserBadgesForAdmin;
window.promptAddBadge = promptAddBadge;
window.confirmRemoveBadge = confirmRemoveBadge;
window.loadUserSubjectsForAdmin = loadUserSubjectsForAdmin;
window.handleAdminUserSubjectApproval = handleAdminUserSubjectApproval;

// Course Content Management Functions
window.loadAdminCourses = loadAdminCourses;
window.handleAdminCourseApproval = handleAdminCourseApproval;
window.showGlobalAddCourseForm = showAddCourseForm; // Global add form
window.showAdminEditCourseForm = showAdminEditCourseForm; // Admin edit form

// Moderation Functions
window.loadFeedbackForAdmin = loadFeedbackForAdmin;
window.promptAdminFeedbackReply = promptAdminFeedbackReply;
window.confirmDeleteFeedbackItem = confirmDeleteFeedbackItem;
window.confirmDeleteAllFeedbackAndIssues = confirmDeleteAllFeedbackAndIssues;

// System Operations Functions
window.handleAddAdminTask = handleAddAdminTask;
window.handleToggleAdminTaskStatus = handleToggleAdminTaskStatus;
window.handleDeleteAdminTask = handleDeleteAdminTask;
window.handleSaveGlobalPrompts = handleSaveGlobalPromptsToFirestore;
window.saveChatAutoDeleteSettingAdmin = saveChatAutoDeleteSettingAdmin;

// Playlist & Content Deletion Functions
window.populateAdminCourseSelect = populateAdminCourseSelect;
window.loadPlaylistForAdmin = loadPlaylistForAdmin;
window.toggleSelectAllVideosAdmin = toggleSelectAllVideosAdmin;
window.toggleVideoSelectionAdmin = toggleVideoSelectionAdmin;
window.handleAssignVideoToChapter = handleAssignVideoToChapter;
window.handleUnassignVideoFromChapter = handleUnassignVideoFromChapter;
window.handleDeleteUserFormulaSheetAdmin = handleDeleteUserFormulaSheetAdmin;
window.handleDeleteUserChapterSummaryAdmin = handleDeleteUserChapterSummaryAdmin;

// Database Management (functions will be set on window by admin_database_management.js itself)
// Testing Aids (functions will be set on window by admin_testing_aids.js itself)

// --- END OF FILE ui_admin_dashboard.js ---