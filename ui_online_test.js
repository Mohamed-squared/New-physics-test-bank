import { currentOnlineTestState, setCurrentOnlineTestState, currentSubject, currentUser, data, setData } from './state.js';
import { displayContent, clearContent } from './ui_core.js';
import { showLoading, hideLoading, renderMathIn } from './utils.js';
import { saveUserData } from './firebase_firestore.js';
import { showTestGenerationDashboard } from './ui_test_generation.js';
import { showExamDetails, showExamsDashboard } from './ui_exams_dashboard.js';
import { ONLINE_TEST_DURATION_MINUTES } from './config.js';

// --- Online Test UI & Logic ---

export function launchOnlineTestUI() {
    clearContent(); // Clear main content area first
    const testArea = document.getElementById('online-test-area');
    if (!currentOnlineTestState || !testArea) {
         console.error("launchOnlineTestUI Error: Online test state or element missing.");
         displayContent("<p class='text-red-500 p-4'>Error: Could not start the test. Test state missing.</p>");
         return;
    }

    testArea.classList.remove('hidden'); // Show the test area

    const totalQuestions = currentOnlineTestState.questions.length;
    const durationMillis = ONLINE_TEST_DURATION_MINUTES * 60 * 1000;
    currentOnlineTestState.endTime = currentOnlineTestState.startTime + durationMillis;
     currentOnlineTestState.status = 'active'; // Ensure status is active

    // Set the HTML structure for the test UI
    testArea.innerHTML =  `
    <div class="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 p-3 shadow z-40 border-b dark:border-gray-700">
        <div class="container mx-auto flex justify-between items-center">
            <span class="text-lg font-semibold text-primary-600 dark:text-primary-400 truncate max-w-[calc(100% - 250px)]" title="${currentOnlineTestState.examId}">${currentOnlineTestState.examId}</span>
            <div class="flex items-center space-x-4">
                <button id="force-submit-btn" onclick="window.confirmForceSubmit()" class="btn-danger-small hidden flex-shrink-0">Submit Now</button>
                <div id="timer" class="text-lg font-mono px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0">--:--:--</div>
            </div>
        </div>
    </div>
    <div id="question-container" class="pt-20 pb-24 container mx-auto px-4">
        <!-- Question content will be loaded here -->
        <div class="text-center p-8"><div class="loader animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div><p class="mt-4">Loading first question...</p></div>
    </div>
    <div class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-3 shadow-up z-40 border-t dark:border-gray-700">
         <div class="container mx-auto flex justify-between items-center">
             <button id="prev-btn" onclick="window.navigateQuestion(-1)" class="btn-secondary" disabled>
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                 Previous
             </button>
            <span id="question-counter" class="text-sm text-gray-600 dark:text-gray-400">Question 1 / ${totalQuestions}</span>
             <button id="next-btn" onclick="window.navigateQuestion(1)" class="btn-primary">
                 Next
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 ml-1"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
             </button>
             <button id="submit-btn" onclick="window.confirmSubmitOnlineTest()" class="btn-success hidden">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                 Submit Test
             </button>
        </div>
    </div>
    `;

    startTimer(); // Start the countdown
    displayCurrentQuestion(); // Load the first question's content
}

