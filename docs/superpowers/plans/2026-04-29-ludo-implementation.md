# Ludo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first, online-multiplayer Ludo web app with private rooms, 2–4 players + bots, classic Western rules, cozy pastel visuals, deployable in days.

**Architecture:** pnpm monorepo with three packages: `packages/game-logic` (pure rules engine, shared), `apps/web` (Next.js + React PWA), `apps/server` (Node + ws WebSocket server). Authoritative server, full-state-snapshot sync, anonymous local profile (UUID + name in `localStorage`), 4-letter room codes.

**Tech Stack:** TypeScript, pnpm workspaces, vitest, Next.js 15 (App Router), React 19, Tailwind CSS, `ws` (Node WebSocket library), Playwright for E2E. Deploy via Coolify on user's VPS (two services on separate subdomains).

**Spec:** `docs/superpowers/specs/2026-04-29-ludo-design.md`

---

## Phases

- **Phase 0** — Repo scaffold, tooling
- **Phase 1** — Pure game-logic with TDD
- **Phase 2** — Static board UI on Next.js
- **Phase 3** — Local single-player prototype (browser-only, vs bots)
- **Phase 4** — WebSocket server
- **Phase 5** — Lobby, room codes, share links
- **Phase 6** — Reconnect + AFK reliability
- **Phase 7** — Mobile UX polish + PWA install
- **Phase 8** — Deploy via Coolify (web + WS server, two subdomains)

Each task ends with a green test run (or, for UI, a live-checked screen) and a commit. Checkbox each step as you complete it.

---

# Phase 0: Repo Scaffold

## Task 0.1: Initialize monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore` (already exists from spec; verify)
- Create: `README.md`

- [ ] **Step 1: Verify pnpm is installed**

```bash
pnpm --version
# If missing: npm install -g pnpm
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "ludo",
  "private": true,
  "version": "0.0.1",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "dev:web": "pnpm --filter @ludo/web dev",
    "dev:server": "pnpm --filter @ludo/server dev",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  },
  "engines": { "node": ">=20" },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 3: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 4: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true
  }
}
```

- [ ] **Step 5: Update `.gitignore`**

Append (the file already exists):
```
dist/
coverage/
.vercel/
.fly/
*.log
```

- [ ] **Step 6: Create README**

```markdown
# Ludo

Online multiplayer Ludo for family.

- `packages/game-logic` — pure rules engine
- `apps/web` — Next.js client (PWA)
- `apps/server` — Node WebSocket server

## Develop

```bash
pnpm install
pnpm dev:server   # in one terminal
pnpm dev:web      # in another
```
```

- [ ] **Step 7: Run install and commit**

```bash
pnpm install
git add -A
git commit -m "chore: scaffold pnpm monorepo"
```

Expected: `pnpm install` completes with no packages (workspaces empty so far). Git commit succeeds.

---

## Task 0.2: Install root dev dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add devDependencies**

Run:
```bash
pnpm add -Dw typescript@5.5 vitest@2 @types/node@20 prettier@3
```

- [ ] **Step 2: Add `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: add root dev tooling"
```

---

# Phase 1: Pure Game Logic (TDD)

The game logic lives in `packages/game-logic` as a pure TypeScript module — no I/O, no DOM, no React. Both client and server will import from it. **Strict TDD here:** every rule gets a failing test first, then minimum code to pass.

## Task 1.1: Initialize game-logic package

**Files:**
- Create: `packages/game-logic/package.json`
- Create: `packages/game-logic/tsconfig.json`
- Create: `packages/game-logic/vitest.config.ts`
- Create: `packages/game-logic/src/index.ts`

- [ ] **Step 1: Write `packages/game-logic/package.json`**

```json
{
  "name": "@ludo/game-logic",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "echo skip"
  },
  "devDependencies": {
    "typescript": "5.5",
    "vitest": "2"
  }
}
```

- [ ] **Step 2: Write `packages/game-logic/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Write `packages/game-logic/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: Empty `packages/game-logic/src/index.ts`**

```ts
// Public exports added in subsequent tasks.
export {};
```

- [ ] **Step 5: Install and commit**

```bash
pnpm install
git add -A
git commit -m "feat(game-logic): scaffold package"
```

---

## Task 1.2: Type definitions

**Files:**
- Create: `packages/game-logic/src/types.ts`
- Create: `packages/game-logic/tests/types.test.ts`

These types are referenced by every other module. Write them in one shot — there's no behavior to test, but we'll add a smoke test that ensures the file imports cleanly.

- [ ] **Step 1: Write `packages/game-logic/src/types.ts`**

```ts
export type Color = 'red' | 'green' | 'blue' | 'yellow';

export const COLORS: readonly Color[] = ['red', 'green', 'blue', 'yellow'] as const;

/**
 * Each player walks a 57-step path:
 *   0..50 — outer track (51 squares, offset by their start position)
 *   51..55 — five home-column squares
 *   56 — center (finished)
 */
export type PathIndex = number; // 0..56

export type TokenPosition =
  | { kind: 'home' }
  | { kind: 'path'; index: PathIndex };

export type Token = {
  id: string;            // `${color}-${0..3}`
  owner: string;         // playerId
  color: Color;
  position: TokenPosition;
};

export type Player = {
  id: string;            // UUID
  name: string;
  avatar: string;        // emoji
  color: Color;
  isBot: boolean;
  isHost: boolean;
  connected: boolean;
};

export type GameStatus = 'lobby' | 'playing' | 'finished';

export type GameEvent =
  | { kind: 'rolled'; playerId: string; value: number }
  | { kind: 'moved'; playerId: string; tokenId: string; from: TokenPosition; to: TokenPosition }
  | { kind: 'captured'; capturer: string; victim: string; tokenId: string }
  | { kind: 'turn'; playerId: string }
  | { kind: 'won'; playerId: string };

export type GameState = {
  code: string;
  status: GameStatus;
  players: Player[];
  turnOrder: string[];          // playerIds in seating order
  currentTurn: string | null;
  dice: number | null;
  rolledThisTurn: boolean;
  consecutiveSixes: number;
  tokens: Record<string, Token[]>;  // playerId -> 4 tokens
  winner: string | null;
  log: GameEvent[];
  createdAt: number;
  lastActivityAt: number;
};

export type Move =
  | { kind: 'move'; tokenId: string }
  | { kind: 'pass' };
```

- [ ] **Step 2: Write `packages/game-logic/tests/types.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { COLORS } from '../src/types';

describe('types', () => {
  it('exposes the four canonical Ludo colors', () => {
    expect(COLORS).toEqual(['red', 'green', 'blue', 'yellow']);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @ludo/game-logic test
```
Expected: 1 passed.

- [ ] **Step 4: Export types from index**

`packages/game-logic/src/index.ts`:
```ts
export * from './types';
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(game-logic): add core types"
```

---

## Task 1.3: Board geometry constants

The path has fixed offsets per color. We need a single source of truth.

**Files:**
- Create: `packages/game-logic/src/board.ts`
- Create: `packages/game-logic/tests/board.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/game-logic/tests/board.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { trackAbsolute, START_OFFSET, TRACK_LENGTH, FINAL_RUN_LENGTH, PATH_LENGTH } from '../src/board';

describe('board', () => {
  it('has 52 outer-track squares', () => {
    expect(TRACK_LENGTH).toBe(52);
  });

  it('has 5 home-column squares before center', () => {
    expect(FINAL_RUN_LENGTH).toBe(5);
  });

  it('total path = 51 outer + 5 home + 1 finish = 57 (indices 0..56)', () => {
    expect(PATH_LENGTH).toBe(57);
  });

  it('color start offsets are 13 apart', () => {
    expect(START_OFFSET.red).toBe(0);
    expect(START_OFFSET.green).toBe(13);
    expect(START_OFFSET.yellow).toBe(26);
    expect(START_OFFSET.blue).toBe(39);
  });

  it('trackAbsolute wraps modulo 52', () => {
    expect(trackAbsolute('red', 0)).toBe(0);
    expect(trackAbsolute('red', 50)).toBe(50);
    expect(trackAbsolute('green', 0)).toBe(13);
    expect(trackAbsolute('green', 40)).toBe(53 % 52); // 1
    expect(trackAbsolute('blue', 13)).toBe(0);        // 39 + 13 = 52 % 52 = 0
  });

  it('trackAbsolute throws if pathIndex is past the outer track', () => {
    expect(() => trackAbsolute('red', 51)).toThrow();
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

```bash
pnpm --filter @ludo/game-logic test
```
Expected: FAIL — file not found.

- [ ] **Step 3: Implement `packages/game-logic/src/board.ts`**

```ts
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
```

- [ ] **Step 4: Run tests, verify pass**

```bash
pnpm --filter @ludo/game-logic test
```
Expected: all pass.

- [ ] **Step 5: Export and commit**

Update `packages/game-logic/src/index.ts`:
```ts
export * from './types';
export * from './board';
```

```bash
git add -A
git commit -m "feat(game-logic): board geometry constants"
```

---

## Task 1.4: Initial game state factory

**Files:**
- Create: `packages/game-logic/src/state.ts`
- Create: `packages/game-logic/tests/state.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/game-logic/tests/state.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/state';
import type { Player } from '../src/types';

const players = (n: number): Player[] => {
  const colors = ['red', 'green', 'blue', 'yellow'] as const;
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    avatar: '🐱',
    color: colors[i]!,
    isBot: false,
    isHost: i === 0,
    connected: true,
  }));
};

describe('createInitialState', () => {
  it('builds a 4-player game in lobby status', () => {
    const s = createInitialState({ code: 'ABCD', players: players(4), now: 1000 });
    expect(s.code).toBe('ABCD');
    expect(s.status).toBe('lobby');
    expect(s.players).toHaveLength(4);
    expect(s.currentTurn).toBe(null);
    expect(s.winner).toBe(null);
  });

  it('gives every player 4 tokens, all at home', () => {
    const s = createInitialState({ code: 'ABCD', players: players(2), now: 1000 });
    for (const p of s.players) {
      expect(s.tokens[p.id]).toHaveLength(4);
      for (const t of s.tokens[p.id]!) {
        expect(t.position).toEqual({ kind: 'home' });
        expect(t.color).toBe(p.color);
        expect(t.owner).toBe(p.id);
      }
    }
  });

  it('uses unique token IDs of the form `${color}-${0..3}`', () => {
    const s = createInitialState({ code: 'ABCD', players: players(2), now: 1000 });
    const ids = Object.values(s.tokens).flat().map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('red-0');
    expect(ids).toContain('red-3');
  });

  it('rejects 0, 1, or 5+ players', () => {
    expect(() => createInitialState({ code: 'X', players: players(1), now: 0 })).toThrow();
    expect(() => createInitialState({ code: 'X', players: [], now: 0 })).toThrow();
  });

  it('rejects duplicate colors', () => {
    const dup = players(2);
    dup[1]!.color = 'red';
    expect(() => createInitialState({ code: 'X', players: dup, now: 0 })).toThrow(/color/i);
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
pnpm --filter @ludo/game-logic test
```

- [ ] **Step 3: Implement `packages/game-logic/src/state.ts`**

```ts
import type { GameState, Player, Token } from './types';

export type CreateInitialStateInput = {
  code: string;
  players: Player[];
  now: number;
};

export function createInitialState(input: CreateInitialStateInput): GameState {
  const { code, players, now } = input;
  if (players.length < 2 || players.length > 4) {
    throw new Error(`Ludo needs 2-4 players, got ${players.length}`);
  }
  const colors = new Set(players.map((p) => p.color));
  if (colors.size !== players.length) {
    throw new Error('duplicate player color');
  }
  const tokens: Record<string, Token[]> = {};
  for (const p of players) {
    tokens[p.id] = Array.from({ length: 4 }, (_, i) => ({
      id: `${p.color}-${i}`,
      owner: p.id,
      color: p.color,
      position: { kind: 'home' as const },
    }));
  }
  return {
    code,
    status: 'lobby',
    players,
    turnOrder: [],
    currentTurn: null,
    dice: null,
    rolledThisTurn: false,
    consecutiveSixes: 0,
    tokens,
    winner: null,
    log: [],
    createdAt: now,
    lastActivityAt: now,
  };
}
```

- [ ] **Step 4: Run, verify pass**

- [ ] **Step 5: Export and commit**

`packages/game-logic/src/index.ts`:
```ts
export * from './types';
export * from './board';
export * from './state';
```

```bash
git add -A
git commit -m "feat(game-logic): createInitialState"
```

---

## Task 1.5: Start game (transition lobby → playing)

**Files:**
- Modify: `packages/game-logic/src/state.ts`
- Create: `packages/game-logic/tests/start.test.ts`

- [ ] **Step 1: Write failing test**

`packages/game-logic/tests/start.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, startGame } from '../src/index';
import type { Player } from '../src/index';

const mkPlayers = (): Player[] => ([
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: false, isHost: false, connected: true },
  { id: 'c', name: 'C', avatar: '🐼', color: 'blue',  isBot: true,  isHost: false, connected: true },
]);

describe('startGame', () => {
  it('flips status to playing, sets turn order red,green,yellow,blue order, picks first player', () => {
    const s0 = createInitialState({ code: 'X', players: mkPlayers(), now: 0 });
    const s1 = startGame(s0, { now: 5 });
    expect(s1.status).toBe('playing');
    // Canonical color order, filtered to actual players: red, green, blue
    expect(s1.turnOrder).toEqual(['a', 'b', 'c']);
    expect(s1.currentTurn).toBe('a');
    expect(s1.lastActivityAt).toBe(5);
    expect(s1.log).toContainEqual({ kind: 'turn', playerId: 'a' });
  });

  it('refuses to start unless status is lobby', () => {
    const s0 = createInitialState({ code: 'X', players: mkPlayers(), now: 0 });
    const s1 = startGame(s0, { now: 5 });
    expect(() => startGame(s1, { now: 6 })).toThrow();
  });

  it('refuses to start defensively if players array is empty', () => {
    const s0 = { ...createInitialState({ code: 'X', players: mkPlayers(), now: 0 }), players: [] };
    expect(() => startGame(s0 as any, { now: 1 })).toThrow();
  });
});
```

- [ ] **Step 2: Implement in `packages/game-logic/src/state.ts`**

Append:

```ts
import { COLORS } from './types';

export function startGame(state: GameState, opts: { now: number }): GameState {
  if (state.status !== 'lobby') {
    throw new Error('startGame: not in lobby');
  }
  if (state.players.length < 2) {
    throw new Error('startGame: need at least 2 players');
  }
  // Seat order = canonical color order intersected with present players
  const turnOrder = COLORS
    .map((c) => state.players.find((p) => p.color === c))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => p.id);
  const first = turnOrder[0]!;
  return {
    ...state,
    status: 'playing',
    turnOrder,
    currentTurn: first,
    lastActivityAt: opts.now,
    log: [...state.log, { kind: 'turn', playerId: first }],
  };
}
```

- [ ] **Step 3: Run tests; verify pass; commit**

```bash
pnpm --filter @ludo/game-logic test
git add -A
git commit -m "feat(game-logic): startGame"
```

---

## Task 1.6: Legal moves — leaving home

**Files:**
- Create: `packages/game-logic/src/moves.ts`
- Create: `packages/game-logic/tests/moves-leave-home.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, startGame, legalMoves } from '../src/index';
import type { Player } from '../src/index';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: false, isHost: false, connected: true },
];

