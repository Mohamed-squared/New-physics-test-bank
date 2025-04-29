// --- START OF FILE test_logic.js ---

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

/**
 * Allocates a total number of items (questions + problems) across chapters based on difficulty and mastery.
 * Tries to achieve a specified problem ratio.
 *
 * @param {object} chaptersToConsider - Object containing chapter data.
 * @param {number} total_test_items - Total number of items (MCQs + Problems) for the test.
 * @param {number} [problemRatio=0.5] - Desired ratio of problems (0.0 to 1.0). Defaults to 0.5 (50%).
 * @returns {object} - An object where keys are chapter numbers and values are objects: { questions: count, problems: count }.
 */
export function allocateQuestions(chaptersToConsider, total_test_items, problemRatio = 0.5) {
    let weights = {};
    let chapterDetails = []; // Store details for easier processing

    // 1. Calculate weights and availability for each chapter
    for (let chap_num in chaptersToConsider) {
        let chap = chaptersToConsider[chap_num];
        const availableMCQCount = chap?.available_questions?.length || 0;
        const availableProblemCount = chap?.available_problems?.length || 0;

        // Only consider chapters with *any* available items
        if (chap && (availableMCQCount > 0 || availableProblemCount > 0)) {
            let mastery = chap.consecutive_mastery || 0;
            // Apply weight reduction based on mastery (more mastered = lower weight)
            let weight_factor = mastery >= 6 ? 0.3 : mastery >= 3 ? 0.6 : 1.0; // Example thresholds
            let difficulty = calculateDifficulty(chap); // Difficulty based on MCQs for now
            let weight = difficulty * weight_factor;
            weight = Math.max(weight, 1); // Ensure a minimum weight

            weights[chap_num] = weight;
             chapterDetails.push({
                chap_num: chap_num,
                weight: weight,
                availableMCQ: availableMCQCount,
                availableProblems: availableProblemCount,
                totalAvailable: availableMCQCount + availableProblemCount
            });
        }
    }

    // If no chapters have weight or available items, return empty allocation
    if (chapterDetails.length === 0) {
         console.log("Allocation: No chapters with available items and weight.");
         return {}; // Return empty object, not just empty questions/problems keys
    }

    let sum_w = Object.values(weights).reduce((a, b) => a + b, 0);

    // Handle edge case where total weight is zero (fallback to even distribution)
    if (sum_w === 0) {
        console.warn("Allocation fallback: distributing evenly due to zero total weight.");
        const chaptersWithAvailable = chapterDetails.filter(c => c.totalAvailable > 0);
        if (chaptersWithAvailable.length === 0) return {}; // No available items anywhere

        const itemsPerChapter = Math.floor(total_test_items / chaptersWithAvailable.length);
        let remainder = total_test_items % chaptersWithAvailable.length;
        const fallbackAllocations = {};
        let currentTotal = 0;

        // Distribute base amount + remainder evenly first
        chaptersWithAvailable.forEach((c, index) => {
            let numItems = itemsPerChapter + (index < remainder ? 1 : 0);
            // Initial split based on ratio, respecting availability
            let numProblems = Math.min(Math.round(numItems * problemRatio), c.availableProblems);
            let numMCQ = Math.min(numItems - numProblems, c.availableMCQ);
            // If we couldn't get enough problems, try to fill with MCQs
            if(numProblems + numMCQ < numItems) {
                 numMCQ = Math.min(numItems - numProblems, c.availableMCQ);
            }
            // If we couldn't get enough MCQs, try to fill with problems
            if(numProblems + numMCQ < numItems) {
                 numProblems = Math.min(numItems - numMCQ, c.availableProblems);
            }

            fallbackAllocations[c.chap_num] = { questions: numMCQ, problems: numProblems };
            currentTotal += numMCQ + numProblems;
        });

        // If still short due to availability limits, try adding more where possible
        let deficit = total_test_items - currentTotal;
        // Prioritize adding problems first if below ratio, then MCQs
        for (let ratioPass = 0; ratioPass < 2 && deficit > 0; ratioPass++) {
             for (let i = 0; deficit > 0 && i < chaptersWithAvailable.length; i++) {
                const c = chaptersWithAvailable[i];
                const currentAlloc = fallbackAllocations[c.chap_num];
                const canAddProblem = currentAlloc.problems < c.availableProblems;
                const canAddMCQ = currentAlloc.questions < c.availableMCQ;

                if (ratioPass === 0 && canAddProblem) { // Prioritize problems first
                     currentAlloc.problems++; deficit--;
                } else if (ratioPass === 1 && canAddMCQ) { // Then add MCQs
                     currentAlloc.questions++; deficit--;
                } else if (ratioPass === 1 && canAddProblem && !canAddMCQ) { // If only problems left on second pass
                    currentAlloc.problems++; deficit--;
                }
             }
        }

        console.log("Fallback Allocation Result:", fallbackAllocations);
        // Filter out chapters with zero allocation
        Object.keys(fallbackAllocations).forEach(key => {
            if (fallbackAllocations[key].questions === 0 && fallbackAllocations[key].problems === 0) {
                delete fallbackAllocations[key];
            }
        });
        return fallbackAllocations;
    }

    // 2. Calculate initial proportional allocation for TOTAL items
    let proportions = Object.fromEntries(Object.entries(weights).map(([k, w]) => [k, w / sum_w]));
    let expectedTotalItems = Object.fromEntries(Object.entries(proportions).map(([k, p]) => [k, total_test_items * p]));

    // 3. Allocate integer parts, respecting availability and ratio
    let allocations = {}; // Will store { questions: count, problems: count }
    chapterDetails.forEach(c => {
         const expectedItems = expectedTotalItems[c.chap_num] || 0;
         const initialTotalAllocation = Math.floor(expectedItems);

         // Initial split based on ratio, respecting availability
         let numProblems = Math.min(Math.round(initialTotalAllocation * problemRatio), c.availableProblems);
         let numMCQ = Math.min(initialTotalAllocation - numProblems, c.availableMCQ);
         // Adjust if one type hit limit
         if (numProblems + numMCQ < initialTotalAllocation) {
             numMCQ = Math.min(initialTotalAllocation - numProblems, c.availableMCQ);
         }
         if (numProblems + numMCQ < initialTotalAllocation) {
              numProblems = Math.min(initialTotalAllocation - numMCQ, c.availableProblems);
         }

         allocations[c.chap_num] = { questions: numMCQ, problems: numProblems };
     });


    // 4. Distribute remaining questions based on fractional parts
    let total_allocated_items = Object.values(allocations).reduce((a, b) => a + (b.questions || 0) + (b.problems || 0), 0);
    let remaining_items = total_test_items - total_allocated_items;

    if (remaining_items > 0) {
         // Sort chapters by the remainder of TOTAL expected items, descending
         let remainders = chapterDetails
           .filter(c => (allocations[c.chap_num].questions < c.availableMCQ || allocations[c.chap_num].problems < c.availableProblems)) // Can take more of *either* type
           .map(c => ({
               chap_num: c.chap_num,
               remainder_val: (expectedTotalItems[c.chap_num] || 0) - (allocations[c.chap_num].questions + allocations[c.chap_num].problems),
               availableMCQ: c.availableMCQ,
               availableProblems: c.availableProblems,
               currentMCQ: allocations[c.chap_num].questions,
               currentProblems: allocations[c.chap_num].problems
           }))
           .sort((a, b) => b.remainder_val - a.remainder_val); // Highest remainder first

        let safetyCounter = 0;
        const maxIterations = remaining_items * chapterDetails.length + 10; // Safety break

        // Distribute remaining items one by one
        while (remaining_items > 0 && remainders.length > 0 && safetyCounter < maxIterations) {
            const chap_info = remainders.shift(); // Get chapter with highest remainder
            const canAddProblem = chap_info.currentProblems < chap_info.availableProblems;
            const canAddMCQ = chap_info.currentMCQ < chap_info.availableMCQ;

            if (!canAddProblem && !canAddMCQ) {
                 console.warn(`Allocation Warning: Chapter ${chap_info.chap_num} hit availability limit during remainder distribution.`);
                 continue; // Skip this chapter permanently for remainder
            }

            // Prioritize adding the item type that brings the chapter closer to the desired ratio
            const currentTotal = chap_info.currentProblems + chap_info.currentMCQ;
            const targetProblems = (currentTotal + 1) * problemRatio; // Target if we add one item
            const problemDeficit = targetProblems - chap_info.currentProblems;

            if (problemDeficit > 0.5 && canAddProblem) { // Needs more problems proportionally
                 allocations[chap_info.chap_num].problems++;
                 chap_info.currentProblems++;
                 remaining_items--;
                 console.log(`Rem (+1 Prob): Ch ${chap_info.chap_num}`);
            } else if (canAddMCQ) { // Add MCQ otherwise (or if problemDeficit <= 0.5)
                 allocations[chap_info.chap_num].questions++;
                 chap_info.currentMCQ++;
                 remaining_items--;
                  console.log(`Rem (+1 MCQ): Ch ${chap_info.chap_num}`);
            } else if (canAddProblem) { // Fallback to adding problem if only that's available
                 allocations[chap_info.chap_num].problems++;
                 chap_info.currentProblems++;
                 remaining_items--;
                  console.log(`Rem (+1 Prob - Fallback): Ch ${chap_info.chap_num}`);
            }

            // Re-add to remainder list if it can still take more items
            if ((chap_info.currentProblems < chap_info.availableProblems || chap_info.currentMCQ < chap_info.availableMCQ) && remaining_items > 0) {
                // Find correct position to re-insert based on remainder value
                let inserted = false;
                for(let i=0; i < remainders.length; i++) {
                    if(chap_info.remainder_val >= remainders[i].remainder_val) {
                        remainders.splice(i, 0, chap_info);
                        inserted = true;
                        break;
                    }
                }
                if (!inserted) remainders.push(chap_info);
            }
             safetyCounter++;
        }
        if (safetyCounter >= maxIterations) {
            console.error("Allocation Error: Remainder distribution loop exceeded safety limit.");
        }
        if (remaining_items > 0) {
             console.warn(`Could not allocate all remaining ${remaining_items} items due to availability limits.`);
        }
    }

    // 5. Final check and filter out zero allocations
    let final_allocated_sum = 0;
    const finalAllocations = {};
    for (const chap_num in allocations) {
        const counts = allocations[chap_num];
        if (counts.questions > 0 || counts.problems > 0) {
             const chapDetail = chapterDetails.find(c => c.chap_num === chap_num);
             const finalQCount = Math.min(counts.questions, chapDetail?.availableMCQ || 0);
             const finalPCount = Math.min(counts.problems, chapDetail?.availableProblems || 0);
             if (finalQCount > 0 || finalPCount > 0) {
                  finalAllocations[chap_num] = { questions: finalQCount, problems: finalPCount };
                  final_allocated_sum += finalQCount + finalPCount;
             }
        }
    }

    if (final_allocated_sum < total_test_items && final_allocated_sum > 0) {
         console.warn(`Final allocation (${final_allocated_sum}) is less than requested (${total_test_items}) due to availability limits.`);
    } else if (final_allocated_sum === 0) {
        console.warn(`Could not allocate any items. Requested: ${total_test_items}`);
    }

    console.log("Final Allocation Result:", finalAllocations);
    return finalAllocations;
}


