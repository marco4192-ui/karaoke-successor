'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HighscoreEntry } from '@/types/game';
import { TrophyIcon } from './constants';

interface SongLeaderboardPreviewProps {
  songHighscores: HighscoreEntry[];
  activeProfileId: string | null;
  currentPlayerRank: number | null;
  onViewAll: () => void;
}

export function SongLeaderboardPreview({ songHighscores, activeProfileId, currentPlayerRank, onViewAll }: SongLeaderboardPreviewProps) {
  if (songHighscores.length === 0) return null;

  return (
    <Card className="bg-white/5 border-white/10 mb-8">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-yellow-400" />
            Song Leaderboard
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-purple-400 hover:text-purple-300"
          >
            View All →
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {songHighscores.slice(0, 3).map((entry, index) => (
            <div 
              key={entry.id}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                entry.playerId === activeProfileId ? 'bg-cyan-500/20' : 'bg-white/5'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-yellow-500 text-black' :
                index === 1 ? 'bg-gray-300 text-black' :
                index === 2 ? 'bg-orange-500 text-black' :
                'bg-white/10'
              }`}>
                {index + 1}
              </div>
              <span className="flex-1 text-sm truncate">{entry.playerName}</span>
              <span className="text-sm font-bold text-cyan-400">{entry.score.toLocaleString()}</span>
              {entry.playerId === activeProfileId && currentPlayerRank && (
                <Badge className="bg-cyan-500/30 text-cyan-300 text-xs">You #{currentPlayerRank}</Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
