import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/state';
import type { Player } from '../src/types';

const players = (n: number): Player[] => {
  const colors = ['red', 'green', 'blue', 'yellow'] as const;
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    avatar: '🐱',
    color: colors[i]!,
    isBot: false,
    isHost: i === 0,
    connected: true,
  }));
};

describe('createInitialState', () => {
  it('builds a 4-player game in lobby status', () => {
    const s = createInitialState({ code: 'ABCD', players: players(4), now: 1000 });
    expect(s.code).toBe('ABCD');
    expect(s.status).toBe('lobby');
    expect(s.players).toHaveLength(4);
    expect(s.currentTurn).toBe(null);
    expect(s.winner).toBe(null);
  });

  it('gives every player 4 tokens, all at home', () => {
    const s = createInitialState({ code: 'ABCD', players: players(2), now: 1000 });
    for (const p of s.players) {
      expect(s.tokens[p.id]).toHaveLength(4);
      for (const t of s.tokens[p.id]!) {
        expect(t.position).toEqual({ kind: 'home' });
        expect(t.color).toBe(p.color);
        expect(t.owner).toBe(p.id);
      }
    }
  });

  it('uses unique token IDs of the form `${color}-${0..3}`', () => {
    const s = createInitialState({ code: 'ABCD', players: players(2), now: 1000 });
    const ids = Object.values(s.tokens).flat().map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('red-0');
    expect(ids).toContain('red-3');
  });

  it('rejects 0 or 1 players', () => {
    expect(() => createInitialState({ code: 'X', players: players(1), now: 0 })).toThrow();
    expect(() => createInitialState({ code: 'X', players: [], now: 0 })).toThrow();
  });

  it('rejects 5 or more players', () => {
    const five: Player[] = [
      ...players(4),
      { id: 'p4', name: 'Player 4', avatar: '🐱', color: 'red', isBot: false, isHost: false, connected: true },
    ];
    expect(() => createInitialState({ code: 'X', players: five, now: 0 })).toThrow();
  });

  it('does not retain a reference to the caller players array', () => {
    const arr = players(2);
    const s = createInitialState({ code: 'X', players: arr, now: 0 });
    arr.push({ id: 'pX', name: 'X', avatar: '🐱', color: 'yellow', isBot: false, isHost: false, connected: true });
    expect(s.players).toHaveLength(2);
  });

  it('rejects duplicate colors', () => {
    const dup = players(2);
    dup[1]!.color = 'red';
    expect(() => createInitialState({ code: 'X', players: dup, now: 0 })).toThrow(/color/i);
  });
});
