'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { useNoteScoring } from '@/hooks/use-note-scoring';
import { useVisibleNotes, TimingData } from '@/hooks/use-visible-notes';
import { OnlineLobby, OnlineRoom, OnlinePlayer } from '@/components/multiplayer/online-lobby';
import { YouTubePlayer } from '@/components/game/youtube-player';
import { NoteHighway } from '@/components/game/note-highway';
import { Song, LyricLine, Note, PLAYER_COLORS, midiToNoteName } from '@/types/game';
import { Socket } from 'socket.io-client';
import { MicIcon } from '@/components/icons';
import { calculatePitchStats, PitchStats, getNoteShapeClasses, NoteShapeStyle } from '@/lib/game/note-utils';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { ScoreEventsDisplay } from '@/components/game/score-events-display';
import { logger } from '@/lib/logger';

// Note progress tracking for scoring
interface NoteProgress {
  noteId: string;
  totalTicks: number;
  ticksHit: number;
  ticksEvaluated: number;
  isGolden: boolean;
  lastEvaluatedTime: number;
  isComplete: boolean;
  wasPerfect: boolean;
}

// Game-ended event data types
interface GameEndedPlayerResult {
  id: string;
  name: string;
  score: number;
  accuracy: number;
}

interface GameEndedData {
  winner: GameEndedPlayerResult;
  players: GameEndedPlayerResult[];
}

// Constants
const SING_LINE_POSITION = 25;
const NOTE_WINDOW = 4000;
const VISIBLE_TOP = 8;
const VISIBLE_BOTTOM = 85;
const VISIBLE_RANGE = VISIBLE_BOTTOM - VISIBLE_TOP;

// ===================== ONLINE MULTIPLAYER SCREEN =====================
export function OnlineMultiplayerScreen({ onBack }: { onBack: () => void }) {
  const { setSong, setGameMode } = useGameStore();
  const [showGame, setShowGame] = useState(false);
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoom | null>(null);
  const [socketRef, setSocketRef] = useState<Socket | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  
  const handleStartGame = useCallback((room: OnlineRoom, socket: Socket, song: Song) => {
    setOnlineRoom(room);
    setSocketRef(socket);
    setSelectedSong(song);
    setSong(song);
    setGameMode('duel');
    setShowGame(true);
  }, [setSong, setGameMode]);
  
  if (showGame && onlineRoom && selectedSong && socketRef) {
    return (
      <OnlineGameScreen 
        room={onlineRoom}
        socket={socketRef}
        song={selectedSong}
        onEnd={() => {
          setShowGame(false);
          setOnlineRoom(null);
          setSelectedSong(null);
          onBack();
        }}
      />
    );
  }
  
  return (
    <OnlineLobby 
      onStartGame={handleStartGame}
      onBack={onBack}
    />
  );
}

