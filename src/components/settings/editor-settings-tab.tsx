'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAllSongsAsync, updateSong, addSong, getSongByIdWithLyrics } from '@/lib/game/song-library';
import { Song } from '@/types/game';
import { KaraokeEditor } from '@/components/editor/karaoke-editor';
import { NewSongDialog } from '@/components/editor/new-song-dialog';
import { fuzzyMatch } from '@/lib/fuzzy-search';

export function EditorSettingsTab() {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'no-genre' | 'no-language'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewSongDialog, setShowNewSongDialog] = useState(false);
  
  // Load songs
  useEffect(() => {
    const loadSongs = async () => {
      const allSongs = await getAllSongsAsync();
      setSongs(allSongs);
    };
    loadSongs();
  }, []);
  
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
    }
    
    // Apply fuzzy search (tolerant of typos, same as Library)
    if (searchQuery) {
      filtered = filtered.filter(s =>
        fuzzyMatch(searchQuery, s.title) ||
        fuzzyMatch(searchQuery, s.artist) ||
        (s.genre && fuzzyMatch(searchQuery, s.genre)) ||
        (s.album && fuzzyMatch(searchQuery, s.album))
      );
    }
    
    return filtered;
  }, [songs, filterMode, searchQuery]);
  
  // Count songs without genre/language
  const songsWithoutGenre = songs.filter(s => !s.genre).length;
  const songsWithoutLanguage = songs.filter(s => !s.language).length;
  
  // Handle save from editor
  const handleSave = useCallback((updatedSong: Song) => {
    updateSong(updatedSong.id, updatedSong);
    setSelectedSong(null);
    // Reload songs list
    getAllSongsAsync().then(setSongs);
  }, []);

  // Handle new song creation from dialog
  const handleNewSongSave = useCallback((song: Song) => {
    addSong(song);
    setShowNewSongDialog(false);
    setSelectedSong(song);
    // Reload songs list
    getAllSongsAsync().then(setSongs);
  }, []);
  
  // If a song is selected, show the editor (full height, full width)
  if (selectedSong) {
    return (
      <div className="h-[calc(100vh-8rem)] w-full -mx-4 md:-mx-6 overflow-hidden">
        <div className="h-full bg-slate-950 overflow-hidden">
          <KaraokeEditor
            song={selectedSong}
            onSave={handleSave}
            onCancel={() => setSelectedSong(null)}
          />
        </div>
        {/* New Song Dialog (always rendered so it's available from editor view too) */}
        {showNewSongDialog && (
          <NewSongDialog
            onSave={handleNewSongSave}
            onCancel={() => setShowNewSongDialog(false)}
          />
        )}
      </div>
    );
  }
  
  // Song selection view — matches styling of other settings tabs
  return (
    <div className="space-y-6">
      <div className="mb-8"><h1 className="text-3xl font-bold mb-2 theme-adaptive-text">Settings</h1><p className="theme-adaptive-text-muted">Configure your karaoke experience</p></div>
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Song-Editor</span>
            <Button
              onClick={() => setShowNewSongDialog(true)}
              size="sm"
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white text-xs"
            >
              + Neuen Song erstellen
            </Button>
          </CardTitle>
          <CardDescription>
            Wähle einen Song aus, um die Noten, Lyrics und Metadaten zu bearbeiten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
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
          <div className="flex flex-wrap gap-2">
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
        </CardContent>
      </Card>

      {/* Song Grid */}
      {filteredSongs.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <div className="text-4xl mb-2">📝</div>
          <p>Keine Songs gefunden</p>
          <p className="text-sm">Versuche andere Filterkriterien</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredSongs.map(song => (
            <button
              key={song.id}
              onClick={async () => {
                // Load lyrics before opening editor — same logic as EditorScreen
                const needsLyrics = !song.lyrics || song.lyrics.length === 0;
                const canLoadLyrics = song.storedTxt || !!song.relativeTxtPath;
                let songToEdit = song;
                if (needsLyrics && canLoadLyrics) {
                  const loaded = await getSongByIdWithLyrics(song.id);
                  if (loaded) songToEdit = loaded;
                }
                setSelectedSong(songToEdit);
              }}
              className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 rounded-xl overflow-hidden transition-all group text-left"
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
      )}
      {/* New Song Dialog */}
      {showNewSongDialog && (
        <NewSongDialog
          onSave={handleNewSongSave}
          onCancel={() => setShowNewSongDialog(false)}
        />
      )}
    </div>
  );
}
