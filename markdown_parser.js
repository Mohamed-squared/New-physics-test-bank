// --- START OF FILE markdown_parser.js ---

// --- Markdown Parsing ---

import { showLoading, hideLoading } from './utils.js'; // Assuming utils are needed somewhere, maybe not here directly

/**
 * Updates the chapter data within a subject object based on parsed Markdown content.
 * Compares parsed data with existing data, updates total questions, resets available questions
 * if totals change, and preserves existing progress data where possible.
 * Adds the chapter 'title' property if found in the Markdown.
 * @param {object} subject - The subject object containing the chapters data.
 * @param {string} mdContent - The Markdown content for the subject.
 * @returns {boolean} - True if any chapter data was changed, false otherwise.
 */
export function updateChaptersFromMarkdown(subject, mdContent) {
    // --- THIS FUNCTION IS FOR TESTGEN BANK - NOT COURSE EXAMS ---
    // It updates the central 'data.subjects' state based on the main subject MD file.
    if (!subject) { console.error("updateChaptersFromMarkdown: Subject undefined"); return false; }
    const parsedChapters = parseChaptersFromMarkdown(mdContent); // Parses main MD
    const existingChapters = subject.chapters || {};
    const updatedChapters = {};
    const allKnownChapterNumbers = new Set([...Object.keys(existingChapters), ...Object.keys(parsedChapters)]);
    let changesMade = false;

    allKnownChapterNumbers.forEach(chapNum => {
        const parsedChapData = parsedChapters[chapNum];
        const existingChapData = existingChapters[chapNum];
        const newTotal = parsedChapData?.total_questions ?? 0;
        const newTitle = parsedChapData?.title;

        let currentChapterData = {};
        let chapterChanged = false;

        if (existingChapData) {
            currentChapterData = { ...existingChapData };
            if (parsedChapData) {
                if (currentChapterData.title !== newTitle) {
                    currentChapterData.title = newTitle; chapterChanged = true;
                    // console.log(`Ch ${chapNum}: Title updated to "${newTitle}".`);
                }
                if (currentChapterData.total_questions !== newTotal) {
                    // console.log(`Ch ${chapNum}: Total Qs changed ${currentChapterData.total_questions} -> ${newTotal}. Resetting available.`);
                    currentChapterData.total_questions = newTotal;
                    currentChapterData.available_questions = Array.from({ length: newTotal }, (_, j) => j + 1);
                    chapterChanged = true;
                } else {
                    currentChapterData.total_questions = newTotal > 0 ? newTotal : currentChapterData.total_questions;
                    const initialAvailable = currentChapterData.available_questions || [];
                    currentChapterData.available_questions = [...new Set( (initialAvailable).filter(q => typeof q === 'number' && q > 0 && q <= currentChapterData.total_questions) )].sort((a, b) => a - b);
                    if (JSON.stringify(initialAvailable.sort((a,b)=>a-b)) !== JSON.stringify(currentChapterData.available_questions)) {
                         // console.log(`Ch ${chapNum}: Available Qs list cleaned or updated based on total.`);
                         chapterChanged = true;
                    }
                }
            } else {
                 if (currentChapterData.total_questions !== 0 || currentChapterData.available_questions?.length > 0) {
                    // console.warn(`Ch ${chapNum} not found in MD. Resetting questions and title.`);
                    currentChapterData.total_questions = 0;
                    currentChapterData.available_questions = [];
                    currentChapterData.title = null;
                    chapterChanged = true;
                 }
            }
        } else if (parsedChapData) {
            // console.log(`Ch ${chapNum}: Found new chapter in MD (Title: "${newTitle}", Qs: ${newTotal}).`);
            currentChapterData = {
                title: newTitle,
                total_questions: newTotal,
                total_attempted: 0, total_wrong: 0, // Defaults for TestGen stats
                available_questions: Array.from({ length: newTotal }, (_, j) => j + 1),
                mistake_history: [], consecutive_mastery: 0
            };
            chapterChanged = true;
        }

        currentChapterData.title = currentChapterData.title ?? null;
        currentChapterData.total_attempted = currentChapterData.total_attempted ?? 0;
        currentChapterData.total_wrong = currentChapterData.total_wrong ?? 0;
        currentChapterData.mistake_history = currentChapterData.mistake_history ?? [];
        currentChapterData.consecutive_mastery = currentChapterData.consecutive_mastery ?? 0;
        currentChapterData.available_questions = currentChapterData.available_questions ?? [];
        currentChapterData.total_questions = currentChapterData.total_questions ?? 0;

        if (Object.keys(currentChapterData).length > 0 && (currentChapterData.total_questions > 0 || existingChapters[chapNum] || parsedChapters[chapNum])) {
             updatedChapters[chapNum] = currentChapterData;
        }
        if (chapterChanged) { changesMade = true; }
    });
    subject.chapters = updatedChapters;
    return changesMade;
}

