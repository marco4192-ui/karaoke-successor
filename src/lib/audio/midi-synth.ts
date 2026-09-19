/**
 * MIDI/KAR playback engine — Web Audio GM-style synthesizer
 *
 * Songs whose music file (#MP3) is a .mid/.midi/.kar file cannot be decoded
 * by the browser's <audio> element. This engine parses the MIDI file (via
 * parseMIDIKaraoke — READ-ONLY import, never modified here), flattens all
 * tracks into a time-sorted note event list (absolute ms, tempo-map aware)
 * and renders them with lightweight per-instrument voice recipes through a
 * shared AudioContext.
 *
 * Design goals: pleasant + in-tune + lightweight — NOT realism.
 *
 * Playback model:
 * - Lookahead scheduler: setInterval(50ms) schedules events up to 300ms
 *   ahead using AudioContext time (avoids rAF jitter / tab-throttling).
 * - positionMs = offsetMs + (ctx.currentTime − ctxStart) × rate × 1000.
 * - pause() kills scheduled voices (they are tracked) and stores position.
 * - onEnded fires once when playback passes the last event (+ tail).
 */

import { parseMIDIKaraoke, type MIDIKaraokeData } from '@/lib/parsers/multi-format-import';
import { midiPitchToFrequency } from '@/lib/utils';

// ─── MIDI music detection ───────────────────────────────────────────

