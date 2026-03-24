'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { leaderboardService } from '@/lib/api/leaderboard-service';

// Country data
const COUNTRIES: Record<string, { name: string; flag: string }> = {
  DE: { name: 'Deutschland', flag: '🇩🇪' },
  AT: { name: 'Österreich', flag: '🇦🇹' },
  CH: { name: 'Schweiz', flag: '🇨🇭' },
  US: { name: 'USA', flag: '🇺🇸' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  FR: { name: 'France', flag: '🇫🇷' },
  ES: { name: 'España', flag: '🇪🇸' },
  IT: { name: 'Italia', flag: '🇮🇹' },
  JP: { name: '日本', flag: '🇯🇵' },
  KR: { name: '대한민국', flag: '🇰🇷' },
};

interface LeaderboardPlayer {
  id: string;
  name: string;
  avatar_url: string | null;
  country: string | null;
  color: string;
  total_score: number;
  games_played: number;
  avg_accuracy: number;
  best_score: number;
  rank: number;
}

export function OnlineLeaderboard() {
  const [activeTab, setActiveTab] = useState('global');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardPlayer | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const service = leaderboardService;
      const result = await service.getGlobalLeaderboard(100);
      // Convert ApiPlayer to LeaderboardPlayer
      const mappedResult = (result || []).map((player, index) => ({
        id: player.id,
        name: player.name,
        avatar_url: player.avatar || null,
        country: player.country || null,
        color: '#22D3EE', // Default color
        total_score: player.total_score,
        games_played: player.games_played,
        avg_accuracy: 0,
        best_score: player.total_score,
        rank: index + 1,
      }));
      setGlobalLeaderboard(mappedResult);
    } catch (err) {
      setError('Could not connect to online leaderboard. Showing local data.');
      setGlobalLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          🏆 Global Leaderboard
        </h1>
        <p className="text-white/60">Compete with singers worldwide!</p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-white/5 border-white/10 text-white"
        />
        <Button className="bg-cyan-500">Search</Button>
        <Button variant="outline" onClick={loadLeaderboard} className="border-white/20 text-white">
          🔄
        </Button>
      </div>

      {error && (
        <Card className="bg-yellow-500/10 border-yellow-500/30 mb-4">
          <CardContent className="py-3 text-yellow-400 text-sm">⚠️ {error}</CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-white/60 mt-4">Loading leaderboard...</p>
        </div>
      ) : globalLeaderboard.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-12 text-center text-white/60">
            <p className="text-4xl mb-4">🎤</p>
            <p>No players on the leaderboard yet!</p>
            <p className="text-sm mt-2">Be the first to submit a score.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {globalLeaderboard.map((player, i) => {
            const country = player.country ? COUNTRIES[player.country] : null;
            return (
              <Card
                key={player.id}
                className="bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
                onClick={() => setSelectedPlayer(player)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 text-center text-xl font-bold">
                      {getRankBadge(player.rank || i + 1)}
                    </div>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.avatar_url ? (
                        <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        player.name[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{player.name}</span>
                        {country && <span title={country.name}>{country.flag}</span>}
                      </div>
                      <div className="text-sm text-white/60">
                        {player.games_played} games • {player.avg_accuracy.toFixed(1)}% avg
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-cyan-400">
                        {player.total_score.toLocaleString()}
                      </div>
                      <div className="text-xs text-white/40">points</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <Card className="bg-gray-900 border-white/20 text-white max-w-md w-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: selectedPlayer.color }}
                >
                  {selectedPlayer.name[0]}
                </div>
                {selectedPlayer.name}
                {selectedPlayer.country && COUNTRIES[selectedPlayer.country] && (
                  <span>{COUNTRIES[selectedPlayer.country].flag}</span>
                )}
              </CardTitle>
              <Button variant="ghost" onClick={() => setSelectedPlayer(null)}>✕</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="text-lg font-bold text-cyan-400">{selectedPlayer.total_score.toLocaleString()}</div>
                  <div className="text-xs text-white/60">Total</div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="text-lg font-bold text-purple-400">{selectedPlayer.best_score.toLocaleString()}</div>
                  <div className="text-xs text-white/60">Best</div>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="text-lg font-bold text-green-400">{selectedPlayer.avg_accuracy.toFixed(1)}%</div>
                  <div className="text-xs text-white/60">Accuracy</div>
                </div>
              </div>
              <Button className="w-full bg-cyan-500" onClick={() => setSelectedPlayer(null)}>
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default OnlineLeaderboard;
