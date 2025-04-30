// --- START OF FILE test_logic.js ---

import { currentSubject } from './state.js'; // Import currentSubject state
import { showLoading, hideLoading } from './utils.js';
import { DEFAULT_MCQ_PROBLEM_RATIO } from './config.js'; // Import default ratio

// --- Difficulty & Allocation ---

export function calculateDifficulty(chap) {
    if (!chap) return 100; // Default difficulty if no chapter data
    const attempted = Math.max(chap.total_attempted || 0, 0);
    const wrong = Math.min(Math.max(chap.total_wrong || 0, 0), attempted); // Ensure wrong <= attempted

    if (attempted > 0) {
        let error_rate = wrong / attempted;
        // Base difficulty on error rate, with a minimum floor (e.g., 10%)
        let base_difficulty = Math.max(error_rate * 100, 10);

        // Factor in recent mistakes (consecutive wrong answers in tests)
        let consecutive_mistakes = 0;
        if (chap.mistake_history && chap.mistake_history.length > 0) {
            // Count consecutive non-zero entries (representing tests with mistakes) from the end
            for (let i = chap.mistake_history.length - 1; i >= 0; i--) {
                if (chap.mistake_history[i] > 0) {
                    consecutive_mistakes++;
                } else {
                    break; // Stop counting once a test with 0 mistakes is found
                }
            }
        }
        // Add bonus difficulty for consecutive mistakes
        let difficultyScore = base_difficulty + (consecutive_mistakes * 20); // Adjust multiplier as needed

        // Cap the maximum difficulty (e.g., 150%)
        return Math.min(difficultyScore, 150);
    }
    // Default difficulty if never attempted
    return 100;
}

// --- Problem Parsing and Selection ---

// MODIFIED: Cache now per subject ID
const subjectProblemCache = new Map();

/**
 * Parses the Problems Markdown file specific to the given subject and caches the result.
 * Assumes format like `SubjectName_problems.md`.
 * @param {object} subject - The subject object (must contain `id` and `name` or `fileName`).
 * @returns {Promise<object>} A promise that resolves to an object where keys are chapter numbers
 *                           and values are arrays of problem objects for that subject. Returns empty object on error.
 */
