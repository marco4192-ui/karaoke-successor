// Song Converter - Convert scanned song data to Song format
// IMPORTANT: For Tauri, we DO NOT store large media files in IndexedDB
// Instead, we store relative paths and load directly from filesystem
// Only TXT content is cached in IndexedDB for fast lyrics loading

import { Song, Difficulty } from '@/types/game';
import { storeMedia } from '@/lib/db/media-db';
import { createTrackedBlobUrl } from '@/lib/parsers/blob-url-tracker';
import { ScannedSong } from '@/lib/parsers/scan-types';
import { parseUltraStarFull } from '@/lib/parsers/ultrastar-metadata';
import { getAudioDuration, getVideoDuration } from '@/lib/parsers/media-duration';

// Convert scanned song to Song format
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
      // eslint-disable-next-line no-console
      console.error('Failed to get audio duration:', e);
    }
  } else if (scanned.videoFile) {
    try {
      duration = await getVideoDuration(scanned.videoFile);
    } catch (e) {
      // eslint-disable-next-line no-console
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
        storedTxt = true;
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[FolderScanner] TXT file is empty for song ${songId}`);
      }
    } catch (txtErr) {
      // eslint-disable-next-line no-console
      console.error(`[FolderScanner] Failed to cache TXT for ${songId}:`, txtErr);
    }
  }

  // Helper to extract relative path from webkitRelativePath or folderPath
  // CRITICAL: The relative path must include ALL subfolder names from the base folder.
  // Example: Songs/Artist/SongName/video.mp4 → relative path = Artist/SongName/video.mp4
  // The baseFolder is stored separately; the code reconstructs full paths at runtime.
  const getRelativePath = (file: File): string | undefined => {
    const webkitPath = file.webkitRelativePath;
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
