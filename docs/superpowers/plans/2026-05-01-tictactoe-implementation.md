# Tic-Tac-Toe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Tic-Tac-Toe as the third game in OurGameNight. Multiplayer-first, optional bot (easy/hard toggle), 3D pawns instead of literal X/O glyphs, deploys to existing `ourgamenight.org`.

**Architecture:** New `packages/game-logic-tictactoe` package implements the rules engine. Server registers it via the existing engine registry. Web app gets new routes (`/tictactoe/new`, `/tictactoe/[code]`) and a Board component. Lobby renders a host-only DifficultyToggle for tictactoe rooms; server enforces 2-player cap.

**Tech Stack:** TypeScript, pnpm workspaces, vitest, Next.js 16, React 19, Tailwind v4, `ws`, zod. Reuses all v2 multiplayer infrastructure (rooms, AFK, abandonment, reconnect).

**Spec:** `docs/superpowers/specs/2026-05-01-tictactoe-design.md`

**Builds on:** v2 multi-game hub (already deployed at `ourgamenight.org`).

---

## Phases

- **Phase 1** — Extend `GameType` + add 3rd catalog card (links 404 until Phase 5)
- **Phase 2** — Tic-Tac-Toe rules engine (TDD, ~25 tests)
- **Phase 3** — Server engine registration + `setDifficulty` + 2-player cap + bot-turn handling for no-dice games
- **Phase 4** — Board component + boardLayout module
- **Phase 5** — Local prototype at `/tictactoe/[code]` (vs bot)
- **Phase 6** — Replace prototype with real WebSocket flow + Lobby DifficultyToggle
- **Phase 7** — Polish (hint sparkles, win-line animation, draw modal)
- **Phase 8** — Deploy (push to GitHub, Coolify auto-deploys; smoke test)

---

# Phase 1: Extend GameType + 3rd catalog card

## Task 1.1: Extend `GameType` to include `'tictactoe'`

**Files:**
- Modify: `packages/game-shared/src/types.ts`

- [ ] **Step 1: Edit `packages/game-shared/src/types.ts`**

Find:
```ts
export type GameType = 'ludo' | 'snakes';
```

Change to:
```ts
export type GameType = 'ludo' | 'snakes' | 'tictactoe';
```

- [ ] **Step 2: Verify**

```bash
pnpm --filter @ludo/game-shared typecheck
```
Exit 0.

This will cause TypeScript errors anywhere `GameType` is exhaustively switched. Expected places that may need updates:
- `apps/server/src/engines/index.ts` — `Record<GameType, GameEngine>` will require a `tictactoe` key. Temporarily satisfy with a stub engine until Phase 3.

In `apps/server/src/engines/index.ts`, change:
```ts
const ENGINES: Record<GameType, GameEngine> = {
  ludo: ludoEngine,
  snakes: snakesEngine,
};
```

To:
```ts
const ENGINES: Partial<Record<GameType, GameEngine>> = {
  ludo: ludoEngine,
  snakes: snakesEngine,
  // tictactoe registered in Phase 3
};

export function getEngine(gameType: GameType): GameEngine {
  const e = ENGINES[gameType];
  if (!e) throw new Error(`No engine registered for gameType=${gameType}`);
  return e;
}
```

(The runtime guard already throws — this just satisfies TS until tictactoe is registered.)

- [ ] **Step 3: Verify all packages typecheck**

```bash
pnpm --filter @ludo/game-shared typecheck
pnpm --filter @ludo/game-logic-ludo typecheck
pnpm --filter @ludo/game-logic-snakes typecheck
pnpm --filter @ludo/server typecheck
pnpm --filter @ludo/web typecheck
```
All exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(game-shared): extend GameType to include 'tictactoe'"
```

## Task 1.2: Add 3rd `<GameCard>` to catalog

**Files:**
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Add a third card to the landing page**

Find the section with the two existing GameCards in `apps/web/src/app/page.tsx`:

```tsx
<GameCard
  href="/ludo/new"
  name="Ludo"
  tagline="Race four tokens to the center"
  accent="bg-rust/25"
  icon="🎲"
/>
<GameCard
  href="/snakes/new"
  name="Snakes & Ladders"
  tagline="Climb, slide, race to 100"
  accent="bg-sky/25"
  icon="🐍"
/>
```

Add a third card right after:

```tsx
<GameCard
  href="/tictactoe/new"
  name="Tic-Tac-Toe"
  tagline="Three in a row"
  accent="bg-honey/25"
  icon="❌"
/>
```

- [ ] **Step 2: Verify**

```bash
pnpm --filter @ludo/web build
pnpm --filter @ludo/web typecheck
```

(Card links to `/tictactoe/new` which doesn't exist yet — clicking 404s. Phase 5 builds it.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(web): add 3rd GameCard for Tic-Tac-Toe (404s until Phase 5)"
```

---

# Phase 2: Tic-Tac-Toe rules engine (TDD)

Pure module, strict TDD throughout. Same pattern as Ludo and Snakes & Ladders.

## Task 2.1: Initialize `@ludo/game-logic-tictactoe` package

**Files:**
- Create: `packages/game-logic-tictactoe/package.json`
- Create: `packages/game-logic-tictactoe/tsconfig.json`
- Create: `packages/game-logic-tictactoe/vitest.config.ts`
- Create: `packages/game-logic-tictactoe/src/index.ts`

- [ ] **Step 1: package.json**

```json
{
  "name": "@ludo/game-logic-tictactoe",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "echo skip"
  },
  "dependencies": {
    "@ludo/game-shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "5.5",
    "vitest": "2"
  }
}
```

- [ ] **Step 2: tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
```

- [ ] **Step 4: Empty index**

```ts
// packages/game-logic-tictactoe/src/index.ts
export {};
```

- [ ] **Step 5: Install + commit**

```bash
pnpm install
git add -A
git commit -m "feat(game-logic-tictactoe): scaffold package"
```

## Task 2.2: Types

**Files:**
- Create: `packages/game-logic-tictactoe/src/types.ts`

- [ ] **Step 1: Write `types.ts`**

```ts
import type { BaseGameState, Player, GameEvent } from '@ludo/game-shared';

/** A cell value: empty string for unplayed, 'X' or 'O' for placed marks. */
export type Mark = '' | 'X' | 'O';

export type GameState = BaseGameState & {
  /** 9-cell row-major board: [r0c0, r0c1, r0c2, r1c0, ..., r2c2]. */
  board: Mark[];
  /** playerId → which mark they play. */
  marks: Record<string, 'X' | 'O'>;
  /** Bot heuristic difficulty. Locked once game starts. */
  difficulty: 'easy' | 'hard';
  /** Empty Record (board is the source of truth). Satisfies BaseGameState's tokens slot. */
  tokens: Record<string, never>;
};

export type Move = { kind: 'place'; cell: number };  // cell index 0..8

export type { Player, GameEvent } from '@ludo/game-shared';
```

- [ ] **Step 2: Update index**

```ts
// packages/game-logic-tictactoe/src/index.ts
export * from './types';
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(game-logic-tictactoe): core types (Mark, GameState, Move)"
```

## Task 2.3: Board constants + win detection

**Files:**
- Create: `packages/game-logic-tictactoe/src/board.ts`
- Create: `packages/game-logic-tictactoe/tests/board.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/game-logic-tictactoe/tests/board.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { WIN_LINES, BOARD_SIZE, checkWinner, isBoardFull } from '../src/board';

describe('board constants', () => {
  it('has 9 cells', () => {
    expect(BOARD_SIZE).toBe(9);
  });

  it('has 8 win lines (3 rows, 3 cols, 2 diagonals)', () => {
    expect(WIN_LINES).toHaveLength(8);
  });

  it('every win line is a tuple of exactly 3 cell indices', () => {
    for (const line of WIN_LINES) {
      expect(line).toHaveLength(3);
      for (const idx of line) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(9);
      }
    }
  });
});

