'use client';
import { useParams } from 'next/navigation';
import { useMemo, useEffect, useRef } from 'react';
import { Buzz } from '@/lib/haptics';
import { useLocalProfile } from '@/lib/useLocalProfile';
import { useRoomConnection } from '@/lib/useRoomConnection';
import { Board } from '@/components/Board';
import { Dice } from '@/components/Dice';
import { PlayerPanel } from '@/components/PlayerPanel';
import { ActivityLog } from '@/components/ActivityLog';
import { Lobby } from '@/components/Lobby';
import { ProfileForm } from '@/components/ProfileForm';
import { WinScreen } from '@/components/WinScreen';
import { legalMoves } from '@ludo/game-logic';

const WS_URL = process.env.NEXT_PUBLIC_LUDO_WS ?? 'ws://localhost:8787';

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const { profile, save } = useLocalProfile();
  const { state, status, error, send } = useRoomConnection({ wsUrl: WS_URL, code, profile });
  const myTurn = !!profile && state?.currentTurn === profile.playerId;
  const moves = useMemo(
    () => state && profile ? legalMoves(state, profile.playerId) : [],
    [state, profile],
  );
  const hint = useMemo(() => new Set(moves.flatMap((m) => m.kind === 'move' ? [m.tokenId] : [])), [moves]);

  const lastLogLen = useRef(0);
  useEffect(() => {
    if (!state || !profile) return;
    const newEvents = state.log.slice(lastLogLen.current);
    lastLogLen.current = state.log.length;
    for (const e of newEvents) {
      if (e.kind === 'captured' && e.victim === profile.playerId) Buzz.capture();
      if (e.kind === 'won') {
        if (e.playerId === profile.playerId) Buzz.win();
      }
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

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/room/${code}` : '';

  if (state.status === 'lobby') {
    return (
      <main className="min-h-screen-d flex items-center justify-center">
        <Lobby
          state={state} meId={profile.playerId} shareUrl={shareUrl}
          onAddBot={() => send({ type: 'addBot' })}
          onStart={() => send({ type: 'start' })}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen-d flex flex-col items-center gap-4 p-4 pb-[calc(7rem+var(--safe-bottom))]">
      {status !== 'open' && <div className="w-full max-w-[640px] text-sm bg-honey/30 px-3 py-2 rounded">Reconnecting…</div>}
      {error && <div className="w-full max-w-[640px] text-sm bg-rust/30 px-3 py-2 rounded">{error}</div>}
      <PlayerPanel state={state} />
      <ActivityLog state={state} />
      <Board
        state={state}
        {...(myTurn
          ? {
              hintTokenIds: hint,
              onTokenClick: (id: string) => {
                if (moves.find((m) => m.kind === 'move' && m.tokenId === id)) {
                  send({ type: 'move', tokenId: id });
                }
              },
            }
          : {})}
      />
      <div className="fixed inset-x-0 bottom-0 px-4 pb-[calc(1rem+var(--safe-bottom))] pt-3 bg-paper border-t border-edge flex items-center justify-between">
        <div className="text-base font-medium">
          {(() => {
            if (state.status === 'finished') {
              return 'Game over';
            }
            if (!myTurn) {
              return `Waiting on ${state.players.find((p) => p.id === state.currentTurn)?.name}`;
            }
            if (!state.dice) return 'Your turn — roll!';
            if (moves.length === 1 && moves[0]!.kind === 'pass') {
              return `Rolled ${state.dice} — no moves, passing…`;
            }
            return `Pick a token (rolled ${state.dice})`;
          })()}
        </div>
        <Dice
          value={state.dice}
          disabled={!myTurn || state.rolledThisTurn || state.status !== 'playing'}
          onRoll={() => send({ type: 'roll' })}
        />
      </div>
      {state.status === 'finished' && (
        <WinScreen
          state={state}
          meIsHost={state.players.find((p) => p.id === profile.playerId)?.isHost === true}
          onPlayAgain={() => send({ type: 'playAgain' })}
        />
      )}
    </main>
  );
}
