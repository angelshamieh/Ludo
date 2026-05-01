'use client';
import { create } from 'zustand';
import {
  createInitialState, startGame, applyRoll, applyMove, chooseBotMove,
  type GameState, type Move,
} from '@ludo/game-logic-snakes';
import type { Player } from '@ludo/game-shared';

const seedPlayers = (): Player[] => ([
  { id: 'me',   name: 'You',   avatar: '🐱', color: 'red',   isBot: false, isHost: true,  connected: true },
  { id: 'bot1', name: 'Bot 1', avatar: '🐻', color: 'green', isBot: true,  isHost: false, connected: true },
]);

const rollDie = () => 1 + Math.floor(Math.random() * 6);

type LocalGame = {
  state: GameState;
  reset: () => void;
  roll: () => void;
  play: (move: Move) => void;
};

export const useLocalSnakes = create<LocalGame>((set, get) => ({
  state: startGame(createInitialState({ code: 'LOCAL', players: seedPlayers(), now: Date.now() }), { now: Date.now() }),
  reset: () => set({
    state: startGame(createInitialState({ code: 'LOCAL', players: seedPlayers(), now: Date.now() }), { now: Date.now() }),
  }),
  roll: () => {
    const s = get().state;
    if (s.rolledThisTurn || s.status !== 'playing' || s.currentTurn === null) return;
    const v = rollDie();
    const next = applyRoll(s, v, { now: Date.now() });
    set({ state: next });
    setTimeout(() => {
      set({ state: applyMove(get().state, { kind: 'auto' }, { now: Date.now() }) });
      setTimeout(() => maybeBot(set, get), 1100);
    }, 600);
  },
  play: (move) => {
    set({ state: applyMove(get().state, move, { now: Date.now() }) });
    setTimeout(() => maybeBot(set, get), 1100);
  },
}));

function maybeBot(set: (s: Partial<LocalGame>) => void, get: () => LocalGame) {
  const s = get().state;
  if (s.status !== 'playing' || !s.currentTurn) return;
  const cur = s.players.find((p) => p.id === s.currentTurn);
  if (!cur?.isBot) return;
  if (!s.rolledThisTurn) {
    set({ state: applyRoll(s, 1 + Math.floor(Math.random() * 6), { now: Date.now() }) });
    setTimeout(() => maybeBot(set, get), 1100);
    return;
  }
  set({ state: applyMove(get().state, chooseBotMove(get().state), { now: Date.now() }) });
  setTimeout(() => maybeBot(set, get), 1100);
}
