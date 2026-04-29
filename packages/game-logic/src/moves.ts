import type { GameState, Move, Token, TokenPosition } from './types';
import { FINISH_INDEX } from './board';

/** Where would the given token end up if moved by `dice` pips? Returns null if the move is illegal. */
export function projectMove(token: Token, dice: number): TokenPosition | null {
  if (token.position.kind === 'home') {
    return dice === 6 ? { kind: 'path', index: 0 } : null;
  }
  // path
  const next = token.position.index + dice;
  if (next > FINISH_INDEX) return null; // overshoot — illegal in classic Western
  return { kind: 'path', index: next };
}

/**
 * Returns the moves available to `playerId` given the current state.
 *
 * - Returns `[]` when it is not the player's turn OR they have not rolled.
 *   Callers MUST NOT interpret this empty result as "forced pass".
 * - Returns `[{ kind: 'pass' }]` when the player has rolled but no token can move.
 * - Otherwise returns one `move` entry per token that can legally advance.
 */
export function legalMoves(state: GameState, playerId: string): Move[] {
  if (state.currentTurn !== playerId) return [];
  if (state.dice == null || !state.rolledThisTurn) return [];
  const dice = state.dice;
  const tokens = state.tokens[playerId] ?? [];
  const moves: Move[] = [];
  for (const t of tokens) {
    if (projectMove(t, dice) != null) {
      moves.push({ kind: 'move', tokenId: t.id });
    }
  }
  if (moves.length === 0) return [{ kind: 'pass' }];
  return moves;
}
