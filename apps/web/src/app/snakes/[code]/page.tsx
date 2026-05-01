'use client';
import { useLocalSnakes } from '@/lib/snakes/localGame';
import { SnakesBoard } from '@/components/snakes/Board';
import { Dice } from '@/components/Dice';
import { PlayerPanel } from '@/components/PlayerPanel';

export default function SnakesPage() {
  const { state, roll, reset } = useLocalSnakes();
  const myId = 'me';
  const myTurn = state.currentTurn === myId;

  return (
    <main className="min-h-screen-d flex flex-col items-center gap-4 p-4 pb-[calc(7rem+var(--safe-bottom))]">
      <header className="w-full max-w-[640px] flex items-center justify-between">
        <h1 className="font-display text-xl">Snakes & Ladders (local)</h1>
        <button className="text-sm underline" onClick={reset}>New game</button>
      </header>
      <PlayerPanel state={state as never} />
      <SnakesBoard state={state} />
      <div className="fixed inset-x-0 bottom-0 px-4 pb-[calc(1rem+var(--safe-bottom))] pt-3 bg-paper border-t border-edge flex items-center justify-between">
        <div className="text-base font-medium">
          {state.status === 'finished'
            ? `🏆 ${state.players.find((p) => p.id === state.winner)?.name} wins!`
            : myTurn
              ? state.dice ? `Rolled ${state.dice} — moving…` : 'Your turn — roll!'
              : `Waiting on ${state.players.find((p) => p.id === state.currentTurn)?.name}`}
        </div>
        <Dice
          value={state.dice}
          disabled={!myTurn || state.rolledThisTurn || state.status !== 'playing'}
          onRoll={roll}
        />
      </div>
    </main>
  );
}
