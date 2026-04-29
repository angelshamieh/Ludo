# Ludo — Design Spec

**Date:** 2026-04-29
**Status:** Draft, pending user review

## Goal

Build a Ludo board game that the user can share with family soon as a web app. Family plays online from their own devices (different homes), with the option to fill empty seats with AI bots. Mobile-first — most play sessions will happen on phones.

## Non-goals (v1)

- Accounts, login, friend lists
- Stats, history, leaderboards
- In-game chat, voice, or video
- Push notifications
- Multiple rule variants (only Classic Western Ludo)
- Spectator mode, tournaments, multi-round formats
- Persistent game state across server restarts
- Native app wrapper (path is left open; not built in v1)
- Pass-and-play on a single device (may be added later)

## Core decisions

| Decision | Choice | Rationale |
|---|---|---|
| Multiplayer mode | Online multiplayer, each player on their own device | User's family plays from different locations |
| Identity | Anonymous local profile (name + UUID in localStorage) | Zero-signup friction; accounts can be added later without re-architecting |
| Lobby model | Private rooms with 4-letter code + share link | Lowest friction for casual family play |
| Player count | 2–4 humans, host may add AI bots to fill seats | Flexibility for variable attendance |
| Ruleset | Classic Western Ludo | User selection. Roll a 6 to leave home, capture by landing on opponent (except safe squares), exact roll to enter center |
| Visual style | Cozy & warm — soft pastels, rounded corners, paper/wood feel | User selection |
| Platform | Web app (Next.js + React + TypeScript), PWA-installable | Single shareable URL, no app stores; "Add to Home Screen" gives app-like feel |
| Path to native | Capacitor wrap of same web codebase, later | All game logic stays in web/TS code; no host-specific or Next-only dependencies for game logic |
| Form factor | Mobile-first (portrait phone), desktop is a wider variant | User will mostly play on mobile |
| Deployment | Coolify on user's VPS, two services on separate subdomains | Self-hosted, single host, low cost, same pattern user already runs for other projects |

## Architecture

Three pieces, with strict isolation between them:

### 1. Web client — Next.js + React + TypeScript

Renders the lobby and game board, handles input. Includes PWA manifest + service worker for "Add to Home Screen" install. Imports the pure `game-logic/` module to preview legal moves and animate UI optimistically, but never decides outcomes.

### 2. Realtime game server — Node.js + WebSockets

Holds authoritative `GameState` for each room in memory. Validates every action via `game-logic.legalMoves(state, dice)`. Broadcasts state snapshots to all room members. Stateless except for the in-memory room map; rooms expire 10 minutes after the last player leaves.

Hosting target: **Coolify** on the user's VPS — see "Deployment" section below. Long-lived WebSocket connections work natively (Coolify uses Traefik as the reverse proxy).

### 3. Lightweight persistence — Postgres (Supabase or Neon free tier)

In v1, used only for finished-game records (timestamp, players, winner) and room-code reservation if needed. Keeps the door open for accounts/history without re-architecting; can be omitted from initial deploy if it adds friction.

### The key isolation rule

`game-logic/` is a pure TypeScript module: no React, no DOM, no networking, no I/O. Both the client and the server import the same module. If a rule changes, it changes in one place. If you can't run a full game by writing a test that imports only `game-logic/`, the boundaries are wrong.

## Components & responsibilities

### Frontend

| Component | Responsibility |
|---|---|
| `pages/index` | Landing page: "Create Game" / "Join with code" |
| `pages/room/[code]` | Lobby + game board (one route, two states based on `status`) |
| `Board` | Renders the cozy pastel board as scalable SVG |
| `Token` | A single piece; animates along the path of squares |
| `Dice` | Roll animation; shows result; disabled outside your turn |
| `PlayerPanel` | Player list, current-turn highlight, captured counts |
| `Lobby` | Pre-game seat picker, add/remove bot, share link, start button |
| `useRoomConnection` | Hook wrapping the WebSocket — connect, reconnect, send, receive |
| `useLocalProfile` | Loads/saves `{ playerId, name, avatar }` from `localStorage` |

### Backend

| Module | Responsibility |
|---|---|
| `game-logic/` | Pure functions: `initialState(players)`, `legalMoves(state, dice)`, `applyMove(state, move)`, `isWin(state)`. No I/O. |
| `room-manager` | In-memory `Map<code, Room>`. Handles join, leave, start, kick, expire. |
| `bot-player` | Heuristic: capture > leave home > advance furthest token. Adds 600–1000ms artificial delay before playing. |
| `ws-handler` | Translates incoming WebSocket messages to `room-manager` calls; broadcasts state snapshots. |
| `dice` | Server-side roll using `crypto.randomInt(1, 7)`. |

