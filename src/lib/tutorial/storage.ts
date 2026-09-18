import { getItem, setItem } from '@/lib/storage';
import type { TourId } from './types';

/**
 * Tutorial progress persistence (localStorage).
 * Keys: karaoke-zero-tour-<id>-done / -offered
 */

const PREFIX = 'karaoke-zero-tour-';

function key(id: TourId, suffix: 'done' | 'offered'): string {
  return `${PREFIX}${id}-${suffix}`;
}

/** Has the tour been completed at least once? */
export function isTourDone(id: TourId): boolean {
  if (typeof window === 'undefined') return false;
  return getItem(key(id, 'done')) === 'true';
}

/** Mark a tour as completed. */
export function markTourDone(id: TourId): void {
  if (typeof window === 'undefined') return;
  setItem(key(id, 'done'), 'true');
}

/** Was the first-launch auto-offer already shown for this tour? */
export function wasTourOffered(id: TourId): boolean {
  if (typeof window === 'undefined') return false;
  return getItem(key(id, 'offered')) === 'true';
}

/** Remember that the first-launch offer was shown (start or decline). */
export function markTourOffered(id: TourId): void {
  if (typeof window === 'undefined') return;
  setItem(key(id, 'offered'), 'true');
}
