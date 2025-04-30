// --- START OF FILE markdown_parser.js ---

// --- Markdown Parsing ---

import { showLoading, hideLoading } from './utils.js'; // Assuming utils are needed somewhere, maybe not here directly

export function updateChaptersFromMarkdown(subject, mdContent) {
    if (!subject) { console.error("updateChaptersFromMarkdown: Subject undefined"); return false; }
    const parsedChapters = parseChaptersFromMarkdown(mdContent);
    const existingChapters = subject.chapters || {};
    const updatedChapters = {};
    const allKnownChapterNumbers = new Set([...Object.keys(existingChapters), ...Object.keys(parsedChapters)]);
    let changesMade = false;

    allKnownChapterNumbers.forEach(chapNum => {
        const parsedChapData = parsedChapters[chapNum];
        const existingChapData = existingChapters[chapNum];
        const newTotal = parsedChapData?.total_questions ?? 0;
        let currentChapterData = {}; let chapterChanged = false;

        if (existingChapData) {
            currentChapterData = { ...existingChapData };
            if (parsedChapData) {
                if (currentChapterData.total_questions !== newTotal) {
                    console.log(`Ch ${chapNum}: Total Qs changed ${currentChapterData.total_questions} -> ${newTotal}. Resetting available.`);
                    currentChapterData.total_questions = newTotal;
                    currentChapterData.available_questions = Array.from({ length: newTotal }, (_, j) => j + 1);
                    chapterChanged = true;
                } else {
                    // Retain existing total_questions if it matches or if parsedChapData didn't specify one
                    currentChapterData.total_questions = newTotal > 0 ? newTotal : currentChapterData.total_questions;
                    const initialAvailable = currentChapterData.available_questions || [];
                    // Filter based on the potentially updated total_questions
                    currentChapterData.available_questions = [...new Set( (initialAvailable).filter(q => typeof q === 'number' && q > 0 && q <= currentChapterData.total_questions) )].sort((a, b) => a - b);
                    if (JSON.stringify(initialAvailable.sort((a,b)=>a-b)) !== JSON.stringify(currentChapterData.available_questions)) {
                         console.log(`Ch ${chapNum}: Available Qs list cleaned or updated based on total.`); chapterChanged = true;
                    }
                }
            } else { // Exists in data, not MD
                 if (currentChapterData.total_questions !== 0 || currentChapterData.available_questions?.length > 0) {
                    console.warn(`Ch ${chapNum} not found in MD. Resetting questions.`);
                    currentChapterData.total_questions = 0; currentChapterData.available_questions = []; chapterChanged = true;
                 }
            }
        } else if (parsedChapData) { // Exists only in MD
            console.log(`Ch ${chapNum}: Found new chapter in MD (${newTotal} Qs).`);
            currentChapterData = { total_questions: newTotal, total_attempted: 0, total_wrong: 0, available_questions: Array.from({ length: newTotal }, (_, j) => j + 1), mistake_history: [], consecutive_mastery: 0 };
            chapterChanged = true;
        }

        // Ensure essential fields exist, defaulting values if missing after merge/creation
        currentChapterData.total_attempted = currentChapterData.total_attempted ?? 0;
        currentChapterData.total_wrong = currentChapterData.total_wrong ?? 0;
        currentChapterData.mistake_history = currentChapterData.mistake_history ?? [];
        currentChapterData.consecutive_mastery = currentChapterData.consecutive_mastery ?? 0;
        // Ensure available_questions is an array, even if total_questions is 0
        currentChapterData.available_questions = currentChapterData.available_questions ?? [];
        // Set total_questions if it wasn't set (e.g., only existing data without parsed data)
        currentChapterData.total_questions = currentChapterData.total_questions ?? 0;


        // Only keep chapter if it has questions or existing data structure elements
        if (Object.keys(currentChapterData).length > 0 && (currentChapterData.total_questions > 0 || Object.keys(existingChapters).includes(chapNum))) {
             updatedChapters[chapNum] = currentChapterData;
        } else if (newTotal > 0) {
             updatedChapters[chapNum] = currentChapterData; // Keep if newly added from MD
        }

        if (chapterChanged) { changesMade = true; }
    });
    subject.chapters = updatedChapters; return changesMade;
}

