'use client';

import { useEffect, useRef } from 'react';
import { playWarningCountdownCue, playSectionActiveCue, type WarningCueKind } from '@/lib/audio/warning-cues';

export interface ModeWarningState {
  countdown: number;
  active: boolean;
}

/**
 * Audible cues for Blind Karaoke / Missing Words warning transitions.
 *
 * useGameModes reports per-frame warning states; this hook listens for the
 * meaningful TRANSITIONS and plays matching sounds (visual-only banner was
 * previously the only signal — singers keep their eyes on the lyrics):
 *   idle → countdown   : attention beep pair ("section incoming")
 *   countdown → active : soft low beep ("section started")
 *
 * Transitions caused by pause/resume state clearing do NOT re-trigger the
 * active cue (only the natural countdown → active path plays it), so
 * un-pausing mid-blind-passage stays silent.
 */
function useWarningCueEffect(
  relevant: boolean,
  kind: WarningCueKind,
  warning: ModeWarningState,
): void {
  const prevRef = useRef<ModeWarningState>({ countdown: 0, active: false });

  useEffect(() => {
    const prev = prevRef.current;
    if (relevant) {
      // idle → countdown: approaching a blind/hidden section
      if (prev.countdown === 0 && !prev.active && warning.countdown > 0 && warning.active) {
        playWarningCountdownCue(kind);
      }
      // countdown → active: the section just started
      if (prev.countdown > 0 && warning.countdown === 0 && warning.active) {
        playSectionActiveCue(kind);
      }
    }
    prevRef.current = warning;
  }, [relevant, kind, warning]);
}

export function useModeWarningCues(
  gameMode: string,
  blindWarning: ModeWarningState,
  missingWordsWarning: ModeWarningState,
): void {
  useWarningCueEffect(gameMode === 'blind', 'blind', blindWarning);
  useWarningCueEffect(gameMode === 'missing-words', 'missing-words', missingWordsWarning);
}
