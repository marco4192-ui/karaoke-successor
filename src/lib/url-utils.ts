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

// Video file extensions supported by HTML5 <video> element (not playlist/manifest files)
const DIRECT_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.ogv'];

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
