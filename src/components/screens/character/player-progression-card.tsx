'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayerProfile } from '@/types/game';
import { getLevelForXP, getRankForXP } from '@/lib/game/player-progression';
import { getCountryFlag } from './country-options';

interface PlayerProgressionCardProps {
  profile: PlayerProfile;
  onToggleActive?: () => void;
}

export function PlayerProgressionCard({ profile, onToggleActive }: PlayerProgressionCardProps) {
  const profileXP = profile.xp || 0;
  const playerLevel = getLevelForXP(profileXP);
  const playerRank = getRankForXP(profileXP);

  return (
    <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-4">
          <div className="relative">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden border-2 border-purple-400"
              style={{ backgroundColor: profile.color }}
            >
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.name[0].toUpperCase()
              )}
            </div>
            {profile.country && (
              <div className="absolute -bottom-1 -right-1 text-xl">
                {getCountryFlag(profile.country)}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{playerRank?.icon || '🎵'}</span>
              <div>
                <div className="text-xl font-bold">{profile.name}</div>
                <div className="text-sm text-white/60">
                  {playerRank?.name || 'Beginner'} • Level {playerLevel?.level || 1} • {profileXP.toLocaleString()} XP
                </div>
              </div>
            </div>
          </div>
          {onToggleActive && (
            <button
              onClick={onToggleActive}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                (profile.isActive ?? true) 
                  ? 'bg-green-500/30 text-green-300' 
                  : 'bg-red-500/30 text-red-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${(profile.isActive ?? true) ? 'bg-green-400' : 'bg-red-400'}`} />
              {(profile.isActive ?? true) ? 'Active' : 'Inactive'}
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* XP Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white/60">Progress to Next Level</span>
            <span className="text-purple-400">{playerLevel?.progress.toFixed(1)}%</span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${playerLevel?.progress || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/40 mt-1">
            <span>{playerLevel?.currentXP || 0} XP</span>
            <span>{playerLevel?.nextLevelXP || 500} XP needed</span>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-cyan-400">{profile.gamesPlayed || 0}</div>
            <div className="text-xs text-white/60">Songs Played</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-yellow-400">{profile.stats?.goldenNotesHit || 0}</div>
            <div className="text-xs text-white/60">Golden Notes</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-green-400">{profile.stats?.bestCombo || 0}</div>
            <div className="text-xs text-white/60">Best Combo</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-purple-400">{profile.totalScore?.toLocaleString() || 0}</div>
            <div className="text-xs text-white/60">Total Score</div>
          </div>
        </div>
        
        {/* Achievements */}
        {profile.achievements && profile.achievements.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-white/60 mb-2">Achievements ({profile.achievements.length})</h4>
            <div className="flex flex-wrap gap-2">
              {profile.achievements.slice(0, 6).map((achievement) => (
                <Badge 
                  key={achievement.id}
                  className="bg-white/10 border border-white/20"
                >
                  {achievement.icon} {achievement.name}
                </Badge>
              ))}
              {profile.achievements.length > 6 && (
                <Badge className="bg-white/10">+{profile.achievements.length - 6} more</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
