'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs, addSong, updateSong, getSongByIdWithLyrics } from '@/lib/game/song-library';
import { KaraokeEditor } from '@/components/editor/karaoke-editor';
import { NewSongDialog } from '@/components/editor/new-song-dialog';
import { Song } from '@/types/game';
import { saveSongToTxt } from '@/lib/editor/save-to-file';
import { fuzzyMatch } from '@/lib/fuzzy-search';

import { GENRES, LANGUAGES } from '@/lib/constants';

// Genre/Language Editor Component
function GenreLanguageEditor({ 
  song, 
  onUpdate 
}: { 
  song: Song; 
  onUpdate: (updates: Partial<Song>) => void;
}) {
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [customGenre, setCustomGenre] = useState(song.genre || '');
  const [customLanguage, setCustomLanguage] = useState(song.language || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const saveMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear save-message timer on unmount
  useEffect(() => {
    return () => { if (saveMessageTimerRef.current) clearTimeout(saveMessageTimerRef.current); };
  }, []);

  const handleGenreSelect = (genre: string) => {
    setCustomGenre(genre);
    onUpdate({ genre });
    setShowGenreDropdown(false);
  };

  const handleLanguageSelect = (name: string) => {
    setCustomLanguage(name);
    onUpdate({ language: name });
    setShowLanguageDropdown(false);
  };

  const handleCustomGenreChange = (value: string) => {
    setCustomGenre(value);
    onUpdate({ genre: value });
  };

  const handleCustomLanguageChange = (value: string) => {
    setCustomLanguage(value);
    onUpdate({ language: value });
  };

  const handleSaveToTxt = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // Update the song in the library
      const updatedSong = { 
        ...song, 
        genre: customGenre || undefined,
        language: customLanguage || undefined 
      };
      updateSong(song.id, updatedSong);
      
      // Save to txt file using the unified save function
      const result = await saveSongToTxt(updatedSong);
      
      if (result.success) {
        setSaveMessage(`✅ ${result.message}`);
      } else {
        setSaveMessage(`❌ ${result.message}`);
      }
      
      if (saveMessageTimerRef.current) clearTimeout(saveMessageTimerRef.current);
      saveMessageTimerRef.current = setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveMessage('❌ Fehler beim Speichern');
      if (saveMessageTimerRef.current) clearTimeout(saveMessageTimerRef.current);
      saveMessageTimerRef.current = setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          🏷️ Metadaten ergänzen
        </CardTitle>
        <CardDescription>
          Genre und Sprache für diesen Song hinzufügen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Genre Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">Genre</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Button
                onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                variant="outline"
                className="w-full justify-between border-white/20 text-white"
              >
                <span className="flex items-center gap-2">
                  🎸 {customGenre || 'Genre auswählen...'}
                </span>
                <svg className={`w-4 h-4 transition-transform ${showGenreDropdown ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </Button>
              {showGenreDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  <div className="p-2 grid grid-cols-2 gap-1">
                    {GENRES.map(genre => (
                      <button
                        key={genre}
                        onClick={() => handleGenreSelect(genre)}
                        className={`px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                          customGenre === genre 
                            ? 'bg-cyan-500 text-white' 
                            : 'hover:bg-white/10 text-white/80'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <Input
            placeholder="Oder eigenes Genre eingeben..."
            value={customGenre}
            onChange={(e) => handleCustomGenreChange(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        {/* Language Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">Sprache</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                variant="outline"
                className="w-full justify-between border-white/20 text-white"
              >
                <span className="flex items-center gap-2">
                  🌐 {customLanguage || 'Sprache auswählen...'}
                </span>
                <svg className={`w-4 h-4 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </Button>
              {showLanguageDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  <div className="p-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang}
                        onClick={() => handleLanguageSelect(lang)}
                        className={`w-full px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                          customLanguage === lang 
                            ? 'bg-purple-500 text-white' 
                            : 'hover:bg-white/10 text-white/80'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <Input
            placeholder="Oder eigene Sprache eingeben..."
            value={customLanguage}
            onChange={(e) => handleCustomLanguageChange(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        {/* Current Status */}
        <div className="flex gap-4 text-sm">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${song.genre ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {song.genre ? '✅' : '❌'} Genre: {song.genre || 'nicht gesetzt'}
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${song.language ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {song.language ? '✅' : '❌'} Sprache: {song.language || 'nicht gesetzt'}
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <Button
            onClick={handleSaveToTxt}
            disabled={isSaving || (!customGenre && !customLanguage)}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Speichere...
              </>
            ) : (
              <>
                💾 Änderungen in TXT-Datei speichern
              </>
            )}
          </Button>
          {saveMessage && (
            <p className={`text-center mt-2 text-sm ${saveMessage.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
              {saveMessage}
            </p>
          )}
          <p className="text-xs text-white/40 text-center mt-2">
            Fügt #GENRE: und #LANGUAGE: Tags in die TXT-Datei ein
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function EditorScreen({ onBack }: { onBack: () => void }) {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [songs, setSongs] = useState<Song[]>(() => getAllSongs());
  const refreshSongs = useCallback(() => setSongs(getAllSongs()), []);
  const { setSong } = useGameStore();
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
  const incompleteSongs = songs.filter(s => !s.genre || !s.language).length;

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
          console.warn('[EditorScreen] Failed to load song with lyrics');
          setSelectedSong(song);
        }
      } catch (error) {
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
            <p className="text-white">Lade Lyrics...</p>
          </div>
        </div>
      )}
      
      {!selectedSong ? (
        <div className="w-full h-full overflow-y-auto p-4 space-y-4">
          {/* Header - Consistent with other screens */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Karaoke Editor</h1>
              <p className="text-white/60">Bearbeite deine Songs</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={refreshSongs} variant="outline" className="border-white/20 hover:bg-white/10" title="Songliste neu laden">
                🔄
              </Button>
              <Button onClick={onBack} variant="outline" className="border-white/20 hover:bg-white/10">
                ← Zurück
              </Button>
            </div>
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
            
            {/* Filter Buttons - Only for no-genre and no-language */}
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
            {/* New Song Button - First card */}
            <button
              onClick={() => setShowNewSongDialog(true)}
              className="border-2 border-dashed border-white/20 hover:border-cyan-500/50 rounded-xl overflow-hidden transition-all group flex flex-col items-center justify-center min-h-[200px] hover:bg-white/5"
            >
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-3 group-hover:bg-cyan-500/20 transition-colors">
                <svg className="w-8 h-8 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <span className="text-sm font-medium text-white/60 group-hover:text-white/80 transition-colors">Neuer Song</span>
              <span className="text-xs text-white/30 mt-1">Songtext & Metadaten</span>
            </button>
            {filteredSongs.map(song => (
              <button
                key={song.id}
                    onClick={() => handleSelectSong(song)}
                    className="theme-adaptive-bg hover:brightness-110 border border-white/10 hover:border-cyan-500/50 rounded-xl overflow-hidden transition-all group"
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
        <div className="flex h-full">
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
