// IndexedDB storage for media files (audio, video, cover, txt)
// This allows persistent storage of imported song media
// IMPORTANT: TXT files are stored here to avoid bloating localStorage with lyrics data

const DB_NAME = 'karaoke-successor-media';
const DB_VERSION = 2; // Bumped for txt support
const STORE_NAME = 'media';

export interface MediaRecord {
  id: string; // songId + type (e.g., "song-123-audio")
  songId: string;
  type: 'audio' | 'video' | 'cover' | 'txt';
  data: Blob;
  createdAt: number;
}

let dbInstance: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;

// Initialize the database (with concurrency lock to prevent double-open)
export async function initMediaDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  
  if (!initPromise) {
    initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        console.error('[MediaDB] Failed to open database:', request.error);
        initPromise = null;
        reject(request.error);
      };
      
      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('songId', 'songId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }
  
  return initPromise;
}

// Store media blob
// IMPORTANT: Always converts File/Blob to a new Blob to ensure data persistence
// In Tauri/WebView, File objects may be filesystem references
export async function storeMedia(
  songId: string,
  type: 'audio' | 'video' | 'cover' | 'txt',
  data: Blob
): Promise<void> {
  if (data.size === 0) return;

  // CRITICAL: Read the ArrayBuffer BEFORE opening the IndexedDB transaction.
  // IndexedDB transactions auto-commit when the microtask queue is empty.
  // If we await inside the transaction scope (e.g. data.arrayBuffer()), the
  // engine may commit the transaction before store.put() runs, causing silent
  // data loss.
  let blobToStore: Blob;
  // IMPORTANT: Always materialize to a new Blob in Tauri/WebView.
  // File objects may be filesystem references that become dead references
  // after the user navigates away or the file handle is garbage-collected.
  const arrayBuffer = await data.arrayBuffer();
  blobToStore = new Blob([arrayBuffer], { type: data.type || (type === 'txt' ? 'text/plain' : 'application/octet-stream') });

  const db = await initMediaDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const record: MediaRecord = {
      id: `${songId}-${type}`,
      songId,
      type,
      data: blobToStore,
      createdAt: Date.now()
    };

    const request = store.put(record);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      console.error('[MediaDB] Failed to store', type, ':', request.error);
      reject(request.error);
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

// Get media blob
export async function getMedia(
  songId: string, 
  type: 'audio' | 'video' | 'cover' | 'txt'
): Promise<Blob | null> {
  const db = await initMediaDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(`${songId}-${type}`);
    
    request.onsuccess = () => {
      if (request.result) {
        const blob = request.result.data;
        if (blob.size === 0) {
          console.warn('[MediaDB] Retrieved blob is empty for', type);
        }
        resolve(blob);
      } else {
        console.warn('[MediaDB] No', type, 'found for song', songId);
        resolve(null);
      }
    };
    
    request.onerror = () => {
      console.error('[MediaDB] Failed to get', type, ':', request.error);
      reject(request.error);
    };
  });
}

// Get all media URLs for a song
export async function getSongMediaUrls(songId: string): Promise<{
  audioUrl?: string;
  videoUrl?: string;
  coverUrl?: string;
  txtUrl?: string;
}> {
  const [audio, video, cover, txt] = await Promise.all([
    getMedia(songId, 'audio'),
    getMedia(songId, 'video'),
    getMedia(songId, 'cover'),
    getMedia(songId, 'txt')
  ]);
  
  return {
    audioUrl: audio && audio.size > 0 ? URL.createObjectURL(audio) : undefined,
    videoUrl: video && video.size > 0 ? URL.createObjectURL(video) : undefined,
    coverUrl: cover && cover.size > 0 ? URL.createObjectURL(cover) : undefined,
    txtUrl: txt && txt.size > 0 ? URL.createObjectURL(txt) : undefined
  };
}

// Revoke blob URLs created by getSongMediaUrls to prevent memory leaks.
// Safe to call even if the URLs were already revoked or weren't blob: URLs.
export function revokeSongMediaUrls(urls: {
  audioUrl?: string;
  videoUrl?: string;
  coverUrl?: string;
  txtUrl?: string;
}): void {
  for (const url of [urls.audioUrl, urls.videoUrl, urls.coverUrl, urls.txtUrl]) {
    if (url?.startsWith('blob:')) {
      try { URL.revokeObjectURL(url); } catch {}
    }
  }
}

// Get TXT file content as text
export async function getTxtContent(songId: string): Promise<string | null> {
  const blob = await getMedia(songId, 'txt');
  if (!blob || blob.size === 0) return null;
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

// Delete all media for a song
export async function deleteSongMedia(songId: string): Promise<void> {
  const db = await initMediaDB();
  
  const types: ('audio' | 'video' | 'cover' | 'txt')[] = ['audio', 'video', 'cover', 'txt'];
  
  for (const type of types) {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(`${songId}-${type}`);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Check if media exists for a song (internal utility)
async function hasMedia(
  songId: string, 
  type: 'audio' | 'video' | 'cover' | 'txt'
): Promise<boolean> {
  const media = await getMedia(songId, type);
  return media !== null;
}

// Clear all media (for debugging — not exported, call via dev console if needed)
async function clearAllMedia(): Promise<void> {
  const db = await initMediaDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
