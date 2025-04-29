// --- START OF FILE markdown_parser.js ---

// --- Markdown Parsing ---

import { showLoading, hideLoading } from './utils.js'; // Assuming utils are needed somewhere, maybe not here directly

/**
 * Updates subject chapter data based on primary Markdown content (MCQs).
 * Resets available questions if total count changes.
 * Creates new chapter entries if found in MD but not in data.
 * Sets total questions to 0 if chapter exists in data but not MD.
 */
export function updateChaptersFromMarkdown(subject, mdContent) {
    if (!subject) { console.error("updateChaptersFromMarkdown: Subject undefined"); return false; }
    const parsedChapters = parseChaptersFromMarkdown(mdContent); // Only gets MCQ count
    const existingChapters = subject.chapters || {};
    const updatedChapters = {};
    // Combine keys from existing data and parsed data to process all relevant chapters
    const allKnownChapterNumbers = new Set([...Object.keys(existingChapters), ...Object.keys(parsedChapters)]);
    let changesMade = false;

    allKnownChapterNumbers.forEach(chapNum => {
        const parsedChapData = parsedChapters[chapNum];
        const existingChapData = existingChapters[chapNum];
        // Get total *MCQ* questions from the primary MD parse
        const newTotalMCQ = parsedChapData?.total_questions ?? 0;
        // Initialize total_problems - will be updated separately if problem parsing is done
        const existingTotalProblems = existingChapData?.total_problems ?? 0;

        let currentChapterData = {};
        let chapterChanged = false;

        if (existingChapData) {
            // Chapter exists in current data
            currentChapterData = { ...existingChapData }; // Start with existing data

            if (parsedChapData) {
                // Chapter also found in MD file
                // Update total_questions (MCQ count)
                if (currentChapterData.total_questions !== newTotalMCQ) {
                    console.log(`Ch ${chapNum}: Total MCQs changed ${currentChapterData.total_questions} -> ${newTotalMCQ}. Resetting available MCQs.`);
                    currentChapterData.total_questions = newTotalMCQ;
                    // Regenerate available MCQs list
                    currentChapterData.available_questions = Array.from({ length: newTotalMCQ }, (_, j) => j + 1);
                    chapterChanged = true;
                } else {
                    // Clean up existing available_questions list if count hasn't changed
                    currentChapterData.total_questions = newTotalMCQ; // Ensure it's set
                    const initialAvailable = currentChapterData.available_questions || [];
                    // Filter existing list to ensure numbers are valid and within newTotalMCQ range
                    currentChapterData.available_questions = [...new Set( (initialAvailable).filter(q => typeof q === 'number' && q > 0 && q <= newTotalMCQ) )].sort((a, b) => a - b);
                    if (JSON.stringify(initialAvailable.sort((a,b)=>a-b)) !== JSON.stringify(currentChapterData.available_questions)) {
                         console.log(`Ch ${chapNum}: Available MCQs list cleaned.`);
                         chapterChanged = true;
                    }
                }
                 // Keep existing problem count unless specifically updated elsewhere
                 currentChapterData.total_problems = existingTotalProblems;
                 currentChapterData.available_problems = currentChapterData.available_problems || Array.from({ length: existingTotalProblems }, (_, j) => j + 1);

            } else {
                // Chapter exists in data, but NOT found in MD file anymore
                if (currentChapterData.total_questions !== 0 || (currentChapterData.available_questions && currentChapterData.available_questions.length > 0)) {
                    console.warn(`Ch ${chapNum} not found in primary MD. Removing MCQ questions.`);
                    currentChapterData.total_questions = 0;
                    currentChapterData.available_questions = [];
                    chapterChanged = true;
                }
                 // Decide whether to remove problems too if primary MD is gone? Maybe keep them for now.
                 currentChapterData.total_problems = existingTotalProblems;
                 currentChapterData.available_problems = currentChapterData.available_problems || Array.from({ length: existingTotalProblems }, (_, j) => j + 1);
            }
        } else if (parsedChapData) {
            // Chapter exists ONLY in MD (new chapter)
            console.log(`Ch ${chapNum}: Found new chapter in primary MD (${newTotalMCQ} MCQs).`);
            currentChapterData = {
                total_questions: newTotalMCQ, // MCQ count
                available_questions: Array.from({ length: newTotalMCQ }, (_, j) => j + 1),
                total_problems: 0, // Initialize problem count
                available_problems: [],
                total_attempted: 0,
                total_wrong: 0,
                mistake_history: [],
                consecutive_mastery: 0
            };
            chapterChanged = true;
        }

        // Ensure essential fields exist AFTER potential modifications
        currentChapterData.total_attempted = currentChapterData.total_attempted ?? 0;
        currentChapterData.total_wrong = currentChapterData.total_wrong ?? 0;
        currentChapterData.mistake_history = currentChapterData.mistake_history ?? [];
        currentChapterData.consecutive_mastery = currentChapterData.consecutive_mastery ?? 0;
        currentChapterData.available_questions = currentChapterData.available_questions ?? [];
        currentChapterData.total_problems = currentChapterData.total_problems ?? 0;
        currentChapterData.available_problems = currentChapterData.available_problems ?? [];


        // Keep the chapter entry if it has questions, problems, or history
        if (currentChapterData.total_questions > 0 || currentChapterData.total_problems > 0 || Object.keys(currentChapterData).length > 0) {
             updatedChapters[chapNum] = currentChapterData;
        }
        if (chapterChanged) {
            changesMade = true;
        }
    });
    subject.chapters = updatedChapters;
    return changesMade;
}


