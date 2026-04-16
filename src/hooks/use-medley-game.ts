'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import {
  evaluateTick,
  calculateTickPoints,
  calculateNoteCompletionBonus,
  calculateScoringMetadata,
  NoteProgress,
  ScoringMetadata,
} from '@/lib/game/scoring';
import { DIFFICULTY_SETTINGS, Difficulty, Note, LyricLine, PitchDetectionResult } from '@/types/game';
import { ensureSongUrls } from '@/lib/game/song-library';
import type { MedleySong, MedleyPlayer, MedleySettings } from '@/components/game/medley-contest-screen';

// ===================== TYPES =====================

export interface MedleyScoreEvent {
  displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss';
  points: number;
  time: number;
  playerId: string;
}

export interface UseMedleyGameOptions {
  medleySongs: MedleySong[];
  settings: MedleySettings;
  players: MedleyPlayer[];
  currentSongIndex: number;
  phase: 'countdown' | 'playing' | 'transition' | 'ended';
  isPlaying: boolean;
  onSnippetTimeUpdate: (timeMs: number) => void;
  onSnippetEnd: () => void;
  onPlayersUpdate: (updatedPlayers: MedleyPlayer[]) => void;
}

export interface UseMedleyGameResult {
  // Audio
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isAudioReady: boolean;
  audioError: string | null;
  // Scoring
  scoreEvents: MedleyScoreEvent[];
  lastRatings: Record<string, 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss' | null>;
  // Pitch
  currentPitch: number | null;
  pitchVolume: number;
  isSinging: boolean;
  // Timing
  snippetTimeMs: number;
  // Snippet notes info
  currentSnippetNotes: Note[];
  // Lifecycle
  startSnippet: () => Promise<void>;
  stopCurrentAudio: () => void;
  cleanup: () => void;
}

// ===================== HELPERS =====================

/** Get notes that fall within a snippet's time window */
function getSnippetNotes(song: MedleySong): Note[] {
  const allNotes: Note[] = [];
  if (!song.song.lyrics) return allNotes;

  for (const line of song.song.lyrics) {
    for (const note of line.notes) {
      // Note overlaps with snippet if it starts before endTime and ends after startTime
      if (note.startTime < song.endTime && (note.startTime + note.duration) > song.startTime) {
        allNotes.push(note);
      }
    }
  }

  allNotes.sort((a, b) => a.startTime - b.startTime);
  return allNotes;
}

// ===================== HOOK =====================

