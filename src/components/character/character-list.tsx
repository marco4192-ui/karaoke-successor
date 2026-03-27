'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserIcon } from '@/components/icons';
import { PlayerProfile } from '@/types/game';
import { getLevelForXP, getRankForXP } from '@/lib/game/player-progression';
import { COUNTRY_OPTIONS } from '@/components/screens/character-screen';

export interface CharacterListProps {
  profiles: PlayerProfile[];
  displayedProfileId: string | null;
  activeProfileId: string | null;
  onSelectProfile: (profileId: string) => void;
  onSetActiveProfile: (profileId: string) => void;
}

export function CharacterList({
  profiles,
  displayedProfileId,
  activeProfileId,
  onSelectProfile,
  onSetActiveProfile,
}: CharacterListProps) {
  if (profiles.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-8 text-center text-white/60">
          <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No characters yet. Click "Create New Character" to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-2">
        {profiles.map((profile) => {
          const level = getLevelForXP(profile.xp || 0);
          const rank = getRankForXP(profile.xp || 0);
          const isSelected = displayedProfileId === profile.id;
          const isActive = activeProfileId === profile.id;

          return (
            <div
              key={profile.id}
              onClick={() => {
                onSelectProfile(profile.id);
                onSetActiveProfile(profile.id);
              }}
              className={`
                flex-shrink-0 w-28 p-3 rounded-xl cursor-pointer transition-all
                ${isSelected
                  ? 'bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border-2 border-cyan-500 scale-105'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30'
                }
              `}
            >
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <div className="relative mb-2">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold overflow-hidden border-2"
                    style={{
                      backgroundColor: profile.color,
                      borderColor: isActive ? '#22d3ee' : 'transparent'
                    }}
                  >
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      profile.name[0].toUpperCase()
                    )}
                  </div>
                  {/* Active indicator */}
                  {isActive && (
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
                    {COUNTRY_OPTIONS.find(c => c.code === profile.country)?.flag || ''}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
