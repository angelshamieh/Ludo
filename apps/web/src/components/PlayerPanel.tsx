'use client';
import type { BaseGameState } from '@ludo/game-shared';
import { progressLabel } from '@/lib/progressLabel';

const colorBg: Record<string, string> = {
  red: 'bg-rust', green: 'bg-sage', yellow: 'bg-honey', blue: 'bg-sky',
};

export function PlayerPanel({ state }: { state: BaseGameState & { tokens: unknown } }) {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-[640px]">
      {state.players.map((p) => {
        const turn = state.currentTurn === p.id;
        return (
          <li
            key={p.id}
            className={`rounded-xl p-2 border-2 flex items-center gap-2
              ${turn ? 'border-ink bg-white' : 'border-edge bg-paper'}`}
          >
            <span className={`w-8 h-8 rounded-full ${colorBg[p.color] ?? 'bg-gray-300'} flex items-center justify-center text-lg`}>
              {p.avatar}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{p.name}{p.isBot && ' 🤖'}</div>
              <div className="text-xs opacity-70">{progressLabel(state.gameType, state.tokens, p.id)}</div>
            </div>
            {!p.connected && <span title="disconnected">📡</span>}
          </li>
        );
      })}
    </ul>
  );
}
