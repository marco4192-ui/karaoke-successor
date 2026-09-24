// UltraStar Metadata Parser - Parse UltraStar .txt files for metadata and full lyrics

import { LyricLine } from '@/types/game';
import { convertNotesToLyricLines } from '@/lib/parsers/notes-to-lyric-lines';
import { matchPlayerMarkerLine, matchDuetNotePrefix, notesHaveBothPlayers } from '@/lib/parsers/duet-markers';
import { matchUltraStarNoteLine, normalizeUltraStarWordBoundaries } from '@/lib/parsers/word-boundary';
import { normalizeTxtContent } from '@/lib/utils';
import { normalizeVideoUrlInput, detectVideoPlatform } from '@/lib/url-utils';

// Parse UltraStar txt file for metadata (headers only)
export function parseUltraStarMetadata(content: string): {
  title: string;
  artist: string;
  bpm: number;
  gap: number;
  previewStart?: number;
  previewDuration?: number;
  genre?: string;
  language?: string;
  year?: number;
} {
  // Normalize line endings and Unicode (matches parseUltraStarFull)
  const normalized = normalizeTxtContent(content);
  const lines = normalized.split('\n');
  let title = 'Unknown';
  let artist = 'Unknown';
  let bpm = 120;
  let gap = 0;
  let previewStart: number | undefined;
  let previewDuration: number | undefined;
  let genre: string | undefined;
  let language: string | undefined;
  let year: number | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#TITLE:')) {
      title = trimmed.substring(7).trim();
    } else if (trimmed.startsWith('#ARTIST:')) {
      artist = trimmed.substring(8).trim();
    } else if (trimmed.startsWith('#BPM:')) {
      bpm = parseFloat(trimmed.substring(5).replace(',', '.')) || 120;
    } else if (trimmed.startsWith('#GAP:')) {
      gap = parseInt(trimmed.substring(5)) || 0;
    } else if (trimmed.startsWith('#PREVIEWSTART:')) {
      const parsedPreviewStart = parseFloat(trimmed.substring(13));
      previewStart = isNaN(parsedPreviewStart) ? undefined : parsedPreviewStart;
    } else if (trimmed.startsWith('#PREVIEWDURATION:')) {
      const parsedPreviewDuration = parseFloat(trimmed.substring(16));
      previewDuration = isNaN(parsedPreviewDuration) ? undefined : parsedPreviewDuration;
    } else if (trimmed.startsWith('#GENRE:')) {
      genre = trimmed.substring(7).trim();
    } else if (trimmed.startsWith('#LANGUAGE:')) {
      language = trimmed.substring(10).trim();
    } else if (trimmed.startsWith('#YEAR:')) {
      year = parseInt(trimmed.substring(6)) || undefined;
    }
  }

  return { title, artist, bpm, gap, previewStart, previewDuration, genre, language, year };
}

