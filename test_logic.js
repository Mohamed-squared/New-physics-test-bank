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

export function allocateQuestions(chaptersToConsider, total_test_questions) {
    let weights = {};
    let chapterDetails = []; // Store details for easier processing

    // 1. Calculate weights for each chapter
    for (let chap_num in chaptersToConsider) {
        let chap = chaptersToConsider[chap_num];
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


// --- Question Selection ---

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
         console.warn(`Chapter ${chap.number || 'Unknown'}: Selected only ${selected.length} questions out of requested ${n}.`);
     }

    // This function *only returns the selected questions*.
    // The calling function (e.g., startTestGeneration) is responsible for updating
    // the actual chapter data (removing selected questions from available_questions)
    // after the test is finalized/submitted.
    return selected.sort((a, b) => a - b);
}