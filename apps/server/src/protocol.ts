import { z } from 'zod';

export const ClientMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('join'),       code: z.string(), playerId: z.string(), name: z.string(), avatar: z.string() }),
  z.object({ type: z.literal('addBot') }),
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('roll') }),
  z.object({ type: z.literal('move'),       tokenId: z.string() }),
  z.object({ type: z.literal('pass') }),
  z.object({ type: z.literal('playAgain') }),
  z.object({ type: z.literal('setDifficulty'), value: z.enum(['easy', 'hard']) }),
  z.object({ type: z.literal('leave') }),
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

export type ServerMessage =
  | { type: 'state'; state: unknown }
  | { type: 'error'; code: string; message: string };
