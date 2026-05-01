import {
  createInitialState, startGame, applyRoll, applyMove,
  legalMoves, isWin, chooseBotMove,
} from '@ludo/game-logic-ludo';
import type { GameEngine } from './types';

export const ludoEngine: GameEngine = {
  createInitialState,
  startGame,
  applyRoll,
  applyMove,
  legalMoves,
  isWin,
  chooseBotMove,
} as unknown as GameEngine;
