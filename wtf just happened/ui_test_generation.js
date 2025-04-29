// --- START OF FILE ui_test_generation.js ---

import { currentSubject, currentUser, data } from './state.js';
import { displayContent } from './ui_core.js';
// CORRECTED: Import correct allocation/selection functions and problem selection
import { allocateQuestions, selectNewQuestionsAndUpdate, selectNewProblemsAndUpdate } from './test_logic.js';
// CORRECTED: Import the renamed extraction function
import { extractItemsFromMarkdown } from './markdown_parser.js';
// CORRECTED: Ensure PDF/TeX functions are imported
import { generateAndDownloadPdfWithMathJax, generatePdfHtml, generateTexSource, downloadTexFile } from './ui_pdf_generation.js';
import { launchOnlineTestUI, setCurrentOnlineTestState } from './ui_online_test.js';
import { saveUserData } from './firebase_firestore.js';
import { showLoading, hideLoading } from './utils.js';
import { showManageSubjects } from './ui_subjects.js';
import { showManageStudiedChapters } from './ui_studied_chapters.js';
import { showExamsDashboard } from './ui_exams_dashboard.js';

// --- Helper Function ---
/**
 * Fetches the markdown content for the current subject (MCQ or Problems).
 * Returns the markdown text content or null if fetch fails.
 */
