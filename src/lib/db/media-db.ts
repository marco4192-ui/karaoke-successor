// IndexedDB storage for media files (audio, video, cover)
// This allows persistent storage of imported song media

const DB_NAME = 'karaoke-successor-media';
const DB_VERSION = 1;
const STORE_NAME = 'media';

export interface MediaRecord {
  id: string; // songId + type (e.g., "song-123-audio")
  songId: string;
  type: 'audio' | 'video' | 'cover';
  data: Blob;
  createdAt: number;
}

let dbInstance: IDBDatabase | null = null;

// Initialize the database
export async function initMediaDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('[MediaDB] Failed to open database:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('[MediaDB] Database opened successfully');
      resolve(dbInstance);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('songId', 'songId', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        console.log('[MediaDB] Object store created');
      }
    };
  });
}

// Store media blob
export async function storeMedia(
  songId: string, 
  type: 'audio' | 'video' | 'cover', 
  data: Blob
): Promise<void> {
  console.log(`[MediaDB] Storing ${type} for song ${songId}:`, {
    size: data.size,
    type: data.type
  });
  
  if (data.size === 0) {
    console.warn(`[MediaDB] Warning: Attempting to store empty blob for ${type}`);
  }
  
  const db = await initMediaDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const record: MediaRecord = {
      id: `${songId}-${type}`,
      songId,
      type,
      data,
      createdAt: Date.now()
    };
    
    const request = store.put(record);
    
    request.onsuccess = () => {
      console.log(`[MediaDB] Successfully stored ${type} for song ${songId}`);
      resolve();
    };
    
    request.onerror = () => {
      console.error(`[MediaDB] Failed to store ${type}:`, request.error);
      reject(request.error);
    };
  });
}

// Get media blob
export async function getMedia(
  songId: string, 
  type: 'audio' | 'video' | 'cover'
): Promise<Blob | null> {
  const db = await initMediaDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(`${songId}-${type}`);
    
    request.onsuccess = () => {
      if (request.result) {
        const blob = request.result.data;
        console.log(`[MediaDB] Retrieved ${type} for song ${songId}:`, {
          size: blob.size,
          type: blob.type,
          lastModified: request.result.createdAt
        });
        if (blob.size === 0) {
          console.warn(`[MediaDB] Warning: Retrieved blob is empty for ${type}`);
        }
        resolve(blob);
      } else {
        console.log(`[MediaDB] No ${type} found for song ${songId}`);
        resolve(null);
      }
    };
    
    request.onerror = () => {
      console.error(`[MediaDB] Failed to get ${type}:`, request.error);
      reject(request.error);
    };
  });
}

// Get all media URLs for a song
export async function getSongMediaUrls(songId: string): Promise<{
  audioUrl?: string;
  videoUrl?: string;
  coverUrl?: string;
}> {
  console.log(`[MediaDB] Getting media URLs for song ${songId}`);
  const [audio, video, cover] = await Promise.all([
    getMedia(songId, 'audio'),
    getMedia(songId, 'video'),
    getMedia(songId, 'cover')
  ]);
  
  const result = {
    audioUrl: audio && audio.size > 0 ? URL.createObjectURL(audio) : undefined,
    videoUrl: video && video.size > 0 ? URL.createObjectURL(video) : undefined,
    coverUrl: cover && cover.size > 0 ? URL.createObjectURL(cover) : undefined
  };
  
  console.log(`[MediaDB] Created media URLs for song ${songId}:`, {
    audioUrl: result.audioUrl ? `${result.audioUrl.substring(0, 30)}... (audio size: ${audio?.size})` : null,
    videoUrl: result.videoUrl ? `${result.videoUrl.substring(0, 30)}... (video size: ${video?.size})` : null,
    coverUrl: result.coverUrl ? `${result.coverUrl.substring(0, 30)}... (cover size: ${cover?.size})` : null
  });
  
  return result;
}

// Delete all media for a song
export async function deleteSongMedia(songId: string): Promise<void> {
  const db = await initMediaDB();
  
  const types: ('audio' | 'video' | 'cover')[] = ['audio', 'video', 'cover'];
  
  for (const type of types) {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(`${songId}-${type}`);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  console.log(`[MediaDB] Deleted all media for song ${songId}`);
}

// Check if media exists for a song
export async function hasMedia(
  songId: string, 
  type: 'audio' | 'video' | 'cover'
): Promise<boolean> {
  const media = await getMedia(songId, type);
  return media !== null;
}

// Clear all media (for debugging)
export async function clearAllMedia(): Promise<void> {
  const db = await initMediaDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onsuccess = () => {
      console.log('[MediaDB] All media cleared');
      resolve();
    };
    
    request.onerror = () => reject(request.error);
  });
}
