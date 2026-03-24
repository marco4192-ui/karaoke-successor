'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAllSongsAsync, updateSong } from '@/lib/game/song-library';
import { Song } from '@/types/game';
import { KaraokeEditor } from '@/components/editor/karaoke-editor';

// Icons
function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function EditorSettingsTab() {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'no-genre' | 'no-language'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
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
  
  // Handle save from editor
  const handleSave = useCallback((updatedSong: Song) => {
    updateSong(updatedSong.id, updatedSong);
    setSelectedSong(null);
    // Reload songs list
    getAllSongsAsync().then(setSongs);
  }, []);
  
  // If a song is selected, show the editor (full width)
  if (selectedSong) {
    return (
      <div className="h-full w-full">
        <div className="h-full bg-slate-950 overflow-hidden">
          <KaraokeEditor
            song={selectedSong}
            onSave={handleSave}
            onCancel={() => setSelectedSong(null)}
          />
        </div>
      </div>
    );
  }
  
  // Song selection view - Full width tile grid
  return (
    <div className="h-full flex flex-col">
      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 px-4 pb-4 flex-shrink-0">
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
      
      {/* Song Grid - Scrollable */}
      <ScrollArea className="flex-1 px-4">
        {filteredSongs.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <div className="text-4xl mb-2">📝</div>
            <p>Keine Songs gefunden</p>
            <p className="text-sm">Versuche andere Filterkriterien</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 pb-4">
            {filteredSongs.map(song => (
              <button
                key={song.id}
                onClick={() => setSelectedSong(song)}
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
      </ScrollArea>
    </div>
  );
}
