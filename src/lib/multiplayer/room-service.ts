// Room Service - Multiplayer room management with room codes
// Supports: Local party mode, Future online multiplayer via WebSocket

import { getUserDatabase, generateRoomCode, MultiplayerRoom } from '@/lib/db/user-db';
import { GameMode, PLAYER_COLORS } from '@/types/game';
import { logger } from '@/lib/logger';

// Room player info
export interface RoomPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  isHost: boolean;
  joinedAt: number;
  isReady: boolean;
  score?: number;
}

// Room event types
export type RoomEventType = 
  | 'room-created'
  | 'room-joined'
  | 'room-left'
  | 'player-joined'
  | 'player-left'
  | 'player-ready'
  | 'game-started'
  | 'game-ended'
  | 'room-closed';

export type RoomEventCallback = (event: RoomEventType, data: unknown) => void;

// Room configuration
export interface RoomConfig {
  maxPlayers: number;
  gameMode: GameMode;
  songId?: string;
  songTitle?: string;
  password?: string; // Optional room password
}

// Default room config
const DEFAULT_ROOM_CONFIG: RoomConfig = {
  maxPlayers: 8,
  gameMode: 'standard',
};

class RoomService {
  private currentRoom: MultiplayerRoom | null = null;
  private listeners: Set<RoomEventCallback> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // ==================== ROOM CREATION ====================

  /**
   * Create a new room with a unique 6-character code
   * The host automatically joins the room
   */
  async createRoom(hostId: string, hostName: string, config: Partial<RoomConfig> = {}): Promise<MultiplayerRoom> {
    const finalConfig = { ...DEFAULT_ROOM_CONFIG, ...config };
    const db = getUserDatabase();
    await db.init();

    // Create room with unique code
    let room: MultiplayerRoom | null = null;
    let attempts = 0;
    
    while (!room && attempts < 10) {
      try {
        room = await db.createRoom(hostId, hostName, finalConfig.maxPlayers);
        attempts++;
      } catch {
        // Code collision, try again
        attempts++;
      }
    }

    if (!room) {
      throw new Error('Failed to create room after 10 attempts');
    }

    // Update room with config
    room.gameMode = finalConfig.gameMode;
    room.songId = finalConfig.songId;
    room.songTitle = finalConfig.songTitle;

    await db.updateRoom(room);

    this.currentRoom = room;
    this.startHeartbeat();
    
    logger.info('[RoomService]', 'Created room:', room.code);
    this.emit('room-created', room);

    return room;
  }

  // ==================== JOINING ROOMS ====================

  /**
   * Join an existing room by code
   * Returns the room if successful, null if room not found or full
   */
  async joinRoom(code: string, playerId: string, playerName: string, avatar?: string): Promise<MultiplayerRoom | null> {
    const db = getUserDatabase();
    await db.init();

    const room = await db.joinRoom(code, playerId, playerName, avatar);
    
    if (room) {
      this.currentRoom = room;
      this.startHeartbeat();
      logger.info('[RoomService]', 'Joined room:', room.code);
      this.emit('room-joined', room);
    }

    return room;
  }

  /**
   * Leave the current room
   */
  async leaveRoom(playerId: string): Promise<void> {
    if (!this.currentRoom) return;

    const db = getUserDatabase();
    await db.leaveRoom(this.currentRoom.id, playerId);

    this.emit('room-left', { roomId: this.currentRoom.id, playerId });
    this.currentRoom = null;
    this.stopHeartbeat();
  }

  // ==================== ROOM MANAGEMENT ====================

  /**
   * Get current room
   */
  getCurrentRoom(): MultiplayerRoom | null {
    return this.currentRoom;
  }

  /**
   * Get room by code (without joining)
   */
  async getRoomByCode(code: string): Promise<MultiplayerRoom | null> {
    const db = getUserDatabase();
    await db.init();
    return db.getRoomByCode(code);
  }

  /**
   * Refresh room data from database
   */
  async refreshRoom(): Promise<MultiplayerRoom | null> {
    if (!this.currentRoom) return null;

    const db = getUserDatabase();
    await db.init();
    
    const room = await db.getRoomByCode(this.currentRoom.code);
    if (room) {
      this.currentRoom = room;
    }
    
    return room;
  }

  /**
   * Update room configuration (host only)
   */
  async updateRoomConfig(updates: Partial<MultiplayerRoom>): Promise<void> {
    if (!this.currentRoom) return;

    const db = getUserDatabase();
    
    this.currentRoom = {
      ...this.currentRoom,
      ...updates,
    };

    await db.updateRoom(this.currentRoom);
    logger.info('[RoomService]', 'Updated room config');
  }

