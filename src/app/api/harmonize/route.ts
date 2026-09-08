import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { isLocalRequest } from '@/app/api/lib/is-local-request';
import { GENRES, LANGUAGES } from '@/lib/constants';
import { canonicalizeGenre, normalizeLanguageMixed } from '@/lib/parsers/meta-normalizer';

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
}

// ── Genre normalization map (common sub-genres → parent genres) ──

/**
 * Canonical vocabulary (user item 12): the LLM must pick genres from the
 * curated GENRES list; language values are canonical English names, mixed
 * languages joined with '/' — never parenthetical additions. Suggestions
 * are additionally post-processed deterministically below (belt+suspenders).
 */
const CANONICAL_RULES = `
CANONICAL GENRE LIST — suggested genres MUST be one of these ${GENRES.length} values:
${GENRES.join(', ')}
Any sub-genre ("Dance Pop", "Neo Soul", "Dubstep"...) maps to its parent in the list above.
If nothing fits, use the closest parent — never invent new genres.

LANGUAGE RULES:
- Values are full ENGLISH language names: ${LANGUAGES.slice(0, 8).join(', ')}, ... (standard names only)
- NEVER ISO codes or native forms (Deutsch, Español, 日本語).
- NEVER parenthetical additions: "English (US)", "German (modern)" → just "English" / "German".
- Mixed-language songs: join BOTH languages with '/' in dominance order,
  e.g. "German/English". Max 3 languages.`;

const NORMALIZATION_HINTS = `
Common normalizations (sub-genres → parent genre):
- "Bubblegum Pop", "Dance Pop", "Synthpop", "Electropop", "Indie Pop", "Art Pop", "Bedroom Pop" → "Pop"
- "Alternative Rock", "Classic Rock", "Progressive Rock", "Punk Rock", "Hard Rock", "Grunge" → "Rock"
- "Contemporary R&B", "Neo Soul", "New Jack Swing" → "R&B"
- "Trance", "Drum and Bass", "Dubstep", "Deep House", "Techno", "House", "Ambient" → "Electronic"
- "Schlager", "Austropop", "Deutschpop", "Neue Deutsche Welle" → "Schlager" (keep as Schlager, NOT Pop — it's a distinct German genre)
- "K-Pop", "J-Pop", "J-Rock" → keep as-is (well-known genres)
- "Vocal Jazz", "Smooth Jazz", "Bebop" → "Jazz"
- "Country Pop", "Outlaw Country", "Bro-Country" → "Country"
- "Indie Folk", "Folk Rock", "Americana", "Bluegrass" → "Folk"
- "Post-Punk", "Emo", "Screamo", "Gothic Rock" → "Punk" or "Rock"
- "Reggaeton", "Latin Pop", "Bachata", "Salsa", "Cumbia" → "Latin"
- "Afrobeats", "Amapiano", "Afro Pop" → "Afrobeats" (keep as-is)
- "Singer-Songwriter", "Chanson", "Liedermacher" → "Singer-Songwriter"
- "Heavy Metal", "Death Metal", "Black Metal", "Thrash Metal" → "Metal"
- "Children's", "Kindermusik", "Kinderlied" → "Children's"

Language detection hints:
- Artist names ending in common patterns: "-ovic", "-ova" → Slavic language; "-sson", "-sen" → Scandinavian
- Known non-English genres hint at language: "Schlager"/"Volksmusik" → German; "Chanson" → French; "Canzone" → Italian
- If lyrics are in the input and contain common words from a language, use that (e.g. "ich", "du", "der" → German)
- "Volksmusik" is traditional German/Austrian/Swiss folk → German (language)
- K-Pop songs → "Korean", J-Pop songs → "Japanese" (English language names)
`;

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

    // Limit batch size to prevent token overflow
    const batch = songs.slice(0, 50);

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

    let zai;
    try {
      zai = await ZAI.create();
    } catch {
      return NextResponse.json({ success: false, error: 'Failed to initialize AI service' }, { status: 500 });
    }
    const completion = await zai.chat.completions.create({
      messages: [
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

${CANONICAL_RULES}

${NORMALIZATION_HINTS}

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
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
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
        suggestedGenre: rawGenre ? canonicalizeGenre(rawGenre) : null,
        suggestedLanguage: rawLanguage ? normalizeLanguageMixed(rawLanguage) : null,
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