export function parseChaptersFromMarkdown(mdContent) {
    console.log("--- Parsing MD for Chapters ---");
    if (!mdContent) { console.error("parseChaptersFromMarkdown: null mdContent."); return {}; }
    const chapters = {}; let currentChapterNum = null; let questionCount = 0;
    const lines = mdContent.split('\n');
    // Match "### Chapter <num>[: optional title]"
    const chapterRegex = /^###\s+Chapter\s+(\d+):?.*?$/i;
    // Match question start: optional space, number, dot or paren, space, text
    const questionRegex = /^\s*\d+[\.\)]\s+.+/;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]; const trimmedLine = line.trim();
        const chapterMatch = trimmedLine.match(chapterRegex);
        if (chapterMatch) {
            // Finalize count for previous chapter before starting new one
            if (currentChapterNum !== null) {
                 if (!chapters[currentChapterNum]) chapters[currentChapterNum] = {};
                 chapters[currentChapterNum].total_questions = questionCount;
             }
            // Start new chapter
            currentChapterNum = chapterMatch[1];
            questionCount = 0; // Reset question count for the new chapter
            if (!chapters[currentChapterNum]) { chapters[currentChapterNum] = { total_questions: 0 }; }
            // console.log(`Found Chapter ${currentChapterNum}`);
        } else if (currentChapterNum !== null && questionRegex.test(line)) {
            // Increment question count if line matches question pattern and we are inside a chapter
            questionCount++;
        }
    }
    // Finalize count for the last chapter
    if (currentChapterNum !== null) {
         if (!chapters[currentChapterNum]) chapters[currentChapterNum] = {};
         chapters[currentChapterNum].total_questions = questionCount;
    }
    if (Object.keys(chapters).length === 0) { console.error("ERROR: No chapters parsed. Check MD format (e.g., '### Chapter 1: Title')."); }
    else { console.log(`Parsed ${Object.keys(chapters).length} chapters.`); }
    console.log("--- Finished Parsing MD for Chapters ---");
    return chapters;
}

