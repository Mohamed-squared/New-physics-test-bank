// --- START OF FILE pdf-server.js ---
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra'); // Use fs-extra for potential cleanup convenience
const { transcribeLecture } = require('./lecture_transcription_service.js'); // Added for transcription
const { processTextbookPdf } = require('./pdf_processing_service.js'); // Added for PDF processing
const { generateQuestionsFromPdf } = require('./pdf_question_generation_service.js'); // Added for QGen
const { generateQuestionsFromLectures } = require('./lecture_question_generation_service.js'); // Added for Lecture QGen
const serverMega = require('./mega_service_server.js'); // Added for Mega folder listing
const courseAutomationService = require('./course_automation_service.js'); // Added for Full Course Automation
const multer = require('multer'); // For handling file uploads

const app = express();

// Configure Multer for temporary file uploads
const TEMP_UPLOAD_DIR = path.join(__dirname, 'temp_uploads');
fs.ensureDirSync(TEMP_UPLOAD_DIR); // Ensure directory exists

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, TEMP_UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        // Use a unique filename to avoid conflicts, keep original extension
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// New Multer configuration for course automation endpoint
const courseAutomationUpload = multer({ storage: storage }).fields([
    { name: 'textbookPdf', maxCount: 1 },
    { name: 'lectureFiles', maxCount: 20 } // Allow up to 20 lecture files
]);

const port = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Keep static serving for images and other potential assets
app.use(express.static(__dirname));
console.log(`[SERVER] Serving static files from: ${__dirname}`);

let browserInstance = null;

console.log("Node.js process PATH:", process.env.PATH);

async function getBrowserInstance() {
    if (!browserInstance || !browserInstance.isConnected()) {
        console.log("[SERVER] Launching new Puppeteer browser instance...");
        browserInstance = await puppeteer.launch({
            headless: true, // Default to true, can be 'new' for newer versions
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--font-render-hinting=none', // Consider 'medium' or 'full' for better text
                '--enable-precise-memory-info',
                '--disable-gpu', // Often recommended for server environments
            ],
            dumpio: process.env.DEBUG_PUPPETEER === 'true' // Conditional logging
        });
        browserInstance.on('disconnected', () => {
            console.log('[SERVER] Puppeteer browser disconnected.');
            browserInstance = null;
        });
    }
    return browserInstance;
}

