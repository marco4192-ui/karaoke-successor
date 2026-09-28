'use client';

/**
 * Metadata Studio (user feedback round R4 — points 7 + 8).
 *
 * ONE merged hub for metadata enrichment/harmonization, placed in the editor
 * library above the song grid. It replaces the old sidebar trio
 * (GenreLanguageEditor + AiHarmonizeCard + RuleHarmonizeCard) AND the separate
 * "AI Support" batch-suggest flow — merging the strengths of both:
 *
 *  - Scope:   all songs OR the current multi-selection (old "AI Suggest")
 *  - Fields:  Genre / Language / Year — independently selectable
 *  - Mode:    "fill missing" (only empty fields get values), "harmonize"
 *             (AI suggests corrections incl. existing values), "rule-based"
 *             (deterministic GENRE_ALIASES mapping — no AI, no quota) or
 *             "manual" (R5-1: direct per-song editing of all scope songs —
 *             current value + editor side by side, no AI involved)
 *  - Target:  write into the UltraStar txt (survives a library reset) or keep
 *             changes game-local only (wiped by the library reset — hint shown)
 *
 * Engine is the shared pipeline (R2 cache → R6 factual lookup → LLM chunks R3)
 * — identical results to the former cards, one UI.
 *
 * R3 refactor: this file is now the ORCHESTRATOR — it owns all state and the
 * run/apply logic. The view blocks live in ./metadata-studio/:
 *   types.ts (studio types) · constants.ts (batch constants) ·
 *   hooks.ts (rule-job state + listen preview) · studio-config-bar.tsx ·
 *   rule-mode-panel.tsx · manual-edit-panel.tsx · run-controls.tsx ·
 *   status-section.tsx · suggestions-panel.tsx
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Song } from '@/types/game';
import { updateSong, getSongByIdWithLyrics } from '@/lib/game/song-library';
import { normalizeLanguage, normalizeGenreName } from '@/lib/parsers/meta-normalizer';
import { persistSongMetadataToTxt } from '@/lib/editor/persist-metadata';
import {
  harmonizeSongs,
  HarmonizeSuggestion,
  HarmonizeProgress,
  HarmonizeStats,
} from '@/lib/ai/harmonize-client';
import {
  fieldPassesThreshold,
  countApplicableSongs,
} from '@/components/editor/harmonize-shared';
import {
  planRuleHarmonization,
  planRuleLanguageHarmonization,
  planManualGenreReview,
  ruleHarmonizer,
} from '@/lib/editor/rule-harmonizer';
import { useCustomTaxonomy } from '@/hooks/use-custom-taxonomy';

import { STUDIO_RECOMMENDED_BATCH } from './metadata-studio/constants';
import { useManualPreview, useRuleHarmonizerState } from './metadata-studio/hooks';
import type {
  ManualEditDraft,
  MetadataStudioProps,
  StudioMode,
  StudioScope,
  StudioWriteTarget,
} from './metadata-studio/types';
import { StudioConfigBar } from './metadata-studio/studio-config-bar';
import { RuleModePanel } from './metadata-studio/rule-mode-panel';
import { ManualEditPanel } from './metadata-studio/manual-edit-panel';
import { BigBatchConfirmDialog, RunControls } from './metadata-studio/run-controls';
import { LoadingBanner, RuleDoneBanner, StatusFeedback } from './metadata-studio/status-section';
import { ApplyAllWarningDialog, SuggestionsPanel } from './metadata-studio/suggestions-panel';

// Stable public surface of the old module path (types + measured constant).
export { STUDIO_RECOMMENDED_BATCH } from './metadata-studio/constants';
export type { StudioScope, StudioMode, StudioWriteTarget } from './metadata-studio/types';

export function MetadataStudio({
  songs,
  selectedIds,
  open,
  onToggle,
  selectionFocusToken = 0,
  selectMode,
  onToggleSelectMode,
  onClearSelection,
  onApplied,
  t,
}: MetadataStudioProps) {
  // ── Configuration ──
  const [scope, setScope] = useState<StudioScope>('all');
  const [fields, setFields] = useState({ genre: true, language: true, year: true });
  const [mode, setMode] = useState<StudioMode>('fill');
  const [writeTarget, setWriteTarget] = useState<StudioWriteTarget>('txt');

  // R20: genre vocabulary = built-in list + user-defined entries from
  // Settings → Genres & Languages (reactive — the dropdowns here update the
  // moment a custom genre is added or removed there)
  const { allGenres } = useCustomTaxonomy();

  // Opening from the select bar switches to the selection scope (token-based
  // so it also fires when the scope was already "selection")
  useEffect(() => {
    if (selectionFocusToken > 0) setScope('selection');
  }, [selectionFocusToken]);

  // ── Suggestion engine state (moved from the old batch flow + cards) ──
  const [suggestions, setSuggestions] = useState<HarmonizeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [progress, setProgress] = useState<HarmonizeProgress | null>(null);
  const [stats, setStats] = useState<HarmonizeStats | null>(null);
  const [minConfidence, setMinConfidence] = useState(70);
  const [applyProgress, setApplyProgress] = useState<{ done: number; total: number } | null>(null);
  const [fileErrors, setFileErrors] = useState<number | null>(null);
  const [localAppliedInfo, setLocalAppliedInfo] = useState<number | null>(null);
  const [warmupProgress, setWarmupProgress] = useState<{ done: number; total: number } | null>(null);
  const warmupPromiseRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef(true);

  // ── Run-job control (loading banner: phase, elapsed, abort) ──
  const abortRef = useRef<AbortController | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  /** Big-batch confirmation pending (AI modes above the recommended size). */
  const [confirmBigBatch, setConfirmBigBatch] = useState(false);

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

  // ── Scope / mode helpers ──
  const selectedSongs = useMemo(
    () => songs.filter(s => selectedIds.has(s.id)),
    [songs, selectedIds],
  );
  const scopeSongs = scope === 'selection' ? selectedSongs : songs;

  const missingCounts = useMemo(() => ({
    genre: songs.filter(s => !s.genre).length,
    language: songs.filter(s => !s.language).length,
    year: songs.filter(s => !s.year).length,
  }), [songs]);

  /**
   * Songs the current run would analyze:
   *  - fill mode: only songs with at least one SELECTED field missing
   *  - harmonize mode: every song in scope
   */
  const runSubset = useMemo(() => {
    if (mode === 'rule') return scopeSongs; // plan computed from genres below
    if (mode === 'fill') {
      return scopeSongs.filter(s =>
        (fields.genre && !s.genre) ||
        (fields.language && !s.language) ||
        (fields.year && !s.year),
      );
    }
    return scopeSongs;
  }, [scopeSongs, mode, fields]);

  /** Rule plan (pure + synchronous): GENRE harmonization (alias mapping,
   *  parenthetical stripping, comma-splitting) plus LANGUAGE harmonization
   *  (parentheses stripped, aliases mapped, separators unified to "/") —
   *  the language rules mirror the genre pipeline (user item 6). */
  const rulePlan = useMemo(
    () => (mode === 'rule'
      ? [...planRuleHarmonization(scopeSongs), ...planRuleLanguageHarmonization(scopeSongs)]
      : []),
    [mode, scopeSongs],
  );
  /** Plan breakdown for the info line (🎸 genres / 🌐 languages). */
  const ruleGenrePlanCount = useMemo(
    () => (mode === 'rule' ? planRuleHarmonization(scopeSongs).length : 0),
    [mode, scopeSongs],
  );
  const ruleLanguagePlanCount = rulePlan.length - ruleGenrePlanCount;

  /** Session-scoped skip set (user feedback: harmonize must also run WITHOUT
   *  an assignment — skipped songs keep their pseudo-genre for now). */
  const [skippedManualIds, setSkippedManualIds] = useState<ReadonlySet<string>>(new Set());

  /** Manual review plan (rule mode): songs with pseudo-genres ("AI",
   *  "Oldies", "A Cappella", "TV"…) that no logical rule can map — minus the
   *  session-skipped ones (kept as-is, user feedback point 2). */
  const manualReview = useMemo(() => {
    if (mode !== 'rule') return [];
    return planManualGenreReview(scopeSongs).filter(m => !skippedManualIds.has(m.songId));
  }, [mode, scopeSongs, skippedManualIds]);
  /** Songs the user skipped this session (info line + restore link). */
  const skippedManualCount = useMemo(
    () => skippedManualIds.size,
    [skippedManualIds],
  );
  /** user's genre pick per song (songId → main genre) in the correction list. */
  const [manualPicks, setManualPicks] = useState<Record<string, string>>({});
  const [manualApplyProgress, setManualApplyProgress] = useState<{ done: number; total: number } | null>(null);

  // ── Manual edit mode (R5-1) ──
  /** Per-song edited values (songId → raw input strings). An edit only
   *  counts as "changed" when it differs from the current value (see
   *  manualUpdatesFor) — unchanged entries are never applied. */
  const [manualEdits, setManualEdits] = useState<Record<string, ManualEditDraft>>({});
  const [manualEditApplyProgress, setManualEditApplyProgress] = useState<{ done: number; total: number } | null>(null);

  /** Full song lookup for the manual-review preview (items only carry
   *  title/artist/genre — playback needs the media URLs). */
  const songById = useMemo(() => {
    const map = new Map<string, Song>();
    for (const s of songs) map.set(s.id, s);
    return map;
  }, [songs]);

  // ── Manual-review audio preview (listen before you assign/edit) ──
  const { manualPreviewId, toggleManualPreview, stopManualPreview } = useManualPreview(songById);

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
      const updates: Partial<Song> = { genre: manualPicks[item.songId] };
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
      setLocalAppliedInfo(prev => prev == null ? applied : prev + applied);
      onApplied();
    }
  }, [manualReview, manualPicks, writeTarget, onApplied]);

  // ── Manual edit mode (R5-1) ──

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
        if (writeTarget === 'txt') {
          const result = await persistSongMetadataToTxt(item.songId, item.updates);
          if (result.success) {
            updateSong(item.songId, item.updates);
            applied++;
            appliedIds.push(item.songId);
          } else {
            failedFiles++;
          }
        } else {
          updateSong(item.songId, item.updates);
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
        setLocalAppliedInfo(prev => prev == null ? applied : prev + applied);
      }
      onApplied();
    }
  }, [scopeSongs, manualUpdatesFor, writeTarget, onApplied]);

  // ── Field / pick / edit plumbing for the extracted panels ──

  /** Toggle one metadata field (scope of fill/harmonize/manual editing). */
  const toggleField = useCallback((key: 'genre' | 'language' | 'year') => {
    setFields(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /** Genre pick in the manual-review dropdown (songId → main genre). */
  const handleManualPickChange = useCallback((songId: string, genre: string) => {
    setManualPicks(prev => ({ ...prev, [songId]: genre }));
  }, []);

  /** Draft edit in the manual-edit list (merged into the song's draft). */
  const handleManualEditChange = useCallback((songId: string, patch: Partial<ManualEditDraft>) => {
    setManualEdits(prev => ({ ...prev, [songId]: { ...prev[songId], ...patch } }));
  }, []);

  /** Skip ALL open manual-review songs (stops a running preview). */
  const handleSkipAllManual = useCallback(() => {
    stopManualPreview();
    setSkippedManualIds(prev => {
      const next = new Set(prev);
      for (const m of manualReview) next.add(m.songId);
      return next;
    });
    setManualPicks({});
  }, [manualReview, stopManualPreview]);

  /** Restore all session-skipped manual-review songs. */
  const handleRestoreSkippedManual = useCallback(() => {
    setSkippedManualIds(new Set());
  }, []);

  const ruleJob = useRuleHarmonizerState();
  const ruleRunning = ruleJob.status === 'running';
  /** Completion banner (user item 7): stays visible after the job finishes
   *  so it is IMMEDIATELY obvious the harmonization ran — dismissed
   *  manually, auto-reset whenever a new job starts. */
  const [ruleDoneDismissed, setRuleDoneDismissed] = useState(false);
  useEffect(() => {
    if (ruleJob.status === 'running') setRuleDoneDismissed(false);
  }, [ruleJob.status]);
  const ruleDoneVisible =
    (ruleJob.status === 'done' || ruleJob.status === 'aborted') &&
    ruleJob.total > 0 && !ruleDoneDismissed;

  /** Abort the background rule job (loading banner button). */
  const handleAbortRuleJob = useCallback(() => {
    ruleHarmonizer.abort();
  }, []);

  /** Null out fields the user deselected; in fill mode keep only empty fields. */
  const filterSuggestions = useCallback((
    list: HarmonizeSuggestion[],
  ): HarmonizeSuggestion[] => (
    list.map(s => ({
      ...s,
      suggestedGenre: fields.genre && (mode === 'harmonize' || !s.currentGenre) ? s.suggestedGenre : null,
      suggestedLanguage: fields.language && (mode === 'harmonize' || !s.currentLanguage) ? s.suggestedLanguage : null,
      suggestedYear: fields.year && (mode === 'harmonize' || s.currentYear == null) ? s.suggestedYear : null,
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

  // ── Run (AI modes) ──

  const handleRun = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setFileErrors(null);
    setLocalAppliedInfo(null);
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
        { onProgress: setProgress, signal: controller.signal },
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
    } catch (e) {
      if (!isMountedRef.current) return;
      if (controller.signal.aborted) return; // aborted fetch — not an error
      setError(e instanceof Error ? e.message : t('editor.aiAssistant.networkError'));
    } finally {
      abortRef.current = null;
      if (isMountedRef.current) {
        setIsLoading(false);
        setProgress(null);
        setRunStartedAt(null);
      }
    }
  }, [runSubset, writeTarget, startLyricsWarmup, filterSuggestions, t]);

  /** User-facing Run click: guards empty selection + big batches first. */
  const handleRunClick = useCallback(() => {
    if (runSubset.length === 0) {
      setError(scope === 'selection'
        ? t('editor.aiBatchSelectFirstDesc')
        : t('editor.studioNothingToFill'));
      return;
    }
    // Large batches need an explicit confirmation with the measured
    // worst-case estimate — prevents accidental multi-minute runs (user
    // request: no killer runs).
    if (runSubset.length > STUDIO_RECOMMENDED_BATCH) {
      setConfirmBigBatch(true);
      return;
    }
    void handleRun();
  }, [runSubset, scope, t, handleRun]);

  /** Cancel the running analysis job (orderly abort after the current chunk). */
  const handleAbortRun = useCallback(() => {
    abortRef.current?.abort();
  }, []);

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
    onApplied();
  }, [writeTarget, onApplied]);

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
      if (s.suggestedGenre && fieldPassesThreshold('genre', s, minConfidence)) {
        updates.genre = normalizeGenreName(s.suggestedGenre);
      }
      if (s.suggestedLanguage && fieldPassesThreshold('language', s, minConfidence)) {
        updates.language = normalizeLanguage(s.suggestedLanguage);
      }
      if (s.suggestedYear && s.suggestedYear !== s.currentYear) {
        updates.year = s.suggestedYear;
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
  }, [suggestions, minConfidence, writeTarget, onApplied]);

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
        updateSong(item.songId, item.field === 'language'
          ? { language: item.newLanguage }
          : { genre: item.newGenre });
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

  const applicableCount = countApplicableSongs(suggestions, minConfidence);
  const noFieldsSelected = !fields.genre && !fields.language && !fields.year;

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden" data-testid="metadata-studio">
      {/* ── Collapsible header ── */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
        aria-expanded={open}
        data-testid="metadata-studio-toggle"
      >
        {open
          ? <ChevronDown className="w-4 h-4 text-violet-300 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-violet-300 flex-shrink-0" />}
        <span className="text-sm font-semibold text-white/90">🎛️ {t('editor.studioTitle')}</span>
        {/* Job running while collapsed → obvious spinner so the user knows
            the analysis is still in progress (no silent waiting) */}
        {!open && (isLoading || ruleRunning) && (
          <span className="flex items-center gap-1.5 text-[10px] text-violet-300 font-mono whitespace-nowrap">
            <span className="inline-block w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            {ruleRunning
              ? `${ruleJob.done}/${ruleJob.total}`
              : progress
                ? `${progress.done}/${progress.total}`
                : '…'}
          </span>
        )}
        <span className="text-[10px] text-white/40 truncate hidden sm:inline">
          {t('editor.studioDesc')}
        </span>
        {/* Compact missing-stats — the core numbers at a glance */}
        <span className="ml-auto flex items-center gap-2 text-[10px] font-mono whitespace-nowrap flex-shrink-0">
          <span className="text-orange-300/80" title={t('editor.noGenre')}>🎸{missingCounts.genre}</span>
          <span className="text-purple-300/80" title={t('editor.noLanguage')}>🌐{missingCounts.language}</span>
          <span className="text-emerald-300/80" title={t('editor.noYear')}>📅{missingCounts.year}</span>
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
          {/* ── Scope / fields / mode / write target ── */}
          <StudioConfigBar
            scope={scope}
            onScopeChange={setScope}
            mode={mode}
            onModeChange={setMode}
            writeTarget={writeTarget}
            onWriteTargetChange={setWriteTarget}
            fields={fields}
            onToggleField={toggleField}
            songsCount={songs.length}
            selectionCount={selectedIds.size}
            t={t}
          />

          {/* ── Rule mode: plan info + preview + manual review list ── */}
          {mode === 'rule' && (
            <RuleModePanel
              rulePlan={rulePlan}
              ruleGenrePlanCount={ruleGenrePlanCount}
              ruleLanguagePlanCount={ruleLanguagePlanCount}
              ruleRunning={ruleRunning}
              manualReview={manualReview}
              skippedManualCount={skippedManualCount}
              manualPicks={manualPicks}
              onManualPickChange={handleManualPickChange}
              onSkipManualSong={skipManualSong}
              onSkipAllManual={handleSkipAllManual}
              onRestoreSkippedManual={handleRestoreSkippedManual}
              onApplyManualPicks={handleApplyManualPicks}
              manualApplyProgress={manualApplyProgress}
              songById={songById}
              previewSongId={manualPreviewId}
              onTogglePreview={toggleManualPreview}
              allGenres={allGenres}
              t={t}
            />
          )}

          {/* ── Manual edit mode (R5-1) ── */}
          {mode === 'manual' && (
            <ManualEditPanel
              scopeSongs={scopeSongs}
              fields={fields}
              edits={manualEdits}
              onEditChange={handleManualEditChange}
              getUpdates={manualUpdatesFor}
              changedCount={manualEditChangedCount}
              applyProgress={manualEditApplyProgress}
              onApply={handleApplyManualEdits}
              previewSongId={manualPreviewId}
              onTogglePreview={toggleManualPreview}
              allGenres={allGenres}
              t={t}
            />
          )}

          {/* ── Run / progress + batch-size hint ── */}
          <RunControls
            mode={mode}
            scope={scope}
            selectionCount={selectedIds.size}
            selectMode={selectMode}
            onToggleSelectMode={onToggleSelectMode}
            onClearSelection={onClearSelection}
            ruleRunning={ruleRunning}
            rulePlanCount={rulePlan.length}
            ruleJobDone={ruleJob.done}
            ruleJobTotal={ruleJob.total}
            applyProgress={applyProgress}
            isLoading={isLoading}
            noFieldsSelected={noFieldsSelected}
            runSubsetCount={runSubset.length}
            onRuleStart={handleRuleStart}
            onRunClick={handleRunClick}
            t={t}
          />

          {/* ── Loading banner (obvious loading screen while the pipeline
              runs — phase, progress bar, elapsed time, cancel) ── */}
          {(isLoading || ruleRunning) && (
            <LoadingBanner
              isLoading={isLoading}
              ruleRunning={ruleRunning}
              progress={progress}
              ruleJobDone={ruleJob.done}
              ruleJobTotal={ruleJob.total}
              runStartedAt={runStartedAt}
              elapsedSec={elapsedSec}
              onAbortRun={handleAbortRun}
              onAbortRuleJob={handleAbortRuleJob}
              t={t}
            />
          )}

          {/* ── Rule-harmonization completion banner (user item 7) ──
              Persistent green feedback after the background job finished,
              so a finished harmonization is recognizable at a glance. */}
          {ruleDoneVisible && (
            <RuleDoneBanner
              ruleJob={ruleJob}
              onDismiss={() => setRuleDoneDismissed(true)}
              t={t}
            />
          )}

          {/* ── Error / stats / progress / warm-up feedback ── */}
          <StatusFeedback
            error={error}
            stats={stats}
            localAppliedInfo={localAppliedInfo}
            applyProgress={applyProgress}
            fileErrors={fileErrors}
            warmupProgress={warmupProgress}
            onDismissLocalApplied={() => setLocalAppliedInfo(null)}
            onDismissFileErrors={() => setFileErrors(null)}
            t={t}
          />

          {/* ── Suggestion list ── */}
          {suggestions.length > 0 && (
            <SuggestionsPanel
              suggestions={suggestions}
              stats={stats}
              minConfidence={minConfidence}
              onMinConfidenceChange={setMinConfidence}
              applicableCount={applicableCount}
              applyProgress={applyProgress}
              onApplySingle={handleApplySingle}
              onDismiss={() => { setSuggestions([]); setStats(null); }}
              onRequestApplyAll={() => setShowWarning(true)}
              t={t}
            />
          )}

          {/* ── Apply-all warning (txt mode modifies source files) ── */}
          {showWarning && (
            <ApplyAllWarningDialog
              writeTarget={writeTarget}
              applicableCount={applicableCount}
              minConfidence={minConfidence}
              applyProgress={applyProgress}
              onApplyAll={handleApplyAll}
              onCancel={() => setShowWarning(false)}
              t={t}
            />
          )}

          {/* ── Big-batch confirmation (run with more songs than the measured
              recommendation → explicit time estimate before the job starts) ── */}
          {confirmBigBatch && (
            <BigBatchConfirmDialog
              runSubsetCount={runSubset.length}
              onConfirm={() => { setConfirmBigBatch(false); void handleRun(); }}
              onCancel={() => setConfirmBigBatch(false)}
              t={t}
            />
          )}
        </div>
      )}
    </div>
  );
}
