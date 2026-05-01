'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalProfile } from '@/lib/useLocalProfile';
import { ProfileForm } from '@/components/ProfileForm';
import { GameCard } from '@/components/GameCard';

const HTTP_URL = process.env.NEXT_PUBLIC_LUDO_HTTP ?? 'http://localhost:8787';

export default function Home() {
  const router = useRouter();
  const { profile, save } = useLocalProfile();
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  if (!profile) {
    return (
      <main className="min-h-screen-d flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <h1 className="font-display text-3xl">Game Night</h1>
          <p className="opacity-70 text-sm text-center">Pick a name and avatar so your family knows it&apos;s you.</p>
          <ProfileForm onSave={save} />
        </div>
      </main>
    );
  }

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) return;
    try {
      const r = await fetch(`${HTTP_URL}/rooms/${code}`);
      if (!r.ok) {
        setJoinError('No game found with that code.');
        return;
      }
      const { gameType } = await r.json();
      router.push(`/${gameType}/${code}`);
    } catch {
      setJoinError('Could not reach the server.');
    }
  };

  return (
    <main className="min-h-screen-d flex flex-col items-center gap-8 p-4 pt-12">
      <header className="flex flex-col items-center gap-2">
        <h1 className="font-display text-4xl">Game Night</h1>
        <p className="text-sm opacity-70">Hi <strong>{profile.name}</strong> {profile.avatar}</p>
      </header>

      <section className="w-full max-w-sm flex flex-col gap-4">
        <h2 className="font-display text-xl">Pick a game</h2>
        <GameCard
          href="/ludo/new"
          name="Ludo"
          tagline="Race four tokens to the center"
          accent="bg-rust/25"
          icon="🎲"
        />
        <GameCard
          href="/snakes/new"
          name="Snakes & Ladders"
          tagline="Climb, slide, race to 100"
          accent="bg-sky/25"
          icon="🐍"
        />
        <GameCard
          href="/tictactoe/new"
          name="Tic-Tac-Toe"
          tagline="Three in a row"
          accent="bg-honey/25"
          icon="❌"
        />
      </section>

      <section className="w-full max-w-sm flex flex-col gap-2">
        <h2 className="font-display text-xl">Join with a code</h2>
        <form onSubmit={join} className="flex flex-col gap-2">
          <input
            inputMode="text" autoCapitalize="characters" maxLength={4}
            value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="4-letter code"
            className="px-3 py-3 rounded-xl border border-edge bg-white text-center tracking-widest text-xl"
          />
          <button type="submit" className="bg-paper border-2 border-ink py-3 rounded-xl">Join</button>
          {joinError && <p className="text-sm text-rust">{joinError}</p>}
        </form>
      </section>
    </main>
  );
}
