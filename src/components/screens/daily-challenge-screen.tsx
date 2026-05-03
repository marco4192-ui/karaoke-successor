'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs } from '@/lib/game/song-library';
import { 
  getDailyChallenge, 
  getPlayerDailyStats, 
  getXPLevel, 
  getTimeUntilReset, 
  isChallengeCompletedToday,
  XP_REWARDS,
  DAILY_BADGES,
} from '@/lib/game/daily-challenge';
import { CHALLENGE_MODES, getChallengeRequirementStatus } from '@/lib/game/player-progression';
import { getExtendedStats } from '@/lib/game/player-progression';
import { Song } from '@/types/game';

// ===================== ICONS =====================
function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

// ===================== DAILY CHALLENGE SCREEN =====================
export function DailyChallengeScreen({ onPlayChallenge }: { onPlayChallenge: (song: Song) => void }) {
  const { profiles, activeProfileId, setActiveProfile } = useGameStore();
  const [activeTab, setActiveTab] = useState<'challenge' | 'modes' | 'leaderboard' | 'badges'>('challenge');
  const [gameMode, setGameMode] = useState<'single' | 'duel'>('single');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(activeProfileId ? [activeProfileId] : []);
  
  // Get challenge and stats from new system
  const challenge = getDailyChallenge();
  const playerStats = getPlayerDailyStats();
  const timeLeft = getTimeUntilReset();
  
  // Get active profile - use profile XP/level for character-based progression
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const profileXP = activeProfile?.xp || 0;
  const profileLevel = activeProfile?.level || 1;
  const levelInfo = getXPLevel(profileXP);
  
  // Challenge descriptions
  const challengeDescriptions: Record<string, string> = {
    score: `Score ${challenge.target.toLocaleString()}+ points in a single song`,
    accuracy: `Achieve ${challenge.target}%+ accuracy`,
    combo: `Get a ${challenge.target}+ note combo`,
    songs: `Complete ${challenge.target} songs today`,
    perfect_notes: `Hit ${challenge.target}+ perfect notes`,
  };
  
  // Check if already completed today
  const completedToday = isChallengeCompletedToday();
  
  // Sort leaderboard by score (with playerId tiebreaker for deterministic order)
  const sortedLeaderboard = [...challenge.entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.playerId.localeCompare(b.playerId);
  });
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">⭐ Daily Challenge</h1>
        <p className="text-white/60">Complete daily challenges to earn XP and build your streak!</p>
        {activeProfile && (
          <p className="text-sm text-cyan-400 mt-1">Playing as: {activeProfile.name}</p>
        )}
      </div>
      
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
              <div className="text-sm text-white/60">Next Level</div>
              <div className="text-sm font-medium">{levelInfo.nextLevel.toLocaleString()} XP</div>
            </div>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${levelInfo.progress}%` }}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Streak & Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-orange-500/30">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl mb-1">🔥</div>
            <div className="text-2xl font-bold text-orange-400">{playerStats.currentStreak}</div>
            <div className="text-xs text-white/60">Day Streak</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl mb-1">🏆</div>
            <div className="text-2xl font-bold text-amber-400">{playerStats.longestStreak}</div>
            <div className="text-xs text-white/60">Best Streak</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl mb-1">✅</div>
            <div className="text-2xl font-bold text-green-400">{playerStats.totalCompleted}</div>
            <div className="text-xs text-white/60">Completed</div>
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
      
      {/* Challenge Tab */}
      {activeTab === 'challenge' && (
        <Card className={`bg-white/5 border-white/10 ${completedToday ? 'ring-2 ring-green-500' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{completedToday ? '✅ Challenge Complete!' : '🎯 Today\'s Challenge'}</span>
              <Badge variant="outline" className="border-cyan-500 text-cyan-400">
                +{XP_REWARDS.CHALLENGE_COMPLETE} XP
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-4">{challengeDescriptions[challenge.type] || 'Complete the challenge!'}</p>
            
            <div className="mb-4 p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-white/60">Target</span>
                <span className="font-medium">{challenge.target.toLocaleString()}</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${completedToday ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`}
                  style={{ width: completedToday ? '100%' : '0%' }}
                />
              </div>
            </div>
            
            {/* Game Mode Selection */}
            {!completedToday && (
              <div className="mb-4">
                <label className="text-sm text-white/60 mb-2 block">Game Mode</label>
                <div className="flex gap-2">
                  <Button
                    variant={gameMode === 'single' ? 'default' : 'outline'}
                    onClick={() => setGameMode('single')}
                    className={gameMode === 'single' ? 'bg-cyan-500' : 'border-white/20'}
                  >
                    <MicIcon className="w-4 h-4 mr-2" /> Single
                  </Button>
                  <Button
                    variant={gameMode === 'duel' ? 'default' : 'outline'}
                    onClick={() => setGameMode('duel')}
                    className={gameMode === 'duel' ? 'bg-purple-500' : 'border-white/20'}
                  >
                    ⚔️ Duel
                  </Button>
                </div>
              </div>
            )}
            
            {/* Player Selection for Duel Mode */}
            {!completedToday && gameMode === 'duel' && (
              <div className="mb-4">
                <label className="text-sm text-white/60 mb-2 block">Select 2 Players</label>
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
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/60">
                Resets in: {timeLeft.hours}h {timeLeft.minutes}m
              </div>
              {!completedToday && (
                <Button 
                  onClick={() => {
                    const songs = getAllSongs();
                    if (songs.length > 0) {
                      const randomSong = songs[Math.floor(Math.random() * songs.length)];
                      // Set active profile for single mode
                      if (gameMode === 'single' && selectedPlayerIds[0]) {
                        setActiveProfile(selectedPlayerIds[0]);
                      }
                      // Mark this game as a daily challenge for results-screen submission
                      localStorage.setItem('karaoke_daily_challenge_active', JSON.stringify({ active: true, startedAt: Date.now() }));
                      // Start the challenge directly
                      onPlayChallenge(randomSong);
                    }
                  }}
                  disabled={gameMode === 'duel' && selectedPlayerIds.length < 2}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500"
                >
                  Play Now
                </Button>
              )}
            </div>
            
            {!completedToday && playerStats.currentStreak > 0 && (
              <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="text-sm text-orange-400">
                  🔥 Streak Bonus: +{XP_REWARDS.STREAK_BONUS_BASE * playerStats.currentStreak} XP ({playerStats.currentStreak} days)
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Challenge Modes Tab */}
      {activeTab === 'modes' && (
        <div className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>🎮 Challenge Modes</CardTitle>
              <CardDescription>Special modifiers for extra XP rewards!</CardDescription>
            </CardHeader>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CHALLENGE_MODES.map((challenge) => {
              // Check if the player meets the challenge requirements
              const extendedStats = getExtendedStats();
              const requirementStatus = getChallengeRequirementStatus(
                challenge.id,
                profileLevel,
                extendedStats.songsCompleted,
                extendedStats.unlockedTitles,
              );
              const locked = requirementStatus !== null;

              return (
                <Card 
                  key={challenge.id}
                  className={`bg-white/5 border-white/10 transition-all relative ${
                    locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10'
                  } ${
                    challenge.difficulty === 'extreme' ? 'border-red-500/30' :
                    challenge.difficulty === 'hard' ? 'border-orange-500/30' :
                    challenge.difficulty === 'medium' ? 'border-yellow-500/30' : 'border-green-500/30'
                  }`}
                  onClick={() => {
                    if (locked) return;
                    // Store challenge mode and go to library
                    localStorage.setItem('karaoke-challenge-mode', challenge.id);
                    const songs = getAllSongs();
                    if (songs.length === 0) return;
                    onPlayChallenge(songs[Math.floor(Math.random() * songs.length)]);
                  }}
                >
                  <CardContent className="pt-4 pb-4">
                    {locked && (
                      <div className="absolute top-2 right-2 text-lg" title={requirementStatus || ''}>🔒</div>
                    )}
                    <div className="text-3xl mb-2">{challenge.icon}</div>
                    <h4 className="font-bold text-white mb-1">{challenge.name}</h4>
                    <p className="text-xs text-white/60 mb-3 line-clamp-2">{challenge.description}</p>
                    {locked && requirementStatus && (
                      <p className="text-xs text-red-400 mb-2">{requirementStatus}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`text-xs ${
                        challenge.difficulty === 'extreme' ? 'border-red-500 text-red-400' :
                        challenge.difficulty === 'hard' ? 'border-orange-500 text-orange-400' :
                        challenge.difficulty === 'medium' ? 'border-yellow-500 text-yellow-400' : 'border-green-500 text-green-400'
                      }`}>
                        {challenge.difficulty.toUpperCase()}
                      </Badge>
                      <span className="text-cyan-400 font-bold text-sm">+{challenge.xpReward} XP</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>🏆 Today&apos;s Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedLeaderboard.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <div className="text-4xl mb-2">🎯</div>
                <p>No entries yet! Be the first to complete today&apos;s challenge!</p>
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
                        {entry.accuracy.toFixed(1)}% accuracy • {entry.combo} max combo
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{entry.score.toLocaleString()}</div>
                      <div className="text-xs text-white/40">points</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 text-center text-sm text-white/40">
              {challenge.totalParticipants} participant{challenge.totalParticipants !== 1 ? 's' : ''} today
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>🎖️ Your Badges ({playerStats.badges.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {playerStats.badges.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <div className="text-4xl mb-2">🎖️</div>
                <p>Complete challenges to earn badges!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {playerStats.badges.map((badge) => (
                  <div 
                    key={badge.id}
                    className="p-4 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg text-center"
                  >
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <div className="font-medium text-amber-400">{badge.name}</div>
                    <div className="text-xs text-white/60 mt-1">{badge.description}</div>
                    <div className="text-xs text-white/40 mt-2">
                      {new Date(badge.unlockedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6">
              <h4 className="text-sm font-medium text-white/60 mb-3">Available Badges</h4>
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
                      <div className="font-medium">{badge.name}</div>
                      <div className="text-xs text-white/60 mt-1">{badge.description}</div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
