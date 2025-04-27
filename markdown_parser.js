

// --- Markdown Parsing ---

import { showLoading, hideLoading } from './utils.js'; // Assuming utils are needed somewhere, maybe not here directly

export function updateChaptersFromMarkdown(subject, mdContent) {
    if (!subject) {
        console.error("updateChaptersFromMarkdown: Subject is undefined");
        return false; // Indicate no changes made
    }
    const parsedChapters = parseChaptersFromMarkdown(mdContent);
    const existingChapters = subject.chapters || {};
    const updatedChapters = {};
    const allKnownChapterNumbers = new Set([...Object.keys(existingChapters), ...Object.keys(parsedChapters)]);
    let changesMade = false;

    allKnownChapterNumbers.forEach(chapNum => {
        const parsedChapData = parsedChapters[chapNum];
        const existingChapData = existingChapters[chapNum];
        const newTotal = parsedChapData?.total_questions ?? 0;

        let currentChapterData = {};
        let chapterChanged = false;

        if (existingChapData) {
            currentChapterData = { ...existingChapData };
            if (parsedChapData) {
                // Chapter exists in both: Update total and available list if needed
                if (currentChapterData.total_questions !== newTotal) {
                    console.log(`Chapter ${chapNum}: Total questions changed from ${currentChapterData.total_questions} to ${newTotal}. Resetting available questions.`);
                    currentChapterData.total_questions = newTotal;
                    // Reset available questions to all questions for this chapter
                    currentChapterData.available_questions = Array.from({ length: newTotal }, (_, j) => j + 1);
                    chapterChanged = true;
                } else {
                    // Total questions unchanged, validate existing available list
                    currentChapterData.total_questions = newTotal; // Ensure it's set
                    const initialAvailable = currentChapterData.available_questions || [];
                    // Filter out invalid numbers and duplicates
                    currentChapterData.available_questions = [...new Set(
                        (initialAvailable)
                            .filter(q => typeof q === 'number' && q > 0 && q <= newTotal)
                    )].sort((a, b) => a - b);

                    // Check if the list actually changed after filtering/sorting
                    if (JSON.stringify(initialAvailable.sort((a,b)=>a-b)) !== JSON.stringify(currentChapterData.available_questions)) {
                         console.log(`Chapter ${chapNum}: Available questions list cleaned/validated.`);
                         chapterChanged = true;
                    }
                }
            } else {
                // Chapter exists in data but NOT in Markdown: Mark as having 0 questions
                 if (currentChapterData.total_questions !== 0 || (currentChapterData.available_questions && currentChapterData.available_questions.length > 0)) {
                    console.warn(`Chapter ${chapNum} exists in data but not found in the Markdown file. Removing questions.`);
                    currentChapterData.total_questions = 0;
                    currentChapterData.available_questions = [];
                    chapterChanged = true;
                 }
            }
        } else if (parsedChapData) {
            // Chapter exists ONLY in Markdown: Add it as new
            console.log(`Chapter ${chapNum}: Found new chapter in Markdown with ${newTotal} questions.`);
            currentChapterData = {
                total_questions: newTotal,
                total_attempted: 0,
                total_wrong: 0,
                available_questions: Array.from({ length: newTotal }, (_, j) => j + 1),
                mistake_history: [],
                consecutive_mastery: 0
            };
            chapterChanged = true;
        }

        // Ensure essential fields exist
        currentChapterData.total_attempted = currentChapterData.total_attempted ?? 0;
        currentChapterData.total_wrong = currentChapterData.total_wrong ?? 0;
        currentChapterData.mistake_history = currentChapterData.mistake_history ?? [];
        currentChapterData.consecutive_mastery = currentChapterData.consecutive_mastery ?? 0;
        currentChapterData.available_questions = currentChapterData.available_questions ?? [];

        // Only add chapter if it has data or questions
         if (Object.keys(currentChapterData).length > 0 || newTotal > 0) {
              updatedChapters[chapNum] = currentChapterData;
         }
         if (chapterChanged) {
             changesMade = true;
         }
    });

    subject.chapters = updatedChapters; // Update the subject object directly
    return changesMade; // Return whether changes occurred
}

