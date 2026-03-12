'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  createTournament, 
  getMatchesForRound, 
  getPlayableMatches, 
  recordMatchResult, 
  getTournamentStats,
  TournamentBracket,
  TournamentPlayer,
  TournamentMatch,
  TournamentSettings,
} from '@/lib/game/tournament';
import { Song, PlayerProfile, PLAYER_COLORS } from '@/types/game';
import { getAllSongs } from '@/lib/game/song-library';

interface TournamentScreenProps {
  profiles: PlayerProfile[];
  songs: Song[];
  onStartTournament: (bracket: TournamentBracket, songDuration: number) => void;
  onBack: () => void;
}

export function TournamentSetupScreen({ profiles, songs, onStartTournament, onBack }: TournamentScreenProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [maxPlayers, setMaxPlayers] = useState<4 | 8 | 16 | 32>(8);
  const [shortMode, setShortMode] = useState(true);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [error, setError] = useState<string | null>(null);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= maxPlayers) {
        setError(`Maximum ${maxPlayers} players allowed`);
        return prev;
      }
      setError(null);
      return [...prev, playerId];
    });
  };

  const handleStartTournament = () => {
    if (selectedPlayers.length < 4) {
      setError('Minimum 4 players required');
      return;
    }
    
    const players: TournamentPlayer[] = selectedPlayers.map((id, index) => {
      const profile = profiles.find(p => p.id === id);
      return {
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        eliminated: false,
        seed: index + 1,
      };
    });

    const settings: TournamentSettings = {
      maxPlayers,
      songDuration: shortMode ? 60 : 180, // 60s for short mode, 3 min for full
      randomSongs: true,
      difficulty,
    };

    try {
      const bracket = createTournament(players, settings);
      onStartTournament(bracket, settings.songDuration);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">
          ← Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">🏆 Tournament Mode</h1>
          <p className="text-white/60">Single Elimination Bracket - Sudden Death!</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Tournament Settings */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle>Tournament Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Max Players */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Bracket Size</label>
            <div className="flex gap-2">
              {[4, 8, 16, 32].map(size => (
                <Button
                  key={size}
                  variant={maxPlayers === size ? 'default' : 'outline'}
                  onClick={() => {
                    setMaxPlayers(size as 4 | 8 | 16 | 32);
                    if (selectedPlayers.length > size) {
                      setSelectedPlayers(prev => prev.slice(0, size));
                    }
                  }}
                  className={maxPlayers === size ? 'bg-amber-500 hover:bg-amber-600' : 'border-white/20'}
                >
                  {size} Players
                </Button>
              ))}
            </div>
          </div>

          {/* Short Mode */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">Short Mode</label>
              <p className="text-sm text-white/60">Each match lasts only 60 seconds</p>
            </div>
            <Button
              variant={shortMode ? 'default' : 'outline'}
              onClick={() => setShortMode(!shortMode)}
              className={shortMode ? 'bg-green-500 hover:bg-green-600' : 'border-white/20'}
            >
              {shortMode ? '✓ 60 Seconds' : 'Full Song'}
            </Button>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map(diff => (
                <Button
                  key={diff}
                  variant={difficulty === diff ? 'default' : 'outline'}
                  onClick={() => setDifficulty(diff as 'easy' | 'medium' | 'hard')}
                  className={difficulty === diff ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
                >
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Selection */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle>Select Players ({selectedPlayers.length}/{maxPlayers})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {profiles.map(profile => {
              const isSelected = selectedPlayers.includes(profile.id);
              return (
                <div
                  key={profile.id}
                  onClick={() => togglePlayer(profile.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-gradient-to-br from-amber-500/30 to-yellow-500/30 border-2 border-amber-500' 
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: profile.color }}
                      >
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium truncate">{profile.name}</span>
                    {isSelected && <span className="ml-auto text-amber-400">✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
          
          {profiles.length < 4 && (
            <p className="text-yellow-400 mt-4">
              ⚠️ Need at least 4 profiles. Create more in Character selection.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button
        onClick={handleStartTournament}
        disabled={selectedPlayers.length < 4}
        className="w-full py-6 text-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400"
      >
        🏆 Start Tournament ({selectedPlayers.length} Players)
      </Button>
    </div>
  );
}

// Tournament Bracket View Component
interface TournamentBracketViewProps {
  bracket: TournamentBracket;
  currentMatch: TournamentMatch | null;
  onPlayMatch: (match: TournamentMatch) => void;
  songs: Song[];
  shortMode: boolean;
}

export function TournamentBracketView({ bracket, currentMatch, onPlayMatch, songs, shortMode }: TournamentBracketViewProps) {
  const stats = getTournamentStats(bracket);
  
  // Get all matches organized by round
  const rounds = useMemo(() => {
    const roundMatches: TournamentMatch[][] = [];
    for (let r = 1; r <= bracket.totalRounds; r++) {
      roundMatches.push(getMatchesForRound(bracket, r));
    }
    return roundMatches;
  }, [bracket]);

  const getRandomSong = () => {
    if (songs.length === 0) return null;
    return songs[Math.floor(Math.random() * songs.length)];
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Tournament Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">🏆 Tournament Bracket</h1>
        <div className="flex items-center justify-center gap-4 text-white/60">
          <span>Round {stats.currentRound} of {stats.totalRounds}</span>
          <span>•</span>
          <span>{stats.remainingPlayers} players remaining</span>
          {shortMode && <Badge className="bg-green-500/20 text-green-400">Short Mode (60s)</Badge>}
        </div>
      </div>

      {/* Champion Display */}
      {bracket.champion && (
        <div className="bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-2 border-amber-500 rounded-xl p-8 mb-8 text-center">
          <div className="text-6xl mb-4">👑</div>
          <h2 className="text-2xl font-bold text-amber-400 mb-2">CHAMPION!</h2>
          <div className="flex items-center justify-center gap-3">
            {bracket.champion.avatar ? (
              <img src={bracket.champion.avatar} alt={bracket.champion.name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: bracket.champion.color }}
              >
                {bracket.champion.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-3xl font-bold">{bracket.champion.name}</span>
          </div>
        </div>
      )}

      {/* Bracket Display */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max">
          {rounds.map((roundMatches, roundIndex) => (
            <div key={roundIndex} className="flex flex-col gap-4">
              <h3 className="text-center font-medium text-white/60 mb-2">
                {roundIndex === rounds.length - 1 ? 'Final' : 
                 roundIndex === rounds.length - 2 ? 'Semi-Finals' : 
                 `Round ${roundIndex + 1}`}
              </h3>
              <div className="flex flex-col gap-4" style={{ justifyContent: 'space-around', minHeight: '400px' }}>
                {roundMatches.map(match => (
                  <MatchCard 
                    key={match.id} 
                    match={match} 
                    isCurrentMatch={currentMatch?.id === match.id}
                    onPlay={() => onPlayMatch(match)}
                    isComplete={bracket.status === 'completed'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Match Actions */}
      {currentMatch && !currentMatch.completed && bracket.status !== 'completed' && (
        <div className="mt-8 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4 text-center">Next Match</h3>
          <div className="flex items-center justify-center gap-8 mb-4">
            <PlayerDisplay player={currentMatch.player1} />
            <span className="text-2xl font-bold text-white/40">VS</span>
            <PlayerDisplay player={currentMatch.player2} />
          </div>
          <Button
            onClick={() => onPlayMatch(currentMatch)}
            className="w-full py-4 text-lg bg-gradient-to-r from-cyan-500 to-purple-500"
          >
            🎤 Start Match
          </Button>
        </div>
      )}
    </div>
  );
}

// Individual Match Card
function MatchCard({ match, isCurrentMatch, onPlay, isComplete }: { 
  match: TournamentMatch; 
  isCurrentMatch: boolean;
  onPlay: () => void;
  isComplete: boolean;
}) {
  if (match.isBye && match.player1) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-3 w-48">
        <div className="text-xs text-white/40 mb-1">BYE</div>
        <PlayerDisplay player={match.player1} small />
        <div className="text-xs text-green-400 mt-1">Advanced</div>
      </div>
    );
  }

  return (
    <div 
      className={`rounded-lg p-3 w-48 ${
        isCurrentMatch && !isComplete
          ? 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border-2 border-cyan-500 cursor-pointer hover:scale-105 transition-transform'
          : match.completed
            ? 'bg-white/5 border border-white/10'
            : 'bg-white/5 border border-white/10 opacity-50'
      }`}
      onClick={isCurrentMatch && !isComplete ? onPlay : undefined}
    >
      {/* Player 1 */}
      <div className={`flex items-center gap-2 p-2 rounded ${match.winner?.id === match.player1?.id ? 'bg-green-500/20' : ''}`}>
        <PlayerDisplay player={match.player1} small />
        {match.completed && (
          <span className="ml-auto text-sm font-bold">{match.score1}</span>
        )}
      </div>
      
      <div className="text-center text-white/30 text-xs my-1">vs</div>
      
      {/* Player 2 */}
      <div className={`flex items-center gap-2 p-2 rounded ${match.winner?.id === match.player2?.id ? 'bg-green-500/20' : ''}`}>
        <PlayerDisplay player={match.player2} small />
        {match.completed && (
          <span className="ml-auto text-sm font-bold">{match.score2}</span>
        )}
      </div>

      {match.winner && (
        <div className="mt-2 text-xs text-center text-amber-400">
          🏆 {match.winner.name}
        </div>
      )}
    </div>
  );
}

// Player Display Component
function PlayerDisplay({ player, small = false }: { player: TournamentPlayer | null; small?: boolean }) {
  if (!player) {
    return (
      <div className={`flex items-center gap-2 ${small ? 'text-sm' : ''}`}>
        <div className={`${small ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-white/10`} />
        <span className="text-white/30">TBD</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${small ? 'text-sm' : ''}`}>
      {player.avatar ? (
        <img 
          src={player.avatar} 
          alt={player.name} 
          className={`${small ? 'w-8 h-8' : 'w-10 h-10'} rounded-full object-cover`}
        />
      ) : (
        <div 
          className={`${small ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex items-center justify-center text-white font-bold`}
          style={{ backgroundColor: player.color }}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="font-medium truncate">{player.name}</span>
    </div>
  );
}
