// Tauri File Storage - Barrel re-exports
// This module has been split into focused sub-modules:
//   file-storage-utils.ts     — Path normalization, sanitization, environment checks, constants
//   file-storage-types.ts     — Type interfaces (TauriScannedSong, TauriScanResult)
//   file-storage-scanner.ts   — Recursive song folder scanning and TXT parsing
//   file-storage-media.ts     — Media URL loading, blob URL caching
//   file-storage-writer.ts    — Writing song files to Tauri app data directory

// Utilities & constants
export {
  normalizeFilePath,
  isTauri,
  sanitizeFileName,
  isAbsoluteFileSystemPath,
  MIME_TYPES,
  COVER_PATTERNS,
} from '@/lib/file-storage-utils';

// Types
export type {
  TauriScannedSong,
  TauriScanResult,
} from '@/lib/file-storage-types';

// Song scanning
export { scanSongsFolderTauri } from '@/lib/file-storage-scanner';

// Media loading
export {
  getSongMediaUrl,
  clearBlobUrlCache,
} from '@/lib/file-storage-media';

// File writing
export {
  generateSongFolderName,
  storeSongFiles,
} from '@/lib/file-storage-writer';
