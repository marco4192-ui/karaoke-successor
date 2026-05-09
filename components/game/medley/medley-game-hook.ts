/**
 * Medley Contest — Core Game Logic Hook
 *
 * Contains all state management, audio control, scoring, and game loop
 * for the Medley game mode.  The UI components consume this hook via
 * a thin wrapper (MedleyGameScreen).
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useMultiPitchDetector, type PlayerPitchConfig } from '@/hooks/use-multi-pitch-detector';
import { usePartyStore } from '@/lib/game/party-store';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { findActiveNoteFlat, shouldSkipPitch, evaluateAndScoreTick } from '@/lib/game/party-scoring';
import { ensureSongUrls } from '@/lib/game/song-url-restore';
import type { Note, LyricLine, PitchDetectionResult } from '@/types/game';
import { EMPTY_PLAYER_SCORE } from '@/types/game';
import type {
  MedleyPlayer, MedleySong, MedleySettings, SnippetMatchup,
  MedleyGamePhase, MedleyRoundResult,
} from './medley-types';

// ===================== PROPS =====================

export interface MedleyGameScreenProps {
  players: MedleyPlayer[];
  songs: MedleySong[];
  settings: MedleySettings;
  matchups: SnippetMatchup[];
  /** Cumulative series history (from previous rounds) */
  seriesHistory: MedleyRoundResult[];
  onRoundComplete: (_result: MedleyRoundResult, _updatedPlayers: MedleyPlayer[]) => void;
  onEndGame: () => void;
}

// ===================== RETURN TYPE =====================

export interface MedleyGameState {
  // Phase
  phase: MedleyGamePhase;
  countdown: number;
  transitionCount: number;

  // Current snippet
  currentSnippet: MedleySong | null;
  currentSnippetIdx: number;
  snippetNotes: Note[];
  snippetLyrics: LyricLine[];

  // Audio
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioUrl: string | null;
  audioError: string | null;
  currentTimeMs: number;
  isPlaying: boolean;

  // Players (display copy)
  playersDisplay: MedleyPlayer[];

  // Scoring helpers
  snippetProgress: number;
  totalProgress: number;
  currentMatchup: SnippetMatchup | null;
  currentLyricLine: LyricLine | null;

  // Pitch detection
  multiPitch: ReturnType<typeof useMultiPitchDetector>;

  // Team
  isTeam: boolean;

  // Actions
  handleStart: () => Promise<void>;
  handleEndEarly: () => void;
  handleRoundComplete: () => void;
  handleShowFinalResults: () => void;
  forceRender: () => void;
}

// ===================== HOOK =====================

export function useMedleyGame({
  players: initialPlayers,
  songs: medleySongs,
  settings,
  matchups,
  seriesHistory,
  onRoundComplete,
  onEndGame,
}: MedleyGameScreenProps): MedleyGameState {
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
  const currentSnippetRef = useRef(currentSnippet);
  currentSnippetRef.current = currentSnippet;

  // ── Audio ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // ── Players (mutable ref for performance) ──
  const initialMappedPlayers = useMemo(
    () => initialPlayers.map(p => ({ ...p, ...EMPTY_PLAYER_SCORE, snippetsSung: 0 })),
    [initialPlayers],
  );
  const playersRef = useRef<MedleyPlayer[]>(initialMappedPlayers);
  const [___playersDisplay, setPlayersDisplay] = useState<MedleyPlayer[]>(initialMappedPlayers);
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
      } catch {
        if (!cancelled) setAudioError('Audio-Laden fehlgeschlagen');
      }
    };

    prepare();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- currentSnippet tracked via currentSnippet?.song.id
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
    const onErr = () => { setAudioError('Audio-Laden fehlgeschlagen'); };
    audio.addEventListener('error', onErr);
    return () => { audio.removeEventListener('error', onErr); };
  }, [audioUrl]);

  // ── Get current lyric line ──
  const currentLyricLine = useMemo(() => {
    if (!snippetLyrics.length || !currentSnippet) return null;
    const absoluteTime = currentSnippet.startTime + currentTimeMs;
    for (let i = 0; i < snippetLyrics.length; i++) {
      const line = snippetLyrics[i];
      const nextLine = snippetLyrics[i + 1];
      if (absoluteTime >= line.startTime && (!nextLine || absoluteTime < nextLine.startTime)) {
        return line;
      }
    }
    return null;
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
    if (!pitch) return;
    if (shouldSkipPitch(pitch, settings.difficulty)) return;
    if (!scoringMetaRef.current || !currentSnippet) return;

    const activeNote = findActiveNoteFlat(snippetNotes, absTime);
    if (!activeNote) return;

    // Throttle: evaluate every ~250ms per player
    const lastEval = lastEvalTimeRef.current[playerId] || 0;
    if (absTime - lastEval < 250) return;
    lastEvalTimeRef.current[playerId] = absTime;

    if (pitch.note == null) return;
    const tick = evaluateAndScoreTick(pitch.note, activeNote, settings.difficulty, scoringMetaRef.current);
    const pIdx = playersRef.current.findIndex(p => p.id === playerId);
    if (pIdx === -1) return;
    const p = playersRef.current[pIdx];

    if (tick.hit) {
      p.score += tick.points;
      p.notesHit++;
      p.combo++;
      if (p.combo > p.maxCombo) p.maxCombo = p.combo;
    } else {
      p.combo = 0;
      p.notesMissed++;
    }

    playersRef.current[pIdx] = { ...p };
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
      // Keep display state in sync with ref mutations for live score updates
      forceRender();
    }, 80);

    return () => clearInterval(loop);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- medleySongs.length tracked via currentSnippet; excluded to avoid unnecessary re-runs
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

  // ── Countdown interval ref for cleanup on unmount ──
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Start game ──
  const handleStart = useCallback(async () => {
    setPhase('countdown');
    setCountdown(3);

    // Initialize multi-pitch detection (one mic per player)
    try {
      const ok = await multiPitch.initialize();
      if (ok) multiPitch.start();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[Medley] Multi-pitch init failed:', e);
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          countdownIntervalRef.current = null;
          setPhase('playing');
          if (audioRef.current && currentSnippetRef.current) {
            audioRef.current.currentTime = currentSnippetRef.current.startTime / 1000;
            // eslint-disable-next-line no-console
            audioRef.current.play().catch(e => console.warn('[Medley] Play failed:', e));
            setIsPlaying(true);
            setCurrentTimeMs(0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    countdownIntervalRef.current = interval;
  }, [multiPitch]);

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
    return () => {
      multiPitch.stop();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
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

  // ── Show final results ──
  const handleShowFinalResults = useCallback(() => {
    setIsSongPlaying(false);
    lastIsSongPlayingRef.current = false;
    setPhase('final-results');
  }, [setIsSongPlaying]);

  return {
    phase,
    countdown,
    transitionCount,
    currentSnippet,
    currentSnippetIdx,
    snippetNotes,
    snippetLyrics,
    audioRef,
    audioUrl,
    audioError,
    currentTimeMs,
    isPlaying,
    playersDisplay: ___playersDisplay,
    snippetProgress,
    totalProgress,
    currentMatchup,
    currentLyricLine,
    multiPitch,
    isTeam,
    handleStart,
    handleEndEarly,
    handleRoundComplete,
    handleShowFinalResults,
    forceRender,
  };
}
