import { describe, it, expect } from 'vitest';
import { LADDERS, SNAKES, BOARD_SIZE, FINISH, resolveLanding } from '../src/board';

describe('board constants', () => {
  it('has 100 squares', () => {
    expect(BOARD_SIZE).toBe(100);
    expect(FINISH).toBe(100);
  });

  it('Milton Bradley 1943 ladders layout (9 ladders)', () => {
    expect(Object.keys(LADDERS)).toHaveLength(9);
    expect(LADDERS[1]).toBe(38);
    expect(LADDERS[80]).toBe(100);
  });

  it('Milton Bradley 1943 snakes layout (10 snakes)', () => {
    expect(Object.keys(SNAKES)).toHaveLength(10);
    expect(SNAKES[16]).toBe(6);
    expect(SNAKES[98]).toBe(78);
  });

  it('every ladder goes UP (top > bottom)', () => {
    for (const [bottom, top] of Object.entries(LADDERS)) {
      expect(top).toBeGreaterThan(Number(bottom));
    }
  });

  it('every snake goes DOWN (tail < head)', () => {
    for (const [head, tail] of Object.entries(SNAKES)) {
      expect(tail).toBeLessThan(Number(head));
    }
  });
});

describe('resolveLanding', () => {
  it('returns the same square if no snake or ladder', () => {
    expect(resolveLanding(50)).toBe(50);
  });

  it('climbs a ladder', () => {
    expect(resolveLanding(1)).toBe(38);
    expect(resolveLanding(80)).toBe(100);
  });

  it('slides down a snake', () => {
    expect(resolveLanding(16)).toBe(6);
    expect(resolveLanding(98)).toBe(78);
  });
});
