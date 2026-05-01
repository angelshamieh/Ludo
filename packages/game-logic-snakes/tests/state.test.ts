import { describe, it, expect } from 'vitest';
import { createInitialState, startGame } from '../src/state';
import type { Player } from '../src/types';

const players = (n: number): Player[] => {
  const colors = ['red', 'green', 'yellow', 'blue'] as const;
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    avatar: '🐱',
    color: colors[i]!,
    isBot: false,
    isHost: i === 0,
    connected: true,
  }));
};

describe('createInitialState (snakes)', () => {
  it('builds a 4-player game in lobby status', () => {
    const s = createInitialState({ code: 'ABCD', players: players(4), now: 1000 });
    expect(s.code).toBe('ABCD');
    expect(s.gameType).toBe('snakes');
    expect(s.status).toBe('lobby');
    expect(s.players).toHaveLength(4);
  });

  it('every player starts at square 0 (off the board)', () => {
    const s = createInitialState({ code: 'X', players: players(2), now: 1000 });
    for (const p of s.players) {
      expect(s.tokens[p.id]).toBe(0);
    }
  });

  it('rejects fewer than 2 players', () => {
    expect(() => createInitialState({ code: 'X', players: players(1), now: 0 })).toThrow();
  });

  it('rejects more than 4 players', () => {
    const five = [...players(4), {
      id: 'p4', name: 'P4', avatar: '🐱', color: 'red' as const,
      isBot: false, isHost: false, connected: true,
    }];
    expect(() => createInitialState({ code: 'X', players: five, now: 0 })).toThrow();
  });
});

describe('startGame (snakes)', () => {
  it('flips status to playing and picks first player', () => {
    const s0 = createInitialState({ code: 'X', players: players(3), now: 0 });
    const s1 = startGame(s0, { now: 5 });
    expect(s1.status).toBe('playing');
    expect(s1.currentTurn).toBe(s1.turnOrder[0]);
    expect(s1.lastActivityAt).toBe(5);
  });
});
