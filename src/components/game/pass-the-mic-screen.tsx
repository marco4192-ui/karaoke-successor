'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Song, PlayerProfile, PLAYER_COLORS, LyricLine, Difficulty } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { DIFFICULTY_SETTINGS } from '@/types/game';
import { usePartyStore } from '@/lib/game/party-store';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { findActiveNote, shouldSkipPitch, evaluateAndScoreTick } from '@/lib/game/party-scoring';
import type { PassTheMicRoundResult } from '@/lib/game/party-store';
import { useMobileGameSync } from '@/hooks/use-mobile-game-sync';

// ===================== SHARED TYPES =====================

export interface PassTheMicPlayer {
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

export interface PassTheMicSegment {
  startTime: number;
  endTime: number;
  playerId: string | null;
}

interface PassTheMicSettings {
  segmentDuration: number;
  randomSwitches: boolean;
  difficulty: Difficulty;
  micId: string;
  micName: string;
}

const DEFAULT_SETTINGS: PassTheMicSettings = {
  segmentDuration: 30,
  randomSwitches: true,
  difficulty: 'medium',
  micId: 'default',
  micName: 'Standard',
};

type GamePhase = 'intro' | 'countdown' | 'playing' | 'song-results' | 'series-results';

// ===================== SETUP SCREEN (unchanged) =====================

interface PassTheMicSetupProps {
  profiles: PlayerProfile[];
  onSelectSong: (players: PassTheMicPlayer[], settings: PassTheMicSettings) => void;
  onBack: () => void;
}

export function PassTheMicSetupScreen({ profiles, onSelectSong, onBack }: PassTheMicSetupProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [settings, setSettings] = useState<PassTheMicSettings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string | null>(null);

  const activeProfiles = profiles.filter(p => p.isActive !== false);
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
    const players: PassTheMicPlayer[] = selectedPlayers.map((id, index) => {
      const profile = profiles.find(p => p.id === id);
      return {
        id, name: profile?.name || 'Unknown', avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        score: 0, notesHit: 0, notesMissed: 0, combo: 0, maxCombo: 0,
        isActive: index === 0, segmentsSung: 0,
      };
    });
    onSelectSong(players, { ...settings, difficulty: globalDifficulty });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">← Back</Button>
        <div>
          <h1 className="text-3xl font-bold">🎤 Pass the Mic</h1>
          <p className="text-white/60">Take turns singing parts of a song!</p>
        </div>
      </div>
      {error && <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">{error}</div>}

      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader><CardTitle>Game Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                <Button key={diff} variant={globalDifficulty === diff ? 'default' : 'outline'}
                  onClick={() => setGlobalDifficulty(diff)}
                  className={globalDifficulty === diff ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}>
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
                    ? 'bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border-2 border-cyan-500'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}>
                  <div className="flex items-center gap-3">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: profile.color }}>{profile.name.charAt(0).toUpperCase()}</div>
                    )}
                    <span className="font-medium truncate">{profile.name}</span>
                    {isSelected && <span className="ml-auto text-cyan-400">✓</span>}
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

      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Ready to Play!</h3>
              <p className="text-sm text-white/60">{selectedPlayers.length} players</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-cyan-400">{selectedPlayers.length}</div>
              <div className="text-xs text-white/40">players</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSelectSong} disabled={selectedPlayers.length < 2}
        className="w-full py-6 text-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400">
        🎵 Select Song ({selectedPlayers.length} Players)
      </Button>
    </div>
  );
}

// ===================== GAME VIEW (rewritten with scoring) =====================

interface PassTheMicGameViewProps {
  players: PassTheMicPlayer[];
  song: Song;
  segments: PassTheMicSegment[];
  settings: PassTheMicSettings | null;
  onUpdateGame: (players: PassTheMicPlayer[], segments: PassTheMicSegment[]) => void;
  onEndGame: () => void;
}

