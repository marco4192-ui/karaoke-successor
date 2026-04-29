'use client';

import { useState, useRef, useEffect } from 'react';
import { Song } from '@/types/game';
import { getSongMediaUrls } from '@/lib/db/media-db';
import { getSongMediaUrl, isTauri } from '@/lib/tauri-file-storage';

interface UseBattleRoyaleSongMediaParams {
  currentRoundSongId: string | undefined;
  songs: Song[];
  gameCurrentRound: number;
}

interface UseBattleRoyaleSongMediaReturn {
  currentSong: Song | null;
  mediaLoaded: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  resolvedAudioUrlRef: React.RefObject<string | null>;
  resolvedVideoUrlRef: React.RefObject<string | null>;
  audioHasPlayedRef: React.RefObject<boolean>;
}

/**
 * Manages song data loading (URLs, lyrics) and media element setup (audio/video).
 * Handles both browser (IndexedDB) and Tauri (filesystem) media resolution.
 */
export function useBattleRoyaleSongMedia({
  currentRoundSongId,
  songs,
  gameCurrentRound,
}: UseBattleRoyaleSongMediaParams): UseBattleRoyaleSongMediaReturn {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  // Media element refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const resolvedAudioUrlRef = useRef<string | null>(null);
  const resolvedVideoUrlRef = useRef<string | null>(null);
  const audioHasPlayedRef = useRef(false);

  // Track the last round + song we handled to avoid redundant resets
  const lastHandledRef = useRef<string>('');

  // Load full song data with lyrics + URLs when round changes
  useEffect(() => {
    if (currentRoundSongId) {
      const song = songs.find(s => s.id === currentRoundSongId);
      if (song) {
        // Ensure full song data: resolve URLs (Tauri) + load lyrics (IndexedDB/filesystem)
        import('@/lib/game/song-library').then(async ({ ensureSongUrls, loadSongLyrics }) => {
          let preparedSong = song;
          // Restore media URLs for Tauri filesystem access
          try {
            preparedSong = await ensureSongUrls(song);
          } catch (e) {
            console.warn('[BattleRoyale] Failed to ensure song URLs:', e);
          }
          // Load lyrics if missing (storedTxt or relativeTxtPath)
          if ((!preparedSong.lyrics || preparedSong.lyrics.length === 0) &&
              (preparedSong.storedTxt || preparedSong.relativeTxtPath)) {
            try {
              const lyrics = await loadSongLyrics(preparedSong);
              if (lyrics.length > 0) {
                preparedSong = { ...preparedSong, lyrics };
              }
            } catch (e) {
              console.warn('[BattleRoyale] Failed to load lyrics:', e);
            }
          }
          setCurrentSong(preparedSong);
        });
      }
    }
  }, [currentRoundSongId, songs, gameCurrentRound]);

  // Load media when song changes — handles both browser (IndexedDB) and Tauri (filesystem).
  // Merged with the reset logic to prevent race conditions between separate effects.
  // When a new round starts, the previous song may still be in currentSong; the key
  // `round:currentSongId` ensures we only act once per round+song combination.
  useEffect(() => {
    const songId = currentSong?.id ?? '';
    const key = `${gameCurrentRound}:${songId}`;

    // Skip if we already handled this exact round+song combo
    if (key === lastHandledRef.current) return;
    lastHandledRef.current = key;

    // Reset state for the new song
    audioHasPlayedRef.current = false;
    setMediaLoaded(false);
    resolvedAudioUrlRef.current = null;
    resolvedVideoUrlRef.current = null;

    if (!currentSong) return;

    const loadMedia = async () => {
      let audioUrl: string | undefined = currentSong.audioUrl;
      let videoUrl: string | undefined = currentSong.videoBackground;

      // Browser: Load from IndexedDB if storedMedia flag is set
      if (currentSong.storedMedia) {
        try {
          const mediaUrls = await getSongMediaUrls(currentSong.id);
          if (mediaUrls.audioUrl) audioUrl = mediaUrls.audioUrl;
          if (mediaUrls.videoUrl) videoUrl = mediaUrls.videoUrl;
        } catch (e) {
          console.error('Failed to load media from IndexedDB:', e);
        }
      }

      // Tauri: Resolve filesystem paths if audioUrl/videoUrl is still missing
      if (!audioUrl && currentSong.relativeAudioPath && isTauri()) {
        try {
          const url = await getSongMediaUrl(currentSong.relativeAudioPath, currentSong.baseFolder);
          if (url) audioUrl = url;
        } catch (e) {
          console.error('Failed to resolve audio from filesystem:', e);
        }
      }
      if (!videoUrl && currentSong.relativeVideoPath && isTauri()) {
        try {
          const url = await getSongMediaUrl(currentSong.relativeVideoPath, currentSong.baseFolder);
          if (url) videoUrl = url;
        } catch (e) {
          console.error('Failed to resolve video from filesystem:', e);
        }
      }

      // Handle embedded audio: video and audio share the same file
      if (currentSong.hasEmbeddedAudio && audioUrl && !videoUrl) {
        videoUrl = audioUrl;
      }

      // Store resolved URLs for the play check
      resolvedAudioUrlRef.current = audioUrl || null;
      resolvedVideoUrlRef.current = videoUrl || null;

      // Set up audio element
      if (audioRef.current && audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      }

      // Set up video element
      if (videoRef.current && videoUrl) {
        videoRef.current.src = videoUrl;
        videoRef.current.load();
      }

      setMediaLoaded(true);
    };

    loadMedia();
  }, [currentSong, gameCurrentRound]);

  return {
    currentSong,
    mediaLoaded,
    audioRef,
    videoRef,
    resolvedAudioUrlRef,
    resolvedVideoUrlRef,
    audioHasPlayedRef,
  };
}
