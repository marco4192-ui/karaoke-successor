/**
 * Editor #VIDEO field helpers.
 *
 * The #VIDEO tag can hold a local file name ("video.mp4"), a direct video URL,
 * a streaming-platform URL — or (VK Video) a FULL iframe embed code pasted from
 * the „Einbetten“ dialog. The editor input needs to:
 *   1. DISPLAY the effective video source (platform URLs live in separate
 *      Song fields, so binding only `song.videoFile` showed an empty field
 *      for platform songs — the root cause of the VK "missing embed hash"
 *      loop: users pasted the embed code into an apparently empty field and
 *      the stale watch URL kept winning in generateUltraStarTxt).
 *   2. CLASSIFY user input into exactly ONE Song video field (clearing all
 *      others) so the txt export always writes the newest value.
 */

import { detectVideoPlatform, isDirectVideoUrl, normalizeVideoUrlInput } from '@/lib/url-utils';
import type { Song } from '@/types/game';

/** The effective #VIDEO value to show in the editor input. */
export function getEffectiveVideoValue(song: Song): string {
  return (
    song.videoFile
    || song.youtubeUrl
    || song.dailymotionUrl
    || song.vimeoUrl
    || song.rutubeUrl
    || song.vkVideoUrl
    || song.bilibiliUrl
    || song.nicovideoUrl
    // Direct http(s) video URLs only — blob:/file paths are playback artifacts
    || (song.videoBackground && /^https?:\/\//i.test(song.videoBackground) ? song.videoBackground : '')
    || ''
  );
}

/** All Song fields that together describe the video source. */
const VIDEO_FIELDS: Array<keyof Song> = [
  'videoFile', 'youtubeUrl', 'dailymotionUrl', 'vimeoUrl', 'rutubeUrl',
  'vkVideoUrl', 'bilibiliUrl', 'nicovideoUrl', 'videoBackground',
];

/**
 * Classify raw #VIDEO user input (URL, direct-file URL, full iframe embed
 * code or local file name) into the matching Song fields — every other video
 * field is cleared so the value actually wins in generateUltraStarTxt.
 */
export function classifyVideoInput(raw: string): Partial<Song> {
  const cleared: Partial<Song> = {};
  for (const key of VIDEO_FIELDS) {
    cleared[key] = undefined as never; // reset all video fields first
  }
  const trimmed = raw.trim();
  if (!trimmed) return cleared;

  // Embed codes (&amp;-escaped or not) are reduced to their bare src URL.
  const url = normalizeVideoUrlInput(trimmed);
  const platform = detectVideoPlatform(url);
  switch (platform) {
    case 'youtube': return { ...cleared, youtubeUrl: url };
    case 'dailymotion': return { ...cleared, dailymotionUrl: url };
    case 'vimeo': return { ...cleared, vimeoUrl: url };
    case 'rutube': return { ...cleared, rutubeUrl: url };
    case 'vk': return { ...cleared, vkVideoUrl: url };
    case 'bilibili': return { ...cleared, bilibiliUrl: url };
    case 'nicovideo': return { ...cleared, nicovideoUrl: url };
    default: break;
  }

  // Direct video file URL (mp4/webm/…) or any other http(s) URL → <video>
  if (/^https?:\/\//i.test(url) || isDirectVideoUrl(url)) {
    return { ...cleared, videoBackground: url };
  }

  // Local file name — keep as-is (trimmed)
  return { ...cleared, videoFile: trimmed };
}