export function parseChaptersFromMarkdown(mdContent) {
    console.log("--- Inside parseChaptersFromMarkdown ---");
    if (!mdContent) {
        console.error("parseChaptersFromMarkdown received null or empty mdContent.");
        return {};
    }
    console.log(`Parsing MD content (Length: ${mdContent.length}, Start):\n`, mdContent.substring(0, 500));

    const chapters = {};
    let currentChapterNum = null;
    let questionCount = 0;
    const lines = mdContent.split('\n');
    // Regex to find "### Chapter <number>[: anything]"
    const chapterRegex = /^\s*###\s+Chapter\s+(\d+):?.*?$/i;
    // Regex to find a line starting with a number, period/paren, then space (question start)
    const questionRegex = /^\s*\d+[\.\)]\s+.*/;

    console.log(`Checking ${lines.length} lines against regex: ${chapterRegex}`);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Logging for debug
        // if (i < 10 || i % 50 === 0 || line.startsWith('#')) {
        //      console.log(`Line ${i+1}: "${line}" (Trimmed: "${trimmedLine}")`);
        // }

        const chapterMatch = trimmedLine.match(chapterRegex);
        if (chapterMatch) {
            // console.log(`>>> Regex MATCHED Chapter on Line ${i+1}: "${line}"`);
            // Finalize count for the previous chapter (if any)
            if (currentChapterNum !== null) {
                if (!chapters[currentChapterNum]) chapters[currentChapterNum] = {};
                chapters[currentChapterNum].total_questions = questionCount;
            }
            // Start new chapter
            currentChapterNum = chapterMatch[1];
            questionCount = 0; // Reset count for the new chapter
            if (!chapters[currentChapterNum]) {
                 chapters[currentChapterNum] = { total_questions: 0 }; // Initialize if not seen before
            }
        } else if (currentChapterNum !== null && questionRegex.test(line)) {
            // If we are inside a chapter and find a question line, increment count
            questionCount++;
        }
    }

    // Finalize count for the last chapter in the file
    if (currentChapterNum !== null) {
         if (!chapters[currentChapterNum]) chapters[currentChapterNum] = {};
         chapters[currentChapterNum].total_questions = questionCount;
    }

    if (Object.keys(chapters).length === 0) {
        console.error("ERROR: No chapters were parsed. Check chapterRegex and MD format (e.g., '### Chapter 1: Title').");
    } else {
        console.log(`Parsed ${Object.keys(chapters).length} chapters successfully.`);
        // console.log("Parsed chapter data:", chapters); // Optional: log the result
    }
    console.log("--- Exiting parseChaptersFromMarkdown ---");
    return chapters;
}

