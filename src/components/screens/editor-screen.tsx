'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs, updateSong, getSongByIdWithLyrics } from '@/lib/game/song-library';
import { KaraokeEditor } from '@/components/editor/karaoke-editor';
import { GenreLanguageEditor } from '@/components/editor/genre-language-editor';
import { Song } from '@/types/game';
import { logger } from '@/lib/logger';

export function EditorScreen({ onBack }: { onBack: () => void }) {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [songs] = useState<Song[]>(() => getAllSongs());
  const { setSong } = useGameStore();
  const [filterMode, setFilterMode] = useState<'all' | 'no-genre' | 'no-language' | 'incomplete'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

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

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.artist.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [songs, filterMode, searchQuery]);

  // Count songs without genre/language
  const songsWithoutGenre = songs.filter(s => !s.genre).length;
  const songsWithoutLanguage = songs.filter(s => !s.language).length;

  // Handle song selection - load lyrics from IndexedDB if needed
  const handleSelectSong = async (song: Song) => {
    logger.debug('[EditorScreen]', 'Selecting song:', song.id, song.title);

    // If song has no lyrics but has storedTxt, load from IndexedDB
    if ((!song.lyrics || song.lyrics.length === 0) && song.storedTxt) {
      setIsLoadingLyrics(true);
      logger.info('[EditorScreen]', 'Loading lyrics from IndexedDB...');

      try {
        const songWithLyrics = await getSongByIdWithLyrics(song.id);
        if (songWithLyrics) {
          setSelectedSong(songWithLyrics);
        } else {
          setSelectedSong(song);
        }
      } catch (error) {
        logger.error('[EditorScreen]', 'Error loading lyrics:', error);
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
    setSelectedSong(null);
  };

  const handleSongMetadataUpdate = (updates: Partial<Song>) => {
    if (selectedSong) {
      setSelectedSong({ ...selectedSong, ...updates } as Song);
    }
  };

  return (
    <div className="w-full h-full relative">
      {/* Loading Overlay */}
      {isLoadingLyrics && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white">Lade Lyrics...</p>
          </div>
        </div>
      )}

      {!selectedSong ? (
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Karaoke Editor</h1>
              <p className="text-white/60">Bearbeite deine Songs</p>
            </div>
            <Button onClick={onBack} variant="outline" className="border-white/20">
              ← Zurück
            </Button>
          </div>

          {/* Search and Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Input
                placeholder="Songs suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-10"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => setFilterMode(filterMode === 'no-genre' ? 'all' : 'no-genre')}
                variant={filterMode === 'no-genre' ? 'default' : 'outline'}
                className={filterMode === 'no-genre' ? 'bg-orange-500' : 'border-white/20 text-white'}
                size="sm"
              >
                🎸 Kein Genre ({songsWithoutGenre})
              </Button>
              <Button
                onClick={() => setFilterMode(filterMode === 'no-language' ? 'all' : 'no-language')}
                variant={filterMode === 'no-language' ? 'default' : 'outline'}
                className={filterMode === 'no-language' ? 'bg-purple-500' : 'border-white/20 text-white'}
                size="sm"
              >
                🌐 Keine Sprache ({songsWithoutLanguage})
              </Button>
            </div>
          </div>

          {/* Songs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredSongs.map(song => (
              <button
                key={song.id}
                onClick={() => handleSelectSong(song)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 rounded-xl overflow-hidden transition-all group"
              >
                {/* Cover Image */}
                <div className="relative aspect-square bg-gradient-to-br from-purple-600/30 to-blue-600/30 overflow-hidden">
                  {song.coverImage ? (
                    <img src={song.coverImage} alt={song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl opacity-50">🎵</span>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm font-medium">Bearbeiten</span>
                  </div>
                </div>
                {/* Song Info */}
                <div className="p-3">
                  <p className="font-medium truncate text-sm">{song.title}</p>
                  <p className="text-xs text-white/60 truncate">{song.artist}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{song.bpm} BPM</Badge>
                    {!song.genre && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/50 text-orange-400">🎸</Badge>
                    )}
                    {!song.language && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/50 text-purple-400">🌐</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredSongs.length === 0 && (
            <div className="text-center py-12 text-white/40">
              <div className="text-4xl mb-2">📝</div>
              <p>Keine Songs gefunden</p>
              <p className="text-sm">Versuche andere Filterkriterien</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-[calc(100vh-5rem)]">
          {/* Editor - Full width */}
          <div className="flex-1 min-w-0 overflow-hidden relative">
            {/* Toggle Metadata Panel Button */}
            <button
              onClick={() => setShowMetadataPanel(!showMetadataPanel)}
              className="absolute top-2 right-2 z-10 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title={showMetadataPanel ? 'Metadaten ausblenden' : 'Metadaten anzeigen'}
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
            <div className="w-80 flex-shrink-0 overflow-y-auto border-l border-white/10 p-4">
              <GenreLanguageEditor
                song={selectedSong}
                onUpdate={handleSongMetadataUpdate}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
