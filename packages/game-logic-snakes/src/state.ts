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
