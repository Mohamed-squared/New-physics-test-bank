

// --- START OF FILE ui_progress_dashboard.js ---

import { currentSubject, charts, setCharts } from './state.js'; // Import charts state
import { displayContent, clearContent, setActiveSidebarLink } from './ui_core.js'; // Added setActiveSidebarLink
import { calculateDifficulty } from './test_logic.js'; // Import necessary logic
import { showManageSubjects } from './ui_subjects.js'; // Import for link
// Use Chart.js via ES module import
import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.js/+esm';

Chart.register(...registerables); // Register necessary components

// --- Progress Dashboard ---

export function showProgressDashboard() {
     if (!currentSubject) {
         displayContent('<p class="text-yellow-500 p-4">Please select a subject to view its progress dashboard.</p><button onclick="window.showManageSubjects()" class="btn-secondary mt-2">Manage Subjects</button>');
         setActiveSidebarLink('showProgressDashboard', 'sidebar-standard-nav'); // Still set active link
         return;
     }
    clearContent(); // Clear main content area first
    document.getElementById('dashboard')?.classList.remove('hidden'); // Show the dashboard container

    const dashboardContentEl = document.getElementById('dashboard-content');
    if (!dashboardContentEl) {
         console.error("Dashboard content element (#dashboard-content) not found.");
         return;
    }

    // Check if subject has chapters defined
    const chapters = currentSubject.chapters;
    if (!chapters || Object.keys(chapters).length === 0) {
         dashboardContentEl.innerHTML = `<p class="text-red-500 p-4 text-center">No chapter data available for subject "${currentSubject.name || 'Unnamed'}" to display the dashboard.</p>`;
         return;
    }

    // Check if there are any chapters with actual questions (total_questions > 0)
    const chaptersWithQuestions = Object.keys(chapters).filter(num => chapters[num] && chapters[num].total_questions > 0);
    if (chaptersWithQuestions.length === 0) {
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
     // MODIFICATION: Add logs at the start
     console.log("[RenderCharts] Attempting to render charts. Current subject ID:", currentSubject?.id);
     console.log("[RenderCharts] Data state being read:", JSON.stringify(currentSubject, null, 2));
     // Check again if subject and chapters exist before rendering
     if (!currentSubject || !currentSubject.chapters) {
         console.warn("Cannot render charts, subject or chapter data missing.");
         return;
     }
    const chapters = currentSubject.chapters;
    // Filter and sort chapters that have questions
    const chapterNumbers = Object.keys(chapters)
                           .filter(num => chapters[num] && chapters[num].total_questions > 0)
                           .sort((a, b) => parseInt(a) - parseInt(b));

     if (chapterNumbers.length === 0) {
         // MODIFICATION: Improve log message
         console.log("[RenderCharts] No chapters with questions found in current subject data to render charts for:", currentSubject?.name);
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
        const attempted = chapterNumbers.map(num => chapters[num]?.total_attempted || 0);
        const wrong = chapterNumbers.map(num => chapters[num]?.total_wrong || 0);
        const mastery = chapterNumbers.map(num => chapters[num]?.consecutive_mastery || 0);
        const difficulty = chapterNumbers.map(num => calculateDifficulty(chapters[num]));
        const labels = chapterNumbers.map(num => `Ch ${num}`); // Labels for X-axis

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

        // Create Attempted Chart
        if (attemptedCtx) {
            newCharts.attemptedChart = new Chart(attemptedCtx, {
                type: 'bar',
                data: { labels: labels, datasets: [{ label: 'Attempted', data: attempted, backgroundColor: 'rgba(59, 130, 246, 0.7)', borderColor: 'rgb(59, 130, 246)', borderWidth: 1 }] },
                options: commonOptions()
            });
        }

        // Create Wrong Chart
        if (wrongCtx) {
            newCharts.wrongChart = new Chart(wrongCtx, {
                type: 'bar',
                data: { labels: labels, datasets: [{ label: 'Wrong', data: wrong, backgroundColor: 'rgba(239, 68, 68, 0.7)', borderColor: 'rgb(239, 68, 68)', borderWidth: 1 }] },
                options: commonOptions()
            });
        }

        // Create Mastery Chart
        if (masteryCtx) {
            // Suggest a max Y-axis value for mastery (e.g., slightly above typical mastery goal)
            const masteryOptions = commonOptions();
            masteryOptions.scales.y.suggestedMax = Math.max(7, ...mastery) + 1; // Show slightly above max achieved or 7
            newCharts.masteryChart = new Chart(masteryCtx, {
                type: 'bar',
                data: { labels: labels, datasets: [{ label: 'Mastery Tests', data: mastery, backgroundColor: 'rgba(34, 197, 94, 0.7)', borderColor: 'rgb(34, 197, 94)', borderWidth: 1 }] },
                options: masteryOptions
            });
        }

        // Create Difficulty Chart (with color coding)
         if (difficultyCtx) {
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
         }

         setCharts(newCharts); // Update the global/shared charts state
         console.log("Charts rendered successfully.");

    } catch (error) {
        console.error("Error rendering charts:", error);
         const dashboardContentEl = document.getElementById('dashboard-content');
          if (dashboardContentEl) {
              // Clear previous attempts and show error
              dashboardContentEl.innerHTML = '<p class="text-center p-4 text-red-500">An error occurred while rendering the progress charts. Please check the console.</p>';
          }
    }
}
// --- END OF FILE ui_progress_dashboard.js ---