// --- START OF FILE pdf-server.js ---

// --- Global Error Handlers ---
process.on('unhandledRejection', (reason, promise) => {
  console.error('-----------------------------------');
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('-----------------------------------');
});
process.on('uncaughtException', (error) => {
  console.error('-----------------------------------');
  console.error('Uncaught Exception:', error);
  console.error('-----------------------------------');
});
// --- End of Global Error Handlers ---

const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra');
const { transcribeLecture } = require('./lecture_transcription_service.js');
const { processTextbookPdf } = require('./pdf_processing_service.js');
const { generateQuestionsFromPdf } = require('./pdf_question_generation_service.js');
const { generateQuestionsFromLectures } = require('./lecture_question_generation_service.js');
const serverGoogleDrive = require('./google_drive_service_server.js'); // RENAMED_IMPORT
const courseAutomationService = require('./course_automation_service.js');
const multer = require('multer');

const app = express();
const TEMP_UPLOAD_DIR = path.join(__dirname, 'temp_uploads');
fs.ensureDirSync(TEMP_UPLOAD_DIR);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMP_UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage: storage });
const courseAutomationUpload = multer({ storage: storage }).fields([
    { name: 'textbookPdf', maxCount: 1 },
    { name: 'lectureFiles', maxCount: 20 }
]);

const port = 3001;
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(__dirname));
console.log(`[SERVER] Serving static files from: ${__dirname}`);

let browserInstance = null;
console.log("Node.js process PATH:", process.env.PATH);

async function getBrowserInstance() {
    if (!browserInstance || !browserInstance.isConnected()) {
        console.log("[SERVER] Launching new Puppeteer browser instance...");
        browserInstance = await puppeteer.launch({
            headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none', '--enable-precise-memory-info', '--disable-gpu'],
            dumpio: process.env.DEBUG_PUPPETEER === 'true'
        });
        browserInstance.on('disconnected', () => { browserInstance = null; });
    }
    return browserInstance;
}

app.post('/generate-pdf', async (req, res) => { /* ... existing PDF generation code ... */
    let { htmlContent, filename = 'document.pdf' } = req.body;
    console.log(`[SERVER] Received request for PDF: ${filename}`);
    if (!htmlContent) return res.status(400).send('Missing htmlContent');
    // ... (rest of the PDF generation logic remains the same)
    let injectedCss = '';
    try {
        let cssFileNameToInject = 'pdf_exam_styles.css';
        const lowerFilename = filename.toLowerCase();
        if (lowerFilename.includes('formula_sheet') || lowerFilename.includes('summary') || lowerFilename.includes('note_')) {
            cssFileNameToInject = 'pdf_formula_sheet_styles.css';
        } else if (lowerFilename.includes('feedback_report')) {
             cssFileNameToInject = 'pdf_exam_styles.css'; 
        }
        const cssFilePath = path.join(__dirname, 'css', cssFileNameToInject);
        if (fs.existsSync(cssFilePath)) {
            injectedCss = fs.readFileSync(cssFilePath, 'utf8');
            htmlContent = htmlContent.replace(/<link\s+rel="stylesheet"\s+href="css\/[^"]+\.css"\s*\/?>/gi, '');
            const headEndTag = '</head>';
            const headEndIndex = htmlContent.toLowerCase().indexOf(headEndTag);
            if (headEndIndex !== -1) {
                htmlContent = htmlContent.slice(0, headEndIndex) + `<style type="text/css">\n${injectedCss}\n</style>\n` + htmlContent.slice(headEndIndex);
            } else {
                const bodyStartTag = '<body';
                const bodyStartIndex = htmlContent.toLowerCase().indexOf(bodyStartTag);
                if (bodyStartIndex !== -1) htmlContent = htmlContent.slice(0, bodyStartIndex) + `<style type="text/css">\n${injectedCss}\n</style>\n` + htmlContent.slice(bodyStartIndex);
                else console.error("[SERVER] CRITICAL: Could not find <head> or <body> tag to inject CSS.");
            }
        } else console.error(`[SERVER] CRITICAL: CSS file ${cssFileNameToInject} not found. PDF will be unstyled.`);
    } catch (cssError) { console.error('[SERVER] Error reading or injecting CSS file:', cssError); }

    let page;
    try {
        const browser = await getBrowserInstance();
        page = await browser.newPage();
        page.on('console', async msg => { /* existing console logging */ });
        page.on('pageerror', ({ message }) => console.error(`[PUPPETEER PAGE ERROR]: ${message}`));
        page.on('requestfailed', request => console.warn(`[PUPPETEER REQUEST FAILED]: ${request.url()}`));
        await page.goto('about:blank', { waitUntil: 'networkidle0' });
        await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 90000 });
        try {
            await page.waitForFunction('window.mathJaxIsCompletelyReadyForPdf === true || window.mathJaxIsCompletelyReadyForPdf === "error"', { timeout: 75000 });
            // ... (MathJax logging logic)
        } catch (e) { console.error('[SERVER] Timeout or error waiting for MathJax signal:', e.message); }
        await new Promise(resolve => setTimeout(resolve, 5000)); 
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '1.5cm', right: '1.2cm', bottom: '1.5cm', left: '1.2cm' }, timeout: 120000 });
        res.contentType('application/pdf').send(pdfBuffer);
    } catch (error) {
        console.error('[SERVER] Error generating PDF:', error);
        res.status(500).send(`Error generating PDF: ${error.message}.`);
    } finally {
        if (page) await page.close().catch(e => console.error('[SERVER] Error closing page:', e));
    }
});

