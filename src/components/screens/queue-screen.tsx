'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/lib/game/store';
import { QueueIcon } from '@/components/icons';

export function QueueScreen() {
  const { queue, removeFromQueue, reorderQueue, clearQueue, activeProfileId, profiles } = useGameStore();
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Song Queue</h1>
        <p className="text-white/60">Up next: {queue.length} songs in queue (max 3 per player)</p>
      </div>

      {queue.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-12 text-center">
            <QueueIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No songs in queue. Add songs from the library!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {queue.map((item, index) => (
              <Card key={item.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.song.title}</h3>
                    <p className="text-sm text-white/60">{item.song.artist}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: profiles.find(p => p.id === item.playerId)?.color || '#888' }}
                    >
                      {item.playerName[0]}
                    </div>
                    <span className="text-sm text-white/60">{item.playerName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => removeFromQueue(item.id)}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Button variant="outline" onClick={clearQueue} className="border-white/20 text-white">
            Clear Queue
          </Button>
        </>
      )}

      {/* Queue Rules */}
      <Card className="bg-white/5 border-white/10 mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Queue Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-white/60">
          <p>• Maximum 3 songs per player at a time</p>
          <p>• Songs play in order they were added</p>
          <p>• You can remove your own songs from the queue</p>
          <p>• Select a character before adding to queue</p>
        </CardContent>
      </Card>
    </div>
  );
}
