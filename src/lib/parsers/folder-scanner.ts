// Folder Scanner - Scans folders for karaoke songs
// Supports nested folder structure with categories

import { Song, Note, LyricLine, midiToFrequency, Difficulty } from '@/types/game';
import { CachedSong, CachedFolder, LibraryCache, createCachedSong, saveCache, loadCache } from './library-cache';

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
  audioUrl?: string;
  videoUrl?: string;
  coverUrl?: string;
  folder: string;
  folderPath: string;
  previewStart?: number;
  previewDuration?: number;
}

export interface ScanResult {
  songs: ScannedSong[];
  folders: CachedFolder[];
  errors: string[];
}

// Supported file extensions
const AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.wav', '.m4a', '.flac', '.aac'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.avi', '.mov'];
const TXT_EXTENSIONS = ['.txt'];
const COVER_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Cover file name patterns (in order of priority)
const COVER_PATTERNS = [
  /^cover/i,
  /^folder/i,
  /^front/i,
  /^album/i,
  /^\[co\]/i, // UltraStar cover tag pattern
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

    return await scanDirectoryHandle(dirHandle, '', null);
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
  parentPath: string | null
): Promise<ScanResult> {
  const result: ScanResult = { songs: [], folders: [], errors: [] };
  const songFolders: Map<string, ScannedSong> = new Map();
  const subFolders: CachedFolder[] = [];
  
  // Check if this folder contains song files directly
  let hasSongFiles = false;
  const entries: Array<{ entry: FileSystemHandle; fullPath: string }> = [];

  for await (const entry of dirHandle.values()) {
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
        // @ts-ignore
        const subResult = await scanDirectoryHandle(entry, fullPath, path);
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
          if (!songData.coverFile || isPriorityCover) {
            songData.coverFile = file;
            songData.coverUrl = URL.createObjectURL(file);
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
} {
  const lines = content.split('\n');
  let title = 'Unknown';
  let artist = 'Unknown';
  let bpm = 120;
  let gap = 0;
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
    } else if (trimmed.startsWith('#PREVIEWSTART:')) {
      previewStart = parseFloat(trimmed.substring(13)) || undefined;
    } else if (trimmed.startsWith('#PREVIEWDURATION:')) {
      previewDuration = parseFloat(trimmed.substring(16)) || undefined;
    }
  }

  return { title, artist, bpm, gap, previewStart, previewDuration };
}

