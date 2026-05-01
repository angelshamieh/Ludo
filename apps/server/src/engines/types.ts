import type { BaseGameState, Player } from '@ludo/game-shared';

export interface GameEngine<S extends BaseGameState = BaseGameState, M = unknown> {
  createInitialState(input: { code: string; players: Player[]; now: number }): S;
  startGame(state: S, opts: { now: number }): S;
  applyRoll(state: S, value: number, opts: { now: number }): S;
  applyMove(state: S, move: M, opts: { now: number }): S;
  legalMoves(state: S, playerId: string): M[];
  isWin(stateOrTokens: unknown, playerId: string): boolean;
  chooseBotMove(state: S): M;
}