app.listen(port, () => console.log(`PDF generation server listening on http://localhost:${port}`));
process.on('SIGINT', async () => { if (browserInstance) await browserInstance.close(); process.exit(0); });

// --- Lecture Transcription Endpoint ---
app.post('/transcribe-lecture', async (req, res) => {
    console.log('[SERVER] Received /transcribe-lecture request.');
    const { youtubeUrl, courseId, chapterId, assemblyAiApiKey /* megaEmail, megaPassword removed */ } = req.body;
    if (!youtubeUrl || !courseId || !chapterId || !assemblyAiApiKey) {
        return res.status(400).json({ success: false, message: 'Missing required parameters for transcription.' });
    }
    try {
        // Note: transcribeLecture service was updated to use Google Drive and not expect email/password
        const result = await transcribeLecture(youtubeUrl, courseId, chapterId, assemblyAiApiKey);
        if (result.success) res.status(200).json(result);
        else res.status(500).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: `Server error: ${error.message}`, error: error.stack });
    }
});

// --- List Google Drive Folder Contents Endpoint ---
app.post('/list-google-drive-folder', async (req, res) => { // RENAMED_ENDPOINT
    console.log('[SERVER] Received /list-google-drive-folder request.');
    const { folderId = 'root' /* No longer megaFolderLink, megaEmail, megaPassword */ } = req.body;

    // TODO: Ensure serverGoogleDrive is initialized.
    // This might be done at server startup using a service account key path from env variables.
    // If not, serverGoogleDrive.initialize(YOUR_SERVICE_ACCOUNT_KEY_PATH) would be needed here.
    // For now, assuming it's initialized by services that call this, or globally.
    // Example:
    // if (!serverGoogleDrive.isInitialized()) { // Add an isInitialized method to the service
    //    const keyPath = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY_PATH;
    //    if (!keyPath) return res.status(500).json({ success: false, message: "Google Drive service not configured on server."});
    //    await serverGoogleDrive.initialize(keyPath);
    // }

    try {
        console.log(`[SERVER /list-google-drive-folder] Fetching contents for Google Drive folder ID: ${folderId}`);
        const contents = await serverGoogleDrive.getFolderContents(folderId);
        console.log(`[SERVER /list-google-drive-folder] Successfully fetched contents. Found ${contents.length} items.`);
        res.status(200).json({ success: true, contents: contents });
    } catch (error) {
        console.error(`[SERVER /list-google-drive-folder] Error processing folder ID ${folderId}:`, error);
        let statusCode = 500;
        let message = `Server error while processing Google Drive folder: ${error.message}`;
        // Basic error categorization (can be expanded)
        if (error.message && (error.message.includes('File not found') || error.code === 404)) {
            statusCode = 404; message = `Google Drive folder/file not found: ${folderId}. Check ID and permissions.`;
        } else if (error.message && (error.message.includes('permission') || error.code === 403)) {
            statusCode = 403; message = `Permission denied for Google Drive folder/file ID: ${folderId}.`;
        }
        res.status(statusCode).json({ success: false, message: message });
    }
});

