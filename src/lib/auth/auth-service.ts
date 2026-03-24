// Auth Service - Hybrid authentication for Karaoke Successor
// Supports: Guest mode (automatic), Optional cloud sync, Profile linking via sync codes

import { getUserDatabase, ExtendedPlayerProfile, generateSyncCode, generateRoomCode, UserSession } from '@/lib/db/user-db';
import { PlayerProfile, PLAYER_COLORS } from '@/types/game';

// Auth state
export interface AuthState {
  isAuthenticated: boolean;
  isGuest: boolean;
  profile: ExtendedPlayerProfile | null;
  session: UserSession | null;
  lastActiveAt: number;
}

// Events
type AuthEventType = 'login' | 'logout' | 'profile-update' | 'sync-complete';
type AuthEventCallback = (event: AuthEventType, data?: unknown) => void;

class AuthService {
  private state: AuthState = {
    isAuthenticated: false,
    isGuest: true,
    profile: null,
    session: null,
    lastActiveAt: 0,
  };
  
  private listeners: Set<AuthEventCallback> = new Set();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  // ==================== INITIALIZATION ====================

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    await this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      const db = getUserDatabase();
      await db.init();
      
      // Try to restore existing session
      const session = await db.getActiveSession();
      
      if (session) {
        const profile = await db.getProfile(session.profileId);
        if (profile) {
          this.state = {
            isAuthenticated: true,
            isGuest: profile.isGuest,
            profile,
            session,
            lastActiveAt: Date.now(),
          };
          console.log('[Auth] Restored session for:', profile.name);
        }
      }
      
      // If no session, create a guest profile automatically
      if (!this.state.isAuthenticated) {
        await this.createGuestProfile();
      }
      
