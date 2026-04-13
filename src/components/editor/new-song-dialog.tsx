'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { X, Save, Music, FileText, Sparkles, FolderOpen, Film, Image } from 'lucide-react';
import type { Song, LyricLine, Note } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';
import { parseLyricsToSyllables, syllablesToUltraStarNotes, type SyllableResult } from '@/lib/editor/syllable-separator';
import { isTauri } from '@/lib/tauri-file-storage';
import { nativePickFileOpen } from '@/lib/native-fs';

interface NewSongDialogProps {
  onSave: (song: Song) => void;
  onCancel: () => void;
}

const DEFAULT_GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Country', 'Electronic', 'Dance',
  'Jazz', 'Blues', 'Soul', 'Funk', 'Reggae', 'Latin', 'Metal',
  'Punk', 'Indie', 'Folk', 'Classical', 'Soundtrack', 'Schlager',
  'Deutsch-Pop', 'Volksmusik', 'K-Pop', 'J-Pop',
];

const DEFAULT_LANGUAGES = [
  'Deutsch', 'Englisch', 'Spanisch', 'Französisch', 'Italienisch',
  'Portugiesisch', 'Japanisch', 'Koreanisch', 'Chinesisch', 'Russisch',
  'Niederländisch', 'Polnisch', 'Türkisch', 'Arabisch', 'Schwedisch',
];

/**
 * New Song Dialog
 * 
 * Allows creating a brand new song from scratch:
 * 1. Enter metadata (title, artist, BPM, genre, language)
 * 2. Paste or type lyrics text
 * 3. Auto-syllabify lyrics into UltraStar note format
 * 4. Preview the generated notes
 * 5. Save as a new song in the library
 */
