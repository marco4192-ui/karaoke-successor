/**
 * Voice FX Studio (feature idea #16) — live microphone effects:
 * pitch correction ("auto-tune light"), harmonizer and character effects.
 *
 * ── Signal flow (per mic chain, plugged into AudioEffectsEngine) ──
 *
 *   input ──► dry ─────────────────────────────────────────► out
 *   input ──► shifterCorrection ──► corrGain ──────────────► out   (pitch fix)
 *   input ──► shifterHarmony ────► harmGain ───────────────► out   (interval)
 *   input ──► [mode FX] ──► fxDry*? ──► fxGain ────────────► out   (character)
 *
 * - The CHARACTER FX (robot / phone / chorus / megaphone) are built as four
 *   PARALLEL paths with switchable gains — mode changes never reconnect the
 *   graph (zero glitches, no async rebuild).
 * - Pitch correction is CHROMATIC ("auto-tune light"): the game loop feeds
 *   the detected fundamental; the shifter receives the clamped distance to
 *   the nearest semitone, scaled by the user's strength. Glided via
 *   linear-ramp on the AudioParam to avoid zipper noise.
 * - The pitch DETECTION itself runs on the pristine stream (upstream of this
 *   chain), so the SCORE always judges the real voice — only the monitor mix
 *   gets corrected. Honest scoring, polished sound.
 *
 * Availability: AudioWorklets (Chrome 66+, Firefox 76+, Safari 14.1+). When
 * the module fails to load, `VoiceFxChain.create()` resolves to null and the
 * UI hides the studio with a note — playback is never affected.
 */

/** Character effect modes. */
export type VoiceFxMode = 'off' | 'robot' | 'phone' | 'chorus' | 'megaphone';

export interface VoiceFxSettings {
  mode: VoiceFxMode;
  /** 0..1 — character FX intensity. */
  fxMix: number;
  /** Harmonizer interval in semitones (0 = off, ±12). */
  harmonyInterval: number;
  /** 0..1 — harmonizer level. */
  harmonyMix: number;
  /** 0..1 — chromatic correction strength. */
  correctionStrength: number;
}

export const DEFAULT_VOICE_FX: VoiceFxSettings = {
  mode: 'off',
  fxMix: 0.6,
  harmonyInterval: 0,
  harmonyMix: 0.35,
  correctionStrength: 0,
};

// ---------------------------------------------------------------------------
// Worklet module loading (once per AudioContext)
// ---------------------------------------------------------------------------

const workletLoadedContexts = new WeakSet<AudioContext>();
let workletLoadPromise: Promise<boolean> | null = null;

/** True when the current runtime supports AudioWorklets at all. */
export function isVoiceFxSupported(): boolean {
  return (
    typeof window !== 'undefined'
    && typeof AudioWorkletNode === 'function'
    && typeof AudioContext !== 'undefined'
  );
}

async function ensureWorkletLoaded(ctx: AudioContext): Promise<boolean> {
  if (workletLoadedContexts.has(ctx)) return true;
  if (workletLoadPromise) return workletLoadPromise;
  workletLoadPromise = (async () => {
    try {
      await ctx.audioWorklet.addModule('/audio-worklets/pitch-shifter.js');
      workletLoadedContexts.add(ctx);
      return true;
    } catch {
      return false;
    } finally {
      // Reset so a later context can retry (e.g. after an engine rebuild).
      setTimeout(() => { workletLoadPromise = null; }, 1000);
    }
  })();
  return workletLoadPromise;
}

// ---------------------------------------------------------------------------
// Chromatic correction helper
// ---------------------------------------------------------------------------

/** MIDI note number of a frequency. */
function hzToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

/**
 * Semitone offset from `detectedHz` to the nearest chromatic note, clamped
 * to ±1 semitone and scaled by strength. Returns 0 when out of voice range.
 */
export function chromaticCorrectionOffset(detectedHz: number, strength: number): number {
  if (!Number.isFinite(detectedHz) || detectedHz < 60 || detectedHz > 1200) return 0;
  const midi = hzToMidi(detectedHz);
  const nearest = Math.round(midi);
  const cents = (midi - nearest) * 100; // ±50
  // Full correction of the (max ±0.5 semitone) distance × strength.
  const semis = -(cents / 100) * Math.min(1, Math.max(0, strength));
  return Math.max(-1, Math.min(1, semis));
}

// ---------------------------------------------------------------------------
// The FX chain
// ---------------------------------------------------------------------------

export class VoiceFxChain {
  /** Everything downstream connects here. */
  readonly output: GainNode;

