# OurGameNight v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the deployed Ludo single-game app into a multi-game family hub at `ourgamenight.org` with Snakes & Ladders as a second game and a shared "v2 look" (3D pawns + dimensional boards via SVG/CSS).

**Architecture:** pnpm monorepo restructured around a shared engine interface. New `packages/game-shared` (types) and `packages/game-logic-snakes` (rules) sit alongside the renamed `packages/game-logic-ludo`. The existing `apps/server` extends with an engine registry keyed by `gameType`. The existing `apps/web` becomes a multi-game shell with a catalog landing and per-game routes (`/ludo/[code]`, `/snakes/[code]`).

**Tech Stack:** TypeScript, pnpm workspaces, vitest, Next.js 16 (App Router), React 19, Tailwind v4, `ws` (Node WebSocket library), zod. Deploy via Coolify on user's VPS. **No Three.js — all 3D via SVG + CSS.**

**Spec:** `docs/superpowers/specs/2026-05-01-ourgamenight-v2-design.md`

**Builds on:** `docs/superpowers/plans/2026-04-29-ludo-implementation.md` (v1 — fully implemented and deployed)

---

## Phases

- **Phase 1** — Restructure (rename `game-logic` → `game-logic-ludo`, create `game-shared`)
- **Phase 2** — Server multi-game scaffolding (`gameType` field + engine registry)
- **Phase 3** — Web app restructure (catalog landing, `/ludo/[code]` route, profile)
- **Phase 4** — Snakes & Ladders rules engine (TDD)
- **Phase 5** — S&L UI local prototype (vs bots)
- **Phase 6** — S&L on the server (multiplayer)
- **Phase 7** — v2 visual pass (3D pawns, dimensional boards, ladder/snake art, animations) — applied to BOTH games
- **Phase 8** — Deploy `ourgamenight.org`, sunset `ludo.ourgamenight.org`

Each task ends with green tests (or live-checked UI for visual tasks) and a commit.

---

# Phase 1: Restructure

Mechanical refactor. Zero behavior change. All 65 existing tests (57 game-logic + 5 server + 3 web) must still pass at the end of each task.

## Task 1.1: Create `packages/game-shared`

**Files:**
- Create: `packages/game-shared/package.json`
- Create: `packages/game-shared/tsconfig.json`
- Create: `packages/game-shared/src/index.ts`
- Create: `packages/game-shared/src/types.ts`

A pure types-only package. Houses the shared `GameType`, `Player`, `Profile`, base `GameEvent`, and the future engine-agnostic message shapes.

- [ ] **Step 1: `packages/game-shared/package.json`**

```json
{
  "name": "@ludo/game-shared",
  "version": "0.0.1",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "echo skip",
    "typecheck": "tsc --noEmit",
    "lint": "echo skip"
  },
  "devDependencies": {
    "typescript": "5.5"
  }
}
```

- [ ] **Step 2: `packages/game-shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: `packages/game-shared/src/types.ts`**

```ts
export type GameType = 'ludo' | 'snakes';

export type Color = 'red' | 'green' | 'blue' | 'yellow';

export const COLORS: readonly Color[] = ['red', 'green', 'yellow', 'blue'] as const;

export type Player = {
  id: string;
  name: string;
  avatar: string;
  color: Color;
  isBot: boolean;
  isHost: boolean;
  connected: boolean;
};

export type Profile = {
  playerId: string;
  name: string;
  avatar: string;
};

/**
 * Common shape across all games. Per-game state extends this with extras
 * (Ludo: tokens; S&L: token square positions).
 */
export type BaseGameState = {
  code: string;
  gameType: GameType;
  status: 'lobby' | 'playing' | 'finished';
  players: Player[];
  turnOrder: string[];
  currentTurn: string | null;
  dice: number | null;
  rolledThisTurn: boolean;
  winner: string | null;
  log: GameEvent[];
  createdAt: number;
  lastActivityAt: number;
};

export type GameEvent =
  | { kind: 'rolled'; playerId: string; value: number }
  | { kind: 'moved'; playerId: string; tokenId: string; from: unknown; to: unknown }
  | { kind: 'captured'; capturer: string; victim: string; tokenId: string }
  | { kind: 'turn'; playerId: string }
  | { kind: 'won'; playerId: string }
  | { kind: 'snake'; playerId: string; from: number; to: number }
  | { kind: 'ladder'; playerId: string; from: number; to: number };
```

- [ ] **Step 4: `packages/game-shared/src/index.ts`**

```ts
export * from './types';
```

- [ ] **Step 5: Install + verify**

```bash
pnpm install
pnpm --filter @ludo/game-shared typecheck
```
Expected: install succeeds (new workspace package picked up); typecheck exits 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(game-shared): scaffold shared types package (GameType, Player, BaseGameState, GameEvent)"
```

---

## Task 1.2: Rename `packages/game-logic` → `packages/game-logic-ludo`

**Files:**
- Move: `packages/game-logic/` → `packages/game-logic-ludo/`
- Modify: `packages/game-logic-ludo/package.json` (rename `name`)
- Modify: `apps/server/package.json` (update workspace dep name)
- Modify: `apps/web/package.json` (update workspace dep name)
- Modify: every import statement that references `@ludo/game-logic`

- [ ] **Step 1: Move the directory**

```bash
git mv packages/game-logic packages/game-logic-ludo
```

(Use `git mv` so git tracks the rename rather than recording delete + add.)

- [ ] **Step 2: Update `packages/game-logic-ludo/package.json`**

Change `"name": "@ludo/game-logic"` to `"name": "@ludo/game-logic-ludo"`. Leave everything else.

- [ ] **Step 3: Update workspace consumers**

In `apps/server/package.json`, find `"@ludo/game-logic": "workspace:*"` under dependencies and change to `"@ludo/game-logic-ludo": "workspace:*"`.

In `apps/web/package.json`, do the same change.

- [ ] **Step 4: Update all import statements**

Run a grep to find remaining `@ludo/game-logic` imports (excluding the renamed package itself):

```bash
grep -rln "@ludo/game-logic[^-]" apps/ packages/ 2>/dev/null
```

For each file listed, replace `@ludo/game-logic` with `@ludo/game-logic-ludo`. Be careful not to also rewrite occurrences of `@ludo/game-logic-ludo` (the new name) — the regex `@ludo/game-logic[^-]` excludes those.

Expected files to touch:
- `apps/server/src/rooms.ts`
- `apps/server/src/wsServer.ts`
- `apps/server/tests/integration.test.ts`
- `apps/web/src/lib/localGame.ts`
- `apps/web/src/lib/useRoomConnection.ts`
- `apps/web/src/lib/boardLayout.ts`
- `apps/web/src/components/Board.tsx`
- `apps/web/src/components/PlayerPanel.tsx`
- `apps/web/src/components/Lobby.tsx`
- `apps/web/src/components/ActivityLog.tsx`
- `apps/web/src/components/WinScreen.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/room/[code]/page.tsx`

(Use Edit/MultiEdit per file. No sed — keep edits explicit.)

- [ ] **Step 5: Run install + verify everything still passes**

```bash
pnpm install
pnpm --filter @ludo/game-logic-ludo test     # 57 passing
pnpm --filter @ludo/server test              # 5 passing
pnpm --filter @ludo/web test                 # 3 passing
pnpm --filter @ludo/web typecheck
pnpm --filter @ludo/web build
```

If any test fails, look for missed imports. The build should also succeed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename @ludo/game-logic → @ludo/game-logic-ludo"
```

---

## Task 1.3: Wire `@ludo/game-shared` as a dependency where needed

**Files:**
- Modify: `packages/game-logic-ludo/package.json`
- Modify: `apps/server/package.json`
- Modify: `apps/web/package.json`

The shared types package needs to be listed as a dependency before any consumer can import from it.

- [ ] **Step 1: Add to `packages/game-logic-ludo/package.json`** under `dependencies`:

```json
"dependencies": {
  "@ludo/game-shared": "workspace:*"
}
```

(Add the `dependencies` field if it doesn't exist.)

- [ ] **Step 2: Add to `apps/server/package.json`** under `dependencies`:

Same line. Keep all existing deps.

- [ ] **Step 3: Add to `apps/web/package.json`** under `dependencies`:

Same line.

- [ ] **Step 4: Install + verify**

```bash
pnpm install
pnpm --filter @ludo/game-logic-ludo typecheck
pnpm --filter @ludo/server typecheck
pnpm --filter @ludo/web typecheck
```

All exit 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: wire @ludo/game-shared as workspace dep in ludo, server, web"
```

---

# Phase 2: Server multi-game scaffolding

Add `gameType` to the room data model and an engine registry so the server can dispatch to either Ludo or Snakes & Ladders. Backwards-compatible: any code that doesn't specify a `gameType` defaults to `'ludo'`.

## Task 2.1: Engine interface + registry

**Files:**
- Create: `apps/server/src/engines/types.ts`
- Create: `apps/server/src/engines/index.ts`
- Create: `apps/server/src/engines/ludo.ts`

The shared interface every game's rules engine satisfies. The Ludo engine wraps the existing `@ludo/game-logic-ludo` exports into the interface.

- [ ] **Step 1: `apps/server/src/engines/types.ts`**

```ts
import type { BaseGameState, Player } from '@ludo/game-shared';

export interface GameEngine<S extends BaseGameState = BaseGameState, M = unknown> {
  createInitialState(input: { code: string; players: Player[]; now: number }): S;
  startGame(state: S, opts: { now: number }): S;
  applyRoll(state: S, value: number, opts: { now: number }): S;
  applyMove(state: S, move: M, opts: { now: number }): S;
  legalMoves(state: S, playerId: string): M[];
  isWin(tokens: S['tokens'] | unknown, playerId: string): boolean;
  chooseBotMove(state: S): M;
}
```

(`isWin` is intentionally typed permissively — Ludo's signature passes `tokens` directly; S&L's takes the full state. The dispatcher always passes the right shape per game.)

- [ ] **Step 2: `apps/server/src/engines/ludo.ts`**

```ts
import {
  createInitialState, startGame, applyRoll, applyMove,
  legalMoves, isWin, chooseBotMove,
} from '@ludo/game-logic-ludo';
import type { GameEngine } from './types';

export const ludoEngine: GameEngine = {
  createInitialState,
  startGame,
  applyRoll,
  applyMove,
  legalMoves,
  isWin,
  chooseBotMove,
};
```

- [ ] **Step 3: `apps/server/src/engines/index.ts`**

```ts
import type { GameType } from '@ludo/game-shared';
import type { GameEngine } from './types';
import { ludoEngine } from './ludo';

const ENGINES: Record<GameType, GameEngine> = {
  ludo: ludoEngine,
  // snakes: snakesEngine — registered in Task 6.1
} as Record<GameType, GameEngine>;

export function getEngine(gameType: GameType): GameEngine {
  const e = ENGINES[gameType];
  if (!e) throw new Error(`No engine registered for gameType=${gameType}`);
  return e;
}

export type { GameEngine } from './types';
```

