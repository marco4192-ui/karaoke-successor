'use client';

/**
 * Pointer-drag interaction logic for the editor timeline.
 *
 * Extracted verbatim from the Timeline component (R2 refactor): the global
 * mousemove/mouseup listeners that drive BOTH the playhead scrub and the
 * R14 axis-locked note drag (move / resize-left / resize-right, with pitch
 * hysteresis + sticky home band). Only the module boundary is new — the
 * effect body, its dependency array and every comment are unchanged.
 */
import React, { useCallback, useEffect, useState } from 'react';
import type { Note } from '@/types/game';
import type { NoteDragState, NoteHistoryMode, PitchLane } from './timeline-types';
import {
  DRAG_AXIS_DEADZONE_PX,
  DRAG_AXIS_ESCAPE_ROWS,
  LEFT_GUTTER,
  PITCH_DRAG_HYSTERESIS,
  PITCH_DRAG_HOME_ROWS,
} from './timeline-constants';

/**
 * R14: map a continuous vertical mouse offset (in pitch rows, positive = up)
 * to a semitone delta with hysteresis + a sticky home band.
 *
 * - Level 0 (original pitch) is double-sticky: it takes ±PITCH_DRAG_HOME_ROWS
 *   rows to LEAVE it, but coming back it is caught at ±(HOME − 0.5) rows —
 *   which makes returning to the original pitch easy and reliable (user
 *   request 1: the note used to "jump over" its original position).
 * - Non-zero levels step at k±0.5 rows ± hysteresis, so the pitch never
 *   flickers between two adjacent semitones at a boundary.
 * - Large jumps (fast drags, coalesced mousemove events) land on the
 *   nearest step instead of inching from the last one.
 */
function pitchDeltaWithHysteresis(rows: number, last: number): number {
  const H = PITCH_DRAG_HYSTERESIS;
  const HOME = PITCH_DRAG_HOME_ROWS;

  if (last === 0) {
    // Leaving the original pitch requires a deliberate full-row move.
    if (rows > HOME) {
      let d = 1;
      while (rows > d + 0.5 + H) d += 1;
      return d;
    }
    if (rows < -HOME) {
      let d = -1;
      while (rows < d - 0.5 - H) d -= 1;
      return d;
    }
    return 0;
  }

  // Stepping between levels (hysteresis at every boundary).
  let delta = last;
  while (rows > delta + 0.5 + H) delta += 1;
  while (rows < delta - 0.5 - H) delta -= 1;

  // Sticky home: descending back toward the start always catches 0 early.
  if (delta > 0 && rows < HOME - 0.5) delta = 0;
  if (delta < 0 && rows > -(HOME - 0.5)) delta = 0;

  return delta;
}

export interface TimelineDragParams {
  /** Scroll container of the timeline (shared with the Timeline component). */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** All notes of the song (flat) — drag-start needs the fresh note object. */
  allNotes: Note[];
  /** Current pitch lanes — the drag captures its lane's pitch height. */
  lanes: PitchLane[];
  pixelsPerSecond: number;
  scrollOffset: number;
  totalDuration: number;
  /** Beat-snap function (YASS-style magnet) applied during drags. */
  snapTime: (_t: number) => number;
  onTimeChange: (_time: number) => void;
  onNoteUpdate: (_noteId: string, _updates: Partial<Note>, _mode?: NoteHistoryMode) => void;
  onCommitHistory: () => void;
}

/**
 * Owns the playhead-drag + note-drag state and the global mouse listeners.
 * Returns the drag state (for click handlers that must ignore clicks while
 * dragging) and the two start handlers wired into the playhead / NoteBlocks.
 */
