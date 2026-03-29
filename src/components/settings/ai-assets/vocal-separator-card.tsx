'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  useVocalSeparator,
  SeparatedStem,
} from '@/hooks/use-vocal-separator';
import type { SeparationProgress } from '@/lib/audio/vocal-separator';
import { getModelManager, ModelInfo, ModelDownloadProgress } from '@/lib/audio/model-manager';
import { getStemDisplayName, getStemIcon, audioBufferToWav } from '@/lib/audio/vocal-separator';
import { StemType } from '@/lib/audio/vocal-separator/types';

interface ModelWithStatus extends ModelInfo {
  isDownloaded: boolean;
}

export function VocalSeparatorCard() {
  const [models, setModels] = useState<ModelWithStatus[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('mdx23c-instvoc');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<ModelDownloadProgress | null>(null);
  const [stems, setStems] = useState<SeparatedStem[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    status,
    isReady,
    isProcessing,
    progress,
    error,
    initialize,
    separate,
    switchModel,
    clearResult,
  } = useVocalSeparator({
    modelId: selectedModelId,
  });

  // Load available models on mount
  useEffect(() => {
    const modelManager = getModelManager();
    setModels(modelManager.getAvailableModels());
  }, []);

  // Handle model download
  const handleDownloadModel = useCallback(async (modelId: string) => {
    setIsDownloading(true);
    setDownloadProgress(null);

    try {
      const modelManager = getModelManager();
      await modelManager.downloadModel(modelId, (progress) => {
        setDownloadProgress(progress);
      });

      // Refresh model list
      setModels(modelManager.getAvailableModels());
    } catch (err) {
      console.error('Failed to download model:', err);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  }, []);

  // Handle model selection
  const handleSelectModel = useCallback(async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model?.isDownloaded) {
      await handleDownloadModel(modelId);
    }

    setSelectedModelId(modelId);

    if (isReady) {
      await switchModel(modelId);
    }
  }, [models, isReady, switchModel, handleDownloadModel]);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setStems([]);
    }
  }, []);

  // Handle separation
  const handleSeparate = useCallback(async () => {
    if (!audioFile) return;

    clearResult();
    setStems([]);

    try {
      const result = await separate(audioFile, {
        stems: ['vocals', 'instrumental'],
        normalize: true,
      });

      if (result) {
        // Convert stems to playable format
        const newStems: SeparatedStem[] = [];
        for (const [stemType, buffer] of result.stems) {
          const blob = audioBufferToWav(buffer);
          const url = URL.createObjectURL(blob);
          newStems.push({
            type: stemType,
            buffer,
            blob,
            url,
          });
        }
        setStems(newStems);
      }
    } catch (err) {
      console.error('Separation failed:', err);
    }
  }, [audioFile, separate, clearResult]);

  // Handle stem download
  const handleDownloadStem = useCallback((stem: SeparatedStem) => {
    const link = document.createElement('a');
    link.href = stem.url;
    link.download = `${audioFile?.name?.replace(/\.[^/.]+$/, '')}_${stem.type}.wav` || `${stem.type}.wav`;
    link.click();
  }, [audioFile]);

  // Get progress message
  const getProgressMessage = (progress: SeparationProgress | null): string => {
    if (!progress) return '';
    
    switch (progress.stage) {
      case 'loading_model':
        return 'Loading AI model...';
      case 'loading_audio':
        return 'Loading audio file...';
      case 'processing':
        return `Processing: ${progress.message}`;
      case 'encoding':
        return 'Encoding output...';
      case 'complete':
        return 'Complete!';
      case 'error':
        return progress.message;
      default:
        return progress.message;
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎤 AI Vocal Separator
          {isReady && (
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
              Ready
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Separate vocals from instrumental using AI - works offline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Model Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-white/80">AI Model</label>
          <div className="grid gap-2">
            {models.map((model) => (
              <div
                key={model.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedModelId === model.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
                onClick={() => handleSelectModel(model.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{model.name}</p>
                    <p className="text-xs text-white/50">{model.description}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {model.sizeMB} MB
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          model.quality === 'high'
                            ? 'border-green-500/30 text-green-400'
                            : model.quality === 'fast'
                            ? 'border-yellow-500/30 text-yellow-400'
                            : 'border-blue-500/30 text-blue-400'
                        }`}
                      >
                        {model.quality}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    {model.isDownloaded ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        ✓ Downloaded
                      </Badge>
                    ) : (
                      <Badge className="bg-white/10 text-white/60">
                        {isDownloading && downloadProgress?.modelId === model.id
                          ? `${downloadProgress.progress}%`
                          : 'Download'}
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Download Progress */}
                {isDownloading && downloadProgress?.modelId === model.id && (
                  <div className="mt-3">
                    <Progress value={downloadProgress.progress} className="h-2" />
                    <p className="text-xs text-white/50 mt-1">
                      {downloadProgress.status === 'downloading'
                        ? `Downloading... ${downloadProgress.downloadedMB}/${downloadProgress.totalMB} MB`
                        : downloadProgress.status === 'complete'
                        ? 'Download complete!'
                        : downloadProgress.status}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Audio File Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-white/80">Audio File</label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="audio/*"
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-purple-500/50 transition-colors"
          >
            {audioFile ? (
              <div>
                <p className="font-medium">{audioFile.name}</p>
                <p className="text-sm text-white/50">
                  {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-white/60">Click to select an audio file</p>
                <p className="text-xs text-white/40 mt-1">MP3, WAV, FLAC, OGG supported</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        {(isProcessing || progress) && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">{getProgressMessage(progress)}</span>
              <span className="text-white/80">{progress?.progress || 0}%</span>
            </div>
            <Progress value={progress?.progress || 0} className="h-2" />
            {progress?.estimatedTimeRemaining && (
              <p className="text-xs text-white/50 text-right">
                ~{progress.estimatedTimeRemaining}s remaining
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

        {/* Separate Button */}
        <Button
          onClick={handleSeparate}
          disabled={!audioFile || !isReady || isProcessing || isDownloading}
          className="w-full bg-purple-500 hover:bg-purple-400 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Processing...
            </>
          ) : (
            <>
              🎵 Separate Vocals
            </>
          )}
        </Button>

        {/* Results */}
        {stems.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Separated Stems</h3>
            <div className="grid gap-3">
              {stems.map((stem) => (
                <div
                  key={stem.type}
                  className="p-3 bg-white/5 border border-white/10 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getStemIcon(stem.type)}</span>
                      <div>
                        <p className="font-medium">{getStemDisplayName(stem.type)}</p>
                        <p className="text-xs text-white/50">
                          {(stem.blob.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <audio controls className="h-8 w-40" src={stem.url}>
                        <track kind="captions" />
                      </audio>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadStem(stem)}
                      >
                        💾 Save
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-white/40 bg-white/5 p-3 rounded-lg">
          <p className="font-medium text-white/60 mb-1">💡 How it works</p>
          <p>
            AI vocal separation uses ONNX Runtime to run neural networks locally.
            No data is sent to external servers - everything runs in your browser.
            Processing time depends on audio length and your device&apos;s CPU.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