const fresh = () => {
  const s0 = createInitialState({ code: 'X', players, now: 0 });
  return startGame(s0, { now: 1 });
};

describe('legalMoves: leaving home', () => {
  it('rolling a 6 lets exactly the home tokens leave', () => {
    const s = { ...fresh(), dice: 6, rolledThisTurn: true };
    const moves = legalMoves(s, 'a');
    // 4 home tokens for 'a'
    expect(moves).toHaveLength(4);
    for (const m of moves) {
      expect(m.kind).toBe('move');
    }
  });

  it('rolling 1..5 with all tokens at home yields a forced pass', () => {
    for (const dice of [1, 2, 3, 4, 5]) {
      const s = { ...fresh(), dice, rolledThisTurn: true };
      const moves = legalMoves(s, 'a');
      expect(moves).toEqual([{ kind: 'pass' }]);
    }
  });

  it('asking for legalMoves of someone else returns empty', () => {
    const s = { ...fresh(), dice: 6, rolledThisTurn: true };
    expect(legalMoves(s, 'b')).toEqual([]);
  });

  it('asking for legalMoves before rolling returns empty', () => {
    const s = { ...fresh(), dice: null, rolledThisTurn: false };
    expect(legalMoves(s, 'a')).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement `packages/game-logic/src/moves.ts`**

```ts
import type { GameState, Move, Token, TokenPosition } from './types';
import { trackAbsolute, FINAL_RUN_LENGTH, SAFE_ABSOLUTE_SQUARES } from './board';

const FINAL_RUN_START = 51;
const FINISH = 56;

/** Where would the given token end up if moved by `dice` pips? Returns null if the move is illegal. */
export function projectMove(token: Token, dice: number): TokenPosition | null {
  if (token.position.kind === 'home') {
    return dice === 6 ? { kind: 'path', index: 0 } : null;
  }
  // path
  const next = token.position.index + dice;
  if (next > FINISH) return null; // overshoot — illegal in classic Western
  return { kind: 'path', index: next };
}

export function legalMoves(state: GameState, playerId: string): Move[] {
  if (state.currentTurn !== playerId) return [];
  if (state.dice == null || !state.rolledThisTurn) return [];
  const dice = state.dice;
  const tokens = state.tokens[playerId] ?? [];
  const moves: Move[] = [];
  for (const t of tokens) {
    if (projectMove(t, dice) != null) {
      moves.push({ kind: 'move', tokenId: t.id });
    }
  }
  if (moves.length === 0) return [{ kind: 'pass' }];
  return moves;
}
```

Add board imports already implied. Export from index:
```ts
// packages/game-logic/src/index.ts
export * from './types';
export * from './board';
export * from './state';
export * from './moves';
```

- [ ] **Step 3: Run, verify pass; commit**

```bash
pnpm --filter @ludo/game-logic test
git add -A
git commit -m "feat(game-logic): legalMoves for leaving home"
```

---

## Task 1.7: Apply move — leaving home, advancing, capturing, finishing

**Files:**
- Modify: `packages/game-logic/src/moves.ts` (add `applyMove`)
- Create: `packages/game-logic/tests/moves-apply.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from 'vitest';
import {
  createInitialState, startGame, applyMove, legalMoves,
  type GameState, type Player, START_OFFSET,
} from '../src/index';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: false, isHost: false, connected: true },
];
const fresh = () => startGame(createInitialState({ code: 'X', players, now: 0 }), { now: 1 });

const setToken = (s: GameState, pid: string, tokenIdx: number, pos: any): GameState => {
  const tokens = { ...s.tokens };
  tokens[pid] = tokens[pid]!.map((t, i) => i === tokenIdx ? { ...t, position: pos } : t);
  return { ...s, tokens };
};

describe('applyMove', () => {
  it('rolling 6 + move leaves home onto path index 0', () => {
    let s = { ...fresh(), dice: 6, rolledThisTurn: true };
    s = applyMove(s, { kind: 'move', tokenId: 'red-0' }, { now: 5 });
    expect(s.tokens['a']![0]!.position).toEqual({ kind: 'path', index: 0 });
    expect(s.dice).toBe(null);              // dice consumed
    expect(s.rolledThisTurn).toBe(false);
    // Rolling a 6 = same player rolls again
    expect(s.currentTurn).toBe('a');
  });

  it('after non-six move, turn passes to next player', () => {
    let s = fresh();
    s = setToken(s, 'a', 0, { kind: 'path', index: 0 });
    s = { ...s, dice: 3, rolledThisTurn: true };
    s = applyMove(s, { kind: 'move', tokenId: 'red-0' }, { now: 5 });
    expect(s.tokens['a']![0]!.position).toEqual({ kind: 'path', index: 3 });
    expect(s.currentTurn).toBe('b');
  });

  it('capturing sends the victim home and grants extra turn', () => {
    let s = fresh();
    // Place red at outer-track absolute index 13 (green's start). pathIndex = 13.
    s = setToken(s, 'a', 0, { kind: 'path', index: 12 });
    // Place green at its own pathIndex 4 → absolute (13+4)%52 = 17
    // Make them collide: put green at green-pathIndex 5 → absolute 18.
    // Easier: put green at pathIndex 5, ensure red lands on green absolute square.
    // Red rolls 6: 12+6=18. abs(red,18) = 18. We need green's token at abs 18.
    // green pathIndex p with (13+p)%52 = 18 → p = 5.
    s = setToken(s, 'b', 0, { kind: 'path', index: 5 });
    s = { ...s, dice: 6, rolledThisTurn: true };
    s = applyMove(s, { kind: 'move', tokenId: 'red-0' }, { now: 7 });
    expect(s.tokens['a']![0]!.position).toEqual({ kind: 'path', index: 18 });
    expect(s.tokens['b']![0]!.position).toEqual({ kind: 'home' });
    expect(s.log.some((e) => e.kind === 'captured')).toBe(true);
    // Capture grants extra turn
    expect(s.currentTurn).toBe('a');
  });

  it('cannot capture on a safe square', () => {
    let s = fresh();
    // Put red at pathIndex 12 (abs 12). Roll 1 → land at pathIndex 13 (abs 13 = green's start, safe).
    s = setToken(s, 'a', 0, { kind: 'path', index: 12 });
    // Put green at green pathIndex 0 (abs 13, on its own start).
    s = setToken(s, 'b', 0, { kind: 'path', index: 0 });
    s = { ...s, dice: 1, rolledThisTurn: true };
    s = applyMove(s, { kind: 'move', tokenId: 'red-0' }, { now: 9 });
    // Both tokens now at abs 13 (red pathIndex 13, green pathIndex 0). No capture.
    expect(s.tokens['a']![0]!.position).toEqual({ kind: 'path', index: 13 });
    expect(s.tokens['b']![0]!.position).toEqual({ kind: 'path', index: 0 });
    expect(s.log.some((e) => e.kind === 'captured')).toBe(false);
  });

  it('exact-roll into the center finishes a token', () => {
    let s = fresh();
    s = setToken(s, 'a', 0, { kind: 'path', index: 53 });   // home column #2
    s = { ...s, dice: 3, rolledThisTurn: true };
    s = applyMove(s, { kind: 'move', tokenId: 'red-0' }, { now: 11 });
    expect(s.tokens['a']![0]!.position).toEqual({ kind: 'path', index: 56 });
  });

  it('overshoot is not a legal move', () => {
    let s = fresh();
    s = setToken(s, 'a', 0, { kind: 'path', index: 54 });
    s = { ...s, dice: 4, rolledThisTurn: true };
    const moves = legalMoves(s, 'a');
    expect(moves).toEqual([{ kind: 'pass' }]);
  });

  it('passing advances to next player and consumes dice', () => {
    let s = fresh();
    s = { ...s, dice: 5, rolledThisTurn: true };
    s = applyMove(s, { kind: 'pass' }, { now: 13 });
    expect(s.dice).toBe(null);
    expect(s.currentTurn).toBe('b');
  });
});
```

- [ ] **Step 2: Implement `applyMove` in `packages/game-logic/src/moves.ts`**

Append:

```ts
import type { GameEvent, Player } from './types';

const isCapturable = (
  myColor: Token['color'],
  myAbs: number,
  victim: Token,
): boolean => {
  if (victim.color === myColor) return false;
  if (victim.position.kind !== 'path') return false;
  if (victim.position.index > 50) return false;            // in their home column
  if (victim.position.index === 56) return false;          // finished
  // Victim's absolute square:
  const victimAbs = trackAbsolute(victim.color, victim.position.index);
  if (victimAbs !== myAbs) return false;
  if (SAFE_ABSOLUTE_SQUARES.has(myAbs)) return false;
  return true;
};

const nextTurn = (state: GameState): string => {
  const i = state.turnOrder.indexOf(state.currentTurn!);
  return state.turnOrder[(i + 1) % state.turnOrder.length]!;
};

export function applyMove(
  state: GameState,
  move: Move,
  opts: { now: number },
): GameState {
  if (state.status !== 'playing') throw new Error('applyMove: not playing');
  if (state.currentTurn == null) throw new Error('applyMove: no current turn');
  if (state.dice == null || !state.rolledThisTurn) throw new Error('applyMove: must roll first');
  const playerId = state.currentTurn;
  const dice = state.dice;
  const log: GameEvent[] = [...state.log];

  if (move.kind === 'pass') {
    const next = nextTurn(state);
    log.push({ kind: 'turn', playerId: next });
    return {
      ...state,
      dice: null,
      rolledThisTurn: false,
      consecutiveSixes: 0,
      currentTurn: next,
      lastActivityAt: opts.now,
      log,
    };
  }

  // move.kind === 'move'
  const tokens = state.tokens[playerId]!;
  const tokenIdx = tokens.findIndex((t) => t.id === move.tokenId);
  if (tokenIdx < 0) throw new Error(`applyMove: token ${move.tokenId} not owned by ${playerId}`);
  const token = tokens[tokenIdx]!;
  const projected = projectMove(token, dice);
  if (projected == null) throw new Error('applyMove: illegal move');

  const newToken: Token = { ...token, position: projected };
  const newTokens: Record<string, Token[]> = { ...state.tokens };
  newTokens[playerId] = tokens.map((t, i) => (i === tokenIdx ? newToken : t));

  let captured = false;
  if (projected.kind === 'path' && projected.index <= 50) {
    const myAbs = trackAbsolute(token.color, projected.index);
    for (const otherId of Object.keys(newTokens)) {
      if (otherId === playerId) continue;
      newTokens[otherId] = newTokens[otherId]!.map((victim) => {
        if (isCapturable(token.color, myAbs, victim)) {
          captured = true;
          log.push({
            kind: 'captured',
            capturer: playerId,
            victim: victim.owner,
            tokenId: victim.id,
          });
          return { ...victim, position: { kind: 'home' } };
        }
        return victim;
      });
    }
  }

  log.push({
    kind: 'moved',
    playerId,
    tokenId: token.id,
    from: token.position,
    to: projected,
  });

  // Extra turn on a 6 OR on a capture
  const grantsExtra = dice === 6 || captured;
  const next = grantsExtra ? playerId : nextTurn(state);
  if (next !== playerId) log.push({ kind: 'turn', playerId: next });

  return {
    ...state,
    tokens: newTokens,
    dice: null,
    rolledThisTurn: false,
    consecutiveSixes: dice === 6 ? state.consecutiveSixes + 1 : 0,
    currentTurn: next,
    lastActivityAt: opts.now,
    log,
  };
}
```

- [ ] **Step 3: Run tests; commit**

```bash
pnpm --filter @ludo/game-logic test
git add -A
git commit -m "feat(game-logic): applyMove with capture, safe squares, finish"
```

---

## Task 1.8: Roll dice and win condition

**Files:**
- Modify: `packages/game-logic/src/moves.ts`
- Create: `packages/game-logic/tests/win.test.ts`
- Create: `packages/game-logic/src/dice.ts`

- [ ] **Step 1: Add `applyRoll` and `isWin` failing tests**

`packages/game-logic/tests/win.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, startGame, applyRoll, applyMove, isWin, type GameState, type Player } from '../src/index';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: false, isHost: false, connected: true },
];
const fresh = () => startGame(createInitialState({ code: 'X', players, now: 0 }), { now: 1 });

const setAllTokens = (s: GameState, pid: string, idx: any[]): GameState => ({
  ...s,
  tokens: {
    ...s.tokens,
    [pid]: s.tokens[pid]!.map((t, i) => ({ ...t, position: idx[i] })),
  },
});

describe('applyRoll', () => {
  it('records dice and marks rolled', () => {
    const s = applyRoll(fresh(), 4, { now: 5 });
    expect(s.dice).toBe(4);
    expect(s.rolledThisTurn).toBe(true);
    expect(s.log.some((e) => e.kind === 'rolled')).toBe(true);
  });

  it('refuses double-roll within a turn', () => {
    const s = applyRoll(fresh(), 4, { now: 5 });
    expect(() => applyRoll(s, 6, { now: 6 })).toThrow();
  });
});

describe('isWin / finishing', () => {
  it('moving the last token to 56 wins the game', () => {
    let s = fresh();
    s = setAllTokens(s, 'a', [
      { kind: 'path', index: 56 },
      { kind: 'path', index: 56 },
      { kind: 'path', index: 56 },
      { kind: 'path', index: 53 }, // last one, 3 from finish
    ]);
    s = applyRoll(s, 3, { now: 5 });
    s = applyMove(s, { kind: 'move', tokenId: 'red-3' }, { now: 6 });
    expect(s.status).toBe('finished');
    expect(s.winner).toBe('a');
    expect(isWin(s, 'a')).toBe(true);
  });
});
```

- [ ] **Step 2: Implement**

In `packages/game-logic/src/moves.ts`, add:

```ts
export function applyRoll(state: GameState, value: number, opts: { now: number }): GameState {
  if (state.status !== 'playing') throw new Error('applyRoll: not playing');
  if (state.rolledThisTurn) throw new Error('applyRoll: already rolled this turn');
  if (value < 1 || value > 6) throw new Error('applyRoll: value out of range');
  return {
    ...state,
    dice: value,
    rolledThisTurn: true,
    lastActivityAt: opts.now,
    log: [...state.log, { kind: 'rolled', playerId: state.currentTurn!, value }],
  };
}

export function isWin(state: GameState, playerId: string): boolean {
  const tokens = state.tokens[playerId];
  if (!tokens) return false;
  return tokens.every((t) => t.position.kind === 'path' && t.position.index === 56);
}
```

Then in the `applyMove` function, **before** the `next = ...` line, add:

```ts
  // Win check
  if (isWin({ ...state, tokens: newTokens } as GameState, playerId)) {
    log.push({ kind: 'won', playerId });
    return {
      ...state,
      tokens: newTokens,
      dice: null,
      rolledThisTurn: false,
      consecutiveSixes: 0,
      currentTurn: null,
      status: 'finished',
      winner: playerId,
      lastActivityAt: opts.now,
      log,
    };
  }
```

- [ ] **Step 3: Server-side dice in `packages/game-logic/src/dice.ts`**

```ts
import { randomInt } from 'node:crypto';
export const rollDie = (): number => randomInt(1, 7);
```

This is fine to live in game-logic because Node's crypto is available in modern runtimes; for the browser path we won't import dice at all (server is authoritative).

- [ ] **Step 4: Update index, run tests, commit**

```ts
// packages/game-logic/src/index.ts
export * from './types';
export * from './board';
export * from './state';
export * from './moves';
export * from './dice';
```

```bash
pnpm --filter @ludo/game-logic test
git add -A
git commit -m "feat(game-logic): applyRoll, isWin, dice"
```

---

## Task 1.9: Bot heuristic (pure)

**Files:**
- Create: `packages/game-logic/src/bot.ts`
- Create: `packages/game-logic/tests/bot.test.ts`

**Heuristic:** If any move captures, take the one capturing the most. Otherwise, leave home if possible. Otherwise, advance the token furthest along the path (closer to finish).

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, startGame, applyRoll, chooseBotMove, type Player, type GameState } from '../src/index';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: true,  isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: false, isHost: false, connected: true },
];

const fresh = () => startGame(createInitialState({ code: 'X', players, now: 0 }), { now: 1 });

const setToken = (s: GameState, pid: string, idx: number, pos: any) => ({
  ...s,
  tokens: { ...s.tokens, [pid]: s.tokens[pid]!.map((t, i) => i === idx ? { ...t, position: pos } : t) },
});

describe('chooseBotMove', () => {
  it('passes when no legal move exists', () => {
    const s = applyRoll(fresh(), 3, { now: 5 });
    expect(chooseBotMove(s)).toEqual({ kind: 'pass' });
  });

  it('prefers a capture over advancing', () => {
    let s = fresh();
    s = setToken(s, 'a', 0, { kind: 'path', index: 12 }); // red at abs 12
    s = setToken(s, 'a', 1, { kind: 'path', index: 30 }); // red further along
    s = setToken(s, 'b', 0, { kind: 'path', index: 5 });  // green at abs 18
    s = applyRoll(s, 6, { now: 5 });
    // Roll 6: red-0 +6 → pathIndex 18 → abs 18 (captures green-0). red-1 +6 → pathIndex 36 (no capture, no safe).
    const m = chooseBotMove(s);
    expect(m).toEqual({ kind: 'move', tokenId: 'red-0' });
  });

  it('with no capture available, leaves home if rolled a 6', () => {
    const s = applyRoll(fresh(), 6, { now: 5 });
    const m = chooseBotMove(s);
    expect(m.kind).toBe('move');
    if (m.kind === 'move') expect(m.tokenId).toMatch(/^red-/);
  });

  it('advances furthest token when no capture and no leave-home option', () => {
    let s = fresh();
    s = setToken(s, 'a', 0, { kind: 'path', index: 5 });
    s = setToken(s, 'a', 1, { kind: 'path', index: 20 }); // furthest
    s = applyRoll(s, 3, { now: 5 });
    expect(chooseBotMove(s)).toEqual({ kind: 'move', tokenId: 'red-1' });
  });
});
```

- [ ] **Step 2: Implement `packages/game-logic/src/bot.ts`**

```ts
import type { GameState, Move } from './types';
import { legalMoves, projectMove } from './moves';
import { trackAbsolute, SAFE_ABSOLUTE_SQUARES } from './board';

const moveScore = (state: GameState, move: Move): number => {
  if (move.kind === 'pass') return -100;
  const playerId = state.currentTurn!;
  const myToken = state.tokens[playerId]!.find((t) => t.id === move.tokenId)!;
  const proj = projectMove(myToken, state.dice!);
  if (!proj || proj.kind !== 'path') return 0;

  let score = 0;
  // Captures: +1000 plus 100 per captured token
  if (proj.index <= 50) {
    const myAbs = trackAbsolute(myToken.color, proj.index);
    if (!SAFE_ABSOLUTE_SQUARES.has(myAbs)) {
      let caps = 0;
      for (const otherId of Object.keys(state.tokens)) {
        if (otherId === playerId) continue;
        for (const v of state.tokens[otherId]!) {
          if (v.position.kind !== 'path' || v.position.index > 50) continue;
          if (trackAbsolute(v.color, v.position.index) === myAbs) caps++;
        }
      }
      if (caps > 0) score += 1000 + caps * 100;
    }
  }

  // Leave-home bonus
  if (myToken.position.kind === 'home' && proj.kind === 'path' && proj.index === 0) {
    score += 50;
  }

  // Approaching finish: progress * 1
  score += proj.index;
  return score;
};

export function chooseBotMove(state: GameState): Move {
  const playerId = state.currentTurn;
  if (!playerId) return { kind: 'pass' };
  const moves = legalMoves(state, playerId);
  if (moves.length === 0) return { kind: 'pass' };
  let best = moves[0]!;
  let bestScore = moveScore(state, best);
  for (const m of moves.slice(1)) {
    const s = moveScore(state, m);
    if (s > bestScore) { best = m; bestScore = s; }
  }
  return best;
}
```

- [ ] **Step 3: Export, test, commit**

```ts
// packages/game-logic/src/index.ts — add
export * from './bot';
```

```bash
pnpm --filter @ludo/game-logic test
git add -A
git commit -m "feat(game-logic): bot heuristic"
```

---

## Task 1.10: End-to-end game-logic smoke test

**Files:**
- Create: `packages/game-logic/tests/end-to-end.test.ts`

This proves you can play a complete game using nothing but the pure module — the spec's "you should be able to write a test that runs a full game by importing only `game-logic`."

- [ ] **Step 1: Write smoke test**

```ts
import { describe, it, expect } from 'vitest';
import {
  createInitialState, startGame, applyRoll, applyMove, chooseBotMove,
  type Player,
} from '../src/index';

describe('full game smoke test', () => {
  it('two bots play to a winner with deterministic dice', () => {
    const players: Player[] = [
      { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: true,  isHost: true,  connected: true },
      { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: true,  isHost: false, connected: true },
    ];
    let s = startGame(createInitialState({ code: 'X', players, now: 0 }), { now: 1 });

    // Deterministic dice: rotate 6,4,2,5,3,1 forever
    const seq = [6, 4, 2, 5, 3, 1];
    let i = 0;
    let safetyMaxTurns = 5000;
    while (s.status === 'playing' && safetyMaxTurns-- > 0) {
      s = applyRoll(s, seq[i++ % seq.length]!, { now: i });
      const move = chooseBotMove(s);
      s = applyMove(s, move, { now: i });
    }
    expect(s.status).toBe('finished');
    expect(s.winner === 'a' || s.winner === 'b').toBe(true);
  });
});
```

- [ ] **Step 2: Run, commit**

```bash
pnpm --filter @ludo/game-logic test
git add -A
git commit -m "test(game-logic): end-to-end smoke"
```

If the smoke test stalls, raise `safetyMaxTurns` first; if it still stalls there's a bug in turn rotation / win detection — fix before moving on.

---

# Phase 2: Static Board UI

Now we build the Next.js client and render a `GameState`. No interaction wiring yet — pure visual.

## Task 2.1: Initialize Next.js app

**Files:**
- Create: `apps/web/` (via `create-next-app`)

- [ ] **Step 1: Scaffold**

```bash
cd apps
pnpm create next-app@latest web --typescript --tailwind --app --eslint --src-dir --no-import-alias --use-pnpm
cd ..
```

When prompted, choose: TypeScript yes, ESLint yes, Tailwind yes, `src/` yes, App Router yes, Turbopack default.

- [ ] **Step 2: Edit `apps/web/package.json`**

Set name to `@ludo/web` and add `@ludo/game-logic` as a workspace dep:

```json
{
  "name": "@ludo/web",
  "dependencies": {
    "@ludo/game-logic": "workspace:*",
    "next": "...",
    "react": "...",
    "react-dom": "..."
  }
}
```

Add scripts (keep existing):
```json
"typecheck": "tsc --noEmit",
"test": "vitest run"
```

- [ ] **Step 3: Update `apps/web/tsconfig.json` to extend base**

Replace `compilerOptions.target/module` with extension:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "paths": { "@/*": ["./src/*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Verify dev server starts and the home page renders**

```bash
pnpm install
pnpm dev:web
```

Open http://localhost:3000. Expected: default Next.js welcome page.

- [ ] **Step 5: Replace `apps/web/src/app/page.tsx` with placeholder**

```tsx
export default function Home() {
  return <main className="p-8 text-2xl font-bold">Ludo (placeholder)</main>;
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): scaffold Next.js app"
```

---

## Task 2.2: Cozy theme (Tailwind config)

**Files:**
- Modify: `apps/web/tailwind.config.ts`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Set Tailwind theme**

`apps/web/tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cozy & warm pastel palette
        paper:   '#fdf6ec',
        ink:     '#3a2e1f',
        rust:    '#c97a7a',  // red token
        sage:    '#7eaa83',  // green token
        sky:     '#7d9ec5',  // blue token
        honey:   '#d8b86a',  // yellow token
        wood:    '#b89c5a',
        edge:    '#c8b18a',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        cell: '10px',
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 2: Update `apps/web/src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

html, body { background: theme(colors.paper); color: theme(colors.ink); }

/* Use dynamic viewport height where available so iOS Safari doesn't hide content under the address bar. */
.h-screen-d { height: 100vh; height: 100dvh; }
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(web): cozy pastel Tailwind theme"
```

---

## Task 2.3: Board layout module

The board is a 15×15 grid (classic Ludo). We need a module that, given a `GameState`, can answer "where on the board does this token render?" in (col, row) cells.

**Files:**
- Create: `apps/web/src/lib/boardLayout.ts`
- Create: `apps/web/src/lib/__tests__/boardLayout.test.ts`
- Create: `apps/web/vitest.config.ts`

- [ ] **Step 1: Vitest config**

```ts
// apps/web/vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['src/**/__tests__/**/*.test.ts?(x)'], environment: 'jsdom' },
});
```

Add `pnpm add -D jsdom @types/react @testing-library/react @testing-library/jest-dom -F @ludo/web`.

- [ ] **Step 2: Implement `boardLayout.ts`**

```ts
import type { Color, Token } from '@ludo/game-logic';
import { trackAbsolute } from '@ludo/game-logic';

export type Cell = { col: number; row: number };

/**
 * 15×15 grid coordinates (0,0 top-left). Track squares in clockwise order, starting at red's
 * spawn just below the cross arm on the left. This is one canonical Ludo layout.
 *
 * Square 0 = red's launch cell. Going clockwise around the cross.
 */
const TRACK: Cell[] = [
  // top arm down (red's column, going right then down through the middle)
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
  { col: 0, row: 7 },
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
```

- [ ] **Step 3: Smoke test the layout**

`apps/web/src/lib/__tests__/boardLayout.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { tokenCell, BOARD_TRACK, CENTER } from '../boardLayout';

describe('boardLayout', () => {
  it('has 52 track cells, all unique', () => {
    expect(BOARD_TRACK).toHaveLength(52);
    const keys = new Set(BOARD_TRACK.map((c) => `${c.col},${c.row}`));
    expect(keys.size).toBe(52);
  });

  it('renders home tokens at their colored corner slots', () => {
    expect(tokenCell({ id: 'red-0', owner: 'a', color: 'red', position: { kind: 'home' } } as any))
      .toEqual({ col: 1, row: 1 });
  });

  it('renders a finished token in the center', () => {
    expect(tokenCell({ id: 'red-0', owner: 'a', color: 'red', position: { kind: 'path', index: 56 } } as any))
      .toEqual(CENTER);
  });
});
```

- [ ] **Step 4: Run, commit**

```bash
pnpm --filter @ludo/web test
git add -A
git commit -m "feat(web): board coordinate layout"
```

---

## Task 2.4: Board component (SVG)

**Files:**
- Create: `apps/web/src/components/Board.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';
import type { GameState, Color, Token } from '@ludo/game-logic';
import {
  BOARD_TRACK, BOARD_HOME_SLOTS, BOARD_FINAL_RUN, CENTER, tokenCell,
} from '@/lib/boardLayout';
import { SAFE_ABSOLUTE_SQUARES } from '@ludo/game-logic';

const CELL = 36;     // base cell size in SVG units
const SIZE = CELL * 15;

const colorFill: Record<Color, string> = {
  red: '#e8a3a3', green: '#a3c9a8', yellow: '#f0d896', blue: '#a3b8d6',
};
const colorStroke: Record<Color, string> = {
  red: '#a17070', green: '#6a8c70', yellow: '#b89c5a', blue: '#6f88aa',
};

export function Board({ state, onTokenClick, hintTokenIds }: {
  state: GameState;
  onTokenClick?: (tokenId: string) => void;
  hintTokenIds?: ReadonlySet<string>;
}) {
  const allTokens: Token[] = Object.values(state.tokens).flat();
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-[640px] aspect-square select-none"
      role="img"
      aria-label="Ludo board"
    >
      {/* Outer frame */}
      <rect x={0} y={0} width={SIZE} height={SIZE} rx={14} fill="#fdf6ec" stroke="#8b6f47" strokeWidth={2}/>

      {/* Color quadrants */}
      <rect x={0}            y={0}            width={CELL*6} height={CELL*6} fill={colorFill.red}    rx={10}/>
      <rect x={CELL*9}       y={0}            width={CELL*6} height={CELL*6} fill={colorFill.green}  rx={10}/>
      <rect x={CELL*9}       y={CELL*9}       width={CELL*6} height={CELL*6} fill={colorFill.yellow} rx={10}/>
      <rect x={0}            y={CELL*9}       width={CELL*6} height={CELL*6} fill={colorFill.blue}   rx={10}/>

      {/* Track squares */}
      {BOARD_TRACK.map((c, abs) => (
        <rect
          key={`tr-${abs}`}
          x={c.col*CELL+1} y={c.row*CELL+1}
          width={CELL-2} height={CELL-2}
          rx={6}
          fill={SAFE_ABSOLUTE_SQUARES.has(abs) ? '#fef3c7' : '#fff'}
          stroke="#c8b18a" strokeWidth={1}
        />
      ))}

      {/* Final-run lanes (color tinted) */}
      {(['red','green','yellow','blue'] as const).map((color) => (
        BOARD_FINAL_RUN[color].map((c, i) => (
          <rect key={`fr-${color}-${i}`}
            x={c.col*CELL+1} y={c.row*CELL+1}
            width={CELL-2} height={CELL-2}
            rx={6}
            fill={colorFill[color]} stroke={colorStroke[color]} strokeWidth={1} opacity={0.85}
          />
        ))
      ))}

      {/* Center finish */}
      <polygon points={`${CENTER.col*CELL},${CENTER.row*CELL} ${(CENTER.col+1)*CELL},${CENTER.row*CELL} ${(CENTER.col+0.5)*CELL},${(CENTER.row+0.5)*CELL}`} fill={colorFill.red} stroke={colorStroke.red}/>
      <polygon points={`${(CENTER.col+1)*CELL},${CENTER.row*CELL} ${(CENTER.col+1)*CELL},${(CENTER.row+1)*CELL} ${(CENTER.col+0.5)*CELL},${(CENTER.row+0.5)*CELL}`} fill={colorFill.green} stroke={colorStroke.green}/>
      <polygon points={`${(CENTER.col+1)*CELL},${(CENTER.row+1)*CELL} ${CENTER.col*CELL},${(CENTER.row+1)*CELL} ${(CENTER.col+0.5)*CELL},${(CENTER.row+0.5)*CELL}`} fill={colorFill.yellow} stroke={colorStroke.yellow}/>
      <polygon points={`${CENTER.col*CELL},${(CENTER.row+1)*CELL} ${CENTER.col*CELL},${CENTER.row*CELL} ${(CENTER.col+0.5)*CELL},${(CENTER.row+0.5)*CELL}`} fill={colorFill.blue} stroke={colorStroke.blue}/>

      {/* Home circles (the 4 nests) */}
      {(['red','green','yellow','blue'] as const).map((color) => (
        BOARD_HOME_SLOTS[color].map((c, i) => (
          <circle key={`hs-${color}-${i}`}
            cx={c.col*CELL + CELL/2} cy={c.row*CELL + CELL/2}
            r={CELL*0.45}
            fill="#fff" stroke={colorStroke[color]} strokeWidth={1.5}/>
        ))
      ))}

      {/* Tokens */}
      {allTokens.map((t) => {
        const c = tokenCell(t);
        const cx = c.col*CELL + CELL/2;
        const cy = c.row*CELL + CELL/2;
        const isHinted = hintTokenIds?.has(t.id);
        return (
          <g key={t.id}
             onClick={onTokenClick ? () => onTokenClick(t.id) : undefined}
             style={{ cursor: onTokenClick ? 'pointer' : 'default' }}
          >
            {/* extended invisible hit-area for mobile */}
            <circle cx={cx} cy={cy} r={CELL*0.7} fill="transparent" />
            <circle
              cx={cx} cy={cy} r={CELL*0.32}
              fill={colorFill[t.color]} stroke={colorStroke[t.color]} strokeWidth={2}
            />
            {isHinted && (
              <circle cx={cx} cy={cy} r={CELL*0.42} fill="none" stroke="#3a2e1f" strokeWidth={2}
                strokeDasharray="4 3">
                <animate attributeName="stroke-dashoffset" from="0" to="14" dur="0.8s" repeatCount="indefinite"/>
              </circle>
            )}
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Mount on home page for visual check**

`apps/web/src/app/page.tsx`:
```tsx
import { Board } from '@/components/Board';
import { createInitialState, type Player } from '@ludo/game-logic';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: false, isHost: false, connected: true },
  { id: 'c', name: 'C', avatar: '🐼', color: 'yellow',isBot: true,  isHost: false, connected: true },
  { id: 'd', name: 'D', avatar: '🦁', color: 'blue',  isBot: true,  isHost: false, connected: true },
];

