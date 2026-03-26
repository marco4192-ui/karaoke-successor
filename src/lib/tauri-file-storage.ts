// Tauri File Storage - Persistent file storage for imported songs
// This module handles copying imported files to app data directory
// so they persist across app restarts

import { writeFile, readTextFile, BaseDirectory, exists, mkdir, readDir, readFile } from '@tauri-apps/plugin-fs';
import { convertFileSrc } from '@tauri-apps/api/core';
import { LyricLine, Note, midiToFrequency } from '@/types/game';
import { logger } from '@/lib/logger';

// Check if running in Tauri
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
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
  relativeTxtPath?: string;
  relativeAudioPath?: string;
  relativeVideoPath?: string;
  relativeCoverPath?: string;
  bpm: number;
  gap: number;
  genre?: string;
  language?: string;
  year?: number;
  previewStart?: number;
  previewDuration?: number;
  // Parsed lyrics (notes data)
  lyrics?: LyricLine[];
}

export interface TauriScanResult {
  songs: TauriScannedSong[];
  errors: string[];
  scannedFiles: number;
}

// Scan a songs folder recursively using Tauri's fs plugin
// This is the PRIMARY method for loading songs in Tauri
export async function scanSongsFolderTauri(folderPath: string): Promise<TauriScanResult> {
  const result: TauriScanResult = {
    songs: [],
    errors: [],
    scannedFiles: 0,
  };

  if (!isTauri()) {
    result.errors.push('Not running in Tauri - cannot use file system scan');
    return result;
  }

  logger.info('[TauriScanner]', 'Starting scan of folder:', folderPath);

  try {
    // Collect ALL files first, then group by folder
    const allFiles = await collectAllFiles(folderPath, folderPath);
    result.scannedFiles = allFiles.length;
    
    logger.info('[TauriScanner]', `Found ${allFiles.length} files`);
    
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
    
    logger.info('[TauriScanner]', `Found ${folderMap.size} folders with files`);
    
    // Process each folder
    for (const [folderPath, files] of folderMap) {
      const song = await processFolder(folderPath, files, folderPath);
      if (song) {
        result.songs.push(song);
      }
    }
    
    logger.info('[TauriScanner]', `Scan complete: ${result.songs.length} songs found`);
  } catch (error) {
    logger.error('[TauriScanner]', 'Scan failed:', error);
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
    const entries = await readDir(currentPath);
    
    for (const entry of entries) {
      const fullPath = `${currentPath}/${entry.name}`;
      const relativePath = fullPath.startsWith(basePath + '/') 
        ? fullPath.slice(basePath.length + 1) 
        : fullPath;
      
      // Check if it's a directory using Tauri v2 API
      if ('isDirectory' in entry && entry.isDirectory) {
        // Recurse into subdirectory
        const subFiles = await collectAllFiles(basePath, fullPath);
        files.push(...subFiles);
      } else if ('isFile' in entry && entry.isFile) {
        // It's a file
        files.push({
          relativePath,
          fullPath,
          name: entry.name,
        });
      }
    }
  } catch (error) {
    logger.warn('[TauriScanner]', 'Could not read directory:', currentPath, error);
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
  
  // Read TXT content
  let txtContent: string | null = null;
  try {
    const fullPath = `${baseFolder}/${txtFile.path}`;
    txtContent = await readTextFile(fullPath);
  } catch (e) {
    logger.warn('[TauriScanner]', 'Could not read TXT:', txtFile.path);
    return null;
  }
  
  if (!txtContent) {
    return null;
  }
  
  // Parse metadata from TXT
  const lines = txtContent.split('\n');
  
  let title = 'Unknown';
  let artist = 'Unknown';
  let bpm = 120;
  let gap = 0;
  let genre: string | undefined;
  let language: string | undefined;
  let year: number | undefined;
  let previewStart: number | undefined;
  let previewDuration: number | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
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
    } else if (trimmed.startsWith('#PREVIEWSTART:')) {
      previewStart = parseFloat(trimmed.substring(13)) || undefined;
    } else if (trimmed.startsWith('#PREVIEWDURATION:')) {
      previewDuration = parseFloat(trimmed.substring(16)) || undefined;
    }
  }

  logger.info('[TauriScanner]', `Created song: ${artist} - ${title} (audio: ${!!audioFile}, video: ${!!videoFile})`);

  // Parse lyrics from TXT content
  const lyrics = parseLyricsFromTxt(txtContent, bpm, gap);

  return {
    title,
    artist,
    folderPath,
    relativeTxtPath: txtFile.path,
    relativeAudioPath: audioFile?.path,
    relativeVideoPath: videoFile?.path,
    relativeCoverPath: coverFile?.path,
    bpm,
    gap,
    genre,
    language,
    year,
    previewStart,
    previewDuration,
    lyrics,
  };
}

