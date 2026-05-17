import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { isLocalRequest } from '@/app/api/lib/is-local-request';

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
  }>;
}

interface HarmonizeResponse {
  success: boolean;
  suggestions?: HarmonizeEntry[];
  error?: string;
}

// ── Genre normalization map (common sub-genres → parent genres) ──

const NORMALIZATION_HINTS = `
Common normalizations:
- "Bubblegum Pop", "Dance Pop", "Synthpop", "Electropop", "Indie Pop" → "Pop"
- "Alternative Rock", "Classic Rock", "Progressive Rock", "Punk Rock", "Hard Rock" → "Rock"
- "Contemporary R&B", "Neo Soul", "New Jack Swing" → "R&B"
- "Trance", "Drum and Bass", "Dubstep", "Deep House" → "Electronic"
- " Schlager", "Austropop", "Deutschpop", "Neue Deutsche Welle" → "Schlager" or "Pop"
- "K-Pop", "J-Pop", "J-Rock" → keep as-is (well-known genres)
- "Vocal Jazz", "Smooth Jazz", "Bebop" → "Jazz"
- "Country Pop", "Outlaw Country", "Bro-Country" → "Country"
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

    // Build a compact song list for the LLM prompt
    const songList = batch.map((s, i) =>
      `${i + 1}. "${s.artist}" - "${s.title}" [Genre: ${s.genre || '(none)'}, Language: ${s.language || '(none)'}]`
    ).join('\n');

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a music metadata harmonization assistant. Your job is to analyze a list of songs with their current genre and language tags, then suggest normalized/standardized values.

RULES:
1. Only suggest changes where the current value is missing, misspelled, overly specific, or inconsistent.
2. Normalize sub-genres to well-known parent genres where appropriate.
3. Map language codes (de, en, es, fr, ja, ko, etc.) to full language names.
4. Set confidence 90-100 for clear matches, 70-89 for reasonable guesses, 50-69 for uncertain.
5. Provide a brief reason for each suggestion.
6. If the current value is already good, set the suggestion to null with confidence 100.

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

    // Merge AI suggestions with song data
    const suggestions: HarmonizeEntry[] = batch.map((song, i) => {
      const match = parsed.find(p => p.index === i + 1);
      return {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        currentGenre: song.genre,
        currentLanguage: song.language,
        suggestedGenre: match?.suggestedGenre ?? null,
        suggestedLanguage: match?.suggestedLanguage ?? null,
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
    });
  }
}