  private readonly ctx: AudioContext;
  private readonly input: GainNode;

  // Pitch correction path
  private readonly shifterCorrection: AudioWorkletNode | null;
  private readonly corrGain: GainNode;

  // Harmonizer path
  private readonly shifterHarmony: AudioWorkletNode | null;
  private readonly harmGain: GainNode;

  // Character FX parallel paths (all built, gated by gains)
  private readonly modeGains: Record<Exclude<VoiceFxMode, 'off'>, GainNode>;
  private readonly fxGain: GainNode;
  private readonly robotOsc: OscillatorNode | null;
  /** Ring-modulator oscillator depth (tracks robot mode intensity). */
  private readonly robotModDepth: GainNode | null;

  private settings: VoiceFxSettings = { ...DEFAULT_VOICE_FX };
  /** Smoothing target for the correction param (set → ramp). */
  private lastCorrectionSemitones = 0;

  private constructor(
    ctx: AudioContext,
    input: GainNode,
    output: GainNode,
    shifterCorrection: AudioWorkletNode | null,
    corrGain: GainNode,
    shifterHarmony: AudioWorkletNode | null,
    harmGain: GainNode,
    modeGains: Record<Exclude<VoiceFxMode, 'off'>, GainNode>,
    fxGain: GainNode,
    robotOsc: OscillatorNode | null,
    robotModDepth: GainNode | null,
  ) {
    this.ctx = ctx;
    this.input = input;
    this.output = output;
    this.shifterCorrection = shifterCorrection;
    this.corrGain = corrGain;
    this.shifterHarmony = shifterHarmony;
    this.harmGain = harmGain;
    this.modeGains = modeGains;
    this.fxGain = fxGain;
    this.robotOsc = robotOsc;
    this.robotModDepth = robotModDepth;
  }

  /**
   * Build a chain. `input` is the mic source; the returned chain's `output`
   * replaces the source for everything downstream. Resolves to null when
   * AudioWorklets are unavailable (caller keeps the pristine path).
   */
  static async create(ctx: AudioContext, source: AudioNode): Promise<VoiceFxChain | null> {
    if (!isVoiceFxSupported()) return null;
    if (!(await ensureWorkletLoaded(ctx))) return null;

    const input = ctx.createGain(); // chain entry
    source.connect(input);

    const output = ctx.createGain();

    // Dry path — always unity (the FX paths add on top, gated by their gains;
    // dry stays audible so the voice never disappears when everything is off).
    const dry = ctx.createGain();
    input.connect(dry);
    dry.connect(output);

    // ── Pitch correction path ──
    const shifterCorrection = new AudioWorkletNode(ctx, 'pitch-shifter', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
    });
    const corrGain = ctx.createGain();
    corrGain.gain.value = 0; // muted until correction is on
    input.connect(shifterCorrection);
    shifterCorrection.connect(corrGain);
    corrGain.connect(output);

