// ui_course_progress.js

import { currentUser, userCourseProgressMap, globalCourseDataMap, activeCourseId, charts, setCharts } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js';
import { calculateTotalMark, getLetterGrade, getLetterGradeColor, calculateAttendanceScore, calculateInitialMediocrePace, updateCurrentPace } from './course_logic.js';
// CORRECTED: Import from the ESM version for module compatibility
import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.js/+esm';

Chart.register(...registerables); // Register necessary components

export function showCourseProgressDetails(courseId = activeCourseId) {
    if (!currentUser || !courseId) return;
    setActiveSidebarLink('showCurrentCourseProgress', 'sidebar-course-nav');

    const progress = userCourseProgressMap.get(courseId);
    const courseDef = globalCourseDataMap.get(courseId);

    if (!progress || !courseDef) {
        displayContent(`<p class="text-red-500 p-4">Error: Could not load progress data for course ID: ${courseId}.</p>`, 'course-dashboard-area');
        return;
    }

    // Calculate metrics
    const totalMark = calculateTotalMark(progress);
    const grade = getLetterGrade(totalMark);
    const gradeColor = getLetterGradeColor(grade);
    const attendance = calculateAttendanceScore(progress);
    const currentPace = updateCurrentPace(progress, courseDef.totalChapters);
    const basePace = progress.baseMediocrePace;

    // Prepare HTML structure (remains the same)
    const html = `
    <div class="animate-fade-in space-y-6">
        <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Progress Details: ${escapeHtml(courseDef.name)}</h2>

        <!-- Overall Summary -->
        <div class="content-card grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="text-center p-4 rounded ${gradeColor.bg} ${gradeColor.border} border">
                <p class="text-sm font-medium ${gradeColor.textMuted}">Overall Grade</p>
                <p class="text-4xl font-bold ${gradeColor.text}">${grade || 'N/A'}</p>
                <p class="text-xs ${gradeColor.textMuted}">${totalMark !== null ? `(${totalMark.toFixed(1)}%)` : '(In Progress)'}</p>
            </div>
            <div class="text-center p-4 border dark:border-gray-600 rounded">
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Attendance</p>
                <p class="text-4xl font-bold text-gray-700 dark:text-gray-200">${attendance}%</p>
                <p class="text-xs text-muted">(Based on daily assignments)</p>
            </div>
            <div class="text-center p-4 border dark:border-gray-600 rounded">
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Current Pace</p>
                <p class="text-4xl font-bold text-gray-700 dark:text-gray-200">${currentPace !== null ? currentPace.toFixed(1) : 'N/A'}</p>
                <p class="text-xs text-muted">Chapters/Day ${basePace ? `(Base: ${basePace.toFixed(1)})` : '(Calculating...)'}</p>
            </div>
        </div>

        <!-- Charts Section -->
        <div class="content-card">
            <h3 class="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Performance Trends</h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[250px]">
                 <div>
                     <h4 class="text-sm font-medium text-center mb-2 text-gray-600 dark:text-gray-300">Assignment Scores (%)</h4>
                     <div class="h-60 relative"><canvas id="assignmentScoresChart"></canvas></div>
                 </div>
                 <div>
                     <h4 class="text-sm font-medium text-center mb-2 text-gray-600 dark:text-gray-300">Weekly Exam Scores (%)</h4>
                     <div class="h-60 relative"><canvas id="weeklyScoresChart"></canvas></div>
                 </div>
                 <div>
                     <h4 class="text-sm font-medium text-center mb-2 text-gray-600 dark:text-gray-300">Midcourse Exam Scores (%)</h4>
                     <div class="h-60 relative"><canvas id="midcourseScoresChart"></canvas></div>
                 </div>
                 <div>
                     <h4 class="text-sm font-medium text-center mb-2 text-gray-600 dark:text-gray-300">Chapter Skip Exam Scores (%)</h4>
                     <div class="h-60 relative"><canvas id="skipScoresChart"></canvas></div>
                 </div>
            </div>
        </div>

        <!-- Detailed Scores Table (Example) -->
        <div class="content-card overflow-x-auto">
            <h3 class="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Score Breakdown</h3>
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th scope="col" class="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Component</th>
                        <th scope="col" class="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Details</th>
                        <th scope="col" class="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Average Score (%)</th>
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    ${generateScoreTableRow('Chapter Skip Exams', progress.skipExamScores)}
                    ${generateScoreTableRow('Assignments', progress.assignmentScores)}
                    ${generateScoreTableRow('Weekly Exams', progress.weeklyExamScores)}
                    ${generateScoreTableRow('Midcourse Exams', progress.midcourseExamScores)}
                    ${generateScoreTableRow('Final Exams', progress.finalExamScores)}
                     <tr>
                        <td class="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">Attendance</td>
                        <td class="px-4 py-2 text-gray-500 dark:text-gray-400">-</td>
                        <td class="px-4 py-2 text-right text-gray-700 dark:text-gray-200">${attendance}%</td>
                    </tr>
                     <tr>
                        <td class="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">Extra Practice Bonus</td>
                        <td class="px-4 py-2 text-gray-500 dark:text-gray-400">-</td>
                        <td class="px-4 py-2 text-right text-gray-700 dark:text-gray-200">+${progress.extraPracticeBonus || 0} pts</td>
                    </tr>
                </tbody>
                 <tfoot class="bg-gray-100 dark:bg-gray-700">
                      <tr>
                          <th scope="row" colspan="2" class="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 uppercase">Total Calculated Mark</th>
                          <td class="px-4 py-2 text-right font-bold text-lg text-gray-800 dark:text-gray-100">${totalMark !== null ? totalMark.toFixed(1) + '%' : 'N/A'}</td>
                      </tr>
                      <tr>
                          <th scope="row" colspan="2" class="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 uppercase">Final Grade</th>
                          <td class="px-4 py-2 text-right font-bold text-lg ${gradeColor.text}">${grade || 'N/A'}</td>
                      </tr>
                  </tfoot>
            </table>
        </div>

    </div>`;

    displayContent(html, 'course-dashboard-area');

    // Render charts after HTML is displayed
    requestAnimationFrame(() => renderCourseCharts(progress));
}

