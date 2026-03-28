'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { TrophyIcon } from '@/components/icons';
import { HighscoreEntry, RANKING_TITLES } from '@/types/game';
import { OnlineLeaderboard } from '@/components/leaderboard/online-leaderboard';

export function HighscoreScreen() {
  const { highscores, profiles, activeProfileId, onlineEnabled, leaderboardType, setLeaderboardType } = useGameStore();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  const displayHighscores = filter === 'mine'
    ? highscores.filter(h => h.playerId === activeProfileId)
    : highscores;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <TrophyIcon className="w-8 h-8 text-yellow-400" />
          Highscore Leaderboard
        </h1>
        <p className="text-white/60">Top singers and their legendary performances!</p>
      </div>

      {/* Global/Local Toggle */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Local Tab */}
        <Button
          onClick={() => setLeaderboardType('local')}
          className={leaderboardType === 'local' ? 'bg-cyan-500' : 'bg-white/10'}
        >
          🏠 Local
        </Button>

        {/* Global Tab */}
        <Button
          onClick={() => setLeaderboardType('global')}
          className={leaderboardType === 'global' ? 'bg-purple-500' : 'bg-white/10'}
        >
          🌍 Global
        </Button>

        {leaderboardType === 'local' && (
          <>
            <div className="w-px bg-white/20 mx-2" />
            <Button
              onClick={() => setFilter('all')}
              size="sm"
              className={filter === 'all' ? 'bg-white/20' : 'bg-white/5'}
            >
              All Scores
            </Button>
            <Button
              onClick={() => setFilter('mine')}
              size="sm"
              className={filter === 'mine' ? 'bg-white/20' : 'bg-white/5'}
              disabled={!activeProfileId}
            >
              My Scores
            </Button>
          </>
        )}
      </div>

      {/* Global Leaderboard - Use the full OnlineLeaderboard component */}
      {leaderboardType === 'global' ? (
        <OnlineLeaderboard />
      ) : (
        <>
          {/* Ranking Legend - only for local */}
          <Card className="bg-white/5 border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Ranking Titles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 text-sm">
                {RANKING_TITLES.slice(0, 10).map((rank) => (
                  <div key={rank.minScore} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                    <span>{rank.emoji}</span>
                    <span className="truncate">{rank.title.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Highscore List */}
          {displayHighscores.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-12 text-center">
                <TrophyIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">
                  {filter === 'mine'
                    ? "You haven't set any scores yet!"
                    : "No highscores yet. Be the first to sing!"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {displayHighscores.slice(0, 50).map((entry, index) => (
                <Card
                  key={entry.id}
                  className={`bg-white/5 border-white/10 hover:bg-white/10 transition-colors ${
                    index < 3 ? 'border-l-4' : ''
                  } ${
                    index === 0 ? 'border-l-yellow-400' :
                    index === 1 ? 'border-l-gray-300' :
                    index === 2 ? 'border-l-orange-400' : ''
                  }`}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Rank */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                      'bg-white/10 text-white/60'
                    }`}>
                      {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>

                    {/* Player Info */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
                      style={{ backgroundColor: entry.playerColor }}
                    >
                      {entry.playerAvatar ? (
                        <img src={entry.playerAvatar} alt={entry.playerName} className="w-full h-full object-cover" />
                      ) : (
                        entry.playerName[0].toUpperCase()
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{entry.playerName}</span>
                        <Badge variant="outline" className={`text-xs ${
                          entry.difficulty === 'easy' ? 'border-green-500 text-green-400' :
                          entry.difficulty === 'medium' ? 'border-yellow-500 text-yellow-400' :
                          'border-red-500 text-red-400'
                        }`}>
                          {entry.difficulty}
                        </Badge>
                      </div>
                      {entry.songTitle && (
                        <p className="text-sm text-white/60 truncate">{entry.songTitle} - {entry.artist}</p>
                      )}
                      {entry.rankTitle && (
                        <p className="text-xs text-white/40">{entry.rankTitle}</p>
                      )}
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-cyan-400">{entry.score.toLocaleString()}</div>
                      <div className="text-sm text-white/60">{entry.accuracy.toFixed(1)}% accuracy</div>
                      <div className="text-xs text-white/40">{entry.maxCombo}x max combo</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
