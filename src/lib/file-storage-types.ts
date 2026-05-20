// File Storage Types - Type definitions for Tauri file storage
// Extracted from tauri-file-storage.ts

import { LyricLine } from '@/types/game';

// Scanned song from Tauri file system
export interface TauriScannedSong {
  title: string;
  artist: string;
  folderPath: string;
  baseFolder: string; // Absolute path to the songs root folder (critical for media loading)
  relativeTxtPath?: string;
  relativeAudioPath?: string;
  relativeVideoPath?: string;
  relativeCoverPath?: string;
  relativeBackgroundPath?: string;
  bpm: number;
  gap: number;
  genre?: string;
  language?: string;
  year?: number;
  previewStart?: number;
  previewDuration?: number;
  // Parsed lyrics (notes data)
  lyrics?: LyricLine[];
  // Additional metadata from TXT headers
  creator?: string;
  version?: string;
  edition?: string;
  tags?: string;
  // Time control
  start?: number; // #START: skip beginning (ms)
  end?: number; // #END: early end (ms)
  videoGap?: number; // #VIDEOGAP: video sync offset (ms)
  videoStart?: number; // #VIDEOSTART: fixed video start (ms)
  // Medley
  medleyStartBeat?: number;
  medleyEndBeat?: number;
  // Duet
  isDuet?: boolean;
  duetPlayerNames?: [string, string];
  // Raw TXT metadata file references (for editor display)
  mp3File?: string;        // #MP3: raw value from TXT
  coverFile?: string;      // #COVER: raw value from TXT
  backgroundFile?: string; // #BACKGROUND: raw value from TXT
  videoFile?: string;      // #VIDEO: raw value from TXT (non-URL)
  // Media flags
  hasEmbeddedAudio?: boolean; // True if #MP3: points to a video file
}

export interface TauriScanResult {
  songs: TauriScannedSong[];
  errors: string[];
  scannedFiles: number;
}
