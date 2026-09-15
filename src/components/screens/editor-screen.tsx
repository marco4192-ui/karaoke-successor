'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAllSongs, getAllSongsAsync, addSong, updateSong, getSongByIdWithLyrics } from '@/lib/game/song-library';
import { reconcileLibraryFromFiles } from '@/lib/game/library-reconcile';
import { KaraokeEditor } from '@/components/editor/karaoke-editor';
import { NewSongDialog } from '@/components/editor/new-song-dialog';
import { MetadataStudio } from '@/components/editor/metadata-studio';
import { createDemoSong } from '@/lib/editor/demo-song';
import { RuleHarmonizeStatusBar } from '@/components/editor/rule-harmonize-card';
import { Song } from '@/types/game';
import { fuzzyMatch } from '@/lib/fuzzy-search';
import { useTranslation } from '@/lib/i18n/translations';
import { useToast } from '@/hooks/use-toast';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';

export function EditorScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [songs, setSongs] = useState<Song[]>(() => getAllSongs());

  // ── Initial load (R4 point 6): Ladescreen until songs AND covers are ready.
  // The editor now uses the SAME loading path as the Library: getAllSongsAsync()
  // eagerly restores cover URLs (Tauri: shared blobUrlCache; browser: media-db)
  // — previously the editor restored covers itself in slow 20-song batches for
  // only the first 100 songs, which is why covers visibly reloaded here.
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const songsWithCovers = await getAllSongsAsync();
        if (!cancelled) setSongs(songsWithCovers);
      } catch {
        // Non-critical — the sync getAllSongs() snapshot stays
      } finally {
        if (!cancelled) setIsInitialLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Item 4: visible loading state for library (re)loads — the Tauri folder
  // rescan can take seconds and previously gave NO feedback at all.
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const refreshSongs = useCallback(() => {
    // LIGHT reload: updateSong() keeps the in-memory customSongsCache (WITH the
    // runtime blob/asset URLs) in sync — reading it back is instant and covers
    // STAY VISIBLE. clearSongCache() must NOT be called here: it revokes the
    // browser blob URLs the grid is displaying (covers would vanish + reload —
    // the old "why do covers reload?" symptom).
    setSongs(getAllSongs());
  }, []);

  // FULL reload (the "Neu laden" button): reconcile the library with the txt
  // files on disk — genre/language/year/title/artist are reset to the TXT
  // truth. This is what the user expects from a library reload: store-only
  // or stale values (e.g. genre set although the txt has none) are corrected.
  // After the cache reset the covers are restored via the Library's async
  // path (same data basis — R4 point 6).
  const refreshSongsWithReconcile = useCallback(async () => {
    setIsLibraryLoading(true);
    try {
      try {
        if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
          const result = await reconcileLibraryFromFiles();
          if (!result.skipped && (result.updated > 0 || result.removed > 0)) {
            toast({
              title: '🔄 ' + t('editor.reconcileTitle'),
              description: t('editor.reconcileDone')
                .replace('{updated}', String(result.updated))
                .replace('{removed}', String(result.removed))
                .replace('{scanned}', String(result.scanned)),
            });
          }
        }
      } catch {
        // Non-Tauri environment or scan failed — fall back to the light reload
      }
      const songsWithCovers = await getAllSongsAsync();
      setSongs(songsWithCovers);
    } finally {
      setIsLibraryLoading(false);
    }
  }, [t, toast]);

  const [filterMode, setFilterMode] = useState<'all' | 'no-genre' | 'no-language' | 'no-year' | 'incomplete'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false); // Loading state for lyrics
  const [showNewSongDialog, setShowNewSongDialog] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50); // Lazy loading for song grid

  // ── Multi-select state (R4 point 7: selection feeds the Metadata Studio) ──
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Metadata Studio (R4 points 7+8: merged AI Harmonize + Rule Harmonize
  // + AI Suggest, placed in the editor library; the old Genre/Language
  // sidebar tab is gone — regular metadata editing covers it) ──
  const [studioOpen, setStudioOpen] = useState(false);
  /** Incremented each time the select bar opens the studio → re-focuses the
   *  "selection" scope even when it was already selected. */
  const [studioSelectionFocus, setStudioSelectionFocus] = useState(0);

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

  /** Songs in the current filter view that are NOT selected yet. */
  const unselectedInFilter = useMemo(
    () => filteredSongs.filter(s => !selectedIds.has(s.id)),
    [filteredSongs, selectedIds],
  );

  /**
   * Select the NEXT batch of up to 100 filtered songs (in list order) that are
   * not selected yet. Fewer available → all remaining get selected.
   *
   * Batch size 100: the pipeline chunks internally (12 per LLM call with
   * per-chunk retry, 12 per factual lookup) with progress + abort, so larger
   * selections stay reliable — the old "only ~5 songs came back" symptom was
   * the LLM truncating 50-song responses, not a real batch limit (fixed in
   * harmonize-client).
   */
  const SELECT_BATCH_SIZE = 100;
  const selectNextBatch = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      let added = 0;
      for (const s of filteredSongs) {
        if (added >= SELECT_BATCH_SIZE) break;
        if (!next.has(s.id)) {
          next.add(s.id);
          added++;
        }
      }
      return next;
    });
  }, [filteredSongs]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedCount = selectedIds.size;

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
          // MERGE instead of replace: the passed song comes from the restored
          // library array (getAllSongsAsync) and carries live blob URLs for
          // audio/video/cover; the cache lookup in getSongByIdWithLyrics does
          // NOT. Taking the loaded object 1:1 dropped the restored audio
          // (editor had no <audio> element after a reload).
          setSelectedSong({
            ...songWithLyrics,
            audioUrl: song.audioUrl || songWithLyrics.audioUrl,
            videoBackground: song.videoBackground || songWithLyrics.videoBackground,
            coverImage: song.coverImage || songWithLyrics.coverImage,
          });
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

  // ── Select-mode entry hint ("Wähle Songs aus") ──
  // Entering selection mode right after using a filter needs an explicit
  // prompt — the Metadata Studio (selection scope) needs songs picked first.
  const handleToggleSelectMode = useCallback(() => {
    setSelectMode(prev => {
      const next = !prev;
      if (next) {
        const filterLabel = filterMode === 'all'
          ? t('editor.selectModeHintAll')
          : t('editor.selectModeHintFiltered').replace('{n}', String(filteredSongs.length));
        toast({
          title: `☑️ ${t('editor.selectModeHintTitle')}`,
          description: `${filterLabel} ${t('editor.aiBatchHint')}`,
        });
      }
      return next;
    });
  }, [filterMode, filteredSongs.length, t, toast]);

  // ── Demo sample song (sandbox testing — user request "Muster-Song") ──
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const handleCreateDemoSong = useCallback(async () => {
    setIsCreatingDemo(true);
    try {
      const song = await createDemoSong();
      toast({
        title: `🎵 ${t('editor.demoSongCreatedTitle')}`,
        description: t('editor.demoSongCreatedDesc'),
      });
      // Refresh the library so the missing-metadata counters update immediately
      refreshSongs();
      // Open the fresh demo song directly in the editor for immediate testing
      setSelectedSong(song);
    } catch (e) {
      toast({
        title: '⚠️',
        description: e instanceof Error ? e.message : t('editor.demoSongError'),
        variant: 'destructive',
      });
    } finally {
      setIsCreatingDemo(false);
    }
  }, [t, toast, refreshSongs]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  }, []);

  const handleSave = (updatedSong: Song) => {
    updateSong(updatedSong.id, updatedSong);
    refreshSongs();
    setSelectedSong(null);
  };

  /** Open the Metadata Studio focused on the current selection. */
  const openStudioWithSelection = useCallback(() => {
    setStudioOpen(true);
    setStudioSelectionFocus(c => c + 1);
    // Scroll the studio into view (it sits above the grid)
    requestAnimationFrame(() => {
      document.querySelector('[data-testid="metadata-studio"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  return (
    <div className="w-full h-full relative theme-container">
      {/* ── Initial loading screen (R4 point 6) ──
          Shown on the FIRST editor open until songs AND their covers are
          imported/visible — same async loading path as the Library. */}
      {isInitialLoading && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4" data-testid="editor-initial-loading">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 border-cyan-500/30" />
            <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-xl">🎼</div>
          </div>
          <div className="text-center">
            <p className="text-white/80 text-sm font-medium">{t('editor.loadingLibraryTitle')}</p>
            <p className="text-white/40 text-xs mt-1">{t('editor.loadingCoversDesc')}</p>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoadingLyrics && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white">{t('editor.loadingLyrics')}</p>
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
              <Button
                onClick={refreshSongsWithReconcile}
                variant="outline"
                className="border-white/20"
                title={t('editor.refreshTitle')}
                data-testid="editor-refresh-button"
                disabled={isLibraryLoading}
              >
                {isLibraryLoading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    {t('library.loadingSongs')}
                  </span>
                ) : (
                  <>🔄 {t('editor.refreshBtn')}</>
                )}
              </Button>
              {/* Demo sample song — sandbox testing (user request). The old
                  header "Select Songs" button moved INTO the Metadata Studio
                  (next to Run) — it only serves the studio flow. */}
              <Button
                onClick={handleCreateDemoSong}
                variant="outline"
                disabled={isCreatingDemo}
                className="border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-300 transition-all"
                title={t('editor.demoSongButtonTitle')}
                data-testid="editor-demo-song-button"
              >
                {isCreatingDemo ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                ) : '🧪'}
                {' '}{t('editor.demoSongButton')}
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

          {/* ── Metadata Studio (R4 points 7+8) ──
              Merged AI Harmonize + Rule Harmonize + AI Suggest hub. The old
              Genre/Language sidebar tab is removed — genre/language/year are
              edited via the regular metadata panel of a song. */}
          {!isInitialLoading && (
            <MetadataStudio
              songs={songs}
              selectedIds={selectedIds}
              open={studioOpen}
              onToggle={() => setStudioOpen(prev => !prev)}
              selectionFocusToken={studioSelectionFocus}
              selectMode={selectMode}
              onToggleSelectMode={handleToggleSelectMode}
              onApplied={refreshSongs}
              t={t}
            />
          )}

          {/* Songs Grid */}
          {isLibraryLoading && filteredSongs.length === 0 && (
            <div className="flex items-center justify-center py-16" data-testid="editor-library-loading">
              <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mr-3" />
              <span className="text-white/60">{t('library.loadingSongs')}</span>
            </div>
          )}
          <div className={`grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 ${isLibraryLoading ? 'opacity-50 pointer-events-none' : ''}`}>
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

          {filteredSongs.length === 0 && !isInitialLoading && (
            <div className="text-center py-12 text-white/40">
              <div className="text-4xl mb-2">📝</div>
              <p>{t('editor.noSongsFound')}</p>
              <p className="text-sm">{t('editor.noSongsDesc')}</p>
              <Button
                onClick={handleCreateDemoSong}
                disabled={isCreatingDemo}
                className="mt-4 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
                data-testid="editor-demo-song-empty-button"
              >
                {isCreatingDemo ? (
                  <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                ) : '🧪'}
                {' '}{t('editor.demoSongButton')}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full">
          {/* Editor - Full width */}
          <div className="flex-1 min-w-0 overflow-hidden relative">
            <KaraokeEditor
              song={selectedSong}
              onSave={handleSave}
              onCancel={() => setSelectedSong(null)}
            />
          </div>
        </div>
      )}

      {/* Floating Multi-Select Action Bar */}
      {selectMode && selectedCount > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 shadow-2xl animate-fade-in">
          <span className="text-sm text-white/80 font-medium whitespace-nowrap">
            {selectedCount} {t('editor.aiBatchSelected')}
          </span>
          <div className="w-px h-6 bg-white/20" />
          {/* Select the NEXT batch of ≤ 100 filtered songs (not yet selected). */}
          <Button
            size="sm"
            variant="outline"
            onClick={selectNextBatch}
            disabled={unselectedInFilter.length === 0}
            className="border-violet-400/40 text-violet-300 hover:bg-violet-500/15 hover:border-violet-300 disabled:opacity-40 text-xs h-8 whitespace-nowrap"
            data-testid="editor-select-all-button"
          >
            {unselectedInFilter.length > SELECT_BATCH_SIZE
              ? t('editor.aiBatchSelectNext').replace('{n}', String(SELECT_BATCH_SIZE))
              : t('editor.aiBatchSelectRemaining').replace('{n}', String(unselectedInFilter.length))}
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
          {/* R4 point 7: the old separate "🤖 KI-Vorschlag" button merged into
              the Metadata Studio — this opens it focused on the selection. */}
          <Button
            size="sm"
            onClick={openStudioWithSelection}
            className="bg-violet-500 hover:bg-violet-400 text-white font-semibold text-xs h-8 gap-1.5"
            data-testid="editor-batch-suggest-button"
          >
            <span>🎛️</span>
            {t('editor.studioTitle')}
          </Button>
        </div>
      )}

      {/* Select mode hint when no songs selected — prominent prompt with
          the current filter context ("Wähle Songs aus") */}
      {selectMode && selectedCount === 0 && !isLibraryLoading && !isInitialLoading && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 backdrop-blur-sm border border-violet-500/40 rounded-xl px-5 py-3 shadow-2xl animate-fade-in flex items-center gap-3" data-testid="editor-select-mode-hint">
          <span className="text-xl">☑️</span>
          <div>
            <p className="text-sm text-white/90 font-medium">{t('editor.selectModeHintTitle')}</p>
            <p className="text-xs text-white/50">
              {filterMode === 'all'
                ? t('editor.selectModeHintAll')
                : t('editor.selectModeHintFiltered').replace('{n}', String(filteredSongs.length))}
              {' '}{t('editor.aiBatchHint')}
            </p>
          </div>
        </div>
      )}

      {/* Background rule-harmonization status pill (module singleton —
          keeps running even when the studio is closed) */}
      <RuleHarmonizeStatusBar t={t} />

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
