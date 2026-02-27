// Folder Scanner - Scans folders for karaoke songs
// Uses File System Access API (where supported) or file input fallback

import { Song, Note, LyricLine, midiToFrequency } from '@/types/game';

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
}

export interface ScanResult {
  songs: ScannedSong[];
  errors: string[];
}

// Supported file extensions
const AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.wav', '.m4a', '.flac', '.aac'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.avi', '.mov'];
const TXT_EXTENSIONS = ['.txt'];
const COVER_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Check if File System Access API is supported
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
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

    return await scanDirectoryHandle(dirHandle);
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      return { songs: [], errors: ['Folder selection cancelled'] };
    }
    throw e;
  }
}

// Scan a directory handle
async function scanDirectoryHandle(dirHandle: FileSystemDirectoryHandle, path = ''): Promise<ScanResult> {
  const result: ScanResult = { songs: [], errors: [] };
  const songFolders: Map<string, ScannedSong> = new Map();

  for await (const entry of dirHandle.values()) {
    const entryPath = path ? `${path}/${entry.name}` : entry.name;

    if (entry.kind === 'directory') {
      // Recursively scan subdirectories
      try {
        // @ts-ignore
        const subResult = await scanDirectoryHandle(entry, entryPath);
        result.songs.push(...subResult.songs);
        result.errors.push(...subResult.errors);
      } catch (e) {
        result.errors.push(`Failed to scan ${entryPath}: ${(e as Error).message}`);
      }
    } else if (entry.kind === 'file') {
      // Categorize the file
      const ext = '.' + entry.name.split('.').pop()?.toLowerCase();
      const parentFolder = path.split('/').pop() || 'Unknown';

      // @ts-ignore
      const file = await entry.getFile();

      if (!songFolders.has(parentFolder)) {
        songFolders.set(parentFolder, {
          title: parentFolder,
          artist: 'Unknown',
          folder: parentFolder,
        });
      }

      const songData = songFolders.get(parentFolder)!;

      if (AUDIO_EXTENSIONS.includes(ext)) {
        songData.audioFile = file;
        songData.audioUrl = URL.createObjectURL(file);
      } else if (VIDEO_EXTENSIONS.includes(ext)) {
        songData.videoFile = file;
        songData.videoUrl = URL.createObjectURL(file);
      } else if (TXT_EXTENSIONS.includes(ext)) {
        songData.txtFile = file;
      } else if (COVER_EXTENSIONS.includes(ext)) {
        songData.coverFile = file;
        songData.coverUrl = URL.createObjectURL(file);
      }
    }
  }

  // Convert folder map to songs array
  for (const [folderName, songData] of songFolders) {
    if (songData.audioFile || songData.videoFile) {
      // Try to parse txt file for metadata
      if (songData.txtFile) {
        try {
          const txtContent = await songData.txtFile.text();
          const metadata = parseUltraStarMetadata(txtContent);
          songData.title = metadata.title || folderName;
          songData.artist = metadata.artist || 'Unknown';
        } catch (e) {
          result.errors.push(`Failed to parse ${folderName}/txt: ${(e as Error).message}`);
        }
      }
      result.songs.push(songData);
    }
  }

  return result;
}

// Parse UltraStar txt file for metadata only
function parseUltraStarMetadata(content: string): { title: string; artist: string; bpm: number } {
  const lines = content.split('\n');
  let title = 'Unknown';
  let artist = 'Unknown';
  let bpm = 120;

  for (const line of lines) {
    if (line.startsWith('#TITLE:')) {
      title = line.substring(7).trim();
    } else if (line.startsWith('#ARTIST:')) {
      artist = line.substring(8).trim();
    } else if (line.startsWith('#BPM:')) {
      bpm = parseFloat(line.substring(5).replace(',', '.')) || 120;
    }
  }

  return { title, artist, bpm };
}

// Scan files from a FileList (fallback for browsers without File System Access API)
export async function scanFilesFromFileList(files: FileList): Promise<ScanResult> {
  const result: ScanResult = { songs: [], errors: [] };
  const songFolders: Map<string, ScannedSong> = new Map();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const pathParts = file.webkitRelativePath.split('/');
    const folderName = pathParts.length > 1 ? pathParts[1] : pathParts[0];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!songFolders.has(folderName)) {
      songFolders.set(folderName, {
        title: folderName,
        artist: 'Unknown',
        folder: folderName,
      });
    }

    const songData = songFolders.get(folderName)!;

    if (AUDIO_EXTENSIONS.includes(ext)) {
      songData.audioFile = file;
      songData.audioUrl = URL.createObjectURL(file);
    } else if (VIDEO_EXTENSIONS.includes(ext)) {
      songData.videoFile = file;
      songData.videoUrl = URL.createObjectURL(file);
    } else if (TXT_EXTENSIONS.includes(ext)) {
      songData.txtFile = file;
    } else if (COVER_EXTENSIONS.includes(ext)) {
      songData.coverFile = file;
      songData.coverUrl = URL.createObjectURL(file);
    }
  }

  // Convert folder map to songs array
  for (const [folderName, songData] of songFolders) {
    if (songData.audioFile || songData.videoFile) {
      // Try to parse txt file for metadata
      if (songData.txtFile) {
        try {
          const txtContent = await songData.txtFile.text();
          const metadata = parseUltraStarMetadata(txtContent);
          songData.title = metadata.title || folderName;
          songData.artist = metadata.artist || 'Unknown';
        } catch (e) {
          result.errors.push(`Failed to parse ${folderName}/txt: ${(e as Error).message}`);
        }
      }
      result.songs.push(songData);
    }
  }

  return result;
}

