'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export interface ChallengeProgressCardProps {
  profileLevel: number;
  profileXP: number;
  levelInfo: {
    title: string;
    nextLevel: number;
    progress: number;
  };
}

export function ChallengeProgressCard({
  profileLevel,
  profileXP,
  levelInfo,
}: ChallengeProgressCardProps) {
  return (
    <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 mb-6">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold text-purple-400">Lv.{profileLevel}</div>
            <div>
              <div className="text-sm font-medium">{levelInfo.title}</div>
              <div className="text-xs text-white/60">{profileXP.toLocaleString()} XP</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/60">Next Level</div>
            <div className="text-sm font-medium">{levelInfo.nextLevel.toLocaleString()} XP</div>
          </div>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
            style={{ width: `${levelInfo.progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
