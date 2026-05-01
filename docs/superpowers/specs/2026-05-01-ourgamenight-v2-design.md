# OurGameNight v2 — Multi-Game Hub Design Spec

**Date:** 2026-05-01
**Status:** Draft, pending user review
**Builds on:** `2026-04-29-ludo-design.md` (v1 spec — Ludo single-game app)

## Goal

Evolve the deployed Ludo app into a multi-game family hub at `ourgamenight.org`. Add **Snakes & Ladders** as the second game. Apply a shared "v2 look" (3D pawns + dimensional boards) to both games so they feel like sibling experiences. Reuse all the multiplayer plumbing (rooms, bots, AFK, reconnect, deploy) we built in v1.

## Non-goals (v2)

- Accounts, friends list, persistent identity beyond localStorage
- Game history / win counts / leaderboards
- Voice / video / chat
- Spectator mode, tournaments
- A third game (chess, dominos, etc.)
- Three.js / WebGL — all 3D is achieved via SVG + CSS
- Migration of `ludo.ourgamenight.org` URLs — sunset cleanly when v2 ships (no live family use yet)

## Core decisions

| Decision | Choice | Rationale |
|---|---|---|
| Hub UX | Game catalog grid at `/` | Cleanest, scales to N games, matches arcade-collection mental model |
| 3D scope | 3D pieces + dimensional boards (CSS/SVG only — no Three.js) | Real game-piece feel without bundle bloat or new framework |
| S&L ruleset | Vanilla + extra-turn-on-6 | Fast and luck-driven, tiny strategic spice on 6s |
| Share URL format | `ourgamenight.org/<game>/<code>` | URL identifies the game; bookmark-friendly; scales without subdomain sprawl |
| Profile model | Single shared profile across all games | Family plays as themselves regardless of game |
| Migration of `ludo.ourgamenight.org` | Sunset on v2 ship | No real users yet; clean break |
| Same visual language across games | Yes — Ludo upgrades alongside S&L | Sibling experiences, future games inherit automatically |

## Architecture

```
Ludo/                                     (existing repo, restructured)
├── packages/
│   ├── game-logic-ludo/                  (renamed from game-logic — pure Ludo rules)
│   ├── game-logic-snakes/                (NEW — pure Snakes & Ladders rules)
│   └── game-shared/                      (NEW — shared types: Room, Player, Profile, GameType, share-protocol)
├── apps/
│   ├── web/                              (Next.js — restructured for multi-game)
│   │   └── src/app/
│   │       ├── page.tsx                  (game catalog landing)
│   │       ├── ludo/[code]/page.tsx
│   │       └── snakes/[code]/page.tsx
│   └── server/                           (extended to handle multiple game types)
```

### The key isolation rule

Each `game-logic-*` package is a pure TypeScript module — no React, no DOM, no networking, no I/O. Both client and server import from it. Each implements the same `GameEngine` interface (see "Shared engine interface" below). Adding game N+1 = "write a new `game-logic-X` package + register the type in the server + add a route."

The multiplayer plumbing (rooms, dice, AFK, abandonment, room expiry, WebSocket transport) is **never** rewritten per game.

## Shared engine interface

Every game-logic package exports an engine that fits this interface:

```ts
interface GameEngine<S extends GameState, M extends Move> {
  createInitialState(input: { code: string; players: Player[]; now: number }): S;
  startGame(state: S, opts: { now: number }): S;
  applyRoll(state: S, value: number, opts: { now: number }): S;
  applyMove(state: S, move: M, opts: { now: number }): S;
  legalMoves(state: S, playerId: string): M[];
  isWin(state: S, playerId: string): boolean;
  chooseBotMove(state: S): M;
}
```

The base `GameState` shape (in `game-shared`) is:
- `code: string`
- `gameType: GameType`
- `status: 'lobby' | 'playing' | 'finished'`
- `players: Player[]`
- `turnOrder: string[]`
- `currentTurn: string | null`
- `dice: number | null`
- `rolledThisTurn: boolean`
- `winner: string | null`
- `log: GameEvent[]`
- `createdAt: number`
- `lastActivityAt: number`
- *(per-game extensions: tokens, snakes/ladders mappings, etc.)*

## Components & responsibilities

### Shared (`packages/game-shared`)
- `Player`, `Profile`, `GameType`, `BaseGameState`, `GameEvent` types
- `Room` (server-side) shape with `gameType`
- WebSocket message protocol (zod schemas)

