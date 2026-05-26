'use client';

import { useState, useRef, useEffect } from 'react';
import { Song } from '@/types/game';
import { getSongMediaUrls, revokeSongMediaUrls } from '@/lib/db/media-db';
import { getSongMediaUrl, isTauri } from '@/lib/tauri-file-storage';
import { isYouTubeUrl, extractYouTubeId } from '@/components/game/youtube-player';

interface UseBattleRoyaleSongMediaParams {
  currentRoundSongId: string | undefined;
  songs: Song[];
  gameCurrentRound: number;
  /** For medley mode: track snippet index changes separately from round changes */
  medleySnippetIndex?: number;
}

interface UseBattleRoyaleSongMediaReturn {
  currentSong: Song | null;
  mediaLoaded: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  resolvedAudioUrlRef: React.RefObject<string | null>;
  resolvedVideoUrlRef: React.RefObject<string | null>;
  audioHasPlayedRef: React.RefObject<boolean>;
  isYouTube: boolean;
  youtubeVideoId: string | null;
  hasLocalAudio: boolean;
}

/**
 * Manages song data loading (URLs, lyrics) and media element setup (audio/video).
 * Handles both browser (IndexedDB) and Tauri (filesystem) media resolution.
 * Supports medley mode where songs change mid-round via snippet index tracking.
 */
export function useBattleRoyaleSongMedia({
  currentRoundSongId,
  songs,
  gameCurrentRound,
  medleySnippetIndex,
}: UseBattleRoyaleSongMediaParams): UseBattleRoyaleSongMediaReturn {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const resolvedAudioUrlRef = useRef<string | null>(null);
  const resolvedVideoUrlRef = useRef<string | null>(null);
  const audioHasPlayedRef = useRef(false);

  const lastHandledRef = useRef<string>('');
  const lastMediaUrlsRef = useRef<{ audioUrl?: string; videoUrl?: string; coverUrl?: string; txtUrl?: string }>({});

  // Load full song data with lyrics + URLs when song changes
  useEffect(() => {
    if (!currentRoundSongId) return;
    const song = songs.find(s => s.id === currentRoundSongId);
    if (!song) return;

    let cancelled = false;

    import('@/lib/game/song-url-restore').then(async ({ ensureSongUrls }) => {
      let preparedSong = song;
      try {
        preparedSong = await ensureSongUrls(song);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[BattleRoyale] Failed to ensure song URLs:', e);
      }
      if ((!preparedSong.lyrics || preparedSong.lyrics.length === 0) &&
          (preparedSong.storedTxt || preparedSong.relativeTxtPath)) {
        try {
          const { loadSongLyrics } = await import('@/lib/game/song-lyrics-loader');
          const lyrics = await loadSongLyrics(preparedSong);
          if (lyrics.length > 0) {
            preparedSong = { ...preparedSong, lyrics };
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[BattleRoyale] Failed to load lyrics:', e);
        }
      }
      if (!cancelled) {
        setCurrentSong(preparedSong);
      }
    });

    return () => { cancelled = true; };
  }, [currentRoundSongId, songs]);

  // Load media when song changes
  // Key includes medleySnippetIndex so medley snippet transitions trigger reload
  useEffect(() => {
    const songId = currentSong?.id ?? '';
    const snippetKey = medleySnippetIndex !== undefined ? `:${medleySnippetIndex}` : '';
    const key = `${gameCurrentRound}:${songId}${snippetKey}`;

    if (key === lastHandledRef.current) return;
    lastHandledRef.current = key;

    audioHasPlayedRef.current = false;
    setMediaLoaded(false);
    resolvedAudioUrlRef.current = null;
    resolvedVideoUrlRef.current = null;

    // Fully stop and clear old media to prevent audio bleeding into new song
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }

    if (!currentSong) return;

    let cancelled = false;

    const loadMedia = async () => {
      let audioUrl: string | undefined = currentSong.audioUrl;
      let videoUrl: string | undefined = currentSong.videoBackground;

      if (currentSong.storedMedia) {
        try {
          revokeSongMediaUrls(lastMediaUrlsRef.current);
          const mediaUrls = await getSongMediaUrls(currentSong.id);
          lastMediaUrlsRef.current = mediaUrls;
          if (mediaUrls.audioUrl) audioUrl = mediaUrls.audioUrl;
          if (mediaUrls.videoUrl) videoUrl = mediaUrls.videoUrl;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to load media from IndexedDB:', e);
        }
      }

      if (!audioUrl && currentSong.relativeAudioPath && isTauri()) {
        try {
          const url = await getSongMediaUrl(currentSong.relativeAudioPath, currentSong.baseFolder);
          if (url) audioUrl = url;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to resolve audio from filesystem:', e);
        }
      }
      if (!videoUrl && currentSong.relativeVideoPath && isTauri()) {
        try {
          const url = await getSongMediaUrl(currentSong.relativeVideoPath, currentSong.baseFolder);
          if (url) videoUrl = url;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to resolve video from filesystem:', e);
        }
      }

      if (currentSong.hasEmbeddedAudio && audioUrl && !videoUrl) {
        videoUrl = audioUrl;
      }

      resolvedAudioUrlRef.current = audioUrl || null;
      resolvedVideoUrlRef.current = videoUrl || null;

      if (audioRef.current && audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      }

      if (videoRef.current && videoUrl) {
        videoRef.current.src = videoUrl;
        videoRef.current.load();
      }

      if (cancelled) return;

      setMediaLoaded(true);
    };

    loadMedia();

    return () => { cancelled = true; };
  }, [currentSong, gameCurrentRound, medleySnippetIndex]);

  useEffect(() => {
    return () => { revokeSongMediaUrls(lastMediaUrlsRef.current); };
  }, []);

  // Determine if song uses YouTube (for video background rendering)
  const youtubeUrl = currentSong?.youtubeUrl;
  const isYouTube = !!youtubeUrl && isYouTubeUrl(youtubeUrl);
  const youtubeVideoId = isYouTube ? extractYouTubeId(youtubeUrl) : null;

  return {
    currentSong,
    mediaLoaded,
    audioRef,
    videoRef,
    resolvedAudioUrlRef,
    resolvedVideoUrlRef,
    audioHasPlayedRef,
    isYouTube,
    youtubeVideoId,
    hasLocalAudio: !!resolvedAudioUrlRef.current,
  };
}
