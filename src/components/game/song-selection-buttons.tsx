'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  SongSelectionOption,
  SONG_SELECTION_CONFIG,
} from '@/lib/game/party-game-configs';

interface SongSelectionButtonsProps {
  options: SongSelectionOption[];
  minPlayers: number;
  selectedPlayerCount: number;
  onSelect: (option: SongSelectionOption) => void;
}

export function SongSelectionButtons({
  options,
  minPlayers,
  selectedPlayerCount,
  onSelect,
}: SongSelectionButtonsProps) {
  const canSelect = selectedPlayerCount >= minPlayers;

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">🎵</span>
          Song Selection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {options.map((option) => {
            const optConfig = SONG_SELECTION_CONFIG[option];
            return (
              <button
                key={option}
                onClick={() => onSelect(option)}
                disabled={!canSelect}
                className={`p-4 rounded-xl text-center transition-all ${
                  canSelect
                    ? `${optConfig.color} text-white hover:scale-105`
                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                }`}
              >
                <div className="text-4xl mb-2">{optConfig.icon}</div>
                <div className="font-bold">{optConfig.label}</div>
                <div className="text-xs opacity-80 mt-1">{optConfig.description}</div>
              </button>
            );
          })}
        </div>

        {/* Additional Ideas */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-white/40 text-sm mb-2">💡 Additional Ideas:</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-white/20 text-white/50">
              🎯 Challenge Mode
            </Badge>
            <Badge variant="outline" className="border-white/20 text-white/50">
              🌍 Country Selection
            </Badge>
            <Badge variant="outline" className="border-white/20 text-white/50">
              📊 By Difficulty
            </Badge>
            <Badge variant="outline" className="border-white/20 text-white/50">
              ⏱️ By Duration
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
