import type { BaseGameState, Player, GameEvent } from '@ludo/game-shared';

export type Mark = '' | 'X' | 'O';

export type GameState = BaseGameState & {
  board: Mark[];
  marks: Record<string, 'X' | 'O'>;
  difficulty: 'easy' | 'hard';
  tokens: Record<string, never>;
};

export type Move = { kind: 'place'; cell: number };

export type { Player, GameEvent } from '@ludo/game-shared';