/**
 * Parses Markdown content to extract chapter numbers, titles, and total question counts.
 * @param {string} mdContent - The Markdown content.
 * @returns {object} - An object where keys are chapter numbers (string) and values are
 *                     objects containing { total_questions: number, title: string | null }.
 */
export function parseChaptersFromMarkdown(mdContent) {
    // console.log("--- Parsing MD for Chapters & Titles ---");
    if (!mdContent) { console.warn("parseChaptersFromMarkdown: null mdContent."); return {}; }
    const chapters = {};
    let currentChapterNum = null;
    let questionCount = 0;
    const lines = mdContent.split('\n');
    const chapterRegex = /^###\s+Chapter\s+(\d+)\s*[:\-]?\s*(.*?)\s*$/i;
    const questionRegex = /^\s*\d+[\.\)]\s+.+/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]; const trimmedLine = line.trim();
        const chapterMatch = trimmedLine.match(chapterRegex);

        if (chapterMatch) {
            if (currentChapterNum !== null) {
                if (!chapters[currentChapterNum]) chapters[currentChapterNum] = {};
                chapters[currentChapterNum].total_questions = questionCount;
            }
            currentChapterNum = chapterMatch[1];
            const chapterTitle = chapterMatch[2] ? chapterMatch[2].trim() : null;
            questionCount = 0;
            if (!chapters[currentChapterNum]) chapters[currentChapterNum] = { total_questions: 0, title: chapterTitle };
            else chapters[currentChapterNum].title = chapterTitle;
        } else if (currentChapterNum !== null && questionRegex.test(line)) {
            questionCount++;
        }
    }
    if (currentChapterNum !== null) {
        if (!chapters[currentChapterNum]) chapters[currentChapterNum] = {};
        chapters[currentChapterNum].total_questions = questionCount;
    }
    // if (Object.keys(chapters).length === 0 && mdContent.length > 10) console.warn("Parsing Warning: No chapters found in MD. Check format.");
    // else console.log(`Parsed ${Object.keys(chapters).length} chapters definitions from MD.`);
    // console.log("--- Finished Parsing MD for Chapters & Titles ---");
    return chapters;
}


/**
 * Extracts specific MCQs from Markdown content, filtering by chapter scope.
 * @param {string} mdContent - The full Markdown text.
 * @param {Array<number>|object} chapterScopeOrQuestionMap - Array of chapter numbers to extract questions from, OR a map of {chapterNum: [questionNumbers]} for specific questions.
 * @param {string} [sourceType='unknown'] - Identifier for the source file (e.g., 'text_mcq'), used for generating IDs.
 * @returns {object} - { questions: Array<QuestionObject>, answers: { questionId: correctAnswer } }
 */
