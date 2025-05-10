// __tests__/test_logic.test.js
import { calculateDifficulty } from '../test_logic.js'; // Adjust path as needed

describe('calculateDifficulty', () => {
  test('should return 100 for undefined chapter data', () => {
    expect(calculateDifficulty(undefined)).toBe(100);
  });

  test('should return 100 if no attempts', () => {
    const chap = { total_attempted: 0, total_wrong: 0 };
    expect(calculateDifficulty(chap)).toBe(100);
  });

  test('should calculate base difficulty from error rate', () => {
    const chap = { total_attempted: 10, total_wrong: 5, mistake_history: [] }; // 50% error rate
    expect(calculateDifficulty(chap)).toBe(50); // 50 (base) + 0 (consecutive)
  });

  test('should ensure base difficulty is at least 10', () => {
    const chap = { total_attempted: 10, total_wrong: 0, mistake_history: [] }; // 0% error rate
    expect(calculateDifficulty(chap)).toBe(10); // 10 (base) + 0
  });

  test('should add penalty for consecutive mistakes', () => {
    const chap = { total_attempted: 10, total_wrong: 3, mistake_history: [1, 1] }; // 30% error, 2 consecutive
    // Base: 30, Penalty: 2 * 20 = 40. Total = 70
    expect(calculateDifficulty(chap)).toBe(70);
  });

  test('should cap difficulty at 150', () => {
    const chap = { total_attempted: 10, total_wrong: 10, mistake_history: [1, 1, 1, 1, 1, 1] }; // 100% error, 6 consecutive
    // Base: 100, Penalty: 6 * 20 = 120. Total = 220, capped at 150.
    expect(calculateDifficulty(chap)).toBe(150);
  });

  test('should handle missing mistake_history', () => {
    const chap = { total_attempted: 5, total_wrong: 1 };
    expect(calculateDifficulty(chap)).toBe(20); // 20% error rate -> base 20
  });

  test('should correctly count consecutive mistakes from history', () => {
    const chap = { total_attempted: 20, total_wrong: 5, mistake_history: [0, 1, 1, 1, 0, 1] }; // 1 consecutive
    // Base: 25, Penalty: 1 * 20 = 20. Total = 45
    expect(calculateDifficulty(chap)).toBe(45);
  });
});