import type { GameType } from '@ludo/game-shared';
import type { GameEngine } from './types';
import { ludoEngine } from './ludo';

const ENGINES: Record<GameType, GameEngine> = {
  ludo: ludoEngine,
  // snakes: snakesEngine — registered in Phase 6
} as Record<GameType, GameEngine>;

export function getEngine(gameType: GameType): GameEngine {
  const e = ENGINES[gameType];
  if (!e) throw new Error(`No engine registered for gameType=${gameType}`);
  return e;
}

export type { GameEngine } from './types';
