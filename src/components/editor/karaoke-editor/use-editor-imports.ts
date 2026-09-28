'use client';

/**
 * MIDI/KAR + Notenblatt (sheet music) import and comparison-overlay logic
 * for the KaraokeEditor (R5 module split, extracted 1:1 from
 * karaoke-editor.tsx). Owns the dialog visibility flags and the pure editor
 * comparison state (never serialized, never in the undo history) plus the
 * import application handler.
 */

import { useCallback, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { Song, Note, LyricLine } from '@/types/game';
import { useTranslation } from '@/lib/i18n/translations';
import { toast } from '@/hooks/use-toast';
import { parseMIDIKaraoke } from '@/lib/parsers/multi-format-import';
import {
  pickMidiFileArrayBuffer,
  midiTrackToComparisonNotes,
  type MidiImportResult,
  type ComparisonNote,
} from '../midi-import-dialog';
import type { NoteHistoryMode } from '../timeline/timeline';
import { groupNotesIntoLines } from './note-operations';

interface UseEditorImportsArgs {
  currentSongRef: RefObject<Song>;
  applyLyrics: (_newLyrics: LyricLine[], _mode?: NoteHistoryMode) => void;
  setSongInternal: (_song: SetStateAction<Song>) => void;
  markDirty: () => void;
  onNoteJump: (_note: Note) => void;
  /** Primary note selection setter (import replaces the note basis). */
  setSelectedNoteId: (_noteId: string | undefined) => void;
  /** Multi-selection setter (import replaces the note basis). */
  setSelectedNoteIds: Dispatch<SetStateAction<Set<string>>>;
}

export function useEditorImports({
  currentSongRef,
  applyLyrics,
  setSongInternal,
  markDirty,
  onNoteJump,
  setSelectedNoteId,
  setSelectedNoteIds,
}: UseEditorImportsArgs) {
  const { t } = useTranslation();

  // ── MIDI/KAR import (3.2) + comparison overlay (3.5) ──
  const [showMidiImport, setShowMidiImport] = useState(false);
  // ── Sheet music (Notenblatt) recognition via VLM (5) ──
  const [showSheetMusicImport, setShowSheetMusicImport] = useState(false);
  // Pure editor state — NEVER serialized, never in the undo history.
  const [comparisonNotes, setComparisonNotes] = useState<ComparisonNote[] | null>(null);
  const [comparisonVisible, setComparisonVisible] = useState(true);

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
    if (firstNote) onNoteJump(firstNote);
    // R5: setSelectedNoteId/setSelectedNoteIds were added to the dep array —
    // both are stable useState setters from the orchestrator (zero behavior
    // change; required because params lose the rule's setState exemption).
  }, [applyLyrics, setSongInternal, markDirty, onNoteJump, setSelectedNoteId, setSelectedNoteIds, currentSongRef]);

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
  }, [comparisonNotes, t, currentSongRef]); // R5: stable ref in deps — never re-creates

  return {
    showMidiImport,
    setShowMidiImport,
    showSheetMusicImport,
    setShowSheetMusicImport,
    handleMidiImport,
    handleSheetMusicImport,
    handleToggleMidiComparison,
    comparisonNotes,
    comparisonVisible,
    setComparisonNotes,
  };
}