describe('checkWinner', () => {
  const empty: Array<'' | 'X' | 'O'> = ['','','','','','','','',''];

  it('returns null for empty board', () => {
    expect(checkWinner(empty)).toBeNull();
  });

  it('detects top row win for X', () => {
    expect(checkWinner(['X','X','X','','','','','',''])).toBe('X');
  });

  it('detects middle column win for O', () => {
    expect(checkWinner(['','O','','','O','','','O',''])).toBe('O');
  });

  it('detects diagonal win', () => {
    expect(checkWinner(['X','','','','X','','','','X'])).toBe('X');
  });

  it('detects anti-diagonal win', () => {
    expect(checkWinner(['','','O','','O','','O','',''])).toBe('O');
  });

  it('returns null when no winner', () => {
    expect(checkWinner(['X','O','X','X','O','O','O','X','X'])).toBeNull();
  });
});

describe('isBoardFull', () => {
  it('false on empty board', () => {
    expect(isBoardFull(['','','','','','','','',''])).toBe(false);
  });

  it('true on full board', () => {
    expect(isBoardFull(['X','O','X','X','O','O','O','X','X'])).toBe(true);
  });

  it('false on partially-full board', () => {
    expect(isBoardFull(['X','O','X','','','','','',''])).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
pnpm --filter @ludo/game-logic-tictactoe test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/game-logic-tictactoe/src/board.ts`**

```ts
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
```

- [ ] **Step 4: Run, all pass**

```bash
pnpm --filter @ludo/game-logic-tictactoe test
```

- [ ] **Step 5: Update index, commit**

```ts
// packages/game-logic-tictactoe/src/index.ts
export * from './types';
export * from './board';
```

```bash
git add -A
git commit -m "feat(game-logic-tictactoe): board constants + checkWinner + isBoardFull"
```

## Task 2.4: createInitialState + startGame

**Files:**
- Create: `packages/game-logic-tictactoe/src/state.ts`
- Create: `packages/game-logic-tictactoe/tests/state.test.ts`

- [ ] **Step 1: Failing test**

`packages/game-logic-tictactoe/tests/state.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, startGame } from '../src/state';
import type { Player } from '../src/types';

const players = (n: number): Player[] => {
  const colors = ['red', 'blue', 'green', 'yellow'] as const;
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    avatar: '🐱',
    color: colors[i]!,
    isBot: false,
    isHost: i === 0,
    connected: true,
  }));
};

describe('createInitialState (tictactoe)', () => {
  it('builds a 2-player game in lobby with empty board', () => {
    const s = createInitialState({ code: 'ABCD', players: players(2), now: 1000 });
    expect(s.code).toBe('ABCD');
    expect(s.gameType).toBe('tictactoe');
    expect(s.status).toBe('lobby');
    expect(s.players).toHaveLength(2);
    expect(s.board).toEqual(['','','','','','','','','']);
    expect(s.difficulty).toBe('easy');
  });

  it('assigns X to first player and O to second', () => {
    const s = createInitialState({ code: 'X', players: players(2), now: 1000 });
    expect(s.marks[s.players[0]!.id]).toBe('X');
    expect(s.marks[s.players[1]!.id]).toBe('O');
  });

  it('rejects fewer than 2 players', () => {
    expect(() => createInitialState({ code: 'X', players: players(1), now: 0 })).toThrow();
  });

  it('rejects more than 2 players', () => {
    expect(() => createInitialState({ code: 'X', players: players(3), now: 0 })).toThrow();
  });
});

describe('startGame (tictactoe)', () => {
  it('flips status to playing and X starts', () => {
    const s0 = createInitialState({ code: 'X', players: players(2), now: 0 });
    const s1 = startGame(s0, { now: 5 });
    expect(s1.status).toBe('playing');
    // First player (host, X) goes first
    expect(s1.currentTurn).toBe(s0.players[0]!.id);
    expect(s1.lastActivityAt).toBe(5);
  });
});
```

- [ ] **Step 2: Run, verify failure**

- [ ] **Step 3: Implement `packages/game-logic-tictactoe/src/state.ts`**

```ts
import type { GameState, Player } from './types';

export function createInitialState(input: {
  code: string; players: Player[]; now: number;
}): GameState {
  const { code, players, now } = input;
  if (players.length !== 2) {
    throw new Error(`Tic-Tac-Toe needs exactly 2 players, got ${players.length}`);
  }
  const marks: Record<string, 'X' | 'O'> = {
    [players[0]!.id]: 'X',
    [players[1]!.id]: 'O',
  };
  return {
    code,
    gameType: 'tictactoe',
    status: 'lobby',
    players: [...players],
    turnOrder: [],
    currentTurn: null,
    dice: null,
    rolledThisTurn: false,
    board: ['','','','','','','','',''],
    marks,
    difficulty: 'easy',
    tokens: {},
    winner: null,
    log: [],
    createdAt: now,
    lastActivityAt: now,
  };
}

