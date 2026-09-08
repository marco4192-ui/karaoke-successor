'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAllSongs, addSong, updateSong, getSongByIdWithLyrics, clearSongCache } from '@/lib/game/song-library';
import { persistSongMetadataToTxt } from '@/lib/editor/persist-metadata';
import { normalizeLanguage, normalizeGenreName } from '@/lib/parsers/meta-normalizer';
import { StorageKeys, getString } from '@/lib/storage';
import { KaraokeEditor } from '@/components/editor/karaoke-editor';
import { NewSongDialog } from '@/components/editor/new-song-dialog';
import { GenreLanguageEditor } from '@/components/editor/genre-language-editor';
import { AiHarmonizeCard } from '@/components/editor/ai-harmonize-card';
import { Song } from '@/types/game';
import { fuzzyMatch } from '@/lib/fuzzy-search';
import { useTranslation } from '@/lib/i18n/translations';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';
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

export function EditorScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [songs, setSongs] = useState<Song[]>(() => getAllSongs());
  const refreshSongs = useCallback(async () => {
    // Invalidate cache and try Tauri rescan for fresh data from filesystem
    clearSongCache();
    try {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const { scanSongsFolderTauri } = await import('@/lib/tauri-file-storage');
        // Use the REAL storage key ('karaoke-songs-folder') — the old keys
        // ('songsFolder' / 'karaoke_songs_folder') never matched, so the rescan
        // silently did nothing.
        const songsFolder = getString(StorageKeys.SONGS_FOLDER)
          || localStorage.getItem('songsFolder')
          || localStorage.getItem('karaoke_songs_folder');
        if (songsFolder) {
          await scanSongsFolderTauri(songsFolder);
        }
      }
    } catch {
      // Non-Tauri environment or scan failed — just use cleared cache
    }
    setSongs(getAllSongs());
  }, []);
  const [filterMode, setFilterMode] = useState<'all' | 'no-genre' | 'no-language' | 'no-year' | 'incomplete'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMetadataPanel, setShowMetadataPanel] = useState(false); // Collapsible metadata panel
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false); // Loading state for lyrics
  const [showNewSongDialog, setShowNewSongDialog] = useState(false); // New song creation dialog
  const [visibleCount, setVisibleCount] = useState(50); // Lazy loading for song grid

  // ── Multi-select state ──
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchSuggestions, setBatchSuggestions] = useState<HarmonizeSuggestion[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showBatchWarning, setShowBatchWarning] = useState(false);
  const batchAbortRef = useRef(false);
  const lastProcessedSongsRef = useRef<Song[]>([]);
  // Progress + file-error feedback for the batch apply (txt persistence)
  const [batchApplyProgress, setBatchApplyProgress] = useState<{ done: number; total: number } | null>(null);
  const [batchFileErrors, setBatchFileErrors] = useState<number | null>(null);

  // R3/R6 pipeline progress (factual lookup + LLM chunks) + stats
  const [batchProgress, setBatchProgress] = useState<HarmonizeProgress | null>(null);
  const [batchStats, setBatchStats] = useState<HarmonizeStats | null>(null);
  // R4: minimum confidence threshold for apply-all (AI guesses only)
  const [minConfidence, setMinConfidence] = useState(70);
  // R1: lyrics warm-up (pre-loads lyrics so the apply loop never blocks on
  // per-song file reads)
  const [warmupProgress, setWarmupProgress] = useState<{ done: number; total: number } | null>(null);
  const warmupPromiseRef = useRef<Promise<void> | null>(null);

  // Abort in-flight batch operations when the screen unmounts
  useEffect(() => {
    return () => { batchAbortRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Restore cover URLs for Tauri ──
  // On Tauri, song.coverImage may be a relative path (e.g. "Covers/song.jpg") that
  // doesn't resolve in the browser. ensureSongUrls() converts these to proper
  // asset://localhost/ URLs. On browser, ensureSongUrls() returns immediately.
  useEffect(() => {
    if (songs.length === 0) return;
    if (songs === lastProcessedSongsRef.current) return;
    lastProcessedSongsRef.current = songs;
    let cancelled = false;

    const restoreCovers = async () => {
      try {
        const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
        const BATCH_SIZE = 20;
        const updates = new Map<string, Song>();

        // DO-NOT-CHANGE: Only restore cover URLs for the first 100 songs.
        // Processing ALL songs (even invisible ones) causes thousands of filesystem
        // I/O calls on Tauri that freeze the editor UI for several seconds.
        // 100 songs is enough for the initial viewport + a generous scroll buffer.
        const songsToProcess = songs.slice(0, 100);
        for (let i = 0; i < songsToProcess.length; i += BATCH_SIZE) {
          if (cancelled) return;
          const batch = songsToProcess.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(batch.map(song => ensureSongUrls(song)));

          for (let j = 0; j < results.length; j++) {
            // Only keep songs whose cover URL actually changed
            if (results[j].coverImage !== batch[j].coverImage) {
              updates.set(batch[j].id, results[j]);
            }
          }
        }

        if (cancelled || updates.size === 0) return;
        setSongs(prev => prev.map(song => updates.get(song.id) ?? song));
      } catch (err) {
        // Non-critical — covers will just show the 🎵 fallback emoji
        // eslint-disable-next-line no-console
        console.warn('[EditorScreen] Failed to restore cover URLs:', err);
      }
    };

    restoreCovers();
    return () => { cancelled = true; };
  }, [songs]);

  // Reset visibleCount when filters change
  useEffect(() => { setVisibleCount(50); }, [filterMode, searchQuery]);

  // Filter songs based on filter mode and search
  const filteredSongs = useMemo(() => {
    let filtered = songs;

    // Apply filter mode
    switch (filterMode) {
      case 'no-genre':
        filtered = filtered.filter(s => !s.genre);
        break;
      case 'no-language':
        filtered = filtered.filter(s => !s.language);
        break;
      case 'no-year':
        filtered = filtered.filter(s => !s.year);
        break;
      case 'incomplete':
        filtered = filtered.filter(s => !s.genre || !s.language);
        break;
    }

    // Apply search (fuzzy matching — tolerant of typos like "Quen" for "Queen")
    if (searchQuery) {
      filtered = filtered.filter(s =>
        fuzzyMatch(searchQuery, s.title) ||
        fuzzyMatch(searchQuery, s.artist)
      );
    }

    return filtered;
  }, [songs, filterMode, searchQuery]);

  // Count songs without genre/language
  const songsWithoutGenre = useMemo(() => songs.filter(s => !s.genre).length, [songs]);
  const songsWithoutLanguage = useMemo(() => songs.filter(s => !s.language).length, [songs]);
  const songsWithoutYear = useMemo(() => songs.filter(s => !s.year).length, [songs]);

  // ── Multi-select helpers ──
  const toggleSongSelection = useCallback((songId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(new Set(filteredSongs.map(s => s.id)));
  }, [filteredSongs]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setBatchSuggestions([]);
    setBatchError(null);
    setBatchStats(null);
    setBatchProgress(null);
  }, []);

  const selectedCount = selectedIds.size;

  // ── R1: lyrics warm-up ──
  // Pre-loads lyrics (IndexedDB → file fallback) with limited concurrency
  // so the batch apply loop writes txt files without per-song cold reads.
  // Started in parallel with the AI call — by the time the dialog shows, the
  // cache is usually warm.
  const startLyricsWarmup = useCallback((list: Song[]) => {
    const total = list.length;
    if (total === 0) return;
    let index = 0;
    let done = 0;
    setWarmupProgress({ done: 0, total });

    const worker = async () => {
      while (index < total) {
        const song = list[index++];
        try {
          await getSongByIdWithLyrics(song.id);
        } catch {
          // Non-fatal — the apply loop retries per song and reports file errors
        }
        done++;
        setWarmupProgress({ done, total });
      }
    };

    const workers = Array.from({ length: Math.min(4, total) }, () => worker());
    warmupPromiseRef.current = Promise.all(workers).then(() => {
      setWarmupProgress(null);
    });
  }, []);

  // ── Batch AI Suggest (R2 cache → R6 factual lookup → LLM, chunked R3) ──
  const handleBatchSuggest = useCallback(async () => {
    // R3: ALL selected songs — no silent 50-song truncation. harmonizeSongs
    // chunks internally (50/LLM call, 12/lookup call) with progress.
    const selectedSongs = songs.filter(s => selectedIds.has(s.id));
    if (selectedSongs.length === 0) return;

    setBatchLoading(true);
    setBatchError(null);
    setBatchSuggestions([]);
    setBatchFileErrors(null);
    setBatchStats(null);
    batchAbortRef.current = false;

    // R1: warm the lyrics cache while the AI thinks
    startLyricsWarmup(selectedSongs);

    try {
      const result = await harmonizeSongs(
        selectedSongs.map(s => ({
          id: s.id, title: s.title, artist: s.artist,
          genre: s.genre ?? null, language: s.language ?? null, year: s.year ?? null,
        })),
        { onProgress: setBatchProgress },
      );
      if (batchAbortRef.current) return;
      setBatchProgress(null);

      if (result.success || result.suggestions.length > 0) {
        setBatchSuggestions(result.suggestions);
        setBatchStats(result.stats);
        setShowBatchDialog(true);
      } else {
        setBatchError(result.error || t('editor.aiBatchError'));
      }
    } catch (e) {
      if (batchAbortRef.current) return;
      setBatchError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBatchLoading(false);
      setBatchProgress(null);
    }
  }, [songs, selectedIds, t, startLyricsWarmup]);

  /**
   * Persist a metadata update to the song's SOURCE txt file.
   * Shared module — the card uses the same contract.
   */
  const persistMetadata = useCallback(async (songId: string, updates: Partial<Song>): Promise<boolean> => {
    const result = await persistSongMetadataToTxt(songId, updates);
    return result.success;
  }, []);

  const handleBatchApplySingle = useCallback(async (songId: string, field: 'genre' | 'language' | 'year', value: string | number) => {
    // Normalize to the app's canonical naming (English language names,
    // title-cased genres) — factual sources are pre-normalized, LLM output
    // is normalized here as a safety net.
    const normalized = field === 'genre'
      ? normalizeGenreName(String(value))
      : field === 'language'
        ? normalizeLanguage(String(value))
        : Number(value);
    const updates: Partial<Song> = { [field]: normalized };

    updateSong(songId, updates);
    const fileOk = await persistMetadata(songId, updates);
    if (!fileOk) {
      setBatchFileErrors(prev => (prev ?? 0) + 1);
    }

    // Clear only the applied suggestion — the OTHER fields' suggestions stay
    // pending in the dialog (previously the whole row vanished).
    setBatchSuggestions(prev => prev
      .map(s => s.songId === songId
        ? { ...s, ...(field === 'genre' ? { suggestedGenre: null } : field === 'language' ? { suggestedLanguage: null } : { suggestedYear: null }) }
        : s)
      .filter(s => s.suggestedGenre || s.suggestedLanguage || s.suggestedYear));
    refreshSongs();
  }, [refreshSongs, persistMetadata]);

  const handleBatchApplyAll = useCallback(async () => {
    const list = batchSuggestions;
    if (list.length === 0) return;

    // R1: make sure the lyrics warm-up finished — the apply loop then writes
    // txt files from the warm cache instead of hitting cold file reads.
    if (warmupPromiseRef.current) {
      try { await warmupPromiseRef.current; } catch { /* warmup is best-effort */ }
    }

    setBatchApplyProgress({ done: 0, total: list.length });
    setBatchFileErrors(0);
    let fileErrors = 0;
    let processed = 0;

    for (const s of list) {
      if (batchAbortRef.current) break;
      const updates: Partial<Song> = {};
      // R4: apply-all respects the confidence threshold — but factual
      // sources (Deezer/MusicBrainz) and years are exempt (verified data).
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
        updateSong(s.songId, updates);
        const fileOk = await persistMetadata(s.songId, updates);
        if (!fileOk) fileErrors++;
      }
      processed++;
      setBatchApplyProgress({ done: processed, total: list.length });
    }

    setBatchApplyProgress(null);
    setBatchFileErrors(fileErrors > 0 ? fileErrors : null);
    setBatchSuggestions([]);
    setBatchStats(null);
    setShowBatchWarning(false);
    setShowBatchDialog(false);
    clearSelection();
    refreshSongs();
  }, [batchSuggestions, minConfidence, clearSelection, refreshSongs, persistMetadata]);

  // Handle song selection - load lyrics from IndexedDB/filesystem if needed
  const handleSelectSong = useCallback(async (song: Song) => {
    // If song has no lyrics but can load them (IndexedDB cache or filesystem)
    const needsLyrics = !song.lyrics || song.lyrics.length === 0;
    const canLoadLyrics = song.storedTxt || !!song.relativeTxtPath;

    if (needsLyrics && canLoadLyrics) {
      setIsLoadingLyrics(true);

      try {
        const songWithLyrics = await getSongByIdWithLyrics(song.id);
        if (songWithLyrics && songWithLyrics.lyrics && songWithLyrics.lyrics.length > 0) {
          setSelectedSong(songWithLyrics);
        } else {
          // eslint-disable-next-line no-console
          console.warn('[EditorScreen] Failed to load song with lyrics');
          setSelectedSong(song);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[EditorScreen] Error loading lyrics:', error);
        setSelectedSong(song);
      } finally {
        setIsLoadingLyrics(false);
      }
    } else {
      setSelectedSong(song);
    }
  }, []);

  const handleCardClick = useCallback((song: Song) => {
    if (selectMode) {
      toggleSongSelection(song.id);
    } else {
      handleSelectSong(song);
    }
  }, [selectMode, toggleSongSelection, handleSelectSong]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  }, []);

  const handleSave = (updatedSong: Song) => {
    updateSong(updatedSong.id, updatedSong);
    refreshSongs();
    setSelectedSong(null);
  };

  // ── Latest song state from the KaraokeEditor (fixes stale saves in the genre panel) ──
  const latestSongRef = useRef<Song | null>(null);
  const handleSongSync = useCallback((song: Song) => {
    latestSongRef.current = song;
  }, []);

  // Incremented when an external panel saved the current state → the
  // KaraokeEditor resets its unsaved-changes indicator accordingly.
  const [externalSaveCount, setExternalSaveCount] = useState(0);

  const handleSongMetadataUpdate = (updates: Partial<Song>) => {
    if (selectedSong) {
      setSelectedSong({ ...selectedSong, ...updates } as Song);
    }
  };

  return (
    <div className="w-full h-full relative theme-container">
      {/* Loading Overlay */}
      {isLoadingLyrics && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white">{t('editor.loadingLyrics')}</p>
          </div>
        </div>
      )}

      {/* Batch AI Suggest Dialog */}
      {showBatchDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-xl p-5 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🤖</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-white font-semibold text-sm">{t('editor.aiBatchSuggestTitle')}</h3>
                <p className="text-white/60 text-xs truncate">{t('editor.aiBatchSuggestDesc')}</p>
              </div>
            </div>

            {batchSuggestions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <p className="text-white/50 text-sm">{t('editor.aiBatchNoSuggestions')}</p>
              </div>
            ) : (
              <>
                {/* R4: confidence threshold filter — AI guesses only */}
                <div className="flex items-center justify-between gap-2 flex-wrap pb-2 mb-2 border-b border-white/10">
                  <ConfidenceFilter value={minConfidence} onChange={setMinConfidence} t={t} />
                  {batchStats && (
                    <p className="text-[10px] text-white/40 truncate">
                      {t('editor.aiBatchStatsLine')
                        .replace('{cache}', String(batchStats.fromCache))
                        .replace('{facts}', String(batchStats.factualHits))
                        .replace('{ai}', String(batchStats.total - batchStats.fromCache))}
                    </p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                  {batchSuggestions.map(s => (
                    <SuggestionRow
                      key={s.songId}
                      suggestion={s}
                      minConfidence={minConfidence}
                      onApply={(songId, field, value) => handleBatchApplySingle(songId, field, value)}
                    />
                  ))}
                </div>

                {/* R1: lyrics warm-up indicator */}
                {warmupProgress && (
                  <div className="flex items-center gap-2 text-[11px] text-white/50 pb-2">
                    <span>📖</span>
                    <span className="font-mono tabular-nums">
                      {t('editor.aiBatchWarmup')
                        .replace('{current}', String(warmupProgress.done))
                        .replace('{total}', String(warmupProgress.total))}
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => { setShowBatchDialog(false); }}
                className="flex-1 border-white/20 text-white/80 hover:bg-white/10 text-xs"
                data-testid="editor-batch-close-button"
              >
                {t('editor.aiBatchClose')}
              </Button>
              {batchSuggestions.length > 0 && (
                <Button
                  onClick={() => setShowBatchWarning(true)}
                  disabled={countApplicableSongs(batchSuggestions, minConfidence) === 0}
                  className="flex-1 bg-green-500 hover:bg-green-400 text-black font-semibold text-xs disabled:opacity-40"
                  data-testid="editor-batch-apply-button"
                >
                  {t('editor.aiApplyAll')} ({countApplicableSongs(batchSuggestions, minConfidence)}
                    {countApplicableSongs(batchSuggestions, minConfidence) !== batchSuggestions.length
                      ? `/${batchSuggestions.length}`
                      : ''})
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Apply Warning Dialog */}
      {showBatchWarning && (
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
              <p>{t('editor.aiHarmonizeWarn1')}</p>
              <ul className="list-disc list-inside space-y-1 text-white/60">
                <li>{t('editor.aiHarmonizeWarn2')}</li>
                <li>{t('editor.aiHarmonizeWarn3')}</li>
                <li>{t('editor.aiHarmonizeWarn4')}</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="px-2 py-0.5 rounded bg-white/10 font-mono">{countApplicableSongs(batchSuggestions, minConfidence)}</span>
              <span>{t('editor.aiHarmonizeWarnCount')}</span>
            </div>

            {/* R4: threshold note in the warning */}
            <div className="flex items-center gap-2 text-[11px] text-white/50 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
              <span>🛡️</span>
              <span>
                {t('editor.aiBatchThresholdNote').replace('{value}', String(minConfidence))}
              </span>
            </div>

            {/* Progress while writing the txt files */}
            {batchApplyProgress && (
              <div className="flex items-center gap-3 text-xs text-white/70">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="font-mono tabular-nums">
                  {t('editor.aiBatchSavingFiles')
                    .replace('{current}', String(batchApplyProgress.done))
                    .replace('{total}', String(batchApplyProgress.total))}
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setShowBatchWarning(false)}
                disabled={!!batchApplyProgress}
                className="flex-1 border-white/20 text-white/80 hover:bg-white/10 text-xs"
                data-testid="editor-batch-warning-cancel-button"
              >
                {t('editor.aiHarmonizeWarnCancel')}
              </Button>
              <Button
                onClick={handleBatchApplyAll}
                disabled={!!batchApplyProgress}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs"
                data-testid="editor-batch-warning-confirm-button"
              >
                {batchApplyProgress
                  ? `${batchApplyProgress.done}/${batchApplyProgress.total}`
                  : t('editor.aiHarmonizeWarnConfirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* File persistence warning — library updated but txt could not be written */}
      {batchFileErrors !== null && (
        <div className="fixed bottom-4 right-4 z-[70] max-w-sm bg-gray-900 border border-amber-500/40 rounded-xl p-3 shadow-2xl" data-testid="editor-batch-file-error">
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none">⚠️</span>
            <p className="text-xs text-amber-200/90">
              {t('editor.aiBatchFileErrors').replace('{count}', String(batchFileErrors))}
            </p>
            <button
              onClick={() => setBatchFileErrors(null)}
              className="ml-1 text-white/40 hover:text-white/80 text-xs"
              aria-label={t('editor.aiBatchClose')}
            >✕</button>
          </div>
        </div>
      )}

      {!selectedSong ? (
        <div className="w-full h-full overflow-y-auto p-4 space-y-4">
          {/* Header - Consistent with other screens */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{t('editor.title')}</h1>
              <p className="text-white/60">{t('editor.subtitle')}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={refreshSongs} variant="outline" className="border-white/20" title={t('editor.refreshTitle')} data-testid="editor-refresh-button">
                🔄 {t('editor.refreshBtn')}
              </Button>
              <Button
                onClick={() => setSelectMode(!selectMode)}
                variant={selectMode ? 'default' : 'outline'}
                className={selectMode ? 'bg-violet-500 hover:bg-violet-400' : 'border-white/20 text-white'}
                data-testid="editor-select-mode-toggle"
              >
                {selectMode ? '✕ ' + t('editor.exitSelectMode') : '☑️ AI Support'}
              </Button>
              <Button onClick={onBack} variant="outline" className="border-white/20" data-testid="editor-back-button">
                ← {t('editor.back')}
              </Button>
              <FullscreenButton />
            </div>
          </div>

          {/* Search and Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Input
                placeholder={t('editor.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-10"
                data-testid="editor-search-input"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>

            {/* Filter Buttons - Only for no-genre and no-language */}
            <div className="flex gap-2">
              <Button
                onClick={() => setFilterMode(filterMode === 'no-genre' ? 'all' : 'no-genre')}
                variant={filterMode === 'no-genre' ? 'default' : 'outline'}
                className={filterMode === 'no-genre' ? 'bg-orange-500' : 'border-white/20 text-white'}
                size="sm"
                data-testid="editor-filter-nogenre"
              >
                🎸 {t('editor.noGenre')} ({songsWithoutGenre})
              </Button>
              <Button
                onClick={() => setFilterMode(filterMode === 'no-language' ? 'all' : 'no-language')}
                variant={filterMode === 'no-language' ? 'default' : 'outline'}
                className={filterMode === 'no-language' ? 'bg-purple-500' : 'border-white/20 text-white'}
                size="sm"
                data-testid="editor-filter-nolanguage"
              >
                🌐 {t('editor.noLanguage')} ({songsWithoutLanguage})
              </Button>
              <Button
                onClick={() => setFilterMode(filterMode === 'no-year' ? 'all' : 'no-year')}
                variant={filterMode === 'no-year' ? 'default' : 'outline'}
                className={filterMode === 'no-year' ? 'bg-emerald-500 hover:bg-emerald-400' : 'border-white/20 text-white'}
                size="sm"
                data-testid="editor-filter-noyear"
              >
                📅 {t('editor.noYear')} ({songsWithoutYear})
              </Button>
            </div>
          </div>

          {/* Songs Grid */}
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
            {/* New Song Button - First card (only when not in select mode) */}
            {!selectMode && (
              <button
                onClick={() => setShowNewSongDialog(true)}
                className="border-2 border-dashed border-white/20 hover:border-cyan-500/50 rounded-lg overflow-hidden transition-all group flex flex-col items-center justify-center min-h-[60px] hover:bg-white/5"
                data-testid="editor-new-song-button"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center mb-1 group-hover:bg-cyan-500/20 transition-colors">
                  <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <span className="text-[10px] font-medium text-white/60 group-hover:text-white/80 transition-colors">{t('editor.newSong')}</span>
              </button>
            )}
            {filteredSongs.slice(0, visibleCount).map(song => (
              <button
                key={song.id}
                onClick={() => handleCardClick(song)}
                data-testid={`editor-song-card-${song.id}`}
                className={`theme-adaptive-bg hover:brightness-110 border rounded-lg overflow-hidden transition-all group relative ${
                  selectMode
                    ? selectedIds.has(song.id)
                      ? 'border-violet-500 ring-2 ring-violet-500/30'
                      : 'border-white/10 hover:border-violet-500/50'
                    : 'border-white/10 hover:border-cyan-500/50'
                }`}
              >
                {/* Checkbox overlay in select mode */}
                {selectMode && (
                  <div
                    className={`absolute top-1 left-1 z-10 w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-all ${
                      selectedIds.has(song.id)
                        ? 'bg-violet-500 border-violet-500'
                        : 'bg-black/40 border-white/40'
                    }`}
                    onClick={(e) => toggleSongSelection(song.id, e)}
                  >
                    {selectedIds.has(song.id) && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                )}
                {/* Cover Image */}
                <div className="relative aspect-square bg-gradient-to-br from-purple-600/30 to-blue-600/30 overflow-hidden">
                  {song.coverImage ? (
                    <img
                      src={song.coverImage}
                      alt={song.title}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                    />
                  ) : null}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-lg opacity-50">🎵</span>
                  </div>
                </div>
                {/* Song Info */}
                <div className="p-1.5">
                  <p className="font-medium truncate text-[10px]">{song.title}</p>
                  <p className="text-[9px] text-white/60 truncate">{song.artist}</p>
                  <div className="flex gap-0.5 mt-0.5">
                    <span className="text-[8px] text-white/40">{song.bpm}</span>
                    {!song.genre && <span className="text-[8px] text-orange-400">🎸</span>}
                    {!song.language && <span className="text-[8px] text-purple-400">🌐</span>}
                    {!song.year && <span className="text-[8px] text-emerald-400">📅</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {visibleCount < filteredSongs.length && (
            <div className="flex justify-center py-6">
              <Button
                onClick={() => setVisibleCount(prev => prev + 50)}
                variant="outline"
                className="border-white/20 text-white/70 hover:bg-white/10"
              >
                {t('editor.loadMore')} ({filteredSongs.length - visibleCount})
              </Button>
            </div>
          )}

          {filteredSongs.length === 0 && (
            <div className="text-center py-12 text-white/40">
              <div className="text-4xl mb-2">📝</div>
              <p>{t('editor.noSongsFound')}</p>
              <p className="text-sm">{t('editor.noSongsDesc')}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full">
          {/* Editor - Full width */}
          <div className="flex-1 min-w-0 overflow-hidden relative">
            {/* Metadata panel toggle is now in the header */}
            <KaraokeEditor
              song={selectedSong}
              onSave={handleSave}
              onCancel={() => setSelectedSong(null)}
              onSongSync={handleSongSync}
              externalSaveCount={externalSaveCount}
              showMetadataPanel={showMetadataPanel}
              onToggleMetadataPanel={() => setShowMetadataPanel(prev => !prev)}
            />
          </div>

          {/* Right Sidebar - Genre/Language Editor - Collapsible */}
          {showMetadataPanel && (
            <div className="w-80 flex-shrink-0 overflow-y-auto border-l border-white/10 p-4 space-y-4">
              <GenreLanguageEditor
                key={selectedSong?.id ?? 'none'}
                song={selectedSong}
                onUpdate={handleSongMetadataUpdate}
                onSaved={() => { refreshSongs(); setExternalSaveCount(c => c + 1); }}
                t={t}
                getLatestSong={() => latestSongRef.current ?? selectedSong}
              />
              <AiHarmonizeCard songs={songs} onApplied={refreshSongs} t={t} />
            </div>
          )}
        </div>
      )}

      {/* Floating Multi-Select Action Bar */}
      {selectMode && selectedCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 shadow-2xl animate-fade-in">
          <span className="text-sm text-white/80 font-medium whitespace-nowrap">
            {selectedCount} {t('editor.aiBatchSelected')}
          </span>
          <div className="w-px h-6 bg-white/20" />
          <Button
            size="sm"
            variant="outline"
            onClick={selectAllFiltered}
            className="border-white/20 text-white/80 hover:bg-white/10 text-xs h-8"
            data-testid="editor-select-all-button"
          >
            {t('editor.aiBatchSelectAll')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={clearSelection}
            className="border-white/20 text-white/80 hover:bg-white/10 text-xs h-8"
            data-testid="editor-clear-selection-button"
          >
            {t('editor.aiBatchClear')}
          </Button>
          <Button
            size="sm"
            onClick={handleBatchSuggest}
            disabled={batchLoading}
            className="bg-violet-500 hover:bg-violet-400 text-white font-semibold text-xs h-8 gap-1.5"
            data-testid="editor-batch-suggest-button"
          >
            {batchLoading ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>🤖</span>
            )}
            {batchProgress
              ? `${batchProgress.phase === 'lookup' ? '🔎' : '🤖'} ${batchProgress.done}/${batchProgress.total}`
              : t('editor.aiBatchSuggestBtn')}
          </Button>
        </div>
      )}

      {/* Pipeline progress pill — shows factual lookup / AI chunk progress */}
      {batchLoading && batchProgress && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 backdrop-blur-sm border border-violet-500/40 rounded-full px-4 py-2 shadow-2xl flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-white/80 whitespace-nowrap">
            {batchProgress.phase === 'lookup'
              ? t('editor.aiBatchLookupPhase')
              : t('editor.aiBatchAiPhase')}
          </span>
          <span className="text-xs text-white/50 font-mono tabular-nums">{batchProgress.done}/{batchProgress.total}</span>
        </div>
      )}

      {/* Select mode hint when no songs selected */}
      {selectMode && selectedCount === 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 shadow-2xl animate-fade-in">
          <p className="text-sm text-white/60">{t('editor.aiBatchHint')}</p>
        </div>
      )}

      {/* Batch error toast */}
      {batchError && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/90 backdrop-blur-sm text-white rounded-lg px-4 py-3 text-sm shadow-xl max-w-sm">
          <p className="font-medium">{t('editor.aiBatchError')}</p>
          <p className="text-white/80 text-xs mt-1">{batchError}</p>
          <button onClick={() => setBatchError(null)} className="absolute top-2 right-2 text-white/60 hover:text-white" data-testid="editor-batch-error-close-button" aria-label="Close error">✕</button>
        </div>
      )}

      {/* New Song Dialog */}
      {showNewSongDialog && (
        <NewSongDialog
          onSave={(song) => {
            addSong(song);
            setShowNewSongDialog(false);
            // Immediately open the new song in the editor
            setSelectedSong(song);
          }}
          onCancel={() => setShowNewSongDialog(false)}
        />
      )}
    </div>
  );
}
