'use client';

import React, { useCallback, useState, useRef} from 'react';
import { cn } from '@/lib/utils';
import type { Note } from '@/types/game';

interface NoteBlockProps {
  note: Note;
  isSelected: boolean;
  /** Part of the Ctrl+Click multi-selection (but not the primary note) */
  isMultiSelected?: boolean;
  isPlayingNote?: boolean;
  zoom: number;
  pixelsPerSecond: number;
  scrollOffset: number;
  maxPitch: number;
  pitchHeight: number;
  onClick: (noteId: string, _event: React.MouseEvent) => void;
  onDragStart: (noteId: string, _startX: number, _startY: number, type: 'move' | 'resize-left' | 'resize-right') => void;
  onDoubleClick?: (noteId: string) => void;
}

export function NoteBlock({
  note,
  isSelected,
  isMultiSelected = false,
  isPlayingNote = false,
  pixelsPerSecond,
  scrollOffset,
  maxPitch,
  pitchHeight,
  onClick,
  onDragStart,
  onDoubleClick
}: NoteBlockProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [resizeHover, setResizeHover] = useState<'left' | 'right' | null>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  // Calculate position and dimensions
  const startX = (note.startTime / 1000) * pixelsPerSecond - scrollOffset;
  const width = Math.max(10, (note.duration / 1000) * pixelsPerSecond);
  // Thicker note bars (R9, user request 1.1): fill the lane at ~96% + 4px
  // (was 0.9× + 3px) — combined with the 24-semitave pitch window this makes
  // the bars ≥50% taller than before. Capped just under the lane height and
  // centered vertically.
  const noteHeight = Math.min(pitchHeight - 1, Math.round(pitchHeight * 0.96) + 4);
  const y = (maxPitch - note.pitch) * pitchHeight + (pitchHeight - noteHeight) / 2;

  // Get note color based on type ( : normal, * golden, F freestyle, R rap, G golden rap )
  const getNoteColor = () => {
    // Golden (incl. golden rap 'G') — amber with an emerald ring for G
    if (note.isGolden) {
      return {
        bg: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400',
        border: note.isRap ? 'border-emerald-400' : 'border-yellow-400',
        shadow: note.isRap ? 'shadow-emerald-400/50' : 'shadow-yellow-400/50',
        text: 'text-yellow-900'
      };
    }
    // Rap ('R') — emerald (timing counts, pitch ignored)
    if (note.isRap) {
      return {
        bg: 'bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500',
        border: 'border-emerald-400',
        shadow: 'shadow-emerald-400/50',
        text: 'text-emerald-950'
      };
    }
    // Freestyle ('F', legacy isBonus) — pink (any noise counts)
    if (note.isFreestyle || note.isBonus) {
      return {
        bg: 'bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500',
        border: 'border-pink-400',
        shadow: 'shadow-pink-400/50',
        text: 'text-white'
      };
    }
    // Voice colors (duet/trio/quartet)
    if (note.player === 'P1') {
      return {
        bg: 'bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-600',
        border: 'border-cyan-400',
        shadow: 'shadow-cyan-400/50',
        text: 'text-white'
      };
    }
    if (note.player === 'P2') {
      return {
        bg: 'bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600',
        border: 'border-purple-400',
        shadow: 'shadow-purple-400/50',
        text: 'text-white'
      };
    }
    // R8: voice colors match the sub-header dropdown — P4 (3rd voice) =
    // emerald, P8 (4th voice) = orange (previously orange/rose).
    if (note.player === 'P4') {
      return {
        bg: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600',
        border: 'border-emerald-400',
        shadow: 'shadow-emerald-400/50',
        text: 'text-white'
      };
    }
    if (note.player === 'P8') {
      return {
        bg: 'bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600',
        border: 'border-orange-400',
        shadow: 'shadow-orange-400/50',
        text: 'text-white'
      };
    }
    // Default cyan
    return {
      bg: 'bg-gradient-to-r from-cyan-700 via-cyan-600 to-cyan-700',
      border: 'border-cyan-400',
      shadow: 'shadow-cyan-400/50',
      text: 'text-white'
    };
  };

  const colors = getNoteColor();

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'move' | 'resize-left' | 'resize-right') => {
    e.stopPropagation();
    // R8: Ctrl/Cmd+Click toggles the multi-selection — never starts a drag.
    // Previously a 1–2 px hand tremor while Ctrl+Clicking moved the note
    // (live update) which felt like "the multi-select doesn't work".
    if (e.ctrlKey || e.metaKey) return;
    onDragStart(note.id, e.clientX, e.clientY, type);
  }, [note.id, onDragStart]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(note.id, e);
  }, [note.id, onClick]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.(note.id);
  }, [note.id, onDoubleClick]);

  // Check if off-screen - return null after all hooks are called
  const isOffScreen = startX + width < 0 || startX > (typeof window !== 'undefined' ? window.innerWidth : 1920);
  if (isOffScreen) {
    return null;
  }

  return (
    <div
      ref={noteRef}
      className={cn(
        'absolute rounded cursor-pointer transition-all duration-100 group',
        colors.bg,
        colors.border,
        colors.text,
        'border-2',
        isSelected && 'ring-2 ring-white ring-offset-1 ring-offset-transparent',
        // R8: multi-selection gets a clearly visible ring (was ring-1 /80 —
        // too faint to notice, which made Ctrl+Click feel broken)
        isMultiSelected && !isSelected && 'ring-2 ring-cyan-300 ring-offset-1 ring-offset-transparent brightness-110',
        isPlayingNote && 'ring-2 ring-green-400 ring-offset-1 ring-offset-transparent scale-[1.02] brightness-125',
        isHovered && !isPlayingNote && 'brightness-110',
        (isSelected || isPlayingNote || isMultiSelected) && 'z-10'
      )}
      style={{
        left: `${startX}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${noteHeight}px`,
        boxShadow: isSelected
          ? `0 0 15px ${note.isGolden ? 'rgba(251, 191, 36, 0.5)' : 'rgba(34, 211, 238, 0.5)'}`
          : isPlayingNote
            ? '0 0 20px rgba(34, 197, 94, 0.6)'
            : 'none'
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Analysis confidence indicator (colored left bar) */}
      {note.analysisConfidence != null && !isPlayingNote && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1 rounded-l pointer-events-none',
            note.analysisConfidence >= 0.75
              ? 'bg-green-400'
              : note.analysisConfidence >= 0.5
                ? 'bg-yellow-400'
                : note.analysisConfidence >= 0.25
                  ? 'bg-orange-400'
                  : 'bg-red-400'
          )}
        />
      )}

      {/* Lyric display (truncated — smaller font on thin split-view lanes) */}
      <div className={cn(
        'px-1 py-0.5 font-medium truncate overflow-hidden whitespace-nowrap leading-none',
        pitchHeight < 14 ? 'text-[9px]' : 'text-xs',
      )}>
        {note.lyric}
      </div>

      {/* Left resize handle */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l',
          'hover:bg-white/20 transition-colors',
          resizeHover === 'left' && 'bg-white/30'
        )}
        onMouseDown={(e) => handleMouseDown(e, 'resize-left')}
        onMouseEnter={() => setResizeHover('left')}
        onMouseLeave={() => setResizeHover(null)}
      />

      {/* Right resize handle */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r',
          'hover:bg-white/20 transition-colors',
          resizeHover === 'right' && 'bg-white/30'
        )}
        onMouseDown={(e) => handleMouseDown(e, 'resize-right')}
        onMouseEnter={() => setResizeHover('right')}
        onMouseLeave={() => setResizeHover(null)}
      />

      {/* Move handle (center) — R14: inset-x-1.5 (was inset-x-4) so short
          notes (down to ~14px at low zoom) still have a grabbable move area.
          This element is the LAST child, so it wins the overlap with the
          inner edges of the two 8px resize handles. */}
      <div
        className="absolute inset-x-1.5 top-0 bottom-0 cursor-move"
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      />

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className={cn('w-2 h-2 rounded-full', note.isGolden ? 'bg-yellow-500' : note.isRap ? 'bg-emerald-500' : (note.isFreestyle || note.isBonus) ? 'bg-pink-500' : 'bg-cyan-500')} />
        </div>
      )}

      {/* Multi-selection indicator (Ctrl+Click) — cyan corner dot */}
      {isMultiSelected && !isSelected && (
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-md pointer-events-none" />
      )}

      {/* Golden note sparkle effect */}
      {note.isGolden && (
        <div className="absolute inset-0 overflow-hidden rounded pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>
      )}
    </div>
  );
}

export default NoteBlock;
