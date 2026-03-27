'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface DailyStatsRowProps {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
}

export function DailyStatsRow({
  currentStreak,
  longestStreak,
  totalCompleted,
}: DailyStatsRowProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <Card className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-orange-500/30">
        <CardContent className="pt-4 text-center">
          <div className="text-3xl mb-1">🔥</div>
          <div className="text-2xl font-bold text-orange-400">{currentStreak}</div>
          <div className="text-xs text-white/60">Day Streak</div>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardContent className="pt-4 text-center">
          <div className="text-3xl mb-1">🏆</div>
          <div className="text-2xl font-bold text-amber-400">{longestStreak}</div>
          <div className="text-xs text-white/60">Best Streak</div>
        </CardContent>
      </Card>
      <Card className="bg-white/5 border-white/10">
        <CardContent className="pt-4 text-center">
          <div className="text-3xl mb-1">✅</div>
          <div className="text-2xl font-bold text-green-400">{totalCompleted}</div>
          <div className="text-xs text-white/60">Completed</div>
        </CardContent>
      </Card>
    </div>
  );
}
