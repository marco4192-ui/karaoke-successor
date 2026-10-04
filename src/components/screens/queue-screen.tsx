'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameStore } from '@/lib/game/store';
import { QueueIcon } from '@/components/icons';
import { useTranslation } from '@/lib/i18n/translations';
import type { Song } from '@/types/game';
import { getAllSongsAsync } from '@/lib/game/song-library';

import type { QueueScreenProps, UnifiedQueueItem, CompanionQueueItem } from './queue/queue-types';
import { QueueItemCard } from './queue/queue-item-card';
import { PlayerReassignDialog } from './queue/player-reassign-dialog';
import { QueueRulesCard } from './queue/queue-rules-card';

export function QueueScreen({ onPlayFromQueue, autoPlayNext }: QueueScreenProps) {
  const { t } = useTranslation();
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

  const [companionQueue, setCompanionQueue] = useState<CompanionQueueItem[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [needsPlayerSelection, setNeedsPlayerSelection] = useState<string[]>([]);

  // R39/P7: Clear ALL queues — local zustand AND the companion queue on the
  // server. Previously the Clear button (and the companion's clear_queue
  // remote command) only cleared the LOCAL queue — companion wishes stayed
  // and the button looked "broken".
  const clearAllQueues = useCallback(() => {
    clearQueue();
    fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'clearqueue', payload: {} }),
    }).then(() => {
      setCompanionQueue(prev => prev.filter(item => item.status === 'playing'));
    }).catch(() => { /* ignore */ });
  }, [clearQueue]);

  // Listen for remote companion queue clear (R39/P7: now clears BOTH sides)
  useEffect(() => {
    const handleRemoteClear = () => { clearAllQueues(); };
    window.addEventListener('remote-queue-clear', handleRemoteClear);
    return () => window.removeEventListener('remote-queue-clear', handleRemoteClear);
  }, [clearAllQueues]);

  // ── R39/P7: Remote-Queue-Steuerung durch den kontrollierenden Companion ──
  // Play next / Play item / Remove local item / Reorder all. Die Commands
  // kommen über use-global-remote-control (queue_*) — dieser Screen ist
  // nach dem Navigate gemountet und führt sie mit der bestehenden Logik aus.
  // Refs halten die neuesten playFromQueue/unifiedQueue-Instanzen (beide
  // werden erst UNTEN definiert — deshalb null-Initialisierung + Sync im
  // Render-Block NACH den Definitionen, kein Zugriff während der TDZ).
  const playFromQueueRef = useRef<((_item: UnifiedQueueItem) => Promise<void>) | null>(null);
  const unifiedQueueRef = useRef<UnifiedQueueItem[]>([]);
  type LocalQueueList = ReturnType<typeof useGameStore.getState>['queue'];
  const queueRef = useRef<LocalQueueList>([]);
  const removeFromQueueRef = useRef<typeof removeFromQueue>(removeFromQueue);
  const reorderQueueRef = useRef<typeof reorderQueue>(reorderQueue);
  const fetchCompanionQueueRef = useRef<() => void>(() => {});

  useEffect(() => {
    const handlePlayNext = () => {
      const first = unifiedQueueRef.current.find(item => item.status !== 'playing');
      if (first) void playFromQueueRef.current?.(first);
    };
    const handlePlayItem = (e: Event) => {
      const itemId = (e as CustomEvent).detail?.itemId as string | undefined;
      if (!itemId) return;
      const item = unifiedQueueRef.current.find(i => i.id === itemId);
      if (item) void playFromQueueRef.current?.(item);
    };
    const handleRemoveLocal = (e: Event) => {
      const itemId = (e as CustomEvent).detail?.itemId as string | undefined;
      if (itemId) removeFromQueueRef.current(itemId);
    };
    const handleReorderAll = (e: Event) => {
      const orderedIds = (e as CustomEvent).detail?.orderedIds as string[] | undefined;
      if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
      // Lokale (zustand) Pending-Items in ihre neue RELATIVE Reihenfolge
      // bringen — über reorderQueue-Schritte (fromIndex → toIndex).
      const localPending = queueRef.current.filter(q => q.status !== 'completed' && q.song);
      const localIdsInOrder = orderedIds.filter(id => localPending.some(l => l.id === id));
      const currentLocal = [...localPending];
      for (const targetId of localIdsInOrder) {
        const fromIndex = currentLocal.findIndex(l => l.id === targetId);
        const targetPos = localIdsInOrder.indexOf(targetId);
        if (fromIndex !== targetPos && fromIndex !== -1) {
          reorderQueueRef.current(fromIndex, targetPos);
          const [moved] = currentLocal.splice(fromIndex, 1);
          currentLocal.splice(targetPos, 0, moved);
        }
      }
      // Companion-Items in ihrer neuen Reihenfolge an den Server schicken
      // (Desktop-Auth erlaubt das Umordnen ALLER Pending-Items am Server).
      const companionIdsInOrder = orderedIds.filter(id => !localPending.some(l => l.id === id));
      if (companionIdsInOrder.length > 1) {
        fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'reorderqueue', payload: { orderedIds: companionIdsInOrder } }),
        }).then(() => fetchCompanionQueueRef.current()).catch(() => { /* ignore */ });
      }
    };
    window.addEventListener('remote-queue-play-next', handlePlayNext);
    window.addEventListener('remote-queue-play-item', handlePlayItem);
    window.addEventListener('remote-queue-remove-local', handleRemoveLocal);
    window.addEventListener('remote-queue-reorder-all', handleReorderAll);
    return () => {
      window.removeEventListener('remote-queue-play-next', handlePlayNext);
      window.removeEventListener('remote-queue-play-item', handlePlayItem);
      window.removeEventListener('remote-queue-remove-local', handleRemoveLocal);
      window.removeEventListener('remote-queue-reorder-all', handleReorderAll);
    };
  }, []);

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
    const toRemove: string[] = [];
    const needsSelectionItems: string[] = [];

    queue.forEach((item) => {
      if (item.status !== 'pending') return;
      const mainInactive = item.playerId && !activeIds.has(item.playerId);
      const partnerInactive = item.partnerId && !activeIds.has(item.partnerId);

      if (mainInactive && item.gameMode === 'single') {
        toRemove.push(item.id);
      } else if ((mainInactive || partnerInactive) && (item.gameMode === 'duel' || item.gameMode === 'duet')) {
        needsSelectionItems.push(item.id);
      }
    });

    // Batch-remove in a single operation to avoid infinite re-renders
    toRemove.forEach(id => removeFromQueue(id));
    if (needsSelectionItems.length > 0) {
      setNeedsPlayerSelection(needsSelectionItems);
    }
  }, [profiles, queue, removeFromQueue]);

  // Fetch companion queue from API
  // R39/P7: isDesktop entries (the desktop's own local queue mirrored to the
  // server for the companion queue view) are FILTERED OUT here — the local
  // zustand queue already renders them (no duplicates).
  const fetchCompanionQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/mobile?action=getqueue');
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && data.queue) {
        setCompanionQueue(data.queue.filter((item: CompanionQueueItem) => item.status === 'pending' && !item.isDesktop));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug('[QueueScreen] fetchCompanionQueue failed:', error);
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
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug('[QueueScreen] markQueueItemCompleted failed:', error);
    }
  };

  // Unified queue - combine local and companion queue
  const unifiedQueue: UnifiedQueueItem[] = [
    // Local queue items (filter out items with missing song reference)
    ...queue.filter(q => q.status !== 'completed' && q.song).map(item => ({
      ...item,
      isFromCompanion: false,
      status: item.status || 'pending',
    })),
    // Companion queue items
    ...companionQueue.map(item => ({
      id: item.id,
      song: {
        id: item.songId,
        title: item.songTitle,
        artist: item.songArtist,
      } as Song,
      playerId: item.playerId || item.companionCode,
      playerName: item.playerName || item.addedBy,
      addedAt: item.addedAt,
      partnerId: item.partnerId,
      partnerName: item.partnerName,
      gameMode: item.gameMode || 'single',
      playerMicSource: item.playerMicSource,
      partnerMicSource: item.partnerMicSource,
      playerMicName: item.playerMicName,
      partnerMicName: item.partnerMicName,
      difficulty: item.difficulty,
      isFromCompanion: true,
      companionCode: item.companionCode,
      status: item.status,
    })),
  ].sort((a, b) => a.addedAt - b.addedAt); // Sort by added time

  // Get full song object by ID (with title+artist fallback for ID mismatches)
  const getFullSong = (songId: string, songTitle?: string, songArtist?: string): Song | null => {
    const exactMatch = songs.find(s => s.id === songId);
    if (exactMatch) return exactMatch;

    if (songTitle && songArtist) {
      const fuzzyMatch = songs.find(s =>
        s.title.toLowerCase() === songTitle.toLowerCase() &&
        s.artist.toLowerCase() === songArtist.toLowerCase()
      );
      if (fuzzyMatch) return fuzzyMatch;
    }
    return null;
  };

  // Create a minimal fallback Song object from queue item data when full song isn't found
  const createFallbackSong = (item: UnifiedQueueItem): Song => {
    const duration = item.song.duration || 180000;
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
  const playFromQueue = async (item: UnifiedQueueItem) => {
    // Guard: item.song may be undefined if a local queue item's song reference was nulled out
    if (!item.song) {
      // eslint-disable-next-line no-console
      console.warn('[QueueScreen] playFromQueue called with item.song === undefined, item.id:', item.id);
      return;
    }
    let song = item.isFromCompanion ? getFullSong(item.song.id, item.song.title, item.song.artist) : item.song;
    if (!song || !song.title) {
      // eslint-disable-next-line no-console
      console.warn('[QueueScreen] Song not found in library, creating fallback:', item.song?.id, item.song?.title);
      song = item.song ? createFallbackSong(item) : null;
      if (!song) return;
    }

    // CRITICAL FIX: Always pre-resolve lyrics + URLs before setting the song
    try {
      const { getSongByIdWithLyrics } = await import('@/lib/game/song-library');
      const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
      const withLyrics = await getSongByIdWithLyrics(song.id) || song;
      song = await ensureSongUrls(withLyrics);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[QueueScreen] Failed to prepare song:', err);
    }

    const hasMedia = song.audioUrl || song.videoUrl || song.relativeVideoPath || song.relativeAudioPath;
    if (!hasMedia) {
      // eslint-disable-next-line no-console
      console.warn('[QueueScreen] No playable media found for song:', song.title, '- skipping to prevent watchdog timeout');
      if (item.isFromCompanion) {
        try {
          await fetch('/api/mobile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'queuecompleted',
              payload: { itemId: item.id },
            }),
          });
          setCompanionQueue(prev => prev.filter(q => q.id !== item.id));
        // eslint-disable-next-line no-console
        } catch (error) { console.debug('[QueueScreen] queuecompleted (no media) failed:', error); }
      }
      return;
    }

    const gameMode = item.gameMode || 'single';
    const activeIds = new Set(profiles.filter(p => p.isActive !== false).map(p => p.id));

    if ((gameMode === 'duel' || gameMode === 'duet') && !item.isFromCompanion) {
      const mainInactive = item.playerId && !activeIds.has(item.playerId);
      const partnerInactive = item.partnerId && !activeIds.has(item.partnerId);
      if (mainInactive || partnerInactive) {
        setNeedsPlayerSelection([item.id]);
        return;
      }
    }

    const players: { id: string; name: string }[] = [];

    if (item.playerId && !item.isFromCompanion) {
      const profile = profiles.find(p => p.id === item.playerId);
      if (profile) players.push({ id: profile.id, name: profile.name });
    } else if (item.playerId && item.isFromCompanion) {
      // Companion item with a playerId that maps to a Desktop profile
      const profile = profiles.find(p => p.id === item.playerId);
      if (profile) {
        players.push({ id: profile.id, name: profile.name });
      } else if (item.playerName) {
        players.push({ id: item.playerId, name: item.playerName });
      } else if (activeProfileId) {
        const fallbackProfile = profiles.find(p => p.id === activeProfileId);
        if (fallbackProfile) players.push({ id: fallbackProfile.id, name: fallbackProfile.name });
      }
    } else if (activeProfileId) {
      const profile = profiles.find(p => p.id === activeProfileId);
      if (profile) players.push({ id: profile.id, name: profile.name });
    }

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
      } catch (error) {
        // eslint-disable-next-line no-console
        console.debug('[QueueScreen] markPlaying failed:', error);
      }
    } else {
      markQueueItemPlaying(item.id);
    }

    if (onPlayFromQueue) {
      // R51/Bug11 — Gesangs-Geräte + Difficulty des Items mitgeben: die
      // Haupt-App übernimmt sie im onPlayFromQueue-Zweig (deviceAssignment
      // steuert, ob P1/P2 über die Companion-App singen).
      onPlayFromQueue(song, gameMode, players, {
        playerMicSource: item.playerMicSource,
        partnerMicSource: item.partnerMicSource,
        difficulty: item.difficulty,
      });
    } else {
      setSong(song);
      if (gameMode === 'duel') {
        setGameMode('duel');
      } else if (gameMode === 'duet') {
        setGameMode('duet');
      } else {
        setGameMode('standard');
      }
      players.forEach(player => {
        const profile = profiles.find(p => p.id === player.id);
        if (profile) addPlayer(profile);
      });
      // R39/P4+P5: Gesangs-Geräte des Queue-Items ins GameState übernehmen —
      // steuert, ob die Companion-Pitch-Quelle auf P1/P2 gelegt wird.
      useGameStore.setState(s => ({
        gameState: {
          ...s.gameState,
          deviceAssignment: {
            p1Companion: item.playerMicSource === 'companion',
            p2Companion: item.partnerMicSource === 'companion',
          },
        },
      }));
    }
  };

  // Auto-play first queue item when triggered by Ctrl-Q
  const hasAutoPlayedRef = React.useRef(false);
  useEffect(() => {
    if (autoPlayNext && songs.length > 0 && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true;
      const timer = setTimeout(() => {
        if (unifiedQueue.length > 0) {
          playFromQueue(unifiedQueue[0]);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoPlayNext, songs.length, unifiedQueue.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
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

  // R39/P7: Ref-Sync — die Remote-Listener oben (mount-stabil) lesen immer
  // die frischeste playFromQueue/unifiedQueue/queue-Instanz.
  playFromQueueRef.current = playFromQueue;
  unifiedQueueRef.current = unifiedQueue;
  queueRef.current = queue;
  removeFromQueueRef.current = removeFromQueue;
  reorderQueueRef.current = reorderQueue;
  fetchCompanionQueueRef.current = fetchCompanionQueue;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8" data-testid="queue-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="queue-title">{t('queue.title')}</h1>
        <p className="text-white/60">
          {unifiedQueue.length} {t('queueScreen.songsInQueue')}
        </p>
      </div>

      {unifiedQueue.length === 0 ? (
        <Card className="bg-white/5 border-white/10" data-testid="queue-empty">
          <CardContent className="py-12 text-center">
            <QueueIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">{t('queueScreen.noSongs')}</p>
            <p className="text-sm text-white/40 mt-2">{t('queueScreen.noSongsDesc')}</p>
          </CardContent>
        </Card>
      ) : (
        <div role="list" aria-label="Warteschlange" data-testid="queue-list" className="space-y-2 mb-6">
          {unifiedQueue.map((item, index) => (
            <QueueItemCard
              key={item.id}
              item={item}
              index={index}
              profiles={profiles}
              draggedIndex={draggedIndex}
              t={t}
              onPlay={playFromQueue}
              onRemoveLocal={removeFromQueue}
              onRemoveCompanion={markQueueItemCompleted}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {unifiedQueue.length > 0 && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={clearAllQueues}
            data-testid="queue-clear"
            className="border-white/20 text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            {t('queueScreen.clearAll')}
          </Button>
          {unifiedQueue[0] && (
            <Button
              onClick={() => playFromQueue(unifiedQueue[0])}
              data-testid="queue-play-next"
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
            >
              {t('queueScreen.playNextSong')}
            </Button>
          )}
        </div>
      )}

      {/* Player Re-selection Dialog */}
      {needsPlayerSelection.length > 0 && (
        <PlayerReassignDialog
          needsPlayerSelection={needsPlayerSelection}
          queue={queue}
          profiles={profiles}
          t={t}
          onDismiss={(id) => setNeedsPlayerSelection(prev => prev.filter(i => i !== id))}
          onRemoveQueueItem={removeFromQueue}
        />
      )}

      <QueueRulesCard t={t} />
    </div>
  );
}
