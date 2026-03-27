'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DAILY_BADGES } from '@/lib/game/daily-challenge';

export interface PlayerBadge {
  id: string;
  icon: string;
  name: string;
  description: string;
  unlockedAt: number;
}

export interface DailyBadgesTabProps {
  playerBadges: PlayerBadge[];
}

export function DailyBadgesTab({ playerBadges }: DailyBadgesTabProps) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle>🎖️ Your Badges ({playerBadges.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {playerBadges.length === 0 ? (
          <div className="text-center py-8 text-white/40">
            <div className="text-4xl mb-2">🎖️</div>
            <p>Complete challenges to earn badges!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {playerBadges.map((badge) => (
              <div
                key={badge.id}
                className="p-4 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg text-center"
              >
                <div className="text-3xl mb-2">{badge.icon}</div>
                <div className="font-medium text-amber-400">{badge.name}</div>
                <div className="text-xs text-white/60 mt-1">{badge.description}</div>
                <div className="text-xs text-white/40 mt-2">
                  {new Date(badge.unlockedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <h4 className="text-sm font-medium text-white/60 mb-3">Available Badges</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 opacity-50">
            {Object.values(DAILY_BADGES)
              .filter((b) => !playerBadges.some((pb) => pb.id === b.id))
              .slice(0, 6)
              .map((badge) => (
                <div
                  key={badge.id}
                  className="p-4 bg-white/5 border border-white/10 rounded-lg text-center grayscale"
                >
                  <div className="text-3xl mb-2">{badge.icon}</div>
                  <div className="font-medium">{badge.name}</div>
                  <div className="text-xs text-white/60 mt-1">{badge.description}</div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