export async function parseChapterProblems(subject = currentSubject) {
    if (!subject || !subject.id) {
        console.error("parseChapterProblems: Invalid or missing subject provided.");
        return {};
    }
    const subjectId = subject.id;

    if (subjectProblemCache.has(subjectId)) {
        // console.log(`Using cached problems for subject: ${subjectId}`);
        return subjectProblemCache.get(subjectId);
    }

    // Determine filename (convention: use subject.fileName if exists, else generate)
    let problemsFileName;
    if (subject.fileName && subject.fileName.includes('_problems.md')) {
         problemsFileName = subject.fileName; // Assume filename already specified correctly
    } else if (subject.fileName) {
         // Try replacing .md with _problems.md
         problemsFileName = subject.fileName.replace(/\.md$/i, '_problems.md');
    } else if (subject.name) {
         // Generate from name
         problemsFileName = `${subject.name}_problems.md`.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
    } else {
        console.error(`Cannot determine problems filename for subject ID ${subjectId}. Missing name and fileName.`);
        subjectProblemCache.set(subjectId, {});
        return {};
    }


    console.log(`Parsing problems for subject "${subject.name || subjectId}" from file: ${problemsFileName}...`);

    try {
        // Assume problems files are relative to index.html
        const response = await fetch(`./${problemsFileName}?t=${Date.now()}`); // Cache bust
        if (!response.ok) {
             if (response.status === 404) {
                console.warn(`Problem file "${problemsFileName}" not found for subject ${subject.name}. No problems will be available.`);
                 subjectProblemCache.set(subjectId, {}); // Cache empty object if file not found
                return {};
             }
             throw new Error(`Failed to fetch problems file "${problemsFileName}": ${response.status}`);
        }
        const content = await response.text();

        const problems = {};
        let currentChapter = null;
        let currentProblem = null;
        let problemCounter = 0; // Unique ID counter *per subject file parse*

        // Split content into lines and process
        const lines = content.split('\n');
        for (let line of lines) {
            const trimmedLine = line.trim();

            // Chapter header (Assuming format like # Chapter 1: ...)
            const chapterMatch = trimmedLine.match(/^#\s+Chapter\s+(\d+):?/i);
            if (chapterMatch) {
                // Finalize previous problem if any
                if (currentProblem && currentChapter !== null) { // Check currentChapter is not null
                    if (!problems[currentChapter]) problems[currentChapter] = [];
                    problems[currentChapter].push(currentProblem);
                }
                currentChapter = parseInt(chapterMatch[1]);
                currentProblem = null; // Reset problem for new chapter
                if (!problems[currentChapter]) {
                    problems[currentChapter] = [];
                }
                continue; // Move to next line
            }

            // Problem marker (e.g., 1., 1), a), i) etc.)
            // Make regex more flexible for problem markers
            const problemMarkerRegex = /^\s*(?:(\d+)[.)]?\s+|([a-z])\)\s+|([ivx]+)[.)]?\s+)/i;
            const problemMatch = line.match(problemMarkerRegex);

            if (currentChapter !== null && problemMatch) { // Check currentChapter is not null
                 // Finalize previous problem before starting new one
                 if (currentProblem) {
                    if (!problems[currentChapter]) problems[currentChapter] = [];
                    problems[currentChapter].push(currentProblem);
                 }

                // Extract the first line of text after the marker
                const problemTextStart = line.substring(problemMatch[0].length).trim();
                problemCounter++;
                currentProblem = {
                    id: `subj${subjectId}-chap${currentChapter}-prob${problemCounter}`, // More unique ID
                    chapter: currentChapter,
                    text: problemTextStart,
                    type: 'Problem', // Default type
                    difficulty: null,
                    topics: [],
                    answer: null, // Problems don't have predefined single answers
                    parts: {} // Store sub-parts if any
                };
                continue;
            }

            // Problem attributes (indented with -)
            if (currentProblem && trimmedLine.startsWith('- ')) {
                const attributeLine = trimmedLine.substring(2).trim();
                const separatorIndex = attributeLine.indexOf(':');
                if (separatorIndex > 0) {
                     const key = attributeLine.substring(0, separatorIndex).trim().toLowerCase();
                     const value = attributeLine.substring(separatorIndex + 1).trim();
                    switch (key) {
                        case 'type': currentProblem.type = value; break;
                        case 'difficulty': currentProblem.difficulty = value; break;
                        case 'topics': currentProblem.topics = value.split(',').map(t => t.trim()); break;
                         // Ignore 'answer' for problems from this file
                    }
                }
                continue; // Don't append attribute lines to problem text
            }

            // If it's not a chapter, marker, or attribute, append to current problem text
            if (currentProblem && line.length > 0) { // Check line length > 0 to avoid adding empty lines
                currentProblem.text += '\n' + line; // Preserve original spacing for multi-line text
            }
        }

        // Add the very last problem if it exists
        if (currentProblem && currentChapter !== null) {
            if (!problems[currentChapter]) problems[currentChapter] = [];
            problems[currentChapter].push(currentProblem);
        }

        // Clean up text for each problem (remove leading/trailing whitespace)
        Object.values(problems).forEach(chapterProblems => {
            chapterProblems.forEach(prob => prob.text = prob.text.trim());
        });

        console.log(`Finished parsing problems for subject ${subjectId}. Found problems for ${Object.keys(problems).length} chapters.`);
        subjectProblemCache.set(subjectId, problems); // Cache the result for this subject
        return problems;
    } catch (error) {
        console.error(`Error parsing problems file "${problemsFileName}" for subject ${subjectId}:`, error);
        subjectProblemCache.set(subjectId, {}); // Cache empty object on error
        return {};
    }
}