/**
 * Updates subject chapter data with problem counts based on a separate Problems Markdown file.
 * Adds `total_problems` and `available_problems` to chapter data.
 */
export function updateChaptersWithProblems(subject, problemsMdContent) {
    if (!subject || !subject.chapters) { console.error("updateChaptersWithProblems: Subject or chapters undefined"); return false; }
    if (!problemsMdContent) { console.log("No problems MD content provided, skipping problem update."); return false; }

    const parsedProblems = parseProblemsFromMarkdown(problemsMdContent);
    let changesMade = false;

    // Iterate through chapters that have parsed problem counts
    for (const chapNum in parsedProblems) {
        const problemData = parsedProblems[chapNum];
        const newTotalProblems = problemData.total_problems ?? 0;

        if (subject.chapters[chapNum]) {
            // Chapter exists, update or initialize problem fields
            const currentTotalProblems = subject.chapters[chapNum].total_problems ?? 0;

            if (currentTotalProblems !== newTotalProblems) {
                console.log(`Ch ${chapNum}: Total Problems changed ${currentTotalProblems} -> ${newTotalProblems}. Resetting available problems.`);
                subject.chapters[chapNum].total_problems = newTotalProblems;
                subject.chapters[chapNum].available_problems = Array.from({ length: newTotalProblems }, (_, j) => j + 1);
                changesMade = true;
            } else {
                 // Ensure available_problems list is initialized and cleaned if count matches
                 subject.chapters[chapNum].total_problems = newTotalProblems; // Ensure it's set
                 const initialAvailable = subject.chapters[chapNum].available_problems || [];
                 subject.chapters[chapNum].available_problems = [...new Set( (initialAvailable).filter(p => typeof p === 'number' && p > 0 && p <= newTotalProblems) )].sort((a, b) => a - b);
                 if (JSON.stringify(initialAvailable.sort((a,b)=>a-b)) !== JSON.stringify(subject.chapters[chapNum].available_problems)) {
                     console.log(`Ch ${chapNum}: Available Problems list cleaned.`);
                     changesMade = true;
                 } else if (subject.chapters[chapNum].available_problems === undefined) {
                     // Initialize if it was completely missing
                     subject.chapters[chapNum].available_problems = Array.from({ length: newTotalProblems }, (_, j) => j + 1);
                     changesMade = true;
                 }
            }
        } else {
            // Chapter doesn't exist in subject.chapters yet (maybe only has problems?)
            // Create it with only problem data for now
            console.log(`Ch ${chapNum}: Found new chapter in problems MD (${newTotalProblems} problems). Adding.`);
            subject.chapters[chapNum] = {
                total_questions: 0,
                available_questions: [],
                total_problems: newTotalProblems,
                available_problems: Array.from({ length: newTotalProblems }, (_, j) => j + 1),
                total_attempted: 0,
                total_wrong: 0,
                mistake_history: [],
                consecutive_mastery: 0
            };
            changesMade = true;
        }
    }

    // Iterate through existing chapters to set problem count to 0 if not in problems MD
    for (const chapNum in subject.chapters) {
        if (!parsedProblems[chapNum]) {
            if (subject.chapters[chapNum].total_problems !== 0 || (subject.chapters[chapNum].available_problems && subject.chapters[chapNum].available_problems.length > 0)) {
                console.warn(`Ch ${chapNum} not found in problems MD. Setting problem count to 0.`);
                subject.chapters[chapNum].total_problems = 0;
                subject.chapters[chapNum].available_problems = [];
                changesMade = true;
            } else {
                 // Ensure fields exist even if 0
                 subject.chapters[chapNum].total_problems = 0;
                 subject.chapters[chapNum].available_problems = [];
            }
        }
    }

    return changesMade;
}

