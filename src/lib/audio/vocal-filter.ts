/**
 * Vocal filter ("Gesangsfilter") — karaoke-style center-channel cancellation.
 *
 * ANSWER TO THE USER'S QUESTION: there is no existing function (neither in the
 * Web Audio API nor anywhere in this codebase) that removes vocals from a
 * song. We implement the classic L−R mid/side cancellation ourselves:
 * content that is panned to the CENTER (lead vocals in most stereo mixes, but
 * also often bass/kick) appears identically in the left and right channel, so
 * forming the difference signal L − R cancels it while the panned
 * instruments survive.
 *
 * Limitations (shown to the user in the Audio-Effects panel):
 * - Works best on STEREO recordings with center-panned vocals. Modern mixes
 *   with stereo-wide vocals, reverb-heavy vocals or mono-summed masters
 *   cancel poorly or partially.
 * - MONO files cannot be filtered: the ChannelSplitter uses "discrete"
 *   channel interpretation, so a mono source feeds channel 0 only and
 *   channel 1 stays silent → the side signal degenerates to the full mono
 *   mix (L − 0 = M). Dry (1−amount) + wet (amount) then sum back to the
 *   unchanged mono signal — the slider simply has no audible effect. (If a
 *   browser up-mixed mono to L=R=M instead, amount=1 would yield silence;
 *   both behaviors are "not filterable" — hence no upfront channel probe:
 *   mozHasAudio/webkitAudioDecodedByteCount are unreliable, and a
 *   loadedmetadata AnalyserNode probe would need to decode the file twice.)
 * - PLATFORM audio (YouTube / Dailymotion / Vimeo / … players) never passes
 *   through our <audio> element — nothing to filter.
 * - CROSS-ORIGIN media: createMediaElementSource() on a cross-origin element
 *   without CORS outputs SILENCE, which would kill the playback entirely.
 *   Same guard pattern as loudness.ts (isSameOriginMedia): only same-origin,
 *   blob: and data: URLs may enter the Web Audio graph. In Tauri builds
 *   asset-served files (http://asset.localhost) are cross-origin for the app
 *   window — same limitation as the loudness boost, filter shows as
 *   unavailable there.
 *
 * ── Signal chain (all nodes live in the SHARED media context, because a
 *    MediaElementAudioSourceNode and its processing chain must share one
 *    AudioContext — see shared-media-source.ts) ──
 *
 *   source ──► sharedGain (loudness boost, owned by loudness.ts)
 *                    │
 *                    └─► dryGain(1−amount) ─────────────► destination   (dry)
 *
 *   source ──► splitter(2)
 *                 ch0 ─► g0(+1) ──┬─► merger in0 ─┐
 *                 ch1 ─► gInv(−1) ─┴─► merger in1 ─┴─► wetGain(amount) ─► destination (wet)
 *
 *   merger output = [L−R, L−R] — the mono side signal on both speakers.
 *
 * Dry/wet crossfade: the WET gain carries `amount`, the DRY gain carries
 * `1 − amount`, so at amount=0 the output is bit-identical to the unfiltered
 * mix and at amount=1 the center-cancelled side signal is all that remains.
 *
 * Interaction with loudness normalization (documented decision): the dry path
 * runs THROUGH the shared unity gain node, so a loudness boost applies to the
 * dry (unfiltered) share only — the wet side signal taps the raw source and
 * deliberately bypasses the boost, keeping the karaoke level predictable.
 * Because the boost (shared gain) and the dry share (dryGain) live on
 * SEPARATE nodes, applyLoudnessVolume/clearLoudnessGain can change the boost
 * at any time without clobbering the filter's dry factor and vice versa —
 * no ordering constraints between the two modules.
 *
 * Robustness rules (mirrored from loudness.ts — DO NOT break):
 * - NEVER throws; every entry point swallows errors and returns a safe value.
 * - NEVER connects a cross-origin / synth-adapter element to Web Audio.
 * - The chain is cached per element (WeakMap); repeated setVocalRemoval calls
 *   only update the two gains. Elements are re-created per song
 *   (key={song.id} in game-screen.tsx), so stale chains are GC'd with their
 *   element — no manual lifecycle needed beyond clearVocalRemoval.
 */

import { getSharedMediaSource } from './shared-media-source';

/** Why the vocal filter cannot be applied for the current song/medium. */
export type VocalFilterUnsupportedReason =
  | 'midi'
  | 'platform'
  | 'crossorigin'
  | 'native';

