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
const port = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Keep static serving for images and other potential assets
app.use(express.static(__dirname));
console.log(`[SERVER] Serving static files from: ${__dirname}`);

let browserInstance = null;

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
                // '--disable-web-security', // Use with caution if needed for local file access
                // '--allow-file-access-from-files', // Use with caution
                // '--disable-features=BlockTruncatedQueues', // May not be needed
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
        // New condition for feedback PDF
        else if (lowerFilename.includes('feedback_report')) {
             cssFileNameToInject = 'pdf_exam_styles.css'; // Or a dedicated feedback_styles.css
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
        // Proceed without injected CSS, but log it clearly
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
                 if (!args.some(arg => typeof arg === 'string' && arg.includes('[PDF HTML Inner] MathJax'))) { // Filter out verbose MathJax logs
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
             // Log image requests specifically or if they are from the expected path
             if (resourceType === 'image' || url.includes('/images/') || url.includes('/assets/images/')) {
                  console.log(`[PUPPETEER PAGE - REQUEST]: ${resourceType.toUpperCase()} ${request.method()} ${url}`);
             }
         });

        console.log('[SERVER] Setting page content in Puppeteer (CSS should be inline)...');
        // Using `file://` protocol requires `--allow-file-access-from-files` and careful path construction if serving local HTML files.
        // For HTML content string, `about:blank` then `setContent` is more reliable.
        await page.goto('about:blank', { waitUntil: 'networkidle0' });
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0', // Waits for network to be idle (useful if HTML loads external resources)
            timeout: 90000 
        });
        console.log('[SERVER] Page content set. Waiting for MathJax global flag...');

        try {
            await page.waitForFunction('window.mathJaxIsCompletelyReadyForPdf === true || window.mathJaxIsCompletelyReadyForPdf === "error"', {
                timeout: 75000 // Increased timeout for MathJax
            });
            const mathJaxState = await page.evaluate(() => window.mathJaxIsCompletelyReadyForPdf);
            if (mathJaxState === 'error') {
                console.error('[SERVER] MathJax signaled an error during its startup/typesetting in Puppeteer.');
                // Potentially log more details from the page if MathJax provides them.
            } else if (mathJaxState === true) {
                console.log('[SERVER] MathJax signaled ready via global flag.');
            } else {
                 console.warn('[SERVER] MathJax did not explicitly signal readiness (flag was not true) nor error. Proceeding with PDF generation.');
            }
        } catch (e) {
            console.error('[SERVER] Timeout or error waiting for MathJax signal `window.mathJaxIsCompletelyReadyForPdf`. Error:', e.message);
            // Attempt to get more diagnostic info from the page
            const bodyHTMLSample = await page.evaluate(() => document.body.innerHTML.substring(0, 2000)).catch(() => "Could not get body HTML");
            console.error("[SERVER DEBUG] Body HTML sample on MathJax timeout:", bodyHTMLSample);
            const mathJaxScriptTag = await page.evaluate(() => document.getElementById('mathjax-pdf-script')?.outerHTML).catch(() => "MathJax script tag not found");
            console.error("[SERVER DEBUG] MathJax script tag:", mathJaxScriptTag);
        }

        console.log('[SERVER] Waiting a final short delay (e.g., 5s) for rendering stabilization after MathJax signal...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Delay to ensure rendering stability

        console.log('[SERVER] Generating PDF with Puppeteer...');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true, // Crucial for custom backgrounds
            margin: { top: '1.5cm', right: '1.2cm', bottom: '1.5cm', left: '1.2cm' }, // Slightly adjusted example margins
            timeout: 120000, // Puppeteer PDF generation timeout
            // preferCSSPageSize: true, // If you use @page in CSS
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
            // If transcribeLecture handled the error and returned success:false, send a 500
            // If it threw an error, it would be caught by the catch block below.
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
        // Clean up uploaded file if other params are missing
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
            res.status(500).json(result); // Service handled error, returned success:false
        }
    } catch (error) {
        console.error('[SERVER /process-textbook-pdf] Unexpected error calling processTextbookPdf:', error);
        res.status(500).json({
            success: false,
            message: `Server error during PDF processing: ${error.message}`,
            error: error.stack
        });
    } finally {
        // Cleanup the temporary uploaded file
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
            res.status(500).json(result); // Service handled error, returned success:false
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
        selectedLectures, // Array of { title: "Lecture Title", megaSrtLink: "..." }
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
            res.status(500).json(result); // Service handled error, returned success:false
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
// --- END OF FILE pdf-server.js ---