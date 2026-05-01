'use client';
import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@ludo/game-logic-ludo';

export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'reconnecting';

export function useRoomConnection({ wsUrl, code, profile }: {
  wsUrl: string;
  code: string;
  profile: { playerId: string; name: string; avatar: string } | null;
}) {
  const [state, setGameState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const sockRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    const connect = () => {
      const sock = new WebSocket(wsUrl);
      sockRef.current = sock;
      sock.onopen = () => {
        attemptRef.current = 0;
        setStatus('open');
        sock.send(JSON.stringify({
          type: 'join', code,
          playerId: profile.playerId, name: profile.name, avatar: profile.avatar,
        }));
      };
      sock.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'state') setGameState(msg.state);
        if (msg.type === 'error') setError(`${msg.code}: ${msg.message}`);
      };
      sock.onclose = () => {
        if (cancelled) return;
        setStatus('reconnecting');
        const delay = Math.min(10000, 1000 * 2 ** attemptRef.current++);
        setTimeout(connect, delay);
      };
    };
    connect();
    return () => { cancelled = true; sockRef.current?.close(); };
  }, [wsUrl, code, profile]);

  const send = (m: object) => sockRef.current?.send(JSON.stringify(m));

  return { state, status, error, send };
}
