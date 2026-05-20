// File Storage Utilities - Shared helpers for file path handling and environment checks
// Extracted from tauri-file-storage.ts

/**
 * Sanitize a filename to prevent directory traversal attacks.
 * Strips path separators, parent directory references (..), and
 * null bytes from filenames before using them in path construction.
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/]/g, '_')    // path separators → underscore
    .replace(/\.\./g, '_')     // parent directory references → underscore
    .replace(/\0/g, '')        // null bytes (prevent injection)
    .replace(/^\./, '_');      // leading dot (prevent hidden files)
}

/**
 * Normalize a file path for cross-platform use in Tauri.
 * - Converts backslashes to forward slashes
 * - Strips trailing slashes
 * - Decodes HTML entities that may have been introduced during
 *   serialization (e.g. localStorage, IndexedDB, React hydration)
 *   Common culprits: &amp; → &, &lt; → <, &gt; → >, &quot; → ", &#39; → '
 * This is the single source of truth for path normalization;
 * all file path construction should use this function.
 */
export function normalizeFilePath(path: string): string {
  let result = path
    .replace(/\\/g, '/')           // backslashes → forward slashes (Windows paths)
    .replace(/\/+$/, '')           // strip trailing slashes
    // Named HTML entities → literal characters
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Common numeric HTML entities
    .replace(/&#x22;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x3C;/g, '<')
    .replace(/&#x3E;/g, '>')
    .replace(/&#39;/g, "'")
    // Catch-all for any remaining numeric HTML entities: &#NNN; or &#xHH;
    // Limit to valid Unicode code points (1-65535) to avoid corrupting
    // legitimate content that happens to match &digits; patterns (e.g. in filenames)
    .replace(/&#(\d+);/g, (_, n) => { const cp = parseInt(n, 10); return cp >= 1 && cp <= 65535 ? String.fromCharCode(cp) : _; })
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => { const cp = parseInt(hex, 16); return cp >= 1 && cp <= 65535 ? String.fromCharCode(cp) : _; });

  // Decode percent-encoded characters (e.g. %20 → space, %C3%A4 → ä)
  // Use segment-by-segment approach since decodeURIComponent throws on malformed input
  try {
    result = decodeURIComponent(result);
  } catch {
    result = result.split('/').map(segment => {
      try { return decodeURIComponent(segment); }
      catch { return segment; }
    }).join('/');
  }

  // Normalize Unicode to NFC (precomposed form)
  // This ensures é (U+00E9) matches e + combining acute (U+0065 U+0301)
  // macOS uses NFD by default, Windows uses NFC — this avoids mismatches
  return result.normalize('NFC');
}

// Check if running in Tauri
// Tauri v2 may use __TAURI_INTERNALS__ instead of __TAURI__
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  // Check for both Tauri v1 and v2
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window;
}

// Check if a path is an absolute file system path (Windows or Unix)
export function isAbsoluteFileSystemPath(p: string): boolean {
  if (!p) return false;
  // Unix absolute: /home/...
  if (p.startsWith('/')) return true;
  // Windows absolute: C:\... or C:/...
  if (/^[A-Za-z]:[\\/]/.test(p)) return true;
  // Windows UNC: \\server\share
  if (p.startsWith('\\\\')) return true;
  return false;
}

// MIME types for file extensions (supplements media-extensions.ts)
export const MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.wma': 'audio/x-ms-wma',
  '.opus': 'audio/opus',
  '.weba': 'audio/webm',
  '.aiff': 'audio/aiff',
  '.aif': 'audio/aiff',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.m4v': 'video/mp4',
  '.3gp': 'video/3gpp',
  '.ogv': 'video/ogg',
  '.ts': 'video/mp2t',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.txt': 'text/plain',
};

// Cover file name patterns
export const COVER_PATTERNS = [
  /^cover/i,
  /^folder/i,
  /^front/i,
  /^album/i,
  /^\[co\]/i,
];
