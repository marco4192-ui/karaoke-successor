'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { useNoteScoring } from '@/hooks/use-note-scoring';
import { useGameSettings } from '@/hooks/use-game-settings';
import { useGameStore } from '@/lib/game/store';
import { LyricLine, Note, PLAYER_COLORS } from '@/types/game';
import { PRACTICE_MODE_DEFAULTS, PracticeModeConfig } from '@/lib/game/practice-mode';
import { AudioEffectsEngine } from '@/lib/audio/audio-effects';
import { MusicReactiveBackground } from '@/components/game/music-reactive-background';
import { CHALLENGE_MODES } from '@/lib/game/player-progression';
import { 
  WebcamBackground, 
  WebcamQuickControls,
  WebcamBackgroundConfig,
  DEFAULT_WEBCAM_CONFIG,
  loadWebcamConfig,
  saveWebcamConfig,
} from '@/components/game/webcam-background';
import { YouTubePlayer, extractYouTubeId } from '@/components/game/youtube-player';
import LyricLineDisplay from '@/components/game/lyric-line-display';
import {
  calculateScoringMetadata,
} from '@/lib/game/scoring';
import {
  calculatePitchStats,
  PitchStats,
} from '@/lib/game/note-utils';
import { ScoreEventsDisplay } from '@/components/game/score-events-display';
import { PitchGraphDisplay } from '@/components/game/pitch-graph-display';
import { PracticePanel } from '@/components/game/practice-panel';
import { ProminentScoreDisplay } from '@/components/game/prominent-score-display';
import {
  ParticleSystem,
  useParticleEmitter,
  AnimatedBackground as VisualAnimatedBackground,
  ComboFireEffect,
  useSongEnergy
} from '@/components/game/visual-effects';
import { SpectrogramDisplay } from '@/components/game/spectrogram-display';
import { DuetNoteHighway } from '@/components/game/duet-note-highway';
import { NoteHighway } from '@/components/game/note-highway';
import { SinglePlayerLyrics } from '@/components/game/single-player-lyrics';
import { useRemoteControl } from '@/hooks/use-remote-control';
import { useMobilePitchPolling } from '@/hooks/use-mobile-pitch-polling';
import { useGameMedia } from '@/hooks/use-game-media';
import { useGameLoop } from '@/hooks/use-game-loop';
import { GameCountdown } from '@/components/game/game-countdown';
import { GameScoreDisplay } from '@/components/game/game-score-display';

// ===================== HOME SCREEN =====================
// HomeScreen has been moved to /src/components/screens/home-screen.tsx

