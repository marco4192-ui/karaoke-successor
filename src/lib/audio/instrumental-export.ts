/**
 * Instrumental export (feature idea #17 — "extract an instrumental from any
 * song") — the OFFLINE sibling of the live vocal filter (vocal-filter.ts).
 *
 * Uses the same classic center-channel cancellation (L − R): lead vocals sit
 * in the center of most stereo mixes, so the side signal drops them while
 * panned instruments survive. On top of the live filter this export adds:
 * - Bass preservation: the original mix's low band (below ~140 Hz) is summed
 *   back in, because kick & bass are ALSO center-panned and would otherwise
 *   vanish with the vocals.
 * - Full offline rendering via OfflineAudioContext (faster than realtime) and
 *   16-bit PCM WAV encoding, so the result is a portable file any DJ tool,
 *   editor or the app itself can play.
 *
 * Honesty note (also surfaced in the UI): this is DSP, not AI stem-separation.
 * It works well on stereo mixes with center-panned vocals; heavily stereo-wide
 * or reverb-drenched vocals cancel only partially. Real AI separation would
 * require shipping multi-hundred-MB models — out of scope for the sandbox.
 *
 * Supported sources: same-origin audio files and blob: URLs (browser-imported
 * songs). NOT supported: MIDI synth songs (no audio file at all), platform
 * videos (YouTube etc. — nothing to decode) and cross-origin files (fetch
 * would fail / CORS). Guarded BEFORE any decoding starts.
 */

import type { Song } from '@/types/game';

export interface InstrumentalExportOptions {
  /** 0..1 — how much center cancellation to apply (1 = full karaoke). */
  amount: number;
  /** Low-pass cutoff for the original-bass re-injection, Hz. Default 140. */
  bassKeepHz?: number;
  /** Progress callback (0..1) for the UI. */
  onProgress?: (_fraction: number) => void;
}

export interface InstrumentalExportResult {
  blob: Blob;
  filename: string;
  durationSeconds: number;
}

export type InstrumentalExportError =
  | 'noAudioFile'
  | 'crossOrigin'
  | 'decodeFailed'
  | 'renderFailed';

/** Why an instrumental export is impossible for this song (UI probe). */
export function getInstrumentalExportBlocker(song: Song): InstrumentalExportError | null {
  if (typeof window === 'undefined') return 'noAudioFile';
  // MIDI/KAR songs: music is synthesized at runtime — there is no audio file.
  // Platform songs (YouTube etc.): audioUrl empty as well.
  if (!song.audioUrl) return 'noAudioFile';
  try {
    const url = new URL(song.audioUrl, window.location.href);
    if (url.protocol === 'blob:' || url.protocol === 'data:') return null;
    if (url.origin !== window.location.origin) return 'crossOrigin';
    return null;
  } catch {
    return 'crossOrigin';
  }
}

// ---------------------------------------------------------------------------
// WAV encoding (16-bit PCM, interleaved)
// ---------------------------------------------------------------------------

function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels, clamping to [-1, 1]
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function sanitizeFilename(title: string): string {
  return (title || 'song')
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** Shared decode context (decodeAudioData needs a live AudioContext). */
let decodeContext: AudioContext | null = null;
function getDecodeContext(): AudioContext {
  if (!decodeContext || decodeContext.state === 'closed') {
    decodeContext = new AudioContext();
  }
  return decodeContext;
}

/**
 * Render an instrumental (vocal-cancelled) WAV from the song's audio file.
 * Throws an Error with a machine-readable `code` property on failure — the
 * UI maps the codes to translated messages.
 */
export async function exportInstrumentalWav(
  song: Song,
  options: InstrumentalExportOptions,
): Promise<InstrumentalExportResult> {
  const blocker = getInstrumentalExportBlocker(song);
  if (blocker) {
    throw Object.assign(new Error(blocker), { code: blocker });
  }

  const amount = Math.min(1, Math.max(0, options.amount));
  const bassKeepHz = options.bassKeepHz ?? 140;
  const onProgress = options.onProgress ?? (() => {});

  // 1. Fetch + decode the source audio
  let arrayBuffer: ArrayBuffer;
  try {
    const response = await fetch(song.audioUrl as string);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    arrayBuffer = await response.arrayBuffer();
  } catch {
    throw Object.assign(new Error('decodeFailed'), { code: 'decodeFailed' as const });
  }
  onProgress(0.15);

  let decoded: AudioBuffer;
  try {
    decoded = await getDecodeContext().decodeAudioData(arrayBuffer.slice(0));
  } catch {
    throw Object.assign(new Error('decodeFailed'), { code: 'decodeFailed' as const });
  }
  onProgress(0.45);

  // 2. Offline render with the cancellation graph
  const offline = new OfflineAudioContext(2, decoded.length, decoded.sampleRate);

  const src = offline.createBufferSource();
  src.buffer = decoded;

  // Wet: side signal L − R (mono on both speakers) — the cancellation.
  // (Same routing as the live vocal filter: splitter → [+1, −1] → merger.)
  const splitter = offline.createChannelSplitter(2);
  const g0 = offline.createGain();
  const gInv = offline.createGain();
  gInv.gain.value = -1;
  const merger = offline.createChannelMerger(2);
  const wetGain = offline.createGain();
  wetGain.gain.value = amount;

  src.connect(splitter);
  splitter.connect(g0, 0);
  splitter.connect(gInv, 1);
  g0.connect(merger, 0, 0);
  g0.connect(merger, 0, 1);
  gInv.connect(merger, 0, 0);
  gInv.connect(merger, 0, 1);
  merger.connect(wetGain);
  wetGain.connect(offline.destination);

  // Dry: unfiltered share (1 − amount) keeps the crossfade continuous.
  const dryGain = offline.createGain();
  dryGain.gain.value = 1 - amount;
  src.connect(dryGain);
  dryGain.connect(offline.destination);

  // Bass keep: original low band re-injection (kick/bass are center-panned
  // too and would otherwise disappear together with the vocals).
  const bassLowpass = offline.createBiquadFilter();
  bassLowpass.type = 'lowpass';
  bassLowpass.frequency.value = bassKeepHz;
  const bassGain = offline.createGain();
  bassGain.gain.value = amount;
  src.connect(bassLowpass);
  bassLowpass.connect(bassGain);
  bassGain.connect(offline.destination);

  src.start(0);

  let rendered: AudioBuffer;
  try {
    rendered = await offline.startRendering();
  } catch {
    throw Object.assign(new Error('renderFailed'), { code: 'renderFailed' as const });
  }
  onProgress(0.85);

  // 3. Encode + package
  const blob = encodeWav(rendered);
  onProgress(1);

  return {
    blob,
    filename: `${sanitizeFilename(song.title)} (instrumental).wav`,
    durationSeconds: Math.round(rendered.duration),
  };
}

/** Trigger the browser download of an export result. */
export function downloadInstrumental(result: InstrumentalExportResult): void {
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