// --- Textbook PDF Processing Endpoint ---
app.post('/process-textbook-pdf', upload.single('pdfFile'), async (req, res) => {
    console.log('[SERVER] Received /process-textbook-pdf request.');
    const { courseId, actualFirstPageNumber, geminiApiKey /* megaEmail, megaPassword removed */ } = req.body;
    const pdfFile = req.file;
    if (!pdfFile) return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });
    if (!courseId || !actualFirstPageNumber || !geminiApiKey) {
        if (pdfFile && pdfFile.path) await fs.unlink(pdfFile.path).catch(err => console.error(`Error unlinking: ${err.message}`));
        return res.status(400).json({ success: false, message: 'Missing required parameters.' });
    }
    let result;
    try {
        // Note: processTextbookPdf service was updated for Google Drive
        // It now expects an initialized serverGoogleDrive instance as its 4th argument
        // For this endpoint, we assume serverGoogleDrive is globally available and initialized.
        // If not, it needs to be initialized here using a configured service account key path.
        result = await processTextbookPdf(pdfFile.path, courseId, actualFirstPageNumber, serverGoogleDrive, geminiApiKey);
        if (result.success) res.status(200).json(result);
        else res.status(500).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: `Server error: ${error.message}`, error: error.stack });
    } finally {
        if (pdfFile && pdfFile.path) await fs.unlink(pdfFile.path).catch(err => console.error(`Error deleting temp PDF: ${err.message}`));
    }
});

// --- PDF Question Generation Endpoint ---
app.post('/generate-questions-from-pdf', async (req, res) => {
    console.log('[SERVER] Received /generate-questions-from-pdf request.');
    const { courseId, chapterKey, chapterPdfGoogleDriveId, chapterTitle, geminiApiKey /* megaEmail, megaPassword removed */ } = req.body;
    if (!courseId || !chapterKey || !chapterPdfGoogleDriveId || !chapterTitle || !geminiApiKey) {
        return res.status(400).json({ success: false, message: 'Missing required parameters.' });
    }
    try {
        // Note: generateQuestionsFromPdf service updated for Google Drive
        // It expects initializedServerGoogleDrive as 5th arg
        const result = await generateQuestionsFromPdf(courseId, chapterKey, chapterPdfGoogleDriveId, chapterTitle, serverGoogleDrive, geminiApiKey);
        if (result.success) res.status(200).json(result);
        else res.status(500).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: `Server error: ${error.message}`, error: error.stack });
    }
});

// --- Lecture Question Generation Endpoint ---
app.post('/generate-questions-from-lectures', async (req, res) => {
    console.log('[SERVER] Received /generate-questions-from-lectures request.');
    const { courseId, selectedLectures, chapterNameForLectures, geminiApiKey /* megaEmail, megaPassword removed */ } = req.body;
    if (!courseId || !selectedLectures || !Array.isArray(selectedLectures) || selectedLectures.length === 0 || !chapterNameForLectures || !geminiApiKey) {
        return res.status(400).json({ success: false, message: 'Missing or invalid parameters.' });
    }
    try {
        // Note: generateQuestionsFromLectures service updated for Google Drive
        // It expects initializedServerGoogleDrive as 4th arg
        const result = await generateQuestionsFromLectures(courseId, selectedLectures, chapterNameForLectures, serverGoogleDrive, geminiApiKey);
        if (result.success) res.status(200).json(result);
        else res.status(500).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: `Server error: ${error.message}`, error: error.stack });
    }
});

