export type GameType = 'ludo' | 'snakes' | 'tictactoe';

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