/**
 * Selects a specified number of problems for a given chapter *from the correct subject's cache*.
 * Tries to get a mix based on available metadata if possible.
 * @param {number} chapterNum The chapter number.
 * @param {number} count The desired number of problems.
 * @param {string} [subjectId=currentSubject.id] The ID of the subject whose problems to use.
 * @returns {Array<object>} An array of selected problem objects, formatted for exams.
 */
export function selectProblemsForExam(chapterNum, count = 5, subjectId = currentSubject?.id) {
    if (!subjectId || !subjectProblemCache.has(subjectId)) {
        console.error(`Problem cache not initialized or missing for subject ${subjectId}. Call parseChapterProblems first.`);
        return [];
    }
    const subjectProblems = subjectProblemCache.get(subjectId);
    const chapterProblems = subjectProblems[chapterNum] || [];

    if (chapterProblems.length === 0) {
        // console.warn(`No pre-defined problems available for Chapter ${chapterNum} in subject ${subjectId}`);
        return [];
    }

    const actualCount = Math.min(count, chapterProblems.length);
    if (actualCount <= 0) return [];

    // Simple random selection for now
    const shuffledProblems = [...chapterProblems].sort(() => 0.5 - Math.random());
    const selectedRawProblems = shuffledProblems.slice(0, actualCount);

    // Convert problems to the expected exam question format
    return selectedRawProblems.map((problem, index) => {
        return {
            id: problem.id || `c${chapterNum}p${index + 1}-rand`, // Use parsed ID or generate one
            chapter: String(chapterNum),
            // Relative number within the selected problems for this test/chapter combo
            number: index + 1,
            text: problem.text,
            options: [], // Problems don't have MCQ options
            image: null, // Assume no images for now
            answer: null, // No predefined correct answer
            type: problem.type || 'Problem', // Use parsed type or default
            difficulty: problem.difficulty, // Include metadata if available
            topics: problem.topics || [], // Include metadata if available
            isProblem: true // Flag to identify this as a non-MCQ problem
        };
    });
}

// --- Allocation and Selection (Combined) ---

