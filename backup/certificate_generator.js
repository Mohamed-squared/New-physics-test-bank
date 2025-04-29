// certificate_generator.js
import { showLoading, hideLoading, getFormattedDate } from './utils.js';

// --- Configuration ---
const TEMPLATE_BASE_PATH = './assets/images/branding/'; // Path to certificate images

// Font styles (Adjust if needed to better match template visuals)
const NAME_FONT = 'bold 28px Times New Roman, serif'; // Example font
const COURSE_FONT = 'bold 24px Times New Roman, serif'; // Example font
const DATE_FONT = '18px Times New Roman, serif';
const GRADE_FONT = 'bold 20px Times New Roman, serif';
const TEXT_COLOR = '#2d3748'; // Dark grey/blue

// Max widths before attempting to shrink font (Estimate based on line lengths)
const MAX_NAME_WIDTH = 680; // Adjust based on template line length for name
const MAX_COURSE_WIDTH = 680; // Adjust based on template line length for course

// --- Coordinate Definitions per Grade Template ---
// Estimates based on provided "bottom midpoint" values. Y values are adjusted UPWARDS
// to position the text baseline correctly above the visible lines on the templates.
// *** FINE-TUNE THESE VALUES BY TESTING WITH YOUR ACTUAL IMAGES ***
const GRADE_LAYOUTS = {
    "A+": {
        NAME_POS: { x: 512, y: 801 - 15, align: 'center' }, // y = 786
        COURSE_POS: { x: 512, y: 963 - 12, align: 'center' }, // y = 951
        DATE_VALUE_POS: { x: 310, y: 1144 - 5, align: 'left' }, // y = 1139 (Using X=310 as the left start)
        GRADE_VALUE_POS: { x: 700, y: 1144 - 5, align: 'left' }  // y = 1139 (Estimate X based on A+ template label)
    },
    "A": {
        NAME_POS: { x: 512, y: 833 - 15, align: 'center' }, // y = 818
        COURSE_POS: { x: 512, y: 980 - 12, align: 'center' }, // y = 968
        DATE_VALUE_POS: { x: 310, y: 1110 - 5, align: 'left' }, // y = 1105 (Using X=310 as the left start)
        GRADE_VALUE_POS: { x: 680, y: 1110 - 5, align: 'left' }  // y = 1105 (Estimate X based on A template label)
    },
    "B+": {
        NAME_POS: { x: 512, y: 820 - 15, align: 'center' }, // y = 805
        COURSE_POS: { x: 512, y: 985 - 12, align: 'center' }, // y = 973
        DATE_VALUE_POS: { x: 310, y: 1146 - 5, align: 'left' }, // y = 1141 (Using X=310 as the left start)
        GRADE_VALUE_POS: { x: 680, y: 1146 - 5, align: 'left' }  // y = 1141 (Estimate X based on B+ template label)
    },
    "B": {
        NAME_POS: { x: 512, y: 833 - 15, align: 'center' }, // y = 818
        COURSE_POS: { x: 512, y: 975 - 12, align: 'center' }, // y = 963
        DATE_VALUE_POS: { x: 310, y: 1110 - 5, align: 'left' }, // y = 1105 (Using X=310 as the left start)
        GRADE_VALUE_POS: { x: 680, y: 1110 - 5, align: 'left' }  // y = 1105 (Estimate X based on B template label)
    },
    "C+": {
        NAME_POS: { x: 512, y: 823 - 15, align: 'center' }, // y = 808
        COURSE_POS: { x: 512, y: 990 - 12, align: 'center' }, // y = 978
        DATE_VALUE_POS: { x: 310, y: 1110 - 5, align: 'left' }, // y = 1105 (Using X=310 as the left start)
        GRADE_VALUE_POS: { x: 680, y: 1110 - 5, align: 'left' }  // y = 1105 (Estimate X based on C+ template label)
    },
    "C": {
        NAME_POS: { x: 512, y: 817 - 15, align: 'center' }, // y = 802
        COURSE_POS: { x: 512, y: 967 - 12, align: 'center' }, // y = 955
        DATE_VALUE_POS: { x: 310, y: 1165 - 5, align: 'left' }, // y = 1160 (Using X=310 as the left start)
        GRADE_VALUE_POS: { x: 680, y: 1165 - 5, align: 'left' }  // y = 1160 (Estimate X based on C template label)
    }
    // No layout needed for 'F' as it doesn't get a certificate based on current logic
};

