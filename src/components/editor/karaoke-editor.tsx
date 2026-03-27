'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Song, Note, LyricLine } from '@/types/game';
import { Timeline } from './timeline/timeline';
import { EditorToolbar } from './editor-toolbar';
import { EditorHeader } from './editor-header';
import { EditorRightPanel } from './editor-right-panel';
import { v4 as uuidv4 } from 'uuid';
import { saveSongToTxt, SaveResult } from '@/lib/editor/save-to-file';
import { logger } from '@/lib/logger';
import { useEditorHistory } from '@/hooks/use-editor-history';
import { useEditorKeyboardShortcuts } from '@/hooks/use-editor-keyboard-shortcuts';

interface KaraokeEditorProps {
  song: Song;
  onSave: (song: Song) => void;
  onCancel: () => void;
}

export function KaraokeEditor({ song: initialSong, onSave, onCancel }: KaraokeEditorProps) {
  // State
  const [currentSong, setCurrentSong] = useState<Song>(initialSong);
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | undefined>();
  
  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // History management hook
  const {
    pushHistory,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo,
  } = useEditorHistory({ initialLyrics: initialSong.lyrics });

  // Get all notes from all lines
  const allNotes = useMemo(() => {
    return currentSong.lyrics.flatMap(line => line.notes);
  }, [currentSong.lyrics]);

  // Get selected note
  const selectedNote = useMemo(() => {
    return allNotes.find(n => n.id === selectedNoteId);
  }, [allNotes, selectedNoteId]);

  // Audio playback
  useEffect(() => {
    if (isPlaying) {
      const startTime = performance.now();
      const startOffset = currentTime;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const newTime = startOffset + elapsed;
        
        if (newTime >= currentSong.duration) {
          setCurrentTime(currentSong.duration);
          setIsPlaying(false);
        } else {
          setCurrentTime(newTime);
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Also play actual audio
      if (audioRef.current) {
        audioRef.current.currentTime = currentTime / 1000;
        audioRef.current.play().catch(() => {});
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentSong.duration]);

  // Update audio element
  useEffect(() => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.currentTime = currentTime / 1000;
    }
  }, [currentTime, isPlaying]);

  // History management - wrapped functions
  const handlePushHistory = useCallback((newLyrics: LyricLine[]) => {
    pushHistory(newLyrics);
    setHasUnsavedChanges(true);
  }, [pushHistory]);

  const undo = useCallback(() => {
    const previousLyrics = undoHistory();
    if (previousLyrics) {
      setCurrentSong(prev => ({
        ...prev,
        lyrics: previousLyrics
      }));
    }
  }, [undoHistory]);

  const redo = useCallback(() => {
    const nextLyrics = redoHistory();
    if (nextLyrics) {
      setCurrentSong(prev => ({
        ...prev,
        lyrics: nextLyrics
      }));
    }
  }, [redoHistory]);

  // Handlers
  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleTimeChange = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleNoteSelect = useCallback((noteId: string | undefined) => {
    setSelectedNoteId(noteId);
  }, []);

  const handleNoteUpdate = useCallback((noteId: string, updates: Partial<Note>) => {
    setCurrentSong(prev => {
      const newLyrics = prev.lyrics.map(line => ({
        ...line,
        notes: line.notes.map(note => 
          note.id === noteId ? { ...note, ...updates } : note
        )
      }));
      handlePushHistory(newLyrics);
      return { ...prev, lyrics: newLyrics };
    });
  }, [handlePushHistory]);

  const handleNoteDelete = useCallback((noteId: string) => {
    setCurrentSong(prev => {
      const newLyrics = prev.lyrics.map(line => ({
        ...line,
        notes: line.notes.filter(note => note.id !== noteId)
      })).filter(line => line.notes.length > 0);
      handlePushHistory(newLyrics);
      return { ...prev, lyrics: newLyrics };
    });
    setSelectedNoteId(undefined);
  }, [handlePushHistory]);

  const handleNoteAdd = useCallback((startTime: number, pitch: number) => {
    const newNote: Note = {
      id: uuidv4(),
      pitch,
      frequency: 440 * Math.pow(2, (pitch - 69) / 12),
      startTime,
      duration: 500,
      lyric: '---',
      isBonus: false,
      isGolden: false
    };

    // Find or create appropriate line
    setCurrentSong(prev => {
      let targetLine = prev.lyrics.find(line => 
        startTime >= line.startTime && startTime <= line.endTime
      );

      let newLyrics: LyricLine[];
      
      if (targetLine) {
        newLyrics = prev.lyrics.map(line => 
          line.id === targetLine!.id
            ? { ...line, notes: [...line.notes, newNote].sort((a, b) => a.startTime - b.startTime) }
            : line
        );
      } else {
        // Create new line
        const newLine: LyricLine = {
          id: uuidv4(),
          text: '',
          startTime,
          endTime: startTime + 2000,
          notes: [newNote]
        };
        newLyrics = [...prev.lyrics, newLine].sort((a, b) => a.startTime - b.startTime);
      }

      handlePushHistory(newLyrics);
      return { ...prev, lyrics: newLyrics };
    });
    
    setSelectedNoteId(newNote.id);
  }, [handlePushHistory]);

  const handleLyricChange = useCallback((noteId: string, newLyric: string) => {
    setCurrentSong(prev => {
      const newLyrics = prev.lyrics.map(line => ({
        ...line,
        notes: line.notes.map(note => 
          note.id === noteId ? { ...note, lyric: newLyric } : note
        ),
        text: line.notes.map(n => n.lyric).join(' ')
      }));
      handlePushHistory(newLyrics);
      return { ...prev, lyrics: newLyrics };
    });
  }, [handlePushHistory]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveResult(null);
    
    try {
      // First save to library (memory)
      onSave(currentSong);
      
      // Then try to save to txt file
      const result = await saveSongToTxt(currentSong);
      setSaveResult(result);
      setHasUnsavedChanges(false);
      
      // Clear message after 5 seconds
      setTimeout(() => setSaveResult(null), 5000);
    } catch (error) {
      logger.error('[KaraokeEditor]', 'Save error:', error);
      setSaveResult({
        success: false,
        message: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
      });
    } finally {
      setIsSaving(false);
    }
  }, [currentSong, onSave]);

  // Copy/Paste handlers
  const handleCopy = useCallback((note: Note) => {
    navigator.clipboard.writeText(JSON.stringify(note));
  }, []);

  const handlePaste = useCallback((note: Note, time: number) => {
    handleNoteAdd(time, note.pitch);
  }, [handleNoteAdd]);

  // Keyboard shortcuts hook
  useEditorKeyboardShortcuts({
    onPlayPause: handlePlayPause,
    onDelete: handleNoteDelete,
    onSave: handleSave,
    onUndo: undo,
    onRedo: redo,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onDeselect: () => setSelectedNoteId(undefined),
    selectedNoteId,
    selectedNote,
    currentTime,
  });

  // Update note property handlers
  const updateSelectedNote = useCallback((updates: Partial<Note>) => {
    if (selectedNoteId) {
      handleNoteUpdate(selectedNoteId, updates);
    }
  }, [selectedNoteId, handleNoteUpdate]);

  const duplicateNote = useCallback(() => {
    if (selectedNote) {
      handleNoteAdd(selectedNote.startTime + selectedNote.duration + 100, selectedNote.pitch);
    }
  }, [selectedNote, handleNoteAdd]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white">
      {/* Header */}
      <EditorHeader
        currentSong={currentSong}
        canUndo={canUndo}
        canRedo={canRedo}
        isSaving={isSaving}
        saveResult={saveResult}
        hasUnsavedChanges={hasUnsavedChanges}
        onUndo={undo}
        onRedo={redo}
        onCancel={onCancel}
        onSave={handleSave}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Panel - Tools */}
        <EditorToolbar
          selectedNote={selectedNote}
          selectedNoteId={selectedNoteId}
          currentTime={currentTime}
          onAddNote={handleNoteAdd}
          onDuplicateNote={duplicateNote}
          onDeleteNote={handleNoteDelete}
          onUpdateSelectedNote={updateSelectedNote}
        />

        {/* Center - Timeline */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <Timeline
            song={currentSong}
            currentTime={currentTime}
            isPlaying={isPlaying}
            selectedNoteId={selectedNoteId}
            audioBuffer={audioBuffer}
            onTimeChange={handleTimeChange}
            onPlayPause={handlePlayPause}
            onNoteSelect={handleNoteSelect}
            onNoteUpdate={handleNoteUpdate}
            onNoteDelete={handleNoteDelete}
            onNoteAdd={handleNoteAdd}
            onLyricChange={handleLyricChange}
          />
        </main>

        {/* Right Panel - Tabs (Note Properties + Song Info + Metadata) */}
        <EditorRightPanel
          selectedNote={selectedNote}
          currentSong={currentSong}
          updateSelectedNote={updateSelectedNote}
          setCurrentSong={setCurrentSong}
          setHasUnsavedChanges={setHasUnsavedChanges}
        />
      </div>

      {/* Hidden audio element for playback */}
      {currentSong.audioUrl && (
        <audio
          ref={audioRef}
          src={currentSong.audioUrl}
          onEnded={() => setIsPlaying(false)}
        />
      )}
    </div>
  );
}

export default KaraokeEditor;
