'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QueueNextSongProps {
  nextQueueItem: {
    id: string;
    songId: string;
    songTitle: string;
    songArtist: string;
    addedBy: string;
    gameMode?: 'single' | 'duel' | 'duet';
    isFromCompanion: boolean;
  } | null;
  onPlay: () => void;
}

export function QueueNextSong({ nextQueueItem, onPlay }: QueueNextSongProps) {
  if (!nextQueueItem) return null;

  return (
    <Card className="mt-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-cyan-500/30">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl">📋</div>
            <div>
              <p className="text-sm text-white/60">Next in Queue</p>
              <p className="font-semibold text-lg">{nextQueueItem.songTitle}</p>
              <p className="text-sm text-white/60">{nextQueueItem.songArtist}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-400">
                  📱 {nextQueueItem.addedBy}
                </Badge>
                {nextQueueItem.gameMode === 'duel' && (
                  <Badge className="bg-red-500/80 text-xs">⚔️ Duel</Badge>
                )}
                {nextQueueItem.gameMode === 'duet' && (
                  <Badge className="bg-pink-500/80 text-xs">🎭 Duet</Badge>
                )}
              </div>
            </div>
          </div>
          <Button 
            onClick={onPlay}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400"
          >
            ▶ Play Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
