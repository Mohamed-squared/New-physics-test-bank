// --- START OF FILE test_logic.js ---

import { currentSubject, data } from './state.js'; // Added data state
import { showLoading, hideLoading } from './utils.js';
import { DEFAULT_MCQ_PROBLEM_RATIO } from './config.js'; // Import default ratio

// --- Difficulty & Allocation ---

export function calculateDifficulty(chap) {
    // --- THIS FUNCTION IS LESS RELEVANT FOR COURSE EXAMS IF WE DON'T USE TESTGEN BANK ---
    // --- Keeping it for potential future use or if TestGen logic is still used ---
    if (!chap) return 100; // Default difficulty if no chapter data
    const attempted = Math.max(chap.total_attempted || 0, 0);
    const wrong = Math.min(Math.max(chap.total_wrong || 0, 0), attempted); // Ensure wrong <= attempted

    if (attempted > 0) {
        let error_rate = wrong / attempted;
        let base_difficulty = Math.max(error_rate * 100, 10);
        let consecutive_mistakes = 0;
        if (chap.mistake_history && chap.mistake_history.length > 0) {
            for (let i = chap.mistake_history.length - 1; i >= 0; i--) {
                if (chap.mistake_history[i] > 0) consecutive_mistakes++;
                else break;
            }
        }
        let difficultyScore = base_difficulty + (consecutive_mistakes * 20);
        return Math.min(difficultyScore, 150);
    }
    return 100;
}

// --- Problem Parsing and Selection ---

// MODIFIED: Cache now Map<string (cacheKey), object (chapterProblems)>
// Cache key format: "subjectId|sourceType" e.g., "1|text_problems"
const subjectProblemCache = new Map();

/**
 * Parses a specific Markdown problems file and caches the result.
 * @param {string} filePath - The full relative path to the Markdown problems file.
 * @param {string} subjectId - The ID of the subject this file belongs to.
 * @param {string} sourceType - An identifier for the source (e.g., 'text_problems', 'lecture_problems'). Used for caching and problem IDs.
 * @returns {Promise<object>} A promise that resolves to an object where keys are chapter numbers
 *                           and values are arrays of problem objects. Returns empty object on error.
 */
