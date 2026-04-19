'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Waves, Brain, Activity, CheckCircle, AlertTriangle,
  XCircle, Loader2, Zap, Music,
} from 'lucide-react';
import {
  useAudioAnalysis,
  CONFIDENCE_COLORS,
  type ConfidenceLevel,
  type PitchAnalysisResult,
  type DetectedNote,
} from '@/hooks/use-audio-analysis';

// ============================================================================
// Types
// ============================================================================

interface AudioAnalysisPanelProps {
  audioFilePath: string | null;
  onApplyNotes: (notes: DetectedNote[]) => void;
  onApplyBpm: (bpm: number) => void;
}

// ============================================================================
// Component
// ============================================================================

export function AudioAnalysisPanel({
  audioFilePath,
  onApplyNotes,
  onApplyBpm,
}: AudioAnalysisPanelProps) {
  const {
    status,
    progress,
    result,
    bpmResult,
    error,
    crepeAvailable,
    analyzePitch,
    detectBpm,
    reset,
  } = useAudioAnalysis();

  const [algorithm, setAlgorithm] = React.useState<'yin' | 'crepe'>('yin');

  // Confidence summary
  const confidenceSummary = useMemo(() => {
    if (!result || result.notes.length === 0) return null;
    const counts: Record<ConfidenceLevel, number> = { High: 0, Medium: 0, Low: 0, VeryLow: 0 };
    for (const note of result.notes) {
      counts[note.confidence_level]++;
    }
    const total = result.notes.length;
    return {
      counts,
      total,
      highPct: Math.round((counts.High / total) * 100),
      mediumPct: Math.round((counts.Medium / total) * 100),
      lowPct: Math.round((counts.Low / total) * 100),
      veryLowPct: Math.round((counts.VeryLow / total) * 100),
    };
  }, [result]);

  const isIdle = status === 'idle';
  const isWorking = status === 'loading' || status === 'analyzing';
  const isComplete = status === 'complete';
  const isError = status === 'error';

  const hasNotes = result && result.notes.length > 0;
  const hasBpm = (result && result.bpm > 0) || bpmResult;

  // BPM wird nur nach Klick auf "BPM übernehmen" angewendet

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Waves className="w-4 h-4 text-cyan-400" />
          Audio-Analyse
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Automatische Tonhöhen- und BPM-Erkennung
        </p>
      </div>

      {/* Status indicator */}
      {isWorking && (
        <div className="flex items-center gap-2 text-xs text-cyan-400 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {progress?.message || 'Analysiere...'}
        </div>
      )}

      {/* Progress bar */}
      {isWorking && progress && (
        <div className="space-y-1">
          <Progress value={progress.progress} className="h-2 [&>div]:bg-cyan-500" />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>{progress.stage}</span>
            <span>{Math.round(progress.progress)}%</span>
          </div>
        </div>
      )}

      {/* Error display */}
      {isError && error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
          <div className="flex items-center gap-1.5 font-medium mb-1">
            <XCircle className="w-3.5 h-3.5" />
            Fehler
          </div>
          {error}
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="mt-2 text-xs text-red-300 hover:text-red-200 h-6"
          >
            Erneut versuchen
          </Button>
        </div>
      )}

      <Separator className="bg-slate-700" />

      {/* Algorithm selection */}
      <div className="space-y-2">
        <label className="text-xs text-slate-400">Algorithmus</label>
        <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as 'yin' | 'crepe')}>
          <SelectTrigger className="bg-slate-800 border-slate-600 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yin">
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-cyan-400" />
                <div>
                  <div className="text-xs">YIN (3-Schichten)</div>
                  <div className="text-[10px] text-slate-500">Schnell, gute Genauigkeit</div>
                </div>
              </div>
            </SelectItem>
            <SelectItem value="crepe" disabled={!crepeAvailable}>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <div>
                  <div className="text-xs">CREPE (Deep Learning)</div>
                  <div className="text-[10px] text-slate-500">
                    {crepeAvailable ? 'Höchste Genauigkeit' : 'Nicht verfügbar (Feature aktivieren)'}
                  </div>
                </div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        <Button
          onClick={() => analyzePitch(audioFilePath || '', { algorithm })}
          disabled={!audioFilePath || isWorking}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-xs h-9"
        >
          {isWorking ? (
            <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Analysiere...</>
          ) : (
            <><Waves className="w-3.5 h-3.5 mr-2" />Pitch-Analyse starten</>
          )}
        </Button>

        <Button
          onClick={() => detectBpm(audioFilePath || '')}
          disabled={!audioFilePath || isWorking}
          variant="outline"
          className="w-full border-slate-600 text-slate-300 text-xs h-9"
        >
          <Activity className="w-3.5 h-3.5 mr-2" />
          Nur BPM erkennen
        </Button>
      </div>

      {/* Results section */}
      {isComplete && (
        <>
          <Separator className="bg-slate-700" />

          {/* Confidence summary */}
          {confidenceSummary && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400">
                Konfidenz-Übersicht
              </h4>
              <div className="space-y-1.5">
                {(['High', 'Medium', 'Low', 'VeryLow'] as ConfidenceLevel[]).map((level) => {
                  const colors = CONFIDENCE_COLORS[level];
                  const count = confidenceSummary.counts[level];
                  const pct = confidenceSummary[`${level.toLowerCase()}Pct` as keyof typeof confidenceSummary] as number;
                  if (count === 0) return null;

                  return (
                    <div key={level} className="flex items-center gap-2 text-[10px]">
                      <div className={`w-2.5 h-2.5 rounded-sm ${colors.bg} border ${colors.border}`} />
                      <span className={`flex-1 ${colors.text}`}>{colors.label.split(' — ')[0]}</span>
                      <span className="text-slate-500">{count} Noten ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BPM result */}
          {hasBpm && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Erkanntes BPM
                </span>
                <span className="text-lg font-bold text-cyan-400">
                  {bpmResult?.bpm || result?.bpm || '—'}
                </span>
              </div>
              {result && (
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <div>Algorithmus: {result.algorithm}</div>
                  <div>Dauer: {(result.analysis_duration_ms / 1000).toFixed(1)}s</div>
                  <div>Sample-Rate: {result.sample_rate} Hz</div>
                  <div>Noten: {result.notes.length}</div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            {hasNotes && (
              <Button
                onClick={() => result && onApplyNotes(result.notes)}
                className="w-full bg-green-600 hover:bg-green-700 text-xs h-9"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-2" />
                {confidenceSummary
                  ? `Pitches anwenden (${confidenceSummary.highPct}% zuverlässig)`
                  : 'Pitches anwenden'
                }
              </Button>
            )}

            {hasBpm && (
              <Button
                onClick={() => onApplyBpm(bpmResult?.bpm || result?.bpm || 120)}
                variant="outline"
                className="w-full border-slate-600 text-slate-300 text-xs h-9"
              >
                <Music className="w-3.5 h-3.5 mr-2" />
                BPM übernehmen
              </Button>
            )}

            <Button
              onClick={reset}
              variant="ghost"
              className="w-full text-slate-500 hover:text-slate-300 text-xs h-8"
            >
              Zurücksetzen
            </Button>
          </div>
        </>
      )}

      {/* Info */}
      {!isComplete && !isWorking && !isError && !audioFilePath && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300">
          <p className="font-semibold">Keine Audiodatei zugewiesen</p>
          <p className="text-slate-500 mt-1">
            Die Analyse-Funktionen erfordern eine Audiodatei. Bitte weise im Editor eine Audio-Datei zu,
            oder stelle sicher dass der Song korrekt importiert wurde.
          </p>
        </div>
      )}

      {!isComplete && !isWorking && !isError && audioFilePath && (
        <div className="text-[10px] text-slate-600 space-y-1.5">
          <p className="flex items-start gap-1.5">
            <Brain className="w-3 h-3 mt-0.5 flex-shrink-0 text-cyan-600" />
            3-Schichten-Pipeline: Voicing → YIN Pitch → Octave Correction
          </p>
          <p className="flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-yellow-600" />
            Noten werden farblich markiert: Grün = sicher, Rot = manuell prüfen
          </p>
          <p className="flex items-start gap-1.5">
            <Activity className="w-3 h-3 mt-0.5 flex-shrink-0 text-purple-600" />
            BPM wird aus dem Rhythmus des Liedes automatisch erkannt
          </p>
        </div>
      )}
    </div>
  );
}
