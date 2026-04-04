'use client';

import { useEffect } from 'react';
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
}: UseEditorKeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space: Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      }

      // Delete: Delete selected note
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedNoteId) {
          e.preventDefault();
          handleNoteDelete(selectedNoteId);
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
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC' && selectedNote) {
        e.preventDefault();
        navigator.clipboard.writeText(JSON.stringify(selectedNote));
      }

      // Ctrl+V: Paste note
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        e.preventDefault();
        navigator.clipboard.readText().then(text => {
          try {
            const copiedNote = JSON.parse(text) as Note;
            handleNoteAdd(currentTime, copiedNote.pitch);
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
  }, [handlePlayPause, selectedNoteId, handleNoteDelete, handleSave, undo, redo, selectedNote, handleNoteAdd, currentTime, setSelectedNoteId]);
}
