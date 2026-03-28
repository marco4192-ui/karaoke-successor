/**
 * Vocal Separator Panel Component
 * UI for separating vocals from instrumental
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVocalSeparator } from '@/hooks/use-vocal-separator';
import {
  AVAILABLE_MODELS,
  StemType,
  getStemDisplayName,
  getStemIcon,
} from '@/lib/audio/vocal-separator';
import { logger } from '@/lib/logger';

interface VocalSeparatorPanelProps {
  /** Audio source (URL or File) */
  audioSource?: string | File | null;
  /** Callback when separation completes */
  onSeparationComplete?: (stems: Map<StemType, string>) => void;
  /** Callback when stem is selected for playback */
  onStemSelect?: (stem: StemType, url: string) => void;
  /** Compact mode for inline use */
  compact?: boolean;
}

export function VocalSeparatorPanel({
  audioSource,
  onSeparationComplete,
  onStemSelect,
  compact = false,
}: VocalSeparatorPanelProps) {
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [selectedStems, setSelectedStems] = useState<StemType[]>(['vocals', 'instrumental']);

  const {
    isReady,
    isProcessing,
    progress,
    stems,
    error,
    initialize,
    separate,
    getStemUrl,
    clearResult,
  } = useVocalSeparator({
    modelId: selectedModel,
    onError: (err) => logger.error('[VocalSeparatorPanel]', err.message),
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingStem, setPlayingStem] = useState<StemType | null>(null);

  /**
   * Handle separation
   */
  const handleSeparate = useCallback(async () => {
    if (!audioSource) return;

    const result = await separate(audioSource, {
      stems: selectedStems,
      normalize: true,
    });

    if (result && onSeparationComplete) {
      const stemUrls = new Map<StemType, string>();
      for (const stem of stems) {
        const url = getStemUrl(stem.type);
        if (url) {
          stemUrls.set(stem.type, url);
        }
      }
      onSeparationComplete(stemUrls);
    }
  }, [audioSource, separate, selectedStems, stems, getStemUrl, onSeparationComplete]);

  /**
   * Play a stem
   */
  const playStem = useCallback((stem: StemType) => {
    const url = getStemUrl(stem);
    if (!url || !audioRef.current) return;

    if (playingStem === stem) {
      audioRef.current.pause();
      setPlayingStem(null);
    } else {
      audioRef.current.src = url;
      audioRef.current.play();
      setPlayingStem(stem);
    }
  }, [getStemUrl, playingStem]);

  /**
   * Download a stem
   */
  const downloadStem = useCallback((stem: StemType) => {
    const url = getStemUrl(stem);
    if (!url) return;

    const a = document.createElement('a');
    a.href = url;
    a.download = `${stem}.wav`;
    a.click();
  }, [getStemUrl]);

  /**
   * Toggle stem selection
   */
  const toggleStem = useCallback((stem: StemType) => {
    setSelectedStems(prev =>
      prev.includes(stem)
        ? prev.filter(s => s !== stem)
        : [...prev, stem]
    );
  }, []);

  // Compact mode
  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSeparate}
            disabled={!audioSource || isProcessing || !isReady}
            size="sm"
            className="bg-purple-500 hover:bg-purple-400"
          >
            {isProcessing ? '⏳ Processing...' : '🎤 Extract Vocals'}
          </Button>

          {stems.length > 0 && (
            <div className="flex gap-1">
              {stems.map(stem => (
                <Button
                  key={stem.type}
                  size="sm"
                  variant="outline"
                  onClick={() => onStemSelect?.(stem.type, stem.url)}
                >
                  {getStemIcon(stem.type)}
                </Button>
              ))}
            </div>
          )}
        </div>

        {isProcessing && progress && (
          <div className="space-y-1">
            <Progress value={progress.progress} className="h-1" />
            <p className="text-xs text-white/60">{progress.message}</p>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎤 Vocal Separator
          {!isReady && (
            <Badge variant="outline" className="text-yellow-400 border-yellow-400">
              Not Initialized
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          AI-powered vocal/instrumental separation for any song
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-sm text-white/60">Model</label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_MODELS.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name} ({model.sizeMB}MB)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stem Selection */}
        <div className="space-y-2">
          <label className="text-sm text-white/60">Stems to Extract</label>
          <div className="flex flex-wrap gap-2">
            {(['vocals', 'instrumental', 'drums', 'bass', 'other'] as StemType[]).map(stem => (
              <Badge
                key={stem}
                className={`cursor-pointer transition-all ${
                  selectedStems.includes(stem)
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
                onClick={() => toggleStem(stem)}
              >
                {getStemIcon(stem)} {getStemDisplayName(stem)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Initialize Button */}
        {!isReady && (
          <Button
            onClick={initialize}
            className="w-full bg-blue-500 hover:bg-blue-400"
          >
            ⚡ Initialize Separator
          </Button>
        )}

        {/* Separate Button */}
        {isReady && (
          <Button
            onClick={handleSeparate}
            disabled={!audioSource || isProcessing}
            className="w-full bg-purple-500 hover:bg-purple-400"
          >
            {isProcessing ? '⏳ Processing...' : '🎤 Separate Vocals'}
          </Button>
        )}

        {/* Progress */}
        {isProcessing && progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">{progress.stage}</span>
              <span>{progress.progress}%</span>
            </div>
            <Progress value={progress.progress} className="h-2" />
            <p className="text-sm text-white/60">{progress.message}</p>
            {progress.estimatedTimeRemaining && (
              <p className="text-xs text-white/40">
                ~{Math.round(progress.estimatedTimeRemaining)}s remaining
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {stems.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm text-white/60">Separated Stems</label>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-4">
                {stems.map(stem => (
                  <div
                    key={stem.type}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getStemIcon(stem.type)}</span>
                      <div>
                        <p className="font-medium">{getStemDisplayName(stem.type)}</p>
                        <p className="text-xs text-white/40">
                          {(stem.blob.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => playStem(stem.type)}
                        className={playingStem === stem.type ? 'bg-green-500/20' : ''}
                      >
                        {playingStem === stem.type ? '⏸️' : '▶️'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadStem(stem.type)}
                      >
                        ⬇️
                      </Button>
                      {onStemSelect && (
                        <Button
                          size="sm"
                          onClick={() => onStemSelect(stem.type, stem.url)}
                        >
                          Use
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Clear Button */}
        {stems.length > 0 && (
          <Button
            onClick={clearResult}
            variant="outline"
            className="w-full"
          >
            🗑️ Clear Results
          </Button>
        )}

        {/* Info */}
        <div className="text-xs text-white/40 bg-white/5 p-3 rounded-lg">
          <strong>💡 Info:</strong> Vocal separation uses AI to extract vocals and
          instruments from any audio file. Processing time depends on audio length
          and your device&apos;s performance.
        </div>
      </CardContent>

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} onEnded={() => setPlayingStem(null)} />
    </Card>
  );
}

export default VocalSeparatorPanel;
