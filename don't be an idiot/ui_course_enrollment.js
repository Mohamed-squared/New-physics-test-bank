// --- START OF FILE ui_course_enrollment.js ---

// ui_course_enrollment.js

// CORRECTED: Added setActiveCourseId to the import from state.js
import { currentUser, db, globalCourseDataMap, userCourseProgressMap, setActiveCourseId } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading } from './utils.js';
import { saveUserCourseProgress } from './firebase_firestore.js';
import { showCourseDashboard } from './ui_course_dashboard.js';
import { FOP_COURSE_ID } from './config.js'; // Import FoP ID if needed for specific logic

export function showCourseEnrollment(courseId) {
    if (!currentUser) {
        alert("Please log in to enroll in a course.");
        return;
    }
    setActiveSidebarLink('showBrowseCourses'); // Keep courses highlighted

    const course = globalCourseDataMap.get(courseId);
    if (!course) {
        displayContent(`<p class="text-red-500 p-4">Error: Course details not found for ID: ${courseId}.</p><button onclick="window.showBrowseCourses()" class="btn-secondary mt-2">Back to Courses</button>`);
        return;
    }
    if (userCourseProgressMap.has(courseId)) {
        alert(`You are already enrolled in "${course.name}".`);
        showCourseDashboard(courseId); // Navigate to existing dashboard
        return;
    }

    const html = `
    <div class="max-w-lg mx-auto animate-fade-in">
        <div class="content-card">
            <h2 class="text-2xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Enroll in Course</h2>
            <p class="text-xl font-medium text-primary-600 dark:text-primary-400 mb-6">${course.name}</p>

            <form id="enrollment-form" onsubmit="window.handlePaceSelection(event, '${courseId}')">
                <label for="pace-selection" class="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">Select Your Learning Pace:</label>
                <p class="text-sm text-muted mb-5">Choose how quickly you want to aim to complete the course. 'Mediocre' pace will be calculated based on your first week's progress.</p>

                <div class="space-y-4 mb-6">
                    <div>
                        <input type="radio" id="pace-compact" name="pace" value="compact" class="mr-2" required>
                        <label for="pace-compact"><strong>Compact Pace:</strong> Finish faster (approx. 125% of standard pace).</label>
                    </div>
                    <div>
                        <input type="radio" id="pace-mediocre" name="pace" value="mediocre" class="mr-2" checked>
                        <label for="pace-mediocre"><strong>Mediocre Pace:</strong> Balanced pace (calculated after 1 week).</label>
                    </div>
                    <div>
                        <input type="radio" id="pace-lenient" name="pace" value="lenient" class="mr-2">
                        <label for="pace-lenient"><strong>Lenient Pace:</strong> More relaxed (approx. 75% of standard pace).</label>
                    </div>
                    <div>
                        <input type="radio" id="pace-custom" name="pace" value="custom" class="mr-2" onchange="document.getElementById('custom-pace-input').classList.toggle('hidden', !this.checked);">
                        <label for="pace-custom"><strong>Custom Pace:</strong> Set your target completion time.</label>
                        <div id="custom-pace-input" class="mt-2 hidden">
                             <label for="custom-days" class="text-sm">Target days to complete:</label>
                             <input type="number" id="custom-days" min="7" placeholder="e.g., 90" class="w-full mt-1 text-sm">
                             <p class="form-help-text">Enter the total number of days you want to finish the course in (minimum 7).</p>
                        </div>
                    </div>
                </div>

                <button type="submit" class="btn-primary w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 mr-2"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" /></svg>
                    Enroll & Start Learning
                </button>
                <button type="button" onclick="window.showBrowseCourses()" class="btn-secondary w-full mt-2">Cancel</button>
            </form>
        </div>
    </div>
    `;
    displayContent(html);
}

export async function handlePaceSelection(event, courseId) {
    event.preventDefault();
    if (!currentUser || !db) return;

    const form = document.getElementById('enrollment-form');
    const selectedPace = form.elements['pace'].value;
    let customDays = null;

    if (selectedPace === 'custom') {
        const customDaysInput = document.getElementById('custom-days');
        customDays = parseInt(customDaysInput.value);
        if (isNaN(customDays) || customDays < 7) {
            alert("Please enter a valid number of days (minimum 7) for the custom pace.");
            customDaysInput.focus();
            return;
        }
    }

    showLoading("Enrolling in course...");

    const initialProgressData = {
        courseId: courseId,
        enrollmentDate: firebase.firestore.FieldValue.serverTimestamp(), // Use server timestamp for accuracy
        selectedPace: selectedPace,
        customPaceDays: customDays,
        baseMediocrePace: null, // To be calculated
        currentPace: null, // To be calculated
        courseStudiedChapters: [], // Start with none studied for the course
        dailyProgress: {},
        // Initialize score/tracking objects
        watchedVideoUrls: {}, // Keep for potential future use
        watchedVideoDurations: {},
        pdfProgress: {}, // Initialize pdfProgress
        skipExamAttempts: {},
        lastSkipExamScore: {},
        // skipExamScores: {}, // Removed from grading
        assignmentScores: {},
        weeklyExamScores: {},
        midcourseExamScores: {},
        finalExamScores: null,
        attendanceScore: 100, // Start at 100, decrease if assignments missed
        extraPracticeBonus: 0, // Start at 0
        totalMark: null,
        grade: null,
        status: 'enrolled',
        completionDate: null,
        lastActivityDate: firebase.firestore.FieldValue.serverTimestamp(),
        currentChapterTarget: 1, // Start with chapter 1
        currentDayObjective: "Review Chapter 1 Study Material", // Initial objective
    };

    // Ensure dailyProgress has initialized sub-objects (although it's empty initially)
     Object.keys(initialProgressData.dailyProgress).forEach(dateStr => {
         initialProgressData.dailyProgress[dateStr] = initialProgressData.dailyProgress[dateStr] || {};
         initialProgressData.dailyProgress[dateStr].chaptersStudied = initialProgressData.dailyProgress[dateStr].chaptersStudied || [];
         initialProgressData.dailyProgress[dateStr].skipExamsPassed = initialProgressData.dailyProgress[dateStr].skipExamsPassed || [];
         initialProgressData.dailyProgress[dateStr].assignmentCompleted = initialProgressData.dailyProgress[dateStr].assignmentCompleted ?? false;
         initialProgressData.dailyProgress[dateStr].assignmentScore = initialProgressData.dailyProgress[dateStr].assignmentScore ?? null;
     });


    // Save this initial progress data to Firestore
    const success = await saveUserCourseProgress(currentUser.uid, courseId, initialProgressData);

    hideLoading();

    if (success) {
        // Update local state immediately with client-side date for consistency
        // Use a deep copy to avoid modifying the object used for saving
        const localProgressData = JSON.parse(JSON.stringify(initialProgressData));
        localProgressData.enrollmentDate = new Date(); // Use client time for local state map
        localProgressData.lastActivityDate = new Date();
        // Remove server timestamp fields before adding to local map
        if(localProgressData.enrollmentDate?.FieldValue) delete localProgressData.enrollmentDate.FieldValue;
        if(localProgressData.lastActivityDate?.FieldValue) delete localProgressData.lastActivityDate.FieldValue;

        userCourseProgressMap.set(courseId, localProgressData);
        setActiveCourseId(courseId); // Set this as the active course *after* success
        console.log(`Successfully enrolled in course ${courseId} with pace: ${selectedPace}`);
        showCourseDashboard(courseId); // Navigate to the course dashboard
    } else {
        alert("Failed to enroll in the course. Please try again.");
    }
}

// --- END OF FILE ui_course_enrollment.js ---