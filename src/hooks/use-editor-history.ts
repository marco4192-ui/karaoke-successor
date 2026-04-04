'use client';

import { useState, useCallback } from 'react';
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

export function useEditorHistory(initialLyrics: LyricLine[]): UseEditorHistoryReturn {
  const [history, setHistory] = useState<HistoryState[]>([{ lyrics: initialLyrics }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChangesState] = useState(false);

  const setHasUnsavedChanges = useCallback((val: boolean) => {
    setHasUnsavedChangesState(val);
  }, []);

  const pushHistory = useCallback((newLyrics: LyricLine[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ lyrics: JSON.parse(JSON.stringify(newLyrics)) });
      // Limit history to 50 entries
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
    setHasUnsavedChangesState(true);
  }, [historyIndex]);

  const undo = useCallback((): LyricLine[] | null => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      return JSON.parse(JSON.stringify(history[historyIndex - 1].lyrics));
    }
    return null;
  }, [historyIndex, history]);

  const redo = useCallback((): LyricLine[] | null => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      return JSON.parse(JSON.stringify(history[historyIndex + 1].lyrics));
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
