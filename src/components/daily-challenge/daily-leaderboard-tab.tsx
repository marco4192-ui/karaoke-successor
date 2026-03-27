'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  playerColor: string;
  score: number;
  accuracy: number;
  combo: number;
}

export interface DailyLeaderboardTabProps {
  entries: LeaderboardEntry[];
  totalParticipants: number;
}

export function DailyLeaderboardTab({
  entries,
  totalParticipants,
}: DailyLeaderboardTabProps) {
  // Sort by score
  const sortedEntries = [...entries].sort((a, b) => b.score - a.score);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle>🏆 Today&apos;s Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedEntries.length === 0 ? (
          <div className="text-center py-8 text-white/40">
            <div className="text-4xl mb-2">🎯</div>
            <p>No entries yet! Be the first to complete today&apos;s challenge!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedEntries.slice(0, 10).map((entry, idx) => (
              <div
                key={entry.playerId}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  idx === 0
                    ? 'bg-amber-500/20 border border-amber-500/30'
                    : idx === 1
                      ? 'bg-gray-400/20 border border-gray-400/30'
                      : idx === 2
                        ? 'bg-orange-700/20 border border-orange-700/30'
                        : 'bg-white/5'
                }`}
              >
                <div className="text-xl font-bold w-8">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </div>
                {entry.playerAvatar ? (
                  <img src={entry.playerAvatar} alt={entry.playerName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: entry.playerColor }}
                  >
                    {entry.playerName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium">{entry.playerName}</div>
                  <div className="text-xs text-white/60">
                    {entry.accuracy.toFixed(1)}% accuracy • {entry.combo} max combo
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{entry.score.toLocaleString()}</div>
                  <div className="text-xs text-white/40">points</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-center text-sm text-white/40">
          {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''} today
        </div>
      </CardContent>
    </Card>
  );
}
