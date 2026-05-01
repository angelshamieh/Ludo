'use client';
import { useParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useLocalProfile } from '@/lib/useLocalProfile';
import { useRoomConnection } from '@/lib/useRoomConnection';
import { TicTacToeBoard } from '@/components/tictactoe/Board';
import { PlayerPanel } from '@/components/PlayerPanel';
import { ActivityLog } from '@/components/ActivityLog';
import { Lobby } from '@/components/Lobby';
import { ProfileForm } from '@/components/ProfileForm';
import { WinScreen } from '@/components/WinScreen';
import { DifficultyToggle } from '@/components/tictactoe/DifficultyToggle';
import { Buzz } from '@/lib/haptics';
import type { GameState as TTTState } from '@ludo/game-logic-tictactoe';

const WS_URL = process.env.NEXT_PUBLIC_LUDO_WS ?? 'ws://localhost:8787';

export default function TicTacToeRoomPage() {
  const { code } = useParams<{ code: string }>();
  const { profile, save } = useLocalProfile();
  const { state, status, error, send } = useRoomConnection({ wsUrl: WS_URL, code, profile });
  const myTurn = !!profile && state?.currentTurn === profile.playerId;
  const me = profile && state ? state.players.find((p) => p.id === profile.playerId) : undefined;

  const lastLogLen = useRef(0);
  useEffect(() => {
    if (!state || !profile) return;
    const newEvents = state.log.slice(lastLogLen.current);
    lastLogLen.current = state.log.length;
    for (const e of newEvents) {
      if (e.kind === 'won' && e.playerId === profile.playerId) Buzz.win();
      if (e.kind === 'turn' && e.playerId === profile.playerId) Buzz.tap();
    }
  }, [state, profile]);

  if (!profile) return (
    <main className="min-h-screen-d flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        <h1 className="font-display text-2xl">Joining {code}</h1>
        <ProfileForm onSave={save} />
      </div>
    </main>
  );

  if (!state) return (
    <main className="min-h-screen-d flex items-center justify-center">
      <p className="opacity-60">{status === 'connecting' ? 'Connecting…' : 'Reconnecting…'}</p>
    </main>
  );

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/tictactoe/${code}` : '';
  const tttState = state as unknown as TTTState;

  if (state.status === 'lobby') {
    const difficulty = tttState.difficulty ?? 'easy';
    return (
      <main className="min-h-screen-d flex items-center justify-center">
        <Lobby
          state={state as never}
          meId={profile.playerId} shareUrl={shareUrl}
          onAddBot={() => send({ type: 'addBot' })}
          onStart={() => send({ type: 'start' })}
          extras={me?.isHost ? (
            <DifficultyToggle
              value={difficulty}
              onChange={(v) => send({ type: 'setDifficulty', value: v })}
            />
          ) : null}
        />
      </main>
    );
  }

  // Hint cells: all empty cells when it's your turn
  const hint = new Set<number>();
  if (myTurn && state.status === 'playing') {
    tttState.board.forEach((c: string, i: number) => { if (c === '') hint.add(i); });
  }

  return (
    <main className="min-h-screen-d flex flex-col items-center gap-4 p-4 pb-[calc(7rem+var(--safe-bottom))]">
      {status !== 'open' && <div className="w-full max-w-[640px] text-sm bg-honey/30 px-3 py-2 rounded">Reconnecting…</div>}
      {error && <div className="w-full max-w-[640px] text-sm bg-rust/30 px-3 py-2 rounded">{error}</div>}
      <PlayerPanel state={state} />
      <ActivityLog state={state as never} />
      <TicTacToeBoard
        state={tttState}
        {...(myTurn ? {
          hintCells: hint,
          onCellClick: (cell: number) => send({ type: 'move', tokenId: String(cell) }),
        } : {})}
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
      {state.status === 'finished' && (
        <WinScreen
          state={state as never}
          meIsHost={state.players.find((p) => p.id === profile.playerId)?.isHost === true}
          onPlayAgain={() => send({ type: 'playAgain' })}
        />
      )}
    </main>
  );
}