// ===================== GAME SCREEN =====================
function GameScreen({ onEnd, onBack }: { onEnd: () => void; onBack: () => void }) {
  const { gameState, setCurrentTime, setDetectedPitch, updatePlayer, endGame, setResults, addPlayer, createProfile, profiles, setMissingWordsIndices, setBlindSection } = useGameStore();
  const { pitchResult, initialize, start, stop, setDifficulty: setPitchDifficulty } = usePitchDetector();
  
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

  const [youtubeTime, setYoutubeTime] = useState(0); // Track YouTube video time
  const [isPlaying, setIsPlaying] = useState(false);

  // Settings from localStorage - managed via useGameSettings hook
  const {
    showBackgroundVideo,
    showPitchGuide,
    useAnimatedBackground,
    noteDisplayStyle,
    noteShapeStyle,
  } = useGameSettings();
  
  // Practice mode state
  const [practiceMode, setPracticeMode] = useState<PracticeModeConfig>(PRACTICE_MODE_DEFAULTS);
  const [showPracticeControls, setShowPracticeControls] = useState(false);
  
  // Challenge mode state - read from localStorage when game starts
  const [activeChallenge, setActiveChallenge] = useState<typeof CHALLENGE_MODES[0] | null>(() => {
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
  const { mobilePitch, hasMobileClient } = useMobilePitchPolling(song);
  
  // Audio effects state - defaults to 0% (off)
  const [audioEffects, setAudioEffects] = useState<AudioEffectsEngine | null>(null);
  const audioEffectsRef = useRef<AudioEffectsEngine | null>(null);
  const [showAudioEffects, setShowAudioEffects] = useState(false);
  const [reverbAmount, setReverbAmount] = useState(0);
  const [echoAmount, setEchoAmount] = useState(0);
  const [adCountdown, setAdCountdown] = useState(0);
  
  // Duel mode state
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState('');
  const [customYoutubeId, setCustomYoutubeId] = useState<string | null>(null);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  
  // Webcam background state - SEPARATE camera for filming singers
  // Initialize with defaults to avoid hydration mismatch
  const [webcamConfig, setWebcamConfig] = useState<WebcamBackgroundConfig>({ ...DEFAULT_WEBCAM_CONFIG });
  
  // (restoredSong, loadedLyrics, lyricsLoadError, effectiveSong moved to useGameMedia hook)

  // BLIND KARAOKE MODE: Set blind sections based on time
  // Uses a deterministic seed generated once per song to avoid flickering
  const blindSeedRef = useRef<number[]>([]);
  
  useEffect(() => {
    if (gameState.gameMode === 'blind' && song && gameState.status === 'playing') {
      // Generate a deterministic blind pattern when the song starts
      // This ensures the same sections are blind every time, no flickering
      if (blindSeedRef.current.length === 0) {
        // Pre-generate blind decisions for up to 100 sections (~20 minutes of music)
        const maxSections = 100;
        const seed: number[] = [];
        let rng = Math.random(); // Generate seed once
        for (let i = 0; i < maxSections; i++) {
          rng = (rng * 16807 + 0.5) % 1; // Simple LCG pseudo-random
          seed.push(rng);
        }
        blindSeedRef.current = seed;
      }
      
      const sectionDuration = 12000; // 12 seconds per section
      const blindChance = 0.4; // 40% chance of being blind
      const currentTime = gameState.currentTime;
      
      const sectionIndex = Math.floor(currentTime / sectionDuration);
      const seedValue = blindSeedRef.current[sectionIndex % blindSeedRef.current.length] || 0;
      const isBlind = (sectionIndex % 2 === 1) || (seedValue < blindChance && sectionIndex > 0);
      
      setBlindSection(isBlind);
    }
  }, [gameState.gameMode, song, gameState.status, gameState.currentTime, setBlindSection]);
  
  // Reset blind seed when song changes
  useEffect(() => {
    blindSeedRef.current = [];
  }, [song?.id]);
  
  // SAFETY: Ensure at least one player exists before game starts
  // This prevents "Cannot read properties of undefined (reading '0')" errors
  useEffect(() => {
    if (gameState.players.length === 0 && song) {
      // Try to use existing profile or create a default player
      if (profiles.length > 0) {
        // Use the first active profile
        const activeProfile = profiles.find(p => p.isActive !== false) || profiles[0];
        addPlayer(activeProfile);
      } else {
        // Create a default player profile
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
  
  // Duet mode state - P2 volume (other P2 state is managed by useNoteScoring hook)
  const [p2Volume, setP2Volume] = useState(0);
  
  // (gameLoopRef, startTimeRef, countdownIntervalRef, isMountedRef moved to useGameLoop hook)
  
  // Visual Effects - Particle system for score feedback
  const { 
    particles, 
    emitPerfectHit, 
    emitGoldenNote, 
    emitComboFirework, 
    emitConfetti 
  } = useParticleEmitter();
  
  // Song energy for visual effects intensity
  // Note: useSongEnergy uses the audio element for analysis, so we pass the current ref value
  // This is intentionally audioRef.current (the DOM node) since the hook expects an HTMLAudioElement
  // The ref is stable for the component lifetime
  const songEnergy = useSongEnergy(audioRef.current);
  
  // Check if this is a duet song (either marked as duet or gameMode is 'duet')
  const isDuetMode = song?.isDuet || gameState.gameMode === 'duet' || gameState.gameMode === 'duel';

  // =====================================================
  // PRE-COMPUTE ALL TIMING DATA ONCE WHEN SONG LOADS
  // MUST be defined BEFORE useNoteScoring hook!
  // Uses effectiveSong which has lyrics loaded on-demand from IndexedDB
  // =====================================================
  const timingData = useMemo(() => {
    if (!effectiveSong || effectiveSong.lyrics.length === 0) return null;
    
    // Create flat array of all notes with their line reference
    const allNotes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    // Separate arrays for duet mode
    const p1Notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    const p2Notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    
    effectiveSong.lyrics.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        const noteWithLine = {
          ...note,
          lineIndex,
          line
        };
        allNotes.push(noteWithLine);
        
        // For duet mode, separate notes by player
        if (isDuetMode) {
          if (note.player === 'P1') {
            p1Notes.push(noteWithLine);
          } else if (note.player === 'P2') {
            p2Notes.push(noteWithLine);
          } else {
            // Notes without player assignment go to both players (or just P1 in single mode)
            p1Notes.push(noteWithLine);
            p2Notes.push(noteWithLine);
          }
        }
      });
    });
    
    // Sort by start time for efficient searching
    allNotes.sort((a, b) => a.startTime - b.startTime);
    p1Notes.sort((a, b) => a.startTime - b.startTime);
    p2Notes.sort((a, b) => a.startTime - b.startTime);
    
    // Create time-sorted lines for binary search
    const sortedLines = [...effectiveSong.lyrics].sort((a, b) => a.startTime - b.startTime);
    
    // Separate lines by player for duet mode
    const hasExplicitPlayerMarkers = sortedLines.some(line => line.player === 'P1' || line.player === 'P2');
    
    const p1Lines = sortedLines.filter(line => {
      if (hasExplicitPlayerMarkers) {
        return line.player === 'P1' || line.player === 'both';
      }
      return true;
    });
    
    const p2Lines = sortedLines.filter(line => {
      if (hasExplicitPlayerMarkers) {
        return line.player === 'P2' || line.player === 'both';
      }
      return true;
    });
    
    // Calculate beat duration for scoring
    const beatDurationMs = effectiveSong.bpm ? 15000 / effectiveSong.bpm : 500;
    
    // Calculate scoring metadata for duration-based scoring
    const scoringMetadata = calculateScoringMetadata(allNotes, beatDurationMs);
    const p1ScoringMetadata = calculateScoringMetadata(p1Notes, beatDurationMs);
    const p2ScoringMetadata = calculateScoringMetadata(p2Notes, beatDurationMs);
    
    return {
      allNotes,
      sortedLines,
      noteCount: allNotes.length,
      lineCount: sortedLines.length,
      p1Notes,
      p2Notes,
      p1Lines,
      p2Lines,
      p1NoteCount: p1Notes.length,
      p2NoteCount: p2Notes.length,
      scoringMetadata,
      p1ScoringMetadata,
      p2ScoringMetadata,
      beatDuration: beatDurationMs,
    };
  }, [effectiveSong, isDuetMode]);
  
  // Calculate beat duration - MUST be defined BEFORE useNoteScoring hook!
  const beatDuration = timingData?.beatDuration || (song?.bpm ? 15000 / song.bpm : 500);

  // Note scoring hook - handles all scoring logic
  const {
    scoreEvents,
    p1ScoreEvents,
    p2ScoreEvents,
    notePerformance,
    p2State,
    p2DetectedPitch,
    setP2DetectedPitch,
    checkNoteHits,
    checkP2NoteHits,
    resetScoring,
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
    onComboMilestone: (combo, x, y) => emitComboFirework(x, y, combo),
  });

  // Timing synchronization - user adjustable offset (initialized from song)
  const [timingOffset, setTimingOffset] = useState(0);
  
  // Use mobile pitch for P2 in duet/duel mode
  useEffect(() => {
    if (isDuetMode && mobilePitch?.frequency) {
      setP2DetectedPitch(mobilePitch.frequency);
      setP2Volume(mobilePitch.volume || 0);
    } else if (isDuetMode && !mobilePitch?.frequency) {
      setP2DetectedPitch(null);
      setP2Volume(0);
    }
  }, [isDuetMode, mobilePitch, setP2DetectedPitch, setP2Volume]);
  
  // Update game state for mobile clients to see
  // ===================== MOBILE COMPANION SYNC =====================
  // Sync game state to mobile clients periodically
  useEffect(() => {
    if (!song) return;
    
    const syncGameState = async () => {
      try {
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'gamestate',
            payload: {
              currentSong: { id: song.id, title: song.title, artist: song.artist },
              isPlaying: isPlaying,
              currentTime: gameState.currentTime,
              gameMode: gameState.gameMode,
              songEnded: false,
            },
          }),
        });
      } catch {
        // Ignore sync errors
      }
    };
    
    // Initial sync
    syncGameState();
    
    // Sync every 2 seconds while playing
    const syncInterval = setInterval(syncGameState, 2000);
    
    return () => clearInterval(syncInterval);
  }, [song, isPlaying, gameState.gameMode]); // Don't include currentTime - we sync periodically instead
  
  // Initialize audio effects lazily — only when the user opens the panel
  // Avoids requesting a second microphone stream at game start
  const initAudioEffects = useCallback(async () => {
    if (audioEffectsRef.current) return; // Already initialized
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const engine = new AudioEffectsEngine();
      await engine.initialize(stream);
      audioEffectsRef.current = engine;
      setAudioEffects(engine);
    } catch (error) {
      console.error('Failed to initialize audio effects:', error);
    }
  }, []);

  // Toggle audio effects panel with lazy initialization
  const toggleAudioEffects = useCallback(() => {
    if (!showAudioEffects) {
      // Opening the panel — initialize if needed
      initAudioEffects();
    }
    setShowAudioEffects(prev => !prev);
  }, [showAudioEffects, initAudioEffects]);

  // Cleanup audio effects on unmount
  useEffect(() => {
    return () => {
      if (audioEffectsRef.current) {
        audioEffectsRef.current.disconnect();
        audioEffectsRef.current = null;
      }
    };
  }, []);
  
  // ===================== REMOTE CONTROL POLLING =====================
  // Poll for remote commands from mobile companions
  useRemoteControl({
    audioRef,
    videoRef,
    isPlaying,
    setIsPlaying,
    isAdPlaying,
    stop,
    onBack,
    onEnd,
  });
  
  // Check if song has YouTube URL (from #VIDEO: tag with URL)
  // Priority: custom YouTube > song.youtubeUrl > videoBackground if URL
  // Uses effectiveSong which has restored URLs for Tauri
  const songYoutubeUrl = effectiveSong?.youtubeUrl;
  const videoBackground = effectiveSong?.videoBackground;
  const songYoutubeId = songYoutubeUrl ? extractYouTubeId(songYoutubeUrl) : 
                       (videoBackground && (videoBackground.startsWith('http://') || videoBackground.startsWith('https://')) ? 
                        extractYouTubeId(videoBackground) : null);
  // Use custom YouTube ID if set, otherwise use song's YouTube ID
  const youtubeVideoId = customYoutubeId || songYoutubeId;
  const isYouTube = !!youtubeVideoId;
  
  // Determine if we should use YouTube audio (no separate audio file)
  const useYouTubeAudio = isYouTube && !effectiveSong?.audioUrl;
  
  // Handle custom YouTube URL input
  const handleYoutubeUrlSubmit = useCallback((url: string) => {
    const extractedId = extractYouTubeId(url);
    if (extractedId) {
      setCustomYoutubeId(extractedId);
      setCustomYoutubeUrl(url);
      setShowYoutubeInput(false);
    }
  }, []);
  
  // Clear custom YouTube video
  const clearCustomYoutube = useCallback(() => {
    setCustomYoutubeId(null);
    setCustomYoutubeUrl('');
  }, []);
  
  // Handle ad detection callbacks
  const handleAdStart = useCallback(() => {
    setIsAdPlaying(true);
    setAdCountdown(30); // Max 30 seconds for ad
    
    // Pause the game if playing
    if (isPlaying) {
      setIsPlaying(false);
    }
    
    // Sync ad state to mobile clients
    fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'setAdPlaying',
        payload: { isAdPlaying: true },
      }),
    }).catch(() => {});
  }, [isPlaying]);
  
  const handleAdEnd = useCallback(() => {
    setIsAdPlaying(false);
    setAdCountdown(0);
    
    // Resume the game
    setIsPlaying(true);
    
    // Sync ad state to mobile clients
    fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'setAdPlaying',
        payload: { isAdPlaying: false },
      }),
    }).catch(() => {});
  }, []);
  
  // Ad countdown effect
  useEffect(() => {
    if (isAdPlaying && adCountdown > 0) {
      const timer = setTimeout(() => {
        setAdCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAdPlaying, adCountdown]);
  
  // Sing line position at 25% from left (like UltraStar/Vocaluxe)
  const SING_LINE_POSITION = 25; // percentage from left
  
  // Fixed time window for note display (in milliseconds)
  // This ensures consistent scrolling speed regardless of BPM
  // 4 seconds = 4000ms window for upcoming notes
  const NOTE_WINDOW = 4000; // Fixed 4 second window
  
  // NOTE: timingData and beatDuration are now defined EARLIER in the file (before useNoteScoring hook)
  
  // Calculate pitch range dynamically from pre-computed notes
  // Uses utility function for consistent pitch range calculation
  const pitchStats = useMemo<PitchStats>(() => {
    return calculatePitchStats(timingData?.allNotes);
  }, [timingData]);
  
  // Calculate pitch range for P1 specifically (for duet mode)
  const p1PitchStats = useMemo<PitchStats>(() => {
    const stats = calculatePitchStats(timingData?.p1Notes);
    return stats === calculatePitchStats(null) ? pitchStats : stats;
  }, [timingData, pitchStats]);
  
  // Calculate pitch range for P2 specifically (for duet mode)
  const p2PitchStats = useMemo<PitchStats>(() => {
    const stats = calculatePitchStats(timingData?.p2Notes);
    return stats === calculatePitchStats(null) ? pitchStats : stats;
  }, [timingData, pitchStats]);

  // MISSING WORDS MODE: Generate random hidden word indices ONCE when game starts
  const missingWordsGeneratedRef = useRef(false);
  
  useEffect(() => {
    if (gameState.gameMode === 'missing-words' && song && timingData && gameState.status === 'playing') {
      // Only generate once per game — prevent flickering on re-renders
      if (missingWordsGeneratedRef.current) return;
      missingWordsGeneratedRef.current = true;
      
      const totalNotes = timingData.allNotes.length;
      if (totalNotes === 0) return;
      
      const hideCount = Math.floor(totalNotes * 0.25); // 25% of words
      const allIndices = Array.from({ length: totalNotes }, (_, i) => i);
      
      // Fisher-Yates shuffle for proper random distribution
      for (let i = allIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
      }
      
      setMissingWordsIndices(allIndices.slice(0, hideCount));
    }
  }, [gameState.gameMode, song, timingData, gameState.status, setMissingWordsIndices]);
  
  // Reset missing words when song changes
  useEffect(() => {
    missingWordsGeneratedRef.current = false;
  }, [song?.id]);

  // Vertical pitch display constants (percentage of screen)
  // Leave 8% padding at top (for header) and 15% at bottom (for lyrics)
  const VISIBLE_TOP = 8; // percentage from top
  const VISIBLE_BOTTOM = 85; // percentage from bottom
  const VISIBLE_RANGE = VISIBLE_BOTTOM - VISIBLE_TOP;

  // (mediaLoaded, audioLoadedRef, videoLoadedRef, media loading effect moved to useGameMedia hook)

  // ── Game Loop: countdown, game loop, media playback, song-end detection ──
  const {
    countdown,
    volume,
    pauseGame,
    resumeGame,
    endGameAndCleanup,
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
    setP2Volume,
    onEnd,
    audioEffects,
    setAudioEffects,
    song,
    players: gameState.players,
  });

  // (game init, generateResults, endGameAndCleanup, cleanup, and game loop effects moved to useGameLoop hook)

  // Get upcoming notes - OPTIMIZED with pre-computed data
  const visibleNotes = useMemo(() => {
    if (!timingData) return [];
    const currentTime = gameState.currentTime;
    const windowStart = currentTime - 1000;
    const windowEnd = currentTime + NOTE_WINDOW;
    
    // Use the the pre-sorted notes array for efficient filtering
    const notes = timingData.allNotes;
    const result: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    
    // Binary search to find starting point
    let startIdx = 0;
    let endIdx = notes.length - 1;
    let midIdx: number;
    
    // Find first note that could be visible
    while (startIdx <= endIdx) {
      midIdx = Math.floor((startIdx + endIdx) / 2);
      if (notes[midIdx].startTime < windowStart) {
        startIdx = midIdx + 1;
      } else {
        endIdx = midIdx - 1;
      }
    }
    
    // Collect visible notes from starting point
    for (let i = startIdx; i < notes.length; i++) {
      const note = notes[i];
      const noteEnd = note.startTime + note.duration;
      
      if (note.startTime > windowEnd) break; // No more visible notes
      if (noteEnd >= windowStart) {
        result.push({ ...note, line: note.line });
      }
    }
    
    return result;
  }, [gameState.currentTime, timingData, NOTE_WINDOW]);
  
  // Get upcoming notes for P1 (duet mode)
  const p1VisibleNotes = useMemo(() => {
    if (!timingData || !timingData.p1Notes) return [];
    const currentTime = gameState.currentTime;
    const windowStart = currentTime - 1000;
    const windowEnd = currentTime + NOTE_WINDOW;
    
    const notes = timingData.p1Notes;
    const result: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    
    let startIdx = 0;
    let endIdx = notes.length - 1;
    let midIdx: number;
    
    while (startIdx <= endIdx) {
      midIdx = Math.floor((startIdx + endIdx) / 2);
      if (notes[midIdx].startTime < windowStart) {
        startIdx = midIdx + 1;
      } else {
        endIdx = midIdx - 1;
      }
    }
    
    for (let i = startIdx; i < notes.length; i++) {
      const note = notes[i];
      const noteEnd = note.startTime + note.duration;
      
      if (note.startTime > windowEnd) break;
      if (noteEnd >= windowStart) {
        result.push({ ...note, line: note.line });
      }
    }
    
    return result;
  }, [gameState.currentTime, timingData, NOTE_WINDOW]);
  
  // Get upcoming notes for P2 (duet mode)
  const p2VisibleNotes = useMemo(() => {
    if (!timingData || !timingData.p2Notes) return [];
    const currentTime = gameState.currentTime;
    const windowStart = currentTime - 1000;
    const windowEnd = currentTime + NOTE_WINDOW;
    
    const notes = timingData.p2Notes;
    const result: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    
    let startIdx = 0;
    let endIdx = notes.length - 1;
    let midIdx: number;
    
    while (startIdx <= endIdx) {
      midIdx = Math.floor((startIdx + endIdx) / 2);
      if (notes[midIdx].startTime < windowStart) {
        startIdx = midIdx + 1;
      } else {
        endIdx = midIdx - 1;
      }
    }
    
    for (let i = startIdx; i < notes.length; i++) {
      const note = notes[i];
      const noteEnd = note.startTime + note.duration;
      
      if (note.startTime > windowEnd) break;
      if (noteEnd >= windowStart) {
        result.push({ ...note, line: note.line });
      }
    }
    
    return result;
  }, [gameState.currentTime, timingData, NOTE_WINDOW]);

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
        {/* Left: Back Button */}
        <Button variant="ghost" onClick={() => {
          // Cleanup before leaving - stop microphone and all media
          stop();
          if (audioEffects) {
            audioEffects.disconnect();
          }
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
          setIsPlaying(false);
          onBack();
        }} className="text-white/80 hover:text-white hover:bg-white/10">
          ← Back
        </Button>
        
        {/* Center: Webcam Controls */}
        <div className="flex items-center gap-3">
          <WebcamQuickControls 
            config={webcamConfig} 
            onConfigChange={updateWebcamConfig}
          />
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
      


      {/* Pitch Graph Display - Shows real-time pitch visualization */}
      {isPlaying && showPitchGuide && (
        <div className="absolute top-44 left-4 z-20 w-64">
          <PitchGraphDisplay
            currentPitch={pitchResult?.note ?? null}
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

      {/* Audio Element - For songs with separate audio file */}
      {/* ALWAYS render audio element if audioUrl exists - this is the primary audio source */}
      {/* Sound priority: 1) Music file (audioUrl) > 2) YouTube audio > 3) Local video audio */}
      {/* Uses effectiveSong which has restored URLs for Tauri */}
      {effectiveSong?.audioUrl && (
        <audio 
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
          onCanPlay={() => {
            audioLoadedRef.current = true;
          }}
          onLoadStart={() => {}}
          preload="auto"
        />
      )}

      {/* Hidden Video Element for embedded audio (when video has audio but we don't show it) */}
      {/* Case 1: Local video with embedded audio, video disabled */}
      {effectiveSong?.hasEmbeddedAudio && effectiveSong?.videoBackground && !showBackgroundVideo && !isYouTube && !effectiveSong?.audioUrl && (
        <video
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
        {/* Video Background */}
        {/* YouTube Video - plays with audio when no separate audio file exists */}
        {/* When showBackgroundVideo is true: show video AND play audio from YouTube if no audioUrl */}
        {/* When showBackgroundVideo is false but useYouTubeAudio: still play audio from hidden YouTube */}
        {showBackgroundVideo && isYouTube && youtubeVideoId ? (
          <YouTubePlayer
            videoId={youtubeVideoId}
            videoGap={effectiveSong?.videoGap || 0}
            onReady={() => {}}
            onTimeUpdate={(time) => setYoutubeTime(time)}
            onEnded={endGameAndCleanup}
            onAdStart={handleAdStart}
            onAdEnd={handleAdEnd}
            isPlaying={isPlaying}
            startTime={0}
            interactive={isAdPlaying}
          />
        ) : /* Hidden YouTube for audio only (video disabled but using YouTube audio) */
        !showBackgroundVideo && isYouTube && youtubeVideoId && useYouTubeAudio ? (
          /* Hidden YouTube player - we need to play it but not show it */
          <div className="hidden">
            <YouTubePlayer
              videoId={youtubeVideoId}
              videoGap={effectiveSong?.videoGap || 0}
              onReady={() => {}}
              onTimeUpdate={(time) => setYoutubeTime(time)}
              onEnded={endGameAndCleanup}
              onAdStart={handleAdStart}
              onAdEnd={handleAdEnd}
              isPlaying={isPlaying}
              startTime={0}
            />
          </div>
        ) : /* Local video file - separate audio (video muted, audio plays separately) */
        showBackgroundVideo && effectiveSong?.videoBackground && !effectiveSong?.hasEmbeddedAudio && !isYouTube ? (
          <video
            key={`video-bg-${effectiveSong?.id}`}
            ref={videoRef}
            src={effectiveSong.videoBackground}
            className="absolute inset-0 w-full h-full object-cover"
            muted={true}
            playsInline
            autoPlay={false}
            preload="auto"
            onEnded={endGameAndCleanup}
          />
        ) : /* Video with embedded audio - visible AND plays audio */
        showBackgroundVideo && effectiveSong?.videoBackground && effectiveSong?.hasEmbeddedAudio && !isYouTube ? (
          <video
            key={`video-embedded-${effectiveSong?.id}`}
            ref={videoRef}
            src={effectiveSong.videoBackground}
            className="absolute inset-0 w-full h-full object-cover"
            muted={false}
            playsInline
            autoPlay={false}
            preload="auto"
            onEnded={endGameAndCleanup}
            onLoadedMetadata={() => {}}
            onCanPlay={() => {
              videoLoadedRef.current = true;
            }}
          />
        ) : /* Background image from #BACKGROUND: or #COVER: tag */
        showBackgroundVideo && !useAnimatedBackground && (effectiveSong?.backgroundImage || effectiveSong?.coverImage) ? (
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${effectiveSong?.backgroundImage || effectiveSong?.coverImage})`,
            }}
          >
            {/* Dark overlay for better note visibility */}
            <div className="absolute inset-0 bg-black/40" />
          </div>
        ) : /* Visual effects animated background with disco lights and particles */
        useAnimatedBackground ? (
          <VisualAnimatedBackground 
            hasVideo={false}
            hasBackgroundImage={!!effectiveSong?.backgroundImage || !!effectiveSong?.coverImage}
            backgroundImage={effectiveSong?.backgroundImage || effectiveSong?.coverImage}
            songEnergy={songEnergy}
            isPlaying={isPlaying}
          />
        ) : /* Music-reactive animated background */
        (
          <MusicReactiveBackground 
            volume={volume} 
            isPlaying={isPlaying} 
            bpm={effectiveSong?.bpm}
            intensity={1}
          />
        )}

        {/* Webcam Background - SEPARATE camera for filming singers */}
        <WebcamBackground 
          config={webcamConfig} 
          onConfigChange={updateWebcamConfig}
        />

        {/* Countdown */}
        <GameCountdown countdown={countdown} />
        
        {/* Ad Indicator - Small non-blocking indicator when YouTube ad is playing */}
        {isAdPlaying && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
            <div className="bg-black/80 backdrop-blur-sm px-6 py-3 rounded-full border border-yellow-500/50 flex items-center gap-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-yellow-400 font-medium">Werbung läuft</span>
              <span className="text-white/60">-</span>
              <span className="text-white/80">Spiel pausiert</span>
              {adCountdown > 0 && (
                <>
                  <span className="text-white/60">-</span>
                  <span className="text-cyan-400 font-bold">{adCountdown}s</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Dark Overlay for better note visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 z-5" />

        {/* Duet Mode Split-Screen Note Highway */}
        {isDuetMode ? (
          <DuetNoteHighway
            p1VisibleNotes={p1VisibleNotes}
            p2VisibleNotes={p2VisibleNotes}
            p1PitchStats={p1PitchStats}
            p2PitchStats={p2PitchStats}
            currentTime={gameState.currentTime}
            p1DetectedPitch={pitchResult?.note ?? null}
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
            p1PlayerName={song?.duetPlayerNames?.[0] || 'Player 1'}
            p2PlayerName={song?.duetPlayerNames?.[1] || 'Player 2'}
            noteDisplayStyle={noteDisplayStyle as 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'}
          />
        ) : (
          /* ===== SINGLE PLAYER NOTE HIGHWAY ===== */
          <NoteHighway
            visibleNotes={visibleNotes}
            currentTime={gameState.currentTime}
            pitchStats={pitchStats}
            detectedPitch={pitchResult?.note ?? null}
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

        {/* Lyrics Display - Using SinglePlayerLyrics component for single player mode */}
        {!isDuetMode && timingData && (
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

        {/* Volume Meter */}
        <div className="absolute top-16 right-4 z-20">
          <div className="w-3 h-24 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="w-full bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
              style={{ height: `${volume * 100}%`, marginTop: `${(1 - volume) * 100}%` }}
            />
          </div>
        </div>

        {/* Audio Effects Button */}
        <button
          onClick={toggleAudioEffects}
          className="fixed bottom-24 right-4 z-30 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          title="Audio Effects"
        >
          🎛️
        </button>

        {/* Audio Effects Panel */}
        {showAudioEffects && (
          <div className="fixed bottom-40 right-4 z-30 w-72 bg-gray-800/95 rounded-xl p-4 border border-white/20">
            <h4 className="font-semibold mb-3">Audio Effects</h4>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-white/60">Reverb: {Math.round(reverbAmount * 100)}%</span>
                <input type="range" min="0" max="100" value={reverbAmount * 100}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) / 100;
                    setReverbAmount(val);
                    audioEffects?.setReverb(val);
                  }}
                  className="w-full accent-purple-500" />
              </div>
              <div>
                <span className="text-xs text-white/60">Echo: {Math.round(echoAmount * 100)}%</span>
                <input type="range" min="0" max="100" value={echoAmount * 100}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) / 100;
                    setEchoAmount(val);
                    audioEffects?.setDelay(val * 0.5, val * 0.5);
                  }}
                  className="w-full accent-cyan-500" />
              </div>
            </div>
          </div>
        )}
        
        {/* Progress Bar - Full Width Bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-white/10">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
            style={{ width: `${(gameState.currentTime / (effectiveSong?.duration || 1)) * 100}%` }}
          />
        </div>
        
        {/* Time Display */}
        <div className="absolute bottom-2 right-4 z-20 text-white/60 text-sm font-mono">
          {Math.floor(gameState.currentTime / 60000)}:{String(Math.floor((gameState.currentTime % 60000) / 1000)).padStart(2, '0')} / {Math.floor((effectiveSong?.duration || 0) / 60000)}:{String(Math.floor(((effectiveSong?.duration || 0) % 60000) / 1000)).padStart(2, '0')}
        </div>
      </div>

      <PracticePanel
        practiceMode={practiceMode}
        showControls={showPracticeControls}
        onToggleControls={() => setShowPracticeControls(!showPracticeControls)}
        onPracticeModeChange={(config) => setPracticeMode(p => ({ ...p, ...config }))}
      />

      <ScoreEventsDisplay events={scoreEvents} maxVisible={5} />
      
      {/* Particle System for visual effects */}
      <ParticleSystem particles={particles} />
      
      {/* Spectrogram Display - Audio visualization */}
      {showPitchGuide && isPlaying && (
        <SpectrogramDisplay
          audioElement={audioRef.current}
          isActive={isPlaying && !!audioRef.current}
          mode="bars"
          position={{ x: 50, y: 92 }}
          size={{ width: 200, height: 40 }}
          colorScheme="neon"
          numBars={24}
        />
      )}
      
      {/* Combo Fire Effect */}
      {gameState.players[0]?.combo && gameState.players[0].combo >= 5 && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <ComboFireEffect combo={gameState.players[0].combo} isLarge={gameState.players[0].combo >= 20} />
        </div>
      )}
      
      {/* Prominent Score Display - Only for Single Player Mode */}
      {!isDuetMode && <ProminentScoreDisplay player={gameState.players[0]} />}
    </div>
  );
}


export { GameScreen, LyricLineDisplay };
