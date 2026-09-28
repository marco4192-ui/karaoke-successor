/**
 * Multi-Format Import Parsers
 *
 * Optional import plugins for karaoke formats beyond UltraStar (.txt):
 * - KaraokeMugen (.json) — JSON-basiertes Karaoke-Format
 * - MIDI Karaoke (.kar/.mid) — MIDI-Dateien mit eingebetteten Lyrics
 * - SingStar — INI-basiertes Format
 * - StepMania (.sm/.ssc) — Rhythm-Game-Chart-Format
 *
 * Usage: Import-Screen erweitert um "Weitere Formate"-Option.
 * Die MIDI-Konvertierung erfordert Audio-Analysis (Pitch) im Nachgang.
 *
 * Orchestrator (R11): Die Implementierungen liegen in fokussierten Modulen
 * unter `./multi-format/` — detect.ts (Format-Erkennung), karaoke-mugen.ts
 * (.json + .ass/.ssa), midi.ts (.kar/.mid), singstar.ts, stepmania.ts und
 * convert.ts (Konvertierung zu Song). Diese Datei re-exportiert lediglich
 * die öffentliche Oberfläche, damit der Importpfad
 * `@/lib/parsers/multi-format-import` für alle Konsumenten stabil bleibt.
 */

// ─── Format Detection ────────────────────────────────────────────────

export type { DetectedFormat } from './multi-format/detect';
export { detectFileFormat } from './multi-format/detect';

// ─── KaraokeMugen Parser (.json + .ass/.ssa) ─────────────────────────

export { parseKaraokeMugen, parseAssKaraoke } from './multi-format/karaoke-mugen';

// ─── MIDI Karaoke Parser (.kar/.mid) ─────────────────────────────────

export type { MIDILyricEvent, MIDITrackData, MIDIKaraokeData } from './multi-format/midi';
export { parseMIDIKaraoke } from './multi-format/midi';

// ─── SingStar Parser ─────────────────────────────────────────────────

export { parseSingStarData } from './multi-format/singstar';

// ─── StepMania Parser (.sm/.ssc) ─────────────────────────────────────

export { parseStepMania } from './multi-format/stepmania';

// ─── Convert to Song ─────────────────────────────────────────────────

export type { ConvertToSongOptions } from './multi-format/convert';
export { convertToSong } from './multi-format/convert';
