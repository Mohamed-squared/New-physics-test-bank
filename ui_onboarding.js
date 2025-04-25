// ui_onboarding.js

// REMOVED markdownContentCache from this import
import { currentUser, data, currentSubject, setCurrentSubject, db } from './state.js';
// *** CORRECTION: Changed showUserInfo to fetchAndUpdateUserInfo ***
import { clearContent, updateSubjectInfo, fetchAndUpdateUserInfo, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading } from './utils.js';
import { saveUserData } from './firebase_firestore.js'; // Needed to update onboarding flag
import { showTestGenerationDashboard } from './ui_test_generation.js'; // Navigate after onboarding
import { showHomeDashboard } from './ui_home_dashboard.js'; // Navigate after onboarding

// --- Onboarding UI & Logic ---

export function showOnboardingUI() {
     clearContent(); // Clear main content area

     // Hide main app layout elements
     document.getElementById('main-content')?.classList.add('hidden');
     document.getElementById('sidebar')?.classList.add('hidden');
     document.getElementById('mobile-menu-button')?.classList.add('hidden');
     document.getElementById('user-section')?.classList.add('hidden');
     document.getElementById('card-header')?.classList.add('hidden'); // Hide header during onboarding

     // Remove existing onboarding container if present (safety check)
     document.getElementById('onboarding-container')?.remove();

     // Prepare subject selection buttons
     let subjectsHtml = '';
     if (data && data.subjects && Object.keys(data.subjects).length > 0) {
         subjectsHtml = Object.values(data.subjects).map(subject =>
             `<button onclick="window.completeOnboarding('${subject.id}')" class="w-full btn-primary mb-2 text-lg py-3">${subject.name || 'Unnamed Subject'}</button>` // Made buttons primary and larger
         ).join('');
     } else {
         // Handle cases where default subject/chapters couldn't load
         subjectsHtml = '<p class="text-sm text-danger dark:text-red-400 my-4">Error: Could not load the default subject. Please try refreshing the page.</p>';
         subjectsHtml += '<p class="text-xs text-muted">Ensure the necessary Markdown file (e.g., chapters.md) exists and is accessible.</p>';
     }

     // Construct the onboarding overlay HTML
     const html = `
        <div class="fixed inset-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 z-[60]">
            <div class="bg-white dark:bg-gray-800 p-6 sm:p-10 rounded-lg shadow-xl text-center max-w-xl w-full animate-fade-in border dark:border-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-16 h-16 mx-auto text-primary-500 mb-4">
                  <path d="M11.7 4.879a.75.75 0 0 1 2.121 0l5.172 4.307a.75.75 0 0 1-.18 1.15l-1.258.63a.75.75 0 0 0-.608 1.119l1.086 1.923a.75.75 0 0 1-.628 1.075l-1.258.179a.75.75 0 0 0-.674.949l.3 1.352a.75.75 0 0 1-1.008.738l-1.286-.643a.75.75 0 0 0-.862 0l-1.286.643a.75.75 0 0 1-1.008-.738l.3-1.352a.75.75 0 0 0-.674-.95l-1.258-.178a.75.75 0 0 1-.628-1.075l1.086-1.923a.75.75 0 0 0-.608-1.119l-1.258-.63a.75.75 0 0 1-.18-1.15l5.172-4.307Z" />
                  <path d="m11.15 16.34 1.018 4.578a.75.75 0 0 0 1.38-.308l1.018-4.578a.75.75 0 0 0-.608-1.119l-1.258-.63a.75.75 0 0 0-.862 0l-1.258.63a.75.75 0 0 0-.608 1.119Z" />
                </svg>
                <h2 class="text-3xl font-semibold mb-3 text-gray-800 dark:text-gray-100">Welcome to TestGen Pro!</h2>
                <p class="text-muted text-lg mb-8">Let's get you started. Please select your primary subject below.</p>

                <div class="mb-6">
                    <h3 class="text-xl font-medium mb-4 text-gray-700 dark:text-gray-300">Select Your Subject</h3>
                    <div class="space-y-3 max-h-60 overflow-y-auto px-2">
                        ${subjectsHtml}
                    </div>
                </div>

                <hr class="my-6 dark:border-gray-700"/>

                <div>
                    <h3 class="text-lg font-medium mb-3 text-gray-600 dark:text-gray-400">Have a different subject?</h3>
                    <button onclick="window.showAddSubjectComingSoon()" class="w-full btn-secondary opacity-70" disabled>
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
                         Add New Subject
                    </button>
                    <p class="text-xs text-muted mt-2">(You can add more subjects later from the 'Manage Subjects' menu)</p>
                </div>
            </div>
        </div>`;

     // Create and append the onboarding container to the body
     const onboardingContainer = document.createElement('div');
     onboardingContainer.id = 'onboarding-container';
     onboardingContainer.innerHTML = html;
     document.body.appendChild(onboardingContainer);
     hideLoading(); // Ensure loading is hidden when onboarding shows
}