export function useTimelineDrag({
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
}: TimelineDragParams) {
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [dragState, setDragState] = useState<NoteDragState | null>(null);

  // Handle playhead drag
  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  }, []);

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
        const deltaY = e.clientY - dragState.startY;
        const deltaTime = (deltaX / pixelsPerSecond) * 1000;

        if (dragState.type === 'move') {
          // R14 (user requests 1 + 2): axis-locked 2D move with hysteresis.
          // - The first significant mouse movement locks the drag to its
          //   dominant axis: horizontal drags only change the time (no more
          //   accidental pitch changes), vertical drags only the pitch (no
          //   more accidental time/line changes).
          // - A deliberate ≥2.5-row move on the other axis unlocks both axes.
          // - Pitch uses pitchDeltaWithHysteresis (sticky home band) so the
          //   original pitch is always easy to reach again.
          const pitchHeight = dragState.pitchHeight > 0 ? dragState.pitchHeight : 12;
          const rows = -deltaY / pitchHeight; // positive = up

          if (dragState.axis === 'undecided') {
            if (Math.abs(deltaX) >= DRAG_AXIS_DEADZONE_PX && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
              dragState.axis = 'horizontal';
            } else if (Math.abs(deltaY) >= DRAG_AXIS_DEADZONE_PX && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
              dragState.axis = 'vertical';
            } else if (Math.abs(deltaX) >= 8 || Math.abs(deltaY) >= 8) {
              // moved, but no clear dominance → legacy free 2D behaviour
              dragState.axis = 'free';
            }
          }
          if (dragState.axis === 'horizontal' && Math.abs(deltaY) > DRAG_AXIS_ESCAPE_ROWS * pitchHeight) {
            dragState.axis = 'free';
          } else if (dragState.axis === 'vertical' && Math.abs(deltaX) > DRAG_AXIS_ESCAPE_ROWS * pitchHeight) {
            dragState.axis = 'free';
          }

          const allowTime = dragState.axis === 'horizontal' || dragState.axis === 'free';
          const allowPitch = dragState.axis === 'vertical' || dragState.axis === 'free';

          const updates: Partial<Note> = {};
          if (allowTime) {
            updates.startTime = snapTime(Math.max(0, dragState.originalNote.startTime + deltaTime));
          }
          if (allowPitch) {
            const nextDelta = pitchDeltaWithHysteresis(rows, dragState.lastPitchDelta);
            if (nextDelta !== dragState.lastPitchDelta) dragState.lastPitchDelta = nextDelta;
            if (nextDelta !== 0) {
              updates.pitch = Math.max(0, Math.min(127, dragState.originalNote.pitch + nextDelta));
            }
          }

          // Only mark the gesture as "moved" (→ history entry) when a value
          // actually CHANGED — hand tremor inside the dead zone no longer
          // creates phantom undo steps.
          const changed =
            (updates.startTime !== undefined && updates.startTime !== dragState.originalNote.startTime) ||
            (updates.pitch !== undefined && updates.pitch !== dragState.originalNote.pitch);
          if (changed) dragState.moved = true;
          if (Object.keys(updates).length > 0) {
            onNoteUpdate(dragState.noteId, updates, 'live');
          }
        } else if (dragState.type === 'resize-left') {
          const newStart = snapTime(Math.max(0, dragState.originalNote.startTime + deltaTime));
          const newDuration = dragState.originalNote.duration - (newStart - dragState.originalNote.startTime);
          if (newDuration > 100) {
            if (newStart !== dragState.originalNote.startTime || newDuration !== dragState.originalNote.duration) {
              dragState.moved = true;
            }
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
          if (newDuration !== dragState.originalNote.duration) dragState.moved = true;
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
  }, [isDraggingPlayhead, dragState, scrollOffset, pixelsPerSecond, totalDuration, onTimeChange, onNoteUpdate, onCommitHistory, snapTime, containerRef]);

  // Handle note drag start — captures the lane's pitch height so vertical
  // mouse movement maps to semitone steps during the drag.
  // R14: axis starts undecided; the dominant first move locks it.
  const handleNoteDragStart = useCallback((noteId: string, startX: number, startY: number, type: 'move' | 'resize-left' | 'resize-right') => {
    const note = allNotes.find(n => n.id === noteId);
    if (note) {
      const lane = lanes.find(l => l.notes.some(n => n.id === noteId));
      setDragState({ noteId, startX, startY, type, originalNote: { ...note }, pitchHeight: lane?.pitchHeight ?? 12, moved: false, axis: 'undecided', lastPitchDelta: 0 });
    }
  }, [allNotes, lanes]);

  return { isDraggingPlayhead, dragState, handlePlayheadMouseDown, handleNoteDragStart };
}
