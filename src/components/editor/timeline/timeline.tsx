'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Note, Song } from '@/types/game';
import { NoteBlock } from './note-block';
import { LyricTrack } from './lyric-track';
import { Waveform } from './waveform';
import { Play, Pause, ZoomIn, ZoomOut, RotateCcw, SkipBack, SkipForward, Gauge } from 'lucide-react';
import { EDITOR_PLAYBACK_RATES } from '@/hooks/use-editor-playback';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface TimelineProps {
  song: Song;
  currentTime: number;
  isPlaying: boolean;
  selectedNoteId?: string;
  audioBuffer?: AudioBuffer;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onNoteSelect: (noteId: string | undefined) => void;
  onNoteUpdate: (noteId: string, updates: Partial<Note>) => void;
  onNoteDelete: (noteId: string) => void;
  onNoteAdd: (startTime: number, pitch: number) => void;
  onLyricChange: (noteId: string, newLyric: string) => void;
}

export function Timeline({
  song,
  currentTime,
  isPlaying,
  selectedNoteId,
  audioBuffer,
  playbackRate = 1.0,
  onPlaybackRateChange,
  onTimeChange,
  onPlayPause,
  onNoteSelect,
  onNoteUpdate,
  onNoteDelete,
  onNoteAdd,
  onLyricChange
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollCheckRef = useRef<number>(0);
  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [dragState, setDragState] = useState<{
    noteId: string;
    startX: number;
    type: 'move' | 'resize-left' | 'resize-right';
    originalNote: Note;
  } | null>(null);

  // Constants
  const basePixelsPerSecond = 100;
  const pixelsPerSecond = basePixelsPerSecond * zoom;
  const pitchHeight = 20; // Height per pitch in pixels
  const minPitch = 36; // C2
  const maxPitch = 84; // C6
  const pitchRange = maxPitch - minPitch;
  const timelineHeight = pitchRange * pitchHeight;
  const lyricTrackHeight = 40;
  const waveformHeight = 60;
  const totalDuration = song.duration;
  const totalWidth = totalDuration / 1000 * pixelsPerSecond;

  // Get all notes from all lyric lines
  const allNotes = useMemo(() => {
    return song.lyrics.flatMap(line => line.notes);
  }, [song.lyrics]);

  // Calculate playhead position
  const playheadPosition = (currentTime / 1000) * pixelsPerSecond - scrollOffset;

  // Handle scroll
  const handleScroll = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom with ctrl+scroll
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.25, Math.min(4, prev + delta)));
    } else {
      // Horizontal scroll
      setScrollOffset(prev => {
        const maxScroll = totalWidth - (containerRef.current?.clientWidth || 0);
        return Math.max(0, Math.min(maxScroll, prev + e.deltaY));
      });
    }
  }, [totalWidth]);

  // Handle playhead drag
  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  }, []);

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (dragState) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left + scrollOffset;
    const clickY = e.clientY - rect.top - waveformHeight;
    
    // Check if clicked on empty space (not on a note)
    const clickedTime = (clickX / pixelsPerSecond) * 1000;
    const clickedPitch = Math.round(maxPitch - (clickY / pitchHeight));

    // If shift+click, add a new note
    if (e.shiftKey && clickedPitch >= minPitch && clickedPitch <= maxPitch) {
      onNoteAdd(clickedTime, clickedPitch);
      return;
    }

    // Deselect if clicking on empty space
    onNoteSelect(undefined);
  }, [scrollOffset, pixelsPerSecond, pitchHeight, maxPitch, minPitch, dragState, onNoteSelect, onNoteAdd]);

  // Handle mouse move for playhead drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left + scrollOffset;
        const newTime = (x / pixelsPerSecond) * 1000;
        onTimeChange(Math.max(0, Math.min(totalDuration, newTime)));
      }

      if (dragState) {
        const deltaX = e.clientX - dragState.startX;
        const deltaTime = (deltaX / pixelsPerSecond) * 1000;

        if (dragState.type === 'move') {
          onNoteUpdate(dragState.noteId, {
            startTime: Math.max(0, dragState.originalNote.startTime + deltaTime)
          });
        } else if (dragState.type === 'resize-left') {
          const newStart = Math.max(0, dragState.originalNote.startTime + deltaTime);
          const newDuration = dragState.originalNote.duration - (newStart - dragState.originalNote.startTime);
          if (newDuration > 100) {
            onNoteUpdate(dragState.noteId, {
              startTime: newStart,
              duration: newDuration
            });
          }
        } else if (dragState.type === 'resize-right') {
          const newDuration = Math.max(100, dragState.originalNote.duration + deltaTime);
          onNoteUpdate(dragState.noteId, { duration: newDuration });
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
      setDragState(null);
    };

    if (isDraggingPlayhead || dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingPlayhead, dragState, scrollOffset, pixelsPerSecond, totalDuration, onTimeChange, onNoteUpdate]);

  // Handle note drag start
  const handleNoteDragStart = useCallback((noteId: string, startX: number, type: 'move' | 'resize-left' | 'resize-right') => {
    const note = allNotes.find(n => n.id === noteId);
    if (note) {
      setDragState({ noteId, startX, type, originalNote: { ...note } });
    }
  }, [allNotes]);

  // Handle note click
  const handleNoteClick = useCallback((noteId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onNoteSelect(noteId);
  }, [onNoteSelect]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(4, prev + 0.25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.25, prev - 0.25));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setScrollOffset(0);
  }, []);

  // Keep refs for values the scroll loop needs without re-triggering the effect
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const scrollOffsetRef = useRef(scrollOffset);
  scrollOffsetRef.current = scrollOffset;
  const ppsRef = useRef(pixelsPerSecond);
  ppsRef.current = pixelsPerSecond;

  // Auto-scroll while playing — reads currentTime from a ref so the effect
  // is only mounted/unmounted when isPlaying changes, NOT every frame.
  useEffect(() => {
    if (!isPlaying) return;

    let animationId: number;

    const tick = () => {
      const container = containerRef.current;
      if (!container) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      const now = Date.now();
      if (now - lastScrollCheckRef.current > 80) {
        lastScrollCheckRef.current = now;

        const playheadX = (currentTimeRef.current / 1000) * ppsRef.current;
        const visibleWidth = container.clientWidth;
        const currentScroll = scrollOffsetRef.current;

        if (playheadX < currentScroll || playheadX > currentScroll + visibleWidth - 120) {
          setScrollOffset(Math.max(0, playheadX - 120));
        }
      }

      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying]);

  // Format time display
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${minutes}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-lg overflow-hidden">
      {/* Timeline Controls */}
      <div className="flex items-center gap-2 p-2 bg-slate-900 border-b border-slate-700">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onTimeChange(0)}
          className="text-slate-400 hover:text-white"
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          variant="default"
          onClick={onPlayPause}
          className={cn(
            'w-10 h-10 rounded-full',
            isPlaying ? 'bg-purple-600 hover:bg-purple-700' : 'bg-cyan-600 hover:bg-cyan-700'
          )}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onTimeChange(totalDuration)}
          className="text-slate-400 hover:text-white"
        >
          <SkipForward className="w-4 h-4" />
        </Button>

        <div className="flex-1 flex items-center gap-2 px-4">
          <span className="text-cyan-400 font-mono text-sm min-w-[80px]">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={totalDuration}
            step={100}
            onValueChange={([value]) => onTimeChange(value)}
            className="flex-1"
          />
          <span className="text-slate-400 font-mono text-sm min-w-[80px]">
            {formatTime(totalDuration)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Playback speed selector */}
          <div className="flex items-center gap-0.5 mr-1">
            <Gauge className="w-3 h-3 text-slate-500" />
            {EDITOR_PLAYBACK_RATES.map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={playbackRate === value ? 'default' : 'ghost'}
                className={cn(
                  'h-7 px-1.5 text-[10px]',
                  playbackRate === value
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'text-slate-400 hover:text-white'
                )}
                onClick={() => onPlaybackRateChange?.(value)}
              >
                {label}
              </Button>
            ))}
          </div>

          <span className="text-slate-600 text-xs mx-1">|</span>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomOut}
            disabled={zoom <= 0.25}
            className="text-slate-400 hover:text-white"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-slate-400 text-xs min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomIn}
            disabled={zoom >= 4}
            className="text-slate-400 hover:text-white"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomReset}
            className="text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Timeline Content */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-crosshair"
        onWheel={handleScroll}
        onClick={handleTimelineClick}
        style={{ minHeight: timelineHeight + waveformHeight + lyricTrackHeight }}
      >
        {/* Background grid */}
        <TimelineGrid
          width={totalWidth}
          height={timelineHeight}
          pixelsPerSecond={pixelsPerSecond}
          scrollOffset={scrollOffset}
          bpm={song.bpm}
          minPitch={minPitch}
          maxPitch={maxPitch}
          pitchHeight={pitchHeight}
        />

        {/* Waveform */}
        {song.audioUrl && (
          <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: waveformHeight }}>
            <Waveform
              audioUrl={song.audioUrl}
              audioBuffer={audioBuffer}
              width={totalWidth}
              height={waveformHeight}
              zoom={zoom}
              scrollOffset={scrollOffset}
            />
          </div>
        )}

        {/* Notes area */}
        <div 
          className="absolute left-0 right-0"
          style={{ 
            top: waveformHeight,
            height: timelineHeight 
          }}
        >
          {/* Pitch labels */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-slate-900/80 border-r border-slate-700 z-20">
            {Array.from({ length: pitchRange + 1 }, (_, i) => {
              const pitch = maxPitch - i;
              if (pitch % 12 === 0) { // Show C notes
                return (
                  <div
                    key={pitch}
                    className="absolute right-0 text-[10px] text-cyan-400 pr-1 font-mono"
                    style={{ top: i * pitchHeight - 6 }}
                  >
                    C{Math.floor(pitch / 12) - 1}
                  </div>
                );
              }
              return null;
            })}
          </div>

          {/* Notes */}
          <div className="absolute inset-0 ml-8">
            {allNotes.map(note => (
              <NoteBlock
                key={note.id}
                note={note}
                isSelected={selectedNoteId === note.id}
                isPlayingNote={
                  isPlaying &&
                  currentTime >= note.startTime &&
                  currentTime < note.startTime + note.duration
                }
                zoom={zoom}
                pixelsPerSecond={pixelsPerSecond}
                scrollOffset={scrollOffset}
                minPitch={minPitch}
                maxPitch={maxPitch}
                pitchHeight={pitchHeight}
                onClick={handleNoteClick}
                onDragStart={handleNoteDragStart}
              />
            ))}
          </div>
        </div>

        {/* Lyric track */}
        <div 
          className="absolute left-0 right-0 ml-8"
          style={{ 
            top: waveformHeight + timelineHeight,
            height: lyricTrackHeight 
          }}
        >
          <LyricTrack
            notes={allNotes}
            zoom={zoom}
            pixelsPerSecond={pixelsPerSecond}
            scrollOffset={scrollOffset}
            height={lyricTrackHeight}
            onLyricChange={onLyricChange}
            selectedNoteId={selectedNoteId}
          />
        </div>

        {/* Playhead */}
        <div
          className={cn(
            'absolute top-0 bottom-0 w-0.5 bg-purple-500 z-30 cursor-ew-resize',
            isDraggingPlayhead && 'bg-purple-400'
          )}
          style={{ left: `${playheadPosition + 32}px` }}
          onMouseDown={handlePlayheadMouseDown}
        >
          {/* Playhead handle */}
          <div className="absolute -top-1 -left-2 w-4 h-4 bg-purple-500 rounded-full border-2 border-purple-400" />
          
          {/* Time indicator */}
          <div className="absolute -top-8 -left-8 px-1 py-0.5 bg-slate-800 border border-purple-500 rounded text-xs text-purple-300 font-mono whitespace-nowrap">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Timeline grid component
function TimelineGrid({
  width,
  height,
  pixelsPerSecond,
  scrollOffset,
  bpm,
  minPitch,
  maxPitch,
  pitchHeight
}: {
  width: number;
  height: number;
  pixelsPerSecond: number;
  scrollOffset: number;
  bpm: number;
  minPitch: number;
  maxPitch: number;
  pitchHeight: number;
}) {
  const beatDuration = 60000 / bpm; // ms per beat
  const beatsPerSecond = 1000 / beatDuration;
  const pixelsPerBeat = pixelsPerSecond / beatsPerSecond;

  // Calculate visible range
  const visibleWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;

  // Generate beat lines
  const beatLines: React.JSX.Element[] = [];
  const firstBeat = Math.floor(scrollOffset / pixelsPerBeat);
  const lastBeat = Math.ceil((scrollOffset + visibleWidth) / pixelsPerBeat);

  for (let beat = firstBeat; beat <= lastBeat; beat++) {
    const x = beat * pixelsPerBeat - scrollOffset;
    const isDownbeat = beat % 4 === 0;
    
    beatLines.push(
      <div
        key={`beat-${beat}`}
        className={cn(
          'absolute top-0 bottom-0 w-px',
          isDownbeat ? 'bg-slate-600' : 'bg-slate-800'
        )}
        style={{ left: `${x}px` }}
      />
    );
  }

  // Generate pitch lines
  const pitchLines: React.JSX.Element[] = [];
  for (let pitch = minPitch; pitch <= maxPitch; pitch++) {
    const y = (maxPitch - pitch) * pitchHeight;
    const isC = pitch % 12 === 0;
    const isSharp = [1, 3, 6, 8, 10].includes(pitch % 12);
    
    pitchLines.push(
      <div
        key={`pitch-${pitch}`}
        className={cn(
          'absolute left-0 right-0 h-px',
          isC ? 'bg-slate-600' : isSharp ? 'bg-slate-900' : 'bg-slate-800'
        )}
        style={{ top: `${y}px` }}
      />
    );
  }

  return (
    <div className="absolute inset-0 ml-8 pointer-events-none">
      {/* Pitch grid */}
      <div className="absolute inset-0">{pitchLines}</div>
      
      {/* Beat lines */}
      <div className="absolute inset-0">{beatLines}</div>
    </div>
  );
}

export default Timeline;