export function extractQuestionsFromMarkdown(mdContent, selectedQuestionsMap) {
    const extracted = { questions: [] };
    if (!mdContent || !selectedQuestionsMap || Object.keys(selectedQuestionsMap).length === 0) { console.error("Invalid args for extractQuestionsFromMarkdown."); return extracted; }
    const lines = mdContent.split('\n'); let currentChapter = null; let currentQuestion = null; let processingState = 'seeking_chapter';
    const chapterRegex = /^###\s+Chapter\s+(\d+):?.*?$/i; const questionStartRegex = /^\s*(\d+)\s*[\.\)]\s*(.*)/; const optionRegex = /^\s*([A-Ea-e])[\.\)]\s*(.*)/; const answerRegex = /(?:ans|answer)\s*:\s*([a-zA-Z\d])\s*$/i; const imageMarkdownRegex = /!\[(.*?)\]\((.*?)\)/g;

    function finalizeQuestion() {
        if (currentQuestion && currentChapter) {
            const questionId = `c${currentChapter}q${currentQuestion.number}`; let rawText = currentQuestion.textLines.join('\n').trim(); let answer = null; let imageUrl = null;
            if (currentQuestion.answerLine) {
                const m = currentQuestion.answerLine.match(answerRegex);
                if (m) answer = m[1].toUpperCase();
                if (currentQuestion.textLines.length > 0 && currentQuestion.textLines[currentQuestion.textLines.length - 1]?.trim() === currentQuestion.answerLine) {
                     currentQuestion.textLines.pop();
                     rawText = currentQuestion.textLines.join('\n').trim();
                 }
            }
            const imgMatch = rawText.match(/!\[.*?\]\((.*?)\)/); if (imgMatch) { imageUrl = imgMatch[1]; rawText = rawText.replace(imageMarkdownRegex, '').trim(); }
            const formattedOptions = currentQuestion.options.map(opt => ({ letter: opt.letter, text: opt.text.trim() }));
            extracted.questions.push({
                id: questionId,
                chapter: currentChapter,
                number: currentQuestion.number,
                text: rawText,
                options: formattedOptions,
                image: imageUrl,
                correctAnswer: answer,
                isProblem: false
             });
            if (!answer) console.warn(`Answer missing for Q ${questionId}.`);
        }
        currentQuestion = null;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]; const trimmedLine = line.trim();
        const chapterMatch = trimmedLine.match(chapterRegex); const questionMatch = line.match(questionStartRegex); const optionMatch = trimmedLine.match(optionRegex); const isPotentialAnswerLine = answerRegex.test(trimmedLine);
        if (chapterMatch) { finalizeQuestion(); currentChapter = chapterMatch[1]; processingState = 'seeking_question'; continue; }
        if (processingState === 'seeking_chapter') continue;
        if (questionMatch) {
            finalizeQuestion(); const qNum = parseInt(questionMatch[1], 10); const firstLineText = questionMatch[2]; const chapterKey = String(currentChapter);
            if (selectedQuestionsMap[chapterKey]?.includes(qNum)) { currentQuestion = { number: qNum, textLines: [firstLineText], options: [], answerLine: null }; processingState = 'in_question_text'; }
            else { processingState = 'seeking_question'; currentQuestion = null; } continue;
        }
        if (currentQuestion) {
            if (optionMatch) { processingState = 'in_options'; currentQuestion.options.push({ letter: optionMatch[1].toUpperCase(), text: optionMatch[2] }); continue; }
             if (isPotentialAnswerLine) {
                  let nextLineIndex = i + 1; let nextSignificantLine = null; while(nextLineIndex < lines.length) { nextSignificantLine = lines[nextLineIndex].trim(); if(nextSignificantLine !== '') break; nextLineIndex++; }
                  const nextIsNewQ = nextSignificantLine && /^\s*\d+[\.\)]\s+.*/.test(nextSignificantLine); const nextIsNewChapter = nextSignificantLine && /^###\s+Chapter\s+\d+:?.*?$/i.test(nextSignificantLine); const isLastLine = nextLineIndex >= lines.length;
                 if (nextSignificantLine === null || nextIsNewQ || nextIsNewChapter || isLastLine) { currentQuestion.answerLine = trimmedLine; processingState = 'found_answer'; }
                 else { if (processingState === 'in_options' && currentQuestion.options.length > 0) { currentQuestion.options[currentQuestion.options.length - 1].text += '\n' + line; } else { currentQuestion.textLines.push(line); } } continue;
             }
             if (processingState === 'in_options' && currentQuestion.options.length > 0) { currentQuestion.options[currentQuestion.options.length - 1].text += '\n' + line; }
             else if (processingState !== 'found_answer') { currentQuestion.textLines.push(line); }
        }
    }
    finalizeQuestion();
    console.log(`Extraction finished. Found ${extracted.questions.length} questions.`);
    const totalSelectedCount = Object.values(selectedQuestionsMap).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    if (extracted.questions.length < totalSelectedCount && totalSelectedCount > 0) { console.warn(`Extraction Warning: Selected ${totalSelectedCount} but only extracted ${extracted.questions.length}. Check MD formatting for selected questions.`); }
    return { questions: extracted.questions };
}


