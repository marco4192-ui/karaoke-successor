/**
 * Pitch shift ("Tonhöhen-Verstellung") — transpose the song's key without
 * changing its tempo (R105).
 *
 * DSP: custom AudioWorkletProcessor (public/pitch-shift-worklet.js) using
 * two crossfaded delay-line read taps (time-domain granular pitch shifting).
 * The worklet runs off the main thread (unlike the deprecated ScriptProcessor
 * soundtouchjs approach), so the game loop never competes with the audio
 * processing.
 *
 * ── Signal chain (all nodes live in the SHARED media context — see
 *    shared-media-source.ts) ──
 *
 *   WITHOUT pitch:  source ──────────────────► sharedGain ──► [dry/wet paths]
 *   WITH pitch:     source ──► pitchWorklet ──► sharedGain ──► [dry/wet paths]
 *
 * The insert sits BEFORE the shared gain so the loudness boost AND the vocal
 * filter's dry/wet paths (which tap the shared gain since R105) all receive
 * the transposed signal — the features cascade correctly when combined.
 *
 * Robustness rules (mirrored from vocal-filter.ts — DO NOT break):
 * - NEVER throws; every entry point swallows errors and returns a safe value.
 * - NEVER connects a cross-origin / synth-adapter element to Web Audio.
 * - The chain is cached per element (WeakMap); elements are re-created per
 *   song (key={song.id} in game-screen.tsx), so stale chains are GC'd with
 *   their element — no manual lifecycle needed beyond clearPitchShift.
 * - semitones = 0 restores the pristine source → sharedGain routing
 *   (bit-exact bypass, zero added latency).
 */

import {
  getSharedMediaSource,
  isSameOriginMedia,
  isSynthAdapterElement,
  isCompatibleMediaUrl,
} from './shared-media-source';

/** Why the pitch shift cannot be applied for the current song/medium. */
export type PitchShiftUnsupportedReason =
  | 'midi'
  | 'platform'
  | 'crossorigin'
  | 'native';

/** Absolute semitone limit of the worklet (clamped there as well). */
export const PITCH_SHIFT_MAX_SEMITONES = 12;

interface PitchChain {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  /** Shared (loudness) gain node — the insert's output target. */
  sharedGain: GainNode;
  node: AudioWorkletNode;
  /** Last semitones actually applied. */
  semitones: number;
}

/** Built chains, keyed by the media element (auto-GC with the element). */
const chains = new WeakMap<HTMLMediaElement, PitchChain>();

/** Latest REQUESTED semitones per element — last-writer-wins under async races. */
const requestedSemitones = new WeakMap<HTMLMediaElement, number>();

/** Contexts that already loaded the worklet module (addModule is not idempotent). */
const loadedContexts = new WeakSet<AudioContext>();

export interface PitchShiftSupportInput {
  /** True when the song's music is the Web Audio MIDI synth (fake element). */
  midiMusicActive: boolean;
  /** The song's own audio-file URL (null → music comes from the platform player / embedded video). */
  songAudioUrl: string | null | undefined;
  /** True when native audio (ASIO/WASAPI) bypasses the <audio> element. */
  nativeAudioEnabled: boolean;
}

/**
 * Synchronous availability probe for the UI: returns WHY the pitch shift
 * cannot run for the current song/medium, or null when it can.
 */
export function getPitchShiftUnsupportedReason(
  input: PitchShiftSupportInput,
): PitchShiftUnsupportedReason | null {
  if (input.midiMusicActive) return 'midi';
  if (input.nativeAudioEnabled) return 'native';
  if (!input.songAudioUrl) return 'platform';
  if (typeof window !== 'undefined' && !isCompatibleMediaUrl(input.songAudioUrl)) {
    return 'crossorigin';
  }
  return null;
}

function clampSemitones(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(-PITCH_SHIFT_MAX_SEMITONES, Math.min(PITCH_SHIFT_MAX_SEMITONES, value)));
}