// --- Certificate Generation Function ---

/**
 * Generates a personalized certificate image on a canvas.
 * @param {HTMLCanvasElement} canvas - The canvas element to draw on.
 * @param {string} studentName - The student's name.
 * @param {string} courseName - The name of the course.
 * @param {string} grade - The letter grade achieved (e.g., "A+", "B").
 * @param {Date|null} completionDate - The date of completion (optional).
 * @returns {Promise<boolean>} - True if generation succeeded, false otherwise.
 */
export async function generateCertificateOnCanvas(canvas, studentName, courseName, grade, completionDate) {
    if (!canvas) {
        console.error("Canvas element not provided for certificate generation.");
        return false;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Could not get 2D context from canvas.");
        return false;
    }

    // Determine which template file and layout to use
    let gradeKey = grade;
    if (!GRADE_LAYOUTS[gradeKey]) {
        console.warn(`No specific layout found for grade ${grade}. Using layout for grade 'C'.`);
        gradeKey = 'C'; // Use 'C' layout as a fallback if specific grade layout is missing
    }
    const layout = GRADE_LAYOUTS[gradeKey];

    let gradeFilePart = grade.toLowerCase().replace('+', '_plus');
    let templateFile = `certificate-${gradeFilePart}.png`;
    const templateUrl = `${TEMPLATE_BASE_PATH}${templateFile}`;

    // Fallback template file if specific grade template is missing
    const fallbackTemplateFile = 'certificate-c.png'; // Use C template image as fallback
    const fallbackUrl = `${TEMPLATE_BASE_PATH}${fallbackTemplateFile}`;

    console.log(`Attempting to load certificate template: ${templateUrl} with layout for grade: ${gradeKey}`);

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            console.log(`Template loaded: ${img.src}`);
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0); // Draw template background (with lines/labels)

            // --- Draw Dynamic Text ---
            ctx.fillStyle = TEXT_COLOR; // Set text color

            // Student Name
            ctx.textAlign = layout.NAME_POS.align;
            drawTextWithMaxWidth(ctx, studentName.toUpperCase(), layout.NAME_POS.x, layout.NAME_POS.y, NAME_FONT, MAX_NAME_WIDTH);

            // Course Name
            ctx.textAlign = layout.COURSE_POS.align;
            drawTextWithMaxWidth(ctx, courseName.toUpperCase(), layout.COURSE_POS.x, layout.COURSE_POS.y, COURSE_FONT, MAX_COURSE_WIDTH);

            // Date Value
            ctx.textAlign = layout.DATE_VALUE_POS.align;
            ctx.font = DATE_FONT;
            const dateStr = completionDate ? getFormattedDate(completionDate instanceof Date ? completionDate : new Date(completionDate)) : "N/A";
            ctx.fillText(dateStr, layout.DATE_VALUE_POS.x, layout.DATE_VALUE_POS.y);

            // Grade Value
            ctx.textAlign = layout.GRADE_VALUE_POS.align;
            ctx.font = GRADE_FONT;
            ctx.fillText(grade, layout.GRADE_VALUE_POS.x, layout.GRADE_VALUE_POS.y);

            // Static labels and lines are part of the template image

            console.log("Certificate dynamic text drawn.");
            resolve(true); // Indicate success
        };
        img.onerror = (e) => {
            console.error(`Error loading template image: ${img.src}`, e);
            if (img.src !== fallbackUrl) {
                console.log(`Trying fallback template: ${fallbackUrl}`);
                img.src = fallbackUrl; // Attempt to load fallback
            } else {
                console.error("Fallback template also failed to load.");
                // Draw error message on canvas if templates fail
                ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
                ctx.fillStyle = '#eee'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'red'; ctx.font = '20px Arial'; ctx.textAlign = 'center';
                ctx.fillText('Error loading certificate template.', canvas.width / 2, canvas.height / 2);
                resolve(false); // Indicate failure
            }
        };
        // Ensure CORS compatibility if templates are on a different origin than the script
        // img.crossOrigin = "Anonymous"; // Uncomment if templates are hosted elsewhere
        img.src = templateUrl; // Start loading primary template
    });
}

