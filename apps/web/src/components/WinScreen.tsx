'use client';
import type { GameState } from '@ludo/game-logic';

export function WinScreen({ state, onPlayAgain, meIsHost }: {
  state: GameState;
  onPlayAgain: () => void;
  meIsHost: boolean;
}) {
  const winner = state.players.find((p) => p.id === state.winner);
  if (!winner) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10">
      <div className="bg-paper rounded-2xl p-6 flex flex-col items-center gap-4 max-w-sm w-full shadow-2xl">
        <div className="text-6xl">🏆</div>
        <h2 className="font-display text-3xl text-center">{winner.name} wins!</h2>
        <p className="text-sm opacity-70 text-center">
          {state.log.filter((e) => e.kind === 'rolled').length} rolls played.
        </p>
        {meIsHost ? (
          <button
            onClick={onPlayAgain}
            className="w-full bg-ink text-paper py-4 rounded-xl text-lg font-medium"
          >
            Play again
          </button>
        ) : (
          <p className="opacity-60 text-sm text-center">Waiting on host to start the next round…</p>
        )}
      </div>
    </div>
  );
}
