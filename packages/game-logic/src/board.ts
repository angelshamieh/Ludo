import type { Color } from './types';

/** Number of squares on the outer ring shared by all players. */
export const TRACK_LENGTH = 52;

/** Number of squares each player walks on the outer ring before turning into their home column. */
export const OUTER_PATH_STEPS = TRACK_LENGTH - 1; // 51

/** Number of squares in each player's home column, before the finish square. */
export const FINAL_RUN_LENGTH = 5;

/** Total path indices a single token traverses: outer steps (0..50) + home column (51..55) + finish (56). */
export const PATH_LENGTH = OUTER_PATH_STEPS + FINAL_RUN_LENGTH + 1;

/** The path index that represents a token finishing in the center. */
export const FINISH_INDEX = PATH_LENGTH - 1;

/** The last path index on the shared outer track before turning into the home column. */
export const LAST_SHARED_TRACK_INDEX = OUTER_PATH_STEPS - 1; // 50

export const START_OFFSET: Record<Color, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

/** Convert (color, pathIndex) on the outer track to absolute board square 0..51. */
export function trackAbsolute(color: Color, pathIndex: number): number {
  if (pathIndex < 0 || pathIndex > 50) {
    throw new Error(`pathIndex ${pathIndex} out of range; expected 0..${OUTER_PATH_STEPS - 1} (outer track)`);
  }
  return (START_OFFSET[color] + pathIndex) % TRACK_LENGTH;
}

/** The four squares where players emerge from home — these are safe squares. */
export const SAFE_ABSOLUTE_SQUARES: ReadonlySet<number> = new Set(
  Object.values(START_OFFSET),
);
