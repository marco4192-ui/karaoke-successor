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

  // Simple fuzzy match: checks if all query chars appear in order in the target.
  // Returns a score (0 = no match, higher = better match).
  // Scores word-boundary matches and consecutive matches higher.
  function fuzzyScore(query: string, text: string): number {
    if (!query) return 0;
    const q = query.toLowerCase();
    const t = text.toLowerCase();

    // Exact substring match gets highest priority
    const idx = t.indexOf(q);
    if (idx !== -1) {
      // Bonus for match at start of string or after a space
      const startsWord = idx === 0 || t[idx - 1] === ' ';
      return startsWord ? 1000 + (100 - idx) : 500 + (100 - idx);
    }

    // Fuzzy character-by-character matching
    let qi = 0; // query index
    let score = 0;
    let lastMatchIdx = -2;
    let consecutiveBonus = 0;

    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) {
        score += 1;
        // Consecutive matches get bonus
        if (ti === lastMatchIdx + 1) {
          consecutiveBonus += 2;
          score += consecutiveBonus;
        } else {
          consecutiveBonus = 0;
        }
        // Match at word boundary gets bonus
        if (ti === 0 || t[ti - 1] === ' ') {
          score += 5;
        }
        lastMatchIdx = ti;
        qi++;
      }
    }

    // All query chars must be found
    return qi === q.length ? score : 0;
  }

  const filteredSongs = useMemo(() => {
    if (!songSearch) return songs;
    const query = songSearch.trim();
    if (!query) return songs;

    return songs
      .map(song => {
        const titleScore = fuzzyScore(query, song.title);
        const artistScore = fuzzyScore(query, song.artist);
        const combinedScore = Math.max(titleScore, artistScore);
        return { song, score: combinedScore };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.song);
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
