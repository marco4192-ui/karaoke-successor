/**
 * Shared MediaElementSource cache
 *
 * Web Audio API only allows one createMediaElementSource() call per audio
 * element. Multiple consumers (e.g. useSongEnergy, SpectrogramDisplay) that
 * need to analyse the same <audio> element must share a single source node.
 *
 * This module provides a WeakMap-based cache keyed by the HTMLAudioElement
 * DOM node. When the element is garbage-collected the entry is automatically
 * removed, so no manual cleanup is required.
 *
 * The shared source is connected to `destination` exactly once so that audio
 * output works after `createMediaElementSource()` redirects the element's
 * output into the Web Audio graph.  Consumers should only do:
 *     source.connect(analyser)        // tap the signal
 *     // do NOT connect analyser → destination  (would duplicate audio)
 */

const cache = new WeakMap<
  HTMLAudioElement,
  { context: AudioContext; source: MediaElementAudioSourceNode; connected: boolean }
>();

/**
 * Return (and lazily create) a shared AudioContext + MediaElementSourceNode
 * for the given audio element.
 *
 * The source node is automatically connected to `destination` on first call
 * so that audio playback continues to work through the Web Audio graph.
 * Callers should create their own AnalyserNode and connect it to the
 * returned source — but do NOT connect the analyser to destination.
 */
export async function getSharedMediaSource(element: HTMLAudioElement): Promise<{
  context: AudioContext;
  source: MediaElementAudioSourceNode;
}> {
  const cached = cache.get(element);
  if (cached) {
    // Resume suspended context (common in Tauri webviews)
    if (cached.context.state === 'suspended') {
      await cached.context.resume();
    }
    return { context: cached.context, source: cached.source };
  }

  const context = new AudioContext();
  // In Tauri webviews the AudioContext is often created in "suspended" state.
  if (context.state === 'suspended') {
    await context.resume();
  }

  const source = context.createMediaElementSource(element);
  // Connect source → destination so the audio element keeps producing sound
  // after createMediaElementSource() redirects its output. This is done once
  // here so that individual consumers do NOT need to connect to destination
  // (which would duplicate/amplify the audio).
  source.connect(context.destination);

  cache.set(element, { context, source, connected: true });
  return { context, source };
}
