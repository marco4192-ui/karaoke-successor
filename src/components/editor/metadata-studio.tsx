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
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
  SuggestionRow,
  ConfidenceFilter,
  fieldPassesThreshold,
  countApplicableSongs,
} from '@/components/editor/harmonize-shared';
import {
  planRuleHarmonization,
  planRuleLanguageHarmonization,
  planManualGenreReview,
  ruleHarmonizer,
  RuleHarmonizeJobState,
} from '@/lib/editor/rule-harmonizer';
import { GENRES } from '@/lib/constants';
import { ensureSongUrls } from '@/lib/game/song-url-restore';
import { ChevronDown, ChevronRight, Play, SkipForward, Square } from 'lucide-react';

export type StudioScope = 'all' | 'selection';
export type StudioMode = 'fill' | 'harmonize' | 'rule' | 'manual';
export type StudioWriteTarget = 'txt' | 'local';

interface MetadataStudioProps {
  songs: Song[];
  /** Current multi-selection (select mode) — live counts in the scope toggle. */
  selectedIds: Set<string>;
  /** Expanded state is lifted so the floating select bar can open the studio. */
  open: boolean;
  onToggle: () => void;
  /** Incremented when opened from the select bar → re-focus the "selection" scope. */
  selectionFocusToken?: number;
  /** Select mode is live (song cards show checkboxes) — the Select-Songs
   *  button inside the studio toggles it (user request: the button belongs
   *  to the studio, placed next to Run). */
  selectMode: boolean;
  onToggleSelectMode: () => void;
  onApplied: () => void;
  t: (key: string) => string;
}

/**
 * Recommended batch size for the AI pipeline (user request: real measured
 * value, not a good-will number).
 *
 * Measured in THIS sandbox (full 12-song chunks):
 *  - factual lookup (MusicBrainz ~1 req/s + Deezer): ~65 s per 12 songs ≈ 5.4 s/song
 *  - LLM analysis:                                  ~8.5 s per 12 songs ≈ 0.7 s/song
 *  - txt apply:                                     ~0.1 s/song
 * ⇒ worst case ≈ 6 s per song (fill-missing with empty genre/year/language).
 * 20 songs ≈ 2 min worst case — the accepted waiting-time ceiling.
 */
export const STUDIO_RECOMMENDED_BATCH = 20;
/** Worst-case seconds per song for the estimated-time display. */
const SECONDS_PER_SONG_WORST_CASE = 6;

/** Subscribe to the singleton rule-harmonizer background job state. */
function useRuleHarmonizerState(): RuleHarmonizeJobState {
  const [state, setState] = useState<RuleHarmonizeJobState>(() => ruleHarmonizer.getState());
  useEffect(() => {
    const unsubscribe = ruleHarmonizer.subscribe(() => setState(ruleHarmonizer.getState()));
    setState(ruleHarmonizer.getState());
    return unsubscribe;
  }, []);
  return state;
}