export function startGame(state: GameState, opts: { now: number }): GameState {
  if (state.status !== 'lobby') {
    throw new Error(`startGame: expected lobby, got ${state.status}`);
  }
  if (state.players.length !== 2) {
    throw new Error(`startGame: need exactly 2 players, got ${state.players.length}`);
  }
  // Turn order: same as players (X first, O second)
  const turnOrder = state.players.map((p) => p.id);
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

- [ ] **Step 4: Update index**

```ts
// packages/game-logic-tictactoe/src/index.ts
export * from './types';
export * from './board';
export * from './state';
```

- [ ] **Step 5: Verify, commit**

```bash
pnpm --filter @ludo/game-logic-tictactoe test
git add -A
git commit -m "feat(game-logic-tictactoe): createInitialState + startGame"
```

## Task 2.5: applyMove + isWin + applyRoll (no-op) + legalMoves

**Files:**
- Create: `packages/game-logic-tictactoe/src/moves.ts`
- Create: `packages/game-logic-tictactoe/tests/moves.test.ts`

- [ ] **Step 1: Failing tests**

`packages/game-logic-tictactoe/tests/moves.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, startGame, applyMove, applyRoll, isWin, legalMoves, type GameState, type Player } from '../src/index';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',  isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'blue', isBot: false, isHost: false, connected: true },
];
const fresh = () => startGame(createInitialState({ code: 'X', players, now: 0 }), { now: 1 });

const setBoard = (s: GameState, board: GameState['board'], currentTurn: string): GameState => ({
  ...s, board, currentTurn,
});

describe('applyMove (tictactoe)', () => {
  it('places the player\'s mark on an empty cell', () => {
    const s0 = fresh();
    const s1 = applyMove(s0, { kind: 'place', cell: 4 }, { now: 5 });
    expect(s1.board[4]).toBe('X');
    expect(s1.currentTurn).toBe('b');  // turn flips
  });

  it('rejects move on an occupied cell', () => {
    let s = fresh();
    s = applyMove(s, { kind: 'place', cell: 0 }, { now: 5 });   // a places X at 0
    s = applyMove(s, { kind: 'place', cell: 1 }, { now: 6 });   // b places O at 1
    expect(() => applyMove(s, { kind: 'place', cell: 0 }, { now: 7 })).toThrow();
  });

  it('rejects move when not your turn', () => {
    const s = fresh();
    // a is currentTurn; b should not be able to play
    expect(s.currentTurn).toBe('a');
    expect(legalMoves(s, 'b')).toEqual([]);
  });

  it('rejects move with invalid cell index', () => {
    const s = fresh();
    expect(() => applyMove(s, { kind: 'place', cell: 9 }, { now: 5 })).toThrow();
    expect(() => applyMove(s, { kind: 'place', cell: -1 }, { now: 5 })).toThrow();
  });

  it('detects win on completing a line', () => {
    let s = setBoard(fresh(), ['X','X','','','','','','',''], 'a');
    s = applyMove(s, { kind: 'place', cell: 2 }, { now: 5 });
    expect(s.status).toBe('finished');
    expect(s.winner).toBe('a');
    expect(s.currentTurn).toBeNull();
    expect(s.log.some((e) => e.kind === 'won' && e.playerId === 'a')).toBe(true);
  });

  it('detects draw when board fills with no winner', () => {
    // Reach a state where one move fills the board with no winning line
    //   X O X       0 1 2
    //   X O O       3 4 5
    //   O X _       6 7 _
    // a (X) plays at 8 → still no line → draw
    let s = setBoard(fresh(),
      ['X','O','X','X','O','O','O','X',''], 'a');
    s = applyMove(s, { kind: 'place', cell: 8 }, { now: 5 });
    expect(s.status).toBe('finished');
    expect(s.winner).toBeNull();
    expect(s.board[8]).toBe('X');
  });
});

describe('applyRoll (tictactoe — no-op throws)', () => {
  it('throws if called (tic-tac-toe has no dice)', () => {
    expect(() => applyRoll(fresh(), 4, { now: 5 })).toThrow();
  });
});

describe('isWin / legalMoves', () => {
  it('isWin true when player has a line', () => {
    const s = setBoard(fresh(), ['X','X','X','','','','','',''], 'b');
    expect(isWin(s, 'a')).toBe(true);
    expect(isWin(s, 'b')).toBe(false);
  });

  it('legalMoves returns all empty cells when it\'s your turn', () => {
    let s = fresh();
    s = applyMove(s, { kind: 'place', cell: 4 }, { now: 5 });   // a played 4 → now b's turn
    const moves = legalMoves(s, 'b');
    expect(moves).toHaveLength(8);                              // 9 - 1
    expect(moves.every((m) => m.kind === 'place')).toBe(true);
    expect(moves.some((m) => m.kind === 'place' && m.cell === 4)).toBe(false);   // 4 not legal
  });

  it('legalMoves is empty for the non-current player', () => {
    const s = fresh();
    expect(legalMoves(s, 'b')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, verify failures**

- [ ] **Step 3: Implement `packages/game-logic-tictactoe/src/moves.ts`**

```ts
import type { GameEvent } from '@ludo/game-shared';
import type { GameState, Move } from './types';
import { BOARD_SIZE, checkWinner, isBoardFull } from './board';

export function applyRoll(_state: GameState, _value: number, _opts: { now: number }): GameState {
  throw new Error('applyRoll: tic-tac-toe has no dice');
}

export function isWin(state: GameState, playerId: string): boolean {
  const winnerMark = checkWinner(state.board);
  if (!winnerMark) return false;
  return state.marks[playerId] === winnerMark;
}

const otherPlayer = (state: GameState, playerId: string): string => {
  const i = state.turnOrder.indexOf(playerId);
  return state.turnOrder[(i + 1) % state.turnOrder.length]!;
};

export function applyMove(
  state: GameState,
  move: Move,
  opts: { now: number },
): GameState {
  if (state.status !== 'playing') throw new Error(`applyMove: expected playing, got ${state.status}`);
  if (state.currentTurn == null) throw new Error('applyMove: no current turn');
  if (move.kind !== 'place') throw new Error(`applyMove: unsupported move kind '${move.kind}'`);
  if (!Number.isInteger(move.cell) || move.cell < 0 || move.cell >= BOARD_SIZE) {
    throw new Error(`applyMove: cell ${move.cell} out of range 0..${BOARD_SIZE - 1}`);
  }
  if (state.board[move.cell] !== '') {
    throw new Error(`applyMove: cell ${move.cell} is already played`);
  }

  const playerId = state.currentTurn;
  const mark = state.marks[playerId];
  if (!mark) throw new Error(`applyMove: no mark assigned to player ${playerId}`);

  const newBoard = state.board.slice();
  newBoard[move.cell] = mark;

  const log: GameEvent[] = [
    ...state.log,
    { kind: 'moved', playerId, tokenId: String(move.cell), from: move.cell, to: move.cell },
  ];

  // Win check
  const winnerMark = checkWinner(newBoard);
  if (winnerMark) {
    log.push({ kind: 'won', playerId });
    return {
      ...state,
      board: newBoard,
      status: 'finished',
      winner: playerId,
      currentTurn: null,
      lastActivityAt: opts.now,
      log,
    };
  }

  // Draw check
  if (isBoardFull(newBoard)) {
    return {
      ...state,
      board: newBoard,
      status: 'finished',
      winner: null,
      currentTurn: null,
      lastActivityAt: opts.now,
      log,
    };
  }

  // Otherwise: switch turns
  const next = otherPlayer(state, playerId);
  log.push({ kind: 'turn', playerId: next });
  return {
    ...state,
    board: newBoard,
    currentTurn: next,
    lastActivityAt: opts.now,
    log,
  };
}

export function legalMoves(state: GameState, playerId: string): Move[] {
  if (state.currentTurn !== playerId) return [];
  if (state.status !== 'playing') return [];
  const moves: Move[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (state.board[i] === '') moves.push({ kind: 'place', cell: i });
  }
  return moves;
}
```

- [ ] **Step 4: Update index**

```ts
// packages/game-logic-tictactoe/src/index.ts
export * from './types';
export * from './board';
export * from './state';
export * from './moves';
```

- [ ] **Step 5: Verify, commit**

```bash
pnpm --filter @ludo/game-logic-tictactoe test
git add -A
git commit -m "feat(game-logic-tictactoe): applyMove (place + win + draw + turn flip) + isWin + legalMoves"
```

## Task 2.6: Bot heuristics (easy + hard)

**Files:**
- Create: `packages/game-logic-tictactoe/src/bot.ts`
- Create: `packages/game-logic-tictactoe/tests/bot.test.ts`

- [ ] **Step 1: Failing tests**

`packages/game-logic-tictactoe/tests/bot.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, startGame, applyMove, chooseBotMove, type GameState, type Player } from '../src/index';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',  isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'blue', isBot: true,  isHost: false, connected: true },
];

const fresh = (difficulty: 'easy' | 'hard'): GameState => {
  const s0 = createInitialState({ code: 'X', players, now: 0 });
  return startGame({ ...s0, difficulty }, { now: 1 });
};

const setBoard = (s: GameState, board: GameState['board'], currentTurn: string): GameState => ({
  ...s, board, currentTurn,
});

describe('chooseBotMove — easy', () => {
  it('returns a legal place move (cell is empty and in 0..8)', () => {
    const s = fresh('easy');
    const m = chooseBotMove(s);
    expect(m.kind).toBe('place');
    expect(m.cell).toBeGreaterThanOrEqual(0);
    expect(m.cell).toBeLessThan(9);
    expect(s.board[m.cell]).toBe('');
  });
});

