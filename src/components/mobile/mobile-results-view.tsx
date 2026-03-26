'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface GameResults {
  songId: string;
  songTitle: string;
  songArtist: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  rating: string;
  playedAt: number;
}

interface MobileResultsViewProps {
  gameResults: GameResults | null;
  onNavigate: (view: 'home' | 'queue') => void;
}

/**
 * Game results view for mobile companion app
 * Shows score card with social sharing options
 */
export function MobileResultsView({ gameResults, onNavigate }: MobileResultsViewProps) {
  if (!gameResults) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="text-center py-12 text-white/40">
          <span className="text-4xl mb-4 block">📊</span>
          <p>No recent results</p>
          <p className="text-sm mt-2">Sing a song to see your results here!</p>
          <Button
            onClick={() => onNavigate('home')}
            variant="outline"
            className="mt-4 border-white/20"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const handleShare = () => {
    const text = `🎤 I scored ${gameResults.score.toLocaleString()} points on "${gameResults.songTitle}" by ${gameResults.songArtist}! 🎵\n\n#KaraokeSuccessor`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Score copied to clipboard!');
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="space-y-4">
        {/* Score Card */}
        <Card className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-cyan-500/30">
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-sm text-white/60 mb-1">You just played</p>
              <h2 className="text-xl font-bold mb-1">{gameResults.songTitle}</h2>
              <p className="text-white/60">{gameResults.songArtist}</p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-cyan-400">
                  {gameResults.score.toLocaleString()}
                </p>
                <p className="text-xs text-white/40">Score</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-400">
                  {gameResults.accuracy.toFixed(1)}%
                </p>
                <p className="text-xs text-white/40">Accuracy</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400">{gameResults.maxCombo}x</p>
                <p className="text-xs text-white/40">Best Combo</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{gameResults.rating}</p>
                <p className="text-xs text-white/40">Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => {
              alert('Score card saved to your photos! (Feature coming soon)');
            }}
            className="bg-gradient-to-r from-cyan-500 to-purple-500"
          >
            📸 Save Score Card
          </Button>
          <Button onClick={handleShare} variant="outline" className="border-white/20">
            📤 Share Score
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => onNavigate('home')}
            variant="outline"
            className="flex-1 border-white/20"
          >
            🏠 Home
          </Button>
          <Button
            onClick={() => onNavigate('queue')}
            variant="outline"
            className="flex-1 border-white/20"
          >
            📋 Queue
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MobileResultsView;
