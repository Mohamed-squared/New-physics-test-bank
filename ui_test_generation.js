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
    COURSE_BASE_PATH, // Needed for problem path construction
    // Assuming problems are in a 'Questions' folder within the course structure
    DEFAULT_COURSE_QUESTIONS_FOLDER,
    // Assuming we use TextProblems.md for general test generation for now
    DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME
 } from './config.js';
// Removed AI imports, handled elsewhere
// Removed parseSkipExamText import, handled elsewhere

// --- Helper Function ---

// Basic helper to clean text for use in filenames (replace non-alphanumeric with underscore)
// Consider moving a more robust version to utils.js
function cleanTextForFilename(text) {
    if (!text) return '';
    return text.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/_+/g, '_');
}


/**
 * Fetches the markdown content for the current subject's *main* file (used for MCQs).
 * Returns the markdown text content or null if fetch fails.
 */
async function getCurrentSubjectMarkdown() {
    if (!currentSubject) {
        console.error("getCurrentSubjectMarkdown: No current subject selected.");
        return null;
    }
    // Ensure filename exists on the subject object
    const fileName = currentSubject.fileName;
    if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
        console.error(`getCurrentSubjectMarkdown: Missing or invalid 'fileName' property for subject "${currentSubject.name || currentSubject.id}".`);
        // Optionally display a user-facing error here if this is critical
        // alert(`Error: Cannot load MCQ definitions for subject "${currentSubject.name}". The associated Markdown filename is missing or invalid in the subject configuration.`);
        return null; // Cannot proceed without a filename
    }

    // Basic sanitization - remove potentially problematic chars for URL/filesystem, keep structure
    // Allow slashes for potential subdirectories relative to the base path if specified in fileName
    const safeFileName = fileName.replace(/[^a-zA-Z0-9_.\-\/]/g, '_');
    // Assume the fileName is relative to the application root or a specific data folder
    // If subjects can be linked to courses, the path might need adjustment based on course structure
    // For now, assume relative path from root. Add cache busting.
    const url = `./${safeFileName}?t=${new Date().getTime()}`;

    console.log(`Fetching main subject Markdown (for MCQs) from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Main subject Markdown file not found (404) at ${url}. MCQs cannot be loaded from this file.`);
                // Alert user or handle gracefully later in the generation process
                alert(`Warning: The main definitions file (${fileName}) for subject "${currentSubject.name}" could not be found. Test generation might proceed without MCQs if problems are available.`);
                return null; // Return null, indicating fetch failure
            }
            // Throw for other HTTP errors
            throw new Error(`HTTP error fetching main subject markdown! status: ${response.status} for ${url}`);
        }
        const mdContent = await response.text();
        console.log(`Main subject Markdown fetched successfully for ${currentSubject.name}.`);
        return mdContent;
    } catch (error) {
        console.error(`Error fetching Main Subject Markdown for ${currentSubject.name} (${url}):`, error);
        alert(`Warning: Could not load MCQ definitions for subject "${currentSubject.name}" due to a network or server error. Tests might not generate correctly.`);
        return null; // Return null on error
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
          displayContent(`<p class="text-yellow-500 p-4">The current subject '${escapeHtml(currentSubject.name)}' has no chapters loaded. This could be due to a missing or incorrectly formatted Markdown file (${escapeHtml(currentSubject.fileName || 'Not Specified')}). Please check the subject setup and file.</p><button onclick="window.initializeApp()" class="btn-secondary mt-2">Reload Data</button>`);
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
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm8.707 3.293a1 1 0 010 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L10 14.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                    Test Specific Chapters
                </button>
            </div>
        </div>
    `;
    displayContent(html);
    setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
}

export function promptChapterSelectionForTest() {
    if (!currentSubject || !currentSubject.chapters) {
         showTestGenerationDashboard(); // Go back if data is missing
         return;
     }
    const chapters = currentSubject.chapters;
    // --- MODIFIED: Check problem cache availability ---
    // Assume we are checking for 'text_problems' here. This might need adjustment
    // if multiple problem sources are relevant for the selection UI.
    const problemSourceTypeToCheck = 'text_problems';
    const problemCacheKey = `${currentSubject.id}|${problemSourceTypeToCheck}`;
    const problemCache = window.subjectProblemCache?.get(problemCacheKey) || {}; // Get specific cache

    // Filter chapters that actually have questions defined OR problems defined in the cache
    const chapterNumbers = Object.keys(chapters)
                           .filter(num => {
                               const chap = chapters[num];
                               const hasMcqs = chap && chap.total_questions > 0 && chap.available_questions?.length > 0; // Check available MCQs
                               const hasProblems = problemCache[num]?.length > 0; // Check problems in specific cache
                               return hasMcqs || hasProblems;
                           })
                           .sort((a, b) => parseInt(a) - parseInt(b));

    if (chapterNumbers.length === 0) {
        displayContent('<p class="text-red-500 p-4">No chapters with available MCQs or Problems (from default source) found in this subject. Check Markdown files and configuration.</p><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2">Back</button>');
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }

    let chapterOptionsHtml = chapterNumbers.map(num => {
        const chap = chapters[num];
        const chapterTitle = chap?.title ? escapeHtml(chap.title) : 'No Title';
        const availableMcqCount = chap?.available_questions?.length || 0;
        const totalMcqCount = chap?.total_questions || 0;
        // Get problem count from the specific cache we checked
        const problemCount = problemCache[num]?.length || 0;
        const studied = currentSubject.studied_chapters?.includes(num); // Assumes studied_chapters uses string chapter numbers

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
    checkboxes.forEach(cb => selectedChapters.push(cb.value)); // Value is chapter number (string)

    if (selectedChapters.length === 0) {
        alert("Please select at least one chapter.");
        return;
    }
    // Pass the array of selected chapter number strings
    promptTestType('specific', selectedChapters);
}


export function promptTestType(mode, selectedChapters = null) {
     if (!currentSubject || !currentSubject.chapters) {
         displayContent('<p class="text-red-500 p-4">Error: Subject data is missing.</p>');
         setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
         return;
     }

    let chapterScopeDescription = "";
    let relevantChaptersForMcqs = {}; // Chapters with available MCQs
    let chapterCount = 0; // Total chapters in scope (even if no MCQs/Problems)
    let totalAvailableMcqsInScope = 0;
    let chaptersInScopeNumbers = []; // Store chapter numbers (strings) for problem check

    // --- MODIFIED: Check problem cache ---
    // Define which problem source to check for availability info here
    const problemSourceTypeToCheck = 'text_problems';
    const problemCacheKey = `${currentSubject.id}|${problemSourceTypeToCheck}`;
    const problemCache = window.subjectProblemCache?.get(problemCacheKey) || {};

    if (mode === 'studied') {
        // Ensure studied_chapters are strings if chapter keys are strings
        const studied = (currentSubject.studied_chapters || []).map(String);
        if (studied.length === 0) { hideLoading(); displayContent('<p class="text-red-500 p-4">No chapters marked as studied.</p><button onclick="window.showManageStudiedChapters()" class="btn-secondary mt-4">Manage Studied Chapters</button>'); return; }
        chaptersInScopeNumbers = studied; // All studied chapters are in scope
        studied.forEach(chapNum => {
            const chap = currentSubject.chapters[chapNum];
            // Check for available MCQs
            if (chap && chap.total_questions > 0 && chap.available_questions?.length > 0) {
                relevantChaptersForMcqs[chapNum] = chap; // Store if MCQs are available
                totalAvailableMcqsInScope += chap.available_questions.length;
            }
        });
        chapterCount = chaptersInScopeNumbers.length; // Count all studied chapters
        chapterScopeDescription = `Based on your ${chapterCount} studied chapter(s)`;
    } else if (mode === 'specific' && selectedChapters) {
        // selectedChapters should be an array of strings
        chaptersInScopeNumbers = selectedChapters; // All selected chapters are in scope
        selectedChapters.forEach(chapNum => {
             const chap = currentSubject.chapters[chapNum];
             // Check for available MCQs
            if (chap && chap.total_questions > 0 && chap.available_questions?.length > 0) {
                relevantChaptersForMcqs[chapNum] = chap; // Store if MCQs are available
                 totalAvailableMcqsInScope += chap.available_questions.length;
            }
        });
        chapterCount = chaptersInScopeNumbers.length; // Count all selected chapters
        chapterScopeDescription = `Based on the ${chapterCount} selected chapter(s)`;
    } else {
         displayContent('<p class="text-red-500 p-4">Invalid test mode or chapter selection.</p>');
          setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
         return;
    }

    // Check for available problems in the scope using the full list of chapters in scope
    let totalAvailableProblemsInScope = 0;
    chaptersInScopeNumbers.forEach(chapNum => {
        totalAvailableProblemsInScope += (problemCache[chapNum]?.length || 0);
    });
    chapterScopeDescription += ` (${totalAvailableMcqsInScope} MCQs, ${totalAvailableProblemsInScope} Problems available from default source).`;

    // Check if *any* content is available
    if (totalAvailableMcqsInScope === 0 && totalAvailableProblemsInScope === 0) {
        displayContent(`<p class="text-yellow-500 p-4">The chapters in scope have no available MCQs or Problems (from default source) currently.</p><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2">Back</button>`);
         setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }

    const maxTestSize = currentSubject.max_questions_per_test || DEFAULT_MAX_QUESTIONS;
    const actualMaxPossible = totalAvailableMcqsInScope + totalAvailableProblemsInScope;
    const actualTestSize = Math.min(maxTestSize, actualMaxPossible);
    const mcqRatio = currentSubject.mcqProblemRatio ?? DEFAULT_MCQ_PROBLEM_RATIO;
    const ratioPercent = (mcqRatio * 100).toFixed(0);

    const html = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4 animate-fade-in">
            <h2 class="text-xl font-semibold mb-4 text-primary-600 dark:text-primary-400">Choose Test Format</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-6">
                ${chapterScopeDescription}<br>
                Generating a test with up to <strong>${actualTestSize} items</strong> (Max setting: ${maxTestSize}, Available in scope: ${actualMaxPossible}).
                 <span class="text-xs block mt-1">Test will aim for ~${ratioPercent}% MCQs and ~${100-ratioPercent}% Problems, constrained by availability from sources.</span>
            </p>
            <div class="space-y-3">
                 <button onclick='window.startTestGeneration(${JSON.stringify(mode)}, ${JSON.stringify(selectedChapters)}, "online")' class="w-full btn-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                    Online Test (MCQ + Problems)
                </button>
                 <button onclick='window.startTestGeneration(${JSON.stringify(mode)}, ${JSON.stringify(selectedChapters)}, "pdf")' class="w-full btn-primary">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                     PDF Test (Download PDF / .tex)
                 </button>
            </div>
             <button onclick="${mode === 'specific' ? 'window.promptChapterSelectionForTest()' : 'window.showTestGenerationDashboard()'}" class="w-full btn-secondary mt-4">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
                 Back
             </button>
        </div>
    `;
    displayContent(html);
    setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
}

export async function startTestGeneration(mode, selectedChapters, testType) {
     if (!currentUser || !currentSubject || !data || !currentSubject.chapters) {
          alert("User, subject, or chapter data not loaded. Please reload or select a subject.");
          hideLoading();
          // Attempt to go back to a safe state
          showTestGenerationDashboard();
          return;
      }
    showLoading(`Generating ${testType === 'online' ? 'Online Test' : 'Test Files'}...`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Short delay for UI update

    // --- Resource Loading and Preparation ---

    // 1. Fetch main subject Markdown (primarily for MCQs)
    const subjectMarkdownContent = await getCurrentSubjectMarkdown();
    // Note: subjectMarkdownContent can be null if fetch failed. Need to handle this.

    // 2. Parse Problems from designated file(s)
    // --- MODIFIED: Construct path and parse problems ---
    const problemSourceType = 'text_problems'; // Define the source type we are using
    // Construct path using config and subject info
    // Fallback for courseDirName using cleaned subject name/ID
    const courseDir = currentSubject.courseDirName
        ? cleanTextForFilename(currentSubject.courseDirName)
        : cleanTextForFilename(currentSubject.name || `subject_${currentSubject.id}`);

    const problemsFilePath = `${COURSE_BASE_PATH}/${courseDir}/${DEFAULT_COURSE_QUESTIONS_FOLDER}/${DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME}`;
    console.log(`Attempting to parse problems from: ${problemsFilePath} (Subject: ${currentSubject.id}, Source: ${problemSourceType})`);

    // Call parseChapterProblems - this populates the cache (window.subjectProblemCache)
    // It returns the parsed data, but we mainly rely on the cache being populated for later steps.
    // We await it to ensure parsing completes before we check the cache.
    const parsedProblemsData = await parseChapterProblems(problemsFilePath, currentSubject.id, problemSourceType);
    // We can check if parsedProblemsData is empty if needed, but cache check later is more direct.
    const problemCacheKey = `${currentSubject.id}|${problemSourceType}`;
    const problemCache = window.subjectProblemCache?.get(problemCacheKey) || {}; // Get the potentially populated cache

    // --- Scope and Availability Determination ---

    let relevantChaptersForMcqAllocation = {}; // Chapters with *available* MCQs for allocation
    let chaptersInScopeNumbers = []; // ALL chapter numbers (strings) in scope (studied or selected)
    let chapterScopeDescription = ""; // For logging/display
    let totalAvailableMcqsInScope = 0;

    // 3. Determine Chapter Scope based on mode
    if (mode === 'studied') {
        const studied = (currentSubject.studied_chapters || []).map(String);
        if (studied.length === 0) { hideLoading(); displayContent('<p class="text-red-500 p-4">No chapters marked as studied.</p><button onclick="window.showManageStudiedChapters()" class="btn-secondary mt-4">Manage Studied Chapters</button>'); setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content'); return; }
        chaptersInScopeNumbers = studied;
        studied.forEach(chapNum => {
            const chap = currentSubject.chapters[chapNum];
            if (chap && chap.total_questions > 0 && chap.available_questions?.length > 0) {
                relevantChaptersForMcqAllocation[chapNum] = chap;
                totalAvailableMcqsInScope += chap.available_questions.length;
            }
        });
        chapterScopeDescription = `Based on your ${chaptersInScopeNumbers.length} studied chapter(s)`;
    } else if (mode === 'specific' && selectedChapters) {
        chaptersInScopeNumbers = selectedChapters.map(String); // Ensure strings
        selectedChapters.forEach(chapNum => {
            const chap = currentSubject.chapters[chapNum];
            if (chap && chap.total_questions > 0 && chap.available_questions?.length > 0) {
                 relevantChaptersForMcqAllocation[chapNum] = chap;
                 totalAvailableMcqsInScope += chap.available_questions.length;
            }
        });
        chapterScopeDescription = `Based on the ${chaptersInScopeNumbers.length} selected chapter(s)`;
    } else { hideLoading(); displayContent('<p class="text-red-500 p-4">Invalid test mode or chapter selection.</p>'); setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content'); return; }

     // 4. Check for available problems within the determined scope
     let totalAvailableProblemsInScope = 0;
     chaptersInScopeNumbers.forEach(chapNum => {
          totalAvailableProblemsInScope += (problemCache[chapNum]?.length || 0);
     });
     console.log(`Scope determined: ${chaptersInScopeNumbers.length} chapters. Available in scope: ${totalAvailableMcqsInScope} MCQs (from main file), ${totalAvailableProblemsInScope} Problems (from ${problemSourceType} source).`);

     // 5. Exit if no questions or problems available at all in scope
     if (totalAvailableMcqsInScope === 0 && totalAvailableProblemsInScope === 0) {
         hideLoading();
         // --- MODIFIED: Clearer message ---
         displayContent(`<p class="text-yellow-500 p-4">Could not generate test: No available MCQs or Problems found in the selected scope, or required definition files (Markdown) were missing/failed to load.</p><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2">Back</button>`);
         setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
         return;
     }

    // --- Test Size and Item Count Calculation ---

    // 6. Determine Final Test Size & Target MCQ/Problem Counts
    const maxTestSize = currentSubject.max_questions_per_test || DEFAULT_MAX_QUESTIONS;
    const actualTotalAvailable = totalAvailableMcqsInScope + totalAvailableProblemsInScope;
    const finalTestSize = Math.min(maxTestSize, actualTotalAvailable);
    const mcqRatio = currentSubject.mcqProblemRatio ?? DEFAULT_MCQ_PROBLEM_RATIO;

    // Calculate target counts based on ratio and *final* test size, respecting availability
    let targetMcqCount = Math.min(totalAvailableMcqsInScope, Math.round(finalTestSize * mcqRatio));
    let targetProblemCount = Math.min(totalAvailableProblemsInScope, finalTestSize - targetMcqCount);

    // Adjust if one type is scarce, ensuring we reach finalTestSize if possible by using more of the other type
    if (targetMcqCount + targetProblemCount < finalTestSize) {
         const deficit = finalTestSize - (targetMcqCount + targetProblemCount);
         // Can we add more Problems?
         const additionalProblemsPossible = totalAvailableProblemsInScope - targetProblemCount;
         if (additionalProblemsPossible > 0) {
             const addProblems = Math.min(deficit, additionalProblemsPossible);
             targetProblemCount += addProblems;
         }
         // Can we add more MCQs (after potentially adding problems)?
         const remainingDeficit = finalTestSize - (targetMcqCount + targetProblemCount);
         const additionalMcqsPossible = totalAvailableMcqsInScope - targetMcqCount;
         if (remainingDeficit > 0 && additionalMcqsPossible > 0) {
            const addMcqs = Math.min(remainingDeficit, additionalMcqsPossible);
            targetMcqCount += addMcqs;
         }
    }
    // Final check to ensure counts don't exceed availability after adjustments
    targetMcqCount = Math.min(targetMcqCount, totalAvailableMcqsInScope);
    targetProblemCount = Math.min(targetProblemCount, totalAvailableProblemsInScope);
    // Ensure total doesn't exceed finalTestSize (could happen with rounding/adjustments)
    targetProblemCount = Math.min(targetProblemCount, finalTestSize - targetMcqCount);


    console.log(`Final Test Config: Size=${finalTestSize}, Target MCQs=${targetMcqCount} (of ${totalAvailableMcqsInScope}), Target Problems=${targetProblemCount} (of ${totalAvailableProblemsInScope} from ${problemSourceType})`);

    // --- Problem Selection ---

    // 7. Select Problems
    let selectedProblems = [];
    if (targetProblemCount > 0 && totalAvailableProblemsInScope > 0) {
        // Allocate problems proportionally across chapters in scope based on *problem* availability
        let problemAllocation = {};
        let totalProblemWeightInScope = chaptersInScopeNumbers.reduce((sum, cn) => sum + (problemCache[cn]?.length || 0), 0);

        if (totalProblemWeightInScope > 0) {
             // Calculate initial counts per chapter based on proportion of available problems
             chaptersInScopeNumbers.forEach(cn => {
                 const chapterProbCount = problemCache[cn]?.length || 0;
                 if (chapterProbCount > 0) {
                     problemAllocation[cn] = Math.round((chapterProbCount / totalProblemWeightInScope) * targetProblemCount);
                 } else {
                     problemAllocation[cn] = 0;
                 }
             });

             // Adjust rounding errors to match targetProblemCount exactly
             let currentAllocatedProblems = Object.values(problemAllocation).reduce((s, c) => s + c, 0);
             let diff = targetProblemCount - currentAllocatedProblems;
             let attempts = 0;
             const chapterKeysWithProblems = chaptersInScopeNumbers.filter(cn => (problemCache[cn]?.length || 0) > 0);

             // Distribute/collect difference based on availability
             while (diff !== 0 && attempts < chapterKeysWithProblems.length * 2 && chapterKeysWithProblems.length > 0) {
                 // Prioritize chapters that can accommodate the change
                 if (diff > 0) { // Need to add problems
                    // Find chapters that have more problems available than allocated
                    let eligibleToAdd = chapterKeysWithProblems.filter(cn => problemAllocation[cn] < (problemCache[cn]?.length || 0));
                    if(eligibleToAdd.length > 0) {
                        let chapterToAdjust = eligibleToAdd[Math.floor(Math.random() * eligibleToAdd.length)];
                        problemAllocation[chapterToAdjust]++; diff--;
                    } else { break; } // Cannot add more
                 } else { // Need to remove problems (diff < 0)
                     // Find chapters currently allocated at least one problem
                     let eligibleToRemove = chapterKeysWithProblems.filter(cn => problemAllocation[cn] > 0);
                      if(eligibleToRemove.length > 0) {
                        let chapterToAdjust = eligibleToRemove[Math.floor(Math.random() * eligibleToRemove.length)];
                        problemAllocation[chapterToAdjust]--; diff++;
                     } else { break; } // Cannot remove more
                 }
                 attempts++;
             }
            if (diff !== 0) console.warn(`Problem allocation adjustment finished with diff=${diff}. Final target might not be met precisely.`);

             // Select problems based on the final allocation counts for each chapter
             console.log("Problem Allocation Counts:", problemAllocation);
             Object.entries(problemAllocation).forEach(([cn, count]) => {
                  if (count > 0) {
                      // Call selectProblemsForExam with chapter number (as number), count, subjectId, and sourceType
                      const chapterNumInt = parseInt(cn);
                      if (!isNaN(chapterNumInt)) {
                          selectedProblems.push(...selectProblemsForExam(chapterNumInt, count, currentSubject.id, problemSourceType));
                      } else {
                          console.warn(`Invalid chapter number "${cn}" during problem selection.`);
                      }
                  }
             });
        } else {
             console.warn("No problems available within the selected scope, cannot allocate.");
             targetProblemCount = 0; // Reset target if none available in scope
        }
        // Ensure we don't exceed the target due to selection logic issues (e.g., rounding)
        selectedProblems = selectedProblems.slice(0, targetProblemCount);
    } else {
        console.log("Target problem count is 0 or no problems available in scope.");
    }
    console.log(`Selected ${selectedProblems.length} problems.`);

    // --- MCQ Selection ---

    // 8. Select MCQs
    let selectedMcqs = [];
    let mcqAnswers = {};
    let selectedMcqMap = {}; // Store { chapNum: [qNum1, qNum2] }
    let actualTotalSelectedMcqs = 0;
    let mcqAllocationDetailsHtml = "";

    // Proceed with MCQ allocation/selection only if target > 0 AND there are chapters with available MCQs
    if (targetMcqCount > 0 && totalAvailableMcqsInScope > 0 && Object.keys(relevantChaptersForMcqAllocation).length > 0) {
        // Allocate target MCQs across relevant chapters using TestGen logic (difficulty, mastery)
        const mcqAllocationCounts = allocateQuestions(relevantChaptersForMcqAllocation, targetMcqCount);
        console.log("MCQ Allocation Counts:", mcqAllocationCounts);

        // Generate allocation details for display (using chapter titles)
        mcqAllocationDetailsHtml = Object.entries(mcqAllocationCounts)
            .sort((a,b) => parseInt(a[0])-parseInt(b[0]))
            .map(([chapNum, qCount]) => {
                const chapTitle = currentSubject.chapters[chapNum]?.title ? escapeHtml(currentSubject.chapters[chapNum].title) : 'No Title';
                return `<p>Ch ${chapNum} (${chapTitle}): ${qCount} MCQ(s)</p>`;
            }).join('');

        // Select actual MCQ numbers for each chapter based on allocation
        for (const chapNum in mcqAllocationCounts) {
            const n = mcqAllocationCounts[chapNum];
            if (n > 0) {
                const chap = currentSubject.chapters[chapNum]; // Get chapter data
                if (chap) {
                    // selectNewQuestionsAndUpdate gets *numbers* but doesn't change state here
                    const questionsSelectedNumbers = selectNewQuestionsAndUpdate(chap, n);
                    if (questionsSelectedNumbers.length > 0) {
                        selectedMcqMap[chapNum] = questionsSelectedNumbers; // Store { chapNum: [qNum] }
                        actualTotalSelectedMcqs += questionsSelectedNumbers.length;
                    }
                    if (questionsSelectedNumbers.length < n) {
                        console.warn(`Chapter ${chapNum}: Requested ${n} MCQs, but only selected ${questionsSelectedNumbers.length} (check available/selection logic).`);
                    }
                } else {
                    console.warn(`Chapter ${chapNum} not found in currentSubject.chapters during MCQ selection.`);
                }
            }
        }
        console.log("Selected MCQs Map (Chapter -> Question Numbers):", selectedMcqMap);
        console.log(`Total MCQ numbers selected: ${actualTotalSelectedMcqs}`);

        // --- MODIFIED: Gracefully handle missing subjectMarkdownContent ---
        // Extract the text/details for the selected MCQs *if* content is available
        if (actualTotalSelectedMcqs > 0) {
            if (subjectMarkdownContent) {
                 console.log("Extracting MCQ text from loaded Markdown content...");
                 // Ensure chapter keys in selectedMcqMap match format expected by extractQuestionsFromMarkdown (expects array of numbers or strings?)
                 // Let's pass the keys directly. extractQuestionsFromMarkdown should handle string chapter numbers.
                 const chaptersToExtractFrom = Object.keys(selectedMcqMap);
                 // The original extract function might need adjustment if it filters based on the map values instead of just scope.
                 // Let's assume extractQuestionsFromMarkdown extracts ALL questions from the scope and we filter later.
                 // No, the original logic expects a map { chapNum: [qNum1, qNum2] }. Let's stick with that for now.
                 // RETHINK: extractQuestionsFromMarkdown expects a scope (array of chapter numbers) and extracts *all* MCQs from those chapters.
                 // It does NOT currently filter based on specific question numbers from selectedMcqMap.
                 // This needs correction. For now, let's extract ALL from the scope and then filter. This is inefficient.

                 // --- Temporary Workaround (Inefficient): Extract all, then filter ---
                 // This assumes extractQuestionsFromMarkdown takes scope array, not the map.
                 console.warn("Using inefficient temporary workaround for MCQ extraction: Extracting all from scope, then filtering.");
                 const allMcqsInScope = extractQuestionsFromMarkdown(subjectMarkdownContent, chaptersInScopeNumbers, 'testgen_mcq'); // 'testgen_mcq' as source type
                 const tempSelectedMcqs = [];
                 const tempMcqAnswers = {};
                 Object.entries(selectedMcqMap).forEach(([chapNum, qNumList]) => {
                     qNumList.forEach(qNum => {
                         const foundMcq = allMcqsInScope.questions.find(q => q.chapter === chapNum && q.number === qNum);
                         if (foundMcq) {
                             tempSelectedMcqs.push(foundMcq);
                             if (allMcqsInScope.answers[foundMcq.id]) {
                                 tempMcqAnswers[foundMcq.id] = allMcqsInScope.answers[foundMcq.id];
                             }
                         } else {
                             console.warn(`Could not find extracted text for selected MCQ: Chapter ${chapNum}, Q# ${qNum}`);
                         }
                     });
                 });
                 selectedMcqs = tempSelectedMcqs;
                 mcqAnswers = tempMcqAnswers;
                 // --- End Temporary Workaround ---

                 // Check if the number extracted matches the number selected
                 if (selectedMcqs.length !== actualTotalSelectedMcqs) {
                      console.warn(`MCQ Selection vs Extraction mismatch: ${actualTotalSelectedMcqs} selected vs ${selectedMcqs.length} extracted. Using extracted count. Potential issue in extraction or selection.`);
                      actualTotalSelectedMcqs = selectedMcqs.length; // Update count to actual extracted
                      // Rebuild map based on extracted MCQs for accuracy in logs/pending exam
                      const tempMap = {};
                      selectedMcqs.forEach(q => {
                          if (!tempMap[q.chapter]) tempMap[q.chapter] = [];
                          tempMap[q.chapter].push(q.number);
                      });
                      Object.keys(tempMap).forEach(chapNum => tempMap[chapNum].sort((a, b) => a - b));
                      selectedMcqMap = tempMap; // Overwrite with actual extracted map
                      // Regenerate allocation details string based on actual extracted MCQs
                      mcqAllocationDetailsHtml = Object.entries(selectedMcqMap)
                         .sort((a,b) => parseInt(a[0])-parseInt(b[0]))
                         .map(([chapNum, qList]) => {
                             const chapTitle = currentSubject.chapters[chapNum]?.title ? escapeHtml(currentSubject.chapters[chapNum].title) : 'No Title';
                             return `<p>Ch ${chapNum} (${chapTitle}): ${qList.length} MCQ(s) (Actual Extracted)</p>`;
                         }).join('');
                 }
                 console.log(`Successfully extracted ${selectedMcqs.length} MCQs.`);

             } else {
                 // Markdown content failed to load, cannot extract MCQs
                 console.error("Error: Targeted MCQs but the main subject Markdown content failed to load. Cannot extract MCQ text.");
                 // Display feedback to the user
                  mcqAllocationDetailsHtml = `<p class="text-red-500 font-semibold">Error loading MCQ definitions (${escapeHtml(currentSubject.fileName || 'File Not Specified')}). MCQs could not be included.</p>`;
                 // Reset MCQ related variables
                 selectedMcqs = [];
                 mcqAnswers = {};
                 selectedMcqMap = {};
                 actualTotalSelectedMcqs = 0;
                 // Keep targetMcqCount as it was for logging, but actual count is 0.
             }
        } else {
            // No MCQs were selected (actualTotalSelectedMcqs is 0), even if target > 0
             console.log("No MCQs selected based on allocation counts or availability.");
             selectedMcqs = [];
             mcqAnswers = {};
             selectedMcqMap = {};
             actualTotalSelectedMcqs = 0;
             mcqAllocationDetailsHtml = mcqAllocationDetailsHtml || '<p>No MCQs allocated/selected.</p>'; // Keep existing allocation string if it exists
        }

    } else {
         // Target MCQ count was 0 or no chapters had available MCQs
         console.log("MCQ selection skipped: Target count is 0 or no relevant chapters found.");
         selectedMcqs = [];
         mcqAnswers = {};
         selectedMcqMap = {};
         actualTotalSelectedMcqs = 0;
         mcqAllocationDetailsHtml = '<p>No MCQs included in this test.</p>';
    }


    // --- Final Combination and Output ---

    // 9. Combine and Shuffle Problems and MCQs
    // Pass the successfully selected/extracted items
    const finalExamItems = combineProblemsWithQuestions(selectedProblems, selectedMcqs);
    const actualTotalQuestionsGenerated = finalExamItems.length;

    // 10. Check if *anything* was generated
    if (actualTotalQuestionsGenerated === 0) {
        hideLoading();
        // --- MODIFIED: Clearer final error message ---
        displayContent(`<p class="text-red-500 p-4 font-semibold">Test Generation Failed.</p><p class="text-yellow-600 dark:text-yellow-400 p-4">Could not generate any questions or problems. This might be because:</p>
        <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 pl-4">
            <li>No MCQs or Problems were available in the selected chapter scope.</li>
            <li>The required Markdown definition files (e.g., "${escapeHtml(currentSubject.fileName || 'MCQ File')}" or "${escapeHtml(problemsFilePath)}") were missing, empty, or could not be loaded.</li>
            <li>There was an error during the question selection process.</li>
        </ul>
        <button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-4">Back to Test Setup</button>`);
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }

    // 11. Build Final Allocation Details String for Display
    // (mcqAllocationDetailsHtml might contain error messages if loading failed)
    let allocationDetailsHtml = mcqAllocationDetailsHtml; // Start with MCQ details (or error)
    if (selectedProblems.length > 0) {
         const problemCountsByChapter = selectedProblems.reduce((acc, prob) => {
             acc[prob.chapter] = (acc[prob.chapter] || 0) + 1; return acc;
         }, {});
         // Add separator only if there were also MCQs attempted/displayed
         if (allocationDetailsHtml && !allocationDetailsHtml.includes('No MCQs')) {
             allocationDetailsHtml += `<hr class="my-1 border-blue-300 dark:border-blue-600">`;
         }
         allocationDetailsHtml += `<p class="font-medium mt-1">Problems selected: ${selectedProblems.length} total (from ${problemSourceType})</p>`
            + Object.entries(problemCountsByChapter)
            .sort((a,b) => parseInt(a[0])-parseInt(b[0])) // Sort by chapter number
            .map(([chapNum, count]) => {
                 // Try to get chapter title
                 const chapTitle = currentSubject.chapters[chapNum]?.title ? escapeHtml(currentSubject.chapters[chapNum].title) : 'No Title';
                 return `<p class="text-xs pl-2">Ch ${chapNum} (${chapTitle}): ${count} Problem(s)</p>`
            }).join('');
    }

    // 12. Prepare Exam ID
    const examId = `TestGen-${currentSubject.id || 'SUBJ'}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;

    // 13. Branch based on test type (Online vs PDF)
    if (testType === 'online') {
        console.log("Preparing Online Test...");
        const testDuration = currentSubject.defaultTestDurationMinutes || DEFAULT_ONLINE_TEST_DURATION_MINUTES;
        const onlineTestState = {
            examId: examId,
            questions: finalExamItems, // Combined & shuffled list
            correctAnswers: mcqAnswers, // MCQ answers map { questionId: correctLetter }
            userAnswers: {}, // To store user responses { questionId: userAnswer }
            // Store allocation for potential review/analysis later
            // selectedMcqMap format: { chapNum: [qNum] }
            // selectedProblems format: array of problem objects, extract relevant info
            allocation: {
                 mcq: selectedMcqMap,
                 problems: selectedProblems.map(p => ({ chapter: p.chapter, id: p.id, type: p.type })) // Store basic problem info
            },
            startTime: Date.now(),
            timerInterval: null, // Will be set by UI
            currentQuestionIndex: 0,
            status: 'active', // Initial status
            durationMinutes: testDuration,
            subjectId: currentSubject.id,
            courseContext: null // TestGen tests don't have course context
        };
        setCurrentOnlineTestState(onlineTestState); // Store state globally

        // IMPORTANT: Save user data only *after* the test is *submitted* and results processed.
        // Do NOT save here, as MCQs haven't actually been "used" yet from the available pool.
        // The state update (removing questions from available_questions) happens in ui_online_test.js -> submitTest.
        // await saveUserData(currentUser.uid); // <-- DO NOT SAVE HERE
        console.log("Online test state prepared. Launching UI...");

        hideLoading();
        launchOnlineTestUI(); // Navigate to the online test interface

    } else { // PDF Test
        console.log("Preparing PDF Test files...");
        // Generate HTML and TeX source using the combined & shuffled list
        const { questionHtml, solutionHtml } = generatePdfHtml(examId, finalExamItems);
        const { questionsTex, solutionsTex } = generateTexSource(examId, finalExamItems);

        // Add exam to OLD pending list for manual result entry
        // This list stores info needed to update chapter stats when results are entered.
        currentSubject.pending_exams = currentSubject.pending_exams || [];
        currentSubject.pending_exams.push({
            id: examId,
            // Store the *selected* MCQ numbers map and problem IDs/chapters
            allocation: selectedMcqMap, // { chapNum: [qNum] }
            problemAllocation: selectedProblems.map(p => ({ chapter: p.chapter, id: p.id })), // [{ chapter: #, id: # }]
            results_entered: false, // Flag for manual entry status
            timestamp: new Date().toISOString(),
            totalQuestions: actualTotalQuestionsGenerated, // Total combined count
        });

        // IMPORTANT: Save user data NOW for PDF tests.
        // This saves the pending_exams list AND updates the subject state in Firestore
        // if selectNewQuestionsAndUpdate *had* mutated the available_questions (which it doesn't currently).
        // Even if it doesn't mutate state now, saving the pending_exams list is crucial here.
        await saveUserData(currentUser.uid);
        console.log("Pending PDF exam added to list and user data saved.");

        // Prepare filenames for download
        const safeSubjectName = cleanTextForFilename(currentSubject.name || 'Subject');
        const dateTimeSuffix = examId.split('-').slice(2).join('-'); // Extract date/time part
        const baseFilename = `TestGen_${safeSubjectName}_${dateTimeSuffix}`;
        const questionsPdfFilename = `${baseFilename}_Questions`; // .pdf added by generator
        const solutionsPdfFilename = `${baseFilename}_Solutions`; // .pdf added by generator
        const questionsTexFilename = `${baseFilename}_Questions.tex`;
        const solutionsTexFilename = `${baseFilename}_Solutions.tex`;

        // Display download buttons and information
        displayContent(`
            <div class="bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300 p-4 rounded-md mb-6 animate-fade-in">
                <p class="font-medium">PDF Test Files Ready</p>
                <p>Exam ID: ${escapeHtml(examId)}</p>
                <p>Total Items: ${actualTotalQuestionsGenerated} (${actualTotalSelectedMcqs} MCQs, ${selectedProblems.length} Problems)</p>
                 <details class="text-sm mt-2 text-gray-600 dark:text-gray-400">
                     <summary class="flex items-center cursor-pointer hover:text-blue-700 dark:hover:text-blue-400 font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                        Allocation Details
                     </summary>
                     <div class="mt-2 p-2 bg-blue-50 dark:bg-blue-800/30 rounded border border-blue-200 dark:border-blue-700">${allocationDetailsHtml || 'No allocation details available.'}</div>
                 </details>
            </div>
             <div class="space-y-3">
                 <button id="download-pdf-q" class="w-full btn-primary">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                     Download Questions PDF
                 </button>
                 <button id="download-pdf-s" class="w-full btn-primary">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                     Download Solutions PDF
                 </button>
                 <button onclick="window.downloadTexFileWrapper('${escapeHtml(questionsTexFilename)}', \`${btoa(unescape(encodeURIComponent(questionsTex)))}\`)" class="w-full btn-secondary">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                     Download Questions .tex
                 </button>
                  <button onclick="window.downloadTexFileWrapper('${escapeHtml(solutionsTexFilename)}', \`${btoa(unescape(encodeURIComponent(solutionsTex)))}\`)" class="w-full btn-secondary">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                     Download Solutions .tex
                 </button>
                  <button onclick="window.showExamsDashboard()" class="w-full btn-secondary mt-4">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
                      Go to Exams Dashboard (for manual result entry)
                  </button>
             </div>
             <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">This exam is now pending. Enter results manually via the Exams Dashboard when ready to update your progress statistics.</p>
         `);
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');

         // Add event listeners for PDF downloads after the content is displayed
         // Use optional chaining in case the buttons aren't rendered (though they should be)
         document.getElementById('download-pdf-q')?.addEventListener('click', () => generateAndDownloadPdfWithMathJax(questionHtml, questionsPdfFilename));
         document.getElementById('download-pdf-s')?.addEventListener('click', () => generateAndDownloadPdfWithMathJax(solutionHtml, solutionsPdfFilename));

         hideLoading();
     }
}

// Wrapper for TEX download needed because onclick can't handle the large base64 string directly in HTML attribute easily
window.downloadTexFileWrapper = (filename, base64Content) => {
     try {
         // Decode Base64 -> Binary String -> URI Encoded String -> Decoded UTF-8 String
         const texContent = decodeURIComponent(escape(atob(base64Content)));
         downloadTexFile(texContent, filename);
     } catch (e) {
         console.error("Error decoding/downloading TeX file:", e);
         alert("Failed to prepare TeX file for download. The content might be invalid.");
     }
 };

// --- END OF FILE ui_test_generation.js ---