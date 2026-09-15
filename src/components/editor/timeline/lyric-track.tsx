'use client';

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/translations';
import type { Note } from '@/types/game';

interface LyricTrackProps {
  notes: Note[];
  pixelsPerSecond: number;
  scrollOffset: number;
  height: number;
  /** Single click on a lyric → select the note (marks it + details band). */
  onLyricSelect: (_noteId: string) => void;
  /** Double-click on a lyric → jump the piano roll to the note
   *  (horizontal centering + pitch-centering of the lane). */
  onLyricJump: (_note: Note) => void;
  selectedNoteId?: string;
}

/**
 * Lyric track below the pitch lanes.
 *
 * Interactions (user request):
 *  - Click          → select/mark the lyric (and its note — the details band
 *                     below is the primary editing surface for the text).
 *  - Double-click   → jump to the note on the pitch ladder: the timeline
 *                     scrolls horizontally to the note and centers its pitch.
 *
 * The old double-click inline editing was replaced by this jump — lyric
 * text is edited in the note-details band (see NoteDetailsInputs), which is
 * the intended primary editing surface.
 */
export function LyricTrack({
  notes,
  pixelsPerSecond,
  scrollOffset,
  height,
  onLyricSelect,
  onLyricJump,
  selectedNoteId
}: LyricTrackProps) {
  const { t } = useTranslation();
  const jumpHint = t('editor.timeline.lyricJumpHint');
  // Double-Enter (like double-click) within 400 ms → jump to the note
  const lastEnterRef = useRef<{ noteId: string; at: number }>({ noteId: '', at: 0 });

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

        const isSelected = selectedNoteId === note.id;

        return (
          <div
            key={note.id}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            title={jumpHint}
            className={cn(
              'absolute top-1 bottom-1 flex items-center justify-center cursor-pointer select-none',
              'rounded transition-all duration-100 outline-none',
              'focus-visible:ring-2 focus-visible:ring-cyan-300',
              isSelected
                ? 'bg-slate-800 ring-2 ring-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                : 'bg-slate-800/50 hover:bg-slate-800 hover:ring-1 hover:ring-slate-500'
            )}
            style={{
              left: `${startX}px`,
              width: `${width}px`
            }}
            onClick={(e) => {
              // Never let the click bubble to the container (would deselect)
              e.stopPropagation();
              onLyricSelect(note.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onLyricJump(note);
            }}
            onKeyDown={(e) => {
              // Keyboard support mirrors the mouse: Enter/Space selects,
              // Enter pressed twice quickly (double-click analog) jumps.
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                if (e.key === ' ') {
                  onLyricSelect(note.id);
                  return;
                }
                const last = lastEnterRef.current;
                const now = Date.now();
                if (last.noteId === note.id && now - last.at < 400) {
                  lastEnterRef.current = { noteId: '', at: 0 };
                  onLyricJump(note);
                } else {
                  lastEnterRef.current = { noteId: note.id, at: now };
                  onLyricSelect(note.id);
                }
              }
            }}
          >
            <span className={cn(
              'text-xs truncate px-1',
              isSelected ? 'text-white' : 'text-slate-300',
              note.isGolden && 'text-yellow-400',
              !note.isGolden && note.isRap && 'text-emerald-400',
              (note.isFreestyle || note.isBonus) && 'text-pink-400',
              note.player === 'P1' && 'text-cyan-400',
              note.player === 'P2' && 'text-purple-400',
              // R8: match the sub-header dropdown (P4 = emerald, P8 = orange)
              note.player === 'P4' && 'text-emerald-400',
              note.player === 'P8' && 'text-orange-400'
            )}>
              {note.lyric || '—'}
            </span>
          </div>
        );
      })}

      {/* Empty state */}
      {notes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
          {t('editor.timeline.noLyrics')}
        </div>
      )}
    </div>
  );
}

export default LyricTrack;