export default function Home() {
  const state = createInitialState({ code: 'DEMO', players, now: 0 });
  return (
    <main className="p-4 flex flex-col items-center gap-4">
      <h1 className="font-display text-2xl">Ludo — board preview</h1>
      <Board state={state} />
    </main>
  );
}
```

- [ ] **Step 3: Visual check on real devices**

```bash
pnpm dev:web
```

Open on a phone (same Wi-Fi: `http://<your-ip>:3000`) and verify:
- Board fills width on portrait phone, no horizontal scroll
- Tokens visible, the four colored quadrants pastel, safe squares cream-tinted
- Pixel-snap looks clean (no half-pixel blurs)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): static board component"
```

---

## Task 2.5: Dice and PlayerPanel components

**Files:**
- Create: `apps/web/src/components/Dice.tsx`
- Create: `apps/web/src/components/PlayerPanel.tsx`

- [ ] **Step 1: Dice**

```tsx
'use client';
const PIPS: Record<number, [number, number][]> = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,1],[0,2],[2,0],[2,1],[2,2]],
};

export function Dice({ value, onRoll, disabled, rolling }: {
  value: number | null;
  onRoll: () => void;
  disabled: boolean;
  rolling?: boolean;
}) {
  return (
    <button
      onClick={onRoll}
      disabled={disabled}
      aria-label="Roll dice"
      className={`w-20 h-20 rounded-2xl bg-white border-2 border-edge shadow-md
        active:scale-95 transition-transform
        disabled:opacity-50 disabled:cursor-not-allowed
        ${rolling ? 'animate-spin' : ''}`}
    >
      <svg viewBox="0 0 60 60" className="w-full h-full p-2">
        {value && PIPS[value]!.map(([r, c], i) => (
          <circle key={i} cx={10 + c*20} cy={10 + r*20} r={5} fill="#3a2e1f"/>
        ))}
        {!value && <text x="30" y="38" textAnchor="middle" fontSize="20">🎲</text>}
      </svg>
    </button>
  );
}
```

- [ ] **Step 2: PlayerPanel**

```tsx
'use client';
import type { GameState } from '@ludo/game-logic';