// Helper function to draw text, potentially shrinking font size if too wide
function drawTextWithMaxWidth(ctx, text, x, y, font, maxWidth) {
    ctx.font = font;
    let currentFont = font;
    let textWidth = ctx.measureText(text).width;

    // Basic shrinking logic (could be improved with word wrapping)
    if (textWidth > maxWidth) {
        let fontSize = parseInt(font.match(/(\d+)px/)[1] || '16'); // Extract font size or default
        const minFontSize = 10; // Minimum practical font size
        console.log(`Text "${text}" too wide (${textWidth.toFixed(0)} > ${maxWidth}). Shrinking font from ${fontSize}px...`);
        while (textWidth > maxWidth && fontSize > minFontSize) {
            fontSize -= 1;
            currentFont = font.replace(/(\d+)px/, `${fontSize}px`);
            ctx.font = currentFont;
            textWidth = ctx.measureText(text).width;
        }
        console.log(`...final font size ${fontSize}px, width ${textWidth.toFixed(0)}px.`);
        // If still too wide after shrinking, it will just draw clipped or overlapping
        if (textWidth > maxWidth) {
             console.warn(`Text "${text}" still too wide (${textWidth.toFixed(0)}px > ${maxWidth}px) even after shrinking font to ${fontSize}px.`);
        }
    }

    // fillText uses the current textAlign setting relative to the (x, y) coordinate
    ctx.fillText(text, x, y);
}

// --- Download Functions ---

/**
 * Triggers download of the canvas content as a PNG image.
 * @param {HTMLCanvasElement} canvas - The canvas with the certificate.
 * @param {string} filename - Desired filename (without extension).
 */
export function downloadCertificateImage(canvas, filename = 'certificate') {
    if (!canvas) return;
    try {
        // Ensure canvas isn't blank before attempting download
        if (canvas.width === 0 || canvas.height === 0) {
             console.error("Cannot download image: Canvas is blank or has zero dimensions.");
             alert("Cannot download image. Certificate preview might be empty or failed to generate.");
             return;
         }
        const dataUrl = canvas.toDataURL('image/png');
        if (!dataUrl || dataUrl === 'data:,') { // Check for empty data URL
             console.error("Cannot download image: Generated Data URL is empty.");
             alert("Could not generate image data for download. Please try regenerating the preview.");
             return;
         }
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Error generating PNG data URL or triggering download:", e);
        alert("Could not generate image for download. The certificate preview might be tainted by cross-origin resources if the template isn't hosted locally, or the canvas is empty.");
    }
}

/**
 * Triggers download of the canvas content as a PDF document.
 * @param {HTMLCanvasElement} canvas - The canvas with the certificate.
 * @param {string} filename - Desired filename (without extension).
 */
export function downloadCertificatePdf(canvas, filename = 'certificate') {
    if (!canvas) return;
    if (typeof jspdf === 'undefined') {
         alert("Error: jsPDF library not loaded. Cannot download PDF.");
         console.error("jsPDF not found. Make sure it's included in index.html.");
         return;
    }

    showLoading("Generating PDF...");
    try {
         // Ensure canvas isn't blank before attempting download
         if (canvas.width === 0 || canvas.height === 0) {
             throw new Error("Canvas is blank or has zero dimensions.");
         }
        const imgData = canvas.toDataURL('image/jpeg', 0.9); // Use JPEG for potentially smaller PDF size
        if (!imgData || imgData === 'data:,') { // Check for empty data URL
             throw new Error("Generated image data URL is empty.");
         }

        const { jsPDF } = jspdf; // Destructure jsPDF from the global jspdf object

        // Determine orientation based on canvas aspect ratio
        const orientation = canvas.width > canvas.height ? 'l' : 'p'; // 'landscape' or 'portrait'
        // Use standard paper size (A4) dimensions in mm
        const pdfWidth = orientation === 'l' ? 297 : 210;
        const pdfHeight = orientation === 'l' ? 210 : 297;

        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: 'a4'
        });

        // Add image without margins, filling the page
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${filename}.pdf`);
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error("Error generating PDF:", error);
        alert(`Failed to generate PDF: ${error.message}. Check console for details.`);
    }
}