app.post('/generate-pdf', async (req, res) => {
    let { htmlContent, filename = 'document.pdf' } = req.body;
    console.log(`[SERVER] Received request for PDF: ${filename}`);

    if (!htmlContent) {
        console.error('[SERVER] Missing htmlContent in request body');
        return res.status(400).send('Missing htmlContent in request body');
    }

    let injectedCss = '';
    try {
        let cssFileNameToInject = 'pdf_exam_styles.css'; // Default to exam styles
        const lowerFilename = filename.toLowerCase();

        if (lowerFilename.includes('formula_sheet') || 
            lowerFilename.includes('summary') || 
            lowerFilename.includes('note_')) {
            cssFileNameToInject = 'pdf_formula_sheet_styles.css';
        }
        else if (lowerFilename.includes('feedback_report')) {
             cssFileNameToInject = 'pdf_exam_styles.css'; 
             console.log(`[SERVER] Using ${cssFileNameToInject} for feedback report.`);
        }
        
        console.log(`[SERVER] Determined CSS file to inject: ${cssFileNameToInject}`);

        const cssFilePath = path.join(__dirname, 'css', cssFileNameToInject);
        if (fs.existsSync(cssFilePath)) {
            injectedCss = fs.readFileSync(cssFilePath, 'utf8');
            console.log(`[SERVER] Successfully read ${cssFileNameToInject}. Length: ${injectedCss.length}`);
            
            htmlContent = htmlContent.replace(/<link\s+rel="stylesheet"\s+href="css\/[^"]+\.css"\s*\/?>/gi, '');
            console.log("[SERVER] Removed existing linked CSS tags if any (to prevent double application).");

            const headEndTag = '</head>';
            const headEndIndex = htmlContent.toLowerCase().indexOf(headEndTag);
            if (headEndIndex !== -1) {
                htmlContent = htmlContent.slice(0, headEndIndex) +
                              `<style type="text/css">\n${injectedCss}\n</style>\n` +
                              htmlContent.slice(headEndIndex);
                console.log(`[SERVER] Injected ${cssFileNameToInject} content directly into HTML <head>.`);
            } else {
                console.warn("[SERVER] Could not find </head> tag to inject CSS. Attempting to inject before <body>.");
                const bodyStartTag = '<body';
                const bodyStartIndex = htmlContent.toLowerCase().indexOf(bodyStartTag);
                if (bodyStartIndex !== -1) {
                     htmlContent = htmlContent.slice(0, bodyStartIndex) +
                                   `<style type="text/css">\n${injectedCss}\n</style>\n` +
                                   htmlContent.slice(bodyStartIndex);
                     console.log("[SERVER] Injected CSS content at start of body as fallback.");
                } else {
                    console.error("[SERVER] CRITICAL: Could not find <head> or <body> tag to inject CSS. PDF will likely be unstyled.");
                }
            }
        } else {
            console.error(`[SERVER] CRITICAL: CSS file ${cssFileNameToInject} not found at ${cssFilePath}. PDF will be unstyled.`);
        }
    } catch (cssError) {
        console.error('[SERVER] Error reading or injecting CSS file:', cssError);
    }

    console.log("[SERVER DEBUG] HTML Content Start (first 500 chars after CSS injection attempts):", htmlContent.substring(0, 500) + "...");

    let page;
    try {
        const browser = await getBrowserInstance();
        page = await browser.newPage();

        page.on('console', async msg => {
            const type = msg.type().toUpperCase();
            try {
                const argsPromises = msg.args().map(arg => arg.jsonValue().catch(e => `Error serializing: ${e.message}`));
                const args = await Promise.all(argsPromises);
                 if (!args.some(arg => typeof arg === 'string' && arg.includes('[PDF HTML Inner] MathJax'))) { 
                    console.log(`[PUPPETEER PAGE - ${type}]:`, ...args);
                 }
            } catch (e) {
                 console.log(`[PUPPETEER PAGE - ${type}]: (Could not stringify args for console) Text:`, msg.text());
            }
        });
        page.on('pageerror', ({ message }) => console.error(`[PUPPETEER PAGE ERROR]: ${message}`));
        page.on('requestfailed', request => console.warn(`[PUPPETEER REQUEST FAILED]: ${request.url()} - ${request.failure()?.errorText}`));
        
        page.on('request', request => {
             const resourceType = request.resourceType();
             const url = request.url();
             if (resourceType === 'image' || url.includes('/images/') || url.includes('/assets/images/')) {
                  console.log(`[PUPPETEER PAGE - REQUEST]: ${resourceType.toUpperCase()} ${request.method()} ${url}`);
             }
         });

        console.log('[SERVER] Setting page content in Puppeteer (CSS should be inline)...');
        await page.goto('about:blank', { waitUntil: 'networkidle0' });
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0', 
            timeout: 90000 
        });
        console.log('[SERVER] Page content set. Waiting for MathJax global flag...');

        try {
            await page.waitForFunction('window.mathJaxIsCompletelyReadyForPdf === true || window.mathJaxIsCompletelyReadyForPdf === "error"', {
                timeout: 75000 
            });
            const mathJaxState = await page.evaluate(() => window.mathJaxIsCompletelyReadyForPdf);
            if (mathJaxState === 'error') {
                console.error('[SERVER] MathJax signaled an error during its startup/typesetting in Puppeteer.');
            } else if (mathJaxState === true) {
                console.log('[SERVER] MathJax signaled ready via global flag.');
            } else {
                 console.warn('[SERVER] MathJax did not explicitly signal readiness (flag was not true) nor error. Proceeding with PDF generation.');
            }
        } catch (e) {
            console.error('[SERVER] Timeout or error waiting for MathJax signal `window.mathJaxIsCompletelyReadyForPdf`. Error:', e.message);
            const bodyHTMLSample = await page.evaluate(() => document.body.innerHTML.substring(0, 2000)).catch(() => "Could not get body HTML");
            console.error("[SERVER DEBUG] Body HTML sample on MathJax timeout:", bodyHTMLSample);
            const mathJaxScriptTag = await page.evaluate(() => document.getElementById('mathjax-pdf-script')?.outerHTML).catch(() => "MathJax script tag not found");
            console.error("[SERVER DEBUG] MathJax script tag:", mathJaxScriptTag);
        }

        console.log('[SERVER] Waiting a final short delay (e.g., 5s) for rendering stabilization after MathJax signal...');
        await new Promise(resolve => setTimeout(resolve, 5000)); 

        console.log('[SERVER] Generating PDF with Puppeteer...');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true, 
            margin: { top: '1.5cm', right: '1.2cm', bottom: '1.5cm', left: '1.2cm' }, 
            timeout: 120000, 
        });
        console.log('[SERVER] PDF generated successfully by Puppeteer.');

        res.contentType('application/pdf');
        res.send(pdfBuffer);

    } catch (error) {
        console.error('[SERVER] Error generating PDF in Puppeteer server:', error);
        let errorDetailsForClient = `Error generating PDF: ${error.message}.`;
        if (error.message && error.message.toLowerCase().includes('timeout')) {
            errorDetailsForClient += " The page took too long to render or MathJax timed out. Check console for details.";
        }
        res.status(500).send(errorDetailsForClient);
    } finally {
        if (page) {
            try {
                await page.close();
                console.log('[SERVER] Puppeteer page closed.');
            } catch (closeError) {
                console.error('[SERVER] Error closing Puppeteer page:', closeError);
            }
        }
    }
});

