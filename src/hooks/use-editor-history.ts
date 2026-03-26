/**
 * Hook for managing undo/redo history in the karaoke editor
 */

import { useState, useCallback } from 'react';
import type { LyricLine } from '@/types/game';

export interface HistoryState {
  lyrics: LyricLine[];
}

export interface UseEditorHistoryOptions {
  initialLyrics: LyricLine[];
  maxHistory?: number;
}

export interface UseEditorHistoryReturn {
  history: HistoryState[];
  historyIndex: number;
  currentLyrics: LyricLine[];
  pushHistory: (newLyrics: LyricLine[]) => void;
  undo: () => LyricLine[] | null;
  redo: () => LyricLine[] | null;
  canUndo: boolean;
  canRedo: boolean;
  resetHistory: (lyrics: LyricLine[]) => void;
}

export function useEditorHistory({
  initialLyrics,
  maxHistory = 50,
}: UseEditorHistoryOptions): UseEditorHistoryReturn {
  const [history, setHistory] = useState<HistoryState[]>([
    { lyrics: JSON.parse(JSON.stringify(initialLyrics)) },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentLyrics = history[historyIndex]?.lyrics || initialLyrics;

  const pushHistory = useCallback(
    (newLyrics: LyricLine[]) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({ lyrics: JSON.parse(JSON.stringify(newLyrics)) });
        // Limit history to maxHistory entries
        if (newHistory.length > maxHistory) {
          newHistory.shift();
          return newHistory;
        }
        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, maxHistory - 1));
    },
    [historyIndex, maxHistory]
  );

  const undo = useCallback((): LyricLine[] | null => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      return JSON.parse(JSON.stringify(history[newIndex].lyrics));
    }
    return null;
  }, [historyIndex, history]);

  const redo = useCallback((): LyricLine[] | null => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      return JSON.parse(JSON.stringify(history[newIndex].lyrics));
    }
    return null;
  }, [historyIndex, history]);

  const resetHistory = useCallback(
    (lyrics: LyricLine[]) => {
      setHistory([{ lyrics: JSON.parse(JSON.stringify(lyrics)) }]);
      setHistoryIndex(0);
    },
    []
  );

  return {
    history,
    historyIndex,
    currentLyrics,
    pushHistory,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    resetHistory,
  };
}
