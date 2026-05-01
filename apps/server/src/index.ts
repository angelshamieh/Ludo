import http from 'node:http';
import { attachWsServer } from './wsServer';
import { RoomManager } from './rooms';

const port = Number(process.env.PORT ?? 8787);
const corsOrigin = process.env.CORS_ORIGIN ?? '*';
const mgr = new RoomManager();

const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.end();

  if (req.method === 'POST' && req.url === '/rooms') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { hostId, name, avatar, gameType } = JSON.parse(body || '{}');
        if (!hostId || !name) {
          res.statusCode = 400; res.end(JSON.stringify({ error: 'missing fields' })); return;
        }
        const validGameTypes = ['ludo', 'snakes'];
        const game = (gameType && validGameTypes.includes(gameType)) ? gameType : 'ludo';
        const code = mgr.createRoom({ hostId, hostName: name, hostAvatar: avatar ?? '🐱', gameType: game });
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ code, gameType: game }));
      } catch (err) {
        res.statusCode = 500; res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.end('ok');
    return;
  }
  const roomMatch = req.url?.match(/^\/rooms\/([A-Z]{4})$/);
  if (req.method === 'GET' && roomMatch) {
    const code = roomMatch[1]!;
    const r = mgr.getRoom(code);
    if (!r) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'not found' }));
      return;
    }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ code, gameType: r.gameType }));
    return;
  }
  res.statusCode = 404; res.end();
});

attachWsServer(httpServer, mgr);
httpServer.listen(port, () => console.log(`Ludo server (HTTP + WS) on :${port}`));

setInterval(() => mgr.sweepExpired(), 60_000);