const colorBg: Record<string, string> = {
  red: 'bg-rust', green: 'bg-sage', yellow: 'bg-honey', blue: 'bg-sky',
};

export function PlayerPanel({ state }: { state: GameState }) {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-[640px]">
      {state.players.map((p) => {
        const finished = state.tokens[p.id]!.filter(
          (t) => t.position.kind === 'path' && t.position.index === 56,
        ).length;
        const turn = state.currentTurn === p.id;
        return (
          <li
            key={p.id}
            className={`rounded-xl p-2 border-2 flex items-center gap-2
              ${turn ? 'border-ink bg-white' : 'border-edge bg-paper'}`}
          >
            <span className={`w-8 h-8 rounded-full ${colorBg[p.color] ?? 'bg-gray-300'} flex items-center justify-center text-lg`}>
              {p.avatar}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{p.name}{p.isBot && ' 🤖'}</div>
              <div className="text-xs opacity-70">{finished}/4 home</div>
            </div>
            {!p.connected && <span title="disconnected">📡</span>}
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 3: Wire to home page for preview**

Replace `apps/web/src/app/page.tsx`:
```tsx
'use client';
import { Board } from '@/components/Board';
import { Dice } from '@/components/Dice';
import { PlayerPanel } from '@/components/PlayerPanel';
import { createInitialState, type Player } from '@ludo/game-logic';

const players: Player[] = [
  { id: 'a', name: 'Mom',  avatar: '🐱', color: 'red',    isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'Dad',  avatar: '🦊', color: 'green',  isBot: false, isHost: false, connected: true },
  { id: 'c', name: 'Bot',  avatar: '🐼', color: 'yellow', isBot: true,  isHost: false, connected: true },
  { id: 'd', name: 'Sara', avatar: '🦁', color: 'blue',   isBot: false, isHost: false, connected: false },
];

export default function Home() {
  const state = { ...createInitialState({ code: 'DEMO', players, now: 0 }), status: 'playing' as const, currentTurn: 'a' };
  return (
    <main className="min-h-screen-d flex flex-col items-center gap-4 p-4 pb-[calc(1rem+var(--safe-bottom))]">
      <PlayerPanel state={state} />
      <Board state={state} />
      <div className="fixed bottom-4 right-4">
        <Dice value={null} onRoll={() => {}} disabled={false} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Mobile preview, commit**

```bash
git add -A
git commit -m "feat(web): dice and player panel"
```

---

# Phase 3: Local Single-Player Prototype

This is a stop-gap that proves the gameplay loop is fun before networking. Pure browser, no server.

## Task 3.1: Local game store (zustand)

**Files:**
- Create: `apps/web/src/lib/localGame.ts`

- [ ] **Step 1: Add zustand**

```bash
pnpm add zustand -F @ludo/web
```

- [ ] **Step 2: Implement store**

```ts
'use client';
import { create } from 'zustand';
import {
  createInitialState, startGame, applyRoll, applyMove, chooseBotMove,
  type GameState, type Player, type Move,
} from '@ludo/game-logic';

const seedPlayers = (): Player[] => ([
  { id: 'me',   name: 'You',  avatar: '🐱', color: 'red',    isBot: false, isHost: true,  connected: true },
  { id: 'bot1', name: 'Bot 1',avatar: '🐻', color: 'green',  isBot: true,  isHost: false, connected: true },
  { id: 'bot2', name: 'Bot 2',avatar: '🦊', color: 'yellow', isBot: true,  isHost: false, connected: true },
]);

const rollDie = () => 1 + Math.floor(Math.random() * 6);

type LocalGame = {
  state: GameState;
  reset: () => void;
  roll: () => void;
  play: (move: Move) => void;
};

export const useLocalGame = create<LocalGame>((set, get) => ({
  state: startGame(createInitialState({ code: 'LOCAL', players: seedPlayers(), now: Date.now() }), { now: Date.now() }),
  reset: () => set({
    state: startGame(createInitialState({ code: 'LOCAL', players: seedPlayers(), now: Date.now() }), { now: Date.now() }),
  }),
  roll: () => {
    const s = get().state;
    if (s.rolledThisTurn || s.status !== 'playing' || s.currentTurn === null) return;
    const v = rollDie();
    set({ state: applyRoll(s, v, { now: Date.now() }) });
    // If bot, schedule its move
    setTimeout(() => maybeBotPlay(set, get), 700);
  },
  play: (move) => {
    set({ state: applyMove(get().state, move, { now: Date.now() }) });
    setTimeout(() => maybeBotPlay(set, get), 700);
  },
}));

function maybeBotPlay(
  set: (s: Partial<LocalGame>) => void,
  get: () => LocalGame,
) {
  const s = get().state;
  if (s.status !== 'playing' || !s.currentTurn) return;
  const cur = s.players.find((p) => p.id === s.currentTurn);
  if (!cur?.isBot) return;
  if (!s.rolledThisTurn) {
    set({ state: applyRoll(s, 1 + Math.floor(Math.random() * 6), { now: Date.now() }) });
    setTimeout(() => maybeBotPlay(set, get), 700);
    return;
  }
  const move = chooseBotMove(get().state);
  set({ state: applyMove(get().state, move, { now: Date.now() }) });
  setTimeout(() => maybeBotPlay(set, get), 700);
}
```

- [ ] **Step 3: Wire `apps/web/src/app/page.tsx` to the store**

```tsx
'use client';
import { Board } from '@/components/Board';
import { Dice } from '@/components/Dice';
import { PlayerPanel } from '@/components/PlayerPanel';
import { useLocalGame } from '@/lib/localGame';
import { legalMoves } from '@ludo/game-logic';
import { useMemo } from 'react';

export default function Home() {
  const { state, roll, play, reset } = useLocalGame();
  const myId = 'me';
  const myTurn = state.currentTurn === myId;
  const moves = useMemo(() => legalMoves(state, myId), [state]);
  const hint = useMemo(() => new Set(moves.flatMap((m) => m.kind === 'move' ? [m.tokenId] : [])), [moves]);

  return (
    <main className="min-h-screen-d flex flex-col items-center gap-4 p-4 pb-[calc(7rem+var(--safe-bottom))]">
      <header className="w-full max-w-[640px] flex items-center justify-between">
        <h1 className="font-display text-xl">Ludo (local)</h1>
        <button className="text-sm underline" onClick={reset}>New game</button>
      </header>
      <PlayerPanel state={state} />
      <Board
        state={state}
        hintTokenIds={myTurn ? hint : undefined}
        onTokenClick={myTurn ? (id) => {
          if (moves.find((m) => m.kind === 'move' && m.tokenId === id)) {
            play({ kind: 'move', tokenId: id });
          }
        } : undefined}
      />
      <div className="fixed inset-x-0 bottom-0 px-4 pb-[calc(1rem+var(--safe-bottom))] pt-3 bg-paper border-t border-edge flex items-center justify-between">
        <div className="text-sm">
          {state.status === 'finished'
            ? `🏆 ${state.players.find((p) => p.id === state.winner)?.name} wins!`
            : myTurn
              ? state.dice ? `Pick a token (rolled ${state.dice})` : 'Your turn — roll!'
              : `Waiting on ${state.players.find((p) => p.id === state.currentTurn)?.name}`}
        </div>
        <Dice
          value={state.dice}
          disabled={!myTurn || state.rolledThisTurn || state.status !== 'playing'}
          onRoll={roll}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Manual test on mobile**

```bash
pnpm dev:web
```

Verify:
- You can roll, click a hinted token, captures animate (no animations yet, just instant moves OK)
- Bots take their turns automatically with a small delay
- Game eventually ends with a winner banner

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): local single-player prototype against bots"
```

---

# Phase 4: WebSocket Server

Now the authoritative server. Same `game-logic` module, plus room management and WebSocket transport.

## Task 4.1: Initialize server package

**Files:**
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/src/index.ts`
- Create: `apps/server/vitest.config.ts`

- [ ] **Step 1: package.json**

```json
{
  "name": "@ludo/server",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "echo skip"
  },
  "dependencies": {
    "@ludo/game-logic": "workspace:*",
    "ws": "8",
    "zod": "3"
  },
  "devDependencies": {
    "@types/ws": "8",
    "tsx": "4",
    "typescript": "5.5",
    "vitest": "2"
  }
}
```

- [ ] **Step 2: tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false,
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node' } });
```

- [ ] **Step 4: Empty index**

```ts
// src/index.ts
export {};
```

- [ ] **Step 5: Install, commit**

```bash
pnpm install
git add -A
git commit -m "feat(server): scaffold package"
```

---

## Task 4.2: Room manager (in-memory)

**Files:**
- Create: `apps/server/src/rooms.ts`
- Create: `apps/server/tests/rooms.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest';
import { RoomManager } from '../src/rooms';

describe('RoomManager', () => {
  it('creates a room with a unique 4-letter uppercase code', () => {
    const m = new RoomManager(() => 1000);
    const code = m.createRoom({ hostId: 'h', hostName: 'Host', hostAvatar: '🐱' });
    expect(code).toMatch(/^[A-Z]{4}$/);
    const r = m.getRoom(code);
    expect(r?.state.players[0]!.name).toBe('Host');
    expect(r?.state.status).toBe('lobby');
  });

  it('lets a second player join in lobby and pick a free color', () => {
    const m = new RoomManager(() => 1000);
    const code = m.createRoom({ hostId: 'h', hostName: 'Host', hostAvatar: '🐱' });
    m.join(code, { playerId: 'g', name: 'Guest', avatar: '🦊' });
    const r = m.getRoom(code);
    expect(r?.state.players).toHaveLength(2);
    // 4 colors and host took red, guest gets next: green
    expect(r?.state.players[1]!.color).toBe('green');
  });

  it('refuses to seat a 5th player', () => {
    const m = new RoomManager(() => 1000);
    const code = m.createRoom({ hostId: 'h', hostName: 'H', hostAvatar: '🐱' });
    for (const id of ['a', 'b', 'c']) m.join(code, { playerId: id, name: id, avatar: '🐱' });
    expect(() => m.join(code, { playerId: 'e', name: 'e', avatar: '🐱' })).toThrow();
  });

  it('reusing a playerId reclaims the seat', () => {
    const m = new RoomManager(() => 1000);
    const code = m.createRoom({ hostId: 'h', hostName: 'Host', hostAvatar: '🐱' });
    m.markDisconnected(code, 'h');
    m.join(code, { playerId: 'h', name: 'Host', avatar: '🐱' });
    expect(m.getRoom(code)?.state.players[0]!.connected).toBe(true);
  });
});
```

- [ ] **Step 2: Implement `apps/server/src/rooms.ts`**

```ts
import {
  createInitialState, startGame, applyRoll, applyMove, chooseBotMove,
  COLORS, type Color, type GameState, type Move, type Player,
} from '@ludo/game-logic';

export type Room = {
  code: string;
  state: GameState;
  /** Map of playerId → set of socket "send" callbacks */
  listeners: Map<string, Set<(s: GameState) => void>>;
};

const code4 = (): string => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // skip I/O for legibility
  let s = '';
  for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
};

export class RoomManager {
  private rooms = new Map<string, Room>();
  constructor(private now: () => number = () => Date.now()) {}

  createRoom(args: { hostId: string; hostName: string; hostAvatar: string }): string {
    let code = code4();
    while (this.rooms.has(code)) code = code4();
    const host: Player = {
      id: args.hostId, name: args.hostName, avatar: args.hostAvatar,
      color: 'red', isBot: false, isHost: true, connected: true,
    };
    const state = createInitialState({ code, players: [host], now: this.now() });
    this.rooms.set(code, { code, state, listeners: new Map() });
    return code;
  }

  getRoom(code: string): Room | undefined { return this.rooms.get(code); }

  private nextFreeColor(state: GameState): Color {
    const used = new Set(state.players.map((p) => p.color));
    return COLORS.find((c) => !used.has(c))!;
  }

  join(code: string, args: { playerId: string; name: string; avatar: string }): GameState {
    const r = this.rooms.get(code);
    if (!r) throw new Error('ROOM_NOT_FOUND');
    const existing = r.state.players.findIndex((p) => p.id === args.playerId);
    if (existing >= 0) {
      r.state = {
        ...r.state,
        players: r.state.players.map((p, i) => i === existing ? { ...p, connected: true, name: args.name, avatar: args.avatar } : p),
        lastActivityAt: this.now(),
      };
      return r.state;
    }
    if (r.state.status !== 'lobby') throw new Error('GAME_IN_PROGRESS');
    if (r.state.players.length >= 4) throw new Error('ROOM_FULL');
    const color = this.nextFreeColor(r.state);
    const player: Player = {
      id: args.playerId, name: args.name, avatar: args.avatar,
      color, isBot: false, isHost: false, connected: true,
    };
    const tokens = { ...r.state.tokens };
    tokens[player.id] = Array.from({ length: 4 }, (_, i) => ({
      id: `${color}-${i}`, owner: player.id, color, position: { kind: 'home' as const },
    }));
    r.state = { ...r.state, players: [...r.state.players, player], tokens, lastActivityAt: this.now() };
    return r.state;
  }

  addBot(code: string, hostId: string): GameState {
    const r = this.rooms.get(code);
    if (!r) throw new Error('ROOM_NOT_FOUND');
    const host = r.state.players.find((p) => p.id === hostId);
    if (!host?.isHost) throw new Error('NOT_HOST');
    if (r.state.status !== 'lobby') throw new Error('GAME_IN_PROGRESS');
    if (r.state.players.length >= 4) throw new Error('ROOM_FULL');
    const color = this.nextFreeColor(r.state);
    const bot: Player = {
      id: `bot-${color}`, name: `Bot ${color}`, avatar: '🤖',
      color, isBot: true, isHost: false, connected: true,
    };
    const tokens = { ...r.state.tokens };
    tokens[bot.id] = Array.from({ length: 4 }, (_, i) => ({
      id: `${color}-${i}`, owner: bot.id, color, position: { kind: 'home' as const },
    }));
    r.state = { ...r.state, players: [...r.state.players, bot], tokens, lastActivityAt: this.now() };
    return r.state;
  }

  start(code: string, hostId: string): GameState {
    const r = this.rooms.get(code);
    if (!r) throw new Error('ROOM_NOT_FOUND');
    const host = r.state.players.find((p) => p.id === hostId);
    if (!host?.isHost) throw new Error('NOT_HOST');
    r.state = startGame(r.state, { now: this.now() });
    return r.state;
  }

  markDisconnected(code: string, playerId: string) {
    const r = this.rooms.get(code);
    if (!r) return;
    r.state = {
      ...r.state,
      players: r.state.players.map((p) => p.id === playerId ? { ...p, connected: false } : p),
      lastActivityAt: this.now(),
    };
  }

  roll(code: string, playerId: string, value: number): GameState {
    const r = this.rooms.get(code);
    if (!r) throw new Error('ROOM_NOT_FOUND');
    if (r.state.currentTurn !== playerId) throw new Error('NOT_YOUR_TURN');
    r.state = applyRoll(r.state, value, { now: this.now() });
    return r.state;
  }

  move(code: string, playerId: string, move: Move): GameState {
    const r = this.rooms.get(code);
    if (!r) throw new Error('ROOM_NOT_FOUND');
    if (r.state.currentTurn !== playerId) throw new Error('NOT_YOUR_TURN');
    r.state = applyMove(r.state, move, { now: this.now() });
    return r.state;
  }

  chooseBotMove = chooseBotMove;
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm --filter @ludo/server test
git add -A
git commit -m "feat(server): RoomManager"
```

---

## Task 4.3: WebSocket transport + protocol

**Files:**
- Create: `apps/server/src/protocol.ts`
- Create: `apps/server/src/wsServer.ts`
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Define schemas (zod)**

`apps/server/src/protocol.ts`:
```ts
import { z } from 'zod';

export const ClientMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('join'),       code: z.string(), playerId: z.string(), name: z.string(), avatar: z.string() }),
  z.object({ type: z.literal('addBot') }),
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('roll') }),
  z.object({ type: z.literal('move'),       tokenId: z.string() }),
  z.object({ type: z.literal('pass') }),
  z.object({ type: z.literal('leave') }),
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

export type ServerMessage =
  | { type: 'state'; state: unknown }
  | { type: 'error'; code: string; message: string };
```

- [ ] **Step 2: WS server**

`apps/server/src/wsServer.ts`:
```ts
import { WebSocketServer, WebSocket } from 'ws';
import { ClientMessage, type ServerMessage } from './protocol.js';
import { RoomManager } from './rooms.js';
import { rollDie, legalMoves } from '@ludo/game-logic';

/**
 * Attaches a WebSocket server to an existing http.Server so HTTP and WS share one port.
 * This is required for Coolify/Traefik deployment (one port per Coolify service).
 */
export function attachWsServer(httpServer: import('http').Server, mgr = new RoomManager()) {
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on('upgrade', (req, sock, head) => {
    wss.handleUpgrade(req, sock, head, (ws) => wss.emit('connection', ws, req));
  });

  // socket → { code, playerId }
  const ctx = new WeakMap<WebSocket, { code: string; playerId: string }>();
  // (code, playerId) → socket  (for broadcasting)
  const sockets = new Map<string, Map<string, WebSocket>>();

  const broadcast = (code: string) => {
    const room = mgr.getRoom(code);
    if (!room) return;
    const msg: ServerMessage = { type: 'state', state: room.state };
    const payload = JSON.stringify(msg);
    sockets.get(code)?.forEach((s) => s.readyState === s.OPEN && s.send(payload));
  };

  const sendError = (s: WebSocket, code: string, message: string) =>
    s.send(JSON.stringify({ type: 'error', code, message } satisfies ServerMessage));

  const handleBotTurns = (code: string) => {
    let room = mgr.getRoom(code);
    while (room && room.state.status === 'playing' && room.state.currentTurn) {
      const cur = room.state.players.find((p) => p.id === room!.state.currentTurn);
      if (!cur?.isBot) break;
      // Bot: roll then move (small artificial delays not added here for the loop simplicity;
      // wrap in setTimeout in the real handler — see below)
      if (!room.state.rolledThisTurn) {
        mgr.roll(code, cur.id, rollDie());
        room = mgr.getRoom(code);
        continue;
      }
      const move = mgr.chooseBotMove(room.state);
      mgr.move(code, cur.id, move);
      room = mgr.getRoom(code);
    }
    broadcast(code);
  };

  wss.on('connection', (socket) => {
    socket.on('message', async (raw) => {
      let parsed: ClientMessage;
      try {
        parsed = ClientMessage.parse(JSON.parse(raw.toString()));
      } catch (e) {
        return sendError(socket, 'BAD_MESSAGE', 'Invalid message');
      }

      try {
        if (parsed.type === 'join') {
          const { code, playerId, name, avatar } = parsed;
          // Auto-create room if empty? No — the "Create" path creates first via HTTP route OR
          // by the very first join if the code doesn't exist. We'll hold "create" to a separate REST
          // endpoint in Task 4.4 to keep concerns split. Here, "join" requires an existing room.
          mgr.join(code, { playerId, name, avatar });
          ctx.set(socket, { code, playerId });
          let bucket = sockets.get(code);
          if (!bucket) { bucket = new Map(); sockets.set(code, bucket); }
          bucket.set(playerId, socket);
          broadcast(code);
          return;
        }
        const c = ctx.get(socket);
        if (!c) return sendError(socket, 'NOT_JOINED', 'Send join first');
        switch (parsed.type) {
          case 'addBot': mgr.addBot(c.code, c.playerId); broadcast(c.code); break;
          case 'start':  mgr.start(c.code, c.playerId);  broadcast(c.code); handleBotTurns(c.code); break;
          case 'roll': {
            mgr.roll(c.code, c.playerId, rollDie());
            broadcast(c.code);
            // If after rolling there's only a forced pass available, auto-pass after a beat
            const room = mgr.getRoom(c.code)!;
            const moves = legalMoves(room.state, c.playerId);
            if (moves.length === 1 && moves[0]!.kind === 'pass') {
              setTimeout(() => { mgr.move(c.code, c.playerId, moves[0]!); broadcast(c.code); handleBotTurns(c.code); }, 600);
            } else {
              handleBotTurns(c.code);
            }
            break;
          }
          case 'move':  mgr.move(c.code, c.playerId, { kind: 'move', tokenId: parsed.tokenId }); broadcast(c.code); handleBotTurns(c.code); break;
          case 'pass':  mgr.move(c.code, c.playerId, { kind: 'pass' }); broadcast(c.code); handleBotTurns(c.code); break;
          case 'leave': /* handled by close */ break;
        }
      } catch (err) {
        sendError(socket, (err as Error).message ?? 'ERROR', String(err));
      }
    });

    socket.on('close', () => {
      const c = ctx.get(socket);
      if (!c) return;
      sockets.get(c.code)?.delete(c.playerId);
      mgr.markDisconnected(c.code, c.playerId);
      broadcast(c.code);
    });
  });

  return { wss, mgr };
}
```

- [ ] **Step 3: Add a tiny HTTP `createRoom` endpoint (in `index.ts`)**

```ts
import http from 'node:http';
import { attachWsServer } from './wsServer.js';
import { RoomManager } from './rooms.js';

const port = Number(process.env.PORT ?? 8787);
const corsOrigin = process.env.CORS_ORIGIN ?? '*';
const mgr = new RoomManager();

const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.end();

  if (req.method === 'POST' && req.url === '/rooms') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { hostId, name, avatar } = JSON.parse(body || '{}');
        if (!hostId || !name) {
          res.statusCode = 400; res.end(JSON.stringify({ error: 'missing fields' })); return;
        }
        const code = mgr.createRoom({ hostId, hostName: name, hostAvatar: avatar ?? '🐱' });
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ code }));
      } catch (err) {
        res.statusCode = 500; res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.end('ok');
    return;
  }
  res.statusCode = 404; res.end();
});