app.listen(port, () => {
    console.log(`PDF generation server listening on http://localhost:${port}`);
});

process.on('SIGINT', async () => {
    console.log('[SERVER] SIGINT received. Closing browser...');
    if (browserInstance) {
        await browserInstance.close();
    }
    process.exit(0);
});

// --- Lecture Transcription Endpoint ---
app.post('/transcribe-lecture', async (req, res) => {
    console.log('[SERVER] Received /transcribe-lecture request.');
    const { 
        youtubeUrl, 
        courseId, 
        chapterId, 
        assemblyAiApiKey, 
        megaEmail, 
        megaPassword 
    } = req.body;

    if (!youtubeUrl || !courseId || !chapterId || !assemblyAiApiKey || !megaEmail || !megaPassword) {
        console.error('[SERVER /transcribe-lecture] Missing one or more required parameters in request body.');
        return res.status(400).json({ 
            success: false, 
            message: 'Missing required parameters: youtubeUrl, courseId, chapterId, assemblyAiApiKey, megaEmail, megaPassword.' 
        });
    }

    try {
        console.log(`[SERVER /transcribe-lecture] Calling transcribeLecture for YouTube URL: ${youtubeUrl}, Course: ${courseId}, Chapter: ${chapterId}`);
        const result = await transcribeLecture(
            youtubeUrl,
            courseId,
            chapterId,
            assemblyAiApiKey,
            megaEmail,
            megaPassword
        );
        
        console.log('[SERVER /transcribe-lecture] Transcription service call completed. Result:', result);
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        console.error('[SERVER /transcribe-lecture] Unexpected error calling transcribeLecture:', error);
        res.status(500).json({ 
            success: false, 
            message: `Server error during transcription: ${error.message}`,
            error: error.stack 
        });
    }
});

