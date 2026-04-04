import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Song,
  Player,
  PlayerProfile,
  Difficulty,
  GameMode,
  GameState,
  GameResult,
  QueueItem,
  PLAYER_COLORS,
  HighscoreEntry,
  getRankTitle,
} from '@/types/game';

interface GameStore {
  // Game state
  gameState: GameState;

  // Persisted difficulty (separate from gameState for storage)
  persistedDifficulty?: Difficulty;

  // Player profiles
  profiles: PlayerProfile[];
  activeProfileId: string | null;

  // Queue
  queue: QueueItem[];

  // Highscores
  highscores: HighscoreEntry[];

  // Leaderboard settings
  leaderboardType: 'local' | 'global';
  onlineEnabled: boolean;

  // Actions
  setSong: (song: Song | null) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setGameMode: (mode: GameMode) => void;
  addPlayer: (profile: Pick<PlayerProfile, 'id' | 'name' | 'avatar' | 'color'>) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  setCurrentTime: (time: number) => void;
  setDetectedPitch: (pitch: number | null) => void;
  setMicActive: (active: boolean) => void;
  setBlindSection: (isBlind: boolean) => void;
  setMissingWordsIndices: (indices: number[]) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;

  // Profile actions
  createProfile: (name: string, avatar?: string) => PlayerProfile;
  updateProfile: (id: string, updates: Partial<PlayerProfile>) => void;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;
  importProfileFromMobile: (mobileProfile: { id: string; name: string; avatar?: string; color: string }) => PlayerProfile;

  // Queue actions
  addToQueue: (song: Song, playerId: string, playerName: string, options?: {
    partnerId?: string;
    partnerName?: string;
    gameMode?: 'single' | 'duel' | 'duet';
  }) => void;
  addCompanionToQueue: (item: Omit<QueueItem, 'id' | 'addedAt'>) => void;
  removeFromQueue: (itemId: string) => void;
  markQueueItemPlaying: (itemId: string) => void;
  markQueueItemCompleted: (itemId: string) => void;
  getNextQueueItem: () => QueueItem | null;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;

  // Results
  setResults: (results: GameResult) => void;

  // Highscore actions
  addHighscore: (entry: Omit<HighscoreEntry, 'id' | 'playedAt' | 'rankTitle'>) => HighscoreEntry;
  getHighscores: (songId?: string, playerId?: string, limit?: number) => HighscoreEntry[];
  getTopHighscores: (limit?: number) => HighscoreEntry[];
  getPlayerBestScore: (playerId: string, songId: string) => HighscoreEntry | null;
  clearHighscores: () => void;

  // Leaderboard actions
  setLeaderboardType: (type: 'local' | 'global') => void;
  setOnlineEnabled: (enabled: boolean) => void;
}

