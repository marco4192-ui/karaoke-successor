'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  getActivePlayers,
  getPlayersByScore,
  startRound,
  endRoundAndEliminate,
  advanceToNextRound,
  getBattleRoyaleStats,
  updatePlayerScore,
  BattleRoyaleGame,
  BattleRoyalePlayer,
  BattleRoyaleRound,
} from '@/lib/game/battle-royale';
import { Song, Note, Difficulty } from '@/types/game';
import { getSongMediaUrls } from '@/lib/db/media-db';
import { getSongMediaUrl, isTauri } from '@/lib/tauri-file-storage';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { evaluateTick, calculateTickPoints, calculateScoringMetadata } from '@/lib/game/scoring';

interface UseBattleRoyaleGameParams {
  game: BattleRoyaleGame;
  songs: Song[];
  onUpdateGame: (game: BattleRoyaleGame) => void;
}

interface UseBattleRoyaleGameReturn {
  showElimination: boolean;
  stats: ReturnType<typeof getBattleRoyaleStats>;
  sortedPlayers: BattleRoyalePlayer[];
  activePlayers: BattleRoyalePlayer[];
  currentRound: BattleRoyaleRound | undefined;
  difficulty: Difficulty;
  currentSong: Song | null;
  currentTime: number;
  roundTimeLeft: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  handleRoundEnd: () => void;
  handleStartRound: () => void;
  setCurrentTime: (time: number) => void;
}

