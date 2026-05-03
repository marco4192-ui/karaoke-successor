// Tauri File Storage - Persistent file storage for imported songs
// This module handles copying imported files to app data directory
// so they persist across app restarts

import { writeFile, BaseDirectory, mkdir } from '@tauri-apps/plugin-fs';
import { LyricLine } from '@/types/game';
import { convertNotesToLyricLines } from '@/lib/parsers/notes-to-lyric-lines';
import {
  nativeReadFileBytes,
  nativeReadFileText,
  nativeReadDir,
} from '@/lib/native-fs';
import { normalizeTxtContent } from '@/lib/utils';

/**
 * Sanitize a filename to prevent directory traversal attacks.
 * Strips path separators, parent directory references (..), and
 * null bytes from filenames before using them in path construction.
 */
function sanitizeFileName(name: string): string {
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

// In-memory cache for blob URLs to avoid recreating them.
// Eviction: capped at 200 entries — oldest entries are removed when full.
const blobUrlCache = new Map<string, string>();
const BLOB_CACHE_MAX = 200;

/** Revoke an old blob URL and remove it from the cache. */
function evictBlobUrl(key: string) {
  const url = blobUrlCache.get(key);
  if (url) {
    try { URL.revokeObjectURL(url); } catch {}
    blobUrlCache.delete(key);
  }
}

/** Add a blob URL to the cache, evicting the oldest entry if full. */
function cacheBlobUrl(key: string, url: string) {
  if (blobUrlCache.size >= BLOB_CACHE_MAX) {
    // Evict the oldest entry (first key in insertion order)
    const oldest = blobUrlCache.keys().next().value;
    if (oldest !== undefined) evictBlobUrl(oldest);
  }
  blobUrlCache.set(key, url);
}

// File extension patterns
const AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.wav', '.m4a', '.flac', '.aac', '.wma', '.opus', '.weba', '.aiff', '.aif'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.m4v', '.3gp', '.ogv', '.ts'];
const TXT_EXTENSIONS = ['.txt'];
const COVER_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