/**
 * Parses primary Markdown content to count the number of MCQs per chapter.
 * Assumes MCQs start with "Number." or "Number)"
 */
export function parseChaptersFromMarkdown(mdContent) {
    console.log("--- Parsing MD for MCQ Chapters ---");
    if (!mdContent) { console.error("parseChaptersFromMarkdown: null mdContent."); return {}; }
    const chapters = {};
    let currentChapterNum = null;
    let questionCount = 0;
    const lines = mdContent.split('\n');
    const chapterRegex = /^\s*###\s+Chapter\s+(\d+):?.*?$/i;
    // Regex for standard questions (MCQs)
    const questionRegex = /^\s*\d+[\.\)]\s+.*/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        const chapterMatch = trimmedLine.match(chapterRegex);

        if (chapterMatch) {
            // Finalize count for the previous chapter
            if (currentChapterNum !== null) {
                if (!chapters[currentChapterNum]) chapters[currentChapterNum] = {};
                chapters[currentChapterNum].total_questions = questionCount;
            }
            // Start new chapter
            currentChapterNum = chapterMatch[1];
            questionCount = 0; // Reset MCQ count
            if (!chapters[currentChapterNum]) {
                chapters[currentChapterNum] = { total_questions: 0 };
            }
        } else if (currentChapterNum !== null && questionRegex.test(line)) {
            // Increment MCQ count if it matches the question pattern
            questionCount++;
        }
    }
    // Finalize count for the very last chapter
    if (currentChapterNum !== null) {
        if (!chapters[currentChapterNum]) chapters[currentChapterNum] = {};
        chapters[currentChapterNum].total_questions = questionCount;
    }

    if (Object.keys(chapters).length === 0) {
        console.error("ERROR: No chapters parsed from primary MD. Check format (e.g., '### Chapter 1: Title').");
    } else {
        console.log(`Parsed ${Object.keys(chapters).length} chapters (MCQ counts).`);
    }
    console.log("--- Finished Parsing MD for MCQ Chapters ---");
    return chapters;
}

/**
 * Parses secondary Problems Markdown content to count the number of problems per chapter.
 * Assumes problems start with "Problem X." or similar.
 */