export function MetadataStudio({
  songs,
  selectedIds,
  open,
  onToggle,
  selectionFocusToken = 0,
  selectMode,
  onToggleSelectMode,
  onApplied,
  t,
}: MetadataStudioProps) {
  // ── Configuration ──
  const [scope, setScope] = useState<StudioScope>('all');
  const [fields, setFields] = useState({ genre: true, language: true, year: true });
  const [mode, setMode] = useState<StudioMode>('fill');
  const [writeTarget, setWriteTarget] = useState<StudioWriteTarget>('txt');

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
  const [manualEdits, setManualEdits] = useState<Record<string, { genre?: string; language?: string; year?: string }>>({});
  const [manualEditApplyProgress, setManualEditApplyProgress] = useState<{ done: number; total: number } | null>(null);

  /** Full song lookup for the manual-review preview (items only carry
   *  title/artist/genre — playback needs the media URLs). */
  const songById = useMemo(() => {
    const map = new Map<string, Song>();
    for (const s of songs) map.set(s.id, s);
    return map;
  }, [songs]);

  // ── Manual-review audio preview ──
  // Lets the user LISTEN to a song before picking a main genre (user request:
  // a title alone doesn't reveal the genre of "Comedy"/"AI"/"Oldies" songs,
  // and researching each one externally isn't practical).
  const [manualPreviewId, setManualPreviewId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewStopTimerRef = useRef<number | null>(null);
  /** Generation counter — invalidates in-flight async previews after stop. */
  const previewGenRef = useRef(0);

  const stopManualPreview = useCallback(() => {
    previewGenRef.current++;
    if (previewStopTimerRef.current !== null) {
      window.clearTimeout(previewStopTimerRef.current);
      previewStopTimerRef.current = null;
    }
    const audio = previewAudioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load(); // release media resources
      previewAudioRef.current = null;
    }
    setManualPreviewId(null);
  }, []);

  /** Play / stop a 30-second preview of a manual-review song. Audio-URL
   *  first (restored via ensureSongUrls in Tauri), video container fallback
   *  (mp4/webm audio track plays fine in an <audio> element). */
  const toggleManualPreview = useCallback(async (songId: string) => {
    if (manualPreviewId === songId) {
      stopManualPreview();
      return; // toggle off
    }
    stopManualPreview();
    const generation = previewGenRef.current;
    const song = songById.get(songId);
    if (!song) return;

    let target = song;
    if (!target.audioUrl) {
      try { target = await ensureSongUrls(song); } catch { /* keep original */ }
    }
    if (generation !== previewGenRef.current) return; // cancelled meanwhile

    const src = target.audioUrl || target.videoUrl || target.videoBackground;
    if (!src) return;

    const audio = new Audio();
    audio.volume = 0.5;
    audio.src = src;
    previewAudioRef.current = audio;

    const startTime = target.previewStart && target.previewStart > 0
      ? target.previewStart
      : target.preview?.startTime
        ? target.preview.startTime / 1000
        : 0;

    const startPlay = () => {
      if (generation !== previewGenRef.current || previewAudioRef.current !== audio) return;
      try {
        if (startTime > 0 && Number.isFinite(audio.duration) && audio.duration >= startTime) {
          audio.currentTime = startTime;
        }
      } catch { /* seeking unsupported — play from 0 */ }
      audio.play().catch(() => {
        if (previewAudioRef.current === audio) stopManualPreview();
      });
    };
    audio.addEventListener('loadedmetadata', startPlay, { once: true });
    audio.addEventListener('ended', () => {
      if (previewAudioRef.current !== audio) return;
      previewAudioRef.current = null;
      if (previewStopTimerRef.current !== null) {
        window.clearTimeout(previewStopTimerRef.current);
        previewStopTimerRef.current = null;
      }
      setManualPreviewId(null);
    });

    setManualPreviewId(songId);

    // Auto-stop after the preview window (same default as the library preview)
    const durationSec = target.previewDuration && target.previewDuration > 0
      ? target.previewDuration
      : target.preview?.duration
        ? target.preview.duration / 1000
        : 30;
    previewStopTimerRef.current = window.setTimeout(() => stopManualPreview(), durationSec * 1000);
  }, [manualPreviewId, songById, stopManualPreview]);

  // Release audio resources when the studio unmounts
  useEffect(() => () => stopManualPreview(), [stopManualPreview]);

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

  // ── Small UI atoms ──
  const segButton = (
    active: boolean, onClick: () => void, label: React.ReactNode, testId: string, color = 'violet',
  ) => (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
        active
          ? color === 'violet'
            ? 'bg-violet-500/20 border-violet-500/60 text-violet-200'
            : color === 'cyan'
              ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200'
              : 'bg-amber-500/20 border-amber-500/60 text-amber-200'
          : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80'
      }`}
    >
      {label}
    </button>
  );

  const fieldToggle = (key: 'genre' | 'language' | 'year', icon: string) => (
    <button
      onClick={() => setFields(prev => ({ ...prev, [key]: !prev[key] }))}
      aria-pressed={fields[key]}
      data-testid={`studio-field-${key}`}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
        fields[key]
          ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200'
          : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
      }`}
    >
      <span>{icon}</span>
      <span>{t(`editor.songInfoTab.${key}`)}</span>
      {fields[key]
        ? <span className="text-emerald-400">✓</span>
        : <span className="text-white/30">○</span>}
    </button>
  );

  const applicableCount = countApplicableSongs(suggestions, minConfidence);
  const noFieldsSelected = !fields.genre && !fields.language && !fields.year;
  const rulePreview = rulePlan.slice(0, 8);

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
          {/* ── Scope ── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40 w-16 flex-shrink-0">{t('editor.studioScope')}</span>
            {segButton(scope === 'all', () => setScope('all'),
              t('editor.studioScopeAll').replace('{n}', String(songs.length)), 'studio-scope-all')}
            {segButton(scope === 'selection', () => setScope('selection'),
              t('editor.studioScopeSelection').replace('{n}', String(selectedIds.size)), 'studio-scope-selection')}
          </div>

          {/* ── Fields ── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40 w-16 flex-shrink-0">{t('editor.studioFields')}</span>
            {fieldToggle('genre', '🎸')}
            {fieldToggle('language', '🌐')}
            {fieldToggle('year', '📅')}
          </div>

          {/* ── Mode ── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40 w-16 flex-shrink-0">{t('editor.studioMode')}</span>
            {segButton(mode === 'fill', () => setMode('fill'), t('editor.studioModeFill'), 'studio-mode-fill')}
            {segButton(mode === 'harmonize', () => setMode('harmonize'), t('editor.studioModeHarmonize'), 'studio-mode-harmonize')}
            {segButton(mode === 'rule', () => setMode('rule'), t('editor.studioModeRule'), 'studio-mode-rule', 'cyan')}
            {segButton(mode === 'manual', () => setMode('manual'), `✏️ ${t('editor.studioModeManual')}`, 'studio-mode-manual', 'amber')}
          </div>

          {/* ── Write target ── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40 w-16 flex-shrink-0">{t('editor.studioWriteTarget')}</span>
            {segButton(writeTarget === 'txt', () => setWriteTarget('txt'), '📄 ' + t('editor.studioWriteTxt'), 'studio-target-txt', 'cyan')}
            {segButton(writeTarget === 'local', () => setWriteTarget('local'), '💾 ' + t('editor.studioWriteLocal'), 'studio-target-local', 'amber')}
          </div>
          {writeTarget === 'local' && (
            <p className="text-[10px] text-amber-300/70 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 leading-relaxed" data-testid="studio-local-hint">
              ⚠️ {t('editor.studioWriteLocalHint')}
            </p>
          )}

          {/* ── Mode-specific info ── */}
          {mode === 'rule' && !ruleRunning && rulePlan.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-cyan-300/80 font-medium">
                {t('editor.ruleHarmonizeCount').replace('{count}', String(rulePlan.length))}
                <span className="text-white/40 font-normal">
                  {' '}(🎸 {ruleGenrePlanCount} · 🌐 {ruleLanguagePlanCount})
                </span>
              </p>
              {/* Non-harmonizable remainder (user item 7): songs the rules
                  can NEVER fix (pseudo-genres) — always visible so the user
                  immediately sees what stays untouched. */}
              {manualReview.length > 0 && (
                <p className="text-[10px] text-amber-300/80">
                  ⚠️ {t('editor.ruleHarmonizeNotFixable').replace('{count}', String(manualReview.length))}
                </p>
              )}
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 text-[10px] font-mono" data-testid="studio-rule-preview">
                {rulePreview.map(item => (
                  <div key={`${item.field}-${item.songId}`} className="flex items-center gap-1.5 text-white/50">
                    <span className="flex-shrink-0" title={item.field === 'language' ? 'Sprache' : 'Genre'}>
                      {item.field === 'language' ? '🌐' : '🎸'}
                    </span>
                    <span className="truncate flex-1" title={`${item.artist} — ${item.title}`}>
                      {item.field === 'language' ? item.currentLanguage : item.currentGenre}
                    </span>
                    <span className="text-white/30">→</span>
                    <span className="text-cyan-300 truncate">
                      {item.field === 'language' ? item.newLanguage : item.newGenre}
                    </span>
                  </div>
                ))}
                {rulePlan.length > rulePreview.length && (
                  <p className="text-white/30 pt-1">+{rulePlan.length - rulePreview.length} …</p>
                )}
              </div>
            </div>
          )}
          {mode === 'rule' && rulePlan.length === 0 && !ruleRunning && (
            <div className="space-y-1">
              <p className="text-[11px] text-white/40">✅ {t('editor.ruleHarmonizeNothing')}</p>
              {manualReview.length > 0 && (
                <p className="text-[10px] text-amber-300/80">
                  ⚠️ {t('editor.ruleHarmonizeNotFixable').replace('{count}', String(manualReview.length))}
                </p>
              )}
            </div>
          )}

          {/* ── Manual genre correction list (rule mode) ──
              Songs with pseudo-genres ("AI", "Oldies", "A Cappella", "TV"…)
              that no logical rule can map. The user picks the correct main
              genre per song from the 23-genre dropdown, then applies — or
              skips them (kept as-is). Rendered as long as there are open
              items OR skipped ones (so the restore link stays reachable
              even after "Skip all"). */}
          {mode === 'rule' && (manualReview.length > 0 || skippedManualCount > 0) && (
            <div className="space-y-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3" data-testid="studio-manual-review">
              {manualReview.length > 0 && (<>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-amber-300 font-medium">
                  ✋ {t('editor.manualReviewCount').replace('{count}', String(manualReview.length))}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 tabular-nums">
                    {Object.keys(manualPicks).filter(k => manualReview.some(m => m.songId === k)).length}/{manualReview.length}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={manualReview.length === 0 || manualApplyProgress !== null}
                    onClick={() => {
                      stopManualPreview();
                      setSkippedManualIds(prev => {
                        const next = new Set(prev);
                        for (const m of manualReview) next.add(m.songId);
                        return next;
                      });
                      setManualPicks({});
                    }}
                    className="h-7 px-3 border-white/20 text-white/70 hover:bg-white/10 hover:text-white text-[11px]"
                    title={t('editor.manualReviewSkipAllHint')}
                    data-testid="studio-manual-skip-all"
                  >
                    ⏭️ {t('editor.manualReviewSkipAll')}
                  </Button>
                  <Button
                    size="sm"
                    disabled={manualApplyProgress !== null || Object.values(manualPicks).length === 0}
                    onClick={handleApplyManualPicks}
                    className="h-7 px-3 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold"
                    data-testid="studio-manual-apply"
                  >
                    {manualApplyProgress
                      ? `${manualApplyProgress.done}/${manualApplyProgress.total}`
                      : t('editor.manualReviewApply')}
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed">{t('editor.manualReviewDesc')}</p>
              </>)}
              {skippedManualCount > 0 && (
                <p className="text-[10px] text-white/35 flex items-center gap-2 flex-wrap" data-testid="studio-manual-skipped-info">
                  <span>⏭️ {t('editor.manualReviewSkippedInfo').replace('{count}', String(skippedManualCount))}</span>
                  <button
                    onClick={() => setSkippedManualIds(new Set())}
                    className="underline underline-offset-2 hover:text-white/70 text-white/50 transition-colors"
                    data-testid="studio-manual-restore"
                  >
                    {t('editor.manualReviewRestore')}
                  </button>
                </p>
              )}
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1" data-testid="studio-manual-review-list">
                {manualReview.map(item => {
                  const previewSong = songById.get(item.songId);
                  const hasAudio = !!(previewSong && (
                    previewSong.audioUrl || previewSong.relativeAudioPath || previewSong.storedMedia
                    || previewSong.videoUrl || previewSong.videoBackground || previewSong.relativeVideoPath
                  ));
                  const isPlaying = manualPreviewId === item.songId;
                  return (
                    <div
                      key={item.songId}
                      className={`flex flex-wrap sm:flex-nowrap items-center gap-2 bg-black/30 border rounded-lg px-2.5 py-1.5 transition-colors ${
                        isPlaying ? 'border-cyan-400/50 bg-cyan-500/[0.06]' : 'border-white/10'
                      }`}
                    >
                      {/* Listen-before-you-assign preview (user feedback point 1) */}
                      <button
                        onClick={() => void toggleManualPreview(item.songId)}
                        disabled={!hasAudio}
                        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                          isPlaying
                            ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-300'
                            : hasAudio
                              ? 'bg-white/5 border-white/15 text-white/60 hover:bg-cyan-500/15 hover:text-cyan-300 hover:border-cyan-400/40'
                              : 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed'
                        }`}
                        title={!hasAudio
                          ? t('editor.manualReviewNoAudio')
                          : isPlaying
                            ? t('editor.manualReviewStopPreview')
                            : t('editor.manualReviewPlay')}
                        aria-label={`${isPlaying ? t('editor.manualReviewStopPreview') : t('editor.manualReviewPlay')}: ${item.title}`}
                        data-testid={`studio-manual-play-${item.songId}`}
                      >
                        {isPlaying
                          ? <Square className="w-3 h-3" />
                          : <Play className="w-3 h-3 ml-0.5" />}
                      </button>
                      {/* Title + Artist */}
                      <div className="flex-1 min-w-[140px] sm:min-w-[200px]">
                        <p className="text-[11px] text-white/85 font-medium truncate" title={item.title}>{item.title}</p>
                        <p className="text-[10px] text-white/40 truncate" title={item.artist}>{item.artist}</p>
                      </div>
                      {/* Current (pseudo) genre */}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 border border-white/15 text-amber-200/90 whitespace-nowrap">
                        {item.currentGenre}
                      </span>
                      <span className="text-white/30 text-[10px]">→</span>
                      {/* Main genre dropdown (23 genres) */}
                      <select
                        value={manualPicks[item.songId] ?? ''}
                        onChange={e => setManualPicks(prev => ({ ...prev, [item.songId]: e.target.value }))}
                        className="bg-gray-800 border border-white/20 rounded-lg px-2 py-1 text-[11px] text-white focus:border-amber-500 focus:outline-none min-w-[110px]"
                        aria-label={`${t('editor.manualReviewApply')}: ${item.title}`}
                        data-testid={`studio-manual-select-${item.songId}`}
                      >
                        <option value="">{t('editor.manualReviewChoose')}</option>
                        {GENRES.map(g => (
                          <option key={g} value={g} className="bg-gray-800 text-white">{g}</option>
                        ))}
                      </select>
                      {/* Skip — keep this song's genre as-is (user feedback point 2) */}
                      <button
                        onClick={() => skipManualSong(item.songId)}
                        className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                        title={t('editor.manualReviewSkip')}
                        aria-label={`${t('editor.manualReviewSkip')}: ${item.title}`}
                        data-testid={`studio-manual-skip-${item.songId}`}
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Manual edit mode (R5-1) ──
              Direct per-song editing for ALL songs in scope: the current
              value + an editor side by side for every ACTIVE field (genre
              dropdown, language/year free text). Changed inputs get an amber
              ring; the Apply button in the header replaces the Run button. */}
          {mode === 'manual' && (
            <div className="space-y-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3" data-testid="manual-edit-panel">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[11px] text-amber-300 font-medium">
                  ✏️ {t('editor.manualEditChangedCount')
                    .replace('{changed}', String(manualEditChangedCount))
                    .replace('{total}', String(scopeSongs.length))}
                </p>
                <Button
                  size="sm"
                  disabled={manualEditChangedCount === 0 || manualEditApplyProgress !== null}
                  onClick={handleApplyManualEdits}
                  title={manualEditChangedCount === 0 ? t('editor.manualEditNoChanges') : undefined}
                  className="h-7 px-3 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold"
                  data-testid="manual-edit-apply"
                >
                  {manualEditApplyProgress
                    ? `${manualEditApplyProgress.done}/${manualEditApplyProgress.total}`
                    : t('editor.manualReviewApply')}
                </Button>
              </div>
              <p className="text-[10px] text-white/40 leading-relaxed">{t('editor.manualEditHint')}</p>
              {scopeSongs.length === 0 ? (
                <p className="text-[10px] text-white/40" data-testid="manual-edit-empty">
                  ☑️ {t('editor.manualEditEmptyScope')}
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1" data-testid="manual-edit-list">
                  {scopeSongs.map(song => {
                    const edit = manualEdits[song.id];
                    const updates = manualUpdatesFor(song);
                    const changedFields =
                      (updates.genre !== undefined ? 1 : 0) +
                      (updates.language !== undefined ? 1 : 0) +
                      (updates.year !== undefined ? 1 : 0);
                    return (
                      <div
                        key={song.id}
                        data-testid={`manual-edit-row-${song.id}`}
                        className="flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-1.5 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5"
                      >
                        {/* Title + Artist */}
                        <div className="flex-1 min-w-[130px] sm:min-w-[180px]">
                          <p className="text-[11px] text-white/85 font-medium truncate" title={song.title}>{song.title}</p>
                          <p className="text-[10px] text-white/40 truncate" title={song.artist}>{song.artist}</p>
                        </div>

                        {/* Genre: current value + genre dropdown (23 genres) */}
                        {fields.genre && (<>
                          <span
                            title={t('editor.manualEditCurrent')}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 border whitespace-nowrap ${
                              song.genre ? 'border-white/15 text-amber-200/90' : 'border-white/10 text-white/30 italic'
                            }`}
                          >
                            {song.genre || '—'}
                          </span>
                          <span className="text-white/30 text-[10px]">→</span>
                          <select
                            value={edit?.genre ?? ''}
                            onChange={e => setManualEdits(prev => ({
                              ...prev,
                              [song.id]: { ...prev[song.id], genre: e.target.value },
                            }))}
                            className={`bg-gray-800 border rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none min-w-[110px] ${
                              updates.genre !== undefined
                                ? 'border-amber-500/70 ring-1 ring-amber-500/40'
                                : 'border-white/20 focus:border-amber-500'
                            }`}
                            aria-label={`${t('editor.songInfoTab.genre')}: ${song.title}`}
                            data-testid={`manual-edit-genre-${song.id}`}
                          >
                            <option value="">{t('editor.manualReviewChoose')}</option>
                            {GENRES.map(g => (
                              <option key={g} value={g} className="bg-gray-800 text-white">{g}</option>
                            ))}
                          </select>
                        </>)}

                        {/* Language: current value + free text input */}
                        {fields.language && (<>
                          <span
                            title={t('editor.manualEditCurrent')}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 border whitespace-nowrap ${
                              song.language ? 'border-white/15 text-purple-200/90' : 'border-white/10 text-white/30 italic'
                            }`}
                          >
                            {song.language || '—'}
                          </span>
                          <span className="text-white/30 text-[10px]">→</span>
                          <input
                            type="text"
                            value={edit?.language ?? ''}
                            onChange={e => setManualEdits(prev => ({
                              ...prev,
                              [song.id]: { ...prev[song.id], language: e.target.value },
                            }))}
                            placeholder={t('editor.songInfoTab.language')}
                            className={`bg-gray-800 border rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none w-28 ${
                              updates.language !== undefined
                                ? 'border-amber-500/70 ring-1 ring-amber-500/40'
                                : 'border-white/20 focus:border-amber-500'
                            }`}
                            aria-label={`${t('editor.songInfoTab.language')}: ${song.title}`}
                            data-testid={`manual-edit-language-${song.id}`}
                          />
                        </>)}

                        {/* Year: current value + numeric input (4 digits) */}
                        {fields.year && (<>
                          <span
                            title={t('editor.manualEditCurrent')}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 border whitespace-nowrap ${
                              song.year ? 'border-white/15 text-emerald-200/90' : 'border-white/10 text-white/30 italic'
                            }`}
                          >
                            {song.year || '—'}
                          </span>
                          <span className="text-white/30 text-[10px]">→</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={edit?.year ?? ''}
                            onChange={e => setManualEdits(prev => ({
                              ...prev,
                              [song.id]: { ...prev[song.id], year: e.target.value.replace(/[^0-9]/g, '') },
                            }))}
                            placeholder={t('editor.songInfoTab.yearPlaceholder')}
                            className={`bg-gray-800 border rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none w-16 text-center ${
                              updates.year !== undefined
                                ? 'border-amber-500/70 ring-1 ring-amber-500/40'
                                : 'border-white/20 focus:border-amber-500'
                            }`}
                            aria-label={`${t('editor.songInfoTab.year')}: ${song.title}`}
                            data-testid={`manual-edit-year-${song.id}`}
                          />
                        </>)}

                        {/* Changed-field count for this row (subtle amber) */}
                        {changedFields > 0 && (
                          <span className="text-[10px] text-amber-300 font-mono whitespace-nowrap">
                            ✏️ {changedFields}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Run / progress ── */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Select-Songs button — moved INTO the studio (user request:
                it only serves the studio, so it lives next to Run). */}
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleSelectMode}
              className={selectMode
                ? 'bg-violet-500 hover:bg-violet-400 border-violet-500 text-white font-semibold text-xs'
                : 'border-violet-400/40 text-violet-300 hover:bg-violet-500/15 hover:border-violet-300 text-xs'}
              data-testid="studio-select-songs"
            >
              {selectMode
                ? `✕ ${t('editor.exitSelectMode')}`
                : `☑️ ${t('editor.enterSelectMode')}${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
            </Button>

            {/* Manual mode (R5-1): no Run button — the Apply button inside
                the manual edit list replaces it (direct editing, no AI job). */}
            {mode !== 'manual' && (mode === 'rule' ? (
              <Button
                size="sm"
                onClick={handleRuleStart}
                disabled={ruleRunning || rulePlan.length === 0 || !!applyProgress || (scope === 'selection' && selectedIds.size === 0)}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs"
                data-testid="studio-rule-start"
              >
                🧹 {applyProgress
                  ? `${applyProgress.done}/${applyProgress.total}`
                  : ruleRunning
                    ? `${ruleJob.done}/${ruleJob.total}`
                    : t('editor.ruleHarmonizeStart')}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleRunClick}
                disabled={isLoading || noFieldsSelected || selectedIds.size === 0}
                title={selectedIds.size === 0 ? t('editor.studioRunNeedsSelection') : undefined}
                className="bg-violet-500 hover:bg-violet-400 text-white font-semibold text-xs"
                data-testid="studio-run"
              >
                {isLoading ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                ) : null}
                {t('editor.studioStart')}
                {!isLoading && mode === 'fill' && runSubset.length > 0 && selectedIds.size > 0 && (
                  <span className="opacity-70">({runSubset.length})</span>
                )}
              </Button>
            ))}

            {/* No selection yet → explicit hint next to the greyed Run.
                Rule mode with scope 'all' needs NO selection (the plan covers
                every song) — showing the hint there made the disabled Run
                feel like "nothing happens" (user item 7). */}
            {mode !== 'manual' && selectedIds.size === 0 && (mode !== 'rule' || scope === 'selection') && (
              <p className="text-[11px] text-amber-300/80">☑️ {t('editor.studioRunNeedsSelection')}</p>
            )}
            {noFieldsSelected && (
              <p className="text-[11px] text-amber-300/80">{t('editor.studioNoFields')}</p>
            )}
          </div>

          {/* ── Measured batch-size recommendation (real timings, see
              STUDIO_RECOMMENDED_BATCH above) ── */}
          {mode !== 'rule' && mode !== 'manual' && (
            <p className="text-[10px] text-white/40 leading-relaxed" data-testid="studio-batch-hint">
              💡 {t('editor.studioBatchHint').replace('{n}', String(STUDIO_RECOMMENDED_BATCH))}
            </p>
          )}

          {/* ── Loading banner (obvious loading screen while the pipeline
              runs — phase, progress bar, elapsed time, cancel) ── */}
          {(isLoading || ruleRunning) && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/[0.07] p-3 space-y-2.5" data-testid="studio-loading-banner">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-block w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span className="text-xs font-semibold text-violet-200">
                  {ruleRunning
                    ? t('editor.ruleHarmonizeStart')
                    : progress
                      ? t(progress.phase === 'lookup' ? 'editor.studioPhaseLookup' : 'editor.studioPhaseAi')
                      : t('editor.studioPhaseCache')}
                </span>
                <span className="ml-auto font-mono text-[11px] text-white/50 tabular-nums">
                  {ruleRunning
                    ? `${ruleJob.done}/${ruleJob.total}`
                    : progress
                      ? `${progress.done}/${progress.total}`
                      : '…'}
                  {isLoading && runStartedAt !== null && ` · ${elapsedSec}s`}
                </span>
                {isLoading && (
                  <button
                    onClick={handleAbortRun}
                    className="text-[10px] px-2 py-1 rounded-lg border border-red-400/40 text-red-300 hover:bg-red-500/10 transition-colors whitespace-nowrap"
                    data-testid="studio-cancel-job"
                  >
                    {t('editor.studioCancelJob')}
                  </button>
                )}
                {ruleRunning && (
                  <button
                    onClick={() => ruleHarmonizer.abort()}
                    className="text-[10px] px-2 py-1 rounded-lg border border-red-400/40 text-red-300 hover:bg-red-500/10 transition-colors whitespace-nowrap"
                  >
                    {t('editor.ruleHarmonizeAbort')}
                  </button>
                )}
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-300"
                  style={{
                    width: ruleRunning
                      ? `${ruleJob.total > 0 ? Math.round((ruleJob.done / ruleJob.total) * 100) : 0}%`
                      : progress && progress.total > 0
                        ? `${Math.round((progress.done / progress.total) * 100)}%`
                        : '8%',
                  }}
                />
              </div>
              <p className="text-[10px] text-white/40">
                {t('editor.studioLoadingHint')}
              </p>
            </div>
          )}

          {/* ── Rule-harmonization completion banner (user item 7) ──
              Persistent green feedback after the background job finished,
              so a finished harmonization is recognizable at a glance. */}
          {ruleDoneVisible && (
            <div
              className={`flex items-center gap-2 rounded-lg p-2 border ${
                ruleJob.status === 'done'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}
              data-testid="studio-rule-done"
            >
              <span className="text-sm leading-none">{ruleJob.status === 'done' ? '✅' : '⏹️'}</span>
              <p className={`text-[10px] flex-1 ${ruleJob.status === 'done' ? 'text-emerald-200/90' : 'text-amber-200/90'}`}>
                {ruleJob.status === 'done'
                  ? t('editor.ruleHarmonizeDone')
                      .replace('{done}', String(ruleJob.done))
                      .replace('{errors}', String(ruleJob.errors))
                  : t('editor.ruleHarmonizeAborted')
                      .replace('{done}', String(ruleJob.done))
                      .replace('{total}', String(ruleJob.total))}
              </p>
              <button
                onClick={() => setRuleDoneDismissed(true)}
                className="text-white/40 hover:text-white/80 text-xs"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* ── Error / stats / local-applied feedback ── */}
          {error && (
            <p className="text-xs text-red-400" data-testid="studio-error">{error}</p>
          )}
          {stats && stats.notAnalyzed > 0 && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2" data-testid="studio-not-analyzed">
              <span className="text-sm leading-none">⚠️</span>
              <p className="text-[10px] text-amber-200/90 flex-1">
                {t('editor.aiBatchNotAnalyzed').replace('{count}', String(stats.notAnalyzed))}
              </p>
            </div>
          )}
          {localAppliedInfo !== null && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2" data-testid="studio-local-applied">
              <span className="text-sm leading-none">💾</span>
              <p className="text-[10px] text-emerald-200/90 flex-1">
                {t('editor.studioLocalApplied').replace('{n}', String(localAppliedInfo))}
              </p>
              <button onClick={() => setLocalAppliedInfo(null)} className="text-white/40 hover:text-white/80 text-xs" aria-label="Dismiss">✕</button>
            </div>
          )}

          {/* ── txt persistence progress + file errors ── */}
          {applyProgress && (
            <div className="flex items-center gap-2 text-[11px] text-white/60">
              <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span className="font-mono tabular-nums">
                {t('editor.aiBatchSavingFiles')
                  .replace('{current}', String(applyProgress.done))
                  .replace('{total}', String(applyProgress.total))}
              </span>
            </div>
          )}
          {fileErrors !== null && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2" data-testid="studio-file-error">
              <span className="text-sm leading-none">⚠️</span>
              <p className="text-[10px] text-amber-200/90 flex-1">
                {t('editor.aiBatchFileErrors').replace('{count}', String(fileErrors))}
              </p>
              <button onClick={() => setFileErrors(null)} className="text-white/40 hover:text-white/80 text-xs" aria-label="Dismiss">✕</button>
            </div>
          )}

          {/* ── Lyrics warm-up indicator (txt mode) ── */}
          {warmupProgress && (
            <div className="flex items-center gap-2 text-[11px] text-white/50">
              <span>📖</span>
              <span className="font-mono tabular-nums">
                {t('editor.aiBatchWarmup')
                  .replace('{current}', String(warmupProgress.done))
                  .replace('{total}', String(warmupProgress.total))}
              </span>
            </div>
          )}

          {/* ── Suggestion list ── */}
          {suggestions.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-white/10">
                <ConfidenceFilter value={minConfidence} onChange={setMinConfidence} t={t} />
                {stats && (
                  <p className="text-[10px] text-white/40 truncate">
                    {t('editor.aiBatchStatsLine')
                      .replace('{cache}', String(stats.fromCache))
                      .replace('{facts}', String(stats.factualHits))
                      .replace('{ai}', String(stats.total - stats.fromCache))}
                  </p>
                )}
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1" data-testid="studio-suggestions">
                {suggestions.map(s => (
                  <SuggestionRow
                    key={s.songId}
                    suggestion={s}
                    minConfidence={minConfidence}
                    onApply={handleApplySingle}
                  />
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setSuggestions([]); setStats(null); }}
                  className="flex-1 border-white/20 text-white/80 hover:bg-white/10 text-xs"
                  data-testid="studio-dismiss"
                >
                  {t('editor.aiBatchClose')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowWarning(true)}
                  disabled={applicableCount === 0 || !!applyProgress}
                  className="flex-1 bg-green-500 hover:bg-green-400 text-black font-semibold text-xs disabled:opacity-40"
                  data-testid="studio-apply-all"
                >
                  {t('editor.aiApplyAll')} ({applicableCount}
                  {applicableCount !== suggestions.length ? `/${suggestions.length}` : ''})
                </Button>
              </div>
            </>
          )}

          {/* ── Apply-all warning (txt mode modifies source files) ── */}
          {showWarning && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
              <div className="bg-gray-900 border border-white/20 rounded-xl p-5 max-w-md w-full mx-4 space-y-4 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">⚠️</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{t('editor.aiHarmonizeWarnTitle')}</h3>
                    <p className="text-white/60 text-xs mt-0.5">{t('editor.aiHarmonizeWarnSubtitle')}</p>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-white/70 space-y-2">
                  {writeTarget === 'txt' ? (
                    <>
                      <p>{t('editor.aiHarmonizeWarn1')}</p>
                      <ul className="list-disc list-inside space-y-1 text-white/60">
                        <li>{t('editor.aiHarmonizeWarn2')}</li>
                        <li>{t('editor.aiHarmonizeWarn3')}</li>
                        <li>{t('editor.aiHarmonizeWarn4')}</li>
                      </ul>
                    </>
                  ) : (
                    <p>{t('editor.studioWriteLocalWarn').replace('{count}', String(applicableCount))}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span className="px-2 py-0.5 rounded bg-white/10 font-mono">{applicableCount}</span>
                  <span>{t('editor.aiHarmonizeWarnCount')}</span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-white/50 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
                  <span>🛡️</span>
                  <span>{t('editor.aiBatchThresholdNote').replace('{value}', String(minConfidence))}</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setShowWarning(false)}
                    disabled={!!applyProgress}
                    className="flex-1 border-white/20 text-white/80 hover:bg-white/10 text-xs"
                  >
                    {t('editor.aiHarmonizeWarnCancel')}
                  </Button>
                  <Button
                    onClick={handleApplyAll}
                    disabled={!!applyProgress}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs"
                  >
                    {applyProgress
                      ? `${applyProgress.done}/${applyProgress.total}`
                      : t('editor.aiHarmonizeWarnConfirm')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Big-batch confirmation (run with more songs than the measured
              recommendation → explicit time estimate before the job starts) ── */}
          {confirmBigBatch && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
              <div className="bg-gray-900 border border-white/20 rounded-xl p-5 max-w-md w-full mx-4 space-y-4 shadow-2xl" data-testid="studio-big-batch-dialog">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">⏳</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{t('editor.studioBigBatchTitle')}</h3>
                    <p className="text-white/60 text-xs mt-0.5">
                      {t('editor.studioBigBatchDesc')
                        .replace('{n}', String(runSubset.length))
                        .replace('{min}', String(Math.max(1, Math.ceil(runSubset.length * SECONDS_PER_SONG_WORST_CASE / 60))))}
                    </p>
                  </div>
                </div>

                <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 text-[11px] text-white/60 space-y-1.5">
                  <p>{t('editor.studioBatchHint').replace('{n}', String(STUDIO_RECOMMENDED_BATCH))}</p>
                  <p className="text-white/40">{t('editor.studioBigBatchTip')}</p>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmBigBatch(false)}
                    className="flex-1 border-white/20 text-white/80 hover:bg-white/10 text-xs"
                  >
                    {t('editor.aiHarmonizeWarnCancel')}
                  </Button>
                  <Button
                    onClick={() => { setConfirmBigBatch(false); void handleRun(); }}
                    className="flex-1 bg-violet-500 hover:bg-violet-400 text-white font-semibold text-xs"
                    data-testid="studio-big-batch-confirm"
                  >
                    {t('editor.studioBigBatchConfirm')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
