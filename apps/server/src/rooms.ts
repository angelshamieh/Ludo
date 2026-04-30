import {
  startGame, applyRoll, applyMove, chooseBotMove,
  COLORS, type Color, type GameState, type Move, type Player, type Token,
} from '@ludo/game-logic';

export type Room = {
  code: string;
  state: GameState;
  /** Map of playerId → set of socket "send" callbacks */
  listeners: Map<string, Set<(s: GameState) => void>>;
};

const code4 = (): string => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // skip I/O for legibility
  let s = '';
  for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
};

export class RoomManager {
  private rooms = new Map<string, Room>();
  constructor(private now: () => number = () => Date.now()) {}

  createRoom(args: { hostId: string; hostName: string; hostAvatar: string }): string {
    let code = code4();
    while (this.rooms.has(code)) code = code4();
    const host: Player = {
      id: args.hostId, name: args.hostName, avatar: args.hostAvatar,
      color: 'red', isBot: false, isHost: true, connected: true,
    };
    // Build lobby state directly — game-logic's createInitialState requires 2+ players.
    const tokens: Record<string, Token[]> = {
      [host.id]: Array.from({ length: 4 }, (_, i) => ({
        id: `${host.color}-${i}`, owner: host.id, color: host.color, position: { kind: 'home' as const },
      })),
    };
    const now = this.now();
    const state: GameState = {
      code,
      status: 'lobby',
      players: [host],
      turnOrder: [],
      currentTurn: null,
      dice: null,
      rolledThisTurn: false,
      consecutiveSixes: 0,
      tokens,
      winner: null,
      log: [],
      createdAt: now,
      lastActivityAt: now,
    };
    this.rooms.set(code, { code, state, listeners: new Map() });
    return code;
  }

  getRoom(code: string): Room | undefined { return this.rooms.get(code); }

  private nextFreeColor(state: GameState): Color {
    const used = new Set(state.players.map((p) => p.color));
    return COLORS.find((c) => !used.has(c))!;
  }

  join(code: string, args: { playerId: string; name: string; avatar: string }): GameState {
    const r = this.rooms.get(code);
    if (!r) throw new Error('ROOM_NOT_FOUND');
    const existing = r.state.players.findIndex((p) => p.id === args.playerId);
    if (existing >= 0) {
      r.state = {
        ...r.state,
        players: r.state.players.map((p, i) => i === existing ? { ...p, connected: true, name: args.name, avatar: args.avatar } : p),
        lastActivityAt: this.now(),
      };
      return r.state;
    }
    if (r.state.status !== 'lobby') throw new Error('GAME_IN_PROGRESS');
    if (r.state.players.length >= 4) throw new Error('ROOM_FULL');
    const color = this.nextFreeColor(r.state);
    const player: Player = {
      id: args.playerId, name: args.name, avatar: args.avatar,
      color, isBot: false, isHost: false, connected: true,
    };
    const tokens = { ...r.state.tokens };
    tokens[player.id] = Array.from({ length: 4 }, (_, i) => ({
      id: `${color}-${i}`, owner: player.id, color, position: { kind: 'home' as const },
    }));
    r.state = { ...r.state, players: [...r.state.players, player], tokens, lastActivityAt: this.now() };
    return r.state;
  }

  addBot(code: string, hostId: string): GameState {
    const r = this.rooms.get(code);
    if (!r) throw new Error('ROOM_NOT_FOUND');
    const host = r.state.players.find((p) => p.id === hostId);
    if (!host?.isHost) throw new Error('NOT_HOST');
    if (r.state.status !== 'lobby') throw new Error('GAME_IN_PROGRESS');
    if (r.state.players.length >= 4) throw new Error('ROOM_FULL');
    const color = this.nextFreeColor(r.state);
    const bot: Player = {
      id: `bot-${color}`, name: `Bot ${color}`, avatar: '🤖',
      color, isBot: true, isHost: false, connected: true,
    };
    const tokens = { ...r.state.tokens };
    tokens[bot.id] = Array.from({ length: 4 }, (_, i) => ({
      id: `${color}-${i}`, owner: bot.id, color, position: { kind: 'home' as const },
    }));
    r.state = { ...r.state, players: [...r.state.players, bot], tokens, lastActivityAt: this.now() };
    return r.state;
  }

  start(code: string, hostId: string): GameState {
    const r = this.rooms.get(code);
    if (!r) throw new Error('ROOM_NOT_FOUND');
    const host = r.state.players.find((p) => p.id === hostId);
    if (!host?.isHost) throw new Error('NOT_HOST');
    r.state = startGame(r.state, { now: this.now() });
    return r.state;
  }

  markDisconnected(code: string, playerId: string) {
    const r = this.rooms.get(code);
    if (!r) return;
    r.state = {
      ...r.state,
      players: r.state.players.map((p) => p.id === playerId ? { ...p, connected: false } : p),
      lastActivityAt: this.now(),
    };
  }

  convertToBot(code: string, playerId: string) {
    const r = this.rooms.get(code);
    if (!r) return;
    r.state = {
      ...r.state,
      players: r.state.players.map((p) =>
        p.id === playerId ? { ...p, isBot: true, name: `${p.name} (bot)`, connected: true } : p),
      lastActivityAt: this.now(),
    };
  }

  sweepExpired(thresholdMs = 10 * 60_000) {
    const cutoff = this.now() - thresholdMs;
    for (const [code, r] of this.rooms) {
      const anyConnected = r.state.players.some((p) => p.connected && !p.isBot);
      if (!anyConnected && r.state.lastActivityAt < cutoff) this.rooms.delete(code);
    }
  }

  roll(code: string, playerId: string, value: number): GameState {
    const r = this.rooms.get(code);
    if (!r) throw new Error('ROOM_NOT_FOUND');
    if (r.state.currentTurn !== playerId) throw new Error('NOT_YOUR_TURN');
    r.state = applyRoll(r.state, value, { now: this.now() });
    return r.state;
  }

  move(code: string, playerId: string, move: Move): GameState {
    const r = this.rooms.get(code);
    if (!r) throw new Error('ROOM_NOT_FOUND');
    if (r.state.currentTurn !== playerId) throw new Error('NOT_YOUR_TURN');
    r.state = applyMove(r.state, move, { now: this.now() });
    return r.state;
  }

  chooseBotMove = chooseBotMove;
}
