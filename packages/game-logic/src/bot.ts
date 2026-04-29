import type { GameState, Move } from './types';
import { legalMoves, projectMove } from './moves';
import { trackAbsolute, SAFE_ABSOLUTE_SQUARES, LAST_SHARED_TRACK_INDEX } from './board';

// Heuristic weights — chosen so the priority is strict: capture > leave-home > progress.
// Even max progress (~56) cannot dethrone leave-home (50). Leave-home cannot dethrone any capture (≥1000).
const CAPTURE_BASE = 1000;
const CAPTURE_PER_TOKEN = 100;
const LEAVE_HOME_BONUS = 50;
const PASS_PENALTY = -100;

const moveScore = (state: GameState, move: Move): number => {
  // Invariant: moveScore is only called from chooseBotMove, which only invokes it on
  // moves yielded by legalMoves(state, currentTurn). That guarantees:
  //   - state.currentTurn is non-null
  //   - state.dice is non-null and rolledThisTurn
  //   - the token is owned by currentTurn
  // The non-null assertions below are safe under this contract; do not export moveScore.
  if (move.kind === 'pass') return PASS_PENALTY;
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
      if (caps > 0) score += CAPTURE_BASE + caps * CAPTURE_PER_TOKEN;
    }
  }

  // Leave-home bonus
  if (myToken.position.kind === 'home' && proj.kind === 'path' && proj.index === 0) {
    score += LEAVE_HOME_BONUS;
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
  // Strict `>` (not `>=`): ties resolve to the earliest move in legalMoves order
  // — guarantees deterministic, replay-stable behavior.
  for (const m of moves.slice(1)) {
    const s = moveScore(state, m);
    if (s > bestScore) { best = m; bestScore = s; }
  }
  return best;
}
