/**
 * @server-only
 *
 * This module imports `node:crypto` and must NOT be bundled into a browser build.
 * Tree-shaking should remove it from client bundles that don't import `rollDie`,
 * but if you see "Module 'node:crypto' externalized for browser compatibility"
 * warnings, switch to the dedicated subpath import (TODO: split `exports` map).
 */
import { randomInt } from 'node:crypto';

/** Server-side cryptographically random Ludo dice (1..6). */
export const rollDie = (): number => randomInt(1, 7);
