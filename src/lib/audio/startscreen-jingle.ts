/**
 * KARAOKE ZERO — Title Theme (Startscreen-Jingle)
 * ================================================
 * Ein prozedural komponierter Jingle, komplett mit der Web Audio API
 * synthetisiert — keine Audiodatei, kein Asset, 100 % lizenzfrei.
 *
 * Komposition (F-Dur, 118 BPM, 4/4):
 *   INTRO (3 Takte, einmalig):
 *     T1  – warmes Pad F + aufsteigender Pentatonik-"Sparkle"-Run
 *     T2  – Karaoke-Fanfare: 3 Brass-Stäbe (F · F · Bb) + langer C-Stab
 *     T3  – Riser (ganzer Takt) + 4-Sechzehntel-Countdown als "3-2-1-ZERO"
 *   LOOP (8 Takte, nahtlos endlos — I–vi–IV–V: F · Dm · Bb · C ×2):
 *     – Four-on-the-floor Kick, Clap auf 2+4, Offbeat-HiHats
 *     – Synth-Bass: Achtel-Pump mit Oktavsprüngen am Taktende
 *     – Offbeat-Pad-Stäbe (Dance-Pump zwischen den Kicks)
 *     – Lead-Melodie: Frage (T1/T2) → Antwort (T3) → Auflösung (T4);
 *       zweiter Durchgang variiert, T8 = Drum-Fill + Lead-Pickup
 *       zurück zum Anfang → der Loop "atmet" statt zu nerven.
 *
 * Sound-Design (alles live synthetisiert):
 *   Kick: Sine-Pitch-Drop 160→45 Hz + Click · Clap: 3 Bandpass-Noise-Bursts
 *   HiHat: Hochpass-Noise (closed/open) · Bass: Saw+Sub-Sine, LP-Envelope
 *   Pad-Stäbe: 2 detunte Saws + Quinte, LP 1.8 kHz · Lead: Pulse-Mix
 *   mit Vibrato-LFO (5,2 Hz, ab +120 ms) · FX: Plate-Reverb (2,2 s IR),
 *   Achtel-Delay auf Lead, Master-Compressor
 *
 * Autoplay-Policy: `play()` versucht `ctx.resume()`. Läuft der Context
 * noch im "suspended"-Zustand (Browser wartet auf eine User-Gesture),
 * liefert play() `false` zurück — die UI kann dann auf den ersten
 * Klick lauschen und erneut play() rufen (siehe HomeScreen).
 */

'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Notenhilfe: Name → Frequenz (A4 = 440 Hz, gleichstufig temperiert)
// ─────────────────────────────────────────────────────────────────────────────
const NOTE_SEMIS: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

