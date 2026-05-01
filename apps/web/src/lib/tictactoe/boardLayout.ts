export const CELL_SIZE = 80;
export const GRID_DIM = 3;
export const BOARD_PIXELS = CELL_SIZE * GRID_DIM;

export type Coords = { col: number; row: number };

export function cellToCoords(cell: number): Coords {
  if (cell < 0 || cell >= GRID_DIM * GRID_DIM) {
    throw new Error(`cell ${cell} out of range 0..${GRID_DIM * GRID_DIM - 1}`);
  }
  return { col: cell % GRID_DIM, row: Math.floor(cell / GRID_DIM) };
}