function PassTheMicGameView({
  players: initialPlayers, song, segments: initialSegments, settings,
  onUpdateGame, onEndGame,
}: PassTheMicGameViewProps) {
  const safeSettings: PassTheMicSettings = settings ?? DEFAULT_SETTINGS;
  const party = usePartyStore();

  // ── Phase management ──
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [countdown, setCountdown] = useState(3);
  const [switchCountdown, setSwitchCountdown] = useState<number | null>(null);

  // ── URL restoration for Tauri ──
  const [effectiveSong, setEffectiveSong] = useState<Song>(song);
  const [mediaReady, setMediaReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const restoreUrls = async () => {
      try {
        const { ensureSongUrls } = await import('@/lib/game/song-library');
        const restored = await ensureSongUrls(song);
        if (cancelled) return;
        setEffectiveSong(restored);

        // Also check IndexedDB for stored media blobs
        if (restored.storedMedia && !restored.audioUrl) {
          const { getSongMediaUrls } = await import('@/lib/db/media-db');
          const urls = await getSongMediaUrls(restored.id);
          if (cancelled) return;
          if (urls.audioUrl) restored.audioUrl = urls.audioUrl;
          if (urls.videoUrl) restored.videoBackground = urls.videoUrl;
          setEffectiveSong({ ...restored });
        }

        // Verify media is loadable
        const testAudio = new Audio();
        testAudio.preload = 'metadata';
        testAudio.src = restored.audioUrl || restored.videoBackground || '';
        testAudio.addEventListener('canplay', () => { if (!cancelled) setMediaReady(true); });
        testAudio.addEventListener('error', () => { console.warn('[PTM] Media preload error'); if (!cancelled) setMediaReady(true); });
        // Timeout fallback — proceed even if preload fails
        setTimeout(() => { if (!cancelled) setMediaReady(true); }, 3000);
      } catch (err) {
        console.warn('[PTM] URL restoration failed:', err);
        if (!cancelled) { setEffectiveSong(song); setMediaReady(true); }
      }
    };
    restoreUrls();
    return () => { cancelled = true; };
  }, [song]);

  // ── Audio ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // ── Player state (local, mutable for performance) ──
  const playersRef = useRef<PassTheMicPlayer[]>(initialPlayers.map(p => ({
    ...p, score: 0, notesHit: 0, notesMissed: 0, combo: 0, maxCombo: 0,
  })));
  const [, rerender] = useState(0);
  const forceRender = useCallback(() => rerender(n => n + 1), []);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const currentPlayer = playersRef.current[currentPlayerIndex];
  const currentSegment = initialSegments[currentSegmentIndex];

  // ── Pitch detection ──
  const { pitchResult, initialize, start, stop, switchMicrophone } = usePitchDetector();

  // ── Mobile game sync for Pass-the-Mic ──
  useMobileGameSync(effectiveSong, isPlaying && phase === 'playing', 'pass-the-mic');

  // ── Song playing status for Escape handler ──
  useEffect(() => {
    party.setIsSongPlaying(isPlaying && phase === 'playing');
  }, [isPlaying, phase, party]);

  // ── Pause / Resume sync with page.tsx dialog ──
  useEffect(() => {
    if (party.pauseDialogAction === 'song-pause') {
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
    } else if (party.pauseDialogAction === null && isPlaying && phase === 'playing') {
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => {});
    }
  }, [party.pauseDialogAction, isPlaying, phase]);

  // ── Assign segments to players (round-robin) ──
  useEffect(() => {
    const assigned = initialSegments.map((seg, i) => ({
      ...seg,
      playerId: playersRef.current[i % playersRef.current.length].id,
    }));
    onUpdateGame(playersRef.current, assigned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pre-compute scoring metadata ──
  const scoringMeta = useRef<ReturnType<typeof calculateScoringMetadata> | null>(null);
  useEffect(() => {
    if (effectiveSong?.lyrics?.length) {
      const allNotes: Array<{ duration: number; isGolden: boolean }> = [];
      effectiveSong.lyrics.forEach(line => line.notes.forEach(note => {
        allNotes.push({ duration: note.duration, isGolden: note.isGolden });
      }));
      const beatDuration = effectiveSong.bpm ? 15000 / effectiveSong.bpm : 500;
      scoringMeta.current = calculateScoringMetadata(allNotes, beatDuration);
    }
  }, [song]);

  // ── Scoring tick tracking ──
  const lastEvalTimeRef = useRef(0);

  // ── Score the active player based on pitch ──
  const scoreCurrentPlayer = useCallback(() => {
    if (!pitchResult) return;
    const difficulty = safeSettings.difficulty;
    if (shouldSkipPitch(pitchResult, difficulty)) return;

    const ct = currentTime;
    const activeNote = findActiveNote(effectiveSong.lyrics, ct);
    if (!activeNote) return;

    if (ct - lastEvalTimeRef.current < 250) return;
    lastEvalTimeRef.current = ct;

    const tick = evaluateAndScoreTick(pitchResult.note!, activeNote, difficulty, scoringMeta.current);
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
  }, [currentTime, pitchResult, song, safeSettings.difficulty, currentPlayerIndex, forceRender]);

  // ── Game loop: score during playing ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) return;
    const interval = setInterval(scoreCurrentPlayer, 80);
    return () => clearInterval(interval);
  }, [phase, isPlaying, scoreCurrentPlayer]);

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
        setSwitchCountdown(2); // brief swap overlay
      } else {
        // Song finished
        setIsPlaying(false);
        setPhase('song-results');
      }
    }
  }, [phase, isPlaying, currentTime, currentSegment, currentSegmentIndex, initialSegments.length, currentPlayerIndex]);

  // ── Random switch (rare mid-segment) ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !safeSettings.randomSwitches) return;
    const interval = setInterval(() => {
      if (Math.random() < 0.003) {
        const next = (currentPlayerIndex + 1 + Math.floor(Math.random() * (playersRef.current.length - 1))) % playersRef.current.length;
        playersRef.current[currentPlayerIndex].segmentsSung++;
        setCurrentPlayerIndex(next);
        setSwitchCountdown(2);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, isPlaying, safeSettings.randomSwitches, currentPlayerIndex]);

  // ── Switch countdown ──
  useEffect(() => {
    if (switchCountdown === null || switchCountdown <= 0) { setSwitchCountdown(null); return; }
    const timer = setTimeout(() => setSwitchCountdown(p => p !== null ? p - 1 : null), 1000);
    return () => clearTimeout(timer);
  }, [switchCountdown]);

  // ── Mic handoff: when active player switches, re-init pitch detector ──
  useEffect(() => {
    if (phase !== 'playing') return;
    const player = playersRef.current[currentPlayerIndex];
    if (!player) return;

    // If this player has a specific mic assigned, switch to it
    if (player.micId && player.micId !== 'default') {
      switchMicrophone(player.micId).catch(() => {
        console.warn('[PTM] Mic switch failed for player:', player.name);
      });
    }
  }, [currentPlayerIndex, phase, switchMicrophone]);

  // ── Start game (countdown → playing) ──
  const startGame = async () => {
    setPhase('countdown');
    setCountdown(3);
    // Use assigned mic if set and not default
    const micId = safeSettings.micId && safeSettings.micId !== 'default' ? safeSettings.micId : undefined;
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
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.warn('[PTM] Audio play failed:', e));
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Helpers ──
  const progress = effectiveSong.duration > 0 ? (currentTime / effectiveSong.duration) * 100 : 0;
  const segmentTimeLeft = currentSegment
    ? Math.max(0, (currentSegment.endTime - currentTime) / 1000)
    : 0;
  const segmentProgress = currentSegment
    ? ((currentTime - currentSegment.startTime) / (currentSegment.endTime - currentSegment.startTime)) * 100
    : 0;

  const getCurrentLyrics = (): LyricLine | null => {
    if (!effectiveSong.lyrics || effectiveSong.lyrics.length === 0) return null;
    return effectiveSong.lyrics.find((line, i) => {
      const next = effectiveSong.lyrics[i + 1];
      return currentTime >= line.startTime && (!next || currentTime < next.startTime);
    }) || null;
  };
  const currentLyrics = getCurrentLyrics();

  // ── Record this round to series history ──
  const recordRound = useCallback(() => {
    const round: PassTheMicRoundResult = {
      songTitle: effectiveSong.title,
      songArtist: effectiveSong.artist,
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
    party.setPassTheMicSeriesHistory([...party.passTheMicSeriesHistory, round]);
  }, [song, party]);

  // ── Continue series: pick next song ──
  const handleContinue = useCallback(() => {
    // Reset per-song scores but keep player identities
    const resetPlayers = playersRef.current.map(p => ({
      ...p, score: 0, notesHit: 0, notesMissed: 0, combo: 0, maxCombo: 0, segmentsSung: 0,
    }));
    party.setPassTheMicPlayers(resetPlayers);
    // onEndGame will navigate to library (series history is preserved)
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
        src={effectiveSong.audioUrl || effectiveSong.videoBackground || ''}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime * 1000)}
        onEnded={() => {
          if (phase === 'playing') {
            setIsPlaying(false);
            recordRound();
            setPhase('song-results');
          }
        }}
        onError={(e) => console.error('[PTM] Audio error:', e)}
        className="hidden"
        preload="auto"
      />

      {/* ── PHASE: INTRO — show starting player ── */}
      {phase === 'intro' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-5xl mb-6">🎤</div>
          <h2 className="text-2xl font-bold mb-2">Pass the Mic</h2>
          <p className="text-white/60 mb-8">{effectiveSong.title} — {effectiveSong.artist}</p>

          <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 max-w-md w-full mb-6">
            <CardContent className="py-8 text-center">
              <div className="text-sm text-white/60 mb-2">STARTING PLAYER</div>
              <div className="flex items-center justify-center gap-4 mb-4">
                {currentPlayer?.avatar ? (
                  <img src={currentPlayer.avatar} alt={currentPlayer.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-cyan-500" />
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-cyan-500"
                    style={{ backgroundColor: currentPlayer?.color }}>
                    {currentPlayer?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-3xl font-bold">{currentPlayer?.name}</span>
              </div>
              <div className="text-sm text-white/40">
                {playersRef.current.length} players • {safeSettings.segmentDuration}s segments
                {safeSettings.micId && safeSettings.micId !== 'default' && (
                  <span> • 🎤 {safeSettings.micName}</span>
                )}
                {party.passTheMicSeriesHistory.length > 0 && (
                  <span> • Round {party.passTheMicSeriesHistory.length + 1}</span>
                )}
              </div>
            </CardContent>
          </Card>

          {!mediaReady && (
            <div className="mb-4 text-center">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
              <p className="text-white/40 text-sm mt-2">Loading song...</p>
            </div>
          )}
          <Button onClick={startGame} disabled={!mediaReady}
            className="px-12 py-4 text-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50">
            🎤 Start Singing!
          </Button>
        </div>
      )}

      {/* ── PHASE: COUNTDOWN ── */}
      {phase === 'countdown' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-8xl font-bold text-cyan-400 animate-pulse">{countdown}</div>
          <p className="text-white/60 mt-4">Get ready...</p>
        </div>
      )}

      {/* ── PHASE: PLAYING ── */}
      {phase === 'playing' && (
        <>
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-cyan-500/20 text-cyan-400 text-lg px-3 py-1">🎤 PASS THE MIC</Badge>
              <span className="text-white/60 text-sm">{effectiveSong.title}</span>
            </div>
            <Badge className="bg-purple-500/20 text-purple-400">
              Segment {currentSegmentIndex + 1}/{initialSegments.length}
            </Badge>
          </div>

          {/* Current Player */}
          <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 mb-3">
            <CardContent className="py-4">
              {switchCountdown !== null ? (
                <div className="text-center">
                  <div className="text-3xl text-yellow-400 animate-pulse mb-2">
                    🔄 Passing the Mic!
                  </div>
                  <div className="text-lg font-bold">
                    Next: {playersRef.current[(currentPlayerIndex + 1) % playersRef.current.length].name}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {currentPlayer?.avatar ? (
                      <img src={currentPlayer.avatar} alt={currentPlayer.name}
                        className="w-14 h-14 rounded-full object-cover border-3 border-cyan-500" />
                    ) : (
                      <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-3 border-cyan-500"
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
                    <div className="text-3xl font-bold text-cyan-400">{currentPlayer?.score.toLocaleString()}</div>
                    <div className="text-xs text-white/40">points</div>
                    {currentPlayer?.combo > 0 && (
                      <div className="text-sm text-amber-400">🔥 {currentPlayer.combo}x combo</div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Segment Timer */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>Segment Time</span>
              <span>{Math.ceil(segmentTimeLeft)}s remaining</span>
            </div>
            <Progress value={segmentProgress} className="h-3 bg-white/10" />
          </div>

          {/* Song Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>Song Progress</span>
              <span>{Math.floor(currentTime / 60000)}:{Math.floor((currentTime % 60000) / 1000).toString().padStart(2, '0')} / {Math.floor(effectiveSong.duration / 60000)}:{Math.floor((effectiveSong.duration % 60000) / 1000).toString().padStart(2, '0')}</span>
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
                      ? 'bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border-2 border-cyan-500 scale-105'
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
          <div className="text-5xl mb-4">🎤</div>
          <h2 className="text-2xl font-bold mb-1">{effectiveSong.title}</h2>
          <p className="text-white/60 mb-6">{effectiveSong.artist}</p>

          <Card className="bg-white/5 border-white/10 w-full max-w-2xl mb-6">
            <CardHeader><CardTitle className="text-center">Round Results</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Sort players by score descending */}
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
                            {player.notesHit} hits • {player.notesMissed} misses • {player.maxCombo}x max combo
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-cyan-400">{player.score.toLocaleString()}</div>
                        <div className="text-xs text-white/40">points</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 w-full max-w-2xl">
            <Button onClick={handleContinue}
              className="flex-1 py-4 text-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400">
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
        <PassTheMicSeriesResults onBack={() => {
          // Clean up all PTM state
          party.setPassTheMicPlayers([]);
          party.setPassTheMicSong(null);
          party.setPassTheMicSegments([]);
          party.setPassTheMicSettings(null);
          party.setPassTheMicSeriesHistory([]);
          onEndGame();
        }} />
      )}
    </div>
  );
}

// ===================== SERIES RESULTS =====================

function PassTheMicSeriesResults({ onBack }: { onBack: () => void }) {
  const party = usePartyStore();
  const history = party.passTheMicSeriesHistory;

  // Aggregate scores across all rounds
  const cumulative = useRef<Record<string, { name: string; avatar?: string; color: string; totalScore: number; totalHits: number; totalMisses: number; bestCombo: number; roundsPlayed: number }>>({});
  useEffect(() => {
    const agg: typeof cumulative.current = {};
    // Collect player identities from the current store
    for (const p of party.passTheMicPlayers) {
      agg[p.id] = { name: p.name, avatar: p.avatar, color: p.color, totalScore: 0, totalHits: 0, totalMisses: 0, bestCombo: 0, roundsPlayed: 0 };
    }
    // If no players in store (already cleared), extract from history
    if (Object.keys(agg).length === 0) {
      for (const round of history) {
        for (const [id] of Object.entries(round.playerScores)) {
          if (!agg[id]) agg[id] = { name: id, color: '#888', totalScore: 0, totalHits: 0, totalMisses: 0, bestCombo: 0, roundsPlayed: 0 };
        }
      }
    }
    // Accumulate
    for (const round of history) {
      for (const [id, scores] of Object.entries(round.playerScores)) {
        if (!agg[id]) agg[id] = { name: id, color: '#888', totalScore: 0, totalHits: 0, totalMisses: 0, bestCombo: 0, roundsPlayed: 0 };
        agg[id].totalScore += scores.score;
        agg[id].totalHits += scores.notesHit;
        agg[id].totalMisses += scores.notesMisses;
        if (scores.maxCombo > agg[id].bestCombo) agg[id].bestCombo = scores.maxCombo;
        agg[id].roundsPlayed++;
      }
    }
    cumulative.current = agg;
  }, [history, party.passTheMicPlayers]);

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
                  <div className="text-xl font-bold text-cyan-400">{data.totalScore.toLocaleString()}</div>
                  <div className="text-xs text-white/40">total</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Round history */}
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
                    <div className="text-cyan-400 font-medium">{roundWinner?.[1].score.toLocaleString()} pts</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={onBack}
        className="px-12 py-4 text-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400">
        🏠 Back to Home
      </Button>
    </div>
  );
}
