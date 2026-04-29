import { describe, it, expect } from 'vitest';
import { createInitialState, startGame, legalMoves } from '../src/index';
import type { Player } from '../src/index';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: false, isHost: false, connected: true },
];

const fresh = () => {
  const s0 = createInitialState({ code: 'X', players, now: 0 });
  return startGame(s0, { now: 1 });
};

describe('legalMoves: leaving home', () => {
  it('rolling a 6 lets exactly the home tokens leave', () => {
    const s = { ...fresh(), dice: 6, rolledThisTurn: true };
    const moves = legalMoves(s, 'a');
    // 4 home tokens for 'a'
    expect(moves).toHaveLength(4);
    for (const m of moves) {
      expect(m.kind).toBe('move');
    }
  });

  it('rolling 1..5 with all tokens at home yields a forced pass', () => {
    for (const dice of [1, 2, 3, 4, 5]) {
      const s = { ...fresh(), dice, rolledThisTurn: true };
      const moves = legalMoves(s, 'a');
      expect(moves).toEqual([{ kind: 'pass' }]);
    }
  });

  it('asking for legalMoves of someone else returns empty', () => {
    const s = { ...fresh(), dice: 6, rolledThisTurn: true };
    expect(legalMoves(s, 'b')).toEqual([]);
  });

  it('asking for legalMoves before rolling returns empty', () => {
    const s = { ...fresh(), dice: null, rolledThisTurn: false };
    expect(legalMoves(s, 'a')).toEqual([]);
  });
});