// Parse lyrics (notes) from UltraStar TXT content
function parseLyricsFromTxt(content: string, bpm: number, gap: number): LyricLine[] {
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const notes: Array<{ type: string; startBeat: number; duration: number; pitch: number; lyric: string; player?: 'P1' | 'P2' }> = [];
  const lineBreakBeats = new Set<number>();
  
  let currentPlayer: 'P1' | 'P2' | undefined = undefined;
  
  for (const line of lines) {
    // Check for player markers
    if (line === 'P1' || line === 'P1:') {
      currentPlayer = 'P1';
      continue;
    }
    if (line === 'P2' || line === 'P2:') {
      currentPlayer = 'P2';
      continue;
    }
    
    // Skip headers
    if (line.startsWith('#')) continue;
    if (line === 'E') break;
    
    // Line break
    const lineBreakMatch = line.match(/^-\s*(-?\d+)/);
    if (lineBreakMatch) {
      lineBreakBeats.add(parseInt(lineBreakMatch[1]));
      continue;
    }
    
    // Check for P1/P2 prefix in note line
    const duetPrefixMatch = line.match(/^(P1|P2):\s*(.*)$/);
    let noteLine = line;
    let notePlayer: 'P1' | 'P2' | undefined = currentPlayer;
    
    if (duetPrefixMatch) {
      notePlayer = duetPrefixMatch[1] as 'P1' | 'P2';
      noteLine = duetPrefixMatch[2];
    }
    
    // Parse note - use the ORIGINAL line (not trimmed) to preserve trailing spaces
    const noteMatch = noteLine.match(/^([:*FGR])\s*(-?\d+)\s+(\d+)\s+(-?\d+)\s*(.*)$/);
    if (noteMatch) {
      const [, type, startStr, durationStr, pitchStr, lyric] = noteMatch;
      notes.push({
        type,
        startBeat: parseInt(startStr),
        duration: parseInt(durationStr),
        pitch: parseInt(pitchStr),
        lyric,
        player: notePlayer,
      });
    }
  }
  
  // Convert to LyricLines
  const beatDuration = 15000 / bpm;
  const MIDI_BASE_OFFSET = 48;
  const lyricLines: LyricLine[] = [];
  let currentLineNotes: Note[] = [];
  let currentLineText = '';
  let currentLinePlayer: 'P1' | 'P2' | 'both' | undefined = undefined;
  
  const sortedNotes = [...notes].sort((a, b) => a.startBeat - b.startBeat);
  
  for (let i = 0; i < sortedNotes.length; i++) {
    const note = sortedNotes[i];
    const noteEndBeat = note.startBeat + note.duration;
    const startTime = gap + (note.startBeat * beatDuration);
    const duration = note.duration * beatDuration;
    
    // Skip hyphen separators
    if (note.lyric === '-' || (note.lyric.trim() === '-' && note.lyric.length <= 2)) {
      if (currentLineNotes.length > 0) {
        const lineStartTime = currentLineNotes[0].startTime;
        const lineEndTime = currentLineNotes[currentLineNotes.length - 1].startTime + currentLineNotes[currentLineNotes.length - 1].duration;
        let finalLineText = currentLineText.replace(/^\s+/, '');
        if (finalLineText.endsWith(' -')) finalLineText = finalLineText.slice(0, -2);
        else if (finalLineText.endsWith('-') && !finalLineText.endsWith('--')) finalLineText = finalLineText.slice(0, -1);
        
        if (finalLineText) {
          lyricLines.push({
            id: `line-${lyricLines.length}`,
            text: finalLineText,
            startTime: lineStartTime,
            endTime: lineEndTime,
            notes: currentLineNotes,
            player: currentLinePlayer,
          });
        }
        currentLineNotes = [];
        currentLineText = '';
        currentLinePlayer = undefined;
      }
      continue;
    }
    
    const convertedNote: Note = {
      id: `note-${lyricLines.length}-${currentLineNotes.length}`,
      pitch: note.pitch + MIDI_BASE_OFFSET,
      frequency: midiToFrequency(note.pitch + MIDI_BASE_OFFSET),
      startTime: Math.round(startTime),
      duration: Math.round(duration),
      lyric: note.lyric,
      isBonus: note.type === 'F',
      isGolden: note.type === '*' || note.type === 'G',
      player: note.player,
    };
    
    currentLineNotes.push(convertedNote);
    currentLineText += note.lyric;
    
    if (currentLinePlayer === undefined) {
      currentLinePlayer = note.player;
    } else if (currentLinePlayer !== note.player && note.player !== undefined) {
      currentLinePlayer = 'both';
    }
    
    // Check for line break
    const isLineBreak = lineBreakBeats.has(noteEndBeat) ||
      (i < sortedNotes.length - 1 && sortedNotes[i + 1].startBeat - noteEndBeat >= 8);
    
    if ((isLineBreak || i === sortedNotes.length - 1) && currentLineNotes.length > 0) {
      const lineStartTime = currentLineNotes[0].startTime;
      const lineEndTime = currentLineNotes[currentLineNotes.length - 1].startTime + currentLineNotes[currentLineNotes.length - 1].duration;
      let finalLineText = currentLineText.replace(/^\s+/, '');
      if (finalLineText.endsWith(' -')) finalLineText = finalLineText.slice(0, -2);
      else if (finalLineText.endsWith('-') && !finalLineText.endsWith('--')) finalLineText = finalLineText.slice(0, -1);
      
      if (finalLineText) {
        lyricLines.push({
          id: `line-${lyricLines.length}`,
          text: finalLineText,
          startTime: lineStartTime,
          endTime: lineEndTime,
          notes: currentLineNotes,
          player: currentLinePlayer,
        });
      }
      currentLineNotes = [];
      currentLineText = '';
      currentLinePlayer = undefined;
    }
  }
  
  return lyricLines;
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
    logger.error('[TauriFS]', 'Failed to copy file to app data:', error);
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
    logger.error('[TauriFS]', 'Failed to get app data path:', error);
    return null;
  }
}