// MIME types for file extensions
const MIME_TYPES: Record<string, string> = {
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
const COVER_PATTERNS = [
  /^cover/i,
  /^folder/i,
  /^front/i,
  /^album/i,
  /^\[co\]/i,
];

// Check if a path is an absolute file system path (Windows or Unix)
function isAbsoluteFileSystemPath(p: string): boolean {
  if (!p) return false;
  // Unix absolute: /home/...
  if (p.startsWith('/')) return true;
  // Windows absolute: C:\... or C:/...
  if (/^[A-Za-z]:[\\/]/.test(p)) return true;
  // Windows UNC: \\server\share
  if (p.startsWith('\\\\')) return true;
  return false;
}

// Scanned song from Tauri file system
export interface TauriScannedSong {
  title: string;
  artist: string;
  folderPath: string;
  baseFolder: string; // Absolute path to the songs root folder (critical for media loading)
  relativeTxtPath?: string;
  relativeAudioPath?: string;
  relativeVideoPath?: string;
  relativeCoverPath?: string;
  relativeBackgroundPath?: string;
  bpm: number;
  gap: number;
  genre?: string;
  language?: string;
  year?: number;
  previewStart?: number;
  previewDuration?: number;
  // Parsed lyrics (notes data)
  lyrics?: LyricLine[];
  // Additional metadata from TXT headers
  creator?: string;
  version?: string;
  edition?: string;
  tags?: string;
  // Time control
  start?: number; // #START: skip beginning (ms)
  end?: number; // #END: early end (ms)
  videoGap?: number; // #VIDEOGAP: video sync offset (ms)
  videoStart?: number; // #VIDEOSTART: fixed video start (ms)
  // Medley
  medleyStartBeat?: number;
  medleyEndBeat?: number;
  // Duet
  isDuet?: boolean;
  duetPlayerNames?: [string, string];
  // Raw TXT metadata file references (for editor display)
  mp3File?: string;        // #MP3: raw value from TXT
  coverFile?: string;      // #COVER: raw value from TXT
  backgroundFile?: string; // #BACKGROUND: raw value from TXT
  videoFile?: string;      // #VIDEO: raw value from TXT (non-URL)
  // Media flags
  hasEmbeddedAudio?: boolean; // True if #MP3: points to a video file
}

export interface TauriScanResult {
  songs: TauriScannedSong[];
  errors: string[];
  scannedFiles: number;
}

// Scan a songs folder recursively using Tauri's fs plugin
// This is the PRIMARY method for loading songs in Tauri
export async function scanSongsFolderTauri(baseSongsFolder: string): Promise<TauriScanResult> {
  const result: TauriScanResult = {
    songs: [],
    errors: [],
    scannedFiles: 0,
  };

  if (!isTauri()) {
    result.errors.push('Not running in Tauri - cannot use file system scan');
    return result;
  }



  try {
    // Collect ALL files first, then group by folder
    const allFiles = await collectAllFiles(baseSongsFolder, baseSongsFolder);
    result.scannedFiles = allFiles.length;
    

    
    // Group files by their parent folder
    const folderMap = new Map<string, Map<string, { path: string; name: string }>>();
    
    for (const file of allFiles) {
      // Get parent folder path relative to base folder
      const relativePath = file.relativePath;
      const pathParts = relativePath.split('/');
      
      // The song folder is the immediate parent of the file
      // For path like "Artist/Album/song.txt", the folder is "Artist/Album"
      const parentFolder = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';
      
      if (!folderMap.has(parentFolder)) {
        folderMap.set(parentFolder, new Map());
      }
      
      const folderFiles = folderMap.get(parentFolder)!;
      folderFiles.set(file.name, { path: relativePath, name: file.name });
    }
    

    
    // Process each folder
    // CRITICAL: Pass the absolute baseSongsFolder, NOT the relative songFolder from the map!
    // This is essential for getSongMediaUrl to construct correct absolute paths later
    for (const [songFolder, files] of folderMap) {
      const song = await processFolder(songFolder, files, baseSongsFolder);
      if (song) {
        result.songs.push(song);
      }
    }
    

  } catch (error) {
    console.error('[TauriScanner] Scan failed:', error);
    result.errors.push(`Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

// Collect all files recursively
interface CollectedFile {
  relativePath: string;
  fullPath: string;
  name: string;
}

async function collectAllFiles(
  basePath: string,
  currentPath: string
): Promise<CollectedFile[]> {
  const files: CollectedFile[] = [];
  
  try {
    // Use native command to bypass ACL
    const entries = await nativeReadDir(currentPath);
    
    for (const entry of entries) {
      const fullPath = entry.path;
      
      // CRITICAL FIX: Normalize path separators for cross-platform support.
      // Rust fs::read_dir returns OS-native separators (\ on Windows, / on Unix).
      // We normalize to forward slashes so all downstream code works consistently.
      // Also strip trailing slashes to ensure correct prefix matching.
      const normalizedBase = basePath.replace(/\\/g, '/').replace(/\/+$/, '');
      const normalizedFull = fullPath.replace(/\\/g, '/').replace(/\/+$/, '');
      
      const relativePath = normalizedFull.startsWith(normalizedBase + '/')
        ? normalizedFull.slice(normalizedBase.length + 1)
        : normalizedFull;
      
      if (entry.is_directory) {
        const subFiles = await collectAllFiles(basePath, fullPath);
        files.push(...subFiles);
      } else if (entry.is_file) {
        // CRITICAL: Normalize HTML entities that may have been introduced
        // during Tauri IPC serialization (e.g. &amp; → &)
        files.push({
          relativePath: normalizeFilePath(relativePath),
          fullPath: normalizeFilePath(fullPath),
          name: entry.name,
        });
      }
    }
  } catch (error) {
    console.warn('[TauriScanner] Could not read directory:', currentPath, error);
  }
  
  return files;
}

// Process a single folder and create a song if valid
async function processFolder(
  folderPath: string,
  files: Map<string, { path: string; name: string }>,
  baseFolder: string
): Promise<TauriScannedSong | null> {
  // Find TXT, audio, video, cover files
  let txtFile: { path: string; name: string } | null = null;
  let audioFile: { path: string; name: string } | null = null;
  let videoFile: { path: string; name: string } | null = null;
  let coverFile: { path: string; name: string } | null = null;
  
  for (const [name, file] of files) {
    const ext = '.' + name.split('.').pop()?.toLowerCase();
    
    if (TXT_EXTENSIONS.includes(ext)) {
      txtFile = file;
    } else if (AUDIO_EXTENSIONS.includes(ext)) {
      audioFile = file;
    } else if (VIDEO_EXTENSIONS.includes(ext)) {
      videoFile = file;
    } else if (COVER_EXTENSIONS.includes(ext)) {
      const isPriorityCover = COVER_PATTERNS.some(p => p.test(name));
      if (!coverFile || isPriorityCover) {
        coverFile = file;
      }
    }
  }
  
  // Must have at least TXT and audio/video
  if (!txtFile || (!audioFile && !videoFile)) {
    return null;
  }
  
  // Read TXT content using native command (bypass ACL)
  // Normalize base folder separators to construct correct full path
  let txtContent: string | null = null;
  try {
    const normalizedBase = normalizeFilePath(baseFolder);
    const fullPath = `${normalizedBase}/${normalizeFilePath(txtFile.path)}`;
    txtContent = await nativeReadFileText(fullPath);
  } catch {
    return null;
  }
  
  if (!txtContent) {
    return null;
  }
  
  // Parse metadata from TXT
  const normalizedContent = normalizeTxtContent(txtContent);
  const lines = normalizedContent.split('\n');

  // Basic info
  let title = 'Unknown';
  let artist = 'Unknown';
  let bpm = 120;
  let gap = 0;
  let genre: string | undefined;
  let language: string | undefined;
  let year: number | undefined;

  // Preview
  let previewStart: number | undefined;
  let previewDuration: number | undefined;

  // File references
  let txtMp3File: string | undefined;
  let txtVideoFile: string | undefined;
  let txtCoverFile: string | undefined;
  let txtBackgroundFile: string | undefined;

  // Additional metadata
  let creator: string | undefined;
  let version: string | undefined;
  let edition: string | undefined;
  let tags: string | undefined;

  // Time control
  let start: number | undefined;
  let end: number | undefined;
  let videoGap: number | undefined;
  let videoStart: number | undefined;

  // Medley
  let medleyStartBeat: number | undefined;
  let medleyEndBeat: number | undefined;

  // Duet
  let p1Name: string | undefined;
  let p2Name: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();

    // Basic info
    if (trimmed.startsWith('#TITLE:')) {
      title = trimmed.substring(7).trim();
    } else if (trimmed.startsWith('#ARTIST:')) {
      artist = trimmed.substring(8).trim();
    } else if (trimmed.startsWith('#BPM:')) {
      bpm = parseFloat(trimmed.substring(5).replace(',', '.')) || 120;
    } else if (trimmed.startsWith('#GAP:')) {
      gap = parseInt(trimmed.substring(5)) || 0;
    } else if (trimmed.startsWith('#GENRE:')) {
      genre = trimmed.substring(7).trim();
    } else if (trimmed.startsWith('#LANGUAGE:')) {
      language = trimmed.substring(10).trim();
    } else if (trimmed.startsWith('#YEAR:')) {
      year = parseInt(trimmed.substring(6)) || undefined;
    }

    // File references
    else if (trimmed.startsWith('#MP3:')) {
      txtMp3File = trimmed.substring(5).trim();
    } else if (trimmed.startsWith('#AUDIO:')) {
      // Alternative to #MP3:
      txtMp3File = trimmed.substring(7).trim();
    } else if (trimmed.startsWith('#VIDEO:')) {
      txtVideoFile = trimmed.substring(7).trim();
    } else if (trimmed.startsWith('#COVER:')) {
      txtCoverFile = trimmed.substring(7).trim();
    } else if (trimmed.startsWith('#BACKGROUND:')) {
      txtBackgroundFile = trimmed.substring(12).trim();
    }

    // Time control
    else if (trimmed.startsWith('#START:')) {
      start = parseInt(trimmed.substring(7)) || undefined;
    } else if (trimmed.startsWith('#END:')) {
      end = parseInt(trimmed.substring(5)) || undefined;
    } else if (trimmed.startsWith('#VIDEOGAP:')) {
      videoGap = parseFloat(trimmed.substring(10).replace(',', '.')) || undefined;
    } else if (trimmed.startsWith('#VIDEOSTART:')) {
      videoStart = parseFloat(trimmed.substring(12).replace(',', '.')) || undefined;
    }

    // Preview
    else if (trimmed.startsWith('#PREVIEWSTART:')) {
      previewStart = parseFloat(trimmed.substring(13)) || undefined;
    } else if (trimmed.startsWith('#PREVIEWDURATION:')) {
      previewDuration = parseFloat(trimmed.substring(16)) || undefined;
    }

    // Medley
    else if (trimmed.startsWith('#MEDLEYSTARTBEAT:')) {
      medleyStartBeat = parseInt(trimmed.substring(16)) || undefined;
    } else if (trimmed.startsWith('#MEDLEYENDBEAT:')) {
      medleyEndBeat = parseInt(trimmed.substring(14)) || undefined;
    }

    // Additional metadata
    else if (trimmed.startsWith('#CREATOR:')) {
      creator = trimmed.substring(9).trim();
    } else if (trimmed.startsWith('#VERSION:')) {
      version = trimmed.substring(9).trim();
    } else if (trimmed.startsWith('#EDITION:')) {
      edition = trimmed.substring(9).trim();
    } else if (trimmed.startsWith('#TAGS:')) {
      tags = trimmed.substring(6).trim();
    }

    // Duet player names
    else if (trimmed.startsWith('#P1:')) {
      p1Name = trimmed.substring(4).trim();
    } else if (trimmed.startsWith('#P2:')) {
      p2Name = trimmed.substring(4).trim();
    }
  }

  // CRITICAL FIX: Use file paths from TXT headers as primary source
  // The TXT file specifies the exact files to use - we should honor that
  // The txtFile.path is relative to baseFolder, so we need to construct paths for referenced files
  
  // Get the folder containing the TXT file (relative to baseFolder)
  // Normalize to forward slashes first for consistent handling
  const normalizedTxtPath = normalizeFilePath(txtFile.path);
  const txtDir = normalizedTxtPath.includes('/') ? normalizedTxtPath.substring(0, normalizedTxtPath.lastIndexOf('/')) : '';
  
  // Helper to resolve file reference from TXT header
  const resolveTxtReference = (refFile: string | undefined, fallbackFile: { path: string } | null): string | undefined => {
    if (refFile) {
      // If the reference is a URL (http/https), it cannot be resolved as a
      // filesystem path — skip resolution so it doesn't get baked into
      // relativeVideoPath / relativeAudioPath (which would create invalid
      // paths like baseFolder + "/https://...").
      if (refFile.startsWith('http://') || refFile.startsWith('https://')) {

        return undefined;
      }
      // Reference from TXT - combine with TXT directory
      // The reference is typically just a filename, relative to the TXT file location
      const resolvedPath = txtDir ? normalizeFilePath(`${txtDir}/${refFile}`) : normalizeFilePath(refFile);

      return resolvedPath;
    }
    // Fallback to scanned file
    return fallbackFile?.path ? normalizeFilePath(fallbackFile.path) : undefined;
  };

  // Determine audio and video paths
  // IMPORTANT: In UltraStar format, #MP3: can point to .mp4 files (video with embedded audio)
  let finalAudioPath: string | undefined;
  let finalVideoPath: string | undefined;
  let hasEmbeddedAudio = false;
  
  // If #MP3: points to a video file, treat it as video with embedded audio
  if (txtMp3File) {
    const mp3Ext = '.' + txtMp3File.split('.').pop()?.toLowerCase();
    if (VIDEO_EXTENSIONS.includes(mp3Ext)) {
      // #MP3: points to a video file - this is the video with embedded audio
      finalVideoPath = resolveTxtReference(txtMp3File, videoFile);
      hasEmbeddedAudio = true;

    } else {
      // #MP3: points to an audio file
      finalAudioPath = resolveTxtReference(txtMp3File, audioFile);
    }
  } else {
    // No #MP3: in TXT, use scanned audio file
    finalAudioPath = audioFile?.path;
  }

  // If #VIDEO: is set, it overrides the video path (but #MP3: as video takes precedence for audio)
  // Skip URLs — they belong in videoBackground, not relativeVideoPath.
  if (txtVideoFile && !hasEmbeddedAudio && !txtVideoFile.startsWith('http://') && !txtVideoFile.startsWith('https://')) {
    finalVideoPath = resolveTxtReference(txtVideoFile, videoFile);
  } else if (!finalVideoPath) {
    finalVideoPath = videoFile?.path;
  }

  // Resolve cover and background paths
  const finalCoverPath = resolveTxtReference(txtCoverFile, coverFile);
  const finalBackgroundPath = resolveTxtReference(txtBackgroundFile, null);

  // Determine if this is a duet
  const isDuet = !!(p1Name || p2Name);
  const duetPlayerNames: [string, string] | undefined = isDuet
    ? [p1Name || 'Player 1', p2Name || 'Player 2']
    : undefined;



  // Parse lyrics from TXT content
  const lyrics = parseLyricsFromTxt(txtContent, bpm, gap);

  return {
    title,
    artist,
    folderPath,
    baseFolder,
    relativeTxtPath: txtFile.path,
    relativeAudioPath: finalAudioPath,
    relativeVideoPath: finalVideoPath,
    relativeCoverPath: finalCoverPath,
    relativeBackgroundPath: finalBackgroundPath,
    bpm,
    gap,
    genre,
    language,
    year,
    previewStart,
    previewDuration,
    lyrics,
    // Additional metadata
    creator,
    version,
    edition,
    tags,
    // Time control
    start,
    end,
    videoGap,
    videoStart,
    // Medley
    medleyStartBeat,
    medleyEndBeat,
    // Raw TXT metadata file references (for editor display)
    mp3File: txtMp3File,
    coverFile: txtCoverFile,
    backgroundFile: txtBackgroundFile,
    // videoFile: store all values including URLs (needed for videoBackground in import)
    videoFile: txtVideoFile || undefined,
    // Duet
    isDuet,
    duetPlayerNames,
    // Media flags
    hasEmbeddedAudio,
  };
}

// Parse lyrics (notes) from UltraStar TXT content
function parseLyricsFromTxt(content: string, bpm: number, gap: number): LyricLine[] {
  let cleanContent = normalizeTxtContent(content);

  const lines = cleanContent.split('\n').filter(l => l.trim().length > 0);
  const notes: Array<{ type: string; startBeat: number; duration: number; pitch: number; lyric: string; player?: 'P1' | 'P2' }> = [];
  const lineBreakBeats = new Set<number>();

  let currentPlayer: 'P1' | 'P2' | undefined = undefined;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === 'P1' || trimmedLine === 'P1:') { currentPlayer = 'P1'; continue; }
    if (trimmedLine === 'P2' || trimmedLine === 'P2:') { currentPlayer = 'P2'; continue; }
    if (trimmedLine.startsWith('#')) continue;
    if (trimmedLine === 'E') break;

    if (trimmedLine.startsWith('-')) {
      const lineBreakMatch = trimmedLine.match(/^-\s*(-?\d+)/);
      if (lineBreakMatch) lineBreakBeats.add(parseInt(lineBreakMatch[1]));
      continue;
    }

    const duetPrefixMatch = line.match(/^(P1|P2):\s*(.*)$/);
    let noteLine = line;
    let notePlayer: 'P1' | 'P2' | undefined = currentPlayer;
    if (duetPrefixMatch) {
      notePlayer = duetPrefixMatch[1] as 'P1' | 'P2';
      noteLine = duetPrefixMatch[2];
    }

    const noteMatch = noteLine.match(/^\s*([:*FGR])\s*(-?\d+)\s+(\d+)\s+(-?\d+)\s*(.*)$/);
    if (noteMatch) {
      const [, type, startStr, durationStr, pitchStr, lyric] = noteMatch;
      notes.push({ type, startBeat: parseInt(startStr), duration: parseInt(durationStr), pitch: parseInt(pitchStr), lyric, player: notePlayer });
      continue;
    }
  }

  return convertNotesToLyricLines(notes, lineBreakBeats, bpm, gap);
}

// Generate a unique folder name for a song
export function generateSongFolderName(title: string, artist: string): string {
  const sanitize = (str: string) =>
    str.replace(/[<>:"/\\|?*]/g, '_').trim().substring(0, 50);
  const sanitizedTitle = sanitize(title);
  const sanitizedArtist = sanitize(artist);
  return `${sanitizedArtist} - ${sanitizedTitle} (${Date.now()})`;
}

// Store song files persistently using Tauri's fs plugin
export async function storeSongFiles(
  songFolder: string,
  files: { audio?: File; video?: File; txt?: File; cover?: File }
): Promise<{ audioPath?: string; videoPath?: string; txtPath?: string; coverPath?: string }> {
  const result: { audioPath?: string; videoPath?: string; txtPath?: string; coverPath?: string } = {};

  if (!isTauri()) {
    if (files.audio) result.audioPath = URL.createObjectURL(files.audio);
    if (files.video) result.videoPath = URL.createObjectURL(files.video);
    if (files.txt) result.txtPath = URL.createObjectURL(files.txt);
    if (files.cover) result.coverPath = URL.createObjectURL(files.cover);
    return result;
  }

  try {
    await mkdir(`songs/${songFolder}`, { baseDir: BaseDirectory.AppData, recursive: true });

    const saveFile = async (file: File): Promise<string> => {
      const uint8Array = new Uint8Array(await file.arrayBuffer());
      const safeName = sanitizeFileName(file.name);
      const relativePath = `songs/${songFolder}/${safeName}`;
      await writeFile(relativePath, uint8Array, { baseDir: BaseDirectory.AppData });
      return relativePath;
    };

    if (files.audio) result.audioPath = await saveFile(files.audio);
    if (files.video) result.videoPath = await saveFile(files.video);
    if (files.txt) result.txtPath = await saveFile(files.txt);
    if (files.cover) result.coverPath = await saveFile(files.cover);
  } catch (error) {
    console.error('Failed to store song files:', error);
  }

  return result;
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
      const raw = localStorage.getItem('karaoke-songs-folder');
      songsFolder = raw ? normalizeFilePath(raw) : undefined;
    }
    
    if (!songsFolder) {
      // No base folder available - try using the path as absolute path
      if (isAbsoluteFileSystemPath(relativePath)) {

        return await loadFileAsBlobUrl(relativePath);
      }
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
        // Cache under both paths
        cacheBlobUrl(backslashPath, fallback);
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
    console.error('[TauriFS] Failed to get song media URL:', error);
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
      } catch {
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
    console.error('[TauriFS] Folder scan fallback error:', error);
    return null;
  }
}

// Load a file from the filesystem and return a blob URL
// Uses native Tauri command to bypass plugin ACL restrictions.
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
    
    // Cache the URL
    cacheBlobUrl(fullPath, blobUrl);
    

    return blobUrl;
  } catch (error) {
    console.error('[TauriFS] Failed to load file as blob:', fullPath, error);
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