(The `as Record<...>` cast lets us register engines incrementally without TS complaining about the missing `snakes` entry. We'll add it for real in Task 6.1.)

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @ludo/server typecheck
```
Exit 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): GameEngine interface + engine registry (Ludo registered)"
```

---

## Task 2.2: Add `gameType` to RoomManager

**Files:**
- Modify: `apps/server/src/rooms.ts`

- [ ] **Step 1: Update `Room` shape and `createRoom` signature**

In `apps/server/src/rooms.ts`, find the `Room` type and add a `gameType` field:

```ts
export type Room = {
  code: string;
  gameType: import('@ludo/game-shared').GameType;
  state: GameState;
  listeners: Map<string, Set<(s: GameState) => void>>;
};
```

Change `createRoom` to accept `gameType` (defaulting to `'ludo'` for backward compat with the existing HTTP endpoint until we update it in Task 2.3):

```ts
createRoom(args: {
  hostId: string;
  hostName: string;
  hostAvatar: string;
  gameType?: import('@ludo/game-shared').GameType;
}): string {
  const gameType = args.gameType ?? 'ludo';
  let code = code4();
  while (this.rooms.has(code)) code = code4();
  const host: Player = {
    id: args.hostId, name: args.hostName, avatar: args.hostAvatar,
    color: 'red', isBot: false, isHost: true, connected: true,
  };
  // For now, both games use createInitialState from the Ludo engine for the lobby.
  // The actual game state will be created at start time via the appropriate engine.
  const state: GameState = {
    code,
    gameType,    // NEW
    status: 'lobby',
    players: [host],
    turnOrder: [],
    currentTurn: null,
    dice: null,
    rolledThisTurn: false,
    consecutiveSixes: 0,
    tokens: { [host.id]: [] },  // populated when game type's engine takes over
    winner: null,
    log: [],
    createdAt: this.now(),
    lastActivityAt: this.now(),
  };
  this.rooms.set(code, { code, gameType, state, listeners: new Map() });
  return code;
}
```

NOTE: this is the Ludo-only lobby shape. Once the engine registry is dispatching, S&L will overwrite tokens at `start` time (Task 6.x).

- [ ] **Step 2: Update `start`, `roll`, `move` to dispatch via engine**

Currently `RoomManager.start/roll/move` call functions imported from `@ludo/game-logic-ludo` directly. Change them to use the registry:

```ts
import { getEngine } from './engines/index.js';

start(code: string, hostId: string): GameState {
  const r = this.rooms.get(code);
  if (!r) throw new Error('ROOM_NOT_FOUND');
  const host = r.state.players.find((p) => p.id === hostId);
  if (!host?.isHost) throw new Error('NOT_HOST');
  const engine = getEngine(r.gameType);
  // For game start, re-create the initial state via the engine to get the right shape (e.g., S&L token = 0).
  // Carry over the players from the lobby.
  const players = r.state.players;
  let state = engine.createInitialState({ code, players, now: this.now() });
  state = engine.startGame(state, { now: this.now() });
  r.state = state;
  return r.state;
}

roll(code: string, playerId: string, value: number): GameState {
  const r = this.rooms.get(code);
  if (!r) throw new Error('ROOM_NOT_FOUND');
  if (r.state.currentTurn !== playerId) throw new Error('NOT_YOUR_TURN');
  const engine = getEngine(r.gameType);
  r.state = engine.applyRoll(r.state, value, { now: this.now() });
  return r.state;
}

move(code: string, playerId: string, move: unknown): GameState {
  const r = this.rooms.get(code);
  if (!r) throw new Error('ROOM_NOT_FOUND');
  if (r.state.currentTurn !== playerId) throw new Error('NOT_YOUR_TURN');
  const engine = getEngine(r.gameType);
  r.state = engine.applyMove(r.state, move, { now: this.now() });
  return r.state;
}

// chooseBotMove now dispatches via engine too:
chooseBotMove = (state: GameState) => {
  const engine = getEngine(state.gameType);
  return engine.chooseBotMove(state);
};
```

(Drop the existing top-level `import { applyRoll, applyMove, ... }` lines — only keep what's still used like `COLORS`.)

- [ ] **Step 3: Run server tests**

```bash
pnpm --filter @ludo/server test
```

Expected: 5 still passing. The integration test creates a room with the default `gameType = 'ludo'` so it should still work.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(server): RoomManager dispatches via engine registry (gameType-aware)"
```

---

## Task 2.3: Extend `POST /rooms` to accept `gameType`

**Files:**
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Update the HTTP handler**

In `apps/server/src/index.ts`, find the `POST /rooms` block:

```ts
const { hostId, name, avatar } = JSON.parse(body || '{}');
if (!hostId || !name) {
  res.statusCode = 400; res.end(JSON.stringify({ error: 'missing fields' })); return;
}
const code = mgr.createRoom({ hostId, hostName: name, hostAvatar: avatar ?? '🐱' });
```

Change to:

```ts
const { hostId, name, avatar, gameType } = JSON.parse(body || '{}');
if (!hostId || !name) {
  res.statusCode = 400; res.end(JSON.stringify({ error: 'missing fields' })); return;
}
const validGameTypes = ['ludo', 'snakes'];
const game = (gameType && validGameTypes.includes(gameType)) ? gameType : 'ludo';
const code = mgr.createRoom({ hostId, hostName: name, hostAvatar: avatar ?? '🐱', gameType: game });
res.setHeader('content-type', 'application/json');
res.end(JSON.stringify({ code, gameType: game }));
```

- [ ] **Step 2: Add a `GET /rooms/:code` endpoint** so the web client can look up which game a code belongs to (for the "join with code" flow)

Add this case in the `httpServer.createServer` callback, before the 404 fallthrough:

```ts
const roomMatch = req.url?.match(/^\/rooms\/([A-Z]{4})$/);
if (req.method === 'GET' && roomMatch) {
  const code = roomMatch[1]!;
  const r = mgr.getRoom(code);
  if (!r) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ code, gameType: r.gameType }));
  return;
}
```

- [ ] **Step 3: Smoke test**

```bash
pnpm --filter @ludo/server dev   # starts on :8787
```

In another terminal:

```bash
curl -s -XPOST http://localhost:8787/rooms \
  -H 'content-type: application/json' \
  -d '{"hostId":"h","name":"Host","avatar":"🐱","gameType":"ludo"}'
# expect: {"code":"XXXX","gameType":"ludo"}

curl -s http://localhost:8787/rooms/XXXX  # use the code from above
# expect: {"code":"XXXX","gameType":"ludo"}
```

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(server): POST /rooms accepts gameType; GET /rooms/:code exposes it"
```

---

# Phase 3: Web app restructure

Convert `apps/web` from "Ludo app" into "multi-game shell." New landing page (catalog), Ludo room moves from `/room/[code]` to `/ludo/[code]`. End state: family hits the new URL → identical Ludo experience as v1.

## Task 3.1: Move Ludo route from `/room/[code]` to `/ludo/[code]`

**Files:**
- Move: `apps/web/src/app/room/[code]/page.tsx` → `apps/web/src/app/ludo/[code]/page.tsx`
- Delete: `apps/web/src/app/room/` (after move)

- [ ] **Step 1: Move the route**

```bash
mkdir -p apps/web/src/app/ludo
git mv apps/web/src/app/room/\[code\]/page.tsx apps/web/src/app/ludo/\[code\]/page.tsx
rmdir apps/web/src/app/room/\[code\]
rmdir apps/web/src/app/room
```

- [ ] **Step 2: Verify the page still typechecks**

```bash
pnpm --filter @ludo/web typecheck
```

(No code changes needed inside the page yet — the route just lives at a different URL.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor(web): move Ludo room route from /room/[code] to /ludo/[code]"
```

---

## Task 3.2: New catalog landing page at `/`

**Files:**
- Modify: `apps/web/src/app/page.tsx` (replace landing with catalog)
- Create: `apps/web/src/components/GameCard.tsx`

The landing now shows a card per game. Picking a card → routes to that game's "create or join" flow. Profile is set on first visit (same as before).

- [ ] **Step 1: `apps/web/src/components/GameCard.tsx`**

```tsx
'use client';
import Link from 'next/link';

export function GameCard({
  href, name, tagline, accent, icon,
}: {
  href: string;
  name: string;
  tagline: string;
  accent: string;        // a Tailwind bg class, e.g. 'bg-rust/30'
  icon: string;          // emoji
}) {
  return (
    <Link href={href}
      className={`flex flex-col items-start gap-2 p-5 rounded-2xl border-2 border-edge ${accent}
        active:scale-95 transition-transform shadow-md`}
    >
      <div className="text-4xl">{icon}</div>
      <h3 className="font-display text-2xl">{name}</h3>
      <p className="text-sm opacity-70">{tagline}</p>
    </Link>
  );
}
```

- [ ] **Step 2: Replace `apps/web/src/app/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalProfile } from '@/lib/useLocalProfile';
import { ProfileForm } from '@/components/ProfileForm';
import { GameCard } from '@/components/GameCard';

const HTTP_URL = process.env.NEXT_PUBLIC_LUDO_HTTP ?? 'http://localhost:8787';

export default function Home() {
  const router = useRouter();
  const { profile, save } = useLocalProfile();
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  if (!profile) {
    return (
      <main className="min-h-screen-d flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <h1 className="font-display text-3xl">Game Night</h1>
          <p className="opacity-70 text-sm text-center">Pick a name and avatar so your family knows it&apos;s you.</p>
          <ProfileForm onSave={save} />
        </div>
      </main>
    );
  }

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) return;
    // Look up the game type for this code so we route to the right page
    try {
      const r = await fetch(`${HTTP_URL}/rooms/${code}`);
      if (!r.ok) {
        setJoinError('No game found with that code.');
        return;
      }
      const { gameType } = await r.json();
      router.push(`/${gameType}/${code}`);
    } catch {
      setJoinError('Could not reach the server.');
    }
  };

  return (
    <main className="min-h-screen-d flex flex-col items-center gap-8 p-4 pt-12">
      <header className="flex flex-col items-center gap-2">
        <h1 className="font-display text-4xl">Game Night</h1>
        <p className="text-sm opacity-70">Hi <strong>{profile.name}</strong> {profile.avatar}</p>
      </header>

      <section className="w-full max-w-sm flex flex-col gap-4">
        <h2 className="font-display text-xl">Pick a game</h2>
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
      </section>

      <section className="w-full max-w-sm flex flex-col gap-2">
        <h2 className="font-display text-xl">Join with a code</h2>
        <form onSubmit={join} className="flex flex-col gap-2">
          <input
            inputMode="text" autoCapitalize="characters" maxLength={4}
            value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="4-letter code"
            className="px-3 py-3 rounded-xl border border-edge bg-white text-center tracking-widest text-xl"
          />
          <button type="submit" className="bg-paper border-2 border-ink py-3 rounded-xl">Join</button>
          {joinError && <p className="text-sm text-rust">{joinError}</p>}
        </form>
      </section>
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

All exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): catalog landing with GameCard for Ludo + Snakes & Ladders"
```

---

## Task 3.3: "Create new game" routes — `/ludo/new` and `/snakes/new`

**Files:**
- Create: `apps/web/src/app/ludo/new/page.tsx`
- Create: `apps/web/src/app/snakes/new/page.tsx`
- Create: `apps/web/src/lib/createRoom.ts`

When the user clicks a game card, they hit `/<game>/new`, which calls the server's `POST /rooms` with the right `gameType` and redirects to `/<game>/<code>`.

- [ ] **Step 1: `apps/web/src/lib/createRoom.ts`**

```ts
import type { GameType, Profile } from '@ludo/game-shared';