export function NewSongDialog({ onSave, onCancel }: NewSongDialogProps) {
  // Metadata state
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [bpm, setBpm] = useState(120);
  const [gap, setGap] = useState(0);
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState('');
  const [edition, setEdition] = useState('');

  // Lyrics state
  const [lyricsText, setLyricsText] = useState('');
  const [beatsPerSyllable, setBeatsPerSyllable] = useState(4);
  const [beatsBetweenLines, setBeatsBetweenLines] = useState(8);
  const [basePitch, setBasePitch] = useState(12); // UltraStar relative pitch (C4 area)

  // Media file paths (Tauri filesystem)
  const [audioPath, setAudioPath] = useState('');
  const [videoPath, setVideoPath] = useState('');
  const [coverPath, setCoverPath] = useState('');

  // UI state
  const [syllableResult, setSyllableResult] = useState<SyllableResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse syllables when lyrics text changes
  const handleLyricsChange = useCallback((text: string) => {
    setLyricsText(text);
    if (text.trim().length > 0) {
      const result = parseLyricsToSyllables(text);
      setSyllableResult(result);
    } else {
      setSyllableResult(null);
    }
  }, []);

  // Generate UltraStar note preview
  const notePreview = useMemo(() => {
    if (!syllableResult) return [];
    return syllablesToUltraStarNotes(
      syllableResult,
      0,
      beatsPerSyllable,
      beatsBetweenLines
    );
  }, [syllableResult, beatsPerSyllable, beatsBetweenLines]);

  // Generate Song object from the form data
  const generateSong = useCallback((): Song | null => {
    if (!title.trim() || !artist.trim()) {
      setError('Bitte Titel und Künstler angeben.');
      return null;
    }

    // UltraStar beat duration: beatDuration = 15000 / BPM
    const beatDuration = 15000 / bpm;
    const MIDI_BASE_OFFSET = 48;

    let lyrics: LyricLine[] = [];
    let lineIndex = 0;
    let noteIndex = 0;

    if (syllableResult && syllableResult.lines.length > 0) {
      let currentBeat = 0;
      const lineNotes: Note[] = [];

      for (const line of syllableResult.lines) {
        const lineStartBeat = currentBeat;
        const lineNotesArr: Note[] = [];

        for (const word of line.words) {
          for (let i = 0; i < word.syllables.length; i++) {
            const isLastSyllable = i === word.syllables.length - 1;
            const lyric = isLastSyllable ? `${word.syllables[i]} ` : word.syllables[i];

            const startTime = gap + (currentBeat * beatDuration);
            const duration = beatsPerSyllable * beatDuration;

            lineNotesArr.push({
              id: uuidv4(),
              pitch: basePitch + MIDI_BASE_OFFSET,
              frequency: 440 * Math.pow(2, (basePitch + MIDI_BASE_OFFSET - 69) / 12),
              startTime: Math.round(startTime),
              duration: Math.round(duration),
              lyric,
              isBonus: false,
              isGolden: false,
            });

            currentBeat += beatsPerSyllable;
            noteIndex++;
          }
        }

        const lineStartTime = gap + (lineStartBeat * beatDuration);
        const lineEndTime = lineNotesArr.length > 0
          ? lineNotesArr[lineNotesArr.length - 1].startTime + lineNotesArr[lineNotesArr.length - 1].duration
          : lineStartTime + 2000;

        const lineText = lineNotesArr.map(n => n.lyric).join('');

        lyrics.push({
          id: `line-${lineIndex}`,
          text: lineText.trim(),
          startTime: Math.round(lineStartTime),
          endTime: Math.round(lineEndTime),
          notes: lineNotesArr,
        });

        // Line break
        const lastNote = lineNotesArr[lineNotesArr.length - 1];
        if (lastNote) {
          const lineBreakBeat = Math.round((lastNote.startTime + lastNote.duration - gap) / beatDuration);
          // Already accounted for in the beat progression
        }
        currentBeat += beatsBetweenLines;
        lineIndex++;
      }
    }

    const totalDuration = lyrics.length > 0
      ? Math.max(...lyrics.map(l => l.endTime)) + 5000
      : 180000;

    const song: Song = {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      title: title.trim(),
      artist: artist.trim(),
      album: edition || undefined,
      genre: genre || undefined,
      language: language || undefined,
      duration: totalDuration,
      bpm,
      difficulty: 'medium',
      rating: 3,
      gap,
      lyrics,
      dateAdded: Date.now(),
      // UltraStar TXT metadata
      mp3File: audioPath ? audioPath.split(/[/\\]/).pop() || 'song.mp3' : 'song.mp3',
      // Tauri file paths
      ...(audioPath ? { relativeAudioPath: audioPath } : {}),
      ...(videoPath ? { relativeVideoPath: videoPath } : {}),
      ...(coverPath ? { relativeCoverPath: coverPath, coverImage: coverPath } : {}),
    };

    return song;
  }, [title, artist, bpm, gap, genre, language, edition, syllableResult, beatsPerSyllable, beatsBetweenLines, basePitch, audioPath, videoPath, coverPath]);

  // Handle save
  const handleSave = useCallback(async () => {
    setError(null);
    const song = generateSong();
    if (!song) return;

    setIsSaving(true);
    try {
      onSave(song);
    } catch (err) {
      setError(`Fehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsSaving(false);
    }
  }, [generateSong, onSave]);

  // Pick a file using native Tauri command (bypass ACL) or browser fallback
  const pickFile = useCallback(async (fileType: 'audio' | 'video' | 'cover', setter: (path: string) => void) => {
    if (isTauri()) {
      try {
        const filters = fileType === 'audio'
          ? { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'] }
          : fileType === 'video'
            ? { name: 'Video', extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov'] }
            : { name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] };

        const title = fileType === 'audio'
          ? 'Audiodatei auswählen'
          : fileType === 'video'
            ? 'Videodatei auswählen'
            : 'Cover-Bild auswählen';

        const selected = await nativePickFileOpen(title, filters.name, filters.extensions);
        if (selected) setter(selected);
      } catch (err) {
        console.error(`[NewSong] File picker error:`, err);
      }
    } else {
      // Browser fallback: use hidden file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = fileType === 'audio' ? 'audio/*' : fileType === 'video' ? 'video/*' : 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) setter(file.name);
      };
      input.click();
    }
  }, []);

  const isValid = title.trim().length > 0 && artist.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-900 border-slate-700 text-white w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            Neuen Song erstellen
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Section 1: Metadata */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Metadaten
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-title" className="text-slate-400 text-xs">Titel *</Label>
                <Input
                  id="new-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Songtitel"
                  className="bg-slate-800 border-slate-600"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-artist" className="text-slate-400 text-xs">Künstler *</Label>
                <Input
                  id="new-artist"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Künstlername"
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-bpm" className="text-slate-400 text-xs">BPM</Label>
                <Input
                  id="new-bpm"
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(parseFloat(e.target.value) || 120)}
                  min={20}
                  max={300}
                  step={1}
                  className="bg-slate-800 border-slate-600"
                />
                <p className="text-xs text-slate-600">Beats pro Minute (UltraStar: Beats/4 Takte)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-gap" className="text-slate-400 text-xs">GAP (ms)</Label>
                <Input
                  id="new-gap"
                  type="number"
                  value={gap}
                  onChange={(e) => setGap(parseInt(e.target.value) || 0)}
                  className="bg-slate-800 border-slate-600"
                />
                <p className="text-xs text-slate-600">Verzögerung vor Lyrics-Start</p>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs">Genre</Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Genre wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_GENRES.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs">Sprache</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Sprache wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_LANGUAGES.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-edition" className="text-slate-400 text-xs">Edition / Album</Label>
              <Input
                id="new-edition"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="z.B. Greatest Hits"
                className="bg-slate-800 border-slate-600"
              />
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Section 2: Lyrics Input */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
              <Music className="w-4 h-4" /> Songtext
            </h3>
            <div className="space-y-2">
              <Textarea
                value={lyricsText}
                onChange={(e) => handleLyricsChange(e.target.value)}
                placeholder={`Gib hier den Songtext ein...\n\nJede Zeile wird zu einer Lyrics-Zeile.\nDie Wörter werden automatisch in Silben getrennt.\n\nBeispiel:\nWalking in the rain\nFeeling no pain\nNever going back again`}
                className="bg-slate-800 border-slate-600 min-h-[200px] font-mono text-sm"
              />
              {syllableResult && (
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{syllableResult.lines.length} Zeilen</span>
                  <span>{syllableResult.totalSyllables} Silben</span>
                  <span>{Math.round(syllableResult.totalSyllables * beatsPerSyllable * (15000 / bpm) / 1000)}s geschätzte Dauer</span>
                </div>
              )}
            </div>

            {/* Syllable Settings */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="beats-per-syllable" className="text-slate-400 text-xs">Beats pro Silbe</Label>
                <Input
                  id="beats-per-syllable"
                  type="number"
                  value={beatsPerSyllable}
                  onChange={(e) => setBeatsPerSyllable(parseInt(e.target.value) || 4)}
                  min={1}
                  max={16}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="beats-between-lines" className="text-slate-400 text-xs">Beats zwischen Zeilen</Label>
                <Input
                  id="beats-between-lines"
                  type="number"
                  value={beatsBetweenLines}
                  onChange={(e) => setBeatsBetweenLines(parseInt(e.target.value) || 8)}
                  min={1}
                  max={32}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base-pitch" className="text-slate-400 text-xs">Basis-Tonhöhe (relativ)</Label>
                <Input
                  id="base-pitch"
                  type="number"
                  value={basePitch}
                  onChange={(e) => setBasePitch(parseInt(e.target.value) || 12)}
                  min={0}
                  max={24}
                  className="bg-slate-800 border-slate-600"
                />
                <p className="text-xs text-slate-600">0=C3, 12=C4, 24=C5</p>
              </div>
            </div>

            {/* Preview Toggle */}
            {notePreview.length > 0 && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="border-slate-600 text-slate-400"
                >
                  {showPreview ? 'Vorschau ausblenden' : 'UltraStar Vorschau anzeigen'}
                </Button>
                {showPreview && (
                  <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
                      {notePreview.join('\n')}
                    </pre>
                    <div className="text-xs text-slate-500 mt-2">E</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator className="bg-slate-700" />

          {/* Section 3: Media Files */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> Mediendateien
            </h3>
            <p className="text-xs text-slate-600">
              Optional: Wähle Audio, Video und Cover-Bilddateien aus. In der Tauri-App werden Dateipfade gespeichert.
            </p>
            <div className="grid grid-cols-1 gap-3">
              {/* Audio */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 min-w-0">
                  <Music className="w-4 h-4 text-cyan-400 shrink-0" />
                  <Input
                    value={audioPath}
                    onChange={(e) => setAudioPath(e.target.value)}
                    placeholder="Keine Audiodatei ausgewählt"
                    className="bg-transparent border-none shadow-none focus-visible:ring-0 text-sm h-auto p-0"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pickFile('audio', setAudioPath)}
                  className="border-slate-600 text-slate-400 shrink-0"
                >
                  Durchsuchen
                </Button>
              </div>

              {/* Video */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 min-w-0">
                  <Film className="w-4 h-4 text-purple-400 shrink-0" />
                  <Input
                    value={videoPath}
                    onChange={(e) => setVideoPath(e.target.value)}
                    placeholder="Keine Videodatei ausgewählt"
                    className="bg-transparent border-none shadow-none focus-visible:ring-0 text-sm h-auto p-0"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pickFile('video', setVideoPath)}
                  className="border-slate-600 text-slate-400 shrink-0"
                >
                  Durchsuchen
                </Button>
              </div>

              {/* Cover */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 min-w-0">
                  <Image className="w-4 h-4 text-amber-400 shrink-0" />
                  <Input
                    value={coverPath}
                    onChange={(e) => setCoverPath(e.target.value)}
                    placeholder="Kein Cover-Bild ausgewählt"
                    className="bg-transparent border-none shadow-none focus-visible:ring-0 text-sm h-auto p-0"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pickFile('cover', setCoverPath)}
                  className="border-slate-600 text-slate-400 shrink-0"
                >
                  Durchsuchen
                </Button>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" onClick={onCancel} className="border-slate-600 text-slate-400">
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid || isSaving}
              className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Erstelle...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Song erstellen & bearbeiten
                </>
              )}
            </Button>
          </div>

          {/* Info text */}
          <div className="text-xs text-slate-600 space-y-1">
            <p>Der Song wird mit der Silbentrennung als Notengerüst erstellt. Danach kannst du im Editor die Tonhöhen und Timings anpassen.</p>
            <p>Tipp: Du kannst auch erst nur Metadaten eingeben und den Songtext später im Editor hinzufügen.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
