// UltraStar Metadata Parser - Parse UltraStar .txt files for metadata and full lyrics

import { LyricLine } from '@/types/game';
import { convertNotesToLyricLines } from '@/lib/parsers/notes-to-lyric-lines';
import { matchPlayerMarkerLine, matchDuetNotePrefix, notesHaveBothPlayers } from '@/lib/parsers/duet-markers';
import { normalizeTxtContent } from '@/lib/utils';
import { isYouTubeUrl, isDailymotionUrl, isVimeoUrl, isRutubeUrl, isVkVideoUrl, isBilibiliUrl, isNiconicoUrl } from '@/lib/url-utils';

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
  duetPlayerNames?: [string, string];
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
  let p1Name: string | undefined;
  let p2Name: string | undefined;
  let youtubeUrl: string | undefined;
  let dailymotionUrl: string | undefined;
  let vimeoUrl: string | undefined;
  let rutubeUrl: string | undefined;
  let vkVideoUrl: string | undefined;
  let bilibiliUrl: string | undefined;
  let nicovideoUrl: string | undefined;
  let videoGap: number | undefined;
  const notes: Array<{ type: string; startBeat: number; duration: number; pitch: number; lyric: string; player?: 'P1' | 'P2' }> = [];
  const lineBreakBeats = new Set<number>();

  let currentPlayer: 'P1' | 'P2' | undefined = undefined;

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
    } else if (trimmedLine.startsWith('#P1:')) {
      hasDuetHeader = true;
      p1Name = trimmedLine.substring(4).trim() || 'Player 1';
    } else if (trimmedLine.startsWith('#P2:')) {
      hasDuetHeader = true;
      p2Name = trimmedLine.substring(4).trim() || 'Player 2';
    } else if (trimmedLine.startsWith('#VIDEO:')) {
      // Classify streaming-platform URLs (YouTube / Dailymotion / Vimeo / Rutube / VK / Bilibili / Niconico)
      const videoValue = trimmedLine.substring(7).trim();
      if (videoValue.startsWith('http://') || videoValue.startsWith('https://')) {
        if (isYouTubeUrl(videoValue)) youtubeUrl = videoValue;
        else if (isDailymotionUrl(videoValue)) dailymotionUrl = videoValue;
        else if (isVimeoUrl(videoValue)) vimeoUrl = videoValue;
        else if (isRutubeUrl(videoValue)) rutubeUrl = videoValue;
        else if (isVkVideoUrl(videoValue)) vkVideoUrl = videoValue;
        else if (isBilibiliUrl(videoValue)) bilibiliUrl = videoValue;
        else if (isNiconicoUrl(videoValue)) nicovideoUrl = videoValue;
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

      // IMPORTANT: Use trimStart() — NOT trim() — to handle leading spaces
      // while preserving trailing spaces for syllable detection.
      // A trailing space in the lyric (e.g., "the ") means this is a complete word.
      // No trailing space (e.g., "whis") means it's a syllable continuation.
      // Do NOT change this to trim() — that would break syllable parsing.
      const trimmedNoteLine = noteLine.trimStart();
      const noteMatch = trimmedNoteLine.match(/^([:*FGR])\s*(-?\d+)\s+(\d+)\s+(-?\d+)\s*(.*)$/);
      if (noteMatch) {
        const [, type, startStr, durationStr, pitchStr, lyric] = noteMatch;
        notes.push({
          type,
          startBeat: parseInt(startStr),
          duration: parseInt(durationStr),
          pitch: parseInt(pitchStr),
          // DON'T trim - preserve trailing spaces for syllable detection
          // A trailing space means this is a complete word, no space means it's a syllable
          lyric: lyric,
          player: notePlayer,
        });
      }
    }
  }

  // Convert beats to milliseconds using CORRECT UltraStar formula
  // Use the shared converter to build lyric lines (handles duet P1/P2 separation)
  const lyricLines = convertNotesToLyricLines(notes, lineBreakBeats, bpm, gap);

  // Duet detection: header tags (#P1/#P2) OR body markers with notes for
  // BOTH players (a stray P1 marker alone is not a duet).
  const isDuet = hasDuetHeader || notesHaveBothPlayers(notes);
  const duetPlayerNames: [string, string] | undefined = isDuet
    ? [p1Name || 'Player 1', p2Name || 'Player 2']
    : undefined;

  return { lyrics: lyricLines, bpm, gap, previewStart, previewDuration, isDuet, duetPlayerNames, youtubeUrl, dailymotionUrl, vimeoUrl, rutubeUrl, vkVideoUrl, bilibiliUrl, nicovideoUrl, videoGap };
}
