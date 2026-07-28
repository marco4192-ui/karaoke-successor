'use client';

/**
 * Companion Sing-A-Long — Game View
 *
 * Core game logic: audio, pitch detection, turn switching, scoring,
 * and all game-phase rendering (intro, countdown, playing, switching, song-results).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';
import { Song, LyricLine, EMPTY_PLAYER_SCORE } from '@/types/game';
import { usePartyStore } from '@/lib/game/party-store';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { useTranslation } from '@/lib/i18n/translations';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { findActiveNote, shouldSkipPitch, evaluateAndScoreTick } from '@/lib/game/party-scoring';
import type { CompanionPlayer, CompanionSingAlongSettings, GamePhase, CompanionRoundResult } from './companion-types';
import { DEFAULT_SETTINGS, randomTurnDuration } from './companion-types';
import { CompanionSeriesResults } from './companion-series-results';

// ===================== GAME VIEW =====================

interface CompanionGameViewProps {
  players: CompanionPlayer[];
  song: Song;
  settings: CompanionSingAlongSettings;
  onEndGame: () => void;
}

export function CompanionGameView({
  players: initialPlayers, song, settings, onEndGame,
}: CompanionGameViewProps) {
  const { t } = useTranslation();
  const safeSettings: CompanionSingAlongSettings = settings ?? DEFAULT_SETTINGS;
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const setCompanionSeriesHistory = usePartyStore(s => s.setCompanionSeriesHistory);
  const companionSeriesHistory = usePartyStore(s => s.companionSeriesHistory);
  const setCompanionPlayers = usePartyStore(s => s.setCompanionPlayers);
  const setCompanionSong = usePartyStore(s => s.setCompanionSong);
  const setCompanionSettings = usePartyStore(s => s.setCompanionSettings);

  // ── Phase management ──
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [countdown, setCountdown] = useState(3);

  // ── Audio ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(currentTime);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  const [isPlaying, setIsPlaying] = useState(false);

  // ── Player state (local, mutable for performance) ──
  const playersRef = useRef<CompanionPlayer[]>(initialPlayers.map(p => ({
    ...p, ...EMPTY_PLAYER_SCORE, turnCount: 0,
  })));
  const [playersSnapshot, setPlayersSnapshot] = useState<CompanionPlayer[]>(() => initialPlayers.map(p => ({
    ...p, ...EMPTY_PLAYER_SCORE, turnCount: 0,
  })));
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

  // ── Next player for companion display ──
  const nextPlayerIndexRef = useRef<number>(0);

  // ── Pitch detection ──
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

  // ── Pause / Resume sync with page.tsx dialog ──
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
    } else if (pauseDialogAction === null && isPlaying && (phase === 'playing' || phase === 'switching')) {
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => {});
    }
  }, [pauseDialogAction, isPlaying, phase]);

  // ── Pre-compute scoring metadata ──
  const scoringMeta = useRef<ReturnType<typeof calculateScoringMetadata> | null>(null);
  useEffect(() => {
    if (song?.lyrics?.length) {
      const allNotes: Array<{ duration: number; isGolden: boolean }> = [];
      song.lyrics.forEach(line => line.notes.forEach(note => {
        allNotes.push({ duration: note.duration, isGolden: note.isGolden });
      }));
      const beatDuration = song.bpm ? 15000 / song.bpm : 500;
      scoringMeta.current = calculateScoringMetadata(allNotes, beatDuration);
    }
  }, [song]);

  // ── Scoring tick tracking ──
  const lastEvalTimeRef = useRef(0);
  const lastActiveNoteStartRef = useRef<number | null>(null);
  const lastNoteWasHitRef = useRef(false);

  // ── Send singalong turn info + scores to companion apps via server ──
  const sendSingalongTurn = useCallback(async (profileId: string | null, nextProfileId: string | null, countdown: number | null) => {
    try {
      // Build companion score entries from current player state
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

  // ── Score the active player based on pitch ──
  const scoreCurrentPlayer = useCallback(() => {
    if (!pitchResult) return;
    const difficulty = safeSettings.difficulty;
    if (shouldSkipPitch(pitchResult, difficulty)) return;

    const ct = currentTimeRef.current;
    const activeNote = findActiveNote(song.lyrics, ct);
    if (!activeNote) return;

    if (ct - lastEvalTimeRef.current < 250) return;
    lastEvalTimeRef.current = ct;

    if (pitchResult.note == null) return;
    const tick = evaluateAndScoreTick(pitchResult.note, activeNote, difficulty, scoringMeta.current);
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
  }, [pitchResult, song, safeSettings.difficulty, currentPlayerIndex, forceRender]);

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
  }, [phase, switchCountdown, sendSingalongTurn, forceRender]);

  // ── Start game (countdown → playing) ──
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            // eslint-disable-next-line no-console
            audioRef.current.play().catch(e => console.warn('[CompanionSingAlong] Audio play failed:', e));
          }

          // Notify companion: first player is active
          sendSingalongTurn(playersRef.current[0].id, null, null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    countdownIntervalRef.current = interval;
  };

  // ── Helpers ──
  const progress = song.duration > 0 ? (currentTime / song.duration) * 100 : 0;
  const turnSecondsLeft = Math.max(0, timeUntilSwitchDisplay / 1000);
  const turnProgress = timeUntilSwitchTotal > 0
    ? ((timeUntilSwitchTotal - timeUntilSwitchDisplay) / timeUntilSwitchTotal) * 100
    : 0;

  const getCurrentLyrics = (): LyricLine | null => {
    if (!song.lyrics || song.lyrics.length === 0) return null;
    return song.lyrics.find((line, i) => {
      const next = song.lyrics[i + 1];
      return currentTime >= line.startTime && (!next || currentTime < next.startTime);
    }) || null;
  };
  const currentLyrics = getCurrentLyrics();

  // ── Record this round to series history ──
  const recordRound = useCallback(() => {
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
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
    recordRound();
    setPlayersSnapshot([...playersRef.current]);
    setPhase('song-results');
  }, [recordRound]);

  // ── Continue series: pick next song ──
  const handleContinue = useCallback(() => {
    const resetPlayers = playersRef.current.map(p => ({
      ...p, ...EMPTY_PLAYER_SCORE, turnCount: 0,
    }));
    setCompanionPlayers(resetPlayers);
    // Reset song so the library/pick screen shows again (CP-C2)
    setCompanionSong(null);
    setPhase('intro');
    // Do NOT call onEndGame() — it wipes companionPlayers via party-store.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setCompanionPlayers/setCompanionSong excluded; stable setState
  }, []);

  // ── End series ──
  const handleEndSeries = useCallback(() => {
    setPhase('series-results');
  }, []);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      stop();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setIsSongPlaying(false);
      lastIsSongPlayingRef.current = false;
    };
  }, [stop, setIsSongPlaying]);

  // ===================== RENDER =====================
  return (
    <div className="max-w-6xl mx-auto">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={song.audioUrl || song.videoBackground || ''}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime * 1000)}
        onEnded={() => {
          if (phase === 'playing' || phase === 'switching') {
            setIsPlaying(false);
            recordRound();
            setPlayersSnapshot([...playersRef.current]);
            setPhase('song-results');
          }
        }}
        // eslint-disable-next-line no-console
        onError={(e) => console.error('[CompanionSingAlong] Audio error:', e)}
        className="hidden"
        preload="auto"
      />

      {/* ── PHASE: INTRO ── */}
      {phase === 'intro' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-5xl mb-6">📱</div>
          <h2 className="text-2xl font-bold mb-2">{t('companion.playingTitle')}</h2>
          <p className="text-white/60 mb-8">{song.title} — {song.artist}</p>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 max-w-md w-full mb-6">
            <CardContent className="py-8 text-center">
              <div className="text-sm text-white/60 mb-2">{t('companion.startingPlayer')}</div>
              <div className="flex items-center justify-center gap-4 mb-4">
                {currentPlayer?.avatar ? (
                  <img src={currentPlayer.avatar} alt={currentPlayer.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500" />
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-emerald-500"
                    style={{ backgroundColor: currentPlayer?.color }}>
                    {currentPlayer?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-3xl font-bold">{currentPlayer?.name}</span>
              </div>
              <div className="text-sm text-white/40">
                {t('companion.playersAndTurns').replace('{n}', String(playersSnapshot.length))}
                {companionSeriesHistory.length > 0 && (
                  <span> • {t('companion.round').replace('{n}', String(companionSeriesHistory.length + 1))}</span>
                )}
              </div>
              <p className="text-xs text-white/30 mt-2">
                {t('companion.allChangesNote')}
              </p>
            </CardContent>
          </Card>

          <Button onClick={startGame}
            className="px-12 py-4 text-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400">
            {t('companion.startSinging')}
          </Button>
        </div>
      )}

      {/* ── PHASE: COUNTDOWN ── */}
      {phase === 'countdown' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-8xl font-bold text-emerald-400 animate-pulse">{countdown}</div>
          <p className="text-white/60 mt-4">{t('companion.getReady')}</p>
        </div>
      )}

      {/* ── PHASE: PLAYING / SWITCHING ── */}
      {(phase === 'playing' || phase === 'switching') && (
        <>
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-500/20 text-emerald-400 text-lg px-3 py-1">📱 {t('companion.singAlongTitle')}</Badge>
              <span className="text-white/60 text-sm">{song.title}</span>
            </div>
            <div className="flex items-center gap-3 pointer-events-auto">
              {phase === 'switching' && (
                <Badge className="bg-yellow-500/20 text-yellow-400 animate-pulse">
                  {t('companion.switching')} {switchCountdown}
                </Badge>
              )}
              <FullscreenButton />
            </div>
          </div>

          {/* Current Player */}
          <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 mb-3">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {currentPlayer?.avatar ? (
                    <img src={currentPlayer.avatar} alt={currentPlayer.name}
                      className="w-14 h-14 rounded-full object-cover border-[3px] border-emerald-500" />
                  ) : (
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-[3px] border-emerald-500"
                      style={{ backgroundColor: currentPlayer?.color }}>
                      {currentPlayer?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-white/60">{t('companion.nowSinging')}</div>
                    <div className="text-2xl font-bold">{currentPlayer?.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-emerald-400" style={{ textShadow: '0 0 12px rgba(52,211,153,0.4)' }}>{currentPlayer?.score.toLocaleString()}</div>
                  <div className="text-xs text-white/40">{t('companion.points')}</div>
                  {currentPlayer?.combo > 0 && (
                    <div className="text-sm text-amber-400">🔥 {currentPlayer.combo}x {t('companion.combo')}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Turn Timer */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>{t('companion.nextSwitchIn')}</span>
              <span>{Math.ceil(turnSecondsLeft)}s</span>
            </div>
            <Progress value={turnProgress} className="h-3 bg-white/10" />
          </div>

          {/* Song Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>{t('companion.songProgress')}</span>
              <span>{Math.floor(currentTime / 60000)}:{Math.floor((currentTime % 60000) / 1000).toString().padStart(2, '0')} / {Math.floor(song.duration / 60000)}:{Math.floor((song.duration % 60000) / 1000).toString().padStart(2, '0')}</span>
            </div>
            <Progress value={progress} className="h-2 bg-white/10" />
          </div>

          {/* Lyrics */}
          {currentLyrics && (
            <Card className="bg-black/30 border-white/10 mb-3">
              <CardContent className="py-4">
                <div className="text-center text-xl font-bold text-white">{currentLyrics.text}</div>
              </CardContent>
            </Card>
          )}

          {/* Player Queue */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-3">
              <div className="flex flex-wrap gap-2">
                {playersSnapshot.map((player, index) => (
                  <div key={player.id}
                    className={`px-3 py-2 rounded-lg transition-all text-sm ${index === currentPlayerIndex
                      ? 'bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border-2 border-emerald-500 scale-105'
                      : 'bg-white/5 border border-white/10'}`}>
                    <div className="flex items-center gap-2">
                      {player.avatar ? (
                        <img src={player.avatar} alt={player.name} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: player.color }}>
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium">{player.name}</span>
                    </div>
                    <div className="text-xs text-white/40 ml-8">{player.score.toLocaleString()} {t('companion.pts')}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {pendingEndSong ? (
            <div className="mt-3 p-3 rounded-lg bg-red-500/15 border border-red-500/30">
              <div className="text-sm text-center text-red-300 mb-2">{t('companion.endSongEarlyConfirm')}</div>
              <div className="flex gap-2">
                <Button onClick={confirmEndSong}
                  className="flex-1 bg-red-500 hover:bg-red-400 text-white">
                  {t('companion.confirm')}
                </Button>
                <Button onClick={cancelEndSong}
                  variant="outline" className="flex-1 border-white/20 text-white/60 hover:text-white">
                  {t('companion.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={requestEndSong}
              variant="outline" className="w-full mt-3 border-white/20 text-white/60 hover:text-white">
              {t('companion.endSongEarly')}
            </Button>
          )}
        </>
      )}

      {/* ── PHASE: SONG RESULTS ── */}
      {phase === 'song-results' && (
        <div className="flex flex-col items-center">
          <div className="text-5xl mb-4">📱</div>
          <h2 className="text-2xl font-bold mb-1">{song.title}</h2>
          <p className="text-white/60 mb-6">{song.artist}</p>

          <Card className="bg-white/5 border-white/10 w-full max-w-2xl mb-6">
            <CardHeader><CardTitle className="text-center">{t('companion.roundResults')}</CardTitle></CardHeader>
            <CardContent>
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
                          <div className="font-medium">{player.name}</div>
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
            </CardContent>
          </Card>

          <div className="flex gap-3 w-full max-w-2xl">
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
      )}

      {/* ── PHASE: SERIES RESULTS ── */}
      {phase === 'series-results' && (
        <CompanionSeriesResults onBack={() => {
          setCompanionPlayers([]);
          setCompanionSong(null);
          setCompanionSettings(null);
          setCompanionSeriesHistory([]);
          onEndGame();
        }} />
      )}
    </div>
  );
}