export function startTimer() {
    const timerElement = document.getElementById('timer');
    if (!timerElement || !currentOnlineTestState) return; // Exit if no timer element or state

    // Clear any existing timer interval
    if (currentOnlineTestState.timerInterval) {
        clearInterval(currentOnlineTestState.timerInterval);
    }

    function updateTimerDisplay() {
        // Double check state exists and is active before proceeding
        if (!currentOnlineTestState || !currentOnlineTestState.endTime || currentOnlineTestState.status === 'submitting') {
             if(currentOnlineTestState?.timerInterval) clearInterval(currentOnlineTestState.timerInterval);
             return;
        }

        const now = Date.now();
        const remaining = currentOnlineTestState.endTime - now;

        if (remaining <= 0) {
            // Time's up
            clearInterval(currentOnlineTestState.timerInterval);
            timerElement.textContent = "00:00:00";
            timerElement.classList.add('text-red-500');
            // Auto-submit only if not already submitting
            if (currentOnlineTestState.status !== 'submitting') {
                 currentOnlineTestState.status = 'submitting'; // Mark as submitting
                 alert("Time's up! Submitting your test automatically.");
                 submitOnlineTest(); // Trigger submission
            }
        } else {
            // Calculate remaining time
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            // Format and display time
             timerElement.textContent =
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

             // Show "Submit Now" button in the last 5 minutes
             const forceSubmitBtn = document.getElementById('force-submit-btn');
              if (forceSubmitBtn) {
                   const minutesRemaining = remaining / (1000 * 60);
                   forceSubmitBtn.classList.toggle('hidden', minutesRemaining >= 5);
              }
              // Ensure timer color is normal if not time up
              timerElement.classList.remove('text-red-500');
        }
    }

    updateTimerDisplay(); // Initial display
    currentOnlineTestState.timerInterval = setInterval(updateTimerDisplay, 1000); // Update every second
}


