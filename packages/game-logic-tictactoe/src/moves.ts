import type { GameEvent } from '@ludo/game-shared';
import type { GameState, Move } from './types';
import { BOARD_SIZE, checkWinner, isBoardFull } from './board';

export function applyRoll(_state: GameState, _value: number, _opts: { now: number }): GameState {
  throw new Error('applyRoll: tic-tac-toe has no dice');
}

export function isWin(state: GameState, playerId: string): boolean {
  const winnerMark = checkWinner(state.board);
  if (!winnerMark) return false;
  return state.marks[playerId] === winnerMark;
}

const otherPlayer = (state: GameState, playerId: string): string => {
  const i = state.turnOrder.indexOf(playerId);
  return state.turnOrder[(i + 1) % state.turnOrder.length]!;
};

export function applyMove(
  state: GameState,
  move: Move,
  opts: { now: number },
): GameState {
  if (state.status !== 'playing') throw new Error(`applyMove: expected playing, got ${state.status}`);
  if (state.currentTurn == null) throw new Error('applyMove: no current turn');
  if (move.kind !== 'place') throw new Error(`applyMove: unsupported move kind '${move.kind}'`);
  if (!Number.isInteger(move.cell) || move.cell < 0 || move.cell >= BOARD_SIZE) {
    throw new Error(`applyMove: cell ${move.cell} out of range 0..${BOARD_SIZE - 1}`);
  }
  if (state.board[move.cell] !== '') {
    throw new Error(`applyMove: cell ${move.cell} is already played`);
  }

  const playerId = state.currentTurn;
  const mark = state.marks[playerId];
  if (!mark) throw new Error(`applyMove: no mark assigned to player ${playerId}`);

  const newBoard = state.board.slice();
  newBoard[move.cell] = mark;

  const log: GameEvent[] = [
    ...state.log,
    { kind: 'moved', playerId, tokenId: String(move.cell), from: move.cell, to: move.cell },
  ];

  // Win check
  const winnerMark = checkWinner(newBoard);
  if (winnerMark) {
    log.push({ kind: 'won', playerId });
    return {
      ...state,
      board: newBoard,
      status: 'finished',
      winner: playerId,
      currentTurn: null,
      lastActivityAt: opts.now,
      log,
    };
  }

  // Draw check
  if (isBoardFull(newBoard)) {
    return {
      ...state,
      board: newBoard,
      status: 'finished',
      winner: null,
      currentTurn: null,
      lastActivityAt: opts.now,
      log,
    };
  }

  // Otherwise: switch turns
  const next = otherPlayer(state, playerId);
  log.push({ kind: 'turn', playerId: next });
  return {
    ...state,
    board: newBoard,
    currentTurn: next,
    lastActivityAt: opts.now,
    log,
  };
}

export function legalMoves(state: GameState, playerId: string): Move[] {
  if (state.currentTurn !== playerId) return [];
  if (state.status !== 'playing') return [];
  const moves: Move[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (state.board[i] === '') moves.push({ kind: 'place', cell: i });
  }
  return moves;
}
