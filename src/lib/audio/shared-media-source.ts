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
 */

const cache = new WeakMap<
  HTMLAudioElement,
  { context: AudioContext; source: MediaElementAudioSourceNode }
>();

/**
 * Return (and lazily create) a shared AudioContext + MediaElementSourceNode
 * for the given audio element.  Callers should create their own AnalyserNode
 * and connect it to the returned source.
 *
 * NOTE: Only ONE consumer should connect its analyser → destination to avoid
 * duplicate audio output.  Currently useSongEnergy handles this.
 */
export function getSharedMediaSource(element: HTMLAudioElement): {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
} {
  const cached = cache.get(element);
  if (cached) return cached;

  const context = new AudioContext();
  const source = context.createMediaElementSource(element);
  cache.set(element, { context, source });
  return { context, source };
}
