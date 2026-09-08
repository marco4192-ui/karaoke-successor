'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { LyricLine } from '@/types/game';

export interface HistoryState {
  lyrics: LyricLine[];
}

interface PushHistoryOptions {
  /**
   * Replace the most recent history entry instead of appending a new one.
   * Used by tap-mode note release so "create + set duration" counts as ONE
   * undo step instead of flooding the history with two entries per tap.
   */
  replace?: boolean;
}

interface UseEditorHistoryReturn {
  history: HistoryState[];
  historyIndex: number;
  hasUnsavedChanges: boolean;
  pushHistory: (_newLyrics: LyricLine[], _opts?: PushHistoryOptions) => void;
  /** Mark the editor dirty without pushing a history entry (live drag / typing). */
  markDirty: () => void;
  /** Mark the current state as saved (resets the unsaved-changes flag). */
  markSaved: () => void;
  undo: () => LyricLine[] | null;
  redo: () => LyricLine[] | null;
  canUndo: boolean;
  canRedo: boolean;
  setHasUnsavedChanges: (_val: boolean) => void;
}

const MAX_HISTORY = 50;

export function useEditorHistory(initialLyrics: LyricLine[]): UseEditorHistoryReturn {
  const [history, setHistory] = useState<HistoryState[]>([{ lyrics: initialLyrics }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChangesState] = useState(false);

  // Ref to always have the latest historyIndex — prevents stale closure
  // when pushHistory is called rapidly from async contexts.
  const historyIndexRef = useRef(historyIndex);
  useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);

  // Index of the history entry that matches the last saved state.
  // undo/redo compare against this to restore the "saved" flag correctly
  // (undoing back to the saved state clears the unsaved indicator).
  const savedIndexRef = useRef(0);

  const setHasUnsavedChanges = useCallback((val: boolean) => {
    setHasUnsavedChangesState(val);
  }, []);

  const markDirty = useCallback(() => {
    setHasUnsavedChangesState(true);
  }, []);

  const markSaved = useCallback(() => {
    savedIndexRef.current = historyIndexRef.current;
    setHasUnsavedChangesState(false);
  }, []);

  const pushHistory = useCallback((newLyrics: LyricLine[], opts?: PushHistoryOptions) => {
    // Use the ref value to avoid stale closure issues
    const currentIndex = historyIndexRef.current;

    setHistory(prev => {
      let newHistory: HistoryState[];

      if (opts?.replace && prev.length > 0) {
        // Replace the top entry (e.g. tap-mode release finishing the note that
        // was just created) — keeps index unchanged.
        newHistory = [...prev];
        newHistory[newHistory.length - 1] = { lyrics: structuredClone(newLyrics) };
        return newHistory;
      }

      newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push({ lyrics: structuredClone(newLyrics) });
      // Limit history to MAX_HISTORY entries
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        // Saved index shifts with the array so the "saved" state stays tracked.
        savedIndexRef.current = Math.max(-1, savedIndexRef.current - 1);
        // Nested setState inside updater: setHistoryIndex is called here so that
        // historyIndex stays in sync with the shifted array. React batches these
        // updates automatically — the index will be correct by the next render.
        setHistoryIndex(prev => Math.min(prev, MAX_HISTORY - 1));
      } else {
        setHistoryIndex(prev => prev + 1);
      }
      return newHistory;
    });
    setHasUnsavedChangesState(true);
  }, []); // No dependencies needed — uses ref for historyIndex

  const undo = useCallback((): LyricLine[] | null => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setHasUnsavedChangesState(newIndex !== savedIndexRef.current);
      return structuredClone(history[historyIndex - 1].lyrics);
    }
    return null;
  }, [historyIndex, history]);

  const redo = useCallback((): LyricLine[] | null => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setHasUnsavedChangesState(newIndex !== savedIndexRef.current);
      return structuredClone(history[historyIndex + 1].lyrics);
    }
    return null;
  }, [historyIndex, history]);

  return {
    history,
    historyIndex,
    hasUnsavedChanges,
    pushHistory,
    markDirty,
    markSaved,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    setHasUnsavedChanges,
  };
}
