'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  StemSeparator,
  getStemSeparator,
  SeparationProgress,
  audioBufferToWav,
  loadAudioFile,
} from '@/lib/audio/stem-separator';
import {
  SimpleStemSeparator,
  SimpleSeparationProgress,
} from '@/lib/audio/simple-stem-separator';

type SeparationMethod = 'ai' | 'simple';
type StemType = 'vocals' | 'accompaniment';

interface SeparatedStems {
  vocals: AudioBuffer | null;
  accompaniment: AudioBuffer | null;
}

export function StemSeparationPanel() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [originalAudio, setOriginalAudio] = useState<AudioBuffer | null>(null);
  const [stems, setStems] = useState<SeparatedStems>({ vocals: null, accompaniment: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [method, setMethod] = useState<SeparationMethod>('simple');
  const [vocalsVolume, setVocalsVolume] = useState(100);
  const [accVolume, setAccVolume] = useState(100);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const vocalsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const accSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const vocalsGainRef = useRef<GainNode | null>(null);
  const accGainRef = useRef<GainNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFile(file);
    setError(null);
    setStems({ vocals: null, accompaniment: null });

    try {
      const audioBuffer = await loadAudioFile(file);
      setOriginalAudio(audioBuffer);
    } catch {
      setError('Failed to load audio file. Please try a different file.');
    }
  };

  // Run separation
  const runSeparation = async () => {
    if (!originalAudio) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      if (method === 'ai') {
        await runAISeparation();
      } else {
        await runSimpleSeparation();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Separation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // AI-based separation (ONNX)
  const runAISeparation = async () => {
    setIsModelLoading(true);
    setProgressMessage('Loading AI model...');

    const onProgress = (p: SeparationProgress) => {
      setProgress(p.progress);
      setProgressMessage(p.message);
    };

    try {
      const separator = getStemSeparator({ onProgress });
      await separator.initialize('spleeter-2stems');
      setIsModelLoading(false);

      const result = await separator.separate(originalAudio!);
      setStems({
        vocals: result.stems.get('vocals') || null,
        accompaniment: result.stems.get('accompaniment') || null,
      });
    } catch (err) {
      console.error('AI separation failed, falling back to simple:', err);
      setProgressMessage('AI model unavailable, using simple method...');
      await runSimpleSeparation();
    }
  };

  // Simple spectral separation
  const runSimpleSeparation = async () => {
    const onProgress = (p: SimpleSeparationProgress) => {
      setProgress(p.progress);
      setProgressMessage(p.message);
    };

    const separator = new SimpleStemSeparator(onProgress);
    const result = await separator.separate(originalAudio!);

    setStems({
      vocals: result.vocals,
      accompaniment: result.accompaniment,
    });
  };

  // Play stems
  const playStems = async () => {
    const ctx = getAudioContext();

    // Stop existing playback
    stopPlayback();

    // Create gain nodes
    vocalsGainRef.current = ctx.createGain();
    vocalsGainRef.current.gain.value = vocalsVolume / 100;
    vocalsGainRef.current.connect(ctx.destination);

    accGainRef.current = ctx.createGain();
    accGainRef.current.gain.value = accVolume / 100;
    accGainRef.current.connect(ctx.destination);

    // Play vocals
    if (stems.vocals) {
      vocalsSourceRef.current = ctx.createBufferSource();
      vocalsSourceRef.current.buffer = stems.vocals;
      vocalsSourceRef.current.connect(vocalsGainRef.current);
      vocalsSourceRef.current.start();
    }

    // Play accompaniment
    if (stems.accompaniment) {
      accSourceRef.current = ctx.createBufferSource();
      accSourceRef.current.buffer = stems.accompaniment;
      accSourceRef.current.connect(accGainRef.current);
      accSourceRef.current.start();
    }
  };

  // Stop playback
  const stopPlayback = () => {
    try {
      vocalsSourceRef.current?.stop();
    } catch {}
    try {
      accSourceRef.current?.stop();
    } catch {}
    vocalsSourceRef.current = null;
    accSourceRef.current = null;
  };

  // Update volume
  const updateVolume = (stem: StemType, value: number) => {
    if (stem === 'vocals') {
      setVocalsVolume(value);
      if (vocalsGainRef.current) {
        vocalsGainRef.current.gain.value = value / 100;
      }
    } else {
      setAccVolume(value);
      if (accGainRef.current) {
        accGainRef.current.gain.value = value / 100;
      }
    }
  };

  // Download stem
  const downloadStem = (stem: StemType) => {
    const buffer = stems[stem];
    if (!buffer) return;

    const wav = audioBufferToWav(buffer);
    const url = URL.createObjectURL(wav);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${audioFile?.name?.replace(/\.[^/.]+$/, '')}_${stem}.wav` || `${stem}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎤 AI Voice Separation
          {stems.vocals && (
            <Badge className="bg-green-500">Stems Ready</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Separate vocals from accompaniment using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        <div className="space-y-2">
          <Label>Audio File</Label>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              {audioFile ? `📁 ${audioFile.name}` : '📁 Select Audio File'}
            </Button>
            {originalAudio && (
              <Badge variant="outline" className="self-center">
                {(originalAudio.duration).toFixed(1)}s
              </Badge>
            )}
          </div>
        </div>

        {/* Method Selection */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Use AI Model</Label>
            <p className="text-xs text-white/40">
              {method === 'ai' ? 'More accurate, requires download' : 'Faster, basic quality'}
            </p>
          </div>
          <Switch
            checked={method === 'ai'}
            onCheckedChange={(checked) => setMethod(checked ? 'ai' : 'simple')}
            disabled={isProcessing}
          />
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{progressMessage}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Separation Button */}
        <Button
          onClick={runSeparation}
          disabled={!originalAudio || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            isModelLoading ? '⏳ Loading Model...' : '🔄 Separating...'
          ) : (
            '✨ Separate Vocals'
          )}
        </Button>

        {/* Playback Controls */}
        {stems.vocals && (
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h4 className="font-medium">Mix Preview</h4>

            {/* Vocals */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>🎤 Vocals</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadStem('vocals')}
                  >
                    💾 Save
                  </Button>
                </div>
              </div>
              <Slider
                value={[vocalsVolume]}
                onValueChange={([v]) => updateVolume('vocals', v)}
                max={100}
                step={1}
              />
            </div>

            {/* Accompaniment */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>🎵 Accompaniment</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadStem('accompaniment')}
                  >
                    💾 Save
                  </Button>
                </div>
              </div>
              <Slider
                value={[accVolume]}
                onValueChange={([v]) => updateVolume('accompaniment', v)}
                max={100}
                step={1}
              />
            </div>

            {/* Play/Stop */}
            <div className="flex gap-2">
              <Button onClick={playStems} className="flex-1">
                ▶️ Play Mix
              </Button>
              <Button onClick={stopPlayback} variant="outline" className="flex-1">
                ⏹️ Stop
              </Button>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-white/40 bg-white/5 p-3 rounded-lg">
          <strong>💡 Tip:</strong> The simple method works instantly for most songs.
          Enable AI for better results with complex mixes.
        </div>
      </CardContent>
    </Card>
  );
}

// Compact inline version for quick access
export function QuickStemSeparation({
  onSeparationComplete,
}: {
  onSeparationComplete?: (vocals: AudioBuffer, accompaniment: AudioBuffer) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const audioBuffer = await loadAudioFile(file);
      const separator = new SimpleStemSeparator((p) => setProgress(p.progress));
      const result = await separator.separate(audioBuffer);
      onSeparationComplete?.(result.vocals, result.accompaniment);
    } catch (err) {
      console.error('Separation failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
        id="quick-stem-input"
      />
      <Button
        asChild
        disabled={isProcessing}
        size="sm"
        variant="outline"
      >
        <label htmlFor="quick-stem-input" className="cursor-pointer">
          {isProcessing ? `⏳ ${Math.round(progress)}%` : '🎤 Extract Vocals'}
        </label>
      </Button>
    </div>
  );
}
