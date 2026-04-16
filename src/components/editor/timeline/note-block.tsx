'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Note, DuetPlayer } from '@/types/game';

interface NoteBlockProps {
  note: Note;
  isSelected: boolean;
  isPlayingNote?: boolean;
  zoom: number;
  pixelsPerSecond: number;
  scrollOffset: number;
  minPitch: number;
  maxPitch: number;
  pitchHeight: number;
  onClick: (noteId: string, event: React.MouseEvent) => void;
  onDragStart: (noteId: string, startX: number, type: 'move' | 'resize-left' | 'resize-right') => void;
  onDoubleClick?: (noteId: string) => void;
}

export function NoteBlock({
  note,
  isSelected,
  isPlayingNote = false,
  zoom,
  pixelsPerSecond,
  scrollOffset,
  minPitch,
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
  const pitchRange = maxPitch - minPitch;
  const y = ((maxPitch - note.pitch) / pitchRange) * pitchHeight;

  // Get note color based on type
  const getNoteColor = () => {
    if (note.isGolden) {
      return {
        bg: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400',
        border: 'border-yellow-400',
        shadow: 'shadow-yellow-400/50',
        text: 'text-yellow-900'
      };
    }
    if (note.isBonus) {
      return {
        bg: 'bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500',
        border: 'border-pink-400',
        shadow: 'shadow-pink-400/50',
        text: 'text-white'
      };
    }
    // Duet colors
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
    onDragStart(note.id, e.clientX, type);
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
        isPlayingNote && 'ring-2 ring-green-400 ring-offset-1 ring-offset-transparent scale-[1.02] brightness-125',
        isHovered && !isPlayingNote && 'brightness-110',
        (isSelected || isPlayingNote) && 'z-10'
      )}
      style={{
        left: `${startX}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${pitchHeight * 0.9}px`,
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

      {/* Lyric display (truncated) */}
      <div className="px-1 py-0.5 text-xs font-medium truncate overflow-hidden whitespace-nowrap">
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

      {/* Move handle (center) */}
      <div
        className="absolute inset-x-4 top-0 bottom-0 cursor-move"
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      />

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className={cn('w-2 h-2 rounded-full', note.isGolden ? 'bg-yellow-500' : 'bg-cyan-500')} />
        </div>
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
