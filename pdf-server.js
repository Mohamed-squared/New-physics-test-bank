// --- START OF FILE pdf-server.js ---
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs'); // Import the 'fs' module for file reading

const app = express();
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
// --- END OF FILE pdf-server.js ---