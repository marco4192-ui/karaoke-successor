'use client';

import { useState, useMemo, useCallback } from 'react';
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
            {/* New Song Button - First card */}
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
            {filteredSongs.map(song => (
              <button
                key={song.id}
                    onClick={() => handleSelectSong(song)}
                    className="theme-adaptive-bg hover:brightness-110 border border-white/10 hover:border-cyan-500/50 rounded-lg overflow-hidden transition-all group"
                  >
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
