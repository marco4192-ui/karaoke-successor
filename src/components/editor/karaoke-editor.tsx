'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Song, Note, LyricLine } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';
import { saveSongToTxt, type SaveResult } from '@/lib/editor/save-to-file';
import { Timeline } from './timeline/timeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, FileText, Settings, BookOpen, Waves } from 'lucide-react';
import { useEditorHistory } from '@/hooks/use-editor-history';
import { useEditorPlayback } from '@/hooks/use-editor-playback';
import { useEditorKeyboardShortcuts } from '@/hooks/use-editor-keyboard-shortcuts';
import { useTapNotePlacement } from '@/hooks/use-tap-note-placement';
import { EditorHeader } from './editor-header';
import { ToolsPanel } from './tools-panel';
import { EditorNoteTab, EditorNoteTabPlaceholder } from './editor-note-tab';
import { EditorSongInfoTab } from './editor-song-info-tab';
import { EditorMetadataTab } from './editor-metadata-tab';
import { EditorLyricsTab } from './editor-lyrics-tab';
import { AudioAnalysisPanel } from './audio-analysis-panel';
import type { DetectedNote } from '@/hooks/use-audio-analysis';

interface KaraokeEditorProps {
  song: Song;
  onSave: (song: Song) => void;
  onCancel: () => void;
}

