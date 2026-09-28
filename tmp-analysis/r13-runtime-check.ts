// R13 runtime equivalence check: OLD (git-HEAD original, byte-identical
// backup) vs NEW (facade + modules) must produce IDENTICAL outputs for a
// representative input matrix. Run with: bun tmp-analysis/r13-runtime-check.ts
import { renderToStaticMarkup } from 'react-dom/server';
import * as OLD from './r13-note-utils-ORIG';
import * as NEW from '../src/lib/game/note-utils';

let failures = 0;
function check(name: string, a: unknown, b: unknown) {
  const sa = typeof a === 'string' ? a : JSON.stringify(a);
  const sb = typeof b === 'string' ? b : JSON.stringify(b);
  if (sa === sb) {
    console.log(`OK   ${name}`);
  } else {
    failures++;
    console.log(`FAIL ${name}\n  old: ${String(sa).slice(0, 300)}\n  new: ${String(sb).slice(0, 300)}`);
  }
}

// ── constants ──
check('NOTE_HEIGHT', OLD.NOTE_HEIGHT, NEW.NOTE_HEIGHT);
check('PITCH_RANGE', OLD.PITCH_RANGE, NEW.PITCH_RANGE);
check('BASE_PITCH', OLD.BASE_PITCH, NEW.BASE_PITCH);
check('FLAT_NOTE_FILL_COLOR', OLD.FLAT_NOTE_FILL_COLOR, NEW.FLAT_NOTE_FILL_COLOR);
check('SING_LINE_POSITION', OLD.SING_LINE_POSITION, NEW.SING_LINE_POSITION);
check('NOTE_WINDOW', OLD.NOTE_WINDOW, NEW.NOTE_WINDOW);
check('VISIBLE_TOP', OLD.VISIBLE_TOP, NEW.VISIBLE_TOP);
check('VISIBLE_RANGE', OLD.VISIBLE_RANGE, NEW.VISIBLE_RANGE);

// ── pure helpers ──
check('getNoteBackgroundClasses golden', OLD.getNoteBackgroundClasses(true, false), NEW.getNoteBackgroundClasses(true, false));
check('getNoteBackgroundClasses default', OLD.getNoteBackgroundClasses(false, false), NEW.getNoteBackgroundClasses(false, false));
check('getNoteBackgroundClasses rap', OLD.getNoteBackgroundClasses(false, false, true), NEW.getNoteBackgroundClasses(false, false, true));
check('getNoteBoxShadow', OLD.getNoteBoxShadow(true, true), NEW.getNoteBoxShadow(true, true));
check('calculatePitchY', OLD.calculatePitchY(60, 800), NEW.calculatePitchY(60, 800));
check('calculatePitchStats empty', OLD.calculatePitchStats(null), NEW.calculatePitchStats(null));
check('calculatePitchStats notes', OLD.calculatePitchStats([{ pitch: 55 }, { pitch: 70 }]), NEW.calculatePitchStats([{ pitch: 55 }, { pitch: 70 }]));

const notes = [
  { id: '1', pitch: 60, startTime: 0, duration: 1000, lineIndex: 0, line: { index: 0, startMs: 0, endMs: 4000, text: 'a' } },
  { id: '2', pitch: 64, startTime: 1000, duration: 500, lineIndex: 0, line: { index: 0, startMs: 0, endMs: 4000, text: 'a' } },
  { id: '3', pitch: 67, startTime: 2000, duration: 800, lineIndex: 0, line: { index: 0, startMs: 0, endMs: 4000, text: 'a' } },
] as never[];
check('getVisibleNotes', OLD.getVisibleNotes(notes, 1500, 4000), NEW.getVisibleNotes(notes, 1500, 4000));

// ── render pipelines (serialize style + overlay markup) ──
function serializeStyleResult(r: { additionalClasses: string; inlineStyle: unknown; pastOpacity?: number; overlayElement: unknown }) {
  return JSON.stringify({
    additionalClasses: r.additionalClasses,
    inlineStyle: r.inlineStyle,
    ...(r.pastOpacity !== undefined ? { pastOpacity: r.pastOpacity } : {}),
    overlayMarkup: renderToStaticMarkup(r.overlayElement as never),
  });
}

