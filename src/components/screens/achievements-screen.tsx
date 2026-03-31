'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameStore } from '@/lib/game/store';
import { ACHIEVEMENT_DEFINITIONS, getRarityColor } from '@/lib/game/achievements';

export function AchievementsScreen() {
  const { profiles, activeProfileId } = useGameStore();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  
  const unlockedIds = new Set(activeProfile?.achievements.map(a => a.id) || []);
  
  const filteredAchievements = ACHIEVEMENT_DEFINITIONS.filter(a => {
    if (filter === 'unlocked' && !unlockedIds.has(a.id)) return false;
    if (filter === 'locked' && unlockedIds.has(a.id)) return false;
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    return true;
  });
  
  const unlockedCount = ACHIEVEMENT_DEFINITIONS.filter(a => unlockedIds.has(a.id)).length;
  const totalXP = ACHIEVEMENT_DEFINITIONS
    .filter(a => unlockedIds.has(a.id))
    .reduce((sum, a) => sum + (a.reward?.xp || 0), 0);
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🏆 Achievements</h1>
        <p className="text-white/60">Unlock achievements by playing!</p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-400">{unlockedCount}/{ACHIEVEMENT_DEFINITIONS.length}</div>
            <div className="text-sm text-white/60">Unlocked</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-cyan-400">{totalXP}</div>
            <div className="text-sm text-white/60">XP Earned</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-400">{Math.round(unlockedCount / ACHIEVEMENT_DEFINITIONS.length * 100)}%</div>
            <div className="text-sm text-white/60">Completion</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-cyan-500' : 'border-white/20 text-white'}>
          All
        </Button>
        <Button variant={filter === 'unlocked' ? 'default' : 'outline'} onClick={() => setFilter('unlocked')}
          className={filter === 'unlocked' ? 'bg-green-500' : 'border-white/20 text-white'}>
          Unlocked
        </Button>
        <Button variant={filter === 'locked' ? 'default' : 'outline'} onClick={() => setFilter('locked')}
          className={filter === 'locked' ? 'bg-red-500' : 'border-white/20 text-white'}>
          Locked
        </Button>
        <span className="border-l border-white/20 mx-2" />
        {['all', 'performance', 'progression', 'social', 'special'].map(cat => (
          <Button key={cat} variant={categoryFilter === cat ? 'default' : 'outline'} 
            onClick={() => setCategoryFilter(cat)}
            className={categoryFilter === cat ? 'bg-purple-500' : 'border-white/20 text-white text-xs'}>
            {cat === 'all' ? 'All' : cat}
          </Button>
        ))}
      </div>
      
      {/* Achievement Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredAchievements.map(achievement => {
          const isUnlocked = unlockedIds.has(achievement.id);
          const rarityColor = getRarityColor(achievement.rarity);
          
          return (
            <Card key={achievement.id} className={`bg-white/5 border-white/10 ${isUnlocked ? 'ring-2 ring-yellow-500/50' : 'opacity-60'}`}>
              <CardContent className="pt-4">
                <div className="text-center mb-2">
                  <span className="text-3xl" style={{ filter: isUnlocked ? 'none' : 'grayscale(100%)' }}>
                    {achievement.icon}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-center" style={{ color: isUnlocked ? rarityColor : 'inherit' }}>
                  {achievement.name}
                </h3>
                <p className="text-xs text-white/60 text-center mt-1">{achievement.description}</p>
                {isUnlocked && achievement.reward && (
                  <div className="mt-2 text-center text-xs text-yellow-400">
                    +{achievement.reward.xp} XP
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
