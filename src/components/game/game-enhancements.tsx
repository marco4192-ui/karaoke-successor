'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';

// Performance stats display
export function PerformanceDisplay() {
  const { profiles, activeProfileId } = useGameStore();
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const { t } = useTranslation();
  
  // Avoid hydration mismatch - only show content after mount
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="pt-4 text-center text-white/40">
          {t('gameEnhancements.loadingStats')}
        </CardContent>
      </Card>
    );
  }
  
  if (!activeProfile) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="pt-4 text-center text-white/60">
          {t('gameEnhancements.noCharacter')}
        </CardContent>
      </Card>
    );
  }
  
  const totalGames = activeProfile.gamesPlayed;
  const avgAccuracy = totalGames > 0
    ? Math.round(activeProfile.stats.totalNotesHit / (activeProfile.stats.totalNotesHit + activeProfile.stats.totalNotesMissed || 1) * 100)
    : 0;
  
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: activeProfile.color }}
          >
            {activeProfile.name[0]}
          </div>
          {activeProfile.name}&apos;s Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-cyan-400">{activeProfile.totalScore.toLocaleString()}</p>
            <p className="text-sm text-white/60">{t('gameEnhancements.totalScore')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-400">{totalGames}</p>
            <p className="text-sm text-white/60">{t('gameEnhancements.gamesPlayed')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{avgAccuracy}%</p>
            <p className="text-sm text-white/60">{t('gameEnhancements.avgAccuracy')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">{activeProfile.stats.bestCombo}</p>
            <p className="text-sm text-white/60">{t('gameEnhancements.bestCombo')}</p>
          </div>
        </div>
        
        {activeProfile.achievements.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-white/60 mb-2">{t('gameEnhancements.recentAchievements')}</p>
            <div className="flex flex-wrap gap-2">
              {activeProfile.achievements.slice(0, 5).map(a => (
                <Badge key={a.id} variant="outline" className="border-yellow-500/50 text-yellow-400">
                  {a.icon} {a.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