// Full parse of UltraStar txt file
// IMPORTANT: Don't trim lines or lyrics - trailing spaces are significant for word boundaries
// - Trailing space in lyric = end of word (space is displayed)
// - No trailing space = syllable connected to next note
export async function parseUltraStarFull(txtFile?: File): Promise<{
  lyrics: LyricLine[];
  bpm: number;
  gap: number;
  previewStart?: number;
  previewDuration?: number;
  isDuet?: boolean;
  duetPlayerNames?: string[];
  youtubeUrl?: string;
  dailymotionUrl?: string;
  vimeoUrl?: string;
  rutubeUrl?: string;
  vkVideoUrl?: string;
  bilibiliUrl?: string;
  nicovideoUrl?: string;
  videoGap?: number;
}> {
  if (!txtFile) {
    return { lyrics: [], bpm: 120, gap: 0, isDuet: false };
  }

  const content = await txtFile.text();
  const cleanContent = normalizeTxtContent(content);
  // DON'T trim lines! Trailing spaces in lyrics are significant for word boundaries.
  // Only filter out completely empty lines (after trimming for the check)
  const lines = cleanContent.split('\n').filter(l => l.trim().length > 0);

  let bpm = 120;
  let gap = 0;
  let previewStart: number | undefined;
  let previewDuration: number | undefined;
  let hasDuetHeader = false;
  // Voice names, index 0-3 → P1/P2/P4/P8 (P4 = 3rd voice, P8 = 4th voice).
  // #P3 is accepted as a positional alias for the 3rd voice.
  const voiceNames: string[] = [];
  const headerNameIndex: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 2, P8: 3 };
  let youtubeUrl: string | undefined;
  let dailymotionUrl: string | undefined;
  let vimeoUrl: string | undefined;
  let rutubeUrl: string | undefined;
  let vkVideoUrl: string | undefined;
  let bilibiliUrl: string | undefined;
  let nicovideoUrl: string | undefined;
  let videoGap: number | undefined;
  const notes: Array<{ type: string; startBeat: number; duration: number; pitch: number; lyric: string; player?: 'P1' | 'P2' | 'P4' | 'P8' }> = [];
  const lineBreakBeats = new Set<number>();

  let currentPlayer: 'P1' | 'P2' | 'P4' | 'P8' | undefined = undefined;

  for (const line of lines) {
    // Use trimmed version for header parsing (header values should be trimmed)
    const trimmedLine = line.trim();
    // Standalone P1/P2 section marker (shared tolerant matcher)
    const markerTag = matchPlayerMarkerLine(line);

    if (trimmedLine.startsWith('#BPM:')) {
      bpm = parseFloat(trimmedLine.substring(5).replace(',', '.')) || 120;
    } else if (trimmedLine.startsWith('#GAP:')) {
      gap = parseInt(trimmedLine.substring(5)) || 0;
    } else if (trimmedLine.startsWith('#PREVIEWSTART:')) {
      const val = parseFloat(trimmedLine.substring(13));
      previewStart = isNaN(val) ? undefined : val;
    } else if (trimmedLine.startsWith('#PREVIEWDURATION:')) {
      const val = parseFloat(trimmedLine.substring(16));
      previewDuration = isNaN(val) ? undefined : val;
    } else if (/^#P[1248]:/.test(trimmedLine)) {
      hasDuetHeader = true;
      const tag = trimmedLine.substring(1, trimmedLine.indexOf(':'));
      const idx = headerNameIndex[tag] ?? 0;
      voiceNames[idx] = trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim() || `Player ${idx + 1}`;
    } else if (trimmedLine.startsWith('#VIDEO:') || trimmedLine.startsWith('#SOURCE:')) {
      // Classify streaming-platform URLs (YouTube / Dailymotion / Vimeo / Rutube / VK / Bilibili / Niconico).
      // #VIDEO: and #SOURCE: are parsed EXACTLY the same — #SOURCE: is the
      // writer convention for video URLs, #VIDEO: for real video FILES, but
      // parsing accepts both keys for either value type (backward compat).
      // The value may be a plain URL, a DIRECT video-file URL or even a full
      // iframe embed code (VK „Einbetten“) — normalizeVideoUrlInput reduces
      // embed snippets to their src URL and unescapes &amp; entities first.
      const videoValue = normalizeVideoUrlInput(trimmedLine.substring(trimmedLine.startsWith('#VIDEO:') ? 7 : 8));
      if (videoValue.startsWith('http://') || videoValue.startsWith('https://')) {
        const platform = detectVideoPlatform(videoValue);
        if (platform === 'youtube') youtubeUrl = videoValue;
        else if (platform === 'dailymotion') dailymotionUrl = videoValue;
        else if (platform === 'vimeo') vimeoUrl = videoValue;
        else if (platform === 'rutube') rutubeUrl = videoValue;
        else if (platform === 'vk') vkVideoUrl = videoValue;
        else if (platform === 'bilibili') bilibiliUrl = videoValue;
        else if (platform === 'nicovideo') nicovideoUrl = videoValue;
        // Non-platform URLs are resolved via the scanned video FILE instead
      }
    } else if (trimmedLine.startsWith('#VIDEOGAP:')) {
      const val = parseFloat(trimmedLine.substring(10).replace(',', '.'));
      if (!isNaN(val)) videoGap = val;
    } else if (trimmedLine.startsWith('#')) {
      continue;
    } else if (trimmedLine === 'E') {
      break;
    } else if (markerTag) {
      currentPlayer = markerTag;
    } else if (trimmedLine.startsWith('-')) {
      // Line break
      const match = trimmedLine.match(/^-\s*(-?\d+)/);
      if (match) {
        lineBreakBeats.add(parseInt(match[1]));
      }
    } else {
      // Check for P1/P2 prefix in note line (shared tolerant matcher)
      const duetPrefix = matchDuetNotePrefix(line);
      let noteLine = line;
      let notePlayer = currentPlayer;

      if (duetPrefix) {
        notePlayer = duetPrefix.player;
        noteLine = duetPrefix.rest;
      }

      // Shared note-line matcher — keeps the whitespace run between pitch
      // and lyric intact; variant-2 word boundaries (leading space before a
      // new word) are resolved by normalizeUltraStarWordBoundaries() below.
      const noteMatch = matchUltraStarNoteLine(noteLine);
      if (noteMatch) {
        notes.push({
          type: noteMatch.type,
          startBeat: noteMatch.startBeat,
          duration: noteMatch.duration,
          pitch: noteMatch.pitch,
          // Raw lyric incl. leading whitespace — normalized below
          lyric: noteMatch.lyric,
          player: notePlayer,
        });
      }
    }
  }

  // Resolve word-boundary conventions (variant-2 leading spaces → variant-1
  // trailing spaces) before lyric-line conversion.
  normalizeUltraStarWordBoundaries(notes, lineBreakBeats);

  // Convert beats to milliseconds using CORRECT UltraStar formula
  // Use the shared converter to build lyric lines (handles duet P1/P2 separation)
  const lyricLines = convertNotesToLyricLines(notes, lineBreakBeats, bpm, gap);

  // Multi-voice detection: header tags (#P1/#P2/#P4/#P8) OR body markers with
  // notes for at least TWO voices (a stray P1 marker alone is not a duet).
  const isDuet = hasDuetHeader || notesHaveBothPlayers(notes);
  const duetPlayerNames: string[] | undefined = isDuet
    ? [0, 1, 2, 3].map(i => voiceNames[i] || `Player ${i + 1}`)
    : undefined;

  return { lyrics: lyricLines, bpm, gap, previewStart, previewDuration, isDuet, duetPlayerNames, youtubeUrl, dailymotionUrl, vimeoUrl, rutubeUrl, vkVideoUrl, bilibiliUrl, nicovideoUrl, videoGap };
}
