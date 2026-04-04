// User Database - IndexedDB-based storage for user profiles and highscores
// Supports: Guest mode (local only), Optional cloud sync, Multiplayer room codes

import { PlayerProfile, HighscoreEntry, Achievement, PlayerStats, Difficulty, GameMode, PLAYER_COLORS, getRankTitle } from '@/types/game';

const DB_NAME = 'karaoke-user-db';
const DB_VERSION = 1;

// Store names
const STORES = {
  PROFILES: 'profiles',
  HIGHSCORES: 'highscores',
  SESSIONS: 'sessions',
  ROOMS: 'rooms',
  SYNC_QUEUE: 'syncQueue', // For offline-first sync
} as const;

// Extended profile with sync support
export interface ExtendedPlayerProfile extends PlayerProfile {
  isGuest: boolean; // True = local only, False = can sync
  syncToken?: string; // Token for cloud sync
  lastSyncAt?: number; // Last successful sync timestamp
  deviceId: string; // Unique device identifier
}

// Room for multiplayer
export interface MultiplayerRoom {
  id: string;
  code: string; // 6-character room code (e.g., "ABC123")
  hostId: string; // Host's player ID
  hostName: string;
  players: Array<{
    id: string;
    name: string;
    avatar?: string;
    color: string;
    isHost: boolean;
    joinedAt: number;
    isReady: boolean;
    score?: number;
  }>;
  gameMode: GameMode;
  songId?: string;
  songTitle?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
  expiresAt: number; // Room auto-expires after 2 hours
  maxPlayers: number;
}

// Sync queue item for offline-first
export interface SyncQueueItem {
  id: string;
  type: 'highscore' | 'profile' | 'achievement';
  action: 'create' | 'update' | 'delete';
  data: unknown;
  createdAt: number;
  syncedAt?: number;
  syncAttempts: number;
}

// Session for tracking current login
export interface UserSession {
  id: string;
  profileId: string;
  deviceId: string;
  startedAt: number;
  lastActiveAt: number;
}

// Generate unique device ID
function getDeviceId(): string {
  if (typeof window === 'undefined') return 'device-server';
  let deviceId = localStorage.getItem('karaoke-device-id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('karaoke-device-id', deviceId);
  }
  return deviceId;
}

// Generate room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (I, O, 0, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate sync code for profile linking
export function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

class UserDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async init(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
      throw new Error('[UserDB] IndexedDB not available in this environment');
    }
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[UserDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[UserDB] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('[UserDB] Upgrading database schema...');

        // Profiles store
        if (!db.objectStoreNames.contains(STORES.PROFILES)) {
          const profileStore = db.createObjectStore(STORES.PROFILES, { keyPath: 'id' });
          profileStore.createIndex('name', 'name', { unique: false });
          profileStore.createIndex('syncToken', 'syncToken', { unique: true, multiEntry: true });
          profileStore.createIndex('isGuest', 'isGuest', { unique: false });
        }

        // Highscores store
        if (!db.objectStoreNames.contains(STORES.HIGHSCORES)) {
          const highscoreStore = db.createObjectStore(STORES.HIGHSCORES, { keyPath: 'id' });
          highscoreStore.createIndex('playerId', 'playerId', { unique: false });
          highscoreStore.createIndex('songId', 'songId', { unique: false });
          highscoreStore.createIndex('playedAt', 'playedAt', { unique: false });
          highscoreStore.createIndex('playerSong', ['playerId', 'songId'], { unique: false });
        }

        // Sessions store
        if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
          const sessionStore = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
          sessionStore.createIndex('profileId', 'profileId', { unique: false });
        }

        // Rooms store
        if (!db.objectStoreNames.contains(STORES.ROOMS)) {
          const roomStore = db.createObjectStore(STORES.ROOMS, { keyPath: 'id' });
          roomStore.createIndex('code', 'code', { unique: true });
          roomStore.createIndex('hostId', 'hostId', { unique: false });
          roomStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          syncStore.createIndex('syncedAt', 'syncedAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.init();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // ==================== PROFILE OPERATIONS ====================

  async createGuestProfile(name: string, avatar?: string): Promise<ExtendedPlayerProfile> {
    const deviceId = getDeviceId();
    const profile: ExtendedPlayerProfile = {
      id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      avatar,
      color: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)],
      totalScore: 0,
      gamesPlayed: 0,
      songsCompleted: 0,
      achievements: [],
      stats: this.getDefaultStats(),
      createdAt: Date.now(),
      xp: 0,
      level: 1,
      isGuest: true,
      deviceId,
      isActive: true,
      syncCode: generateSyncCode(),
    };

    const store = await this.getStore(STORES.PROFILES, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(profile);
      request.onsuccess = () => resolve(profile);
      request.onerror = () => reject(request.error);
    });
  }

  async createSyncedProfile(name: string, avatar?: string): Promise<ExtendedPlayerProfile> {
    const deviceId = getDeviceId();
    const profile: ExtendedPlayerProfile = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      avatar,
      color: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)],
      totalScore: 0,
      gamesPlayed: 0,
      songsCompleted: 0,
      achievements: [],
      stats: this.getDefaultStats(),
      createdAt: Date.now(),
      xp: 0,
      level: 1,
      isGuest: false,
      deviceId,
      isActive: true,
      syncCode: generateSyncCode(),
    };

    const store = await this.getStore(STORES.PROFILES, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(profile);
      request.onsuccess = () => resolve(profile);
      request.onerror = () => reject(request.error);
    });
  }

  private getDefaultStats(): PlayerStats {
    return {
      totalNotesHit: 0,
      totalNotesMissed: 0,
      bestCombo: 0,
      perfectStreaks: 0,
      goldenNotesHit: 0,
      averageAccuracy: 0,
      totalGamesPlayed: 0,
      totalSongsCompleted: 0,
      totalTimeSung: 0,
      bestScore: 0,
      worstScore: 0,
      perfectGames: 0,
      difficultyStats: {
        easy: { games: 0, avgAccuracy: 0, bestScore: 0 },
        medium: { games: 0, avgAccuracy: 0, bestScore: 0 },
        hard: { games: 0, avgAccuracy: 0, bestScore: 0 },
      },
      lowestNote: null,
      highestNote: null,
      recentScores: [],
      genreStats: {},
      currentStreak: 0,
      bestStreak: 0,
      lastPlayedDate: null,
    };
  }

  async getProfile(id: string): Promise<ExtendedPlayerProfile | null> {
    const store = await this.getStore(STORES.PROFILES);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getProfileBySyncCode(syncCode: string): Promise<ExtendedPlayerProfile | null> {
    // Search all profiles for matching syncCode
    const profiles = await this.getAllProfiles();
    return profiles.find(p => p.syncCode === syncCode.toUpperCase()) || null;
  }

  async getAllProfiles(): Promise<ExtendedPlayerProfile[]> {
    const store = await this.getStore(STORES.PROFILES);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateProfile(id: string, updates: Partial<ExtendedPlayerProfile>): Promise<ExtendedPlayerProfile | null> {
    const profile = await this.getProfile(id);
    if (!profile) return null;

    const updatedProfile = { ...profile, ...updates };
    const store = await this.getStore(STORES.PROFILES, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(updatedProfile);
      request.onsuccess = () => resolve(updatedProfile);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProfile(id: string): Promise<boolean> {
    const store = await this.getStore(STORES.PROFILES, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== HIGHSCORE OPERATIONS ====================

  async addHighscore(entry: Omit<HighscoreEntry, 'id' | 'playedAt' | 'rankTitle'>): Promise<HighscoreEntry> {
    const rankInfo = getRankTitle(entry.accuracy);
    
    const fullEntry: HighscoreEntry = {
      ...entry,
      id: `highscore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      playedAt: Date.now(),
      rankTitle: rankInfo.title,
    };

    const store = await this.getStore(STORES.HIGHSCORES, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(fullEntry);
      request.onsuccess = () => resolve(fullEntry);
      request.onerror = () => reject(request.error);
    });
  }

  async getHighscores(options?: {
    playerId?: string;
    songId?: string;
    limit?: number;
  }): Promise<HighscoreEntry[]> {
    const store = await this.getStore(STORES.HIGHSCORES);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        let results = request.result || [];
        
        if (options?.playerId) {
          results = results.filter(h => h.playerId === options.playerId);
        }
        if (options?.songId) {
          results = results.filter(h => h.songId === options.songId);
        }
        
        // Sort by score descending
        results.sort((a, b) => b.score - a.score);
        
        // Apply limit
        if (options?.limit) {
          results = results.slice(0, options.limit);
        }
        
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPlayerBestScore(playerId: string, songId: string): Promise<HighscoreEntry | null> {
    const highscores = await this.getHighscores({ playerId, songId, limit: 1 });
    return highscores.length > 0 ? highscores[0] : null;
  }

  async getTopHighscores(limit: number = 10): Promise<HighscoreEntry[]> {
    return this.getHighscores({ limit });
  }

  // ==================== ROOM OPERATIONS ====================

  async createRoom(hostId: string, hostName: string, maxPlayers: number = 8): Promise<MultiplayerRoom> {
    const room: MultiplayerRoom = {
      id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      code: generateRoomCode(),
      hostId,
      hostName,
      players: [{
        id: hostId,
        name: hostName,
        isHost: true,
        joinedAt: Date.now(),
        isReady: false,
        color: PLAYER_COLORS[0],
      }],
      gameMode: 'standard',
      status: 'waiting',
      createdAt: Date.now(),
      expiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
      maxPlayers,
    };

    const store = await this.getStore(STORES.ROOMS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(room);
      request.onsuccess = () => resolve(room);
      request.onerror = () => reject(request.error);
    });
  }

  async getRoomByCode(code: string): Promise<MultiplayerRoom | null> {
    const store = await this.getStore(STORES.ROOMS);
    const index = store.index('code');
    return new Promise((resolve, reject) => {
      const request = index.get(code.toUpperCase());
      request.onsuccess = () => {
        const room = request.result;
        if (room && room.expiresAt > Date.now()) {
          resolve(room);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async joinRoom(code: string, playerId: string, playerName: string, avatar?: string): Promise<MultiplayerRoom | null> {
    const room = await this.getRoomByCode(code);
    if (!room) return null;
    if (room.players.length >= room.maxPlayers) return null;
    if (room.players.some(p => p.id === playerId)) return room; // Already in room

    room.players.push({
      id: playerId,
      name: playerName,
      avatar,
      isHost: false,
      joinedAt: Date.now(),
      isReady: false,
      color: PLAYER_COLORS[room.players.length % PLAYER_COLORS.length],
    });

    const store = await this.getStore(STORES.ROOMS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(room);
      request.onsuccess = () => resolve(room);
      request.onerror = () => reject(request.error);
    });
  }

  async leaveRoom(roomId: string, playerId: string): Promise<boolean> {
    const store = await this.getStore(STORES.ROOMS, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(roomId);
      getRequest.onsuccess = () => {
        const room = getRequest.result;
        if (!room) {
          resolve(false);
          return;
        }

        room.players = room.players.filter(p => p.id !== playerId);

        if (room.players.length === 0) {
          // Delete room if empty
          const deleteRequest = store.delete(roomId);
          deleteRequest.onsuccess = () => resolve(true);
          deleteRequest.onerror = () => reject(deleteRequest.error);
        } else {
          // Transfer host if needed
          if (room.hostId === playerId && room.players.length > 0) {
            room.hostId = room.players[0].id;
            room.hostName = room.players[0].name;
            room.players[0].isHost = true;
          }
          
          const putRequest = store.put(room);
          putRequest.onsuccess = () => resolve(true);
          putRequest.onerror = () => reject(putRequest.error);
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async updateRoom(room: MultiplayerRoom): Promise<MultiplayerRoom> {
    const store = await this.getStore(STORES.ROOMS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(room);
      request.onsuccess = () => resolve(room);
      request.onerror = () => reject(request.error);
    });
  }

  async cleanupExpiredRooms(): Promise<number> {
    const store = await this.getStore(STORES.ROOMS, 'readwrite');
    const index = store.index('expiresAt');
    const range = IDBKeyRange.upperBound(Date.now());
    
    return new Promise((resolve, reject) => {
      let deleted = 0;
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== SESSION OPERATIONS ====================

  async createSession(profileId: string): Promise<UserSession> {
    const session: UserSession = {
      id: `session-${Date.now()}`,
      profileId,
      deviceId: getDeviceId(),
      startedAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    const store = await this.getStore(STORES.SESSIONS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(session);
      request.onsuccess = () => resolve(session);
      request.onerror = () => reject(request.error);
    });
  }

  async getActiveSession(): Promise<UserSession | null> {
    const store = await this.getStore(STORES.SESSIONS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const sessions = request.result || [];
        // Return most recent session
        if (sessions.length > 0) {
          sessions.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
          resolve(sessions[0]);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const store = await this.getStore(STORES.SESSIONS, 'readwrite');
    return new Promise((resolve, reject) => {
      const getRequest = store.get(sessionId);
      getRequest.onsuccess = () => {
        const session = getRequest.result;
        if (session) {
          session.lastActiveAt = Date.now();
          store.put(session);
        }
        resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // ==================== SYNC OPERATIONS ====================

  async addToSyncQueue(type: SyncQueueItem['type'], action: SyncQueueItem['action'], data: unknown): Promise<SyncQueueItem> {
    const item: SyncQueueItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      action,
      data,
      createdAt: Date.now(),
      syncAttempts: 0,
    };

    const store = await this.getStore(STORES.SYNC_QUEUE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const store = await this.getStore(STORES.SYNC_QUEUE);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result || [];
        resolve(items.filter(item => !item.syncedAt));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markSynced(id: string): Promise<void> {
    const store = await this.getStore(STORES.SYNC_QUEUE, 'readwrite');
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.syncedAt = Date.now();
          store.put(item);
        }
        resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // ==================== UTILITY ====================

  async clearAllData(): Promise<void> {
    const db = await this.init();
    const storeNames = Object.values(STORES);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeNames, 'readwrite');
      
      let completed = 0;
      storeNames.forEach(storeName => {
        const request = transaction.objectStore(storeName).clear();
        request.onsuccess = () => {
          completed++;
          if (completed === storeNames.length) {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async exportData(): Promise<{
    profiles: ExtendedPlayerProfile[];
    highscores: HighscoreEntry[];
  }> {
    const profiles = await this.getAllProfiles();
    const highscores = await this.getHighscores();
    return { profiles, highscores };
  }

  async importData(data: {
    profiles: ExtendedPlayerProfile[];
    highscores: HighscoreEntry[];
  }): Promise<void> {
    const profileStore = await this.getStore(STORES.PROFILES, 'readwrite');
    const highscoreStore = await this.getStore(STORES.HIGHSCORES, 'readwrite');

    for (const profile of data.profiles) {
      await new Promise<void>((resolve, reject) => {
        const request = profileStore.put(profile);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    for (const highscore of data.highscores) {
      await new Promise<void>((resolve, reject) => {
        const request = highscoreStore.put(highscore);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

// Singleton instance
let userDbInstance: UserDatabase | null = null;

export function getUserDatabase(): UserDatabase {
  if (!userDbInstance) {
    userDbInstance = new UserDatabase();
  }
  return userDbInstance;
}

export const userDb = {
  get instance(): UserDatabase {
    return getUserDatabase();
  }
};