export function extractQuestionsFromMarkdown(mdContent, selectedQuestionsMap) {
    const extracted = {
        questions: [], // { id, chapter, number, text, options: [{letter: 'A', text: '...'}], image, answer }
        answers: {}    // { "c<chapter>q<question>": "A", ... }
    };
    if (!mdContent || !selectedQuestionsMap || Object.keys(selectedQuestionsMap).length === 0) {
        console.error("Markdown content or selection map invalid for extraction.");
        return extracted;
    }

    const lines = mdContent.split('\n');
    let currentChapter = null;
    let currentQuestion = null; // Holds the question object being built
    let processingState = 'seeking_chapter'; // 'seeking_chapter', 'seeking_question', 'in_question_text', 'in_options', 'found_answer'

    // Regex definitions
    const chapterRegex = /^###\s+Chapter\s+(\d+):?.*?$/i;
    const questionStartRegex = /^\s*(\d+)\s*[\.\)]\s*(.*)/; // Capture number and first line text
    const optionRegex = /^\s*([A-Ea-e])[\.\)]\s*(.*)/; // Capture option letter and text
    const answerRegex = /(?:ans|answer)\s*:\s*([a-zA-Z\d])\s*$/i; // Capture answer letter/digit
    const imageMarkdownRegex = /!\[(.*?)\]\((.*?)\)/g; // Capture image URL

    function finalizeQuestion() {
        if (currentQuestion && currentChapter) {
            const questionId = `c${currentChapter}q${currentQuestion.number}`;
            let rawText = currentQuestion.textLines.join('\n').trim();
            let answer = null;
            let imageUrl = null;

            // Process potential answer line
            if (currentQuestion.answerLine) {
                const answerMatch = currentQuestion.answerLine.match(answerRegex);
                if (answerMatch) {
                    answer = answerMatch[1].toUpperCase();
                }
                // Remove the answer line from the question text if it's the last line
                if (currentQuestion.textLines.length > 0 && currentQuestion.textLines[currentQuestion.textLines.length - 1]?.trim() === currentQuestion.answerLine) {
                     currentQuestion.textLines.pop();
                     rawText = currentQuestion.textLines.join('\n').trim(); // Update rawText
                }
            }

            // Extract first image URL and remove all image markdown from text
            const firstImageMatch = rawText.match(/!\[(.*?)\]\((.*?)\)/);
             if (firstImageMatch) {
                 imageUrl = firstImageMatch[2];
                 rawText = rawText.replace(imageMarkdownRegex, '').trim(); // Remove ALL image tags
             }

            // Format options
            const formattedOptions = currentQuestion.options.map(opt => ({
                letter: opt.letter,
                text: opt.text.trim() // Trim whitespace from option text
            }));

            // Add to extracted data
            extracted.questions.push({
                id: questionId,
                chapter: currentChapter, // Store as string
                number: currentQuestion.number, // Store as number
                text: rawText, // Cleaned text
                options: formattedOptions,
                image: imageUrl, // Extracted image URL
                answer: answer    // Extracted answer
            });

            // Store answer separately
            if (answer) {
                extracted.answers[questionId] = answer;
            } else {
                console.warn(`Answer not found for Q ${questionId} (Line: ${currentQuestion.answerLine || 'N/A'}). Check format 'ans: X'.`);
            }
        }
        currentQuestion = null; // Reset for next question
    }

    // Iterate through lines
     for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Attempt to match line types
        const chapterMatch = trimmedLine.match(chapterRegex);
        const questionMatch = line.match(questionStartRegex); // Use original line for question num at start
        const optionMatch = trimmedLine.match(optionRegex);
        const isPotentialAnswerLine = answerRegex.test(trimmedLine);

        // --- State Machine Logic ---

        if (chapterMatch) {
            finalizeQuestion(); // Finalize previous question before starting new chapter
            currentChapter = chapterMatch[1]; // Keep chapter as string
            processingState = 'seeking_question';
            continue;
        }

        if (processingState === 'seeking_chapter') continue; // Skip lines until a chapter is found

        if (questionMatch) {
            finalizeQuestion(); // Finalize previous question
            const qNum = parseInt(questionMatch[1], 10);
            const firstLineText = questionMatch[2];
            const chapterKey = String(currentChapter); // Ensure string for map key

            // Check if this question is selected for the current chapter
            if (selectedQuestionsMap[chapterKey] && selectedQuestionsMap[chapterKey].includes(qNum)) {
                // Start building the new question object
                currentQuestion = {
                    number: qNum, // Store as number
                    textLines: [firstLineText], // Start with the first line
                    options: [],
                    answerLine: null
                };
                processingState = 'in_question_text'; // We are now processing the text of this question
            } else {
                // Question not selected, remain in seeking state
                processingState = 'seeking_question';
                currentQuestion = null;
            }
            continue; // Move to next line
        }

        // If we are currently building a question object
        if (currentQuestion) {
            if (optionMatch) {
                // Found an option line
                processingState = 'in_options';
                currentQuestion.options.push({
                    letter: optionMatch[1].toUpperCase(),
                    text: optionMatch[2] // Store initial option text
                });
                continue; // Move to next line
            }

             // Check for the answer line - this is a bit tricky
             if (isPotentialAnswerLine) {
                  // Look ahead to see if the *next* non-empty line is a new question or chapter
                  let nextLineIndex = i + 1;
                  let nextSignificantLine = null;
                  while(nextLineIndex < lines.length) {
                       nextSignificantLine = lines[nextLineIndex].trim();
                       if(nextSignificantLine !== '') break; // Found next non-empty line
                       nextLineIndex++;
                  }

                  const nextIsNewQuestion = nextSignificantLine && /^\s*\d+[\.\)]\s+.*/.test(nextSignificantLine);
                  const nextIsNewChapter = nextSignificantLine && /^###\s+Chapter\s+\d+:?.*?$/i.test(nextSignificantLine);
                  const isLastLineOfFile = nextLineIndex >= lines.length; // Reached end of file

                 // If the next line is empty, a new question, a new chapter, or end of file, assume this is the answer
                 if (nextSignificantLine === null || nextIsNewQuestion || nextIsNewChapter || isLastLineOfFile) {
                     currentQuestion.answerLine = trimmedLine;
                     processingState = 'found_answer'; // Mark answer as found
                 } else {
                     // Not the answer line, treat as continuation of previous text/option
                      if (processingState === 'in_options' && currentQuestion.options.length > 0) {
                          // Append to the last option's text
                          currentQuestion.options[currentQuestion.options.length - 1].text += '\n' + line;
                      } else {
                          // Append to the question text
                          currentQuestion.textLines.push(line);
                      }
                 }
                 continue; // Move to next line
             }

             // If not a chapter, question, option, or answer, it's continuation text
             if (processingState === 'in_options' && currentQuestion.options.length > 0) {
                 // Append to the last option's text
                 currentQuestion.options[currentQuestion.options.length - 1].text += '\n' + line;
             } else if (processingState !== 'found_answer') { // Avoid adding lines after answer found
                 // Append to the question text
                 currentQuestion.textLines.push(line);
             }
        }
    }
    finalizeQuestion(); // Finalize the last question in the file

    console.log(`Extraction finished. Found ${extracted.questions.length} questions.`);
    const totalSelectedCount = Object.values(selectedQuestionsMap).reduce((sum, arr) => sum + arr.length, 0);
    if (extracted.questions.length === 0 && totalSelectedCount > 0) {
        console.error("Extraction Error: Selected questions but extracted none. Check Regex and MD format near selected questions.");
    } else if (extracted.questions.length < totalSelectedCount) {
         console.warn(`Extraction Warning: Selected ${totalSelectedCount} questions but only extracted ${extracted.questions.length}. Check formatting.`);
    }

    return extracted;
}


