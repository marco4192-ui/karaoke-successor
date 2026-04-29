'use client';

// IndexedDB storage for replay recordings (user's mic + webcam)
// Separate database from media-db to keep replay blobs isolated

const DB_NAME = 'karaoke-successor-replays';
const DB_VERSION = 1;
const STORE_NAME = 'replays';

export interface ReplayRecord {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  recordedAt: number;       // timestamp
  duration: number;          // ms
  hasWebcam: boolean;
  playerName: string;
  data: Blob;               // audio/webm or video/webm
  // Game result snapshot
  score: number;
  accuracy: number;
  rating: string;
}

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[ReplayDB] Failed to open database:', request.error);
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
        store.createIndex('recordedAt', 'recordedAt', { unique: false });
      }
    };
  });
}

/** Store a replay recording in IndexedDB. */
export async function storeReplay(replay: ReplayRecord): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(replay);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      console.error('[ReplayDB] Failed to store replay:', request.error);
      reject(request.error);
    };
  });
}

/** Retrieve a single replay by ID. */
export async function getReplay(id: string): Promise<ReplayRecord | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result ?? null);
    };
    request.onerror = () => {
      console.error('[ReplayDB] Failed to get replay:', request.error);
      reject(request.error);
    };
  });
}

/** Get all replays for a specific song, sorted by most recent first. */
export async function getReplaysForSong(songId: string): Promise<ReplayRecord[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('songId');
    const request = index.getAll(songId);

    request.onsuccess = () => {
      const results = (request.result as ReplayRecord[])
        .sort((a, b) => b.recordedAt - a.recordedAt);
      resolve(results);
    };
    request.onerror = () => {
      console.error('[ReplayDB] Failed to get replays for song:', request.error);
      reject(request.error);
    };
  });
}

/** Get all replays, sorted by most recent first. */
export async function getAllReplays(): Promise<ReplayRecord[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = (request.result as ReplayRecord[])
        .sort((a, b) => b.recordedAt - a.recordedAt);
      resolve(results);
    };
    request.onerror = () => {
      console.error('[ReplayDB] Failed to get all replays:', request.error);
      reject(request.error);
    };
  });
}

/** Delete a single replay by ID. */
export async function deleteReplay(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('[ReplayDB] Failed to delete replay:', request.error);
      reject(request.error);
    };
  });
}

/** Delete all replays for a specific song. */
export async function deleteReplaysForSong(songId: string): Promise<void> {
  const replays = await getReplaysForSong(songId);
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    let completed = 0;
    let errored = false;

    if (replays.length === 0) {
      resolve();
      return;
    }

    replays.forEach((replay) => {
      const request = store.delete(replay.id);
      request.onsuccess = () => {
        completed++;
        if (completed === replays.length && !errored) resolve();
      };
      request.onerror = () => {
        if (!errored) {
          errored = true;
          console.error('[ReplayDB] Failed to delete replay for song:', request.error);
          reject(request.error);
        }
      };
    });
  });
}

/**
 * Auto-cleanup: Delete replays older than 30 days or keep max 50 replays.
 * Call this periodically (e.g., on app startup or before storing a new replay).
 */
export async function cleanupOldReplays(): Promise<void> {
  try {
    const allReplays = await getAllReplays();

    // Delete replays older than 30 days
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const oldReplays = allReplays.filter(r => now - r.recordedAt > thirtyDaysMs);
    for (const replay of oldReplays) {
      await deleteReplay(replay.id);
    }

    // Keep max 50 replays (delete oldest)
    const remaining = allReplays.filter(r => !oldReplays.find(or => or.id === r.id));
    if (remaining.length > 50) {
      const toDelete = remaining.slice(50);
      for (const replay of toDelete) {
        await deleteReplay(replay.id);
      }
    }

    const deletedCount = oldReplays.length + Math.max(0, remaining.length - 50);
    if (deletedCount > 0) {
    }
  } catch (err) {
    console.warn('[ReplayDB] Cleanup failed (non-critical):', err);
  }
}
