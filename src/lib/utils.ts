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
 * Convert a MIDI pitch number to its frequency in Hz.
 * Uses the standard equal-temperament tuning: A4 = 440 Hz = MIDI note 69.
 */
export function midiPitchToFrequency(pitch: number): number {
  return 440 * Math.pow(2, (pitch - 69) / 12);
}

/** Shuffle an array using Fisher-Yates algorithm (returns new array). */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
