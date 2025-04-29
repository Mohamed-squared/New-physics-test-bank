// ui_course_progress.js

import { currentUser, userCourseProgressMap, globalCourseDataMap, activeCourseId, charts, setCharts } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
import { showLoading, hideLoading, escapeHtml, getFormattedDate } from './utils.js'; // Added getFormattedDate
import { calculateTotalMark, getLetterGrade, getLetterGradeColor, calculateAttendanceScore, calculateInitialMediocrePace, updateCurrentPace } from './course_logic.js';
// NEW: Import certificate functions
import { generateCertificateOnCanvas, downloadCertificateImage, downloadCertificatePdf } from './certificate_generator.js';
// Use Chart.js via ES module import
import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.js/+esm';
import { SKIP_EXAM_PASSING_PERCENT } from './config.js'; // Import skip exam threshold

Chart.register(...registerables); // Register necessary components

export function showCourseProgressDetails(courseId = activeCourseId) {
    if (!currentUser || !courseId) return;
    setActiveSidebarLink('showCurrentCourseProgress', 'sidebar-course-nav'); // MODIFIED: Ensure correct sidebar is targeted

    const progress = userCourseProgressMap.get(courseId);
    const courseDef = globalCourseDataMap.get(courseId);

    if (!progress || !courseDef) {
        displayContent(`<p class="text-red-500 p-4">Error: Could not load progress data for course ID: ${courseId}.</p>`, 'course-dashboard-area');
        return;
    }

    // --- Calculate Mark, Grade, Attendance ---
    const displayMark = calculateTotalMark(progress);
    const displayGrade = getLetterGrade(displayMark);
    const gradeColor = getLetterGradeColor(displayGrade);
    const attendance = calculateAttendanceScore(progress);
    const currentPace = progress.currentPace ?? null;
    const basePace = progress.baseMediocrePace ?? null;

    // --- Calculate Studied Chapters (including skip exam passes) ---
    const totalChapters = courseDef.totalChapters || 1;
    const studiedChaptersSet = new Set(progress.courseStudiedChapters || []);
    if (progress.lastSkipExamScore) {
        for (let i = 1; i <= totalChapters; i++) {
            const skipScore = progress.lastSkipExamScore[i] || progress.lastSkipExamScore[String(i)];
            if (skipScore !== undefined && skipScore !== null && skipScore >= (courseDef.skipExamPassingPercent || SKIP_EXAM_PASSING_PERCENT)) { // Use config value
                studiedChaptersSet.add(i);
            }
        }
    }
    const studiedChaptersCount = studiedChaptersSet.size;
    const studiedChaptersPercent = totalChapters > 0 ? (studiedChaptersCount / totalChapters) * 100 : 0;

    // --- Debug Log ---
    console.log(`Certificate Check for ${courseId}: Status='${progress.status}', Grade='${displayGrade}', CompletionDate='${progress.completionDate}'`);
    // Use displayGrade for the check
    const shouldShowCert = progress.status === 'completed' && displayGrade && displayGrade !== 'F';
    console.log(`Should show certificate? ${shouldShowCert}`);
    // --- End Debug Log ---

    // --- Certificate Section HTML ---
    let certificateHtml = '';
    // Conditions: course status is 'completed', displayGrade exists, and displayGrade is not 'F'
    if (shouldShowCert) {
         certificateHtml = `
             <div class="content-card">
                 <h3 class="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Course Certificate</h3>
                 <p class="text-sm text-muted mb-4">You have successfully completed this course!</p>
                 <div class="flex flex-col sm:flex-row items-center gap-4">
                     <div class="flex-grow w-full sm:w-2/3 border dark:border-gray-600 rounded p-2 bg-gray-50 dark:bg-gray-700/50">
                         <canvas id="certificate-preview-canvas" class="w-full h-auto"></canvas>

                         <p class="text-xs text-muted text-center mt-1">Certificate Preview (Grade: ${displayGrade})</p>
                     </div>
                     <div class="flex-shrink-0 space-y-2 w-full sm:w-1/3">
                         <button id="cert-regen-btn" onclick="window.regenerateCertificatePreview('${courseId}')" class="w-full btn-secondary-small flex items-center justify-center" title="Regenerate Preview">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 mr-1"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.459 2.152l.663-.178A4.5 4.5 0 0 0 14.035 12l.663.178-1.385 1.386a.75.75 0 0 0 1.06 1.06l2.5-2.5a.75.75 0 0 0 0-1.06l-1.56-1.561Zm-10.624-2.848a5.5 5.5 0 0 1 9.459-2.152l-.663.178A4.5 4.5 0 0 0 5.965 8l-.663-.178 1.385-1.386a.75.75 0 0 0-1.06-1.06l-2.5 2.5a.75.75 0 0 0 0 1.06l1.56 1.561Z" clip-rule="evenodd" /></svg>
                             Regenerate Preview
                         </button>
                         <button id="cert-download-png-btn" onclick="window.downloadCertImage('${courseId}')" class="w-full btn-primary-small flex items-center justify-center" title="Download as Image">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 mr-1"><path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03L10.75 11.364V2.75Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>
                             Download PNG
                         </button>
                         <button id="cert-download-pdf-btn" onclick="window.downloadCertPdf('${courseId}')" class="w-full btn-primary-small flex items-center justify-center" title="Download as PDF">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 mr-1"><path fill-rule="evenodd" d="M13.75 2a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0V3.66l-2.53 2.53a.75.75 0 0 1-1.06-1.06l2.53-2.53H12a.75.75 0 0 1 0-1.5h2.75Z" clip-rule="evenodd" /><path d="M2 3.75C2 3.06 2.56 2.5 3.25 2.5h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v13.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 13.75 19h-10.5A1.75 1.75 0 0 1 1.5 17.25v-13.5C1.5 3.06 2.06 2.5 2.75 2.5Z" /></svg>
                             Download PDF
                         </button>
                     </div>
                 </div>
             </div>
         `;
          console.log("Conditions met, generating certificate HTML.");
     } else if (progress.status === 'completed' && displayGrade === 'F') { // Use displayGrade
         certificateHtml = `<div class="content-card bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-600 border"><p class="text-red-700 dark:text-red-200 text-center font-medium">Course completed, but grade does not meet requirements for a certificate.</p></div>`;
          console.log("Conditions NOT met: Grade is F.");
     } else if (progress.status !== 'completed') {
          certificateHtml = `<div class="content-card bg-gray-50 dark:bg-gray-700/30 border-gray-300 dark:border-gray-600 border"><p class="text-gray-600 dark:text-gray-300 text-center text-sm italic">Certificate will be available upon successful course completion.</p></div>`;
          console.log("Conditions NOT met: Course status is not 'completed'.");
     } else {
          console.log(`Conditions NOT met: isCourseCompleted=${progress.status === 'completed'}, grade=${displayGrade}`);
     }
    // --- End Certificate HTML ---


    const html = `
    <div class="animate-fade-in space-y-6">
        <div class="flex justify-between items-center">
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200">Progress Details: ${escapeHtml(courseDef.name)}</h2>
            <!-- MODIFIED: Added Back Button -->
            <button onclick="window.showCurrentCourseDashboard('${courseId}')" class="btn-secondary-small flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
                Back to Dashboard
            </button>
        </div>

        <!-- Overall Summary -->
        <div class="content-card grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="text-center p-4 rounded ${gradeColor.bg} ${gradeColor.border} border">
                <p class="text-sm font-medium ${gradeColor.textMuted}">Overall Grade</p>

                <p class="text-4xl font-bold ${gradeColor.text}">${displayGrade || 'N/A'}</p>

                <p class="text-xs ${gradeColor.textMuted}">${displayMark !== null ? `(${displayMark.toFixed(1)}%)` : '(In Progress)'}</p>
            </div>
            <div class="text-center p-4 border dark:border-gray-600 rounded">
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Attendance</p>
                <p class="text-4xl font-bold text-gray-700 dark:text-gray-200">${attendance}%</p>
                <p class="text-xs text-muted">(Based on daily assignments or chapter study/skip)</p>
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
                     <h4 class="text-sm font-medium text-center mb-2 text-gray-600 dark:text-gray-300">Last Skip Exam Attempt (%)</h4>
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
                    <tr>
                        <td class="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">Chapters Studied</td>
                        <td class="px-4 py-2 text-gray-500 dark:text-gray-400">${studiedChaptersCount} / ${totalChapters} chapters</td>
                        <td class="px-4 py-2 text-right text-gray-700 dark:text-gray-200">${studiedChaptersPercent.toFixed(1)}%</td>
                    </tr>
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

                          <td class="px-4 py-2 text-right font-bold text-lg text-gray-800 dark:text-gray-100">${displayMark !== null ? displayMark.toFixed(1) + '%' : 'N/A'}</td>
                      </tr>
                      <tr>
                          <th scope="row" colspan="2" class="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 uppercase">Final Grade</th>

                          <td class="px-4 py-2 text-right font-bold text-lg ${gradeColor.text}">${displayGrade || 'N/A'}</td>
                      </tr>
                  </tfoot>
            </table>
        </div>

        <!-- Certificate Section -->
        ${certificateHtml}

    </div>`;

    displayContent(html, 'course-dashboard-area');

    // Render charts after HTML is displayed
    requestAnimationFrame(() => renderCourseCharts(progress));

    // --- Trigger initial certificate rendering ---
    // Check the correct conditions for generating the preview
    if (shouldShowCert) {
        requestAnimationFrame(() => {
            regenerateCertificatePreview(courseId); // Call the regeneration function
        });
    }
}

