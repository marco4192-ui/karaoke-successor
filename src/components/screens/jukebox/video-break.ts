'use client';

/**
 * Jukebox "Video Break" — synthetic queue entries for plain video links.
 *
 * A video break is a Song-shaped object WITHOUT lyrics/audio file whose only
 * purpose is playback: the linked video (YouTube, Dailymotion, Vimeo, Rutube,
 * VK, Bilibili, Niconico or a direct video file) provides BOTH picture and
 * sound. There is nothing to sing — if no subtitles exist, that is fine.
 *
 * Queue rules (implemented in use-jukebox.ts):
 * - Jukebox running  → inserted AFTER the last user-requested song
 *                      (i.e. before the next random song).
 * - Nothing running  → starts playing immediately.
 */
import type { Song } from '@/types/game';
import {
  detectVideoPlatform,
  extractEmbedSrcUrl,
  isDirectVideoUrl,
  normalizeVideoUrlInput,
  platformAdLabel,
  type VideoPlatform,
} from '@/lib/url-utils';

/** ID prefix that marks a synthetic video-break song. */
export const VIDEO_BREAK_ID_PREFIX = 'videobreak-';

/**
 * Extract the src URL from an iframe/embed HTML snippet.
 *
 * Shared implementation lives in url-utils.ts (extractEmbedSrcUrl) — re-exported
 * here for existing callers. Accepts the full VK „Einbetten“ iframe code (the
 * REQUIRED hash lives in the src attribute) and multi-line snippets.
 */
export const extractEmbedSrc = extractEmbedSrcUrl;

/** Normalize any user input (single link OR full embed code) to a bare URL. */
const normalizeVideoInput = normalizeVideoUrlInput;

/** A single parsed entry of a pasted/uploaded link list. */
export interface ParsedVideoLink {
  url: string;
  /** Optional user-provided title ("URL | Title" syntax or #EXTINF). */
  label?: string;
}

/** True when the song is a synthetic video-break entry (no library song). */
export function isVideoBreak(song: Song | null | undefined): boolean {
  return !!song && typeof song.id === 'string' && song.id.startsWith(VIDEO_BREAK_ID_PREFIX);
}

/** Platform of a video break (stored in the matching song URL field). */
export function videoBreakPlatform(song: Song): NonNullable<VideoPlatform> | 'file' | null {
  return getSongPlatformVideo(song)?.platform ?? (song.videoBackground ? 'file' : null);
}

/**
 * Resolve the platform video URL of a song using the same priority chain as
 * the game (use-youtube-game.ts): youtubeUrl → … → videoBackground → videoUrl.
 * Values are normalized (iframe embed codes reduced to their src URL, HTML
 * entities unescaped) so a #VIDEO tag holding a full VK embed code works.
 * Returns null when the song has no streaming-platform video.
 */
export function getSongPlatformVideo(song: Song | null | undefined): { platform: NonNullable<VideoPlatform>; url: string } | null {
  if (!song) return null;
  const candidates = [
    song.youtubeUrl,
    song.dailymotionUrl,
    song.vimeoUrl,
    song.rutubeUrl,
    song.vkVideoUrl,
    song.bilibiliUrl,
    song.nicovideoUrl,
    song.videoBackground,
    song.videoUrl,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = normalizeVideoUrlInput(candidate);
    const platform = detectVideoPlatform(normalized);
    if (platform) return { platform, url: normalized };
  }
  return null;
}

/** Short human label for a platform ("YouTube", "Rutube", …). */
export function platformDisplayName(platform: NonNullable<VideoPlatform> | 'file' | null): string {
  if (platform === 'file') return 'Video-Datei';
  if (platform === null) return 'Video';
  switch (platform) {
    case 'youtube': return 'YouTube';
    case 'dailymotion': return 'Dailymotion';
    case 'vimeo': return 'Vimeo';
    case 'rutube': return 'Rutube';
    case 'vk': return 'VK Video';
    case 'bilibili': return 'Bilibili';
    case 'nicovideo': return 'Niconico';
    default: return platformAdLabel(platform) || 'Video';
  }
}

