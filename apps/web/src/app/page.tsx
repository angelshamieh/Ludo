import { Board } from '@/components/Board';
import { createInitialState, type Player } from '@ludo/game-logic';

const players: Player[] = [
  { id: 'a', name: 'A', avatar: '🐱', color: 'red',   isBot: false, isHost: true,  connected: true },
  { id: 'b', name: 'B', avatar: '🦊', color: 'green', isBot: false, isHost: false, connected: true },
  { id: 'c', name: 'C', avatar: '🐼', color: 'yellow',isBot: true,  isHost: false, connected: true },
  { id: 'd', name: 'D', avatar: '🦁', color: 'blue',  isBot: true,  isHost: false, connected: true },
];

export default function Home() {
  const state = createInitialState({ code: 'DEMO', players, now: 0 });
  return (
    <main className="p-4 flex flex-col items-center gap-4">
      <h1 className="font-display text-2xl">Ludo — board preview</h1>
      <Board state={state} />
    </main>
  );
}
