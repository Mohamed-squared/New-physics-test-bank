// ui_gamification_alerts.js
import { globalCourseDataMap } from './state.js';
import { playUiSound } from './audio_service.js'; // Optional: for button clicks

const MODAL_ID = 'gdrive-migration-alert-modal'; // RENAMED_ID
const PROGRESS_TEXT_ID = 'gdrive-migration-progress-text'; // RENAMED_ID
const PROGRESS_BAR_ID = 'gdrive-migration-progress-bar'; // RENAMED_ID
const MIGRATE_BTN_ID = 'gdrive-alert-migrate-btn'; // RENAMED_ID
const REMIND_BTN_ID = 'gdrive-alert-remind-btn'; // RENAMED_ID
const CLOSE_BTN_ID = 'gdrive-alert-close-btn'; // RENAMED_ID
const REMINDER_STORAGE_KEY = 'googleDriveMigrationAlertRemindTimestamp'; // RENAMED_KEY
const REMINDER_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let modalElement = null;
let progressTextElement = null;
let progressBarElement = null;
let migrateButton = null;
let remindButton = null;
let closeButton = null;

function initializeModalElements() {
    if (!modalElement) modalElement = document.getElementById(MODAL_ID);
    if (!progressTextElement) progressTextElement = document.getElementById(PROGRESS_TEXT_ID);
    if (!progressBarElement) progressBarElement = document.getElementById(PROGRESS_BAR_ID);
    if (!migrateButton) migrateButton = document.getElementById(MIGRATE_BTN_ID);
    if (!remindButton) remindButton = document.getElementById(REMIND_BTN_ID);
    if (!closeButton) closeButton = document.getElementById(CLOSE_BTN_ID);
}

export function hideGoogleDriveMigrationAlert() { // RENAMED_FUNCTION
    initializeModalElements();
    if (modalElement) {
        modalElement.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            modalElement.style.display = 'none';
        }, 300); // Match duration of Tailwind transition
    }
}

function showModal() {
    if (modalElement) {
        modalElement.style.display = 'flex';
        // Timeout to allow display:flex to apply before triggering opacity/scale transition
        setTimeout(() => {
            modalElement.classList.remove('opacity-0', 'scale-95');
        }, 50); 
    }
}

export function checkAndShowGoogleDriveMigrationAlert() { // RENAMED_FUNCTION
    initializeModalElements();

    if (!modalElement || !progressTextElement || !migrateButton || !remindButton || !closeButton || !progressBarElement) {
        console.warn("Google Drive Migration Alert: Modal elements not found. Skipping alert."); // RENAMED_TEXT
        return;
    }

    const reminderTimestamp = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (reminderTimestamp && (Date.now() - parseInt(reminderTimestamp)) < REMINDER_DURATION_MS) {
        console.log("Google Drive Migration Alert: Remind later period is active. Skipping alert."); // RENAMED_TEXT
        hideGoogleDriveMigrationAlert(); // RENAMED_CALL: Ensure it's hidden if previously shown
        return;
    }

    let totalCourses = 0;
    let unmigratedCourses = 0;

    if (globalCourseDataMap && globalCourseDataMap.size > 0) {
        totalCourses = globalCourseDataMap.size;
        globalCourseDataMap.forEach(course => {
            // UPDATED_FIELDS: Check for Google Drive specific fields (e.g., gdriveFolderId)
            const isMigrated = course.gdriveTranscriptionsFolderId &&
                               course.gdrivePdfFolderId &&
                               course.gdriveMcqFolderId &&
                               course.gdriveCourseRootFolderId; // Assuming root folder ID also indicates migration
            if (!isMigrated) {
                unmigratedCourses++;
            }
        });
    } else {
        console.log("Google Drive Migration Alert: No courses loaded in globalCourseDataMap. Skipping alert."); // RENAMED_TEXT
        hideGoogleDriveMigrationAlert(); // RENAMED_CALL
        return;
    }
    
    const migratedCourses = totalCourses - unmigratedCourses;
    const progressPercent = totalCourses > 0 ? (migratedCourses / totalCourses) * 100 : 0;

    if (progressTextElement) {
        if (unmigratedCourses > 0) {
            progressTextElement.textContent = `${unmigratedCourses} out of ${totalCourses} courses await modernization!`;
        } else {
            progressTextElement.textContent = `All ${totalCourses} courses are modernized! Well done!`;
        }
    }
    if (progressBarElement) {
        progressBarElement.style.width = `${progressPercent}%`;
    }


    if (unmigratedCourses > 0) {
        showModal();

        // Ensure event listeners are only attached once
        if (!migrateButton.dataset.listenerAttached) {
            migrateButton.addEventListener('click', () => {
                playUiSound?.('button_click_confirm');
                if (window.showGoogleDriveMigrationDashboard) { // RENAMED_WINDOW_FUNCTION
                    window.showGoogleDriveMigrationDashboard(); // RENAMED_WINDOW_FUNCTION
                } else {
                    console.error("showGoogleDriveMigrationDashboard function not found on window object."); // RENAMED_TEXT
                    alert("Error: Could not navigate to Google Drive migration dashboard."); // RENAMED_TEXT
                }
                hideGoogleDriveMigrationAlert(); // RENAMED_CALL
            });
            migrateButton.dataset.listenerAttached = 'true';
        }

        if (!remindButton.dataset.listenerAttached) {
            remindButton.addEventListener('click', () => {
                playUiSound?.('button_click_cancel');
                localStorage.setItem(REMINDER_STORAGE_KEY, Date.now().toString());
                hideGoogleDriveMigrationAlert(); // RENAMED_CALL
                alert("Okay, we'll remind you about Google Drive migration later!"); // RENAMED_TEXT
            });
            remindButton.dataset.listenerAttached = 'true';
        }

        if (!closeButton.dataset.listenerAttached) {
            closeButton.addEventListener('click', () => {
                playUiSound?.('button_click_cancel');
                hideGoogleDriveMigrationAlert(); // RENAMED_CALL
            });
            closeButton.dataset.listenerAttached = 'true';
        }
    } else {
        hideGoogleDriveMigrationAlert(); // RENAMED_CALL: Hide if all courses are migrated
    }
}
