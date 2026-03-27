'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAllSongs } from '@/lib/game/song-library';
import { CHALLENGE_MODES } from '@/lib/game/player-progression';
import { Song } from '@/types/game';

export interface ChallengeModesTabProps {
  onPlayChallenge: (song: Song) => void;
}

export function ChallengeModesTab({ onPlayChallenge }: ChallengeModesTabProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'extreme':
        return 'border-red-500 text-red-400';
      case 'hard':
        return 'border-orange-500 text-orange-400';
      case 'medium':
        return 'border-yellow-500 text-yellow-400';
      default:
        return 'border-green-500 text-green-400';
    }
  };

  const getBorderColor = (difficulty: string) => {
    switch (difficulty) {
      case 'extreme':
        return 'border-red-500/30';
      case 'hard':
        return 'border-orange-500/30';
      case 'medium':
        return 'border-yellow-500/30';
      default:
        return 'border-green-500/30';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>🎮 Challenge Modes</CardTitle>
          <CardDescription>Special modifiers for extra XP rewards!</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {CHALLENGE_MODES.map((challenge) => (
          <Card
            key={challenge.id}
            className={`bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all relative ${getBorderColor(challenge.difficulty)}`}
            onClick={() => {
              localStorage.setItem('karaoke-challenge-mode', challenge.id);
              const songs = getAllSongs();
              if (songs.length > 0) {
                onPlayChallenge(songs[0]);
              }
            }}
          >
            <CardContent className="pt-4 pb-4">
              <div className="text-3xl mb-2">{challenge.icon}</div>
              <h4 className="font-bold text-white mb-1">{challenge.name}</h4>
              <p className="text-xs text-white/60 mb-3 line-clamp-2">{challenge.description}</p>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`text-xs ${getDifficultyColor(challenge.difficulty)}`}>
                  {challenge.difficulty.toUpperCase()}
                </Badge>
                <span className="text-cyan-400 font-bold text-sm">+{challenge.xpReward} XP</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