const samples = [
  { time: 100, accuracy: 0.97, hit: true, sungPitch: 60 },
  { time: 160, accuracy: 0.95, hit: true, sungPitch: 61 },
  { time: 220, accuracy: 0.4, hit: false, sungPitch: 64 },
  { time: 280, accuracy: 0.9, hit: true, sungPitch: 60 },
  { time: 340, accuracy: 0.3, hit: false, sungPitch: 67 },
  { time: 400, accuracy: 0.99, hit: true, sungPitch: 60 },
];

const cases: Array<Record<string, unknown>> = [
  // positional args follow the original signature:
  // (_displayStyle, _accuracy, isGolden, isBonus, performanceSamples, targetPitch,
  //  pitchStats, visibleTop, visibleRange, fillFraction, noteStartTime, noteDuration,
  //  containerHeight, playerTint, renderMode, flatFill, isRap)
  { label: 'flat golden', args: ['x', 1, true, false, [], undefined, undefined, undefined, undefined, 0.5, 0, 1000, 300, undefined, 'flat'] },
  { label: 'flat default', args: ['x', 1, false, false, undefined, undefined, undefined, undefined, undefined, 1, 0, 1000, 300, undefined, 'flat', '#ff00ff'] },
  { label: 'sealed partial', args: ['tick', 1, false, false, samples, 60, { minPitch: 48, maxPitch: 72, pitchRange: 24 }, 8, 77, 0.45, 0, 600, 300, undefined, 'modern'] },
  { label: 'sealed complete', args: ['tick', 1, true, false, samples, 60, { minPitch: 48, maxPitch: 72, pitchRange: 24 }, 8, 77, 1, 0, 600, 300, undefined, 'modern'] },
  { label: 'legacy', args: ['tick', 1, false, true, samples, 60, { minPitch: 48, maxPitch: 72, pitchRange: 24 }, 8, 77, 0.8, 0, 600, 300, undefined, 'legacy'] },
  { label: 'no samples', args: ['tick', 1, false, false, undefined, undefined, undefined, undefined, undefined, 0.2, 500, 1000, 300, undefined, 'modern'] },
  { label: 'playerTint', args: ['tick', 1, false, false, samples, 60, { minPitch: 48, maxPitch: 72, pitchRange: 24 }, 8, 77, 0.6, 0, 600, 420, '#38bdf8', 'modern'] },
  { label: 'rap note', args: ['tick', 1, false, false, samples, 60, { minPitch: 48, maxPitch: 72, pitchRange: 24 }, 8, 77, 0.3, 0, 600, 420, undefined, 'modern', undefined, true] },
];
for (const c of cases) {
  const o = (OLD.getNoteDisplayStyleClasses as never as (...a: unknown[]) => never)(...(c.args as never));
  const n = (NEW.getNoteDisplayStyleClasses as never as (...a: unknown[]) => never)(...(c.args as never));
  check(`getNoteDisplayStyleClasses ${c.label}`, serializeStyleResult(o), serializeStyleResult(n));
}

// ── multi-player overlay ──
const players = [
  { id: 'p1', color: '#38bdf8', samples: samples.map(s => ({ ...s, playerColor: '#38bdf8' })) },
  { id: 'p2', color: '#f472b6', samples: [samples[0], samples[2], samples[4]].map(s => ({ ...s, playerColor: '#f472b6' })) },
];
const mpArgs = [players, 0, 600, 0.55, false, false, 60, { minPitch: 48, pitchRange: 24 }, 8, 77, 420] as never;
const oMp = (OLD.getMultiPlayerNoteOverlay as never as (...a: never[]) => never)(...mpArgs);
const nMp = (NEW.getMultiPlayerNoteOverlay as never as (...a: never[]) => never)(...mpArgs);
check('getMultiPlayerNoteOverlay hitGlow', oMp.hitGlow, nMp.hitGlow);
check('getMultiPlayerNoteOverlay markup', renderToStaticMarkup(oMp.overlayElement as never), renderToStaticMarkup(nMp.overlayElement as never));

console.log(failures === 0 ? '\nALL RUNTIME CHECKS PASSED (old === new)' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
