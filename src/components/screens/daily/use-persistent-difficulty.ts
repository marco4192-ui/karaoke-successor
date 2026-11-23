'use client';

import { useState } from 'react';
import { getItem, setItem } from '@/lib/storage';
import { DAILY_DIFFICULTIES, type DailyDifficulty } from '@/lib/game/daily-challenge';

/** Daily/weekly difficulty persisted per localStorage key — deliberately
 *  independent of the global game difficulty (the daily and weekly tabs use
 *  separate keys so both selectors keep their own choice). */
export function usePersistentDifficulty(storageKey: string): [DailyDifficulty, (difficulty: DailyDifficulty) => void] {
  const [difficulty, setDifficulty] = useState<DailyDifficulty>(() => {
    const stored = getItem(storageKey);
    return DAILY_DIFFICULTIES.some(d => d.id === stored) ? (stored as DailyDifficulty) : 'normal';
  });
  const changeDifficulty = (difficulty: DailyDifficulty) => {
    setDifficulty(difficulty);
    setItem(storageKey, difficulty);
  };
  return [difficulty, changeDifficulty];
}
