/**
 * Fuzzy search utility for tolerant string matching.
 * Uses Levenshtein distance to find matches even with typos.
 * 
 * Examples:
 *   "Quen" matches "Queen" (1 edit: missing 'e')
 *   "Koldplay" matches "Coldplay" (1 edit: K→C)
 *   "Coldpay" matches "Coldplay" (1 edit: missing 'l')
 */

/**
 * Computes the Levenshtein distance between two strings.
 * Returns the minimum number of single-character edits (insertions, deletions, substitutions)
 * required to change one string into the other.
 */
function levenshtein(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;

  // Fast path: empty strings
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  // Use single array for space optimization
  let prev = new Array(lenB + 1);
  let curr = new Array(lenB + 1);

  for (let j = 0; j <= lenB; j++) prev[j] = j;

  for (let i = 1; i <= lenA; i++) {
    curr[0] = i;
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lenB];
}

/**
 * Returns the maximum allowed edit distance for a given query length.
 * Shorter queries get a tighter threshold, longer queries allow more edits.
 */
function getMaxDistance(queryLength: number): number {
  if (queryLength < 3) return 0; // Too short for fuzzy matching
  if (queryLength <= 4) return 1;
  if (queryLength <= 7) return 2;
  return Math.min(Math.ceil(queryLength * 0.35), 4);
}

/**
 * Checks if a fuzzy match exists between query and text.
 * Uses a multi-strategy approach:
 * 1. Exact substring match (case-insensitive) — best result
 * 2. Levenshtein distance against individual words — handles typos in word boundaries
 * 3. Levenshtein distance against the full text — handles overall similarity
 * 
 * @returns true if the query matches the text (either exactly or fuzzily)
 */
export function fuzzyMatch(query: string, text: string): boolean {
  if (!query || !text) return false;

  const lowerQuery = query.toLowerCase().trim();
  const lowerText = text.toLowerCase().trim();

  if (lowerQuery.length === 0) return true;
  if (lowerText.length === 0) return false;

  // Strategy 1: Exact substring match (fast path, zero tolerance)
  if (lowerText.includes(lowerQuery)) return true;

  // Fuzzy matching only for queries of length >= 3
  if (lowerQuery.length < 3) return false;

  const maxDist = getMaxDistance(lowerQuery.length);

  // Strategy 2: Match against individual words in the text
  // This handles cases like "Koldplay" matching the word "Coldplay" in "Coldplay - Viva La Vida"
  const words = lowerText.split(/[\s\-–—_(),.:/]+/);
  for (const word of words) {
    if (word.length === 0) continue;

    // Skip very short words (articles, prepositions)
    if (word.length < 3) continue;

    const dist = levenshtein(lowerQuery, word);
    if (dist <= maxDist) return true;

    // Also check if the query is a prefix of a word (with one edit tolerance)
    // e.g., "Col" should match "Coldplay"
    if (lowerQuery.length < word.length) {
      const prefixDist = levenshtein(lowerQuery, word.substring(0, lowerQuery.length + 1));
      if (prefixDist <= 1) return true;
    }
  }

  // Strategy 3: Match query against the full text (for short titles/artists)
  // Only if the text isn't much longer than the query
  if (lowerText.length <= lowerQuery.length * 2.5) {
    const fullDist = levenshtein(lowerQuery, lowerText);
    if (fullDist <= maxDist) return true;
  }

  return false;
}

/**
 * Filters an array of songs using fuzzy search across multiple fields.
 * Matches against title, artist, genre, and album.
 */
export function fuzzyFilterSongs<T extends {
  title: string;
  artist: string;
  genre?: string | null;
  album?: string | null;
}>(songs: T[], query: string): T[] {
  if (!query.trim()) return songs;

  return songs.filter(song =>
    fuzzyMatch(query, song.title) ||
    fuzzyMatch(query, song.artist) ||
    (song.genre && fuzzyMatch(query, song.genre)) ||
    (song.album && fuzzyMatch(query, song.album))
  );
}
