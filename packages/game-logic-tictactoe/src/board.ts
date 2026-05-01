import type { Mark } from './types';

export const BOARD_SIZE = 9;

/** All 8 winning lines in a 3x3 grid (rows, cols, diagonals). Each is 3 cell indices. */
export const WIN_LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],   // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8],   // cols
  [0, 4, 8], [2, 4, 6],               // diagonals
];

/** Returns the winning mark ('X' or 'O') if any win line is fully held by one player; else null. */
export function checkWinner(board: Mark[]): 'X' | 'O' | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const v = board[a];
    if (v && v === board[b] && v === board[c]) return v as 'X' | 'O';
  }
  return null;
}

/** Returns true if all 9 cells have a non-empty mark. */
export function isBoardFull(board: Mark[]): boolean {
  return board.every((c) => c !== '');
}
