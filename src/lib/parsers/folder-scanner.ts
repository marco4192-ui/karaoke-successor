// Folder Scanner - Scans folders for karaoke songs
// Supports nested folder structure with categories

import { Song, Note, LyricLine, midiToFrequency, Difficulty } from '@/types/game';
import { CachedSong, CachedFolder, LibraryCache, createCachedSong, saveCache, loadCache } from '@/lib/game/library-cache';
import { storeMedia } from '@/lib/db/media-db';

export interface ScannedFile {
  name: string;
  path: string;
  type: 'audio' | 'video' | 'txt' | 'cover';
  file?: File;
  url?: string;
}

export interface ScannedSong {
  title: string;
  artist: string;
  audioFile?: File;
  videoFile?: File;
  txtFile?: File;
  coverFile?: File;
  backgroundFile?: File;
  audioUrl?: string;
  videoUrl?: string;
  coverUrl?: string;
  backgroundUrl?: string;
  folder: string;
  folderPath: string;
  baseFolder?: string; // CRITICAL: Root folder for media loading
  previewStart?: number;
  previewDuration?: number;
  genre?: string;
  language?: string;
  year?: number;
}

export interface ScanResult {
  songs: ScannedSong[];
  folders: CachedFolder[];
  errors: string[];
}

// Supported file extensions - expanded for broader compatibility
const AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.wav', '.m4a', '.flac', '.aac', '.wma', '.opus', '.weba', '.aiff', '.aif'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.m4v', '.3gp', '.ogv', '.ts'];
const TXT_EXTENSIONS = ['.txt'];
const COVER_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const BACKGROUND_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

// Cover file name patterns (in order of priority)
const COVER_PATTERNS = [
  /^cover/i,
  /^folder/i,
  /^front/i,
  /^album/i,
  /^\[co\]/i, // UltraStar cover tag pattern
];

// Background file name patterns (in order of priority)
const BACKGROUND_PATTERNS = [
  /^background/i,
  /^bg/i,
  /^back/i,
  /^\[bg\]/i, // UltraStar background tag pattern
];

// Check if File System Access API is supported
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

// Load cached library or scan fresh
export async function getLibrary(): Promise<LibraryCache | null> {
  return await loadCache();
}

// Scan a folder using File System Access API
export async function scanFolderWithPicker(): Promise<ScanResult> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API not supported in this browser');
  }

  try {
    // @ts-ignore - TypeScript doesn't know about showDirectoryPicker
    const dirHandle = await window.showDirectoryPicker({
      mode: 'read',
    });

    // Get the folder name as baseFolder reference
    // Note: For Tauri, use scanSongsFolderTauri instead which provides actual filesystem paths
    const baseFolder = dirHandle.name;

    return await scanDirectoryHandle(dirHandle, '', null, baseFolder);
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      return { songs: [], folders: [], errors: ['Folder selection cancelled'] };
    }
    throw e;
  }
}