export function allocateQuestions(chaptersToConsider, total_test_questions) {
    // This function remains largely the same as provided, focusing on chapter difficulty/mastery
    // It allocates a *total* number of questions per chapter, not distinguishing MCQ/Problem yet.
    // ... (Keep the existing implementation from ui_test_generation.js/bank1.py) ...
    // Ensure it handles edge cases gracefully (zero weights, low availability)
    let weights = {};
    let chapterDetails = []; // Store details for easier processing

    // 1. Calculate weights for each chapter
    for (let chap_num in chaptersToConsider) {
        let chap = chaptersToConsider[chap_num];
        // Check total_questions > 0 AND available_questions.length > 0
        if (chap && chap.total_questions > 0 && chap.available_questions && chap.available_questions.length > 0) {
            let mastery = chap.consecutive_mastery || 0;
            // Apply weight reduction based on mastery (more mastered = lower weight)
            let weight_factor = mastery >= 6 ? 0.3 : mastery >= 3 ? 0.6 : 1.0; // Example thresholds
            let difficulty = calculateDifficulty(chap);
            let weight = difficulty * weight_factor;
            weight = Math.max(weight, 1); // Ensure a minimum weight

            weights[chap_num] = weight;
             chapterDetails.push({
                chap_num: chap_num,
                weight: weight,
                available: chap.available_questions.length,
                total: chap.total_questions
            });
        }
    }

    // If no chapters have weight or available questions, return empty allocation
    if (chapterDetails.length === 0) {
         console.log("Allocation: No chapters with available questions and weight.");
         return {};
    }

    let sum_w = Object.values(weights).reduce((a, b) => a + b, 0);

    // Handle edge case where total weight is zero (e.g., all chapters have mastery >= 6 and difficulty 0)
    if (sum_w === 0) {
        console.warn("Allocation fallback: distributing evenly due to zero total weight.");
        const chaptersWithAvailable = chapterDetails.filter(c => c.available > 0);
        if (chaptersWithAvailable.length === 0) return {}; // No available questions anywhere

        const questionsPerChapter = Math.floor(total_test_questions / chaptersWithAvailable.length);
        let remainder = total_test_questions % chaptersWithAvailable.length;
        const fallbackAllocations = {};
        let currentTotal = 0;

        // Distribute base amount + remainder
        chaptersWithAvailable.forEach((c, index) => {
            let num = questionsPerChapter + (index < remainder ? 1 : 0);
            num = Math.min(num, c.available); // Respect availability limit
            fallbackAllocations[c.chap_num] = num;
            currentTotal += num;
        });

        // If still short due to availability limits, try adding more where possible
        let deficit = total_test_questions - currentTotal;
        for (let i = 0; deficit > 0 && i < chaptersWithAvailable.length; i++) {
           const c = chaptersWithAvailable[i];
            if (fallbackAllocations[c.chap_num] < c.available) {
                fallbackAllocations[c.chap_num]++;
                deficit--;
            }
        }
        console.log("Fallback Allocation Result:", fallbackAllocations);
        return fallbackAllocations;
    }

    // 2. Calculate initial proportional allocation
    let proportions = Object.fromEntries(Object.entries(weights).map(([k, w]) => [k, w / sum_w]));
    let expected = Object.fromEntries(Object.entries(proportions).map(([k, p]) => [k, total_test_questions * p]));

    // 3. Allocate integer parts, respecting availability
    let allocations = {};
     chapterDetails.forEach(c => {
         allocations[c.chap_num] = Math.floor(expected[c.chap_num] || 0);
         allocations[c.chap_num] = Math.min(allocations[c.chap_num], c.available); // Don't allocate more than available
     });

    // 4. Distribute remaining questions based on fractional parts
    let total_allocated = Object.values(allocations).reduce((a, b) => a + b, 0);
    let remaining = total_test_questions - total_allocated;

    if (remaining > 0) {
         // Sort chapters by the remainder (fractional part), descending
         let remainders = chapterDetails
           .filter(c => allocations[c.chap_num] < c.available) // Only consider chapters that can take more questions
           .map(c => ({
               chap_num: c.chap_num,
               remainder_val: (expected[c.chap_num] || 0) - allocations[c.chap_num],
               available: c.available // Keep track of availability
           }))
           .sort((a, b) => b.remainder_val - a.remainder_val); // Highest remainder first

        let safetyCounter = 0;
        const maxIterations = remaining * chapterDetails.length + 10; // Safety break

        // Distribute remaining questions one by one
        while (remaining > 0 && remainders.length > 0 && safetyCounter < maxIterations) {
            const chap_info = remainders[0]; // Get chapter with highest remainder

            if (allocations[chap_info.chap_num] < chap_info.available) {
                allocations[chap_info.chap_num]++;
                remaining--;
                // Remove this chapter from remainder list as it received one
                remainders.shift();
            } else {
                 // This chapter cannot take more, remove it permanently from this loop
                 console.warn(`Allocation Warning: Chapter ${chap_info.chap_num} hit availability limit during remainder distribution.`);
                 remainders.shift();
            }

            // If we run out of chapters with remainders, break
            if (remainders.length === 0 && remaining > 0) {
                 console.warn(`Could not allocate all remaining ${remaining} questions due to availability limits.`);
                 break;
            }
             safetyCounter++;
        }
        if (safetyCounter >= maxIterations) {
            console.error("Allocation Error: Remainder distribution loop exceeded safety limit.");
        }
    }

    // 5. Final check and filter out zero allocations
    let final_allocated_sum = 0;
    const finalAllocations = {};
    for (const chap_num in allocations) {
        const count = allocations[chap_num];
        if (count > 0) {
             const chap = chaptersToConsider[chap_num];
             const finalCount = Math.min(count, chap?.available_questions?.length || 0); // Final availability check
             if (finalCount > 0) {
                  finalAllocations[chap_num] = finalCount;
                  final_allocated_sum += finalCount;
             }
        }
    }

    if (final_allocated_sum < total_test_questions && final_allocated_sum > 0) {
         console.warn(`Final allocation (${final_allocated_sum}) is less than requested (${total_test_questions}) due to availability limits.`);
    } else if (final_allocated_sum === 0) {
        console.warn(`Could not allocate any questions. Requested: ${total_test_questions}`);
    }

    console.log("Final Allocation Result:", finalAllocations);
    return finalAllocations;
}

