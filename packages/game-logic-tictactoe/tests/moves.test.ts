import { describe, it, expect } from 'vitest';
import { createInitialState, startGame, applyMove, applyRoll, isWin, legalMoves, type GameState, type Player } from '../src/index';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',  isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'blue', isBot: false, isHost: false, connected: true },
];
const fresh = () => startGame(createInitialState({ code: 'X', players, now: 0 }), { now: 1 });

const setBoard = (s: GameState, board: GameState['board'], currentTurn: string): GameState => ({
  ...s, board, currentTurn,
});

describe('applyMove (tictactoe)', () => {
  it('places the player\'s mark on an empty cell', () => {
    const s0 = fresh();
    const s1 = applyMove(s0, { kind: 'place', cell: 4 }, { now: 5 });
    expect(s1.board[4]).toBe('X');
    expect(s1.currentTurn).toBe('b');  // turn flips
  });

  it('rejects move on an occupied cell', () => {
    let s = fresh();
    s = applyMove(s, { kind: 'place', cell: 0 }, { now: 5 });   // a places X at 0
    s = applyMove(s, { kind: 'place', cell: 1 }, { now: 6 });   // b places O at 1
    expect(() => applyMove(s, { kind: 'place', cell: 0 }, { now: 7 })).toThrow();
  });

  it('rejects move when not your turn', () => {
    const s = fresh();
    // a is currentTurn; b should not be able to play
    expect(s.currentTurn).toBe('a');
    expect(legalMoves(s, 'b')).toEqual([]);
  });

  it('rejects move with invalid cell index', () => {
    const s = fresh();
    expect(() => applyMove(s, { kind: 'place', cell: 9 }, { now: 5 })).toThrow();
    expect(() => applyMove(s, { kind: 'place', cell: -1 }, { now: 5 })).toThrow();
  });

  it('detects win on completing a line', () => {
    let s = setBoard(fresh(), ['X','X','','','','','','',''], 'a');
    s = applyMove(s, { kind: 'place', cell: 2 }, { now: 5 });
    expect(s.status).toBe('finished');
    expect(s.winner).toBe('a');
    expect(s.currentTurn).toBeNull();
    expect(s.log.some((e) => e.kind === 'won' && e.playerId === 'a')).toBe(true);
  });

  it('detects draw when board fills with no winner', () => {
    // Reach a state where one move fills the board with no winning line
    //   X O X       0 1 2
    //   X O O       3 4 5
    //   O X _       6 7 _
    // a (X) plays at 8 → still no line → draw
    let s = setBoard(fresh(),
      ['X','O','X','X','O','O','O','X',''], 'a');
    s = applyMove(s, { kind: 'place', cell: 8 }, { now: 5 });
    expect(s.status).toBe('finished');
    expect(s.winner).toBeNull();
    expect(s.board[8]).toBe('X');
  });
});

describe('applyRoll (tictactoe — no-op throws)', () => {
  it('throws if called (tic-tac-toe has no dice)', () => {
    expect(() => applyRoll(fresh(), 4, { now: 5 })).toThrow();
  });
});

describe('isWin / legalMoves', () => {
  it('isWin true when player has a line', () => {
    const s = setBoard(fresh(), ['X','X','X','','','','','',''], 'b');
    expect(isWin(s, 'a')).toBe(true);
    expect(isWin(s, 'b')).toBe(false);
  });

  it('legalMoves returns all empty cells when it\'s your turn', () => {
    let s = fresh();
    s = applyMove(s, { kind: 'place', cell: 4 }, { now: 5 });   // a played 4 → now b's turn
    const moves = legalMoves(s, 'b');
    expect(moves).toHaveLength(8);                              // 9 - 1
    expect(moves.every((m) => m.kind === 'place')).toBe(true);
    expect(moves.some((m) => m.kind === 'place' && m.cell === 4)).toBe(false);   // 4 not legal
  });

  it('legalMoves is empty for the non-current player', () => {
    const s = fresh();
    expect(legalMoves(s, 'b')).toEqual([]);
  });
});
