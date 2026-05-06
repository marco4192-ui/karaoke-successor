// Library Cache System - Persistent storage for song library data
// Uses IndexedDB for persistence (Tauri desktop app)

/**
 * Folder metadata for the library folder view.
 * Used by use-folder-scanner.ts and folder-scan-tab.tsx.
 */
export interface CachedFolder {
  name: string;
  path: string;
  parentPath?: string;
  isSongFolder: boolean; // true if contains song files, false if category folder
  songCount: number;
  coverImage?: string; // First song's cover as folder cover
}

const CACHE_VERSION = 1;
const DB_NAME = 'karaoke-successor-cache';
const STORE_NAME = 'library';

// Cached DB connection to avoid opening IndexedDB on every call
let cachedDB: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase> | null = null;

// Get IndexedDB instance — caches the connection for the app lifetime
function openDatabase(): Promise<IDBDatabase> {
  if (cachedDB) return Promise.resolve(cachedDB);
  if (dbOpenPromise) return dbOpenPromise;

  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('[LibraryCache] IndexedDB not available'));
  }

  dbOpenPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, CACHE_VERSION);

    request.onerror = () => {
      dbOpenPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      const db = request.result;
      cachedDB = db;
      dbOpenPromise = null;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });

  return dbOpenPromise;
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