// --- Question Selection ---

/**
 * Selects 'n' items (questions or problems) trying to distribute them across the chapter range.
 * @param {number[]} available - Array of available item numbers.
 * @param {number} n - Number of items to select.
 * @param {number} totalChapterItems - Total number of items in the chapter (MCQs or Problems).
 * @returns {number[]} - Array of selected item numbers, sorted.
 */
export function selectItems(available, n, totalChapterItems) {
    if (n <= 0 || !Array.isArray(available) || available.length === 0) return [];

    const numAvailable = available.length;
    const actualN = Math.min(n, numAvailable); // Cannot select more than available
    if (actualN === 0) return [];

    // If selecting all available, just return them sorted
    if (actualN === numAvailable) return [...available].sort((a, b) => a - b);

    // Strategy: Aim for a spread across the chapter's item numbers
    // 1. Define ideal target item numbers based on desired count 'actualN'
    const step = (totalChapterItems > 1 && actualN > 1) ? (totalChapterItems - 1) / (actualN - 1) : 1;
    let targetItems = Array.from({ length: actualN }, (_, i) => Math.round(1 + i * step));
    targetItems = [...new Set(targetItems)].sort((a,b) => a - b); // Ensure unique and sorted targets

    let selected = [];
    let availableCopy = [...available]; // Work on a copy

    // 2. For each target, find the *closest* available item
    for (const targetItem of targetItems) {
         if (availableCopy.length === 0) break; // Stop if no more available items

        let bestMatch = -1;
        let minDistance = Infinity;
        let bestIndex = -1;

        // Find the available item closest to the target
        for (let i = 0; i < availableCopy.length; i++) {
            const currentAvailableItem = availableCopy[i];
            const dist = Math.abs(currentAvailableItem - targetItem);

            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = currentAvailableItem;
                bestIndex = i;
            }
            // Tie-breaker: prefer the lower item number if distances are equal
             else if (dist === minDistance && currentAvailableItem < bestMatch) {
                 bestMatch = currentAvailableItem;
                 bestIndex = i;
             }
        }

        // Select the best match and remove it from the available pool
        if (bestIndex !== -1) {
            selected.push(bestMatch);
            availableCopy.splice(bestIndex, 1); // Remove the selected item
        }
    }

    // 3. If we still need more items (due to duplicates in targets or limited availability near targets),
    // fill the remainder randomly from the remaining available items.
    let currentSelectedCount = selected.length;
    if (currentSelectedCount < actualN && availableCopy.length > 0) {
         // Shuffle the remaining available items
         for (let i = availableCopy.length - 1; i > 0; i--) {
             const j = Math.floor(Math.random() * (i + 1));
             [availableCopy[i], availableCopy[j]] = [availableCopy[j], availableCopy[i]]; // Swap
         }
         // Add the required number of random items
         selected.push(...availableCopy.slice(0, actualN - currentSelectedCount));
    }

    // Return the final list, sorted
    return selected.sort((a, b) => a - b);
}


