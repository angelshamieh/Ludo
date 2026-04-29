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
