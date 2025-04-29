// --- START OF FILE ui_onboarding.js ---

// ui_onboarding.js

import { currentUser, data, currentSubject, setCurrentSubject, db } from './state.js';
import { clearContent, updateSubjectInfo, fetchAndUpdateUserInfo, setActiveSidebarLink, displayContent } from './ui_core.js'; // Added displayContent
import { showLoading, hideLoading } from './utils.js';
import { saveUserData } from './firebase_firestore.js';
import { showHomeDashboard } from './ui_home_dashboard.js';

// --- Onboarding UI & Logic ---

export function showOnboardingUI() {
    clearContent(); // Clear main content area first

    // Hide main app layout elements
    document.getElementById('main-content')?.classList.add('hidden');
    document.getElementById('sidebar')?.classList.add('hidden');
    document.getElementById('mobile-menu-button')?.classList.add('hidden');
    document.getElementById('user-section')?.classList.add('hidden');
    document.getElementById('card-header')?.classList.add('hidden');

    // Remove existing onboarding container if present
    document.getElementById('onboarding-container')?.remove();

    // Prepare subject selection buttons (Original subjects, not courses)
    let subjectsHtml = '';
    if (data && data.subjects && Object.keys(data.subjects).length > 0) {
        subjectsHtml = Object.values(data.subjects).map(subject =>
            `<button onclick="window.completeOnboarding('${subject.id}')" class="w-full btn-primary mb-2 text-lg py-3">${subject.name || 'Unnamed Subject'}</button>`
        ).join('');
    } else {
        subjectsHtml = '<p class="text-sm text-danger dark:text-red-400 my-4">Error: Could not load the default subject data. Please try refreshing.</p>';
    }

    const html = `
        <div id="onboarding-container" class="fixed inset-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 z-[60]">
            <div class="bg-white dark:bg-gray-800 p-6 sm:p-10 rounded-lg shadow-xl text-center max-w-xl w-full animate-fade-in border dark:border-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-16 h-16 mx-auto text-primary-500 mb-4">
                  <path d="M11.7 4.879a.75.75 0 0 1 2.121 0l5.172 4.307a.75.75 0 0 1-.18 1.15l-1.258.63a.75.75 0 0 0-.608 1.119l1.086 1.923a.75.75 0 0 1-.628 1.075l-1.258.179a.75.75 0 0 0-.674.949l.3 1.352a.75.75 0 0 1-1.008.738l-1.286-.643a.75.75 0 0 0-.862 0l-1.286.643a.75.75 0 0 1-1.008-.738l.3-1.352a.75.75 0 0 0-.674-.95l-1.258-.178a.75.75 0 0 1-.628-1.075l1.086-1.923a.75.75 0 0 0-.608-1.119l-1.258-.63a.75.75 0 0 1-.18-1.15l5.172-4.307Z" />
                  <path d="m11.15 16.34 1.018 4.578a.75.75 0 0 0 1.38-.308l1.018-4.578a.75.75 0 0 0-.608-1.119l-1.258-.63a.75.75 0 0 0-.862 0l-1.258.63a.75.75 0 0 0-.608 1.119Z" />
                </svg>
                <h2 class="text-3xl font-semibold mb-3 text-gray-800 dark:text-gray-100">Welcome to Lyceum!</h2>
                <p class="text-muted text-lg mb-8">Please select your primary subject to get started with test generation, or browse structured courses.</p>
                <p class="text-xs text-muted mb-6">(You can manage subjects and enroll in structured courses later.)</p>

                <div class="mb-6">
                    <h3 class="text-xl font-medium mb-4 text-gray-700 dark:text-gray-300">Select Initial Subject (for Test Gen)</h3>
                    <div class="space-y-3 max-h-60 overflow-y-auto px-2">
                        ${subjectsHtml}
                    </div>
                </div>

                 <p class="text-muted my-4">OR</p>

                 <button onclick="window.showBrowseCourses()" class="w-full btn-secondary text-lg py-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2 inline"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
                    Browse Courses
                 </button>

            </div>
        </div>`;

    const onboardingContainer = document.createElement('div');
    onboardingContainer.innerHTML = html;
    document.body.appendChild(onboardingContainer);
    hideLoading();
}

// This function is now only relevant if called from the onboarding screen, which no longer has the button.
export function showAddSubjectComingSoon() {
    alert("Adding new subjects is done via the 'Manage Subjects' menu after completing this initial setup.");
}

// Function to complete the *initial* onboarding (subject selection for test-gen)
export async function completeOnboarding(subjectId) {
    if (!currentUser || !db) {
         alert("Error: Cannot complete setup. User not logged in or Firebase not ready.");
         return;
    }
    showLoading("Finishing setup...");

    try {
        // Mark initial onboarding complete in Firestore user doc
        const userRef = db.collection('users').doc(currentUser.uid);
        await userRef.update({ onboardingComplete: true });
        console.log("Initial onboarding marked complete in Firestore.");

        // Set the selected subject as the current one for test-gen
         if (data && data.subjects && data.subjects[subjectId]) {
             setCurrentSubject(data.subjects[subjectId]);
             updateSubjectInfo(); // Update header display
             console.log(`Selected initial subject set to: ${currentSubject.name} (ID: ${subjectId})`);
              // Save the selected subject ID to Firestore
              await userRef.update({ lastSelectedSubjectId: subjectId });
         } else {
             console.error(`Subject ID ${subjectId} not found in local data during onboarding completion.`);
             const firstSubjectId = Object.keys(data?.subjects || {})[0];
             if(firstSubjectId && data.subjects[firstSubjectId]) {
                 setCurrentSubject(data.subjects[firstSubjectId]);
                 updateSubjectInfo();
                 console.warn(`Fallback: Set subject to first available: ${currentSubject.name}`);
                 await userRef.update({ lastSelectedSubjectId: firstSubjectId });
             } else {
                 setCurrentSubject(null);
                 updateSubjectInfo();
                 throw new Error("No subjects available to select after onboarding.");
             }
         }

        // Remove onboarding UI and show main app UI
        document.getElementById('onboarding-container')?.remove();
        document.getElementById('main-content')?.classList.remove('hidden');
        document.getElementById('sidebar')?.classList.remove('hidden');
        document.getElementById('mobile-menu-button')?.classList.remove('hidden');
        document.getElementById('card-header')?.classList.remove('hidden');

        document.querySelectorAll('.auth-required').forEach(el => {
            el.style.display = ''; // Show sidebar nav etc.
        });
        // Ensure standard nav is shown by default
        document.getElementById('sidebar-standard-nav')?.style.removeProperty('display');
        document.getElementById('sidebar-course-nav')?.style.setProperty('display', 'none', 'important');


        await fetchAndUpdateUserInfo(currentUser);

        // Navigate to the Home Dashboard (standard test-gen home)
        showHomeDashboard();

        hideLoading();
        console.log("Initial onboarding complete. Main application displayed.");

    } catch (error) {
        console.error("Error completing initial onboarding:", error);
        alert("Failed to complete setup: " + error.message + "\nPlease try selecting a subject again.");
        hideLoading();
        document.getElementById('onboarding-container')?.remove();
        showOnboardingUI(); // Re-show if failed
    }
}
// --- END OF FILE ui_onboarding.js ---