'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { useNoteScoring } from '@/hooks/use-note-scoring';
import { useGameSettings } from '@/hooks/use-game-settings';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { LyricLine, Note, PLAYER_COLORS } from '@/types/game';
import { PRACTICE_MODE_DEFAULTS, PracticeModeConfig } from '@/lib/game/practice-mode';
import { CHALLENGE_MODES } from '@/lib/game/player-progression';
import { 
  WebcamBackground, 
  WebcamQuickControls,
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
import { ScoreEventsDisplay } from '@/components/game/score-events-display';
import { PitchGraphDisplay } from '@/components/game/pitch-graph-display';
import { PracticePanel } from '@/components/game/practice-panel';
import { ProminentScoreDisplay } from '@/components/game/prominent-score-display';
import {
  ParticleSystem,
  useParticleEmitter,
  ComboFireEffect,
  useSongEnergy
} from '@/components/game/visual-effects';
import { SpectrogramDisplay } from '@/components/game/spectrogram-display';
import { GameBackground } from '@/components/game/game-background';
import { DuetNoteHighway } from '@/components/game/duet-note-highway';
import { NoteHighway } from '@/components/game/note-highway';
import { NoteLane } from '@/components/game/note-lane';
import { SinglePlayerLyrics } from '@/components/game/single-player-lyrics';
import { useRemoteControl } from '@/hooks/use-remote-control';
import { useMobilePitchPolling } from '@/hooks/use-mobile-pitch-polling';
import { useGameMedia } from '@/hooks/use-game-media';
import { useGameLoop } from '@/hooks/use-game-loop';
import { useNativeAudio } from '@/hooks/use-native-audio';
import { GameCountdown } from '@/components/game/game-countdown';
import { GameScoreDisplay } from '@/components/game/game-score-display';
import { useSmoothedPitch } from '@/hooks/use-smoothed-pitch';
import { useGameAudioEffects } from '@/hooks/use-game-audio-effects';
import { useYouTubeGame } from '@/hooks/use-youtube-game';
import { useGameModes } from '@/hooks/use-game-modes';
import { useMobileGameSync } from '@/hooks/use-mobile-game-sync';
import { usePracticePlayback } from '@/hooks/use-practice-playback';
import { useMediaSession } from '@/hooks/use-media-session';
import {
  VolumeMeter,
  AudioEffectsButton,
  AudioEffectsPanel,
  AdIndicator,
  GameProgressBar,
  TimeDisplay,
} from '@/components/game/game-hud';
import { isDuetSong } from '@/components/screens/library/utils';
import { MicIndicator } from '@/components/game/mic-indicator';
import { useReplayRecorder } from '@/hooks/use-replay-recorder';
import { setLastReplayId } from '@/lib/replay-state';
import { getPitchDetector } from '@/lib/audio/pitch-detector';
import { cleanupOldReplays } from '@/lib/db/replay-db';

// ===================== GAME SCREEN =====================
function GameScreen({ onEnd, onBack, onPause }: { onEnd: () => void; onBack: () => void; onPause?: () => void }) {
  const { gameState, setCurrentTime, setDetectedPitch, updatePlayer, endGame, resetGame, setResults, addPlayer, createProfile, profiles, setMissingWordsIndices, setBlindSection } = useGameStore();
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
    try { return JSON.parse(localStorage.getItem('karaoke-replay-enabled') || 'true'); } catch { return true; }
  });

  const [youtubeTime, setYoutubeTime] = useState(0);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const wasPlayingRef = useRef(false);

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
  
  // Practice mode state
  const [practiceMode, setPracticeMode] = useState<PracticeModeConfig>(PRACTICE_MODE_DEFAULTS);
  const [showPracticeControls, setShowPracticeControls] = useState(false);

  // Practice playback: apply playbackRate to audio/video, loop detection
  const { loopCount, setLoopStart, setLoopEnd, resetLoopCount } = usePracticePlayback({
    practiceMode,
    isPlaying,
    currentTime: gameState.currentTime,
    audioRef,
    videoRef,
  });
  
  // Challenge mode state - read from localStorage when game starts
  const [activeChallenge] = useState<typeof CHALLENGE_MODES[0] | null>(() => {
    if (typeof window !== 'undefined') {
      const savedChallengeId = localStorage.getItem('karaoke-challenge-mode');
      if (savedChallengeId) {
        const challenge = CHALLENGE_MODES.find(c => c.id === savedChallengeId);
        if (challenge) {
          localStorage.removeItem('karaoke-challenge-mode'); // Clear after reading
          return challenge;
        }
      }
    }
    return null;
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
  
  // Load webcam config from localStorage after mount
  useEffect(() => {
    const savedConfig = loadWebcamConfig();
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
    emitComboFirework 
  } = useParticleEmitter();
  
  // Song energy for visual effects intensity
  const songEnergy = useSongEnergy(audioRef);
  
  // Check if this is a duet song (use comprehensive detection, not just flag)
  // Also treat blind/missing-words competitive modes as duet when 2+ players are added
  // NOTE: In low-performance mode, force single-player (no duet split-screen)
  const isCompetitiveMultiplayer = !isLowPerf && (gameState.gameMode === 'blind' || gameState.gameMode === 'missing-words') && gameState.players.length >= 2;
  const isDuetMode = !isLowPerf && ((song ? isDuetSong(song) : false) || gameState.gameMode === 'duet' || gameState.gameMode === 'duel' || isCompetitiveMultiplayer);

  // =====================================================
  // PRE-COMPUTE ALL TIMING DATA ONCE WHEN SONG LOADS
  // MUST be defined BEFORE useNoteScoring hook!
  // =====================================================
  const timingData = useMemo(() => {
    if (!effectiveSong || effectiveSong.lyrics.length === 0) return null;
    
    const allNotes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    const p1Notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    const p2Notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    
    effectiveSong.lyrics.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        const noteWithLine = { ...note, lineIndex, line };
        allNotes.push(noteWithLine);
        
        if (isDuetMode) {
          if (note.player === 'P1') {
            p1Notes.push(noteWithLine);
          } else if (note.player === 'P2') {
            p2Notes.push(noteWithLine);
          } else {
            p1Notes.push(noteWithLine);
            p2Notes.push(noteWithLine);
          }
        }
      });
    });
    
    allNotes.sort((a, b) => a.startTime - b.startTime);
    p1Notes.sort((a, b) => a.startTime - b.startTime);
    p2Notes.sort((a, b) => a.startTime - b.startTime);
    
    const sortedLines = [...effectiveSong.lyrics].sort((a, b) => a.startTime - b.startTime);
    const hasExplicitPlayerMarkers = sortedLines.some(line => line.player === 'P1' || line.player === 'P2');
    
    const p1Lines = sortedLines.filter(line => {
      if (hasExplicitPlayerMarkers) return line.player === 'P1' || line.player === 'both';
      return true;
    });
    
    const p2Lines = sortedLines.filter(line => {
      if (hasExplicitPlayerMarkers) return line.player === 'P2' || line.player === 'both';
      return true;
    });
    
    const beatDurationMs = effectiveSong.bpm ? 15000 / effectiveSong.bpm : 500;
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
  }, [effectiveSong, isDuetMode]);
  
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
    timingData,
    isDuetMode,
    beatDuration,
    updatePlayer,
    onPerfectHit: emitPerfectHit,
    onGoldenNote: emitGoldenNote,
    onComboMilestone: useCallback((combo: number, x: number, y: number) => emitComboFirework(x, y, combo), [emitComboFirework]),
  });

  // Timing synchronization - constant offset (user adjustable in future)
  const timingOffset = 0;
  
  // Use mobile pitch for P2 in duet/duel mode
  useEffect(() => {
    if (isDuetMode && mobilePitch) {
      setP2DetectedPitch(mobilePitch.frequency);
      setP2Volume(mobilePitch.volume || 0);
    } else if (isDuetMode && !mobilePitch?.frequency) {
      setP2DetectedPitch(null);
      setP2Volume(0);
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
    isRecording: isReplayRecording,
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
    timingOffset,
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
  }, [effectiveSong, mediaLoaded, audioRef, videoRef]);

  if (!song) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-white/60 mb-4">No song selected</p>
        <Button onClick={onBack} className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white">Back to Library</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/70 to-transparent">
        {/* Left: Back / Pause Button */}
        <Button variant="ghost" onClick={() => {
          if (onPause) {
            onPause();
          } else {
            abortGameLoop();
            stop();
            if (audioEffects) audioEffects.disconnect();
            if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
            if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
            nativeAudio.stop().catch(() => {});
            setIsPlaying(false);
            resetScoring();
            onBack();
          }
        }} className="text-white/80 hover:text-white hover:bg-white/10">
          ⏸ Pause
        </Button>
        
        {/* Center: Webcam Controls — hidden in low-performance mode */}
        <div className="flex items-center gap-3">
          {!isLowPerf && (
            <WebcamQuickControls 
              config={webcamConfig} 
              onConfigChange={updateWebcamConfig}
            />
          )}
          {isLowPerf && (
            <span className="text-xs text-orange-400/80 font-medium px-2 py-1 bg-orange-500/10 rounded">⚡ Low-Perf</span>
          )}
        </div>
        
        {/* Right: Score, Difficulty & Challenge */}
        <GameScoreDisplay
          isDuetMode={isDuetMode}
          score={gameState.players[0]?.score || 0}
          combo={gameState.players[0]?.combo || 0}
          difficulty={gameState.difficulty}
          activeChallenge={activeChallenge}
        />
      </div>

      {/* Pitch Graph Display — disabled in low-performance mode */}
      {isPlaying && showPitchGuide && !isLowPerf && (
        <div className="absolute top-44 left-4 z-20 w-64">
          <PitchGraphDisplay
            currentPitch={smoothedPitch}
            targetPitch={null}
            currentTime={gameState.currentTime}
            isPlaying={isPlaying}
            accuracy={undefined}
            width={280}
            height={80}
            colorScheme="neon"
            showTargetLine={false}
            minPitch={pitchStats.minPitch}
            maxPitch={pitchStats.maxPitch}
          />
        </div>
      )}

      {/* Audio Element - Primary audio source for songs with separate audio file */}
      {/* key=song.id forces React to create a fresh DOM element per song,
          preventing "already connected to different MediaElementSourceNode" errors
          when SpectrogramDisplay / useSongEnergy call createMediaElementSource */}
      {effectiveSong?.audioUrl && (
        <audio 
          key={effectiveSong.id}
          ref={audioRef}
          src={effectiveSong.audioUrl}
          className="hidden"
          onEnded={endGameAndCleanup}
          onError={(e) => {
            const audio = e.currentTarget;
            console.error('[GameScreen] Audio element error:', {
              error: audio.error,
              networkState: audio.networkState,
              readyState: audio.readyState,
              src: audio.src?.substring(0, 50)
            });
          }}
          onCanPlay={() => { audioLoadedRef.current = true; }}
          onLoadStart={() => {}}
          preload="auto"
        />
      )}

      {/* Hidden Video Element for embedded audio (when video has audio but we don't show it) */}
      {effectiveSong?.hasEmbeddedAudio && effectiveSong?.videoBackground && !showBackgroundVideo && !isYouTube && !effectiveSong?.audioUrl && (
        <video
          key={`video-${effectiveSong.id}`}
          ref={videoRef}
          src={effectiveSong.videoBackground}
          className="hidden"
          muted={false}
          playsInline
          onEnded={endGameAndCleanup}
          preload="auto"
        />
      )}

      {/* Game Area - Full Screen */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Background layer — in low-perf mode: no video, no animated bg, no song energy */}
        <GameBackground
          effectiveSong={effectiveSong}
          showBackgroundVideo={!isLowPerf && showBackgroundVideo}
          useAnimatedBackground={!isLowPerf && useAnimatedBackground}
          isYouTube={isYouTube}
          youtubeVideoId={youtubeVideoId}
          useYouTubeAudio={useYouTubeAudio}
          isPlaying={isPlaying}
          isAdPlaying={isAdPlaying}
          songEnergy={isLowPerf ? 0 : (songEnergy ?? 0)}
          volume={volume}
          videoRef={videoRef}
          onYoutubeTimeUpdate={setYoutubeTime}
          onAdStart={handleAdStart}
          onAdEnd={handleAdEnd}
          onVideoEnded={endGameAndCleanup}
          onVideoCanPlay={() => { videoLoadedRef.current = true; }}
          onYoutubeError={(errorCode) => {
            const messages: Record<number, string> = {
              100: 'YouTube-Video nicht gefunden (gelöscht oder privat)',
              101: 'Dieses Video kann nicht eingebettet werden (Vevo/Einbettungssperre)',
              150: 'Dieses Video kann nicht eingebettet werden (Einbettungssperre)',
              2: 'Ungültiger YouTube-Parameter',
              5: 'HTML5-Fehler beim YouTube-Player',
            };
            setYoutubeError(messages[errorCode] || `YouTube-Fehler (Code: ${errorCode})`);
            console.error('[GameScreen] YouTube error:', errorCode);
          }}
        />

        {/* Webcam Background — disabled in low-performance mode */}
        {!isLowPerf && (
          <WebcamBackground 
            config={webcamConfig} 
            onConfigChange={updateWebcamConfig}
          />
        )}

        {/* Countdown */}
        <GameCountdown countdown={countdown} />
        
        {/* Ad Indicator */}
        <AdIndicator isAdPlaying={isAdPlaying} adCountdown={adCountdown} />
        
        {/* YouTube Error Indicator */}
        {youtubeError && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg max-w-md text-center">
            ⚠️ {youtubeError}
          </div>
        )}

        {/* Dark Overlay for better note visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 z-5" />

        {/* Note Highway — use lightweight NoteLane in low-performance mode */}
        {isLowPerf ? (
          <NoteLane
            lyrics={timingData?.sortedLines || []}
            currentTime={gameState.currentTime}
            difficulty={gameState.difficulty}
            detectedPitch={pitchResult?.frequency ?? null}
          />
        ) : isDuetMode ? (
          <DuetNoteHighway
            p1VisibleNotes={p1VisibleNotes}
            p2VisibleNotes={p2VisibleNotes}
            p1PitchStats={p1PitchStats}
            p2PitchStats={p2PitchStats}
            currentTime={gameState.currentTime}
            p1DetectedPitch={smoothedPitch}
            p2DetectedPitch={p2DetectedPitch}
            p1State={gameState.players[0]}
            p2State={p2State}
            noteShapeStyle={noteShapeStyle}
            p1Lines={timingData?.p1Lines}
            p2Lines={timingData?.p2Lines}
            singLinePosition={SING_LINE_POSITION}
            noteWindow={NOTE_WINDOW}
            notePerformance={notePerformance}
            gameMode={gameState.gameMode}
            missingWordsIndices={gameState.missingWordsIndices}
            isBlindSection={gameState.isBlindSection}
            p1PlayerName={song?.duetPlayerNames?.[0] || gameState.players[0]?.name || 'Player 1'}
            p2PlayerName={song?.duetPlayerNames?.[1] || gameState.players[1]?.name || 'Player 2'}
            noteDisplayStyle={noteDisplayStyle as 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'}
          />
        ) : (
          <NoteHighway
            visibleNotes={visibleNotes}
            currentTime={gameState.currentTime}
            pitchStats={pitchStats}
            detectedPitch={smoothedPitch}
            noteShapeStyle={noteShapeStyle}
            noteDisplayStyle={noteDisplayStyle as 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'}
            notePerformance={notePerformance}
            singLinePosition={SING_LINE_POSITION}
            noteWindow={NOTE_WINDOW}
            playerColor={PLAYER_COLORS[0]}
            showPlayerLabel={false}
            visibleTop={VISIBLE_TOP}
            visibleRange={VISIBLE_RANGE}
          />
        )}

        {/* Lyrics Display — NoteLane has built-in lyrics in low-perf mode */}
        {!isDuetMode && !isLowPerf && timingData && (
          <SinglePlayerLyrics
            sortedLines={timingData.sortedLines}
            currentTime={gameState.currentTime}
            playerColor={PLAYER_COLORS[0]}
            noteDisplayStyle={noteDisplayStyle as 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'}
            notePerformance={notePerformance}
            gameMode={gameState.gameMode}
            missingWordsIndices={gameState.missingWordsIndices}
            isBlindSection={gameState.isBlindSection}
          />
        )}

        {/* Mic Indicator — shows assigned mic + player during gameplay */}
        <MicIndicator
          currentTime={gameState.currentTime}
          isPlaying={isPlaying}
          isDuetMode={isDuetMode}
          gameMode={gameState.gameMode}
        />

        {/* Volume Meter */}
        <VolumeMeter volume={volume} />

        {/* Audio Effects Button */}
        <AudioEffectsButton onClick={toggleAudioEffects} />

        {/* Audio Effects Panel */}
        <AudioEffectsPanel
          show={showAudioEffects}
          audioEffects={audioEffects}
          reverbAmount={reverbAmount}
          echoAmount={echoAmount}
          onReverbChange={setReverbAmount}
          onEchoChange={setEchoAmount}
        />
        
        {/* Progress Bar — uses actual media duration when available */}
        <GameProgressBar
          currentTime={gameState.currentTime}
          duration={displayDuration}
        />
        
        {/* Time Display — uses actual media duration when available */}
        <TimeDisplay
          currentTime={gameState.currentTime}
          duration={displayDuration}
        />
      </div>

      <PracticePanel
        practiceMode={practiceMode}
        showControls={showPracticeControls}
        onToggleControls={() => setShowPracticeControls(!showPracticeControls)}
        onPracticeModeChange={(config) => setPracticeMode(p => ({ ...p, ...config }))}
      />

      {/* Score Events & Particles — disabled in low-performance mode */}
      {!isLowPerf && <ScoreEventsDisplay events={scoreEvents} maxVisible={5} />}
      {!isLowPerf && <ParticleSystem particles={particles} />}
      
      {/* Spectrogram Display / Equalizer — left side, below pitch detection */}
      {showPitchGuide && isPlaying && !isLowPerf && (
        <SpectrogramDisplay
          audioElement={audioRef.current}
          isActive={isPlaying && !!audioRef.current}
          mode="bars"
          position={{ x: 50, y: 50 }}
          size={{ width: 256, height: 40 }}
          colorScheme="neon"
          numBars={24}
          className="!absolute !left-4 !top-[17.5rem] !transform-none"
        />
      )}
      
      {/* Combo Fire Effect — disabled in low-performance mode */}
      {!isLowPerf && gameState.players[0]?.combo && gameState.players[0].combo >= 5 && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <ComboFireEffect combo={gameState.players[0].combo} isLarge={gameState.players[0].combo >= 20} />
        </div>
      )}
      
      {/* Prominent Score Display - Only for Single Player Mode */}
      {!isDuetMode && <ProminentScoreDisplay player={gameState.players[0]} />}
    </div>
  );
}

export { GameScreen };
