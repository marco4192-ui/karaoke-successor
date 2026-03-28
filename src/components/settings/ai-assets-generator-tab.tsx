'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import {
  APIConfigurationCard,
  AssetTypeSelector,
  ImageGeneratorCard,
  AudioGeneratorCard,
  GeneratedAssetsCard,
  GeneratedAsset,
  VocalSeparatorCard,
} from './ai-assets';

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z" />
    </svg>
  );
}

type AssetType = 'image' | 'audio' | 'separator';

export function AIAssetsGeneratorTab() {
  const [assetType, setAssetType] = useState<AssetType>('image');
  const [prompt, setPrompt] = useState('');
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateAsset = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      if (assetType === 'image') {
        if (!prompt.trim()) {
          setError('Please enter a prompt for the image');
          setIsGenerating(false);
          return;
        }

        const data = await apiClient.generateAsset({
          type: 'image',
          prompt: prompt,
          filename: `generated-${Date.now()}.png`,
          size: '1024x1024'
        });

        if (!data.success) {
          throw new Error(data.error || 'Failed to generate image');
        }

        setGeneratedAssets(prev => [...prev, {
          type: 'image',
          data: data.image as string,
          filename: data.filename as string
        }]);
      } else if (assetType === 'audio') {
        if (!text.trim()) {
          setError('Please enter text for the audio');
          setIsGenerating(false);
          return;
        }

        const data = await apiClient.generateAsset({
          type: 'audio',
          text: text,
          filename: `audio-${Date.now()}.wav`
        });

        if (!data.success) {
          throw new Error(data.error || 'Failed to generate audio');
        }

        setGeneratedAssets(prev => [...prev, {
          type: 'audio',
          data: data.audio as string,
          filename: data.filename as string
        }]);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAsset = (asset: GeneratedAsset) => {
    const link = document.createElement('a');
    if (asset.type === 'image') {
      link.href = `data:image/png;base64,${asset.data}`;
    } else {
      link.href = `data:audio/wav;base64,${asset.data}`;
    }
    link.download = asset.filename;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <SparkleIcon className="w-6 h-6 text-purple-400" />
          AI Tools
        </h2>
        <p className="text-white/60">Generate assets and separate vocals using AI - all offline</p>
      </div>

      {/* API Configuration Section */}
      {assetType !== 'separator' && <APIConfigurationCard />}

      {/* Type Toggle */}
      <AssetTypeSelector assetType={assetType} onChange={setAssetType} />

      {/* Generator */}
      {assetType === 'image' && (
        <ImageGeneratorCard
          prompt={prompt}
          isGenerating={isGenerating}
          error={error}
          onPromptChange={setPrompt}
          onGenerate={generateAsset}
        />
      )}

      {assetType === 'audio' && (
        <AudioGeneratorCard
          text={text}
          isGenerating={isGenerating}
          error={error}
          onTextChange={setText}
          onGenerate={generateAsset}
        />
      )}

      {assetType === 'separator' && (
        <VocalSeparatorCard />
      )}

      {/* Generated Assets - only for image/audio */}
      {assetType !== 'separator' && (
        <GeneratedAssetsCard assets={generatedAssets} onDownload={downloadAsset} />
      )}

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <SparkleIcon className="w-5 h-5 text-purple-400 mt-0.5" />
            <div className="text-sm text-white/70">
              <p className="font-medium text-white mb-1">About AI Tools</p>
              {assetType === 'separator' ? (
                <p>
                  Vocal separation uses ONNX neural networks running locally in your browser.
                  No data is uploaded - everything is processed on your device. 
                  Download a model once, then use it offline forever.
                </p>
              ) : (
                <>
                  <p>Images and audio are generated using AI. For best results:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
                    <li>Be specific in your image descriptions</li>
                    <li>Include style keywords like "gaming", "neon", "vector"</li>
                    <li>Audio supports multiple voices and languages</li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