export async function parseChapterProblems(filePath, subjectId, sourceType) {
    // --- MODIFIED: Added Validation ---
    if (!subjectId || typeof subjectId !== 'string' || subjectId.trim() === '') {
        console.error("parseChapterProblems: Invalid or missing subjectId provided.");
        return {};
    }
    if (!filePath || typeof filePath !== 'string' || !filePath.trim().endsWith('.md')) {
        console.error(`parseChapterProblems: Invalid or missing Markdown filePath provided for subject ${subjectId}. Path: ${filePath}`);
        return {};
    }
    if (!sourceType || typeof sourceType !== 'string' || sourceType.trim() === '') {
         console.error(`parseChapterProblems: Invalid or missing sourceType provided for subject ${subjectId}, file ${filePath}.`);
         return {};
    }
    // --- End Validation ---

    const cacheKey = `${subjectId}|${sourceType}`;

    // Check cache first
    if (subjectProblemCache.has(cacheKey)) {
        console.log(`Using cached problems for subject ${subjectId}, source ${sourceType} (Key: ${cacheKey})`);
        return subjectProblemCache.get(cacheKey);
    }

    // --- MODIFIED: Updated Logging ---
    console.log(`Parsing problems for Subject ID: ${subjectId}, Source: ${sourceType}, File: ${filePath}...`);

    try {
        const response = await fetch(`${filePath}?t=${Date.now()}`); // Cache bust
        if (!response.ok) {
            if (response.status === 404) {
                // Log specifically for 404, cache empty object, return empty object
                console.warn(`Problem file "${filePath}" not found (404) for subject ${subjectId}, source ${sourceType}. No problems will be available from this source.`);
                subjectProblemCache.set(cacheKey, {});
                return {};
            }
            // Throw for other HTTP errors
            throw new Error(`Failed to fetch problems file "${filePath}" for subject ${subjectId} (${sourceType}): ${response.status} ${response.statusText}`);
        }
        const content = await response.text();

        const problems = {};
        let currentChapter = null;
        let currentProblem = null;
        let problemCounter = 0; // Unique ID counter *per file parse*

        const lines = content.split('\n');
        for (let line of lines) {
            const trimmedLine = line.trim();

            // Match chapter heading (e.g., # Chapter 1, # Chapter 5: Title)
            const chapterMatch = trimmedLine.match(/^#\s+Chapter\s+(\d+):?/i);
            if (chapterMatch) {
                // Finalize previous problem before switching chapter
                if (currentProblem && currentChapter !== null) {
                    if (!problems[currentChapter]) problems[currentChapter] = [];
                    problems[currentChapter].push(currentProblem);
                }
                currentChapter = parseInt(chapterMatch[1]);
                currentProblem = null; // Reset current problem
                if (isNaN(currentChapter) || currentChapter <= 0) {
                    console.warn(`Invalid chapter number found in ${filePath}: ${chapterMatch[0]}. Skipping section.`);
                    currentChapter = null; // Skip invalid chapter section
                    continue;
                }
                if (!problems[currentChapter]) {
                    problems[currentChapter] = [];
                }
                // console.log(`   Processing Chapter ${currentChapter} in ${filePath}`);
                continue;
            }

            // Skip lines if not currently inside a valid chapter
            if (currentChapter === null) continue;

            // Match problem start (e.g., "1.", "a)", "i.") - More flexible
            const problemMarkerRegex = /^\s*(?:(\d+)[.)]?\s+|([a-z])\)\s+|([ivx]+)[.)]?\s+)/i;
            const problemMatch = line.match(problemMarkerRegex);

            if (problemMatch) {
                // Finalize the previous problem if one was being processed
                if (currentProblem) {
                    if (!problems[currentChapter]) problems[currentChapter] = []; // Should exist, but safety check
                    problems[currentChapter].push(currentProblem);
                }
                const problemTextStart = line.substring(problemMatch[0].length).trim();
                problemCounter++;
                // *** MODIFIED ID to include sourceType ***
                currentProblem = {
                    id: `subj${subjectId}-chap${currentChapter}-prob${problemCounter}-${sourceType}`,
                    chapter: currentChapter,
                    text: problemTextStart,
                    type: 'Problem', // Default type
                    difficulty: null,
                    topics: [],
                    answer: null, // Problems typically don't have simple answers here
                    parts: {} // For potential multi-part problems (future)
                };
                // console.log(`      Found Problem ${problemCounter} (ID: ${currentProblem.id})`);
                continue;
            }

            // Process lines belonging to the current problem
            if (currentProblem) {
                 // Check for metadata lines (e.g., "- Difficulty: Hard")
                if (trimmedLine.startsWith('- ')) {
                    const attributeLine = trimmedLine.substring(2).trim();
                    const separatorIndex = attributeLine.indexOf(':');
                    if (separatorIndex > 0) {
                        const key = attributeLine.substring(0, separatorIndex).trim().toLowerCase();
                        const value = attributeLine.substring(separatorIndex + 1).trim();
                        switch (key) {
                            case 'type': currentProblem.type = value; break;
                            case 'difficulty': currentProblem.difficulty = value; break;
                            case 'topics': currentProblem.topics = value.split(',').map(t => t.trim()).filter(t => t); break;
                             // Add more metadata keys as needed
                        }
                        // console.log(`         Metadata ${key}: ${value}`);
                    } else {
                         // If line starts with '-' but no ':', treat as continuation of text
                         currentProblem.text += '\n' + line;
                    }
                    continue; // Move to next line after processing metadata or adding as text
                }

                // Append non-empty, non-chapter, non-problem-start, non-metadata lines to current problem text
                if (line.length > 0) { // Keep original spacing if needed, or use trimmedLine
                    currentProblem.text += '\n' + line;
                }
            }
        }

        // Finalize the last problem in the file
        if (currentProblem && currentChapter !== null) {
            if (!problems[currentChapter]) problems[currentChapter] = [];
            problems[currentChapter].push(currentProblem);
        }

        // Trim whitespace from all collected problem texts
        Object.values(problems).forEach(chapterProblems => {
            chapterProblems.forEach(prob => {
                if (prob.text) prob.text = prob.text.trim();
            });
        });

        // --- MODIFIED: Updated Logging ---
        const totalProblemsFound = Object.values(problems).reduce((sum, arr) => sum + arr.length, 0);
        console.log(`Finished parsing problems for Subject ID: ${subjectId}, Source: ${sourceType}, File: ${filePath}. Found ${totalProblemsFound} problems across ${Object.keys(problems).length} chapters.`);
        subjectProblemCache.set(cacheKey, problems); // Cache the result
        return problems;

    } catch (error) {
        // --- MODIFIED: Updated Error Logging ---
        console.error(`Error parsing problems file "${filePath}" for Subject ID: ${subjectId}, Source: ${sourceType}:`, error);
        subjectProblemCache.set(cacheKey, {}); // Cache empty object on error
        return {}; // Return empty object on any error during fetch or parsing
    }
}


