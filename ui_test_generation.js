// --- START OF FILE ui_test_generation.js ---
import { currentSubject, currentUser, data } from './state.js';
import { displayContent, setActiveSidebarLink } from './ui_core.js';
// Import test_logic functions
import { allocateQuestions, selectQuestions, parseChapterProblems, selectProblemsForExam, combineProblemsWithQuestions, selectNewQuestionsAndUpdate } from './test_logic.js';
import { extractQuestionsFromMarkdown } from './markdown_parser.js';
import { generateAndDownloadPdfWithMathJax, generatePdfHtml, generateTexSource, downloadTexFile } from './ui_pdf_generation.js';
import { launchOnlineTestUI, setCurrentOnlineTestState } from './ui_online_test.js';
import { saveUserData } from './firebase_firestore.js';
import { showLoading, hideLoading, escapeHtml } from './utils.js';
import { showManageSubjects } from './ui_subjects.js';
import { showManageStudiedChapters } from './ui_studied_chapters.js';
import { showExamsDashboard } from './ui_exams_dashboard.js';
// Import storage function
import { storeExamResult } from './exam_storage.js';
// Import config defaults
import {
    DEFAULT_MCQ_PROBLEM_RATIO,
    DEFAULT_ONLINE_TEST_DURATION_MINUTES,
    DEFAULT_MAX_QUESTIONS,
    COURSE_BASE_PATH,
    SUBJECT_RESOURCE_FOLDER, // MODIFIED: Was DEFAULT_COURSE_QUESTIONS_FOLDER
    DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME
 } from './config.js';
// Import filename utility
import { cleanTextForFilename } from './filename_utils.js';


/**
 * Fetches the markdown content for the current subject's *main* file (used for MCQs).
 * Returns the markdown text content or null if fetch fails.
 */
async function getCurrentSubjectMarkdown() {
    if (!currentSubject || !currentSubject.mcqFileName) {
        console.error("getCurrentSubjectMarkdown: No current subject or mcqFileName defined.");
        return null;
    }
    const courseDir = currentSubject.courseDirName
        ? cleanTextForFilename(currentSubject.courseDirName)
        : cleanTextForFilename(currentSubject.name || `subject_${currentSubject.id}`);

    if (!courseDir) {
        console.error(`getCurrentSubjectMarkdown: Could not derive courseDirName for subject "${currentSubject.name}".`);
        return null;
    }
    const safeMcqFileName = cleanTextForFilename(currentSubject.mcqFileName);

    // *** USE THE CORRECT CONSTANT HERE ***
    const url = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${safeMcqFileName}?t=${new Date().getTime()}`;

    console.log(`Fetching main subject Markdown (for MCQs during TestGen) from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            // ... (error handling as before) ...
            return null;
        }
        const mdContent = await response.text();
        console.log(`Main subject Markdown fetched successfully for ${currentSubject.name} TestGen.`);
        return mdContent;
    } catch (error) {
        console.error(`Error fetching Main Subject Markdown for ${currentSubject.name} (${url}):`, error);
        alert(`Warning: Could not load MCQ definitions for subject "${currentSubject.name}" due to a network or server error. Tests might not generate correctly.`);
        return null;
    }
}

// --- Test Generation UI Flow ---

