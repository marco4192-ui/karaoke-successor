import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize text content from UltraStar TXT files.
 * Strips the UTF-8 BOM (\uFEFF, common on Windows) and normalizes line endings to \n.
 * Centralized utility — all TXT parsing should use this instead of inline BOM stripping.
 */
export function normalizeTxtContent(content: string): string {
  let result = content;
  if (result.charCodeAt(0) === 0xFEFF) {
    result = result.substring(1);
  }
  return result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * MIDI ↔ frequency conversion — canonical implementations live in @/types/game
 * (alongside frequencyToMidi and midiToNoteName).
 * Re-exported here for backward compatibility with existing imports.
 */
export { midiToFrequency as midiPitchToFrequency } from '@/types/game';

/** Shuffle an array using Fisher-Yates algorithm (returns new array). */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a random alphanumeric code of the given length.
 * @param length  Number of characters in the code.
 * @param chars   Character pool to draw from (defaults to unambiguous alphanumerics).
 *
 * Two presets are provided as named constants for common use-cases:
 * - COMPANION_CODE_CHARS: 30 chars, excludes 0/O/1/I to avoid user confusion (mobile companion codes).
 * - FULL_CODE_CHARS: 36 chars, full alphanumeric (battle-royale game codes).
 */
export const COMPANION_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const FULL_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateCode(length: number, chars: string = COMPANION_CODE_CHARS): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
