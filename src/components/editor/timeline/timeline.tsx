'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Note, Song } from '@/types/game';
import { NoteBlock } from './note-block';
import { LyricTrack } from './lyric-track';
import { Waveform } from './waveform';
import { Play, Pause, ZoomIn, ZoomOut, RotateCcw, SkipBack, SkipForward, Gauge, Magnet, Columns2 } from 'lucide-react';
import { EDITOR_PLAYBACK_RATES } from '@/hooks/use-editor-playback';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useTranslation } from '@/lib/i18n/translations';
import { snapTimeToBeat } from '@/lib/editor/beat-utils';

/**
 * History mode for note updates:
 * - 'push'   → update state AND push a history entry (discrete actions)
 * - 'live'   → update state only, mark dirty (dragging, slider, typing)
 * - 'commit' → push a history entry from the current state (drag release, blur)
 * - 'replace' → push overwriting the top entry (tap-mode: create + duration = one step)
 */
export type NoteHistoryMode = 'push' | 'live' | 'commit' | 'replace';

// Visible pitch range per lane (3 octaves = 36 semitones)
const VISIBLE_OCTAVES = 3;
const VISIBLE_PITCH_RANGE = VISIBLE_OCTAVES * 12;
// Split-view lanes show 2 octaves each (both players share the vertical space)
const SPLIT_PITCH_RANGE = 2 * 12;

interface TimelineProps {
  song: Song;
  currentTime: number;
  isPlaying: boolean;
  selectedNoteId?: string;
  /** Multi-selection set (YASS-style Ctrl+Click) */
  selectedNoteIds?: Set<string>;
  /** Beat snapping enabled (magnet) */
  snapEnabled?: boolean;
  onToggleSnap?: () => void;
  playbackRate?: number;
  onPlaybackRateChange?: (_rate: number) => void;
  onTimeChange: (_time: number) => void;
  onPlayPause: () => void;
  onNoteSelect: (_noteId: string | undefined) => void;
  /** Ctrl+Click on a note — toggle it in the multi-selection */
  onNoteCtrlToggle: (_noteId: string) => void;
  onNoteUpdate: (_noteId: string, _updates: Partial<Note>, _mode?: NoteHistoryMode) => void;
  /** Push the accumulated live changes as one history entry (drag release etc.) */
  onCommitHistory: () => void;
  onNoteAdd: (_startTime: number, _pitch: number) => void;
  onLyricChange: (_noteId: string, _newLyric: string, _mode?: NoteHistoryMode) => void;
}

// Left gutter width for the pitch labels (must match ml-8 / w-8 usage below)
const LEFT_GUTTER = 32;
// Max time gap between two tap notes before a new lyric line starts
export const TAP_LINE_GAP_MS = 1400;

// ── Zoom: presets from 25% up to 1000% ──
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 10;
const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10];

/** One renderable pitch lane (combined mode = a single lane over all notes). */
interface PitchLane {
  key: string;
  /** Badge label shown at the lane's left edge (split view: "P1"/"P2"). */
  badge?: string;
  badgeClass?: string;
  notes: Note[];
  /** Top offset of the lane INSIDE the notes area, in px. */
  topOffset: number;
  height: number;
  minPitch: number;
  maxPitch: number;
  pitchHeight: number;
}