### Per-game logic (`packages/game-logic-ludo`, `packages/game-logic-snakes`)
- Pure rules engine implementing `GameEngine`
- Game-specific types (e.g., Ludo's `TokenPosition`, S&L's `square: 0..100`)
- Tests

### Web app (`apps/web`)
- `page.tsx` — landing/catalog: shows game cards (Ludo, Snakes & Ladders), pick one to enter
- `lib/useLocalProfile.ts` — single shared profile (unchanged from v1, just lives at the app level)
- `lib/useRoomConnection.ts` — generic WebSocket room hook (unchanged)
- `app/ludo/[code]/page.tsx` — Ludo room route
- `app/snakes/[code]/page.tsx` — S&L room route
- Shared shell components: `ProfileForm`, `Lobby`, `PlayerPanel`, `ActivityLog`, `Dice`, `WinScreen`
- Game-specific components: `LudoBoard`, `SnakesBoard`
- Visual library (the v2 look): `Pawn`, `BoardSurface`, `LadderArt`, `SnakeArt`, animation primitives

### Server (`apps/server`)
- Engine registry: `{ ludo: LudoEngine, snakes: SnakesEngine }`
- `room.gameType` stamped at creation, immutable
- `handleBotTurns` and `armAfk` generalized to call the right engine
- All other infrastructure (RoomManager, ws-handler, AFK, abandonment, room expiry) unchanged

## Snakes & Ladders ruleset

- **Board:** 100 squares, standard boustrophedon numbering (1–10 left-to-right on bottom row, 11–20 right-to-left on row 2, etc.)
- **Players:** 2–4, one piece each
- **Dice:** single d6, server-side cryptographic
- **Movement:** roll → advance that many squares → resolve any snake or ladder at the landing square
- **Overshoot:** if `current + dice > 100`, the player stays put (no movement)
- **Snakes & ladders layout (Milton Bradley 1943, the most common):**
  - Ladders: 1→38, 4→14, 9→31, 21→42, 28→84, 36→44, 51→67, 71→91, 80→100
  - Snakes: 16→6, 47→26, 49→11, 56→53, 62→19, 64→60, 87→24, 93→73, 95→75, 98→78
- **Extra turn:** rolling a 6 grants another turn (per user choice)
- **Win:** first to land *exactly* on 100
- **Bot heuristic:** none — bots auto-roll, no decisions to make

## Visual direction (the "v2 look")

Applied uniformly across Ludo and Snakes & Ladders. Future games inherit automatically.

### Pieces (3D pawns)
- Pawn shape (rounded sphere on tapered base) instead of flat circles
- SVG-built: top sphere with radial highlight, body with linear gradient, drop shadow on board
- Slight perspective tilt (4–6°) — "looking down at a table"
- Bounce-in animation on placement/move (CSS spring, ~250ms)

### Boards (dimensional, not 3D scenes)
- Drop shadow underneath, subtle perspective tilt
- Faint paper/wood texture on the board surface (cozy theme retained)
- Track squares: tiny inset shadow on bottom-right edge ("engraved" look)
- Color regions: subtle radial gradient instead of flat fill

### Snakes & Ladders specifics
- **Ladders:** drawn as wooden ladders (two rails + rungs) with depth shading. Each rung casts a shadow.
- **Snakes:** winding curves with a body gradient, triangular head at the snake-head square, color-coded by length (short=green, long=purple) for instant readability.
- Snake/ladder squares glow softly when a token lands on them, before slide/climb plays.

### Special moments
- **Dice roll:** wiggle + cycle + settle (already shipped in v1)
- **Token move:** smooth ease-out along path (200ms per square, capped at 1.2s)
- **Snake slide (S&L only):** token shrinks slightly + slides down the snake's curve
- **Ladder climb (S&L only):** token jumps rung by rung
- **Capture (Ludo only):** captured token spins + falls back to home with bounce
- **Win:** confetti burst in winner's color across the board, win modal slides up

### Color/theme
- Cozy pastel palette retained (paper, ink, rust, sage, sky, honey, wood, edge)
- Each game gets a subtle "wash" color on its catalog card so they feel different at a glance:
  - Ludo: warm pink (rust)
  - Snakes & Ladders: sky blue
- Fonts unchanged: Fraunces (display) + Inter (body)

### Performance discipline
- All animations honor `prefers-reduced-motion`
- No Three.js, no WebGL — pure SVG + CSS
- Bundle size impact: ~5–10kb for new SVG paths, no library

## URL & routing

