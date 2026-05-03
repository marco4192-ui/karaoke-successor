'use client';

import { useRef, useEffect, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Song, Note } from '@/types/game';
import { BookOpen } from 'lucide-react';

interface EditorLyricsTabProps {
  song: Song;
  currentTime: number;
  selectedNoteId?: string;
  onNoteSelect: (noteId: string | undefined) => void;
  onTimeChange: (time: number) => void;
}

/**
 * Lyrics Overview Tab
 * 
 * Displays the full song lyrics with each syllable/note as a clickable word.
 * Clicking a word jumps to that note in the timeline and selects it.
 * The currently active line (based on playback time) is highlighted.
 * 
 * Inspired by the YASS editor's lyrics panel.
 */
export function EditorLyricsTab({
  song,
  currentTime,
  selectedNoteId,
  onNoteSelect,
  onTimeChange,
}: EditorLyricsTabProps) {
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Flatten all lyric lines with their notes for easy access
  const lyricLines = useMemo(() => {
    return song.lyrics.map((line, lineIndex) => ({
      ...line,
      lineIndex,
      // Split notes into word groups (notes with trailing space = word end)
      wordGroups: groupNotesIntoWords(line.notes),
    }));
  }, [song.lyrics]);

  // Find the currently active line based on playback time
  const activeLineIndex = useMemo(() => {
    for (let i = lyricLines.length - 1; i >= 0; i--) {
      if (currentTime >= lyricLines[i].startTime) {
        return i;
      }
    }
    return 0;
  }, [lyricLines, currentTime]);

  // Auto-scroll to active line during playback
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeLineIndex]);

  // Handle clicking a note/word in the lyrics
  const handleWordClick = (note: Note) => {
    onNoteSelect(note.id);
    // Jump timeline to the start of this note, slightly before for context
    onTimeChange(Math.max(0, note.startTime - 200));
  };

  // Format time for line label (mm:ss)
  const formatLineTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (song.lyrics.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-slate-500">
          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Keine Lyrics vorhanden</p>
          <p className="text-xs mt-1">Öffne einen Song mit Noten</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-1">
        {/* Header info */}
        <div className="text-xs text-slate-500 px-1 pb-2 border-b border-slate-700 mb-2">
          <div className="flex justify-between items-center">
            <span>{song.lyrics.length} Zeilen</span>
            <span>{song.lyrics.flatMap(l => l.notes).length} Noten</span>
          </div>
          <p className="mt-1 text-slate-600">Klick auf ein Wort springt zur Note</p>
        </div>

        {/* Lyrics lines */}
        {lyricLines.map((line) => {
          const isActive = line.lineIndex === activeLineIndex;
          const hasNotes = line.notes.length > 0;

          return (
            <div
              key={line.id}
              ref={isActive ? activeLineRef : undefined}
              className={cn(
                'group rounded-lg px-2 py-1.5 transition-colors cursor-pointer',
                isActive
                  ? 'bg-cyan-500/15 border border-cyan-500/30'
                  : 'hover:bg-slate-800/60 border border-transparent'
              )}
              onClick={(e) => {
                // Clicking empty space on the line jumps to line start
                if (e.target === e.currentTarget && line.notes.length > 0) {
                  onTimeChange(Math.max(0, line.startTime - 200));
                }
              }}
            >
              {/* Line number and time */}
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn(
                  'text-[10px] font-mono tabular-nums w-5 text-right',
                  isActive ? 'text-cyan-400' : 'text-slate-600'
                )}>
                  {line.lineIndex + 1}
                </span>
                <span className={cn(
                  'text-[10px] font-mono tabular-nums',
                  isActive ? 'text-cyan-400/60' : 'text-slate-600/60'
                )}>
                  {formatLineTime(line.startTime)}
                </span>
              </div>

              {/* Words / Notes */}
              {hasNotes ? (
                <div className="flex flex-wrap items-center gap-0.5 pl-7">
                  {line.wordGroups.map((group, groupIndex) => (
                    <span
                      key={`group-${line.id}-${groupIndex}`}
                      className="inline-flex"
                    >
                      {group.map((note) => {
                        const isSelected = selectedNoteId === note.id;
                        const isActiveNote = isActive && 
                          currentTime >= note.startTime && 
                          currentTime < note.startTime + note.duration;
                        const isWordEnd = note.lyric.endsWith(' ');
                        const displayText = isWordEnd ? note.lyric.trimEnd() : note.lyric;

                        return (
                          <span
                            key={note.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWordClick(note);
                            }}
                            className={cn(
                              'text-sm px-0.5 rounded transition-all duration-100',
                              // Default state
                              !isSelected && !isActiveNote && 'text-slate-300 hover:text-white hover:bg-slate-700/50',
                              // Active (currently playing)
                              isActiveNote && !isSelected && 'text-cyan-300 bg-cyan-500/20 font-medium',
                              // Selected
                              isSelected && 'text-white bg-purple-500/30 ring-1 ring-purple-400',
                              // Cursor
                              'cursor-pointer'
                            )}
                            title={`${note.lyric} | ${Math.round(note.startTime / 1000)}s | Pitch: ${note.pitch}`}
                          >
                            {displayText || '\u00A0'}
                          </span>
                        );
                      })}
                      {/* Add space after each word group */}
                      {groupIndex < line.wordGroups.length - 1 && (
                        <span className="w-1.5 inline-block" />
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="pl-7 text-xs text-slate-600 italic">
                  {line.text || '(leere Zeile)'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

/**
 * Group notes into words based on trailing spaces.
 * In UltraStar format: a trailing space in the lyric = end of word.
 * Notes without trailing space are syllables that belong to the same word.
 */
function groupNotesIntoWords(notes: Note[]): Note[][] {
  const groups: Note[][] = [];
  let currentGroup: Note[] = [];

  for (const note of notes) {
    currentGroup.push(note);

    if (note.lyric.endsWith(' ')) {
      // Trailing space = word end
      groups.push(currentGroup);
      currentGroup = [];
    }
  }

  // Push remaining notes as the last word
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
