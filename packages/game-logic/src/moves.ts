import type { GameState, Move, Token, TokenPosition } from './types';

const FINISH = 56;

/** Where would the given token end up if moved by `dice` pips? Returns null if the move is illegal. */
export function projectMove(token: Token, dice: number): TokenPosition | null {
  if (token.position.kind === 'home') {
    return dice === 6 ? { kind: 'path', index: 0 } : null;
  }
  // path
  const next = token.position.index + dice;
  if (next > FINISH) return null; // overshoot — illegal in classic Western
  return { kind: 'path', index: next };
}

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
