import { describe, it, expect } from 'vitest';
import {
  createInitialState, startGame, applyRoll, applyMove, chooseBotMove,
  type Player,
} from '../src/index';

describe('full S&L game smoke test', () => {
  it('two bots play to a winner with deterministic dice', () => {
    const players: Player[] = [
      { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: true, isHost: true,  connected: true },
      { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: true, isHost: false, connected: true },
    ];
    let s = startGame(createInitialState({ code: 'X', players, now: 0 }), { now: 1 });

    const seq = [4, 5, 3, 2, 1, 6];
    let i = 0, safety = 5000;
    while (s.status === 'playing' && safety-- > 0) {
      s = applyRoll(s, seq[i++ % seq.length]!, { now: i });
      s = applyMove(s, chooseBotMove(s), { now: i });
    }
    expect(s.status).toBe('finished');
    expect(s.winner === 'a' || s.winner === 'b').toBe(true);
  });
});
