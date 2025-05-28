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
    SUBJECT_RESOURCE_FOLDER, 
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

    const url = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${safeMcqFileName}?t=${new Date().getTime()}`;

    console.log(`Fetching main subject Markdown (for MCQs during TestGen) from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
             if (response.status === 404) {
                 console.warn(`Main subject Markdown file NOT FOUND: ${url}. Subject: ${currentSubject.name}`);
                 alert(`Warning: MCQ definition file (${safeMcqFileName}) not found for subject "${currentSubject.name}". MCQs from this source will be unavailable.`);
             } else {
                 console.error(`HTTP error fetching main subject Markdown! status: ${response.status} for ${url}`);
                 alert(`Error loading MCQ definitions for subject "${currentSubject.name}". Status: ${response.status}. Check console.`);
             }
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
     if (!currentSubject.chapters || Object.keys(currentSubject.chapters).length === 0) {
          const courseDir = currentSubject.courseDirName ? cleanTextForFilename(currentSubject.courseDirName) : cleanTextForFilename(currentSubject.name || `subject_${currentSubject.id}`);
          const mcqFile = currentSubject.mcqFileName ? cleanTextForFilename(currentSubject.mcqFileName) : 'MCQ file not specified';
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
                <button id="test-studied-btn" class="w-full btn-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 16c1.255 0 2.443-.29 3.5-.804V4.804zM14.5 4c1.255 0 2.443.29 3.5.804v10A7.969 7.969 0 0114.5 16c-1.255 0-2.443-.29-3.5-.804V4.804A7.968 7.968 0 0114.5 4z"/></svg>
                    Test Studied Chapters Only
                </button>
                <button id="test-specific-chapters-btn" class="w-full btn-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 15.25Z" clip-rule="evenodd" /></svg>
                    Test Specific Chapters
                </button>
            </div>
        </div>
    `;
    displayContent(html);
    document.getElementById('test-studied-btn')?.addEventListener('click', () => promptTestType('studied'));
    document.getElementById('test-specific-chapters-btn')?.addEventListener('click', promptChapterSelectionForTest);
    setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
}

export async function promptChapterSelectionForTest() { 
    if (!currentSubject || !currentSubject.chapters) {
        showTestGenerationDashboard(); 
        return;
    }
    const chapters = currentSubject.chapters;
    showLoading("Loading chapter details for selection...");

    const problemSourceTypeForDisplay = 'text_problems'; 
    const courseDir = currentSubject.courseDirName
        ? cleanTextForFilename(currentSubject.courseDirName)
        : cleanTextForFilename(currentSubject.name || `subject_${currentSubject.id}`);

    const problemsFileToParse = (currentSubject.textProblemsFileName && currentSubject.textProblemsFileName.trim() !== '')
        ? cleanTextForFilename(currentSubject.textProblemsFileName)
        : DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME; 
    
    const problemsFilePath = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${problemsFileToParse}`;

    if (currentSubject.textProblemsFileName || problemsFileToParse === DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME) {
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
            const hasProblems = problemCache[num]?.length > 0;
            return hasMcqs || hasProblems;
        })
        .sort((a, b) => parseInt(a) - parseInt(b));

    hideLoading();
    if (chapterNumbers.length === 0) {
        const mcqFile = currentSubject.mcqFileName ? cleanTextForFilename(currentSubject.mcqFileName) : 'MCQ file not specified';
        const expectedMCQPath = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${mcqFile}`;
        const expectedProblemPath = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/${problemsFileToParse}`;
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
            <button id="continue-chapter-selection-btn" class="w-full btn-primary">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                Continue
            </button>
             <button id="back-to-testgen-dashboard-btn" class="w-full btn-secondary mt-2">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
                 Back
             </button>
        </div>
    `;
    displayContent(html);
    document.getElementById('continue-chapter-selection-btn')?.addEventListener('click', getSelectedChaptersAndPromptTestType);
    document.getElementById('back-to-testgen-dashboard-btn')?.addEventListener('click', showTestGenerationDashboard);
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
    let totalAvailableMcqsInScope = 0; 
    let totalAvailableTextProblemsInScope = 0;
    const lectureResourceDetails = [];

    const courseDir = currentSubject.courseDirName ? cleanTextForFilename(currentSubject.courseDirName) : cleanTextForFilename(currentSubject.name || `subject_${currentSubject.id}`);
    const resourceBasePath = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/`;

    if (mode === 'studied') {
        const studied = (currentSubject.studied_chapters || []).map(String);
        if (studied.length === 0) {
            hideLoading();
            displayContent('<p class="text-red-500 p-4">No chapters marked as studied for this subject.</p><button onclick="window.showManageStudiedChapters()" class="btn-secondary mt-4">Manage Studied Chapters</button><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2 ml-2">Back to Test Setup</button>');
            setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
            return;
        }
        chaptersInScopeNumbers = studied;
    } else if (mode === 'specific' && selectedChapters) {
        chaptersInScopeNumbers = selectedChapters.map(String);
    } else {
        hideLoading();
        displayContent('<p class="text-red-500 p-4">Invalid test mode or chapter selection provided.</p><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2">Back</button>');
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }

    if (chaptersInScopeNumbers.length === 0) {
        hideLoading();
        displayContent(`<p class="text-red-500 p-4">No chapters selected or available in the current scope.</p><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2">Back</button>`);
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }
    
    // Calculate total available MCQs from main subject file for the selected scope
    chaptersInScopeNumbers.forEach(chapNum => {
        const chap = currentSubject.chapters[chapNum];
        if (chap && chap.total_questions > 0 && chap.available_questions?.length > 0) {
            totalAvailableMcqsInScope += chap.available_questions.length;
        }
    });

    // Fetch and calculate total available Text Problems from main subject problem file
    const textProblemSourceType = 'text_problems';
    const textProblemsFileToParse = (currentSubject.textProblemsFileName && currentSubject.textProblemsFileName.trim() !== '')
        ? cleanTextForFilename(currentSubject.textProblemsFileName)
        : DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME;
    const textProblemsFilePath = `${resourceBasePath}${textProblemsFileToParse}`;
    
    if (currentSubject.textProblemsFileName || textProblemsFileToParse === DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME) {
        await parseChapterProblems(textProblemsFilePath, currentSubject.id, textProblemSourceType);
        const textProblemCacheKey = `${currentSubject.id}|${textProblemSourceType}`;
        const textProblemCache = window.subjectProblemCache?.get(textProblemCacheKey) || {};
        chaptersInScopeNumbers.forEach(chapNum => {
            totalAvailableTextProblemsInScope += (textProblemCache[chapNum]?.length || 0);
        });
    }

    // Fetch and calculate counts for Lecture Resources
    if (currentSubject.lectureResources && currentSubject.lectureResources.length > 0) {
        for (const [index, lec] of currentSubject.lectureResources.entries()) {
            if (!lec || !lec.title) continue;
            const lecKey = cleanTextForFilename(lec.title || `lecture_${index}`);
            let availableLecMcqs = 0;
            let availableLecProbs = 0;

            if (lec.mcqFile) {
                const lecMcqFilePath = `${resourceBasePath}${cleanTextForFilename(lec.mcqFile)}`;
                const mdContent = await fetchContentForSource(lecMcqFilePath, `Lecture MCQs: ${lec.title}`);
                if (mdContent) {
                    const { questions } = extractQuestionsFromMarkdown(mdContent, buildScopeMap(chaptersInScopeNumbers), `tg_lec_mcq_${lecKey}`);
                    availableLecMcqs = questions.length;
                }
            }
            if (lec.problemFile) {
                const lecProbFilePath = `${resourceBasePath}${cleanTextForFilename(lec.problemFile)}`;
                // Ensure problems are parsed and cached for this lecture source
                await parseChapterProblems(lecProbFilePath, currentSubject.id, `tg_lec_prob_${lecKey}`);
                const problemCacheKeyLec = `${currentSubject.id}|tg_lec_prob_${lecKey}`;
                const lectProblemsFromCache = window.subjectProblemCache?.get(problemCacheKeyLec) || {};
                chaptersInScopeNumbers.forEach(chapNum => {
                    availableLecProbs += (lectProblemsFromCache[chapNum]?.length || 0);
                });
            }
            lectureResourceDetails.push({
                key: lecKey,
                title: lec.title,
                hasMcqFile: !!lec.mcqFile,
                availableMcqs: availableLecMcqs,
                hasProblemFile: !!lec.problemFile,
                availableProblems: availableLecProbs
            });
        }
    }
    
    const chapterScopeDescription = `Based on the ${chaptersInScopeNumbers.length} chapter(s) in scope.`;

    let lectureResourcesHtml = '';
    if (lectureResourceDetails.length > 0) {
        lectureResourcesHtml = '<h4 class="text-md font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-300 border-t dark:border-gray-600 pt-4">Content from Lectures:</h4><div class="space-y-3">';
        lectureResourceDetails.forEach(lec => {
            lectureResourcesHtml += `
                <div class="mb-3 p-3 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <p class="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">${escapeHtml(lec.title)}</p>`;
            
            if (lec.hasMcqFile) {
                lectureResourcesHtml += `
                    <div class="mt-1">
                        <label for="lec-${lec.key}-mcq-count" class="text-xs text-gray-600 dark:text-gray-400">MCQs (max ${lec.availableMcqs}, 0 for auto):</label>
                        <input type="number" id="lec-${lec.key}-mcq-count" name="lectureMcqCounts[${lec.key}]" min="0" max="${lec.availableMcqs}" value="0" class="form-control-sm text-xs w-20 ml-2">
                    </div>`;
            }
            if (lec.hasProblemFile) {
                lectureResourcesHtml += `
                    <div class="mt-1">
                        <label for="lec-${lec.key}-problem-count" class="text-xs text-gray-600 dark:text-gray-400">Problems (max ${lec.availableProblems}, 0 for auto):</label>
                        <input type="number" id="lec-${lec.key}-problem-count" name="lectureProblemCounts[${lec.key}]" min="0" max="${lec.availableProblems}" value="0" class="form-control-sm text-xs w-20 ml-2">
                    </div>`;
            }
            if (!lec.hasMcqFile && !lec.hasProblemFile) {
                lectureResourcesHtml += `<p class="text-xs text-muted italic">No MCQ or Problem files configured for this lecture.</p>`;
            }
            lectureResourcesHtml += `</div>`;
        });
        lectureResourcesHtml += `</div>`;
    }

    const defaultTotalQuestions = currentSubject.max_questions_per_test || DEFAULT_MAX_QUESTIONS;
    const defaultDuration = currentSubject.defaultTestDurationMinutes || DEFAULT_ONLINE_TEST_DURATION_MINUTES;

    const html = `
        <div class="content-card animate-fade-in">
            <h2 class="text-xl font-semibold mb-2 text-primary-600 dark:text-primary-400">Configure Your Test</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-4 text-sm">${chapterScopeDescription}</p>
            <p class="text-xs text-muted mb-4">Specify the number of questions from each source. The "Target Total" acts as a guideline. If specific counts sum to less, the test will be smaller. If they sum to more, you'll be warned. Enter 0 for a source if you don't want questions from it or want the system to auto-allocate if the Target Total isn't met.</p>

            <form id="test-config-form">
                <div class="space-y-4">
                    <div>
                        <label for="total-questions-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Total Questions in Test</label>
                        <input type="number" id="total-questions-input" name="totalQuestions" min="10" value="${defaultTotalQuestions}" class="form-control mt-1" required>
                        <p class="text-xs text-muted mt-1">Minimum 10. Final count depends on availability and specific requests.</p>
                    </div>

                    <h4 class="text-md font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-300 border-t dark:border-gray-600 pt-4">Content from Main Subject Files:</h4>
                    <div>
                        <label for="text-mcq-count" class="text-sm text-gray-600 dark:text-gray-400">MCQs from Text/Main File (max ${totalAvailableMcqsInScope}, 0 for auto):</label>
                        <input type="number" id="text-mcq-count" name="textMcqCount" min="0" max="${totalAvailableMcqsInScope}" value="0" class="form-control-sm text-xs w-20 ml-2">
                    </div>
                    <div>
                        <label for="text-problem-count" class="text-sm text-gray-600 dark:text-gray-400">Problems from Text/Main File (max ${totalAvailableTextProblemsInScope}, 0 for auto):</label>
                        <input type="number" id="text-problem-count" name="textProblemCount" min="0" max="${totalAvailableTextProblemsInScope}" value="0" class="form-control-sm text-xs w-20 ml-2">
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
                    <button type="button" id="start-online-test-btn" class="btn-primary flex-1">Start Online Test</button>
                    <button type="button" id="generate-pdf-test-btn" class="btn-primary flex-1">Generate PDF Test</button>
                </div>
            </form>
            <button id="back-to-chapter-or-dashboard-btn" class="w-full btn-secondary mt-4">Back</button>
        </div>
    `;
    hideLoading();
    displayContent(html);

    document.getElementById('start-online-test-btn')?.addEventListener('click', () => collectAndStartTestGeneration(mode, chaptersInScopeNumbers, "online"));
    document.getElementById('generate-pdf-test-btn')?.addEventListener('click', () => collectAndStartTestGeneration(mode, chaptersInScopeNumbers, "pdf"));
    document.getElementById('back-to-chapter-or-dashboard-btn')?.addEventListener('click', () => {
        if (mode === 'specific') {
            promptChapterSelectionForTest();
        } else {
            showTestGenerationDashboard();
        }
    });

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
function collectAndStartTestGeneration(mode, selectedChapters, testFormat) {
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
        currentSubject.lectureResources.forEach((lec) => { 
            if (!lec || !lec.title) return;
            const lecKey = cleanTextForFilename(lec.title || `lecture_unknown`); 
            
            const mcqCountEl = form.elements[`lectureMcqCounts[${lecKey}]`];
            if (mcqCountEl) {
                const count = parseInt(mcqCountEl.value);
                if (!isNaN(count) && count >= 0) testGenConfig.lectureMcqCounts[lecKey] = count; 
            }
            
            const probCountEl = form.elements[`lectureProblemCounts[${lecKey}]`];
            if (probCountEl) {
                const count = parseInt(probCountEl.value);
                if (!isNaN(count) && count >= 0) testGenConfig.lectureProblemCounts[lecKey] = count; 
            }
        });
    }


    let sumOfSpecificRequests = testGenConfig.textMcqCount + testGenConfig.textProblemCount;
    Object.values(testGenConfig.lectureMcqCounts).forEach(c => sumOfSpecificRequests += c);
    Object.values(testGenConfig.lectureProblemCounts).forEach(c => sumOfSpecificRequests += c);

    if (sumOfSpecificRequests === 0 && targetTotalQuestions > 0) {
        console.log("All specific counts are 0. System will attempt to auto-allocate up to target total.");
    } else if (sumOfSpecificRequests === 0 && targetTotalQuestions <=0 ) { 
        alert("Please request at least one question from any source, or set a valid target total of at least 10.");
        return;
    }
    
    if (sumOfSpecificRequests > targetTotalQuestions) {
        if (!confirm(`The sum of questions specifically requested (${sumOfSpecificRequests}) is greater than your target total questions (${targetTotalQuestions}).
The test will be generated attempting to fulfill your specific requests, potentially resulting in ${sumOfSpecificRequests} questions if all are available. Continue?`)) {
            return;
        }
    } else if (sumOfSpecificRequests < targetTotalQuestions && sumOfSpecificRequests > 0) { 
         if (!confirm(`The sum of questions specifically requested (${sumOfSpecificRequests}) is less than your target total questions (${targetTotalQuestions}).
The test will be generated with ${sumOfSpecificRequests} questions, as auto-filling the remainder from '0-count' sources is not fully supported when other specific counts are given. To get exactly ${targetTotalQuestions}, adjust your specific counts or set all to 0 for full auto-allocation. Continue with ${sumOfSpecificRequests} questions?`)) {
            return;
        }
    }


    // Call the main test generation logic
    startTestGeneration(mode, selectedChapters, testFormat, testGenConfig, targetTotalQuestions);
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
function buildScopeMap(chapterNumbersArray, questionNumbersMap = null) {
    const map = {};
    chapterNumbersArray.forEach(cnStr => {
        const cn = String(cnStr); 
        if (questionNumbersMap && questionNumbersMap[cn]) {
            map[cn] = questionNumbersMap[cn]; 
        } else {
            map[cn] = null; 
        }
    });
    return map;
}

// Helper to format raw problems (from parseChapterProblems cache) into exam item structure
function formatProblemsForExam(rawProblems, subjectId, sourceTypeSuffix) {
    return rawProblems.map((prob, index) => ({
        id: prob.id || `subj${subjectId}-chap${prob.chapter}-prob${index + 1}-${sourceTypeSuffix}`,
        chapter: String(prob.chapter),
        number: index + 1, 
        text: prob.text || "Problem text missing.",
        options: [],
        image: null, 
        correctAnswer: null, 
        type: prob.type || 'Problem', 
        difficulty: prob.difficulty,
        topics: prob.topics || [],
        isProblem: true
    }));
}


// --- Main Test Generation Logic ---
export async function startTestGeneration(mode, selectedChapters, testType, testGenConfig, targetTotalQuestionsFromForm) {
    if (!currentUser || !currentSubject || !data || !currentSubject.chapters) {
        alert("User, subject, or chapter data not loaded. Please reload or select a subject.");
        hideLoading();
        window.showTestGenerationDashboard(); 
        return;
    }
    showLoading(`Generating ${testType === 'online' ? 'Online Test' : 'Test Files'}... (Gathering Content)`);
    await new Promise(resolve => setTimeout(resolve, 100)); 

    let chaptersInScopeNumbers = [];
    if (mode === 'studied') {
        chaptersInScopeNumbers = (currentSubject.studied_chapters || []).map(String);
        if (chaptersInScopeNumbers.length === 0) {
            hideLoading();
            displayContent('<p class="text-red-500 p-4">No chapters marked as studied.</p><button onclick="window.showManageStudiedChapters()" class="btn-secondary mt-4">Manage Studied Chapters</button>');
            setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
            return;
        }
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

    const allSelectedMcqs = [];
    const allSelectedProblems = [];
    const allMcqAnswers = {}; // To store correct answers for all MCQs
    let actualTotalQuestionsGenerated = 0;
    
    const courseDir = currentSubject.courseDirName 
        ? cleanTextForFilename(currentSubject.courseDirName) 
        : cleanTextForFilename(currentSubject.name || `subject_${currentSubject.id}`);
    const resourceBasePath = `${COURSE_BASE_PATH}/${courseDir}/${SUBJECT_RESOURCE_FOLDER}/`;
    const subjectId = currentSubject.id;

    // Helper to fetch, parse, select MCQs
    async function processMcqSource(filePath, requestedCount, sourceLogName, sourceTypeKey) {
        if (requestedCount > 0 && filePath) {
            console.log(`Processing ${sourceLogName} from: ${filePath} for ${requestedCount} MCQs`);
            const mdContent = await fetchContentForSource(filePath, sourceLogName); // fetchContentForSource is defined in ui_test_generation.js
            if (mdContent) {
                const { questions, answers } = extractQuestionsFromMarkdown(mdContent, buildScopeMap(chaptersInScopeNumbers), sourceTypeKey);
                const randomSelection = selectRandomItems(questions, requestedCount); // selectRandomItems defined in ui_test_generation.js
                allSelectedMcqs.push(...randomSelection);
                Object.assign(allMcqAnswers, answers); 
                console.log(`Added ${randomSelection.length} MCQs from ${sourceLogName}. Total MCQs now: ${allSelectedMcqs.length}`);
            }
        }
    }
    // Helper to fetch, parse, select Problems
    async function processProblemSource(filePath, requestedCount, sourceLogName, problemCacheTypeKey) {
        if (requestedCount > 0 && filePath) {
            console.log(`Processing ${sourceLogName} from: ${filePath} for ${requestedCount} Problems`);
            await parseChapterProblems(filePath, subjectId, problemCacheTypeKey); // From test_logic.js
            const problemCacheKey = `${subjectId}|${problemCacheTypeKey}`;
            const problemsFromCache = window.subjectProblemCache?.get(problemCacheKey) || {};
            const problemsInScopeRaw = [];
            chaptersInScopeNumbers.forEach(chapNum => {
                if (problemsFromCache[chapNum]) {
                    problemsInScopeRaw.push(...problemsFromCache[chapNum]);
                }
            });
            const randomSelectionRaw = selectRandomItems(problemsInScopeRaw, requestedCount);
            allSelectedProblems.push(...formatProblemsForExam(randomSelectionRaw, subjectId, problemCacheTypeKey)); // formatProblemsForExam defined in ui_test_generation.js
            console.log(`Added ${randomSelectionRaw.length} Problems from ${sourceLogName}. Total Problems now: ${allSelectedProblems.length}`);
        }
    }
    
    // --- Phase 1: Fulfill Explicit Positive Requests ---
    showLoading("Generating Test... (Phase 1: Specific Requests)");
    if (currentSubject.mcqFileName) {
        await processMcqSource(`${resourceBasePath}${cleanTextForFilename(currentSubject.mcqFileName)}`, testGenConfig.textMcqCount, "Text MCQs (Main File)", "tg_text_mcq");
    }
    const textProblemsFileActual = (currentSubject.textProblemsFileName && currentSubject.textProblemsFileName.trim() !== '') 
        ? cleanTextForFilename(currentSubject.textProblemsFileName) 
        : DEFAULT_COURSE_TEXT_PROBLEMS_FILENAME; // From config.js
    if (textProblemsFileActual) { 
        await processProblemSource(`${resourceBasePath}${textProblemsFileActual}`, testGenConfig.textProblemCount, "Text Problems (Main File)", "tg_text_prob");
    }

    if (currentSubject.lectureResources) {
        for (const lec of currentSubject.lectureResources) {
            if (!lec || !lec.title) continue;
            const lecKey = cleanTextForFilename(lec.title || `lecture_unknown`);
            if (lec.mcqFile && testGenConfig.lectureMcqCounts[lecKey] > 0) {
                await processMcqSource(`${resourceBasePath}${cleanTextForFilename(lec.mcqFile)}`, testGenConfig.lectureMcqCounts[lecKey], `Lecture MCQs: ${lec.title}`, `tg_lec_mcq_${lecKey}`);
            }
            if (lec.problemFile && testGenConfig.lectureProblemCounts[lecKey] > 0) {
                await processProblemSource(`${resourceBasePath}${cleanTextForFilename(lec.problemFile)}`, testGenConfig.lectureProblemCounts[lecKey], `Lecture Problems: ${lec.title}`, `tg_lec_prob_${lecKey}`);
            }
        }
    }

    let currentSelectedTotal = allSelectedMcqs.length + allSelectedProblems.length;
    let deficit = targetTotalQuestionsFromForm - currentSelectedTotal;

    // --- Phase 2: Handle Deficit with "Auto" Sources (where user entered 0 for a source count) ---
    if (deficit > 0) {
        showLoading("Generating Test... (Phase 2: Auto-filling)");
        console.log(`Deficit of ${deficit} questions. Attempting to fill from "auto" (0-count) sources, respecting subject's MCQ/Problem ratio.`);
        
        const autoSources = [];
        if (testGenConfig.textMcqCount === 0 && currentSubject.mcqFileName) {
            const available = [];
            const mdContent = await fetchContentForSource(`${resourceBasePath}${cleanTextForFilename(currentSubject.mcqFileName)}`, "Auto Text MCQs");
            if (mdContent) {
                const { questions, answers: autoTextMcqAnswers } = extractQuestionsFromMarkdown(mdContent, buildScopeMap(chaptersInScopeNumbers), "auto_tg_text_mcq");
                available.push(...questions);
                Object.assign(allMcqAnswers, autoTextMcqAnswers); 
            }
            if (available.length > 0) autoSources.push({ type: 'mcq', sourceName: 'Text (Main)', availableItems: available, sourceTypeKey: "auto_tg_text_mcq"});
        }
        if (testGenConfig.textProblemCount === 0 && textProblemsFileActual) {
            const available = [];
            await parseChapterProblems(`${resourceBasePath}${textProblemsFileActual}`, subjectId, "tg_text_prob"); // Ensures cache is populated
            const problemCacheKey = `${subjectId}|tg_text_prob`;
            const problemsFromCache = window.subjectProblemCache?.get(problemCacheKey) || {};
            chaptersInScopeNumbers.forEach(chapNum => { if (problemsFromCache[chapNum]) available.push(...problemsFromCache[chapNum]); });
            if (available.length > 0) autoSources.push({ type: 'problem', sourceName: 'Text Problems (Main)', availableItems: available, sourceTypeKey: "auto_tg_text_prob" });
        }

        if (currentSubject.lectureResources) {
            for (const lec of currentSubject.lectureResources) {
                if (!lec || !lec.title) continue;
                const lecKey = cleanTextForFilename(lec.title || `lecture_unknown`);
                if (lec.mcqFile && (testGenConfig.lectureMcqCounts[lecKey] === 0 || testGenConfig.lectureMcqCounts[lecKey] === undefined)) {
                    const available = [];
                    const mdContent = await fetchContentForSource(`${resourceBasePath}${cleanTextForFilename(lec.mcqFile)}`, `Auto Lecture MCQs: ${lec.title}`);
                    if (mdContent) {
                        const { questions, answers: autoLecMcqAnswers } = extractQuestionsFromMarkdown(mdContent, buildScopeMap(chaptersInScopeNumbers), `auto_tg_lec_mcq_${lecKey}`);
                        available.push(...questions);
                        Object.assign(allMcqAnswers, autoLecMcqAnswers); 
                    }
                    if (available.length > 0) autoSources.push({ type: 'mcq', sourceName: `Lecture: ${lec.title}`, availableItems: available, sourceTypeKey: `auto_tg_lec_mcq_${lecKey}`});
                }
                if (lec.problemFile && (testGenConfig.lectureProblemCounts[lecKey] === 0 || testGenConfig.lectureProblemCounts[lecKey] === undefined)) {
                    const available = [];
                    await parseChapterProblems(`${resourceBasePath}${cleanTextForFilename(lec.problemFile)}`, subjectId, `tg_lec_prob_${lecKey}`);
                    const problemCacheKeyLec = `${subjectId}|tg_lec_prob_${lecKey}`;
                    const lectProblemsFromCache = window.subjectProblemCache?.get(problemCacheKeyLec) || {};
                    chaptersInScopeNumbers.forEach(chapNum => { if (lectProblemsFromCache[chapNum]) available.push(...lectProblemsFromCache[chapNum]); });
                    if (available.length > 0) autoSources.push({ type: 'problem', sourceName: `Lecture Problems: ${lec.title}`, availableItems: available, sourceTypeKey: `auto_tg_lec_prob_${lecKey}` });
                }
            }
        }
        
        if (autoSources.length > 0) {
            const allAutoMcqsPool = autoSources.filter(s => s.type === 'mcq').flatMap(s => s.availableItems);
            const allAutoProblemsPoolRaw = autoSources.filter(s => s.type === 'problem').flatMap(s => s.availableItems);
            
            let numAutoMcqsToSelect = Math.round(deficit * (currentSubject.mcqProblemRatio || DEFAULT_MCQ_PROBLEM_RATIO));
            let numAutoProblemsToSelect = deficit - numAutoMcqsToSelect;

            numAutoMcqsToSelect = Math.min(numAutoMcqsToSelect, allAutoMcqsPool.length);
            numAutoProblemsToSelect = Math.min(numAutoProblemsToSelect, allAutoProblemsPoolRaw.length);

            const remainingDeficitAfterCaps = deficit - (numAutoMcqsToSelect + numAutoProblemsToSelect);
            if (remainingDeficitAfterCaps > 0) {
                if (allAutoMcqsPool.length > numAutoMcqsToSelect) { 
                    const canAddMcqs = allAutoMcqsPool.length - numAutoMcqsToSelect;
                    const addMoreMcqs = Math.min(remainingDeficitAfterCaps, canAddMcqs);
                    numAutoMcqsToSelect += addMoreMcqs;
                } else if (allAutoProblemsPoolRaw.length > numAutoProblemsToSelect) { 
                    const canAddProbs = allAutoProblemsPoolRaw.length - numAutoProblemsToSelect;
                    const addMoreProbs = Math.min(remainingDeficitAfterCaps, canAddProbs);
                    numAutoProblemsToSelect += addMoreProbs;
                }
            }
            
            if (numAutoMcqsToSelect > 0) {
                const randomAutoMcqSelection = selectRandomItems(allAutoMcqsPool, numAutoMcqsToSelect);
                allSelectedMcqs.push(...randomAutoMcqSelection);
                console.log(`Added ${randomAutoMcqSelection.length} MCQs from "auto" sources.`);
            }
            if (numAutoProblemsToSelect > 0) {
                const randomAutoProbSelectionRaw = selectRandomItems(allAutoProblemsPoolRaw, numAutoProblemsToSelect);
                allSelectedProblems.push(...formatProblemsForExam(randomAutoProbSelectionRaw, subjectId, "auto_combined_prob"));
                console.log(`Added ${randomAutoProbSelectionRaw.length} Problems from "auto" sources.`);
            }
        }
    }

    const finalExamItemsCombined = combineProblemsWithQuestions(allSelectedProblems, allSelectedMcqs);
    let finalExamItems;

    // --- Phase 3: Final Capping/Adjustment ---
    showLoading("Generating Test... (Phase 3: Finalizing)");
    actualTotalQuestionsGenerated = finalExamItemsCombined.length; 
    if (actualTotalQuestionsGenerated > targetTotalQuestionsFromForm) {
        console.log(`Generated ${actualTotalQuestionsGenerated} questions, but target was ${targetTotalQuestionsFromForm}. Truncating by random selection.`);
        finalExamItems = selectRandomItems(finalExamItemsCombined, targetTotalQuestionsFromForm); 
    } else {
        finalExamItems = finalExamItemsCombined;
    }
    actualTotalQuestionsGenerated = finalExamItems.length; 
    
    if (actualTotalQuestionsGenerated === 0 || (actualTotalQuestionsGenerated < 10 && targetTotalQuestionsFromForm >=10)) {
        hideLoading();
        let errorMsg = `Test Generation Failed: Only ${actualTotalQuestionsGenerated} questions could be selected. Need at least 10.`;
        if (actualTotalQuestionsGenerated === 0) errorMsg = "Test Generation Failed: No questions could be selected from the specified sources for the chosen chapters. Please check counts and file availability.";
        displayContent(`<p class="text-red-500 p-4 font-semibold">${errorMsg}</p><button onclick="window.promptTestType('${mode}', ${JSON.stringify(chaptersInScopeNumbers)})" class="btn-secondary mt-2">Reconfigure Test</button>`);
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }
    if (actualTotalQuestionsGenerated < targetTotalQuestionsFromForm) {
        alert(`Warning: Could only generate ${actualTotalQuestionsGenerated} questions, though ${targetTotalQuestionsFromForm} were targeted. Check availability in selected chapters/sources.`);
    }
    console.log(`Final questions in exam: ${actualTotalQuestionsGenerated} (MCQs: ${finalExamItems.filter(q=>!q.isProblem).length}, Problems: ${finalExamItems.filter(q=>q.isProblem).length})`);


    // 4. Determine Duration
    let testDuration;
    if (testGenConfig.timingOption === 'calculated') {
        const numMcqsInFinal = finalExamItems.filter(q => !q.isProblem).length;
        const numProblemsInFinal = finalExamItems.filter(q => q.isProblem).length;
        testDuration = (numMcqsInFinal * 3) + (numProblemsInFinal * 15); // Example timing
    } else if (testGenConfig.timingOption === 'custom' && testGenConfig.customDurationMinutes) {
        testDuration = testGenConfig.customDurationMinutes;
    } else { // 'default' or fallback
        testDuration = currentSubject.defaultTestDurationMinutes || DEFAULT_ONLINE_TEST_DURATION_MINUTES;
    }
    testDuration = Math.max(10, testDuration); 

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
        courseContext: null, 
        testGenConfig: testGenConfig 
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
            allocation: finalExamItems.filter(q => !q.isProblem).reduce((acc, mcq) => {
                const chapStr = String(mcq.chapter);
                if (!acc[chapStr]) acc[chapStr] = [];
                acc[chapStr].push(mcq.number); 
                return acc;
            }, {}),
            problemAllocation: finalExamItems.filter(q => q.isProblem).map(p => ({ 
                chapter: String(p.chapter), 
                id: p.id, 
                textPreview: p.text.substring(0,50) 
            })),
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
        
        let allocationDetailsHtmlFinal = `<p class="font-medium">Test Configuration Used:</p>
            <p class="text-xs">Target Total Questions (from form): ${targetTotalQuestionsFromForm}</p>
            <p class="text-xs">Actual Questions in Test: ${actualTotalQuestionsGenerated}</p> 
            <p class="text-xs">Duration: ${testDuration} min (Timing mode: ${testGenConfig.timingOption})</p>
            <p class="text-xs mt-1"><strong>Actual Content Breakdown:</strong></p>
            <ul class="list-disc list-inside ml-4 text-xs">
            ${numMcqsInPdf > 0 ? `<li>Total MCQs: ${numMcqsInPdf}</li>` : ''}
            ${numProblemsInPdf > 0 ? `<li>Total Problems: ${numProblemsInPdf}</li>` : ''}
            </ul>
            <p class="text-xs mt-1"><strong>Requested Source Counts (User Input):</strong></p>
            <ul class="list-disc list-inside ml-4 text-xs">
            ${testGenConfig.textMcqCount > 0 ? `<li>Text MCQs: ${testGenConfig.textMcqCount}</li>` : (testGenConfig.textMcqCount === 0 ? '<li>Text MCQs: Auto</li>' : '')}
            ${testGenConfig.textProblemCount > 0 ? `<li>Text Problems: ${testGenConfig.textProblemCount}</li>` : (testGenConfig.textProblemCount === 0 ? '<li>Text Problems: Auto</li>' : '')}
            ${Object.entries(testGenConfig.lectureMcqCounts).map(([lecKey, count]) => count > 0 ? `<li>${lecKey.replace(/_/g, ' ')} MCQs: ${count}</li>` : (count === 0 ? `<li>${lecKey.replace(/_/g, ' ')} MCQs: Auto</li>` : '')).filter(Boolean).join('')}
            ${Object.entries(testGenConfig.lectureProblemCounts).map(([lecKey, count]) => count > 0 ? `<li>${lecKey.replace(/_/g, ' ')} Problems: ${count}</li>` : (count === 0 ? `<li>${lecKey.replace(/_/g, ' ')} Problems: Auto</li>`: '')).filter(Boolean).join('')}
            </ul>`;

        displayContent(`
            <div class="bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300 p-4 rounded-md mb-6 animate-fade-in">
                <p class="font-medium">Test Files Ready for Download (Server-Side PDF Generation)</p>
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
                 <button id="download-pdf-q-server" class="w-full btn-primary">Download Questions PDF (via Server)</button>
                 <button id="download-pdf-s-server" class="w-full btn-primary">Download Solutions PDF (via Server)</button>
                 <button id="download-tex-q-btn" class="w-full btn-secondary">Download Questions .tex</button>
                 <button id="download-tex-s-btn" class="w-full btn-secondary">Download Solutions .tex</button>
                 <button id="go-to-exams-dashboard-btn" class="w-full btn-secondary mt-4">Go to Exams Dashboard</button>
             </div>
             <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">This exam is now pending. Remember to run your local PDF server. Enter results manually via the Exams Dashboard.</p>
         `);
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');

        document.getElementById('download-pdf-q-server')?.addEventListener('click', () => 
            generateAndDownloadPdfWithMathJax(questionHtml, `${baseFilename}_Questions`) 
        );
        document.getElementById('download-pdf-s-server')?.addEventListener('click', () => 
            generateAndDownloadPdfWithMathJax(solutionHtml, `${baseFilename}_Solutions`) 
        );
        document.getElementById('download-tex-q-btn')?.addEventListener('click', () => downloadTexFileWrapper(`${escapeHtml(baseFilename)}_Questions.tex`, btoa(unescape(encodeURIComponent(questionsTex)))));
        document.getElementById('download-tex-s-btn')?.addEventListener('click', () => downloadTexFileWrapper(`${escapeHtml(baseFilename)}_Solutions.tex`, btoa(unescape(encodeURIComponent(solutionsTex)))));
        document.getElementById('go-to-exams-dashboard-btn')?.addEventListener('click', showExamsDashboard);
        hideLoading();
    }
}


function downloadTexFileWrapper(filename, base64Content) {
     try {
         downloadTexFile(filename, base64Content); 
     } catch (e) {
         console.error("Error in downloadTexFileWrapper:", e);
         alert("Failed to prepare TeX file for download. The content might be invalidly encoded or corrupted.");
     }
 };

// --- END OF FILE ui_test_generation.js ---