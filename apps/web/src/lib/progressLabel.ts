import type { GameType } from '@ludo/game-shared';

/**
 * Returns a short progress label for a player given the room's game state.
 * Game-specific because the meaning of "progress" differs.
 */
export function progressLabel(
  gameType: GameType,
  tokens: unknown,
  playerId: string,
): string {
  if (gameType === 'ludo') {
    const arr = (tokens as Record<string, { position: { kind: string; index?: number } }[]>)[playerId] ?? [];
    const finished = arr.filter((t) => t.position.kind === 'path' && t.position.index === 56).length;
    return `${finished}/4 finished`;
  }
  if (gameType === 'snakes') {
    const sq = (tokens as Record<string, number>)[playerId] ?? 0;
    return `square ${sq}`;
  }
  return '';
}
