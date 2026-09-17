// META-data normalization for Ultrastar song library
// Handles internationalization of #LANGUAGE and #GENRE fields so that
// different spellings map to the same canonical category for filtering.

import { GENRES as CANONICAL_GENRE_LIST } from '@/lib/constants';

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
  '日本語': 'Japanese',
  '日本': 'Japanese',

  // Korean variants
  'korean': 'Korean',
  'ko': 'Korean',
  'kor': 'Korean',
  'koreanisch': 'Korean',
  'coreano': 'Korean',
  '한국어': 'Korean',
  '한국': 'Korean',

  // Chinese variants
  'chinese': 'Chinese',
  'zh': 'Chinese',
  'chn': 'Chinese',
  'mandarin': 'Chinese',
  'cantonese': 'Chinese',
  'chinesisch': 'Chinese',
  '中文': 'Chinese',
  '汉语': 'Chinese',
  '普通话': 'Chinese',
  '中国語': 'Chinese',

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
 * Parenthetical additions ("German (modern)", "English (US)") are stripped —
 * the canonical value is always the bare language name.
 */
export function normalizeLanguage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  // Strip parenthetical additions BEFORE alias lookup so
  // "deutsch (neu)" → "deutsch" → "German"
  const withoutParens = trimmed.replace(/\([^)]*\)/g, ' ').trim();
  const key = withoutParens.toLowerCase();
  return LANGUAGE_ALIASES[key] || (withoutParens || trimmed);
}

// ── Mixed-language handling (user item 12 — Language Harmonization) ──────

/**
 * Language separators that indicate a genuinely multilingual song.
 * "German/English", "de+en", "Französisch & Englisch", "German, English".
 */
const LANGUAGE_SEPARATORS = /\s*[/+&,]\s*/;

/**
 * Normalize a language value that may describe a MULTILINGUAL song.
 *
 * User rules (item 12):
 *  - Mixed-language songs are shown with BOTH languages, joined by "/"
 *    (e.g. "German/English") — each part normalized to its canonical
 *    English name.
 *  - Any parenthetical additions ("German (with English parts)",
 *    "English (US)") are ALWAYS removed.
 *  - Duplicates collapse; the first mentioned language leads.
 *  - Everything that is not a known language keeps its (trimmed) raw form
 *    as a single part — never silently dropped.
 */
export function normalizeLanguageMixed(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  // Always remove parenthetical additions first
  const withoutParens = trimmed.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (!withoutParens) return trimmed;

  const parts = withoutParens
    .split(LANGUAGE_SEPARATORS)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => normalizeLanguage(part));

  if (parts.length === 0) return trimmed;

  // Dedupe (case-insensitive), preserve first-mention order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }

  return unique.join('/');
}

// ── Genre normalization ──

/**
 * Deterministic sub-genre → canonical-genre aliases (user item 12).
 * Keys are lowercased; values MUST exist in GENRES (src/lib/constants.ts)
 * so harmonized values always match the filter dropdowns.
 */