export function Timeline({
  song,
  currentTime,
  isPlaying,
  selectedNoteId,
  selectedNoteIds,
  snapEnabled = false,
  onToggleSnap,
  playbackRate = 1.0,
  onPlaybackRateChange,
  onTimeChange,
  onPlayPause,
  onNoteSelect,
  onNoteCtrlToggle,
  onNoteUpdate,
  onCommitHistory,
  onNoteAdd,
  onLyricChange
}: TimelineProps) {
  const { t } = useTranslation();
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
    moved: boolean;
  } | null>(null);
  // Viewport size (measured via ResizeObserver → responsive pitch grid)
  const [viewport, setViewport] = useState({ width: 1200, height: 700 });
  // Duet split view — both vocal tracks on separate pitch ladders
  const [duetSplit, setDuetSplit] = useState(false);

  // ── Layout constants ──────────────────────────────────────────
  const basePixelsPerSecond = 100;
  const pixelsPerSecond = basePixelsPerSecond * zoom;
  const TOTAL_MIN_PITCH = 24; // C1
  const TOTAL_MAX_PITCH = 96; // C7 (6-octave total range)
  const lyricTrackHeight = 40;
  const waveformHeight = 60;
  const minimapHeight = 44;
  const totalDuration = song.duration;
  const totalWidth = totalDuration / 1000 * pixelsPerSecond;

  // Notes per player (split view). Unassigned notes count as P1.
  const allNotes = useMemo(() => {
    return song.lyrics.flatMap(line => line.notes);
  }, [song.lyrics]);
  const hasPlayerNotes = useMemo(
    () => allNotes.some(n => n.player === 'P1' || n.player === 'P2'),
    [allNotes],
  );
  const p1Notes = useMemo(() => allNotes.filter(n => n.player !== 'P2'), [allNotes]);
  const p2Notes = useMemo(() => allNotes.filter(n => n.player === 'P2'), [allNotes]);

  // Responsive pitch lane height: adapt to the available container height so
  // the timeline fits smaller screens (previously fixed 20px → 860px minimum
  // layout overflowed laptops).
  const notesAreaHeight = useMemo(() => {
    return Math.max(200, viewport.height - waveformHeight - lyricTrackHeight - minimapHeight);
  }, [viewport.height]);

  const combinedPitchHeight = useMemo(() => {
    return Math.max(12, Math.min(22, Math.floor(notesAreaHeight / VISIBLE_PITCH_RANGE)));
  }, [notesAreaHeight]);
  const splitPitchHeight = useMemo(() => {
    return Math.max(10, Math.min(22, Math.floor((notesAreaHeight / 2) / SPLIT_PITCH_RANGE)));
  }, [notesAreaHeight]);

  // ── Calculate center pitch from song's notes ──
  // The center pitch is the median of all note pitches, snapped to the nearest
  // C (octave boundary) so that C is always centered.
  const centerOfNotes = useCallback((notes: Note[]): number => {
    if (notes.length === 0) return 60; // Default: C4
    const pitches = notes.map(n => n.pitch).sort((a, b) => a - b);
    const median = pitches[Math.floor(pitches.length / 2)];
    return Math.floor(median / 12) * 12;
  }, []);

  const [pitchScrollCenter, setPitchScrollCenter] = useState(() => centerOfNotes(allNotes));
  // Split view: both lanes start auto-centered on their own player's notes and
  // share one offset so Shift+wheel keeps them aligned.
  const [splitCenterOffset, setSplitCenterOffset] = useState(0);

  const clampCenter = useCallback((center: number) => {
    const minAllowed = TOTAL_MIN_PITCH + VISIBLE_PITCH_RANGE / 2;
    const maxAllowed = TOTAL_MAX_PITCH - VISIBLE_PITCH_RANGE / 2;
    return Math.max(minAllowed, Math.min(maxAllowed, center));
  }, []);

  // Reset centers when song changes
  const songIdRef = useRef(song.id);
  useEffect(() => {
    if (song.id !== songIdRef.current) {
      songIdRef.current = song.id;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pitch center when song changes
      setPitchScrollCenter(centerOfNotes(allNotes));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset split offset too
      setSplitCenterOffset(0);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- new song, combined view
      setDuetSplit(false);
    }
  }, [song.id, allNotes, centerOfNotes]);

  // ── Lane definitions (combined = 1 lane over everything; split = 2 lanes) ──
  const p1BaseCenter = useMemo(() => centerOfNotes(p1Notes), [p1Notes, centerOfNotes]);
  const p2BaseCenter = useMemo(() => centerOfNotes(p2Notes), [p2Notes, centerOfNotes]);

  const lanes: PitchLane[] = useMemo(() => {
    if (!duetSplit || !hasPlayerNotes) {
      const timelineHeight = VISIBLE_PITCH_RANGE * combinedPitchHeight;
      return [{
        key: 'combined',
        notes: allNotes,
        topOffset: 0,
        height: timelineHeight,
        minPitch: pitchScrollCenter - VISIBLE_PITCH_RANGE / 2,
        maxPitch: pitchScrollCenter + VISIBLE_PITCH_RANGE / 2,
        pitchHeight: combinedPitchHeight,
      }];
    }
    const laneHeight = SPLIT_PITCH_RANGE * splitPitchHeight;
    const clampSplitCenter = (center: number) => {
      const minAllowed = TOTAL_MIN_PITCH + SPLIT_PITCH_RANGE / 2;
      const maxAllowed = TOTAL_MAX_PITCH - SPLIT_PITCH_RANGE / 2;
      return Math.max(minAllowed, Math.min(maxAllowed, center));
    };
    const p1Center = clampSplitCenter(p1BaseCenter + splitCenterOffset);
    const p2Center = clampSplitCenter(p2BaseCenter + splitCenterOffset);
    return [
      {
        key: 'p1',
        badge: song.duetPlayerNames?.[0] || 'P1',
        badgeClass: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/30',
        notes: p1Notes,
        topOffset: 0,
        height: laneHeight,
        minPitch: p1Center - SPLIT_PITCH_RANGE / 2,
        maxPitch: p1Center + SPLIT_PITCH_RANGE / 2,
        pitchHeight: splitPitchHeight,
      },
      {
        key: 'p2',
        badge: song.duetPlayerNames?.[1] || 'P2',
        badgeClass: 'text-purple-300 bg-purple-500/15 border-purple-400/30',
        notes: p2Notes,
        topOffset: laneHeight + 4,
        height: laneHeight,
        minPitch: p2Center - SPLIT_PITCH_RANGE / 2,
        maxPitch: p2Center + SPLIT_PITCH_RANGE / 2,
        pitchHeight: splitPitchHeight,
      },
    ];
  }, [
    duetSplit, hasPlayerNotes, allNotes, combinedPitchHeight, pitchScrollCenter,
    splitPitchHeight, p1BaseCenter, p2BaseCenter, splitCenterOffset, p1Notes, p2Notes,
    song.duetPlayerNames,
  ]);

  const lanesTotalHeight = lanes.reduce((sum, l) => Math.max(sum, l.topOffset + l.height), 0);

  // ── Beat snapping (YASS-style magnet) ──
  // Shared formula with the export/parser: beat n occurs at GAP + n * 15000/BPM
  const snapTime = useCallback((t: number) => snapTimeToBeat(t, song.bpm, song.gap, snapEnabled), [snapEnabled, song.bpm, song.gap]);

  // Calculate playhead position
  const playheadPosition = (currentTime / 1000) * pixelsPerSecond - scrollOffset;

  // Clamp scroll offset when zooming out reduces totalWidth
  // eslint-disable-next-line react-hooks/set-state-in-effect -- clamp scroll when zoom shrinks the timeline
  useEffect(() => {
    const maxScroll = Math.max(0, totalWidth - viewport.width + LEFT_GUTTER);
    setScrollOffset(prev => Math.min(prev, maxScroll));
  }, [totalWidth, viewport.width]);

  // ── Zoom anchored at the playhead (or viewport center) ──
  // Keeps the time under the anchor stable instead of jumping to the left edge.
  const zoomAt = useCallback((nextZoom: number, anchorScreenX?: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    setZoom(prevZoom => {
      if (clamped === prevZoom) return prevZoom;
      const pps = basePixelsPerSecond;
      const anchorX = anchorScreenX != null && anchorScreenX >= 0
        ? anchorScreenX - LEFT_GUTTER
        : (playheadPosition >= 0 && playheadPosition <= viewport.width
          ? playheadPosition
          : viewport.width / 2 - LEFT_GUTTER);
      // Time under the anchor before the zoom change
      const anchorTime = (scrollOffset + Math.max(0, anchorX)) / (pps * prevZoom);
      // Scroll offset that keeps the anchor time at the same screen position
      const newOffset = Math.max(0, anchorTime * (pps * clamped) - Math.max(0, anchorX));
      setScrollOffset(newOffset);
      return clamped;
    });
  }, [playheadPosition, scrollOffset, viewport.width]);

  // Handle scroll
  const handleScroll = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom with ctrl+scroll — anchored at the cursor position,
      // exponential so the whole 25%…1000% range stays reachable.
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = containerRef.current?.getBoundingClientRect();
      const anchor = rect ? e.clientX - rect.left : undefined;
      zoomAt(zoom * factor, anchor);
    } else if (e.shiftKey) {
      // Vertical pitch scroll with Shift+wheel — moves every lane's center
      const scrollStep = 2; // semitones per scroll tick
      const delta = -Math.sign(e.deltaY) * scrollStep;
      if (duetSplit) {
        setSplitCenterOffset(prev => prev + delta);
      } else {
        setPitchScrollCenter(prev => {
          const newCenter = prev + delta;
          const minAllowed = TOTAL_MIN_PITCH + VISIBLE_PITCH_RANGE / 2;
          const maxAllowed = TOTAL_MAX_PITCH - VISIBLE_PITCH_RANGE / 2;
          return Math.max(minAllowed, Math.min(maxAllowed, newCenter));
        });
      }
    } else {
      // Horizontal scroll
      setScrollOffset(prev => {
        const maxScroll = totalWidth - (containerRef.current?.clientWidth || 0) + LEFT_GUTTER;
        return Math.max(0, Math.min(maxScroll, prev + e.deltaY));
      });
    }
  }, [totalWidth, zoom, zoomAt, duetSplit]);

  // Handle playhead drag
  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  }, []);

  // Empty-space click: deselect (note-adding is handled per lane below)
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (dragState) return;
    if (e.button !== 0) return;
    onNoteSelect(undefined);
  }, [dragState, onNoteSelect]);

  // Per-lane click: Shift+Click adds a note at the clicked pitch/position
  const makeLaneClick = useCallback((lane: PitchLane) => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (!e.shiftKey) return; // no note to add → let the container deselect

    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left - LEFT_GUTTER + scrollOffset;
    const clickY = e.clientY - rect.top - waveformHeight - lane.topOffset;

    const clickedTime = (clickX / pixelsPerSecond) * 1000;
    const clickedPitch = Math.round(lane.maxPitch - (clickY / lane.pitchHeight));

    if (clickedPitch >= lane.minPitch && clickedPitch <= lane.maxPitch) {
      onNoteAdd(snapTime(clickedTime), clickedPitch);
    }
  }, [scrollOffset, pixelsPerSecond, snapTime, onNoteAdd]);

  // Handle mouse move for playhead drag + note drag (live updates, no history flood)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left - LEFT_GUTTER + scrollOffset;
        const newTime = (x / pixelsPerSecond) * 1000;
        onTimeChange(Math.max(0, Math.min(totalDuration, newTime)));
      }

      if (dragState) {
        const deltaX = e.clientX - dragState.startX;
        if (Math.abs(deltaX) > 1) dragState.moved = true;
        const deltaTime = (deltaX / pixelsPerSecond) * 1000;

        if (dragState.type === 'move') {
          onNoteUpdate(dragState.noteId, {
            startTime: snapTime(Math.max(0, dragState.originalNote.startTime + deltaTime))
          }, 'live');
        } else if (dragState.type === 'resize-left') {
          const newStart = snapTime(Math.max(0, dragState.originalNote.startTime + deltaTime));
          const newDuration = dragState.originalNote.duration - (newStart - dragState.originalNote.startTime);
          if (newDuration > 100) {
            onNoteUpdate(dragState.noteId, {
              startTime: newStart,
              duration: newDuration
            }, 'live');
          }
        } else if (dragState.type === 'resize-right') {
          // Snap the note END to the beat grid when magnet is on
          const originalEnd = dragState.originalNote.startTime + dragState.originalNote.duration;
          const newEnd = snapTime(originalEnd + deltaTime);
          const newDuration = Math.max(100, newEnd - dragState.originalNote.startTime);
          onNoteUpdate(dragState.noteId, { duration: newDuration }, 'live');
        }
      }
    };

    const handleMouseUp = () => {
      if (isDraggingPlayhead) setIsDraggingPlayhead(false);
      if (dragState) {
        // One history entry per drag gesture (not per mousemove frame)
        if (dragState.moved) onCommitHistory();
        setDragState(null);
      }
    };

    if (isDraggingPlayhead || dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingPlayhead, dragState, scrollOffset, pixelsPerSecond, totalDuration, onTimeChange, onNoteUpdate, onCommitHistory, snapTime]);

  // Handle note drag start
  const handleNoteDragStart = useCallback((noteId: string, startX: number, type: 'move' | 'resize-left' | 'resize-right') => {
    const note = allNotes.find(n => n.id === noteId);
    if (note) {
      setDragState({ noteId, startX, type, originalNote: { ...note }, moved: false });
    }
  }, [allNotes]);

  // Handle note click — Ctrl/Cmd+Click toggles the multi-selection (YASS-style)
  const handleNoteClick = useCallback((noteId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey) {
      onNoteCtrlToggle(noteId);
    } else {
      onNoteSelect(noteId);
    }
  }, [onNoteSelect, onNoteCtrlToggle]);

  // ── Zoom controls (presets 25%…1000%) ──
  const handleZoomIn = useCallback(() => {
    const next = ZOOM_PRESETS.find(z => z > zoom + 0.001) ?? MAX_ZOOM;
    zoomAt(next);
  }, [zoom, zoomAt]);

  const handleZoomOut = useCallback(() => {
    const prev = [...ZOOM_PRESETS].reverse().find(z => z < zoom - 0.001) ?? MIN_ZOOM;
    zoomAt(prev);
  }, [zoom, zoomAt]);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setScrollOffset(0);
  }, []);

  // Keep refs for values the scroll loop needs without re-triggering the effect
  const currentTimeRef = useRef(currentTime);
  const scrollOffsetRef = useRef(scrollOffset);
  const ppsRef = useRef(pixelsPerSecond);
  useEffect(() => {
    currentTimeRef.current = currentTime;
    scrollOffsetRef.current = scrollOffset;
    ppsRef.current = pixelsPerSecond;
  }, [currentTime, scrollOffset, pixelsPerSecond]);

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
            hideThumb
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

          {/* Duet split view — both vocal tracks on separate pitch ladders */}
          {hasPlayerNotes && (
            <Button
              size="sm"
              variant={duetSplit ? 'default' : 'ghost'}
              onClick={() => setDuetSplit(prev => !prev)}
              title={t('editor.timeline.duetSplit')}
              aria-pressed={duetSplit}
              data-testid="editor-duet-split-toggle"
              className={duetSplit
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'text-slate-400 hover:text-white'}
            >
              <Columns2 className="w-4 h-4" />
            </Button>
          )}

          {/* Beat snap toggle (magnet) */}
          {onToggleSnap && (
            <Button
              size="sm"
              variant={snapEnabled ? 'default' : 'ghost'}
              onClick={onToggleSnap}
              title={t('editor.timeline.snap')}
              className={snapEnabled
                ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                : 'text-slate-400 hover:text-white'}
              data-testid="editor-snap-toggle"
            >
              <Magnet className="w-4 h-4" />
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
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
            disabled={zoom >= MAX_ZOOM}
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
      >
        {/* Waveform (viewport-sized canvas — only the visible window is rendered) */}
        {song.audioUrl && (
          <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: waveformHeight }}>
            <div className="ml-8" style={{ height: waveformHeight }}>
              <Waveform
                audioUrl={song.audioUrl}
                width={Math.max(1, viewport.width - LEFT_GUTTER)}
                height={waveformHeight}
                pixelsPerSecond={pixelsPerSecond}
                scrollOffset={scrollOffset}
                notes={allNotes}
                selectedNoteId={selectedNoteId}
                onSeek={onTimeChange}
                onNoteAdd={onNoteAdd}
              />
            </div>
          </div>
        )}

        {/* Notes area — one lane (combined) or two lanes (duet split) */}
        <div
          className="absolute left-0 right-0"
          style={{
            top: waveformHeight,
            height: lanesTotalHeight,
          }}
        >
          {lanes.map(lane => (
            <div
              key={lane.key}
              className="absolute left-0 right-0"
              style={{ top: lane.topOffset, height: lane.height }}
              onClick={makeLaneClick(lane)}
            >
              {/* Background grid — beat lines match the UltraStar export formula
                  (beatDuration = 15000/BPM, beats offset by GAP) */}
              <TimelineGrid
                viewportWidth={viewport.width - LEFT_GUTTER}
                pixelsPerSecond={pixelsPerSecond}
                scrollOffset={scrollOffset}
                bpm={song.bpm}
                gap={song.gap}
                minPitch={lane.minPitch}
                maxPitch={lane.maxPitch}
                pitchHeight={lane.pitchHeight}
              />

              {/* Pitch labels */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-slate-900/80 border-r border-slate-700 z-20">
                {Array.from({ length: Math.floor(lane.maxPitch - lane.minPitch) + 1 }, (_, i) => {
                  const pitch = Math.round(lane.maxPitch) - i;
                  if (pitch % 12 === 0) { // Show C notes
                    return (
                      <div
                        key={pitch}
                        className="absolute right-0 text-[10px] text-cyan-400 pr-1 font-mono"
                        style={{ top: i * lane.pitchHeight - 6 }}
                      >
                        C{Math.floor(pitch / 12) - 1}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              {/* Lane badge (duet split) */}
              {lane.badge && (
                <div className={cn(
                  'absolute left-10 top-1 z-20 px-2 py-0.5 rounded-md border text-[10px] font-semibold tracking-wide backdrop-blur-sm pointer-events-none',
                  lane.badgeClass,
                )}>
                  {lane.badge}
                </div>
              )}

              {/* Lane divider (between split lanes) */}
              {lane.key === 'p1' && (
                <div className="absolute left-0 right-0 bottom-0 h-px bg-slate-600 z-10 pointer-events-none" />
              )}

              {/* Notes */}
              <div className="absolute inset-0 ml-8">
                {lane.notes.map(note => (
                  <NoteBlock
                    key={note.id}
                    note={note}
                    isSelected={selectedNoteId === note.id}
                    isMultiSelected={selectedNoteIds?.has(note.id) && selectedNoteId !== note.id}
                    isPlayingNote={
                      isPlaying &&
                      currentTime >= note.startTime &&
                      currentTime < note.startTime + note.duration
                    }
                    zoom={zoom}
                    pixelsPerSecond={pixelsPerSecond}
                    scrollOffset={scrollOffset}
                    maxPitch={lane.maxPitch}
                    pitchHeight={lane.pitchHeight}
                    onClick={handleNoteClick}
                    onDragStart={handleNoteDragStart}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Lyric track */}
        <div
          className="absolute left-0 right-0 ml-8"
          style={{
            top: waveformHeight + lanesTotalHeight,
            height: lyricTrackHeight
          }}
        >
          <LyricTrack
            notes={allNotes}
            pixelsPerSecond={pixelsPerSecond}
            scrollOffset={scrollOffset}
            height={lyricTrackHeight}
            onLyricChange={onLyricChange}
            selectedNoteId={selectedNoteId}
          />
        </div>

        {/* Playhead — spans waveform + lanes + lyric track (minimap has its own) */}
        <div
          className={cn(
            'absolute w-0.5 bg-purple-500 z-30 cursor-ew-resize',
            isDraggingPlayhead && 'bg-purple-400'
          )}
          style={{
            left: `${playheadPosition + LEFT_GUTTER}px`,
            top: 0,
            bottom: minimapHeight,
          }}
          onMouseDown={handlePlayheadMouseDown}
        >
          {/* Playhead handle */}
          <div className="absolute -top-1 -left-2 w-4 h-4 bg-purple-500 rounded-full border-2 border-purple-400" />

          {/* Time indicator */}
          <div className="absolute -top-8 -left-8 px-1 py-0.5 bg-slate-800 border border-purple-500 rounded text-xs text-purple-300 font-mono whitespace-nowrap">
            {formatTime(currentTime)}
          </div>
        </div>

        {/* ── Footer pitch-graph minimap (YASS-style maneuver strip) ──
            Full-song pitch overview: click/drag seeks AND centers the viewport —
            fast maneuvering across the entire song. */}
        <PitchMinimap
          notes={allNotes}
          totalDuration={totalDuration}
          width={Math.max(1, viewport.width - LEFT_GUTTER)}
          height={minimapHeight}
          pixelsPerSecond={pixelsPerSecond}
          scrollOffset={scrollOffset}
          viewportWidth={Math.max(1, viewport.width - LEFT_GUTTER)}
          currentTime={currentTime}
          onScrub={(timeMs, centerViewport) => {
            onTimeChange(Math.max(0, Math.min(totalDuration, timeMs)));
            if (centerViewport) {
              const x = (timeMs / 1000) * pixelsPerSecond;
              const maxScroll = Math.max(0, totalWidth - (containerRef.current?.clientWidth || 0) + LEFT_GUTTER);
              setScrollOffset(Math.max(0, Math.min(maxScroll, x - (viewport.width - LEFT_GUTTER) / 2)));
            }
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pitch minimap — footer pitch graph for fast maneuvering
// ─────────────────────────────────────────────────────────────────────────────

interface PitchMinimapProps {
  notes: Note[];
  totalDuration: number;
  width: number;
  height: number;
  pixelsPerSecond: number;
  scrollOffset: number;
  viewportWidth: number;
  currentTime: number;
  /** Seek + (optionally) center the timeline viewport on the position. */
  onScrub: (_timeMs: number, _centerViewport: boolean) => void;
}

function PitchMinimap({
  notes,
  totalDuration,
  width,
  height,
  pixelsPerSecond,
  scrollOffset,
  viewportWidth,
  currentTime,
  onScrub,
}: PitchMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);

  // Pitch range of the song's notes (padded)
  const pitchRange = useMemo(() => {
    if (notes.length === 0) return { min: 48, max: 72 };
    let min = Infinity;
    let max = -Infinity;
    for (const n of notes) {
      if (n.pitch < min) min = n.pitch;
      if (n.pitch > max) max = n.pitch;
    }
    return { min: Math.max(0, min - 2), max: Math.min(127, max + 2) };
  }, [notes]);

  // ── Drawing ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const durationSec = totalDuration / 1000;
    const usable = durationSec > 0 ? width : 0;
    const timeToX = (ms: number) => (durationSec > 0 ? (ms / totalDuration) * usable : 0);
    const pitchToY = (pitch: number) => {
      const range = Math.max(1, pitchRange.max - pitchRange.min);
      return height - 4 - ((pitch - pitchRange.min) / range) * (height - 8);
    };

    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, width, height);

    // Minute grid lines
    if (durationSec > 0) {
      const minutePx = (60 / durationSec) * usable;
      if (minutePx > 8) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
        ctx.lineWidth = 1;
        for (let sec = 60; sec < durationSec; sec += 60) {
          const x = timeToX(sec * 1000);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }
    }

    // Notes (pitch graph)
    for (const note of notes) {
      const x = timeToX(note.startTime);
      const w = Math.max(1.5, timeToX(note.startTime + note.duration) - x);
      const y = pitchToY(note.pitch);
      const h = 2.5;
      if (note.player === 'P2') ctx.fillStyle = 'rgba(168, 85, 247, 0.85)';
      else if (note.player === 'P1') ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
      else if (note.isGolden) ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
      else if (note.isBonus) ctx.fillStyle = 'rgba(236, 72, 153, 0.85)';
      else ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.fillRect(x, y - h / 2, w, h);
    }

    // Viewport rectangle (current timeline window)
    const viewX = (scrollOffset / Math.max(1, pixelsPerSecond * (totalDuration / 1000))) * usable;
    const viewW = (viewportWidth / Math.max(1, pixelsPerSecond * (totalDuration / 1000))) * usable;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.fillRect(viewX, 0, viewW, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(viewX + 0.5, 0.5, Math.max(2, viewW - 1), height - 1);

    // Playhead
    const px = timeToX(currentTime);
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.95)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
    ctx.stroke();
  }, [notes, width, height, totalDuration, scrollOffset, pixelsPerSecond, viewportWidth, currentTime, pitchRange]);

  // ── Pointer interaction: click/drag = seek + center the viewport ──
  const timeFromEvent = useCallback((clientX: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    return frac * totalDuration;
  }, [totalDuration]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    draggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    onScrub(timeFromEvent(e.clientX), true);
  }, [onScrub, timeFromEvent]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    e.stopPropagation();
    onScrub(timeFromEvent(e.clientX), true);
  }, [onScrub, timeFromEvent]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 ml-8 border-t border-slate-700 bg-slate-900 z-20"
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer touch-none"
        style={{ width: '100%', height }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}

// Timeline grid component
function TimelineGrid({
  viewportWidth,
  pixelsPerSecond,
  scrollOffset,
  bpm,
  gap,
  minPitch,
  maxPitch,
  pitchHeight
}: {
  viewportWidth: number;
  pixelsPerSecond: number;
  scrollOffset: number;
  bpm: number;
  gap: number;
  minPitch: number;
  maxPitch: number;
  pitchHeight: number;
}) {
  // UltraStar beat formula — MUST match generateUltraStarTxt / the parser:
  // beatDuration = 15000 / BPM (ms per beat), beat n occurs at GAP + n * beatDuration.
  // (The old grid used 60000/BPM without GAP — beats were 4× too wide and offset.)
  const beatDuration = 15000 / (bpm > 0 ? bpm : 120);
  const pixelsPerBeat = (beatDuration / 1000) * pixelsPerSecond;

  // Generate beat lines for the visible range only
  const beatLines: React.JSX.Element[] = [];
  if (pixelsPerBeat > 4 && isFinite(pixelsPerBeat)) {
    const firstBeat = Math.floor((scrollOffset - (gap / 1000) * pixelsPerSecond) / pixelsPerBeat);
    const lastBeat = Math.ceil((scrollOffset + viewportWidth - (gap / 1000) * pixelsPerSecond) / pixelsPerBeat);

    for (let beat = firstBeat; beat <= lastBeat; beat++) {
      const x = beat * pixelsPerBeat + (gap / 1000) * pixelsPerSecond - scrollOffset;
      if (x < -1 || x > viewportWidth + 1) continue;
      const isDownbeat = ((beat % 4) + 4) % 4 === 0;

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
  }

  // Generate pitch lines
  const pitchLines: React.JSX.Element[] = [];
  for (let pitch = Math.ceil(minPitch); pitch <= Math.floor(maxPitch); pitch++) {
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
