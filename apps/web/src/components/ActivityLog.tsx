'use client';
import type { GameState } from '@ludo/game-logic-ludo';

const eventIcon = (e: GameState['log'][number]): string => {
  switch (e.kind) {
    case 'rolled':   return '🎲';
    case 'moved':    return '➡️';
    case 'captured': return '⚔️';
    case 'turn':     return '👉';
    case 'won':      return '🏆';
  }
};

const formatEvent = (e: GameState['log'][number], state: GameState): string => {
  const name = (id: string) => state.players.find((p) => p.id === id)?.name ?? id;
  switch (e.kind) {
    case 'rolled':   return `${name(e.playerId)} rolled ${e.value}`;
    case 'moved':    return `${name(e.playerId)} moved a token`;
    case 'captured': {
      const cap = e.capturer === 'me' ? 'You' : name(e.capturer);
      const victim = e.victim === 'me' ? 'your' : `${name(e.victim)}'s`;
      return `${cap} captured ${victim} token!`;
    }
    case 'turn': {
      return e.playerId === 'me' ? 'Your turn' : `${name(e.playerId)}'s turn`;
    }
    case 'won':      return `${name(e.playerId)} wins!`;
  }
};

export function ActivityLog({ state }: { state: GameState }) {
  const recent = state.log.slice(-4).reverse();
  if (recent.length === 0) return null;
  return (
    <div className="w-full max-w-[640px] rounded-xl border border-edge bg-paper overflow-hidden">
      {recent.map((e, i) => (
        <div
          key={state.log.length - i}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm
            ${i === 0 ? 'opacity-100 font-medium' : 'opacity-50'}
            ${i > 0 ? 'border-t border-edge/40' : ''}`}
        >
          <span aria-hidden className="text-base leading-none">{eventIcon(e)}</span>
          <span className="flex-1 truncate">{formatEvent(e, state)}</span>
        </div>
      ))}
    </div>
  );
}