const GENRE_ALIASES: Record<string, string> = {
  // Pop family
  'bubblegum pop': 'Pop', 'dance pop': 'Pop', 'synthpop': 'Pop',
  'synth-pop': 'Pop', 'electropop': 'Pop', 'indie pop': 'Pop',
  'art pop': 'Pop', 'bedroom pop': 'Pop', 'europop': 'Pop',
  'teen pop': 'Pop', 'power pop': 'Pop', 'pop rock': 'Pop',
  'deutschpop': 'Schlager', 'deutsch-pop': 'Schlager',
  'austropop': 'Schlager', 'neue deutsche welle': 'Schlager', 'ndw': 'Schlager',

  // Rock family
  'alternative rock': 'Rock', 'classic rock': 'Rock', 'progressive rock': 'Rock',
  'prog rock': 'Rock', 'hard rock': 'Rock',
  'grunge': 'Rock', 'soft rock': 'Rock', 'arena rock': 'Rock',
  'indie rock': 'Rock', 'folk rock': 'Folk', 'gothic rock': 'Rock',
  'post-grunge': 'Rock', 'glam rock': 'Rock', 'psychedelic rock': 'Rock',

  // Metal family
  'heavy metal': 'Metal', 'death metal': 'Metal', 'black metal': 'Metal',
  'thrash metal': 'Metal', 'power metal': 'Metal', 'nu metal': 'Metal',
  'metalcore': 'Metal', 'hair metal': 'Metal', 'symphonic metal': 'Metal',

  // Punk family
  'post-punk': 'Punk', 'emo': 'Punk', 'screamo': 'Punk',
  'pop punk': 'Punk', 'hardcore punk': 'Punk', 'street punk': 'Punk',

  // Electronic family
  'dance': 'Electronic', 'edm': 'Electronic', 'techno': 'Electronic',
  'house': 'Electronic', 'deep house': 'Electronic', 'trance': 'Electronic',
  'drum and bass': 'Electronic', 'drum & bass': 'Electronic', 'dnb': 'Electronic',
  'dubstep': 'Electronic', 'ambient': 'Electronic', 'electro': 'Electronic',
  'eurodance': 'Electronic', 'big beat': 'Electronic', 'downtempo': 'Electronic',

  // R&B / Soul / Funk family
  'contemporary r&b': 'R&B', 'neo soul': 'Soul', 'new jack swing': 'R&B',
  'rhythm and blues': 'R&B', 'r&b/soul': 'R&B', 'motown': 'Soul',

  // Rap family (main category — 'Hip-Hop' stays as an alias of 'Rap')
  'rap': 'Rap', 'hip hop': 'Rap', 'hip-hop': 'Rap', 'hiphop': 'Rap',
  'trap': 'Rap', 'gangsta rap': 'Rap', 'old school rap': 'Rap', 'drill': 'Rap',
  'west coast hip-hop': 'Rap', 'east coast hip-hop': 'Rap',

  // Jazz subsumed by 'R&B' (main-category harmonization — jazz is no main category)
  'jazz': 'R&B', 'vocal jazz': 'R&B', 'smooth jazz': 'R&B', 'bebop': 'R&B',
  'swing': 'R&B', 'big band': 'R&B', 'jazz fusion': 'R&B',
  'delta blues': 'Blues', 'electric blues': 'Blues', 'rhythm and blues blues': 'Blues',

  // Country / Folk family
  'country pop': 'Country', 'outlaw country': 'Country', 'bro-country': 'Country',
  'modern country': 'Country', 'nashville sound': 'Country',
  'indie folk': 'Folk', 'americana': 'Folk', 'bluegrass': 'Folk',
  'singer-songwriter': 'Folk', 'liedermacher': 'Folk', 'folkpop': 'Folk',

  // Latin family
  'reggaeton': 'Latin', 'latin pop': 'Latin', 'bachata': 'Latin',
  'salsa': 'Latin', 'cumbia': 'Latin', 'merengue': 'Latin',
  'rumba': 'Latin', 'tango': 'Latin', 'latin rock': 'Latin',

  // Reggae family
  'reggae fusion': 'Reggae', 'dub': 'Reggae', 'roots reggae': 'Reggae',
  'dancehall': 'Reggae', 'ska': 'Reggae',

  // Musical / Soundtrack / Classical
  'musicals': 'Musical', 'showtunes': 'Musical', 'broadway': 'Musical',
  'film music': 'Soundtrack', 'movie soundtrack': 'Soundtrack',
  'game soundtrack': 'Soundtrack', 'score': 'Soundtrack', 'filmscore': 'Soundtrack',
  // TV = TV themes / series tunes → Soundtrack in the widest sense (user
  // decision: "technisch geht es bei TV um TV Themes und das sind ja
  // Soundtracks im weitesten Sinn")
  'tv': 'Soundtrack', 'television': 'Soundtrack', 'tv theme': 'Soundtrack',
  'tv themes': 'Soundtrack', 'tv-tunes': 'Soundtrack', 'tvtunes': 'Soundtrack',
  'opera': 'Classical', 'operette': 'Classical', 'klassik': 'Classical',
  'klassische musik': 'Classical', 'crossover classical': 'Classical',

  // Disney (user request R4 — dedicated category, wins over Soundtrack)
  'disney': 'Disney', 'walt disney': 'Disney', 'disney songs': 'Disney',
  'disney classics': 'Disney', 'disney music': 'Disney',
  'disney soundtrack': 'Disney', 'disney film': 'Disney',
  'disney-park': 'Disney', 'walt-disney': 'Disney',

  // Children's
  'children': "Children's", 'kindermusik': "Children's", 'kinderlied': "Children's",
  'kinderlieder': "Children's", 'kids': "Children's", 'childrens': "Children's",

  // Gap closure — frequent Deezer/MusicBrainz genres that previously fell
  // through the alias map and survived as "freak genres" in the filters.
  // Deterministic so the factual lookup results map cleanly without LLM.
  'disco': 'Electronic', 'amapiano': 'Electronic', 'alternative': 'Rock',
  'blues rock': 'Rock',
  'rock and roll': 'Rock', "rock 'n' roll": 'Rock', "rock'n'roll": 'Rock',
  'rock n roll': 'Rock', 'rock & roll': 'Rock', 'rock&roll': 'Rock',
  'gospel': 'Soul', 'ballad': 'Pop', 'adult contemporary': 'Pop',
  'traditional pop': 'Pop', 'variété française': 'Pop', 'variete francaise': 'Pop',
  'singer/songwriter': 'Folk', 'world': 'Folk', 'world music': 'Folk',
  'new age': 'Classical', 'gregorian': 'Classical', 'gregorian chant': 'Classical',
  'easy listening': 'R&B',

  // Regional pop families (kept distinct per harmonization hints)
  'j-rock': 'Rock', 'jpop': 'J-Pop', 'kpop': 'K-Pop', 'k-pop': 'K-Pop',
  'afrobeats': 'Pop', 'afro pop': 'Pop',
  'chanson': 'Folk', 'canzone': 'Pop', 'italopop': 'Pop', 'volkslied': 'Volksmusik',

  // ── User library round ("Rule-based Harmonize: dünne Datenbasis") ──
  // ~90 distinct genre tags from the user's actual library, mapped to the 23
  // main genres with logical parent rules. Hyphen spellings are written as
  // they appear in the library; the canonicalizeGenre lookup ALSO tries the
  // hyphen↔space variant, so both spellings resolve.
  'punk rock': 'Punk', // was Rock — punk is the logical parent (matches pop punk → Punk)
  'dance-pop': 'Pop', 'dance-punk': 'Punk', 'pop-punk': 'Punk', 'pop-rock': 'Pop',

  'alternative folk': 'Folk', 'alternative metal': 'Metal', 'alternative pop': 'Pop',
  'alternative r&b': 'R&B',
  'après-ski': 'Schlager', 'apres-ski': 'Schlager', 'ballermann': 'Schlager',
  'italo schlager': 'Schlager', 'german pop': 'Pop',
  'britpop': 'Rock', 'shoegaze': 'Rock', 'melodic rock': 'Rock', 'synth-rock': 'Rock',
  'industrial metal': 'Metal', 'progressive metal': 'Metal', 'nu-metal': 'Metal',
  'garage punk': 'Punk', 'general punk': 'Punk', 'post-hardcore': 'Punk',
  'post-punk revival': 'Punk', 'hardcore': 'Punk',
  'rap-rock': 'Rock', 'hyperpop': 'Pop',
  'bossa': 'Latin', 'bossa nova': 'Latin', 'reguetón': 'Latin', 'regueton': 'Latin',
  'electric': 'Electronic', 'electronica': 'Electronic', 'eurobeat': 'Electronic',
  'french house': 'Electronic', 'funky house': 'Electronic', 'italo house': 'Electronic',
  'italo-disco': 'Electronic', 'hardstyle': 'Electronic', 'happy hardcore': 'Electronic',
  'memestep': 'Electronic', 'trip hop': 'Electronic',
  'folk-pop': 'Folk', 'free jazz': 'R&B', 'psychedelic soul': 'Soul',
  'urban': 'R&B',
};

