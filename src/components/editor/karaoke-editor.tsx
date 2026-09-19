'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Song, Note, LyricLine } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from '@/lib/i18n/translations';
import { saveSongToTxt, type SaveResult } from '@/lib/editor/save-to-file';
import { Timeline, type NoteHistoryMode } from './timeline/timeline';
import { Button } from '@/components/ui/button';
import { BookOpen, X } from 'lucide-react';
import { normalizeFilePath } from '@/lib/tauri-file-storage';
import { midiPitchToFrequency } from '@/lib/utils';
import { parseLyricsToSyllables } from '@/lib/editor/syllable-separator';
import { snapTimeToBeat } from '@/lib/editor/beat-utils';
import { useEditorHistory } from '@/hooks/use-editor-history';
import { useEditorPlayback } from '@/hooks/use-editor-playback';
import { useEditorKeyboardShortcuts } from '@/hooks/use-editor-keyboard-shortcuts';
import { useTapNotePlacement } from '@/hooks/use-tap-note-placement';
import { EditorHeader, type EditorHeaderPanel } from './editor-header';
import { EditorSubHeader } from './editor-sub-header';
import { ShortcutsPanel } from './shortcuts-panel';
import { VideoSyncOverlay } from './video-sync-overlay';
import {
  MidiImportDialog,
  pickMidiFileArrayBuffer,
  midiTrackToComparisonNotes,
  type MidiImportResult,
  type ComparisonNote,
} from './midi-import-dialog';
// Sheet music (Notenblatt) recognition via VLM (5) — same import contract
import { SheetMusicDialog } from './sheet-music-dialog';
import { parseMIDIKaraoke } from '@/lib/parsers/multi-format-import';
import { isMidiSongMusic } from '@/lib/audio/midi-synth';
import { MidiAudioSource } from '@/components/game/midi-audio-source';
import { toast } from '@/hooks/use-toast';
import { EditorSongInfoTab } from './editor-song-info-tab';
import { EditorMetadataTab } from './editor-metadata-tab';
import { EditorLyricsTab } from './editor-lyrics-tab';
import { AudioAnalysisPanel } from './audio-analysis-panel';
import { AIAssistantPanel } from './panels/ai-assistant-panel';
import type { DetectedNote } from '@/hooks/use-audio-analysis';
import { noteTypeFlags, type NoteType, type DuetPlayer } from '@/types/game';

