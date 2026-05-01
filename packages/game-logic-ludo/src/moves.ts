import type { GameEvent, GameState, Move, Token, TokenPosition } from './types';
import { FINISH_INDEX, LAST_SHARED_TRACK_INDEX, SAFE_ABSOLUTE_SQUARES, trackAbsolute } from './board';

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

const isCapturable = (
  myColor: Token['color'],
  myAbs: number,
  victim: Token,
): boolean => {
  if (victim.color === myColor) return false;
  if (victim.position.kind !== 'path') return false;
  if (victim.position.index > LAST_SHARED_TRACK_INDEX) return false;            // in their home column
  if (victim.position.index === FINISH_INDEX) return false; // finished (defensive — index 56)
  // Victim's absolute square:
  const victimAbs = trackAbsolute(victim.color, victim.position.index);
  if (victimAbs !== myAbs) return false;
  if (SAFE_ABSOLUTE_SQUARES.has(myAbs)) return false;
  return true;
};

const nextTurn = (state: GameState): string => {
  const i = state.turnOrder.indexOf(state.currentTurn!);
  return state.turnOrder[(i + 1) % state.turnOrder.length]!;
};

export function applyMove(
  state: GameState,
  move: Move,
  opts: { now: number },
): GameState {
  if (state.status !== 'playing') throw new Error(`applyMove: expected playing status, got ${state.status}`);
  if (state.currentTurn == null) throw new Error('applyMove: no current turn');
  if (state.dice == null || !state.rolledThisTurn) {
    throw new Error(`applyMove: must roll before moving (dice=${state.dice}, rolled=${state.rolledThisTurn})`);
  }
  const playerId = state.currentTurn;
  const dice = state.dice;
  const log: GameEvent[] = [...state.log];

  if (move.kind === 'pass') {
    const next = nextTurn(state);
    log.push({ kind: 'turn', playerId: next });
    return {
      ...state,
      dice: null,
      rolledThisTurn: false,
      consecutiveSixes: 0,
      currentTurn: next,
      lastActivityAt: opts.now,
      log,
    };
  }

  // move.kind === 'move'
  const tokens = state.tokens[playerId]!;
  const tokenIdx = tokens.findIndex((t) => t.id === move.tokenId);
  if (tokenIdx < 0) throw new Error(`applyMove: token ${move.tokenId} not owned by ${playerId}`);
  const token = tokens[tokenIdx]!;
  const projected = projectMove(token, dice);
  if (projected == null) {
    throw new Error(`applyMove: illegal move (token=${token.id}, from=${JSON.stringify(token.position)}, dice=${dice})`);
  }

  const newToken: Token = { ...token, position: projected };
  const newTokens: Record<string, Token[]> = { ...state.tokens };
  newTokens[playerId] = tokens.map((t, i) => (i === tokenIdx ? newToken : t));

  let captured = false;
  if (projected.kind === 'path' && projected.index <= LAST_SHARED_TRACK_INDEX) {
    const myAbs = trackAbsolute(token.color, projected.index);
    for (const otherId of Object.keys(newTokens)) {
      if (otherId === playerId) continue;
      newTokens[otherId] = newTokens[otherId]!.map((victim) => {
        if (isCapturable(token.color, myAbs, victim)) {
          captured = true;
          log.push({
            kind: 'captured',
            capturer: playerId,
            victim: victim.owner,
            tokenId: victim.id,
          });
          return { ...victim, position: { kind: 'home' } };
        }
        return victim;
      });
    }
  }

  log.push({
    kind: 'moved',
    playerId,
    tokenId: token.id,
    from: token.position,
    to: projected,
  });

  // Win check — if this move completed all 4 tokens, end the game
  if (isWin(newTokens, playerId)) {
    log.push({ kind: 'won', playerId });
    return {
      ...state,
      tokens: newTokens,
      dice: null,
      rolledThisTurn: false,
      consecutiveSixes: 0,
      currentTurn: null,
      status: 'finished',
      winner: playerId,
      lastActivityAt: opts.now,
      log,
    };
  }

  // Extra turn on a 6 OR on a capture
  const grantsExtra = dice === 6 || captured;
  const next = grantsExtra ? playerId : nextTurn(state);
  if (next !== playerId) log.push({ kind: 'turn', playerId: next });

  return {
    ...state,
    tokens: newTokens,
    dice: null,
    rolledThisTurn: false,
    consecutiveSixes: dice === 6 ? state.consecutiveSixes + 1 : 0,
    currentTurn: next,
    lastActivityAt: opts.now,
    log,
  };
}

export function applyRoll(state: GameState, value: number, opts: { now: number }): GameState {
  if (state.status !== 'playing') throw new Error(`applyRoll: expected playing status, got ${state.status}`);
  if (state.rolledThisTurn) throw new Error('applyRoll: already rolled this turn');
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new Error(`applyRoll: value ${value} must be an integer in 1..6`);
  }
  return {
    ...state,
    dice: value,
    rolledThisTurn: true,
    lastActivityAt: opts.now,
    log: [...state.log, { kind: 'rolled', playerId: state.currentTurn!, value }],
  };
}

export function isWin(tokens: Record<string, Token[]>, playerId: string): boolean {
  const playerTokens = tokens[playerId];
  if (!playerTokens) return false;
  return playerTokens.every((t) => t.position.kind === 'path' && t.position.index === FINISH_INDEX);
}
