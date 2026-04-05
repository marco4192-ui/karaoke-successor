// Tauri File Storage - Persistent file storage for imported songs
// This module handles copying imported files to app data directory
// so they persist across app restarts

import { writeFile, readTextFile, BaseDirectory, exists, mkdir } from '@tauri-apps/plugin-fs';
import { convertFileSrc } from '@tauri-apps/api/core';
import { LyricLine } from '@/types/game';
import { convertNotesToLyricLines } from '@/lib/parsers/notes-to-lyric-lines';
import {
  nativeReadFileBytes,
  nativeReadFileText,
  nativeReadDir,
} from '@/lib/native-fs';

// Check if running in Tauri
// Tauri v2 may use __TAURI_INTERNALS__ instead of __TAURI__
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  // Check for both Tauri v1 and v2
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window;
}

// Dynamic import for Tauri APIs
async function getTauri() {
  if (!isTauri()) return null;
  return await import('@tauri-apps/api/core');
}

// In-memory cache for blob URLs to avoid recreating them
const blobUrlCache = new Map<string, string>();

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

  console.log('[TauriScanner] Starting scan of folder:', baseSongsFolder);

  try {
    // Collect ALL files first, then group by folder
    const allFiles = await collectAllFiles(baseSongsFolder, baseSongsFolder);
    result.scannedFiles = allFiles.length;
    
    console.log(`[TauriScanner] Found ${allFiles.length} files`);
    
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
    
    console.log(`[TauriScanner] Found ${folderMap.size} folders with files`);
    
    // Process each folder
    // CRITICAL: Pass the absolute baseSongsFolder, NOT the relative songFolder from the map!
    // This is essential for getSongMediaUrl to construct correct absolute paths later
    for (const [songFolder, files] of folderMap) {
      const song = await processFolder(songFolder, files, baseSongsFolder);
      if (song) {
        result.songs.push(song);
      }
    }
    
    console.log(`[TauriScanner] Scan complete: ${result.songs.length} songs found`);
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
      const normalizedBase = basePath.replace(/\\/g, '/');
      const normalizedFull = fullPath.replace(/\\/g, '/');
      
      const relativePath = normalizedFull.startsWith(normalizedBase + '/')
        ? normalizedFull.slice(normalizedBase.length + 1)
        : normalizedFull;
      
      if (entry.is_directory) {
        const subFiles = await collectAllFiles(basePath, fullPath);
        files.push(...subFiles);
      } else if (entry.is_file) {
        files.push({
          relativePath,
          fullPath,
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
    const normalizedBase = baseFolder.replace(/\\/g, '/');
    const fullPath = `${normalizedBase}/${txtFile.path}`;
    txtContent = await nativeReadFileText(fullPath);
  } catch (e) {
    console.warn('[TauriScanner] Could not read TXT:', txtFile.path, e);
    return null;
  }
  
  if (!txtContent) {
    return null;
  }
  
  // Parse metadata from TXT
  const lines = txtContent.split('\n');

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
      videoGap = parseInt(trimmed.substring(10)) || undefined;
    } else if (trimmed.startsWith('#VIDEOSTART:')) {
      videoStart = parseInt(trimmed.substring(12)) || undefined;
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
  const normalizedTxtPath = txtFile.path.replace(/\\/g, '/');
  const txtDir = normalizedTxtPath.includes('/') ? normalizedTxtPath.substring(0, normalizedTxtPath.lastIndexOf('/')) : '';
  
  // Helper to resolve file reference from TXT header
  const resolveTxtReference = (refFile: string | undefined, fallbackFile: { path: string } | null): string | undefined => {
    if (refFile) {
      // Reference from TXT - combine with TXT directory
      // The reference is typically just a filename, relative to the TXT file location
      const resolvedPath = txtDir ? `${txtDir}/${refFile}` : refFile;
      console.log(`[TauriScanner] Resolved TXT reference: ${refFile} -> ${resolvedPath}`);
      return resolvedPath;
    }
    // Fallback to scanned file
    return fallbackFile?.path;
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
      console.log(`[TauriScanner] #MP3: points to video file: ${txtMp3File} -> hasEmbeddedAudio=true`);
    } else {
      // #MP3: points to an audio file
      finalAudioPath = resolveTxtReference(txtMp3File, audioFile);
    }
  } else {
    // No #MP3: in TXT, use scanned audio file
    finalAudioPath = audioFile?.path;
  }

  // If #VIDEO: is set, it overrides the video path (but #MP3: as video takes precedence for audio)
  if (txtVideoFile && !hasEmbeddedAudio) {
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

  console.log(`[TauriScanner] Created song: ${artist} - ${title}`);
  console.log(`[TauriScanner]   baseFolder: ${baseFolder}`);
  console.log(`[TauriScanner]   TXT dir: ${txtDir || '(root)'}`);
  console.log(`[TauriScanner]   audio: ${finalAudioPath || 'none'}`);
  console.log(`[TauriScanner]   video: ${finalVideoPath || 'none'}`);
  console.log(`[TauriScanner]   cover: ${finalCoverPath || 'none'}`);
  console.log(`[TauriScanner]   background: ${finalBackgroundPath || 'none'}`);
  console.log(`[TauriScanner]   hasEmbeddedAudio: ${hasEmbeddedAudio}`);
  console.log(`[TauriScanner]   isDuet: ${isDuet}`);

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
    // Duet
    isDuet,
    duetPlayerNames,
    // Media flags
    hasEmbeddedAudio,
  };
}

// Parse lyrics (notes) from UltraStar TXT content
function parseLyricsFromTxt(content: string, bpm: number, gap: number): LyricLine[] {
  const lines = content.split('\n').filter(l => l.trim().length > 0);
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
    }
  }

  return convertNotesToLyricLines(notes, lineBreakBeats, bpm, gap);
}

