# Tic-Tac-Toe — Design Spec (v2.1)

**Date:** 2026-05-01
**Status:** Draft, pending user review
**Builds on:** `2026-05-01-ourgamenight-v2-design.md` (multi-game hub architecture)

## Goal

Add **Tic-Tac-Toe** as the third game in the OurGameNight hub. Slots cleanly into the existing v2 architecture (engine registry, shared types, per-game routes). Multiplayer-first like Ludo and Snakes & Ladders — share a link, two players play in real time. Optional AI bot can fill the second seat with selectable difficulty.

## Non-goals

- Hint mode ("best next move" suggestion)
- Tournament / best-of-N rounds
- Bigger boards (4×4, 5×5)
- Time limits per move
- Spectator mode
- Bot difficulty mid-game changes (locked once game starts)

## Core decisions

| Decision | Choice | Rationale |
|---|---|---|
| Gameplay | Standard Tic-Tac-Toe (3×3, three-in-a-row) | What everyone knows |
| Multiplayer-first | Yes — same flow as Ludo and S&L (room code, share link) | Family plays online together |
| Bot mode | Optional second-seat bot | Single-player fallback |
| Bot difficulty | Easy (random) / Hard (minimax) — toggle in lobby, host-only, locked at start | Easy for kids, hard for challenge |
| Default difficulty | `easy` | Family-friendly default |
| Player count | Exactly 2 (lobby refuses > 2 or < 2 to start) | Tic-Tac-Toe is 2-player |
| Seat assignment | First in turn order = red = plays X. Second = blue = plays O. | Consistent with existing color/turn system |
| Visual | 3D pawns (red rust pawn for X, sky pawn for O) — NOT literal X/O glyphs | Same visual vocabulary across all games |

## Architecture

```
packages/
├── game-shared/                          (existing — extend GameType to include 'tictactoe')
├── game-logic-ludo/                      (existing, untouched)
├── game-logic-snakes/                    (existing, untouched)
└── game-logic-tictactoe/                 (NEW — pure rules engine)

apps/
├── server/
│   └── src/engines/tictactoe.ts          (NEW — wraps engine into GameEngine interface)
└── web/
    └── src/
        ├── app/tictactoe/[code]/page.tsx (NEW — lobby + board)
        ├── app/tictactoe/new/page.tsx    (NEW — POST /rooms with gameType=tictactoe)
        ├── components/tictactoe/Board.tsx (NEW)
        ├── components/tictactoe/DifficultyToggle.tsx (NEW)
        └── lib/tictactoe/boardLayout.ts   (NEW)
```

### Engine interface — flexing for no-dice games

The shared `GameEngine` interface from v2 has `applyRoll`. Tic-Tac-Toe doesn't roll dice. Two compatibility points:

1. **Server's `case 'roll':`** branches by `room.gameType`. Add a third branch: `if (gameType === 'tictactoe') ignore` — but actually the web client never sends `roll` for tic-tac-toe, so the branch is defensive.
2. **Engine's `applyRoll` is a no-op** that throws (defensive — anyone calling it on tic-tac-toe state has a bug). The web client checks `state.gameType` and renders only the board + status, no dice button.

The Tic-Tac-Toe `chooseBotMove` doesn't depend on dice — bot just picks a valid move based on the board.

## Tic-Tac-Toe ruleset

- **Board:** 3×3 grid, 9 cells indexed 0..8 (row-major: `r0c0=0`, `r0c1=1`, ..., `r2c2=8`)
- **Players:** exactly 2 (1 human + 1 bot, or 2 humans)
- **First player:** plays X (red color, position 0 in turn order)
- **Second player:** plays O (blue color, position 1)
- **Move:** on your turn, pick any empty cell. That cell becomes your mark.
- **Turn:** after every move, turn passes to the other player. No extra turns.
- **Win:** three of your marks in a row, column, or diagonal — 8 possible win lines:
  - Rows: 0-1-2, 3-4-5, 6-7-8
  - Columns: 0-3-6, 1-4-7, 2-5-8
  - Diagonals: 0-4-8, 2-4-6
- **Draw:** all 9 cells filled, no win line completed. `winner` stays null. Game status flips to `finished`. A `draw` event is appended to log.

## Data model

```ts
type Mark = '' | 'X' | 'O';

type GameState = BaseGameState & {
  /** 9-cell row-major board. Empty string = unplayed. */
  board: Mark[];
  /** Each player's mark assignment. */
  marks: Record<string, 'X' | 'O'>;
  /** Bot heuristic difficulty. Only meaningful when a bot plays. Locked once game starts. */
  difficulty: 'easy' | 'hard';
  /** No tokens for tic-tac-toe — board is the source of truth. Empty Record satisfies BaseGameState. */
  tokens: Record<string, never>;
};

type Move = { kind: 'place'; cell: number };  // cell index 0..8
```

The wire protocol uses the existing `move { tokenId }` message — `tokenId` carries the cell index as a stringified number (e.g., `"4"` for center). The server parses it.

