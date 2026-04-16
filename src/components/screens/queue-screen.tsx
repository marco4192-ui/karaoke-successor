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
  const [needsPlayerSelection, setNeedsPlayerSelection] = useState<string | null>(null); // queue item ID
  const [reassignPlayer1, setReassignPlayer1] = useState<string>('');
  const [reassignPlayer2, setReassignPlayer2] = useState<string>('');

  // Reset reassignment state when dialog closes
  useEffect(() => {
    if (!needsPlayerSelection) {
      setReassignPlayer1('');
      setReassignPlayer2('');
    }
  }, [needsPlayerSelection]);

  // Load songs library
  useEffect(() => {
    const loadSongs = async () => {
      const loadedSongs = await getAllSongsAsync();
      setSongs(loadedSongs);
    };
    loadSongs();
  }, []);

  // Auto-handle deactivated players in queue:
  // - Single songs: remove entirely
  // - Duel/Duet songs: flag for re-selection (don't auto-remove)
  useEffect(() => {
    const activeIds = new Set(profiles.filter(p => p.isActive !== false).map(p => p.id));
    let changed = false;

    queue.forEach((item) => {
      if (item.status !== 'pending') return;
      const mainInactive = item.playerId && !activeIds.has(item.playerId);
      const partnerInactive = item.partnerId && !activeIds.has(item.partnerId);

      if (mainInactive && item.gameMode === 'single') {
        // Remove single songs of deactivated players
        removeFromQueue(item.id);
        changed = true;
      } else if ((mainInactive || partnerInactive) && (item.gameMode === 'duel' || item.gameMode === 'duet')) {
        // Flag duel/duet songs for re-selection (don't remove)
        if (!needsPlayerSelection) {
          setNeedsPlayerSelection(item.id);
        }
      }
    });
  }, [profiles, queue, removeFromQueue, needsPlayerSelection]);

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

  // Get full song object by ID (with title+artist fallback for ID mismatches)
  const getFullSong = (songId: string, songTitle?: string, songArtist?: string): Song | null => {
    // Try exact ID match first
    const exactMatch = songs.find(s => s.id === songId);
    if (exactMatch) return exactMatch;

    // Fallback: match by title + artist (handles companion song ID mismatches)
    if (songTitle && songArtist) {
      const fuzzyMatch = songs.find(s =>
        s.title.toLowerCase() === songTitle.toLowerCase() &&
        s.artist.toLowerCase() === songArtist.toLowerCase()
      );
      if (fuzzyMatch) {
        console.log('[QueueScreen] Song found via title+artist fallback:', songTitle);
        return fuzzyMatch;
      }
    }
    return null;
  };

  // Create a minimal fallback Song object from queue item data when full song isn't found
  const createFallbackSong = (item: typeof unifiedQueue[0]): Song => {
    // Try to find the duration from companion queue item data
    const duration = item.song.duration || 180000; // Default 3 minutes if unknown
    return {
      id: item.song.id,
      title: item.song.title,
      artist: item.song.artist,
      duration,
      bpm: 0,
      difficulty: 'medium',
      rating: 3,
      lyrics: [],
      gap: 0,
    } as Song;
  };

  // Play next song from queue
  const playFromQueue = async (item: typeof unifiedQueue[0]) => {
    let song = item.isFromCompanion ? getFullSong(item.song.id, item.song.title, item.song.artist) : item.song;
    // If song not found in local library (companion song with ID mismatch),
    // create a fallback Song so karaoke can at least start with available data
    if (!song) {
      console.warn('[QueueScreen] Song not found in library, creating fallback:', item.song.id, item.song.title);
      song = createFallbackSong(item);
    }
    
    const gameMode = item.gameMode || 'single';
    const activeIds = new Set(profiles.filter(p => p.isActive !== false).map(p => p.id));

    // Check if any required player is deactivated (for duel/duet)
    if ((gameMode === 'duel' || gameMode === 'duet') && !item.isFromCompanion) {
      const mainInactive = item.playerId && !activeIds.has(item.playerId);
      const partnerInactive = item.partnerId && !activeIds.has(item.partnerId);
      if (mainInactive || partnerInactive) {
        setNeedsPlayerSelection(item.id);
        return; // Don't start — user must reassign players
      }
    }
    
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
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
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
                  {(() => {
                    const mainProfile = profiles.find(p => p.id === item.playerId);
                    const isMainInactive = mainProfile && mainProfile.isActive === false;
                    return (
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: mainProfile?.color || '#888', opacity: isMainInactive ? 0.4 : 1 }}
                          title={isMainInactive ? 'Player deactivated' : ''}
                        >
                          {item.playerName?.[0]?.toUpperCase() || '?'}
                        </div>
                        {isMainInactive && (
                          <span className="text-[10px] text-red-400">⚠</span>
                        )}
                      </div>
                    );
                  })()}
                  {item.partnerName && (
                    <>
                      <span className="text-white/40">+</span>
                      {(() => {
                        const partnerProfile = profiles.find(p => p.id === item.partnerId);
                        const isPartnerInactive = partnerProfile && partnerProfile.isActive === false;
                        return (
                          <div className="flex items-center gap-1">
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: partnerProfile?.color || '#888', opacity: isPartnerInactive ? 0.4 : 1 }}
                              title={isPartnerInactive ? 'Player deactivated' : ''}
                            >
                              {item.partnerName[0].toUpperCase()}
                            </div>
                            {isPartnerInactive && (
                              <span className="text-[10px] text-red-400">⚠</span>
                            )}
                          </div>
                        );
                      })()}
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

      {/* Player Re-selection Dialog for duel/duet with deactivated player */}
      {needsPlayerSelection && (() => {
        const item = queue.find(q => q.id === needsPlayerSelection);
        if (!item) return null;
        const activeProfiles = profiles.filter(p => p.isActive !== false);
        const [sel1, setSel1] = [reassignPlayer1, setReassignPlayer1];
        const [sel2, setSel2] = [reassignPlayer2, setReassignPlayer2];
        return (
          <Card className="bg-yellow-500/10 border-yellow-500/30 mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-yellow-400">
                ⚠ Spieler-Neuauswahl benötigt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/80">
                Ein Spieler für <strong>{item.song.title}</strong> ({item.gameMode === 'duel' ? 'Duell' : 'Duett'}) wurde deaktiviert. Bitte wähle neue Spieler oder lösche den Song.
              </p>
              {activeProfiles.length >= 2 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {activeProfiles.map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => {
                          if (!sel1) setSel1(profile.id);
                          else if (!sel2 && profile.id !== sel1) setSel2(profile.id);
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                          sel1 === profile.id
                            ? 'bg-pink-500 text-white'
                            : sel2 === profile.id
                              ? 'bg-purple-500 text-white'
                              : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: profile.color }}>
                          {profile.name[0]}
                        </div>
                        <span className="text-sm">{profile.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      disabled={sel1 && sel2 ? false : true}
                      onClick={() => {
                        // Update queue item with new players
                        const p1 = profiles.find(p => p.id === sel1);
                        const p2 = profiles.find(p => p.id === sel2);
                        if (p1 && p2) {
                          // Remove old and re-add with new players
                          removeFromQueue(item.id);
                          // Use the store's addToQueue — access via useGameStore
                          useGameStore.getState().addToQueue(item.song, p1.id, p1.name, {
                            partnerId: p2.id,
                            partnerName: p2.name,
                            gameMode: item.gameMode as 'single' | 'duel' | 'duet',
                          });
                        }
                        setNeedsPlayerSelection(null);
                      }}
                      className="bg-green-500 hover:bg-green-400 disabled:opacity-50"
                    >
                      ✓ Spieler zuweisen
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        removeFromQueue(item.id);
                        setNeedsPlayerSelection(null);
                      }}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      ✕ Song löschen
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setNeedsPlayerSelection(null)}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Später
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-400">Nicht genügend aktive Spieler verfügbar (mindestens 2 benötigt).</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      removeFromQueue(item.id);
                      setNeedsPlayerSelection(null);
                    }}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    ✕ Song aus Queue löschen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}
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
