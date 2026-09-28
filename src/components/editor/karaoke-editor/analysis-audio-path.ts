/**
 * Resolve the audio file path for the Audio Analysis panel (R5 module split,
 * extracted 1:1 from the karaoke-editor's analysisAudioPath memo). Pure
 * function — resolve relative paths to absolute, fall back to the video file
 * path so that video-embedded audio can be analyzed.
 */

import { normalizeFilePath } from '@/lib/tauri-file-storage';
import type { Song } from '@/types/game';

export function resolveAnalysisAudioPath(
  currentSong: Pick<Song, 'audioUrl' | 'relativeAudioPath' | 'baseFolder' | 'videoBackground' | 'relativeVideoPath' | 'youtubeUrl'>,
): string | null {
  // Helper to check if a path looks like an absolute filesystem path.
  const isAbsolute = (p: string) =>
    p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p) || p.startsWith('\\\\');

  // Step 1: Use relativeAudioPath + baseFolder if available.
  // This is the primary path for Tauri — constructs an absolute path.
  if (currentSong.relativeAudioPath && currentSong.baseFolder) {
    const normalizedBase = normalizeFilePath(currentSong.baseFolder);
    const normalizedRelative = normalizeFilePath(currentSong.relativeAudioPath);

    // FIX: If relativeAudioPath is already an absolute path, don't prepend baseFolder
    // (this prevents "D:/Songs/D:/Songs/Artist/song.mp3" doubling).
    if (isAbsolute(normalizedRelative)) {
      return normalizedRelative;
    }
    return `${normalizedBase}/${normalizedRelative}`;
  }

  // Step 2: Use audioUrl only if it's a filesystem path (not blob/http).
  // Blob URLs and http URLs can't be read by the Rust backend.
  if (currentSong.audioUrl && isAbsolute(currentSong.audioUrl) && !currentSong.audioUrl.startsWith('blob:')) {
    return currentSong.audioUrl;
  }

  // Step 3: Fallback to video file path (audio may be embedded in the video).
  // CRITICAL: Check relativeVideoPath FIRST (it's a usable filesystem path),
  // then videoBackground only if it's an absolute filesystem path (not blob/http).
  // A blob videoBackground from playback would shadow a valid relativeVideoPath.
  const videoRelative = currentSong.relativeVideoPath;
  const isVideoAbsolute = currentSong.videoBackground &&
    isAbsolute(currentSong.videoBackground) &&
    !currentSong.videoBackground.startsWith('blob:') &&
    !currentSong.videoBackground.startsWith('http');
  const videoPath = videoRelative || (isVideoAbsolute ? currentSong.videoBackground : undefined);
  if (videoPath && !currentSong.youtubeUrl) {
    const normalizedPath = normalizeFilePath(videoPath);
    if (isAbsolute(normalizedPath)) {
      return normalizedPath;
    }
    if (currentSong.baseFolder) {
      const normalizedBase = normalizeFilePath(currentSong.baseFolder);
      return `${normalizedBase}/${normalizedPath}`;
    }
  }

  return null;
}
