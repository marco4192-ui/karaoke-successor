'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Song, PLAYER_COLORS, LyricLine, Difficulty } from '@/types/game';
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
import { getCurrentWindow } from '@tauri-apps/api/window';

// Re-export types from pass-the-mic-screen for backward compatibility
export type { PassTheMicPlayer, PassTheMicSegment } from '@/components/game/pass-the-mic-screen';

// ===================== TYPES =====================

interface PtmPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
  notesHit: number;
  notesMissed: number;
  combo: number;
  maxCombo: number;
  isActive: boolean;
  segmentsSung: number;
  micId?: string;
}

interface PtmSegment {
  startTime: number;
  endTime: number;
  playerId: string | null;
}

export interface PassTheMicSettings {
  segmentDuration: number;
  difficulty: Difficulty;
  micId: string;
  micName: string;
  randomSwitches?: boolean;
  sharedMicId?: string | null;
  sharedMicName?: string | null;
}

type GamePhase = 'intro' | 'countdown' | 'playing' | 'transitioning' | 'song-results' | 'series-results';

const DEFAULT_SETTINGS: PassTheMicSettings = {
  segmentDuration: 30,
  difficulty: 'medium',
  micId: 'default',
  micName: 'Standard',
};

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
  useMobileGameSync(effectiveSong, isPlaying && phase === 'playing', 'pass-the-mic', phase === 'results');

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
    return () => {
      setIsSongPlaying(false);
      lastIsSongPlayingRef.current = false;
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

    const notes: any[] = [];
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
    const interval = setInterval(scoreCurrentPlayer, 80);
    return () => clearInterval(interval);
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
  useEffect(() => {
    if (!isPlaying || phase !== 'playing') { setSongEnergy(0); return; }
    const interval = setInterval(() => {
      // Simple energy approximation based on note density
      const nearbyNotes = allNotes.filter(n =>
        Math.abs(n.startTime - currentTime) < 2000
      ).length;
      setSongEnergy(Math.min(1, nearbyNotes / 5));
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying, phase, currentTime, allNotes]);

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
  }, [phase, isPlaying, currentTime, currentSegment, currentSegmentIndex, initialSegments.length, currentPlayerIndex, showTransition]);

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
    const rafId = requestAnimationFrame(() => {
      const media = audioRef.current || (videoRef.current && !isYouTube ? videoRef.current : null);
      if (!media) {
        // Media element not ready yet — retry after a short delay
        const retryTimer = setTimeout(() => {
          const m2 = audioRef.current || (videoRef.current && !isYouTube ? videoRef.current : null);
          if (m2 && isPlaying) {
            m2.currentTime = currentSnippet.startTime / 1000;
            m2.play().catch(() => {});
          }
        }, 200);
        return () => clearTimeout(retryTimer);
      }

      const seekAndPlay = () => {
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
          seekAndPlay();
          media.removeEventListener('canplay', onCanPlay);
        };
        media.addEventListener('canplay', onCanPlay);
        // Also clean up after timeout to avoid leaking listeners
        const timeout = setTimeout(() => {
          media.removeEventListener('canplay', onCanPlay);
        }, 5000);
        // Note: we can't easily clean up both in the effect cleanup since
        // we're inside rAF. The timeout provides a safety net.
      }
    });

    return () => cancelAnimationFrame(rafId);
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
              audioRef.current.play().catch(e => console.warn('[PTM] Audio play failed:', e));
              // Also play background video (muted) for visual effect when using separate audio
              if (videoRef.current && videoRef.current !== audioRef.current && !isYouTube && videoRef.current.paused) {
                videoRef.current.currentTime = seekTo;
                videoRef.current.play().catch(() => {});
              }
            } else if (videoRef.current && !isYouTube) {
              // Embedded audio: play the video element instead
              videoRef.current.currentTime = seekTo;
              videoRef.current.play().catch(e => console.warn('[PTM] Video play failed:', e));
            } else {
              // Media element not ready yet — retry shortly
              console.warn('[PTM] No media element available at game start, retrying...');
              setTimeout(() => {
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
  };

  // ── Helpers ──
  const progress = effectiveSong?.duration > 0 ? (currentTime / effectiveSong.duration) * 100 : 0;
  const segmentTimeLeft = currentSegment
    ? Math.max(0, (currentSegment.endTime - currentTime) / 1000)
    : 0;
  const segmentProgress = currentSegment
    ? ((currentTime - currentSegment.startTime) / (currentSegment.endTime - currentSegment.startTime)) * 100
    : 0;

  // ── Record round ──
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
    };
  }, [stop]);

  // ── Get current lyrics line ──
  const getCurrentLyrics = (): LyricLine | null => {
    if (!notesSource?.lyrics || notesSource.lyrics.length === 0) return null;
    return notesSource.lyrics.find((line, i) => {
      const next = notesSource.lyrics[i + 1];
      return currentTime >= line.startTime && (!next || currentTime < next.startTime);
    }) || null;
  };

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
      <div className="max-w-6xl mx-auto">
        {/* Hidden audio/video elements — must be in DOM during intro so refs
            are populated before startGame fires. Without these, audioRef.current
            is null when the countdown reaches zero, causing
            "No media element available at game start". */}
        {audioSong?.audioUrl && (
          <audio
            key={audioSong.id}
            ref={audioRef}
            src={audioSong.audioUrl}
            className="hidden"
            preload="auto"
          />
        )}
        {!audioSong?.audioUrl && audioSong?.videoBackground && !isYouTube && (
          <video
            key={`video-${audioSong.id}`}
            ref={videoRef}
            src={audioSong.videoBackground}
            className="hidden"
            muted={false}
            playsInline
            preload="auto"
          />
        )}
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-5xl mb-6">🎤</div>
          <h2 className="text-2xl font-bold mb-2">Pass the Mic</h2>
          <p className="text-white/60 mb-8">{isMedleyMode ? `🎵 Medley — ${ptmMedleySnippets.length} Songs` : `${effectiveSong.title} — ${effectiveSong.artist}`}</p>

          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl max-w-md w-full mb-6 p-8 text-center">
            <div className="text-sm text-white/60 mb-2">STARTSPIELER</div>
            <div className="flex items-center justify-center gap-4 mb-4">
              {currentPlayer?.avatar ? (
                <img src={currentPlayer.avatar} alt={currentPlayer.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-cyan-500" />
              ) : (
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-cyan-500 text-white"
                  style={{ backgroundColor: currentPlayer?.color }}>
                  {currentPlayer?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-3xl font-bold">{currentPlayer?.name}</span>
            </div>
            <div className="text-sm text-white/40">
              {playersRef.current.length} Spieler{isMedleyMode ? ` - ${ptmMedleySnippets.length} Snippets` : ` - ${safeSettings.segmentDuration}s Segmente`}
              {safeSettings.sharedMicName && (
                <span> - 🎤 {safeSettings.sharedMicName}</span>
              )}
              {passTheMicSeriesHistory.length > 0 && (
                <span> - Runde {passTheMicSeriesHistory.length + 1}</span>
              )}
            </div>
          </div>

          {!mediaLoaded && (
            <div className="mb-4 text-center">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
              <p className="text-white/40 text-sm mt-2">Lied wird geladen...</p>
            </div>
          )}
          <Button onClick={startGame} disabled={!mediaLoaded}
            className="px-12 py-4 text-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50">
            🎤 Singen starten!
          </Button>
        </div>
      </div>
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
            noteDisplayStyle={noteDisplayStyle as any}
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
            noteDisplayStyle={noteDisplayStyle as any}
            notePerformance={undefined}
            gameMode="pass-the-mic"
          />
        )}
      </div>

      {/* ═══════ PTM HUD OVERLAYS ═══════ */}

      {/* 8.1 Team-Score Mitte-Links | 8.2 Spieler-Score Links größer */}
      {(phase === 'playing' || phase === 'transitioning') && (
        <div className="absolute top-4 left-4 z-20">
          {/* Team total score (small, center-left) */}
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10 mb-2 text-center w-32">
            <div className="text-[10px] text-white/40 uppercase tracking-wider">Team-Score</div>
            <div className="text-lg font-bold text-cyan-400">
              {playersRef.current.reduce((sum, p) => sum + p.score, 0).toLocaleString()}
            </div>
          </div>

          {/* Active player score (larger, left side) */}
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10 w-40">
            {currentPlayer?.avatar ? (
              <img
                src={currentPlayer.avatar}
                alt={currentPlayer.name}
                className="w-12 h-12 rounded-full object-cover border-2 mb-2"
                style={{ borderColor: currentPlayer.color }}
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold border-2 text-xl mb-2"
                style={{ backgroundColor: currentPlayer?.color, borderColor: currentPlayer?.color }}
              >
                {currentPlayer?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-[10px] text-white/50 uppercase tracking-wider">Jetzt singt</div>
            <div className="text-base font-bold truncate" style={{ color: currentPlayer?.color }}>
              {currentPlayer?.name}
            </div>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {currentPlayer?.score.toLocaleString()}
            </div>
            {currentPlayer && currentPlayer.combo > 0 && (
              <div className="text-xs text-amber-400 font-medium">🔥 {currentPlayer.combo}x Combo</div>
            )}
          </div>
        </div>
      )}

      {/* Pause | Vollbild + Schwierigkeit | Kamera | Song beenden */}
      {phase === 'playing' && (
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {/* Difficulty badge */}
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0.5 border-white/20 ${
                safeSettings.difficulty === 'easy' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                safeSettings.difficulty === 'hard' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
              }`}
            >
              {safeSettings.difficulty === 'easy' ? 'Leicht' : safeSettings.difficulty === 'hard' ? 'Schwer' : 'Mittel'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            onClick={() => onPause?.()}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg w-10 h-10 p-0"
            title="Pause"
          >
            ⏸
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              // Tauri uses its own Window API for fullscreen (DOM fullscreen API
              // does not work reliably inside Tauri webviews)
              const win = getCurrentWindow();
              win.isFullscreen().then(isFs => {
                win.setFullscreen(!isFs).catch(() => {});
              }).catch(() => {});
            }}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg w-10 h-10 p-0"
            title="Vollbild"
          >
            ⛶
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              // Toggle camera/webcam if available
              navigator.mediaDevices?.getUserMedia({ video: true })
                .then(stream => {
                  activeWebcamStreamsRef.current.push(stream);
                  const video = document.createElement('video');
                  video.srcObject = stream;
                  video.style.cssText = 'position:fixed;bottom:80px;right:16px;width:200px;border-radius:12px;z-index:100;border:2px solid rgba(255,255,255,0.3);';
                  document.body.appendChild(video);
                  video.play();
                  // Click to close
                  video.addEventListener('click', () => {
                    stream.getTracks().forEach(t => t.stop());
                    activeWebcamStreamsRef.current = activeWebcamStreamsRef.current.filter(s => s !== stream);
                    video.remove();
                  });
                })
                .catch(() => {});
            }}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg w-10 h-10 p-0"
            title="Kamera"
          >
            📷
          </Button>
          {/* Stop button */}
          <Button
            onClick={() => {
              setIsPlaying(false);
              recordRound();
              setPhase('song-results');
            }}
            variant="ghost"
            size="sm"
            className="text-white/30 hover:text-red-400 text-xs"
            title="Song beenden"
          >
            ⏹ Beenden
          </Button>
        </div>
      )}

      {/* Gesangsindikator entfernt — Pitch-Status ist im Note-Highway sichtbar */}

      {/* Player Ranking — vertikal links, sortiert nach Score (active player oben) */}
      {(phase === 'playing' || phase === 'transitioning') && (() => {
        const ranked = [...playersRef.current]
          .map((p, i) => ({ ...p, originalIndex: i }))
          .sort((a, b) => b.score - a.score);
        return (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
            <div className="flex flex-col gap-1.5">
              {ranked.map((player, rank) => {
                const isActive = player.originalIndex === currentPlayerIndex;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-white/15 border border-white/20 scale-105'
                        : 'bg-black/40 border border-white/5'
                    }`}
                    style={isActive ? { borderColor: `${player.color}50` } : {}}
                  >
                    {/* Rank number */}
                    <span className={`text-[10px] font-bold w-4 text-center ${
                      rank === 0 ? 'text-yellow-400' : 'text-white/30'
                    }`}>
                      {rank + 1}
                    </span>
                    {/* Avatar */}
                    {player.avatar ? (
                      <img src={player.avatar} alt={player.name} className={`w-7 h-7 rounded-full object-cover ${isActive ? 'border-2' : 'border border-white/20'}`} style={isActive ? { borderColor: player.color } : {}} />
                    ) : (
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${isActive ? 'border-2' : 'border border-white/20'}`}
                        style={{ backgroundColor: `${player.color}80`, borderColor: isActive ? player.color : undefined }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs font-medium truncate max-w-[80px] ${isActive ? 'text-white' : 'text-white/50'}`}>
                        {player.name}
                      </span>
                      <span className={`text-[10px] ${isActive ? 'text-cyan-400 font-semibold' : 'text-white/25'}`}>
                        {player.score.toLocaleString()} pts
                      </span>
                    </div>
                    {/* Combo for active player */}
                    {isActive && player.combo > 1 && (
                      <span className="text-[10px] text-amber-400 font-medium ml-auto">
                        {player.combo}x
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Progress Bar (bottom) */}
      <GameProgressBar currentTime={currentTime} duration={displayDuration} />
      <TimeDisplay currentTime={currentTime} duration={displayDuration} />

      {/* End Song Early — moved to top-right button stack */}

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
