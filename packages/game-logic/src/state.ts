import type { GameState, Player, Token } from './types';
import { COLORS } from './types';

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
    // Defensive shallow copy — caller may keep mutating their array (e.g. lobby seat changes)
    players: [...players],
    // turnOrder + currentTurn are populated by startGame()
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
