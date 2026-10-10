'use client';

/**
 * Scoring window + pre-computed timing data for Battle Royale scoring.
 * Extracted from use-battle-royale-game.ts (R4) — logic byte-identical.
 */
import { useMemo } from 'react';
import { getCurrentMedleySnippet } from '@/lib/game/battle-royale';
import type { BattleRoyaleGame } from '@/lib/game/battle-royale';
import { calculatePitchStats } from '@/lib/game/note-utils';
import type { PitchStats } from '@/lib/game/note-utils';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import type { ScoringMetadata } from '@/lib/game/scoring';
import type { Song, Note, LyricLine } from '@/types/game';

/** Pre-computed timing data for the scoring window (see useBattleRoyaleTimingData). */
export interface BattleRoyaleTimingData {
  allNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  beatDuration: number;
  scoringMetadata: ScoringMetadata;
  pitchStats: PitchStats;
}

interface UseBattleRoyaleTimingDataParams {
  game: BattleRoyaleGame;
  currentSong: Song | null;
}

interface UseBattleRoyaleTimingDataReturn {
  timingData: BattleRoyaleTimingData | null;
}

export function useBattleRoyaleTimingData({ game, currentSong }: UseBattleRoyaleTimingDataParams): UseBattleRoyaleTimingDataReturn {
  // ── Scoring window (user rule 6.2: "sehr wenig Punkte") ─────────────
  // The 10,000-point budget used to be spread over the ENTIRE song's notes,
  // but a round only ever plays a slice of it (round duration or medley
  // snippet) — so players could only ever reach a fraction of the tick pool.
  // The metadata is now computed over the notes inside the ACTUAL play
  // window only, which puts per-tick points on par with a regular game of
  // that length. BR plays songs from position 0, so the window is simply
  // [0, windowMs).
  const playWindowMs = useMemo(() => {
    if (game.medleySnippetList.length > 0) {
      return (getCurrentMedleySnippet(game)?.duration ?? 30) * 1000;
    }
    const round = game.rounds[game.rounds.length - 1];
    return round && round.duration > 0 ? round.duration * 1000 : 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rounds/snippets only change on transitions
  }, [game.medleySnippetList, game.currentSnippetIndex, game.rounds, game.currentRound]);

  // ── Pre-compute timing data for scoring ────────────────────────────
  const timingData = useMemo(() => {
    if (!currentSong || currentSong.lyrics.length === 0) return null;
    const allNotes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    currentSong.lyrics.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        allNotes.push({ ...note, lineIndex, line });
      });
    });
    allNotes.sort((a, b) => a.startTime - b.startTime);
    const beatDurationMs = currentSong.bpm ? 15000 / currentSong.bpm : 500;
    // 6.2: window-restricted metadata (see playWindowMs above). Fall back to
    // the full song when the window has (almost) no notes (long intro) so the
    // pool never degenerates.
    const windowNotes = playWindowMs > 0
      ? allNotes.filter(n => n.startTime < playWindowMs)
      : allNotes;
    const metaNotes = windowNotes.length >= 4 ? windowNotes : allNotes;
    const scoringMetadata = calculateScoringMetadata(metaNotes, beatDurationMs);
    const pitchStats = calculatePitchStats(allNotes);
    return { allNotes, beatDuration: beatDurationMs, scoringMetadata, pitchStats };
  }, [currentSong, playWindowMs]);

  return { timingData };
}
