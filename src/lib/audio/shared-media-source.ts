/**
 * Shared MediaElementSource cache
 *
 * Web Audio API only allows one createMediaElementSource() call per audio
 * element. Multiple consumers (e.g. useSongEnergy, loudness normalization)
 * that need to analyse or process the same <audio> element must share a
 * single source node.
 *
 * This module provides a WeakMap-based cache keyed by the media element
 * DOM node. When the element is garbage-collected the entry is automatically
 * removed, so no manual cleanup is required.
 *
 * The shared source is connected to `destination` through a unity GainNode
 * (source → gain → destination) exactly once so that audio output works
 * after `createMediaElementSource()` redirects the element's output into
 * the Web Audio graph. The gain node defaults to 1.0 (identical passthrough)
 * and is used by the loudness normalization to boost tracks above
 * element.volume = 1. Consumers should only do:
 *     source.connect(analyser)        // tap the signal
 *     // do NOT connect analyser → destination  (would duplicate audio)
 */

const cache = new WeakMap<
  HTMLMediaElement,
  { context: AudioContext; source: MediaElementAudioSourceNode; gain: GainNode }
>();

// ---------------------------------------------------------------------------
// Shared media guards (R105: moved here from vocal-filter.ts so pitch-shift.ts
// and future consumers reuse the exact same safety checks)
// ---------------------------------------------------------------------------

/**
 * True when the element's current media is same-origin (safe for Web Audio).
 * Cross-origin media through createMediaElementSource outputs SILENCE, so
 * such elements must never enter the Web Audio graph.
 */
export function isSameOriginMedia(el: HTMLMediaElement): boolean {
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
export function isSynthAdapterElement(el: HTMLMediaElement): boolean {
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
export function isCompatibleMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol === 'blob:') return true;
    if (parsed.protocol === 'data:') return true;
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Return (and lazily create) a shared AudioContext + MediaElementSourceNode
 * (+ unity GainNode) for the given media element.
 *
 * The source node is automatically connected to `destination` through the
 * gain node on first call so that audio playback continues to work through
 * the Web Audio graph. Callers should create their own AnalyserNode and
 * connect it to the returned source — but do NOT connect the analyser to
 * destination.
 */
export async function getSharedMediaSource(element: HTMLMediaElement): Promise<{
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
}> {
  const cached = cache.get(element);
  if (cached) {
    // Resume suspended context (common in Tauri webviews)
    if (cached.context.state === 'suspended') {
      await cached.context.resume();
    }
    return { context: cached.context, source: cached.source, gain: cached.gain };
  }

  const context = new AudioContext({ latencyHint: 'interactive' });
  // In Tauri webviews the AudioContext is often created in "suspended" state.
  if (context.state === 'suspended') {
    await context.resume();
  }

  const source = context.createMediaElementSource(element);
  // Connect source → gain → destination so the audio element keeps producing
  // sound after createMediaElementSource() redirects its output. This is done
  // once here so that individual consumers do NOT need to connect to
  // destination (which would duplicate/amplify the audio). The gain node
  // defaults to unity (1.0) so existing behaviour is unchanged; loudness
  // normalization may raise it above 1 to boost quiet songs.
  const gain = context.createGain();
  gain.gain.value = 1;
  source.connect(gain);
  gain.connect(context.destination);

  cache.set(element, { context, source, gain });
  return { context, source, gain };
}

/**
 * Reset the element's shared gain node to unity (1.0) — WITHOUT creating the
 * Web Audio graph for elements that never opted in (no-op when no graph
 * exists). Used when a song change or a settings toggle must clear a
 * previously applied boost so it doesn't leak into the next song.
 * Never throws.
 */
export function resetSharedGainNode(element: HTMLMediaElement): void {
  const cached = cache.get(element);
  if (!cached) return;
  try {
    cached.gain.gain.value = 1;
  } catch {
    // Ignore — never break playback.
  }
}
