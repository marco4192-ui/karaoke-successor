'use client';

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Song, GameMode, PlayerProfile, HighscoreEntry } from '@/types/game';
import { toggleFavorite, getPlaylists } from '@/lib/playlist-manager';
import { MusicIcon } from '@/components/icons';
import {
  DifficultySelector,
  ModeSelector,
  PlayerSelector,
  SongInfo,
  HighscorePreview,
  SongActionButtons,
} from './song-start';
import { VocalSeparatorPanel } from '@/components/audio/vocal-separator-panel';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { StemType } from '@/lib/audio/vocal-separator';

export interface StartOptions {
  difficulty: 'easy' | 'medium' | 'hard';
  mode: 'single' | 'duel' | 'duet' | GameMode;
  players: string[];
  partyMode?: GameMode;
  /** Use instrumental track instead of original */
  useInstrumental?: boolean;
  /** URL to instrumental audio (from vocal separator) */
  instrumentalUrl?: string;
}

interface SongStartModalProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
  startOptions: StartOptions;
  onStartOptionsChange: (options: StartOptions) => void;
  profiles: PlayerProfile[];
  highscores: HighscoreEntry[];
  favoriteSongIds: Set<string>;
  onFavoriteChange: (favoriteIds: Set<string>) => void;
  onShowHighscores: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  onAddToPlaylist: (song: Song) => void;
  onStartGame: () => void;
  playerQueueCount: number;
  activeProfileId: string | null;
}

export function SongStartModal({
  song,
  isOpen,
  onClose,
  startOptions,
  onStartOptionsChange,
  profiles,
  highscores,
  favoriteSongIds,
  onFavoriteChange,
  onShowHighscores,
  onAddToQueue,
  onAddToPlaylist,
  onStartGame,
  playerQueueCount,
  activeProfileId,
}: SongStartModalProps) {
  const [showVocalSeparator, setShowVocalSeparator] = useState(false);

  // Hooks must be called before any early returns
  const handleStemSelect = useCallback((stem: StemType, url: string) => {
    if (stem === 'instrumental') {
      onStartOptionsChange({
        ...startOptions,
        useInstrumental: true,
        instrumentalUrl: url,
      });
    }
  }, [startOptions, onStartOptionsChange]);

  const handleSeparationComplete = useCallback((stems: Map<StemType, string>) => {
    const instrumentalUrl = stems.get('instrumental');
    if (instrumentalUrl) {
      onStartOptionsChange({
        ...startOptions,
        useInstrumental: true,
        instrumentalUrl,
      });
    }
  }, [startOptions, onStartOptionsChange]);

  if (!song) return null;

  const activeProfiles = profiles.filter(p => p.isActive !== false);

  const handleFavoriteToggle = () => {
    toggleFavorite(song.id);
    const allPlaylists = getPlaylists();
    const favorites = allPlaylists.find(p => p.id === 'system-favorites');
    if (favorites) {
      const favs = new Set<string>();
      favorites.songIds.forEach(id => favs.add(id));
      onFavoriteChange(favs);
    }
  };

  const handleModeChange = (mode: 'single' | 'duel' | 'duet' | GameMode) => {
    onStartOptionsChange({ ...startOptions, mode });
  };

  const handlePartyModeReset = () => {
    onStartOptionsChange({ ...startOptions, partyMode: undefined, mode: 'single' });
  };

  const handlePlayersChange = (players: string[]) => {
    onStartOptionsChange({ ...startOptions, players });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{song.title}</DialogTitle>
          <DialogDescription className="text-white/60">{song.artist}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Cover Preview */}
          <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-purple-600/30 to-blue-600/30">
            {song.coverImage ? (
              <img src={song.coverImage} alt={song.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MusicIcon className="w-16 h-16 text-white/30" />
              </div>
            )}
          </div>

          {/* Difficulty Selection */}
          <DifficultySelector
            difficulty={startOptions.difficulty}
            onChange={(difficulty) => onStartOptionsChange({ ...startOptions, difficulty })}
          />

          {/* Mode Selection */}
          <ModeSelector
            mode={startOptions.mode}
            partyMode={startOptions.partyMode}
            isDuetSong={song?.isDuet || false}
            onChange={handleModeChange}
            onPartyModeReset={handlePartyModeReset}
          />

          {/* Player Selection */}
          <PlayerSelector
            profiles={profiles}
            selectedPlayers={startOptions.players}
            mode={startOptions.mode}
            partyMode={startOptions.partyMode}
            onChange={handlePlayersChange}
          />

          {/* Song Info */}
          <SongInfo song={song} />

          {/* Vocal Separator - Collapsible */}
          {(song.audioUrl || song.relativeAudioPath) && (
            <Collapsible open={showVocalSeparator} onOpenChange={setShowVocalSeparator}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                >
                  🎤 Extract Vocals/Instrumental
                  {startOptions.useInstrumental && (
                    <span className="ml-2 text-green-400">✓ Instrumental Ready</span>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <VocalSeparatorPanel
                  audioSource={song.audioUrl || song.relativeAudioPath}
                  onStemSelect={handleStemSelect}
                  onSeparationComplete={handleSeparationComplete}
                  compact
                />
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Local Highscore Preview */}
          <HighscorePreview
            song={song}
            highscores={highscores}
            onViewAll={onShowHighscores}
          />
        </div>

        {/* Action Buttons */}
        <SongActionButtons
          song={song}
          favoriteSongIds={favoriteSongIds}
          activeProfileId={activeProfileId}
          playerQueueCount={playerQueueCount}
          startMode={startOptions.mode}
          partyMode={startOptions.partyMode}
          selectedPlayers={startOptions.players}
          activeProfiles={activeProfiles}
          onFavoriteToggle={handleFavoriteToggle}
          onShowHighscores={onShowHighscores}
          onAddToQueue={onAddToQueue}
          onAddToPlaylist={onAddToPlaylist}
          onClose={onClose}
          onStartGame={onStartGame}
        />
      </DialogContent>
    </Dialog>
  );
}
