'use client';

import { useEffect, useRef } from 'react';
import type { Note } from '@/types/game';

interface UseEditorKeyboardShortcutsParams {
  selectedNoteId: string | undefined;
  selectedNote: Note | undefined;
  currentTime: number;
  handlePlayPause: () => void;
  handleNoteDelete: (noteId: string) => void;
  handleSave: () => void;
  undo: () => void;
  redo: () => void;
  handleNoteAdd: (startTime: number, pitch: number) => void;
  setSelectedNoteId: (noteId: string | undefined) => void;
  tapModeActive?: boolean;
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

  // Update refs when props change (cheap — no listener churn)
  selectedNoteIdRef.current = selectedNoteId;
  selectedNoteRef.current = selectedNote;
  currentTimeRef.current = currentTime;
  tapModeActiveRef.current = tapModeActive;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space: Play/Pause (disabled in tap mode — Space is used for note placement)
      if (e.code === 'Space' && !tapModeActiveRef.current) {
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

      // Ctrl+S: Save
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
        navigator.clipboard.writeText(JSON.stringify(selectedNoteRef.current));
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
