import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a unique ID with an optional prefix.
 * Uses crypto.randomUUID() for collision-free 128-bit random IDs.
 */
export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
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

/** Shuffle an array using Fisher-Yates algorithm (returns new array). */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