// Online game screen with real-time score synchronization
function OnlineGameScreen({ room, socket, song, onEnd }: { room: OnlineRoom; socket: Socket; song: Song; onEnd: () => void }) {
  const { gameState, setSong, setCurrentTime, setDetectedPitch, updatePlayer, endGame, setResults, addPlayer, createProfile } = useGameStore();
  const { isInitialized, isListening, pitchResult, initialize, start, stop, setDifficulty: setPitchDifficulty } = usePitchDetector();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  
  // Opponent state for real-time sync
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentCombo, setOpponentCombo] = useState(0);
  const [opponentAccuracy, setOpponentAccuracy] = useState(0);
  const [opponentName, setOpponentName] = useState('');
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState<GameEndedPlayerResult | null>(null);
  
  // Local player state
  const [localScore, setLocalScore] = useState(0);
  const [localCombo, setLocalCombo] = useState(0);
  const [localAccuracy, setLocalAccuracy] = useState(0);
  
  // Note display settings
  const [noteShapeStyle] = useState<NoteShapeStyle>('rounded');
  
  // Get opponent info
  const myId = socket.id || '';
  const opponent = room.players?.find((p: OnlinePlayer) => p.id !== myId);
  
  // Refs
  const noteProgressRef = useRef<Map<string, NoteProgress>>(new Map());
  const gameLoopRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isMountedRef = useRef(true);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // YouTube state
  const [youtubeTime, setYoutubeTime] = useState(0);
  const isYouTube = !!song.youtubeUrl || !!song.youtubeId;
  const youtubeVideoId = song.youtubeId || (song.youtubeUrl ? extractYouTubeId(song.youtubeUrl) : null);

  // Ensure player exists in store
  useEffect(() => {
    if (gameState.players.length === 0) {
      const defaultProfile = createProfile('You');
      addPlayer(defaultProfile);
    }
  }, [gameState.players.length, addPlayer, createProfile]);
  
  useEffect(() => {
    if (opponent) {
      setOpponentName(opponent.name);
    }
  }, [opponent]);

  // =====================================================
  // PRE-COMPUTE TIMING DATA
  // =====================================================
  const timingData = useMemo<TimingData | null>(() => {
    if (!song || song.lyrics.length === 0) return null;
    
    const allNotes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    const p1Notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    const p2Notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    
    song.lyrics.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        const noteWithLine = { ...note, lineIndex, line };
        allNotes.push(noteWithLine);
        p1Notes.push(noteWithLine);
      });
    });
    
    allNotes.sort((a, b) => a.startTime - b.startTime);
    p1Notes.sort((a, b) => a.startTime - b.startTime);
    p2Notes.sort((a, b) => a.startTime - b.startTime);
    
    const sortedLines = [...song.lyrics].sort((a, b) => a.startTime - b.startTime);
    const beatDurationMs = song.bpm ? 15000 / song.bpm : 500;
    
    return {
      allNotes,
      sortedLines,
      noteCount: allNotes.length,
      lineCount: sortedLines.length,
      p1Notes,
      p2Notes,
      p1Lines: sortedLines,
      p2Lines: sortedLines,
      p1NoteCount: p1Notes.length,
      p2NoteCount: p2Notes.length,
      beatDuration: beatDurationMs,
    };
  }, [song]);

  // Calculate pitch stats
  const pitchStats = useMemo<PitchStats>(() => {
    return calculatePitchStats(timingData?.allNotes || null);
  }, [timingData]);

  // Note scoring hook
  const {
    scoreEvents,
    notePerformance,
    checkNoteHits,
    resetScoring,
  } = useNoteScoring({
    song,
    difficulty: gameState.difficulty,
    players: gameState.players,
    timingData,
    isDuetMode: false,
    beatDuration: timingData?.beatDuration || 500,
    updatePlayer,
    onPerfectHit: () => {},
    onGoldenNote: () => {},
    onComboMilestone: () => {},
  });

  // Visible notes hook
  const { visibleNotes } = useVisibleNotes(gameState.currentTime, timingData, NOTE_WINDOW);

  // Initialize game
  useEffect(() => {
    setSong(song);
    isMountedRef.current = true;

    const initGame = async () => {
      const success = await initialize();
      if (!isMountedRef.current) return;

      if (success) {
        setPitchDifficulty(gameState.difficulty);
        start();
        resetScoring();
        setCountdown(3);

        let currentCount = 3;
        countdownIntervalRef.current = setInterval(() => {
          if (!isMountedRef.current) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            return;
          }

          currentCount -= 1;

          if (currentCount <= 0) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            setCountdown(0);
            setIsPlaying(true);
            startTimeRef.current = Date.now();
            
            // Start audio
            if (audioRef.current && song.audioUrl) {
              audioRef.current.currentTime = (song.start || 0) / 1000;
              audioRef.current.play().catch(() => {});
            }
          } else {
            setCountdown(currentCount);
          }
        }, 1000);
      }
    };

    initGame();

    return () => {
      isMountedRef.current = false;
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      stop();
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [song, initialize, start, stop, setSong, gameState.difficulty, setPitchDifficulty, resetScoring]);

  // Listen for opponent score updates
  useEffect(() => {
    if (!socket) return;
    
    socket.on('opponent-update', (data: { playerId: string; playerName: string; score: number; combo: number; accuracy: number }) => {
      setOpponentScore(data.score);
      setOpponentCombo(data.combo);
      setOpponentAccuracy(data.accuracy);
    });
    
    socket.on('game-ended', (data: GameEndedData) => {
      setGameEnded(true);
      setWinner(data.winner);
      setIsPlaying(false);
      stop();
      
      const myResult = data.players.find((p: GameEndedPlayerResult) => p.id === myId);
      
      if (myResult && song) {
        setResults({
          songId: song.id,
          players: [{
            playerId: myId,
            score: myResult.score,
            notesHit: 0,
            notesMissed: 0,
            accuracy: myResult.accuracy,
            maxCombo: 0,
            rating: 'okay',
          }],
          playedAt: Date.now(),
          duration: song.duration,
        });
      }
    });
    
    return () => {
      socket.off('opponent-update');
      socket.off('game-ended');
    };
  }, [socket, myId, stop, setResults]);

  // Send score update to server
  const sendScoreUpdate = useCallback((score: number, combo: number, accuracy: number) => {
    if (!socket || !isPlaying) return;
    
    socket.emit('score-update', {
      score,
      combo,
      accuracy,
      notesHit: 0,
      notesMissed: 0
    });
  }, [socket, isPlaying]);
  
  // End game handler
  const endGameHandler = useCallback((score: number, combo: number, accuracy: number) => {
    if (!socket) return;
    
    socket.emit('finish-song', {
      score,
      combo,
      accuracy
    });
  }, [socket]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || !song) return;

    const startPositionMs = song.start || 0;

    const gameLoop = () => {
      let elapsed: number;
      
      // Use YouTube time if available
      if (isYouTube && youtubeTime > 0) {
        elapsed = youtubeTime;
      }
      // Use audio element time
      else if (audioRef.current && !audioRef.current.paused && audioRef.current.readyState >= 2) {
        elapsed = audioRef.current.currentTime * 1000;
      }
      // Fallback to system time
      else {
        elapsed = (Date.now() - startTimeRef.current) + startPositionMs;
      }
      
      setCurrentTime(elapsed);
      
      // Update from pitch detection
      if (pitchResult) {
        setDetectedPitch(pitchResult.frequency);
        checkNoteHits(elapsed, pitchResult);
      }
      
      // Update local score from store
      const player = gameState.players[0];
      if (player) {
        const newScore = player.score;
        const newCombo = player.combo;
        const notesHit = player.notesHit;
        const totalNotes = timingData?.noteCount || 1;
        const newAccuracy = totalNotes > 0 ? (notesHit / totalNotes) * 100 : 0;
        
        if (newScore !== localScore || newCombo !== localCombo) {
          setLocalScore(newScore);
          setLocalCombo(newCombo);
          setLocalAccuracy(newAccuracy);
          sendScoreUpdate(newScore, newCombo, newAccuracy);
        }
      }
      
      // Check if song ended
      if (elapsed >= song.duration) {
        endGameHandler(localScore, localCombo, localAccuracy);
        return;
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isPlaying, song, pitchResult, setCurrentTime, setDetectedPitch, checkNoteHits, isYouTube, youtubeTime, gameState.players, localScore, localCombo, localAccuracy, sendScoreUpdate, endGameHandler, timingData]);

  // Extract YouTube ID helper
  function extractYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
    return match ? match[1] : null;
  }

  // Get note shape classes
  const noteShape = useMemo(() => getNoteShapeClasses(noteShapeStyle), [noteShapeStyle]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-cyan-500/20 text-cyan-400 text-lg px-3 py-1">🌐 ONLINE DUEL</Badge>
            <span className="text-white/60 text-sm">Room: {room.code}</span>
          </div>
          <Button onClick={() => { stop(); onEnd(); }} variant="outline" size="sm" className="border-white/20">
            Leave Game
          </Button>
        </div>
      </div>

      {/* Split Screen Score Display */}
      <div className="absolute top-16 left-0 right-0 z-20 px-4">
        <div className="grid grid-cols-2 gap-4">
          {/* My Score */}
          <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30 backdrop-blur-sm">
            <CardContent className="py-3">
              <div className="text-center">
                <div className="text-xs text-white/60 mb-1">YOU</div>
                <div className="text-3xl font-bold text-cyan-400">{Math.round(localScore).toLocaleString()}</div>
                <div className="flex items-center justify-center gap-3 mt-1 text-xs">
                  <div>
                    <span className="text-white/60">Combo: </span>
                    <span className="text-yellow-400 font-medium">{localCombo}x</span>
                  </div>
                  <div>
                    <span className="text-white/60">Acc: </span>
                    <span className="text-green-400 font-medium">{localAccuracy.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Opponent Score */}
          <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 backdrop-blur-sm">
            <CardContent className="py-3">
              <div className="text-center">
                <div className="text-xs text-white/60 mb-1">{opponentName || 'OPPONENT'}</div>
                <div className="text-3xl font-bold text-purple-400">{Math.round(opponentScore).toLocaleString()}</div>
                <div className="flex items-center justify-center gap-3 mt-1 text-xs">
                  <div>
                    <span className="text-white/60">Combo: </span>
                    <span className="text-yellow-400 font-medium">{opponentCombo}x</span>
                  </div>
                  <div>
                    <span className="text-white/60">Acc: </span>
                    <span className="text-green-400 font-medium">{opponentAccuracy.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Game Area with Note Highway */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 z-5" />

        {/* Countdown */}
        {countdown > 0 && (
          <div key={countdown} className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
            <div className="text-9xl font-black text-white drop-shadow-2xl">
              {countdown}
            </div>
          </div>
        )}

        {/* Game Ended Overlay */}
        {gameEnded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
            <div className="text-center">
              <div className="text-6xl mb-4">{winner?.id === myId ? '🏆' : '😢'}</div>
              <h3 className="text-2xl font-bold mb-2">
                {winner?.id === myId ? 'You Win!' : `${winner?.name || 'Opponent'} Wins!`}
              </h3>
              <p className="text-white/60 mb-4">
                Final Score: You {Math.round(localScore).toLocaleString()} - {Math.round(opponentScore).toLocaleString()} {opponentName}
              </p>
              <Button 
                onClick={onEnd}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 px-8"
              >
                Back to Lobby
              </Button>
            </div>
          </div>
        )}

        {/* Note Highway - Show during gameplay */}
        {isPlaying && !gameEnded && timingData && (
          <NoteHighway
            visibleNotes={visibleNotes}
            currentTime={gameState.currentTime}
            pitchStats={pitchStats}
            detectedPitch={pitchResult?.note ?? null}
            noteShapeStyle={noteShapeStyle}
            singLinePosition={SING_LINE_POSITION}
            noteWindow={NOTE_WINDOW}
            playerColor={PLAYER_COLORS[0]}
            showPlayerLabel={false}
            visibleTop={VISIBLE_TOP}
            visibleRange={VISIBLE_RANGE}
          />
        )}

        {/* Lyrics Display - Current line */}
        {isPlaying && !gameEnded && timingData && (
          <div className="absolute bottom-24 left-0 right-0 z-20 px-4">
            <div className="max-w-4xl mx-auto">
              {timingData.sortedLines.map((line, idx) => {
                const isCurrentLine = gameState.currentTime >= line.startTime && gameState.currentTime <= line.endTime;
                const isPastLine = gameState.currentTime > line.endTime;
                
                if (!isCurrentLine && !isPastLine) return null;
                
                return (
                  <div 
                    key={line.id || idx}
                    className={`text-center p-3 rounded-lg backdrop-blur-sm transition-all duration-200 ${
                      isCurrentLine 
                        ? 'bg-white/10 scale-100' 
                        : 'bg-transparent scale-95 opacity-50'
                    }`}
                  >
                    <p className={`text-2xl font-medium ${isCurrentLine ? 'text-white' : 'text-white/60'}`}>
                      {line.text}
                    </p>
                  </div>
                );
              }).slice(-2)}
            </div>
          </div>
        )}

        {/* Waiting for start */}
        {!isPlaying && !gameEnded && countdown === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="text-center">
              <div className="text-6xl mb-4">🎤</div>
              <h3 className="text-xl font-bold mb-2">Ready to Sing!</h3>
              <p className="text-white/60 mb-4">Initializing microphone...</p>
            </div>
          </div>
        )}

        {/* Pitch indicator during gameplay */}
        {isPlaying && !gameEnded && pitchResult && (
          <div className="absolute bottom-4 left-4 z-20 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
            <div className="text-xs text-white/60">Detected Pitch</div>
            <div className="text-lg font-mono text-cyan-400">
              {pitchResult?.note ? midiToNoteName(pitchResult.note) : '--'}
            </div>
            <div className="text-xs text-white/40">
              {pitchResult?.frequency ? `${Math.round(pitchResult.frequency)} Hz` : ''}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-white/10">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
            style={{ width: `${(gameState.currentTime / song.duration) * 100}%` }}
          />
        </div>
        
        {/* Time Display */}
        <div className="absolute bottom-2 right-4 z-20 text-white/60 text-sm font-mono">
          {Math.floor(gameState.currentTime / 60000)}:{String(Math.floor((gameState.currentTime % 60000) / 1000)).padStart(2, '0')} / {Math.floor(song.duration / 60000)}:{String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}
        </div>
      </div>

      {/* Score Events Display */}
      <ScoreEventsDisplay events={scoreEvents} maxVisible={5} />

      {/* Media Elements */}
      {song.audioUrl && (
        <audio
          ref={audioRef}
          src={song.audioUrl}
          onLoadedData={() => setMediaLoaded(true)}
          onEnded={() => endGameHandler(localScore, localCombo, localAccuracy)}
          className="hidden"
        />
      )}
      
      {/* YouTube Player */}
      {youtubeVideoId && (
        <div className="hidden">
          <YouTubePlayer
            videoId={youtubeVideoId}
            isPlaying={isPlaying}
            onTimeUpdate={(time) => {
              setYoutubeTime(time * 1000);
            }}
            onEnded={() => endGameHandler(localScore, localCombo, localAccuracy)}
          />
        </div>
      )}
    </div>
  );
}
