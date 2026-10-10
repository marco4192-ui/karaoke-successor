// Daily Challenge — result submission (single-player + co-op)
//
// Part of the daily-challenge module (see ./index.ts).

import { setJson } from '@/lib/storage';
import { PERFECT_ACCURACY } from '../progression-levels';
import { DAILY_BADGES } from './badges';
import { getMondayIndex, getMondayISO, todayISO, yesterdayISO } from './date-utils';
import { evaluateDailyAttempt, getDailyDifficultyMultiplier } from './evaluation';
import { extractDailyMetric } from './gates';
import { updateQuestProgress } from './quests';
import { DAILY_SLOT_XP_BONUS, XP_REWARDS, getDailyType } from './registry';
import {
  getDailySlots,
  getActiveDailySlot,
  getDailyChallenge,
  getDailyBadgeTierToday,
  getPlayerDailySlotProgress,
  saveDailyChallenge,
  savePlayerDailySlotProgress,
} from './slots';
import {
  entryToMetrics,
  getBestMetric,
  getPlayerBestResult,
  savePlayerBestResult,
} from './best-results';
import { DAILY_CHALLENGE_KEY } from './storage-keys';
import { getPlayerDailyStats, savePlayerDailyStats } from './stats';
import type {
  DailyBadge,
  DailyChallengeData,
  DailyChallengeEntry,
  DailyDifficulty,
  DailyResultMetrics,
  PlayerBestResult,
  PlayerDailyStats,
} from './types';

/**
 * Advance the player's streak based on their last completion date.
 * Returns the streak bonus XP to add on top of the base XP.
 * Mutates `stats.currentStreak`, `stats.longestStreak`, and `stats.lastCompletedDate`.
 */
function advanceStreak(stats: PlayerDailyStats, _baseXP: number): { xpAdjustment: number; streakBonusXP: number } {
  if (stats.lastCompletedDate === yesterdayISO()) {
    stats.currentStreak++;
  } else {
    let penalty = 0;
    if (stats.currentStreak > 0 && stats.lastCompletedDate !== null) {
      penalty = XP_REWARDS.STREAK_BREAK_PENALTY;
    }
    stats.currentStreak = 1;
    return { xpAdjustment: -penalty, streakBonusXP: XP_REWARDS.STREAK_BONUS_BASE };
  }
  if (stats.currentStreak > stats.longestStreak) {
    stats.longestStreak = stats.currentStreak;
  }
  return { xpAdjustment: 0, streakBonusXP: XP_REWARDS.STREAK_BONUS_BASE * stats.currentStreak };
}

// ---------------------------------------------------------------------------
// Submit a challenge result (single-player) — slot-aware
// ---------------------------------------------------------------------------

/**
 * Submit a single-player challenge result for a daily slot.
 *
 * `options.slot` selects which of the 5 daily slots this attempt counts for
 * (defaults to the player's active = first open slot).
 *
 * Side-effects:
 * - Updates the daily leaderboard (slots completed today + badge tier)
 * - Records slot progress; awards slot XP on first completion per slot
 * - Streak/first-completion logic runs on the first slot completed today
 * - Awards badges (including daily bronze/silver/gold tier badges)
 * - Saves the player's best result for today including met difficulties
 */
