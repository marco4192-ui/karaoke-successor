'use client';

import { useState, useCallback, useRef } from 'react';
import type { LyricLine } from '@/types/game';

export interface HistoryState {
  lyrics: LyricLine[];
}

interface UseEditorHistoryReturn {
  history: HistoryState[];
  historyIndex: number;
  hasUnsavedChanges: boolean;
  pushHistory: (newLyrics: LyricLine[]) => void;
  undo: () => LyricLine[] | null;
  redo: () => LyricLine[] | null;
  canUndo: boolean;
  canRedo: boolean;
  setHasUnsavedChanges: (val: boolean) => void;
}

const MAX_HISTORY = 50;

export function useEditorHistory(initialLyrics: LyricLine[]): UseEditorHistoryReturn {
  const [history, setHistory] = useState<HistoryState[]>([{ lyrics: initialLyrics }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChangesState] = useState(false);

  // Ref to always have the latest historyIndex — prevents stale closure
  // when pushHistory is called rapidly from async contexts.
  const historyIndexRef = useRef(historyIndex);
  historyIndexRef.current = historyIndex;

  const setHasUnsavedChanges = useCallback((val: boolean) => {
    setHasUnsavedChangesState(val);
  }, []);

  const pushHistory = useCallback((newLyrics: LyricLine[]) => {
    // Use the ref value to avoid stale closure issues
    const currentIndex = historyIndexRef.current;

    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push({ lyrics: structuredClone(newLyrics) });
      // Limit history to MAX_HISTORY entries
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        // Adjust index since we removed the oldest entry
        setHistoryIndex(prev => Math.max(prev, MAX_HISTORY - 1));
      } else {
        setHistoryIndex(prev => prev + 1);
      }
      return newHistory;
    });
    setHasUnsavedChangesState(true);
  }, []); // No dependencies needed — uses ref for historyIndex

  const undo = useCallback((): LyricLine[] | null => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      return structuredClone(history[historyIndex - 1].lyrics);
    }
    return null;
  }, [historyIndex, history]);

  const redo = useCallback((): LyricLine[] | null => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      return structuredClone(history[historyIndex + 1].lyrics);
    }
    return null;
  }, [historyIndex, history]);

  return {
    history,
    historyIndex,
    hasUnsavedChanges,
    pushHistory,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    setHasUnsavedChanges,
  };
}
