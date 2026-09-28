'use client';

/**
 * Editor timeline — orchestrator.
 *
 * R2 refactor: the former 1743-line monolith was split into focused modules
 * inside src/components/editor/timeline/ (constants, types, drag-interaction
 * hook, toolbar, pitch lane, grid, comparison overlay, note-details band,
 * pitch minimap). This file keeps the Timeline component itself: layout
 * computation (lanes, zoom, pitch centers), click/jump/zoom handlers,
 * playhead-follow auto-scroll and the composition of the sub-components.
 *
 * The public surface is unchanged:
 * - `export default Timeline` (same path, same props → see TimelineProps)
 * - named exports TAP_LINE_GAP_MS + NoteHistoryMode stay importable from
 *   this module (re-exported from their new homes).
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Note } from '@/types/game';
import { LyricTrack } from './lyric-track';
import { PitchLaneView } from './pitch-lane';
import { TimelineToolbar } from './timeline-toolbar';
import { NoteDetailsBand } from './note-details-band';
import { PitchMinimap } from './pitch-minimap';
import { ComparisonLegend } from './comparison-overlay';
import { useTimelineDrag } from './use-timeline-interaction';
import { useTimelineAutoScroll } from './use-timeline-auto-scroll';
import { formatTime } from './timeline-utils';
import { snapTimeToBeat } from '@/lib/editor/beat-utils';
import type { PitchLane, TimelineProps } from './timeline-types';
import {
  VISIBLE_PITCH_RANGE,
  SPLIT_PITCH_RANGE,
  SPLIT_PITCH_RANGE_MULTI,
  LEFT_GUTTER,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_PRESETS,
  TOTAL_MIN_PITCH,
  TOTAL_MAX_PITCH,
  basePixelsPerSecond,
  lyricTrackHeight,
  minimapHeight,
  noteInfoHeight,
} from './timeline-constants';

// Historical import surface of this module — keep stable (karaoke-editor.tsx,
// editor-note-tab.tsx import these from './timeline/timeline').
export { TAP_LINE_GAP_MS } from './timeline-constants';
export type { NoteHistoryMode } from './timeline-types';

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
  onLyricChange,
  noteJumpCommand,
  comparisonNotes = null,
  onClearComparison,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);
  // Viewport size (measured via ResizeObserver → responsive pitch grid)
  const [viewport, setViewport] = useState({ width: 1200, height: 700 });
  // Duet split view — both vocal tracks on separate pitch ladders
  const [duetSplit, setDuetSplit] = useState(false);

  // ── Viewport measurement (restored after db498381) ──
  // The scroll content container is observed with a ResizeObserver so the
  // pitch grid, waveform, minimap and note-details band adapt to the actually
  // available space (default 1200×700 only until the first measurement).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setViewport(prev =>
        Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
          ? prev
          : { width, height },
      );
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Layout constants ──────────────────────────────────────────
  // (timeline-constants.ts — basePixelsPerSecond, pitch range, track heights)
  const pixelsPerSecond = basePixelsPerSecond * zoom;
  const totalDuration = song.duration;
  const totalWidth = totalDuration / 1000 * pixelsPerSecond;

  // Notes per voice (split view). Unassigned notes count as the first voice.
  const allNotes = useMemo(() => {
    return song.lyrics.flatMap(line => line.notes);
  }, [song.lyrics]);
  const hasPlayerNotes = useMemo(
    () => allNotes.some(n => n.player === 'P1' || n.player === 'P2' || n.player === 'P4' || n.player === 'P8'),
    [allNotes],
  );
  // Voices present in the song, in singing order (P1, P2, P4=3rd, P8=4th)
  const presentVoices = useMemo(() => {
    const voices: Array<'P1' | 'P2' | 'P4' | 'P8'> = [];
    for (const tag of ['P1', 'P2', 'P4', 'P8'] as const) {
      if (allNotes.some(n => n.player === tag)) voices.push(tag);
    }
    return voices;
  }, [allNotes]);
  // Voice-tagged notes (P1/P2/P4/P8) — used by the split-view lanes below.
  // Unassigned/'both' notes belong to the P1 lane.

  // Responsive pitch lane height: adapt to the available container height so
  // the timeline fits smaller screens (previously fixed 20px → 860px minimum
  // layout overflowed laptops).
  const notesAreaHeight = useMemo(() => {
    return Math.max(200, viewport.height - lyricTrackHeight - noteInfoHeight - minimapHeight);
  }, [viewport.height]);

  const combinedPitchHeight = useMemo(() => {
    // R9: caps raised (12–22 → 14–34) so larger screens get proportionally
    // thicker note bars instead of everything being clamped at 22px.
    return Math.max(14, Math.min(34, Math.floor(notesAreaHeight / VISIBLE_PITCH_RANGE)));
  }, [notesAreaHeight]);
  const splitPitchHeight = useMemo(() => {
    const laneCount = Math.max(2, presentVoices.length || 2);
    // 2 voices get 16-semitave lanes (thicker bars, R9); 3-4 voices get 10
    // semitones each so all lanes fit into the available area.
    const rangePerLane = laneCount <= 2 ? SPLIT_PITCH_RANGE : SPLIT_PITCH_RANGE_MULTI;
    return Math.max(10, Math.min(30, Math.floor((notesAreaHeight / laneCount) / rangePerLane)));
  }, [notesAreaHeight, presentVoices.length]);

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

    // ── Split view: one lane per voice (duet = 2, trio = 3, quartet = 4) ──
    // P1 is ALWAYS the first lane — unassigned/'both' notes live there. When
    // only stray P2/P4/P8 notes exist (no explicit P1), the P1 lane still
    // shows so unassigned notes don't get swallowed by another voice's lane.
    const laneVoices: Array<'P1' | 'P2' | 'P4' | 'P8'> = presentVoices.includes('P1')
      ? presentVoices
      : ['P1', ...presentVoices];
    const laneCount = Math.max(2, laneVoices.length);
    const rangePerLane = laneCount <= 2 ? SPLIT_PITCH_RANGE : SPLIT_PITCH_RANGE_MULTI;
    const laneHeight = rangePerLane * splitPitchHeight;
    const clampSplitCenter = (center: number) => {
      const minAllowed = TOTAL_MIN_PITCH + rangePerLane / 2;
      const maxAllowed = TOTAL_MAX_PITCH - rangePerLane / 2;
      return Math.max(minAllowed, Math.min(maxAllowed, center));
    };

    // R8: voice colors match the sub-header dropdown (P3 = emerald, P4 = orange)
    const badgeStyles: Record<string, string> = {
      P1: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/30',
      P2: 'text-purple-300 bg-purple-500/15 border-purple-400/30',
      P4: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30',
      P8: 'text-orange-300 bg-orange-500/15 border-orange-400/30',
    };
    const voiceNameIndex: Record<string, number> = { P1: 0, P2: 1, P4: 2, P8: 3 };

    return laneVoices.map((tag, i) => {
      const laneNotes = tag === 'P1'
        ? allNotes.filter(n => n.player === 'P1' || (!n.player || n.player === 'both'))
        : allNotes.filter(n => n.player === tag);
      const center = clampSplitCenter(centerOfNotes(laneNotes) + splitCenterOffset);
      return {
        key: tag,
        badge: song.duetPlayerNames?.[voiceNameIndex[tag]] || tag,
        badgeClass: badgeStyles[tag],
        notes: laneNotes,
        topOffset: i * (laneHeight + 4),
        height: laneHeight,
        minPitch: center - rangePerLane / 2,
        maxPitch: center + rangePerLane / 2,
        pitchHeight: splitPitchHeight,
      };
    });
  }, [
    duetSplit, hasPlayerNotes, allNotes, combinedPitchHeight, pitchScrollCenter,
    splitPitchHeight, splitCenterOffset, song.duetPlayerNames, presentVoices, centerOfNotes,
  ]);

  const lanesTotalHeight = lanes.reduce((sum, l) => Math.max(sum, l.topOffset + l.height), 0);

  // ── Selected-note details (rendered in the band below the lyric track) ──
  const selectedDetailNote = useMemo(
    () => (selectedNoteId ? allNotes.find(n => n.id === selectedNoteId) : undefined),
    [allNotes, selectedNoteId],
  );
  const selectedLineIndex = useMemo(
    () => (selectedNoteId ? song.lyrics.findIndex(line => line.notes.some(n => n.id === selectedNoteId)) : -1),
    [song.lyrics, selectedNoteId],
  );
  const multiSelectCount = selectedNoteIds?.size ?? 0;
  // Beat position — inverse of the UltraStar formula (beat n at GAP + n·15000/BPM)
  const detailBeatDuration = 15000 / (song.bpm > 0 ? song.bpm : 120);
  const detailBeat = selectedDetailNote
    ? (selectedDetailNote.startTime - song.gap) / detailBeatDuration
    : 0;

  // ── Beat snapping (YASS-style magnet) ──
  // Shared formula with the export/parser: beat n occurs at GAP + n * 15000/BPM
  const snapTime = useCallback((t: number) => snapTimeToBeat(t, song.bpm, song.gap, snapEnabled), [snapEnabled, song.bpm, song.gap]);

  // ── Drag interaction (R2: extracted to use-timeline-interaction.ts) ──
  // Playhead scrub + R14 axis-locked note drag (hysteresis, sticky home band).
  const {
    isDraggingPlayhead,
    dragState,
    handlePlayheadMouseDown,
    handleNoteDragStart,
  } = useTimelineDrag({
    containerRef,
    allNotes,
    lanes,
    pixelsPerSecond,
    scrollOffset,
    totalDuration,
    snapTime,
    onTimeChange,
    onNoteUpdate,
    onCommitHistory,
  });

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
    const clickY = e.clientY - rect.top - lane.topOffset;

    const clickedTime = (clickX / pixelsPerSecond) * 1000;
    const clickedPitch = Math.round(lane.maxPitch - (clickY / lane.pitchHeight));

    if (clickedPitch >= lane.minPitch && clickedPitch <= lane.maxPitch) {
      onNoteAdd(snapTime(clickedTime), clickedPitch);
    }
  }, [scrollOffset, pixelsPerSecond, snapTime, onNoteAdd]);

  // Handle note click — Ctrl/Cmd+Click toggles the multi-selection (YASS-style).
  // R9 (user request 1.2): clicking an ALREADY-selected note whose rectangle
  // is fully covered by other notes (duet: both players sing the same pitch at
  // the same time) cycles to the next stacked note underneath, so P1's and
  // P2's simultaneous notes can be selected and edited INDEPENDENTLY in the
  // combined view without switching to the split view.
  const handleNoteClick = useCallback((noteId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey) {
      onNoteCtrlToggle(noteId);
      return;
    }
    if (noteId === selectedNoteId) {
      const lane = lanes.find(l => l.notes.some(n => n.id === noteId));
      const clicked = lane?.notes.find(n => n.id === noteId);
      if (lane && clicked) {
        // Stacked = same lane, same pitch row, overlapping time ranges
        const stacked = lane.notes.filter(n =>
          n.id !== noteId &&
          n.pitch === clicked.pitch &&
          n.startTime < clicked.startTime + clicked.duration &&
          n.startTime + n.duration > clicked.startTime,
        );
        if (stacked.length > 0) {
          // Cycle in RENDER order: the next stacked note after the clicked
          // one's DOM position (wraps around). The newly selected note gets
          // the z-10 ring and paints on top, so each subsequent click on the
          // same spot advances through the stack one note at a time.
          const order = lane.notes;
          const currentIdx = order.findIndex(n => n.id === noteId);
          const stackedIds = new Set(stacked.map(n => n.id));
          let nextId: string | null = null;
          for (let i = 1; i <= order.length; i++) {
            const cand = order[(currentIdx + i + order.length) % order.length];
            if (stackedIds.has(cand.id)) { nextId = cand.id; break; }
          }
          if (nextId) {
            onNoteSelect(nextId);
            return;
          }
        }
      }
    }
    onNoteSelect(noteId);
  }, [onNoteSelect, onNoteCtrlToggle, selectedNoteId, lanes]);

  // ── Jump-to-note (shared by lyric-track double-click + lyrics panel) ──
  // Brings a note into view: horizontally centered in the viewport, vertically
  // centered on its pitch (combined view: move the pitch center; split view:
  // shift the shared lane offset so all lanes stay aligned).
  const jumpToNoteInView = useCallback((note: Note) => {
    // Horizontal: center the note in the visible area
    const noteCenterX = ((note.startTime + note.duration / 2) / 1000) * pixelsPerSecond;
    const visibleWidth = viewport.width - LEFT_GUTTER;
    const maxScroll = Math.max(0, totalWidth - viewport.width + LEFT_GUTTER);
    const targetScroll = Math.max(0, Math.min(maxScroll, noteCenterX - visibleWidth / 2));
    setScrollOffset(targetScroll);

    // Vertical: center the note's pitch in its lane
    const lane = lanes.find(l => l.notes.some(n => n.id === note.id));
    if (duetSplit && hasPlayerNotes && lane) {
      // Split view — shift the shared offset by the delta between the note's
      // pitch and its lane's current center (keeps all lanes aligned).
      const laneCenter = (lane.minPitch + lane.maxPitch) / 2;
      setSplitCenterOffset(prev => prev + (note.pitch - laneCenter));
    } else {
      setPitchScrollCenter(clampCenter(note.pitch));
    }
  }, [pixelsPerSecond, viewport.width, totalWidth, lanes, duetSplit, hasPlayerNotes, clampCenter]);

  // Lyric track: double-click on a lyric → select + jump to the note.
  // The note-details band below remains the primary editing surface.
  const handleLyricJump = useCallback((note: Note) => {
    onNoteSelect(note.id);
    jumpToNoteInView(note);
  }, [onNoteSelect, jumpToNoteInView]);

  // Lyrics panel (left sidebar): double-click fires a jump command through
  // the parent — {noteId, nonce} so repeated jumps to the same note retrigger.
  const lastJumpNonceRef = useRef(0);
  useEffect(() => {
    if (!noteJumpCommand || noteJumpCommand.nonce === lastJumpNonceRef.current) return;
    lastJumpNonceRef.current = noteJumpCommand.nonce;
    const note = allNotes.find(n => n.id === noteJumpCommand.noteId);
    if (note) jumpToNoteInView(note);
  }, [noteJumpCommand, allNotes, jumpToNoteInView]);

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

  // ── Auto-scroll while playing (R2: extracted to use-timeline-auto-scroll.ts) ──
  useTimelineAutoScroll({
    containerRef,
    isPlaying,
    currentTime,
    scrollOffset,
    pixelsPerSecond,
    setScrollOffset,
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-lg overflow-hidden">
      {/* Timeline Controls (transport bar — timeline-toolbar.tsx) */}
      <TimelineToolbar
        currentTime={currentTime}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        playbackRate={playbackRate}
        onPlaybackRateChange={onPlaybackRateChange}
        onTimeChange={onTimeChange}
        onPlayPause={onPlayPause}
        hasPlayerNotes={hasPlayerNotes}
        duetSplit={duetSplit}
        onToggleDuetSplit={() => setDuetSplit(prev => !prev)}
        snapEnabled={snapEnabled}
        onToggleSnap={onToggleSnap}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
      />

      {/* Timeline Content */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-crosshair"
        onWheel={handleScroll}
        onClick={handleTimelineClick}
      >
        {/* Notes area (R8: the pitch-graph/waveform strip that used to sit here
            was removed — the pitch ladder starts directly at the top now, right
            below the transport bar / sub-header) — one lane (combined) or up to
            four lanes (duet/trio/quartet split) — see pitch-lane.tsx */}
        <div
          className="absolute left-0 right-0"
          style={{
            top: 0,
            height: lanesTotalHeight,
          }}
        >
          {lanes.map(lane => (
            <PitchLaneView
              key={lane.key}
              lane={lane}
              isLastLane={lanes[lanes.length - 1]?.key === lane.key}
              viewportWidth={viewport.width}
              pixelsPerSecond={pixelsPerSecond}
              scrollOffset={scrollOffset}
              zoom={zoom}
              bpm={song.bpm}
              gap={song.gap}
              comparisonNotes={comparisonNotes}
              detailBeatDuration={detailBeatDuration}
              selectedNoteId={selectedNoteId}
              selectedNoteIds={selectedNoteIds}
              isPlaying={isPlaying}
              currentTime={currentTime}
              onLaneClick={makeLaneClick(lane)}
              onNoteClick={handleNoteClick}
              onNoteDragStart={handleNoteDragStart}
            />
          ))}
        </div>

        {/* ── MIDI/KAR comparison legend chip (3.5) ──
            Non-blocking (pointer-events-none) except the ✕ clear button,
            which removes the reference overlay entirely (comparison-overlay.tsx). */}
        {comparisonNotes && comparisonNotes.length > 0 && (
          <ComparisonLegend onClearComparison={onClearComparison} />
        )}

        {/* Lyric track */}
        <div
          className="absolute left-0 right-0 ml-8"
          style={{
            top: lanesTotalHeight,
            height: lyricTrackHeight
          }}
        >
          <LyricTrack
            notes={allNotes}
            pixelsPerSecond={pixelsPerSecond}
            scrollOffset={scrollOffset}
            height={lyricTrackHeight}
            onLyricSelect={onNoteSelect}
            onLyricJump={handleLyricJump}
            selectedNoteId={selectedNoteId}
          />
        </div>

        {/* ── Note details band ("Noten-Details") — note-details-band.tsx ── */}
        <NoteDetailsBand
          top={lanesTotalHeight + lyricTrackHeight}
          bottom={minimapHeight}
          selectedNote={selectedDetailNote}
          beat={detailBeat}
          lineIndex={selectedLineIndex}
          multiSelectCount={multiSelectCount}
          onNoteUpdate={onNoteUpdate}
          onLyricChange={onLyricChange}
          onCommitHistory={onCommitHistory}
        />

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

export default Timeline;
