// --- START OF FILE filename_utils.js ---

// --- START OF FILE filename_utils.js ---

/**
 * Clean text for use in filenames by removing special characters
 * and replacing spaces with underscores. Handles basic English and Arabic.
 * @param {string} text - The input text.
 * @returns {string} - The cleaned text suitable for filenames.
 */
export function cleanTextForFilename(text) {
    if (!text) return '';
    // Keep letters (English, Arabic), numbers, underscores, hyphens. Replace others.
    // Remove specific problematic characters first: | / \ : * ? " < >
    let cleaned = text.replace(/[|\\/:*?"<>]/g, '');
    // Replace sequences of whitespace with a single underscore
    cleaned = cleaned.replace(/\s+/g, '_');
    // Remove any remaining characters not allowed (adjust regex as needed)
    // Allows: a-z, A-Z, 0-9, _, -, Arabic characters (\u0600-\u06FF)
    cleaned = cleaned.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '');
    // Remove leading/trailing underscores/hyphens
    cleaned = cleaned.replace(/^[-_]+|[-_]+$/g, '');
    // Prevent double underscores/hyphens - replace with single underscore
    cleaned = cleaned.replace(/[-_]{2,}/g, '_');
    // It's generally good practice to trim, although previous steps likely handle it
    return cleaned.trim();
}

/**
 * Generates a structured filename from a specific title format, EXCLUDING the Arabic part.
 * Example Input: "Calculus (02) - properties of numbers 1 | 1 التفاضل و التكامل - خصائص الأعداد"
 * Example Output: "Calculus_02_properties_of_numbers_1"
 * @param {string} title - The original video title.
 * @returns {string|null} - The generated filename or null if format is invalid.
 */
export function generateStructuredFilename(title) {
    if (!title) return null;
    const parts = title.split('|');
    // Allow flexibility: might not always have '|' or Arabic part
    const englishPart = parts[0].trim();
    // We still parse the Arabic part to potentially clean the English part better, but don't use it in the output.
    const arabicPart = parts.length > 1 ? parts[1].trim() : '';

    // Extract part number (e.g., '01' from '(01)')
    const partMatch = englishPart.match(/\((\d+)\)/); // Simpler regex for (Num)
    if (!partMatch) {
        console.warn(`Could not find part number like (01) in title: ${title}`);
        // Fallback: Clean the whole title as a less structured filename.
         return cleanTextForFilename(title);
    }
    const partNumber = partMatch[1].padStart(2, '0'); // Ensure two digits

    // Extract English description (adjust regex to be less strict)
    // Find text after the part number match
    let englishDesc = englishPart.substring(partMatch[0].length + partMatch.index).trim();
    // Remove leading hyphens/spaces often left after extraction
    englishDesc = englishDesc.replace(/^[-_\s]+/, ''); // Include underscore removal
    englishDesc = cleanTextForFilename(englishDesc);

    // Clean Arabic description (basic cleaning) - WE DO THIS BUT DON'T ADD IT TO FILENAME
    // Remove specific phrase if present (case-insensitive might be better if needed)
    let arabicDesc = arabicPart.replace('التفاضل و التكامل', '').trim();
    // Remove leading numbers and hyphens/spaces commonly found
    arabicDesc = arabicDesc.replace(/^\d+\s*[-\s_]*/, '').trim();
    arabicDesc = cleanTextForFilename(arabicDesc); // Clean it, just in case it's useful elsewhere later

    // Extract Base name (e.g., "Calculus" or derive from title start?)
    let baseName = "Video"; // Default base
    // Try to capture words before the first '('
    const baseNameMatch = englishPart.substring(0, partMatch.index).trim();
    if(baseNameMatch) {
        baseName = cleanTextForFilename(baseNameMatch);
    }

    // Combine components into file name, ensuring parts are added only if they exist
    let fileNameParts = [baseName, partNumber];
    if (englishDesc) {
        fileNameParts.push(englishDesc);
    }
    // *** MODIFICATION START: Removed Arabic part from filename ***
    // if (arabicDesc) {
    //     fileNameParts.push(arabicDesc); // <--- This line is removed/commented out
    // }
    // *** MODIFICATION END ***

    let fileName = fileNameParts.join('_');

    // Final cleanup to ensure no weird artifacts like multiple underscores or leading/trailing ones
    fileName = fileName.replace(/_{2,}/g, '_').replace(/^_+|_+$/g, ''); // More specific to underscore

    // *** ADDED LOGGING ***
    console.log('[Filename Util] Generated filename (Arabic Excluded):', fileName, 'from title:', title);
    return fileName;
}

/**
 * Gets the expected SRT filename for a given video title.
 * Uses generateStructuredFilename to create a base filename and appends .srt.
 * @param {string} title - The video title.
 * @returns {string|null} - The SRT filename or null if generation fails.
 */
export function getSrtFilenameFromTitle(title) {
     if (!title) return null;
     // Call the dedicated function to generate the base filename
     const baseFilename = generateStructuredFilename(title); // This now excludes Arabic
     // Check if the structured generation was successful
     if (!baseFilename) {
          console.warn(`Could not generate structured filename for title: "${title}". SRT path generation aborted.`);
          // *** ADDED LOGGING ***
          console.log('[Filename Util] Final SRT filename:', null, 'for title:', title);
          return null; // Return null if base generation failed
     }
     // Append .srt to the valid base filename
     // *** ADDED LOGGING ***
     console.log('[Filename Util] Final SRT filename:', `${baseFilename}.srt`, 'for title:', title);
     return `${baseFilename}.srt`;
}

// --- END OF FILE filename_utils.js ---