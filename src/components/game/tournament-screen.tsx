'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  createTournament, 
  getPlayableMatches, 
  getTournamentStats,
  TournamentBracket,
  TournamentPlayer,
  TournamentMatch,
  TournamentSettings,
} from '@/lib/game/tournament';
import { Song, PlayerProfile, PLAYER_COLORS, Difficulty } from '@/types/game';
import { getAllSongs } from '@/lib/game/song-library';
import { useGameStore } from '@/lib/game/store';
import { TournamentBracketButterfly } from '@/components/game/tournament-bracket-butterfly';
import { MatchAbortDialog } from '@/components/game/match-abort-dialog';

interface TournamentScreenProps {
  profiles: PlayerProfile[];
  songs: Song[];
  onStartTournament: (bracket: TournamentBracket, songDuration: number) => void;
  onBack: () => void;
}

export function TournamentSetupScreen({ profiles, songs, onStartTournament, onBack }: TournamentScreenProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [maxPlayers, setMaxPlayers] = useState<2 | 4 | 8 | 16 | 32>(8);
  const [shortMode, setShortMode] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter to only show active profiles (isActive === true or undefined for backwards compatibility)
  const activeProfiles = useMemo(() => 
    profiles.filter(p => p.isActive !== false),
    [profiles]
  );

  // Use global difficulty from store instead of local state
  const globalDifficulty = useGameStore((state) => state.gameState.difficulty);
  const setGlobalDifficulty = useGameStore((state) => state.setDifficulty);
  const difficulty = globalDifficulty;

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
    if (selectedPlayers.length < 2) {
      setError('Minimum 2 players required');
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
            <div className="flex gap-2 flex-wrap">
              {[2, 4, 8, 16, 32].map(size => (
                <Button
                  key={size}
                  variant={maxPlayers === size ? 'default' : 'outline'}
                  onClick={() => {
                    setMaxPlayers(size as 2 | 4 | 8 | 16 | 32);
                    if (selectedPlayers.length > size) {
                      setSelectedPlayers(prev => prev.slice(0, size));
                    }
                  }}
                  className={maxPlayers === size ? 'bg-amber-500 hover:bg-amber-600' : 'border-white/20'}
                >
                  {size} {size === 2 ? 'Duel' : 'Players'}
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
                  onClick={() => setGlobalDifficulty(diff as Difficulty)}
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
            {activeProfiles.map(profile => {
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
          
          {activeProfiles.length < 2 && (
            <p className="text-yellow-400 mt-4">
              ⚠️ Need at least 2 active profiles. Create more in Character selection or activate existing ones.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button
        onClick={handleStartTournament}
        disabled={selectedPlayers.length < 2}
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
  onManualWinner?: (matchId: string, winnerId: string) => void;
  onRepeatMatch?: () => void;
  matchAborted?: boolean;
  onAbortHandled?: () => void;
  songs: Song[];
  shortMode: boolean;
}

export function TournamentBracketView({ bracket, currentMatch, onPlayMatch, onManualWinner, onRepeatMatch, matchAborted, onAbortHandled, shortMode }: TournamentBracketViewProps) {
  const stats = getTournamentStats(bracket);

  // Get next match to play
  const playableMatches = getPlayableMatches(bracket);
  const nextMatch = playableMatches[0] || null;

  // Auto-scale bracket to fit available viewport height
  const bracketWrapperRef = useRef<HTMLDivElement>(null);
  const bracketInnerRef = useRef<HTMLDivElement>(null);
  const [bracketScale, setBracketScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const wrapper = bracketWrapperRef.current;
      const inner = bracketInnerRef.current;
      if (!wrapper || !inner) return;
      const available = wrapper.clientHeight;
      const needed = inner.scrollHeight;
      if (needed > 0 && available > 0) {
        setBracketScale(Math.min(1, available / needed));
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (bracketWrapperRef.current) ro.observe(bracketWrapperRef.current);
    return () => ro.disconnect();
  }, [bracket]);

  return (
    <div className="max-w-full mx-auto px-4 h-[calc(100vh-5rem)] overflow-hidden flex flex-col">
      {/* Tournament Header — compact */}
      <div className="text-center mb-1 shrink-0">
        <h1 className="text-2xl font-bold mb-0.5">🏆 Tournament Bracket</h1>
        <div className="flex items-center justify-center gap-3 text-white/60 text-sm">
          <span>Round {stats.currentRound} of {stats.totalRounds}</span>
          <span>·</span>
          <span>{stats.remainingPlayers} players remaining</span>
          {shortMode && <Badge className="bg-green-500/20 text-green-400 text-xs">60s</Badge>}
        </div>
      </div>

      {/* Champion Display — compact */}
      {bracket.champion && (
        <div className="bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-2 border-amber-500 rounded-xl p-4 mb-2 text-center shrink-0">
          <div className="text-4xl mb-1">👑</div>
          <h2 className="text-xl font-bold text-amber-400 mb-1">CHAMPION!</h2>
          <div className="flex items-center justify-center gap-3">
            {bracket.champion.avatar ? (
              <img src={bracket.champion.avatar} alt={bracket.champion.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: bracket.champion.color }
              }>
                {bracket.champion.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-2xl font-bold">{bracket.champion.name}</span>
          </div>
        </div>
      )}

      {/* Next Match Preview — compact */}
      {nextMatch && !bracket.champion && (
        <div className="mb-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-500/30 rounded-xl p-2.5 shrink-0">
          <h3 className="text-sm font-bold mb-1.5 text-center flex items-center justify-center gap-2">
            <span className="animate-pulse">🎤</span>
            <span>Next Duel: {nextMatch.player1?.name || 'TBD'} vs {nextMatch.player2?.name || 'TBD'}</span>
          </h3>
          <div className="flex items-center justify-center gap-5 mb-1.5">
            <PlayerDisplay player={nextMatch.player1} />
            <span className="text-lg font-bold text-white/40">⚔️</span>
            <PlayerDisplay player={nextMatch.player2} />
          </div>
          <Button
            onClick={() => onPlayMatch(nextMatch)}
            className="w-full py-2.5 text-sm bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
          >
            🎤 Start Next Match
          </Button>
        </div>
      )}

      {/* Bracket — fills remaining space, auto-scaled and aligned to top */}
      <div ref={bracketWrapperRef} className="flex-1 min-h-0 overflow-hidden flex items-start justify-center pt-1">
        <div
          ref={bracketInnerRef}
          style={{ transform: `scale(${bracketScale})`, transformOrigin: 'top center' }}
        >
          <TournamentBracketButterfly
            bracket={bracket}
            currentMatch={currentMatch}
            onPlayMatch={onPlayMatch}
          />
        </div>
      </div>

      {/* Upcoming Duels — compact overlay at bottom */}
      {playableMatches.length > 1 && !bracket.champion && (
        <div className="mt-1 bg-white/5 rounded-lg p-1.5 shrink-0">
          <h4 className="text-xs text-white/60 mb-1">📋 Upcoming Duels</h4>
          <div className="flex flex-wrap gap-1">
            {playableMatches.slice(1, 5).map((match, i) => (
              <div key={match.id} className="bg-white/5 rounded px-2 py-0.5 text-xs border border-white/10">
                <span className="text-white/60">{i + 2}.</span>{' '}
                <span className="text-cyan-400">{match.player1?.name || 'TBD'}</span>
                <span className="text-white/40 mx-0.5">vs</span>
                <span className="text-pink-400">{match.player2?.name || 'TBD'}</span>
              </div>
            ))}
            {playableMatches.length > 5 && (
              <div className="text-white/40 text-xs self-center">
                +{playableMatches.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Match Abort Dialog */}
      {matchAborted && currentMatch && onManualWinner && onRepeatMatch && onAbortHandled && (
        <MatchAbortDialog
          match={currentMatch}
          bracket={bracket}
          onManualWinner={(matchId, winnerId) => {
            onManualWinner(matchId, winnerId);
            onAbortHandled();
          }}
          onRepeatMatch={() => {
            onRepeatMatch();
            onAbortHandled();
          }}
          onDismiss={() => {
            onAbortHandled();
          }}
        />
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
