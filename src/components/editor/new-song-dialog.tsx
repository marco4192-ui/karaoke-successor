'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { X, Save, Music, FileText, Sparkles, FolderOpen, Film, Image as ImageIcon, Activity } from 'lucide-react';
import type { Song } from '@/types/game';
import { parseLyricsToSyllables, type SyllableResult } from '@/lib/editor/syllable-separator';
import { useTranslation } from '@/lib/i18n/translations';
import { isTauri } from '@/lib/tauri-file-storage';
import { nativePickFileOpen } from '@/lib/native-fs';
import { GENRES, LANGUAGES } from '@/lib/constants';
import { useAudioAnalysis } from '@/hooks/use-audio-analysis';

interface NewSongDialogProps {
  onSave: (_song: Song) => void;
  onCancel: () => void;
}

/**
 * New Song Dialog
 *
 * Allows creating a brand new song from scratch:
 * 1. Enter metadata (title, artist, BPM, genre, language)
 * 2. Paste or type lyrics text — syllables are parsed and stored for tap-mode assignment
 * 3. Optionally select audio, video, and cover files
 * 4. BPM can be detected automatically from the audio file
 * 5. Song is created WITHOUT notes — use tap mode in the editor (Space) to add notes
 */
export function NewSongDialog({ onSave, onCancel }: NewSongDialogProps) {
  const { t } = useTranslation();

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
  const [syllableResult, setSyllableResult] = useState<SyllableResult | null>(null);

  // Media file paths (Tauri filesystem)
  const [audioPath, setAudioPath] = useState('');
  const [videoPath, setVideoPath] = useState('');
  const [coverPath, setCoverPath] = useState('');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio analysis for BPM detection
  const { bpmResult, status: bpmStatus, error: bpmError, detectBpm } = useAudioAnalysis();

  // Auto-fill BPM when detection completes
  useEffect(() => {
    if (bpmResult) {
      setBpm(Math.round(bpmResult.bpm));
    }
  }, [bpmResult]);

  // Auto-fill duration when BPM detection completes
  const detectedDurationMs = bpmResult?.duration_ms ?? null;

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

  // Generate Song object from the form data (NO notes — lyrics text stored for tap mode)
  const generateSong = useCallback((): Song | null => {
    if (!title.trim() || !artist.trim()) {
      setError(t('editor.newSongDialog.provideTitleArtist'));
      return null;
    }

    const totalDuration = detectedDurationMs
      ? detectedDurationMs + 5000
      : 180000; // default 3 minutes when no audio loaded

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
      lyrics: [], // empty — notes are added via tap mode in the editor
      dateAdded: Date.now(),
      mp3File: audioPath ? audioPath.split(/[/\\]/).pop() || 'song.mp3' : 'song.mp3',
      ...(audioPath ? { relativeAudioPath: audioPath } : {}),
      ...(videoPath ? { relativeVideoPath: videoPath } : {}),
      ...(coverPath ? { relativeCoverPath: coverPath, coverImage: coverPath } : {}),
      // Store raw lyrics text so the editor can parse syllables for tap-mode assignment
      ...(lyricsText.trim() ? { rawLyrics: lyricsText.trim() } : {}),
    };

    return song;
  }, [title, artist, bpm, gap, genre, language, edition, audioPath, videoPath, coverPath, detectedDurationMs, lyricsText]);

  // Handle save
  const handleSave = useCallback(async () => {
    setError(null);
    const song = generateSong();
    if (!song) return;

    setIsSaving(true);
    try {
      onSave(song);
    } catch (err) {
      setError(`${t('editor.newSongDialog.error')} ${err instanceof Error ? err.message : t('editor.newSongDialog.unknownError')}`);
    } finally {
      setIsSaving(false);
    }
  }, [generateSong, onSave]);

  // Handle BPM detection
  const handleDetectBpm = useCallback(() => {
    if (!audioPath.trim()) return;
    detectBpm(audioPath);
  }, [audioPath, detectBpm]);

  // Pick a file using native Tauri command (bypass ACL) or browser fallback
  const pickFile = useCallback(async (fileType: 'audio' | 'video' | 'cover', setter: (_path: string) => void) => {
    if (isTauri()) {
      try {
        const filters = fileType === 'audio'
          ? { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'] }
          : fileType === 'video'
            ? { name: 'Video', extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov'] }
            : { name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] };

        const title = fileType === 'audio'
          ? t('editor.newSongDialog.selectAudio')
          : fileType === 'video'
            ? t('editor.newSongDialog.selectVideo')
            : t('editor.newSongDialog.selectCover');

        const selected = await nativePickFileOpen(title, filters.name, filters.extensions);
        if (selected) setter(selected);
      } catch (err) {
        // eslint-disable-next-line no-console
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
  const isDetectingBpm = bpmStatus === 'loading' || bpmStatus === 'analyzing';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-900 border-slate-700 text-white w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            {t('editor.newSongDialog.title')}
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
              <FileText className="w-4 h-4" /> {t('editor.newSongDialog.metadata')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-title" className="text-slate-400 text-xs">{t('editor.newSongDialog.titleLabel')}</Label>
                <Input
                  id="new-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('editor.newSongDialog.titlePlaceholder')}
                  className="bg-slate-800 border-slate-600"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-artist" className="text-slate-400 text-xs">{t('editor.newSongDialog.artistLabel')}</Label>
                <Input
                  id="new-artist"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder={t('editor.newSongDialog.artistPlaceholder')}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-bpm" className="text-slate-400 text-xs">{t('editor.newSongDialog.bpm')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="new-bpm"
                    type="number"
                    value={bpm}
                    onChange={(e) => setBpm(parseFloat(e.target.value) || 120)}
                    min={20}
                    max={500}
                    step={1}
                    className="bg-slate-800 border-slate-600"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDetectBpm}
                    disabled={!audioPath.trim() || isDetectingBpm}
                    className="border-slate-600 text-slate-400 shrink-0 whitespace-nowrap"
                    title={audioPath.trim() ? t('editor.newSongDialog.detectBpmTitle') : t('editor.newSongDialog.selectAudioFirst')}
                  >
                    {isDetectingBpm ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
                        {t('editor.newSongDialog.detecting')}
                      </>
                    ) : (
                      <>
                        <Activity className="w-3.5 h-3.5 mr-1.5" />
                        {t('editor.newSongDialog.detectBpm')}
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-600">{t('editor.newSongDialog.bpmInfo')}</p>
                {bpmError && (
                  <p className="text-xs text-red-400">{t('editor.newSongDialog.bpmFailed')} {bpmError}</p>
                )}
                {bpmResult && !isDetectingBpm && (
                  <p className="text-xs text-green-400">
                    {t('editor.newSongDialog.bpmDetected').replace('{bpm}', String(Math.round(bpmResult.bpm))).replace('{duration}', (bpmResult.duration_ms / 1000).toFixed(1))}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-gap" className="text-slate-400 text-xs">{t('editor.newSongDialog.gap')}</Label>
                <Input
                  id="new-gap"
                  type="number"
                  value={gap}
                  onChange={(e) => setGap(parseInt(e.target.value) || 0)}
                  className="bg-slate-800 border-slate-600"
                />
                <p className="text-xs text-slate-600">{t('editor.newSongDialog.gapDesc')}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs">{t('editor.newSongDialog.genre')}</Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue placeholder={t('editor.newSongDialog.genrePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs">{t('editor.newSongDialog.language')}</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue placeholder={t('editor.newSongDialog.languagePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-edition" className="text-slate-400 text-xs">{t('editor.newSongDialog.edition')}</Label>
              <Input
                id="new-edition"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                placeholder={t('editor.newSongDialog.editionPlaceholder')}
                className="bg-slate-800 border-slate-600"
              />
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Section 2: Lyrics Input */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
              <Music className="w-4 h-4" /> {t('editor.newSongDialog.lyrics')}
            </h3>
            <Textarea
              value={lyricsText}
              onChange={(e) => handleLyricsChange(e.target.value)}
              placeholder={t('editor.newSongDialog.lyricsPlaceholder')}
              className="bg-slate-800 border-slate-600 min-h-[160px] font-mono text-sm"
            />
            {syllableResult && (
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>{syllableResult.lines.length} {t('editor.newSongDialog.lines')}</span>
                <span>{syllableResult.totalSyllables} {t('editor.newSongDialog.syllables')}</span>
              </div>
            )}
          </div>

          <Separator className="bg-slate-700" />

          {/* Section 3: Media Files */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> {t('editor.newSongDialog.mediaFiles')}
            </h3>
            <p className="text-xs text-slate-600">
              {t('editor.newSongDialog.mediaFilesDesc')}
            </p>
            <div className="grid grid-cols-1 gap-3">
              {/* Audio */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 min-w-0">
                  <Music className="w-4 h-4 text-cyan-400 shrink-0" />
                  <Input
                    value={audioPath}
                    onChange={(e) => setAudioPath(e.target.value)}
                    placeholder={t('editor.newSongDialog.noAudioSelected')}
                    className="bg-transparent border-none shadow-none focus-visible:ring-0 text-sm h-auto p-0"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pickFile('audio', setAudioPath)}
                  className="border-slate-600 text-slate-400 shrink-0"
                >
                  {t('editor.newSongDialog.browse')}
                </Button>
              </div>

              {/* Video */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 min-w-0">
                  <Film className="w-4 h-4 text-purple-400 shrink-0" />
                  <Input
                    value={videoPath}
                    onChange={(e) => setVideoPath(e.target.value)}
                    placeholder={t('editor.newSongDialog.noVideoSelected')}
                    className="bg-transparent border-none shadow-none focus-visible:ring-0 text-sm h-auto p-0"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pickFile('video', setVideoPath)}
                  className="border-slate-600 text-slate-400 shrink-0"
                >
                  {t('editor.newSongDialog.browse')}
                </Button>
              </div>

              {/* Cover */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 min-w-0">
                  <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                  <Input
                    value={coverPath}
                    onChange={(e) => setCoverPath(e.target.value)}
                    placeholder={t('editor.newSongDialog.noCoverSelected')}
                    className="bg-transparent border-none shadow-none focus-visible:ring-0 text-sm h-auto p-0"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pickFile('cover', setCoverPath)}
                  className="border-slate-600 text-slate-400 shrink-0"
                >
                  {t('editor.newSongDialog.browse')}
                </Button>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" onClick={onCancel} className="border-slate-600 text-slate-400">
              {t('editor.newSongDialog.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid || isSaving}
              className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('editor.newSongDialog.creating')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t('editor.newSongDialog.create')}
                </>
              )}
            </Button>
          </div>

          {/* Info text */}
          <div className="text-xs text-slate-600 space-y-1">
            <p>{t('editor.newSongDialog.noNotesHint')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
