import {
  COLORS, type Color, type GameState, type Move, type Player, type Token,
} from '@ludo/game-logic-ludo';
import { getEngine } from './engines/index';

export type Room = {
  code: string;
  gameType: import('@ludo/game-shared').GameType;
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

const MAX_SEATS: Record<import('@ludo/game-shared').GameType, number> = {
  ludo: 4,
  snakes: 4,
  tictactoe: 2,
};

export class RoomManager {
  private rooms = new Map<string, Room>();
  constructor(private now: () => number = () => Date.now()) {}

  createRoom(args: {
    hostId: string;
    hostName: string;
    hostAvatar: string;
    gameType?: import('@ludo/game-shared').GameType;
  }): string {
    const gameType = args.gameType ?? 'ludo';
    let code = code4();
    while (this.rooms.has(code)) code = code4();
    const host: Player = {
      id: args.hostId, name: args.hostName, avatar: args.hostAvatar,
      color: 'red', isBot: false, isHost: true, connected: true,
    };
    // Build lobby state directly — game-logic's createInitialState requires 2+ players.
    // The lobby state has Ludo-shaped tokens (the engine recreates it at start time anyway).
    const tokens: Record<string, Token[]> = {
      [host.id]: Array.from({ length: 4 }, (_, i) => ({
        id: `${host.color}-${i}`, owner: host.id, color: host.color, position: { kind: 'home' as const },
      })),
    };
    const now = this.now();
    const state: GameState = {
      code,
      gameType: gameType as 'ludo',
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
    this.rooms.set(code, { code, gameType, state, listeners: new Map() });
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
    if (r.state.players.length >= MAX_SEATS[r.gameType]) throw new Error('ROOM_FULL');
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
    if (r.state.players.length >= MAX_SEATS[r.gameType]) throw new Error('ROOM_FULL');
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
    const engine = getEngine(r.gameType);
    // Recreate state via the engine to get the right per-game shape.
    // Carry over the players from the lobby.
    const players = r.state.players;
    let state = engine.createInitialState({ code, players, now: this.now() }) as GameState;
    state = engine.startGame(state, { now: this.now() }) as GameState;
    r.state = state;
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
    const engine = getEngine(r.gameType);
    r.state = engine.applyRoll(r.state, value, { now: this.now() }) as GameState;
    return r.state;
  }

  move(code: string, playerId: string, move: Move | unknown): GameState {
    const r = this.rooms.get(code);
    if (!r) throw new Error('ROOM_NOT_FOUND');
    if (r.state.currentTurn !== playerId) throw new Error('NOT_YOUR_TURN');
    const engine = getEngine(r.gameType);
    r.state = engine.applyMove(r.state, move, { now: this.now() }) as GameState;
    return r.state;
  }

  setDifficulty(code: string, hostId: string, value: 'easy' | 'hard') {
    const r = this.rooms.get(code);
    if (!r) throw new Error('ROOM_NOT_FOUND');
    if (r.gameType !== 'tictactoe') throw new Error('NOT_TICTACTOE');
    const host = r.state.players.find((p) => p.id === hostId);
    if (!host?.isHost) throw new Error('NOT_HOST');
    if (r.state.status !== 'lobby') throw new Error('GAME_IN_PROGRESS');
    r.state = { ...r.state, difficulty: value, lastActivityAt: this.now() } as never;
  }

  playAgain(code: string) {
    const r = this.rooms.get(code);
    if (!r || r.state.status !== 'finished') return;
    // Keep the same players (host stays host) and re-create the lobby state.
    // Don't use createInitialState directly because it requires 2+ players;
    // for safety, build the state manually like createRoom does.
    const players = r.state.players.map((p) => ({ ...p }));
    const tokens: Record<string, typeof r.state.tokens[string]> = {};
    for (const p of players) {
      tokens[p.id] = Array.from({ length: 4 }, (_, i) => ({
        id: `${p.color}-${i}`, owner: p.id, color: p.color, position: { kind: 'home' as const },
      }));
    }
    r.state = {
      code,
      gameType: 'ludo',
      status: 'lobby',
      players,
      turnOrder: [],
      currentTurn: null,
      dice: null,
      rolledThisTurn: false,
      consecutiveSixes: 0,
      tokens,
      winner: null,
      log: [],
      createdAt: this.now(),
      lastActivityAt: this.now(),
    };
  }

  chooseBotMove = (state: GameState) => {
    const engine = getEngine(state.gameType);
    return engine.chooseBotMove(state) as Move;
  };
}