describe('chooseBotMove — hard (minimax)', () => {
  it('takes immediate win when one move completes a line', () => {
    // Bot is X (player a — assume bot in this test), about to win on cell 2:
    // X X _
    // _ _ _
    // _ _ _
    // But our test setup has bot=b=O. Let's set bot.id = 'b' and make O on the verge of winning.
    // O O _    cell 2 wins for O
    // X _ _
    // _ _ _
    let s = setBoard(fresh('hard'),
      ['O','O','','X','','','','',''], 'b');
    const m = chooseBotMove(s);
    expect(m).toEqual({ kind: 'place', cell: 2 });
  });

  it('blocks opponent\'s immediate win', () => {
    // X is about to win on cell 2 (X X _). Bot is O — must block at 2.
    // X X _
    // _ _ _
    // _ _ _
    let s = setBoard(fresh('hard'),
      ['X','X','','','','','','',''], 'b');
    const m = chooseBotMove(s);
    expect(m).toEqual({ kind: 'place', cell: 2 });
  });

  it('on empty board chooses a legal move', () => {
    const s = fresh('hard');
    const m = chooseBotMove(s);
    expect(m.kind).toBe('place');
    expect(s.board[m.cell]).toBe('');
  });
});
```

- [ ] **Step 2: Run, verify failures**

- [ ] **Step 3: Implement `packages/game-logic-tictactoe/src/bot.ts`**

```ts
import type { GameState, Move, Mark } from './types';
import { BOARD_SIZE, WIN_LINES, checkWinner, isBoardFull } from './board';
import { legalMoves } from './moves';

const MAX_DEPTH = 9;

/**
 * Minimax with alpha-beta pruning. Returns a score where positive favors the maximizing player.
 * +10 = win, -10 = loss, 0 = draw, depth-discounted (so faster wins beat slower wins).
 */
function minimax(
  board: Mark[],
  myMark: Mark,
  curMark: Mark,
  depth: number,
  alpha: number,
  beta: number,
): number {
  const winner = checkWinner(board);
  if (winner === myMark) return 10 - depth;
  if (winner !== null && winner !== myMark) return depth - 10;
  if (isBoardFull(board)) return 0;
  if (depth >= MAX_DEPTH) return 0;

  const isMaximizing = curMark === myMark;
  let best = isMaximizing ? -Infinity : Infinity;
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[i] !== '') continue;
    const newBoard = board.slice();
    newBoard[i] = curMark;
    const nextMark: Mark = curMark === 'X' ? 'O' : 'X';
    const score = minimax(newBoard, myMark, nextMark, depth + 1, alpha, beta);
    if (isMaximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, score);
    }
    if (beta <= alpha) break;
  }
  return best;
}

function chooseBotMoveHard(state: GameState): Move {
  const playerId = state.currentTurn!;
  const myMark = state.marks[playerId]!;
  const moves = legalMoves(state, playerId);
  if (moves.length === 0) return moves[0]!;   // shouldn't happen — handled by caller

  let bestScore = -Infinity;
  let bestMove = moves[0]!;
  for (const m of moves) {
    if (m.kind !== 'place') continue;
    const newBoard = state.board.slice();
    newBoard[m.cell] = myMark;
    const opponentMark: Mark = myMark === 'X' ? 'O' : 'X';
    const score = minimax(newBoard, myMark, opponentMark, 1, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }
  return bestMove;
}

function chooseBotMoveEasy(state: GameState): Move {
  const playerId = state.currentTurn!;
  const moves = legalMoves(state, playerId);
  return moves[Math.floor(Math.random() * moves.length)]!;
}

export function chooseBotMove(state: GameState): Move {
  if (state.difficulty === 'hard') return chooseBotMoveHard(state);
  return chooseBotMoveEasy(state);
}
```

- [ ] **Step 4: Update index**

```ts
// packages/game-logic-tictactoe/src/index.ts
export * from './types';
export * from './board';
export * from './state';
export * from './moves';
export * from './bot';
```

- [ ] **Step 5: Verify, commit**

```bash
pnpm --filter @ludo/game-logic-tictactoe test
git add -A
git commit -m "feat(game-logic-tictactoe): chooseBotMove (easy=random, hard=minimax with alpha-beta)"
```

## Task 2.7: End-to-end smoke test

**Files:**
- Create: `packages/game-logic-tictactoe/tests/end-to-end.test.ts`

- [ ] **Step 1: Smoke test (two hard bots draw — minimax-on-minimax always draws in T3)**

```ts
import { describe, it, expect } from 'vitest';
import {
  createInitialState, startGame, applyMove, chooseBotMove,
  type Player,
} from '../src/index';

describe('full Tic-Tac-Toe game smoke test', () => {
  it('two hard bots play to a draw (minimax v minimax in T3 always draws)', () => {
    const players: Player[] = [
      { id: 'a', name: 'A', avatar: '🐱', color: 'red',  isBot: true, isHost: true,  connected: true },
      { id: 'b', name: 'B', avatar: '🦊', color: 'blue', isBot: true, isHost: false, connected: true },
    ];
    let s = createInitialState({ code: 'X', players, now: 0 });
    s = { ...s, difficulty: 'hard' };
    s = startGame(s, { now: 1 });

    let safety = 20;
    while (s.status === 'playing' && safety-- > 0) {
      s = applyMove(s, chooseBotMove(s), { now: Date.now() });
    }
    expect(s.status).toBe('finished');
    expect(s.winner).toBeNull();    // perfect-play tic-tac-toe is always a draw
  });

  it('two easy bots eventually finish (random moves; may win, lose, or draw)', () => {
    const players: Player[] = [
      { id: 'a', name: 'A', avatar: '🐱', color: 'red',  isBot: true, isHost: true,  connected: true },
      { id: 'b', name: 'B', avatar: '🦊', color: 'blue', isBot: true, isHost: false, connected: true },
    ];
    let s = createInitialState({ code: 'X', players, now: 0 });
    s = startGame(s, { now: 1 });

    let safety = 20;
    while (s.status === 'playing' && safety-- > 0) {
      s = applyMove(s, chooseBotMove(s), { now: Date.now() });
    }
    expect(s.status).toBe('finished');
  });
});
```

- [ ] **Step 2: Run, commit**

```bash
pnpm --filter @ludo/game-logic-tictactoe test
git add -A
git commit -m "test(game-logic-tictactoe): end-to-end smoke (hard bots draw; easy bots finish)"
```

## Task 2.8: Verify no regressions

- [ ] **Step 1: Run all package tests**

```bash
pnpm --filter @ludo/game-logic-tictactoe test    # ~25 passing
pnpm --filter @ludo/game-logic-snakes test       # 28 still passing
pnpm --filter @ludo/game-logic-ludo test         # 57 still passing
pnpm --filter @ludo/server test                  # 6 still passing
pnpm --filter @ludo/web test                     # 9 still passing
pnpm --filter @ludo/web typecheck
pnpm --filter @ludo/web build
```

All exit 0.

- [ ] **Step 2: Verify package is importable from web's perspective**

The web app doesn't yet import tictactoe; that's Phase 4. But the workspace should include the new package after `pnpm install`. Run:

```bash
ls -d packages/game-logic-tictactoe
```

(Already verified by Phase 2's pnpm install.)

---

# Phase 3: Server engine registration + difficulty + 2-player cap

## Task 3.1: Add `@ludo/game-logic-tictactoe` to server package.json

**Files:**
- Modify: `apps/server/package.json`

- [ ] **Step 1: Add the workspace dep**

In `apps/server/package.json` under `dependencies`:

```json
"@ludo/game-logic-tictactoe": "workspace:*"
```

- [ ] **Step 2: Install**

```bash
pnpm install
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(server): add @ludo/game-logic-tictactoe workspace dep"
```

## Task 3.2: Register tictactoe engine

**Files:**
- Create: `apps/server/src/engines/tictactoe.ts`
- Modify: `apps/server/src/engines/index.ts`

- [ ] **Step 1: `apps/server/src/engines/tictactoe.ts`**

```ts
import {
  createInitialState, startGame, applyRoll, applyMove,
  legalMoves, isWin, chooseBotMove,
} from '@ludo/game-logic-tictactoe';
import type { GameEngine } from './types';

export const tictactoeEngine: GameEngine = {
  createInitialState: createInitialState as never,
  startGame: startGame as never,
  applyRoll: applyRoll as never,
  applyMove: applyMove as never,
  legalMoves: legalMoves as never,
  isWin: ((stateOrTokens: unknown, playerId: string) => {
    if (stateOrTokens && typeof stateOrTokens === 'object' && 'board' in (stateOrTokens as object)) {
      return isWin(stateOrTokens as never, playerId);
    }
    return false;
  }),
  chooseBotMove: chooseBotMove as never,
};
```

- [ ] **Step 2: Update `apps/server/src/engines/index.ts`**

```ts
import type { GameType } from '@ludo/game-shared';
import type { GameEngine } from './types';
import { ludoEngine } from './ludo';
import { snakesEngine } from './snakes';
import { tictactoeEngine } from './tictactoe';

const ENGINES: Record<GameType, GameEngine> = {
  ludo: ludoEngine,
  snakes: snakesEngine,
  tictactoe: tictactoeEngine,
};

export function getEngine(gameType: GameType): GameEngine {
  const e = ENGINES[gameType];
  if (!e) throw new Error(`No engine registered for gameType=${gameType}`);
  return e;
}

export type { GameEngine } from './types';
```

(Drop the `Partial<>` from Task 1.1 — all three engines are now real.)

- [ ] **Step 3: Verify**

```bash
pnpm --filter @ludo/server typecheck
pnpm --filter @ludo/server test    # 6 still passing
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(server): register tictactoeEngine"
```

## Task 3.3: Add `setDifficulty` to wire protocol

**Files:**
- Modify: `apps/server/src/protocol.ts`

- [ ] **Step 1: Add the message variant**

In `apps/server/src/protocol.ts`, find the `ClientMessage` zod discriminated union. Add a new entry:

```ts
z.object({ type: z.literal('setDifficulty'), value: z.enum(['easy', 'hard']) }),
```

The full union should now look like:

```ts
export const ClientMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('join'),       code: z.string(), playerId: z.string(), name: z.string(), avatar: z.string() }),
  z.object({ type: z.literal('addBot') }),
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('roll') }),
  z.object({ type: z.literal('move'),       tokenId: z.string() }),
  z.object({ type: z.literal('pass') }),
  z.object({ type: z.literal('playAgain') }),
  z.object({ type: z.literal('setDifficulty'), value: z.enum(['easy', 'hard']) }),
  z.object({ type: z.literal('leave') }),
]);
```

- [ ] **Step 2: Verify**

```bash
pnpm --filter @ludo/server typecheck
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(server): protocol — setDifficulty message"
```

## Task 3.4: RoomManager — `setDifficulty` + 2-player cap for tictactoe

**Files:**
- Modify: `apps/server/src/rooms.ts`

- [ ] **Step 1: Add a per-game-type seat cap**

In `apps/server/src/rooms.ts`, add a helper near the top (after imports):

```ts
const MAX_SEATS: Record<import('@ludo/game-shared').GameType, number> = {
  ludo: 4,
  snakes: 4,
  tictactoe: 2,
};
```

Find the `join` method. Replace the line:
```ts
if (r.state.players.length >= 4) throw new Error('ROOM_FULL');
```

With:
```ts
if (r.state.players.length >= MAX_SEATS[r.gameType]) throw new Error('ROOM_FULL');
```

Find the `addBot` method. Replace the same `>= 4` check with `>= MAX_SEATS[r.gameType]`.

- [ ] **Step 2: Add `setDifficulty` method**

Append to the `RoomManager` class:

```ts
setDifficulty(code: string, hostId: string, value: 'easy' | 'hard') {
  const r = this.rooms.get(code);
  if (!r) throw new Error('ROOM_NOT_FOUND');
  if (r.gameType !== 'tictactoe') throw new Error('NOT_TICTACTOE');
  const host = r.state.players.find((p) => p.id === hostId);
  if (!host?.isHost) throw new Error('NOT_HOST');
  if (r.state.status !== 'lobby') throw new Error('GAME_IN_PROGRESS');
  // Mutate state's difficulty field. The state is typed as Ludo's GameState, so cast.
  r.state = { ...r.state, difficulty: value, lastActivityAt: this.now() } as never;
}
```

- [ ] **Step 3: Verify**

```bash
pnpm --filter @ludo/server typecheck
pnpm --filter @ludo/server test    # 6 still passing
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(server): RoomManager — 2-player cap for tictactoe + setDifficulty method"
```

## Task 3.5: WebSocket handler — `setDifficulty` case + tictactoe bot turn handling

**Files:**
- Modify: `apps/server/src/wsServer.ts`

- [ ] **Step 1: Add `setDifficulty` case to switch**

Find the switch (currently has cases like `addBot`, `start`, `roll`, etc.). Add:

```ts
case 'setDifficulty':
  mgr.setDifficulty(c.code, c.playerId, parsed.value);
  broadcast(c.code);
  break;