interface VocalFilterChain {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  /** Shared (loudness) gain node — upstream of our dryGain once engaged. */
  sharedGain: GainNode;
  /** Dry (unfiltered) share: 1 − amount. */
  dryGain: GainNode;
  /** Wet (vocal-cancelled side signal) share: amount. */
  wetGain: GainNode;
  splitter: ChannelSplitterNode;
  /** Left passthrough (+1). */
  g0: GainNode;
  /** Right polarity flip (−1) — this is the actual cancellation. */
  gInv: GainNode;
  merger: ChannelMergerNode;
  /** Last amount actually applied to the gains. */
  amount: number;
}

/** Built chains, keyed by the media element (auto-GC with the element). */
const chains = new WeakMap<HTMLMediaElement, VocalFilterChain>();

/** Latest REQUESTED amount per element — last-writer-wins under async races. */
const requestedAmounts = new WeakMap<HTMLMediaElement, number>();

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/**
 * True when the element's current media is same-origin (safe for Web Audio).
 * Mirrors the private isSameOriginMedia guard in loudness.ts: cross-origin
 * media through createMediaElementSource outputs SILENCE, so such elements
 * must never enter the Web Audio graph.
 */
function isSameOriginMedia(el: HTMLMediaElement): boolean {
  try {
    const src = el.currentSrc || el.src;
    if (!src) return true;
    const url = new URL(src, window.location.href);
    // blob: URLs carry the creating origin in their path.
    if (url.protocol === 'blob:') return true;
    if (url.protocol === 'data:') return true;
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Detect the MIDI/KAR synth adapter (midi-audio-element.ts): it is a plain
 * object cast to HTMLAudioElement — NOT a DOM node, has no media element
 * source (its audio is synthesized in its own Web Audio engine). Duck-typed
 * via the `engine` property the adapter exposes for the bridge; a real
 * <audio> element never has one. (Belt-and-suspenders: also reject anything
 * that is not an actual HTMLMediaElement instance.)
 */
function isSynthAdapterElement(el: HTMLMediaElement): boolean {
  if (typeof (el as { engine?: unknown }).engine !== 'undefined') return true;
  if (
    typeof window !== 'undefined'
    && typeof window.HTMLMediaElement === 'function'
    && !(el instanceof window.HTMLMediaElement)
  ) {
    return true;
  }
  return false;
}

/** Same-origin check on a raw media URL string (UI availability probe). */
function isCompatibleMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol === 'blob:') return true;
    if (parsed.protocol === 'data:') return true;
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

export interface VocalFilterSupportInput {
  /** True when the song's music is the Web Audio MIDI synth (fake element). */
  midiMusicActive: boolean;
  /** The song's own audio-file URL (null → music comes from the platform player / embedded video). */
  songAudioUrl: string | null | undefined;
  /** True when native audio (ASIO/WASAPI) bypasses the <audio> element. */
  nativeAudioEnabled: boolean;
}

/**
 * Synchronous availability probe for the UI: returns WHY the vocal filter
 * cannot run for the current song/medium, or null when it can.
 * (Mono files are NOT detectable upfront — see the module header.)
 */
export function getVocalFilterUnsupportedReason(
  input: VocalFilterSupportInput,
): VocalFilterUnsupportedReason | null {
  if (input.midiMusicActive) return 'midi';
  if (input.nativeAudioEnabled) return 'native';
  if (!input.songAudioUrl) return 'platform';
  if (typeof window !== 'undefined' && !isCompatibleMediaUrl(input.songAudioUrl)) {
    return 'crossorigin';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Chain routing helpers
// ---------------------------------------------------------------------------

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

/**
 * Route the shared gain's output through our dryGain (engage the filter):
 *   sharedGain → dryGain → destination   (replaces sharedGain → destination)
 * Idempotent: connect() is a no-op for an existing connection pair, and the
 * disconnect() of a non-existing connection throws → swallowed (never breaks
 * the ongoing playback path).
 */
function engageRouting(chain: VocalFilterChain): void {
  try {
    chain.sharedGain.disconnect(chain.context.destination);
  } catch {
    // Not connected directly (already engaged) — fine.
  }
  chain.sharedGain.connect(chain.dryGain);
  chain.dryGain.connect(chain.context.destination);
}

/**
 * Restore the pristine output path sharedGain → destination (bypass the
 * filter): wet goes to 0, dry to unity passthrough.
 */
function bypassChain(chain: VocalFilterChain): void {
  chain.wetGain.gain.value = 0;
  chain.dryGain.gain.value = 1;
  try {
    chain.sharedGain.disconnect(chain.dryGain);
  } catch {
    // Already bypassed — fine.
  }
  chain.dryGain.disconnect();
  chain.sharedGain.connect(chain.context.destination);
}

/**
 * Apply (or update) the vocal filter on a media element.
 *
 * @param element The <audio> element carrying the song's music.
 * @param amount  0..1 — 0 disables the filter (pristine bypass), 1 = full
 *                center-channel cancellation.
 * @returns true when the filter is (or already was) active on the element,
 *          false when it cannot be applied (cross-origin media, MIDI synth
 *          adapter, no window / Web Audio). Never throws; playback is never
 *          interrupted on failure.
 */
export async function setVocalRemoval(
  element: HTMLMediaElement,
  amount: number,
): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !element) return false;
    // Guards BEFORE touching Web Audio (creating the graph for a
    // cross-origin element would silence the playback):
    if (isSynthAdapterElement(element)) return false;
    if (!isSameOriginMedia(element)) return false;

    const clamped = clamp01(amount);
    requestedAmounts.set(element, clamped);

    // The shared source + its context are the ONLY correct context for this
    // chain (nodes cannot cross AudioContexts), so the optional external
    // AudioContext is deliberately NOT used — getSharedMediaSource owns it.
    const { context, source, gain } = await getSharedMediaSource(element);

    // A newer request may have arrived while the shared source resolved —
    // apply the latest requested amount, not our (possibly stale) one.
    const current = clamp01(requestedAmounts.get(element) ?? 0);

    let chain = chains.get(element);
    if (current <= 0) {
      // Filter off: no graph creation, and a previously built chain is put
      // back into pristine bypass so the audio path is untouched.
      if (chain) bypassChain(chain);
      return true;
    }

    if (!chain) {
      // ── Wet path: the side signal L − R (mono, both speakers) ──
      const splitter = context.createChannelSplitter(2);
      const g0 = context.createGain(); // left passthrough (+1)
      const gInv = context.createGain(); // right polarity flip (−1) — the cancellation
      gInv.gain.value = -1;
      const merger = context.createChannelMerger(2);
      const wetGain = context.createGain();
      wetGain.gain.value = 0;

      source.connect(splitter);
      splitter.connect(g0, 0);
      splitter.connect(gInv, 1);
      // L on both merger inputs, −R on both merger inputs → [L−R, L−R].
      g0.connect(merger, 0, 0);
      g0.connect(merger, 0, 1);
      gInv.connect(merger, 0, 0);
      gInv.connect(merger, 0, 1);
      merger.connect(wetGain);
      wetGain.connect(context.destination);

      // ── Dry path: shared (loudness) gain → dryGain → destination ──
      const dryGain = context.createGain();
      dryGain.gain.value = 1;

      chain = {
        context,
        source,
        sharedGain: gain,
        dryGain,
        wetGain,
        splitter,
        g0,
        gInv,
        merger,
        amount: 0,
      };
      chains.set(element, chain);
    }

    engageRouting(chain);
    // Dry/wet crossfade: dry = 1 − amount, wet = amount.
    chain.dryGain.gain.value = 1 - current;
    chain.wetGain.gain.value = current;
    chain.amount = current;
    return true;
  } catch {
    // Never break playback — the filter simply stays off.
    return false;
  }
}

/**
 * Fully disable the vocal filter for the element: wet to 0, dry to unity,
 * and the shared gain re-connected straight to destination (the exact
 * pre-filter routing — the loudness boost on the shared gain is untouched,
 * since this module never modifies that node's value). Cached nodes remain
 * for cheap re-enable. Never throws; no-op without a chain.
 */
export function clearVocalRemoval(element: HTMLMediaElement): void {
  try {
    if (!element) return;
    const chain = chains.get(element);
    if (!chain) return;
    chain.amount = 0;
    requestedAmounts.set(element, 0);
    bypassChain(chain);
  } catch {
    // Ignore — never break playback.
  }
}

/**
 * The vocal-filter amount currently applied to the element (0 when off /
 * unknown). Read-mostly helper for diagnostics and tests.
 */
export function getVocalRemovalAmount(element: HTMLMediaElement): number {
  try {
    return chains.get(element)?.amount ?? 0;
  } catch {
    return 0;
  }
}
