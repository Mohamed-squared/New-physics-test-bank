// --- START OF FILE utils.js ---

// --- Loading Indicators ---
export function showLoading(message) {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.innerHTML = `
            <div>
                <div class="loader"></div>
                <p id="loading-message">Processing...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    const msgElement = document.getElementById('loading-message');
    if (msgElement) msgElement.textContent = message || "Processing...";
    overlay.classList.add('visible');
    overlay.classList.remove('hidden');
}

export function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
        overlay.classList.add('hidden');
    }
}

// --- MathJax ---

export let mathJaxReadyPromise;
let mathJaxResolveReference;

if (typeof MathJax !== 'undefined' && MathJax.startup?.promise) {
    console.log("[MathJax Utils] MathJax detected as pre-loaded or initialized quickly.");
    mathJaxReadyPromise = MathJax.startup.promise.then(() => {
        console.log("[MathJax Utils] MathJax ready (pre-loaded or quick init).");
    }).catch(err => {
        console.error("[MathJax Utils] Error during pre-loaded MathJax startup:", err);
        return Promise.resolve(); 
    });
} else {
    mathJaxReadyPromise = new Promise(resolve => {
        mathJaxResolveReference = resolve;
    });

    const mjScript = document.getElementById('mathjax-script');
    if (mjScript) {
        const handleMathJaxLoad = () => { /* ... (same as previous robust version) ... */ };
        mjScript.addEventListener('load', handleMathJaxLoad);
        mjScript.addEventListener('error', () => { /* ... (same as previous robust version) ... */ });
        if (mjScript.readyState === 'complete' || mjScript.readyState === 'loaded') { handleMathJaxLoad(); }
    } else {
        console.error("[MathJax Utils] MathJax script tag (#mathjax-script) not found.");
        if (mathJaxResolveReference) { mathJaxResolveReference(); mathJaxResolveReference = null; }
    }
}

setTimeout(() => { /* ... (fallback timeout same as previous robust version) ... */ }, 2000);

// Fallback timeout check for MathJax readiness, in case events are unreliable
// This ensures the mathJaxReadyPromise eventually resolves.
setTimeout(() => {
    if (mathJaxResolveReference) { // If it hasn't been resolved by event listeners
        if (typeof MathJax !== 'undefined' && MathJax.startup?.promise) {
            console.log("[MathJax Utils] Checking MathJax readiness via fallback timeout...");
            MathJax.startup.promise.then(() => {
                if (mathJaxResolveReference) { // Check again, as it might have resolved in the meantime
                    console.log("[MathJax Utils] MathJax startup.promise resolved via fallback timeout.");
                    mathJaxResolveReference();
                    mathJaxResolveReference = null;
                }
            }).catch(err => {
                console.error("[MathJax Utils] MathJax startup.promise rejected via fallback timeout:", err);
                if (mathJaxResolveReference) {
                    mathJaxResolveReference();
                    mathJaxResolveReference = null;
                }
            });
        } else {
            console.warn("[MathJax Utils] MathJax still not ready after fallback timeout. Resolving promise to prevent blocking.");
            mathJaxResolveReference();
            mathJaxResolveReference = null;
        }
    }
}, 2000); // Wait 2 seconds, adjust if necessary


// --- MathJax Rendering Helper ---
export async function renderMathIn(element) {
    if (!element) {
        console.warn("renderMathIn: Called with null or undefined element.");
        return;
    }
    // A small delay can sometimes help ensure the DOM is fully updated before MathJax runs.
    await new Promise(resolve => setTimeout(resolve, 50)); 

    console.log(`[renderMathIn] Attempting to render MathJax for element: ${element.id || element.tagName}`);

    try {
        await mathJaxReadyPromise; // Wait for MathJax to be fully ready
        console.log("[renderMathIn] MathJax is ready. Proceeding with typesetting.");

        if (typeof MathJax === 'undefined' || typeof MathJax.typesetPromise !== 'function') {
            console.error('[renderMathIn] MathJax or MathJax.typesetPromise is not available even after promise resolution.');
            throw new Error('MathJax library not properly initialized.');
        }
        
        // It's crucial that MathJax processes the content of the element
        // as it is, assuming it contains LaTeX delimiters.

        // Clear previous typesetting results *within this element*
        // This is important for re-rendering if content changes.
        if (MathJax.startup?.document?.clearMathItemsWithin) {
            MathJax.startup.document.clearMathItemsWithin(element);
            console.log(`[renderMathIn] Cleared previous MathJax items in element: ${element.id || element.tagName}`);
        } else {
            console.warn("[renderMathIn] MathJax.startup.document.clearMathItemsWithin not available. Skipping clear step.");
        }
        
        await MathJax.typesetPromise([element]);
        console.log(`[renderMathIn] MathJax typesetting complete for element: ${element.id || element.tagName}`);

    } catch (error) {
        console.error(`[renderMathIn] Error during MathJax processing for element ${element.id || element.tagName}:`, error);
        // Add a visual error message to the element if possible
        if (element.querySelector && !element.querySelector('.mathjax-render-error-msg')) {
            const errorMsgElement = document.createElement('p');
            errorMsgElement.className = 'text-red-500 text-xs mt-1 mathjax-render-error-msg';
            errorMsgElement.textContent = '[Math rendering failed. Check console.]';
            try {
                element.appendChild(errorMsgElement);
            } catch (appendError) {
                console.error("Failed to append MathJax rendering error message to element:", appendError);
            }
        }
    }
}

// --- General Utilities ---

// Helper to escape HTML entities
export function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")  // Escape & to &amp;
        .replace(/</g, "&lt;")   // Escape < to &lt;
        .replace(/>/g, "&gt;")   // Escape > to &gt;
        .replace(/"/g, "&quot;") // Escape " to &quot;
        .replace(/'/g, "&#39;"); // Escape ' to &#39;
}

// Format date string (YYYY-MM-DD)
export function getFormattedDate(date = new Date()) {
     if (!(date instanceof Date) || isNaN(date)) {
         console.warn("getFormattedDate: Invalid date object received.", date);
         return 'N/A'; 
     }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Calculate days between two dates
export function daysBetween(date1, date2) {
     if (!(date1 instanceof Date) || isNaN(date1) || !(date2 instanceof Date) || isNaN(date2)) {
         console.warn("daysBetween: Invalid date object(s) received.", date1, date2);
         return -1; 
     }
    const oneDay = 24 * 60 * 60 * 1000; 
    const firstDate = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const secondDate = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return Math.floor((secondDate - firstDate) / oneDay);
}

/**
 * Extracts the YouTube video ID from various YouTube URL formats.
 * @param {string} url - The YouTube URL.
 * @returns {string|null} - The video ID or null if not found/invalid.
 */
export function getYouTubeVideoId(url) {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
            return urlObj.searchParams.get('v');
        }
        else if (urlObj.hostname.includes('youtu.be')) {
            const pathParts = urlObj.pathname.split('/');
            if (pathParts.length >= 2 && pathParts[1]) {
                 return pathParts[1].split('?')[0];
            }
        }
         else if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/embed/')) {
             const pathParts = urlObj.pathname.split('/');
             if (pathParts.length >= 3 && pathParts[2]) {
                  return pathParts[2].split('?')[0];
             }
         }
    } catch (e) { console.error("Invalid URL format:", url, e); }
    console.warn("Could not extract YouTube Video ID from URL:", url);
    return null;
}

/**
 * Decodes HTML entities in a string.
 * @param {string} text The string with HTML entities.
 * @returns {string} The string with HTML entities decoded.
 */
export function decodeHtmlEntities(text) {
    if (typeof text !== 'string') {
        return text;
    }
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

// --- END OF FILE utils.js ---