export function parseProblemsFromMarkdown(problemsMdContent) {
    console.log("--- Parsing MD for Problems ---");
    if (!problemsMdContent) { console.error("parseProblemsFromMarkdown: null problemsMdContent."); return {}; }
    const chapters = {};
    let currentChapterNum = null;
    let problemCount = 0;
    const lines = problemsMdContent.split('\n');
    const chapterRegex = /^\s*###\s+Chapter\s+(\d+):?.*?$/i; // Same chapter marker
    // Regex specifically for problems (adjust if needed)
    const problemRegex = /^\s*(?:Problem|P)\s*(\d+)[\.\:\-\)]\s*.*/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        const chapterMatch = trimmedLine.match(chapterRegex);

        if (chapterMatch) {
            // Finalize count for the previous chapter
            if (currentChapterNum !== null) {
                if (!chapters[currentChapterNum]) chapters[currentChapterNum] = {};
                chapters[currentChapterNum].total_problems = problemCount;
            }
            // Start new chapter
            currentChapterNum = chapterMatch[1];
            problemCount = 0; // Reset problem count
            if (!chapters[currentChapterNum]) {
                chapters[currentChapterNum] = { total_problems: 0 };
            }
        } else if (currentChapterNum !== null && problemRegex.test(line)) {
            // Increment problem count if it matches the problem pattern
            problemCount++;
        }
    }
    // Finalize count for the very last chapter
    if (currentChapterNum !== null) {
        if (!chapters[currentChapterNum]) chapters[currentChapterNum] = {};
        chapters[currentChapterNum].total_problems = problemCount;
    }

    if (Object.keys(chapters).length === 0) {
        console.warn("WARN: No chapters parsed from Problems MD. Check format (e.g., '### Chapter 1: Title', 'Problem 1. Text').");
    } else {
        console.log(`Parsed ${Object.keys(chapters).length} chapters (Problem counts).`);
    }
    console.log("--- Finished Parsing MD for Problems ---");
    return chapters;
}


/**
 * Extracts specific questions (MCQs) and problems from their respective Markdown contents.
 *
 * @param {string|null} mcqMdContent - Markdown content containing MCQs.
 * @param {string|null} problemsMdContent - Markdown content containing problems.
 * @param {object} selectedItemsMap - Map where keys are chapter numbers and values are objects like { questions: [num1, num2], problems: [num3, num4] }.
 * @returns {object} - { questions: [], problems: [], answers: {} } where 'questions' contains MCQs, 'problems' contains problem items, 'answers' contains MCQ answers.
 */