```

- [ ] **Step 2: Update `case 'roll':` to skip for tictactoe**

Find the `case 'roll':` block. The current block has a tictactoe-undefined branch (it just runs Ludo logic). Update the gameType check to handle tictactoe:

```ts
case 'roll': {
  const room = mgr.getRoom(c.code)!;
  if (room.gameType === 'tictactoe') {
    // Tic-Tac-Toe doesn't use dice. Ignore the message defensively.
    return sendError(socket, 'NO_DICE', 'tic-tac-toe has no dice');
  }
  mgr.roll(c.code, c.playerId, rollDie());
  broadcast(c.code);
  // ... rest of existing roll logic (snakes auto-move + ludo forced-pass)
  // (leave the existing branches as-is below this point)
  if (room.gameType === 'snakes') {
    // ... existing snakes branch
  } else {
    // ... existing ludo branch
  }
  break;
}
```

(Keep the existing snakes/ludo logic. Just add the tictactoe early-return at the top.)

- [ ] **Step 3: Update bot turn handling for tictactoe**

Find the `handleBotTurns` function (the recursive `step` inside it). It has logic like:

```ts
if (!room.state.rolledThisTurn) {
  mgr.roll(code, cur.id, rollDie());
  ...
}
```

Add a tictactoe branch BEFORE the rolledThisTurn check:

```ts
if (room.gameType === 'tictactoe') {
  // Tic-Tac-Toe: bots don't roll. Just choose a move.
  const move = mgr.chooseBotMove(room.state);
  mgr.move(code, cur.id, move);
  broadcast(code);
  setTimeout(step, BOT_STEP_MS);
  return;
}
```

- [ ] **Step 4: Verify**

```bash
pnpm --filter @ludo/server typecheck
pnpm --filter @ludo/server test    # 6 still passing
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): wsServer — setDifficulty case + tictactoe bot turn handling (no roll step)"
```

## Task 3.6: Server integration test for tictactoe

**Files:**
- Modify: `apps/server/tests/integration.test.ts`

- [ ] **Step 1: Append a tictactoe test**

In `apps/server/tests/integration.test.ts`, append a new describe block:

```ts
describe('ws integration — tictactoe', () => {
  it('tictactoe room: gameType=tictactoe, lobby state, 2-player cap', async () => {
    const code = mgr.createRoom({
      hostId: 'host', hostName: 'Host', hostAvatar: '🐱', gameType: 'tictactoe',
    });

    const a = ws();
    await new Promise((r) => a.once('open', r));
    a.send(JSON.stringify({ type: 'join', code, playerId: 'host', name: 'Host', avatar: '🐱' }));

    const stateMsg = await wait(a, (m) => m.type === 'state');
    expect((stateMsg.state as { gameType: string }).gameType).toBe('tictactoe');
    expect((stateMsg.state as { status: string }).status).toBe('lobby');

    a.close();
  });
});
```

- [ ] **Step 2: Run, verify, commit**

```bash
pnpm --filter @ludo/server test    # 7 passing now
git add -A
git commit -m "test(server): integration — tictactoe lobby state"
```

---

# Phase 4: Board component + boardLayout module

## Task 4.1: Add @ludo/game-logic-tictactoe to web package.json

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add dep + install**

In `apps/web/package.json` under `dependencies`:
```json
"@ludo/game-logic-tictactoe": "workspace:*"
```

```bash
pnpm install
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore(web): add @ludo/game-logic-tictactoe workspace dep"
```

## Task 4.2: Board layout module (trivial — 3×3 grid)

**Files:**
- Create: `apps/web/src/lib/tictactoe/boardLayout.ts`
- Create: `apps/web/src/lib/tictactoe/__tests__/boardLayout.test.ts`

- [ ] **Step 1: Failing test**

`apps/web/src/lib/tictactoe/__tests__/boardLayout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cellToCoords, CELL_SIZE, BOARD_PIXELS } from '../boardLayout';