const HTTP_URL = process.env.NEXT_PUBLIC_LUDO_HTTP ?? 'http://localhost:8787';

export async function createRoom(profile: Profile, gameType: GameType): Promise<string> {
  const r = await fetch(`${HTTP_URL}/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      hostId: profile.playerId,
      name: profile.name,
      avatar: profile.avatar,
      gameType,
    }),
  });
  if (!r.ok) throw new Error('Could not create room');
  const { code } = await r.json();
  return code;
}
```

- [ ] **Step 2: `apps/web/src/app/ludo/new/page.tsx`**

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalProfile } from '@/lib/useLocalProfile';
import { createRoom } from '@/lib/createRoom';

export default function NewLudoPage() {
  const router = useRouter();
  const { profile } = useLocalProfile();

  useEffect(() => {
    if (!profile) {
      router.replace('/');
      return;
    }
    let cancelled = false;
    createRoom(profile, 'ludo')
      .then((code) => { if (!cancelled) router.replace(`/ludo/${code}`); })
      .catch((err) => { console.error(err); if (!cancelled) router.replace('/'); });
    return () => { cancelled = true; };
  }, [profile, router]);

  return (
    <main className="min-h-screen-d flex items-center justify-center">
      <p className="opacity-70">Creating a Ludo game…</p>
    </main>
  );
}
```

- [ ] **Step 3: `apps/web/src/app/snakes/new/page.tsx`**

Same as above but with `'snakes'` and "Snakes & Ladders" copy.

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalProfile } from '@/lib/useLocalProfile';
import { createRoom } from '@/lib/createRoom';

export default function NewSnakesPage() {
  const router = useRouter();
  const { profile } = useLocalProfile();

  useEffect(() => {
    if (!profile) {
      router.replace('/');
      return;
    }
    let cancelled = false;
    createRoom(profile, 'snakes')
      .then((code) => { if (!cancelled) router.replace(`/snakes/${code}`); })
      .catch((err) => { console.error(err); if (!cancelled) router.replace('/'); });
    return () => { cancelled = true; };
  }, [profile, router]);

  return (
    <main className="min-h-screen-d flex items-center justify-center">
      <p className="opacity-70">Creating a Snakes & Ladders game…</p>
    </main>
  );
}
```

- [ ] **Step 4: Build + typecheck**

```bash
pnpm --filter @ludo/web build
pnpm --filter @ludo/web typecheck
```

Note: clicking the Snakes card will redirect to `/snakes/[code]` which doesn't exist yet (404). That's expected — Phase 5 builds it.

- [ ] **Step 5: End-to-end manual test**

In two terminals:
```bash
pnpm dev:server
pnpm dev:web
```

Open http://localhost:3000:
1. Set name + avatar
2. Click "Ludo" card → should redirect to `/ludo/<NEW_CODE>` and show the Ludo lobby
3. Open `/snakes/new` → should redirect to `/snakes/<NEW_CODE>` then 404 (snakes page not built yet)

If Ludo flow works end-to-end, you're good.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): /<game>/new pages create room via server and redirect"
```

---

## Task 3.4: Move Ludo Board component into a Ludo subfolder

**Files:**
- Move: `apps/web/src/components/Board.tsx` → `apps/web/src/components/ludo/Board.tsx`
- Move: `apps/web/src/lib/boardLayout.ts` → `apps/web/src/lib/ludo/boardLayout.ts`
- Move: `apps/web/src/lib/__tests__/boardLayout.test.ts` → `apps/web/src/lib/ludo/__tests__/boardLayout.test.ts`
- Modify: `apps/web/src/app/ludo/[code]/page.tsx` (update imports)
- Modify: `apps/web/src/lib/localGame.ts` → `apps/web/src/lib/ludo/localGame.ts` (move + rename)

This isolates Ludo-specific UI in its own subdirectory so S&L UI doesn't collide.

- [ ] **Step 1: Move files**

```bash
mkdir -p apps/web/src/components/ludo
mkdir -p apps/web/src/lib/ludo/__tests__

git mv apps/web/src/components/Board.tsx apps/web/src/components/ludo/Board.tsx
git mv apps/web/src/lib/boardLayout.ts apps/web/src/lib/ludo/boardLayout.ts
git mv apps/web/src/lib/__tests__/boardLayout.test.ts apps/web/src/lib/ludo/__tests__/boardLayout.test.ts
git mv apps/web/src/lib/localGame.ts apps/web/src/lib/ludo/localGame.ts
```

- [ ] **Step 2: Update imports in moved files**

In `apps/web/src/components/ludo/Board.tsx`, find the `import { ... } from '@/lib/boardLayout'` line and change to:
```ts
import { ... } from '@/lib/ludo/boardLayout';
```

In `apps/web/src/lib/ludo/__tests__/boardLayout.test.ts`, change `from '../boardLayout'` to `from '../boardLayout'` (already relative, should work — verify).

- [ ] **Step 3: Update consumers**

In `apps/web/src/app/ludo/[code]/page.tsx`:
- Change `import { Board } from '@/components/Board';` → `from '@/components/ludo/Board';`

If `localGame.ts` is referenced anywhere (it shouldn't be — the local prototype was replaced by the multiplayer flow in Phase 5 of v1):
```bash
grep -rn 'lib/localGame' apps/web/src
```
Replace with `lib/ludo/localGame`.

- [ ] **Step 4: Verify**

```bash
pnpm --filter @ludo/web typecheck
pnpm --filter @ludo/web build
pnpm --filter @ludo/web test
```

All exit 0. Tests still 3 passing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(web): move Ludo-specific components and lib into /ludo subfolders"
```

---

# Phase 4: Snakes & Ladders rules engine (TDD)

Pure module, strict TDD throughout. Same pattern as Ludo but with simpler rules.

## Task 4.1: Initialize `@ludo/game-logic-snakes` package

**Files:**
- Create: `packages/game-logic-snakes/package.json`
- Create: `packages/game-logic-snakes/tsconfig.json`
- Create: `packages/game-logic-snakes/vitest.config.ts`
- Create: `packages/game-logic-snakes/src/index.ts`

- [ ] **Step 1: `packages/game-logic-snakes/package.json`**

```json
{
  "name": "@ludo/game-logic-snakes",
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

- [ ] **Step 2: `packages/game-logic-snakes/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: `packages/game-logic-snakes/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
```

- [ ] **Step 4: `packages/game-logic-snakes/src/index.ts`**

```ts
// Public exports added in subsequent tasks.
export {};
```

- [ ] **Step 5: Install + commit**

```bash
pnpm install
git add -A
git commit -m "feat(game-logic-snakes): scaffold package"
```

---

## Task 4.2: Types

**Files:**
- Create: `packages/game-logic-snakes/src/types.ts`

- [ ] **Step 1: Write `types.ts`**

```ts
import type { BaseGameState, Player, GameEvent } from '@ludo/game-shared';

/** Square 0 = off the board (haven't moved yet). 1..100 = board squares. 100 = win. */
export type Square = number;

export type GameState = BaseGameState & {
  /** Mapping of playerId → current square (0..100). */
  tokens: Record<string, Square>;
};

export type Move = { kind: 'auto' };
// S&L has no decisions per turn — the only "move" is to commit the dice roll.
// This kind: 'auto' move is what the server sends to apply the roll deterministically.

export type { Player, GameEvent } from '@ludo/game-shared';
```

- [ ] **Step 2: Update `src/index.ts`**

```ts
export * from './types';
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(game-logic-snakes): core types (Square, GameState, Move)"
```

---

## Task 4.3: Board geometry constants

**Files:**
- Create: `packages/game-logic-snakes/src/board.ts`
- Create: `packages/game-logic-snakes/tests/board.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/game-logic-snakes/tests/board.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { LADDERS, SNAKES, BOARD_SIZE, FINISH, resolveLanding } from '../src/board';

describe('board constants', () => {
  it('has 100 squares', () => {
    expect(BOARD_SIZE).toBe(100);
    expect(FINISH).toBe(100);
  });

  it('Milton Bradley 1943 ladders layout (9 ladders)', () => {
    expect(Object.keys(LADDERS)).toHaveLength(9);
    expect(LADDERS[1]).toBe(38);
    expect(LADDERS[80]).toBe(100);
  });

  it('Milton Bradley 1943 snakes layout (10 snakes)', () => {
    expect(Object.keys(SNAKES)).toHaveLength(10);
    expect(SNAKES[16]).toBe(6);
    expect(SNAKES[98]).toBe(78);
  });

  it('every ladder goes UP (top > bottom)', () => {
    for (const [bottom, top] of Object.entries(LADDERS)) {
      expect(top).toBeGreaterThan(Number(bottom));
    }
  });

  it('every snake goes DOWN (tail < head)', () => {
    for (const [head, tail] of Object.entries(SNAKES)) {
      expect(tail).toBeLessThan(Number(head));
    }
  });
});

describe('resolveLanding', () => {
  it('returns the same square if no snake or ladder', () => {
    expect(resolveLanding(50)).toBe(50);
  });

  it('climbs a ladder', () => {
    expect(resolveLanding(1)).toBe(38);
    expect(resolveLanding(80)).toBe(100);
  });

  it('slides down a snake', () => {
    expect(resolveLanding(16)).toBe(6);
    expect(resolveLanding(98)).toBe(78);
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
pnpm --filter @ludo/game-logic-snakes test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/game-logic-snakes/src/board.ts`**

```ts
export const BOARD_SIZE = 100;
export const FINISH = 100;

/** Ladders: bottom → top. Standard "Milton Bradley 1943" layout. */
export const LADDERS: Readonly<Record<number, number>> = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
};

/** Snakes: head (top) → tail (bottom). Standard "Milton Bradley 1943" layout. */
export const SNAKES: Readonly<Record<number, number>> = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
};

/** If `square` is a ladder bottom or snake head, return the new square; else return `square`. */
export function resolveLanding(square: number): number {
  if (LADDERS[square] != null) return LADDERS[square]!;
  if (SNAKES[square] != null) return SNAKES[square]!;
  return square;
}
```

- [ ] **Step 4: Run, verify all pass**

```bash
pnpm --filter @ludo/game-logic-snakes test
```

- [ ] **Step 5: Export + commit**

```ts
// packages/game-logic-snakes/src/index.ts
export * from './types';
export * from './board';
```

```bash
git add -A
git commit -m "feat(game-logic-snakes): board constants + resolveLanding (snakes/ladders)"
```

---

## Task 4.4: createInitialState + startGame

**Files:**
- Create: `packages/game-logic-snakes/src/state.ts`
- Create: `packages/game-logic-snakes/tests/state.test.ts`

- [ ] **Step 1: Write failing test**

`packages/game-logic-snakes/tests/state.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, startGame } from '../src/state';
import type { Player } from '../src/types';

const players = (n: number): Player[] => {
  const colors = ['red', 'green', 'yellow', 'blue'] as const;
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

describe('createInitialState (snakes)', () => {
  it('builds a 4-player game in lobby status', () => {
    const s = createInitialState({ code: 'ABCD', players: players(4), now: 1000 });
    expect(s.code).toBe('ABCD');
    expect(s.gameType).toBe('snakes');
    expect(s.status).toBe('lobby');
    expect(s.players).toHaveLength(4);
  });

  it('every player starts at square 0 (off the board)', () => {
    const s = createInitialState({ code: 'X', players: players(2), now: 1000 });
    for (const p of s.players) {
      expect(s.tokens[p.id]).toBe(0);
    }
  });

  it('rejects fewer than 2 players', () => {
    expect(() => createInitialState({ code: 'X', players: players(1), now: 0 })).toThrow();
  });

  it('rejects more than 4 players', () => {
    const five = [...players(4), {
      id: 'p4', name: 'P4', avatar: '🐱', color: 'red' as const,
      isBot: false, isHost: false, connected: true,
    }];
    expect(() => createInitialState({ code: 'X', players: five, now: 0 })).toThrow();
  });
});

describe('startGame (snakes)', () => {
  it('flips status to playing and picks first player', () => {
    const s0 = createInitialState({ code: 'X', players: players(3), now: 0 });
    const s1 = startGame(s0, { now: 5 });
    expect(s1.status).toBe('playing');
    expect(s1.currentTurn).toBe(s1.turnOrder[0]);
    expect(s1.lastActivityAt).toBe(5);
  });
});
```

- [ ] **Step 2: Run, verify failure**

- [ ] **Step 3: Implement `packages/game-logic-snakes/src/state.ts`**

```ts
import { COLORS } from '@ludo/game-shared';
import type { GameState, Player } from './types';

export function createInitialState(input: {
  code: string; players: Player[]; now: number;
}): GameState {
  const { code, players, now } = input;
  if (players.length < 2 || players.length > 4) {
    throw new Error(`Snakes & Ladders needs 2-4 players, got ${players.length}`);
  }
  const tokens: Record<string, number> = {};
  for (const p of players) tokens[p.id] = 0;
  return {
    code,
    gameType: 'snakes',
    status: 'lobby',
    players: [...players],
    turnOrder: [],
    currentTurn: null,
    dice: null,
    rolledThisTurn: false,
    tokens,
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
  if (state.players.length < 2) {
    throw new Error('startGame: need at least 2 players');
  }
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

- [ ] **Step 4: Update index, verify, commit**

```ts
// packages/game-logic-snakes/src/index.ts
export * from './types';
export * from './board';
export * from './state';
```

```bash
pnpm --filter @ludo/game-logic-snakes test
git add -A
git commit -m "feat(game-logic-snakes): createInitialState + startGame"
```

---

## Task 4.5: applyRoll + applyMove (with snake/ladder + extra-turn-on-6)

**Files:**
- Create: `packages/game-logic-snakes/src/moves.ts`
- Create: `packages/game-logic-snakes/tests/moves.test.ts`

This is the heart of the engine. The behavior:
- `applyRoll` records the dice value (same shape as Ludo).
- `applyMove({ kind: 'auto' })` advances the current player's token by `state.dice`, applies overshoot/snake/ladder/win, decides next turn (extra turn on 6 unless game over).

- [ ] **Step 1: Write failing tests**

`packages/game-logic-snakes/tests/moves.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createInitialState, startGame, applyRoll, applyMove, isWin, type GameState, type Player } from '../src/index';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: false, isHost: false, connected: true },
];
const fresh = () => startGame(createInitialState({ code: 'X', players, now: 0 }), { now: 1 });
const setToken = (s: GameState, pid: string, sq: number): GameState => ({
  ...s, tokens: { ...s.tokens, [pid]: sq },
});

