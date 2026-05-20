/**
 * Sub-hook: compute note/highway data from a song source.
 */
'use client';

import { useMemo } from 'react';
import { Song, Note, LyricLine } from '@/types/game';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { calculatePitchStats, PitchStats, NOTE_WINDOW, getVisibleNotes } from '@/lib/game/note-utils';

interface NoteData {
  allNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  sortedLines: LyricLine[];
  pitchStats: PitchStats;
  scoringMeta: ReturnType<typeof calculateScoringMetadata> | null;
}

interface UsePtmNoteDataOptions {
  notesSource: Song | null;
  currentTime: number;
}

export function usePtmNoteData({ notesSource, currentTime }: UsePtmNoteDataOptions): NoteData & {
  visibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
} {
  const { allNotes, sortedLines, pitchStats, scoringMeta } = useMemo(() => {
    if (!notesSource?.lyrics?.length) {
      return {
        allNotes: [],
        sortedLines: [],
        pitchStats: { minPitch: 40, maxPitch: 80, pitchRange: 40 } as PitchStats,
        scoringMeta: null,
      };
    }

    const notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    const lines = [...notesSource.lyrics].sort((a, b) => a.startTime - b.startTime);

    lines.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        notes.push({ ...note, lineIndex, line });
      });
    });
    notes.sort((a, b) => a.startTime - b.startTime);

    const bd = notesSource.bpm ? 15000 / notesSource.bpm : 500;
    const ps = calculatePitchStats(notes);
    const meta = calculateScoringMetadata(notes, bd);

    return { allNotes: notes, sortedLines: lines, pitchStats: ps, scoringMeta: meta };
  }, [notesSource]);

  const visibleNotes = useMemo(
    () => getVisibleNotes(allNotes, currentTime, NOTE_WINDOW),
    [currentTime, allNotes],
  );

  return { allNotes, sortedLines, pitchStats, scoringMeta, visibleNotes };
}
