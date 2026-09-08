'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Song, Note, LyricLine } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from '@/lib/i18n/translations';
import { saveSongToTxt, type SaveResult } from '@/lib/editor/save-to-file';
import { Timeline, type NoteHistoryMode } from './timeline/timeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, FileText, Settings, BookOpen, Waves, Sparkles, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { normalizeFilePath } from '@/lib/tauri-file-storage';
import { midiPitchToFrequency } from '@/lib/utils';
import { parseLyricsToSyllables } from '@/lib/editor/syllable-separator';
import { snapTimeToBeat } from '@/lib/editor/beat-utils';
import { useEditorHistory } from '@/hooks/use-editor-history';
import { useEditorPlayback } from '@/hooks/use-editor-playback';
import { useEditorKeyboardShortcuts } from '@/hooks/use-editor-keyboard-shortcuts';
import { useTapNotePlacement } from '@/hooks/use-tap-note-placement';
import { EditorHeader } from './editor-header';
import { VideoSyncOverlay } from './video-sync-overlay';
import { ToolsPanel } from './tools-panel';
import { EditorNoteTab, EditorNoteTabPlaceholder } from './editor-note-tab';
import { EditorSongInfoTab } from './editor-song-info-tab';
import { EditorMetadataTab } from './editor-metadata-tab';
import { EditorLyricsTab } from './editor-lyrics-tab';
import { AudioAnalysisPanel } from './audio-analysis-panel';
import { AIAssistantPanel } from './panels/ai-assistant-panel';
import type { DetectedNote } from '@/hooks/use-audio-analysis';

interface KaraokeEditorProps {
  song: Song;
  onSave: (_song: Song) => void;
  onCancel: () => void;
  /** Streams the latest editor song state to the parent (keeps side panels from saving stale lyrics) */
  onSongSync?: (_song: Song) => void;
  /** Increments whenever an external component (e.g. genre panel) saved the current state */
  externalSaveCount?: number;
  /** Metadata side panel (genre/language editor) visibility */
  showMetadataPanel?: boolean;
  onToggleMetadataPanel?: () => void;
}

// Max time gap between consecutive tap notes before a new lyric line starts
const TAP_LINE_GAP_MS = 1400;

/** Sort notes by startTime and recompute the line's text + endTime. */
function finalizeLine(line: LyricLine): LyricLine {
  const notes = [...line.notes].sort((a, b) => a.startTime - b.startTime);
  const lastNote = notes[notes.length - 1];
  return {
    ...line,
    notes,
    text: notes.map(n => n.lyric).join(' '),
    endTime: lastNote ? lastNote.startTime + lastNote.duration : line.endTime,
  };
}