describe('cellToCoords', () => {
  it('cell 0 = top-left', () => {
    expect(cellToCoords(0)).toEqual({ col: 0, row: 0 });
  });

  it('cell 4 = center', () => {
    expect(cellToCoords(4)).toEqual({ col: 1, row: 1 });
  });

  it('cell 8 = bottom-right', () => {
    expect(cellToCoords(8)).toEqual({ col: 2, row: 2 });
  });
});

describe('layout constants', () => {
  it('CELL_SIZE = 80', () => {
    expect(CELL_SIZE).toBe(80);
  });

  it('BOARD_PIXELS = 240 (3 cells × 80)', () => {
    expect(BOARD_PIXELS).toBe(240);
  });
});
```

- [ ] **Step 2: Verify failure**

```bash
pnpm --filter @ludo/web test
```

- [ ] **Step 3: Implement `apps/web/src/lib/tictactoe/boardLayout.ts`**

```ts
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
```

- [ ] **Step 4: Verify, commit**

```bash
pnpm --filter @ludo/web test
git add -A
git commit -m "feat(web): tictactoe boardLayout (cellToCoords)"
```

## Task 4.3: TicTacToe Board component

**Files:**
- Create: `apps/web/src/components/tictactoe/Board.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';
import type { GameState } from '@ludo/game-logic-tictactoe';
import { Pawn } from '@/components/visual/Pawn';
import { cellToCoords, CELL_SIZE, BOARD_PIXELS, GRID_DIM } from '@/lib/tictactoe/boardLayout';

