'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Song, Note, LyricLine, DuetPlayer } from '@/types/game';
import { Timeline } from './timeline/timeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Info
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { midiToNoteName, NOTE_NAMES } from '@/types/game';

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

  const handleSave = useCallback(() => {
    onSave(currentSong);
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
            className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
          >
            <Save className="w-4 h-4 mr-1" />
            Save
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

        {/* Right Panel - Note Properties */}
        <aside className="w-64 bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden flex-shrink-0">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Note Properties
            </h2>
          </div>

          {selectedNote ? (
            <ScrollArea className="flex-1">
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

                {/* Frequency display */}
                <div className="pt-2 border-t border-slate-700">
                  <div className="text-xs text-slate-500">
                    Frequency: <span className="text-slate-300">{selectedNote.frequency.toFixed(2)} Hz</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center text-slate-500">
                <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a note to edit properties</p>
                <p className="text-xs mt-1">or Shift+Click to add a new note</p>
              </div>
            </div>
          )}
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
