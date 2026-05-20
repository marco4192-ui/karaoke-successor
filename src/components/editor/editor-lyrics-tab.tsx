'use client';

import { useRef, useEffect, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Song, Note } from '@/types/game';
import { BookOpen, FileText } from 'lucide-react';
import { parseLyricsToSyllables } from '@/lib/editor/syllable-separator';
import { useTranslation } from '@/lib/i18n/translations';

interface EditorLyricsTabProps {
  song: Song;
  currentTime: number;
  selectedNoteId?: string;
  onNoteSelect: (_noteId: string | undefined) => void;
  onTimeChange: (_time: number) => void;
}

/**
 * Lyrics Overview Tab
 *
 * Three display modes:
 * 1. No lyrics, no rawLyrics → empty state
 * 2. No lyrics but rawLyrics exists (new song) → show raw text with all syllables as "pending"
 * 3. Lyrics exist → show note-based lyrics as before, with unassigned syllables from rawLyrics shown dimmed
 *
 * As notes are added in tap mode, syllables progressively shift from "pending" to "assigned".
 */
export function EditorLyricsTab({
  song,
  currentTime,
  selectedNoteId,
  onNoteSelect,
  onTimeChange,
}: EditorLyricsTabProps) {
  const activeLineRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // Count how many syllables have been assigned to notes
  const assignedNoteCount = useMemo(() => {
    return song.lyrics.flatMap(line => line.notes).filter(n => n.lyric && n.lyric !== '---').length;
  }, [song.lyrics]);

  // Parse rawLyrics into structured syllable data (only when rawLyrics exists)
  const rawSyllableData = useMemo(() => {
    if (!song.rawLyrics) return null;
    return parseLyricsToSyllables(song.rawLyrics);
  }, [song.rawLyrics]);

  // Flatten all raw syllables in order for assignment tracking
  const allRawSyllables = useMemo(() => {
    if (!rawSyllableData) return [];
    return rawSyllableData.lines.flatMap(line =>
      line.words.flatMap(word => word.syllables)
    );
  }, [rawSyllableData]);

  // Get all notes in order (sorted by startTime) for matching
  const allNotesOrdered = useMemo(() => {
    return song.lyrics
      .flatMap(line => line.notes)
      .filter(n => n.lyric && n.lyric !== '---')
      .sort((a, b) => a.startTime - b.startTime);
  }, [song.lyrics]);

  // Whether we have existing note-based lyrics (imported song or partially edited)
  const hasLyricNotes = song.lyrics.length > 0 && song.lyrics.some(l => l.notes.length > 0);

  // ── Mode 1: Raw lyrics only (new song, no notes yet) ──
  if (!hasLyricNotes && rawSyllableData) {
    const totalSyllables = allRawSyllables.length;
    return (
      <ScrollArea className="h-full">
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="text-xs text-slate-500 px-1 pb-2 border-b border-slate-700">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {t('editor.lyricsTab.lyrics')}
              </span>
              <span>{totalSyllables} {t('editor.lyricsTab.syllables')}</span>
            </div>
            <p className="mt-1 text-slate-600">
              {t('editor.lyricsTab.tapModeHint')}
            </p>
          </div>

          {/* Raw lyrics displayed line by line with syllable groups */}
          {rawSyllableData.lines.map((line, lineIndex) => (
            <div
              key={`raw-line-${lineIndex}`}
              className="rounded-lg px-2 py-1.5 border border-transparent hover:bg-slate-800/40"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono tabular-nums w-5 text-right text-slate-600">
                  {lineIndex + 1}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-0.5 pl-7">
                {line.words.map((word, wordIndex) => (
                  <span key={`raw-word-${lineIndex}-${wordIndex}`} className="inline-flex">
                    {word.syllables.map((syllable, sylIndex) => (
                      <span
                        key={`raw-syl-${lineIndex}-${wordIndex}-${sylIndex}`}
                        className="text-sm text-amber-300/70 px-0.5"
                      >
                        {syllable}
                      </span>
                    ))}
                    {wordIndex < line.words.length - 1 && (
                      <span className="w-1.5 inline-block" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  // ── Mode 2: Note-based lyrics with progressive assignment ──
  // Also handles the case where rawLyrics exists alongside notes (progressive view)
  if (hasLyricNotes) {
    // Standard note-based lyrics (existing behavior)
    const lyricLines = useMemo(() => {
      return song.lyrics.map((line, lineIndex) => ({
        ...line,
        lineIndex,
        wordGroups: groupNotesIntoWords(line.notes),
      }));
    }, [song.lyrics]);

    const activeLineIndex = useMemo(() => {
      for (let i = lyricLines.length - 1; i >= 0; i--) {
        if (currentTime >= lyricLines[i].startTime) {
          return i;
        }
      }
      return 0;
    }, [lyricLines, currentTime]);

    useEffect(() => {
      if (activeLineRef.current) {
        activeLineRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }, [activeLineIndex]);

    const handleWordClick = (note: Note) => {
      onNoteSelect(note.id);
      onTimeChange(Math.max(0, note.startTime - 200));
    };

    const formatLineTime = (ms: number): string => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate remaining unassigned syllables
    const unassignedCount = rawSyllableData
      ? Math.max(0, allRawSyllables.length - assignedNoteCount)
      : 0;

    return (
      <ScrollArea className="h-full">
        <div className="p-3 space-y-1">
          {/* Header info */}
          <div className="text-xs text-slate-500 px-1 pb-2 border-b border-slate-700 mb-2">
            <div className="flex justify-between items-center">
              <span>{song.lyrics.length} {t('editor.lyricsTab.linesCount')}</span>
              <span>{assignedNoteCount} {t('editor.lyricsTab.notesCount')}</span>
            </div>
            <p className="mt-1 text-slate-600">{t('editor.lyricsTab.clickWordHint')}</p>
            {rawSyllableData && unassignedCount > 0 && (
              <div className="mt-1.5 flex items-center gap-2 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md">
                <span className="text-amber-400 text-[10px]">
                  {t('editor.lyricsTab.syllablesUnassigned').replace('{count}', String(unassignedCount))}
                </span>
                <span className="text-amber-500/60 text-[10px]">
                  ({assignedNoteCount}/{allRawSyllables.length})
                </span>
              </div>
            )}
            {rawSyllableData && unassignedCount === 0 && allRawSyllables.length > 0 && (
              <div className="mt-1.5 flex items-center gap-2 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-md">
                <span className="text-green-400 text-[10px]">
                  {t('editor.lyricsTab.allSyllablesAssigned').replace('{count}', String(allRawSyllables.length))}
                </span>
              </div>
            )}
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
                                !isSelected && !isActiveNote && 'text-slate-300 hover:text-white hover:bg-slate-700/50',
                                isActiveNote && !isSelected && 'text-cyan-300 bg-cyan-500/20 font-medium',
                                isSelected && 'text-white bg-purple-500/30 ring-1 ring-purple-400',
                                'cursor-pointer'
                              )}
                              title={`${note.lyric} | ${Math.round(note.startTime / 1000)}s | Pitch: ${note.pitch}`}
                            >
                              {displayText || '\u00A0'}
                            </span>
                          );
                        })}
                        {groupIndex < line.wordGroups.length - 1 && (
                          <span className="w-1.5 inline-block" />
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="pl-7 text-xs text-slate-600 italic">
                    {line.text || t('editor.lyricsTab.emptyLine')}
                  </div>
                )}
              </div>
            );
          })}

          {/* Show remaining unassigned raw lyrics as "pending" section */}
          {rawSyllableData && unassignedCount > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-700/50">
              <div className="text-xs text-amber-400/60 px-1 mb-2 flex items-center gap-1">
                <span>{t('editor.lyricsTab.notAssigned')}</span>
                <span className="text-amber-400/40">({unassignedCount} {t('editor.lyricsTab.syllables')})</span>
              </div>
              {/* Build the pending syllables display by skipping assigned ones */}
              {rawSyllableData.lines.map((line, lineIndex) => {
                // Get the syllables for this line that are NOT yet assigned
                const lineSyllables = line.words.flatMap(w => w.syllables);
                const lineStartSyllableIndex = rawSyllableData.lines
                  .slice(0, lineIndex)
                  .reduce((acc, prevLine) => acc + prevLine.words.reduce((a, w) => a + w.syllables.length, 0), 0);

                // Check if any syllable from this line is unassigned
                const hasUnassigned = lineSyllables.some((_, i) => {
                  const globalIndex = lineStartSyllableIndex + i;
                  return globalIndex >= assignedNoteCount;
                });

                if (!hasUnassigned) return null;

                return (
                  <div
                    key={`pending-line-${lineIndex}`}
                    className="rounded-lg px-2 py-1 border border-transparent"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono tabular-nums w-5 text-right text-slate-700">
                        {lineIndex + 1}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-0.5 pl-7">
                      {line.words.map((word, wordIndex) => {
                        // Calculate syllable offset for this word
                        const wordSyllableOffset = line.words
                          .slice(0, wordIndex)
                          .reduce((acc, w) => acc + w.syllables.length, 0);

                        return (
                          <span key={`pw-${lineIndex}-${wordIndex}`} className="inline-flex">
                            {word.syllables.map((syllable, sylIndex) => {
                              const globalIndex = lineStartSyllableIndex + wordSyllableOffset + sylIndex;
                              const isAssigned = globalIndex < assignedNoteCount;
                              return (
                                <span
                                  key={`ps-${lineIndex}-${wordIndex}-${sylIndex}`}
                                  className={cn(
                                    'text-sm px-0.5',
                                    isAssigned ? 'text-slate-600 line-through' : 'text-amber-300/60'
                                  )}
                                >
                                  {syllable}
                                </span>
                              );
                            })}
                            {wordIndex < line.words.length - 1 && (
                              <span className="w-1.5 inline-block" />
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    );
  }

  // ── Mode 3: Empty state ──
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center text-slate-500">
        <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t('editor.lyricsTab.noLyrics')}</p>
        <p className="text-xs mt-1">{t('editor.lyricsTab.noLyricsHint')}</p>
      </div>
    </div>
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
      groups.push(currentGroup);
      currentGroup = [];
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