/**
 * Selects a specified number of problems for a given chapter from a specific source type cache.
 * @param {number} chapterNum The chapter number.
 * @param {number} count The desired number of problems.
 * @param {string} subjectId The ID of the subject.
 * @param {string} sourceType - Identifier for the source cache (e.g., 'text_problems').
 * @returns {Array<object>} An array of selected problem objects, formatted for exams.
 */
export function selectProblemsForExam(chapterNum, count = 5, subjectId, sourceType) {
     // --- MODIFIED: Validation ---
     if (!subjectId || !sourceType) {
          console.error(`selectProblemsForExam: Missing subjectId or sourceType.`);
          return [];
      }
     if (typeof chapterNum !== 'number' || chapterNum <= 0) {
         console.error(`selectProblemsForExam: Invalid chapter number ${chapterNum} for subject ${subjectId}, source ${sourceType}.`);
         return [];
     }
     if (typeof count !== 'number' || count < 0) {
         console.warn(`selectProblemsForExam: Invalid count ${count}, defaulting to 0.`);
         count = 0;
     }
     if (count === 0) return [];
     // --- End Validation ---

    const cacheKey = `${subjectId}|${sourceType}`;

    if (!subjectProblemCache.has(cacheKey)) {
        // Do not log warning here, parseChapterProblems already warned if file was missing.
        // It's possible the cache exists but is empty.
        // console.warn(`Problem cache missing for key ${cacheKey}. Cannot select problems.`);
        return [];
    }
    const subjectProblems = subjectProblemCache.get(cacheKey);
    const chapterProblems = subjectProblems[chapterNum] || [];

    if (chapterProblems.length === 0) {
        // Log if problems were expected but none found for this specific chapter
        // console.log(`No problems available in cache for Chapter ${chapterNum} (Subject: ${subjectId}, Source: ${sourceType})`);
        return [];
    }

    const actualCount = Math.min(count, chapterProblems.length);
    if (actualCount <= 0) return [];

    // Simple random selection without replacement
    const shuffledProblems = [...chapterProblems].sort(() => 0.5 - Math.random());
    const selectedRawProblems = shuffledProblems.slice(0, actualCount);

    // Convert selected raw problems to the standard exam item format
    return selectedRawProblems.map((problem, index) => {
        return {
            // Use the ID generated during parsing
            id: problem.id || `subj${subjectId}-chap${chapterNum}-prob${index + 1}-${sourceType}-fallback`, // Fallback ID
            chapter: String(chapterNum), // Ensure chapter is string
            number: index + 1, // Sequential number *within this batch* of selected problems
            text: problem.text || "Problem text not found.", // Problem text content
            options: [], // Problems don't have multiple-choice options
            image: null, // Placeholder for potential images associated with problems
            correctAnswer: null, // Problems are typically graded manually
            // Carry over metadata if needed
            type: problem.type || 'Problem', // Use parsed type or default
            difficulty: problem.difficulty,
            topics: problem.topics || [],
            // Flag indicating this is a problem, not an MCQ
            isProblem: true
        };
    });
}

// --- Allocation and Selection (TestGen Bank Specific) ---
// These functions (allocateQuestions, selectQuestions, selectNewQuestionsAndUpdate)
// are primarily designed for the TestGen flow using the main subject MD file
// and chapter stats (mastery, difficulty). They are *less directly applicable*
// to the new course exam flow which selects from specific files randomly.
// Keep them for the TestGen feature.

