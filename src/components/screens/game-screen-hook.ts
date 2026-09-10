'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { useNoteScoring } from '@/hooks/use-note-scoring';
import { useGameSettings } from '@/hooks/use-game-settings';
import { useModeWarningCues } from '@/hooks/use-mode-warning-cues';
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
import { useGameAudioEffects } from '@/hooks/use-game-audio-effects';
import { useYouTubeGame } from '@/hooks/use-youtube-game';
import { useGameModes } from '@/hooks/use-game-modes';
import { useMobileGameSync } from '@/hooks/use-mobile-game-sync';
import { usePracticePlayback } from '@/hooks/use-practice-playback';
import { useMediaSession } from '@/hooks/use-media-session';
import { useReplayRecorder } from '@/hooks/use-replay-recorder';
import { setLastReplayId } from '@/lib/replay-state';
import { getPitchDetector } from '@/lib/audio/pitch-detector';
import { getMultiMicrophoneManager } from '@/lib/audio/microphone-manager';
import {
  applyLoudnessVolume,
  clearLoudnessGain,
  getSongLoudnessGainDb,
} from '@/lib/audio/loudness';
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
  // DO-NOT-CHANGE: Single selector for gameState. Previous attempt to split into 15
  // individual selectors + useMemo did NOT help because currentTime (40fps) and
  // detectedPitch (60fps) are included in the combined object — they force useMemo
  // to create a new object at the same rate. The split only added overhead (15 Zustand
  // subscription checks instead of 1). To actually reduce re-renders, currentTime and
  // detectedPitch would need to be removed from this object and passed separately — but
  // that requires refactoring all downstream consumers.
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
  const blindFrequency = usePartyStore(s => {
    // Primary: competitive game (party flow) stores numeric frequency (0.15, 0.30, etc.)
    const comp = s.competitiveGame?.settings?.blindFrequency;
    if (typeof comp === 'number') return comp;
    // Fallback: unified setup result (library quick-start) stores label ('light', 'normal', etc.)
    const label = (s.unifiedSetupResult?.settings as Record<string, unknown> | undefined)?.blindFrequency as string | undefined;
    const freqMap: Record<string, number> = { light: 0.15, normal: 0.30, hard: 0.60, insane: 0.90 };
    return freqMap[label || 'normal'];
  });
  const missingWordFrequency = usePartyStore(s => {
    // Primary: competitive game (party flow) stores numeric frequency (0.15, 0.30, etc.)
    const comp = s.competitiveGame?.settings?.missingWordFrequency;
    if (typeof comp === 'number') return comp;
    // Fallback: unified setup result (library quick-start) stores label ('light', 'normal', etc.)
    const label = (s.unifiedSetupResult?.settings as Record<string, unknown> | undefined)?.missingWordFrequency as string | undefined;
    const freqMap: Record<string, number> = { light: 0.15, easy: 0.15, normal: 0.30, hard: 0.60, insane: 0.90 };
    return freqMap[label || 'normal'];
  });
  const blindHardcore = usePartyStore(s =>
    s.competitiveGame?.settings?.hardcore ?? !!(s.unifiedSetupResult?.settings as Record<string, unknown> | undefined)?.hardcore
  );
  const hardcoreMissingWords = usePartyStore(s =>
    s.competitiveGame?.settings?.hardcoreMissingWords ?? !!(s.unifiedSetupResult?.settings as Record<string, unknown> | undefined)?.hardcoreMissingWords
  );
  const missingWordsGranularity = usePartyStore(s =>
    (s.competitiveGame?.settings?.missingWordsGranularity ?? (s.unifiedSetupResult?.settings as Record<string, unknown> | undefined)?.granularity) as 'word' | 'passage' | 'both' | undefined
  );
  const escalating = usePartyStore(s =>
    s.competitiveGame?.settings?.escalating ?? !!(s.unifiedSetupResult?.settings as Record<string, unknown> | undefined)?.escalating
  );
  const { pitchResult, initialize: initializePitch, start, stop, setDifficulty: setPitchDifficulty } = usePitchDetector();

  // ── Resolve P1 microphone deviceId + stereoChannel from party setup ──
  // When the game is launched via the unified party setup, the first player's
  // mic assignment (micId = mic-manager internal ID) and stereoChannel are
  // available in unifiedSetupResult.players[0]. We resolve the browser deviceId
  // from the mic manager so the pitch detector opens the correct device.
  const p1MicRef = useRef<{ deviceId?: string; stereoChannel?: number } | null>(null);
  useEffect(() => {
    const setupResult = usePartyStore.getState().unifiedSetupResult;
    const p1 = setupResult?.players?.[0];
    if (!p1 || p1.playerType !== 'microphone' || !p1.micId) {
      p1MicRef.current = null;
      return;
    }
    // Look up the mic manager's internal ID → browser deviceId
    try {
      const micManager = getMultiMicrophoneManager();
      const assigned = micManager.getAssignedMicrophones().find(m => m.id === p1.micId);
      p1MicRef.current = {
        deviceId: assigned?.deviceId,
        stereoChannel: p1.stereoChannel,
      };
    } catch {
      p1MicRef.current = { deviceId: undefined, stereoChannel: p1.stereoChannel };
    }
  }, []);

  // Wrap initialize to inject P1's deviceId and stereoChannel
  const initialize = useCallback(async () => {
    const mic = p1MicRef.current;
    return initializePitch(mic?.deviceId, mic?.stereoChannel);
  }, [initializePitch]);

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
    loudnessNormalization,
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

  // Track the audio element for media-element consumers (avoids reading ref during render)
  const audioElRefCallback = useCallback((el: HTMLAudioElement | null) => {
    audioRef.current = el;
  }, [audioRef]);

  // Native audio (ASIO / WASAPI)
  const nativeAudio = useNativeAudio();

  // Settings from localStorage - managed via useGameSettings hook
  const {
    showBackgroundVideo,
    useAnimatedBackground,
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
    visibleNotesRef,
    p1VisibleNotesRef,
    p2VisibleNotesRef,
    timingDataRef,
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
    sampleVisualTicks,
    sampleP2VisualTicks,
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
    isBlindSection: gameState.isBlindSection,
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
  const tournamentMatchId = usePartyStore(s => s.currentTournamentMatch?.id || null);
  const competitiveGame = usePartyStore(s => s.competitiveGame);
  useMobileGameSync(song, isPlaying, gameState.gameMode, gameState.status === 'ended', tournamentMatchId);

  // ── Blind / Missing-Words warning state (drives the in-game warning banner) ──
  // useGameModes fires these callbacks per frame with (countdown, isActive):
  //   countdown > 0 && isActive → N seconds until the blind/hidden section starts
  //   countdown = 0 && isActive → currently inside a blind/hidden section
  //   countdown = 0 && !isActive → idle
  // The prev-check keeps repeated per-frame setState calls cheap (identical values
  // return the previous state object → React skips the re-render).
  const [blindWarning, setBlindWarning] = useState({ countdown: 0, active: false });
  const [missingWordsWarning, setMissingWordsWarning] = useState({ countdown: 0, active: false });
  // Audible attention cues for blind/hidden section transitions
  // (visual banner + sound — singers can't stare at the HUD while singing)
  useModeWarningCues(gameState.gameMode, blindWarning, missingWordsWarning);
  const onBlindWarning = useCallback((countdown: number, isActive: boolean) => {
    setBlindWarning(prev => (prev.countdown === countdown && prev.active === isActive)
      ? prev
      : { countdown, active: isActive });
  }, []);
  const onMissingWordsWarning = useCallback((countdown: number, isActive: boolean) => {
    setMissingWordsWarning(prev => (prev.countdown === countdown && prev.active === isActive)
      ? prev
      : { countdown, active: isActive });
  }, []);

  // Clear stale warning state when playback stops (game end / pause exits the
  // per-frame callback loop, so an active warning would otherwise persist).
  // Uses the React "adjust state during render" pattern instead of an effect
  // to avoid cascading renders (react-hooks/set-state-in-effect).
  const [wasPlaying, setWasPlaying] = useState(isPlaying);
  if (wasPlaying !== isPlaying) {
    setWasPlaying(isPlaying);
    if (!isPlaying) {
      setBlindWarning({ countdown: 0, active: false });
      setMissingWordsWarning({ countdown: 0, active: false });
    }
  }

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
    currentMissingWordsIndices: gameState.missingWordsIndices,
    onBlindWarning,
    onMissingWordsWarning,
    blindFrequency,
    missingWordFrequency,
    hardcore: blindHardcore,
    hardcoreMissingWords,
    missingWordsGranularity,
    escalatingMultiplier: escalating ? (competitiveGame?.rounds[competitiveGame.currentRoundIndex]?.frequencyMultiplier ?? 1.0) : undefined,
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
    sampleVisualTicks,
    sampleP2VisualTicks,
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
    // BR-pattern: pass refs for per-frame visible notes updates
    timingDataRef,
    visibleNotesRef,
    p1VisibleNotesRef,
    p2VisibleNotesRef,
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

  // ── Loudness normalization: per-song gain toward the 89 dB ReplayGain reference ──
  // Analysis is async and NEVER blocks playback start: the gain is applied as
  // soon as it arrives (and re-applied whenever masterVolume changes) by the
  // volume effect below. Failures yield gain 0 (unchanged volume). The state is
  // tagged with the analyzed songId so a stale (previous song's) gain is
  // ignored while the new song's analysis is still running.
  const [loudnessGain, setLoudnessGain] = useState<{ songId: string | null; gainDb: number }>({ songId: null, gainDb: 0 });
  const songLoudnessUrl = effectiveSong?.audioUrl;
  const songLoudnessId = effectiveSong?.id;
  const loudnessGainDb = loudnessNormalization && loudnessGain.songId === songLoudnessId
    ? loudnessGain.gainDb
    : 0;
  useEffect(() => {
    // Capture the element that belongs to THIS song (the <audio> element is
    // re-created per song via key={song.id}) so cleanup clears the right one.
    const el = audioRef.current;
    let cancelled = false;
    if (el) clearLoudnessGain(el);
    if (!songLoudnessId || !songLoudnessUrl || !loudnessNormalization) return;
    getSongLoudnessGainDb(songLoudnessId, songLoudnessUrl)
      .then((gainDb) => {
        if (cancelled) return;
        setLoudnessGain({ songId: songLoudnessId, gainDb });
      })
      .catch(() => {
        // Never throw — analysis failure means gain 0 (no state update).
      });
    return () => {
      cancelled = true;
      if (el) clearLoudnessGain(el);
    };
  }, [songLoudnessId, songLoudnessUrl, loudnessNormalization, audioRef]);

  // Apply master volume (+ loudness normalization) to audio/video elements.
  // songLoudnessId is a dependency so a freshly created <audio> element (new
  // song) gets the volume applied even when masterVolume itself didn't change.
  useEffect(() => {
    if (audioRef.current) {
      applyLoudnessVolume(audioRef.current, masterVolume, loudnessGainDb);
    }
    // The video element is only audible when it carries the song's embedded
    // audio (no separate audioUrl — in that case the gain is 0 anyway); when a
    // separate audio file exists the background video is muted. Apply the
    // element-level attenuation only (no Web Audio graph for the video).
    if (videoRef.current) {
      const factor = loudnessGainDb <= 0 ? Math.pow(10, loudnessGainDb / 20) : 1;
      videoRef.current.volume = Math.min(1, Math.max(0, (masterVolume / 100) * factor));
    }
  }, [masterVolume, loudnessGainDb, songLoudnessId, audioRef, videoRef]);

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
    scoreEvents,
    notePerformance,
    p2NotePerformance,
    p2State,
    p2DetectedPitch,

    // Timing — read from refs so the game loop's frame-accurate data is used
    timingData,
    visibleNotes: visibleNotesRef.current,
    p1VisibleNotes: p1VisibleNotesRef.current,
    p2VisibleNotes: p2VisibleNotesRef.current,
    pitchStats,
    p1PitchStats,
    p2PitchStats,

    // Settings
    showBackgroundVideo,
    useAnimatedBackground,
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

    // Blind / Missing-Words warning banner state
    blindWarning,
    missingWordsWarning,
  };
}
