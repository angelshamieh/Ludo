import { describe, it, expect } from 'vitest';
import { squareToCell } from '../boardLayout';

describe('squareToCell (snakes & ladders)', () => {
  it('square 1 is bottom-left (col 0, row 9)', () => {
    expect(squareToCell(1)).toEqual({ col: 0, row: 9 });
  });

  it('square 10 is bottom-right (col 9, row 9)', () => {
    expect(squareToCell(10)).toEqual({ col: 9, row: 9 });
  });

  it('square 11 is one above square 10 (col 9, row 8) — boustrophedon', () => {
    expect(squareToCell(11)).toEqual({ col: 9, row: 8 });
  });

  it('square 20 is leftmost on row 8 (col 0, row 8)', () => {
    expect(squareToCell(20)).toEqual({ col: 0, row: 8 });
  });

  it('square 21 is one above square 20 (col 0, row 7)', () => {
    expect(squareToCell(21)).toEqual({ col: 0, row: 7 });
  });

  it('square 100 is top-left (col 0, row 0)', () => {
    expect(squareToCell(100)).toEqual({ col: 0, row: 0 });
  });
});
