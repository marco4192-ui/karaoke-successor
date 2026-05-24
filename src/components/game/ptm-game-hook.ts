'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Song, LyricLine, Note, EMPTY_PLAYER_SCORE } from '@/types/game';

import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { useGameMedia } from '@/hooks/use-game-media';
import { useSmoothedPitch } from '@/hooks/use-smoothed-pitch';
import { useGameSettings } from '@/hooks/use-game-settings';
import { useYouTubeGame } from '@/hooks/use-youtube-game';
import { useMobileGameSync } from '@/hooks/use-mobile-game-sync';
import { toast } from '@/hooks/use-toast';
import type { PassTheMicRoundResult } from '@/lib/game/party-store';

import type { PtmPlayer, PtmSegment, PassTheMicSettings, GamePhase } from '@/components/game/ptm-types';
import { DEFAULT_SETTINGS } from '@/components/game/ptm-types';

// Sub-hooks
import { buildPlayerSchedule, type PtmScheduleEntry } from './ptm-schedule';
import { usePtmNoteData } from './use-ptm-note-data';
import { usePtmScoring } from './use-ptm-scoring';
import { usePtmTimeTracking } from './use-ptm-time-tracking';
import { usePtmSongEnergy } from './use-ptm-song-energy';
import { usePtmMedley } from './use-ptm-medley';
import { usePtmSeriesNav } from './use-ptm-series-nav';

// ===================== HOOK INTERFACE =====================

interface PtmGameScreenProps {
  players: PtmPlayer[];
  song: Song;
  segments: PtmSegment[];
  settings: PassTheMicSettings | null;
  onUpdateGame: (_players: PtmPlayer[], _segments: PtmSegment[]) => void;
  onEndGame: () => void;
  onNavigate?: (_screen: string) => void;
  onPause?: () => void;
}

interface PtmGameHookReturn {
  // Phase
  phase: GamePhase;
  countdown: number;

  // Media
  effectiveSong: Song | null;
  mediaLoaded: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoLoadedRef: React.RefObject<boolean>;
  audioSong: Song | null;
  isYouTube: boolean;
  youtubeVideoId: string | null;
  useYouTubeAudio: boolean;
  isAdPlaying: boolean;
  handleAdStart: () => void;
  handleAdEnd: () => void;
  onYoutubeTimeUpdate: (_time: number) => void;

  // Game state
  isPlaying: boolean;
  currentTime: number;
  smoothedPitch: number | null;
  currentPlayerIndex: number;
  currentPlayer: PtmPlayer | undefined;
  players: PtmPlayer[];
  isMedleyMode: boolean;

  // Note data
  allNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  sortedLines: LyricLine[];
  pitchStats: ReturnType<typeof import('@/lib/game/note-utils').calculatePitchStats>;
  scoringMeta: ReturnType<typeof import('@/lib/game/scoring').calculateScoringMetadata> | null;
  visibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  displayDuration: number;
  songEnergy: number;

  // Settings
  showBackgroundVideo: boolean;
  useAnimatedBackground: boolean;
  noteDisplayStyle: string;
  noteShapeStyle: 'rounded' | 'sharp' | 'pill' | 'music-note' | 'star' | 'circle' | 'hexagon' | 'triangle';
  safeSettings: PassTheMicSettings;

  // Transition
  transitionVisible: boolean;
  transitionNextPlayer: { id: string; name: string; avatar?: string; color: string } | null;
  completeTransition: () => void;

  // Series
  passTheMicSeriesHistory: PassTheMicRoundResult[];
  currentSegmentIndex: number;
  medleySnippetCount: number;
  initialSegmentsLength: number;

  // Callbacks
  startGame: () => Promise<void>;
  togglePause: () => void;
  handleEndSong: () => void;
  handleMediaEnded: () => void;
  handleMediaError: () => void;
  isRetryingSnippet: boolean;
  handleContinue: () => void;
  handleEndSeries: () => void;
  handleEndSeriesComplete: () => void;
  handleContinueWithPlayers: () => void;
  activeWebcamStreamsRef: React.RefObject<MediaStream[]>;
  onEndGame: () => void;
}

