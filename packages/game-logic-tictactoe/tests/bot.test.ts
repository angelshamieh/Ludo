import { describe, it, expect } from 'vitest';
import { createInitialState, startGame, applyMove, chooseBotMove, type GameState, type Player } from '../src/index';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',  isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'blue', isBot: true,  isHost: false, connected: true },
];

const fresh = (difficulty: 'easy' | 'hard'): GameState => {
  const s0 = createInitialState({ code: 'X', players, now: 0 });
  return startGame({ ...s0, difficulty }, { now: 1 });
};

const setBoard = (s: GameState, board: GameState['board'], currentTurn: string): GameState => ({
  ...s, board, currentTurn,
});

describe('chooseBotMove — easy', () => {
  it('returns a legal place move (cell is empty and in 0..8)', () => {
    const s = fresh('easy');
    const m = chooseBotMove(s);
    expect(m.kind).toBe('place');
    expect(m.cell).toBeGreaterThanOrEqual(0);
    expect(m.cell).toBeLessThan(9);
    expect(s.board[m.cell]).toBe('');
  });
});

describe('chooseBotMove — hard (minimax)', () => {
  it('takes immediate win when one move completes a line', () => {
    // Bot is X (player a — assume bot in this test), about to win on cell 2:
    // X X _
    // _ _ _
    // _ _ _
    // But our test setup has bot=b=O. Let's set bot.id = 'b' and make O on the verge of winning.
    // O O _    cell 2 wins for O
    // X _ _
    // _ _ _
    let s = setBoard(fresh('hard'),
      ['O','O','','X','','','','',''], 'b');
    const m = chooseBotMove(s);
    expect(m).toEqual({ kind: 'place', cell: 2 });
  });

  it('blocks opponent\'s immediate win', () => {
    // X is about to win on cell 2 (X X _). Bot is O — must block at 2.
    // X X _
    // _ _ _
    // _ _ _
    let s = setBoard(fresh('hard'),
      ['X','X','','','','','','',''], 'b');
    const m = chooseBotMove(s);
    expect(m).toEqual({ kind: 'place', cell: 2 });
  });

  it('on empty board chooses a legal move', () => {
    const s = fresh('hard');
    const m = chooseBotMove(s);
    expect(m.kind).toBe('place');
    expect(s.board[m.cell]).toBe('');
  });
});