// Scan a directory handle recursively
async function scanDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle, 
  path: string,
  parentPath: string | null,
  baseFolder: string // Root folder name for media loading
): Promise<ScanResult> {
  const result: ScanResult = { songs: [], folders: [], errors: [] };
  const songFolders: Map<string, ScannedSong> = new Map();
  const subFolders: CachedFolder[] = [];
  
  // Check if this folder contains song files directly
  let hasSongFiles = false;
  const entries: Array<{ entry: FileSystemHandle; fullPath: string }> = [];

  for await (const entry of (dirHandle as any).values() as AsyncIterable<FileSystemHandle>) {
    const fullPath = path ? `${path}/${entry.name}` : entry.name;
    entries.push({ entry, fullPath });
    
    if (entry.kind === 'file') {
      const ext = '.' + entry.name.split('.').pop()?.toLowerCase();
      if (AUDIO_EXTENSIONS.includes(ext) || VIDEO_EXTENSIONS.includes(ext) || TXT_EXTENSIONS.includes(ext)) {
        hasSongFiles = true;
      }
    }
  }

  // Process entries
  for (const { entry, fullPath } of entries) {
    if (entry.kind === 'directory') {
      try {
        // @ts-ignore - Pass baseFolder to recursive calls
        const subResult = await scanDirectoryHandle(entry, fullPath, path, baseFolder);
        result.songs.push(...subResult.songs);
        result.folders.push(...subResult.folders);
        result.errors.push(...subResult.errors);
        
        // Add as subfolder if it contains songs
        if (subResult.songs.length > 0 || subResult.folders.length > 0) {
          subFolders.push({
            name: entry.name,
            path: fullPath,
            parentPath: path || undefined,
            isSongFolder: subResult.songs.some(s => s.folderPath === fullPath),
            songCount: subResult.songs.filter(s => s.folderPath === fullPath).length,
            coverImage: subResult.songs.find(s => s.coverUrl)?.coverUrl,
          });
        }
      } catch (e) {
        result.errors.push(`Failed to scan ${fullPath}: ${(e as Error).message}`);
      }
    } else if (entry.kind === 'file') {
      const ext = '.' + entry.name.split('.').pop()?.toLowerCase();
      const folderName = path.split('/').pop() || 'Root';
      
      // @ts-ignore
      const file = await entry.getFile();

      // If folder has song files, add to song folders
      if (hasSongFiles) {
        if (!songFolders.has(path)) {
          songFolders.set(path, {
            title: folderName,
            artist: 'Unknown',
            folder: folderName,
            folderPath: path,
            baseFolder, // CRITICAL: Set baseFolder for media loading
          });
        }

        const songData = songFolders.get(path)!;

        if (AUDIO_EXTENSIONS.includes(ext)) {
          songData.audioFile = file;
          songData.audioUrl = URL.createObjectURL(file);
        } else if (VIDEO_EXTENSIONS.includes(ext)) {
          songData.videoFile = file;
          songData.videoUrl = URL.createObjectURL(file);
        } else if (TXT_EXTENSIONS.includes(ext)) {
          songData.txtFile = file;
        } else if (COVER_EXTENSIONS.includes(ext)) {
          // Check if this should be the cover
          const isPriorityCover = COVER_PATTERNS.some(p => p.test(file.name));
          const isPriorityBackground = BACKGROUND_PATTERNS.some(p => p.test(file.name));
          
          // If it matches background patterns, use as background
          if (isPriorityBackground && !songData.backgroundFile) {
            songData.backgroundFile = file;
            songData.backgroundUrl = URL.createObjectURL(file);
          }
          
          // If it matches cover patterns or no cover exists yet, use as cover
          if (isPriorityCover || !songData.coverFile) {
            songData.coverFile = file;
            songData.coverUrl = URL.createObjectURL(file);
          }
        } else if (BACKGROUND_EXTENSIONS.includes(ext)) {
          // Explicitly check for background images
          const isPriorityBackground = BACKGROUND_PATTERNS.some(p => p.test(file.name));
          if (!songData.backgroundFile || isPriorityBackground) {
            songData.backgroundFile = file;
            songData.backgroundUrl = URL.createObjectURL(file);
          }
        }
      }
    }
  }

  // Convert folder map to songs array and parse metadata
  for (const [folderPath, songData] of songFolders) {
    if (songData.audioFile || songData.videoFile) {
      // Parse txt file for metadata
      if (songData.txtFile) {
        try {
          const txtContent = await songData.txtFile.text();
          const metadata = parseUltraStarMetadata(txtContent);
          songData.title = metadata.title || songData.folder;
          songData.artist = metadata.artist || 'Unknown';
          songData.previewStart = metadata.previewStart;
          songData.previewDuration = metadata.previewDuration;
          songData.genre = metadata.genre;
          songData.language = metadata.language;
          songData.year = metadata.year;
        } catch (e) {
          result.errors.push(`Failed to parse ${folderPath}: ${(e as Error).message}`);
        }
      }
      result.songs.push(songData);
    }
  }

  // Add current folder if it contains songs
  if (result.songs.some(s => s.folderPath === path)) {
    result.folders.push({
      name: dirHandle.name,
      path: path || '/',
      parentPath: parentPath || undefined,
      isSongFolder: true,
      songCount: result.songs.filter(s => s.folderPath === path).length,
      coverImage: result.songs.find(s => s.folderPath === path && s.coverUrl)?.coverUrl,
    });
  }

  return result;
}