attachWsServer(httpServer, mgr);
httpServer.listen(port, () => console.log(`Ludo server (HTTP + WS) on :${port}`));
```

- [ ] **Step 4: Smoke run**

```bash
pnpm dev:server    # starts HTTP + WS both on :8787
```

```bash
curl -s -XPOST http://localhost:8787/rooms -H 'content-type: application/json' \
  -d '{"hostId":"h1","name":"Host","avatar":"🐱"}'
# → {"code":"ABCD"}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): WebSocket transport + room HTTP create"
```

---

## Task 4.4: Server integration test

**Files:**
- Create: `apps/server/tests/integration.test.ts`

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import WebSocket from 'ws';
import { attachWsServer } from '../src/wsServer';
import { RoomManager } from '../src/rooms';

const PORT = 19191;
let httpServer: http.Server;
let mgr: RoomManager;

beforeAll(async () => {
  mgr = new RoomManager(() => 1000);
  httpServer = http.createServer();
  attachWsServer(httpServer, mgr);
  await new Promise<void>((r) => httpServer.listen(PORT, r));
});
afterAll(() => new Promise<void>((r) => httpServer.close(() => r())));

const ws = () => new WebSocket(`ws://localhost:${PORT}`);

const wait = (s: WebSocket, predicate: (msg: any) => boolean) =>
  new Promise<any>((resolve) => {
    s.on('message', (raw) => {
      const m = JSON.parse(raw.toString());
      if (predicate(m)) resolve(m);
    });
  });

