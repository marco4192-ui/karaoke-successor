'use client';

import React from 'react';
import { Player } from '@/types/game';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';

interface ScoreDisplayProps {
  player: Player;
  showCombo?: boolean;
  compact?: boolean;
}

export function ScoreDisplay({ player, showCombo = true, compact = false }: ScoreDisplayProps) {
  return (
    <div className={`${compact ? 'p-3' : 'p-4'} rounded-xl bg-black/40 backdrop-blur-sm border border-white/10`}>
      {/* Player info */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: player.color }}
        >
          {player.avatar ? (
            <img
              src={player.avatar}
              alt={player.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            player.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <p className="font-bold text-white">{player.name}</p>
          <p className="text-xs text-gray-400">
            {player.notesHit} / {player.notesHit + player.notesMissed} notes
          </p>
        </div>
      </div>

      {/* Score */}
      <div className="mb-3">
        <p className={`font-bold text-white ${compact ? 'text-2xl' : 'text-4xl'}`}>
          {player.score.toLocaleString()}
        </p>
      </div>

      {/* Combo */}
      {showCombo && player.combo > 0 && (
        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="mb-3"
          >
            <span
              className={`font-bold ${
                player.combo >= 50
                  ? 'text-yellow-400'
                  : player.combo >= 25
                  ? 'text-orange-400'
                  : player.combo >= 10
                  ? 'text-green-400'
                  : 'text-cyan-400'
              }`}
            >
              {player.combo}x COMBO
            </span>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Accuracy */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Accuracy</span>
          <span className="text-white font-medium">{player.accuracy.toFixed(1)}%</span>
        </div>
        <Progress
          value={player.accuracy}
          className="h-2"
        />
      </div>

      {/* Star Power */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Star Power</span>
          <span className={`${player.isStarPowerActive ? 'text-yellow-400' : 'text-white'}`}>
            {Math.round(player.starPower)}%
          </span>
        </div>
        <Progress
          value={player.starPower}
          className={`h-2 ${player.isStarPowerActive ? 'animate-pulse' : ''}`}
        />
        {player.isStarPowerActive && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-yellow-400 text-xs font-bold mt-1"
          >
            ⭐ STAR POWER ACTIVE!
          </motion.p>
        )}
      </div>

      {/* Max combo */}
      <div className="mt-3 text-xs text-gray-500">
        Best Combo: {player.maxCombo}x
      </div>
    </div>
  );
}

interface MultiPlayerScoreDisplayProps {
  players: Player[];
}

export function MultiPlayerScoreDisplay({ players }: MultiPlayerScoreDisplayProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="grid gap-4">
      {sortedPlayers.map((player, index) => (
        <div
          key={player.id}
          className={`relative ${index === 0 ? 'ring-2 ring-yellow-400/50' : ''}`}
        >
          {index === 0 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-xs">👑</span>
            </div>
          )}
          <ScoreDisplay player={player} compact />
        </div>
      ))}
    </div>
  );
}
