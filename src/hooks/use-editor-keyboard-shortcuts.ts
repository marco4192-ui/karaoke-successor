/**
 * Hook for keyboard shortcuts in the karaoke editor
 */

import { useEffect } from 'react';
import type { Note } from '@/types/game';

export interface EditorKeyboardShortcutsOptions {
  onPlayPause: () => void;
  onDelete: (noteId: string) => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: (note: Note) => void;
  onPaste: (note: Note, currentTime: number) => void;
  onDeselect: () => void;
  selectedNoteId?: string;
  selectedNote?: Note;
  currentTime: number;
}

export function useEditorKeyboardShortcuts({
  onPlayPause,
  onDelete,
  onSave,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onDeselect,
  selectedNoteId,
  selectedNote,
  currentTime,
}: EditorKeyboardShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space: Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        onPlayPause();
        return;
      }

      // Delete: Delete selected note
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedNoteId) {
          e.preventDefault();
          onDelete(selectedNoteId);
        }
        return;
      }

      // Ctrl+S: Save
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        onSave();
        return;
      }

      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y: Redo
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
        e.preventDefault();
        onRedo();
        return;
      }

      // Ctrl+C: Copy selected note
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC' && selectedNote) {
        e.preventDefault();
        onCopy(selectedNote);
        return;
      }

      // Ctrl+V: Paste note
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        e.preventDefault();
        navigator.clipboard.readText().then((text) => {
          try {
            const copiedNote = JSON.parse(text) as Note;
            onPaste(copiedNote, currentTime);
          } catch {
            // Invalid clipboard data
          }
        });
        return;
      }

      // Escape: Deselect
      if (e.code === 'Escape') {
        onDeselect();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onPlayPause,
    onDelete,
    onSave,
    onUndo,
    onRedo,
    onCopy,
    onPaste,
    onDeselect,
    selectedNoteId,
    selectedNote,
    currentTime,
  ]);
}
