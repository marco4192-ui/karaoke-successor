'use client';

import { useEffect, useRef } from 'react';
import type { Note } from '@/types/game';

interface UseEditorKeyboardShortcutsParams {
  selectedNoteId: string | undefined;
  selectedNote: Note | undefined;
  currentTime: number;
  handlePlayPause: () => void;
  handleNoteDelete: (_noteId: string) => void;
  /** Ctrl+S handler — saves WITHOUT closing (YASS-style) */
  handleSave: () => void;
  undo: () => void;
  redo: () => void;
  handleNoteAdd: (_startTime: number, _pitch: number) => void;
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
  handleNoteAdd,
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

      // Delete: Delete selected note
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedNoteIdRef.current) {
          e.preventDefault();
          handleNoteDelete(selectedNoteIdRef.current);
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

      // Ctrl+V: Paste note
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        e.preventDefault();
        navigator.clipboard.readText().then(text => {
          try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed.pitch === 'number') {
              handleNoteAdd(currentTimeRef.current, parsed.pitch);
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
  }, [handlePlayPause, handleNoteDelete, handleSave, undo, redo, handleNoteAdd, setSelectedNoteId]);
}
