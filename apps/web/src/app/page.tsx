'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalProfile } from '@/lib/useLocalProfile';
import { ProfileForm } from '@/components/ProfileForm';

const HTTP_URL = process.env.NEXT_PUBLIC_LUDO_HTTP ?? 'http://localhost:8787';

export default function Home() {
  const router = useRouter();
  const { profile, save } = useLocalProfile();
  const [joinCode, setJoinCode] = useState('');

  if (!profile) {
    return (
      <main className="min-h-screen-d flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <h1 className="font-display text-3xl">Ludo</h1>
          <p className="opacity-70 text-sm text-center">Pick a name and avatar so your family knows it&apos;s you.</p>
          <ProfileForm onSave={save} />
        </div>
      </main>
    );
  }

  const create = async () => {
    const r = await fetch(`${HTTP_URL}/rooms`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hostId: profile.playerId, name: profile.name, avatar: profile.avatar }),
    });
    const { code } = await r.json();
    router.push(`/room/${code}`);
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim().length === 4) router.push(`/room/${joinCode.trim().toUpperCase()}`);
  };

  return (
    <main className="min-h-screen-d flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <h1 className="font-display text-3xl">Ludo</h1>
        <p className="text-sm opacity-70">Hi <strong>{profile.name}</strong> {profile.avatar}</p>

        <button onClick={create} className="w-full bg-ink text-paper py-4 rounded-xl text-lg">
          Create new game
        </button>

        <div className="w-full text-center opacity-50 text-sm">— or —</div>

        <form onSubmit={join} className="w-full flex flex-col gap-2">
          <input
            inputMode="text" autoCapitalize="characters" maxLength={4} pattern="[A-Za-z]{4}" required
            value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Game code (4 letters)"
            className="px-3 py-3 rounded-xl border border-edge bg-white text-center tracking-widest text-xl"
          />
          <button type="submit" className="bg-paper border-2 border-ink py-3 rounded-xl">Join with code</button>
        </form>
      </div>
    </main>
  );
}
