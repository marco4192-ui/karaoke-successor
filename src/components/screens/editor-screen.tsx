'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAllSongs, addSong, updateSong, getSongByIdWithLyrics, clearSongCache } from '@/lib/game/song-library';
import { KaraokeEditor } from '@/components/editor/karaoke-editor';
import { NewSongDialog } from '@/components/editor/new-song-dialog';
import { GenreLanguageEditor } from '@/components/editor/genre-language-editor';
import { AiHarmonizeCard } from '@/components/editor/ai-harmonize-card';
import { Song } from '@/types/game';
import { fuzzyMatch } from '@/lib/fuzzy-search';
import { useTranslation } from '@/lib/i18n/translations';

// ── Types for batch AI suggestion ──
interface BatchSuggestion {
  songId: string;
  title: string;
  artist: string;
  currentGenre: string | null;
  currentLanguage: string | null;
  suggestedGenre: string | null;
  suggestedLanguage: string | null;
  genreConfidence: number;
  languageConfidence: number;
  genreReason: string;
  languageReason: string;
}

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
        const songsFolder = localStorage.getItem('songsFolder') || localStorage.getItem('karaoke_songs_folder');
        if (songsFolder) {
          await scanSongsFolderTauri(songsFolder);
        }
      }
    } catch {
      // Non-Tauri environment or scan failed — just use cleared cache
    }
    setSongs(getAllSongs());
  }, []);
  const [filterMode, setFilterMode] = useState<'all' | 'no-genre' | 'no-language' | 'incomplete'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMetadataPanel, setShowMetadataPanel] = useState(false); // Collapsible metadata panel
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false); // Loading state for lyrics
  const [showNewSongDialog, setShowNewSongDialog] = useState(false); // New song creation dialog

  // ── Multi-select state ──
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchSuggestions, setBatchSuggestions] = useState<BatchSuggestion[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showBatchWarning, setShowBatchWarning] = useState(false);
  const batchAbortRef = useRef(false);

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
  const songsWithoutGenre = songs.filter(s => !s.genre).length;
  const songsWithoutLanguage = songs.filter(s => !s.language).length;

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
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    clearSelection();
  }, [clearSelection]);

  const selectedCount = selectedIds.size;

  // ── Batch AI Suggest ──
  const handleBatchSuggest = useCallback(async () => {
    const selectedSongs = songs.filter(s => selectedIds.has(s.id)).slice(0, 50);
    if (selectedSongs.length === 0) return;

    setBatchLoading(true);
    setBatchError(null);
    setBatchSuggestions([]);
    batchAbortRef.current = false;

    try {
      const res = await fetch('/api/harmonize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songs: selectedSongs.map(s => ({
            id: s.id, title: s.title, artist: s.artist,
            genre: s.genre || null, language: s.language || null,
          })),
        }),
      });
      const data = await res.json();
      if (batchAbortRef.current) return;

      if (data.success && data.suggestions) {
        setBatchSuggestions(data.suggestions.filter(
          (s: BatchSuggestion) => s.suggestedGenre || s.suggestedLanguage
        ));
        setShowBatchDialog(true);
      } else {
        setBatchError(data.error || 'Failed');
      }
    } catch (e) {
      if (batchAbortRef.current) return;
      setBatchError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setBatchLoading(false);
    }
  }, [songs, selectedIds]);

  const handleBatchApplySingle = useCallback((suggestion: BatchSuggestion, field: 'genre' | 'language') => {
    const value = field === 'genre' ? suggestion.suggestedGenre : suggestion.suggestedLanguage;
    if (!value) return;
    updateSong(suggestion.songId, { [field]: value });
    setBatchSuggestions(prev => prev.filter(s => s.songId !== suggestion.songId));
    refreshSongs();
  }, [refreshSongs]);

  const handleBatchApplyAll = useCallback(() => {
    batchSuggestions.forEach(s => {
      const updates: Partial<Song> = {};
      if (s.suggestedGenre) updates.genre = s.suggestedGenre;
      if (s.suggestedLanguage) updates.language = s.suggestedLanguage;
      if (Object.keys(updates).length > 0) {
        updateSong(s.songId, updates);
      }
    });
    setBatchSuggestions([]);
    setShowBatchWarning(false);
    setShowBatchDialog(false);
    clearSelection();
    refreshSongs();
  }, [batchSuggestions, clearSelection, refreshSongs]);

  const handleCardClick = useCallback((song: Song) => {
    if (selectMode) {
      toggleSongSelection(song.id);
    } else {
      handleSelectSong(song);
    }
  }, [selectMode, toggleSongSelection]);

  // Handle song selection - load lyrics from IndexedDB/filesystem if needed
  const handleSelectSong = async (song: Song) => {
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
  };

  const handleSave = (updatedSong: Song) => {
    updateSong(updatedSong.id, updatedSong);
    refreshSongs();
    setSelectedSong(null);
  };

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
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {batchSuggestions.map(s => (
                  <div key={s.songId} className="bg-white/5 rounded-lg p-2.5 text-xs space-y-1.5">
                    <p className="font-medium text-white/80 truncate">{s.artist} - {s.title}</p>
                    {s.suggestedGenre && s.suggestedGenre !== s.currentGenre && (
                      <div className="flex items-center gap-1">
                        <span className="text-red-400 line-through">{s.currentGenre || '-'}</span>
                        <span className="text-white/40">→</span>
                        <span className="text-green-400">{s.suggestedGenre}</span>
                        <span className="text-white/30">({s.genreConfidence}%)</span>
                        <button
                          onClick={() => handleBatchApplySingle(s, 'genre')}
                          className="ml-auto px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        >✓</button>
                      </div>
                    )}
                    {s.suggestedLanguage && s.suggestedLanguage !== s.currentLanguage && (
                      <div className="flex items-center gap-1">
                        <span className="text-red-400 line-through">{s.currentLanguage || '-'}</span>
                        <span className="text-white/40">→</span>
                        <span className="text-green-400">{s.suggestedLanguage}</span>
                        <span className="text-white/30">({s.languageConfidence}%)</span>
                        <button
                          onClick={() => handleBatchApplySingle(s, 'language')}
                          className="ml-auto px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        >✓</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => { setShowBatchDialog(false); }}
                className="flex-1 border-white/20 text-white/80 hover:bg-white/10 text-xs"
              >
                {t('editor.aiBatchClose')}
              </Button>
              {batchSuggestions.length > 0 && (
                <Button
                  onClick={() => setShowBatchWarning(true)}
                  className="flex-1 bg-green-500 hover:bg-green-400 text-black font-semibold text-xs"
                >
                  {t('editor.aiApplyAll')} ({batchSuggestions.length})
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
              <span className="px-2 py-0.5 rounded bg-white/10 font-mono">{batchSuggestions.length}</span>
              <span>{t('editor.aiHarmonizeWarnCount')}</span>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setShowBatchWarning(false)}
                className="flex-1 border-white/20 text-white/80 hover:bg-white/10 text-xs"
              >
                {t('editor.aiHarmonizeWarnCancel')}
              </Button>
              <Button
                onClick={handleBatchApplyAll}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs"
              >
                {t('editor.aiHarmonizeWarnConfirm')}
              </Button>
            </div>
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
              <Button onClick={refreshSongs} variant="outline" className="border-white/20 hover:bg-white/10" title={t('editor.refreshTitle')}>
                🔄
              </Button>
              <Button
                onClick={() => setSelectMode(!selectMode)}
                variant={selectMode ? 'default' : 'outline'}
                className={selectMode ? 'bg-violet-500 hover:bg-violet-400' : 'border-white/20 text-white'}
              >
                {selectMode ? '✕' : '☑️'}
              </Button>
              <Button onClick={onBack} variant="outline" className="border-white/20 hover:bg-white/10">
                ← {t('editor.back')}
              </Button>
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
              >
                🎸 {t('editor.noGenre')} ({songsWithoutGenre})
              </Button>
              <Button
                onClick={() => setFilterMode(filterMode === 'no-language' ? 'all' : 'no-language')}
                variant={filterMode === 'no-language' ? 'default' : 'outline'}
                className={filterMode === 'no-language' ? 'bg-purple-500' : 'border-white/20 text-white'}
                size="sm"
              >
                🌐 {t('editor.noLanguage')} ({songsWithoutLanguage})
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
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center mb-1 group-hover:bg-cyan-500/20 transition-colors">
                  <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <span className="text-[10px] font-medium text-white/60 group-hover:text-white/80 transition-colors">{t('editor.newSong')}</span>
              </button>
            )}
            {filteredSongs.map(song => (
              <button
                key={song.id}
                onClick={() => handleCardClick(song)}
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
                    <img src={song.coverImage} alt={song.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg opacity-50">🎵</span>
                    </div>
                  )}
                </div>
                {/* Song Info */}
                <div className="p-1.5">
                  <p className="font-medium truncate text-[10px]">{song.title}</p>
                  <p className="text-[9px] text-white/60 truncate">{song.artist}</p>
                  <div className="flex gap-0.5 mt-0.5">
                    <span className="text-[8px] text-white/40">{song.bpm}</span>
                    {!song.genre && <span className="text-[8px] text-orange-400">🎸</span>}
                    {!song.language && <span className="text-[8px] text-purple-400">🌐</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>

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
            {/* Toggle Metadata Panel Button */}
            <button
              onClick={() => setShowMetadataPanel(!showMetadataPanel)}
              className="absolute top-2 right-2 z-10 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title={showMetadataPanel ? t('editor.hideMetadata') : t('editor.showMetadata')}
            >
              🏷️
            </button>
            <KaraokeEditor
              song={selectedSong}
              onSave={handleSave}
              onCancel={() => setSelectedSong(null)}
            />
          </div>

          {/* Right Sidebar - Genre/Language Editor - Collapsible */}
          {showMetadataPanel && (
            <div className="w-80 flex-shrink-0 overflow-y-auto border-l border-white/10 p-4 space-y-4">
              <GenreLanguageEditor
                key={selectedSong?.id ?? 'none'}
                song={selectedSong}
                onUpdate={handleSongMetadataUpdate}
                onSaved={refreshSongs}
                t={t}
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
          >
            {t('editor.aiBatchSelectAll')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={clearSelection}
            className="border-white/20 text-white/80 hover:bg-white/10 text-xs h-8"
          >
            {t('editor.aiBatchClear')}
          </Button>
          <Button
            size="sm"
            onClick={handleBatchSuggest}
            disabled={batchLoading}
            className="bg-violet-500 hover:bg-violet-400 text-white font-semibold text-xs h-8 gap-1.5"
          >
            {batchLoading ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>🤖</span>
            )}
            {t('editor.aiBatchSuggestBtn')}
          </Button>
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
          <button onClick={() => setBatchError(null)} className="absolute top-2 right-2 text-white/60 hover:text-white">✕</button>
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
