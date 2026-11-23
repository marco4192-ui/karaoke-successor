'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { Song } from '@/types/game';
import { updateSong, updateSongs, getSongByIdWithLyrics } from '@/lib/game/song-library';
import { normalizeGenreName, normalizeLanguage } from '@/lib/parsers/meta-normalizer';
import { persistSongMetadataToTxt } from '@/lib/editor/persist-metadata';
import {
  harmonizeSongs,
  type HarmonizeSuggestion,
  type HarmonizeProgress,
  type HarmonizeStats,
} from '@/lib/editor/harmonize-client';
import { setCachedHarmonize } from '@/lib/editor/harmonize-cache';
import { ruleHarmonizer, type RuleHarmonizeItem } from '@/lib/editor/rule-harmonizer';
import type { StudioApplyProgress, StudioMode, StudioScope, StudioWriteTarget } from './types';

/** The studio's suggestion engine: owns every piece of state around the
 *  factual fill/verify pipeline — the run job (loading banner, elapsed
 *  ticker, abort), the suggestion list, the apply loops (single field row,
 *  apply-all, manual "mark correct" overrides), the lyrics warm-up for txt
 *  writes and the rule-harmonization start. All write paths respect the
 *  write target (txt-first, else game-local).
 *
 *  R60/R62/R63 semantics are preserved verbatim (verified-badge marking,
 *  cache overrides for "data is correct", abort handling). */
