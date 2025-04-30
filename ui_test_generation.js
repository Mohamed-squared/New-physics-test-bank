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
import { DEFAULT_MCQ_PROBLEM_RATIO, DEFAULT_ONLINE_TEST_DURATION_MINUTES } from './config.js';
// Removed AI imports, handled elsewhere
// Removed parseSkipExamText import, handled elsewhere

// --- Helper Function ---
/**
 * Fetches the markdown content for the current subject.
 * Returns the markdown text content or null if fetch fails.
 */
async function getCurrentSubjectMarkdown() {
    if (!currentSubject) return null;
    const fileName = currentSubject.fileName || (currentSubject.name === "Fundamentals of Physics" ? "chapters.md" : `${currentSubject.name}.md`);
    const safeFileName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    const url = `./${safeFileName}?t=${new Date().getTime()}`; // Use relative path

    console.log(`Fetching Markdown for current subject from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Markdown file not found for current subject at ${url}.`);
                return null;
            }
            throw new Error(`HTTP error fetching markdown! status: ${response.status} for ${url}`);
        }
        const mdContent = await response.text();
        console.log(`Markdown fetched successfully for ${currentSubject.name}.`);
        return mdContent;
    } catch (error) {
        console.error(`Error fetching Markdown for ${currentSubject.name} (${url}):`, error);
        alert(`Warning: Could not load chapter definitions for subject "${currentSubject.name}". Tests cannot be generated.`);
        return null;
    }
}

// --- Test Generation UI Flow ---

export function showTestGenerationDashboard() {
    if (!currentSubject) {
        displayContent('<p class="text-yellow-500 p-4">Please select or add a subject first.</p><button onclick="window.showManageSubjects()" class="btn-secondary mt-2">Manage Subjects</button>');
        // MODIFIED: Target correct nav section
        setActiveSidebarLink('showTestGenerationDashboard', 'sidebar-standard-nav');
        return;
    }
     if (!currentSubject.chapters || Object.keys(currentSubject.chapters).length === 0) {
          displayContent(`<p class="text-yellow-500 p-4">The current subject '${escapeHtml(currentSubject.name)}' has no chapters loaded. Check subject setup or associated Markdown file (${escapeHtml(currentSubject.fileName || 'Not Specified')}).</p><button onclick="window.initializeApp()" class="btn-secondary mt-2">Reload Data</button>`);
         // MODIFIED: Target correct nav section
         setActiveSidebarLink('showTestGenerationDashboard', 'sidebar-standard-nav');
          return;
      }

    const html = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4">
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
    // MODIFIED: Target correct nav section and dropdown item if applicable
    setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
}

