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
  isDirectVideoUrl,
  platformAdLabel,
  type VideoPlatform,
} from '@/lib/url-utils';

/** ID prefix that marks a synthetic video-break song. */
export const VIDEO_BREAK_ID_PREFIX = 'videobreak-';

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
    const platform = detectVideoPlatform(candidate);
    if (platform) return { platform, url: candidate };
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
 * Returns null when the URL matches no supported platform and no direct file.
 */
export function createVideoBreakSong(url: string, label?: string): Song | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const platform = detectVideoPlatform(trimmed);
  const isFile = !platform && isDirectVideoUrl(trimmed);
  if (!platform && !isFile) return null;

  const normalizedUrl = /^https?:\/\//i.test(trimmed) || platform ? trimmed : `https://${trimmed}`;

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

/** Validate a user-pasted link without creating a song. */
export function isSupportedVideoLink(url: string): boolean {
  const trimmed = url.trim();
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
 *   #EXTINF:123,Mein Titel  (m3u) followed by URL  → title from EXTINF
 *   #…                                           comment (skipped)
 */
export function parseVideoLinkInput(input: string): ParsedVideoLink[] {
  if (!input) return [];
  const results: ParsedVideoLink[] = [];
  let pendingExtinfLabel: string | null = null;

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // m3u metadata: remember the title for the next URL line
    if (/^#EXTINF:/i.test(line)) {
      const commaIdx = line.indexOf(',');
      pendingExtinfLabel = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : null;
      continue;
    }
    // Other m3u/comments are skipped
    if (line.startsWith('#')) continue;

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
  const tokens = text.split(/[\s\n\r\t]+/).filter(Boolean);
  return tokens
    .map(token => token.replace(/[),.;]+$/, ''))
    .filter(token => isSupportedVideoLink(token))
    .map(url => ({ url }));
}
