// Folder Discovery - Scan folders for karaoke songs using File System Access API or FileList

import { CachedFolder } from '@/lib/game/library-cache';
import { AUDIO_EXTENSIONS, VIDEO_EXTENSIONS, TXT_EXTENSIONS, COVER_EXTENSIONS, BACKGROUND_EXTENSIONS } from '@/lib/media-extensions';
import { createTrackedBlobUrl } from '@/lib/parsers/blob-url-tracker';
import { ScannedSong, ScanResult, COVER_PATTERNS, BACKGROUND_PATTERNS } from '@/lib/parsers/scan-types';
import { parseUltraStarMetadata } from '@/lib/parsers/ultrastar-metadata';

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
    // @ts-expect-error - TypeScript doesn't know about showDirectoryPicker (File System Access API)
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
        // @ts-expect-error - Pass baseFolder to recursive calls
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

      // @ts-expect-error - FileSystemFileHandle.getFile() not in standard TS lib
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

        const songData = songFolders.get(path);
        if (!songData) continue;

        if (AUDIO_EXTENSIONS.includes(ext)) {
          songData.audioFile = file;
          songData.audioUrl = createTrackedBlobUrl(file);
        } else if (VIDEO_EXTENSIONS.includes(ext)) {
          songData.videoFile = file;
          songData.videoUrl = createTrackedBlobUrl(file);
        } else if (TXT_EXTENSIONS.includes(ext)) {
          songData.txtFile = file;
        } else if (COVER_EXTENSIONS.includes(ext)) {
          // Check if this should be the cover
          const isPriorityCover = COVER_PATTERNS.some(p => p.test(file.name));
          const isPriorityBackground = BACKGROUND_PATTERNS.some(p => p.test(file.name));

          // If it matches background patterns, use as background
          if (isPriorityBackground && !songData.backgroundFile) {
            songData.backgroundFile = file;
            songData.backgroundUrl = createTrackedBlobUrl(file);
          }

          // If it matches cover patterns or no cover exists yet, use as cover
          if (isPriorityCover || !songData.coverFile) {
            songData.coverFile = file;
            songData.coverUrl = createTrackedBlobUrl(file);
          }
        } else if (BACKGROUND_EXTENSIONS.includes(ext)) {
          // Explicitly check for background images
          const isPriorityBackground = BACKGROUND_PATTERNS.some(p => p.test(file.name));
          if (!songData.backgroundFile || isPriorityBackground) {
            songData.backgroundFile = file;
            songData.backgroundUrl = createTrackedBlobUrl(file);
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

// Scan files from a FileList or File[] (fallback for browsers without File System Access API,
// and for drag & drop where files are collected into a plain array).
export async function scanFilesFromFileList(files: FileList | File[]): Promise<ScanResult> {
  const result: ScanResult = { songs: [], folders: [], errors: [] };
  const songFolders: Map<string, ScannedSong> = new Map();

  // Extract baseFolder from the first file's path
  let baseFolder: string | undefined = undefined;
  if (files.length > 0) {
    const firstPath = files[0].webkitRelativePath;
    if (firstPath) {
      // The root folder is the first part of the path
      baseFolder = firstPath.split('/')[0];
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

    const songData = songFolders.get(songFolderPath);
    if (!songData) continue;

    if (AUDIO_EXTENSIONS.includes(ext)) {
      songData.audioFile = file;
      songData.audioUrl = createTrackedBlobUrl(file);
    } else if (VIDEO_EXTENSIONS.includes(ext)) {
      songData.videoFile = file;
      songData.videoUrl = createTrackedBlobUrl(file);
    } else if (TXT_EXTENSIONS.includes(ext)) {
      songData.txtFile = file;
    } else if (COVER_EXTENSIONS.includes(ext)) {
      const isPriorityCover = COVER_PATTERNS.some(p => p.test(file.name));
      if (!songData.coverFile || isPriorityCover) {
        songData.coverFile = file;
        songData.coverUrl = createTrackedBlobUrl(file);
      }
    } else if (BACKGROUND_EXTENSIONS.includes(ext)) {
      const isPriorityBg = BACKGROUND_PATTERNS.some(p => p.test(file.name));
      if (!songData.backgroundFile || isPriorityBg) {
        songData.backgroundFile = file;
        songData.backgroundUrl = createTrackedBlobUrl(file);
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
