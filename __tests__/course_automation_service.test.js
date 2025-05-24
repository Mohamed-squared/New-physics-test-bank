const { sanitizeCourseTitleForDirName } = require('../course_automation_service.js');

describe('sanitizeCourseTitleForDirName', () => {
    test('should return "untitled_course" for null or empty input', () => {
        expect(sanitizeCourseTitleForDirName(null)).toBe('untitled_course');
        expect(sanitizeCourseTitleForDirName('')).toBe('untitled_course');
        expect(sanitizeCourseTitleForDirName(undefined)).toBe('untitled_course');
    });

    test('should convert spaces to underscores and lowercase', () => {
        expect(sanitizeCourseTitleForDirName('Simple Course Title')).toBe('simple_course_title');
    });

    test('should remove special characters except hyphens and underscores', () => {
        expect(sanitizeCourseTitleForDirName('Course Title with !@#$%^&*()_+=-`~[]{};:'",.<>?/|\')).toBe('course_title_with_-_');
    });

    test('should handle multiple spaces correctly', () => {
        expect(sanitizeCourseTitleForDirName('Title  With   Multiple Spaces')).toBe('title_with_multiple_spaces');
    });

    test('should truncate long titles to 75 characters', () => {
        const longTitle = 'This is a very long course title that definitely exceeds the seventy-five character limit imposed by the sanitization function';
        const expected = 'this_is_a_very_long_course_title_that_definitely_exceeds_the_seventy-five_c'; // 75 chars
        expect(sanitizeCourseTitleForDirName(longTitle)).toBe(expected);
    });

    test('should preserve hyphens and underscores', () => {
        expect(sanitizeCourseTitleForDirName('Course_With-Hyphens_And_Underscores')).toBe('course_with-hyphens_and_underscores');
    });

    test('should handle leading/trailing spaces before sanitization', () => {
        expect(sanitizeCourseTitleForDirName('  Spaced Title  ')).toBe('spaced_title');
    });

    test('should handle mixed case correctly', () => {
        expect(sanitizeCourseTitleForDirName('MiXeD CaSe TiTlE')).toBe('mixed_case_title');
    });

    test('should handle titles that are already sanitized', () => {
        expect(sanitizeCourseTitleForDirName('already_sanitized-title')).toBe('already_sanitized-title');
    });

    test('should handle numbers in titles', () => {
        expect(sanitizeCourseTitleForDirName('Course 101: Advanced Topics')).toBe('course_101_advanced_topics');
    });
});
