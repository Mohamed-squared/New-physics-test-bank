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

export function promptChapterSelectionForTest() {
    if (!currentSubject || !currentSubject.chapters) {
         showTestGenerationDashboard(); // Go back if data is missing
         return;
     }
    const chapters = currentSubject.chapters;
    const problemSourceTypeToCheck = 'text_problems'; // Assuming this is the type for general test gen problems
    const problemCacheKey = `${currentSubject.id}|${problemSourceTypeToCheck}`;
    const problemCache = window.subjectProblemCache?.get(problemCacheKey) || {};

    const chapterNumbers = Object.keys(chapters)
                           .filter(num => {
                               const chap = chapters[num];
                               const hasMcqs = chap && chap.total_questions > 0 && chap.available_questions?.length > 0;
                               const hasProblems = problemCache[num]?.length > 0;
                               return hasMcqs || hasProblems;
                           })
                           .sort((a, b) => parseInt(a) - parseInt(b));

    if (chapterNumbers.length === 0) {
        const courseDir = currentSubject.courseDirName ? cleanTextForFilename(currentSubject.courseDirName) : cleanTextForFilename(currentSubject.name || `subject_${currentSubject.id}`);
        const mcqFile = currentSubject.fileName ? cleanTextForFilename(currentSubject.fileName) : 'MCQ file not specified';
        const problemFile = currentSubject.problemsFileName ? cleanTextForFilename(currentSubject.problemsFileName) : DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME;
        // *** MODIFIED: Use SUBJECT_RESOURCE_FOLDER in expected paths ***
        const expectedMCQPath = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${mcqFile}`;
        const expectedProblemPath = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${problemFile}`;

        displayContent(`<p class="text-red-500 p-4">No chapters with available MCQs or Problems (from default source) found in this subject. Check Markdown files and ensure they are parsed correctly. Expected paths:</p>
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
        const problemCount = problemCache[num]?.length || 0;
        const studied = currentSubject.studied_chapters?.includes(num);

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
    checkboxes.forEach(cb => selectedChapters.push(cb.value));

    if (selectedChapters.length === 0) {
        alert("Please select at least one chapter.");
        return;
    }
    promptTestType('specific', selectedChapters);
}


export function promptTestType(mode, selectedChapters = null) {
     if (!currentSubject || !currentSubject.chapters) {
         displayContent('<p class="text-red-500 p-4">Error: Subject data is missing.</p>');
         setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
         return;
     }

    let chapterScopeDescription = "";
    let relevantChaptersForMcqs = {};
    let chapterCount = 0;
    let totalAvailableMcqsInScope = 0;
    let chaptersInScopeNumbers = [];

    const problemSourceTypeToCheck = 'text_problems';
    const problemCacheKey = `${currentSubject.id}|${problemSourceTypeToCheck}`;
    const problemCache = window.subjectProblemCache?.get(problemCacheKey) || {};

    if (mode === 'studied') {
        const studied = (currentSubject.studied_chapters || []).map(String);
        if (studied.length === 0) { hideLoading(); displayContent('<p class="text-red-500 p-4">No chapters marked as studied.</p><button onclick="window.showManageStudiedChapters()" class="btn-secondary mt-4">Manage Studied Chapters</button>'); return; }
        chaptersInScopeNumbers = studied;
        studied.forEach(chapNum => {
            const chap = currentSubject.chapters[chapNum];
            if (chap && chap.total_questions > 0 && chap.available_questions?.length > 0) {
                relevantChaptersForMcqs[chapNum] = chap;
                totalAvailableMcqsInScope += chap.available_questions.length;
            }
        });
        chapterCount = chaptersInScopeNumbers.length;
        chapterScopeDescription = `Based on your ${chapterCount} studied chapter(s)`;
    } else if (mode === 'specific' && selectedChapters) {
        chaptersInScopeNumbers = selectedChapters;
        selectedChapters.forEach(chapNum => {
             const chap = currentSubject.chapters[chapNum];
            if (chap && chap.total_questions > 0 && chap.available_questions?.length > 0) {
                relevantChaptersForMcqs[chapNum] = chap;
                 totalAvailableMcqsInScope += chap.available_questions.length;
            }
        });
        chapterCount = chaptersInScopeNumbers.length;
        chapterScopeDescription = `Based on the ${chapterCount} selected chapter(s)`;
    } else {
         displayContent('<p class="text-red-500 p-4">Invalid test mode or chapter selection.</p>');
          setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
         return;
    }

    let totalAvailableProblemsInScope = 0;
    chaptersInScopeNumbers.forEach(chapNum => {
        totalAvailableProblemsInScope += (problemCache[chapNum]?.length || 0);
    });
    chapterScopeDescription += ` (${totalAvailableMcqsInScope} MCQs, ${totalAvailableProblemsInScope} Problems available from default source).`;

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
          showTestGenerationDashboard();
          return;
      }
    showLoading(`Generating ${testType === 'online' ? 'Online Test' : 'Test Files'}...`);
    await new Promise(resolve => setTimeout(resolve, 100));

    // 1. Fetch main subject Markdown (for MCQs)
    const subjectMarkdownContent = await getCurrentSubjectMarkdown();

    // 2. Parse Problems from designated file(s)
    const problemSourceType = 'text_problems'; // Default source type for problems
    
    const courseDir = currentSubject.courseDirName
        ? cleanTextForFilename(currentSubject.courseDirName)
        : cleanTextForFilename(currentSubject.name || `subject_${currentSubject.id}`);

    if (!courseDir) {
        hideLoading();
        displayContent(`<p class="text-red-500 p-4">Error: Could not determine the directory for subject problems. Please check subject configuration.</p><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2">Back</button>`);
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }
    
    // Use subject.problemsFileName if available, otherwise default. Clean it for path use.
    const problemsFileToUse = (currentSubject.problemsFileName && currentSubject.problemsFileName.trim() !== '')
        ? cleanTextForFilename(currentSubject.problemsFileName)
        : DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME; // Fallback to global default

    // *** MODIFIED: Use SUBJECT_RESOURCE_FOLDER in problemsFilePath ***
    const problemsFilePath = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${problemsFileToUse}`;
    console.log(`Attempting to parse problems from: ${problemsFilePath} (Subject: ${currentSubject.id}, Source: ${problemSourceType})`);

    // This function updates window.subjectProblemCache
    await parseChapterProblems(problemsFilePath, currentSubject.id, problemSourceType); 
    const problemCacheKey = `${currentSubject.id}|${problemSourceType}`;
    // Ensure problemCache is retrieved AFTER parseChapterProblems may have updated it.
    const problemCache = window.subjectProblemCache?.get(problemCacheKey) || {};


    let relevantChaptersForMcqAllocation = {};
    let chaptersInScopeNumbers = [];
    let chapterScopeDescription = "";
    let totalAvailableMcqsInScope = 0;

    // 3. Determine Chapter Scope
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
        chaptersInScopeNumbers = selectedChapters.map(String);
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
     const mcqFileUsedDisplay = currentSubject.fileName ? cleanTextForFilename(currentSubject.fileName) : 'Not Specified';
     console.log(`Scope determined: ${chaptersInScopeNumbers.length} chapters. Available in scope: ${totalAvailableMcqsInScope} MCQs (from ${mcqFileUsedDisplay}), ${totalAvailableProblemsInScope} Problems (from ${problemsFileToUse}).`);

     // 5. Exit if no questions or problems available
     if (totalAvailableMcqsInScope === 0 && totalAvailableProblemsInScope === 0) {
         hideLoading();
         // *** MODIFIED: Use SUBJECT_RESOURCE_FOLDER in error message paths ***
         const mcqFileMsg = currentSubject.fileName ? `MCQ file: <code>${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${mcqFileUsedDisplay}</code>` : "MCQ file not specified in subject config.";
         const problemFileMsg = `Problem file: <code>${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${problemsFileToUse}</code>`; // `problemsFilePath` could also be used here
         const generalFolderMsg = `<code>${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/</code>`;

         displayContent(`<p class="text-red-500 p-4 font-semibold">Test Generation Failed.</p><p class="text-yellow-600 dark:text-yellow-400 p-4">Could not generate any questions or problems. This might be because:</p>
         <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 pl-4">
             <li>No MCQs or Problems were available in the selected chapter scope.</li>
             <li>The required Markdown definition files (e.g., "${escapeHtml(mcqFileUsedDisplay)}" for MCQs or "${escapeHtml(problemsFileToUse)}" for Problems) were missing, empty, or could not be loaded from the subject's resource folder: ${generalFolderMsg}.</li>
             <li>There was an error during the question selection process.</li>
         </ul>
         <p class="text-xs mt-2">Expected MCQ path: ${mcqFileMsg}</p>
         <p class="text-xs">Expected Problem path: ${problemFileMsg}</p>
         <button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-4">Back to Test Setup</button>`);
         setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
         return;
     }

    // --- Test Size and Item Count Calculation (continues as before) ---
    const maxTestSize = currentSubject.max_questions_per_test || DEFAULT_MAX_QUESTIONS;
    const actualTotalAvailable = totalAvailableMcqsInScope + totalAvailableProblemsInScope;
    const finalTestSize = Math.min(maxTestSize, actualTotalAvailable);
    const mcqRatio = currentSubject.mcqProblemRatio ?? DEFAULT_MCQ_PROBLEM_RATIO;

    let targetMcqCount = Math.min(totalAvailableMcqsInScope, Math.round(finalTestSize * mcqRatio));
    let targetProblemCount = Math.min(totalAvailableProblemsInScope, finalTestSize - targetMcqCount);

    if (targetMcqCount + targetProblemCount < finalTestSize) {
         const deficit = finalTestSize - (targetMcqCount + targetProblemCount);
         const additionalProblemsPossible = totalAvailableProblemsInScope - targetProblemCount;
         if (additionalProblemsPossible > 0) {
             const addProblems = Math.min(deficit, additionalProblemsPossible);
             targetProblemCount += addProblems;
         }
         const remainingDeficit = finalTestSize - (targetMcqCount + targetProblemCount);
         const additionalMcqsPossible = totalAvailableMcqsInScope - targetMcqCount;
         if (remainingDeficit > 0 && additionalMcqsPossible > 0) {
            const addMcqs = Math.min(remainingDeficit, additionalMcqsPossible);
            targetMcqCount += addMcqs;
         }
    }
    targetMcqCount = Math.min(targetMcqCount, totalAvailableMcqsInScope);
    targetProblemCount = Math.min(targetProblemCount, totalAvailableProblemsInScope);
    targetProblemCount = Math.min(targetProblemCount, finalTestSize - targetMcqCount);

    console.log(`Final Test Config: Size=${finalTestSize}, Target MCQs=${targetMcqCount} (of ${totalAvailableMcqsInScope}), Target Problems=${targetProblemCount} (of ${totalAvailableProblemsInScope} from ${problemsFileToUse})`);

    // --- Problem Selection (continues as before) ---
    let selectedProblems = [];
    if (targetProblemCount > 0 && totalAvailableProblemsInScope > 0) {
        let problemAllocation = {};
        let totalProblemWeightInScope = chaptersInScopeNumbers.reduce((sum, cn) => sum + (problemCache[cn]?.length || 0), 0);

        if (totalProblemWeightInScope > 0) {
             chaptersInScopeNumbers.forEach(cn => {
                 const chapterProbCount = problemCache[cn]?.length || 0;
                 if (chapterProbCount > 0) {
                     problemAllocation[cn] = Math.round((chapterProbCount / totalProblemWeightInScope) * targetProblemCount);
                 } else {
                     problemAllocation[cn] = 0;
                 }
             });

             let currentAllocatedProblems = Object.values(problemAllocation).reduce((s, c) => s + c, 0);
             let diff = targetProblemCount - currentAllocatedProblems;
             let attempts = 0;
             const chapterKeysWithProblems = chaptersInScopeNumbers.filter(cn => (problemCache[cn]?.length || 0) > 0);

             while (diff !== 0 && attempts < chapterKeysWithProblems.length * 2 && chapterKeysWithProblems.length > 0) {
                 if (diff > 0) {
                    let eligibleToAdd = chapterKeysWithProblems.filter(cn => problemAllocation[cn] < (problemCache[cn]?.length || 0));
                    if(eligibleToAdd.length > 0) {
                        let chapterToAdjust = eligibleToAdd[Math.floor(Math.random() * eligibleToAdd.length)];
                        problemAllocation[chapterToAdjust]++; diff--;
                    } else { break; }
                 } else {
                     let eligibleToRemove = chapterKeysWithProblems.filter(cn => problemAllocation[cn] > 0);
                      if(eligibleToRemove.length > 0) {
                        let chapterToAdjust = eligibleToRemove[Math.floor(Math.random() * eligibleToRemove.length)];
                        problemAllocation[chapterToAdjust]--; diff++;
                     } else { break; }
                 }
                 attempts++;
             }
            if (diff !== 0) console.warn(`Problem allocation adjustment finished with diff=${diff}. Final target might not be met precisely.`);

             console.log("Problem Allocation Counts:", problemAllocation);
             Object.entries(problemAllocation).forEach(([cn, count]) => {
                  if (count > 0) {
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
             targetProblemCount = 0;
        }
        selectedProblems = selectedProblems.slice(0, targetProblemCount);
    } else {
        console.log("Target problem count is 0 or no problems available in scope.");
    }
    console.log(`Selected ${selectedProblems.length} problems.`);


    // --- MCQ Selection (continues as before, with notes about subjectMarkdownContent) ---
    let selectedMcqs = [];
    let mcqAnswers = {};
    let selectedMcqMap = {};
    let actualTotalSelectedMcqs = 0;
    let mcqAllocationDetailsHtml = "";

    if (targetMcqCount > 0 && totalAvailableMcqsInScope > 0 && Object.keys(relevantChaptersForMcqAllocation).length > 0) {
        const mcqAllocationCounts = allocateQuestions(relevantChaptersForMcqAllocation, targetMcqCount);
        console.log("MCQ Allocation Counts:", mcqAllocationCounts);

        mcqAllocationDetailsHtml = Object.entries(mcqAllocationCounts)
            .sort((a,b) => parseInt(a[0])-parseInt(b[0]))
            .map(([chapNum, qCount]) => {
                const chapTitle = currentSubject.chapters[chapNum]?.title ? escapeHtml(currentSubject.chapters[chapNum].title) : 'No Title';
                return `<p>Ch ${chapNum} (${chapTitle}): ${qCount} MCQ(s)</p>`;
            }).join('');

        for (const chapNum in mcqAllocationCounts) {
            const n = mcqAllocationCounts[chapNum];
            if (n > 0) {
                const chap = currentSubject.chapters[chapNum];
                if (chap) {
                    const questionsSelectedNumbers = selectNewQuestionsAndUpdate(chap, n);
                    if (questionsSelectedNumbers.length > 0) {
                        selectedMcqMap[chapNum] = questionsSelectedNumbers;
                        actualTotalSelectedMcqs += questionsSelectedNumbers.length;
                    }
                    if (questionsSelectedNumbers.length < n) {
                        console.warn(`Chapter ${chapNum}: Requested ${n} MCQs, but only selected ${questionsSelectedNumbers.length}.`);
                    }
                } else {
                    console.warn(`Chapter ${chapNum} not found in currentSubject.chapters during MCQ selection.`);
                }
            }
        }
        console.log("Selected MCQs Map (Chapter -> Question Numbers):", selectedMcqMap);
        console.log(`Total MCQ numbers selected: ${actualTotalSelectedMcqs}`);

        if (actualTotalSelectedMcqs > 0) {
            if (subjectMarkdownContent) { // Check if MCQ markdown was loaded
                 console.log("Extracting MCQ text from loaded Markdown content...");
                 const { questions: extractedQuestions, answers: extractedAnswers } = extractQuestionsFromMarkdown(subjectMarkdownContent, selectedMcqMap, 'testgen_mcq');
                 selectedMcqs = extractedQuestions;
                 mcqAnswers = extractedAnswers;

                 if (selectedMcqs.length !== actualTotalSelectedMcqs) {
                      console.warn(`MCQ Selection vs Extraction mismatch: ${actualTotalSelectedMcqs} selected vs ${selectedMcqs.length} extracted. Using extracted count.`);
                      actualTotalSelectedMcqs = selectedMcqs.length;
                      const tempMap = {};
                      selectedMcqs.forEach(q => {
                          if (!tempMap[q.chapter]) tempMap[q.chapter] = [];
                          tempMap[q.chapter].push(q.number);
                      });
                      Object.keys(tempMap).forEach(chapNum => tempMap[chapNum].sort((a, b) => a - b));
                      selectedMcqMap = tempMap;
                      mcqAllocationDetailsHtml = Object.entries(selectedMcqMap)
                         .sort((a,b) => parseInt(a[0])-parseInt(b[0]))
                         .map(([chapNum, qList]) => {
                             const chapTitle = currentSubject.chapters[chapNum]?.title ? escapeHtml(currentSubject.chapters[chapNum].title) : 'No Title';
                             return `<p>Ch ${chapNum} (${chapTitle}): ${qList.length} MCQ(s) (Actual Extracted)</p>`;
                         }).join('');
                 }
                 console.log(`Successfully extracted ${selectedMcqs.length} MCQs.`);
             } else {
                 console.error(`Error: Targeted MCQs but the main subject Markdown content (MCQs from ${mcqFileUsedDisplay}) failed to load. Cannot extract MCQ text.`);
                  mcqAllocationDetailsHtml = `<p class="text-red-500 font-semibold">Error loading MCQ definitions (${escapeHtml(mcqFileUsedDisplay || 'File Not Specified')}). MCQs could not be included.</p>`;
                 selectedMcqs = []; mcqAnswers = {}; selectedMcqMap = {}; actualTotalSelectedMcqs = 0;
             }
        } else {
             console.log("No MCQs selected based on allocation counts or availability.");
             selectedMcqs = []; mcqAnswers = {}; selectedMcqMap = {}; actualTotalSelectedMcqs = 0;
             mcqAllocationDetailsHtml = mcqAllocationDetailsHtml || '<p>No MCQs allocated/selected.</p>';
        }
    } else {
         console.log("MCQ selection skipped: Target count is 0 or no relevant chapters found.");
         selectedMcqs = []; mcqAnswers = {}; selectedMcqMap = {}; actualTotalSelectedMcqs = 0;
         mcqAllocationDetailsHtml = '<p>No MCQs included in this test.</p>';
    }

    // --- Final Combination and Output (continues as before) ---
    const finalExamItems = combineProblemsWithQuestions(selectedProblems, selectedMcqs);
    const actualTotalQuestionsGenerated = finalExamItems.length;

    if (actualTotalQuestionsGenerated === 0) {
        hideLoading();
        const problemFileUsedDisplay = (currentSubject.problemsFileName && currentSubject.problemsFileName.trim() !== '')
            ? cleanTextForFilename(currentSubject.problemsFileName)
            : DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME;
        
        // *** MODIFIED: Use SUBJECT_RESOURCE_FOLDER in error message paths ***
        const mcqFileMsg = currentSubject.fileName ? `MCQ file: <code>${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${mcqFileUsedDisplay}</code>` : "MCQ file not specified in subject config.";
        const problemFileMsg = `Problem file: <code>${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${problemFileUsedDisplay}</code>`;
        const generalFolderMsg = `<code>${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/</code>`;

        displayContent(`<p class="text-red-500 p-4 font-semibold">Test Generation Failed.</p><p class="text-yellow-600 dark:text-yellow-400 p-4">Could not generate any questions or problems. This might be because:</p>
        <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 pl-4">
            <li>No MCQs or Problems were available in the selected chapter scope.</li>
            <li>The required Markdown definition files (e.g., "${escapeHtml(mcqFileUsedDisplay)}" for MCQs or "${escapeHtml(problemFileUsedDisplay)}" for Problems) were missing, empty, or could not be loaded from the subject's resource folder: ${generalFolderMsg}.</li>
            <li>There was an error during the question selection process.</li>
        </ul>
        <p class="text-xs mt-2">Expected MCQ path: ${mcqFileMsg}</p>
        <p class="text-xs">Expected Problem path: ${problemFileMsg}</p>
        <button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-4">Back to Test Setup</button>`);
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }

    let allocationDetailsHtmlFinal = mcqAllocationDetailsHtml;
    if (selectedProblems.length > 0) {
         const problemCountsByChapter = selectedProblems.reduce((acc, prob) => {
             acc[prob.chapter] = (acc[prob.chapter] || 0) + 1; return acc;
         }, {});
         if (allocationDetailsHtmlFinal && !allocationDetailsHtmlFinal.includes('No MCQs')) {
             allocationDetailsHtmlFinal += `<hr class="my-1 border-blue-300 dark:border-blue-600">`;
         }
         allocationDetailsHtmlFinal += `<p class="font-medium mt-1">Problems selected: ${selectedProblems.length} total (from ${problemSourceType})</p>`
            + Object.entries(problemCountsByChapter)
            .sort((a,b) => parseInt(a[0])-parseInt(b[0]))
            .map(([chapNum, count]) => {
                 const chapTitle = currentSubject.chapters[chapNum]?.title ? escapeHtml(currentSubject.chapters[chapNum].title) : 'No Title';
                 return `<p class="text-xs pl-2">Ch ${chapNum} (${chapTitle}): ${count} Problem(s)</p>`
            }).join('');
    }

    const examId = `TestGen-${currentSubject.id || 'SUBJ'}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;

    if (testType === 'online') {
        console.log("Preparing Online Test...");
        const testDuration = currentSubject.defaultTestDurationMinutes || DEFAULT_ONLINE_TEST_DURATION_MINUTES;
        const onlineTestState = {
            examId: examId,
            questions: finalExamItems,
            correctAnswers: mcqAnswers,
            userAnswers: {},
            allocation: {
                 mcq: selectedMcqMap,
                 problems: selectedProblems.map(p => ({ chapter: p.chapter, id: p.id, type: p.type }))
            },
            startTime: Date.now(),
            timerInterval: null,
            currentQuestionIndex: 0,
            status: 'active',
            durationMinutes: testDuration,
            subjectId: currentSubject.id,
            courseContext: null
        };
        setCurrentOnlineTestState(onlineTestState);
        console.log("Online test state prepared. Launching UI...");
        hideLoading();
        launchOnlineTestUI();

    } else { // PDF Test
        console.log("Preparing PDF Test files...");
        const { questionHtml, solutionHtml } = generatePdfHtml(examId, finalExamItems);

        // --- ADDED LOGGING ---
        console.log("Test Generation - Question HTML (first 500 chars):", (questionHtml || "").substring(0, 500));
        console.log("Test Generation - Solution HTML (first 500 chars):", (solutionHtml || "").substring(0, 500));
        // --- END ADDED LOGGING ---

        const { questionsTex, solutionsTex } = generateTexSource(examId, finalExamItems);

        currentSubject.pending_exams = currentSubject.pending_exams || [];
        currentSubject.pending_exams.push({
            id: examId,
            allocation: selectedMcqMap,
            problemAllocation: selectedProblems.map(p => ({ chapter: p.chapter, id: p.id })),
            results_entered: false,
            timestamp: new Date().toISOString(),
            totalQuestions: actualTotalQuestionsGenerated,
        });
        await saveUserData(currentUser.uid);
        console.log("Pending PDF exam added to list and user data saved.");

        const safeSubjectNameCleaned = cleanTextForFilename(currentSubject.name || 'Subject');
        const dateTimeSuffix = examId.split('-').slice(2).join('-');
        const baseFilename = `TestGen_${safeSubjectNameCleaned}_${dateTimeSuffix}`;
        const questionsPdfFilename = `${baseFilename}_Questions`;
        const solutionsPdfFilename = `${baseFilename}_Solutions`;
        const questionsTexFilename = `${baseFilename}_Questions.tex`;
        const solutionsTexFilename = `${baseFilename}_Solutions.tex`;

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
                     <div class="mt-2 p-2 bg-blue-50 dark:bg-blue-800/30 rounded border border-blue-200 dark:border-blue-700">${allocationDetailsHtmlFinal || 'No allocation details available.'}</div>
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

         document.getElementById('download-pdf-q')?.addEventListener('click', () => generateAndDownloadPdfWithMathJax(questionHtml, questionsPdfFilename));
         document.getElementById('download-pdf-s')?.addEventListener('click', () => generateAndDownloadPdfWithMathJax(solutionHtml, solutionsPdfFilename));

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