describe('applyRoll (snakes)', () => {
  it('records dice and marks rolled', () => {
    const s = applyRoll(fresh(), 4, { now: 5 });
    expect(s.dice).toBe(4);
    expect(s.rolledThisTurn).toBe(true);
  });

  it('rejects double-roll', () => {
    const s = applyRoll(fresh(), 4, { now: 5 });
    expect(() => applyRoll(s, 6, { now: 6 })).toThrow();
  });
});

describe('applyMove (snakes)', () => {
  it('advances by dice and consumes the roll', () => {
    let s = applyRoll(fresh(), 3, { now: 1 });
    s = applyMove(s, { kind: 'auto' }, { now: 2 });
    expect(s.tokens['a']).toBe(3);
    expect(s.dice).toBe(null);
    expect(s.rolledThisTurn).toBe(false);
  });

  it('non-six advances turn to next player', () => {
    let s = applyRoll(fresh(), 4, { now: 1 });
    s = applyMove(s, { kind: 'auto' }, { now: 2 });
    expect(s.currentTurn).toBe('b');
  });

  it('rolling 6 grants an extra turn (same player)', () => {
    let s = applyRoll(fresh(), 6, { now: 1 });
    s = applyMove(s, { kind: 'auto' }, { now: 2 });
    expect(s.currentTurn).toBe('a');
  });

  it('overshooting 100 leaves the token in place', () => {
    let s = setToken(fresh(), 'a', 99);
    s = applyRoll(s, 5, { now: 1 });
    s = applyMove(s, { kind: 'auto' }, { now: 2 });
    expect(s.tokens['a']).toBe(99);
  });

  it('lands on a ladder bottom and climbs', () => {
    // Ladder 1 → 38: from square 0, roll 1 lands on 1, climbs to 38
    let s = applyRoll(fresh(), 1, { now: 1 });
    s = applyMove(s, { kind: 'auto' }, { now: 2 });
    expect(s.tokens['a']).toBe(38);
    expect(s.log.some((e) => e.kind === 'ladder' && e.from === 1 && e.to === 38)).toBe(true);
  });

  it('lands on a snake head and slides', () => {
    // Snake 16 → 6: from square 13, roll 3 lands on 16, slides to 6
    let s = setToken(fresh(), 'a', 13);
    s = applyRoll(s, 3, { now: 1 });
    s = applyMove(s, { kind: 'auto' }, { now: 2 });
    expect(s.tokens['a']).toBe(6);
    expect(s.log.some((e) => e.kind === 'snake' && e.from === 16 && e.to === 6)).toBe(true);
  });

  it('exact landing on 100 wins the game', () => {
    let s = setToken(fresh(), 'a', 95);
    s = applyRoll(s, 5, { now: 1 });
    s = applyMove(s, { kind: 'auto' }, { now: 2 });
    expect(s.tokens['a']).toBe(100);
    expect(s.status).toBe('finished');
    expect(s.winner).toBe('a');
    expect(s.currentTurn).toBeNull();
  });

  it('isWin returns true when a player is on 100', () => {
    let s = setToken(fresh(), 'a', 100);
    expect(isWin(s, 'a')).toBe(true);
    expect(isWin(s, 'b')).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify failure**

- [ ] **Step 3: Implement `packages/game-logic-snakes/src/moves.ts`**

```ts
import type { GameEvent } from '@ludo/game-shared';
import type { GameState, Move } from './types';
import { LADDERS, SNAKES, FINISH } from './board';

export function applyRoll(state: GameState, value: number, opts: { now: number }): GameState {
  if (state.status !== 'playing') throw new Error(`applyRoll: expected playing, got ${state.status}`);
  if (state.rolledThisTurn) throw new Error('applyRoll: already rolled this turn');
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new Error(`applyRoll: value ${value} must be an integer in 1..6`);
  }
  return {
    ...state,
    dice: value,
    rolledThisTurn: true,
    lastActivityAt: opts.now,
    log: [...state.log, { kind: 'rolled', playerId: state.currentTurn!, value }],
  };
}

export function isWin(state: GameState, playerId: string): boolean {
  return state.tokens[playerId] === FINISH;
}

const nextTurn = (state: GameState): string => {
  const i = state.turnOrder.indexOf(state.currentTurn!);
  return state.turnOrder[(i + 1) % state.turnOrder.length]!;
};

export function applyMove(
  state: GameState,
  _move: Move,
  opts: { now: number },
): GameState {
  if (state.status !== 'playing') throw new Error(`applyMove: expected playing, got ${state.status}`);
  if (state.currentTurn == null) throw new Error('applyMove: no current turn');
  if (state.dice == null || !state.rolledThisTurn) {
    throw new Error(`applyMove: must roll first (dice=${state.dice}, rolled=${state.rolledThisTurn})`);
  }

  const playerId = state.currentTurn;
  const dice = state.dice;
  const log: GameEvent[] = [...state.log];
  const before = state.tokens[playerId]!;
  const tentative = before + dice;
  let after = before;

  if (tentative <= FINISH) {
    after = tentative;
    log.push({ kind: 'moved', playerId, tokenId: playerId, from: before, to: after });
    // Apply snake or ladder
    if (LADDERS[after] != null) {
      const top = LADDERS[after]!;
      log.push({ kind: 'ladder', playerId, from: after, to: top });
      after = top;
    } else if (SNAKES[after] != null) {
      const tail = SNAKES[after]!;
      log.push({ kind: 'snake', playerId, from: after, to: tail });
      after = tail;
    }
  }
  // Overshoot: after stays = before (no movement at all)
  // Note: we don't push a 'moved' event in the overshoot case.

  const newTokens: Record<string, number> = { ...state.tokens, [playerId]: after };

  // Win check
  if (after === FINISH) {
    log.push({ kind: 'won', playerId });
    return {
      ...state,
      tokens: newTokens,
      dice: null,
      rolledThisTurn: false,
      currentTurn: null,
      status: 'finished',
      winner: playerId,
      lastActivityAt: opts.now,
      log,
    };
  }

  // Extra turn on 6, otherwise advance
  const next = dice === 6 ? playerId : nextTurn(state);
  if (next !== playerId) log.push({ kind: 'turn', playerId: next });

  return {
    ...state,
    tokens: newTokens,
    dice: null,
    rolledThisTurn: false,
    currentTurn: next,
    lastActivityAt: opts.now,
    log,
  };
}
```

- [ ] **Step 4: Update index, verify, commit**

```ts
// packages/game-logic-snakes/src/index.ts
export * from './types';
export * from './board';
export * from './state';
export * from './moves';
```

```bash
pnpm --filter @ludo/game-logic-snakes test
git add -A
git commit -m "feat(game-logic-snakes): applyRoll + applyMove (overshoot, snake/ladder, win, extra turn on 6)"
```

---

## Task 4.6: legalMoves + chooseBotMove (trivial)

**Files:**
- Modify: `packages/game-logic-snakes/src/moves.ts`

S&L has no decisions — there's always exactly one move (auto). `legalMoves` returns `[{ kind: 'auto' }]` when it's the player's turn and they've rolled, else `[]`. Bot move is identical to the human's only option.

- [ ] **Step 1: Add to `packages/game-logic-snakes/src/moves.ts`**

Append:

```ts
export function legalMoves(state: GameState, playerId: string): Move[] {
  if (state.currentTurn !== playerId) return [];
  if (state.dice == null || !state.rolledThisTurn) return [];
  return [{ kind: 'auto' }];
}

export function chooseBotMove(_state: GameState): Move {
  return { kind: 'auto' };
}
```

- [ ] **Step 2: Add tests** in `packages/game-logic-snakes/tests/moves.test.ts` (append):

```ts
describe('legalMoves + chooseBotMove (snakes)', () => {
  it('legalMoves is empty before rolling', () => {
    const s = fresh();
    expect(legalMoves(s, 'a')).toEqual([]);
  });

  it('legalMoves returns auto after roll', () => {
    const s = applyRoll(fresh(), 3, { now: 1 });
    expect(legalMoves(s, 'a')).toEqual([{ kind: 'auto' }]);
  });

  it('legalMoves is empty for the non-current player', () => {
    const s = applyRoll(fresh(), 3, { now: 1 });
    expect(legalMoves(s, 'b')).toEqual([]);
  });

  it('chooseBotMove always returns auto', () => {
    const s = applyRoll(fresh(), 4, { now: 1 });
    expect(chooseBotMove(s)).toEqual({ kind: 'auto' });
  });
});
```

(Add `legalMoves, chooseBotMove` to the existing import at the top of the test file.)

- [ ] **Step 3: Run, commit**

```bash
pnpm --filter @ludo/game-logic-snakes test
git add -A
git commit -m "feat(game-logic-snakes): legalMoves + chooseBotMove (trivial — always auto)"
```

---

## Task 4.7: End-to-end smoke test

**Files:**
- Create: `packages/game-logic-snakes/tests/end-to-end.test.ts`

Two-bot full game using only the engine's public exports.

- [ ] **Step 1: Write test**

```ts
import { describe, it, expect } from 'vitest';
import {
  createInitialState, startGame, applyRoll, applyMove, chooseBotMove,
  type Player,
} from '../src/index';

describe('full S&L game smoke test', () => {
  it('two bots play to a winner with deterministic dice', () => {
    const players: Player[] = [
      { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: true, isHost: true,  connected: true },
      { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: true, isHost: false, connected: true },
    ];
    let s = startGame(createInitialState({ code: 'X', players, now: 0 }), { now: 1 });

    const seq = [4, 5, 3, 2, 1, 6];   // mix of values, one 6 → extra turn
    let i = 0, safety = 5000;
    while (s.status === 'playing' && safety-- > 0) {
      s = applyRoll(s, seq[i++ % seq.length]!, { now: i });
      s = applyMove(s, chooseBotMove(s), { now: i });
    }
    expect(s.status).toBe('finished');
    expect(s.winner === 'a' || s.winner === 'b').toBe(true);
  });
});
```

- [ ] **Step 2: Run, commit**

```bash
pnpm --filter @ludo/game-logic-snakes test
git add -A
git commit -m "test(game-logic-snakes): end-to-end smoke (two bots play to a winner)"
```

---

# Phase 5: S&L UI local prototype

Build the board and play against bots in the browser, no server. This is a stop-gap to validate the gameplay loop visually before wiring multiplayer.

## Task 5.1: S&L board layout module

**Files:**
- Create: `apps/web/src/lib/snakes/boardLayout.ts`
- Create: `apps/web/src/lib/snakes/__tests__/boardLayout.test.ts`

Standard boustrophedon: square 1 = bottom-left, going right; row 2 = right-to-left starting at 11; etc. 10×10 grid.

- [ ] **Step 1: Write failing test**

`apps/web/src/lib/snakes/__tests__/boardLayout.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { squareToCell } from '../boardLayout';

describe('squareToCell (snakes & ladders)', () => {
  it('square 1 is bottom-left (col 0, row 9)', () => {
    expect(squareToCell(1)).toEqual({ col: 0, row: 9 });
  });

  it('square 10 is bottom-right (col 9, row 9)', () => {
    expect(squareToCell(10)).toEqual({ col: 9, row: 9 });
  });

  it('square 11 is one above square 10 (col 9, row 8) — boustrophedon', () => {
    expect(squareToCell(11)).toEqual({ col: 9, row: 8 });
  });

  it('square 20 is leftmost on row 8 (col 0, row 8)', () => {
    expect(squareToCell(20)).toEqual({ col: 0, row: 8 });
  });

  it('square 21 is one above square 20 (col 0, row 7)', () => {
    expect(squareToCell(21)).toEqual({ col: 0, row: 7 });
  });

  it('square 100 is top-left (col 0, row 0)', () => {
    expect(squareToCell(100)).toEqual({ col: 0, row: 0 });
  });
});
```

- [ ] **Step 2: Run, verify failure**

- [ ] **Step 3: Implement `apps/web/src/lib/snakes/boardLayout.ts`**

```ts
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
  const indexFromBottom = square - 1;            // 0..99
  const row = 9 - Math.floor(indexFromBottom / 10);
  const inRow = indexFromBottom % 10;
  // Even rows from bottom (0, 2, 4...) go left-to-right; odd rows right-to-left
  const rowFromBottom = Math.floor(indexFromBottom / 10);
  const col = rowFromBottom % 2 === 0 ? inRow : 9 - inRow;
  return { col, row };
}
```

- [ ] **Step 4: Run, commit**

```bash
pnpm --filter @ludo/web test
git add -A
git commit -m "feat(web): S&L board layout (squareToCell, boustrophedon)"
```

---

## Task 5.2: SnakesBoard component (basic SVG, not yet 3D)

**Files:**
- Create: `apps/web/src/components/snakes/Board.tsx`

Renders the 10×10 grid with square numbers, snakes as red curves, ladders as brown lines. **Visual treatment is intentionally basic here** — the v2 visual pass (Phase 7) will replace ladders with wooden art and snakes with proper illustrated curves.

- [ ] **Step 1: Implement**

```tsx
'use client';
import type { GameState } from '@ludo/game-logic-snakes';
import { LADDERS, SNAKES } from '@ludo/game-logic-snakes';
import { squareToCell } from '@/lib/snakes/boardLayout';

const CELL = 40;
const SIZE = CELL * 10;

const colorFill: Record<string, string> = {
  red: '#c97a7a', green: '#7eaa83', yellow: '#d8b86a', blue: '#7d9ec5',
};

export function SnakesBoard({ state }: { state: GameState }) {
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-[640px] aspect-square select-none"
      role="img" aria-label="Snakes & Ladders board"
    >
      {/* Outer frame */}
      <rect x={0} y={0} width={SIZE} height={SIZE} rx={10} fill="#fdf6ec" stroke="#8b6f47" strokeWidth={2}/>

      {/* 100 squares with numbers */}
      {Array.from({ length: 100 }, (_, i) => {
        const sq = i + 1;
        const { col, row } = squareToCell(sq);
        const x = col * CELL;
        const y = row * CELL;
        const isLadder = LADDERS[sq] != null;
        const isSnake = SNAKES[sq] != null;
        const fill = isLadder ? '#dcefcd' : isSnake ? '#f8d4d4' : ((col + row) % 2 === 0 ? '#fff' : '#fbf3df');
        return (
          <g key={sq}>
            <rect x={x+1} y={y+1} width={CELL-2} height={CELL-2} rx={4}
              fill={fill} stroke="#c8b18a" strokeWidth={0.5}/>
            <text x={x+4} y={y+12} fontSize={9} fill="#8b6f47">{sq}</text>
          </g>
        );
      })}

      {/* Ladders — drawn as lines from bottom cell-center to top cell-center */}
      {Object.entries(LADDERS).map(([bottom, top]) => {
        const a = squareToCell(Number(bottom));
        const b = squareToCell(top);
        return (
          <line key={`l-${bottom}`}
            x1={a.col*CELL + CELL/2} y1={a.row*CELL + CELL/2}
            x2={b.col*CELL + CELL/2} y2={b.row*CELL + CELL/2}
            stroke="#8b6f47" strokeWidth={3} strokeLinecap="round"/>
        );
      })}

      {/* Snakes — drawn as wavy lines */}
      {Object.entries(SNAKES).map(([head, tail]) => {
        const a = squareToCell(Number(head));
        const b = squareToCell(tail);
        const mx = (a.col + b.col) / 2 * CELL + CELL/2 + 15;  // small offset for curve
        const my = (a.row + b.row) / 2 * CELL + CELL/2;
        return (
          <path key={`s-${head}`}
            d={`M ${a.col*CELL + CELL/2} ${a.row*CELL + CELL/2}
                Q ${mx} ${my},
                  ${b.col*CELL + CELL/2} ${b.row*CELL + CELL/2}`}
            fill="none" stroke="#a13030" strokeWidth={3} strokeLinecap="round"/>
        );
      })}

      {/* Tokens — one per player */}
      {state.players.map((p, i) => {
        const sq = state.tokens[p.id]!;
        if (sq === 0) {
          // Off-board: render in a corner stack below the board
          return (
            <circle key={p.id}
              cx={5 + i*15} cy={SIZE - 8}
              r={5} fill={colorFill[p.color]!} stroke="#3a2e1f" strokeWidth={1}/>
          );
        }
        const c = squareToCell(sq);
        const cx = c.col*CELL + CELL/2 + (i - state.players.length/2) * 6;  // slight offset per player
        const cy = c.row*CELL + CELL/2 + 8;
        return (
          <circle key={p.id} cx={cx} cy={cy} r={6}
            fill={colorFill[p.color]!} stroke="#3a2e1f" strokeWidth={1.5}/>
        );
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
git commit -m "feat(web): basic SnakesBoard component (SVG; v2 visual pass coming in Phase 7)"
```

---

## Task 5.3: Local game store + `/snakes/[code]` prototype page

**Files:**
- Create: `apps/web/src/lib/snakes/localGame.ts`
- Create: `apps/web/src/app/snakes/[code]/page.tsx`

Mirror the Ludo local prototype. For now, the `[code]` route is a stub — we'll wire to the real server in Phase 6.

- [ ] **Step 1: `apps/web/src/lib/snakes/localGame.ts`**

```ts
'use client';
import { create } from 'zustand';
import {
  createInitialState, startGame, applyRoll, applyMove, chooseBotMove,
  type GameState, type Move,
} from '@ludo/game-logic-snakes';
import type { Player } from '@ludo/game-shared';

const seedPlayers = (): Player[] => ([
  { id: 'me',   name: 'You',   avatar: '🐱', color: 'red',   isBot: false, isHost: true,  connected: true },
  { id: 'bot1', name: 'Bot 1', avatar: '🐻', color: 'green', isBot: true,  isHost: false, connected: true },
]);

const rollDie = () => 1 + Math.floor(Math.random() * 6);

type LocalGame = {
  state: GameState;
  reset: () => void;
  roll: () => void;
  play: (move: Move) => void;
};

export const useLocalSnakes = create<LocalGame>((set, get) => ({
  state: startGame(createInitialState({ code: 'LOCAL', players: seedPlayers(), now: Date.now() }), { now: Date.now() }),
  reset: () => set({
    state: startGame(createInitialState({ code: 'LOCAL', players: seedPlayers(), now: Date.now() }), { now: Date.now() }),
  }),
  roll: () => {
    const s = get().state;
    if (s.rolledThisTurn || s.status !== 'playing' || s.currentTurn === null) return;
    const v = rollDie();
    const next = applyRoll(s, v, { now: Date.now() });
    set({ state: next });
    // Auto-resolve the move after a beat (S&L has no decisions)
    setTimeout(() => {
      set({ state: applyMove(get().state, { kind: 'auto' }, { now: Date.now() }) });
      setTimeout(() => maybeBot(set, get), 1100);
    }, 600);
  },
  play: (move) => {
    set({ state: applyMove(get().state, move, { now: Date.now() }) });
    setTimeout(() => maybeBot(set, get), 1100);
  },
}));

function maybeBot(set: (s: Partial<LocalGame>) => void, get: () => LocalGame) {
  const s = get().state;
  if (s.status !== 'playing' || !s.currentTurn) return;
  const cur = s.players.find((p) => p.id === s.currentTurn);
  if (!cur?.isBot) return;
  if (!s.rolledThisTurn) {
    set({ state: applyRoll(s, 1 + Math.floor(Math.random() * 6), { now: Date.now() }) });
    setTimeout(() => maybeBot(set, get), 1100);
    return;
  }
  set({ state: applyMove(get().state, chooseBotMove(get().state), { now: Date.now() }) });
  setTimeout(() => maybeBot(set, get), 1100);
}
```

- [ ] **Step 2: `apps/web/src/app/snakes/[code]/page.tsx`** (local prototype version — Phase 6 replaces with multiplayer)

```tsx
'use client';
import { useLocalSnakes } from '@/lib/snakes/localGame';
import { SnakesBoard } from '@/components/snakes/Board';
import { Dice } from '@/components/Dice';
import { PlayerPanel } from '@/components/PlayerPanel';

export default function SnakesPage() {
  const { state, roll, reset } = useLocalSnakes();
  const myId = 'me';
  const myTurn = state.currentTurn === myId;

  return (
    <main className="min-h-screen-d flex flex-col items-center gap-4 p-4 pb-[calc(7rem+var(--safe-bottom))]">
      <header className="w-full max-w-[640px] flex items-center justify-between">
        <h1 className="font-display text-xl">Snakes & Ladders (local)</h1>
        <button className="text-sm underline" onClick={reset}>New game</button>
      </header>
      <PlayerPanel state={state as never} />
      <SnakesBoard state={state} />
      <div className="fixed inset-x-0 bottom-0 px-4 pb-[calc(1rem+var(--safe-bottom))] pt-3 bg-paper border-t border-edge flex items-center justify-between">
        <div className="text-base font-medium">
          {state.status === 'finished'
            ? `🏆 ${state.players.find((p) => p.id === state.winner)?.name} wins!`
            : myTurn
              ? state.dice ? `Rolled ${state.dice} — moving…` : 'Your turn — roll!'
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

NOTE: `<PlayerPanel state={state as never} />` — the existing PlayerPanel was written for Ludo's GameState shape (it counts `tokens[p.id]` as an array of token objects). The S&L state has `tokens[p.id]` as a number (square 0..100). This `as never` cast is a deliberate shortcut for the local prototype; Phase 6 will refactor PlayerPanel to be game-agnostic.

- [ ] **Step 3: Run, click around**

```bash
pnpm dev:web
```

Open http://localhost:3000:
1. Set name + avatar (or skip if already set)
2. Click "Snakes & Ladders" card → routed to `/snakes/new` → creates a server room → redirects to `/snakes/<CODE>`
3. **Wait — the room creation hits the server but the page mounts the LOCAL prototype.** That's fine for now — the URL shows a fresh code each time, but the page just plays a local game. Phase 6 wires the real WebSocket.
4. Click the dice; roll cycles, your token advances, ladders climb, snakes slide, bot takes its turn.

If it works visually, you've validated the gameplay loop.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(web): S&L local prototype at /snakes/[code] (vs bot, no server yet)"
```

---

# Phase 6: S&L on the server (multiplayer)

Wire the snakes engine into the server registry, refactor PlayerPanel to be game-agnostic, and replace the local prototype page with the real multiplayer flow.

## Task 6.1: Register snakes engine in server

**Files:**
- Create: `apps/server/src/engines/snakes.ts`
- Modify: `apps/server/src/engines/index.ts`
- Modify: `apps/server/package.json` (add @ludo/game-logic-snakes dep)

- [ ] **Step 1: Add the workspace dep**

In `apps/server/package.json` under `dependencies`:

```json
"@ludo/game-logic-snakes": "workspace:*"
```

Run `pnpm install`.

- [ ] **Step 2: `apps/server/src/engines/snakes.ts`**

```ts
import {
  createInitialState, startGame, applyRoll, applyMove,
  legalMoves, isWin, chooseBotMove,
} from '@ludo/game-logic-snakes';
import type { GameEngine } from './types';

export const snakesEngine: GameEngine = {
  createInitialState,
  startGame,
  applyRoll,
  applyMove,
  legalMoves,
  isWin: (stateOrTokens, playerId) => {
    // S&L's isWin takes the full state. Detect which shape we got and adapt.
    if (stateOrTokens && typeof stateOrTokens === 'object' && 'tokens' in (stateOrTokens as object)) {
      return isWin(stateOrTokens as never, playerId);
    }
    return false;
  },
  chooseBotMove,
};
```

- [ ] **Step 3: Update `apps/server/src/engines/index.ts`**

Add the snakes import and registration:

```ts
import type { GameType } from '@ludo/game-shared';
import type { GameEngine } from './types';
import { ludoEngine } from './ludo';
import { snakesEngine } from './snakes';

const ENGINES: Record<GameType, GameEngine> = {
  ludo: ludoEngine,
  snakes: snakesEngine,
};

export function getEngine(gameType: GameType): GameEngine {
  const e = ENGINES[gameType];
  if (!e) throw new Error(`No engine registered for gameType=${gameType}`);
  return e;
}

export type { GameEngine } from './types';
```

(Drop the `as Record<...>` cast — both engines are now real.)

- [ ] **Step 4: Server tests + integration**

```bash
pnpm --filter @ludo/server typecheck
pnpm --filter @ludo/server test
```

5 server tests still pass. (Integration test creates a Ludo room by default.)

- [ ] **Step 5: Add an integration test for snakes**

Append to `apps/server/tests/integration.test.ts`:

```ts
describe('ws integration — snakes', () => {
  it('snakes room: host + guest join, status flips to lobby with gameType=snakes', async () => {
    const code = mgr.createRoom({
      hostId: 'host', hostName: 'Host', hostAvatar: '🐱', gameType: 'snakes',
    });

    const a = ws();
    await new Promise((r) => a.once('open', r));
    a.send(JSON.stringify({ type: 'join', code, playerId: 'host', name: 'Host', avatar: '🐱' }));

    const stateMsg = await wait(a, (m) => m.type === 'state');
    expect((stateMsg.state as { gameType: string }).gameType).toBe('snakes');
    expect((stateMsg.state as { status: string }).status).toBe('lobby');

    a.close();
  });
});
```

Verify:
```bash
pnpm --filter @ludo/server test    # expect 6 passing
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(server): register snakes engine + integration test"
```

---

## Task 6.2: Make PlayerPanel game-agnostic

**Files:**
- Modify: `apps/web/src/components/PlayerPanel.tsx`

The current PlayerPanel computes `finished = tokens[p.id].filter(t => ...).length` which assumes Ludo's array-of-tokens shape. For S&L, `tokens[p.id]` is a number (the square).

Generalize: the panel just shows the player's **progress label**, computed by a per-game adapter.

- [ ] **Step 1: Create a progress adapter**

In `apps/web/src/lib/progressLabel.ts`:

```ts
import type { GameType } from '@ludo/game-shared';

/**
 * Returns a short progress label for a player given the room's game state.
 * Game-specific because the meaning of "progress" differs.
 */
export function progressLabel(
  gameType: GameType,
  tokens: unknown,
  playerId: string,
): string {
  if (gameType === 'ludo') {
    // tokens: Record<string, { position: { kind: 'home' | 'path'; index: number } }[]>
    const arr = (tokens as Record<string, { position: { kind: string; index?: number } }[]>)[playerId] ?? [];
    const finished = arr.filter((t) => t.position.kind === 'path' && t.position.index === 56).length;
    return `${finished}/4 finished`;
  }
  if (gameType === 'snakes') {
    // tokens: Record<string, number>  (square 0..100)
    const sq = (tokens as Record<string, number>)[playerId] ?? 0;
    return `square ${sq}`;
  }
  return '';
}
```

- [ ] **Step 2: Update `apps/web/src/components/PlayerPanel.tsx`**

Replace the body of the rendering to use `progressLabel`:

```tsx
'use client';
import type { BaseGameState } from '@ludo/game-shared';
import { progressLabel } from '@/lib/progressLabel';

const colorBg: Record<string, string> = {
  red: 'bg-rust', green: 'bg-sage', yellow: 'bg-honey', blue: 'bg-sky',
};

export function PlayerPanel({ state }: { state: BaseGameState & { tokens: unknown } }) {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-[640px]">
      {state.players.map((p) => {
        const turn = state.currentTurn === p.id;
        return (
          <li key={p.id}
            className={`rounded-xl p-2 border-2 flex items-center gap-2
              ${turn ? 'border-ink bg-white' : 'border-edge bg-paper'}`}
          >
            <span className={`w-8 h-8 rounded-full ${colorBg[p.color] ?? 'bg-gray-300'} flex items-center justify-center text-lg`}>
              {p.avatar}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{p.name}{p.isBot && ' 🤖'}</div>
              <div className="text-xs opacity-70">{progressLabel(state.gameType, state.tokens, p.id)}</div>
            </div>
            {!p.connected && <span title="disconnected">📡</span>}
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 3: Drop the `as never` from the snakes prototype**

In `apps/web/src/app/snakes/[code]/page.tsx`, change `<PlayerPanel state={state as never} />` to `<PlayerPanel state={state} />`.

- [ ] **Step 4: Verify**

```bash
pnpm --filter @ludo/web typecheck
pnpm --filter @ludo/web build
pnpm --filter @ludo/web test
```

All exit 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(web): PlayerPanel + progressLabel adapter (game-agnostic)"
```

---

## Task 6.3: Replace `/snakes/[code]` local prototype with real WebSocket flow

**Files:**
- Modify: `apps/web/src/app/snakes/[code]/page.tsx`

Mirror the Ludo room page: lobby + game switch based on `state.status`, wired to the real WebSocket via `useRoomConnection`.

- [ ] **Step 1: Replace the page**

```tsx
'use client';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { useLocalProfile } from '@/lib/useLocalProfile';
import { useRoomConnection } from '@/lib/useRoomConnection';
import { SnakesBoard } from '@/components/snakes/Board';
import { Dice } from '@/components/Dice';
import { PlayerPanel } from '@/components/PlayerPanel';
import { ActivityLog } from '@/components/ActivityLog';
import { Lobby } from '@/components/Lobby';
import { ProfileForm } from '@/components/ProfileForm';
import { WinScreen } from '@/components/WinScreen';
import { Buzz } from '@/lib/haptics';
import type { GameState as SnakesGameState } from '@ludo/game-logic-snakes';

const WS_URL = process.env.NEXT_PUBLIC_LUDO_WS ?? 'ws://localhost:8787';

export default function SnakesRoomPage() {
  const { code } = useParams<{ code: string }>();
  const { profile, save } = useLocalProfile();
  const { state, status, error, send } = useRoomConnection({ wsUrl: WS_URL, code, profile });
  const myTurn = !!profile && state?.currentTurn === profile.playerId;

  // After roll, server auto-applies the move (no token to pick in S&L).
  // The dice roll itself is the action.

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

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/snakes/${code}` : '';

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
      <ActivityLog state={state} />
      <SnakesBoard state={state as SnakesGameState} />
      <div className="fixed inset-x-0 bottom-0 px-4 pb-[calc(1rem+var(--safe-bottom))] pt-3 bg-paper border-t border-edge flex items-center justify-between">
        <div className="text-base font-medium">
          {(() => {
            if (state.status === 'finished') return 'Game over';
            if (!myTurn) return `Waiting on ${state.players.find((p) => p.id === state.currentTurn)?.name}`;
            if (!state.dice) return 'Your turn — roll!';
            return `Rolled ${state.dice} — moving…`;
          })()}
        </div>
        <Dice
          value={state.dice}
          disabled={!myTurn || state.rolledThisTurn || state.status !== 'playing'}
          onRoll={() => send({ type: 'roll' })}
        />
      </div>
      {state.status === 'finished' && (
        <WinScreen
          state={state}
          meIsHost={state.players.find((p) => p.id === profile.playerId)?.isHost === true}
          onPlayAgain={() => send({ type: 'playAgain' })}
        />
      )}
    </main>
  );
}
```

NOTE: this references the existing shared shell (`Lobby`, `PlayerPanel`, `ActivityLog`, `Dice`, `WinScreen`) — they're all game-agnostic now after Task 6.2.

- [ ] **Step 2: Server-side: ensure `roll` triggers an auto-move for S&L**

In `apps/server/src/wsServer.ts`, find the `case 'roll':` block. Currently it only handles Ludo's "if no legal token moves, auto-pass" logic. Snakes & Ladders ALWAYS has exactly one legal move after a roll — so we want to auto-apply the move after rolling, on the server.

Modify the roll case to detect game type:

```ts
case 'roll': {
  mgr.roll(c.code, c.playerId, rollDie());
  broadcast(c.code);
  const room = mgr.getRoom(c.code)!;
  if (room.state.gameType === 'snakes') {
    // S&L: auto-resolve the move after a beat (no decisions to make)
    setTimeout(() => {
      mgr.move(c.code, c.playerId, { kind: 'auto' });
      broadcast(c.code);
      handleBotTurns(c.code);
      armAfk(c.code);
    }, 800);
  } else {
    // Ludo: existing forced-pass logic
    const moves = legalMoves(room.state, c.playerId);
    if (moves.length === 1 && moves[0]!.kind === 'pass') {
      setTimeout(() => { mgr.move(c.code, c.playerId, moves[0]!); broadcast(c.code); handleBotTurns(c.code); armAfk(c.code); }, 1500);
    } else {
      handleBotTurns(c.code);
      armAfk(c.code);
    }
  }
  break;
}
```

(`legalMoves` import is already there from the existing Ludo logic.)

- [ ] **Step 3: Server-side: ensure bot turns work for snakes too**

`handleBotTurns` calls `mgr.chooseBotMove(state)` which dispatches via the engine. For snakes the bot returns `{ kind: 'auto' }` and `mgr.move` applies it. No additional changes needed — but verify by tracing through the code.

- [ ] **Step 4: End-to-end test**

```bash
pnpm dev:server
pnpm dev:web
```

In two browser windows:
1. Window 1: name "Mom", click "Snakes & Ladders" → land in lobby
2. Window 2: name "Sara", paste the share URL, joins lobby
3. Add a bot, start, play to a winner
4. Verify: snakes slide, ladders climb, dice rolls visible, win modal shows

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: S&L multiplayer end-to-end (server auto-move, room page wired to WebSocket)"
```

---

# Phase 7: v2 visual pass

The "v2 look" applied uniformly across Ludo and S&L. **Skip detailed task breakdown for these UI tasks** — they're iterative and visual, not algorithmic. Each task is "build component, mount in board, view on real device, iterate." The implementer agent should iterate visually with the user where needed.

## Task 7.1: Pawn component (shared 3D-looking piece)

**Files:**
- Create: `apps/web/src/components/visual/Pawn.tsx`

A reusable SVG component for a "3D" pawn (rounded sphere on tapered base). Used in both Ludo and S&L. Takes `color`, `cx`, `cy`, `size` props. Returns an `<svg>` group.

- [ ] **Step 1: Implement Pawn**

```tsx
'use client';
import type { Color } from '@ludo/game-shared';

const fillByColor: Record<Color, string> = {
  red: '#c97a7a', green: '#7eaa83', yellow: '#d8b86a', blue: '#7d9ec5',
};
const darkByColor: Record<Color, string> = {
  red: '#8c5252', green: '#557560', yellow: '#9c7e3b', blue: '#516f93',
};

export function Pawn({ color, cx, cy, size = 14 }: {
  color: Color;
  cx: number;
  cy: number;
  size?: number;
}) {
  const fill = fillByColor[color];
  const dark = darkByColor[color];
  return (
    <g>
      {/* Soft drop shadow under the pawn */}
      <ellipse cx={cx} cy={cy + size * 0.6} rx={size * 0.7} ry={size * 0.18} fill="#3a2e1f33"/>
      {/* Tapered base */}
      <path
        d={`M ${cx - size*0.5} ${cy + size*0.5}
            L ${cx + size*0.5} ${cy + size*0.5}
            L ${cx + size*0.35} ${cy - size*0.1}
            L ${cx - size*0.35} ${cy - size*0.1}
            Z`}
        fill={dark}
      />
      {/* Spherical top */}
      <circle cx={cx} cy={cy - size*0.3} r={size*0.4} fill={fill} stroke={dark} strokeWidth={1}/>
      {/* Highlight on top-left of sphere */}
      <ellipse cx={cx - size*0.15} cy={cy - size*0.45} rx={size*0.12} ry={size*0.08} fill="#ffffff77"/>
    </g>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm --filter @ludo/web build
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(web): shared Pawn component (3D-looking via SVG gradients)"
```

---

## Task 7.2: Apply Pawn to Ludo Board (replace flat circles)

**Files:**
- Modify: `apps/web/src/components/ludo/Board.tsx`

Replace the existing `<circle>` token rendering with `<Pawn>`. Drop the sparkle/glow effect for hinted tokens — keep only the amber halo (Pawn already has visual presence).

- [ ] **Step 1: Edit Board.tsx**

Find the token render block and replace `<circle cx={cx} cy={cy} r={CELL*0.36} ... />` with:

```tsx
<Pawn color={t.color} cx={cx} cy={cy} size={CELL*0.7} />
```

Add `import { Pawn } from '@/components/visual/Pawn';` at the top.

Keep the sparkle/halo logic for hinted tokens but adjust positioning to surround the Pawn instead of the flat circle.

- [ ] **Step 2: Visual check on real device**

```bash
pnpm dev:web
```

Open on phone, play a Ludo game, verify pawns look like real game pieces.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(web): Ludo Board uses 3D Pawn component"
```

---

## Task 7.3: Apply Pawn to Snakes Board

**Files:**
- Modify: `apps/web/src/components/snakes/Board.tsx`

Replace flat token circles with `<Pawn>`. Same pattern as Ludo.

- [ ] **Step 1: Edit Board.tsx, replace token circles with Pawn**

Same import + replacement pattern as Task 7.2. Pawn size around `CELL*0.6`.

- [ ] **Step 2: Visual check, commit**

```bash
git add -A
git commit -m "feat(web): Snakes Board uses 3D Pawn component"
```

---

## Task 7.4: Snakes art (proper illustrated curves with depth)

**Files:**
- Create: `apps/web/src/components/visual/SnakeArt.tsx`
- Modify: `apps/web/src/components/snakes/Board.tsx` (use SnakeArt instead of plain `<path>`)

A reusable component: takes start cell + end cell, draws a winding S-shape with body gradient (lighter top, darker bottom for "round"), small triangular head, color coded by length.

- [ ] **Step 1: Implement SnakeArt**

```tsx
'use client';
export function SnakeArt({ x1, y1, x2, y2, length }: {
  x1: number; y1: number; x2: number; y2: number; length: number;
}) {
  // Color by length: short = green (less dangerous), long = purple (very dangerous)
  const isLong = length > 30;
  const bodyMain = isLong ? '#9b6cd8' : '#88a36e';
  const bodyDark = isLong ? '#5e3a8c' : '#566c41';

  const id = `snake-${x1}-${y1}`;
  // Two control points to make an S-curve
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cp1x = x1 + dx*0.1 + dy*0.4;
  const cp1y = y1 + dy*0.4;
  const cp2x = x2 - dx*0.1 - dy*0.4;
  const cp2y = y2 - dy*0.4;

  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={bodyMain}/>
          <stop offset="100%" stopColor={bodyDark}/>
        </linearGradient>
      </defs>
      <path
        d={`M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`}
        fill="none" stroke={`url(#${id})`} strokeWidth={6} strokeLinecap="round"
      />
      {/* Head — small triangle at the head (start) */}
      <circle cx={x1} cy={y1} r={5} fill={bodyMain} stroke={bodyDark} strokeWidth={1.5}/>
      <circle cx={x1-1.5} cy={y1-1} r={1} fill="#000"/>
      <circle cx={x1+1.5} cy={y1-1} r={1} fill="#000"/>
    </g>
  );
}
```

- [ ] **Step 2: Use SnakeArt in `apps/web/src/components/snakes/Board.tsx`**

Replace the existing snake `<path>` mapping:

```tsx
{Object.entries(SNAKES).map(([head, tail]) => {
  const a = squareToCell(Number(head));
  const b = squareToCell(tail);
  return (
    <SnakeArt key={`s-${head}`}
      x1={a.col*CELL + CELL/2} y1={a.row*CELL + CELL/2}
      x2={b.col*CELL + CELL/2} y2={b.row*CELL + CELL/2}
      length={Number(head) - tail}
    />
  );
})}
```

- [ ] **Step 3: Visual check, commit**

```bash
git add -A
git commit -m "feat(web): SnakeArt component with body gradient + head; used in S&L Board"
```

---

## Task 7.5: Ladder art (wooden-looking ladders with rungs)

**Files:**
- Create: `apps/web/src/components/visual/LadderArt.tsx`
- Modify: `apps/web/src/components/snakes/Board.tsx`

- [ ] **Step 1: Implement LadderArt**

```tsx
'use client';
export function LadderArt({ x1, y1, x2, y2 }: {
  x1: number; y1: number; x2: number; y2: number;
}) {
  // Compute perpendicular offset for the two rails
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy);
  const nx = -dy / len * 4;   // perp x, 4px offset
  const ny =  dx / len * 4;   // perp y

  // Rungs every ~12px along the ladder
  const rungCount = Math.max(2, Math.floor(len / 14));
  const rungs = [];
  for (let i = 1; i < rungCount; i++) {
    const t = i / rungCount;
    const rx1 = x1 + dx*t - nx;
    const ry1 = y1 + dy*t - ny;
    const rx2 = x1 + dx*t + nx;
    const ry2 = y1 + dy*t + ny;
    rungs.push({ rx1, ry1, rx2, ry2 });
  }

  return (
    <g>
      {/* Two rails */}
      <line x1={x1-nx} y1={y1-ny} x2={x2-nx} y2={y2-ny}
        stroke="#a8754a" strokeWidth={3} strokeLinecap="round"/>
      <line x1={x1+nx} y1={y1+ny} x2={x2+nx} y2={y2+ny}
        stroke="#a8754a" strokeWidth={3} strokeLinecap="round"/>
      {/* Rungs */}
      {rungs.map((r, i) => (
        <line key={i} x1={r.rx1} y1={r.ry1} x2={r.rx2} y2={r.ry2}
          stroke="#7c5635" strokeWidth={2} strokeLinecap="round"/>
      ))}
    </g>
  );
}
```

- [ ] **Step 2: Use LadderArt in Board**

Replace the existing ladder `<line>` block:

```tsx
{Object.entries(LADDERS).map(([bottom, top]) => {
  const a = squareToCell(Number(bottom));
  const b = squareToCell(top);
  return (
    <LadderArt key={`l-${bottom}`}
      x1={a.col*CELL + CELL/2} y1={a.row*CELL + CELL/2}
      x2={b.col*CELL + CELL/2} y2={b.row*CELL + CELL/2}
    />
  );
})}
```

- [ ] **Step 3: Visual check, commit**

```bash
git add -A
git commit -m "feat(web): LadderArt with wooden rails + rungs; used in S&L Board"
```

---

## Task 7.6: Token movement animation + win confetti

**Files:**
- Modify: `apps/web/src/components/visual/Pawn.tsx` (add CSS transition)
- Create: `apps/web/src/components/visual/Confetti.tsx`
- Modify: `apps/web/src/components/WinScreen.tsx` (mount Confetti)

**Token movement:** wrap the Pawn in a `<g style={{ transform, transition: 'transform 250ms ease-out' }}>`. When `cx`/`cy` change, the Pawn animates smoothly to the new position. Done by passing position via transform instead of hardcoded cx/cy.

**Win confetti:** small SVG component that draws ~30 colored squares falling from the top with random rotations + delays. Mounts inside WinScreen.

- [ ] **Step 1: Update Pawn.tsx to support animated movement**

Refactor: instead of taking `cx`/`cy`, take a `transform` string OR keep cx/cy but wrap in a transitioning group. Simplest:

```tsx
// Add prop `transition: boolean` (default true). Wrap rendered pieces in a <g>
// that transitions transform. The caller passes 0,0 as cx/cy and uses transform
// to position the pawn.
```

For minimal disruption to existing callers, leave Pawn API as-is and add CSS `transition` via a wrapper inside the component:

```tsx
<g style={{ transition: 'transform 250ms ease-out', transform: `translate(${cx}px, ${cy}px)` }}>
  {/* shadow, base, sphere, highlight — all with cx=0, cy=0 */}
