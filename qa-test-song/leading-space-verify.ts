/**
 * R21 QA: UltraStar word-boundary variants — variant 2 (leading space
 * before a new word) must render exactly like variant 1 (trailing space
 * after a word). Uses the REAL game functions, no mocks.
 *
 * Run: cd /home/z/my-project && bun qa-test-song/leading-space-verify.ts
 */
import { parseUltraStarTxt, convertUltraStarToSong, generateUltraStarTxt } from '../src/lib/parsers/ultrastar-parser';
import { matchUltraStarNoteLine, normalizeUltraStarWordBoundaries } from '../src/lib/parsers/word-boundary';
import { convertNotesToLyricLines } from '../src/lib/parsers/notes-to-lyric-lines';

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

// ────────────────────────────────────────────────────────────────────
console.log('\n1) Variant 2 (leading space) — full song parse');
{
  const txt = [
    '#TITLE:QA Variant Two',
    '#ARTIST:QA Bot',
    '#MP3:qa-short.mp3',
    '#BPM:300',
    '#GAP:0',
    ': 0 4 60 Hel',
    ': 4 4 60 lo',
    ': 8 4 60  World',        // ← leading space = new word
    '- 13',
    ': 16 4 60  This',        // line start → boundary dropped
    ': 20 4 60  is',
    ': 24 4 60  a',
    ': 28 4 60  test',
    '- 33',
    'E',
  ].join('\n');

  const us = parseUltraStarTxt(txt);
  check('note count = 7', us.notes.length === 7, `got ${us.notes.length}`);
  check('boundary moved onto "lo" (trailing space)', us.notes[1].lyric === 'lo ', `got "${us.notes[1].lyric}"`);
  check('"World" clean (no trailing — " This" sits at a line start)', us.notes[2].lyric === 'World', `got "${us.notes[2].lyric}"`);
  check('"This" got the boundary of " is" (intra-line)', us.notes[3].lyric === 'This ', `got "${us.notes[3].lyric}"`);
  check('"is" got boundary of " a"', us.notes[4].lyric === 'is ', `got "${us.notes[4].lyric}"`);
  check('"a" got boundary of " test"', us.notes[5].lyric === 'a ', `got "${us.notes[5].lyric}"`);
  check('"test" clean', us.notes[6].lyric === 'test', `got "${us.notes[6].lyric}"`);

  const song = convertUltraStarToSong(us, '/qa-short.mp3');
  check('line 1 text = "Hello World"', song.lyrics[0]?.text === 'Hello World', `got "${song.lyrics[0]?.text}"`);
  check('line 2 text = "This is a test"', song.lyrics[1]?.text === 'This is a test', `got "${song.lyrics[1]?.text}"`);
}

// ────────────────────────────────────────────────────────────────────
console.log('\n2) Variant 1 (trailing space) — must stay byte-identical (regression guard)');
{
  const txt = [
    '#TITLE:QA Variant One',
    '#ARTIST:QA Bot',
    '#MP3:qa-short.mp3',
    '#BPM:300',
    '#GAP:0',
    ': 0 4 60 Hel',
    ': 4 4 60 lo ',
    ': 8 4 60 World',
    '- 13',
    'E',
  ].join('\n');
  const us = parseUltraStarTxt(txt);
  check('"lo " trailing space preserved', us.notes[1].lyric === 'lo ', `got "${us.notes[1].lyric}"`);
  check('"World" clean', us.notes[2].lyric === 'World', `got "${us.notes[2].lyric}"`);
  const song = convertUltraStarToSong(us, '/qa-short.mp3');
  check('line text = "Hello World"', song.lyrics[0]?.text === 'Hello World', `got "${song.lyrics[0]?.text}"`);
}