      this.initialized = true;
      this.emit('login', this.state.profile);
    } catch (error) {
      console.error('[Auth] Initialization failed:', error);
      // Create emergency guest profile
      await this.createGuestProfile();
      this.initialized = true;
    }
  }

  // ==================== GUEST AUTHENTICATION ====================

  async createGuestProfile(name: string = 'Singer'): Promise<ExtendedPlayerProfile> {
    const db = getUserDatabase();
    
    // Create guest profile
    const profile = await db.createGuestProfile(name);
    
    // Create session
    const session = await db.createSession(profile.id);
    
    this.state = {
      isAuthenticated: true,
      isGuest: true,
      profile,
      session,
      lastActiveAt: Date.now(),
    };
    
    console.log('[Auth] Created guest profile:', profile.name);
    this.emit('login', profile);
    
    return profile;
  }

  // ==================== PROFILE MANAGEMENT ====================

  async getCurrentProfile(): Promise<ExtendedPlayerProfile | null> {
    await this.initialize();
    return this.state.profile;
  }

  async updateProfile(updates: Partial<ExtendedPlayerProfile>): Promise<ExtendedPlayerProfile | null> {
    if (!this.state.profile) return null;
    
    const db = getUserDatabase();
    const updated = await db.updateProfile(this.state.profile.id, updates);
    
    if (updated) {
      this.state.profile = updated;
      this.emit('profile-update', updated);
    }
    
    return updated;
  }

  async updateProfileName(name: string): Promise<void> {
    await this.updateProfile({ name });
  }

  async updateProfileAvatar(avatar: string): Promise<void> {
    await this.updateProfile({ avatar });
  }

  async updateProfileColor(color: string): Promise<void> {
    await this.updateProfile({ color });
  }

  async deleteCurrentProfile(): Promise<void> {
    if (!this.state.profile) return;
    
    const db = getUserDatabase();
    await db.deleteProfile(this.state.profile.id);
    
    this.state = {
      isAuthenticated: false,
      isGuest: true,
      profile: null,
      session: null,
      lastActiveAt: 0,
    };
    
    // Create new guest profile
    await this.createGuestProfile();
    this.emit('logout');
  }

  // ==================== SYNC CODE SYSTEM ====================

  async getSyncCode(): Promise<string | null> {
    return this.state.profile?.syncCode || null;
  }

  async linkProfileBySyncCode(syncCode: string): Promise<boolean> {
    const db = getUserDatabase();
    
    // Try to find profile with this sync code
    const existingProfile = await db.getProfileBySyncCode(syncCode);
    
    if (existingProfile) {
      // Update session to use this profile
      const session = await db.createSession(existingProfile.id);
      
      this.state = {
        isAuthenticated: true,
        isGuest: existingProfile.isGuest,
        profile: existingProfile,
        session,
        lastActiveAt: Date.now(),
      };
      
      this.emit('login', existingProfile);
      return true;
    }
    
    return false;
  }

  async generateNewSyncCode(): Promise<string> {
    const newCode = generateSyncCode();
    await this.updateProfile({ syncCode: newCode });
    return newCode;
  }

  // ==================== AUTH STATE ====================

  getAuthState(): AuthState {
    return { ...this.state };
  }

  isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  isGuest(): boolean {
    return this.state.isGuest;
  }

  getProfile(): ExtendedPlayerProfile | null {
    return this.state.profile;
  }

  getProfileId(): string | null {
    return this.state.profile?.id || null;
  }

  // ==================== SESSION MANAGEMENT ====================

  async refreshSession(): Promise<void> {
    if (!this.state.session) return;
    
    const db = getUserDatabase();
    await db.updateSessionActivity(this.state.session.id);
    this.state.lastActiveAt = Date.now();
  }

  // ==================== HIGHSCORE INTEGRATION ====================

  async recordHighscore(params: {
    songId: string;
    songTitle: string;
    artist: string;
    score: number;
    accuracy: number;
    maxCombo: number;
    difficulty: string;
    gameMode: string;
  }): Promise<void> {
    if (!this.state.profile) return;
    
    const db = getUserDatabase();
    await db.addHighscore({
      playerId: this.state.profile.id,
      playerName: this.state.profile.name,
      playerAvatar: this.state.profile.avatar,
      playerColor: this.state.profile.color,
      songId: params.songId,
      songTitle: params.songTitle,
      artist: params.artist,
      score: params.score,
      accuracy: params.accuracy,
      maxCombo: params.maxCombo,
      difficulty: params.difficulty as 'easy' | 'medium' | 'hard',
      gameMode: params.gameMode as 'standard' | 'pass-the-mic' | 'companion-singalong' | 'medley' | 'missing-words' | 'duel' | 'blind' | 'tournament' | 'battle-royale' | 'duet',
      rating: params.accuracy >= 95 ? 'perfect' : params.accuracy >= 85 ? 'excellent' : params.accuracy >= 70 ? 'good' : params.accuracy >= 50 ? 'okay' : 'poor',
    });
    
    // Update profile stats
    await this.updateProfile({
      totalScore: (this.state.profile.totalScore || 0) + params.score,
      gamesPlayed: (this.state.profile.gamesPlayed || 0) + 1,
    });
  }

  async getPlayerHighscores(songId?: string, limit: number = 10): Promise<unknown[]> {
    if (!this.state.profile) return [];
    
    const db = getUserDatabase();
    return db.getHighscores({
      playerId: this.state.profile.id,
      songId,
      limit,
    });
  }

  async getPlayerBestScore(songId: string): Promise<unknown | null> {
    if (!this.state.profile) return null;
    
    const db = getUserDatabase();
    return db.getPlayerBestScore(this.state.profile.id, songId);
  }

  // ==================== DATA EXPORT/IMPORT ====================

  async exportUserData(): Promise<string> {
    const db = getUserDatabase();
    const data = await db.exportData();
    return JSON.stringify(data, null, 2);
  }

  async importUserData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      const db = getUserDatabase();
      await db.importData(data);
      
      // Reload current profile
      if (this.state.profile) {
        const profile = await db.getProfile(this.state.profile.id);
        if (profile) {
          this.state.profile = profile;
        }
      }
      
      this.emit('profile-update', this.state.profile);
      return true;
    } catch (error) {
      console.error('[Auth] Import failed:', error);
      return false;
    }
  }

  // ==================== EVENTS ====================

  subscribe(callback: AuthEventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emit(event: AuthEventType, data?: unknown): void {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('[Auth] Event listener error:', error);
      }
    });
  }

  // ==================== UTILITY ====================

  async logout(): Promise<void> {
    this.state = {
      isAuthenticated: false,
      isGuest: true,
      profile: null,
      session: null,
      lastActiveAt: 0,
    };
    
    // Create new guest profile
    await this.createGuestProfile();
    this.emit('logout');
  }

  async clearAllData(): Promise<void> {
    const db = getUserDatabase();
    await db.clearAllData();
    await this.createGuestProfile();
    this.emit('logout');
  }
}

// Singleton instance
let authInstance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authInstance) {
    authInstance = new AuthService();
  }
  return authInstance;
}

export const authService = {
  get instance(): AuthService {
    return getAuthService();
  }
};

// Convenience exports
export { generateRoomCode, generateSyncCode };