  /**
   * Set player ready status
   */
  async setPlayerReady(playerId: string, isReady: boolean): Promise<void> {
    if (!this.currentRoom) return;

    const playerIndex = this.currentRoom.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    this.currentRoom.players[playerIndex].isReady = isReady;

    const db = getUserDatabase();
    await db.updateRoom(this.currentRoom);
    
    this.emit('player-ready', { playerId, isReady });
  }

  // ==================== GAME CONTROL ====================

  /**
   * Start the game (host only)
   */
  async startGame(songId: string, songTitle: string): Promise<void> {
    if (!this.currentRoom) return;

    this.currentRoom.status = 'playing';
    this.currentRoom.songId = songId;
    this.currentRoom.songTitle = songTitle;

    const db = getUserDatabase();
    await db.updateRoom(this.currentRoom);
    
    logger.info('[RoomService]', 'Game started:', songTitle);
    this.emit('game-started', this.currentRoom);
  }

  /**
   * End the game
   */
  async endGame(): Promise<void> {
    if (!this.currentRoom) return;

    this.currentRoom.status = 'finished';

    const db = getUserDatabase();
    await db.updateRoom(this.currentRoom);
    
    logger.info('[RoomService]', 'Game ended');
    this.emit('game-ended', this.currentRoom);
  }

  /**
   * Update player score during game
   */
  async updatePlayerScore(playerId: string, score: number): Promise<void> {
    if (!this.currentRoom) return;

    const playerIndex = this.currentRoom.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    this.currentRoom.players[playerIndex].score = score;

    const db = getUserDatabase();
    await db.updateRoom(this.currentRoom);
  }

  // ==================== PLAYER MANAGEMENT ====================

  /**
   * Get all players in current room
   */
  getPlayers(): RoomPlayer[] {
    return this.currentRoom?.players || [];
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId: string): RoomPlayer | null {
    return this.currentRoom?.players.find(p => p.id === playerId) || null;
  }

  /**
   * Check if player is host
   */
  isHost(playerId: string): boolean {
    return this.currentRoom?.hostId === playerId;
  }

  /**
   * Check if all players are ready
   */
  areAllPlayersReady(): boolean {
    if (!this.currentRoom || this.currentRoom.players.length === 0) return false;
    return this.currentRoom.players.every(p => p.isReady || p.isHost);
  }

  // ==================== ROOM CODE UTILITIES ====================

  /**
   * Generate a QR code URL for room joining
   */
  getRoomQRCode(size: number = 200): string | null {
    if (!this.currentRoom) return null;
    
    // Generate QR code for room joining
    const joinUrl = `${window.location.origin}?room=${this.currentRoom.code}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(joinUrl)}`;
  }

  /**
   * Get join URL for room
   */
  getRoomJoinUrl(): string | null {
    if (!this.currentRoom) return null;
    return `${window.location.origin}?room=${this.currentRoom.code}`;
  }

  /**
   * Format room code for display (e.g., "ABC 123")
   */
  formatRoomCode(code?: string): string {
    const c = code || this.currentRoom?.code;
    if (!c) return '';
    return `${c.slice(0, 3)} ${c.slice(3)}`;
  }

  // ==================== CLEANUP ====================

  /**
   * Close the current room (host only)
   */
  async closeRoom(): Promise<void> {
    if (!this.currentRoom) return;

    const db = getUserDatabase();
    
    // Remove all players and delete room
    for (const player of this.currentRoom.players) {
      await db.leaveRoom(this.currentRoom.id, player.id);
    }

    this.emit('room-closed', { roomId: this.currentRoom.id });
    this.currentRoom = null;
    this.stopHeartbeat();
  }

  /**
   * Cleanup expired rooms (maintenance)
   */
  async cleanupExpiredRooms(): Promise<number> {
    const db = getUserDatabase();
    await db.init();
    const deleted = await db.cleanupExpiredRooms();
    
    if (deleted > 0) {
      logger.info('[RoomService]', 'Cleaned up', deleted, 'expired rooms');
    }
    
    return deleted;
  }

  // ==================== HEARTBEAT ====================

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    // Refresh room data every 2 seconds
    this.heartbeatInterval = setInterval(async () => {
      if (this.currentRoom) {
        await this.refreshRoom();
      }
    }, 2000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ==================== EVENTS ====================

  subscribe(callback: RoomEventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emit(event: RoomEventType, data: unknown): void {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        logger.error('[RoomService]', 'Event listener error:', error);
      }
    });
  }
}

// Singleton instance
let roomServiceInstance: RoomService | null = null;

export function getRoomService(): RoomService {
  if (!roomServiceInstance) {
    roomServiceInstance = new RoomService();
  }
  return roomServiceInstance;
}

export const roomService = {
  get instance(): RoomService {
    return getRoomService();
  }
};

// Export utilities
export { generateRoomCode };
