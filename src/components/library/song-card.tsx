'use client';

import React, { useState } from 'react';
import { Song } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Users, Clock, Star } from 'lucide-react';

interface SongCardProps {
  song: Song;
  onSelect: (song: Song) => void;
  onPreview?: (song: Song) => void;
  selected?: boolean;
}

const difficultyColors = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  hard: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const genreColors: Record<string, string> = {
  Synthwave: 'from-purple-500/20 to-pink-500/20',
  'Pop Ballad': 'from-blue-500/20 to-cyan-500/20',
  Electronic: 'from-cyan-500/20 to-green-500/20',
  'Ambient Pop': 'from-teal-500/20 to-blue-500/20',
  'Indie Pop': 'from-orange-500/20 to-yellow-500/20',
  Rock: 'from-red-500/20 to-orange-500/20',
  Pop: 'from-pink-500/20 to-purple-500/20',
};

export function SongCard({ song, onSelect, onPreview, selected }: SongCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const durationMinutes = Math.floor(song.duration / 60000);
  const durationSeconds = Math.floor((song.duration % 60000) / 1000);

  const gradientClass = genreColors[song.genre || ''] || 'from-gray-500/20 to-gray-600/20';

  return (
    <Card
      className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${
        selected ? 'ring-2 ring-cyan-400 scale-[1.02]' : ''
      } ${isHovered ? 'scale-[1.02] shadow-xl shadow-cyan-500/10' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(song)}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-50`} />

      {/* Content */}
      <CardContent className="relative p-4">
        <div className="flex gap-4">
          {/* Album art placeholder */}
          <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-black/30">
            {!imageError && song.coverImage ? (
              <img
                src={song.coverImage}
                alt={song.title}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600/30 to-pink-600/30">
                <span className="text-3xl">🎵</span>
              </div>
            )}

            {/* Preview button */}
            {isHovered && onPreview && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <Button
                  size="icon"
                  className="w-12 h-12 rounded-full bg-cyan-500 hover:bg-cyan-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(song);
                  }}
                >
                  <Play className="w-6 h-6 text-white" />
                </Button>
              </div>
            )}
          </div>

          {/* Song info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate text-lg">{song.title}</h3>
            <p className="text-gray-400 truncate">{song.artist}</p>
            {song.album && (
              <p className="text-gray-500 text-sm truncate">{song.album}</p>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className={difficultyColors[song.difficulty]}>
                {song.difficulty.toUpperCase()}
              </Badge>
              {song.genre && (
                <Badge variant="outline" className="bg-white/5 text-gray-300 border-white/10">
                  {song.genre}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>
                  {durationMinutes}:{durationSeconds.toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400" />
                <span>{song.rating}/5</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>1-{song.lyrics.length}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-cyan-400 rounded-full flex items-center justify-center">
          <svg
            className="w-4 h-4 text-black"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </Card>
  );
}
