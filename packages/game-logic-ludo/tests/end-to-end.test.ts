import { describe, it, expect } from 'vitest';
import {
  createInitialState, startGame, applyRoll, applyMove, chooseBotMove,
  type Player,
} from '../src/index';

describe('full game smoke test', () => {
  it('two bots play to a winner with deterministic dice', () => {
    const players: Player[] = [
      { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: true,  isHost: true,  connected: true },
      { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: true,  isHost: false, connected: true },
    ];
    let s = startGame(createInitialState({ code: 'X', players, now: 0 }), { now: 1 });

    // Deterministic dice: rotate 6,4,2,5,3,1 forever
    const seq = [6, 4, 2, 5, 3, 1];
    let i = 0;
    let safetyMaxTurns = 5000;
    while (s.status === 'playing' && safetyMaxTurns-- > 0) {
      s = applyRoll(s, seq[i++ % seq.length]!, { now: i });
      const move = chooseBotMove(s);
      s = applyMove(s, move, { now: i });
    }
    expect(s.status).toBe('finished');
    expect(s.winner === 'a' || s.winner === 'b').toBe(true);
  });
});
