// UltraStar txt file parser
// Supports the standard UltraStar song format
//
// Format explanation:
// - Header: #KEY:VALUE (e.g., #TITLE:, #ARTIST:, #BPM:, #GAP:)
// - Notes: <type> <startBeat> <duration> <pitch> <lyric>
//   - : = normal note
//   - * = golden note (bonus points)
//   - F = freestyle (optional)
//   - R = rap note
//   - G = rap golden
// - Line breaks: - <beat> (marks end of a lyric line, separate line in file)
// - End: E
//
// LYRIC SPACING RULES (two conventions in the wild — see word-boundary.ts):
// - Variant 1 (classic): TRAILING space on the syllable that ends a word
//   ("lo " → "Hello ") — space is displayed after the word
// - Variant 2: LEADING space on the syllable that starts a new word
//   (": 8 4 60␣␣World" → " World") — space is displayed before the word.
//   Both are normalized to variant 1 by normalizeUltraStarWordBoundaries().
// - No space = syllable connected to next note
// - Line breaks ("- <beat>") create new lyric lines
// - A hyphen "-" as lyric text is just normal text, NOT a line break

import { Song, Difficulty } from '@/types/game';
import type { DuetPlayerTag } from '@/lib/parsers/duet-markers';
import { isYouTubeUrl, isDailymotionUrl, isVimeoUrl, isRutubeUrl, isVkVideoUrl, isBilibiliUrl, isNiconicoUrl, isDirectVideoUrl, normalizeVideoUrlInput, detectVideoPlatform } from '@/lib/url-utils';
import { normalizeTxtContent } from '@/lib/utils';
import { normalizeLanguage } from '@/lib/parsers/meta-normalizer';
import { convertNotesToLyricLines } from '@/lib/parsers/notes-to-lyric-lines';
import { matchPlayerMarkerLine, matchDuetNotePrefix, notesHaveBothPlayers } from '@/lib/parsers/duet-markers';
import { matchUltraStarNoteLine, normalizeUltraStarWordBoundaries } from '@/lib/parsers/word-boundary';

interface UltraStarNote {
  type: ':' | '*' | 'F' | 'R' | 'G';
  startBeat: number;
  duration: number;
  pitch: number; // Relative pitch (0-24 typical range)
  lyric: string;
  player?: DuetPlayerTag; // Voice tag: P1, P2, P4 (3rd voice), P8 (4th voice) or undefined (both)
}

export interface UltraStarSong {
  title: string;
  artist: string;
  mp3: string;
  video?: string;
  youtubeUrl?: string; // YouTube video URL (from #VIDEO:/#SOURCE: if it's a URL)
  dailymotionUrl?: string; // Dailymotion video URL (from #VIDEO:/#SOURCE:)
  vimeoUrl?: string; // Vimeo video URL (from #VIDEO:/#SOURCE:)
  rutubeUrl?: string; // Rutube video URL (from #VIDEO:/#SOURCE:) — postMessage Player API
  vkVideoUrl?: string; // VK video URL (from #VIDEO:/#SOURCE:) — official videoplayer.js SDK (needs Export-URL hash)
  bilibiliUrl?: string; // Bilibili video URL (from #VIDEO:/#SOURCE:) — iframe + manual start gate
  nicovideoUrl?: string; // Niconico video URL (from #VIDEO:/#SOURCE:) — unofficial jsapi
  backgroundVideo?: string; // #BACKGROUND: video URL (direct or platform link) — becomes videoBackground (fallback video source AFTER #VIDEO)
  videoGap?: number;
  cover?: string;
  background?: string;
  bpm: number;
  gap: number; // Milliseconds before first note
  start?: number; // #START tag - milliseconds to skip at beginning of audio
  end?: number; // #END tag - song end time in ms
  previewStart?: number;
  previewDuration?: number;
  genre?: string;
  year?: number;
  language?: string;
  edition?: string;
  creator?: string;
  version?: string; // #VERSION: - format version
  medleyStartBeat?: number; // #MEDLEYSTARTBEAT:
  medleyEndBeat?: number; // #MEDLEYENDBEAT:
  tags?: string; // #TAGS:
  notes: UltraStarNote[];
  lineBreaks: number[]; // Beats where line breaks occur
  // Multi-voice (duet/trio/quartet) support
  isDuet?: boolean;
  /** Voice names, index 0-3 → P1/P2/P4/P8. */
  duetPlayerNames?: string[];
}