export function extractItemsFromMarkdown(mcqMdContent, problemsMdContent, selectedItemsMap) {
    const extracted = { questions: [], problems: [], answers: {} }; // Separate questions and problems
    if ((!mcqMdContent && !problemsMdContent) || !selectedItemsMap || Object.keys(selectedItemsMap).length === 0) {
        console.error("Invalid args for extractItemsFromMarkdown. Need content and selection map.");
        return extracted;
    }

    // Helper function to parse a single markdown file for specific item numbers
    const parseFileContent = (mdContent, itemType, chapterNum, selectedNumbers) => {
        if (!mdContent || !selectedNumbers || selectedNumbers.length === 0) return;

        const lines = mdContent.split('\n');
        let currentItem = null;
        let processingState = 'seeking_item'; // seeking_item, in_item_text, in_options (for mcq)
        const itemStartRegex = itemType === 'mcq'
            ? /^\s*(\d+)\s*[\.\)]\s*(.*)/ // MCQ: Number.) Text
            : /^\s*(?:Problem|P)\s*(\d+)[\.\:\-\)]\s*(.*)/i; // Problem: Problem N.) Text
        const optionRegex = /^\s*([A-Za-z])[\.\)\-]\s*(.*)/; // Options: Letter.) Text (more flexible)
        const answerRegex = /(?:ans|answer)\s*:\s*([a-zA-Z\d])\s*$/i; // Answer: ans: A
        const imageMarkdownRegex = /!\[(.*?)\]\((.*?)\)/g;

        const finalizeItem = () => {
            if (currentItem) {
                const itemId = `c${chapterNum}${itemType === 'mcq' ? 'q' : 'p'}${currentItem.number}`;
                let rawText = currentItem.textLines.join('\n').trim();
                let imageUrl = null;

                // Extract image URL and remove markdown from text
                const imgMatches = rawText.match(imageMarkdownRegex); // Find all image matches
                if (imgMatches) {
                    // For simplicity, take the first image found. Could be adapted to store multiple.
                    const firstMatch = imgMatches[0].match(/!\[.*?\]\((.*?)\)/);
                    if (firstMatch && firstMatch[1]) {
                         imageUrl = firstMatch[1];
                    }
                     // Remove ALL image markdown from the text
                     rawText = rawText.replace(imageMarkdownRegex, '').trim();
                }


                if (itemType === 'mcq') {
                    let answer = null;
                    // Extract answer if present
                    if (currentItem.answerLine) {
                        const m = currentItem.answerLine.match(answerRegex);
                        if (m) answer = m[1].toUpperCase();
                        // Remove answer line from text if it's the last line
                        // Check carefully if answer line is indeed the last element of textLines AFTER potential image removal
                        const potentialAnswerLineIndex = currentItem.textLines.findIndex(line => line.trim() === currentItem.answerLine);
                         if (potentialAnswerLineIndex === currentItem.textLines.length - 1) {
                           currentItem.textLines.pop();
                           rawText = currentItem.textLines.join('\n').trim(); // Update rawText if answer line was removed
                         } else if (potentialAnswerLineIndex !== -1) {
                            console.warn(`Answer line found but not at the end for ${itemId}. Text might include it.`);
                         }
                    }
                    const formattedOptions = currentItem.options.map(opt => ({ letter: opt.letter, text: opt.text.trim() }));
                    extracted.questions.push({
                        id: itemId, type: 'mcq', chapter: String(chapterNum), number: currentItem.number,
                        text: rawText, options: formattedOptions, image: imageUrl, answer: answer
                    });
                    if (answer) extracted.answers[itemId] = answer;
                    else console.warn(`MCQ Answer missing for ${itemId}.`);
                } else { // Problem type
                    extracted.problems.push({
                        id: itemId, type: 'problem', chapter: String(chapterNum), number: currentItem.number,
                        text: rawText, image: imageUrl
                    });
                }
            }
            currentItem = null;
        };

        // Find the start of the target chapter
        let inTargetChapter = false;
        const chapterRegex = /^###\s+Chapter\s+(\d+):?.*?$/i;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            const chapterMatch = trimmedLine.match(chapterRegex);

            if (chapterMatch) {
                finalizeItem(); // Finalize any item from the previous chapter
                const currentChapNumFromFile = chapterMatch[1];
                inTargetChapter = (currentChapNumFromFile === String(chapterNum));
                processingState = 'seeking_item'; // Reset state when chapter changes
                continue; // Move to next line
            }

            if (!inTargetChapter) continue; // Skip lines until the target chapter is found

            const itemMatch = line.match(itemStartRegex);
            const optionMatch = trimmedLine.match(optionRegex);
            const isPotentialAnswerLine = answerRegex.test(trimmedLine);

            if (itemMatch) {
                finalizeItem(); // Finalize previous item
                const itemNum = parseInt(itemMatch[1], 10);
                const firstLineText = itemMatch[2];

                // Check if this item number is in the selected list for this chapter/type
                if (selectedNumbers.includes(itemNum)) {
                    currentItem = {
                        number: itemNum,
                        textLines: [firstLineText],
                        options: [], // Only relevant for MCQs
                        answerLine: null // Only relevant for MCQs
                    };
                    processingState = 'in_item_text';
                } else {
                    processingState = 'seeking_item'; // Not selected, keep seeking
                    currentItem = null;
                }
                continue; // Move to next line after processing item start
            }

            // Process lines belonging to the current selected item
            if (currentItem) {
                if (itemType === 'mcq') {
                    if (optionMatch) {
                        processingState = 'in_options';
                        currentItem.options.push({ letter: optionMatch[1].toUpperCase(), text: optionMatch[2] });
                        continue;
                    }
                    if (isPotentialAnswerLine && processingState === 'in_options') {
                        // Check if this answer line likely belongs to the current question
                         let nextLineIndex = i + 1; let nextSignificantLine = null; while(nextLineIndex < lines.length) { nextSignificantLine = lines[nextLineIndex].trim(); if(nextSignificantLine !== '') break; nextLineIndex++; }
                         // FIX: Corrected variable name typo nextIsNewQuestion -> nextIsNewItem
                         const nextIsNewItem = nextSignificantLine && itemStartRegex.test(nextSignificantLine);
                         const nextIsNewChapter = nextSignificantLine && chapterRegex.test(nextSignificantLine);
                         const isLastLine = nextLineIndex >= lines.length;

                        // Assume it's the answer if it's the last line, or followed by new item/chapter
                        if (!nextSignificantLine || nextIsNewItem || nextIsNewChapter || isLastLine) {
                            currentItem.answerLine = trimmedLine;
                            processingState = 'found_answer';
                        } else {
                             // Likely part of the last option's text
                             if (currentItem.options.length > 0) {
                                 currentItem.options[currentItem.options.length - 1].text += '\n' + line;
                             } else { // Or question text if options haven't started? Unlikely but possible.
                                 currentItem.textLines.push(line);
                             }
                        }
                        continue;
                    }
                } // End MCQ specific logic

                // Append to text if not an option/answer (or if it's a problem)
                if (processingState === 'in_item_text') {
                    currentItem.textLines.push(line);
                } else if (processingState === 'in_options' && currentItem.options.length > 0 && itemType === 'mcq') {
                    // Append multi-line options
                    currentItem.options[currentItem.options.length - 1].text += '\n' + line;
                } else if (processingState === 'found_answer') {
                    // Ignore lines after the answer line until a new item starts
                } else if (processingState !== 'seeking_item') { // Avoid appending random lines between items
                    // Default: append to text (especially for problems or question text before options)
                     currentItem.textLines.push(line);
                }
            } // End if (currentItem)
        }
        finalizeItem(); // Finalize the last item of the chapter
    };

    // Iterate through the selection map and parse relevant files/chapters
    for (const chapterNum in selectedItemsMap) {
        const selections = selectedItemsMap[chapterNum];
        if (selections.questions && selections.questions.length > 0) {
            parseFileContent(mcqMdContent, 'mcq', chapterNum, selections.questions);
        }
        if (selections.problems && selections.problems.length > 0) {
            parseFileContent(problemsMdContent, 'problem', chapterNum, selections.problems);
        }
    }

    console.log(`Extraction finished. Found ${extracted.questions.length} MCQs and ${extracted.problems.length} Problems.`);
    const totalSelectedMCQs = Object.values(selectedItemsMap).reduce((sum, sel) => sum + (sel.questions?.length || 0), 0);
    const totalSelectedProblems = Object.values(selectedItemsMap).reduce((sum, sel) => sum + (sel.problems?.length || 0), 0);
    if (extracted.questions.length < totalSelectedMCQs) { console.warn(`Extraction Warning: Selected ${totalSelectedMCQs} MCQs but only extracted ${extracted.questions.length}.`); }
    if (extracted.problems.length < totalSelectedProblems) { console.warn(`Extraction Warning: Selected ${totalSelectedProblems} Problems but only extracted ${extracted.problems.length}.`); }

    return extracted;
}