export function submitChallengeResult(
  player: {
    id: string;
    name: string;
    avatar?: string;
    color: string;
  },
  result: DailyResultMetrics,
  options?: { difficulty?: DailyDifficulty; level?: number; slot?: number },
): {
  challenge: DailyChallengeData;
  slot: number;
  slotType: string;
  stats: PlayerDailyStats;
  xpEarned: number;
  newBadges: DailyBadge[];
  rank: number;
  targetMet: boolean;
  metDifficulties: DailyDifficulty[];
  slotCompleted: boolean;
} {
  const difficulty: DailyDifficulty = options?.difficulty ?? 'normal';
  const level = options?.level;
  const slots = getDailySlots();
  const slot = Math.min(Math.max(0, options?.slot ?? getActiveDailySlot(player.id) ?? 0), slots.length - 1);
  const slotType = slots[slot].type;
  const typeDef = getDailyType(slotType);

  // Always load with base target (no scaling) for leaderboard consistency
  const challenge = getDailyChallenge();
  const stats = getPlayerDailyStats(player.id);
  const slotProgress = getPlayerDailySlotProgress(player.id);
  const today = todayISO();
  const difficultyMultiplier = getDailyDifficultyMultiplier(difficulty);
  let xpEarned = 0;
  const newBadges: DailyBadge[] = [];

  // Evaluate the attempt against the slot's challenge type
  const evaluation = evaluateDailyAttempt(slotType, result, level);
  const targetMet = evaluation.met.includes(difficulty);

  // ── Leaderboard entry update ──
  const entrySortMetric = (entry: DailyChallengeEntry): number =>
    extractDailyMetric(challenge.type, entryToMetrics(entry));
  const existingEntry = challenge.entries.find(e => e.playerId === player.id);
  if (existingEntry) {
    const better = typeDef.direction === 'min'
      ? evaluation.metric < extractDailyMetric(slotType, entryToMetrics(existingEntry))
      : evaluation.metric > extractDailyMetric(slotType, entryToMetrics(existingEntry));
    if (better) {
      existingEntry.score = result.score;
      existingEntry.accuracy = result.accuracy;
      existingEntry.combo = result.combo;
      existingEntry.perfectNotesCount = result.perfectNotesCount ?? 0;
      existingEntry.goldenNotesCount = result.goldenNotesCount ?? 0;
      existingEntry.notesHit = result.notesHit ?? 0;
      existingEntry.notesMissed = result.notesMissed ?? 0;
      existingEntry.tickAccuracy = result.tickAccuracy;
      existingEntry.difficulty = difficulty;
      existingEntry.completedAt = Date.now();
    }
  } else {
    challenge.entries.push({
      playerId: player.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      playerColor: player.color,
      score: result.score,
      accuracy: result.accuracy,
      combo: result.combo,
      perfectNotesCount: result.perfectNotesCount ?? 0,
      goldenNotesCount: result.goldenNotesCount ?? 0,
      notesHit: result.notesHit ?? 0,
      notesMissed: result.notesMissed ?? 0,
      tickAccuracy: result.tickAccuracy,
      difficulty,
      completedAt: Date.now(),
      rank: 0,
    });
    challenge.totalParticipants++;
  }

  // ── Slot progress + XP ──
  const alreadyCompleted = slotProgress.completedSlots.includes(slot);
  const slotCompleted = targetMet && !alreadyCompleted;
  if (slotCompleted) {
    slotProgress.completedSlots.push(slot);
  }
  // Merge met difficulties per slot (union across attempts)
  const prevMet = slotProgress.metBySlot[String(slot)] ?? [];
  slotProgress.metBySlot[String(slot)] = Array.from(new Set([...prevMet, ...evaluation.met]));

  if (slotCompleted) {
    // Slot XP: slot 0 keeps the classic reward incl. streak/rank bonuses;
    // slots 1–4 award the escalating slot bonus (× difficulty multiplier).
    if (slot === 0) {
      xpEarned = Math.round(XP_REWARDS.CHALLENGE_COMPLETE * difficultyMultiplier);
    } else {
      xpEarned = Math.round(DAILY_SLOT_XP_BONUS[Math.min(slot - 1, DAILY_SLOT_XP_BONUS.length - 1)] * difficultyMultiplier);
    }
  }

  // Rank (computed after entry sort below — placeholder for badge checks)
  // Sort: slots completed today desc, then slot-0 metric (direction-aware)
  const entrySlots = (e: DailyChallengeEntry): number => e.slotsCompletedToday ?? 0;
  challenge.entries.sort((a, b) => {
    const slotDiff = entrySlots(b) - entrySlots(a);
    if (slotDiff !== 0) return slotDiff;
    const diff = typeDef.direction === 'min'
      ? entrySortMetric(a) - entrySortMetric(b)
      : entrySortMetric(b) - entrySortMetric(a);
    if (diff !== 0) return diff;
    return a.playerId.localeCompare(b.playerId);
  });
  challenge.entries.forEach((entry, index) => { entry.rank = index + 1; });
  const playerRank = challenge.entries.find(e => e.playerId === player.id)?.rank || 0;

  // Streak + first completion logic: runs when this is the player's FIRST
  // completed slot today (regardless of which slot it is).
  if (slotCompleted && stats.lastCompletedDate !== today) {
    const streak = advanceStreak(stats, xpEarned);
    xpEarned = Math.max(0, xpEarned + streak.xpAdjustment + streak.streakBonusXP);
    stats.lastCompletedDate = today;
    stats.totalCompleted++;

    // Top 3 bonus
    if (playerRank <= 3 && playerRank >= 1) {
      xpEarned += XP_REWARDS.TOP_3_BONUS[playerRank - 1];
    } else if (playerRank <= 10) {
      xpEarned += XP_REWARDS.TOP_10_BONUS;
    }

    // Update weekly progress — reset at week boundary
    const now = new Date();
    const weekStartISO = getMondayISO(now);
    if (stats.lastWeekStart !== weekStartISO) {
      stats.weeklyProgress = [0, 0, 0, 0, 0, 0, 0];
      stats.lastWeekStart = weekStartISO;
    }
    stats.weeklyProgress[getMondayIndex(now)] = 1;

    updateQuestProgress('dailyCompleted', 1, player.id);
  } else if (slotCompleted) {
    // Additional slot on the same day — still counts as a completed daily
    stats.totalCompleted++;
  }

  // Perfect challenge bonus: 100% accuracy on an accuracy-metric challenge.
  if (slotCompleted && typeDef.metricKey === 'accuracy' && evaluation.gatesPass && result.accuracy >= PERFECT_ACCURACY) {
    xpEarned += XP_REWARDS.PERFECT_CHALLENGE;
  }

  // Streak milestones (checked whenever a slot completes and the streak grew)
  if (slotCompleted) {
    const milestone = XP_REWARDS.STREAK_MILESTONES[stats.currentStreak as keyof typeof XP_REWARDS.STREAK_MILESTONES];
    if (milestone) {
      xpEarned += milestone.xp;
      const badgeId = milestone.badge.toLowerCase().replace(/ /g, '-');
      if (!stats.badges.some(b => b.id === badgeId)) {
        const newBadge: DailyBadge = {
          id: badgeId,
          name: milestone.badge,
          nameKey: milestone.badgeKey ?? `dailyChallenge.streakMilestones.${badgeId}`,
          icon: stats.currentStreak >= 365 ? '🌟' : stats.currentStreak >= 100 ? '💎' : '🏆',
          description: `Maintained a ${stats.currentStreak}-day streak`,
          descriptionKey: `dailyChallenge.streakMilestones.${badgeId}.description`,
          unlockedAt: Date.now(),
        };
        stats.badges.push(newBadge);
        newBadges.push(newBadge);
      }
    }

    // First challenge badge
    if (stats.totalCompleted === 1 && !stats.badges.some(b => b.id === 'first-challenge')) {
      const badge: DailyBadge = { ...DAILY_BADGES['first-challenge'], unlockedAt: Date.now() };
      stats.badges.push(badge);
      newBadges.push(badge);
    }
    // 30 completions badge
    if (stats.totalCompleted >= 30 && !stats.badges.some(b => b.id === 'dedicated')) {
      const badge: DailyBadge = { ...DAILY_BADGES['dedicated'], unlockedAt: Date.now() };
      stats.badges.push(badge);
      newBadges.push(badge);
    }

    // Daily tier badges: bronze (1), silver (3), gold (5 slots today)
    const tier = getDailyBadgeTierToday(player.id);
    const tierBadgeId = tier === 'gold' ? 'daily-gold' : tier === 'silver' ? 'daily-silver' : tier === 'bronze' ? 'daily-bronze' : null;
    if (tierBadgeId && !stats.badges.some(b => b.id === tierBadgeId)) {
      const badge: DailyBadge = { ...DAILY_BADGES[tierBadgeId], unlockedAt: Date.now() };
      stats.badges.push(badge);
      newBadges.push(badge);
    }
  }

  // Legendary badge (checked on every qualifying submission)
  if (stats.totalXP + xpEarned >= 10000 && !stats.badges.some(b => b.id === 'legendary')) {
    const badge: DailyBadge = { ...DAILY_BADGES['legendary'], unlockedAt: Date.now() };
    stats.badges.push(badge);
    newBadges.push(badge);
  }

  // Rank-based badges: checked on EVERY submission
  if (playerRank === 1 && !stats.badges.some(b => b.id === 'champion')) {
    const badge: DailyBadge = { ...DAILY_BADGES['champion'], unlockedAt: Date.now() };
    stats.badges.push(badge);
    newBadges.push(badge);
  }
  if (playerRank <= 3 && !stats.badges.some(b => b.id === 'top-3')) {
    const badge: DailyBadge = { ...DAILY_BADGES['top-3'], unlockedAt: Date.now() };
    stats.badges.push(badge);
    newBadges.push(badge);
  }

  // Persist slot progress on the entry + stats
  const playerEntry = challenge.entries.find(e => e.playerId === player.id);
  if (playerEntry) {
    playerEntry.slotsCompletedToday = slotProgress.completedSlots.length;
    const tier = getDailyBadgeTierToday(player.id);
    playerEntry.dailyBadge = tier === 'none' ? undefined : tier;
  }

  stats.totalXP += xpEarned;
  saveDailyChallenge(challenge);
  savePlayerDailyStats(stats, player.id);
  savePlayerDailySlotProgress(slotProgress, player.id);

  // Legacy shared completion flag
  setJson(DAILY_CHALLENGE_KEY, {
    date: today,
    completed: Object.values(slotProgress.metBySlot).some(m => m.length > 0),
    streak: stats.currentStreak,
  });

  // Best result for today (kept for the best-attempt box; tagged with the slot)
  const existingBest = getPlayerBestResult(player.id);
  const mergedMet = Array.from(new Set([
    ...(existingBest?.metDifficulties ?? []),
    ...evaluation.met,
  ]));
  const betterBest = !existingBest || (() => {
    const prev = getBestMetric(existingBest, slotType);
    return typeDef.direction === 'min' ? evaluation.metric < prev : evaluation.metric > prev;
  })();
  if (betterBest) {
    savePlayerBestResult(player.id, {
      playerId: player.id,
      score: result.score,
      accuracy: result.accuracy,
      combo: result.combo,
      perfectNotes: result.perfectNotesCount ?? 0,
      goldenNotes: result.goldenNotesCount ?? 0,
      notesHit: result.notesHit ?? 0,
      notesMissed: result.notesMissed ?? 0,
      tickAccuracy: result.tickAccuracy,
      completedAt: Date.now(),
      targetMet: mergedMet.length > 0,
      difficulty,
      metDifficulties: mergedMet,
      slot,
    });
  } else if (mergedMet.length > (existingBest?.metDifficulties?.length ?? 0)) {
    savePlayerBestResult(player.id, {
      ...(existingBest as PlayerBestResult),
      targetMet: true,
      metDifficulties: mergedMet,
    });
  }

  return { challenge, slot, slotType, stats, xpEarned, newBadges, rank: playerRank, targetMet, metDifficulties: mergedMet, slotCompleted };
}

