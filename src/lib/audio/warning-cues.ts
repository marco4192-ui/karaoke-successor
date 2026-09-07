// Warning Cues — short audible attention sounds for Blind Karaoke and
// Missing Words mode transitions.
//
// The visual ModeWarningBanner is purely visual; these cues make the
// "blind/hidden section incoming" events accessible while singing (eyes are
// on the lyrics, not the HUD). All functions are safe no-ops when the Web
// Audio API is unavailable (SSR, blocked autoplay, missing AudioContext).
//
// Cue design:
//   countdown (approaching section): two quick rising sine beeps — "get ready"
//     blind          : C5 → E5  (darker, matches the purple banner)
//     missing-words  : E5 → A5  (brighter, matches the amber banner)
//   active (section started): single soft low beep + faint fifth — "you're in it"
//
// Users can disable the cues in Settings → Gameplay ("Warning Sound Cues").
// The setting is read on every play call (localStorage reads are cheap and
// this fires at most a few times per song), so toggling mid-song applies
// immediately without any cache invalidation wiring.

import { StorageKeys, getBool } from '@/lib/storage';

export type WarningCueKind = 'blind' | 'missing-words';

/** True when the audible warning cues are enabled (default: on). */
export function areWarningCuesEnabled(): boolean {
  return getBool(StorageKeys.WARNING_CUES, true);
}

let sharedCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedCtx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      sharedCtx = new AC();
    }
    // Autoplay policies suspend contexts until a user gesture — the player has
    // already clicked "Start" at this point, so a resume() here succeeds.
    if (sharedCtx.state === 'suspended') {
      void sharedCtx.resume().catch(() => { /* stay suspended — cue stays silent */ });
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

function playTone(ctx: AudioContext, freq: number, startOffsetSec: number, durationSec: number, peakGain: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;

  const t0 = ctx.currentTime + startOffsetSec;
  // Fast attack, exponential decay — a "beep", not a continuous tone
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + durationSec + 0.05);
}

/** Play the "blind/hidden section starts in N seconds" attention cue. */
export function playWarningCountdownCue(kind: WarningCueKind): void {
  if (!areWarningCuesEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  const [f1, f2] = kind === 'blind' ? [523.25, 659.25] : [659.25, 880.0];
  playTone(ctx, f1, 0, 0.13, 0.18);
  playTone(ctx, f2, 0.13, 0.16, 0.18);
}

/** Play the "section is now active" cue (softer, lower). */
export function playSectionActiveCue(kind: WarningCueKind): void {
  if (!areWarningCuesEnabled()) return;
  const ctx = getContext();
  if (!ctx) return;
  const base = kind === 'blind' ? 311.13 : 415.30; // Eb4 / Ab4
  playTone(ctx, base, 0, 0.18, 0.12);
  playTone(ctx, base * 1.5, 0.03, 0.12, 0.05); // faint fifth harmonic
}