export function KaraokeEditor({ song: initialSong, onSave, onCancel }: KaraokeEditorProps) {
  const [currentSong, setCurrentSong] = useState<Song>(initialSong);
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>();
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);

  // ── Restore media URLs for Tauri (audioUrl from relativeAudioPath) ──
  useEffect(() => {
    const restoreUrls = async () => {
      try {
        const { ensureSongUrls } = await import('@/lib/game/song-library');
        const restored = await ensureSongUrls(initialSong);
        if (restored.audioUrl !== initialSong.audioUrl || restored.videoBackground !== initialSong.videoBackground) {
          console.log('[Editor] URLs restored:', { audioUrl: !!restored.audioUrl });
          setCurrentSong(restored);
        }
      } catch (err) {
        console.warn('[Editor] URL restoration failed (non-critical):', err);
      }
    };
    restoreUrls();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    pushHistory, undo: historyUndo, redo: historyRedo,
    canUndo, canRedo, hasUnsavedChanges, setHasUnsavedChanges,
  } = useEditorHistory(initialSong.lyrics);

  const {
    isPlaying, currentTime, audioRef,
    handlePlayPause, handleTimeChange, setIsPlaying,
    playbackRate, setPlaybackRate,
  } = useEditorPlayback(currentSong.duration, currentSong.audioUrl);

  const allNotes = useMemo(() => currentSong.lyrics.flatMap(line => line.notes), [currentSong.lyrics]);
  const selectedNote = useMemo(() => allNotes.find(n => n.id === selectedNoteId), [allNotes, selectedNoteId]);

  // All lyrics syllables for tap-mode auto-assignment
  const allLyricsSyllables = useMemo(
    () => allNotes.map(n => n.lyric).filter(l => l && l !== '---'),
    [allNotes]
  );

  // Ref for currentTime (needed by tap note placement hook to avoid stale closures)
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const undo = useCallback(() => {
    const lyrics = historyUndo();
    if (lyrics) setCurrentSong(prev => ({ ...prev, lyrics }));
  }, [historyUndo]);

  const redo = useCallback(() => {
    const lyrics = historyRedo();
    if (lyrics) setCurrentSong(prev => ({ ...prev, lyrics }));
  }, [historyRedo]);

  const handleNoteUpdate = useCallback((noteId: string, updates: Partial<Note>) => {
    setCurrentSong(prev => {
      const newLyrics = prev.lyrics.map(line => ({
        ...line,
        notes: line.notes.map(note => note.id === noteId ? { ...note, ...updates } : note)
      }));
      pushHistory(newLyrics);
      return { ...prev, lyrics: newLyrics };
    });
  }, [pushHistory]);

  const handleNoteDelete = useCallback((noteId: string) => {
    setCurrentSong(prev => {
      const newLyrics = prev.lyrics.map(line => ({
        ...line,
        notes: line.notes.filter(note => note.id !== noteId)
      })).filter(line => line.notes.length > 0);
      pushHistory(newLyrics);
      return { ...prev, lyrics: newLyrics };
    });
    setSelectedNoteId(undefined);
  }, [pushHistory]);

  const handleNoteAdd = useCallback((startTime: number, pitch: number) => {
    const newNote: Note = {
      id: uuidv4(), pitch,
      frequency: 440 * Math.pow(2, (pitch - 69) / 12),
      startTime, duration: 500, lyric: '---',
      isBonus: false, isGolden: false
    };
    setCurrentSong(prev => {
      const targetLine = prev.lyrics.find(line => startTime >= line.startTime && startTime <= line.endTime);
      let newLyrics: LyricLine[];
      if (targetLine) {
        newLyrics = prev.lyrics.map(line =>
          line.id === targetLine!.id
            ? { ...line, notes: [...line.notes, newNote].sort((a, b) => a.startTime - b.startTime) }
            : line
        );
      } else {
        const newLine: LyricLine = { id: uuidv4(), text: '', startTime, endTime: startTime + 2000, notes: [newNote] };
        newLyrics = [...prev.lyrics, newLine].sort((a, b) => a.startTime - b.startTime);
      }
      pushHistory(newLyrics);
      return { ...prev, lyrics: newLyrics };
    });
    setSelectedNoteId(newNote.id);
  }, [pushHistory]);

  const handleLyricChange = useCallback((noteId: string, newLyric: string) => {
    setCurrentSong(prev => {
      const newLyrics = prev.lyrics.map(line => ({
        ...line,
        notes: line.notes.map(note => note.id === noteId ? { ...note, lyric: newLyric } : note),
        text: line.notes.map(n => n.lyric).join(' ')
      }));
      pushHistory(newLyrics);
      return { ...prev, lyrics: newLyrics };
    });
  }, [pushHistory]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveResult(null);
    try {
      onSave(currentSong);
      const result = await saveSongToTxt(currentSong);
      setSaveResult(result);
      setHasUnsavedChanges(false);
      setTimeout(() => setSaveResult(null), 5000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveResult({
        success: false,
        message: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
      });
    } finally {
      setIsSaving(false);
    }
  }, [currentSong, onSave, setHasUnsavedChanges]);

  // Save only — persist to file but stay in the editor
  const handleSaveOnly = useCallback(async () => {
    setIsSaving(true);
    setSaveResult(null);
    try {
      // Persist the song data in the store (without closing)
      const { updateSong } = await import('@/lib/game/song-library');
      updateSong(currentSong.id, currentSong);
      const result = await saveSongToTxt(currentSong);
      setSaveResult(result);
      setHasUnsavedChanges(false);
      setTimeout(() => setSaveResult(null), 5000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveResult({
        success: false,
        message: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
      });
    } finally {
      setIsSaving(false);
    }
  }, [currentSong, setHasUnsavedChanges]);

  // --- Tap Note Placement (Ultrastar-style) ---
  // Create note on space-down, set duration on space-up
  const tapNoteCreate = useCallback((startTime: number, pitch: number, lyric: string): string => {
    const noteId = uuidv4();
    const newNote: Note = {
      id: noteId, pitch,
      frequency: 440 * Math.pow(2, (pitch - 69) / 12),
      startTime, duration: 200, lyric,
      isBonus: false, isGolden: false,
    };
    setCurrentSong(prev => {
      const targetLine = prev.lyrics.find(line => startTime >= line.startTime && startTime <= line.endTime);
      let newLyrics: LyricLine[];
      if (targetLine) {
        newLyrics = prev.lyrics.map(line =>
          line.id === targetLine!.id
            ? { ...line, notes: [...line.notes, newNote].sort((a, b) => a.startTime - b.startTime) }
            : line
        );
      } else {
        const newLine: LyricLine = { id: uuidv4(), text: lyric, startTime, endTime: startTime + 2000, notes: [newNote] };
        newLyrics = [...prev.lyrics, newLine].sort((a, b) => a.startTime - b.startTime);
      }
      pushHistory(newLyrics);
      return { ...prev, lyrics: newLyrics };
    });
    setSelectedNoteId(noteId);
    return noteId;
  }, [pushHistory]);

  const tapNoteRelease = useCallback((noteId: string, releaseTime: number) => {
    setCurrentSong(prev => {
      const newLyrics = prev.lyrics.map(line => ({
        ...line,
        notes: line.notes.map(note => {
          if (note.id === noteId) {
            const duration = Math.max(100, releaseTime - note.startTime);
            return { ...note, duration };
          }
          return note;
        }),
      }));
      // Recalculate line end times
      const fixedLyrics = newLyrics.map(line => {
        if (line.notes.length === 0) return line;
        const lastNote = line.notes[line.notes.length - 1];
        return { ...line, endTime: lastNote.startTime + lastNote.duration };
      });
      return { ...prev, lyrics: fixedLyrics };
    });
  }, []);

  const tapPlacement = useTapNotePlacement({
    currentTimeRef,
    defaultPitch: 60, // C4
    onNoteCreate: tapNoteCreate,
    onNoteRelease: tapNoteRelease,
    lyrics: allLyricsSyllables,
  });

  // Keyboard shortcuts (disabled when tap mode is active — Space handled by tap hook)
  useEditorKeyboardShortcuts({
    selectedNoteId, selectedNote, currentTime,
    handlePlayPause, handleNoteDelete, handleSave,
    undo, redo, handleNoteAdd, setSelectedNoteId,
    tapModeActive: tapPlacement.isActive,
  });

  const handleNoteSelect = useCallback((noteId: string | undefined) => {
    setSelectedNoteId(noteId);
  }, []);

  const updateSelectedNote = useCallback((updates: Partial<Note>) => {
    if (selectedNoteId) handleNoteUpdate(selectedNoteId, updates);
  }, [selectedNoteId, handleNoteUpdate]);

  const duplicateNote = useCallback(() => {
    if (selectedNote) handleNoteAdd(selectedNote.startTime + selectedNote.duration + 100, selectedNote.pitch);
  }, [selectedNote, handleNoteAdd]);

  // --- Audio Analysis: Apply detected notes ---
  const handleApplyDetectedNotes = useCallback((detectedNotes: DetectedNote[]) => {
    const newLyrics: LyricLine[] = [];
    let currentLineNotes: Note[] = [];
    let lineStartTime = 0;
    const LINE_BREAK_THRESHOLD = 2000; // 2s gap → new line

    for (const dn of detectedNotes) {
      // Check if we need a new line
      if (currentLineNotes.length > 0) {
        const lastNote = currentLineNotes[currentLineNotes.length - 1];
        const gap = dn.start_time_ms - (lastNote.startTime + lastNote.duration);
        if (gap >= LINE_BREAK_THRESHOLD) {
          // Finalise current line
          const lastN = currentLineNotes[currentLineNotes.length - 1];
          newLyrics.push({
            id: uuidv4(),
            text: currentLineNotes.map(n => n.lyric).join(' ').trim(),
            startTime: lineStartTime,
            endTime: lastN.startTime + lastN.duration,
            notes: currentLineNotes,
          });
          currentLineNotes = [];
        }
      }

      if (currentLineNotes.length === 0) {
        lineStartTime = dn.start_time_ms;
      }

      // Determine lyric text: use the confidence level as a placeholder
      const confLabel = dn.confidence_level === 'High' ? '♪'
        : dn.confidence_level === 'Medium' ? '♫'
        : dn.confidence_level === 'Low' ? '♩'
        : '♬';

      const note: Note = {
        id: uuidv4(),
        pitch: dn.midi_note,
        frequency: dn.frequency,
        startTime: Math.round(dn.start_time_ms),
        duration: Math.round(dn.duration_ms),
        lyric: confLabel,
        isBonus: false,
        isGolden: dn.confidence_level === 'High',
        analysisConfidence: dn.confidence,
      };

      currentLineNotes.push(note);
    }

    // Push the last line
    if (currentLineNotes.length > 0) {
      const lastN = currentLineNotes[currentLineNotes.length - 1];
      newLyrics.push({
        id: uuidv4(),
        text: currentLineNotes.map(n => n.lyric).join(' ').trim(),
        startTime: lineStartTime,
        endTime: lastN.startTime + lastN.duration,
        notes: currentLineNotes,
      });
    }

    pushHistory(newLyrics);
    setCurrentSong(prev => ({ ...prev, lyrics: newLyrics }));
    setHasUnsavedChanges(true);
  }, [pushHistory, setHasUnsavedChanges]);

  // --- Audio Analysis: Apply detected BPM ---
  const handleApplyBpm = useCallback((bpm: number) => {
    setCurrentSong(prev => ({ ...prev, bpm: Math.round(bpm) }));
    setHasUnsavedChanges(true);
  }, [setHasUnsavedChanges]);

  // Determine the audio file path for analysis — resolve relative paths to absolute.
  // Falls back to the video file path so that video-embedded audio can be analyzed.
  const analysisAudioPath = useMemo(() => {
    // Prefer stored/blob URLs that work directly
    if (currentSong.audioUrl && !currentSong.audioUrl.startsWith('blob:')) return currentSong.audioUrl;
    // Resolve relative path using baseFolder (Tauri)
    if (currentSong.relativeAudioPath && currentSong.baseFolder) {
      // Normalize both paths to use forward slashes for consistent path construction
      const normalizedBase = currentSong.baseFolder.replace(/\\/g, '/');
      const normalizedRelative = currentSong.relativeAudioPath.replace(/\\/g, '/');
      return `${normalizedBase}/${normalizedRelative}`;
    }
    // Fallback: blob URL (IndexedDB)
    if (currentSong.audioUrl) return currentSong.audioUrl;
    // Fallback: video file path (audio may be embedded in the video)
    if (currentSong.videoBackground && !currentSong.videoBackground.startsWith('http') && !currentSong.youtubeUrl) {
      if (currentSong.videoBackground.startsWith('/') || currentSong.videoBackground.match(/^[A-Za-z]:/)) {
        return currentSong.videoBackground;
      }
      if (currentSong.baseFolder) {
        const normalizedBase = currentSong.baseFolder.replace(/\\/g, '/');
        const normalizedVideo = currentSong.videoBackground.replace(/\\/g, '/');
        return `${normalizedBase}/${normalizedVideo}`;
      }
    }
    return null;
  }, [currentSong.audioUrl, currentSong.relativeAudioPath, currentSong.baseFolder, currentSong.videoBackground, currentSong.youtubeUrl]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white">
      <EditorHeader
        title={currentSong.title}
        artist={currentSong.artist}
        saveResult={saveResult}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onCancel={onCancel}
        onSave={handleSave}
        onSaveOnly={handleSaveOnly}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <ToolsPanel
          selectedNote={selectedNote}
          currentTime={currentTime}
          onAddNote={handleNoteAdd}
          onDuplicateNote={duplicateNote}
          onDeleteNote={() => selectedNoteId && handleNoteDelete(selectedNoteId)}
          onUpdateSelectedNote={updateSelectedNote}
          tapMode={tapPlacement}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          <Timeline
            song={currentSong}
            currentTime={currentTime}
            isPlaying={isPlaying}
            selectedNoteId={selectedNoteId}
            audioBuffer={audioBuffer}
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
            onTimeChange={handleTimeChange}
            onPlayPause={handlePlayPause}
            onNoteSelect={handleNoteSelect}
            onNoteUpdate={handleNoteUpdate}
            onNoteDelete={handleNoteDelete}
            onNoteAdd={handleNoteAdd}
            onLyricChange={handleLyricChange}
          />
        </main>

        <aside className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden flex-shrink-0">
          <Tabs defaultValue="note" className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-5 bg-slate-800 border-b border-slate-700 rounded-none h-10">
              <TabsTrigger value="note" className="text-[10px] data-[state=active]:bg-slate-700 px-1">
                <Music className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="info" className="text-[10px] data-[state=active]:bg-slate-700 px-1">
                <FileText className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="lyrics" className="text-[10px] data-[state=active]:bg-slate-700 px-1">
                <BookOpen className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="analysis" className="text-[10px] data-[state=active]:bg-slate-700 px-1">
                <Waves className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="metadata" className="text-[10px] data-[state=active]:bg-slate-700 px-1">
                <Settings className="w-3 h-3" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="note" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
              {selectedNote
                ? <EditorNoteTab selectedNote={selectedNote} onUpdateSelectedNote={updateSelectedNote} />
                : <EditorNoteTabPlaceholder />
              }
            </TabsContent>

            <TabsContent value="info" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
              <EditorSongInfoTab
                song={currentSong}
                allNotesCount={allNotes.length}
                onSongChange={setCurrentSong}
                onSetUnsavedChanges={() => setHasUnsavedChanges(true)}
              />
            </TabsContent>

            <TabsContent value="lyrics" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
              <EditorLyricsTab
                song={currentSong}
                currentTime={currentTime}
                selectedNoteId={selectedNoteId}
                onNoteSelect={handleNoteSelect}
                onTimeChange={handleTimeChange}
              />
            </TabsContent>

            <TabsContent value="analysis" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full">
                <AudioAnalysisPanel
                  audioFilePath={analysisAudioPath}
                  onApplyNotes={handleApplyDetectedNotes}
                  onApplyBpm={handleApplyBpm}
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="metadata" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
              <EditorMetadataTab
                song={currentSong}
                onSongChange={setCurrentSong}
                onSetUnsavedChanges={() => setHasUnsavedChanges(true)}
              />
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      {currentSong.audioUrl && (
        <audio ref={audioRef} src={currentSong.audioUrl} onEnded={() => setIsPlaying(false)} />
      )}
    </div>
  );
}

export default KaraokeEditor;
