'use client';
import { Board } from '@/components/Board';
import { Dice } from '@/components/Dice';
import { PlayerPanel } from '@/components/PlayerPanel';
import { useLocalGame } from '@/lib/localGame';
import { legalMoves } from '@ludo/game-logic';
import { useMemo } from 'react';

export default function Home() {
  const { state, roll, play, reset } = useLocalGame();
  const myId = 'me';
  const myTurn = state.currentTurn === myId;
  const moves = useMemo(() => legalMoves(state, myId), [state]);
  const hint = useMemo(() => new Set(moves.flatMap((m) => m.kind === 'move' ? [m.tokenId] : [])), [moves]);

  return (
    <main className="min-h-screen-d flex flex-col items-center gap-4 p-4 pb-[calc(7rem+var(--safe-bottom))]">
      <header className="w-full max-w-[640px] flex items-center justify-between">
        <h1 className="font-display text-xl">Ludo (local)</h1>
        <button className="text-sm underline" onClick={reset}>New game</button>
      </header>
      <PlayerPanel state={state} />
      <Board
        state={state}
        {...(myTurn
          ? {
              hintTokenIds: hint,
              onTokenClick: (id: string) => {
                if (moves.find((m) => m.kind === 'move' && m.tokenId === id)) {
                  play({ kind: 'move', tokenId: id });
                }
              },
            }
          : {})}
      />
      <div className="fixed inset-x-0 bottom-0 px-4 pb-[calc(1rem+var(--safe-bottom))] pt-3 bg-paper border-t border-edge flex items-center justify-between">
        <div className="text-sm">
          {state.status === 'finished'
            ? `🏆 ${state.players.find((p) => p.id === state.winner)?.name} wins!`
            : myTurn
              ? state.dice ? `Pick a token (rolled ${state.dice})` : 'Your turn — roll!'
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
