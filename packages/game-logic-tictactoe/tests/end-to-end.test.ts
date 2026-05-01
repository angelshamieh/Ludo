import { describe, it, expect } from 'vitest';
import {
  createInitialState, startGame, applyMove, chooseBotMove,
  type Player,
} from '../src/index';

describe('full Tic-Tac-Toe game smoke test', () => {
  it('two hard bots play to a draw (minimax v minimax in T3 always draws)', () => {
    const players: Player[] = [
      { id: 'a', name: 'A', avatar: '🐱', color: 'red',  isBot: true, isHost: true,  connected: true },
      { id: 'b', name: 'B', avatar: '🦊', color: 'blue', isBot: true, isHost: false, connected: true },
    ];
    let s = createInitialState({ code: 'X', players, now: 0 });
    s = { ...s, difficulty: 'hard' };
    s = startGame(s, { now: 1 });

    let safety = 20;
    while (s.status === 'playing' && safety-- > 0) {
      s = applyMove(s, chooseBotMove(s), { now: Date.now() });
    }
    expect(s.status).toBe('finished');
    expect(s.winner).toBeNull();    // perfect-play tic-tac-toe is always a draw
  });

  it('two easy bots eventually finish (random moves; may win, lose, or draw)', () => {
    const players: Player[] = [
      { id: 'a', name: 'A', avatar: '🐱', color: 'red',  isBot: true, isHost: true,  connected: true },
      { id: 'b', name: 'B', avatar: '🦊', color: 'blue', isBot: true, isHost: false, connected: true },
    ];
    let s = createInitialState({ code: 'X', players, now: 0 });
    s = startGame(s, { now: 1 });

    let safety = 20;
    while (s.status === 'playing' && safety-- > 0) {
      s = applyMove(s, chooseBotMove(s), { now: Date.now() });
    }
    expect(s.status).toBe('finished');
  });
});
