'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { useNoteScoring } from '@/hooks/use-note-scoring';
import { useGameSettings } from '@/hooks/use-game-settings';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import {
  WebcamBackgroundConfig,
  DEFAULT_WEBCAM_CONFIG,
  loadWebcamConfig,
  saveWebcamConfig,
} from '@/components/game/webcam-background';
import {
  useParticleEmitter,
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
import { enterFullscreen } from '@/hooks/use-app-effects';

// ── Re-export types from dedicated file ──
export type { GameScreenProps, TimingData, GameScreenHookReturn } from './game-screen-types';

// ── Sub-hooks ──
import { useGameScreenSettings } from '@/hooks/use-game-screen-settings';
import { useGameTimingData } from '@/hooks/use-game-timing-data';
import { useDuetP2Pitch } from '@/hooks/use-duet-p2-pitch';
import { useDisplayDuration } from '@/hooks/use-display-duration';

import type { GameScreenProps, GameScreenHookReturn } from './game-screen-types';

// ===================== MAIN HOOK =====================

export function useGameScreenLogic({ onEnd, onBack }: GameScreenProps): GameScreenHookReturn {
  // CRITICAL: Use individual selectors to prevent re-rendering the entire component tree
  // when unrelated store state changes (e.g., volume, currentTime, etc.)
  const gameState = useGameStore(s => s.gameState);
  const setCurrentTime = useGameStore(s => s.setCurrentTime);
  const setDetectedPitch = useGameStore(s => s.setDetectedPitch);
  const updatePlayer = useGameStore(s => s.updatePlayer);
  const endGame = useGameStore(s => s.endGame);
  const setResults = useGameStore(s => s.setResults);
  const addPlayer = useGameStore(s => s.addPlayer);
  const createProfile = useGameStore(s => s.createProfile);
  const profiles = useGameStore(s => s.profiles);
  const setMissingWordsIndices = useGameStore(s => s.setMissingWordsIndices);
  const setBlindSection = useGameStore(s => s.setBlindSection);
  const setBlindHardcore = useGameStore(s => s.setBlindHardcore);
  const setHardcoreMissingWords = useGameStore(s => s.setHardcoreMissingWords);
  const blindFrequency = usePartyStore(s => s.competitiveGame?.settings?.blindFrequency);
  const missingWordFrequency = usePartyStore(s => s.competitiveGame?.settings?.missingWordFrequency);
  const blindHardcore = usePartyStore(s => s.competitiveGame?.settings?.hardcore);
  const missingWordsGranularity = usePartyStore(s => s.competitiveGame?.settings?.missingWordsGranularity);
  const escalating = usePartyStore(s => s.competitiveGame?.settings?.escalating);
  const { pitchResult, initialize, start, stop, setDifficulty: setPitchDifficulty } = usePitchDetector();

  // Smoothed pitch for visual display (prevents flickering/jitter).
  // Uses rawNote (un-stabilized) instead of the stabilized `note` field
  // for maximum responsiveness. Scoring continues to use the stabilized
  // `note` for accuracy — this only affects the visual pitch indicator.
  //
  // α=0.80 (was 0.55): Much lighter EMA smoothing for near-real-time tracking.
  //   The old 0.55 combined with PitchStabilizer created 65-150ms lag on
  //   note transitions, making the indicator feel disconnected from the voice.
  //   0.80 lets the indicator follow the singer within 1-2 frames (~16-33ms).
  // deadZone=0.08 (was 0.15): Tighter dead zone so even small pitch movements
  //   register visually. The old 0.15ST threshold swallowed quick melodic
  //   ornaments and vibrato, making the indicator feel "stuck".
  const smoothedPitch = useSmoothedPitch(pitchResult?.rawNote ?? null, 0.80, 0.08);

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

  // ── Settings: localStorage-backed display settings + challenge/practice mode ──
  const settings = useGameScreenSettings();
  const {
    showScore,
    showParticles,
    showCombo,
    autoFullscreen,
    masterVolume,
    lyricsSize,
    youtubeQuality,
    replayEnabled,
    activeChallenge,
    hasChallengeNoPitchGuide,
    challengeModifiers,
    challengeTimeLimit,
    challengePitchShift,
    practiceMode,
    setPracticeMode,
    showPracticeControls,
    setShowPracticeControls,
    timeRemaining,
    setTimeRemaining,
  } = settings;

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

  // ── Timing data, pitch stats, visible notes ──
  const {
    timingData,
    beatDuration,
    pitchStats,
    p1PitchStats,
    p2PitchStats,
    visibleNotes,
    p1VisibleNotes,
    p2VisibleNotes,
  } = useGameTimingData({
    effectiveSong,
    isDuetMode,
    difficulty: gameState.difficulty,
    currentTime: gameState.currentTime,
  });

  // Note scoring hook - handles all scoring logic
  const {
    scoreEvents,
    notePerformance,
    p2NotePerformance,
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
    challengeModifiers,
    onPerfectHit: emitPerfectHit,
    onGoldenNote: emitGoldenNote,
    onComboMilestone: useCallback((combo: number, x: number, y: number) => emitComboFirework(x, y, combo), [emitComboFirework]),
  });

  // ── P2 pitch detection (duet/duel mode) ──
  const { p2Volume, setP2Volume } = useDuetP2Pitch({
    isDuetMode,
    song,
    mobilePitch,
    setP2DetectedPitch,
    difficulty: gameState.difficulty,
  });

  // Mobile companion sync - periodic game state updates
  const party = usePartyStore();
  const tournamentMatchId = party.currentTournamentMatch?.id || null;
  useMobileGameSync(song, isPlaying, gameState.gameMode, gameState.status === 'ended', tournamentMatchId);

  // Warning callbacks for blind / missing-words passages (stable refs for useEffect deps)
  const onBlindWarning = useCallback((_countdown: number, _isActive: boolean) => {
    console.log(`[blind-warning] countdown=${_countdown}, active=${_isActive}`);
  }, []);
  const onMissingWordsWarning = useCallback((_countdown: number, _isActive: boolean) => {
    console.log(`[missing-words-warning] countdown=${_countdown}, active=${_isActive}`);
  }, []);

  // Special game modes (blind + missing words)
  useGameModes({
    gameMode: gameState.gameMode,
    status: gameState.status,
    isPlaying,
    currentTime: gameState.currentTime,
    songId: song?.id,
    sortedLines: timingData?.sortedLines,
    setBlindSection,
    setBlindHardcore,
    setHardcoreMissingWords,
    setMissingWordsIndices,
    onBlindWarning,
    onMissingWordsWarning,
    blindFrequency,
    missingWordFrequency,
    hardcore: blindHardcore,
    missingWordsGranularity,
    escalatingMultiplier: escalating ? (party.competitiveGame?.rounds[party.competitiveGame.currentRoundIndex]?.frequencyMultiplier ?? 1.0) : undefined,
  });

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

  // ── Display duration for progress bar & time display ──
  const { displayDuration, setDisplayDuration } = useDisplayDuration({
    effectiveSong,
    mediaLoaded,
    audioRef,
    videoRef,
  });

  // ── Replay: stop recording BEFORE navigating to results screen ──
  const handleEnd = useCallback(() => {
    if (replayEnabled) {
      replayStop(gameState.results);
    }
    onEnd();
  }, [replayEnabled, replayStop, gameState.results, onEnd]);

  // Remote control polling - commands from mobile companions
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
    p2ScoringState: p2State,
    p1PerfectNotesCount,
    playbackRate: practiceMode.playbackRate,
    isNativeAudio: nativeAudio.enabled,
    nativeAudioTime: nativeAudio.currentPosition,
    nativeAudioPlay: nativeAudio.play,
    nativeAudioPause: nativeAudio.pause,
    nativeAudioResume: nativeAudio.resume,
    nativeAudioStop: nativeAudio.stop,
    nativeAudioSeek: nativeAudio.seek,
  });

  // ── Challenge Time Limit: countdown timer that ends the game when expired ──
  // Uses a ref so the interval callback always calls the latest endGameAndCleanup
  const endGameAndCleanupForTimerRef = useRef(endGameAndCleanup);
  useEffect(() => { endGameAndCleanupForTimerRef.current = endGameAndCleanup; }, [endGameAndCleanup]);

  useEffect(() => {
    if (!challengeTimeLimit || !isPlaying) return;

    setTimeRemaining(challengeTimeLimit);
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          // Trigger end of game via the same cleanup path as song-end
          endGameAndCleanupForTimerRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [challengeTimeLimit, isPlaying, setTimeRemaining]);

  // ── OS Media Controls: song metadata, media keys, position seekbar ──
  useMediaSession({
    song,
    isPlaying,
    audioRef,
    onPause: pauseGame,
    onResume: resumeGame,
  });

  // Apply master volume to audio/video elements
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = masterVolume / 100;
    if (videoRef.current) videoRef.current.volume = masterVolume / 100;
  }, [masterVolume, audioRef, videoRef]);

  // Auto-fullscreen on game start (uses Tauri native API when available — Escape won't exit)
  useEffect(() => {
    if (isPlaying && autoFullscreen && !document.fullscreenElement) {
      enterFullscreen().catch(() => {});
    }
  }, [isPlaying, autoFullscreen]);

  // ── Replay: start/pause/resume recording based on isPlaying transitions ──
  useEffect(() => {
    if (isPlaying && !wasPlayingRef.current) {
      replayStart();
    } else if (!isPlaying && wasPlayingRef.current) {
      replayPause();
    } else if (isPlaying && wasPlayingRef.current) {
      replayResume();
    }
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, replayStart, replayPause, replayResume]);

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
    p2NotePerformance,
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
    challengeTimeLimit,
    timeRemaining,
    setTimeRemaining,
    challengePitchShift,
    showScore,
    showParticles,
    showCombo,
    autoFullscreen,
    masterVolume,
    lyricsSize,
    youtubeQuality,

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
