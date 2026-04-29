// IndexedDB storage for custom songs
// Solves localStorage overflow by storing song data in IndexedDB (virtually unlimited)
// Keeps only a lightweight ID index in localStorage for fast sync access

import { Song } from '@/types/game';

const DB_NAME = 'karaoke-successor-custom-songs';
const DB_VERSION = 1;
const STORE_NAME = 'songs';
const ID_INDEX_KEY = 'karaoke-custom-song-ids';

let dbInstance: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;

/** Open the custom songs IndexedDB. */
function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('[CustomSongsDB] IndexedDB not available'));
  }
  if (dbInstance) return Promise.resolve(dbInstance);
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[CustomSongsDB] Failed to open database:', request.error);
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
        store.createIndex('artist', 'artist', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
    };
  });

  return initPromise;
}

// ===================== CORE OPERATIONS =====================

/** Save all custom songs to IndexedDB and update the localStorage ID index. */
export async function saveCustomSongsToDB(songs: Song[]): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Clear existing data
    store.clear();

    // Write each song
    for (const song of songs) {
      store.put(song);
    }

    tx.oncomplete = () => {
      // Update the lightweight ID index in localStorage
      try {
        const ids = songs.map(s => s.id);
        localStorage.setItem(ID_INDEX_KEY, JSON.stringify(ids));
      } catch (e) {
        console.warn('[CustomSongsDB] Failed to update ID index:', e);
      }
      resolve();
    };

    tx.onerror = () => {
      console.error('[CustomSongsDB] Failed to save songs:', tx.error);
      reject(tx.error);
    };
  });
}

/** Load all custom songs from IndexedDB. */
export async function loadCustomSongsFromDB(): Promise<Song[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      console.error('[CustomSongsDB] Failed to load songs:', request.error);
      reject(request.error);
    };
  });
}

/** Check if a song exists in IndexedDB by ID. */
export async function hasSongInDB(songId: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getKey(songId);

    request.onsuccess = () => {
      resolve(request.result !== undefined);
    };

    request.onerror = () => reject(request.error);
  });
}

/** Get the count of custom songs stored. */
export async function getCustomSongCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).count();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => reject(request.error);
  });
}

/** Delete all custom songs from IndexedDB and clear the ID index. */
export async function clearCustomSongsFromDB(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    store.clear();

    tx.oncomplete = () => {
      try {
        localStorage.removeItem(ID_INDEX_KEY);
      } catch (e) {
        // Ignore
      }
      resolve();
    };

    tx.onerror = () => reject(tx.error);
  });
}

// ===================== MIGRATION =====================

/**
 * Migrate custom songs from localStorage to IndexedDB.
 * Called once on app startup if localStorage has songs but IndexedDB is empty.
 * Returns the migrated songs (or null if no migration needed).
 */
export async function migrateFromLocalStorage(
  localStorageSongs: Song[],
  localStorageKey: string
): Promise<Song[] | null> {
  if (localStorageSongs.length === 0) return null;

  try {
    // Check if IndexedDB already has data
    const count = await getCustomSongCount();
    if (count > 0) {
      return null;
    }

    await saveCustomSongsToDB(localStorageSongs);

    // NOTE: Do NOT remove from localStorage! getCustomSongs() is synchronous
    // and needs localStorage as a fallback when the in-memory cache is null
    // (e.g., after page reload). Both storages stay in sync.

    return localStorageSongs;
  } catch (e) {
    console.error('[CustomSongsDB] Migration failed:', e);
    return null;
  }
}
