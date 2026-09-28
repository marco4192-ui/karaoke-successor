/**
 * Multi-Format Import — StepMania Parser (.sm/.ssc)
 *
 * Rhythm-game chart metadata (title/artist/BPM) — no pitch data.
 *
 * Extracted from multi-format-import.ts (R11) — byte-identical blocks,
 * orchestrator re-exports keep the public import path stable.
 */
// ─── StepMania Parser (.sm/.ssc) ─────────────────────────────────────

export interface StepManiaData {
  title: string;
  artist: string;
  bpm: number[];
  stops: Array<[number, number]>;
  notes: Array<{ beat: number; type: string }>;
}

export function parseStepMania(data: string): StepManiaData | null {
  try {
    const result: Partial<StepManiaData> = { bpm: [120], stops: [], notes: [] };
    const lines = data.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#TITLE:')) result.title = trimmed.endsWith(';') ? trimmed.slice(7, -1) : trimmed.slice(7);
      else if (trimmed.startsWith('#ARTIST:')) result.artist = trimmed.endsWith(';') ? trimmed.slice(8, -1) : trimmed.slice(8);
      else if (trimmed.startsWith('#BPMS:')) {
        const bpmStr = trimmed.endsWith(';') ? trimmed.slice(6, -1) : trimmed.slice(6);
        result.bpm = bpmStr.split(',').map(b => {
          const trimmed = b.trim();
          if (!trimmed) return NaN;
          // StepMania format: "beat=bpm" (e.g. "0=120.000").
          // Also handle plain values without '=' (e.g. "120").
          const eqIndex = trimmed.indexOf('=');
          const value = eqIndex >= 0 ? trimmed.substring(eqIndex + 1) : trimmed;
          return parseFloat(value);
        }).filter(v => !isNaN(v) && v > 0 && v < 1000);
        // Fallback: if parsing produced no valid BPMs, keep the default [120]
        if (result.bpm.length === 0) result.bpm = [120];
      }
    }

    if (!result.title || !result.artist) return null;
    return result as StepManiaData;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.debug('[multi-format-import]: failed to parse StepMania data', error);
    return null;
  }
}
