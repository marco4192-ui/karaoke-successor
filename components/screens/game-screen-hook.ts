'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { useNoteScoring } from '@/hooks/use-note-scoring';
import { useGameSettings } from '@/hooks/use-game-settings';
import { useGameStore } from '@/lib/game/store';
import type { GameState } from '@/types/game';
import { usePartyStore } from '@/lib/game/party-store';
import { LyricLine, Note } from '@/types/game';
import { PRACTICE_MODE_DEFAULTS, PracticeModeConfig } from '@/lib/game/practice-mode';
import { CHALLENGE_MODES } from '@/lib/game/player-progression';
import { StorageKeys, getJson, getItem, removeItem } from '@/lib/storage';
import {
  WebcamBackgroundConfig,
  DEFAULT_WEBCAM_CONFIG,
  loadWebcamConfig,
  saveWebcamConfig,
} from '@/components/game/webcam-background';
import {
  calculateScoringMetadata,
} from '@/lib/game/scoring';
import {
  calculatePitchStats,
  PitchStats,
  SING_LINE_POSITION,
  NOTE_WINDOW,
  VISIBLE_TOP,
  VISIBLE_RANGE,
  getVisibleNotes,
} from '@/lib/game/note-utils';
import {
  ParticleSystem,
  useParticleEmitter,
  ComboFireEffect,
  useSongEnergy,
} from '@/components/game/visual-effects';
import { useRemoteControl } from '@/hooks/use-remote-control';
import { useMobilePitchPolling } from '@/hooks/use-mobile-pitch-polling';
import { useGameMedia } from '@/hooks/use-game-media';
import { useGameLoop } from '@/hooks/use-game-loop';
import { useNativeAudio } from '@/hooks/use-native-audio';
import { useSmoothedPitch } from '@/hooks/use-smoothed-pitch';
import { useGameAudioEffects } from '@/hooks/use-game-audio-effects';
import { useYouTubeGame } from '@/hooks/use-youtube-game';
import { useGameModes } from '@/hooks/use-game-modes';
import { useMobileGameSync } from '@/hooks/use-mobile-game-sync';
import { usePracticePlayback } from '@/hooks/use-practice-playback';
import { useMediaSession } from '@/hooks/use-media-session';
import { useReplayRecorder } from '@/hooks/use-replay-recorder';
import { setLastReplayId } from '@/lib/replay-state';
import { getPitchDetector } from '@/lib/audio/pitch-detector';
import { cleanupOldReplays } from '@/lib/db/replay-db';
import { isDuetSong } from '@/components/screens/library/utils';

// ===================== HOOK INTERFACE =====================

export interface GameScreenProps {
  onEnd: () => void;
  onBack: () => void;
  onPause?: () => void;
}

export interface TimingData {
  allNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  sortedLines: LyricLine[];
  noteCount: number;
  lineCount: number;
  p1Notes: Array<Note & { lineIndex: number; line: LyricLine }>;
  p2Notes: Array<Note & { lineIndex: number; line: LyricLine }>;
  p1Lines: LyricLine[];
  p2Lines: LyricLine[];
  p1NoteCount: number;
  p2NoteCount: number;
  scoringMetadata: ReturnType<typeof calculateScoringMetadata> | null;
  p1ScoringMetadata: ReturnType<typeof calculateScoringMetadata> | null;
  p2ScoringMetadata: ReturnType<typeof calculateScoringMetadata> | null;
  beatDuration: number;
}

export interface GameScreenHookReturn {
  // Game state
  gameState: GameState;
  song: GameState['currentSong'];
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  isDuetMode: boolean;
  isLowPerf: boolean;

  // Media
  effectiveSong: ReturnType<typeof useGameMedia>['effectiveSong'];
  mediaLoaded: ReturnType<typeof useGameMedia>['mediaLoaded'];
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioLoadedRef: React.RefObject<boolean>;
  videoLoadedRef: React.RefObject<boolean>;
  spectrogramAudioEl: HTMLAudioElement | null;
  audioElRefCallback: (el: HTMLAudioElement | null) => void;
  displayDuration: number;
  setDisplayDuration: React.Dispatch<React.SetStateAction<number>>;
  nativeAudio: ReturnType<typeof useNativeAudio>;

