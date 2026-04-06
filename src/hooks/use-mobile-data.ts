'use client';

import { useState, useCallback, useMemo } from 'react';
import type { MobileSong, MobileProfile, QueueItem, GameResults, JukeboxWishlistItem, GameMode } from '@/components/screens/mobile/mobile-types';

interface UseMobileDataOptions {
  clientId: string | null;
  profile: MobileProfile | null;
  onNavigateToProfile: () => void;
}

export function useMobileData({ clientId, profile, onNavigateToProfile }: UseMobileDataOptions) {
  // Song library state
  const [songs, setSongs] = useState<MobileSong[]>([]);
  const [songSearch, setSongSearch] = useState('');
  const [songsLoading, setSongsLoading] = useState(true);

  // Queue state
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [slotsRemaining, setSlotsRemaining] = useState(3);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Partner and game mode selection
  const [selectedPartner, setSelectedPartner] = useState<{ id: string; name: string } | null>(null);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('single');
  const [availablePartners, setAvailablePartners] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [showSongOptions, setShowSongOptions] = useState<MobileSong | null>(null);

  // Game results
  const [gameResults, setGameResults] = useState<GameResults | null>(null);

  // Jukebox wishlist
  const [jukeboxWishlist, setJukeboxWishlist] = useState<JukeboxWishlistItem[]>([]);

  // ---- Song library ----
  const loadSongs = useCallback(async () => {
    setSongsLoading(true);
    console.log('[MobileClient] Loading songs from API...');
    try {
      const response = await fetch('/api/songs');
      if (response.ok) {
        const data = await response.json();
        console.log('[MobileClient] Songs loaded:', data.songs?.length || 0);
        setSongs(data.songs || []);
      } else {
        console.error('[MobileClient] Failed to load songs, status:', response.status);
        setSongs([]);
      }
    } catch (error) {
      console.error('[MobileClient] Error loading songs:', error);
      setSongs([]);
    }
    setSongsLoading(false);
  }, []);

  const filteredSongs = useMemo(() => {
    if (!songSearch) return songs;
    const query = songSearch.toLowerCase();
    return songs.filter(s =>
      s.title.toLowerCase().includes(query) ||
      s.artist.toLowerCase().includes(query)
    );
  }, [songs, songSearch]);

  // ---- Partners ----
  const loadAvailablePartners = useCallback(async () => {
    try {
      const response = await fetch('/api/mobile?action=status');
      const data = await response.json();
      if (data.success && data.clients) {
        const partners = data.clients
          .filter((c: { id: string; connectionCode: string; profile?: { name: string } }) =>
            c.id !== clientId && c.profile
          )
          .map((c: { id: string; connectionCode: string; profile?: { name: string } }) => ({
            id: c.connectionCode,
            name: c.profile?.name || 'Unknown',
            code: c.connectionCode,
          }));
        setAvailablePartners(partners);
      }
    } catch {
      // Ignore errors
    }
  }, [clientId]);

  // ---- Queue ----
  const addToQueue = useCallback(async (song: MobileSong) => {
    if (!profile || !clientId) {
      onNavigateToProfile();
      return;
    }
    if (slotsRemaining <= 0) {
      setQueueError('Maximum 3 songs in queue. Wait for a song to finish!');
      setTimeout(() => setQueueError(null), 3000);
      return;
    }
    setQueueError(null);

    const gameMode = selectedGameMode;
    const partnerId = selectedPartner?.id;
    const partnerName = selectedPartner?.name;

    try {
      const response = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'queue',
          clientId,
          payload: { songId: song.id, songTitle: song.title, songArtist: song.artist, partnerId, partnerName, gameMode },
        }),
      });
      const data = await response.json();
      if (data.success) {
        setQueue(prev => [...prev, {
          id: data.queueItem.id, songId: song.id, songTitle: song.title, songArtist: song.artist,
          addedBy: profile.name, status: 'pending', partnerId, partnerName, gameMode,
        }]);
        setSlotsRemaining(data.slotsRemaining ?? Math.max(0, slotsRemaining - 1));
        setShowSongOptions(null);
        setSelectedPartner(null);
        setSelectedGameMode('single');
      } else if (data.queueFull) {
        setQueueError('Maximum 3 songs in queue!');
        setSlotsRemaining(0);
        setTimeout(() => setQueueError(null), 3000);
      }
    } catch {
      setQueueError('Failed to add song');
      setTimeout(() => setQueueError(null), 3000);
    }
  }, [profile, clientId, slotsRemaining, selectedGameMode, selectedPartner, onNavigateToProfile]);

  const loadQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/mobile?action=getqueue');
      const data = await response.json();
      if (data.success) {
        const serverQueue = data.queue || [];
        setQueue(serverQueue);
        const pendingCount = serverQueue.filter((q: { status: string }) => q.status === 'pending').length;
        setSlotsRemaining(Math.max(0, 3 - pendingCount));
      }
    } catch {
      // Ignore errors
    }
  }, []);

  const loadGameResults = useCallback(async () => {
    try {
      const response = await fetch('/api/mobile?action=results');
      const data = await response.json();
      if (data.success && data.results) {
        setGameResults(data.results);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // ---- Jukebox ----
  const addToJukeboxWishlist = useCallback(async (song: MobileSong) => {
    if (!profile || !clientId) {
      onNavigateToProfile();
      return;
    }
    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'jukebox', clientId,
          payload: { songId: song.id, songTitle: song.title, songArtist: song.artist },
        }),
      });
      setJukeboxWishlist(prev => [...prev, { songId: song.id, songTitle: song.title, songArtist: song.artist, addedBy: profile.name }]);
    } catch {
      // Ignore errors
    }
  }, [profile, clientId, onNavigateToProfile]);

  const loadJukeboxWishlist = useCallback(async () => {
    try {
      const response = await fetch('/api/mobile?action=getjukebox');
      const data = await response.json();
      if (data.success) {
        setJukeboxWishlist(data.wishlist || []);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // ---- Helpers ----
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    // Song library
    songs,
    songSearch,
    setSongSearch,
    songsLoading,
    filteredSongs,
    loadSongs,
    // Queue
    queue,
    slotsRemaining,
    queueError,
    addToQueue,
    loadQueue,
    // Partners
    selectedPartner,
    selectedGameMode,
    availablePartners,
    showSongOptions,
    setSelectedPartner,
    setSelectedGameMode,
    setShowSongOptions,
    loadAvailablePartners,
    // Results
    gameResults,
    loadGameResults,
    // Jukebox
    jukeboxWishlist,
    addToJukeboxWishlist,
    loadJukeboxWishlist,
    // Helpers
    formatDuration,
  };
}
