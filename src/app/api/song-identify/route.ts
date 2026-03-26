import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { logger } from '@/lib/logger';

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

export async function POST(request: NextRequest): Promise<NextResponse<SongIdentifyResponse>> {
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
      logger.error('[SongIdentify]', 'Failed to initialize ZAI SDK:', initError);
      return NextResponse.json(
        { success: false, error: 'AI service unavailable' },
        { status: 503 }
      );
    }
    
    // Clean up filename/lyrics for extraction
    const cleanInput = body.type === 'filename' 
      ? body.input.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim()
      : body.input.substring(0, 200);

    // Use LLM to extract metadata directly (faster than web search)
    try {
      const completion = await zai.chat.completions.create({
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
  "language": "en" or null if unknown,
  "confidence": 85
}

Rules:
- confidence should be 0-100 based on how certain you are
- For language, use ISO 639-1 codes (en, de, es, fr, it, pt, ja, ko, zh, etc.)
- If you cannot determine a field, set it to null
- For genre, use common genres: Pop, Rock, Hip-Hop, R&B, Country, Electronic, Jazz, Classical, Latin, K-Pop, etc.
- BPM should be a number, not a string
- Be conservative with confidence - only use 90+ if you're very certain`,
          },
          {
            role: 'user',
            content: `${body.type === 'filename' ? 'Filename' : 'Lyrics snippet'}: "${cleanInput}"

Extract the song metadata and return ONLY the JSON object.`,
          },
        ],
        temperature: 0.3,
      });

      const responseContent = completion.choices?.[0]?.message?.content;
      
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
        logger.error('[SongIdentify]', 'Failed to parse LLM response:', responseContent);
        return NextResponse.json(
          { success: false, error: 'Failed to parse metadata response' },
          { status: 500 }
        );
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
      logger.error('[SongIdentify]', 'LLM error:', llmError);
      return NextResponse.json(
        { success: false, error: 'AI processing failed' },
        { status: 503 }
      );
    }
  } catch (error) {
    logger.error('[SongIdentify]', 'Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
