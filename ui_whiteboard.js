// --- START OF FILE ui_whiteboard.js ---
import { showLoading, hideLoading } from './utils.js';
import { generateAndDownloadPdfWithMathJax, generateFormulaSheetPdfBaseHtml } from './ui_pdf_generation.js'; // For PDF download

let currentWhiteboardInstance = null; // To hold the active SimpleWhiteboard instance

class SimpleWhiteboard {
    constructor(canvasId, containerId) {
        this.canvas = document.getElementById(canvasId);
        this.container = document.getElementById(containerId);
        if (!this.canvas || !this.container) {
            console.error("Whiteboard canvas or container not found:", canvasId, containerId);
            throw new Error("Whiteboard elements missing.");
        }
        this.ctx = this.canvas.getContext('2d');
        this.drawing = false;
        this.lastPos = { x: 0, y: 0 };
        this.strokeColor = '#000000';
        this.lineWidth = 2;
        this.history = []; // For undo/redo
        this.currentPath = []; // For current drawing path

        this.resizeCanvas();
        this.clearCanvas();
        this.attachEvents();
        console.log(`SimpleWhiteboard initialized for canvas: ${canvasId}`);
    }

    resizeCanvas() {
        // Save current content
        const currentDrawing = this.canvas.toDataURL();

        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        
        // Restore content after resize
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear before redraw
            this.ctx.drawImage(img, 0, 0);
            this.applyCurrentSettings(); // Re-apply color, line width
        };
        img.src = currentDrawing;
    }

    applyCurrentSettings() {
        if (!this.ctx) return;
        this.ctx.strokeStyle = this.strokeColor;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
    }

    attachEvents() {
        this.canvas.addEventListener('mousedown', this.handleStart.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleEnd.bind(this));
        this.canvas.addEventListener('mouseout', this.handleEnd.bind(this));

        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleStart(e.touches[0]); }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.handleMove(e.touches[0]); }, { passive: false });
        this.canvas.addEventListener('touchend', this.handleEnd.bind(this), { passive: false });
    }

    getPos(evt) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }

    handleStart(e) {
        this.drawing = true;
        this.currentPath = []; // Start a new path
        this.lastPos = this.getPos(e);
        this.currentPath.push({ ...this.lastPos }); // Add first point to current path

        this.ctx.beginPath();
        this.ctx.moveTo(this.lastPos.x, this.lastPos.y);
        this.applyCurrentSettings();
    }

    handleMove(e) {
        if (!this.drawing) return;
        const currentPos = this.getPos(e);
        this.ctx.lineTo(currentPos.x, currentPos.y);
        this.ctx.stroke();
        this.lastPos = currentPos;
        this.currentPath.push({ ...this.lastPos }); // Add subsequent points
    }

    handleEnd() {
        if (!this.drawing) return;
        this.drawing = false;
        this.ctx.closePath();
        if (this.currentPath.length > 1) { // Only save if it's more than a dot
            this.history.push({
                path: this.currentPath,
                color: this.strokeColor,
                width: this.lineWidth
            });
        }
        this.currentPath = [];
    }

    clearCanvas() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.history = []; // Clear history as well
        console.log(`Whiteboard cleared: ${this.canvas.id}`);
    }

    setColor(color) {
        this.strokeColor = color;
        this.applyCurrentSettings();
    }

    setLineWidth(width) {
        this.lineWidth = parseInt(width, 10) || 2;
        this.applyCurrentSettings();
    }
    
    undo() {
        if (this.history.length === 0) return;
        this.history.pop(); // Remove the last drawn path
        this.redrawAll();
    }

    redrawAll() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.history.forEach(stroke => {
            this.ctx.beginPath();
            this.ctx.strokeStyle = stroke.color;
            this.ctx.lineWidth = stroke.width;
            this.ctx.lineJoin = 'round';
            this.ctx.lineCap = 'round';
            
            if (stroke.path.length > 0) {
                this.ctx.moveTo(stroke.path[0].x, stroke.path[0].y);
                for (let i = 1; i < stroke.path.length; i++) {
                    this.ctx.lineTo(stroke.path[i].x, stroke.path[i].y);
                }
                this.ctx.stroke();
            }
            this.ctx.closePath();
        });
        this.applyCurrentSettings(); // Restore current settings for next draw
    }

    destroy() {
        if (this.canvas) {
            this.canvas.removeEventListener('mousedown', this.handleStart);
            this.canvas.removeEventListener('mousemove', this.handleMove);
            this.canvas.removeEventListener('mouseup', this.handleEnd);
            this.canvas.removeEventListener('mouseout', this.handleEnd);
            this.canvas.removeEventListener('touchstart', this.handleStart);
            this.canvas.removeEventListener('touchmove', this.handleMove);
            this.canvas.removeEventListener('touchend', this.handleEnd);
        }
        this.canvas = null;
        this.ctx = null;
        this.history = [];
        currentWhiteboardInstance = null;
        console.log("SimpleWhiteboard instance destroyed.");
    }
}

