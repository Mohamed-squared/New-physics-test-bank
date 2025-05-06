// --- START OF FILE ui_progress_dashboard.js ---

import { currentSubject, charts, setCharts, data } from './state.js'; // Import charts state & data
import { displayContent, clearContent, setActiveSidebarLink } from './ui_core.js'; // Added setActiveSidebarLink
import { calculateDifficulty } from './test_logic.js'; // Import necessary logic
import { showManageSubjects } from './ui_subjects.js'; // Import for link
// Use Chart.js via ES module import
import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.js/+esm';

Chart.register(...registerables); // Register necessary components

// --- Progress Dashboard ---

export function showProgressDashboard() {
     // *** MODIFICATION: Added logging at the start ***
     console.log(`[showProgressDashboard] Called. Current subject ID: ${currentSubject?.id}`);
     try {
         const chaptersSnippet = JSON.stringify(currentSubject?.chapters, (key, value) => typeof value === 'bigint' ? value.toString() : value); // Handle BigInt if any
         console.log(`[showProgressDashboard] currentSubject.chapters data being used: ${chaptersSnippet.substring(0, 500)}${chaptersSnippet.length > 500 ? '...' : ''}`);
     } catch (e) { console.warn("[showProgressDashboard] Could not stringify chapter data for logging."); }
     // *** END MODIFICATION ***

     if (!currentSubject) {
         console.log("[showProgressDashboard] No currentSubject selected.");
         displayContent('<p class="text-yellow-500 p-4">Please select a subject to view its progress dashboard.</p><button onclick="window.showManageSubjects()" class="btn-secondary mt-2">Manage Subjects</button>');
         setActiveSidebarLink('showProgressDashboard', 'sidebar-standard-nav'); // Still set active link
         return;
     }
    clearContent(); // Clear main content area first
    document.getElementById('dashboard')?.classList.remove('hidden'); // Show the dashboard container

    const dashboardContentEl = document.getElementById('dashboard-content');
    if (!dashboardContentEl) {
         console.error("[showProgressDashboard] Dashboard content element (#dashboard-content) not found.");
         return;
    }

    // Check if subject has chapters defined
    // *** MODIFICATION: Ensure we are reading the latest currentSubject ***
    const chapters = currentSubject.chapters;
    if (!chapters || Object.keys(chapters).length === 0) {
         console.log(`[showProgressDashboard] No chapter data available for subject "${currentSubject.name || 'Unnamed'}" to display the dashboard.`);
         dashboardContentEl.innerHTML = `<p class="text-yellow-500 p-4 text-center">No chapter data available for subject "${currentSubject.name || 'Unnamed'}" to display the dashboard.</p>`;
         return;
    }

    // Check if there are any chapters with actual questions (total_questions > 0)
    const chaptersWithQuestions = Object.keys(chapters).filter(num => chapters[num] && chapters[num].total_questions > 0);
    if (chaptersWithQuestions.length === 0) {
         console.log(`[showProgressDashboard] No chapters with questions defined for subject "${currentSubject.name || 'Unnamed'}". Cannot display progress.`);
         dashboardContentEl.innerHTML = `<p class="text-yellow-500 p-4 text-center">No chapters with questions defined for subject "${currentSubject.name || 'Unnamed'}". Cannot display progress.</p>`;
         return;
    }

    // Set the HTML structure for the charts
    dashboardContentEl.innerHTML = `
         <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
             <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow min-h-[18rem]">
                 <h3 class="text-base font-semibold mb-3 text-center text-gray-700 dark:text-gray-300">Difficulty Score (%)</h3>
                 <div class="h-60 relative"><canvas id="difficultyChart"></canvas></div>
             </div>
             <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow min-h-[18rem]">
                 <h3 class="text-base font-semibold mb-3 text-center text-gray-700 dark:text-gray-300">Consecutive Mastery (Tests)</h3>
                 <div class="h-60 relative"><canvas id="masteryChart"></canvas></div>
             </div>
             <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow min-h-[18rem]">
                 <h3 class="text-base font-semibold mb-3 text-center text-gray-700 dark:text-gray-300">Questions Attempted</h3>
                 <div class="h-60 relative"><canvas id="attemptedChart"></canvas></div>
             </div>
             <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow min-h-[18rem]">
                 <h3 class="text-base font-semibold mb-3 text-center text-gray-700 dark:text-gray-300">Wrong Answers</h3>
                 <div class="h-60 relative"><canvas id="wrongChart"></canvas></div>
             </div>
         </div>
     `;

     // Use requestAnimationFrame to ensure the DOM is updated before rendering charts
     requestAnimationFrame(renderCharts);
     // MODIFIED: Target correct dropdown parent link
     setActiveSidebarLink('showProgressDashboard', 'testgen-dropdown-content'); // Set active link within dropdown
}