| Route | Purpose |
|---|---|
| `/` | Game catalog landing |
| `/profile` (optional) | Edit name + avatar |
| `/ludo/[code]` | Ludo room (lobby + game) |
| `/snakes/[code]` | S&L room (lobby + game) |

`POST /rooms { hostId, name, avatar, gameType }` returns `{ code }`. Web client redirects to `/<gameType>/<code>` after creation.

If a user pastes a code into a "Join with code" form on the landing page, the client first checks (via a new `GET /rooms/<code>` endpoint or via opening the WebSocket and reading the broadcast `state`) which game type the room is, then redirects to the correct route.

## Data model — message protocol changes

**Client → server messages** stay the same in shape:
- `join { code, playerId, name, avatar }` (the room's `gameType` is implicit — already stored)
- `addBot {}`, `start {}`, `roll {}`, `pass {}`, `playAgain {}`, `leave {}`
- `move { tokenId }` — `tokenId` is a string; for Ludo it's `'red-0'..'red-3'`, for S&L it's the playerId (single piece per player)

**Server → client `state` broadcast** includes `gameType` so the client knows which board component to render.

## Scope cut

### In v2
- Restructure existing Ludo into multi-game shape
- Game catalog landing
- Single shared profile
- Snakes & Ladders rules engine + UI + bot
- `gameType` plumbing throughout
- v2 visual pass on BOTH games (3D pawns, dimensional boards, ladders/snakes art, snake-slide and ladder-climb animations, win confetti)
- Deploy `ourgamenight.org` (web) + extended `ws.ourgamenight.org`
- Sunset `ludo.ourgamenight.org`

### Out of v2 (YAGNI)
- Accounts, friends, persistent identity beyond localStorage
- Game history, win counts, leaderboards
- Chat, voice, video, spectator mode, tournaments
- 3rd game
- Three.js / WebGL

## Build order

Each phase ends with something runnable & deployable.

1. **Restructure** — rename `packages/game-logic` → `packages/game-logic-ludo`, create `packages/game-shared` with shared types. Update imports. All existing 57 game-logic tests still pass under the new name.
2. **Server multi-game scaffolding** — add `gameType` to room state and creation API; add engine registry; register Ludo engine. Existing Ludo flows untouched.
3. **Web app restructure** — landing page (catalog) at `/`, profile management, Ludo route at `/ludo/[code]`. End state: family hits the new URL → identical Ludo experience as v1.
4. **S&L rules engine (TDD)** — `packages/game-logic-snakes`, ~25 tests. End state: full S&L game playable in a Node REPL.
5. **S&L UI (local prototype)** — board layout module, board component (basic snakes + ladders art), wired to local store against bots. End state: playable single-player S&L at `/snakes` (no server).
6. **S&L on the server** — register engine in server, S&L move validation, bot turns. End state: family plays multiplayer S&L end-to-end via WebSocket.
7. **v2 visual pass** — pawns become 3D, boards get dimensional shading, ladders/snakes get illustrated treatment, animations (move ease-out, snake slide, ladder climb, Ludo capture spin, win confetti). Applied to BOTH games.
8. **Deploy** — Coolify update: redeploy web app to `ourgamenight.org` (root domain in Coolify), redeploy server (no domain change). Sunset `ludo.ourgamenight.org` in Coolify.

**Estimated effort:** ~2 focused weekends. Phases 1–3 mostly mechanical. Phase 4 fast (simpler rules than Ludo). Phase 7 biggest single chunk.

## Testing strategy

- **`game-logic-snakes/`** — strict TDD, ~25 tests. Every rule (overshoot stays put, snake slide, ladder climb, win, extra turn on 6) gets a test.
- **`game-logic-ludo/`** — existing 57 tests carry over unchanged after rename.
- **Server** — extend integration test to cover S&L flow (one client opens an S&L room, joins, plays a roll, sees state broadcast).
- **Web** — existing layout tests pass under the new structure. Add a smoke test for `SnakesBoard` rendering all 100 squares.
- **Skipped** — visual styling tests (subjective), animation timing tests, bot strategy tests for S&L (no decisions).

## Open questions to resolve in implementation planning

- Exact SVG layout for the S&L board (the 10×10 grid mapping is mechanical; visual polish of ladder/snake art is iterative)
- Whether to add a "wash color" to room URLs/titles in the activity log so the activity feed is visually game-distinguishing
- Whether to ship the `/profile` route in v2 or hide it behind a settings icon
- Whether the catalog page should preview the player count from currently-active rooms (probably not — privacy + complexity)
