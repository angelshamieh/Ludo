import type { GameType } from '@ludo/game-shared';
import type { GameEngine } from './types';
import { ludoEngine } from './ludo';
import { snakesEngine } from './snakes';

const ENGINES: Partial<Record<GameType, GameEngine>> = {
  ludo: ludoEngine,
  snakes: snakesEngine,
  // tictactoe registered in Phase 3
};

export function getEngine(gameType: GameType): GameEngine {
  const e = ENGINES[gameType];
  if (!e) throw new Error(`No engine registered for gameType=${gameType}`);
  return e;
}

export type { GameEngine } from './types';
