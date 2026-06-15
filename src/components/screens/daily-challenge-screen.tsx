'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StorageKeys, setJson, setItem } from '@/lib/storage';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';
import { getAllSongs } from '@/lib/game/song-library';
import { 
  getDailyChallenge, 
  getPlayerDailyStats, 
  getXPLevel, 
  getTimeUntilReset, 
  isChallengeCompletedToday,
  XP_REWARDS,
  DAILY_BADGES,
  getPlayerBestResult,
  getTargetForLevel,
  getWeeklyChallenge,
  isWeeklyChallengeCompletedToday,
  getTimeUntilWeeklyReset,
  WEEKLY_XP_REWARD,
  getActiveQuests,
  claimQuestReward,
} from '@/lib/game/daily-challenge';
import { 
  CHALLENGE_MODES, 
  getChallengeRequirementStatus,
  createCustomChallenge,
  AVAILABLE_MODIFIERS,
  type CustomChallengeConfig,
} from '@/lib/game/player-progression';
import { getExtendedStats } from '@/lib/game/player-progression';
import { Song } from '@/types/game';
import { MicIcon } from '@/components/icons';
import { shuffleArray } from '@/lib/utils';

// ===================== DAILY CHALLENGE SCREEN =====================
export function DailyChallengeScreen({ onPlayChallenge }: { onPlayChallenge: (_song: Song) => void }) {
  const { t } = useTranslation();
  const { profiles, activeProfileId, setActiveProfile } = useGameStore();
  const [activeTab, setActiveTab] = useState<'challenge' | 'weekly' | 'modes' | 'leaderboard' | 'badges'>('challenge');
  const [gameMode, setGameMode] = useState<'single' | 'duel' | 'coop'>('single');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(activeProfileId ? [activeProfileId] : []);
  
  // Three song choices for daily challenge
  const [songChoices, setSongChoices] = useState<Song[]>([]);
  
  // Challenge Mixer state
  const [mixerSelected, setMixerSelected] = useState<string[]>([]);
  
  // Selected challenge mode (for song selection after picking a mode)
  const [selectedMode, setSelectedMode] = useState<typeof CHALLENGE_MODES[0] | null>(null);
  
  // Song choices for selected challenge mode
  const [modeSongChoices, setModeSongChoices] = useState<Song[]>([]);
  
  // Get active profile - use profile XP/level for character-based progression
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const profileXP = activeProfile?.xp || 0;
  const profileLevel = activeProfile?.level || 1;
  const levelInfo = getXPLevel(profileXP);
  
  // Check if already completed today
  const completedToday = isChallengeCompletedToday();
  
  // Get challenge and stats from new system (with level scaling)
  const challenge = getDailyChallenge(profileLevel);
  const playerStats = getPlayerDailyStats();
  const timeLeft = getTimeUntilReset();
  
  // Generate song choices when challenge is not completed
  useEffect(() => {
    const songs = getAllSongs();
    setSongChoices(shuffleArray(songs).slice(0, 3));
  }, [completedToday]);
  
  // Challenge descriptions
  const challengeDescriptions: Record<string, string> = {
    score: t('dailyChallengeScreen.challengeScore').replace('{n}', challenge.target.toLocaleString()),
    accuracy: t('dailyChallengeScreen.challengeAccuracy').replace('{n}', challenge.target.toString()),
    combo: t('dailyChallengeScreen.challengeCombo').replace('{n}', challenge.target.toString()),
    perfect_notes: t('dailyChallengeScreen.challengePerfect').replace('{n}', challenge.target.toString()),
  };
  
  // Sort leaderboard by the challenge-type-specific metric, not by raw score.
  const sortMetric = (entry: typeof challenge.entries[0]): number => {
    switch (challenge.type) {
      case 'accuracy': return entry.accuracy;
      case 'combo': return entry.combo;
      case 'perfect_notes': return entry.perfectNotesCount;
      default: return entry.score;
    }
  };
  const sortedLeaderboard = [...challenge.entries].sort((a, b) => {
    const metricA = sortMetric(a);
    const metricB = sortMetric(b);
    if (metricB !== metricA) return metricB - metricA;
    return a.playerId.localeCompare(b.playerId);
  });
  
  // Handler: play a specific song for daily challenge
  const handlePlaySong = useCallback((song: Song) => {
    if (gameMode === 'single' && selectedPlayerIds[0]) {
      setActiveProfile(selectedPlayerIds[0]);
    }
    setJson(StorageKeys.DAILY_CHALLENGE_ACTIVE, { active: true, startedAt: Date.now(), gameMode });
    onPlayChallenge(song);
  }, [gameMode, selectedPlayerIds, setActiveProfile, onPlayChallenge]);
  
  // Handler: play a specific song with a selected challenge mode
  const handlePlayModeSong = useCallback((song: Song) => {
    if (selectedMode) {
      setItem(StorageKeys.CHALLENGE_MODE, selectedMode.id);
    }
    onPlayChallenge(song);
  }, [selectedMode, onPlayChallenge]);
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">{t('dailyChallengeScreen.title')}</h1>
        <p className="text-white/60">{t('dailyChallengeScreen.description')}</p>
        {activeProfile && (
          <p className="text-sm text-cyan-400 mt-1">{t('dailyChallengeScreen.playingAs').replace('{n}', activeProfile.name)}</p>
        )}
      </div>
      
      {/* Profile Selector */}
      {profiles.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap justify-center">
          {profiles.filter(p => p.isActive !== false).map((profile) => (
            <button
              key={profile.id}
              onClick={() => setActiveProfile(profile.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-sm ${
                activeProfileId === profile.id 
                  ? 'bg-cyan-500 text-white ring-2 ring-cyan-400' 
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: profile.color }}>
                {profile.avatar ? <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" /> : profile.name?.[0] || '?'}
              </div>
              <span>{profile.name}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Level & XP Progress - Character Based */}
      <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-purple-400">Lv.{profileLevel}</div>
              <div>
                <div className="text-sm font-medium">{levelInfo.title}</div>
                <div className="text-xs text-white/60">{profileXP.toLocaleString()} XP</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/60">{t('dailyChallengeScreen.nextLevel')}</div>
              <div className="text-sm font-medium">{levelInfo.nextLevel.toLocaleString()} XP</div>
            </div>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${levelInfo.progress}%` }}
            />
          </div>
          
          {/* Weekly Progress Calendar */}
          {playerStats.weeklyProgress && playerStats.weeklyProgress.length === 7 && (
            <div className="mt-4">
              <div className="flex justify-between gap-1">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, idx) => (
                  <div key={day} className="text-center">
                    <div className="text-xs text-white/40 mb-1">{day}</div>
                    <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs ${
                      playerStats.weeklyProgress[idx] ? 'bg-green-500 text-white' : 'bg-white/10 text-white/30'
                    }`}>
                      {playerStats.weeklyProgress[idx] ? '✓' : '·'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Streak & Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-orange-500/30">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl mb-1">🔥</div>
            <div className="text-2xl font-bold text-orange-400">{playerStats.currentStreak}</div>
            <div className="text-xs text-white/60">{t('dailyChallengeScreen.dayStreak')}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl mb-1">🏆</div>
            <div className="text-2xl font-bold text-amber-400">{playerStats.longestStreak}</div>
            <div className="text-xs text-white/60">{t('dailyChallengeScreen.bestStreak')}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl mb-1">✅</div>
            <div className="text-2xl font-bold text-green-400">{playerStats.totalCompleted}</div>
            <div className="text-xs text-white/60">{t('dailyChallengeScreen.completed')}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={activeTab === 'challenge' ? 'default' : 'outline'}
          onClick={() => setActiveTab('challenge')}
          className={activeTab === 'challenge' ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'border-white/20'}
        >
          {t('dailyChallengeScreen.challenges')}
        </Button>
        <Button
          variant={activeTab === 'weekly' ? 'default' : 'outline'}
          onClick={() => setActiveTab('weekly')}
          className={activeTab === 'weekly' ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'border-white/20'}
        >
          {t('dailyChallengeScreen.weeklyChallenge')}
        </Button>
        <Button
          variant={activeTab === 'modes' ? 'default' : 'outline'}
          onClick={() => { setActiveTab('modes'); setSelectedMode(null); }}
          className={activeTab === 'modes' ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'border-white/20'}
        >
          {t('dailyChallengeScreen.challengeModes')}
        </Button>
        <Button
          variant={activeTab === 'leaderboard' ? 'default' : 'outline'}
          onClick={() => setActiveTab('leaderboard')}
          className={activeTab === 'leaderboard' ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'border-white/20'}
        >
          {t('dailyChallengeScreen.leaderboard')}
        </Button>
        <Button
          variant={activeTab === 'badges' ? 'default' : 'outline'}
          onClick={() => setActiveTab('badges')}
          className={activeTab === 'badges' ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'border-white/20'}
        >
          {t('dailyChallengeScreen.badges')}
        </Button>
      </div>
      
      {/* Challenge Tab */}
      {activeTab === 'challenge' && (
        <Card className={`bg-white/5 border-white/10 ${completedToday ? 'ring-2 ring-green-500' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{completedToday ? t('dailyChallengeScreen.challengeComplete') : t('dailyChallengeScreen.todayChallenge')}</span>
              <Badge variant="outline" className="border-cyan-500 text-cyan-400">
                +{XP_REWARDS.CHALLENGE_COMPLETE} XP
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-2">{challengeDescriptions[challenge.type] || t('dailyChallengeScreen.completeChallenge')}</p>
            
            {/* Dynamic Difficulty Indicator */}
            {profileLevel > 1 && (
              <div className="text-xs text-purple-400/60 mb-4">
                {t('dailyChallengeScreen.dynamicDifficulty').replace('{n}', getTargetForLevel(challenge.target, 1).toString()).replace('{m}', challenge.target.toString())}
              </div>
            )}
            
            <div className="mb-4 p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-white/60">{t('dailyChallengeScreen.target')}</span>
                <span className="font-medium">{challenge.target.toLocaleString()}</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${completedToday ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`}
                  style={{ width: completedToday ? '100%' : '0%' }}
                />
              </div>
            </div>
            
            {/* Best Result (when not completed) */}
            {!completedToday && activeProfileId && (() => {
              const best = getPlayerBestResult(activeProfileId);
              if (!best) return null;
              const metricLabels: Record<string, string> = {
                score: t('dailyChallengeScreen.points'),
                accuracy: '%',
                combo: 'Combo',
                perfect_notes: '',
              };
              const currentMetric = challenge.type === 'score' ? best.score 
                : challenge.type === 'accuracy' ? best.accuracy 
                : challenge.type === 'combo' ? best.combo 
                : best.perfectNotes;
              const target = challenge.target;
              const pct = Math.min(100, Math.round((currentMetric / target) * 100));
              const suffix = metricLabels[challenge.type] || '';
              
              return (
                <div className="mb-4 p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-white/60">{t('dailyChallengeScreen.bestResult')}</span>
                    <span className="font-medium text-cyan-400">{currentMetric}{suffix} / {target}{suffix}</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-white/40 mt-1">{pct}% — {pct >= 100 ? t('dailyChallengeScreen.challengeComplete') : `${target - currentMetric} more to go!`}</div>
                </div>
              );
            })()}
            
            {/* Game Mode Selection */}
            {!completedToday && (
              <div className="mb-4">
                <label className="text-sm text-white/60 mb-2 block">{t('dailyChallengeScreen.gameMode')}</label>
                <div className="flex gap-2">
                  <Button
                    variant={gameMode === 'single' ? 'default' : 'outline'}
                    onClick={() => setGameMode('single')}
                    className={gameMode === 'single' ? 'bg-cyan-500' : 'border-white/20'}
                  >
                    <MicIcon className="w-4 h-4 mr-2" /> {t('dailyChallengeScreen.single')}
                  </Button>
                  <Button
                    variant={gameMode === 'duel' ? 'default' : 'outline'}
                    onClick={() => setGameMode('duel')}
                    className={gameMode === 'duel' ? 'bg-purple-500' : 'border-white/20'}
                  >
                    {t('dailyChallengeScreen.duel')}
                  </Button>
                  <Button
                    variant={gameMode === 'coop' ? 'default' : 'outline'}
                    onClick={() => setGameMode('coop')}
                    className={gameMode === 'coop' ? 'bg-green-500' : 'border-white/20'}
                  >
                    {t('dailyChallengeScreen.coop')}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Player Selection for Duel Mode */}
            {!completedToday && gameMode === 'duel' && (
              <div className="mb-4">
                <label className="text-sm text-white/60 mb-2 block">{t('dailyChallengeScreen.select2Players')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                  {profiles.filter(p => p.isActive !== false).map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => {
                        const newSelection = selectedPlayerIds.includes(profile.id)
                          ? selectedPlayerIds.filter(id => id !== profile.id)
                          : selectedPlayerIds.length < 2
                            ? [...selectedPlayerIds, profile.id]
                            : selectedPlayerIds;
                        setSelectedPlayerIds(newSelection);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                        selectedPlayerIds.includes(profile.id) 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: profile.color }}
                      >
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          profile.name?.[0] || '?'
                        )}
                      </div>
                      <span className="text-sm truncate">{profile.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Three Song Choices (replaces single Play Now button) */}
            {!completedToday && (
              <div className="mb-4">
                <label className="text-sm text-white/60 mb-2 block">{t('dailyChallengeScreen.selectSong')}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {songChoices.map((song, idx) => (
                    <Card key={song.id || idx} className="bg-white/5 border-white/10 hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.02]" onClick={() => handlePlaySong(song)}>
                      <CardContent className="pt-3 pb-3">
                        <div className="text-sm font-medium text-white truncate">{song.title}</div>
                        <div className="text-xs text-white/50 truncate">{song.artist}</div>
                        {song.duration && <div className="text-xs text-white/40 mt-1">{Math.round(song.duration / 60000)}:{String(Math.round((song.duration % 60000) / 1000)).padStart(2, '0')}</div>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/60">
                {t('dailyChallengeScreen.resetsIn')} {timeLeft.hours}h {timeLeft.minutes}m
              </div>
              {completedToday && (
                <div className="text-sm text-green-400">✓ {t('dailyChallengeScreen.challengeComplete')}</div>
              )}
            </div>
            
            {!completedToday && playerStats.currentStreak > 0 && (
              <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="text-sm text-orange-400">
                  {t('dailyChallengeScreen.streakBonus').replace('{n}', (XP_REWARDS.STREAK_BONUS_BASE * playerStats.currentStreak).toString()).replace('{m}', playerStats.currentStreak.toString())}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Weekly Challenge Tab */}
      {activeTab === 'weekly' && (() => {
        const weekly = getWeeklyChallenge(profileLevel);
        const weeklyCompleted = isWeeklyChallengeCompletedToday(activeProfileId || '');
        const weeklyReset = getTimeUntilWeeklyReset();
        return (
          <Card className={`bg-white/5 border-white/10 ${weeklyCompleted ? 'ring-2 ring-green-500' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{weeklyCompleted ? t('dailyChallengeScreen.challengeComplete') : t('dailyChallengeScreen.weeklyChallenge')}</span>
                <Badge variant="outline" className="border-cyan-500 text-cyan-400">+{WEEKLY_XP_REWARD} XP</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-4">{weekly.description}</p>
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>{t('dailyChallengeScreen.target')}: {weekly.target}</span>
                <span>{t('dailyChallengeScreen.resetsIn')} {weeklyReset.days}d {weeklyReset.hours}h</span>
              </div>
            </CardContent>
          </Card>
        );
      })()}
      
      {/* Challenge Modes Tab */}
      {activeTab === 'modes' && (
        <div className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>{t('dailyChallengeScreen.challengeModes')}</CardTitle>
              <CardDescription>{t('dailyChallengeScreen.specialModifiers')}</CardDescription>
            </CardHeader>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CHALLENGE_MODES.map((mode) => {
              // Check if the player meets the challenge requirements
              const extendedStats = getExtendedStats();
              const requirementStatus = getChallengeRequirementStatus(
                mode.id,
                profileLevel,
                extendedStats.songsCompleted,
                extendedStats.unlockedTitles,
                extendedStats.totalXP,
                t,
              );
              const locked = requirementStatus !== null;
              const isSelected = selectedMode?.id === mode.id;

              return (
                <Card 
                  key={mode.id}
                  className={`bg-white/5 border-white/10 transition-all relative ${
                    locked ? 'opacity-50 cursor-not-allowed' : 
                    isSelected ? 'ring-2 ring-cyan-500 cursor-pointer hover:bg-white/10' :
                    'cursor-pointer hover:bg-white/10'
                  } ${
                    mode.difficulty === 'extreme' ? 'border-red-500/30' :
                    mode.difficulty === 'hard' ? 'border-orange-500/30' :
                    mode.difficulty === 'medium' ? 'border-yellow-500/30' : 'border-green-500/30'
                  }`}
                  onClick={() => {
                    if (locked) return;
                    if (isSelected) {
                      // Deselect
                      setSelectedMode(null);
                      setModeSongChoices([]);
                    } else {
                      // Select mode and generate song choices
                      setSelectedMode(mode);
                      const songs = getAllSongs();
                      setModeSongChoices(shuffleArray(songs).slice(0, 3));
                    }
                  }}
                >
                  <CardContent className="pt-4 pb-4">
                    {locked && (
                      <div className="absolute top-2 right-2 text-lg" title={requirementStatus || ''}>🔒</div>
                    )}
                    <div className="text-3xl mb-2">{mode.icon}</div>
                    <h4 className="font-bold text-white mb-1">{t(`challenges.${mode.id}.name`)}</h4>
                    <p className="text-xs text-white/60 mb-3 line-clamp-2">{t(`challenges.${mode.id}.description`)}</p>
                    {locked && requirementStatus && (
                      <p className="text-xs text-red-400 mb-2">{requirementStatus}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`text-xs ${
                        mode.difficulty === 'extreme' ? 'border-red-500 text-red-400' :
                        mode.difficulty === 'hard' ? 'border-orange-500 text-orange-400' :
                        mode.difficulty === 'medium' ? 'border-yellow-500 text-yellow-400' : 'border-green-500 text-green-400'
                      }`}>
                        {mode.difficulty.toUpperCase()}
                      </Badge>
                      <span className="text-cyan-400 font-bold text-sm">+{mode.xpReward} XP</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {/* Song selection when a mode is selected */}
          {selectedMode && modeSongChoices.length > 0 && (
            <div className="mb-4">
              <label className="text-sm text-white/60 mb-2 block">
                {selectedMode.icon} {t(`challenges.${selectedMode.id}.name`)} — {t('dailyChallengeScreen.selectSong')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {modeSongChoices.map((song, idx) => (
                  <Card key={song.id || idx} className="bg-white/5 border-white/10 hover:border-cyan-500/50 cursor-pointer transition-all hover:scale-[1.02]" onClick={() => handlePlayModeSong(song)}>
                    <CardContent className="pt-3 pb-3">
                      <div className="text-sm font-medium text-white truncate">{song.title}</div>
                      <div className="text-xs text-white/50 truncate">{song.artist}</div>
                      {song.duration && <div className="text-xs text-white/40 mt-1">{Math.round(song.duration / 60000)}:{String(Math.round((song.duration % 60000) / 1000)).padStart(2, '0')}</div>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {/* Challenge Mixer */}
          <Card className="bg-white/5 border-white/10 mt-6">
            <CardHeader>
              <CardTitle>{t('dailyChallengeScreen.challengeMixer')}</CardTitle>
              <CardDescription>{t('dailyChallengeScreen.challengeMixerDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {AVAILABLE_MODIFIERS.map((mod) => (
                  <button
                    key={mod.type}
                    onClick={() => setMixerSelected(prev => prev.includes(mod.type) ? prev.filter(t => t !== mod.type) : [...prev, mod.type])}
                    className={`p-2 rounded-lg text-left text-xs transition-all ${
                      mixerSelected.includes(mod.type) ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300' : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-medium">{mod.label}</div>
                    <div className="text-white/40">{mod.difficulty}</div>
                  </button>
                ))}
              </div>
              {mixerSelected.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white/60">
                    {mixerSelected.length} modifier{mixerSelected.length > 1 ? 's' : ''} — {mixerSelected.length >= 3 ? 'EXTREME' : mixerSelected.length >= 2 ? 'HARD' : 'MEDIUM'}
                  </div>
                  <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-purple-500" onClick={() => {
                    const customChallenge = createCustomChallenge({
                      name: 'Custom Mix',
                      modifiers: AVAILABLE_MODIFIERS.filter(m => mixerSelected.includes(m.type)).map(m => ({
                        type: m.type,
                        description: m.description,
                        value: m.defaultValue,
                      })),
                      difficulty: mixerSelected.length >= 3 ? 'extreme' : mixerSelected.length >= 2 ? 'hard' : 'medium',
                    });
                    setItem(StorageKeys.CHALLENGE_MODE, customChallenge.id);
                    onPlayChallenge(songChoices[0] || getAllSongs()[0]);
                  }}>
                    {t('dailyChallengeScreen.playNow')} (+{Math.round((150 + mixerSelected.length * 50) * (mixerSelected.length >= 3 ? 3 : mixerSelected.length >= 2 ? 2 : 1.5))} XP)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>{t('dailyChallengeScreen.todayLeaderboard')}</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedLeaderboard.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <div className="text-4xl mb-2">🎯</div>
                <p>{t('dailyChallengeScreen.noLeaderboardEntries')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedLeaderboard.slice(0, 10).map((entry, idx) => (
                  <div 
                    key={entry.playerId}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      idx === 0 ? 'bg-amber-500/20 border border-amber-500/30' :
                      idx === 1 ? 'bg-gray-400/20 border border-gray-400/30' :
                      idx === 2 ? 'bg-orange-700/20 border border-orange-700/30' :
                      'bg-white/5'
                    }`}
                  >
                    <div className="text-xl font-bold w-8">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </div>
                    {entry.playerAvatar ? (
                      <img src={entry.playerAvatar} alt={entry.playerName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: entry.playerColor }}
                      >
                        {entry.playerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{entry.playerName}</div>
                      <div className="text-xs text-white/60">
                        {t('dailyChallengeScreen.accuracyMaxCombo').replace('{n}', entry.combo.toString())}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {challenge.type === 'score' ? entry.score.toLocaleString() :
                         challenge.type === 'accuracy' ? `${entry.accuracy}%` :
                         challenge.type === 'combo' ? entry.combo.toString() :
                         entry.perfectNotesCount.toString()}
                      </div>
                      <div className="text-xs text-white/40">
                        {challenge.type === 'score' ? t('dailyChallengeScreen.points') :
                         challenge.type === 'accuracy' ? 'Accuracy' :
                         challenge.type === 'combo' ? 'Max Combo' :
                         'Perfect Notes'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 text-center text-sm text-white/40">
              {challenge.totalParticipants} {challenge.totalParticipants !== 1 ? t('dailyChallengeScreen.participants') : t('dailyChallengeScreen.participant')} {t('dailyChallengeScreen.dayStreak').toLowerCase()}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>{t('dailyChallengeScreen.yourBadges')} ({playerStats.badges.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {playerStats.badges.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <div className="text-4xl mb-2">🎖️</div>
                <p>{t('dailyChallengeScreen.completeForBadges')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {playerStats.badges.map((badge) => (
                  <div 
                    key={badge.id}
                    className="p-4 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg text-center"
                  >
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <div className="font-medium text-amber-400">{t(`dailyBadges.${badge.id}.name`)}</div>
                    <div className="text-xs text-white/60 mt-1">{t(`dailyBadges.${badge.id}.description`)}</div>
                    <div className="text-xs text-white/40 mt-2">
                      {new Date(badge.unlockedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6">
              <h4 className="text-sm font-medium text-white/60 mb-3">{t('dailyChallengeScreen.availableBadges')}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 opacity-50">
                {Object.values(DAILY_BADGES)
                  .filter(b => !playerStats.badges.some(pb => pb.id === b.id))
                  .slice(0, 6)
                  .map((badge) => (
                    <div 
                      key={badge.id}
                      className="p-4 bg-white/5 border border-white/10 rounded-lg text-center grayscale"
                    >
                      <div className="text-3xl mb-2">{badge.icon}</div>
                      <div className="font-medium">{t(`dailyBadges.${badge.id}.name`)}</div>
                      <div className="text-xs text-white/60 mt-1">{t(`dailyBadges.${badge.id}.description`)}</div>
                    </div>
                  ))}
              </div>
            </div>
            
            {/* Quests */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-white/60 mb-3">{t('dailyChallengeScreen.quests')}</h4>
              <div className="space-y-2">
                {getActiveQuests().map((quest) => {
                  const pct = Math.min(100, Math.round((quest.currentProgress / quest.target) * 100));
                  return (
                    <div key={quest.id} className={`p-3 rounded-lg ${quest.completed ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5 border border-white/10'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span>{quest.icon}</span>
                          <span className="font-medium text-sm">{t(`dailyQuests.${quest.id}.name`)}</span>
                        </div>
                        <span className="text-xs text-cyan-400">+{quest.reward.xp} XP</span>
                      </div>
                      <div className="text-xs text-white/50 mb-2">{t(`dailyQuests.${quest.id}.description`)}</div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${quest.completed ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-white/40 mt-1">{quest.currentProgress}/{quest.target}</div>
                      {quest.completed && !quest.claimedAt && (
                        <Button size="sm" className="mt-2 bg-green-500 hover:bg-green-600" onClick={() => claimQuestReward(quest.id)}>
                          {t('dailyChallengeScreen.claimReward')}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
