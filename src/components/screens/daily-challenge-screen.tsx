'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/game/store';
import {
  getDailyChallenge,
  getPlayerDailyStats,
  getXPLevel,
  getTimeUntilReset,
  isChallengeCompletedToday,
} from '@/lib/game/daily-challenge';
import { Song } from '@/types/game';
import {
  ChallengeProgressCard,
  DailyStatsRow,
  DailyChallengeTab,
  ChallengeModesTab,
  DailyLeaderboardTab,
  DailyBadgesTab,
} from '@/components/daily-challenge';

// ===================== DAILY CHALLENGE SCREEN =====================
export function DailyChallengeScreen({
  onPlayChallenge,
  onSelectSong,
}: {
  onPlayChallenge: (song: Song) => void;
  onSelectSong: (song: Song) => void;
}) {
  const { profiles, activeProfileId } = useGameStore();
  const [activeTab, setActiveTab] = useState<'challenge' | 'modes' | 'leaderboard' | 'badges'>('challenge');

  // Get challenge and stats from system
  const challenge = getDailyChallenge();
  const playerStats = getPlayerDailyStats();
  const timeLeft = getTimeUntilReset();

  // Get active profile - use profile XP/level for character-based progression
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const profileXP = activeProfile?.xp || 0;
  const profileLevel = activeProfile?.level || 1;
  const levelInfo = getXPLevel(profileXP);

  // Check if already completed today
  const completedToday = isChallengeCompletedToday();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">⭐ Daily Challenge</h1>
        <p className="text-white/60">Complete daily challenges to earn XP and build your streak!</p>
        {activeProfile && <p className="text-sm text-cyan-400 mt-1">Playing as: {activeProfile.name}</p>}
      </div>

      {/* Level & XP Progress - Character Based */}
      <ChallengeProgressCard
        profileLevel={profileLevel}
        profileXP={profileXP}
        levelInfo={levelInfo}
      />

      {/* Streak & Stats Row */}
      <DailyStatsRow
        currentStreak={playerStats.currentStreak}
        longestStreak={playerStats.longestStreak}
        totalCompleted={playerStats.totalCompleted}
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={activeTab === 'challenge' ? 'default' : 'outline'}
          onClick={() => setActiveTab('challenge')}
          className={activeTab === 'challenge' ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'border-white/20'}
        >
          🎯 Challenges
        </Button>
        <Button
          variant={activeTab === 'modes' ? 'default' : 'outline'}
          onClick={() => setActiveTab('modes')}
          className={activeTab === 'modes' ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'border-white/20'}
        >
          🎮 Challenge Modes
        </Button>
        <Button
          variant={activeTab === 'leaderboard' ? 'default' : 'outline'}
          onClick={() => setActiveTab('leaderboard')}
          className={activeTab === 'leaderboard' ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'border-white/20'}
        >
          🏆 Leaderboard
        </Button>
        <Button
          variant={activeTab === 'badges' ? 'default' : 'outline'}
          onClick={() => setActiveTab('badges')}
          className={activeTab === 'badges' ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'border-white/20'}
        >
          🎖️ Badges
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'challenge' && (
        <DailyChallengeTab
          challenge={challenge}
          completedToday={completedToday}
          timeLeft={timeLeft}
          currentStreak={playerStats.currentStreak}
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSelectSong={onSelectSong}
        />
      )}

      {activeTab === 'modes' && <ChallengeModesTab onPlayChallenge={onPlayChallenge} />}

      {activeTab === 'leaderboard' && (
        <DailyLeaderboardTab
          entries={challenge.entries}
          totalParticipants={challenge.totalParticipants}
        />
      )}

      {activeTab === 'badges' && <DailyBadgesTab playerBadges={playerStats.badges} />}
    </div>
  );
}
