'use client';
import type { GameState } from '@ludo/game-logic';

const formatEvent = (e: GameState['log'][number], state: GameState): string => {
  const name = (id: string) => state.players.find((p) => p.id === id)?.name ?? id;
  switch (e.kind) {
    case 'rolled':   return `${name(e.playerId)} rolled ${e.value}`;
    case 'moved':    return `${name(e.playerId)} moved a token`;
    case 'captured': return `${name(e.capturer)} captured ${name(e.victim)}'s token!`;
    case 'turn':     return `${name(e.playerId)}'s turn`;
    case 'won':      return `🏆 ${name(e.playerId)} wins!`;
  }
};

export function ActivityLog({ state }: { state: GameState }) {
  // Show the last 4 events, newest first
  const recent = state.log.slice(-4).reverse();
  if (recent.length === 0) return null;
  return (
    <ul className="w-full max-w-[640px] flex flex-col gap-1 text-xs">
      {recent.map((e, i) => (
        <li key={state.log.length - i}
            className={`px-3 py-1.5 rounded-lg border border-edge bg-paper
              ${i === 0 ? 'opacity-100 font-medium' : 'opacity-60'}`}>
          {formatEvent(e, state)}
        </li>
      ))}
    </ul>
  );
}
