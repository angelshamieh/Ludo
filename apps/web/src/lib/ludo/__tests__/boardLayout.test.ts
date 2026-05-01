import { describe, it, expect } from 'vitest';
import { tokenCell, BOARD_TRACK, CENTER } from '../boardLayout';

describe('boardLayout', () => {
  it('has 52 track cells, all unique', () => {
    expect(BOARD_TRACK).toHaveLength(52);
    const keys = new Set(BOARD_TRACK.map((c) => `${c.col},${c.row}`));
    expect(keys.size).toBe(52);
  });

  it('renders home tokens at their colored corner slots', () => {
    expect(tokenCell({ id: 'red-0', owner: 'a', color: 'red', position: { kind: 'home' } } as any))
      .toEqual({ col: 1, row: 1 });
  });

  it('renders a finished token in the center', () => {
    expect(tokenCell({ id: 'red-0', owner: 'a', color: 'red', position: { kind: 'path', index: 56 } } as any))
      .toEqual(CENTER);
  });
});
