'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Song } from '@/types/game';
import { updateSong } from '@/lib/game/song-library';
import { saveSongToTxt } from '@/lib/editor/save-to-file';
import { logger } from '@/lib/logger';

// Common genres for quick selection
const COMMON_GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Country', 'Electronic', 'Dance',
  'Jazz', 'Blues', 'Soul', 'Funk', 'Reggae', 'Latin', 'Metal',
  'Punk', 'Indie', 'Folk', 'Classical', 'Soundtrack', 'Musical',
  'Schlager', 'Deutsch-Pop', 'Volksmusik', 'K-Pop', 'J-Pop'
];

// Common languages for quick selection
const COMMON_LANGUAGES = [
  { code: 'en', name: 'Englisch' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Spanisch' },
  { code: 'fr', name: 'Französisch' },
  { code: 'it', name: 'Italienisch' },
  { code: 'pt', name: 'Portugiesisch' },
  { code: 'ja', name: 'Japanisch' },
  { code: 'ko', name: 'Koreanisch' },
  { code: 'zh', name: 'Chinesisch' },
  { code: 'ru', name: 'Russisch' },
  { code: 'nl', name: 'Niederländisch' },
  { code: 'pl', name: 'Polnisch' },
  { code: 'tr', name: 'Türkisch' },
  { code: 'ar', name: 'Arabisch' },
  { code: 'sv', name: 'Schwedisch' },
  { code: 'la', name: 'Latein' },
];

export interface GenreLanguageEditorProps {
  song: Song;
  onUpdate: (updates: Partial<Song>) => void;
}

export function GenreLanguageEditor({ song, onUpdate }: GenreLanguageEditorProps) {
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [customGenre, setCustomGenre] = useState(song.genre || '');
  const [customLanguage, setCustomLanguage] = useState(song.language || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleGenreSelect = (genre: string) => {
    setCustomGenre(genre);
    onUpdate({ genre });
    setShowGenreDropdown(false);
  };

  const handleLanguageSelect = (code: string) => {
    setCustomLanguage(code);
    onUpdate({ language: code });
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
      const updatedSong = {
        ...song,
        genre: customGenre || undefined,
        language: customLanguage || undefined
      };
      updateSong(song.id, updatedSong);

      const result = await saveSongToTxt(updatedSong);

      if (result.success) {
        setSaveMessage(`✅ ${result.message}`);
      } else {
        setSaveMessage(`❌ ${result.message}`);
      }

      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      logger.error('[GenreLanguageEditor]', 'Save error:', error);
      setSaveMessage('❌ Fehler beim Speichern');
      setTimeout(() => setSaveMessage(null), 3000);
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
                    {COMMON_GENRES.map(genre => (
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
                  🌐 {COMMON_LANGUAGES.find(l => l.code === customLanguage)?.name || customLanguage || 'Sprache auswählen...'}
                </span>
                <svg className={`w-4 h-4 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </Button>
              {showLanguageDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  <div className="p-2">
                    {COMMON_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang.code)}
                        className={`w-full px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                          customLanguage === lang.code
                            ? 'bg-purple-500 text-white'
                            : 'hover:bg-white/10 text-white/80'
                        }`}
                      >
                        {lang.name} ({lang.code})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <Input
            placeholder="Oder eigenen Sprachcode eingeben (z.B. 'en', 'de')..."
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