/**
 * Restore the pristine output path source → sharedGain (bypass the worklet).
 * Idempotent — disconnect() of a non-existing connection throws → swallowed.
 */
function bypassChain(chain: PitchChain): void {
  try {
    chain.source.disconnect(chain.node);
  } catch {
    // Already bypassed — fine.
  }
  try {
    chain.node.disconnect(chain.sharedGain);
  } catch {
    // Already bypassed — fine.
  }
  try {
    chain.source.connect(chain.sharedGain);
  } catch {
    // Already connected — fine.
  }
  chain.semitones = 0;
}

/**
 * Apply (or update) the pitch shift on a media element.
 *
 * @param element  The <audio> element carrying the song's music.
 * @param semitones −12..+12 (rounded); 0 disables the shift (pristine bypass).
 * @returns true when the shift is (or already was) active on the element,
 *          false when it cannot be applied (cross-origin media, MIDI synth
 *          adapter, missing AudioWorklet support). Never throws; playback is
 *          never interrupted on failure.
 */
export async function setPitchShift(
  element: HTMLMediaElement,
  semitones: number,
): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !element) return false;
    // Guards BEFORE touching Web Audio (creating the graph for a
    // cross-origin element would silence the playback):
    if (isSynthAdapterElement(element)) return false;
    if (!isSameOriginMedia(element)) return false;
    if (typeof AudioWorkletNode === 'undefined' || !AudioContext?.prototype?.audioWorklet) {
      return false;
    }

    const clamped = clampSemitones(semitones);
    requestedSemitones.set(element, clamped);

    // Filter off: no graph creation, and a previously built chain is put
    // back into pristine bypass so the audio path is untouched.
    if (clamped === 0) {
      const existing = chains.get(element);
      if (existing) bypassChain(existing);
      return true;
    }

    const { context, source, gain } = await getSharedMediaSource(element);

    // A newer request may have arrived while the shared source resolved —
    // apply the latest requested value, not our (possibly stale) one.
    const current = clampSemitones(requestedSemitones.get(element) ?? 0);
    if (current === 0) {
      const existing = chains.get(element);
      if (existing) bypassChain(existing);
      return true;
    }

    let chain = chains.get(element);
    if (!chain) {
      // Load the worklet module once per AudioContext.
      if (!loadedContexts.has(context)) {
        await context.audioWorklet.addModule('/pitch-shift-worklet.js');
        loadedContexts.add(context);
      }
      const node = new AudioWorkletNode(context, 'at-pitch-shift', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      chain = { context, source, sharedGain: gain, node, semitones: 0 };
      chains.set(element, chain);
    }

    // Engage the insert: source → node → sharedGain (replacing source → sharedGain).
    try {
      chain.source.disconnect(chain.sharedGain);
    } catch {
      // Not connected directly (already engaged) — fine.
    }
    chain.node.connect(chain.sharedGain);
    chain.source.connect(chain.node);

    if (chain.semitones !== current) {
      chain.node.port.postMessage({ type: 'pitch', semitones: current });
      chain.semitones = current;
    }
    return true;
  } catch {
    // Never break playback — the pitch shift simply stays off.
    return false;
  }
}

/**
 * Fully disable the pitch shift for the element: restore the pristine
 * source → sharedGain routing. Cached nodes remain for cheap re-enable.
 * Never throws; no-op without a chain.
 */
export function clearPitchShift(element: HTMLMediaElement): void {
  try {
    if (!element) return;
    requestedSemitones.set(element, 0);
    const chain = chains.get(element);
    if (!chain) return;
    bypassChain(chain);
  } catch {
    // Ignore — never break playback.
  }
}

/**
 * The pitch shift currently applied to the element (0 when off / unknown).
 * Read-mostly helper for diagnostics.
 */
export function getPitchShiftSemitones(element: HTMLMediaElement): number {
  try {
    return chains.get(element)?.semitones ?? 0;
  } catch {
    return 0;
  }
}