export function allocateQuestions(chaptersToConsider, total_test_questions) {
    // --- THIS FUNCTION IS FOR TESTGEN BANK - NOT COURSE EXAMS ---
    console.log("allocateQuestions (TestGen Bank): Starting allocation...");
    let weights = {};
    let chapterDetails = []; // Store details for easier processing

    // 1. Calculate weights for each chapter based on TestGen stats
    for (let chap_num in chaptersToConsider) {
        let chap = chaptersToConsider[chap_num];
        // Use TestGen specific fields like total_questions, available_questions etc.
        if (chap && chap.total_questions > 0 && chap.available_questions && chap.available_questions.length > 0) {
            let mastery = chap.consecutive_mastery || 0;
            let weight_factor = mastery >= 6 ? 0.3 : mastery >= 3 ? 0.6 : 1.0;
            let difficulty = calculateDifficulty(chap); // Uses TestGen stats
            let weight = Math.max(difficulty * weight_factor, 1);
            weights[chap_num] = weight;
            chapterDetails.push({
                chap_num: chap_num,
                weight: weight,
                available: chap.available_questions.length, // TestGen available MCQs
                total: chap.total_questions // TestGen total MCQs
            });
        } else {
             // console.log(`TestGen Allocation: Skipping Ch ${chap_num}, no available questions or definition.`);
        }
    }

    if (chapterDetails.length === 0) {
        console.log("TestGen Allocation: No chapters with available questions and weight.");
        return {};
    }

    let sum_w = Object.values(weights).reduce((a, b) => a + b, 0);

    if (sum_w <= 0) { // Check for <= 0 weight sum
        console.warn("TestGen Allocation fallback: distributing evenly due to zero or negative total weight.");
        const chaptersWithAvailable = chapterDetails.filter(c => c.available > 0);
        if (chaptersWithAvailable.length === 0) { console.warn("TestGen Fallback: No chapters have available questions."); return {};}

        const questionsPerChapter = Math.floor(total_test_questions / chaptersWithAvailable.length);
        let remainder = total_test_questions % chaptersWithAvailable.length;
        const fallbackAllocations = {};
        let currentTotal = 0;

        // Sort chapters by availability (ascending) to prioritize filling smaller pools first? Or just distribute? Let's distribute evenly first.
        chaptersWithAvailable.forEach((c, index) => {
            let num = questionsPerChapter + (index < remainder ? 1 : 0);
            num = Math.min(num, c.available); // Respect availability
            fallbackAllocations[c.chap_num] = num;
            currentTotal += num;
        });

        // If total allocated is still less than requested (due to availability limits), try to add more if possible
        let deficit = total_test_questions - currentTotal;
        if(deficit > 0) {
            // Iterate through chapters again, adding one question where possible until deficit is 0 or no more questions can be added
            for (let i = 0; deficit > 0 && i < chaptersWithAvailable.length * 2 ; i++) { // Loop a few times to distribute
               const cIndex = i % chaptersWithAvailable.length;
               const c = chaptersWithAvailable[cIndex];
                if (fallbackAllocations[c.chap_num] < c.available) {
                    fallbackAllocations[c.chap_num]++;
                    deficit--;
                    currentTotal++; // Keep track of actual total
                }
            }
        }

        console.log("TestGen Fallback Allocation Result:", fallbackAllocations);
        // Filter out zero allocations before returning
        return Object.fromEntries(Object.entries(fallbackAllocations).filter(([_, count]) => count > 0));
    }

    // 2. Calculate initial proportional allocation
    let proportions = Object.fromEntries(Object.entries(weights).map(([k, w]) => [k, w / sum_w]));
    let expected = Object.fromEntries(Object.entries(proportions).map(([k, p]) => [k, total_test_questions * p]));

    // 3. Allocate integer parts, respecting availability
    let allocations = {};
    chapterDetails.forEach(c => {
        allocations[c.chap_num] = Math.floor(expected[c.chap_num] || 0);
        allocations[c.chap_num] = Math.min(allocations[c.chap_num], c.available); // Crucial check
    });

    // 4. Distribute remaining questions based on fractional parts, highest first, respecting availability
    let total_allocated = Object.values(allocations).reduce((a, b) => a + b, 0);
    let remaining = total_test_questions - total_allocated;

    if (remaining > 0) {
        // Create a list of chapters that can still receive questions
        let eligibleChapters = chapterDetails
           .filter(c => allocations[c.chap_num] < c.available) // Only chapters not fully allocated yet
           .map(c => ({
               chap_num: c.chap_num,
               remainder_val: (expected[c.chap_num] || 0) - allocations[c.chap_num], // Fractional part
               available_slots: c.available - allocations[c.chap_num] // How many more can this chapter take?
           }))
           .sort((a, b) => b.remainder_val - a.remainder_val); // Sort by highest fractional part

        let safetyCounter = 0; const maxIterations = remaining * chapterDetails.length + 10; // Safety break

        while (remaining > 0 && eligibleChapters.length > 0 && safetyCounter < maxIterations) {
            const chapterToAdd = eligibleChapters[0]; // Chapter with highest remainder

            if (chapterToAdd.available_slots > 0) {
                allocations[chapterToAdd.chap_num]++; // Allocate one more question
                remaining--;
                chapterToAdd.available_slots--; // Reduce available slots for this chapter

                // If this chapter can still take more, potentially re-sort or just remove if full
                if (chapterToAdd.available_slots === 0) {
                    eligibleChapters.shift(); // Remove if now full
                } else {
                    // Re-sort or cycle: Simple approach is to move to end or just continue with next highest
                     eligibleChapters.shift(); // Remove from front
                     // Re-insert based on remaining value? Or just cycle? Let's try cycling for simplicity.
                     // No need to re-insert if we just process the sorted list once.
                     // Correction: We might need to allocate multiple remainder questions. Let's re-sort after each allocation.
                     // Simpler: just remove from front and continue. If list empties, we stop.

                }
            } else {
                // This chapter couldn't take more (shouldn't happen if filter is correct, but safety)
                eligibleChapters.shift();
            }

             // Re-sort the list based on remaining fractional value if needed, but sorting once is often sufficient
             // Let's stick to sorting once and processing. If remainder is left, it's due to availability.

             // Alternative: Cycle through the sorted list repeatedly
             /*
             const chap_info = eligibleChapters[safetyCounter % eligibleChapters.length];
             if (allocations[chap_info.chap_num] < chaptersToConsider[chap_info.chap_num].available_questions.length) { // Check original availability again
                 allocations[chap_info.chap_num]++;
                 remaining--;
             }
             // Need a mechanism to stop if no chapter can accept more Qs
             */


            safetyCounter++;
        }
        if (safetyCounter >= maxIterations) console.error("TestGen Allocation Error: Remainder distribution loop exceeded safety limit.");
        if (remaining > 0) {
             console.warn(`TestGen Allocation: Could not allocate all remaining ${remaining} questions due to chapter availability limits.`);
        }
    }

    // 5. Final check and filter out zero allocations
    let final_allocated_sum = 0;
    const finalAllocations = {};
    for (const chap_num in allocations) {
        const count = allocations[chap_num];
        if (count > 0) {
             const chap = chaptersToConsider[chap_num];
             // Ensure we don't exceed the actual available questions count again (double check)
             const finalCount = Math.min(count, chap?.available_questions?.length || 0);
             if (finalCount > 0) {
                  finalAllocations[chap_num] = finalCount;
                  final_allocated_sum += finalCount;
             }
        }
    }

    if (final_allocated_sum < total_test_questions && final_allocated_sum > 0) {
         console.warn(`TestGen Final allocation (${final_allocated_sum}) is less than requested (${total_test_questions}) due to availability limits or zero-weight fallback.`);
    } else if (final_allocated_sum === 0 && total_test_questions > 0) {
        console.error(`TestGen Allocation Failed: Could not allocate any questions. Requested: ${total_test_questions}. Check chapter definitions and availability.`);
    } else {
        console.log(`TestGen Allocation Success: Allocated ${final_allocated_sum} / ${total_test_questions} requested.`);
    }

    console.log("TestGen Final Allocation Result:", finalAllocations);
    return finalAllocations;
}


