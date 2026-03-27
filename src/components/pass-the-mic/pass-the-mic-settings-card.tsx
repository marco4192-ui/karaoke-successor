'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Difficulty } from '@/types/game';
import { PassTheMicSettings } from './use-pass-the-mic-setup';

interface PassTheMicSettingsCardProps {
  settings: PassTheMicSettings;
  globalDifficulty: Difficulty;
  onUpdateSettings: (updates: Partial<PassTheMicSettings>) => void;
  onSetDifficulty: (difficulty: Difficulty) => void;
}

export function PassTheMicSettingsCard({
  settings,
  globalDifficulty,
  onUpdateSettings,
  onSetDifficulty,
}: PassTheMicSettingsCardProps) {
  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle>Game Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Segment Duration */}
        <div>
          <label className="text-sm text-white/60 mb-2 block">Segment Duration: {settings.segmentDuration}s</label>
          <input
            type="range"
            min={15}
            max={60}
            step={5}
            value={settings.segmentDuration}
            onChange={(e) => onUpdateSettings({ segmentDuration: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-white/40 mt-1">
            <span>15s (Fast switches)</span>
            <span>60s (Long segments)</span>
          </div>
        </div>

        {/* Random Switches */}
        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium">Random Switches</label>
            <p className="text-sm text-white/60">Randomly switch players mid-segment</p>
          </div>
          <Button
            variant={settings.randomSwitches ? 'default' : 'outline'}
            onClick={() => onUpdateSettings({ randomSwitches: !settings.randomSwitches })}
            className={settings.randomSwitches ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
          >
            {settings.randomSwitches ? '✓ On' : 'Off'}
          </Button>
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
                className={globalDifficulty === diff ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
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
