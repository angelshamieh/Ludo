import { describe, it, expect } from 'vitest';
import { cellToCoords, CELL_SIZE, BOARD_PIXELS } from '../boardLayout';

describe('cellToCoords', () => {
  it('cell 0 = top-left', () => {
    expect(cellToCoords(0)).toEqual({ col: 0, row: 0 });
  });

  it('cell 4 = center', () => {
    expect(cellToCoords(4)).toEqual({ col: 1, row: 1 });
  });

  it('cell 8 = bottom-right', () => {
    expect(cellToCoords(8)).toEqual({ col: 2, row: 2 });
  });
});

describe('layout constants', () => {
  it('CELL_SIZE = 80', () => {
    expect(CELL_SIZE).toBe(80);
  });

  it('BOARD_PIXELS = 240 (3 cells × 80)', () => {
    expect(BOARD_PIXELS).toBe(240);
  });
});