## Data model

```ts
type Color = 'red' | 'green' | 'blue' | 'yellow';
type TokenPosition =
  | { kind: 'home' }
  | { kind: 'track'; index: 0 | 1 | ... | 51 }
  | { kind: 'finalRun'; index: 0 | 1 | 2 | 3 | 4 }
  | { kind: 'finished' };

type Player = {
  id: string;          // UUID, persisted in client localStorage
  name: string;
  avatar: string;      // emoji or initial
  color: Color;
  isBot: boolean;
  isHost: boolean;
  connected: boolean;
};

type GameState = {
  code: string;                          // 4 uppercase letters
  status: 'lobby' | 'playing' | 'finished';
  players: Player[];                     // 2-4 entries
  turnOrder: string[];                   // playerIds, fixed once game starts
  currentTurn: string | null;            // playerId
  dice: number | null;                   // 1..6 or null
  rolledThisTurn: boolean;
  consecutiveSixes: number;              // for "three sixes voids turn" if added later
  tokens: Record<string, Token[]>;       // playerId -> 4 tokens
  winner: string | null;
  log: GameEvent[];                      // last ~20 events
  createdAt: number;
  lastActivityAt: number;
};
```

## Message protocol (WebSocket, JSON)

**Client → server:**
- `join { code, playerId, name, avatar }`
- `pickColor { color }`
- `addBot {}` (host only)
- `removeBot { botId }` (host only)
- `start {}` (host only)
- `roll {}`
- `moveToken { tokenId }`
- `leave {}`

**Server → client:**
- `state` — full `GameState` snapshot, broadcast to room on every change
- `error { code, message }` — to offending client only (e.g., `NOT_YOUR_TURN`, `ILLEGAL_MOVE`, `ROOM_NOT_FOUND`, `ROOM_FULL`)

**Why full snapshots, not diffs:** state is small (a few KB). Snapshots eliminate drift bugs and make reconnect trivial — the client just renders whatever it last received.

## Player identity (no signup)

- On first visit, the app prompts for a display name and shows a small emoji picker.
- Stores `{ playerId: UUID, name, avatar }` in `localStorage`.
- The same `playerId` is sent on every `join` — this is what reclaims your seat after a refresh or disconnect.
- No password, email, or phone. Trust model is "this is a family game; the share link is the credential."
- Host can kick anyone from the lobby pre-game.

When accounts are added later, the existing `playerId` becomes linked to the new account — no migration pain.

## Reliability behavior

| Situation | Behavior |
|---|---|
| Bad/expired room code | Friendly "This game can't be found" + back to landing page |
| Network drop mid-game | Banner: "Reconnecting..." with spinner; auto-reconnect with backoff (1s → 2s → 4s, capped at 10s); on success, snapshot rehydrates UI |
| Player disconnect | Marked `connected: false`; their seat is held |
| Player AFK on their turn | After 60s, others see "Skip turn?" prompt; auto-skip after 90s |
| Player abandons (>2 min disconnected) | Replaced by a bot for the rest of the game; game continues. They can rejoin and reclaim if they return |
| Host disconnects mid-game | Game continues unaffected — host has no in-game powers once the game has started |
| Illegal move attempt | Client UI greys out illegal moves. If a bad move slips to server, it's silently rejected and a fresh state snapshot is broadcast |
| Server restart / crash | Active rooms are lost. Players see "Connection lost — start a new game." Accepted v1 limitation |

## Anti-cheat

- Server rolls all dice using `crypto.randomInt`.
- Server validates every move via `game-logic.legalMoves`.
- Client may *preview* moves but cannot *cause* an illegal one to land.

## Mobile-first UX requirements

These are first-class constraints, not polish:

- Designed for portrait phone screens first; desktop is a wider variant of the same layout
- Board fills screen width on mobile; player panel stacks vertically below the board (mobile) or sits as a sidebar (desktop)
- Min 44×44pt tap targets (Apple HIG); tokens get an extended invisible hit-area so small pieces remain tappable
- Primary actions (Roll, End turn, Confirm move) anchored to the bottom of the screen for one-handed reachability
- No hover-only affordances; every hover state has a tap-first equivalent
- Haptic feedback on roll, move, and capture (where supported via Vibration API)
- Animations ≤ 400ms; honor `prefers-reduced-motion` (skip animations, jump to final state)
- iOS safe-area insets respected (`env(safe-area-inset-*)`)
- Use `dvh` units (with `vh` fallback) so the board doesn't get hidden under iOS Safari's collapsing address bar
- Lobby "Share" button uses the Web Share API on mobile (single tap → WhatsApp / iMessage)
- "Add to Home Screen" prompt surfaces after the first completed game
- Tested on real iPhone Safari + Android Chrome before any feature is called done