export function useMedleyGame(options: UseMedleyGameOptions): UseMedleyGameResult {
  const {
    medleySongs,
    settings,
    players,
    currentSongIndex,
    phase,
    isPlaying,
    onSnippetTimeUpdate,
    onSnippetEnd,
    onPlayersUpdate,
  } = options;

  // ── Audio ref ──
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Pitch detection ──
  const {
    pitchResult,
    initialize: initPitch,
    start: startPitch,
    stop: stopPitch,
    setDifficulty: setPitchDifficulty,
    isInitialized: pitchInitialized,
  } = usePitchDetector();

  // ── State ──
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [scoreEvents, setScoreEvents] = useState<MedleyScoreEvent[]>([]);
  const [lastRatings, setLastRatings] = useState<Record<string, 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss' | null>>({});
  const [snippetTimeMs, setSnippetTimeMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [songWithUrls, setSongWithUrls] = useState<MedleySong | null>(null);

  // ── Refs for scoring state ──
  const noteProgressMapRef = useRef<Map<string, NoteProgress>>(new Map());
  const playersRef = useRef(players);
  playersRef.current = players;
  const gameLoopRef = useRef<number | null>(null);
  const snippetStartTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);
  // Fix (Code Review #5): Use ref for pitchResult to avoid game loop restart
  // at ~50 Hz (every pitch update). The game loop reads this ref instead of
  // depending on pitchResult directly.
  const pitchResultRef = useRef(pitchResult);
  pitchResultRef.current = pitchResult;

  // ── Current medley song ──
  const currentMedleySong = medleySongs[currentSongIndex] || null;

  // ── Get notes for current snippet ──
  const currentSnippetNotes = useMemo(() => {
    if (!songWithUrls) return [];
    return getSnippetNotes(songWithUrls);
  }, [songWithUrls]);

  // ── Scoring metadata for current snippet ──
  const scoringMetadata = useMemo((): ScoringMetadata | null => {
    if (currentSnippetNotes.length === 0) return null;
    const beatDuration = songWithUrls?.song.bpm ? 15000 / songWithUrls.song.bpm : 500;
    return calculateScoringMetadata(currentSnippetNotes, beatDuration);
  }, [currentSnippetNotes, songWithUrls]);

  // ── Ensure song URLs when snippet changes ──
  useEffect(() => {
    if (!currentMedleySong) return;

    let cancelled = false;
    const prepareSnippet = async () => {
      setAudioError(null);
      setIsAudioReady(false);
      setAudioUrl(null);
      noteProgressMapRef.current.clear();

      try {
        const preparedSong = await ensureSongUrls(currentMedleySong.song);
        if (cancelled) return;

        setSongWithUrls({ ...currentMedleySong, song: preparedSong });

        if (preparedSong.audioUrl) {
          setAudioUrl(preparedSong.audioUrl);
        } else {
          console.warn('[MedleyGame] Song has no audio URL:', preparedSong.title);
          setAudioError('No audio available for this song');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[MedleyGame] Error preparing song:', err);
        setAudioError('Failed to load song audio');
      }
    };

    prepareSnippet();
    return () => { cancelled = true; };
  }, [currentMedleySong?.song.id, currentSongIndex]);

  // ── Set pitch difficulty when settings change ──
  useEffect(() => {
    setPitchDifficulty(settings.difficulty);
  }, [settings.difficulty, setPitchDifficulty]);

  // ── Initialize audio element ──
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
    }
  }, [audioUrl]);

  // ── Audio ready event ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onCanPlay = () => {
      if (mountedRef.current) setIsAudioReady(true);
    };
    const onError = () => {
      if (mountedRef.current) {
        setAudioError('Audio failed to load');
        setIsAudioReady(false);
      }
    };

    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
    };
  }, [audioUrl]);

  // ── Start snippet playback ──
  const startSnippet = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentMedleySong) return;

    try {
      // Initialize pitch detector if not yet done
      if (!pitchInitialized) {
        const success = await initPitch();
        if (success) {
          startPitch();
        }
      } else {
        startPitch();
      }

      // Reset scoring state
      noteProgressMapRef.current.clear();

      // Seek to snippet start position
      const seekTime = currentMedleySong.startTime / 1000;
      audio.currentTime = seekTime;
      snippetStartTimeRef.current = currentMedleySong.startTime;

      await audio.play();

      if (mountedRef.current) {
        setSnippetTimeMs(0);
        setIsAudioReady(true);
      }
    } catch (err) {
      console.error('[MedleyGame] Failed to start playback:', err);
      if (mountedRef.current) {
        setAudioError('Failed to start audio playback');
      }
    }
  }, [currentMedleySong, pitchInitialized, initPitch, startPitch]);

  // ── Stop current audio ──
  const stopCurrentAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    stopPitch();
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, [stopPitch]);

  // ── Scoring logic: evaluate pitch against notes ──
  const evaluatePitchAgainstNotes = useCallback(
    (currentTimeInSong: number, pitch: PitchDetectionResult, activePlayerId: string) => {
      if (!scoringMetadata || !songWithUrls || !pitch.frequency || pitch.note === null) return;
      if (pitch.volume < DIFFICULTY_SETTINGS[settings.difficulty].volumeThreshold) return;
      if (pitch.isSinging === false) return;

      const beatDuration = songWithUrls.song.bpm ? 15000 / songWithUrls.song.bpm : 500;

      for (const note of currentSnippetNotes) {
        const noteEnd = note.startTime + note.duration;
        const noteId = note.id || `medley-${note.startTime}-${note.pitch}`;

        // Check if we're in the note's time window (within snippet bounds)
        const snippetStart = songWithUrls.startTime;
        const snippetEnd = songWithUrls.endTime;

        if (currentTimeInSong >= note.startTime && currentTimeInSong <= noteEnd) {
          let noteProgress = noteProgressMapRef.current.get(noteId);

          if (!noteProgress) {
            const totalTicks = Math.max(1, Math.round(note.duration / beatDuration));
            noteProgress = {
              noteId,
              totalTicks,
              ticksHit: 0,
              ticksEvaluated: 0,
              isGolden: note.isGolden,
              lastEvaluatedTime: currentTimeInSong,
              isComplete: false,
              wasPerfect: false,
            };
            noteProgressMapRef.current.set(noteId, noteProgress);
          }

          const timeSinceLastEval = currentTimeInSong - noteProgress.lastEvaluatedTime;
          if (timeSinceLastEval < beatDuration * 0.5) break;

          const tickResult = evaluateTick(pitch.note!, note.pitch, settings.difficulty);
          noteProgress.ticksEvaluated++;
          noteProgress.lastEvaluatedTime = currentTimeInSong;

          // Find player index
          const playerIdx = playersRef.current.findIndex(p => p.id === activePlayerId);
          if (playerIdx === -1) break;

          const currentPlayer = playersRef.current[playerIdx];

          if (tickResult.isHit) {
            noteProgress.ticksHit++;
            const tickPoints = calculateTickPoints(
              tickResult.accuracy,
              note.isGolden,
              scoringMetadata.pointsPerTick,
              settings.difficulty
            );
            const finalPoints = Math.max(1, Math.round(tickPoints));
            const newCombo = currentPlayer.combo + 1;

            // Update player score
            const updatedPlayers = [...playersRef.current];
            updatedPlayers[playerIdx] = {
              ...updatedPlayers[playerIdx],
              score: updatedPlayers[playerIdx].score + finalPoints,
              combo: newCombo,
              maxCombo: Math.max(updatedPlayers[playerIdx].maxCombo, newCombo),
            };
            onPlayersUpdate(updatedPlayers);

            // Score event
            if (mountedRef.current) {
              setScoreEvents(prev => [
                ...prev.slice(-10),
                { displayType: tickResult.displayType, points: finalPoints, time: currentTimeInSong, playerId: activePlayerId },
              ]);
              setLastRatings(prev => ({ ...prev, [activePlayerId]: tickResult.displayType }));
            }
          } else {
            // Miss — reset combo
            const updatedPlayers = [...playersRef.current];
            updatedPlayers[playerIdx] = {
              ...updatedPlayers[playerIdx],
              combo: 0,
            };
            onPlayersUpdate(updatedPlayers);

            if (mountedRef.current) {
              setScoreEvents(prev => [
                ...prev.slice(-10),
                { displayType: 'Miss', points: 0, time: currentTimeInSong, playerId: activePlayerId },
              ]);
              setLastRatings(prev => ({ ...prev, [activePlayerId]: 'Miss' }));
            }
          }
          break;
        }

        // Note just passed — finalize
        if (currentTimeInSong > noteEnd) {
          const noteId2 = note.id || `medley-${note.startTime}-${note.pitch}`;
          const progress = noteProgressMapRef.current.get(noteId2);
          if (progress && !progress.isComplete) {
            progress.isComplete = true;

            const playerIdx = playersRef.current.findIndex(p => p.id === activePlayerId);
            if (playerIdx !== -1) {
              const updatedPlayers = [...playersRef.current];
              if (progress.ticksHit > 0) {
                updatedPlayers[playerIdx] = {
                  ...updatedPlayers[playerIdx],
                  notesHit: updatedPlayers[playerIdx].notesHit + 1,
                };
              } else {
                updatedPlayers[playerIdx] = {
                  ...updatedPlayers[playerIdx],
                  notesMissed: updatedPlayers[playerIdx].notesMissed + 1,
                };
              }
              onPlayersUpdate(updatedPlayers);
            }
          }
        }
      }
    },
    [scoringMetadata, songWithUrls, currentSnippetNotes, settings.difficulty, onPlayersUpdate]
  );

  // Refs for callbacks that must NOT be in the game loop dependency array.
  // These prevent loop restarts when parent re-renders (e.g. inline callbacks).
  const evaluatePitchAgainstNotesRef = useRef(evaluatePitchAgainstNotes);
  evaluatePitchAgainstNotesRef.current = evaluatePitchAgainstNotes;
  const onSnippetTimeUpdateRef = useRef(onSnippetTimeUpdate);
  onSnippetTimeUpdateRef.current = onSnippetTimeUpdate;
  const onSnippetEndRef = useRef(onSnippetEnd);
  onSnippetEndRef.current = onSnippetEnd;

  // ── Game loop: reads audio time, updates scoring ──
  useEffect(() => {
    if (!isPlaying || phase !== 'playing' || !currentMedleySong) return;

    const loop = () => {
      const audio = audioRef.current;
      if (!audio || audio.paused) {
        gameLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      const currentTimeInSong = audio.currentTime * 1000;

      // Check if snippet has ended
      if (currentTimeInSong >= currentMedleySong.endTime) {
        audio.pause();
        onSnippetEndRef.current();
        return;
      }

      // Calculate time within snippet
      const timeInSnippet = currentTimeInSong - currentMedleySong.startTime;
      setSnippetTimeMs(timeInSnippet);
      onSnippetTimeUpdateRef.current(timeInSnippet);

      // Evaluate pitch for all active singers
      const currentPitch = pitchResultRef.current;
      if (currentPitch) {
        const isCompetitive = settings.playMode === 'competitive';
        const activePlayerIndices = (isCompetitive && playersRef.current.length > 0)
          ? [currentSongIndex % playersRef.current.length]
          : playersRef.current.map((_, i) => i);

        for (const playerIndex of activePlayerIndices) {
          const player = playersRef.current[playerIndex];
          if (player) {
            evaluatePitchAgainstNotesRef.current(currentTimeInSong, currentPitch, player.id);
          }
        }
      }

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [isPlaying, phase, currentMedleySong, currentSongIndex, settings.playMode]);

  // ── Cleanup on unmount ──
  const cleanup = useCallback(() => {
    mountedRef.current = false;
    stopPitch();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, [stopPitch]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    audioRef,
    isAudioReady,
    audioError,
    scoreEvents,
    lastRatings,
    currentPitch: pitchResult?.frequency ?? null,
    pitchVolume: pitchResult?.volume ?? 0,
    isSinging: pitchResult?.isSinging ?? true,
    snippetTimeMs,
    currentSnippetNotes,
    startSnippet,
    stopCurrentAudio,
    cleanup,
  };
}
