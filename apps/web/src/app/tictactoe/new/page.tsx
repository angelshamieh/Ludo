'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalProfile } from '@/lib/useLocalProfile';
import { createRoom } from '@/lib/createRoom';

export default function NewTicTacToePage() {
  const router = useRouter();
  const { profile, loaded } = useLocalProfile();

  useEffect(() => {
    if (!loaded) return;
    if (!profile) {
      router.replace('/');
      return;
    }
    let cancelled = false;
    createRoom(profile, 'tictactoe')
      .then((code) => { if (!cancelled) router.replace(`/tictactoe/${code}`); })
      .catch((err) => { console.error(err); if (!cancelled) router.replace('/'); });
    return () => { cancelled = true; };
  }, [profile, loaded, router]);

  return (
    <main className="min-h-screen-d flex items-center justify-center">
      <p className="opacity-70">Creating a Tic-Tac-Toe game…</p>
    </main>
  );
}
