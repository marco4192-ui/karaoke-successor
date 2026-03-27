'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Difficulty } from '@/types/game';

interface TournamentSettingsCardProps {
  maxPlayers: 2 | 4 | 8 | 16 | 32;
  shortMode: boolean;
  difficulty: Difficulty;
  onUpdateMaxPlayers: (size: 2 | 4 | 8 | 16 | 32) => void;
  onToggleShortMode: () => void;
  onSetDifficulty: (difficulty: Difficulty) => void;
}

export function TournamentSettingsCard({
  maxPlayers,
  shortMode,
  difficulty,
  onUpdateMaxPlayers,
  onToggleShortMode,
  onSetDifficulty,
}: TournamentSettingsCardProps) {
  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle>Tournament Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Max Players */}
        <div>
          <label className="text-sm text-white/60 mb-2 block">Bracket Size</label>
          <div className="flex gap-2 flex-wrap">
            {[2, 4, 8, 16, 32].map(size => (
              <Button
                key={size}
                variant={maxPlayers === size ? 'default' : 'outline'}
                onClick={() => onUpdateMaxPlayers(size as 2 | 4 | 8 | 16 | 32)}
                className={maxPlayers === size ? 'bg-amber-500 hover:bg-amber-600' : 'border-white/20'}
              >
                {size} {size === 2 ? 'Duel' : 'Players'}
              </Button>
            ))}
          </div>
        </div>

        {/* Short Mode */}
        <div className="flex items-center justify-between">
          <div>
            <label className="font-medium">Short Mode</label>
            <p className="text-sm text-white/60">Each match lasts only 60 seconds</p>
          </div>
          <Button
            variant={shortMode ? 'default' : 'outline'}
            onClick={onToggleShortMode}
            className={shortMode ? 'bg-green-500 hover:bg-green-600' : 'border-white/20'}
          >
            {shortMode ? '✓ 60 Seconds' : 'Full Song'}
          </Button>
        </div>

        {/* Difficulty */}
        <div>
          <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
          <div className="flex gap-2">
            {['easy', 'medium', 'hard'].map(diff => (
              <Button
                key={diff}
                variant={difficulty === diff ? 'default' : 'outline'}
                onClick={() => onSetDifficulty(diff as Difficulty)}
                className={difficulty === diff ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
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
