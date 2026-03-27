'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const AUDIO_PRESETS = [
  { name: 'Level Up!', text: 'Level Up!' },
  { name: 'High Score!', text: 'New High Score!' },
  { name: 'Challenge Complete!', text: 'Challenge Complete!' },
  { name: 'Perfect Score!', text: 'Perfect Score!' },
  { name: 'Achievement!', text: 'Achievement Unlocked!' },
  { name: 'Welcome!', text: 'Welcome to Karaoke Successor!' },
  { name: 'Get Ready!', text: 'Get ready to sing!' },
  { name: 'Amazing!', text: 'Amazing performance!' },
];

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z" />
    </svg>
  );
}

interface AudioGeneratorCardProps {
  text: string;
  isGenerating: boolean;
  error: string | null;
  onTextChange: (text: string) => void;
  onGenerate: () => void;
}

export function AudioGeneratorCard({
  text,
  isGenerating,
  error,
  onTextChange,
  onGenerate,
}: AudioGeneratorCardProps) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle>Text-to-Speech</CardTitle>
        <CardDescription>Enter text to convert to speech</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="e.g., Level Up!"
          className="bg-white/5 border-white/10 text-white"
        />
        {/* Preset Buttons */}
        <div>
          <p className="text-sm text-white/60 mb-2">Quick presets:</p>
          <div className="flex flex-wrap gap-2">
            {AUDIO_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                size="sm"
                variant="outline"
                onClick={() => onTextChange(preset.text)}
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
              Generate Audio
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