// Function to regenerate and display certificate preview
async function regenerateCertificatePreview(courseId) {
     const canvas = document.getElementById('certificate-preview-canvas');
     const progress = userCourseProgressMap.get(courseId);
     const courseDef = globalCourseDataMap.get(courseId);
     const regenBtn = document.getElementById('cert-regen-btn');
     const pngBtn = document.getElementById('cert-download-png-btn');
     const pdfBtn = document.getElementById('cert-download-pdf-btn');

     // ** Use displayGrade logic consistent with the main function **
     let displayGrade = null;
     if (progress && (progress.status === 'completed' || progress.status === 'failed')) {
         displayGrade = progress.grade || getLetterGrade(progress.totalMark !== null ? progress.totalMark : calculateTotalMark(progress));
     } else if (progress) {
         displayGrade = getLetterGrade(calculateTotalMark(progress)); // Interim grade
     }

     // Now use displayGrade for the check
     if (!canvas || !progress || !courseDef || !currentUser || !displayGrade || displayGrade === 'F' || progress.status !== 'completed') {
         console.warn("Cannot generate certificate preview: Missing data or requirements not met (Status/Grade).");
         if (canvas) { // Clear canvas if error
             const ctx = canvas.getContext('2d');
             ctx.clearRect(0, 0, canvas.width, canvas.height);
             ctx.fillStyle = '#eee'; ctx.fillRect(0,0,canvas.width, canvas.height);
             ctx.fillStyle = '#aaa'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
             ctx.fillText('Preview Unavailable', canvas.width/2, canvas.height/2);
         }
         if(regenBtn) regenBtn.disabled = true;
         if(pngBtn) pngBtn.disabled = true;
         if(pdfBtn) pdfBtn.disabled = true;
         return;
     }

     // Disable buttons during generation
     if(regenBtn) regenBtn.disabled = true;
     if(pngBtn) pngBtn.disabled = true;
     if(pdfBtn) pdfBtn.disabled = true;
     const originalBtnText = regenBtn ? regenBtn.innerHTML : '';
     if(regenBtn) regenBtn.innerHTML = `<div class="loader animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-500 inline-block mr-1"></div> Generating...`;


     console.log("Generating certificate preview...");
     const studentName = currentUser.displayName || userData.displayName || currentUser.email?.split('@')[0] || 'Student Name'; // Get name reliably
     const success = await generateCertificateOnCanvas(
         canvas,
         studentName,
         courseDef.name || 'Course Name',
         displayGrade, // Use the determined grade
         progress.completionDate || new Date() // Use completion date if available
     );

     // Re-enable buttons
      if(regenBtn) { regenBtn.disabled = false; regenBtn.innerHTML = originalBtnText; }
      if(pngBtn) pngBtn.disabled = !success;
      if(pdfBtn) pdfBtn.disabled = !success;

     if (success) {
         console.log("Certificate preview generated.");
     } else {
         console.error("Certificate preview generation failed.");
         alert("Failed to generate certificate preview.");
     }
}

