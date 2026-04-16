'use client';

/**
 * DEAD CODE (Code Review #5, 2026-04-17)
 *
 * This file is not imported by any other file in the project.
 *
 * Possible function: Battle Royale player card component displaying player name,
 * avatar, score, and elimination status. Designed for the BR player list/lobby.
 *
 * Currently, battle royale uses components from battle-royale/ subdirectory
 * (setup-screen.tsx, playing-view.tsx, etc.) which have their own player
 * display approaches.
 *
 * This appears to be an earlier version of the BR player display that was
 * replaced during the Round 4 extraction of battle-royale-screen.tsx.
 *
 * Consider: Could be used as a simpler player display in the BR setup screen
 * or eliminated screens where the full player-card from battle-royale/ is overkill.
 */

import { useState } from 'react';
import { BattleRoyalePlayer } from '@/lib/game/battle-royale';

export function PlayerCard({ player, rank, isLeading }: { player: BattleRoyalePlayer; rank: number; isLeading: boolean }) {
  const [isEliminating, setIsEliminating] = useState(false);

  // Determine badge styling based on player type and rank
  const cardBgClass = player.playerType === 'microphone'
    ? 'from-red-500/20 to-pink-500/20'
    : 'from-purple-500/20 to-indigo-500/20';

  const borderClass = isLeading
    ? 'border-2 border-amber-500 shadow-lg shadow-amber-500/20'
    : 'border border-white/10';

  return (
    <div
      className={`
        relative flex flex-col items-center p-4 rounded-xl
        bg-gradient-to-br ${cardBgClass}
        ${borderClass}
        transition-all duration-500
        ${player.eliminated ? 'grayscale opacity-30 scale-90' : ''}
        ${isEliminating ? 'animate-pulse' : ''}
      `}
    >
      {/* Rank Badge */}
      <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
        ${isLeading ? 'bg-amber-500 text-black' : 'bg-white/20 text-white/60'}`}>
        #{rank}
      </div>

      {/* Profile Picture */}
      <div className="relative mb-2">
        {player.avatar ? (
          <img
            src={player.avatar}
            alt={player.name}
            className={`w-16 h-16 rounded-full object-cover border-2 ${isLeading ? 'border-amber-400' : 'border-white/20'}`}
          />
        ) : (
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold border-2 ${isLeading ? 'border-amber-400' : 'border-white/20'}`}
            style={{ backgroundColor: player.color }}
          >
            {player.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Player Type Indicator */}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-sm">
          {player.playerType === 'microphone' ? '🎤' : '📱'}
        </div>
      </div>

      {/* Player Name */}
      <div className="font-bold text-sm text-center truncate max-w-full mb-2">
        {player.name}
      </div>

      {/* Score Box */}
      <div className={`
        w-full px-3 py-2 rounded-lg text-center font-bold
        ${isLeading ? 'bg-amber-500/30 text-amber-300' : 'bg-black/30 text-white'}
      `}>
        <div className="text-2xl">{player.score.toLocaleString()}</div>
        <div className="text-xs text-white/40 mt-1">
          ✓ {player.notesHit} | 🔥 {player.maxCombo}
        </div>
      </div>
    </div>
  );
}
