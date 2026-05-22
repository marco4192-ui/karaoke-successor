import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk'; // NOTE: Uses ZAI SDK defaults (model, endpoint, etc.)
import { isLocalRequest } from '@/app/api/lib/is-local-request';
import { withRetry, isRateLimitError } from '@/app/api/lib/retry';

// TypeScript types for song identification
interface SongIdentifyRequest {
  input: string;
  type: 'filename' | 'lyrics';
}

interface SongMetadata {
  title: string;
  artist: string;
  year: number | null;
  genre: string | null;
  bpm: number | null;
  language: string | null;
  confidence: number; // 0-100
}

interface SongIdentifyResponse {
  success: boolean;
  metadata?: SongMetadata;
  error?: string;
}

// Map ISO 639-1 codes to full language names
const LANGUAGE_FULL_NAMES: Record<string, string> = {
  en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français',
  it: 'Italiano', pt: 'Português', ja: '日本語', ko: '한국어',
  zh: '中文', ru: 'Русский', nl: 'Nederlands', pl: 'Polski',
  sv: 'Svenska', no: 'Norsk', da: 'Dansk', fi: 'Suomi',
  ar: 'العربية', hi: 'हिन्दी', th: 'ไทย', vi: 'Tiếng Việt',
  tr: 'Türkçe', cs: 'Čeština', el: 'Ελληνικά', he: 'עברית',
  ro: 'Română', hu: 'Magyar', uk: 'Українська', bg: 'Български',
  id: 'Bahasa Indonesia', ms: 'Bahasa Melayu', tl: 'Filipino',
};