export function showTestGenerationDashboard() {
    if (!currentSubject) {
        displayContent('<p class="text-yellow-500 p-4">Please select or add a subject first.</p><button onclick="window.showManageSubjects()" class="btn-secondary mt-2">Manage Subjects</button>');
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }
     // Check if chapters object exists and has keys AFTER initial loading/parsing
     if (!currentSubject.chapters || Object.keys(currentSubject.chapters).length === 0) {
          // This might happen if the initial parse failed or the MD file was empty/malformed
          const courseDir = currentSubject.courseDirName ? cleanTextForFilename(currentSubject.courseDirName) : cleanTextForFilename(currentSubject.name || `subject_${currentSubject.id}`);
          const mcqFile = currentSubject.fileName ? cleanTextForFilename(currentSubject.fileName) : 'Not Specified';
          // *** MODIFIED: Use SUBJECT_RESOURCE_FOLDER in expected path ***
          const expectedPath = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${mcqFile}`;
          displayContent(`<p class="text-yellow-500 p-4">The current subject '${escapeHtml(currentSubject.name)}' has no chapters loaded. This could be due to a missing or incorrectly formatted Markdown file. Expected path for MCQs: <code>${escapeHtml(expectedPath)}</code>. Please check the subject setup and file.</p><button onclick="window.initializeApp()" class="btn-secondary mt-2">Reload Data</button>`);
         setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
          return;
      }

    const html = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4 animate-fade-in">
            <h2 class="text-xl font-semibold mb-4 text-primary-600 dark:text-primary-400">Generate New Test</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-6">Choose the scope of your test for subject: <strong>${escapeHtml(currentSubject.name || 'Unnamed Subject')}</strong></p>
            <div class="space-y-3">
                <button onclick="window.promptTestType('studied')" class="w-full btn-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 16c1.255 0 2.443-.29 3.5-.804V4.804zM14.5 4c1.255 0 2.443.29 3.5.804v10A7.969 7.969 0 0114.5 16c-1.255 0-2.443-.29-3.5-.804V4.804A7.968 7.968 0 0114.5 4z"/></svg>
                    Test Studied Chapters Only
                </button>
                <button onclick="window.promptChapterSelectionForTest()" class="w-full btn-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 15.25Z" clip-rule="evenodd" /></svg>
                    Test Specific Chapters
                </button>
            </div>
        </div>
    `;
    displayContent(html);
    setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
}

export async function promptChapterSelectionForTest() { // Make it async if not already
    if (!currentSubject || !currentSubject.chapters) {
        showTestGenerationDashboard(); // Go back if data is missing
        return;
    }
    const chapters = currentSubject.chapters;

    // Ensure problems for the default text source are parsed and cached
    // This assumes parseChapterProblems updates window.subjectProblemCache
    // and uses currentSubject.textProblemsFileName or a default.
    const problemSourceTypeForDisplay = 'text_problems'; // Primary problem source for display
    const courseDir = currentSubject.courseDirName
        ? cleanTextForFilename(currentSubject.courseDirName)
        : cleanTextForFilename(currentSubject.name || `subject_${currentSubject.id}`);

    // --- MODIFIED: Use SUBJECT_RESOURCE_FOLDER ---
    const problemsFileToParse = (currentSubject.textProblemsFileName && currentSubject.textProblemsFileName.trim() !== '')
        ? cleanTextForFilename(currentSubject.textProblemsFileName)
        : DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME; // Fallback if not specified in subject
    
    const problemsFilePath = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${problemsFileToParse}`;

    // Call parseChapterProblems to ensure the cache is populated for the current subject's text problems
    // parseChapterProblems is async, so we await it.
    if (currentSubject.textProblemsFileName || DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME) { // Only parse if a filename is available
        console.log(`[promptChapterSelectionForTest] Ensuring problem cache for subject ${currentSubject.id}, source: ${problemSourceTypeForDisplay}, path: ${problemsFilePath}`);
        await parseChapterProblems(problemsFilePath, currentSubject.id, problemSourceTypeForDisplay);
    } else {
        console.log(`[promptChapterSelectionForTest] No textProblemsFileName specified for subject ${currentSubject.id}. Problem counts from this source will be 0.`);
    }
    
    const problemCacheKey = `${currentSubject.id}|${problemSourceTypeForDisplay}`;
    const problemCache = window.subjectProblemCache?.get(problemCacheKey) || {};

    const chapterNumbers = Object.keys(chapters)
        .filter(num => {
            const chap = chapters[num];
            const hasMcqs = chap && chap.total_questions > 0 && chap.available_questions?.length > 0;
            // Check problems from the specific cache for this source type
            const hasProblems = problemCache[num]?.length > 0;
            return hasMcqs || hasProblems;
        })
        .sort((a, b) => parseInt(a) - parseInt(b));

    if (chapterNumbers.length === 0) {
        // ... (existing error display logic) ...
        const mcqFile = currentSubject.mcqFileName ? cleanTextForFilename(currentSubject.mcqFileName) : 'MCQ file not specified';
        // --- MODIFIED: Use SUBJECT_RESOURCE_FOLDER in expected paths ---
        const expectedMCQPath = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${mcqFile}`;
        const expectedProblemPath = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${problemsFileToParse}`; // Use determined problemsFileToParse
        // ... (rest of your existing error HTML for no chapters) ...
        displayContent(`<p class="text-red-500 p-4">No chapters with available MCQs or Problems found. Expected paths:</p>
        <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 pl-4">
             <li>MCQs: <code>${escapeHtml(expectedMCQPath)}</code></li>
             <li>Problems: <code>${escapeHtml(expectedProblemPath)}</code></li>
        </ul>
        <button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2">Back</button>`);
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }

    let chapterOptionsHtml = chapterNumbers.map(num => {
        const chap = chapters[num];
        const chapterTitle = chap?.title ? escapeHtml(chap.title) : 'No Title';
        const availableMcqCount = chap?.available_questions?.length || 0;
        const totalMcqCount = chap?.total_questions || 0;
        // Get problem count from the specific cache for this chapter
        const problemCount = problemCache[num]?.length || 0;
        const studied = currentSubject.studied_chapters?.includes(num); // Ensure num is string if studied_chapters stores strings

        return `
        <div class="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
            <input id="test-chap-${num}" type="checkbox" value="${num}" class="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 flex-shrink-0">
            <label for="test-chap-${num}" class="ml-2 block text-sm text-gray-900 dark:text-gray-300 cursor-pointer flex-grow min-w-0">
                <span class="font-medium block truncate" title="Chapter ${num}: ${chapterTitle}">Chapter ${num}: ${chapterTitle}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">
                    (MCQs: ${availableMcqCount}/${totalMcqCount}, Problems: ${problemCount}) 
                    ${studied ? '<span class="text-green-600 dark:text-green-400 font-semibold ml-1">(Studied)</span>' : ''}
                </span>
            </label>
        </div>
        `;
    }).join('');

    // ... (rest of the HTML generation and displayContent call)
    const html = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4 animate-fade-in">
            <h2 class="text-xl font-semibold mb-4 text-primary-600 dark:text-primary-400">Select Chapters for Test</h2>
            <div class="space-y-2 mb-6 max-h-72 overflow-y-auto p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800">
                ${chapterOptionsHtml}
            </div>
            <button onclick="window.getSelectedChaptersAndPromptTestType()" class="w-full btn-primary">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                Continue
            </button>
             <button onclick="window.showTestGenerationDashboard()" class="w-full btn-secondary mt-2">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
                 Back
             </button>
        </div>
    `;
    displayContent(html);
    setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
}


export function getSelectedChaptersAndPromptTestType() {
    const selectedChapters = [];
    const checkboxes = document.querySelectorAll('input[id^="test-chap-"]:checked');
    checkboxes.forEach(cb => selectedChapters.push(cb.value));

    if (selectedChapters.length === 0) {
        alert("Please select at least one chapter.");
        return;
    }
    promptTestType('specific', selectedChapters);
}


export async function promptTestType(mode, selectedChapters = null) {
    if (!currentUser || !currentSubject || !currentSubject.chapters) {
        displayContent('<p class="text-red-500 p-4">Error: Subject data is missing. Cannot configure test.</p><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2">Back</button>');
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }
    showLoading("Preparing Test Configuration...");

    let chaptersInScopeNumbers = [];
    let totalAvailableMcqsInScope = 0; // From main subject MCQ file

    if (mode === 'studied') {
        const studied = (currentSubject.studied_chapters || []).map(String);
        if (studied.length === 0) {
            hideLoading();
            displayContent('<p class="text-red-500 p-4">No chapters marked as studied for this subject.</p><button onclick="window.showManageStudiedChapters()" class="btn-secondary mt-4">Manage Studied Chapters</button><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2 ml-2">Back to Test Setup</button>');
            setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
            return;
        }
        chaptersInScopeNumbers = studied;
        studied.forEach(chapNum => {
            const chap = currentSubject.chapters[chapNum];
            if (chap && chap.total_questions > 0 && chap.available_questions?.length > 0) {
                totalAvailableMcqsInScope += chap.available_questions.length;
            }
        });
    } else if (mode === 'specific' && selectedChapters) {
        chaptersInScopeNumbers = selectedChapters.map(String);
        selectedChapters.forEach(chapNum => {
            const chap = currentSubject.chapters[chapNum];
            if (chap && chap.total_questions > 0 && chap.available_questions?.length > 0) {
                totalAvailableMcqsInScope += chap.available_questions.length;
            }
        });
    } else {
        hideLoading();
        displayContent('<p class="text-red-500 p-4">Invalid test mode or chapter selection provided.</p><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2">Back</button>');
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }

    // Fetch problem counts from the main subject problem file
    const problemSourceTypeForDisplay = 'text_problems';
    const courseDir = currentSubject.courseDirName
        ? cleanTextForFilename(currentSubject.courseDirName)
        : cleanTextForFilename(currentSubject.name || `subject_${currentSubject.id}`);

    const problemsFileToParse = (currentSubject.textProblemsFileName && currentSubject.textProblemsFileName.trim() !== '')
        ? cleanTextForFilename(currentSubject.textProblemsFileName)
        : DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME;
    
    const problemsFilePath = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${problemsFileToParse}`;
    
    let totalAvailableProblemsInScope = 0;
    if (currentSubject.textProblemsFileName || problemsFileToParse === DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME) { // Check if a file is expected
        console.log(`[promptTestType] Ensuring problem cache for subject ${currentSubject.id}, source: ${problemSourceTypeForDisplay}, path: ${problemsFilePath}`);
        await parseChapterProblems(problemsFilePath, currentSubject.id, problemSourceTypeForDisplay);
        const problemCacheKey = `${currentSubject.id}|${problemSourceTypeForDisplay}`;
        const problemCache = window.subjectProblemCache?.get(problemCacheKey) || {};
        chaptersInScopeNumbers.forEach(chapNum => {
            totalAvailableProblemsInScope += (problemCache[chapNum]?.length || 0);
        });
    } else {
        console.log(`[promptTestType] No textProblemsFileName specified for subject ${currentSubject.id}. Main problem counts will be 0.`);
    }
    
    const chapterScopeDescription = `Based on the ${chaptersInScopeNumbers.length} chapter(s) in scope. Available from main files: ${totalAvailableMcqsInScope} MCQs, ${totalAvailableProblemsInScope} Problems. Lecture content availability varies.`;

    if (chaptersInScopeNumbers.length === 0) {
        hideLoading();
        displayContent(`<p class="text-red-500 p-4">No chapters selected or available in the current scope.</p><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2">Back</button>`);
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }


    // Lecture Resources Section
    let lectureResourcesHtml = '';
    if (currentSubject.lectureResources && currentSubject.lectureResources.length > 0) {
        lectureResourcesHtml = '<h4 class="text-md font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-300 border-t dark:border-gray-600 pt-4">Content from Lectures:</h4><div class="space-y-3">';
        
        for (const [index, lec] of currentSubject.lectureResources.entries()) {
            const lecKey = cleanTextForFilename(lec.title || `lecture_${index}`);
            lectureResourcesHtml += `
                <div class="mb-3 p-3 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <p class="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">${escapeHtml(lec.title)}</p>`;
            
            if (lec.mcqFile) {
                lectureResourcesHtml += `
                    <div class="mt-1">
                        <label for="lec-${index}-mcq-count" class="text-xs text-gray-600 dark:text-gray-400">MCQs from this lecture (enter 0 for auto):</label>
                        <input type="number" id="lec-${index}-mcq-count" name="lectureMcqCounts[${lecKey}]" min="0" value="0" class="form-control-sm text-xs w-20 ml-2">
                    </div>`;
            }
            if (lec.problemFile) {
                lectureResourcesHtml += `
                    <div class="mt-1">
                        <label for="lec-${index}-problem-count" class="text-xs text-gray-600 dark:text-gray-400">Problems from this lecture (enter 0 for auto):</label>
                        <input type="number" id="lec-${index}-problem-count" name="lectureProblemCounts[${lecKey}]" min="0" value="0" class="form-control-sm text-xs w-20 ml-2">
                    </div>`;
            }
            lectureResourcesHtml += `</div>`;
        }
        lectureResourcesHtml += `</div>`;
    }

    const defaultTotalQuestions = currentSubject.max_questions_per_test || DEFAULT_MAX_QUESTIONS;
    const defaultDuration = currentSubject.defaultTestDurationMinutes || DEFAULT_ONLINE_TEST_DURATION_MINUTES;

    const html = `
        <div class="content-card animate-fade-in">
            <h2 class="text-xl font-semibold mb-2 text-primary-600 dark:text-primary-400">Configure Your Test</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-4 text-sm">${chapterScopeDescription}</p>
            <p class="text-xs text-muted mb-4">Specify the number of questions from each source. The total will be capped by availability. Enter 0 for a source to let the system allocate automatically from it if needed to meet the 'Target Total'.</p>

            <form id="test-config-form">
                <div class="space-y-4">
                    <div>
                        <label for="total-questions-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Total Questions in Test</label>
                        <input type="number" id="total-questions-input" name="totalQuestions" min="10" value="${defaultTotalQuestions}" class="form-control mt-1" required>
                        <p class="text-xs text-muted mt-1">Minimum 10. Final count depends on availability from selected sources.</p>
                    </div>

                    <h4 class="text-md font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-300 border-t dark:border-gray-600 pt-4">Content from Main Subject Files:</h4>
                    <div>
                        <label for="text-mcq-count" class="text-sm text-gray-600 dark:text-gray-400">MCQs from Text/Main File (max ${totalAvailableMcqsInScope}, enter 0 for auto):</label>
                        <input type="number" id="text-mcq-count" name="textMcqCount" min="0" max="${totalAvailableMcqsInScope}" value="0" class="form-control-sm text-xs w-20 ml-2">
                    </div>
                    <div>
                        <label for="text-problem-count" class="text-sm text-gray-600 dark:text-gray-400">Problems from Text/Main File (max ${totalAvailableProblemsInScope}, enter 0 for auto):</label>
                        <input type="number" id="text-problem-count" name="textProblemCount" min="0" max="${totalAvailableProblemsInScope}" value="0" class="form-control-sm text-xs w-20 ml-2">
                    </div>

                    ${lectureResourcesHtml}

                    <h4 class="text-md font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-300 border-t dark:border-gray-600 pt-4">Test Timing:</h4>
                    <div class="space-y-2">
                        <div>
                            <input type="radio" id="timing-default" name="timingOption" value="default" checked class="form-radio">
                            <label for="timing-default" class="ml-2 text-sm">Subject Default (${defaultDuration} min)</label>
                        </div>
                        <div>
                            <input type="radio" id="timing-calculated" name="timingOption" value="calculated" class="form-radio">
                            <label for="timing-calculated" class="ml-2 text-sm">Calculated (Approx. 3 min/MCQ, 15 min/Problem)</label>
                        </div>
                        <div>
                            <input type="radio" id="timing-custom" name="timingOption" value="custom" class="form-radio">
                            <label for="timing-custom" class="ml-2 text-sm">Custom Duration (minutes):</label>
                            <input type="number" id="custom-duration-minutes" name="customDurationMinutes" min="10" class="form-control-sm text-xs w-24 ml-2 hidden">
                        </div>
                    </div>
                </div>

                <div class="mt-6 flex space-x-3">
                    <button type="button" onclick='window.collectAndStartTestGeneration(${JSON.stringify(mode)}, ${JSON.stringify(chaptersInScopeNumbers)}, "online")' class="btn-primary flex-1">Start Online Test</button>
                    <button type="button" onclick='window.collectAndStartTestGeneration(${JSON.stringify(mode)}, ${JSON.stringify(chaptersInScopeNumbers)}, "pdf")' class="btn-primary flex-1">Generate PDF Test</button>
                </div>
            </form>
            <button onclick="${mode === 'specific' ? 'window.promptChapterSelectionForTest()' : 'window.showTestGenerationDashboard()'}" class="w-full btn-secondary mt-4">Back</button>
        </div>
    `;
    hideLoading();
    displayContent(html);
    document.querySelectorAll('input[name="timingOption"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const customInput = document.getElementById('custom-duration-minutes');
            if(customInput) {
                customInput.classList.toggle('hidden', e.target.value !== 'custom');
                if (e.target.value === 'custom') {
                    customInput.value = defaultDuration; 
                }
            }
        });
    });
    setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
}