// --- NEW: Skip Exam Text Parser ---
/**
 * Parses raw text (expected from AI) into structured questions and answers.
 * @param {string} rawText - The text generated by the AI for the skip exam.
 * @param {string|number} chapterNum - The chapter number this exam is for.
 * @returns {{ questions: Array, answers: Object } | null} - Extracted data or null on failure.
 */
export function parseSkipExamText(rawText, chapterNum) {
    if (!rawText || !chapterNum) {
        console.error("parseSkipExamText: Missing raw text or chapter number.");
        return null;
    }
    console.log(`Parsing Skip Exam Text for Chapter ${chapterNum}...`);

    const extracted = {
        questions: [],
        answers: {}
    };
    const lines = rawText.split('\n');
    let currentQuestion = null;
    let questionNumberCounter = 0; // Use internal counter for numbering

    // Regex definitions (similar to extractQuestionsFromMarkdown, but simpler structure expected)
    const questionStartRegex = /^\s*(\d+)\s*[\.\)]\s*(.*)/; // Capture number and first line text
    const optionRegex = /^\s*([A-Ea-e])[\.\)]\s*(.*)/; // Capture option letter and text
    const answerRegex = /(?:ans|answer)\s*:\s*([a-zA-Z\d])\s*$/i; // Capture answer letter/digit

    function finalizeCurrentQuestion() {
        if (currentQuestion) {
            const qNum = currentQuestion.number; // Use the number parsed from the AI text
             const questionId = `c${chapterNum}q${qNum}`; // Create ID using actual chapter
             let rawText = currentQuestion.textLines.join('\n').trim();
             let answer = null;

            // Process potential answer line (assume it's the last line added if present)
            if (currentQuestion.answerLine) {
                const answerMatch = currentQuestion.answerLine.match(answerRegex);
                if (answerMatch) {
                    answer = answerMatch[1].toUpperCase();
                    // Remove answer line from text if it was the last line added
                    if (currentQuestion.textLines.length > 0 && currentQuestion.textLines[currentQuestion.textLines.length - 1]?.trim() === currentQuestion.answerLine) {
                         currentQuestion.textLines.pop();
                         rawText = currentQuestion.textLines.join('\n').trim();
                    }
                }
            }

            // Simple validation
            if (!rawText || currentQuestion.options.length < 2 || !answer) {
                console.warn(`Skipping incomplete question detected during skip exam parsing (Num: ${qNum}, Answer: ${answer}, Options: ${currentQuestion.options.length}):\nText: ${rawText.substring(0,50)}...`);
            } else {
                extracted.questions.push({
                    id: questionId,
                    chapter: String(chapterNum), // Ensure chapter is string
                    number: qNum, // Use parsed number
                    text: rawText,
                    options: currentQuestion.options.map(opt => ({ letter: opt.letter, text: opt.text.trim() })),
                    image: null, // Assume no images generated by AI for skip exam
                    answer: answer
                });
                extracted.answers[questionId] = answer;
            }
        }
        currentQuestion = null;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        const questionMatch = line.match(questionStartRegex);
        const optionMatch = trimmedLine.match(optionRegex);
        const isPotentialAnswerLine = answerRegex.test(trimmedLine);

        if (questionMatch) {
            finalizeCurrentQuestion(); // Finalize the previous one
            questionNumberCounter++;
            currentQuestion = {
                number: parseInt(questionMatch[1], 10) || questionNumberCounter, // Use parsed number or counter
                textLines: [questionMatch[2].trim()],
                options: [],
                answerLine: null
            };
        } else if (currentQuestion) {
            if (optionMatch) {
                currentQuestion.options.push({
                    letter: optionMatch[1].toUpperCase(),
                    text: optionMatch[2]
                });
                 currentQuestion.answerLine = null; // Reset potential answer if options follow
            } else if (isPotentialAnswerLine) {
                 // Look ahead slightly to confirm it's likely an answer
                 let nextLineIsNewQ = false;
                 if (i + 1 < lines.length) {
                      nextLineIsNewQ = /^\s*\d+[\.\)]\s+.*/.test(lines[i+1]);
                 }
                 if (nextLineIsNewQ || i === lines.length - 1) {
                     currentQuestion.answerLine = trimmedLine;
                 } else {
                      // Treat as continuation text
                      if (currentQuestion.options.length > 0) {
                          currentQuestion.options[currentQuestion.options.length - 1].text += '\n' + line;
                      } else {
                          currentQuestion.textLines.push(line);
                      }
                 }
            } else if (trimmedLine !== '') { // Regular text line
                 // Append to last option or question text
                  if (currentQuestion.options.length > 0 && !currentQuestion.answerLine) {
                       currentQuestion.options[currentQuestion.options.length - 1].text += '\n' + line;
                   } else if (!currentQuestion.answerLine) { // Append to question text only if answer not found yet
                      currentQuestion.textLines.push(line);
                  }
            }
        }
    }
    finalizeCurrentQuestion(); // Finalize the last one

    console.log(`Parsed ${extracted.questions.length} questions from Skip Exam text.`);
    if (extracted.questions.length === 0 && rawText.length > 50) {
        console.error("Parsing failed to extract any questions from the AI-generated text. Check AI output format.");
        return null;
    }

    return extracted;
}

