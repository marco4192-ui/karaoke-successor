// META-data normalization for Ultrastar song library
// Handles internationalization of #LANGUAGE and #GENRE fields so that
// different spellings map to the same canonical category for filtering.

// ── Language normalization ──

/**
 * Maps various language spellings/misspellings to a canonical ISO-like form.
 * Keys are lowercased for case-insensitive matching.
 * The map covers common karaoke languages and frequent typos.
 */
const LANGUAGE_ALIASES: Record<string, string> = {
  // English variants
  'english': 'English',
  'eng': 'English',
  'en': 'English',
  'inglés': 'English',
  'ingles': 'English',
  'ing': 'English',
  'englisch': 'English',
  'anglais': 'English',
  'inglese': 'English',
  'ingelese': 'English',
  'englisc': 'English',
  'engilsh': 'English',
  'englsih': 'English',
  'egnlish': 'English',

  // German variants
  'german': 'German',
  'deutsch': 'German',
  'deu': 'German',
  'de': 'German',
  'allemand': 'German',
  'tedesco': 'German',
  'tysk': 'German',
  'germa': 'German',

  // French variants
  'french': 'French',
  'français': 'French',
  'francais': 'French',
  'fr': 'French',
  'französisch': 'French',
  'francese': 'French',

  // Spanish variants
  'spanish': 'Spanish',
  'español': 'Spanish',
  'espanol': 'Spanish',
  'es': 'Spanish',
  'castellano': 'Spanish',
  'espagnol': 'Spanish',
  'spagnolo': 'Spanish',
  'spanisch': 'Spanish',

  // Italian variants
  'italian': 'Italian',
  'italiano': 'Italian',
  'it': 'Italian',
  'italien': 'Italian',
  'italienisch': 'Italian',

  // Portuguese variants
  'portuguese': 'Portuguese',
  'português': 'Portuguese',
  'portugues': 'Portuguese',
  'pt': 'Portuguese',
  'portugiesisch': 'Portuguese',

  // Japanese variants
  'japanese': 'Japanese',
  'jap': 'Japanese',
  'ja': 'Japanese',
  'japanisch': 'Japanese',
  'nippon': 'Japanese',
  'nipponisch': 'Japanese',

  // Korean variants
  'korean': 'Korean',
  'ko': 'Korean',
  'kor': 'Korean',
  'koreanisch': 'Korean',
  'coreano': 'Korean',

  // Chinese variants
  'chinese': 'Chinese',
  'zh': 'Chinese',
  'chn': 'Chinese',
  'mandarin': 'Chinese',
  'cantonese': 'Chinese',
  'chinesisch': 'Chinese',

  // Dutch variants
  'dutch': 'Dutch',
  'nederlands': 'Dutch',
  'nl': 'Dutch',
  'holländisch': 'Dutch',
  'niederländisch': 'Dutch',

  // Swedish variants
  'swedish': 'Swedish',
  'svenska': 'Swedish',
  'sv': 'Swedish',
  'schwedisch': 'Swedish',

  // Norwegian variants
  'norwegian': 'Norwegian',
  'norsk': 'Norwegian',
  'no': 'Norwegian',
  'norwegisch': 'Norwegian',

  // Danish variants
  'danish': 'Danish',
  'dansk': 'Danish',
  'da': 'Danish',
  'dänisch': 'Danish',

  // Finnish variants
  'finnish': 'Finnish',
  'suomi': 'Finnish',
  'fi': 'Finnish',
  'finnisch': 'Finnish',

  // Polish variants
  'polish': 'Polish',
  'polski': 'Polish',
  'pl': 'Polish',
  'polnisch': 'Polish',

  // Russian variants
  'russian': 'Russian',
  'русский': 'Russian',
  'ru': 'Russian',
  'russisch': 'Russian',

  // Turkish variants
  'turkish': 'Turkish',
  'türkçe': 'Turkish',
  'turkce': 'Turkish',
  'tr': 'Turkish',
  'türkisch': 'Turkish',

  // Arabic variants
  'arabic': 'Arabic',
  'العربية': 'Arabic',
  'ar': 'Arabic',
  'arabisch': 'Arabic',

  // Hindi variants
  'hindi': 'Hindi',
  'hi': 'Hindi',

  // Thai variants
  'thai': 'Thai',
  'th': 'Thai',

  // Indonesian variants
  'indonesian': 'Indonesian',
  'bahasa indonesia': 'Indonesian',
  'id': 'Indonesian',

  // Brazilian Portuguese
  'brazilian': 'Portuguese',
  'brazilian portuguese': 'Portuguese',

  // Latin
  'latin': 'Latin',
  'la': 'Latin',
  'latein': 'Latin',
};

/**
 * Normalize a language string to its canonical form.
 * Case-insensitive lookup; returns the original value if no mapping found.
 */
export function normalizeLanguage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const key = trimmed.toLowerCase();
  return LANGUAGE_ALIASES[key] || trimmed;
}

// ── Genre normalization ──

/**
 * Split a genre string into individual genre entries.
 * Handles comma-separated genres (e.g., "Soundtrack, K-Pop" → ["Soundtrack", "K-Pop"]).
 * Also handles semicolons and slashes as separators.
 * Each entry is trimmed and de-duplicated.
 */
export function splitGenres(raw: string): string[] {
  if (!raw || !raw.trim()) return [];

  // Split by comma, semicolon, or slash — comma is the primary separator
  const parts = raw.split(/[,;/]/);

  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      result.push(trimmed);
    }
  }

  return result;
}

/**
 * Normalize genre names to handle common inconsistencies.
 * E.g., "k-pop" → "K-Pop", "pop rock" → "Pop Rock".
 * This is a light normalization — full canonical mapping would be too brittle
 * since users create custom genres freely.
 */
export function normalizeGenreName(genre: string): string {
  const trimmed = genre.trim();
  if (!trimmed) return trimmed;

  // Title-case each word for consistent display
  // Keep all-caps abbreviations (K-Pop, R&B, EDM, etc.)
  return trimmed
    .split(/\s+/)
    .map(word => {
      // Keep hyphenated words like K-Pop as-is
      if (word.includes('-')) {
        return word
          .split('-')
          .map(part => {
            if (part.length <= 2) return part.toUpperCase(); // K, R, B
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join('-');
      }
      // Keep short abbreviations uppercase
      if (word.length <= 3 && word.toUpperCase() === word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
