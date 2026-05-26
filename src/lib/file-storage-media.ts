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

/** Revoke a blob URL immediately (for explicit replacement, not cache eviction). */
function revokeBlobUrl(url: string) {
  // Cancel any pending delayed revoke first
  const pending = pendingRevokes.get(url);
  if (pending) {
    clearTimeout(pending);
    pendingRevokes.delete(url);
  }
  try { URL.revokeObjectURL(url); } catch { /* ignore if already revoked */ }
}

/** Evict the oldest entry from cache using DELAYED revocation. */
function evictBlobUrl(key: string) {
  const url = blobUrlCache.get(key);
  if (url) {
    blobUrlCache.delete(key);
    // Delayed revoke — gives active consumers (e.g. <audio src="...">) time
    // to finish using the URL. If the same URL is re-cached before the
    // timeout fires, the revoke is cancelled in cacheBlobUrl().
    const existing = pendingRevokes.get(url);
    if (existing) clearTimeout(existing);
    pendingRevokes.set(url, setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch { /* already revoked or GC'd */ }
      pendingRevokes.delete(url);
    }, 30_000));
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

  // If this key already exists in cache, revoke the OLD URL immediately
  // (it's being replaced by a fresh load of the same file).
  const existingUrl = blobUrlCache.get(key);
  if (existingUrl && existingUrl !== url) {
    revokeBlobUrl(existingUrl);
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

  
  try {
    // Use native command — returns base64-encoded bytes (bypass ACL)
    const base64Data = await nativeReadFileBytes(fullPath);
    
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
    // eslint-disable-next-line no-console
    console.error('[TauriFS] Failed to load file as blob:', fullPath, error);
    return null;
  }
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
      entries = await nativeReadDir(parentDir);
    } catch {
      // Directory itself might not be readable — try with backslashes
      try {
        entries = await nativeReadDir(parentDir.replace(/\//g, '\\'));
      } catch (error) {
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

// Get a playable URL for a song media file (from songs folder)
// This is the PRIMARY method for loading audio/video/cover in Tauri
// IMPORTANT: In Tauri v2 with dev server, we need to load files directly and create blob URLs
// because convertFileSrc doesn't work well with http://localhost:3000 origin
export async function getSongMediaUrl(relativePath: string, baseFolder?: string): Promise<string | null> {
  if (!isTauri()) {
    return relativePath;
  }

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
export function clearBlobUrlCache(): void {
  for (const url of blobUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  blobUrlCache.clear();

}