// ---------------------------------------------------------------------------
// (#6) Co-op Challenge Submission — slot-aware
// ---------------------------------------------------------------------------

/**
 * Submit a co-op (2-player) challenge result for a daily slot.
 *
 * The co-op result uses the AVERAGE of both players' metrics.
 * XP is awarded to both players; slot progress is recorded for both.
 */
export function submitCoopChallengeResult(
  players: Array<{ id: string; name: string; avatar?: string; color: string }>,
  results: Array<DailyResultMetrics>,
  options?: { difficulty?: DailyDifficulty; level?: number; slot?: number },
): { challenge: DailyChallengeData; xpEarned: number; newBadges: DailyBadge[]; targetMet: boolean; metDifficulties: DailyDifficulty[]; slotCompleted: boolean } {
  if (players.length < 2 || results.length < 2) {
    throw new Error('Co-op requires at least 2 players and 2 results');
  }

  const difficulty: DailyDifficulty = options?.difficulty ?? 'normal';
  const level = options?.level;
  const slots = getDailySlots();
  const slot = Math.min(Math.max(0, options?.slot ?? 0), slots.length - 1);
  const slotType = slots[slot].type;
  const typeDef = getDailyType(slotType);
  const challenge = getDailyChallenge();
  const today = todayISO();
  const newBadges: DailyBadge[] = [];
  const difficultyMultiplier = getDailyDifficultyMultiplier(difficulty);

  // Average all players' metrics
  const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length;
  const avgAccuracy = results.reduce((s, r) => s + r.accuracy, 0) / results.length;
  const avgCombo = results.reduce((s, r) => s + r.combo, 0) / results.length;
  const avgPerfectNotes = results.reduce((s, r) => s + (r.perfectNotesCount ?? 0), 0) / results.length;
  const avgGoldenNotes = results.reduce((s, r) => s + (r.goldenNotesCount ?? 0), 0) / results.length;
  const avgNotesHit = results.reduce((s, r) => s + (r.notesHit ?? 0), 0) / results.length;
  const avgNotesMissed = results.reduce((s, r) => s + (r.notesMissed ?? 0), 0) / results.length;
  const avgTickAccuracy = results.some(r => r.tickAccuracy !== undefined)
    ? results.reduce((s, r) => s + (r.tickAccuracy ?? r.accuracy), 0) / results.length
    : undefined;
  const coopSong = results[0].song;
  const appLanguage = results[0].appLanguage;
  const categoryMatch = results[0].categoryMatch;

  const avgMetrics: DailyResultMetrics = {
    score: avgScore,
    accuracy: avgAccuracy,
    tickAccuracy: avgTickAccuracy,
    combo: avgCombo,
    perfectNotesCount: avgPerfectNotes,
    goldenNotesCount: avgGoldenNotes,
    notesHit: avgNotesHit,
    notesMissed: avgNotesMissed,
    song: coopSong,
    appLanguage,
    categoryMatch,
  };

  // Evaluate the averaged attempt
  const evaluation = evaluateDailyAttempt(slotType, avgMetrics, level);
  const targetMet = evaluation.met.includes(difficulty);

  // Add/update entries for each player
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const existing = challenge.entries.find(e => e.playerId === p.id);
    if (existing) {
      const better = typeDef.direction === 'min'
        ? evaluation.metric < extractDailyMetric(slotType, entryToMetrics(existing))
        : evaluation.metric > extractDailyMetric(slotType, entryToMetrics(existing));
      if (better) {
        existing.score = avgScore;
        existing.accuracy = avgAccuracy;
        existing.combo = avgCombo;
        existing.perfectNotesCount = avgPerfectNotes;
        existing.goldenNotesCount = avgGoldenNotes;
        existing.notesHit = avgNotesHit;
        existing.notesMissed = avgNotesMissed;
        existing.tickAccuracy = avgTickAccuracy;
        existing.difficulty = difficulty;
        existing.completedAt = Date.now();
      }
    } else {
      challenge.entries.push({
        playerId: p.id,
        playerName: p.name,
        playerAvatar: p.avatar,
        playerColor: p.color,
        score: avgScore,
        accuracy: avgAccuracy,
        combo: avgCombo,
        perfectNotesCount: avgPerfectNotes,
        goldenNotesCount: avgGoldenNotes,
        notesHit: avgNotesHit,
        notesMissed: avgNotesMissed,
        tickAccuracy: avgTickAccuracy,
        difficulty,
        completedAt: Date.now(),
        rank: 0,
      });
      challenge.totalParticipants++;
    }
  }

  // Sort entries (slots today desc, then metric)
  challenge.entries.sort((a, b) => {
    const slotDiff = (b.slotsCompletedToday ?? 0) - (a.slotsCompletedToday ?? 0);
    if (slotDiff !== 0) return slotDiff;
    const mA = extractDailyMetric(challenge.type, entryToMetrics(a));
    const mB = extractDailyMetric(challenge.type, entryToMetrics(b));
    const diff = typeDef.direction === 'min' ? mA - mB : mB - mA;
    if (diff !== 0) return diff;
    return a.playerId.localeCompare(b.playerId);
  });
  challenge.entries.forEach((entry, index) => { entry.rank = index + 1; });
  const bestRank = Math.min(
    ...players.map(p => challenge.entries.find(e => e.playerId === p.id)?.rank ?? Infinity),
  );

  let xpEarned = 0;
  let anySlotCompleted = false;

  for (const p of players) {
    const stats = getPlayerDailyStats(p.id);
    const slotProgress = getPlayerDailySlotProgress(p.id);
    const alreadyCompleted = slotProgress.completedSlots.includes(slot);
    const slotCompleted = targetMet && !alreadyCompleted;
    if (slotCompleted) {
      slotProgress.completedSlots.push(slot);
      anySlotCompleted = true;
    }
    const prevMet = slotProgress.metBySlot[String(slot)] ?? [];
    slotProgress.metBySlot[String(slot)] = Array.from(new Set([...prevMet, ...evaluation.met]));

    if (bestRank === 1 && !stats.badges.some(b => b.id === 'champion')) {
      const badge: DailyBadge = { ...DAILY_BADGES['champion'], unlockedAt: Date.now() };
      stats.badges.push(badge);
      if (p === players[0]) newBadges.push(badge);
    }
    if (bestRank <= 3 && !stats.badges.some(b => b.id === 'top-3')) {
      const badge: DailyBadge = { ...DAILY_BADGES['top-3'], unlockedAt: Date.now() };
      stats.badges.push(badge);
      if (p === players[0]) newBadges.push(badge);
    }

    let playerXP = 0;
    if (slotCompleted) {
      playerXP = slot === 0
        ? Math.round(XP_REWARDS.CHALLENGE_COMPLETE * difficultyMultiplier)
        : Math.round(DAILY_SLOT_XP_BONUS[Math.min(slot - 1, DAILY_SLOT_XP_BONUS.length - 1)] * difficultyMultiplier);

      if (stats.lastCompletedDate !== today) {
        const streak = advanceStreak(stats, playerXP);
        playerXP = Math.max(0, playerXP + streak.xpAdjustment + streak.streakBonusXP);
        stats.lastCompletedDate = today;

        const coopNow = new Date();
        const coopWeekStartISO = getMondayISO(coopNow);
        if (stats.lastWeekStart !== coopWeekStartISO) {
          stats.weeklyProgress = [0, 0, 0, 0, 0, 0, 0];
          stats.lastWeekStart = coopWeekStartISO;
        }
        stats.weeklyProgress[getMondayIndex(coopNow)] = 1;

        updateQuestProgress('dailyCompleted', 1, p.id);
      }
      stats.totalCompleted++;

      // Daily tier badges
      const tier = slotProgress.completedSlots.length >= 5 ? 'gold'
        : slotProgress.completedSlots.length >= 3 ? 'silver'
        : slotProgress.completedSlots.length >= 1 ? 'bronze' : 'none';
      const tierBadgeId = tier === 'gold' ? 'daily-gold' : tier === 'silver' ? 'daily-silver' : tier === 'bronze' ? 'daily-bronze' : null;
      if (tierBadgeId && !stats.badges.some(b => b.id === tierBadgeId)) {
        const badge: DailyBadge = { ...DAILY_BADGES[tierBadgeId], unlockedAt: Date.now() };
        stats.badges.push(badge);
        if (p === players[0]) newBadges.push(badge);
      }
    }

    stats.totalXP += playerXP;
    if (p === players[0]) xpEarned = playerXP;

    const playerEntry = challenge.entries.find(e => e.playerId === p.id);
    if (playerEntry) {
      playerEntry.slotsCompletedToday = slotProgress.completedSlots.length;
      const tier = slotProgress.completedSlots.length >= 5 ? 'gold'
        : slotProgress.completedSlots.length >= 3 ? 'silver'
        : slotProgress.completedSlots.length >= 1 ? 'bronze' : 'none';
      playerEntry.dailyBadge = tier === 'none' ? undefined : tier;
    }

    savePlayerDailyStats(stats, p.id);
    savePlayerDailySlotProgress(slotProgress, p.id);

    // Best result per player
    const existingBest = getPlayerBestResult(p.id);
    const mergedMet = Array.from(new Set([
      ...(existingBest?.metDifficulties ?? []),
      ...evaluation.met,
    ]));
    const better = !existingBest || (() => {
      const prev = getBestMetric(existingBest, slotType);
      return typeDef.direction === 'min' ? evaluation.metric < prev : evaluation.metric > prev;
    })();
    if (better) {
      savePlayerBestResult(p.id, {
        playerId: p.id,
        score: avgScore,
        accuracy: avgAccuracy,
        combo: avgCombo,
        perfectNotes: avgPerfectNotes,
        goldenNotes: avgGoldenNotes,
        notesHit: avgNotesHit,
        notesMissed: avgNotesMissed,
        tickAccuracy: avgTickAccuracy,
        completedAt: Date.now(),
        targetMet: mergedMet.length > 0,
        difficulty,
        metDifficulties: mergedMet,
        slot,
      });
    } else if (mergedMet.length > (existingBest?.metDifficulties?.length ?? 0)) {
      savePlayerBestResult(p.id, {
        ...(existingBest as PlayerBestResult),
        targetMet: true,
        metDifficulties: mergedMet,
      });
    }
  }

  if (targetMet && xpEarned === 0) xpEarned = Math.round(XP_REWARDS.CHALLENGE_COMPLETE * difficultyMultiplier);

  saveDailyChallenge(challenge);

  if (evaluation.met.length > 0) {
    setJson(DAILY_CHALLENGE_KEY, {
      date: today,
      completed: true,
      streak: getPlayerDailyStats(players[0].id).currentStreak,
    });
  }

  return { challenge, xpEarned, newBadges, targetMet, metDifficulties: evaluation.met, slotCompleted: anySlotCompleted };
}
