import type { GameType, Profile } from '@ludo/game-shared';

const HTTP_URL = process.env.NEXT_PUBLIC_LUDO_HTTP ?? 'http://localhost:8787';

export async function createRoom(profile: Profile, gameType: GameType): Promise<string> {
  const r = await fetch(`${HTTP_URL}/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      hostId: profile.playerId,
      name: profile.name,
      avatar: profile.avatar,
      gameType,
    }),
  });
  if (!r.ok) throw new Error('Could not create room');
  const { code } = await r.json();
  return code;
}
