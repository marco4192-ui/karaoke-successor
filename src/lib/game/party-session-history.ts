'use client';

/**
 * Party Session History
 *
 * Records completed party game sessions (one entry per finished game/series)
 * in localStorage so the party screen can show "Recent Parties" and per-mode
 * play statistics. Pure data module — no React, safe to import anywhere
 * on the client.
 */

import { getItem, setItem } from '@/lib/storage';
import type { GameMode } from '@/types/game';

// ===================== TYPES =====================

/**
 * A single player line inside a session record.
 * `scoreKind` separates karaoke point scores (0–10000+) from Rate-my-Song
 * rating sums (0–30) so insights never mix the two scales.
 */
export interface PartySessionPlayerResult {
  name: string;
  avatar?: string;
  color?: string;
  score: number;
  isWinner?: boolean;
  /** 'points' (default) for karaoke scores, 'rating' for RMS rating sums */
  scoreKind?: 'points' | 'rating';
}

/** One completed party session (game/series over). */
export interface PartySessionRecord {
  id: string;
  /** GameMode key, e.g. 'pass-the-mic' — used for icon/color/title lookup */
  mode: GameMode | string;
  finishedAt: number; // epoch ms
  players: PartySessionPlayerResult[];
  /** Song title when the session revolved around a single song */
  songTitle?: string;
  /** Number of rounds/songs played (optional) */
  rounds?: number;
}

// ===================== CONSTANTS =====================

const MAX_SESSIONS = 50;

// ===================== HELPERS =====================

function safeRead(): PartySessionRecord[] {
  try {
    const raw = getItem('karaoke-party-session-history');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is PartySessionRecord =>
        r && typeof r.id === 'string' && typeof r.mode === 'string' && Array.isArray(r.players)
    );
  } catch {
    return [];
  }
}

function safeWrite(sessions: PartySessionRecord[]): void {
  try {
    setItem('karaoke-party-session-history', JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {
    // storage full / unavailable — history is best-effort
  }
}

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

// ===================== PUBLIC API =====================

/**
 * Persist a finished session. Call exactly once per finished game
 * (the provided `useRecordPartySession` hook guards against double-fire).
 * Returns the stored record (with generated id + finishedAt) or null on failure.
 */
export function recordPartySession(
  input: Omit<PartySessionRecord, 'id' | 'finishedAt'> & { finishedAt?: number }
): PartySessionRecord | null {
  if (typeof window === 'undefined') return null;
  const record: PartySessionRecord = {
    id: makeId(),
    finishedAt: input.finishedAt ?? Date.now(),
    mode: input.mode,
    players: input.players.slice(0, 24),
    songTitle: input.songTitle,
    rounds: input.rounds,
  };
  const sessions = safeRead();
  sessions.unshift(record); // newest first
  safeWrite(sessions);
  return record;
}

/** All stored sessions, newest first (max 50). */
export function getPartySessions(): PartySessionRecord[] {
  if (typeof window === 'undefined') return [];
  return safeRead();
}

/** Number of recorded sessions per mode key. */
export function getPartyModePlayCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const session of safeRead()) {
    counts[session.mode] = (counts[session.mode] ?? 0) + 1;
  }
  return counts;
}

/** Wipe the whole history (party screen "Clear" action). */
export function clearPartySessions(): void {
  if (typeof window === 'undefined') return;
  try {
    setItem('karaoke-party-session-history', '[]');
  } catch {
    // ignore
  }
}

// ===================== DERIVED HELPERS =====================

/** Winner of a session: explicit winner flag first, then highest distinct score. */
export function getSessionWinner(session: PartySessionRecord): PartySessionPlayerResult | null {
  if (session.players.length < 2) return null;
  const explicit = session.players.find(p => p.isWinner);
  if (explicit) return explicit;
  const sorted = [...session.players].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  if (!top || top.score === sorted[1]?.score) return null; // tie → no winner
  return top;
}

/**
 * True when the session's scores are rating sums (Rate my Song) rather than
 * karaoke points. A session counts as a rating session when ANY player line
 * carries `scoreKind: 'rating'` (the recorder sets it on every line).
 */
export function isRatingSession(session: PartySessionRecord): boolean {
  return session.players.some(p => p.scoreKind === 'rating');
}

// ===================== INSIGHTS =====================

/** Aggregated party statistics derived from the stored session history. */
export interface PartyInsights {
  /** Total number of recorded sessions. */
  totalParties: number;
  /** Sum of rounds/songs played across all sessions. */
  totalRounds: number;
  /** Most played mode (only when at least one session exists). */
  favoriteMode: { mode: string; count: number } | null;
  /** Player with the most session wins (ties → first alphabetically for stability). */
  topWinner: { name: string; avatar?: string; color?: string; wins: number } | null;
  /** Highest single-session karaoke point score and who achieved it (points scale only). */
  bestScore: { name: string; avatar?: string; color?: string; score: number } | null;
  /** Highest single-session rating sum and who achieved it (rating scale only, RMS). */
  bestRating: { name: string; avatar?: string; color?: string; rating: number } | null;
}

/**
 * Compute aggregate insights from the session history.
 * Accepts an optional pre-read session list (for tests); reads storage otherwise.
 */
export function getPartyInsights(input?: PartySessionRecord[]): PartyInsights {
  const sessions = input ?? (typeof window === 'undefined' ? [] : safeRead());
  const insights: PartyInsights = {
    totalParties: sessions.length,
    totalRounds: 0,
    favoriteMode: null,
    topWinner: null,
    bestScore: null,
    bestRating: null,
  };

  const modeCounts: Record<string, number> = {};
  const winCounts: Record<string, { name: string; avatar?: string; color?: string; wins: number }> = {};

  for (const session of sessions) {
    insights.totalRounds += session.rounds ?? 0;
    modeCounts[session.mode] = (modeCounts[session.mode] ?? 0) + 1;

    const winner = getSessionWinner(session);
    if (winner) {
      const key = winner.name;
      const entry = winCounts[key] ?? { name: winner.name, avatar: winner.avatar, color: winner.color, wins: 0 };
      entry.wins += 1;
      if (!entry.avatar && winner.avatar) entry.avatar = winner.avatar;
      if (!entry.color && winner.color) entry.color = winner.color;
      winCounts[key] = entry;
    }

    for (const p of session.players) {
      if (p.scoreKind === 'rating') {
        // Rating scale (RMS sums, e.g. 24.5) — never mixed into bestScore
        if (!insights.bestRating || p.score > insights.bestRating.rating) {
          insights.bestRating = { name: p.name, avatar: p.avatar, color: p.color, rating: p.score };
        }
      } else {
        // Points scale (karaoke scores)
        if (!insights.bestScore || p.score > insights.bestScore.score) {
          insights.bestScore = { name: p.name, avatar: p.avatar, color: p.color, score: p.score };
        }
      }
    }
  }

  const favEntry = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0];
  if (favEntry && favEntry[1] > 0) {
    insights.favoriteMode = { mode: favEntry[0], count: favEntry[1] };
  }

  const topWinnerEntry = Object.values(winCounts).sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name))[0];
  if (topWinnerEntry && topWinnerEntry.wins > 0) {
    insights.topWinner = topWinnerEntry;
  }

  return insights;
}

/** Relative time label via Intl (locale-aware, no i18n keys needed). */
export function formatSessionTimeAgo(finishedAt: number, locale: string): string {
  const diffMs = Date.now() - finishedAt;
  const minutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (minutes < 1) return rtf.format(0, 'minute');
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 7) return rtf.format(-days, 'day');
  const dtf = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  return dtf.format(new Date(finishedAt));
}