function freq(note: string): number {
  // Format: "A4", "Bb3", "C#5" …
  const m = /^([A-G][#b]?)(-?\d)$/.exec(note);
  if (!m) throw new Error(`Invalid note: ${note}`);
  const semis = NOTE_SEMIS[m[1]];
  const octave = Number(m[2]);
  return 440 * Math.pow(2, (semis + (octave - 4) * 12 - 9) / 12);
}

// ─────────────────────────────────────────────────────────────────────────────
// Timing-Konstanten (118 BPM)
// ─────────────────────────────────────────────────────────────────────────────
const BPM = 118;
const SPB = 60 / BPM;          // Sekunden pro Beat ≈ 0.5085
const BAR = 4 * SPB;           // ein Takt ≈ 2.034 s
const INTRO_BARS = 3;          // T1 Pad+Run · T2 Fanfare · T3 Riser+Countdown
const LOOP_BARS = 8;           // 2 × (F · Dm · Bb · C)
const LOOP_BEATS = LOOP_BARS * 4;

// ─────────────────────────────────────────────────────────────────────────────
// Event-Typen des Sequencers
// ─────────────────────────────────────────────────────────────────────────────
type JingleEvent =
  | { t: number; kind: 'kick'; vel?: number }
  | { t: number; kind: 'clap'; vel?: number }
  | { t: number; kind: 'hat'; open?: boolean; vel?: number }
  | { t: number; kind: 'bass'; f: number; d: number; vel?: number }
  | { t: number; kind: 'stab'; fs: number[]; d: number; vel?: number }
  | { t: number; kind: 'lead'; f: number; d: number; vel?: number }
  | { t: number; kind: 'ping'; f: number; vel?: number }
  | { t: number; kind: 'sparkle'; fs: number[]; step: number; vel?: number }
  | { t: number; kind: 'riser'; d: number }
  | { t: number; kind: 'countdown'; f: number; vel?: number };

// ─────────────────────────────────────────────────────────────────────────────
// Komposition — INTRO (Beats 0–12)
// ─────────────────────────────────────────────────────────────────────────────
// Akkord-Intervalle (absolute Halbtöne über Grundton)
const MAJOR = [0, 4, 7, 12];
const MINOR = [0, 3, 7, 12];

function chordFs(root: number, type: 'maj' | 'min', inv = 0): number[] {
  const iv = type === 'maj' ? MAJOR : MINOR;
  return iv.map(s => root * Math.pow(2, (s + inv) / 12));
}

const F = freq('F3'); const Dm = freq('D3'); const Bb = freq('Bb2'); const C = freq('C3');

const INTRO: JingleEvent[] = [
  // T1 — warmes Pad + aufsteigender Sparkle-Run (C5-Pentatonik über 2 Beats)
  { t: 0.0, kind: 'stab', fs: chordFs(F, 'maj'), d: BAR * 0.95, vel: 0.34 },
  { t: 2.0, kind: 'sparkle', fs: [freq('C5'), freq('D5'), freq('F5'), freq('G5'), freq('A5'), freq('C6'), freq('D6'), freq('F6')], step: 0.25, vel: 0.5 },
  // T2 — Karaoke-Fanfare: ta · ta-ta · taaa  (F · F·Bb · C lang)
  { t: 4.0, kind: 'stab', fs: chordFs(F, 'maj'), d: 0.42, vel: 0.6 },
  { t: 4.5, kind: 'stab', fs: chordFs(F, 'maj'), d: 0.42, vel: 0.55 },
  { t: 5.0, kind: 'stab', fs: chordFs(Bb, 'maj'), d: 0.9, vel: 0.7 },
  { t: 6.0, kind: 'stab', fs: chordFs(C, 'maj'), d: 1.8, vel: 0.75 },
  // T3 — Riser über den ganzen Takt + "3-2-1-ZERO"-Countdown (16tel)
  { t: 8.0, kind: 'riser', d: BAR * 0.98 },
  { t: 11.0, kind: 'countdown', f: freq('C6'), vel: 0.35 },
  { t: 11.25, kind: 'countdown', f: freq('E6'), vel: 0.45 },
  { t: 11.5, kind: 'countdown', f: freq('G6'), vel: 0.58 },
  { t: 11.75, kind: 'countdown', f: freq('C7'), vel: 0.75 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Komposition — LOOP (Beats 0–32, relativ zum Loop-Anfang; Akkorde: F Dm Bb C ×2)
// ─────────────────────────────────────────────────────────────────────────────
const LOOP_ROOTS = [F, Dm, Bb, C, F, Dm, Bb, C];
const LOOP_TYPES: Array<'maj' | 'min'> = ['maj', 'min', 'maj', 'maj', 'maj', 'min', 'maj', 'maj'];

const LOOP: JingleEvent[] = [];

for (let bar = 0; bar < LOOP_BARS; bar++) {
  const t0 = bar * 4;
  const root = LOOP_ROOTS[bar];
  const type = LOOP_TYPES[bar];
  const isFill = bar === 7; // letzter Loop-Takt: Fill + Lead-Pickup

  // — Drums — Four-on-the-floor, Clap 2+4, Offbeat-Hats
  LOOP.push({ t: t0 + 0, kind: 'kick', vel: 0.95 });
  LOOP.push({ t: t0 + 1, kind: 'kick', vel: 0.9 });
  LOOP.push({ t: t0 + 2, kind: 'kick', vel: 0.95 });
  LOOP.push({ t: t0 + 3, kind: 'kick', vel: bar === 0 ? 0.82 : 0.9 });
  LOOP.push({ t: t0 + 1, kind: 'clap', vel: 0.8 });
  LOOP.push({ t: t0 + 3, kind: 'clap', vel: 0.85 });

  for (const off of [0.5, 1.5, 2.5]) LOOP.push({ t: t0 + off, kind: 'hat', vel: 0.4 });
  LOOP.push({ t: t0 + 3.5, kind: 'hat', open: true, vel: 0.3 });

  if (bar === 0) {
    // "Aufschlag" nach dem Intro-Drop: offene HiHat mit langem Decay
    LOOP.push({ t: t0 + 0, kind: 'hat', open: true, vel: 0.55 });
  }
  if (isFill) {
    // 16tel-Hats durch den ganzen Takt + Snare-Roll auf 3.5/3.75
    for (let s = 0; s < 16; s++) {
      if (s % 2 === 1) LOOP.push({ t: t0 + s * 0.25, kind: 'hat', vel: 0.28 });
    }
    LOOP.push({ t: t0 + 3.5, kind: 'clap', vel: 0.5 });
    LOOP.push({ t: t0 + 3.75, kind: 'clap', vel: 0.7 });
    LOOP.push({ t: t0 + 3.875, kind: 'clap', vel: 0.9 });
  }

  // — Bass — Achtel-Pump, Oktavsprünge am Taktende
  const bassPattern: Array<[number, number, number]> = [
    // [beat, dauer, vel]
    [0, 0.42, 0.95], [0.5, 0.38, 0.7], [1, 0.42, 0.85], [1.5, 0.38, 0.7],
    [2, 0.42, 0.9], [2.5, 0.38, 0.7], [3, 0.4, 0.8], [3.5, 0.36, 0.75],
  ];
  for (const [b, d, vel] of bassPattern) {
    const oct = b >= 3 ? 2 : 1; // Oktav-Highlight am Taktende
    LOOP.push({ t: t0 + b, kind: 'bass', f: root * oct, d: d * SPB, vel });
  }

  // — Pad-Stäbe — Dance-Pump zwischen den Kicks (Offbeats + "wums" auf 1)
  LOOP.push({ t: t0 + 0, kind: 'stab', fs: chordFs(root, type), d: 0.5 * SPB * 2, vel: 0.6 });
  for (const off of [0.5, 1.5, 2.5, 3.5]) {
    LOOP.push({ t: t0 + off, kind: 'stab', fs: chordFs(root, type), d: 0.28, vel: 0.5 });
  }
}

// — Lead-Melodie (2. Stimme darüber) — Frage · Antwort · Variation —
// Phrase A (T1, F): Aufwärts-Hook, lange Töne auf 1 und 3
const LEAD_A1: Array<[number, string, number, number]> = [
  // [beat, Note, dauer(beats), vel]
  [0, 'A4', 0.5, 0.8], [0.5, 'C5', 0.5, 0.75], [1, 'D5', 1, 0.85],
  [2, 'C5', 0.5, 0.75], [2.5, 'A4', 0.5, 0.7], [3, 'G4', 1, 0.75],
];
// Phrase A2 (T2, Dm): schließt die Frage
const LEAD_A2: Array<[number, string, number, number]> = [
  [0, 'F4', 0.5, 0.7], [0.5, 'A4', 0.5, 0.75], [1, 'D5', 1.5, 0.85],
  [3, 'A4', 0.5, 0.65], [3.5, 'C5', 0.5, 0.7],
];
// Phrase B (T3, Bb): Antwort — hebt sich eine Terz höher
const LEAD_B1: Array<[number, string, number, number]> = [
  [0, 'Bb4', 0.5, 0.8], [0.5, 'D5', 0.5, 0.8], [1, 'F5', 1, 0.9],
  [2, 'D5', 0.5, 0.75], [2.5, 'C5', 0.5, 0.7], [3, 'Bb4', 1, 0.75],
];
// Phrase B2 (T4, C): Auflösung mit Auftakt zurück zum F
const LEAD_B2: Array<[number, string, number, number]> = [
  [0, 'A4', 0.5, 0.75], [0.5, 'G4', 0.5, 0.7], [1, 'E4', 1, 0.8],
  [2, 'G4', 0.75, 0.7], [2.75, 'A4', 1.25, 0.8],
];

function pushLead(target: JingleEvent[], t0: number, phrase: Array<[number, string, number, number]>) {
  for (const [b, n, d, vel] of phrase) {
    target.push({ t: t0 + b, kind: 'lead', f: freq(n), d: d * SPB, vel });
  }
}

// 1. Durchgang (T1–T4)
pushLead(LOOP, 0, LEAD_A1);
pushLead(LOOP, 4, LEAD_A2);
pushLead(LOOP, 8, LEAD_B1);
pushLead(LOOP, 12, LEAD_B2);
// 2. Durchgang (T5–T8) — T6-Abschluss variert (D5 statt C5), T8 = Fill+Pickup
pushLead(LOOP, 16, LEAD_A1);
pushLead(LOOP, 20, LEAD_A2.slice(0, 4).concat([[3.5, 'D5', 0.5, 0.75]]));
pushLead(LOOP, 24, LEAD_B1);
// T8: Lead-Pause für das Drum-Fill — nur der Pickup zurück zum F
pushLead(LOOP, 28, [[3.5, 'G4', 0.5, 0.8]]);

// Glitzer-Pings (nur Delay+Reverb) an zwei Loop-Scharnierstellen
LOOP.push({ t: 7.5, kind: 'ping', f: freq('C7'), vel: 0.3 });
LOOP.push({ t: 23.5, kind: 'ping', f: freq('A6'), vel: 0.28 });

LOOP.sort((a, b) => a.t - b.t);
INTRO.sort((a, b) => a.t - b.t);

// ─────────────────────────────────────────────────────────────────────────────
// Die Engine
// ─────────────────────────────────────────────────────────────────────────────
export type JingleState = 'idle' | 'playing';

class StartscreenJingle {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverbWet: GainNode | null = null;
  private delayWet: GainNode | null = null;
  private leadSend: GainNode | null = null;

  private state: JingleState = 'idle';
  private timer: ReturnType<typeof setInterval> | null = null;
  private loopCount = 0;
  private scheduled = 0;
  private introIdx = 0;
  private loopIdx = 0;
  private loopOrigin = 0; // ctx-Zeit des aktuellen Loop-Durchgangs
  private activeNodes = new Set<AudioScheduledSourceNode>();
  private listeners = new Set<() => void>();
  private duckUntil = 1;

  /** Spielt den Jingle (Intro + Endlos-Loop). Gibt false zurück, wenn der
   *  Browser die Autoplay-Policy blockt (Context "suspended") — dann beim
   *  nächsten User-Gesture erneut rufen. */
  play(): boolean {
    if (this.state === 'playing') return true;
    if (typeof window === 'undefined') return false;

    if (!this.ctx) this.buildGraph();
    const ctx = this.ctx!;
    if (ctx.state !== 'running') {
      // Autoplay blockt (noch) — resume anstoßen. Löst die Gesture das
      // Promise (z. B. der erste Klick), startet play() automatisch erneut;
      // ein zweiter paralleler Aufruf ist durch den playing-Guard oben safe.
      void ctx.resume().then(() => { this.play(); }).catch(() => undefined);
      return false;
    }

    const now = ctx.currentTime + 0.15;
    this.scheduled = 0;
    this.introIdx = 0;
    this.loopIdx = 0;
    this.loopCount = 0;
    this.loopOrigin = now + INTRO_BARS * BAR;

    // Sanfter Fade-In, damit der Drop bei Beat 12 umso mehr trägt
    const g = this.master!.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(0.0001, ctx.currentTime);
    g.exponentialRampToValueAtTime(0.92, ctx.currentTime + 0.5);

    this.state = 'playing';
    this.emit();
    this.timer = setInterval(() => this.tick(), 200);
    this.tick();
    return true;
  }

  /** Stoppt mit 0,5 s Fade-Out; Unmount-sicher (doppeltes stop() ist ok). */
  stop(): void {
    if (this.state === 'idle') return;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    const ctx = this.ctx;
    if (!ctx || !this.master) { this.state = 'idle'; this.emit(); return; }

    const g = this.master.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(Math.max(g.value, 0.0001), ctx.currentTime);
    g.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);

    // Laufende/geplante Klänge sanft abschalten
    const cutoff = ctx.currentTime + 0.55;
    for (const node of this.activeNodes) {
      try { node.stop(cutoff); } catch { /* schon gestoppt */ }
    }
    this.activeNodes.clear();

    this.state = 'idle';
    this.emit();
  }

  isPlaying(): boolean { return this.state === 'playing'; }
  getState(): JingleState { return this.state; }

  /** Lautstärke temporarily absenken (z. B. Tab in den Hintergrund). */
  duck(factor: number): void {
    this.duckUntil = Math.max(0.05, Math.min(1, factor));
    if (this.ctx && this.master && this.state === 'playing') {
      const g = this.master.gain;
      const target = 0.92 * this.duckUntil;
      g.cancelScheduledValues(this.ctx.currentTime);
      g.setTargetAtTime(Math.max(target, 0.0001), this.ctx.currentTime, 0.15);
    }
  }

  onStateChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Für QA / Debug: Zustand des Contexts + Planungs-Zähler. */
  getDebugInfo(): { ctxState: string; playing: boolean; loops: number; scheduledEvents: number } {
    return {
      ctxState: this.ctx?.state ?? 'uninitialized',
      playing: this.state === 'playing',
      loops: this.loopCount,
      scheduledEvents: this.scheduled,
    };
  }

  // ── Scheduler: plant Events mit 1,2 s Look-ahead in 200-ms-Ticks ──
  private tick(): void {
    const ctx = this.ctx;
    if (!ctx || this.state !== 'playing') return;
    const horizon = ctx.currentTime + 1.2;
    const start = this.loopOrigin - INTRO_BARS * BAR; // absoluter Start
    let did = false;

    // INTRO
    while (this.introIdx < INTRO.length) {
      const ev = INTRO[this.introIdx];
      const at = start + ev.t * SPB;
      if (at > horizon) break;
      this.render(ev, at);
      this.introIdx++;
      did = true;
    }
    // LOOP (wiederholt: loopOrigin wandert pro Durchgang weiter)
    for (;;) {
      if (this.loopIdx >= LOOP.length) {
        this.loopCount++;
        this.loopIdx = 0;
        this.loopOrigin += LOOP_BARS * BAR;
      }
      const ev = LOOP[this.loopIdx];
      const at = this.loopOrigin + ev.t * SPB;
      if (at > horizon) break;
      this.render(ev, at);
      this.loopIdx++;
      did = true;
    }
    if (did) this.scheduled = this.introIdx + this.loopCount * LOOP.length + this.loopIdx;
  }

  // ── Renderer: ein Event → konkrete Nodes ──
  private render(ev: JingleEvent, at: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    switch (ev.kind) {
      case 'kick': this.vKick(at, ev.vel ?? 0.9); break;
      case 'clap': this.vClap(at, ev.vel ?? 0.8); break;
      case 'hat': this.vHat(at, ev.open === true, ev.vel ?? 0.4); break;
      case 'bass': this.vBass(at, ev.f, ev.d, ev.vel ?? 0.8); break;
      case 'stab': this.vStab(at, ev.fs, ev.d, ev.vel ?? 0.55); break;
      case 'lead': this.vLead(at, ev.f, ev.d, ev.vel ?? 0.8); break;
      case 'ping': this.vPing(at, ev.f, ev.vel ?? 0.3); break;
      case 'sparkle': this.vSparkle(at, ev.fs, ev.step, ev.vel ?? 0.5); break;
      case 'riser': this.vRiser(at, ev.d); break;
      case 'countdown': this.vPing(at, ev.f, ev.vel ?? 0.5); break;
    }
    void ctx;
  }

  private track(node: AudioScheduledSourceNode, at: number, stopAt: number): void {
    this.activeNodes.add(node);
    node.onended = () => this.activeNodes.delete(node);
    try { node.start(at); node.stop(stopAt); } catch { /* noop */ }
  }

  // Kick: Sine 160→45 Hz + Click
  private vKick(at: number, vel: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, at);
    osc.frequency.exponentialRampToValueAtTime(45, at + 0.09);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vel, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.22);
    osc.connect(g).connect(this.master!);
    this.track(osc, at, at + 0.25);
  }

  // Clap: 3 Bandpass-Noise-Bursts (Flam) + Body
  private vClap(at: number, vel: number): void {
    const ctx = this.ctx!;
    const dur = 0.3;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 1.1;
    const g = ctx.createGain();
    const env = (t0: number, v: number): void => {
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(v, t0 + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
    };
    env(at, vel); env(at + 0.012, vel * 0.7); env(at + 0.024, vel * 0.5);
    // Rest ausklingen
    g.gain.setValueAtTime(vel * 0.35, at + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
    src.connect(bp).connect(g).connect(this.master!);
    g.connect(this.reverbWet!);
    this.track(src, at, at + dur);
  }

  // HiHat: Hochpass-Noise, closed kurz / open mit Decay
  private vHat(at: number, open: boolean, vel: number): void {
    const ctx = this.ctx!;
    const dur = open ? 0.4 : 0.06;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vel, at + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, at + (open ? 0.32 : 0.05));
    src.connect(hp).connect(g).connect(this.master!);
    this.track(src, at, at + dur);
  }

  // Bass: Saw + Sub-Sine, LP-Envelope
  private vBass(at: number, f: number, d: number, vel: number): void {
    const ctx = this.ctx!;
    const saw = ctx.createOscillator();
    saw.type = 'sawtooth'; saw.frequency.value = f;
    const sub = ctx.createOscillator();
    sub.type = 'sine'; sub.frequency.value = f / 2;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 4;
    lp.frequency.setValueAtTime(180, at);
    lp.frequency.exponentialRampToValueAtTime(640, at + 0.05);
    lp.frequency.exponentialRampToValueAtTime(220, at + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vel * 0.5, at + 0.008);
    g.gain.setValueAtTime(vel * 0.5, at + Math.max(d - 0.05, 0.02));
    g.gain.exponentialRampToValueAtTime(0.001, at + d + 0.04);
    const subG = ctx.createGain(); subG.gain.value = 0.6;
    saw.connect(lp); sub.connect(subG).connect(lp);
    lp.connect(g).connect(this.master!);
    this.track(saw, at, at + d + 0.08);
    this.track(sub, at, at + d + 0.08);
  }

  // Pad-Stab: 2 detunte Saws + Quinte, LP 1.8 kHz, kurze Hüllkurve (Pump)
  private vStab(at: number, fs: number[], d: number, vel: number): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, at);
    lp.frequency.exponentialRampToValueAtTime(2400, at + Math.min(d * 0.5, 0.12));
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass'; hpf.frequency.value = 160; // Bass-Bereich freihalten
    for (const f of fs) {
      for (const det of [-8, 8]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f * 2 * Math.pow(2, det / 1200); // 1 Oktave höher als Bass-Register
        o.detune.value = det;
        o.connect(lp);
        this.track(o, at, at + d + 0.1);
      }
    }
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vel * 0.16, at + 0.012); // 8 Stimmen → insgesamt moderat
    g.gain.exponentialRampToValueAtTime(0.001, at + d);
    lp.connect(hpf).connect(g).connect(this.master!);
    g.connect(this.reverbWet!);
  }

  // Lead: Pulse-Mix (Saw+Triangle) + Vibrato ab +120 ms
  private vLead(at: number, f: number, d: number, vel: number): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const saw = ctx.createOscillator();
    saw.type = 'sawtooth'; saw.frequency.value = f;
    const tri = ctx.createOscillator();
    tri.type = 'triangle'; tri.frequency.value = f * 2.004; // leicht verschoben = Pulse-Charakter
    const triG = ctx.createGain(); triG.gain.value = 0.35;
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.2;
    const vibG = ctx.createGain(); vibG.gain.value = 9; // cents
    vib.connect(vibG);
    vibG.connect(saw.detune);
    const vibG2 = ctx.createGain(); vibG2.gain.value = 6;
    vibG2.connect(tri.detune);

    const attack = 0.02;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vel * 0.24, at + attack);
    g.gain.setValueAtTime(vel * 0.24, at + Math.max(d - 0.06, attack + 0.01));
    g.gain.exponentialRampToValueAtTime(0.001, at + d + 0.06);

    saw.connect(g);
    tri.connect(triG).connect(g);
    g.connect(this.master!);
    if (this.leadSend) g.connect(this.leadSend);

    const end = at + d + 0.12;
    this.track(saw, at, end);
    this.track(tri, at, end);
    this.track(vib, at, end);
  }

  // Ping: reiner Sinus-Glitzer (nur Delay + Reverb)
  private vPing(at: number, f: number, vel: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vel * 0.2, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.5);
    o.connect(g);
    g.connect(this.reverbWet!);
    if (this.leadSend) g.connect(this.leadSend);
    this.track(o, at, at + 0.6);
  }

  // Sparkle-Run: aufsteigende Sinus-Sechzehntel mit Velocity-Crescendo
  private vSparkle(at: number, fs: number[], step: number, vel: number): void {
    fs.forEach((f, i) => {
      const t = at + i * step * SPB;
      const v = vel * (0.45 + (i / Math.max(fs.length - 1, 1)) * 0.55);
      this.vPing(t, f, v);
    });
  }

  // Riser: Bandpass-Noise mit steigender Frequenz + Lautstärke
  private vRiser(at: number, d: number): void {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * d), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(300, at);
    bp.frequency.exponentialRampToValueAtTime(6500, at + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.5, at + d * 0.92);
    g.gain.exponentialRampToValueAtTime(0.001, at + d);
    src.connect(bp).connect(g).connect(this.master!);
    g.connect(this.reverbWet!);
    this.track(src, at, at + d + 0.05);
  }

  // ── Graph-Aufbau (einmalig) ──
  private buildGraph(): void {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;

    // Master-Kette: master → Compressor → destination
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3; comp.knee.value = 8;
    comp.attack.value = 0.004; comp.release.value = 0.16;
    master.connect(comp).connect(ctx.destination);
    this.master = master;

    // Reverb-Bus: prozedurale Plate-IR (2,2 s)
    const irLen = Math.floor(ctx.sampleRate * 2.2);
    const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < irLen; i++) {
        const decay = Math.pow(1 - i / irLen, 2.6);
        d[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    // Reverb-Send-Bus: Instrumente connecten auf revIn;
    // revIn → conv(Plate-IR) → wet(0.9) → master
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.9;
    const revIn = ctx.createGain();
    revIn.connect(conv);
    conv.connect(wet).connect(master);
    this.reverbWet = revIn; // Bus-Eingang für alle Instrumente
    void wet;

    // Delay-Bus (Achtel = 60/118/2) für Lead/Ping
    const delay = ctx.createDelay(1);
    delay.delayTime.value = SPB / 2;
    const fb = ctx.createGain(); fb.gain.value = 0.3;
    const fbHp = ctx.createBiquadFilter();
    fbHp.type = 'highpass'; fbHp.frequency.value = 500;
    delay.connect(fbHp).connect(fb).connect(delay);
    const dWet = ctx.createGain(); dWet.gain.value = 0.22;
    delay.connect(dWet).connect(master);
    const leadSend = ctx.createGain(); leadSend.gain.value = 0.5;
    leadSend.connect(delay);
    this.leadSend = leadSend;
  }

  private emit(): void {
    for (const cb of this.listeners) {
      try { cb(); } catch { /* Listener-Fehler isolieren */ }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton (wie die anderen Client-Services im Projekt)
// ─────────────────────────────────────────────────────────────────────────────
const globalKey = '__kz_startscreen_jingle__';
let instance: StartscreenJingle | null = null;

export function getStartscreenJingle(): StartscreenJingle {
  if (typeof window !== 'undefined') {
    const w = window as unknown as { [globalKey]?: StartscreenJingle };
    if (w[globalKey]) return w[globalKey]!;
    instance = instance ?? new StartscreenJingle();
    w[globalKey] = instance;
    return instance;
  }
  instance = instance ?? new StartscreenJingle();
  return instance;
}

export type { StartscreenJingle };
