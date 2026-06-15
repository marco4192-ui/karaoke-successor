'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Song, Note, LyricLine, EMPTY_PLAYER_SCORE } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { useGameMedia } from '@/hooks/use-game-media';
import { useGameSettings } from '@/hooks/use-game-settings';
import { useMobileGameSync } from '@/hooks/use-mobile-game-sync';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { getVisibleNotes, NOTE_WINDOW } from '@/lib/game/note-utils';
import type { CptmPlayer, CptmSegment, CptmSettings, CptmRoundResult, GamePhase } from './cptm-types';
import { DEFAULT_CPTM_SETTINGS } from './cptm-types';

// ── Sub-hooks ──
import { useCompanionPitchPolling } from './cptm-companion-polling';
import { useCptmScoring } from './cptm-scoring';
import { useCptmTurnManagement, sendCompanionTurnSignal } from './cptm-turn-management';
import { useCptmSeries } from './cptm-series';

// ===================== CONSTANTS =====================

/** Default lead time in seconds before segment end to start blink warning */
const DEFAULT_BLINK_LEAD_TIME = 3;

// ===================== HOOK INTERFACES =====================

interface CptmGameHookProps {
  players: CptmPlayer[];
  song: Song;
  segments: CptmSegment[];
  settings: CptmSettings | null;
  onUpdateGame: (_players: CptmPlayer[], _segments: CptmSegment[]) => void;
  onEndGame: () => void;
  onNavigate?: (_screen: string) => void;
}

interface CptmGameHookReturn {
  // Phase
  phase: GamePhase;
  countdown: number;

  // Media
  effectiveSong: Song | null;
  mediaLoaded: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  currentTime: number;

  // Game state
  currentPlayerIndex: number;
  currentPlayer: CptmPlayer | undefined;
  players: CptmPlayer[];

  // Note data
  allNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  sortedLines: LyricLine[];
  scoringMeta: ReturnType<typeof calculateScoringMetadata> | null;
  visibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  displayDuration: number;

  // Settings
  showBackgroundVideo: boolean;
  useAnimatedBackground: boolean;
  noteDisplayStyle: string;
  noteShapeStyle: 'rounded' | 'sharp' | 'pill' | 'music-note' | 'star' | 'circle' | 'hexagon' | 'triangle';
  safeSettings: CptmSettings;

  // Series
  cptmSeriesHistory: CptmRoundResult[];
  currentSegmentIndex: number;

  // Callbacks
  startGame: () => Promise<void>;
  togglePause: () => void;
  handleEndSong: () => void;
  handleMediaEnded: () => void;
  handleContinue: () => void;
  handleEndSeries: () => void;
  handleEndSeriesComplete: () => void;
  onEndGame: () => void;
}

// ===================== MAIN HOOK =====================

