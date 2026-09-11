/**
 * Shared URL utility functions for detecting and parsing video URLs.
 * Used by ultrastar-parser.ts (lib layer) and the platform player components.
 *
 * Supported streaming platforms (#VIDEO: URL values):
 * - YouTube        (youtube.com, youtu.be, music.youtube.com, youtube-nocookie.com)
 * - Dailymotion    (dailymotion.com, dai.ly) — the ONLY major platform with
 *                  OFFICIAL ad events (AD_START/AD_END) for embeds
 * - Vimeo          (vimeo.com, player.vimeo.com) — ad-free, official player.js SDK
 * - Rutube         (rutube.ru) — postMessage Player API (playStart/currentTime/changeState)
 * - VK Video       (vk.com, vkvideo.ru — incl. video_ext.php embeds with hash)
 * - Bilibili       (bilibili.com) — iframe only, verified t= start param, manual start gate
 * - Niconico       (nicovideo.jp) — unofficial jsapi=1 postMessage API
 * Plus direct video file URLs (MP4/WebM/…) handled by the HTML5 <video> element.
 */

/** Unified streaming platform identifier. */
export type VideoPlatform = 'youtube' | 'dailymotion' | 'vimeo' | 'rutube' | 'vk' | 'bilibili' | 'nicovideo' | null;

/** Platforms without a playback API — the user must start the video manually. */
export const MANUAL_START_PLATFORMS: ReadonlyArray<NonNullable<VideoPlatform>> = ['bilibili'];

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
  if (isRutubeUrl(url)) return 'rutube';
  if (isVkVideoUrl(url)) return 'vk';
  if (isBilibiliUrl(url)) return 'bilibili';
  if (isNiconicoUrl(url)) return 'nicovideo';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bilibili
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a URL points to a Bilibili video.
 * Matches bilibili.com (watch pages AND the player.bilibili.com embed player).
 * b23.tv short links are NOT supported (they need a network redirect to resolve).
 */
export function isBilibiliUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === 'bilibili.com' || host.endsWith('.bilibili.com')) return true;
    return false;
  } catch {
    const lower = url.toLowerCase();
    return /^https?:\/\/([a-z0-9-]+\.)*bilibili\.com\//.test(lower);
  }
}

export interface BilibiliVideoRef {
  /** BV id including the "BV" prefix (preferred identifier). */
  bvid?: string;
  /** Legacy numeric av id (without the "av" prefix). */
  aid?: string;
  /** Part index (P1, P2, …) — 1-based, defaults to 1. */
  page: number;
  /** cid when explicitly present in a player.bilibili.com embed URL (optional). */
  cid?: string;
}

/**
 * Extract a Bilibili video reference from URL formats:
 * - https://www.bilibili.com/video/BV1Kx411q7Eg
 * - https://www.bilibili.com/video/BV1Kx411q7Eg?p=2
 * - https://www.bilibili.com/video/av84267566
 * - https://player.bilibili.com/player.html?bvid=BV…&aid=…&cid=…&page=1
 * Returns null when the URL is Bilibili but no id can be extracted (e.g. b23.tv).
 */
export function extractBilibiliRef(url: string): BilibiliVideoRef | null {
  if (!url) return null;
  let params: URLSearchParams | null = null;
  let path = '';
  try {
    const parsed = new URL(url);
    path = parsed.pathname;
    params = parsed.searchParams;
  } catch {
    // Not a parseable absolute URL — try the raw string for a BV/av id
    const rawBv = url.match(/(BV[a-zA-Z0-9]{8,12})/);
    if (rawBv?.[1]) return { bvid: rawBv[1], page: 1 };
    const rawAv = url.match(/av(\d{4,12})/i);
    if (rawAv?.[1]) return { aid: rawAv[1], page: 1 };
    return null;
  }

  // player.bilibili.com/player.html?bvid=…&aid=…&cid=…&page=N
  if (params) {
    const bvid = params.get('bvid');
    const aid = params.get('aid');
    if (bvid || aid) {
      const pageParam = parseInt(params.get('page') || '1', 10);
      return {
        bvid: bvid || undefined,
        aid: aid || undefined,
        cid: params.get('cid') || undefined,
        page: isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
      };
    }
  }

  // /video/BV… or /video/av…
  const pathMatch = path.match(/^\/video\/(BV[a-zA-Z0-9]{8,12}|av\d{4,12})/i);
  if (pathMatch?.[1]) {
    const id = pathMatch[1];
    let page = 1;
    if (params) {
      const p = parseInt(params.get('p') || '1', 10);
      if (isFinite(p) && p > 0) page = p;
    }
    if (/^BV/i.test(id)) return { bvid: id, page };
    return { aid: id.replace(/^av/i, ''), page };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Niconico
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a URL points to a Niconico video.
 * Matches nicovideo.jp watch pages and embed.nicovideo.jp players.
 */
export function isNiconicoUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === 'nicovideo.jp' || host.endsWith('.nicovideo.jp')) return true;
    return false;
  } catch {
    const lower = url.toLowerCase();
    return /^https?:\/\/([a-z0-9-]+\.)*nicovideo\.jp\//.test(lower);
  }
}

