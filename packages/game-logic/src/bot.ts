import type { GameState, Move } from './types';
import { legalMoves, projectMove } from './moves';
import { trackAbsolute, SAFE_ABSOLUTE_SQUARES, LAST_SHARED_TRACK_INDEX } from './board';

const moveScore = (state: GameState, move: Move): number => {
  if (move.kind === 'pass') return -100;
  const playerId = state.currentTurn!;
  const myToken = state.tokens[playerId]!.find((t) => t.id === move.tokenId)!;
  const proj = projectMove(myToken, state.dice!);
  if (!proj || proj.kind !== 'path') return 0;

  let score = 0;
  // Captures: +1000 plus 100 per captured token
  if (proj.index <= LAST_SHARED_TRACK_INDEX) {
    const myAbs = trackAbsolute(myToken.color, proj.index);
    if (!SAFE_ABSOLUTE_SQUARES.has(myAbs)) {
      let caps = 0;
      for (const otherId of Object.keys(state.tokens)) {
        if (otherId === playerId) continue;
        for (const v of state.tokens[otherId]!) {
          if (v.position.kind !== 'path' || v.position.index > LAST_SHARED_TRACK_INDEX) continue;
          if (trackAbsolute(v.color, v.position.index) === myAbs) caps++;
        }
      }
      if (caps > 0) score += 1000 + caps * 100;
    }
  }

  // Leave-home bonus
  if (myToken.position.kind === 'home' && proj.kind === 'path' && proj.index === 0) {
    score += 50;
  }

  // Approaching finish: progress * 1
  score += proj.index;
  return score;
};

export function chooseBotMove(state: GameState): Move {
  const playerId = state.currentTurn;
  if (!playerId) return { kind: 'pass' };
  const moves = legalMoves(state, playerId);
  if (moves.length === 0) return { kind: 'pass' };
  let best = moves[0]!;
  let bestScore = moveScore(state, best);
  for (const m of moves.slice(1)) {
    const s = moveScore(state, m);
    if (s > bestScore) { best = m; bestScore = s; }
  }
  return best;
}
