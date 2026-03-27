'use client';

import React from 'react';
import { PlayerProfile, GameMode } from '@/types/game';

interface PlayerSelectorProps {
  profiles: PlayerProfile[];
  selectedPlayers: string[];
  mode: 'single' | 'duel' | 'duet' | GameMode;
  partyMode?: GameMode;
  onChange: (players: string[]) => void;
}

export function PlayerSelector({
  profiles,
  selectedPlayers,
  mode,
  partyMode,
  onChange,
}: PlayerSelectorProps) {
  const activeProfiles = profiles.filter(p => p.isActive !== false);

  // Player Selection for Single mode
  if (!partyMode && mode === 'single' && activeProfiles.length > 1) {
    return (
      <div>
        <label className="text-sm text-white/60 mb-2 block">Select Player</label>
        <div className={`grid grid-cols-2 gap-2 ${activeProfiles.length > 6 ? 'max-h-48 overflow-y-auto pr-1' : ''}`}>
          {activeProfiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => onChange([profile.id])}
              className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                selectedPlayers[0] === profile.id
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <PlayerAvatar profile={profile} />
              <span className="text-sm truncate">{profile.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Player Selection for Duel mode
  if (!partyMode && mode === 'duel' && activeProfiles.length >= 2) {
    return (
      <div>
        <label className="text-sm text-white/60 mb-2 block">Select 2 Players ({activeProfiles.length} available)</label>
        <div className={`grid grid-cols-2 gap-2 ${activeProfiles.length > 6 ? 'max-h-48 overflow-y-auto pr-1' : ''}`}>
          {activeProfiles.map((profile) => {
            const isSelected = selectedPlayers.includes(profile.id);
            return (
              <button
                key={profile.id}
                onClick={() => {
                  const players = isSelected
                    ? selectedPlayers.filter(id => id !== profile.id)
                    : selectedPlayers.length < 2
                      ? [...selectedPlayers, profile.id]
                      : selectedPlayers;
                  onChange(players);
                }}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <PlayerAvatar profile={profile} />
                <span className="text-sm truncate">{profile.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Player Selection for Party Games
  if (partyMode && activeProfiles.length >= 1) {
    return (
      <div>
        <label className="text-sm text-white/60 mb-2 block">
          Select Players ({partyMode === 'pass-the-mic' ? '2-8' :
                          partyMode === 'medley' ? '1-4' :
                          partyMode === 'missing-words' ? '1-4' :
                          partyMode === 'blind' ? '1-4' : '1-8'} players)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
          {activeProfiles.map((profile) => {
            const isSelected = selectedPlayers.includes(profile.id);
            return (
              <button
                key={profile.id}
                onClick={() => {
                  const players = isSelected
                    ? selectedPlayers.filter(id => id !== profile.id)
                    : [...selectedPlayers, profile.id];
                  onChange(players);
                }}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <PlayerAvatar profile={profile} />
                <span className="text-sm truncate">{profile.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Player Selection for Duet mode
  if (!partyMode && mode === 'duet' && activeProfiles.length >= 2) {
    return (
      <div>
        <label className="text-sm text-white/60 mb-2 block">Select 2 Players (P1 & P2) - {activeProfiles.length} available</label>
        <div className={`grid grid-cols-2 gap-2 ${activeProfiles.length > 6 ? 'max-h-48 overflow-y-auto pr-1' : ''}`}>
          {activeProfiles.map((profile) => {
            const isSelected = selectedPlayers.includes(profile.id);
            return (
              <button
                key={profile.id}
                onClick={() => {
                  const players = isSelected
                    ? selectedPlayers.filter(id => id !== profile.id)
                    : selectedPlayers.length < 2
                      ? [...selectedPlayers, profile.id]
                      : selectedPlayers;
                  onChange(players);
                }}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-pink-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <PlayerAvatar profile={profile} />
                <span className="text-sm truncate">{profile.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

// Helper component for player avatar
function PlayerAvatar({ profile }: { profile: PlayerProfile }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
      style={{ backgroundColor: profile.color }}
    >
      {profile.avatar ? (
        <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
      ) : (
        profile.name[0]
      )}
    </div>
  );
}
