'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Song, PlayerProfile, PLAYER_COLORS, LyricLine, Difficulty, DIFFICULTY_SETTINGS } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { evaluateTick, calculateTickPoints, calculateScoringMetadata } from '@/lib/game/scoring';

// ===================== TYPES =====================

export interface CompanionPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
  notesHit: number;
  notesMissed: number;
  combo: number;
  maxCombo: number;
  turnCount: number;
}

export interface CompanionRoundResult {
  songTitle: string;
  songArtist: string;
  playedAt: number;
  playerScores: Record<string, { score: number; notesHit: number; notesMissed: number; maxCombo: number }>;
}

interface CompanionSingAlongSettings {
  difficulty: Difficulty;
}

const DEFAULT_SETTINGS: CompanionSingAlongSettings = {
  difficulty: 'medium',
};

type GamePhase = 'intro' | 'countdown' | 'playing' | 'switching' | 'song-results' | 'series-results';

// ===================== SETUP SCREEN =====================

interface CompanionSingAlongSetupProps {
  profiles: PlayerProfile[];
  onSelectSong: (players: CompanionPlayer[], settings: CompanionSingAlongSettings) => void;
  onBack: () => void;
}

export function CompanionSingAlongSetupScreen({ profiles, onSelectSong, onBack }: CompanionSingAlongSetupProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [settings] = useState<CompanionSingAlongSettings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string | null>(null);

  const activeProfiles = useMemo(() =>
    profiles.filter(p => p.isActive !== false),
    [profiles]
  );

  const globalDifficulty = useGameStore((state) => state.gameState.difficulty);
  const setGlobalDifficulty = useGameStore((state) => state.setDifficulty);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) return prev.filter(id => id !== playerId);
      if (prev.length >= 8) { setError('Maximum 8 players allowed'); return prev; }
      setError(null);
      return [...prev, playerId];
    });
  };

  const handleSelectSong = () => {
    if (selectedPlayers.length < 2) { setError('Minimum 2 players required'); return; }
    setError(null);

    const players: CompanionPlayer[] = selectedPlayers.map((id, index) => {
      const profile = profiles.find(p => p.id === id);
      return {
        id, name: profile?.name || 'Unknown', avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        score: 0, notesHit: 0, notesMissed: 0, combo: 0, maxCombo: 0, turnCount: 0,
      };
    });

    onSelectSong(players, { ...settings, difficulty: globalDifficulty });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">← Back</Button>
        <div>
          <h1 className="text-3xl font-bold">📱 Companion Sing-A-Long</h1>
          <p className="text-white/60">Your phone randomly lights up — that's your cue to sing!</p>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 mb-6">
        <CardContent className="py-4">
          <h3 className="font-bold text-lg mb-2 text-emerald-400">🎮 How it works</h3>
          <ul className="text-sm text-white/70 space-y-2">
            <li>📱 Everyone keeps their phone nearby</li>
            <li>⚡ When your phone screen flashes, it's YOUR turn to sing!</li>
            <li>🎤 No one knows who's next until the blink</li>
            <li>⏱️ Singers rotate every 20–45 seconds (randomized)</li>
            <li>🏆 Score points while you sing — all players get equal time!</li>
          </ul>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">{error}</div>
      )}

      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader><CardTitle>Game Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                <Button key={diff} variant={globalDifficulty === diff ? 'default' : 'outline'}
                  onClick={() => setGlobalDifficulty(diff)}
                  className={globalDifficulty === diff ? 'bg-emerald-500 hover:bg-emerald-600' : 'border-white/20'}>
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader><CardTitle>Select Players ({selectedPlayers.length}/8)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeProfiles.map(profile => {
              const isSelected = selectedPlayers.includes(profile.id);
              return (
                <div key={profile.id} onClick={() => togglePlayer(profile.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${isSelected
                    ? 'bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border-2 border-emerald-500'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}>
                  <div className="flex items-center gap-3">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: profile.color }}>{profile.name.charAt(0).toUpperCase()}</div>
                    )}
                    <span className="font-medium truncate">{profile.name}</span>
                    {isSelected && <span className="ml-auto text-emerald-400">✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {activeProfiles.length < 2 && (
            <p className="text-yellow-400 mt-4">⚠️ Need at least 2 active profiles.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Ready to Play!</h3>
              <p className="text-sm text-white/60">{selectedPlayers.length} players</p>
              <p className="text-xs text-white/40 mt-1">Turn duration: 20–45s (random) • Flash + 3s countdown</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-400">{selectedPlayers.length}</div>
              <div className="text-xs text-white/40">players</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSelectSong} disabled={selectedPlayers.length < 2}
        className="w-full py-6 text-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400">
        🎵 Select Song ({selectedPlayers.length} Players)
      </Button>
    </div>
  );
}

// ===================== GAME VIEW =====================

interface CompanionGameViewProps {
  players: CompanionPlayer[];
  song: Song;
  settings: CompanionSingAlongSettings;
  onUpdatePlayers: (players: CompanionPlayer[]) => void;
  onEndGame: () => void;
}

// Generate a random interval between 20 and 45 seconds (in ms)
function randomTurnDuration(): number {
  return (20 + Math.random() * 25) * 1000; // 20,000 – 45,000 ms
}

export function CompanionGameView({
  players: initialPlayers, song, settings, onUpdatePlayers, onEndGame,
}: CompanionGameViewProps) {
  const safeSettings: CompanionSingAlongSettings = settings ?? DEFAULT_SETTINGS;
  const party = usePartyStore();

  // ── Phase management ──
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [countdown, setCountdown] = useState(3);

  // ── Audio ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // ── Player state (local, mutable for performance) ──
  const playersRef = useRef<CompanionPlayer[]>(initialPlayers.map(p => ({
    ...p, score: 0, notesHit: 0, notesMissed: 0, combo: 0, maxCombo: 0, turnCount: 0,
  })));
  const [, rerender] = useState(0);
  const forceRender = useCallback(() => rerender(n => n + 1), []);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const currentPlayer = playersRef.current[currentPlayerIndex];

  // ── Switch timer ──
  const timeUntilSwitchRef = useRef(randomTurnDuration());
  const [timeUntilSwitchDisplay, setTimeUntilSwitchDisplay] = useState(timeUntilSwitchRef.current);
  const switchCountdownRef = useRef<number | null>(null);
  const [switchCountdown, setSwitchCountdown] = useState<number | null>(null);

  // ── Next player for companion display ──
  const nextPlayerIndexRef = useRef<number>(0);

  // ── Pitch detection ──
  const { pitchResult, initialize, start, stop } = usePitchDetector();

  // ── Song playing status for Escape handler ──
  useEffect(() => {
    party.setIsSongPlaying(isPlaying && (phase === 'playing' || phase === 'switching'));
  }, [isPlaying, phase, party]);

  // ── Pause / Resume sync with page.tsx dialog ──
  useEffect(() => {
    if (party.pauseDialogAction === 'song-pause') {
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
    } else if (party.pauseDialogAction === null && isPlaying && (phase === 'playing' || phase === 'switching')) {
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => {});
    }
  }, [party.pauseDialogAction, isPlaying, phase]);

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

  // ── Send singalong turn info to companion apps via server ──
  const sendSingalongTurn = useCallback(async (profileId: string | null, nextProfileId: string | null, countdown: number | null) => {
    try {
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
          },
        }),
      });
    } catch { /* ignore — companion is optional for the main screen */ }
  }, []);

  // ── Clear singalong turn on unmount ──
  useEffect(() => {
    return () => {
      fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'gamestate', payload: { singalongTurn: null } }),
      }).catch(() => {});
      stop();
    };
  }, [stop]);

  // ── Score the active player based on pitch ──
  const scoreCurrentPlayer = useCallback(() => {
    if (!pitchResult?.frequency || pitchResult.note === null) return;
    const difficulty = safeSettings.difficulty;
    const diffSettings = DIFFICULTY_SETTINGS[difficulty];
    if (pitchResult.volume < diffSettings.volumeThreshold) return;

    const ct = currentTime;
    if (!song.lyrics) return;

    for (const line of song.lyrics) {
      for (const note of line.notes) {
        const noteEnd = note.startTime + note.duration;
        if (ct >= note.startTime && ct <= noteEnd) {
          if (ct - lastEvalTimeRef.current < 250) return;
          lastEvalTimeRef.current = ct;

          const result = evaluateTick(pitchResult.note, note.pitch, difficulty);
          const p = playersRef.current[currentPlayerIndex];
          const idx = currentPlayerIndex;

          if (result.isHit) {
            const meta = scoringMeta.current;
            const tickPts = meta
              ? calculateTickPoints(result.accuracy, note.isGolden, meta.pointsPerTick, difficulty)
              : result.accuracy * 10;
            const finalPoints = Math.max(1, Math.round(tickPts));

            p.score += finalPoints;
            p.notesHit++;
            p.combo++;
            if (p.combo > p.maxCombo) p.maxCombo = p.combo;
          } else {
            p.combo = 0;
            p.notesMissed++;
          }

          playersRef.current[idx] = { ...p };
          forceRender();
          return;
        }
      }
    }
  }, [currentTime, pitchResult, song, safeSettings.difficulty, currentPlayerIndex, forceRender]);

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
      // Activate the next player
      setCurrentPlayerIndex(nextPlayerIndexRef.current);
      timeUntilSwitchRef.current = randomTurnDuration();
      setTimeUntilSwitchDisplay(timeUntilSwitchRef.current);
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
  const startGame = async () => {
    setPhase('countdown');
    setCountdown(3);
    try { await initialize(); start(); } catch { /* pitch may fail */ }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setPhase('playing');
          setIsPlaying(true);
          setCurrentTime(0);
          timeUntilSwitchRef.current = randomTurnDuration();
          setTimeUntilSwitchDisplay(timeUntilSwitchRef.current);

          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.warn('[CompanionSingAlong] Audio play failed:', e));
          }

          // Notify companion: first player is active
          sendSingalongTurn(playersRef.current[0].id, null, null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Helpers ──
  const progress = song.duration > 0 ? (currentTime / song.duration) * 100 : 0;
  const turnSecondsLeft = Math.max(0, timeUntilSwitchDisplay / 1000);
  const turnProgress = timeUntilSwitchRef.current > 0
    ? ((timeUntilSwitchRef.current - timeUntilSwitchDisplay) / timeUntilSwitchRef.current) * 100
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
    party.setCompanionSeriesHistory([...party.companionSeriesHistory, round]);
  }, [song, party]);

  // ── Continue series: pick next song ──
  const handleContinue = useCallback(() => {
    const resetPlayers = playersRef.current.map(p => ({
      ...p, score: 0, notesHit: 0, notesMissed: 0, combo: 0, maxCombo: 0, turnCount: 0,
    }));
    party.setCompanionPlayers(resetPlayers);
    onEndGame();
  }, [party, onEndGame]);

  // ── End series ──
  const handleEndSeries = useCallback(() => {
    setPhase('series-results');
  }, []);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

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
            setPhase('song-results');
          }
        }}
        onError={(e) => console.error('[CompanionSingAlong] Audio error:', e)}
        className="hidden"
        preload="auto"
      />

      {/* ── PHASE: INTRO ── */}
      {phase === 'intro' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-5xl mb-6">📱</div>
          <h2 className="text-2xl font-bold mb-2">Companion Sing-A-Long</h2>
          <p className="text-white/60 mb-8">{song.title} — {song.artist}</p>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 max-w-md w-full mb-6">
            <CardContent className="py-8 text-center">
              <div className="text-sm text-white/60 mb-2">STARTING PLAYER</div>
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
                {playersRef.current.length} players • 20–45s turns
                {party.companionSeriesHistory.length > 0 && (
                  <span> • Round {party.companionSeriesHistory.length + 1}</span>
                )}
              </div>
              <p className="text-xs text-white/30 mt-2">
                All player changes are communicated via the Companion app only.
              </p>
            </CardContent>
          </Card>

          <Button onClick={startGame}
            className="px-12 py-4 text-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400">
            🎤 Start Singing!
          </Button>
        </div>
      )}

      {/* ── PHASE: COUNTDOWN ── */}
      {phase === 'countdown' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-8xl font-bold text-emerald-400 animate-pulse">{countdown}</div>
          <p className="text-white/60 mt-4">Get ready...</p>
        </div>
      )}

      {/* ── PHASE: PLAYING / SWITCHING ── */}
      {(phase === 'playing' || phase === 'switching') && (
        <>
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-500/20 text-emerald-400 text-lg px-3 py-1">📱 COMPANION SING-A-LONG</Badge>
              <span className="text-white/60 text-sm">{song.title}</span>
            </div>
            {phase === 'switching' && (
              <Badge className="bg-yellow-500/20 text-yellow-400 animate-pulse">
                Switching... {switchCountdown}
              </Badge>
            )}
          </div>

          {/* Current Player */}
          <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 mb-3">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {currentPlayer?.avatar ? (
                    <img src={currentPlayer.avatar} alt={currentPlayer.name}
                      className="w-14 h-14 rounded-full object-cover border-3 border-emerald-500" />
                  ) : (
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-3 border-emerald-500"
                      style={{ backgroundColor: currentPlayer?.color }}>
                      {currentPlayer?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-white/60">NOW SINGING</div>
                    <div className="text-2xl font-bold">{currentPlayer?.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-emerald-400">{currentPlayer?.score.toLocaleString()}</div>
                  <div className="text-xs text-white/40">points</div>
                  {currentPlayer?.combo > 0 && (
                    <div className="text-sm text-amber-400">🔥 {currentPlayer.combo}x combo</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Turn Timer */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>Next switch in</span>
              <span>{Math.ceil(turnSecondsLeft)}s</span>
            </div>
            <Progress value={turnProgress} className="h-3 bg-white/10" />
          </div>

          {/* Song Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>Song Progress</span>
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
                {playersRef.current.map((player, index) => (
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
                    <div className="text-xs text-white/40 ml-8">{player.score.toLocaleString()} pts</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => { setIsPlaying(false); recordRound(); setPhase('song-results'); }}
            variant="outline" className="w-full mt-3 border-white/20 text-white/60 hover:text-white">
            End Song Early
          </Button>
        </>
      )}

      {/* ── PHASE: SONG RESULTS ── */}
      {phase === 'song-results' && (
        <div className="flex flex-col items-center">
          <div className="text-5xl mb-4">📱</div>
          <h2 className="text-2xl font-bold mb-1">{song.title}</h2>
          <p className="text-white/60 mb-6">{song.artist}</p>

          <Card className="bg-white/5 border-white/10 w-full max-w-2xl mb-6">
            <CardHeader><CardTitle className="text-center">Round Results</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...playersRef.current]
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
                            {player.notesHit} hits • {player.notesMissed} misses • {player.maxCombo}x max combo • {player.turnCount} turns
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-emerald-400">{player.score.toLocaleString()}</div>
                        <div className="text-xs text-white/40">points</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 w-full max-w-2xl">
            <Button onClick={handleContinue}
              className="flex-1 py-4 text-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400">
              🎵 Next Song
            </Button>
            <Button onClick={handleEndSeries}
              variant="outline"
              className="flex-1 py-4 text-lg border-white/20 text-white/60 hover:text-white">
              🏆 End Series
            </Button>
          </div>
        </div>
      )}

      {/* ── PHASE: SERIES RESULTS ── */}
      {phase === 'series-results' && (
        <CompanionSeriesResults onBack={() => {
          party.setCompanionPlayers([]);
          party.setCompanionSong(null);
          party.setCompanionSettings(null);
          party.setCompanionSeriesHistory([]);
          onEndGame();
        }} />
      )}
    </div>
  );
}

// ===================== SERIES RESULTS =====================

function CompanionSeriesResults({ onBack }: { onBack: () => void }) {
  const party = usePartyStore();
  const history = party.companionSeriesHistory;

  const cumulative = useRef<Record<string, { name: string; avatar?: string; color: string; totalScore: number; totalHits: number; totalMisses: number; bestCombo: number; roundsPlayed: number }>>({});
  useEffect(() => {
    const agg: typeof cumulative.current = {};
    for (const p of party.companionPlayers) {
      agg[p.id] = { name: p.name, avatar: p.avatar, color: p.color, totalScore: 0, totalHits: 0, totalMisses: 0, bestCombo: 0, roundsPlayed: 0 };
    }
    if (Object.keys(agg).length === 0) {
      for (const round of history) {
        for (const [id] of Object.entries(round.playerScores)) {
          if (!agg[id]) agg[id] = { name: id, color: '#888', totalScore: 0, totalHits: 0, totalMisses: 0, bestCombo: 0, roundsPlayed: 0 };
        }
      }
    }
    for (const round of history) {
      for (const [id, scores] of Object.entries(round.playerScores)) {
        if (!agg[id]) agg[id] = { name: id, color: '#888', totalScore: 0, totalHits: 0, totalMisses: 0, bestCombo: 0, roundsPlayed: 0 };
        agg[id].totalScore += scores.score;
        agg[id].totalHits += scores.notesHit;
        agg[id].totalMisses += scores.notesMissed;
        if (scores.maxCombo > agg[id].bestCombo) agg[id].bestCombo = scores.maxCombo;
        agg[id].roundsPlayed++;
      }
    }
    cumulative.current = agg;
  }, [history, party.companionPlayers]);

  const sortedPlayers = Object.entries(cumulative.current)
    .sort(([, a], [, b]) => b.totalScore - a.totalScore);
  const winner = sortedPlayers[0];

  return (
    <div className="flex flex-col items-center">
      {winner && (
        <>
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-bold mb-2">Series Champion!</h2>
          <Card className="bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 max-w-md w-full mb-6">
            <CardContent className="py-6 text-center">
              {winner[1].avatar ? (
                <img src={winner[1].avatar} alt={winner[1].name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-amber-500 mx-auto mb-3" />
              ) : (
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold border-4 border-amber-500 mx-auto mb-3"
                  style={{ backgroundColor: winner[1].color }}>
                  {winner[1].name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-3xl font-bold">{winner[1].name}</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{winner[1].totalScore.toLocaleString()} pts</div>
              <div className="text-sm text-white/40 mt-1">
                {history.length} round{history.length !== 1 ? 's' : ''} played
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card className="bg-white/5 border-white/10 w-full max-w-2xl mb-6">
        <CardHeader><CardTitle className="text-center">Final Standings</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedPlayers.map(([id, data], rank) => (
              <div key={id}
                className={`flex items-center justify-between p-3 rounded-lg ${rank === 0 ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30' : 'bg-white/5'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${rank === 0 ? 'bg-amber-500 text-black' : rank === 1 ? 'bg-gray-400 text-black' : rank === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-white/60'}`}>
                    {rank + 1}
                  </div>
                  {data.avatar ? (
                    <img src={data.avatar} alt={data.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                      style={{ backgroundColor: data.color }}>{data.name.charAt(0).toUpperCase()}</div>
                  )}
                  <div>
                    <div className="font-medium">{data.name}</div>
                    <div className="text-xs text-white/40">
                      {data.totalHits} hits • {data.totalMisses} misses • {data.bestCombo}x best combo
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-emerald-400">{data.totalScore.toLocaleString()}</div>
                  <div className="text-xs text-white/40">total</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {history.length > 1 && (
        <Card className="bg-white/5 border-white/10 w-full max-w-2xl mb-6">
          <CardHeader><CardTitle className="text-center">Round History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((round, i) => {
                const roundWinner = Object.entries(round.playerScores)
                  .sort(([, a], [, b]) => b.score - a.score)[0];
                return (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5 text-sm">
                    <div>
                      <span className="text-white/40">Round {i + 1}:</span>{' '}
                      <span className="font-medium">{round.songTitle}</span>
                    </div>
                    <div className="text-emerald-400 font-medium">{roundWinner?.[1].score.toLocaleString()} pts</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={onBack}
        className="px-12 py-4 text-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400">
        🏠 Back to Home
      </Button>
    </div>
  );
}