// Scan files from a FileList (fallback for browsers without File System Access API)
export async function scanFilesFromFileList(files: FileList): Promise<ScanResult> {
  const result: ScanResult = { songs: [], folders: [], errors: [] };
  const songFolders: Map<string, ScannedSong> = new Map();
  const folderMap: Map<string, { parentPath: string | null; songs: ScannedSong[] }> = new Map();

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
export async function convertScannedSongToSong(scanned: ScannedSong): Promise<Song> {
  const parseResult = await parseUltraStarFull(scanned.txtFile);
  const { lyrics, bpm, gap, previewStart, previewDuration } = parseResult;

  // Determine if video has audio
  const hasAudio = !!scanned.audioFile;
  const hasVideo = !!scanned.videoFile;

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

  return {
    id: `scanned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: scanned.title,
    artist: scanned.artist,
    duration,
    bpm,
    difficulty, // Default - user can change before playing
    rating,
    gap,
    coverImage: scanned.coverUrl,
    videoBackground: hasVideo ? scanned.videoUrl : undefined,
    audioUrl: hasAudio ? scanned.audioUrl : (hasVideo ? scanned.videoUrl : undefined),
    hasEmbeddedAudio: hasVideo && !hasAudio,
    lyrics,
    preview: scanned.previewStart !== undefined ? {
      startTime: scanned.previewStart * 1000,
      duration: (scanned.previewDuration || 15) * 1000,
    } : preview,
    dateAdded: Date.now(),
  };
}

// Full parse of UltraStar txt file
async function parseUltraStarFull(txtFile?: File): Promise<{
  lyrics: LyricLine[];
  bpm: number;
  gap: number;
  previewStart?: number;
  previewDuration?: number;
}> {
  if (!txtFile) {
    return { lyrics: [], bpm: 120, gap: 0 };
  }

  const content = await txtFile.text();
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let bpm = 120;
  let gap = 0;
  let previewStart: number | undefined;
  let previewDuration: number | undefined;
  const notes: Array<{ type: string; startBeat: number; duration: number; pitch: number; lyric: string }> = [];
  const lineBreakBeats = new Set<number>();

  for (const line of lines) {
    if (line.startsWith('#BPM:')) {
      bpm = parseFloat(line.substring(5).replace(',', '.')) || 120;
    } else if (line.startsWith('#GAP:')) {
      gap = parseInt(line.substring(5)) || 0;
    } else if (line.startsWith('#PREVIEWSTART:')) {
      previewStart = parseFloat(line.substring(13));
    } else if (line.startsWith('#PREVIEWDURATION:')) {
      previewDuration = parseFloat(line.substring(16));
    } else if (line.startsWith('#')) {
      continue;
    } else if (line === 'E') {
      break;
    } else if (line.startsWith('-')) {
      // Line break
      const match = line.match(/^-\s*(-?\d+)/);
      if (match) {
        lineBreakBeats.add(parseInt(match[1]));
      }
    } else {
      // Parse note
      const noteMatch = line.match(/^([:*FGR])\s*(-?\d+)\s+(\d+)\s+(-?\d+)\s*(.*)$/);
      if (noteMatch) {
        const [, type, startStr, durationStr, pitchStr, lyric] = noteMatch;
        notes.push({
          type,
          startBeat: parseInt(startStr),
          duration: parseInt(durationStr),
          pitch: parseInt(pitchStr),
          lyric: lyric.trim(),
        });
      }
    }
  }

  // Convert beats to milliseconds
  const beatDuration = 60000 / bpm;
  const MIDI_BASE_OFFSET = 48;
  
  // Group notes into lyric lines
  const lyricLines: LyricLine[] = [];
  let currentLineNotes: Note[] = [];
  let currentLineText = '';

  const sortedNotes = [...notes].sort((a, b) => a.startBeat - b.startBeat);

  for (let i = 0; i < sortedNotes.length; i++) {
    const note = sortedNotes[i];
    const noteEndBeat = note.startBeat + note.duration;
    
    const startTime = gap + (note.startBeat * beatDuration);
    const duration = note.duration * beatDuration;

    const convertedNote: Note = {
      id: `note-${lyricLines.length}-${currentLineNotes.length}`,
      pitch: note.pitch + MIDI_BASE_OFFSET,
      frequency: midiToFrequency(note.pitch + MIDI_BASE_OFFSET),
      startTime: Math.round(startTime),
      duration: Math.round(duration),
      lyric: note.lyric,
      isBonus: note.type === 'F',
      isGolden: note.type === '*' || note.type === 'G',
    };

    currentLineNotes.push(convertedNote);
    currentLineText += note.lyric;

    // Check for line break
    const isLineBreak = lineBreakBeats.has(noteEndBeat) || 
                        (i < sortedNotes.length - 1 && 
                         sortedNotes[i + 1].startBeat - noteEndBeat >= 8);

    if (isLineBreak || i === sortedNotes.length - 1) {
      if (currentLineNotes.length > 0) {
        const lineStartTime = currentLineNotes[0].startTime;
        const lineEndTime = currentLineNotes[currentLineNotes.length - 1].startTime + 
                           currentLineNotes[currentLineNotes.length - 1].duration;
        
        lyricLines.push({
          id: `line-${lyricLines.length}`,
          text: currentLineText.trim(),
          startTime: lineStartTime,
          endTime: lineEndTime,
          notes: currentLineNotes,
        });
        
        currentLineNotes = [];
        currentLineText = '';
      }
    }
  }

  return { lyrics: lyricLines, bpm, gap, previewStart, previewDuration };
}

// Get audio duration
function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    
    audio.onloadedmetadata = () => {
      resolve(audio.duration * 1000);
    };
    
    audio.onerror = () => {
      reject(new Error('Failed to load audio'));
    };
    
    audio.src = URL.createObjectURL(file);
  });
}

// Get video duration
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      resolve(video.duration * 1000);
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };
    
    video.src = URL.createObjectURL(file);
  });
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
