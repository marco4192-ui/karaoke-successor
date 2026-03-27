'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs } from '@/lib/game/song-library';
import { XP_REWARDS } from '@/lib/game/daily-challenge';
import { Song, PlayerProfile } from '@/types/game';
import { MicIcon } from '@/components/icons';

export interface DailyChallengeTabProps {
  challenge: {
    type: string;
    target: number;
  };
  completedToday: boolean;
  timeLeft: { hours: number; minutes: number };
  currentStreak: number;
  profiles: PlayerProfile[];
  activeProfileId: string | null;
  onSelectSong: (song: Song) => void;
}

export function DailyChallengeTab({
  challenge,
  completedToday,
  timeLeft,
  currentStreak,
  profiles,
  activeProfileId,
  onSelectSong,
}: DailyChallengeTabProps) {
  const { setActiveProfile } = useGameStore();
  const [gameMode, setGameMode] = useState<'single' | 'duel'>('single');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(
    activeProfileId ? [activeProfileId] : []
  );

  // Challenge descriptions
  const challengeDescriptions: Record<string, string> = {
    score: `Score ${challenge.target.toLocaleString()}+ points in a single song`,
    accuracy: `Achieve ${challenge.target}%+ accuracy`,
    combo: `Get a ${challenge.target}+ note combo`,
    songs: `Complete ${challenge.target} songs today`,
    perfect_notes: `Hit ${challenge.target}+ perfect notes`,
  };

  return (
    <Card className={`bg-white/5 border-white/10 ${completedToday ? 'ring-2 ring-green-500' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{completedToday ? '✅ Challenge Complete!' : '🎯 Today\'s Challenge'}</span>
          <Badge variant="outline" className="border-cyan-500 text-cyan-400">
            +{XP_REWARDS.CHALLENGE_COMPLETE} XP
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg mb-4">{challengeDescriptions[challenge.type] || 'Complete the challenge!'}</p>

        <div className="mb-4 p-4 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-white/60">Target</span>
            <span className="font-medium">{challenge.target.toLocaleString()}</span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${completedToday ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`}
              style={{ width: completedToday ? '100%' : '0%' }}
            />
          </div>
        </div>

        {/* Game Mode Selection */}
        {!completedToday && (
          <div className="mb-4">
            <label className="text-sm text-white/60 mb-2 block">Game Mode</label>
            <div className="flex gap-2">
              <Button
                variant={gameMode === 'single' ? 'default' : 'outline'}
                onClick={() => setGameMode('single')}
                className={gameMode === 'single' ? 'bg-cyan-500' : 'border-white/20'}
              >
                <MicIcon className="w-4 h-4 mr-2" /> Single
              </Button>
              <Button
                variant={gameMode === 'duel' ? 'default' : 'outline'}
                onClick={() => setGameMode('duel')}
                className={gameMode === 'duel' ? 'bg-purple-500' : 'border-white/20'}
              >
                ⚔️ Duel
              </Button>
            </div>
          </div>
        )}

        {/* Player Selection for Duel Mode */}
        {!completedToday && gameMode === 'duel' && (
          <div className="mb-4">
            <label className="text-sm text-white/60 mb-2 block">Select 2 Players</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
              {profiles.filter(p => p.isActive !== false).map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => {
                    const newSelection = selectedPlayerIds.includes(profile.id)
                      ? selectedPlayerIds.filter(id => id !== profile.id)
                      : selectedPlayerIds.length < 2
                        ? [...selectedPlayerIds, profile.id]
                        : selectedPlayerIds;
                    setSelectedPlayerIds(newSelection);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                    selectedPlayerIds.includes(profile.id)
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: profile.color }}
                  >
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      profile.name[0]
                    )}
                  </div>
                  <span className="text-sm truncate">{profile.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-white/60">
            Resets in: {timeLeft.hours}h {timeLeft.minutes}m
          </div>
          {!completedToday && (
            <Button
              onClick={() => {
                const songs = getAllSongs();
                if (songs.length > 0) {
                  const randomSong = songs[Math.floor(Math.random() * songs.length)];
                  if (gameMode === 'single' && selectedPlayerIds[0]) {
                    setActiveProfile(selectedPlayerIds[0]);
                  }
                  onSelectSong(randomSong);
                }
              }}
              disabled={gameMode === 'duel' && selectedPlayerIds.length < 2}
              className="bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              Play Now
            </Button>
          )}
        </div>

        {!completedToday && currentStreak > 0 && (
          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="text-sm text-orange-400">
              🔥 Streak Bonus: +{XP_REWARDS.STREAK_BONUS_BASE * currentStreak} XP ({currentStreak} days)
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
