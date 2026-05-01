import type { BaseGameState, Player, GameEvent } from '@ludo/game-shared';

/** Square 0 = off the board (haven't moved yet). 1..100 = board squares. 100 = win. */
export type Square = number;

export type GameState = BaseGameState & {
  /** Mapping of playerId → current square (0..100). */
  tokens: Record<string, Square>;
};

export type Move = { kind: 'auto' };
// S&L has no decisions per turn — the only "move" is to commit the dice roll.

export type { Player, GameEvent } from '@ludo/game-shared';
