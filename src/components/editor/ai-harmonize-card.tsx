'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateSong } from '@/lib/game/song-library';
import { Song } from '@/types/game';

interface HarmonizeSuggestion {
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

export function AiHarmonizeCard({
  songs,
  onApplied,
  t,
}: {
  songs: Song[];
  onApplied: () => void;
  t: (key: string) => string;
}) {
  const [suggestions, setSuggestions] = useState<HarmonizeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only show songs that have genre or language missing
  const songsToHarmonize = useMemo(() =>
    songs.filter(s => !s.genre || !s.language).slice(0, 50),
    [songs],
  );

  const handleHarmonize = useCallback(async () => {
    if (songsToHarmonize.length === 0) return;
    setIsLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const res = await fetch('/api/harmonize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songs: songsToHarmonize.map(s => ({
            id: s.id, title: s.title, artist: s.artist,
            genre: s.genre || null, language: s.language || null,
          })),
        }),
      });
      const data = await res.json();
      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions.filter(
          (s: HarmonizeSuggestion) => s.suggestedGenre || s.suggestedLanguage
        ));
      } else {
        setError(data.error || 'Failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, [songsToHarmonize]);

  const handleApplySingle = useCallback((suggestion: HarmonizeSuggestion, field: 'genre' | 'language') => {
    const value = field === 'genre' ? suggestion.suggestedGenre : suggestion.suggestedLanguage;
    if (!value) return;
    updateSong(suggestion.songId, { [field]: value });
    setSuggestions(prev => prev.filter(s => s.songId !== suggestion.songId));
    onApplied();
  }, [onApplied]);

  const handleApplyAll = useCallback(() => {
    suggestions.forEach(s => {
      const updates: Partial<Song> = {};
      if (s.suggestedGenre) updates.genre = s.suggestedGenre;
      if (s.suggestedLanguage) updates.language = s.suggestedLanguage;
      if (Object.keys(updates).length > 0) {
        updateSong(s.songId, updates);
      }
    });
    setSuggestions([]);
    onApplied();
  }, [suggestions, onApplied]);

  const dismissed = suggestions.length === 0 && !isLoading && !error;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          🤖 {t('editor.aiHarmonize')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dismissed ? (
          <p className="text-xs text-white/40">{t('editor.aiHarmonizeDesc')}</p>
        ) : null}

        {suggestions.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {suggestions.map(s => (
              <div key={s.songId} className="bg-white/5 rounded-lg p-2 text-xs space-y-1">
                <p className="font-medium text-white/80 truncate">{s.artist} - {s.title}</p>
                {s.suggestedGenre && s.suggestedGenre !== s.currentGenre && (
                  <div className="flex items-center gap-1">
                    <span className="text-red-400 line-through">{s.currentGenre || '-'}</span>
                    <span className="text-white/40">→</span>
                    <span className="text-green-400">{s.suggestedGenre}</span>
                    <span className="text-white/30">({s.genreConfidence}%)</span>
                    <button
                      onClick={() => handleApplySingle(s, 'genre')}
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
                      onClick={() => handleApplySingle(s, 'language')}
                      className="ml-auto px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    >✓</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleHarmonize}
            disabled={isLoading || songsToHarmonize.length === 0}
            className="flex-1 border-violet-500/50 text-violet-400 hover:bg-violet-500/10 text-xs"
          >
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mr-1" />
            ) : null}
            {isLoading ? t('editor.aiHarmonizeLoading') : t('editor.aiHarmonizeBtn')}
          </Button>
          {suggestions.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleApplyAll}
              className="border-green-500/50 text-green-400 hover:bg-green-500/10 text-xs"
            >
              {t('editor.aiApplyAll')} ({suggestions.length})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