## Testing strategy

- **`game-logic/`** — strict TDD, high coverage. Every rule (leave home on 6, capture on landing, safe squares, exact-roll-to-finish, win condition, blockades) gets a test. Pure functions make this fast and reliable.
- **Server** — integration tests: spin up the server in-process, connect two fake WebSocket clients, simulate a multi-turn game, assert state transitions and message payloads.
- **Client** — light component tests for the lobby and the dice/board interactions; one Playwright end-to-end test that opens two browser contexts, plays through to a win.
- **Skipped** — visual styling tests, animation tests, exhaustive bot strategy tests (any legal move is acceptable).

## Build order

Each step ends with something runnable.

1. **Core game logic + unit tests.** TDD the rules end-to-end with no UI. End state: full game playable in a Node REPL.
2. **Static board + token UI.** Render a `GameState` with no interaction, no network. Validate the cozy pastel look on real devices.
3. **Local single-player against bots.** Wire UI to `game-logic` in-browser. No server. Proves the gameplay loop is fun.
4. **Server + WebSocket protocol.** Node server, in-memory rooms, snapshot broadcast. Two browser tabs play together over localhost.
5. **Lobby, room codes, share links, reconnect.** Turns the prototype into a shareable experience.
6. **Bot turn handling on server.** Bots play their own turns automatically.
7. **Polish — animations, AFK handling, win screen, PWA install, mobile UX pass.** The "feels finished" iteration.
8. **Deploy.** Both services to Coolify on user's VPS — see "Deployment" section.

## Deployment

Both services run as separate Coolify "applications" on the user's existing VPS, each with its own subdomain and auto-managed TLS via Let's Encrypt (Coolify handles this through Traefik).

### Service A — Web (Next.js)

- **Subdomain:** `LUDO_WEB_DOMAIN` (placeholder — e.g. `ludo.example.com`)
- **Build:** Dockerfile in `apps/web/Dockerfile` (Node 20, multi-stage, runs `next build`)
- **Runtime:** `next start` on port 3000
- **Coolify config:** General application, exposes port 3000, domain set to `LUDO_WEB_DOMAIN`
- **Env vars:**
  - `NEXT_PUBLIC_LUDO_HTTP=https://LUDO_WS_DOMAIN`
  - `NEXT_PUBLIC_LUDO_WS=wss://LUDO_WS_DOMAIN`

### Service B — WebSocket server (Node)

- **Subdomain:** `LUDO_WS_DOMAIN` (placeholder — e.g. `ludo-ws.example.com`)
- **Build:** Dockerfile in `apps/server/Dockerfile`
- **Runtime:** `node apps/server/dist/index.js`
- **Coolify config:** General application, exposes a single HTTP port (8787) — the same port serves both the `POST /rooms` HTTP endpoint and the WebSocket upgrade. Traefik handles `wss://` termination automatically.
- **Env vars:**
  - `PORT=8787`
  - `CORS_ORIGIN=https://LUDO_WEB_DOMAIN`

### Why one port (not two)

Earlier the plan assumed separate HTTP (8787) and WS (8788) ports. Coolify + Traefik works most cleanly with **one port per service**, with the WebSocket upgrade handled on the same port as HTTP. The implementation is updated to listen for both on the single HTTP server (the `ws` library supports `noServer: true` mode where you attach to an existing http.Server's `upgrade` event).

### DNS

User points two A records at the VPS IP:
```
LUDO_WEB_DOMAIN     →  <VPS IP>
LUDO_WS_DOMAIN      →  <VPS IP>
```
Coolify auto-issues TLS certificates for both within ~30 seconds of the domain being added.

### Persistence (deferred)

Postgres is **not** deployed for v1. The spec leaves the door open to add it (finished-game records, future accounts), but it's omitted from the initial Coolify deploy to keep the surface area small. Adding it later = a third Coolify application (Coolify has a one-click Postgres template) plus a `DATABASE_URL` env var on the server.

## Open questions to resolve in implementation planning

- Exact path layout (square indices) on the cozy pastel board — agreed on rules, but the SVG coordinate system needs to be authored.
- Bot heuristic tuning (currently spec'd as a simple priority ordering — may want a small "look-ahead one move" pass to feel less robotic).
- Whether to include any sound effects in v1 polish, or defer.
- Whether "Add to Home Screen" coaching needs a visible explainer, or just the browser's native prompt is enough.