export function useStudioEngine({
  songs,
  runSubset,
  scope,
  mode,
  fields,
  writeTarget,
  rulePlan,
  t,
  onApplied,
}: {
  songs: Song[];
  /** Songs the current run would analyze (mode/field-aware, from the main component). */
  runSubset: Song[];
  scope: StudioScope;
  mode: StudioMode;
  fields: { genre: boolean; language: boolean; year: boolean };
  writeTarget: StudioWriteTarget;
  rulePlan: RuleHarmonizeItem[];
  t: (key: string) => string;
  onApplied: () => void;
}) {
  // ── Suggestion engine state (moved from the old batch flow + cards) ──
  const [suggestions, setSuggestions] = useState<HarmonizeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [progress, setProgress] = useState<HarmonizeProgress | null>(null);
  const [stats, setStats] = useState<HarmonizeStats | null>(null);
  const [applyProgress, setApplyProgress] = useState<StudioApplyProgress | null>(null);
  const [fileErrors, setFileErrors] = useState<number | null>(null);
  const [localAppliedInfo, setLocalAppliedInfo] = useState<number | null>(null);
  // R60: how many songs the last verify run NEWLY marked as verified (✓ badge
  // info line under the run summary; null = nothing marked / no run).
  const [markedVerifiedInfo, setMarkedVerifiedInfo] = useState<number | null>(null);
  const [warmupProgress, setWarmupProgress] = useState<StudioApplyProgress | null>(null);
  const warmupPromiseRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef(true);

  // ── Run-job control (loading banner: phase, elapsed, abort) ──
  const abortRef = useRef<AbortController | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  // 1 Hz elapsed-time ticker while the analysis job runs
  useEffect(() => {
    if (runStartedAt === null) return;
    setElapsedSec(Math.round((Date.now() - runStartedAt) / 1000));
    const id = window.setInterval(() => {
      setElapsedSec(Math.round((Date.now() - runStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [runStartedAt]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  /** Null out fields the user deselected; fill mode keeps only EMPTY fields,
   *  verify mode (R59) only PRESENT ones — cached entries from the other
   *  mode can never leak a suggestion into the wrong mode. */
  const filterSuggestions = useCallback((
    list: HarmonizeSuggestion[],
  ): HarmonizeSuggestion[] => (
    list.map(s => ({
      ...s,
      suggestedGenre: fields.genre && (mode === 'verify' ? !!s.currentGenre : !s.currentGenre) ? s.suggestedGenre : null,
      suggestedLanguage: fields.language && (mode === 'verify' ? !!s.currentLanguage : !s.currentLanguage) ? s.suggestedLanguage : null,
      suggestedYear: fields.year && (mode === 'verify' ? s.currentYear != null : s.currentYear == null) ? s.suggestedYear : null,
    })).filter(s => s.suggestedGenre || s.suggestedLanguage || s.suggestedYear)
  ), [fields, mode]);

  // ── Lyrics warm-up (only needed when writing txt files) ──
  const startLyricsWarmup = useCallback((list: Song[]) => {
    const total = list.length;
    if (total === 0) return;
    let index = 0;
    let done = 0;
    setWarmupProgress({ done: 0, total });

    const worker = async () => {
      while (index < total) {
        const song = list[index++];
        try { await getSongByIdWithLyrics(song.id); } catch { /* best-effort */ }
        done++;
        if (isMountedRef.current) setWarmupProgress({ done, total });
      }
    };

    warmupPromiseRef.current = Promise.all(
      Array.from({ length: Math.min(4, total) }, () => worker()),
    ).then(() => { if (isMountedRef.current) setWarmupProgress(null); });
  }, []);

  // ── Run (fill / verify modes — factual pipeline) ──

  const handleRun = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setFileErrors(null);
    setLocalAppliedInfo(null);
    setMarkedVerifiedInfo(null);
    setStats(null);
    setProgress(null);
    setRunStartedAt(Date.now());

    const controller = new AbortController();
    abortRef.current = controller;

    if (writeTarget === 'txt') startLyricsWarmup(runSubset);

    try {
      const result = await harmonizeSongs(
        runSubset.map(s => ({
          id: s.id, title: s.title, artist: s.artist,
          genre: s.genre ?? null, language: s.language ?? null, year: s.year ?? null,
        })),
        {
          onProgress: setProgress,
          signal: controller.signal,
          // R59: verify mode checks the EXISTING values (field toggles ride
          // along so only active fields burn lookups/quota)
          ...(mode === 'verify' ? { verify: true, verifyFields: fields } : {}),
        },
      );
      if (!isMountedRef.current) return;
      setProgress(null);

      if (result.stats.aborted) {
        // User cancelled — neutral state, no error banner
        setSuggestions([]);
        setStats(null);
        return;
      }

      const filtered = filterSuggestions(result.suggestions);
      if (result.success || filtered.length > 0) {
        setSuggestions(filtered);
        setStats(result.stats);
      } else {
        setError(result.error || t('editor.aiBatchError'));
      }

      // ── R60/R62: mark verified songs (✓ badge in the editor library) ──
      // Songs the verify run ANALYZED and found NOTHING to correct get
      // metadataVerifiedAt — same persistence primitive as applied
      // suggestions (updateSong → localStorage + IndexedDB; the flag is app
      // state, not txt metadata, so no txt write happens here). Aborted runs
      // mark nothing. R62: fields without a source verdict no longer block
      // the badge — corrected AND already-correct songs both reach ✓, so a
      // complete verify run can verify the whole library (100% reachable).
      if (mode === 'verify' && result.verifiedOkIds.length > 0) {
        const now = Date.now();
        updateSongs(result.verifiedOkIds.map(id => ({ songId: id, updates: { metadataVerifiedAt: now } })));
        const previouslyVerified = new Set(runSubset.filter(s => s.metadataVerifiedAt).map(s => s.id));
        const newlyVerified = result.verifiedOkIds.filter(id => !previouslyVerified.has(id)).length;
        if (newlyVerified > 0) setMarkedVerifiedInfo(newlyVerified);
        onApplied(); // refresh the editor grid so the badges appear immediately
      }
    } catch (e) {
      if (!isMountedRef.current) return;
      if (controller.signal.aborted) return; // aborted fetch — not an error
      setError(e instanceof Error ? e.message : t('editor.aiBatchError'));
    } finally {
      abortRef.current = null;
      if (isMountedRef.current) {
        setIsLoading(false);
        setProgress(null);
        setRunStartedAt(null);
      }
    }
  }, [runSubset, mode, writeTarget, startLyricsWarmup, filterSuggestions, t, onApplied]);

  /** User-facing Run click: guards an empty selection / nothing to fill or
   *  verify (mode-specific message, R59). */
  const handleRunClick = useCallback(() => {
    if (runSubset.length === 0) {
      setError(scope === 'selection'
        ? t('editor.aiBatchSelectFirstDesc')
        : mode === 'verify'
          ? t('editor.studioVerifyNothing')
          : t('editor.studioNothingToFill'));
      return;
    }
    void handleRun();
  }, [runSubset, mode, scope, t, handleRun]);

  /** Cancel the running analysis job (orderly abort after the current chunk). */
  const handleAbortRun = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // ── R63: "Daten sind korrekt" — verify mode's 100% path ──
  // A verify run badges every song it found NOTHING to correct, but songs
  // with OPEN suggestions could never reach the ✓ badge: the only way out
  // was applying a correction the user might consider WRONG (classic case:
  // iTunes says "Pop"/"Volksmusik" where the German karaoke library
  // correctly says "Schlager"). This handler overrules the open
  // suggestions — the user declares "my data is already correct":
  //  - the song gets metadataVerifiedAt (✓ badge) WITHOUT changing values
  //  - a user-override cache entry (all-null suggestions, verifiedOk,
  //    verifySemantics 2, full field coverage) replaces the suggesting
  //    entry under the CURRENT values' key → future verify runs serve the
  //    verdict from the cache instead of re-listing the rejected suggestion
  //  - the row(s) leave the suggestion list
  // Editing a value later still drops the badge (R60-E invalidation) and
  // the changed key means a fresh check on the next run — nothing freezes.
  const handleMarkCorrect = useCallback((songIds: string[]) => {
    if (songIds.length === 0) return;
    const now = Date.now();
    updateSongs(songIds.map(id => ({ songId: id, updates: { metadataVerifiedAt: now } })));
    const songsById = new Map(songs.map(s => [s.id, s] as const));
    for (const id of songIds) {
      const song = songsById.get(id);
      if (!song) continue;
      setCachedHarmonize(
        {
          title: song.title,
          artist: song.artist,
          genre: song.genre ?? null,
          language: song.language ?? null,
          year: song.year ?? null,
        },
        {
          suggestedGenre: null,
          suggestedLanguage: null,
          suggestedYear: null,
          genreConfidence: 0,
          languageConfidence: 0,
          yearConfidence: 0,
          genreReason: '',
          languageReason: '',
          yearReason: '',
          source: 'ai',
          verifiedOk: true,
          verifiedFields: { genre: true, language: true, year: true },
          verifySemantics: 2,
        },
      );
    }
    const idSet = new Set(songIds);
    setSuggestions(prev => prev.filter(s => !idSet.has(s.songId)));
    setMarkedVerifiedInfo(prev => (prev ?? 0) + songIds.length);
    onApplied(); // refresh the editor grid so the badges appear immediately
  }, [songs, onApplied]);

  // ── Apply (single field row ✓) ──
  const handleApplySingle = useCallback(async (
    songId: string,
    field: 'genre' | 'language' | 'year',
    value: string | number,
  ) => {
    const normalized = field === 'genre'
      ? normalizeGenreName(String(value))
      : field === 'language'
        ? normalizeLanguage(String(value))
        : Number(value);
    const updates: Partial<Song> = { [field]: normalized };

    // R60: applying a verify correction brings the song in line with the
    // source — when this was the LAST open field of the song, it counts as
    // verified now (badge). Only in verify mode; a fill apply never sets
    // the flag (the other existing values were not checked). Riding in the
    // same updates object keeps the flag exactly in sync with the write
    // (txt failure ⇒ no value ⇒ no badge).
    if (mode === 'verify') {
      const row = suggestions.find(s => s.songId === songId);
      const otherFieldOpen = field === 'genre'
        ? !!(row && (row.suggestedLanguage || row.suggestedYear))
        : field === 'language'
          ? !!(row && (row.suggestedGenre || row.suggestedYear))
          : !!(row && (row.suggestedGenre || row.suggestedLanguage));
      if (!otherFieldOpen) updates.metadataVerifiedAt = Date.now();
    }

    if (writeTarget === 'txt') {
      // TXT FIRST (1.a): the library is ONLY updated when the txt write
      // succeeded — no more "genre set but not in the txt".
      const fileOk = await persistSongMetadataToTxt(songId, updates);
      if (!isMountedRef.current) return;
      if (fileOk.success) {
        updateSong(songId, updates);
      } else {
        setFileErrors(prev => (prev ?? 0) + 1);
        return;
      }
    } else {
      // Game-local only — wiped by the library reset (hint shown above).
      updateSong(songId, updates);
    }

    setSuggestions(prev => prev
      .map(s => s.songId === songId
        ? { ...s, ...(field === 'genre' ? { suggestedGenre: null } : field === 'language' ? { suggestedLanguage: null } : { suggestedYear: null }) }
        : s)
      .filter(s => s.suggestedGenre || s.suggestedLanguage || s.suggestedYear));
    // Last open row applied → drop the run summary too (the fill stats line
    // and the verify all-OK banner would otherwise show stale numbers, R59).
    queueMicrotask(() => {
      if (!isMountedRef.current) return;
      setSuggestions(current => {
        if (current.length === 0) setStats(null);
        return current;
      });
    });
    onApplied();
  }, [writeTarget, mode, suggestions, onApplied]);

  // ── Apply all (threshold-aware, respects fields + write target) ──
  const handleApplyAll = useCallback(async () => {
    const list = suggestions;
    if (list.length === 0) return;

    if (writeTarget === 'txt' && warmupPromiseRef.current) {
      try { await warmupPromiseRef.current; } catch { /* best-effort */ }
    }

    setApplyProgress({ done: 0, total: list.length });
    setFileErrors(0);
    let failedFiles = 0;
    let processed = 0;
    let localApplied = 0;
    const failed: HarmonizeSuggestion[] = [];

    for (const s of list) {
      const updates: Partial<Song> = {};
      if (s.suggestedGenre) {
        updates.genre = normalizeGenreName(s.suggestedGenre);
      }
      if (s.suggestedLanguage) {
        updates.language = normalizeLanguage(s.suggestedLanguage);
      }
      if (s.suggestedYear && s.suggestedYear !== s.currentYear) {
        updates.year = s.suggestedYear;
      }

      // R60 (verify mode): every open field of this song is being applied
      // → the song now matches the sources and counts as verified (badge).
      if (mode === 'verify' && Object.keys(updates).length > 0) {
        const allFieldsCovered =
          (!s.suggestedGenre || updates.genre !== undefined) &&
          (!s.suggestedLanguage || updates.language !== undefined) &&
          (!s.suggestedYear || updates.year !== undefined);
        if (allFieldsCovered) updates.metadataVerifiedAt = Date.now();
      }

      if (Object.keys(updates).length > 0) {
        if (writeTarget === 'txt') {
          const fileOk = await persistSongMetadataToTxt(s.songId, updates);
          if (fileOk.success) {
            updateSong(s.songId, updates);
          } else {
            failedFiles++;
            failed.push(s);
          }
        } else {
          updateSong(s.songId, updates);
          localApplied++;
        }
      }
      processed++;
      if (!isMountedRef.current) return;
      setApplyProgress({ done: processed, total: list.length });
    }

    if (!isMountedRef.current) return;
    setApplyProgress(null);
    setFileErrors(failedFiles > 0 ? failedFiles : null);
    if (localApplied > 0) setLocalAppliedInfo(localApplied);
    setSuggestions(failed);
    setShowWarning(false);
    setStats(null);
    onApplied();
  }, [suggestions, mode, writeTarget, onApplied]);

  // ── Rule mode ──
  const handleRuleStart = useCallback(async () => {
    if (rulePlan.length === 0) return;
    if (writeTarget === 'txt') {
      // Background job (module singleton) — keeps running when the studio
      // closes; the RuleHarmonizeStatusBar shows progress.
      await ruleHarmonizer.start(rulePlan);
      if (isMountedRef.current) onApplied();
    } else {
      // Game-local: simple sequential loop, no txt writes
      setApplyProgress({ done: 0, total: rulePlan.length });
      let done = 0;
      for (const item of rulePlan) {
        // Field-aware: genre items write genre, language items language.
        // R60: rule-based rewrites invalidate the verified badge.
        updateSong(item.songId, item.field === 'language'
          ? { language: item.newLanguage, metadataVerifiedAt: undefined }
          : { genre: item.newGenre, metadataVerifiedAt: undefined });
        done++;
        if (!isMountedRef.current) return;
        setApplyProgress({ done, total: rulePlan.length });
        await new Promise(resolve => setTimeout(resolve, 0)); // yield to UI
      }
      setApplyProgress(null);
      setLocalAppliedInfo(rulePlan.length);
      onApplied();
    }
  }, [rulePlan, writeTarget, onApplied]);

  /** Count into the local-applied info banner (used by the manual hooks). */
  const noteLocalApplied = useCallback((count: number) => {
    setLocalAppliedInfo(prev => prev == null ? count : prev + count);
  }, []);

  return {
    // state
    suggestions,
    setSuggestions,
    isLoading,
    error,
    showWarning,
    setShowWarning,
    progress,
    stats,
    setStats,
    applyProgress,
    fileErrors,
    setFileErrors,
    localAppliedInfo,
    setLocalAppliedInfo,
    markedVerifiedInfo,
    warmupProgress,
    runStartedAt,
    elapsedSec,
    // handlers
    handleRunClick,
    handleAbortRun,
    handleMarkCorrect,
    handleApplySingle,
    handleApplyAll,
    handleRuleStart,
    noteLocalApplied,
  };
}
