'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  getMatchesForRound, 
  getPlayableMatches, 
  getTournamentStats,
  TournamentBracket,
  TournamentMatch,
} from '@/lib/game/tournament';
import { Song, PlayerProfile } from '@/types/game';
import {
  useTournamentSetup,
  TournamentSettingsCard,
  TournamentPlayerSelector,
  PlayerDisplay,
  BracketMatchCard,
} from '@/components/tournament';

// ===================== SETUP SCREEN =====================
interface TournamentScreenProps {
  profiles: PlayerProfile[];
  songs: Song[];
  onStartTournament: (bracket: TournamentBracket, songDuration: number) => void;
  onBack: () => void;
}

export function TournamentSetupScreen({ profiles, songs, onStartTournament, onBack }: TournamentScreenProps) {
  const {
    selectedPlayers,
    maxPlayers,
    shortMode,
    error,
    activeProfiles,
    globalDifficulty,
    togglePlayer,
    updateMaxPlayers,
    setShortMode,
    setGlobalDifficulty,
    createTournamentBracket,
  } = useTournamentSetup(profiles);

  const handleStartTournament = () => {
    const result = createTournamentBracket();
    if (result) {
      onStartTournament(result.bracket, result.songDuration);
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
      <TournamentSettingsCard
        maxPlayers={maxPlayers}
        shortMode={shortMode}
        difficulty={globalDifficulty}
        onUpdateMaxPlayers={updateMaxPlayers}
        onToggleShortMode={() => setShortMode(!shortMode)}
        onSetDifficulty={setGlobalDifficulty}
      />

      {/* Player Selection */}
      <TournamentPlayerSelector
        profiles={activeProfiles}
        selectedPlayers={selectedPlayers}
        maxPlayers={maxPlayers}
        onTogglePlayer={togglePlayer}
      />

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

// ===================== BRACKET VIEW =====================
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

  // Get next match to play
  const playableMatches = getPlayableMatches(bracket);
  const nextMatch = playableMatches[0] || null;
  
  // Calculate bracket height based on first round matches
  const bracketHeight = useMemo(() => {
    const firstRoundMatches = rounds[0]?.length || 4;
    return Math.max(400, firstRoundMatches * 100);
  }, [rounds]);

  return (
    <div className="max-w-full mx-auto px-4">
      {/* Tournament Header */}
      <div className="text-center mb-6">
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

      {/* Current Match Info - Who's Next */}
      {nextMatch && !bracket.champion && (
        <div className="mb-6 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-500/30 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4 text-center flex items-center justify-center gap-2">
            <span className="animate-pulse">🎤</span>
            <span>Next Duel: {nextMatch.player1?.name || 'TBD'} vs {nextMatch.player2?.name || 'TBD'}</span>
          </h3>
          <div className="flex items-center justify-center gap-8 mb-4">
            <PlayerDisplay player={nextMatch.player1} />
            <span className="text-2xl font-bold text-white/40">⚔️</span>
            <PlayerDisplay player={nextMatch.player2} />
          </div>
          <Button
            onClick={() => onPlayMatch(nextMatch)}
            className="w-full py-4 text-lg bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
          >
            🎤 Start Duel
          </Button>
        </div>
      )}

      {/* Double Bracket Tree */}
      <div className="overflow-x-auto pb-4">
        <div className="flex items-stretch justify-center min-w-max">
          {/* Left Side of Bracket */}
          <div className="flex items-center">
            {rounds.slice(0, -1).map((roundMatches, roundIndex) => {
              const isLastRound = roundIndex === rounds.length - 2;
              const roundName = roundIndex === 0 ? 'First Round' : 
                               isLastRound ? 'Semi-Finals' : `Round ${roundIndex + 1}`;
              
              return (
                <div key={`left-${roundIndex}`} className="flex flex-col relative">
                  <h3 className="text-center font-medium text-white/60 mb-3 text-sm min-w-[180px]">
                    {roundName}
                  </h3>
                  
                  <div 
                    className="flex flex-col justify-around flex-1 relative"
                    style={{ minHeight: `${bracketHeight}px` }}
                  >
                    {roundIndex < rounds.length - 2 && (
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-white/20 via-white/10 to-white/20"
                        style={{ transform: 'translateX(50%)' }}
                      />
                    )}
                    
                    {roundMatches.map((match, matchIndex) => {
                      const totalMatches = roundMatches.length;
                      const spacing = 100 / (totalMatches + 1);
                      
                      return (
                        <div 
                          key={match.id} 
                          className="relative flex items-center justify-center"
                          style={{ height: `${spacing}%` }}
                        >
                          {roundIndex < rounds.length - 2 && (
                            <div className="absolute right-0 w-6 h-0.5 bg-white/20 translate-x-full" />
                          )}
                          
                          <BracketMatchCard 
                            match={match} 
                            isCurrentMatch={currentMatch?.id === match.id}
                            isPlayable={playableMatches.some(m => m.id === match.id)}
                            onPlay={() => onPlayMatch(match)}
                            isComplete={bracket.status === 'completed'}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Finals in the Center */}
          <div className="flex flex-col px-8 relative">
            <h3 className="text-center font-bold text-amber-400 mb-3 text-lg">
              🏆 FINAL
            </h3>
            <div 
              className="flex flex-col justify-center flex-1 relative"
              style={{ minHeight: `${bracketHeight}px` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/20 to-amber-500/10 rounded-xl blur-xl" />
              
              {rounds[rounds.length - 1]?.map(match => (
                <div key={match.id} className="relative z-10 transform scale-125">
                  <BracketMatchCard 
                    match={match} 
                    isCurrentMatch={currentMatch?.id === match.id}
                    isPlayable={playableMatches.some(m => m.id === match.id)}
                    onPlay={() => onPlayMatch(match)}
                    isComplete={bracket.status === 'completed'}
                    isFinal
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Queue Display */}
      {playableMatches.length > 1 && !bracket.champion && (
        <div className="mt-8 bg-white/5 rounded-lg p-4">
          <h4 className="text-sm text-white/60 mb-3">📋 Upcoming Duels</h4>
          <div className="flex flex-wrap gap-2">
            {playableMatches.slice(1, 5).map((match, i) => (
              <div key={match.id} className="bg-white/5 rounded-lg px-3 py-2 text-sm border border-white/10">
                <span className="text-white/60">{i + 2}.</span>{' '}
                <span className="text-cyan-400">{match.player1?.name || 'TBD'}</span>
                <span className="text-white/40 mx-1">vs</span>
                <span className="text-pink-400">{match.player2?.name || 'TBD'}</span>
              </div>
            ))}
            {playableMatches.length > 5 && (
              <div className="text-white/40 text-sm self-center">
                +{playableMatches.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