/** Image extensions for the #BACKGROUND tag — values ending in these stay background images. */
const BACKGROUND_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];

/**
 * True when a #BACKGROUND value looks like a VIDEO source instead of an image:
 * not an image extension AND (direct video URL or a streaming-platform link).
 */
function isBackgroundVideoValue(value: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  if (BACKGROUND_IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext))) return false;
  // Platform links (YouTube, Dailymotion, Vimeo, Rutube, VK, Bilibili, Niconico)
  if (detectVideoPlatform(normalizeVideoUrlInput(value))) return true;
  // Direct video file URLs (.mp4, .webm, …)
  return isDirectVideoUrl(value);
}

/**
 * Classify a #VIDEO / #SOURCE header value into the UltraStarSong URL fields.
 * Both keys share the EXACT same platform classification — #SOURCE is the new
 * convention for video URLs (both keys are parsed, writers emit #SOURCE).
 */
function classifyVideoHeaderValue(song: UltraStarSong, rawValue: string): void {
  // The raw value may be a FULL iframe embed code (VK „Einbetten“)
  // or an &amp;-escaped URL — normalizeVideoUrlInput reduces embed
  // snippets to their src URL and unescapes entities BEFORE the
  // startsWith('http') gate (an embed code would fail that check).
  const videoValue = normalizeVideoUrlInput(rawValue);
  if (videoValue.startsWith('http://') || videoValue.startsWith('https://')) {
    if (isYouTubeUrl(videoValue)) {
      // YouTube URL — store separately for YouTube player
      song.youtubeUrl = videoValue;
    } else if (isDailymotionUrl(videoValue)) {
      // Dailymotion URL — official ad events on embeds
      song.dailymotionUrl = videoValue;
    } else if (isVimeoUrl(videoValue)) {
      // Vimeo URL — ad-free embeds with player.js SDK
      song.vimeoUrl = videoValue;
    } else if (isRutubeUrl(videoValue)) {
      // Rutube URL — postMessage Player API (playStart/currentTime)
      song.rutubeUrl = videoValue;
    } else if (isVkVideoUrl(videoValue)) {
      // VK Video URL — official SDK; hash only in Export URLs
      song.vkVideoUrl = videoValue;
    } else if (isBilibiliUrl(videoValue)) {
      // Bilibili URL — iframe embed, manual start gate
      song.bilibiliUrl = videoValue;
    } else if (isNiconicoUrl(videoValue)) {
      // Niconico URL — unofficial jsapi embed
      song.nicovideoUrl = videoValue;
    } else {
      // Direct video URL (MP4, WebM, etc.) — play via HTML5 <video> element
      // Stored in video field, which becomes videoBackground later
      song.video = videoValue;
    }
  } else {
    song.video = videoValue;
  }
}