interface KaraokeEditorProps {
  song: Song;
  onSave: (_song: Song) => void;
  onCancel: () => void;
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

/**
 * Group flat notes (time order) into lyric lines using insertNote's
 * TAP_LINE_GAP_MS rule (gap ≤ 1400 ms keeps the line; chords/overlapping
 * notes stay together). Used by the MIDI/KAR note import (3.2).
 */
function groupNotesIntoLines(notes: Note[]): LyricLine[] {
  const sorted = [...notes].sort((a, b) => a.startTime - b.startTime);
  const lines: LyricLine[] = [];
  let current: Note[] = [];
  let lastEnd = Number.NEGATIVE_INFINITY;

  const flush = () => {
    if (current.length === 0) return;
    lines.push(finalizeLine({
      id: uuidv4(),
      text: '',
      startTime: current[0].startTime,
      endTime: current[current.length - 1].startTime + current[current.length - 1].duration,
      notes: current,
    }));
    current = [];
  };

  for (const note of sorted) {
    if (current.length > 0 && note.startTime - lastEnd > TAP_LINE_GAP_MS) {
      flush();
    }
    current.push(note);
    lastEnd = Math.max(lastEnd, note.startTime + note.duration);
  }
  flush();

  return lines;
}

export function KaraokeEditor({ song: initialSong, onSave, onCancel }: KaraokeEditorProps) {
  const { t } = useTranslation();
  const [currentSong, setCurrentSong] = useState<Song>(initialSong);
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>();
  // Multi-selection (YASS-style Ctrl+Click); primary selection is always included
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  // R7 2.2: note type used for NEW notes (default Normal). Selecting a type in
  // the sub-header ALSO re-types the current selection (dual-purpose control).
  const [activeNoteType, setActiveNoteType] = useState<NoteType>('normal');
  const activeNoteTypeRef = useRef<NoteType>('normal');
  useEffect(() => { activeNoteTypeRef.current = activeNoteType; }, [activeNoteType]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  // Header dropdown panel (metadata / audio analysis / AI assistant)
  const [activePanel, setActivePanel] = useState<EditorHeaderPanel>('none');
  // ── First-mount boot overlay ──
  // The editor's first render (Timeline with hundreds of notes, waveform
  // decode, …) blocks the main thread for a while — a frozen blank screen.
  // Two-stage mount: paint the loading overlay FIRST, mount the heavy tree in
  // the next frame behind it, then reveal after it has painted.
  const [heavyMounted, setHeavyMounted] = useState(false);
  const [bootOverlayVisible, setBootOverlayVisible] = useState(true);
  // Cancel confirmation (unsaved changes guard)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // Beat snapping (YASS-style magnet)
  const [snapEnabled, setSnapEnabled] = useState(false);
  // Video sync overlay (video + notes side by side, with timecode control)
  const [showVideoOverlay, setShowVideoOverlay] = useState(false);
  // ── MIDI/KAR import (3.2) + comparison overlay (3.5) ──
  const [showMidiImport, setShowMidiImport] = useState(false);
  // ── Sheet music (Notenblatt) recognition via VLM (5) ──
  const [showSheetMusicImport, setShowSheetMusicImport] = useState(false);
  // Pure editor state — NEVER serialized, never in the undo history.
  const [comparisonNotes, setComparisonNotes] = useState<ComparisonNote[] | null>(null);
  const [comparisonVisible, setComparisonVisible] = useState(true);

  useEffect(() => {
    // Mount the heavy editor tree one frame after the overlay painted.
    const r1 = requestAnimationFrame(() => setHeavyMounted(true));
    return () => cancelAnimationFrame(r1);
  }, []);

  useEffect(() => {
    if (!heavyMounted) return;
    // Heavy tree committed — give it two frames to paint, then reveal.
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setBootOverlayVisible(false));
    });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [heavyMounted]);

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

  const {
    isPlaying, currentTime, audioRef,
    handlePlayPause, handleTimeChange, setIsPlaying,
    playbackRate, setPlaybackRate,
  } = useEditorPlayback(currentSong.duration, currentSong.audioUrl);

  const allNotes = useMemo(() => currentSong.lyrics.flatMap(line => line.notes), [currentSong.lyrics]);
  const selectedNote = useMemo(() => allNotes.find(n => n.id === selectedNoteId), [allNotes, selectedNoteId]);

  // MIDI/KAR as the song's music file: preview playback runs through the
  // Web Audio synth adapter instead of an <audio> element.
  const midiMusicActive = useMemo(
    () => isMidiSongMusic(currentSong, currentSong.audioUrl),
    [currentSong],
  );

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

