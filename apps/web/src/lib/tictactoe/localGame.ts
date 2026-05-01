'use client';
import { create } from 'zustand';
import {
  createInitialState, startGame, applyMove, chooseBotMove,
  type GameState, type Move,
} from '@ludo/game-logic-tictactoe';
import type { Player } from '@ludo/game-shared';

const seedPlayers = (): Player[] => ([
  { id: 'me',   name: 'You',   avatar: '🐱', color: 'red',  isBot: false, isHost: true,  connected: true },
  { id: 'bot1', name: 'Bot',   avatar: '🐻', color: 'blue', isBot: true,  isHost: false, connected: true },
]);

type LocalGame = {
  state: GameState;
  reset: (difficulty?: 'easy' | 'hard') => void;
  play: (cell: number) => void;
};

export const useLocalTicTacToe = create<LocalGame>((set, get) => ({
  state: (() => {
    let s = createInitialState({ code: 'LOCAL', players: seedPlayers(), now: Date.now() });
    return startGame(s, { now: Date.now() });
  })(),
  reset: (difficulty = 'easy') => {
    let s = createInitialState({ code: 'LOCAL', players: seedPlayers(), now: Date.now() });
    s = { ...s, difficulty };
    set({ state: startGame(s, { now: Date.now() }) });
  },
  play: (cell: number) => {
    const s = get().state;
    if (s.currentTurn !== 'me' || s.status !== 'playing') return;
    const next = applyMove(s, { kind: 'place', cell }, { now: Date.now() });
    set({ state: next });
    setTimeout(() => maybeBot(set, get), 700);
  },
}));

function maybeBot(set: (s: Partial<LocalGame>) => void, get: () => LocalGame) {
  const s = get().state;
  if (s.status !== 'playing' || !s.currentTurn) return;
  const cur = s.players.find((p) => p.id === s.currentTurn);
  if (!cur?.isBot) return;
  const move = chooseBotMove(s);
  set({ state: applyMove(s, move, { now: Date.now() }) });
}