/**
 * Extract a Niconico video id (sm9, so35384944, nm…) from URL formats:
 * - https://www.nicovideo.jp/watch/sm9
 * - https://embed.nicovideo.jp/watch/sm9?jsapi=1
 * Returns null when no id can be extracted.
 */
export function extractNiconicoId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/nicovideo\.jp\/watch\/((?:sm|so|nm)\d{1,12})/i)
    ?? url.match(/\b((?:sm|so|nm)\d{1,12})\b/);
  return m?.[1] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// VK Video
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a URL points to a VK video.
 * Matches vk.com / vkvideo.ru / m.vk.com video pages AND video_ext.php embeds.
 */
export function isVkVideoUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if ((host === 'vk.com' || host.endsWith('.vk.com') || host === 'vkvideo.ru' || host.endsWith('.vkvideo.ru'))
        && (path.startsWith('/video') || path.startsWith('/video_ext.php'))) {
      return true;
    }
    return false;
  } catch {
    const lower = url.toLowerCase();
    return /^https?:\/\/([a-z0-9-]+\.)?(vk\.com|vkvideo\.ru)\/video(_ext\.php)?/i.test(lower);
  }
}

export interface VkVideoRef {
  /** Owner id (negative for groups/clubs, positive for users). */
  oid: string;
  /** Video id. */
  videoId: string;
  /** Access hash — REQUIRED for embeds; only present in video_ext.php "Export" URLs. */
  hash?: string;
  /** Playlist id (optional, from the list= query param). */
  list?: string;
}

/**
 * Extract a VK video reference from URL formats:
 * - https://vk.com/video_ext.php?oid=-22822305&id=456239528&hash=e592…  (Export/embed URL — hash present)
 * - https://vk.com/video-22822305_456239528                                    (watch URL — NO hash!)
 * - https://vkvideo.ru/video-22822305_456239528
 * Returns null when no ids can be extracted. A missing hash is returned as
 * `hash: undefined` — the player surfaces a "paste the Export URL" error then.
 */
export function extractVkVideoRef(url: string): VkVideoRef | null {
  if (!url) return null;
  let params: URLSearchParams | null = null;
  let path = '';
  try {
    const parsed = new URL(url);
    path = parsed.pathname;
    params = parsed.searchParams;
  } catch {
    return null;
  }

  // video_ext.php?oid=…&id=…&hash=…
  if (params) {
    const oid = params.get('oid');
    const id = params.get('id');
    if (oid && id) {
      return {
        oid,
        videoId: id,
        hash: params.get('hash') || undefined,
        list: params.get('list') || undefined,
      };
    }
  }

  // /video-12345_67890 (also /videos-12345 or query variants)
  const pathMatch = path.match(/^\/videos?(-?\d+)_(\d+)(?:\?|%3F|$)/i)
    ?? path.match(/^\/videos?(-?\d+)_(\d+)/i);
  if (pathMatch?.[1] && pathMatch?.[2]) {
    return { oid: pathMatch[1], videoId: pathMatch[2] };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rutube
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a URL points to a Rutube video.
 * Matches rutube.ru video pages and play/embed players.
 */
export function isRutubeUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === 'rutube.ru' || host.endsWith('.rutube.ru')) return true;
    return false;
  } catch {
    const lower = url.toLowerCase();
    return /^https?:\/\/([a-z0-9-]+\.)*rutube\.ru\//.test(lower);
  }
}

/**
 * Extract a Rutube video id (32-char hex) from URL formats:
 * - https://rutube.ru/video/9e4cd81a6b2566e9d949881dbb53905e/
 * - https://rutube.ru/play/embed/9e4cd81a6b2566e9d949881dbb53905e/
 * Returns null when no id can be extracted.
 */
export function extractRutubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/rutube\.ru\/(?:video|play\/embed)\/([a-f0-9]{16,40})/i);
  return m?.[1] ?? null;
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
    case 'rutube': return 'rutube.ru';
    case 'vk': return 'vk.com';
    case 'bilibili': return 'bilibili.com';
    case 'nicovideo': return 'nicovideo.jp';
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