describe('ws integration', () => {
  it('host creates, guest joins, both see updated state', async () => {
    const code = mgr.createRoom({ hostId: 'host', hostName: 'Host', hostAvatar: '🐱' });

    const a = ws(); const b = ws();
    await new Promise((r) => a.once('open', r));
    await new Promise((r) => b.once('open', r));

    a.send(JSON.stringify({ type: 'join', code, playerId: 'host', name: 'Host', avatar: '🐱' }));
    b.send(JSON.stringify({ type: 'join', code, playerId: 'g',    name: 'Guest', avatar: '🦊' }));

    const stateMsg = await wait(b, (m) => m.type === 'state' && m.state.players.length === 2);
    expect(stateMsg.state.code).toBe(code);

    a.close(); b.close();
  });
});
```

- [ ] **Step 2: Run, fix issues, commit**

```bash
pnpm --filter @ludo/server test
git add -A
git commit -m "test(server): WebSocket integration smoke"
```

---

# Phase 5: Lobby & Room Flow

## Task 5.1: Local profile hook

**Files:**
- Create: `apps/web/src/lib/useLocalProfile.ts`

- [ ] **Step 1: Implement**

```ts
'use client';
import { useEffect, useState } from 'react';

export type Profile = { playerId: string; name: string; avatar: string };

const KEY = 'ludo:profile:v1';

const newId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now();

export function useLocalProfile(): {
  profile: Profile | null;
  save: (p: { name: string; avatar: string }) => void;
} {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) try { setProfile(JSON.parse(raw)); } catch {}
  }, []);
  const save = (p: { name: string; avatar: string }) => {
    const next: Profile = { playerId: profile?.playerId ?? newId(), name: p.name, avatar: p.avatar };
    localStorage.setItem(KEY, JSON.stringify(next));
    setProfile(next);
  };
  return { profile, save };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(web): useLocalProfile hook"
```

---

## Task 5.2: Room WebSocket hook

**Files:**
- Create: `apps/web/src/lib/useRoomConnection.ts`

- [ ] **Step 1: Implement**

```ts
'use client';
import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@ludo/game-logic';

export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'reconnecting';

export function useRoomConnection({ wsUrl, code, profile }: {
  wsUrl: string;
  code: string;
  profile: { playerId: string; name: string; avatar: string } | null;
}) {
  const [state, setGameState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const sockRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    const connect = () => {
      const sock = new WebSocket(wsUrl);
      sockRef.current = sock;
      sock.onopen = () => {
        attemptRef.current = 0;
        setStatus('open');
        sock.send(JSON.stringify({
          type: 'join', code,
          playerId: profile.playerId, name: profile.name, avatar: profile.avatar,
        }));
      };
      sock.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'state') setGameState(msg.state);
        if (msg.type === 'error') setError(`${msg.code}: ${msg.message}`);
      };
      sock.onclose = () => {
        if (cancelled) return;
        setStatus('reconnecting');
        const delay = Math.min(10000, 1000 * 2 ** attemptRef.current++);
        setTimeout(connect, delay);
      };
    };
    connect();
    return () => { cancelled = true; sockRef.current?.close(); };
  }, [wsUrl, code, profile]);

  const send = (m: object) => sockRef.current?.send(JSON.stringify(m));

  return { state, status, error, send };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(web): useRoomConnection hook with reconnect"
```

---

## Task 5.3: Landing page (Create / Join)

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/components/ProfileForm.tsx`

- [ ] **Step 1: ProfileForm**

