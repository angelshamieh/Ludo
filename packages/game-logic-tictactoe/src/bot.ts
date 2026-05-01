import type { GameState, Move, Mark } from './types';
import { BOARD_SIZE, WIN_LINES, checkWinner, isBoardFull } from './board';
import { legalMoves } from './moves';

const MAX_DEPTH = 9;

/**
 * Minimax with alpha-beta pruning. Returns a score where positive favors the maximizing player.
 * +10 = win, -10 = loss, 0 = draw, depth-discounted (so faster wins beat slower wins).
 */
function minimax(
  board: Mark[],
  myMark: Mark,
  curMark: Mark,
  depth: number,
  alpha: number,
  beta: number,
): number {
  const winner = checkWinner(board);
  if (winner === myMark) return 10 - depth;
  if (winner !== null && winner !== myMark) return depth - 10;
  if (isBoardFull(board)) return 0;
  if (depth >= MAX_DEPTH) return 0;

  const isMaximizing = curMark === myMark;
  let best = isMaximizing ? -Infinity : Infinity;
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i] !== '') continue;
    const newBoard = board.slice();
    newBoard[i] = curMark;
    const nextMark: Mark = curMark === 'X' ? 'O' : 'X';
    const score = minimax(newBoard, myMark, nextMark, depth + 1, alpha, beta);
    if (isMaximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, score);
    }
    if (beta <= alpha) break;
  }
  return best;
}

function chooseBotMoveHard(state: GameState): Move {
  const playerId = state.currentTurn!;
  const myMark = state.marks[playerId]!;
  const moves = legalMoves(state, playerId);
  if (moves.length === 0) return moves[0]!;   // shouldn't happen — handled by caller

  let bestScore = -Infinity;
  let bestMove = moves[0]!;
  for (const m of moves) {
    if (m.kind !== 'place') continue;
    const newBoard = state.board.slice();
    newBoard[m.cell] = myMark;
    const opponentMark: Mark = myMark === 'X' ? 'O' : 'X';
    const score = minimax(newBoard, myMark, opponentMark, 1, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }
  return bestMove;
}

function chooseBotMoveEasy(state: GameState): Move {
  const playerId = state.currentTurn!;
  const moves = legalMoves(state, playerId);
  return moves[Math.floor(Math.random() * moves.length)]!;
}

export function chooseBotMove(state: GameState): Move {
  if (state.difficulty === 'hard') return chooseBotMoveHard(state);
  return chooseBotMoveEasy(state);
}
