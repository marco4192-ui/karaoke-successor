// IndexedDB storage for media files (audio, video, cover, txt)
// This allows persistent storage of imported song media
// IMPORTANT: TXT files are stored here to avoid bloating localStorage with lyrics data

const DB_NAME = 'karaoke-successor-media';
const DB_VERSION = 2; // Bumped for txt support
const STORE_NAME = 'media';

interface MediaRecord {
  id: string; // songId + type (e.g., "song-123-audio")
  songId: string;
  type: 'audio' | 'video' | 'cover' | 'txt';
  data: Blob;
  createdAt: number;
}

let dbInstance: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;

// ── R41 (P1/P2/P3): stable object-URL cache ────────────────────────────────────
// getSongMediaUrls previously created FRESH object URLs on every call. The
// song-library then swapped them per "generation" and revoked old ones —
// covers in still-displayed grids died from one library re-entry to the next
// (empty purple tiles, no error, because a revoked blob: URL fails silently).
// Now the SAME URL is returned for a song+type until the underlying media
// changes (storeMedia) or the whole cache is dropped (revokeAllSongMediaUrls).
const songUrlCache = new Map<string, string>(); // key: `${songId}::${type}`
const pendingUrlRevokes = new Map<string, ReturnType<typeof setTimeout>>();

/** Delayed revoke (30 s) — mirrors file-storage-media's policy: an <img>/<audio>
 *  that already started loading may finish; images that finished are immune to
 *  revocation anyway. Re-caching a URL cancels the pending revoke. */
function scheduleCachedUrlRevoke(url: string): void {
  if (!url.startsWith('blob:')) return;
  const existing = pendingUrlRevokes.get(url);
  if (existing) clearTimeout(existing);
  pendingUrlRevokes.set(url, setTimeout(() => {
    pendingUrlRevokes.delete(url);
    try { URL.revokeObjectURL(url); } catch { /* already revoked */ }
  }, 30_000));
}

/** Cached URL for one media type — creates it on first request. */
async function getOrCreateSongUrl(
  songId: string,
  type: 'audio' | 'video' | 'cover' | 'txt',
): Promise<string | undefined> {
  const key = `${songId}::${type}`;
  const cached = songUrlCache.get(key);
  if (cached) return cached;
  const blob = await getMedia(songId, type);
  if (!blob || blob.size === 0) return undefined;
  const url = URL.createObjectURL(blob);
  songUrlCache.set(key, url);
  return url;
}

/** Drop the cached URL of one media type (called after storeMedia replaced
 *  the blob). The next getSongMediaUrls re-reads the new content. */
function invalidateCachedSongUrl(songId: string, type: 'audio' | 'video' | 'cover' | 'txt'): void {
  const key = `${songId}::${type}`;
  const url = songUrlCache.get(key);
  if (url) {
    songUrlCache.delete(key);
    scheduleCachedUrlRevoke(url);
  }
}

/** Revoke every cached media URL (full library reset / cache clear).
 *  Delayed (30 s) so grids that still display the old URLs don't break
 *  mid-swap — the replacement data is served with fresh URLs anyway. */
export function revokeAllSongMediaUrls(): void {
  for (const url of songUrlCache.values()) {
    scheduleCachedUrlRevoke(url);
  }
  songUrlCache.clear();
}

/** R43 (cover self-healing): drop the cached URL for one media type and
 *  re-create a FRESH object URL from the stored blob.
 *
 *  Why: if some consumer revoked a SHARED stable URL (external
 *  URL.revokeObjectURL — e.g. the pre-R43 SongVotingModal cleanup), the
 *  cache kept serving the dead URL string forever (`if (cached) return
 *  cached`): every <img> retry hit ERR_FILE_NOT_FOUND and the cover stayed
 *  broken for the whole session. This function forces a fresh URL so the
 *  SongCard error path can heal itself. Returns undefined when there is no
 *  media of that type — the caller then keeps its fallback handling. */
export async function refreshSongMediaUrl(
  songId: string,
  type: 'audio' | 'video' | 'cover' | 'txt',
): Promise<string | undefined> {
  const key = `${songId}::${type}`;
  // Drop the (suspected dead) cache entry WITHOUT revoking: if it is still
  // alive somewhere it simply keeps working (one bounded URL leak at worst);
  // if it is dead, revoking again is a no-op anyway.
  songUrlCache.delete(key);
  return getOrCreateSongUrl(songId, type);
}

// Initialize the database (with concurrency lock to prevent double-open)
async function initMediaDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  
  if (!initPromise) {
    initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        // eslint-disable-next-line no-console
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
  // IMPORTANT: Always materialize to a new Blob in Tauri/WebView.
  // File objects may be filesystem references that become dead references
  // after the user navigates away or the file handle is garbage-collected.
  const arrayBuffer = await data.arrayBuffer();
  const blobToStore = new Blob([arrayBuffer], { type: data.type || (type === 'txt' ? 'text/plain' : 'application/octet-stream') });

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
      // R41: the stored media changed — drop any cached URL for this type so
      // the next reader materializes a fresh object URL for the NEW content.
      invalidateCachedSongUrl(songId, type);
      resolve();
    };
    request.onerror = () => {
      // eslint-disable-next-line no-console
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
          // eslint-disable-next-line no-console
          console.warn('[MediaDB] Retrieved blob is empty for', type);
        }
        resolve(blob);
      } else {
        // eslint-disable-next-line no-console
        console.warn('[MediaDB] No', type, 'found for song', songId);
        resolve(null);
      }
    };
    
    request.onerror = () => {
      // eslint-disable-next-line no-console
      console.error('[MediaDB] Failed to get', type, ':', request.error);
      reject(request.error);
    };
  });
}

// Get all media URLs for a song.
// R41: returns the STABLE cached URLs — repeated calls no longer allocate new
// object URLs (see songUrlCache above). Consumers may keep the result for as
// long as they like; the URLs stay alive until the media content changes.
export async function getSongMediaUrls(songId: string): Promise<{
  audioUrl?: string;
  videoUrl?: string;
  coverUrl?: string;
  txtUrl?: string;
}> {
  const [audioUrl, videoUrl, coverUrl, txtUrl] = await Promise.all([
    getOrCreateSongUrl(songId, 'audio'),
    getOrCreateSongUrl(songId, 'video'),
    getOrCreateSongUrl(songId, 'cover'),
    getOrCreateSongUrl(songId, 'txt'),
  ]);

  return { audioUrl, videoUrl, coverUrl, txtUrl };
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
      try { URL.revokeObjectURL(url); } catch { /* already revoked */ }
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

/**
 * Dump ALL media records (backup/sync support — see src/lib/sync/backup.ts).
 * Returns raw records without creating object URLs, so the caller can encode
 * them for export without leaking blob: URLs.
 */
export async function getAllMediaRecords(): Promise<Array<{
  songId: string;
  type: 'audio' | 'video' | 'cover' | 'txt';
  data: Blob;
}>> {
  const db = await initMediaDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = (request.result || []).map((r: MediaRecord) => ({
        songId: r.songId,
        type: r.type,
        data: r.data,
      }));
      resolve(records);
    };

    request.onerror = () => {
      // eslint-disable-next-line no-console
      console.error('[MediaDB] Failed to dump all media:', request.error);
      reject(request.error);
    };
  });
}

