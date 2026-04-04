'use client';

import { Difficulty, GameMode, Song } from '@/types/game';
import { Playlist } from '@/lib/playlist-manager';

export type LibraryViewMode = 'grid' | 'folder' | 'playlists';
export type LibraryGroupBy = 'none' | 'artist' | 'title' | 'genre' | 'language' | 'folder';

export interface LibrarySettings {
  sortBy: 'title' | 'artist' | 'difficulty' | 'rating' | 'dateAdded';
  sortOrder: 'asc' | 'desc';
  filterDifficulty: Difficulty | 'all';
  filterGenre: string;
  filterLanguage: string;
  filterDuet: boolean;
}

export interface StartOptions {
  difficulty: Difficulty;
  mode: 'single' | 'duel' | 'duet' | GameMode;
  players: string[];
  partyMode?: GameMode;
}

export interface SongCardProps {
  song: Song;
  previewSong: Song | null;
  onSongClick: (song: Song) => void;
  onPreviewStart: (song: Song) => void;
  onPreviewStop: () => void;
  previewVideoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>;
}

export interface SongStartModalProps {
  selectedSong: Song;
  startOptions: StartOptions;
  setStartOptions: React.Dispatch<React.SetStateAction<StartOptions>>;
  favoriteSongIds: Set<string>;
  activeProfileId: string | null;
  playerQueueCount: number;
  showSongModal: boolean;
  setShowSongModal: (open: boolean) => void;
  setShowHighscoreModal: (open: boolean) => void;
  setHighscoreSong: (song: Song | null) => void;
  addToQueue: (song: Song, playerId: string, playerName: string) => void;
  toggleFavorite: (songId: string) => boolean;
  setPlaylists: (playlists: Playlist[]) => void;
  getPlaylists: () => Playlist[];
  setShowAddToPlaylistModal: (open: boolean) => void;
  setSongToAddToPlaylist: (song: Song | null) => void;
  onStartGame: () => void;
  profiles: { id: string; name: string; color: string; avatar?: string; isActive?: boolean }[];
  highscores: { songId: string; score: number; accuracy: number }[];
}
