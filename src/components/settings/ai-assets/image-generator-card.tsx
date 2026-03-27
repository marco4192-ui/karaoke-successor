'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const IMAGE_PRESETS = [
  { name: 'Title Background', prompt: 'Karaoke game title screen background, neon lights, microphone silhouette on stage, vibrant purple and cyan gradient, musical notes floating, concert stage atmosphere, no text' },
  { name: 'Game Background', prompt: 'Concert stage view from singer perspective, crowd silhouette, spotlights and stage lights, dramatic lighting, purple and blue atmosphere' },
  { name: 'Bronze Rank Badge', prompt: 'bronze microphone badge icon, simple design, warm bronze metallic color, gaming achievement style, clean vector art' },
  { name: 'Silver Rank Badge', prompt: 'silver microphone badge icon, shiny silver metallic color, gaming achievement style, clean vector art' },
  { name: 'Gold Rank Badge', prompt: 'gold microphone badge icon, elegant design, shiny gold metallic color, gaming achievement style, clean vector art' },
  { name: 'Platinum Rank Badge', prompt: 'platinum microphone badge icon, premium design, gleaming platinum metallic color, gaming achievement style, clean vector art' },
  { name: 'Diamond Rank Badge', prompt: 'diamond microphone badge icon, luxury design, sparkling diamond crystal effect, gaming achievement style, clean vector art' },
  { name: 'Achievement Trophy', prompt: 'achievement icon, golden trophy cup with star, winner celebration, gaming style icon, clean design' },
];

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z" />
    </svg>
  );
}

interface ImageGeneratorCardProps {
  prompt: string;
  isGenerating: boolean;
  error: string | null;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
}

export function ImageGeneratorCard({
  prompt,
  isGenerating,
  error,
  onPromptChange,
  onGenerate,
}: ImageGeneratorCardProps) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle>Image Generation</CardTitle>
        <CardDescription>Describe the image you want to generate</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="e.g., A neon-lit karaoke stage with microphones..."
          className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-white/40 resize-none focus:outline-none focus:border-purple-500"
        />
        {/* Preset Buttons */}
        <div>
          <p className="text-sm text-white/60 mb-2">Quick presets:</p>
          <div className="flex flex-wrap gap-2">
            {IMAGE_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                size="sm"
                variant="outline"
                onClick={() => onPromptChange(preset.prompt)}
                className="border-white/20 text-white/70 hover:text-white"
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              <SparkleIcon className="w-4 h-4 mr-2" />
              Generate Image
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
