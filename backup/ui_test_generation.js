import { currentSubject, currentUser, data } from './state.js'; // Removed markdownContentCache
import { displayContent } from './ui_core.js';
import { allocateQuestions, selectNewQuestionsAndUpdate } from './test_logic.js';
import { extractQuestionsFromMarkdown } from './markdown_parser.js';
import { generateAndDownloadPdfWithMathJax, generatePdfHtml, generateTexSource, downloadTexFile } from './ui_pdf_generation.js';
import { launchOnlineTestUI, setCurrentOnlineTestState } from './ui_online_test.js';
import { saveUserData } from './firebase_firestore.js';
import { showLoading, hideLoading } from './utils.js';
import { showManageSubjects } from './ui_subjects.js';
import { showManageStudiedChapters } from './ui_studied_chapters.js';
import { showExamsDashboard } from './ui_exams_dashboard.js';

// --- Helper Function ---
/**
 * Fetches the markdown content for the current subject.
 * Returns the markdown text content or null if fetch fails.
 */
async function getCurrentSubjectMarkdown() {
    if (!currentSubject) return null;
    // Use subject.fileName, default to chapters.md if missing or for specific subject name
    const fileName = currentSubject.fileName || (currentSubject.name === "Fundamentals of Physics" ? "chapters.md" : `${currentSubject.name}.md`);
    // Basic sanitization
    const safeFileName = fileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    const url = `${safeFileName}?t=${new Date().getTime()}`; // Add cache buster

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
    // ... (code remains the same) ...
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
}

export function promptChapterSelectionForTest() {
    // ... (code remains the same) ...
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
}

