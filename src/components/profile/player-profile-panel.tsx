'use client';

/**
 * DEAD CODE (Code Review #5, 2026-04-17)
 *
 * This file is not imported by any other file in the project.
 *
 * Possible function: Player profile panel with XP/rank display, statistics
 * summary, and recent activity. Designed as a sidebar or overlay panel for
 * quick profile access during gameplay or party mode.
 *
 * Currently, player profiles are displayed in character-screen.tsx and
 * its sub-components. The player-progression-card.tsx shows XP and level
 * progression. There's no dedicated "profile panel" for quick access.
 *
 * This component could serve as a lightweight profile popup accessible from
 * the game screen or navbar without navigating to the full character screen.
 *
 * Consider: Useful as a quick-access profile overlay in the game screen
 * or party mode lobby.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RANKS,
  TITLES,
  getTitleById,
  getRarityColor,
  getLevelForXP,
  CHALLENGE_MODES,
  getDefaultStats,
  type ExtendedPlayerStats,
} from '@/lib/game/player-progression';

interface PlayerProfilePanelProps {
  onClose?: () => void;
}

export function PlayerProfilePanel({ onClose }: PlayerProfilePanelProps) {
  const [stats] = useState<ExtendedPlayerStats>(() => getDefaultStats());
  const [selectedTab, setSelectedTab] = useState('overview');

  const levelInfo = useMemo(() => {
    return getLevelForXP(stats.totalXP);
  }, [stats.totalXP]);

  const currentTitle = useMemo(() => {
    if (!stats.selectedTitle) return null;
    return getTitleById(stats.selectedTitle);
  }, [stats.selectedTitle]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card className="bg-white/5 border-white/10 max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <span className="text-4xl">{stats.currentRank.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span style={{ color: stats.currentRank.color }}>{stats.currentRank.name}</span>
                  {currentTitle && (
                    <Badge 
                      style={{ backgroundColor: getRarityColor(currentTitle.rarity) + '30', borderColor: getRarityColor(currentTitle.rarity) }}
                    >
                      {currentTitle.icon} {currentTitle.name}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-white/60 font-normal">
                  Level {levelInfo.level} • {formatNumber(stats.totalXP)} XP
                </div>
              </div>
            </CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" onClick={onClose} className="text-white/60">✕</Button>
          )}
        </div>
        
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs text-white/60">
            <span>Level {levelInfo.level}</span>
            <span>{formatNumber(levelInfo.currentXP)} / {formatNumber(levelInfo.nextLevelXP)} XP</span>
            <span>Level {levelInfo.level + 1}</span>
          </div>
          <Progress value={levelInfo.progress} className="h-3" />
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4 bg-white/5">
            <TabsTrigger value="overview">📊 Overview</TabsTrigger>
            <TabsTrigger value="titles">🏆 Titles</TabsTrigger>
            <TabsTrigger value="challenges">⚔️ Challenges</TabsTrigger>
            <TabsTrigger value="stats">📈 Stats</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon="🎤" label="Songs Sung" value={formatNumber(stats.totalSessions)} />
              <StatCard icon="⏱️" label="Total Time" value={formatTime(stats.totalPlayTime)} />
              <StatCard icon="🎯" label="Avg Accuracy" value={`${stats.averageAccuracy.toFixed(1)}%`} />
              <StatCard icon="🔥" label="Best Streak" value={`${stats.longestDailyStreak} days`} />
            </div>
            
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">📅 Daily Challenge Streak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold" style={{ color: stats.currentRank.color }}>
                    {stats.currentDailyStreak}
                  </div>
                  <div>
                    <div className="text-white/60 text-sm">Current Streak</div>
                    <div className="text-xs text-white/40">Best: {stats.longestDailyStreak} days</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="titles" className="space-y-4 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-white/60 text-sm">Equipped:</span>
              {currentTitle ? (
                <Badge style={{ backgroundColor: getRarityColor(currentTitle.rarity) + '30', borderColor: getRarityColor(currentTitle.rarity) }}>
                  {currentTitle.icon} {currentTitle.name}
                </Badge>
              ) : (
                <span className="text-white/40 text-sm">None</span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {TITLES.map((title) => {
                const isUnlocked = stats.unlockedTitles.includes(title.id);
                
                return (
                  <div
                    key={title.id}
                    className={`p-3 rounded-lg ${isUnlocked ? 'bg-white/5 border border-white/10' : 'bg-white/5 opacity-50'}`}
                    style={{ borderColor: isUnlocked ? getRarityColor(title.rarity) : undefined }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xl ${isUnlocked ? '' : 'grayscale'}`}>{title.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium text-sm" style={{ color: isUnlocked ? getRarityColor(title.rarity) : '#666' }}>
                          {isUnlocked ? title.name : '???'}
                        </div>
                        <div className="text-xs text-white/40">
                          {isUnlocked ? title.description : title.unlockCondition}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="challenges" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard icon="⚔️" label="Completed" value={stats.challengesCompleted} />
              <StatCard icon="🏆" label="Wins" value={stats.challengesWon} />
              <StatCard icon="🥇" label="Top 3" value={stats.topThreeFinishes} />
              <StatCard icon="💎" label="Perfect" value={stats.perfectChallenges} />
            </div>
            
            <CardTitle className="text-lg mb-2">Challenge Modes</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {CHALLENGE_MODES.map((mode) => (
                <div
                  key={mode.id}
                  className="p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{mode.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{mode.name}</div>
                      <div className="text-xs text-white/60">{mode.description}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">+{mode.xpReward} XP</Badge>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="stats" className="space-y-4 mt-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">🎯 Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatItem label="Highest Score" value={formatNumber(stats.highestScore)} />
                  <StatItem label="Average Score" value={formatNumber(Math.round(stats.averageScore))} />
                  <StatItem label="Perfect Notes" value={formatNumber(stats.totalPerfectNotes)} />
                  <StatItem label="Golden Notes" value={formatNumber(stats.totalGoldenNotesHit)} />
                  <StatItem label="Avg Accuracy" value={`${stats.averageAccuracy.toFixed(1)}%`} />
                  <StatItem label="Total Games" value={formatNumber(stats.totalSessions)} />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">🏁 Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(stats.milestones).map(([key, value]) => (
                    <div
                      key={key}
                      className={`p-2 rounded-lg text-center ${value ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/30'}`}
                    >
                      <div className="text-lg mb-1">
                        {key === 'firstSong' ? '🎤' : key === 'firstPerfect' ? '💎' : key === 'firstGolden' ? '⭐' : key.includes('level') ? '📊' : '🎯'}
                      </div>
                      <div className="text-xs">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      {value && <div className="text-xs mt-1 opacity-60">{new Date(value).toLocaleDateString()}</div>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/60">{label}</div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-white/60 text-xs">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}

export function RankBadge({ xp }: { xp: number }) {
  const { level } = getLevelForXP(xp);
  const rank = RANKS.find(r => xp >= r.minXP) || RANKS[0];
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl">{rank.icon}</span>
      <div>
        <div className="text-sm font-bold" style={{ color: rank.color }}>{rank.name}</div>
        <div className="text-xs text-white/60">Lv. {level}</div>
      </div>
    </div>
  );
}