// --- List Mega Folder Contents Endpoint ---
app.post('/list-mega-folder', async (req, res) => {
    console.log('[SERVER] Received /list-mega-folder request.');
    const { megaFolderLink, megaEmail, megaPassword } = req.body;

    if (!megaFolderLink || !megaEmail || !megaPassword) {
        console.error('[SERVER /list-mega-folder] Missing required parameters.');
        return res.status(400).json({
            success: false,
            message: 'Missing required parameters: megaFolderLink, megaEmail, megaPassword.'
        });
    }

    try {
        await serverMega.initialize(megaEmail, megaPassword);
        console.log(`[SERVER /list-mega-folder] Initialized Mega for folder link: ${megaFolderLink}`);
        
        const contents = await serverMega.getFolderContents(megaFolderLink);
        console.log(`[SERVER /list-mega-folder] Successfully fetched contents for: ${megaFolderLink}. Found ${contents.length} items.`);
        res.status(200).json({ success: true, contents: contents });

    } catch (error) {
        console.error(`[SERVER /list-mega-folder] Error processing folder link ${megaFolderLink}:`, error);
        let statusCode = 500;
        let message = `Server error while processing Mega folder: ${error.message}`;

        if (error.message) {
            const lowerErrorMessage = error.message.toLowerCase();
            if (lowerErrorMessage.includes('invalid input: must be a mega folder node') || 
                lowerErrorMessage.includes('the provided node/link is not a folder') ||
                lowerErrorMessage.includes('invalid url') || 
                lowerErrorMessage.includes('file or folder not found')) { 
                statusCode = 400;
                message = "Invalid Mega link: The provided link does not appear to be a valid folder or is inaccessible.";
            } else if (lowerErrorMessage.includes('eagain') || lowerErrorMessage.includes('failed to fetch')) { 
                statusCode = 503; 
                message = "Mega.nz service temporarily unavailable or network issue. Please try again later.";
            } else if (lowerErrorMessage.includes('access denied') || lowerErrorMessage.includes('permission denied')) {
                statusCode = 403; 
                message = "Access denied: Insufficient permissions to access the Mega folder or link.";
            } else if (lowerErrorMessage.includes('mega storage is not initialized')) {
                statusCode = 401; 
                message = "Mega authentication failed. Please check credentials or Mega service status.";
            }
        }
        
        res.status(statusCode).json({
            success: false,
            message: message,
        });
    }
});

// --- Textbook PDF Processing Endpoint ---
app.post('/process-textbook-pdf', upload.single('pdfFile'), async (req, res) => {
    console.log('[SERVER] Received /process-textbook-pdf request.');
    const {
        courseId,
        actualFirstPageNumber,
        megaEmail,
        megaPassword,
        geminiApiKey
    } = req.body;

    const pdfFile = req.file;

    if (!pdfFile) {
        console.error('[SERVER /process-textbook-pdf] No PDF file uploaded.');
        return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });
    }

    if (!courseId || !actualFirstPageNumber || !megaEmail || !megaPassword || !geminiApiKey) {
        console.error('[SERVER /process-textbook-pdf] Missing one or more required text parameters.');
        if (pdfFile && pdfFile.path) {
            await fs.unlink(pdfFile.path).catch(err => console.error(`[SERVER] Error unlinking orphaned file: ${err.message}`));
        }
        return res.status(400).json({
            success: false,
            message: 'Missing required parameters: courseId, actualFirstPageNumber, megaEmail, megaPassword, geminiApiKey.'
        });
    }

    let result;
    try {
        console.log(`[SERVER /process-textbook-pdf] Calling processTextbookPdf for Course: ${courseId}, File: ${pdfFile.path}`);
        result = await processTextbookPdf(
            pdfFile.path,
            courseId,
            actualFirstPageNumber,
            megaEmail,
            megaPassword,
            geminiApiKey
        );
        
        console.log('[SERVER /process-textbook-pdf] PDF processing service call completed. Result:', result);
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result); 
        }
    } catch (error) {
        console.error('[SERVER /process-textbook-pdf] Unexpected error calling processTextbookPdf:', error);
        res.status(500).json({
            success: false,
            message: `Server error during PDF processing: ${error.message}`,
            error: error.stack
        });
    } finally {
        if (pdfFile && pdfFile.path) {
            try {
                await fs.unlink(pdfFile.path);
                console.log(`[SERVER /process-textbook-pdf] Temporary PDF file deleted: ${pdfFile.path}`);
            } catch (unlinkError) {
                console.error(`[SERVER /process-textbook-pdf] Error deleting temporary PDF file ${pdfFile.path}:`, unlinkError);
            }
        }
    }
});

