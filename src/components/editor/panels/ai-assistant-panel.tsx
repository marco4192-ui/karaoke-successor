'use client';

/**
 * AI Assistant Panel for the Karaoke Editor (Code Review #6, 2026-04-17)
 *
 * Provides AI-powered features integrated into the editing workflow:
 * - Song identification from metadata (filename-based AI lookup)
 * - Lyrics analysis with improvement suggestions (spelling, timing, gaps)
 * - Cover art generation (AI-generated album art)
 *
 * Integrates with AI API routes:
 * - /api/song-identify → identifySong() from song-identifier.ts
 * - /api/lyrics-suggestions → analyzeLyrics() from lyrics-assistant.ts
 * - /api/cover-generate → generateCoverArt() from cover-generator.ts
 *
 * Re-imported from dead code state. Added as a new tab in the editor sidebar.
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { identifySong, SongMetadata } from '@/lib/ai/song-identifier';
import { analyzeLyrics, LyricSuggestion } from '@/lib/ai/lyrics-assistant';
import { generateCoverArt } from '@/lib/ai/cover-generator';
import { Song, LyricLine } from '@/types/game';

// ===================== Types =====================

interface AIAssistantPanelProps {
  song: Song;
  onSongUpdate: (updates: Partial<Song>) => void;
  onLyricsUpdate: (lyrics: LyricLine[]) => void;
}

interface SuggestionItem {
  id: string;
  type: 'metadata' | 'lyrics' | 'cover';
  title: string;
  description: string;
  confidence: number;
  action: () => void;
  dismiss: () => void;
}

// ===================== AI Status Badge =====================

function AIStatusBadge({ status }: { status: 'idle' | 'loading' | 'success' | 'error' }) {
  const config = {
    idle: { label: 'Bereit', className: 'bg-gray-500/20 text-gray-400' },
    loading: { label: 'Lädt...', className: 'bg-yellow-500/20 text-yellow-400 animate-pulse' },
    success: { label: 'Fertig', className: 'bg-green-500/20 text-green-400' },
    error: { label: 'Fehler', className: 'bg-red-500/20 text-red-400' },
  };

  const { label, className } = config[status];

  return (
    <Badge className={`text-xs ${className}`}>
      🤖 {label}
    </Badge>
  );
}

// ===================== Confidence Bar =====================

function ConfidenceBar({ confidence }: { confidence: number }) {
  const getColor = (conf: number) => {
    if (conf >= 80) return 'bg-green-500';
    if (conf >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <Progress 
        value={confidence} 
        className={`h-1.5 flex-1 [&>div]:${getColor(confidence)}`}
      />
      <span className="text-xs text-white/60 w-8">{confidence}%</span>
    </div>
  );
}

// ===================== Suggestion Card =====================

interface SuggestionCardProps {
  suggestion: LyricSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}

function SuggestionCard({ suggestion, onAccept, onDismiss }: SuggestionCardProps) {
  const typeIcons = {
    correction: '✏️',
    timing: '⏱️',
    gap: '📝',
    language: '🌐',
  };

  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>{typeIcons[suggestion.type]}</span>
          <Badge variant="outline" className="text-xs border-white/20">
            Zeile {suggestion.lineIndex + 1}
          </Badge>
        </div>
        <ConfidenceBar confidence={suggestion.confidence} />
      </div>
      
      <div className="space-y-1">
        <p className="text-sm text-red-400 line-through">{suggestion.original}</p>
        <p className="text-sm text-green-400">→ {suggestion.suggested}</p>
      </div>
      
      <p className="text-xs text-white/50">{suggestion.reason}</p>
      
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onAccept} className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400">
          ✓ Übernehmen
        </Button>
        <Button size="sm" onClick={onDismiss} variant="outline" className="flex-1 border-white/10 text-white/60">
          ✗ Verwerfen
        </Button>
      </div>
    </div>
  );
}

// ===================== Main Component =====================

export function AIAssistantPanel({ song, onSongUpdate, onLyricsUpdate }: AIAssistantPanelProps) {
  // State
  const [identifyStatus, setIdentifyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lyricsStatus, setLyricsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [coverStatus, setCoverStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const [suggestions, setSuggestions] = useState<LyricSuggestion[]>([]);
  const [identifiedMetadata, setIdentifiedMetadata] = useState<SongMetadata | null>(null);
  const [generatedCover, setGeneratedCover] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);

  // Identify Song
  const handleIdentify = useCallback(async () => {
    setIdentifyStatus('loading');
    setError(null);

    const filename = `${song.artist} - ${song.title}`;
    const result = await identifySong(filename, 'filename');

    if (result.success && result.metadata) {
      setIdentifiedMetadata(result.metadata);
      setIdentifyStatus('success');
    } else {
      setIdentifyStatus('error');
      setError(result.error || 'Erkennung fehlgeschlagen');
    }
  }, [song.artist, song.title]);

  // Apply identified metadata
  const applyIdentifiedMetadata = useCallback(() => {
    if (!identifiedMetadata) return;

    onSongUpdate({
      title: identifiedMetadata.title || song.title,
      artist: identifiedMetadata.artist || song.artist,
      year: identifiedMetadata.year ?? song.year,
      genre: identifiedMetadata.genre ?? song.genre,
      bpm: identifiedMetadata.bpm ?? song.bpm,
      language: identifiedMetadata.language ?? song.language,
    });

    setIdentifiedMetadata(null);
    setIdentifyStatus('idle');
  }, [identifiedMetadata, onSongUpdate, song]);

  // Analyze Lyrics
  const handleAnalyzeLyrics = useCallback(async () => {
    setLyricsStatus('loading');
    setError(null);

    const lyricsData = song.lyrics.map(line => ({
      text: line.notes.map(n => n.lyric).join(' '),
      startTime: line.startTime,
      endTime: line.endTime,
    }));

    const result = await analyzeLyrics(lyricsData, {
      title: song.title,
      artist: song.artist,
      bpm: song.bpm,
    });

    if (result.success && result.suggestions) {
      setSuggestions(result.suggestions);
      setLyricsStatus(result.suggestions.length > 0 ? 'success' : 'idle');
    } else {
      setLyricsStatus('error');
      setError(result.error || 'Analyse fehlgeschlagen');
    }
  }, [song.title, song.artist, song.genre]);

  // Accept suggestion
  const acceptSuggestion = useCallback((index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion) return;

    // Update lyrics based on suggestion
    const updatedLyrics = [...song.lyrics];
    const line = updatedLyrics[suggestion.lineIndex];
    
    if (line) {
      // Update the lyric text
      const words = suggestion.suggested.split(' ');
      let charIndex = 0;
      
      line.notes = line.notes.map((note, i) => {
        const newLyric = words[i] || note.lyric;
        charIndex += newLyric.length + 1;
        return { ...note, lyric: newLyric };
      });
      
      onLyricsUpdate(updatedLyrics);
    }

    // Remove from suggestions
    setSuggestions(prev => prev.filter((_, i) => i !== index));
  }, [suggestions, song.lyrics, onLyricsUpdate]);

  // Dismiss suggestion
  const dismissSuggestion = useCallback((index: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Accept all suggestions — iterate backwards to avoid index shift during removal
  const acceptAllSuggestions = useCallback(() => {
    // Process from last to first so that filtering doesn't affect earlier indices
    const updatedLyrics = [...song.lyrics];
    for (let i = suggestions.length - 1; i >= 0; i--) {
      const suggestion = suggestions[i];
      const line = updatedLyrics[suggestion.lineIndex];
      if (!line) continue;

      const words = suggestion.suggested.split(' ');
      line.notes = line.notes.map((note, i) => {
        const newLyric = words[i] || note.lyric;
        return { ...note, lyric: newLyric };
      });
    }
    onLyricsUpdate(updatedLyrics);
    setSuggestions([]);
  }, [suggestions, song.lyrics, onLyricsUpdate]);

  // Generate Cover
  const handleGenerateCover = useCallback(async () => {
    setCoverStatus('loading');
    setError(null);

    const result = await generateCoverArt({
      title: song.title,
      artist: song.artist,
      genre: song.genre,
    });

    if (result.success && result.image) {
      setGeneratedCover(result.image);
      setCoverStatus('success');
    } else {
      setCoverStatus('error');
      setError(result.error || 'Generierung fehlgeschlagen');
    }
  }, [song.title, song.artist, song.genre]);

  // Apply generated cover
  const applyGeneratedCover = useCallback(() => {
    if (!generatedCover) return;

    const dataUrl = `data:image/png;base64,${generatedCover}`;
    onSongUpdate({ coverImage: dataUrl });
    setGeneratedCover(null);
  }, [generatedCover, onSongUpdate]);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          🤖 KI-ASSISTENT
          <AIStatusBadge status={identifyStatus === 'loading' || lyricsStatus === 'loading' || coverStatus === 'loading' ? 'loading' : 'idle'} />
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={handleIdentify}
            disabled={identifyStatus === 'loading'}
            className="w-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30"
          >
            🎵 Lied erkennen
          </Button>

          <Button
            onClick={handleAnalyzeLyrics}
            disabled={lyricsStatus === 'loading'}
            className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30"
          >
            📝 Lyrics analysieren
          </Button>

          <Button
            onClick={handleGenerateCover}
            disabled={coverStatus === 'loading'}
            className="w-full bg-gradient-to-r from-orange-500/20 to-yellow-500/20 hover:from-orange-500/30 hover:to-yellow-500/30 border border-orange-500/30"
          >
            🖼️ Cover generieren
          </Button>
        </div>

        <Separator className="bg-white/10" />

        {/* Identified Metadata */}
        {identifiedMetadata && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-cyan-400">Erkannte Metadaten</h4>
            <ConfidenceBar confidence={identifiedMetadata.confidence} />
            
            <div className="p-2 rounded bg-white/5 text-xs space-y-1">
              <p><span className="text-white/50">Titel:</span> {identifiedMetadata.title}</p>
              <p><span className="text-white/50">Artist:</span> {identifiedMetadata.artist}</p>
              {identifiedMetadata.genre && (
                <p><span className="text-white/50">Genre:</span> {identifiedMetadata.genre}</p>
              )}
              {identifiedMetadata.bpm && (
                <p><span className="text-white/50">BPM:</span> {identifiedMetadata.bpm}</p>
              )}
            </div>
            
            <Button size="sm" onClick={applyIdentifiedMetadata} className="w-full">
              ✓ Übernehmen
            </Button>
          </div>
        )}

        {/* Generated Cover Preview */}
        {generatedCover && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-orange-400">Generiertes Cover</h4>
            <img 
              src={`data:image/png;base64,${generatedCover}`} 
              alt="Generated cover"
              className="w-full rounded-lg border border-white/10"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={applyGeneratedCover} className="flex-1">
                ✓ Verwenden
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setGeneratedCover(null)}
                className="flex-1 border-white/10"
              >
                ✗ Verwerfen
              </Button>
            </div>
          </div>
        )}

        {/* Suggestions List */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-purple-400">
                💡 Vorschläge ({suggestions.length})
              </h4>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={acceptAllSuggestions}
                className="text-xs text-green-400 hover:text-green-300"
              >
                Alle übernehmen
              </Button>
            </div>
            
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-2">
                {suggestions.map((suggestion, index) => (
                  <SuggestionCard
                    key={`${suggestion.lineIndex}-${index}`}
                    suggestion={suggestion}
                    onAccept={() => acceptSuggestion(index)}
                    onDismiss={() => dismissSuggestion(index)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-white/40 pt-2">
          <p>💡 Tipp: KI-Vorschläge sind immer nur Hilfestellungen. Überprüfe alle Änderungen vor dem Speichern.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default AIAssistantPanel;
