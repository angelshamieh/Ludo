import type { Color } from './types';

export const TRACK_LENGTH = 52;
export const FINAL_RUN_LENGTH = 5;
/** 51 outer-track squares (0..50), 5 home-column squares (51..55), 1 finish (56). */
export const PATH_LENGTH = 51 + FINAL_RUN_LENGTH + 1; // 57

export const START_OFFSET: Record<Color, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

/** Convert (color, pathIndex) on the outer track to absolute board square 0..51. */
export function trackAbsolute(color: Color, pathIndex: number): number {
  if (pathIndex < 0 || pathIndex > 50) {
    throw new Error(`pathIndex ${pathIndex} is not on the outer track`);
  }
  return (START_OFFSET[color] + pathIndex) % TRACK_LENGTH;
}

/** The four squares where players emerge from home — these are safe squares. */
export const SAFE_ABSOLUTE_SQUARES: ReadonlySet<number> = new Set(
  Object.values(START_OFFSET),
);