// --- PDF Question Generation Endpoint ---
app.post('/generate-questions-from-pdf', async (req, res) => {
    console.log('[SERVER] Received /generate-questions-from-pdf request.');
    const {
        courseId,
        chapterKey,
        chapterPdfMegaLink,
        chapterTitle,
        megaEmail,
        megaPassword,
        geminiApiKey
    } = req.body;

    if (!courseId || !chapterKey || !chapterPdfMegaLink || !chapterTitle || !megaEmail || !megaPassword || !geminiApiKey) {
        console.error('[SERVER /generate-questions-from-pdf] Missing one or more required parameters.');
        return res.status(400).json({
            success: false,
            message: 'Missing required parameters: courseId, chapterKey, chapterPdfMegaLink, chapterTitle, megaEmail, megaPassword, geminiApiKey.'
        });
    }

    try {
        console.log(`[SERVER /generate-questions-from-pdf] Calling generateQuestionsFromPdf for Course: ${courseId}, Chapter: ${chapterTitle} (Key: ${chapterKey})`);
        const result = await generateQuestionsFromPdf(
            courseId,
            chapterKey,
            chapterPdfMegaLink,
            chapterTitle,
            megaEmail,
            megaPassword,
            geminiApiKey
        );
        
        console.log('[SERVER /generate-questions-from-pdf] Question generation service call completed. Result:', result);
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result); 
        }
    } catch (error) {
        console.error('[SERVER /generate-questions-from-pdf] Unexpected error calling generateQuestionsFromPdf:', error);
        res.status(500).json({
            success: false,
            message: `Server error during question generation: ${error.message}`,
            error: error.stack
        });
    }
});

// --- Lecture Question Generation Endpoint ---
app.post('/generate-questions-from-lectures', async (req, res) => {
    console.log('[SERVER] Received /generate-questions-from-lectures request.');
    const {
        courseId,
        selectedLectures, 
        chapterNameForLectures,
        megaEmail,
        megaPassword,
        geminiApiKey
    } = req.body;

    if (!courseId || !selectedLectures || !Array.isArray(selectedLectures) || selectedLectures.length === 0 || 
        !chapterNameForLectures || !megaEmail || !megaPassword || !geminiApiKey) {
        console.error('[SERVER /generate-questions-from-lectures] Missing one or more required parameters or invalid selectedLectures format.');
        return res.status(400).json({
            success: false,
            message: 'Missing or invalid required parameters. Ensure selectedLectures is a non-empty array.'
        });
    }

    try {
        console.log(`[SERVER /generate-questions-from-lectures] Calling generateQuestionsFromLectures for Course: ${courseId}, Topic: ${chapterNameForLectures}`);
        const result = await generateQuestionsFromLectures(
            courseId,
            selectedLectures,
            chapterNameForLectures,
            megaEmail,
            megaPassword,
            geminiApiKey
        );
        
        console.log('[SERVER /generate-questions-from-lectures] Lecture question generation service call completed. Result:', result);
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result); 
        }
    } catch (error) {
        console.error('[SERVER /generate-questions-from-lectures] Unexpected error calling generateQuestionsFromLectures:', error);
        res.status(500).json({
            success: false,
            message: `Server error during lecture question generation: ${error.message}`,
            error: error.stack
        });
    }
});

