import { describe, it, expect } from 'vitest';
import { WIN_LINES, BOARD_SIZE, checkWinner, isBoardFull } from '../src/board';

describe('board constants', () => {
  it('has 9 cells', () => {
    expect(BOARD_SIZE).toBe(9);
  });

  it('has 8 win lines (3 rows, 3 cols, 2 diagonals)', () => {
    expect(WIN_LINES).toHaveLength(8);
  });

  it('every win line is a tuple of exactly 3 cell indices', () => {
    for (const line of WIN_LINES) {
      expect(line).toHaveLength(3);
      for (const idx of line) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(9);
      }
    }
  });
});

describe('checkWinner', () => {
  const empty: Array<'' | 'X' | 'O'> = ['','','','','','','','',''];

  it('returns null for empty board', () => {
    expect(checkWinner(empty)).toBeNull();
  });

  it('detects top row win for X', () => {
    expect(checkWinner(['X','X','X','','','','','',''])).toBe('X');
  });

  it('detects middle column win for O', () => {
    expect(checkWinner(['','O','','','O','','','O',''])).toBe('O');
  });

  it('detects diagonal win', () => {
    expect(checkWinner(['X','','','','X','','','','X'])).toBe('X');
  });

  it('detects anti-diagonal win', () => {
    expect(checkWinner(['','','O','','O','','O','',''])).toBe('O');
  });

  it('returns null when no winner', () => {
    expect(checkWinner(['X','O','X','X','O','O','O','X','X'])).toBeNull();
  });
});

describe('isBoardFull', () => {
  it('false on empty board', () => {
    expect(isBoardFull(['','','','','','','','',''])).toBe(false);
  });

  it('true on full board', () => {
    expect(isBoardFull(['X','O','X','X','O','O','O','X','X'])).toBe(true);
  });

  it('false on partially-full board', () => {
    expect(isBoardFull(['X','O','X','','','','','',''])).toBe(false);
  });
});
