// IndexedDB-based persistent storage for songs and media files
// This ensures songs persist across app restarts

const DB_NAME = 'karaoke-successor-db';
const DB_VERSION = 1;
const SONGS_STORE = 'songs';
const MEDIA_STORE = 'media';

export interface StoredSong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  duration: number;
  bpm: number;
  difficulty: 'easy' | 'medium' | 'hard';
  rating: number;
  gap: number;
  start?: number;
  videoGap?: number;
  lyrics: any[]; // LyricLine[]
  preview?: {
    startTime: number;
    duration: number;
  };
  dateAdded: number;
  // References to stored media
  audioMediaId?: string;
  videoMediaId?: string;
  coverMediaId?: string;
  hasEmbeddedAudio?: boolean;
}

export interface StoredMedia {
  id: string;
  type: 'audio' | 'video' | 'cover';
  mimeType: string;
  data: Blob; // The actual file data
  name: string;
}

let dbInstance: IDBDatabase | null = null;

// Initialize the database
export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create songs store
      if (!db.objectStoreNames.contains(SONGS_STORE)) {
        db.createObjectStore(SONGS_STORE, { keyPath: 'id' });
      }
      
      // Create media store
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
      }
    };
  });
}

// Store a media file
export async function storeMedia(file: File, type: 'audio' | 'video' | 'cover'): Promise<string> {
  const db = await initDB();
  const id = `media-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const media: StoredMedia = {
    id,
    type,
    mimeType: file.type || 'application/octet-stream',
    data: file,
    name: file.name,
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MEDIA_STORE, 'readwrite');
    const store = transaction.objectStore(MEDIA_STORE);
    const request = store.add(media);
    
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

// Retrieve a media file and create a playable URL
export async function getMediaUrl(mediaId: string): Promise<string | null> {
  if (!mediaId) return null;
  
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MEDIA_STORE, 'readonly');
    const store = transaction.objectStore(MEDIA_STORE);
    const request = store.get(mediaId);
    
    request.onsuccess = () => {
      if (request.result) {
        const media = request.result as StoredMedia;
        // Create a blob URL from the stored data
        const url = URL.createObjectURL(media.data);
        resolve(url);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Store a complete song with media
export async function storeSong(song: StoredSong): Promise<void> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SONGS_STORE, 'readwrite');
    const store = transaction.objectStore(SONGS_STORE);
    const request = store.put(song);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get all stored songs (without media URLs - call restoreSongMediaUrls for that)
export async function getAllStoredSongs(): Promise<StoredSong[]> {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SONGS_STORE, 'readonly');
    const store = transaction.objectStore(SONGS_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Delete a song and its associated media
export async function deleteSong(songId: string): Promise<void> {
  const db = await initDB();
  
  // First get the song to find associated media
  const song = await new Promise<StoredSong | null>((resolve, reject) => {
    const transaction = db.transaction(SONGS_STORE, 'readonly');
    const store = transaction.objectStore(SONGS_STORE);
    const request = store.get(songId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  
  if (song) {
    // Delete associated media
    const mediaIds = [song.audioMediaId, song.videoMediaId, song.coverMediaId].filter(Boolean);
    
    for (const mediaId of mediaIds) {
      if (mediaId) {
        try {
          await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(MEDIA_STORE, 'readwrite');
            const store = transaction.objectStore(MEDIA_STORE);
            const request = store.delete(mediaId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        } catch (e) {
          console.warn('Failed to delete media:', mediaId, e);
        }
      }
    }
    
    // Delete the song
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SONGS_STORE, 'readwrite');
      const store = transaction.objectStore(SONGS_STORE);
      const request = store.delete(songId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Clear all stored data
export async function clearAllData(): Promise<void> {
  const db = await initDB();
  
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SONGS_STORE, 'readwrite');
    const store = transaction.objectStore(SONGS_STORE);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(MEDIA_STORE, 'readwrite');
    const store = transaction.objectStore(MEDIA_STORE);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Check if IndexedDB is available
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}
