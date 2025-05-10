// __tests__/utils.test.js
import { escapeHtml, getFormattedDate } from '../utils.js'; // Add getFormattedDate

describe('Utility Functions', () => {
  describe('escapeHtml', () => {
    test('should escape special HTML characters', () => {
      expect(escapeHtml('<div id="test">& "hello" \'world\'</div>'))
        .toBe('<div id="test">& "hello" \'world\'</div>');
    });
    test('should return empty string for null or undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
    test('should handle numbers and booleans by converting to string', () => {
      expect(escapeHtml(123)).toBe('123');
      expect(escapeHtml(true)).toBe('true');
    });
  });

  describe('getFormattedDate', () => {
    test('should format a date object correctly', () => {
      const date = new Date(2023, 0, 5); // Month is 0-indexed (0 = January)
      expect(getFormattedDate(date)).toBe('2023-01-05');
    });
    test('should pad month and day with leading zeros', () => {
      const date = new Date(2023, 8, 1); // September 1st
      expect(getFormattedDate(date)).toBe('2023-09-01');
    });
    test('should handle current date if no argument provided', () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      expect(getFormattedDate()).toBe(`${year}-${month}-${day}`);
    });
    test('should return "N/A" for invalid date object', () => {
        expect(getFormattedDate(new Date('invalid-date-string'))).toBe('N/A');
    });
    test('should return "N/A" for non-date input', () => {
        expect(getFormattedDate(null)).toBe('N/A');
        expect(getFormattedDate(undefined)).toBe('N/A');
        expect(getFormattedDate("2023-01-01")).toBe('N/A'); // String is not a Date object
    });
  });
});