'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useMultiPitchDetector, type PlayerPitchConfig } from '@/hooks/use-multi-pitch-detector';
import { usePartyStore } from '@/lib/game/party-store';
import { evaluateTick, calculateTickPoints, calculateScoringMetadata } from '@/lib/game/scoring';
import { DIFFICULTY_SETTINGS } from '@/types/game';
import { ensureSongUrls } from '@/lib/game/song-library';
import type { Note, LyricLine, PitchDetectionResult } from '@/types/game';
import type {
  MedleyPlayer, MedleySong, MedleySettings, SnippetMatchup,
  MedleyGamePhase, MedleyRoundResult, MedleyPlayerRoundScore,
} from './medley-types';

// ===================== PROPS =====================

interface MedleyGameScreenProps {
  players: MedleyPlayer[];
  songs: MedleySong[];
  settings: MedleySettings;
  matchups: SnippetMatchup[];
  /** Cumulative series history (from previous rounds) */
  seriesHistory: MedleyRoundResult[];
  onRoundComplete: (result: MedleyRoundResult, updatedPlayers: MedleyPlayer[]) => void;
  onEndGame: () => void;
}

// ===================== COMPONENT =====================

export function MedleyGameScreen({
  players: initialPlayers,
  songs: medleySongs,
  settings,
  matchups,
  seriesHistory,
  onRoundComplete,
  onEndGame,
}: MedleyGameScreenProps) {
  // Subscribe to specific fields only (NOT the entire store) to minimize re-renders.
  // Using the whole store (usePartyStore()) causes React #185 when any
  // unrelated party state change triggers a re-render during the mount cycle.
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const isTeam = settings.playMode === 'team';

  // ── Phase ──
  const [phase, setPhase] = useState<MedleyGamePhase>('intro');
  const [countdown, setCountdown] = useState(3);
  const [transitionCount, setTransitionCount] = useState(3);

  // ── Current snippet ──
  const [currentSnippetIdx, setCurrentSnippetIdx] = useState(0);
  const currentSnippet = medleySongs[currentSnippetIdx] || null;

  // ── Audio ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // ── Players (mutable ref for performance) ──
  const playersRef = useRef<MedleyPlayer[]>(
    initialPlayers.map(p => ({ ...p, score: 0, notesHit: 0, notesMissed: 0, combo: 0, maxCombo: 0, snippetsSung: 0 })),
  );
  const [playersDisplay, setPlayersDisplay] = useState<MedleyPlayer[]>(playersRef.current);
  const forceRender = useCallback(() => setPlayersDisplay([...playersRef.current]), []);

  // ── Snippet notes (for lyrics display) ──
  const [snippetNotes, setSnippetNotes] = useState<Note[]>([]);
  const [snippetLyrics, setSnippetLyrics] = useState<LyricLine[]>([]);

  // ── Multi-pitch detection (one detector per player) ──
  const playerConfigs = useMemo<PlayerPitchConfig[]>(() =>
    initialPlayers.map(p => ({
      playerId: p.id,
      type: p.inputType,
      deviceId: p.micId,
      mobileClientId: p.mobileClientId,
    })),
    [initialPlayers],
  );

  const multiPitch = useMultiPitchDetector({
    players: playerConfigs,
    difficulty: settings.difficulty,
    autoStart: false,
  });

  // ── Scoring metadata ──
  const scoringMetaRef = useRef<ReturnType<typeof calculateScoringMetadata> | null>(null);
  // Per-player last evaluation time for throttling
  const lastEvalTimeRef = useRef<Record<string, number>>({});

  // ── Song playing status (ref-guarded to prevent React #185) ──
  // Track last value to avoid calling setIsSongPlaying when value hasn't changed.
  const lastIsSongPlayingRef = useRef(false);
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
    } else if (pauseDialogAction === null && isPlaying && phase === 'playing') {
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => {});
    }
  }, [pauseDialogAction, isPlaying, phase]);

  // ── Prepare snippet audio + notes ──
  useEffect(() => {
    if (!currentSnippet) return;
    let cancelled = false;

    const prepare = async () => {
      setAudioReady(false);
      setAudioUrl(null);
      setAudioError(null);

      try {
        const prepared = await ensureSongUrls(currentSnippet.song);
        if (cancelled) return;

        if (prepared.audioUrl) {
          setAudioUrl(prepared.audioUrl);
        } else {
          setAudioError('Kein Audio verfügbar');
        }

        // Extract notes within snippet range
        const notes: Note[] = [];
        const lyrics: LyricLine[] = [];
        if (prepared.lyrics) {
          for (const line of prepared.lyrics) {
            const lineNotes = line.notes.filter(
              n => n.startTime < currentSnippet.endTime && (n.startTime + n.duration) > currentSnippet.startTime,
            );
            if (lineNotes.length > 0) {
              notes.push(...lineNotes);
              lyrics.push(line);
            }
          }
        }
        notes.sort((a, b) => a.startTime - b.startTime);
        setSnippetNotes(notes);
        setSnippetLyrics(lyrics);

        // Compute scoring metadata
        if (notes.length > 0 && prepared.bpm) {
          const beatDuration = 15000 / prepared.bpm;
          scoringMetaRef.current = calculateScoringMetadata(notes, beatDuration);
        } else {
          scoringMetaRef.current = null;
        }
      } catch (err) {
        if (!cancelled) setAudioError('Audio-Laden fehlgeschlagen');
      }
    };

    prepare();
    return () => { cancelled = true; };
  }, [currentSnippet?.song.id, currentSnippetIdx]);

  // ── Audio element ──
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
    }
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onReady = () => { setAudioReady(true); };
    const onErr = () => { setAudioError('Audio-Laden fehlgeschlagen'); setAudioReady(false); };
    audio.addEventListener('canplay', onReady);
    audio.addEventListener('error', onErr);
    return () => { audio.removeEventListener('canplay', onReady); audio.removeEventListener('error', onErr); };
  }, [audioUrl]);

  // ── Get current lyric line ──
  const currentLyricLine = useMemo(() => {
    if (!snippetLyrics.length || !currentSnippet) return null;
    const songTime = currentTimeMs;
    const absoluteTime = currentSnippet.startTime + currentTimeMs;
    return snippetLyrics.find(line => {
      const nextLine = snippetLyrics[snippetLyrics.indexOf(line) + 1];
      return absoluteTime >= line.startTime && (!nextLine || absoluteTime < nextLine.startTime);
    }) || null;
  }, [currentTimeMs, snippetLyrics, currentSnippet]);

  // ── Get active players for current snippet ──
  const getActivePlayerIds = useCallback((): string[] => {
    if (isTeam) {
      // Team: only the two matched players sing
      if (currentSnippetIdx < matchups.length) {
        const matchup = matchups[currentSnippetIdx];
        return [matchup.playerA.id, matchup.playerB.id];
      }
      return [];
    }
    // FFA: ALL players sing simultaneously
    return playersRef.current.map(p => p.id);
  }, [isTeam, currentSnippetIdx, matchups]);

  // ── Score a single player based on THEIR pitch result ──
  const scorePlayer = useCallback((
    playerId: string,
    pitch: PitchDetectionResult | null,
    absTime: number,
  ) => {
    if (!pitch?.frequency || pitch.note === null) return;
    if (pitch.volume < DIFFICULTY_SETTINGS[settings.difficulty].volumeThreshold) return;
    if (pitch.isSinging === false) return;
    if (!scoringMetaRef.current || !currentSnippet) return;

    const beatDuration = currentSnippet.song.bpm ? 15000 / currentSnippet.song.bpm : 500;

    for (const note of snippetNotes) {
      const noteEnd = note.startTime + note.duration;
      if (absTime >= note.startTime && absTime <= noteEnd) {
        // Throttle: evaluate every ~250ms per player
        const lastEval = lastEvalTimeRef.current[playerId] || 0;
        if (absTime - lastEval < 250) return;
        lastEvalTimeRef.current[playerId] = absTime;

        const result = evaluateTick(pitch.note, note.pitch, settings.difficulty);
        const pIdx = playersRef.current.findIndex(p => p.id === playerId);
        if (pIdx === -1) return;
        const p = playersRef.current[pIdx];

        if (result.isHit) {
          const tickPts = calculateTickPoints(result.accuracy, note.isGolden, scoringMetaRef.current!.pointsPerTick, settings.difficulty);
          const pts = Math.max(1, Math.round(tickPts));
          p.score += pts;
          p.notesHit++;
          p.combo++;
          if (p.combo > p.maxCombo) p.maxCombo = p.combo;
        } else {
          p.combo = 0;
          p.notesMissed++;
        }

        playersRef.current[pIdx] = { ...p };
        return;
      }
    }
  }, [snippetNotes, currentSnippet, settings.difficulty]);

  // ── Game loop ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !currentSnippet) return;

    const loop = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || audio.paused) return;

      const songTimeMs = audio.currentTime * 1000;
      const snippetTime = songTimeMs - currentSnippet.startTime;
      setCurrentTimeMs(snippetTime);

      // Check snippet end
      if (songTimeMs >= currentSnippet.endTime) {
        audio.pause();
        setIsPlaying(false);

        // Count snippet as sung for active players
        const activeIds = getActivePlayerIds();
        activeIds.forEach(id => {
          const p = playersRef.current.find(p => p.id === id);
          if (p) p.snippetsSung++;
        });
        forceRender();

        // Move to next or round-results
        if (currentSnippetIdx < medleySongs.length - 1) {
          setPhase('transition');
        } else {
          setPhase('round-results');
        }
        return;
      }

      // Score ALL active players individually using their own pitch
      const absTime = currentSnippet.startTime + snippetTime;
      const activeIds = getActivePlayerIds();
      for (const pid of activeIds) {
        const playerPitch = multiPitch.getPlayerPitch(pid);
        scorePlayer(pid, playerPitch, absTime);
      }
    }, 80);

    return () => clearInterval(loop);
  }, [phase, isPlaying, currentSnippet, currentSnippetIdx, scorePlayer, getActivePlayerIds, multiPitch, forceRender]);

  // ── Transition: pulse then next snippet ──
  useEffect(() => {
    if (phase !== 'transition') return;
    setTransitionCount(3);

    const interval = setInterval(() => {
      setTransitionCount(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          const nextIdx = currentSnippetIdx + 1;
          setCurrentSnippetIdx(nextIdx);
          setPhase('playing');
          return 3;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, currentSnippetIdx]);

  // ── Start game ──
  const handleStart = useCallback(async () => {
    setPhase('countdown');
    setCountdown(3);

    // Initialize multi-pitch detection (one mic per player)
    try {
      const ok = await multiPitch.initialize();
      if (ok) multiPitch.start();
    } catch (e) {
      console.warn('[Medley] Multi-pitch init failed:', e);
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setPhase('playing');
          if (audioRef.current && currentSnippet) {
            audioRef.current.currentTime = currentSnippet.startTime / 1000;
            audioRef.current.play().catch(e => console.warn('[Medley] Play failed:', e));
            setIsPlaying(true);
            setCurrentTimeMs(0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [multiPitch, currentSnippet]);

  // ── Round complete ──
  const handleRoundComplete = useCallback(() => {
    // Build round result
    const roundResult: MedleyRoundResult = {
      playedAt: Date.now(),
      snippetCount: medleySongs.length,
      playerScores: {},
      teamScores: isTeam
        ? {
            teamA: playersRef.current.filter(p => p.team === 0).reduce((s, p) => s + p.score, 0),
            teamB: playersRef.current.filter(p => p.team === 1).reduce((s, p) => s + p.score, 0),
          }
        : undefined,
    };
    for (const p of playersRef.current) {
      roundResult.playerScores[p.id] = {
        score: p.score,
        notesHit: p.notesHit,
        notesMissed: p.notesMissed,
        maxCombo: p.maxCombo,
        snippetsSung: p.snippetsSung,
      };
    }

    onRoundComplete(roundResult, [...playersRef.current]);
  }, [medleySongs.length, isTeam, onRoundComplete]);

  // ── End song early ──
  const handleEndEarly = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    setIsPlaying(false);
    multiPitch.stop();

    if (currentSnippetIdx < medleySongs.length - 1) {
      setPhase('transition');
    } else {
      setPhase('round-results');
    }
  }, [currentSnippetIdx, medleySongs.length, multiPitch]);

  // ── Cleanup ──
  useEffect(() => {
    return () => { multiPitch.stop(); };
  }, [multiPitch]);

  // ── Helpers ──
  const snippetProgress = currentSnippet
    ? (currentTimeMs / currentSnippet.duration) * 100
    : 0;
  const totalProgress = medleySongs.length > 0
    ? (currentSnippetIdx / medleySongs.length) * 100
    : 0;

  // Current matchup (team mode)
  const currentMatchup = isTeam && currentSnippetIdx < matchups.length
    ? matchups[currentSnippetIdx]
    : null;

  // ===================== RENDER =====================

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        className="hidden"
        preload="auto"
        onError={() => setAudioError('Audio-Fehler')}
      />

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-5xl mb-6">🎵</div>
          <h2 className="text-3xl font-bold mb-2">Medley Contest</h2>
          <p className="text-white/60 mb-6">
            {medleySongs.length} Snippets · {settings.snippetDuration}s pro Song
            {isTeam && ` · ${settings.teamSize} vs ${settings.teamSize}`}
          </p>

          {/* Player cards */}
          <div className="w-full max-w-3xl space-y-3 mb-8">
            {isTeam ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Badge className="bg-blue-500/30 text-blue-300 mb-2">Team A</Badge>
                  <div className="space-y-2">
                    {playersRef.current.filter(p => p.team === 0).map(p => (
                      <PlayerIntroCard key={p.id} player={p} inputLabel={p.inputType === 'local' ? (p.micName || 'Mic') : 'Companion'} />
                    ))}
                  </div>
                </div>
                <div>
                  <Badge className="bg-red-500/30 text-red-300 mb-2">Team B</Badge>
                  <div className="space-y-2">
                    {playersRef.current.filter(p => p.team === 1).map(p => (
                      <PlayerIntroCard key={p.id} player={p} inputLabel={p.inputType === 'local' ? (p.micName || 'Mic') : 'Companion'} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {playersRef.current.map(p => (
                  <PlayerIntroCard key={p.id} player={p} inputLabel={p.inputType === 'local' ? (p.micName || 'Mic') : 'Companion'} />
                ))}
              </div>
            )}
          </div>

          {/* Mic init errors */}
          {multiPitch.errors.size > 0 && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mb-4 max-w-lg text-center">
              <p className="text-yellow-400 text-sm">
                ⚠️ Mikrofon-Warnung: {Array.from(multiPitch.errors.values()).join(', ')}
              </p>
            </div>
          )}

          {seriesHistory.length > 0 && (
            <p className="text-white/40 mb-4">Runde {seriesHistory.length + 1}</p>
          )}

          <Button onClick={handleStart}
            className="px-12 py-4 text-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400">
            🎤 Start!
          </Button>
        </div>
      )}

      {/* ── COUNTDOWN ── */}
      {phase === 'countdown' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-8xl font-bold text-purple-400 animate-pulse">{countdown}</div>
          <p className="text-white/60 mt-4">Macht euch bereit...</p>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === 'playing' && currentSnippet && (
        <>
          {/* Top bar: badge + progress */}
          <div className="flex-shrink-0 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-500/20 text-purple-400 text-sm px-2 py-0.5">🎵 MEDLEY</Badge>
                <span className="text-white/60 text-sm">Song {currentSnippetIdx + 1}/{medleySongs.length}</span>
                {!isTeam && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5">FFA</Badge>
                )}
              </div>
              {isTeam && currentMatchup && (
                <div className="flex items-center gap-2 text-sm">
                  <span style={{ color: currentMatchup.playerA.color }}>{currentMatchup.playerA.name}</span>
                  <span className="text-white/40">vs</span>
                  <span style={{ color: currentMatchup.playerB.color }}>{currentMatchup.playerB.name}</span>
                </div>
              )}
            </div>
            {/* Per-player live scores */}
            <div className="flex items-center gap-3">
              {[...playersRef.current].sort((a, b) => b.score - a.score).map((p) => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-xs font-medium" style={{ color: p.color }}>{p.name}: {p.score}</span>
                  {p.combo > 2 && (
                    <span className="text-xs text-amber-400">{p.combo}x</span>
                  )}
                </div>
              ))}
            </div>
            <Progress value={totalProgress} className="h-1.5 bg-white/10" />
          </div>

          {/* Main game area */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0">
            {/* Song info + timer */}
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold">{currentSnippet.song.title}</h3>
              <p className="text-white/60 text-sm">{currentSnippet.song.artist}</p>
              <div className="text-2xl font-mono text-purple-400 mt-1">
                {Math.max(0, Math.ceil((currentSnippet.duration - currentTimeMs) / 1000))}s
              </div>
            </div>

            {/* Lyrics */}
            {currentLyricLine && (
              <div className="bg-black/30 rounded-xl px-8 py-4 mb-4 max-w-lg">
                <div className="text-center text-xl font-bold text-white">{currentLyricLine.text}</div>
              </div>
            )}

            {/* Notes display (simplified: current note position) */}
            {snippetNotes.length > 0 && (
              <div className="w-full max-w-lg bg-black/20 rounded-lg p-2 mb-4 overflow-hidden h-16 flex items-end">
                <div className="flex gap-0.5 w-full">
                  {snippetNotes.map((note, i) => {
                    const absoluteTime = currentSnippet.startTime + currentTimeMs;
                    const isActive = absoluteTime >= note.startTime && absoluteTime <= note.startTime + note.duration;
                    const isPast = absoluteTime > note.startTime + note.duration;
                    const relStart = (note.startTime - currentSnippet.startTime) / currentSnippet.duration * 100;
                    const width = Math.max(2, (note.duration / currentSnippet.duration) * 100);
                    const height = 20 + (note.pitch % 24) * 2;

                    return (
                      <div
                        key={`${note.startTime}-${i}`}
                        className={`flex-shrink-0 rounded-sm transition-all ${isActive ? 'opacity-100' : isPast ? 'opacity-30' : 'opacity-50'}`}
                        style={{
                          height: `${height}px`,
                          width: `${width}%`,
                          backgroundColor: isActive
                            ? (note.isGolden ? '#fbbf24' : '#a855f7')
                            : isPast
                              ? (note.isGolden ? '#92400e' : '#581c87')
                              : (note.isGolden ? '#fbbf2440' : '#a855f740'),
                          marginLeft: i === 0 ? `${relStart}%` : '0',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Per-player pitch indicators */}
            <div className="flex gap-6 items-center justify-center">
              {(isTeam && currentMatchup
                ? [currentMatchup.playerA, currentMatchup.playerB]
                : playersRef.current
              ).map(p => (
                <PitchIndicator
                  key={p.id}
                  player={p}
                  pitch={multiPitch.getPlayerPitch(p.id)}
                />
              ))}
            </div>
          </div>

          {/* Snippet timer */}
          <div className="flex-shrink-0 px-3 pb-3">
            <Progress value={snippetProgress} className="h-2 bg-white/10" />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>Snippet {currentSnippetIdx + 1}/{medleySongs.length}</span>
              <button onClick={handleEndEarly} className="text-red-400/60 hover:text-red-400 transition-colors">
                Beenden
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── TRANSITION (pulse) ── */}
      {phase === 'transition' && currentSnippet && (
        <div className="flex-1 flex flex-col items-center justify-center animate-pulse">
          <div className="text-5xl mb-4">🔄</div>
          <div className="text-3xl font-bold text-pink-400 mb-2">{transitionCount}</div>
          <p className="text-white/60 mb-4">Nächstes Snippet...</p>

          {/* Preview next players */}
          {isTeam && currentSnippetIdx + 1 < matchups.length && (() => {
            const next = matchups[currentSnippetIdx + 1];
            return (
              <div className="bg-black/30 rounded-xl p-4 text-center">
                <p className="text-sm text-white/40 mb-1">NÄCHSTER SONG</p>
                <h3 className="text-lg font-bold">{medleySongs[currentSnippetIdx + 1]?.song.title}</h3>
                <p className="text-white/60 text-sm">{medleySongs[currentSnippetIdx + 1]?.song.artist}</p>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <span className="text-sm" style={{ color: next.playerA.color }}>{next.playerA.name}</span>
                  <span className="text-white/40">vs</span>
                  <span className="text-sm" style={{ color: next.playerB.color }}>{next.playerB.name}</span>
                </div>
              </div>
            );
          })()}

          {!isTeam && currentSnippetIdx + 1 < medleySongs.length && (
            <div className="bg-black/30 rounded-xl p-4 text-center">
              <p className="text-sm text-white/40 mb-1">NÄCHSTER SONG</p>
              <h3 className="text-lg font-bold">{medleySongs[currentSnippetIdx + 1]?.song.title}</h3>
              <p className="text-white/60 text-sm">{medleySongs[currentSnippetIdx + 1]?.song.artist}</p>
              <p className="text-xs text-white/40 mt-2">Alle Spieler singen weiter!</p>
            </div>
          )}
        </div>
      )}

      {/* ── ROUND RESULTS ── */}
      {phase === 'round-results' && (
        <div className="flex-1 overflow-y-auto p-4">
          <MedleyRoundResults
            players={playersRef.current}
            settings={settings}
            seriesHistory={seriesHistory}
            roundNumber={seriesHistory.length + 1}
            onNextRound={() => {
              // Reset isSongPlaying before navigating away (prevents stale state)
              setIsSongPlaying(false);
              lastIsSongPlayingRef.current = false;
              onEndGame();
            }}
            onEndSeries={() => {
              setIsSongPlaying(false);
              lastIsSongPlayingRef.current = false;
              setPhase('final-results');
            }}
            onRecordAndEnd={handleRoundComplete}
          />
        </div>
      )}

      {/* ── FINAL RESULTS ── */}
      {phase === 'final-results' && (
        <div className="flex-1 overflow-y-auto p-4">
          <MedleyFinalResults
            players={playersRef.current}
            settings={settings}
            seriesHistory={seriesHistory}
            onBack={onEndGame}
          />
        </div>
      )}

      {/* Audio error */}
      {audioError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/30 px-4 py-2 rounded-lg text-red-400 text-sm">
          {audioError}
        </div>
      )}
    </div>
  );
}

// ===================== SUB-COMPONENTS =====================

function PlayerIntroCard({ player, inputLabel }: { player: MedleyPlayer; inputLabel: string }) {
  return (
    <div className="bg-white/5 border rounded-lg p-3" style={{ borderColor: player.color + '60' }}>
      <div className="flex items-center gap-3">
        {player.avatar ? (
          <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover border-2" style={{ borderColor: player.color }} />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2"
            style={{ borderColor: player.color, backgroundColor: player.color + '40' }}>
            {player.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate" style={{ color: player.color }}>{player.name}</div>
          <div className="text-xs text-white/40">{inputLabel}</div>
        </div>
      </div>
    </div>
  );
}

/** Per-player pitch indicator using individual pitch detection result */
function PitchIndicator({ player, pitch }: { player: MedleyPlayer; pitch: PitchDetectionResult | null }) {
  const isSinging = pitch?.isSinging === true && (pitch?.volume ?? 0) > 0.05;

  // Calculate a simple accuracy visualization (0-100) based on clarity + singing state
  const accuracy = isSinging && pitch?.clarity != null
    ? Math.min(100, Math.round(pitch.clarity * 100))
    : 0;

  return (
    <div className="flex flex-col items-center gap-1 min-w-[60px]">
      {/* Colored ring with pulse on singing */}
      <div
        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${isSinging ? 'scale-110' : 'scale-100'}`}
        style={{
          borderColor: player.color,
          backgroundColor: isSinging ? player.color + '30' : 'transparent',
          boxShadow: isSinging ? `0 0 12px ${player.color}40` : 'none',
        }}
      >
        <div
          className={`w-5 h-5 rounded-full transition-all ${isSinging ? 'animate-pulse' : ''}`}
          style={{
            backgroundColor: isSinging ? player.color : player.color + '20',
            opacity: isSinging ? 1 : 0.3,
          }}
        />
      </div>
      {/* Player name */}
      <span className="text-xs font-medium" style={{ color: player.color }}>
        {player.name}
      </span>
      {/* Accuracy bar */}
      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-150"
          style={{ width: `${accuracy}%`, backgroundColor: player.color }}
        />
      </div>
    </div>
  );
}

// ===================== ROUND RESULTS =====================

interface MedleyRoundResultsProps {
  players: MedleyPlayer[];
  settings: MedleySettings;
  seriesHistory: MedleyRoundResult[];
  roundNumber: number;
  onNextRound: () => void;
  onEndSeries: () => void;
  onRecordAndEnd: () => void;
}

function MedleyRoundResults({
  players, settings, seriesHistory, roundNumber,
  onNextRound, onEndSeries, onRecordAndEnd,
}: MedleyRoundResultsProps) {
  const isTeam = settings.playMode === 'team';
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  const teamAScore = players.filter(p => p.team === 0).reduce((s, p) => s + p.score, 0);
  const teamBScore = players.filter(p => p.team === 1).reduce((s, p) => s + p.score, 0);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🎵</div>
        <h2 className="text-2xl font-bold">Runde {roundNumber} abgeschlossen!</h2>
      </div>

      {/* Team comparison */}
      {isTeam && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
            <div className="text-sm text-blue-300 mb-1">Team A</div>
            <div className="text-2xl font-bold text-blue-400">{teamAScore}</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
            <div className="text-sm text-red-300 mb-1">Team B</div>
            <div className="text-2xl font-bold text-red-400">{teamBScore}</div>
          </div>
        </div>
      )}

      {/* Player standings */}
      <div className="space-y-2 mb-6">
        {sorted.map((player, rank) => (
          <div key={player.id}
            className={`flex items-center justify-between p-3 rounded-lg ${rank === 0 ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30' : 'bg-white/5'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${rank === 0 ? 'bg-amber-500 text-black' : rank === 1 ? 'bg-gray-400 text-black' : 'bg-white/10'}`}>
                {rank + 1}
              </div>
              {player.avatar ? (
                <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: player.color }}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-medium text-sm">{player.name}</div>
                <div className="text-xs text-white/40">
                  {player.notesHit} Hits · {player.notesMissed} Miss · {player.maxCombo}x Combo
                  {isTeam && <span> · Team {player.team === 0 ? 'A' : 'B'}</span>}
                </div>
              </div>
            </div>
            <div className="text-lg font-bold text-purple-400">{player.score}</div>
          </div>
        ))}
      </div>

      {winner && (
        <div className="text-center mb-6 text-lg">
          🏆 <span className="font-bold" style={{ color: winner.color }}>{winner.name}</span> führt!
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => { onRecordAndEnd(); onNextRound(); }}
          className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400">
          🎵 Nächste Runde
        </Button>
        <Button onClick={() => { onRecordAndEnd(); onEndSeries(); }}
          variant="outline" className="flex-1 py-3 border-white/20 text-white/60 hover:text-white">
          🏆 Endauswertung
        </Button>
      </div>
    </div>
  );
}

// ===================== FINAL RESULTS =====================

function MedleyFinalResults({
  players, settings, seriesHistory, onBack,
}: {
  players: MedleyPlayer[];
  settings: MedleySettings;
  seriesHistory: MedleyRoundResult[];
  onBack: () => void;
}) {
  const isTeam = settings.playMode === 'team';

  // Aggregate across all rounds (series history + current round)
  const cumulative = useRef<Record<string, { name: string; avatar?: string; color: string; team: number; totalScore: number; totalHits: number; totalMisses: number; bestCombo: number; roundsPlayed: number }>>({});
  useEffect(() => {
    const agg: typeof cumulative.current = {};
    for (const p of players) {
      agg[p.id] = { name: p.name, avatar: p.avatar, color: p.color, team: p.team, totalScore: p.score, totalHits: p.notesHit, totalMisses: p.notesMissed, bestCombo: p.maxCombo, roundsPlayed: 1 };
    }
    for (const round of seriesHistory) {
      for (const [id, scores] of Object.entries(round.playerScores)) {
        if (!agg[id]) continue;
        agg[id].totalScore += scores.score;
        agg[id].totalHits += scores.notesHit;
        agg[id].totalMisses += scores.notesMissed;
        if (scores.maxCombo > agg[id].bestCombo) agg[id].bestCombo = scores.maxCombo;
        agg[id].roundsPlayed++;
      }
    }
    cumulative.current = agg;
  }, [players, seriesHistory]);

  const sorted = Object.entries(cumulative.current).sort(([, a], [, b]) => b.totalScore - a.totalScore);
  const winner = sorted[0];

  const teamATotal = Object.values(cumulative.current).filter(p => p.team === 0).reduce((s, p) => s + p.totalScore, 0);
  const teamBTotal = Object.values(cumulative.current).filter(p => p.team === 1).reduce((s, p) => s + p.totalScore, 0);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-6xl mb-2">🏆</div>
        <h2 className="text-3xl font-bold">{isTeam ? 'Team-Sieger!' : 'Medley Champion!'}</h2>
        <p className="text-white/60">{seriesHistory.length + 1} Runde{nrc_round(seriesHistory.length)}</p>
      </div>

      {/* Team total */}
      {isTeam && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`rounded-lg p-4 text-center ${teamATotal >= teamBTotal ? 'bg-blue-500/20 border-2 border-blue-500' : 'bg-blue-500/10 border border-blue-500/30'}`}>
            <div className="text-sm text-blue-300 mb-1">Team A</div>
            <div className="text-3xl font-bold text-blue-400">{teamATotal}</div>
          </div>
          <div className={`rounded-lg p-4 text-center ${teamBTotal > teamATotal ? 'bg-red-500/20 border-2 border-red-500' : 'bg-red-500/10 border border-red-500/30'}`}>
            <div className="text-sm text-red-300 mb-1">Team B</div>
            <div className="text-3xl font-bold text-red-400">{teamBTotal}</div>
          </div>
        </div>
      )}

      {/* Winner card */}
      {winner && (
        <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 rounded-lg p-6 text-center mb-6">
          {(() => {
            const w = winner[1];
            return (
              <>
                {w.avatar ? (
                  <img src={w.avatar} alt={w.name} className="w-20 h-20 rounded-full object-cover border-4 border-amber-500 mx-auto mb-3" />
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-amber-500 mx-auto mb-3"
                    style={{ backgroundColor: w.color }}>{w.name.charAt(0).toUpperCase()}</div>
                )}
                <div className="text-2xl font-bold" style={{ color: w.color }}>{w.name}</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">{w.totalScore.toLocaleString()} pts</div>
                <div className="text-sm text-white/40 mt-1">
                  {w.roundsPlayed} Runde{w.roundsPlayed !== 1 ? 'n' : ''} · {w.bestCombo}x Best Combo
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Standings */}
      <div className="space-y-2 mb-6">
        {sorted.map(([id, data], rank) => (
          <div key={id}
            className={`flex items-center justify-between p-3 rounded-lg ${rank === 0 ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30' : 'bg-white/5'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${rank === 0 ? 'bg-amber-500 text-black' : rank === 1 ? 'bg-gray-400 text-black' : 'bg-white/10'}`}>
                {rank + 1}
              </div>
              {data.avatar ? (
                <img src={data.avatar} alt={data.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: data.color }}>
                  {data.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-medium text-sm">{data.name}</div>
                <div className="text-xs text-white/40">
                  {data.totalHits} Hits · {data.totalMisses} Miss · {data.bestCombo}x Best Combo
                </div>
              </div>
            </div>
            <div className="text-lg font-bold text-purple-400">{data.totalScore.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <Button onClick={onBack}
        className="w-full py-4 text-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400">
        🏠 Zurück
      </Button>
    </div>
  );
}

function nrc_round(n: number): string {
  return n === 1 ? '' : 'n';
}