/**
 * Seasonal easter-egg genres ("Christmas", "Weihnachten", "Xmas", "Noël"…).
 *
 * These are PROTECTED from every form of harmonization: the December-only
 * 🎄 library filter recognizes songs partly via the genre field
 * (CHRISTMAS_GENRE_PATTERN in src/lib/seasonal.ts). Mapping "Christmas" →
 * "Pop" would silently remove those songs from the seasonal filter and
 * thereby break the easter egg (user decision, harmonize feedback round).
 * The pattern mirrors seasonal.ts so both stay in sync.
 */
const SEASONAL_GENRE_PATTERN = /(christmas|x-?mas|weihnacht|no[eë]l|navidad|natale)/i;

/** True when the genre is a seasonal easter-egg genre that must NEVER be
 *  changed by harmonization (auto alias rules AND manual review list). */
export function isSeasonalProtectedGenre(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  // Only the bare seasonal value is protected — combined values like
  // "Christmas Pop" are still normal genre data and may be harmonized.
  return SEASONAL_GENRE_PATTERN.test(normalizeGenreLookupKey(trimmed))
       && !/[,/]/.test(trimmed);
}

/**
 * Pseudo-genres that carry NO usable genre information (vocal style, era,
 * source medium, descriptor, AI tag…). They are deliberately NOT auto-mapped:
 * the rule harmonizer surfaces them in the manual correction list instead
 * (user request: "bei solchen Unstimmigkeiten eine Liste auswerfen und eine
 * manuelle Korrektur anbieten").
 *
 * Seasonal genres (Christmas…) are NOT in this list — they are protected
 * entirely (see isSeasonalProtectedGenre) and must not even show up in the
 * manual correction list, otherwise applying a correction would break the
 * December easter egg.
 */
