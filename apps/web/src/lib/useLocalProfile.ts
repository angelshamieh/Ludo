'use client';
import { useEffect, useState } from 'react';

export type Profile = { playerId: string; name: string; avatar: string };

const KEY = 'ludo:profile:v1';

const newId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now();

export function useLocalProfile(): {
  profile: Profile | null;
  loaded: boolean;
  save: (p: { name: string; avatar: string }) => void;
} {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) try { setProfile(JSON.parse(raw)); } catch {}
    setLoaded(true);
  }, []);
  const save = (p: { name: string; avatar: string }) => {
    const next: Profile = { playerId: profile?.playerId ?? newId(), name: p.name, avatar: p.avatar };
    localStorage.setItem(KEY, JSON.stringify(next));
    setProfile(next);
  };
  return { profile, loaded, save };
}
