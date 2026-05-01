import { describe, it, expect } from 'vitest';
import { trackAbsolute, START_OFFSET, TRACK_LENGTH, FINAL_RUN_LENGTH, PATH_LENGTH } from '../src/board';

describe('board', () => {
  it('has 52 outer-track squares', () => {
    expect(TRACK_LENGTH).toBe(52);
  });

  it('has 5 home-column squares before center', () => {
    expect(FINAL_RUN_LENGTH).toBe(5);
  });

  it('total path = 51 outer + 5 home + 1 finish = 57 (indices 0..56)', () => {
    expect(PATH_LENGTH).toBe(57);
  });

  it('color start offsets are 13 apart', () => {
    expect(START_OFFSET.red).toBe(0);
    expect(START_OFFSET.green).toBe(13);
    expect(START_OFFSET.yellow).toBe(26);
    expect(START_OFFSET.blue).toBe(39);
  });

  it('trackAbsolute wraps modulo 52', () => {
    expect(trackAbsolute('red', 0)).toBe(0);
    expect(trackAbsolute('red', 50)).toBe(50);
    expect(trackAbsolute('green', 0)).toBe(13);
    expect(trackAbsolute('green', 40)).toBe(53 % 52); // 1
    expect(trackAbsolute('blue', 13)).toBe(0);        // 39 + 13 = 52 % 52 = 0
  });

  it('trackAbsolute throws when pathIndex is past the outer track', () => {
    expect(() => trackAbsolute('red', 51)).toThrow(/outer track/);
  });

  it('trackAbsolute throws when pathIndex is negative', () => {
    expect(() => trackAbsolute('red', -1)).toThrow(/outer track/);
  });
});
