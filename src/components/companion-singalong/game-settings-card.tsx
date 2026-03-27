'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Difficulty } from '@/types/game';
import { CompanionSingAlongSettings } from './use-companion-setup';

interface GameSettingsCardProps {
  settings: CompanionSingAlongSettings;
  globalDifficulty: Difficulty;
  onUpdateSettings: (updates: Partial<CompanionSingAlongSettings>) => void;
  onSetDifficulty: (difficulty: Difficulty) => void;
}

export function GameSettingsCard({
  settings,
  globalDifficulty,
  onUpdateSettings,
  onSetDifficulty,
}: GameSettingsCardProps) {
  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle>Game Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Min Turn Duration */}
        <div>
          <label className="text-sm text-white/60 mb-2 block">Min Turn Duration: {settings.minTurnDuration}s</label>
          <input
            type="range"
            min={5}
            max={30}
            step={5}
            value={settings.minTurnDuration}
            onChange={(e) => onUpdateSettings({ minTurnDuration: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Max Turn Duration */}
        <div>
          <label className="text-sm text-white/60 mb-2 block">Max Turn Duration: {settings.maxTurnDuration}s</label>
          <input
            type="range"
            min={30}
            max={90}
            step={5}
            value={settings.maxTurnDuration}
            onChange={(e) => onUpdateSettings({ maxTurnDuration: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Blink Warning */}
        <div>
          <label className="text-sm text-white/60 mb-2 block">Blink Warning: {settings.blinkWarning}s</label>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={settings.blinkWarning}
            onChange={(e) => onUpdateSettings({ blinkWarning: Number(e.target.value) })}
            className="w-full"
          />
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
                className={globalDifficulty === diff ? 'bg-emerald-500 hover:bg-emerald-600' : 'border-white/20'}
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
