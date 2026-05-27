// UltraStar Metadata Parser - Parse UltraStar .txt files for metadata and full lyrics

import { LyricLine } from '@/types/game';
import { convertNotesToLyricLines } from '@/lib/parsers/notes-to-lyric-lines';
import { normalizeTxtContent } from '@/lib/utils';

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
  let hasDuetNotes = false;
  const notes: Array<{ type: string; startBeat: number; duration: number; pitch: number; lyric: string; player?: 'P1' | 'P2' }> = [];
  const lineBreakBeats = new Set<number>();

  let currentPlayer: 'P1' | 'P2' | undefined = undefined;

  for (const line of lines) {
    // Use trimmed version for header parsing (header values should be trimmed)
    const trimmedLine = line.trim();

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
    } else if (trimmedLine.startsWith('#')) {
      continue;
    } else if (trimmedLine === 'E') {
      break;
    } else if (trimmedLine === 'P1' || trimmedLine === 'P1:' || trimmedLine === 'P 1') {
      currentPlayer = 'P1';
      hasDuetNotes = true;
    } else if (trimmedLine === 'P2' || trimmedLine === 'P2:' || trimmedLine === 'P 2') {
      currentPlayer = 'P2';
      hasDuetNotes = true;
    } else if (trimmedLine.startsWith('-')) {
      // Line break
      const match = trimmedLine.match(/^-\s*(-?\d+)/);
      if (match) {
        lineBreakBeats.add(parseInt(match[1]));
      }
    } else {
      // Check for P1/P2 prefix in note line
      const duetPrefixMatch = line.match(/^(P1|P2):\s*(.*)$/);
      let noteLine = line;
      let notePlayer = currentPlayer;

      if (duetPrefixMatch) {
        notePlayer = duetPrefixMatch[1] as 'P1' | 'P2';
        noteLine = duetPrefixMatch[2];
        hasDuetNotes = true;
      }

      // Parse note - use TRIMMED line for matching to handle leading spaces
      // but preserve the original lyric with trailing spaces for syllable detection
      const trimmedNoteLine = noteLine.trim();
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

  return { lyrics: lyricLines, bpm, gap, previewStart, previewDuration, isDuet: hasDuetNotes };
}