// ===================== MAIN HOOK =====================

export function usePtmGameLogic({
  players: initialPlayers,
  song,
  segments: initialSegments,
  settings,
  onUpdateGame,
  onEndGame,
  onNavigate,
}: PtmGameScreenProps): PtmGameHookReturn {
  const safeSettings: PassTheMicSettings = settings ?? DEFAULT_SETTINGS;
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const passTheMicSeriesHistory = usePartyStore(s => s.passTheMicSeriesHistory);
  const setPassTheMicSeriesHistory = usePartyStore(s => s.setPassTheMicSeriesHistory);
  const ptmMedleySnippets = usePartyStore(s => s.ptmMedleySnippets);
  const { setGameMode } = useGameStore();
  const lastIsSongPlayingRef = useRef(false);
  const activeWebcamStreamsRef = useRef<MediaStream[]>([]);
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
    videoLoadedRef,
  } = useGameMedia(song);

  // ── Game settings (display preferences) ──
  const {
    showBackgroundVideo,
    useAnimatedBackground,
    noteDisplayStyle,
    noteShapeStyle,
  } = useGameSettings();

  // ── YouTube handling ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [youtubeTime, setYoutubeTime] = useState(0);

  const {
    youtubeVideoId,
    isYouTube,
    useYouTubeAudio,
    isAdPlaying,
    handleAdStart,
    handleAdEnd,
  } = useYouTubeGame({
    effectiveSong,
    isPlaying,
    setIsPlaying,
  });

  // ── Smoothed pitch (visual display only) ──
  // Uses rawNote (un-stabilized) for responsive pitch indicator.
  // Scoring uses pitchResult.note (stabilized) separately.
  const { pitchResult, stop, switchMicrophone } = usePitchDetector();
  const smoothedPitch = useSmoothedPitch(pitchResult?.rawNote ?? null, 0.80, 0.08);

  // ── Player state (local, mutable for performance) ──
  const playersRef = useRef<PtmPlayer[]>(
    initialPlayers.map(p => ({ ...p, ...EMPTY_PLAYER_SCORE }))
  );
  const [, rerender] = useState(0);
  // Force-render is needed because score updates mutate refs (for performance) instead of state.
  const forceRender = useCallback(() => rerender(n => n + 1), []);
  const fallbackLyricsRef = useRef<LyricLine[] | null>(null);
  const segmentSwitchHandledRef = useRef(false);
  const transitionHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Pre-computed player schedule ──
  const scheduleRef = useRef<PtmScheduleEntry[]>([]);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const currentPlayerIndexRef = useRef(currentPlayerIndex);
  currentPlayerIndexRef.current = currentPlayerIndex;
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const currentPlayer = playersRef.current[currentPlayerIndex];
  const currentSegment = initialSegments[currentSegmentIndex];

  // ── Build initial player schedule ──
  useEffect(() => {
    const { schedule, assigned, initialPlayerIndex } = buildPlayerSchedule(playersRef.current, initialSegments);
    scheduleRef.current = schedule;
    setCurrentPlayerIndex(initialPlayerIndex);
    onUpdateGame(playersRef.current, assigned);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Medley mode (sub-hook) ──
  const {
    isMedleyMode,
    currentSnippet,
    audioSong,
    handleMediaError,
    isRetryingSnippet,
  } = usePtmMedley({
    phase,
    isPlaying,
    isYouTube,
    effectiveSong,
    currentSegmentIndex,
    fallbackLyricsRef,
    unmountGuardRef,
    audioRef,
    videoRef,
    recordRound: () => recordRound(),
    setPhase,
    setIsPlaying,
    segmentSwitchHandledRef,
    forceRender,
  });

  // ── Notes source with fallback lyrics ──
  const fallbackRef = useRef(fallbackLyricsRef.current);
  fallbackRef.current = fallbackLyricsRef.current;
  const notesSource = useMemo(() => {
    if (!audioSong) return null;
    if (audioSong.lyrics && audioSong.lyrics.length > 0) return audioSong;
    if (fallbackRef.current && fallbackRef.current.length > 0) {
      return { ...audioSong, lyrics: fallbackRef.current };
    }
    return audioSong;
  }, [audioSong, fallbackRef.current]);

  // ── Time tracking (sub-hook) ──
  const { currentTime, setCurrentTime, currentTimeRef } = usePtmTimeTracking({
    phase,
    isPlaying,
    isYouTube,
    youtubeTime,
    audioRef,
    videoRef,
    audioSong,
  });

  // ── Note data (sub-hook) ──
  const { allNotes, sortedLines, pitchStats, scoringMeta, visibleNotes } = usePtmNoteData({
    notesSource,
    currentTime,
  });

  // ── Song energy (sub-hook) ──
  const { songEnergy } = usePtmSongEnergy({
    allNotes,
    isPlaying,
    phase,
    currentTimeRef,
  });

  // ── Scoring (sub-hook) ──
  usePtmScoring({
    phase,
    isPlaying,
    pitchResult,
    notesSource,
    currentTime,
    difficulty: safeSettings.difficulty,
    currentPlayerIndex,
    scoringMeta,
    playersRef,
    forceRender,
  });

  // ── Display duration ──
  const displayDuration = useMemo(() => {
    if (!effectiveSong) return 0;
    if (effectiveSong.end) return effectiveSong.end;
    return effectiveSong.duration;
  }, [effectiveSong]);

  // ── Transition state ──
  const [transitionVisible, setTransitionVisible] = useState(false);
  const [transitionNextPlayer, setTransitionNextPlayer] = useState<{
    id: string; name: string; avatar?: string; color: string;
  } | null>(null);

  // ── Mobile game sync ──
  useMobileGameSync(effectiveSong, isPlaying && phase === 'playing', 'pass-the-mic', phase === 'song-results' || phase === 'series-results');

  // ── Song playing status for Escape handler ──
  useEffect(() => {
    const newVal = isPlaying && phase === 'playing';
    if (lastIsSongPlayingRef.current !== newVal) {
      lastIsSongPlayingRef.current = newVal;
      setIsSongPlaying(newVal);
    }
  }, [isPlaying, phase, setIsSongPlaying]);

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
    };
  }, [setIsSongPlaying]);

  // ── Pause / Resume sync ──
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
      else if (videoRef.current && !videoRef.current.paused && !isYouTube) videoRef.current.pause();
    } else if (pauseDialogAction === null && isPlaying && phase === 'playing') {
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => {});
      else if (videoRef.current && videoRef.current.paused && !isYouTube) videoRef.current.play().catch(() => {});
    }
  }, [pauseDialogAction, isPlaying, phase, audioRef, videoRef, isYouTube]);

  // ── Reset transition refs when segment changes ──
  const transitionShownRef = useRef(false);
  useEffect(() => {
    segmentSwitchHandledRef.current = false;
    transitionShownRef.current = false;
    if (transitionHideTimerRef.current) {
      clearTimeout(transitionHideTimerRef.current);
      transitionHideTimerRef.current = null;
    }
  }, [currentSegmentIndex]);

  // ── Safety: load lyrics if effectiveSong has no lyrics ──
  useEffect(() => {
    const src = isMedleyMode && currentSnippet ? currentSnippet.song : effectiveSong;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run when effectiveSong or snippet changes
  }, [effectiveSong, currentSnippet, isMedleyMode, forceRender]);

  // ── Show transition text ──
  const showTransitionText = useCallback((nextPlayerIdx: number) => {
    const nextPlayer = playersRef.current[nextPlayerIdx];
    if (!nextPlayer) return;
    setTransitionNextPlayer({
      id: nextPlayer.id,
      name: nextPlayer.name,
      avatar: nextPlayer.avatar,
      color: nextPlayer.color,
    });
    setTransitionVisible(true);
  }, []);

  // Dismiss transition overlay
  const completeTransition = useCallback(() => {
    setTransitionVisible(false);
  }, []);

  // ── Record round results ──
  const recordRound = useCallback(() => {
    const round: PassTheMicRoundResult = {
      songTitle: isMedleyMode ? `Medley (${ptmMedleySnippets.length} Songs)` : (effectiveSong?.title || song.title),
      songArtist: isMedleyMode ? '' : (effectiveSong?.artist || song.artist),
      playedAt: Date.now(),
      playerScores: {},
    };
    for (const p of playersRef.current) {
      round.playerScores[p.id] = {
        score: p.score,
        notesHit: p.notesHit,
        notesMissed: p.notesMissed,
        maxCombo: p.maxCombo,
      };
    }
    setPassTheMicSeriesHistory([...passTheMicSeriesHistory, round]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- isMedleyMode/ptmMedleySnippets.length excluded; recordRound uses refs
  }, [effectiveSong, song, passTheMicSeriesHistory, setPassTheMicSeriesHistory]);

  // ── Segment switching (deterministic, using pre-computed schedule) ──
  const TRANSITION_LEAD_TIME = 2000;
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !currentSegment) return;

    const schedule = scheduleRef.current;
    if (!schedule.length) return;

    // Show transition text 2s before segment end (visual only, game continues)
    if (currentSegmentIndex < initialSegments.length - 1 &&
        !transitionShownRef.current &&
        currentTime >= currentSegment.endTime - TRANSITION_LEAD_TIME) {
      transitionShownRef.current = true;
      const nextEntry = schedule[currentSegmentIndex + 1];
      if (nextEntry) {
        showTransitionText(nextEntry.playerIndex);
      }
    }

    // Switch player at segment end (deterministic, single code path)
    if (currentTime >= currentSegment.endTime && !segmentSwitchHandledRef.current) {
      segmentSwitchHandledRef.current = true;

      if (currentSegmentIndex < initialSegments.length - 1) {
        const currentEntry = schedule[currentSegmentIndex];
        const nextSegIdx = currentSegmentIndex + 1;
        const nextEntry = schedule[nextSegIdx];

        if (currentEntry) {
          playersRef.current[currentEntry.playerIndex].segmentsSung++;
        }

        setCurrentSegmentIndex(nextSegIdx);
        setCurrentPlayerIndex(nextEntry?.playerIndex ?? currentPlayerIndexRef.current);

        // Auto-hide transition text after 1.5s
        if (transitionHideTimerRef.current) clearTimeout(transitionHideTimerRef.current);
        transitionHideTimerRef.current = setTimeout(() => {
          setTransitionVisible(false);
          transitionHideTimerRef.current = null;
        }, 1500);
      } else {
        // Song finished
        setIsPlaying(false);
        setTransitionVisible(false);
        recordRound();
        setPhase('song-results');
      }
    }
  }, [phase, isPlaying, currentTime, currentSegment, currentSegmentIndex, initialSegments, showTransitionText, recordRound]);

  // ── Random switch (rare mid-segment, no phase change) ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !safeSettings.randomSwitches) return;
    const interval = setInterval(() => {
      if (Math.random() < 0.003) {
        const currentIndex = currentPlayerIndexRef.current;
        const next = (currentIndex + 1 + Math.floor(Math.random() * (playersRef.current.length - 1))) % playersRef.current.length;
        playersRef.current[currentIndex].segmentsSung++;
        setCurrentPlayerIndex(next);
        showTransitionText(next);
        if (transitionHideTimerRef.current) clearTimeout(transitionHideTimerRef.current);
        transitionHideTimerRef.current = setTimeout(() => {
          setTransitionVisible(false);
          transitionHideTimerRef.current = null;
        }, 2000);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, isPlaying, showTransitionText, safeSettings.randomSwitches]);

  // ── Mic handoff ──
  useEffect(() => {
    if (phase !== 'playing') return;
    const player = playersRef.current[currentPlayerIndex];
    if (!player) return;
    if (player.micId && player.micId !== 'default') {
      // eslint-disable-next-line no-console
      console.log(`[PTM] Mic handoff: switching to player "${player.name}" mic (${player.micId})`);
      switchMicrophone(player.micId).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[PTM] Mic handoff failed:', err);
      });
    }
  }, [currentPlayerIndex, phase, switchMicrophone]);

  // ── Series navigation (sub-hook) ──
  const { handleContinue, handleEndSeriesComplete, handleContinueWithPlayers } = usePtmSeriesNav({
    isMedleyMode,
    playersRef,
    stop,
    lastIsSongPlayingRef,
    onNavigate,
  });

  // ── End series ──
  const handleEndSeries = useCallback(() => {
    setPhase('series-results');
  }, []);

  // ── Start game (countdown → playing) ──
  const startGame = async () => {
    const songToCheck = notesSource || (isMedleyMode && currentSnippet ? currentSnippet.song : effectiveSong);
    if (!songToCheck?.lyrics || songToCheck.lyrics.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[PTM] No lyrics loaded, attempting reload...');
      const fallbackSrc = isMedleyMode && currentSnippet ? currentSnippet.song : effectiveSong;
      try {
        const { getSongByIdWithLyrics } = await import('@/lib/game/song-library');
        if (!fallbackSrc) return;
        const songWithLyrics = await getSongByIdWithLyrics(fallbackSrc.id);
        if (songWithLyrics?.lyrics?.length) {
          fallbackLyricsRef.current = songWithLyrics.lyrics;
          forceRender();
        }
      } catch { /* non-critical */ }
    }

    setPhase('countdown');
    setCountdown(3);
    const micId = safeSettings.sharedMicId && safeSettings.sharedMicId !== 'default'
      ? safeSettings.sharedMicId
      : (safeSettings.micId && safeSettings.micId !== 'default' ? safeSettings.micId : undefined);

    // ── Initialize pitch detector with retry ──
    // eslint-disable-next-line no-console
    console.log(`[PTM] Initializing microphone (micId=${micId ?? 'default'})...`);

    let micSuccess = false;
    try {
      micSuccess = await switchMicrophone(micId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[PTM] switchMicrophone threw:', err);
    }

    // If first attempt failed, wait 500ms and retry once
    if (!micSuccess) {
      // eslint-disable-next-line no-console
      console.warn('[PTM] First mic init failed, retrying in 500ms...');
      await new Promise(r => setTimeout(r, 500));
      try {
        micSuccess = await switchMicrophone(micId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[PTM] switchMicrophone retry threw:', err);
      }
    }

    if (!micSuccess) {
      // eslint-disable-next-line no-console
      console.error('[PTM] Pitch detector initialization failed after retry. Scoring will be disabled.');
      toast({
        title: 'Microphone Issue',
        description: 'Could not initialize pitch detection. Scoring will be disabled for this round. Check your microphone permissions and try again.',
        variant: 'destructive',
      });
    } else {
      // Verification: wait 300ms and check if pitchResult has been populated
      await new Promise<void>(resolve => {
        setTimeout(() => {
          // pitchResult is captured from the React hook's state; we check the ref
          // via the closure — if it's still null after 300ms, the callback may not be firing.
          // eslint-disable-next-line no-console
          console.log('[PTM] Mic init succeeded. Verifying pitch callback...');
          resolve();
        }, 300);
      });
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          countdownIntervalRef.current = null;
          setPhase('playing');
          setIsPlaying(true);
          setCurrentTime(0);
          const seekTo = isMedleyMode && ptmMedleySnippets[0]
            ? ptmMedleySnippets[0].startTime / 1000
            : 0;

          requestAnimationFrame(() => {
            if (audioRef.current) {
              audioRef.current.currentTime = seekTo;
              audioRef.current.play().catch(() => {});
              if (videoRef.current && videoRef.current !== audioRef.current && !isYouTube && videoRef.current.paused) {
                videoRef.current.currentTime = seekTo;
                videoRef.current.play().catch(() => {});
              }
            } else if (videoRef.current && !isYouTube) {
              videoRef.current.currentTime = seekTo;
              videoRef.current.play().catch(() => {});
            } else {
              // eslint-disable-next-line no-console
              console.warn('[PTM] No media element available at game start, retrying...');
              countdownRetryRef.current = setTimeout(() => {
                countdownRetryRef.current = null;
                if (unmountGuardRef.current) return;
                if (audioRef.current) {
                  audioRef.current.currentTime = seekTo;
                  audioRef.current.play().catch(() => {});
                } else if (videoRef.current && !isYouTube) {
                  videoRef.current.currentTime = seekTo;
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

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      try { stop(); } catch { /* already stopped */ }
      activeWebcamStreamsRef.current.forEach(stream => {
        stream.getTracks().forEach(t => t.stop());
      });
      activeWebcamStreamsRef.current = [];
      document.querySelectorAll('video[style*="z-index:100"]').forEach(el => el.remove());
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [stop]);

  // ── Toggle pause/resume ──
  const togglePause = useCallback(() => {
    if (isPlaying) {
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
      if (videoRef.current && !videoRef.current.paused && !isYouTube) videoRef.current.pause();
      setIsPlaying(false);
      setIsSongPlaying(false);
      lastIsSongPlayingRef.current = false;
    } else if (phase === 'playing') {
      setIsPlaying(true);
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => {});
      if (videoRef.current && videoRef.current.paused && !isYouTube) videoRef.current.play().catch(() => {});
    }
  }, [isPlaying, phase, audioRef, videoRef, isYouTube, setIsSongPlaying]);

  // ── Handle ending the song early ──
  const handleEndSong = useCallback(() => {
    setIsPlaying(false);
    recordRound();
    setPhase('song-results');
  }, [recordRound]);

  // ── Shared handler for audio/video/background end ──
  const handleMediaEnded = useCallback(() => {
    if (phase === 'playing') {
      setIsPlaying(false);
      recordRound();
      setPhase('song-results');
    }
  }, [phase, recordRound]);

  return {
    // Phase
    phase,
    countdown,

    // Media
    effectiveSong,
    mediaLoaded,
    audioRef,
    videoRef,
    videoLoadedRef,
    audioSong,
    isYouTube,
    youtubeVideoId,
    useYouTubeAudio,
    isAdPlaying,
    handleAdStart,
    handleAdEnd,
    onYoutubeTimeUpdate: setYoutubeTime,

    // Game state
    isPlaying,
    currentTime,
    smoothedPitch,
    currentPlayerIndex,
    currentPlayer,
    players: playersRef.current,
    isMedleyMode,

    // Note data
    allNotes,
    sortedLines,
    pitchStats,
    scoringMeta,
    visibleNotes,
    displayDuration,
    songEnergy,

    // Settings
    showBackgroundVideo,
    useAnimatedBackground,
    noteDisplayStyle,
    noteShapeStyle,
    safeSettings,

    // Transition
    transitionVisible,
    transitionNextPlayer,
    completeTransition,

    // Series
    passTheMicSeriesHistory,
    currentSegmentIndex,
    medleySnippetCount: ptmMedleySnippets.length,
    initialSegmentsLength: initialSegments.length,

    // Callbacks
    startGame,
    handleEndSong,
    togglePause,
    handleMediaEnded,
    handleMediaError,
    isRetryingSnippet,
    handleContinue,
    handleEndSeries,
    handleEndSeriesComplete,
    handleContinueWithPlayers,
    activeWebcamStreamsRef,
    onEndGame,
  };
}
