'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { Song, Note } from '@/types/game';
import { getSongMediaUrls } from '@/lib/db/media-db';
import { getSongMediaUrl, isTauri } from '@/lib/tauri-file-storage';
import { calculateScoringMetadata } from '@/lib/game/scoring';

interface UseBattleRoyaleMediaParams {
  currentRound: { songId: string; duration: number } | undefined;
  songs: Song[];
}

interface TimingData {
  allNotes: Array<Note & { lineIndex: number }>;
  beatDuration: number;
  scoringMetadata: ReturnType<typeof calculateScoringMetadata>;
}

/**
 * Handles song loading, media resolution (Tauri filesystem / browser IndexedDB),
 * and timing data pre-computation for Battle Royale rounds.
 *
 * Returns the loaded song with full lyrics and URLs, plus refs for media
 * playback elements and resolved URLs.
 */
export function useBattleRoyaleMedia({ currentRound, songs }: UseBattleRoyaleMediaParams) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  // Media playback refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Track the resolved media URLs so the play logic can use them
  const resolvedAudioUrlRef = useRef<string | null>(null);
  const resolvedVideoUrlRef = useRef<string | null>(null);

  // Guard: prevent onEnded from firing before audio actually started playing
  const audioHasPlayedRef = useRef(false);

  // Pre-compute timing data for scoring when song is loaded
  const timingData = useMemo<TimingData | null>(() => {
    if (!currentSong || currentSong.lyrics.length === 0) return null;

    const allNotes: Array<Note & { lineIndex: number }> = [];
    currentSong.lyrics.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        allNotes.push({ ...note, lineIndex });
      });
    });
    allNotes.sort((a, b) => a.startTime - b.startTime);

    const beatDurationMs = currentSong.bpm ? 15000 / currentSong.bpm : 500;
    const scoringMetadata = calculateScoringMetadata(allNotes, beatDurationMs);

    return { allNotes, beatDuration: beatDurationMs, scoringMetadata };
  }, [currentSong]);

  // Get current song from the round — load full song data with lyrics + URLs
  useEffect(() => {
    if (currentRound?.songId) {
      const song = songs.find(s => s.id === currentRound.songId);
      if (song) {
        // Ensure full song data: resolve URLs (Tauri) + load lyrics (IndexedDB/filesystem)
        import('@/lib/game/song-library').then(async ({ ensureSongUrls, loadSongLyrics }) => {
          let preparedSong = song;
          try {
            preparedSong = await ensureSongUrls(song);
          } catch (e) {
            console.warn('[BattleRoyale] Failed to ensure song URLs:', e);
          }
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
  }, [currentRound?.songId, songs]);

  // Load media when song changes — handles both browser (IndexedDB) and Tauri (filesystem)
  useEffect(() => {
    const loadMedia = async () => {
      if (!currentSong) {
        setMediaLoaded(false);
        resolvedAudioUrlRef.current = null;
        resolvedVideoUrlRef.current = null;
        return;
      }

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
        console.log('[BattleRoyale] Embedded audio detected — using audio URL as video URL');
      }

      resolvedAudioUrlRef.current = audioUrl || null;
      resolvedVideoUrlRef.current = videoUrl || null;

      console.log('[BattleRoyale] Media resolved:', { audioUrl: audioUrl ? 'set' : 'missing', videoUrl: videoUrl ? 'set' : 'missing' });

      if (audioRef.current && audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      } else {
        console.warn('[BattleRoyale] No audio URL available — audio will not play');
      }

      if (videoRef.current && videoUrl) {
        videoRef.current.src = videoUrl;
        videoRef.current.load();
      }

      setMediaLoaded(true);
    };

    loadMedia();
  }, [currentSong]);

  // Reset audio-has-played guard when song changes
  useEffect(() => {
    audioHasPlayedRef.current = false;
    setMediaLoaded(false);
    resolvedAudioUrlRef.current = null;
    resolvedVideoUrlRef.current = null;
  }, [currentSong?.id]);

  return {
    currentSong,
    mediaLoaded,
    audioRef,
    videoRef,
    resolvedAudioUrlRef,
    resolvedVideoUrlRef,
    audioHasPlayedRef,
    timingData,
  } as const;
}