export function extractQuestionsFromMarkdown(mdContent, chapterScopeOrQuestionMap, sourceType = 'unknown') {
    const extracted = { questions: [], answers: {} };
    // *** MODIFIED: Handle potentially empty/null mdContent gracefully ***
    if (!mdContent || !chapterScopeOrQuestionMap) {
        // console.warn("extractQuestionsFromMarkdown: Invalid args or empty content/scope.");
        return extracted;
    }

    let chapterKeysInScope;
    let specificQuestionsMode = false;
    if (Array.isArray(chapterScopeOrQuestionMap)) {
        chapterKeysInScope = chapterScopeOrQuestionMap.map(String);
    } else if (typeof chapterScopeOrQuestionMap === 'object' && chapterScopeOrQuestionMap !== null) {
        chapterKeysInScope = Object.keys(chapterScopeOrQuestionMap).map(String);
        specificQuestionsMode = true; // We are in specific question extraction mode
    } else {
        console.warn("extractQuestionsFromMarkdown: Invalid chapterScopeOrQuestionMap type. Expected array or object.", chapterScopeOrQuestionMap);
        return extracted; // Return empty if invalid
    }

    if (chapterKeysInScope.length === 0) {
        // console.warn("extractQuestionsFromMarkdown: Empty scope.");
        return extracted;
    }

    const lines = mdContent.split('\n');
    let currentChapter = null;
    let currentQuestion = null;
    let processingState = 'seeking_chapter';

    const chapterRegex = /^###\s+Chapter\s+(\d+):?.*?$/i;
    const questionStartRegex = /^\s*(\d+)\s*[\.\)]\s*(.*)/;
    const optionRegex = /^\s*([A-Ea-e])[\.\)]\s*(.*)/;
    const answerRegex = /(?:ans|answer)\s*:\s*([a-zA-Z\d])\s*$/i;
    const imageMarkdownRegex = /!\[(.*?)\]\((.*?)\)/g;

    function finalizeQuestion() {
        if (currentQuestion && currentChapter) {
            // *** MODIFIED ID to include sourceType ***
            const questionId = `c${currentChapter}q${currentQuestion.number}-${sourceType}`;
            let rawText = currentQuestion.textLines.join('\n').trim();
            let answer = null;
            let imageUrl = null;

            if (currentQuestion.answerLine) {
                const m = currentQuestion.answerLine.match(answerRegex);
                if (m) answer = m[1].toUpperCase();
                if (currentQuestion.textLines.length > 0 && currentQuestion.textLines[currentQuestion.textLines.length - 1]?.trim() === currentQuestion.answerLine) {
                    currentQuestion.textLines.pop();
                    rawText = currentQuestion.textLines.join('\n').trim();
                }
            }

            const imgMatch = rawText.match(/!\[.*?\]\((.*?)\)/);
            if (imgMatch) {
                imageUrl = imgMatch[1];
                rawText = rawText.replace(imageMarkdownRegex, '').trim();
            }

            const formattedOptions = currentQuestion.options.map(opt => ({
                letter: opt.letter, text: opt.text.trim()
            }));

            extracted.questions.push({
                id: questionId,
                chapter: currentChapter, // Keep as string
                number: currentQuestion.number,
                text: rawText,
                options: formattedOptions,
                image: imageUrl,
                correctAnswer: answer, // Stored here for review UI
                isProblem: false
            });
            if (answer) {
                extracted.answers[questionId] = answer; // Populate answers map for scoring
            } else {
                 console.warn(`Answer missing or unparsed for Q ${questionId}. Check MD format.`);
            }
        }
        currentQuestion = null;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]; const trimmedLine = line.trim();
        const chapterMatch = trimmedLine.match(chapterRegex);

        if (chapterMatch) {
            finalizeQuestion();
            const chapterNumStr = chapterMatch[1];
            if (chapterKeysInScope.includes(chapterNumStr)) {
                currentChapter = chapterNumStr;
                processingState = 'seeking_question';
                // console.log(`Extracting from Chapter ${currentChapter} (${sourceType})`);
            } else {
                currentChapter = null; // Not in scope
                processingState = 'seeking_chapter';
            }
            continue;
        }

        // Skip lines if chapter is not in scope
        if (!currentChapter) continue;

        const questionMatch = line.match(questionStartRegex);
        if (questionMatch) {
            finalizeQuestion();
            const qNum = parseInt(questionMatch[1], 10);
            const firstLineText = questionMatch[2];
            
            if (!isNaN(qNum) && qNum > 0) {
                if (specificQuestionsMode) {
                    const questionsToExtractForThisChapter = chapterScopeOrQuestionMap[currentChapter];
                    if (questionsToExtractForThisChapter && questionsToExtractForThisChapter.includes(qNum)) {
                        currentQuestion = { number: qNum, textLines: [firstLineText], options: [], answerLine: null };
                        processingState = 'in_question_text';
                    } else {
                        // This specific question number is not requested for this chapter
                        currentQuestion = null;
                        // console.log(`Skipping Q${qNum} in Ch ${currentChapter} as it's not in the specific selection map.`);
                    }
                } else {
                    // Not in specific questions mode (i.e., chapterScopeOrQuestionMap was an array of chapters)
                    // Extract all questions from this chapter.
                    currentQuestion = { number: qNum, textLines: [firstLineText], options: [], answerLine: null };
                    processingState = 'in_question_text';
                }
            } else {
                 console.warn(`Invalid question number found in Ch ${currentChapter}, Line: ${line}`);
                 currentQuestion = null;
                 processingState = 'seeking_question';
            }
            continue;
        }

        if (currentQuestion) {
            const optionMatch = trimmedLine.match(optionRegex);
            if (optionMatch) {
                processingState = 'in_options';
                currentQuestion.options.push({ letter: optionMatch[1].toUpperCase(), text: optionMatch[2] });
                continue;
            }

            const isPotentialAnswerLine = answerRegex.test(trimmedLine);
            if (isPotentialAnswerLine) {
                let nextLineIndex = i + 1; let nextSignificantLine = null;
                while(nextLineIndex < lines.length) { nextSignificantLine = lines[nextLineIndex].trim(); if(nextSignificantLine !== '') break; nextLineIndex++; }
                const nextIsNewQ = nextSignificantLine && /^\s*\d+[\.\)]\s+.*/.test(nextSignificantLine);
                const nextIsNewChapter = nextSignificantLine && /^###\s+Chapter\s+\d+:?.*?$/i.test(nextSignificantLine);
                const isLastLine = nextLineIndex >= lines.length;

                if (nextSignificantLine === null || nextIsNewQ || nextIsNewChapter || isLastLine) {
                    currentQuestion.answerLine = trimmedLine;
                    processingState = 'found_answer';
                    continue;
                }
            }

            if (processingState === 'in_options' && currentQuestion.options.length > 0) {
                // Append to the last option's text if it's a multi-line option
                currentQuestion.options[currentQuestion.options.length - 1].text += '\n' + line;
            } else if (processingState !== 'found_answer') { // Append to question text if not an answer line or option continuation
                currentQuestion.textLines.push(line);
            }
        }
    }
    finalizeQuestion(); // Finalize last question

    // console.log(`Markdown Extraction (${sourceType}) finished. Found ${extracted.questions.length} questions in scope.`);
    return extracted;
}


