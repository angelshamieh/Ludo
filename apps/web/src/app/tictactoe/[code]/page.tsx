'use client';
import { useLocalTicTacToe } from '@/lib/tictactoe/localGame';
import { TicTacToeBoard } from '@/components/tictactoe/Board';
import { PlayerPanel } from '@/components/PlayerPanel';

export default function TicTacToePage() {
  const { state, play, reset } = useLocalTicTacToe();
  const myId = 'me';
  const myTurn = state.currentTurn === myId;

  // Hint cells: all empty cells when it's your turn.
  const hint = new Set<number>();
  if (myTurn && state.status === 'playing') {
    state.board.forEach((c, i) => { if (c === '') hint.add(i); });
  }

  return (
    <main className="min-h-screen-d flex flex-col items-center gap-4 p-4 pb-[calc(7rem+var(--safe-bottom))]">
      <header className="w-full max-w-[640px] flex items-center justify-between">
        <h1 className="font-display text-xl">Tic-Tac-Toe (local)</h1>
        <div className="flex gap-2 text-sm">
          <button className="underline" onClick={() => reset('easy')}>New (easy)</button>
          <button className="underline" onClick={() => reset('hard')}>New (hard)</button>
        </div>
      </header>
      <PlayerPanel state={state as never} />
      <TicTacToeBoard
        state={state}
        {...(myTurn ? { hintCells: hint, onCellClick: play } : {})}
      />
      <div className="fixed inset-x-0 bottom-0 px-4 pb-[calc(1rem+var(--safe-bottom))] pt-3 bg-paper border-t border-edge text-center text-base font-medium">
        {(() => {
          if (state.status === 'finished') {
            if (state.winner) {
              const w = state.players.find((p) => p.id === state.winner);
              return `🏆 ${w?.name} wins!`;
            }
            return '🤝 Draw — no winner!';
          }
          if (myTurn) return 'Your turn — tap a cell';
          const opp = state.players.find((p) => p.id === state.currentTurn);
          return `Waiting on ${opp?.name}…`;
        })()}
      </div>
    </main>
  );
}
