// META-data normalization for Ultrastar song library
// Handles internationalization of #LANGUAGE and #GENRE fields so that
// different spellings map to the same canonical category for filtering.

import { GENRES as CANONICAL_GENRE_LIST } from '@/lib/constants';
import { customTaxonomy } from '@/lib/game/custom-taxonomy';

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
 *
 * Custom user-defined languages (R20 "Genres & Languages" settings): when no
 * built-in alias matches, an exact (case-insensitive) match against the
 * custom list wins and returns the properly-cased custom entry
 * ("bavarian" → "Bavarian"). API routes pass their request-body list as
 * `extraLanguages` because they cannot read localStorage.
 */
export function normalizeLanguage(raw: string, extraLanguages?: string[]): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  // Strip parenthetical additions BEFORE alias lookup so
  // "deutsch (neu)" → "deutsch" → "German"
  const withoutParens = trimmed.replace(/\([^)]*\)/g, ' ').trim();
  const key = withoutParens.toLowerCase();
  const alias = LANGUAGE_ALIASES[key];
  if (alias) return alias;

  // Custom languages (user-defined vocabulary) — exact match, proper casing
  const extras = extraLanguages ?? customTaxonomy.getCustomLanguages();
  const extraMatch = extras.find(l => l.toLowerCase() === key);
  if (extraMatch) return extraMatch;

  return withoutParens || trimmed;
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
 *
 * `extraLanguages` (R20): custom user-defined languages, honored per part
 * (API routes forward them from the request body; client-side callers get
 * them automatically from the custom-taxonomy store).
 */