/**
 * Selects MCQs for a specific chapter *without* modifying the chapter data directly.
 * @param {object} chap - The chapter data object.
 * @param {number} n - Number of MCQs to select.
 * @returns {number[]} - Array of selected MCQ numbers, sorted.
 */
export function selectNewQuestionsAndUpdate(chap, n) {
    if (!chap || n <= 0 || !chap.available_questions || !Array.isArray(chap.available_questions)) {
        console.warn(`selectNewQuestions: Invalid chapter data or n=${n}.`);
        return [];
    }
    // Ensure we're working with a clean, sorted list of unique available questions
    const available = [...new Set(chap.available_questions)].sort((a, b) => a - b);

    // Use the selectItems logic to pick the questions
    let selected = selectItems(available, n, chap.total_questions);

    if (selected.length < n) {
         console.warn(`Chapter ${chap.number || 'Unknown'}: Selected only ${selected.length} MCQs out of requested ${n}.`);
     }

    // This function *only returns the selected questions*.
    // The calling function is responsible for updating the actual chapter data.
    return selected.sort((a, b) => a - b);
}


/**
 * Selects Problems for a specific chapter *without* modifying the chapter data directly.
 * @param {object} chap - The chapter data object.
 * @param {number} n - Number of Problems to select.
 * @returns {number[]} - Array of selected Problem numbers, sorted.
 */
export function selectNewProblemsAndUpdate(chap, n) {
    if (!chap || n <= 0 || !chap.available_problems || !Array.isArray(chap.available_problems)) {
        console.warn(`selectNewProblems: Invalid chapter data or n=${n}.`);
        return [];
    }
    // Ensure we're working with a clean, sorted list of unique available problems
    const available = [...new Set(chap.available_problems)].sort((a, b) => a - b);

    // Use the selectItems logic to pick the problems
    let selected = selectItems(available, n, chap.total_problems);

    if (selected.length < n) {
         console.warn(`Chapter ${chap.number || 'Unknown'}: Selected only ${selected.length} Problems out of requested ${n}.`);
     }

    // This function *only returns the selected problems*.
    // The calling function is responsible for updating the actual chapter data.
    return selected.sort((a, b) => a - b);
}
// --- END OF FILE test_logic.js ---