const MIDI_EXT_RE = /\.(mid|midi|kar)(?:[?#]|$)/i;
const MIDI_MIME_RE = /^data:(?:audio|application)\/(?:x-)?midi/i;

/** True when the URL itself identifies a MIDI/KAR file (extension or data: MIME). */
export function isMidiFileUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (MIDI_MIME_RE.test(url)) return true;
  try {
    const parsed = new URL(url, 'https://midi.local/');
    if (MIDI_EXT_RE.test(parsed.pathname)) return true;
  } catch {
    // Not a parseable URL (e.g. bare Windows path) — test the raw string.
  }
  const withoutFragment = url.split('?')[0].split('#')[0];
  return MIDI_EXT_RE.test(withoutFragment);
}

/**
 * True when the song's MUSIC source is a MIDI/KAR file that must be played
 * through the synth engine instead of an <audio> element.
 *
 * Blob URLs (browser IndexedDB media) carry no extension, so the song's
 * #MP3 file name (mp3File) / relativeAudioPath act as a second signal.
 */
export function isMidiSongMusic(
  song: { mp3File?: string; relativeAudioPath?: string; audioUrl?: string } | null | undefined,
  audioUrl?: string | null,
): boolean {
  const url = audioUrl ?? song?.audioUrl;
  if (url && isMidiFileUrl(url)) return true;
  const named = song?.mp3File ?? song?.relativeAudioPath;
  if (named) {
    const clean = named.split(/[/\\]/).pop() ?? '';
    return /\.(mid|midi|kar)$/i.test(clean.trim());
  }
  return false;
}

// ─── Program-change extraction (light second pass) ──────────────────

/**
 * Extract GM program-change (0xC0) events per track, per channel.
 *
 * parseMIDIKaraoke (multi-format-import.ts — read-only for this module)
 * does not expose program numbers, so this walks the raw MTrk chunks a
 * second time and records the last program seen per (track, channel).
 * Malformed data simply yields missing programs → default GM mapping.
 */
function extractTrackPrograms(buffer: ArrayBuffer): Array<Map<number, number>> {
  const programs: Array<Map<number, number>> = [];
  try {
    const view = new DataView(buffer);
    if (buffer.byteLength < 14) return programs;
    const header = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (header !== 'MThd') return programs;
    const numTracks = view.getUint16(10, false);
    if (numTracks === 0) return programs;

    let offset = 14;
    for (let t = 0; t < numTracks; t++) {
      const trackPrograms = new Map<number, number>();
      programs.push(trackPrograms);
      if (offset + 8 > buffer.byteLength) break;
      const trackHeader = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
      if (trackHeader !== 'MTrk') break;
      const trackLength = view.getUint32(offset + 4, false);
      offset += 8;
      const trackEnd = Math.min(offset + trackLength, buffer.byteLength);

      let runningStatus = 0;
      while (offset < trackEnd) {
        // Variable-length delta time (skipped — position irrelevant here).
        let byte = 0;
        do {
          if (offset >= trackEnd) break;
          byte = view.getUint8(offset++);
        } while (byte & 0x80);

        if (offset >= trackEnd) break;
        let status = view.getUint8(offset++);
        if (status < 0x80) {
          if (runningStatus === 0) break; // malformed — no running status
          offset--;
          status = runningStatus;
        } else if (status < 0xf0) {
          runningStatus = status;
        }

        if (status === 0xff || status === 0xf0 || status === 0xf7) {
          // Meta (skip metaType) / SysEx — VLQ length + payload.
          let length = 0;
          if (status === 0xff) offset++; // metaType
          do {
            if (offset >= trackEnd) break;
            byte = view.getUint8(offset++);
            length = (length << 7) | (byte & 0x7f);
          } while (byte & 0x80);
          offset = Math.min(offset + length, trackEnd);
        } else {
          const type = status & 0xf0;
          const dataLen = type === 0xc0 || type === 0xd0 ? 1 : 2;
          if (type === 0xc0 && offset < trackEnd) {
            trackPrograms.set(status & 0x0f, view.getUint8(offset));
          }
          offset = Math.min(offset + dataLen, trackEnd);
        }
      }

      offset = trackEnd; // resync to the next MTrk header
    }
  } catch {
    // Malformed file — fall back to default GM programs.
  }
  return programs;
}

// ─── Voice recipes (GM program groups) ──────────────────────────────

type Recipe = 'lead' | 'bass' | 'keys' | 'drum';

interface ToneRecipe {
  /** Oscillator stack: [type, detune cents, gain mix]. */
  oscs: Array<[OscillatorType, number, number]>;
  attack: number;
  release: number;
  /** Sustain level (fraction of peak) after the attack. */
  sustain: number;
  /** Output level multiplier. */
  level: number;
  /** Optional lowpass filter for the voice. */
  filterFreq?: number;
  filterQ?: number;
  /** Minimum audible duration (seconds). */
  minDur: number;
}

const RECIPES: Record<Exclude<Recipe, 'drum'>, ToneRecipe> = {
  // melody/lead: triangle + slightly detuned sine — soft ADSR (a=0.02, r=0.15)
  lead: {
    oscs: [['triangle', 0, 1], ['sine', 6, 0.55]],
    attack: 0.02,
    release: 0.15,
    sustain: 0.85,
    level: 1,
    minDur: 0.08,
  },
  // bass (GM 32-39): lowpass-filtered sawtooth
  bass: {
    oscs: [['sawtooth', 0, 1]],
    attack: 0.01,
    release: 0.12,
    sustain: 0.8,
    level: 0.75,
    filterFreq: 750,
    filterQ: 0.9,
    minDur: 0.06,
  },
  // keys/strings/organ (others): softer sine+triangle, longer attack
  keys: {
    oscs: [['sine', 0, 1], ['triangle', 0, 0.4]],
    attack: 0.08,
    release: 0.4,
    sustain: 0.7,
    level: 0.55,
    minDur: 0.1,
  },
};

function recipeFor(program: number, isDrum: boolean, isMelodyTrack: boolean): Recipe {
  if (isDrum) return 'drum';
  if (isMelodyTrack) return 'lead';
  if (program >= 32 && program <= 39) return 'bass';
  if (program <= 15 || (program >= 80 && program <= 87)) return 'lead'; // lead synths
  return 'keys';
}

type DrumKind = 'kick' | 'snare' | 'hat' | 'tom' | 'cymbal';

function drumKind(pitch: number): DrumKind {
  if (pitch === 35 || pitch === 36) return 'kick';
  if (pitch === 38 || pitch === 39 || pitch === 40) return 'snare';
  if (pitch >= 41 && pitch <= 50) return 'tom';
  if (pitch === 46 || pitch === 49 || pitch === 51 || pitch === 57 || pitch === 59) return 'cymbal';
  return 'hat'; // 42/44 closed hats + everything else → tick
}

// ─── Synth event list ───────────────────────────────────────────────

export interface MidiSynthEvent {
  startMs: number;
  endMs: number;
  pitch: number;
  velocity: number;
  program: number;
  channel: number;
  isDrum: boolean;
  recipe: Recipe;
}

/** Flatten a parsed MIDI file into a time-sorted synth event list. */
export function buildMidiSynthEvents(data: MIDIKaraokeData, buffer: ArrayBuffer): MidiSynthEvent[] {
  const trackPrograms = extractTrackPrograms(buffer);
  const events: MidiSynthEvent[] = [];

  for (const track of data.tracks) {
    if (track.noteCount === 0) continue;
    const channel = track.channels.length > 0 ? track.channels[0] : 0;
    const isDrum = track.isDrum || channel === 9; // GM: channel 10 (index 9) = drums
    const program = isDrum ? 0 : (trackPrograms[track.index]?.get(channel) ?? 0);
    const recipe = recipeFor(program, isDrum, track.index === data.melodyTrackIndex);
    for (const note of track.notes) {
      const durationMs = Math.max(60, note.durationMs); // make 0-length notes audible
      events.push({
        startMs: note.startTimeMs,
        endMs: note.startTimeMs + durationMs,
        pitch: note.pitch,
        velocity: note.velocity,
        program,
        channel,
        isDrum,
        recipe,
      });
    }
  }

  events.sort((a, b) => a.startMs - b.startMs || a.pitch - b.pitch);
  return events;
}

// ─── AudioContext singleton ─────────────────────────────────────────

let sharedContext: AudioContext | null = null;
const noiseBuffers = new WeakMap<AudioContext, AudioBuffer>();

function getSynthContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!sharedContext) sharedContext = new Ctor();
    return sharedContext;
  } catch {
    return null;
  }
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const cached = noiseBuffers.get(ctx);
  if (cached) return cached;
  const len = Math.floor(ctx.sampleRate * 0.5); // 0.5s white noise
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) channel[i] = Math.random() * 2 - 1;
  noiseBuffers.set(ctx, buffer);
  return buffer;
}

