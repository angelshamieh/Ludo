import { describe, it, expect } from 'vitest';
import { createInitialState, startGame, applyRoll, applyMove, isWin, legalMoves, chooseBotMove, type GameState, type Player } from '../src/index';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: false, isHost: false, connected: true },
];
const fresh = () => startGame(createInitialState({ code: 'X', players, now: 0 }), { now: 1 });
const setToken = (s: GameState, pid: string, sq: number): GameState => ({
  ...s, tokens: { ...s.tokens, [pid]: sq },
});

describe('applyRoll (snakes)', () => {
  it('records dice and marks rolled', () => {
    const s = applyRoll(fresh(), 4, { now: 5 });
    expect(s.dice).toBe(4);
    expect(s.rolledThisTurn).toBe(true);
  });

  it('rejects double-roll', () => {
    const s = applyRoll(fresh(), 4, { now: 5 });
    expect(() => applyRoll(s, 6, { now: 6 })).toThrow();
  });
});

describe('applyMove (snakes)', () => {
  it('advances by dice and consumes the roll', () => {
    let s = applyRoll(fresh(), 3, { now: 1 });
    s = applyMove(s, { kind: 'auto' }, { now: 2 });
    expect(s.tokens['a']).toBe(3);
    expect(s.dice).toBe(null);
    expect(s.rolledThisTurn).toBe(false);
  });

  it('non-six advances turn to next player', () => {
    let s = applyRoll(fresh(), 4, { now: 1 });
    s = applyMove(s, { kind: 'auto' }, { now: 2 });
    expect(s.currentTurn).toBe('b');
  });

  it('rolling 6 grants an extra turn (same player)', () => {
    let s = applyRoll(fresh(), 6, { now: 1 });
    s = applyMove(s, { kind: 'auto' }, { now: 2 });
    expect(s.currentTurn).toBe('a');
  });

  it('overshooting 100 leaves the token in place', () => {
    let s = setToken(fresh(), 'a', 99);
    s = applyRoll(s, 5, { now: 1 });
    s = applyMove(s, { kind: 'auto' }, { now: 2 });
    expect(s.tokens['a']).toBe(99);
  });

  it('lands on a ladder bottom and climbs', () => {
    // Ladder 1 → 38: from square 0, roll 1 lands on 1, climbs to 38
    let s = applyRoll(fresh(), 1, { now: 1 });
    s = applyMove(s, { kind: 'auto' }, { now: 2 });
    expect(s.tokens['a']).toBe(38);
    expect(s.log.some((e) => e.kind === 'ladder' && e.from === 1 && e.to === 38)).toBe(true);
  });

  it('lands on a snake head and slides', () => {
    // Snake 16 → 6: from square 13, roll 3 lands on 16, slides to 6
    let s = setToken(fresh(), 'a', 13);
    s = applyRoll(s, 3, { now: 1 });
    s = applyMove(s, { kind: 'auto' }, { now: 2 });
    expect(s.tokens['a']).toBe(6);
    expect(s.log.some((e) => e.kind === 'snake' && e.from === 16 && e.to === 6)).toBe(true);
  });

  it('exact landing on 100 wins the game', () => {
    let s = setToken(fresh(), 'a', 95);
    s = applyRoll(s, 5, { now: 1 });
    s = applyMove(s, { kind: 'auto' }, { now: 2 });
    expect(s.tokens['a']).toBe(100);
    expect(s.status).toBe('finished');
    expect(s.winner).toBe('a');
    expect(s.currentTurn).toBeNull();
  });

  it('isWin returns true when a player is on 100', () => {
    let s = setToken(fresh(), 'a', 100);
    expect(isWin(s, 'a')).toBe(true);
    expect(isWin(s, 'b')).toBe(false);
  });
});

describe('legalMoves + chooseBotMove (snakes)', () => {
  it('legalMoves is empty before rolling', () => {
    const s = fresh();
    expect(legalMoves(s, 'a')).toEqual([]);
  });

  it('legalMoves returns auto after roll', () => {
    const s = applyRoll(fresh(), 3, { now: 1 });
    expect(legalMoves(s, 'a')).toEqual([{ kind: 'auto' }]);
  });

  it('legalMoves is empty for the non-current player', () => {
    const s = applyRoll(fresh(), 3, { now: 1 });
    expect(legalMoves(s, 'b')).toEqual([]);
  });

  it('chooseBotMove always returns auto', () => {
    const s = applyRoll(fresh(), 4, { now: 1 });
    expect(chooseBotMove(s)).toEqual({ kind: 'auto' });
  });
});