/**
 * Collects data from the test configuration form and calls startTestGeneration.
 * @param {string} mode - 'studied' or 'specific'
 * @param {Array<string>|null} selectedChapters - Array of chapter numbers if mode is 'specific'
 * @param {string} testFormat - 'online' or 'pdf'
 */
window.collectAndStartTestGeneration = function(mode, selectedChapters, testFormat) {
    const form = document.getElementById('test-config-form');
    if (!form) {
        alert("Error: Test configuration form not found.");
        return;
    }

    const targetTotalQuestions = parseInt(form.elements.totalQuestions.value);
    if (isNaN(targetTotalQuestions) || targetTotalQuestions < 10) {
        alert("Target total questions must be at least 10.");
        form.elements.totalQuestions.focus();
        return;
    }

    const testGenConfig = {
        textMcqCount: parseInt(form.elements.textMcqCount.value) || 0,
        textProblemCount: parseInt(form.elements.textProblemCount.value) || 0,
        lectureMcqCounts: {},
        lectureProblemCounts: {},
        timingOption: form.elements.timingOption.value,
        customDurationMinutes: null
    };

    if (testGenConfig.timingOption === 'custom') {
        const customDurationVal = parseInt(form.elements.customDurationMinutes.value);
        if (isNaN(customDurationVal) || customDurationVal < 10) {
            alert("Custom duration must be at least 10 minutes.");
            form.elements.customDurationMinutes.focus();
            return;
        }
        testGenConfig.customDurationMinutes = customDurationVal;
    }

    // Collect lecture-specific counts
    if (currentSubject.lectureResources) {
        currentSubject.lectureResources.forEach((lec, index) => {
            if (!lec || !lec.title) return;
            const lecKey = lec.title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
            
            const mcqCountEl = form.elements[`lectureMcqCounts[${lecKey}]`];
            if (mcqCountEl) {
                const count = parseInt(mcqCountEl.value);
                if (!isNaN(count) && count > 0) testGenConfig.lectureMcqCounts[lecKey] = count;
            }
            
            const probCountEl = form.elements[`lectureProblemCounts[${lecKey}]`];
            if (probCountEl) {
                const count = parseInt(probCountEl.value);
                if (!isNaN(count) && count > 0) testGenConfig.lectureProblemCounts[lecKey] = count;
            }
        });
    }

    let sumOfRequestedQuestions = testGenConfig.textMcqCount + testGenConfig.textProblemCount;
    Object.values(testGenConfig.lectureMcqCounts).forEach(c => sumOfRequestedQuestions += c);
    Object.values(testGenConfig.lectureProblemCounts).forEach(c => sumOfRequestedQuestions += c);

    if (sumOfRequestedQuestions === 0) {
        alert("Please request at least one question from any source (Text or Lectures).");
        return;
    }
    
    if (sumOfRequestedQuestions > targetTotalQuestions) {
        if (!confirm(`The sum of questions requested from individual sources (${sumOfRequestedQuestions}) is greater than your target total questions (${targetTotalQuestions}).
The test will be generated with ${sumOfRequestedQuestions} questions. Continue?`)) {
            return;
        }
        // If user proceeds, the targetTotalQuestions effectively becomes sumOfRequestedQuestions for allocation logic
        // but startTestGeneration will use sumOfRequestedQuestions as the effective target based on the config.
    } else if (sumOfRequestedQuestions < targetTotalQuestions) {
         if (!confirm(`The sum of questions requested from individual sources (${sumOfRequestedQuestions}) is less than your target total questions (${targetTotalQuestions}).
The test will be generated with ${sumOfRequestedQuestions} questions. Continue?`)) {
            return;
        }
    }


    // Call the main test generation logic
    window.startTestGeneration(mode, selectedChapters, testFormat, testGenConfig, targetTotalQuestions);
};