</g>
```

This means the SVG paths inside Pawn need to be redrawn with cx=0, cy=0. Refactor as needed.

- [ ] **Step 2: Confetti component**

```tsx
'use client';
import type { Color } from '@ludo/game-shared';

const fillByColor: Record<Color, string> = {
  red: '#c97a7a', green: '#7eaa83', yellow: '#d8b86a', blue: '#7d9ec5',
};

export function Confetti({ winnerColor }: { winnerColor: Color }) {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random(),
    rotate: Math.random() * 360,
    color: i % 3 === 0 ? fillByColor[winnerColor] : (i % 3 === 1 ? '#fbbf24' : '#fdf6ec'),
  }));
  return (
    <svg className="fixed inset-0 pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
      {pieces.map((p) => (
        <rect key={p.id} x={p.x} y={-2} width={1.5} height={2.5} fill={p.color}
          style={{
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
            transformOrigin: `${p.x + 0.75}px 0px`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          to { transform: translateY(120px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </svg>
  );
}
```

- [ ] **Step 3: Mount Confetti inside WinScreen**

In `apps/web/src/components/WinScreen.tsx`, add:

```tsx
import { Confetti } from '@/components/visual/Confetti';
```

Inside the modal body, after the `<div className="text-6xl">🏆</div>`:

```tsx
<Confetti winnerColor={winner.color} />
```

- [ ] **Step 4: Visual check, commit**

```bash
git add -A
git commit -m "feat(web): smooth Pawn movement (CSS transition) + win confetti burst"
```

---

# Phase 8: Deploy

## Task 8.1: Update Coolify web app — point at root domain `ourgamenight.org`

**Files:**
- (No code changes — Coolify UI changes only)

- [ ] **Step 1: Push all v2 commits to GitHub**

```bash
git push origin master
```

- [ ] **Step 2: In Coolify, edit the existing web application**

- Open the web app's Configuration page in Coolify
- Change **URL (FQDN)** from `https://ludo.ourgamenight.org` → `https://ourgamenight.org`
- Update **Build-time secrets** (if needed):
  - `NEXT_PUBLIC_LUDO_HTTP` = `https://ws.ourgamenight.org` (unchanged)
  - `NEXT_PUBLIC_LUDO_WS` = `wss://ws.ourgamenight.org` (unchanged)
- Save → Deploy

The build will redeploy with the new domain. Coolify auto-issues a TLS cert for `ourgamenight.org` within ~30 seconds.

NOTE: in Cloudflare DNS, you must have an A record for `ourgamenight.org` (root, not just `ludo`) pointing to `91.99.156.162`. If not yet present, add it: Type=A, Name=`@`, Content=`91.99.156.162`, Proxy=DNS only.

- [ ] **Step 3: Smoke test**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://ourgamenight.org
# expect: 200
```

Open https://ourgamenight.org on a phone — should show the new game catalog.

## Task 8.2: Sunset `ludo.ourgamenight.org`

- [ ] **Step 1: In Coolify, find the old Ludo web application** (the one that was at `ludo.ourgamenight.org`).

If it was the same Coolify application that you just re-pointed to `ourgamenight.org`, the old subdomain is automatically gone — Traefik no longer knows about `ludo.ourgamenight.org`. Done.

If it's a separate application: stop and delete it.

- [ ] **Step 2: Optionally remove the DNS record**

In Cloudflare DNS for `ourgamenight.org`, delete the A record for `ludo` (the one pointing to `91.99.156.162`). Keeps the DNS clean. The subdomain will resolve to nothing.

## Task 8.3: Final smoke test on real phones

- [ ] **Step 1: Open https://ourgamenight.org on iPhone Safari and Android Chrome**
- [ ] **Step 2: Test the full Ludo flow** — set name, click "Ludo" card, create a game, copy share URL, open on the other phone, join, play to a winner
- [ ] **Step 3: Test the full Snakes & Ladders flow** — same, but pick the S&L card. Verify snakes/ladders animate, win modal shows confetti
- [ ] **Step 4: Add to Home Screen** on both phones (manifest already includes the cozy "L" icon — we'll iterate on a multi-game icon later)
- [ ] **Step 5: Tag the release**

```bash
git tag v0.2.0
git push --tags
```

---

# Self-Review checklist (run after completing all tasks)

- [ ] All existing tests still pass (Ludo 57, server 5+1=6, web 3, snakes engine ~25)
- [ ] `https://ourgamenight.org` loads game catalog
- [ ] Both Ludo and S&L play multiplayer end-to-end
- [ ] Pawns are visibly 3D in both games
- [ ] Win confetti shows on win
- [ ] `ludo.ourgamenight.org` returns nothing (sunset successful)
- [ ] Tag `v0.2.0` pushed to GitHub
