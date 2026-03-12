import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// TypeScript types for lyrics suggestions
interface LyricSuggestion {
  lineIndex: number;
  original: string;
  suggested: string;
  reason: string;
  confidence: number; // 0-100
}

interface LyricsSuggestionsRequest {
  lyrics: string[];
  title?: string;
  artist?: string;
}

interface LyricsSuggestionsResponse {
  success: boolean;
  suggestions?: LyricSuggestion[];
  detectedLanguage?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<LyricsSuggestionsResponse>> {
  try {
    const body: LyricsSuggestionsRequest = await request.json();
    
    if (!body.lyrics || !Array.isArray(body.lyrics) || body.lyrics.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lyrics array is required' },
        { status: 400 }
      );
    }

    let zai;
    try {
      zai = await ZAI.create();
    } catch (initError) {
      console.error('[LyricsSuggestions] Failed to initialize ZAI SDK:', initError);
      return NextResponse.json(
        { success: false, error: 'AI service unavailable' },
        { status: 503 }
      );
    }

    try {
      // Analyze lyrics for issues and suggestions
      const analysisCompletion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a lyrics expert and proofreader. Analyze the provided lyrics for:
1. Typos and spelling errors
2. Missing words or gaps
3. Wrong words or misheard lyrics

Return ONLY a JSON object with:
{
  "language": "iso-code",
  "suggestions": [
    {
      "lineIndex": 0,
      "original": "the original line",
      "suggested": "the corrected line",
      "reason": "Brief explanation",
      "confidence": 85
    }
  ]
}

Rules:
- lineIndex is the 0-based index in the lyrics array
- Only suggest meaningful corrections, not stylistic changes
- confidence should reflect how certain you are (0-100)
- If no issues found, return empty suggestions array []
- For language, use ISO 639-1 codes (en, de, es, fr, it, pt, ja, ko, zh, etc.)`,
          },
          {
            role: 'user',
            content: `Analyze these lyrics for errors and issues:
${body.lyrics.map((line, i) => `[${i}] ${line}`).join('\n')}

Return ONLY the JSON object.`,
          },
        ],
        temperature: 0.2,
      });

      const analysisResponse = analysisCompletion.choices?.[0]?.message?.content;
      
      if (!analysisResponse) {
        return NextResponse.json(
          { success: false, error: 'Failed to analyze lyrics' },
          { status: 500 }
        );
      }

      // Parse the JSON response
      let suggestions: LyricSuggestion[] = [];
      let detectedLanguage = 'en';
      
      try {
        const jsonMatch = analysisResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          suggestions = parsed.suggestions || [];
          detectedLanguage = parsed.language || 'en';
        }
      } catch {
        console.error('[LyricsSuggestions] Failed to parse response:', analysisResponse);
      }

      // Validate suggestions
      const validSuggestions = suggestions.filter(s => 
        typeof s.lineIndex === 'number' &&
        s.lineIndex >= 0 &&
        s.lineIndex < body.lyrics.length &&
        typeof s.original === 'string' &&
        typeof s.suggested === 'string' &&
        typeof s.reason === 'string' &&
        typeof s.confidence === 'number'
      );

      return NextResponse.json({
        success: true,
        suggestions: validSuggestions,
        detectedLanguage,
      });
    } catch (llmError) {
      console.error('[LyricsSuggestions] LLM error:', llmError);
      return NextResponse.json(
        { success: false, error: 'AI processing failed' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('[LyricsSuggestions] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