// Copy a file to the app's persistent data directory
export async function copyFileToAppData(
  sourcePath: string,
  relativePath: string
): Promise<string | null> {
  const tauri = await getTauri();
  if (!tauri) return null;

  try {
    const result = await tauri.invoke<string>('copy_file_to_app_data', {
      sourcePath,
      relativePath,
    });
    return result;
  } catch (error) {
    console.error('Failed to copy file to app data:', error);
    return null;
  }
}

// Get the app data directory path
export async function getAppDataPath(): Promise<string | null> {
  const tauri = await getTauri();
  if (!tauri) return null;

  try {
    return await tauri.invoke<string>('get_app_data_path');
  } catch (error) {
    console.error('Failed to get app data path:', error);
    return null;
  }
}

// Check if a file exists in app data
export async function fileExistsInAppData(relativePath: string): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    return await exists(relativePath, { baseDir: BaseDirectory.AppData });
  } catch (error) {
    console.error('Failed to check file existence:', error);
    return false;
  }
}

// Get a file URL for playback (file:// URL)
export async function getFileUrl(relativePath: string): Promise<string | null> {
  const tauri = await getTauri();
  if (!tauri) return null;

  try {
    return await tauri.invoke<string>('get_file_url', {
      relativePath,
    });
  } catch (error) {
    console.error('Failed to get file URL:', error);
    return null;
  }
}

// Read file as base64 (for small files or fallback)
export async function readFileAsBase64(relativePath: string): Promise<string | null> {
  const tauri = await getTauri();
  if (!tauri) return null;

  try {
    return await tauri.invoke<string>('read_file_as_base64', {
      relativePath,
    });
  } catch (error) {
    console.error('Failed to read file as base64:', error);
    return null;
  }
}

// List all imported song folders
export async function listImportedSongs(): Promise<string[]> {
  const tauri = await getTauri();
  if (!tauri) return [];

  try {
    return await tauri.invoke<string[]>('list_imported_songs');
  } catch (error) {
    console.error('Failed to list imported songs:', error);
    return [];
  }
}