// Parse UltraStar txt file content
export function parseUltraStarTxt(content: string): UltraStarSong {
  // IMPORTANT: Don't trim lines! Trailing spaces in lyrics are significant.
  // - Trailing space in lyric (e.g., "way ") = end of word
  // - No trailing space (e.g., "runa") = syllable connected to next note
  // Only filter out completely empty lines
  const normalized = normalizeTxtContent(content);
  const lines = normalized.split('\n').filter(l => l.trim().length > 0);
  
  const song: UltraStarSong = {
    title: 'Unknown',
    artist: 'Unknown',
    mp3: '',
    bpm: 120,
    gap: 0,
    notes: [],
    lineBreaks: [],
  };
  
  // Track current voice for multi-voice songs (P1/P2/P4/P8 section markers)
  let currentPlayer: DuetPlayerTag | undefined = undefined;
  let hasDuetHeader = false;
  // Header voice-name index for #P1/#P2/#P3/#P4/#P8 tags.
  // #P4 in a header refers to the bitmask voice-3 tag (same as the body marker)
  // so trio/quartet files round-trip cleanly; #P3 is accepted as positional alias.
  const headerNameIndex: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 2, P8: 3 };

  for (const line of lines) {
    // Parse header attributes (#KEY:VALUE format)
    if (line.startsWith('#')) {
      const match = line.match(/^#(\w+):(.*)$/);
      if (match) {
        const [, key, value] = match;
        switch (key.toUpperCase()) {
          case 'TITLE':
            song.title = value.trim();
            break;
          case 'ARTIST':
            song.artist = value.trim();
            break;
          case 'MP3':
            song.mp3 = value.trim();
            break;
          case 'VIDEO':
          case 'SOURCE': {
            // #VIDEO and #SOURCE are treated EXACTLY the same (the value is
            // classified as YouTube / Dailymotion / Vimeo / Rutube / VK /
            // Bilibili / Niconico / direct video URL / local path).
            // Writer convention (generateUltraStarTxt): REAL video FILES are
            // exported as #VIDEO:, video URLs as #SOURCE: — but parsing
            // accepts BOTH keys for either value type (#VIDEO: also accepts
            // video URLs for backward compatibility with older files).
            classifyVideoHeaderValue(song, value);
            break;
          }
          case 'VIDEOGAP':
            song.videoGap = parseFloat(value.replace(',', '.')) || 0;
            break;
          case 'COVER':
            song.cover = value.trim();
            break;
          case 'BACKGROUND': {
            // #BACKGROUND may hold an image file/URL — or a VIDEO source
            // (direct video URL / platform link). Images keep mapping to
            // `background` (→ song.backgroundImage); video values go to
            // `backgroundVideo`, which convertUltraStarToSong promotes to
            // song.videoBackground — a fallback video source that the game's
            // priority chain uses AFTER the #VIDEO/#SOURCE platform URLs.
            const bgValue = value.trim();
            if (isBackgroundVideoValue(bgValue)) {
              song.backgroundVideo = bgValue;
            } else {
              song.background = bgValue;
            }
            break;
          }
          case 'BPM':
            // BPM can be decimal or comma-separated
            song.bpm = parseFloat(value.replace(',', '.')) || 120;
            break;
          case 'GAP':
            song.gap = parseInt(value) || 0;
            break;
          case 'START':
            song.start = parseInt(value) || 0;
            break;
          case 'END': {
            // parseInt returns 0 for "#END:0" — treat 0 as undefined since
            // a song ending at 0ms makes no sense (song creator mistake).
            const endVal = parseInt(value);
            song.end = endVal > 0 ? endVal : undefined;
            break;
          }
          case 'PREVIEWSTART':
            song.previewStart = parseFloat(value) || 0;
            break;
          case 'PREVIEWDURATION':
            song.previewDuration = parseFloat(value) || 0;
            break;
          case 'GENRE':
            song.genre = value.trim();
            break;
          case 'YEAR':
            song.year = parseInt(value) || undefined;
            break;
          case 'LANGUAGE':
            song.language = normalizeLanguage(value.trim());
            break;
          case 'EDITION':
            song.edition = value.trim();
            break;
          case 'CREATOR':
            song.creator = value.trim();
            break;
          case 'P1':
          case 'P2':
          case 'P3':
          case 'P4':
          case 'P8': {
            // Voice names for multi-voice songs (P4 = 3rd voice, P8 = 4th voice)
            hasDuetHeader = true;
            const idx = headerNameIndex[key.toUpperCase()];
            if (!song.duetPlayerNames) {
              song.duetPlayerNames = [];
            }
            while (song.duetPlayerNames.length < 4) song.duetPlayerNames.push('');
            song.duetPlayerNames[idx] = value.trim();
            break;
          }
          case 'VERSION':
            song.version = value.trim();
            break;
          case 'MEDLEYSTARTBEAT':
            song.medleyStartBeat = parseInt(value) || undefined;
            break;
          case 'MEDLEYENDBEAT':
            song.medleyEndBeat = parseInt(value) || undefined;
            break;
          case 'TAGS':
            song.tags = value.trim();
            break;
        }
      }
      continue;
    }

    // End of file marker
    if (line === 'E') {
      break;
    }

    // Parse line break: - <beat> [duration] [pitch]
    // Line breaks mark the end of a lyric line
    if (line.startsWith('-')) {
      const match = line.match(/^-\s*(-?\d+)/);
      if (match) {
        song.lineBreaks.push(parseInt(match[1]));
      }
      continue;
    }

    // Check for voice switch markers (P1/P2/P4/P8 section switch).
    // Uses the shared tolerant matcher: accepts P1, P1:, P 1, "P1 :" and
    // leading/trailing whitespace (trailing spaces on MARKER lines carry no
    // meaning — unlike note lyrics, where they mark word boundaries).
    const marker = matchPlayerMarkerLine(line);
    if (marker) {
      currentPlayer = marker;
      continue;
    }

    // Parse note lines
    // Format: [P1/P2/P4/P8:] <type> <startBeat> <duration> <pitch> <lyric>
    // Example: : 0 4 12 Hello  OR  P1: : 0 4 12 Hello  OR  P8: R 8 2 10 Yo
    // Types: : = normal, * = golden, F = freestyle, R = rap, G = rap golden

    // First check for a voice prefix in note line (tolerates "P1 :" and
    // leading whitespace; lyric part keeps its trailing spaces intact)
    const duetPrefix = matchDuetNotePrefix(line);
    let noteLine = line;
    let notePlayer: DuetPlayerTag | undefined = currentPlayer;

    if (duetPrefix) {
      notePlayer = duetPrefix.player;
      noteLine = duetPrefix.rest;
    }

    // Note lines tolerate leading whitespace (the shared matcher handles
    // it). The matcher keeps the whitespace run between pitch and lyric
    // intact — variant-2 word boundaries (leading space) are resolved by
    // normalizeUltraStarWordBoundaries() after the parse loop.
    const noteMatch = matchUltraStarNoteLine(noteLine);
    if (noteMatch) {
      song.notes.push({
        type: noteMatch.type,
        startBeat: noteMatch.startBeat,
        duration: noteMatch.duration,
        pitch: noteMatch.pitch,
        // Raw lyric incl. leading whitespace — normalized below
        lyric: noteMatch.lyric,
        player: notePlayer,
      });
      continue;
    }
  }

  // Resolve word-boundary conventions (variant-2 leading spaces →
  // variant-1 trailing spaces) BEFORE any lyric-line conversion. Line
  // breaks are passed so boundaries at a line start get dropped.
  normalizeUltraStarWordBoundaries(song.notes, new Set(song.lineBreaks));
  
  // Mark as multi-voice when body markers OR header tags declare it.
  // Body markers additionally require TWO different voices to have notes — a
  // stray single P1 marker must not turn a solo song into a duet.
  if (hasDuetHeader || notesHaveBothPlayers(song.notes)) {
    song.isDuet = true;
  }

  return song;
}