/** Fallback title derived from the URL (short, readable). */
function deriveTitle(url: string, platform: VideoPlatform | 'file'): string {
  if (platform === 'file') {
    // Last path segment without extension
    try {
      const seg = url.split(/[?#]/)[0].split('/').filter(Boolean).pop() || 'Video';
      return decodeURIComponent(seg.replace(/\.[a-z0-9]{2,5}$/i, '')) || 'Video';
    } catch { return 'Video'; }
  }
  if (platform === 'youtube') {
    const m = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/) ?? url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
    if (m?.[1]) return `YouTube · ${m[1]}`;
  }
  return platformDisplayName(platform);
}

/**
 * Create a synthetic video-break Song for a supported video URL.
 * Accepts plain URLs AND full iframe embed codes (reduced to their src URL).
 * Returns null when the URL matches no supported platform and no direct file.
 */
export function createVideoBreakSong(url: string, label?: string): Song | null {
  const trimmed = normalizeVideoInput(url);
  if (!trimmed) return null;

  const platform = detectVideoPlatform(trimmed);
  const isFile = !platform && isDirectVideoUrl(trimmed);
  if (!platform && !isFile) return null;

  // Protocol-relative srcs (//vk.com/…) become absolute https URLs; bare
  // hostnames get a scheme only when platform detection already succeeded.
  const normalizedUrl = trimmed.startsWith('//')
    ? `https:${trimmed}`
    : /^https?:\/\//i.test(trimmed) || platform ? trimmed : `https://${trimmed}`;

  const id = `${VIDEO_BREAK_ID_PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  const title = (label && label.trim()) || deriveTitle(trimmed, platform ?? 'file');

  const song: Song = {
    id,
    title,
    artist: platformDisplayName(platform ?? 'file'),
    album: undefined,
    duration: 0, // unknown until the player reports it
    bpm: 0,
    difficulty: 'medium',
    rating: 0,
    lyrics: [],
    gap: 0,
    // The video IS the audio source — never muted in favour of an MP3:
    hasEmbeddedAudio: true,
  };

  // Route into the platform-specific field the players/dispatch read.
  switch (platform) {
    case 'youtube': song.youtubeUrl = normalizedUrl; break;
    case 'dailymotion': song.dailymotionUrl = normalizedUrl; break;
    case 'vimeo': song.vimeoUrl = normalizedUrl; break;
    case 'rutube': song.rutubeUrl = normalizedUrl; break;
    case 'vk': song.vkVideoUrl = normalizedUrl; break;
    case 'bilibili': song.bilibiliUrl = normalizedUrl; break;
    case 'nicovideo': song.nicovideoUrl = normalizedUrl; break;
    default: song.videoBackground = normalizedUrl; break; // direct file
  }

  return song;
}

/** Validate a user-pasted link (or full iframe embed code) without creating a song. */
export function isSupportedVideoLink(url: string): boolean {
  const trimmed = normalizeVideoInput(url);
  if (!trimmed) return false;
  return detectVideoPlatform(trimmed) !== null || isDirectVideoUrl(trimmed);
}

/**
 * Parse a multi-line link list into entries.
 *
 * Supported line formats:
 *   https://…                                    plain URL
 *   https://… | Mein Titel                        URL + custom title
 *   Mein Titel | https://…                        title first
 *   <iframe src="https://…" …></iframe>           full embed code (VK etc.) —
 *                                                 reduced to its src URL;
 *                                                 multi-line iframes work too
 *   #EXTINF:123,Mein Titel  (m3u) followed by URL  → title from EXTINF
 *   #…                                           comment (skipped)
 */
export function parseVideoLinkInput(input: string): ParsedVideoLink[] {
  if (!input) return [];
  const results: ParsedVideoLink[] = [];
  let pendingExtinfLabel: string | null = null;

  // Collapse (possibly multi-line) iframe embed snippets to their bare src
  // URL BEFORE the line split — otherwise a src attribute that sits on its
  // own line is lost (the split fragments the tag, and the per-line fallback
  // below finds no src on the first fragment). Whole-block replacement keeps
  // the src on the tag's first line; single-line iframes pass through the
  // same path. Hash-less VK embed srcs are fine — classification happens later.
  const prepared = input.includes('<')
    ? input.replace(/<iframe\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>(?:\s*<\/iframe\s*>)?/gi, '$1')
    : input;

  for (const rawLine of prepared.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;

    // m3u metadata: remember the title for the next URL line
    if (/^#EXTINF:/i.test(line)) {
      const commaIdx = line.indexOf(',');
      pendingExtinfLabel = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : null;
      continue;
    }
    // Other m3u/comments are skipped
    if (line.startsWith('#')) continue;

    // VK & Co: reduce a full iframe embed snippet on this line to its src URL
    // (must happen BEFORE the '|'-split below — embed attributes contain no
    // pipes, but the check keeps a single code path for every entry point).
    const embedSrc = extractEmbedSrc(line);
    if (embedSrc) line = embedSrc;

    // "URL | Title" or "Title | URL"
    let url = line;
    let label = pendingExtinfLabel ?? undefined;
    pendingExtinfLabel = null;
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      const urlPartIdx = parts.findIndex(p => /^https?:\/\//i.test(p) || isSupportedVideoLink(p));
      if (urlPartIdx >= 0 && parts.length >= 2) {
        url = parts[urlPartIdx];
        const other = parts[1 - urlPartIdx];
        if (other && !label) label = other;
      }
    }

    if (!isSupportedVideoLink(url)) continue;
    const entry: ParsedVideoLink = { url };
    if (label) entry.label = label;
    results.push(entry);
  }

  return results;
}

/** Extract all video links from a free-form text (any whitespace separated). */
export function extractVideoLinksFromText(text: string): ParsedVideoLink[] {
  if (!text) return [];
  // Collapse iframe embed snippets (they contain spaces!) into their bare src
  // URL so tokenization treats them as single links.
  const prepared = text.replace(/<iframe\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/iframe\s*>/gi, '$1');
  const tokens = prepared.split(/[\s\n\r\t]+/).filter(Boolean);
  return tokens
    .map(token => normalizeVideoInput(token.replace(/[),.;]+$/, '')))
    .filter(token => isSupportedVideoLink(token))
    .map(url => ({ url }));
}
