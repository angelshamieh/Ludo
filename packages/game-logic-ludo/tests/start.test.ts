import { describe, it, expect } from 'vitest';
import { createInitialState, startGame } from '../src/index';
import type { Player } from '../src/index';

const mkPlayers = (): Player[] => ([
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: false, isHost: false, connected: true },
  { id: 'c', name: 'C', avatar: '🐼', color: 'blue',  isBot: true,  isHost: false, connected: true },
]);

describe('startGame', () => {
  it('flips status to playing, sets turn order red,green,yellow,blue order, picks first player', () => {
    const s0 = createInitialState({ code: 'X', players: mkPlayers(), now: 0 });
    const s1 = startGame(s0, { now: 5 });
    expect(s1.status).toBe('playing');
    // Canonical color order, filtered to actual players: red, green, blue
    expect(s1.turnOrder).toEqual(['a', 'b', 'c']);
    expect(s1.currentTurn).toBe('a');
    expect(s1.lastActivityAt).toBe(5);
    expect(s1.log).toContainEqual({ kind: 'turn', playerId: 'a' });
  });

  it('refuses to start unless status is lobby', () => {
    const s0 = createInitialState({ code: 'X', players: mkPlayers(), now: 0 });
    const s1 = startGame(s0, { now: 5 });
    expect(() => startGame(s1, { now: 6 })).toThrow();
  });

  it('refuses to start defensively if players array is empty', () => {
    const s0 = { ...createInitialState({ code: 'X', players: mkPlayers(), now: 0 }), players: [] };
    expect(() => startGame(s0 as any, { now: 1 })).toThrow();
  });

  it('orders turn by canonical color order regardless of seating order', () => {
    // Players seated yellow, red, blue, green — should be reordered red, green, yellow, blue
    const players: Player[] = [
      { id: 'y', name: 'Y', avatar: '🐱', color: 'yellow', isBot: false, isHost: true,  connected: true },
      { id: 'r', name: 'R', avatar: '🦊', color: 'red',    isBot: false, isHost: false, connected: true },
      { id: 'bl', name: 'B', avatar: '🐼', color: 'blue',  isBot: false, isHost: false, connected: true },
      { id: 'g', name: 'G', avatar: '🦁', color: 'green',  isBot: false, isHost: false, connected: true },
    ];
    const s0 = createInitialState({ code: 'X', players, now: 0 });
    const s1 = startGame(s0, { now: 1 });
    expect(s1.turnOrder).toEqual(['r', 'g', 'y', 'bl']);
    expect(s1.currentTurn).toBe('r');
  });
});
