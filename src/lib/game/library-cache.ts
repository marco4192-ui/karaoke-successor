// Library Cache System - Persistent storage for song library data
// Uses IndexedDB for browser persistence

import { Song } from '@/types/game';

export interface CachedSong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  duration: number;
  bpm: number;
  difficulty: string; // Default difficulty (user can change)
  rating: number;
  gap: number;
  coverImage?: string;
  videoBackground?: string;
  audioUrl?: string;
  hasEmbeddedAudio?: boolean;
  preview?: {
    startTime: number;
    duration: number;
  };
  folder: string;
  folderPath: string;
  dateAdded: number;
  lastPlayed?: number;
  playCount: number;
  // File references (not persisted, regenerated on scan)
  audioFileName?: string;
  videoFileName?: string;
  txtFileName?: string;
  coverFileName?: string;
}

export interface CachedFolder {
  name: string;
  path: string;
  parentPath?: string;
  isSongFolder: boolean; // true if contains song files, false if category folder
  songCount: number;
  coverImage?: string; // First song's cover as folder cover
}

export interface LibraryCache {
  version: number;
  lastScan: number;
  songs: CachedSong[];
  folders: CachedFolder[];
  rootFolders: string[]; // Top-level folder paths
}

const CACHE_VERSION = 1;
const DB_NAME = 'karaoke-successor-cache';
const STORE_NAME = 'library';

// Get IndexedDB instance
function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('[LibraryCache] IndexedDB not available'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, CACHE_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

// Save cache to IndexedDB
export async function saveCache(cache: LibraryCache): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.put({ key: 'library-cache', value: cache });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Load cache from IndexedDB
export async function loadCache(): Promise<LibraryCache | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.get('library-cache');
    
    request.onsuccess = () => {
      const result = request.result;
      if (result && result.value && result.value.version === CACHE_VERSION) {
        resolve(result.value);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Clear cache
export async function clearCache(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.delete('library-cache');
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Create a cached song from scanned data
export function createCachedSong(
  song: Song, 
  folder: string, 
  folderPath: string,
  fileNames: { audio?: string; video?: string; txt?: string; cover?: string }
): CachedSong {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    year: song.year,
    genre: song.genre,
    duration: song.duration,
    bpm: song.bpm,
    difficulty: song.difficulty,
    rating: song.rating,
    gap: song.gap,
    coverImage: song.coverImage,
    videoBackground: song.videoBackground,
    audioUrl: song.audioUrl,
    hasEmbeddedAudio: song.hasEmbeddedAudio,
    preview: song.preview,
    folder,
    folderPath,
    dateAdded: song.dateAdded || Date.now(),
    lastPlayed: song.lastPlayed,
    playCount: 0,
    audioFileName: fileNames.audio,
    videoFileName: fileNames.video,
    txtFileName: fileNames.txt,
    coverFileName: fileNames.cover,
  };
}