export function promptChapterSelectionForTest() {
    if (!currentSubject || !currentSubject.chapters) {
         showTestGenerationDashboard(); // Go back if data is missing
         return;
     }
    const chapters = currentSubject.chapters;
    // Filter chapters that actually have questions defined
    const chapterNumbers = Object.keys(chapters)
                           .filter(num => chapters[num] && chapters[num].total_questions > 0)
                           .sort((a, b) => parseInt(a) - parseInt(b));

    if (chapterNumbers.length === 0) {
        displayContent('<p class="text-red-500 p-4">No chapters with questions available in this subject to select from.</p><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2">Back</button>');
         // MODIFIED: Target correct nav section
         setActiveSidebarLink('showTestGenerationDashboard', 'sidebar-standard-nav');
        return;
    }

    let chapterOptionsHtml = chapterNumbers.map(num => {
        const chap = chapters[num];
        const availableCount = chap.available_questions?.length || 0;
        const totalCount = chap.total_questions || 0;
        const studied = currentSubject.studied_chapters?.includes(num);
        return `
        <div class="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
            <input id="test-chap-${num}" type="checkbox" value="${num}" class="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600">
            <label for="test-chap-${num}" class="ml-2 block text-sm text-gray-900 dark:text-gray-300 cursor-pointer flex-grow">
                Chapter ${num} (${availableCount} avail / ${totalCount} total) ${studied ? '<span class="text-xs text-green-600 dark:text-green-400">(Studied)</span>' : ''}
            </label>
        </div>
        `;
    }).join('');

    const html = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4">
            <h2 class="text-xl font-semibold mb-4 text-primary-600 dark:text-primary-400">Select Chapters for Test</h2>
            <div class="space-y-2 mb-6 max-h-60 overflow-y-auto p-2 border dark:border-gray-600 rounded">
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
    // MODIFIED: Target correct nav section and dropdown item if applicable
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
    let relevantChapters = {};
    let chapterCount = 0;
    let totalAvailableMcqsInScope = 0;
    let chaptersInScopeNumbers = []; // Store chapter numbers for problem check

    if (mode === 'studied') {
        const studied = currentSubject.studied_chapters || [];
        if (studied.length === 0) { hideLoading(); displayContent('<p class="text-red-500 p-4">No chapters marked as studied.</p><button onclick="window.showManageStudiedChapters()" class="btn-secondary mt-4">Manage Studied Chapters</button>'); return; }
        studied.forEach(chapNum => {
            const chap = currentSubject.chapters[chapNum];
            if (chap && chap.total_questions > 0 && chap.available_questions?.length > 0) {
                relevantChapters[chapNum] = chap;
                totalAvailableMcqsInScope += chap.available_questions.length;
            }
            if (chap) chaptersInScopeNumbers.push(chapNum); // Add even if no MCQs for problem check
        });
        chapterCount = Object.keys(relevantChapters).length;
        if (chapterCount === 0 && totalAvailableMcqsInScope === 0) { // Check MCQs specifically
             displayContent('<p class="text-yellow-500 p-4">None of your studied chapters have available MCQs.</p>');
             setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
             return;
        }
        chapterScopeDescription = `Based on your ${chapterCount} studied chapter(s) with available MCQs (${totalAvailableMcqsInScope} MCQs available).`;
    } else if (mode === 'specific' && selectedChapters) {
        selectedChapters.forEach(chapNum => {
             const chap = currentSubject.chapters[chapNum];
            if (chap && chap.total_questions > 0 && chap.available_questions?.length > 0) {
                relevantChapters[chapNum] = chap;
                 totalAvailableMcqsInScope += chap.available_questions.length;
            }
            if(chap) chaptersInScopeNumbers.push(chapNum); // Add even if no MCQs for problem check
        });
        chapterCount = Object.keys(relevantChapters).length;
         if (chapterCount === 0 && totalAvailableMcqsInScope === 0) {
              displayContent('<p class="text-yellow-500 p-4">None of the selected chapters have available MCQs.</p>');
               setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
              return;
         }
        chapterScopeDescription = `Based on the ${selectedChapters.length} selected chapter(s) (${totalAvailableMcqsInScope} MCQs available).`;
    } else {
         displayContent('<p class="text-red-500 p-4">Invalid test mode or chapter selection.</p>');
          setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
         return;
    }

    // Check for available problems in the scope
    let totalAvailableProblemsInScope = 0;
    if (window.subjectProblemCache && window.subjectProblemCache.has(currentSubject.id)) {
        const problemCache = window.subjectProblemCache.get(currentSubject.id);
        chaptersInScopeNumbers.forEach(chapNum => {
            totalAvailableProblemsInScope += (problemCache[chapNum]?.length || 0);
        });
    }
    chapterScopeDescription += ` ${totalAvailableProblemsInScope} Problems available.`;

    if (totalAvailableMcqsInScope === 0 && totalAvailableProblemsInScope === 0) {
        displayContent(`<p class="text-yellow-500 p-4">The chapters in scope have no available questions or problems currently.</p><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2">Back</button>`);
         setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');
        return;
    }

    const maxTestSize = currentSubject.max_questions_per_test || 42;
    // Calculate max possible based on BOTH available MCQs and Problems
    const actualMaxPossible = totalAvailableMcqsInScope + totalAvailableProblemsInScope;
    const actualTestSize = Math.min(maxTestSize, actualMaxPossible); // Limited by overall availability
    const mcqRatio = currentSubject.mcqProblemRatio ?? DEFAULT_MCQ_PROBLEM_RATIO;
    const ratioPercent = (mcqRatio * 100).toFixed(0);

    const html = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4">
            <h2 class="text-xl font-semibold mb-4 text-primary-600 dark:text-primary-400">Choose Test Format</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-6">
                ${chapterScopeDescription}<br>
                Generating a test with <strong>${actualTestSize} questions</strong> (Max: ${maxTestSize}, Available: ${actualMaxPossible}).
                 <span class="text-xs block mt-1">Test will include ~${ratioPercent}% MCQs and ~${100-ratioPercent}% Problems, based on availability.</span>
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
         alert("User, subject, or chapter data not loaded.");
         hideLoading();
         return;
     }
    showLoading(`Generating ${testType === 'online' ? 'Online Test' : 'Test Files'}...`);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Fetch resources needed
    const subjectMarkdownContent = await getCurrentSubjectMarkdown();
    await parseChapterProblems(currentSubject); // Ensure problem cache is populated

    let relevantChaptersForAllocation = {};
    let chaptersInScopeNumbers = []; // Track chapter numbers in scope
    let chapterScopeDescription = "";
    let totalAvailableMcqsInScope = 0;

    // 1. Determine scope and available MCQs
    if (mode === 'studied') {
        const studied = currentSubject.studied_chapters || [];
        if (studied.length === 0) { hideLoading(); displayContent('<p class="text-red-500 p-4">No chapters marked as studied.</p><button onclick="window.showManageStudiedChapters()" class="btn-secondary mt-4">Manage Studied Chapters</button>'); return; }
        studied.forEach(chapNum => {
            const chap = currentSubject.chapters[chapNum];
            if (chap) {
                chaptersInScopeNumbers.push(chapNum); // Add to scope numbers
                if (chap.total_questions > 0 && chap.available_questions?.length > 0) {
                    relevantChaptersForAllocation[chapNum] = chap; // Only for allocation if MCQs available
                    totalAvailableMcqsInScope += chap.available_questions.length;
                }
            }
        });
        chapterScopeDescription = `Based on your ${chaptersInScopeNumbers.length} studied chapter(s)`;
    } else if (mode === 'specific' && selectedChapters) {
        selectedChapters.forEach(chapNum => {
            const chap = currentSubject.chapters[chapNum];
            if (chap) {
                 chaptersInScopeNumbers.push(chapNum); // Add to scope numbers
                 if (chap.total_questions > 0 && chap.available_questions?.length > 0) {
                     relevantChaptersForAllocation[chapNum] = chap; // Only for allocation if MCQs available
                     totalAvailableMcqsInScope += chap.available_questions.length;
                 }
            }
        });
        chapterScopeDescription = `Based on the ${chaptersInScopeNumbers.length} selected chapter(s)`;
    } else { hideLoading(); displayContent('<p class="text-red-500 p-4">Invalid test mode or chapter selection.</p>'); return; }

     // 2. Check for available problems in scope
     let totalAvailableProblemsInScope = 0;
     const problemCache = window.subjectProblemCache?.get(currentSubject.id) || {};
     chaptersInScopeNumbers.forEach(chapNum => {
          totalAvailableProblemsInScope += (problemCache[chapNum]?.length || 0);
     });

     // Exit if no questions or problems available at all
     if (totalAvailableMcqsInScope === 0 && totalAvailableProblemsInScope === 0) {
         hideLoading();
         displayContent(`<p class="text-yellow-500 p-4">The chapters in scope have no available MCQs or Problems currently.</p>`);
         return;
     }

    // 3. Determine Final Test Size & MCQ/Problem Counts
    const maxTestSize = currentSubject.max_questions_per_test || DEFAULT_MAX_QUESTIONS;
    const actualTotalAvailable = totalAvailableMcqsInScope + totalAvailableProblemsInScope;
    const finalTestSize = Math.min(maxTestSize, actualTotalAvailable);
    const mcqRatio = currentSubject.mcqProblemRatio ?? DEFAULT_MCQ_PROBLEM_RATIO;

    // Calculate target counts based on ratio and *final* test size
    let targetMcqCount = Math.min(totalAvailableMcqsInScope, Math.round(finalTestSize * mcqRatio));
    let targetProblemCount = Math.min(totalAvailableProblemsInScope, finalTestSize - targetMcqCount);

    // Adjust if one type is scarce, ensuring we reach finalTestSize if possible
    if (targetMcqCount + targetProblemCount < finalTestSize) {
         const deficit = finalTestSize - (targetMcqCount + targetProblemCount);
         if (totalAvailableMcqsInScope > targetMcqCount) { // Can add more MCQs?
             targetMcqCount = Math.min(totalAvailableMcqsInScope, targetMcqCount + deficit);
         } else if (totalAvailableProblemsInScope > targetProblemCount) { // Can add more Problems?
             targetProblemCount = Math.min(totalAvailableProblemsInScope, targetProblemCount + deficit);
         }
         // Recalculate the other type if one was adjusted
         targetMcqCount = Math.min(totalAvailableMcqsInScope, finalTestSize - targetProblemCount);
         targetProblemCount = Math.min(totalAvailableProblemsInScope, finalTestSize - targetMcqCount);
    }

    console.log(`Final Test Config: Size=${finalTestSize}, Target MCQs=${targetMcqCount}, Target Problems=${targetProblemCount}`);

    // 4. Select Problems
    let selectedProblems = [];
    if (targetProblemCount > 0 && totalAvailableProblemsInScope > 0) {
        // Simple weighted random selection based on chapter problem counts for now
        let problemAllocation = {};
        let totalWeight = chaptersInScopeNumbers.reduce((sum, cn) => sum + (problemCache[cn]?.length || 0), 0);
        if (totalWeight > 0) {
            chaptersInScopeNumbers.forEach(cn => {
                const chapterProbCount = problemCache[cn]?.length || 0;
                problemAllocation[cn] = Math.round((chapterProbCount / totalWeight) * targetProblemCount);
            });
            // Adjust rounding errors (simple approach: add/remove from chapter with most/least diff)
            let currentAllocatedProblems = Object.values(problemAllocation).reduce((s, c) => s + c, 0);
            let diff = targetProblemCount - currentAllocatedProblems;
            while (diff !== 0) {
                 let chapterToAdjust = chaptersInScopeNumbers[Math.floor(Math.random() * chaptersInScopeNumbers.length)];
                 if (diff > 0 && (problemCache[chapterToAdjust]?.length || 0) > problemAllocation[chapterToAdjust]) {
                     problemAllocation[chapterToAdjust]++; diff--;
                 } else if (diff < 0 && problemAllocation[chapterToAdjust] > 0) {
                     problemAllocation[chapterToAdjust]--; diff++;
                 }
                 // Safety break if stuck
                 if (Math.abs(diff) > targetProblemCount * 2) break;
            }

            Object.entries(problemAllocation).forEach(([cn, count]) => {
                 if (count > 0) {
                     selectedProblems.push(...selectProblemsForExam(cn, count, currentSubject.id));
                 }
            });
        } else {
             console.warn("No problems available for selection despite target count > 0.");
             targetProblemCount = 0; // Reset target if none available
        }
        selectedProblems = selectedProblems.slice(0, targetProblemCount); // Ensure exact count
    }
    console.log(`Selected ${selectedProblems.length} problems.`);

    // 5. Select MCQs
    let selectedMcqs = [];
    let mcqAnswers = {};
    let selectedMcqMap = {}; // Store { chapNum: [qNum1, qNum2] }
    let actualTotalSelectedMcqs = 0;
    let mcqAllocationDetailsHtml = "";

    if (targetMcqCount > 0 && totalAvailableMcqsInScope > 0 && Object.keys(relevantChaptersForAllocation).length > 0) {
        const mcqAllocationCounts = allocateQuestions(relevantChaptersForAllocation, targetMcqCount);
        mcqAllocationDetailsHtml = Object.entries(mcqAllocationCounts).sort((a,b) => parseInt(a[0])-parseInt(b[0])).map(([chapNum, qCount]) => `<p>Chapter ${chapNum}: ${qCount} MCQ(s) selected.</p>`).join('');
        console.log("MCQ Allocation Counts:", mcqAllocationCounts);

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
                }
            }
        }

        if (actualTotalSelectedMcqs > 0 && subjectMarkdownContent) {
            const extracted = extractQuestionsFromMarkdown(subjectMarkdownContent, selectedMcqMap);
            selectedMcqs = extracted.questions;
            mcqAnswers = extracted.answers;
            if (selectedMcqs.length !== actualTotalSelectedMcqs) {
                 console.warn(`MCQ Selection vs Extraction mismatch: ${actualTotalSelectedMcqs} vs ${selectedMcqs.length}. Using extracted count.`);
                 actualTotalSelectedMcqs = selectedMcqs.length;
                 // Rebuild map if mismatch occurred for accuracy
                 const tempMap = {}; selectedMcqs.forEach(q => { if (!tempMap[q.chapter]) tempMap[q.chapter] = []; tempMap[q.chapter].push(q.number); });
                 Object.keys(tempMap).forEach(chapNum => tempMap[chapNum].sort((a, b) => a - b));
                 selectedMcqMap = tempMap; // Overwrite with actual extracted map
                 // Regenerate allocation details string
                 mcqAllocationDetailsHtml = Object.entries(selectedMcqMap).sort((a,b) => parseInt(a[0])-parseInt(b[0])).map(([chapNum, qList]) => `<p>Chapter ${chapNum}: ${qList.length} MCQ(s) selected.</p>`).join('');
            }
        } else if (actualTotalSelectedMcqs > 0 && !subjectMarkdownContent) {
             console.error("Error: Selected MCQs but failed to load Markdown content.");
             hideLoading(); displayContent('<p class="text-red-500 p-4">Error: Could not load question definitions from the Markdown file.</p>'); return;
        }
    }
    console.log("Selected MCQs Map:", selectedMcqMap);
    console.log(`Selected ${selectedMcqs.length} MCQs.`);

    // 6. Combine and Shuffle Problems and MCQs
    const finalExamItems = combineProblemsWithQuestions(selectedProblems, selectedMcqs, finalTestSize, mcqRatio);
    const actualTotalQuestionsGenerated = finalExamItems.length;

    if (actualTotalQuestionsGenerated === 0) { hideLoading(); displayContent(`<p class="text-yellow-500 p-4">Could not generate any questions or problems for the selected scope.</p>`); return; }

    // Build allocation details string for display
    let allocationDetailsHtml = mcqAllocationDetailsHtml;
    if (selectedProblems.length > 0) {
         const problemCounts = selectedProblems.reduce((acc, prob) => { acc[prob.chapter] = (acc[prob.chapter] || 0) + 1; return acc; }, {});
         allocationDetailsHtml += `<hr class="my-1"><p>Problems selected: ${selectedProblems.length} total</p>` + Object.entries(problemCounts).sort((a,b) => parseInt(a[0])-parseInt(b[0])).map(([chapNum, count]) => `<p class="text-xs pl-2">Chapter ${chapNum}: ${count} Problem(s)</p>`).join('');
    }

    // 7. Prepare Exam ID
    const examId = `TestGen-${currentSubject.id || 'SUBJ'}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;

    // 8. Branch based on test type
    if (testType === 'online') {
        const testDuration = currentSubject.defaultTestDurationMinutes || DEFAULT_ONLINE_TEST_DURATION_MINUTES;
        const onlineTestState = {
            examId: examId,
            questions: finalExamItems, // Combined & shuffled list
            correctAnswers: mcqAnswers, // Only MCQ answers stored here (problems marked by AI)
            userAnswers: {},
            allocation: selectedMcqMap, // Store MCQ allocation map
            problemAllocation: selectedProblems.map(p => ({ chapter: p.chapter, id: p.id })), // Store problem IDs/chapters
            startTime: Date.now(),
            timerInterval: null,
            currentQuestionIndex: 0,
            status: 'active',
            durationMinutes: testDuration, // Use subject's configured duration
            subjectId: currentSubject.id, // Store subject ID for context
            courseContext: null // Standard TestGen has no course context
        };
        setCurrentOnlineTestState(onlineTestState);

        hideLoading();
        launchOnlineTestUI();

    } else { // PDF Test
        // Generate HTML and TeX source using the combined list
        const { questionHtml, solutionHtml } = generatePdfHtml(examId, finalExamItems);
        const { questionsTex, solutionsTex } = generateTexSource(examId, finalExamItems);

        // Add exam to OLD pending list (store MCQ allocation and problem details)
        currentSubject.pending_exams = currentSubject.pending_exams || [];
        currentSubject.pending_exams.push({
            id: examId,
            allocation: selectedMcqMap, // Store MCQ map
            problemAllocation: selectedProblems.map(p => ({ chapter: p.chapter, id: p.id })), // Store problem info
            results_entered: false,
            timestamp: new Date().toISOString(),
            totalQuestions: actualTotalQuestionsGenerated, // Total combined count
        });
        await saveUserData(currentUser.uid); // Save updated appData (pending list)
        console.log("Pending PDF exam added to list and appData saved.");

        // Prepare filenames
        const safeSubjectName = (currentSubject.name || 'Subject').replace(/\s+/g, '_');
        const baseFilename = `TestGen_${safeSubjectName}_${examId.split('-').slice(2).join('_')}`; // More readable filename
        const questionsPdfFilename = `${baseFilename}_Questions`;
        const solutionsPdfFilename = `${baseFilename}_Solutions`;
        const questionsTexFilename = `${baseFilename}_Questions.tex`;
        const solutionsTexFilename = `${baseFilename}_Solutions.tex`;

        // Display download buttons
        displayContent(`
            <div class="bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300 p-4 rounded-md mb-6">
                <p class="font-medium">PDF Test Files Ready</p>
                <p>Exam ID: ${escapeHtml(examId)}</p>
                <p>Total Items: ${actualTotalQuestionsGenerated} (${selectedMcqs.length} MCQs, ${selectedProblems.length} Problems)</p>
                 <details class="text-sm mt-2 text-gray-600 dark:text-gray-400">
                     <summary class="flex items-center cursor-pointer hover:text-blue-700 dark:hover:text-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-1"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                        Allocation Details
                     </summary>
                     <div class="mt-2 p-2 bg-blue-50 dark:bg-blue-800/30 rounded">${allocationDetailsHtml || 'No details.'}</div>
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
                      Back to Exams Dashboard
                  </button>
             </div>
             <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">This exam is now pending. Enter results manually via the Exams Dashboard when ready.</p>
         `);
        setActiveSidebarLink('showTestGenerationDashboard', 'testgen-dropdown-content');

         // Add event listeners for PDF downloads
         document.getElementById('download-pdf-q')?.addEventListener('click', () => generateAndDownloadPdfWithMathJax(questionHtml, questionsPdfFilename));
         document.getElementById('download-pdf-s')?.addEventListener('click', () => generateAndDownloadPdfWithMathJax(solutionHtml, solutionsPdfFilename));

         hideLoading();
     }
}

// --- END OF FILE ui_test_generation.js ---