// Placeholder function for the disabled "Add Subject" button during onboarding
export function showAddSubjectComingSoon() {
    alert("Adding new subjects is done via the 'Manage Subjects' menu after completing this initial setup. Please select one of the provided subjects to continue.");
}

// Function to complete the onboarding process
export async function completeOnboarding(subjectId) {
    if (!currentUser || !db) {
         alert("Error: Cannot complete setup. User not logged in or Firebase not ready.");
         return;
    }
    showLoading("Finishing setup...");

    try {
        // 1. Mark onboarding as complete in Firestore
        const userRef = db.collection('users').doc(currentUser.uid);
        await userRef.update({ onboardingComplete: true });
        console.log("Onboarding marked complete in Firestore.");

        // 2. Set the selected subject as the current one
         if (data && data.subjects && data.subjects[subjectId]) {
             setCurrentSubject(data.subjects[subjectId]);
             updateSubjectInfo(); // Update header display
             console.log(`Selected subject set to: ${currentSubject.name} (ID: ${subjectId})`);
         } else {
             console.error(`Subject ID ${subjectId} not found in local data during onboarding completion.`);
             // Try selecting the first available subject as a fallback
             const firstSubjectId = Object.keys(data?.subjects || {})[0];
             if(firstSubjectId && data.subjects[firstSubjectId]) {
                 setCurrentSubject(data.subjects[firstSubjectId]);
                 updateSubjectInfo();
                 console.warn(`Fallback: Set subject to first available: ${currentSubject.name}`);
             } else {
                 setCurrentSubject(null); // No subjects available
                 updateSubjectInfo();
                 throw new Error("No subjects available to select after onboarding.");
             }
         }

        // 3. Remove onboarding UI and show main app UI
        document.getElementById('onboarding-container')?.remove();
        document.getElementById('main-content')?.classList.remove('hidden');
        document.getElementById('sidebar')?.classList.remove('hidden'); // Show sidebar
        document.getElementById('mobile-menu-button')?.classList.remove('hidden');
        document.getElementById('card-header')?.classList.remove('hidden'); // Show header

        // Make sure auth-required elements become visible (redundant if hideLoginUI works, but safe)
        document.querySelectorAll('.auth-required').forEach(el => {
            el.style.display = ''; // Or 'flex', 'block' etc. as appropriate
        });

        // 4. Update user info display using the correct function name
        // *** CORRECTION: Use fetchAndUpdateUserInfo ***
        await fetchAndUpdateUserInfo(currentUser);

        // 5. Navigate to the Home Dashboard
        showHomeDashboard(); // Go to home after setup

        hideLoading();
        console.log("Onboarding complete. Main application displayed.");

    } catch (error) {
        console.error("Error completing onboarding:", error);
        alert("Failed to complete setup: " + error.message + "\nPlease try selecting a subject again.");
        hideLoading();
        // Optionally attempt to re-show the onboarding UI on failure
        document.getElementById('onboarding-container')?.remove();
        showOnboardingUI(); // Re-show if setup failed critically
    }
}