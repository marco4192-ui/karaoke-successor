'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Difficulty } from '@/types/game';
import { MedleySettings } from './use-medley-setup';

interface MedleySettingsCardProps {
  settings: MedleySettings;
  globalDifficulty: Difficulty;
  onUpdateSettings: (updates: Partial<MedleySettings>) => void;
  onSetDifficulty: (difficulty: Difficulty) => void;
}

export function MedleySettingsCard({
  settings,
  globalDifficulty,
  onUpdateSettings,
  onSetDifficulty,
}: MedleySettingsCardProps) {
  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle>Medley Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Snippet Duration */}
        <div>
          <label className="text-sm text-white/60 mb-2 block">Snippet Duration: {settings.snippetDuration}s</label>
          <input
            type="range"
            min={15}
            max={60}
            step={5}
            value={settings.snippetDuration}
            onChange={(e) => onUpdateSettings({ snippetDuration: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-white/40 mt-1">
            <span>15s (Quick)</span>
            <span>60s (Extended)</span>
          </div>
        </div>

        {/* Snippet Count */}
        <div>
          <label className="text-sm text-white/60 mb-2 block">Number of Songs: {settings.snippetCount}</label>
          <input
            type="range"
            min={3}
            max={10}
            step={1}
            value={settings.snippetCount}
            onChange={(e) => onUpdateSettings({ snippetCount: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-white/40 mt-1">
            <span>3 songs</span>
            <span>10 songs</span>
          </div>
        </div>

        {/* Transition Time */}
        <div>
          <label className="text-sm text-white/60 mb-2 block">Transition Time: {settings.transitionTime}s</label>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={settings.transitionTime}
            onChange={(e) => onUpdateSettings({ transitionTime: Number(e.target.value) })}
            className="w-full"
          />
          <p className="text-xs text-white/40 mt-1">Time between snippets</p>
        </div>

        {/* Difficulty */}
        <div>
          <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
          <div className="flex gap-2">
            {['easy', 'medium', 'hard'].map(diff => (
              <Button
                key={diff}
                variant={globalDifficulty === diff ? 'default' : 'outline'}
                onClick={() => onSetDifficulty(diff as Difficulty)}
                className={globalDifficulty === diff ? 'bg-purple-500 hover:bg-purple-600' : 'border-white/20'}
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
