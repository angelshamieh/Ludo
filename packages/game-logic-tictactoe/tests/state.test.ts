import { describe, it, expect } from 'vitest';
import { createInitialState, startGame } from '../src/state';
import type { Player } from '../src/types';

const players = (n: number): Player[] => {
  const colors = ['red', 'blue', 'green', 'yellow'] as const;
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

describe('createInitialState (tictactoe)', () => {
  it('builds a 2-player game in lobby with empty board', () => {
    const s = createInitialState({ code: 'ABCD', players: players(2), now: 1000 });
    expect(s.code).toBe('ABCD');
    expect(s.gameType).toBe('tictactoe');
    expect(s.status).toBe('lobby');
    expect(s.players).toHaveLength(2);
    expect(s.board).toEqual(['','','','','','','','','']);
    expect(s.difficulty).toBe('easy');
  });

  it('assigns X to first player and O to second', () => {
    const s = createInitialState({ code: 'X', players: players(2), now: 1000 });
    expect(s.marks[s.players[0]!.id]).toBe('X');
    expect(s.marks[s.players[1]!.id]).toBe('O');
  });

  it('rejects fewer than 2 players', () => {
    expect(() => createInitialState({ code: 'X', players: players(1), now: 0 })).toThrow();
  });

  it('rejects more than 2 players', () => {
    expect(() => createInitialState({ code: 'X', players: players(3), now: 0 })).toThrow();
  });
});

describe('startGame (tictactoe)', () => {
  it('flips status to playing and X starts', () => {
    const s0 = createInitialState({ code: 'X', players: players(2), now: 0 });
    const s1 = startGame(s0, { now: 5 });
    expect(s1.status).toBe('playing');
    // First player (host, X) goes first
    expect(s1.currentTurn).toBe(s0.players[0]!.id);
    expect(s1.lastActivityAt).toBe(5);
  });
});
