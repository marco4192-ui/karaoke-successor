'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Song } from '@/types/game';
import {
  detectFileFormat,
  parseKaraokeMugen,
  parseAssKaraoke,
  parseMIDIKaraoke,
  parseSingStarData,
  parseStepMania,
  convertToSong,
  type DetectedFormat,
  type MIDIKaraokeData,
} from '@/lib/parsers/multi-format-import';
import { parseUltraStarTxt, convertUltraStarToSong, generateUltraStarTxt } from '@/lib/parsers/ultrastar-parser';
import { upsertSong } from '@/lib/game/song-library';
import { ImportPreview } from './import-preview';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from '@/lib/i18n/translations';

export interface AlternateFormatTabProps {
  isProcessing: boolean;
  setIsProcessing: (_v: boolean) => void;
  error: string | null;
  setError: (_e: string | null) => void;
  previewSong: Song | null;
  setPreviewSong: (_s: Song | null) => void;
  onImport: (_song: Song) => void;
}

/** Supported alternate formats with file extensions */
const FORMATS: Array<{ id: DetectedFormat; label: string; extensions: string; descriptionKey: string }> = [
  { id: 'ultrastar', label: 'UltraStar', extensions: '.txt', descriptionKey: 'importAlternateFormat.formatDescriptions.ultrastar' },
  { id: 'midi', label: 'MIDI Karaoke', extensions: '.kar, .mid', descriptionKey: 'importAlternateFormat.formatDescriptions.midi' },
  { id: 'karaoke-mugen', label: 'Karaoke Mugen', extensions: '.ass, .json', descriptionKey: 'importAlternateFormat.formatDescriptions.karaokeMugen' },
  { id: 'singstar', label: 'SingStar', extensions: '.txt (SingStar)', descriptionKey: 'importAlternateFormat.formatDescriptions.singStar' },
  { id: 'stepmania', label: 'StepMania', extensions: '.sm, .ssc, .txt', descriptionKey: 'importAlternateFormat.formatDescriptions.stepMania' },
];

