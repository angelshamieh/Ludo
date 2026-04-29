import { describe, it, expect } from 'vitest';
import { COLORS, type Color } from '../src/types';

describe('COLORS', () => {
  it('has exactly 4 entries', () => {
    expect(COLORS).toHaveLength(4);
  });

  it('contains the four canonical Ludo colors', () => {
    expect(new Set(COLORS)).toEqual(new Set(['red', 'green', 'blue', 'yellow']));
  });

  it('has no duplicates', () => {
    expect(new Set(COLORS).size).toBe(COLORS.length);
  });

  it('only contains values assignable to Color', () => {
    // Type-level check: this only compiles if every COLORS entry is a Color.
    const _check: readonly Color[] = COLORS;
    expect(_check).toBe(COLORS);
  });
});