// ────────────────────────────────────────────────────────────────────
console.log('\n3) Mixed file: variant 1 dominates → leading spaces stripped, NOT moved');
{
  const txt = [
    '#TITLE:QA Mixed',
    '#BPM:300',
    '#GAP:0',
    ': 0 4 60 Hel',
    ': 4 4 60 lo ',
    ': 8 4 60  World',
    '- 13',
    'E',
  ].join('\n');
  const us = parseUltraStarTxt(txt);
  check('"lo " trailing kept', us.notes[1].lyric === 'lo ', `got "${us.notes[1].lyric}"`);
  check('"World" stripped, no double boundary', us.notes[2].lyric === 'World', `got "${us.notes[2].lyric}"`);
}

// ────────────────────────────────────────────────────────────────────
console.log('\n4) Column alignment (3+ spaces) → never a word boundary');
{
  const txt = [
    '#TITLE:QA Aligned',
    '#BPM:300',
    '#GAP:0',
    ': 0 4 60   Hel',
    ': 4 4 60   lo',
    ': 8 4 60   World',
    '- 13',
    'E',
  ].join('\n');
  const us = parseUltraStarTxt(txt);
  check('"Hel" stripped', us.notes[0].lyric === 'Hel', `got "${us.notes[0].lyric}"`);
  check('"lo" stripped — NOT a boundary', us.notes[1].lyric === 'lo', `got "${us.notes[1].lyric}"`);
  check('"World" stripped — NOT a boundary', us.notes[2].lyric === 'World', `got "${us.notes[2].lyric}"`);
}

// ────────────────────────────────────────────────────────────────────
console.log('\n5) Duet interleaving: boundary moves within the SAME voice only');
{
  const txt = [
    '#TITLE:QA Duet V2',
    '#BPM:300',
    '#GAP:0',
    'P1',
    ': 0 4 60 Hel',
    ': 4 4 60 lo',
    'P2',
    ': 4 4 62  My',
    ': 8 4 62  Friend',
    'P1',
    ': 8 4 60  World',
    '- 13',
    'E',
  ].join('\n');
  const us = parseUltraStarTxt(txt);
  const p1 = us.notes.filter(n => n.player === 'P1');
  const p2 = us.notes.filter(n => n.player === 'P2');
  check('P1: "lo" got the boundary of "World"', p1[1].lyric === 'lo ', `got "${p1[1].lyric}"`);
  check('P1: "World" clean', p1[2].lyric === 'World', `got "${p1[2].lyric}"`);
  check('P2: "My" got the boundary of "Friend"', p2[0].lyric === 'My ', `got "${p2[0].lyric}"`);
  check('P2: "Friend" clean', p2[1].lyric === 'Friend', `got "${p2[1].lyric}"`);

  const lines = convertNotesToLyricLines(us.notes, new Set([13]), 300, 0);
  const p1Texts = lines.filter(l => l.player === 'P1').map(l => l.text).join(' | ');
  const p2Texts = lines.filter(l => l.player === 'P2').map(l => l.text).join(' | ');
  check('P1 line = "Hello World"', p1Texts === 'Hello World', `got "${p1Texts}"`);
  check('P2 line = "My Friend"', p2Texts === 'My Friend', `got "${p2Texts}"`);
}

// ────────────────────────────────────────────────────────────────────
console.log('\n6) Round-trip: variant-2 file → export → re-parse = identical text');
{
  const txt2 = [
    '#TITLE:QA Roundtrip',
    '#ARTIST:QA Bot',
    '#MP3:qa-short.mp3',
    '#BPM:300',
    '#GAP:0',
    ': 0 4 60 Hel',
    ': 4 4 60 lo',
    ': 8 4 60  World',
    '- 13',
    ': 16 4 60  Won',
    ': 20 4 60 der',
    ': 24 4 60  ful',
    '- 29',
    'E',
  ].join('\n');
  const song = convertUltraStarToSong(parseUltraStarTxt(txt2), '/qa-short.mp3');
  const exported = generateUltraStarTxt(song);
  const reparsed = convertUltraStarToSong(parseUltraStarTxt(exported), '/qa-short.mp3');
  check('export uses variant 1 (trailing space line present)', /: \d+ \d+ \d+ lo $/m.test(exported));
  check('round-trip line 1 = "Hello World"', reparsed.lyrics[0]?.text === song.lyrics[0]?.text, `"${reparsed.lyrics[0]?.text}" vs "${song.lyrics[0]?.text}"`);
  check('round-trip line 2 = "Wonder ful"→"Wonder ful"', reparsed.lyrics[1]?.text === song.lyrics[1]?.text, `"${reparsed.lyrics[1]?.text}" vs "${song.lyrics[1]?.text}"`);
  check('line 2 = "Wonder ful"', song.lyrics[1]?.text === 'Wonder ful', `got "${song.lyrics[1]?.text}"`);
}

