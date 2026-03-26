'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { OnlineLobby, OnlineRoom, OnlinePlayer } from '@/components/multiplayer/online-lobby';
import { YouTubePlayer } from '@/components/game/youtube-player';
import { Song, midiToNoteName } from '@/types/game';
import { Socket } from 'socket.io-client';
import { MicIcon } from '@/components/icons';

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
  
  if (showGame && onlineRoom && selectedSong) {
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
  const { gameState, setSong, setCurrentTime, setDetectedPitch, updatePlayer, endGame, setResults } = useGameStore();
  const { isInitialized, isListening, pitchResult, initialize, start, stop } = usePitchDetector();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [scoreEvents, setScoreEvents] = useState<Array<{ type: string; displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss'; points: number; time: number }>>([]);
  const [volume, setVolume] = useState(0);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  
  // Opponent state for real-time sync
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentCombo, setOpponentCombo] = useState(0);
  const [opponentAccuracy, setOpponentAccuracy] = useState(0);
  const [opponentName, setOpponentName] = useState('');
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState<GameEndedPlayerResult | null>(null);
  
  // Get opponent info
  const myId = socket?.id;
  const opponent = room.players?.find((p: OnlinePlayer) => p.id !== myId);
  
  useEffect(() => {
    if (opponent) {
      setOpponentName(opponent.name);
    }
  }, [opponent]);
  
  // Local player state
  const [localScore, setLocalScore] = useState(0);
  const [localCombo, setLocalCombo] = useState(0);
  const [localAccuracy, setLocalAccuracy] = useState(0);
  
  const noteProgressRef = useRef<Map<string, NoteProgress>>(new Map());
  const gameLoopRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Initialize game
  useEffect(() => {
    setSong(song);
    initialize();
    
    return () => {
      stop();
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [song, setSong, initialize, stop]);
  
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
      
      // Stop the game
      setIsPlaying(false);
      stop();
      
      // Set results
      const myResult = data.players.find((p: GameEndedPlayerResult) => p.id === myId);
      const opponentResult = data.players.find((p: GameEndedPlayerResult) => p.id !== myId);
      
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
  
  // Start game with countdown
  const startGame = useCallback(async () => {
    await start();
    
    // Countdown
    let count = 3;
    setCountdown(count);
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownInterval);
        setIsPlaying(true);
        startTimeRef.current = Date.now();
      }
    }, 1000);
  }, [start]);
  
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
  
  // End game and send final score
  const endGameHandler = useCallback((score: number, combo: number, accuracy: number) => {
    if (!socket) return;
    
    socket.emit('finish-song', {
      score,
      combo,
      accuracy
    });
  }, [socket]);
  
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-cyan-500/20 text-cyan-400 text-lg px-3 py-1">🌐 ONLINE</Badge>
          <span className="text-white/60 text-sm">Room: {room.code}</span>
        </div>
        <Button onClick={onEnd} variant="outline" size="sm" className="border-white/20">
          Leave Game
        </Button>
      </div>
      
      {/* Song Info */}
      <Card className="bg-white/5 border-white/10 mb-4">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-lg">{song.title}</div>
              <div className="text-white/60">{song.artist}</div>
            </div>
            <Badge className="bg-purple-500/20 text-purple-400">
              ⚔️ Duel Mode
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Split Screen Score Display */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* My Score */}
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30">
          <CardContent className="py-4">
            <div className="text-center">
              <div className="text-sm text-white/60 mb-1">YOU</div>
              <div className="text-4xl font-bold text-cyan-400">{Math.round(localScore).toLocaleString()}</div>
              <div className="flex items-center justify-center gap-4 mt-2 text-sm">
                <div>
                  <span className="text-white/60">Combo: </span>
                  <span className="text-yellow-400 font-medium">{localCombo}x</span>
                </div>
                <div>
                  <span className="text-white/60">Accuracy: </span>
                  <span className="text-green-400 font-medium">{localAccuracy.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Opponent Score */}
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="py-4">
            <div className="text-center">
              <div className="text-sm text-white/60 mb-1">{opponentName || 'OPPONENT'}</div>
              <div className="text-4xl font-bold text-purple-400">{Math.round(opponentScore).toLocaleString()}</div>
              <div className="flex items-center justify-center gap-4 mt-2 text-sm">
                <div>
                  <span className="text-white/60">Combo: </span>
                  <span className="text-yellow-400 font-medium">{opponentCombo}x</span>
                </div>
                <div>
                  <span className="text-white/60">Accuracy: </span>
                  <span className="text-green-400 font-medium">{opponentAccuracy.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Game Area */}
      <Card className="bg-white/5 border-white/10 mb-4">
        <CardContent className="py-6">
          {!isPlaying && !gameEnded ? (
            <div className="text-center py-8">
              {countdown > 0 ? (
                <div className="text-6xl font-bold text-cyan-400 animate-pulse">{countdown}</div>
              ) : (
                <>
                  <div className="text-4xl mb-4">🎤</div>
                  <h3 className="text-xl font-bold mb-2">Ready to Sing!</h3>
                  <p className="text-white/60 mb-4">Click the button when you're ready to start</p>
                  <Button 
                    onClick={startGame}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 px-8 py-3 text-lg"
                    disabled={!isInitialized}
                  >
                    <MicIcon className="w-5 h-5 mr-2" /> Start Singing
                  </Button>
                </>
              )}
            </div>
          ) : gameEnded ? (
            <div className="text-center py-8">
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
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎤</div>
              <h3 className="text-xl font-bold mb-2">Singing in Progress!</h3>
              <p className="text-white/60">
                Sing into your microphone. Your score is being synced in real-time!
              </p>
              <div className="mt-4">
                <div className="text-sm text-white/40">Detected Pitch</div>
                <div className="text-2xl font-mono text-cyan-400">
                  {pitchResult?.note ? midiToNoteName(pitchResult.note) : '--'}
                </div>
                <div className="text-sm text-white/40">
                  {pitchResult?.frequency ? `${Math.round(pitchResult.frequency)} Hz` : ''}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Media Player (if audio/video) */}
      {song.audioUrl && (
        <audio
          ref={audioRef}
          src={song.audioUrl}
          onLoadedData={() => setMediaLoaded(true)}
          onEnded={() => endGameHandler(localScore, localCombo, localAccuracy)}
          className="hidden"
        />
      )}
      
      {song.videoUrl && (
        <video
          ref={videoRef}
          src={song.videoUrl}
          onLoadedData={() => setMediaLoaded(true)}
          className="w-full rounded-lg"
          controls
        />
      )}
      
      {/* YouTube Player */}
      {song.youtubeId && (
        <div className="aspect-video bg-black/50 rounded-lg overflow-hidden">
          <YouTubePlayer
            videoId={song.youtubeId}
            isPlaying={isPlaying}
            onTimeUpdate={(time) => {
              setCurrentTime(time);
              // Game logic would go here
            }}
            onEnded={() => endGameHandler(localScore, localCombo, localAccuracy)}
          />
        </div>
      )}
    </div>
  );
}