// ─── Voice bookkeeping ──────────────────────────────────────────────

interface Voice {
  kill: (_at: number) => void;
}

interface SchedulerOptions {
  /** setInterval period for the lookahead scheduler (ms). */
  tickMs?: number;
  /** How far ahead events are scheduled (ms). */
  lookaheadMs?: number;
  /** Maximum simultaneous voices — oldest are dropped beyond this. */
  maxVoices?: number;
}

const DEFAULTS: Required<SchedulerOptions> = { tickMs: 50, lookaheadMs: 300, maxVoices: 24 };

// ─── Engine ─────────────────────────────────────────────────────────

export class MidiSynthEngine {
  /** Time-sorted note events (absolute ms). */
  private readonly events: MidiSynthEvent[];
  /** Total playback duration (last event end + tail, in ms). */
  readonly durationMs: number;
  /** Number of note events (diagnostics/testing). */
  readonly noteCount: number;

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private readonly tickMs: number;
  private readonly lookaheadMs: number;
  private readonly maxVoices: number;

  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly voices = new Set<Voice>();

  private _playing = false;
  private _volume = 1;
  private _muted = false;
  private _rate = 1;
  /** Position (ms) at ctxStart — the basis of the time→context mapping. */
  private offsetMs = 0;
  private ctxStart = 0;
  /** Position while paused / before first play. */
  private pausedPosMs = 0;
  private nextIdx = 0;
  private endedFired = false;

  /** Fired once when playback passes the last event + tail. */
  onEnded: (() => void) | null = null;