export function useBattleRoyaleGame({ game, songs, onUpdateGame }: UseBattleRoyaleGameParams): UseBattleRoyaleGameReturn {
  const [showElimination, setShowElimination] = useState(false);
  const stats = getBattleRoyaleStats(game);

  const sortedPlayers = useMemo(() => getPlayersByScore(game), [game]);
  const activePlayers = useMemo(() => getActivePlayers(game), [game]);
  const currentRound = game.rounds[game.rounds.length - 1];
  
  // Get difficulty from game settings
  const difficulty = game.settings.difficulty || 'medium';
  
  // Pitch detection for all active microphone players (Champions League - all sing simultaneously)
  const { isInitialized: pitchInitialized, pitchResult, initialize: initPitch, start: startPitch, stop: stopPitch } = usePitchDetector();
  
  // Game state
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [roundTimeLeft, setRoundTimeLeft] = useState(currentRound?.duration || 0);

  // Refs for high-frequency values consumed inside the game loop (requestAnimationFrame)
  // Without refs the loop would capture stale closure snapshots of these values.
  const pitchResultRef = useRef(pitchResult);
  pitchResultRef.current = pitchResult;
  
  // Media playback refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastScoringTimeRef = useRef<number>(0);
  const noteProgressRef = useRef<Map<string, { ticksHit: number; ticksTotal: number }>>(new Map());
  const companionPollRef = useRef<NodeJS.Timeout | null>(null);
  const companionPitchCacheRef = useRef<Map<string, { note: number; accuracy: number; isSinging?: boolean }>>(new Map());
  // Track the resolved media URLs so the play logic can use them
  const resolvedAudioUrlRef = useRef<string | null>(null);
  const resolvedVideoUrlRef = useRef<string | null>(null);
  // Guard: prevent onEnded from firing before audio actually started playing
  const audioHasPlayedRef = useRef(false);
  // Track the elimination-animation timer so it can be cleared on unmount / re-trigger
  const roundEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Pre-compute timing data for scoring when song is loaded
  const timingData = useMemo(() => {
    if (!currentSong || currentSong.lyrics.length === 0) return null;
    
    // Create flat array of all notes
    const allNotes: Array<Note & { lineIndex: number }> = [];
    currentSong.lyrics.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        allNotes.push({ ...note, lineIndex });
      });
    });
    allNotes.sort((a, b) => a.startTime - b.startTime);
    
    // Calculate beat duration
    const beatDurationMs = currentSong.bpm ? 15000 / currentSong.bpm : 500;
    
    // Calculate scoring metadata
    const scoringMetadata = calculateScoringMetadata(allNotes, beatDurationMs);
    
    return { allNotes, beatDuration: beatDurationMs, scoringMetadata };
  }, [currentSong]);

  // Ref for timing data — placed after declaration so TS is happy
  const timingDataRef = useRef(timingData);
  timingDataRef.current = timingData;

  // Get current song from the round — load full song data with lyrics + URLs
  useEffect(() => {
    if (currentRound?.songId) {
      const song = songs.find(s => s.id === currentRound.songId);
      if (song) {
        // Ensure full song data: resolve URLs (Tauri) + load lyrics (IndexedDB/filesystem)
        import('@/lib/game/song-library').then(async ({ ensureSongUrls, loadSongLyrics }) => {
          let preparedSong = song;
          // Restore media URLs for Tauri filesystem access
          try {
            preparedSong = await ensureSongUrls(song);
          } catch (e) {
            console.warn('[BattleRoyale] Failed to ensure song URLs:', e);
          }
          // Load lyrics if missing (storedTxt or relativeTxtPath)
          if ((!preparedSong.lyrics || preparedSong.lyrics.length === 0) &&
              (preparedSong.storedTxt || preparedSong.relativeTxtPath)) {
            try {
              const lyrics = await loadSongLyrics(preparedSong);
              if (lyrics.length > 0) {
                preparedSong = { ...preparedSong, lyrics };
              }
            } catch (e) {
              console.warn('[BattleRoyale] Failed to load lyrics:', e);
            }
          }
          setCurrentSong(preparedSong);
        });
      }
    }
  }, [currentRound?.songId, songs, game.currentRound]);

  // Load media when song changes — handles both browser (IndexedDB) and Tauri (filesystem)
  useEffect(() => {
    const loadMedia = async () => {
      if (!currentSong) {
        setMediaLoaded(false);
        resolvedAudioUrlRef.current = null;
        resolvedVideoUrlRef.current = null;
        return;
      }
      
      let audioUrl: string | undefined = currentSong.audioUrl;
      let videoUrl: string | undefined = currentSong.videoBackground;
      
      // Browser: Load from IndexedDB if storedMedia flag is set
      if (currentSong.storedMedia) {
        try {
          const mediaUrls = await getSongMediaUrls(currentSong.id);
          if (mediaUrls.audioUrl) audioUrl = mediaUrls.audioUrl;
          if (mediaUrls.videoUrl) videoUrl = mediaUrls.videoUrl;
        } catch (e) {
          console.error('Failed to load media from IndexedDB:', e);
        }
      }
      
      // Tauri: Resolve filesystem paths if audioUrl/videoUrl is still missing
      if (!audioUrl && currentSong.relativeAudioPath && isTauri()) {
        try {
          const url = await getSongMediaUrl(currentSong.relativeAudioPath, currentSong.baseFolder);
          if (url) audioUrl = url;
        } catch (e) {
          console.error('Failed to resolve audio from filesystem:', e);
        }
      }
      if (!videoUrl && currentSong.relativeVideoPath && isTauri()) {
        try {
          const url = await getSongMediaUrl(currentSong.relativeVideoPath, currentSong.baseFolder);
          if (url) videoUrl = url;
        } catch (e) {
          console.error('Failed to resolve video from filesystem:', e);
        }
      }
      
      // Store resolved URLs for the play check
      resolvedAudioUrlRef.current = audioUrl || null;
      resolvedVideoUrlRef.current = videoUrl || null;
      
      // Set up audio element (always exists now — not conditional)
      if (audioRef.current && audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      }
      
      // Set up video element (always exists now — not conditional)
      if (videoRef.current && videoUrl) {
        videoRef.current.src = videoUrl;
        videoRef.current.load();
      }
      
      setMediaLoaded(true);
    };
    
    loadMedia();
  }, [currentSong, game.currentRound]);

  // Reset audio-has-played guard when song changes
  useEffect(() => {
    audioHasPlayedRef.current = false;
    // Reset media loaded so the game re-initializes for each new round
    setMediaLoaded(false);
    resolvedAudioUrlRef.current = null;
    resolvedVideoUrlRef.current = null;
  }, [currentSong?.id, game.currentRound]);

  // Initialize pitch detection and start game loop when playing
  useEffect(() => {
    if (game.status === 'playing' && mediaLoaded && currentSong) {
      // Cancellation flag — prevents the async body from continuing after cleanup
      let cancelled = false;

      // Initialize pitch detection
      const initGame = async () => {
        if (!pitchInitialized) {
          await initPitch();
        }
        // Guard: if the effect was cleaned up while awaiting initPitch(),
        // do NOT start pitch detection, playback, or the game loop.
        if (cancelled) return;

        startPitch();
        
        // Start audio/video playback — use resolved URLs, not the original song fields
        if (audioRef.current && resolvedAudioUrlRef.current) {
          audioRef.current.play()
            .then(() => { audioHasPlayedRef.current = true; })
            .catch(e => console.error('Audio play error:', e));
        } else {
          console.warn('[BattleRoyale] No audio URL resolved — starting without audio');
        }
        if (videoRef.current && resolvedVideoUrlRef.current) {
          videoRef.current.play().catch(e => console.error('Video play error:', e));
        }
        
        // Start game loop for simultaneous scoring
        startGameLoop();
      };
      
      initGame();
      
      return () => {
        cancelled = true;
        stopPitch();
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
        }
        if (companionPollRef.current) {
          clearInterval(companionPollRef.current);
          companionPollRef.current = null;
        }
      };
    }
  }, [game.status, mediaLoaded, currentSong, pitchInitialized, game.currentRound, initPitch, startPitch, stopPitch]);

  // Companion pitch data polling — fetch pitch results from companion phones
  // Companion apps detect pitch on-device and submit via /api/mobile?action=pitch
  // We poll their results here and score them like local mic players
  useEffect(() => {
    if (game.status !== 'playing') {
      if (companionPollRef.current) {
        clearInterval(companionPollRef.current);
        companionPollRef.current = null;
      }
      return;
    }

    const companionPlayers = game.players.filter(p => p.playerType === 'companion' && !p.eliminated);
    if (companionPlayers.length === 0) return;

    const pollCompanionPitch = async () => {
      try {
        const res = await fetch('/api/mobile?action=getpitch');
        if (!res.ok) return;
        const data = await res.json();

        // data is expected to be an array of { clientId, note, accuracy } objects
        const pitchEntries = Array.isArray(data) ? data : [];
        
        // Update the cache
        companionPitchCacheRef.current.clear();
        for (const entry of pitchEntries) {
          if (entry.clientId && entry.note !== undefined) {
            companionPitchCacheRef.current.set(entry.clientId, {
              note: entry.note,
              accuracy: entry.accuracy || 0,
              isSinging: entry.isSinging,
            });
          }
        }
      } catch {
        // Silently ignore polling errors (companion API may not be available)
      }
    };

    // Poll every 200ms
    pollCompanionPitch();
    companionPollRef.current = setInterval(pollCompanionPitch, 200);

    return () => {
      if (companionPollRef.current) {
        clearInterval(companionPollRef.current);
        companionPollRef.current = null;
      }
    };
  }, [game.status, game.players]);
  
  // Game loop for simultaneous scoring (Champions League - all players scored at once)
  const startGameLoop = () => {
    const TICK_INTERVAL = 100; // 100ms between scoring evaluations
    let lastTickTime = performance.now();
    
    const gameLoop = (timestamp: number) => {
      if (gameRef.current.status !== 'playing') return;
      
      const deltaTime = timestamp - lastTickTime;
      
      // Update current time from audio
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime * 1000);
      }
      
      // Evaluate scoring for all active players simultaneously
      const td = timingDataRef.current;
      if (deltaTime >= TICK_INTERVAL && td && currentSong) {
        lastTickTime = timestamp;

        // Get the detected pitch from local microphone (via ref — avoids stale closure)
        const currentPitchResult = pitchResultRef.current;
        const detectedPitch = currentPitchResult?.note; // MIDI note number
        const isSinging = currentPitchResult?.isSinging;

        // Find active notes at current time
        const currentAudioTime = audioRef.current ? audioRef.current.currentTime * 1000 : currentTime; // audioRef is a ref so always fresh

        // Accumulate all score updates into a single batch to avoid losing
        // intermediate results when multiple players score in the same tick.
        let batchedGame = gameRef.current;

        td.allNotes.forEach(note => {
          // Check if note is currently active (within its time window)
          if (currentAudioTime >= note.startTime && currentAudioTime <= note.startTime + note.duration) {
            // Score all active MICROPHONE players (local mic, shared pitch)
            // Skip scoring if vocal detection classifies input as humming/noise
            const micPlayers = activePlayersRef.current.filter(p => p.playerType === 'microphone' && !p.eliminated);

            micPlayers.forEach(player => {
              if (isSinging === false) return; // Humming/noise detected
              const tickResult = evaluateTick(detectedPitch || 0, note.pitch, difficulty);

              if (tickResult.isHit) {
                const points = calculateTickPoints(
                  tickResult.accuracy,
                  note.isGolden,
                  td.scoringMetadata.pointsPerTick,
                  difficulty
                );
                
                batchedGame = updatePlayerScore(
                  batchedGame,
                  player.id,
                  points,
                  tickResult.accuracy,
                  1, 0, 1
                );
              }
            });

            // Score all active COMPANION players (pitch from their phones)
            const companionPlayers = activePlayersRef.current.filter(p => p.playerType === 'companion' && !p.eliminated);
            
            companionPlayers.forEach(player => {
              // Look up companion's submitted pitch from cache
              const cachedPitch = player.connectionCode
                ? companionPitchCacheRef.current.get(player.connectionCode)
                : null;
              
              if (cachedPitch && cachedPitch.note > 0 && cachedPitch.isSinging !== false) {
                const tickResult = evaluateTick(cachedPitch.note, note.pitch, difficulty);
                
                if (tickResult.isHit) {
                  const points = calculateTickPoints(
                    tickResult.accuracy,
                    note.isGolden,
                    td.scoringMetadata.pointsPerTick,
                    difficulty
                  );
                  
                  batchedGame = updatePlayerScore(
                    batchedGame,
                    player.id,
                    points,
                    tickResult.accuracy,
                    1, 0, 1
                  );
                }
              }
            });
          }
        });

        // Single state update per tick — avoids lost intermediate scores
        if (batchedGame !== gameRef.current) {
          onUpdateGame(batchedGame);
        }
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  // Get random song for the round — only pick songs that have audio
  const getRandomSong = useCallback((): Song | null => {
    const playableSongs = songs.filter(s =>
      s.audioUrl || s.relativeAudioPath || s.storedMedia
    );
    if (playableSongs.length === 0) return null;
    return playableSongs[Math.floor(Math.random() * playableSongs.length)];
  }, [songs]);
  
  // Update time when round changes - AUTO ELIMINATION when time runs out
  // Uses a ref for handleRoundEnd so the interval always calls the latest version
  const handleRoundEndRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (game.status === 'playing' && currentRound) {
      queueMicrotask(() => setRoundTimeLeft(currentRound.duration));
      
      const interval = setInterval(() => {
        setRoundTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            // AUTO ELIMINATION - trigger when time runs out.
            // Use ref to always call the latest handleRoundEnd version
            // (avoids stale closure when handleRoundEnd's deps change).
            handleRoundEndRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [game.status, currentRound?.duration, game.currentRound]);

  // Handle round end - eliminates lowest scoring player
  // Uses refs for game/activePlayers to avoid stale closures in the
  // auto-elimination interval timer.
  const activePlayersRef = useRef(activePlayers);
  activePlayersRef.current = activePlayers;
  const gameRef = useRef(game);
  gameRef.current = game;

  const handleRoundEnd = useCallback(() => {
    // Stop media
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    
    // Reset audio-has-played guard
    audioHasPlayedRef.current = false;
    
    // Stop pitch detection
    stopPitch();
    
    if (activePlayers.length <= 1) return;

    const updatedGame = endRoundAndEliminate(game);
    onUpdateGame(updatedGame);
    setShowElimination(true);

    // Clear any previous elimination timer (e.g. if handleRoundEnd is called twice)
    if (roundEndTimerRef.current !== null) {
      clearTimeout(roundEndTimerRef.current);
    }
    roundEndTimerRef.current = setTimeout(() => {
      roundEndTimerRef.current = null;
      setShowElimination(false);
      
      if (updatedGame.winner) {
        return;
      }
      
      const nextGame = advanceToNextRound(updatedGame);
      onUpdateGame(nextGame);
    }, 4000); // 4 seconds to show elimination animation
  }, [activePlayers.length, game, onUpdateGame, stopPitch]);

  // Keep the auto-elimination timer's ref to handleRoundEnd up-to-date
  // so it always calls the latest version when the timer fires.
  useEffect(() => {
    handleRoundEndRef.current = handleRoundEnd;
  }, [handleRoundEnd]);

  // Clean up the elimination timer on unmount to prevent state updates
  // on an unmounted component.
  useEffect(() => {
    return () => {
      if (roundEndTimerRef.current !== null) {
        clearTimeout(roundEndTimerRef.current);
        roundEndTimerRef.current = null;
      }
    };
  }, []);

  // Start next round
  const handleStartRound = () => {
    const song = getRandomSong();
    if (!song) {
      console.error('[BattleRoyale] No playable songs found in library. Cannot start round.');
      return;
    }

    const updatedGame = startRound(game, song.id, song.title);
    onUpdateGame(updatedGame);
  };

  return {
    showElimination,
    stats,
    sortedPlayers,
    activePlayers,
    currentRound,
    difficulty,
    currentSong,
    currentTime,
    roundTimeLeft,
    audioRef,
    videoRef,
    handleRoundEnd,
    handleStartRound,
    setCurrentTime,
  };
}
