'use client';
import type { GameState } from '@ludo/game-logic';

export function Lobby({ state, meId, shareUrl, onAddBot, onStart }: {
  state: GameState;
  meId: string;
  shareUrl: string;
  onAddBot: () => void;
  onStart: () => void;
}) {
  const me = state.players.find((p) => p.id === meId);
  const canStart = me?.isHost && state.players.length >= 2;
  const canAddBot = me?.isHost && state.players.length < 4;

  const share = async () => {
    const data = { title: 'Ludo', text: `Join my Ludo game, code ${state.code}`, url: shareUrl };
    if (navigator.share) { try { await navigator.share(data); return; } catch {} }
    await navigator.clipboard.writeText(shareUrl);
    alert('Link copied!');
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm p-4">
      <h2 className="font-display text-2xl">Lobby</h2>
      <div className="text-center">
        <div className="text-xs opacity-60">Game code</div>
        <div className="font-mono text-3xl tracking-widest">{state.code}</div>
      </div>
      <button onClick={share} className="bg-ink text-paper py-3 px-6 rounded-xl">Share invite</button>

      <ul className="w-full flex flex-col gap-2">
        {state.players.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-3 py-2 bg-white border border-edge rounded-xl">
            <span className="text-2xl">{p.avatar}</span>
            <span className="flex-1">{p.name}{p.isBot && ' 🤖'}</span>
            <span className="text-xs uppercase opacity-60">{p.color}</span>
          </li>
        ))}
        {Array.from({ length: 4 - state.players.length }, (_, i) => (
          <li key={`empty-${i}`} className="flex items-center gap-3 px-3 py-2 border-2 border-dashed border-edge rounded-xl opacity-50">
            <span>—</span><span>Waiting for player</span>
          </li>
        ))}
      </ul>

      {canAddBot && <button onClick={onAddBot} className="w-full py-3 rounded-xl border-2 border-ink">Add a bot</button>}
      {canStart && <button onClick={onStart} className="w-full py-4 rounded-xl bg-ink text-paper text-lg">Start game</button>}
      {!canStart && me?.isHost && <p className="opacity-60 text-sm">At least 2 players are needed to start.</p>}
    </div>
  );
}