  // YouTube
  youtubeVideoId: string | null;
  isYouTube: boolean;
  useYouTubeAudio: boolean;
  isAdPlaying: boolean;
  adCountdown: number | null;
  handleAdStart: () => void;
  handleAdEnd: () => void;
  youtubeTime: number;
  setYoutubeTime: React.Dispatch<React.SetStateAction<number>>;
  youtubeError: string | null;
  setYoutubeError: React.Dispatch<React.SetStateAction<string | null>>;

  // Pitch & Scoring
  pitchResult: ReturnType<typeof usePitchDetector>['pitchResult'];
  smoothedPitch: number | null;
  scoreEvents: ReturnType<typeof useNoteScoring>['scoreEvents'];
  notePerformance: ReturnType<typeof useNoteScoring>['notePerformance'];
  p2State: ReturnType<typeof useNoteScoring>['p2State'];
  p2DetectedPitch: number | null;

  // Timing
  timingData: TimingData | null;
  visibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  p1VisibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  p2VisibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  pitchStats: PitchStats;
  p1PitchStats: PitchStats;
  p2PitchStats: PitchStats;

  // Settings
  showBackgroundVideo: boolean;
  showPitchGuide: boolean;
  useAnimatedBackground: boolean;
  noteDisplayStyle: string;
  noteShapeStyle: string;
  hasChallengeNoPitchGuide: boolean;
  activeChallenge: typeof CHALLENGE_MODES[0] | null;

  // Practice mode
  practiceMode: PracticeModeConfig;
  showPracticeControls: boolean;
  setShowPracticeControls: React.Dispatch<React.SetStateAction<boolean>>;
  setPracticeMode: React.Dispatch<React.SetStateAction<PracticeModeConfig>>;

  // Audio effects
  audioEffects: ReturnType<typeof useGameAudioEffects>['audioEffects'];
  showAudioEffects: boolean;
  toggleAudioEffects: () => void;
  reverbAmount: number;
  setReverbAmount: React.Dispatch<React.SetStateAction<number>>;
  echoAmount: number;
  setEchoAmount: React.Dispatch<React.SetStateAction<number>>;
  applyEffectPreset: (preset: 'pop' | 'rock' | 'concert' | 'studio' | 'vintage' | 'ethereal' | 'power' | 'intimate') => void;

  // Webcam
  webcamConfig: WebcamBackgroundConfig;
  updateWebcamConfig: (updates: Partial<WebcamBackgroundConfig>) => void;

  // Visual effects
  songEnergy: number | undefined;
  particles: ReturnType<typeof useParticleEmitter>['particles'];

  // Game loop
  countdown: number;
  volume: number;
  pauseGame: () => void;
  resumeGame: () => void;
  endGameAndCleanup: () => void;
  abortGameLoop: () => void;
  resetScoring: () => void;
  stop: () => void;

  // Callbacks
  handleEnd: () => void;
}

// ===================== MAIN HOOK =====================

