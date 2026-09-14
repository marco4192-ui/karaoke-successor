'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';
import { ACHIEVEMENT_DEFINITIONS, getRarityColor } from '@/lib/game/achievements';
import { getXPLevel } from '@/lib/game/daily-challenge';

export function AchievementsScreen() {
  const { t } = useTranslation();
  const { profiles, activeProfileId } = useGameStore();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Player selector: view any player's achievements (defaults to the active profile)
  const [viewPlayerId, setViewPlayerId] = useState<string | null>(activeProfileId);
  const activeProfiles = useMemo(() => profiles.filter(p => p.isActive !== false), [profiles]);
  const viewProfile = profiles.find(p => p.id === (viewPlayerId ?? activeProfileId)) || activeProfiles[0];
  const isOwnProfile = viewProfile?.id === activeProfileId;

  const unlockedIds = new Set(viewProfile?.achievements.map(a => a.id) || []);

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

  const levelInfo = viewProfile ? getXPLevel(viewProfile.xp || 0) : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('achievementsScreen.title')}</h1>
        <p className="text-white/60">{t('achievementsScreen.description')}</p>
      </div>

      {/* Player selector — every player earns and keeps their own achievements */}
      {activeProfiles.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap" role="tablist" aria-label={t('achievementsScreen.viewPlayer')}>
          <span className="text-sm text-white/50 mr-1">{t('achievementsScreen.viewPlayer')}:</span>
          {activeProfiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => setViewPlayerId(profile.id)}
              aria-pressed={viewProfile?.id === profile.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-sm ${
                viewProfile?.id === profile.id
                  ? 'bg-purple-500 text-white ring-2 ring-purple-400'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: profile.color }}>
                {profile.avatar ? <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" /> : profile.name?.[0] || '?'}
              </div>
              <span>{profile.name}</span>
              {/* Unlock badge count per player */}
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/30">
                {profile.achievements.length}
              </span>
            </button>
          ))}
        </div>
      )}

      {viewProfile && !isOwnProfile && (
        <p className="text-xs text-cyan-400/80 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2 mb-6 inline-block">
          {t('achievementsScreen.viewingOther').replace('{n}', viewProfile.name)}
        </p>
      )}

      {/* Stats — of the viewed player */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-400">{unlockedCount}/{ACHIEVEMENT_DEFINITIONS.length}</div>
            <div className="text-sm text-white/60">{t('achievementsScreen.unlocked')}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-cyan-400">{totalXP}</div>
            <div className="text-sm text-white/60">{t('achievementsScreen.xpEarned')}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-400">{Math.round(unlockedCount / ACHIEVEMENT_DEFINITIONS.length * 100)}%</div>
            <div className="text-sm text-white/60">{t('achievementsScreen.completion')}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-300">Lv.{viewProfile?.level || 1}</div>
            <div className="text-xs text-white/60 truncate">{levelInfo?.title || '—'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-cyan-500' : 'border-white/20 text-white'}>
          {t('achievementsScreen.all')}
        </Button>
        <Button variant={filter === 'unlocked' ? 'default' : 'outline'} onClick={() => setFilter('unlocked')}
          className={filter === 'unlocked' ? 'bg-green-500' : 'border-white/20 text-white'}>
          {t('achievements.unlocked')}
        </Button>
        <Button variant={filter === 'locked' ? 'default' : 'outline'} onClick={() => setFilter('locked')}
          className={filter === 'locked' ? 'bg-red-500' : 'border-white/20 text-white'}>
          {t('achievementsScreen.locked')}
        </Button>
        <span className="border-l border-white/20 mx-2" />
        {['all', 'performance', 'progression', 'social', 'special'].map(cat => (
          <Button key={cat} variant={categoryFilter === cat ? 'default' : 'outline'}
            onClick={() => setCategoryFilter(cat)}
            className={categoryFilter === cat ? 'bg-purple-500' : 'border-white/20 text-white text-xs'}>
            {cat === 'all' ? t('achievementsScreen.all') : t(`achievementsScreen.categories.${cat}`)}
          </Button>
        ))}
      </div>

      {/* Achievement Grid */}
      {filteredAchievements.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <div className="text-4xl mb-2">🔍</div>
          <p>{t('achievementsScreen.noMatches')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAchievements.map(achievement => {
            const isUnlocked = unlockedIds.has(achievement.id);
            const rarityColor = getRarityColor(achievement.rarity);

            return (
              <Card key={achievement.id} className={`bg-white/5 border-white/10 transition-all ${isUnlocked ? 'ring-2 ring-yellow-500/50 hover:ring-yellow-500/80' : 'opacity-60 hover:opacity-80'}`}>
                <CardContent className="pt-4">
                  <div className="text-center mb-2">
                    <span className="text-3xl" style={{ filter: isUnlocked ? 'none' : 'grayscale(100%)' }}>
                      {achievement.icon}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-center" style={{ color: isUnlocked ? rarityColor : 'inherit' }}>
                    {t(`achievements.${achievement.id}.name`)}
                  </h3>
                  <p className="text-xs text-white/60 text-center mt-1">{t(`achievements.${achievement.id}.description`)}</p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ color: rarityColor, backgroundColor: `${rarityColor}22` }}
                    >
                      {achievement.rarity}
                    </span>
                    {achievement.reward?.xp && (
                      <span className="text-xs text-yellow-400">
                        {isUnlocked ? t('achievementsScreen.plusXp').replace('{n}', achievement.reward.xp.toString()) : `+${achievement.reward.xp} XP`}
                      </span>
                    )}
                  </div>
                  {isUnlocked && viewProfile && (() => {
                    const unlocked = viewProfile.achievements.find(a => a.id === achievement.id);
                    return unlocked ? (
                      <div className="mt-2 text-center text-[10px] text-white/40">
                        {new Date(unlocked.unlockedAt).toLocaleDateString()}
                      </div>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
