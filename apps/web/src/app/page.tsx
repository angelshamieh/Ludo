'use client';
import { Board } from '@/components/Board';
import { Dice } from '@/components/Dice';
import { PlayerPanel } from '@/components/PlayerPanel';
import { createInitialState, type Player } from '@ludo/game-logic';

const players: Player[] = [
  { id: 'a', name: 'Mom',  avatar: '🐱', color: 'red',    isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'Dad',  avatar: '🦊', color: 'green',  isBot: false, isHost: false, connected: true },
  { id: 'c', name: 'Bot',  avatar: '🐼', color: 'yellow', isBot: true,  isHost: false, connected: true },
  { id: 'd', name: 'Sara', avatar: '🦁', color: 'blue',   isBot: false, isHost: false, connected: false },
];

export default function Home() {
  const state = { ...createInitialState({ code: 'DEMO', players, now: 0 }), status: 'playing' as const, currentTurn: 'a' };
  return (
    <main className="min-h-screen-d flex flex-col items-center gap-4 p-4 pb-[calc(1rem+var(--safe-bottom))]">
      <PlayerPanel state={state} />
      <Board state={state} />
      <div className="fixed bottom-4 right-4">
        <Dice value={null} onRoll={() => {}} disabled={false} />
      </div>
    </main>
  );
}
