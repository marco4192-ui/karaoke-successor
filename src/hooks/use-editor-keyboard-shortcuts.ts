'use client';

import { useEffect, useRef } from 'react';
import type { Note } from '@/types/game';

interface UseEditorKeyboardShortcutsParams {
  selectedNoteId: string | undefined;
  selectedNote: Note | undefined;
  currentTime: number;
  handlePlayPause: () => void;
  handleNoteDelete: () => void;
  /** Ctrl+S handler — saves WITHOUT closing (YASS-style) */
  handleSave: () => void;
  undo: () => void;
  redo: () => void;
  /** Paste a full note (lyric/duration/type/player preserved) at the playhead */
  handlePasteNote: (_data: Partial<Note>) => void;
  /** Merge the selected note with the next note */
  handleMergeNote: () => void;
  /** Transpose the selection by delta semitones (Shift = octave handled by caller) */
  handleTranspose: (_delta: number) => void;
  /** Nudge the selection start time by delta ms */
  handleNudge: (_delta: number) => void;
  setSelectedNoteId: (_noteId: string | undefined) => void;
  tapModeActive?: boolean;
}

/** True when the key event targets an interactive control that handles keys itself. */
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(
    'button, select, input, textarea, [role="slider"], [role="combobox"], [contenteditable="true"]'
  ));
}

export function useEditorKeyboardShortcuts({
  selectedNoteId,
  selectedNote,
  currentTime,
  handlePlayPause,
  handleNoteDelete,
  handleSave,
  undo,
  redo,
  handlePasteNote,
  handleMergeNote,
  handleTranspose,
  handleNudge,
  setSelectedNoteId,
  tapModeActive = false,
}: UseEditorKeyboardShortcutsParams) {
  // Use refs for values that are read inside the handler but change frequently.
  // This prevents the listener from being torn down and re-registered on every
  // render (e.g., currentTime changes at 60fps during playback).
  const selectedNoteIdRef = useRef(selectedNoteId);
  const selectedNoteRef = useRef(selectedNote);
  const currentTimeRef = useRef(currentTime);
  const tapModeActiveRef = useRef(tapModeActive);

  // Update refs when props change (via effect — avoids accessing refs during render)
  useEffect(() => {
    selectedNoteIdRef.current = selectedNoteId;
    selectedNoteRef.current = selectedNote;
    currentTimeRef.current = currentTime;
    tapModeActiveRef.current = tapModeActive;
  }, [selectedNoteId, selectedNote, currentTime, tapModeActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space: Play/Pause (disabled in tap mode — Space is used for note placement).
      // Focused buttons/sliders handle Space themselves — don't double-trigger.
      if (e.code === 'Space' && !tapModeActiveRef.current) {
        if (isInteractiveTarget(e.target)) return;
        e.preventDefault();
        handlePlayPause();
      }

      // ── YASS-style note editing keys (require a selection) ──
      const hasSelection = Boolean(selectedNoteIdRef.current);

      // ↑/↓: transpose selection (Shift = octave)
      if (hasSelection && (e.code === 'ArrowUp' || e.code === 'ArrowDown') && !e.altKey) {
        e.preventDefault();
        const step = e.shiftKey ? 12 : 1;
        handleTranspose(e.code === 'ArrowUp' ? step : -step);
        return;
      }

      // ←/→: nudge selection start time (Shift = coarse)
      if (hasSelection && (e.code === 'ArrowLeft' || e.code === 'ArrowRight') && !e.altKey) {
        e.preventDefault();
        const step = e.shiftKey ? 250 : 25;
        handleNudge(e.code === 'ArrowRight' ? step : -step);
        return;
      }

      // M: merge selected note with the next note
      if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey && !e.altKey && hasSelection) {
        e.preventDefault();
        handleMergeNote();
        return;
      }

      // Delete: Delete selected note(s)
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedNoteIdRef.current) {
          e.preventDefault();
          handleNoteDelete();
        }
      }

      // Ctrl+S: Save (without closing)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        handleSave();
      }

      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Shift+Z or Ctrl+Y: Redo
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }

      // Ctrl+C: Copy selected note
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC' && selectedNoteRef.current) {
        e.preventDefault();
        navigator.clipboard.writeText(JSON.stringify(selectedNoteRef.current)).catch(() => {});
      }

      // Ctrl+V: Paste full note at the playhead (pitch, lyric, duration, type, player)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        e.preventDefault();
        navigator.clipboard.readText().then(text => {
          try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed.pitch === 'number') {
              handlePasteNote({
                pitch: parsed.pitch,
                duration: typeof parsed.duration === 'number' ? parsed.duration : undefined,
                lyric: typeof parsed.lyric === 'string' ? parsed.lyric : undefined,
                isGolden: Boolean(parsed.isGolden),
                isBonus: Boolean(parsed.isBonus),
                player: parsed.player === 'P1' || parsed.player === 'P2' ? parsed.player : undefined,
              });
            }
          } catch {
            // Invalid clipboard data
          }
        }).catch(() => {
          // Clipboard read denied — ignore
        });
      }

      // Escape: Deselect
      if (e.code === 'Escape') {
        setSelectedNoteId(undefined);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, handleNoteDelete, handleSave, undo, redo, handlePasteNote, handleMergeNote, handleTranspose, handleNudge, setSelectedNoteId]);
}
