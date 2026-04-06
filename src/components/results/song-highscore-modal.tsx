'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useGameStore } from '@/lib/game/store';
import { Song, GameMode, HighscoreEntry } from '@/types/game';
import { TrophyIcon } from './constants';

// Song Highscore Modal Component
export function SongHighscoreModal({ 
  song, 
  isOpen, 
  onClose 
}: { 
  song: Song; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const { highscores, onlineEnabled, leaderboardType, setLeaderboardType } = useGameStore();
  const [globalScores, setGlobalScores] = useState<HighscoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get local highscores for this song
  const localScores = useMemo(() => 
    highscores
      .filter(h => h.songId === song.id)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10),
    [highscores, song.id]
  );

  // Load global scores when tab is active
  useEffect(() => {
    if (isOpen && onlineEnabled && leaderboardType === 'global') {
      setIsLoading(true);
      setError(null);
      
      import('@/lib/api/leaderboard-service').then(({ leaderboardService }) => {
        leaderboardService.getSongLeaderboard(song.id, 10)
          .then(scores => {
            const entries = scores.map((s): HighscoreEntry => ({
              id: String(s.id),
              playerId: s.player_id,
              playerName: s.player_name || 'Unknown',
              playerAvatar: s.player_avatar,
              playerColor: '#FF6B6B',
              songId: song.id,
              songTitle: song.title,
              artist: song.artist,
              score: s.score,
              accuracy: s.max_score > 0 ? (s.score / s.max_score) * 100 : 0,
              maxCombo: s.max_combo,
              difficulty: s.difficulty === 1 ? 'easy' : s.difficulty === 2 ? 'medium' : 'hard',
              gameMode: s.game_mode as GameMode,
              rating: 'good',
              rankTitle: '',
              playedAt: new Date(s.created_at).getTime(),
            }));
            setGlobalScores(entries);
          })
          .catch(err => setError(err.message || 'Failed to load'))
          .finally(() => setIsLoading(false));
      });
    }
  }, [isOpen, onlineEnabled, leaderboardType, song.id, song.title, song.artist]);

  const displayScores = leaderboardType === 'global' ? globalScores : localScores;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-yellow-400" />
            {song.title}
          </DialogTitle>
          <DialogDescription className="text-white/60 text-sm">{song.artist} - Highscores</DialogDescription>
        </DialogHeader>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button 
            onClick={() => setLeaderboardType('local')}
            size="sm"
            className={leaderboardType === 'local' ? 'bg-cyan-500' : 'bg-white/10'}
          >
            🏠 Local ({localScores.length})
          </Button>
          {onlineEnabled && (
            <Button 
              onClick={() => setLeaderboardType('global')}
              size="sm"
              className={leaderboardType === 'global' ? 'bg-purple-500' : 'bg-white/10'}
            >
              🌍 Global
            </Button>
          )}
        </div>

        {/* Score List */}
        <ScrollArea className="flex-1 -mx-6">
          <div className="px-6 space-y-2">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mr-2" />
                <span className="text-white/60">Loading...</span>
              </div>
            )}
            
            {error && (
              <div className="text-center py-8 text-red-400">{error}</div>
            )}
            
            {!isLoading && !error && displayScores.length === 0 && (
              <div className="text-center py-8 text-white/60">
                {leaderboardType === 'global' 
                  ? 'No global scores yet. Be the first!'
                  : 'No local scores yet. Play this song!'}
              </div>
            )}
            
            {!isLoading && !error && displayScores.map((entry, index) => (
              <div 
                key={entry.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  index < 3 ? 'bg-white/10' : 'bg-white/5'
                }`}
              >
                {/* Rank */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-yellow-500 text-black' :
                  index === 1 ? 'bg-gray-300 text-black' :
                  index === 2 ? 'bg-orange-500 text-black' :
                  'bg-white/10 text-white/60'
                }`}>
                  {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>

                {/* Player */}
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden"
                  style={{ backgroundColor: entry.playerColor }}
                >
                  {entry.playerAvatar ? (
                    <img src={entry.playerAvatar} alt={entry.playerName} className="w-full h-full object-cover" />
                  ) : (
                    entry.playerName[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{entry.playerName}</div>
                  {leaderboardType === 'local' && (
                    <div className="text-xs text-white/40">{entry.accuracy.toFixed(1)}% • {entry.maxCombo}x combo</div>
                  )}
                </div>
                
                {/* Score */}
                <div className="text-right">
                  <div className="font-bold text-cyan-400">{entry.score.toLocaleString()}</div>
                  <div className="text-xs text-white/40">
                    {leaderboardType === 'local' ? entry.difficulty : 'pts'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="pt-4">
          <Button onClick={onClose} className="w-full bg-white/10 hover:bg-white/20">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
