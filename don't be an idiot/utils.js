// --- START OF FILE utils.js ---

// --- Loading Indicators ---
export function showLoading(message) {
    const overlay = document.getElementById('loading-overlay');
    const msgElement = document.getElementById('loading-message');
    if (overlay) {
        if (msgElement) msgElement.textContent = message || "Processing...";
        overlay.classList.remove('hidden');
    } else {
        console.warn("Loading overlay element not found.");
    }
}

export function hideLoading() {
    document.getElementById('loading-overlay')?.classList.add('hidden');
}

// --- MathJax ---

// --- MathJax Ready Promise ---
let resolveMathJaxReady;
export let mathJaxReadyPromise = new Promise(resolve => {
    resolveMathJaxReady = resolve;
    window.resolveMathJaxReady = resolve; // Allow inline config to resolve it
    console.log("MathJax ready promise created, waiting for resolution...");
});

// Fallback listener for MathJax script loading
function setupMathJaxListeners() {
    const script = document.getElementById('mathjax-script');
    if (script) {
        const handleLoad = () => {
            console.log("MathJax script detected as loaded/complete.");
            if (typeof MathJax !== 'undefined' && MathJax.startup) {
                MathJax.startup.promise.then(() => {
                    console.log("MathJax startup promise resolved.");
                    if (resolveMathJaxReady) {
                         resolveMathJaxReady();
                         resolveMathJaxReady = null; // Prevent multiple resolutions
                    }
                }).catch(err => {
                    console.error("MathJax startup promise rejected:", err);
                    if (resolveMathJaxReady) {
                         resolveMathJaxReady(); // Resolve anyway
                         resolveMathJaxReady = null;
                    }
                });
            } else {
                console.error("MathJax script loaded, but MathJax object/startup not ready.");
                 if (resolveMathJaxReady) {
                    resolveMathJaxReady(); // Resolve anyway
                    resolveMathJaxReady = null;
                 }
            }
        };

        if (script.readyState === 'complete' || script.readyState === 'loaded' || (typeof MathJax !== 'undefined' && MathJax.startup?.promise)) {
             // Already loaded or ready
             console.log("MathJax already loaded/ready on listener setup.");
             handleLoad();
        } else {
            // Standard listeners
            script.onload = handleLoad;
            script.onerror = () => {
                console.error("Failed to load MathJax script.");
                 if (resolveMathJaxReady) {
                     resolveMathJaxReady(); // Resolve to not block
                     resolveMathJaxReady = null;
                 }
            };
        }
    } else {
        console.error("MathJax script tag not found.");
         if (resolveMathJaxReady) {
             resolveMathJaxReady(); // Resolve to not block
             resolveMathJaxReady = null;
         }
    }
}

// Ensure the promise chain resolves correctly after setup
mathJaxReadyPromise = mathJaxReadyPromise.then(() => {
        console.log("Final MathJax Ready Promise resolved.");
    })
    .catch(err => {
        console.error("Error in MathJax Ready Promise chain:", err);
        return Promise.resolve(); // Don't block app
    });

// Setup listeners when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMathJaxListeners);
} else {
    setupMathJaxListeners(); // DOM already loaded
}

// --- MathJax Rendering Helper ---
export async function renderMathIn(element) {
    if (!element) {
        console.warn("renderMathIn: Called with null or undefined element.");
        return;
    }
    // Add a delay to allow DOM updates, especially after complex innerHTML changes
    await new Promise(resolve => setTimeout(resolve, 50));

    console.log(`renderMathIn: Starting for element: ${element.id || element.tagName}`);

    try {
        await mathJaxReadyPromise; // Wait for MathJax to be fully ready
        console.log("renderMathIn: MathJax is ready.");

        if (typeof MathJax === 'undefined' || !MathJax.typesetPromise) {
            throw new Error('MathJax or typesetPromise not available after promise resolution.');
        }

        // Clear previous typesetting results within the element to prevent conflicts
        // Use MathJax.startup.document.clear() only if re-typesetting the entire document,
        // otherwise use clearMathItemsWithin for targeted elements.
         if (element === document.body) {
              // Avoid clearing entire document unless necessary
              console.warn("renderMathIn: Attempting to clear MathItems for entire body - this might be inefficient.");
              // MathJax.startup.document.clear(); // Use with caution
         } else {
              MathJax.startup.document.clearMathItemsWithin(element);
              console.log(`renderMathIn: Cleared previous MathJax items in [${element.id || element.tagName}]`);
         }


        // Typeset the specific element
        console.log(`renderMathIn: Calling MathJax.typesetPromise specific to [${element.id || element.tagName}]`);
        await MathJax.typesetPromise([element]);
        console.log(`renderMathIn: MathJax typesetPromise finished for specific element: ${element.id || element.tagName}`);

    } catch (error) {
        console.error(`renderMathIn Error for ${element.id || element.tagName}:`, error);
         // Avoid adding duplicate error messages
         if(element.querySelector && !element.querySelector('.mathjax-error-msg')) {
            const errorMsg = document.createElement('p');
            errorMsg.className = 'text-red-500 text-xs mt-1 mathjax-error-msg';
            errorMsg.textContent = '[Math rendering failed: Check console]';
             // Append safely
             try {
                 element.appendChild(errorMsg);
             } catch (appendError) {
                 console.error("Failed to append MathJax error message:", appendError);
             }
         }
    }
}

// --- General Utilities ---

// Helper to escape HTML entities
export function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Format date string (YYYY-MM-DD)
export function getFormattedDate(date = new Date()) {
     if (!(date instanceof Date) || isNaN(date)) {
         console.warn("getFormattedDate: Invalid date object received.", date);
         return 'N/A'; // Return N/A for invalid dates
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
         return -1; // Indicate error or invalid input
     }
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    // Clone dates and reset time part to compare dates only
    const firstDate = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const secondDate = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
    // Use Math.floor to handle potential DST issues and ensure integer days
    return Math.floor((secondDate - firstDate) / oneDay);
}
// --- END OF FILE utils.js ---