export function AlternateFormatTab({
  isProcessing,
  setIsProcessing,
  error,
  setError,
  previewSong,
  setPreviewSong,
  onImport,
}: AlternateFormatTabProps) {
  const [selectedFormat, setSelectedFormat] = useState<DetectedFormat | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<DetectedFormat | null>(null);
  const [songFile, setSongFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  /** Optional ASS subtitle file (Karaoke Mugen) — overrides the JSON lyrics
   *  with the precise per-syllable {\k} timing when provided. */
  const [assFile, setAssFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  // MIDI two-step flow: parse first → user picks a melody track → build preview
  const [midiData, setMidiData] = useState<MIDIKaraokeData | null>(null);
  const [selectedMidiTrack, setSelectedMidiTrack] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const songInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const assInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  // Track blob URLs created in handleProcess for cleanup on unmount/cancel
  const previewBlobUrlRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (previewBlobUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
      }
    };
  }, []);

  const handleSongFileSelect = useCallback(async (file: File) => {
    setError(null);
    setSongFile(file);
    setPreviewSong(null);
    setDetectedFormat(null);
    setMidiData(null);
    setSelectedMidiTrack(null);
    setStatusMessage(null);

    // Auto-detect format
    try {
      const textContent = await file.text();
      // Binary formats (MIDI) need ArrayBuffer; text formats need string.
      // detectFileFormat checks typeof content === 'string' for .txt heuristics.
      const ext = file.name.split('.').pop()?.toLowerCase();
      const content: string | ArrayBuffer = (ext === 'kar' || ext === 'mid')
        ? await file.arrayBuffer()
        : textContent;
      const format = detectFileFormat(file.name, content);
      setDetectedFormat(format);
      if (format !== 'unknown') {
        setSelectedFormat(format);
      }
    } catch {
      // Detection failed — user must select manually
    }
  }, [setError, setPreviewSong]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleSongFileSelect(file);
  }, [handleSongFileSelect]);

  const handleProcess = useCallback(async () => {
    if (!songFile || !selectedFormat) {
      setError(t('importAlternateFormat.selectFile'));
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStatusMessage(t('importAlternateFormat.parsing'));

    // H19: Track blob URLs created during import so they can be revoked on error
    let tempBlobUrl: string | undefined;

    try {
      let partialSong: Partial<Song> | null = null;

      switch (selectedFormat) {
        case 'karaoke-mugen': {
          // ASS subtitle file (preferred — precise {\k} syllable timing) or
          // the legacy JSON export. An EXTRA .ass file overrides the JSON.
          const ext = songFile.name.split('.').pop()?.toLowerCase();
          let data = null;
          if (ext === 'ass' || ext === 'ssa') {
            data = parseAssKaraoke(await songFile.text());
            if (!data) throw new Error(t('importAlternateFormat.failedToParse'));
          } else if (assFile) {
            const assData = parseAssKaraoke(await assFile.text());
            data = assData ?? parseKaraokeMugen(await songFile.text());
          } else {
            data = parseKaraokeMugen(await songFile.text());
          }
          if (!data) throw new Error(t('importAlternateFormat.failedToParse'));
          tempBlobUrl = audioFile ? URL.createObjectURL(audioFile) : undefined;
          const videoUrl = videoFile ? URL.createObjectURL(videoFile) : undefined;
          partialSong = convertToSong(data, 'karaoke-mugen', tempBlobUrl, videoUrl);
          break;
        }
        case 'midi': {
          const buffer = await songFile.arrayBuffer();
          const data = parseMIDIKaraoke(buffer);
          if (!data) throw new Error(t('importAlternateFormat.failedToParse'));
          if (!data.tracks.some(tr => tr.noteCount > 0)) throw new Error(t('importAlternateFormat.noNotes'));

          // Step 1: analyze + show track picker (unless already analyzed for this file)
          if (!midiData) {
            setMidiData(data);
            const melodyTrack = data.melodyTrackIndex >= 0 ? data.tracks[data.melodyTrackIndex] : null;
            setSelectedMidiTrack(melodyTrack ? melodyTrack.index : null);
            setStatusMessage(
              (data.hasLyrics
                ? t('importAlternateFormat.midiTracksFound')
                : t('importAlternateFormat.midiTracksFoundFallback')
              )
                .replace('{n}', String(data.tracks.length))
                .replace('{melody}', melodyTrack ? melodyTrack.name : '')
            );
            return; // wait for the track selection before building the preview
          }

          // Step 2: build preview with the selected melody track
          tempBlobUrl = audioFile ? URL.createObjectURL(audioFile) : undefined;
          partialSong = convertToSong(data, 'midi', tempBlobUrl, undefined, {
            midiTrackIndex: selectedMidiTrack ?? undefined,
          });
          break;
        }
        case 'singstar': {
          const text = await songFile.text();
          const data = parseSingStarData(text);
          if (!data) throw new Error(t('importAlternateFormat.failedToParse'));
          partialSong = convertToSong(data, 'singstar');
          break;
        }
        case 'stepmania': {
          const text = await songFile.text();
          const data = parseStepMania(text);
          if (!data) throw new Error(t('importAlternateFormat.failedToParse'));
          partialSong = convertToSong(data, 'stepmania');
          break;
        }
        case 'ultrastar': {
          const text = await songFile.text();
          const data = parseUltraStarTxt(text);
          const audioUrl = audioFile ? URL.createObjectURL(audioFile) : undefined;
          const song = convertUltraStarToSong(data, audioUrl || '');
          partialSong = song;
          break;
        }
        default:
          throw new Error(t('importAlternateFormat.unknownError'));
      }

      if (!partialSong) {
        throw new Error(t('importAlternateFormat.failedToParse'));
      }
      // StepMania is a rhythm-game format without lyrics — allow it through.
      // All other formats (UltraStar, MIDI, KaraokeMugen, SingStar) must have lyrics.
      const needsLyrics = selectedFormat !== 'stepmania';
      if (needsLyrics && (!partialSong.lyrics || partialSong.lyrics.length === 0)) {
        throw new Error(t('importAlternateFormat.noLyricLines'));
      }

      // Revoke previous preview blob URLs to prevent memory leaks
      if (previewBlobUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
      }
      if (previewSong?.audioUrl?.startsWith('blob:')) URL.revokeObjectURL(previewSong.audioUrl);

      // Build complete Song object
      const song: Song = {
        id: uuidv4(),
        title: partialSong.title || songFile.name.replace(/\.[^/.]+$/, ''),
        artist: partialSong.artist || 'Unknown',
        bpm: partialSong.bpm || 120,
        gap: partialSong.gap || 0,
        duration: partialSong.duration || 0,
        difficulty: 'medium',
        rating: 3,
        audioUrl: partialSong.audioUrl || (audioFile ? URL.createObjectURL(audioFile) : ''),
        videoBackground: videoFile
          ? URL.createObjectURL(videoFile)
          : partialSong.videoBackground || '',
        coverImage: coverFile ? URL.createObjectURL(coverFile) : undefined,
        lyrics: partialSong.lyrics || [],
        genre: partialSong.genre,
      };

      setPreviewSong(song);
      if (song.audioUrl?.startsWith('blob:')) {
        previewBlobUrlRef.current = song.audioUrl;
      }
      const noLyricsHint = selectedFormat === 'midi' && midiData && !midiData.hasLyrics
        ? ` ⚠️ ${t('importAlternateFormat.midiNoLyricsWarning')}`
        : '';
      setStatusMessage(
        t('importAlternateFormat.importSuccess').replace('{title}', song.title).replace('{n}', String(song.lyrics.length)) + noLyricsHint
      );
    } catch (err) {
      // H19: Revoke temporary blob URL on error
      if (tempBlobUrl) URL.revokeObjectURL(tempBlobUrl);
      setError(err instanceof Error ? err.message : t('importAlternateFormat.unknownError'));
      setStatusMessage(null);
    } finally {
      setIsProcessing(false);
    }
  }, [songFile, audioFile, videoFile, coverFile, assFile, selectedFormat, selectedMidiTrack, midiData, previewSong, setError, setPreviewSong, setIsProcessing, t]);

  /**
   * Confirm: add the converted song to the library AND persist everything
   * (user request R10-2.3 — "the app builds an UltraStar file from it"):
   *  - the generated UltraStar txt  → media DB (storedTxt) — the song is a
   *    fully editable UltraStar song afterwards, not a fragile blob-only copy
   *  - audio / video / cover        → media DB (storedMedia) — survives
   *    reloads in browser AND Tauri webview (IndexedDB is available in both)
   */
  const handleAddToLibrary = useCallback(async () => {
    if (!previewSong) return;
    setIsConfirming(true);
    try {
      const { storeMedia } = await import('@/lib/db/media-db');

      // 1. Generate the UltraStar txt from the converted song
      const txtContent = generateUltraStarTxt(previewSong);
      await storeMedia(previewSong.id, 'txt', new Blob([txtContent], { type: 'text/plain' }));

      // 2. Persist the media files the user provided
      if (audioFile) await storeMedia(previewSong.id, 'audio', audioFile);
      if (videoFile) await storeMedia(previewSong.id, 'video', videoFile);
      if (coverFile) await storeMedia(previewSong.id, 'cover', coverFile);

      // 3. Upsert with persistence flags — the song survives reloads and the
      //    editor can round-trip the txt (loadSongLyrics/saveSongToTxt).
      const hasMedia = !!(audioFile || videoFile);
      await upsertSong({ ...previewSong, storedTxt: true, storedMedia: hasMedia || previewSong.storedMedia === true });

      onImport(previewSong);
      setStatusMessage(t('importAlternateFormat.persistSuccess'));
      // Reset for the next import (keep the format selection)
      setPreviewSong(null);
      setSongFile(null);
      setAudioFile(null);
      setVideoFile(null);
      setCoverFile(null);
      setAssFile(null);
      setMidiData(null);
      setSelectedMidiTrack(null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[AlternateFormatImport] persistence failed:', err);
      setError(err instanceof Error ? err.message : t('importAlternateFormat.unknownError'));
    } finally {
      setIsConfirming(false);
    }
  }, [previewSong, audioFile, videoFile, coverFile, onImport, setPreviewSong, setError, t]);

  /** Small reusable file-picker row (audio / video / cover / ass file loads). */
  const renderFileLoad = (
    label: string,
    file: File | null,
    setFile: (_f: File | null) => void,
    inputRef: React.RefObject<HTMLInputElement | null>,
    accept: string,
    hint?: string,
    icon?: string,
  ) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
        <span aria-hidden="true">{icon}</span>
        {label}
      </label>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="border-slate-600 text-xs max-w-full truncate"
        >
          {file ? file.name : t('importAlternateFormat.selectFile2')}
        </Button>
        {file && (
          <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="text-xs text-red-400">
            {t('importAlternateFormat.remove')}
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        data-testid={`import-file-input-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Conversion explainer (R10-2.3) */}
      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-slate-300">
        <p className="flex items-start gap-2">
          <span aria-hidden="true" className="text-sm">ℹ️</span>
          <span>{t('importAlternateFormat.conversionNote')}</span>
        </p>
      </div>

      {/* Format selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">{t('importAlternateFormat.songFormat')}</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FORMATS.map(fmt => (
            <button
              key={fmt.id}
              onClick={() => { setSelectedFormat(fmt.id); setMidiData(null); setSelectedMidiTrack(null); }}
              className={`p-3 rounded-lg border text-left transition-colors ${
                selectedFormat === fmt.id
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
              }`}
            >
              <div className="text-sm font-medium">{fmt.label}</div>
              <div className="text-[10px] text-slate-500">{fmt.extensions}</div>
              <div className="text-[10px] text-slate-400 mt-1">{t(fmt.descriptionKey)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Song file upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">{t('importAlternateFormat.songFile')}</label>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => songInputRef.current?.click()}
          className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-cyan-500 transition-colors"
        >
          {songFile ? (
            <div>
              <div className="text-sm text-cyan-400">{songFile.name}</div>
              <div className="text-[10px] text-slate-500">{(songFile.size / 1024).toFixed(1)} KB</div>
              {detectedFormat && detectedFormat !== 'unknown' && (
                <div className="text-[10px] text-green-400 mt-1">Auto-detected: {detectedFormat}</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-500">{t('importAlternateFormat.dropFile')}</div>
          )}
        </div>
        <input ref={songInputRef} type="file" className="hidden" data-testid="import-song-file-input" onChange={(e) => e.target.files?.[0] && handleSongFileSelect(e.target.files[0])} />
      </div>

      {/* MIDI melody track picker (shown after the file has been analyzed) */}
      {selectedFormat === 'midi' && midiData && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-sm font-medium text-slate-300">{t('importAlternateFormat.midiTrackSelect')}</label>
            <span className="text-[10px] text-slate-500">
              {t('importAlternateFormat.midiMetaInfo')
                .replace('{bpm}', String(Math.round(midiData.tempo)))
                .replace('{tracks}', String(midiData.tracks.length))}
            </span>
          </div>

          {(midiData.title || midiData.artist) && (
            <p className="text-xs text-cyan-400">
              {t('importAlternateFormat.midiSongInfo')
                .replace('{title}', midiData.title || '—')
                .replace('{artist}', midiData.artist || '—')}
            </p>
          )}

          <div
            role="radiogroup"
            aria-label={t('importAlternateFormat.midiTrackSelect')}
            className="midi-track-scroll max-h-64 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/50 divide-y divide-slate-700/50"
          >
            {midiData.tracks.map(tr => {
              const selectable = !tr.isDrum && tr.noteCount > 0;
              const isSelected = selectedMidiTrack === tr.index;
              const isMelody = midiData.melodyTrackIndex === tr.index;
              return (
                <button
                  key={tr.index}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={!selectable}
                  onClick={() => setSelectedMidiTrack(tr.index)}
                  className={`w-full p-3 text-left transition-colors ${
                    !selectable
                      ? 'cursor-not-allowed opacity-40'
                      : isSelected
                        ? 'bg-cyan-500/10'
                        : 'hover:bg-slate-700/40 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate flex items-center gap-1.5">
                      {tr.name}
                      {isMelody && (
                        <span className="shrink-0 rounded-full bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-300 border border-cyan-500/40">
                          {t('importAlternateFormat.midiMelodyBadge')}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-[9px] text-slate-500">
                      {tr.isDrum
                        ? `🥁 ${t('importAlternateFormat.midiDrumsBadge')}`
                        : tr.noteCount === 0
                          ? t('importAlternateFormat.midiNoNotesTrack')
                          : `Ch ${tr.channels.map(c => c + 1).join(', ')}`}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    {t('importAlternateFormat.midiTrackInfo')
                      .replace('{notes}', String(tr.noteCount))
                      .replace('{syllables}', String(tr.lyricSyllableCount))
                      .replace('{coverage}', String(Math.round(tr.lyricCoverage * 100)))}
                  </div>
                  {/* Lyric coverage bar */}
                  <div className="mt-1.5 h-1 w-full rounded-full bg-slate-700/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${tr.isDrum ? 'bg-slate-600' : 'bg-gradient-to-r from-cyan-500 to-emerald-400'}`}
                      style={{ width: `${Math.round(tr.lyricCoverage * 100)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {!midiData.hasLyrics && (
            <p className="text-[10px] text-amber-400">⚠️ {t('importAlternateFormat.midiNoLyricsWarning')}</p>
          )}
        </div>
      )}

      {/* File loads: audio, video, cover (+ ASS for Mugen) — R10-2.3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-slate-700/60 bg-slate-800/30 p-3">
        {renderFileLoad(
          t('importAlternateFormat.audioFile'),
          audioFile,
          setAudioFile,
          audioInputRef,
          'audio/*',
          t('importAlternateFormat.audioRequired'),
          '🎵',
        )}
        {renderFileLoad(
          t('importAlternateFormat.videoFile'),
          videoFile,
          setVideoFile,
          videoInputRef,
          'video/*',
          t('importAlternateFormat.videoOptional'),
          '🎬',
        )}
        {renderFileLoad(
          t('importAlternateFormat.coverFile'),
          coverFile,
          setCoverFile,
          coverInputRef,
          'image/*',
          t('importAlternateFormat.coverOptional'),
          '🖼️',
        )}
        {selectedFormat === 'karaoke-mugen' && renderFileLoad(
          t('importAlternateFormat.assFile'),
          assFile,
          setAssFile,
          assInputRef,
          '.ass,.ssa',
          t('importAlternateFormat.assHint'),
          '📝',
        )}
      </div>

      {/* Process button */}
      <Button
        onClick={handleProcess}
        disabled={!songFile || !selectedFormat || isProcessing || isConfirming || (selectedFormat === 'midi' && !!midiData && selectedMidiTrack === null)}
        className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-sm"
      >
        {isProcessing
          ? t('importAlternateFormat.processing')
          : selectedFormat === 'midi' && midiData
            ? t('importAlternateFormat.midiCreatePreview')
            : t('importAlternateFormat.importAs').replace('{format}', FORMATS.find(f => f.id === selectedFormat)?.label || 'Song')}
      </Button>

      {/* Status message */}
      {statusMessage && !error && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-xs text-green-400" role="status">
          {statusMessage}
        </div>
      )}

      {/*
       * R14 (user request 4): the song preview was dead code — ImportPreview
       * existed but no screen rendered it, so a successful Mugen/ASS import
       * showed NOTHING but the status line ("es wird kein Text dargestellt").
       * Rendered here so the user can verify title, badges AND the converted
       * lyric text before committing the song to the library.
       */}
      <ImportPreview
        progress={null}
        error={error}
        previewSong={previewSong}
        audioUrl={previewSong?.audioUrl || ''}
        videoUrl={previewSong?.videoBackground || ''}
      />

      {/* Confirm button */}
      {previewSong && (
        <div className="flex gap-2">
          <Button
            onClick={handleAddToLibrary}
            disabled={isConfirming}
            className="flex-1 bg-green-500 hover:bg-green-400 text-sm"
          >
            {isConfirming ? t('importAlternateFormat.persisting') : t('importAlternateFormat.addToLibrary')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (previewBlobUrlRef.current?.startsWith('blob:')) {
                URL.revokeObjectURL(previewBlobUrlRef.current);
                previewBlobUrlRef.current = null;
              }
              setPreviewSong(null);
              setStatusMessage(null);
            }}
            className="text-slate-500 text-xs"
          >
            {t('importAlternateFormat.cancel')}
          </Button>
        </div>
      )}
    </div>
  );
}
