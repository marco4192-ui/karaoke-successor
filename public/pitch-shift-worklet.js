/**
 * AfterTen — Pitch-Shift AudioWorkletProcessor (R105)
 *
 * Time-domain pitch shifter ("crossfading delay lines", J.O. Smith style):
 * two read taps into a ring buffer, half a grain apart, power-complementary
 * sin/cos crossfade windows. Each tap's read distance cycles 0..grain while
 * the read pointer advances at `ratio` × the write speed:
 *
 *   df/dn = (1 - ratio) / grain        (phase advance per output sample)
 *   d1    = f * grain                  (tap A distance behind the writer)
 *   f2    = (f + 0.5) mod 1            (tap B phase)
 *   wA    = sin(PI * f)                (zero at f = 0  -> tap A jump point)
 *   wB    = |cos(PI * f)|              (zero at f = .5 -> tap B jump point)
 *   out   = wA * read(d1) + wB * read(d2)
 *
 * wA^2 + wB^2 = 1 (constant power), and each tap jumps its read distance
 * from grain -> 0 exactly when its window weight is zero, so the jump is
 * inaudible. Latency ≈ grain/2 (~50 ms at 100 ms grains).
 *
 * ratio = 2^(semitones / 12) — pitch changes, tempo stays untouched.
 * Near-unity ratio falls back to a bit-exact passthrough (no comb coloration).
 *
 * Messages: { type: 'pitch', semitones: number }  (-12..+12, clamped)
 */

const MAX_SEMITONES = 12;

class ATPitchShiftProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = 1;
    // 100 ms grains: short enough for low smear, long enough to avoid
    // tremolo artifacts on low frequencies (typical pop music range).
    this.grain = Math.max(256, Math.round(sampleRate * 0.1));
    // Ring buffer must hold grain (max tap distance) + interpolation slack.
    this.size = this.grain * 2;
    this.bufL = new Float32Array(this.size);
    this.bufR = new Float32Array(this.size);
    this.write = 0;
    this.phase = 0;

    this.port.onmessage = (e) => {
      const d = e.data;
      if (d && d.type === 'pitch' && Number.isFinite(d.semitones)) {
        const semi = Math.max(-MAX_SEMITONES, Math.min(MAX_SEMITONES, d.semitones));
        this.ratio = Math.pow(2, semi / 12);
      }
    };
  }

  /** Linear-interpolated read `dist` samples behind the write pointer. */
  readSample(buf, dist) {
    let pos = this.write - dist;
    while (pos < 0) pos += this.size;
    while (pos >= this.size) pos -= this.size;
    const i0 = pos | 0;
    const i1 = i0 + 1 >= this.size ? 0 : i0 + 1;
    const frac = pos - i0;
    return buf[i0] * (1 - frac) + buf[i1] * frac;
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const outL = output[0];
    const outR = output.length > 1 ? output[1] : output[0];
    const input = inputs[0];
    const inL = input && input.length > 0 ? input[0] : null;
    const inR = input && input.length > 1 ? input[1] : inL;

    const n = outL.length;
    const passthrough = Math.abs(this.ratio - 1) < 1e-6;

    if (passthrough) {
      for (let i = 0; i < n; i++) {
        const xL = inL ? inL[i] : 0;
        const xR = inR ? inR[i] : 0;
        this.bufL[this.write] = xL;
        this.bufR[this.write] = xR;
        outL[i] = xL;
        outR[i] = xR;
        this.write = this.write + 1 >= this.size ? 0 : this.write + 1;
      }
      return true;
    }

    const phaseStep = (1 - this.ratio) / this.grain;
    for (let i = 0; i < n; i++) {
      this.bufL[this.write] = inL ? inL[i] : 0;
      this.bufR[this.write] = inR ? inR[i] : 0;

      const f = this.phase;
      const f2 = f + 0.5 >= 1 ? f - 0.5 : f + 0.5;
      const wA = Math.sin(Math.PI * f);
      const wB = Math.abs(Math.cos(Math.PI * f));
      const d1 = f * this.grain;
      const d2 = f2 * this.grain;

      outL[i] = wA * this.readSample(this.bufL, d1) + wB * this.readSample(this.bufL, d2);
      outR[i] = wA * this.readSample(this.bufR, d1) + wB * this.readSample(this.bufR, d2);

      this.phase += phaseStep;
      if (this.phase >= 1) this.phase -= 1;
      else if (this.phase < 0) this.phase += 1;

      this.write = this.write + 1 >= this.size ? 0 : this.write + 1;
    }
    return true;
  }
}

registerProcessor('at-pitch-shift', ATPitchShiftProcessor);
