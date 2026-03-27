'use client';

import { TournamentMatch } from '@/lib/game/tournament';
import { PlayerDisplay } from './player-display';

interface BracketMatchCardProps {
  match: TournamentMatch;
  isCurrentMatch: boolean;
  isPlayable: boolean;
  onPlay: () => void;
  isComplete: boolean;
  isFinal?: boolean;
}

export function BracketMatchCard({ 
  match, 
  isCurrentMatch, 
  isPlayable, 
  onPlay, 
  isComplete, 
  isFinal = false 
}: BracketMatchCardProps) {
  if (match.isBye && match.player1) {
    return (
      <div className={`bg-white/5 border border-white/10 rounded-lg p-3 ${isFinal ? 'w-56' : 'w-44'}`}>
        <div className="text-xs text-white/40 mb-1">BYE</div>
        <PlayerDisplay player={match.player1} small />
        <div className="text-xs text-green-400 mt-1">Advanced →</div>
      </div>
    );
  }

  const isClickable = isPlayable && !isComplete;
  
  return (
    <div 
      className={`rounded-lg p-3 ${isFinal ? 'w-56' : 'w-44'} transition-all ${
        isCurrentMatch && !isComplete
          ? 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border-2 border-cyan-500 shadow-lg shadow-cyan-500/20'
          : match.completed
            ? 'bg-white/10 border border-green-500/30'
            : isPlayable
              ? 'bg-white/5 border border-white/20 cursor-pointer hover:bg-white/10 hover:border-white/40'
              : 'bg-white/5 border border-white/10 opacity-60'
      } ${isClickable ? 'hover:scale-105 cursor-pointer' : ''}`}
      onClick={isClickable ? onPlay : undefined}
    >
      {/* Player 1 */}
      <div className={`flex items-center gap-2 p-1.5 rounded ${
        match.winner?.id === match.player1?.id ? 'bg-green-500/20' : ''
      }`}>
        <PlayerDisplay player={match.player1} small />
        {match.completed && (
          <span className={`ml-auto text-sm font-bold ${
            match.winner?.id === match.player1?.id ? 'text-green-400' : 'text-white/60'
          }`}>{match.score1}</span>
        )}
      </div>
      
      <div className="text-center text-white/30 text-xs my-1 flex items-center justify-center gap-2">
        <div className="flex-1 h-px bg-white/10" />
        <span>VS</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>
      
      {/* Player 2 */}
      <div className={`flex items-center gap-2 p-1.5 rounded ${
        match.winner?.id === match.player2?.id ? 'bg-green-500/20' : ''
      }`}>
        <PlayerDisplay player={match.player2} small />
        {match.completed && (
          <span className={`ml-auto text-sm font-bold ${
            match.winner?.id === match.player2?.id ? 'text-green-400' : 'text-white/60'
          }`}>{match.score2}</span>
        )}
      </div>

      {/* Winner indicator */}
      {match.winner && (
        <div className="mt-2 text-xs text-center text-amber-400 font-medium bg-amber-500/10 rounded py-1">
          🏆 {match.winner.name}
        </div>
      )}
      
      {/* Playable indicator */}
      {isPlayable && !match.completed && !isComplete && (
        <div className="mt-2 text-xs text-center text-cyan-400 font-medium">
          Click to play →
        </div>
      )}
    </div>
  );
}
