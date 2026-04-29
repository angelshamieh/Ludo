import { describe, it, expect } from 'vitest';
import { COLORS } from '../src/types';

describe('types', () => {
  it('exposes the four canonical Ludo colors', () => {
    expect(COLORS).toEqual(['red', 'green', 'blue', 'yellow']);
  });
});
