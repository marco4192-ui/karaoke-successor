'use client';

import React from 'react';
import { PlayerProfile } from '@/types/game';
import { getLevelForXP, getRankForXP } from '@/lib/game/player-progression';
import { getCountryFlag } from './country-options';

interface CharacterCardProps {
  profile: PlayerProfile;
  isSelected: boolean;
  isActiveProfile: boolean;
  onClick: () => void;
}

export function CharacterCard({ profile, isSelected, isActiveProfile, onClick }: CharacterCardProps) {
  const level = getLevelForXP(profile.xp || 0);
  const rank = getRankForXP(profile.xp || 0);
  const isProfileActive = profile.isActive ?? true;

  return (
    <div
      onClick={onClick}
      className={`
        w-28 p-3 rounded-xl cursor-pointer transition-all relative
        ${isSelected
          ? 'bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border-2 border-cyan-500 scale-105'
          : isProfileActive
            ? 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30'
            : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 opacity-50 grayscale'
        }
      `}
    >
      {/* Active/Inactive Status Indicator */}
      <div
        className={`absolute top-2 right-2 w-3 h-3 rounded-full border border-black/30 ${
          isProfileActive ? 'bg-green-500' : 'bg-red-500'
        }`}
        title={isProfileActive ? 'Active' : 'Inactive'}
      />
      <div className="flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="relative mb-2">
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold overflow-hidden border-2"
            style={{
              backgroundColor: profile.color,
              borderColor: isActiveProfile ? '#22d3ee' : 'transparent'
            }}
          >
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              profile.name[0].toUpperCase()
            )}
          </div>
          {/* Selected/Aktives Profil indicator */}
          {isActiveProfile && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full border-2 border-black flex items-center justify-center">
              <span className="text-[8px]">✓</span>
            </div>
          )}
        </div>
        
        {/* Name */}
        <div className="text-sm font-medium truncate w-full mb-1">{profile.name}</div>
        
        {/* Level/Rank */}
        <div className="text-xs text-white/50 mb-1">
          {rank?.icon} Lv.{level?.level || 1}
        </div>
        
        {/* Country flag */}
        {profile.country && (
          <div className="text-lg">
            {getCountryFlag(profile.country)}
          </div>
        )}
      </div>
    </div>
  );
}
