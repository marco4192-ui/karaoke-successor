/**
 * HTMLAudioElement-compatible adapter for MIDI/KAR playback.
 *
 * The game (game-screen / game-loop / practice / remote-control / effects
 * hooks) drives the song's music through an `audioRef` holding an
 * HTMLAudioElement. For songs whose music file is .mid/.midi/.kar this
 * module provides a drop-in fake element backed by MidiSynthEngine:
 *
 * Supported surface (audited across use-game-loop / use-media-playback /
 * game-loop-utils / use-game-media / use-practice-playback /
 * use-editor-playback / use-remote-control / use-media-session /
 * use-game-audio-effects / use-display-duration / loudness):
 *   play() pause() load() currentTime duration volume muted playbackRate
 *   paused ended readyState src currentSrc preload error networkState
 *   addEventListener / removeEventListener / dispatchEvent
 *   events: timeupdate (~30 Hz), ended, canplay, loadedmetadata,
 *   durationchange, seeking/seeked, play, playing, pause, volumechange
 *
 * `error` is never emitted (there is no media element to fail). The object
 * is typed as HTMLAudioElement via `as unknown as` — consumers see the
 * real element interface.
 */

import { MidiSynthEngine } from './midi-synth';

type FakeListener = EventListener;

interface ListenerEntry {
  fn: FakeListener;
  once: boolean;
}

export interface MidiAudioElement {
  /** The underlying engine (used by the bridge for cleanup / diagnostics). */
  readonly engine: MidiSynthEngine;
}

/**
 * Create the fake audio element. Throws when the MIDI file cannot be
 * parsed (the bridge catches and logs). The engine starts idle at 0 ms.
 */
export function createMidiAudioElement(buffer: ArrayBuffer, src?: string): HTMLAudioElement {
  const engine = new MidiSynthEngine(buffer);

  const listeners = new Map<string, ListenerEntry[]>();

  const emit = (type: string) => {
    const entries = listeners.get(type);
    if (!entries || entries.length === 0) return;
    // Copy — once-listeners may remove themselves during iteration.
    for (const entry of [...entries]) {
      try {
        entry.fn({ type } as Event);
      } catch {
        // Listener errors must not break playback.
      }
      if (entry.once) {
        const list = listeners.get(type);
        if (list) {
          const idx = list.indexOf(entry);
          if (idx >= 0) list.splice(idx, 1);
        }
      }
    }
  };

  // ── timeupdate ticker (~30 Hz while playing) ──
  let timeupdateTimer: ReturnType<typeof setInterval> | null = null;
  const startTimeupdateTimer = () => {
    if (timeupdateTimer) return;
    timeupdateTimer = setInterval(() => emit('timeupdate'), 33);
  };
  const stopTimeupdateTimer = () => {
    if (timeupdateTimer) {
      clearInterval(timeupdateTimer);
      timeupdateTimer = null;
    }
  };

  engine.onEnded = () => {
    stopTimeupdateTimer();
    state.ended = true;
    emit('ended');
    emit('timeupdate');
  };

  const state = {
    ended: false,
    readyState: 4, // HAVE_ENOUGH_DATA — engine is loaded synchronously
    src: src ?? '',
    preload: 'auto',
    autoplay: false,
    loop: false,
    controls: false,
    muted: false,
    defaultMuted: false,
    crossOrigin: null as string | null,
  };

  const element = {
    // ── Identification for the bridge (not part of HTMLAudioElement) ──
    engine,

    // ── Plain fields ──
    get readyState() { return state.readyState; },
    get networkState() { return 1; }, // NETWORK_IDLE
    get error() { return null; },
    get src() { return state.src; },
    set src(value: string) { state.src = value; }, // no-op media load (engine already holds the data)
    get currentSrc() { return state.src; },
    get preload() { return state.preload; },
    set preload(_value: string) { /* no-op */ },
    get autoplay() { return state.autoplay; },
    set autoplay(_value: boolean) { /* no-op */ },
    get loop() { return state.loop; },
    set loop(value: boolean) { state.loop = value; },
    get controls() { return state.controls; },
    set controls(_value: boolean) { /* no-op */ },
    get crossOrigin() { return state.crossOrigin; },
    set crossOrigin(value: string | null) { state.crossOrigin = value; },

    // ── Media state (engine-backed) ──
    get paused() { return !engine.isPlaying; },
    get ended() { return state.ended; },
    get duration() { return engine.durationMs / 1000; },
    get seekable() { return { length: 1, start: () => 0, end: () => engine.durationMs / 1000 }; },
    get buffered() { return { length: 1, start: () => 0, end: () => engine.durationMs / 1000 }; },
    get currentTime() { return engine.positionMs / 1000; },
    set currentTime(seconds: number) {
      const ms = Number.isFinite(seconds) ? seconds * 1000 : 0;
      state.ended = false;
      engine.seek(ms);
      emit('seeking');
      emit('seeked');
      emit('timeupdate');
    },
    get volume() { return engine.volume; },
    set volume(v: number) {
      engine.setVolume(Number.isFinite(v) ? v : 1);
      emit('volumechange');
    },
    get muted() { return engine.muted; },
    set muted(value: boolean) {
      engine.setMuted(value);
      emit('volumechange');
    },
    get defaultMuted() { return state.defaultMuted; },
    set defaultMuted(value: boolean) { state.defaultMuted = value; },
    get playbackRate() { return engine.playbackRate; },
    set playbackRate(rate: number) {
      engine.setPlaybackRate(rate);
    },

    // ── Methods ──
    play(): Promise<void> {
      state.ended = false;
      startTimeupdateTimer();
      emit('play');
      // Engine.play never rejects; keep the promise unrejected either way so
      // callers awaiting play() behave exactly like a real element.
      return engine
        .play()
        .then(() => {
          emit('playing');
        })
        .catch(() => undefined);
    },
    pause(): void {
      if (!engine.isPlaying) return;
      engine.pause();
      stopTimeupdateTimer();
      emit('pause');
      emit('timeupdate');
    },
    load(): void {
      // no-op — the engine already holds the parsed data
    },
    canPlayType(type: string): string {
      return /midi/i.test(type) ? 'probably' : '';
    },
    addEventListener(
      type: string,
      listener: FakeListener | EventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ): void {
      if (!type || !listener) return;
      const fn = typeof listener === 'function' ? (listener as FakeListener) : (event: Event) => listener.handleEvent(event);
      const once = typeof options === 'object' && options?.once === true;
      const list = listeners.get(type) ?? [];
      list.push({ fn, once });
      listeners.set(type, list);
    },
    removeEventListener(
      type: string,
      listener: FakeListener | EventListenerObject | null,
    ): void {
      if (!type || !listener) return;
      const list = listeners.get(type);
      if (!list) return;
      const fn = typeof listener === 'function' ? (listener as FakeListener) : (event: Event) => listener.handleEvent(event);
      const idx = list.findIndex(entry => entry.fn === fn);
      if (idx >= 0) list.splice(idx, 1);
    },
    dispatchEvent(event: { type: string; [key: string]: unknown }): boolean {
      emit(event.type);
      return true;
    },
  };

  const el = element as unknown as HTMLAudioElement & MidiAudioElement;

  // Metadata is available immediately (synchronous parse) — announce it so
  // 'loadedmetadata'/'canplay' waiters (useGameMedia) settle instantly.
  emit('loadedmetadata');
  emit('durationchange');
  emit('canplay');

  return el;
}