export function renderCourseCharts(progress) {
    // Destroy existing charts first (remains the same)
    Object.values(charts).forEach(chart => {
        if (chart instanceof Chart) { // Check if it's a Chart instance
            chart.destroy();
        }
    });
    const newCharts = {};

    const isDarkMode = document.documentElement.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const tickColor = isDarkMode ? '#cbd5e1' : '#4b5563';
    const pointBgColor = isDarkMode ? 'rgb(59, 130, 246)' : 'rgb(37, 99, 235)';
    const pointBorderColor = isDarkMode ? '#ffffff' : '#ffffff';

    const commonOptions = { /* ... options remain the same ... */
         responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.9)' : 'rgba(31, 41, 55, 0.9)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 105, // Scale for percentages
                ticks: { color: tickColor, stepSize: 20, callback: function(value) { return value + '%' } },
                grid: { color: gridColor }
            },
            x: {
                ticks: { color: tickColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }, // Limit ticks shown
                grid: { display: false }
            }
        },
        animation: { duration: 400 },
        elements: {
            point: { radius: 3, hoverRadius: 5, backgroundColor: pointBgColor, borderColor: pointBorderColor },
            line: { tension: 0.1 }
        }
    };
    const drawNoDataMessage = (ctx, text = "No data available") => { /* ... remains the same ... */
         if (!ctx) return;
         const canvas = ctx.canvas;
         ctx.save();
         ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawings
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         ctx.fillStyle = tickColor; // Use tick color for text
         ctx.font = '14px Inter, sans-serif'; // Match theme font if possible
         ctx.fillText(text, canvas.width / 2, canvas.height / 2);
         ctx.restore();
    };

    // Assignment Scores Chart (remains the same)
    const assignmentCtx = document.getElementById('assignmentScoresChart')?.getContext('2d');
    if (assignmentCtx) {
        const scores = progress.assignmentScores || {};
        const labels = Object.keys(scores).sort();
        const dataPoints = labels.map(key => scores[key] || 0);
        if (labels.length > 0) {
            newCharts.assignmentScoresChart = new Chart(assignmentCtx, {
                type: 'line',
                data: { labels: labels.map(l => l.replace('day','D')), datasets: [{ label: 'Score', data: dataPoints, borderColor: 'rgb(59, 130, 246)' }] },
                options: { ...commonOptions }
            });
        } else { drawNoDataMessage(assignmentCtx, "No assignment scores yet."); }
    }

    // Weekly Scores Chart (remains the same)
    const weeklyCtx = document.getElementById('weeklyScoresChart')?.getContext('2d');
    if (weeklyCtx) {
        const scores = progress.weeklyExamScores || {};
        const labels = Object.keys(scores).sort((a, b) => parseInt(a.replace('week','')) - parseInt(b.replace('week','')));
        const dataPoints = labels.map(key => scores[key] || 0);
         if (labels.length > 0) {
            newCharts.weeklyScoresChart = new Chart(weeklyCtx, {
                type: 'bar',
                data: { labels: labels.map(l => l.replace('week', 'Wk ')), datasets: [{ label: 'Score', data: dataPoints, backgroundColor: 'rgba(16, 185, 129, 0.7)', borderColor: 'rgb(16, 185, 129)' }] },
                options: { ...commonOptions, scales: { ...commonOptions.scales, x: { ...commonOptions.scales.x, ticks: { ...commonOptions.scales.x.ticks, maxTicksLimit: 12 } } } }
            });
        } else { drawNoDataMessage(weeklyCtx, "No weekly exam scores yet."); }
    }

    // Midcourse Scores Chart (remains the same)
    const midcourseCtx = document.getElementById('midcourseScoresChart')?.getContext('2d');
    if (midcourseCtx) {
        const scores = progress.midcourseExamScores || {};
        const labels = Object.keys(scores).sort((a, b) => parseInt(a.replace('mid','')) - parseInt(b.replace('mid','')));
        const dataPoints = labels.map(key => scores[key] || 0);
        if (labels.length > 0) {
            newCharts.midcourseScoresChart = new Chart(midcourseCtx, {
                type: 'bar',
                data: { labels: labels.map(l => l.replace('mid', 'Mid ')), datasets: [{ label: 'Score', data: dataPoints, backgroundColor: 'rgba(234, 179, 8, 0.7)', borderColor: 'rgb(234, 179, 8)' }] },
                options: { ...commonOptions }
            });
        } else { drawNoDataMessage(midcourseCtx, "No midcourse exam scores yet."); }
    }

    // Skip Exam Scores Chart (remains the same)
    const skipCtx = document.getElementById('skipScoresChart')?.getContext('2d');
    if (skipCtx) {
         const scores = progress.skipExamScores || {};
         const labels = Object.keys(scores).map(Number).sort((a, b) => a - b);
         const dataPoints = labels.map(key => scores[String(key)] || 0);
         if (labels.length > 0) {
             newCharts.skipScoresChart = new Chart(skipCtx, {
                 type: 'line',
                 data: { labels: labels.map(l => `Ch ${l}`), datasets: [{ label: 'Score', data: dataPoints, borderColor: 'rgb(139, 92, 246)', fill: false }] },
                 options: { ...commonOptions, scales: { ...commonOptions.scales, x: { ...commonOptions.scales.x, ticks: { ...commonOptions.scales.x.ticks, maxTicksLimit: 15 } } } }
             });
         } else { drawNoDataMessage(skipCtx, "No skip exam scores yet."); }
    }

    setCharts(newCharts); // Update the global/shared charts state
    console.log("Course progress charts rendered/updated.");
}

// Helper to generate table rows for score breakdown (remains the same)
function generateScoreTableRow(label, scores) {
    let count = 0;
    let sum = 0;
    let details = '';

    if (Array.isArray(scores)) {
        const validScores = scores.filter(s => s !== null && s !== undefined);
        count = validScores.length;
        sum = validScores.reduce((acc, val) => acc + (val || 0), 0);
        details = `${count} exam${count !== 1 ? 's' : ''}`;
    } else if (scores && typeof scores === 'object') {
        const values = Object.values(scores).filter(val => val !== null && val !== undefined);
        count = values.length;
        sum = values.reduce((acc, val) => acc + val, 0);
        details = `${count} item${count !== 1 ? 's' : ''}`;
    }

    const average = count > 0 ? (sum / count).toFixed(1) : 'N/A';

    return `
        <tr>
            <td class="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">${label}</td>
            <td class="px-4 py-2 text-gray-500 dark:text-gray-400">${details}</td>
            <td class="px-4 py-2 text-right text-gray-700 dark:text-gray-200">${average}${average !== 'N/A' ? '%' : ''}</td>
        </tr>
    `;
}