// --- Skip Exam Text Parser (AI Output) ---
// This remains unchanged as it parses a different format (AI output)
export function parseSkipExamText(rawText, chapterNum) {
    if (!rawText || !chapterNum) { console.error("parseSkipExamText: Missing args."); return { questions: [], answers: {} }; }
    // console.log(`Parsing Skip Exam Text for Chapter ${chapterNum}...`);
    const extracted = { questions: [], answers: {} };
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let questionNumFromText = 0; let questionTextBuffer = []; let optionsBuffer = []; let answerLineBuffer = null;
    const questionStartRegex = /^\s*(\d+)\s*[\.\)]\s*(.*)/i;
    const optionRegex = /^\s*([A-Ea-e])\s*[\.\)]\s*(.*)/i;
    const answerRegex = /^\s*(?:ans|answer)\s*:\s*([A-Ea-e])\s*$/i;

    function finalizeCurrentQuestion() {
        if (questionNumFromText > 0 && questionTextBuffer.length > 0 && optionsBuffer.length >= 2 && answerLineBuffer) {
            const answerMatch = answerLineBuffer.match(answerRegex);
            const answer = answerMatch ? answerMatch[1].toUpperCase() : null;
            if (answer) {
                const questionId = `c${chapterNum}q${questionNumFromText}-skip`;
                extracted.questions.push({
                    id: questionId, chapter: String(chapterNum), number: questionNumFromText,
                    text: questionTextBuffer.join(' ').trim(),
                    options: optionsBuffer.map(opt => ({ letter: opt.letter, text: opt.text.trim() })),
                    image: null, correctAnswer: answer, isProblem: false, type: 'mcq-skip'
                });
                extracted.answers[questionId] = answer;
            } else console.warn(`Skipping Skip MCQ block near "${answerLineBuffer}": Invalid answer format. Q#${questionNumFromText}`);
        } else if (questionNumFromText > 0) console.warn(`Discarding incomplete Skip MCQ block Q#${questionNumFromText}.`);
        questionNumFromText = 0; questionTextBuffer = []; optionsBuffer = []; answerLineBuffer = null;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]; const questionMatch = line.match(questionStartRegex);
        const optionMatch = line.match(optionRegex); const answerMatch = line.match(answerRegex);
        if (questionMatch) { finalizeCurrentQuestion(); questionNumFromText = parseInt(questionMatch[1]); questionTextBuffer = [questionMatch[2].trim()]; }
        else if (optionMatch && questionNumFromText > 0) { optionsBuffer.push({ letter: optionMatch[1].toUpperCase(), text: optionMatch[2].trim() }); answerLineBuffer = null; }
        else if (answerMatch && questionNumFromText > 0 && optionsBuffer.length > 0) { answerLineBuffer = line; }
        else if (questionNumFromText > 0) {
            if (optionsBuffer.length > 0 && !answerLineBuffer) optionsBuffer[optionsBuffer.length - 1].text += ' ' + line;
            else if (optionsBuffer.length === 0 && !answerLineBuffer) questionTextBuffer.push(line);
        }
    }
    finalizeCurrentQuestion();
    // console.log(`Parsed ${extracted.questions.length} potentially valid MCQs from Skip Exam text.`);
    if (extracted.questions.length === 0 && lines.length > 5) console.error("Skip Exam Parsing failed: Extracted 0 MCQs. Check AI output format.");
    else if (extracted.questions.length < 10 && lines.length > 50) console.warn(`Parsed only ${extracted.questions.length} Skip MCQs. AI output might be incomplete/inconsistent.`);
    return extracted;
}
// --- END OF FILE markdown_parser.js ---