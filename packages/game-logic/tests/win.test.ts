import { describe, it, expect } from 'vitest';
import { createInitialState, startGame, applyRoll, applyMove, isWin, FINISH_INDEX, type GameState, type Player } from '../src/index';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: false, isHost: false, connected: true },
];
const fresh = () => startGame(createInitialState({ code: 'X', players, now: 0 }), { now: 1 });

const setAllTokens = (s: GameState, pid: string, idx: GameState['tokens'][string][number]['position'][]): GameState => ({
  ...s,
  tokens: {
    ...s.tokens,
    [pid]: s.tokens[pid]!.map((t, i) => ({ ...t, position: idx[i]! })),
  },
});

describe('applyRoll', () => {
  it('records dice and marks rolled', () => {
    const s = applyRoll(fresh(), 4, { now: 5 });
    expect(s.dice).toBe(4);
    expect(s.rolledThisTurn).toBe(true);
    expect(s.log.some((e) => e.kind === 'rolled')).toBe(true);
    expect(s.lastActivityAt).toBe(5);
  });

  it('refuses double-roll within a turn', () => {
    const s = applyRoll(fresh(), 4, { now: 5 });
    expect(() => applyRoll(s, 6, { now: 6 })).toThrow();
  });

  it('rejects out-of-range values', () => {
    expect(() => applyRoll(fresh(), 0, { now: 5 })).toThrow();
    expect(() => applyRoll(fresh(), 7, { now: 5 })).toThrow();
  });

  it('refuses to roll outside playing status', () => {
    const lobby = createInitialState({ code: 'X', players, now: 0 });
    expect(() => applyRoll(lobby, 4, { now: 5 })).toThrow();
  });
});

describe('isWin / finishing', () => {
  it('isWin is false when at least one token is not at finish', () => {
    const s = fresh();
    expect(isWin(s, 'a')).toBe(false);
  });

  it('moving the last token to FINISH_INDEX wins the game', () => {
    let s = fresh();
    s = setAllTokens(s, 'a', [
      { kind: 'path', index: FINISH_INDEX },
      { kind: 'path', index: FINISH_INDEX },
      { kind: 'path', index: FINISH_INDEX },
      { kind: 'path', index: FINISH_INDEX - 3 }, // last one, 3 from finish
    ]);
    s = applyRoll(s, 3, { now: 5 });
    s = applyMove(s, { kind: 'move', tokenId: 'red-3' }, { now: 6 });
    expect(s.status).toBe('finished');
    expect(s.winner).toBe('a');
    expect(s.currentTurn).toBeNull();
    expect(isWin(s, 'a')).toBe(true);
    expect(s.log.some((e) => e.kind === 'won' && e.playerId === 'a')).toBe(true);
  });
});
