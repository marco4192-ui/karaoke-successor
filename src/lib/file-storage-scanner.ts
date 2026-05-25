// File Storage Scanner - Recursive song folder scanning and TXT parsing
// Extracted from tauri-file-storage.ts

import { LyricLine } from '@/types/game';
import { convertNotesToLyricLines } from '@/lib/parsers/notes-to-lyric-lines';
import {
  nativeReadFileText,
  nativeReadDir,
} from '@/lib/native-fs';
import { normalizeTxtContent } from '@/lib/utils';
import { AUDIO_EXTENSIONS, VIDEO_EXTENSIONS, TXT_EXTENSIONS, COVER_EXTENSIONS } from '@/lib/media-extensions';
import { normalizeFilePath, COVER_PATTERNS } from '@/lib/file-storage-utils';
import type { TauriScannedSong, TauriScanResult } from '@/lib/file-storage-types';
import { isTauri } from '@/lib/file-storage-utils';

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
      // CRITICAL FIX 2: Normalize to NFC so that the startsWith comparison works
      // on macOS where the OS may return NFD paths while basePath (from
      // normalizeFilePath) is NFC. Without this, paths with accented chars fail.
      const normalizedBase = basePath.replace(/\\/g, '/').replace(/\/+$/, '').normalize('NFC');
      const normalizedFull = fullPath.replace(/\\/g, '/').replace(/\/+$/, '').normalize('NFC');
      
      let relativePath: string;
      if (normalizedFull.startsWith(normalizedBase + '/')) {
        relativePath = normalizedFull.slice(normalizedBase.length + 1);
      } else if (normalizedFull === normalizedBase) {
        // Current directory is the base itself (no trailing slash)
        continue;
      } else {
        // eslint-disable-next-line no-console
        console.warn('[TauriScanner] Path prefix mismatch:', { basePath, fullPath });
        relativePath = normalizedFull;
      }
      
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
    // eslint-disable-next-line no-console
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
  } catch (error) {
    console.debug('[tauri-file-storage]: failed to read TXT content', error);
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
      const endVal = parseInt(trimmed.substring(5));
      end = endVal > 0 ? endVal : undefined;
    } else if (trimmed.startsWith('#VIDEOGAP:')) {
      videoGap = parseFloat(trimmed.substring(10).replace(',', '.')) || undefined;
    } else if (trimmed.startsWith('#VIDEOSTART:')) {
      videoStart = parseFloat(trimmed.substring(12).replace(',', '.')) || undefined;
    }

    // Preview
    else if (trimmed.startsWith('#PREVIEWSTART:')) {
      previewStart = parseFloat(trimmed.substring(14)) || undefined;
    } else if (trimmed.startsWith('#PREVIEWDURATION:')) {
      previewDuration = parseFloat(trimmed.substring(17)) || undefined;
    }

    // Medley
    else if (trimmed.startsWith('#MEDLEYSTARTBEAT:')) {
      medleyStartBeat = parseInt(trimmed.substring(17)) || undefined;
    } else if (trimmed.startsWith('#MEDLEYENDBEAT:')) {
      medleyEndBeat = parseInt(trimmed.substring(15)) || undefined;
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
  const cleanContent = normalizeTxtContent(content);

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
      
      const folderFiles = folderMap.get(parentFolder);
      if (folderFiles) folderFiles.set(file.name, { path: relativePath, name: file.name });
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
    // eslint-disable-next-line no-console
    console.error('[TauriScanner] Scan failed:', error);
    result.errors.push(`Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}