// --- Skip Exam Text Parser (Improved Robustness) ---
export function parseSkipExamText(rawText, chapterNum) {
    if (!rawText || !chapterNum) { console.error("parseSkipExamText: Missing args."); return { questions: [], answers: {} }; } // Return empty structure on error
    console.log(`Parsing Skip Exam Text for Chapter ${chapterNum}...`);
    const extracted = { questions: [], answers: {} }; // Keep answers map here for skip exam specific flow if needed downstream, though less necessary now
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let currentQuestion = null; let questionNumFromText = 0; let questionTextBuffer = []; let optionsBuffer = []; let answerLineBuffer = null;

    const questionStartRegex = /^\s*(\d+)\s*[\.\)]\s*(.*)/i;
    const optionRegex = /^\s*([A-Ea-e])\s*[\.\)]\s*(.*)/i;
    const answerRegex = /^\s*(?:ans|answer)\s*:\s*([A-Ea-e])\s*$/i; // Allow A-E

    function finalizeCurrentQuestion() {
        if (questionNumFromText > 0 && questionTextBuffer.length > 0 && optionsBuffer.length >= 2 && answerLineBuffer) {
            const answerMatch = answerLineBuffer.match(answerRegex);
            const answer = answerMatch ? answerMatch[1].toUpperCase() : null;
            if (answer) {
                 const questionId = `c${chapterNum}q${questionNumFromText}-skip`;
                 extracted.questions.push({
                    id: questionId,
                    chapter: String(chapterNum),
                    number: questionNumFromText,
                    text: questionTextBuffer.join(' ').trim(),
                    options: optionsBuffer.map(opt => ({ letter: opt.letter, text: opt.text.trim() })),
                    image: null,
                    correctAnswer: answer, // Use correctAnswer
                    isProblem: false,
                    type: 'mcq-skip'
                 });
                 extracted.answers[questionId] = answer; // Keep this map for skip exam flow if useful
            } else {
                 console.warn(`Skipping Skip MCQ block ending near line buffer: Invalid or missing answer. Q#${questionNumFromText}`);
            }
        } else if (questionNumFromText > 0) {
             console.warn(`Discarding incomplete Skip MCQ block for question number ${questionNumFromText}. Missing text, options (<2), or answer.`);
        }
        currentQuestion = null; questionNumFromText = 0; questionTextBuffer = []; optionsBuffer = []; answerLineBuffer = null;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const questionMatch = line.match(questionStartRegex);
        const optionMatch = line.match(optionRegex);
        const answerMatch = line.match(answerRegex);

        if (questionMatch) {
            finalizeCurrentQuestion();
            questionNumFromText = parseInt(questionMatch[1]);
            questionTextBuffer = [questionMatch[2].trim()];
        } else if (optionMatch && questionNumFromText > 0) {
            optionsBuffer.push({ letter: optionMatch[1].toUpperCase(), text: optionMatch[2].trim() });
            answerLineBuffer = null;
        } else if (answerMatch && questionNumFromText > 0 && optionsBuffer.length > 0) {
            answerLineBuffer = line;
        } else if (questionNumFromText > 0) {
            if (optionsBuffer.length > 0 && !answerLineBuffer) {
                optionsBuffer[optionsBuffer.length - 1].text += ' ' + line;
            } else if (optionsBuffer.length === 0 && !answerLineBuffer) {
                questionTextBuffer.push(line);
            }
        }
    }
    finalizeCurrentQuestion();

    console.log(`Parsed ${extracted.questions.length} potentially valid MCQs from Skip Exam text.`);
    if (extracted.questions.length === 0 && lines.length > 5) {
        console.error("Parsing failed: Extracted 0 MCQs. Check AI output format against expected structure (Num. Text \\n A. Text \\n ... \\n ans: X).");
        // Return empty structure on failure
        return { questions: [], answers: {} };
    } else if (extracted.questions.length < 10 && lines.length > 50) {
        console.warn(`Parsed only ${extracted.questions.length} MCQs. AI might not have generated the full requested amount or format was inconsistent.`);
    }

    return extracted; // Return MCQs parsed from this text
}


// --- END OF FILE markdown_parser.js ---