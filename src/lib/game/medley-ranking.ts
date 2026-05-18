/**
 * Medley Contest — Leaderboard & Statistics (Feature #13)
 *
 * Persistent leaderboard for Medley mode with all-time and daily rankings.
 * Uses localStorage via the storage module.
 */

import { StorageKeys, getJson, setJson } from '@/lib/storage';
import type { MedleyPlayMode } from '@/components/game/medley/medley-types';

// ===================== TYPES =====================

export interface MedleyHistoryEntry {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  score: number;
  notesHit: number;
  notesMissed: number;
  maxCombo: number;
  snippetsSung: number;
  snippetCount: number;
  playMode: MedleyPlayMode;
  timestamp: number;
  date: string; // YYYY-MM-DD
}

// ===================== HELPERS =====================

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weightedScore(entry: MedleyHistoryEntry): number {
  // Score = Bewertung × log₂(Snippets + 1)
  const logFactor = Math.log2(entry.snippetsSung + 1);
  return entry.score * logFactor;
}

// ===================== ALL-TIME HISTORY =====================

function getAllHistory(): MedleyHistoryEntry[] {
  return getJson<MedleyHistoryEntry[]>(StorageKeys.MEDLEY_HISTORY, []);
}

function saveAllHistory(entries: MedleyHistoryEntry[]): void {
  // Keep max 200 entries to avoid storage bloat
  const trimmed = entries.slice(0, 200);
  setJson(StorageKeys.MEDLEY_HISTORY, trimmed);
}

/** Add or update entry (keep best weighted score per player) */
export function addMedleyEntry(entry: Omit<MedleyHistoryEntry, 'id' | 'timestamp' | 'date'>): void {
  const history = getAllHistory();
  const date = todayStr();

  const existingIdx = history.findIndex(e => e.playerId === entry.playerId);
  if (existingIdx >= 0) {
    // Update only if new score is better
    const newEntry: MedleyHistoryEntry = {
      ...entry,
      id: `${entry.playerId}-${Date.now()}`,
      timestamp: Date.now(),
      date,
    };
    if (weightedScore(newEntry) > weightedScore(history[existingIdx])) {
      history[existingIdx] = newEntry;
    }
  } else {
    history.push({
      ...entry,
      id: `${entry.playerId}-${Date.now()}`,
      timestamp: Date.now(),
      date,
    });
  }

  saveAllHistory(history);
}

/** Get top N all-time entries sorted by weighted score */
export function getMedleyTopN(n: number): MedleyHistoryEntry[] {
  const history = getAllHistory();
  return history
    .sort((a, b) => weightedScore(b) - weightedScore(a))
    .slice(0, n);
}

// ===================== DAILY HISTORY =====================

function getDailyHistory(): MedleyHistoryEntry[] {
  const today = todayStr();
  const all = getAllHistory().filter(e => e.date === today);
  return all;
}

/** Convenience alias — delegates to addMedleyEntry. */
export function addDailyMedleyEntry(entry: Omit<MedleyHistoryEntry, 'id' | 'timestamp' | 'date'>): void {
  addMedleyEntry(entry);
}

/** Get top N daily entries sorted by raw score */
export function getDailyMedleyTopN(n: number): MedleyHistoryEntry[] {
  return getDailyHistory()
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

