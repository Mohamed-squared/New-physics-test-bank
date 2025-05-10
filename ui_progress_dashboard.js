// --- START OF FILE ui_progress_dashboard.js ---
import { currentSubject, charts, setCharts, data } from './state.js';
import { displayContent, clearContent, setActiveSidebarLink } from './ui_core.js';
import { calculateDifficulty } from './test_logic.js';
import { showManageSubjects } from './ui_subjects.js';
import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.js/+esm';

Chart.register(...registerables);

export function showProgressDashboard() {
    console.log(`[showProgressDashboard] Called. Current subject ID: ${currentSubject?.id}`);
    try {
        const chaptersSnippet = JSON.stringify(currentSubject?.chapters, (key, value) => typeof value === 'bigint' ? value.toString() : value);
        console.log(`[showProgressDashboard] currentSubject.chapters data being used: ${chaptersSnippet.substring(0, 500)}${chaptersSnippet.length > 500 ? '...' : ''}`);
    } catch (e) { console.warn("[showProgressDashboard] Could not stringify chapter data for logging."); }

    if (!currentSubject) {
        console.log("[showProgressDashboard] No currentSubject selected.");
        displayContent('<p class="text-yellow-500 p-4">Please select a subject to view its progress dashboard.</p><button onclick="window.showManageSubjects()" class="btn-secondary mt-2">Manage Subjects</button>');
        setActiveSidebarLink('showProgressDashboard', 'sidebar-standard-nav');
        return;
    }

    // Destroy existing charts before proceeding to ensure no stale data
    Object.values(charts).forEach(chart => {
        if (chart instanceof Chart) {
            chart.destroy();
            console.log("[showProgressDashboard] Destroyed existing chart instance.");
        }
    });
    setCharts({}); // Clear the charts state

    clearContent();
    document.getElementById('dashboard')?.classList.remove('hidden');

    const dashboardContentEl = document.getElementById('dashboard-content');
    if (!dashboardContentEl) {
        console.error("[showProgressDashboard] Dashboard content element (#dashboard-content) not found.");
        return;
    }

    const chapters = currentSubject.chapters;
    if (!chapters || Object.keys(chapters).length === 0) {
        console.log(`[showProgressDashboard] No chapter data available for subject "${currentSubject.name || 'Unnamed'}" to display the dashboard.`);
        dashboardContentEl.innerHTML = `<p class="text-yellow-500 p-4 text-center">No chapter data available for subject "${currentSubject.name || 'Unnamed'}" to display the dashboard.</p>`;
        return;
    }

    const chaptersWithQuestions = Object.keys(chapters).filter(num => chapters[num] && chapters[num].total_questions > 0);
    if (chaptersWithQuestions.length === 0) {
        console.log(`[showProgressDashboard] No chapters with questions defined for subject "${currentSubject.name || 'Unnamed'}". Cannot display progress.`);
        dashboardContentEl.innerHTML = `<p class="text-yellow-500 p-4 text-center">No chapters with questions defined for subject "${currentSubject.name || 'Unnamed'}". Cannot display progress.</p>`;
        return;
    }

    // Clear existing content and set new HTML structure
    dashboardContentEl.innerHTML = '';
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

    // Use a timeout to ensure DOM is updated before rendering charts
    setTimeout(() => {
        console.log("[showProgressDashboard] DOM updated, proceeding to render charts.");
        renderCharts();
    }, 0);

    setActiveSidebarLink('showProgressDashboard', 'testgen-dropdown-content');
}

export function closeDashboard() {
    document.getElementById('dashboard')?.classList.add('hidden');
    Object.values(charts).forEach(chart => {
        if (chart instanceof Chart) {
            chart.destroy();
        }
    });
    setCharts({});

    clearContent();
    window.showTestGenerationDashboard();
}

