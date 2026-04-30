import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { ClientMessage, type ServerMessage } from './protocol';
import { RoomManager } from './rooms';
import { rollDie, legalMoves } from '@ludo/game-logic';

/**
 * Attaches a WebSocket server to an existing http.Server so HTTP and WS share one port.
 * Required for Coolify/Traefik deployment (one port per Coolify service).
 */
export function attachWsServer(httpServer: Server, mgr = new RoomManager()) {
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on('upgrade', (req, sock, head) => {
    wss.handleUpgrade(req, sock, head, (ws) => wss.emit('connection', ws, req));
  });

  // socket → { code, playerId }
  const ctx = new WeakMap<WebSocket, { code: string; playerId: string }>();
  // (code, playerId) → socket  (for broadcasting)
  const sockets = new Map<string, Map<string, WebSocket>>();

  const broadcast = (code: string) => {
    const room = mgr.getRoom(code);
    if (!room) return;
    const msg: ServerMessage = { type: 'state', state: room.state };
    const payload = JSON.stringify(msg);
    sockets.get(code)?.forEach((s) => s.readyState === s.OPEN && s.send(payload));
  };

  const sendError = (s: WebSocket, code: string, message: string) =>
    s.send(JSON.stringify({ type: 'error', code, message } satisfies ServerMessage));

  /**
   * Plays out any consecutive bot turns until a human's turn or the game ends.
   * Bots roll then move synchronously; the inner loop continues until a non-bot is up.
   */
  const handleBotTurns = (code: string) => {
    let room = mgr.getRoom(code);
    while (room && room.state.status === 'playing' && room.state.currentTurn) {
      const cur = room.state.players.find((p) => p.id === room!.state.currentTurn);
      if (!cur?.isBot) break;
      if (!room.state.rolledThisTurn) {
        mgr.roll(code, cur.id, rollDie());
        room = mgr.getRoom(code);
        continue;
      }
      const move = mgr.chooseBotMove(room.state);
      mgr.move(code, cur.id, move);
      room = mgr.getRoom(code);
    }
    broadcast(code);
  };

  wss.on('connection', (socket) => {
    socket.on('message', async (raw) => {
      let parsed: ClientMessage;
      try {
        parsed = ClientMessage.parse(JSON.parse(raw.toString()));
      } catch {
        return sendError(socket, 'BAD_MESSAGE', 'Invalid message');
      }

      try {
        if (parsed.type === 'join') {
          const { code, playerId, name, avatar } = parsed;
          mgr.join(code, { playerId, name, avatar });
          ctx.set(socket, { code, playerId });
          let bucket = sockets.get(code);
          if (!bucket) { bucket = new Map(); sockets.set(code, bucket); }
          bucket.set(playerId, socket);
          broadcast(code);
          return;
        }
        const c = ctx.get(socket);
        if (!c) return sendError(socket, 'NOT_JOINED', 'Send join first');
        switch (parsed.type) {
          case 'addBot': mgr.addBot(c.code, c.playerId); broadcast(c.code); break;
          case 'start':  mgr.start(c.code, c.playerId);  broadcast(c.code); handleBotTurns(c.code); break;
          case 'roll': {
            mgr.roll(c.code, c.playerId, rollDie());
            broadcast(c.code);
            // If after rolling there's only a forced pass available, auto-pass after a beat
            const room = mgr.getRoom(c.code)!;
            const moves = legalMoves(room.state, c.playerId);
            if (moves.length === 1 && moves[0]!.kind === 'pass') {
              setTimeout(() => { mgr.move(c.code, c.playerId, moves[0]!); broadcast(c.code); handleBotTurns(c.code); }, 600);
            } else {
              handleBotTurns(c.code);
            }
            break;
          }
          case 'move':  mgr.move(c.code, c.playerId, { kind: 'move', tokenId: parsed.tokenId }); broadcast(c.code); handleBotTurns(c.code); break;
          case 'pass':  mgr.move(c.code, c.playerId, { kind: 'pass' }); broadcast(c.code); handleBotTurns(c.code); break;
          case 'leave': /* handled by close */ break;
        }
      } catch (err) {
        sendError(socket, (err as Error).message ?? 'ERROR', String(err));
      }
    });

    socket.on('close', () => {
      const c = ctx.get(socket);
      if (!c) return;
      sockets.get(c.code)?.delete(c.playerId);
      mgr.markDisconnected(c.code, c.playerId);
      broadcast(c.code);
    });
  });

  return { wss, mgr };
}
