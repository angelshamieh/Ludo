import type { GameState, Player } from './types';

export function createInitialState(input: {
  code: string; players: Player[]; now: number;
}): GameState {
  const { code, players, now } = input;
  if (players.length !== 2) {
    throw new Error(`Tic-Tac-Toe needs exactly 2 players, got ${players.length}`);
  }
  const marks: Record<string, 'X' | 'O'> = {
    [players[0]!.id]: 'X',
    [players[1]!.id]: 'O',
  };
  return {
    code,
    gameType: 'tictactoe',
    status: 'lobby',
    players: [...players],
    turnOrder: [],
    currentTurn: null,
    dice: null,
    rolledThisTurn: false,
    board: ['','','','','','','','',''],
    marks,
    difficulty: 'easy',
    tokens: {},
    winner: null,
    log: [],
    createdAt: now,
    lastActivityAt: now,
  };
}

export function startGame(state: GameState, opts: { now: number }): GameState {
  if (state.status !== 'lobby') {
    throw new Error(`startGame: expected lobby, got ${state.status}`);
  }
  if (state.players.length !== 2) {
    throw new Error(`startGame: need exactly 2 players, got ${state.players.length}`);
  }
  // Turn order: same as players (X first, O second)
  const turnOrder = state.players.map((p) => p.id);
  const first = turnOrder[0]!;
  return {
    ...state,
    status: 'playing',
    turnOrder,
    currentTurn: first,
    lastActivityAt: opts.now,
    log: [...state.log, { kind: 'turn', playerId: first }],
  };
}
