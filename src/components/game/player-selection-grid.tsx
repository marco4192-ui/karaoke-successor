'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayerProfile } from '@/types/game';

interface PlayerSelectionGridProps {
  profiles: PlayerProfile[];
  selectedPlayers: string[];
  maxPlayers: number;
  minPlayers: number;
  gameColor: string;
  onTogglePlayer: (playerId: string) => void;
}

export function PlayerSelectionGrid({
  profiles,
  selectedPlayers,
  maxPlayers,
  minPlayers,
  gameColor,
  onTogglePlayer,
}: PlayerSelectionGridProps) {
  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">👥</span>
          Player Selection ({selectedPlayers.length}/{maxPlayers})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {profiles.map((profile) => {
            const isSelected = selectedPlayers.includes(profile.id);
            return (
              <div
                key={profile.id}
                onClick={() => onTogglePlayer(profile.id)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? `bg-gradient-to-br ${gameColor} border-2 border-white/50`
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: profile.color }}
                    >
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium truncate">{profile.name}</span>
                  {isSelected && <span className="ml-auto text-white">✓</span>}
                </div>
              </div>
            );
          })}
        </div>

        {profiles.length < minPlayers && (
          <p className="text-yellow-400 mt-4">
            ⚠️ Need at least {minPlayers} active profiles. Create more in Character selection
            or activate existing ones.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
