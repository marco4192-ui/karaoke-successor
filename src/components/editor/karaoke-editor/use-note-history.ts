'use client';

/**
 * Undo/redo history bridge for the KaraokeEditor (R5 module split).
 * Owns the lyrics-history coupling that previously lived inline in
 * karaoke-editor.tsx: the central `applyLyrics` mutation helper (song state
 * + history push in one step), the live-change coalescing (drag / slider /
 * typing bursts → ONE undo entry) and the undo/redo state transfer. All
 * callback bodies and dep arrays are 1:1 from the original orchestrator.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { RefObject, SetStateAction } from 'react';
import type { Song, LyricLine } from '@/types/game';
import type { NoteHistoryMode } from '../timeline/timeline';
import { useEditorHistory } from '@/hooks/use-editor-history';

interface UseNoteHistoryArgs {
  initialLyrics: LyricLine[];
  /** Authoritative song ref — all mutations compute the next state from it. */
  currentSongRef: RefObject<Song>;
  /** Writes the next song into state AND the authoritative ref. */
  setSongInternal: (_song: SetStateAction<Song>) => void;
}

export function useNoteHistory({ initialLyrics, currentSongRef, setSongInternal }: UseNoteHistoryArgs) {
  const {
    pushHistory, undo: historyUndo, redo: historyRedo,
    canUndo, canRedo, hasUnsavedChanges, markDirty, markSaved,
  } = useEditorHistory(initialLyrics);

  // Track pending "live" changes (drag / slider / typing) that still need a
  // history commit — prevents history flooding while keeping undo correct.
  const dirtyLiveRef = useRef(false);

  // Ref to track the commit timer so it can be cleared on unmount
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the commit timer on unmount to prevent leaks
  useEffect(() => {
    return () => {
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    };
  }, []);

  // ── Central lyrics mutation + history helper ──
  const applyLyrics = useCallback((newLyrics: LyricLine[], mode: NoteHistoryMode = 'push') => {
    setSongInternal({ ...currentSongRef.current, lyrics: newLyrics });
    switch (mode) {
      case 'push':
        pushHistory(newLyrics);
        dirtyLiveRef.current = false;
        break;
      case 'replace':
        // Push overwriting the top entry (tap-mode: create + duration = one undo step)
        pushHistory(newLyrics, { replace: true });
        dirtyLiveRef.current = false;
        break;
      case 'live':
        markDirty();
        dirtyLiveRef.current = true;
        break;
      case 'commit':
        if (dirtyLiveRef.current) {
          pushHistory(newLyrics);
          dirtyLiveRef.current = false;
        }
        break;
    }
  // R5: currentSongRef added to the deps — a stable ref object, so this
  // never re-creates the callback (same class of change as R2's containerRef).
  }, [setSongInternal, pushHistory, markDirty, currentSongRef]);

  /** Push the accumulated live changes as a single history entry. */
  const handleCommitHistory = useCallback(() => {
    if (commitTimerRef.current) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    if (dirtyLiveRef.current) {
      pushHistory(currentSongRef.current.lyrics);
      dirtyLiveRef.current = false;
    }
  }, [pushHistory, currentSongRef]);

  /** Debounced auto-commit (keyboard repeats: arrows / typing). */
  const scheduleCommit = useCallback(() => {
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      commitTimerRef.current = null;
      if (dirtyLiveRef.current) {
        pushHistory(currentSongRef.current.lyrics);
        dirtyLiveRef.current = false;
      }
    }, 700);
  }, [pushHistory, currentSongRef]);

  const undo = useCallback(() => {
    const lyrics = historyUndo();
    if (lyrics) {
      setSongInternal({ ...currentSongRef.current, lyrics });
      dirtyLiveRef.current = false;
    }
  }, [historyUndo, setSongInternal, currentSongRef]);

  const redo = useCallback(() => {
    const lyrics = historyRedo();
    if (lyrics) {
      setSongInternal({ ...currentSongRef.current, lyrics });
      dirtyLiveRef.current = false;
    }
  }, [historyRedo, setSongInternal, currentSongRef]);

  return {
    applyLyrics,
    handleCommitHistory,
    scheduleCommit,
    undo,
    redo,
    canUndo,
    canRedo,
    hasUnsavedChanges,
    markDirty,
    markSaved,
  };
}
