import type { GameEvent } from '@ludo/game-shared';
import type { GameState, Move } from './types';
import { LADDERS, SNAKES, FINISH } from './board';

export function applyRoll(state: GameState, value: number, opts: { now: number }): GameState {
  if (state.status !== 'playing') throw new Error(`applyRoll: expected playing, got ${state.status}`);
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

export function isWin(state: GameState, playerId: string): boolean {
  return state.tokens[playerId] === FINISH;
}

const nextTurn = (state: GameState): string => {
  const i = state.turnOrder.indexOf(state.currentTurn!);
  return state.turnOrder[(i + 1) % state.turnOrder.length]!;
};

export function applyMove(
  state: GameState,
  _move: Move,
  opts: { now: number },
): GameState {
  if (state.status !== 'playing') throw new Error(`applyMove: expected playing, got ${state.status}`);
  if (state.currentTurn == null) throw new Error('applyMove: no current turn');
  if (state.dice == null || !state.rolledThisTurn) {
    throw new Error(`applyMove: must roll first (dice=${state.dice}, rolled=${state.rolledThisTurn})`);
  }

  const playerId = state.currentTurn;
  const dice = state.dice;
  const log: GameEvent[] = [...state.log];
  const before = state.tokens[playerId]!;
  const tentative = before + dice;
  let after = before;

  if (tentative <= FINISH) {
    after = tentative;
    log.push({ kind: 'moved', playerId, tokenId: playerId, from: before, to: after });
    if (LADDERS[after] != null) {
      const top = LADDERS[after]!;
      log.push({ kind: 'ladder', playerId, from: after, to: top });
      after = top;
    } else if (SNAKES[after] != null) {
      const tail = SNAKES[after]!;
      log.push({ kind: 'snake', playerId, from: after, to: tail });
      after = tail;
    }
  }

  const newTokens: Record<string, number> = { ...state.tokens, [playerId]: after };

  if (after === FINISH) {
    log.push({ kind: 'won', playerId });
    return {
      ...state,
      tokens: newTokens,
      dice: null,
      rolledThisTurn: false,
      currentTurn: null,
      status: 'finished',
      winner: playerId,
      lastActivityAt: opts.now,
      log,
    };
  }

  const next = dice === 6 ? playerId : nextTurn(state);
  if (next !== playerId) log.push({ kind: 'turn', playerId: next });

  return {
    ...state,
    tokens: newTokens,
    dice: null,
    rolledThisTurn: false,
    currentTurn: next,
    lastActivityAt: opts.now,
    log,
  };
}