// ────────────────────────────────────────────────────────────────────
console.log('\n7) Edge cases');
{
  // First note of file with leading space → boundary dropped
  const m1 = matchUltraStarNoteLine(': 0 4 60  World');
  check('matcher: separator dropped, boundary kept', m1?.lyric === ' World', `got "${m1?.lyric}"`);
  const m2 = matchUltraStarNoteLine(': 0 4 60 Hel');
  check('matcher: plain lyric "Hel" (separator dropped)', m2?.lyric === 'Hel', `got "${m2?.lyric}"`);
  const m3 = matchUltraStarNoteLine('  : 0 4 60 Hel');
  check('matcher: tolerates line indentation', m3?.lyric === 'Hel', `got "${m3?.lyric}"`);
  const m4 = matchUltraStarNoteLine('- 13');
  check('matcher: line-break line → null', m4 === null);
  const m5 = matchUltraStarNoteLine('#TITLE:x');
  check('matcher: header → null', m5 === null);

  const notes = [
    { lyric: ' First', startBeat: 0, duration: 4, player: undefined },
    { lyric: 'lo', startBeat: 4, duration: 4, player: undefined },
  ];
  normalizeUltraStarWordBoundaries(notes as Array<{ lyric: string; player?: string; startBeat: number; duration: number }>);
  check('first-note boundary dropped, stripped', notes[0].lyric === 'First', `got "${notes[0].lyric}"`);
  check('"lo" untouched (no false boundary)', notes[1].lyric === 'lo', `got "${notes[1].lyric}"`);

  // No-space separator (": 0 4 60World") still parses
  const m6 = matchUltraStarNoteLine(': 0 4 60World');
  check('matcher: no separator → lyric "World"', m6?.lyric === 'World', `got "${m6?.lyric}"`);

  // Golden/freestyle/rap notes with variant 2
  const txt = [
    '#TITLE:QA Types',
    '#BPM:300',
    '#GAP:0',
    ': 0 4 60 Hel',
    ': 4 4 60 lo',
    '* 8 4 60  Gold',
    'F 12 4 60  Free',
    'R 16 4 60  Rap',
    '- 21',
    'E',
  ].join('\n');
  const us = parseUltraStarTxt(txt);
  check('golden note boundary moved to "lo"', us.notes[1].lyric === 'lo ', `got "${us.notes[1].lyric}"`);
  check('"Gold" got the boundary of " Free"', us.notes[2].lyric === 'Gold ', `got "${us.notes[2].lyric}"`);
  check('"Free" got the boundary of " Rap"', us.notes[3].lyric === 'Free ', `got "${us.notes[3].lyric}"`);
  check('rap "Rap" clean', us.notes[4].lyric === 'Rap', `got "${us.notes[4].lyric}"`);
  const song = convertUltraStarToSong(us, '/qa-short.mp3');
  check('text = "Hello Gold Free Rap"', song.lyrics[0]?.text === 'Hello Gold Free Rap', `got "${song.lyrics[0]?.text}"`);
}

console.log(`\n═══ RESULT: ${pass} passed, ${fail} failed ═══`);
process.exit(fail > 0 ? 1 : 0);
