'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { Note } from '@/types/game';

interface LyricTrackProps {
  notes: Note[];
  zoom: number;
  pixelsPerSecond: number;
  scrollOffset: number;
  height: number;
  onLyricChange: (noteId: string, newLyric: string) => void;
  selectedNoteId?: string;
}

export function LyricTrack({
  notes,
  zoom,
  pixelsPerSecond,
  scrollOffset,
  height,
  onLyricChange,
  selectedNoteId
}: LyricTrackProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingNoteId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingNoteId]);

  const handleDoubleClick = useCallback((note: Note) => {
    setEditingNoteId(note.id);
    setEditValue(note.lyric);
  }, []);

  const handleBlur = useCallback(() => {
    if (editingNoteId && editValue.trim()) {
      onLyricChange(editingNoteId, editValue.trim());
    }
    setEditingNoteId(null);
  }, [editingNoteId, editValue, onLyricChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditingNoteId(null);
    }
    // Stop propagation to prevent timeline shortcuts
    e.stopPropagation();
  }, [handleBlur]);

  return (
    <div 
      className="relative w-full bg-slate-900/50 border-t border-slate-700"
      style={{ height }}
    >
      {/* Lyric segments */}
      {notes.map((note) => {
        const startX = (note.startTime / 1000) * pixelsPerSecond - scrollOffset;
        const width = Math.max(20, (note.duration / 1000) * pixelsPerSecond);
        
        // Don't render if completely off-screen
        if (startX + width < -100 || startX > window.innerWidth + 100) {
          return null;
        }

        const isEditing = editingNoteId === note.id;
        const isSelected = selectedNoteId === note.id;

        return (
          <div
            key={note.id}
            className={cn(
              'absolute top-1 bottom-1 flex items-center justify-center',
              'rounded transition-all duration-100',
              isSelected && 'ring-1 ring-cyan-400',
              isEditing ? 'bg-slate-800 ring-2 ring-purple-400' : 'bg-slate-800/50 hover:bg-slate-800'
            )}
            style={{
              left: `${startX}px`,
              width: `${width}px`
            }}
            onDoubleClick={() => handleDoubleClick(note)}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full h-full bg-transparent text-center text-white text-sm px-1 outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={cn(
                'text-xs text-slate-300 truncate px-1',
                note.isGolden && 'text-yellow-400',
                note.isBonus && 'text-pink-400',
                note.player === 'P1' && 'text-cyan-400',
                note.player === 'P2' && 'text-purple-400'
              )}>
                {note.lyric || '—'}
              </span>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {notes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
          No lyrics - double-click to add notes
        </div>
      )}
    </div>
  );
}

export default LyricTrack;