// --- Automated Full Course Creation Endpoint ---
app.post('/automate-full-course', courseAutomationUpload, async (req, res) => {
    console.log('[SERVER] Received /automate-full-course request.');
    const uploadedFilePaths = []; 
    try {
        const textbookPdfFile = (req.files && req.files['textbookPdf'] && req.files['textbookPdf'][0]) ? req.files['textbookPdf'][0] : null;
        const lectureFiles = (req.files && req.files['lectureFiles']) ? req.files['lectureFiles'] : [];
        if (textbookPdfFile) uploadedFilePaths.push(textbookPdfFile.path);
        lectureFiles.forEach(file => uploadedFilePaths.push(file.path));

        const { courseTitle, trueFirstPageNumber, lecturesMetadata, majorTag, subjectTag, assemblyAiApiKey /* megaEmail, megaPassword removed */ } = req.body;
        let rawGeminiApiKey = req.body.geminiApiKey;

        // Basic validation (can be more robust)
        if (!courseTitle || !textbookPdfFile || !trueFirstPageNumber || !majorTag || !subjectTag /*|| !assemblyAiApiKey - make optional?*/) {
            return res.status(400).json({ success: false, message: 'Missing core parameters for full course automation.' });
        }
        
        // API Key processing for Gemini (same logic as before to handle various formats)
        let apiKeyForService = null;
        if (Array.isArray(rawGeminiApiKey)) {
            const validKeysInArray = rawGeminiApiKey.filter(k => typeof k === 'string' && k.trim() !== '');
            if (validKeysInArray.length > 0) apiKeyForService = validKeysInArray;
        } else if (typeof rawGeminiApiKey === 'string' && rawGeminiApiKey.trim() !== '') {
            const trimmedKey = rawGeminiApiKey.trim();
            if (trimmedKey.startsWith('[') && trimmedKey.endsWith(']')) {
                try {
                    const parsedArray = JSON.parse(trimmedKey);
                    if (Array.isArray(parsedArray)) {
                        const validKeysInParsedArray = parsedArray.filter(k => typeof k === 'string' && k.trim() !== '');
                        if (validKeysInParsedArray.length > 0) apiKeyForService = validKeysInParsedArray;
                    } else apiKeyForService = trimmedKey;
                } catch (e) { apiKeyForService = trimmedKey; }
            } else apiKeyForService = trimmedKey;
        } else if (typeof rawGeminiApiKey === 'object' && rawGeminiApiKey !== null) {
            const commonKeys = ['key', 'apiKey', 'value']; let foundKey = null;
            for (const k of commonKeys) { if (typeof rawGeminiApiKey[k] === 'string' && rawGeminiApiKey[k].trim() !== '') { foundKey = rawGeminiApiKey[k].trim(); break; } }
            if (foundKey) apiKeyForService = foundKey;
        }
        if (!apiKeyForService) console.warn('[SERVER /automate-full-course] No valid Gemini API key provided by client; service will use its own default/fallback.');


        let lecturesInfo = [];
        if (lecturesMetadata) {
            try {
                lecturesInfo = JSON.parse(lecturesMetadata);
                if (!Array.isArray(lecturesInfo)) throw new Error("lecturesMetadata should be an array.");
            } catch (e) { return res.status(400).json({ success: false, message: `Invalid lecturesMetadata: ${e.message}` }); }
        }
        lectureFiles.forEach(file => {
            const lectureMeta = lecturesInfo.find(l => l.originalFileName === file.originalname);
            if (lectureMeta) lectureMeta.filePath = file.path;
            else lecturesInfo.push({ title: file.originalname, filePath: file.path, associatedChapterKey: 'default_chapter_key' });
        });
        
        const serviceParams = {
            courseTitle, textbookPdfPath: textbookPdfFile.path, textbookPdfOriginalName: textbookPdfFile.originalname,
            trueFirstPageNumber, lectures: lecturesInfo, majorTag, subjectTag,
            geminiApiKey: apiKeyForService, // Pass the processed key(s)
            assemblyAiApiKey,
            prerequisites: req.body.prerequisites, bannerPicUrl: req.body.bannerPicUrl, coursePicUrl: req.body.coursePicUrl
        };

        // Note: courseAutomationService.automateNewCourseCreation was updated to:
        // 1. No longer expect megaEmail, megaPassword
        // 2. Internally call serverGoogleDrive.initialize() with a service account key path.
        console.log(`[SERVER /automate-full-course] Calling automateNewCourseCreation for course: "${courseTitle}"`);
        const result = await courseAutomationService.automateNewCourseCreation(serviceParams);
        if (result.success) res.status(200).json(result);
        else res.status(500).json(result);

    } catch (error) {
        res.status(500).json({ success: false, message: `Server error: ${error.message}`, error: error.stack });
    } finally {
        for (const filePath of uploadedFilePaths) {
            if (fs.existsSync(filePath)) await fs.unlink(filePath).catch(err => console.error(`Error deleting temp file ${filePath}:`, err));
        }
    }
});
// --- END OF FILE pdf-server.js ---