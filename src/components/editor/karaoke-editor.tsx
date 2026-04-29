'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Song, Note, LyricLine } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';
import { saveSongToTxt, type SaveResult } from '@/lib/editor/save-to-file';
import { Timeline } from './timeline/timeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, FileText, Settings, BookOpen, Waves, Sparkles, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { normalizeFilePath } from '@/lib/tauri-file-storage';
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
import { AIAssistantPanel } from './panels/ai-assistant-panel';
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
  const [showSidebar, setShowSidebar] = useState(true); // Sidebar visible by default

  // ── Restore media URLs for Tauri (audioUrl from relativeAudioPath) ──
  useEffect(() => {
    const restoreUrls = async () => {
      try {
        const { ensureSongUrls } = await import('@/lib/game/song-library');
        const restored = await ensureSongUrls(initialSong);
        if (restored.audioUrl !== initialSong.audioUrl || restored.videoBackground !== initialSong.videoBackground) {
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

  const handleNoteSplit = useCallback(() => {
    if (!selectedNote) return;

    // Split at playhead if it falls within the note, otherwise at midpoint
    const noteEnd = selectedNote.startTime + selectedNote.duration;
    const splitPoint = (currentTime >= selectedNote.startTime && currentTime <= noteEnd)
      ? currentTime
      : selectedNote.startTime + selectedNote.duration / 2;

    const firstDuration = splitPoint - selectedNote.startTime;
    const secondDuration = noteEnd - splitPoint;

    // Don't split if either half would be too short (< 50ms)
    if (firstDuration < 50 || secondDuration < 50) return;

    const secondNote: Note = {
      id: uuidv4(),
      pitch: selectedNote.pitch,
      frequency: selectedNote.frequency,
      startTime: Math.round(splitPoint),
      duration: Math.round(secondDuration),
      lyric: selectedNote.lyric,
      isBonus: selectedNote.isBonus,
      isGolden: selectedNote.isGolden,
      player: selectedNote.player,
    };

    setCurrentSong(prev => {
      const newLyrics = prev.lyrics.map(line => {
        const noteIndex = line.notes.findIndex(n => n.id === selectedNote.id);
        if (noteIndex === -1) return line;
        const newNotes = [...line.notes];
        newNotes.splice(noteIndex, 1,
          { ...selectedNote, duration: Math.round(firstDuration) },
          secondNote
        );
        return { ...line, notes: newNotes };
      });
      pushHistory(newLyrics);
      return { ...prev, lyrics: newLyrics };
    });
    setSelectedNoteId(secondNote.id);
  }, [selectedNote, currentTime, pushHistory]);

  // --- Audio Analysis: Apply detected notes ---
  // Only updates pitch/frequency of existing notes that match detected notes.
  // Song text, timing, and note durations are NEVER changed.
  const handleApplyDetectedNotes = useCallback((detectedNotes: DetectedNote[]) => {
    // Collect all existing notes
    const existingNotes = currentSong.lyrics.flatMap(line => line.notes);

    // Build a map: existingNote.id → best matching detected note (by time overlap)
    const pitchMap = new Map<string, { pitch: number; frequency: number; confidence: number }>();

    for (const en of existingNotes) {
      let bestOverlap = 0;
      let bestDetected: DetectedNote | null = null;
      const enEnd = en.startTime + en.duration;

      for (const dn of detectedNotes) {
        const dnEnd = dn.start_time_ms + dn.duration_ms;
        const overlap = Math.max(0, Math.min(enEnd, dnEnd) - Math.max(en.startTime, dn.start_time_ms));
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestDetected = dn;
        }
      }

      // Only update if overlap is significant (at least 20% of the existing note)
      if (bestDetected && bestOverlap > en.duration * 0.2) {
        pitchMap.set(en.id, {
          pitch: bestDetected.midi_note,
          frequency: bestDetected.frequency,
          confidence: bestDetected.confidence,
        });
      }
    }

    if (pitchMap.size === 0) return; // Nothing to update

    // Update only pitch/frequency on matching existing notes — preserve everything else
    const newLyrics = currentSong.lyrics.map(line => ({
      ...line,
      notes: line.notes.map(note => {
        const update = pitchMap.get(note.id);
        if (!update) return note;
        return {
          ...note,
          pitch: update.pitch,
          frequency: update.frequency,
          analysisConfidence: update.confidence,
          isGolden: update.confidence >= 0.8 ? true : note.isGolden,
        };
      }),
    }));

    pushHistory(newLyrics);
    setCurrentSong(prev => ({ ...prev, lyrics: newLyrics }));
    setHasUnsavedChanges(true);
  }, [pushHistory, setHasUnsavedChanges, currentSong.lyrics]);

  // --- Audio Analysis: Apply detected BPM ---
  const handleApplyBpm = useCallback((bpm: number) => {
    setCurrentSong(prev => ({ ...prev, bpm: Math.round(bpm) }));
    setHasUnsavedChanges(true);
  }, [setHasUnsavedChanges]);

  // Determine the audio file path for analysis — resolve relative paths to absolute.
  // Falls back to the video file path so that video-embedded audio can be analyzed.
  const analysisAudioPath = useMemo(() => {
    // Helper to check if a path looks like an absolute filesystem path.
    const isAbsolute = (p: string) =>
      p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p) || p.startsWith('\\\\');

    // Step 1: Use relativeAudioPath + baseFolder if available.
    // This is the primary path for Tauri — constructs an absolute path.
    if (currentSong.relativeAudioPath && currentSong.baseFolder) {
      const normalizedBase = normalizeFilePath(currentSong.baseFolder);
      const normalizedRelative = normalizeFilePath(currentSong.relativeAudioPath);

      // FIX: If relativeAudioPath is already an absolute path, don't prepend baseFolder
      // (this prevents "D:/Songs/D:/Songs/Artist/song.mp3" doubling).
      if (isAbsolute(normalizedRelative)) {
        return normalizedRelative;
      }
      return `${normalizedBase}/${normalizedRelative}`;
    }

    // Step 2: Use audioUrl only if it's a filesystem path (not blob/http).
    // Blob URLs and http URLs can't be read by the Rust backend.
    if (currentSong.audioUrl && isAbsolute(currentSong.audioUrl) && !currentSong.audioUrl.startsWith('blob:')) {
      return currentSong.audioUrl;
    }

    // Step 3: Fallback to video file path (audio may be embedded in the video).
    // CRITICAL: Check relativeVideoPath FIRST (it's a usable filesystem path),
    // then videoBackground only if it's an absolute filesystem path (not blob/http).
    // A blob videoBackground from playback would shadow a valid relativeVideoPath.
    const videoRelative = currentSong.relativeVideoPath;
    const videoAbsolute = currentSong.videoBackground &&
      isAbsolute(currentSong.videoBackground) &&
      !currentSong.videoBackground.startsWith('blob:') &&
      !currentSong.videoBackground.startsWith('http');
    const videoPath = videoRelative || videoAbsolute;
    if (videoPath && !currentSong.youtubeUrl) {
      const normalizedPath = normalizeFilePath(videoPath);
      if (isAbsolute(normalizedPath)) {
        return normalizedPath;
      }
      if (currentSong.baseFolder) {
        const normalizedBase = normalizeFilePath(currentSong.baseFolder);
        return `${normalizedBase}/${normalizedPath}`;
      }
    }

    return null;
  }, [currentSong.audioUrl, currentSong.relativeAudioPath, currentSong.baseFolder, currentSong.videoBackground, currentSong.relativeVideoPath, currentSong.youtubeUrl]);

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
          onSplitNote={handleNoteSplit}
          onUpdateSelectedNote={updateSelectedNote}
          tapMode={tapPlacement}
        />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Sidebar toggle button */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-600 transition-colors"
            title={showSidebar ? 'Panel ausblenden' : 'Panel einblenden'}
          >
            {showSidebar
              ? <PanelRightClose className="w-4 h-4 text-slate-400" />
              : <PanelRightOpen className="w-4 h-4 text-slate-400" />
            }
          </button>
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

        {showSidebar && (
          <aside className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden flex-shrink-0">
            <Tabs defaultValue="note" className="flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-6 bg-slate-800 border-b border-slate-700 rounded-none h-10">
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
                <TabsTrigger value="ai" className="text-[10px] data-[state=active]:bg-slate-700 px-1">
                  <Sparkles className="w-3 h-3" />
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

              <TabsContent value="ai" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
                <ScrollArea className="h-full">
                  <AIAssistantPanel
                    song={currentSong}
                    onSongUpdate={(updates) => {
                      setCurrentSong(prev => ({ ...prev, ...updates }));
                      setHasUnsavedChanges(true);
                    }}
                    onLyricsUpdate={(lyrics) => {
                      pushHistory(lyrics);
                      setCurrentSong(prev => ({ ...prev, lyrics }));
                      setHasUnsavedChanges(true);
                    }}
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
        )}
      </div>

      {currentSong.audioUrl && (
        <audio ref={audioRef} src={currentSong.audioUrl} onEnded={() => setIsPlaying(false)} />
      )}
      {/* Fallback: play audio from video file when no separate audio exists */}
      {!currentSong.audioUrl && currentSong.videoBackground && !currentSong.videoBackground.startsWith('http') && (
        <audio ref={audioRef} src={currentSong.videoBackground} onEnded={() => setIsPlaying(false)} />
      )}
    </div>
  );
}

export default KaraokeEditor;
