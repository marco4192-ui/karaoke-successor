'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Song, PLAYER_COLORS, LyricLine, Difficulty, Note } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { useGameMedia } from '@/hooks/use-game-media';
import { useSmoothedPitch } from '@/hooks/use-smoothed-pitch';
import { useGameSettings } from '@/hooks/use-game-settings';
import { useYouTubeGame } from '@/hooks/use-youtube-game';
import { useMobileGameSync } from '@/hooks/use-mobile-game-sync';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { findActiveNote, shouldSkipPitch, evaluateAndScoreTick } from '@/lib/game/party-scoring';
import { calculatePitchStats, PitchStats, NOTE_WINDOW, VISIBLE_TOP, VISIBLE_RANGE, getVisibleNotes } from '@/lib/game/note-utils';
import type { PassTheMicRoundResult } from '@/lib/game/party-store';
import { GameBackground } from '@/components/game/game-background';
import { NoteHighway } from '@/components/game/note-highway';
import { SinglePlayerLyrics } from '@/components/game/single-player-lyrics';
import { GameCountdown } from '@/components/game/game-countdown';
import { GameProgressBar } from '@/components/game/game-hud';
import { TimeDisplay } from '@/components/game/game-hud';
import { PtmTransitionOverlay } from '@/components/game/ptm-transition-overlay';
import { PtmSongResults, PtmSeriesResults } from '@/components/game/ptm-song-results';

// Extracted modules
import type { PtmPlayer, PtmSegment, PassTheMicSettings, GamePhase } from '@/components/game/ptm-types';
import { DEFAULT_SETTINGS } from '@/components/game/ptm-types';
export type { PassTheMicPlayer, PassTheMicSegment, PassTheMicSettings } from '@/components/game/ptm-types';
import { PtmIntroScreen } from '@/components/game/ptm-intro-screen';
import { PtmPlayerRanking } from '@/components/game/ptm-player-ranking';
import { PtmHudPlayerScore } from '@/components/game/ptm-hud-player-score';
import { PtmHudControls } from '@/components/game/ptm-hud-controls';

// ===================== MAIN COMPONENT =====================

interface PtmGameScreenProps {
  players: PtmPlayer[];
  song: Song;
  segments: PtmSegment[];
  settings: PassTheMicSettings | null;
  onUpdateGame: (players: PtmPlayer[], segments: PtmSegment[]) => void;
  onEndGame: () => void;
  onNavigate?: (screen: string) => void;
  onPause?: () => void;
}