export function renderCharts() {
    console.log("[RenderCharts] Attempting to render charts. Current subject ID (from module scope):", currentSubject?.id);
    const activeSubject = currentSubject;
    if (!activeSubject) {
        console.warn("[RenderCharts] Cannot render charts, activeSubject (read from currentSubject) is null or undefined.");
        const dashboardContentEl = document.getElementById('dashboard-content');
        if (dashboardContentEl) dashboardContentEl.innerHTML = '<p class="text-center p-4 text-gray-500">Subject data is not available for charts.</p>';
        return;
    }
    try {
        const subjectStateSnippet = JSON.stringify(activeSubject, (key, value) => typeof value === 'bigint' ? value.toString() : value);
        console.log("[RenderCharts] Data state being read for charts (activeSubject):", subjectStateSnippet.substring(0, 500) + (subjectStateSnippet.length > 500 ? '...' : ''));
    } catch(e) { console.warn("[RenderCharts] Could not stringify activeSubject data for logging."); }

    if (!activeSubject.chapters) {
        console.warn("[RenderCharts] Cannot render charts, activeSubject.chapters data missing.");
        const dashboardContentEl = document.getElementById('dashboard-content');
        if (dashboardContentEl) dashboardContentEl.innerHTML = '<p class="text-center p-4 text-gray-500">Subject chapter data is not available for charts.</p>';
        return;
    }

    const chapters = activeSubject.chapters;
    const chapterNumbers = Object.keys(chapters)
                          .filter(num => chapters[num] && chapters[num].total_questions > 0)
                          .sort((a, b) => parseInt(a) - parseInt(b));

    console.log(`[RenderCharts] Found ${chapterNumbers.length} chapters with questions to chart:`, chapterNumbers);

    if (chapterNumbers.length === 0) {
        console.log("[RenderCharts] No chapters with questions found in current subject data to render charts for:", activeSubject?.name);
        const dashboardContentEl = document.getElementById('dashboard-content');
        if (dashboardContentEl) dashboardContentEl.innerHTML = '<p class="text-center p-4 text-gray-500">No data to display in charts.</p>';
        return;
    }

    // Ensure charts are destroyed (redundant but safe)
    Object.values(charts).forEach(chart => {
        if (chart instanceof Chart) {
            chart.destroy();
        }
    });
    const newCharts = {};

    try {
        const attempted = chapterNumbers.map(num => chapters[num]?.total_attempted ?? 0);
        const wrong = chapterNumbers.map(num => chapters[num]?.total_wrong ?? 0);
        const mastery = chapterNumbers.map(num => chapters[num]?.consecutive_mastery ?? 0);
        const difficulty = chapterNumbers.map(num => calculateDifficulty(chapters[num]));
        const labels = chapterNumbers.map(num => `Ch ${num}`);

        console.log("[RenderCharts] Data for charts:", { labels, attempted, wrong, mastery, difficulty });

        const isDarkMode = document.documentElement.classList.contains('dark');
        const gridColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        const tickColor = isDarkMode ? '#cbd5e1' : '#4b5563';
        const titleColor = isDarkMode ? '#e5e7eb' : '#374151';

        const commonOptions = () => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: false },
                tooltip: {
                    backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.9)' : 'rgba(31, 41, 55, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    callbacks: {
                        title: function(tooltipItems) {
                            const label = tooltipItems[0]?.label || '';
                            return `Chapter ${label.substring(3)}`;
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
                    grid: { display: false },
                    ticks: { color: tickColor }
                }
            },
            animation: {
                duration: 400
            }
        });

        const attemptedCtx = document.getElementById('attemptedChart')?.getContext('2d');
        const wrongCtx = document.getElementById('wrongChart')?.getContext('2d');
        const masteryCtx = document.getElementById('masteryChart')?.getContext('2d');
        const difficultyCtx = document.getElementById('difficultyChart')?.getContext('2d');

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

        if (masteryCtx) {
            console.log("[RenderCharts] Creating Mastery Chart");
            const masteryOptions = commonOptions();
            const maxMasteryValue = mastery.length > 0 ? Math.max(7, ...mastery) : 7;
            masteryOptions.scales.y.suggestedMax = maxMasteryValue + 1;
            newCharts.masteryChart = new Chart(masteryCtx, {
                type: 'bar',
                data: { labels: labels, datasets: [{ label: 'Mastery Tests', data: mastery, backgroundColor: 'rgba(34, 197, 94, 0.7)', borderColor: 'rgb(34, 197, 94)', borderWidth: 1 }] },
                options: masteryOptions
            });
        } else {
            console.warn("[RenderCharts] Canvas context for 'masteryChart' not found.");
        }

        if (difficultyCtx) {
            console.log("[RenderCharts] Creating Difficulty Chart");
            const difficultyOptions = commonOptions();
            difficultyOptions.scales.y.max = 150;
            difficultyOptions.scales.y.ticks.callback = function(value) { return value + '%'; };
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
                        backgroundColor: difficulty.map(d => d >= 100 ? 'rgba(239, 68, 68, 0.7)' : d >= 50 ? 'rgba(234, 179, 8, 0.7)' : 'rgba(34, 197, 94, 0.7)'),
                        borderColor: difficulty.map(d => d >= 100 ? 'rgb(239, 68, 68)' : d >= 50 ? 'rgb(234, 179, 8)' : 'rgb(34, 197, 94)'),
                        borderWidth: 1
                    }]
                },
                options: difficultyOptions
            });
        } else {
            console.warn("[RenderCharts] Canvas context for 'difficultyChart' not found.");
        }

        setCharts(newCharts);
        console.log("[RenderCharts] Charts rendered successfully.");

    } catch (error) {
        console.error("[RenderCharts] Error rendering charts:", error);
        const dashboardContentEl = document.getElementById('dashboard-content');
        if (dashboardContentEl) {
            dashboardContentEl.innerHTML = '<p class="text-center p-4 text-red-500">An error occurred while rendering the progress charts. Please check the console.</p>';
        } else {
            console.error("[RenderCharts] Also failed to find #dashboard-content to display error message.");
        }
    }
}
// --- END OF FILE ui_progress_dashboard.js ---