export function useGameScreenLogic({ onEnd, onBack, onPause }: GameScreenProps): GameScreenHookReturn {
  const { gameState, setCurrentTime, setDetectedPitch, updatePlayer, endGame, setResults, addPlayer, createProfile, profiles, setMissingWordsIndices, setBlindSection } = useGameStore();
  const blindFrequency = usePartyStore(s => s.competitiveGame?.settings?.blindFrequency);
  const missingWordFrequency = usePartyStore(s => s.competitiveGame?.settings?.missingWordFrequency);
  const { pitchResult, initialize, start, stop, setDifficulty: setPitchDifficulty } = usePitchDetector();

  // Smoothed pitch for visual display (prevents flickering/jitter)
  // Raw pitch is still used for scoring accuracy
  const smoothedPitch = useSmoothedPitch(pitchResult?.note ?? null, 0.3, 0.25);

  // Current song reference - must be defined early as it's used by multiple hooks
  const song = gameState.currentSong;

  // ── Media: URL restoration, lyrics loading, media element refs ──
  const {
    effectiveSong,
    mediaLoaded,
    audioRef,
    videoRef,
    audioLoadedRef,
    videoLoadedRef,
  } = useGameMedia(song);

  // Replay recording: enabled by default, persisted in localStorage
  const [replayEnabled] = useState(() => {
    return getJson<boolean>(StorageKeys.REPLAY_ENABLED, true);
  });

  const [youtubeTime, setYoutubeTime] = useState(0);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const wasPlayingRef = useRef(false);

  // Track the audio element for SpectrogramDisplay (avoids reading ref during render)
  const [spectrogramAudioEl, setSpectrogramAudioEl] = useState<HTMLAudioElement | null>(null);
  const audioElRefCallback = useCallback((el: HTMLAudioElement | null) => {
    audioRef.current = el;
    setSpectrogramAudioEl(el);
  }, [audioRef]);

  // Native audio (ASIO / WASAPI)
  const nativeAudio = useNativeAudio();

  // Settings from localStorage - managed via useGameSettings hook
  const {
    showBackgroundVideo,
    showPitchGuide,
    useAnimatedBackground,
    noteDisplayStyle,
    noteShapeStyle,
    performanceMode,
  } = useGameSettings();

  // Derived: is low-performance mode?
  const isLowPerf = performanceMode === 'low';

  // Practice mode UI controls
  const [showPracticeControls, setShowPracticeControls] = useState(false);

  // Challenge mode state - read from localStorage when game starts
  const [activeChallenge] = useState<typeof CHALLENGE_MODES[0] | null>(() => {
    const savedChallengeId = getItem(StorageKeys.CHALLENGE_MODE);
    if (savedChallengeId) {
      const challenge = CHALLENGE_MODES.find(c => c.id === savedChallengeId);
      if (challenge) {
        removeItem(StorageKeys.CHALLENGE_MODE); // Clear after reading
        return challenge;
      }
    }
    return null;
  });

  // Derive challenge modifier flags for use throughout the component
  const hasChallengeNoPitchGuide = activeChallenge?.modifiers.some(m => m.type === 'no_pitch_guide') ?? false;
  const challengeSpeedModifier = activeChallenge?.modifiers.find(m => m.type === 'double_speed');

  // Practice mode state - initialize with challenge speed modifier if present
  const [practiceMode, setPracticeMode] = useState<PracticeModeConfig>(() => {
    const speedValue = challengeSpeedModifier?.value;
    if (speedValue && speedValue > 1.0) {
      return { ...PRACTICE_MODE_DEFAULTS, playbackRate: speedValue, enabled: true };
    }
    return { ...PRACTICE_MODE_DEFAULTS };
  });

  // Practice playback: apply playbackRate to audio/video, loop detection
  usePracticePlayback({
    practiceMode,
    isPlaying,
    currentTime: gameState.currentTime,
    audioRef,
    videoRef,
  });

  // Mobile client state - pitch polling extracted to dedicated hook
  const { mobilePitch } = useMobilePitchPolling(song);

  // Audio effects - lazy init, cleanup managed by hook.
  // Pass audioRef/videoRef so the hook can resume media playback
  // after effects init (Tauri/WebView may pause them).
  const {
    audioEffects,
    setAudioEffects,
    showAudioEffects,
    toggleAudioEffects,
    reverbAmount,
    setReverbAmount,
    echoAmount,
    setEchoAmount,
    applyEffectPreset,
  } = useGameAudioEffects({ audioRef, videoRef });

  // YouTube + Ad handling - URL extraction, ad callbacks, countdown
  const {
    youtubeVideoId,
    isYouTube,
    useYouTubeAudio,
    isAdPlaying,
    adCountdown,
    handleAdStart,
    handleAdEnd,
  } = useYouTubeGame({
    effectiveSong,
    isPlaying,
    setIsPlaying,
  });

  // Webcam background state - SEPARATE camera for filming singers
  const [webcamConfig, setWebcamConfig] = useState<WebcamBackgroundConfig>({ ...DEFAULT_WEBCAM_CONFIG });

  // SAFETY: Ensure at least one player exists before game starts
  useEffect(() => {
    if (gameState.players.length === 0 && song) {
      if (profiles.length > 0) {
        const activeProfile = profiles.find(p => p.isActive !== false) || profiles[0];
        addPlayer(activeProfile);
      } else {
        const defaultProfile = createProfile('Player 1');
        addPlayer(defaultProfile);
      }
    }
  }, [song, gameState.players.length, profiles, addPlayer, createProfile]);

  useEffect(() => {
    const savedConfig = loadWebcamConfig();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
    setWebcamConfig(savedConfig);
  }, []);

  // Update webcam config and save to localStorage
  const updateWebcamConfig = useCallback((updates: Partial<WebcamBackgroundConfig>) => {
    setWebcamConfig(prev => {
      const newConfig = { ...prev, ...updates };
      saveWebcamConfig(newConfig);
      return newConfig;
    });
  }, []);

  // Duet mode state - P2 volume
  const [p2Volume, setP2Volume] = useState(0);

  // Visual Effects - Particle system for score feedback
  const {
    particles,
    emitPerfectHit,
    emitGoldenNote,
    emitComboFirework,
    emitConfetti,
  } = useParticleEmitter();

  // Emit confetti burst when the song finishes (celebration effect)
  const prevStatusRef = useRef(gameState.status);
  useEffect(() => {
    if (prevStatusRef.current !== 'ended' && gameState.status === 'ended') {
      emitConfetti(window.innerWidth / 2, window.innerHeight / 2);
    }
    prevStatusRef.current = gameState.status;
  }, [gameState.status, emitConfetti]);

  // Song energy for visual effects intensity
  const songEnergy = useSongEnergy(audioRef);

  // Check if this is a duet song (use comprehensive detection, not just flag)
  // Also treat blind/missing-words competitive modes as duet when 2+ players are added
  // NOTE: In low-performance mode, force single-player (no duet split-screen)
  const isCompetitiveMultiplayer = !isLowPerf && (gameState.gameMode === 'blind' || gameState.gameMode === 'missing-words') && gameState.players.length >= 2;
  const isDuelOrDuetGameMode = gameState.gameMode === 'duet' || gameState.gameMode === 'duel';
  const isDuetMode = !isLowPerf && ((song ? isDuetSong(song) : false) || isDuelOrDuetGameMode || isCompetitiveMultiplayer);

  // ── Safety: load lyrics on-demand for duel/duet mode when effectiveSong has none ──
  const [duetFallbackLyrics, setDuetFallbackLyrics] = useState<LyricLine[] | null>(null);
  useEffect(() => {
    if (!isDuetMode || !effectiveSong || (effectiveSong.lyrics && effectiveSong.lyrics.length > 0)) {
      setDuetFallbackLyrics(null);
      return;
    }
    // effectiveSong has no lyrics but we need them for the highway — try loading
    let cancelled = false;
    import('@/lib/game/song-lyrics-loader').then(({ loadSongLyrics }) => {
      loadSongLyrics(effectiveSong).then(lyrics => {
        if (cancelled || lyrics.length === 0) return;
        setDuetFallbackLyrics(lyrics);
      }).catch(() => {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isDuetMode, effectiveSong]);

  // ── Song with fallback lyrics for timing computation ──
  const songForTiming = useMemo(() => {
    if (!effectiveSong) return null;
    if (duetFallbackLyrics && duetFallbackLyrics.length > 0) {
      return { ...effectiveSong, lyrics: duetFallbackLyrics };
    }
    return effectiveSong;
  }, [effectiveSong, duetFallbackLyrics]);

  // =====================================================
  // PRE-COMPUTE ALL TIMING DATA ONCE WHEN SONG LOADS
  // MUST be defined BEFORE useNoteScoring hook!
  // =====================================================
  const timingData = useMemo<TimingData | null>(() => {
    const src = songForTiming || effectiveSong;
    if (!src || src.lyrics.length === 0) return null;

    const allNotes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    const p1Notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    const p2Notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];

    src.lyrics.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        const noteWithLine = { ...note, lineIndex, line };
        allNotes.push(noteWithLine);

        if (isDuetMode) {
          if (hasExplicitPlayerMarkers) {
            // P1 notes only for player 1, P2 notes only for player 2
            // Notes with player 'both' or undefined are sung by BOTH → show for each player
            if (note.player === 'P1' || note.player === 'both' || note.player === undefined) {
              p1Notes.push(noteWithLine);
            }
            if (note.player === 'P2' || note.player === 'both' || note.player === undefined) {
              p2Notes.push(noteWithLine);
            }
          } else {
            // Duel / no markers — both players sing all notes
            p1Notes.push(noteWithLine);
            p2Notes.push(noteWithLine);
          }
        }
      });
    });

    allNotes.sort((a, b) => a.startTime - b.startTime);
    p1Notes.sort((a, b) => a.startTime - b.startTime);
    p2Notes.sort((a, b) => a.startTime - b.startTime);

    const sortedLines = [...src.lyrics].sort((a, b) => a.startTime - b.startTime);
    const hasExplicitPlayerMarkers = sortedLines.some(line => line.player === 'P1' || line.player === 'P2');

    const p1Lines = sortedLines.filter(line => {
      if (hasExplicitPlayerMarkers) return line.player === 'P1' || line.player === 'both';
      return true;
    });

    const p2Lines = sortedLines.filter(line => {
      if (hasExplicitPlayerMarkers) return line.player === 'P2' || line.player === 'both';
      return true;
    });

    const beatDurationMs = src.bpm ? 15000 / src.bpm : 500;
    const scoringMetadata = calculateScoringMetadata(allNotes, beatDurationMs);
    const p1ScoringMetadata = calculateScoringMetadata(p1Notes, beatDurationMs);
    const p2ScoringMetadata = calculateScoringMetadata(p2Notes, beatDurationMs);

    return {
      allNotes, sortedLines, noteCount: allNotes.length, lineCount: sortedLines.length,
      p1Notes, p2Notes, p1Lines, p2Lines,
      p1NoteCount: p1Notes.length, p2NoteCount: p2Notes.length,
      scoringMetadata, p1ScoringMetadata, p2ScoringMetadata,
      beatDuration: beatDurationMs,
    };
  }, [songForTiming, isDuetMode]);

  const beatDuration = timingData?.beatDuration || (song?.bpm ? 15000 / song.bpm : 500);

  // Note scoring hook - handles all scoring logic
  const {
    scoreEvents,
    notePerformance,
    p2State,
    p2DetectedPitch,
    setP2DetectedPitch,
    checkNoteHits,
    checkP2NoteHits,
    resetScoring,
    p1PerfectNotesCount,
  } = useNoteScoring({
    song,
    difficulty: gameState.difficulty,
    players: gameState.players,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TimingData is a superset of TimingDataForScoring
    timingData: timingData as any,
    isDuetMode,
    beatDuration,
    updatePlayer,
    challengeModifiers: activeChallenge?.modifiers,
    onPerfectHit: emitPerfectHit,
    onGoldenNote: emitGoldenNote,
    onComboMilestone: useCallback((combo: number, x: number, y: number) => emitComboFirework(x, y, combo), [emitComboFirework]),
  });

  // Use mobile pitch for P2 in duet/duel mode
  useEffect(() => {
    if (isDuetMode && mobilePitch) {
      queueMicrotask(() => {
        setP2DetectedPitch(mobilePitch.frequency);
        setP2Volume(mobilePitch.volume || 0);
      });
    } else if (isDuetMode && !mobilePitch?.frequency) {
      queueMicrotask(() => {
        setP2DetectedPitch(null);
        setP2Volume(0);
      });
    }
  }, [isDuetMode, mobilePitch, setP2DetectedPitch, setP2Volume]);

  // Mobile companion sync - periodic game state updates
  useMobileGameSync(song, isPlaying, gameState.gameMode, gameState.status === 'ended');

  // Special game modes (blind + missing words)
  useGameModes({
    gameMode: gameState.gameMode,
    status: gameState.status,
    currentTime: gameState.currentTime,
    songId: song?.id,
    sortedLines: timingData?.sortedLines,
    setBlindSection,
    setMissingWordsIndices,
    // Pass competitive settings frequencies if available
    blindFrequency,
    missingWordFrequency,
  });

  // Calculate pitch ranges
  const pitchStats = useMemo<PitchStats>(() => {
    return calculatePitchStats(timingData?.allNotes);
  }, [timingData]);

  const p1PitchStats = useMemo<PitchStats>(() => {
    const notes = timingData?.p1Notes;
    if (!notes || notes.length === 0) return pitchStats;
    return calculatePitchStats(notes);
  }, [timingData, pitchStats]);

  const p2PitchStats = useMemo<PitchStats>(() => {
    const notes = timingData?.p2Notes;
    if (!notes || notes.length === 0) return pitchStats;
    return calculatePitchStats(notes);
  }, [timingData, pitchStats]);

  // ── Replay Recorder: mic + webcam during gameplay ──
  const {
    startRecording: replayStart,
    stopRecording: replayStop,
    pauseRecording: replayPause,
    resumeRecording: replayResume,
  } = useReplayRecorder({
    enabled: replayEnabled,
    songId: song?.id ?? null,
    songTitle: song?.title ?? '',
    songArtist: song?.artist ?? '',
    playerName: gameState.players[0]?.name || 'Player 1',
    isWebcamActive: webcamConfig.enabled,
    getMicStream: useCallback(() => {
      try { return getPitchDetector().getMediaStream() || null; } catch { return null; }
    }, []),
    onReplaySaved: useCallback((replay: { id: string }) => {
      setLastReplayId(replay.id);
    }, []),
  });

  // Run replay cleanup on mount (delete replays >30 days, keep max 50)
  useEffect(() => { cleanupOldReplays().catch(() => {}); }, []);

  // ── Replay: stop recording BEFORE navigating to results screen ──
  // CRITICAL: This must be synchronous in the onEnd callback, NOT in a useEffect.
  // A useEffect watching gameState.status === 'ended' will never fire because
  // onEnd() navigates away and unmounts this component before the effect runs.
  const handleEnd = useCallback(() => {
    if (replayEnabled) {
      replayStop(gameState.results);
    }
    onEnd();
  }, [replayEnabled, replayStop, gameState.results, onEnd]);

  // Remote control polling - commands from mobile companions
  // MUST be defined AFTER handleEnd to avoid TDZ (Temporal Dead Zone) error
  useRemoteControl({
    audioRef,
    videoRef,
    isPlaying,
    setIsPlaying,
    isAdPlaying,
    stop,
    onBack,
    onEnd: handleEnd,
  });

  // ── Game Loop: countdown, game loop, media playback, song-end detection ──
  const {
    countdown,
    volume,
    pauseGame,
    resumeGame,
    endGameAndCleanup,
    abortGameLoop,
  } = useGameLoop({
    effectiveSong,
    mediaLoaded,
    audioRef,
    videoRef,
    isYouTube,
    youtubeVideoId,
    youtubeTime,
    isPlaying,
    setIsPlaying,
    pitchResult,
    initialize,
    start,
    stop,
    setPitchDifficulty,
    setCurrentTime,
    setDetectedPitch,
    endGame,
    setResults,
    resetScoring,
    checkNoteHits,
    checkP2NoteHits,
    difficulty: gameState.difficulty,
    gameMode: gameState.gameMode,
    timingOffset: 0,
    isDuetMode,
    p2DetectedPitch,
    p2Volume,
    p2IsSinging: mobilePitch?.isSinging,
    setP2Volume,
    onEnd: handleEnd,
    audioEffects,
    setAudioEffects,
    song,
    players: gameState.players,
    // P2 scoring state for duel/duet results
    p2ScoringState: p2State,
    // P1 perfect notes count for daily challenge / leaderboard
    p1PerfectNotesCount,
    // Practice mode playback rate (for speed_demon achievement)
    playbackRate: practiceMode.playbackRate,
    // Native audio support
    isNativeAudio: nativeAudio.enabled,
    nativeAudioTime: nativeAudio.currentPosition,
    nativeAudioPlay: nativeAudio.play,
    nativeAudioPause: nativeAudio.pause,
    nativeAudioResume: nativeAudio.resume,
    nativeAudioStop: nativeAudio.stop,
    nativeAudioSeek: nativeAudio.seek,
  });

  // ── OS Media Controls: song metadata, media keys, position seekbar ──
  useMediaSession({
    song,
    isPlaying,
    audioRef,
    onPause: pauseGame,
    onResume: resumeGame,
  });

  // ── Replay: start recording when gameplay begins (after countdown) ──
  useEffect(() => {
    if (isPlaying && !wasPlayingRef.current) {
      // isPlaying went from false → true (gameplay just started)
      replayStart();
    } else if (!isPlaying && wasPlayingRef.current) {
      // isPlaying went from true → false (game ended or paused)
      // Pause the replay recorder (stop happens on game end)
      replayPause();
    } else if (isPlaying && wasPlayingRef.current) {
      // Resumed from pause
      replayResume();
    }
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, replayStart, replayPause, replayResume]);

  // Get visible notes using shared utility
  const visibleNotes = useMemo(() =>
    getVisibleNotes(timingData?.allNotes, gameState.currentTime, NOTE_WINDOW),
    [gameState.currentTime, timingData]
  );

  const p1VisibleNotes = useMemo(() =>
    getVisibleNotes(timingData?.p1Notes, gameState.currentTime, NOTE_WINDOW),
    [gameState.currentTime, timingData]
  );

  const p2VisibleNotes = useMemo(() =>
    getVisibleNotes(timingData?.p2Notes, gameState.currentTime, NOTE_WINDOW),
    [gameState.currentTime, timingData]
  );

  // Compute display duration for progress bar & time display:
  // - If #END: tag exists → use that value
  // - Otherwise → use the audio/video element's actual media duration
  //   (avoids showing ~999999s when #END: is not defined)
  const [displayDuration, setDisplayDuration] = useState(0);

  useEffect(() => {
    if (!effectiveSong) return;
    const compute = () => {
      if (effectiveSong.end) {
        setDisplayDuration(effectiveSong.end);
        return;
      }
      const audioDur = audioRef.current?.duration;
      if (audioDur && isFinite(audioDur) && audioDur > 0) {
        setDisplayDuration(audioDur * 1000);
        return;
      }
      const videoDur = videoRef.current?.duration;
      if (videoDur && isFinite(videoDur) && videoDur > 0) {
        setDisplayDuration(videoDur * 1000);
        return;
      }
      setDisplayDuration(effectiveSong.duration);
    };
    queueMicrotask(compute);
  }, [effectiveSong, mediaLoaded, audioRef, videoRef]);

  return {
    // Game state
    gameState,
    song,
    isPlaying,
    setIsPlaying,
    isDuetMode,
    isLowPerf,

    // Media
    effectiveSong,
    mediaLoaded,
    audioRef,
    videoRef,
    audioLoadedRef,
    videoLoadedRef,
    spectrogramAudioEl,
    audioElRefCallback,
    displayDuration,
    setDisplayDuration,
    nativeAudio,

    // YouTube
    youtubeVideoId,
    isYouTube,
    useYouTubeAudio,
    isAdPlaying,
    adCountdown,
    handleAdStart,
    handleAdEnd,
    youtubeTime,
    setYoutubeTime,
    youtubeError,
    setYoutubeError,

    // Pitch & Scoring
    pitchResult,
    smoothedPitch,
    scoreEvents,
    notePerformance,
    p2State,
    p2DetectedPitch,

    // Timing
    timingData,
    visibleNotes,
    p1VisibleNotes,
    p2VisibleNotes,
    pitchStats,
    p1PitchStats,
    p2PitchStats,

    // Settings
    showBackgroundVideo,
    showPitchGuide,
    useAnimatedBackground,
    noteDisplayStyle,
    noteShapeStyle,
    hasChallengeNoPitchGuide,
    activeChallenge,

    // Practice mode
    practiceMode,
    showPracticeControls,
    setShowPracticeControls,
    setPracticeMode,

    // Audio effects
    audioEffects,
    showAudioEffects,
    toggleAudioEffects,
    reverbAmount,
    setReverbAmount,
    echoAmount,
    setEchoAmount,
    applyEffectPreset,

    // Webcam
    webcamConfig,
    updateWebcamConfig,

    // Visual effects
    songEnergy,
    particles,

    // Game loop
    countdown,
    volume,
    pauseGame,
    resumeGame,
    endGameAndCleanup,
    abortGameLoop,
    resetScoring,
    stop,

    // Callbacks
    handleEnd,
  };
}