  /** R7 2.2: creates a note with the ACTIVE note type (sub-header segmented
   *  control). The type flags map 1:1 to the UltraStar TXT characters. */
  const handleNoteAdd = useCallback((startTime: number, pitch: number) => {
    const type = activeNoteTypeRef.current;
    const newNote: Note = {
      id: uuidv4(), pitch,
      frequency: midiPitchToFrequency(pitch),
      startTime, duration: 500, lyric: '---',
      ...noteTypeFlags(type),
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

  // ── Double-click on a lyrics word → jump the timeline to the note ──
  // The command pattern ({noteId, nonce}) flows into the Timeline, which owns
  // the scroll/pitch-center state; the nonce makes repeated jumps to the same
  // note retrigger. Selection happens here (also covers the first click).
  const [noteJumpCommand, setNoteJumpCommand] = useState<{ noteId: string; nonce: number } | null>(null);
  const handleNoteJump = useCallback((note: Note) => {
    setSelectedNoteId(note.id);
    setSelectedNoteIds(new Set([note.id]));
    setNoteJumpCommand({ noteId: note.id, nonce: Date.now() });
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

  /** R7 2.2: sub-header type click — sets the add-default AND, when notes are
   *  selected, changes the selected notes' type in one history step. */
  const handleSelectNoteType = useCallback((type: NoteType) => {
    setActiveNoteType(type);
    if (effectiveSelection.size > 0) {
      updateMultiSelected(noteTypeFlags(type));
    }
  }, [effectiveSelection, updateMultiSelected]);

  /** Sub-header Add button — new note at the playhead with the active type. */
  const handleAddFromToolbar = useCallback(() => {
    handleNoteAdd(Math.round(currentTimeRef.current), selectedNote?.pitch ?? 60);
  }, [handleNoteAdd, selectedNote]);

  /** Sub-header voice dropdown — assign P1/P2/P4/P8 to the selection. */
  const handlePlayerChange = useCallback((player: DuetPlayer | undefined) => {
    updateMultiSelected({ player });
  }, [updateMultiSelected]);

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

  /** Transpose ALL notes in the song (ToolsPanel "Alle Noten"). ONE undo step. */
  const handleTransposeAll = useCallback((delta: number) => {
    const prev = currentSongRef.current;
    if (prev.lyrics.every(line => line.notes.length === 0)) return;
    const newLyrics = prev.lyrics.map(line => ({
      ...line,
      notes: line.notes.map(n => {
        const pitch = Math.max(0, Math.min(127, n.pitch + delta));
        return { ...n, pitch, frequency: midiPitchToFrequency(pitch) };
      }),
    }));
    applyLyrics(newLyrics, 'push');
  }, [applyLyrics]);

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
      const lyric = (a.lyric ?? '').endsWith('-')
        ? (a.lyric ?? '').slice(0, -1) + (b.lyric ?? '')
        : (a.lyric ?? '') + ' ' + (b.lyric ?? '');

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

  /** Duplicate keeps the source note's type (not the active toolbar type). */
  const duplicateNote = useCallback(() => {
    if (selectedNote) {
      const prev = currentSongRef.current;
      const newNote: Note = {
        id: uuidv4(),
        pitch: selectedNote.pitch,
        frequency: selectedNote.frequency,
        startTime: selectedNote.startTime + selectedNote.duration + 100,
        duration: selectedNote.duration,
        lyric: selectedNote.lyric,
        isBonus: selectedNote.isBonus,
        isFreestyle: selectedNote.isFreestyle,
        isGolden: selectedNote.isGolden,
        isRap: selectedNote.isRap,
        player: selectedNote.player,
      };
      const newLyrics = insertNote(prev.lyrics, newNote, false);
      applyLyrics(newLyrics, 'push');
      setSelectedNoteId(newNote.id);
      setSelectedNoteIds(new Set([newNote.id]));
    }
  }, [selectedNote, applyLyrics, insertNote]);

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

  // ── MIDI/KAR note import (3.2) ──
  // The dialog delivers FINAL Note[] (ms times beat-snapped to the MIDI BPM,
  // syllables already assigned, '~' placeholders). Here: group into lyric
  // lines (insertNote's TAP_LINE_GAP_MS rule) and apply — existing notes are
  // replaced (the dialog already confirmed that with the user). BPM/GAP are
  // set from the MIDI tempo map (same pattern as handleApplyBpm). The song's
  // audio stays untouched — the MIDI is ONLY the pitch/timing basis.
  const handleMidiImport = useCallback((result: MidiImportResult) => {
    const lines = groupNotesIntoLines(result.notes);
    // ONE undo step ('push', not 'replace') — the pre-import notes stay
    // restorable via Ctrl+Z even though they were fully replaced.
    applyLyrics(lines, 'push');
    setSongInternal({
      ...currentSongRef.current,
      bpm: Math.max(1, Math.round(result.bpm)),
      gap: result.gap,
    });
    markDirty();
    setShowMidiImport(false);
    // The old selection died with the old notes
    setSelectedNoteId(undefined);
    setSelectedNoteIds(new Set());
    // Jump to the first imported note so the result is immediately visible
    // (scrolls + pitch-centers the timeline on it)
    const firstNote = result.notes[0];
    if (firstNote) handleNoteJump(firstNote);
  }, [applyLyrics, setSongInternal, markDirty, handleNoteJump]);

  // ── Sheet music (Notenblatt) recognition (5) ──
  // The dialog delivers the SAME MidiImportResult shape (pitch + timing
  // basis, '~' placeholders, bpm from the detected tempo, gap 0) — so it
  // reuses the exact MIDI import code path above; only the dialog differs.
  const handleSheetMusicImport = useCallback((result: MidiImportResult) => {
    handleMidiImport(result);
    setShowSheetMusicImport(false);
  }, [handleMidiImport]);

  // ── MIDI/KAR comparison overlay (3.5) ──
  // First click: file picker → parse → auto-pick melody track → beats on the
  // CURRENT song grid (the song is NOT changed). Further clicks toggle the
  // visibility; the ✕ in the timeline legend chip clears the reference.
  const handleToggleMidiComparison = useCallback(async () => {
    if (comparisonNotes) {
      setComparisonVisible(prev => !prev);
      return;
    }

    const picked = await pickMidiFileArrayBuffer(t('editor.midiImport.comparisonButton'));
    if (!picked) return; // user cancelled the picker

    const midi = parseMIDIKaraoke(picked.buffer);
    if (!midi) {
      toast({ title: t('editor.midiImport.parseError'), variant: 'destructive' });
      return;
    }
    const track =
      midi.tracks.find(tr => tr.index === midi.melodyTrackIndex && tr.noteCount > 0) ??
      midi.tracks.find(tr => tr.noteCount > 0);
    if (!track) {
      toast({ title: t('editor.midiImport.noTracks'), variant: 'destructive' });
      return;
    }

    const { bpm, gap } = currentSongRef.current;
    setComparisonNotes(midiTrackToComparisonNotes(track, bpm, gap));
    setComparisonVisible(true);
  }, [comparisonNotes, t]);

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
    <div className="relative flex flex-col h-full bg-slate-950 text-white">
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
        hasVideo={hasVideo}
        showVideoOverlay={showVideoOverlay}
        onToggleVideoOverlay={() => setShowVideoOverlay(prev => !prev)}
        activePanel={activePanel}
        onTogglePanel={(panel) => setActivePanel(prev => (prev === panel ? 'none' : panel))}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* ── Left panel: Liedtext (top) + Shortcuts (bottom) ──
            R7: the lyrics box moved UP (primary reference while editing),
            the dissolved "Notes & Tools" panel lives on as the compact
            Shortcuts reference below.
            R8 (3.1): the panel now starts directly below the editor header —
            it inherits the full height the sub-header used to occupy, so the
            lyrics box grew by that strip at the top. */}
        {heavyMounted && (
          <aside className="w-80 flex-shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col min-h-0" data-testid="editor-left-panel">
            {/* Section: Liedtext */}
            <section className="flex-1 min-h-0 flex flex-col">
              <div className="px-3 py-2 bg-slate-800/70 border-b border-slate-700 flex items-center gap-2 shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                <h2 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">{t('editor.leftPanel.lyrics')}</h2>
              </div>
              <div className="flex-1 min-h-0">
                <EditorLyricsTab
                  song={currentSong}
                  currentTime={currentTime}
                  selectedNoteId={selectedNoteId}
                  onNoteSelect={handleNoteSelect}
                  onTimeChange={handleTimeChange}
                  onNoteJump={handleNoteJump}
                />
              </div>
            </section>

            {/* Section: Shortcuts (renamed, punchier labels — R8: compacted) */}
            <section className="flex-shrink-0 max-h-[40%] min-h-0 flex flex-col border-t border-slate-700">
              <div className="flex-1 min-h-0 overflow-y-auto editor-panel-scroll">
                <ShortcutsPanel />
              </div>
            </section>
          </aside>
        )}

        {/* ── Middle column (R8/3): the sub-header sits flush above the
            timeline — it starts at the same left edge as the pitch ladder,
            shortening mouse paths between tools and notes. ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* ── Sub-Header (R7): note tools + note type + voice + transpose + tap ──
              Everything note-related from the old left side panel, now directly
              above the pitch lanes — always visible, never nested. */}
          {heavyMounted && (
            <EditorSubHeader
              activeNoteType={activeNoteType}
              onSelectNoteType={handleSelectNoteType}
              selectedCount={effectiveSelection.size}
              selectedPlayer={selectedNote?.player}
              onAddNote={handleAddFromToolbar}
              onDuplicateNote={duplicateNote}
              onDeleteNote={handleSelectionDelete}
              onSplitNote={handleNoteSplit}
              onMergeNote={handleMergeNote}
              onPlayerChange={handlePlayerChange}
              onTransposeAll={handleTransposeAll}
              tapMode={tapPlacement}
              onOpenMidiImport={() => setShowMidiImport(true)}
              onOpenSheetMusic={() => setShowSheetMusicImport(true)}
              onToggleMidiComparison={handleToggleMidiComparison}
              comparisonActive={comparisonNotes !== null && comparisonVisible}
            />
          )}

          <main className="flex-1 flex flex-col overflow-hidden relative">
            {heavyMounted && (
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
                noteJumpCommand={noteJumpCommand}
                comparisonNotes={comparisonVisible ? comparisonNotes : null}
                onClearComparison={() => setComparisonNotes(null)}
              />
            )}
          </main>
        </div>

        {/* ── Header tab panels — right-side sliding sidebar ──
            Metadata / Audio-Analysis / AI-Assistant dock to the right of the
            editor body (same pattern as the genre/language panel) instead of a
            top dropdown that squeezed the timeline. Content scrolls naturally
            inside the aside. */}
        {heavyMounted && activePanel !== 'none' && (
          <aside
            className="w-96 flex-shrink-0 overflow-y-auto border-l border-white/10 bg-slate-900/95 animate-in slide-in-from-right duration-300 editor-panel-scroll"
            data-testid={`editor-header-panel-${activePanel}`}
          >
            {/* Small header row: panel title + close */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 truncate">
                {activePanel === 'metadata'
                  ? t('editor.header.panelMetadata')
                  : activePanel === 'analysis'
                    ? t('editor.header.panelAnalysis')
                    : t('editor.header.panelAI')}
              </h2>
              <button
                onClick={() => setActivePanel('none')}
                className="p-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-600 transition-colors shrink-0"
                title={t('editor.header.closePanel')}
                aria-label={t('editor.header.closePanel')}
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {activePanel === 'metadata' && (
              <div className="grid grid-cols-1 divide-y divide-slate-700">
                <EditorSongInfoTab
                  song={currentSong}
                  allNotesCount={allNotes.length}
                  onSongChange={setSongInternal}
                  onSetUnsavedChanges={() => markDirty()}
                />
                <EditorMetadataTab
                  song={currentSong}
                  onSongChange={setSongInternal}
                  onSetUnsavedChanges={() => markDirty()}
                />
              </div>
            )}

            {activePanel === 'analysis' && (
              <AudioAnalysisPanel
                audioFilePath={analysisAudioPath}
                onApplyNotes={handleApplyDetectedNotes}
                onApplyBpm={handleApplyBpm}
              />
            )}

            {activePanel === 'ai' && (
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
            )}
          </aside>
        )}
      </div>

      {/* ── Boot overlay — shown while the heavy editor tree mounts/paints ── */}
      {bootOverlayVisible && (
        <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center gap-4" data-testid="editor-boot-overlay">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-cyan-500/25" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-t-cyan-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">🎹</div>
          </div>
          <div className="text-center max-w-xs">
            <p className="text-white/85 text-sm font-medium">{t('editor.bootTitle')}</p>
            <p className="text-white/40 text-xs mt-1 truncate">{currentSong.title} — {currentSong.artist}</p>
          </div>
        </div>
      )}

      {currentSong.audioUrl && !midiMusicActive && (
        <audio ref={audioRef} src={currentSong.audioUrl} onEnded={() => setIsPlaying(false)} />
      )}
      {/* MIDI music: bridge assigns the synth adapter to audioRef (playback
          via useEditorPlayback — play/pause/seek/playbackRate all supported) */}
      {currentSong.audioUrl && midiMusicActive && (
        <MidiAudioSource
          audioRef={audioRef}
          audioUrl={currentSong.audioUrl}
          songId={currentSong.id}
          onEnded={() => setIsPlaying(false)}
        />
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

      {/* MIDI/KAR note import (3.2) — notes as pitch/timing basis, never the music file */}
      <MidiImportDialog
        open={showMidiImport}
        onOpenChange={setShowMidiImport}
        onImport={handleMidiImport}
        hasExistingNotes={allNotes.length > 0}
      />

      {/* Notenblatt-Erkennung (5) — VLM notes import, same code path as MIDI */}
      <SheetMusicDialog
        open={showSheetMusicImport}
        onOpenChange={setShowSheetMusicImport}
        onImport={handleSheetMusicImport}
        hasExistingNotes={allNotes.length > 0}
      />

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
