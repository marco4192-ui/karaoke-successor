'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface TapNoteState {
  /** Whether tap mode is currently active */
  isActive: boolean;
  /** Whether space is currently being held down */
  isHolding: boolean;
  /** The note ID of the currently held space (null if not holding) */
  activeNoteId: string | null;
  /** Index of the next lyric to assign */
  nextLyricIndex: number;
  /** Total notes placed in this session */
  notesPlaced: number;
}

interface UseTapNotePlacementParams {
  /** Ref to current playback time in ms (use ref to avoid stale closures) */
  currentTimeRef: React.RefObject<number>;
  /** Default pitch for new notes */
  defaultPitch: number;
  /** Callback to create a new note — returns note ID */
  onNoteCreate: (startTime: number, pitch: number, lyric: string) => string;
  /** Callback to update a note's end time / duration */
  onNoteRelease: (noteId: string, releaseTime: number) => void;
  /** All available lyrics syllables from the song for auto-assignment */
  lyrics: string[];
}

interface UseTapNotePlacementReturn extends TapNoteState {
  toggleTapMode: () => void;
  activateTapMode: () => void;
  deactivateTapMode: () => void;
  resetSession: () => void;
}

/**
 * Tap Note Placement Hook (Ultrastar-style)
 * 
 * When tap mode is active, Space key acts as a note placement trigger:
 * - Space DOWN → Creates a new note at current time with next lyric assigned
 * - Space UP → Sets note duration based on hold length
 * 
 * This enables rapid note entry by tapping along with the music.
 */
export function useTapNotePlacement({
  currentTimeRef,
  defaultPitch,
  onNoteCreate,
  onNoteRelease,
  lyrics,
}: UseTapNotePlacementParams): UseTapNotePlacementReturn {
  const [state, setState] = useState<TapNoteState>({
    isActive: false,
    isHolding: false,
    activeNoteId: null,
    nextLyricIndex: 0,
    notesPlaced: 0,
  });

  // Refs for values accessed in event handlers (avoid stale closures)
  const isHoldingRef = useRef(false);
  const holdStartRef = useRef(0);
  const activeNoteIdRef = useRef<string | null>(null);
  const lyricIndexRef = useRef(0);

  const toggleTapMode = useCallback(() => {
    setState(prev => {
      if (!prev.isActive) {
        lyricIndexRef.current = 0;
        return { ...prev, isActive: true, isHolding: false, activeNoteId: null, nextLyricIndex: 0, notesPlaced: 0 };
      }
      isHoldingRef.current = false;
      activeNoteIdRef.current = null;
      return { ...prev, isActive: false, isHolding: false, activeNoteId: null };
    });
  }, []);

  const activateTapMode = useCallback(() => {
    lyricIndexRef.current = 0;
    setState(prev => ({
      ...prev,
      isActive: true,
      isHolding: false,
      activeNoteId: null,
      nextLyricIndex: 0,
      notesPlaced: 0,
    }));
  }, []);

  const deactivateTapMode = useCallback(() => {
    isHoldingRef.current = false;
    activeNoteIdRef.current = null;
    setState(prev => ({
      ...prev,
      isActive: false,
      isHolding: false,
      activeNoteId: null,
    }));
  }, []);

  const resetSession = useCallback(() => {
    lyricIndexRef.current = 0;
    setState(prev => ({
      ...prev,
      nextLyricIndex: 0,
      notesPlaced: 0,
    }));
  }, []);

  // Set up event listeners for Space key (tap mode)
  useEffect(() => {
    if (!state.isActive) return;

    const isInput = () => {
      const el = document.activeElement;
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el?.isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isInput()) return;
      e.preventDefault();
      e.stopPropagation();

      if (isHoldingRef.current) return; // Already holding

      // Start new note
      const now = currentTimeRef.current ?? 0;
      holdStartRef.current = now;

      // Get next lyric
      const syllables = lyrics.length > 0 ? lyrics : ['---'];
      const lyric = syllables[lyricIndexRef.current % syllables.length];
      lyricIndexRef.current++;

      // Create note
      const noteId = onNoteCreate(now, defaultPitch, lyric);
      activeNoteIdRef.current = noteId;
      isHoldingRef.current = true;

      setState(prev => ({
        ...prev,
        isHolding: true,
        activeNoteId: noteId,
        nextLyricIndex: lyricIndexRef.current,
        notesPlaced: prev.notesPlaced + 1,
      }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isInput()) return;
      e.preventDefault();
      e.stopPropagation();

      if (!isHoldingRef.current || !activeNoteIdRef.current) return;

      // End note — calculate duration from hold time
      const now = currentTimeRef.current ?? 0;
      onNoteRelease(activeNoteIdRef.current, now);

      isHoldingRef.current = false;
      activeNoteIdRef.current = null;

      setState(prev => ({
        ...prev,
        isHolding: false,
        activeNoteId: null,
      }));
    };

    // Use capture phase to intercept before editor shortcuts
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [state.isActive, currentTimeRef, defaultPitch, onNoteCreate, onNoteRelease, lyrics]);

  return {
    ...state,
    toggleTapMode,
    activateTapMode,
    deactivateTapMode,
    resetSession,
  };
}