// Selects 'n' questions trying to distribute them across the chapter range
export function selectQuestions(available, n, totalChapterQuestions) {
    if (n <= 0 || !Array.isArray(available) || available.length === 0) return [];

    const numAvailable = available.length;
    const actualN = Math.min(n, numAvailable); // Cannot select more than available
    if (actualN === 0) return [];

    // If selecting all available, just return them sorted
    if (actualN === numAvailable) return [...available].sort((a, b) => a - b);

    // Strategy: Aim for a spread across the chapter's question numbers
    // 1. Define ideal target question numbers based on desired count 'actualN'
    const step = (totalChapterQuestions > 1 && actualN > 1) ? (totalChapterQuestions - 1) / (actualN - 1) : 1;
    let targetQuestions = Array.from({ length: actualN }, (_, i) => Math.round(1 + i * step));
    targetQuestions = [...new Set(targetQuestions)].sort((a,b) => a - b); // Ensure unique and sorted targets

    let selected = [];
    let availableCopy = [...available]; // Work on a copy

    // 2. For each target, find the *closest* available question
    for (const targetQ of targetQuestions) {
         if (availableCopy.length === 0) break; // Stop if no more available questions

        let bestMatch = -1;
        let minDistance = Infinity;
        let bestIndex = -1;

        // Find the available question closest to the target
        for (let i = 0; i < availableCopy.length; i++) {
            const currentAvailableQ = availableCopy[i];
            const dist = Math.abs(currentAvailableQ - targetQ);

            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = currentAvailableQ;
                bestIndex = i;
            }
            // Tie-breaker: prefer the lower question number if distances are equal
             else if (dist === minDistance && currentAvailableQ < bestMatch) {
                 bestMatch = currentAvailableQ;
                 bestIndex = i;
             }
        }

        // Select the best match and remove it from the available pool
        if (bestIndex !== -1) {
            selected.push(bestMatch);
            availableCopy.splice(bestIndex, 1); // Remove the selected question
        }
    }

    // 3. If we still need more questions (due to duplicates in targets or limited availability near targets),
    // fill the remainder randomly from the remaining available questions.
    let currentSelectedCount = selected.length;
    if (currentSelectedCount < actualN && availableCopy.length > 0) {
         // Shuffle the remaining available questions
         for (let i = availableCopy.length - 1; i > 0; i--) {
             const j = Math.floor(Math.random() * (i + 1));
             [availableCopy[i], availableCopy[j]] = [availableCopy[j], availableCopy[i]]; // Swap
         }
         // Add the required number of random questions
         selected.push(...availableCopy.slice(0, actualN - currentSelectedCount));
    }

    // Return the final list, sorted
    return selected.sort((a, b) => a - b);
}