export function normalizeLanguageMixed(raw: string, extraLanguages?: string[]): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  // Always remove parenthetical additions first
  const withoutParens = trimmed.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (!withoutParens) return trimmed;

  const parts = withoutParens
    .split(LANGUAGE_SEPARATORS)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => normalizeLanguage(part, extraLanguages));

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

  // ── R47: complete Ultrastar-DB genre inventory (upload/Genres.txt) ──────
  // The user catalogued EVERY genre tag used across the known Ultrastar
  // databases (~640 distinct values incl. casing/spacing variants and
  // typos like "Ghotic Metal", "Soundrack", "Reggee"). Everything below
  // maps into the 23 canonical main genres with logical-parent rules
  // (suffix wins: X-Rock→Rock, X-Metal→Metal, X-Punk→Punk, X-Pop→Pop —
  // EXCEPT where an earlier round decided otherwise, e.g. pop rock→Pop).
  // The lookup is case-insensitive and tries hyphen↔space variants, so
  // ONE spelling per pair suffices ("art pop" also catches "Art-Pop").
  // Diacritics are NOT stripped by the lookup — accented spellings get
  // their own entries ("reggaetón" AND "reggaeton"). Borderline tags are
  // marked "// → ASK": the open questions went to the user with R47 and
  // can be flipped here when answered.

  // Pop family
  'adult alternative pop': 'Pop', 'alt-pop': 'Pop', 'ambient pop': 'Pop',
  'baroque pop': 'Pop', 'chamber pop': 'Pop', 'chanson française': 'Pop',
  'cinematic pop': 'Pop', 'classic male vocal pop': 'Pop',
  'classic pop-rock': 'Pop', 'c-pop': 'Pop', 'disco-pop': 'Pop',
  'dream pop': 'Pop', 'electro pop': 'Pop', 'electronic pop': 'Pop',
  'acoustic pop': 'Pop', 'pop folk': 'Folk',
  'euro pop': 'Pop', 'experimental pop': 'Pop', 'french pop': 'Pop',
  'general pop vocal': 'Pop', 'instrumental pop': 'Pop',
  'israeli pop': 'Pop', 'italian pop': 'Pop', 'jangle pop': 'Pop',
  'jazz pop': 'Pop', 'new pop': 'Pop', 'new romantic': 'Pop',
  'new wave': 'Pop', 'new wave pop': 'Pop', 'new wave quirk': 'Pop',
  'pop ballad': 'Pop', 'pop dance': 'Pop', 'pop-rock oldies': 'Pop',
  'pop standards': 'Pop', 'pop eléctrico': 'Pop', 'pop electrico': 'Pop',
  'power ballad': 'Pop', 'progressive pop': 'Pop', 'psychedelic pop': 'Pop',
  'rock-pop': 'Pop', 'sophisti pop': 'Pop', 'suomi-pop': 'Pop',
  'synthie pop': 'Pop', 'techno pop': 'Pop', 'tecnopop': 'Pop',
  'teenie-stars': 'Pop', 'twee pop': 'Pop', 'variete': 'Pop',
  'variété': 'Pop', 'vocal pop': 'Pop', 'western-pop': 'Pop',
  'variete française': 'Pop', // Misch-Schreibweise ohne é in "variete"
  'city pop': 'J-Pop', // → ASK: japanische 80er-Pop-Ära (alternativ Pop)

  // Rock family
  'adult alternative': 'Rock', 'art rock': 'Rock', 'beat': 'Rock',
  'acoustic rock': 'Rock', 'acoustic folk': 'Folk', 'psychedelic folk': 'Folk',
  'boogie rock': 'Rock', 'comedy rock': 'Rock', 'dark rock': 'Rock',
  'dark wave': 'Rock', 'darkwave': 'Rock', 'coldwave': 'Rock',
  'dance rock': 'Rock', 'disco rock': 'Rock', 'doo-wop': 'Rock',
  'doo wop rock & roll': 'Rock', 'electro rock': 'Rock',
  'electronic rock': 'Rock', 'experimental rock': 'Rock',
  'funk rock': 'Rock', 'garage rock': 'Rock', 'garage rock revival': 'Rock',
  'general alternative rock': 'Rock', 'general mainstream rock': 'Rock',
  'glam': 'Rock', 'glamrock': 'Rock', 'goth': 'Rock', 'goth rock': 'Rock',
  'gothic': 'Rock', 'grebo': 'Rock', 'industrial rock': 'Rock',
  'madchester': 'Rock', 'merseybeat': 'Rock', 'mod revival': 'Rock',
  'mundart rock': 'Rock', 'new artrock': 'Rock', 'neo-psychedelia': 'Rock',
  'neo-psychedelic': 'Rock', 'noise pop': 'Rock', 'noise rock': 'Rock',
  'ost-rock': 'Rock', 'piano rock': 'Rock', 'post-britpop': 'Rock',
  'post-rock': 'Rock', 'psychedelic': 'Rock', 'psychadelic': 'Rock',
  'pub rock': 'Rock', 'rock & metal': 'Rock', 'rock alternative': 'Rock',
  'rock ballad': 'Rock', 'rock catalan': 'Rock', 'rock celtic': 'Rock',
  'rock indie': 'Rock', 'rock industrial': 'Rock', "rock 'n roll": 'Rock',
  'rock psicodelico': 'Rock', 'rockabilly': 'Rock', 'shagadelic rock': 'Rock',
  'shoegazing': 'Rock', 'ska rock': 'Rock', 'slowcore': 'Rock',
  'southern': 'Rock', 'southern rock': 'Rock', 'stoner rock': 'Rock',
  'surf rock': 'Rock', 'symphonic rock': 'Rock',
  'symphonic-rock-cover': 'Rock', 'visual kei': 'Rock', 'wave': 'Rock',
  'west coast rock': 'Rock', 'yacht rock': 'Rock', 'deutsch-rock': 'Rock',
  'deutschrock': 'Rock', 'deutsch rock pop': 'Rock',
  'mittelalter-rock': 'Rock', 'modern hard rock': 'Rock',
  'christian rock': 'Rock',
  'grog\'n roll': 'Rock', // → ASK: Joke-Tag (Piraten-Rock)
  'sprock': 'Rock', // → ASK: unklare Bedeutung (Space/Prog-Rock?)
  'belgium drunk': 'Punk', // → ASK: belgische Drunk-Punk-Party-Musik
  'hard rock & metal': 'Rock',

  // Metal family
  'christian metal': 'Metal', 'classic british metal': 'Metal',
  'country metal': 'Metal', 'death': 'Metal', 'doom': 'Metal',
  'doom metal': 'Metal', 'epic metal': 'Metal', 'folk metal': 'Metal',
  'fun metal': 'Metal', 'general heavy metal': 'Metal',
  'general metal': 'Metal', 'ghotic metal': 'Metal', // Typo: gothic
  'grindcore': 'Metal', 'groove metal': 'Metal',
  'melodic death metal': 'Metal', 'melodic metalcore': 'Metal',
  'melodic modern metal': 'Metal', 'metal ballad': 'Metal',
  'metal ballads': 'Metal', 'mittelalter-metal': 'Metal',
  'modern metal': 'Metal', 'new metal': 'Metal', 'nwobhm': 'Metal',
  'pirate metal': 'Metal', 'rap metal': 'Metal', 'rapcore': 'Metal',
  'sinfonic metal': 'Metal', // Typo: symphonic
  'sludge metal': 'Metal', 'space metal': 'Metal', 'speed metal': 'Metal',
  'stoner metal': 'Metal', 'symphonic black metal': 'Metal',
  'symphonic gothic metal': 'Metal', 'symphonic power metal': 'Metal',
  'tanzmetal': 'Metal', 'trash metal': 'Metal', // Typo: thrash
  'true metal': 'Metal', 'us metal': 'Metal', 'viking': 'Metal',
  'funk metal': 'Metal', 'glam metal': 'Metal', 'gothic metal': 'Metal',
  'wiking metal': 'Metal', // Typo: viking
  'neue deutsche harte': 'Metal', 'neue deutsche härte': 'Metal',
  'christian hard rock': 'Rock',

  // Punk family
  'antifa': 'Punk', 'art punk': 'Punk', 'celtic punk': 'Punk',
  'emo rock': 'Punk', 'folk punk': 'Punk', 'melodic hardcore': 'Punk',
  'oi': 'Punk', 'oi !- punk': 'Punk', 'oi punk': 'Punk',
  'proto-punk': 'Punk', 'punk pop': 'Punk', 'punkrock': 'Punk',
  'ska punk': 'Punk', 'skate punk': 'Punk',

  // Electronic family
  'acid house': 'Electronic', 'alternative dance': 'Electronic',
  'alternative trance': 'Electronic', 'ambiance': 'Electronic',
  'breakbeat': 'Electronic', 'breaks': 'Electronic', 'chillout': 'Electronic',
  'chillwave': 'Electronic', 'club': 'Electronic', 'dark beat': 'Electronic',
  'dance & dj': 'Electronic', 'dance & house': 'Electronic',
  'dance electronic': 'Electronic', 'dance/electronic': 'Electronic',
  'general club dance': 'Electronic', 'general house': 'Electronic',
  'general trance': 'Electronic',
  'denpa': 'Electronic', // → ASK: japanisches Nerd-Electro
  'disco fox': 'Electronic', // → ASK: alternativ Schlager
  'disco hi-nrg': 'Electronic', 'hi-nrg': 'Electronic',
  'disco house': 'Electronic', 'disco music': 'Electronic',
  'disco polo': 'Electronic', // → ASK: alternativ Schlager
  'euro dance': 'Electronic', 'eurodisco': 'Electronic',
  'electro house': 'Electronic', 'electro swing': 'Electronic',
  'electro-mashup': 'Electronic', 'electroclash': 'Electronic',
  'electrodance': 'Electronic', 'electronic dance': 'Electronic',
  'folktronica': 'Electronic', 'frenchcore': 'Electronic',
  'french electro': 'Electronic', 'future bass': 'Electronic',
  'future funk': 'Electronic', 'future groove': 'Electronic',
  'glitch hop': 'Electronic', 'hard bass': 'Electronic',
  'hauntology': 'Electronic', // → ASK
  'hip house': 'Electronic', 'indie dance': 'Electronic',
  'indie electronic': 'Electronic', 'indietronica': 'Electronic',
  'industrial': 'Electronic', 'italo': 'Electronic', 'italo dance': 'Electronic',
  'j-core': 'Electronic', 'leftfield': 'Electronic', 'lo-fi': 'Electronic',
  'melodic house': 'Electronic', 'melodic techno': 'Electronic',
  'minimal synth': 'Electronic', 'minimal wave': 'Electronic',
  'new rave': 'Electronic', 'nu trance': 'Electronic', 'nu-disco': 'Electronic',
  'plunderphonics': 'Electronic', // → ASK
  'post-disco': 'Electronic', 'progressive house': 'Electronic',
  'proto-industrial': 'Electronic', 'psychedelic trance': 'Electronic',
  'rave': 'Electronic', 'sampledelia': 'Electronic', 'synth': 'Electronic',
  'funky breaks': 'Electronic', 'swing house': 'Electronic',
  'synthwave': 'Electronic', 'tech house': 'Electronic',
  'tropical house': 'Electronic', 'uk garage': 'Electronic',
  "drum'n'bass": 'Electronic',
  'elektro lore': 'Electronic', // → ASK: unklarer Tag
  'alpen-jazz-techno': 'Electronic', // → ASK: Alpin-Party-Techno

  // R&B / Soul / Funk / Blues / Jazz family (Jazz subsumed by R&B)
  'acid jazz': 'R&B', 'alt r&b': 'R&B', 'fusion': 'R&B',
  'rhythm & blues': 'R&B',
  'hip hop soul': 'R&B', 'jazz-rock': 'R&B', 'new jazz swing': 'R&B',
  'r&b pop': 'R&B', 'r&b rock': 'R&B', 'urban crossover': 'R&B',
  'urban pop': 'R&B', 'general easy listening': 'R&B', 'lounge': 'R&B',
  'blue-eyed soul': 'Soul', 'funk soul': 'Soul', 'pop soul': 'Soul',
  'r&b gospel': 'Soul', 'soul pop': 'Soul', 'urban soul': 'Soul',
  'soul & funk': 'Soul', 'worship': 'Soul', // → ASK: Gospel-Familie
  'christian': 'Soul', // → ASK: stil-agnostisch (alternativ manuell)
  'contemporary christian': 'Soul', // → ASK
  'papiez': 'Soul', // → ASK: polnische religiöse Lieder
  'christian & gospel': 'Soul', 'christian music': 'Soul',
  'boogie': 'Funk', 'ballad blues': 'Blues', 'punk blues': 'Blues',

  // Rap family
  'boom bap': 'Rap', 'cyberrap': 'Rap', 'deutsch hip-hop': 'Rap',
  'deutschrap': 'Rap', 'electro hop': 'Rap', 'electrohop': 'Rap',
  'experimental hip hop': 'Rap', 'german hip-hop': 'Rap', 'pop rap': 'Rap',
  'porno-rap': 'Rap', 'southern rap': 'Rap', 'turntablism': 'Rap',
  'west coast': 'Rap', 'hip-hop/rap': 'Rap', 'rap/hip hop': 'Rap',

  // Folk / Country / Volksmusik family
  'alternative/indie/folk': 'Folk', 'anti-folk': 'Folk',
  'arbeiterlieder': 'Folk', 'cabaret': 'Folk', // → ASK: Chanson-Familie
  'kabaret': 'Folk', // → ASK
  'cantautor': 'Folk', 'celtic': 'Folk', 'contemporary folk': 'Folk',
  'electro folk': 'Folk', 'electronic folk': 'Folk', 'ethno pop': 'Folk',
  'fado': 'Folk', 'folklore': 'Folk', 'gipsy': 'Folk', 'gypsy': 'Folk',
  'irish-folk': 'Folk', 'medieval folk': 'Folk', 'mittelalter-folk': 'Folk',
  'modern folk': 'Folk', 'national folk': 'Folk', 'pagan folk': 'Folk',
  'psych folk': 'Folk', 'québécois': 'Folk', 'quebecois': 'Folk',
  'québecois': 'Folk', // Misch-Schreibweise: é nur in "Qué"
  'rai': 'Folk', 'shanty': 'Folk', 'traditional': 'Folk', // → ASK
  'world pop': 'Folk', 'general world': 'Folk', 'african music': 'Folk',
  'musique africaine': 'Folk', 'musique du monde': 'Folk',
  'musiques du monde': 'Folk', 'hardmusette': 'Folk', // → ASK
  'alt country': 'Country', 'country & folk': 'Country',
  'country rock': 'Country',
  'polka': 'Volksmusik', 'brass': 'Volksmusik', // → ASK: Blasmusik
  'narodno zabavna': 'Volksmusik', // → ASK: Balkan-Volksmusik-Pop

  // Latin family
  'axe': 'Latin', 'axé': 'Latin', 'bizarre latin pop': 'Latin',
  'bolero': 'Latin', 'calypso': 'Latin', 'cancion del verano': 'Latin',
  'corridos tumbados': 'Latin', 'criolla': 'Latin', 'flamenco': 'Latin',
  'forro': 'Latin', 'forró': 'Latin', 'funk carioca': 'Latin',
  'latin folk & traditional': 'Latin', 'latin music': 'Latin',
  'latina': 'Latin', 'latino': 'Latin', 'mambo': 'Latin',
  'melodico': 'Latin', 'melódico': 'Latin', 'mpb': 'Latin',
  'musica latina': 'Latin', 'música latina': 'Latin', 'norteno': 'Latin',
  'rock latino': 'Latin', 'samba': 'Latin',
  'norteño': 'Latin', 'nuevo flamenco': 'Latin', 'payada': 'Latin',
  'pop aflamencado': 'Latin', 'pop latino': 'Latin',
  'regueton lento': 'Latin', 'reggaetón': 'Latin', 'romanticas': 'Latin',
  'salsa romantica': 'Latin', 'sertanejo': 'Latin', 'tropical': 'Latin',
  'tropical pop': 'Latin', 'urbano': 'Latin', 'urban latin': 'Latin',
  'urban latino': 'Latin', 'vallenato': 'Latin', 'zouk': 'Latin',
  'panamanian reggaeton': 'Latin',

  // Reggae family
  '2 tone': 'Reggae', 'brass-ska': 'Reggae', 'dance hall': 'Reggae',
  'melodica': 'Reggae', // → ASK: Dub-Melodica (Augustus Pablo)
  'ragga': 'Reggae', 'reggee': 'Reggae', // Typo: reggae
  'reggae rock': 'Reggae', 'raggae': 'Reggae', // Typo

  // Classical family
  'himno patrio': 'Classical', // → ASK: Nationalhymnen
  'hymne': 'Classical', // → ASK
  'madrigal': 'Classical', 'national anthem': 'Classical', // → ASK
  'opera-pop': 'Classical', 'orchestral': 'Classical', 'symphonic': 'Classical',
  'lyrique': 'Classical', 'rag': 'Classical', // → ASK: Ragtime
  'classical crossover': 'Classical', 'classique': 'Classical',
  'opéra': 'Classical',

  // Schlager family
  'bayern-pop': 'Schlager', 'fussballhits': 'Schlager',
  'fußballhits': 'Schlager', // → ASK: Fußball-Party-Songs
  'karneval': 'Schlager', 'lagersong': 'Schlager',
  'epa dunk': 'Schlager', // → ASK: schwedische Party-Musik
  'pimba': 'Schlager', // → ASK: portugiesisches Schlager-Äquivalent
  'rock schlager': 'Schlager', 'schlager pop': 'Schlager',

  // Musical family
  'comedie musicale': 'Musical', 'comédie musicale': 'Musical',
  'dubstep-musical': 'Musical', 'musical comedy': 'Musical',
  'rock opera': 'Musical', 'show tune': 'Musical',

  // Soundtrack family (TV-/Games-/Cartoon-Entscheidung aus R2-D: im
  // weitesten Sinne Soundtracks)
  'anime': 'Soundtrack', // → ASK: alternativ J-Pop
  'manga': 'Soundtrack', // → ASK
  'ghibli': 'Soundtrack', // → ASK
  'bso': 'Soundtrack', 'bollywood': 'Soundtrack', 'cartoon': 'Soundtrack',
  'dessin animes': 'Soundtrack', 'dibujos animados': 'Soundtrack',
  'dibujos animados latino': 'Soundtrack', 'film score': 'Soundtrack',
  'game': 'Soundtrack', 'game anthems': 'Soundtrack', 'gaming': 'Soundtrack',
  'general film music': 'Soundtrack', 'generique': 'Soundtrack',
  'générique': 'Soundtrack', 'jeux video': 'Soundtrack',
  'juegos': 'Soundtrack', 'peliculas': 'Soundtrack', 'películas': 'Soundtrack',
  'scores de peliculas': 'Soundtrack', 'scores de películas': 'Soundtrack',
  'soundrack': 'Soundtrack', // Typo: soundtrack
  'themes': 'Soundtrack', 'themes and soundtracks': 'Soundtrack',
  'tv commercial': 'Soundtrack', 'tv songs': 'Soundtrack',
  'video game': 'Soundtrack', 'bande originale': 'Soundtrack',
  'films/games': 'Soundtrack', 'original soundtrack': 'Soundtrack',

  // Children's family
  'dino rock': "Children's", 'dla dzieci': "Children's",
  'educational': "Children's", 'infantil': "Children's",
  'jeunesse': "Children's", 'kinder': "Children's",
  'mathe-song': "Children's", 'nursery rhyme': "Children's",
  'children music': "Children's", "children's music": "Children's",
  'musik für kinder': "Children's", 'kids/family': "Children's",
  'enfants': "Children's",

  // J-Pop / K-Pop family (japanische Kultur-Tags)
  'utaite': 'J-Pop', 'vocaloid': 'J-Pop', 'vtuber': 'J-Pop',
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
const SEASONAL_GENRE_PATTERN = /(christmas|x-?mas|weihnacht|no[eë]l|navidad|natale|carol|villancico|kol[eę]dy)/i;

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
  'a cappella', 'acapella', 'a capella', 'ai', 'a.i.', 'oldies',
  'female vocals', 'male vocals', 'comedy', 'holiday', 'indie',
  'unknown', 'other', 'misc', 'various', 'sonstiges', 'unbekannt',
  'n/a', 'none',
  // R47: complete Ultrastar-DB inventory — pseudo-genres that carry no
  // usable style information (era, mood, occasion, medium, vocal setup,
  // language descriptor, joke tags…). They surface in the MANUAL
  // correction list of the Metadata Studio instead of being auto-mapped.
  '80s', 'acoustic', 'avantgarde', 'chorus', 'crossover', 'drag',
  'dreamsmp', 'entertainment', 'epic', 'eurovision', 'experimental',
  'female vocal', 'female vocalists', 'festival', 'football', 'generic',
  'german', 'halloween', 'humor', 'humour', 'humoristes', 'kitsch',
  'love', 'love songs', 'mainstream', 'mashup', 'meme', 'nonsense',
  'nederlandstalig', 'original artist', 'party', 'parodia', 'parodie',
  'parody', 'pony', 'religious', 'retro', 'romantic', 'satire',
  'schmalz', 'slow', 'suara', 'viral', 'vocal', 'male vocal',
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
 *
 * `extraCanonicalGenres` (R20 "Genres & Languages" settings): user-defined
 * main categories are checked BEFORE the alias map — if the user explicitly
 * added e.g. "Jazz" as a category, "Jazz" stays "Jazz" instead of being
 * alias-mapped to "R&B". Client-side callers get the customs automatically
 * from the custom-taxonomy store; API routes forward their request list.
 */
export function canonicalizeGenre(raw: string, extraCanonicalGenres?: string[]): string {
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

  // Custom user-defined main categories (R20) WIN over the alias map — the
  // user created them deliberately, so they are canonical in their library.
  const extras = extraCanonicalGenres ?? customTaxonomy.getCustomGenres();
  const extraMatch = extras.find(g => g.toLowerCase() === key);
  if (extraMatch) return extraMatch;

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
