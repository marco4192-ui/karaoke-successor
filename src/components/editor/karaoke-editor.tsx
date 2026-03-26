'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Song, Note, LyricLine, DuetPlayer, Difficulty } from '@/types/game';
import { Timeline } from './timeline/timeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  Undo, 
  Redo, 
  Trash2, 
  Plus, 
  Music, 
  Mic, 
  Star, 
  Zap,
  Users,
  Copy,
  Scissors,
  Info,
  FileDown,
  CheckCircle,
  AlertCircle,
  FileText,
  Settings
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { midiToNoteName, NOTE_NAMES } from '@/types/game';
import { saveSongToTxt, canSaveToOriginal, SaveResult } from '@/lib/editor/save-to-file';
import { logger } from '@/lib/logger';

interface KaraokeEditorProps {
  song: Song;
  onSave: (song: Song) => void;
  onCancel: () => void;
}

// History state for undo/redo
interface HistoryState {
  lyrics: LyricLine[];
}

export function KaraokeEditor({ song: initialSong, onSave, onCancel }: KaraokeEditorProps) {
  // State
  const [currentSong, setCurrentSong] = useState<Song>(initialSong);
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [history, setHistory] = useState<HistoryState[]>([{ lyrics: initialSong.lyrics }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | undefined>();
  
  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  // History management
  const pushHistory = useCallback((newLyrics: LyricLine[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ lyrics: JSON.parse(JSON.stringify(newLyrics)) });
      // Limit history to 50 entries
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
    setHasUnsavedChanges(true);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setCurrentSong(prev => ({
        ...prev,
        lyrics: JSON.parse(JSON.stringify(history[historyIndex - 1].lyrics))
      }));
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setCurrentSong(prev => ({
        ...prev,
        lyrics: JSON.parse(JSON.stringify(history[historyIndex + 1].lyrics))
      }));
    }
  }, [historyIndex, history]);

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

      pushHistory(newLyrics);
      return { ...prev, lyrics: newLyrics };
    });
    
    setSelectedNoteId(newNote.id);
  }, [pushHistory]);

  const handleLyricChange = useCallback((noteId: string, newLyric: string) => {
    setCurrentSong(prev => {
      const newLyrics = prev.lyrics.map(line => ({
        ...line,
        notes: line.notes.map(note => 
          note.id === noteId ? { ...note, lyric: newLyric } : note
        ),
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space: Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      }

      // Delete: Delete selected note
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedNoteId) {
          e.preventDefault();
          handleNoteDelete(selectedNoteId);
        }
      }

      // Ctrl+S: Save
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        handleSave();
      }

      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Shift+Z or Ctrl+Y: Redo
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }

      // Ctrl+C: Copy selected note
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC' && selectedNote) {
        e.preventDefault();
        navigator.clipboard.writeText(JSON.stringify(selectedNote));
      }

      // Ctrl+V: Paste note
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        e.preventDefault();
        navigator.clipboard.readText().then(text => {
          try {
            const copiedNote = JSON.parse(text) as Note;
            handleNoteAdd(currentTime, copiedNote.pitch);
          } catch {
            // Invalid clipboard data
          }
        });
      }

      // Escape: Deselect
      if (e.code === 'Escape') {
        setSelectedNoteId(undefined);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, selectedNoteId, handleNoteDelete, handleSave, undo, redo, selectedNote, handleNoteAdd, currentTime]);

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
      <header className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Karaoke Editor
          </h1>
          <div className="text-sm text-slate-400">
            <span className="text-white">{currentSong.title}</span>
            <span className="mx-2">-</span>
            <span>{currentSong.artist}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save Status */}
          {saveResult && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
              saveResult.success 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {saveResult.success 
                ? <CheckCircle className="w-3 h-3" />
                : <AlertCircle className="w-3 h-3" />
              }
              {saveResult.message}
            </div>
          )}
          {hasUnsavedChanges && !saveResult && (
            <span className="text-xs text-yellow-400">Ungespeicherte Änderungen</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={historyIndex === 0}
            className="text-slate-400 hover:text-white"
          >
            <Undo className="w-4 h-4 mr-1" />
            Undo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={historyIndex === history.length - 1}
            className="text-slate-400 hover:text-white"
          >
            <Redo className="w-4 h-4 mr-1" />
            Redo
          </Button>
          <Separator orientation="vertical" className="h-6 mx-2 bg-slate-700" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-slate-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                Speichere...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Speichern
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Panel - Tools */}
        <aside className="w-56 bg-slate-900 border-r border-slate-700 flex flex-col overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Tools</h2>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedNote && handleNoteAdd(currentTime, selectedNote.pitch)}
                className="justify-start border-slate-600 text-slate-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={duplicateNote}
                disabled={!selectedNote}
                className="justify-start border-slate-600 text-slate-300"
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedNoteId && handleNoteDelete(selectedNoteId)}
                disabled={!selectedNote}
                className="justify-start border-slate-600 text-slate-300 hover:border-red-500 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedNote}
                className="justify-start border-slate-600 text-slate-300"
              >
                <Scissors className="w-4 h-4 mr-2" />
                Split
              </Button>
            </div>
          </div>

          <div className="p-4 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Note Type</h2>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={selectedNote && !selectedNote.isGolden && !selectedNote.isBonus ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSelectedNote({ isGolden: false, isBonus: false })}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <Music className="w-4 h-4" />
              </Button>
              <Button
                variant={selectedNote?.isGolden ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSelectedNote({ isGolden: true, isBonus: false })}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Star className="w-4 h-4" />
              </Button>
              <Button
                variant={selectedNote?.isBonus ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSelectedNote({ isGolden: false, isBonus: true })}
                className="bg-pink-600 hover:bg-pink-700"
              >
                <Zap className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>Normal</span>
              <span>Golden</span>
              <span>Bonus</span>
            </div>
          </div>

          <div className="p-4 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Duet Player</h2>
            <Select
              value={selectedNote?.player || 'both'}
              onValueChange={(value: DuetPlayer | 'both') => 
                updateSelectedNote({ player: value === 'both' ? undefined : value })
              }
              disabled={!selectedNote}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600">
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Both Players
                  </div>
                </SelectItem>
                <SelectItem value="P1">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-cyan-400" />
                    Player 1
                  </div>
                </SelectItem>
                <SelectItem value="P2">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-purple-400" />
                    Player 2
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Keyboard shortcuts reference */}
          <div className="p-4 mt-auto">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Shortcuts</h2>
            <div className="space-y-1 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Play/Pause</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Space</kbd>
              </div>
              <div className="flex justify-between">
                <span>Delete Note</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Del</kbd>
              </div>
              <div className="flex justify-between">
                <span>Save</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Ctrl+S</kbd>
              </div>
              <div className="flex justify-between">
                <span>Undo</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Ctrl+Z</kbd>
              </div>
              <div className="flex justify-between">
                <span>Add Note</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Shift+Click</kbd>
              </div>
            </div>
          </div>
        </aside>

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
        <aside className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden flex-shrink-0">
          <Tabs defaultValue="note" className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800 border-b border-slate-700 rounded-none h-10">
              <TabsTrigger value="note" className="text-xs data-[state=active]:bg-slate-700">
                <Music className="w-3 h-3 mr-1" />
                Note
              </TabsTrigger>
              <TabsTrigger value="info" className="text-xs data-[state=active]:bg-slate-700">
                <FileText className="w-3 h-3 mr-1" />
                Info
              </TabsTrigger>
              <TabsTrigger value="metadata" className="text-xs data-[state=active]:bg-slate-700">
                <Settings className="w-3 h-3 mr-1" />
                Meta
              </TabsTrigger>
            </TabsList>

            {/* Note Properties Tab */}
            <TabsContent value="note" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
              {selectedNote ? (
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {/* Lyric */}
                    <div className="space-y-2">
                      <Label htmlFor="note-lyric" className="text-slate-400 text-xs">Lyric</Label>
                      <Input
                        id="note-lyric"
                        name="note-lyric"
                        value={selectedNote.lyric}
                        onChange={(e) => updateSelectedNote({ lyric: e.target.value })}
                        className="bg-slate-800 border-slate-600"
                      />
                      <p className="text-xs text-slate-500">
                        Tipp: Leerzeichen am Ende = Wortende
                      </p>
                    </div>

                    {/* Pitch */}
                    <div className="space-y-2">
                      <Label htmlFor="note-pitch" className="text-slate-400 text-xs">Pitch (MIDI: {selectedNote.pitch})</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="note-pitch"
                          name="note-pitch"
                          type="number"
                          value={selectedNote.pitch}
                          onChange={(e) => updateSelectedNote({ 
                            pitch: parseInt(e.target.value),
                            frequency: 440 * Math.pow(2, (parseInt(e.target.value) - 69) / 12)
                          })}
                          min={0}
                          max={127}
                          className="bg-slate-800 border-slate-600 w-20"
                        />
                        <span className="text-cyan-400 font-mono text-sm">
                          {midiToNoteName(selectedNote.pitch)}
                        </span>
                      </div>
                      <Slider
                        value={[selectedNote.pitch]}
                        min={36}
                        max={84}
                        step={1}
                        onValueChange={([pitch]) => updateSelectedNote({ 
                          pitch,
                          frequency: 440 * Math.pow(2, (pitch - 69) / 12)
                        })}
                        className="mt-2"
                      />
                    </div>

                    {/* Start Time */}
                    <div className="space-y-2">
                      <Label htmlFor="note-start-time" className="text-slate-400 text-xs">Start Time (ms)</Label>
                      <Input
                        id="note-start-time"
                        name="note-start-time"
                        type="number"
                        value={Math.round(selectedNote.startTime)}
                        onChange={(e) => updateSelectedNote({ startTime: parseInt(e.target.value) })}
                        className="bg-slate-800 border-slate-600"
                      />
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                      <Label htmlFor="note-duration" className="text-slate-400 text-xs">Duration (ms)</Label>
                      <Input
                        id="note-duration"
                        name="note-duration"
                        type="number"
                        value={Math.round(selectedNote.duration)}
                        onChange={(e) => updateSelectedNote({ duration: parseInt(e.target.value) })}
                        min={50}
                        className="bg-slate-800 border-slate-600"
                      />
                      <Slider
                        value={[selectedNote.duration]}
                        min={50}
                        max={5000}
                        step={50}
                        onValueChange={([duration]) => updateSelectedNote({ duration })}
                        className="mt-2"
                      />
                    </div>

                    {/* Note Type Toggles */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-400 text-xs flex items-center gap-2">
                          <Star className="w-3 h-3 text-amber-400" />
                          Golden Note
                        </Label>
                        <Switch
                          checked={selectedNote.isGolden}
                          onCheckedChange={(checked) => updateSelectedNote({ 
                            isGolden: checked,
                            isBonus: checked ? false : selectedNote.isBonus
                          })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-400 text-xs flex items-center gap-2">
                          <Zap className="w-3 h-3 text-pink-400" />
                          Bonus Note
                        </Label>
                        <Switch
                          checked={selectedNote.isBonus}
                          onCheckedChange={(checked) => updateSelectedNote({ 
                            isBonus: checked,
                            isGolden: checked ? false : selectedNote.isGolden
                          })}
                        />
                      </div>
                    </div>

                    {/* Duet Player */}
                    <div className="space-y-2 pt-2 border-t border-slate-700">
                      <Label className="text-slate-400 text-xs flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        Spieler
                      </Label>
                      <Select
                        value={selectedNote.player || 'both'}
                        onValueChange={(value: DuetPlayer | 'both') => 
                          updateSelectedNote({ player: value === 'both' ? undefined : value })
                        }
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600">
                          <SelectValue placeholder="Spieler wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both">Beide Spieler</SelectItem>
                          <SelectItem value="P1">Spieler 1</SelectItem>
                          <SelectItem value="P2">Spieler 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Frequency display */}
                    <div className="pt-2 border-t border-slate-700">
                      <div className="text-xs text-slate-500">
                        Frequenz: <span className="text-slate-300">{selectedNote.frequency.toFixed(2)} Hz</span>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center text-slate-500">
                    <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Wähle eine Note aus</p>
                    <p className="text-xs mt-1">Shift+Click zum Hinzufügen</p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Song Info Tab */}
            <TabsContent value="info" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="song-title" className="text-slate-400 text-xs">Titel</Label>
                    <Input
                      id="song-title"
                      name="song-title"
                      value={currentSong.title}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, title: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                      className="bg-slate-800 border-slate-600"
                    />
                  </div>

                  {/* Artist */}
                  <div className="space-y-2">
                    <Label htmlFor="song-artist" className="text-slate-400 text-xs">Künstler</Label>
                    <Input
                      id="song-artist"
                      name="song-artist"
                      value={currentSong.artist}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, artist: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                      className="bg-slate-800 border-slate-600"
                    />
                  </div>

                  {/* BPM */}
                  <div className="space-y-2">
                    <Label htmlFor="song-bpm" className="text-slate-400 text-xs">BPM</Label>
                    <Input
                      id="song-bpm"
                      name="song-bpm"
                      type="number"
                      value={currentSong.bpm}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, bpm: parseFloat(e.target.value) || 120 }));
                        setHasUnsavedChanges(true);
                      }}
                      min={20}
                      max={300}
                      step={0.01}
                      className="bg-slate-800 border-slate-600"
                    />
                    <p className="text-xs text-slate-500">Beats pro Minute</p>
                  </div>

                  {/* GAP */}
                  <div className="space-y-2">
                    <Label htmlFor="song-gap" className="text-slate-400 text-xs">GAP (ms)</Label>
                    <Input
                      id="song-gap"
                      name="song-gap"
                      type="number"
                      value={currentSong.gap}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, gap: parseInt(e.target.value) || 0 }));
                        setHasUnsavedChanges(true);
                      }}
                      className="bg-slate-800 border-slate-600"
                    />
                    <p className="text-xs text-slate-500">Verzögerung vor Lyrics-Start</p>
                  </div>

                  {/* START */}
                  <div className="space-y-2">
                    <Label htmlFor="song-start" className="text-slate-400 text-xs">START (ms)</Label>
                    <Input
                      id="song-start"
                      name="song-start"
                      type="number"
                      value={currentSong.start || 0}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, start: parseInt(e.target.value) || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      className="bg-slate-800 border-slate-600"
                    />
                    <p className="text-xs text-slate-500">Zeit überspringen am Anfang</p>
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* Video URL */}
                  <div className="space-y-2">
                    <Label htmlFor="song-video" className="text-slate-400 text-xs">Video URL</Label>
                    <Input
                      id="song-video"
                      name="song-video"
                      value={currentSong.videoBackground || currentSong.youtubeUrl || ''}
                      onChange={(e) => {
                        const url = e.target.value;
                        const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
                        setCurrentSong(prev => ({
                          ...prev,
                          videoBackground: isYoutube ? undefined : url,
                          youtubeUrl: isYoutube ? url : undefined,
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="YouTube URL oder lokaler Pfad"
                      className="bg-slate-800 border-slate-600"
                    />
                  </div>

                  {/* Video Gap */}
                  <div className="space-y-2">
                    <Label htmlFor="song-videogap" className="text-slate-400 text-xs">Video GAP (ms)</Label>
                    <Input
                      id="song-videogap"
                      name="song-videogap"
                      type="number"
                      value={currentSong.videoGap || 0}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, videoGap: parseInt(e.target.value) || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      className="bg-slate-800 border-slate-600"
                    />
                    <p className="text-xs text-slate-500">Video-Versatz zur Audio</p>
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* Genre */}
                  <div className="space-y-2">
                    <Label htmlFor="song-genre" className="text-slate-400 text-xs">Genre</Label>
                    <Input
                      id="song-genre"
                      name="song-genre"
                      value={currentSong.genre || ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, genre: e.target.value || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      className="bg-slate-800 border-slate-600"
                    />
                  </div>

                  {/* Year */}
                  <div className="space-y-2">
                    <Label htmlFor="song-year" className="text-slate-400 text-xs">Jahr</Label>
                    <Input
                      id="song-year"
                      name="song-year"
                      type="number"
                      value={currentSong.year || ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, year: parseInt(e.target.value) || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="z.B. 2024"
                      className="bg-slate-800 border-slate-600"
                    />
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <Label htmlFor="song-language" className="text-slate-400 text-xs">Sprache</Label>
                    <Select
                      value={currentSong.language || ''}
                      onValueChange={(value) => {
                        setCurrentSong(prev => ({ ...prev, language: value || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-600">
                        <SelectValue placeholder="Sprache wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="en">Englisch</SelectItem>
                        <SelectItem value="es">Spanisch</SelectItem>
                        <SelectItem value="fr">Französisch</SelectItem>
                        <SelectItem value="it">Italienisch</SelectItem>
                        <SelectItem value="pt">Portugiesisch</SelectItem>
                        <SelectItem value="ja">Japanisch</SelectItem>
                        <SelectItem value="ko">Koreanisch</SelectItem>
                        <SelectItem value="zh">Chinesisch</SelectItem>
                        <SelectItem value="ru">Russisch</SelectItem>
                        <SelectItem value="other">Andere</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Edition */}
                  <div className="space-y-2">
                    <Label htmlFor="song-edition" className="text-slate-400 text-xs">Edition / Album</Label>
                    <Input
                      id="song-edition"
                      name="song-edition"
                      value={currentSong.album || ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, album: e.target.value || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      className="bg-slate-800 border-slate-600"
                    />
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* Duet Settings */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-400 text-xs flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        Duet Mode
                      </Label>
                      <Switch
                        checked={currentSong.isDuet || false}
                        onCheckedChange={(checked) => {
                          setCurrentSong(prev => ({ 
                            ...prev, 
                            isDuet: checked,
                            duetPlayerNames: checked ? (prev.duetPlayerNames || ['Player 1', 'Player 2']) : undefined
                          }));
                          setHasUnsavedChanges(true);
                        }}
                      />
                    </div>

                    {currentSong.isDuet && currentSong.duetPlayerNames && (
                      <div className="space-y-2 pl-2">
                        <div className="space-y-1">
                          <Label className="text-slate-500 text-xs">Spieler 1 Name</Label>
                          <Input
                            value={currentSong.duetPlayerNames[0]}
                            onChange={(e) => {
                              setCurrentSong(prev => ({
                                ...prev,
                                duetPlayerNames: [e.target.value, prev.duetPlayerNames?.[1] || 'Player 2']
                              }));
                              setHasUnsavedChanges(true);
                            }}
                            className="bg-slate-800 border-slate-600 h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-slate-500 text-xs">Spieler 2 Name</Label>
                          <Input
                            value={currentSong.duetPlayerNames[1]}
                            onChange={(e) => {
                              setCurrentSong(prev => ({
                                ...prev,
                                duetPlayerNames: [prev.duetPlayerNames?.[0] || 'Player 1', e.target.value]
                              }));
                              setHasUnsavedChanges(true);
                            }}
                            className="bg-slate-800 border-slate-600 h-8"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* File Info */}
                  <div className="text-xs text-slate-500 space-y-1">
                    <div>Dauer: <span className="text-slate-300">{Math.round(currentSong.duration / 1000)}s</span></div>
                    <div>Noten: <span className="text-slate-300">{allNotes.length}</span></div>
                    <div>Zeilen: <span className="text-slate-300">{currentSong.lyrics.length}</span></div>
                    {currentSong.relativeTxtPath && (
                      <div>Datei: <span className="text-slate-300">{currentSong.relativeTxtPath}</span></div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Metadata Tab - UltraStar TXT Header Fields */}
            <TabsContent value="metadata" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <div className="text-xs text-slate-400 mb-2">
                    UltraStar TXT Metadaten - werden direkt in die Datei gespeichert
                  </div>

                  {/* VERSION */}
                  <div className="space-y-2">
                    <Label htmlFor="meta-version" className="text-slate-400 text-xs">#VERSION:</Label>
                    <Input
                      id="meta-version"
                      value={currentSong.version || ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, version: e.target.value || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="z.B. 1.0.0"
                      className="bg-slate-800 border-slate-600 h-8"
                    />
                  </div>

                  {/* CREATOR */}
                  <div className="space-y-2">
                    <Label htmlFor="meta-creator" className="text-slate-400 text-xs">#CREATOR:</Label>
                    <Input
                      id="meta-creator"
                      value={currentSong.creator || ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, creator: e.target.value || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Ersteller der TXT-Datei"
                      className="bg-slate-800 border-slate-600 h-8"
                    />
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* MP3 File */}
                  <div className="space-y-2">
                    <Label htmlFor="meta-mp3" className="text-slate-400 text-xs">#MP3:</Label>
                    <Input
                      id="meta-mp3"
                      value={currentSong.mp3File || ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, mp3File: e.target.value || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="song.mp3"
                      className="bg-slate-800 border-slate-600 h-8"
                    />
                  </div>

                  {/* COVER File */}
                  <div className="space-y-2">
                    <Label htmlFor="meta-cover" className="text-slate-400 text-xs">#COVER:</Label>
                    <Input
                      id="meta-cover"
                      value={currentSong.coverFile || ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, coverFile: e.target.value || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="cover.jpg"
                      className="bg-slate-800 border-slate-600 h-8"
                    />
                  </div>

                  {/* BACKGROUND File */}
                  <div className="space-y-2">
                    <Label htmlFor="meta-background" className="text-slate-400 text-xs">#BACKGROUND:</Label>
                    <Input
                      id="meta-background"
                      value={currentSong.backgroundFile || ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, backgroundFile: e.target.value || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="background.jpg"
                      className="bg-slate-800 border-slate-600 h-8"
                    />
                  </div>

                  {/* VIDEO File */}
                  <div className="space-y-2">
                    <Label htmlFor="meta-video" className="text-slate-400 text-xs">#VIDEO:</Label>
                    <Input
                      id="meta-video"
                      value={currentSong.videoFile || currentSong.youtubeUrl || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        const isUrl = value.startsWith('http://') || value.startsWith('https://');
                        setCurrentSong(prev => ({
                          ...prev,
                          videoFile: isUrl ? undefined : value || undefined,
                          youtubeUrl: isUrl ? value : undefined,
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="video.mp4 oder YouTube URL"
                      className="bg-slate-800 border-slate-600 h-8"
                    />
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* PREVIEWSTART */}
                  <div className="space-y-2">
                    <Label htmlFor="meta-previewstart" className="text-slate-400 text-xs">#PREVIEWSTART: (Sekunden)</Label>
                    <Input
                      id="meta-previewstart"
                      type="number"
                      value={currentSong.previewStart ?? ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, previewStart: parseFloat(e.target.value) || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="z.B. 30"
                      className="bg-slate-800 border-slate-600 h-8"
                    />
                  </div>

                  {/* PREVIEWDURATION */}
                  <div className="space-y-2">
                    <Label htmlFor="meta-previewduration" className="text-slate-400 text-xs">#PREVIEWDURATION: (Sekunden)</Label>
                    <Input
                      id="meta-previewduration"
                      type="number"
                      value={currentSong.previewDuration ?? ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, previewDuration: parseFloat(e.target.value) || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="z.B. 15"
                      className="bg-slate-800 border-slate-600 h-8"
                    />
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* MEDLEYSTARTBEAT */}
                  <div className="space-y-2">
                    <Label htmlFor="meta-medleystart" className="text-slate-400 text-xs">#MEDLEYSTARTBEAT:</Label>
                    <Input
                      id="meta-medleystart"
                      type="number"
                      value={currentSong.medleyStartBeat ?? ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, medleyStartBeat: parseInt(e.target.value) || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Beat-Nummer"
                      className="bg-slate-800 border-slate-600 h-8"
                    />
                  </div>

                  {/* MEDLEYENDBEAT */}
                  <div className="space-y-2">
                    <Label htmlFor="meta-medleyend" className="text-slate-400 text-xs">#MEDLEYENDBEAT:</Label>
                    <Input
                      id="meta-medleyend"
                      type="number"
                      value={currentSong.medleyEndBeat ?? ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, medleyEndBeat: parseInt(e.target.value) || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Beat-Nummer"
                      className="bg-slate-800 border-slate-600 h-8"
                    />
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* END */}
                  <div className="space-y-2">
                    <Label htmlFor="meta-end" className="text-slate-400 text-xs">#END: (Millisekunden)</Label>
                    <Input
                      id="meta-end"
                      type="number"
                      value={currentSong.end ?? ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, end: parseInt(e.target.value) || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Song-Ende in ms"
                      className="bg-slate-800 border-slate-600 h-8"
                    />
                  </div>

                  {/* TAGS */}
                  <div className="space-y-2">
                    <Label htmlFor="meta-tags" className="text-slate-400 text-xs">#TAGS:</Label>
                    <Input
                      id="meta-tags"
                      value={currentSong.tags || ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({ ...prev, tags: e.target.value || undefined }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="tag1, tag2, tag3"
                      className="bg-slate-800 border-slate-600 h-8"
                    />
                    <p className="text-xs text-slate-500">Kommagetrennte Tags</p>
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* P1 / P2 Names for Duet */}
                  <div className="space-y-2">
                    <Label htmlFor="meta-p1" className="text-slate-400 text-xs">#P1: (Duet Spieler 1)</Label>
                    <Input
                      id="meta-p1"
                      value={currentSong.duetPlayerNames?.[0] || ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({
                          ...prev,
                          isDuet: true,
                          duetPlayerNames: [e.target.value, prev.duetPlayerNames?.[1] || 'Player 2']
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Spieler 1 Name"
                      className="bg-slate-800 border-slate-600 h-8"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meta-p2" className="text-slate-400 text-xs">#P2: (Duet Spieler 2)</Label>
                    <Input
                      id="meta-p2"
                      value={currentSong.duetPlayerNames?.[1] || ''}
                      onChange={(e) => {
                        setCurrentSong(prev => ({
                          ...prev,
                          isDuet: true,
                          duetPlayerNames: [prev.duetPlayerNames?.[0] || 'Player 1', e.target.value]
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Spieler 2 Name"
                      className="bg-slate-800 border-slate-600 h-8"
                    />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </aside>
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
