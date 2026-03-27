'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ExtendedPlayerProfile } from '@/lib/db/user-db';
import { createEmptyPerformanceStats } from '@/lib/game/performance-analytics';
import {
  GuestIcon,
  SyncIcon,
  TrophyIcon,
  SettingsIcon,
  TrashIcon,
} from './profile-icons';

interface ProfileCardProps {
  profile: ExtendedPlayerProfile;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProfileCard({
  profile,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: ProfileCardProps) {
  // Get stats display
  const stats = (() => {
    const perfStats = profile.stats || createEmptyPerformanceStats();
    const gamesPlayed = profile.gamesPlayed || 0;
    const totalScore = profile.totalScore || 0;
    const avgScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;

    return {
      gamesPlayed,
      totalScore,
      avgScore,
      bestCombo: perfStats.bestCombo || 0,
    };
  })();

  return (
    <Card
      className={`bg-white/5 border-white/10 transition-all cursor-pointer ${
        isActive ? 'ring-2 ring-cyan-500 border-cyan-500/50' : 'hover:border-white/20'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden"
              style={{ backgroundColor: profile.color }}
            >
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.name[0].toUpperCase()
              )}
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-semibold">{profile.name}</h3>
                {isActive && (
                  <Badge className="bg-cyan-500/30 text-cyan-300 border-cyan-500/50">
                    Active
                  </Badge>
                )}
                {profile.isGuest ? (
                  <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                    <GuestIcon className="w-3 h-3 mr-1" /> Guest
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-green-500/50 text-green-400">
                    <SyncIcon className="w-3 h-3 mr-1" /> Synced
                  </Badge>
                )}
              </div>

              {/* Sync Code */}
              <div className="flex items-center gap-2 text-sm text-white/50">
                <span>Sync Code:</span>
                <code className="bg-black/30 px-2 py-0.5 rounded font-mono">
                  {profile.syncCode}
                </code>
              </div>

              {/* Stats */}
              <div className="flex gap-4 mt-2 text-sm">
                <div className="flex items-center gap-1">
                  <TrophyIcon className="w-4 h-4 text-yellow-500" />
                  <span>{stats.gamesPlayed} games</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-cyan-400">Avg:</span>
                  <span>{stats.avgScore.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-purple-400">Best Combo:</span>
                  <span>{stats.bestCombo}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <SettingsIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