// --- Public Functions ---
export function initializeWhiteboard(canvasId, containerId, toolbarConfig = null) {
    if (currentWhiteboardInstance) {
        currentWhiteboardInstance.destroy();
    }
    try {
        currentWhiteboardInstance = new SimpleWhiteboard(canvasId, containerId);
        
        // Listen for window resize to adjust canvas
        // This specific global event listener is fine as it pertains to a global event.
        window.addEventListener('resize', () => {
            if (currentWhiteboardInstance) {
                currentWhiteboardInstance.resizeCanvas();
                currentWhiteboardInstance.redrawAll();
            }
        });

        if (toolbarConfig) {
            const clearBtn = document.getElementById(toolbarConfig.clearButtonId);
            if (clearBtn) clearBtn.addEventListener('click', () => clearWhiteboard(canvasId));

            document.querySelectorAll(toolbarConfig.colorButtonSelector).forEach(btn => {
                btn.addEventListener('click', () => setWhiteboardColor(btn.dataset.color));
            });

            document.querySelectorAll(toolbarConfig.lineWidthSelector).forEach(btn => {
                btn.addEventListener('click', () => setWhiteboardLineWidth(btn.dataset.width));
            });

            const undoBtn = document.getElementById(toolbarConfig.undoButtonId);
            if (undoBtn) undoBtn.addEventListener('click', () => undoWhiteboardLastAction(canvasId));

            const downloadBtn = document.getElementById(toolbarConfig.downloadPdfButtonId);
            if (downloadBtn) downloadBtn.addEventListener('click', () => downloadWhiteboardAsPdf(canvasId));
        }

    } catch (e) {
        console.error("Failed to initialize whiteboard:", e);
    }
}

export function clearWhiteboard(canvasId) { // canvasId passed for explicitness, but uses current instance
    if (currentWhiteboardInstance && currentWhiteboardInstance.canvas.id === canvasId) {
        currentWhiteboardInstance.clearCanvas();
    } else if (currentWhiteboardInstance) {
        console.warn(`Clear called for ${canvasId} but current instance is ${currentWhiteboardInstance.canvas.id}. Clearing current instance.`);
        currentWhiteboardInstance.clearCanvas();
    } else {
        console.warn("No active whiteboard to clear for canvasId:", canvasId);
    }
}

export function setWhiteboardColor(color) {
    if (currentWhiteboardInstance) currentWhiteboardInstance.setColor(color);
}

export function setWhiteboardLineWidth(width) {
    if (currentWhiteboardInstance) currentWhiteboardInstance.setLineWidth(width);
}

export function undoWhiteboardLastAction(canvasId) {
    if (currentWhiteboardInstance && currentWhiteboardInstance.canvas.id === canvasId) {
        currentWhiteboardInstance.undo();
    } else {
        console.warn("No active whiteboard or ID mismatch for undo:", canvasId);
    }
}


export async function downloadWhiteboardAsPdf(canvasId, filename = "whiteboard_draft.pdf") {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        alert("Whiteboard canvas not found for download.");
        return;
    }
    showLoading("Preparing PDF...");
    try {
        const dataUrl = canvas.toDataURL('image/png');
        if (!dataUrl || dataUrl === 'data:,') {
             throw new Error("Canvas is blank or could not be converted to image data.");
        }
        const imageHtml = `<div style="text-align:center; padding: 1cm; background-color:#fff;"><img src="${dataUrl}" alt="Whiteboard Snapshot" style="max-width:100%; height:auto; border:1px solid #ccc;"></div>`;
        // Use a simple base HTML for whiteboard PDF, as formula sheet one has specific styles
        const pdfBaseHtml = `
            <!DOCTYPE html><html><head><title>${escapeHtml(filename.replace('.pdf', ''))}</title><meta charset="UTF-8">
            <style>body{margin:0; padding:0;} img{display:block; margin:0 auto;}</style>
            </head><body>${imageHtml}</body></html>`;
        
        await generateAndDownloadPdfWithMathJax(pdfBaseHtml, filename, 'whiteboard'); // 'whiteboard' hint for CSS if needed
    } catch (error) {
        console.error("Error downloading whiteboard as PDF:", error);
        alert("Failed to download whiteboard: " + error.message);
    } finally {
        hideLoading();
    }
}

// Global assignments
// window.initializeWhiteboard = initializeWhiteboard; // Now ES exported, global assignment (if needed) should be in script.js
// window.clearWhiteboard = clearWhiteboard; // Now ES exported, to be called via event listeners or imported
// window.setWhiteboardColor = setWhiteboardColor; // Now ES exported
// window.setWhiteboardLineWidth = setWhiteboardLineWidth; // Now ES exported
// window.undoWhiteboardLastAction = undoWhiteboardLastAction; // Now ES exported
// window.downloadWhiteboardAsPdf = downloadWhiteboardAsPdf; // Now ES exported

// --- END OF FILE ui_whiteboard.js ---