export function selectQuestions(available, n, totalChapterQuestions) {
    // --- THIS FUNCTION IS FOR TESTGEN BANK - NOT COURSE EXAMS ---
    // Selects 'n' questions from the 'available' list, trying to spread them based on 'totalChapterQuestions'.
    if (n <= 0 || !Array.isArray(available) || available.length === 0) return [];

    const numAvailable = available.length;
    const actualN = Math.min(n, numAvailable); // Cannot select more than available
    if (actualN === 0) return [];

    // If selecting all available, return them sorted
    if (actualN === numAvailable) return [...available].sort((a, b) => a - b);

    // Spread selection strategy (attempt to pick questions across the chapter range)
    // Calculate ideal target question numbers based on total questions in chapter
    const step = (totalChapterQuestions > 1 && actualN > 1) ? (totalChapterQuestions - 1) / (actualN - 1) : 1;
    let targetQuestions = new Set(); // Use a Set to avoid duplicates from rounding
    for (let i = 0; i < actualN; i++) {
        targetQuestions.add(Math.round(1 + i * step));
    }
    let sortedTargets = Array.from(targetQuestions).sort((a,b)=>a-b);

    let selected = [];
    let availableCopy = [...available].sort((a, b) => a - b); // Work with a sorted copy

    // For each target, find the closest available question
    for (const targetQ of sortedTargets) {
        if (availableCopy.length === 0) break; // Stop if no more available questions

        let bestMatch = -1, minDistance = Infinity, bestIndex = -1;

        // Find the closest available question (binary search could optimize this)
        // Simple linear scan for now:
        for (let i = 0; i < availableCopy.length; i++) {
            const currentAvailableQ = availableCopy[i];
            const dist = Math.abs(currentAvailableQ - targetQ);

            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = currentAvailableQ;
                bestIndex = i;
            } else if (dist === minDistance) {
                // Tie-breaking: prefer lower question number? Or doesn't matter? Let's stick with first found.
            }
        }

        if (bestIndex !== -1) {
            selected.push(bestMatch);
            availableCopy.splice(bestIndex, 1); // Remove the selected question
        }
    }

    // If spread selection resulted in fewer than actualN questions (e.g., targets mapped to same available q),
    // fill the remainder randomly from the remaining available questions.
    let currentSelectedCount = selected.length;
    if (currentSelectedCount < actualN && availableCopy.length > 0) {
        // Shuffle the *remaining* available questions
        for (let i = availableCopy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableCopy[i], availableCopy[j]] = [availableCopy[j], availableCopy[i]];
        }
        // Take the needed amount from the shuffled remainder
        selected.push(...availableCopy.slice(0, actualN - currentSelectedCount));
    }

    // Return the final selection sorted
    return selected.sort((a, b) => a - b);
}

