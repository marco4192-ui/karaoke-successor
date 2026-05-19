'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { updateSong } from '@/lib/game/song-library';
import { Song } from '@/types/game';
import { saveSongToTxt } from '@/lib/editor/save-to-file';

import { GENRES, LANGUAGES } from '@/lib/constants';

export function GenreLanguageEditor({
  song,
  onUpdate,
  onSaved,
  t,
}: {
  song: Song;
  onUpdate: (_updates: Partial<Song>) => void;
  onSaved?: () => void;
  t: (key: string) => string;
}) {
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [customGenre, setCustomGenre] = useState(song.genre || '');
  const [customLanguage, setCustomLanguage] = useState(song.language || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const saveMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── AI metadata suggestion state ──
  const [aiSuggestion, setAiSuggestion] = useState<{ genre?: string; language?: string } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  // ── AI Genre/Language suggestion ──
  const handleAiSuggest = useCallback(async () => {
    setIsAiLoading(true);
    setAiSuggestion(null);
    try {
      const input = `${song.artist} - ${song.title}`;
      const res = await fetch('/api/song-identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, type: 'filename' }),
      });
      const data = await res.json();
      if (data.success && data.metadata) {
        setAiSuggestion({
          genre: data.metadata.genre,
          language: data.metadata.language,
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[Editor] AI suggestion failed:', e);
    } finally {
      setIsAiLoading(false);
    }
  }, [song.artist, song.title]);

  const handleAcceptSuggestion = useCallback((field: 'genre' | 'language') => {
    if (!aiSuggestion) return;
    const value = aiSuggestion[field];
    if (!value) return;
    if (field === 'genre') {
      setCustomGenre(value);
      onUpdate({ genre: value });
    } else {
      setCustomLanguage(value);
      onUpdate({ language: value });
    }
  }, [aiSuggestion, onUpdate]);

  const handleSaveToTxt = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Update the song in the library
      const updatedSong = {
        ...song,
        genre: customGenre || undefined,
        language: customLanguage || undefined,
      };
      updateSong(song.id, updatedSong);

      // Save to txt file using the unified save function
      const result = await saveSongToTxt(updatedSong);

      if (result.success) {
        setSaveMessage(`✅ ${result.message}`);
        onSaved?.();
      } else {
        setSaveMessage(`❌ ${result.message}`);
      }

      if (saveMessageTimerRef.current) clearTimeout(saveMessageTimerRef.current);
      saveMessageTimerRef.current = setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Save error:', error);
      setSaveMessage(t('editor.saveError'));
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
          🏷️ {t('editor.metadataTitle')}
        </CardTitle>
        <CardDescription>
          {t('editor.metadataDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Suggest Button — always available for suggestion or verification */}
        <button
          onClick={handleAiSuggest}
          disabled={isAiLoading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-500/30 text-white/80 hover:from-violet-500/30 hover:to-cyan-500/30 transition-all text-sm"
        >
          {isAiLoading ? (
            <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>🤖</span>
          )}
          {isAiLoading ? t('editor.aiSuggestLoading') : t('editor.aiSuggestMetadata')}
        </button>
        {/* Genre Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">{t('editor.genre')}</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Button
                onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                variant="outline"
                className="w-full justify-between border-white/20 text-white"
              >
                <span className="flex items-center gap-2">
                  🎸 {customGenre || t('editor.selectGenre')}
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
            placeholder={t('editor.customGenre')}
            value={customGenre}
            onChange={(e) => handleCustomGenreChange(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
          {/* AI suggestion badge for genre */}
          {aiSuggestion?.genre && aiSuggestion.genre !== customGenre && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-violet-500/15 border border-violet-500/20">
              <span className="text-xs text-white/50">🤖 {t('editor.aiSuggestion')}:</span>
              <span className="text-xs font-medium text-violet-300">{aiSuggestion.genre}</span>
              <button
                onClick={() => handleAcceptSuggestion('genre')}
                className="ml-auto text-xs px-2 py-0.5 rounded bg-violet-500/30 text-violet-300 hover:bg-violet-500/50 transition-colors"
              >{t('editor.aiAccept')}</button>
            </div>
          )}
        </div>

        {/* Language Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">{t('editor.language')}</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                variant="outline"
                className="w-full justify-between border-white/20 text-white"
              >
                <span className="flex items-center gap-2">
                  🌐 {customLanguage || t('editor.selectLanguage')}
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
            placeholder={t('editor.customLanguage')}
            value={customLanguage}
            onChange={(e) => handleCustomLanguageChange(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
          {/* AI suggestion badge for language */}
          {aiSuggestion?.language && aiSuggestion.language !== customLanguage && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-violet-500/15 border border-violet-500/20">
              <span className="text-xs text-white/50">🤖 {t('editor.aiSuggestion')}:</span>
              <span className="text-xs font-medium text-violet-300">{aiSuggestion.language}</span>
              <button
                onClick={() => handleAcceptSuggestion('language')}
                className="ml-auto text-xs px-2 py-0.5 rounded bg-violet-500/30 text-violet-300 hover:bg-violet-500/50 transition-colors"
              >{t('editor.aiAccept')}</button>
            </div>
          )}
        </div>

        {/* Current Status */}
        <div className="flex gap-4 text-sm">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${song.genre ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {song.genre ? '✅' : '❌'} {t('editor.genre')}: {song.genre || t('editor.genreNotSet')}
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${song.language ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {song.language ? '✅' : '❌'} {t('editor.language')}: {song.language || t('editor.languageNotSet')}
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
                {t('editor.saving')}
              </>
            ) : (
              <>
                💾 {t('editor.saveChanges')}
              </>
            )}
          </Button>
          {saveMessage && (
            <p className={`text-center mt-2 text-sm ${saveMessage.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
              {saveMessage}
            </p>
          )}
          <p className="text-xs text-white/40 text-center mt-2">
            {t('editor.saveHint')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