export async function POST(request: NextRequest): Promise<NextResponse<SongIdentifyResponse>> {
  if (!isLocalRequest(request)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body: SongIdentifyRequest = await request.json();
    
    if (!body.input || typeof body.input !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Input is required' },
        { status: 400 }
      );
    }

    if (!body.type || !['filename', 'lyrics'].includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Type must be "filename" or "lyrics"' },
        { status: 400 }
      );
    }

    let zai;
    try {
      zai = await ZAI.create();
    } catch (initError) {
      // eslint-disable-next-line no-console
      console.error('[SongIdentify] Failed to initialize ZAI SDK:', initError);
      return NextResponse.json(
        { success: false, error: 'AI service unavailable' },
        { status: 503 }
      );
    }
    
    // Clean up filename/lyrics for extraction
    const sanitizeLLMInput = (s: string, maxLen = 500) =>
      s.replace(/[\]{}()[\\]]/g, '').substring(0, maxLen);
    const cleanInput = body.type === 'filename' 
      ? sanitizeLLMInput(body.input.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim())
      : sanitizeLLMInput(body.input, 200);

    // Use LLM to extract metadata directly (faster than web search)
    try {
      const completion = await withRetry<string>(async (): Promise<string> => {
        const c = await zai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a music metadata expert. Extract song metadata from the provided filename or lyrics.

Return ONLY a valid JSON object with the following structure:
{
  "title": "Song title",
  "artist": "Artist name",
  "year": 2024 or null if unknown,
  "genre": "Genre" or null if unknown,
  "bpm": 120 or null if unknown,
  "language": "English" or null if unknown,
  "confidence": 85
}

Rules:
- confidence should be 0-100 based on how certain you are
- For language, use the FULL language name in its native form (e.g. "English", "Deutsch", "Español", "Français", "日本語", "한국어", "中文", "Русский", "Italiano", "Português", etc.) — NOT ISO codes
- If you cannot determine a field, set it to null
- For genre, use ONE of these well-known genres: Pop, Rock, Hip-Hop, R&B, Country, Electronic, Jazz, Classical, Latin, K-Pop, J-Pop, Schlager, Volksmusik, Singer-Songwriter, Reggae, Soul, Funk, Metal, Punk, Indie, Folk, Blues, Dance, Reggaeton, Afrobeats, Alternative, Children's
- Sub-genres should be normalized to their parent genre. Examples: "Synthpop" → "Pop", "Alternative Rock" → "Rock", "Deep House" → "Electronic", "Contemporary R&B" → "R&B", "Indie Folk" → "Folk", "Neo Soul" → "Soul"
- For language detection from lyrics: look at the actual words used. Common indicators:
  - German: "ich", "du", "der", "die", "das", "und", "nicht", "ein", "ist", "mir"
  - English: "the", "is", "and", "you", "I", "to", "a", "in", "it", "of"
  - Spanish: "el", "la", "que", "de", "en", "y", "a", "los", "las", "un"
  - French: "le", "la", "de", "et", "en", "un", "une", "les", "des", "que"
  - Japanese: "の", "に", "は", "て", "だ", "する", "な", "か", "た", "い" (hiragana presence)
  - Korean: "의", "에", "은", "는", "이", "가", "을", "를", "하고", "합니다"
- BPM should be a number, not a string
- Be conservative with confidence - only use 90+ if you're very certain
- If the input is just a filename with no lyrics, genre and language may be guessable from the artist name and song title — use world knowledge about known artists
- "Schlager" is a distinct German-language genre — do NOT merge it with Pop. Apply it for typical German hits (Helene Fischer, Andrea Berg, Roland Kaiser, etc.)
- "Volksmusik" is traditional German/Austrian/Swiss folk music — distinct from "Folk" (which is English-language singer-songwriter style)`,
            },
            {
              role: 'user',
              content: `${body.type === 'filename' ? 'Filename' : 'Lyrics snippet'}: "${cleanInput}"

Extract the song metadata and return ONLY the JSON object.`,
            },
          ],
          temperature: 0.3,
        });

        const content: string = c.choices?.[0]?.message?.content || '';
        if (!content) throw new Error('Empty LLM response');
        return content;
      });

      const responseContent = completion;
      
      if (!responseContent) {
        return NextResponse.json(
          { success: false, error: 'Failed to generate metadata' },
          { status: 500 }
        );
      }

      // Parse the JSON response
      let metadata: SongMetadata;
      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        metadata = JSON.parse(jsonMatch[0]) as SongMetadata;
      } catch {
        // eslint-disable-next-line no-console
        console.error('[SongIdentify] Failed to parse LLM response:', responseContent);
        return NextResponse.json(
          { success: false, error: 'Failed to parse metadata response' },
          { status: 500 }
        );
      }

      // Normalize language: if LLM still returned an ISO code, map to full name
      if (metadata.language && LANGUAGE_FULL_NAMES[metadata.language.toLowerCase()]) {
        metadata.language = LANGUAGE_FULL_NAMES[metadata.language.toLowerCase()];
      }

      // Validate the response
      if (!metadata.title || !metadata.artist) {
        // Return partial data with low confidence
        return NextResponse.json({
          success: true,
          metadata: {
            title: metadata.title || cleanInput,
            artist: metadata.artist || 'Unknown Artist',
            year: metadata.year,
            genre: metadata.genre,
            bpm: metadata.bpm,
            language: metadata.language,
            confidence: 30,
          },
        });
      }

      return NextResponse.json({
        success: true,
        metadata: {
          title: metadata.title,
          artist: metadata.artist,
          year: metadata.year,
          genre: metadata.genre,
          bpm: metadata.bpm,
          language: metadata.language,
          confidence: metadata.confidence,
        },
      });
    } catch (llmError) {
      // eslint-disable-next-line no-console
      console.error('[SongIdentify] LLM error:', llmError);
      const err = llmError instanceof Error ? llmError : new Error(String(llmError));

      // Surface a specific error for rate-limit so the UI can show a helpful message
      if (isRateLimitError(err)) {
        return NextResponse.json(
          { success: false, error: 'rate_limited' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'AI processing failed' },
        { status: 503 }
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[SongIdentify] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
