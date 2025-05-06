// --- START OF FILE filename_utils.js ---

/**
 * Removes special characters problematic for filenames, replaces whitespace
 * with underscores, and cleans up leading/trailing underscores.
 * Keeps alphanumeric, underscore, hyphen, and basic Arabic characters.
 *
 * @param {string} text - The input text.
 * @returns {string} The cleaned text suitable for filenames.
 */
export function cleanTextForFilename(text) {
    if (!text || typeof text !== 'string') return '';

    // 1. Remove explicitly forbidden characters: | / \ : * ? " < >
    let cleaned = text.replace(/[|/\\:*?"<>]+/g, '');

    // 2. Replace sequences of whitespace with a single underscore
    cleaned = cleaned.replace(/\s+/g, '_');

    // 3. Remove leading and trailing underscores that might result
    cleaned = cleaned.replace(/^_+|_+$/g, '');

    // 4. Optional: Collapse multiple consecutive underscores to a single one
    cleaned = cleaned.replace(/__+/g, '_');

    return cleaned;
}

/**
 * Generates a structured base filename from a title, typically a video title.
 * It attempts to parse common patterns and cleans the result.
 * Excludes content after a '|' character (often used for Arabic translation).
 *
 * @param {string} title - The original title string.
 * @returns {string|null} The generated base filename string, or null if input is invalid.
 */
export function generateStructuredFilename(title) {
    if (!title || typeof title !== 'string') {
        console.warn('[Filename Util] Invalid input title for generateStructuredFilename:', title);
        return null;
    }

    // 1. Exclude content after '|'
    const mainTitlePart = title.split('|')[0].trim();
    if (!mainTitlePart) {
         console.warn(`[Filename Util] Title part before '|' is empty for: "${title}"`);
         return null; // Or return cleaned full title if preferred fallback
    }


    // 2. Clean the main part for filename usage
    const baseFilename = cleanTextForFilename(mainTitlePart);

    console.log(`[Filename Util] Generated base filename: "${baseFilename}" from title: "${title}" (using part: "${mainTitlePart}")`);

    // 3. Return null if cleaning resulted in an empty string
    return baseFilename || null;
}

/**
 * Generates the full SRT filename for a given title using structured generation.
 *
 * @param {string} title - The original title string.
 * @returns {string|null} The full SRT filename (e.g., "Course_Name_Part1.srt"), or null if generation failed.
 */
export function getSrtFilenameFromTitle(title) {
    const baseFilename = generateStructuredFilename(title);
    if (!baseFilename) {
        console.log('[Filename Util] Final SRT filename:', null, 'for title:', title);
        return null; // Base generation failed
    }
    const srtFilename = `${baseFilename}.srt`;
    console.log('[Filename Util] Final SRT filename:', srtFilename, 'for title:', title);
    return srtFilename;
}


// --- END OF FILE filename_utils.js ---