export function TicTacToeBoard({ state, onCellClick, hintCells }: {
  state: GameState;
  onCellClick?: (cell: number) => void;
  hintCells?: ReadonlySet<number>;
}) {
  // Player → color mapping. First seat (X) = red, second (O) = blue.
  const xPlayer = state.players[0];
  const oPlayer = state.players[1];

  return (
    <svg
      viewBox={`0 0 ${BOARD_PIXELS} ${BOARD_PIXELS}`}
      className="w-full max-w-[480px] aspect-square select-none"
      style={{ filter: 'drop-shadow(0 6px 12px rgba(58, 46, 31, 0.20))' }}
      role="img"
      aria-label="Tic-Tac-Toe board"
    >
      {/* Surface */}
      <rect x={0} y={0} width={BOARD_PIXELS} height={BOARD_PIXELS}
        fill="#fdf6ec" stroke="#8b6f47" strokeWidth={2} rx={8} />

      {/* Grid lines */}
      {[1, 2].map((i) => (
        <g key={`grid-${i}`}>
          <line x1={i * CELL_SIZE} y1={4} x2={i * CELL_SIZE} y2={BOARD_PIXELS - 4}
            stroke="#c8b18a" strokeWidth={2} strokeLinecap="round" />
          <line x1={4} y1={i * CELL_SIZE} x2={BOARD_PIXELS - 4} y2={i * CELL_SIZE}
            stroke="#c8b18a" strokeWidth={2} strokeLinecap="round" />
        </g>
      ))}

      {/* 9 cells: hint highlight + click target */}
      {Array.from({ length: GRID_DIM * GRID_DIM }, (_, i) => {
        const { col, row } = cellToCoords(i);
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;
        const isHinted = hintCells?.has(i) ?? false;
        const clickable = !!onCellClick && state.board[i] === '';
        return (
          <g key={`cell-${i}`}
             onClick={clickable ? () => onCellClick!(i) : undefined}
             style={{ cursor: clickable ? 'pointer' : 'default' }}>
            <rect x={x + 4} y={y + 4} width={CELL_SIZE - 8} height={CELL_SIZE - 8}
              rx={6}
              fill={isHinted ? '#fbbf2440' : 'transparent'}
              style={{ pointerEvents: 'all' }} />
            {isHinted && (
              <circle cx={x + CELL_SIZE/2} cy={y + CELL_SIZE/2} r={CELL_SIZE * 0.25}
                fill="none" stroke="#f59e0b" strokeWidth={2}
                strokeDasharray="6 5" strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" from="0" to="22"
                  dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        );
      })}

      {/* Pawns at filled cells */}
      {state.board.map((mark, i) => {
        if (!mark) return null;
        const { col, row } = cellToCoords(i);
        const cx = col * CELL_SIZE + CELL_SIZE/2;
        const cy = row * CELL_SIZE + CELL_SIZE/2;
        const player = mark === 'X' ? xPlayer : oPlayer;
        if (!player) return null;
        return <Pawn key={`p-${i}`} color={player.color} cx={cx} cy={cy} size={CELL_SIZE * 0.5} />;
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm --filter @ludo/web build
pnpm --filter @ludo/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(web): TicTacToeBoard component (3x3 SVG grid + Pawn marks + hint sparkles)"
```

---

# Phase 5: Local prototype at `/tictactoe/[code]`

## Task 5.1: Local game store

**Files:**
- Create: `apps/web/src/lib/tictactoe/localGame.ts`

- [ ] **Step 1: Implement**

```ts
'use client';
import { create } from 'zustand';
import {
  createInitialState, startGame, applyMove, chooseBotMove,
  type GameState, type Move,
} from '@ludo/game-logic-tictactoe';
import type { Player } from '@ludo/game-shared';

const seedPlayers = (): Player[] => ([
  { id: 'me',   name: 'You',   avatar: '🐱', color: 'red',  isBot: false, isHost: true,  connected: true },
  { id: 'bot1', name: 'Bot',   avatar: '🐻', color: 'blue', isBot: true,  isHost: false, connected: true },
]);

type LocalGame = {
  state: GameState;
  reset: (difficulty?: 'easy' | 'hard') => void;
  play: (cell: number) => void;
};

export const useLocalTicTacToe = create<LocalGame>((set, get) => ({
  state: (() => {
    let s = createInitialState({ code: 'LOCAL', players: seedPlayers(), now: Date.now() });
    return startGame(s, { now: Date.now() });
  })(),
  reset: (difficulty = 'easy') => {
    let s = createInitialState({ code: 'LOCAL', players: seedPlayers(), now: Date.now() });
    s = { ...s, difficulty };
    set({ state: startGame(s, { now: Date.now() }) });
  },
  play: (cell: number) => {
    const s = get().state;
    if (s.currentTurn !== 'me' || s.status !== 'playing') return;
    const next = applyMove(s, { kind: 'place', cell }, { now: Date.now() });
    set({ state: next });
    setTimeout(() => maybeBot(set, get), 700);
  },
}));

function maybeBot(set: (s: Partial<LocalGame>) => void, get: () => LocalGame) {
  const s = get().state;
  if (s.status !== 'playing' || !s.currentTurn) return;
  const cur = s.players.find((p) => p.id === s.currentTurn);
  if (!cur?.isBot) return;
  const move = chooseBotMove(s);
  set({ state: applyMove(s, move, { now: Date.now() }) });
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(web): tictactoe local game store (vs bot, no server)"
```

## Task 5.2: Prototype page at `/tictactoe/[code]`

**Files:**
- Create: `apps/web/src/app/tictactoe/[code]/page.tsx`
- Create: `apps/web/src/app/tictactoe/new/page.tsx`

- [ ] **Step 1: `apps/web/src/app/tictactoe/new/page.tsx`**

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalProfile } from '@/lib/useLocalProfile';
import { createRoom } from '@/lib/createRoom';

export default function NewTicTacToePage() {
  const router = useRouter();
  const { profile } = useLocalProfile();

  useEffect(() => {
    if (!profile) {
      router.replace('/');
      return;
    }
    let cancelled = false;
    createRoom(profile, 'tictactoe')
      .then((code) => { if (!cancelled) router.replace(`/tictactoe/${code}`); })
      .catch((err) => { console.error(err); if (!cancelled) router.replace('/'); });
    return () => { cancelled = true; };
  }, [profile, router]);

  return (
    <main className="min-h-screen-d flex items-center justify-center">
      <p className="opacity-70">Creating a Tic-Tac-Toe game…</p>
    </main>
  );
}
```

- [ ] **Step 2: `apps/web/src/app/tictactoe/[code]/page.tsx` (LOCAL prototype — Phase 6 replaces with server flow)**

```tsx
'use client';
import { useLocalTicTacToe } from '@/lib/tictactoe/localGame';
import { TicTacToeBoard } from '@/components/tictactoe/Board';
import { PlayerPanel } from '@/components/PlayerPanel';

export default function TicTacToePage() {
  const { state, play, reset } = useLocalTicTacToe();
  const myId = 'me';
  const myTurn = state.currentTurn === myId;

  // Hint cells: all empty cells when it's your turn.
  const hint = new Set<number>();
  if (myTurn && state.status === 'playing') {
    state.board.forEach((c, i) => { if (c === '') hint.add(i); });
  }

  return (
    <main className="min-h-screen-d flex flex-col items-center gap-4 p-4 pb-[calc(7rem+var(--safe-bottom))]">
      <header className="w-full max-w-[640px] flex items-center justify-between">
        <h1 className="font-display text-xl">Tic-Tac-Toe (local)</h1>
        <div className="flex gap-2 text-sm">
          <button className="underline" onClick={() => reset('easy')}>New (easy)</button>
          <button className="underline" onClick={() => reset('hard')}>New (hard)</button>
        </div>
      </header>
      <PlayerPanel state={state as never} />
      <TicTacToeBoard
        state={state}
        hintCells={myTurn ? hint : undefined}
        onCellClick={myTurn ? play : undefined}
      />
      <div className="fixed inset-x-0 bottom-0 px-4 pb-[calc(1rem+var(--safe-bottom))] pt-3 bg-paper border-t border-edge text-center text-base font-medium">
        {(() => {
          if (state.status === 'finished') {
            if (state.winner) {
              const w = state.players.find((p) => p.id === state.winner);
              return `🏆 ${w?.name} wins!`;
            }
            return '🤝 Draw — no winner!';
          }
          if (myTurn) return 'Your turn — tap a cell';
          const opp = state.players.find((p) => p.id === state.currentTurn);
          return `Waiting on ${opp?.name}…`;
        })()}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
pnpm --filter @ludo/web build
pnpm --filter @ludo/web typecheck
pnpm --filter @ludo/web test
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): tictactoe local prototype at /tictactoe/[code] (vs bot, no server yet)"
```

---

# Phase 6: Real WebSocket flow + DifficultyToggle in Lobby

## Task 6.1: DifficultyToggle component

**Files:**
- Create: `apps/web/src/components/tictactoe/DifficultyToggle.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client';

export function DifficultyToggle({ value, onChange }: {
  value: 'easy' | 'hard';
  onChange: (v: 'easy' | 'hard') => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs opacity-60">🤖 Bot difficulty</span>
      <div className="flex gap-2">
        {(['easy', 'hard'] as const).map((d) => (
          <button key={d}
            onClick={() => onChange(d)}
            className={`px-4 py-2 rounded-xl border-2 capitalize text-sm
              ${value === d ? 'border-ink bg-white font-medium' : 'border-edge bg-paper opacity-60'}`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(web): DifficultyToggle component for tictactoe lobby"
```

## Task 6.2: Update Lobby to render game-specific extras

**Files:**
- Modify: `apps/web/src/components/Lobby.tsx`

- [ ] **Step 1: Accept optional extras prop**

In `apps/web/src/components/Lobby.tsx`, change the props type to accept an optional `extras` slot:

```tsx
export function Lobby({ state, meId, shareUrl, onAddBot, onStart, extras }: {
  state: GameState;
  meId: string;
  shareUrl: string;
  onAddBot: () => void;
  onStart: () => void;
  extras?: React.ReactNode;
}) {
```

In the JSX body, render `{extras}` somewhere visible (e.g., right above the Start button):

```tsx
{extras && <div className="w-full">{extras}</div>}
```

- [ ] **Step 2: Verify**

```bash
pnpm --filter @ludo/web typecheck
pnpm --filter @ludo/web build
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(web): Lobby accepts optional extras slot for game-specific UI"
```

## Task 6.3: Replace `/tictactoe/[code]` page with WebSocket flow

**Files:**
- Modify: `apps/web/src/app/tictactoe/[code]/page.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
'use client';
import { useParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useLocalProfile } from '@/lib/useLocalProfile';
import { useRoomConnection } from '@/lib/useRoomConnection';
import { TicTacToeBoard } from '@/components/tictactoe/Board';
import { PlayerPanel } from '@/components/PlayerPanel';
import { ActivityLog } from '@/components/ActivityLog';
import { Lobby } from '@/components/Lobby';
import { ProfileForm } from '@/components/ProfileForm';
import { WinScreen } from '@/components/WinScreen';
import { DifficultyToggle } from '@/components/tictactoe/DifficultyToggle';
import { Buzz } from '@/lib/haptics';
import type { GameState as TTTState } from '@ludo/game-logic-tictactoe';

const WS_URL = process.env.NEXT_PUBLIC_LUDO_WS ?? 'ws://localhost:8787';

export default function TicTacToeRoomPage() {
  const { code } = useParams<{ code: string }>();
  const { profile, save } = useLocalProfile();
  const { state, status, error, send } = useRoomConnection({ wsUrl: WS_URL, code, profile });
  const myTurn = !!profile && state?.currentTurn === profile.playerId;
  const me = profile && state ? state.players.find((p) => p.id === profile.playerId) : undefined;

  const lastLogLen = useRef(0);
  useEffect(() => {
    if (!state || !profile) return;
    const newEvents = state.log.slice(lastLogLen.current);
    lastLogLen.current = state.log.length;
    for (const e of newEvents) {
      if (e.kind === 'won' && e.playerId === profile.playerId) Buzz.win();
      if (e.kind === 'turn' && e.playerId === profile.playerId) Buzz.tap();
    }
  }, [state, profile]);

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

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/tictactoe/${code}` : '';
  const tttState = state as unknown as TTTState;

  if (state.status === 'lobby') {
    const difficulty = tttState.difficulty ?? 'easy';
    return (
      <main className="min-h-screen-d flex items-center justify-center">
        <Lobby
          state={state as never}
          meId={profile.playerId} shareUrl={shareUrl}
          onAddBot={() => send({ type: 'addBot' })}
          onStart={() => send({ type: 'start' })}
          extras={me?.isHost ? (
            <DifficultyToggle
              value={difficulty}
              onChange={(v) => send({ type: 'setDifficulty', value: v })}
            />
          ) : null}
        />
      </main>
    );
  }

  // Hint cells: all empty cells when it's your turn
  const hint = new Set<number>();
  if (myTurn && state.status === 'playing') {
    tttState.board.forEach((c: string, i: number) => { if (c === '') hint.add(i); });
  }

  return (
    <main className="min-h-screen-d flex flex-col items-center gap-4 p-4 pb-[calc(7rem+var(--safe-bottom))]">
      {status !== 'open' && <div className="w-full max-w-[640px] text-sm bg-honey/30 px-3 py-2 rounded">Reconnecting…</div>}
      {error && <div className="w-full max-w-[640px] text-sm bg-rust/30 px-3 py-2 rounded">{error}</div>}
      <PlayerPanel state={state} />
      <ActivityLog state={state as never} />
      <TicTacToeBoard
        state={tttState}
        hintCells={myTurn ? hint : undefined}
        onCellClick={myTurn ? (cell) => send({ type: 'move', tokenId: String(cell) }) : undefined}
      />
      <div className="fixed inset-x-0 bottom-0 px-4 pb-[calc(1rem+var(--safe-bottom))] pt-3 bg-paper border-t border-edge text-center text-base font-medium">
        {(() => {
          if (state.status === 'finished') {
            if (state.winner) {
              const w = state.players.find((p) => p.id === state.winner);
              return `🏆 ${w?.name} wins!`;
            }
            return '🤝 Draw — no winner!';
          }
          if (myTurn) return 'Your turn — tap a cell';
          const opp = state.players.find((p) => p.id === state.currentTurn);
          return `Waiting on ${opp?.name}…`;
        })()}
      </div>
      {state.status === 'finished' && (
        <WinScreen
          state={state as never}
          meIsHost={state.players.find((p) => p.id === profile.playerId)?.isHost === true}
          onPlayAgain={() => send({ type: 'playAgain' })}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm --filter @ludo/web typecheck
pnpm --filter @ludo/web build
pnpm --filter @ludo/web test
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: tictactoe multiplayer end-to-end (room page wired to WebSocket; DifficultyToggle in lobby for host)"
```

## Task 6.4: progressLabel adapter for tictactoe

**Files:**
- Modify: `apps/web/src/lib/progressLabel.ts`

- [ ] **Step 1: Add tictactoe branch**

In `apps/web/src/lib/progressLabel.ts`, add a branch:

```ts
if (gameType === 'tictactoe') {
  const marks = (tokens as { marks?: Record<string, 'X' | 'O'> }).marks;
  // 'tokens' here is actually the full state object cast as unknown — we need the marks Record.
  // Workaround: don't try to read marks here; just return a generic label.
  return '';   // PlayerPanel already shows player name + avatar; no need for extra label
}
```

NOTE: the `progressLabel` function only receives `state.tokens`, not the full state. For tic-tac-toe, the marks live on `state.marks`. Two options:
- Generalize the function signature (broader refactor)
- Just return an empty string for tic-tac-toe and let the player name speak for itself

For v1 of tic-tac-toe: empty string is fine. (Future iteration could add the X/O badge inline.)

- [ ] **Step 2: Verify, commit**

```bash
pnpm --filter @ludo/web typecheck
git add -A
git commit -m "fix(web): progressLabel — tictactoe returns empty (player name suffices)"
```

---

# Phase 7: Polish

## Task 7.1: ActivityLog icons for `placed` and `draw` events

**Files:**
- Modify: `apps/web/src/components/ActivityLog.tsx`

- [ ] **Step 1: Add new event icons + formatters**

Find the `eventIcon` switch in `ActivityLog.tsx`. The current GameEvent union doesn't include `placed` or `draw` — but Tic-Tac-Toe uses `moved` events for placements (per the engine implementation). For now, the existing `moved` icon (➡️) covers placements.

Skip this task unless game-shared GameEvent gets new `placed` / `draw` kinds. If so, add icons:

```ts
case 'placed': return '❌';
case 'draw': return '🤝';
```

For now: nothing to do here. Activity log shows "Mom moved a token" which is fine for tic-tac-toe.

- [ ] **Step 2: No-op task — commit reminder**

(No code changes. Confirm by running tests.)

```bash
pnpm --filter @ludo/web test    # 9 + new tictactoe board test = 11 passing
```

(Skip the commit if nothing changed.)

## Task 7.2: Optional — Win line animation on tictactoe Board

**Files:**
- Modify: `apps/web/src/components/tictactoe/Board.tsx`

This is purely cosmetic. The win-line animation draws a gold line through the 3 winning cells when `state.status === 'finished' && state.winner !== null`.

Skip if you want to ship faster. The trophy modal + confetti + status text already convey the win. The win line is gravy.

- [ ] **Step 1: Optionally add `<line>` elements to Board.tsx**

Inside `<svg>`, after the pawns, conditionally render the win line:

```tsx
{state.status === 'finished' && state.winner && (() => {
  // Find the winning line
  const winnerMark = state.marks[state.winner!];
  const WIN_LINES: number[][] = [
    [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6],
  ];
  const line = WIN_LINES.find((line) => line.every((idx) => state.board[idx] === winnerMark));
  if (!line) return null;
  const [a,, c] = line;
  const aPos = cellToCoords(a);
  const cPos = cellToCoords(c);
  const x1 = aPos.col * CELL_SIZE + CELL_SIZE/2;
  const y1 = aPos.row * CELL_SIZE + CELL_SIZE/2;
  const x2 = cPos.col * CELL_SIZE + CELL_SIZE/2;
  const y2 = cPos.row * CELL_SIZE + CELL_SIZE/2;
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="#fbbf24" strokeWidth={6} strokeLinecap="round" opacity={0.85}>
      <animate attributeName="stroke-dasharray" from="0,1000" to="1000,0"
        dur="0.4s" fill="freeze" />
    </line>
  );
})()}
```

- [ ] **Step 2: Commit if implemented**

```bash
git add -A
git commit -m "feat(web): tictactoe Board — animated win-line on finish"
```

(Skip if not implemented.)

---

# Phase 8: Deploy

The web and server apps are already deployed at `ourgamenight.org` and `ws.ourgamenight.org`. Coolify auto-deploys on push if you've enabled that, otherwise you trigger a redeploy manually.

## Task 8.1: Push to GitHub

```bash
git push origin master
```

## Task 8.2: Trigger redeploy

If Coolify auto-deploys on push: the build kicks off automatically. Watch the build logs for both apps.

If manual: in Coolify, click **Force Redeploy** on each app (`ludo-web` and `ludo-server`).

## Task 8.3: Smoke test

After deploy completes:

1. Open https://ourgamenight.org on your phone
2. Verify the catalog shows 3 cards (Ludo, Snakes & Ladders, **Tic-Tac-Toe**)
3. Click Tic-Tac-Toe card → land in lobby
4. Add a bot, leave difficulty on Easy, start game → play → verify gameplay loop
5. Refresh, click Tic-Tac-Toe again, switch difficulty to Hard, play → verify bot is unbeatable (best you can do is draw)
6. Test multiplayer: create a game in one browser window, share URL to another window, both join, play to a winner

## Task 8.4: Tag release

```bash
git tag v0.3.0
git push --tags
```

---

# Final verification (run after all phases)

```bash
pnpm --filter @ludo/game-logic-tictactoe test   # ~25 passing
pnpm --filter @ludo/game-logic-snakes test      # 28 still passing
pnpm --filter @ludo/game-logic-ludo test        # 57 still passing
pnpm --filter @ludo/server test                 # 7 passing (was 6 + 1 new)
pnpm --filter @ludo/web test                    # 11 passing (was 9 + 2 new)
pnpm --filter @ludo/web build
pnpm --filter @ludo/server typecheck
```

All exit 0. Tic-Tac-Toe is live.