    // ── Harmonizer path (fixed interval, own shifter) ──
    const shifterHarmony = new AudioWorkletNode(ctx, 'pitch-shifter', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1],
    });
    const harmGain = ctx.createGain();
    harmGain.gain.value = 0;
    input.connect(shifterHarmony);
    shifterHarmony.connect(harmGain);
    harmGain.connect(output);

    // ── Character FX: four parallel paths, gated by per-mode gains ──
    const fxGain = ctx.createGain();
    fxGain.gain.value = 0; // master gate for the character section
    fxGain.connect(output);

    const modeGains: Record<Exclude<VoiceFxMode, 'off'>, GainNode> = {
      robot: ctx.createGain(),
      phone: ctx.createGain(),
      chorus: ctx.createGain(),
      megaphone: ctx.createGain(),
    };
    for (const g of Object.values(modeGains)) {
      g.gain.value = 0;
      g.connect(fxGain);
    }

    // Robot — ring modulation (signal × 30 Hz sine).
    const robotOsc = ctx.createOscillator();
    robotOsc.type = 'sine';
    robotOsc.frequency.value = 30;
    const robotModDepth = ctx.createGain();
    robotModDepth.gain.value = 0; // oscillator-controlled (ring mod needs gain 0 + osc)
    const robotMod = ctx.createGain(); // multiplier node
    input.connect(robotMod);
    robotOsc.connect(robotModDepth);
    robotModDepth.connect(robotMod.gain); // osc scaled by depth × fxGain…
    robotMod.connect(modeGains.robot);
    robotOsc.start();
    // Depth tracks the robot mode gain so the effect intensity is adjustable.
    // (gain.gain = base 0 + osc×depth — classic ring modulator wiring.)

    // Phone — bandpass 300–3400 Hz.
    const phoneHp = ctx.createBiquadFilter();
    phoneHp.type = 'highpass';
    phoneHp.frequency.value = 300;
    const phoneLp = ctx.createBiquadFilter();
    phoneLp.type = 'lowpass';
    phoneLp.frequency.value = 3400;
    input.connect(phoneHp);
    phoneHp.connect(phoneLp);
    phoneLp.connect(modeGains.phone);

    // Chorus — 25 ms delay, LFO-modulated (±6 ms), mixed 1:1.
    const chorusDelay = ctx.createDelay(0.1);
    chorusDelay.delayTime.value = 0.025;
    const chorusLfo = ctx.createOscillator();
    chorusLfo.type = 'sine';
    chorusLfo.frequency.value = 1.2;
    const chorusLfoGain = ctx.createGain();
    chorusLfoGain.gain.value = 0.006;
    chorusLfo.connect(chorusLfoGain);
    chorusLfoGain.connect(chorusDelay.delayTime);
    chorusLfo.start();
    input.connect(chorusDelay);
    chorusDelay.connect(modeGains.chorus);

    // Megaphone — tanh distortion + bandpass 500–3000 Hz.
    const megaCurve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 511.5) - 1;
      megaCurve[i] = Math.tanh(x * 3);
    }
    const megaShaper = ctx.createWaveShaper();
    megaShaper.curve = megaCurve;
    megaShaper.oversample = '2x';
    const megaBp = ctx.createBiquadFilter();
    megaBp.type = 'bandpass';
    megaBp.frequency.value = 1700;
    megaBp.Q.value = 0.8;
    input.connect(megaShaper);
    megaShaper.connect(megaBp);
    megaBp.connect(modeGains.megaphone);

    return new VoiceFxChain(
      ctx, input, output,
      shifterCorrection, corrGain,
      shifterHarmony, harmGain,
      modeGains, fxGain, robotOsc, robotModDepth,
    );
  }

  /** Apply a full settings snapshot (idempotent, reconnect-free). */
  applySettings(settings: Partial<VoiceFxSettings>): void {
    this.settings = { ...this.settings, ...settings };
    const s = this.settings;

    // Character FX: one path active, master gate = fxMix.
    for (const key of Object.keys(this.modeGains) as Array<Exclude<VoiceFxMode, 'off'>>) {
      this.modeGains[key].gain.value = s.mode === key ? 1 : 0;
    }
    this.fxGain.gain.value = s.mode === 'off' ? 0 : s.fxMix;

    // Robot ring-modulator depth tracks the fx intensity (osc × depth ×
    // input → output; depth 0 = clean, depth 1 = full metallic ring mod).
    if (this.robotModDepth) {
      this.robotModDepth.gain.value = s.mode === 'robot' ? s.fxMix : 0;
    }

    // Harmonizer
    if (this.shifterHarmony) {
      const interval = Math.max(-12, Math.min(12, Math.round(s.harmonyInterval)));
      this.shifterHarmony.parameters.get('semitones')!.value = interval;
    }
    this.harmGain.gain.value =
      s.harmonyInterval !== 0 && s.harmonyMix > 0 ? s.harmonyMix : 0;
  }

  /**
   * Feed the detected pitch (Hz). Drives the chromatic correction: the
   * shifter receives the (clamped, strength-scaled) offset to the nearest
   * semitone, ramped over 40 ms to avoid zipper noise.
   */
  updateDetectedPitch(detectedHz: number | null): void {
    if (!this.shifterCorrection) return;
    const target = detectedHz
      ? chromaticCorrectionOffset(detectedHz, this.settings.correctionStrength)
      : 0;
    // Dead-zone: ignore micro-offsets (< 5 cents) to avoid constant jitter.
    if (Math.abs(target - this.lastCorrectionSemitones) < 0.0005) return;
    this.lastCorrectionSemitones = target;

    const param = this.shifterCorrection.parameters.get('semitones')!;
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(target, now + 0.04);

    // Audible path only while correction is meaningfully engaged.
    this.corrGain.gain.value = this.settings.correctionStrength > 0 ? 1 : 0;
  }

  /** Current snapshot (for UI round-trips). */
  getSettings(): VoiceFxSettings {
    return { ...this.settings };
  }

  dispose(): void {
    try { this.robotOsc?.stop(); } catch { /* already stopped */ }
    try { this.input.disconnect(); } catch { /* ignore */ }
    try { this.output.disconnect(); } catch { /* ignore */ }
  }
}
