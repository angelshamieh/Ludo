'use client';

type VibrationPattern = number | number[];

/** Lightweight vibration helper. No-op when the API isn't available (iOS Safari < 17, etc.). */
export const buzz = (pattern: VibrationPattern = 10) => {
  try {
    const nav = navigator as Navigator & { vibrate?: (p: VibrationPattern) => boolean };
    nav.vibrate?.(pattern);
  } catch {
    // Some browsers throw if vibrate is called too often; ignore.
  }
};

/** Preset patterns. Keep them short — long vibrations annoy. */
export const Buzz = {
  /** Tap feedback — single short pulse. */
  tap: () => buzz(8),
  /** Roll — quick double pulse for "rolling sound". */
  roll: () => buzz([20, 30, 20]),
  /** Capture — sharper triple pulse for "ouch". */
  capture: () => buzz([15, 30, 15, 30, 15]),
  /** Win — celebratory long pattern. */
  win: () => buzz([40, 40, 40, 40, 100]),
};