export function getSelectedChaptersAndPromptTestType() {
    // ... (code remains the same) ...
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
    // ... (code remains the same) ...
     if (!currentSubject || !currentSubject.chapters) {
         displayContent('<p class="text-red-500 p-4">Error: Subject data is missing.</p>');
         return;
     }

    let chapterScopeDescription = "";
    let relevantChapters = {};
    let chapterCount = 0;
    let totalAvailableInScope = 0;

    if (mode === 'studied') {
        const studied = currentSubject.studied_chapters || [];
        if (studied.length === 0) {
            displayContent('<p class="text-red-500 p-4">No chapters marked as studied.</p><button onclick="window.showManageStudiedChapters()" class="btn-secondary mt-4">Manage Studied Chapters</button>');
            return;
        }
        studied.forEach(chapNum => {
            const chap = currentSubject.chapters[chapNum];
            if (chap && chap.total_questions > 0) {
                relevantChapters[chapNum] = chap;
                totalAvailableInScope += chap.available_questions?.length || 0;
            }
        });
        chapterCount = Object.keys(relevantChapters).length;
        if (chapterCount === 0) {
             displayContent('<p class="text-yellow-500 p-4">None of your studied chapters have questions loaded.</p>');
             return;
        }
        chapterScopeDescription = `Based on your ${chapterCount} studied chapter(s) (${totalAvailableInScope} questions available).`;
    } else if (mode === 'specific' && selectedChapters) {
        selectedChapters.forEach(chapNum => {
             const chap = currentSubject.chapters[chapNum];
            if (chap && chap.total_questions > 0) {
                relevantChapters[chapNum] = chap;
                 totalAvailableInScope += chap.available_questions?.length || 0;
            }
        });
        chapterCount = Object.keys(relevantChapters).length;
         if (chapterCount === 0) {
              displayContent('<p class="text-yellow-500 p-4">None of the selected chapters have questions loaded.</p>');
              return;
         }
        chapterScopeDescription = `Based on the ${chapterCount} selected chapter(s) (${totalAvailableInScope} questions available).`;
    } else {
         displayContent('<p class="text-red-500 p-4">Invalid test mode or chapter selection.</p>');
         return;
    }

     if (totalAvailableInScope === 0) {
        displayContent(`<p class="text-yellow-500 p-4">The chapters in scope have no available questions currently.</p><button onclick="window.showTestGenerationDashboard()" class="btn-secondary mt-2">Back</button>`);
        return;
     }

    const maxTestSize = currentSubject.max_questions_per_test || 42;
    const actualTestSize = Math.min(maxTestSize, totalAvailableInScope);

    const html = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4">
            <h2 class="text-xl font-semibold mb-4 text-primary-600 dark:text-primary-400">Choose Test Format</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-6">
                ${chapterScopeDescription}<br>
                Generating a test with <strong>${actualTestSize} questions</strong> (Max: ${maxTestSize}, Available: ${totalAvailableInScope}).
            </p>
            <div class="space-y-3">
                 <button onclick='window.startTestGeneration(${JSON.stringify(mode)}, ${JSON.stringify(selectedChapters)}, "online")' class="w-full btn-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                    Online Test (MCQ Only)
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

    // Fetch the correct Markdown content for the current subject
    const subjectMarkdownContent = await getCurrentSubjectMarkdown();
    if (!subjectMarkdownContent) {
        hideLoading();
        // Error message already shown by getCurrentSubjectMarkdown if fetch failed
        showTestGenerationDashboard(); // Go back
        return;
    }

    let relevantChaptersForAllocation = {};
    let chapterScopeDescription = "";
    let totalAvailableBeforeAllocation = 0;

    // 1. Determine scope (code remains the same)
    if (mode === 'studied') {
        const studied = currentSubject.studied_chapters || [];
        if (studied.length === 0) { /* ... error handling ... */ hideLoading(); displayContent(/*...*/); return; }
        studied.forEach(chapNum => {
            const chap = currentSubject.chapters[chapNum];
            if (chap && chap.total_questions > 0) {
                relevantChaptersForAllocation[chapNum] = chap;
                totalAvailableBeforeAllocation += chap.available_questions?.length || 0;
            }
        });
        const chapterCount = Object.keys(relevantChaptersForAllocation).length;
        if (chapterCount === 0) { /* ... error handling ... */ hideLoading(); displayContent(/*...*/); return; }
        chapterScopeDescription = `Based on your ${chapterCount} studied chapter(s)`;
    } else if (mode === 'specific' && selectedChapters) {
        selectedChapters.forEach(chapNum => {
             const chap = currentSubject.chapters[chapNum];
            if (chap && chap.total_questions > 0) {
                relevantChaptersForAllocation[chapNum] = chap;
                 totalAvailableBeforeAllocation += chap.available_questions?.length || 0;
            }
        });
        const chapterCount = Object.keys(relevantChaptersForAllocation).length;
         if (chapterCount === 0) { /* ... error handling ... */ hideLoading(); displayContent(/*...*/); return; }
        chapterScopeDescription = `Based on the ${chapterCount} selected chapter(s)`;
    } else { /* ... error handling ... */ hideLoading(); displayContent(/*...*/); return; }

    // 2. Check availability (code remains the same)
     if (totalAvailableBeforeAllocation === 0) { /* ... error handling ... */ hideLoading(); displayContent(/*...*/); return; }

     // 3. Determine test size (code remains the same)
     const maxQuestionsForTest = currentSubject.max_questions_per_test || 42;
     const totalQuestionsForTest = Math.min(maxQuestionsForTest, totalAvailableBeforeAllocation);
      if (totalQuestionsForTest <= 0) { /* ... error handling ... */ hideLoading(); displayContent(/*...*/); return; }
      console.log(`Generating test: Scope=${chapterScopeDescription}, Total Available=${totalAvailableBeforeAllocation}, Target Size=${totalQuestionsForTest}`);

     // 4. Allocate questions (code remains the same)
     const allocationCounts = allocateQuestions(relevantChaptersForAllocation, totalQuestionsForTest);
     const totalAllocatedCount = Object.values(allocationCounts).reduce((a, b) => a + b, 0);
     if (totalAllocatedCount === 0) { /* ... error handling ... */ hideLoading(); displayContent(/*...*/); return; }
     console.log("Allocation Counts:", allocationCounts);

     // 5. Select questions (code remains the same)
     const selectedQuestionsMap = {};
     let allocationDetailsHtml = "";
     let actualTotalSelected = 0;
     for (const chapNum in allocationCounts) {
         const n = allocationCounts[chapNum];
         if (n > 0) {
              const chap = currentSubject.chapters[chapNum];
              if (chap) {
                 const questionsSelected = selectNewQuestionsAndUpdate(chap, n);
                 if (questionsSelected.length > 0) {
                     selectedQuestionsMap[chapNum] = questionsSelected;
                     actualTotalSelected += questionsSelected.length;
                     allocationDetailsHtml += `<p>Chapter ${chapNum}: ${questionsSelected.length} questions selected (requested ${n}).</p>`;
                 } else { /* ... error handling ... */ }
             } else { /* ... error handling ... */ }
         }
     }
     if (actualTotalSelected === 0) { /* ... error handling ... */ hideLoading(); displayContent(/*...*/); return; }
     if (actualTotalSelected < totalAllocatedCount) { console.warn(`Requested ${totalAllocatedCount}, but only selected ${actualTotalSelected}.`); }
     console.log("Selected Questions Map:", selectedQuestionsMap);

     // 6. Prepare Exam ID (code remains the same)
     const examId = `Exam-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;

     // 7. Extract Questions from the fetched Markdown
     const { questions: extractedQuestionsData, answers } = extractQuestionsFromMarkdown(subjectMarkdownContent, selectedQuestionsMap);

     // Sanity check & Correction (code remains the same)
     if (extractedQuestionsData.length !== actualTotalSelected) {
          console.warn(`Selection vs Extraction mismatch: ${actualTotalSelected} vs ${extractedQuestionsData.length}. Using extracted count (${extractedQuestionsData.length}).`);
          actualTotalSelected = extractedQuestionsData.length;
          if (actualTotalSelected === 0) { /* ... error handling ... */ hideLoading(); displayContent(/*...*/); return; }
          // Rebuild map and details
          const tempMap = {}; extractedQuestionsData.forEach(q => { if (!tempMap[q.chapter]) tempMap[q.chapter] = []; tempMap[q.chapter].push(q.number); });
          Object.keys(tempMap).forEach(chapNum => tempMap[chapNum].sort((a, b) => a - b));
          Object.assign(selectedQuestionsMap, tempMap);
          allocationDetailsHtml = Object.entries(selectedQuestionsMap).sort((a,b) => parseInt(a[0])-parseInt(b[0])).map(([chapNum, qList]) => `<p>Chapter ${chapNum}: ${qList.length} questions selected.</p>`).join('');
     }

     // *** NEW: Shuffle the extracted questions ***
     function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // Swap elements
        }
     }
     let finalQuestionList = [...extractedQuestionsData]; // Clone before shuffling
     shuffleArray(finalQuestionList);
     console.log("Question order shuffled.");

     // 8. Branch based on test type
     if (testType === 'online') {
         // Validate all questions are suitable for online (code remains the same)
         const allMcq = finalQuestionList.every(q => answers[q.id] && q.options && q.options.length > 0);
         if (!allMcq) { /* ... error handling ... */ hideLoading(); displayContent(/*...*/); return; }

         // Prepare online test state (use shuffled list)
         const onlineTestState = {
             examId: examId,
             questions: finalQuestionList, // Use the shuffled list
             correctAnswers: answers,
             userAnswers: {},
             allocation: selectedQuestionsMap,
             startTime: Date.now(),
             timerInterval: null,
             currentQuestionIndex: 0,
             status: 'active'
         };
         setCurrentOnlineTestState(onlineTestState);

         hideLoading();
         launchOnlineTestUI();

     } else { // PDF Test
         // Generate HTML and TeX source (use shuffled list)
         const { questionHtml, solutionHtml } = generatePdfHtml(examId, finalQuestionList); // Pass shuffled list
         const { questionsTex, solutionsTex } = generateTexSource(examId, finalQuestionList); // Pass shuffled list

         // Add exam to pending list (code remains the same)
         currentSubject.pending_exams = currentSubject.pending_exams || [];
         currentSubject.pending_exams.push({
             id: examId,
             allocation: selectedQuestionsMap,
             results_entered: false,
             timestamp: new Date().toISOString(),
             totalQuestions: actualTotalSelected,
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
                <p>Total Questions: ${actualTotalSelected}</p>
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