// Check if a file exists in app data
export async function fileExistsInAppData(relativePath: string): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    return await exists(relativePath, { baseDir: BaseDirectory.AppData });
  } catch (error) {
    logger.error('[TauriFS]', 'Failed to check file existence:', error);
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
    logger.error('[TauriFS]', 'Failed to get file URL:', error);
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
    logger.error('[TauriFS]', 'Failed to read file as base64:', error);
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
    logger.error('[TauriFS]', 'Failed to list imported songs:', error);
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
    logger.error('[TauriFS]', 'Failed to store song files:', error);
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
    logger.error('[TauriFS]', 'Failed to get playable URL:', error);
  }

  // Fallback: return the relative path
  return relativePath;
}

// Get a playable URL for a song media file (from songs folder)
// This is the PRIMARY method for loading audio/video/cover in Tauri
// IMPORTANT: In Tauri v2 with dev server, we need to load files directly and create blob URLs
// because convertFileSrc doesn't work well with http://localhost:3000 origin
export async function getSongMediaUrl(relativePath: string, baseFolder?: string): Promise<string | null> {
  if (!isTauri()) {
    // Browser mode - return the path as-is (should be a blob URL)
    return relativePath;
  }

  try {
    // Priority 1: Use provided base folder
    // Priority 2: Use localStorage 'karaoke-songs-folder'
    let songsFolder = baseFolder;
    
    if (!songsFolder) {
      songsFolder = localStorage.getItem('karaoke-songs-folder') || undefined;
    }
    
    if (!songsFolder) {
      // No base folder available - try using the path as absolute path
      if (relativePath.startsWith('/') || relativePath.match(/^[A-Za-z]:\\/)) {
        logger.info('[TauriFS]', 'Using absolute path directly:', relativePath);
        return await loadFileAsBlobUrl(relativePath);
      }
      logger.warn('[TauriFS]', 'No songs folder configured and path is not absolute');
      return null;
    }
    
    // Construct full path
    const fullPath = `${songsFolder}/${relativePath}`;
    logger.info('[TauriFS]', 'Loading media from:', fullPath);
    
    // Check cache first
    const cachedUrl = blobUrlCache.get(fullPath);
    if (cachedUrl) {
      logger.debug('[TauriFS]', 'Using cached blob URL for:', fullPath);
      return cachedUrl;
    }
    
    // Load file and create blob URL
    return await loadFileAsBlobUrl(fullPath);
  } catch (error) {
    logger.error('[TauriFS]', 'Failed to get song media URL:', error);
    return null;
  }
}

// Load a file from the filesystem and return a blob URL
// This is the most reliable way to load media in Tauri v2 with dev server
async function loadFileAsBlobUrl(fullPath: string): Promise<string | null> {
  try {
    // Read file as Uint8Array
    const fileData = await readFile(fullPath);
    
    // Determine MIME type from extension
    const ext = '.' + fullPath.split('.').pop()?.toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // Create blob and URL
    const blob = new Blob([fileData], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    
    // Cache the URL
    blobUrlCache.set(fullPath, blobUrl);
    
    logger.info('[TauriFS]', 'Created blob URL for:', fullPath, 'MIME:', mimeType, 'Size:', fileData.length);
    return blobUrl;
  } catch (error) {
    logger.error('[TauriFS]', 'Failed to load file as blob:', fullPath, error);
    return null;
  }
}

// Clear blob URL cache (call when songs are re-scanned)
export function clearBlobUrlCache(): void {
  for (const url of blobUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  blobUrlCache.clear();
  logger.info('[TauriFS]', 'Blob URL cache cleared');
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
    logger.error('[TauriFS]', 'Failed to read text file:', error);
    return null;
  }
}