// --- Skip Exam Text Parser (Improved Robustness) ---
// (Keep this function as is, it's for AI-generated exams which might be MCQ only or mixed)
export function parseSkipExamText(rawText, chapterNum) {
    if (!rawText || !chapterNum) { console.error("parseSkipExamText: Missing args."); return null; }
    console.log(`Parsing Skip Exam Text for Chapter ${chapterNum}...`);
    const extracted = { questions: [], problems: [], answers: {} }; // Prepare for both
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let currentItem = null; // Can be question or problem
    let itemNumFromText = 0;
    let textBuffer = [];
    let optionsBuffer = []; // For MCQs
    let answerLineBuffer = null; // For MCQs
    let itemType = null; // 'mcq' or 'problem'

    // Regex (allow optional space after marker, make case insensitive)
    const mcqStartRegex = /^\s*(\d+)\s*[\.\)]\s*(.*)/i;
    const problemStartRegex = /^\s*(?:Problem|P)\s*(\d+)[\.\:\-\)]\s*(.*)/i;
    const optionRegex = /^\s*([A-Da-d])\s*[\.\)]\s*(.*)/i; // Only A-D expected now
    const answerRegex = /^\s*(?:ans|answer)\s*:\s*([A-Da-d])\s*$/i;

    function finalizeCurrentItem() {
        if (itemNumFromText > 0 && textBuffer.length > 0) {
             const itemIdBase = `c${chapterNum}`;
             const itemText = textBuffer.join(' ').trim();

             if (itemType === 'mcq' && optionsBuffer.length >= 2 && answerLineBuffer) {
                 const answerMatch = answerLineBuffer.match(answerRegex);
                 const answer = answerMatch ? answerMatch[1].toUpperCase() : null;
                 if (answer) {
                     const itemId = `${itemIdBase}q${itemNumFromText}`;
                     extracted.questions.push({
                         id: itemId, type: 'mcq', chapter: String(chapterNum), number: itemNumFromText,
                         text: itemText, options: optionsBuffer.map(opt => ({ letter: opt.letter, text: opt.text.trim() })),
                         image: null, answer: answer
                     });
                     extracted.answers[itemId] = answer;
                 } else { console.warn(`Discarding MCQ block ${itemNumFromText}: Invalid or missing answer line.`); }
             } else if (itemType === 'problem') {
                  const itemId = `${itemIdBase}p${itemNumFromText}`;
                  extracted.problems.push({
                      id: itemId, type: 'problem', chapter: String(chapterNum), number: itemNumFromText,
                      text: itemText, image: null
                  });
             } else if (itemType === 'mcq') {
                  console.warn(`Discarding incomplete MCQ block ${itemNumFromText}: Missing options or answer line.`);
             } else {
                  console.warn(`Discarding unknown/incomplete item block ${itemNumFromText}.`);
             }
        }
        // Reset buffers
        currentItem = null; itemNumFromText = 0; textBuffer = []; optionsBuffer = []; answerLineBuffer = null; itemType = null;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const mcqMatch = line.match(mcqStartRegex);
        const problemMatch = line.match(problemStartRegex);
        const optionMatch = line.match(optionRegex);
        const answerMatch = line.match(answerRegex);

        if (mcqMatch) {
            finalizeCurrentItem(); // Finalize previous before starting new
            itemType = 'mcq';
            itemNumFromText = parseInt(mcqMatch[1]);
            textBuffer = [mcqMatch[2].trim()]; // Start with first line of text
        } else if (problemMatch) {
             finalizeCurrentItem(); // Finalize previous
             itemType = 'problem';
             itemNumFromText = parseInt(problemMatch[1]);
             textBuffer = [problemMatch[2].trim()];
        } else if (optionMatch && itemType === 'mcq' && itemNumFromText > 0) {
            // Found an option for the current MCQ
            optionsBuffer.push({ letter: optionMatch[1].toUpperCase(), text: optionMatch[2].trim() });
            answerLineBuffer = null; // Reset answer buffer if options are found after it
        } else if (answerMatch && itemType === 'mcq' && itemNumFromText > 0 && optionsBuffer.length > 0) {
            // Found potential answer line *after* options for an MCQ
            answerLineBuffer = line;
            // Don't finalize yet, wait for next item or end of file
        } else if (itemNumFromText > 0) { // Belongs to the current item block
            if (itemType === 'mcq' && optionsBuffer.length > 0 && !answerLineBuffer) {
                // Append to the text of the LAST option if no answer yet seen
                optionsBuffer[optionsBuffer.length - 1].text += ' ' + line;
            } else if (!answerLineBuffer) { // Append to item text (MCQ before options, or Problem text)
                textBuffer.push(line);
            }
            // Ignore lines after a potential answer line until a new item starts
        }
    }
    finalizeCurrentItem(); // Finalize the very last item block

    console.log(`Parsed ${extracted.questions.length} MCQs and ${extracted.problems.length} Problems from Skip Exam text.`);
    if (extracted.questions.length === 0 && extracted.problems.length === 0 && lines.length > 5) {
        console.error("Parsing failed: Extracted 0 items. Check AI output format.");
        return null; // Indicate failure
    }

    // Return structure with both questions and problems
    return extracted;
}


// --- END OF FILE markdown_parser.js ---