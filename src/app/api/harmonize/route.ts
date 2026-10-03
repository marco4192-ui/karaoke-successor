import { NextRequest, NextResponse } from 'next/server';
import { aiChatCompletion } from '@/lib/ai/ai-provider';
import { isLocalRequest } from '@/app/api/lib/is-local-request';
import { GENRES, LANGUAGES } from '@/lib/constants';
import { canonicalizeGenre, normalizeLanguageMixed } from '@/lib/parsers/meta-normalizer';
import { sanitizeCustomEntries } from '@/lib/game/custom-taxonomy';

// ── Types ──

interface HarmonizeEntry {
  songId: string;
  title: string;
  artist: string;
  currentGenre: string | null;
  currentLanguage: string | null;
  suggestedGenre: string | null;
  suggestedLanguage: string | null;
  genreConfidence: number;
  languageConfidence: number;
  genreReason: string;
  languageReason: string;
  /** False when the LLM did NOT return an entry for this song — the client
   *  must then treat the song as NOT analyzed (no cache write, retry later)
   *  instead of a fake "no change" verdict. */
  analyzed: boolean;
}

interface HarmonizeRequest {
  songs: Array<{
    id: string;
    title: string;
    artist: string;
    genre: string | null;
    language: string | null;
    /** Factual hint from MusicBrainz/Deezer (R6) — reliable, not a guess. */
    hintGenre?: string | null;
    hintSource?: string | null;
    hintYear?: number | null;
  }>;
  /** User-defined main genres (R20 "Genres & Languages" settings) — added
   *  to the canonical prompt vocabulary and honored by the deterministic
   *  post-normalization. Sanitized, max 50 entries. */
  customGenres?: string[];
  /** User-defined languages (R20) — same treatment as customGenres. */
  customLanguages?: string[];
}

// ── Genre normalization map (common sub-genres → parent genres) ──

/**
 * Canonical vocabulary (user item 12): the LLM must pick genres from the
 * curated GENRES list; language values are canonical English names, mixed
 * languages joined with '/' — never parenthetical additions. Suggestions
 * are additionally post-processed deterministically below (belt+suspenders).
 *
 * R20: the user's custom genres/languages (Settings → Genres & Languages)
 * EXTEND the vocabulary — the LLM may suggest them, and the deterministic
 * post-normalization keeps them (instead of alias-mapping e.g. "Jazz" to
 * "R&B").
 */
function buildCanonicalRules(customGenres: string[], customLanguages: string[]): string {
  const genreList = [...GENRES, ...customGenres];
  const languageSample = [...LANGUAGES.slice(0, 8), ...customLanguages];
  const customGenreNote = customGenres.length > 0
    ? `\nCUSTOM GENRES (user-defined, equally valid — prefer them over the closest parent when they match exactly): ${customGenres.join(', ')}`
    : '';
  const customLanguageNote = customLanguages.length > 0
    ? `\nCUSTOM LANGUAGES (user-defined, valid full names): ${customLanguages.join(', ')}`
    : '';
  return `
CANONICAL GENRE LIST — suggested genres MUST be one of these ${genreList.length} values:
${genreList.join(', ')}
Any sub-genre ("Dance Pop", "Neo Soul", "Dubstep"...) maps to its parent in the list above.
If nothing fits, use the closest parent — never invent new genres.${customGenreNote}

LANGUAGE RULES:
- Values are full ENGLISH language names: ${languageSample.join(', ')}, ... (standard names only)
- NEVER ISO codes or native forms (Deutsch, Español, 日本語).
- NEVER parenthetical additions: "English (US)", "German (modern)" → just "English" / "German".
- Mixed-language songs: join BOTH languages with '/' in dominance order,
  e.g. "German/English". Max 3 languages.${customLanguageNote}`;
}

/**
 * Normalization hints (sub-genre → parent). R20: built dynamically because
 * user-defined genres can CONFLICT with the built-in rules — e.g. a custom
 * "Jazz" main category must catch "Vocal Jazz"/"Swing"/"Bebop" instead of the
 * built-in R&B fallback, and any sub-genre of a custom category maps to it.
 */
