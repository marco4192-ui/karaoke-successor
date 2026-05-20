'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { safeAlert } from '@/lib/safe-dialog';
import type { Song } from '@/types/game';
import type { PtmSegment } from '@/components/game/ptm-types';

export interface QueueItemInfo {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
  gameMode?: 'single' | 'duel' | 'duet';
  isFromCompanion: boolean;
}

/**
 * Fetches the next song from the companion queue and provides a handler to play it.
 */
export function useQueueNextSong(onPlayAgain: () => void) {
  const { activeProfileId, profiles, setSong, setGameMode, addPlayer } = useGameStore();
  const party = usePartyStore();

  const [nextQueueItem, setNextQueueItem] = useState<QueueItemInfo | null>(null);

  // Fetch next song from queue (both local and companion)
  useEffect(() => {
    const fetchNextInQueue = async () => {
      try {
        const response = await fetch('/api/mobile?action=getqueue');
        if (!response.ok) return;
        const data = await response.json();
        if (data.success && data.queue && data.queue.length > 0) {
          const nextItem = data.queue.find((q: { status: string }) => q.status === 'pending');
          if (nextItem) {
            setNextQueueItem({
              id: nextItem.id,
              songId: nextItem.songId,
              songTitle: nextItem.songTitle,
              songArtist: nextItem.songArtist,
              addedBy: nextItem.addedBy,
              gameMode: nextItem.gameMode || 'single',
              isFromCompanion: true,
            });
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.debug('[ResultsScreen] fetchNextInQueue failed:', error);
      }
    };

    fetchNextInQueue();
  }, []);

  // Play next song from queue
  const handlePlayFromQueue = useCallback(async () => {
    if (!nextQueueItem) return;

    // Get full song from library
    const { getAllSongsAsync, getSongByIdWithLyrics } = await import('@/lib/game/song-library');
    const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
    const songs = await getAllSongsAsync();
    let fullSong: Song | undefined = songs.find(s => s.id === nextQueueItem.songId);

    // Fallback: match by title + artist (handles companion song ID mismatches)
    if (!fullSong) {
      fullSong = songs.find(s =>
        s.title.toLowerCase() === nextQueueItem.songTitle.toLowerCase() &&
        s.artist.toLowerCase() === nextQueueItem.songArtist.toLowerCase()
      );
    }

    if (!fullSong) {
      safeAlert(`Song "${nextQueueItem.songTitle}" not found in local library`);
      // Mark as completed so it doesn't block the queue
      try {
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'queuecompleted', payload: { itemId: nextQueueItem.id } }),
        });
      // eslint-disable-next-line no-console
      } catch (error) { console.debug('[ResultsScreen] queuecompleted (song not found) failed:', error); }
      setNextQueueItem(null);
      return;
    }

    // CRITICAL FIX: Pre-resolve lyrics + URLs before setting the song.
    // Without this, the song may lack audioUrl/lyrics → watchdog fires.
    try {
      const withLyrics = await getSongByIdWithLyrics(fullSong.id) || fullSong;
      fullSong = await ensureSongUrls(withLyrics);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ResultsScreen] Failed to prepare song:', err);
    }

    // After URL resolution, check if the song has playable media.
    const hasMedia = fullSong.audioUrl || fullSong.videoUrl || fullSong.relativeVideoPath || fullSong.relativeAudioPath;
    if (!hasMedia) {
      // eslint-disable-next-line no-console
      console.warn('[ResultsScreen] No playable media for song:', fullSong.title, '- skipping');
      safeAlert(`No media found for "${fullSong.title}" — skipping`);
      try {
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'queuecompleted', payload: { itemId: nextQueueItem.id } }),
        });
      // eslint-disable-next-line no-console
      } catch (error) { console.debug('[ResultsScreen] queuecompleted (no media) failed:', error); }
      setNextQueueItem(null);
      return;
    }

    // Mark as playing
    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'markplaying',
          payload: { itemId: nextQueueItem.id },
        }),
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug('[ResultsScreen] markPlaying failed:', error);
    }

    // Check if a party game mode is currently active
    const currentMode = useGameStore.getState().gameState.gameMode;

    if (currentMode === 'pass-the-mic' && party.passTheMicPlayers?.length > 0) {
      // Generate segments for pass-the-mic and launch game
      const segmentDuration = party.passTheMicSettings?.segmentDuration || 30;
      const segmentCount = Math.ceil(fullSong.duration / (segmentDuration * 1000));
      const segments: PtmSegment[] = [];
      for (let i = 0; i < segmentCount; i++) {
        segments.push({
          startTime: i * segmentDuration * 1000,
          endTime: Math.min((i + 1) * segmentDuration * 1000, fullSong.duration),
          playerId: null,
        });
      }
      party.setPassTheMicSegments(segments);
      party.setPassTheMicSong(fullSong);
      setSong(fullSong);
      onPlayAgain();
      return;
    }

    if (currentMode === 'companion-singalong' && party.companionPlayers?.length > 0) {
      party.setCompanionSong(fullSong);
      setSong(fullSong);
      onPlayAgain();
      return;
    }

    // Standard: set up game and navigate
    setSong(fullSong);
    if (nextQueueItem.gameMode === 'duel') {
      setGameMode('duel');
    } else if (nextQueueItem.gameMode === 'duet') {
      setGameMode('duet');
    } else {
      setGameMode('standard');
    }

    // Add active player
    if (activeProfileId) {
      const profile = profiles.find(p => p.id === activeProfileId);
      if (profile) {
        addPlayer(profile);
      }
    }

    onPlayAgain();
  }, [nextQueueItem, activeProfileId, profiles, party, setSong, setGameMode, addPlayer, onPlayAgain]);

  return { nextQueueItem, handlePlayFromQueue };
}
