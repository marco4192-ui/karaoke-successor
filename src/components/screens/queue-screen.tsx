'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/lib/game/store';
import { QueueIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import type { Song, GameMode } from '@/types/game';
import { getAllSongsAsync } from '@/lib/game/song-library';

interface CompanionQueueItem {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
  addedAt: number;
  companionCode: string;
  status: 'pending' | 'playing' | 'completed';
  partnerId?: string;
  partnerName?: string;
  gameMode?: 'single' | 'duel' | 'duet';
}

interface QueueScreenProps {
  onPlayFromQueue?: (song: Song, gameMode: 'single' | 'duel' | 'duet', players: { id: string; name: string }[]) => void;
}

export function QueueScreen({ onPlayFromQueue }: QueueScreenProps) {
  const { 
    queue, 
    removeFromQueue, 
    reorderQueue, 
    clearQueue, 
    markQueueItemPlaying,
    activeProfileId, 
    profiles,
    setSong,
    setGameMode,
    addPlayer,
  } = useGameStore();
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const [companionQueue, setCompanionQueue] = useState<CompanionQueueItem[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Load songs library
  useEffect(() => {
    const loadSongs = async () => {
      const loadedSongs = await getAllSongsAsync();
      setSongs(loadedSongs);
    };
    loadSongs();
  }, []);

  // Fetch companion queue from API
  const fetchCompanionQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/mobile?action=getqueue');
      const data = await response.json();
      if (data.success && data.queue) {
        setCompanionQueue(data.queue.filter((item: CompanionQueueItem) => item.status === 'pending'));
      }
    } catch {
      // Ignore errors
    }
  }, []);

  useEffect(() => {
    fetchCompanionQueue();
    const interval = setInterval(fetchCompanionQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchCompanionQueue]);

  // Mark a companion queue item as completed
  const markQueueItemCompleted = async (itemId: string) => {
    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'queuecompleted',
          payload: { itemId },
        }),
      });
      setCompanionQueue(prev => prev.filter(item => item.id !== itemId));
    } catch {
      // Ignore errors
    }
  };

  // Unified queue - combine local and companion queue
  const unifiedQueue = [
    // Local queue items
    ...queue.filter(q => q.status !== 'completed').map(item => ({
      ...item,
      isFromCompanion: false,
    })),
    // Companion queue items
    ...companionQueue.map(item => ({
      id: item.id,
      song: {
        id: item.songId,
        title: item.songTitle,
        artist: item.songArtist,
      } as Song,
      playerId: item.companionCode,
      playerName: item.addedBy,
      addedAt: item.addedAt,
      partnerId: item.partnerId,
      partnerName: item.partnerName,
      gameMode: item.gameMode || 'single',
      isFromCompanion: true,
      companionCode: item.companionCode,
      status: item.status,
    })),
  ].sort((a, b) => a.addedAt - b.addedAt); // Sort by added time

  // Get full song object by ID
  const getFullSong = (songId: string): Song | null => {
    return songs.find(s => s.id === songId) || null;
  };

  // Play next song from queue
  const playFromQueue = async (item: typeof unifiedQueue[0]) => {
    let song = item.isFromCompanion ? getFullSong(item.song.id) : item.song;
    if (!song) return;
    
    const gameMode = item.gameMode || 'single';
    const players: { id: string; name: string }[] = [];
    
    // Add main player
    if (item.playerId && !item.isFromCompanion) {
      const profile = profiles.find(p => p.id === item.playerId);
      if (profile) {
        players.push({ id: profile.id, name: profile.name });
      }
    } else if (activeProfileId) {
      const profile = profiles.find(p => p.id === activeProfileId);
      if (profile) {
        players.push({ id: profile.id, name: profile.name });
      }
    }
    
    // Add partner if present
    if (item.partnerId && item.partnerName) {
      players.push({ id: item.partnerId, name: item.partnerName });
    }
    
    // Mark as playing
    if (item.isFromCompanion) {
      try {
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'markplaying',
            payload: { itemId: item.id },
          }),
        });
      } catch {
        // Ignore
      }
    } else {
      markQueueItemPlaying(item.id);
    }
    
    // Call parent handler or handle internally
    if (onPlayFromQueue) {
      onPlayFromQueue(song, gameMode, players);
    } else {
      // Default behavior: set up game state
      setSong(song);
      if (gameMode === 'duel') {
        setGameMode('duel');
      } else if (gameMode === 'duet') {
        setGameMode('duet');
      } else {
        setGameMode('standard');
      }
      
      // Add players
      players.forEach(player => {
        const profile = profiles.find(p => p.id === player.id);
        if (profile) {
          addPlayer(profile);
        }
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      // Only allow reordering local items
      const localItems = unifiedQueue.filter(i => !i.isFromCompanion);
      const draggedItem = unifiedQueue[draggedIndex];
      if (!draggedItem.isFromCompanion) {
        const localIndex = localItems.findIndex(i => i.id === draggedItem.id);
        const targetLocalIndex = localItems.findIndex(i => i.id === unifiedQueue[index].id);
        if (localIndex !== -1 && targetLocalIndex !== -1) {
          reorderQueue(localIndex, targetLocalIndex);
          setDraggedIndex(index);
        }
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Get game mode badge
  const getGameModeBadge = (mode?: 'single' | 'duel' | 'duet') => {
    switch (mode) {
      case 'duel':
        return <Badge className="bg-red-500 text-xs">⚔️ Duel</Badge>;
      case 'duet':
        return <Badge className="bg-pink-500 text-xs">🎭 Duet</Badge>;
      default:
        return <Badge className="bg-cyan-500 text-xs">🎤 Single</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Song Queue</h1>
        <p className="text-white/60">
          {unifiedQueue.length} songs in queue • Max 3 per player
        </p>
      </div>

      {unifiedQueue.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-12 text-center">
            <QueueIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No songs in queue</p>
            <p className="text-sm text-white/40 mt-2">Add songs from the library or via Companion App</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 mb-6">
          {unifiedQueue.map((item, index) => (
            <Card 
              key={item.id} 
              className={`bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-colors ${
                draggedIndex === index ? 'opacity-50' : ''
              } ${item.isFromCompanion ? 'border-l-4 border-l-cyan-500' : ''}`}
              draggable={!item.isFromCompanion}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => playFromQueue(item)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                {/* Position */}
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                
                {/* Song Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{item.song.title}</h3>
                    {item.isFromCompanion && (
                      <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-400">
                        📱 Companion
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-white/60 truncate">{item.song.artist}</p>
                </div>
                
                {/* Game Mode */}
                <div className="flex items-center gap-2">
                  {getGameModeBadge(item.gameMode)}
                </div>
                
                {/* Players */}
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: profiles.find(p => p.id === item.playerId)?.color || '#888' }}
                  >
                    {item.playerName?.[0]?.toUpperCase() || '?'}
                  </div>
                  {item.partnerName && (
                    <>
                      <span className="text-white/40">+</span>
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: profiles.find(p => p.id === item.partnerId)?.color || '#888' }}
                      >
                        {item.partnerName[0].toUpperCase()}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      playFromQueue(item);
                    }}
                  >
                    ▶ Play
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.isFromCompanion) {
                        markQueueItemCompleted(item.id);
                      } else {
                        removeFromQueue(item.id);
                      }
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {unifiedQueue.length > 0 && (
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={clearQueue}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Clear All
          </Button>
          {unifiedQueue[0] && (
            <Button 
              onClick={() => playFromQueue(unifiedQueue[0])}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
            >
              ▶ Play Next Song
            </Button>
          )}
        </div>
      )}

      {/* Queue Rules */}
      <Card className="bg-white/5 border-white/10 mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Queue Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-white/60">
          <p>• Maximum 3 songs per player at a time</p>
          <p>• Songs play in the order they were added</p>
          <p>• You can remove your own songs from the queue</p>
          <p>• Select a character before adding to queue</p>
          <p>• Companion app requests appear with a cyan border</p>
          <p>• Click a song to play it immediately</p>
        </CardContent>
      </Card>
    </div>
  );
}