  constructor(buffer: ArrayBuffer, options?: SchedulerOptions) {
    const data: MIDIKaraokeData | null = parseMIDIKaraoke(buffer);
    if (!data) {
      throw new Error('[MidiSynthEngine] Not a parseable MIDI/KAR file');
    }
    this.events = buildMidiSynthEvents(data, buffer);
    let lastEnd = 0;
    for (const ev of this.events) {
      if (ev.endMs > lastEnd) lastEnd = ev.endMs;
    }
    // +800ms tail so the final release/reverb-ish decay is not cut off.
    this.durationMs = this.events.length > 0 ? lastEnd + 800 : 1000;
    this.noteCount = this.events.length;
    const opts = { ...DEFAULTS, ...options };
    this.tickMs = opts.tickMs;
    this.lookaheadMs = opts.lookaheadMs;
    this.maxVoices = opts.maxVoices;
  }

  // ── Transport state ──

  get isPlaying(): boolean { return this._playing; }
  get volume(): number { return this._volume; }
  get muted(): boolean { return this._muted; }
  get playbackRate(): number { return this._rate; }

  /** Current position in ms (AudioContext-time based while playing). */
  get positionMs(): number {
    if (!this._playing || !this.ctx) return this.pausedPosMs;
    return this.offsetMs + (this.ctx.currentTime - this.ctxStart) * this._rate * 1000;
  }

  // ── Controls ──