```tsx
'use client';
import { useState } from 'react';
const AVATARS = ['🐱','🦊','🐼','🦁','🐻','🐨','🐯','🐶','🦄','🐢'];

export function ProfileForm({ initial, onSave }: {
  initial?: { name: string; avatar: string };
  onSave: (p: { name: string; avatar: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [avatar, setAvatar] = useState(initial?.avatar ?? '🐱');
  return (
    <form
      className="flex flex-col gap-3 w-full max-w-sm"
      onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave({ name: name.trim(), avatar }); }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm">Your name</span>
        <input
          autoFocus
          required
          minLength={1}
          maxLength={20}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-3 py-3 rounded-xl border border-edge bg-white"
        />
      </label>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="text-sm mb-1">Avatar</legend>
        {AVATARS.map((a) => (
          <button
            key={a} type="button" onClick={() => setAvatar(a)}
            className={`w-12 h-12 rounded-full border-2 text-2xl flex items-center justify-center
              ${avatar === a ? 'border-ink bg-white' : 'border-edge bg-paper'}`}
          >{a}</button>
        ))}
      </fieldset>
      <button type="submit" className="bg-ink text-paper py-3 rounded-xl font-medium">Continue</button>
    </form>
  );
}
```

- [ ] **Step 2: Landing page**

`apps/web/src/app/page.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalProfile } from '@/lib/useLocalProfile';
import { ProfileForm } from '@/components/ProfileForm';

const HTTP_URL = process.env.NEXT_PUBLIC_LUDO_HTTP ?? 'http://localhost:8787';

export default function Home() {
  const router = useRouter();
  const { profile, save } = useLocalProfile();
  const [joinCode, setJoinCode] = useState('');

  if (!profile) {
    return (
      <main className="min-h-screen-d flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <h1 className="font-display text-3xl">Ludo</h1>
          <p className="opacity-70 text-sm text-center">Pick a name and avatar so your family knows it's you.</p>
          <ProfileForm onSave={save} />
        </div>
      </main>
    );
  }

  const create = async () => {
    const r = await fetch(`${HTTP_URL}/rooms`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hostId: profile.playerId, name: profile.name, avatar: profile.avatar }),
    });
    const { code } = await r.json();
    router.push(`/room/${code}`);
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim().length === 4) router.push(`/room/${joinCode.trim().toUpperCase()}`);
  };

  return (
    <main className="min-h-screen-d flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <h1 className="font-display text-3xl">Ludo</h1>
        <p className="text-sm opacity-70">Hi <strong>{profile.name}</strong> {profile.avatar}</p>

        <button onClick={create} className="w-full bg-ink text-paper py-4 rounded-xl text-lg">
          Create new game
        </button>

        <div className="w-full text-center opacity-50 text-sm">— or —</div>

        <form onSubmit={join} className="w-full flex flex-col gap-2">
          <input
            inputMode="text" autoCapitalize="characters" maxLength={4} pattern="[A-Za-z]{4}" required
            value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Game code (4 letters)"
            className="px-3 py-3 rounded-xl border border-edge bg-white text-center tracking-widest text-xl"
          />
          <button type="submit" className="bg-paper border-2 border-ink py-3 rounded-xl">Join with code</button>
        </form>

        <button onClick={() => save({ name: '', avatar: '' })} className="text-xs opacity-50 underline mt-4">
          Change name/avatar
        </button>
      </div>
    </main>
  );
}
```

(The "Change name/avatar" button uses an empty save which currently does nothing; refine later by adding a "clear" action to `useLocalProfile` if desired.)

- [ ] **Step 3: Add env vars**

`apps/web/.env.local`:
```
NEXT_PUBLIC_LUDO_HTTP=http://localhost:8787
NEXT_PUBLIC_LUDO_WS=ws://localhost:8787
```

(In dev and prod, HTTP and WebSocket share the same port/host. Coolify + Traefik handles `wss://` on port 443 in prod automatically.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): landing page with profile, create, join"
```

---

## Task 5.4: Room page (Lobby + Game in one route)

**Files:**
- Create: `apps/web/src/app/room/[code]/page.tsx`
- Create: `apps/web/src/components/Lobby.tsx`

- [ ] **Step 1: Lobby component**

```tsx
'use client';
import type { GameState } from '@ludo/game-logic';

export function Lobby({ state, meId, shareUrl, onAddBot, onStart }: {
  state: GameState;
  meId: string;
  shareUrl: string;
  onAddBot: () => void;
  onStart: () => void;
}) {
  const me = state.players.find((p) => p.id === meId);
  const canStart = me?.isHost && state.players.length >= 2;
  const canAddBot = me?.isHost && state.players.length < 4;

  const share = async () => {
    const data = { title: 'Ludo', text: `Join my Ludo game, code ${state.code}`, url: shareUrl };
    if (navigator.share) { try { await navigator.share(data); return; } catch {} }
    await navigator.clipboard.writeText(shareUrl);
    alert('Link copied!');
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm p-4">
      <h2 className="font-display text-2xl">Lobby</h2>
      <div className="text-center">
        <div className="text-xs opacity-60">Game code</div>
        <div className="font-mono text-3xl tracking-widest">{state.code}</div>
      </div>
      <button onClick={share} className="bg-ink text-paper py-3 px-6 rounded-xl">Share invite</button>

      <ul className="w-full flex flex-col gap-2">
        {state.players.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-3 py-2 bg-white border border-edge rounded-xl">
            <span className="text-2xl">{p.avatar}</span>
            <span className="flex-1">{p.name}{p.isBot && ' 🤖'}</span>
            <span className="text-xs uppercase opacity-60">{p.color}</span>
          </li>
        ))}
        {Array.from({ length: 4 - state.players.length }, (_, i) => (
          <li key={`empty-${i}`} className="flex items-center gap-3 px-3 py-2 border-2 border-dashed border-edge rounded-xl opacity-50">
            <span>—</span><span>Waiting for player</span>
          </li>
        ))}
      </ul>

      {canAddBot && <button onClick={onAddBot} className="w-full py-3 rounded-xl border-2 border-ink">Add a bot</button>}
      {canStart && <button onClick={onStart} className="w-full py-4 rounded-xl bg-ink text-paper text-lg">Start game</button>}
      {!canStart && me?.isHost && <p className="opacity-60 text-sm">At least 2 players are needed to start.</p>}
    </div>
  );
}
```

- [ ] **Step 2: Room page (game + lobby switcher)**

```tsx
'use client';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useLocalProfile } from '@/lib/useLocalProfile';
import { useRoomConnection } from '@/lib/useRoomConnection';
import { Board } from '@/components/Board';
import { Dice } from '@/components/Dice';
import { PlayerPanel } from '@/components/PlayerPanel';
import { Lobby } from '@/components/Lobby';
import { ProfileForm } from '@/components/ProfileForm';
import { legalMoves } from '@ludo/game-logic';

const WS_URL = process.env.NEXT_PUBLIC_LUDO_WS ?? 'ws://localhost:8787';

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const { profile, save } = useLocalProfile();
  const { state, status, error, send } = useRoomConnection({ wsUrl: WS_URL, code, profile });
  const myTurn = state?.currentTurn === profile?.playerId;
  const moves = useMemo(
    () => state && profile ? legalMoves(state, profile.playerId) : [],
    [state, profile],
  );
  const hint = useMemo(() => new Set(moves.flatMap((m) => m.kind === 'move' ? [m.tokenId] : [])), [moves]);

  if (!profile) return (
    <main className="min-h-screen-d flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        <h1 className="font-display text-2xl">Joining {code}</h1>
        <ProfileForm onSave={save} />
      </div>
    </main>
  );

  if (!state) return (
    <main className="min-h-screen-d flex items-center justify-center">
      <p className="opacity-60">{status === 'connecting' ? 'Connecting…' : 'Reconnecting…'}</p>
    </main>
  );

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/room/${code}` : '';

  if (state.status === 'lobby') {
    return (
      <main className="min-h-screen-d flex items-center justify-center">
        <Lobby
          state={state} meId={profile.playerId} shareUrl={shareUrl}
          onAddBot={() => send({ type: 'addBot' })}
          onStart={() => send({ type: 'start' })}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen-d flex flex-col items-center gap-4 p-4 pb-[calc(7rem+var(--safe-bottom))]">
      {status !== 'open' && <div className="w-full max-w-[640px] text-sm bg-honey/30 px-3 py-2 rounded">Reconnecting…</div>}
      {error && <div className="w-full max-w-[640px] text-sm bg-rust/30 px-3 py-2 rounded">{error}</div>}
      <PlayerPanel state={state} />
      <Board
        state={state}
        hintTokenIds={myTurn ? hint : undefined}
        onTokenClick={myTurn ? (id) => {
          if (moves.find((m) => m.kind === 'move' && m.tokenId === id)) {
            send({ type: 'move', tokenId: id });
          }
        } : undefined}
      />
      <div className="fixed inset-x-0 bottom-0 px-4 pb-[calc(1rem+var(--safe-bottom))] pt-3 bg-paper border-t border-edge flex items-center justify-between">
        <div className="text-sm">
          {state.status === 'finished'
            ? `🏆 ${state.players.find((p) => p.id === state.winner)?.name} wins!`
            : myTurn
              ? state.dice ? `Pick a token (rolled ${state.dice})` : 'Your turn — roll!'
              : `Waiting on ${state.players.find((p) => p.id === state.currentTurn)?.name}`}
        </div>
        <Dice
          value={state.dice}
          disabled={!myTurn || state.rolledThisTurn || state.status !== 'playing'}
          onRoll={() => send({ type: 'roll' })}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: End-to-end manual test**

Two terminals:
```bash
pnpm dev:server
pnpm dev:web
```

Open two browsers (Chrome incognito + Safari, or two phones on the same Wi-Fi).
1. In tab 1, set name "Mom", click "Create new game".
2. Copy the share URL, open in tab 2, set name "Sara", lobby shows both.
3. Add a bot. Start the game. Play a few turns.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): room page (lobby + game) wired to server"
```

---

# Phase 6: Reliability — AFK and reconnect

## Task 6.1: AFK timer on the server

**Files:**
- Modify: `apps/server/src/wsServer.ts` (add per-room AFK timer)

The spec: prompt other players after 60s, auto-skip after 90s, replace with bot after 2 min disconnected.

- [ ] **Step 1: Add timer logic**

In `wsServer.ts`, after `mgr` is constructed, add:

```ts
import { legalMoves } from '@ludo/game-logic';

const afkTimers = new Map<string, NodeJS.Timeout>();

const armAfk = (code: string) => {
  clearTimeout(afkTimers.get(code));
  const room = mgr.getRoom(code);
  if (!room || room.state.status !== 'playing' || !room.state.currentTurn) return;
  const playerId = room.state.currentTurn;
  const t = setTimeout(() => {
    const r = mgr.getRoom(code);
    if (!r || r.state.currentTurn !== playerId) return;
    // Auto-roll for them if they haven't, and pass / forced-pass.
    if (!r.state.rolledThisTurn) mgr.roll(code, playerId, rollDie());
    const moves = legalMoves(mgr.getRoom(code)!.state, playerId);
    if (moves.length > 0) {
      const fallback = moves[0]!;  // any legal move is fine
      mgr.move(code, playerId, fallback);
    }
    broadcast(code);
    handleBotTurns(code);
    armAfk(code);
  }, 90_000);
  afkTimers.set(code, t);
};
```

Then call `armAfk(c.code)` after every `broadcast(c.code)` that follows a state-mutating action (start, roll, move, addBot, etc.). After `handleBotTurns(c.code)`, also call `armAfk(c.code)` so the bot loop ending into a human turn re-arms.

- [ ] **Step 2: Smoke test**

Manually: start a 2-player game, leave one tab idle for 90s, watch it auto-pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(server): AFK auto-pass after 90s"
```

---

## Task 6.2: Replace abandoned players with bots

**Files:**
- Modify: `apps/server/src/wsServer.ts`
- Modify: `apps/server/src/rooms.ts` (add `convertToBot`)

- [ ] **Step 1: Add `convertToBot(code, playerId)` to RoomManager**

```ts
convertToBot(code: string, playerId: string) {
  const r = this.rooms.get(code);
  if (!r) return;
  r.state = {
    ...r.state,
    players: r.state.players.map((p) =>
      p.id === playerId ? { ...p, isBot: true, name: `${p.name} (bot)`, connected: true } : p),
    lastActivityAt: this.now(),
  };
}
```

- [ ] **Step 2: In `wsServer.ts`, on socket close while game playing, schedule conversion**

```ts
const abandonTimers = new Map<string, NodeJS.Timeout>();

socket.on('close', () => {
  const c = ctx.get(socket);
  if (!c) return;
  sockets.get(c.code)?.delete(c.playerId);
  mgr.markDisconnected(c.code, c.playerId);
  broadcast(c.code);

  const room = mgr.getRoom(c.code);
  if (room?.state.status !== 'playing') return;
  const key = `${c.code}:${c.playerId}`;
  clearTimeout(abandonTimers.get(key));
  const t = setTimeout(() => {
    const r = mgr.getRoom(c.code);
    if (!r) return;
    const p = r.state.players.find((pp) => pp.id === c.playerId);
    if (p && !p.connected) {
      mgr.convertToBot(c.code, c.playerId);
      broadcast(c.code);
      handleBotTurns(c.code);
    }
  }, 120_000);
  abandonTimers.set(key, t);
});
```

On rejoin (in the `join` handler), `clearTimeout(abandonTimers.get(...))`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(server): replace abandoned humans with bots after 2 min"
```

---

## Task 6.3: Room expiry sweep

