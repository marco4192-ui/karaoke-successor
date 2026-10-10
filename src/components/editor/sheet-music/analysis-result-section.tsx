'use client';

/**
 * Section 2 of the sheet music dialog: analysis result (confidence +
 * warnings), voice/strand picker, tempo, transposition and the optional
 * lyrics textarea. Rendered only when an analysis exists (guard stays
 * in the orchestrator, which also renders the leading Separator).
 *
 * R13: JSX moved byte-identically from src/components/editor/sheet-music-dialog.tsx
 * (dedented for the component level; the five sibling blocks are wrapped
 * in a Fragment — the original fragment + leading Separator + guard stay
 * in the orchestrator).
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Gauge, Layers, MessageSquareWarning, Music4 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SheetMusicAnalysis, SheetMusicVoice } from './types';
import { formatBeatsDuration } from './analysis-utils';

interface SheetMusicAnalysisResultSectionProps {
  t: (key: string) => string;
  sm: (key: string) => string;
  analysis: SheetMusicAnalysis;
  analysisIsMerged: boolean;
  selectedVoice: SheetMusicVoice | null;
  selectedVoiceId: number;
  setSelectedVoiceId: (id: number) => void;
  setConfirmReplace: (value: boolean) => void;
  selectedVoiceDuration: number;
  lowQuality: boolean;
  tempo: number;
  setTempo: (value: number) => void;
  transpose: number;
  setTranspose: (value: number) => void;
  lyricsText: string;
  setLyricsText: (value: string) => void;
  syllables: string[];
}

/** Analysis result: quality + voices + tempo + transpose + lyrics (Section 2). */
export function SheetMusicAnalysisResultSection({
  t,
  sm,
  analysis,
  analysisIsMerged,
  selectedVoice,
  selectedVoiceId,
  setSelectedVoiceId,
  setConfirmReplace,
  selectedVoiceDuration,
  lowQuality,
  tempo,
  setTempo,
  transpose,
  setTranspose,
  lyricsText,
  setLyricsText,
  syllables,
}: SheetMusicAnalysisResultSectionProps) {
  return (
    <>
    <div className="space-y-2" data-testid="sheet-music-quality">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-300">
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          {sm('confidence')}: {Math.round(analysis.confidence * 100)}%
        </span>
        <span className="font-mono text-xs text-slate-500">
          {formatBeatsDuration(selectedVoiceDuration, tempo)}
        </span>
      </div>
      {lowQuality && (
        <div
          className="bg-amber-500/10 border border-amber-500/40 text-amber-300 rounded-lg p-2.5 text-xs flex items-start gap-2"
          role="status"
          data-testid="sheet-music-low-quality"
        >
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {t('editor.midiImport.sheetMusic.lowQualityWarning')}
        </div>
      )}
      {analysis.warnings && (
        <div
          className="bg-slate-800/60 border border-slate-700 text-slate-400 rounded-lg p-2.5 text-xs flex items-start gap-2"
          role="status"
          data-testid="sheet-music-warnings"
        >
          <MessageSquareWarning className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
          <span>
            <span className="text-slate-500">{sm('warnings')}: </span>
            {analysis.warnings}
          </span>
        </div>
      )}
    </div>

    {/* Voices (Stränge) — user picks the correct strand */}
    <div className="space-y-2">
      <Label className="text-slate-400 text-xs flex items-center gap-1.5 flex-wrap">
        <Music4 className="w-3.5 h-3.5 text-cyan-400" />
        {t('editor.midiImport.sheetMusic.voices')}
        {analysisIsMerged && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/40 text-[10px] text-purple-300 font-normal"
            data-testid="sheet-music-merged-badge"
            title={t('editor.midiImport.sheetMusic.mergedHint')}
          >
            <Layers className="w-3 h-3" aria-hidden />
            {t('editor.midiImport.sheetMusic.mergedVoices')}
          </span>
        )}
      </Label>
      <div
        className="border border-slate-700 rounded-lg overflow-hidden"
        data-testid="sheet-music-voice-list"
      >
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 px-3 py-1.5 bg-slate-800/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <span className="w-6" />
          <span>{sm('voiceLabel')}</span>
          <span className="text-right">{t('editor.midiImport.trackNotes')}</span>
          <span className="text-right font-mono normal-case">m:ss</span>
        </div>
        <div className="max-h-48 overflow-y-auto editor-panel-scroll">
          {analysis.voices.map(v => {
            const isSelected = v.id === selectedVoiceId;
            const voiceBeats = v.notes.reduce((sum, n) => sum + n.beats, 0);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => { setSelectedVoiceId(v.id); setConfirmReplace(false); }}
                aria-pressed={isSelected}
                data-testid={`sheet-music-voice-${v.id}`}
                className={cn(
                  'w-full grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center px-3 py-2 text-left text-sm transition-colors border-b border-slate-800 last:border-b-0',
                  isSelected
                    ? 'bg-cyan-500/15 text-white'
                    : 'text-slate-300 hover:bg-white/5',
                )}
              >
                <span
                  className={cn(
                    'w-3 h-3 rounded-full border shrink-0',
                    isSelected ? 'bg-cyan-400 border-cyan-300' : 'border-slate-600',
                  )}
                  aria-hidden
                />
                <span className="truncate">
                  <span className="text-slate-500 font-mono text-xs mr-1.5">{v.id}</span>
                  {v.label}
                </span>
                <span className="text-right font-mono text-xs text-slate-400">{v.noteCount}</span>
                <span className="text-right font-mono text-xs text-slate-400">
                  {formatBeatsDuration(voiceBeats, tempo)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>

    {/* Tempo (editable, default from the result) */}
    <div className="space-y-2">
      <Label htmlFor="sheet-music-tempo" className="text-slate-400 text-xs">
        {t('editor.midiImport.sheetMusic.tempo')}
      </Label>
      <Input
        id="sheet-music-tempo"
        type="number"
        value={tempo}
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10);
          setTempo(Number.isNaN(parsed) ? 120 : Math.max(20, Math.min(300, parsed)));
        }}
        min={20}
        max={300}
        step={1}
        className="bg-slate-800 border-slate-600 w-28 font-mono"
        data-testid="sheet-music-tempo"
      />
    </div>

    {/* Transposition */}
    <div className="space-y-2">
      <Label htmlFor="sheet-music-transpose" className="text-slate-400 text-xs">
        {t('editor.midiImport.sheetMusic.transpose')}
      </Label>
      <Input
        id="sheet-music-transpose"
        type="number"
        value={transpose}
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10);
          setTranspose(Number.isNaN(parsed) ? 0 : Math.max(-48, Math.min(48, parsed)));
        }}
        min={-48}
        max={48}
        step={1}
        className="bg-slate-800 border-slate-600 w-28 font-mono"
        data-testid="sheet-music-transpose"
      />
    </div>

    {/* Optional lyrics → sequential syllable assignment */}
    <div className="space-y-2">
      <Label htmlFor="sheet-music-lyrics" className="text-slate-400 text-xs flex items-center gap-1.5">
        <Music4 className="w-3.5 h-3.5 text-purple-400" />
        {t('editor.midiImport.sheetMusic.lyricsOptional')}
      </Label>
      <Textarea
        id="sheet-music-lyrics"
        value={lyricsText}
        onChange={(e) => setLyricsText(e.target.value)}
        placeholder={t('editor.midiImport.lyricsPlaceholder')}
        className="bg-slate-800 border-slate-600 min-h-[100px] font-mono text-sm"
        data-testid="sheet-music-lyrics"
      />
      {selectedVoice && selectedVoice.noteCount > 0 && (
        <p className="text-xs text-slate-600" data-testid="sheet-music-syllable-info">
          {t('editor.midiImport.sheetMusic.syllableAssignment')
            .replace('{syllables}', String(syllables.length))
            .replace('{notes}', String(selectedVoice.noteCount))}
        </p>
      )}
    </div>
    </>
  );
}