export function selectNewQuestionsAndUpdate(chap, n) {
    // --- THIS FUNCTION IS FOR TESTGEN BANK - NOT COURSE EXAMS ---
    // This function selects question *numbers* based on availability in the chapter object.
    // IMPORTANT: It does *not* modify the chapter object itself (like removing questions from available_questions).
    // The calling function (in ui_test_generation) is responsible for updating the state *after* the test is finalized/submitted.
    if (!chap || n <= 0 || !chap.available_questions || !Array.isArray(chap.available_questions)) {
        console.warn(`TestGen selectNewQuestionsAndUpdate: Invalid chapter data or n=${n} for chapter ${chap?.chap_num}. Returning empty.`);
        return [];
    }

    // Ensure available_questions is a clean array of numbers
    const available = [...new Set(chap.available_questions.filter(q => typeof q === 'number' && q > 0))].sort((a, b) => a - b);

    if (available.length === 0) {
        // console.log(`TestGen selectNewQuestionsAndUpdate: No available questions in chapter ${chap.chap_num}.`);
        return [];
    }

    // Use the TestGen selection logic
    const selectedNumbers = selectQuestions(available, n, chap.total_questions);

    // console.log(`TestGen selected ${selectedNumbers.length} question numbers for Ch ${chap.chap_num}: [${selectedNumbers.join(', ')}] from ${available.length} available.`);

    // Return the sorted list of selected question numbers
    return selectedNumbers.sort((a, b) => a - b);
}

// --- General Purpose Combination ---

/**
 * Combines pre-selected problems and MCQs into a single shuffled list for an exam.
 * Adds a sequential displayNumber property.
 * @param {Array<object>} problems - Array of selected problem objects (already formatted for exam).
 * @param {Array<object>} mcqs - Array of selected MCQ objects (already formatted for exam).
 * @returns {Array<object>} A shuffled array containing the combined questions and problems, each with a 'displayNumber'.
 */
export function combineProblemsWithQuestions(problems, mcqs) {
    // Ensure inputs are arrays, default to empty if null/undefined
    const problemItems = Array.isArray(problems) ? problems : [];
    const mcqItems = Array.isArray(mcqs) ? mcqs : [];

    // Combine the two arrays
    const finalExam = [...problemItems, ...mcqItems];

    // Shuffle the final combined list using Fisher-Yates algorithm
    for (let i = finalExam.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalExam[i], finalExam[j]] = [finalExam[j], finalExam[i]]; // Swap elements
    }

    // Add sequential display number (1-based index) for presentation
    finalExam.forEach((item, index) => {
        item.displayNumber = index + 1;
    });

    console.log(`Combined and shuffled ${finalExam.length} items (${problemItems.length} Problems, ${mcqItems.length} MCQs).`);
    return finalExam;
}

// Make sure cache is available globally if needed (though it's internally managed)
window.subjectProblemCache = subjectProblemCache;

// --- END OF FILE test_logic.js ---