// ===================== R93g: COMPANION ↔ PLAYER-PROFILE BRIDGE =====================
// The companion app stores a lightweight MobileProfile, but the leaderboard
// service (registerAccount / loginWithAccount / uploadProfile / …) works with
// the full desktop PlayerProfile shape. These helpers convert losslessly in
// both directions so the companion gets EXACTLY the same online-account and
// profile-sync behaviour as the desktop app.

import type { MobileProfile } from '@/app/api/mobile/mobile-types';
import type { PlayerProfile } from '@/types/game';

/**
 * Build a full PlayerProfile from a companion MobileProfile. All gameplay
 * stats start at zero — the server only needs identity fields (id, name,
 * color, country, privacy) plus the sync/account linkage for registration
 * and sync uploads. Mirrors createDefaultPlayerProfile from the game store.
 */
export function mobileProfileToPlayerProfile(mobile: MobileProfile): PlayerProfile {
  return {
    id: mobile.id,
    name: mobile.name,
    avatar: mobile.avatar,
    color: mobile.color,
    totalScore: 0,
    gamesPlayed: 0,
    songsCompleted: 0,
    achievements: [],
    stats: {
      totalNotesHit: 0,
      totalNotesMissed: 0,
      bestCombo: 0,
      perfectStreaks: 0,
      goldenNotesHit: 0,
      averageAccuracy: 0,
      totalGamesPlayed: 0,
      totalSongsCompleted: 0,
      totalTimeSung: 0,
      bestScore: 0,
      worstScore: 0,
      perfectGames: 0,
      difficultyStats: {
        easy: { games: 0, avgAccuracy: 0, bestScore: 0 },
        medium: { games: 0, avgAccuracy: 0, bestScore: 0 },
        hard: { games: 0, avgAccuracy: 0, bestScore: 0 },
      },
      lowestNote: null,
      highestNote: null,
      recentScores: [],
      genreStats: {},
      currentStreak: 0,
      bestStreak: 0,
      lastPlayedDate: null,
    },
    createdAt: mobile.createdAt || Date.now(),
    xp: 0,
    level: 1,
    isActive: true,
    showRankInName: false,
    rankDisplayStyle: 'suffix',
    // Online-account / sync linkage (same fields as the desktop profile)
    storageMode: mobile.storageMode,
    country: mobile.country,
    privacy: mobile.privacy,
    syncCode: mobile.syncCode,
    syncUid: mobile.syncUid,
    authEmail: mobile.authEmail,
  };
}

/**
 * Extract the companion-relevant fields from a downloaded server profile
 * (online login or sync-code download). The profile ID is preserved so the
 * phone sings under the SAME identity as the desktop — exactly like the
 * desktop's importOnlineProfile keeps the server's id.
 */
export function playerProfileToMobile(player: PlayerProfile): MobileProfile {
  return {
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    color: player.color,
    createdAt: player.createdAt || Date.now(),
    storageMode: player.storageMode ?? 'online',
    country: player.country,
    privacy: player.privacy,
    syncCode: player.syncCode,
    syncUid: player.syncUid,
    authEmail: player.authEmail,
  };
}

/** E-mail validation — identical regex to the desktop create/login forms. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
