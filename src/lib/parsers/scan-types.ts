// Folder Scanner - Types, interfaces, and constants
// Shared by all folder-scanner sub-modules

import { CachedFolder } from '@/lib/game/library-cache';

export interface ScannedSong {
  title: string;
  artist: string;
  audioFile?: File;
  videoFile?: File;
  txtFile?: File;
  coverFile?: File;
  backgroundFile?: File;
  audioUrl?: string;
  videoUrl?: string;
  coverUrl?: string;
  backgroundUrl?: string;
  folder: string;
  folderPath: string;
  baseFolder?: string; // CRITICAL: Root folder for media loading
  previewStart?: number;
  previewDuration?: number;
  genre?: string;
  language?: string;
  year?: number;
}

export interface ScanResult {
  songs: ScannedSong[];
  folders: CachedFolder[];
  errors: string[];
}

// Cover file name patterns (in order of priority)
export const COVER_PATTERNS = [
  /^cover/i,
  /^folder/i,
  /^front/i,
  /^album/i,
  /^\[co\]/i, // UltraStar cover tag pattern
];

// Background file name patterns (in order of priority)
export const BACKGROUND_PATTERNS = [
  /^background/i,
  /^bg/i,
  /^back/i,
  /^\[bg\]/i, // UltraStar background tag pattern
];


