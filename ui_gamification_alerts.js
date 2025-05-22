// ui_gamification_alerts.js
import { globalCourseDataMap } from './state.js';
import { playUiSound } from './audio_service.js'; // Optional: for button clicks

const MODAL_ID = 'mega-migration-alert-modal';
const PROGRESS_TEXT_ID = 'mega-migration-progress-text';
const PROGRESS_BAR_ID = 'mega-migration-progress-bar';
const MIGRATE_BTN_ID = 'mega-alert-migrate-btn';
const REMIND_BTN_ID = 'mega-alert-remind-btn';
const CLOSE_BTN_ID = 'mega-alert-close-btn';
const REMINDER_STORAGE_KEY = 'megaMigrationAlertRemindTimestamp';
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

export function hideMegaMigrationAlert() {
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

export function checkAndShowMegaMigrationAlert() {
    initializeModalElements();

    if (!modalElement || !progressTextElement || !migrateButton || !remindButton || !closeButton || !progressBarElement) {
        console.warn("MEGA Migration Alert: Modal elements not found. Skipping alert.");
        return;
    }

    const reminderTimestamp = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (reminderTimestamp && (Date.now() - parseInt(reminderTimestamp)) < REMINDER_DURATION_MS) {
        console.log("MEGA Migration Alert: Remind later period is active. Skipping alert.");
        hideMegaMigrationAlert(); // Ensure it's hidden if previously shown
        return;
    }

    let totalCourses = 0;
    let unmigratedCourses = 0;

    if (globalCourseDataMap && globalCourseDataMap.size > 0) {
        totalCourses = globalCourseDataMap.size;
        globalCourseDataMap.forEach(course => {
            const isMigrated = course.megaTranscriptionsFolderLink &&
                               course.megaPdfFolderLink &&
                               course.megaMcqFolderLink;
            if (!isMigrated) {
                unmigratedCourses++;
            }
        });
    } else {
        console.log("MEGA Migration Alert: No courses loaded in globalCourseDataMap. Skipping alert.");
        hideMegaMigrationAlert();
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
                if (window.showMegaMigrationDashboard) {
                    window.showMegaMigrationDashboard();
                } else {
                    console.error("showMegaMigrationDashboard function not found on window object.");
                    alert("Error: Could not navigate to MEGA migration dashboard.");
                }
                hideMegaMigrationAlert();
            });
            migrateButton.dataset.listenerAttached = 'true';
        }

        if (!remindButton.dataset.listenerAttached) {
            remindButton.addEventListener('click', () => {
                playUiSound?.('button_click_cancel');
                localStorage.setItem(REMINDER_STORAGE_KEY, Date.now().toString());
                hideMegaMigrationAlert();
                alert("Okay, we'll remind you about MEGA migration later!");
            });
            remindButton.dataset.listenerAttached = 'true';
        }

        if (!closeButton.dataset.listenerAttached) {
            closeButton.addEventListener('click', () => {
                playUiSound?.('button_click_cancel');
                hideMegaMigrationAlert();
            });
            closeButton.dataset.listenerAttached = 'true';
        }
    } else {
        hideMegaMigrationAlert(); // Hide if all courses are migrated
    }
}