// --- Automated Full Course Creation Endpoint ---
app.post('/automate-full-course', courseAutomationUpload, async (req, res) => {
    console.log('[SERVER] Received /automate-full-course request.');
    const uploadedFilePaths = []; 

    try {
        const textbookPdfFile = (req.files && req.files['textbookPdf'] && req.files['textbookPdf'][0]) ? req.files['textbookPdf'][0] : null;
        const lectureFiles = (req.files && req.files['lectureFiles']) ? req.files['lectureFiles'] : [];

        if (textbookPdfFile) {
            uploadedFilePaths.push(textbookPdfFile.path);
        }
        lectureFiles.forEach(file => uploadedFilePaths.push(file.path));

        const {
            courseTitle,
            trueFirstPageNumber,
            lecturesMetadata, 
            majorTag,
            subjectTag,
            megaEmail,
            megaPassword,
            assemblyAiApiKey
        } = req.body;

        if (!courseTitle || !textbookPdfFile || !trueFirstPageNumber || !megaEmail || !megaPassword || !assemblyAiApiKey || !majorTag || !subjectTag) {
            console.error('[SERVER /automate-full-course] Missing one or more basic required parameters.');
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters. Ensure courseTitle, textbookPdf, trueFirstPageNumber, megaEmail, megaPassword, assemblyAiApiKey, majorTag, and subjectTag are provided. Gemini API Key is also required.'
            });
        }
        
        let rawGeminiApiKey = req.body.geminiApiKey;
        let apiKeyForService = null; // This will hold the array or single string to pass to the service

        const originalApiKeyType = typeof rawGeminiApiKey;
        // Keep existing snippet logging if you want
        const originalApiKeySnippet = typeof rawGeminiApiKey === 'string' ? rawGeminiApiKey.substring(0, 50) + '...' : JSON.stringify(rawGeminiApiKey, null, 2);
        console.log(`[SERVER /automate-full-course] Received raw Gemini API Key for processing. Type: ${originalApiKeyType}, Snippet: ${originalApiKeySnippet}`);


        if (Array.isArray(rawGeminiApiKey)) {
            console.log('[SERVER /automate-full-course] Raw Gemini API key is an array:', rawGeminiApiKey);
            const validKeysInArray = rawGeminiApiKey.filter(k => typeof k === 'string' && k.trim() !== '');
            if (validKeysInArray.length > 0) {
                apiKeyForService = validKeysInArray; // Pass the filtered array
                console.log(`[SERVER /automate-full-course] Using array of ${validKeysInArray.length} valid API key(s).`);
            } else {
                console.warn('[SERVER /automate-full-course] Received API key array is empty or contains no valid strings.');
                // apiKeyForService remains null
            }
        } else if (typeof rawGeminiApiKey === 'string' && rawGeminiApiKey.trim() !== '') {
            const trimmedKey = rawGeminiApiKey.trim();
            if (trimmedKey.startsWith('[') && trimmedKey.endsWith(']')) {
                try {
                    const parsedArray = JSON.parse(trimmedKey);
                    if (Array.isArray(parsedArray)) {
                        console.log('[SERVER /automate-full-course] Raw Gemini API key was a stringified array. Parsed.');
                        const validKeysInParsedArray = parsedArray.filter(k => typeof k === 'string' && k.trim() !== '');
                        if (validKeysInParsedArray.length > 0) {
                            apiKeyForService = validKeysInParsedArray; // Pass the filtered parsed array
                            console.log(`[SERVER /automate-full-course] Using parsed array of ${validKeysInParsedArray.length} valid API key(s).`);
                        } else {
                            console.warn('[SERVER /automate-full-course] Parsed API key array is empty or contains no valid strings.');
                            // apiKeyForService remains null
                        }
                    } else { // Parsed but not an array
                        console.warn('[SERVER /automate-full-course] Stringified API key did not parse into an array. Treating as single key.');
                        apiKeyForService = trimmedKey; // Pass the original string
                    }
                } catch (e) {
                    console.warn(`[SERVER /automate-full-course] Failed to parse stringified array-like API key, treating as single key: ${e.message}`);
                    apiKeyForService = trimmedKey; // Pass the original string
                }
            } else { // Simple string key
                 console.log('[SERVER /automate-full-course] Raw Gemini API key is a single string.');
                 apiKeyForService = trimmedKey; // Pass the single string
            }
        } else if (typeof rawGeminiApiKey === 'object' && rawGeminiApiKey !== null) {
            console.log('[SERVER /automate-full-course] Raw Gemini API key is an object. Attempting to extract a single key.');
            const commonKeys = ['key', 'apiKey', 'value']; // Add other potential key names if necessary
            let foundKey = null;
            for (const k of commonKeys) {
                if (typeof rawGeminiApiKey[k] === 'string' && rawGeminiApiKey[k].trim() !== '') {
                    foundKey = rawGeminiApiKey[k].trim();
                    break;
                }
            }
            if (foundKey) {
                apiKeyForService = foundKey; // Pass the single extracted string
                console.log(`[SERVER /automate-full-course] Extracted single API key from object: ${foundKey.substring(0,15)}...`);
            } else {
                 console.warn('[SERVER /automate-full-course] Could not extract a valid string API key from object.');
                 // apiKeyForService remains null
            }
        }

        // Validation: Ensure some form of key is present before calling the service
        if (!apiKeyForService || (Array.isArray(apiKeyForService) && apiKeyForService.length === 0)) {
            console.error(`[SERVER /automate-full-course] CRITICAL: No valid Gemini API Key could be resolved from the provided input. Aborting course automation.`);
            // Ensure files are cleaned up (existing cleanup logic should handle this if error is thrown or returned)
            return res.status(400).json({
                success: false,
                message: 'Gemini API Key is missing, empty, or provided in an unusable format. A valid API key or array of keys is required.'
            });
        }
        
        // Log what is being passed (be careful with logging full arrays of keys in production)
        if (Array.isArray(apiKeyForService)) {
            console.log(`[SERVER /automate-full-course] Passing an array of ${apiKeyForService.length} API key(s) to the automation service.`);
        } else { // It's a string
            console.log(`[SERVER /automate-full-course] Passing a single API key string to the automation service: ${apiKeyForService.substring(0,15)}...`);
        }

        let lecturesInfo = [];
        if (lecturesMetadata) {
            try {
                lecturesInfo = JSON.parse(lecturesMetadata);
                if (!Array.isArray(lecturesInfo)) {
                    throw new Error("lecturesMetadata should be an array.");
                }
            } catch (e) {
                console.error('[SERVER /automate-full-course] Invalid lecturesMetadata format:', e.message);
                return res.status(400).json({ success: false, message: `Invalid lecturesMetadata format: ${e.message}` });
            }
        }

        if (lectureFiles.length > 0) {
            lectureFiles.forEach(file => {
                const lectureMeta = lecturesInfo.find(l => l.originalFileName === file.originalname);
                if (lectureMeta) {
                    lectureMeta.filePath = file.path; 
                } else {
                    console.warn(`[SERVER /automate-full-course] Uploaded lecture file ${file.originalname} has no matching metadata. Creating a fallback entry.`);
                    lecturesInfo.push({ 
                        title: file.originalname, 
                        filePath: file.path, 
                        associatedChapterKey: 'default_chapter_key_for_uploaded_file' 
                    });
                }
            });
        }
        
        const serviceParams = {
            courseTitle,
            textbookPdfPath: textbookPdfFile.path,
            textbookPdfOriginalName: textbookPdfFile.originalname,
            trueFirstPageNumber,
            lectures: lecturesInfo, 
            majorTag,
            subjectTag,
            megaEmail,
            megaPassword,
            geminiApiKey: apiKeyForService, 
            assemblyAiApiKey
        };

        console.log(`[SERVER /automate-full-course] Calling automateNewCourseCreation for course: "${courseTitle}" with processed API key information.`);
        const result = await courseAutomationService.automateNewCourseCreation(serviceParams);

        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(500).json(result);
        }

    } catch (error) {
        console.error('[SERVER /automate-full-course] Unexpected error:', error);
        res.status(500).json({
            success: false,
            message: `Server error during course automation: ${error.message}`,
            error: error.stack 
        });
    } finally {
        console.log('[SERVER /automate-full-course] Cleaning up temporary files:', uploadedFilePaths);
        for (const filePath of uploadedFilePaths) {
            if (fs.existsSync(filePath)) {
                try {
                    await fs.unlink(filePath);
                    console.log(`[SERVER /automate-full-course] Deleted temporary file: ${filePath}`);
                } catch (unlinkError) {
                    console.error(`[SERVER /automate-full-course] Error deleting temporary file ${filePath}:`, unlinkError);
                }
            }
        }
    }
});
// --- END OF FILE pdf-server.js ---