async function fetchContentForSource(filePath, sourceNameForLog) {
    try {
        const response = await fetch(`${filePath}?cacheBust=${Date.now()}`);
        if (!response.ok) {
            console.warn(`Could not load ${sourceNameForLog} from ${filePath}: ${response.status}`);
            return null;
        }
        const content = await response.text();
        if (!content || content.trim() === "") {
            console.warn(`${sourceNameForLog} file at ${filePath} is empty.`);
            return null;
        }
        return content;
    } catch (e) {
        console.error(`Error fetching ${sourceNameForLog} from ${filePath}:`, e);
        return null;
    }
}

// Helper to select N random items from an array
function selectRandomItems(itemsArray, count) {
    if (!itemsArray || itemsArray.length === 0 || count <= 0) return [];
    const shuffled = [...itemsArray].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, itemsArray.length));
}

// Helper to build the scope map for extractQuestionsFromMarkdown
// For general chapter scope, questionNumbers can be null (meaning all questions)
function buildScopeMap(chapterNumbersArray, questionNumbersMap = null) {
    const map = {};
    chapterNumbersArray.forEach(cnStr => {
        const cn = String(cnStr); // Ensure it's a string key
        if (questionNumbersMap && questionNumbersMap[cn]) {
            map[cn] = questionNumbersMap[cn]; // Specific question numbers for this chapter
        } else {
            map[cn] = null; // null means all questions in this chapter
        }
    });
    return map;
}

