'use client';

/**
 * One pitch lane of the timeline note area — background grid (TimelineGrid),
 * MIDI/KAR comparison ghost blocks, pitch labels, lane badge + divider and
 * the NoteBlocks themselves. Combined view = a single lane over all notes;
 * split view = one lane per voice (duet/trio/quartet).
 *
 * This was the per-lane block of the Timeline component's JSX before the
 * R2 refactor; markup and props passed to the children are unchanged.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { NoteBlock } from './note-block';
import { TimelineGrid } from './timeline-grid';
import { ComparisonLayer } from './comparison-overlay';
import type { PitchLane, TimelineComparisonNote } from './timeline-types';
import { LEFT_GUTTER } from './timeline-constants';

interface PitchLaneViewProps {
  lane: PitchLane;
  /** True when this is the last lane → no divider below (split view). */
  isLastLane: boolean;
  /** Full timeline viewport width in px. */
  viewportWidth: number;
  pixelsPerSecond: number;
  scrollOffset: number;
  zoom: number;
  bpm: number;
  gap: number;
  /** MIDI/KAR comparison reference notes (null/empty → no overlay). */
  comparisonNotes: Array<TimelineComparisonNote> | null;
  /** Milliseconds per beat of the current song (15000/BPM). */
  detailBeatDuration: number;
  selectedNoteId?: string;
  selectedNoteIds?: Set<string>;
  isPlaying: boolean;
  currentTime: number;
  /** Shift+Click on the lane background → add a note at that pitch/time. */
  onLaneClick: (_e: React.MouseEvent) => void;
  onNoteClick: (_noteId: string, _event: React.MouseEvent) => void;
  onNoteDragStart: (_noteId: string, _startX: number, _startY: number, _type: 'move' | 'resize-left' | 'resize-right') => void;
}

export function PitchLaneView({
  lane,
  isLastLane,
  viewportWidth,
  pixelsPerSecond,
  scrollOffset,
  zoom,
  bpm,
  gap,
  comparisonNotes,
  detailBeatDuration,
  selectedNoteId,
  selectedNoteIds,
  isPlaying,
  currentTime,
  onLaneClick,
  onNoteClick,
  onNoteDragStart,
}: PitchLaneViewProps) {
  return (
    <div
      className="absolute left-0 right-0"
      style={{ top: lane.topOffset, height: lane.height }}
      onClick={onLaneClick}
    >
      {/* Background grid — beat lines match the UltraStar export formula
          (beatDuration = 15000/BPM, beats offset by GAP) */}
      <TimelineGrid
        viewportWidth={viewportWidth - LEFT_GUTTER}
        pixelsPerSecond={pixelsPerSecond}
        scrollOffset={scrollOffset}
        bpm={bpm}
        gap={gap}
        minPitch={lane.minPitch}
        maxPitch={lane.maxPitch}
        pitchHeight={lane.pitchHeight}
      />

      {/* ── MIDI/KAR comparison overlay (3.5) ──
          Hollow, dashed outline blocks in the SAME coordinate space as
          NoteBlock (beat → x via the current song's bpm/gap, pitch → y),
          but pointer-events-none and painted BELOW the real notes.
          Pure editor state — never serialized, never exported. */}
      {comparisonNotes && comparisonNotes.length > 0 && (
        <ComparisonLayer
          comparisonNotes={comparisonNotes}
          lane={lane}
          gap={gap}
          detailBeatDuration={detailBeatDuration}
          pixelsPerSecond={pixelsPerSecond}
          scrollOffset={scrollOffset}
          viewportWidth={viewportWidth}
        />
      )}

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
      {lane.key !== 'combined' && !isLastLane && (
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
            onClick={onNoteClick}
            onDragStart={onNoteDragStart}
          />
        ))}
      </div>
    </div>
  );
}