export function KaraokeEditor({ song: initialSong, onSave, onCancel, onSongSync, externalSaveCount = 0, showMetadataPanel = false, onToggleMetadataPanel }: KaraokeEditorProps) {
  const { t } = useTranslation();
  const [currentSong, setCurrentSong] = useState<Song>(initialSong);
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>();
  // Multi-selection (YASS-style Ctrl+Click); primary selection is always included
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [showSidebar, setShowSidebar] = useState(true); // Sidebar visible by default
  // Cancel confirmation (unsaved changes guard)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // Beat snapping (YASS-style magnet)
  const [snapEnabled, setSnapEnabled] = useState(false);
  // Video sync overlay (video + notes side by side, with timecode control)
  const [showVideoOverlay, setShowVideoOverlay] = useState(false);

  // ── Authoritative song ref ──
  // All mutation handlers compute the next state from this ref (NOT from a
  // setState updater) so history pushes and state updates stay in sync and
  // rapid successive calls cannot race each other.
  const currentSongRef = useRef<Song>(initialSong);
  useEffect(() => {
    // Keep the ref aligned whenever currentSong is changed from the outside
    // (restore URLs, undo/redo and our own handlers also update it directly).
    if (currentSong !== currentSongRef.current) {
      currentSongRef.current = currentSong;
    }
  }, [currentSong]);

  const setSongInternal = useCallback((song: React.SetStateAction<Song>) => {
    const next = typeof song === 'function'
      ? (song as (_prev: Song) => Song)(currentSongRef.current)
      : song;
    currentSongRef.current = next;
    setCurrentSong(next);
  }, []);

  // Track pending "live" changes (drag / slider / typing) that still need a
  // history commit — prevents history flooding while keeping undo correct.
  const dirtyLiveRef = useRef(false);

  // Ref to track save-result dismissal timer so it can be cleared on unmount
  const saveResultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Restore media URLs for Tauri (audioUrl from relativeAudioPath) ──
  useEffect(() => {
    const restoreUrls = async () => {
      try {
        const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
        const restored = await ensureSongUrls(initialSong);
        if (restored.audioUrl !== initialSong.audioUrl || restored.videoBackground !== initialSong.videoBackground) {
          // Merge only the restored URL fields so early user edits are not lost
          setCurrentSong(prev => ({
            ...prev,
            audioUrl: restored.audioUrl,
            videoBackground: restored.videoBackground,
          }));
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[Editor] URL restoration failed (non-critical):', err);
      }
    };
    restoreUrls();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear save-result + commit timers on unmount to prevent leaks
  useEffect(() => {
    return () => {
      if (saveResultTimerRef.current) clearTimeout(saveResultTimerRef.current);
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    };
  }, []);

  const {
    pushHistory, undo: historyUndo, redo: historyRedo,
    canUndo, canRedo, hasUnsavedChanges, markDirty, markSaved,
  } = useEditorHistory(initialSong.lyrics);

  // External save acknowledgment (genre panel saved the current state)
  const externalSaveRef = useRef(externalSaveCount);
  useEffect(() => {
    if (externalSaveCount !== externalSaveRef.current) {
      externalSaveRef.current = externalSaveCount;
      markSaved();
    }
  }, [externalSaveCount, markSaved]);

  // Stream the latest song state to the parent (for the side panels)
  useEffect(() => {
    onSongSync?.(currentSong);
  }, [currentSong, onSongSync]);

  const {
    isPlaying, currentTime, audioRef,
    handlePlayPause, handleTimeChange, setIsPlaying,
    playbackRate, setPlaybackRate,
  } = useEditorPlayback(currentSong.duration, currentSong.audioUrl);

  const allNotes = useMemo(() => currentSong.lyrics.flatMap(line => line.notes), [currentSong.lyrics]);
  const selectedNote = useMemo(() => allNotes.find(n => n.id === selectedNoteId), [allNotes, selectedNoteId]);

  // The video sync overlay is available for any song with a video source
  const hasVideo = useMemo(() =>
    !!(currentSong.videoBackground || currentSong.videoUrl || currentSong.youtubeUrl),
    [currentSong.videoBackground, currentSong.videoUrl, currentSong.youtubeUrl]);

  // Live VIDEOGAP updates from the sync overlay: metadata change + unsaved flag
  const handleVideoGapChange = useCallback((gapMs: number) => {
    setSongInternal({ ...currentSongRef.current, videoGap: gapMs });
    markDirty();
  }, [setSongInternal, markDirty]);

  // Effective selection: multi-selection when present, else the primary note
  const effectiveSelection = useMemo(() => {
    if (selectedNoteIds.size > 0) return selectedNoteIds;
    return selectedNoteId ? new Set([selectedNoteId]) : new Set<string>();
  }, [selectedNoteIds, selectedNoteId]);

  // All lyrics syllables for tap-mode auto-assignment.
  // Prefer syllables from existing notes; fall back to rawLyrics text if no notes exist yet.
  const allLyricsSyllables = useMemo(() => {
    const noteLyrics = allNotes.map(n => n.lyric).filter(l => l && l !== '---');
    if (noteLyrics.length > 0) return noteLyrics;

    // No notes yet — parse rawLyrics if available (from new-song dialog)
    if (currentSong.rawLyrics) {
      const parsed = parseLyricsToSyllables(currentSong.rawLyrics);
      return parsed.lines.flatMap(line =>
        line.words.flatMap(word => word.syllables)
      );
    }

    return [];
  }, [allNotes, currentSong.rawLyrics]);

  // Ref for currentTime (needed by tap note placement hook to avoid stale closures)
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  // ── Central lyrics mutation + history helper ──
  const applyLyrics = useCallback((newLyrics: LyricLine[], mode: NoteHistoryMode = 'push') => {
    setSongInternal({ ...currentSongRef.current, lyrics: newLyrics });
    switch (mode) {
      case 'push':
        pushHistory(newLyrics);
        dirtyLiveRef.current = false;
        break;
      case 'replace':
        // Push overwriting the top entry (tap-mode: create + duration = one undo step)
        pushHistory(newLyrics, { replace: true });
        dirtyLiveRef.current = false;
        break;
      case 'live':
        markDirty();
        dirtyLiveRef.current = true;
        break;
      case 'commit':
        if (dirtyLiveRef.current) {
          pushHistory(newLyrics);
          dirtyLiveRef.current = false;
        }
        break;
    }
  }, [setSongInternal, pushHistory, markDirty]);

  /** Push the accumulated live changes as a single history entry. */
  const handleCommitHistory = useCallback(() => {
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    if (dirtyLiveRef.current) {
      pushHistory(currentSongRef.current.lyrics);
      dirtyLiveRef.current = false;
    }
  }, [pushHistory]);

  /** Debounced auto-commit (keyboard repeats: arrows / typing). */
  const scheduleCommit = useCallback(() => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      commitTimerRef.current = null;
      if (dirtyLiveRef.current) {
        pushHistory(currentSongRef.current.lyrics);
        dirtyLiveRef.current = false;
      }
    }, 700);
  }, [pushHistory]);

  const undo = useCallback(() => {
    const lyrics = historyUndo();
    if (lyrics) {
      setSongInternal({ ...currentSongRef.current, lyrics });
      dirtyLiveRef.current = false;
    }
  }, [historyUndo, setSongInternal]);

  const redo = useCallback(() => {
    const lyrics = historyRedo();
    if (lyrics) {
      setSongInternal({ ...currentSongRef.current, lyrics });
      dirtyLiveRef.current = false;
    }
  }, [historyRedo, setSongInternal]);

  // ── Move a note to a different line when its startTime clearly left the own line ──
  const reassignNoteLine = useCallback((lyrics: LyricLine[], noteId: string): LyricLine[] => {
    const srcLine = lyrics.find(l => l.notes.some(n => n.id === noteId));
    if (!srcLine) return lyrics;
    const note = srcLine.notes.find(n => n.id === noteId);
    if (!note) return lyrics;

    // Find a line whose time range strictly contains the note
    const targetLine = lyrics.find(l =>
      l.id !== srcLine.id &&
      note.startTime >= l.startTime &&
      note.startTime <= l.endTime
    );
    if (!targetLine) return lyrics; // stays in its own line

    const srcNotes = srcLine.notes.filter(n => n.id !== noteId);
    const updatedTarget = finalizeLine({ ...targetLine, notes: [...targetLine.notes, note] });

    return lyrics
      .map(l => {
        if (l.id === srcLine.id) {
          return srcNotes.length > 0 ? finalizeLine({ ...srcLine, notes: srcNotes }) : null;
        }
        if (l.id === targetLine.id) return updatedTarget;
        return l;
      })
      .filter((l): l is LyricLine => l !== null);
  }, []);

  const handleNoteUpdate = useCallback((noteId: string, updates: Partial<Note>, mode: NoteHistoryMode = 'push') => {
    const prev = currentSongRef.current;
    let touched = false;

    const newLyrics = prev.lyrics.map(line => {
      const idx = line.notes.findIndex(n => n.id === noteId);
      if (idx === -1) return line;
      touched = true;

      const merged: Note = { ...line.notes[idx], ...updates };
      // Keep frequency in sync with pitch
      if (updates.pitch !== undefined && updates.frequency === undefined) {
        merged.frequency = midiPitchToFrequency(updates.pitch);
      }

      let notes: Note[];
      if (updates.startTime !== undefined) {
        // Re-sort so the file export order stays correct after moving
        notes = [...line.notes];
        notes.splice(idx, 1, merged);
        notes.sort((a, b) => a.startTime - b.startTime);
      } else {
        notes = line.notes.map(n => (n.id === noteId ? merged : n));
      }

      return finalizeLine({ ...line, notes });
    });
    if (!touched) return;

    const finalLyrics = updates.startTime !== undefined
      ? reassignNoteLine(newLyrics, noteId)
      : newLyrics;

    applyLyrics(finalLyrics, mode);
  }, [applyLyrics, reassignNoteLine]);

  const handleNoteDelete = useCallback((noteId: string) => {
    const prev = currentSongRef.current;
    const newLyrics = prev.lyrics
      .map(line => ({ ...line, notes: line.notes.filter(note => note.id !== noteId) }))
      .filter(line => line.notes.length > 0)
      .map(finalizeLine);
    applyLyrics(newLyrics, 'push');
    if (selectedNoteId === noteId) setSelectedNoteId(undefined);
    setSelectedNoteIds(prevIds => {
      if (!prevIds.has(noteId)) return prevIds;
      const next = new Set(prevIds);
      next.delete(noteId);
      return next;
    });
  }, [applyLyrics, selectedNoteId]);

  /** Delete ALL notes in the effective selection (single undo step). */
  const handleSelectionDelete = useCallback(() => {
    const ids = effectiveSelection;
    if (ids.size === 0) return;
    const prev = currentSongRef.current;
    const newLyrics = prev.lyrics
      .map(line => ({ ...line, notes: line.notes.filter(note => !ids.has(note.id)) }))
      .filter(line => line.notes.length > 0)
      .map(finalizeLine);
    applyLyrics(newLyrics, 'push');
    if (selectedNoteId && ids.has(selectedNoteId)) setSelectedNoteId(undefined);
    setSelectedNoteIds(new Set());
  }, [effectiveSelection, applyLyrics, selectedNoteId]);

  /** Insert a note into the lyrics structure. `groupLine` merges close tap notes into the previous line. */
  const insertNote = useCallback((lyrics: LyricLine[], newNote: Note, groupLine: boolean): LyricLine[] => {
    const startTime = newNote.startTime;
    const targetLine = lyrics.find(line => startTime >= line.startTime && startTime <= line.endTime);

    if (targetLine) {
      return lyrics.map(line =>
        line.id === targetLine.id
          ? finalizeLine({ ...line, notes: [...line.notes, newNote] })
          : line
      );
    }

    if (groupLine) {
      // Line grouping: append to the last line when the gap is small (tap flow)
      const lastLine = lyrics[lyrics.length - 1];
      if (lastLine) {
        const lastNote = lastLine.notes[lastLine.notes.length - 1];
        const lastEnd = lastNote ? lastNote.startTime + lastNote.duration : lastLine.endTime;
        const gap = startTime - lastEnd;
        if (gap >= 0 && gap <= TAP_LINE_GAP_MS) {
          const updated = finalizeLine({ ...lastLine, notes: [...lastLine.notes, newNote] });
          return [...lyrics.slice(0, -1), updated];
        }
      }
    }

    const newLine: LyricLine = { id: uuidv4(), text: newNote.lyric, startTime, endTime: startTime + 2000, notes: [newNote] };
    return [...lyrics, newLine].sort((a, b) => a.startTime - b.startTime);
  }, []);

  const handleNoteAdd = useCallback((startTime: number, pitch: number) => {
    const newNote: Note = {
      id: uuidv4(), pitch,
      frequency: midiPitchToFrequency(pitch),
      startTime, duration: 500, lyric: '---',
      isBonus: false, isGolden: false
    };
    const newLyrics = insertNote(currentSongRef.current.lyrics, newNote, false);
    applyLyrics(newLyrics, 'push');
    setSelectedNoteId(newNote.id);
  }, [applyLyrics, insertNote]);

  const handleLyricChange = useCallback((noteId: string, newLyric: string, mode: NoteHistoryMode = 'push') => {
    const prev = currentSongRef.current;
    const newLyrics = prev.lyrics.map(line => {
      if (!line.notes.some(n => n.id === noteId)) return line;
      return finalizeLine({ ...line, notes: line.notes.map(n => (n.id === noteId ? { ...n, lyric: newLyric } : n)) });
    });
    applyLyrics(newLyrics, mode);
  }, [applyLyrics]);

  // ── Save flow (file-first) ──
  // The txt file is written BEFORE updating the library / closing the editor.
  // If the write fails the user stays in the editor with a visible error —
  // previously the editor closed and the library diverged from the file.
  const showSaveResult = useCallback((result: SaveResult) => {
    setSaveResult(result);
    if (saveResultTimerRef.current) clearTimeout(saveResultTimerRef.current);
    saveResultTimerRef.current = setTimeout(() => setSaveResult(null), 5000);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveResult(null);
    try {
      const songToSave = currentSongRef.current;
      const result = await saveSongToTxt(songToSave);
      if (result.success) {
        markSaved();
        // Persist to the in-memory library, then close via the parent
        const { updateSong } = await import('@/lib/game/song-library');
        updateSong(songToSave.id, songToSave);
        onSave(songToSave);
      } else {
        // Stay open — the file could not be written
        showSaveResult(result);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Save error:', error);
      showSaveResult({
        success: false,
        message: `${t('editor.saveError')}: ${error instanceof Error ? error.message : t('editor.unknownError')}`,
      });
    } finally {
      setIsSaving(false);
    }
  }, [onSave, markSaved, showSaveResult, t]);

  // Save only — persist to file but stay in the editor
  const handleSaveOnly = useCallback(async () => {
    setIsSaving(true);
    setSaveResult(null);
    try {
      const songToSave = currentSongRef.current;
      const result = await saveSongToTxt(songToSave);
      if (result.success) {
        markSaved();
        const { updateSong } = await import('@/lib/game/song-library');
        updateSong(songToSave.id, songToSave);
      }
      showSaveResult(result);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Save error:', error);
      showSaveResult({
        success: false,
        message: `${t('editor.saveError')}: ${error instanceof Error ? error.message : t('editor.unknownError')}`,
      });
    } finally {
      setIsSaving(false);
    }
  }, [markSaved, showSaveResult, t]);

  // --- Tap Note Placement (Ultrastar-style) ---
  // Create note on space-down, set duration on space-up
  const tapNoteCreate = useCallback((startTime: number, pitch: number, lyric: string): string => {
    const noteId = uuidv4();
    const newNote: Note = {
      id: noteId, pitch,
      frequency: midiPitchToFrequency(pitch),
      startTime, duration: 200, lyric,
      isBonus: false, isGolden: false,
    };
    const newLyrics = insertNote(currentSongRef.current.lyrics, newNote, true);
    applyLyrics(newLyrics, 'push');
    setSelectedNoteId(noteId);
    return noteId;
  }, [applyLyrics, insertNote]);

  const tapNoteRelease = useCallback((noteId: string, releaseTime: number) => {
    const prev = currentSongRef.current;
    const newLyrics = prev.lyrics.map(line => ({
      ...line,
      notes: line.notes.map(note => {
        if (note.id === noteId) {
          const duration = Math.max(100, releaseTime - note.startTime);
          return { ...note, duration };
        }
        return note;
      }),
    })).map(finalizeLine);
    // 'replace' merges the duration fix into the history entry of the tap-create
    // → one undo step per tapped note instead of two.
    applyLyrics(newLyrics, 'replace');
  }, [applyLyrics]);

  const tapPlacement = useTapNotePlacement({
    currentTimeRef,
    defaultPitch: 60, // C4
    onNoteCreate: tapNoteCreate,
    onNoteRelease: tapNoteRelease,
    lyrics: allLyricsSyllables,
  });

  // Keyboard shortcuts are wired further below (after all handlers exist)

  const handleNoteSelect = useCallback((noteId: string | undefined) => {
    setSelectedNoteId(noteId);
    setSelectedNoteIds(noteId ? new Set([noteId]) : new Set());
  }, []);

  /** Ctrl+Click: toggle a note in the multi-selection (YASS-style). */
  const handleNoteCtrlToggle = useCallback((noteId: string) => {
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
    setSelectedNoteId(noteId); // clicked note becomes the primary selection
  }, []);

  const updateSelectedNote = useCallback((updates: Partial<Note>, mode: NoteHistoryMode = 'push') => {
    if (selectedNoteId) handleNoteUpdate(selectedNoteId, updates, mode);
  }, [selectedNoteId, handleNoteUpdate]);

  // ── YASS-style editing operations ──

  /** Apply an update to ALL selected notes in one history step (type/player). */
  const updateMultiSelected = useCallback((updates: Partial<Note>) => {
    const ids = effectiveSelection;
    if (ids.size === 0) return;
    const prev = currentSongRef.current;
    let touched = false;
    const newLyrics = prev.lyrics.map(line => {
      const has = line.notes.some(n => ids.has(n.id));
      if (!has) return line;
      touched = true;
      return finalizeLine({
        ...line,
        notes: line.notes.map(n => {
          if (!ids.has(n.id)) return n;
          const merged = { ...n, ...updates };
          if (updates.pitch !== undefined && updates.frequency === undefined) {
            merged.frequency = midiPitchToFrequency(updates.pitch);
          }
          return merged;
        }),
      });
    });
    if (touched) applyLyrics(newLyrics, 'push');
  }, [effectiveSelection, applyLyrics]);

  /** Transpose all selected notes (↑/↓, Shift = octave). Coalesced undo per burst. */
  const handleTranspose = useCallback((delta: number) => {
    const ids = effectiveSelection;
    if (ids.size === 0) return;
    const prev = currentSongRef.current;
    let touched = false;
    const newLyrics = prev.lyrics.map(line => {
      const has = line.notes.some(n => ids.has(n.id));
      if (!has) return line;
      touched = true;
      return {
        ...line,
        notes: line.notes.map(n => {
          if (!ids.has(n.id)) return n;
          const pitch = Math.max(0, Math.min(127, n.pitch + delta));
          return { ...n, pitch, frequency: midiPitchToFrequency(pitch) };
        }),
      };
    });
    if (touched) {
      applyLyrics(newLyrics, 'live');
      scheduleCommit();
    }
  }, [effectiveSelection, applyLyrics, scheduleCommit]);

  /** Nudge all selected notes' start time (←/→, Shift = coarse). Coalesced undo per burst.
   *  Snaps to the beat grid when the magnet is enabled. */
  const handleNudge = useCallback((delta: number) => {
    const ids = effectiveSelection;
    if (ids.size === 0) return;
    const prev = currentSongRef.current;
    let touched = false;
    const newLyrics = prev.lyrics.map(line => {
      const has = line.notes.some(n => ids.has(n.id));
      if (!has) return line;
      touched = true;
      return finalizeLine({
        ...line,
        notes: line.notes.map(n => ids.has(n.id)
          ? { ...n, startTime: Math.max(0, Math.round(snapTimeToBeat(n.startTime + delta, prev.bpm, prev.gap, snapEnabled))) }
          : n
        ),
      });
    });
    if (touched) {
      applyLyrics(newLyrics, 'live');
      scheduleCommit();
    }
  }, [effectiveSelection, applyLyrics, scheduleCommit, snapEnabled]);

  /** Merge the selected note with the NEXT note in the same line (M). */
  const handleMergeNote = useCallback(() => {
    if (!selectedNote) return;
    const prev = currentSongRef.current;

    for (const line of prev.lyrics) {
      const idx = line.notes.findIndex(n => n.id === selectedNote.id);
      if (idx === -1) continue;
      if (idx === line.notes.length - 1) return; // no next note in this line

      const a = line.notes[idx];
      const b = line.notes[idx + 1];

      // UltraStar syllable join: 'Hel-' + 'lo' → 'Hello' (no space, trailing '-' stripped)
      const lyric = a.lyric.endsWith('-')
        ? a.lyric.slice(0, -1) + b.lyric
        : a.lyric + ' ' + b.lyric;

      const start = Math.min(a.startTime, b.startTime);
      const end = Math.max(a.startTime + a.duration, b.startTime + b.duration);
      const merged: Note = { ...a, startTime: start, duration: end - start, lyric };

      const newNotes = [...line.notes];
      newNotes.splice(idx, 2, merged);
      const newLyrics = prev.lyrics.map(l =>
        l.id === line.id ? finalizeLine({ ...l, notes: newNotes }) : l
      );
      applyLyrics(newLyrics, 'push');
      setSelectedNoteId(merged.id);
      setSelectedNoteIds(new Set([merged.id]));
      return;
    }
  }, [selectedNote, applyLyrics]);

  /** Paste a full note (Ctrl+V) at the playhead — keeps lyric/duration/type/player.
   *  Start snaps to the beat grid when the magnet is enabled. */
  const handlePasteNote = useCallback((data: Partial<Note>) => {
    const rawStart = Math.max(0, Math.round(currentTimeRef.current));
    const start = Math.round(snapTimeToBeat(rawStart, currentSongRef.current.bpm, currentSongRef.current.gap, snapEnabled));
    const pitch = typeof data.pitch === 'number' ? Math.max(0, Math.min(127, data.pitch)) : 60;
    const newNote: Note = {
      id: uuidv4(),
      pitch,
      frequency: midiPitchToFrequency(pitch),
      startTime: start,
      duration: typeof data.duration === 'number' && data.duration > 0 ? data.duration : 500,
      lyric: data.lyric || '---',
      isBonus: Boolean(data.isBonus),
      isGolden: Boolean(data.isGolden),
      player: data.player,
    };
    const newLyrics = insertNote(currentSongRef.current.lyrics, newNote, false);
    applyLyrics(newLyrics, 'push');
    setSelectedNoteId(newNote.id);
    setSelectedNoteIds(new Set([newNote.id]));
  }, [applyLyrics, insertNote, snapEnabled]);

  // Keyboard shortcuts (Space disabled in tap mode; Ctrl+S saves without closing)
  useEditorKeyboardShortcuts({
    selectedNoteId, selectedNote, currentTime,
    handlePlayPause, handleNoteDelete: handleSelectionDelete, handleSave: handleSaveOnly,
    undo, redo, handlePasteNote, handleMergeNote, handleTranspose, handleNudge,
    setSelectedNoteId: handleNoteSelect,
    tapModeActive: tapPlacement.isActive,
  });

  // ── Cancel confirmation (guard against losing unsaved changes) ──
  const requestCancel = useCallback(() => {
    if (hasUnsavedChanges) setShowCancelConfirm(true);
    else onCancel();
  }, [hasUnsavedChanges, onCancel]);

  // beforeunload guard while there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const duplicateNote = useCallback(() => {
    if (selectedNote) handleNoteAdd(selectedNote.startTime + selectedNote.duration + 100, selectedNote.pitch);
  }, [selectedNote, handleNoteAdd]);

  const handleNoteSplit = useCallback(() => {
    if (!selectedNote) return;

    // Split at playhead if it falls within the note, otherwise at midpoint
    const noteEnd = selectedNote.startTime + selectedNote.duration;
    const splitPoint = (currentTime >= selectedNote.startTime && currentTime <= noteEnd)
      ? currentTime
      : selectedNote.startTime + selectedNote.duration / 2;

    const firstDuration = splitPoint - selectedNote.startTime;
    const secondDuration = noteEnd - splitPoint;

    // Don't split if either half would be too short (< 50ms)
    if (firstDuration < 50 || secondDuration < 50) return;

    const secondNote: Note = {
      id: uuidv4(),
      pitch: selectedNote.pitch,
      frequency: selectedNote.frequency,
      startTime: Math.round(splitPoint),
      duration: Math.round(secondDuration),
      lyric: selectedNote.lyric,
      isBonus: selectedNote.isBonus,
      isGolden: selectedNote.isGolden,
      player: selectedNote.player,
    };

    const prev = currentSongRef.current;
    const newLyrics = prev.lyrics.map(line => {
      const noteIndex = line.notes.findIndex(n => n.id === selectedNote.id);
      if (noteIndex === -1) return line;
      const newNotes = [...line.notes];
      newNotes.splice(noteIndex, 1,
        { ...selectedNote, duration: Math.round(firstDuration) },
        secondNote
      );
      return finalizeLine({ ...line, notes: newNotes });
    });
    applyLyrics(newLyrics, 'push');
    setSelectedNoteId(secondNote.id);
  }, [selectedNote, currentTime, applyLyrics]);

  // --- Audio Analysis: Apply detected notes ---
  // Only updates pitch/frequency of existing notes that match detected notes.
  // Song text, timing, and note durations are NEVER changed.
  const handleApplyDetectedNotes = useCallback((detectedNotes: DetectedNote[]) => {
    const prev = currentSongRef.current;
    const existingNotes = prev.lyrics.flatMap(line => line.notes);

    // Build a map: existingNote.id → best matching detected note (by time overlap)
    const pitchMap = new Map<string, { pitch: number; frequency: number; confidence: number }>();

    for (const en of existingNotes) {
      let bestOverlap = 0;
      let bestDetected: DetectedNote | null = null;
      const enEnd = en.startTime + en.duration;

      for (const dn of detectedNotes) {
        const dnEnd = dn.start_time_ms + dn.duration_ms;
        const overlap = Math.max(0, Math.min(enEnd, dnEnd) - Math.max(en.startTime, dn.start_time_ms));
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestDetected = dn;
        }
      }

      // Only update if overlap is significant (at least 20% of the existing note)
      if (bestDetected && bestOverlap > en.duration * 0.2) {
        pitchMap.set(en.id, {
          pitch: bestDetected.midi_note,
          frequency: bestDetected.frequency,
          confidence: bestDetected.confidence,
        });
      }
    }

    if (pitchMap.size === 0) return; // Nothing to update

    // Update only pitch/frequency on matching existing notes — preserve everything else
    const newLyrics = prev.lyrics.map(line => ({
      ...line,
      notes: line.notes.map(note => {
        const update = pitchMap.get(note.id);
        if (!update) return note;
        return {
          ...note,
          pitch: update.pitch,
          frequency: update.frequency,
          analysisConfidence: update.confidence,
          isGolden: update.confidence >= 0.8 ? true : note.isGolden,
        };
      }),
    }));

    applyLyrics(newLyrics, 'push');
  }, [applyLyrics]);

  // --- Audio Analysis: Apply detected BPM ---
  const handleApplyBpm = useCallback((bpm: number) => {
    setSongInternal({ ...currentSongRef.current, bpm: Math.round(bpm) });
    markDirty();
  }, [setSongInternal, markDirty]);

  // Determine the audio file path for analysis — resolve relative paths to absolute.
  // Falls back to the video file path so that video-embedded audio can be analyzed.
  const analysisAudioPath = useMemo(() => {
    // Helper to check if a path looks like an absolute filesystem path.
    const isAbsolute = (p: string) =>
      p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p) || p.startsWith('\\\\');

    // Step 1: Use relativeAudioPath + baseFolder if available.
    // This is the primary path for Tauri — constructs an absolute path.
    if (currentSong.relativeAudioPath && currentSong.baseFolder) {
      const normalizedBase = normalizeFilePath(currentSong.baseFolder);
      const normalizedRelative = normalizeFilePath(currentSong.relativeAudioPath);

      // FIX: If relativeAudioPath is already an absolute path, don't prepend baseFolder
      // (this prevents "D:/Songs/D:/Songs/Artist/song.mp3" doubling).
      if (isAbsolute(normalizedRelative)) {
        return normalizedRelative;
      }
      return `${normalizedBase}/${normalizedRelative}`;
    }

    // Step 2: Use audioUrl only if it's a filesystem path (not blob/http).
    // Blob URLs and http URLs can't be read by the Rust backend.
    if (currentSong.audioUrl && isAbsolute(currentSong.audioUrl) && !currentSong.audioUrl.startsWith('blob:')) {
      return currentSong.audioUrl;
    }

    // Step 3: Fallback to video file path (audio may be embedded in the video).
    // CRITICAL: Check relativeVideoPath FIRST (it's a usable filesystem path),
    // then videoBackground only if it's an absolute filesystem path (not blob/http).
    // A blob videoBackground from playback would shadow a valid relativeVideoPath.
    const videoRelative = currentSong.relativeVideoPath;
    const isVideoAbsolute = currentSong.videoBackground &&
      isAbsolute(currentSong.videoBackground) &&
      !currentSong.videoBackground.startsWith('blob:') &&
      !currentSong.videoBackground.startsWith('http');
    const videoPath = videoRelative || (isVideoAbsolute ? currentSong.videoBackground : undefined);
    if (videoPath && !currentSong.youtubeUrl) {
      const normalizedPath = normalizeFilePath(videoPath);
      if (isAbsolute(normalizedPath)) {
        return normalizedPath;
      }
      if (currentSong.baseFolder) {
        const normalizedBase = normalizeFilePath(currentSong.baseFolder);
        return `${normalizedBase}/${normalizedPath}`;
      }
    }

    return null;
  }, [currentSong.audioUrl, currentSong.relativeAudioPath, currentSong.baseFolder, currentSong.videoBackground, currentSong.relativeVideoPath, currentSong.youtubeUrl]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white">
      <EditorHeader
        title={currentSong.title}
        artist={currentSong.artist}
        saveResult={saveResult}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onCancel={requestCancel}
        onSave={handleSave}
        onSaveOnly={handleSaveOnly}
        showMetadataPanel={showMetadataPanel}
        onToggleMetadataPanel={onToggleMetadataPanel}
        hasVideo={hasVideo}
        showVideoOverlay={showVideoOverlay}
        onToggleVideoOverlay={() => setShowVideoOverlay(prev => !prev)}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <ToolsPanel
          selectedNote={selectedNote}
          selectedCount={effectiveSelection.size}
          currentTime={currentTime}
          onAddNote={handleNoteAdd}
          onDuplicateNote={duplicateNote}
          onDeleteNote={handleSelectionDelete}
          onSplitNote={handleNoteSplit}
          onMergeNote={handleMergeNote}
          onUpdateSelectedNote={updateSelectedNote}
          onUpdateSelection={updateMultiSelected}
          tapMode={tapPlacement}
        />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Sidebar toggle button */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-600 transition-colors"
            title={showSidebar ? t('editor.header.hidePanel') : t('editor.header.showPanel')}
          >
            {showSidebar
              ? <PanelRightClose className="w-4 h-4 text-slate-400" />
              : <PanelRightOpen className="w-4 h-4 text-slate-400" />
            }
          </button>
          <Timeline
            song={currentSong}
            currentTime={currentTime}
            isPlaying={isPlaying}
            selectedNoteId={selectedNoteId}
            selectedNoteIds={selectedNoteIds}
            snapEnabled={snapEnabled}
            onToggleSnap={() => setSnapEnabled(prev => !prev)}
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
            onTimeChange={handleTimeChange}
            onPlayPause={handlePlayPause}
            onNoteSelect={handleNoteSelect}
            onNoteCtrlToggle={handleNoteCtrlToggle}
            onNoteUpdate={handleNoteUpdate}
            onCommitHistory={handleCommitHistory}
            onNoteAdd={handleNoteAdd}
            onLyricChange={handleLyricChange}
          />
        </main>

        {showSidebar && (
          <aside className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col overflow-hidden flex-shrink-0">
            <Tabs defaultValue="note" className="flex flex-col h-full">
              <TabsList className="grid w-full grid-cols-6 bg-slate-800 border-b border-slate-700 rounded-none h-10">
                <TabsTrigger value="note" className="text-[10px] data-[state=active]:bg-slate-700 px-1">
                  <Music className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger value="info" className="text-[10px] data-[state=active]:bg-slate-700 px-1">
                  <FileText className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger value="lyrics" className="text-[10px] data-[state=active]:bg-slate-700 px-1">
                  <BookOpen className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger value="analysis" className="text-[10px] data-[state=active]:bg-slate-700 px-1">
                  <Waves className="w-3 h-3" />
                </TabsTrigger>
                <TabsTrigger value="ai" className="text-[10px] data-[state=active]:bg-slate-700 px-1">
                  <Sparkles className="w-3 h-3" /> KI
                </TabsTrigger>
                <TabsTrigger value="metadata" className="text-[10px] data-[state=active]:bg-slate-700 px-1">
                  <Settings className="w-3 h-3" />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="note" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
                {selectedNote
                  ? <EditorNoteTab
                      selectedNote={selectedNote}
                      onUpdateSelectedNote={updateSelectedNote}
                      onCommitHistory={handleCommitHistory}
                      onScheduleCommit={scheduleCommit}
                    />
                  : <EditorNoteTabPlaceholder />
                }
              </TabsContent>

              <TabsContent value="info" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
                <EditorSongInfoTab
                  song={currentSong}
                  allNotesCount={allNotes.length}
                  onSongChange={setSongInternal}
                  onSetUnsavedChanges={() => markDirty()}
                />
              </TabsContent>

              <TabsContent value="lyrics" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
                <EditorLyricsTab
                  song={currentSong}
                  currentTime={currentTime}
                  selectedNoteId={selectedNoteId}
                  onNoteSelect={handleNoteSelect}
                  onTimeChange={handleTimeChange}
                />
              </TabsContent>

              <TabsContent value="analysis" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
                <ScrollArea className="h-full">
                  <AudioAnalysisPanel
                    audioFilePath={analysisAudioPath}
                    onApplyNotes={handleApplyDetectedNotes}
                    onApplyBpm={handleApplyBpm}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="ai" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
                <ScrollArea className="h-full">
                  <AIAssistantPanel
                    song={currentSong}
                    onSongUpdate={(updates) => {
                      setSongInternal({ ...currentSongRef.current, ...updates });
                      markDirty();
                    }}
                    onLyricsUpdate={(lyrics) => {
                      applyLyrics(lyrics, 'push');
                    }}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="metadata" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden">
                <EditorMetadataTab
                  song={currentSong}
                  onSongChange={setSongInternal}
                  onSetUnsavedChanges={() => markDirty()}
                />
              </TabsContent>
            </Tabs>
          </aside>
        )}
      </div>

      {currentSong.audioUrl && (
        <audio ref={audioRef} src={currentSong.audioUrl} onEnded={() => setIsPlaying(false)} />
      )}
      {/* Fallback: play audio from video file when no separate audio exists */}
      {!currentSong.audioUrl && currentSong.videoBackground && !currentSong.videoBackground.startsWith('http') && (
        <audio ref={audioRef} src={currentSong.videoBackground} onEnded={() => setIsPlaying(false)} />
      )}

      {/* Video sync overlay — video + notes side by side with timecode control */}
      {showVideoOverlay && hasVideo && (
        <VideoSyncOverlay
          song={currentSong}
          currentTime={currentTime}
          isPlaying={isPlaying}
          playbackRate={playbackRate}
          onTimeChange={handleTimeChange}
          onVideoGapChange={handleVideoGapChange}
          onClose={() => setShowVideoOverlay(false)}
        />
      )}

      {/* Cancel confirmation — guard against losing unsaved changes */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/20 rounded-xl p-5 max-w-md w-full mx-4 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">{t('editor.header.cancelConfirmTitle')}</h3>
                <p className="text-white/60 text-xs mt-0.5">{t('editor.header.cancelConfirmDesc')}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 border-white/20 text-white/80 hover:bg-white/10"
                data-testid="editor-cancel-keep-button"
              >
                {t('editor.header.cancelConfirmKeep')}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowCancelConfirm(false); onCancel(); }}
                className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10"
                data-testid="editor-cancel-discard-button"
              >
                {t('editor.header.cancelConfirmDiscard')}
              </Button>
              <Button
                onClick={() => { setShowCancelConfirm(false); handleSave(); }}
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700"
                data-testid="editor-cancel-save-button"
              >
                {t('editor.header.cancelConfirmSave')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KaraokeEditor;
