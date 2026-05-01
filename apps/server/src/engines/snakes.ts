import {
  createInitialState, startGame, applyRoll, applyMove,
  legalMoves, isWin, chooseBotMove,
} from '@ludo/game-logic-snakes';
import type { GameEngine } from './types';

export const snakesEngine: GameEngine = {
  createInitialState: createInitialState as never,
  startGame: startGame as never,
  applyRoll: applyRoll as never,
  applyMove: applyMove as never,
  legalMoves: legalMoves as never,
  isWin: ((stateOrTokens: unknown, playerId: string) => {
    // S&L's isWin takes the full state. Detect shape.
    if (stateOrTokens && typeof stateOrTokens === 'object' && 'tokens' in (stateOrTokens as object)) {
      return isWin(stateOrTokens as never, playerId);
    }
    return false;
  }),
  chooseBotMove: chooseBotMove as never,
};
