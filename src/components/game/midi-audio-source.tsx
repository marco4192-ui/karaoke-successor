'use client';

/**
 * Render-less bridge: plugs the MIDI synth adapter into an audioRef.
 *
 * Songs whose music file (#MP3) is .mid/.midi/.kar render this instead of
 * the hidden <audio> element. It fetches the song's audioUrl, parses it,
 * creates an HTMLAudioElement-compatible fake (Web Audio GM synth) and
 * assigns it to `audioRef` — every consumer that drives the music through
 * that ref (game loop, pause/resume, remote control, practice mode, OS
 * media session, editor playback) keeps working unchanged.
 *
 * The element is re-created when audioUrl changes (per-song). On unmount
 * the engine is disposed and the ref is nulled (only if still ours).
 */

import { useEffect, useRef } from 'react';
import { createMidiAudioElement } from '@/lib/audio/midi-audio-element';

interface MidiAudioSourceProps {
  /** The game's audio ref — receives the fake element. */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** Resolved media URL of the .mid/.midi/.kar file (blob:/data:/http/asset). */
  audioUrl: string;
  /** Song id — logging only. */
  songId?: string;
  /** Master volume 0..100 — applied at creation and on change. */
  masterVolume?: number;
  /** Fired when the synthesized playback reaches the end. */
  onEnded?: () => void;
  /** Fired once the fake element is assigned (audioLoadedRef). */
  onReady?: () => void;
}

export function MidiAudioSource({
  audioRef,
  audioUrl,
  songId,
  masterVolume,
  onEnded,
  onReady,
}: MidiAudioSourceProps) {
  // Latest-callback refs: listeners must call the CURRENT handler without
  // re-creating the element (which would restart playback).
  const onEndedRef = useRef(onEnded);
  const onReadyRef = useRef(onReady);
  const masterVolumeRef = useRef(masterVolume);
  useEffect(() => {
    onEndedRef.current = onEnded;
    onReadyRef.current = onReady;
    masterVolumeRef.current = masterVolume;
  });

  // ── Create the fake element for this audioUrl ──
  useEffect(() => {
    let cancelled = false;
    let created: HTMLAudioElement | null = null;

    const load = async () => {
      try {
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        const el = createMidiAudioElement(buffer, audioUrl);
        created = el;
        el.addEventListener('ended', () => { onEndedRef.current?.(); });
        const initialVolume = masterVolumeRef.current;
        if (typeof initialVolume === 'number') {
          el.volume = Math.min(1, Math.max(0, initialVolume / 100));
        }
        audioRef.current = el;
        onReadyRef.current?.();
      } catch (err) {
        // Not fatal for the app: the game watchdog ends the round after 10s
        // of silence (same behaviour as a broken/unreadable audio file).
        // eslint-disable-next-line no-console
        console.error('[MidiAudioSource] Failed to load MIDI music', songId, err);
      }
    };

    void load();

    return () => {
      cancelled = true;
      const el = created;
      if (el) {
        try { el.pause(); } catch { /* ignore */ }
        const engine = (el as unknown as { engine?: { dispose?: () => void } }).engine;
        try { engine?.dispose?.(); } catch { /* ignore */ }
        if (audioRef.current === el) audioRef.current = null;
      }
    };
  }, [audioUrl, audioRef, songId]);

  // ── Master volume updates while mounted ──
  useEffect(() => {
    if (typeof masterVolume !== 'number') return;
    const el = audioRef.current;
    if (el) {
      el.volume = Math.min(1, Math.max(0, masterVolume / 100));
    }
    // masterVolumeRef covers the case where the element is created AFTER
    // this effect ran (async fetch) — see creation block.
  }, [masterVolume, audioRef]);

  return null;
}