// Selects questions for a specific chapter *without* modifying the chapter data directly
export function selectNewQuestionsAndUpdate(chap, n) {
    if (!chap || n <= 0 || !chap.available_questions || !Array.isArray(chap.available_questions)) {
        console.warn(`selectNewQuestions: Invalid chapter data or n=${n}.`);
        return [];
    }
    // Ensure we're working with a clean, sorted list of unique available questions
    const available = [...new Set(chap.available_questions)].sort((a, b) => a - b);

    // Use the selectQuestions logic to pick the questions
    let selected = selectQuestions(available, n, chap.total_questions);

    if (selected.length < n) {
         console.warn(`Chapter ${chap.number || 'Unknown'}: Selected only ${selected.length} MCQs out of requested ${n}.`);
     }

    // This function *only returns the selected MCQ numbers*.
    // The calling function is responsible for updating chapter data *after submission*.
    return selected.sort((a, b) => a - b);
}

/**
 * Combines pre-defined problems with extracted MCQs for a final exam list,
 * respecting the target ratio.
 * @param {Array<object>} problems - Selected problem objects.
 * @param {Array<object>} mcqs - Extracted MCQ objects.
 * @param {number} targetTotalQuestions - The desired total number of questions.
 * @param {number} [mcqRatio=DEFAULT_MCQ_PROBLEM_RATIO] - The desired ratio of MCQs (0.0 to 1.0).
 * @returns {Array<object>} A shuffled array containing the combined questions and problems.
 */
export function combineProblemsWithQuestions(problems, mcqs, targetTotalQuestions, mcqRatio = DEFAULT_MCQ_PROBLEM_RATIO) {
    const finalExam = [];
    const availableProblems = problems || [];
    const availableMcqs = mcqs || [];

    const totalAvailable = availableProblems.length + availableMcqs.length;
    const actualTotal = Math.min(targetTotalQuestions, totalAvailable);

    // Determine target counts based on the ratio and availability
    let targetMcqCount = Math.min(availableMcqs.length, Math.round(actualTotal * mcqRatio));
    let targetProblemCount = Math.min(availableProblems.length, actualTotal - targetMcqCount);

    // If the initial counts don't sum to the actualTotal (due to rounding or availability limits), adjust.
    // Prioritize meeting the actualTotal by adjusting the type that has more available.
    if (targetMcqCount + targetProblemCount < actualTotal) {
        const deficit = actualTotal - (targetMcqCount + targetProblemCount);
        if (availableMcqs.length > targetMcqCount && availableProblems.length === targetProblemCount) {
             // Add more MCQs if possible
             targetMcqCount = Math.min(availableMcqs.length, targetMcqCount + deficit);
        } else if (availableProblems.length > targetProblemCount && availableMcqs.length === targetMcqCount) {
             // Add more Problems if possible
             targetProblemCount = Math.min(availableProblems.length, targetProblemCount + deficit);
        } else {
             // If both have more available, distribute deficit proportionally (simplified: add to MCQs first)
             const mcqToAdd = Math.min(deficit, availableMcqs.length - targetMcqCount);
             targetMcqCount += mcqToAdd;
             targetProblemCount = Math.min(actualTotal - targetMcqCount, availableProblems.length); // Recalc problems
        }
    }

    console.log(`Combining Exam: Target=${actualTotal}, Ratio=${mcqRatio}, Final Problems=${targetProblemCount}, Final MCQs=${targetMcqCount}`);

    // Randomly select problems
    const shuffledProblems = [...availableProblems].sort(() => 0.5 - Math.random());
    finalExam.push(...shuffledProblems.slice(0, targetProblemCount));

    // Randomly select MCQs
    const shuffledMcqs = [...availableMcqs].sort(() => 0.5 - Math.random());
    finalExam.push(...shuffledMcqs.slice(0, targetMcqCount));

    // Shuffle the final combined list
    for (let i = finalExam.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalExam[i], finalExam[j]] = [finalExam[j], finalExam[i]];
    }

    // Re-number questions sequentially in the final list for display consistency
    finalExam.forEach((item, index) => {
         item.displayNumber = index + 1; // Add a field for display order
    });

    console.log(`Final combined exam length: ${finalExam.length}`);
    return finalExam;
}
// --- END OF FILE test_logic.js ---