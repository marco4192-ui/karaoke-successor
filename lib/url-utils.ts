/**
 * Shared URL utility functions for detecting and parsing video URLs.
 * Used by ultrastar-parser.ts (lib layer) and youtube-player.tsx (component layer).
 */

/**
 * Check if a URL points to a YouTube video.
 * Matches youtube.com, youtu.be, music.youtube.com, and youtube-nocookie.com.
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('youtube-nocookie.com')
  );
}

// Video file extensions that should be treated as direct video URLs.
// Includes formats commonly found in UltraStar song collections.
// Note: Browser/WebView support varies — MP4/WebM have universal support,
// while AVI/MKV/WMV depend on the system media framework (especially in Tauri).
const DIRECT_VIDEO_EXTENSIONS = [
  '.mp4', '.webm', '.ogg', '.ogv',
  '.avi', '.mkv', '.mov', '.wmv', '.flv', '.m4v', '.3gp', '.ts',
];

/**
 * Check if a URL points directly to a video file (MP4, WebM, OGG, etc.).
 * Used to distinguish direct video URLs from YouTube or other platform URLs.
 */
export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    return DIRECT_VIDEO_EXTENSIONS.some(ext => pathname.endsWith(ext));
  } catch {
    const lower = url.toLowerCase();
    return DIRECT_VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext));
  }
}
