import { randomInt } from 'node:crypto';

/** Server-side cryptographically random Ludo dice (1..6). */
export const rollDie = (): number => randomInt(1, 7);