// Generate a unique folder name for a song
export function generateSongFolderName(title: string, artist: string): string {
  // Sanitize and create a folder name
  const sanitize = (str: string) => 
    str.replace(/[<>:"/\\|?*]/g, '_').trim().substring(0, 50);
  
  const sanitizedTitle = sanitize(title);
  const sanitizedArtist = sanitize(artist);
  const timestamp = Date.now();
  
  return `${sanitizedArtist} - ${sanitizedTitle} (${timestamp})`;
}

// Store song files persistently using Tauri's fs plugin
export async function storeSongFiles(
  songFolder: string,
  files: {
    audio?: File;
    video?: File;
    txt?: File;
    cover?: File;
  }
): Promise<{
  audioPath?: string;
  videoPath?: string;
  txtPath?: string;
  coverPath?: string;
}> {
  const result: {
    audioPath?: string;
    videoPath?: string;
    txtPath?: string;
    coverPath?: string;
  } = {};

  if (!isTauri()) {
    // Browser mode: create blob URLs
    if (files.audio) result.audioPath = URL.createObjectURL(files.audio);
    if (files.video) result.videoPath = URL.createObjectURL(files.video);
    if (files.txt) result.txtPath = URL.createObjectURL(files.txt);
    if (files.cover) result.coverPath = URL.createObjectURL(files.cover);
    return result;
  }

  // Tauri mode: Save files to app data directory
  try {
    // Create songs directory
    await mkdir(`songs/${songFolder}`, { 
      baseDir: BaseDirectory.AppData, 
      recursive: true 
    });
    
    const saveFile = async (file: File, type: string): Promise<string> => {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const relativePath = `songs/${songFolder}/${file.name}`;
      
      // Save using Tauri fs plugin (writeFile is the correct function name)
      await writeFile(relativePath, uint8Array, { 
        baseDir: BaseDirectory.AppData,
      });
      
      return relativePath;
    };

    if (files.audio) {
      result.audioPath = await saveFile(files.audio, 'audio');
    }
    if (files.video) {
      result.videoPath = await saveFile(files.video, 'video');
    }
    if (files.txt) {
      result.txtPath = await saveFile(files.txt, 'txt');
    }
    if (files.cover) {
      result.coverPath = await saveFile(files.cover, 'cover');
    }
  } catch (error) {
    console.error('Failed to store song files:', error);
  }

  return result;
}

// Get a playable URL for a stored file (from app data directory)
export async function getPlayableUrl(relativePath: string): Promise<string> {
  if (!isTauri()) {
    // Browser mode - the path should already be a blob URL
    return relativePath;
  }

  // In Tauri, load the file and create a blob URL
  try {
    const appDataPath = await getAppDataPath();
    
    if (appDataPath) {
      const fullPath = `${appDataPath}/${relativePath}`;
      
      // Check cache first
      const cachedUrl = blobUrlCache.get(fullPath);
      if (cachedUrl) {
        return cachedUrl;
      }
      
      // Load file and create blob URL
      const blobUrl = await loadFileAsBlobUrl(fullPath);
      if (blobUrl) {
        return blobUrl;
      }
    }
  } catch (error) {
    console.error('Failed to get playable URL:', error);
  }

  // Fallback: return the relative path
  return relativePath;
}

// Get a playable URL for a song media file (from songs folder)
// This is the PRIMARY method for loading audio/video/cover in Tauri
// IMPORTANT: In Tauri v2 with dev server, we need to load files directly and create blob URLs
// because convertFileSrc doesn't work well with http://localhost:3000 origin
export async function getSongMediaUrl(relativePath: string, baseFolder?: string): Promise<string | null> {
  console.log('[TauriFS] getSongMediaUrl called:', { relativePath, baseFolder, isTauri: isTauri() });
  
  if (!isTauri()) {
    // Browser mode - return the path as-is (should be a blob URL)
    console.log('[TauriFS] Not in Tauri, returning path as-is');
    return relativePath;
  }

  try {
    // Priority 1: Use provided base folder
    // Priority 2: Use localStorage 'karaoke-songs-folder'
    let songsFolder = baseFolder;
    
    if (!songsFolder) {
      songsFolder = localStorage.getItem('karaoke-songs-folder') || undefined;
      console.log('[TauriFS] Using localStorage folder:', songsFolder);
    }
    
    if (!songsFolder) {
      // No base folder available - try using the path as absolute path
      if (relativePath.startsWith('/') || relativePath.match(/^[A-Za-z]:\\/)) {
        console.log('[TauriFS] Using absolute path directly:', relativePath);
        return await loadFileAsBlobUrl(relativePath);
      }
      console.warn('[TauriFS] No songs folder configured and path is not absolute');
      return null;
    }
    
    // Normalize paths - handle both forward and backward slashes
    // Remove trailing slash from songsFolder
    const normalizedBaseFolder = songsFolder.replace(/[\/\\]+$/, '');
    // Normalize the relative path (convert backslashes to forward slashes)
    const normalizedRelativePath = relativePath.replace(/\\/g, '/');
    
    // Construct full path using forward slash (works on both Windows and Unix)
    const fullPath = `${normalizedBaseFolder}/${normalizedRelativePath}`;
    console.log('[TauriFS] Loading media from:', fullPath);
    
    // Check cache first
    const cachedUrl = blobUrlCache.get(fullPath);
    if (cachedUrl) {
      console.log('[TauriFS] Using cached blob URL for:', fullPath);
      return cachedUrl;
    }
    
    // Load file and create blob URL
    const result = await loadFileAsBlobUrl(fullPath);
    console.log('[TauriFS] loadFileAsBlobUrl result:', result ? 'success' : 'failed');
    return result;
  } catch (error) {
    console.error('[TauriFS] Failed to get song media URL:', error);
    return null;
  }
}

// Load a file from the filesystem and return a blob URL
// Uses native Tauri command to bypass plugin ACL restrictions.
async function loadFileAsBlobUrl(fullPath: string): Promise<string | null> {
  console.log('[TauriFS] loadFileAsBlobUrl called for:', fullPath);
  
  try {
    // Use native command — returns base64-encoded bytes (bypass ACL)
    const base64Data = await nativeReadFileBytes(fullPath);
    
    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    console.log('[TauriFS] File read successfully (native), size:', bytes.length);
    
    // Determine MIME type from extension
    const ext = '.' + fullPath.split('.').pop()?.toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // Create blob and URL
    const blob = new Blob([bytes], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    
    // Cache the URL
    blobUrlCache.set(fullPath, blobUrl);
    
    console.log('[TauriFS] Created blob URL for:', fullPath, 'MIME:', mimeType, 'Size:', bytes.length);
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
  console.log('[TauriFS] Blob URL cache cleared');
}

// Read stored file content as text (for txt files)
export async function readStoredTextFile(relativePath: string): Promise<string | null> {
  if (!isTauri()) {
    // Browser mode - can't read blob URLs as text easily
    return null;
  }

  try {
    return await readTextFile(relativePath, { 
      baseDir: BaseDirectory.AppData 
    });
  } catch (error) {
    console.error('Failed to read text file:', error);
    return null;
  }
}
