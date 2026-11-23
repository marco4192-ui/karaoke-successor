'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { Song } from '@/types/game';
import { updateSong } from '@/lib/game/song-library';
import { normalizeLanguage, normalizeGenreName } from '@/lib/parsers/meta-normalizer';
import { persistSongMetadataToTxt } from '@/lib/editor/persist-metadata';
import { planManualGenreReview } from '@/lib/editor/rule-harmonizer';
import type { StudioApplyProgress, StudioMode, StudioWriteTarget } from './types';

/** Manual editing state of the studio: the rule-mode genre correction list
 *  (pseudo-genres the rules can never map — user picks, session skips) and
 *  the R5-1 direct per-song edit mode (current value + editor side by
 *  side). Both apply loops share the studio's write path (txt-first when
 *  txt is the target) and report local-applied / file-error counts back to
 *  the engine hook. */
export function useManualEditing({
  mode,
  scopeSongs,
  rulesVersion,
  fields,
  writeTarget,
  onApplied,
  manualPreviewId,
  stopManualPreview,
  noteLocalApplied,
  setFileErrors,
}: {
  mode: StudioMode;
  scopeSongs: Song[];
  /** Metadata-rules store version — forces manualReview recomputation on rule edits (R50). */
  rulesVersion: number;
  fields: { genre: boolean; language: boolean; year: boolean };
  writeTarget: StudioWriteTarget;
  onApplied: () => void;
  manualPreviewId: string | null;
  stopManualPreview: () => void;
  /** Engine callback: count songs applied game-locally into the info banner. */
  noteLocalApplied: (count: number) => void;
  /** Engine state setter for failed txt writes. */
  setFileErrors: (errors: number | null) => void;
}) {
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  /** Session-scoped skip set (user feedback: harmonize must also run WITHOUT
   *  an assignment — skipped songs keep their pseudo-genre for now). */
  const [skippedManualIds, setSkippedManualIds] = useState<ReadonlySet<string>>(new Set());

  /** Manual review plan (rule mode): songs with pseudo-genres ("AI",
   *  "Oldies", "A Cappella", "TV"…) that no logical rule can map — minus the
   *  session-skipped ones (kept as-is, user feedback point 2). */
  const manualReview = useMemo(() => {
    if (mode !== 'rule') return [];
    return planManualGenreReview(scopeSongs).filter(m => !skippedManualIds.has(m.songId));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see the rule plan in the main component (R50 rule-change reactivity)
  }, [mode, scopeSongs, skippedManualIds, rulesVersion]);
  /** Songs the user skipped this session (info line + restore link). */
  const skippedManualCount = useMemo(
    () => skippedManualIds.size,
    [skippedManualIds],
  );
  /** user's genre pick per song (songId → main genre) in the correction list. */
  const [manualPicks, setManualPicks] = useState<Record<string, string>>({});
  const [manualApplyProgress, setManualApplyProgress] = useState<StudioApplyProgress | null>(null);

  // ── Manual edit mode (R5-1) ──
  /** Per-song edited values (songId → raw input strings). An edit only
   *  counts as "changed" when it differs from the current value (see
   *  manualUpdatesFor) — unchanged entries are never applied. */
  const [manualEdits, setManualEdits] = useState<Record<string, { genre?: string; language?: string; year?: string }>>({});
  const [manualEditApplyProgress, setManualEditApplyProgress] = useState<StudioApplyProgress | null>(null);

  /** Skip one manual-review song (keeps its genre as-is for this session). */
  const skipManualSong = useCallback((songId: string) => {
    setSkippedManualIds(prev => {
      const next = new Set(prev);
      next.add(songId);
      return next;
    });
    setManualPicks(prev => {
      if (!(songId in prev)) return prev;
      const next = { ...prev };
      delete next[songId];
      return next;
    });
    if (manualPreviewId === songId) stopManualPreview();
  }, [manualPreviewId, stopManualPreview]);

  /** Apply the manual genre corrections (same write path as the rule job:
   *  txt-first when txt is the target, else game-local). */
  const handleApplyManualPicks = useCallback(async () => {
    const picks = manualReview.filter(item => manualPicks[item.songId]);
    if (picks.length === 0) return;
    setManualApplyProgress({ done: 0, total: picks.length });
    let done = 0;
    let applied = 0;
    for (const item of picks) {
      // R60: a manual genre correction is a HUMAN override — it invalidates
      // the verified badge (the check verdict no longer matches the value).
      const updates: Partial<Song> = { genre: manualPicks[item.songId], metadataVerifiedAt: undefined };
      try {
        if (writeTarget === 'txt') {
          const result = await persistSongMetadataToTxt(item.songId, updates);
          if (result.success) {
            updateSong(item.songId, updates);
            applied++;
          }
        } else {
          updateSong(item.songId, updates);
          applied++;
        }
      } catch { /* counted as not applied */ }
      done++;
      if (!isMountedRef.current) return;
      setManualApplyProgress({ done, total: picks.length });
      await new Promise(resolve => setTimeout(resolve, 0)); // yield to UI
    }
    // Drop the corrected rows from the list
    setManualPicks(prev => {
      const next = { ...prev };
      for (const item of picks) delete next[item.songId];
      return next;
    });
    setManualApplyProgress(null);
    if (isMountedRef.current && applied > 0) {
      noteLocalApplied(applied);
      onApplied();
    }
  }, [manualReview, manualPicks, writeTarget, onApplied, noteLocalApplied]);

  /** Effective manual edits for one song: normalized values for the ACTIVE
   *  fields that DIFFER from the current value. Empty, implausible (year
   *  outside 1900–2100) or unchanged entries are skipped silently — only
   *  real changes are applied. */
  const manualUpdatesFor = useCallback((
    song: Song,
  ): { genre?: string; language?: string; year?: number } => {
    const edit = manualEdits[song.id];
    if (!edit) return {};
    const updates: { genre?: string; language?: string; year?: number } = {};
    if (fields.genre && edit.genre) {
      const next = normalizeGenreName(edit.genre);
      if (next && next !== song.genre) updates.genre = next;
    }
    if (fields.language && edit.language?.trim()) {
      const next = normalizeLanguage(edit.language.trim());
      if (next && next !== song.language) updates.language = next;
    }
    if (fields.year && edit.year?.trim()) {
      const parsed = Number(edit.year.trim());
      if (Number.isFinite(parsed) && parsed >= 1900 && parsed <= 2100 && parsed !== song.year) {
        updates.year = parsed;
      }
    }
    return updates;
  }, [manualEdits, fields]);

  /** Songs with at least one changed field — drives the "X von Y" counter
   *  and the Apply button state. */
  const manualEditChangedCount = useMemo(
    () => scopeSongs.reduce(
      (count, song) => (Object.keys(manualUpdatesFor(song)).length > 0 ? count + 1 : count),
      0,
    ),
    [scopeSongs, manualUpdatesFor],
  );

  /** Apply ALL changed manual edits (same write path as handleApplyManualPicks:
   *  txt-first when txt is the target — the library is only updated when the
   *  txt write succeeded; local target just updates the game library). */
  const handleApplyManualEdits = useCallback(async () => {
    const pending = scopeSongs
      .map(song => ({ songId: song.id, updates: manualUpdatesFor(song) as Partial<Song> }))
      .filter(item => Object.keys(item.updates).length > 0);
    if (pending.length === 0) return;

    setManualEditApplyProgress({ done: 0, total: pending.length });
    let done = 0;
    let applied = 0;
    let failedFiles = 0;
    const appliedIds: string[] = [];

    for (const item of pending) {
      try {
        // R60: manual metadata edits invalidate the verified badge.
        const updates: Partial<Song> = { ...item.updates, metadataVerifiedAt: undefined };
        if (writeTarget === 'txt') {
          const result = await persistSongMetadataToTxt(item.songId, updates);
          if (result.success) {
            updateSong(item.songId, updates);
            applied++;
            appliedIds.push(item.songId);
          } else {
            failedFiles++;
          }
        } else {
          updateSong(item.songId, updates);
          applied++;
          appliedIds.push(item.songId);
        }
      } catch { failedFiles++; /* counted as not applied */ }
      done++;
      if (!isMountedRef.current) return;
      setManualEditApplyProgress({ done, total: pending.length });
      await new Promise(resolve => setTimeout(resolve, 0)); // yield to UI
    }

    if (!isMountedRef.current) return;
    // Drop the applied edits (failed txt writes stay editable for a retry)
    setManualEdits(prev => {
      const next = { ...prev };
      for (const id of appliedIds) delete next[id];
      return next;
    });
    setManualEditApplyProgress(null);
    setFileErrors(failedFiles > 0 ? failedFiles : null);
    if (applied > 0) {
      if (writeTarget === 'local') {
        noteLocalApplied(applied);
      }
      onApplied();
    }
  }, [scopeSongs, manualUpdatesFor, writeTarget, onApplied, noteLocalApplied, setFileErrors]);

  return {
    // rule-mode manual genre correction list
    manualReview,
    skippedManualCount,
    setSkippedManualIds,
    manualPicks,
    setManualPicks,
    manualApplyProgress,
    handleApplyManualPicks,
    skipManualSong,
    // manual edit mode (R5-1)
    manualEdits,
    setManualEdits,
    manualEditApplyProgress,
    manualUpdatesFor,
    manualEditChangedCount,
    handleApplyManualEdits,
  };
}