function buildNormalizationHints(customGenres: string[]): string {
  const customSet = new Set(customGenres.map(g => g.toLowerCase()));
  const jazzIsCustom = customSet.has('jazz');
  const jazzLine = jazzIsCustom
    ? '- "Vocal Jazz", "Smooth Jazz", "Bebop", "Swing", "Big Band", "jazz" (any casing) → "Jazz" (user-defined main category — jazz maps THERE, not to R&B)'
    : '- "Vocal Jazz", "Smooth Jazz", "Bebop", "Swing", "Big Band" → "R&B" (jazz is subsumed by R&B — no separate Jazz main category)';
  const customParentLine = customGenres.length > 0
    ? `- USER-DEFINED CATEGORIES: ${customGenres.join(', ')} are canonical main categories. A sub-genre of a user-defined category maps to IT (e.g. "Smooth ${customGenres[0]}" → "${customGenres[0]}"). An exact match with a user-defined category ALWAYS keeps that category — never remap it to a built-in parent.\n`
    : '';
  return `
Common normalizations (sub-genres → parent genre):
- "Bubblegum Pop", "Dance Pop", "Synthpop", "Electropop", "Indie Pop", "Art Pop", "Bedroom Pop" → "Pop"
- "Alternative Rock", "Classic Rock", "Progressive Rock", "Punk Rock", "Hard Rock", "Grunge" → "Rock"
- "Contemporary R&B", "Neo Soul", "New Jack Swing" → "R&B"
- "Trance", "Drum and Bass", "Dubstep", "Deep House", "Techno", "House", "Ambient" → "Electronic"
- "Schlager", "Austropop", "Deutschpop", "Neue Deutsche Welle" → "Schlager" (keep as Schlager, NOT Pop — a distinct genre that also exists OUTSIDE German: Dutch levenslied, Belgian, Danish, Italian, Finnish iskelmä)
- "K-Pop", "J-Pop" → keep as-is (canonical); "J-Rock" → "Rock"
${jazzLine}
- "Hip-Hop", "Rap", "Trap", "Drill", "Gangsta Rap" → "Rap" (the main category; no separate Hip-Hop)
- "Country Pop", "Outlaw Country", "Bro-Country" → "Country"
- "Indie Folk", "Folk Rock", "Americana", "Bluegrass" → "Folk"
- "Post-Punk", "Emo", "Screamo", "Gothic Rock" → "Punk" or "Rock"
- "Reggaeton", "Latin Pop", "Bachata", "Salsa", "Cumbia" → "Latin"
- "Afrobeats", "Afro Pop" → "Pop"; "Amapiano" → "Electronic"
- "Singer-Songwriter", "Chanson", "Liedermacher" → "Folk"
- "Disco" → "Electronic"; "Gospel" → "Soul"; "Ballad", "Adult Contemporary", "Traditional Pop" → "Pop"
- "World", "World Music" → "Folk"; "New Age", "Gregorian" → "Classical"; "Easy Listening" → "R&B"
- "Rock'n'Roll" (any spelling), "Blues Rock", "Alternative" → "Rock"
- "Heavy Metal", "Death Metal", "Black Metal", "Thrash Metal" → "Metal"
- "Children's", "Kindermusik", "Kinderlied" → "Children's"
- "Disney", "Walt Disney", "Disney Songs", "Disney Classics", "Disney Soundtrack" → "Disney" (keep as Disney, NOT Soundtrack — dedicated karaoke category)
- Disney movie songs (e.g. from Frozen, Lion King, Aladdin, Moana) → "Disney"
${customParentLine}
Language detection hints:
- Artist names ending in common patterns: "-ovic", "-ova" → Slavic language; "-sson", "-sen" → Scandinavian
- Genre→language (by definition): "Volksmusik" → German; "Chanson" → French; "Canzone" → Italian
- IMPORTANT: "Schlager" does NOT imply German — schlager exists in many languages (Dutch levenslied, Belgian, Danish, Italian, Finnish iskelmä). Derive the language from the ARTIST and their lyrics, never from the genre alone (Helene Fischer → German, André Hazes → Dutch, Katri Helena → Finnish)
- If lyrics are in the input and contain common words from a language, use that (e.g. "ich", "du", "der" → German)
- "Volksmusik" is traditional German/Austrian/Swiss folk → German (language)
- K-Pop songs → "Korean", J-Pop songs → "Japanese" (English language names)
`;
}

