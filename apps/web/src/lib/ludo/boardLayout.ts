import type { Color, Token } from '@ludo/game-logic-ludo';
import { trackAbsolute } from '@ludo/game-logic-ludo';

export type Cell = { col: number; row: number };

/**
 * 15×15 grid coordinates (0,0 top-left). Track squares in clockwise order, starting at red's
 * launch square just below the cross arm on the left.
 */
const TRACK: Cell[] = [
  // top arm down (red's column)
  { col: 1, row: 6 }, { col: 2, row: 6 }, { col: 3, row: 6 }, { col: 4, row: 6 }, { col: 5, row: 6 },
  { col: 6, row: 5 }, { col: 6, row: 4 }, { col: 6, row: 3 }, { col: 6, row: 2 }, { col: 6, row: 1 }, { col: 6, row: 0 },
  { col: 7, row: 0 }, { col: 8, row: 0 },
  { col: 8, row: 1 }, { col: 8, row: 2 }, { col: 8, row: 3 }, { col: 8, row: 4 }, { col: 8, row: 5 },
  { col: 9, row: 6 }, { col: 10, row: 6 }, { col: 11, row: 6 }, { col: 12, row: 6 }, { col: 13, row: 6 }, { col: 14, row: 6 },
  { col: 14, row: 7 }, { col: 14, row: 8 },
  { col: 13, row: 8 }, { col: 12, row: 8 }, { col: 11, row: 8 }, { col: 10, row: 8 }, { col: 9, row: 8 },
  { col: 8, row: 9 }, { col: 8, row: 10 }, { col: 8, row: 11 }, { col: 8, row: 12 }, { col: 8, row: 13 }, { col: 8, row: 14 },
  { col: 7, row: 14 }, { col: 6, row: 14 },
  { col: 6, row: 13 }, { col: 6, row: 12 }, { col: 6, row: 11 }, { col: 6, row: 10 }, { col: 6, row: 9 },
  { col: 5, row: 8 }, { col: 4, row: 8 }, { col: 3, row: 8 }, { col: 2, row: 8 }, { col: 1, row: 8 }, { col: 0, row: 8 },
  { col: 0, row: 7 }, { col: 0, row: 6 },
];

if (TRACK.length !== 52) throw new Error(`TRACK should have 52 cells, has ${TRACK.length}`);

/** Home columns (5 cells each) leading toward the center. */
const FINAL_RUN: Record<Color, Cell[]> = {
  red:    [{ col: 1, row: 7 }, { col: 2, row: 7 }, { col: 3, row: 7 }, { col: 4, row: 7 }, { col: 5, row: 7 }],
  green:  [{ col: 7, row: 1 }, { col: 7, row: 2 }, { col: 7, row: 3 }, { col: 7, row: 4 }, { col: 7, row: 5 }],
  yellow: [{ col: 13, row: 7 }, { col: 12, row: 7 }, { col: 11, row: 7 }, { col: 10, row: 7 }, { col: 9, row: 7 }],
  blue:   [{ col: 7, row: 13 }, { col: 7, row: 12 }, { col: 7, row: 11 }, { col: 7, row: 10 }, { col: 7, row: 9 }],
};

/** Center cell (the finish). */
export const CENTER: Cell = { col: 7, row: 7 };

/** 4 home (start) circles per color, in the 6×6 corner. */
const HOME_SLOTS: Record<Color, Cell[]> = {
  red:    [{ col: 1, row: 1 }, { col: 4, row: 1 }, { col: 1, row: 4 }, { col: 4, row: 4 }],
  green:  [{ col: 10, row: 1 }, { col: 13, row: 1 }, { col: 10, row: 4 }, { col: 13, row: 4 }],
  yellow: [{ col: 10, row: 10 }, { col: 13, row: 10 }, { col: 10, row: 13 }, { col: 13, row: 13 }],
  blue:   [{ col: 1, row: 10 }, { col: 4, row: 10 }, { col: 1, row: 13 }, { col: 4, row: 13 }],
};

export function tokenCell(token: Token): Cell {
  if (token.position.kind === 'home') {
    const slotIdx = parseInt(token.id.split('-')[1] ?? '0', 10);
    return HOME_SLOTS[token.color][slotIdx]!;
  }
  const i = token.position.index;
  if (i <= 50) return TRACK[trackAbsolute(token.color, i)]!;
  if (i < 56) return FINAL_RUN[token.color][i - 51]!;
  return CENTER;
}

export const BOARD_TRACK = TRACK;
export const BOARD_HOME_SLOTS = HOME_SLOTS;
export const BOARD_FINAL_RUN = FINAL_RUN;
