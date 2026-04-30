import { describe, it, expect } from 'vitest';
import { RoomManager } from '../src/rooms';

describe('RoomManager', () => {
  it('creates a room with a unique 4-letter uppercase code', () => {
    const m = new RoomManager(() => 1000);
    const code = m.createRoom({ hostId: 'h', hostName: 'Host', hostAvatar: '🐱' });
    expect(code).toMatch(/^[A-Z]{4}$/);
    const r = m.getRoom(code);
    expect(r?.state.players[0]!.name).toBe('Host');
    expect(r?.state.status).toBe('lobby');
  });

  it('lets a second player join in lobby and pick a free color', () => {
    const m = new RoomManager(() => 1000);
    const code = m.createRoom({ hostId: 'h', hostName: 'Host', hostAvatar: '🐱' });
    m.join(code, { playerId: 'g', name: 'Guest', avatar: '🦊' });
    const r = m.getRoom(code);
    expect(r?.state.players).toHaveLength(2);
    // 4 colors and host took red, guest gets next: green
    expect(r?.state.players[1]!.color).toBe('green');
  });

  it('refuses to seat a 5th player', () => {
    const m = new RoomManager(() => 1000);
    const code = m.createRoom({ hostId: 'h', hostName: 'H', hostAvatar: '🐱' });
    for (const id of ['a', 'b', 'c']) m.join(code, { playerId: id, name: id, avatar: '🐱' });
    expect(() => m.join(code, { playerId: 'e', name: 'e', avatar: '🐱' })).toThrow();
  });

  it('reusing a playerId reclaims the seat', () => {
    const m = new RoomManager(() => 1000);
    const code = m.createRoom({ hostId: 'h', hostName: 'Host', hostAvatar: '🐱' });
    m.markDisconnected(code, 'h');
    m.join(code, { playerId: 'h', name: 'Host', avatar: '🐱' });
    expect(m.getRoom(code)?.state.players[0]!.connected).toBe(true);
  });
});
