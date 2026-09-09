/**
 * Seasonal easter-egg filters (user-approved item 12 follow-up):
 *
 * The library genre dropdown gains a "🎄 Christmas" entry that ONLY appears
 * in December (or when forced via `?xmas=1` for testing/preview). Christmas
 * is deliberately NOT a canonical genre — Christmas songs keep their real
 * genre (Pop, Rock, Folk, …) and this filter recognizes them via a
 * high-precision title/genre heuristic instead.
 */

/** Sentinel value for settings.filterGenre — never collides with real genres. */
export const CHRISTMAS_FILTER_VALUE = '__christmas__';

/**
 * High-precision title patterns (DE/EN/FR/ES/IT + classics).
 * Precision over recall: a false positive shows a non-seasonal song in
 * December, which is worse than missing an obscure carol. Bare words like
 * "snow" or "santa" are intentionally excluded (Snow Patrol, Santa Monica).
 */
const CHRISTMAS_TITLE_PATTERNS: RegExp[] = [
  // Core international keywords
  /christmas|x-?mas|weihnachts?/,
  /merry (christmas|xmas)|happy xmas|white christmas/,
  /feliz navidad|douce nuit|astro del ciel|petit pa(pa)? no[eë]l/,
  // Standards & modern pop classics
  /jingle bells|jingle bell rock|sleigh ride|deck the halls|little drummer boy/,
  /carol of the bells|twelve days of|12 days of|wonderful christmastime/,
  /winter wonderland|let it snow|do they know it'?s christmas|last christmas/,
  /driving home for christmas|all i want for christmas|mistletoe|santa claus/,
  /santa baby|santa tell me|rudolph|rudolf the red/,
  // German classics
  /stille nacht|silent night|o tannenbaum|oh christmas tree/,
  /o du fr[oö]hliche|tochter zion|alle jahre wieder|ihr kinderlein kommet/,
  /leise rieselt der schnee|schneefl[oö]ckchen|vom himmel hoch|ros entsprungen/,
  /glocken nie klingen|macht hoch die t[uü]r/,
  // Advent (word boundary — must not match "adventure")
  /\badvent\b/,
];

/** Genre-field fallback: libraries that kept a literal Christmas-ish genre. */
const CHRISTMAS_GENRE_PATTERN = /(christmas|x-?mas|weihnacht|no[eë]l|navidad|natale)/i;

/** True when the song is recognizable as a Christmas/Advent song. */
export function isChristmasSong(song: { title?: string | null; genre?: string | null }): boolean {
  const title = (song.title || '').toLowerCase();
  if (title && CHRISTMAS_TITLE_PATTERNS.some((re) => re.test(title))) return true;
  if (song.genre && CHRISTMAS_GENRE_PATTERN.test(song.genre)) return true;
  return false;
}

/** December check (month 11, 0-based). Injectable date for determinism. */
export function isDecember(date: Date = new Date()): boolean {
  return date.getMonth() === 11;
}

/**
 * Whether the seasonal Christmas filter should be offered in the UI.
 * Client-only by design (called from effects, never during SSR render, so
 * no hydration mismatch when server/client timezones straddle a month edge).
 * `?xmas=1` forces it on for preview/testing outside December.
 */
export function isChristmasSeasonEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('xmas') === '1') return true;
  } catch {
    // URL parsing is best-effort
  }
  return isDecember();
}