// Convert UltraStar format to our Song format
export function convertUltraStarToSong(
  ultraStar: UltraStarSong, 
  audioUrl: string,
  videoUrl?: string,
  coverUrl?: string
): Song {
  // Convert beats to milliseconds using the CORRECT UltraStar formula
  // UltraStar BPM is actually "Beats per 4 measures" - so we need to divide by 4
  // Formula: beatDuration = 60 seconds / BPM / 4 * 1000 = 15000 / BPM
  // This matches the official UltraStar formula: time = beat / BPM / 4 * 60 + GAP

  // Use the shared converter to build lyric lines (handles duet P1/P2 separation)
  const lyricLines = convertNotesToLyricLines(
    ultraStar.notes,
    new Set(ultraStar.lineBreaks),
    ultraStar.bpm,
    ultraStar.gap,
  );

  // Calculate total duration:
  // - When #END: is defined → use that value (time-based ending in game loop)
  // - When #END: is NOT defined → use last lyric line end time + buffer.
  //   The game loop only checks song.end for time-based termination;
  //   when song.end is undefined, the audio/video element's "ended" event
  //   handles natural termination. So song.duration can be a realistic value.
  let totalDuration: number;
  if (ultraStar.end) {
    totalDuration = ultraStar.end;
  } else if (lyricLines.length > 0) {
    // Use last lyric line end time + 5s buffer for a realistic display duration
    const lastLineEnd = lyricLines.reduce((max, l) => Math.max(max, l.endTime), 0);
    totalDuration = lastLineEnd + 5000;
  } else {
    totalDuration = 180000; // Default 3 minutes
  }

  // Determine difficulty based on note density
  const totalNotes = ultraStar.notes.length;
  const effectiveDurationForStats = ultraStar.end || totalDuration;
  const songDurationMinutes = effectiveDurationForStats / 60000;
  const notesPerMinute = songDurationMinutes > 0 ? totalNotes / songDurationMinutes : 0;
  
  let difficulty: Difficulty = 'medium';
  if (notesPerMinute > 40) difficulty = 'hard';
  else if (notesPerMinute < 20) difficulty = 'easy';

  // Calculate rating based on note density
  const rating = Math.min(5, Math.max(1, Math.ceil(notesPerMinute / 10)));

  // Determine if video is a streaming-platform URL, direct video URL, or local file
  let videoBackground: string | undefined;
  let youtubeUrl: string | undefined;
  let dailymotionUrl: string | undefined;
  let vimeoUrl: string | undefined;
  let rutubeUrl: string | undefined;
  let vkVideoUrl: string | undefined;
  let bilibiliUrl: string | undefined;
  let nicovideoUrl: string | undefined;

  if (ultraStar.youtubeUrl) {
    // YouTube URL was detected during parsing
    youtubeUrl = ultraStar.youtubeUrl;
  } else if (ultraStar.dailymotionUrl) {
    dailymotionUrl = ultraStar.dailymotionUrl;
  } else if (ultraStar.vimeoUrl) {
    vimeoUrl = ultraStar.vimeoUrl;
  } else if (ultraStar.rutubeUrl) {
    rutubeUrl = ultraStar.rutubeUrl;
  } else if (ultraStar.vkVideoUrl) {
    vkVideoUrl = ultraStar.vkVideoUrl;
  } else if (ultraStar.bilibiliUrl) {
    bilibiliUrl = ultraStar.bilibiliUrl;
  } else if (ultraStar.nicovideoUrl) {
    nicovideoUrl = ultraStar.nicovideoUrl;
  } else if (ultraStar.video) {
    if (isDirectVideoUrl(ultraStar.video)) {
      // Direct video URL (MP4, WebM, OGG, etc.) — play via HTML5 <video> element
      videoBackground = ultraStar.video;
    } else if (isDailymotionUrl(ultraStar.video)) {
      dailymotionUrl = ultraStar.video;
    } else if (isVimeoUrl(ultraStar.video)) {
      vimeoUrl = ultraStar.video;
    } else if (isRutubeUrl(ultraStar.video)) {
      rutubeUrl = ultraStar.video;
    } else if (isVkVideoUrl(ultraStar.video)) {
      vkVideoUrl = ultraStar.video;
    } else if (isBilibiliUrl(ultraStar.video)) {
      bilibiliUrl = ultraStar.video;
    } else if (isNiconicoUrl(ultraStar.video)) {
      nicovideoUrl = ultraStar.video;
    } else if (isYouTubeUrl(ultraStar.video)) {
      youtubeUrl = ultraStar.video;
    } else if (ultraStar.video.startsWith('http://') || ultraStar.video.startsWith('https://')) {
      // Unknown HTTP(S) video source — hand it to the HTML5 <video> element as a fallback
      videoBackground = ultraStar.video;
    } else {
      // Local file path
      videoBackground = videoUrl || ultraStar.video;
    }
  }

  // #BACKGROUND video URL (direct or platform link) — fallback video source
  // AFTER every #VIDEO/#SOURCE-derived source (platform URLs + direct/local
  // video files). useYouTubeGame's priority chain picks platform URLs from the
  // dedicated fields FIRST, then from videoBackground — exactly this order.
  if (!videoBackground && !youtubeUrl && !dailymotionUrl && !vimeoUrl && !rutubeUrl && !vkVideoUrl && !bilibiliUrl && !nicovideoUrl && ultraStar.backgroundVideo) {
    videoBackground = ultraStar.backgroundVideo;
  }

  return {
    id: `imported-${crypto.randomUUID()}`,
    title: ultraStar.title,
    artist: ultraStar.artist,
    album: ultraStar.edition,
    year: ultraStar.year,
    genre: ultraStar.genre,
    language: ultraStar.language,
    duration: totalDuration,
    bpm: ultraStar.bpm,
    difficulty,
    rating,
    gap: ultraStar.gap,
    start: ultraStar.start,
    end: ultraStar.end,
    coverImage: coverUrl || ultraStar.cover,
    backgroundImage: ultraStar.background,
    videoBackground,
    youtubeUrl,
    dailymotionUrl,
    vimeoUrl,
    rutubeUrl,
    vkVideoUrl,
    bilibiliUrl,
    nicovideoUrl,
    videoGap: ultraStar.videoGap,
    audioUrl,
    // If we have video (any streaming platform or direct URL) but no separate audio, video provides audio
    hasEmbeddedAudio: !audioUrl && (!!youtubeUrl || !!dailymotionUrl || !!vimeoUrl || !!rutubeUrl || !!vkVideoUrl || !!bilibiliUrl || !!nicovideoUrl || !!videoBackground),
    lyrics: lyricLines,
    preview: ultraStar.previewStart ? {
      startTime: ultraStar.previewStart * 1000,
      duration: (ultraStar.previewDuration || 30) * 1000,
    } : undefined,
    // Duet mode properties
    isDuet: ultraStar.isDuet,
    duetPlayerNames: ultraStar.duetPlayerNames,
    // UltraStar TXT Metadata
    version: ultraStar.version,
    creator: ultraStar.creator,
    mp3File: ultraStar.mp3,
    coverFile: ultraStar.cover,
    backgroundFile: ultraStar.background,
    videoFile: ultraStar.video && !ultraStar.youtubeUrl && !ultraStar.dailymotionUrl && !ultraStar.vimeoUrl && !ultraStar.rutubeUrl && !ultraStar.vkVideoUrl && !ultraStar.bilibiliUrl && !ultraStar.nicovideoUrl && !(ultraStar.video.startsWith('http://') || ultraStar.video.startsWith('https://')) ? ultraStar.video : undefined,
    previewStart: ultraStar.previewStart,
    previewDuration: ultraStar.previewDuration,
    medleyStartBeat: ultraStar.medleyStartBeat,
    medleyEndBeat: ultraStar.medleyEndBeat,
    tags: ultraStar.tags,
  };
}

