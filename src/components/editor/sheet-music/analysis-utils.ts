/**
 * Pure helpers of the sheet music dialog: per-page analysis merging,
 * mime-type guessing and beats→m:ss formatting.
 *
 * R13: moved byte-identically from src/components/editor/sheet-music-dialog.tsx
 * (only the `export` keyword was added to the three functions).
 */
import type { SheetMusicAnalysis, SheetMusicVoice } from './types';
import { MERGED_NOTE_CAP } from './types';

/**
 * Merge per-page analyses ("all pages" mode): voices are matched by staff
 * INDEX — staff order is stable across pages of the same score. Notes stay
 * in reading order (page 1 first). Tempo from the first page, confidence
 * weighted by note count, warnings deduplicated.
 */
export function mergePageAnalyses(pages: SheetMusicAnalysis[]): SheetMusicAnalysis | null {
  const voices: SheetMusicVoice[] = [];
  let tempo = 120;
  let tempoFound = false;
  let confWeight = 0;
  let confSum = 0;
  const warnings: string[] = [];
  let truncated = false;

  for (const page of pages) {
    if (!tempoFound && page.tempo > 0) {
      tempo = page.tempo;
      tempoFound = true;
    }
    const pageNotes = page.voices.reduce((sum, v) => sum + v.noteCount, 0);
    confWeight += pageNotes;
    confSum += page.confidence * pageNotes;
    if (page.warnings && !warnings.includes(page.warnings)) warnings.push(page.warnings);
    truncated = truncated || page.truncated;

    page.voices.forEach((voice, idx) => {
      let target = voices[idx];
      if (!target) {
        target = { id: idx + 1, label: voice.label, noteCount: 0, notes: [] };
        voices[idx] = target;
      }
      for (const note of voice.notes) {
        if (target.notes.length >= MERGED_NOTE_CAP) {
          truncated = true;
          break;
        }
        target.notes.push({ midi: note.midi, beats: note.beats });
      }
      target.noteCount = target.notes.length;
    });
  }

  // Drop voices that ended up empty (a page returned fewer staves than another)
  const filled = voices.filter(v => v && v.noteCount > 0).map((v, i) => ({ ...v, id: i + 1 }));
  if (filled.length === 0) return null;

  const mergedWarnings = warnings.join(' · ').slice(0, 500);
  return {
    voices: filled,
    tempo,
    confidence: confWeight > 0 ? confSum / confWeight : 0.5,
    warnings: mergedWarnings,
    truncated,
  };
}

/** Mime type from a file name/extension (browser file.type can be empty). */
export function guessMimeType(name: string, fallback?: string): string | null {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'bmp') return 'image/bmp';
  return fallback && fallback.startsWith('image/') ? fallback : null;
}

/** m:ss display for a beats total at a given tempo. */
export function formatBeatsDuration(totalBeats: number, bpm: number): string {
  const ms = (totalBeats * 60000) / Math.max(1, bpm);
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
