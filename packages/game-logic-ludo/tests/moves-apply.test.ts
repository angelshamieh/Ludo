import { describe, it, expect } from 'vitest';
import {
  createInitialState, startGame, applyMove, legalMoves,
  type GameState, type Player,
} from '../src/index';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: false, isHost: false, connected: true },
];
const fresh = () => startGame(createInitialState({ code: 'X', players, now: 0 }), { now: 1 });

const setToken = (s: GameState, pid: string, tokenIdx: number, pos: any): GameState => {
  const tokens = { ...s.tokens };
  tokens[pid] = tokens[pid]!.map((t, i) => i === tokenIdx ? { ...t, position: pos } : t);
  return { ...s, tokens };
};

describe('applyMove', () => {
  it('rolling 6 + move leaves home onto path index 0', () => {
    let s: GameState = { ...fresh(), dice: 6, rolledThisTurn: true };
    s = applyMove(s, { kind: 'move', tokenId: 'red-0' }, { now: 5 });
    expect(s.tokens['a']![0]!.position).toEqual({ kind: 'path', index: 0 });
    expect(s.dice).toBe(null);              // dice consumed
    expect(s.rolledThisTurn).toBe(false);
    // Rolling a 6 = same player rolls again
    expect(s.currentTurn).toBe('a');
  });

  it('after non-six move, turn passes to next player', () => {
    let s = fresh();
    s = setToken(s, 'a', 0, { kind: 'path', index: 0 });
    s = { ...s, dice: 3, rolledThisTurn: true };
    s = applyMove(s, { kind: 'move', tokenId: 'red-0' }, { now: 5 });
    expect(s.tokens['a']![0]!.position).toEqual({ kind: 'path', index: 3 });
    expect(s.currentTurn).toBe('b');
  });

  it('capturing sends the victim home and grants extra turn', () => {
    let s = fresh();
    // Place red at red-pathIndex 12, green at green-pathIndex 5.
    // Red rolls 6 → red-pathIndex 18 → abs (0+18)%52 = 18.
    // Green at green-pathIndex 5 → abs (13+5)%52 = 18 → SAME square.
    // Square 18 is NOT in SAFE_ABSOLUTE_SQUARES (those are 0,13,26,39).
    s = setToken(s, 'a', 0, { kind: 'path', index: 12 });
    s = setToken(s, 'b', 0, { kind: 'path', index: 5 });
    s = { ...s, dice: 6, rolledThisTurn: true };
    s = applyMove(s, { kind: 'move', tokenId: 'red-0' }, { now: 7 });
    expect(s.tokens['a']![0]!.position).toEqual({ kind: 'path', index: 18 });
    expect(s.tokens['b']![0]!.position).toEqual({ kind: 'home' });
    expect(s.log.some((e) => e.kind === 'captured')).toBe(true);
    // Capture grants extra turn (and 6 also grants extra; both true here)
    expect(s.currentTurn).toBe('a');
  });

  it('cannot capture on a safe square', () => {
    let s = fresh();
    // Red at red-pathIndex 12 (abs 12), rolls 1 → red-pathIndex 13 (abs 13 = green's start = SAFE).
    s = setToken(s, 'a', 0, { kind: 'path', index: 12 });
    // Green at green-pathIndex 0 → abs 13 (its own start, also a safe square).
    s = setToken(s, 'b', 0, { kind: 'path', index: 0 });
    s = { ...s, dice: 1, rolledThisTurn: true };
    s = applyMove(s, { kind: 'move', tokenId: 'red-0' }, { now: 9 });
    // Both tokens now at abs 13 (red-13, green-0). NO capture.
    expect(s.tokens['a']![0]!.position).toEqual({ kind: 'path', index: 13 });
    expect(s.tokens['b']![0]!.position).toEqual({ kind: 'path', index: 0 });
    expect(s.log.some((e) => e.kind === 'captured')).toBe(false);
  });

  it('exact-roll into the center finishes a token', () => {
    let s = fresh();
    s = setToken(s, 'a', 0, { kind: 'path', index: 53 });   // home column #2 (3 from finish)
    s = { ...s, dice: 3, rolledThisTurn: true };
    s = applyMove(s, { kind: 'move', tokenId: 'red-0' }, { now: 11 });
    expect(s.tokens['a']![0]!.position).toEqual({ kind: 'path', index: 56 });
  });

  it('overshoot is not a legal move', () => {
    let s = fresh();
    s = setToken(s, 'a', 0, { kind: 'path', index: 54 });
    s = { ...s, dice: 4, rolledThisTurn: true };
    const moves = legalMoves(s, 'a');
    expect(moves).toEqual([{ kind: 'pass' }]);
  });

  it('passing advances to next player and consumes dice', () => {
    let s = fresh();
    s = { ...s, dice: 5, rolledThisTurn: true };
    s = applyMove(s, { kind: 'pass' }, { now: 13 });
    expect(s.dice).toBe(null);
    expect(s.currentTurn).toBe('b');
  });

  it('does not mutate the input state', () => {
    const before = fresh();
    const beforeSnapshot = JSON.parse(JSON.stringify(before));
    const s = applyMove(
      { ...before, dice: 6, rolledThisTurn: true },
      { kind: 'move', tokenId: 'red-0' },
      { now: 99 },
    );
    // Original `before` must be untouched
    expect(JSON.parse(JSON.stringify(before))).toEqual(beforeSnapshot);
    // Sanity: the returned state did change
    expect(s).not.toBe(before);
  });

  it('appends to the log without rewriting earlier entries', () => {
    let s = fresh();
    const initialLogLength = s.log.length;
    s = applyMove({ ...s, dice: 5, rolledThisTurn: true }, { kind: 'pass' }, { now: 5 });
    expect(s.log.length).toBeGreaterThan(initialLogLength);
    // First entry should be unchanged (it was the 'turn' event from startGame)
    expect(s.log[0]!.kind).toBe('turn');
  });

  it('updates lastActivityAt to opts.now', () => {
    let s = fresh();
    s = applyMove({ ...s, dice: 4, rolledThisTurn: true }, { kind: 'pass' }, { now: 12345 });
    expect(s.lastActivityAt).toBe(12345);
  });

  it('increments consecutiveSixes on a 6 and resets on a non-6', () => {
    let s = fresh();
    s = setToken(s, 'a', 0, { kind: 'path', index: 0 });
    // First move: dice=6 → extra turn for 'a', consecutiveSixes should be 1
    s = applyMove({ ...s, dice: 6, rolledThisTurn: true }, { kind: 'move', tokenId: 'red-0' }, { now: 5 });
    expect(s.consecutiveSixes).toBe(1);
    expect(s.currentTurn).toBe('a');
    // Second move: dice=6 again → counter goes to 2
    s = applyMove({ ...s, dice: 6, rolledThisTurn: true }, { kind: 'move', tokenId: 'red-0' }, { now: 6 });
    expect(s.consecutiveSixes).toBe(2);
    // Third move: dice=3, non-6 → counter resets to 0, turn passes to 'b'
    s = applyMove({ ...s, dice: 3, rolledThisTurn: true }, { kind: 'move', tokenId: 'red-0' }, { now: 7 });
    expect(s.consecutiveSixes).toBe(0);
    expect(s.currentTurn).toBe('b');
  });
});