// Convert scanned song to Song format
export async function convertScannedSongToSong(scanned: ScannedSong): Promise<Song> {
  let lyrics: LyricLine[] = [];
  let bpm = 120;
  let gap = 0;

  // Parse txt file if available
  if (scanned.txtFile) {
    try {
      const txtContent = await scanned.txtFile.text();
      const parsed = await parseUltraStarTxt(txtContent);
      lyrics = parsed.lyrics;
      bpm = parsed.bpm;
      gap = parsed.gap;
    } catch (e) {
      console.error('Failed to parse txt file:', e);
    }
  }

  // If no lyrics and has video, create empty lyrics for video playback
  if (lyrics.length === 0 && scanned.videoFile) {
    // Create placeholder lyrics for video-only songs
    lyrics = [{
      id: 'line-0',
      text: '♪',
      startTime: 0,
      endTime: 300000, // 5 minutes default
      notes: [],
    }];
  }

  // Determine if video has audio
  const hasAudio = !!scanned.audioFile;
  const hasVideo = !!scanned.videoFile;

  // Calculate duration
  let duration = 180000; // Default 3 minutes
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

  // Determine difficulty based on note count
  const totalNotes = lyrics.reduce((acc, line) => acc + line.notes.length, 0);
  const notesPerMinute = totalNotes / (duration / 60000);
  
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  if (notesPerMinute > 40) difficulty = 'hard';
  else if (notesPerMinute < 20) difficulty = 'easy';

  const rating = Math.min(5, Math.max(1, Math.ceil(notesPerMinute / 10)));

  return {
    id: `scanned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: scanned.title,
    artist: scanned.artist,
    duration,
    bpm,
    difficulty,
    rating,
    gap,
    coverImage: scanned.coverUrl,
    videoBackground: hasVideo ? scanned.videoUrl : undefined,
    audioUrl: hasAudio ? scanned.audioUrl : (hasVideo ? scanned.videoUrl : undefined),
    hasEmbeddedAudio: hasVideo && !hasAudio, // Flag for video with embedded audio
    lyrics,
    dateAdded: Date.now(),
  };
}

// Parse UltraStar txt file
async function parseUltraStarTxt(content: string): Promise<{
  lyrics: LyricLine[];
  bpm: number;
  gap: number;
}> {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let bpm = 120;
  let gap = 0;
  const notes: Array<{ type: string; startBeat: number; duration: number; pitch: number; lyric: string }> = [];

  for (const line of lines) {
    if (line.startsWith('#BPM:')) {
      bpm = parseFloat(line.substring(5).replace(',', '.')) || 120;
    } else if (line.startsWith('#GAP:')) {
      gap = parseInt(line.substring(5)) || 0;
    } else if (line.startsWith('#')) {
      continue; // Skip other headers
    } else if (line === 'E') {
      break; // End marker
    } else {
      // Parse note line
      const noteMatch = line.match(/^([:F*RGe])(-?\d+)\s+(\d+)\s+(-?\d+)\s*(.*)$/);
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
  
  // Group notes into lyric lines
  const lyricLines: LyricLine[] = [];
  let currentLineNotes: Note[] = [];
  let currentLineText = '';
  let currentLineStart = 0;
  let lastEndBeat = 0;

  const LINE_BREAK_THRESHOLD = 8; // beats

  for (const note of notes) {
    // Check for line break
    if (lastEndBeat > 0 && (note.startBeat - lastEndBeat) >= LINE_BREAK_THRESHOLD) {
      if (currentLineNotes.length > 0) {
        const endTime = currentLineNotes[currentLineNotes.length - 1].startTime + 
                        currentLineNotes[currentLineNotes.length - 1].duration;
        lyricLines.push({
          id: `line-${lyricLines.length}`,
          text: currentLineText.trim(),
          startTime: currentLineStart,
          endTime,
          notes: currentLineNotes,
        });
        currentLineNotes = [];
        currentLineText = '';
      }
    }

    const startTime = gap + (note.startBeat * beatDuration);
    const duration = note.duration * beatDuration;
    
    if (currentLineNotes.length === 0) {
      currentLineStart = startTime;
    }

    const convertedNote: Note = {
      id: `note-${lyricLines.length}-${currentLineNotes.length}`,
      pitch: note.pitch,
      frequency: midiToFrequency(note.pitch),
      startTime,
      duration,
      lyric: note.lyric,
      isBonus: note.type === 'F',
      isGolden: note.type === '*' || note.type === 'G',
    };

    currentLineNotes.push(convertedNote);
    currentLineText += note.lyric + ' ';
    lastEndBeat = note.startBeat + note.duration;
  }

  // Add last line
  if (currentLineNotes.length > 0) {
    const endTime = currentLineNotes[currentLineNotes.length - 1].startTime + 
                    currentLineNotes[currentLineNotes.length - 1].duration;
    lyricLines.push({
      id: `line-${lyricLines.length}`,
      text: currentLineText.trim(),
      startTime: currentLineStart,
      endTime,
      notes: currentLineNotes,
    });
  }

  return { lyrics: lyricLines, bpm, gap };
}

// Get audio duration
function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration * 1000);
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
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
      URL.revokeObjectURL(video.src);
      resolve(video.duration * 1000);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}
