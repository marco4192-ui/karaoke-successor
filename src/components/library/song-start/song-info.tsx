'use client';

import React from 'react';
import { Song } from '@/types/game';

interface SongInfoProps {
  song: Song;
}

export function SongInfo({ song }: SongInfoProps) {
  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="text-xs text-white/40 space-y-1">
      <p>BPM: {song.bpm} | Duration: {formatDuration(song.duration)}</p>
      {song.genre && <p>Genre: {song.genre}</p>}
    </div>
  );
}