  /** Start (or restart) playback from the given position. Never throws. */
  async play(fromMs?: number): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { /* no user activation yet — proceed */ }
    }
    const startAt = fromMs ?? this.pausedPosMs;
    this.startAt(startAt);
  }

  /** Pause playback, cancel scheduled voices and remember the position. */
  pause(): void {
    if (!this._playing) return;
    this.pausedPosMs = this.positionMs;
    this._playing = false;
    this.killAllVoices();
    this.stopTimer();
  }

  /** Seek to a position (keeps playing when playing, otherwise parked). */
  seek(ms: number): void {
    const clamped = Math.min(Math.max(ms, 0), this.durationMs);
    if (this._playing) {
      this.startAt(clamped);
    } else {
      this.pausedPosMs = clamped;
      if (clamped < this.durationMs) this.endedFired = false;
    }
  }

  setVolume(v: number): void {
    this._volume = Math.min(Math.max(Number.isFinite(v) ? v : 1, 0), 1);
    this.applyMasterGain();
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    this.applyMasterGain();
  }

  /**
   * Set the playback rate (0.25–4). While playing, the time mapping is
   * re-based so the change applies immediately without a position jump.
   */
  setPlaybackRate(rate: number): void {
    const clamped = Number.isFinite(rate) ? Math.min(Math.max(rate, 0.0625), 8) : 1;
    if (clamped === this._rate) return;
    if (this._playing && this.ctx) {
      const nowPos = this.positionMs; // with the OLD rate
      this._rate = clamped;
      this.offsetMs = nowPos;
      this.ctxStart = this.ctx.currentTime;
      this.nextIdx = this.lowerBound(nowPos); // reschedule window at new rate
      this.killAllVoices();
      // Events already scheduled at the old rate are killed above; the next
      // tick re-schedules them at the new rate.
    } else {
      this._rate = clamped;
    }
  }

  /** Stop everything and release per-instance resources (context is shared). */
  dispose(): void {
    this._playing = false;
    this.killAllVoices();
    this.stopTimer();
    if (this.master) {
      try { this.master.disconnect(); } catch { /* already disconnected */ }
      this.master = null;
    }
  }

  // ── Internals ──

  private ensureContext(): AudioContext | null {
    const ctx = getSynthContext();
    if (!ctx) return null;
    this.ctx = ctx;
    if (!this.master) {
      const master = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      // Gentle glue compressor — keeps many simultaneous voices from clipping.
      comp.threshold.value = -18;
      comp.knee.value = 20;
      comp.ratio.value = 6;
      comp.attack.value = 0.004;
      comp.release.value = 0.18;
      master.connect(comp);
      comp.connect(ctx.destination);
      this.master = master;
      this.applyMasterGain();
    }
    return ctx;
  }

  private applyMasterGain(): void {
    if (!this.master || !this.ctx) return;
    const target = this._muted ? 0 : this._volume;
    try {
      this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    } catch {
      this.master.gain.value = target;
    }
  }

  private startAt(ms: number): void {
    this.killAllVoices();
    this.endedFired = false;
    this.offsetMs = ms;
    this.pausedPosMs = ms;
    if (this.ctx) this.ctxStart = this.ctx.currentTime;
    this.nextIdx = this.lowerBound(ms);
    this._playing = true;
    this.startTimer();
    this.tick(); // schedule the first window immediately
  }

  private startTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.tickMs);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** First event index with startMs >= ms (binary search). */
  private lowerBound(ms: number): number {
    let lo = 0;
    let hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.events[mid].startMs < ms) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private ctxTimeFor(eventMs: number): number {
    // ctxStart + (eventMs − offsetMs) / (rate × 1000)
    return this.ctxStart + (eventMs - this.offsetMs) / (this._rate * 1000);
  }

  private tick(): void {
    if (!this._playing || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const nowPos = this.positionMs;
    const horizon = nowPos + this.lookaheadMs;

    while (this.nextIdx < this.events.length) {
      const ev = this.events[this.nextIdx];
      if (ev.startMs >= horizon) break;
      this.nextIdx++;
      if (ev.endMs <= nowPos) continue; // event fully in the past — skip
      let when = this.ctxTimeFor(ev.startMs);
      if (when < ctx.currentTime) when = ctx.currentTime + 0.001; // late — play now
      if (this.voices.size >= this.maxVoices) this.dropOldestVoice();
      this.scheduleVoice(ev, when);
    }

    if (!this.endedFired && nowPos >= this.durationMs) {
      this.endedFired = true;
      this._playing = false;
      this.pausedPosMs = this.durationMs;
      this.killAllVoices();
      this.stopTimer();
      try { this.onEnded?.(); } catch { /* listener errors must not break the engine */ }
    }
  }

  private dropOldestVoice(): void {
    const oldest = this.voices.values().next().value;
    if (oldest) {
      this.voices.delete(oldest);
      if (this.ctx) oldest.kill(this.ctx.currentTime);
    }
  }

  private killAllVoices(): void {
    if (this.voices.size === 0) return;
    const ctx = this.ctx;
    const toKill = Array.from(this.voices);
    this.voices.clear();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const voice of toKill) {
      try { voice.kill(now); } catch { /* ignore */ }
    }
  }

  private scheduleVoice(ev: MidiSynthEvent, when: number): void {
    if (ev.isDrum) {
      this.scheduleDrum(ev, when);
    } else {
      this.scheduleTone(ev, when);
    }
  }

  private registerVoice(nodes: Array<OscillatorNode | AudioBufferSourceNode>, gain: GainNode, stopAt: number): void {
    const voice: Voice = {
      kill: (at: number) => {
        try {
          gain.gain.cancelScheduledValues(at);
          gain.gain.setTargetAtTime(0.0001, at, 0.02);
          for (const osc of nodes) osc.stop(at + 0.06);
        } catch { /* already stopped */ }
      },
    };
    this.voices.add(voice);
    nodes[0].onended = () => { this.voices.delete(voice); };
    // Safety net: if onended never fires (killed voice), prune at stopAt + slack.
    const pruneMs = Math.max(0, (stopAt - (this.ctx?.currentTime ?? 0)) * 1000) + 500;
    setTimeout(() => { this.voices.delete(voice); }, pruneMs);
  }

  private scheduleTone(ev: MidiSynthEvent, when: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    if (ev.recipe === 'drum') return; // safety — drums go through scheduleDrum
    const recipe = RECIPES[ev.recipe];
    const freq = midiPitchToFrequency(ev.pitch);
    if (!Number.isFinite(freq) || freq <= 0) return;

    const durSec = Math.max(recipe.minDur, (ev.endMs - ev.startMs) / 1000) / this._rate;
    const t0 = when;
    const tEnd = t0 + durSec;
    const peak = Math.max(0.0005, recipe.level * (0.25 + 0.75 * (ev.velocity / 127)));

    const gain = ctx.createGain();
    let tail: AudioNode = gain;
    if (recipe.filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = recipe.filterFreq;
      filter.Q.value = recipe.filterQ ?? 0.7;
      gain.connect(filter);
      tail = filter;
    }
    tail.connect(master);

    const oscs: OscillatorNode[] = [];
    for (const [type, detune, mix] of recipe.oscs) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      if (recipe.oscs.length > 1) {
        const oscGain = ctx.createGain();
        oscGain.gain.value = mix;
        osc.connect(oscGain);
        oscGain.connect(gain);
      } else {
        osc.connect(gain);
      }
      oscs.push(osc);
    }

    // Envelope: attack → sustain decay → release at note end.
    const attack = Math.min(recipe.attack, durSec * 0.5);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + Math.max(attack, 0.005));
    gain.gain.setTargetAtTime(peak * recipe.sustain, t0 + Math.max(attack, 0.005) + 0.01, 0.15);
    gain.gain.setTargetAtTime(0.0001, tEnd, Math.max(recipe.release / 3, 0.03));

    const stopAt = tEnd + recipe.release + 0.08;
    for (const osc of oscs) {
      osc.start(t0);
      osc.stop(stopAt);
    }
    this.registerVoice(oscs, gain, stopAt);
  }

  private scheduleDrum(ev: MidiSynthEvent, when: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t0 = when;
    const vel = 0.3 + 0.7 * (ev.velocity / 127);
    const kind = drumKind(ev.pitch);

    if (kind === 'kick') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t0);
      osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.1);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.9 * vel, t0);
      gain.gain.setTargetAtTime(0.0001, t0 + 0.005, 0.045);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + 0.25);
      this.registerVoice([osc], gain, t0 + 0.25);
      return;
    }

    if (kind === 'tom') {
      const freq = midiPitchToFrequency(ev.pitch);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.72, t0 + 0.14);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5 * vel, t0);
      gain.gain.setTargetAtTime(0.0001, t0 + 0.01, 0.06);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + 0.35);
      this.registerVoice([osc], gain, t0 + 0.35);
      return;
    }

    // Noise-based: snare (bandpass, body) / hat (short highpass) / cymbal (long).
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    let stopAt = t0 + 0.1;
    if (kind === 'snare') {
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 0.8;
      gain.gain.setValueAtTime(0.55 * vel, t0);
      gain.gain.setTargetAtTime(0.0001, t0 + 0.005, 0.06);
      stopAt = t0 + 0.3;
      // Body: low triangle thump under the noise.
      const body = ctx.createOscillator();
      body.type = 'triangle';
      body.frequency.value = 190;
      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.3 * vel, t0);
      bodyGain.gain.setTargetAtTime(0.0001, t0 + 0.004, 0.05);
      body.connect(bodyGain);
      bodyGain.connect(master);
      body.start(t0);
      body.stop(t0 + 0.25);
      // Register the body as part of the same voice (killed together).
      this.registerVoice([body], bodyGain, t0 + 0.25);
    } else if (kind === 'cymbal') {
      filter.type = 'highpass';
      filter.frequency.value = 5500;
      gain.gain.setValueAtTime(0.22 * vel, t0);
      gain.gain.setTargetAtTime(0.0001, t0 + 0.02, 0.18);
      stopAt = t0 + 0.9;
    } else { // hat
      filter.type = 'highpass';
      filter.frequency.value = 7500;
      gain.gain.setValueAtTime(0.16 * vel, t0);
      gain.gain.setTargetAtTime(0.0001, t0 + 0.002, 0.012);
      stopAt = t0 + 0.08;
    }

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.start(t0);
    noise.stop(stopAt);
    this.registerVoice([noise], gain, stopAt);
  }
}
