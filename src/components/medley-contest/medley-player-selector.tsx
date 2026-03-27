'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayerProfile } from '@/types/game';

interface MedleyPlayerSelectorProps {
  profiles: PlayerProfile[];
  selectedPlayers: string[];
  onTogglePlayer: (playerId: string) => void;
}

export function MedleyPlayerSelector({ profiles, selectedPlayers, onTogglePlayer }: MedleyPlayerSelectorProps) {
  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle>Select Players ({selectedPlayers.length}/4)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {profiles.map(profile => {
            const isSelected = selectedPlayers.includes(profile.id);
            return (
              <div
                key={profile.id}
                onClick={() => onTogglePlayer(profile.id)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500' 
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: profile.color }}
                    >
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium truncate">{profile.name}</span>
                  {isSelected && <span className="ml-auto text-purple-400">✓</span>}
                </div>
              </div>
            );
          })}
        </div>
        
        {profiles.length < 1 && (
          <p className="text-yellow-400 mt-4">
            ⚠️ No active profiles available. Create and activate profiles in Character selection.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