export async function displayCurrentQuestion() {
    console.log("displayCurrentQuestion START");
    if (!currentOnlineTestState) {
        console.error("displayCurrentQuestion HALTED: currentOnlineTestState is null/undefined.");
        return;
    }

    const index = currentOnlineTestState.currentQuestionIndex;
    const questions = currentOnlineTestState.questions;

    if (index < 0 || !questions || index >= questions.length) {
        console.error(`displayCurrentQuestion HALTED: Invalid index ${index}`);
        const containerCheck = document.getElementById('question-container');
        if (containerCheck) containerCheck.innerHTML = '<p class="text-red-500">Error: Invalid question index.</p>';
        return;
    }

    const question = questions[index];
    const container = document.getElementById('question-container');
    const totalQuestions = questions.length;

    if (!question || !container) {
        console.error("displayCurrentQuestion HALTED: Missing question object or container element.");
        return;
    }
    console.log(`Displaying question ${question.id} (Index ${index})`);

    // Prepare question elements (use raw text for MathJax)
    let imageHtml = question.image ? `<img src="${question.image}" alt="Question Image" class="max-w-full h-auto mx-auto my-4 border dark:border-gray-600 rounded" onerror="this.style.display='none'; console.error('Failed to load image: ${question.image}')">` : '';
    let optionsHtml = (question.options && question.options.length > 0) ? question.options.map(opt => `
        <label class="flex items-start space-x-3 p-3 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150">
            <input type="radio" name="mcqOption" value="${opt.letter}"
                   class="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 dark:bg-gray-700 dark:border-gray-600 shrink-0 mt-1"
                   ${currentOnlineTestState.userAnswers[question.id] === opt.letter ? 'checked' : ''}
                   onchange="window.recordAnswer('${question.id}', this.value)">
            <div class="flex items-baseline w-full">
                <span class="font-medium w-6 text-right mr-2 flex-shrink-0">${opt.letter}.</span>
                <div class="flex-1 option-text-container">
                    ${opt.text}
                </div>
            </div>
        </label>
    `).join('') : '<p class="text-sm text-yellow-600 dark:text-yellow-400">(No multiple choice options found)</p>';

    const htmlContent = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-4 animate-fade-in">
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Chapter ${question.chapter} - Question ${question.number}</p>
            ${imageHtml}
             <!-- Container for question text -->
            <div class="prose dark:prose-invert max-w-none mb-4 question-text-container">
               ${question.text /* Use raw text */}
            </div>
            <div class="space-y-3">
                ${optionsHtml}
            </div>
        </div>
    `;

    // Set inner HTML first
    container.innerHTML = htmlContent;
    console.log("displayCurrentQuestion: innerHTML set.");

    // Trigger MathJax rendering AFTER setting innerHTML
    try {
        await renderMathIn(container);
        console.log("displayCurrentQuestion: MathJax rendering completed for container.");
    } catch (mathError) {
        console.error("Error rendering MathJax in displayCurrentQuestion:", mathError);
    }


    // Update navigation buttons and counter
    try {
        document.getElementById('question-counter').textContent = `Question ${index + 1} / ${totalQuestions}`;
        const prevBtn = document.getElementById('prev-btn');
        if (prevBtn) prevBtn.disabled = (index === 0);
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');
        // Toggle visibility of Next/Submit buttons based on index
        if (nextBtn) nextBtn.classList.toggle('hidden', index === totalQuestions - 1);
        if (submitBtn) submitBtn.classList.toggle('hidden', index !== totalQuestions - 1);
        console.log("displayCurrentQuestion: Navigation updated.");
    } catch (e) {
        console.error("Error updating navigation buttons:", e);
    }
    console.log("displayCurrentQuestion END");
}


export function navigateQuestion(direction) {
    if (!currentOnlineTestState) return;
    const newIndex = currentOnlineTestState.currentQuestionIndex + direction;
    const totalQuestions = currentOnlineTestState.questions.length;

    if (newIndex >= 0 && newIndex < totalQuestions) {
        currentOnlineTestState.currentQuestionIndex = newIndex;
        displayCurrentQuestion(); // Display the new question
    } else {
        console.log("Navigation blocked: index out of bounds.", newIndex);
    }
}

export function recordAnswer(questionId, answer) {
    if (!currentOnlineTestState) return;
    console.log(`Answer recorded for ${questionId}: ${answer}`);
    currentOnlineTestState.userAnswers[questionId] = answer;
    // Optionally, save progress to local storage periodically?
}

export function confirmSubmitOnlineTest() {
     if (!currentOnlineTestState) return;
    const unanswered = currentOnlineTestState.questions.filter(q => !currentOnlineTestState.userAnswers[q.id]).length;
    let confirmationMessage = "Are you sure you want to submit your test?";
    if (unanswered > 0) {
        confirmationMessage += `\n\nYou have ${unanswered} unanswered question(s).`;
    }

    if (confirm(confirmationMessage)) {
        submitOnlineTest();
    }
}
export function confirmForceSubmit() {
     if (confirm("Are you sure you want to submit the test now?")) {
         submitOnlineTest();
     }
}

export async function submitOnlineTest() {
    // Prevent double submission and ensure necessary data exists
    if (!currentOnlineTestState || currentOnlineTestState.status === 'submitting' || !currentUser || !currentSubject || !data) {
        if (currentOnlineTestState?.status !== 'submitting') {
             alert("Error submitting test: Necessary data or state is missing.");
        }
        console.error("submitOnlineTest Error: State, user, subject, or data missing, or already submitting.");
        hideLoading(); // Ensure loading indicator is hidden
        return;
    }

    showLoading("Submitting and Grading...");
    currentOnlineTestState.status = 'submitting'; // Mark as submitting to prevent conflicts

    // Stop the timer
    if (currentOnlineTestState.timerInterval) {
        clearInterval(currentOnlineTestState.timerInterval);
        currentOnlineTestState.timerInterval = null;
    }
    // Hide the test area UI immediately
    document.getElementById('online-test-area')?.classList.add('hidden');

    await new Promise(resolve => setTimeout(resolve, 300)); // Short delay for UI feedback

    try {
        // Prepare results object
        const results = {
            examId: currentOnlineTestState.examId,
            subjectId: currentSubject.id,
            timestamp: new Date().toISOString(),
            durationMinutes: Math.round((Date.now() - currentOnlineTestState.startTime) / 60000),
            type: 'online',
            questions: [], // Store detailed question results
            score: 0,
            totalQuestions: currentOnlineTestState.questions.length,
            resultsByChapter: {} // Store aggregated results per chapter
        };

        let totalCorrect = 0;
        let chaptersDataModified = false; // Flag to check if chapter data needs saving

        // Initialize resultsByChapter structure
        currentOnlineTestState.questions.forEach(q => {
             if (!results.resultsByChapter[q.chapter]) {
                 results.resultsByChapter[q.chapter] = { attempted: 0, correct: 0, wrong: 0 };
             }
        });

        // --- Grade each question and update chapter stats ---
        currentOnlineTestState.questions.forEach(q => {
            const userAnswer = currentOnlineTestState.userAnswers[q.id] || null;
            const correctAnswer = currentOnlineTestState.correctAnswers[q.id];
            const isCorrect = userAnswer === correctAnswer;

            // Store detailed question result
            results.questions.push({
                id: q.id, chapter: q.chapter, number: q.number,
                text: q.text, options: q.options, image: q.image, // Include for review
                userAnswer: userAnswer, correctAnswer: correctAnswer, isCorrect: isCorrect
            });

            // Update chapter-specific aggregates
            const chapResult = results.resultsByChapter[q.chapter];
            if (chapResult) {
                chapResult.attempted++;
                if (isCorrect) {
                    chapResult.correct++;
                    totalCorrect++;
                } else {
                    chapResult.wrong++;
                }
            } else { console.error(`Logic Error: Chapter ${q.chapter} not found in results structure.`); }

            // --- Remove question from available pool in the main 'data' object ---
            const globalChap = currentSubject.chapters[q.chapter];
            if (globalChap && globalChap.available_questions && Array.isArray(globalChap.available_questions)) {
                 const qIndexInAvailable = globalChap.available_questions.indexOf(q.number);
                 if (qIndexInAvailable > -1) {
                     globalChap.available_questions.splice(qIndexInAvailable, 1);
                     chaptersDataModified = true; // Mark data as modified
                 } else {
                     console.warn(`Question ${q.id} (num ${q.number}) not found in available_questions for Chapter ${q.chapter}.`);
                 }
             } else { console.error(`Chapter ${q.chapter} or its available_questions list missing.`); }
        });

        // --- Update chapter mastery and mistake history ---
        for (const chapNum in results.resultsByChapter) {
             const globalChap = currentSubject.chapters[chapNum];
             const chapResult = results.resultsByChapter[chapNum];
             if (globalChap && chapResult) {
                 const numWrongInChapter = chapResult.wrong;
                 // Update mistake history (keep last ~20 results)
                 globalChap.mistake_history = globalChap.mistake_history || [];
                 globalChap.mistake_history.push(numWrongInChapter);
                 if (globalChap.mistake_history.length > 20) {
                      globalChap.mistake_history.shift();
                 }
                 // Update consecutive mastery count
                 globalChap.consecutive_mastery = (numWrongInChapter === 0 && chapResult.attempted > 0)
                     ? (globalChap.consecutive_mastery || 0) + 1
                     : 0; // Reset if any mistakes were made
                 chaptersDataModified = true; // Mark data as modified
             }
        }

        // Finalize overall score
        results.score = totalCorrect;

        // Add the completed exam results to the history
        currentSubject.exam_history = currentSubject.exam_history || [];
        currentSubject.exam_history.push(results);

        // Save the updated user data (including removed questions and updated stats)
        await saveUserData(currentUser.uid);
        console.log("User data saved after online test submission.");

        hideLoading();
        displayOnlineTestResults(results); // Show the results summary screen
        setCurrentOnlineTestState(null); // Clear the test state

    } catch (error) {
         console.error("Error during online test submission processing:", error);
         hideLoading();
         setCurrentOnlineTestState(null); // Clear state on error too
         alert("An error occurred while submitting test results: " + error.message);
         showTestGenerationDashboard(); // Go back to a safe state
    }
}

export function displayOnlineTestResults(results) {
    clearContent(); // Clear previous content (e.g., the test UI)
    const percentage = results.totalQuestions > 0 ? ((results.score / results.totalQuestions) * 100).toFixed(1) : 0;
    const date = new Date(results.timestamp).toLocaleString();

    // Generate summary HTML for chapter performance
    let chapterSummaryHtml = Object.entries(results.resultsByChapter)
        .sort((a,b) => parseInt(a[0]) - parseInt(b[0])) // Sort by chapter number
        .map(([chapNum, chapRes]) => {
            const chapPercentage = chapRes.attempted > 0 ? ((chapRes.correct / chapRes.attempted) * 100).toFixed(1) : 0;
            return `
            <li class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                <span>Chapter ${chapNum}</span>
                <span class="font-medium ${chapRes.wrong > 0 ? 'text-red-500' : 'text-green-500'}">
                    ${chapRes.correct} / ${chapRes.attempted} (${chapPercentage}%)
                </span>
            </li>`;
        }).join('');

    // Find the index of this exam in the history to link to details view
    const examIndexInHistory = currentSubject?.exam_history?.findIndex(exam => exam.examId === results.examId && exam.timestamp === results.timestamp) ?? -1;

     let reviewHtml = '';
     if (examIndexInHistory > -1) {
          // Provide a button to view the detailed results
          reviewHtml = `
              <div class="p-3 border dark:border-gray-600 rounded mb-2 bg-white dark:bg-gray-800 shadow-sm text-center">
                  <p class="text-sm text-gray-600 dark:text-gray-400">Detailed question review available.</p>
                   <button onclick="window.showExamDetailsWrapper(${examIndexInHistory})" class="text-sm text-blue-600 hover:underline dark:text-blue-400 mt-2 inline-flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639l4.458-4.458a1.012 1.012 0 0 1 1.414 0l4.458 4.458a1.012 1.012 0 0 1 0 .639l-4.458 4.458a1.012 1.012 0 0 1-1.414 0l-4.458-4.458Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                      View Full Exam Details
                  </button>
              </div>
          `;
      } else {
          // Should not happen if saving worked correctly
          console.error("Could not find just-completed exam in history for details link.");
          reviewHtml = `<p class="text-sm text-gray-600 dark:text-gray-400 italic p-4 text-center bg-gray-100 dark:bg-gray-700 rounded">Error finding exam in history.</p>`;
      }

    // Assemble the final results page HTML
    const html = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4 animate-fade-in">
            <h2 class="text-2xl font-semibold mb-4 text-center text-primary-600 dark:text-primary-400">Test Results: ${results.examId}</h2>
             <p class="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">${date}</p>
            <div class="text-center mb-6">
                 <p class="text-4xl font-bold ${percentage >= 70 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}">
                    ${results.score} / ${results.totalQuestions} (${percentage}%)
                 </p>
                 ${results.durationMinutes !== null ? `<p class="text-gray-600 dark:text-gray-400">Duration: ${results.durationMinutes} minutes</p>`: ''}
            </div>

            ${chapterSummaryHtml ? `
             <div class="mb-6">
                 <h3 class="text-lg font-semibold mb-2">Chapter Performance</h3>
                 <ul class="space-y-1">
                     ${chapterSummaryHtml}
                 </ul>
             </div>` : ''}

            <div class="mb-6">
                <h3 class="text-lg font-semibold mb-2">Review</h3>
                 ${reviewHtml}
            </div>

             <button onclick="window.showExamsDashboard()" class="w-full btn-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"> <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08H4.123a.878.878 0 0 0-.878.878V18a2.25 2.25 0 0 0 2.25 2.25h3.879a.75.75 0 0 1 0 1.5H6.75a3.75 3.75 0 0 1-3.75-3.75V5.625a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 5.625V16.5a2.25 2.25 0 0 1-2.25 2.25h-3.879a.75.75 0 0 1 0-1.5Z" /></svg>
                View All Exams
            </button>
             <button onclick="window.showTestGenerationDashboard()" class="w-full btn-primary mt-2">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                 Generate Another Test
            </button>
        </div>
    `;
    displayContent(html); // Display the results page
}

// Export the state setter for use in other modules if needed
export { setCurrentOnlineTestState };