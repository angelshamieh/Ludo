export type Cell = { col: number; row: number };

/**
 * Convert square number (1..100) to (col, row) on a 10×10 grid where
 * (0,0) is top-left and (9,9) is bottom-right.
 *
 * Boustrophedon: row 9 (bottom) goes left-to-right (squares 1-10),
 * row 8 right-to-left (11-20), row 7 left-to-right (21-30), etc.
 */
export function squareToCell(square: number): Cell {
  if (square < 1 || square > 100) throw new Error(`square ${square} out of range 1..100`);
  const indexFromBottom = square - 1;
  const row = 9 - Math.floor(indexFromBottom / 10);
  const inRow = indexFromBottom % 10;
  const rowFromBottom = Math.floor(indexFromBottom / 10);
  const col = rowFromBottom % 2 === 0 ? inRow : 9 - inRow;
  return { col, row };
}
