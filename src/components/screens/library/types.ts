'use client';

import { Difficulty, GameMode, Song } from '@/types/game';
import { Playlist } from '@/lib/playlist-manager';
import type { ViralMatchInfo } from '@/hooks/use-viral-charts';

export type LibraryViewMode = 'grid' | 'folder' | 'playlists';
export type LibraryGroupBy = 'none' | 'artist' | 'title' | 'genre' | 'language' | 'folder';

export interface LibrarySettings {
  sortBy: 'title' | 'artist' | 'difficulty' | 'rating' | 'dateAdded';
  sortOrder: 'asc' | 'desc';
  filterDifficulty: Difficulty | 'all';
  filterGenre: string;
  filterLanguage: string;
  filterDuet: boolean;
  filterViral: boolean;
}

export interface StartOptions {
  difficulty: Difficulty;
  mode: 'single' | 'duel' | 'duet' | GameMode;
  players: string[];
  partyMode?: GameMode;
  /** Assigned microphone ID for the selected player (Single mode) */
  micId?: string;
  /** Assigned microphone ID for Player 1 (Duel/Duet mode) */
  micIdP1?: string;
  /** Assigned microphone ID for Player 2 (Duel/Duet mode) */
  micIdP2?: string;
}

export interface SongCardProps {
  song: Song;
  previewSong: Song | null;
  onSongClick: (_song: Song) => void;
  onPreviewStart: (_song: Song) => void;
  onPreviewStop: () => void;
  previewVideoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  /** Audio element currently playing preview — used for waveform visualization */
  previewAudio?: HTMLAudioElement | null;
  /** Whether this song is matched as a viral/trending hit */
  isViralHit?: boolean;
  /** Detailed viral chart match info (chart position, source, country) — best match first */
  viralChartInfo?: ViralMatchInfo[] | null;
}

export interface SongStartModalProps {
  selectedSong: Song;
  startOptions: StartOptions;
  setStartOptions: React.Dispatch<React.SetStateAction<StartOptions>>;
  favoriteSongIds: Set<string>;
  activeProfileId: string | null;
  playerQueueCount: number;
  showSongModal: boolean;
  setShowSongModal: (_open: boolean) => void;
  setShowHighscoreModal: (_open: boolean) => void;
  setHighscoreSong: (_song: Song | null) => void;
  addToQueue: (_song: Song, _playerId: string, _playerName: string, options?: {
    partnerId?: string;
    partnerName?: string;
    gameMode?: 'single' | 'duel' | 'duet';
  }) => void;
  toggleFavorite: (_songId: string) => boolean;
  setPlaylists: (_playlists: Playlist[]) => void;
  getPlaylists: () => Playlist[];
  setShowAddToPlaylistModal: (_open: boolean) => void;
  setSongToAddToPlaylist: (_song: Song | null) => void;
  onStartGame: () => void;
  profiles: { id: string; name: string; color: string; avatar?: string; isActive?: boolean }[];
  highscores: { songId: string; score: number; accuracy: number }[];
}
