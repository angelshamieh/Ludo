export type Color = 'red' | 'green' | 'blue' | 'yellow';

export const COLORS: readonly Color[] = ['red', 'green', 'yellow', 'blue'] as const;

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
  code: string;                 // 4-letter room code, e.g. "ABCD"
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