// Generate UltraStar txt content from Song (for export)
export function generateUltraStarTxt(song: Song): string {
  const lines: string[] = [];

  // Header - Basic Info
  // VERSION (optional)
  if (song.version) {
    lines.push(`#VERSION:${song.version}`);
  }

  lines.push(`#TITLE:${song.title}`);
  lines.push(`#ARTIST:${song.artist}`);

  // MP3 file (use stored value or default)
  lines.push(`#MP3:${song.mp3File || 'song.mp3'}`);

  // Cover image file
  if (song.coverFile) {
    lines.push(`#COVER:${song.coverFile}`);
  }

  // Background image file
  if (song.backgroundFile) {
    lines.push(`#BACKGROUND:${song.backgroundFile}`);
  }

  // ── Video-Quelle — Semantik (User-Spezifikation) ──
  // 1. ECHTE VIDEODATEIEN (Dateinamen) → #VIDEO:
  // 2. VIDEO-URLs (Plattform-Links + direkte Video-Datei-URLs) → #SOURCE:
  // Beim PARSEN werden #VIDEO: und #SOURCE: identisch behandelt
  // (#VIDEO: akzeptiert URLs ebenfalls); der Export schreibt sie sauber
  // getrennt nach Werttyp. blob:-/file:-URLs sind Session-Artefakte und
  // werden NIE exportiert — für lokale Videos ohne #VIDEO-Tag wird der
  // echte Dateiname aus relativeVideoPath abgeleitet.
  const isHttpVideoUrl = (v?: string) => !!v && /^https?:\/\//i.test(v);
  const relativeVideoBasename = song.relativeVideoPath
    ? (song.relativeVideoPath.split(/[\\/]/).pop() || '')
    : '';

  if (song.youtubeUrl) {
    lines.push(`#SOURCE:${song.youtubeUrl}`);
  } else if (song.dailymotionUrl) {
    lines.push(`#SOURCE:${song.dailymotionUrl}`);
  } else if (song.vimeoUrl) {
    lines.push(`#SOURCE:${song.vimeoUrl}`);
  } else if (song.rutubeUrl) {
    lines.push(`#SOURCE:${song.rutubeUrl}`);
  } else if (song.vkVideoUrl) {
    lines.push(`#SOURCE:${song.vkVideoUrl}`);
  } else if (song.bilibiliUrl) {
    lines.push(`#SOURCE:${song.bilibiliUrl}`);
  } else if (song.nicovideoUrl) {
    lines.push(`#SOURCE:${song.nicovideoUrl}`);
  } else if (isHttpVideoUrl(song.videoBackground)) {
    // Direct video URL (fallback video source; blob: URLs are filtered out
    // by the isHttpVideoUrl check and never exported)
    lines.push(`#SOURCE:${song.videoBackground}`);
  } else if (isHttpVideoUrl(song.videoFile)) {
    // Legacy storage: a URL parked in videoFile — still a URL → #SOURCE:
    lines.push(`#SOURCE:${song.videoFile}`);
  } else if (song.videoFile) {
    // Real video FILE → #VIDEO:
    lines.push(`#VIDEO:${song.videoFile}`);
  } else if (relativeVideoBasename) {
    // Local video without a #VIDEO tag — derive the REAL file name from the
    // relative media path (never the playback blob URL)
    lines.push(`#VIDEO:${relativeVideoBasename}`);
  }

  // Video Gap
  if (song.videoGap !== undefined && song.videoGap !== 0) {
    lines.push(`#VIDEOGAP:${song.videoGap}`);
  }

  // BPM and GAP (required)
  lines.push(`#BPM:${song.bpm.toFixed(2)}`);
  lines.push(`#GAP:${song.gap}`);

  // Start offset
  if (song.start && song.start > 0) {
    lines.push(`#START:${song.start}`);
  }

  // End time
  if (song.end && song.end > 0) {
    lines.push(`#END:${song.end}`);
  }

  // Preview settings
  if (song.previewStart !== undefined && song.previewStart > 0) {
    lines.push(`#PREVIEWSTART:${song.previewStart}`);
  } else if (song.preview) {
    lines.push(`#PREVIEWSTART:${Math.round(song.preview.startTime / 1000)}`);
  }

  if (song.previewDuration !== undefined && song.previewDuration > 0) {
    lines.push(`#PREVIEWDURATION:${song.previewDuration}`);
  } else if (song.preview?.duration) {
    lines.push(`#PREVIEWDURATION:${Math.round(song.preview.duration / 1000)}`);
  }

  // Medley settings
  if (song.medleyStartBeat !== undefined) {
    lines.push(`#MEDLEYSTARTBEAT:${song.medleyStartBeat}`);
  }
  if (song.medleyEndBeat !== undefined) {
    lines.push(`#MEDLEYENDBEAT:${song.medleyEndBeat}`);
  }

  // Genre
  if (song.genre) {
    lines.push(`#GENRE:${song.genre}`);
  }

  // Language
  if (song.language) {
    lines.push(`#LANGUAGE:${song.language}`);
  }

  // Year
  if (song.year) {
    lines.push(`#YEAR:${song.year}`);
  }

  // Edition / Album
  if (song.album) {
    lines.push(`#EDITION:${song.album}`);
  }

  // Creator
  if (song.creator) {
    lines.push(`#CREATOR:${song.creator}`);
  }

  // Tags
  if (song.tags) {
    lines.push(`#TAGS:${song.tags}`);
  }

  // Multi-voice player names.
  // Export when the song is flagged as multi-voice OR when any note still
  // carries a P1/P2/P4/P8 assignment — the flag alone must never silently
  // strip player data (the original duet-recognition bug caused exactly that
  // data loss).
  const VOICE_TAGS: Array<'P1' | 'P2' | 'P4' | 'P8'> = ['P1', 'P2', 'P4', 'P8'];
  const voicesPresent = new Set<string>();
  for (const line of song.lyrics) {
    for (const note of line.notes) {
      if (note.player && note.player !== 'both') voicesPresent.add(note.player);
    }
  }
  const duetExport = song.isDuet || voicesPresent.size > 0;
  if (duetExport) {
    // Voice-name headers — written for every voice present in the song.
    // Classic duets get exactly #P1/#P2 as before; trio/quartet songs add
    // #P4 (3rd voice) / #P8 (4th voice) so the file round-trips.
    const names = song.duetPlayerNames ?? [];
    VOICE_TAGS.forEach((tag, idx) => {
      if (!voicesPresent.has(tag)) return;
      const name = names[idx]?.trim() || `Player ${idx + 1}`;
      lines.push(`#${tag}:${name}`);
    });
  }

  // Convert notes to UltraStar format using the correct formula
  // beatDuration = 15000 / BPM (inverse of 60000 / (BPM * 4))
  const beatDuration = 15000 / song.bpm;
  const MIDI_BASE_OFFSET = 48;
  
  // Track current voice for P1/P2/P4/P8 section markers
  let currentPlayer: 'P1' | 'P2' | 'P4' | 'P8' | undefined = undefined;
  
  for (const line of song.lyrics) {
    for (const note of line.notes) {
      const startBeat = Math.round((note.startTime - song.gap) / beatDuration);
      const duration = Math.round(note.duration / beatDuration);
      const relativePitch = note.pitch - MIDI_BASE_OFFSET;
      // Note type: : normal, * golden, F freestyle, R rap, G rap golden.
      // (Legacy isBonus data is exported as F — it always was an 'F' note.)
      const type = note.isRap
        ? (note.isGolden ? 'G' : 'R')
        : note.isGolden ? '*' : (note.isFreestyle || note.isBonus) ? 'F' : ':';
      
      // Add a voice marker (P1/P2/P4/P8) when the voice changes.
      // 'both' means every player sings this note — plain UltraStar has no
      // marker for that, so the note is written into the current section.
      const noteLine = `${type} ${startBeat} ${duration} ${relativePitch} ${note.lyric}`;
      if (duetExport && note.player) {
        if (currentPlayer !== note.player && note.player !== 'both') {
          lines.push(note.player);
          currentPlayer = note.player;
        }
      }
      
      lines.push(noteLine);
    }
    // Line break indicator at the end of each lyric line
    if (line.notes.length > 0) {
      const lastNote = line.notes[line.notes.length - 1];
      const lineBreakBeat = Math.round((lastNote.startTime + lastNote.duration - song.gap) / beatDuration);
      lines.push(`- ${lineBreakBeat}`);
    }
  }
  
  lines.push('E'); // End marker
  
  return lines.join('\n');
}
