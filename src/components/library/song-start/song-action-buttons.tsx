'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Song, PlayerProfile, GameMode } from '@/types/game';
import {
  PlayIcon,
  StarIcon,
  TrophyIcon,
  QueueIcon,
} from '@/components/icons';

interface SongActionButtonsProps {
  song: Song;
  favoriteSongIds: Set<string>;
  activeProfileId: string | null;
  playerQueueCount: number;
  startMode: 'single' | 'duel' | 'duet' | GameMode;
  partyMode?: GameMode;
  selectedPlayers: string[];
  activeProfiles: PlayerProfile[];
  onFavoriteToggle: () => void;
  onShowHighscores: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  onAddToPlaylist: (song: Song) => void;
  onClose: () => void;
  onStartGame: () => void;
}

export function SongActionButtons({
  song,
  favoriteSongIds,
  activeProfileId,
  playerQueueCount,
  startMode,
  partyMode,
  selectedPlayers,
  activeProfiles,
  onFavoriteToggle,
  onShowHighscores,
  onAddToQueue,
  onAddToPlaylist,
  onClose,
  onStartGame,
}: SongActionButtonsProps) {
  const isStartDisabled =
    // Single mode: need player selection if multiple profiles
    (startMode === 'single' &&
     activeProfiles.length > 1 &&
     selectedPlayers.length === 0) ||
    // Duet mode: need 2 players selected
    (startMode === 'duet' &&
     selectedPlayers.length < 2) ||
    // Duel mode: need 2 players selected
    (startMode === 'duel' &&
     selectedPlayers.length < 2);

  return (
    <div className="flex flex-wrap gap-3">
      {/* Favorite Button */}
      <Button
        variant="outline"
        onClick={onFavoriteToggle}
        className={favoriteSongIds.has(song.id)
          ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30"
          : "border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
        }
      >
        <StarIcon className="w-4 h-4 mr-2" filled={favoriteSongIds.has(song.id)} />
        {favoriteSongIds.has(song.id) ? 'Favorited' : 'Favorite'}
      </Button>

      <Button
        variant="outline"
        onClick={() => onShowHighscores(song)}
        className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
      >
        <TrophyIcon className="w-4 h-4 mr-2" /> Scores
      </Button>

      <Button
        variant="outline"
        onClick={() => {
          onAddToQueue(song);
          onClose();
        }}
        disabled={!activeProfileId || playerQueueCount >= 3}
        className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <QueueIcon className="w-4 h-4 mr-2" /> Queue {!activeProfileId && '(Select Player)'}
      </Button>

      <Button
        variant="outline"
        onClick={() => onAddToPlaylist(song)}
        className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        Add to Playlist
      </Button>

      <Button
        variant="outline"
        onClick={onClose}
        className="border-white/20 text-white hover:bg-white/10"
      >
        Cancel
      </Button>

      <Button
        onClick={onStartGame}
        disabled={isStartDisabled}
        className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <PlayIcon className="w-4 h-4 mr-2" /> Start
      </Button>
    </div>
  );
}