export function useCptmGameLogic({
  players: initialPlayers,
  song,
  segments: initialSegments,
  settings,
  onUpdateGame,
  onEndGame,
  onNavigate,
}: CptmGameHookProps): CptmGameHookReturn {
  const safeSettings: CptmSettings = settings ?? DEFAULT_CPTM_SETTINGS;

  // ── Party store selectors ──
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const cptmSeriesHistory = usePartyStore(s => s.cptmSeriesHistory);
  const setCptmSeriesHistory = usePartyStore(s => s.setCptmSeriesHistory);
  const setCptmPlayers = usePartyStore(s => s.setCptmPlayers);
  const setCptmSong = usePartyStore(s => s.setCptmSong);
  const setCptmSegments = usePartyStore(s => s.setCptmSegments);
  const setCptmSettings = usePartyStore(s => s.setCptmSettings);
  const cptmSongSelection = usePartyStore(s => s.cptmSongSelection);
  const { setGameMode, resetGame } = useGameStore();

  // ── Refs for cleanup ──
  const lastIsSongPlayingRef = useRef(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountGuardRef = useRef(false);

  // ── Phase management ──
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [countdown, setCountdown] = useState(3);

  // ── Media: URL restoration, lyrics, media element refs ──
  const {
    effectiveSong,
    mediaLoaded,
    audioRef,
    videoRef,
  } = useGameMedia(song);

  // ── Game settings (display preferences) ──
  const {
    showBackgroundVideo,
    useAnimatedBackground,
    noteDisplayStyle,
    noteShapeStyle,
  } = useGameSettings();

  // ── Playback state ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // ── Player state (local, mutable for performance) ──
  const playersRef = useRef<CptmPlayer[]>(
    initialPlayers.map(p => ({ ...p, ...EMPTY_PLAYER_SCORE }))
  );
  const [, rerender] = useState(0);
  const forceRender = useCallback(() => rerender(n => n + 1), []);
  const fallbackLyricsRef = useRef<LyricLine[] | null>(null);

  // ── Blink lead time from settings (default 3s) ──
  const blinkLeadTime = safeSettings.blinkWarning ?? DEFAULT_BLINK_LEAD_TIME;

  // ═══════════════════════════════════════════════════════
  // ── SUB-HOOK: Series management ──
  // ═══════════════════════════════════════════════════════
  const {
    recordRound,
    handleContinue,
    handleEndSeries,
    handleEndSeriesComplete,
  } = useCptmSeries({
    effectiveSong,
    song,
    playersRef,
    cptmSeriesHistory,
    setCptmSeriesHistory,
    setCptmPlayers,
    setCptmSong,
    setCptmSegments,
    setCptmSettings,
    cptmSongSelection,
    setGameMode,
    resetGame,
    setIsSongPlaying,
    lastIsSongPlayingRef,
    setPhase,
    onNavigate,
  });

  // ═══════════════════════════════════════════════════════
  // ── SUB-HOOK: Turn management (schedule + segments) ──
  // ═══════════════════════════════════════════════════════
  const {
    currentPlayerIndex,
    currentSegmentIndex,
    currentPlayer,
    currentPlayerIndexRef,
  } = useCptmTurnManagement({
    initialPlayers,
    initialSegments,
    playersRef,
    phase,
    isPlaying,
    currentTime,
    blinkLeadTime,
    onUpdateGame,
    recordRound,
    setIsPlaying,
    setPhase,
  });

  // ═══════════════════════════════════════════════════════
  // ── SUB-HOOK: Companion pitch polling ──
  // ═══════════════════════════════════════════════════════
  const companionPitchCacheRef = useCompanionPitchPolling(phase, isPlaying);

  // ── Mobile game sync ──
  useMobileGameSync(effectiveSong, isPlaying && phase === 'playing', 'companion-pass-the-mic', phase === 'song-results' || phase === 'series-results');

  // ── Song playing status for Escape handler ──
  useEffect(() => {
    const newVal = isPlaying && phase === 'playing';
    if (lastIsSongPlayingRef.current !== newVal) {
      lastIsSongPlayingRef.current = newVal;
      setIsSongPlaying(newVal);
    }
  }, [isPlaying, phase, setIsSongPlaying]);

  // ── Pause / Resume sync ──
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
      else if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
    } else if (pauseDialogAction === null && isPlaying && phase === 'playing') {
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => {});
      else if (videoRef.current && videoRef.current.paused) videoRef.current.play().catch(() => {});
    }
  }, [pauseDialogAction, isPlaying, phase, audioRef, videoRef]);

  // ── Safety: load lyrics if effectiveSong has no lyrics ──
  useEffect(() => {
    const src = effectiveSong;
    if (!src) {
      fallbackLyricsRef.current = null;
      return;
    }
    if (src.lyrics && src.lyrics.length > 0) {
      if (fallbackLyricsRef.current) {
        fallbackLyricsRef.current = null;
      }
      return;
    }
    let cancelled = false;
    import('@/lib/game/song-library').then(({ getSongByIdWithLyrics }) => {
      getSongByIdWithLyrics(src.id).then(songWithLyrics => {
        if (cancelled || !songWithLyrics?.lyrics?.length) return;
        fallbackLyricsRef.current = songWithLyrics.lyrics;
        forceRender();
      }).catch(() => {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [effectiveSong, forceRender]);

  // ── Build notesSource from effectiveSong (with fallback lyrics) ──
  const fallbackRef = useRef(fallbackLyricsRef.current);
  fallbackRef.current = fallbackLyricsRef.current;
  const notesSource = useMemo(() => {
    if (!effectiveSong) return null;
    if (effectiveSong.lyrics && effectiveSong.lyrics.length > 0) return effectiveSong;
    if (fallbackRef.current && fallbackRef.current.length > 0) {
      return { ...effectiveSong, lyrics: fallbackRef.current };
    }
    return effectiveSong;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fallbackRef.current is intentionally read inside useMemo for async-loaded lyrics
  }, [effectiveSong, fallbackRef.current]);

  // ── Pre-compute note data for highway ──
  const { allNotes, sortedLines, scoringMeta } = useMemo(() => {
    if (!notesSource?.lyrics?.length) {
      return { allNotes: [], sortedLines: [], scoringMeta: null };
    }

    const notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    const lines = [...notesSource.lyrics].sort((a, b) => a.startTime - b.startTime);

    lines.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        notes.push({ ...note, lineIndex, line });
      });
    });
    notes.sort((a, b) => a.startTime - b.startTime);

    const bd = notesSource.bpm ? 15000 / notesSource.bpm : 500;
    const meta = calculateScoringMetadata(notes, bd);

    return { allNotes: notes, sortedLines: lines, scoringMeta: meta };
  }, [notesSource]);

  const visibleNotes = useMemo(
    () => getVisibleNotes(allNotes, currentTime, NOTE_WINDOW),
    [currentTime, allNotes]
  );

  // ═══════════════════════════════════════════════════════
  // ── SUB-HOOK: Scoring ──
  // ═══════════════════════════════════════════════════════
  useCptmScoring({
    phase,
    isPlaying,
    playersRef,
    currentPlayerIndex,
    companionPitchCacheRef,
    notesSource,
    currentTime,
    difficulty: safeSettings.difficulty,
    scoringMeta,
    forceRender,
  });

  // ── RAF-based time tracking (smooth ~40fps) ──
  const lastCurrentTimeUpdateRef = useRef(0);
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) return;
    let rafId: number;

    const timeLoop = () => {
      let elapsedMs: number;

      if (audioRef.current && !audioRef.current.paused && audioRef.current.readyState >= 2) {
        elapsedMs = audioRef.current.currentTime * 1000;
      } else if (videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 2) {
        elapsedMs = videoRef.current.currentTime * 1000;
      } else {
        elapsedMs = currentTimeRef.current;
      }

      const now = performance.now();
      if (now - lastCurrentTimeUpdateRef.current >= 25) {
        setCurrentTime(elapsedMs);
        lastCurrentTimeUpdateRef.current = now;
      }

      rafId = requestAnimationFrame(timeLoop);
    };

    rafId = requestAnimationFrame(timeLoop);
    return () => cancelAnimationFrame(rafId);
  }, [phase, isPlaying, audioRef, videoRef]);

  // ── Legacy timeupdate fallback (non-playing phases) ──
  useEffect(() => {
    if (phase === 'playing') return;

    const audio = audioRef.current;
    if (audio) {
      const handleTimeUpdate = () => setCurrentTime(audio.currentTime * 1000);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
    }

    const video = videoRef.current;
    if (video) {
      const handleTimeUpdate = () => setCurrentTime(video.currentTime * 1000);
      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }, [audioRef, videoRef, effectiveSong, phase]);

  // ── Display duration ──
  const displayDuration = useMemo(() => {
    if (!effectiveSong) return 0;
    if (effectiveSong.end) return effectiveSong.end;
    return effectiveSong.duration;
  }, [effectiveSong]);

  // ── Cleanup: reset isSongPlaying on unmount ──
  useEffect(() => {
    unmountGuardRef.current = false;
    return () => {
      unmountGuardRef.current = true;
      setIsSongPlaying(false);
      lastIsSongPlayingRef.current = false;
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (countdownRetryRef.current) {
        clearTimeout(countdownRetryRef.current);
        countdownRetryRef.current = null;
      }
      // Clear companion turn signal on unmount
      sendCompanionTurnSignal(null, null, null, false);
    };
  }, [setIsSongPlaying]);

  // ── Start game (countdown → playing) ──
  const startGame = async () => {
    // Guard: ensure lyrics are available before starting
    const songToCheck = notesSource || effectiveSong;
    if (!songToCheck?.lyrics || songToCheck.lyrics.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[CPTM] No lyrics loaded, attempting reload...');
      try {
        const { getSongByIdWithLyrics } = await import('@/lib/game/song-library');
        if (!effectiveSong) return;
        const songWithLyrics = await getSongByIdWithLyrics(effectiveSong.id);
        if (songWithLyrics?.lyrics?.length) {
          fallbackLyricsRef.current = songWithLyrics.lyrics;
          forceRender();
        }
      } catch { /* non-critical */ }
    }

    setPhase('countdown');
    setCountdown(3);

    // No microphone needed for CPtM — pitch comes from companion apps

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          countdownIntervalRef.current = null;
          setPhase('playing');
          setIsPlaying(true);
          setCurrentTime(0);

          // Send "YOUR TURN" to the first player's companion
          const firstPlayer = playersRef.current[currentPlayerIndexRef.current];
          if (firstPlayer) {
            sendCompanionTurnSignal(firstPlayer.id, null, null, true);
          }

          requestAnimationFrame(() => {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
              if (videoRef.current && videoRef.current !== audioRef.current && videoRef.current.paused) {
                videoRef.current.currentTime = 0;
                videoRef.current.play().catch(() => {});
              }
            } else if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.play().catch(() => {});
            } else {
              // Media element not ready yet — retry shortly
              // eslint-disable-next-line no-console
              console.warn('[CPTM] No media element available at game start, retrying...');
              countdownRetryRef.current = setTimeout(() => {
                countdownRetryRef.current = null;
                if (unmountGuardRef.current) return;
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play().catch(() => {});
                } else if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().catch(() => {});
                }
              }, 300);
            }
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    countdownIntervalRef.current = interval;
  };

  // ── Toggle pause/resume ──
  const togglePause = useCallback(() => {
    if (isPlaying) {
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
      if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
      setIsPlaying(false);
      setIsSongPlaying(false);
      lastIsSongPlayingRef.current = false;
    } else if (phase === 'playing') {
      setIsPlaying(true);
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => {});
      if (videoRef.current && videoRef.current.paused) videoRef.current.play().catch(() => {});
    }
  }, [isPlaying, phase, audioRef, videoRef, setIsSongPlaying]);

  // ── Round-recorded guard to prevent double recordRound() ──
  const roundRecordedRef = useRef(false);

  // ── Handle ending the song early ──
  const handleEndSong = useCallback(() => {
    audioRef.current?.pause();
    videoRef.current?.pause();
    if (roundRecordedRef.current) return;
    roundRecordedRef.current = true;
    setIsPlaying(false);
    recordRound();
    setPhase('song-results');
    sendCompanionTurnSignal(null, null, null, false);
  }, [recordRound, audioRef, videoRef]);

  // ── Shared handler for audio/video end ──
  const handleMediaEnded = useCallback(() => {
    if (phase === 'playing') {
      if (roundRecordedRef.current) return;
      roundRecordedRef.current = true;
      setIsPlaying(false);
      recordRound();
      setPhase('song-results');
      sendCompanionTurnSignal(null, null, null, false);
    }
  }, [phase, recordRound]);

  // ── Return ──
  return {
    // Phase
    phase,
    countdown,

    // Media
    effectiveSong,
    mediaLoaded,
    audioRef,
    videoRef,
    isPlaying,
    currentTime,

    // Game state
    currentPlayerIndex,
    currentPlayer,
    players: playersRef.current,

    // Note data
    allNotes,
    sortedLines,
    scoringMeta,
    visibleNotes,
    displayDuration,

    // Settings
    showBackgroundVideo,
    useAnimatedBackground,
    noteDisplayStyle,
    noteShapeStyle,
    safeSettings,

    // Series
    cptmSeriesHistory,
    currentSegmentIndex,

    // Callbacks
    startGame,
    togglePause,
    handleEndSong,
    handleMediaEnded,
    handleContinue,
    handleEndSeries,
    handleEndSeriesComplete,
    onEndGame,
  };
}
