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
      let error = 'Failed to analyze lyrics';
      try {
        const errorData = await response.json();
        error = errorData.error || error;
      } catch {
        // Error body is not valid JSON
      }
      return { success: false, error };
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
