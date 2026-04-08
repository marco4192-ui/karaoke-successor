'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { GameMode } from '@/types/game';

interface PartyGame {
  mode: GameMode;
  title: string;
  description: string;
  icon: string;
  players: string;
  color: string;
  isNew?: boolean;
}

const partyGames: PartyGame[] = [
  {
    mode: 'pass-the-mic',
    title: 'Pass the Mic',
    description: 'Take turns singing parts of a song. When the music stops, the next singer takes over!',
    icon: '🎤',
    players: '2-8',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    mode: 'companion-singalong',
    title: 'Companion Sing-A-Long',
    description: 'Your phone randomly lights up - that\'s your cue to sing! No one knows who\'s next until the blink!',
    icon: '📱',
    players: '2-8',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    mode: 'medley',
    title: 'Medley Contest',
    description: 'Sing short snippets of multiple songs in a row. How many can you nail?',
    icon: '🎵',
    players: '1-4',
    color: 'from-purple-500 to-pink-500',
  },
  {
    mode: 'missing-words',
    title: 'Missing Words',
    description: 'Some lyrics disappear! Can you sing the right words at the right time?',
    icon: '📝',
    players: '1-4',
    color: 'from-orange-500 to-red-500',
  },
  {
    mode: 'blind',
    title: 'Blind Karaoke',
    description: 'Lyrics disappear for certain sections. Can you remember the words?',
    icon: '🙈',
    players: '1-4',
    color: 'from-green-500 to-teal-500',
  },
  {
    mode: 'tournament',
    title: 'Tournament Mode',
    description: 'Single elimination bracket! 4-32 players compete in Sudden-Death matches. Who will be champion?',
    icon: '🏆',
    players: '4-32',
    color: 'from-amber-500 to-yellow-500',
    isNew: true,
  },
  {
    mode: 'battle-royale',
    title: 'Battle Royale',
    description: 'All players sing simultaneously! Lowest score gets eliminated each round. Last singer standing wins!',
    icon: '👑',
    players: '2-8',
    color: 'from-red-600 to-pink-600',
    isNew: true,
  },
  {
    mode: 'online',
    title: 'Online Multiplayer',
    description: 'Play against friends or find opponents online! Create rooms, join matches, and compete globally!',
    icon: '🌐',
    players: '2-8',
    color: 'from-cyan-500 to-purple-600',
    isNew: true,
  },
];

interface PartyScreenProps {
  onSelectMode: (mode: GameMode) => void;
}

export function PartyScreen({ onSelectMode }: PartyScreenProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Party Games</h1>
        <p className="text-white/60">Choose a game mode for your party!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partyGames.map((game) => (
          <Card 
            key={game.mode}
            className={`bg-gradient-to-br ${game.color} border-0 cursor-pointer hover:scale-105 transition-transform relative`}
            onClick={() => onSelectMode(game.mode)}
          >
            <CardContent className="pt-6">
              {game.isNew && (
                <div className="absolute top-2 right-2 bg-white/90 text-black text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                  ✨ NEW
                </div>
              )}
              <div className="text-5xl mb-4">{game.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-2">{game.title}</h3>
              <p className="text-white/80 mb-4">{game.description}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {game.players} players
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