// Helper to format raw problems (from parseChapterProblems cache) into exam item structure
function formatProblemsForExam(rawProblems, subjectId, sourceTypeSuffix) {
    return rawProblems.map((prob, index) => ({
        id: prob.id || `subj${subjectId}-chap${prob.chapter}-prob${index + 1}-${sourceTypeSuffix}`,
        chapter: String(prob.chapter),
        number: index + 1, // This 'number' is just for local indexing within this selection
        text: prob.text || "Problem text missing.",
        options: [],
        image: null, // Assuming problems don't have images in this flow, or it's part of text
        correctAnswer: null, // Problems usually manually graded
        type: prob.type || 'Problem', // Carry over type if parsed
        isProblem: true
    }));
}


// --- Main Test Generation Logic ---
export async function startTestGeneration(mode, selectedChapters, testType, testGenConfig, targetTotalQuestionsFromForm) {
    if (!currentUser || !currentSubject || !data || !currentSubject.chapters) {
        alert("User, subject, or chapter data not loaded. Please reload or select a subject.");
        hideLoading();
        window.showTestGenerationDashboard(); // Use window scope
        return;
    }
    showLoading(`Generating ${testType === 'online' ? 'Online Test' : 'Test Files'}...`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Allow UI to update

    // 1. Determine Chapter Scope
    let chaptersInScopeNumbers = [];
    if (mode === 'studied') {
        const studied = (currentSubject.studied_chapters || []).map(String);
        if (studied.length === 0) {
            hideLoading();
            displayContent('<p class="text-red-500 p-4">No chapters marked as studied.</p><button onclick="window.showManageStudiedChapters()" class="btn-secondary mt-4">Manage Studied Chapters</button>');
            setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
            return;
        }
        chaptersInScopeNumbers = studied;
    } else if (mode === 'specific' && selectedChapters) {
        chaptersInScopeNumbers = selectedChapters.map(String);
    } else {
        hideLoading();
        displayContent('<p class="text-red-500 p-4">Invalid test mode or chapter selection.</p>');
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }
    if (chaptersInScopeNumbers.length === 0) {
         hideLoading();
         displayContent('<p class="text-red-500 p-4">No chapters selected for the test.</p>');
         setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
         return;
    }

    // 2. Prepare to fetch and parse content from ALL sources specified in testGenConfig
    const allSelectedMcqs = [];
    const allSelectedProblems = [];
    const allMcqAnswers = {}; // For MCQs, answers are known
    let actualTotalMcqsFetched = 0;
    let actualTotalProblemsFetched = 0;

    const courseDir = currentSubject.courseDirName ? cleanTextForFilename(currentSubject.courseDirName) : cleanTextForFilename(currentSubject.name || `subject_${currentSubject.id}`);
    const resourceBasePath = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/`;

    // 2.A. Fetch Text MCQs (from main subject file)
    if (testGenConfig.textMcqCount > 0 && currentSubject.mcqFileName) {
        const mcqFilePath = `${resourceBasePath}${cleanTextForFilename(currentSubject.mcqFileName)}`;
        console.log(`Fetching Text MCQs from: ${mcqFilePath}`);
        const mdContent = await fetchContentForSource(mcqFilePath, "Text MCQs");
        if (mdContent) {
            const { questions, answers } = extractQuestionsFromMarkdown(mdContent, buildScopeMap(chaptersInScopeNumbers), 'text_mcq');
            const randomSelection = selectRandomItems(questions, testGenConfig.textMcqCount);
            allSelectedMcqs.push(...randomSelection);
            Object.assign(allMcqAnswers, answers);
            actualTotalMcqsFetched += randomSelection.length;
            console.log(`Added ${randomSelection.length} Text MCQs.`);
        }
    }

    // 2.B. Fetch Text Problems
    const textProblemsFileToUse = (currentSubject.textProblemsFileName && currentSubject.textProblemsFileName.trim() !== '')
        ? cleanTextForFilename(currentSubject.textProblemsFileName)
        : DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME;

    if (testGenConfig.textProblemCount > 0 && textProblemsFileToUse) {
        const probFilePath = `${resourceBasePath}${textProblemsFileToUse}`;
        console.log(`Fetching Text Problems from: ${probFilePath}`);
        await parseChapterProblems(probFilePath, currentSubject.id, 'testgen_text_problems');
        const problemCacheKey = `${currentSubject.id}|testgen_text_problems`;
        const textProblemsFromCache = window.subjectProblemCache?.get(problemCacheKey) || {};

        const problemsInScope = [];
        chaptersInScopeNumbers.forEach(chapNum => {
            if (textProblemsFromCache[chapNum]) {
                problemsInScope.push(...textProblemsFromCache[chapNum]);
            }
        });
        const randomSelection = selectRandomItems(problemsInScope, testGenConfig.textProblemCount);
        allSelectedProblems.push(...formatProblemsForExam(randomSelection, currentSubject.id, 'text_problems'));
        actualTotalProblemsFetched += randomSelection.length;
        console.log(`Added ${randomSelection.length} Text Problems.`);
    }

    // 2.C. Fetch Lecture MCQs & Problems
    if (currentSubject.lectureResources) {
        for (const [lecKey, mcqCount] of Object.entries(testGenConfig.lectureMcqCounts)) {
            if (mcqCount > 0) {
                const lectureResource = currentSubject.lectureResources.find(lr => lr.title.replace(/\s+/g, '_') === lecKey);
                if (lectureResource && lectureResource.mcqFile) {
                    const lecMcqFilePath = `${resourceBasePath}${cleanTextForFilename(lectureResource.mcqFile)}`;
                    console.log(`Fetching Lecture MCQs for "${lectureResource.title}" from: ${lecMcqFilePath}`);
                    const mdContent = await fetchContentForSource(lecMcqFilePath, `Lecture MCQs: ${lectureResource.title}`);
                    if (mdContent) {
                        const { questions, answers } = extractQuestionsFromMarkdown(mdContent, buildScopeMap(chaptersInScopeNumbers), `lec_mcq_${lecKey}`);
                        const randomSelection = selectRandomItems(questions, mcqCount);
                        allSelectedMcqs.push(...randomSelection);
                        Object.assign(allMcqAnswers, answers);
                        actualTotalMcqsFetched += randomSelection.length;
                        console.log(`Added ${randomSelection.length} MCQs from Lecture "${lectureResource.title}".`);
                    }
                }
            }
        }
        for (const [lecKey, probCount] of Object.entries(testGenConfig.lectureProblemCounts)) {
            if (probCount > 0) {
                const lectureResource = currentSubject.lectureResources.find(lr => lr.title.replace(/\s+/g, '_') === lecKey);
                if (lectureResource && lectureResource.problemFile) {
                    const lecProbFilePath = `${resourceBasePath}${cleanTextForFilename(lectureResource.problemFile)}`;
                    console.log(`Fetching Lecture Problems for "${lectureResource.title}" from: ${lecProbFilePath}`);
                    await parseChapterProblems(lecProbFilePath, currentSubject.id, `testgen_lec_problems_${lecKey}`);
                    const problemCacheKeyLec = `${currentSubject.id}|testgen_lec_problems_${lecKey}`;
                    const lectProblemsFromCache = window.subjectProblemCache?.get(problemCacheKeyLec) || {};

                    const problemsInScopeLec = [];
                    chaptersInScopeNumbers.forEach(chapNum => {
                        if (lectProblemsFromCache[chapNum]) {
                            problemsInScopeLec.push(...lectProblemsFromCache[chapNum]);
                        }
                    });
                    const randomSelection = selectRandomItems(problemsInScopeLec, probCount);
                    allSelectedProblems.push(...formatProblemsForExam(randomSelection, currentSubject.id, `lec_problems_${lecKey}`));
                    actualTotalProblemsFetched += randomSelection.length;
                    console.log(`Added ${randomSelection.length} Problems from Lecture "${lectureResource.title}".`);
                }
            }
        }
    }

    console.log(`Total fetched: ${actualTotalMcqsFetched} MCQs and ${actualTotalProblemsFetched} Problems.`);

    // 3. Combine and Shuffle
    const finalExamItems = combineProblemsWithQuestions(allSelectedProblems, allSelectedMcqs);
    let actualTotalQuestionsGenerated = finalExamItems.length;

    // Cap at targetTotalQuestionsFromForm if it's less than what was fetched/selected
    if (actualTotalQuestionsGenerated > targetTotalQuestionsFromForm) {
        console.warn(`Generated ${actualTotalQuestionsGenerated} items, but form target was ${targetTotalQuestionsFromForm}. Truncating.`);
        finalExamItems.length = targetTotalQuestionsFromForm; // Simple truncation
        actualTotalQuestionsGenerated = finalExamItems.length;
    }


    if (actualTotalQuestionsGenerated === 0) {
        hideLoading();
        displayContent(`<p class="text-red-500 p-4 font-semibold">Test Generation Failed: No questions could be selected from the specified sources based on your counts. Please check counts and file availability.</p>`);
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }
    console.log(`Final questions in exam: ${actualTotalQuestionsGenerated} (MCQs: ${finalExamItems.filter(q=>!q.isProblem).length}, Problems: ${finalExamItems.filter(q=>q.isProblem).length})`);


    // 4. Determine Duration
    let testDuration;
    if (testGenConfig.timingOption === 'calculated') {
        const numMcqsInFinal = finalExamItems.filter(q => !q.isProblem).length;
        const numProblemsInFinal = finalExamItems.filter(q => q.isProblem).length;
        testDuration = (numMcqsInFinal * 3) + (numProblemsInFinal * 15);
    } else if (testGenConfig.timingOption === 'custom' && testGenConfig.customDurationMinutes) {
        testDuration = testGenConfig.customDurationMinutes;
    } else { // 'default' or fallback
        testDuration = currentSubject.defaultTestDurationMinutes || DEFAULT_ONLINE_TEST_DURATION_MINUTES;
    }
    testDuration = Math.max(10, testDuration); // Ensure min 10 minutes

    // 5. Create Exam ID and State
    const examId = `TestGen-${currentSubject.id || 'SUBJ'}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;

    const examStateBase = {
        examId: examId,
        questions: finalExamItems,
        correctAnswers: allMcqAnswers,
        userAnswers: {},
        startTime: Date.now(),
        timerInterval: null,
        currentQuestionIndex: 0,
        status: 'active',
        durationMinutes: testDuration,
        subjectId: currentSubject.id,
        courseContext: null, // This is a TestGen exam
        testGenConfig: testGenConfig // Store the configuration used
    };

    // 6. Launch Online Test or PDF
    if (testType === 'online') {
        setCurrentOnlineTestState(examStateBase);
        hideLoading();
        launchOnlineTestUI();
    } else { // PDF
        const { questionHtml, solutionHtml } = generatePdfHtml(examId, finalExamItems);
        const { questionsTex, solutionsTex } = generateTexSource(examId, finalExamItems);

        currentSubject.pending_exams = currentSubject.pending_exams || [];
        currentSubject.pending_exams.push({
            id: examId,
            // Store the counts for PDF result entry more accurately
            allocation: finalExamItems.filter(q => !q.isProblem).reduce((acc, mcq) => {
                if (!acc[mcq.chapter]) acc[mcq.chapter] = [];
                acc[mcq.chapter].push(mcq.number); // This 'number' is its order in the final test
                return acc;
            }, {}),
            problemAllocation: finalExamItems.filter(q => q.isProblem).map(p => ({ chapter: p.chapter, id: p.id, textPreview: p.text.substring(0,50) })),
            results_entered: false,
            timestamp: new Date().toISOString(),
            totalQuestions: actualTotalQuestionsGenerated,
            testGenConfig: testGenConfig
        });
        await saveUserData(currentUser.uid);

        const safeSubjectNameCleaned = cleanTextForFilename(currentSubject.name || 'Subject');
        const dateTimeSuffix = examId.split('-').slice(2).join('-');
        const baseFilename = `TestGen_${safeSubjectNameCleaned}_${dateTimeSuffix}`;
        
        const numMcqsInPdf = finalExamItems.filter(q => !q.isProblem).length;
        const numProblemsInPdf = finalExamItems.filter(q => q.isProblem).length;
        
        let allocationDetailsHtmlFinal = `<p class="font-medium">Test Configuration:</p>
            <p class="text-xs">Total Questions: ${actualTotalQuestionsGenerated} (Target: ${targetTotalQuestionsFromForm})</p>
            <p class="text-xs">Duration: ${testDuration} min (Timing: ${testGenConfig.timingOption})</p>
            <p class="text-xs mt-1"><strong>Actual Content Breakdown:</strong></p>
            <ul class="list-disc list-inside ml-4 text-xs">
            ${numMcqsInPdf > 0 ? `<li>Total MCQs: ${numMcqsInPdf}</li>` : ''}
            ${numProblemsInPdf > 0 ? `<li>Total Problems: ${numProblemsInPdf}</li>` : ''}
            </ul>
            <p class="text-xs mt-1"><strong>Requested Sources:</strong></p>
            <ul class="list-disc list-inside ml-4 text-xs">
            ${testGenConfig.textMcqCount > 0 ? `<li>Text MCQs: ${testGenConfig.textMcqCount}</li>` : ''}
            ${testGenConfig.textProblemCount > 0 ? `<li>Text Problems: ${testGenConfig.textProblemCount}</li>` : ''}
            ${Object.entries(testGenConfig.lectureMcqCounts).map(([lecKey, count]) => count > 0 ? `<li>${lecKey.replace(/_/g, ' ')} MCQs: ${count}</li>` : '').filter(Boolean).join('')}
            ${Object.entries(testGenConfig.lectureProblemCounts).map(([lecKey, count]) => count > 0 ? `<li>${lecKey.replace(/_/g, ' ')} Problems: ${count}</li>` : '').filter(Boolean).join('')}
            </ul>`;

        displayContent(`
            <div class="bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300 p-4 rounded-md mb-6 animate-fade-in">
                <p class="font-medium">PDF Test Files Ready</p>
                <p>Exam ID: ${escapeHtml(examId)}</p>
                <details class="text-sm mt-2 text-gray-600 dark:text-gray-400">
                     <summary class="flex items-center cursor-pointer hover:text-blue-700 dark:hover:text-blue-400 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                        Generation Details
                     </summary>
                     <div class="mt-2 p-2 bg-blue-50 dark:bg-blue-800/30 rounded border border-blue-200 dark:border-blue-700">${allocationDetailsHtmlFinal}</div>
                 </details>
            </div>
             <div class="space-y-3">
                 <button id="download-pdf-q" class="w-full btn-primary">Download Questions PDF</button>
                 <button id="download-pdf-s" class="w-full btn-primary">Download Solutions PDF</button>
                 <button onclick="window.downloadTexFileWrapper('${escapeHtml(baseFilename)}_Questions.tex', \`${btoa(unescape(encodeURIComponent(questionsTex)))}\`)" class="w-full btn-secondary">Download Questions .tex</button>
                 <button onclick="window.downloadTexFileWrapper('${escapeHtml(baseFilename)}_Solutions.tex', \`${btoa(unescape(encodeURIComponent(solutionsTex)))}\`)" class="w-full btn-secondary">Download Solutions .tex</button>
                 <button onclick="window.showExamsDashboard()" class="w-full btn-secondary mt-4">Go to Exams Dashboard (for manual result entry)</button>
             </div>
             <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">This exam is now pending. Enter results manually via the Exams Dashboard.</p>
         `);
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');

        document.getElementById('download-pdf-q')?.addEventListener('click', () => generateAndDownloadPdfWithMathJax(questionHtml, `${baseFilename}_Questions`));
        document.getElementById('download-pdf-s')?.addEventListener('click', () => generateAndDownloadPdfWithMathJax(solutionHtml, `${baseFilename}_Solutions`));
        hideLoading();
    }
}

window.downloadTexFileWrapper = (filename, base64Content) => {
     try {
        // The function downloadTexFile expects the raw content, not base64
        // The base64 encoding/decoding should happen inside the onclick attribute or be passed differently.
        // Original was: `downloadTexFile(texContent, filename);` which is incorrect.
        // Correct usage is downloadTexFile(filename, base64Content) and let it decode.
        // OR, decode here and pass raw content.
        // The ui_pdf_generation.js's downloadTexFile expects filename, then base64content.
         downloadTexFile(filename, base64Content); // Pass base64 directly
     } catch (e) {
         console.error("Error in downloadTexFileWrapper:", e);
         alert("Failed to prepare TeX file for download. The content might be invalidly encoded or corrupted.");
     }
 };

// --- END OF FILE ui_test_generation.js ---