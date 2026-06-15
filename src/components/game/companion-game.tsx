'use client';

/**
 * Companion Sing-A-Long — Game View
 *
 * Core game logic: audio, pitch detection, turn switching, scoring,
 * and all game-phase rendering (intro, countdown, playing, switching, song-results).
 *
 * Uses useGameMedia for proper URL restoration (Tauri compatibility),
 * GameBackground for video/animated backgrounds, NoteHighway for note display,
 * and SinglePlayerLyrics for lyric rendering — matching the quality level
 * of CPTM and PTM game modes.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PauseButton } from '@/components/game/hud/pause-button';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';
import { GameBackground } from '@/components/game/game-background';
import { NoteHighway } from '@/components/game/note-highway';
import { SinglePlayerLyrics } from '@/components/game/single-player-lyrics';
import { GameCountdown } from '@/components/game/game-countdown';
import { GameProgressBar, TimeDisplay } from '@/components/game/game-hud';
import { Song, LyricLine, Note, EMPTY_PLAYER_SCORE, PLAYER_COLORS } from '@/types/game';
import { usePartyStore } from '@/lib/game/party-store';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { useGameMedia } from '@/hooks/use-game-media';
import { useGameSettings } from '@/hooks/use-game-settings';
import { useMobileGameSync } from '@/hooks/use-mobile-game-sync';
import { useTranslation } from '@/lib/i18n/translations';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { findActiveNote, shouldSkipPitch, evaluateAndScoreTick } from '@/lib/game/party-scoring';
import { getVisibleNotes, calculatePitchStats, NOTE_WINDOW, VISIBLE_TOP, VISIBLE_RANGE } from '@/lib/game/note-utils';
import type { CompanionPlayer, CompanionSingAlongSettings, GamePhase, CompanionRoundResult } from './companion-types';
import { DEFAULT_SETTINGS, randomTurnDuration } from './companion-types';
import { CompanionSeriesResults } from './companion-series-results';

// ===================== GAME VIEW =====================

interface CompanionGameViewProps {
  players: CompanionPlayer[];
  song: Song;
  settings: CompanionSingAlongSettings;
  onEndGame: () => void;
  onNavigate?: (_screen: string) => void;
}

export function CompanionGameView({
  players: initialPlayers, song, settings, onEndGame, onNavigate,
}: CompanionGameViewProps) {
  const { t } = useTranslation();
  const safeSettings: CompanionSingAlongSettings = settings ?? DEFAULT_SETTINGS;

  // ── Store selectors ──
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const setCompanionSeriesHistory = usePartyStore(s => s.setCompanionSeriesHistory);
  const companionSeriesHistory = usePartyStore(s => s.companionSeriesHistory);
  const setCompanionPlayers = usePartyStore(s => s.setCompanionPlayers);

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

  // ── Phase management ──
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [countdown, setCountdown] = useState(3);

  // ── Playback state ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(currentTime);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

  // ── Player state (local, mutable for performance) ──
  const playersRef = useRef<CompanionPlayer[]>(
    initialPlayers.map(p => ({ ...p, ...EMPTY_PLAYER_SCORE, turnCount: 0 }))
  );
  const [playersSnapshot, setPlayersSnapshot] = useState<CompanionPlayer[]>(() =>
    initialPlayers.map(p => ({ ...p, ...EMPTY_PLAYER_SCORE, turnCount: 0 }))
  );
  const [, rerender] = useState(0);
  const forceRender = useCallback(() => {
    setPlayersSnapshot([...playersRef.current]);
    rerender(n => n + 1);
  }, []);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const currentPlayer = playersSnapshot[currentPlayerIndex];

  // ── End Song Early confirmation ──
  const [pendingEndSong, setPendingEndSong] = useState(false);
  const pendingEndSongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestEndSong = useCallback(() => {
    setPendingEndSong(true);
    if (pendingEndSongTimerRef.current) clearTimeout(pendingEndSongTimerRef.current);
    pendingEndSongTimerRef.current = setTimeout(() => {
      setPendingEndSong(false);
      pendingEndSongTimerRef.current = null;
    }, 3000);
  }, []);

  const cancelEndSong = useCallback(() => {
    if (pendingEndSongTimerRef.current) clearTimeout(pendingEndSongTimerRef.current);
    setPendingEndSong(false);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingEndSongTimerRef.current) clearTimeout(pendingEndSongTimerRef.current);
    };
  }, []);

  // ── Switch timer ──
  const [initialTurnDuration] = useState(() => randomTurnDuration(safeSettings));
  const timeUntilSwitchRef = useRef(initialTurnDuration);
  const [timeUntilSwitchDisplay, setTimeUntilSwitchDisplay] = useState(initialTurnDuration);
  const [timeUntilSwitchTotal, setTimeUntilSwitchTotal] = useState(initialTurnDuration);
  const switchCountdownRef = useRef<number | null>(null);
  const [switchCountdown, setSwitchCountdown] = useState<number | null>(null);
  const nextPlayerIndexRef = useRef<number>(0);

  // ── Pitch detection (local mic — each player takes turns with the same mic) ──
  const { pitchResult, initialize, start, stop } = usePitchDetector();

  // ── Song playing status for Escape handler ──
  const lastIsSongPlayingRef = useRef(false);
  useEffect(() => {
    const newVal = isPlaying && (phase === 'playing' || phase === 'switching');
    if (lastIsSongPlayingRef.current !== newVal) {
      lastIsSongPlayingRef.current = newVal;
      setIsSongPlaying(newVal);
    }
  }, [isPlaying, phase, setIsSongPlaying]);

  // ── Pause / Resume sync with pause dialog ──
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
      else if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
    } else if (pauseDialogAction === null && isPlaying && (phase === 'playing' || phase === 'switching')) {
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => {});
      else if (videoRef.current && videoRef.current.paused) videoRef.current.play().catch(() => {});
    }
  }, [pauseDialogAction, isPlaying, phase, audioRef, videoRef]);

  // ── Mobile game sync ──
  useMobileGameSync(
    effectiveSong,
    isPlaying && (phase === 'playing' || phase === 'switching'),
    'companion-singalong',
    phase === 'song-results' || phase === 'series-results',
  );

  // ── Send singalong turn info + scores to companion apps via server ──
  const sendSingalongTurn = useCallback(async (profileId: string | null, nextProfileId: string | null, countdown: number | null) => {
    try {
      const companionScores = playersRef.current.map(p => ({
        profileId: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        score: p.score,
      }));
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'gamestate',
          payload: {
            singalongTurn: {
              profileId,
              nextProfileId,
              countdown,
              isActive: true,
            },
            companionScores,
          },
        }),
      });
    } catch { /* ignore — companion is optional for the main screen */ }
  }, []);

  // ── Clear singalong turn and scores on unmount ──
  useEffect(() => {
    return () => {
      fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'gamestate', payload: { singalongTurn: null, companionScores: null } }),
      }).catch(() => {});
      // NOTE: stop() is called in the dedicated cleanup useEffect below; not duplicated here (CP-M3).
    };
  }, [stop]);

  // ── Pre-compute note data for highway and lyrics ──
  const { allNotes, sortedLines, scoringMeta, pitchStats } = useMemo(() => {
    if (!effectiveSong?.lyrics?.length) {
      return {
        allNotes: [],
        sortedLines: [],
        scoringMeta: null,
        pitchStats: { minPitch: 40, maxPitch: 80, pitchRange: 40 },
      };
    }

    const notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    const lines = [...effectiveSong.lyrics].sort((a, b) => a.startTime - b.startTime);

    lines.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        notes.push({ ...note, lineIndex, line });
      });
    });
    notes.sort((a, b) => a.startTime - b.startTime);

    const bd = effectiveSong.bpm ? 15000 / effectiveSong.bpm : 500;
    const meta = calculateScoringMetadata(notes, bd);
    const stats = calculatePitchStats(notes);

    return { allNotes: notes, sortedLines: lines, scoringMeta: meta, pitchStats: stats };
  }, [effectiveSong]);

  const visibleNotes = useMemo(
    () => getVisibleNotes(allNotes, currentTime, NOTE_WINDOW),
    [currentTime, allNotes]
  );

  // ── Display duration ──
  const displayDuration = useMemo(() => {
    if (!effectiveSong) return 0;
    if (effectiveSong.end) return effectiveSong.end;
    return effectiveSong.duration;
  }, [effectiveSong]);

  // ── Scoring tick tracking ──
  const lastEvalTimeRef = useRef(0);
  const lastActiveNoteStartRef = useRef<number | null>(null);
  const lastNoteWasHitRef = useRef(false);

  // ── Score the active player based on pitch ──
  const scoreCurrentPlayer = useCallback(() => {
    if (!pitchResult) return;
    if (shouldSkipPitch(pitchResult, safeSettings.difficulty)) return;

    const ct = currentTimeRef.current;
    const activeNote = findActiveNote(effectiveSong?.lyrics, ct);
    if (!activeNote) return;

    if (ct - lastEvalTimeRef.current < 250) return;
    lastEvalTimeRef.current = ct;

    if (pitchResult.note == null) return;

    const tick = evaluateAndScoreTick(pitchResult.note, activeNote, safeSettings.difficulty, scoringMeta);
    const p = playersRef.current[currentPlayerIndex];
    const idx = currentPlayerIndex;

    // Track note transitions for per-note hit/miss counting
    const noteStart = activeNote.startTime;
    if (noteStart !== lastActiveNoteStartRef.current) {
      if (lastActiveNoteStartRef.current !== null) {
        if (lastNoteWasHitRef.current) {
          p.notesHit++;
        } else {
          p.notesMissed++;
        }
      }
      lastActiveNoteStartRef.current = noteStart;
      lastNoteWasHitRef.current = false;
    }

    if (tick.hit) {
      p.score += tick.points;
      p.combo++;
      if (p.combo > p.maxCombo) p.maxCombo = p.combo;
      lastNoteWasHitRef.current = true;
    } else {
      p.combo = 0;
    }

    playersRef.current[idx] = { ...p };
    forceRender();
  }, [pitchResult, effectiveSong, safeSettings.difficulty, currentPlayerIndex, scoringMeta, forceRender]);

  // ── Game loop: score during playing ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) return;
    const interval = setInterval(scoreCurrentPlayer, 80);
    return () => clearInterval(interval);
  }, [phase, isPlaying, scoreCurrentPlayer]);

  // ── Turn timer: count down and trigger switch via companion app ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) return;

    const interval = setInterval(() => {
      timeUntilSwitchRef.current -= 100;
      setTimeUntilSwitchDisplay(timeUntilSwitchRef.current);

      // When time is up, trigger switch
      if (timeUntilSwitchRef.current <= 0) {
        const currentP = playersRef.current[currentPlayerIndex];
        currentP.turnCount++;
        playersRef.current[currentPlayerIndex] = { ...currentP };
        setPlayersSnapshot([...playersRef.current]);

        // Pick next player (round-robin)
        const nextIdx = (currentPlayerIndex + 1) % playersRef.current.length;
        nextPlayerIndexRef.current = nextIdx;

        // Start switching phase: send countdown 3, 2, 1 to companion app
        setPhase('switching');
        switchCountdownRef.current = 3;
        setSwitchCountdown(3);

        // Send countdown to companion apps
        sendSingalongTurn(playersRef.current[nextIdx].id, null, 3);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [phase, isPlaying, currentPlayerIndex, sendSingalongTurn]);

  // ── Switching countdown: 3, 2, 1 → activate next player ──
  useEffect(() => {
    if (phase !== 'switching' || switchCountdown === null) return;

    if (switchCountdown <= 0) {
      // Reset scoring refs so stale note state doesn't bleed into the next player (CP-M1)
      lastActiveNoteStartRef.current = null;
      lastNoteWasHitRef.current = false;
      lastEvalTimeRef.current = 0;

      // Activate the next player
      setCurrentPlayerIndex(nextPlayerIndexRef.current);
      timeUntilSwitchRef.current = randomTurnDuration(safeSettings);
      const newDuration = timeUntilSwitchRef.current;
      setTimeUntilSwitchDisplay(newDuration);
      setTimeUntilSwitchTotal(newDuration);
      switchCountdownRef.current = null;
      setSwitchCountdown(null);
      setPhase('playing');

      // Notify companion: active player, no countdown
      sendSingalongTurn(playersRef.current[nextPlayerIndexRef.current].id, null, null);
      forceRender();
      return;
    }

    // Update companion with current countdown
    sendSingalongTurn(playersRef.current[nextPlayerIndexRef.current].id, null, switchCountdown);

    const timer = setTimeout(() => {
      switchCountdownRef.current = (switchCountdownRef.current ?? 1) - 1;
      setSwitchCountdown(switchCountdownRef.current);
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, switchCountdown, sendSingalongTurn, safeSettings, forceRender]);

  // ── RAF-based time tracking (smooth ~40fps) ──
  const lastCurrentTimeUpdateRef = useRef(0);

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'switching') return;
    if (!isPlaying) return;
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

  // ── Helpers ──
  const progress = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0;
  const turnSecondsLeft = Math.max(0, timeUntilSwitchDisplay / 1000);
  const turnProgress = timeUntilSwitchTotal > 0
    ? ((timeUntilSwitchTotal - timeUntilSwitchDisplay) / timeUntilSwitchTotal) * 100
    : 0;

  // ── Record this round to series history ──
  const roundRecordedRef = useRef(false);
  const recordRound = useCallback(() => {
    if (roundRecordedRef.current) return;
    roundRecordedRef.current = true;
    const round: CompanionRoundResult = {
      songTitle: song.title,
      songArtist: song.artist,
      playedAt: Date.now(),
      playerScores: {},
    };
    for (const p of playersRef.current) {
      round.playerScores[p.id] = {
        score: p.score, notesHit: p.notesHit,
        notesMissed: p.notesMissed, maxCombo: p.maxCombo,
      };
    }
    setCompanionSeriesHistory([...companionSeriesHistory, round]);
  }, [song, companionSeriesHistory, setCompanionSeriesHistory]);

  // ── Confirm end song early (after recordRound is defined) ──
  const confirmEndSong = useCallback(() => {
    if (pendingEndSongTimerRef.current) clearTimeout(pendingEndSongTimerRef.current);
    setPendingEndSong(false);
    audioRef.current?.pause();
    videoRef.current?.pause();
    setIsPlaying(false);
    recordRound();
    setPlayersSnapshot([...playersRef.current]);
    setPhase('song-results');
    sendSingalongTurn(null, null, null);
  }, [recordRound, audioRef, videoRef, sendSingalongTurn]);

  // ── Handle media ended naturally ──
  const handleMediaEnded = useCallback(() => {
    if (phase === 'playing' || phase === 'switching') {
      audioRef.current?.pause();
      videoRef.current?.pause();
      setIsPlaying(false);
      recordRound();
      setPlayersSnapshot([...playersRef.current]);
      setPhase('song-results');
      sendSingalongTurn(null, null, null);
    }
  }, [phase, recordRound, audioRef, videoRef, sendSingalongTurn]);

  // ── Continue series: navigate to library for next song ──
  const handleContinue = useCallback(() => {
    const resetPlayers = playersRef.current.map(p => ({
      ...p, ...EMPTY_PLAYER_SCORE, turnCount: 0,
    }));
    setCompanionPlayers(resetPlayers);
    // Navigate to library — the library's onSelectSong handler will
    // detect companion-singalong mode with existing players and
    // route directly to companion-singalong-game.
    onNavigate?.('library');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setCompanionPlayers stable; onNavigate intentionally excluded
  }, [setCompanionPlayers, onNavigate]);

  // ── End series ──
  const handleEndSeries = useCallback(() => {
    setPhase('series-results');
  }, []);

  // ── Start game (countdown → playing) ──
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unmountGuardRef = useRef(false);

  const startGame = async () => {
    setPhase('countdown');
    setCountdown(3);
    try { await initialize(); start(); } catch { /* pitch may fail */ }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          countdownIntervalRef.current = null;
          setPhase('playing');
          setIsPlaying(true);
          setCurrentTime(0);
          timeUntilSwitchRef.current = randomTurnDuration(safeSettings);
          const newSwitchDuration = timeUntilSwitchRef.current;
          setTimeUntilSwitchDisplay(newSwitchDuration);
          setTimeUntilSwitchTotal(newSwitchDuration);

          // Notify companion: first player is active
          sendSingalongTurn(playersRef.current[0].id, null, null);

          // Start playback in next frame to avoid race with pause/resume effect
          requestAnimationFrame(() => {
            if (unmountGuardRef.current) return;
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(e => {
                // eslint-disable-next-line no-console
                console.warn('[CompanionSingAlong] Audio play failed:', e);
              });
              if (videoRef.current && videoRef.current !== audioRef.current && videoRef.current.paused) {
                videoRef.current.currentTime = 0;
                videoRef.current.play().catch(() => {});
              }
            } else if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.play().catch(e => {
                // eslint-disable-next-line no-console
                console.warn('[CompanionSingAlong] Video play failed:', e);
              });
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
    } else if (phase === 'playing' || phase === 'switching') {
      setIsPlaying(true);
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => {});
      if (videoRef.current && videoRef.current.paused) videoRef.current.play().catch(() => {});
    }
  }, [isPlaying, phase, audioRef, videoRef, setIsSongPlaying]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    unmountGuardRef.current = false;
    return () => {
      unmountGuardRef.current = true;
      stop();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (pendingEndSongTimerRef.current) {
        clearTimeout(pendingEndSongTimerRef.current);
      }
      setIsSongPlaying(false);
      lastIsSongPlayingRef.current = false;
    };
  }, [stop, setIsSongPlaying]);

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════

  // ── Guard: no effective song ──
  if (!effectiveSong) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-white/60 mb-4">{t('gameScreen.noSongLoaded')}</p>
        <Button onClick={onEndGame}>{t('common.back')}</Button>
      </div>
    );
  }

  // ===================== INTRO PHASE =====================
  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 via-black to-zinc-900 px-4">
        <div className="flex flex-col items-center max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
          {/* Companion Sing-Along Icon */}
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-6 shadow-2xl">
            <span className="text-5xl">📱</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 text-center">
            {t('companion.singAlongTitle')}
          </h1>
          <p className="text-white/40 text-sm mb-8 text-center">
            {effectiveSong.title} — {effectiveSong.artist}
          </p>

          {/* First Player Card */}
          {currentPlayer && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full mb-8 flex items-center gap-4">
              {currentPlayer.avatar ? (
                <img
                  src={currentPlayer.avatar}
                  alt={currentPlayer.name}
                  className="w-16 h-16 rounded-full object-cover border-2"
                  style={{ borderColor: currentPlayer.color }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white border-2"
                  style={{ backgroundColor: currentPlayer.color, borderColor: currentPlayer.color }}
                >
                  {currentPlayer.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/40 uppercase tracking-wider mb-1">
                  {t('companion.startingPlayer')}
                </div>
                <div className="text-xl font-bold truncate" style={{ color: currentPlayer.color }}>
                  {currentPlayer.name}
                </div>
              </div>
              <div className="text-xs text-white/30">
                {playersSnapshot.length} {t('passTheMic.players') || 'players'}
              </div>
            </div>
          )}

          {/* Round info */}
          {companionSeriesHistory.length > 0 && (
            <p className="text-white/40 text-xs mb-6">
              {t('companion.round').replace('{n}', String(companionSeriesHistory.length + 1))}
            </p>
          )}

          {/* Media loaded indicator */}
          {!mediaLoaded && (
            <div className="flex items-center gap-2 text-white/40 text-sm mb-4">
              <div className="w-4 h-4 border-2 border-white/30 border-t-emerald-400 rounded-full animate-spin" />
              {t('gameScreen.loadingMedia')}
            </div>
          )}

          {/* Start Button */}
          <Button
            onClick={startGame}
            disabled={!mediaLoaded}
            className="w-full py-4 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mediaLoaded
              ? t('companion.startSinging')
              : t('gameScreen.loading')}
          </Button>
        </div>
      </div>
    );
  }

  // ===================== SONG RESULTS PHASE =====================
  if (phase === 'song-results') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 via-black to-zinc-900 px-4 py-8 overflow-y-auto">
        <div className="flex flex-col items-center max-w-2xl w-full animate-in fade-in zoom-in-95 duration-500">
          <div className="text-5xl mb-4">📱</div>
          <h2 className="text-2xl font-bold mb-1 text-white">{song.title}</h2>
          <p className="text-white/60 mb-6">{song.artist}</p>

          <div className="bg-white/5 border border-white/10 rounded-2xl w-full mb-6 p-6">
            <h3 className="text-center text-lg font-bold text-white mb-4">{t('companion.roundResults')}</h3>
            <div className="space-y-3">
              {[...playersSnapshot]
                .sort((a, b) => b.score - a.score)
                .map((player, rank) => (
                  <div key={player.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${rank === 0 ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30' : 'bg-white/5'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${rank === 0 ? 'bg-amber-500 text-black' : rank === 1 ? 'bg-gray-400 text-black' : rank === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-white/60'}`}>
                        {rank + 1}
                      </div>
                      {player.avatar ? (
                        <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                          style={{ backgroundColor: player.color }}>{player.name.charAt(0).toUpperCase()}</div>
                      )}
                      <div>
                        <div className="font-medium text-white">{player.name}</div>
                        <div className="text-xs text-white/40">
                          {t('companion.statsLine').replace('{hits}', String(player.notesHit)).replace('{misses}', String(player.notesMissed)).replace('{combo}', String(player.maxCombo)).replace('{turns}', String(player.turnCount))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-emerald-400">{player.score.toLocaleString()}</div>
                      <div className="text-xs text-white/40">{t('companion.points')}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <Button onClick={handleContinue}
              className="flex-1 py-4 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400">
              {t('companion.nextSong')}
            </Button>
            <Button onClick={handleEndSeries}
              variant="outline"
              className="flex-1 py-4 text-lg border-white/20 text-white/60 hover:text-white">
              {t('companion.endSeries')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== SERIES RESULTS PHASE =====================
  if (phase === 'series-results') {
    return (
      <CompanionSeriesResults onBack={() => {
        onEndGame();
      }} />
    );
  }

  // ===================== FULLSCREEN GAMEPLAY (countdown + playing + switching) =====================
  const turnSecondsDisplay = Math.ceil(turnSecondsLeft);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      {/* ── Audio Element ── */}
      {effectiveSong.audioUrl && (
        <audio
          key={effectiveSong.id}
          ref={audioRef}
          src={effectiveSong.audioUrl}
          className="hidden"
          onEnded={handleMediaEnded}
          onError={() => {}}
          preload="auto"
        />
      )}

      {/* ── Hidden Video Element for embedded audio (fallback) ── */}
      {!effectiveSong.audioUrl && effectiveSong.videoBackground && (
        <video
          key={`video-${effectiveSong.id}`}
          ref={videoRef}
          src={effectiveSong.videoBackground}
          className="hidden"
          muted={false}
          playsInline
          onEnded={handleMediaEnded}
          onError={() => {}}
          preload="auto"
        />
      )}

      {/* ── Game Area — Full Screen ── */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Background */}
        <GameBackground
          effectiveSong={effectiveSong}
          showBackgroundVideo={showBackgroundVideo}
          useAnimatedBackground={useAnimatedBackground}
          isYouTube={false}
          youtubeVideoId={null}
          useYouTubeAudio={false}
          isPlaying={isPlaying}
          isAdPlaying={false}
          songEnergy={0}
          volume={0.8}
          videoRef={videoRef}
          onYoutubeTimeUpdate={() => {}}
          onAdStart={() => {}}
          onAdEnd={() => {}}
          onVideoEnded={handleMediaEnded}
          onVideoCanPlay={() => {}}
          onYoutubeError={() => {}}
        />

        {/* Dark Overlay for visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 z-5" />

        {/* Countdown */}
        {phase === 'countdown' && (
          <GameCountdown countdown={countdown} />
        )}

        {/* Note Highway — single lane with current player color */}
        {phase === 'playing' && allNotes.length > 0 && (
          <NoteHighway
            visibleNotes={visibleNotes}
            currentTime={currentTime}
            pitchStats={pitchStats}
            detectedPitch={null}
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
        {(phase === 'playing' || phase === 'switching') && sortedLines.length > 0 && (
          <SinglePlayerLyrics
            sortedLines={sortedLines}
            currentTime={currentTime}
            playerColor={currentPlayer?.color || PLAYER_COLORS[0]}
            noteDisplayStyle={noteDisplayStyle as 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'}
            notePerformance={undefined}
            gameMode="companion-singalong"
          />
        )}
      </div>

      {/* ═══════ HUD OVERLAYS ═══════ */}

      {/* Current Player + Score (top center) */}
      {(phase === 'playing' || phase === 'switching') && currentPlayer && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-4">
            {currentPlayer.avatar ? (
              <img src={currentPlayer.avatar} alt={currentPlayer.name}
                className="w-10 h-10 rounded-full object-cover border-2"
                style={{ borderColor: currentPlayer.color }} />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white border-2"
                style={{ backgroundColor: currentPlayer.color, borderColor: currentPlayer.color }}>
                {currentPlayer.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-center min-w-0">
              <div className="text-xs text-white/50">{t('companion.nowSinging')}</div>
              <div className="text-lg font-bold truncate max-w-32" style={{ color: currentPlayer.color }}>
                {currentPlayer.name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-400">{currentPlayer.score.toLocaleString()}</div>
              {currentPlayer.combo > 0 && (
                <div className="text-xs text-amber-400">x{currentPlayer.combo}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Turn Timer (below player card) */}
      {phase === 'playing' && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-64">
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>{t('companion.nextSwitchIn')}</span>
            <span className={turnSecondsDisplay <= 3 ? 'text-amber-400 font-bold' : ''}>{turnSecondsDisplay}s</span>
          </div>
          <Progress
            value={turnProgress}
            className="h-2 bg-white/10"
          />
        </div>
      )}

      {/* Switching overlay */}
      {phase === 'switching' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="text-center animate-pulse">
            <div className="text-6xl font-black text-amber-400 mb-2">{switchCountdown}</div>
            <div className="text-xl font-bold text-white">
              {t('companion.switching')}
            </div>
            <div className="text-white/60 mt-2">
              {playersRef.current[nextPlayerIndexRef.current]?.name}
            </div>
          </div>
        </div>
      )}

      {/* Player Scores — horizontal bottom row above progress */}
      {(phase === 'playing' || phase === 'switching') && (
        <div className="fixed bottom-12 left-4 right-4 z-50">
          <div className="flex gap-2 justify-center flex-wrap">
            {playersSnapshot.map((player, index) => (
              <div key={player.id}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  index === currentPlayerIndex
                    ? 'bg-white/20 border-2 scale-105'
                    : 'bg-white/5 border border-white/10'
                }`}
                style={index === currentPlayerIndex ? { borderColor: player.color } : {}}>
                <div className="flex items-center gap-2">
                  {player.avatar ? (
                    <img src={player.avatar} alt={player.name} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: player.color }}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-white">{player.name}</span>
                  <span className="text-white/50 text-xs">{player.score.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls — Pause (top-left) + Fullscreen (top-right) */}
      {(phase === 'playing' || phase === 'switching') && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute top-4 left-4 z-20 pointer-events-auto">
            <PauseButton
              isPlaying={isPlaying}
              onTogglePause={togglePause}
            />
          </div>
          <div className="absolute top-4 right-4 z-20 pointer-events-auto">
            <FullscreenButton />
          </div>
        </div>
      )}

      {/* Progress Bar (bottom) */}
      <GameProgressBar currentTime={currentTime} duration={displayDuration} />
      <TimeDisplay currentTime={currentTime} duration={displayDuration} />

      {/* End Early Button (bottom-right, above progress) */}
      {phase === 'playing' && (
        <div className="absolute bottom-14 right-4 z-20">
          {pendingEndSong ? (
            <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30">
              <div className="text-sm text-center text-red-300 mb-2">{t('companion.endSongEarlyConfirm')}</div>
              <div className="flex gap-2">
                <Button size="sm" onClick={confirmEndSong}
                  className="flex-1 bg-red-500 hover:bg-red-400 text-white text-xs">
                  {t('companion.confirm')}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEndSong}
                  className="flex-1 border-white/20 text-white/60 hover:text-white text-xs">
                  {t('companion.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={requestEndSong}
              className="text-white/40 hover:text-white/70 hover:bg-white/10 text-xs px-3 py-1.5"
            >
              {t('companion.endSongEarly')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}