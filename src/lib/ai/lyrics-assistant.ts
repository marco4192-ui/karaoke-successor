// AI Service: Lyrics Assistant
// Provides suggestions for lyrics improvement

export interface LyricSuggestion {
  lineIndex: number;
  original: string;
  suggested: string;
  reason: string;
  confidence: number; // 0-100
  type: 'correction' | 'timing' | 'gap' | 'language';
}

export interface LyricsAnalysisResult {
  success: boolean;
  suggestions?: LyricSuggestion[];
  detectedLanguage?: string;
  wordCount?: number;
  lineCount?: number;
  error?: string;
}

/**
 * Analyze lyrics and get improvement suggestions
 */
export async function analyzeLyrics(
  lyrics: Array<{ text: string; startTime: number; endTime: number }>,
  options?: {
    title?: string;
    artist?: string;
    bpm?: number;
    checkTiming?: boolean;
    checkSpelling?: boolean;
    checkGaps?: boolean;
  }
): Promise<LyricsAnalysisResult> {
  try {
    const response = await fetch('/api/lyrics-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lyrics: lyrics.map(l => l.text),
        title: options?.title,
        artist: options?.artist,
        bpm: options?.bpm,
        checkTiming: options?.checkTiming ?? true,
        checkSpelling: options?.checkSpelling ?? true,
        checkGaps: options?.checkGaps ?? true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to analyze lyrics' };
    }

    const result = await response.json();
    
    return {
      success: true,
      suggestions: result.suggestions || [],
      detectedLanguage: result.detectedLanguage,
      wordCount: lyrics.reduce((acc, l) => acc + l.text.split(/\s+/).length, 0),
      lineCount: lyrics.length,
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get a single correction for a specific line
 */
export async function getLineCorrection(
  line: string,
  context?: { prevLine?: string; nextLine?: string; language?: string }
): Promise<{ success: boolean; correction?: string; reason?: string }> {
  try {
    const response = await fetch('/api/lyrics-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lyrics: [context?.prevLine, line, context?.nextLine].filter(Boolean),
        singleLine: true,
        language: context?.language,
      }),
    });

    const result = await response.json();
    
    if (result.suggestions && result.suggestions.length > 0) {
      return {
        success: true,
        correction: result.suggestions[0].suggested,
        reason: result.suggestions[0].reason,
      };
    }

    return { success: true }; // No correction needed
  } catch (error) {
    return { success: false };
  }
}

/**
 * Detect language of lyrics
 */
export async function detectLanguage(text: string): Promise<string | null> {
  try {
    const response = await fetch('/api/lyrics-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lyrics: [text], detectOnly: true }),
    });

    const result = await response.json();
    return result.detectedLanguage || null;
  } catch {
    return null;
  }
}
