/**
 * Shared URL utility functions for detecting and parsing video URLs.
 * Used by ultrastar-parser.ts (lib layer) and the platform player components.
 *
 * Supported streaming platforms (#VIDEO: URL values):
 * - YouTube        (youtube.com, youtu.be, music.youtube.com, youtube-nocookie.com)
 * - Dailymotion    (dailymotion.com, dai.ly) — the ONLY major platform with
 *                  OFFICIAL ad events (AD_START/AD_END) for embeds
 * - Vimeo          (vimeo.com, player.vimeo.com) — ad-free, official player.js SDK
 * Plus direct video file URLs (MP4/WebM/…) handled by the HTML5 <video> element.
 */

/** Unified streaming platform identifier. */
export type VideoPlatform = 'youtube' | 'dailymotion' | 'vimeo' | null;

/** Unified error codes for platform players (YouTube code space + extension). */
export const VIDEO_ERROR_GEO = 1000;

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

/**
 * Check if a URL points to a Dailymotion video.
 * Matches dailymotion.com (any regional subdomain) and the shortener dai.ly.
 * Hostname-based so lookalike domains (e.g. "notdailymotion.com") are rejected.
 */
export function isDailymotionUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === 'dailymotion.com' || host.endsWith('.dailymotion.com')) return true;
    if (host === 'dai.ly' || host.endsWith('.dai.ly')) return true;
    return false;
  } catch {
    // Not a parseable absolute URL — fall back to pattern matching
    const lower = url.toLowerCase();
    return (
      /^https?:\/\/([a-z0-9-]+\.)*dailymotion\.com\//.test(lower) ||
      /^https?:\/\/([a-z0-9-]+\.)*dai\.ly\//.test(lower) ||
      /^(www\.)?dailymotion\.com\//.test(lower)
    );
  }
}

/**
 * Check if a URL points to a Vimeo video.
 * Matches vimeo.com and player.vimeo.com (but NOT e.g. "notvimeo.com").
 */
export function isVimeoUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com';
  } catch {
    const lower = url.toLowerCase();
    return /^https?:\/\/(www\.|player\.)?vimeo\.com\//.test(lower);
  }
}

/** Detect which streaming platform a URL belongs to (null = not a known platform). */
export function detectVideoPlatform(url: string | undefined | null): VideoPlatform {
  if (!url) return null;
  if (isYouTubeUrl(url)) return 'youtube';
  if (isDailymotionUrl(url)) return 'dailymotion';
  if (isVimeoUrl(url)) return 'vimeo';
  return null;
}

/**
 * Extract a Dailymotion video ID ("xXXXXXX…" or numeric ID) from URL formats:
 * - https://www.dailymotion.com/video/x84sh87
 * - https://www.dailymotion.com/video/x84sh87_music
 * - https://dai.ly/x84sh87
 * - https://www.dailymotion.com/embed/video/x84sh87
 */
export function extractDailymotionId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /dailymotion\.com\/(?:embed\/)?video\/([a-zA-Z0-9]+)/i,
    /dai\.ly\/([a-zA-Z0-9]+)/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export interface VimeoVideoRef {
  id: string;
  /** Unlisted-video access hash (vimeo.com/123456789/abcdef123). */
  hash?: string;
}

/**
 * Extract a Vimeo video reference from URL formats:
 * - https://vimeo.com/123456789
 * - https://vimeo.com/123456789/abcdef123        (unlisted + hash)
 * - https://vimeo.com/channels/music/123456789
 * - https://vimeo.com/groups/xxx/videos/123456789
 * - https://vimeo.com/album/xxx/video/123456789
 * - https://player.vimeo.com/video/123456789?h=abcdef123
 */
export function extractVimeoRef(url: string): VimeoVideoRef | null {
  if (!url) return null;
  let path = '';
  let queryHash: string | undefined;
  try {
    const parsed = new URL(url);
    path = parsed.pathname;
    queryHash = parsed.searchParams.get('h') || undefined;
  } catch {
    // Not a parseable absolute URL — try the raw string
    const raw = url.match(/(?:player\.)?vimeo\.com\/(video\/[^\s?#]+)/i);
    if (raw?.[1]) path = `/${raw[1]}`;
  }
  if (!path) return null;

  // Strip "video/" prefix (player.vimeo.com/video/ID[/hash])
  const videoMatch = path.match(/^\/video\/(\d{6,12})(?:\/([a-zA-Z0-9]+))?/i);
  if (videoMatch?.[1]) {
    return { id: videoMatch[1], hash: videoMatch[2] ?? queryHash };
  }

  // vimeo.com/channels/x/ID, /groups/x/videos/ID, /album/x/video/ID
  const channelMatch = path.match(/\/(?:videos?)\/(\d{6,12})(?:\/([a-zA-Z0-9]+))?$/i)
    ?? path.match(/^\/(?:channels?|groups?|album)\/[^/]+\/(?:videos?\/)?(\d{6,12})(?:\/([a-zA-Z0-9]+))?/i);
  if (channelMatch?.[1]) {
    return { id: channelMatch[1], hash: channelMatch[2] ?? queryHash };
  }

  // Plain vimeo.com/ID or vimeo.com/ID/hash (unlisted)
  const plainMatch = path.match(/^\/(\d{6,12})(?:\/([a-zA-Z0-9]+))?/i);
  if (plainMatch?.[1]) {
    return { id: plainMatch[1], hash: plainMatch[2] ?? queryHash };
  }

  return null;
}

/** Human-readable platform domain used in the ad overlay ("Einblendung über …"). */
export function platformAdLabel(platform: VideoPlatform): string {
  switch (platform) {
    case 'youtube': return 'youtube.com';
    case 'dailymotion': return 'dailymotion.com';
    case 'vimeo': return 'vimeo.com';
    default: return '';
  }
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
 * Used to distinguish direct video URLs from streaming platform URLs.
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
