'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Song } from '@/types/game';
import {
  detectFileFormat,
  parseKaraokeMugen,
  parseMIDIKaraoke,
  parseSingStarData,
  parseStepMania,
  convertToSong,
  type DetectedFormat,
} from '@/lib/parsers/multi-format-import';
import { parseUltraStarTxt, convertUltraStarToSong } from '@/lib/parsers/ultrastar-parser';
import { addSong } from '@/lib/game/song-library';
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
const FORMATS: Array<{ id: DetectedFormat; label: string; extensions: string; description: string }> = [
  { id: 'ultrastar', label: 'UltraStar', extensions: '.txt', description: 'UltraStar TXT-Format (Standard + kompakte Notation, Duette)' },
  { id: 'midi', label: 'MIDI Karaoke', extensions: '.kar, .mid', description: 'MIDI-Dateien mit eingebetteten Lyrics und Noten' },
  { id: 'karaoke-mugen', label: 'Karaoke Mugen', extensions: '.json', description: 'Karaoke Mugen JSON-Format' },
  { id: 'singstar', label: 'SingStar', extensions: '.txt (SingStar)', description: 'SingStar INI-Export-Format' },
  { id: 'stepmania', label: 'StepMania', extensions: '.sm, .ssc, .txt', description: 'StepMania/StepFever Chart-Format' },
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const songInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
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
          const text = await songFile.text();
          const data = parseKaraokeMugen(text);
          if (!data) throw new Error(t('importAlternateFormat.failedToParse'));
          tempBlobUrl = audioFile ? URL.createObjectURL(audioFile) : undefined;
          partialSong = convertToSong(data, 'karaoke-mugen', tempBlobUrl);
          break;
        }
        case 'midi': {
          const buffer = await songFile.arrayBuffer();
          const data = parseMIDIKaraoke(buffer);
          if (!data) throw new Error(t('importAlternateFormat.failedToParse'));
          if (data.notes.length === 0 && data.lyrics.length === 0) throw new Error(t('importAlternateFormat.noLyricLines'));
          tempBlobUrl = audioFile ? URL.createObjectURL(audioFile) : undefined;
          partialSong = convertToSong(data, 'midi', tempBlobUrl);
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
        videoBackground: partialSong.videoBackground || '',
        lyrics: partialSong.lyrics || [],
        genre: partialSong.genre,
      };

      setPreviewSong(song);
      if (song.audioUrl?.startsWith('blob:')) {
        previewBlobUrlRef.current = song.audioUrl;
      }
      setStatusMessage(t('importAlternateFormat.importSuccess').replace('{title}', song.title).replace('{n}', String(song.lyrics.length)));
    } catch (err) {
      // H19: Revoke temporary blob URL on error
      if (tempBlobUrl) URL.revokeObjectURL(tempBlobUrl);
      setError(err instanceof Error ? err.message : t('importAlternateFormat.unknownError'));
      setStatusMessage(null);
    } finally {
      setIsProcessing(false);
    }
  }, [songFile, audioFile, selectedFormat, previewSong, setError, setPreviewSong, setIsProcessing]);

  return (
    <div className="space-y-4">
      {/* Format selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">{t('importAlternateFormat.songFormat')}</label>
        <div className="grid grid-cols-2 gap-2">
          {FORMATS.map(fmt => (
            <button
              key={fmt.id}
              onClick={() => setSelectedFormat(fmt.id)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                selectedFormat === fmt.id
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
              }`}
            >
              <div className="text-sm font-medium">{fmt.label}</div>
              <div className="text-[10px] text-slate-500">{fmt.extensions}</div>
              <div className="text-[10px] text-slate-400 mt-1">{fmt.description}</div>
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
        <input ref={songInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleSongFileSelect(e.target.files[0])} />
      </div>

      {/* Optional audio file */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">{t('importAlternateFormat.audioFile')}</label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => audioInputRef.current?.click()}
            className="border-slate-600 text-xs"
          >
            {audioFile ? audioFile.name : t('importAlternateFormat.selectAudio')}
          </Button>
          {audioFile && (
            <Button variant="ghost" size="sm" onClick={() => setAudioFile(null)} className="text-xs text-red-400">
              {t('importAlternateFormat.remove')}
            </Button>
          )}
        </div>
        <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
        <p className="text-[10px] text-slate-500">{t('importAlternateFormat.audioRequired')}</p>
      </div>

      {/* Process button */}
      <Button
        onClick={handleProcess}
        disabled={!songFile || !selectedFormat || isProcessing}
        className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-sm"
      >
        {isProcessing ? t('importAlternateFormat.processing') : t('importAlternateFormat.importAs').replace('{format}', FORMATS.find(f => f.id === selectedFormat)?.label || 'Song')}
      </Button>

      {/* Status message */}
      {statusMessage && !error && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-xs text-green-400">
          {statusMessage}
        </div>
      )}

      {/* Confirm button */}
      {previewSong && (
        <div className="flex gap-2">
          <Button
            onClick={() => { addSong(previewSong); onImport(previewSong); }}
            className="flex-1 bg-green-500 hover:bg-green-400 text-sm"
          >
            {t('importAlternateFormat.addToLibrary')}
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
