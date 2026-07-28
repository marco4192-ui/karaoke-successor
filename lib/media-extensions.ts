/**
 * Shared media file extension constants.
 * Used by folder-scanner.ts (browser) and tauri-file-storage.ts (Tauri native).
 */

export const AUDIO_EXTENSIONS: readonly string[] = [
  '.mp3', '.ogg', '.wav', '.m4a', '.flac',
  '.aac', '.wma', '.opus', '.weba', '.aiff', '.aif',
];

export const VIDEO_EXTENSIONS: readonly string[] = [
  '.mp4', '.webm', '.mkv', '.avi', '.mov',
  '.wmv', '.flv', '.m4v', '.3gp', '.ogv', '.ts',
];

export const TXT_EXTENSIONS: readonly string[] = ['.txt'];

export const COVER_EXTENSIONS: readonly string[] = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
];

export const BACKGROUND_EXTENSIONS = COVER_EXTENSIONS;
