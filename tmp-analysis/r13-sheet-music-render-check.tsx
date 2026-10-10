// R13 sheet-music render smoke: OLD (git-HEAD original) vs NEW (orchestrator +
// modules) must render IDENTICAL markup for the same props. Additionally the
// NEW section components render standalone with representative props.
// Run with: bun tmp-analysis/r13-sheet-music-render-check.tsx
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as OLD from './r13-sheet-music-dialog-ORIG';
import * as NEW from '../src/components/editor/sheet-music-dialog';
import { SheetMusicUploadSection } from '../src/components/editor/sheet-music/upload-section';
import { SheetMusicPdfNavigation } from '../src/components/editor/sheet-music/pdf-page-navigation';
import { SheetMusicAnalysisResultSection } from '../src/components/editor/sheet-music/analysis-result-section';
import { SheetMusicImportActions } from '../src/components/editor/sheet-music/import-actions';
import { mergePageAnalyses, formatBeatsDuration } from '../src/components/editor/sheet-music/analysis-utils';

let failures = 0;
function check(name: string, a: unknown, b: unknown) {
  if (a === b) console.log(`OK   ${name}`);
  else {
    failures++;
    console.log(`FAIL ${name}\n  old len=${String(a).length} new len=${String(b).length}`);
    // find first divergence
    const sa = String(a), sb = String(b);
    let i = 0;
    while (i < sa.length && i < sb.length && sa[i] === sb[i]) i++;
    console.log(`  first diff at ${i}:\n  old: …${sa.slice(Math.max(0, i - 80), i + 120)}\n  new: …${sb.slice(Math.max(0, i - 80), i + 120)}`);
  }
}

const noop = () => {};
const props = { open: true, onOpenChange: noop, onImport: noop, hasExistingNotes: true };

const oldMarkup = renderToStaticMarkup(React.createElement(OLD.SheetMusicDialog, props));
const newMarkup = renderToStaticMarkup(React.createElement(NEW.SheetMusicDialog, props));
check('SheetMusicDialog markup (open, empty state)', oldMarkup, newMarkup);

// closed state must render nothing in both
const oldClosed = renderToStaticMarkup(React.createElement(OLD.SheetMusicDialog, { ...props, open: false }));
const newClosed = renderToStaticMarkup(React.createElement(NEW.SheetMusicDialog, { ...props, open: false }));
check('SheetMusicDialog closed → empty', oldClosed, newClosed);
check('closed markup is empty', oldClosed, '');

// ── NEW sections with representative props (no-crash + key testids) ──
const t = (key: string) => key; // identity translations (same for both sides above via useTranslation)
const sm = (key: string) => `editor.midiImport.sheetMusic.${key}`;

const analysis = mergePageAnalyses([
  {
    voices: [
      { id: 1, label: 'Strang 1', noteCount: 3, notes: [{ midi: 60, beats: 1 }, { midi: 62, beats: 0.5 }, { midi: 64, beats: 1.5 }] },
      { id: 2, label: 'Strang 2', noteCount: 1, notes: [{ midi: 55, beats: 4 }] },
    ],
    tempo: 96,
    confidence: 0.42,
    warnings: 'Testwarnung',
    truncated: false,
  },
])!;

const analysisSection = renderToStaticMarkup(
  <SheetMusicAnalysisResultSection
    t={t}
    sm={sm}
    analysis={analysis}
    analysisIsMerged
    selectedVoice={analysis.voices[0]}
    selectedVoiceId={1}
    setSelectedVoiceId={noop}
    setConfirmReplace={noop}
    selectedVoiceDuration={3}
    lowQuality
    tempo={96}
    setTempo={noop}
    transpose={-2}
    setTranspose={noop}
    lyricsText="la la la"
    setLyricsText={noop}
    syllables={['la', 'la', 'la']}
  />,
);
for (const id of ['sheet-music-quality', 'sheet-music-low-quality', 'sheet-music-warnings', 'sheet-music-merged-badge',
  'sheet-music-voice-list', 'sheet-music-voice-1', 'sheet-music-voice-2', 'sheet-music-tempo', 'sheet-music-transpose',
  'sheet-music-lyrics', 'sheet-music-syllable-info']) {
  const ok = analysisSection.includes(`data-testid="${id}"`);
  console.log(`${ok ? 'OK  ' : 'FAIL'} analysis section testid ${id}`);
  if (!ok) failures++;
}
check('formatBeatsDuration(3, 96)', formatBeatsDuration(3, 96), '0:01'); // 3 beats @96bpm = 1.875s → 0:01

const pdfPages = [
  { pageNumber: 1, dataUrl: 'data:image/png;base64,AAA', base64: 'AAA' },
  { pageNumber: 2, dataUrl: 'data:image/png;base64,BBB', base64: 'BBB' },
];
const pdfNav = renderToStaticMarkup(
  <SheetMusicPdfNavigation
    pdfPages={pdfPages}
    pdfTotalPages={5}
    currentPageIndex={1}
    isAnalyzing={false}
    isRenderingPdf={false}
    analyzeAll
    setAnalyzeAll={noop}
    goToPage={noop}
    t={t}
  />,
);
for (const id of ['sheet-music-pdf-pages', 'sheet-music-pdf-page-indicator', 'sheet-music-pdf-prev', 'sheet-music-pdf-next',
  'sheet-music-pdf-thumb-1', 'sheet-music-pdf-thumb-2', 'sheet-music-analyze-all-toggle']) {
  const ok = pdfNav.includes(`data-testid="${id}"`);
  console.log(`${ok ? 'OK  ' : 'FAIL'} pdf-nav testid ${id}`);
  if (!ok) failures++;
}

const upload = renderToStaticMarkup(
  <SheetMusicUploadSection
    t={t}
    fileInputRef={{ current: null }}
    image={{ dataUrl: 'data:image/png;base64,AAA', base64: 'AAA', mimeType: 'image/png', fileName: 'test.png' }}
    pdfFileName="test.pdf"
    pdfPages={pdfPages}
    pdfTotalPages={5}
    currentPageIndex={0}
    analyzeAll
    setAnalyzeAll={noop}
    isAnalyzing={false}
    isRenderingPdf={false}
    canAnalyze
    analyzingText="…"
    handlePickedFile={noop}
    handleChooseFile={noop}
    handleAnalyze={noop}
    goToPage={noop}
  />,
);
for (const id of ['sheet-music-file-input', 'sheet-music-choose-image', 'sheet-music-analyze', 'sheet-music-image-loaded',
  'sheet-music-upload-hint', 'sheet-music-preview', 'sheet-music-pdf-pages']) {
  const ok = upload.includes(`data-testid="${id}"`);
  console.log(`${ok ? 'OK  ' : 'FAIL'} upload testid ${id}`);
  if (!ok) failures++;
}

const actions = renderToStaticMarkup(
  <SheetMusicImportActions
    t={t}
    confirmReplace
    setConfirmReplace={noop}
    canImport
    emitImport={noop}
    handleImportClick={noop}
    closeDialog={noop}
  />,
);
for (const id of ['sheet-music-replace-confirm', 'sheet-music-replace-confirm-button']) {
  const ok = actions.includes(`data-testid="${id}"`);
  console.log(`${ok ? 'OK  ' : 'FAIL'} actions testid ${id}`);
  if (!ok) failures++;
}

console.log(failures === 0 ? '\nALL SHEET-MUSIC RENDER CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
