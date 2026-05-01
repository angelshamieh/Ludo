import {
  createInitialState, startGame, applyRoll, applyMove,
  legalMoves, isWin, chooseBotMove,
} from '@ludo/game-logic-tictactoe';
import type { GameEngine } from './types';

export const tictactoeEngine: GameEngine = {
  createInitialState: createInitialState as never,
  startGame: startGame as never,
  applyRoll: applyRoll as never,
  applyMove: applyMove as never,
  legalMoves: legalMoves as never,
  isWin: ((stateOrTokens: unknown, playerId: string) => {
    if (stateOrTokens && typeof stateOrTokens === 'object' && 'board' in (stateOrTokens as object)) {
      return isWin(stateOrTokens as never, playerId);
    }
    return false;
  }),
  chooseBotMove: chooseBotMove as never,
};
