import { describe, it, expect } from 'vitest';
import { createInitialState, startGame, applyRoll, chooseBotMove, type Player, type GameState } from '../src/index';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: true,  isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: false, isHost: false, connected: true },
];

const fresh = () => startGame(createInitialState({ code: 'X', players, now: 0 }), { now: 1 });

const setToken = (s: GameState, pid: string, idx: number, pos: GameState['tokens'][string][number]['position']): GameState => ({
  ...s,
  tokens: { ...s.tokens, [pid]: s.tokens[pid]!.map((t, i) => i === idx ? { ...t, position: pos } : t) },
});

describe('chooseBotMove', () => {
  it('passes when no legal move exists', () => {
    const s = applyRoll(fresh(), 3, { now: 5 });
    expect(chooseBotMove(s)).toEqual({ kind: 'pass' });
  });

  it('prefers a capture over advancing', () => {
    let s = fresh();
    s = setToken(s, 'a', 0, { kind: 'path', index: 12 }); // red at abs 12
    s = setToken(s, 'a', 1, { kind: 'path', index: 30 }); // red further along (no capture there)
    s = setToken(s, 'b', 0, { kind: 'path', index: 5 });  // green at abs 18
    s = applyRoll(s, 6, { now: 5 });
    // Roll 6: red-0 +6 → pathIndex 18 → abs 18 (captures green-0).
    //         red-1 +6 → pathIndex 36 (no capture).
    //         red-2/-3 leave home (pathIndex 0).
    // Capture should win.
    const m = chooseBotMove(s);
    expect(m).toEqual({ kind: 'move', tokenId: 'red-0' });
  });

  it('with no capture available, leaves home if rolled a 6', () => {
    const s = applyRoll(fresh(), 6, { now: 5 });
    const m = chooseBotMove(s);
    expect(m.kind).toBe('move');
    if (m.kind === 'move') expect(m.tokenId).toMatch(/^red-/);
  });

  it('advances furthest token when no capture and no leave-home option', () => {
    let s = fresh();
    s = setToken(s, 'a', 0, { kind: 'path', index: 5 });
    s = setToken(s, 'a', 1, { kind: 'path', index: 20 }); // furthest
    s = applyRoll(s, 3, { now: 5 });
    expect(chooseBotMove(s)).toEqual({ kind: 'move', tokenId: 'red-1' });
  });

  it('prefers a capture over leaving home, even when both are available on a 6', () => {
    let s = fresh();
    // Set up: red has token at pathIndex 12 (abs 12), green has token at pathIndex 5 (abs 18).
    // Roll 6: red-0 +6 → pathIndex 18 (abs 18) → captures green-0.
    //         red-1 stays at home, but rolling 6 makes leaving home (pathIndex 0) legal.
    // Capture must win.
    s = setToken(s, 'a', 0, { kind: 'path', index: 12 });
    s = setToken(s, 'b', 0, { kind: 'path', index: 5 });
    s = applyRoll(s, 6, { now: 5 });
    expect(chooseBotMove(s)).toEqual({ kind: 'move', tokenId: 'red-0' });
  });
});