export function PtmGameScreen({
  players: initialPlayers,
  song,
  segments: initialSegments,
  settings,
  onUpdateGame,
  onEndGame,
  onNavigate,
  onPause,
}: PtmGameScreenProps) {
  const safeSettings: PassTheMicSettings = settings ?? DEFAULT_SETTINGS;
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const passTheMicSeriesHistory = usePartyStore(s => s.passTheMicSeriesHistory);
  const setPassTheMicSeriesHistory = usePartyStore(s => s.setPassTheMicSeriesHistory);
  const setPassTheMicPlayers = usePartyStore(s => s.setPassTheMicPlayers);
  const setPassTheMicSong = usePartyStore(s => s.setPassTheMicSong);
  const setPassTheMicSegments = usePartyStore(s => s.setPassTheMicSegments);
  const setPassTheMicSettings = usePartyStore(s => s.setPassTheMicSettings);
  const ptmMedleySnippets = usePartyStore(s => s.ptmMedleySnippets);
  const ptmSongSelection = usePartyStore(s => s.ptmSongSelection);
  const { setGameMode, resetGame } = useGameStore();
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
    audioLoadedRef,
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
  const [currentTime, setCurrentTime] = useState(0);
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

  // ── Song energy (for animated background) ──
  const [songEnergy, setSongEnergy] = useState(0);

  // ── Smoothed pitch ──
  const { pitchResult, initialize, start, stop, switchMicrophone } = usePitchDetector();
  const smoothedPitch = useSmoothedPitch(pitchResult?.note ?? null, 0.3, 0.25);

  // ── Player state (local, mutable for performance) ──
  const playersRef = useRef<PtmPlayer[]>(
    initialPlayers.map(p => ({ ...p, score: 0, notesHit: 0, notesMissed: 0, combo: 0, maxCombo: 0 }))
  );
  const [, rerender] = useState(0);
  const forceRender = useCallback(() => rerender(n => n + 1), []);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const currentPlayer = playersRef.current[currentPlayerIndex];
  const currentSegment = initialSegments[currentSegmentIndex];

  // ── Medley mode support ──
  const isMedleyMode = ptmMedleySnippets.length > 1;
  const currentSnippet = isMedleyMode ? ptmMedleySnippets[currentSegmentIndex] : null;
  // In medley mode, use the current snippet's song for audio; otherwise use effectiveSong
  const audioSong = isMedleyMode && currentSnippet ? currentSnippet.song : effectiveSong;
  // For notes/lyrics, use snippet song in medley mode
  const notesSource = audioSong;

  // ── Transition state ──
  const [transitionVisible, setTransitionVisible] = useState(false);
  const [transitionNextPlayer, setTransitionNextPlayer] = useState<{
    id: string; name: string; avatar?: string; color: string;
  } | null>(null);

  // ── Mobile game sync ──
  useMobileGameSync(effectiveSong, isPlaying && phase === 'playing', 'pass-the-mic', phase === 'song-results' || phase === 'series-results');

  // ── Song playing status for Escape handler (ref-guarded to prevent React #185) ──
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

  // ── Assign segments to players (round-robin) ──
  useEffect(() => {
    const assigned = initialSegments.map((seg, i) => ({
      ...seg,
      playerId: playersRef.current[i % playersRef.current.length].id,
    }));
    onUpdateGame(playersRef.current, assigned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pre-compute note data for highway ──
  const { allNotes, sortedLines, pitchStats, scoringMeta } = useMemo(() => {
    if (!notesSource?.lyrics?.length) {
      return { allNotes: [], sortedLines: [], pitchStats: { minPitch: 40, maxPitch: 80, pitchRange: 40 } as PitchStats, scoringMeta: null };
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
    const ps = calculatePitchStats(notes);
    const meta = calculateScoringMetadata(notes, bd);

    return { allNotes: notes, sortedLines: lines, pitchStats: ps, scoringMeta: meta };
  }, [notesSource]);

  const visibleNotes = useMemo(
    () => getVisibleNotes(allNotes, currentTime, NOTE_WINDOW),
    [currentTime, allNotes]
  );

  // ── Scoring ──
  const lastEvalTimeRef = useRef(0);

  const scoreCurrentPlayer = useCallback(() => {
    if (!pitchResult) return;
    const difficulty = safeSettings.difficulty;
    if (shouldSkipPitch(pitchResult, difficulty)) return;

    const activeNote = findActiveNote(notesSource?.lyrics, currentTime);
    if (!activeNote) return;

    if (currentTime - lastEvalTimeRef.current < 250) return;
    lastEvalTimeRef.current = currentTime;

    const tick = evaluateAndScoreTick(pitchResult.note!, activeNote, difficulty, scoringMeta);
    const p = playersRef.current[currentPlayerIndex];
    const idx = currentPlayerIndex;

    if (tick.hit) {
      p.score += tick.points;
      p.notesHit++;
      p.combo++;
      if (p.combo > p.maxCombo) p.maxCombo = p.combo;
    } else {
      p.combo = 0;
      p.notesMissed++;
    }

    playersRef.current[idx] = { ...p };
    forceRender();
  }, [currentTime, pitchResult, notesSource, safeSettings.difficulty, currentPlayerIndex, scoringMeta, forceRender]);

  // ── Game loop: score during playing ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) return;
    let rafId: number;
    const loop = () => {
      scoreCurrentPlayer();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [phase, isPlaying, scoreCurrentPlayer]);

  // ── Audio time tracking ──
  // IMPORTANT: Must depend on audioSong (not just refs) because refs are stable objects.
  // The <audio>/<video> DOM elements are only rendered after URL restoration sets
  // audioSong?.audioUrl, so the effect must re-run when audioSong changes.
  useEffect(() => {
    // For YouTube, time comes from the YouTube player via onYoutubeTimeUpdate.
    // For local audio, time comes from the <audio> element's timeupdate event.
    // For embedded audio (video), time comes from the <video> element's timeupdate event.
    if (isYouTube && youtubeTime > 0) {
      setCurrentTime(youtubeTime * 1000);
      return;
    }

    const audio = audioRef.current;
    if (audio) {
      const handleTimeUpdate = () => setCurrentTime(audio.currentTime * 1000);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
    }

    // Embedded audio: fall back to video element for time tracking
    const video = videoRef.current;
    if (video) {
      const handleTimeUpdate = () => setCurrentTime(video.currentTime * 1000);
      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }, [audioRef, videoRef, isYouTube, youtubeTime, audioSong]);

  // ── Song energy tracking ──
  // Use a ref for currentTime to avoid re-creating the interval every ~250ms
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  useEffect(() => {
    if (!isPlaying || phase !== 'playing') { setSongEnergy(0); return; }
    const interval = setInterval(() => {
      // Simple energy approximation based on note density
      const t = currentTimeRef.current;
      const nearbyNotes = allNotes.filter(n =>
        Math.abs(n.startTime - t) < 2000
      ).length;
      setSongEnergy(Math.min(1, nearbyNotes / 5));
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying, phase, allNotes]);

  // ── Display duration ──
  const displayDuration = useMemo(() => {
    if (!effectiveSong) return 0;
    if (effectiveSong.end) return effectiveSong.end;
    return effectiveSong.duration;
  }, [effectiveSong]);

  // ── Show transition when segment ends ──
  const showTransition = useCallback((nextPlayerIdx: number) => {
    const nextPlayer = playersRef.current[nextPlayerIdx];
    setTransitionNextPlayer({
      id: nextPlayer.id,
      name: nextPlayer.name,
      avatar: nextPlayer.avatar,
      color: nextPlayer.color,
    });
    setPhase('transitioning');
    setTransitionVisible(true);
  }, []);

  const completeTransition = useCallback(() => {
    setTransitionVisible(false);
    setPhase('playing');
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
  }, [effectiveSong, song, passTheMicSeriesHistory, setPassTheMicSeriesHistory]);

  // ── Segment switching ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !currentSegment) return;
    if (currentTime >= currentSegment.endTime) {
      if (currentSegmentIndex < initialSegments.length - 1) {
        const nextSegIdx = currentSegmentIndex + 1;
        const nextPlayerIdx = (currentPlayerIndex + 1) % playersRef.current.length;

        // Count segment as sung for the current player
        playersRef.current[currentPlayerIndex].segmentsSung++;

        setCurrentSegmentIndex(nextSegIdx);
        setCurrentPlayerIndex(nextPlayerIdx);
        showTransition(nextPlayerIdx);
      } else {
        // Song finished
        setIsPlaying(false);
        recordRound();
        setPhase('song-results');
      }
    }
  }, [phase, isPlaying, currentTime, currentSegment, currentSegmentIndex, initialSegments.length, currentPlayerIndex, showTransition, recordRound]);

  // ── Random switch (rare mid-segment) ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !safeSettings.randomSwitches) return;
    const interval = setInterval(() => {
      if (Math.random() < 0.003) {
        const next = (currentPlayerIndex + 1 + Math.floor(Math.random() * (playersRef.current.length - 1))) % playersRef.current.length;
        playersRef.current[currentPlayerIndex].segmentsSung++;
        setCurrentPlayerIndex(next);
        showTransition(next);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, isPlaying, currentPlayerIndex, showTransition, safeSettings.randomSwitches]);

  // ── Mic handoff ──
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'transitioning') return;
    const player = playersRef.current[currentPlayerIndex];
    if (!player) return;
    if (player.micId && player.micId !== 'default') {
      switchMicrophone(player.micId).catch(() => {});
    }
  }, [currentPlayerIndex, phase, switchMicrophone]);

  // ── Medley mode: seek to snippet start when segment changes ──
  useEffect(() => {
    if (!isMedleyMode || !currentSnippet || phase !== 'playing') return;

    // Use requestAnimationFrame to ensure the new audio/video element (from key change)
    // has been committed to the DOM before we try to access it via refs.
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const canplaySafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const rafId = requestAnimationFrame(() => {
      const media = audioRef.current || (videoRef.current && !isYouTube ? videoRef.current : null);
      if (!media) {
        // Media element not ready yet — retry after a short delay
        const retryTimer = setTimeout(() => {
          if (unmountGuardRef.current) return;
          const m2 = audioRef.current || (videoRef.current && !isYouTube ? videoRef.current : null);
          if (m2 && isPlaying) {
            m2.currentTime = currentSnippet.startTime / 1000;
            m2.play().catch(() => {});
          }
        }, 200);
        retryTimerRef.current = retryTimer;
      }

      const seekAndPlay = () => {
        if (unmountGuardRef.current) return;
        media.currentTime = currentSnippet.startTime / 1000;
        if (isPlaying) {
          media.play().catch(() => {});
          // Also play background video (muted) when audio is a separate element
          if (media !== videoRef.current && videoRef.current && !isYouTube && videoRef.current.paused) {
            videoRef.current.currentTime = currentSnippet.startTime / 1000;
            videoRef.current.play().catch(() => {});
          }
        }
      };

      // If media is ready, seek immediately
      if (media.readyState >= 2) {
        seekAndPlay();
      } else {
        // Wait for canplay
        const onCanPlay = () => {
          if (unmountGuardRef.current) {
            media.removeEventListener('canplay', onCanPlay);
            return;
          }
          seekAndPlay();
          media.removeEventListener('canplay', onCanPlay);
        };
        media.addEventListener('canplay', onCanPlay);
        // Also clean up after timeout to avoid leaking listeners
        canplaySafetyTimerRef.current = setTimeout(() => {
          media.removeEventListener('canplay', onCanPlay);
        }, 5000);
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
      if (canplaySafetyTimerRef.current) { clearTimeout(canplaySafetyTimerRef.current); canplaySafetyTimerRef.current = null; }
    };
  }, [currentSegmentIndex, isMedleyMode, currentSnippet, phase, isPlaying, audioRef, videoRef, isYouTube]);

  // ── Start game (countdown → playing) ──

  const startGame = async () => {
    // Guard: ensure lyrics are available before starting
    const songToCheck = isMedleyMode && currentSnippet ? currentSnippet.song : effectiveSong;
    if (!songToCheck?.lyrics || songToCheck.lyrics.length === 0) {
      console.warn('[PTM] No lyrics loaded, attempting reload...');
      try {
        const { loadSongLyrics } = await import('@/lib/game/song-library');
        const lyrics = await loadSongLyrics(songToCheck);
        if (lyrics.length > 0 && songToCheck) {
          songToCheck.lyrics = lyrics;
          forceRender();
        }
      } catch { /* non-critical */ }
    }

    setPhase('countdown');
    setCountdown(3);
    // Use assigned mic if set and not default
    const micId = safeSettings.sharedMicId && safeSettings.sharedMicId !== 'default'
      ? safeSettings.sharedMicId
      : (safeSettings.micId && safeSettings.micId !== 'default' ? safeSettings.micId : undefined);

    try {
      // switchMicrophone handles stop → destroy → re-init → start
      await switchMicrophone(micId);
    } catch { /* pitch may fail in some envs */ }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          countdownIntervalRef.current = null;
          setPhase('playing');
          setIsPlaying(true);
          setCurrentTime(0);
          // In medley mode, seek to the first snippet's start time
          const seekTo = isMedleyMode && ptmMedleySnippets[0]
            ? ptmMedleySnippets[0].startTime / 1000
            : 0;

          // Use requestAnimationFrame to ensure media element is available
          // after any key-based re-mounting (medley mode changes audioSong.id)
          requestAnimationFrame(() => {
            if (audioRef.current) {
              audioRef.current.currentTime = seekTo;
              audioRef.current.play().catch(() => {});
              // Also play background video (muted) for visual effect when using separate audio
              if (videoRef.current && videoRef.current !== audioRef.current && !isYouTube && videoRef.current.paused) {
                videoRef.current.currentTime = seekTo;
                videoRef.current.play().catch(() => {});
              }
            } else if (videoRef.current && !isYouTube) {
              // Embedded audio: play the video element instead
              videoRef.current.currentTime = seekTo;
              videoRef.current.play().catch(() => {});
            } else {
              // Media element not ready yet — retry shortly
              console.warn('[PTM] No media element available at game start, retrying...');
              countdownRetryRef.current = setTimeout(() => {
                countdownRetryRef.current = null;
                if (unmountGuardRef.current) return; // component already unmounted
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

  // ── Continue series: reset per-song scores, pick next song based on selection mode ──
  const handleContinue = useCallback(() => {
    // Stop pitch detector BEFORE navigating to avoid unmount errors
    try { stop(); } catch { /* ignore */ }
    const resetPlayers = playersRef.current.map(p => ({
      ...p, score: 0, notesHit: 0, notesMissed: 0, combo: 0, maxCombo: 0, segmentsSung: 0,
    }));
    setPassTheMicPlayers(resetPlayers);
    setPassTheMicSegments([]);
    setPassTheMicSong(null);
    setGameMode('pass-the-mic');
    setIsSongPlaying(false);
    lastIsSongPlayingRef.current = false;
    // Navigate based on how the user originally chose their song:
    // - random → auto-pick next random song (handled in party-game-screens)
    // - vote → show vote overlay again
    // - medley → auto-generate new medley (handled in party-game-screens)
    // - library → go to library for manual selection
    const sel = ptmSongSelection || (isMedleyMode ? 'medley' : 'library');
    const targetScreen = sel === 'random' ? 'ptm-next-random'
      : sel === 'medley' ? 'ptm-next-medley'
      : sel === 'vote' ? 'song-voting'
      : 'library';
    // Defer navigation to avoid React unmount race condition
    setTimeout(() => onNavigate?.(targetScreen), 0);
  }, [ptmSongSelection, isMedleyMode, setPassTheMicPlayers, setPassTheMicSong, setPassTheMicSegments, setGameMode, onNavigate, setIsSongPlaying, stop]);

  // ── End series ──
  const handleEndSeries = useCallback(() => {
    setPhase('series-results');
  }, []);

  // ── End series completely: clean up ──
  const handleEndSeriesComplete = useCallback(() => {
    // Stop pitch detector BEFORE navigating to avoid unmount errors
    try { stop(); } catch { /* ignore */ }
    setPassTheMicPlayers([]);
    setPassTheMicSegments([]);
    setPassTheMicSettings(null);
    setPassTheMicSeriesHistory([]);
    setIsSongPlaying(false);
    lastIsSongPlayingRef.current = false;
    resetGame();
    // Defer navigation to avoid React unmount race condition
    setTimeout(() => {
      setPassTheMicSong(null);
      onNavigate?.('party-setup');
    }, 0);
  }, [setPassTheMicPlayers, setPassTheMicSong, setPassTheMicSegments, setPassTheMicSettings, setPassTheMicSeriesHistory, setIsSongPlaying, resetGame, onNavigate, stop]);

  // ── Continue with same players (after winner ceremony) ──
  const handleContinueWithPlayers = useCallback(() => {
    // Stop pitch detector BEFORE navigating to avoid unmount errors
    try { stop(); } catch { /* ignore */ }
    // Reset series history but keep players
    setPassTheMicSeriesHistory([]);
    setPassTheMicSegments([]);
    setGameMode('pass-the-mic');
    setIsSongPlaying(false);
    lastIsSongPlayingRef.current = false;
    // Navigate based on song selection mode (same as handleContinue)
    const sel = ptmSongSelection || 'library';
    const targetScreen = sel === 'random' ? 'ptm-next-random'
      : sel === 'medley' ? 'ptm-next-medley'
      : sel === 'vote' ? 'song-voting'
      : 'library';
    // Defer navigation to avoid React unmount race condition
    setTimeout(() => onNavigate?.(targetScreen), 0);
  }, [ptmSongSelection, setPassTheMicSeriesHistory, setPassTheMicSegments, setGameMode, onNavigate, setIsSongPlaying, stop]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      try { stop(); } catch { /* already stopped */ }
      // Clean up any active webcam streams
      activeWebcamStreamsRef.current.forEach(stream => {
        stream.getTracks().forEach(t => t.stop());
      });
      activeWebcamStreamsRef.current = [];
      // Remove any orphaned webcam video elements
      document.querySelectorAll('video[style*="z-index:100"]').forEach(el => el.remove());
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [stop]);

  // ── Handle ending the song early ──
  const handleEndSong = useCallback(() => {
    setIsPlaying(false);
    recordRound();
    setPhase('song-results');
  }, [recordRound]);

  // ===================== RENDER =====================

  // Guard: no song
  if (!effectiveSong) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-white/60 mb-4">No song loaded</p>
        <Button onClick={onEndGame}>Back</Button>
      </div>
    );
  }

  // ===================== INTRO PHASE =====================
  if (phase === 'intro') {
    return (
      <PtmIntroScreen
        currentPlayer={currentPlayer}
        isMedleyMode={isMedleyMode}
        medleySnippetCount={ptmMedleySnippets.length}
        safeSettings={safeSettings}
        seriesHistory={passTheMicSeriesHistory}
        mediaLoaded={mediaLoaded}
        startGame={startGame}
        audioSong={audioSong}
        isYouTube={isYouTube}
        audioRef={audioRef}
        videoRef={videoRef}
        playersCount={playersRef.current.length}
      />
    );
  }

  // ===================== SONG RESULTS PHASE =====================
  if (phase === 'song-results') {
    return (
      <PtmSongResults
        songTitle={isMedleyMode ? `Medley (${ptmMedleySnippets.length} Songs)` : effectiveSong.title}
        songArtist={isMedleyMode ? '' : effectiveSong.artist}
        playerScores={playersRef.current.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          color: p.color,
          score: p.score,
          notesHit: p.notesHit,
          notesMissed: p.notesMissed,
          combo: p.combo,
          maxCombo: p.maxCombo,
          segmentsSung: p.segmentsSung,
        }))}
        seriesHistory={passTheMicSeriesHistory}
        roundNumber={passTheMicSeriesHistory.length + 1}
        onNextSong={handleContinue}
        onEndSeries={handleEndSeries}
      />
    );
  }

  // ===================== SERIES RESULTS PHASE =====================
  if (phase === 'series-results') {
    return (
      <PtmSeriesResults
        seriesHistory={passTheMicSeriesHistory}
        players={playersRef.current.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          color: p.color,
        }))}
        onContinue={handleContinueWithPlayers}
        onBackToSetup={handleEndSeriesComplete}
      />
    );
  }

  // ===================== FULLSCREEN GAMEPLAY =====================
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      {/* Audio Element */}
      {audioSong?.audioUrl && (
        <audio
          key={audioSong.id}
          ref={audioRef}
          src={audioSong.audioUrl}
          className="hidden"
          onEnded={() => {
            if (phase === 'playing' || phase === 'transitioning') {
              setIsPlaying(false);
              recordRound();
              setPhase('song-results');
            }
          }}
          preload="auto"
        />
      )}

      {/* Hidden Video Element for embedded audio (fallback when no separate audio) */}
      {!audioSong?.audioUrl && audioSong?.videoBackground && !isYouTube && (
        <video
          key={`video-${audioSong.id}`}
          ref={videoRef}
          src={audioSong.videoBackground}
          className="hidden"
          muted={false}
          playsInline
          onEnded={() => {
            if (phase === 'playing' || phase === 'transitioning') {
              setIsPlaying(false);
              recordRound();
              setPhase('song-results');
            }
          }}
          preload="auto"
        />
      )}

      {/* Game Area - Full Screen */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Background */}
        <GameBackground
          effectiveSong={audioSong}
          showBackgroundVideo={showBackgroundVideo}
          useAnimatedBackground={useAnimatedBackground}
          isYouTube={isYouTube}
          youtubeVideoId={youtubeVideoId}
          useYouTubeAudio={useYouTubeAudio}
          isPlaying={isPlaying}
          isAdPlaying={isAdPlaying}
          songEnergy={songEnergy}
          volume={0.8}
          videoRef={videoRef}
          onYoutubeTimeUpdate={setYoutubeTime}
          onAdStart={handleAdStart}
          onAdEnd={handleAdEnd}
          onVideoEnded={() => {
            if (phase === 'playing' || phase === 'transitioning') {
              setIsPlaying(false);
              recordRound();
              setPhase('song-results');
            }
          }}
          onVideoCanPlay={() => { videoLoadedRef.current = true; }}
          onYoutubeError={() => {}}
        />

        {/* Dark Overlay for visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 z-5" />

        {/* Countdown */}
        {phase === 'countdown' && (
          <GameCountdown countdown={countdown} />
        )}

        {/* Note Highway — single lane with current player color */}
        {(phase === 'playing' || phase === 'transitioning') && allNotes.length > 0 && (
          <NoteHighway
            visibleNotes={visibleNotes}
            currentTime={currentTime}
            pitchStats={pitchStats}
            detectedPitch={smoothedPitch}
            noteShapeStyle={noteShapeStyle}
            noteDisplayStyle={noteDisplayStyle as 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'}
            notePerformance={undefined}
            singLinePosition={20}
            noteWindow={NOTE_WINDOW}
            playerColor={currentPlayer?.color || PLAYER_COLORS[0]}
            showPlayerLabel={false}
            visibleTop={VISIBLE_TOP}
            visibleRange={VISIBLE_RANGE}
          />
        )}

        {/* Lyrics Display */}
        {(phase === 'playing' || phase === 'transitioning') && sortedLines.length > 0 && (
          <SinglePlayerLyrics
            sortedLines={sortedLines}
            currentTime={currentTime}
            playerColor={currentPlayer?.color || PLAYER_COLORS[0]}
            noteDisplayStyle={noteDisplayStyle as 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'}
            notePerformance={undefined}
            gameMode="pass-the-mic"
          />
        )}
      </div>

      {/* ═══════ PTM HUD OVERLAYS ═══════ */}

      {/* Player score (top-left) */}
      {(phase === 'playing' || phase === 'transitioning') && (
        <PtmHudPlayerScore
          players={playersRef.current}
          currentPlayer={currentPlayer}
        />
      )}

      {/* Controls (top-right) */}
      {phase === 'playing' && (
        <PtmHudControls
          safeSettings={safeSettings}
          onPause={onPause}
          activeWebcamStreamsRef={activeWebcamStreamsRef}
          onEndSong={handleEndSong}
        />
      )}

      {/* Player Ranking — vertikal links, sortiert nach Score (active player oben) */}
      {(phase === 'playing' || phase === 'transitioning') && (
        <PtmPlayerRanking
          players={playersRef.current}
          currentPlayerIndex={currentPlayerIndex}
        />
      )}

      {/* Progress Bar (bottom) */}
      <GameProgressBar currentTime={currentTime} duration={displayDuration} />
      <TimeDisplay currentTime={currentTime} duration={displayDuration} />

      {/* ═══════ TRANSITION OVERLAY ═══════ */}
      <PtmTransitionOverlay
        visible={transitionVisible}
        nextPlayer={transitionNextPlayer}
        segmentLabel={`Segment ${currentSegmentIndex + 2}/${initialSegments.length}`}
        onComplete={completeTransition}
        onSkip={completeTransition}
      />
    </div>
  );
}
