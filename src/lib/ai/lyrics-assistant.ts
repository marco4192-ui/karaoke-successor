// AI Service: Lyrics Assistant
// Provides suggestions for lyrics improvement

import { apiClient } from '@/lib/api-client';

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
    const result = await apiClient.getLyricsSuggestions({
      lyrics: lyrics.map(l => l.text),
      title: options?.title,
      artist: options?.artist,
      bpm: options?.bpm,
      checkTiming: options?.checkTiming ?? true,
      checkSpelling: options?.checkSpelling ?? true,
      checkGaps: options?.checkGaps ?? true,
    });
    
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to analyze lyrics' };
    }
    
    return {
      success: true,
      suggestions: (result.suggestions as LyricSuggestion[]) || [],
      detectedLanguage: result.detectedLanguage as string,
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
    const result = await apiClient.getLyricsSuggestions({
      lyrics: [context?.prevLine, line, context?.nextLine].filter(Boolean) as string[],
      singleLine: true,
      language: context?.language,
    });
    
    if (result.suggestions && (result.suggestions as LyricSuggestion[]).length > 0) {
      return {
        success: true,
        correction: (result.suggestions as LyricSuggestion[])[0].suggested,
        reason: (result.suggestions as LyricSuggestion[])[0].reason,
      };
    }

    return { success: true }; // No correction needed
  } catch {
    return { success: false };
  }
}

/**
 * Detect language of lyrics
 */
export async function detectLanguage(text: string): Promise<string | null> {
  try {
    const result = await apiClient.getLyricsSuggestions({
      lyrics: [text],
      detectOnly: true,
    });

    return result.detectedLanguage as string || null;
  } catch {
    return null;
  }
}