export async function POST(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body: HarmonizeRequest = await request.json();
    const { songs } = body;

    if (!songs || !Array.isArray(songs) || songs.length === 0) {
      return NextResponse.json({ success: false, error: 'No songs provided' }, { status: 400 });
    }

    // R20: user-defined vocabulary — sanitize BEFORE it reaches the prompt
    // (never trust the request body blindly, even from localhost).
    const customGenres = sanitizeCustomEntries(body.customGenres);
    const customLanguages = sanitizeCustomEntries(body.customLanguages);

    // Limit batch size to prevent token overflow. 15 instead of the old 50:
    // with 50 songs per call the LLM regularly returned an incomplete JSON
    // array (often only ~5 entries) — the missing songs were then wrongly
    // treated as "no change". Smaller chunks keep the response complete and
    // the client retries missing entries once (see harmonize-client).
    const batch = songs.slice(0, 15);

    // Build a compact song list for the LLM prompt. Songs resolved by the
    // factual lookup (R6) carry their facts as hints so the AI doesn't have
    // to guess — it just normalizes and handles the language.
    const songList = batch.map((s, i) => {
      const facts: string[] = [];
      if (s.hintGenre) facts.push(`genre=${s.hintGenre} (${s.hintSource ?? 'factual'})`);
      if (s.hintYear) facts.push(`year=${s.hintYear} (${s.hintSource ?? 'factual'})`);
      const factPart = facts.length > 0 ? ` [Facts: ${facts.join(', ')}]` : '';
      return `${i + 1}. "${s.artist}" - "${s.title}" [Genre: ${s.genre || '(none)'}, Language: ${s.language || '(none)'}]${factPart}`;
    }).join('\n');

    let content: string;
    try {
      content = await aiChatCompletion(
        [
          {
            role: 'system',
            content: `You are a music metadata harmonization assistant. Your job is to analyze a list of songs with their current genre and language tags, then suggest normalized/standardized values.

RULES:
1. Only suggest changes where the current value is missing, misspelled, overly specific, or inconsistent.
2. Normalize sub-genres to well-known parent genres where appropriate.
3. Map language codes (de, en, es, fr, ja, ko, etc.) and native forms (Deutsch, Español, 日本語) to full ENGLISH language names ("German", "Spanish", "Japanese") — never ISO codes or native forms.
4. Set confidence 90-100 for clear matches, 70-89 for reasonable guesses, 50-69 for uncertain.
5. Provide a brief reason for each suggestion.
6. If the current value is already good, set the suggestion to null with confidence 100.
7. If a [Facts: ...] hint is present, it comes from MusicBrainz/Deezer and is RELIABLE. Trust it: suggest the fact's genre (normalized to the standard spelling) instead of guessing. Never contradict a factual year.

${buildCanonicalRules(customGenres, customLanguages)}

${buildNormalizationHints(customGenres)}

Respond ONLY with a valid JSON array. Each element must have:
- "index" (1-based, matching the input list)
- "suggestedGenre" (string or null)
- "suggestedLanguage" (string or null)
- "genreConfidence" (0-100)
- "languageConfidence" (0-100)
- "genreReason" (brief explanation)
- "languageReason" (brief explanation)

Example output:
[{"index":1,"suggestedGenre":"Pop","suggestedLanguage":"English","genreConfidence":85,"languageConfidence":95,"genreReason":"Artist is known pop act","languageReason":"English lyrics confirmed"}]

Do NOT include any text outside the JSON array.`,
          },
          {
            role: 'user',
            content: `Please analyze and harmonize these ${batch.length} songs:\n\n${songList}`,
          },
        ],
        { temperature: 0.1 },
      );
    } catch {
      // Provider unavailable (missing .z-ai-config on e.g. the packaged
      // desktop app, or an unreachable custom endpoint) — 503 "service
      // unavailable", NOT a server error. Same contract as the other AI routes.
      return NextResponse.json({ success: false, error: 'AI-Dienst nicht verfügbar' }, { status: 503 });
    }
    if (!content) {
      return NextResponse.json({ success: false, error: 'Empty response from AI' });
    }

    // Parse the JSON array from the response (handle markdown code blocks)
    let jsonStr = content.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
    // Also try if the entire response is just the array
    if (!jsonStr.startsWith('[')) {
      const bracketMatch = jsonStr.match(/(\[[\s\S]*\])/);
      if (bracketMatch) jsonStr = bracketMatch[1];
    }

    const parsed = JSON.parse(jsonStr) as Array<{
      index: number;
      suggestedGenre: string | null;
      suggestedLanguage: string | null;
      genreConfidence: number;
      languageConfidence: number;
      genreReason: string;
      languageReason: string;
    }>;

    // Merge AI suggestions with song data — canonicalized deterministically
    // (user item 12): even if the LLM outputs "Pop (80s)" or "Englisch (mit
    // deutschem Refrain)", the applied value is "Pop" / "English/German".
    // Nulls ("already good") stay null — the current value is kept.
    const suggestions: HarmonizeEntry[] = batch.map((song, i) => {
      const match = parsed.find(p => p.index === i + 1);
      const rawGenre = match?.suggestedGenre ?? null;
      const rawLanguage = match?.suggestedLanguage ?? null;
      return {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        currentGenre: song.genre,
        currentLanguage: song.language,
        // analyzed=false marks songs the LLM silently dropped — the client
        // keeps them "unanalyzed" instead of caching a fake no-change.
        analyzed: !!match,
        // Custom vocabulary (R20) is passed through so e.g. a user-defined
        // "Jazz" survives the deterministic post-normalization instead of
        // being alias-mapped to "R&B".
        suggestedGenre: match ? (rawGenre ? canonicalizeGenre(rawGenre, customGenres) : null) : null,
        suggestedLanguage: match ? (rawLanguage ? normalizeLanguageMixed(rawLanguage, customLanguages) : null) : null,
        genreConfidence: match?.genreConfidence ?? 0,
        languageConfidence: match?.languageConfidence ?? 0,
        genreReason: match?.genreReason ?? '',
        languageReason: match?.languageReason ?? '',
      };
    });

    return NextResponse.json({ success: true, suggestions });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Harmonize] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