const initialGameState: GameState = {
  status: 'idle',
  currentSong: null,
  players: [],
  difficulty: 'medium',
  gameMode: 'standard',
  currentTime: 0,
  isMicActive: false,
  detectedPitch: null,
  isBlindSection: false,
  missingWordsIndices: [],
  currentLineIndex: 0,
  results: null,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      gameState: initialGameState,
      profiles: [],
      activeProfileId: null,
      queue: [],
      highscores: [],
      leaderboardType: 'local',
      onlineEnabled: false,

      setSong: (song) =>
        set((state) => ({
          gameState: { ...state.gameState, currentSong: song, currentTime: 0 },
        })),

      setDifficulty: (difficulty) =>
        set((state) => ({
          gameState: { ...state.gameState, difficulty },
        })),

      setGameMode: (mode) =>
        set((state) => ({
          gameState: { ...state.gameState, gameMode: mode },
        })),

      addPlayer: (profile) =>
        set((state) => ({
          gameState: {
            ...state.gameState,
            players: [
              ...state.gameState.players,
              {
                id: profile.id,
                name: profile.name,
                avatar: profile.avatar,
                color: profile.color,
                score: 0,
                combo: 0,
                maxCombo: 0,
                notesHit: 0,
                notesMissed: 0,
                accuracy: 0,
              },
            ],
          },
        })),

      removePlayer: (playerId) =>
        set((state) => ({
          gameState: {
            ...state.gameState,
            players: state.gameState.players.filter((p) => p.id !== playerId),
          },
        })),

      updatePlayer: (playerId, updates) =>
        set((state) => ({
          gameState: {
            ...state.gameState,
            players: state.gameState.players.map((p) =>
              p.id === playerId ? { ...p, ...updates } : p
            ),
          },
        })),

      setCurrentTime: (time) =>
        set((state) => ({
          gameState: { ...state.gameState, currentTime: time },
        })),

      setDetectedPitch: (pitch) =>
        set((state) => ({
          gameState: { ...state.gameState, detectedPitch: pitch },
        })),

      setMicActive: (active) =>
        set((state) => ({
          gameState: { ...state.gameState, isMicActive: active },
        })),

      setBlindSection: (isBlind) =>
        set((state) => ({
          gameState: { ...state.gameState, isBlindSection: isBlind },
        })),

      setMissingWordsIndices: (indices) =>
        set((state) => ({
          gameState: { ...state.gameState, missingWordsIndices: indices },
        })),

      startGame: () =>
        set((state) => ({
          gameState: {
            ...state.gameState,
            status: 'countdown',
            currentTime: 0,
          },
        })),

      pauseGame: () =>
        set((state) => ({
          gameState: { ...state.gameState, status: 'paused' },
        })),

      resumeGame: () =>
        set((state) => ({
          gameState: { ...state.gameState, status: 'playing' },
        })),

      endGame: () =>
        set((state) => ({
          gameState: { ...state.gameState, status: 'ended' },
        })),

      resetGame: () =>
        set((state) => ({
          gameState: {
            ...initialGameState,
            players: state.gameState.players.map((p) => ({
              ...p,
              score: 0,
              combo: 0,
              maxCombo: 0,
              notesHit: 0,
              notesMissed: 0,
              accuracy: 0,
            })),
          },
        })),

      createProfile: (name, avatar) => {
        const profile: PlayerProfile = {
          id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          name,
          avatar,
          color: PLAYER_COLORS[get().profiles.length % PLAYER_COLORS.length],
          totalScore: 0,
          gamesPlayed: 0,
          songsCompleted: 0,
          achievements: [],
          stats: {
            totalNotesHit: 0,
            totalNotesMissed: 0,
            bestCombo: 0,
            perfectStreaks: 0,
            goldenNotesHit: 0,
            averageAccuracy: 0,
            // Extended stats
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
          },
          createdAt: Date.now(),
          xp: 0,
          level: 1,
          isActive: true, // Profiles are active by default
        };

        set((state) => ({
          profiles: [...state.profiles, profile],
        }));

        return profile;
      },

      updateProfile: (id, updates) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      deleteProfile: (id) =>
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
          activeProfileId:
            state.activeProfileId === id ? null : state.activeProfileId,
        })),

      setActiveProfile: (id) =>
        set({ activeProfileId: id }),

      importProfileFromMobile: (mobileProfile) => {
        const { profiles } = get();
        
        // Check if profile with this ID already exists
        const existingProfile = profiles.find(p => p.id === mobileProfile.id);
        if (existingProfile) {
          // Update existing profile with mobile data
          set((state) => ({
            profiles: state.profiles.map(p => 
              p.id === mobileProfile.id 
                ? { 
                    ...p, 
                    name: mobileProfile.name,
                    avatar: mobileProfile.avatar || p.avatar,
                    color: mobileProfile.color,
                    isActive: true,
                  }
                : p
            ),
          }));
          return existingProfile;
        }
        
        // Check if profile with same name exists (avoid duplicates)
        const duplicateName = profiles.find(p => p.name.toLowerCase() === mobileProfile.name.toLowerCase());
        if (duplicateName) {
          // Update the existing profile's mobile ID reference
          set((state) => ({
            profiles: state.profiles.map(p => 
              p.id === duplicateName.id 
                ? { 
                    ...p, 
                    avatar: mobileProfile.avatar || p.avatar,
                    color: mobileProfile.color,
                    isActive: true,
                  }
                : p
            ),
          }));
          return duplicateName;
        }
        
        // Create new profile from mobile data
        const newProfile: PlayerProfile = {
          id: mobileProfile.id,
          name: mobileProfile.name,
          avatar: mobileProfile.avatar,
          color: mobileProfile.color,
          totalScore: 0,
          gamesPlayed: 0,
          songsCompleted: 0,
          achievements: [],
          stats: {
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
          },
          createdAt: Date.now(),
          xp: 0,
          level: 1,
          isActive: true,
          // Rank display options
          showRankInName: false,
          rankDisplayStyle: 'suffix',
        };
        
        set((state) => ({
          profiles: [...state.profiles, newProfile],
        }));
        
        return newProfile;
      },

      addToQueue: (song, playerId, playerName, options) => {
        const currentQueue = get().queue;
        const playerQueueCount = currentQueue.filter(
          (item) => item.playerId === playerId || item.partnerId === playerId
        ).length;

        // Max 3 songs per player (as main or partner)
        if (playerQueueCount >= 3) return;

        const item: QueueItem = {
          id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          song,
          playerId,
          playerName,
          addedAt: Date.now(),
          partnerId: options?.partnerId,
          partnerName: options?.partnerName,
          gameMode: options?.gameMode || 'single',
          status: 'pending',
        };

        set((state) => ({
          queue: [...state.queue, item],
        }));
      },

      addCompanionToQueue: (queueItemData) => {
        const currentQueue = get().queue;
        
        // Check max 3 songs per companion
        const companionQueueCount = currentQueue.filter(
          (item) => item.companionCode === queueItemData.companionCode
        ).length;
        
        if (companionQueueCount >= 3) return;

        const item: QueueItem = {
          id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          ...queueItemData,
          addedAt: Date.now(),
          status: 'pending',
          isFromCompanion: true,
        };

        set((state) => ({
          queue: [...state.queue, item],
        }));
      },

      removeFromQueue: (itemId) =>
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== itemId),
        })),

      markQueueItemPlaying: (itemId) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === itemId ? { ...item, status: 'playing' as const } : item
          ),
        })),

      markQueueItemCompleted: (itemId) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === itemId ? { ...item, status: 'completed' as const } : item
          ),
        })),

      getNextQueueItem: () => {
        const { queue } = get();
        return queue.find((item) => item.status === 'pending') || null;
      },

      reorderQueue: (fromIndex, toIndex) =>
        set((state) => {
          const len = state.queue.length;
          // Bounds validation
          if (fromIndex < 0 || fromIndex >= len || toIndex < 0 || toIndex >= len) {
            return state; // No change if indices are invalid
          }
          const newQueue = [...state.queue];
          const [removed] = newQueue.splice(fromIndex, 1);
          newQueue.splice(toIndex, 0, removed);
          return { queue: newQueue };
        }),

      clearQueue: () => set({ queue: [] }),

      setResults: (results) =>
        set((state) => ({
          gameState: { ...state.gameState, results },
        })),

      // Highscore actions
      addHighscore: (entryData) => {
        const rankInfo = getRankTitle(entryData.accuracy);
        const entry: HighscoreEntry = {
          ...entryData,
          id: `highscore-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          playedAt: Date.now(),
          rankTitle: rankInfo.title,
        };

        set((state) => {
          // Add new highscore and sort by score
          const newHighscores = [...state.highscores, entry]
            .sort((a, b) => b.score - a.score)
            .slice(0, 1000); // Keep top 1000 scores

          return { highscores: newHighscores };
        });

        return entry;
      },

      getHighscores: (songId?, playerId?, limit = 10) => {
        const { highscores } = get();
        let filtered = highscores;

        if (songId) {
          filtered = filtered.filter(h => h.songId === songId);
        }
        if (playerId) {
          filtered = filtered.filter(h => h.playerId === playerId);
        }

        return filtered.slice(0, limit);
      },

      getTopHighscores: (limit = 10) => {
        return get().highscores.slice(0, limit);
      },

      getPlayerBestScore: (playerId, songId) => {
        const { highscores } = get();
        const playerScores = highscores.filter(
          h => h.playerId === playerId && h.songId === songId
        );
        return playerScores.length > 0 ? playerScores[0] : null;
      },

      clearHighscores: () => set({ highscores: [] }),

      // Leaderboard actions
      setLeaderboardType: (type) => set({ leaderboardType: type }),
      setOnlineEnabled: (enabled) => set({ onlineEnabled: enabled }),
    }),
    {
      name: 'karaoke-successor-storage',
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        highscores: state.highscores,
        leaderboardType: state.leaderboardType,
        onlineEnabled: state.onlineEnabled,
        // Persist difficulty globally
        persistedDifficulty: state.gameState.difficulty,
      }),
      onRehydrateStorage: () => (state) => {
        // Restore difficulty on app start
        if (state?.persistedDifficulty) {
          // Use queueMicrotask to avoid setState during render
          queueMicrotask(() => {
            state.setDifficulty(state.persistedDifficulty as Difficulty);
          });
        }
      },
    }
  )
);

// Selectors
export const selectGameState = (state: GameStore) => state.gameState;
export const selectCurrentSong = (state: GameStore) => state.gameState.currentSong;
export const selectPlayers = (state: GameStore) => state.gameState.players;
export const selectDifficulty = (state: GameStore) => state.gameState.difficulty;
export const selectGameMode = (state: GameStore) => state.gameState.gameMode;
export const selectProfiles = (state: GameStore) => state.profiles;
export const selectActiveProfile = (state: GameStore) =>
  state.profiles.find((p) => p.id === state.activeProfileId) || null;
export const selectQueue = (state: GameStore) => state.queue;
export const selectHighscores = (state: GameStore) => state.highscores;
