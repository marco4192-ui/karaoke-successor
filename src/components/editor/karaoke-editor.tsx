'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Song, Note, LyricLine } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from '@/lib/i18n/translations';
import { Timeline, type NoteHistoryMode } from './timeline/timeline';
import { midiPitchToFrequency } from '@/lib/utils';
import { parseLyricsToSyllables } from '@/lib/editor/syllable-separator';
import { snapTimeToBeat } from '@/lib/editor/beat-utils';
import { useEditorPlayback } from '@/hooks/use-editor-playback';
import { useEditorKeyboardShortcuts } from '@/hooks/use-editor-keyboard-shortcuts';
import { useTapNotePlacement } from '@/hooks/use-tap-note-placement';
import { EditorHeader, type EditorHeaderPanel } from './editor-header';
import { EditorSubHeader } from './editor-sub-header';
import { VideoSyncOverlay } from './video-sync-overlay';
import { MidiImportDialog } from './midi-import-dialog';
// Sheet music (Notenblatt) recognition via VLM (5) — same import contract
import { SheetMusicDialog } from './sheet-music-dialog';
import { isMidiSongMusic } from '@/lib/audio/midi-synth';
import type { DetectedNote } from '@/hooks/use-audio-analysis';
import { noteTypeFlags, type NoteType, type DuetPlayer } from '@/types/game';
// R5 module split — focused sub-modules of the editor orchestrator:
import type { KaraokeEditorProps, EditorNoteJumpCommand } from './karaoke-editor/types';
import {
  finalizeLine,
  insertNoteIntoLyrics,
  reassignNoteLineInLyrics,
  applyDetectedNotesToLyrics,
} from './karaoke-editor/note-operations';
import { resolveAnalysisAudioPath } from './karaoke-editor/analysis-audio-path';
import { useNoteHistory } from './karaoke-editor/use-note-history';
import { useEditorSave } from './karaoke-editor/use-editor-save';
import { useEditorImports } from './karaoke-editor/use-editor-imports';
import { EditorLeftPanel } from './karaoke-editor/left-panel';
import { EditorHeaderPanelSidebar } from './karaoke-editor/header-panel-sidebar';
import { EditorCancelConfirmDialog } from './karaoke-editor/cancel-confirm-dialog';
import { EditorAudioSourceBridge } from './karaoke-editor/audio-source-bridge';

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
  // R14 (user request 2): the beat magnet is ON by default — dragging a
  // note horizontally now clicks into the beat grid instead of floating
  // freely ("too easy, hard to hit the right position"). Turn it off with
  // the magnet button for completely free timing.
  const [snapEnabled, setSnapEnabled] = useState(true);
  // Video sync overlay (video + notes side by side, with timecode control)
  const [showVideoOverlay, setShowVideoOverlay] = useState(false);

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

  // ── Lyrics history / undo-redo (R5 module: ./karaoke-editor/use-note-history) ──
  const {
    applyLyrics, handleCommitHistory, scheduleCommit,
    undo, redo, canUndo, canRedo, hasUnsavedChanges, markDirty, markSaved,
  } = useNoteHistory({ initialLyrics: initialSong.lyrics, currentSongRef, setSongInternal });

  // ── Save flow, file-first (R5 module: ./karaoke-editor/use-editor-save) ──
  const { isSaving, saveResult, handleSave, handleSaveOnly } = useEditorSave({ currentSongRef, markSaved, onSave });

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

  // ── Move a note to a different line when its startTime clearly left the own line ──
  // (pure logic lives in ./karaoke-editor/note-operations.ts — R5 module split;
  //  thin stable wrapper keeps the original identity + dep arrays intact)
  const reassignNoteLine = useCallback((lyrics: LyricLine[], noteId: string): LyricLine[] =>
    reassignNoteLineInLyrics(lyrics, noteId), []);

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

  /** Insert a note into the lyrics structure. `groupLine` merges close tap notes into the previous line.
   *  (pure logic lives in ./karaoke-editor/note-operations.ts — R5 module split;
   *  thin stable wrapper keeps the original identity + dep arrays intact) */
  const insertNote = useCallback((lyrics: LyricLine[], newNote: Note, groupLine: boolean): LyricLine[] =>
    insertNoteIntoLyrics(lyrics, newNote, groupLine), []);

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
  const [noteJumpCommand, setNoteJumpCommand] = useState<EditorNoteJumpCommand | null>(null);
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
   *  Snaps to the beat grid when the magnet is enabled.
   *  R14: with the magnet now ON by default, a raw 25ms nudge would snap
   *  right back to the same beat (round-to-nearest) at high BPM — arrows
   *  would do nothing. Instead the step is raised to ONE BEAT so every
   *  arrow press always moves the note a musically meaningful distance. */
  const handleNudge = useCallback((delta: number) => {
    const ids = effectiveSelection;
    if (ids.size === 0) return;
    const prev = currentSongRef.current;
    let touched = false;
    // Beat-aware step: never smaller than one beat while snapping.
    let step = delta;
    if (snapEnabled && prev.bpm > 0) {
      const beatMs = 15000 / prev.bpm;
      if (Math.abs(step) < beatMs) step = Math.sign(step) * beatMs;
    }
    const deltaFinal = step;
    const newLyrics = prev.lyrics.map(line => {
      const has = line.notes.some(n => ids.has(n.id));
      if (!has) return line;
      touched = true;
      return finalizeLine({
        ...line,
        notes: line.notes.map(n => ids.has(n.id)
          ? { ...n, startTime: Math.max(0, Math.round(snapTimeToBeat(n.startTime + deltaFinal, prev.bpm, prev.gap, snapEnabled))) }
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
  // (pure matching logic lives in ./karaoke-editor/note-operations.ts — R5)
  const handleApplyDetectedNotes = useCallback((detectedNotes: DetectedNote[]) => {
    const newLyrics = applyDetectedNotesToLyrics(currentSongRef.current.lyrics, detectedNotes);
    if (!newLyrics) return; // Nothing to update
    applyLyrics(newLyrics, 'push');
  }, [applyLyrics]);

  // --- Audio Analysis: Apply detected BPM ---
  const handleApplyBpm = useCallback((bpm: number) => {
    setSongInternal({ ...currentSongRef.current, bpm: Math.round(bpm) });
    markDirty();
  }, [setSongInternal, markDirty]);

  // ── MIDI/KAR + Notenblatt import & comparison overlay
  //    (R5 module: ./karaoke-editor/use-editor-imports) ──
  const {
    showMidiImport, setShowMidiImport,
    showSheetMusicImport, setShowSheetMusicImport,
    handleMidiImport, handleSheetMusicImport, handleToggleMidiComparison,
    comparisonNotes, comparisonVisible, setComparisonNotes,
  } = useEditorImports({
    currentSongRef,
    applyLyrics,
    setSongInternal,
    markDirty,
    onNoteJump: handleNoteJump,
    setSelectedNoteId,
    setSelectedNoteIds,
  });

  // Determine the audio file path for analysis — resolve relative paths to absolute.
  // Falls back to the video file path so that video-embedded audio can be analyzed.
  // (pure logic lives in ./karaoke-editor/analysis-audio-path.ts — R5)
  const analysisAudioPath = useMemo(
    () => resolveAnalysisAudioPath({
      audioUrl: currentSong.audioUrl,
      relativeAudioPath: currentSong.relativeAudioPath,
      baseFolder: currentSong.baseFolder,
      videoBackground: currentSong.videoBackground,
      relativeVideoPath: currentSong.relativeVideoPath,
      youtubeUrl: currentSong.youtubeUrl,
    }),
    [currentSong.audioUrl, currentSong.relativeAudioPath, currentSong.baseFolder, currentSong.videoBackground, currentSong.relativeVideoPath, currentSong.youtubeUrl]);

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
          <EditorLeftPanel
            song={currentSong}
            currentTime={currentTime}
            selectedNoteId={selectedNoteId}
            onNoteSelect={handleNoteSelect}
            onTimeChange={handleTimeChange}
            onNoteJump={handleNoteJump}
          />
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
          <EditorHeaderPanelSidebar
            activePanel={activePanel}
            song={currentSong}
            allNotesCount={allNotes.length}
            analysisAudioPath={analysisAudioPath}
            onClose={() => setActivePanel('none')}
            onSongChange={setSongInternal}
            onMarkDirty={markDirty}
            onApplyNotes={handleApplyDetectedNotes}
            onApplyBpm={handleApplyBpm}
            onSongUpdate={(updates) => {
              setSongInternal({ ...currentSongRef.current, ...updates });
              markDirty();
            }}
            onLyricsUpdate={(lyrics) => {
              applyLyrics(lyrics, 'push');
            }}
          />
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

      {/* Hidden audio sources (R5 module: ./karaoke-editor/audio-source-bridge) */}
      <EditorAudioSourceBridge
        audioUrl={currentSong.audioUrl}
        videoBackground={currentSong.videoBackground}
        songId={currentSong.id}
        midiMusicActive={midiMusicActive}
        audioRef={audioRef}
        onEnded={() => setIsPlaying(false)}
      />

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
        <EditorCancelConfirmDialog
          isSaving={isSaving}
          onKeepEditing={() => setShowCancelConfirm(false)}
          onDiscard={() => { setShowCancelConfirm(false); onCancel(); }}
          onSave={() => { setShowCancelConfirm(false); handleSave(); }}
        />
      )}
    </div>
  );
}

export default KaraokeEditor;