export function closeDashboard() {
    // This function is now effectively replaced by the button navigating directly
    // Kept here in case it's called elsewhere, but behavior should be reconsidered
    document.getElementById('dashboard')?.classList.add('hidden');
    // Destroy charts when closing dashboard to free resources
    Object.values(charts).forEach(chart => {
         if (chart instanceof Chart) { // Check if it's a Chart instance
             chart.destroy();
         }
     });
    setCharts({}); // Clear the charts state

    clearContent(); // Clear the dynamic #content area
    // Navigate back to the TestGen main view instead of a generic prompt
    window.showTestGenerationDashboard(); // Use window scope
}

// Separate function to handle chart rendering
export function renderCharts() {
     // *** MODIFICATION: Added logging and re-read state at the start ***
     console.log("[RenderCharts] Attempting to render charts. Current subject ID:", currentSubject?.id);
     // Explicitly read currentSubject from state *inside* the function
     const activeSubject = currentSubject;
     if (!activeSubject) {
         console.warn("[RenderCharts] Cannot render charts, currentSubject is null or undefined.");
         const dashboardContentEl = document.getElementById('dashboard-content');
         if (dashboardContentEl) dashboardContentEl.innerHTML = '<p class="text-center p-4 text-gray-500">Subject data is not available for charts.</p>';
         return;
     }
     try {
         const subjectStateSnippet = JSON.stringify(activeSubject, (key, value) => typeof value === 'bigint' ? value.toString() : value);
         console.log("[RenderCharts] Data state being read for charts:", subjectStateSnippet.substring(0, 500) + (subjectStateSnippet.length > 500 ? '...' : ''));
     } catch(e) { console.warn("[RenderCharts] Could not stringify subject data for logging."); }

     // Check again if subject and chapters exist before rendering
     if (!activeSubject.chapters) {
         console.warn("[RenderCharts] Cannot render charts, subject.chapters data missing.");
         const dashboardContentEl = document.getElementById('dashboard-content');
         if (dashboardContentEl) dashboardContentEl.innerHTML = '<p class="text-center p-4 text-gray-500">Subject chapter data is not available for charts.</p>';
         return;
     }
     // *** END MODIFICATION ***

    const chapters = activeSubject.chapters; // Use the locally captured activeSubject
    // Filter and sort chapters that have questions
    const chapterNumbers = Object.keys(chapters)
                           .filter(num => chapters[num] && chapters[num].total_questions > 0)
                           .sort((a, b) => parseInt(a) - parseInt(b));

     // --- MODIFICATION: Log filtered chapters ---
     console.log(`[RenderCharts] Found ${chapterNumbers.length} chapters with questions to chart:`, chapterNumbers);
     // --- END MODIFICATION ---

     if (chapterNumbers.length === 0) {
         console.log("[RenderCharts] No chapters with questions found in current subject data to render charts for:", activeSubject?.name);
         // Optionally display a message in the dashboard content area
         const dashboardContentEl = document.getElementById('dashboard-content');
         if (dashboardContentEl) dashboardContentEl.innerHTML = '<p class="text-center p-4 text-gray-500">No data to display in charts.</p>';
         return;
     }

    // Destroy existing chart instances before creating new ones
    Object.values(charts).forEach(chart => {
         if (chart instanceof Chart) {
             chart.destroy();
         }
     });
    const newCharts = {}; // Store new chart instances locally

    try {
        // Prepare data arrays for charts
        // *** MODIFICATION: Ensure default values (0) if properties are missing/null/undefined ***
        const attempted = chapterNumbers.map(num => chapters[num]?.total_attempted ?? 0);
        const wrong = chapterNumbers.map(num => chapters[num]?.total_wrong ?? 0);
        const mastery = chapterNumbers.map(num => chapters[num]?.consecutive_mastery ?? 0);
        const difficulty = chapterNumbers.map(num => calculateDifficulty(chapters[num])); // calculateDifficulty should handle potential undefined input
        const labels = chapterNumbers.map(num => `Ch ${num}`); // Labels for X-axis

        // Log prepared data arrays for verification
        console.log("[RenderCharts] Data for charts:", { labels, attempted, wrong, mastery, difficulty });

        // Chart configuration based on theme
        const isDarkMode = document.documentElement.classList.contains('dark');
        const gridColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        const tickColor = isDarkMode ? '#cbd5e1' : '#4b5563'; // e.g., slate-300 / gray-600
        const titleColor = isDarkMode ? '#e5e7eb' : '#374151'; // e.g., gray-200 / gray-700

        // Common Chart.js options
        const commonOptions = () => ({ // Use arrow function to get fresh object
            responsive: true,
            maintainAspectRatio: false, // Allow chart to fill container height
            plugins: {
                legend: { display: false }, // No legend needed for single dataset
                title: { display: false }, // Title set via HTML <h3> above canvas
                tooltip: {
                    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.9)' : 'rgba(31, 41, 55, 0.9)', // Darker tooltip
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    callbacks: {
                        // Customize tooltip title (e.g., "Chapter 5")
                        title: function(tooltipItems) {
                            const label = tooltipItems[0]?.label || '';
                            return `Chapter ${label.substring(3)}`; // Assumes label format "Ch X"
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, color: tickColor },
                    grid: { color: gridColor }
                },
                x: {
                    grid: { display: false }, // Hide vertical grid lines
                    ticks: { color: tickColor }
                }
            },
            animation: {
                 duration: 400 // Slightly faster animation
            }
        });

        // Get canvas contexts
        const attemptedCtx = document.getElementById('attemptedChart')?.getContext('2d');
        const wrongCtx = document.getElementById('wrongChart')?.getContext('2d');
        const masteryCtx = document.getElementById('masteryChart')?.getContext('2d');
        const difficultyCtx = document.getElementById('difficultyChart')?.getContext('2d');

        // --- MODIFICATION: Check context before creating chart ---
        // Create Attempted Chart
        if (attemptedCtx) {
            console.log("[RenderCharts] Creating Attempted Chart");
            newCharts.attemptedChart = new Chart(attemptedCtx, {
                type: 'bar',
                data: { labels: labels, datasets: [{ label: 'Attempted', data: attempted, backgroundColor: 'rgba(59, 130, 246, 0.7)', borderColor: 'rgb(59, 130, 246)', borderWidth: 1 }] },
                options: commonOptions()
            });
        } else {
            console.warn("[RenderCharts] Canvas context for 'attemptedChart' not found.");
        }

        // Create Wrong Chart
        if (wrongCtx) {
            console.log("[RenderCharts] Creating Wrong Chart");
            newCharts.wrongChart = new Chart(wrongCtx, {
                type: 'bar',
                data: { labels: labels, datasets: [{ label: 'Wrong', data: wrong, backgroundColor: 'rgba(239, 68, 68, 0.7)', borderColor: 'rgb(239, 68, 68)', borderWidth: 1 }] },
                options: commonOptions()
            });
        } else {
            console.warn("[RenderCharts] Canvas context for 'wrongChart' not found.");
        }

        // Create Mastery Chart
        if (masteryCtx) {
             console.log("[RenderCharts] Creating Mastery Chart");
            // Suggest a max Y-axis value for mastery (e.g., slightly above typical mastery goal)
            const masteryOptions = commonOptions();
            const maxMasteryValue = mastery.length > 0 ? Math.max(7, ...mastery) : 7; // Default max suggestion
            masteryOptions.scales.y.suggestedMax = maxMasteryValue + 1; // Show slightly above max achieved or 7
            newCharts.masteryChart = new Chart(masteryCtx, {
                type: 'bar',
                data: { labels: labels, datasets: [{ label: 'Mastery Tests', data: mastery, backgroundColor: 'rgba(34, 197, 94, 0.7)', borderColor: 'rgb(34, 197, 94)', borderWidth: 1 }] },
                options: masteryOptions
            });
        } else {
            console.warn("[RenderCharts] Canvas context for 'masteryChart' not found.");
        }

        // Create Difficulty Chart (with color coding)
         if (difficultyCtx) {
            console.log("[RenderCharts] Creating Difficulty Chart");
            const difficultyOptions = commonOptions();
             difficultyOptions.scales.y.max = 150; // Set explicit max for difficulty scale
             difficultyOptions.scales.y.ticks.callback = function(value) { return value + '%'; }; // Add '%' to Y-axis ticks
             // Custom tooltip label for difficulty
             difficultyOptions.plugins.tooltip.callbacks.label = function(tooltipItem) {
                 return `Difficulty: ${tooltipItem.raw?.toFixed(1) || 0}%`;
             };

            newCharts.difficultyChart = new Chart(difficultyCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Difficulty Score',
                        data: difficulty,
                        // Color bars based on difficulty value
                        backgroundColor: difficulty.map(d => d >= 100 ? 'rgba(239, 68, 68, 0.7)' : d >= 50 ? 'rgba(234, 179, 8, 0.7)' : 'rgba(34, 197, 94, 0.7)'), // Red / Yellow / Green
                        borderColor: difficulty.map(d => d >= 100 ? 'rgb(239, 68, 68)' : d >= 50 ? 'rgb(234, 179, 8)' : 'rgb(34, 197, 94)'),
                        borderWidth: 1
                    }]
                },
                options: difficultyOptions
            });
         } else {
            console.warn("[RenderCharts] Canvas context for 'difficultyChart' not found.");
        }
         // --- END MODIFICATION ---

         setCharts(newCharts); // Update the global/shared charts state
         console.log("[RenderCharts] Charts rendered successfully.");

    } catch (error) {
        console.error("[RenderCharts] Error rendering charts:", error);
         const dashboardContentEl = document.getElementById('dashboard-content');
          // --- MODIFICATION: Check element existence in catch block ---
          if (dashboardContentEl) {
              // Clear previous attempts and show error
              dashboardContentEl.innerHTML = '<p class="text-center p-4 text-red-500">An error occurred while rendering the progress charts. Please check the console.</p>';
          } else {
              console.error("[RenderCharts] Also failed to find #dashboard-content to display error message.");
          }
          // --- END MODIFICATION ---
    }
}
// --- END OF FILE ui_progress_dashboard.js ---