const UNMAPPABLE_GENRE_KEYS = new Set([
  'a cappella', 'acapella', 'ai', 'a.i.', 'oldies', 'female vocals',
  'male vocals', 'comedy', 'holiday', 'indie', 'unknown', 'other',
  'misc', 'various', 'sonstiges', 'unbekannt', 'n/a', 'none',
]);

/** True when the genre is a known pseudo-genre (vocal style / era / medium)
 *  that must be corrected MANUALLY instead of via alias rules. */
export function isUnmappableGenre(raw: string): boolean {
  const key = normalizeGenreLookupKey(raw);
  if (!key) return false;
  return UNMAPPABLE_GENRE_KEYS.has(key) || UNMAPPABLE_GENRE_KEYS.has(key.replace(/-/g, ' '));
}

/** Normalize a genre string into the alias-table key form: lowercase,
 *  dashes unified to plain hyphens, whitespace collapsed. */
function normalizeGenreLookupKey(value: string): string {
  return value
    .replace(/[\u2010-\u2015]/g, '-') // unicode dashes → hyphen
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Canonicalize a genre value (user item 12 — Genre Harmonization):
 *  1. Strip parenthetical additions ("Pop (80s)" → "Pop")
 *  2. Take the first genre when comma-separated ("Pop, Rock" → "Pop" —
 *     Ultrastar #GENRE is a single value; the harmonize suggestion picks
 *     the dominant one)
 *  3. Map sub-genres/aliases to the canonical GENRES list
 *  4. Unknown values fall back to light title-casing (never dropped)
 */
export function canonicalizeGenre(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  // Strip parenthetical additions
  let value = trimmed.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (!value) return normalizeGenreName(trimmed);

  // Comma-separated: keep the primary (first) genre
  if (/[,;]/.test(value)) {
    value = value.split(/[,;]/)[0].trim();
  }

  // Alias lookup with hyphen↔space variants: "Dance-Pop" and "Dance Pop"
  // resolve to the same alias entry (user library uses both spellings —
  // previously hyphenated tags fell through the map untouched).
  const key = normalizeGenreLookupKey(value);
  const canonical =
    GENRE_ALIASES[key] ??
    GENRE_ALIASES[key.replace(/-/g, ' ')] ??
    GENRE_ALIASES[key.replace(/ /g, '-')];
  if (canonical) return canonical;

  // Exact canonical match (case-insensitive) → proper casing
  const genres = CANONICAL_GENRE_LIST;
  const exact = genres.find(g => g.toLowerCase() === key);
  if (exact) return exact;

  return normalizeGenreName(value);
}

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
