// File Storage Media - Media URL loading and blob URL caching
// Extracted from tauri-file-storage.ts

import { nativeReadFileBytes, nativeReadDir } from '@/lib/native-fs';
import { StorageKeys, getItem } from '@/lib/storage';
import { AUDIO_EXTENSIONS, VIDEO_EXTENSIONS, COVER_EXTENSIONS } from '@/lib/media-extensions';
import {
  normalizeFilePath,
  isTauri,
  isAbsoluteFileSystemPath,
  MIME_TYPES,
  COVER_PATTERNS,
} from '@/lib/file-storage-utils';

/**
 * Convert a forward-slash path to the OS-native separator on Windows.
 * IMPORTANT: On Windows, the Tauri Rust backend requires native backslash
 * separators. The normalizeFilePath function converts everything to forward
 * slashes for internal consistency, but the Rust resolve_path_candidates /
 * validate_safe_path functions may fail with forward slashes in certain
 * edge cases (e.g., folder names with parentheses).
 * Do NOT remove this conversion — it fixes TauriFS "File not found" errors.
 */
function toNativePath(path: string): string {
  return typeof window !== 'undefined' && navigator.userAgent.includes('Win')
    ? path.replace(/\//g, '\\')
    : path;
}

// In-memory cache for blob URLs to avoid recreating them.
// Eviction: capped at 2000 entries — oldest entries are removed when full.
// NOTE: Was 200, but eviction of in-use URLs caused playback failures during
// seeking on long songs. 2000 is safe for a desktop app (Tauri) where memory
// is plentiful and the number of distinct media files in a session is bounded.
const blobUrlCache = new Map<string, string>();
const BLOB_CACHE_MAX = 2000;

// Track blob URLs pending delayed revocation.
// When a URL is evicted from cache, we don't revoke it immediately because it
// may still be referenced by <audio>/<img> elements. Instead, we schedule a
// delayed revoke (30 s). If the URL is re-cached before the timeout, the
// revoke is cancelled. This prevents "stale blob URL" playback failures while
// still releasing memory for truly unused blobs.
const pendingRevokes = new Map<string, ReturnType<typeof setTimeout>>();

/** Schedule a DELAYED revoke (30 s) of a blob URL.
 * Gives active consumers (e.g. <img>/<audio> mid-load) time to finish using
 * the URL. If the URL is re-cached before the timeout fires, the revoke is
 * cancelled in cacheBlobUrl(). Used both for cache eviction AND for
 * replacement (R34: the old immediate revoke on replace caused intermittent
 * broken covers — a parallel load could revoke a URL an <img> was loading). */
function scheduleDelayedRevoke(url: string) {
  const existing = pendingRevokes.get(url);
  if (existing) clearTimeout(existing);
  pendingRevokes.set(url, setTimeout(() => {
    try { URL.revokeObjectURL(url); } catch { /* already revoked or GC'd */ }
    pendingRevokes.delete(url);
  }, 30_000));
}

/** Evict the oldest entry from cache using DELAYED revocation.
 *  R44 (cover-killer fix): COVER files are NEVER revoked on eviction — only
 *  dropped from the cache. Covers are small (KB-range) and stay referenced
 *  by Song objects in app state / the library snapshot for the whole
 *  session; revoking an in-use cover URL left a dead `blob:` string in every
 *  still-displayed grid tile (net::ERR_FILE_NOT_FOUND, ~30% broken covers
 *  after the cache grew past BLOB_CACHE_MAX during long sessions). Audio/
 *  video files keep the delayed revoke — they are large, and the currently
 *  playing media is always the NEWEST cache entry (never the eviction
 *  victim). */
function evictBlobUrl(key: string) {
  const url = blobUrlCache.get(key);
  if (url) {
    blobUrlCache.delete(key);
    const ext = '.' + key.split('/').pop()?.split('.').pop()?.toLowerCase();
    if (COVER_EXTENSIONS.includes(ext as typeof COVER_EXTENSIONS[number])) {
      // Cover: drop from cache, keep the URL alive (Song objects may still
      // reference it; worst case is a bounded, small-blob memory hold).
      return;
    }
    scheduleDelayedRevoke(url);
  }
}

/** Add a blob URL to the cache, evicting the oldest entry if full. */
function cacheBlobUrl(key: string, url: string) {
  // Cancel any pending delayed revoke — the URL is being actively re-cached.
  const pendingRevoke = pendingRevokes.get(url);
  if (pendingRevoke) {
    clearTimeout(pendingRevoke);
    pendingRevokes.delete(url);
  }

  // If this key already exists in cache, the OLD URL is replaced by a fresh
  // load of the same file. R34: use the same DELAYED revoke (30 s) as cache
  // eviction — revoking immediately broke covers intermittently, because a
  // consumer (<img>/<audio>) could still be mid-load on the old URL.
  const existingUrl = blobUrlCache.get(key);
  if (existingUrl && existingUrl !== url) {
    scheduleDelayedRevoke(existingUrl);
  }

  if (blobUrlCache.size >= BLOB_CACHE_MAX) {
    // Evict the oldest entry (first key in insertion order)
    const oldest = blobUrlCache.keys().next().value;
    if (oldest !== undefined && oldest !== key) evictBlobUrl(oldest);
  }
  blobUrlCache.set(key, url);
}

// Load a file from the filesystem and return a blob URL
// Uses native Tauri command to bypass plugin ACL restrictions.
// NOTE: Does NOT cache the result — callers are responsible for caching
// to prevent aliasing bugs (multiple keys pointing to the same blob URL).
async function loadFileAsBlobUrl(fullPath: string): Promise<string | null> {
  // R34 (cover-retry robustness): transient Tauri FS/IPC errors happen
  // (IPC hiccups, temporarily busy backend). Retry up to 2 times with a
  // short delay before giving up for good — a single hiccup must no longer
  // surface as a permanently missing cover.
  const MAX_ATTEMPTS = 3; // initial attempt + 2 retries
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    try {
      // Use native command — returns base64-encoded bytes (bypass ACL)
      const osPath = toNativePath(fullPath);
      const base64Data = await nativeReadFileBytes(osPath);
      
      // Decode base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      
      // Determine MIME type from extension
      const ext = '.' + fullPath.split('.').pop()?.toLowerCase();
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
      
      // Create blob and URL
      const blob = new Blob([bytes], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      
      return blobUrl;
    } catch (error) {
      lastError = error;
    }
  }
  // eslint-disable-next-line no-console
  console.error('[TauriFS] Failed to load file as blob after ' + MAX_ATTEMPTS + ' attempts:', fullPath, lastError);
  return null;
}

/**
 * Scan the parent folder of a relative path to find a file by name.
 * This is a last-resort fallback when direct path construction fails due to
 * encoding issues, Unicode normalization mismatches, or path separator problems.
 *
 * Strategy:
 * 1. Extract the parent directory from the relative path
 * 2. List ALL files in that directory using nativeReadDir
 * 3. Find a file whose name matches the target file name (case-insensitive)
 * 4. Load the matched file using its actual filesystem path
 */
async function findFileByScanningParentFolder(
  baseFolder: string,
  relativePath: string,
): Promise<string | null> {
  try {
    // Extract parent directory and target filename from relative path
    const pathParts = relativePath.split('/');
    const fileName = pathParts.pop(); // e.g. "cover.jpg"
    if (!fileName) return null;

    // The parent directory path relative to baseFolder
    const parentRelDir = pathParts.join('/'); // e.g. "Artist - Title"

    // Construct the full parent directory path
    let parentDir: string;
    if (parentRelDir) {
      // Try both forward slashes and OS-native separators
      parentDir = `${normalizeFilePath(baseFolder)}/${normalizeFilePath(parentRelDir)}`;
    } else {
      return null; // File is in root, no parent to scan
    }



    // Try to list the directory
    let entries: Awaited<ReturnType<typeof nativeReadDir>>;
    try {
      entries = await nativeReadDir(toNativePath(parentDir));
    } catch {
      // Directory itself might not be readable — try with backslashes
      try {
        entries = await nativeReadDir(parentDir.replace(/\//g, '\\'));
      } catch (error) {
          // eslint-disable-next-line no-console
          console.debug('[tauri-file-storage]: failed to list directory with backslashes', error);
          return null;
      }
    }

    // Case-insensitive, Unicode-normalized filename matching
    const targetLower = fileName.toLowerCase().normalize('NFC');
    for (const entry of entries) {
      if (!entry.is_file) continue;
      if (entry.name.toLowerCase().normalize('NFC') === targetLower) {
        // Found it! Load using the actual filesystem path from the directory entry

        const url = await loadFileAsBlobUrl(entry.path);
        if (url) return url;
      }
    }

    // Also check if there's a cover file with any COVER_PATTERN name in the directory
    if (COVER_EXTENSIONS.some(ext => targetLower.endsWith(ext))) {
      for (const entry of entries) {
        if (!entry.is_file) continue;
        const entryExt = '.' + entry.name.split('.').pop()?.toLowerCase();
        if (!COVER_EXTENSIONS.includes(entryExt as typeof COVER_EXTENSIONS[number])) continue;
        if (COVER_PATTERNS.some(p => p.test(entry.name))) {
  
          const url = await loadFileAsBlobUrl(entry.path);
          if (url) return url;
        }
      }
    }

    return null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TauriFS] Folder scan fallback error:', error);
    return null;
  }
}

// R34 (blob-URL race fix): in-flight dedup — parallel calls for the same
// (relativePath, baseFolder) share ONE load promise. Previously two parallel
// loads for the same path each created their own blob URL; the second
// cacheBlobUrl() replaced (and revoked) the first URL while an <img> was
// still loading it → intermittently broken covers.
const inflightMediaLoads = new Map<string, Promise<string | null>>();

// Get a playable URL for a song media file (from songs folder)
// This is the PRIMARY method for loading audio/video/cover in Tauri
// IMPORTANT: In Tauri v2 with dev server, we need to load files directly and create blob URLs
// because convertFileSrc doesn't work well with http://localhost:3000 origin
export function getSongMediaUrl(relativePath: string, baseFolder?: string): Promise<string | null> {
  if (!isTauri()) {
    return Promise.resolve(relativePath);
  }

  // Key on NORMALIZED paths — callers may pass mixed separators ("a\\b/c")
  // that resolve to the same file internally; normalizing makes them share
  // one in-flight promise too.
  const dedupKey = (baseFolder ? normalizeFilePath(baseFolder) + '\u0000' : '') + normalizeFilePath(relativePath);
  const existing = inflightMediaLoads.get(dedupKey);
  if (existing) {
    return existing;
  }

  const promise = loadSongMediaUrlUncached(relativePath, baseFolder).then(
    (result) => {
      inflightMediaLoads.delete(dedupKey);
      return result;
    },
    (error) => {
      inflightMediaLoads.delete(dedupKey);
      throw error;
    },
  );
  inflightMediaLoads.set(dedupKey, promise);
  return promise;
}

async function loadSongMediaUrlUncached(relativePath: string, baseFolder?: string): Promise<string | null> {
  try {
    // Priority 1: Use provided base folder
    // Priority 2: Use localStorage 'karaoke-songs-folder' (normalized)
    let songsFolder = baseFolder;
    
    if (!songsFolder) {
      const raw = getItem(StorageKeys.SONGS_FOLDER);
      songsFolder = raw ? normalizeFilePath(raw) : undefined;
    }
    
    if (!songsFolder) {
      // No base folder available - try using the path as absolute path
      if (isAbsoluteFileSystemPath(relativePath)) {

        return await loadFileAsBlobUrl(relativePath);
      }
      // eslint-disable-next-line no-console
      console.warn('[TauriFS] No songs folder configured and path is not absolute');
      return null;
    }
    
    // CRITICAL FIX: If relativePath is actually an absolute path (e.g. stored incorrectly
    // as full path instead of relative), use it directly instead of concatenating.
    // Without this check, paths would double: "baseFolder/absolutePath" → broken path.
    if (isAbsoluteFileSystemPath(relativePath)) {

      return await loadFileAsBlobUrl(relativePath);
    }
    
    // Normalize both base folder and relative path using centralized utility.
    // Handles backslashes, trailing slashes, and HTML entities (e.g. &amp; → &).
    const normalizedBaseFolder = normalizeFilePath(songsFolder);
    const normalizedRelativePath = normalizeFilePath(relativePath);
    
    // Construct full path using forward slash (works on both Windows and Unix)
    const fullPath = `${normalizedBaseFolder}/${normalizedRelativePath}`;

    
    // Check cache first
    const cachedUrl = blobUrlCache.get(fullPath);
    if (cachedUrl) {

      return cachedUrl;
    }
    
    // Load file and create blob URL
    const result = await loadFileAsBlobUrl(fullPath);
    if (result) {
      cacheBlobUrl(fullPath, result);
      return result;
    }
    
    // FALLBACK: Try with OS-native backslashes on Windows.
    // On some Windows configurations, forward-slash paths containing special
    // characters (like &) may not resolve correctly even though Rust's
    // PathBuf normally handles them. Using backslashes is the safest bet.
    if (fullPath.includes('/')) {
      const backslashPath = fullPath.replace(/\//g, '\\');

      const fallback = await loadFileAsBlobUrl(backslashPath);
      if (fallback) {
        // Cache under the canonical forward-slash key only.
        // Do NOT cache under backslashPath to prevent aliasing:
        // if the cache evicts one key, URL.revokeObjectURL() would revoke
        // the blob while the other key still references it.
        cacheBlobUrl(fullPath, fallback);
        return fallback;
      }
    }
    


    // FALLBACK 2: For cover/image files, scan the song's parent folder to find
    // the actual file. This handles cases where path encoding, Unicode
    // normalization, or path separator issues cause the direct path to fail
    // even though the file exists on disk.
    const ext = ('.' + relativePath.split('/').pop()?.split('\\').pop()?.toLowerCase()) as string;
    if (COVER_EXTENSIONS.includes(ext) || AUDIO_EXTENSIONS.includes(ext) || VIDEO_EXTENSIONS.includes(ext)) {
      const folderResult = await findFileByScanningParentFolder(
        normalizedBaseFolder,
        normalizedRelativePath,
      );
      if (folderResult) {

        return folderResult;
      }
    }

    return null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TauriFS] Failed to get song media URL:', error);
    return null;
  }
}

// Clear blob URL cache (call when songs are re-scanned)
// R41: DELAYED revocation (30 s) — the old immediate revoke killed every
// visible cover the moment a rescan started (library grid mid-display, <img>
// elements just about to load). The 30 s grace matches cacheBlobUrl's
// replacement policy; the next getSongMediaUrl for the same path re-creates
// a fresh URL and cancels the pending revoke (scheduleDelayedRevoke).
// R44: covers survive this clear alive (same rationale as evictBlobUrl) —
// a full rescan replaces the song store, but still-displayed grids may hold
// the old URL strings a while longer.
export function clearBlobUrlCache(): void {
  for (const [key, url] of blobUrlCache.entries()) {
    const ext = '.' + key.split('/').pop()?.split('.').pop()?.toLowerCase();
    if (COVER_EXTENSIONS.includes(ext as typeof COVER_EXTENSIONS[number])) {
      blobUrlCache.delete(key);
      continue;
    }
    scheduleDelayedRevoke(url);
  }
  // Re-insert nothing — cache is empty; note cover entries were REMOVED
  // without revoke, so their URLs stay valid for current consumers.
  blobUrlCache.clear();
}

/**
 * R44 (cover self-healing, Tauri path): force a FRESH load of a media file
 * from disk, bypassing (and replacing) the cached URL for that path.
 *
 * Why: if a cached cover URL died anyway (external revoke, edge cases the
 * eviction policy can't cover), getSongMediaUrl keeps returning the DEAD
 * cached string forever (`if (cachedUrl) return cachedUrl`). The SongCard
 * error path calls this to heal: a fresh blob URL is created from disk, the
 * cache entry is replaced, and the OLD (suspected dead) URL is NOT revoked —
 * revoking it could kill a parallel consumer that still loads it (one
 * bounded URL leak per heal at worst).
 *
 * Returns the fresh URL, or null when the file can't be read.
 */
export async function refreshTauriMediaUrl(
  relativePath: string,
  baseFolder?: string,
): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    let songsFolder = baseFolder;
    if (!songsFolder) {
      const raw = getItem(StorageKeys.SONGS_FOLDER);
      songsFolder = raw ? normalizeFilePath(raw) : undefined;
    }
    const normalizedBaseFolder = songsFolder ? normalizeFilePath(songsFolder) : undefined;
    const normalizedRelativePath = normalizeFilePath(relativePath);
    const fullPath = normalizedBaseFolder
      ? `${normalizedBaseFolder}/${normalizedRelativePath}`
      : normalizedRelativePath;

    // Load fresh from disk — do NOT touch the cached entry until we have a
    // working new URL.
    let url = await loadFileAsBlobUrl(fullPath);
    if (!url && fullPath.includes('/')) {
      // Windows backslash fallback (same as the primary loader)
      url = await loadFileAsBlobUrl(fullPath.replace(/\//g, '\\'));
    }
    if (!url) return null;

    // Replace the cache entry WITHOUT revoking the old URL (see doc above).
    blobUrlCache.set(fullPath, url);
    return url;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[TauriFS] refreshTauriMediaUrl failed:', relativePath, error);
    return null;
  }
}
