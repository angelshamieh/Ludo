import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import WebSocket from 'ws';
import { attachWsServer } from '../src/wsServer';
import { RoomManager } from '../src/rooms';

const PORT = 19191;
let httpServer: http.Server;
let mgr: RoomManager;

beforeAll(async () => {
  mgr = new RoomManager(() => 1000);
  httpServer = http.createServer();
  attachWsServer(httpServer, mgr);
  await new Promise<void>((r) => httpServer.listen(PORT, r));
});
afterAll(() => new Promise<void>((r) => httpServer.close(() => r())));

const ws = () => new WebSocket(`ws://localhost:${PORT}`);

const wait = (s: WebSocket, predicate: (msg: any) => boolean) =>
  new Promise<any>((resolve) => {
    s.on('message', (raw) => {
      const m = JSON.parse(raw.toString());
      if (predicate(m)) resolve(m);
    });
  });

describe('ws integration', () => {
  it('host creates, guest joins, both see updated state', async () => {
    const code = mgr.createRoom({ hostId: 'host', hostName: 'Host', hostAvatar: '🐱' });

    const a = ws(); const b = ws();
    await new Promise((r) => a.once('open', r));
    await new Promise((r) => b.once('open', r));

    a.send(JSON.stringify({ type: 'join', code, playerId: 'host', name: 'Host', avatar: '🐱' }));
    b.send(JSON.stringify({ type: 'join', code, playerId: 'g',    name: 'Guest', avatar: '🦊' }));

    const stateMsg = await wait(b, (m) => m.type === 'state' && m.state.players.length === 2);
    expect(stateMsg.state.code).toBe(code);

    a.close(); b.close();
  });
});