async function getCurrentSubjectMarkdown(type = 'mcq') {
    if (!currentSubject) return null;
    let fileName;
    if (type === 'problem') {
        fileName = "ChaptersProblems.md"; // Specific filename for problems
    } else {
        fileName = currentSubject.fileName || (currentSubject.name === "Fundamentals of Physics" ? "chapters.md" : `${currentSubject.name}.md`);
    }
    // Basic sanitization
    const safeFileName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    const url = `${safeFileName}?t=${new Date().getTime()}`; // Add cache buster

    console.log(`Fetching ${type.toUpperCase()} Markdown for current subject from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`${type.toUpperCase()} Markdown file not found for current subject at ${url}.`);
                return null;
            }
            throw new Error(`HTTP error fetching ${type} markdown! status: ${response.status} for ${url}`);
        }
        const mdContent = await response.text();
        console.log(`${type.toUpperCase()} Markdown fetched successfully for ${currentSubject.name}.`);
        return mdContent;
    } catch (error) {
        console.error(`Error fetching ${type} Markdown for ${currentSubject.name} (${url}):`, error);
        // Only alert if it's the primary MCQ file missing, as problems are optional
        if (type === 'mcq') {
            alert(`Warning: Could not load chapter definitions (MCQs) for subject "${currentSubject.name}". Tests cannot be generated.`);
        }
        return null;
    }
}

// --- Test Generation UI Flow ---

export function showTestGenerationDashboard() {
    // ... (UI logic remains the same) ...
    if (!currentSubject) {
        displayContent('<p class="text-yellow-500 p-4">Please select or add a subject first.</p><button onclick="window.showManageSubjects()" class="btn-secondary mt-2">Manage Subjects</button>');
        return;
    }
     if (!currentSubject.chapters || Object.keys(currentSubject.chapters).length === 0) {
          displayContent(`<p class="text-yellow-500 p-4">The current subject '${currentSubject.name}' has no chapters loaded. Check subject setup or associated Markdown file (${currentSubject.fileName || 'Not Specified'}).</p><button onclick="window.initializeApp()" class="btn-secondary mt-2">Reload Data</button>`);
          return;
      }

    const html = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4">
            <h2 class="text-xl font-semibold mb-4 text-primary-600 dark:text-primary-400">Generate New Test</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-6">Choose the scope of your test for subject: <strong>${currentSubject.name || 'Unnamed Subject'}</strong></p>
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
    // No specific sidebar link for this dashboard, it's often the default view
}

export function promptChapterSelectionForTest() {
    // ... (UI logic remains the same, but shows MCQ and Problem counts) ...
    if (!currentSubject || !currentSubject.chapters) {
         showTestGenerationDashboard(); // Go back if data is missing
         return;
     }
    const chapters = currentSubject.chapters;
    // Filter chapters that actually have questions OR problems defined
    const chapterNumbers = Object.keys(chapters)
                           .filter(num => chapters[num] && ((chapters[num].total_questions > 0) || (chapters[num].total_problems > 0)))
                           .sort((a, b) => parseInt(a) - parseInt(b));

    if (chapterNumbers.length === 0) {
        displayContent('<p class="text-red-500 p-4">No chapters with questions or problems available in this subject to select from.</p><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2">Back</button>');
        return;
    }

    let chapterOptionsHtml = chapterNumbers.map(num => {
        const chap = chapters[num];
        const availableMCQCount = chap.available_questions?.length || 0;
        const totalMCQCount = chap.total_questions || 0;
        const availableProbCount = chap.available_problems?.length || 0;
        const totalProbCount = chap.total_problems || 0;
        const studied = currentSubject.studied_chapters?.includes(num);
        return `
        <div class="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600">
            <input id="test-chap-${num}" type="checkbox" value="${num}" class="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600">
            <label for="test-chap-${num}" class="ml-2 block text-sm text-gray-900 dark:text-gray-300 cursor-pointer flex-grow">
                Chapter ${num}
                <span class="text-xs text-gray-500 dark:text-gray-400">
                    (MCQ: ${availableMCQCount}/${totalMCQCount} avail | Prob: ${availableProbCount}/${totalProbCount} avail)
                </span>
                 ${studied ? '<span class="text-xs text-green-600 dark:text-green-400">(Studied)</span>' : ''}
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
}

export function getSelectedChaptersAndPromptTestType() {
    // ... (remains the same) ...
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
    // ... (UI logic remains the same, but calculates total available items) ...
     if (!currentSubject || !currentSubject.chapters) {
         displayContent('<p class="text-red-500 p-4">Error: Subject data is missing.</p>');
         return;
     }

    let chapterScopeDescription = "";
    let relevantChapters = {};
    let chapterCount = 0;
    let totalAvailableInScope = 0; // Total MCQs + Problems

    if (mode === 'studied') {
        const studied = currentSubject.studied_chapters || [];
        if (studied.length === 0) {
            displayContent('<p class="text-red-500 p-4">No chapters marked as studied.</p><button onclick="window.showManageStudiedChapters()" class="btn-secondary mt-4">Manage Studied Chapters</button>');
            return;
        }
        studied.forEach(chapNum => {
            const chap = currentSubject.chapters[chapNum];
            // Check for existence and either questions or problems
            if (chap && ((chap.total_questions > 0) || (chap.total_problems > 0))) {
                relevantChapters[chapNum] = chap;
                totalAvailableInScope += (chap.available_questions?.length || 0) + (chap.available_problems?.length || 0);
            }
        });
        chapterCount = Object.keys(relevantChapters).length;
        if (chapterCount === 0) {
             displayContent('<p class="text-yellow-500 p-4">None of your studied chapters have questions or problems loaded.</p>');
             return;
        }
        chapterScopeDescription = `Based on your ${chapterCount} studied chapter(s) (${totalAvailableInScope} items available).`;
    } else if (mode === 'specific' && selectedChapters) {
        selectedChapters.forEach(chapNum => {
             const chap = currentSubject.chapters[chapNum];
            if (chap && ((chap.total_questions > 0) || (chap.total_problems > 0))) {
                relevantChapters[chapNum] = chap;
                 totalAvailableInScope += (chap.available_questions?.length || 0) + (chap.available_problems?.length || 0);
            }
        });
        chapterCount = Object.keys(relevantChapters).length;
         if (chapterCount === 0) {
              displayContent('<p class="text-yellow-500 p-4">None of the selected chapters have questions or problems loaded.</p>');
              return;
         }
        chapterScopeDescription = `Based on the ${chapterCount} selected chapter(s) (${totalAvailableInScope} items available).`;
    } else {
         displayContent('<p class="text-red-500 p-4">Invalid test mode or chapter selection.</p>');
         return;
    }

     if (totalAvailableInScope === 0) {
        displayContent(`<p class="text-yellow-500 p-4">The chapters in scope have no available questions or problems currently.</p><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2">Back</button>`);
        return;
     }

    const maxTestSize = currentSubject.max_questions_per_test || 42; // This now refers to total items
    const actualTestSize = Math.min(maxTestSize, totalAvailableInScope);

    const html = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4">
            <h2 class="text-xl font-semibold mb-4 text-primary-600 dark:text-primary-400">Choose Test Format</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-6">
                ${chapterScopeDescription}<br>
                Generating a test with <strong>${actualTestSize} items</strong> (MCQs & Problems, Max: ${maxTestSize}, Available: ${totalAvailableInScope}).
            </p>
            <div class="space-y-3">
                 <button onclick='window.startTestGeneration(${JSON.stringify(mode)}, ${JSON.stringify(selectedChapters)}, "online")' class="w-full btn-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                    Online Test (MCQ & Problems)
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
}

export async function startTestGeneration(mode, selectedChapters, testType) {
    if (!currentUser || !currentSubject || !data || !currentSubject.chapters) {
         alert("User, subject, or chapter data not loaded.");
         hideLoading();
         return;
     }
    showLoading(`Generating ${testType === 'online' ? 'Online Test' : 'Test Files'}...`);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Fetch the correct Markdown content for the current subject (MCQ and Problems)
    const subjectMcqMarkdown = await getCurrentSubjectMarkdown('mcq');
    const subjectProblemsMarkdown = await getCurrentSubjectMarkdown('problem'); // Fetch problems MD

    // MCQ content is essential, problems are optional
    if (!subjectMcqMarkdown && !subjectProblemsMarkdown) {
        hideLoading();
        // Error message already shown by getCurrentSubjectMarkdown if fetch failed
        alert("Failed to load both MCQ and Problem definitions. Cannot generate test.");
        showTestGenerationDashboard(); // Go back
        return;
    }
     if (!subjectMcqMarkdown) {
          console.warn("MCQ Markdown content missing. Test will only contain problems if available.");
          // Proceed if problems exist, otherwise error below
     }
      if (!subjectProblemsMarkdown) {
          console.warn("Problems Markdown content missing. Test will only contain MCQs if available.");
          // Proceed if MCQs exist, otherwise error below
     }

    let relevantChaptersForAllocation = {};
    let chapterScopeDescription = "";
    let totalAvailableInScope = 0;

    // 1. Determine scope (code remains the same, but uses total items)
    if (mode === 'studied') { /* ... */ }
    else if (mode === 'specific' && selectedChapters) { /* ... */ }
    else { /* ... error handling ... */ }
     // Calculation of totalAvailableInScope now includes problems
     // ... (scope calculation logic remains the same conceptually) ...
     if (mode === 'studied') {
        const studied = currentSubject.studied_chapters || [];
        if (studied.length === 0) { hideLoading(); displayContent('<p class="text-red-500 p-4">No chapters marked as studied.</p>'); return; }
        studied.forEach(chapNum => {
            const chap = currentSubject.chapters[chapNum];
            if (chap && ((chap.available_questions?.length || 0) > 0 || (chap.available_problems?.length || 0) > 0)) {
                relevantChaptersForAllocation[chapNum] = chap;
                totalAvailableInScope += (chap.available_questions?.length || 0) + (chap.available_problems?.length || 0);
            }
        });
        const chapterCount = Object.keys(relevantChaptersForAllocation).length;
        if (chapterCount === 0) { hideLoading(); displayContent('<p class="text-yellow-500 p-4">None of your studied chapters have available items.</p>'); return; }
        chapterScopeDescription = `Based on your ${chapterCount} studied chapter(s)`;
    } else if (mode === 'specific' && selectedChapters) {
        selectedChapters.forEach(chapNum => {
             const chap = currentSubject.chapters[chapNum];
            if (chap && ((chap.available_questions?.length || 0) > 0 || (chap.available_problems?.length || 0) > 0)) {
                relevantChaptersForAllocation[chapNum] = chap;
                 totalAvailableInScope += (chap.available_questions?.length || 0) + (chap.available_problems?.length || 0);
            }
        });
        const chapterCount = Object.keys(relevantChaptersForAllocation).length;
         if (chapterCount === 0) { hideLoading(); displayContent('<p class="text-yellow-500 p-4">None of the selected chapters have available items.</p>'); return; }
        chapterScopeDescription = `Based on the ${chapterCount} selected chapter(s)`;
    } else { hideLoading(); displayContent('<p class="text-red-500 p-4">Invalid test mode or chapter selection.</p>'); return; }


    // 2. Check availability (code remains the same)
     if (totalAvailableInScope === 0) { hideLoading(); displayContent(`<p class="text-yellow-500 p-4">The chapters in scope have no available items currently.</p>`); return; }

     // 3. Determine test size (code remains the same)
     const maxItemsForTest = currentSubject.max_questions_per_test || 42;
     const totalItemsForTest = Math.min(maxItemsForTest, totalAvailableInScope);
      if (totalItemsForTest <= 0) { hideLoading(); displayContent(`<p class="text-yellow-500 p-4">Calculated test size is zero or less.</p>`); return; }
      console.log(`Generating test: Scope=${chapterScopeDescription}, Total Available=${totalAvailableInScope}, Target Size=${totalItemsForTest}`);

     // 4. Allocate questions (Pass desired problem ratio, e.g., 0.5)
     const problemRatio = 0.5; // Target 50% problems
     const allocationResult = allocateQuestions(relevantChaptersForAllocation, totalItemsForTest, problemRatio);
     const totalAllocatedCount = Object.values(allocationResult).reduce((a, b) => a + (b.questions || 0) + (b.problems || 0), 0);
     if (totalAllocatedCount === 0) { hideLoading(); displayContent('<p class="text-red-500 p-4">Failed to allocate any questions or problems. Check availability.</p>'); return; }
     console.log("Allocation Result:", allocationResult);

     // 5. Select items (MCQs and Problems separately)
     const selectedItemsMapForExtraction = {}; // { chapNum: { questions: [...], problems: [...] } }
     let allocationDetailsHtml = "";
     let actualTotalSelectedMCQ = 0;
     let actualTotalSelectedProblems = 0;

     for (const chapNum in allocationResult) {
         const alloc = allocationResult[chapNum];
         selectedItemsMapForExtraction[chapNum] = { questions: [], problems: [] };
         let chapterDetailHtml = '';

         if (alloc.questions > 0) {
              const chap = currentSubject.chapters[chapNum];
              if (chap) {
                 const questionsSelected = selectNewQuestionsAndUpdate(chap, alloc.questions);
                 if (questionsSelected.length > 0) {
                     selectedItemsMapForExtraction[chapNum].questions = questionsSelected;
                     actualTotalSelectedMCQ += questionsSelected.length;
                     chapterDetailHtml += `${questionsSelected.length} MCQ(s)`;
                 } else { console.warn(`Ch ${chapNum}: Failed to select ${alloc.questions} MCQs.`); }
             } else { console.error(`Ch ${chapNum}: Chapter data missing during MCQ selection.`); }
         }

         if (alloc.problems > 0) {
              const chap = currentSubject.chapters[chapNum];
              if (chap) {
                 const problemsSelected = selectNewProblemsAndUpdate(chap, alloc.problems);
                 if (problemsSelected.length > 0) {
                     selectedItemsMapForExtraction[chapNum].problems = problemsSelected;
                     actualTotalSelectedProblems += problemsSelected.length;
                     if (chapterDetailHtml) chapterDetailHtml += ', ';
                     chapterDetailHtml += `${problemsSelected.length} Problem(s)`;
                 } else { console.warn(`Ch ${chapNum}: Failed to select ${alloc.problems} Problems.`); }
             } else { console.error(`Ch ${chapNum}: Chapter data missing during Problem selection.`); }
         }

         if (chapterDetailHtml) {
             allocationDetailsHtml += `<p>Chapter ${chapNum}: ${chapterDetailHtml} selected.</p>`;
         }
     }
     const actualTotalSelectedItems = actualTotalSelectedMCQ + actualTotalSelectedProblems;
     if (actualTotalSelectedItems === 0) { hideLoading(); displayContent('<p class="text-red-500 p-4">Failed to select any items after allocation.</p>'); return; }
     if (actualTotalSelectedItems < totalAllocatedCount) { console.warn(`Requested ${totalAllocatedCount}, but only selected ${actualTotalSelectedItems}.`); }
     console.log("Selected Items Map for Extraction:", selectedItemsMapForExtraction);

     // 6. Prepare Exam ID (code remains the same)
     const examId = `Exam-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;

     // 7. Extract Items from the fetched Markdown files
     const { questions: extractedMCQs, problems: extractedProblems, answers: mcqAnswers } =
         extractItemsFromMarkdown(subjectMcqMarkdown, subjectProblemsMarkdown, selectedItemsMapForExtraction);

     // Sanity check & Correction (compare extracted counts with selected counts)
     if (extractedMCQs.length !== actualTotalSelectedMCQ || extractedProblems.length !== actualTotalSelectedProblems) {
          console.warn(`Selection vs Extraction mismatch: MCQs(${actualTotalSelectedMCQ} vs ${extractedMCQs.length}), Problems(${actualTotalSelectedProblems} vs ${extractedProblems.length}). Using extracted counts.`);
          actualTotalSelectedMCQ = extractedMCQs.length;
          actualTotalSelectedProblems = extractedProblems.length;
          actualTotalSelectedItems = actualTotalSelectedMCQ + actualTotalSelectedProblems;
          if (actualTotalSelectedItems === 0) { hideLoading(); displayContent('<p class="text-red-500 p-4">Extraction resulted in zero items.</p>'); return; }
          // Rebuild allocation details based on extraction
          const tempMap = {};
          extractedMCQs.forEach(q => { if (!tempMap[q.chapter]) tempMap[q.chapter] = {q:0,p:0}; tempMap[q.chapter].q++; });
          extractedProblems.forEach(p => { if (!tempMap[p.chapter]) tempMap[p.chapter] = {q:0,p:0}; tempMap[p.chapter].p++; });
          allocationDetailsHtml = Object.entries(tempMap).sort((a,b) => parseInt(a[0])-parseInt(b[0])).map(([chapNum, counts]) => `<p>Chapter ${chapNum}: ${counts.q} MCQ(s), ${counts.p} Problem(s) selected.</p>`).join('');
     }

     // *** Combine and Shuffle the extracted items ***
     let finalItemList = [...extractedMCQs, ...extractedProblems];
     function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } }
     shuffleArray(finalItemList);
     console.log("Final item list shuffled.");

     // 8. Branch based on test type
     if (testType === 'online') {
         // Prepare online test state (use shuffled combined list)
         const onlineTestState = {
             examId: examId,
             items: finalItemList, // Pass combined list
             correctAnswers: mcqAnswers, // Pass only MCQ answers
             userAnswers: {},
             allocation: allocationResult, // Store original allocation request
             startTime: Date.now(),
             timerInterval: null,
             currentQuestionIndex: 0,
             status: 'active',
             // Duration might depend on item types? For now, base on total items.
             durationMinutes: Math.max(30, Math.min(180, actualTotalSelectedItems * 2.5)) // e.g., 2.5 min per item
         };
         setCurrentOnlineTestState(onlineTestState);

         hideLoading();
         launchOnlineTestUI();

     } else { // PDF Test
         // Generate HTML and TeX source (pass shuffled combined list)
         const { questionHtml, solutionHtml } = generatePdfHtml(examId, finalItemList); // Needs update in ui_pdf_generation
         const { questionsTex, solutionsTex } = generateTexSource(examId, finalItemList); // Needs update in ui_pdf_generation

         // Add exam to pending list (store allocationResult)
         currentSubject.pending_exams = currentSubject.pending_exams || [];
         currentSubject.pending_exams.push({
             id: examId,
             allocation: allocationResult, // Store the {questions: c, problems: p} breakdown
             results_entered: false,
             timestamp: new Date().toISOString(),
             totalQuestions: actualTotalSelectedItems, // Use total selected items count
         });
         await saveUserData(currentUser.uid);
         console.log("Pending PDF exam added to list and data saved.");

         // Prepare filenames (code remains the same)
         const questionsPdfFilename = `Exam_${examId.replace('Exam-', '')}`;
         const solutionsPdfFilename = `SolutionManual_${examId.replace('Exam-', '')}`;
         const questionsTexFilename = `Exam_${examId.replace('Exam-', '')}.tex`;
         const solutionsTexFilename = `SolutionManual_${examId.replace('Exam-', '')}.tex`;

         // Display download buttons (code remains the same)
         displayContent(`
            <div class="bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300 p-4 rounded-md mb-6">
                <p class="font-medium">PDF Test Files Ready</p>
                <p>Exam ID: ${examId}</p>
                <p>Total Items: ${actualTotalSelectedItems}</p>
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
                 <button onclick="window.downloadTexFileWrapper('${questionsTexFilename}', \`${btoa(unescape(encodeURIComponent(questionsTex)))}\`)" class="w-full btn-secondary">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                     Download Questions .tex
                 </button>
                  <button onclick="window.downloadTexFileWrapper('${solutionsTexFilename}', \`${btoa(unescape(encodeURIComponent(solutionsTex)))}\`)" class="w-full btn-secondary">
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

         // Add event listeners (code remains the same)
         document.getElementById('download-pdf-q')?.addEventListener('click', () => generateAndDownloadPdfWithMathJax(questionHtml, questionsPdfFilename));
         document.getElementById('download-pdf-s')?.addEventListener('click', () => generateAndDownloadPdfWithMathJax(solutionHtml, solutionsPdfFilename));

         hideLoading();
     }
}
// --- END OF FILE ui_test_generation.js ---