// Functions to trigger download
function downloadCertImage(courseId) {
     const canvas = document.getElementById('certificate-preview-canvas');
     const courseDef = globalCourseDataMap.get(courseId);
     const filename = `Lyceum_Certificate_${courseDef?.name?.replace(/\s+/g, '_') || courseId}`;
     downloadCertificateImage(canvas, filename);
}

function downloadCertPdf(courseId) {
     const canvas = document.getElementById('certificate-preview-canvas');
     const courseDef = globalCourseDataMap.get(courseId);
     const filename = `Lyceum_Certificate_${courseDef?.name?.replace(/\s+/g, '_') || courseId}`;
     downloadCertificatePdf(canvas, filename);
}

// Assign to window scope
window.regenerateCertificatePreview = regenerateCertificatePreview;
window.downloadCertImage = downloadCertImage;
window.downloadCertPdf = downloadCertPdf;


export function renderCourseCharts(progress) {
    // Destroy existing charts first
    Object.values(charts).forEach(chart => {
        if (chart instanceof Chart) {
            chart.destroy();
        }
    });
    const newCharts = {};

    const isDarkMode = document.documentElement.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const tickColor = isDarkMode ? '#cbd5e1' : '#4b5563';
    const pointBgColor = isDarkMode ? 'rgb(59, 130, 246)' : 'rgb(37, 99, 235)';
    const pointBorderColor = isDarkMode ? '#ffffff' : '#ffffff';

    const commonOptions = {
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
    const drawNoDataMessage = (ctx, text = "No data available") => {
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

    // Assignment Scores Chart
    const assignmentCtx = document.getElementById('assignmentScoresChart')?.getContext('2d');
    if (assignmentCtx) {
        const scores = progress.assignmentScores || {};
        const labels = Object.keys(scores).sort((a, b) => parseInt(a.replace('day','')) - parseInt(b.replace('day',''))); // Sort by day number
        const dataPoints = labels.map(key => scores[key] !== undefined && scores[key] !== null ? scores[key] : NaN); // Use NaN for missing data to create gaps
        if (labels.length > 0) {
            newCharts.assignmentScoresChart = new Chart(assignmentCtx, {
                type: 'line',
                data: { labels: labels.map(l => l.replace('day','D')), datasets: [{ label: 'Score', data: dataPoints, borderColor: 'rgb(59, 130, 246)', fill: false, spanGaps: false }] }, // spanGaps: false
                options: { ...commonOptions }
            });
        } else { drawNoDataMessage(assignmentCtx, "No assignment scores yet."); }
    }

    // Weekly Scores Chart
    const weeklyCtx = document.getElementById('weeklyScoresChart')?.getContext('2d');
    if (weeklyCtx) {
        const scores = progress.weeklyExamScores || {};
        const labels = Object.keys(scores).map(k => parseInt(k.replace('week',''))).sort((a, b) => a - b); // Sort numerically
        const dataPoints = labels.map(key => scores[`week${key}`] || 0);
         if (labels.length > 0) {
            newCharts.weeklyScoresChart = new Chart(weeklyCtx, {
                type: 'bar',
                data: { labels: labels.map(l => `Wk ${l}`), datasets: [{ label: 'Score', data: dataPoints, backgroundColor: 'rgba(16, 185, 129, 0.7)', borderColor: 'rgb(16, 185, 129)' }] },
                options: { ...commonOptions, scales: { ...commonOptions.scales, x: { ...commonOptions.scales.x, ticks: { ...commonOptions.scales.x.ticks, maxTicksLimit: 12 } } } }
            });
        } else { drawNoDataMessage(weeklyCtx, "No weekly exam scores yet."); }
    }

    // Midcourse Scores Chart
    const midcourseCtx = document.getElementById('midcourseScoresChart')?.getContext('2d');
    if (midcourseCtx) {
        const scores = progress.midcourseExamScores || {};
        const labels = Object.keys(scores).map(k => parseInt(k.replace('mid',''))).sort((a, b) => a - b); // Sort numerically
        const dataPoints = labels.map(key => scores[`mid${key}`] || 0);
        if (labels.length > 0) {
            newCharts.midcourseScoresChart = new Chart(midcourseCtx, {
                type: 'bar',
                data: { labels: labels.map(l => `Mid ${l}`), datasets: [{ label: 'Score', data: dataPoints, backgroundColor: 'rgba(234, 179, 8, 0.7)', borderColor: 'rgb(234, 179, 8)' }] },
                options: { ...commonOptions }
            });
        } else { drawNoDataMessage(midcourseCtx, "No midcourse exam scores yet."); }
    }

    // Skip Exam Scores Chart (Showing LAST attempt score)
    const skipCtx = document.getElementById('skipScoresChart')?.getContext('2d');
    if (skipCtx) {
         const scores = progress.lastSkipExamScore || {}; // Use lastSkipExamScore for display
         const labels = Object.keys(scores).map(Number).sort((a, b) => a - b); // Sort by chapter number
         const dataPoints = labels.map(key => scores[String(key)] !== undefined && scores[String(key)] !== null ? scores[String(key)] : NaN); // Use NaN for gaps
         if (labels.length > 0) {
             newCharts.skipScoresChart = new Chart(skipCtx, {
                 type: 'line',
                 data: { labels: labels.map(l => `Ch ${l}`), datasets: [{ label: 'Last Score', data: dataPoints, borderColor: 'rgb(139, 92, 246)', fill: false, spanGaps: false }] }, // spanGaps: false
                 options: { ...commonOptions, scales: { ...commonOptions.scales, x: { ...commonOptions.scales.x, ticks: { ...commonOptions.scales.x.ticks, maxTicksLimit: 15 } } } }
             });
         } else { drawNoDataMessage(skipCtx, "No skip exam attempts yet."); }
    }

    setCharts(newCharts); // Update the global/shared charts state
    console.log("Course progress charts rendered/updated.");
}

// Helper to generate table rows for score breakdown
function generateScoreTableRow(label, scores) {
    if (!scores) return `<tr><td class="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">${label}</td><td class="px-4 py-2 text-gray-500 dark:text-gray-400">0 items</td><td class="px-4 py-2 text-right text-gray-700 dark:text-gray-200">N/A</td></tr>`;
    let count = 0; let sum = 0;
    if (Array.isArray(scores)) {
        // Filter out null/undefined before calculating
        const validScores = scores.filter(s => s !== null && s !== undefined);
        count = validScores.length;
        sum = validScores.reduce((a, b) => a + (Number(b) || 0), 0); // Ensure sum uses numbers
    } else { // Assuming object
        const vals = Object.values(scores).filter(s => s !== null && s !== undefined);
        count = vals.length;
        sum = vals.reduce((a, b) => a + (Number(b) || 0), 0); // Ensure sum uses numbers
    }
    const avg = count > 0 ? (sum / count) : 0;
    return `<tr><td class="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">${label}</td><td class="px-4 py-2 text-gray-500 dark:text-gray-400">${count} item${count === 1 ? '' : 's'}</td><td class="px-4 py-2 text-right text-gray-700 dark:text-gray-200">${count > 0 ? avg.toFixed(1) + '%' : 'N/A'}</td></tr>`;
}
// --- END OF FILE ui_course_progress.js ---