// Parse UltraStar txt file for metadata
function parseUltraStarMetadata(content: string): { 
  title: string; 
  artist: string; 
  bpm: number;
  gap: number;
  previewStart?: number;
  previewDuration?: number;
  genre?: string;
  language?: string;
  year?: number;
} {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  let title = 'Unknown';
  let artist = 'Unknown';
  let bpm = 120;
  let gap = 0;
  let previewStart: number | undefined;
  let previewDuration: number | undefined;
  let genre: string | undefined;
  let language: string | undefined;
  let year: number | undefined;

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
    } else if (trimmed.startsWith('#PREVIEWSTART:')) {
      previewStart = parseFloat(trimmed.substring(13)) || undefined;
    } else if (trimmed.startsWith('#PREVIEWDURATION:')) {
      previewDuration = parseFloat(trimmed.substring(16)) || undefined;
    } else if (trimmed.startsWith('#GENRE:')) {
      genre = trimmed.substring(7).trim();
    } else if (trimmed.startsWith('#LANGUAGE:')) {
      language = trimmed.substring(10).trim();
    } else if (trimmed.startsWith('#YEAR:')) {
      year = parseInt(trimmed.substring(6)) || undefined;
    }
  }

  return { title, artist, bpm, gap, previewStart, previewDuration, genre, language, year };
}

// Scan files from a FileList (fallback for browsers without File System Access API)
export async function scanFilesFromFileList(files: FileList): Promise<ScanResult> {
  const result: ScanResult = { songs: [], folders: [], errors: [] };
  const songFolders: Map<string, ScannedSong> = new Map();
  const folderMap: Map<string, { parentPath: string | null; songs: ScannedSong[] }> = new Map();

  // Extract baseFolder from the first file's path
  let baseFolder: string | undefined = undefined;
  if (files.length > 0) {
    const firstPath = files[0].webkitRelativePath;
    if (firstPath) {
      // The root folder is the first part of the path
      baseFolder = firstPath.split('/')[0];
      console.log('[FolderScanner] Extracted baseFolder from FileList:', baseFolder);
    }
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const pathParts = file.webkitRelativePath.split('/');
    
    // Determine the song folder (the immediate parent folder)
    let songFolderPath: string;
    let folderName: string;
    
    if (pathParts.length >= 3) {
      // Structure: root/category/song/file.ext
      songFolderPath = pathParts.slice(0, 3).join('/');
      folderName = pathParts[2];
    } else if (pathParts.length === 2) {
      // Structure: root/song/file.ext
      songFolderPath = pathParts.slice(0, 2).join('/');
      folderName = pathParts[1];
    } else {
      continue;
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!songFolders.has(songFolderPath)) {
      songFolders.set(songFolderPath, {
        title: folderName,
        artist: 'Unknown',
        folder: folderName,
        folderPath: songFolderPath,
        baseFolder, // CRITICAL: Set baseFolder for media loading
      });
    }

    const songData = songFolders.get(songFolderPath)!;

    if (AUDIO_EXTENSIONS.includes(ext)) {
      songData.audioFile = file;
      songData.audioUrl = URL.createObjectURL(file);
    } else if (VIDEO_EXTENSIONS.includes(ext)) {
      songData.videoFile = file;
      songData.videoUrl = URL.createObjectURL(file);
    } else if (TXT_EXTENSIONS.includes(ext)) {
      songData.txtFile = file;
    } else if (COVER_EXTENSIONS.includes(ext)) {
      const isPriorityCover = COVER_PATTERNS.some(p => p.test(file.name));
      if (!songData.coverFile || isPriorityCover) {
        songData.coverFile = file;
        songData.coverUrl = URL.createObjectURL(file);
      }
    }
  }

  // Parse metadata and build folder structure
  for (const [folderPath, songData] of songFolders) {
    if (songData.audioFile || songData.videoFile) {
      if (songData.txtFile) {
        try {
          const txtContent = await songData.txtFile.text();
          const metadata = parseUltraStarMetadata(txtContent);
          songData.title = metadata.title || songData.folder;
          songData.artist = metadata.artist || 'Unknown';
          songData.previewStart = metadata.previewStart;
          songData.previewDuration = metadata.previewDuration;
          songData.genre = metadata.genre;
          songData.language = metadata.language;
          songData.year = metadata.year;
        } catch (e) {
          result.errors.push(`Failed to parse ${folderPath}: ${(e as Error).message}`);
        }
      }
      result.songs.push(songData);
    }
  }

  // Build folder hierarchy
  const folderPaths = new Set<string>();
  for (const song of result.songs) {
    const parts = song.folderPath.split('/');
    // Add all parent folders
    for (let i = 1; i < parts.length; i++) {
      const folderPath = parts.slice(0, i + 1).join('/');
      folderPaths.add(folderPath);
    }
  }

  for (const folderPath of folderPaths) {
    const parts = folderPath.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.length > 1 ? parts.slice(0, parts.length - 1).join('/') : null;
    const songsInFolder = result.songs.filter(s => s.folderPath === folderPath);
    
    result.folders.push({
      name,
      path: folderPath,
      parentPath: parentPath || undefined,
      isSongFolder: songsInFolder.length > 0,
      songCount: songsInFolder.length,
      coverImage: songsInFolder.find(s => s.coverUrl)?.coverUrl,
    });
  }

  return result;
}