`progressLabel` adapter for tic-tac-toe returns `"X"` or `"O"` (the player's mark) instead of pawn-count.

## Bot heuristics

### Easy (default — `'easy'`)
- Pick a random empty cell.
- Used when families want kids to win sometimes.
- ~5 lines of code.

### Hard (`'hard'`)
- Minimax with alpha-beta pruning.
- Bot = "X" or "O", whichever they're playing. Score: +10 win, -10 loss, 0 draw, depth-discounted.
- Game tree is tiny (~26k paths) — exhausts in <1ms.
- **Bot will never lose.** Best human result against hard bot = draw.

### Difficulty toggle UI
- Visible only in **tic-tac-toe** lobby and only to the **host**
- Two buttons: `[ Easy ]` / `[ Hard ]`. Highlight the current selection.
- Server message: `{ type: 'setDifficulty', value: 'easy' | 'hard' }`
- Server validates: must be host, room must be in `lobby` status
- Default `'easy'`. Locked once `start` fires.

## Visual treatment

### Board
- 3×3 SVG grid, 80px cell size (whole board ~240×240)
- Cell stroke: 1.5px wood-tone (`#c8b18a`, the existing edge color)
- Inset shadow per cell for "engraved" feel (matches v2 visual language)
- Subtle drop shadow under the whole grid + 4° perspective tilt

### Marks (X and O)
- Use the existing `<Pawn>` component from `apps/web/src/components/visual/Pawn.tsx`
- X player = rust pawn placed at cell center
- O player = sky pawn placed at cell center
- Why pawns not glyphs: same visual language as Ludo and S&L. Players see "I'm the red one, I place pieces" — consistent.

### Empty-cell hint
- On your turn, every empty cell gets the same amber halo + sparkle treatment as movable Ludo tokens
- Tap an empty cell → it places your mark there (animated bounce-in)
- Filled cells have no hint, are not clickable

### Win line + win celebration
- Animate a thick semi-transparent gold line (`#fbbf24` opacity 0.8) drawing through the 3 winning cells over ~400ms
- The 3 winning pawns get a subtle pulse/glow
- Trophy 🏆 modal shows winner name (existing WinScreen component)
- Confetti uses winner's color (existing Confetti component)

### Draw
- No win-line. Game ends with status banner: "It's a draw!"
- Light confetti in paper/wood neutrals (no winner color)
- WinScreen modal shows "🤝 Draw" with "Play again" button (host only)

### Status banner (bottom of screen)
- For tic-tac-toe rooms, **no dice button** is shown — replaced by status text only
- Status:
  - `Your turn — tap a cell` (your move)
  - `Waiting on Sara…` (opponent's move)
  - `🏆 Sara wins!` (game over, opponent won)
  - `🤝 Draw — no winner!` (game over, draw)

### Catalog card
- Third `<GameCard>` on `/`
- Accent: `bg-amber/25` (warm yellow — visually distinguishable from Ludo's rust and S&L's sky)
- Icon: ❌ or ⭕ (pick one — leaning ❌)
- Tagline: "Three in a row"

## Activity feed

Two new event icons in `formatEvent` and `eventIcon`:
- `placed`: ❌ if mark is X, ⭕ if O — message "Mom placed X at center"
- `draw`: 🤝 — message "Draw — no winner"

(`turn`, `won` events reuse existing icons.)

## Reliability behavior (inherits from existing infrastructure)

- **Reconnect:** same `useRoomConnection` hook with backoff retry
- **AFK:** existing 90s timer auto-plays a random move on the AFK player's behalf (engine's `chooseBotMove` with `difficulty='easy'` is the auto-play strategy)
- **Abandonment:** existing 2-min timer converts the disconnected human to an "easy" bot, game continues
- **Room expiry:** same 10-min idle sweep

## Testing

- **`game-logic-tictactoe`** — strict TDD, ~25 tests:
  - Initial state empty board, default difficulty
  - `applyMove` places mark, rejects on occupied cell, rejects when not your turn
  - All 8 win lines detected (parametrized test)
  - Draw detected when all cells filled, no winner
  - `legalMoves` returns empty cells when your turn, `[]` otherwise
  - `chooseBotMove` (easy) returns a legal move
  - `chooseBotMove` (hard) picks immediate win when one exists
  - `chooseBotMove` (hard) blocks opponent's immediate win
  - `chooseBotMove` (hard) on empty board picks any move (all moves are equal-value)
- **Server** — extend integration test with one tic-tac-toe room
- **Web** — board layout test (cellToCoords mapping)

## Build order

8 phases, each ends with something runnable:

1. **Extend `GameType` to `'tictactoe'`** + add 3rd `<GameCard>` to catalog (404s until Phase 5+)
2. **Tic-Tac-Toe rules engine (TDD)** — full ruleset, both bots, ~25 tests
3. **Server engine registration** + `setDifficulty` message + lobby cap=2 enforcement for tic-tac-toe
4. **Tic-Tac-Toe Board component + boardLayout module**
5. **Local prototype** at `/tictactoe/[code]` (vs bot)
6. **Replace prototype with real WebSocket flow** — Lobby renders DifficultyToggle for host, win-line animation, draw modal
7. **Polish** — empty-cell hint sparkles, tap feedback, mobile testing
8. **Deploy** to `ourgamenight.org` (existing infra)

**Estimated effort:** ~half a day. Smaller than Snakes & Ladders because:
- No board-coordinate complexity (3×3 vs 10×10 boustrophedon)
- No snake/ladder illustrations
- Smaller game tree

## Open questions to resolve in implementation planning

- Whether to use literal `0..8` cell indices or a `r{N}c{N}` string format on the wire (probably the simpler `0..8`)
- Whether the catalog card icon is `❌` or a custom 3D X-shape SVG
- Whether the win-line animation uses SVG `<animate>` or CSS — likely SVG for consistency with the existing dice/sparkle animations
