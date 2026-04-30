'use client';
import { create } from 'zustand';
import {
  createInitialState, startGame, applyRoll, applyMove, chooseBotMove, legalMoves,
  type GameState, type Player, type Move,
} from '@ludo/game-logic';

const seedPlayers = (): Player[] => ([
  { id: 'me',   name: 'You',  avatar: '🐱', color: 'red',    isBot: false, isHost: true,  connected: true },
  { id: 'bot1', name: 'Bot 1',avatar: '🐻', color: 'green',  isBot: true,  isHost: false, connected: true },
  { id: 'bot2', name: 'Bot 2',avatar: '🦊', color: 'yellow', isBot: true,  isHost: false, connected: true },
]);

const rollDie = () => 1 + Math.floor(Math.random() * 6);

type LocalGame = {
  state: GameState;
  reset: () => void;
  roll: () => void;
  play: (move: Move) => void;
};

export const useLocalGame = create<LocalGame>((set, get) => ({
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
    // If after rolling, the player has no legal moves (only forced pass), auto-pass
    const moves = legalMoves(next, next.currentTurn!);
    if (moves.length === 1 && moves[0]!.kind === 'pass') {
      setTimeout(() => {
        set({ state: applyMove(get().state, { kind: 'pass' }, { now: Date.now() }) });
        setTimeout(() => maybeBotPlay(set, get), 1100);
      }, 1500); // 1500ms beat so the user sees the dice value before auto-passing
      return;
    }
    setTimeout(() => maybeBotPlay(set, get), 1100);
  },
  play: (move) => {
    set({ state: applyMove(get().state, move, { now: Date.now() }) });
    setTimeout(() => maybeBotPlay(set, get), 1100);
  },
}));

function maybeBotPlay(
  set: (s: Partial<LocalGame>) => void,
  get: () => LocalGame,
) {
  const s = get().state;
  if (s.status !== 'playing' || !s.currentTurn) return;
  const cur = s.players.find((p) => p.id === s.currentTurn);
  if (!cur?.isBot) return;
  if (!s.rolledThisTurn) {
    set({ state: applyRoll(s, 1 + Math.floor(Math.random() * 6), { now: Date.now() }) });
    setTimeout(() => maybeBotPlay(set, get), 1100);
    return;
  }
  const move = chooseBotMove(get().state);
  set({ state: applyMove(get().state, move, { now: Date.now() }) });
  setTimeout(() => maybeBotPlay(set, get), 1100);
}