// Convert scanned song to Song format
// IMPORTANT: For Tauri, we DO NOT store large media files in IndexedDB
// Instead, we store relative paths and load directly from filesystem
// Only TXT content is cached in IndexedDB for fast lyrics loading
export async function convertScannedSongToSong(scanned: ScannedSong): Promise<Song> {
  const parseResult = await parseUltraStarFull(scanned.txtFile);
  const { lyrics, bpm, gap, previewStart, previewDuration, isDuet: parsedIsDuet } = parseResult;

  // Determine if video has audio
  const hasAudio = !!scanned.audioFile;
  const hasVideo = !!scanned.videoFile;
  
  // Check if folder name indicates duet
  const folderNameIsDuet = scanned.folder.toLowerCase().includes('[duet]') || 
                           scanned.folder.toLowerCase().includes('[duett]') ||
                           scanned.title.toLowerCase().includes('[duet]');
  
  // Combine both sources for isDuet detection
  const isDuet = parsedIsDuet || folderNameIsDuet;
  
  // IMPORTANT: If video has embedded audio (no separate audio file):
  // - Don't set audioUrl - let the video element play the audio
  // - Set hasEmbeddedAudio: true so the game knows to use video for audio
  // - The videoBackground will be played unmuted to provide audio
  const hasEmbeddedAudio = hasVideo && !hasAudio;

  // Calculate duration
  let duration = 180000;
  if (scanned.audioFile) {
    try {
      duration = await getAudioDuration(scanned.audioFile);
    } catch (e) {
      console.error('Failed to get audio duration:', e);
    }
  } else if (scanned.videoFile) {
    try {
      duration = await getVideoDuration(scanned.videoFile);
    } catch (e) {
      console.error('Failed to get video duration:', e);
    }
  }

  // Difficulty is now just a default - user selects before playing
  const difficulty: Difficulty = 'medium';
  const rating = 3; // Default rating

  // Build preview object
  const preview = previewStart !== undefined ? {
    startTime: previewStart * 1000,
    duration: (previewDuration || 15) * 1000,
  } : undefined;

  // Generate song ID
  const songId = `scanned-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  
  // =====================================================
  // STORAGE STRATEGY FOR TAURI WITH LARGE LIBRARIES:
  // - TXT content: Cache in IndexedDB (small, ~5-20KB per song)
  // - Audio/Video/Cover: DO NOT store in IndexedDB
  //   Instead, store relative paths and load from filesystem
  // - This prevents IndexedDB from growing to GB sizes
  // =====================================================
  
  let storedTxt = false;
  
  // Store ONLY TXT content in IndexedDB for fast lyrics loading
  if (scanned.txtFile) {
    try {
      const txtContent = await scanned.txtFile.text();
      if (txtContent && txtContent.length > 0) {
        const txtBlob = new Blob([txtContent], { type: 'text/plain' });
        await storeMedia(songId, 'txt', txtBlob);
        console.log(`[FolderScanner] Cached TXT content (${txtContent.length} chars) for song ${songId}`);
        storedTxt = true;
      } else {
        console.warn(`[FolderScanner] TXT file is empty for song ${songId}`);
      }
    } catch (txtErr) {
      console.error(`[FolderScanner] Failed to cache TXT for ${songId}:`, txtErr);
    }
  }

  // Helper to extract relative path from webkitRelativePath or folderPath
  // CRITICAL: The relative path must include ALL subfolder names from the base folder.
  // Example: Songs/Artist/SongName/video.mp4 → relative path = Artist/SongName/video.mp4
  // The baseFolder is stored separately; the code reconstructs full paths at runtime.
  const getRelativePath = (file: File): string | undefined => {
    const webkitPath = (file as any).webkitRelativePath;
    if (webkitPath) {
      // webkitRelativePath starts with the root folder name (e.g. "Songs/Artist/Song/video.mp4")
      // Strip only the first segment (the root folder) to get the relative path
      const parts = webkitPath.split('/');
      if (parts.length > 1) {
        return parts.slice(1).join('/');
      }
      return webkitPath;
    }
    // Fallback: use scanned.folderPath + file.name
    // folderPath from scanDirectoryHandle is already relative to base folder (e.g. "Artist/SongName")
    // folderPath from scanFilesFromFileList includes the root folder (e.g. "Songs/Artist/SongName")
    // We detect which case by checking if folderPath starts with baseFolder
    if (scanned.folderPath) {
      let effectiveFolderPath = scanned.folderPath;
      // If folderPath starts with the baseFolder name, strip it
      // (scanFilesFromFileList includes root; scanDirectoryHandle does not)
      if (scanned.baseFolder && effectiveFolderPath.startsWith(scanned.baseFolder + '/')) {
        effectiveFolderPath = effectiveFolderPath.substring(scanned.baseFolder.length + 1);
      }
      if (effectiveFolderPath) {
        return `${effectiveFolderPath}/${file.name}`;
      }
    }
    return file.name;
  };

  // Extract relative paths for all media files
  // These will be used to load files directly from filesystem in Tauri
  const relativeAudioPath = scanned.audioFile ? getRelativePath(scanned.audioFile) : undefined;
  const relativeVideoPath = scanned.videoFile ? getRelativePath(scanned.videoFile) : undefined;
  const relativeCoverPath = scanned.coverFile ? getRelativePath(scanned.coverFile) : undefined;
  const relativeTxtPath = scanned.txtFile ? getRelativePath(scanned.txtFile) : undefined;

  // Normalize folderPath: remove root folder ONLY if present
  // folderPath from scanDirectoryHandle is already relative (e.g. "Artist/SongName")
  // folderPath from scanFilesFromFileList includes root (e.g. "Songs/Artist/SongName")
  // We detect by checking if folderPath starts with baseFolder
  let normalizedFolderPath = scanned.folderPath;
  if (normalizedFolderPath) {
    if (scanned.baseFolder && normalizedFolderPath.startsWith(scanned.baseFolder + '/')) {
      normalizedFolderPath = normalizedFolderPath.substring(scanned.baseFolder.length + 1);
    }
  }

  // CRITICAL: Log paths for debugging
  console.log(`[FolderScanner] Creating song ${scanned.title}`);
  console.log(`[FolderScanner]   baseFolder: ${scanned.baseFolder || 'not set'}`);
  console.log(`[FolderScanner]   folderPath (raw): ${scanned.folderPath}`);
  console.log(`[FolderScanner]   folderPath (normalized): ${normalizedFolderPath}`);
  console.log(`[FolderScanner]   relativeAudioPath: ${relativeAudioPath || 'none'}`);
  console.log(`[FolderScanner]   relativeVideoPath: ${relativeVideoPath || 'none'}`);
  console.log(`[FolderScanner]   relativeCoverPath: ${relativeCoverPath || 'none'}`);
  console.log(`[FolderScanner]   relativeTxtPath: ${relativeTxtPath || 'none'}`);

  return {
    id: songId,
    title: scanned.title,
    artist: scanned.artist,
    duration,
    bpm,
    difficulty,
    rating,
    gap,
    // Use blob URLs for current session (will be replaced by file:// URLs when loading from filesystem)
    coverImage: scanned.coverUrl,
    backgroundImage: scanned.backgroundUrl,
    videoBackground: hasVideo ? scanned.videoUrl : undefined,
    audioUrl: hasAudio ? scanned.audioUrl : undefined,
    hasEmbeddedAudio,
    // Lyrics are kept in memory for current session
    lyrics: lyrics,
    genre: scanned.genre,
    language: scanned.language,
    year: scanned.year,
    preview,
    dateAdded: Date.now(),
    folderPath: normalizedFolderPath,
    // CRITICAL: Pass baseFolder for media loading in Tauri
    baseFolder: scanned.baseFolder,
    // Relative paths for loading from filesystem (Tauri)
    relativeAudioPath,
    relativeVideoPath,
    relativeCoverPath,
    relativeTxtPath,
    // Flags
    storedTxt, // TXT is cached in IndexedDB
    storedMedia: false, // We do NOT store large media files in IndexedDB
    isDuet,
  };
}

// Full parse of UltraStar txt file
// IMPORTANT: Don't trim lines or lyrics - trailing spaces are significant for word boundaries
// - Trailing space in lyric = end of word (space is displayed)
// - No trailing space = syllable connected to next note
async function parseUltraStarFull(txtFile?: File): Promise<{
  lyrics: LyricLine[];
  bpm: number;
  gap: number;
  previewStart?: number;
  previewDuration?: number;
  isDuet?: boolean;
}> {
  if (!txtFile) {
    return { lyrics: [], bpm: 120, gap: 0, isDuet: false };
  }

  const content = await txtFile.text();
  // Strip BOM if present (common on Windows)
  let cleanContent = content;
  if (cleanContent.charCodeAt(0) === 0xFEFF) {
    cleanContent = cleanContent.substring(1);
  }
  // Normalize line endings (Windows \r\n → \n)
  cleanContent = cleanContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // DON'T trim lines! Trailing spaces in lyrics are significant for word boundaries.
  // Only filter out completely empty lines (after trimming for the check)
  const lines = cleanContent.split('\n').filter(l => l.trim().length > 0);
  
  let bpm = 120;
  let gap = 0;
  let previewStart: number | undefined;
  let previewDuration: number | undefined;
  let hasDuetNotes = false;
  const notes: Array<{ type: string; startBeat: number; duration: number; pitch: number; lyric: string; player?: 'P1' | 'P2' }> = [];
  const lineBreakBeats = new Set<number>();
  
  let currentPlayer: 'P1' | 'P2' | undefined = undefined;

  for (const line of lines) {
    // Use trimmed version for header parsing (header values should be trimmed)
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('#BPM:')) {
      bpm = parseFloat(trimmedLine.substring(5).replace(',', '.')) || 120;
    } else if (trimmedLine.startsWith('#GAP:')) {
      gap = parseInt(trimmedLine.substring(5)) || 0;
    } else if (trimmedLine.startsWith('#PREVIEWSTART:')) {
      previewStart = parseFloat(trimmedLine.substring(13));
    } else if (trimmedLine.startsWith('#PREVIEWDURATION:')) {
      previewDuration = parseFloat(trimmedLine.substring(16));
    } else if (trimmedLine.startsWith('#')) {
      continue;
    } else if (trimmedLine === 'E') {
      break;
    } else if (trimmedLine === 'P1' || trimmedLine === 'P1:') {
      currentPlayer = 'P1';
      hasDuetNotes = true;
    } else if (trimmedLine === 'P2' || trimmedLine === 'P2:') {
      currentPlayer = 'P2';
      hasDuetNotes = true;
    } else if (trimmedLine.startsWith('-')) {
      // Line break
      const match = trimmedLine.match(/^-\s*(-?\d+)/);
      if (match) {
        lineBreakBeats.add(parseInt(match[1]));
      }
    } else {
      // Check for P1/P2 prefix in note line
      const duetPrefixMatch = line.match(/^(P1|P2):\s*(.*)$/);
      let noteLine = line;
      let notePlayer = currentPlayer;
      
      if (duetPrefixMatch) {
        notePlayer = duetPrefixMatch[1] as 'P1' | 'P2';
        noteLine = duetPrefixMatch[2];
        hasDuetNotes = true;
      }
      
      // Parse note - use TRIMMED line for matching to handle leading spaces
      // but preserve the original lyric with trailing spaces for syllable detection
      const trimmedNoteLine = noteLine.trim();
      const noteMatch = trimmedNoteLine.match(/^([:*FGR])\s*(-?\d+)\s+(\d+)\s+(-?\d+)\s*(.*)$/);
      if (noteMatch) {
        const [, type, startStr, durationStr, pitchStr, lyric] = noteMatch;
        notes.push({
          type,
          startBeat: parseInt(startStr),
          duration: parseInt(durationStr),
          pitch: parseInt(pitchStr),
          // DON'T trim - preserve trailing spaces for syllable detection
          // A trailing space means this is a complete word, no space means it's a syllable
          lyric: lyric,
          player: notePlayer,
        });
      }
    }
  }

  // Convert beats to milliseconds using CORRECT UltraStar formula
  // beatDuration = 15000 / BPM (equivalent to 60000 / (BPM * 4))
  const beatDuration = 15000 / bpm;
  const MIDI_BASE_OFFSET = 48;
  
  // Group notes into lyric lines
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

    // Check if this note is ONLY a hyphen - this marks a LINE BREAK
    const isHyphenSeparator = note.lyric === '-' || (note.lyric.trim() === '-' && note.lyric.length <= 2);

    // Handle hyphen separator as line break
    if (isHyphenSeparator && currentLineNotes.length > 0) {
      const lineStartTime = currentLineNotes[0].startTime;
      const lineEndTime = currentLineNotes[currentLineNotes.length - 1].startTime + 
                         currentLineNotes[currentLineNotes.length - 1].duration;
      
      // Build line text: PRESERVE SPACES between words
      // Only trim leading whitespace, keep internal and trailing spaces
      let finalLineText = currentLineText.replace(/^\s+/, '');
      
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
      continue;
    }

    const convertedNote: Note = {
      id: `note-${lyricLines.length}-${currentLineNotes.length}`,
      pitch: note.pitch + MIDI_BASE_OFFSET,
      frequency: midiToFrequency(note.pitch + MIDI_BASE_OFFSET),
      startTime: Math.round(startTime),
      duration: Math.round(duration),
      lyric: note.lyric, // Preserve original lyric with spaces
      isBonus: note.type === 'F',
      isGolden: note.type === '*' || note.type === 'G',
      player: note.player,
    };

    // Skip hyphen separators as notes
    if (!isHyphenSeparator) {
      currentLineNotes.push(convertedNote);
      // Build line text: concatenate lyrics, spaces are already embedded
      currentLineText += note.lyric;
      
      // Track line player
      if (currentLinePlayer === undefined) {
        currentLinePlayer = note.player;
      } else if (currentLinePlayer !== note.player && note.player !== undefined) {
        currentLinePlayer = 'both';
      }
    }

    // Check for line break
    const isLineBreak = lineBreakBeats.has(noteEndBeat) || 
                        (i < sortedNotes.length - 1 && 
                         sortedNotes[i + 1].startBeat - noteEndBeat >= 8);

    if (isLineBreak || i === sortedNotes.length - 1) {
      if (currentLineNotes.length > 0) {
        const lineStartTime = currentLineNotes[0].startTime;
        const lineEndTime = currentLineNotes[currentLineNotes.length - 1].startTime + 
                           currentLineNotes[currentLineNotes.length - 1].duration;
        
        // Build line text: PRESERVE SPACES between words
        // Only trim leading whitespace, keep internal and trailing spaces
        let finalLineText = currentLineText.replace(/^\s+/, '');
        
        // Remove trailing hyphens that are purely separators (not part of words)
        if (finalLineText.endsWith(' -')) {
          finalLineText = finalLineText.slice(0, -2);
        } else if (finalLineText.endsWith('-') && !finalLineText.endsWith('--')) {
          finalLineText = finalLineText.slice(0, -1);
        }
        
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
  }

  return { lyrics: lyricLines, bpm, gap, previewStart, previewDuration, isDuet: hasDuetNotes };
}

// Get audio duration (with proper cleanup)
function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    let blobUrl: string | null = null;
    
    audio.onloadedmetadata = () => {
      const duration = audio.duration * 1000;
      // Cleanup blob URL
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      resolve(duration);
    };
    
    audio.onerror = () => {
      // Cleanup blob URL on error
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load audio'));
    };
    
    blobUrl = URL.createObjectURL(file);
    audio.src = blobUrl;
  });
}

// Get video duration (with proper cleanup)
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    let blobUrl: string | null = null;
    
    video.onloadedmetadata = () => {
      const duration = video.duration * 1000;
      // Cleanup blob URL
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      resolve(duration);
    };
    
    video.onerror = () => {
      // Cleanup blob URL on error
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load video'));
    };
    
    blobUrl = URL.createObjectURL(file);
    video.src = blobUrl;
  });
}

// Revoke all blob URLs associated with a scanned song (cleanup memory)
export function revokeScannedSongUrls(song: ScannedSong): void {
  if (song.audioUrl?.startsWith('blob:')) URL.revokeObjectURL(song.audioUrl);
  if (song.videoUrl?.startsWith('blob:')) URL.revokeObjectURL(song.videoUrl);
  if (song.coverUrl?.startsWith('blob:')) URL.revokeObjectURL(song.coverUrl);
  if (song.backgroundUrl?.startsWith('blob:')) URL.revokeObjectURL(song.backgroundUrl);
}

// Revoke all blob URLs for an array of scanned songs
export function revokeAllScannedSongUrls(songs: ScannedSong[]): void {
  for (const song of songs) {
    revokeScannedSongUrls(song);
  }
}

// Save scan result to cache
export async function saveScanResultToCache(result: ScanResult): Promise<void> {
  const cachedSongs: CachedSong[] = [];
  
  for (const song of result.songs) {
    const fullSong = await convertScannedSongToSong(song);
    cachedSongs.push(createCachedSong(
      fullSong,
      song.folder,
      song.folderPath,
      {
        audio: song.audioFile?.name,
        video: song.videoFile?.name,
        txt: song.txtFile?.name,
        cover: song.coverFile?.name,
      }
    ));
  }

  const cache: LibraryCache = {
    version: 1,
    lastScan: Date.now(),
    songs: cachedSongs,
    folders: result.folders,
    rootFolders: result.folders.filter(f => !f.parentPath).map(f => f.path),
  };

  await saveCache(cache);
}
