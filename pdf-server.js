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
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--font-render-hinting=none',
                '--enable-precise-memory-info',
                '--disable-gpu',
                '--disable-web-security',
                '--allow-file-access-from-files',
                '--disable-features=BlockTruncatedQueues',
            ],
            dumpio: true
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
        // --- MODIFIED: Determine CSS file based on filename ---
        let cssFileNameToInject = 'pdf_exam_styles.css'; // Default to exam styles
        const lowerFilename = filename.toLowerCase();
        if (lowerFilename.includes('formula_sheet') || 
            lowerFilename.includes('summary') || 
            lowerFilename.includes('note_')) { // Check for "note_" for general notes
            cssFileNameToInject = 'pdf_formula_sheet_styles.css'; // Use formula sheet styles for these
        }
        console.log(`[SERVER] Determined CSS file to inject: ${cssFileNameToInject}`);
        // --- END MODIFICATION ---

        const cssFilePath = path.join(__dirname, 'css', cssFileNameToInject);
        if (fs.existsSync(cssFilePath)) {
            injectedCss = fs.readFileSync(cssFilePath, 'utf8');
            console.log(`[SERVER] Successfully read ${cssFileNameToInject}. Length: ${injectedCss.length}`);
            
            // Remove any existing <link rel="stylesheet" href="css/..."> tag
            // This regex is broad and might remove other links if they have href="css/..."
            // A more specific one would be: /<link\s+rel="stylesheet"\s+href="css\/(pdf_exam_styles\.css|pdf_formula_sheet_styles\.css)"\s*\/?>/gi
            htmlContent = htmlContent.replace(/<link\s+rel="stylesheet"\s+href="css\/[^"]+\.css"\s*\/?>/gi, '');
            console.log("[SERVER] Removed existing linked CSS tags if any.");

            const headEndTag = '</head>';
            const headEndIndex = htmlContent.toLowerCase().indexOf(headEndTag);
            if (headEndIndex !== -1) {
                htmlContent = htmlContent.slice(0, headEndIndex) +
                              `<style type="text/css">\n${injectedCss}\n</style>\n` +
                              htmlContent.slice(headEndIndex);
                console.log(`[SERVER] Injected ${cssFileNameToInject} content directly into HTML <head>.`);
            } else {
                console.warn("[SERVER] Could not find </head> tag to inject CSS. Styles might not apply correctly.");
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

    console.log("[SERVER DEBUG] HTML Content Start (first 500 chars after CSS injection):", htmlContent.substring(0, 500) + "...");

    let page;
    try {
        const browser = await getBrowserInstance();
        page = await browser.newPage();

        page.on('console', async msg => {
            const type = msg.type().toUpperCase();
            try {
                const args = await Promise.all(msg.args().map(arg => arg.jsonValue()));
                 if (!args.some(arg => typeof arg === 'string' && arg.includes('[PDF HTML Inner] MathJax'))) {
                    console.log(`[PUPPETEER PAGE - ${type}]:`, ...args);
                 }
            } catch (e) {
                 console.log(`[PUPPETEER PAGE - ${type}]: (Could not stringify args)`, msg.text());
            }
        });
        page.on('pageerror', ({ message }) => console.error(`[PUPPETEER PAGE ERROR]: ${message}`));
        page.on('requestfailed', request => console.warn(`[PUPPETEER REQUEST FAILED]: ${request.url()} - ${request.failure()?.errorText}`));
        page.on('request', request => {
             const resourceType = request.resourceType();
             const url = request.url();
             if (resourceType === 'image' || url.includes('/images/')) { // Only log images now
                  console.log(`[PUPPETEER PAGE - REQUEST]: ${resourceType.toUpperCase()} ${request.method()} ${url}`);
             }
         });

        console.log('[SERVER] Setting page content in Puppeteer (CSS is inline)...');
        await page.goto('about:blank');
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0', // Wait for network to be idle
            timeout: 90000 // Increased timeout
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
                 console.warn('[SERVER] MathJax did not explicitly signal readiness or error.');
            }
        } catch (e) {
            console.error('[SERVER] Timeout or error waiting for MathJax signal.', e);
            const bodyHTMLSample = await page.evaluate(() => document.body.innerHTML.substring(0, 2000));
            console.error("[SERVER DEBUG] Body HTML sample on MathJax timeout:", bodyHTMLSample);
        }

        console.log('[SERVER] Waiting a final short delay for rendering stabilization...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('[SERVER] Generating PDF with Puppeteer...');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '1.5cm', right: '1.5cm', bottom: '1.5cm', left: '1.5cm' },
            timeout: 120000,
        });
        console.log('[SERVER] PDF generated successfully by Puppeteer.');

        res.contentType('application/pdf');
        res.send(pdfBuffer);

    } catch (error) {
        console.error('[SERVER] Error generating PDF in Puppeteer server:', error);
        res.status(500).send(`Error generating PDF: ${error.message}`);
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