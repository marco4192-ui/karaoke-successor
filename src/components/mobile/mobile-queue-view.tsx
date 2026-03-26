'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface QueueItem {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
  status: string;
}

interface MobileQueueViewProps {
  queue: QueueItem[];
  slotsRemaining: number;
  queueError: string | null;
  onNavigate: (view: 'songs') => void;
}

/**
 * Queue management view for mobile companion app
 * Shows current queue with slot indicators
 */
export function MobileQueueView({
  queue,
  slotsRemaining,
  queueError,
  onNavigate,
}: MobileQueueViewProps) {
  const pendingQueue = queue.filter((q) => q.status !== 'completed');

  return (
    <div className="p-4">
      {/* Queue Header with Slots */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Song Queue</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/40">Slots:</span>
          <div className="flex gap-1">
            {[1, 2, 3].map((slot) => (
              <div
                key={slot}
                className={`w-4 h-4 rounded-full ${
                  slot <= slotsRemaining ? 'bg-cyan-500' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Queue Error */}
      {queueError && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
          {queueError}
        </div>
      )}

      {pendingQueue.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <span className="text-4xl mb-4 block">📋</span>
          <p>No songs in queue</p>
          <p className="text-sm mt-2">You can add up to 3 songs</p>
          <Button
            onClick={() => onNavigate('songs')}
            variant="outline"
            className="mt-4 border-white/20 text-white"
          >
            Browse Songs
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {pendingQueue.map((item, i) => (
            <div
              key={item.id || i}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                item.status === 'playing'
                  ? 'bg-cyan-500/20 border border-cyan-500/30'
                  : 'bg-white/5'
              }`}
            >
              <span className="text-white/40 font-bold w-6">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.songTitle}</p>
                <p className="text-sm text-white/40">
                  {item.songArtist} • Added by {item.addedBy}
                </p>
              </div>
              {item.status === 'playing' && (
                <Badge className="bg-cyan-500 text-xs">Playing</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MobileQueueView;