**Files:**
- Modify: `apps/server/src/rooms.ts`
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Add sweep**

```ts
// in RoomManager
sweepExpired(thresholdMs = 10 * 60_000) {
  const cutoff = this.now() - thresholdMs;
  for (const [code, r] of this.rooms) {
    const anyConnected = r.state.players.some((p) => p.connected && !p.isBot);
    if (!anyConnected && r.state.lastActivityAt < cutoff) this.rooms.delete(code);
  }
}
```

- [ ] **Step 2: In index.ts, run every minute**

```ts
setInterval(() => mgr.sweepExpired(), 60_000);
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(server): expire idle rooms after 10 minutes"
```

---

# Phase 7: Mobile UX polish + PWA install

## Task 7.1: Manifest + service worker

**Files:**
- Create: `apps/web/public/manifest.webmanifest`
- Create: `apps/web/public/icons/icon-192.png`, `icon-512.png` (placeholder)
- Create: `apps/web/src/app/sw.ts` (registered via next-pwa or manual)
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Manifest**

```json
{
  "name": "Ludo",
  "short_name": "Ludo",
  "description": "Family Ludo",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fdf6ec",
  "theme_color": "#3a2e1f",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 2: Generate icons**

Use any tool; for now an SVG placeholder converted to PNG works. Drop two PNGs at the listed paths.

- [ ] **Step 3: Wire `<link>` in `layout.tsx`**

```tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ludo',
  description: 'Family Ludo',
  manifest: '/manifest.webmanifest',
  applicationName: 'Ludo',
  appleWebApp: { capable: true, title: 'Ludo', statusBarStyle: 'default' },
};
export const viewport: Viewport = {
  themeColor: '#3a2e1f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
```

- [ ] **Step 4: Service worker (basic offline shell)**

Add `next-pwa`:

```bash
pnpm add next-pwa -F @ludo/web
```

`apps/web/next.config.mjs`:
```js
import withPWA from 'next-pwa';
const config = { reactStrictMode: true };
export default withPWA({ dest: 'public', register: true, skipWaiting: true })(config);
```

- [ ] **Step 5: Verify install on iPhone Safari**

Build prod and run:
```bash
pnpm --filter @ludo/web build && pnpm --filter @ludo/web start
```

On iPhone: Safari → Share → Add to Home Screen. Launches as standalone, no browser chrome.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): PWA manifest + offline shell"
```

---

## Task 7.2: Haptics, animations, mobile polish

**Files:**
- Modify: `apps/web/src/components/Dice.tsx` (add roll animation + haptic)
- Modify: `apps/web/src/components/Token.tsx` (extract from Board, animate movement) — optional split
- Modify: `apps/web/src/app/globals.css` (motion preferences)

- [ ] **Step 1: Haptic helper**

```ts
// apps/web/src/lib/haptics.ts
export const buzz = (ms = 10) => { try { (navigator as any).vibrate?.(ms); } catch {} };
```

Call `buzz()` from `Dice` `onClick`, on capture event, on win.

- [ ] **Step 2: `prefers-reduced-motion` rule**

In `globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; }
}
```

- [ ] **Step 3: Smooth token movement**

In `Board.tsx`, wrap each token's `<g>` with `style={{ transition: 'transform 0.3s ease-out' }}` and use a `transform` translate instead of `cx`/`cy` per-token. Skip if it gets fiddly — animations are nice-to-have.

- [ ] **Step 4: Confirm with real devices, commit**

```bash
git add -A
git commit -m "feat(web): mobile polish — haptics + reduced motion"
```

---

## Task 7.3: Win screen + play again

**Files:**
- Create: `apps/web/src/components/WinScreen.tsx`
- Modify: `apps/web/src/app/room/[code]/page.tsx`
- Modify: `apps/server/src/wsServer.ts` (add `playAgain` action) and `apps/server/src/protocol.ts`

- [ ] **Step 1: Add `playAgain` to client→server protocol**

In `protocol.ts`:
```ts
z.object({ type: z.literal('playAgain') }),
```

In `wsServer.ts` switch:
```ts
case 'playAgain': mgr.playAgain(c.code); broadcast(c.code); break;
```

In `RoomManager`:
```ts
playAgain(code: string) {
  const r = this.rooms.get(code);
  if (!r || r.state.status !== 'finished') return;
  const players = r.state.players.map((p) => ({ ...p }));
  r.state = createInitialState({ code, players, now: this.now() });
}
```

- [ ] **Step 2: WinScreen**

```tsx
'use client';
import type { GameState } from '@ludo/game-logic';

export function WinScreen({ state, onPlayAgain }: { state: GameState; onPlayAgain: () => void }) {
  const winner = state.players.find((p) => p.id === state.winner);
  if (!winner) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10">
      <div className="bg-paper rounded-2xl p-6 flex flex-col items-center gap-4 max-w-sm w-full">
        <div className="text-5xl">🏆</div>
        <h2 className="font-display text-2xl">{winner.name} wins!</h2>
        <button onClick={onPlayAgain} className="bg-ink text-paper py-3 px-6 rounded-xl">Play again</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Show in room page when finished**

```tsx
{state.status === 'finished' && (
  <WinScreen state={state} onPlayAgain={() => send({ type: 'playAgain' })} />
)}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: win screen and play again"
```

---

# Phase 8: Deploy (Coolify)

Both services deploy as separate Coolify "applications" on the user's existing VPS, on separate subdomains, with auto-managed TLS via Let's Encrypt (handled by Coolify's Traefik proxy).

**Placeholders used throughout this phase** (the user fills these in once they have a domain):
- `LUDO_WEB_DOMAIN` — e.g. `ludo.example.com` (the Next.js web app)
- `LUDO_WS_DOMAIN` — e.g. `ludo-ws.example.com` (the WebSocket + HTTP server)

## Task 8.1: Server Dockerfile

**Files:**
- Create: `apps/server/Dockerfile`
- Create: `.dockerignore` (root)

- [ ] **Step 1: Root `.dockerignore`**

```
node_modules
**/node_modules
**/dist
**/.next
.git
.superpowers
docs
*.log
```

- [ ] **Step 2: `apps/server/Dockerfile`**

```dockerfile
# ---- builder ----
FROM node:20-slim AS builder
RUN corepack enable
WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY packages/game-logic/package.json packages/game-logic/
COPY apps/server/package.json apps/server/

RUN pnpm install --filter @ludo/server... --frozen-lockfile=false

COPY packages/game-logic packages/game-logic
COPY apps/server apps/server

RUN pnpm --filter @ludo/server build

# ---- runner ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY --from=builder /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/packages/game-logic packages/game-logic
COPY --from=builder /app/apps/server/package.json apps/server/
COPY --from=builder /app/apps/server/dist apps/server/dist
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/apps/server/node_modules apps/server/node_modules
COPY --from=builder /app/packages/game-logic/node_modules packages/game-logic/node_modules

EXPOSE 8787
CMD ["node", "apps/server/dist/index.js"]
```

- [ ] **Step 3: Local build smoke test**

```bash
docker build -f apps/server/Dockerfile -t ludo-server .
docker run --rm -p 8787:8787 ludo-server
# In another terminal:
curl -s http://localhost:8787/health    # → "ok"
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(server): production Dockerfile"
```

---

## Task 8.2: Web Dockerfile

**Files:**
- Create: `apps/web/Dockerfile`
- Modify: `apps/web/next.config.mjs` (enable standalone output)

- [ ] **Step 1: Enable standalone output**

`apps/web/next.config.mjs`:
```js
import withPWA from 'next-pwa';
const config = {
  reactStrictMode: true,
  output: 'standalone',
};
export default withPWA({ dest: 'public', register: true, skipWaiting: true })(config);
```

`output: 'standalone'` makes Next.js emit a tiny self-contained server in `.next/standalone/`, perfect for Docker.

- [ ] **Step 2: `apps/web/Dockerfile`**

```dockerfile
# ---- builder ----
FROM node:20-slim AS builder
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY packages/game-logic/package.json packages/game-logic/
COPY apps/web/package.json apps/web/

RUN pnpm install --filter @ludo/web... --frozen-lockfile=false

COPY packages/game-logic packages/game-logic
COPY apps/web apps/web

# Build-time public env vars (baked into the JS bundle)
ARG NEXT_PUBLIC_LUDO_HTTP
ARG NEXT_PUBLIC_LUDO_WS
ENV NEXT_PUBLIC_LUDO_HTTP=$NEXT_PUBLIC_LUDO_HTTP
ENV NEXT_PUBLIC_LUDO_WS=$NEXT_PUBLIC_LUDO_WS

RUN pnpm --filter @ludo/web build

# ---- runner ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Next.js standalone output is self-contained
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
```

- [ ] **Step 3: Local build smoke test**

```bash
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_LUDO_HTTP=http://localhost:8787 \
  --build-arg NEXT_PUBLIC_LUDO_WS=ws://localhost:8787 \
  -t ludo-web .
docker run --rm -p 3000:3000 ludo-web
# Open http://localhost:3000
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(web): production Dockerfile + standalone output"
```

---

## Task 8.3: Coolify deployment

**This task is mostly user-driven** — Coolify is configured through its web UI, not a config file in the repo. The implementer's job is to (a) document the steps clearly, (b) make sure env vars and ports match what Coolify expects, and (c) verify after the user deploys.

**Prerequisites the user provides:**
1. A registered domain (e.g. `example.com`) and access to its DNS.
2. A running Coolify instance (already used for prior projects).
3. The repo pushed to GitHub (or another Git host that Coolify can pull from).

- [ ] **Step 1: User points DNS at the VPS**

In their domain registrar (Cloudflare, Namecheap, Porkbun, etc.), the user adds two A records pointing at their VPS's IP address:

```
LUDO_WEB_DOMAIN     A    <VPS IP>
LUDO_WS_DOMAIN      A    <VPS IP>
```

Wait until they resolve (`dig LUDO_WEB_DOMAIN +short` returns the IP).

- [ ] **Step 2: Push the repo to GitHub**

```bash
gh repo create Ludo --private --source=. --push
# or, if the remote already exists:
git push -u origin main
```

- [ ] **Step 3: Create the WebSocket server application in Coolify**

In the Coolify UI:
1. **+ New Resource → Application → Public/Private Repository**.
2. Connect to GitHub, pick the `Ludo` repo, branch `main`.
3. **Build Pack:** Dockerfile.
4. **Dockerfile location:** `apps/server/Dockerfile`.
5. **Build context:** repository root (`.`) — the Dockerfile copies the whole monorepo.
6. **Port:** `8787`.
7. **Domain:** `https://LUDO_WS_DOMAIN`.
8. **Environment variables:**
   - `PORT=8787`
   - `CORS_ORIGIN=https://LUDO_WEB_DOMAIN`
9. **Health check path:** `/health`.
10. Click **Deploy**. Wait for build + TLS issuance (~2–4 minutes).

Verify:
```bash
curl -s https://LUDO_WS_DOMAIN/health    # → "ok"
```

- [ ] **Step 4: Create the Web application in Coolify**

In the Coolify UI:
1. **+ New Resource → Application → Public/Private Repository**.
2. Same `Ludo` repo, branch `main`.
3. **Build Pack:** Dockerfile.
4. **Dockerfile location:** `apps/web/Dockerfile`.
5. **Build context:** repository root.
6. **Port:** `3000`.
7. **Domain:** `https://LUDO_WEB_DOMAIN`.
8. **Build-time env vars** (Coolify exposes these as `--build-arg`):
   - `NEXT_PUBLIC_LUDO_HTTP=https://LUDO_WS_DOMAIN`
   - `NEXT_PUBLIC_LUDO_WS=wss://LUDO_WS_DOMAIN`
9. **Runtime env vars:** none required.
10. Click **Deploy**.

- [ ] **Step 5: Verify auto-deploy on push**

Coolify watches the `main` branch by default. Push a trivial change:

```bash
git commit --allow-empty -m "test: redeploy"
git push
```

Both applications should rebuild and redeploy automatically. Confirm in Coolify's deploy logs.

- [ ] **Step 6: Smoke test on real phones**

- Open `https://LUDO_WEB_DOMAIN` on real iPhone Safari + Android Chrome (different networks).
- Set profile, create a game, open the share link on the second device, join, play to a winner.
- Add to Home Screen on both phones — confirm standalone launch.
- Background the app on iPhone → return — confirm reconnect banner clears.

- [ ] **Step 7: Tag**

```bash
git tag v0.1.0
git push --tags
```

---

# Self-Review

After completing all tasks, do this once:

1. **Spec coverage** — open the spec, walk through each section, confirm a task implements it.
2. **TDD smoke** — re-run `pnpm test` from the root. All green.
3. **Real-device test** — open the deployed URL on iPhone + Android. Play one full game. Watch for layout bugs.
4. **Privacy check** — does anything log player names or playerIds in production? Strip if so.
5. **Cleanup** — kill any leftover `console.log`s in committed files.

If any gap, write a follow-up task and commit before declaring v0.1.0 done.
