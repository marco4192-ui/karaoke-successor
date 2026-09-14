'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StorageKeys, setJson, setItem, getItem } from '@/lib/storage';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';
import { getAllSongs } from '@/lib/game/song-library';
import {
  getDailyChallenge,
  getPlayerDailyStats,
  getXPLevel,
  getTimeUntilReset,
  isChallengeCompletedToday,
  getCompletedDifficultiesToday,
  XP_REWARDS,
  DAILY_BADGES,
  getPlayerBestResult,
  getBestResultMetric,
  getDailyType,
  getDailyTargetFor,
  getDailyDifficultyMultiplier,
  DAILY_DIFFICULTIES,
  type DailyDifficulty,
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
} from '@/lib/game/player-progression';
import { getExtendedStats } from '@/lib/game/player-progression';
import { Song, GameMode } from '@/types/game';
import { shuffleArray } from '@/lib/utils';
import type { OnlineDailyEntry } from '@/lib/leaderboard/types';

// ===================== DAILY CHALLENGE SCREEN =====================
export function DailyChallengeScreen({ onPlayChallenge }: { onPlayChallenge: (_song: Song, _options?: { gameMode?: GameMode; playerIds?: string[] }) => void }) {
  const { t } = useTranslation();
  const { profiles, activeProfileId, setActiveProfile, addPlayer, setPlayers } = useGameStore();
  const [activeTab, setActiveTab] = useState<'challenge' | 'weekly' | 'modes' | 'leaderboard' | 'badges'>('challenge');

  // Player selection for the daily challenge (1–2 players, mandatory)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(
    activeProfileId ? [activeProfileId] : [],
  );
  // Evaluation mode when two players are selected: duel (individual) or team (average)
  const [evaluationMode, setEvaluationMode] = useState<'duel' | 'coop'>('duel');

  // View player for the progress section at the bottom (pure viewing — does NOT change the active profile)
  const [viewPlayerId, setViewPlayerId] = useState<string | null>(activeProfileId ?? null);

  // Selected daily difficulty — independent of the global game difficulty.
  // Persisted so the choice survives across sessions.
  const [selectedDifficulty, setSelectedDifficulty] = useState<DailyDifficulty>(() => {
    const stored = getItem('karaoke_daily_difficulty');
    return DAILY_DIFFICULTIES.some(d => d.id === stored) ? (stored as DailyDifficulty) : 'normal';
  });
  const changeDifficulty = (difficulty: DailyDifficulty) => {
    setSelectedDifficulty(difficulty);
    setItem('karaoke_daily_difficulty', difficulty);
  };

  // Three song choices for daily challenge
  const [songChoices, setSongChoices] = useState<Song[]>([]);

  // Challenge Mixer state
  const [mixerSelected, setMixerSelected] = useState<string[]>([]);

  // Selected challenge mode (for song selection after picking a mode)
  const [selectedMode, setSelectedMode] = useState<typeof CHALLENGE_MODES[0] | null>(null);

  // Song choices for selected challenge mode
  const [modeSongChoices, setModeSongChoices] = useState<Song[]>([]);

  // Online daily leaderboard state
  const [boardSource, setBoardSource] = useState<'local' | 'online'>('local');
  const [onlineEntries, setOnlineEntries] = useState<OnlineDailyEntry[] | null>(null);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  const activeProfiles = useMemo(() => profiles.filter(p => p.isActive !== false), [profiles]);

  // View player for the bottom progress section (falls back to active profile)
  const viewProfile = profiles.find(p => p.id === (viewPlayerId ?? activeProfileId)) || activeProfiles[0];
  const viewProfileXP = viewProfile?.xp || 0;
  const viewProfileLevel = viewProfile?.level || 1;
  const levelInfo = getXPLevel(viewProfileXP);

  // Check if the CHALLENGE player (first selected player) has completed today's
  // challenge at the SELECTED difficulty — the completion state gates the play
  // UI for that player. Each difficulty is tracked separately.
  const challengePlayerId = selectedPlayerIds[0] || viewProfile?.id;
  const completedToday = challengePlayerId ? isChallengeCompletedToday(challengePlayerId, selectedDifficulty) : false;
  const metDifficulties = challengePlayerId ? getCompletedDifficultiesToday(challengePlayerId) : [];
  const allDifficultiesDone = metDifficulties.length >= DAILY_DIFFICULTIES.length;

  // Per-player stats of the view player
  const playerStats = getPlayerDailyStats(viewProfile?.id);

  // Challenge is generated with the level of the first selected player (or view
  // player) AND the selected daily difficulty — switching either updates the
  // target immediately.
  const scalingProfile = profiles.find(p => p.id === selectedPlayerIds[0]) || viewProfile;
  const challenge = getDailyChallenge(scalingProfile?.level || 1, selectedDifficulty);
  const typeDef = getDailyType(challenge.type);
  const challengeXP = Math.round(XP_REWARDS.CHALLENGE_COMPLETE * getDailyDifficultyMultiplier(selectedDifficulty));
  const timeLeft = getTimeUntilReset();

  // Generate song choices when challenge is not completed
  useEffect(() => {
    const songs = getAllSongs();
    setSongChoices(shuffleArray(songs).slice(0, 3));
  }, [completedToday]);

  // Keep the view player valid when profiles change
  useEffect(() => {
    if (viewPlayerId && !profiles.some(p => p.id === viewPlayerId)) {
      setViewPlayerId(activeProfileId ?? activeProfiles[0]?.id ?? null);
    }
  }, [profiles, viewPlayerId, activeProfileId, activeProfiles]);

  // Load online daily leaderboard when the online tab is opened
  const loadOnlineBoard = useCallback(async () => {
    setOnlineLoading(true);
    setOnlineError(null);
    try {
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      const entries = await leaderboardService.fetchDailyLeaderboard();
      setOnlineEntries(entries);
    } catch (err) {
      setOnlineEntries(null);
      setOnlineError(err instanceof Error ? err.message : 'Server nicht erreichbar');
    } finally {
      setOnlineLoading(false);
    }
  }, []);

  // Load online daily leaderboard when the online tab is opened.
  // NOTE: intentionally NOT re-triggered by state changes — the button and
  // this effect (on tab switch) are the only entry points, so a failed load
  // keeps its error state until the user explicitly retries.
  useEffect(() => {
    if (activeTab === 'leaderboard' && boardSource === 'online') {
      loadOnlineBoard();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadOnlineBoard is stable (useCallback with no deps)
  }, [activeTab, boardSource]);

  // Challenge description comes from the type registry — the {n} placeholder
  // is filled with the CURRENT target (difficulty + level scaled), so the text
  // updates the moment the difficulty is switched.
  const challengeDescription = t(typeDef.descriptionKey).replace('{n}', formatDailyValue(typeDef.metricKey, challenge.target));

  // Sort leaderboard by the challenge-type metric (direction-aware).
  const sortMetric = (entry: typeof challenge.entries[0]): number =>
    getBestResultMetric({
      playerId: entry.playerId,
      score: entry.score,
      accuracy: entry.accuracy,
      combo: entry.combo,
      perfectNotes: entry.perfectNotesCount,
      goldenNotes: entry.goldenNotesCount,
      notesHit: entry.notesHit,
      notesMissed: entry.notesMissed,
      tickAccuracy: entry.tickAccuracy,
      completedAt: entry.completedAt,
      targetMet: false,
    }, challenge.type);
  const sortedLeaderboard = [...challenge.entries].sort((a, b) => {
    const metricA = sortMetric(a);
    const metricB = sortMetric(b);
    const diff = typeDef.direction === 'min' ? metricA - metricB : metricB - metricA;
    if (diff !== 0) return diff;
    return a.playerId.localeCompare(b.playerId);
  });

  /** Format a metric value for display (percent types get one decimal + %). */
  function formatDailyValue(metricKey: string, value: number): string {
    if (metricKey === 'accuracy' || metricKey === 'tickAccuracy') {
      return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
    }
    return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }

  // Toggle player selection (max 2)
  const togglePlayer = (profileId: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : prev.length < 2
          ? [...prev, profileId]
          : [prev[1], profileId], // replace the second slot when full
    );
  };

  // Handler: play a specific song for the daily challenge with the selected players
  const handlePlaySong = useCallback((song: Song) => {
    if (selectedPlayerIds.length === 0) return;

    // First selected player becomes the active profile (P1)
    setActiveProfile(selectedPlayerIds[0]);

    // Set up the game players: 1 = solo, 2 = duel (both sing the same song)
    const players = selectedPlayerIds
      .map(id => profiles.find(p => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p && p.isActive !== false);
    setPlayers([]);
    players.forEach(p => addPlayer(p));

    setJson(StorageKeys.DAILY_CHALLENGE_ACTIVE, {
      active: true,
      startedAt: Date.now(),
      gameMode: selectedPlayerIds.length >= 2 ? evaluationMode : 'single',
      playerIds: selectedPlayerIds,
      difficulty: selectedDifficulty,
    });

    const gameMode: GameMode = selectedPlayerIds.length >= 2 ? 'duel' : 'standard';
    onPlayChallenge(song, { gameMode, playerIds: selectedPlayerIds });
  }, [selectedPlayerIds, selectedDifficulty, evaluationMode, profiles, setActiveProfile, setPlayers, addPlayer, onPlayChallenge]);

  // Handler: play a specific song with a selected challenge mode
  const handlePlayModeSong = useCallback((song: Song) => {
    if (selectedMode) {
      setItem(StorageKeys.CHALLENGE_MODE, selectedMode.id);
    }
    onPlayChallenge(song);
  }, [selectedMode, onPlayChallenge]);

  // Metric label for a daily type (board value captions)
  const metricLabel = (type: string): string => {
    switch (getDailyType(type).metricKey) {
      case 'accuracy': return '%';
      case 'tickAccuracy': return t('dailyChallengeScreen.tickAccuracyLabel');
      case 'maxCombo': return t('dailyChallengeScreen.comboLabel');
      case 'perfectNotesCount': return t('dailyChallengeScreen.perfectNotesLabel');
      case 'goldenNotesCount': return t('dailyChallengeScreen.goldenNotesLabel');
      case 'notesHit': return t('dailyChallengeScreen.notesHitLabel');
      case 'notesMissed': return t('dailyChallengeScreen.missedNotesLabel');
      default: return t('dailyChallengeScreen.points');
    }
  };

  // Difficulty chip styling per level
  const difficultyChipClass = (id: DailyDifficulty, active: boolean): string => {
    const base = 'flex-1 min-w-[92px] sm:min-w-0 px-2.5 py-2 rounded-lg text-xs font-medium transition-all border flex items-center justify-center gap-1.5';
    if (!active) return `${base} bg-white/5 border-white/10 text-white/70 hover:bg-white/10`;
    switch (id) {
      case 'easy': return `${base} bg-green-500/20 border-green-500 text-green-300 ring-1 ring-green-400/50`;
      case 'normal': return `${base} bg-yellow-500/20 border-yellow-500 text-yellow-300 ring-1 ring-yellow-400/50`;
      case 'hard': return `${base} bg-orange-500/20 border-orange-500 text-orange-300 ring-1 ring-orange-400/50`;
      case 'very_hard': return `${base} bg-red-500/20 border-red-500 text-red-300 ring-1 ring-red-400/50`;
      case 'insane': return `${base} bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300 ring-1 ring-fuchsia-400/50`;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">{t('dailyChallengeScreen.title')}</h1>
        <p className="text-white/60">{t('dailyChallengeScreen.description')}</p>
      </div>

      {/* ── Tab navigation (top) ── */}
      <div className="flex gap-2 mb-6 flex-wrap" role="tablist" aria-label={t('dailyChallengeScreen.title')}>
        {([
          ['challenge', 'dailyChallengeScreen.challenges'],
          ['weekly', 'dailyChallengeScreen.weeklyChallenge'],
          ['modes', 'dailyChallengeScreen.challengeModes'],
          ['leaderboard', 'dailyChallengeScreen.leaderboard'],
          ['badges', 'dailyChallengeScreen.badges'],
        ] as const).map(([tab, key]) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'border-white/20'}
          >
            {t(key)}
          </Button>
        ))}
      </div>

      {/* ── Tab content (action area) ── */}
      {activeTab === 'challenge' && (
        <Card className={`bg-white/5 border-white/10 mb-6 ${completedToday && viewProfile ? 'ring-2 ring-green-500' : ''}`}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>{typeDef.icon}</span>
                <span>{completedToday ? t('dailyChallengeScreen.challengeComplete') : t(typeDef.nameKey)}</span>
              </span>
              <Badge variant="outline" className="border-cyan-500 text-cyan-400">
                +{challengeXP} XP{getDailyDifficultyMultiplier(selectedDifficulty) !== 1 ? ` (×${getDailyDifficultyMultiplier(selectedDifficulty)})` : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* ── Difficulty selector — independent of the global game difficulty.
                Switching updates target, description and XP instantly. ── */}
            <div className="mb-4">
              <label className="text-sm text-white/60 mb-2 block">{t('dailyChallengeScreen.difficultyLabel')}</label>
              <div className="flex gap-2 flex-wrap" role="group" aria-label={t('dailyChallengeScreen.difficultyLabel')}>
                {DAILY_DIFFICULTIES.map((d) => {
                  const done = metDifficulties.includes(d.id);
                  const active = selectedDifficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => changeDifficulty(d.id)}
                      aria-pressed={active}
                      title={done ? t('dailyChallengeScreen.difficultyDoneHint') : `${t(d.labelKey)} — ×${d.xpMultiplier} XP`}
                      className={difficultyChipClass(d.id, active)}
                    >
                      <span aria-hidden>{d.icon}</span>
                      <span>{t(d.labelKey)}</span>
                      {done && <span className="text-green-400 font-bold" aria-label={t('dailyChallengeScreen.difficultyDoneHint')}>✓</span>}
                    </button>
                  );
                })}
              </div>
              {allDifficultiesDone && (
                <p className="text-xs text-green-400 mt-2">{t('dailyChallengeScreen.allDifficultiesDone')}</p>
              )}
            </div>

            <p className="text-lg mb-2">{challengeDescription}</p>

            {/* Dynamic Difficulty Indicator */}
            {viewProfileLevel > 1 && (
              <div className="text-xs text-purple-400/60 mb-4">
                {t('dailyChallengeScreen.dynamicDifficulty')
                  .replace('{n}', formatDailyValue(typeDef.metricKey, getDailyTargetFor(challenge.type, selectedDifficulty)))
                  .replace('{m}', formatDailyValue(typeDef.metricKey, challenge.target))}
              </div>
            )}

            <div className="mb-4 p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-white/60">{t('dailyChallengeScreen.target')}</span>
                <span className="font-medium">{formatDailyValue(typeDef.metricKey, challenge.target)}</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${completedToday ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`}
                  style={{ width: completedToday ? '100%' : '0%' }}
                />
              </div>
            </div>

            {/* Best result of the first selected player (when not completed) */}
            {!completedToday && selectedPlayerIds[0] && (() => {
              const best = getPlayerBestResult(selectedPlayerIds[0]);
              if (!best) return null;
              const currentMetric = getBestResultMetric(best, challenge.type);
              const target = challenge.target;
              const pct = typeDef.direction === 'min'
                ? (currentMetric <= target ? 100 : Math.min(99, Math.round((target / Math.max(1, currentMetric)) * 100)))
                : Math.min(100, Math.round((currentMetric / target) * 100));
              const suffix = typeDef.metricKey === 'accuracy' || typeDef.metricKey === 'tickAccuracy' ? '%' : '';
              const remaining = typeDef.direction === 'min'
                ? Math.max(0, currentMetric - target)
                : Math.max(0, target - currentMetric);

              return (
                <div className="mb-4 p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-white/60">{t('dailyChallengeScreen.bestResult')}</span>
                    <span className="font-medium text-cyan-400">
                      {formatDailyValue(typeDef.metricKey, currentMetric)} / {formatDailyValue(typeDef.metricKey, target)}{suffix && !formatDailyValue(typeDef.metricKey, target).includes('%') ? suffix : ''}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-white/40 mt-1">
                    {pct >= 100
                      ? t('dailyChallengeScreen.challengeComplete')
                      : t(typeDef.direction === 'min' ? 'dailyChallengeScreen.remainingFewer' : 'dailyChallengeScreen.remainingMore').replace('{n}', remaining.toLocaleString())}
                  </div>
                </div>
              );
            })()}

            {/* ── Mandatory player selection (1–2 players) ── */}
            <div className="mb-4">
              <label className="text-sm text-white/60 mb-2 block">
                {t('dailyChallengeScreen.selectChallengePlayers')} <span className="text-cyan-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {activeProfiles.map((profile) => {
                  const isSelected = selectedPlayerIds.includes(profile.id);
                  const slot = selectedPlayerIds.indexOf(profile.id);
                  return (
                    <button
                      key={profile.id}
                      onClick={() => togglePlayer(profile.id)}
                      aria-pressed={isSelected}
                      className={`flex items-center gap-2 p-2.5 rounded-lg transition-all border ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-500 text-white ring-1 ring-cyan-400/50'
                          : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: profile.color }}
                      >
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          profile.name?.[0] || '?'
                        )}
                      </div>
                      <span className="text-sm truncate flex-1 text-left">{profile.name}</span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-cyan-300 flex-shrink-0">
                          {slot === 0 ? 'P1' : 'P2'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedPlayerIds.length === 0 && (
                <p className="text-xs text-amber-400/80 mt-2">{t('dailyChallengeScreen.selectChallengePlayersHint')}</p>
              )}

              {/* Evaluation mode when two players are selected */}
              {selectedPlayerIds.length >= 2 && (
                <div className="mt-3">
                  <label className="text-sm text-white/60 mb-2 block">{t('dailyChallengeScreen.evaluationMode')}</label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={evaluationMode === 'duel' ? 'default' : 'outline'}
                      onClick={() => setEvaluationMode('duel')}
                      className={evaluationMode === 'duel' ? 'bg-purple-500' : 'border-white/20'}
                    >
                      {t('dailyChallengeScreen.evaluationDuel')}
                    </Button>
                    <Button
                      size="sm"
                      variant={evaluationMode === 'coop' ? 'default' : 'outline'}
                      onClick={() => setEvaluationMode('coop')}
                      className={evaluationMode === 'coop' ? 'bg-green-500' : 'border-white/20'}
                    >
                      {t('dailyChallengeScreen.evaluationTeam')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Three song choices — only playable with at least one selected player */}
            {selectedPlayerIds.length > 0 && (
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
        const weekly = getWeeklyChallenge(viewProfileLevel);
        const weeklyCompleted = viewProfile ? isWeeklyChallengeCompletedToday(viewProfile.id) : false;
        const weeklyReset = getTimeUntilWeeklyReset();
        return (
          <Card className={`bg-white/5 border-white/10 mb-6 ${weeklyCompleted ? 'ring-2 ring-green-500' : ''}`}>
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
        <div className="space-y-4 mb-6">
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
                viewProfileLevel,
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
                    <h4 className="font-bold text-white mb-1">{t(mode.nameKey)}</h4>
                    <p className="text-xs text-white/60 mb-3 line-clamp-2">{t(mode.descriptionKey)}</p>
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
                {selectedMode.icon} {t(selectedMode.nameKey)} — {t('dailyChallengeScreen.selectSong')}
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
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <span>{t('dailyChallengeScreen.todayLeaderboard')}</span>
              {/* Local / Online switch */}
              <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
                <button
                  onClick={() => setBoardSource('local')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    boardSource === 'local' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {t('dailyChallengeScreen.localBoard')}
                </button>
                <button
                  onClick={() => { setBoardSource('online'); loadOnlineBoard(); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    boardSource === 'online' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  🌐 {t('dailyChallengeScreen.onlineBoard')}
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {boardSource === 'local' ? (
              <>
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
                          <div className="font-bold text-lg flex items-center gap-2 justify-end">
                            {formatDailyValue(typeDef.metricKey, sortMetric(entry))}
                            {entry.difficulty && DAILY_DIFFICULTIES.some(d => d.id === entry.difficulty) && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded border border-white/15 text-white/60"
                                title={t(DAILY_DIFFICULTIES.find(d => d.id === entry.difficulty)!.labelKey)}
                              >
                                {DAILY_DIFFICULTIES.find(d => d.id === entry.difficulty)!.icon}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-white/40">{metricLabel(challenge.type)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 text-center text-sm text-white/40">
                  {challenge.totalParticipants} {challenge.totalParticipants !== 1 ? t('dailyChallengeScreen.participants') : t('dailyChallengeScreen.participant')} {t('dailyChallengeScreen.dayStreak').toLowerCase()}
                </div>
              </>
            ) : (
              /* ── Online daily leaderboard ── */
              <>
                {onlineLoading && (
                  <div className="text-center py-8 text-white/50">
                    <div className="animate-spin inline-block w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mb-3" />
                    <p className="text-sm">{t('dailyChallengeScreen.onlineBoardLoading')}</p>
                  </div>
                )}
                {!onlineLoading && onlineError && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📡</div>
                    <p className="text-sm text-amber-400/90 mb-3">{t('dailyChallengeScreen.onlineBoardUnavailable')}</p>
                    <p className="text-xs text-white/40 mb-4">{onlineError}</p>
                    <Button size="sm" variant="outline" className="border-white/20" onClick={loadOnlineBoard}>
                      {t('dailyChallengeScreen.onlineBoardRefresh')}
                    </Button>
                  </div>
                )}
                {!onlineLoading && !onlineError && onlineEntries && onlineEntries.length === 0 && (
                  <div className="text-center py-8 text-white/40">
                    <div className="text-4xl mb-2">🌐</div>
                    <p>{t('dailyChallengeScreen.onlineBoardEmpty')}</p>
                  </div>
                )}
                {!onlineLoading && !onlineError && onlineEntries && onlineEntries.length > 0 && (
                  <div className="space-y-2">
                    {onlineEntries.map((entry) => (
                      <div
                        key={entry.profile_uid}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          entry.rank === 1 ? 'bg-amber-500/20 border border-amber-500/30' :
                          entry.rank === 2 ? 'bg-gray-400/20 border border-gray-400/30' :
                          entry.rank === 3 ? 'bg-orange-700/20 border border-orange-700/30' :
                          'bg-white/5'
                        }`}
                      >
                        <div className="text-xl font-bold w-8">
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                        </div>
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: entry.color || '#8B5CF6' }}
                        >
                          {entry.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{entry.display_name}</div>
                          <div className="text-xs text-white/60">{metricLabel(entry.challenge_type)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg flex items-center gap-2 justify-end">
                            {formatDailyValue(getDailyType(entry.challenge_type).metricKey, entry.metric_value)}
                            {entry.difficulty && DAILY_DIFFICULTIES.some(d => d.id === entry.difficulty) && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded border border-white/15 text-white/60"
                                title={t(DAILY_DIFFICULTIES.find(d => d.id === entry.difficulty)!.labelKey)}
                              >
                                {DAILY_DIFFICULTIES.find(d => d.id === entry.difficulty)!.icon}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <Card className="bg-white/5 border-white/10 mb-6">
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
                {(viewProfile ? getActiveQuests(viewProfile.id) : getActiveQuests()).map((quest) => {
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
                        <Button size="sm" className="mt-2 bg-green-500 hover:bg-green-600" onClick={() => claimQuestReward(quest.id, viewProfile?.id)}>
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

      {/* ── Player progress section (bottom): switchable per player ── */}
      {activeProfiles.length > 0 && (
        <section aria-label={t('dailyChallengeScreen.playerProgress')} className="mt-8 pt-6 border-t border-white/10">
          {/* Player switcher */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm text-white/50 mr-1">{t('dailyChallengeScreen.playerProgress')}:</span>
            {activeProfiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => setViewPlayerId(profile.id)}
                aria-pressed={viewProfile?.id === profile.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-sm ${
                  viewProfile?.id === profile.id
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

          {/* Level & XP Progress — of the viewed player */}
          <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 mb-4">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-purple-400">Lv.{viewProfileLevel}</div>
                  <div>
                    <div className="text-sm font-medium">{levelInfo.title}</div>
                    <div className="text-xs text-white/60">{viewProfileXP.toLocaleString()} XP</div>
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

              {/* Weekly Progress Calendar (per viewed player) */}
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

          {/* Streak & Stats Row — of the viewed player */}
          <div className="grid grid-cols-3 gap-4">
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
        </section>
      )}
    </div>
  );
}
