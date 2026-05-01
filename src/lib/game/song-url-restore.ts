// Tauri URL restoration — converts relative paths back to playable URLs
import type { Song } from '@/types/game';
import { isTauri, getSongMediaUrl } from '@/lib/tauri-file-storage';
import { isAbsolutePath, resolveSongsBaseFolder } from './song-paths';
import { updateSong } from './song-library';

/**
 * Restore song URLs for Tauri — converts relative paths back to playable URLs.
 * Uses `getSongMediaUrl` which reads from the songs folder.
 * Falls back to song.baseFolder if localStorage 'karaoke-songs-folder' is not set.
 * Restores ONLY the URLs that are missing — doesn't re-fetch existing ones.
 */
export async function restoreSongUrls(song: Song): Promise<Song> {
  if (!isTauri()) {
    return song;
  }

  const restored = { ...song };

  // Clear stale blob URLs before restoring — they don't persist across page reloads
  if (restored.audioUrl?.startsWith('blob:')) restored.audioUrl = undefined;
  if (restored.videoBackground?.startsWith('blob:')) restored.videoBackground = undefined;
  if (restored.coverImage?.startsWith('blob:')) restored.coverImage = undefined;

  // Resolve the effective base folder (shared utility)
  const resolvedFolder = resolveSongsBaseFolder(song.baseFolder);

  if (!resolvedFolder) {
    // If baseFolder is not set, check if relative paths look like absolute paths
    const allPaths = [song.relativeAudioPath, song.relativeVideoPath, song.relativeCoverPath].filter(Boolean);
    const hasAbsolutePath = allPaths.some(p => p && isAbsolutePath(p));
    if (!hasAbsolutePath) {
      console.warn('[SongLibrary] No base folder available for song:', song.title);
      return song;
    }
    // Some relative paths are actually absolute — will be handled by getSongMediaUrl
  }

  // Persist the resolved baseFolder if it differs from what was stored
  if (resolvedFolder && resolvedFolder !== song.baseFolder && isAbsolutePath(resolvedFolder)) {
    restored.baseFolder = resolvedFolder;
    try {
      updateSong(song.id, { baseFolder: resolvedFolder });
    } catch {
      // Non-critical — the fix is in memory for this session
    }
  }

  try {
    // Restore all URLs in parallel instead of sequentially
    const urlPromises: Promise<void>[] = [];

    // Restore audio URL from songs folder — only if missing
    if (song.relativeAudioPath && !song.audioUrl) {
      urlPromises.push(
        getSongMediaUrl(song.relativeAudioPath, resolvedFolder ?? undefined).then(url => {
          if (url) {
            restored.audioUrl = url;
          } else {
            console.warn('[SongLibrary] Failed to restore audio URL for', song.title, '- file may not exist:', song.relativeAudioPath);
          }
        }),
      );
    }

    // Restore video URL from songs folder — only if missing
    if (song.relativeVideoPath && !song.videoBackground) {
      urlPromises.push(
        getSongMediaUrl(song.relativeVideoPath, resolvedFolder ?? undefined).then(url => {
          if (url) {
            restored.videoBackground = url;
          } else {
            console.warn('[SongLibrary] Failed to restore video URL for', song.title, '- file may not exist:', song.relativeVideoPath);
          }
        }),
      );
    }

    // Restore cover URL from songs folder — only if missing
    if (song.relativeCoverPath && !song.coverImage) {
      urlPromises.push(
        getSongMediaUrl(song.relativeCoverPath, resolvedFolder ?? undefined).then(url => {
          if (url) {
            restored.coverImage = url;
          } else {
            console.warn('[SongLibrary] Failed to restore cover URL for', song.title, '- file may not exist:', song.relativeCoverPath);
          }
        }),
      );
    }

    await Promise.all(urlPromises);
  } catch (error) {
    console.error('[SongLibrary] Failed to restore song URLs:', error);
  }

  return restored;
}

/**
 * Ensure a song has valid media URLs.
 * This is the central function that should be called before using a song.
 * It restores URLs from relative paths if needed (Tauri only).
 */
export async function ensureSongUrls(song: Song): Promise<Song> {
  if (!isTauri()) {
    return song;
  }

  // Check if any URL restoration is needed.
  // Blob URLs (blob:...) don't persist across page reloads — treat them as stale.
  const isStaleBlob = (url: string | undefined) => url?.startsWith('blob:') ?? false;
  const needsAudio = song.relativeAudioPath && (!song.audioUrl || isStaleBlob(song.audioUrl));
  const needsVideo = song.relativeVideoPath && (!song.videoBackground || isStaleBlob(song.videoBackground));
  const needsCover = song.relativeCoverPath && (!song.coverImage || isStaleBlob(song.coverImage));

  if (!needsAudio && !needsVideo && !needsCover) {
    return song;
  }

  return await restoreSongUrls(song);
}
