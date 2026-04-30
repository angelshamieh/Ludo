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

  // --- AFK / abandonment timers ---
  const AFK_MS = 90_000;
  const afkTimers = new Map<string, NodeJS.Timeout>();
  const abandonTimers = new Map<string, NodeJS.Timeout>();

  const armAfk = (code: string) => {
    clearTimeout(afkTimers.get(code));
    const room = mgr.getRoom(code);
    if (!room || room.state.status !== 'playing' || !room.state.currentTurn) return;
    const playerId = room.state.currentTurn;
    // Bots play themselves via handleBotTurns; AFK timer is only for humans.
    const cur = room.state.players.find((p) => p.id === playerId);
    if (cur?.isBot) return;
    const t = setTimeout(() => {
      const r = mgr.getRoom(code);
      if (!r || r.state.currentTurn !== playerId || r.state.status !== 'playing') return;
      // Auto-roll for them if they haven't, then auto-play
      if (!r.state.rolledThisTurn) {
        mgr.roll(code, playerId, rollDie());
      }
      const moves = legalMoves(mgr.getRoom(code)!.state, playerId);
      if (moves.length > 0) {
        mgr.move(code, playerId, moves[0]!);
      }
      broadcast(code);
      handleBotTurns(code);
      armAfk(code);
    }, AFK_MS);
    afkTimers.set(code, t);
  };

  /**
   * Plays out any consecutive bot turns until a human's turn or the game ends.
   * Each bot action is broadcast individually with a delay so human players can
   * watch each roll and move animate, instead of seeing the world snap to the
   * end-state after all bots played.
   */
  const BOT_STEP_MS = 1100;
  const inFlight = new Set<string>(); // codes that already have an active bot loop
  const handleBotTurns = (code: string) => {
    if (inFlight.has(code)) return; // avoid concurrent loops on the same room
    inFlight.add(code);
    const step = () => {
      const room = mgr.getRoom(code);
      if (!room || room.state.status !== 'playing' || !room.state.currentTurn) {
        inFlight.delete(code);
        return;
      }
      const cur = room.state.players.find((p) => p.id === room.state.currentTurn);
      if (!cur?.isBot) {
        inFlight.delete(code);
        armAfk(code);
        return;
      }
      if (!room.state.rolledThisTurn) {
        mgr.roll(code, cur.id, rollDie());
        broadcast(code);
        setTimeout(step, BOT_STEP_MS);
        return;
      }
      const move = mgr.chooseBotMove(room.state);
      mgr.move(code, cur.id, move);
      broadcast(code);
      setTimeout(step, BOT_STEP_MS);
    };
    setTimeout(step, BOT_STEP_MS);
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
          // Cancel any pending abandonment timer — they're back
          clearTimeout(abandonTimers.get(`${code}:${playerId}`));
          abandonTimers.delete(`${code}:${playerId}`);
          broadcast(code);
          return;
        }
        const c = ctx.get(socket);
        if (!c) return sendError(socket, 'NOT_JOINED', 'Send join first');
        switch (parsed.type) {
          case 'addBot': mgr.addBot(c.code, c.playerId); broadcast(c.code); break;
          case 'start':  mgr.start(c.code, c.playerId);  broadcast(c.code); handleBotTurns(c.code); armAfk(c.code); break;
          case 'roll': {
            mgr.roll(c.code, c.playerId, rollDie());
            broadcast(c.code);
            // If after rolling there's only a forced pass available, auto-pass after a beat
            const room = mgr.getRoom(c.code)!;
            const moves = legalMoves(room.state, c.playerId);
            if (moves.length === 1 && moves[0]!.kind === 'pass') {
              setTimeout(() => { mgr.move(c.code, c.playerId, moves[0]!); broadcast(c.code); handleBotTurns(c.code); armAfk(c.code); }, 1500);
            } else {
              handleBotTurns(c.code);
              armAfk(c.code);
            }
            break;
          }
          case 'move':  mgr.move(c.code, c.playerId, { kind: 'move', tokenId: parsed.tokenId }); broadcast(c.code); handleBotTurns(c.code); armAfk(c.code); break;
          case 'pass':  mgr.move(c.code, c.playerId, { kind: 'pass' }); broadcast(c.code); handleBotTurns(c.code); armAfk(c.code); break;
          case 'playAgain': mgr.playAgain(c.code); broadcast(c.code); break;
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

      const room = mgr.getRoom(c.code);
      if (room?.state.status !== 'playing') return;
      const key = `${c.code}:${c.playerId}`;
      clearTimeout(abandonTimers.get(key));
      const t = setTimeout(() => {
        const r = mgr.getRoom(c.code);
        if (!r) return;
        const p = r.state.players.find((pp) => pp.id === c.playerId);
        if (p && !p.connected) {
          mgr.convertToBot(c.code, c.playerId);
          broadcast(c.code);
          handleBotTurns(c.code);
          armAfk(c.code);
        }
      }, 120_000);
      abandonTimers.set(key, t);
    });
  });

  return { wss, mgr };
}
