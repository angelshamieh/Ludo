import type { GameType } from '@ludo/game-shared';
import type { GameEngine } from './types';
import { ludoEngine } from './ludo';
import { snakesEngine } from './snakes';
import { tictactoeEngine } from './tictactoe';

const ENGINES: Record<GameType, GameEngine> = {
  ludo: ludoEngine,
  snakes: snakesEngine,
  tictactoe: tictactoeEngine,
};

export function getEngine(gameType: GameType): GameEngine {
  const e = ENGINES[gameType];
  if (!e) throw new Error(`No engine registered for gameType=${gameType}`);
  return e;
}

export type { GameEngine } from './types';
