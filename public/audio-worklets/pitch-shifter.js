/**
 * Pitch-shifter AudioWorklet (Voice FX Studio — feature idea #16).
 *
 * Classic granular 2-tap delay-line pitch shifter:
 * - A ring buffer stores the input; two read taps run at a delay that drifts
 *   linearly with (1 − ratio), where ratio = 2^(semitones/12).
 * - The two taps are offset by half a grain; their gains form a
 *   sin/cos pair (g1 = sin(π·phase), g2 = cos(π·phase)) whose power sums to a
 *   constant 1 — the gain notch of each tap coincides exactly with the other
 *   tap's delay wrap, so the crossfade is click-free.
 * - ratio == 1 (0 semitones) bypasses to a plain passthrough to avoid the
 *   comb-filter artifacts two static delays would produce.
 *
 * Parameters (k-rate):
 * - semitones: −24..+24 — total shift of this node.
 *
 * The node does NOT do pitch tracking. "Auto-tune light" is layered on top in
 * the host (voice-fx.ts): the game loop feeds the detected pitch and the host
 * sets `semitones` to the (clamped) distance to the nearest chromatic note.
 */

const GRAIN = 3072;      // ~70 ms at 44.1 kHz — long enough for smooth vocals
const BUF_LEN = 16384;   // ring buffer, power of two (mask addressing)

class PitchShifterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'semitones',
        defaultValue: 0,
        minValue: -24,
        maxValue: 24,
        automationRate: 'k-rate',
      },
    ];
  }

  constructor() {
    super();
    this.buffers = [];
    this.writeIdx = 0;
    /** 0..1 sawtooth of the read delay (in grain units). */
    this.phase = 0;
  }

  _buf(ch) {
    if (!this.buffers[ch]) this.buffers[ch] = new Float32Array(BUF_LEN);
    return this.buffers[ch];
  }

  /** Linear-interpolated ring-buffer read at (writeIdx - delay). */
  _read(buf, writeIdx, delay) {
    const pos = writeIdx - delay;
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    const mask = BUF_LEN - 1;
    const a = buf[((i0 % BUF_LEN) + BUF_LEN) & mask];
    const b = buf[(((i0 + 1) % BUF_LEN) + BUF_LEN) & mask];
    return a + (b - a) * frac;
  }

  process(inputs, outputs, params) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const input = inputs[0];
    const numCh = output.length;
    const blockLen = output[0].length;
    const semis = params.semitones[0];

    // Passthrough at zero shift (avoids comb filtering of two static taps).
    if (Math.abs(semis) < 0.01) {
      for (let ch = 0; ch < numCh; ch++) {
        const inCh = input && input[ch] ? input[ch] : null;
        const outCh = output[ch];
        for (let i = 0; i < blockLen; i++) outCh[i] = inCh ? inCh[i] : 0;
      }
      return true;
    }

    const ratio = Math.pow(2, semis / 12);
    // Delay drift per sample in grain units: ratio>1 (up) → delay shrinks.
    const drift = (1 - ratio) / GRAIN;

    for (let i = 0; i < blockLen; i++) {
      const d1 = this.phase * GRAIN;
      const d2 = ((this.phase + 0.5) % 1) * GRAIN;
      const g1 = Math.sin(Math.PI * this.phase);
      const g2 = Math.cos(Math.PI * this.phase);

      for (let ch = 0; ch < numCh; ch++) {
        const inCh = input && input[ch] ? input[ch] : null;
        const buf = this._buf(ch);
        const outCh = output[ch];
        buf[this.writeIdx & (BUF_LEN - 1)] = inCh ? inCh[i] : 0;
        outCh[i] =
          this._read(buf, this.writeIdx, d1) * g1 +
          this._read(buf, this.writeIdx, d2) * g2;
      }

      this.writeIdx = (this.writeIdx + 1) & 0x7fffffff;
      let phase = this.phase + drift;
      if (phase >= 1) phase -= 1;
      else if (phase < 0) phase += 1;
      this.phase = phase;
    }

    return true;
  }
}

registerProcessor('pitch-shifter', PitchShifterProcessor);
